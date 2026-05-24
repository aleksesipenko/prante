# PRANTE — future Telegram bot flow contract

This document maps the visual prototype to a future real Telegram bot skeleton. It is intentionally separate from the user-facing interface so the prototype remains clean.

## User-visible action → future callback/action

- `Загрузить документ` → `document_upload`
- `Вставить текст` → `text_input`
- `Открыть глоссарий` → `glossary_open`
- `Показать пример` → `example_show`
- `Принять термины` → `glossary_accept_terms`
- `Показать риски` → `risks_show`
- `Сделать черновик` → `draft_create`
- `Сохранить` → `memory_save_project_rule`
- `Только для этого текста` → `memory_use_once`
- `Не сохранять` → `memory_skip`

## Processing states shown in one edited bot message

The prototype intentionally updates one bot message instead of sending a new message for every internal step. Future backend states can map to the progress rows:

1. `document.parsed` → `Структура документа`
2. `analysis.repeats.completed` → `Повторы`
3. `terms.extracted` → `Термины-кандидаты`
4. `style.review.completed` → `Стиль и читабельность`
5. `draft.prepared` → `Черновик с глоссарием`

## Product rule

The bot never writes active project memory automatically. It only proposes a term/rule and saves it after the translator chooses `Сохранить`.
