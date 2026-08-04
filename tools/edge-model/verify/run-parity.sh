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
# Written by EdgeModelParityIntegrationTest — keep both names in step with that file.
COMPLETE="run-complete.json"
FAILED="run-failed.txt"
# A sweep of 90 images on an emulator runs well under this; raise it for a slower device.
TIMEOUT_SECONDS="${PARITY_TIMEOUT_SECONDS:-2400}"
POLL_SECONDS="${PARITY_POLL_SECONDS:-10}"

adb get-state >/dev/null 2>&1 || { echo "❌ no device/emulator (adb get-state)"; exit 1; }
echo "→ pushing verification images to $DEVBASE/images (device only; nothing enters the repo)"
echo "   NOTE: models are provisioned by sync, not bundled — sync the device before running the sweep,"
echo "   or every fold fails with 'model blob not cached yet'."
# Clear both dirs before staging anything. A previous run's per_model_scores.csv is still on the
# device, and pulling it as though it were this run's result is exactly the failure this guards.
adb shell "rm -rf $DEVBASE/images $DEVBASE/out"
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
echo
echo "→ waiting for the sweep to finish (polling every ${POLL_SECONDS}s, up to ${TIMEOUT_SECONDS}s)."
# NOT waiting for green. IntegrationTestRunner does not await the test, so the row turns green at the
# first await inside runParitySweep — before any image is scored — and a throw in there rejects a
# floating promise the runner never sees. The sweep writes $COMPLETE as its very last statement and
# $FAILED if it threw; those are the only honest signals. See avni-client#2035.
deadline=$(( SECONDS + TIMEOUT_SECONDS ))
sentinel=""
while :; do
  # `|| true`: adb propagates cat's exit code, and a not-yet-written sentinel is the normal case —
  # without it `set -e` aborts the poll on the first tick.
  failure="$(adb shell "cat $DEVBASE/out/$FAILED 2>/dev/null" 2>/dev/null | tr -d '\r' || true)"
  if [ -n "$failure" ]; then
    echo "❌ the sweep failed on the device:" >&2
    echo "$failure" >&2
    exit 1
  fi
  sentinel="$(adb shell "cat $DEVBASE/out/$COMPLETE 2>/dev/null" 2>/dev/null | tr -d '\r' || true)"
  # Only trust a sentinel that arrived whole — the poll can catch a partial write.
  case "$sentinel" in *'}') break;; esac
  sentinel=""
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "❌ no completion sentinel after ${TIMEOUT_SECONDS}s. The sweep never finished — a green row" >&2
    echo "   on the device does not mean it did. Check the device log, then re-run this script." >&2
    echo "   Raise the wait with PARITY_TIMEOUT_SECONDS if the device is genuinely just slow." >&2
    exit 1
  fi
  sleep "$POLL_SECONDS"
done

n_rows="$(printf '%s' "$sentinel" | sed -n 's/.*"rows":[[:space:]]*\([0-9][0-9]*\).*/\1/p')"
[ -n "$n_rows" ] || { echo "❌ unreadable completion sentinel: $sentinel" >&2; exit 1; }
if [ "$n_rows" -ne "$n_img" ]; then
  echo "❌ the sweep scored $n_rows of the $n_img images pushed. A report over the subset would call" >&2
  echo "   the run a pass on whatever survived — refusing to collect it." >&2
  exit 1
fi
echo "  sweep finished: $n_rows rows"

echo "→ pulling results"
adb pull "$DEVBASE/out/per_model_scores.csv" "$OUT/per_model_scores.csv"
# Column order comes from a sha256 sort that carries no fold identity — pull the mapping so the
# model6/model8/model8-2 attribution can be checked against what was actually provisioned.
adb pull "$DEVBASE/out/fold-mapping.csv" "$OUT/fold-mapping.csv"
echo "✓ wrote $OUT/per_model_scores.csv + fold-mapping.csv (gitignored), $n_rows rows"
