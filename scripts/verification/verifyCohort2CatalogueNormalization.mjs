// This used to read the one-time repair migration's SQL text directly.
// `supabase migration squash` (2026-08-27) produces a schema-only dump, so
// that DML -- and the file it lived in -- no longer exists. Checked here
// instead: the live, current state of the five repaired records, and (via
// the sibling verifyCohort2SplitCanonicalIdentities.mjs) that the eight
// then-unresolved duplicate identities were handled by a later, separate
// repair rather than silently dropped. "Only these five identities were
// touched by this migration" is a delta property of one historical
// statement and has no stable equivalent once migrations are squashed;
// dropped rather than asserted against something it can no longer mean.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and an anon/publishable key are required (environment or .env.local).",
  );
}
const supabase = createClient(supabaseUrl, supabaseKey);

const repaired = [
  ["4300c97c-a430-45b4-b7cb-da90f0d9be20", "small-claims", "Form 11.3A", "Notice of Discontinued Claim", "already-started"],
  ["f7ba6b3f-ad58-49f2-8c1d-affc12835d2f", "small-claims", "Form 20A", "Certificate of Judgment", "enforcement"],
  ["78946826-4c9a-4a4d-907b-3cda465d7869", "small-claims", "Form 20D", "Writ of Seizure and Sale of Land", "enforcement"],
  ["49b1171a-5a50-4067-9035-59c8626fade8", "small-claims", "Form 20E", "Notice of Garnishment", "enforcement"],
  ["ebb42456-5262-487b-aa9e-a3e4d766e332", "family", "Form 17D", "Settlement conference brief for protection application or status review", "conference"],
];

const { data, error } = await supabase
  .from("court_form_library")
  .select("canonical_form_id, court_type, form_number, official_title, procedure_stage, form_checked_at, form_review_status")
  .in("canonical_form_id", repaired.map(([id]) => id));
if (error) throw new Error(`court_form_library query failed: ${error.message}`);

for (const [id, court, number, title, stage] of repaired) {
  const row = (data || []).find((candidate) => candidate.canonical_form_id === id && candidate.court_type === court);
  assert.ok(row, `${id} must be present in court_form_library for ${court}`);
  assert.equal(row.form_number, number, `${id} must have the exact repaired form number`);
  assert.equal(row.official_title, title, `${id} must have the exact repaired title`);
  assert.equal(row.procedure_stage, stage, `${id} must have the exact repaired procedure stage`);
  assert.equal(row.form_checked_at, "2026-08-12", `${id} must carry the repair's verified check date`);
  assert.equal(row.form_review_status, "verified-catalog-source", `${id} must carry verified-catalog-source`);
}

console.log("Cohort 2 catalogue normalization migration structural verification passed.");
