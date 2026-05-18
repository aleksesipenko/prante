#!/usr/bin/env python3
"""Export today's Telegram messages for the PRANTE telethon contour.

Read-only script:
- connects with a temporary Telethon compat session if needed
- finds a target chat by query/name
- exports messages from today (Europe/Moscow)
- optionally downloads media
- writes JSON + Markdown summary to a local artifact directory

Default target chat query: "Цифровые кафедры . общий проект"
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import shutil
import sqlite3
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Optional
from zoneinfo import ZoneInfo

from telethon import TelegramClient

MSK = ZoneInfo("Europe/Moscow")
TARGET_QUERIES = [
    "Цифровые кафедры. Общий проект",
    "Цифровые кафедры . общий проект",
    "Цифровые кафедры общий проект",
    "общий проект",
    "Цифровые кафедры",
]
DEFAULT_SESSION = Path.home() / ".hermes/credentials/telethon/sessions/telegram_aleks_fresh.session"
API_FILE = Path.home() / ".hermes/credentials/telethon/api.txt"
DEFAULT_OUTDIR = Path.cwd() / "artifacts" / "telethon"


@dataclass
class MessageRecord:
    id: int
    date_utc: str
    date_msk: str
    sender: str
    text: str
    has_media: bool
    media_type: str
    file_name: Optional[str] = None
    media_path: Optional[str] = None


def read_api_creds(path: Path = API_FILE) -> tuple[int, str]:
    data = path.read_text(encoding="utf-8").splitlines()
    values: dict[str, str] = {}
    for line in data:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        values[k.strip()] = v.strip()
    return int(values["api_id"]), values["api_hash"]


def normalize(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"\s+", " ", s)
    s = s.replace("ё", "е")
    return s


def compat_session(orig: Path = DEFAULT_SESSION) -> Path:
    """Create a temporary 5-column Telethon session copy if needed."""
    temp = Path("/tmp/telegram_aleks_fresh_compat.session")
    if temp.exists():
        temp.unlink()
    shutil.copy2(orig, temp)

    db = sqlite3.connect(temp)
    try:
        columns = [row[1] for row in db.execute("PRAGMA table_info(sessions)").fetchall()]
        if len(columns) == 5:
            return temp
        row = db.execute(
            "SELECT dc_id, server_address, port, auth_key, takeout_id FROM sessions LIMIT 1"
        ).fetchone()
        if row is None:
            raise RuntimeError("Telethon session has no rows")
        db.execute("DROP TABLE IF EXISTS sessions")
        db.execute(
            """
            CREATE TABLE sessions (
                dc_id integer primary key,
                server_address text,
                port integer,
                auth_key blob,
                takeout_id integer
            )
            """
        )
        db.execute("INSERT INTO sessions VALUES (?,?,?,?,?)", row)
        db.commit()
        return temp
    finally:
        db.close()


async def connect_client() -> TelegramClient:
    api_id, api_hash = read_api_creds()
    session_path = compat_session()
    client = TelegramClient(str(session_path), api_id, api_hash)
    await client.connect()
    if not await client.is_user_authorized():
        raise RuntimeError("Telethon session is not authorized")
    return client


def msk_day_bounds(now: Optional[datetime] = None) -> tuple[datetime, datetime]:
    now = now or datetime.now(tz=MSK)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start.replace(hour=23, minute=59, second=59, microsecond=999999)
    return start, end


async def find_dialog(client: TelegramClient, query: str):
    dialogs = await client.get_dialogs()
    nq = normalize(query)
    hits = []
    for dialog in dialogs:
        title = normalize(dialog.name or "")
        if not title:
            continue
        score = 0
        if title == nq:
            score += 100
        if "общий проект" in title and "общий проект" in nq:
            score += 80
        if any(term in title for term in ["общий проект", "цифровые кафедры"]):
            score += 20
        if any(token in title for token in nq.split() if len(token) > 2):
            score += 5
        if score:
            hits.append((score, len(title), dialog))
    if not hits:
        for candidate in TARGET_QUERIES:
            c = normalize(candidate)
            for dialog in dialogs:
                title = normalize(dialog.name or "")
                if not title:
                    continue
                score = 0
                if title == c:
                    score += 100
                if "общий проект" in title and "общий проект" in c:
                    score += 80
                if c in title or title in c:
                    score += 40
                if any(token in title for token in c.split() if len(token) > 2):
                    score += 5
                if score:
                    hits.append((score, len(title), dialog))
    if not hits:
        return None, dialogs
    hits.sort(key=lambda t: (t[0], t[1]), reverse=True)
    return hits[0][2], dialogs


async def export_chat(client: TelegramClient, dialog, outdir: Path, download_media: bool) -> dict:
    start_msk, end_msk = msk_day_bounds()
    start_utc = start_msk.astimezone(timezone.utc)
    outdir.mkdir(parents=True, exist_ok=True)
    media_dir = outdir / "media"
    media_dir.mkdir(parents=True, exist_ok=True)

    records: list[MessageRecord] = []
    sender_counter: Counter[str] = Counter()
    keyword_counter: Counter[str] = Counter()

    messages = await client.get_messages(dialog.entity, limit=500)
    for msg in messages:
        if not msg.date:
            continue
        msg_utc = msg.date.astimezone(timezone.utc)
        if msg_utc < start_utc:
            continue
        text = msg.message or ""
        sender = ""
        try:
            sender = await msg.get_sender()
            sender = getattr(sender, "first_name", None) or getattr(sender, "title", None) or getattr(sender, "username", None) or "unknown"
        except Exception:
            sender = getattr(msg, "post_author", None) or "unknown"
        sender_counter[sender] += 1

        media_type = type(msg.media).__name__ if msg.media else ""
        file_name = None
        media_path = None
        if download_media and msg.media:
            try:
                downloaded = await client.download_media(msg, file=media_dir)
                if downloaded:
                    media_path = str(Path(downloaded).resolve())
                    file_name = Path(downloaded).name
            except Exception as e:
                media_path = f"ERROR: {e}"

        for kw in ["дедлайн", "сдать", "экзамен", "дз", "проект", "пара", "перенос", "важно", "защита", "презентац", "консультац", "критер", "провер", "ссылка", "тест", "архив"]:
            if kw in text.lower():
                keyword_counter[kw] += 1

        records.append(
            MessageRecord(
                id=msg.id,
                date_utc=msg_utc.isoformat(),
                date_msk=msg_utc.astimezone(MSK).isoformat(),
                sender=str(sender),
                text=text,
                has_media=bool(msg.media),
                media_type=media_type,
                file_name=file_name,
                media_path=media_path,
            )
        )

    payload = {
        "chat_title": dialog.name,
        "chat_id": getattr(dialog.entity, "id", None),
        "date_msk": datetime.now(tz=MSK).date().isoformat(),
        "start_msk": start_msk.isoformat(),
        "end_msk": end_msk.isoformat(),
        "message_count": len(records),
        "sender_counts": sender_counter.most_common(),
        "keyword_counts": keyword_counter.most_common(),
        "messages": [asdict(r) for r in reversed(records)],
    }

    (outdir / "messages.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    md_lines = [
        f"# Archive: {dialog.name}",
        f"Date: {payload['date_msk']}",
        f"Messages: {payload['message_count']}",
        "",
    ]
    for rec in reversed(records):
        text = rec.text.strip().replace("\n", " ")
        if len(text) > 350:
            text = text[:350] + "…"
        md_lines.append(f"- [{rec.date_msk}] {rec.sender}: {text or '[media/no text]'}")
    (outdir / "messages.md").write_text("\n".join(md_lines), encoding="utf-8")

    return payload


async def main() -> int:
    parser = argparse.ArgumentParser(description="Export today's Telegram archive for PRANTE.")
    parser.add_argument("--chat-query", default="Цифровые кафедры . общий проект", help="Chat title/substring to search for")
    parser.add_argument("--outdir", default=str(DEFAULT_OUTDIR), help="Output directory")
    parser.add_argument("--download-media", action="store_true", help="Download attached media for today's messages")
    parser.add_argument("--show-matches", action="store_true", help="Print matching dialog candidates")
    args = parser.parse_args()

    outdir = Path(args.outdir)
    client = await connect_client()
    try:
        dialog, dialogs = await find_dialog(client, args.chat_query)
        if args.show_matches:
            matches = []
            q = normalize(args.chat_query)
            for d in dialogs:
                title = normalize(d.name or "")
                if q in title or title in q or any(token in title for token in q.split() if len(token) > 2):
                    matches.append(d.name)
            print(json.dumps({"matches": matches[:20]}, ensure_ascii=False, indent=2))
        if not dialog:
            print(json.dumps({"ok": False, "error": "chat_not_found", "query": args.chat_query}, ensure_ascii=False, indent=2))
            return 2

        date_dir = datetime.now(tz=MSK).date().isoformat()
        target_dir = outdir / date_dir / re.sub(r"[^\w\-]+", "_", dialog.name or args.chat_query).strip("_")
        payload = await export_chat(client, dialog, target_dir, args.download_media)
        print(json.dumps({
            "ok": True,
            "chat_title": payload["chat_title"],
            "message_count": payload["message_count"],
            "output_dir": str(target_dir.resolve()),
            "top_senders": payload["sender_counts"][:5],
            "top_keywords": payload["keyword_counts"][:10],
        }, ensure_ascii=False, indent=2))
        return 0
    finally:
        await client.disconnect()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
