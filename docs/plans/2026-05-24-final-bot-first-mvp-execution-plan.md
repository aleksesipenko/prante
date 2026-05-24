# Final bot-first MVP prototype implementation plan

> **For Hermes:** Execute autonomously, then use a strict judge subagent for final verification.

**Goal:** Build a polished, team-editable, bot-first HTML prototype for PRANTE Project 2 that matches the accepted product/research documents and today's team constraints.

**Architecture:** Static hosted prototype: `index.html` renders from `content/prante-content.json`; `/admin` contains Decap CMS config for Git-backed editing after Netlify/Git Gateway is connected. The visual artifact is a Telegram-style bot flow with one edited progress message showing internal work steps, then a concise report, glossary, draft, and memory confirmation.

**Tech Stack:** Plain HTML/CSS/JS, JSON content source, Decap CMS admin config, Playwright/ffmpeg for verification/screenshots/video-ready checks.

---

## SSOT used

1. `docs/INTERNAL_DOCS.md` — product SSOT index and architecture principle.
2. `docs/product/product-brief.md` — product format, problem, solution, audience.
3. `docs/product/adaptive_translation_memory_spec.md` — memory, approval loop, deterministic tools + LLM principle.
4. `docs/research/Проект_1_таблица_Alsu_SSOT.md` — canonical Project 1 submission from Alsu.
5. `docs/research/Ресерч_проекта_PRANTE.md` — audience, hypotheses, UVP, prioritization.
6. `docs/prototypes/project-2-task-3-mvp-spec.md` — Project 2 / Task 3 prototype requirements.
7. `docs/plans/2026-05-22-project-2-task-3-mvp-prototype-plan.md` — Task 3 interpretation and screen plan.
8. `docs/telegram/digests/2026-05-24-cifrovye-kafedry.md` and today's raw chat — Alsu/team constraints: bot must be shown; landing is secondary; video/GIF acceptable; avoid mismatch with CJM.
9. `docs/research/source/team-media-2026-05-24/CJM для Telegram.paragraphs.md` and extracted PPT media — team example: simple Telegram bot, short start, buttons, structured answer, no excess.

## Hard requirements

- Primary artifact is Telegram bot flow, not a landing page.
- User-facing interface is Russian-first: no unnecessary English, no technical notes, no code terms in visible UX.
- No neon, no rainbow gradients, no fake SaaS dashboard, no generic AI slop.
- Show internal work steps as a single existing bot message that changes state over time.
- Timing must be readable and plausible, but not slow.
- Copy must align with PRANTE as a translation-preparation assistant, not a generic grammar bot.
- Demonstrate: start, commands, upload/input, analysis, terms/glossary, draft, user edit, memory approval.
- Memory is only saved after user confirmation.
- All visible copy must be externalized for team editing.
- Include team guide with preview link/editing instructions and Decap/Netlify setup notes.
- Verify with screenshots and strict subagent judge.

## Judge criteria

The judge must reject if any item is false:

1. Bot-first: first screen clearly demonstrates Telegram bot, not just a website.
2. Project alignment: scenario matches PRANTE product brief and Alsu SSOT.
3. Team alignment: respects today's chat guidance and CJM bot requirement.
4. User UX language: visible interface has no unnecessary English or technical labels.
5. Copy quality: Russian text is concise, professional, understandable for translators.
6. Visual quality: calm, non-toxic palette; no neon/glassmorphism/rainbow/AI slop.
7. Tool display: work steps are visible as edited status inside one bot message.
8. Timing: animation is readable and not painfully slow.
9. MVP coverage: start, commands, input, analysis, glossary, draft, edit, memory are present.
10. Future-bot skeleton: flow maps to backend/tool pipeline and Telegram callbacks.
11. Editability: visible copy lives in structured content files and admin config references it.
12. Verification: screenshots exist for initial/progress/final states; console has no JS errors.
13. Responsiveness: usable on desktop and mobile widths.
14. Handoff: team guide explains how to view, edit text, and join the editing process.

## Implementation tasks

### Task 1: Create final prototype directory and content model

Files:
- Create: `docs/prototypes/final-mvp/content/prante-content.json`
- Create: `docs/prototypes/final-mvp/admin/config.yml`
- Create: `docs/prototypes/final-mvp/admin/index.html`

Steps:
1. Create JSON content sections: meta, page, botHeader, chatFlow, progressSteps, report, glossary, draft, memory, teamNotes.
2. Use Russian-only user-facing copy.
3. Add Decap CMS fields for every text/content area.

Verification:
- JSON parses.
- No visible copy section is missing from config.

### Task 2: Build `index.html`

Files:
- Create: `docs/prototypes/final-mvp/index.html`

Steps:
1. Fetch `content/prante-content.json`.
2. Render a Telegram-style phone frame as the main artifact.
3. Add calm visual system: warm paper background, graphite phone, Telegram blue/sage accents, readable cards.
4. Implement animation timeline:
   - initial state;
   - user sends document;
   - bot creates one progress message;
   - progress message updates steps;
   - final report appears;
   - glossary action;
   - draft action;
   - memory approval.
5. Add buttons: restart, pause, final state, reduced motion.
6. Add supporting sections below the bot: why it matches MVP, what research influenced.

Verification:
- No console errors.
- Controls work.
- Progress message DOM node is reused, not duplicated per step.

### Task 3: Add team guide and handoff copy

Files:
- Create: `docs/prototypes/final-mvp/TEAM_GUIDE.md`
- Create: `docs/prototypes/final-mvp/HANDOFF_FOR_CHAT.md`

Steps:
1. Write a short guide Alex can send to the team.
2. Explain view link placeholder, `/admin`, editing flow, Decap/Netlify setup, content files.
3. Mention that landing text is secondary; bot-flow is the MVP.

Verification:
- Guide is short enough to send in Telegram.
- No private credentials or secrets.

### Task 4: Autonomous visual verification

Files:
- Create: `docs/prototypes/final-mvp/verification/report.md`
- Create screenshots under `docs/prototypes/final-mvp/verification/screenshots/`

Steps:
1. Serve final-mvp locally.
2. Use Playwright/Chromium to capture screenshots: initial, progress, final, mobile.
3. Check console errors.
4. Check DOM invariant: only one progress message element.
5. Create verification report.

Verification:
- At least four screenshots exist.
- Console errors count is zero.
- DOM invariant passes.

### Task 5: Strict judge and fix loop

Steps:
1. Send files and criteria to a judge subagent.
2. If judge returns issues, fix them.
3. Repeat until judge returns green light.

Verification:
- Final judge verdict is GREEN / approved.

### Task 6: Host or prepare hosting

Steps:
1. Try available free hosting credentials/tools.
2. If authenticated hosting is unavailable, prepare a deployable static bundle and a temporary localtunnel if possible.
3. Document exact blocker and next action for permanent Netlify editing.

Verification:
- Either public URL is produced, or the blocker is explicit and the bundle is ready.
