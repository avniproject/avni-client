# Tanuh oral-cancer ensemble — on-device parity harness

Proves the corrected on-device preprocessing + 3-fold ensemble reproduces TANUH's
clinically-validated per-model scores, by running the **real** app path on an emulator and
diffing per-model sigmoids against TANUH's reference xlsx. This is the numerical-equivalence
evidence for **avni-client#1985** (design: `avni-product-ops/analysis/tanuh-ensemble-inference-logic/`).

## Acceptance bar

**Probability-score parity** — per-model **sigmoid** matched against the xlsx, not just the
refer/no-refer verdict (TANUH-confirmed, doc §4g, 9 Jul):

- band: absolute diff **avg 1e-7–1e-5, max 1e-4–1e-2, min 0**
- concrete gate (`report.py`): **max |per-model sigmoid diff| < 1e-2 AND 0 images ≥ 1e-2**, with
  per-image AND-verdict parity vs the reference.

## Data governance — non-negotiable

`avni-client` is a **public** repo. The model folds (`.onnx`/`.pt`), the patient images (`.jpg`),
TANUH's `true_label_model_output_probabilities.xlsx`, and any **derived** per-image score file are
**never** committed — only harness *code* is. Enforcement is layered and branch-independent:
`.gitignore` + `.git/info/exclude` + local `pre-commit`/`pre-push` hooks + a narrow CI diff-guard +
a runtime guard that refuses fixtures located inside the repo tree.

- **`$TANUH_FIXTURES` MUST be external to the repo** (e.g. `/Users/himeshr/Avni/Tanuh`). `run-parity.sh`
  aborts otherwise.
- `out/`, `.venv/`, and `fixtures/` under this dir are gitignored. Derived scores go back to TANUH,
  never to the repo.

Install the branch-independent guards once per clone:

```bash
bash tools/edge-model/verify/install-guards.sh
```

## Run sequence

```bash
export TANUH_FIXTURES=/Users/himeshr/Avni/Tanuh
bash tools/edge-model/verify/install-guards.sh            # once per clone

# 1. Regenerate the bundled registry from the corrected override + the 3 folds:
make tanuh-ensemble TANUH_ENSEMBLE_SRC_DIR="$TANUH_FIXTURES/tanuh_models/ensemble_src"

# 2. Build + install the tanuh integration-test build (renders IntegrationTestApp) on an
#    API <= 36 emulator (API 37 crashes the app — Hermes SIGSEGV). See tools/edge-model/README.md.
#    Launch it and run the "EdgeModelParityIntegrationTest" from the rendered list.

# 3. Push the 90 images, run the sweep, pull results (device only):
bash tools/edge-model/verify/run-parity.sh

# 4. Diff device scores vs the xlsx → out/summary.md + PASS/FAIL (exit 0 = PASS):
python3 -m venv tools/edge-model/verify/.venv && tools/edge-model/verify/.venv/bin/pip install openpyxl
tools/edge-model/verify/.venv/bin/python tools/edge-model/verify/report.py
```

## What each piece does

| File | Role |
|---|---|
| `../../../packages/openchs-android/integrationTest/EdgeModelParityIntegrationTest.js` | Runs inside the real app: every staged image → real `EdgeModelService.runInferenceOnImage` → corrected Kotlin preprocessing → ONNX-Runtime-Mobile; writes per-model sigmoids to `per_model_scores.csv` via `react-native-fs`. |
| `run-parity.sh` | adb driver: refuses in-repo fixtures, pushes the 90 images (jpgs only), waits for the on-device run, pulls the results CSV. |
| `report.py` | Joins device scores to the xlsx, computes per-model max/mean diff, emits `out/summary.md` + `out/per_image_scores.csv`, exits 0 iff PASS. Skips images whose xlsx reference is incomplete (surfaced in the summary). |
| `guard-no-proprietary.sh`, `hooks/`, `install-guards.sh` | The data-governance layer (see above). |

## Notes

- The reference xlsx is a superset (all TANUH test images); the reporter joins on the images actually
  present locally. Of the 90 shipped verification images, **89** have complete reference scores (one
  lacks `model6`); that image is skipped and reported, so expect **89** joined.
- Models are **not** pushed — they ride in the tanuh build's bundled registry (step 1). The harness is
  delivery-agnostic (bundled now, remote-fetched later).
