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
