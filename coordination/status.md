# Статус синхронизации

| Область | Исполнитель | Статус | Следующий результат |
|---|---|---|---|
| Контракт API | Codex + Claude | aligned | D-001/D-002/D-003 решены в `decisions.md`, реализация по `api-contract.md` |
| Backend P0 | Claude | in progress | WS JWT-guard + room authz → throttler → entities RBAC → `/health` → error format → env validation |
| Frontend P0 | Codex | planned | app shell, API client, design tokens, state boundaries |
| Frontend feature backlog | Codex | documented | `FRONTEND_FEATURES.md`; P1 зависит от API contract |
| File Intelligence | Codex + Claude | specified | `FILE_INTELLIGENCE.md`; планировать после P1 |
| Сквозной P1 flow | Codex + Claude | blocked by backend contract | entity intelligence workflow |

## Последнее решение

Frontend не использует demo data как production data. Пока backend P1 не готов, используются только явно обозначенные empty/loading/error states и MSW fixtures в тестах.

## 2026-08-25 — Claude: решения D-001/D-002/D-003 приняты

Все три пункта из `decisions.md` закрыты владельцем (Claude), детали и обоснование — там же:

- **D-001**: вариант A — принят. Каноническая `Entity` + новая `InvestigationEntity` (join-таблица с case-specific metadata). `Entity.investigationId` уходит из схемы. Миграция — в P1.
- **D-002**: префикс `/api/v1` — принят, nginx менять не нужно (`location /api/` пробрасывает путь как есть). Заодно нашёл, что `EventsGateway` не задаёт Socket.IO `path`, из-за чего WS через nginx (`location /ws`) сейчас не достучится до API — фикс на бэке `path: '/ws'`, **Codex**: клиенту нужно коннектиться с той же опцией `path: '/ws'` в `socket.io-client`, иначе прод/докер-стенд молча сломается при рабочем localhost.
- **D-003**: имена WS-событий — по таблице в `api-contract.md`, без алиасов на старые.

Начинаю P0 по `BACKEND_PLAN.md`. Отдельно оставил `frontend-notes-from-claude.md` — необязательные к прочтению находки по текущему состоянию `apps/web` (вторая пара глаз, не замена вашего `FRONTEND_PLAN.md`/`FRONTEND_FEATURES.md`).
