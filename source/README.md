# source/

Эта папка содержит **всё**, что мы построили поверх upstream OpenClaw для проекта
**ПРАНТЕ** — личного Telegram-ассистента переводчика. Сюда **не входит** код
upstream OpenClaw; только наша надстройка: workspace, плагин, ops-конфиги и
документация развёртывания.

## Что внутри

```
source/
├── README.md              ← этот файл
└── openclaw/
    ├── README.md          ← инструкция развёртывания на свежем WSL
    ├── VERIFICATION.md    ← доказательная база по каждой продуктовой фиче
    ├── plugins/
    │   └── prante-translator-tools/  ← детерминированные тулы
    ├── workspace-prante/             ← AGENTS/SOUL/USER/TOOLS/MEMORY + skills
    ├── plans/PLAN.md
    └── ops/
        ├── openclaw.example.json     ← config snapshot без секретов
        └── systemd/openclaw-gateway-prante.service
```

## Что НЕ внутри (и почему)

- **upstream OpenClaw** (`openclaw` CLI, его `node_modules`, пакеты) — это
  внешняя зависимость, устанавливается через `npm i -g openclaw@latest`
  согласно `openclaw/README.md`. Не дублируем и не патчим.
- **Runtime-state, локальные сессии, экспортированные файлы, Telegram-сессии,
  тестовые `.docx/.txt`** — генерируются на стороне хоста при работе бота.
  В git не коммитятся.
- **Секреты** (Telegram token, provider keys, allowlist IDs) — никогда не
  попадают в git, ни в каких форматах.

## Контур, который мы строим

| Слой | Что делает | Где живёт |
| --- | --- | --- |
| **Telegram channel** | `@prante_bot` ↔ единственный пользователь (`Alex`/`Aлсу`, numeric ID) | OpenClaw config профиля `prante` |
| **Workspace** | Личность + правила + память | `openclaw/workspace-prante/` |
| **Plugin** | Детерминированные переводческие операции | `openclaw/plugins/prante-translator-tools/` |
| **LLM** | Только draft, объяснения, формулировка кандидатов | Через OpenClaw provider в runtime, не хардкод |
| **Ops** | Gateway как systemd unit | `openclaw/ops/systemd/` |

## Канон

- **Не патчим upstream OpenClaw.** Никаких изменений в `node_modules/openclaw`
  или в `openclaw-plugins-prante-translator-tools/node_modules/openclaw`.
- **Плагин расширяет surface, не подменяет его.** Используем API OpenClaw
  plugin SDK, регистрируемся через `openclaw plugins install` /
  `plugins.load.paths`.
- **Workspace — наш источник истины по persona/правилам.** Не прописываем
  личность и правила поведения в коде плагина.
- **Детерминизм в плагине, NLP в LLM.** Повторы, глоссарий, fuzzy-TM, diff,
  QA — детерминированные. Draft и пояснения — LLM.

## Стартовая точка

Перейти к `openclaw/README.md` — там пошаговая инструкция, как развернуть
контур на чистом WSL за один проход.
