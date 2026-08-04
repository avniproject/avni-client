# Tanuh oral-cancer ensemble — on-device parity harness

Proves the corrected on-device preprocessing + 3-fold ensemble reproduces TANUH's
clinically-validated per-model scores, by running the **real** app path on an emulator and
diffing per-model sigmoids against TANUH's reference xlsx. This is the numerical-equivalence
evidence for **avni-client#1985** (design: `avni-product-ops/analysis/tanuh-ensemble-inference-logic/`).

## Acceptance bar

**Verdict-level parity** — the run passes when every image's refer / no-refer call matches the
reference sheet. That is the gate in `report.py` and its exit code.

### Settled 2026-07-17 — do not reopen

The bar was originally per-model **sigmoid** parity within TANUH's §4g band (avg 1e-7–1e-5,
max 1e-4–1e-2, confirmed 9 Jul). **That band cannot hold on a device**, and the reason is not the
Avni pipeline: Android's Skia JPEG decoder rounds ±1 grey level differently from desktop
libjpeg/OpenCV, and MobileViT-v2 amplifies a single grey-level change into a logit swing of up to
~1.0 (sigmoid ~0.4) on a borderline image. The 13 Jul emulator run measured a worst per-model gap of
**6.9e-2** — ~7× the band — while every one of the 89 comparable verdicts matched.

TANUH accepted this on **2026-07-17** ("TANUH AI on Avni" §6, *Resolved*): verdict-level parity is
the bar, because unanimous-AND is itself the protection for borderline cases, and ±1-LSB input
robustness is TANUH's to close in model development.

The per-model sigmoid table is still computed and printed as evidence, with the 1e-2 band shown for
reference — **it is informational and must not gate the run**. Gating on it would fail every good
build. If you are here because a run reported a large per-model diff: that is expected; check the
verdict line.

## Data governance — non-negotiable

`avni-client` is a **public** repo. The model folds (`.onnx`/`.pt`), the patient images (`.jpg`),
TANUH's `true_label_model_output_probabilities.xlsx`, and any **derived** per-image score file are
**never** committed — only harness *code* is. Enforcement is layered and branch-independent:
`.gitignore` + `.git/info/exclude` + local `pre-commit`/`pre-push` hooks + a narrow CI diff-guard +
a runtime guard that refuses fixtures located inside the repo tree.

- **`$TANUH_FIXTURES` MUST be external to the repo** (e.g. `/Users/himeshr/Avni/Tanuh`). `run-parity.sh`
  aborts otherwise.
- Both scripts hardcode the layout below, so `$TANUH_FIXTURES` is the directory *containing*
  `tanuh_test_data/`. TANUH's zip unpacks as `Data_models_protocol_for_testing_AI_model_integrations/`
  with no `tanuh_test_data/` parent — create that level (or symlink into it) or the xlsx lookup and
  the image push both miss:

  ```
  $TANUH_FIXTURES/tanuh_test_data/Data_models_protocol_for_testing_AI_model_integrations/Test data/
      ├── true_label_model_output_probabilities.xlsx
      ├── test_images_suspicious/        45 images
      └── test_images_nonsuspicious/     45 images
  ```
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

# 1a. Encrypt the 3 folds into the staging dir — blobs (models/<sha256>.bin), manifest.json
#     (reference-data items, no key) and keys.json (key-store input, never committed/uploaded):
make tanuh-ensemble TANUH_ENSEMBLE_SRC_DIR="$TANUH_FIXTURES/tanuh_models/ensemble_src"

# 1b. Provision those artefacts as DownloadableContent. Nothing is bundled into the app on 17.x,
#     so this is what puts the model on the device. Full procedure (GCS storage target, blob
#     upload, reference-data record, AES key into the server key store):
#         avni-product-ops/sops/runbook-edge-model-provisioning.md
#     Per fold: upload models/<sha256>.bin, register the item with category=edgeModel +
#     needsKey=true + payload from manifest.json, and set the matching key under the same sha256.

# 2. Install the NORMAL tanuh build first, log in, and sync until the folds are cached.
#    IntegrationTestApp renders only a test list — it has no login or sync UI — so the model
#    must already be on device before you swap to it.
#    Confirm: adb shell ls /sdcard/Android/data/<pkg>/files/Avni/models  → 3 <sha256>.bin files.

# 3. Swap the RN entry point (there is no integration build variant — it is a manual edit):
#      packages/openchs-android/index.android.js
#        - comment out:  import App from "./src/Avni";
#        - uncomment:    import App from "./integrationTest/IntegrationTestApp";
#    Rebuild and install OVER the existing app — do NOT uninstall, that wipes the cached
#    models (external files dir) and the AES keys, and the test build cannot re-sync them.
#    Use an API <= 36 emulator (API 37 crashes the app — Hermes SIGSEGV).
#    Launch it and run "EdgeModelParityIntegrationTest" from the rendered list — use the Run button
#    on the runParitySweep row (the class-level Run does the same thing here; the class has exactly
#    one test method). Revert index.android.js when finished.

# 4. Push the 90 images, wait for the on-device run, pull the results:
bash tools/edge-model/verify/run-parity.sh

# 5. Diff device scores vs the xlsx → out/summary.md + PASS/FAIL (exit 0 = PASS):
python3 -m venv tools/edge-model/verify/.venv && tools/edge-model/verify/.venv/bin/pip install openpyxl
tools/edge-model/verify/.venv/bin/python tools/edge-model/verify/report.py
```

## What each piece does

| File | Role |
|---|---|
| `../../../packages/openchs-android/integrationTest/EdgeModelParityIntegrationTest.js` | Runs inside the real app: every staged image → real `EdgeModelService.runEnsembleInferenceOnImage` → corrected Kotlin preprocessing → ONNX-Runtime-Mobile; writes per-model sigmoids to `per_model_scores.csv` plus the column→sha256 `fold-mapping.csv`, via `react-native-fs`. |
| `run-parity.sh` | adb driver: refuses in-repo fixtures, pushes the 90 images (jpgs only), waits for the on-device run, pulls the results CSV + fold mapping. |
| `report.py` | Joins device scores to the xlsx, computes per-model max/mean diff, emits `out/summary.md` + `out/per_image_scores.csv`, exits 0 iff PASS. Skips images whose xlsx reference is incomplete (surfaced in the summary). |
| `guard-no-proprietary.sh`, `hooks/`, `install-guards.sh` | The data-governance layer (see above). |

## Notes

- The reference xlsx is a superset (all TANUH test images); the reporter joins on the images actually
  present locally. Of the 90 shipped verification images, **89** have complete reference scores (one
  lacks `model6`); that image is skipped and reported, so expect **89** joined.
- Models are **not** pushed by this harness — the build is model-free and the folds arrive via synced
  `DownloadableContent`. The harness is delivery-agnostic; it only needs the folds cached on device.
- The sweep necessarily reads the **on-device cache**, never app assets: it calls
  `EdgeModelService.runEnsembleInferenceOnImage`, which resolves folds from synced content rows and
  loads each from `FileSystem.getModelsDir()/<sha256>.bin`. No asset-loading path exists on 17.x
  (#1947 removed the native loaders), so a sweep cannot silently pass by testing a bundled model —
  an unsynced device fails loudly with "model blob not cached yet" instead.
- Folds are addressed by sha256, which carries no fold identity, so `model6`/`model8`/`model8-2` are
  assigned by sha-sorted position. Check `out/fold-mapping.csv` against what was provisioned before
  trusting a per-model diff — a mis-provisioned fold otherwise shows up as a plausible wrong column.
