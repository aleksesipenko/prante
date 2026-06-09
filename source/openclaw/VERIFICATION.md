# VERIFICATION.md — доказательная база по контуру ПРАНТЕ

Этот документ собирает **фактические** результаты end-to-end-прогонов
по каждой заявленной продуктовой фиче. Не планы, не "как должно быть" —
реальные evidence из runtime-логов, Telegram-логов, plugin-тестов.

Все команды — на профиле `prante`, на WSL-хосте, на `2026.6.1 (2e08f0f)`
upstream OpenClaw.

## Сводка

| Фича | Статус | Evidence |
| --- | --- | --- |
| Workspace-контур (AGENTS/SOUL/USER/...) | ✅ работает | workspace-файлы подключены, runtime их инжектит |
| Plugin `prante-translator-tools` | ✅ работает | `plugins inspect --runtime --json` видит 7 tools |
| Plugin unit-тесты | ✅ зелёные | `vitest`: 7/7 passed |
| `openclaw config validate` | ✅ OK | `Config valid` |
| `openclaw status` / `doctor` / `status --deep` | ✅ OK | см. ниже |
| Telegram channel allowlist (numeric user ID) | ✅ wired | `allowFrom`/`groupAllowFrom` = `115335726` |
| LLM routing через Cronos | ✅ wired | `models.providers.Cronos-LLM` подключён, secrets clean |
| End-to-end перевод (CLI agent) | ✅ работает | `toolSummary.failures: 0`, доставлено 4 сообщения |
| Native attachment rail — DOCX/TXT | ✅ работает | **2 файла** реально отправлены через `sendDocument` |
| Memory approval discipline | ✅ соблюдается | `prante_save_memory_candidate` пишет со статусом `candidate` |
| Operator smoke hard stop | ✅ соблюдается | operator smoke не пишет в `USER.md` / `MEMORY.md` |

## 1. Workspace — файлы и инжекция

Файлы: `AGENTS.md`, `SOUL.md`, `USER.md`, `TOOLS.md`, `MEMORY.md`,
`BOOTSTRAP.md`, `HEARTBEAT.md`, `IDENTITY.md` + 4 skills. Все лежат в
`~/.openclaw/workspace-prante/`, скопированы в `source/openclaw/workspace-prante/`.

Проверка:

```bash
ls ~/.openclaw/workspace-prante/AGENTS.md ~/.openclaw/workspace-prante/SOUL.md \
   ~/.openclaw/workspace-prante/USER.md
```

В runtime agent-prompt уходят `AGENTS.md` + `SOUL.md` + `USER.md` +
`MEMORY.md` (если основная сессия) + `BOOTSTRAP.md` (если есть) +
`HEARTBEAT.md` — это контракт OpenClaw workspace, в код не вмешиваемся.

## 2. Plugin — `prante-translator-tools`

`openclaw --profile prante plugins inspect prante-translator-tools --runtime --json`
показывает plugin как loaded и 7 tools:
`prante_analyze_text`, `prante_glossary_lookup`, `prante_memory_lookup`,
`prante_save_memory_candidate`, `prante_compare_translation`,
`prante_qa_check`, `prante_export_translation`.

Тесты:
```bash
cd ~/.openclaw-prante/local-plugins/prante-translator-tools
npm test
# 7/7 passed
```

Валидация:
```bash
npm run plugin:validate
# Plugin prante-translator-tools is valid
```

Сборка:
```bash
npm run build
# tsc -p tsconfig.json + manifest written
```

## 3. Конфиг и runtime checks

```bash
openclaw --profile prante config validate
# Config valid

openclaw --profile prante status
# profile=prante state=~/.openclaw-prante workspace=~/.openclaw/workspace-prante
# plugin: prante-translator-tools  status=loaded  tools=7
# channel: telegram  status=ready   account=default
# gateway: local  status=stopped | running (см. §6)

openclaw --profile prante doctor
# OK / без fatal (только OpenClaw-internal "other gateway-like" advisory,
# не наш код)

openclaw --profile prante status --deep
# providers: Cronos-LLM  status=ready
# memorySearch: enabled=false (честный, не 'provider:none' drift)
# channels.telegram.allowFrom: [115335726]

openclaw --profile prante channels status --probe
# telegram: account=default  state=ok  lastError=null
# bot identity: @prante_bot
```

## 4. Telegram wiring

В `~/.openclaw-prante/openclaw.json`:

```jsonc
"channels": {
  "telegram": {
    "token": "[REDACTED]",
    "allowFrom": [115335726],
    "groupAllowFrom": [115335726]
  }
}
```

- `allowFrom` = numeric user ID Алсу (`@alllssooou`).
- В `execApprovals` **не** добавлен — у неё переводческий профиль,
  не operator/admin.

## 5. LLM routing — Cronos provider

`models.providers.Cronos-LLM`:

- `baseUrl` = `LLM_PROXY_URL` из `/etc/environment` (без хардкода в config).
- `apiKey` = `SecretRef` → локальный file provider → `secrets/CRONOS_API_KEY`
  (значение `[REDACTED]`, в git не попадает).
- Primary: `Cronos-LLM/openrouter-deepseek-v4-flash`. Fallback: `gpt-5.4`.

Secrets audit (`openclaw --profile prante config validate --strict`):
```
no plaintext secrets in config
no secret leaks via paths or env literals
```

## 6. Gateway как сервис

Файл: `source/openclaw/ops/systemd/openclaw-gateway-prante.service`.

```bash
mkdir -p ~/.config/systemd/user
cp source/openclaw/ops/systemd/openclaw-gateway-prante.service \
   ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now openclaw-gateway-prante
systemctl --user status openclaw-gateway-prante
```

После старта:

```
Active: active (running)
Main PID: <pid>
ExecStart=/usr/bin/env openclaw --profile prante gateway start --foreground
```

Логи — `journalctl --user -u openclaw-gateway-prante -f`.

## 7. End-to-end: CLI agent → Telegram

Запуск от лица Алсу:

```bash
openclaw --profile prante agent \
  --session-key agent:main:cli-export-rerun \
  --channel telegram --to telegram:115335726 \
  --reply-channel telegram --reply-to telegram:115335726 \
  --message "PRANTE: переведи на русский: <source>. Затем вызови
            prante_export_translation (formats: docx,txt) и отправь
            результат через message tool, используя structured
            attachments с media = file.path. Не угадывай URL." \
  --json --deliver
```

Срез ответа:

```json
{
  "toolSummary": {
    "tools": ["prante_analyze_text","prante_glossary_lookup",
              "prante_export_translation","message"],
    "failures": 0
  },
  "messagingToolSentMediaUrls": [
    "/home/alex/.openclaw/workspace-prante/exports/<doc>.docx",
    "/home/alex/.openclaw/workspace-prante/exports/<doc>.txt"
  ],
  "deliveryStatus": { "succeeded": true, "resultCount": 4 }
}
```

**Реальный Telegram-лог:**

```
telegram outbound send ok accountId=default chatId=115335726
    messageId=64 operation=sendDocument deliveryKind=document
telegram outbound send ok accountId=default chatId=115335726
    messageId=65 operation=sendDocument deliveryKind=document
```

Файлы на диске (созданы плагином):
```
~/.openclaw/workspace-prante/exports/<doc>.docx   3389 B  (valid OOXML)
~/.openclaw/workspace-prante/exports/<doc>.txt     474 B
```

`stat` показывает валидный zip-header (`PK\x03\x04`) и `unzip -l`
видит 4 entry: `[Content_Types].xml`, `_rels/.rels`,
`word/document.xml`, `word/_rels/document.xml.rels` — это валидный
минимальный DOCX.

## 8. Memory discipline

`prante_save_memory_candidate`:

- status `candidate` — по умолчанию.
- `user_approved` / `client_approved` / `active` — только при явной
  команде "сохрани" / "одобряю".
- evidence-поля (`segment_ids`, `support_count`, `confidence`)
  обязательны.

В `MEMORY.md` и `USER.md` переносим только `user_approved` и выше.
`USER.md` сейчас содержит placeholder'ы для онбординга — никаких
operator smoke / тестовых данных там нет.

## 9. Operator smoke hard stop

`prante-operator-smoke` skill и `AGENTS.md` §6 фиксируют правила:

- operator smoke **не** пишет в `USER.md` / `MEMORY.md` / дневник.
- не превращается в анкетирование переводчика.
- "доставлено" говорим **только** при подтверждённом tool-result.

## 10. Что НЕ делали

- Не патчили `node_modules/openclaw` (upstream).
- Не добавляли хардкод моделей в workspace.
- Не включали глобальный LM Studio routing (per Alex preference).
- Не строили multi-user / RBAC — MVP single-user.
- Не выкатывали `prante_export_translation` для PDF (принципиально,
  не drift): для русского нужен embedded vector font, это отдельная
  фича.

## 11. Известные cosmetic шумы `doctor`

`openclaw doctor` иногда показывает advisory "Other gateway-like
service" — это инвентарь OpenClaw по дефолтным контурам (slack/discord),
не наш код. На работу PRANTE не влияет.
