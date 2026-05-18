# PRANTE: OSS research для переводческого backend

Дата: 2026-05-18  
Цель: найти открытые, встраиваемые и по возможности детерминированные компоненты для backend Telegram-бота ПРАНТЕ: предпереводческий анализ, повторы, глоссарий, терминологические рекомендации, стиль/читабельность, черновой перевод, QA.

## 0. Короткий вердикт

MVP **doable** без тяжелого агентского фреймворка. Правильная архитектура: deterministic pipeline + LLM только там, где нужна семантика/генерация.

Рекомендуемый backend stack для MVP:

- Python backend: FastAPI + Celery/RQ/Arq по необходимости.
- Telegram: **aiogram** для Python-стека, либо **Telegraf** если весь продукт будет на TypeScript/Next.
- Документы/текст: `unstructured`, `pypdfium2`, `python-docx`/`mammoth`, `beautifulsoup4`, `bleach`.
- Язык/сегментация: `lingua-py` + `spaCy`/`Stanza`.
- Повторы: n-граммы + `RapidFuzz` для fuzzy-повторов.
- Глоссарий: `pyahocorasick` или `FlashText` для точного поиска терминов; SQLite/Postgres для хранения.
- Кандидаты терминов: `YAKE` + `PyTextRank`; LLM только как optional reranker/explainer.
- Читабельность: `textstat` + простые deterministic метрики по длине предложений/слов.
- Grammar/style QA: `LanguageTool` через `language_tool_python` — осторожно с GPL и Java dependency.
- Черновой перевод: сначала внешняя LLM/MT API; offline fallback — Argos Translate / CTranslate2 + OPUS-MT.
- MT quality/QA: `sacreBLEU`/chrF для тестовых пар с reference; `COMET` тяжелее, но полезен для evaluation, не обязательно для MVP runtime.
- Agent UI на сайте: Vercel AI SDK UI / assistant-ui для обычного chat UI; CopilotKit + AG-UI если нужен полноценный agent UI с отображением tool calls/state.

Главная продуктовая идея: ПРАНТЕ должен выглядеть не как “еще один чат с LLM”, а как **переводческий конвейер**: загрузка текста → детерминированный отчет → глоссарий → опциональная LLM-генерация → QA.

---

## 1. Компонентная карта backend

### 1.1 Ingestion: входные файлы и очистка текста

Задачи:

- принять текст/файл из Telegram;
- извлечь plain text;
- сохранить исходник;
- убрать опасный HTML/мусор;
- разбить на логические блоки.

Кандидаты:

#### Unstructured

- GitHub: https://github.com/Unstructured-IO/unstructured
- Docs/site: https://www.unstructured.io/ и repo docs
- Stars: 14729 на момент проверки.
- License: Apache-2.0.
- Роль: ETL для документов в структурированные элементы.
- Плюсы: широкий охват сложных документов; сильная база для LLM pipelines.
- Минусы: тяжелее, чем нужно для простого TXT/DOCX/PDF MVP.
- Решение: использовать позже для файлового режима; для MVP можно начать с TXT/DOCX/PDF легкими парсерами.

#### pypdfium2

- GitHub: https://github.com/pypdfium2-team/pypdfium2
- Docs: https://pypdfium2.readthedocs.io/
- Stars: 770.
- Роль: PDF extraction/rendering.
- Плюсы: PDFium backend, кроссплатформенность.
- Минусы: PDF extraction бывает грязным; нужен post-processing.
- Решение: хороший кандидат для PDF intake.

#### Bleach

- GitHub: https://github.com/mozilla/bleach
- Docs: https://bleach.readthedocs.io/en/latest/
- Stars: 2771.
- Роль: sanitize HTML, если принимаем HTML/копипаст из web.
- Решение: полезный security-компонент.

---

### 1.2 Language detection и сегментация

#### lingua-py

- GitHub: https://github.com/pemistahl/lingua-py
- Stars: 1721.
- License: Apache-2.0.
- Роль: language detection, особенно для коротких и mixed-language текстов.
- Почему важно: пользователь может прислать русский/английский/смешанный текст; язык нужен для моделей и правил.
- Решение: брать в MVP.

#### spaCy

- GitHub: https://github.com/explosion/spaCy
- Docs: https://spacy.io/usage/linguistic-features
- Stars: 33585.
- License: MIT.
- Роль: токенизация, sentence segmentation, POS, lemma, NER, noun chunks.
- Плюсы: индустриальный стандарт, быстрый, Python-friendly.
- Минусы: качество зависит от языковых моделей; русский возможен, но не всегда идеален.
- Решение: основной NLP-компонент для английского/части языков; использовать `sentencizer` для deterministic segmentation, если не нужен parser.

#### Stanza

- GitHub: https://github.com/stanfordnlp/stanza
- Docs: https://stanfordnlp.github.io/stanza/
- Stars: 7788.
- Роль: multilingual NLP: tokenization, sentence segmentation, POS, dependency parsing, NER для 70+ языков.
- Плюсы: сильнее для multilingual/academic NLP; PyTorch/GPU.
- Минусы: тяжелее spaCy по runtime.
- Решение: оставить как fallback/advanced режим для языков, где spaCy слабее.

---

### 1.3 Подсчет повторений

Детерминированная реализация без LLM.

Минимальный алгоритм:

1. Нормализовать текст: lowercase, Unicode normalize, убрать пунктуацию по настройке.
2. Разбить на предложения и токены.
3. Посчитать:
   - exact repeated sentences;
   - repeated n-grams: 2–6 слов;
   - repeated phrases above threshold;
   - fuzzy repeated segments через similarity.
4. Выдать отчет: фраза, количество, позиции, пример контекста.

#### RapidFuzz

- GitHub: https://github.com/rapidfuzz/RapidFuzz
- Docs: https://rapidfuzz.github.io/RapidFuzz/
- Stars: 3909.
- License: MIT.
- Роль: fuzzy string matching, similarity между фразами/сегментами.
- Плюсы: C++ optimized, MIT, deterministic, Python fallback.
- Решение: брать в MVP для fuzzy-повторов и поиска похожих терминов.

#### pyahocorasick

- GitHub: https://github.com/WojciechMula/pyahocorasick
- Docs: https://pyahocorasick.readthedocs.io/en/latest/
- Stars: 1101.
- License: BSD-3-Clause.
- Роль: быстрый multi-pattern exact search по словарю/глоссарию.
- Плюсы: линейное время по тексту + matches; можно сериализовать automaton.
- Решение: лучший deterministic search для большого глоссария.

#### FlashText

- GitHub: https://github.com/vi3k6i5/flashtext
- Docs: https://flashtext.readthedocs.io/en/latest/
- Stars: 5711.
- License: MIT.
- Роль: keyword extraction/replacement по заданному списку.
- Плюсы: проще pyahocorasick, хорошо для glossary exact matches.
- Минусы: проект менее свежий по push activity; меньше контроля, чем pyahocorasick.
- Решение: можно взять для MVP ради простоты; для production лучше pyahocorasick.

---

### 1.4 Глоссарий и терминологические рекомендации

Задачи:

- хранить user/team glossary;
- искать термины в исходном тексте;
- подсвечивать missing translations / inconsistent term usage;
- предлагать кандидатов в новые термины.

#### Хранение

MVP:

- SQLite/Postgres таблицы:
  - `users`
  - `glossaries`
  - `terms`
  - `term_variants`
  - `analysis_runs`
  - `matches`

Для команды/продакшена:

- Postgres + indexes по `user_id`, `source_lang`, `target_lang`, normalized term.
- Для fuzzy lookup: pg_trgm extension или RapidFuzz на application layer.

#### Exact term matching

- `pyahocorasick` / `FlashText`.
- Детерминированно, быстро, объяснимо.

#### Fuzzy term matching

- `RapidFuzz`.
- Для опечаток, морфологических вариантов, близких форм.

#### Candidate term extraction

##### YAKE

- GitHub: https://github.com/INESCTEC/yake
- Docs/PyPI: https://pypi.org/project/yake/
- Stars: 1858.
- Роль: single-document unsupervised keyword extraction.
- Плюсы: не требует обучения, deterministic-ish, хорош для коротких документов.
- Минусы: результаты нужно фильтровать; качество зависит от языка.
- Решение: брать в MVP как baseline candidate extractor.

##### PyTextRank

- GitHub: https://github.com/DerwenAI/pytextrank
- Docs: https://derwen.ai/docs/ptr/
- Stars: 2212.
- License: MIT.
- Роль: TextRank phrase extraction поверх spaCy.
- Плюсы: понятный graph-based подход, хорош для keyphrases.
- Минусы: требует spaCy pipeline.
- Решение: использовать вместе с YAKE; объединять и ранжировать кандидатов.

##### pke

- GitHub: https://github.com/boudinfl/pke
- Stars: 1590.
- License: GPL-3.0.
- Роль: keyphrase extraction toolkit.
- Минусы: GPL и push activity старее; для коммерческого/закрытого MVP лучше не тащить.
- Решение: не брать в MVP.

---

### 1.5 Читабельность, стиль и QA

#### textstat

- GitHub: https://github.com/textstat/textstat
- Site/docs: https://textstat.org
- Stars: 1369.
- License: MIT.
- Роль: readability statistics.
- Плюсы: deterministic метрики; быстро показывают “тяжесть” текста.
- Минусы: классические readability формулы не универсальны для русского и переводческой стилистики.
- Решение: брать как один слой, не выдавать как абсолютную оценку качества.

#### LanguageTool через language_tool_python

- GitHub: https://github.com/jxmorris12/language_tool_python
- PyPI: https://pypi.org/project/language-tool-python/
- Stars: 519.
- License: GPL-3.0 wrapper; сам LanguageTool тоже open-source с нюансами лицензии.
- Роль: грамматика, орфография, стиль, rule-based checks.
- Плюсы: не LLM, объяснимые rule IDs, локальный/remote server.
- Минусы: Java dependency; GPL может быть проблемой для закрытого продукта; качество русского/английского разное.
- Решение: использовать в research/MVP осторожно. Для коммерческого варианта отдельно проверить license compatibility.

#### Собственные deterministic метрики стиля

Стоит реализовать самим:

- средняя длина предложения;
- доля очень длинных предложений;
- повторяемость слов;
- терминологическая consistency по glossary;
- сохранение чисел/дат/единиц измерения;
- сохранение именованных сущностей;
- punctuation/quotes sanity checks;
- совпадение структуры абзацев source/translation.

Это полезнее и надежнее, чем просить LLM “оцени стиль” без критериев.

---

### 1.6 Черновой перевод

Для MVP есть два пути.

#### Путь A: LLM/MT API как основной переводчик

- Быстрее для MVP.
- Можно строго подмешивать glossary constraints.
- Нужно логировать prompt/settings/model и отделить “генерацию” от deterministic анализа.

Рекомендация: в backend держать интерфейс `TranslatorProvider`, чтобы потом заменить поставщика.

#### Путь B: offline OSS перевод

##### Argos Translate

- GitHub: https://github.com/argosopentech/argos-translate
- Docs: https://argos-translate.readthedocs.io/
- Stars: 6044.
- License: MIT.
- Роль: offline translation library in Python.
- Основан на OpenNMT, SentencePiece, Stanza.
- Плюсы: простой offline fallback, Python API/CLI/GUI, packages `.argosmodel`.
- Минусы: качество ниже лучших LLM/DeepL; модели надо ставить по языковым парам.
- Решение: хороший offline fallback/демо, не основной quality path.

##### CTranslate2 + OPUS-MT

- CTranslate2 GitHub: https://github.com/OpenNMT/CTranslate2
- Docs: https://opennmt.net/CTranslate2/
- Stars: 4491.
- License: MIT.
- OPUS-MT GitHub: https://github.com/Helsinki-NLP/Opus-MT
- Роль: fast inference engine для Transformer models; OPUS-MT как набор открытых NMT-моделей.
- Плюсы: быстрее/контролируемее, можно quantize, CPU/GPU.
- Минусы: сложнее интеграции, нужно конвертировать/подбирать модели.
- Решение: advanced offline backend после MVP; не начинать с него, если цель — быстро показать продукт.

---

### 1.7 Evaluation и контроль качества перевода

#### sacreBLEU

- GitHub: https://github.com/mjpost/sacrebleu
- Роль: reproducible BLEU, chrF, TER.
- Применение: offline evaluation на тестовых наборах, если есть reference translation.
- Не годится как runtime quality score без reference.

#### COMET

- GitHub: https://github.com/Unbabel/COMET
- Docs: https://unbabel.github.io/COMET/html/index.html
- Stars: 751.
- License: Apache-2.0 для framework; model licenses отдельно.
- Роль: neural MT evaluation / quality estimation.
- Плюсы: сильнее BLEU для оценки качества.
- Минусы: тяжелый runtime, модели, GPU/CPU cost, лицензии моделей.
- Решение: не в MVP runtime; использовать для research/eval, если нужно обосновать качество.

---

## 2. Telegram Bot API и bot framework

### Official Telegram docs

- Bot API: https://core.telegram.org/bots/api
- Mini Apps / Web Apps: https://core.telegram.org/bots/webapps
- BotFather: https://core.telegram.org/bots#botfather
- Formatting: https://core.telegram.org/bots/api#formatting-options
- File handling: https://core.telegram.org/bots/api#getfile
- Webhook: https://core.telegram.org/bots/api#setwebhook
- getUpdates: https://core.telegram.org/bots/api#getupdates

Ключевые ограничения/решения:

- Для MVP можно начинать с long polling; для deploy — webhook.
- Файлы Telegram: надо скачивать через `getFile`, учитывать лимиты upload/download.
- Для длинных отчетов: отправлять summary в чат + `.html/.docx/.txt` как document.
- Для форматирования в сообщениях лучше HTML parse_mode, чем MarkdownV2, потому что MarkdownV2 требует агрессивного escaping.

### aiogram

- GitHub: https://github.com/aiogram/aiogram
- Docs: https://docs.aiogram.dev/en/latest/
- Stars: 5706.
- License: MIT.
- Роль: async Python framework для Telegram Bot API.
- Плюсы: asyncio, type hints, Router/Dispatcher, FSM, middleware, Bot API 10.0 support.
- Минусы: нужен опыт asyncio.
- Решение: лучший выбор, если backend на Python.

### python-telegram-bot

- GitHub: https://github.com/python-telegram-bot/python-telegram-bot
- Docs: https://docs.python-telegram-bot.org/en/stable/
- Stars: 29137.
- License: LGPLv3.
- Плюсы: огромная зрелость/adoption.
- Минусы: LGPLv3, Bot API support может отставать от aiogram по live docs.
- Решение: можно, но для нашего Python async backend я бы выбрал aiogram.

### Telegraf

- GitHub: https://github.com/telegraf/telegraf
- Docs: https://telegraf.js.org
- Stars: 9150.
- License: MIT.
- Роль: Node/TypeScript Telegram framework.
- Решение: лучший выбор, если делаем единый TypeScript/Next/Vercel backend.

---

## 3. Vercel AI SDK / Agents SDK / Agent UI

### Vercel AI SDK

- GitHub: https://github.com/vercel/ai
- Docs: https://ai-sdk.dev
- Agents docs: https://ai-sdk.dev/docs/agents
- ToolLoopAgent reference: https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent
- Loop control: https://ai-sdk.dev/docs/agents/loop-control
- AI SDK UI: https://ai-sdk.dev/docs/ai-sdk-ui
- useChat: https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat
- Stars: 24311.
- Роль: TypeScript toolkit для AI apps/agents, streaming, tool calling, structured outputs, UI hooks.

Что важно для ПРАНТЕ:

- `ToolLoopAgent` полезен для сайта/agent UI, но не обязателен для Telegram MVP.
- `stopWhen` и `prepareStep` позволяют контролировать agent loop, ограничивать шаги и активные tools.
- `useChat` дает streaming chat UI и умеет работать с tool calls/results.
- Для детерминированного backend нельзя отдавать весь workflow агенту. Лучше: агент вызывает строго определенные tools (`analyzeRepeats`, `extractTerms`, `matchGlossary`, `draftTranslate`, `runQA`), а не “сам решает что делать”.

### Agent UI SDKs для сайта

#### Vercel AI SDK UI

- Docs: https://ai-sdk.dev/docs/ai-sdk-ui
- useChat: https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat
- Роль: базовый chat UI state/streaming layer.
- Плюсы: естественно ложится на Next.js/Vercel, easy MVP.
- Минусы: сам по себе не дает богатый agent-state UI; нужно самим рисовать tool panels.
- Вердикт: лучший старт, если сайт — обычный чат/кабинет.

#### assistant-ui

- GitHub: https://github.com/assistant-ui/assistant-ui
- Docs: https://www.assistant-ui.com/docs/runtimes/ai-sdk/overview
- Stars: 10113.
- License: MIT.
- Роль: React chat UI для AI apps; интеграция с Vercel AI SDK.
- Возможности из docs: `useChat` flows, custom transports, frontend tools, attachments, multi-step agents, token usage, cloud persistence.
- Вердикт: очень хороший кандидат для быстрого фронтенда агентского интерфейса.

#### CopilotKit + AG-UI

- CopilotKit GitHub: https://github.com/CopilotKit/CopilotKit
- CopilotKit docs: https://docs.copilotkit.ai
- AG-UI GitHub: https://github.com/ag-ui-protocol/ag-ui
- AG-UI docs: https://docs.copilotkit.ai/learn/ag-ui-protocol и https://ag-ui.com
- Stars: CopilotKit 31508, AG-UI 13624.
- Роль: agent-native frontend/generative UI; protocol for agent-user interaction.
- Что важно: AG-UI стандартизирует streaming events, shared state, frontend tool calls, UI components. Это лучше, чем парсить произвольный текст агента.
- Вердикт: если хотим сайт, где видно “агент анализирует текст → вызвал tool → получил повторения → предлагает глоссарий”, то CopilotKit/AG-UI сильнее обычного chat UI.

### Практический вывод по фронтенду

Для MVP Telegram:

- frontend не нужен; нужен clean Telegram flow.

Для сайта на базе шаблона:

- **простая версия**: Next.js + Vercel AI SDK UI + assistant-ui;
- **agent UI версия**: CopilotKit + AG-UI, если хотим отображать tool calls/state не через текст, а событиями;
- backend tools должны отдавать JSON events, например:
  - `analysis.started`
  - `document.parsed`
  - `repeats.completed`
  - `glossary.matches.completed`
  - `terms.suggested`
  - `translation.draft.completed`
  - `qa.completed`

Важно: не “парсить то, что делает агент” из текста. Надежнее заставить backend/agent emit structured events. Если использовать Vercel AI SDK, tool calls/results уже можно отображать через stream protocol/useChat. Если использовать AG-UI — еще лучше для event-based интерфейса.

---

## 4. Предлагаемая архитектура MVP

### 4.1 Telegram MVP flow

1. `/start` — объяснить возможности.
2. Пользователь отправляет текст или файл.
3. Backend создает `analysis_run`.
4. Deterministic pipeline:
   - detect language;
   - parse/clean text;
   - segment sentences;
   - count exact repeats;
   - count n-gram repeats;
   - fuzzy duplicate segments via RapidFuzz;
   - match glossary terms via pyahocorasick;
   - extract candidate terms via YAKE/PyTextRank;
   - compute readability/style metrics.
5. Bot отправляет краткий summary.
6. Bot прикладывает полный отчет `.html`/`.docx`/`.txt`.
7. Inline buttons:
   - `Добавить термины в глоссарий`;
   - `Сгенерировать черновой перевод`;
   - `Проверить перевод`;
   - `Экспорт отчета`.

### 4.2 Backend modules

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
    readability.py
    qa.py
    translation.py
    reports.py
  providers/
    llm_provider.py
    argos_provider.py
    ctranslate2_provider.py
  storage/
    models.py
    repositories.py
```

### 4.3 Deterministic tools contract

Каждый tool должен быть pure-ish и возвращать JSON:

```json
{
  "tool": "extract_repeats",
  "version": "0.1.0",
  "input_hash": "sha256:...",
  "settings": {"ngram_min": 2, "ngram_max": 6, "min_count": 2},
  "result": {
    "exact_sentence_repeats": [],
    "ngram_repeats": [],
    "fuzzy_segments": []
  }
}
```

Так мы получаем воспроизводимость и можем показывать результаты в Telegram и на сайте одинаково.

---

## 5. Что НЕ стоит делать в MVP

- Не строить весь продукт вокруг автономного агента, который сам решает workflow.
- Не использовать LLM для подсчета повторов/поиска glossary matches: это должно быть deterministic.
- Не брать GPL-компоненты в ядро без отдельного license review.
- Не начинать с CTranslate2/OPUS-MT как главного path, если цель — быстро показать value.
- Не парсить “агент подумал/сделал” из текста. Нужны structured tool events.

---

## 6. Рекомендуемый порядок внедрения

### Phase 1 — Telegram deterministic analysis

- aiogram bot.
- text input + `.txt/.docx/.pdf` минимально.
- language detection.
- repeats report.
- glossary CRUD.
- glossary exact matching.
- candidate terms via YAKE.
- HTML/TXT report export.

### Phase 2 — LLM/MT layer

- provider interface.
- draft translation with glossary constraints.
- style/readability critique.
- deterministic QA: numbers/entities/terms preserved.

### Phase 3 — Web frontend / agent UI

- Next.js template.
- Vercel AI SDK UI or assistant-ui.
- Stream tool events.
- Show report as panels: repeats, glossary, terms, QA.
- If нужен richer agent-state: CopilotKit + AG-UI.

### Phase 4 — Evaluation

- sacreBLEU/chrF on prepared test examples.
- COMET optional for research/benchmark.
- User test metrics: time saved, term inconsistency reduction, helpfulness rating.

---

## 7. Ссылки на документацию для разработки

### Telegram

- Telegram Bot API: https://core.telegram.org/bots/api
- Telegram Mini Apps: https://core.telegram.org/bots/webapps
- Bot API changelog: https://telegram.org/bots/api-changelog
- aiogram docs: https://docs.aiogram.dev/en/latest/
- aiogram GitHub: https://github.com/aiogram/aiogram
- python-telegram-bot docs: https://docs.python-telegram-bot.org/en/stable/
- Telegraf docs: https://telegraf.js.org

### Vercel / Agent UI

- Vercel AI SDK: https://ai-sdk.dev
- AI SDK Agents: https://ai-sdk.dev/docs/agents
- ToolLoopAgent: https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent
- Loop Control: https://ai-sdk.dev/docs/agents/loop-control
- AI SDK UI: https://ai-sdk.dev/docs/ai-sdk-ui
- useChat: https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat
- assistant-ui AI SDK runtime: https://www.assistant-ui.com/docs/runtimes/ai-sdk/overview
- assistant-ui GitHub: https://github.com/assistant-ui/assistant-ui
- CopilotKit docs: https://docs.copilotkit.ai
- CopilotKit GitHub: https://github.com/CopilotKit/CopilotKit
- AG-UI docs: https://ag-ui.com
- AG-UI GitHub: https://github.com/ag-ui-protocol/ag-ui

### NLP / glossary / repeats

- RapidFuzz docs: https://rapidfuzz.github.io/RapidFuzz/
- RapidFuzz GitHub: https://github.com/rapidfuzz/RapidFuzz
- pyahocorasick docs: https://pyahocorasick.readthedocs.io/en/latest/
- pyahocorasick GitHub: https://github.com/WojciechMula/pyahocorasick
- FlashText docs: https://flashtext.readthedocs.io/en/latest/
- FlashText GitHub: https://github.com/vi3k6i5/flashtext
- YAKE GitHub: https://github.com/INESCTEC/yake
- PyTextRank docs: https://derwen.ai/docs/ptr/
- spaCy linguistic features: https://spacy.io/usage/linguistic-features
- Stanza docs: https://stanfordnlp.github.io/stanza/
- lingua-py GitHub: https://github.com/pemistahl/lingua-py
- textstat GitHub: https://github.com/textstat/textstat
- language_tool_python PyPI: https://pypi.org/project/language-tool-python/

### Translation / evaluation

- Argos Translate docs: https://argos-translate.readthedocs.io/
- Argos Translate GitHub: https://github.com/argosopentech/argos-translate
- CTranslate2 docs: https://opennmt.net/CTranslate2/
- CTranslate2 GitHub: https://github.com/OpenNMT/CTranslate2
- OPUS-MT GitHub: https://github.com/Helsinki-NLP/Opus-MT
- Translate Toolkit: https://toolkit.translatehouse.org/
- sacreBLEU GitHub: https://github.com/mjpost/sacrebleu
- COMET docs: https://unbabel.github.io/COMET/html/index.html
- COMET GitHub: https://github.com/Unbabel/COMET
