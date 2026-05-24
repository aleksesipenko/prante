# PRANTE — Bot-first frontend plan after team chat

Source: `docs/telegram/digests/2026-05-24-cifrovye-kafedry.md`

## Core decision

For the school submission, PRANTE must be presented as a **Telegram-bot MVP first**, with the landing page as a secondary packaging layer.

The landing page is still useful, but it must not replace the bot flow because the project was previously declared as a Telegram bot and the CJM also describes a bot scenario.

## Why this matters

Alsu flagged a grading risk: if the mockup does not match the declared project, the evaluation can drop. Therefore, the safest interpretation is:

- **MVP artifact:** clickable Telegram-bot scenario / bot mockup.
- **Support artifact:** landing page explaining product value and linking to the bot scenario.

## Recommended frontend direction

Use a hybrid of the three references:

1. **Intercom-like conversational layer** — for hero and bot flow.
   - Warm, understandable, user-friendly.
   - Best matches Telegram-first product logic.

2. **Linear-like operator layer** — for analysis results.
   - Repeats, glossary candidates, style risks, draft status.
   - Makes PRANTE feel like a serious translator tool, not a toy bot.

3. **Mintlify-like clarity layer** — for explanation/handoff sections.
   - What the MVP does.
   - What is mocked vs real.
   - Why it follows from the research.

## What to build now

### 1. Bot-first clickable mockup

Primary artifact:

- Telegram-style chat frame.
- `/start` state.
- command menu:
  - `Загрузить текст`
  - `Загрузить файл`
  - `Глоссарий`
  - `Черновик`
  - `Память проекта`
- user uploads a DOCX/PDF or sends text.
- bot replies with pre-translation analysis:
  - repeats;
  - key terms;
  - genre/style;
  - readability/risk notes.
- user accepts glossary terms.
- bot generates draft translation.
- user edits/approves.
- bot offers to remember terminology/style preference.

### 2. Landing as packaging, not MVP replacement

Secondary artifact:

- product value proposition;
- short explanation of who PRANTE is for;
- CTA: `Открыть Telegram-бота` / `Посмотреть сценарий`;
- small section: how research shaped MVP;
- explicit note: landing is project packaging, MVP scenario is Telegram bot.

### 3. Handoff note for Alsu/team

Short text to send:

> Мы не заменяем бота лендингом. Основной макет будет Telegram-first: стартовые сообщения, команды, загрузка текста/файла, анализ, глоссарий, черновик и память. Лендинг нужен как упаковка проекта и объяснение ценности, но в сдаче акцент будет на bot-flow, чтобы не было несоответствия с заявленным проектом и CJM.

## Definition of done

- There is a clickable bot-first HTML mockup.
- It clearly shows start messages and available commands.
- It shows one full user scenario from input to saved memory.
- Landing page exists only as supporting wrapper.
- The handoff text explicitly says that the bot flow is the MVP, while the landing is packaging.
- The mockup can be shown to Alsu and checked against the Project 2 checklist.

## Immediate next step

Rework current prototype around this hierarchy:

1. first screen: Telegram bot hero / bot preview;
2. second screen: command menu and upload flow;
3. third screen: analysis report;
4. fourth screen: glossary confirmation;
5. fifth screen: draft translation;
6. sixth screen: memory/save preferences;
7. supporting landing sections below or around the bot demo.
