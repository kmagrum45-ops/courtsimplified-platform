import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260810000014_repair_ontario_cohort_2_split_canonical_identities.sql", "utf8");
const executable = migration.replace(/^--.*$/gm, "");
const repairs = [
  ["6cdaec7b-5e8b-4f31-a360-580fc85660d3", "c64b6ee4-f865-4da7-a8e9-6d26762d7098", "small-claims", "ontario/small-claims/scr-15a-aug22-en-fil.pdf", "pdf"],
  ["2f3b3dbb-0799-4d81-bcc3-03c2116dfe4d", "1a170388-b11c-4642-a61a-bb95cb6da8ac", "small-claims", "ontario/small-claims/scr-20b-jan21-en-fil.pdf", "pdf"],
  ["5ad2929b-c763-4f87-b0cf-cb062835b293", "29a85a4b-05bb-47e6-ac3a-75c9c614973c", "small-claims", "ontario/small-claims/scr-20n-may25-en-fil.pdf", "pdf"],
  ["d2a6b784-5ac5-491e-860c-8b02645d4957", "5310b079-0ede-4b63-8fbc-dbb04319fc66", "family", "family/form_17b_2018.pdf", "pdf"],
];

assert.match(executable, /UPDATE public\.court_form_library AS form\s+SET canonical_form_id = source\.canonical_form_id/, "must repoint only catalogue identity");
assert.doesNotMatch(executable, /legal_form_mapping_rules|INSERT\s+INTO|DELETE\s+FROM|SET\s+(?:file_path|file_type|court_type)\s*=/i, "must not alter mappings, assets, or court type");
for (const [oldId, newId, court, filePath, fileType] of repairs) {
  assert.match(executable, new RegExp(`'${oldId}'::uuid, '${court}'::text, '${filePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'::text, '${fileType}'::text, '${newId}'::uuid`), `${oldId} must repoint only its exact duplicate physical asset`);
}
assert.doesNotMatch(executable, /4300c97c-a430-45b4-b7cb-da90f0d9be20|f7ba6b3f-ad58-49f2-8c1d-affc12835d2f|78946826-4c9a-4a4d-907-3cda465d7869|49b1171a-5a50-4067-9035-59c8626fade8|ebb42456-5262-487b-aa9e-a3e4d766e332/, "must leave non-split Cohort 2 records untouched");
assert.equal((executable.match(/SET canonical_form_id =/g) || []).length, 1, "only one bounded canonical-ID repoint operation is allowed");

console.log("Cohort 2 split canonical identity repair structural verification passed.");
