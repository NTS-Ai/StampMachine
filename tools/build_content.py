"""Bouwt frontend/js/data/content.js uit de weekbestanden in content/.

Gebruik:
    python tools/build_content.py           # controleren en content.js opnieuw schrijven
    python tools/build_content.py --check   # alleen controleren of content.js up-to-date is (voor CI)

Het script controleert elke vraag voordat het iets schrijft. Bij een fout stopt het
met een melding die het bestand en de vraag-id noemt.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "content"
OUTPUT = ROOT / "frontend" / "js" / "data" / "content.js"

HEADER = (
    "// Gegenereerd door tools/build_content.py uit content/w*.json.\n"
    "// Niet met de hand aanpassen: wijzig de JSON en draai het script opnieuw.\n"
    "\n"
    "/** @type {Week[]} */\n"
)

WEEK_FIELDS = ("week", "level", "title", "topics", "questions", "flashcards", "typing")


class ContentError(Exception):
    pass


def require(item: dict, field: str, kind: type | tuple[type, ...], where: str) -> None:
    value = item.get(field)
    if not isinstance(value, kind) or value in ("", []):
        raise ContentError(f"{where}: veld '{field}' ontbreekt of is leeg")


def check_question(q: dict, where: str) -> None:
    require(q, "id", str, where)
    require(q, "question", str, where)
    kind = q.get("type")
    if kind == "choice":
        require(q, "correct", str, where)
        require(q, "wrong", list, where)
        require(q, "explanation", str, where)
        why_wrong = q.get("why_wrong")
        if why_wrong is not None and len(why_wrong) != len(q["wrong"]):
            raise ContentError(f"{where}: 'why_wrong' moet even lang zijn als 'wrong'")
    elif kind == "truefalse":
        if not isinstance(q.get("answer"), bool):
            raise ContentError(f"{where}: 'answer' moet true of false zijn")
        require(q, "explanation", str, where)
    elif kind == "type":
        require(q, "answers", list, where)
        require(q, "explanation", str, where)
    elif kind == "sentence":
        require(q, "model", str, where)
        require(q, "points", list, where)
    else:
        raise ContentError(f"{where}: onbekend type '{kind}'")


def load_weeks() -> list[dict]:
    files = sorted(CONTENT_DIR.glob("w*.json"), key=lambda p: int(p.stem[1:]))
    if not files:
        raise ContentError(f"geen weekbestanden gevonden in {CONTENT_DIR}")

    weeks: list[dict] = []
    seen_ids: set[str] = set()
    for path in files:
        week = json.loads(path.read_text(encoding="utf-8"))
        name = path.name
        for field in WEEK_FIELDS:
            if field not in week:
                raise ContentError(f"{name}: veld '{field}' ontbreekt")

        for section in ("questions", "typing"):
            for q in week[section]:
                where = f"{name} {q.get('id', '?')}"
                check_question(q, where)
                if section == "questions" and q["type"] == "sentence":
                    raise ContentError(f"{where}: zinvragen horen in 'typing', niet in 'questions'")
                if section == "typing" and q["type"] not in ("type", "sentence"):
                    raise ContentError(f"{where}: in 'typing' mogen alleen 'type' en 'sentence'")

        for card in week["flashcards"]:
            where = f"{name} {card.get('id', '?')}"
            require(card, "id", str, where)
            require(card, "front", str, where)
            require(card, "back", str, where)

        for item in week["questions"] + week["typing"] + week["flashcards"]:
            if item["id"] in seen_ids:
                raise ContentError(f"{name}: id '{item['id']}' komt dubbel voor")
            seen_ids.add(item["id"])

        weeks.append(week)
    return weeks


def render(weeks: list[dict]) -> str:
    body = ",\n".join(json.dumps(week, ensure_ascii=False, separators=(",", ":")) for week in weeks)
    return f"{HEADER}const CONTENT = [\n{body}\n];\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="alleen controleren, niets schrijven")
    args = parser.parse_args()

    try:
        weeks = load_weeks()
    except ContentError as err:
        print(f"Fout in content: {err}", file=sys.stderr)
        return 1

    output = render(weeks)
    counts = (
        f"{sum(len(w['questions']) for w in weeks)} vragen, "
        f"{sum(len(w['typing']) for w in weeks)} typvragen, "
        f"{sum(len(w['flashcards']) for w in weeks)} flashcards"
    )

    if args.check:
        current = OUTPUT.read_text(encoding="utf-8") if OUTPUT.exists() else ""
        if current != output:
            print("content.js is niet up-to-date. Draai: python tools/build_content.py", file=sys.stderr)
            return 1
        print(f"content.js is up-to-date ({counts}).")
        return 0

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(output, encoding="utf-8", newline="\n")
    print(f"{OUTPUT.relative_to(ROOT).as_posix()} geschreven ({counts}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
