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
echo "→ pushing verification images to $DEVBASE/images (device only; models ride in the APK; nothing enters the repo)"
adb shell "mkdir -p $DEVBASE/images $DEVBASE/out"
# The 90 verification images live in test_images_suspicious/ + test_images_nonsuspicious/ (unique
# UUID basenames), so collect recursively into a flat temp dir and push jpgs only — never the xlsx.
TMPIMG=$(mktemp -d); find "$IMAGES" -type f -iname '*.jpg' -exec cp {} "$TMPIMG/" \;
n_img=$(find "$TMPIMG" -type f -iname '*.jpg' | wc -l | tr -d ' ')
adb push "$TMPIMG/." "$DEVBASE/images/" >/dev/null; rm -rf "$TMPIMG"
echo "  pushed $n_img images"

echo "→ launch the integration-test app and run 'EdgeModelParityIntegrationTest'."
echo "   LOOKUP (bounded): how this repo launches IntegrationTestApp — an integration build variant /"
echo "   alternate RN index / dev entry. Run the parity test from the rendered list; it writes"
echo "   per_model_scores.csv to the device. (Optional: auto-run it by guarding the commented-out"
echo "   this.integrationTestRunner.run(...) at IntegrationTestApp.componentDidMount.)"
read -r -p "   Press ENTER once the parity test shows green on the device… "

echo "→ pulling results"
adb pull "$DEVBASE/out/per_model_scores.csv" "$OUT/per_model_scores.csv"
echo "✓ wrote $OUT/per_model_scores.csv (gitignored)"
