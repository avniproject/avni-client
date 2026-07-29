#!/usr/bin/env bash
# Installs branch-INDEPENDENT guards into .git/ (survive `git checkout <any-branch>`).
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
gitdir="$(git rev-parse --git-dir)"
src="$root/tools/edge-model/verify/hooks"

install -m 0755 "$src/pre-commit" "$gitdir/hooks/pre-commit"
install -m 0755 "$src/pre-push"   "$gitdir/hooks/pre-push"
chmod +x "$root/tools/edge-model/verify/guard-no-proprietary.sh"

# .git/info/exclude is local + untracked + branch-independent (unlike .gitignore).
excl="$gitdir/info/exclude"
grep -qxF '# --- tanuh proprietary guard (install-guards.sh) ---' "$excl" 2>/dev/null || cat >>"$excl" <<'EOF'

# --- tanuh proprietary guard (install-guards.sh) ---
*.onnx
*.onnx.data
*.pt
*.pth
*true_label*.xlsx
tools/edge-model/verify/fixtures/
tools/edge-model/verify/out/
per_image_scores.csv
EOF

echo "✓ installed pre-commit + pre-push hooks into $gitdir/hooks"
echo "✓ appended proprietary patterns to $gitdir/info/exclude (branch-independent)"
