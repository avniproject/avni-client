#!/usr/bin/env bash
# Run the QC benchmark images through the app's real on-device pipeline (decode + EXIF +
# override preprocessor + ONNX Runtime Mobile) and compare against the QC team's scores.
#
# Usage (from anywhere; a device/emulator must be visible to `adb devices`):
#   tools/edge-model/qc-parity/run_device_benchmark.sh [IMAGES_DIR] [MODELS_DIR] [QC_XLSX]
#
# Defaults:
#   IMAGES_DIR = ~/TANUH/TANUH_QC/OCS_Benchmarking_images        (Suspicious/ and Non-Suspicious/ inside)
#   MODELS_DIR = ~/Desktop/tanuh/assets/ml                         (plaintext ONNX folds)
#   QC_XLSX    = ~/TANUH/TANUH_QC/benchmarking_model_scores_127Images.xlsx
# Env:
#   OVERRIDE=tools/edge-model/tanuh-ensemble-override.json   override (preprocessing params) to test
#   SKIP_INSTALL=1     reuse the already-installed tanuhDebug + androidTest APKs
#   DUMP_TENSORS=false skip per-image tensor dumps (faster; disables the tensor-level comparison)
# Output: tools/edge-model/qc-parity/out/<timestamp>/{results.csv,tensors/,report.csv,instrument.log}
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
IMAGES="${1:-$HOME/TANUH/TANUH_QC/OCS_Benchmarking_images}"
MODELS="${2:-$HOME/Desktop/tanuh/assets/ml}"
XLSX="${3:-$HOME/TANUH/TANUH_QC/benchmarking_model_scores_127Images.xlsx}"
OVERRIDE="${OVERRIDE:-$REPO/tools/edge-model/tanuh-ensemble-override.json}"
DUMP_TENSORS="${DUMP_TENSORS:-true}"
APP_ID="org.tanuh.openchsclient"
TEST_PKG="$APP_ID.test"
DEV_DIR="/sdcard/Android/data/$APP_ID/files/qc-bench"
OUT="$HERE/out/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

[ -d "$IMAGES" ] || { echo "Images dir not found: $IMAGES"; exit 1; }
[ -d "$MODELS" ] || { echo "Models dir not found: $MODELS"; exit 1; }
adb get-state >/dev/null || { echo "No adb device/emulator connected."; exit 1; }

# 1. Build + install the app and the instrumentation APK.
if [ "${SKIP_INSTALL:-0}" != "1" ]; then
  (cd "$REPO/packages/openchs-android/android" && KEY_STORE_PREFIX="$REPO/" ./gradlew :app:installTanuhDebug :app:installTanuhDebugAndroidTest)
fi

# 2. Stage models under canonical names matching the xlsx columns:
#    "...(model6).onnx" → model6.onnx, "(model8)" → model8.onnx, "(model8-2)" → model82.onnx.
STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/models"
for f in "$MODELS"/*.onnx; do
  base="$(basename "$f" .onnx)"
  if [[ "$base" =~ \((model[0-9-]+)\) ]]; then name="${BASH_REMATCH[1]//-/}"; else name="$base"; fi
  case "$name" in model6|model8|model82) cp "$f" "$STAGE/models/$name.onnx"; echo "model: $(basename "$f") → $name.onnx";; *) echo "skip:  $(basename "$f")";; esac
done
[ "$(ls "$STAGE/models" | wc -l)" -gt 0 ] || { echo "No model6/model8/model8-2 ONNX files in $MODELS"; exit 1; }

# 3. Remove any previous qc-bench dir (adb-pushed files are owned by the shell user, so the app
#    may not be able to delete them), let the app create its own qc-bench dir (Android 11+ apps can't read dirs adb created for
#    them), then push override, models and images into it.
INSTR="$TEST_PKG/androidx.test.runner.AndroidJUnitRunner"
adb shell "rm -rf '$DEV_DIR'"
adb shell am instrument -w -e class com.openchsclient.QcBenchmarkInstrumentedTest#prepareQcBenchDir "$INSTR" > "$OUT/prepare.log"
if ! grep -q "OK (1 test)" "$OUT/prepare.log"; then
  cat "$OUT/prepare.log"
  echo "Could not prepare $DEV_DIR from the app. If Android/data/$APP_ID was created by adb, remove it once with:"
  echo "  adb shell rm -rf /sdcard/Android/data/$APP_ID   (then re-run; only removes the app's external files)"
  exit 1
fi
adb push "$OVERRIDE" "$DEV_DIR/override.json" >/dev/null
adb push "$STAGE/models" "$DEV_DIR/" >/dev/null
for label_dir in "$IMAGES"/*/; do
  adb push "${label_dir%/}" "$DEV_DIR/images/" >/dev/null
  echo "images: $(basename "$label_dir") ($(ls "$label_dir" | wc -l | tr -d ' '))"
done
cp "$OVERRIDE" "$OUT/override.json"

# 4. Run the harness.
echo "Running QcBenchmarkInstrumentedTest on device (a few minutes)…"
adb shell am instrument -w -r \
  -e class com.openchsclient.QcBenchmarkInstrumentedTest#runQcBenchmark \
  -e dumpTensors "$DUMP_TENSORS" \
  "$INSTR" | tee "$OUT/instrument.log"
grep -q "OK (1 test)" "$OUT/instrument.log" || { echo "Instrumented run failed — see $OUT/instrument.log and 'adb logcat -s QcBenchmark'"; exit 1; }

# 5. Pull + compare.
adb pull "$DEV_DIR/results.csv" "$OUT/" >/dev/null
[ "$DUMP_TENSORS" = "true" ] && adb pull "$DEV_DIR/tensors" "$OUT/" >/dev/null
python3 "$HERE/compare_app_vs_qc.py" --results "$OUT/results.csv" --xlsx "$XLSX" \
  --images "$IMAGES" $( [ "$DUMP_TENSORS" = "true" ] && echo --tensors "$OUT/tensors" ) --out "$OUT/report.csv"
echo "Output: $OUT"
