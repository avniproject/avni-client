#!/usr/bin/env bash
# Fails if any 64-bit native library in a release APK/AAB is not 16 KB page-aligned.
# Google Play rejects updates that target Android 15+ when it finds one (avni-client#2167).
# 32-bit ABIs are skipped: 16 KB pages exist only on 64-bit devices.
#
# Usage: check-16kb-alignment.sh [apk-or-aab ...]
#        (no args: every release APK under android/app/build/outputs/apk)
set -euo pipefail

cd "$(dirname "$0")/.."

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
NDK_VERSION=$(sed -n 's/.*ndkVersion = "\(.*\)".*/\1/p' android/build.gradle)
OBJDUMP=$(ls "$SDK/ndk/$NDK_VERSION"/toolchains/llvm/prebuilt/*/bin/llvm-objdump 2>/dev/null | head -1)
if [ -z "$OBJDUMP" ]; then
    echo "llvm-objdump not found under $SDK/ndk/$NDK_VERSION" >&2
    exit 2
fi

if [ $# -eq 0 ]; then
    set -- $(find android/app/build/outputs/apk -path '*/release/*.apk' 2>/dev/null)
fi
if [ $# -eq 0 ]; then
    echo "No release APK found; build one first or pass a path" >&2
    exit 2
fi

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

failures=0
for archive in "$@"; do
    out="$WORK/$(basename "$archive")"
    mkdir -p "$out"
    # APKs keep libraries under lib/, AABs under base/lib/
    unzip -q -o "$archive" 'lib/arm64-v8a/*' 'lib/x86_64/*' 'base/lib/arm64-v8a/*' 'base/lib/x86_64/*' -d "$out" 2>/dev/null || true
    for so in $(find "$out" -name '*.so' | sort); do
        min=$("$OBJDUMP" -p "$so" | awk '$1 == "LOAD" { split($NF, a, /\*\*/); print a[2] }' | sort -n | head -1)
        if [ -z "$min" ] || [ "$min" -lt 14 ]; then
            echo "FAIL $(basename "$archive"): ${so#$out/} is aligned to 2**${min:-?}, needs 2**14"
            failures=$((failures + 1))
        fi
    done
done

if [ "$failures" -gt 0 ]; then
    echo "$failures native librar$([ "$failures" -eq 1 ] && echo y || echo ies) not 16 KB-aligned"
    exit 1
fi
echo "All 64-bit native libraries are 16 KB-aligned"
