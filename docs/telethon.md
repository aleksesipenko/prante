# Telethon contour for PRANTE

This repository uses Telethon only for **read-only** Telegram ingestion and archive extraction.

## Goals

- Pull today's messages from the target Telegram group.
- Export a local archive for later analysis.
- Optionally download media attached to today's posts.
- Provide a reusable script so the chat can be re-read later without manual digging.

## Default target

Primary chat name to look for:

- `Цифровые кафедры . общий проект`

The script also searches for looser variants, such as:

- `Цифровые кафедры`
- `общий проект`

## Output

Exports should go into a local artifact directory under `artifacts/telethon/` or `exports/telethon/` and should not be committed.

Recommended export shape:

- `YYYY-MM-DD/messages.json`
- `YYYY-MM-DD/messages.md`
- `YYYY-MM-DD/media/`

## Session compatibility

On this host, Telethon session schema compatibility may require a temporary 5-column copy of the existing session DB. Use the workaround documented in:

- `~/.hermes/skills/monitoring/telegram-alert-monitor/references/telethon-session-compat.md`

Do **not** mutate the source `.session` in place.

## Usage example

```bash
python3.10 scripts/telethon/export_today_archive.py \
  --chat-query "Цифровые кафедры" \
  --download-media
```

## Safety

- Read-only only.
- No sending, editing, or deleting Telegram messages.
- Keep the script deterministic and explicit about its output path.
