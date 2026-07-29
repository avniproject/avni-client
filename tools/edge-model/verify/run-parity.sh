#!/usr/bin/env bash
set -euo pipefail
: "${TANUH_FIXTURES:?Set TANUH_FIXTURES to the EXTERNAL fixtures dir, e.g. /Users/himeshr/Avni/Tanuh}"
repo_root="$(git rev-parse --show-toplevel)"
fx_real="$(cd "$TANUH_FIXTURES" && pwd -P)"
case "$fx_real/" in
  "$repo_root"/*) echo "❌ TANUH_FIXTURES ($fx_real) is INSIDE the repo tree. Proprietary data must live outside the repo. Aborting." >&2; exit 1;;
esac
echo "✓ fixtures are external to the repo: $fx_real"

PKG="${TANUH_PKG:-org.tanuh.openchsclient}"
IMAGES="$TANUH_FIXTURES/tanuh_test_data/Data_models_protocol_for_testing_AI_model_integrations/Test data"
DEVBASE="/sdcard/Android/data/$PKG/files/parity"     # = RNFS.ExternalDirectoryPath/parity
OUT="$repo_root/tools/edge-model/verify/out"; mkdir -p "$OUT"

adb get-state >/dev/null 2>&1 || { echo "❌ no device/emulator (adb get-state)"; exit 1; }
echo "→ pushing verification images to $DEVBASE/images (device only; nothing enters the repo)"
echo "   NOTE: models are provisioned by sync, not bundled — sync the device before running the sweep,"
echo "   or every fold fails with 'model blob not cached yet'."
adb shell "mkdir -p $DEVBASE/images $DEVBASE/out"
# The 90 verification images live in test_images_suspicious/ + test_images_nonsuspicious/ (unique
# UUID basenames), so collect recursively into a flat temp dir and push jpgs only — never the xlsx.
TMPIMG=$(mktemp -d); find "$IMAGES" -type f -iname '*.jpg' -exec cp {} "$TMPIMG/" \;
n_img=$(find "$TMPIMG" -type f -iname '*.jpg' | wc -l | tr -d ' ')
adb push "$TMPIMG/." "$DEVBASE/images/" >/dev/null; rm -rf "$TMPIMG"
echo "  pushed $n_img images"

echo "→ launch the integration-test app and run 'EdgeModelParityIntegrationTest'."
echo "   There is no integration build variant: swap the RN entry point by hand in"
echo "   packages/openchs-android/index.android.js — comment out the './src/Avni' import and"
echo "   uncomment './integrationTest/IntegrationTestApp' — then rebuild and install OVER the"
echo "   existing app (uninstalling wipes the cached models and keys; the test build cannot"
echo "   re-sync them). Run the parity test from the rendered list; it writes"
echo "   per_model_scores.csv to the device. Revert index.android.js afterwards."
read -r -p "   Press ENTER once the parity test shows green on the device… "

echo "→ pulling results"
adb pull "$DEVBASE/out/per_model_scores.csv" "$OUT/per_model_scores.csv"
# Column order comes from a sha256 sort that carries no fold identity — pull the mapping so the
# model6/model8/model8-2 attribution can be checked against what was actually provisioned.
adb pull "$DEVBASE/out/fold-mapping.csv" "$OUT/fold-mapping.csv"
echo "✓ wrote $OUT/per_model_scores.csv + fold-mapping.csv (gitignored)"
