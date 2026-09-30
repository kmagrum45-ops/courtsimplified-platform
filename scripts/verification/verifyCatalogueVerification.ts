/**
 * A catalogue entry's verifiedAt vouches for the text that was verified, and
 * for nothing else.
 *
 * WHAT IT PROTECTS. The Small Claims catalogue (claimTypes.ts) is the verified
 * material the whole analysis stands on: it is shown to users, and it is the
 * source pack the AI must cite (groundedCognition.ts). On 2026-09-30 every
 * entry was read against its source; 86 of 146 said more than the source did
 * (a burden-of-proof page cited for what a loan claim must show, a Defence
 * page cited for what a Defence may argue, "the incident was discovered" where
 * the Act says "the claim was discovered"). Those were corrected, and each
 * dated entry got a record in docs/sources/catalogue-verification.json.
 *
 * THE PROPERTIES, each of which fails only on a real problem:
 *
 *   1. Every entry with a verifiedAt has a record with the same date, and
 *      every entry without one is listed as unverifiable with a reason. A
 *      date with no record behind it is the false assurance this replaces.
 *   2. The entry's text is the text that was verified (fingerprint). Editing
 *      a verified entry without re-reading the source fails here -- which is
 *      the point: the fix is to re-verify and re-record, and the message says
 *      so.
 *   3. Every quoted passage from a vendored source (docs/sources/corpus) is
 *      really in that source, verbatim apart from whitespace (" ... " marks
 *      skipped material; each run is checked on its own).
 *   4. The entry's own sourceUrl is among the sources its record quotes, and
 *      so is every alsoCites source -- the link a user follows is one that
 *      was actually read for this entry.
 *   5. For a statute or regulation in the corpus, consolidationPeriod is the
 *      start of the consolidation that was read.
 *   6. No entry uses case-grading or judge-prediction language (CLAUDE.md s. 3),
 *      checked on the joined runtime string of every entry.
 *
 * NEGATIVE CONTROLS: a tampered quote and a tampered text are run through the
 * same checks and must fail, so a check that stopped matching cannot pass
 * silently.
 *
 * No network, no model, no database. Run: npm run test:catalogue-verified
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  catalogueEntries,
  entryFingerprint,
  normalizeForQuote,
  type CatalogueEntry,
  type VerificationLog,
  type VerificationRecord,
} from "../content/catalogueVerification";
import { validateCaseStrengthLanguage } from "../../src/lib/case-system/intelligence/caseStrengthLanguageValidator";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CORPUS = path.join(ROOT, "docs/sources/corpus");

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${label}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
}

const log = JSON.parse(readFileSync(path.join(ROOT, "docs/sources/catalogue-verification.json"), "utf8")) as VerificationLog;
const manifest = JSON.parse(readFileSync(path.join(CORPUS, "manifest.json"), "utf8")) as {
  entries: { url: string; file: string; consolidation?: string }[];
};

const vendoredText = new Map<string, string>();
const consolidationStart = new Map<string, string>();
const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
for (const entry of manifest.entries) {
  vendoredText.set(entry.url, "");
  const match = /FROM ([A-Z]+) (\d+), (\d{4})/.exec(entry.consolidation ?? "");
  if (match && entry.url.endsWith(".doc")) {
    const month = String(MONTHS.indexOf(match[1]) + 1).padStart(2, "0");
    consolidationStart.set(entry.url, `${match[3]}-${month}-${match[2].padStart(2, "0")}`);
  }
}
function vendored(url: string): string | null {
  if (!vendoredText.has(url)) return null;
  if (!vendoredText.get(url)) {
    const file = manifest.entries.find((entry) => entry.url === url)!.file;
    vendoredText.set(url, normalizeForQuote(readFileSync(path.join(CORPUS, file), "utf8")));
  }
  return vendoredText.get(url)!;
}

/** Problems with one record against one entry; empty means it holds. */
function problems(entry: CatalogueEntry, record: VerificationRecord): string[] {
  const out: string[] = [];
  if (record.verifiedAt !== entry.verifiedAt) out.push(`record dated ${record.verifiedAt}, entry dated ${entry.verifiedAt}`);
  if (record.fingerprint !== entryFingerprint(entry)) {
    out.push("the text changed after it was verified -- re-read the source, then update the record (sources, verifiedAt, fingerprint)");
  }
  if (record.sources.length === 0) out.push("no sources recorded");
  for (const source of record.sources) {
    const text = vendored(source.sourceUrl);
    // As in stage-map/citations.ts: " ... " marks skipped material, and each
    // run on either side must be in the source on its own.
    const runs = normalizeForQuote(source.quote).split(" ... ");
    if (text !== null && !runs.every((run) => text.includes(run))) {
      out.push(`quote not found in the vendored source (${source.pinpoint}): "${source.quote.slice(0, 80)}"`);
    }
    if (!source.quote.trim()) out.push(`empty quote for ${source.sourceUrl}`);
  }
  const quoted = new Set(record.sources.map((source) => source.sourceUrl));
  if (!quoted.has(entry.sourceUrl)) out.push(`the entry's own sourceUrl is not among the sources read: ${entry.sourceUrl}`);
  for (const also of entry.alsoCites ?? []) {
    if (!quoted.has(also.sourceUrl)) out.push(`alsoCites ${also.pinpoint} was not read for this entry`);
    if (!also.pinpoint.trim()) out.push(`alsoCites ${also.sourceUrl} has no pinpoint`);
  }
  const expected = consolidationStart.get(entry.sourceUrl);
  if (expected && entry.consolidationPeriod !== expected) {
    out.push(`consolidationPeriod ${entry.consolidationPeriod ?? "(none)"} but the vendored text is the consolidation from ${expected}`);
  }
  return out;
}

const entries = catalogueEntries();
const byKey = new Map(log.records.map((record) => [record.key, record]));
const unverifiable = new Map(log.unverifiable.map((item) => [item.key, item.reason]));

// ---- 1. dated <-> recorded
const datedWithoutRecord = entries.filter((entry) => entry.verifiedAt && !byKey.has(entry.key)).map((entry) => entry.key);
check("every dated entry has a verification record", datedWithoutRecord.length === 0, datedWithoutRecord.join("\n      "));
const undatedUnexplained = entries.filter((entry) => !entry.verifiedAt && !unverifiable.has(entry.key)).map((entry) => entry.key);
check("every undated entry is listed as unverifiable, with a reason", undatedUnexplained.length === 0, undatedUnexplained.join("\n      "));
check(
  "every unverifiable reason says why",
  log.unverifiable.every((item) => item.reason.length > 40),
);
const liveKeys = new Set(entries.map((entry) => entry.key));
const orphans = log.records.filter((record) => !liveKeys.has(record.key)).map((record) => record.key);
check("no record for an entry that no longer exists", orphans.length === 0, orphans.join("\n      "));
const datedButUnverifiable = entries.filter((entry) => entry.verifiedAt && unverifiable.has(entry.key)).map((entry) => entry.key);
check("no entry is both dated and listed as unverifiable", datedButUnverifiable.length === 0, datedButUnverifiable.join("\n      "));

// ---- 2-5. each record holds against its entry
const broken: string[] = [];
for (const entry of entries) {
  const record = byKey.get(entry.key);
  if (!record) continue;
  for (const problem of problems(entry, record)) broken.push(`${entry.key}: ${problem}`);
}
check(`all ${byKey.size} records hold against the live catalogue`, broken.length === 0, broken.join("\n      "));

// ---- 6. No catalogue entry grades a case or predicts a judge (CLAUDE.md s. 3).
// The validator was only ever run over two claim types' elements; "court will
// expect" once shipped because it was split across two concatenated lines,
// which is why this checks the joined runtime string, for every entry.
const grading = entries
  .map((entry) => ({ entry, result: validateCaseStrengthLanguage([entry.name ?? "", entry.text, entry.whenThisComesUp ?? ""].join(" ")) }))
  .filter(({ result }) => !result.valid)
  .map(({ entry, result }) => `${entry.key}: "${result.matchedTerm}"`);
check("no catalogue entry uses case-grading or judge-prediction language", grading.length === 0, grading.join("\n      "));
check(
  "control: the grading check catches a planted phrase",
  !validateCaseStrengthLanguage("The judge will likely find this a strong case.").valid,
);

const corrected = log.records.filter((record) => record.outcome === "corrected");
check(
  "every corrected entry records what was wrong before",
  corrected.every((record) => (record.problemCorrected ?? "").length > 20),
);

// ---- Negative controls
const sample = entries.find((entry) => byKey.get(entry.key)?.sources.some((source) => vendored(source.sourceUrl) !== null))!;
const sampleRecord = byKey.get(sample.key)!;
const tamperedQuote: VerificationRecord = {
  ...sampleRecord,
  sources: sampleRecord.sources.map((source) =>
    vendored(source.sourceUrl) !== null ? { ...source, quote: `${source.quote} and the court must always agree` } : source,
  ),
};
check("control: a quote the source does not contain is caught", problems(sample, tamperedQuote).some((p) => p.includes("quote not found")));
check(
  "control: an entry edited after verification is caught",
  problems({ ...sample, text: `${sample.text} You will win.` }, sampleRecord).some((p) => p.includes("text changed")),
);
check(
  "control: a link that was never read is caught",
  problems({ ...sample, sourceUrl: "https://www.ontario.ca/page/some-other-page" }, { ...sampleRecord, fingerprint: entryFingerprint({ ...sample, sourceUrl: "https://www.ontario.ca/page/some-other-page" }) }).some((p) =>
    p.includes("not among the sources read"),
  ),
);

const authored = log.records.filter((record) => record.outcome === "authored").length;
const supported = log.records.length - corrected.length - authored;
console.log(
  `\n${log.records.length} verified (${supported} as written, ${corrected.length} corrected, ${authored} authored from source), ` +
    `${log.unverifiable.length} unverifiable, of ${entries.length} catalogue entries.`,
);
console.log(failures ? `\n${failures} failure(s).` : "\nAll checks passed.");
if (failures) process.exitCode = 1;
