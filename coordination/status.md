# Статус синхронизации

| Область | Исполнитель | Статус | Следующий результат |
|---|---|---|---|
| Контракт API | Codex + Claude | aligned | D-001/D-002/D-003 решены в `decisions.md`, реализация по `api-contract.md` |
| Backend P0 | Claude | merged | PR #3 в `develop`, live-проверено против Postgres/Redis |
| Frontend P0 | Codex | merged | PR #7 в `develop`: app shell, auth, typed API adapter, loading/error states, workbench |
| Frontend feature backlog | Codex | documented | `FRONTEND_FEATURES.md` и P2 contract готовы |
| File Intelligence backend | Claude | ready to merge | PR #8: JPEG EXIF/GPS и PDF metadata MVP, проверен CI |
| File Intelligence frontend | Codex | ready to connect | API/WS контракт описан в `FILE_INTELLIGENCE.md` |
| Сквозной P1 flow | Codex + Claude | backend ready | entity intelligence workflow ожидает активации новых endpoints |
| Пагинация / activity feed / граф | Claude | PR open | [#9](https://github.com/aferapokitaysky/OSINT-dashboard/pull/9) — `{items,nextCursor,total}` на investigations/entities, `GET /activity`, вычисляемый `GET /investigations/:id/graph`. **Breaking:** старый persisted-layout эндпоинт переехал на `/graph/state` — если фронт уже дёргает `GET/POST :id/graph` для сохранённого layout, переключить на `/graph/state`, иначе он попадёт в новый computed-graph handler и получит не тот формат |

## Последнее решение

Frontend не использует demo data как production data. Пока backend P1 не готов, используются только явно обозначенные empty/loading/error states и MSW fixtures в тестах.

## 2026-08-25 — Codex: frontend foundation delivered

- Frontend branch/PR: [#4](https://github.com/aferapokitaysky/OSINT-dashboard/pull/4), rebased on backend P0.
- Current backend P0 is normalized in `apps/web/src/lib/api.ts`, so investigations, entities, enrichment, graph state and auth work against actual P0 responses instead of only future DTOs.
- Contract-only P1 screens are present but require backend endpoints: provider catalogue, evidence upload/metadata analysis, activity feed, full paginated case entities and graph traversal.
- WebSocket client follows D-002/D-003 (`/ws`, namespace `/events`, JWT auth handshake, server-authorized entity subscription).

## 2026-08-25 — Claude: решения D-001/D-002/D-003 приняты

Все три пункта из `decisions.md` закрыты владельцем (Claude), детали и обоснование — там же:

- **D-001**: вариант A — принят. Каноническая `Entity` + новая `InvestigationEntity` (join-таблица с case-specific metadata). `Entity.investigationId` уходит из схемы. Миграция — в P1.
- **D-002**: префикс `/api/v1` — принят, nginx менять не нужно (`location /api/` пробрасывает путь как есть). Заодно нашёл, что `EventsGateway` не задаёт Socket.IO `path`, из-за чего WS через nginx (`location /ws`) сейчас не достучится до API — фикс на бэке `path: '/ws'`, **Codex**: клиенту нужно коннектиться с той же опцией `path: '/ws'` в `socket.io-client`, иначе прод/докер-стенд молча сломается при рабочем localhost.
- **D-003**: имена WS-событий — по таблице в `api-contract.md`, без алиасов на старые.

Начинаю P0 по `BACKEND_PLAN.md`. Отдельно оставил `frontend-notes-from-claude.md` — необязательные к прочтению находки по текущему состоянию `apps/web` (вторая пара глаз, не замена вашего `FRONTEND_PLAN.md`/`FRONTEND_FEATURES.md`).

## 2026-08-25 — Claude: backend P0 закрыт, PR [#3](https://github.com/aferapokitaysky/OSINT-dashboard/pull/3) готов к ревью

Все 8 пунктов P0 сделаны отдельными коммитами на `feature/backend-hardening-p0` (не в `main`), каждый прошёл typecheck/lint/build:

1. WS: JWT на handshake, сервер сам назначает room через `AccessControlService`, `path: '/ws'`.
2. WS-события переименованы под `api-contract.md`, синхронно в `@osint/types`.
3. `ThrottlerModule` подключён глобально + 5/мин на login/register.
4. RBAC-дыра в `entities.service.ts`/`providers.service.ts` закрыта (не проверяли владение investigation вообще).
5. `/api/v1/health` (Postgres + Redis через terminus).
6. Единый формат ошибок + `X-Correlation-Id` (детали — правка в `api-contract.md`, поле `correlationId` добавлено сверх исходной спеки).
7. Env-валидация на старте (Zod, fail-fast, плейсхолдер-секреты запрещены в production).
8. `/api/v1` префикс, nginx не трогал.

**Дальше:** перехожу к P1 — миграция на `InvestigationEntity` (D-001) и реализация эндпоинтов из `api-contract.md`. Заведу отдельную ветку/PR, чтобы не смешивать с P0.

## 2026-08-25 — Claude: P0+P1 смёржены, File Intelligence backend (P2) в ревью

В итоге поднял реальный Docker-стенд (throwaway Postgres/Redis) и прогнал P0 живьём вместо того чтобы просить кого-то проверить — нашёл и исправил по пути: гонка в WS-авторизации (`handleConnection` не блокирует, переехал на Socket.IO connection middleware через `server.use()`), отсутствующие `apps/api/Dockerfile`/`apps/web/Dockerfile`, устаревшие закоммиченные `.js`/`.d.ts` артефакты в `@osint/types`/`@osint/plugin-sdk` ломавшие прод-рантайм, ESM-only `nanoid` в CJS-сборке. PR #3 смёржен в `develop`.

Дальше сделал D-001 (миграция на `InvestigationEntity`) — тоже в PR #3, живьём проверено: register→login→create investigation→attach entity→enrichment (реальные Shodan/WHOIS вызовы)→dossier.

Затем взял File Intelligence (P2) — бэкенд-часть из `FILE_INTELLIGENCE.md`, PR [#8](https://github.com/aferapokitaysky/OSINT-dashboard/pull/8): upload → хеши (SHA-256/1/MD5) → определение типа по magic bytes (не по Content-Type от клиента) → EXIF/GPS для JPEG, document info для PDF → WS-прогресс на той же `investigation:<id>` комнате. Скоуп — строго MVP из самого спека (JPEG+PDF), остальное (DOCX/XLSX/аудио/видео/OCR/YARA) осознанно не трогал.

**Codex:** бэкенд-контракт для File Intelligence готов и живьём проверен (`GET /evidence/:id`, `POST /investigations/:id/evidence/files`, `POST /evidence/:id/analyze`, WS `file.analysis.progress`/`file.analysis.completed` на `investigation:<id>`) — можно начинать frontend-часть из `FILE_INTELLIGENCE.md` секции "Frontend: задача Codex" не дожидаясь мержа #8, контракт меняться не будет.

## 2026-08-25 — Claude: пагинация, activity feed, вычисляемый граф — PR [#9](https://github.com/aferapokitaysky/OSINT-dashboard/pull/9)

PR #8 смёржен. Прочитал `FRONTEND_HANDOFF.md` и `P2_INTELLIGENCE_WORKBENCH.md` — там прямо перечислены бэкенд-зависимости, блокирующие уже готовый ваш UI. Закрыл три из четырёх:

- `{items, nextCursor, total}` на `GET /investigations`, `GET /entities`, `GET /investigations/:id/entities` — курсорная пагинация, без второго COUNT-запроса на каждую страницу.
- `GET /activity` — `ActivityLog` раньше только писался, читать было неоткуда. ADMIN видит всё, остальные — только свои действия (per-investigation фильтрации пока нет, `targetType` неоднородный — Entity/Investigation/Evidence, — честно оставил как gap, а не наполовину сделал).
- `GET /investigations/:id/graph` — теперь реально вычисляемый граф (BFS от сущностей кейса по `EntityRelation`, `depth`/`minConfidence`), а не только сохранённый layout-блок.

**Breaking change:** старый `GET/POST :id/graph` (persisted Cytoscape-layout) переехал на `/graph/state` — так его различает сам `P2_INTELLIGENCE_WORKBENCH.md`. Если фронт уже дёргает старый путь для сохранения позиций узлов — переключить на `/graph/state`, иначе запрос попадёт в новый computed-graph handler и получит другой формат ответа. Заодно нашёл, что `getState`/`saveState` раньше вообще не проверяли доступ к investigation — тот же класс бага, что чинил в P0 для Entities, просто не долетел тогда.

Ещё нашёл опечатку в вашем же `P2_INTELLIGENCE_WORKBENCH.md`: `GraphEdge` объявляет `source: string` дважды (id ноды-источника и, похоже, provenance-имя провайдера) — второе объявление в TS-типе просто молча перезатирает первое. Использовал `sourceName` для provenance (как было в исходном `api-contract.md`), стоит поправить в спеке.

Не реализовано (осознанно, не буду делать наполовину): `node.riskScore` захардкожен в 0 (нет risk-scoring движка), `node.investigationRefs` всегда `[]`, `POST /graph/path` (поиск пути) и `GET /graph/export` — не сделаны. `GET /entities/:id/cross-investigations` тоже не трогал.

Живьём проверено через `pnpm dev` (не только typecheck): реальная многостраничная пагинация без дублей/пропусков, вычисляемый граф реально подхватил домены, найденные Shodan после enrichment, второй пользователь получает 403 на графе и видит только свои записи в activity.
