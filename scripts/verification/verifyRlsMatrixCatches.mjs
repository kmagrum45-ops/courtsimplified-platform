/**
 * The RLS suite fails on every kind of hole it exists to find. Proved by planting each
 * one and watching it go red.
 *
 * WHAT THIS CATCHES: a test:rls-matrix that has gone blind. An RLS suite's worst
 * failure is the quiet one: zero rows is both "blocked" and "the test is broken", so a
 * suite can drift into passing everything. This plants nine real regressions — RLS
 * switched off, a policy opened to every user, a server-only table opened to anon, a
 * new table nobody classified, cross-user storage reads, a public bucket, a callable
 * SECURITY DEFINER function, row forgery, and a FIXED gap still listed as open — and
 * asserts the suite exits non-zero naming the right check each time.
 *
 * A planted change must be caught by the check named for it, not merely by "something
 * failed": a suite that fails for the wrong reason is as blind as one that passes.
 *
 * COSTS: nothing but time — about three minutes (each plant builds a fresh database).
 * Not in CI for that reason; run it after changing verifyRlsMatrix.mjs or its manifest.
 *
 * Run: npm run test:rls-matrix-catches
 */

import { spawnSync } from "node:child_process";

const plants = [
  {
    what: "RLS switched off on the workspace documents table",
    sql: "ALTER TABLE public.workspace_documents DISABLE ROW LEVEL SECURITY;",
    expect: ["rls-enabled:workspace_documents", "owned:workspace_documents:other-user-cannot-read"],
  },
  {
    what: "every signed-in user can read every case",
    sql: "CREATE POLICY plant_open ON public.cases FOR SELECT TO authenticated USING (true);",
    expect: ["owned:cases:other-user-cannot-read"],
  },
  {
    what: "the AI call log opened to anonymous visitors",
    sql: "GRANT SELECT ON public.ai_call_log TO anon; CREATE POLICY plant ON public.ai_call_log FOR SELECT TO anon USING (true);",
    expect: ["server-only:ai_call_log:anon-cannot-read", "grants:server-only-tables-closed-to-clients"],
  },
  {
    what: "a new table added with no security decision",
    sql: "CREATE TABLE public.plant_new_feature (id uuid PRIMARY KEY, user_id uuid);",
    expect: ["classified:plant_new_feature", "rls-enabled:plant_new_feature"],
  },
  {
    what: "stored files readable across users",
    sql: "CREATE POLICY plant_all ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'case-evidence');",
    expect: ["storage:case-evidence:other-user-cannot-read-object"],
  },
  {
    what: "the evidence bucket made public",
    sql: "UPDATE storage.buckets SET public = true WHERE id = 'case-evidence';",
    expect: ["storage:case-evidence:bucket-is-private"],
  },
  {
    what: "a SECURITY DEFINER function callable by signed-in users",
    sql: "CREATE FUNCTION public.plant_definer() RETURNS int LANGUAGE sql SECURITY DEFINER AS $$ SELECT 1 $$; GRANT EXECUTE ON FUNCTION public.plant_definer() TO authenticated;",
    expect: ["function:plant_definer():security-definer-not-callable-by-clients"],
  },
  {
    what: "rows can be written in another user's name",
    sql: `DROP POLICY "Users manage own intakes" ON public.case_intakes;
          CREATE POLICY plant ON public.case_intakes TO authenticated USING (auth.uid() = user_id) WITH CHECK (true);`,
    expect: ["owned:case_intakes:cannot-insert-row-owned-by-someone-else"],
  },
  {
    what: "a known gap fixed but left on the list",
    sql: `DROP POLICY IF EXISTS "pdf_overlay_fields_write_authenticated" ON public.pdf_overlay_fields;`,
    expect: ["catalogue:pdf_overlay_fields:authenticated-cannot-update"],
    status: "FIXED",
  },
];

let failures = 0;

for (const plant of plants) {
  const r = spawnSync("node", ["scripts/verification/verifyRlsMatrix.mjs"], {
    env: { ...process.env, RLS_PLANT_SQL: plant.sql },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${r.stdout}\n${r.stderr}`;
  const status = plant.status ?? "FAIL";
  const missing = plant.expect.filter((id) => !new RegExp(`^${status}\\s+${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "m").test(out));
  if (r.status === 0 || missing.length) {
    failures += 1;
    console.log(`FAIL  not caught: ${plant.what}`);
    if (r.status === 0) console.log("      the suite exited 0");
    for (const id of missing) console.log(`      expected ${status} ${id}`);
    if (/could not run/.test(out)) console.log(`      ${out.split("\n").find((l) => /could not run/.test(l))}`);
  } else {
    console.log(`pass  caught: ${plant.what}`);
  }
}

console.log(`\nrls-matrix self-test: ${plants.length - failures} of ${plants.length} planted holes caught.`);
process.exit(failures ? 1 : 0);
