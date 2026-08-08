# OSINT Platform

Modular OSINT investigation platform — entity search across free/public-source providers, an investigation workspace, graph relations, and audit logging.

**[🇬🇧 English](#english) · [🇷🇺 Русский](#русский)**

---

<a id="english"></a>
## 🇬🇧 English

> [!IMPORTANT]
> **Scope: public/free sources only.** No integrations with stolen credential dumps, leaked-data resellers, or anonymous lookup bots. Telegram = public channels only.

### Stack

| Layer | Tech |
|---|---|
| Web | Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui · React Query · Cytoscape · Recharts |
| API | NestJS · TypeScript · Prisma · Zod · Pino · Swagger · Passport JWT · Socket.IO · BullMQ |
| Data | PostgreSQL 16 · Redis 7 · OpenSearch 2 |
| Infra | Docker Compose · nginx · GitHub Actions |

### Layout

```
osint/
├── apps/
│   ├── api/          # NestJS API + Prisma + providers + queues
│   └── web/          # Next.js 14 dashboard
├── packages/
│   ├── types/        # Shared TS types between web & api
│   └── plugin-sdk/   # BaseProvider, retry, rate-limit, circuit-breaker
├── nginx/            # Reverse proxy config
├── docker-compose.yml
└── .env.example
```

### Quickstart (local dev)

Requires: Node ≥ 20.11, pnpm ≥ 9, Docker.

```bash
# 1. Install deps
pnpm install

# 2. Provision env
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL to localhost, add real JWT secrets:
# JWT_ACCESS_SECRET=$(openssl rand -base64 48)
# JWT_REFRESH_SECRET=$(openssl rand -base64 48)

# 3. Bring up data services
docker compose up -d postgres redis opensearch

# 4. Apply schema
pnpm api:generate
pnpm api:migrate

# 5. Run apps
pnpm dev
# api:  http://localhost:4000
# web:  http://localhost:3000
# docs: http://localhost:4000/docs
```

### Full stack via Docker

```bash
cp .env.example .env
docker compose up -d --build
# nginx fronts everything on http://localhost:8080
```

### Provider API keys

All providers are free-tier. Leave the key blank in `.env` to disable a provider.

| Provider | Env var | Free tier | Sign up |
|---|---|---|---|
| Shodan | `SHODAN_API_KEY` | 100/mo (member) | shodan.io |
| VirusTotal | `VIRUSTOTAL_API_KEY` | 500/day | virustotal.com |
| AbuseIPDB | `ABUSEIPDB_API_KEY` | 1000/day | abuseipdb.com |
| HaveIBeenPwned | `HIBP_API_KEY` | $3.50/mo for arbitrary email lookup; free for own email + breach catalog | haveibeenpwned.com |
| WHOIS | — | unlimited (RDAP) | — |
| DNS lookup | — | unlimited (A/AAAA/MX/TXT/NS resolution) | — |

`.env.example` also reserves keys for a few additional providers (`HUNTER_API_KEY`, `INTELX_API_KEY`, `URLSCAN_API_KEY`, `SECURITYTRAILS_API_KEY`, `GREYNOISE_API_KEY`) — these are placeholders for future plugin-sdk integrations and aren't wired to a provider yet.

### Architecture notes

- **Plugin SDK** — every provider implements `BaseProvider`. Built-in retry with exponential backoff, per-provider token-bucket rate limit, and circuit breaker. Adding a provider = drop a file in `apps/api/src/modules/providers/integrations/` and register it in `provider.registry.ts`.
- **Enrichment pipeline** — `EntityEnrichmentRequested` → BullMQ job fans out to all matching providers in parallel → `ProviderResult` rows persisted, with `Finding` and `EntityRelation` records derived from each provider's risk signals → WS push to subscribed clients via the events gateway.
- **RBAC** — three roles (`ADMIN`, `ANALYST`, `VIEWER`) enforced via `@Roles()` decorator + `RolesGuard`. Per-resource ownership (e.g. investigation `ownerId`) checked in services.
- **Audit log** — the `ActivityLog` model records actor, action, target, and metadata for state-changing requests; currently wired for enrichment requests, with broader controller/service coverage planned.
- **2FA** — TOTP verification is enforced at login when enabled on a user record (`auth.service.ts`); a self-serve enroll/QR flow and backup codes are a phase-2 item.
- **Watchlists & alerts** — `Watchlist` and `Alert` are modeled in the Prisma schema and surfaced in the dashboard UI, but the matching engine that turns findings into alerts isn't wired yet (see Phase 2).

### Phase 2 (not in foundation)

Watchlist/alert matching engine, OpenSearch-backed full-text search indexing, file analysis (EXIF/YARA/IOC), MITRE ATT&CK mapping, IOC feed correlation, CLI tool, webhooks, OCR/screenshot service, AI summarization, full Prometheus/Grafana stack, TOTP enrollment UI + backup codes.

### Security

- Helmet, CORS allowlist.
- bcrypt for password hashing (12 rounds default).
- JWT access (15 min) + refresh (30 days, rotated on use), session table for revocation.
- All input validated via Zod DTOs (`ZodValidationPipe`).
- Provider API keys never leave the API server — frontend cannot see them.

---

<a id="русский"></a>
## 🇷🇺 Русский

> [!IMPORTANT]
> **Область применения: только публичные/бесплатные источники.** Никаких интеграций с базами утечек учётных данных, площадками по продаже слитых данных или анонимными lookup-ботами. Telegram — только публичные каналы.

Модульная OSINT-платформа для расследований — поиск сущностей по бесплатным/публичным источникам, рабочее пространство расследования, граф связей и журнал аудита.

### Стек технологий

| Слой | Технологии |
|---|---|
| Web | Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui · React Query · Cytoscape · Recharts |
| API | NestJS · TypeScript · Prisma · Zod · Pino · Swagger · Passport JWT · Socket.IO · BullMQ |
| Данные | PostgreSQL 16 · Redis 7 · OpenSearch 2 |
| Инфраструктура | Docker Compose · nginx · GitHub Actions |

### Структура репозитория

```
osint/
├── apps/
│   ├── api/          # NestJS API + Prisma + провайдеры + очереди
│   └── web/          # Next.js 14 дашборд
├── packages/
│   ├── types/        # Общие TS-типы между web и api
│   └── plugin-sdk/   # BaseProvider, retry, rate-limit, circuit-breaker
├── nginx/            # Конфигурация reverse-proxy
├── docker-compose.yml
└── .env.example
```

### Быстрый старт (локальная разработка)

Требуется: Node ≥ 20.11, pnpm ≥ 9, Docker.

```bash
# 1. Установка зависимостей
pnpm install

# 2. Настройка окружения
cp .env.example .env
# Отредактируйте .env — как минимум укажите DATABASE_URL для localhost и реальные JWT-секреты:
# JWT_ACCESS_SECRET=$(openssl rand -base64 48)
# JWT_REFRESH_SECRET=$(openssl rand -base64 48)

# 3. Поднять сервисы данных
docker compose up -d postgres redis opensearch

# 4. Применить схему БД
pnpm api:generate
pnpm api:migrate

# 5. Запустить приложения
pnpm dev
# api:  http://localhost:4000
# web:  http://localhost:3000
# docs: http://localhost:4000/docs
```

### Полный стек через Docker

```bash
cp .env.example .env
docker compose up -d --build
# nginx проксирует всё на http://localhost:8080
```

### API-ключи провайдеров

Все провайдеры — с бесплатным тарифом. Оставьте ключ пустым в `.env`, чтобы отключить провайдера.

| Провайдер | Переменная окружения | Бесплатный тариф | Регистрация |
|---|---|---|---|
| Shodan | `SHODAN_API_KEY` | 100/мес (member) | shodan.io |
| VirusTotal | `VIRUSTOTAL_API_KEY` | 500/день | virustotal.com |
| AbuseIPDB | `ABUSEIPDB_API_KEY` | 1000/день | abuseipdb.com |
| HaveIBeenPwned | `HIBP_API_KEY` | $3.50/мес за произвольный email-поиск; бесплатно для своего email + каталога утечек | haveibeenpwned.com |
| WHOIS | — | без ограничений (RDAP) | — |
| DNS lookup | — | без ограничений (резолвинг A/AAAA/MX/TXT/NS) | — |

В `.env.example` также зарезервированы ключи для нескольких дополнительных провайдеров (`HUNTER_API_KEY`, `INTELX_API_KEY`, `URLSCAN_API_KEY`, `SECURITYTRAILS_API_KEY`, `GREYNOISE_API_KEY`) — это заготовки под будущие интеграции через plugin-sdk, провайдер под них пока не подключён.

### Заметки об архитектуре

- **Plugin SDK** — каждый провайдер реализует `BaseProvider`. Встроены retry с экспоненциальной задержкой, token-bucket rate limit на провайдера и circuit breaker. Чтобы добавить провайдера, нужно положить файл в `apps/api/src/modules/providers/integrations/` и зарегистрировать его в `provider.registry.ts`.
- **Пайплайн обогащения** — `EntityEnrichmentRequested` → задача BullMQ параллельно опрашивает все подходящие провайдеры → сохраняются записи `ProviderResult`, из риск-сигналов провайдеров формируются записи `Finding` и `EntityRelation` → пуш по WebSocket подписанным клиентам через events gateway.
- **RBAC** — три роли (`ADMIN`, `ANALYST`, `VIEWER`), проверяются декоратором `@Roles()` и `RolesGuard`. Владение конкретным ресурсом (например, `ownerId` расследования) проверяется в сервисах.
- **Журнал аудита** — модель `ActivityLog` фиксирует актора, действие, цель и метаданные для изменяющих состояние запросов; сейчас подключена для запросов на обогащение, более широкое покрытие контроллеров/сервисов запланировано.
- **2FA** — проверка TOTP-кода выполняется при входе, если она включена на аккаунте (`auth.service.ts`); самостоятельный флоу подключения с QR-кодом и резервные коды — задача второй фазы.
- **Списки наблюдения и алерты** — `Watchlist` и `Alert` описаны в Prisma-схеме и отображаются в UI дашборда, но движок сопоставления, превращающий находки в алерты, пока не реализован (см. «Фаза 2»).

### Фаза 2 (вне текущего фундамента)

Движок сопоставления watchlist/алертов, полнотекстовая индексация на базе OpenSearch, анализ файлов (EXIF/YARA/IOC), сопоставление с MITRE ATT&CK, корреляция IOC-фидов, CLI-инструмент, вебхуки, сервис OCR/скриншотов, AI-суммаризация, полноценный стек Prometheus/Grafana, UI для подключения TOTP и резервные коды.

### Безопасность

- Helmet, allowlist для CORS.
- bcrypt для хеширования паролей (12 раундов по умолчанию).
- JWT access-токен (15 мин) + refresh-токен (30 дней, ротация при использовании), таблица сессий для отзыва.
- Все входные данные валидируются через Zod DTO (`ZodValidationPipe`).
- API-ключи провайдеров никогда не покидают API-сервер — фронтенд их не видит.
