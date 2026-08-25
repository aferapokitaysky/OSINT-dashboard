import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseProvider } from '@osint/plugin-sdk';
import { ShodanProvider } from './integrations/shodan.provider';
import { HibpProvider } from './integrations/hibp.provider';
import { VirusTotalProvider } from './integrations/virustotal.provider';
import { AbuseIpDbProvider } from './integrations/abuseipdb.provider';
import { WhoisProvider } from './integrations/whois.provider';
import { DnsProvider } from './integrations/dns.provider';
import { CrtShProvider } from './integrations/crtsh.provider';
import { BlockstreamProvider } from './integrations/blockstream.provider';
import { TronProvider } from './integrations/tron.provider';
import { EtherscanProvider } from './integrations/etherscan.provider';
import { EntityKind } from '@osint/types';

@Injectable()
export class ProviderRegistry implements OnModuleInit {
  private providers: Map<string, BaseProvider> = new Map();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.register(new ShodanProvider({
      apiKey: this.configService.get('SHODAN_API_KEY'),
    }));
    this.register(new HibpProvider({
      apiKey: this.configService.get('HIBP_API_KEY'),
    }));
    this.register(new VirusTotalProvider({
      apiKey: this.configService.get('VIRUSTOTAL_API_KEY'),
    }));
    this.register(new AbuseIpDbProvider({
      apiKey: this.configService.get('ABUSEIPDB_API_KEY'),
    }));
    this.register(new WhoisProvider());
    this.register(new DnsProvider());
    this.register(new CrtShProvider({
      // crt.sh 502s/times out under load fairly often (it's a single
      // community-run Postgres instance, not a hosted API product) — give
      // it a more forgiving breaker than the default so a rough patch on
      // their end doesn't take the provider out of rotation for everyone
      // else's enrichment jobs for the full default cooldown.
      circuitBreaker: { failureThreshold: 8, cooldownMs: 60_000, halfOpenMaxCalls: 1 },
      retry: { retries: 2 },
    }));
    this.register(new BlockstreamProvider());
    this.register(new TronProvider());
    this.register(new EtherscanProvider({
      apiKey: this.configService.get('ETHERSCAN_API_KEY'),
    }));
  }

  private register(provider: BaseProvider) {
    this.providers.set(provider.meta.name, provider);
  }

  getProvidersForEntity(kind: EntityKind): BaseProvider[] {
    return Array.from(this.providers.values()).filter(
      p => p.isEnabled() && p.supports(kind)
    );
  }

  getProvider(name: string): BaseProvider | undefined {
    return this.providers.get(name);
  }

  getAll(): BaseProvider[] {
    return Array.from(this.providers.values());
  }
}
