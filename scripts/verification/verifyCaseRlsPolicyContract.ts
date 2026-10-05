import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const builder = readFileSync("app/builder/page.tsx", "utf8");
const client = readFileSync("src/lib/supabase/client.ts", "utf8");
// RLS/policy DDL survives `supabase migration squash` (it's schema, not
// DML), so this only ever needed to stop pointing at one specific migration
// filename -- reading every current migration file, whatever they're named
// or however many there are, is what actually keeps this check correct
// after any future squash. (Previously read the single, now-deleted
// baseline file by its exact 2026-07-07 name.)
const migrationsDir = "supabase/migrations";
const baselineSchema = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .map((file) => readFileSync(path.join(migrationsDir, file), "utf8"))
  .join("\n");

assert.match(builder, /user_id:\s*user\.id/, "Case creation must use the authenticated user's ID.");
// Asserts the property -- the update that writes the case's master_result is
// scoped to the selected case id -- not today's spelling of the payload. It
// used to require `master_result: masterPayload,` exactly, and failed when the
// payload became `{ ...masterPayload, derivedFrom, ... }` though the scoping
// was unchanged (found 2026-09-28, CI red on main).
// The payload may span lines (2026-10-04: it gained a preserved `position`).
assert.match(builder, /\.update\(\{[\s\S]*?master_result:\s*\{?\s*\.\.\.masterPayload[\s\S]*?\)\s*\.eq\("id", activeId\)/, "Selected-case updates must stay scoped to the selected case ID.");
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
