#!/usr/bin/env bash
set -euo pipefail
: "${TANUH_FIXTURES:?Set TANUH_FIXTURES to the EXTERNAL fixtures dir, e.g. /Users/himeshr/Avni/Tanuh}"
repo_root="$(git rev-parse --show-toplevel)"
fx_real="$(cd "$TANUH_FIXTURES" && pwd -P)"
case "$fx_real/" in
  "$repo_root"/*) echo "❌ TANUH_FIXTURES ($fx_real) is INSIDE the repo tree. Proprietary data must live outside the repo. Aborting." >&2; exit 1;;
esac
echo "✓ fixtures are external to the repo: $fx_real"
# (Body appended in Task B.2)
