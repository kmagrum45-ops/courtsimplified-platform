/**
 * Imports a completed review packet into the approvals store.
 *
 *   npm run content:import -- --file docs/review-packet.csv
 *   npm run content:import -- --file docs/review-packet.csv --dry-run
 *
 * COSTS NOTHING. Reads a CSV, writes a JSON file. No model call, no network.
 *
 * *** WHY AN IMPORT SCRIPT RATHER THAN HAND-EDITING ***
 *
 * Review outcomes arrive as a spreadsheet. Transcribing them into a TypeScript
 * catalogue by hand is how an approval ends up attached to the wrong item, or
 * to wording that has since changed — and an approval recorded against text
 * nobody approved is worse than no approval at all, because it reads as
 * compliance.
 *
 * This writes `src/lib/content-library/approvals.json` from the packet, and
 * refuses rows it cannot verify.
 *
 * *** WHAT IT REFUSES ***
 *
 *  - An id not in the current inventory. Either a typo or an item since
 *    deleted; both mean the approval cannot be attached to anything.
 *  - A version that no longer matches the live text. The reviewer approved
 *    different words. This is the check that makes "approved" mean something.
 *  - A row with a reviewer but no date, or a date but no reviewer.
 *  - A malformed date.
 *
 * Refused rows are reported and skipped; the rest still import. The exit code
 * is non-zero when anything was refused, so this cannot pass silently in CI.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { collectContentInventory } from "../../src/lib/content-library/contentInventory";
import type { LicenseeApproval } from "../../src/lib/content-library/licenseeReview";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const APPROVALS_PATH = path.join(
  REPO_ROOT,
  "src",
  "lib",
  "content-library",
  "approvals.json",
);

/** Minimal RFC 4180 parser: quoted fields, embedded commas, doubled quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((cell) => cell.trim().length > 0));
}

function arg(name: string): string | null {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function main(): void {
  const file = arg("file");
  const dryRun = process.argv.includes("--dry-run");

  if (!file) {
    console.error("Usage: npm run content:import -- --file docs/review-packet.csv [--dry-run]");
    process.exitCode = 1;
    return;
  }

  const csvPath = path.resolve(REPO_ROOT, file);
  if (!fs.existsSync(csvPath)) {
    console.error(`Not found: ${file}`);
    process.exitCode = 1;
    return;
  }

  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  if (rows.length < 2) {
    console.error("The packet has no data rows.");
    process.exitCode = 1;
    return;
  }

  const header = rows[0].map((cell) => cell.trim());
  const column = (name: string) => header.indexOf(name);

  for (const required of ["id", "version", "reviewed_by", "reviewed_at"]) {
    if (column(required) < 0) {
      console.error(`The packet is missing the "${required}" column.`);
      process.exitCode = 1;
      return;
    }
  }

  const inventory = new Map(collectContentInventory().map((entry) => [entry.id, entry]));

  const approvals: LicenseeApproval[] = [];
  const refused: string[] = [];
  let blank = 0;

  for (const row of rows.slice(1)) {
    const id = (row[column("id")] ?? "").trim();
    const reviewedBy = (row[column("reviewed_by")] ?? "").trim();
    const reviewedAt = (row[column("reviewed_at")] ?? "").trim();
    const note = column("reviewer_note") >= 0 ? (row[column("reviewer_note")] ?? "").trim() : "";
    const version = Number((row[column("version")] ?? "").trim());

    if (!reviewedBy && !reviewedAt) {
      blank += 1;
      continue;
    }

    if (!reviewedBy || !reviewedAt) {
      refused.push(`${id}: needs BOTH a reviewer and a date (got reviewer="${reviewedBy}", date="${reviewedAt}")`);
      continue;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt)) {
      refused.push(`${id}: review date "${reviewedAt}" is not YYYY-MM-DD`);
      continue;
    }

    const item = inventory.get(id);
    if (!item) {
      refused.push(`${id}: not in the current content inventory`);
      continue;
    }

    if (!Number.isFinite(version) || version !== item.version) {
      refused.push(
        `${id}: the wording has changed since review (packet version ${version}, current ${item.version}). Re-review the current text.`,
      );
      continue;
    }

    approvals.push({ id, reviewedBy, reviewedAt, version, ...(note ? { note } : {}) });
  }

  console.log(`rows read:     ${rows.length - 1}`);
  console.log(`left blank:    ${blank}`);
  console.log(`approved:      ${approvals.length}`);
  console.log(`refused:       ${refused.length}`);

  for (const reason of refused) console.log(`  REFUSED  ${reason}`);

  if (dryRun) {
    console.log("\n--dry-run: approvals.json not written.");
    if (refused.length) process.exitCode = 1;
    return;
  }

  fs.writeFileSync(
    APPROVALS_PATH,
    JSON.stringify(
      {
        _comment:
          "Written by scripts/content/importReviewResults.ts. Do not hand-edit: the import script is the audit trail. Each approval is tied to the content version reviewed; editing the text voids it.",
        importedAt: new Date().toISOString(),
        approvals,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(`\nwrote ${path.relative(REPO_ROOT, APPROVALS_PATH)}`);
  if (refused.length) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
