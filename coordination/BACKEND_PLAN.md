# Backend — рабочий план Claude (ответ на backend-brief-for-claude.md)

Дата: 2026-08-25. Прочитал `backend-brief-for-claude.md` и `api-contract.md`. Принимаю контракт и P0/P1 как есть — своим независимым аудитом (до того, как увидел файлы Codex) пришёл к тем же выводам по WS-авторизации, cross-tenant утечке и отсутствию health-check. Ниже — что подтверждаю, что добавляю от себя, и порядок исполнения.

## Подтверждаю из брифа без изменений
- WS JWT-guard + server-side room assignment (не даём клиенту подписываться на произвольный `room`).
- RBAC-проверка на уровне investigation/entity/enrichment/graph во всех сервис-методах.
- Canonical `Entity` + `InvestigationEntity` вместо текущего `Entity.investigationId` (сейчас апсерт "переезжает" сущность между кейсами — это баг, не фича).
- `/api/v1/health`, единый error format, request/correlation ID.
- Provenance на Finding (`sourceUrl`, `observedAt`, confidence) + дедупликация.

## Добавляю из своего аудита (в брифе не было)
1. **`@nestjs/throttler` уже в зависимостях, но нигде не подключён** — в `.env` зарезервированы `RATE_LIMIT_TTL/MAX`, но `ThrottlerModule` отсутствует в `app.module.ts`. Возьму в P0 вместе с WS-guard — это тот же security-блок.
2. **`@nestjs/terminus` в зависимостях, health-check не реализован** — реализую `/api/v1/health` через terminus (Postgres + Redis + BullMQ ping), а не голым `{status: 'ok'}`.
3. **Рассинхрон имён WS-событий**: `packages/types` объявляет одни имена (`enrichment.progress/result/done`), реальный `enrichment.processor.ts` эмитит другие (`enrichment.provider_done/finished`), а `api-contract.md` вводит третьи, целевые (`enrichment.provider.completed`, `enrichment.completed`, ...). Буду реализовывать строго по `api-contract.md` и синхронно поправлю `packages/types`, чтобы не было третьей версии в обороте.
4. **Search-модуль отсутствует, OpenSearch в compose не защищён** — по брифу (P0 п.7) либо закрываю доступ и не трогаю до индексации, либо (если это будет нужно в P1) подниму индексацию Entity/Finding. Пока — просто не мапаю порт наружу и не индексирую ничего, чтобы не врать в README про "готовый OpenSearch-поиск".

## Порядок исполнения (P0, в этом порядке)
1. WS JWT-guard + server-side room authorization (закрывает самую опасную дыру — утечка данных по WS).
2. `ThrottlerModule` global + жёсткий лимит на `/auth/login`, `/auth/register`.
3. RBAC-фикс в `entities.service.ts` (сейчас `findAll`/`findOne` не проверяют владение investigation — несогласовано с `investigations.service.ts`).
4. `/api/v1/health` через terminus.
5. Error format + correlation ID middleware.
6. Env-валидация на старте (Zod schema для `process.env`, fail fast если нет JWT-секретов/DATABASE_URL).

Затем — P1 по `api-contract.md`: миграция на `InvestigationEntity`, реализация эндпоинтов из таблицы, идемпотентность enrichment-джобов, интеграционные тесты (RBAC, изоляция кейсов, WS permissions).

Контракт (`api-contract.md`) буду держать в актуальном состоянии сам — при любом изменении DTO/роута/WS-события правлю его в том же PR/коммите, что и код.
