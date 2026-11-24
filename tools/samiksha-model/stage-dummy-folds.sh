#!/usr/bin/env bash
# Writes the dummy folds, encrypts each with the app's encrypt-model.js into the staging folder
# $1 (blobs, manifest.json, keys.json), and writes test images into $1/images.
# Usage: stage-dummy-folds.sh STAGING_DIR
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
staging="$1"
python="${PYTHON:-$here/.venv/bin/python}"
[[ -x "$python" ]] || python="$(command -v python3)"

rm -rf "$staging"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

"$python" "$here/make_dummy_folds.py" "$work" >/dev/null
# Fold order and the app's content names: model6, model8, model8-2.
names=(mvit2_fold1_6 mvit2_fold1_8 mvit2_fold2_8)
files=(model6 model8 model8-2)
for i in 0 1 2; do
    node "$here/../edge-model/encrypt-model.js" --in "$work/${files[$i]}.onnx" --staging-dir "$staging" \
        --name "${names[$i]}" --override "$here/../edge-model/tanuh-ensemble-override.json" >/dev/null
done
"$python" "$here/tests/write_test_images.py" "$staging/images"
