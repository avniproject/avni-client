#!/usr/bin/env bash
# Build one spike configuration into spike/apks/<name>.apk (generic flavor, release build type,
# prerelease server). Usage: spike/build.sh <config-name>
set -euo pipefail
NAME=${1:?config name}
DIR=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$DIR/.." && pwd)
APP=$ROOT/packages/openchs-android
CFG=$DIR/configs/$NAME.json
[ -f "$CFG" ] || { echo "no config $CFG"; exit 2; }
cp "$CFG" "$APP/config/spike-flags.json"
echo "flags: $(cat "$APP/config/spike-flags.json")"
( cd "$ROOT" && make as_prerelease >/dev/null )
grep -q prerelease.json "$APP/src/framework/Config.js" || { echo "Config.js not pointing at prerelease"; exit 3; }
export JAVA_HOME=$(/usr/libexec/java_home -v 17 -a arm64 2>/dev/null || /usr/libexec/java_home -v 17)
echo "java: $JAVA_HOME"
# The flags JSON is not a tracked input of the bundle task, so force it to rerun every build.
( cd "$APP/android" && ./gradlew :app:createBundleGenericReleaseJsAndAssets --rerun assembleGenericRelease -q --console=plain > "$DIR/results/build-$NAME.log" 2>&1 ) || { tail -40 "$DIR/results/build-$NAME.log"; echo "gradle failed"; exit 5; }
APK="$APP/android/app/build/outputs/apk/generic/release/app-generic-armeabi-v7a-release.apk"
[ "$APK" -nt "$APP/config/spike-flags.json" ] || { echo "APK not rebuilt"; exit 4; }
[ "$(unzip -l "$APK" | grep -c libop-sqlite.so)" -ge 1 ] || { echo "APK has no libop-sqlite.so"; exit 6; }
[ -n "$APK" ] || { echo "no APK produced"; exit 4; }
mkdir -p "$DIR/apks"; cp "$APK" "$DIR/apks/$NAME.apk"
echo "built $DIR/apks/$NAME.apk ($(du -h "$DIR/apks/$NAME.apk" | cut -f1))"
