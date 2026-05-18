# Team collaboration workflow research — PRANTE

Статус: рабочий research для выбора human-facing контура команды.  
Дата: 2026-05-19.  
Цель: сделать так, чтобы код оставался в git, но участники без developer background могли удобно читать, редактировать и предлагать идеи.

## Проблема

Один приватный GitHub-репозиторий удобен для разработки, но неудобен для всей команды:

- не все участники умеют работать с git, branches и PR;
- markdown в репозитории выглядит для части команды как “код”, а не как документ;
- нужны простые human-facing страницы: команда, идея, гипотезы, CJM, прогресс, решения;
- нужно место, где можно быстро поправить текст, не ломая структуру репозитория;
- в Telegram хорошо обсуждать, но плохо хранить актуальную истину.

## Критерии выбора

1. **Приватность** — проект лучше держать приватным.
2. **Human-facing UI** — неразработчики должны читать и редактировать без git.
3. **Версионность** — нужна история изменений и возможность отката.
4. **Self-hosted / open-source** — желательно развернуть на собственной инфраструктуре.
5. **Markdown/Git compatibility** — хорошо, если документы можно синхронизировать с git.
6. **Минимальная сложность** — команда маленькая, нельзя строить enterprise-комбайн.
7. **Telegram-friendly workflow** — Hermes/агент должен уметь принимать контекст из чата и обновлять документы.

## Кандидаты

### 1. Wiki.js

Сайт: https://js.wiki/  
GitHub: https://github.com/requarks/wiki  
Git storage docs: https://docs.requarks.io/storage/git  
Storage docs: https://docs.requarks.io/storage

Что это: open-source self-hosted wiki на Node.js.

Сильные стороны:

- красивый human-facing UI;
- Markdown-first подход;
- история версий и визуальный diff;
- роли, группы, permissions;
- private/public режимы;
- много интеграций;
- есть Git storage/sync module, который может синхронизироваться с remote Git repository.

Важная деталь:

- Wiki.js хранит контент в базе, а Git storage — это скорее backup/sync слой. Для надежного workflow лучше выделять отдельный wiki-docs repo или отдельную docs-папку, а не смешивать напрямую весь кодовый репозиторий.

Подходит PRANTE, если:

- хотим красивую вики для всей команды;
- хотим сохранить markdown/git discipline;
- готовы один раз аккуратно настроить self-hosted deployment.

Риск:

- чуть больше администрирования, чем у BookStack;
- Git sync требует дисциплины и тестирования, чтобы не устроить конфликт между ручными правками в git и wiki.

### 2. BookStack

Сайт: https://www.bookstackapp.com/  
Docs: https://www.bookstackapp.com/docs/  
Markdown editor docs: https://www.bookstackapp.com/docs/user/markdown-editor/  
Codeberg: https://codeberg.org/bookstack/bookstack

Что это: простая self-hosted wiki/documentation system с иерархией Books → Chapters → Pages.

Сильные стороны:

- очень понятная структура для неразработчиков;
- WYSIWYG editor по умолчанию;
- есть Markdown editor;
- page revisions;
- глобальный поиск;
- permissions;
- diagrams.net integration;
- MIT license;
- ниже порог входа для команды.

Подходит PRANTE, если:

- важнее простота для людей, чем tight git integration;
- команда хочет “страницы как в Notion/Confluence”, а не markdown repo;
- нужен быстрый human-facing knowledge base.

Риск:

- хуже как git-backed SSOT;
- придется отдельно синхронизировать важные решения обратно в репозиторий.

### 3. HedgeDoc

Сайт: https://hedgedoc.org/  
Docs: https://docs.hedgedoc.org/  
GitHub: https://github.com/hedgedoc/hedgedoc

Что это: self-hosted collaborative markdown editor, ближе к Google Docs для markdown.

Сильные стороны:

- real-time collaboration;
- общий markdown-док по ссылке;
- удобно для созвонов, брейнштормов, протоколов встреч;
- revisions;
- Mermaid/PlantUML/diagrams;
- presentation mode.

Подходит PRANTE, если:

- команде нужно вместе писать заметку во время созвона;
- нужен быстрый совместный черновик без долгой структуры.

Риск:

- это не полноценная база знаний;
- без дисциплины легко получить много разрозненных заметок.

### 4. Forgejo

Сайт: https://forgejo.org/  
Codeberg: https://codeberg.org/forgejo/forgejo

Что это: lightweight self-hosted software forge, open-source альтернатива GitHub/Gitea.

Сильные стороны:

- приватные репозитории на собственной инфраструктуре;
- issues, pull requests, code review;
- низкие ресурсы;
- понятен людям, знакомым с GitHub;
- подходит как self-hosted GitHub replacement.

Подходит PRANTE, если:

- хочется не GitHub, а свой private forge;
- важна автономность и контроль инфраструктуры.

Риск:

- все равно developer-facing;
- не решает проблему удобного чтения/редактирования документов для неразработчиков.

### 5. Gitea

Сайт: https://about.gitea.com/  
Docs: https://docs.gitea.com/  
GitHub: https://github.com/go-gitea/gitea

Что это: self-hosted DevOps/git platform.

Сильные стороны:

- легкий GitHub-like интерфейс;
- приватные репы;
- issues, PR, packages, actions;
- простая установка;
- большая зрелость.

Подходит PRANTE, если:

- нужен именно приватный git-сервер;
- хотим lightweight GitHub alternative.

Риск:

- как и Forgejo, не дает human-facing docs layer уровня BookStack/Wiki.js.

## Рекомендованный вариант для PRANTE

### MVP workflow: GitHub private + BookStack или Wiki.js

Самый практичный вариант:

1. **Private GitHub repo** или позже Forgejo/Gitea.
2. **Wiki.js** как главный human-facing docs portal.
3. **HedgeDoc** опционально для живых совместных черновиков на созвонах.
4. **Telegram + Hermes agent** как intake layer.

Почему так:

- код и история остаются в git;
- команда видит аккуратные страницы, а не дерево файлов;
- Hermes может брать идеи из Telegram и превращать их в docs/issues;
- неразработчики могут редактировать human docs через UI.

## Минимальная структура human-facing docs

В Wiki.js/BookStack завести страницы:

- **Главная / Что такое ПРАНТЕ**
- **Команда и роли** → синхронизировать с `TEAM.md`
- **Продуктовое видение**
- **Функции MVP**
- **Гипотезы и проверки**
- **Решения команды / Decision log**
- **Встречи и протоколы**
- **Что делать сейчас / Current tasks**
- **Материалы Школы 21**
- **Ссылки и файлы**

## Предлагаемый рабочий процесс

### Для команды

- Идеи и быстрые вопросы — в Telegram.
- Совместный черновик на созвоне — HedgeDoc или одна страница wiki.
- Актуальная версия документа — Wiki.js/BookStack.
- Техническая истина и код — private git repo.

### Для Hermes/агента

- Читать Telegram-чат по запросу или cron.
- Делать дайджесты.
- Обновлять `TEAM.md`, decision log, product docs.
- Создавать issues/tasks из сообщений.
- Не писать в чат от имени пользователя без явной команды.

### Для разработчика

- Code changes → branch → PR.
- Docs changes из wiki раз в день/перед сдачей синхронизировать в repo.
- Важные решения фиксировать в `docs/decisions/` или wiki decision log.

## Практический выбор

### Если хотим максимально просто для команды

Выбрать **BookStack**.

Плюсы:

- людям проще всего;
- WYSIWYG;
- понятная структура Books/Chapters/Pages.

Минус:

- хуже синхронизация с git.

### Если хотим баланс docs UI + markdown/git

Выбрать **Wiki.js**.

Плюсы:

- лучше вписывается в git/markdown workflow;
- красивый интерфейс;
- Git storage/sync.

Минус:

- чуть больше настройки и дисциплины.

### Если хотим только совместные черновики

Добавить **HedgeDoc** как вспомогательный инструмент.

## Рекомендация Hermes

Для PRANTE я бы выбрал:

1. **GitHub private repo сейчас** — минимальная точка истины для кода.
2. **Wiki.js** — основной human-facing docs portal.
3. **HedgeDoc позже/опционально** — для real-time созвонов и черновиков.
4. **Hermes Telegram agent позже** — intake, summaries, docs sync, issue creation.

BookStack стоит выбрать вместо Wiki.js, если окажется, что команде важнее WYSIWYG-простота, чем markdown/git-sync.

## Ссылки

- Wiki.js: https://js.wiki/
- Wiki.js Git storage: https://docs.requarks.io/storage/git
- Wiki.js storage modules: https://docs.requarks.io/storage
- Wiki.js GitHub: https://github.com/requarks/wiki
- BookStack: https://www.bookstackapp.com/
- BookStack docs: https://www.bookstackapp.com/docs/
- BookStack Markdown editor: https://www.bookstackapp.com/docs/user/markdown-editor/
- BookStack Codeberg: https://codeberg.org/bookstack/bookstack
- HedgeDoc: https://hedgedoc.org/
- HedgeDoc docs: https://docs.hedgedoc.org/
- HedgeDoc GitHub: https://github.com/hedgedoc/hedgedoc
- Forgejo: https://forgejo.org/
- Forgejo Codeberg: https://codeberg.org/forgejo/forgejo
- Gitea: https://about.gitea.com/
- Gitea docs: https://docs.gitea.com/
- Gitea GitHub: https://github.com/go-gitea/gitea
