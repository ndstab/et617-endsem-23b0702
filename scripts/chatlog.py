"""Turn an exported Claude Code session (transcript.jsonl) into one readable .txt file.

Usage: python3 scripts/chatlog.py <transcript.jsonl> <out.txt>

User and assistant messages are kept in full. Tool calls and tool results are kept but shortened,
images are noted as [image], and anything that looks like an API key is redacted.
"""
import json
import re
import sys

src, out = sys.argv[1], sys.argv[2]
KEY = re.compile(r"sk-[-A-Za-z0-9_]{12,}")
REMINDER = re.compile(r"<system-reminder[^>]*>.*?</system-reminder[^>]*>", re.S)  # inserted by the app, not typed by anyone
TOOL_INPUT_LIMIT = 1200
TOOL_RESULT_LIMIT = 1500


CUT_REMINDER = re.compile(r"<system-reminder[^>]*>.*", re.S)  # a reminder cut off when a tool result was shortened


def clean(text):
    text = CUT_REMINDER.sub("[app notice removed]", REMINDER.sub("", text))
    return KEY.sub("sk-[REDACTED]", text).strip()


def shorten(text, limit):
    text = text.strip()
    return text if len(text) <= limit else text[:limit] + f"\n… [{len(text) - limit} more characters omitted]"


def render(content):
    if isinstance(content, str):
        return [content]
    parts = []
    for block in content or []:
        kind = block.get("type")
        if kind == "text":
            parts.append(block.get("text", ""))
        elif kind == "tool_use":
            parts.append(f"[tool call: {block.get('name')}]\n" + shorten(json.dumps(block.get("input", {}), ensure_ascii=False, indent=1), TOOL_INPUT_LIMIT))
        elif kind == "tool_result":
            inner = block.get("content")
            text = inner if isinstance(inner, str) else "\n".join(b.get("text", "[image]") if b.get("type") == "text" else "[image]" for b in (inner or []))
            parts.append("[tool result]\n" + shorten(text, TOOL_RESULT_LIMIT))
        elif kind == "image":
            parts.append("[image]")
    return parts


lines = [
    "ET617 End-Sem 2026 · 23B0702 · AI chat log",
    "Tool: Claude Code (desktop app), one session. Exported with the app's session export and converted to text.",
    "User and assistant messages are complete. Tool calls and results are shortened; API keys are redacted;",
    "notices inserted automatically by the app (system reminders) are removed.",
    "=" * 100,
]
count = 0
with open(src, encoding="utf-8") as f:
    for raw in f:
        try:
            row = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if row.get("type") not in ("user", "assistant") or row.get("isSidechain"):
            continue
        message = row.get("message") or {}
        parts = [p for p in render(message.get("content")) if p and p.strip()]
        if not parts:
            continue
        only_tools = all(p.startswith("[tool result]") for p in parts)
        who = "TOOL OUTPUT" if only_tools else ("USER" if row["type"] == "user" else "ASSISTANT (Claude)")
        stamp = (row.get("timestamp") or "")[:19].replace("T", " ")
        body = "\n\n".join(c for c in (clean(p) for p in parts) if c)
        if not body:
            continue
        lines.append(f"\n----- {who}  {stamp} UTC -----")
        lines.append(body)
        count += 1

with open(out, "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")
print(f"{count} messages written to {out}")
