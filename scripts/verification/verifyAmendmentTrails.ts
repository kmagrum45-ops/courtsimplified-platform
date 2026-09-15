/**
 * Every vendored source's recent amendments, and whether anyone traced them.
 *
 * COSTS NOTHING. Reads docs/sources/ off disk. No network.
 *
 * WHY THIS EXISTS. A consolidation date is the record of an amendment someone
 * made on purpose, and the reason is knowable. O. Reg. 391/97's header read
 * "from 2024-07-26" while the federal Guidelines read "current to 2026-07-21",
 * and that difference was written into six places as proof of separate
 * amendment histories. 2024-07-26 was the date O. Reg. 303/24 REVOKED
 * Ontario's table. The strongest evidence against the conclusion was read as
 * the evidence for it, because nothing asked what the amendment changed.
 *
 * So: for each vendored file, find the consolidation year, then find the
 * amendment citations IN THE VENDORED TEXT ITSELF from that year or later.
 * Those are amendments to the very provisions this codebase quotes, made
 * around the time the consolidation was cut. An untraced one is the shape the
 * child support failure had.
 *
 * DISTINCT FROM `pendingReplacement`, which covers amendments NOT YET in
 * force. These are in force and complete — the case nothing was looking for.
 *
 * This reports; it does not fail on an untraced amendment. Tracing one costs a
 * retrieval and a judgment, and a check that goes red until someone does 30 of
 * them is a check people turn off. It fails only if a file it is meant to
 * cover has no consolidation marker at all, or if a trail this repo has
 * already traced goes missing.
 *
 * Run: node --import tsx scripts/verification/verifyAmendmentTrails.ts
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SOURCES_DIR = path.resolve(process.cwd(), "docs", "sources");

/**
 * Amendments already traced: someone read what the amending instrument did and
 * recorded it. The value is where that record lives.
 */
const TRACED: Record<string, string> = {
  "O. Reg. 303/24":
    "Revoked Schedule I of O. Reg. 391/97 (Ontario's child support table) and " +
    "rewrote s. 2 (1) so that 'table' means the federal table. Recorded in " +
    "docs/OUTSTANDING_ISSUES.md section 0 and in the file header.",
};

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/** "Consolidation period: from 2024-07-26" or "current to 2026-07-21". */
function consolidationYear(text: string): number | null {
  const match =
    /Consolidation period:\s*from\s*(\d{4})-/i.exec(text) ||
    /current to\s*(\d{4})-/i.exec(text);
  return match ? Number(match[1]) : null;
}

/**
 * Amendment citations as e-Laws and Justice Canada write them:
 * "O. Reg. 303/24, s. 1", "2023, c. 12, Sched. 3, s. 1", "S.C. 2019, c. 16".
 *
 * Two-digit regulation years are the norm in e-Laws citation trails, so 24
 * means 2024. A regulation number is number/year, not year/number.
 */
function recentAmendments(text: string, sinceYear: number): Map<string, number> {
  const found = new Map<string, number>();

  const oReg = /O\. Reg\.\s*(\d{1,3})\/(\d{2})/g;
  let match: RegExpExecArray | null;
  while ((match = oReg.exec(text)) !== null) {
    // Two-digit years, e-Laws style. 97, 98, 99 are 1997-1999, not 2097 —
    // without this the regulation's OWN number (O. Reg. 258/98) reads as an
    // amendment made in 2098 and swamps the list.
    const twoDigit = Number(match[2]);
    const year = twoDigit >= 50 ? 1900 + twoDigit : 2000 + twoDigit;
    if (year >= sinceYear) {
      const label = `O. Reg. ${match[1]}/${match[2]}`;
      found.set(label, (found.get(label) || 0) + 1);
    }
  }

  const statute = /\b((?:S\.C\.\s*)?(\d{4}),\s*c\.\s*\d+)/g;
  while ((match = statute.exec(text)) !== null) {
    if (Number(match[2]) >= sinceYear) {
      // antiword pads citations unevenly, so "2025,  c.  6" and "2025, c. 6"
      // are the same amendment and must not be counted as two.
      const label = match[1].replace(/\s+/g, " ");
      found.set(label, (found.get(label) || 0) + 1);
    }
  }

  return found;
}

function main(): void {
  const files = fs
    .readdirSync(SOURCES_DIR)
    .filter((name) => name.endsWith(".txt") && name !== "README.md")
    .sort();

  check("there are vendored .txt sources to check", files.length > 0);

  const untraced: { file: string; amendment: string; hits: number }[] = [];

  for (const file of files) {
    const text = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
    const year = consolidationYear(text);

    check(
      `${file} records a consolidation or currency date`,
      year !== null,
      "every vendored source must say what consolidation it was cut from — " +
        "without it there is nothing to trace and no way to tell it has gone stale",
    );
    if (year === null) continue;

    // The consolidation year and the one before it. An amendment cited in the
    // vendored text from that window is very likely the one that produced the
    // consolidation, which is exactly the thing that went untraced.
    for (const [amendment, hits] of recentAmendments(text, year - 1)) {
      if (!TRACED[amendment]) untraced.push({ file, amendment, hits });
    }
  }

  // A traced amendment must still be findable, or the record points at nothing.
  for (const [amendment, note] of Object.entries(TRACED)) {
    const appears = files.some((file) =>
      fs.readFileSync(path.join(SOURCES_DIR, file), "utf8").includes(amendment),
    );
    check(
      `traced amendment ${amendment} still appears in a vendored source`,
      appears,
      `recorded as: ${note}`,
    );
  }

  console.log("\n--- Recent amendments cited in vendored text, not yet traced ---");
  if (untraced.length === 0) {
    console.log("none");
  } else {
    const byFile = new Map<string, string[]>();
    for (const item of untraced) {
      const list = byFile.get(item.file) || [];
      list.push(`${item.amendment} (${item.hits} citation${item.hits === 1 ? "" : "s"})`);
      byFile.set(item.file, list);
    }
    for (const [file, list] of [...byFile].sort()) {
      console.log(`\n${file}`);
      for (const entry of list.sort()) console.log(`  ${entry}`);
    }
    console.log(
      `\n${untraced.length} amendment/file pair(s). Each is an in-force change to a ` +
        "provision this codebase quotes, made around the consolidation it was cut " +
        "from. Trace one by retrieving the amending instrument and reading what it " +
        "did, then add it to TRACED above with what it changed.",
    );
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
