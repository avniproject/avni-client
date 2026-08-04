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
# Time budget for the SWEEP only. The app must already be built, installed and showing the test list
# before this script runs, so a cold Gradle build is not competing for this budget.
TIMEOUT_SECONDS="${PARITY_TIMEOUT_SECONDS:-2400}"
POLL_SECONDS="${PARITY_POLL_SECONDS:-10}"
# Re-pull a sweep that already finished, without touching the device's results.
COLLECT_ONLY="${PARITY_COLLECT_ONLY:-0}"

adb get-state >/dev/null 2>&1 || { echo "❌ no device/emulator (adb get-state)"; exit 1; }

# Stale local results are graded by report.py as though they were this run's, and every abort below
# happens before the pull — so clear them before anything can fail.
rm -f "$OUT/per_model_scores.csv" "$OUT/fold-mapping.csv"

if [ "$COLLECT_ONLY" = "1" ]; then
  echo "→ collect-only: leaving the device's images and results untouched"
  n_img=""
else
  echo "→ pushing verification images to $DEVBASE/images (device only; nothing enters the repo)"
  echo "   NOTE: models are provisioned by sync, not bundled — sync the device before running the sweep,"
  echo "   or every fold fails with 'model blob not cached yet'."
  # Clearing the device dirs is what stops a previous run's CSV being collected as this one's. It also
  # destroys a finished sweep, so re-run with PARITY_COLLECT_ONLY=1 when you only need to re-pull.
  adb shell "rm -rf $DEVBASE/images $DEVBASE/out"
  adb shell "mkdir -p $DEVBASE/images $DEVBASE/out"
  # Unique UUID basenames across the two image dirs, so flatten into a temp dir and push jpgs only.
  TMPIMG=$(mktemp -d); find "$IMAGES" -type f -iname '*.jpg' -exec cp {} "$TMPIMG/" \;
  n_img=$(find "$TMPIMG" -type f -iname '*.jpg' | wc -l | tr -d ' ')
  adb push "$TMPIMG/." "$DEVBASE/images/" >/dev/null; rm -rf "$TMPIMG"
  echo "  pushed $n_img images"
  echo
  echo "→ NOW run 'EdgeModelParityIntegrationTest' on the device (the app should already be built,"
  echo "   installed and showing the test list — see README step 3). Tap Run on runParitySweep."
fi
echo
echo "→ waiting for the sweep to finish (polling every ${POLL_SECONDS}s, up to ${TIMEOUT_SECONDS}s)."
# Not waiting for green: the runner does not await the test, so green means started. The sentinels do.
deadline=$(( SECONDS + TIMEOUT_SECONDS ))
sentinel=""
while :; do
  # A dead device returns empty from the sentinel reads below, which is indistinguishable from
  # "not written yet" — so ask adb directly rather than blaming slowness for 40 minutes.
  if ! adb get-state >/dev/null 2>&1; then
    echo "❌ lost the device mid-run (adb get-state). The sweep cannot still be running." >&2
    echo "   Check the emulator/app (API 37 crashes with a Hermes SIGSEGV), then re-run." >&2
    exit 1
  fi
  # `|| true`: adb propagates cat's exit code, and a not-yet-written sentinel is the normal case.
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

# The sweep counts rows read back off the written CSV, so this catches a truncated file too.
n_rows="$(printf '%s' "$sentinel" | sed -n 's/.*"rows":[[:space:]]*\([0-9][0-9]*\).*/\1/p')"
[ -n "$n_rows" ] || { echo "❌ unreadable completion sentinel: $sentinel" >&2; exit 1; }
if [ -n "$n_img" ] && [ "$n_rows" -ne "$n_img" ]; then
  echo "❌ the sweep scored $n_rows of the $n_img images pushed. A report over the subset would call" >&2
  echo "   the run a pass on whatever survived — refusing to collect it." >&2
  exit 1
fi
echo "  sweep finished: $n_rows rows"

echo "→ pulling results"
adb pull "$DEVBASE/out/per_model_scores.csv" "$OUT/per_model_scores.csv"
# Fold identity comes from the provisioned row NAME, not the sha256 the blob is addressed by — pull
# the mapping so the model6/model8/model8-2 attribution can be checked against what was provisioned.
adb pull "$DEVBASE/out/fold-mapping.csv" "$OUT/fold-mapping.csv"
echo "✓ wrote $OUT/per_model_scores.csv + fold-mapping.csv (gitignored), $n_rows rows"
