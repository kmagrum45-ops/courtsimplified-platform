#!/usr/bin/env bash
# Deletes leftover branches whose work is already in main, so the branch list
# shows only what is live or in progress.
#
# WHY (2026-10-04). The repo had ~120 branches: finished claude/* work merged by
# squash (so git never sees them as merged), one-off vendoring and diagnostics
# runs, and July/August backups. Sessions kept reading them as live work and
# "conflicts". The cloud workspace cannot delete branches, so this runs on
# GitHub's runner (courtsimplified-branch-cleanup.yml), weekly and on demand.
#
# A branch is deleted when ANY of these holds:
#   1. it has no commit that main lacks (compare ahead_by == 0);
#   2. its tip is the head of a merged pull request (squash-merged work);
#   3. it is a temporary automated run (sources-vendor-*, ai-diag-*) older
#      than 7 days — its useful content reached main through a PR;
#   4. it is named in EXTRA (workflow input), a deliberate decision.
# Never deleted: main, case-workspace, *-reports, any branch with an open PR.
# A branch deleted under 3 or 4 that holds commits main lacks is first saved
# as the tag archive/<name>, so nothing is lost.
#
# DRY_RUN=1 lists what would happen and changes nothing.
set -euo pipefail

REPO="${GITHUB_REPOSITORY:?}"
EXTRA="${EXTRA:-}"
DRY_RUN="${DRY_RUN:-0}"
NOW=$(date +%s)

open_heads=$(gh api "repos/$REPO/pulls?state=open&per_page=100" --paginate --jq '.[].head.ref')
merged_shas=$(gh api "repos/$REPO/pulls?state=closed&per_page=100" --paginate --jq '.[] | select(.merged_at != null) | .head.sha')

deleted=0 kept=0
for branch in $(gh api "repos/$REPO/branches?per_page=100" --paginate --jq '.[].name'); do
  case "$branch" in main|case-workspace|*-reports) continue ;; esac
  if grep -qxF "$branch" <<<"$open_heads"; then echo "keep  $branch (open pull request)"; kept=$((kept+1)); continue; fi

  sha=$(gh api "repos/$REPO/branches/$branch" --jq .commit.sha)
  date=$(gh api "repos/$REPO/commits/$sha" --jq .commit.committer.date)
  age_days=$(( (NOW - $(date -d "$date" +%s)) / 86400 ))
  ahead=$(gh api "repos/$REPO/compare/main...$sha" --jq .ahead_by 2>/dev/null || true)
  [[ "$ahead" =~ ^[0-9]+$ ]] || ahead="unrelated history,"

  reason="" archive=0
  if [ "$ahead" = "0" ]; then reason="all of it is in main"
  elif grep -qxF "$sha" <<<"$merged_shas"; then reason="merged by pull request"
  elif [[ "$branch" =~ ^(sources-vendor-|ai-diag-) ]] && [ "$age_days" -ge 7 ]; then reason="temporary run, $age_days days old"; archive=1
  elif tr ' ' '\n' <<<"$EXTRA" | grep -qxF -- "$branch"; then reason="named for removal"; archive=1
  fi

  if [ -z "$reason" ]; then echo "keep  $branch ($ahead commit(s) not in main, $age_days days old)"; kept=$((kept+1)); continue; fi
  echo "delete $branch ($reason)"
  [ "$DRY_RUN" = "1" ] && continue
  if [ "$archive" = "1" ]; then
    gh api -X POST "repos/$REPO/git/refs" -f ref="refs/tags/archive/$branch" -f sha="$sha" >/dev/null 2>&1 \
      && echo "       saved as tag archive/$branch" \
      || { gh api "repos/$REPO/git/refs/tags/archive/$branch" >/dev/null 2>&1 && echo "       tag archive/$branch already exists" || { echo "       could not save a tag; keeping it"; continue; }; }
  fi
  gh api -X DELETE "repos/$REPO/git/refs/heads/$branch" && deleted=$((deleted+1))
done
echo "deleted $deleted, kept $kept"
