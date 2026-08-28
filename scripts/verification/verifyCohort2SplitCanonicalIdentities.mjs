// This used to read the one-time repair migration's SQL text directly.
// `supabase migration squash` (2026-08-27) produces a schema-only dump, so
// that DML -- and the file it lived in -- no longer exists. Checked here
// instead: each duplicate physical asset now resolves to its NEW canonical
// identity (the repoint's actual, current effect), not that the migration's
// own SQL only ever contained one bounded UPDATE -- a delta property of one
// historical statement with no stable live-data equivalent post-squash.
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

const repairs = [
  ["6cdaec7b-5e8b-4f31-a360-580fc85660d3", "c64b6ee4-f865-4da7-a8e9-6d26762d7098", "small-claims", "ontario/small-claims/scr-15a-aug22-en-fil.pdf", "pdf"],
  ["2f3b3dbb-0799-4d81-bcc3-03c2116dfe4d", "1a170388-b11c-4642-a61a-bb95cb6da8ac", "small-claims", "ontario/small-claims/scr-20b-jan21-en-fil.pdf", "pdf"],
  ["5ad2929b-c763-4f87-b0cf-cb062835b293", "29a85a4b-05bb-47e6-ac3a-75c9c614973c", "small-claims", "ontario/small-claims/scr-20n-may25-en-fil.pdf", "pdf"],
  ["d2a6b784-5ac5-491e-860c-8b02645d4957", "5310b079-0ede-4b63-8fbc-dbb04319fc66", "family", "family/form_17b_2018.pdf", "pdf"],
];

const { data, error } = await supabase
  .from("court_form_library")
  .select("canonical_form_id, court_type, file_path, file_type")
  .in("file_path", repairs.map(([, , , filePath]) => filePath));
if (error) throw new Error(`court_form_library query failed: ${error.message}`);

for (const [oldId, newId, court, filePath, fileType] of repairs) {
  const row = (data || []).find((candidate) => candidate.file_path === filePath);
  assert.ok(row, `${filePath} must be present in court_form_library`);
  assert.equal(row.court_type, court, `${filePath} must retain its exact court type`);
  assert.equal(row.file_type, fileType, `${filePath} must retain its exact file type`);
  assert.equal(row.canonical_form_id, newId, `${filePath} must have repointed to its new canonical identity`);
  assert.notEqual(row.canonical_form_id, oldId, `${filePath} must no longer carry the old duplicate identity ${oldId}`);
}

console.log("Cohort 2 split canonical identity repair structural verification passed.");
