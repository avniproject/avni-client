#!/usr/bin/env python3
"""Extract every .filtered() predicate from this codebase (service/DAO/view layer)
into corpus.jsonl for the query census (see README.md). Self-contained — stdlib only.

Usage (from packages/openchs-android):
  node scripts/query-census/dump-prop-schema-map.mjs          # once per models bump
  python3 scripts/query-census/extract_client_corpus.py       # -> corpus.jsonl here
  CENSUS_CORPUS=scripts/query-census/corpus.jsonl npx jest QueryCensus

Root-schema inference, in priority order:
  1. property receiver (`individual.encounters.filtered(...)`) via prop-schema-map.json;
     `encounters` is disambiguated by the owner token (enrolment -> ProgramEncounter).
  2. nearest `X.schema.name` or `.objects('X')` anchor within a 600-char window back
     (covers `this.getAll(EntityQueue.schema.name).filtered(...)` and chained calls).
  3. otherwise null (census still parses; structure-level classification only).
"""
import json
import re
import sys
from pathlib import Path

FILTERED_ARG_RE = re.compile(r"\.filtered\s*\(\s*(['\"`])(.*?)\1", re.DOTALL)
FILTERED_POS_RE = re.compile(r"\.filtered\s*\(")
OBJECTS_SCHEMA_RE = re.compile(r"\.objects\s*\(\s*(['\"`])(\w+)\1\s*\)")
SCHEMA_NAME_RE = re.compile(r"([A-Za-z_$][\w$]*)\.schema\.name")
RECEIVER_RE = re.compile(r"([\w$]+(?:\.[\w$]+)*)$")
# one nesting level of braces inside ${...}
INTERP = r"\$\{(?:[^{}]|\{[^{}]*\})*\}"
QUOTED_INTERP_RE = re.compile(r"(['\"])" + INTERP + r"\1")
BARE_INTERP_RE = re.compile(INTERP)
WHOLE_ARG_DYNAMIC_RE = re.compile(r"^\s*" + INTERP + r"\s*$")

EXCLUDE_PARTS = ("framework/db",)  # the sqlite shim itself, incl. the parser
WINDOW = 600

AMBIGUOUS_HINTS = {
    # prop -> [(owner-token-substring, schema)], first hit wins; "" = default
    "encounters": [("enrol", "ProgramEncounter"), ("", "Encounter")],
    "items": [("detail", "ChecklistItemDetail"), ("", "ChecklistItem")],
}


def strip_js_comments(text):
    """Blank out // line and /* */ block comments, string-aware ('http://…'
    inside a string survives). Offset-preserving: every stripped char becomes
    a space (newlines kept), so match positions map back to the original."""
    out = list(text)
    i, n = 0, len(text)
    in_str = None  # one of ' " `
    while i < n:
        c = text[i]
        if in_str:
            if c == "\\":
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c in "'\"`":
            in_str = c
            i += 1
            continue
        if c == "/" and i + 1 < n and text[i + 1] == "/":
            while i < n and text[i] != "\n":
                out[i] = " "
                i += 1
            continue
        if c == "/" and i + 1 < n and text[i + 1] == "*":
            out[i] = out[i + 1] = " "
            i += 2
            while i < n and not (text[i] == "*" and i + 1 < n and text[i + 1] == "/"):
                if text[i] != "\n":
                    out[i] = " "
                i += 1
            if i < n:
                out[i] = out[i + 1] = " "
                i += 2
            continue
        i += 1
    return "".join(out)


def normalize_interp(arg):
    """Make template-literal predicates parseable: '${x}' -> 'PH', bare ${x} -> 'PH',
    and `in 'PH'` -> `in {'PH'}` (interpolated IN-lists)."""
    a = QUOTED_INTERP_RE.sub("'PH'", arg)
    a = BARE_INTERP_RE.sub("'PH'", a)
    a = re.sub(r"\b(in)\s+'PH'", r"\1 {'PH'}", a, flags=re.IGNORECASE)
    return a


def load_prop_map(outdir):
    p = outdir / "prop-schema-map.json"
    if not p.exists():
        sys.exit(f"missing {p} — run: node scripts/query-census/dump-prop-schema-map.mjs")
    return {k: sorted(v) for k, v in json.loads(p.read_text()).items()
            if v and "string" not in v}


def infer_schema(code, pos, prop_map):
    before = code[:pos]
    m = RECEIVER_RE.search(before)
    if m:  # e.g. individual.encounters | encounters
        segs = m.group(1).split(".")
        prop = segs[-1]
        if prop in prop_map:
            targets = prop_map[prop]
            if len(targets) == 1:
                return targets[0], "prop"
            owner = segs[-2].lower() if len(segs) > 1 else ""
            for hint, schema in AMBIGUOUS_HINTS.get(prop, []):
                if hint in owner:
                    return schema, "prop~"
    window = code[max(0, pos - WINDOW):pos]
    anchors = [(a.start(), a.group(2)) for a in OBJECTS_SCHEMA_RE.finditer(window)]
    anchors += [(a.start(), a.group(1)) for a in SCHEMA_NAME_RE.finditer(window)]
    if anchors:
        return max(anchors)[1], "window"
    return None, "unknown"


def main():
    here = Path(__file__).resolve().parent
    src = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else here.parents[1] / "src"
    outdir = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else here
    prop_map = load_prop_map(outdir)
    corpus = {}
    sites = 0
    for f in sorted(src.rglob("*.js")):
        rel = str(f.relative_to(src))
        if any(x in rel for x in EXCLUDE_PARTS):
            continue
        code = strip_js_comments(f.read_text(encoding="utf-8", errors="replace"))
        quoted_at = {m.start(): m for m in FILTERED_ARG_RE.finditer(code)}
        for pm in FILTERED_POS_RE.finditer(code):
            sites += 1
            line = code.count("\n", 0, pm.start()) + 1
            schema, anchor = infer_schema(code, pm.start(), prop_map)
            qm = quoted_at.get(pm.start())
            if qm:
                raw = qm.group(2).strip()
                interp = "${" in raw
                dynamic = bool(WHOLE_ARG_DYNAMIC_RE.match(raw))
                arg = raw if dynamic else (normalize_interp(raw) if interp else raw)
            else:  # variable / expression argument — not statically classifiable
                tail = code[pm.end():pm.end() + 60].split(")")[0]
                arg, interp, dynamic = f"${{{tail.strip()}}}", True, True
            e = corpus.setdefault((schema, arg), {
                "schema": schema, "arg": arg, "interp": interp, "dynamic": dynamic,
                "n": 0, "anchor": anchor, "sites": [],
            })
            e["n"] += 1
            if len(e["sites"]) < 5:
                e["sites"].append(f"{rel}:{line}")
    out = outdir / "corpus.jsonl"
    with out.open("w") as fh:
        for e in corpus.values():
            fh.write(json.dumps(e) + "\n")
    unknown = sum(e["n"] for e in corpus.values() if e["anchor"] == "unknown")
    print(f".filtered() sites   : {sites}", file=sys.stderr)
    print(f"distinct predicates : {len(corpus)} -> {out}", file=sys.stderr)
    print(f"  unknown root (weighted): {unknown}", file=sys.stderr)


if __name__ == "__main__":
    main()
