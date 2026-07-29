#!/usr/bin/env bash
# Fails (exit 1) if any *staged* file looks proprietary or is a large binary.
# Reused by: .git/hooks/pre-commit, .git/hooks/pre-push, CI. Pattern-based, defense-in-depth.
set -euo pipefail
mode="${1:-staged}"   # "staged" (LOCAL hook — broad) or "range:<base>..<head>" (CI — narrow)

if [[ "$mode" == staged ]]; then
  files=$(git diff --cached --name-only --diff-filter=ACM)
  # LOCAL hook: only installed on machines that handle the fixtures (install-guards.sh).
  # Blast radius is one dev, so be aggressive — any image/xlsx/model + size guard.
  bad_re='\.(onnx|onnx\.data|pt|pth|jpg|jpeg|png|xlsx)$|(^|/)tools/edge-model/verify/(fixtures|out)/|true_label|(^|/)per_image_scores\.csv$|(model6|model8|model8-2)\.(onnx|pt)$'
  size_guard=1
else
  files=$(git diff --name-only --diff-filter=ACM "${mode#range:}")
  # CI: runs on EVERY PR from EVERYONE. Must be NARROW — only things that are never
  # legitimate in avni-client — or it false-positives on teammates' normal image assets.
  bad_re='\.(onnx|onnx\.data|pt|pth)$|(^|/)tools/edge-model/verify/(fixtures|out)/|(^|/)true_label[^/]*\.xlsx$|(^|/)per_image_scores\.csv$'
  size_guard=0
fi
offenders=$(printf '%s\n' "$files" | grep -iE "$bad_re" || true)

# Size guard (LOCAL hook only — a repo-wide size check in CI would block legit large assets).
large=""
if [[ "$size_guard" == 1 ]]; then
  while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    sz=$(wc -c <"$f" | tr -d ' ')
    if (( sz > 1048576 )); then large+="$f ($((sz/1024)) KB)"$'\n'; fi
  done <<< "$files"
fi

if [[ -n "$offenders" || -n "$large" ]]; then
  echo "❌ BLOCKED: proprietary/large asset(s) staged for a PUBLIC repo." >&2
  [[ -n "$offenders" ]] && { echo "  pattern match:" >&2; printf '   %s\n' $offenders >&2; }
  [[ -n "$large" ]] && { echo "  >1MB blobs:" >&2; printf '   %s\n' "$large" >&2; }
  echo "  If this is a false positive, override ONLY with a documented reason: git commit --no-verify" >&2
  echo "  (CI will still block it — see .github/workflows/no-proprietary-assets.yml)" >&2
  exit 1
fi
echo "✓ no-proprietary guard passed ($(printf '%s\n' "$files" | grep -c . ) files checked)"
