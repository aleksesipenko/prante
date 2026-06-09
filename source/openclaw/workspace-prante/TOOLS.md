# TOOLS.md — локальная карта инструментов ПРАНТЕ

_ПРАНТЕ работает через runtime OpenClaw, плагин
`prante-translator-tools` и LLM-черновик. Этот файл — твоя шпаргалка:
какие тулы есть, как они называются, что делать, если они падают._

## Plugin: `prante-translator-tools`

Owned deterministic tool surface. Все тулы детерминированные; LLM не
имеет права подменять их результат.

| Tool | Назначение | Когда вызывать |
| --- | --- | --- |
| `prante_analyze_text` | Сегментация, повторы, n-граммы, термины-кандидаты, стиль/читабельность | Первым шагом при разборе нового текста |
| `prante_glossary_lookup` | Поиск по утверждённому глоссарию: preferred / forbidden / unknown | Перед draft и в QA |
| `prante_memory_lookup` | Fuzzy TM-матчи с score и provenance | Перед draft, когда нужен контекст прошлых переводов |
| `prante_save_memory_candidate` | Запись кандидата в глоссарий / TM / rule / post-edit pattern | Только по явной просьбе пользователя; статус по умолчанию `candidate` |
| `prante_compare_translation` | Alignment + diff draft vs final, candidate post-edit patterns | После получения user_final или client_approved |
| `prante_qa_check` | Терминология, missing/forbidden, сегментный/длины diff, actionable warnings | В QA-режиме, после черновика или финала |

### Вызовы и параметры

- Все тулы принимают ISO-совместимые language codes (`en`, `ru`,
  `de`, …) и опциональные `sourceLang` / `targetLang` / `domain` /
  `project` / `maxTerms` / `limit`.
- `prante_save_memory_candidate` **обязательно** принимает
  `approvalStatus` и `scope`. По умолчанию пишем `candidate`.
  Повышение до `user_approved` / `client_approved` / `active` — только
  если переводчик явно попросил запомнить/одобрить.
- Возвраты — структурированный JSON: `ok`, `data`, `warnings`,
  `toolEvidence`. `toolEvidence` используется в финальном ответе, чтобы
  переводчик видел, что детерминированная проверка действительно
  прошла, а не «LLM сказал, что всё ок».

### Degraded modes

- Если `prante_glossary_lookup` вернул `degraded: no_approved_glossary`
  — это нормальный стартовый режим, не ошибка. Говорим: «глоссарий ещё
  пуст, покажу термины-кандидаты; одобри — сохраню».
- Если `prante_memory_lookup` вернул `degraded: tm_unavailable` — не
  делаем вид, что TM-контекст есть. Говорим: «похожих сегментов в
  памяти не нашёл, черновик пойдёт без TM-контекста».
- Если `prante_qa_check` упал — QA-ответ выдаём с явной отметкой «часть
  проверок не выполнена», а не притворяемся зелёным.

## CLI поверхность OpenClaw

Используем только OpenClaw CLI, не прямые скрипты:

```bash
openclaw --profile prante status
openclaw --profile prante doctor
openclaw --profile prante status --deep
openclaw --profile prante health
openclaw --profile prante channels status --probe
openclaw --profile prante config validate
openclaw --profile prante plugins validate <plugin-path>
openclaw --profile prante plugins inspect prante-translator-tools --runtime --json
openclaw --profile prante skills list
openclaw --profile prante skills check --agent main
openclaw --profile prante agent --message "<smoke prompt>"
```

`--profile prante` — обязательно. Профиль `default` — это другой
контур, в нём нет наших плагинов и skills.

## Файловая доставка (file delivery)

- PDF / DOCX / XLSX / JSON-отчёты — **только** через native attachment
  rail текущего runtime, с подтверждением `ok=true` и `messageId` /
  `message_id`.
- `MEDIA:` и абсолютный путь в тексте **не являются** доставкой.
  Если tool-result не подтвердил отправку — честно говорим «создал,
  но доставка не подтверждена», повторяем или создаём ops-alert.

## Workspace-local skills

| Skill | Когда подгружать |
| --- | --- |
| `prante-translation-pass` | Полный сценарий: source → анализ → draft → QA |
| `prante-glossary-memory` | Цикл одобрения терминов / правил / TM-юнитов |
| `prante-qa-review` | Формат выдачи QA-предупреждений |
| `prante-operator-smoke` | Поведение в operator smoke режиме |

## LLM и провайдеры

- LLM используется для draft, объяснений, формулировки кандидатов в
  правила. Не для подсчёта повторов, не для QA-вердикта, не для
  записи в память.
- Provider и модель берутся из OpenClaw профиля, не прописываем
  хардкодом.
- Если LLM-черновик нужен, а провайдер недоступен — честно говорим:
  «черновик сейчас не сгенерирую, могу сделать детерминированный
  разбор и прислать позже».

## Что НЕ делаем

- Не вызываем прямые HTTP/RPC к provider API в обход OpenClaw gateway.
- Не сохраняем provider keys и Telegram token в workspace.
- Не патчим `node_modules/openclaw` или `/usr/local/lib/node_modules/openclaw`.
- Не выкатываем изменения в `prante-translator-tools` без
  `plugins validate` и unit-тестов.

## Локальные пути (для оператора, не для клиента)

- Workspace: `~/.openclaw/workspace-prante/`
- State профиля: `~/.openclaw-prante/`
- SQLite glossary/TM: внутри `~/.openclaw-prante/state/` (создаётся
  плагином).
- Локальные сессии Telethon / verification-артефакты — в `.gitignore`,
  в git не попадают.

---

Этот файл — твоя шпаргалка. Когда узнаёшь полезный нюанс про tool —
допиши. Когда учишься, что тулы X и Y конфликтуют — зафиксируй.
