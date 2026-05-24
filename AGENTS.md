# AGENTS.md — PRANTE / ПРАНТЕ

This repository contains the PRANTE project: a Telegram-first assistant for translation preparation, glossary management, and adaptive translation memory.

## Source of truth

- `README.md` — public entry point for the team repository.
- `docs/INTERNAL_DOCS.md` — documentation map and SSOT rules.
- `docs/product/product-brief.md` — product summary.
- `docs/product/adaptive_translation_memory_spec.md` — architecture/spec for adaptive memory and approval loop.
- `docs/prototypes/final-mvp/` — current bot-first MVP prototype.
- `docs/prototypes/project-2-task-3-mvp-spec.md` — MVP prototype assignment/spec.
- `docs/research/Ресерч_проекта_PRANTE.md` — main research document.
- `docs/research/Проект_1_таблица_Alsu_SSOT.md` — canonical Project 1 table/SSOT.
- `TEAM.md` — current team roster and roles.

## Working rules

- Keep the user-facing product Telegram-first. A landing page may explain the bot, but must not replace the bot-flow artifact.
- Keep Russian UX clean and non-technical for reviewers/users.
- Treat deterministic analysis as the default: repeats, glossary matching, rules, diffing, QA.
- Use LLMs for draft generation, explanation, and candidate rule formulation — not as the source of truth.
- Do not commit local sessions, Telegram/Telethon exports, generated archives, raw dumps, or verification artifacts.
- If product or architecture changes, update the matching doc together with the prototype/code.

## Current repo layout

- `docs/product/` — product brief and adaptive memory specification.
- `docs/architecture/` — backend/API/data model drafts.
- `docs/prototypes/final-mvp/` — current static MVP prototype.
- `docs/research/` — curated research/SSOT documents only.
- `docs/templates/` — assignment/template material.

## Why the web page code is under `docs/prototypes/`

The current HTML is a **review/delivery prototype**, not a production web application. It lives under `docs/prototypes/final-mvp/` so the executable mockup stays together with its UX contract, team guide, editable content JSON, and assignment context.

Do not treat this path as the final application architecture. If PRANTE becomes a real deployable web app later, move the implementation to `app/` or a dedicated frontend package and keep `docs/` for documentation only.

## Change discipline

- Keep the repository suitable for team handoff and public GitHub upload.
- Keep local operator contours local via `.gitignore`.
- Prefer small, documented changes over hidden local state.
