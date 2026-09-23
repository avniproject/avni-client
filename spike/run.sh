#!/usr/bin/env bash
# Run one built configuration on the attached device: install, clear data, log in, let the first
# sync run, capture [SPIKE] lines from logcat, sample PSS, summarise. Usage: spike/run.sh <name> [max-seconds]
set -uo pipefail
NAME=${1:?config name}
MAX=${2:-14400}
DIR=$(cd "$(dirname "$0")" && pwd)
source "$HOME/.avni-conductor/spike-creds.env"
PKG=com.openchsclient
APK=$DIR/apks/$NAME.apk
[ -f "$APK" ] || { echo "no apk $APK"; exit 2; }
TS=$(date +%Y%m%d-%H%M%S)
OUT=$DIR/results/$NAME-$TS
mkdir -p "$OUT"
echo "run $NAME -> $OUT"
adb get-state >/dev/null || { echo "no device"; exit 3; }
adb shell svc power stayon usb
adb install -r -d "$APK" | tail -1
adb shell pm clear $PKG | tr -d '\r'
adb logcat -c
adb logcat -v time ReactNativeJS:I AndroidRuntime:E ActivityManager:I *:S > "$OUT/logcat.txt" &
LOGCAT_PID=$!
( while true; do
    echo "$(date +%s) $(adb shell dumpsys meminfo $PKG 2>/dev/null | grep -E 'TOTAL PSS:|TOTAL:' | head -1 | tr -d '\r')"
    sleep 15
  done ) > "$OUT/pss.txt" &
PSS_PID=$!
trap 'kill $LOGCAT_PID $PSS_PID 2>/dev/null' EXIT
adb shell am start -W -n $PKG/.MainActivity | grep -E "Status|TotalTime" | tr -d '\r'
python3 -u "$DIR/ui.py" login "$SPIKE_USER" "$SPIKE_PASS" || { echo "login automation failed"; }
python3 -u "$DIR/ui.py" wait "$OUT/logcat.txt" "$MAX" $PKG
kill $LOGCAT_PID $PSS_PID 2>/dev/null
sleep 1
python3 "$DIR/parse.py" "$OUT/logcat.txt" "$OUT/pss.txt" | tee "$OUT/summary.txt"
