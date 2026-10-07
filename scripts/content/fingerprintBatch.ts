/**
 * Stamps the fingerprints for one batch of case types, after its author has
 * read every source and written the batch's verification records.
 *
 *   node --import tsx scripts/content/fingerprintBatch.ts --batch sc-money-owed-1
 *
 * For every dated entry of the batch's case types, it sets the record's
 * fingerprint to the entry's current text (entryFingerprint) -- the record must
 * already exist, with its sources quoted. It never creates a record: a record
 * with no quotes would vouch for text nobody checked. Then run
 * `npm run test:catalogue-verified`, which checks every quote against the
 * vendored source.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { catalogueEntries, entryFingerprint, type VerificationLog } from "./catalogueVerification";

const ROOT = process.cwd();
const batch = process.argv[process.argv.indexOf("--batch") + 1];
if (!batch || process.argv.indexOf("--batch") < 0) {
  console.error("Say which batch: --batch <name from src/lib/case-system/intake/moreClaimTypes/plan.json>");
  process.exit(1);
}

const plan = JSON.parse(readFileSync(path.join(ROOT, "src/lib/case-system/intake/moreClaimTypes/plan.json"), "utf8")) as {
  batch: string;
  types: { id: string }[];
}[];
const entry = plan.find((item) => item.batch === batch);
if (!entry) {
  console.error(`No batch "${batch}" in plan.json.`);
  process.exit(1);
}
const ids = new Set(entry.types.map((type) => type.id));
const file = path.join(ROOT, "docs/sources/catalogue-verification", `${batch}.json`);
const log = JSON.parse(readFileSync(file, "utf8")) as Pick<VerificationLog, "records" | "unverifiable">;
const byKey = new Map(log.records.map((record) => [record.key, record]));

let stamped = 0;
const missing: string[] = [];
for (const item of catalogueEntries()) {
  if (!ids.has(item.claimTypeId) || !item.verifiedAt) continue;
  const record = byKey.get(item.key);
  if (!record) {
    missing.push(item.key);
    continue;
  }
  record.fingerprint = entryFingerprint(item);
  record.verifiedAt = item.verifiedAt;
  stamped += 1;
}
writeFileSync(file, `${JSON.stringify(log, null, 2)}\n`);
console.log(`${batch}: ${stamped} fingerprint(s) stamped.`);
if (missing.length) {
  console.log(`No record yet (write one, quoting its sources, then run this again):\n  ${missing.join("\n  ")}`);
  process.exitCode = 1;
}
