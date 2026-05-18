# Backend overview

Статус: рабочий архитектурный черновик.  
Источник: `docs/product/adaptive_translation_memory_spec.md` и `docs/research/translation_backend_oss_research.md`.

## 1. Цель backend

Backend ПРАНТЕ должен обслуживать Telegram MVP и будущий web UI. Главная задача — не просто вызвать LLM, а провести переводческий pipeline:

```text
input → parsing → analysis → glossary/TM retrieval → draft → QA → user edits → memory update
```

## 2. Модульная схема

```text
prante_backend/
  api/
    telegram_webhook.py
    web_api.py
  core/
    document_parser.py
    language_detect.py
    segmentation.py
    repeats.py
    glossary.py
    term_extraction.py
    translation_memory.py
    edit_diff.py
    rules.py
    readability.py
    qa.py
    translation.py
    prompt_assembly.py
    reports.py
  storage/
    models.py
    repositories.py
  providers/
    llm_provider.py
    argos_provider.py
    ctranslate2_provider.py
  workers/
    analysis_jobs.py
    report_jobs.py
```

## 3. Сервисные зоны

### Telegram ingress

- принимает сообщения, документы и callbacks;
- скачивает файлы через Telegram Bot API;
- создает `analysis_run`;
- отправляет краткие результаты и файлы отчетов.

### Analysis core

Детерминированные компоненты:

- language detection;
- segmentation;
- repeated sentence/ngram detection;
- glossary exact/fuzzy matching;
- term candidate extraction;
- readability metrics;
- QA checks.

### Memory core

Компоненты:

- translation memory units;
- glossary terms;
- project/client/genre rules;
- post-editing patterns;
- candidate approval queue.

### LLM layer

Используется только через provider interface:

- draft translation;
- style critique;
- candidate rule wording;
- explanation generation.

LLM не должен напрямую писать в active memory без approval.

## 4. Tool contract

Каждый tool возвращает JSON с версией, настройками и evidence.

```json
{
  "tool": "match_glossary",
  "version": "0.1.0",
  "input_hash": "sha256:...",
  "settings": {"case_sensitive": false},
  "result": {
    "matches": []
  }
}
```

## 5. Event contract

Для Telegram и web UI backend должен уметь эмитить события:

```json
{"type": "document.parsed", "document_id": "doc_123"}
{"type": "analysis.repeats.completed", "count": 12}
{"type": "glossary.matches.completed", "count": 8}
{"type": "translation.draft.completed", "segments": 42}
{"type": "memory.candidates.created", "terms": 4, "rules": 2}
```

Не парсить свободный текст агента. UI должен строиться на структурированных событиях.

## 6. MVP implementation order

1. Telegram ingress.
2. Text-only parser.
3. Segmentation + repeats.
4. Glossary CRUD.
5. Glossary matching.
6. Term candidates.
7. Report export.
8. Draft translation provider.
9. Draft/final diff.
10. Memory approval loop.
