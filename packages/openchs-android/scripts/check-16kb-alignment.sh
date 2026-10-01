#!/usr/bin/env bash
# Play rejects Android 15+ updates with a 64-bit native library below 16 KB alignment; 32-bit ABIs never run 16 KB pages.
# Usage: check-16kb-alignment.sh [apk-or-aab ...]   (no args: every release APK under android/app/build/outputs/apk)
set -euo pipefail

archives=()
for arg in "$@"; do
    if [ ! -f "$arg" ]; then
        echo "Not a file: $arg" >&2
        exit 2
    fi
    archives+=("$(cd "$(dirname "$arg")" && pwd)/$(basename "$arg")")
done

cd "$(dirname "$0")/.."

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
NDK_VERSION=$(sed -n 's/.*ndkVersion = "\(.*\)".*/\1/p' android/build.gradle)
OBJDUMP=$(ls "$SDK/ndk/$NDK_VERSION"/toolchains/llvm/prebuilt/*/bin/llvm-objdump 2>/dev/null | head -1 || true)
if [ -z "$OBJDUMP" ]; then
    echo "llvm-objdump not found under $SDK/ndk/$NDK_VERSION" >&2
    exit 2
fi

if [ ${#archives[@]} -eq 0 ]; then
    while IFS= read -r apk; do archives+=("$PWD/$apk"); done < <(find android/app/build/outputs/apk -path '*/release/*.apk' 2>/dev/null)
fi
if [ ${#archives[@]} -eq 0 ]; then
    echo "No release APK found; build one first or pass a path" >&2
    exit 2
fi

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

checked=0
failures=0
for archive in "${archives[@]}"; do
    if ! unzip -tq "$archive" >/dev/null 2>&1; then
        echo "Not a readable APK/AAB: $archive" >&2
        exit 2
    fi
    out="$WORK/$(basename "$archive")"
    mkdir -p "$out"
    # unzip exits non-zero when a pattern matches nothing: APKs keep libraries under lib/, AABs under base/lib/
    unzip -q -o "$archive" 'lib/arm64-v8a/*' 'lib/x86_64/*' 'base/lib/arm64-v8a/*' 'base/lib/x86_64/*' -d "$out" 2>/dev/null || true
    while IFS= read -r so; do
        checked=$((checked + 1))
        min=$("$OBJDUMP" -p "$so" 2>/dev/null | awk '$1 == "LOAD" { split($NF, a, /\*\*/); print a[2] }' | sort -n | head -1 || true)
        if [ -z "$min" ] || [ "$min" -lt 14 ]; then
            echo "FAIL $(basename "$archive"): ${so#$out/} is aligned to 2**${min:-?}, needs 2**14"
            failures=$((failures + 1))
        fi
    done < <(find "$out" -name '*.so' | sort)
done

if [ "$checked" -eq 0 ]; then
    echo "No 64-bit native library found in: ${archives[*]}" >&2
    exit 2
fi
if [ "$failures" -gt 0 ]; then
    echo "$failures of $checked native libraries not 16 KB-aligned"
    exit 1
fi
echo "All $checked 64-bit native libraries are 16 KB-aligned"
