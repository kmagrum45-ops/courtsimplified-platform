#!/usr/bin/env bash
# npm run ci:local -- CI'S MAIN JOB ON THIS COMPUTER, THE WAY CI RUNS IT.
#
# WHY (site owner, Round 4/6, 25 Nov 2026). Pushes kept failing in CI after "everything passed locally",
# because the local run was not CI's run. On Windows, ten suites failed locally and passed in CI, for
# reasons that had nothing to do with the code:
#   - Git for Windows checks files out with CRLF (core.autocrlf=true), so four checks that compare a file
#     with a fresh build or a recorded hash failed (cross-forum-notes, published-library, rules-corpus,
#     verdict-sources);
#   - Windows paths use "\", so test:openai-cost's list of files did not match;
#   - five suites need a database: rls-matrix needs PostgreSQL's own programs, and cohort2-normalization,
#     cohort2-split-identities, forms-case-isolation and ontario-beta-bundle need a seeded Supabase;
#   - and the last two of CI's checks (retrieval-bundled, runtime-files-shipped) read the build, which
#     CI makes earlier in the job and a loop over the suites never made.
# This script removes every one of those differences instead of listing them as "known failures".
#
# WHAT IT DOES.
#   1. Takes the COMMITTED code (a commit, never the working files), merged with origin/main as CI tests
#      a pull request (CI_LOCAL_MERGE=0 to test the commit alone).
#   2. Starts or reuses the local Supabase stack through scripts/browser/carryLocal.sh (stack only: local
#      URL refused otherwise, the production guard, the seeded catalogue counted). Never staging or production.
#   3. Runs CI's job `typecheck-and-build`, every `run:` step in the workflow's order, inside a Linux
#      container like CI's runner (scripts/ci/Dockerfile.local: Ubuntu 24.04, Node 22, PostgreSQL 16),
#      through scripts/ci/runCiSteps.mjs. Only the billed OpenAI steps are skipped, and it says so.
#   4. Prints the summary: every failing step with its first error and log.
#
# USAGE: npm run ci:local [-- <commit-ish>]          (default HEAD)
#   CI_LOCAL_MERGE=0   test the commit without merging origin/main
#   CI_LOCAL_SLOT=0    which local stack (carryLocal.sh slots); default 0
# Output: $TEMP/cs-ci-local/<stamp>/ (summary.txt, steps.json, logs/). Needs Docker running.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
REF="${1:-HEAD}"
SLOT="${CI_LOCAL_SLOT:-0}"
TMPROOT="${TEMP:-${TMPDIR:-/tmp}}"
OUT="${TMPROOT}/cs-ci-local/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"
winpath() { if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi; }

git fetch -q origin main
SHA="$(git rev-parse --verify "${REF}^{commit}")"
MAIN="$(git rev-parse --verify origin/main)"
GITDIR="$(cd "$(git rev-parse --git-common-dir)" && pwd)"
echo "ci:local: commit ${SHA:0:8}$([ "${CI_LOCAL_MERGE:-1}" = 1 ] && echo " merged with origin/main ${MAIN:0:8}")"
[ -n "$(git status --porcelain --untracked-files=no)" ] && echo "ci:local: note: uncommitted changes in this folder are NOT tested (only commits are)"

# The local stack, checked by carryLocal.sh; its settings go to a private file, never printed.
ENVFILE="$OUT/stack.env"
CARRY_SLOT="$SLOT" CARRY_STACK_ENV_FILE="$ENVFILE" bash scripts/browser/carryLocal.sh
STACK_URL="$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$ENVFILE" | cut -d= -f2-)"
STACK_PORT="${STACK_URL##*:}"; STACK_PORT="${STACK_PORT%/}"

IMAGE=cs-ci-local:1
docker build -q -t "$IMAGE" -f scripts/ci/Dockerfile.local scripts/ci > /dev/null

# Inside: a clone of this repository's history (read-only mount), origin = a bare copy holding the commit
# and main, so the steps that `git fetch origin main` work as in CI; the stack answers on 127.0.0.1.
docker run --rm \
  --env-file "$(winpath "$ENVFILE")" \
  -e SHA="$SHA" -e MAIN="$MAIN" -e MERGE="${CI_LOCAL_MERGE:-1}" -e STACK_PORT="$STACK_PORT" \
  -v "$(winpath "$GITDIR"):/hostgit:ro" \
  -v "$(winpath "$OUT"):/out" \
  -v cs-ci-local-npm:/root/.npm \
  --add-host host.docker.internal:host-gateway \
  "$IMAGE" bash -euo pipefail -c '
    socat TCP-LISTEN:${STACK_PORT},fork,reuseaddr,bind=127.0.0.1 TCP:host.docker.internal:${STACK_PORT} &
    git config --global --add safe.directory "*"
    git config --global user.name ci-local; git config --global user.email ci-local@localhost
    git init -q --bare /origin.git
    git -C /origin.git fetch -q --upload-pack="git -c uploadpack.allowAnySHA1InWant=true upload-pack" /hostgit "$SHA:refs/heads/ci-head" "$MAIN:refs/heads/main"
    git clone -q -b ci-head /origin.git /work && cd /work
    git fetch -q origin main:refs/remotes/origin/main
    if [ "$MERGE" = 1 ]; then git merge -q --no-edit origin/main || { echo "ci:local: the commit does not merge cleanly with origin/main" | tee /out/summary.txt; exit 1; }; fi
    cp scripts/ci/runCiSteps.mjs /opt/ci-tools/ && node /opt/ci-tools/runCiSteps.mjs /out
  ' || true
rm -f "$ENVFILE"

echo
cat "$OUT/summary.txt" 2>/dev/null || { echo "ci:local: no summary was written; see the output above"; exit 1; }
echo "ci:local: full results in $OUT"
grep -q "^ci:local: [0-9]* passed, 0 failed" "$OUT/summary.txt"
