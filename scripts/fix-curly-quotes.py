#!/usr/bin/env python3
"""
fix-curly-quotes.py — unconditional curly-quote sweep for AI Builders Digest JSON.

When the agent writes Chinese text into intro.text, cn.rewrite[], or cn.original[],
or lifts English `original` text from X / blog feeds, the source sometimes
contains U+2018 / U+2019 (left/right single quote) and U+201C / U+201D
(left/right double quote). The JSON spec allows these inside string values,
so json.load() accepts the file — but a downstream lint step, or any
`data-author-tag=""` regression check, can treat them as forbidden.

The current skill (Pitfall — U+2019 right single quote) requires the agent
to do this sweep manually. This script makes the sweep automatic and
idempotent: load → walk every string → replace → write back → re-validate.

Replacement map:
  U+201C (LEFT DOUBLE QUOTATION MARK)  ->  U+0022 (")
  U+201D (RIGHT DOUBLE QUOTATION MARK) ->  U+0022 (")
  U+2018 (LEFT SINGLE QUOTATION MARK)  ->  U+0027 (')
  U+2019 (RIGHT SINGLE QUOTATION MARK) ->  U+0027 (')

ASCII " and ' are safe replacements because:
  - The apostrophe semantics in English (what's, don't, Here's) are unambiguous.
  - Chinese strings can use 「」 or 『』 if real quotation marks are needed;
    ASCII " inside a Chinese string creates noise, but it's still valid JSON.
    For stricter formatting, run a second pass with `python -c` to swap " back
    to 「」 inside cn.* fields if you want visually-pretty Chinese quotes.

Usage:
  python3 scripts/fix-curly-quotes.py <path-to-issue-json>
  python3 scripts/fix-curly-quotes.py data/issues/ai-builders-digest-2026-06-10.json

Exit codes:
  0 = clean (zero curly quotes after sweep, or already-clean file)
  1 = something is wrong (file not found, JSON malformed, write failed)
  2 = sweep was needed and applied (informational; not a failure)

The script prints before/after counts so the operator can confirm a real
sweep happened (count > 0) vs. the file was already clean (count = 0).
"""
import json
import sys
from pathlib import Path

# Replacement table — order matters: replace double first to avoid any
# (currently non-existent) ambiguity in the table itself.
CURLY_MAP = {
    "\u201c": '"',  # LEFT DOUBLE QUOTATION MARK
    "\u201d": '"',  # RIGHT DOUBLE QUOTATION MARK
    "\u2018": "'",  # LEFT SINGLE QUOTATION MARK
    "\u2019": "'",  # RIGHT SINGLE QUOTATION MARK
}

CURLY_CHARS = list(CURLY_MAP.keys())


def count_curly(s: str) -> int:
    """Total count of curly-quote characters in a string."""
    return sum(s.count(c) for c in CURLY_CHARS)


def fix_curly(s: str) -> str:
    """Replace every curly-quote character with its ASCII equivalent."""
    for curly, ascii_equiv in CURLY_MAP.items():
        s = s.replace(curly, ascii_equiv)
    return s


def walk_fix(obj):
    """Recursively walk a JSON-decoded structure, returning a new structure
    with every string fixed."""
    if isinstance(obj, dict):
        return {k: walk_fix(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [walk_fix(x) for x in obj]
    if isinstance(obj, str):
        return fix_curly(obj)
    return obj


def main():
    if len(sys.argv) != 2:
        print("Usage: fix-curly-quotes.py <path-to-issue-json>", file=sys.stderr)
        sys.exit(1)

    path = Path(sys.argv[1])
    if not path.exists():
        print(f"FATAL: {path} not found", file=sys.stderr)
        sys.exit(1)

    raw = path.read_text(encoding="utf-8")
    before_total = sum(raw.count(c) for c in CURLY_CHARS)
    before_per = {c: raw.count(c) for c in CURLY_CHARS}

    if before_total == 0:
        print(f"OK: {path.name} is already clean (0 curly quotes).")
        sys.exit(0)

    # Parse → fix → re-serialize → re-validate
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"FATAL: {path} is malformed JSON: {e}", file=sys.stderr)
        sys.exit(1)

    fixed = walk_fix(data)
    out = json.dumps(fixed, ensure_ascii=False, indent=2)
    after_total = sum(out.count(c) for c in CURLY_CHARS)

    if after_total != 0:
        # Should never happen — every curly should have been replaced.
        print(f"FATAL: sweep left {after_total} curly quotes unfixed", file=sys.stderr)
        sys.exit(1)

    # Re-validate by parsing the output
    try:
        json.loads(out)
    except json.JSONDecodeError as e:
        print(f"FATAL: post-sweep output is malformed JSON: {e}", file=sys.stderr)
        sys.exit(1)

    path.write_text(out, encoding="utf-8")

    # Report what was changed
    per_char = ", ".join(f"U+{ord(c):04X}={before_per[c]}" for c in CURLY_CHARS if before_per[c])
    print(f"FIXED: {path.name} — replaced {before_total} curly quotes ({per_char}).")
    print(f"       File size: {len(out):,} bytes. JSON re-validates cleanly.")
    sys.exit(2)  # 2 = sweep applied (informational, not an error)


if __name__ == "__main__":
    main()
