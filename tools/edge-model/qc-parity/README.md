# QC preprocessing parity

Keeps the app's on-device preprocessing for the MViT2 3-fold ensemble identical to the QC
team's reference notebook (`TANUH_QC/OCS_blackbox.ipynb`, Oct 2026), whose scores are in
`benchmarking_model_scores_127Images.xlsx`.

## What the QC pipeline does (and the override params that select it)

| Step | QC notebook | `tanuh-ensemble-override.json` |
|---|---|---|
| Resize | aspect-preserving `cv2.INTER_CUBIC`, longer side → 256 | `"interpolation": "cubic"` (bit-exact port in `PixelOps.resizeCubicCv`) |
| Pad | centre on a black 256×256 canvas | `"resize_mode": "letterbox"`, `"pad_value": 0` |
| White balance | per-channel mean → 128 over the **whole canvas incl. padding** | `"mean_target": 128` |
| Clip / round / cast | clip 0–255, `np.round(x,1)`, `convertScaleAbs` (half-to-even, float32) | `"round_decimals": 1`, `"rounding": "numpy"` |
| Tensor | ÷255, BGR planes, CHW | `"scale": 1/255`, `"channel_order": "BGR"`, `"layout": "CHW"` |
| Decision | `sigmoid >= 0.50` → Suspicious; composite = all 3 agree | `output.params`: `"threshold": 0.5`, `"threshold_inclusive": true`, `"combine": "unanimous-and"` |

Before Oct 2026 the app used `"resize_mode": "stretch"` (straight resize to 256×256) and
round-half-up. On square photos that is nearly identical; on 4:3 / 3:4 photos (what phone
cameras actually produce) it changed ~17 % of per-model decisions in our test.
Old app builds ignore the new params (they fall back to stretch/legacy), so ship the app
update before (or with) re-provisioning the override.

## Files

| File | Purpose |
|---|---|
| `qc_reference.py` | Verbatim copy of the notebook's `preprocess_image`. Source of truth — update it when QC changes the notebook. |
| `gen_fixtures.py` | Regenerates `src/test/resources/qc-parity/manifest.txt`: geometry + SHA-256 of the cv2/numpy outputs for integer-generated synthetic inputs (no image files or patient photos in git). `--debug-png DIR` writes the reference PNGs locally for inspecting a mismatch. |
| `run_device_benchmark.sh` | Installs the tanuhDebug app + test APK, pushes models/images, runs `QcBenchmarkInstrumentedTest` on the phone, pulls scores and runs the comparison. |
| `compare_app_vs_qc.py` | App scores vs the QC sheet: metrics, decision flips, Δprob; tensor-level diff against `qc_reference.py`. Exit 0 = PASS. |

## 1. JVM unit test (no device)

```
cd packages/openchs-android/android
./gradlew :app:testTanuhDebugUnitTest --tests 'com.openchsclient.preprocessing.QcParityPreprocessTest'
```
Inputs are generated in the test from the same integer formula as `gen_fixtures.py`; asserts **bit-exact** equality (matching SHA-256) with cv2/numpy for square, 4:3, 3:4, odd-size, SIMD-tail and
up-scaling cases (letterbox geometry, cubic resize, final tensor), plus half-to-even rounding.

## 2. On-device benchmark (phone or emulator via adb)

```
make tanuh-qc-benchmark          # or: tools/edge-model/qc-parity/run_device_benchmark.sh [IMAGES] [MODELS] [XLSX]
```
Defaults: images `~/TANUH/TANUH_QC/OCS_Benchmarking_images`, models `~/Desktop/tanuh/assets/ml`
(plaintext ONNX, renamed to model6/model8/model82), sheet
`~/TANUH/TANUH_QC/benchmarking_model_scores_127Images.xlsx`. Output in `qc-parity/out/<timestamp>/`.

Expected: 0 decision flips, max |Δprob| ≲ 1e-4 (ORT Mobile vs PyTorch). If the tensor
comparison shows small differences, the cause is JPEG decoding (Android `BitmapFactory` vs
`cv2.imread`), not the preprocessing math.

To test an alternative override: `OVERRIDE=path/to/override.json make tanuh-qc-benchmark`.

## 3. Ship

1. Merge the app change (preprocessor support for `resize_mode` / `rounding`).
2. `make tanuh-ensemble` — re-encrypts the folds with the updated override, then re-provision
   the reference-data items (the override travels in the synced payload, not the APK).
