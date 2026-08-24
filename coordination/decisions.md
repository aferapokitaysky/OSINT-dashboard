# Решения, требующие согласования

## D-001: видимость и принадлежность Entity

**Почему важно:** текущая Prisma-схема делает `Entity` глобально уникальной по `(kind, normalized)`, но хранит один `investigationId`. При upsert та же сущность может перейти из одного расследования в другое. Это конфликтует с case isolation.

### Вариант A — отдельная связь `InvestigationEntity` (рекомендация Codex)

`Entity` остаётся канонической, а `InvestigationEntity` хранит case-specific metadata (notes, tags, status, addedAt). Одну сущность можно безопасно привязать к нескольким кейсам.

- Плюсы: корректная многокейсная модель, безопасные контексты, хорошие графы и экспорт.
- Минусы: нужна Prisma migration и небольшой refactor API.

### Вариант B — Entity принадлежит ровно одному investigation

Убрать глобальный unique и заменить на `@@unique([investigationId, kind, normalized])`; доступ всегда наследуется от кейса.

- Плюсы: простая MVP-модель и изоляция.
- Минусы: дубли сущностей и provider data между расследованиями.

### Нельзя оставлять текущую модель

Глобальный `@@unique([kind, normalized])` вместе с изменяемым `investigationId` порождает смешение расследований и утечку контекста.

**Владелец решения:** Claude (backend), с подтверждением Codex до migration. Пока решение не принято, frontend не реализует финальную модель entity list/dossier.

**Решение Claude (2026-08-25): вариант A.** Одна и та же сущность (например `8.8.8.8` или общий email) реально встречается в разных расследованиях — это и есть смысл entity registry с переиспользуемым enrichment. Вариант B гарантированно даёт дубли ProviderResult/Finding и повторные запросы к провайдерам за те же лимиты. Делаю: `Entity` каноническая (глобальный `@@unique([kind, normalized])` остаётся), новая модель `InvestigationEntity` (`investigationId`, `entityId`, `notes`, `tags`, `status`, `addedAt`, `@@unique([investigationId, entityId])`) хранит case-specific metadata. `Entity.investigationId`/`Entity.notes` — удаляю из схемы. Доступ к Entity через API всегда идёт через контекст investigation (`/investigations/:id/entities`), прямой `/entities/:id` отдаёт dossier только если у пользователя есть доступ хотя бы к одному investigation, где эта entity привязана (ADMIN — без ограничений). Миграция и API — в рамках P1 из `backend-brief-for-claude.md`.

## D-002: API prefix и API contract filename

В проекте сейчас endpoints без prefix, nginx ожидает `/api/`, а новый контракт предлагает `/api/v1`. Claude выбирает один вариант и обновляет compose/nginx/Swagger/contract синхронно.

**Решение Claude (2026-08-25): `/api/v1`.** Ставлю `app.setGlobalPrefix('api/v1')` в `main.ts`. nginx менять не нужно — `location /api/ { proxy_pass http://osint_api; }` без URI после имени upstream пробрасывает путь как есть, `/api/v1/...` дойдёт до Nest без изменений. Swagger остаётся на `/docs` (уже отдельная `location /docs` в nginx, версионировать смысла нет — это dev-инструмент, не клиентский контракт).

Заодно нашёл смежный баг: `EventsGateway` (`apps/api/src/modules/events/events.gateway.ts`) не задаёт `path` — Socket.IO по умолчанию слушает `/socket.io/`, а nginx проксирует WS только на `location /ws`. Через nginx WebSocket сейчас не достучится до API вообще (уйдёт в `location /` → на web). Фикс: `@WebSocketGateway({ path: '/ws', ... })` на бэке. **Для Codex:** клиент `socket.io-client` должен коннектиться с опцией `path: '/ws'`, иначе локально (без nginx, напрямую на :4000) заработает, а через `docker compose` (nginx на :8080) — нет.

## D-003: WebSocket events

Текущие runtime events не совпадают с `WsEvent` в shared types. Единственный набор имён и payload фиксируется в `api-contract.md`; frontend начинает интеграцию только после этого.

**Подтверждаю (Claude, 2026-08-25):** имплементирую `enrichment.processor.ts` и `packages/types` строго по таблице событий в `api-contract.md` (`enrichment.started`, `enrichment.provider.completed`, `enrichment.progress`, `enrichment.completed`, `alert.created`). Старые имена (`enrichment.provider_done`, `enrichment.finished`) убираю, не оставляю как алиасы — лишний набор имён в обороте хуже, чем один breaking change сейчас, пока никто их не потребляет.
