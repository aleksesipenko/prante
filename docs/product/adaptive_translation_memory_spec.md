# ПРАНТЕ: адаптивная переводческая память, стиль и правила проекта

Дата: 2026-05-18  
Статус: технический research + продуктовая спецификация для MVP/после-MVP.

## 1. Идея функции в продуктовых терминах

ПРАНТЕ должен быть не просто Telegram-ботом для разового предпереводческого анализа. Более сильная версия продукта — это **персональный переводческий ассистент, который учится на работе конкретного переводчика**.

Пользователь загружает исходный текст, получает черновой перевод, редактирует его и/или получает финальную одобренную версию от заказчика. ПРАНТЕ сравнивает:

- исходный текст;
- машинный/LLM-черновик;
- финальную версию переводчика;
- финальную версию, одобренную заказчиком;
- глоссарий проекта;
- правила перевода для проекта, жанра, клиента или типа текста.

На основе этого система обновляет переводческую память, запоминает устойчивые терминологические решения, извлекает стилевые предпочтения и формирует правила, которые затем используются в следующих переводах.

Ключевая ценность: чем больше пользователь работает через ПРАНТЕ, тем меньше повторяющейся правки ему приходится делать руками.

---

## 2. Что именно система должна “учить”

Важно не обещать “обучение модели” в смысле fine-tuning на каждом тексте. Для MVP и ближайшей версии правильнее говорить про **адаптивную память и rules layer**.

### 2.1 Терминология

Система должна находить и сохранять:

- source term;
- preferred target term;
- forbidden/нежелательные варианты;
- контекст употребления;
- проект/клиент/жанр;
- степень уверенности;
- статус: предложено, принято переводчиком, одобрено заказчиком, устарело.

Пример:

```json
{
  "source_term": "translation memory",
  "target_term": "переводческая память",
  "forbidden_variants": ["память переводов"],
  "source_lang": "en",
  "target_lang": "ru",
  "domain": "CAT tools",
  "project_id": "prante_research",
  "status": "client_approved",
  "confidence": 0.95
}
```

### 2.2 Стиль речи переводчика

Система должна выделять повторяемые стилевые решения:

- формальность/неформальность;
- предпочтение коротких или длинных предложений;
- сохранение/разбиение структуры исходника;
- перевод пассивных конструкций;
- обращение к читателю: “вы”, “ты”, безлично;
- уровень буквальности;
- типичные замены в финальной редактуре.

Пример правила:

> Для образовательных инструкций переводчик предпочитает ясный нейтральный стиль, прямые глаголы действия и избегает канцелярита.

### 2.3 Правила проекта / клиента / жанра

Система должна поддерживать scoped rules:

- глобальные правила пользователя;
- правила конкретного клиента;
- правила конкретного проекта;
- правила жанра: юридический текст, маркетинг, инструкция, академический текст, UI/UX, субтитры;
- правила языковой пары.

Пример:

```json
{
  "scope": "project",
  "project_id": "client_x_legal_docs",
  "rule_type": "style",
  "rule": "Сохранять юридическую точность, не упрощать термины без необходимости.",
  "evidence": ["segment_alignment_id:123", "segment_alignment_id:124"],
  "status": "active"
}
```

### 2.4 Translation Memory

Система должна хранить пары сегментов:

- source segment;
- draft translation;
- user final translation;
- client approved translation;
- metadata;
- similarity/search embeddings;
- usage count;
- last used date.

Это классическая translation memory, но с дополнительным слоем: “как черновик был исправлен”.

### 2.5 Post-editing patterns

Самая ценная часть: не просто хранить финальный перевод, а понимать **паттерны правок**.

Пример:

- LLM часто переводит “robust” как “робастный”.
- Пользователь систематически меняет на “устойчивый” или “надежный”.
- Для технических текстов проекта X нужно предлагать “устойчивый”.

Система должна фиксировать:

```json
{
  "pattern_type": "term_substitution",
  "source_pattern": "robust",
  "draft_variant": "робастный",
  "approved_variant": "устойчивый",
  "scope": "project:technical_docs",
  "support_count": 7,
  "confidence": 0.88
}
```

---

## 3. Можно ли реализовать это на уже выбранном backend stack?

Коротко: **да, можно**, но нужно разделить идею на уровни сложности.

### Уже выбранный stack покрывает MVP

Из предыдущего research:

- Python backend / FastAPI — подходит.
- aiogram — подходит для Telegram MVP.
- SQLite/Postgres — подходит для глоссария, правил, TM и history.
- RapidFuzz — подходит для fuzzy TM matches и сравнения сегментов.
- pyahocorasick / FlashText — подходит для deterministic glossary matching.
- spaCy/Stanza — подходит для сегментации и NLP-разметки.
- YAKE/PyTextRank — подходит для терминологических кандидатов.
- Qdrant — подходит для semantic memory, если добавляем поиск похожих сегментов.
- LLM provider — подходит для объяснения правок, извлечения правил и draft translation.
- Vercel AI SDK / assistant-ui / AG-UI — подходят для будущего web UI, где показываются tool events и learning events.

### Что нужно добавить к stack

Для полноценной адаптивной памяти нужно добавить:

1. **Segment alignment layer**  
   Сопоставляет source segment ↔ draft translation ↔ final translation ↔ approved translation.

2. **Translation Memory DB**  
   Таблицы для сегментов, переводов, статусов, метаданных, usage count.

3. **Rule extraction pipeline**  
   Анализирует diff между draft и final/approved и предлагает правила.

4. **Human approval loop**  
   Нельзя автоматически превращать каждую правку в правило. Система должна предлагать: “Запомнить это как правило?”

5. **Memory retrieval layer**  
   Перед новым переводом достает релевантные термины, похожие сегменты, правила проекта/жанра.

6. **Prompt assembly layer**  
   Собирает контекст для LLM: glossary constraints + style guide + похожие сегменты + запрещенные варианты.

---

## 4. OSS research: что использовать

### 4.1 Translation Memory / localization tooling

#### Translate Toolkit

- GitHub: https://github.com/translate/translate
- Docs: https://toolkit.translatehouse.org/
- Stars: 951.
- License: GPL-2.0.
- Что умеет: convert, count, manipulate, review, debug texts; format converters; QA; terminology extraction.
- Польза: хороший reference по форматам и localization utilities.
- Ограничение: GPL-2.0 — не стоит тащить в закрытое ядро без license review.
- Вердикт: использовать как исследовательский ориентир/CLI в dev, но не как core dependency MVP.

#### Weblate

- GitHub: https://github.com/WeblateOrg/weblate
- Docs: https://docs.weblate.org/
- Stars: 5881.
- License: GPL-3.0.
- Что умеет: web-based continuous localization, проекты, переводы, роли, интеграция с VCS.
- Польза: сильный reference для терминологии, TM, workflow одобрения.
- Ограничение: огромный продукт, не библиотека; GPL-3.0.
- Вердикт: не встраивать, но подсмотреть data model/workflow.

#### Crowdin TM docs как reference

- Docs: https://support.crowdin.com/translation-memory/
- Полезные концепты:
  - TM stores translation units: source segment ↔ translations.
  - Suggestions can be Perfect / 100% / Fuzzy.
  - Можно сохранять только approved translations.
  - TMX metadata includes usage count / last usage.
- Вердикт: использовать как продуктовый reference для нашей TM-логики.

#### Tolgee glossaries как reference

- Docs: https://docs.tolgee.io/platform/glossaries/managing_glossaries
- Полезные концепты:
  - organization-level glossaries;
  - assigned projects;
  - preferred translations;
  - forbidden terms;
  - usage guidelines.
- Вердикт: использовать как reference для glossary UX/data model.

### 4.2 Bitext / alignment / накопление корпусов

#### Bitextor

- GitHub: https://github.com/bitextor/bitextor
- Docs: https://bitextor.readthedocs.io/en/latest/
- Stars: 299.
- License: GPL-3.0.
- Что умеет: генерирует translation memories из multilingual websites, output TMX/TXT, sentence alignment, deduplication.
- Польза: reference для импорта внешних параллельных данных.
- Ограничение: heavy pipeline, GPL, не нужен для MVP.
- Вердикт: не брать в MVP; полезно позже для batch import/client corpus.

#### awesome-align

- GitHub: https://github.com/neulab/awesome-align
- Stars: 375.
- License: BSD-3-Clause.
- Что умеет: neural word alignment на multilingual BERT.
- Польза: может помогать сопоставлять source terms ↔ target terms внутри aligned segment pairs.
- Ограничение: старее, ML-heavy.
- Вердикт: не в MVP; использовать позже для автоматического извлечения term pairs из approved translations.

### 4.3 Adaptive MT / post-editing

#### ModernMT

- GitHub: https://github.com/modernmt/modernmt
- Stars: 349.
- License: Apache-2.0.
- Описание: neural adaptive MT, adapts to context and learns from corrections.
- Плюсы: прямо похож на идею “учится на исправлениях”.
- Минусы: Java/сложная система, open-source часть старая по pushed_at, production качество может требовать enterprise edition/большие корпуса.
- Вердикт: важный conceptual reference, но не стоит брать как runtime backend для MVP.

#### Automatic Post-Editing concept

- Reference: https://machinetranslate.org/automatic-post-editing
- APE обучается на triplets:
  - source text;
  - machine translation;
  - human post-edited translation.
- Это ровно наша структура данных, но для MVP не нужно обучать APE-модель. Нужно хранить triplets и извлекать rules/patterns.
- Вердикт: использовать концепцию APE как объяснение learning loop.

### 4.4 Memory / retrieval

#### Qdrant

- GitHub: https://github.com/qdrant/qdrant
- Docs: https://qdrant.tech/documentation/
- Stars: 31383.
- License: Apache-2.0.
- Что умеет: vector search, payload filters, hybrid queries, multitenancy.
- Роль в ПРАНТЕ: semantic translation memory.
- Пример запроса: “найди похожие source segments из этого проекта/жанра/клиента”.
- Вердикт: лучший pragmatic vector backend для production-ish версии.

#### LanceDB

- GitHub: https://github.com/lancedb/lancedb
- Stars: 10341.
- License: Apache-2.0.
- Роль: embedded retrieval library.
- Вердикт: хорош для локального/simple режима, но Qdrant лучше как backend-сервис.

#### Mem0

- GitHub: https://github.com/mem0ai/mem0
- Docs: https://docs.mem0.ai/
- Stars: 56044.
- License: Apache-2.0.
- Роль: universal memory layer for AI agents.
- Плюсы: быстро дать agent memory.
- Минусы: переводческая память требует строгой структуры, статусов и evidence; generic memory может начать “обобщать” слишком свободно.
- Вердикт: не как core TM, но можно изучить как optional agent memory layer.

#### Graphiti

- GitHub: https://github.com/getzep/graphiti
- Docs: https://help.getzep.com/graphiti
- Stars: 26192.
- License: Apache-2.0.
- Роль: temporally-aware knowledge graphs for AI agents.
- Возможное применение: связи клиент → проект → жанр → термин → правило → evidence.
- Минусы: может быть overkill для MVP.
- Вердикт: excellent advanced layer после MVP, если правила и память начнут конфликтовать.

---

## 5. Архитектура adaptive memory loop

### 5.1 Основной цикл

```text
1. Source text uploaded
2. Pre-translation analysis
3. Draft translation generated
4. User edits draft
5. Optional: client approves final translation
6. System aligns source/draft/final/approved
7. System computes diffs
8. System extracts candidates:
   - glossary terms
   - forbidden variants
   - style preferences
   - project rules
   - reusable segment pairs
9. User approves/rejects memory updates
10. Approved memory is used in future translation prompts and QA
```

### 5.2 Почему нужен approval loop

Если система будет автоматически запоминать все правки, она быстро загрязнит память:

- пользователь мог править под конкретный заказ;
- заказчик мог ошибиться;
- термин мог быть жанровым, а не глобальным;
- одна правка не равна устойчивому правилу;
- LLM может неверно обобщить pattern.

Поэтому каждое новое правило получает статус:

- `candidate` — найдено системой;
- `user_approved` — подтверждено переводчиком;
- `client_approved` — подтверждено финальной версией заказчика;
- `active` — используется в prompts/QA;
- `deprecated` — устарело;
- `conflict` — конфликтует с другим правилом.

---

## 6. Data model

### 6.1 Projects

```sql
projects(
  id,
  user_id,
  name,
  client_name,
  source_lang,
  target_lang,
  domain,
  genre,
  created_at
)
```

### 6.2 Documents

```sql
documents(
  id,
  project_id,
  user_id,
  title,
  source_text_hash,
  source_lang,
  target_lang,
  document_type,
  created_at
)
```

### 6.3 Segments

```sql
segments(
  id,
  document_id,
  segment_index,
  source_text,
  source_hash,
  char_start,
  char_end
)
```

### 6.4 Translation variants

```sql
translation_variants(
  id,
  segment_id,
  variant_type, -- draft | user_final | client_approved
  text,
  provider,
  model,
  prompt_hash,
  created_at
)
```

### 6.5 Translation memory units

```sql
translation_memory_units(
  id,
  user_id,
  project_id,
  source_lang,
  target_lang,
  source_text,
  target_text,
  status, -- candidate | user_approved | client_approved | deprecated
  match_scope, -- global | client | project | genre
  usage_count,
  last_used_at,
  created_at
)
```

### 6.6 Glossary terms

```sql
glossary_terms(
  id,
  user_id,
  project_id,
  source_lang,
  target_lang,
  source_term,
  preferred_target,
  forbidden_variants_json,
  notes,
  status,
  confidence,
  evidence_json,
  created_at,
  updated_at
)
```

### 6.7 Translation rules

```sql
translation_rules(
  id,
  user_id,
  scope_type, -- global | client | project | genre | language_pair
  scope_id,
  rule_type, -- terminology | style | formatting | qa | prompt
  rule_text,
  machine_readable_json,
  status,
  confidence,
  evidence_json,
  created_at,
  updated_at
)
```

### 6.8 Post-edit patterns

```sql
post_edit_patterns(
  id,
  user_id,
  project_id,
  pattern_type, -- term_substitution | style_rewrite | punctuation | syntax | formatting
  source_pattern,
  draft_pattern,
  final_pattern,
  support_count,
  confidence,
  status,
  examples_json,
  created_at
)
```

---

## 7. Алгоритмы

### 7.1 Segment alignment

Для MVP:

- сегментировать source на предложения;
- сегментировать draft/final/approved на предложения;
- если количество сегментов совпадает — align by index;
- если не совпадает — использовать RapidFuzz similarity + dynamic programming;
- хранить alignment confidence.

Псевдокод:

```python
def align_segments(source_segments, target_segments):
    if len(source_segments) == len(target_segments):
        return [(s.id, t.id, 1.0) for s, t in zip(source_segments, target_segments)]
    return fuzzy_dp_align(source_segments, target_segments, scorer=rapidfuzz.fuzz.ratio)
```

### 7.2 Draft vs final diff

Для каждого aligned segment:

- token diff;
- phrase diff;
- glossary term diff;
- numbers/entities preservation;
- style metric delta.

Выход:

```json
{
  "segment_id": "seg_123",
  "changed_terms": [
    {"draft": "робастный", "final": "устойчивый", "source": "robust"}
  ],
  "style_changes": ["sentence_shortened", "nominalization_removed"],
  "format_changes": [],
  "confidence": 0.84
}
```

### 7.3 Term learning

Кандидат в glossary term создается, если:

- один и тот же source term встречается N раз;
- draft variant систематически заменяется на final variant;
- пользователь вручную подтвердил термин;
- термин встречается в approved translation.

MVP thresholds:

- one-click user confirmation: сразу `user_approved`;
- auto-candidate: support_count >= 2;
- auto-active: support_count >= 5 + no conflicts + user approves.

### 7.4 Style rule learning

Стилевые правила извлекать осторожно:

- deterministic метрики считают изменения;
- LLM формулирует candidate rule;
- пользователь подтверждает или редактирует;
- правило получает scope.

Пример LLM task:

```text
Given examples of draft→final edits, infer one concise style rule.
Do not invent rules unsupported by examples.
Return JSON: {rule, scope_hint, evidence_ids, confidence}.
```

### 7.5 Rule conflict resolution

Если два правила конфликтуют:

- project rule > client rule > genre rule > global rule;
- client_approved > user_approved > candidate;
- newer active rule can supersede older only after confirmation.

---

## 8. Prompt assembly для нового перевода

Перед генерацией черновика система собирает:

1. project metadata;
2. glossary constraints;
3. forbidden variants;
4. similar TM segments;
5. active style rules;
6. formatting rules;
7. output requirements.

Пример:

```json
{
  "task": "draft_translation",
  "source_lang": "en",
  "target_lang": "ru",
  "genre": "technical_documentation",
  "glossary": [
    {"source": "translation memory", "target": "переводческая память"}
  ],
  "forbidden_terms": [
    {"source": "robust", "forbidden": "робастный", "preferred": "устойчивый"}
  ],
  "style_rules": [
    "Сохранять ясный нейтральный стиль.",
    "Избегать канцелярита и неоправданной номинализации."
  ],
  "similar_examples": [
    {"source": "...", "approved_translation": "..."}
  ]
}
```

---

## 9. API design

### 9.1 Upload source

`POST /documents`

Returns:

```json
{"document_id": "doc_123", "analysis_run_id": "run_123"}
```

### 9.2 Generate draft

`POST /documents/{document_id}/draft`

Body:

```json
{
  "project_id": "project_123",
  "provider": "openai",
  "use_translation_memory": true,
  "use_glossary": true,
  "use_style_rules": true
}
```

### 9.3 Submit user final

`POST /documents/{document_id}/final`

Body:

```json
{
  "translation_text": "...",
  "status": "user_final"
}
```

### 9.4 Submit client approved

`POST /documents/{document_id}/approved`

Body:

```json
{
  "translation_text": "...",
  "status": "client_approved"
}
```

### 9.5 Analyze edits

`POST /documents/{document_id}/learn-from-edits`

Returns candidates:

```json
{
  "glossary_candidates": [],
  "rule_candidates": [],
  "tm_units": [],
  "post_edit_patterns": []
}
```

### 9.6 Approve memory updates

`POST /memory/approve`

Body:

```json
{
  "candidate_ids": ["cand_1", "cand_2"],
  "scope": "project"
}
```

---

## 10. Telegram UX

### 10.1 Основной сценарий

```text
Пользователь: отправляет source text
Бот: “Я нашел 12 повторов, 8 терминов-кандидатов, 3 похожих сегмента из вашей памяти. Сгенерировать черновик?”
Пользователь: нажимает “Черновик”
Бот: отправляет draft + файл
Пользователь: отправляет финальную версию
Бот: “Нашел 6 устойчивых правок. Запомнить?”
```

### 10.2 Inline actions

- `Запомнить термин`
- `Запретить вариант`
- `Сделать правилом проекта`
- `Сделать правилом жанра`
- `Не запоминать`
- `Показать примеры`

### 10.3 Memory update message

```text
Я заметил повторяющуюся правку:

robust → устойчивый
Черновик предлагал: робастный
Финальная версия: устойчивый
Встречалось: 4 раза

Запомнить для проекта “Technical docs”?
[Да] [Только для этого текста] [Нет]
```

---

## 11. Web/agent UI

Для будущего сайта нужен не просто чат, а панель памяти:

- source/draft/final side-by-side;
- highlighted edits;
- glossary candidates;
- rules candidates;
- approval queue;
- project style guide;
- TM suggestions.

### Recommended stack

- Next.js template.
- Vercel AI SDK UI or assistant-ui for chat/streaming.
- CopilotKit + AG-UI if we want rich agent-state events.

### Structured events

```json
{"type": "alignment.completed", "aligned_segments": 42}
{"type": "edit_diff.completed", "changed_segments": 17}
{"type": "memory.candidates.created", "terms": 6, "rules": 3}
{"type": "memory.approval.required", "candidate_id": "cand_1"}
```

Do not parse free-form agent text. Emit events from backend tools.

---

## 12. MVP slicing

### MVP 1: deterministic memory foundation

- Projects.
- Glossary CRUD.
- Source/final segment storage.
- Manual “add to glossary”.
- Exact glossary matching.
- Basic TM fuzzy suggestions with RapidFuzz.

### MVP 2: learn from edits

- Store draft/final pairs.
- Segment alignment.
- Draft→final diff.
- Suggest glossary candidates.
- Approval loop in Telegram.

### MVP 3: style rules

- Extract repeated edit patterns.
- LLM proposes style rules with evidence.
- User approves scoped rules.
- Rules injected into draft prompt.

### MVP 4: semantic memory

- Qdrant collection for approved segments.
- Similar segment retrieval.
- Hybrid filters by user/project/client/genre.
- Prompt assembly with examples.

### MVP 5: advanced evaluation

- COMET/sacreBLEU offline benchmarks.
- A/B compare drafts with and without memory.
- Metrics: edit distance reduction, term consistency, time saved.

---

## 13. Product documentation version of the idea

ПРАНТЕ формирует персональный переводческий профиль пользователя. Система сохраняет не только глоссарий, но и историю переводческих решений: какие термины пользователь выбирает, какие варианты отклоняет, как редактирует машинный черновик, какие правила применяются для разных клиентов, жанров и проектов.

После каждого перевода пользователь может загрузить финальную или одобренную заказчиком версию. ПРАНТЕ сравнивает ее с черновиком, находит устойчивые правки и предлагает обновить память: добавить термин, запретить неудачный вариант, создать правило проекта или сохранить пример в переводческую память. Новые правила не применяются автоматически без подтверждения пользователя, чтобы память не загрязнялась случайными правками.

При следующем переводе ПРАНТЕ использует накопленный профиль: подставляет релевантный глоссарий, находит похожие сегменты из прошлых переводов, учитывает правила конкретного проекта и предупреждает о нарушениях терминологии. За счет этого бот постепенно адаптируется к стилю переводчика и требованиям заказчиков, оставаясь управляемым и проверяемым инструментом, а не непрозрачной “магической” моделью.

---

## 14. Главный технический риск

Главный риск — загрязнение памяти и неверное обобщение. Решение:

- хранить evidence для каждого правила;
- не повышать candidate до active без approval;
- scope everything: project/client/genre/global;
- conflict detection;
- показывать пользователю, почему система предлагает правило;
- deterministic checks before LLM interpretation.

---

## 15. Итог

Идея реализуема на текущем backend stack. Не нужно дообучать модель в реальном времени. Нужно построить translation memory + glossary + rules engine + retrieval + approval loop. LLM используется как исполнитель и аналитик, но источником истины остаются approved translations, глоссарий и правила с evidence.
