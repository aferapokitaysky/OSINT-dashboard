import { z } from 'zod';

// ============================================================
// Entity types — what we can search for
// ============================================================

export const EntityKind = {
  EMAIL: 'EMAIL',
  USERNAME: 'USERNAME',
  DOMAIN: 'DOMAIN',
  IP: 'IP',
  PHONE: 'PHONE',
  CRYPTO_WALLET: 'CRYPTO_WALLET',
  SOCIAL_PROFILE: 'SOCIAL_PROFILE',
  COMPANY: 'COMPANY',
  PERSON: 'PERSON',
  ASN: 'ASN',
  HASH: 'HASH',
  URL: 'URL',
  TELEGRAM: 'TELEGRAM',
  DISCORD: 'DISCORD',
} as const;
export type EntityKind = (typeof EntityKind)[keyof typeof EntityKind];

export const entityKindSchema = z.enum([
  'EMAIL', 'USERNAME', 'DOMAIN', 'IP', 'PHONE',
  'CRYPTO_WALLET', 'SOCIAL_PROFILE', 'COMPANY', 'PERSON',
  'ASN', 'HASH', 'URL', 'TELEGRAM', 'DISCORD'
]);

// ============================================================
// RBAC
// ============================================================

export const Role = {
  ADMIN: 'ADMIN',
  ANALYST: 'ANALYST',
  VIEWER: 'VIEWER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const roleSchema = z.enum(['ADMIN', 'ANALYST', 'VIEWER']);

// ============================================================
// Auth DTOs
// ============================================================

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(256),
  totpCode: z.string().regex(/^\d{6}$/).optional(),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(256),
  displayName: z.string().min(1).max(80),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshDto = z.infer<typeof refreshSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTtl: number;
  refreshTtl: number;
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  twoFactorEnabled: boolean;
}

// ============================================================
// Entity / Investigation / Finding DTOs
// ============================================================

export const createEntitySchema = z.object({
  kind: entityKindSchema,
  value: z.string().min(1).max(512),
  investigationId: z.string().uuid().optional(),
  notes: z.string().max(4000).optional(),
});
export type CreateEntityDto = z.infer<typeof createEntitySchema>;

export const createInvestigationSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});
export type CreateInvestigationDto = z.infer<typeof createInvestigationSchema>;

export const enrichmentRequestSchema = z.object({
  entityId: z.string().uuid(),
  providers: z.array(z.string().min(1)).optional(),
});
export type EnrichmentRequestDto = z.infer<typeof enrichmentRequestSchema>;

export const quickEnrichmentSchema = z.object({
  type: entityKindSchema,
  value: z.string().min(1).max(512),
  providers: z.array(z.string().min(1)).optional(),
  investigationId: z.string().uuid().optional(),
});
export type QuickEnrichmentDto = z.infer<typeof quickEnrichmentSchema>;

// ============================================================
// Provider result envelope (returned by every provider)
// ============================================================

export const providerStatus = z.enum(['OK', 'NOT_FOUND', 'ERROR', 'RATE_LIMITED', 'DISABLED']);
export type ProviderStatus = z.infer<typeof providerStatus>;

export interface ProviderResultEnvelope<T = unknown> {
  provider: string;
  status: ProviderStatus;
  durationMs: number;
  fetchedAt: string;
  data: T | null;
  error?: string;
  relatedEntities?: RelatedEntity[];
  riskSignals?: RiskSignal[];
}

export interface RelatedEntity {
  kind: EntityKind;
  value: string;
  relation: string;
  confidence: number;
}

export interface RiskSignal {
  type: string;
  title?: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  score: number;
}

// ============================================================
// WebSocket events
// ============================================================

export const WsEvent = {
  EnrichmentStarted: 'enrichment.started',
  EnrichmentProgress: 'enrichment.progress',
  EnrichmentResult: 'enrichment.result',
  EnrichmentDone: 'enrichment.done',
  AlertCreated: 'alert.created',
  ActivityCreated: 'activity.created',
} as const;
export type WsEvent = (typeof WsEvent)[keyof typeof WsEvent];

export interface WsEnrichmentResultPayload {
  entityId: string;
  jobId: string;
  result: ProviderResultEnvelope;
}

export interface WsEnrichmentDonePayload {
  entityId: string;
  jobId: string;
  totalProviders: number;
  successCount: number;
  errorCount: number;
}
