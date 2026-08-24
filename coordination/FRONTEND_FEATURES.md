# Frontend feature backlog — Codex

Все функции рассчитаны на законную работу с публичными источниками. Приоритет — доказуемые факты, быстрый triage и удобство аналитика.

## P1 — рабочий OSINT workflow

### 1. Universal Intelligence Search

Одна командная строка для IP, домена, URL, email, hash, username и crypto wallet.

- Автоматически определяет тип и показывает, почему так определила.
- Даёт вручную сменить тип и выбрать расследование.
- Показывает доступные провайдеры, примерную цену/лимит и время последней проверки.
- Поддерживает горячую клавишу `⌘K` / `Ctrl+K`.

**Ценность:** поиск становится началом кейса, а не отдельной страницей без контекста.

### 2. Live enrichment console

Экран исполнения запроса в реальном времени.

- Timeline всех провайдеров: queued → running → completed / not found / rate limited / error.
- Findings появляются сразу по мере готовности, без ожидания всего job.
- Ясные retry/cancel действия и объяснение ошибки.
- Никаких скрытых «успешных» состояний, если часть источников не ответила.

### 3. Entity dossier

Карточка сущности, открываемая из поиска, кейса, графа или алерта.

- Overview: тип, нормализованное значение, risk score, история сканов.
- Findings: severity, confidence, источник, дата, ссылка на первичный материал.
- Provider Results: понятные нормализованные поля; raw JSON только во вкладке Details.
- Relations: связанные IP/домены/компании и причина связи.
- Notes & Evidence: аналитические заметки, теги, ссылки на доказательства.

### 4. Investigation list и создание кейса

- Реальный список вместо demo-карточек: поиск, фильтры, cursor pagination, status.
- Создание кейса через компактный drawer.
- Quick actions: добавить сущность, открыть graph, выгрузить отчёт.
- Состояния «нет кейсов», «нет совпадений», «нет доступа».

## P2 — рабочее пространство расследования

### 5. Case workbench

Один экран расследования с режимами `Overview`, `Graph`, `Timeline`, `Findings`, `Evidence`.

- Слева — сущности, теги и фильтры.
- В центре — выбранный режим исследования.
- Справа — detail drawer без потери текущего контекста.
- Сохранённые views и быстрый возврат к важным узлам.

### 6. Explainable relationship graph

Граф не как декоративная картинка, а как средство навигации по связям.

- Цвет/иконка типа сущности, толщина ребра = confidence.
- Фильтры по типу, source, confidence, severity и времени.
- Expand node, focus neighbourhood, shortest path между двумя узлами.
- Каждое ребро открывает карточку «почему это связано» с источником и датой.
- LOD/кластеризация для больших графов, чтобы интерфейс не зависал.

### 7. Findings triage queue

- Сортировка по severity, confidence, свежести и источнику.
- Статусы `new`, `in review`, `confirmed`, `false positive`, `resolved`.
- Массовые действия, assignment и аналитические комментарии.
- Фильтры можно сохранять как personal/team views.

### 8. Evidence workspace

- Добавление ссылок, заметок, файлов и снимков экрана.
- Показ SHA-256, автора, времени загрузки и связи с finding/entity.
- Простая timeline chain of custody.
- Preview безопасных форматов, download/original-link без потери provenance.

### 8.1 File Intelligence

- Drag-and-drop evidence с live статусом анализа.
- Dossier фото/документа: EXIF/XMP/IPTC/PDF/OOXML metadata, hashes, предупреждения и raw view.
- Карта GPS с уровнем точности и явным разделением extracted/inferred data.
- Полная спецификация: `FILE_INTELLIGENCE.md`.

## P3 — мониторинг и отчётность

### 9. Alert center и watchlists

- Inbox алертов с severity, status, case, assignee.
- Acknowledge / resolve / dismiss с обязательным комментарием для dismissal.
- Переход из алерта к тому finding и провайдерному результату, который его вызвал.
- Настройка watchlist human-readable формой, не JSON-полем.

### 10. Timeline & change intelligence

- Общая временная шкала: enrichment, finding, relation, evidence, действие аналитика.
- Сравнение двух сканов: «что изменилось с прошлого раза».
- Быстрые фильтры за 24 часа / 7 дней / custom range.

### 11. Report builder

- Выбор сущностей, findings, доказательств и графа для включения.
- Предпросмотр перед экспортом.
- Экспорт в PDF, CSV, JSON и STIX — когда backend их подготовит.
- Отчёт всегда содержит источники, время получения и дисклеймер об уровне confidence.

## P4 — скорость и качество аналитики

### 12. Investigator command palette

- Быстрый переход к кейсу/сущности/алерту.
- Команды: создать кейс, добавить IOC, запустить enrichment, открыть граф.
- Недавние действия и keyboard-first workflow.

### 13. Saved searches & shareable views

- Сохраняемые запросы, фильтры и графовые представления.
- Личные либо командные, с корректной проверкой permissions.
- Deep links, которые открывают конкретный контекст в расследовании.

### 14. Data quality & provenance indicators

- Визуальные маркеры: устаревшие данные, provider unavailable, низкий confidence, conflict между источниками.
- На каждом факте: «что известно», «из какого источника», «когда проверено».
- Отдельный UX для отсутствия результатов: `not found` — не то же самое, что `provider failed`.

### 15. Accessibility & operator comfort

- Полная клавиатурная навигация, aria labels и focus states.
- `prefers-reduced-motion`, нормальный системный курсор на touch/keyboard.
- Плотный и комфортный режимы таблиц; responsive mobile read-only mode.

## Нельзя делать в интерфейсе

- Не показывать фейковые метрики и demo-данные как настоящие.
- Не прятать источники или уверенность модели за «risk score».
- Не давать UI для несанкционированного поиска, обхода лимитов или доступа к утечкам.
- Не запускать фоновые действия без отображения их статуса, автора и результата.

## Первые три функции, которые я реализую

1. App shell + typed API client + честные loading/error/empty states.
2. Universal Intelligence Search + Live enrichment console.
3. Entity dossier с findings, provider results и relations.

Они дают полноценный полезный путь даже до графа, алертов и отчётности.
