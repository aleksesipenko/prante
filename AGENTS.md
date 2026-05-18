# AGENTS.md — PRANTE / ПРАНТЕ

This repository contains the PRANTE project: a Telegram-first assistant for translation preparation, glossary management, and adaptive translation memory.

## Source of truth

- `docs/INTERNAL_DOCS.md` — internal navigation and SSOT.
- `docs/product/product-brief.md` — product summary.
- `docs/product/adaptive_translation_memory_spec.md` — architecture/spec for adaptive memory.
- `docs/research/translation_backend_oss_research.md` — OSS research for backend and UI choices.
- `docs/DEV_LINKS.md` — external development documentation index.
- `docs/telethon.md` — read-only Telethon contour: chat archive pulls, local artifacts, session safety, and cron usage.

## Working rules

- Prefer concise, high-signal updates.
- Keep documentation consistent; if product or architecture changes, update the matching doc instead of only changing the README.
- Treat deterministic analysis as the default: repeats, glossary matching, rules, diffing, QA.
- Use LLMs for draft generation, explanation, and candidate rule formulation — not as the source of truth.
- Do not commit Telegram session files, exports, or other local artifacts. They are ignored by `.gitignore`.
- If you add a script that reads Telegram via Telethon, keep it read-only unless explicitly asked otherwise.
- For Telegram archive pulls, prefer the script in `scripts/telethon/` and use the Telethon compat-session workaround if the host session schema requires it.

## Current repo layout

- `docs/` — product, research, architecture, and links.
- `deliverables/` — generated workbook and other handoff artifacts.
- `scripts/telethon/` — read-only Telegram archive tooling.

## Change discipline

- Update docs along with code or deliverables.
- When adding a new utility script, document its purpose and how to run it.
- Keep outputs reproducible; scripts should write to a predictable output directory and report the path.
