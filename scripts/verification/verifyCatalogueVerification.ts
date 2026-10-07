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
 *   7. Every link is an official https page (not the e-Laws viewer, which is
 *      an empty shell) or a decision saved under docs/sources/.
 *
 * Covers the Small Claims catalogue and, since 2026-09-30, the civil and
 * family libraries (civilClaimTypes.ts, familyMatterTypes.ts).
 *
 * NEGATIVE CONTROLS: a tampered quote and a tampered text are run through the
 * same checks and must fail, so a check that stopped matching cannot pass
 * silently.
 *
 * No network, no model, no database. Run: npm run test:catalogue-verified
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  catalogueEntries,
  loadVerificationLog,
  entryFingerprint,
  normalizeForQuote,
  stripWrappingQuotes,
  nextStepFingerprint,
  type CatalogueEntry,
  type VerificationLog,
  type VerificationRecord,
} from "../content/catalogueVerification";
import { NEXT_STEP_BLOCKS, isPlaceholder } from "../../src/lib/content-library/nextSteps";
import { validateCaseStrengthLanguage } from "../../src/lib/case-system/intelligence/caseStrengthLanguageValidator";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CORPUS = path.join(ROOT, "docs/sources/corpus");

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${label}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
}

const log = loadVerificationLog(ROOT);
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
    const runs = normalizeForQuote(source.quote).split(" ... ").map(stripWrappingQuotes);
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

// ---- 7. Every link resolves to a place a reader can check: an https page on
// an official domain, or a decision saved under docs/sources/.
const OFFICIAL = [
  "https://www.ontario.ca/", "https://ontario.ca/", "https://www.ontariocourts.ca/", "https://ontariocourts.ca/",
  "https://www.ontariocourtforms.on.ca/", "https://www.canlii.org/", "https://www.lso.ca/",
  // The federal Justice Laws site: the official consolidation of the Divorce
  // Act and the Federal Child Support Guidelines.
  "https://laws-lois.justice.gc.ca/",
];
const VIEWER = ["https://www.ontario.ca/laws/statute/", "https://www.ontario.ca/laws/regulation/"];
const resolvable = (url: string) =>
  url.startsWith("docs/sources/")
    ? existsSync(path.join(ROOT, url))
    : OFFICIAL.some((prefix) => url.startsWith(prefix)) && !VIEWER.some((prefix) => url.startsWith(prefix));
const badLinks = entries.flatMap((entry) =>
  [entry.sourceUrl, ...(entry.alsoCites ?? []).map((also) => also.sourceUrl)]
    .filter((url) => !resolvable(url))
    .map((url) => `${entry.key}: ${url}`),
);
check("every entry's links resolve to an official page or a saved decision", badLinks.length === 0, badLinks.join("\n      "));

// ---- 8. Next steps. Every Civil and Family block, and every block with a
// record, holds against its record the same way: text unchanged since it was
// verified, and every vendored passage really in the source.
// Case types written after 2026-10-07 (moreClaimTypes/) must rest on text
// saved in this repository -- a vendored statute, regulation or official page,
// or a saved decision -- so every quote in their records is checked above.
// A live page's quote cannot be checked, so a new entry may not rely on one.
const laterTypeIds = new Set(
  (JSON.parse(readFileSync(path.join(ROOT, "src/lib/case-system/intake/moreClaimTypes/plan.json"), "utf8")) as { types: { id: string }[] }[]).flatMap((batch) =>
    batch.types.map((type) => type.id),
  ),
);
const unsavedSources = entries
  .filter((entry) => laterTypeIds.has(entry.claimTypeId))
  .flatMap((entry) => [entry.sourceUrl, ...(entry.alsoCites ?? []).map((also) => also.sourceUrl)].map((url) => ({ key: entry.key, url })))
  .filter(({ url }) => vendored(url) === null && !/docs\/sources\//.test(url) && !/decisions\.scc-csc\.ca|coadecisions\.ontariocourts\.ca/.test(url))
  .map(({ key, url }) => `${key}: ${url}`);
check("every case type written after 2026-10-07 rests on saved text whose quotes are checked", unsavedSources.length === 0, unsavedSources.slice(0, 20).join("\n      "));
const undatedLater = entries.filter((entry) => laterTypeIds.has(entry.claimTypeId) && !entry.verifiedAt).map((entry) => entry.key);
check("every entry of a case type written after 2026-10-07 is dated and recorded", undatedLater.length === 0, undatedLater.slice(0, 20).join("\n      "));

const nextStepRecords = new Map((log.nextSteps ?? []).map((record) => [record.id, record]));
const nextStepProblems: string[] = [];
for (const block of NEXT_STEP_BLOCKS) {
  if (isPlaceholder(block)) continue;
  const record = nextStepRecords.get(block.id);
  if (!record) {
    if (block.pathway !== "small-claims") nextStepProblems.push(`${block.id}: no verification record`);
    continue;
  }
  if (record.fingerprint !== nextStepFingerprint(block)) {
    nextStepProblems.push(`${block.id}: the text changed after it was verified -- re-read the rules and update the record`);
  }
  for (const source of record.sources) {
    const text = vendored(source.sourceUrl);
    const runs = normalizeForQuote(source.quote).split(" ... ").map(stripWrappingQuotes);
    if (text !== null && !runs.every((run) => text.includes(run))) {
      nextStepProblems.push(`${block.id}: quote not in the vendored source (${source.pinpoint})`);
    }
  }
  if (!record.sources.some((source) => source.sourceUrl === block.sourceUrl)) {
    nextStepProblems.push(`${block.id}: its link was not among the sources read`);
  }
  const grading = validateCaseStrengthLanguage(`${block.title} ${block.text}`);
  if (!grading.valid) nextStepProblems.push(`${block.id}: case-grading language "${grading.matchedTerm}"`);
}
check(
  `every verified next-step block holds against its record (${nextStepRecords.size} recorded)`,
  nextStepProblems.length === 0,
  nextStepProblems.join("\n      "),
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
