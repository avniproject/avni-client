#!/usr/bin/env python3
"""Summarise one run's [SPIKE] log lines. Usage: parse.py <logcat.txt> [pss.txt]"""
import json, re, sys, csv, os
from collections import defaultdict

def load(path):
    evs = []
    for line in open(path, errors="ignore"):
        m = re.search(r"\[SPIKE\] (\{.*\})", line)
        if not m: continue
        try: evs.append(json.loads(m.group(1)))
        except json.JSONDecodeError: pass
    return evs

def ms(v): return v if isinstance(v, (int, float)) else 0

def main(log, pss=None):
    evs = load(log)
    starts = [e for e in evs if e["ev"] == "sync_start"]
    ends = [e for e in evs if e["ev"] in ("sync_end", "sync_error")]
    pages = [e for e in evs if e["ev"] == "page"]
    bulks = [e for e in evs if e["ev"] == "bulk"]
    opens = [e for e in evs if e["ev"] == "db_open"]
    run = starts[-1]["run"] if starts else (evs[0]["run"] if evs else "?")
    print(f"run: {run}   events: {len(evs)}   syncs started: {len(starts)}")
    for o in opens[-1:]:
        print("db_open:", {k: v for k, v in o.items() if k not in ("t", "ev", "run")})
    for s in starts: print("sync_start:", s.get("backend"), s.get("syncSource"), "pageSize", s.get("pageSize"))
    for e in [x for x in evs if x["ev"] == "backend_switch"]: print("backend_switch:", e["from"], "->", e["to"])
    for e in ends: print(f"{e['ev']}: wall {ms(e.get('wallMs'))/1000:.1f}s", {k: e[k] for k in ("message", "heapMB", "gcs", "gcTime") if k in e})
    if not pages: print("no page events"); return
    rows = sum(p.get("rows", 0) for p in pages)
    tot = {k: sum(ms(p.get(k)) for p in pages) for k in ("networkMs", "parseMs", "mapMs", "writeMs", "persistMs")}
    serial = sum(ms(p.get("networkMs")) + ms(p.get("persistMs")) for p in pages)
    pipelined = sum(max(ms(p.get("networkMs")), ms(p.get("persistMs"))) for p in pages)
    over60 = [p for p in pages if ms(p.get("networkMs")) > 60000]
    maxnet = max(ms(p.get("networkMs")) for p in pages)
    print(f"\npages: {len(pages)}   rows: {rows}   rows/page mean: {rows/len(pages):.0f}")
    print("phase totals (s) and ms/row:")
    for k, v in tot.items():
        print(f"  {k:10s} {v/1000:9.1f}s   {v/rows if rows else 0:7.2f} ms/row")
    dev = tot["parseMs"] + tot["mapMs"] + tot["writeMs"]
    print(f"  device (parse+map+write) {dev/1000:.1f}s  {dev/rows if rows else 0:.2f} ms/row   vs network {tot['networkMs']/rows if rows else 0:.2f} ms/row")
    print(f"serial sum net+persist: {serial/1000:.1f}s   pipelined estimate sum max(net,persist): {pipelined/1000:.1f}s   ({100*(1-pipelined/serial) if serial else 0:.0f}% less)")
    print(f"requests > 60s: {len(over60)}   slowest request: {maxnet/1000:.1f}s")
    heaps = [p.get("heapMB") for p in pages if isinstance(p.get("heapMB"), (int, float))]
    if heaps: print(f"hermes heap MB: max {max(heaps):.0f}  last {heaps[-1]:.0f}   gcs last {pages[-1].get('gcs')}  gcTime last {pages[-1].get('gcTime')}")
    if bulks:
        print(f"bulk: {len(bulks)} calls  flatten {sum(ms(b.get('flattenMs')) for b in bulks)/1000:.1f}s  exec {sum(ms(b.get('execMs')) for b in bulks)/1000:.1f}s  cmds {sum(b.get('cmds',0) for b in bulks)}")
    for k in ("idx_drop", "idx_recreate", "ref_cache"):
        for e in [x for x in evs if x["ev"] == k]: print(f"{k}:", {kk: e[kk] for kk in e if kk not in ("t", "ev", "run")})
    by = defaultdict(lambda: defaultdict(float))
    for p in pages:
        b = by[p["entity"]]; b["rows"] += p.get("rows", 0); b["pages"] += 1
        for k in ("networkMs", "parseMs", "mapMs", "writeMs"): b[k] += ms(p.get(k))
    print("\ntop entities by device time (parse+map+write):")
    print(f"  {'entity':28s} {'pages':>5s} {'rows':>7s} {'net s':>7s} {'parse s':>7s} {'map s':>7s} {'write s':>7s} {'dev ms/row':>10s}")
    for ent, b in sorted(by.items(), key=lambda kv: -(kv[1]['parseMs'] + kv[1]['mapMs'] + kv[1]['writeMs']))[:12]:
        d = b["parseMs"] + b["mapMs"] + b["writeMs"]
        print(f"  {ent:28s} {int(b['pages']):5d} {int(b['rows']):7d} {b['networkMs']/1000:7.1f} {b['parseMs']/1000:7.1f} {b['mapMs']/1000:7.1f} {b['writeMs']/1000:7.1f} {d/b['rows'] if b['rows'] else 0:10.2f}")
    peak_pss = None
    if pss and os.path.exists(pss):
        vals = [int(m.group(1)) for line in open(pss) for m in [re.search(r"TOTAL PSS:\s+(\d+)|TOTAL:?\s+(\d+)", line)] if m and m.group(1)]
        if vals: peak_pss = max(vals) // 1024; print(f"\npeak PSS: {peak_pss} MB")
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(log))), "summary.csv")
    new = not os.path.exists(out)
    with open(out, "a", newline="") as f:
        w = csv.writer(f)
        if new: w.writerow(["run", "outcome", "wall_s", "pages", "rows", "net_s", "parse_s", "map_s", "write_s", "persist_s", "dev_ms_per_row", "net_ms_per_row", "pipelined_est_s", "over60", "max_req_s", "heap_max_mb", "peak_pss_mb", "log"])
        end = ends[-1] if ends else {}
        w.writerow([run, end.get("ev", "incomplete"), round(ms(end.get("wallMs"))/1000), len(pages), rows, *(round(tot[k]/1000, 1) for k in ("networkMs", "parseMs", "mapMs", "writeMs", "persistMs")),
                    round(dev/rows, 2) if rows else "", round(tot["networkMs"]/rows, 2) if rows else "", round(pipelined/1000), len(over60), round(maxnet/1000, 1), round(max(heaps)) if heaps else "", peak_pss or "", os.path.dirname(os.path.abspath(log)).split("/")[-1]])
    print(f"appended to {out}")

if __name__ == "__main__":
    main(*sys.argv[1:])
