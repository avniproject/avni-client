#!/usr/bin/env bash
# Move GitHub project board cards by workflow shortcut or status name.
#
# Usage:
#   ./scripts/board.sh <action> <issue> [issue2 ...]
#   ./scripts/board.sh <action> <repo>/<issue> [issue2 ...]
#
# Issues default to avni-client. Use owner/repo#num or repo#num for others:
#   ./scripts/board.sh review avni-product#1845
#   ./scripts/board.sh review avniproject/avni-product#1845
#
# Workflow shortcuts:
#   pickup       Ready → In Progress
#   submit       In Progress → Code Review Ready
#   review       Code Review Ready → In Code Review
#   cr-comments  In Code Review → Code Review with Comments
#   qa-ready     In Code Review → QA Ready
#   done         → Done
#
# Any status name (kebab-case) also works directly:
#   ./scripts/board.sh in-progress 1866
#   ./scripts/board.sh qa-ready 1861 1862 1863
#
# Requires: gh CLI with 'project' scope
#   gh auth refresh -s project

set -euo pipefail

PROJECT_ID="PVT_kwDOARJb1M4ARRhz"
STATUS_FIELD_ID="PVTSSF_lADOARJb1M4ARRhzzgLB6v8"
DEFAULT_REPO_OWNER="avniproject"
DEFAULT_REPO_NAME="avni-client"

status_option_id() {
  case "$1" in
    new-issues)                   echo "f75ad846" ;;
    triaging-analysis)            echo "8535e9f1" ;;
    triaged)                      echo "47fc9ee4" ;;
    hold)                         echo "af0f41b7" ;;
    focus-items)                  echo "98236657" ;;
    requirements-gathering)       echo "baf79bc0" ;;
    timelines-estimates-decision) echo "2d9103d5" ;;
    in-analysis)                  echo "4f69efbd" ;;
    in-design)                    echo "8812301a" ;;
    in-analysis-review)           echo "ae75f599" ;;
    analysis-complete)            echo "d82d8190" ;;
    ready)                        echo "bdeb42fe" ;;
    qa-failed)                    echo "108a0f53" ;;
    in-progress)                  echo "a1556e86" ;;
    ready-for-devbox)             echo "008d85ac" ;;
    code-review-ready)            echo "6bd78273" ;;
    in-code-review)               echo "19ece91c" ;;
    code-review-with-comments)    echo "40536c7b" ;;
    qa-ready)                     echo "038a0c08" ;;
    in-qa)                        echo "20d17c3c" ;;
    done)                         echo "ca2efb54" ;;
    further-action-required)      echo "810c344d" ;;
    *) echo ""; ;;
  esac
}

usage() {
  grep '^#' "$0" | grep -v '#!/' | sed 's/^# \?//'
  exit 1
}

if [[ $# -lt 2 ]]; then
  usage
fi

ACTION="$1"
shift

# Resolve workflow shortcuts to status keys
case "$ACTION" in
  pickup)      STATUS_KEY="in-progress" ;;
  submit)      STATUS_KEY="code-review-ready" ;;
  review)      STATUS_KEY="in-code-review" ;;
  cr-comments) STATUS_KEY="code-review-with-comments" ;;
  qa-ready)    STATUS_KEY="qa-ready" ;;
  done)        STATUS_KEY="done" ;;
  *)           STATUS_KEY="$ACTION" ;;
esac

OPTION_ID=$(status_option_id "$STATUS_KEY")
if [[ -z "$OPTION_ID" ]]; then
  echo "Unknown status: '$STATUS_KEY'"
  echo "Valid statuses: new-issues, triaging-analysis, triaged, hold, focus-items, ready, in-progress, code-review-ready, in-code-review, code-review-with-comments, qa-ready, in-qa, done, qa-failed, further-action-required, ..."
  exit 1
fi

parse_issue() {
  # Accepts: 1866  |  avni-product#1845  |  avniproject/avni-product#1845
  local raw="$1"
  if [[ "$raw" =~ ^([^/]+)/([^#]+)#([0-9]+)$ ]]; then
    ISSUE_OWNER="${BASH_REMATCH[1]}"
    ISSUE_REPO="${BASH_REMATCH[2]}"
    ISSUE_NUM="${BASH_REMATCH[3]}"
  elif [[ "$raw" =~ ^([^#]+)#([0-9]+)$ ]]; then
    ISSUE_OWNER="$DEFAULT_REPO_OWNER"
    ISSUE_REPO="${BASH_REMATCH[1]}"
    ISSUE_NUM="${BASH_REMATCH[2]}"
  elif [[ "$raw" =~ ^[0-9]+$ ]]; then
    ISSUE_OWNER="$DEFAULT_REPO_OWNER"
    ISSUE_REPO="$DEFAULT_REPO_NAME"
    ISSUE_NUM="$raw"
  else
    echo "Cannot parse issue reference: '$raw'"
    exit 1
  fi
}

get_item_id() {
  local owner="$1" repo="$2" num="$3"
  gh api graphql -f query="
  {
    repository(owner: \"$owner\", name: \"$repo\") {
      issue(number: $num) {
        projectItems(first: 10) {
          nodes {
            id
            project { id }
          }
        }
      }
    }
  }" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data['data']['repository']['issue']['projectItems']['nodes']
for item in items:
    if item['project']['id'] == '$PROJECT_ID':
        print(item['id'])
        break
else:
    print('')
"
}

move_card() {
  local item_id="$1" label="$2"
  gh api graphql -f query="
  mutation {
    updateProjectV2ItemFieldValue(input: {
      projectId: \"$PROJECT_ID\"
      itemId: \"$item_id\"
      fieldId: \"$STATUS_FIELD_ID\"
      value: { singleSelectOptionId: \"$OPTION_ID\" }
    }) {
      projectV2Item { id }
    }
  }" > /dev/null
  echo "$label → $STATUS_KEY"
}

for ISSUE in "$@"; do
  parse_issue "$ISSUE"
  ITEM_ID=$(get_item_id "$ISSUE_OWNER" "$ISSUE_REPO" "$ISSUE_NUM")
  if [[ -z "$ITEM_ID" ]]; then
    echo "$ISSUE: not found in project board, skipping"
    continue
  fi
  move_card "$ITEM_ID" "$ISSUE_OWNER/$ISSUE_REPO#$ISSUE_NUM"
done
