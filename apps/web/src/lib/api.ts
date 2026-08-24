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
export interface Paginated<T> { items: T[]; nextCursor: string | null; total: number }

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

function token() { return typeof window === 'undefined' ? null : localStorage.getItem('osint.access-token'); }

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  const accessToken = token();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as ApiErrorShape | null;
    throw new ApiError(response.status, payload?.error?.code ?? `HTTP_${response.status}`, payload?.error?.message ?? 'Request failed. Please try again.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  investigations: (params = '') => request<Paginated<Investigation>>(`/investigations${params}`),
  investigation: (id: string) => request<Investigation>(`/investigations/${id}`),
  createInvestigation: (body: { title: string; description?: string; tags?: string[] }) => request<Investigation>('/investigations', { method: 'POST', body: JSON.stringify(body) }),
  caseEntities: (id: string) => request<Paginated<CaseEntity>>(`/investigations/${id}/entities`),
  addEntity: (id: string, body: { kind: EntityKind; value: string; notes?: string }) => request<CaseEntity>(`/investigations/${id}/entities`, { method: 'POST', body: JSON.stringify(body) }),
  entity: (id: string) => request<EntityDossier>(`/entities/${id}`),
  entities: (params = '') => request<Paginated<Entity>>(`/entities${params}`),
  enrich: (id: string, providers?: string[]) => request<{ jobId: string }>(`/entities/${id}/enrichments`, { method: 'POST', body: JSON.stringify({ providers }) }),
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
