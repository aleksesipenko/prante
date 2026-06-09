---
name: prante-qa-review
description: Формат и дисциплина QA-прохода ПРАНТЕ. Учит модель правильно вызывать prante_qa_check, интерпретировать результаты и выдавать actionable предупреждения, не маскируя деградированные проверки.
version: 0.1.0
owner: prante
scope: workspace
precedence: highest
triggers:
  - "проверь перевод"
  - "QA"
  - "найди ошибки"
  - "сверь терминологию"
  - "qa check"
  - "сравни с исходником"
inputs:
  - sourceText
  - targetText
  - glossary
  - rules
  - sourceLang
  - targetLang
outputs:
  - qa_warnings
  - severity_breakdown
  - degraded_checks
  - next_actions
---

# prante-qa-review

Skills про QA-проход: что вызывать, как читать, как выдавать
предупреждения переводчику. Не реализует алгоритмы — задаёт форму
ответа и дисциплину.

## Когда активировать

Активируется, когда переводчик:

- явно просит «проверь перевод» / «QA» / «найди ошибки»;
- присылает source + target и явно просит сверить;
- заканчивает черновой проход и просит QA перед user_final.

Не активируется, если:

- переводчик не прислал target text (нечего проверять);
- сообщение — operator smoke.

## Что вызывать

`prante_qa_check(sourceText, targetText, glossary, rules, sourceLang,
targetLang)` — основной детерминированный QA-тул.

`prante_glossary_lookup` — повторно, чтобы сверить, что draft
использовал именно preferred-варианты и не заехал в forbidden.

`prante_compare_translation` — если нужно diff с прошлым черновиком
или user_final.

## Категории предупреждений

Каждое предупреждение — отдельный элемент с:

- `category` — `terminology` / `segmentation` / `length` / `style` /
  `formatting` / `completeness` / `forbidden` / `missing` / `tm_drift`;
- `severity` — `blocker` / `major` / `minor` / `info`;
- `location` — сегмент / термин / диапазон;
- `evidence` — что не сошлось;
- `suggested_action` — что можно сделать.

Категории (стабильный словарь, не плодить новые):

- `terminology` — preferred-термин заменён на non-preferred без
  причины;
- `forbidden` — встретился запрещённый вариант;
- `missing` — обязательный термин не переведён / пропущен;
- `segmentation` — количество сегментов target ≠ source;
- `length` — подозрительное отклонение длины (длинный source →
  короткий target без причины);
- `style` — рассогласование со стилем жанра / правилом;
- `formatting` — побились числа, теги, переносы строк, списки;
- `completeness` — target короче source без маркера сокращения;
- `tm_drift` — TM-юнит использовался, но target отклонился без
  причины.

## Формат ответа переводчику

Никаких markdown-таблиц в Telegram. Формат — нумерованный список с
маркерами `поле: значение`. Группировка по severity, сверху — 
`blocker`, потом `major`, потом `minor`, в конце `info`.

Пример:

```
QA — 4 предупреждения

blocker
1. category: forbidden
   location: сегмент 7
   evidence: «утечка памяти» — запрещённый вариант для source
   «memory leak» в этом проекте
   suggested_action: заменить на «переводческая память» согласно
   глоссарю

major
2. category: missing
   location: сегменты 3, 11, 18
   evidence: не переведён термин «translation memory»
   suggested_action: добавить preferred-вариант «переводческая
   память»

minor
3. category: length
   location: сегмент 12
   evidence: target короче source на 38% без маркера сокращения
   suggested_action: проверить, не пропущен ли фрагмент

info
4. category: tm_drift
   location: сегмент 4
   evidence: TM-юнит score 0.92 предлагал иной target, draft
   отклонился
   suggested_action: если есть причина — зафиксировать в правиле
```

## Дисциплина

1. **Не выдумывай предупреждения.** Если `prante_qa_check` не вернул
   `terminology` для сегмента — не пиши «возможны терминологические
   проблемы».
2. **Degraded checks — явно.** Если часть проверок не выполнена
   (`degraded: glossary_empty`, `degraded: tm_unavailable`,
   `degraded: rules_not_loaded`) — отдельный блок «часть проверок
   пропущена» с понятным объяснением, **не** зелёный вердикт.
3. **Severity — от плагина.** Не завышай и не занижай. Если плагин
   вернул `minor`, а тебе кажется «надо бы major» — спроси
   переводчика, не меняй сам.
4. **Без markdown-таблиц.** Telegram плохо рендерит. Маркеры
   `поле: значение` и нумерованные списки.
5. **Source-фрагменты — цитатой, не ссылкой.** Если цитируешь
   сегмент — давай сам текст в кавычках, не «сегмент #N».

## Следующие шаги

После выдачи QA — короткий блок «next actions» (2–4 варианта):

- «исправить blocker'ы и прислать user_final»;
- «сохранить найденный паттерн как правило?» (см. 
  `prante-glossary-memory`);
- «уточнить scope правил проекта»;
- «прогнать `prante_compare_translation` для diff с прошлым
  черновиком».

## Чего НЕ делать

- Не выдавать «QA прошёл», если плагин не вернул зелёный результат
  с `toolEvidence`.
- Не выдавать «возможны проблемы» без конкретного сегмента.
- Не маскировать `degraded` как успех.
- Не сохранять правила автоматически на основе QA-результата.
- Не использовать markdown-таблицы.
- Не раскрывать внутренние пути / provider names.

## Edge cases

- **Target значительно длиннее source** (например, локализация
  кнопок). Это не всегда `blocker`. Отметь как `info` с пометкой
  «возможен рост из-за локализации».
- **Source содержит жаргон / неформат.** QA пропускает стилистику
  варваризмов, если пользователь сам одобрил. Не пиши «нецензурно».
- **Часть проверок пропущена, часть — ок.** Вердикт — 
  «частичный QA», не «ok» и не «fail».
- **Переводчик спорит с предупреждением.** Зафиксируй в
  комментарии, не отменяй плагинный вердикт автоматически. Если
  переводчик настаивает — это кандидат в rule, идём через
  `prante-glossary-memory`.
