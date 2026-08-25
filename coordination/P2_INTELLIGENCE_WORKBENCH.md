# P2 — Sources, graph correlation and incident timeline

## Ownership

| Area | Owner |
|---|---|
| Provider integrations, data normalization, queueing, rate limits, source terms | Claude / backend |
| Analyst workflow, source selection, graph/timeline interaction, export UI | Codex / frontend |

Only public data and documented provider APIs are in scope. Never circumvent access controls, scrape authenticated data, or infer identity from a crypto address beyond provider-supplied public labels.

## Provider backlog

### P2.1 Certificate Transparency — `crt.sh`

- Entity: `DOMAIN`.
- Input: registrable domain; normalize IDN/punycode.
- Output: certificate IDs, issuer, validity, `name_value` names, wildcard flag, logged timestamp.
- Derived entities: unique domains/subdomains with `certificate_covers` relation.
- Findings: expired certificate, recently first-seen subdomain; raw certificate records remain attributable to `crt.sh`.
- No API key; cache per domain (24h) and deduplicate names.

### P2.2 Crypto public-chain intelligence

Implement providers separately behind one normalized `CRYPTO_WALLET` contract:

| Chain/provider | MVP data |
|---|---|
| Ethereum / Etherscan | balance, native/ERC-20 transfers, timestamp, transaction hash, public address label |
| Bitcoin / Blockstream | balance/UTXO summary, transactions, timestamp, txid |
| TRON / TronGrid or documented public API | balance, transfers, timestamp, transaction ID |

- Detect chain/address format before lookup; do not query every provider blindly.
- Derived relations: `sent_to`, `received_from`, `interacted_with`; include transaction ID, amount, asset and timestamp in provenance payload.
- Public labels such as exchange attribution are `provider_label`, not verified identity. UI must mark them as labels and show source/confidence.
- Apply provider-specific rate limits, 5–15 min cache and transaction pagination.

### P2.3 Social footprint — Sherlock/Maigret

- Entity: `USERNAME`.
- Execute engine in isolated worker with strict process/time/output caps, only against its documented public sites.
- Store positive and negative results separately; a timeout/error is never a negative match.
- Derived `SOCIAL_PROFILE` entities contain canonical URL and platform name; `profile_claimed_by` relation has source and confidence.
- UI must never state that profiles belong to the same person without analyst confirmation.

### P2.4 Threat intel and passive DNS

| Provider | MVP |
|---|---|
| AlienVault OTX | pulses, indicators, tags, malware/family context |
| Censys | host/service observations and historical DNS only with documented API/key and rate limits |

- Findings include indicator type, source URL/reference, first/last seen and severity mapping.
- Historical DNS relations must retain `observedFrom`/`observedTo`, not overwrite current DNS.

## Graph Workbench contract

### Data

`GET /investigations/:id/graph?depth=1&minConfidence=0.7&from=&to=` returns:

```ts
type GraphNode = { id: string; label: string; kind: EntityKind; riskScore: number; investigationRefs: Array<{ id: string; title: string; access: 'current' | 'related' }> };
type GraphEdge = { id: string; source: string; target: string; relation: string; confidence: number; source: string; observedAt?: string; payload?: Record<string, unknown> };
type GraphResponse = { nodes: GraphNode[]; edges: GraphEdge[]; paths?: Array<{ nodeIds: string[]; edgeIds: string[] }> };
```

### Operations

- `POST /investigations/:id/graph/path` body `{ fromId, toId, maxDepth?: number }` → BFS shortest path, respecting user access.
- `GET /entities/:id/cross-investigations` → only user-accessible case references; never disclose title/ID of unauthorized cases.
- `POST /investigations/:id/graph/state` persists only layout/view state, not canonical graph facts.
- `GET /investigations/:id/graph/export?format=svg|png` returns a server-side export or signed temporary export URL. Frontend export may be used only for currently rendered visible data.

## Timeline contract

`GET /investigations/:id/timeline?from=&to=&kinds=` returns cursor-paginated immutable events:

```ts
type TimelineEvent = {
  id: string;
  occurredAt: string;
  kind: 'DOMAIN_REGISTRATION' | 'CERTIFICATE_OBSERVED' | 'DNS_CHANGE' | 'ONCHAIN_TRANSFER' | 'THREAT_INTEL' | 'FINDING' | 'EVIDENCE_ADDED' | 'ANALYST_ACTION';
  title: string;
  description?: string;
  entityId?: string;
  entityLabel?: string;
  source: string;
  confidence?: number;
  evidenceRefs: string[];
};
```

- Sort server-side by `occurredAt`, cursor pagination and timezone-safe ISO UTC.
- Preserve source timestamps and ingestion timestamps separately.
- Analyst actions are clearly distinct from external observations.

## Acceptance criteria

- Every provider result links to a source, time and confidence; provider errors/rate limits never become negative findings.
- Cross-case notices respect authorization.
- Path finding returns an explainable edge chain, not only highlighted nodes.
- Graph export never leaks unseen or unauthorized case data.
- Timeline filters do not alter event evidence/provenance.
