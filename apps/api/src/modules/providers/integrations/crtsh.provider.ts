import {
  BaseProvider,
  ProviderMetadata,
  ProviderRunContext,
  ProviderRunResult,
} from '@osint/plugin-sdk';
import { EntityKind } from '@osint/types';
import axios from 'axios';

interface CrtShCertificate {
  issuer_ca_id: number;
  issuer_name: string;
  common_name: string;
  name_value: string; // newline-separated SANs
  id: number;
  entry_timestamp: string;
  not_before: string;
  not_after: string;
  serial_number: string;
}

const RECENT_SUBDOMAIN_WINDOW_DAYS = 30;

// crt.sh (Certificate Transparency log search, run by Sectigo) — free,
// no API key, no documented rate limit, but a well-known flaky service:
// as a single community-run Postgres instance searching the full CT log
// corpus, it 502s/times out under load fairly often. BaseProvider's
// circuit breaker + retry are doing real work here, not just boilerplate.
export class CrtShProvider extends BaseProvider {
  readonly meta: ProviderMetadata = {
    name: 'crtsh',
    displayName: 'crt.sh (Certificate Transparency)',
    description: 'Discovers subdomains and certificate history via public CT logs',
    supports: [EntityKind.DOMAIN],
    requiresApiKey: false,
    freeTier: 'Unlimited (community service, no key — but can be slow/unavailable)',
    homepage: 'https://crt.sh/',
  };

  protected async query(ctx: ProviderRunContext): Promise<ProviderRunResult<CrtShCertificate[]>> {
    const domain = normalizeDomain(ctx.value);

    const response = await axios.get<CrtShCertificate[] | string>('https://crt.sh/', {
      params: { q: `%.${domain}`, output: 'json' },
      timeout: 20_000,
      // crt.sh returns HTML (not JSON, no content-type signal we can trust)
      // for its own error pages; let axios hand us the raw response either way.
      responseType: 'text',
      transformResponse: (raw) => raw,
    });

    const certs = parseCrtShResponse(response.data as string);
    if (certs.length === 0) {
      return { data: [] };
    }

    const now = Date.now();
    const namesSeen = new Map<string, { firstSeen: number; wildcard: boolean }>();

    for (const cert of certs) {
      for (const rawName of cert.name_value.split('\n')) {
        const name = rawName.trim().toLowerCase();
        if (!name || !name.endsWith(domain)) continue;

        const wildcard = name.startsWith('*.');
        const canonical = wildcard ? name.slice(2) : name;
        if (!canonical) continue;

        const entryTime = Date.parse(cert.entry_timestamp);
        const existing = namesSeen.get(canonical);
        if (!existing || (Number.isFinite(entryTime) && entryTime < existing.firstSeen)) {
          namesSeen.set(canonical, {
            firstSeen: Number.isFinite(entryTime) ? entryTime : now,
            wildcard: existing?.wildcard || wildcard,
          });
        }
      }
    }

    const relatedEntities = [...namesSeen.entries()]
      .filter(([name]) => name !== domain)
      .map(([name]) => ({
        kind: EntityKind.DOMAIN,
        value: name,
        relation: 'certificate_covers',
        confidence: 0.85,
      }));

    const riskSignals = [];

    const latestForDomain = certs
      .filter((c) => c.common_name.toLowerCase() === domain || c.name_value.toLowerCase().includes(domain))
      .sort((a, b) => Date.parse(b.not_after) - Date.parse(a.not_after))[0];
    if (latestForDomain && Date.parse(latestForDomain.not_after) < now) {
      riskSignals.push({
        type: 'certificate_expired',
        severity: 'INFO' as const,
        score: 1,
        description: `Most recent certificate for ${domain} expired on ${latestForDomain.not_after}`,
      });
    }

    const recentSubdomains = [...namesSeen.entries()].filter(
      ([name, info]) => name !== domain && now - info.firstSeen < RECENT_SUBDOMAIN_WINDOW_DAYS * 86_400_000,
    );
    if (recentSubdomains.length > 0) {
      riskSignals.push({
        type: 'recent_subdomain_activity',
        severity: 'INFO' as const,
        score: 1,
        description: `${recentSubdomains.length} subdomain(s) first observed in certificates within the last ${RECENT_SUBDOMAIN_WINDOW_DAYS} days: ${recentSubdomains.slice(0, 5).map(([n]) => n).join(', ')}`,
      });
    }

    return {
      data: certs,
      relatedEntities,
      riskSignals,
    };
  }
}

function normalizeDomain(value: string): string {
  const trimmed = value.trim().toLowerCase();
  try {
    // Handles IDN/punycode (e.g. "münchen.de" -> "xn--mnchen-3ya.de").
    return new URL(`http://${trimmed}`).hostname;
  } catch {
    return trimmed;
  }
}

function parseCrtShResponse(raw: string): CrtShCertificate[] {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('<')) {
    // crt.sh returns an HTML error page (502/503/rate-limit notice) instead
    // of an HTTP error status surprisingly often — treat it as "no data",
    // not a parse bug. The circuit breaker still sees this as a successful
    // call, which is the right call: an empty-but-well-formed page here is
    // indistinguishable from "genuinely no certificates found" without
    // scraping HTML, and we'd rather under- than over-trip the breaker on
    // this instance's characteristic verbosity.
    return [];
  }
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
