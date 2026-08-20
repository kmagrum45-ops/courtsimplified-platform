import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20260810000013_normalize_ontario_cohort_2_catalogue_metadata.sql",
  "utf8",
);
const executableMigration = migration.replace(/^--.*$/gm, "");

const repaired = [
  ["4300c97c-a430-45b4-b7cb-da90f0d9be20", "small-claims", "Form 11.3A", "Notice of Discontinued Claim", "already-started"],
  ["f7ba6b3f-ad58-49f2-8c1d-affc12835d2f", "small-claims", "Form 20A", "Certificate of Judgment", "enforcement"],
  ["78946826-4c9a-4a4d-907b-3cda465d7869", "small-claims", "Form 20D", "Writ of Seizure and Sale of Land", "enforcement"],
  ["49b1171a-5a50-4067-9035-59c8626fade8", "small-claims", "Form 20E", "Notice of Garnishment", "enforcement"],
  ["ebb42456-5262-487b-aa9e-a3e4d766e332", "family", "Form 17D", "Settlement conference brief for protection application or status review", "conference"],
];
const unresolved = [
  "6cdaec7b-5e8b-4f31-a360-580fc85660d3", "c64b6ee4-f865-4da7-a8e9-6d26762d7098",
  "1a170388-b11c-4642-a61a-bb95cb6da8ac", "2f3b3dbb-0799-4d81-bcc3-03c2116dfe4d",
  "29a85a4b-05bb-47e6-ac3a-75c9c614973c", "5ad2929b-c763-4f87-b0cf-cb062835b293",
  "5310b079-0ede-4b63-8fbc-dbb04319fc66", "d2a6b784-5ac5-491e-860c-8b02645d4957",
];

assert.match(executableMigration, /UPDATE public\.court_form_library AS form/, "must repair only the canonical catalogue");
assert.doesNotMatch(executableMigration, /legal_form_mapping_rules|INSERT\s+INTO|DELETE\s+FROM|SET\s+canonical_form_id|SET\s+court_type|file_path|file_type/i, "must not change mappings, identities, or physical assets");
assert.match(migration, /form_checked_at = DATE '2026-08-12'[\s\S]*form_review_status = 'verified-catalog-source'/, "all repairs need current verified catalogue provenance");
for (const [id, court, number, title, stage] of repaired) {
  assert.match(migration, new RegExp(`'${id}'::uuid, '${court}'::text, '${number}'::text, '${title}'::text, '${stage}'::text`), `${id} must have exact source-backed metadata`);
}
for (const id of unresolved) {
  assert.doesNotMatch(migration, new RegExp(id), `${id} must remain untouched while its canonical identity is split`);
}
assert.equal((migration.match(/::uuid/g) || []).length, 15, "only five repair identities may appear in preconditions and source values");

console.log("Cohort 2 catalogue normalization migration structural verification passed.");
