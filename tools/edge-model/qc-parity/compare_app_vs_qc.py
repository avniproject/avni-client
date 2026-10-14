#!/usr/bin/env python3
"""
Compare on-device scores (results.csv from QcBenchmarkInstrumentedTest) with the QC team's
benchmark sheet (benchmarking_model_scores_127Images.xlsx, Results tab), and optionally the
app's preprocessed tensors with the QC reference preprocessing (qc_reference.py).

  python3 compare_app_vs_qc.py --results out/<ts>/results.csv \
      --xlsx ~/TANUH/TANUH_QC/benchmarking_model_scores_127Images.xlsx \
      [--images ~/TANUH/TANUH_QC/OCS_Benchmarking_images --tensors out/<ts>/tensors] \
      [--out out/<ts>/report.csv] [--prob-tol 1e-3]

Exit code 0 = PASS (no per-model or composite decision differs and max |Δprob| <= prob-tol).
Requires: openpyxl, numpy (and opencv-python for --tensors).
"""
import argparse
import csv
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
import openpyxl

THRESH = 0.5


def load_app(path):
    """Probabilities, folder labels and — when the harness wrote it — the app decoder's own decision."""
    scores, positive = defaultdict(dict), defaultdict(dict)
    labels = {}
    with open(path, newline="") as f:
        for r in csv.DictReader(f):
            p = float(r["probability"])
            scores[r["image_id"]][r["model"]] = p
            positive[r["image_id"]][r["model"]] = (r["app_positive"] == "1") if r.get("app_positive") not in (None, "") else p >= THRESH
            labels[r["image_id"]] = r["label"]
    return scores, labels, positive


def load_qc(path):
    ws = openpyxl.load_workbook(path, read_only=True, data_only=True)["Results"]  # never written
    rows = list(ws.iter_rows(values_only=True))
    hdr = list(rows[0])
    models = [h for h in hdr[2:] if h and not str(h).endswith("Prediction") and h != "Error"]
    scores, labels = {}, {}
    for r in rows[1:]:
        if not r[0]:
            continue
        rec = dict(zip(hdr, r))
        labels[str(rec["Image ID"])] = rec["Suspicious"]
        scores[str(rec["Image ID"])] = {m: float(rec[m]) for m in models if rec.get(m) is not None}
    return scores, labels, models


def metrics(ids, labels, pred):
    tp = fn = tn = fp = 0
    for i in ids:
        s = labels[i] == "Suspicious"
        p = pred(i)
        tp += s and p; fn += s and not p; tn += (not s) and (not p); fp += (not s) and p
    sens = tp / (tp + fn) if tp + fn else float("nan")
    spec = tn / (tn + fp) if tn + fp else float("nan")
    acc = (tp + tn) / len(ids) if ids else float("nan")
    return tp, fn, tn, fp, sens, spec, acc


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", required=True)
    ap.add_argument("--xlsx", required=True)
    ap.add_argument("--images")
    ap.add_argument("--tensors")
    ap.add_argument("--out")
    ap.add_argument("--prob-tol", type=float, default=1e-3)
    a = ap.parse_args()

    app, app_labels, app_pos = load_app(a.results)
    qc, qc_labels, qc_models = load_qc(a.xlsx)
    models = [m for m in qc_models if any(m in v for v in app.values())]
    ids = sorted(set(app) & set(qc))
    missing = sorted(set(qc) - set(app))
    if not models or not ids:
        sys.exit(f"Nothing to compare: models={models} common images={len(ids)}")
    for i in ids:
        if app_labels[i] != qc_labels[i]:
            print(f"WARNING: label mismatch for {i}: app folder {app_labels[i]} vs sheet {qc_labels[i]}")

    print(f"Images compared: {len(ids)}   models: {', '.join(models)}"
          + (f"   (missing on device: {len(missing)})" if missing else ""))
    print(f"\n{'':24s}{'source':6s} {'TP':>4s}{'FN':>4s}{'TN':>4s}{'FP':>4s} {'Sens':>7s}{'Spec':>7s}{'Acc':>7s}")
    qc_pos = {i: {m: qc[i][m] >= THRESH for m in models} for i in ids}   # notebook: score >= 0.50 -> Suspicious
    for m in models + ["composite (AND)"]:
        for src, pos in (("QC", qc_pos), ("APP", app_pos)):
            if m in models:
                pred = (lambda i, pos=pos, m=m: pos[i][m])
            else:
                pred = (lambda i, pos=pos: all(pos[i][k] for k in models))
            tp, fn, tn, fp, se, sp, ac = metrics(ids, qc_labels, pred)
            print(f"{m if src == 'QC' else '':24s}{src:6s} {tp:4d}{fn:4d}{tn:4d}{fp:4d} {se:7.1%}{sp:7.1%}{ac:7.1%}")

    diffs, flips, cflips, rows = [], [], [], []
    for i in ids:
        row = {"image_id": i, "label": qc_labels[i]}
        for m in models:
            d = abs(app[i][m] - qc[i][m]); diffs.append(d)
            flip = app_pos[i][m] != qc_pos[i][m]
            if flip:
                flips.append((i, m, qc[i][m], app[i][m]))
            row.update({f"{m}_qc": qc[i][m], f"{m}_app": app[i][m], f"{m}_absdiff": d, f"{m}_flip": int(flip)})
        cq = all(qc_pos[i][m] for m in models); ca = all(app_pos[i][m] for m in models)
        row.update({"composite_qc": int(cq), "composite_app": int(ca), "composite_flip": int(cq != ca)})
        if cq != ca:
            cflips.append(i)
        rows.append(row)

    rule_mismatch = sum(app_pos[i][m] != (app[i][m] >= THRESH) for i in ids for m in models)
    if rule_mismatch:
        print(f"WARNING: app decoder decision differs from 'probability >= 0.5' for {rule_mismatch} model runs "
              "(check output.params.threshold / threshold_inclusive in the override)")
    d = np.array(diffs)
    print(f"\n|Δprobability| app vs QC: max {d.max():.3g}   p99 {np.percentile(d, 99):.3g}   median {np.median(d):.3g}")
    print(f"Per-model decision flips: {len(flips)} / {len(diffs)}    composite flips: {len(cflips)} / {len(ids)}")
    for i, m, q, p in flips:
        print(f"   flip  {i}  {m}: QC {q:.4f} → APP {p:.4f}")

    if a.tensors and a.images:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        import qc_reference as qcr
        files = {p.stem: p for p in Path(a.images).glob("*/*") if p.is_file()}
        tmax, tbad, tn = 0, 0, 0
        by_id = {r["image_id"]: r for r in rows}
        for i in ids:
            tf = Path(a.tensors) / f"{i}.u8"
            if not tf.exists() or i not in files:
                continue
            got = np.fromfile(tf, dtype=np.uint8).astype(np.int16)
            want = np.rint(qcr.preprocess_path(files[i]).ravel() * 255).astype(np.int16)
            if got.size != want.size:
                print(f"   tensor size mismatch for {i}: {got.size} vs {want.size}")
                continue
            dd = np.abs(got - want); n_bad = int((dd > 0).sum())
            by_id[i]["tensor_values_differing"] = n_bad; by_id[i]["tensor_max_diff_u8"] = int(dd.max())
            tmax = max(tmax, int(dd.max())); tbad += n_bad; tn += 1
        if tn:
            print(f"\nPreprocessed tensors vs qc_reference ({tn} images): "
                  f"values differing {tbad} / {tn * 3 * 256 * 256}  max diff {tmax}/255")
            if tbad:
                print("   (non-zero here with identical Kotlin math ⇒ JPEG decode differs: Android BitmapFactory vs cv2.imread)")

    if a.out:
        keys = list(dict.fromkeys(k for r in rows for k in r))
        with open(a.out, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=keys); w.writeheader(); w.writerows(rows)
        print(f"\nPer-image report: {a.out}")

    ok = not flips and not cflips and d.max() <= a.prob_tol
    print("\nRESULT:", "PASS — app matches the QC benchmark" if ok else
          f"CHECK — differences above (prob tol {a.prob_tol})")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
