# Задача для Claude: backend OSINT Platform

## Контекст

В репозитории есть NestJS + Prisma + BullMQ foundation. Frontend делает Codex. Цель — не витрина, а законный OSINT-workbench с публичными источниками. Полный контракт лежит в `coordination/api-contract.md`.

## P0: обязательно до новых фич

1. Добавить отсутствующие Dockerfile для API и web либо привести compose к реально существующей конфигурации.
2. Добавить `/api/v1/health` и согласовать nginx/API prefix/healthcheck.
3. Исправить CI: Prisma Client должен генерироваться до typecheck; добавить initial Prisma migration.
4. Реализовать единый error format, request/correlation ID и структурированное логирование без PII/секретов.
5. Закрыть WebSocket JWT-guard, CORS allowlist и server-side room authorization. Удалить возможность подписки на arbitrary room.
6. Проверять доступ к investigation/entity/enrichment/graph во всех service methods. Не допускать cross-tenant data leak.
7. Не пробрасывать Postgres, Redis и OpenSearch наружу в production; включить безопасность OpenSearch либо убрать его до реализации индекса.
8. Не использовать дефолтные секреты в production; валидировать env на старте.

## P1: сквозной backend

1. Изменить схему: canonical `Entity` + `InvestigationEntity`; сущность не должна "переезжать" между кейсами при upsert.
2. Реализовать endpoints и payload из API-контракта.
3. Нормализация и строгая валидация по типу: IP, домен/IDN, email, URL, hash, wallet и др.
4. Enrichment jobs: idempotency, cache TTL, статус, безопасный параллелизм, retry policy, логирование исхода каждого провайдера.
5. Результаты: provenance, `sourceUrl`, `observedAt`, confidence; дедупликация findings и relations.
6. Реальные API/integration tests: RBAC, изоляция кейсов, WS permissions, enrichment flow, provider errors/rate limits.

## Providers: после P1

Добавлять только публичные/разрешённые источники и соблюдать terms/rate limits. Приоритет: RDAP, crt.sh, urlscan.io, URLhaus, MalwareBazaar, AlienVault OTX, Abuse.ch, ASN/BGP. API key хранится только на backend.

## File Intelligence: после P1

Нужен изолированный pipeline для metadata/hashes фото, PDF и Office-документов. Полная спецификация, модель, API, WebSocket и security requirements: `coordination/FILE_INTELLIGENCE.md`.

## Вне scope

- Слитые credential dumps, data brokers, деанонимизирующие боты, обход платных/закрытых API.
- AI-выводы без источников: любые summary должны отделять факт от inference и ссылаться на evidence.

## Definition of done P1

- Новый пользователь с ролью ANALYST создаёт кейс и сущность.
- Запускает enrichment и получает авторизованные live updates.
- Может открыть dossier с провайдерными результатами, findings и relations.
- Другой ANALYST не видит ни кейс, ни сущность в его контексте, ни WS events.
- `pnpm install --frozen-lockfile && pnpm api:generate && pnpm typecheck && pnpm lint && pnpm build` проходят; Docker development stack запускается.
