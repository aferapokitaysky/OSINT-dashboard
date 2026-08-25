# Frontend — план Codex

## Продуктовая позиция

Интерфейс должен быть инструментом аналитика, а не декоративным «киберпанк»-дашбордом. В каждом экране приоритет: быстро понять ситуацию, увидеть источник каждого факта, принять действие и сохранить результат в кейс.

## Текущее состояние

- `Overview`, `Investigations` и `Intelligence` используют статические demo-данные.
- `Entities`, `Logs`, `Settings` — заглушки.
- Нет auth flow, API client, React Query provider, WebSocket lifecycle, loading/error/empty states.
- Навигация всегда подсвечивает Overview; mobile navigation отсутствует.
- Граф получает demo elements и сейчас ломает production build из-за некорректных Cytoscape style typings.

## P0 — foundation

1. Убрать demo-данные из production view; добавить честные loading, empty и error states.
2. Настроить typed API client, React Query, token refresh, error boundary и единый toast/notification layer.
3. Сделать app shell: активная навигация, mobile sidebar, профиль/выход, accessibility, reduced motion.
4. Сформировать компактную design system: severity, entity kind, provider status, status badge, таблицы, фильтры, drawers, skeletons.
5. Исправить граф и сделать его лениво загружаемым; большие графы не должны тормозить страницу.

## P1 — основной путь аналитика

### 1. Investigation list

- Результаты из API с поиском, фильтрами статуса и pagination.
- Создание нового кейса в modal/drawer.
- Карточка показывает только реальные counts, owner, updatedAt и status.

### 2. Entity Intelligence

- Один search input с auto-detect типа (IP/domain/email/URL/hash/wallet) и ручным выбором.
- Выбор кейса, в который прикрепляется запрос; видимый список доступных провайдеров и их статусы.
- После запуска: job progress, streaming provider cards, ошибки/rate limit не скрываются.

### 3. Entity dossier

- Header: значение, тип, risk score, последний scan, actions.
- Вкладки: Findings, Provider results, Relations, Timeline, Notes/Evidence.
- У каждого finding: severity, confidence, provider, время, ссылка/первичный источник, действие «добавить в кейс/исключить».

## P2 — Investigation workspace

- Режимы `Graph`, `Timeline`, `Findings`, `Evidence` внутри одного кейса.
- Трёхпанельный layout: фильтры → область исследования → detail drawer.
- Граф: фильтры по типам, severity, времени и confidence; focus/expand, shortest path, сохранённый view.
- Findings: triage queue, assignment, resolve/dismiss, сохранённые фильтры.

## UX правила

- Никаких выдуманных метрик или статусов на боевых экранах.
- Ключевые действия клавиатурно доступны; текст минимум 12–14 px; color не единственный носитель severity.
- Анимации отключаются через `prefers-reduced-motion`; custom cursor не используется на touch и не ломает стандартный курсор.
- Сырые provider payloads доступны по требованию, но не перегружают primary view.
- Никакой AI-summary без списка источников и явной маркировки inference.

## Что нужно от backend до начала P1

1. Стабильные endpoints/DTO и WebSocket events из `api-contract.md`.
2. `GET /providers` с enabled/status/supports/rate-limit metadata.
3. Согласованная модель entity ownership — см. `decisions.md`.
4. Явные error codes для validation, forbidden, rate limited, provider unavailable и job failed.
