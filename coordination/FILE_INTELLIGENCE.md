# File Intelligence: метаданные, медиа и документы

## Цель

Превратить вложения расследования в проверяемые артефакты: безопасно принять файл, вычислить хеши, извлечь метаданные, показать их аналитически и сохранить provenance.

Работа только с файлами, на обработку которых у пользователя есть законное право. Сервис не должен выполнять вложенные файлы, активный контент, макросы или внешние URL.

## Типы первой версии

| Формат | Извлекаем |
|---|---|
| JPEG, PNG, WebP, HEIC, TIFF | EXIF, XMP, IPTC: дата/время, камера, software, orientation, GPS, author/copyright, thumbnail, image dimensions |
| PDF | document info/XMP: author, creator, producer, created/modified, page count, embedded files, JavaScript/actions indicator |
| DOCX, XLSX, PPTX | OOXML core/app properties: author, company, created/modified, application, revision, template; список embedded objects/macros indicator |
| MP3, WAV, MP4, MOV | container/audio/video metadata: duration, codec, dimensions, created date, GPS если есть |
| Любой файл | SHA-256, SHA-1, MD5, MIME type, размер, magic bytes, filename, upload time |

## Backend: задача Claude

### Pipeline

1. Upload создаёт `Evidence` с состоянием `UPLOADED`; файл помещается в изолированное object storage/локальное хранилище вне public path.
2. Worker получает job `file.analyze` и определяет реальный MIME по magic bytes, не по расширению.
3. В sandbox/container с лимитами CPU/RAM/time извлекаются metadata и hashes. Никакого запуска документа, рендера активного контента или исходящих запросов.
4. Результат сохраняется как нормализованный `FileAnalysis`, а исходный extractor output — как ограниченный raw payload.
5. Из metadata создаются только проверяемые relations/findings: например `captured_at`, `geolocated_at`, `created_by_software`; confidence и source=`file_metadata` обязательны.
6. Клиент получает authorizованный progress/result через WebSocket, только для своего case.

### Предлагаемые модели

```prisma
model FileAnalysis {
  id           String   @id @default(uuid())
  evidenceId   String   @unique
  evidence     Evidence @relation(fields: [evidenceId], references: [id], onDelete: Cascade)
  status       String   // QUEUED | RUNNING | COMPLETED | FAILED | UNSUPPORTED
  detectedMime String?
  sha256       String?
  sha1         String?
  md5          String?
  metadata     Json?
  warnings     Json?
  analyzedAt   DateTime?
  createdAt    DateTime @default(now())
}
```

### API/WS

| Метод/Event | Назначение |
|---|---|
| `POST /investigations/:id/evidence/files` | multipart upload; возвращает evidence/job ID |
| `GET /evidence/:id` | метаданные, хеши, warnings, доступный preview |
| `POST /evidence/:id/analyze` | повторный анализ при необходимости |
| `file.analysis.progress` | `{ evidenceId, stage, progress }` |
| `file.analysis.completed` | `{ evidenceId, analysisId, status, warningCount }` |

### Защита

- Allowlist типов и размера; MIME сверяется с magic bytes.
- Antivirus/malware scan отдельным статусом; файл не считается безопасным из-за успешного metadata parse.
- Strip/escape всех отображаемых строк metadata; не вставлять HTML/XMP как markup.
- Signed short-lived download URLs, case-level authorization, audit log upload/download/analyze.
- Нельзя публично раздавать original files, EXIF GPS или raw payload без проверки доступа.

## Frontend: задача Codex

### Evidence upload

- Drag-and-drop, file picker и paste из clipboard.
- До отправки: имя, размер, поддерживаемость, предупреждение о чувствительных данных и выбор кейса.
- После отправки: статус `uploading → queued → extracting → completed/failed`; пользователь не теряет страницу при ожидании.

### File dossier

- Summary: preview, detected type, размеры, created/modified, SHA-256 и кнопка copy.
- Metadata: сгруппировано по Capture, Device, Location, Document, Software, Integrity; отсутствующие поля не рисуются пустыми.
- Warnings: embedded JavaScript, macros, mismatched MIME/extension, future timestamp, location precision, parsing error.
- Raw view доступен только по явному действию и легко копируется для forensic workflow.

### Фото и геоданные

- EXIF GPS отображается на карте только если оно есть и пользователь имеет доступ к evidence.
- Показываем точность, altitude, capture timestamp и timezone ambiguity.
- Кнопки: создать LOCATION entity, добавить в graph, убрать GPS из экспортируемого отчёта.
- По умолчанию не делаем обратный geocoding через сторонний сервис — это утечка чувствительных координат; только opt-in backend proxy с понятным источником.

### UX качества данных

- Разделяем `extracted` (получено из файла) и `inferred` (вывод системы).
- Каждое поле показывает источник: EXIF/XMP/IPTC/PDF/OOXML/container.
- «Метаданные отсутствуют» — нормальный результат, не ошибка и не доказательство очистки файла.

## Будущие расширения (после безопасной MVP)

- OCR для изображений/PDF с локальным или безопасным обработчиком.
- Perceptual hashes (pHash/dHash) для поиска почти одинаковых изображений внутри разрешённого набора evidence.
- YARA/ClamAV в изолированном worker и IOC extraction из документов.
- Thumbnail/contact sheet, PDF rendering и comparison двух изображений.
- STIX/CSV/PDF экспорт с выбором, включать ли GPS и персональные метаданные.

## Definition of done MVP

Пользователь загружает JPEG или PDF в разрешённый кейс, получает SHA-256 и безопасно отображённые метаданные; для JPEG с EXIF GPS видит координаты/карту и может связать их с кейсом. Другой пользователь без доступа не может получить файл, metadata, job status или WebSocket event.
