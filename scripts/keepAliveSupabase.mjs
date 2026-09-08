#!/usr/bin/env node
/**
 * keepAliveSupabase.mjs
 *
 * Prevents the free-tier Supabase project this app runs on from auto-pausing
 * after 7 days of low database activity (see docs/ARCHITECTURE.md's
 * production-outage section for the incident this fixes -- the whole app
 * was unreachable for hours because the project had gone to sleep).
 *
 * Deliberately a genuine PostgREST *database* query, not an /auth/v1/health
 * ping -- Supabase's own docs describe the pause condition as insufficient
 * "user database activity", not general API traffic, so this reads a single
 * row from an existing, already anon-readable, non-sensitive table
 * (court_form_library, the same one inspectSupabaseFormCatalogueReadonly.mjs
 * already reads) rather than inventing a new dedicated keep-alive table.
 * Read-only, anon key only -- no service-role key, no writes, no schema
 * change.
 *
 * Run: node --env-file=.env.local scripts/keepAliveSupabase.mjs
 * (or with NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY /
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY already in the environment, as in CI)
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY/" +
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
  process.exit(1);
}

async function main() {
  const started = Date.now();
  const url = `${SUPABASE_URL}/rest/v1/court_form_library?select=id&limit=1`;

  let res;
  try {
    res = await fetch(url, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error(`Keep-alive request failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  const ms = Date.now() - started;
  const body = await res.text();

  if (!res.ok) {
    console.error(`Keep-alive query FAILED: status=${res.status} in ${ms}ms body=${body.slice(0, 300)}`);
    process.exit(1);
  }

  console.log(`Keep-alive query OK: status=${res.status} in ${ms}ms rows=${JSON.parse(body).length}`);
}

main();
