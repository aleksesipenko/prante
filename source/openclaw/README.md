# openclaw/ — контур ПРАНТЕ

Полный стек: OpenClaw CLI + workspace + плагин + Telegram gateway +
LLM-провайдер + systemd unit. Эта инструкция описывает развёртывание
**с нуля** на WSL-хосте (Ubuntu 22.04+), где планируется бот
`@prante_bot`.

## TL;DR

```bash
# 1) upstream
npm i -g openclaw@latest

# 2) готовим state + workspace
mkdir -p ~/.openclaw-prante/local-plugins
cp -r source/openclaw/plugins/prante-translator-tools \
      ~/.openclaw-prante/local-plugins/
cp -r source/openclaw/workspace-prante ~/.openclaw/workspace-prante

# 3) наш конфиг (БЕЗ секретов) + секреты отдельно
cp source/openclaw/ops/openclaw.example.json ~/.openclaw-prante/openclaw.json
$EDITOR ~/.openclaw-prante/openclaw.json        # channels.telegram.token + allowFrom

# 4) проверяем
openclaw --profile prante config validate
openclaw --profile prante plugins inspect prante-translator-tools --runtime --json
openclaw --profile prante status
openclaw --profile prante doctor
openclaw --profile prante status --deep
openclaw --profile prante channels status --probe

# 5) gateway как systemd --user unit
mkdir -p ~/.config/systemd/user
cp source/openclaw/ops/systemd/openclaw-gateway-prante.service \
   ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now openclaw-gateway-prante

# 6) первая переводческая сессия
openclaw --profile prante agent --message "Привет, это тест"
```

## Слои

### Workspace: `workspace-prante/`

`AGENTS.md` — client-facing boundary, что ПРАНТЕ показывает пользователю
и что скрывает.
`SOUL.md` — голос, границы, persona.
`USER.md` — профиль переводчика (заполняется при онбординге).
`TOOLS.md` — карта инструментов и CLI поверхности.
`MEMORY.md` — долгосрочная подтверждённая память.
`BOOTSTRAP.md` — онбординг при первом запуске (удаляется после).
`HEARTBEAT.md` — фоновые проверки.
`IDENTITY.md` — кто такая ПРАНТЕ.
`skills/prante-*` — четыре workspace-local skill'а, описывающие, как
ПРАНТЕ оркестрирует плагин-тулы: `translation-pass`, `glossary-memory`,
`qa-review`, `operator-smoke`.

### Plugin: `plugins/prante-translator-tools/`

OpenClaw plugin на TypeScript. Исходники в `src/`, манифест в
`openclaw.plugin.json`, точка входа — `dist/index.js` (собирается
через `npm run build`).

Tools (детерминированные):

| Tool | Назначение |
| --- | --- |
| `prante_analyze_text` | Сегментация, повторы, n-граммы, термины-кандидаты, стиль/читабельность |
| `prante_glossary_lookup` | Поиск по утверждённому глоссарию |
| `prante_memory_lookup` | Fuzzy TM-матчи |
| `prante_save_memory_candidate` | Запись кандидатов, статус `candidate` по умолчанию |
| `prante_compare_translation` | Alignment + diff draft vs final |
| `prante_qa_check` | Терминология, missing/forbidden, segment/length diff |
| `prante_export_translation` | Материализация `.docx`/`.txt` для native attachment rail |

### Config: `ops/openclaw.example.json`

Снимок реального runtime-config **без** секретов:

- `channels.telegram` (token, allowFrom) — пример, заполняется при развёртывании
- `plugins.load.paths` — путь к локальному плагину
- `agents.defaults` — основные лимиты и `tools.profile`

Файл примера преднамеренно не содержит токенов и не публикует их.

### Systemd: `ops/systemd/openclaw-gateway-prante.service`

`systemd --user` unit для gateway. Запускается от пользователя `alex`
после `network-online.target`, рестартуется при падении.

## Принципы

1. **Не патчим upstream OpenClaw.** Все наши изменения — только в
   workspace, plugin и config-примере.
2. **Детерминизм в плагине, NLP в LLM.** Плагин считает; LLM объясняет.
3. **Память только с подтверждения.** Кандидаты пишутся со статусом
   `candidate`; повышение до `active` — только по явной команде.
4. **Telegram UX.** Без markdown-таблиц, без раскрытия инфраструктуры,
   доставка файлов — только через native attachment rail с
   подтверждённым `messageId`.

## Что проверяем после развёртывания

См. [`VERIFICATION.md`](VERIFICATION.md) — там по каждой продуктовой
фиче расписаны: DoD, поверхности тестирования, фактические результаты
end-to-end-прогона (Telegram-логи реальной отправки файлов).
