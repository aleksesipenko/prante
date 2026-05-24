# PRANTE / ПРАНТЕ — внутренняя документация

Статус: командный SSOT для чистого репозитория.
Назначение: быстро показать, где лежат продуктовые, технические и MVP-материалы проекта.

## 1. Что такое ПРАНТЕ

**ПРАНТЕ** — Telegram-first ассистент для письменного переводчика. Он автоматизирует предпереводческий анализ текста и постепенно формирует переводческий профиль пользователя: глоссарий, правила проекта/жанра/клиента и стилевые предпочтения.

Короткая формулировка:

> ПРАНТЕ помогает переводчику быстрее подготовиться к переводу, контролировать терминологию и снижать количество повторяющихся правок за счёт адаптивной памяти.

## 2. Основные файлы репозитория

### MVP / прототип

- `docs/prototypes/final-mvp/index.html` — главный bot-first HTML-прототип.
- `docs/prototypes/final-mvp/content/prante-content.json` — видимые тексты прототипа.
- `docs/prototypes/final-mvp/BOT_FLOW_CONTRACT.md` — будущие callback/action состояния Telegram-бота.
- `docs/prototypes/final-mvp/TEAM_GUIDE.md` — короткий гайд для команды.
- `docs/prototypes/project-2-task-3-mvp-spec.md` — постановка задачи на MVP-прототип.

### Продукт и архитектура

- `docs/product/product-brief.md` — краткое описание продукта, аудитории и отличия от CAT-инструментов.
- `docs/product/adaptive_translation_memory_spec.md` — спецификация адаптивной памяти, глоссария и подтверждения правил пользователем.
- `docs/architecture/backend_overview.md` — модульная схема backend.
- `docs/architecture/data_model.md` — черновая схема данных MVP.
- `docs/architecture/api_contract.md` — черновой API/event contract.
- `docs/DEV_LINKS.md` — индекс внешней документации для разработки.

### Research / задание

- `docs/research/Ресерч_проекта_PRANTE.md` — основной исследовательский документ.
- `docs/research/Проект_1_таблица_Alsu_SSOT.md` — canonical SSOT по Проекту 1.
- `docs/research/translation_backend_oss_research.md` — research backend/NLP/translation компонентов.
- `docs/research/team_collaboration_workflow_research.md` — research по командному workflow.
- `docs/templates/Анализ_аудитории_рынка_и_гипотезы.md` — исходный шаблон/материал задания.
- `TEAM.md` — состав команды и роли.

## 3. Что считать источником истины

### Для продуктового описания

- `docs/product/product-brief.md`
- `docs/product/adaptive_translation_memory_spec.md`

### Для MVP-прототипа

- `docs/prototypes/final-mvp/index.html`
- `docs/prototypes/final-mvp/content/prante-content.json`
- `docs/prototypes/final-mvp/BOT_FLOW_CONTRACT.md`

### Для задания / Project 1

- `docs/research/Проект_1_таблица_Alsu_SSOT.md`
- `docs/research/Ресерч_проекта_PRANTE.md`

Если старые локальные выгрузки или raw-файлы расходятся с этими документами, главным считается curated markdown/SSOT в репозитории.

## 4. Архитектурный принцип

Не строить ядро продукта как полностью автономного агента.

Правильная схема:

```text
Детерминированные tools + управляемая LLM + память с подтверждением пользователя
```

Детерминированно:

- повторы;
- поиск терминов;
- fuzzy matching;
- сравнение версий;
- подсчёт метрик;
- проверка чисел, дат, именованных сущностей;
- хранение глоссария и правил.

LLM используется для:

- чернового перевода;
- объяснения правок;
- предложения формулировки правила;
- стилистической диагностики;
- ранжирования терминов-кандидатов.

Пользователь подтверждает:

- добавление термина;
- запрет варианта;
- правило проекта/жанра;
- переводческую память;
- применение правила глобально.

## 5. Backend stack — текущая рекомендация

### MVP backend

- Python.
- FastAPI для API.
- aiogram для Telegram bot.
- SQLite на раннем этапе, Postgres при командной работе/деплое.
- RapidFuzz для fuzzy matching.
- pyahocorasick или FlashText для glossary exact matching.
- spaCy/Stanza для сегментации и NLP.
- YAKE/PyTextRank для терминов-кандидатов.
- textstat + собственные метрики для читабельности.
- LLM provider abstraction для чернового перевода.

### После MVP

- Qdrant для semantic translation memory.
- COMET/sacreBLEU для offline evaluation.
- Vercel AI SDK / assistant-ui для web UI.
- CopilotKit + AG-UI, если нужен богатый agent UI с событиями tools/state.

## 6. Что не коммитить

Оставлять локально и не класть в публичный/командный GitHub:

- Telethon-сессии и скрипты локального чтения чатов;
- Telegram exports/digests/raw media;
- временные archive/source folders;
- screenshots/verification output;
- zip/mp4/docx/xlsx/pdf/rtf выгрузки;
- любые `.env`, токены, базы, SQLite/session файлы и логи.

Эти контуры могут жить в локальной рабочей папке, но репозиторий и zip для команды должны содержать только curated MVP + главную документацию.
