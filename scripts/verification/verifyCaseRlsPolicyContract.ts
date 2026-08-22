import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const builder = readFileSync("app/builder/page.tsx", "utf8");
const client = readFileSync("src/lib/supabase/client.ts", "utf8");
// The committed baseline is the schema of record for the remote database. This
// previously read supabase/remote_schema.sql, a 0-byte artifact, so the policy
// check below reported "unavailable" and could never fail.
const baselineSchema = readFileSync(
  "supabase/migrations/20260707023159_baseline_remote_schema.sql",
  "utf8",
);

assert.match(builder, /user_id:\s*user\.id/, "Case creation must use the authenticated user's ID.");
assert.match(builder, /\.update\([\s\S]*?master_result:\s*masterPayload,[\s\S]*?\)\s*\.eq\("id", activeId\)/, "Selected-case updates must stay scoped to the selected case ID.");
assert.doesNotMatch(client, /SUPABASE_SERVICE_ROLE_KEY|service_role/, "Browser Supabase client must not use service-role credentials.");

// pg_dump quotes every identifier, so these tolerate optional double quotes
// around public and cases. Without that they miss the real DDL entirely.
assert.match(
  baselineSchema,
  /create\s+policy[\s\S]{0,800}?on\s+(?:"?public"?\.)?"?cases"?/i,
  "Baseline schema must declare row-level policies on public.cases.",
);
assert.match(
  baselineSchema,
  /alter\s+table\s+(?:"?public"?\.)?"?cases"?\s+enable\s+row\s+level\s+security/i,
  "Baseline schema must enable row level security on public.cases.",
);
assert.match(
  baselineSchema,
  /create\s+policy[^;]{0,600}"?cases"?[^;]{0,600}"?auth"?\.\s*"?uid"?/i,
  "Case policies must be scoped to the authenticated user via auth.uid().",
);

console.log("Case RLS contract: client-owner-create=pass selected-case-update=pass browser-service-role=absent baseline-cases-policies=present baseline-cases-rls=enabled baseline-owner-scoped=pass.");
console.log("Live RLS verification remains required through a read-only SQL Editor policy query; no policy result was inferred from client code.");
