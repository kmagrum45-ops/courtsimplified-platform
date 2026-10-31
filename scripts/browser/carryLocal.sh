#!/usr/bin/env bash
# THE CARRY TEST AGAINST A LOCAL SUPABASE STACK (Docker), NOT THE SHARED STAGING PROJECT.
#
# WHAT IT DOES. Starts (or reuses) a private local Supabase stack for a "slot", builds the site against it,
# serves the build on a port of its own, runs tests/browser/carry-end-to-end.spec.ts, and stops the server.
# Each slot is its own stack (project id cs-carry-local-<slot>, ports 56000 + 100*slot + the usual last
# two digits), so runs in different slots share nothing. Two servers on one slot share one database,
# which the carry test allows: every run makes its own fresh accounts and cases.
#   - migrations + supabase/seed.sql + the catalogue snapshot load on the first start (CLAUDE.md s.6);
#     the catalogue is then checked with count(*): 723 court_form_library, 113 court_forms, 104 forms;
#   - the stack's local keys are read from `supabase status -o env` inside this script, never printed;
#   - OPENAI_API_KEY and the other model keys are unset: no AI spend (the spec's stand-ins answer model routes).
#
# WHAT FAILURE IT EXISTS TO CATCH / REFUSE. It refuses to run unless the Supabase URL is http://127.0.0.1 or
# http://localhost (so a mis-set variable can never point the run at staging or production), then runs
# the repository's own production guard (scripts/walkthrough/guard.ts) as well. It refuses a catalogue that
# does not hold the seeded row counts (a stack started from migrations alone has zero, CLAUDE.md s.6).
#
# USAGE (Git Bash on Windows, or Linux):
#   bash scripts/browser/carryLocal.sh                 # slot 0, port 3400, all twelve runs
#   CARRY_PORT=3401 CARRY_SKIP_BUILD=1 CARRY_GREP="carry end to end -- civil " bash scripts/browser/carryLocal.sh
# Variables: CARRY_SLOT (0), CARRY_PORT (3400), CARRY_GREP (all), CARRY_SKIP_BUILD (reuse .next, which must
# have been built by this script for the same slot), CARRY_OUT (records folder; default under $TEMP),
# CARRY_STOP_STACK=1 (stop the stack at the end; default: leave it running for the next run).
# Records: $CARRY_OUT/carry-records/*.json; the server log and Playwright output beside them.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

SLOT="${CARRY_SLOT:-0}"
PORT="${CARRY_PORT:-3400}"
GREP="${CARRY_GREP:-carry end to end}"
BASE=$((56000 + SLOT * 100))
PROJECT="cs-carry-local-${SLOT}"
TMPROOT="${TEMP:-${TMPDIR:-/tmp}}"
STAMP="$(date +%Y%m%d-%H%M%S)"
WORK="${TMPROOT}/cs-carry-local/${PROJECT}"
OUT="${CARRY_OUT:-${TMPROOT}/cs-carry-local/out/${STAMP}-slot${SLOT}-p${PORT}}"
winpath() { if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi; }

# No model keys in this run, whatever the shell held.
unset OPENAI_API_KEY OPENAI_ADMIN_KEY ANTHROPIC_API_KEY
export NEXT_TELEMETRY_DISABLED=1 AI_RATE_LIMITS=local

# 1. The stack: a copy of supabase/ with its own project id and ports (the repo's config is not edited).
mkdir -p "$WORK/supabase" "$OUT"
rm -rf "$WORK/supabase/migrations" "$WORK/supabase/snapshots"
cp -r supabase/migrations supabase/snapshots supabase/seed.sql "$WORK/supabase/"
sed -e "s/^project_id = .*/project_id = \"${PROJECT}\"/" \
    -e "s/^port = 54321/port = $((BASE + 21))/" \
    -e "s/^port = 54322/port = $((BASE + 22))/" \
    -e "s/^shadow_port = 54320/shadow_port = $((BASE + 20))/" \
    -e "s/^port = 54329/port = $((BASE + 29))/" \
    -e "s/^port = 54323/port = $((BASE + 23))/" \
    -e "s/^port = 54324/port = $((BASE + 24))/" \
    -e "s/^port = 54327/port = $((BASE + 27))/" \
    -e "s/^health_timeout = .*/health_timeout = \"10m\"/" \
    -e "s/^inspector_port = 8083/inspector_port = $((BASE + 83))/" \
    supabase/config.toml > "$WORK/supabase/config.toml"
SB=(supabase --workdir "$(winpath "$WORK")")
# Only what the site uses: Postgres, auth, PostgREST, the gateway and storage.
EXCLUDE="realtime,studio,imgproxy,edge-runtime,logflare,vector,postgres-meta,mailpit,supavisor"

if "${SB[@]}" status >/dev/null 2>&1; then
  echo "carry-local: reusing stack ${PROJECT}"
else
  echo "carry-local: starting stack ${PROJECT} (first start applies migrations and the seed)"
  # Its output lists the stack's local keys: kept in a log under $OUT, never printed here.
  "${SB[@]}" start -x "$EXCLUDE" > "$OUT/stack-start.log" 2>&1 || {
    grep -viE 'key|secret|jwt|sb_' "$OUT/stack-start.log" | tail -30; exit 1; }
fi

DBC="supabase_db_${PROJECT}"
sql() { docker exec "$DBC" psql -U postgres -d postgres -tAc "$1"; }

# A stack started from older migrations is rebuilt, so the run never tests a stale schema.
FILES=$(ls supabase/migrations/*.sql | wc -l | tr -d ' ')
APPLIED=$(sql "select count(*) from supabase_migrations.schema_migrations" 2>/dev/null || echo 0)
if [ "$FILES" != "$APPLIED" ]; then
  echo "carry-local: ${APPLIED} migrations applied, ${FILES} in the repo; resetting the local database"
  "${SB[@]}" db reset > "$OUT/stack-reset.log" 2>&1 || { grep -viE 'key|secret|jwt|sb_' "$OUT/stack-reset.log" | tail -30; exit 1; }
fi

# 2. Keys, read inside the script, never echoed.
eval "$("${SB[@]}" status -o env 2>/dev/null | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=' | sed 's/^/LOCAL_/')"
export NEXT_PUBLIC_SUPABASE_URL="$LOCAL_API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$LOCAL_ANON_KEY"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$LOCAL_ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$LOCAL_SERVICE_ROLE_KEY"
unset LOCAL_ANON_KEY LOCAL_SERVICE_ROLE_KEY

# 3. Refusals: local only, and the repository's own production guard on top.
if ! [[ "$NEXT_PUBLIC_SUPABASE_URL" =~ ^http://(127\.0\.0\.1|localhost):[0-9]+/?$ ]]; then
  echo "carry-local: REFUSED. The Supabase URL is not a local stack (${NEXT_PUBLIC_SUPABASE_URL%%.*}...)." >&2
  exit 2
fi
node --import tsx scripts/walkthrough/guard.ts
echo "carry-local: database ${NEXT_PUBLIC_SUPABASE_URL}"

CFL=$(sql "select count(*) from public.court_form_library")
CF=$(sql "select count(*) from public.court_forms")
FO=$(sql "select count(*) from public.forms")
echo "carry-local: catalogue court_form_library=${CFL} court_forms=${CF} forms=${FO}"
if [ "$CFL" != 723 ] || [ "$CF" != 113 ] || [ "$FO" != 104 ]; then
  echo "carry-local: REFUSED. The catalogue is not the seeded one (expected 723/113/104; CLAUDE.md s.6)." >&2
  exit 3
fi

# 4. Build against this stack (NEXT_PUBLIC_* are baked into the build). The build records which stack it was for.
MARK=".next/carry-local-stack"
if [ -n "${CARRY_SKIP_BUILD:-}" ]; then
  if [ "$(cat "$MARK" 2>/dev/null)" != "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "carry-local: REFUSED. .next was not built by this script for ${NEXT_PUBLIC_SUPABASE_URL}; run without CARRY_SKIP_BUILD." >&2
    exit 4
  fi
  echo "carry-local: reusing the build in .next"
else
  echo "carry-local: building (log: ${OUT}/build.log)"
  NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}" npx next build > "$OUT/build.log" 2>&1 || { tail -40 "$OUT/build.log"; exit 1; }
  printf '%s' "$NEXT_PUBLIC_SUPABASE_URL" > "$MARK"
fi

# 5. Serve on our own port; a password for this run only (never printed).
if (echo > "/dev/tcp/127.0.0.1/${PORT}") 2>/dev/null; then
  echo "carry-local: REFUSED. Port ${PORT} is already in use." >&2
  exit 5
fi
SITE_ACCESS_PASSWORD="$(node -e 'process.stdout.write(require("crypto").randomBytes(24).toString("hex"))')"
export SITE_ACCESS_PASSWORD
node node_modules/next/dist/bin/next start -p "$PORT" > "$OUT/server.log" 2>&1 &
SERVER=$!
stop_server() {
  kill "$SERVER" 2>/dev/null || true
  sleep 2
  # Windows: the listener on OUR port only, which this script started.
  if command -v taskkill >/dev/null 2>&1; then
    for pid in $(netstat -ano 2>/dev/null | grep -E "[:.]${PORT} .*LISTEN" | awk '{print $NF}' | sort -u); do
      taskkill //F //PID "$pid" >/dev/null 2>&1 || true
    done
  fi
  if [ -n "${CARRY_STOP_STACK:-}" ]; then "${SB[@]}" stop || true; fi
}
trap stop_server EXIT
for _ in $(seq 1 60); do
  if curl -s -o /dev/null "http://localhost:${PORT}"; then break; fi
  sleep 2
done
curl -s -o /dev/null "http://localhost:${PORT}" || { echo "server did not start"; tail -40 "$OUT/server.log"; exit 1; }

# 6. The carry test. The spec writes carry-records/<run>.json in the repo; afterwards this script moves
# out only the records of the runs IT ran (named by the "CARRY COUNTS [<run>]" lines in its own log),
# so two runs at once with different CARRY_GREP never take each other's records.
export PLAYWRIGHT_BASE_URL="http://localhost:${PORT}"
export STORY_PACK_RUN_ID="carry-local-${STAMP}-p${PORT}"
START=$(date +%s)
set +e
npx playwright test tests/browser/carry-end-to-end.spec.ts --grep "$GREP" --reporter=line --workers=1 --output "$OUT/test-results" 2>&1 | tee "$OUT/spec.log"
CODE=${PIPESTATUS[0]}
set -e
mkdir -p "$OUT/carry-records"
{ grep -oE '^CARRY COUNTS \[[^]]+\]' "$OUT/spec.log" || true; } | sed -E 's/^CARRY COUNTS \[(.*)\]$/\1/' | while read -r run; do
  file="carry-records/$(printf '%s' "$run" | sed -E 's/[^A-Za-z0-9_.-]+/-/g').json"
  if [ -f "$file" ]; then mv "$file" "$OUT/carry-records/"; fi
done
rmdir carry-records 2>/dev/null || true
echo "carry-local: spec exit ${CODE} after $(( ($(date +%s) - START) / 60 )) min; records in ${OUT}/carry-records"
exit "$CODE"
