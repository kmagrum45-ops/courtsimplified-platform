/**
 * THE SMALL CLAIMS DEMO SCREENS READ ANSWERS FROM THE CASE RECORD, NOT FROM A COPY (site owner, 6 Nov 2026; Chrome
 * check of #544 and the sweep that followed it).
 *
 * The rule: a screen reads a person's answer through the case record (caseFile.ts caseFileOf, caseFileOfMaster, and
 * the readers over it: recordWords, answerNow, claimKindOf, slotText) and saves it through the one writer. Chrome's
 * findings F1 to F5 were each a screen showing or using its own older copy: the review's box (the chat's guided.facts),
 * the chat's reply note (only "Change" counted), the case file page's deadlines (its own count), the overview's amount
 * (the analysis copy). The sweep of 6 Nov listed 41 places on the demo path that still read a raw copy.
 *
 * What it checks: every file on the Small Claims demo path (home, situation, the questions, the review, the overview,
 * the case page, the case file page, the whole form, the Forms tab, the dashboard) is scanned, outside comments, for
 * each read of a raw copy of an answer (RAW below), every occurrence counted. Each file's count is on
 * screensReadRecordAllowed.json with the sweep entry that explains it. The check fails when:
 *   1. a file reads more raw copies than its entry allows (a new bypass), or a demo file not listed reads any;
 *   2. a file reads fewer than its entry says (a screen moved onto the record: lower the entry to the new number --
 *      a one-line change with an obvious cause, so the work is never punished, and the number cannot creep back up);
 *   3. an entry names a file that no longer exists, or has no reason.
 * A self-test plants a raw read in a synthetic file, so the check cannot pass by finding nothing.
 *
 * WHAT FAILURE THIS CATCHES: a screen on the demo path that starts reading an answer from a copy instead of the record.
 *
 * Run: npm run test:screens-read-record
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

/** Reads of a raw copy of an answer (each names its store). */
export const RAW: [string, RegExp][] = [
  ["the analysis copy (master_result.intakeData)", /\bintakeData\b/g],
  ["the saved chat answers (master_result.intakeAnswers)", /\bintakeAnswers\b/g],
  ["the analysis facts (master_result.intakeFacts)", /\bintakeFacts\b/g],
  ["the chat's own answer list (guided.earlierAnswers)", /\bearlierAnswers\b/g],
  ["the chat's own facts (guided.facts)", /guided\??\.facts\b|"guided",\s*"facts"/g],
  ["the review's own answers (builder.initialAnswers)", /\binitialAnswers\b/g],
  ["the whole form's own copy read directly", /\["small-claims"\]\??\.input\b|"small-claims",\s*"input"/g],
  ["a database column read as an answer (master_result->...)", /master_result->/g],
  ["the saved case's copy for a form's start values (storedIntakeValues)", /\bstoredIntakeValues\(/g],
  ["the story read from the analysis copy (userStory)", /\buserStory\(/g],
  ["the amount read from the analysis copy (recordedAmountOf)", /\brecordedAmountOf\(/g],
  ["a fact read only when changed with \"Change\" (changedWords)", /\bchangedWords\(/g],
];

/** The Small Claims demo path's screens and the pieces they draw answers from. */
export const DEMO_FILES = [
  "app/page.tsx", "app/_components/HomeLocationGate.tsx", "app/_components/CaseUnderstandingCard.tsx", "app/_components/SituationQuestions.tsx",
  "app/builder/page.tsx", "app/builder/_components/GuidedSmallClaimsIntake.tsx", "app/builder/_components/SmallClaimsIntake.tsx",
  "app/_components/IntakeReviewPanel.tsx", "app/builder/_components/IntelligenceOverviewPanel.tsx", "app/builder/_components/StatementOfClaimSurface.tsx",
  "app/builder/_components/StageAnswerPanel.tsx", "app/cases/[id]/layout.tsx", "app/cases/[id]/page.tsx", "app/cases/[id]/case-file/page.tsx",
  "app/cases/[id]/forms/page.tsx", "app/cases/_components/CaseHomeContext.tsx", "app/cases/_components/CaseFilePanel.tsx", "app/dashboard/page.tsx",
  "app/forms/FormsWorkspace.tsx", "src/lib/case-system/intakeReview.ts", "src/lib/case-system/caseRecord.ts", "src/lib/case-system/caseStep.ts",
];

const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
export function rawReads(text: string): Record<string, number> {
  const code = stripComments(text);
  const out: Record<string, number> = {};
  for (const [what, pattern] of RAW) { const found = code.match(pattern)?.length ?? 0; if (found) out[what] = found; }
  return out;
}
type Entry = { file: string; reads: number; reason: string };
export function problems(files: { file: string; text: string | null }[], allowed: Entry[]): string[] {
  const out: string[] = [];
  const byFile = new Map(allowed.map((entry) => [entry.file, entry]));
  for (const { file, text } of files) {
    const entry = byFile.get(file);
    if (text === null) { if (entry) out.push(`listed but no longer exists: ${file} (delete its entry)`); continue; }
    const reads = rawReads(text);
    const count = Object.values(reads).reduce((sum, n) => sum + n, 0);
    const allowedCount = entry?.reads ?? 0;
    if (count > allowedCount) out.push(`${file} reads ${count} raw copies of answers, ${allowedCount} allowed: a new bypass (${JSON.stringify(reads)}). Read the answer through the case record (caseFileOf, recordWords) instead.`);
    else if (count < allowedCount) out.push(`${file} now reads ${count} raw copies, its entry says ${allowedCount}: a screen moved onto the record. Lower the entry to ${count}.`);
    if (entry && entry.reason.trim().length < 20) out.push(`${file}: the entry has no real reason`);
  }
  for (const entry of allowed) if (!files.some((item) => item.file === entry.file)) out.push(`listed but not a demo file: ${entry.file} (delete its entry)`);
  return out;
}

let failed = 0;
const check = (name: string, run: () => void) => { try { run(); console.log(`pass  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n").join("\n      ")}`); } };

check("self-test: a planted raw read fails; a comment naming one does not count; a lower count asks for the entry to be lowered", () => {
  const planted = [{ file: "x.tsx", text: "// intakeData in a comment\nconst a = master.intakeData.amountClaimed;" }];
  assert.ok(problems(planted, []).some((p) => p.includes("a new bypass")));
  assert.deepEqual(problems(planted, [{ file: "x.tsx", reads: 1, reason: "synthetic: one read allowed for the test" }]), []);
  assert.ok(problems([{ file: "x.tsx", text: "const a = 1;" }], [{ file: "x.tsx", reads: 1, reason: "synthetic: one read allowed for the test" }]).some((p) => p.includes("Lower the entry to 0")));
});

const allowed = (JSON.parse(readFileSync("scripts/verification/screensReadRecordAllowed.json", "utf8")) as { entries: Entry[] }).entries;
const files = DEMO_FILES.map((file) => ({ file, text: existsSync(file) ? readFileSync(file, "utf8") : null }));
check(`every Small Claims demo screen reads answers through the record, except the listed raw reads (${DEMO_FILES.length} files, ${allowed.reduce((sum, entry) => sum + entry.reads, 0)} raw reads listed)`, () => {
  const found = problems(files, allowed);
  assert.equal(found.length, 0, found.join("\n"));
});

if (process.argv.includes("--print")) for (const { file, text } of files) if (text) console.log(file, JSON.stringify(rawReads(text)));
console.log(failed ? `\n${failed} check(s) failed.` : "\nNo demo screen reads a new raw copy of an answer.");
process.exit(failed ? 1 : 0);
