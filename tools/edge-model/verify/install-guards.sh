#!/usr/bin/env bash
# Installs branch-INDEPENDENT guards into .git/ (survive `git checkout <any-branch>`).
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
# --git-path, not --git-dir: in a linked worktree --git-dir is .git/worktrees/<name>, which has no
# hooks/ dir and is not where git looks for hooks or info/exclude — both resolve to the common dir.
# --git-path handles a plain clone and a worktree alike.
hooks="$(git rev-parse --git-path hooks)"
excl="$(git rev-parse --git-path info/exclude)"
src="$root/tools/edge-model/verify/hooks"

# --git-path already honours core.hooksPath, so $hooks is wherever git actually looks. Say when
# that isn't the default, so a dev who set it knows where the hooks landed.
[ -n "$(git config --get core.hooksPath || true)" ] \
    && echo "note: core.hooksPath is set — installing into $hooks"

mkdir -p "$hooks" "$(dirname "$excl")"
install -m 0755 "$src/pre-commit" "$hooks/pre-commit"
install -m 0755 "$src/pre-push"   "$hooks/pre-push"
chmod +x "$root/tools/edge-model/verify/guard-no-proprietary.sh"

# info/exclude is local + untracked + branch-independent (unlike .gitignore).
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

echo "✓ installed pre-commit + pre-push hooks into $hooks"
echo "✓ appended proprietary patterns to $excl (branch-independent)"
