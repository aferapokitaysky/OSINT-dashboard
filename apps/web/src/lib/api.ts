export type EntityKind = 'EMAIL' | 'USERNAME' | 'DOMAIN' | 'IP' | 'PHONE' | 'CRYPTO_WALLET' | 'SOCIAL_PROFILE' | 'COMPANY' | 'PERSON' | 'ASN' | 'HASH' | 'URL';
export type Severity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProviderStatus = 'OK' | 'NOT_FOUND' | 'ERROR' | 'RATE_LIMITED' | 'DISABLED';

export interface ApiErrorShape { error: { code: string; message: string; details?: unknown[] } }
export interface Investigation {
  id: string; title: string; description?: string; status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ARCHIVED'; tags: string[];
  owner: { id: string; displayName: string }; counts: { entities: number; findings: number; evidence: number; alerts: number }; createdAt: string; updatedAt: string;
}
export interface Entity { id: string; kind: EntityKind; value: string; normalized: string; riskScore: number; lastEnrichedAt?: string }
export interface CaseEntity { id: string; investigationId: string; entity: Entity; notes?: string; tags: string[]; status: 'ACTIVE' | 'ARCHIVED' | 'EXCLUDED'; addedAt: string }
export interface Finding { id: string; entityId: string; source: string; sourceUrl?: string; type: string; severity: Severity; score: number; title: string; description: string; confidence: number; observedAt: string; fetchedAt: string }
export interface Relation { id: string; source: string; target: string; relation: string; confidence: number; sourceName: string; entity?: Entity }
export interface ProviderResult { id: string; provider: string; status: ProviderStatus; data?: unknown; error?: string; durationMs: number; fetchedAt: string }
export interface EntityDossier { entity: Entity; findings: Finding[]; results: ProviderResult[]; relations: Relation[]; notes?: string }
export interface Provider { name: string; displayName: string; supports: EntityKind[]; enabled: boolean; freeTier?: string; status?: string }
export interface Evidence { id: string; title: string; kind: 'file' | 'note' | 'link'; mimeType?: string; sizeBytes?: number; sha256?: string; createdAt: string; uploader?: { displayName: string }; analysis?: FileAnalysis }
export interface FileAnalysis { status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'UNSUPPORTED'; detectedMime?: string; sha256?: string; sha1?: string; md5?: string; metadata?: Record<string, unknown>; warnings?: string[]; analyzedAt?: string }
export interface ActivityLog { id: string; action: string; targetType?: string; targetId?: string; actor?: { displayName: string }; createdAt: string; metadata?: Record<string, unknown> }
export interface AuthTokens { accessToken: string; refreshToken: string; accessTtl: number; refreshTtl: number }
export interface Paginated<T> { items: T[]; nextCursor: string | null; total: number }
export interface InvestigationGraph { nodes: Array<{ id: string; label: string; kind: EntityKind; riskScore?: number }>; edges: Array<{ id?: string; source: string; target: string; relation: string; confidence?: number; sourceName?: string }> }

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

function token() { return typeof window === 'undefined' ? null : localStorage.getItem('osint.access-token'); }
let refreshInFlight: Promise<string | null> | null = null;

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return requestOnce<T>(path, init, true);
}

async function requestOnce<T>(path: string, init: RequestInit, canRefresh: boolean): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  const accessToken = token();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401 && canRefresh && !path.startsWith('/auth/')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return requestOnce<T>(path, init, false);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as ApiErrorShape | null;
    throw new ApiError(response.status, payload?.error?.code ?? `HTTP_${response.status}`, payload?.error?.message ?? 'Request failed. Please try again.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = localStorage.getItem('osint.refresh-token');
      if (!refreshToken) return null;
      const response = await fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ refreshToken }) });
      if (!response.ok) { localStorage.removeItem('osint.access-token'); localStorage.removeItem('osint.refresh-token'); window.dispatchEvent(new Event('osint:session-ended')); return null; }
      const payload = await response.json() as AuthTokens;
      localStorage.setItem('osint.access-token', payload.accessToken);
      localStorage.setItem('osint.refresh-token', payload.refreshToken);
      return payload.accessToken;
    })().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

// The deployed P0 API returns Prisma-shaped envelopes; this adapter normalizes them until P1 DTOs land.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;
const page = <T>(items: T[]): Paginated<T> => ({ items, nextCursor: null, total: items.length });
function entity(raw: Raw): Entity { return { id: raw.id, kind: raw.kind, value: raw.value, normalized: raw.normalized ?? raw.value.toLowerCase(), riskScore: raw.findings?.reduce?.((sum: number, finding: Raw) => sum + (finding.score ?? 0), 0) ?? 0, lastEnrichedAt: raw.results?.[0]?.fetchedAt }; }
function investigation(raw: Raw): Investigation { return { id: raw.id, title: raw.title, description: raw.description ?? undefined, status: raw.status, tags: raw.tags ?? [], owner: raw.owner ?? { id: raw.ownerId, displayName: 'Investigation owner' }, counts: raw.counts ?? { entities: raw._count?.entities ?? raw.entities?.length ?? 0, findings: raw._count?.findings ?? 0, evidence: raw._count?.evidence ?? raw.evidence?.length ?? 0, alerts: raw._count?.alerts ?? raw.alerts?.length ?? 0 }, createdAt: raw.createdAt, updatedAt: raw.updatedAt }; }
function dossier(raw: Raw): EntityDossier { const source = entity(raw); return { entity: source, notes: raw.notes ?? undefined, findings: (raw.findings ?? []).map((finding: Raw) => ({ ...finding, entityId: finding.entityId ?? source.id, confidence: finding.confidence ?? 1, observedAt: finding.observedAt ?? finding.createdAt, fetchedAt: finding.fetchedAt ?? finding.createdAt })), results: raw.results ?? [], relations: [...(raw.outRelations ?? []).map((relation: Raw) => ({ id: relation.id, source: relation.fromId, target: relation.toId, relation: relation.relation, confidence: relation.confidence, sourceName: relation.source, entity: relation.to ? entity(relation.to) : undefined })), ...(raw.inRelations ?? []).map((relation: Raw) => ({ id: relation.id, source: relation.fromId, target: relation.toId, relation: relation.relation, confidence: relation.confidence, sourceName: relation.source, entity: relation.from ? entity(relation.from) : undefined }))] }; }

export const api = {
  login: (body: { email: string; password: string; totpCode?: string }) => request<AuthTokens>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body: { email: string; password: string; displayName: string }) => request<{ message: string }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  logout: (refreshToken: string) => request<void>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  investigations: async (params = '') => page((await request<Raw[]>(`/investigations${params}`)).map(investigation)),
  investigation: async (id: string) => investigation(await request<Raw>(`/investigations/${id}`)),
  createInvestigation: async (body: { title: string; description?: string; tags?: string[] }) => investigation(await request<Raw>('/investigations', { method: 'POST', body: JSON.stringify(body) })),
  caseEntities: async (id: string): Promise<Paginated<CaseEntity>> => page((await request<Raw>(`/investigations/${id}`)).entities.map((raw: Raw): CaseEntity => ({ id: raw.id, investigationId: id, entity: entity(raw), notes: raw.notes ?? undefined, tags: [], status: 'ACTIVE', addedAt: raw.createdAt }))),
  addEntity: async (id: string, body: { kind: EntityKind; value: string; notes?: string }) => { const raw = await request<Raw>('/entities', { method: 'POST', body: JSON.stringify({ ...body, investigationId: id }) }); return { id: raw.id, investigationId: id, entity: entity(raw), notes: raw.notes ?? undefined, tags: [], status: 'ACTIVE' as const, addedAt: raw.createdAt }; },
  entity: async (id: string) => dossier(await request<Raw>(`/entities/${id}`)),
  entities: async (params = '') => page((await request<Raw[]>(`/entities${params}`)).map(entity)),
  enrich: (id: string, providers?: string[]) => request<{ jobId: string }>('/enrichment', { method: 'POST', body: JSON.stringify({ entityId: id, providers }) }),
  graph: (id: string) => request<InvestigationGraph>(`/investigations/${id}/graph`),
  providers: () => request<Provider[]>('/providers'),
  evidence: (investigationId: string) => request<Paginated<Evidence>>(`/investigations/${investigationId}/evidence`),
  uploadEvidence: (investigationId: string, file: File) => { const form = new FormData(); form.append('file', file); return request<Evidence>(`/investigations/${investigationId}/evidence/files`, { method: 'POST', body: form }); },
  activity: () => request<Paginated<ActivityLog>>('/activity'),
};

export function detectEntityKind(value: string): EntityKind | null {
  const v = value.trim();
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(v) || v.includes(':')) return 'IP';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'EMAIL';
  if (/^https?:\/\//i.test(v)) return 'URL';
  if (/^(?:[a-f\d]{32}|[a-f\d]{40}|[a-f\d]{64})$/i.test(v)) return 'HASH';
  if (/^(?:bc1|0x)[a-zA-Z0-9]{20,}$/i.test(v)) return 'CRYPTO_WALLET';
  if (/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(v)) return 'DOMAIN';
  if (/^[\w.-]{2,64}$/.test(v)) return 'USERNAME';
  return null;
}
