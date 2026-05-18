#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
python3.10 scripts/telethon/export_today_archive.py "$@"
