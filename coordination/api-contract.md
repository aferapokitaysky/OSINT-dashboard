# Контракт frontend ↔ backend

Этот файл — источник истины для интеграции. Claude обновляет его при изменении API; Codex использует его для клиента и интерфейса.

## Базовые правила API

- Base URL: `/api/v1`. Реализовано (`app.setGlobalPrefix('api/v1')`) — nginx не менялся, см. D-002.
- Аутентификация HTTP: `Authorization: Bearer <accessToken>`.
- Все ошибки: `{ "error": { "code": "…", "message": "…", "details": [], "correlationId": "…" } }`. `code` — SCREAMING_SNAKE_CASE от HTTP-статуса (`BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `TOO_MANY_REQUESTS`, `INTERNAL_SERVER_ERROR`, ...). `correlationId` — добавил сверх исходной спеки: эхо заголовка `X-Correlation-Id` (или сгенерированный, если клиент не прислал), тот же ID уходит в ответе тем же заголовком и в серверные логи. Реализация: `apps/api/src/common/filters/all-exceptions.filter.ts` + `apps/api/src/common/middleware/correlation-id.middleware.ts`.
- Списки: `{ "items": [], "nextCursor": null, "total": 0 }`.
- Даты: ISO 8601 UTC; ID: UUID.
- Любой ресурс расследования проверяется на membership/role до чтения и изменения.

## Нужные модели ответа

### Investigation

```ts
type Investigation = {
  id: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ARCHIVED';
  tags: string[];
  owner: { id: string; displayName: string };
  counts: { entities: number; findings: number; evidence: number; alerts: number };
  createdAt: string;
  updatedAt: string;
};
```

### Case entity

Одна каноническая сущность может быть в нескольких расследованиях. Нужна отдельная связь `InvestigationEntity`, а не перезапись `Entity.investigationId`.

```ts
type Entity = {
  id: string;
  kind: 'EMAIL' | 'USERNAME' | 'DOMAIN' | 'IP' | 'PHONE' | 'CRYPTO_WALLET' | 'SOCIAL_PROFILE' | 'COMPANY' | 'PERSON' | 'ASN' | 'HASH' | 'URL';
  value: string;
  normalized: string;
  riskScore: number;
  lastEnrichedAt?: string;
};

type InvestigationEntity = {
  id: string;
  investigationId: string;
  entity: Entity;
  notes?: string;
  tags: string[];
  status: 'ACTIVE' | 'ARCHIVED' | 'EXCLUDED';
  addedAt: string;
};
```

### Finding и связь

```ts
type Finding = {
  id: string;
  entityId: string;
  source: string;
  sourceUrl?: string;
  type: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;
  title: string;
  description: string;
  confidence: number;
  observedAt: string;
  fetchedAt: string;
};
```

## Endpoints P1

| Метод | Endpoint | Назначение |
|---|---|---|
| `GET` | `/investigations` | Кейсы, доступные текущему пользователю |
| `POST` | `/investigations` | Создать кейс |
| `GET` | `/investigations/:id` | Dossier кейса с counts |
| `POST` | `/investigations/:id/entities` | Нормализовать/прикрепить сущность к кейсу |
| `GET` | `/investigations/:id/entities` | Сущности кейса, фильтры и cursor pagination |
| `GET` | `/entities/:id` | Dossier сущности: findings, results, relations, история enrichment |
| `POST` | `/entities/:id/enrichments` | Запустить enrichment; возвращает `jobId` |
| `GET` | `/enrichments/:jobId` | Статус и прогресс задачи |
| `GET` | `/providers` | Доступность, типы сущностей, лимиты и статус провайдеров |

Реализовано в PR #3 (`develop`), кроме одной честной оговорки: `GET /investigations/:id/entities` и `GET /entities` пока без cursor pagination — обычный список, `nextCursor` всегда `null`. `Entity.riskScore`/`lastEnrichedAt` из типа выше тоже не реализованы (нет risk-scoring движка) — не полагайтесь на эти поля в ответе, их там нет.

## Evidence / File Intelligence P2

PR [#8](https://github.com/aferapokitaysky/OSINT-dashboard/pull/8), стек на #3. Бэкенд-MVP из `FILE_INTELLIGENCE.md`: только JPEG (с EXIF/GPS) и PDF — реализация подробностей в PR description, живьём проверена.

```ts
type Evidence = {
  id: string;
  investigationId: string;
  kind: 'file' | 'note' | 'link';
  title: string; // original filename for uploads
  storagePath?: string;
  mimeType?: string;
  sha256?: string;
  sizeBytes?: number;
  createdAt: string;
  fileAnalysis?: FileAnalysis;
};

type FileAnalysis = {
  id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'UNSUPPORTED';
  detectedMime: string | null; // from magic bytes, never trust mimeType above for security decisions
  sha256: string | null;
  sha1: string | null;
  md5: string | null;
  metadata: Record<string, unknown> | null; // shape depends on detectedMime, see below
  warnings: string[] | null;
  analyzedAt: string | null;
};
```

`metadata` shape by `detectedMime`:
- `image/jpeg`: `{ capturedAt, cameraMake, cameraModel, software, orientation, gps: {latitude, longitude, altitude} | null, dimensions: {width, height} | null }`
- `application/pdf`: `{ pageCount, title, author, creator, producer, createdAt, modifiedAt }`
- `image/png` or anything else: `{}` (PNG has no EXIF container to read yet; unrecognized types get `status: 'UNSUPPORTED'` + a warning instead)

| Метод | Endpoint | Назначение |
|---|---|---|
| `POST` | `/investigations/:id/evidence/files` | Multipart upload (`file` field), 25MB cap by default (`EVIDENCE_MAX_UPLOAD_BYTES`), returns `{ evidenceId, jobId }` |
| `GET` | `/evidence/:id` | Full dossier including `fileAnalysis` |
| `POST` | `/evidence/:id/analyze` | Re-queue analysis, returns `{ evidenceId, jobId }` |

WS, same `investigation:<id>` room as enrichment:

| Event | Payload |
|---|---|
| `file.analysis.progress` | `{ evidenceId, stage: 'hashing'\|'detecting_type'\|'extracting_metadata', progress }` |
| `file.analysis.completed` | `{ evidenceId, analysisId, status, warningCount }` |

## WebSocket P1

Namespace `/events`; JWT передаётся в Socket.IO auth handshake. Сервер сам назначает комнаты на основании прав пользователя — клиент не может подписываться на строку room произвольно.

| Event | Payload |
|---|---|
| `enrichment.started` | `{ jobId, entityId, providers: string[] }` |
| `enrichment.provider.completed` | `{ jobId, entityId, provider, status, resultId, findingCount, relationCount }` |
| `enrichment.progress` | `{ jobId, entityId, completed, total }` |
| `enrichment.completed` | `{ jobId, entityId, status, completedAt }` |
| `alert.created` | `{ alertId, investigationId, severity, title }` |

## Граф P2

`GET /investigations/:id/graph?depth=1&kinds=IP,DOMAIN&minConfidence=0.7` возвращает только данные для визуализации, а не сохранённые произвольные Cytoscape nodes.

```ts
type InvestigationGraph = {
  nodes: Array<{ id: string; label: string; kind: Entity['kind']; riskScore: number }>;
  edges: Array<{ id: string; source: string; target: string; relation: string; confidence: number; sourceName: string }>;
};
```
