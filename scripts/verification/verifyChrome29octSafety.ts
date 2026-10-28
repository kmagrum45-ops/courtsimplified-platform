/**
 * The site owner's Chrome re-test of 29 October, items E, F and G: safety,
 * deadlines and the Family "which court" step. Known problems, written as
 * FAILING checks before any fix (tests/browser/harness/knownProblems29oct-safety.ts
 * lists each one, in plain words).
 *
 *   npx tsx scripts/verification/verifyChrome29octSafety.ts
 *
 * Every check runs the real code, no browser and no model call, and asserts a
 * property, not today's value:
 *
 *   E1  the danger screen (dangerWords.ts) -- which sets the "call 911" notice,
 *       the Safety line in the case file and the safety question -- does not
 *       fire on a sentence that denies danger ("No violence."), and still fires
 *       on every phrasing that states it ("he hit me", "I'm afraid of him").
 *   E2  domestic-violence helplines are not shown on a case whose words name no
 *       danger and that is not a family case (a bakery invoice).
 *   F1  a day named by a fixed-date holiday with its year ("Christmas 2025") is
 *       never silently dropped by the date reader: it is counted, or asked about.
 *   F2  the Legislation Act roll (s. 88, s. 89 (1), retrieved 2026-10-28) holds
 *       for a two-year limit from Christmas Day 2025: the result is not a
 *       holiday and every day from the anniversary to it is one. (Passes today;
 *       kept so the "two holiday definitions" trap cannot reopen here.)
 *   G1  the Family "which court" step names the court offices in the person's
 *       own city when the saved court list has one there.
 *   G2  a person who said they were never married is not shown divorce
 *       material on that step: not the Divorce Act's "court" statement in the
 *       triage, and not Form 8A (Application (Divorce)) as a form for their step.
 *
 * What failure it exists to catch: each item the owner found, before it is
 * fixed, and its return after.
 */
import { DANGER_WORDS, storySuggestsDanger } from "../../src/lib/case-system/intake/dangerWords";
import { storyLines } from "../../src/lib/case-system/caseFile/storyLines";
import { emptyCaseFile } from "../../src/lib/case-system/caseFile/caseFile";
import { readAnswerDate, firstFullDate } from "../../src/lib/case-system/dates";
import { computeDeadline } from "../../src/lib/case-system/deadlines/deadlineEngine";
import { addDays, holidayFor } from "../../src/lib/case-system/deadlines/holidays";
import { practicalFor, familyCourtOfficesIn } from "../../src/lib/content-library/nextStepPractical";
import { buildTriageOutcome, emptyStatusRecord } from "../../src/lib/case-system/family/statusTriage";
import { KNOWN_PROBLEMS_29OCT_SAFETY } from "../../tests/browser/harness/knownProblems29oct-safety";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const failures: string[] = [];
const check = (id: string, ok: boolean, detail: string) => {
  if (!ok) failures.push(`${id}: ${detail}`);
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${detail}`);
};

// ---- E1. The danger screen and negation ------------------------------------
// Both lists are what a fix must keep true. A phrasing that states danger must
// flag; a sentence that only denies it must not.
export const MUST_FLAG = [
  "he hit me",
  "I'm afraid of him",
  "He threatened me last week.",
  "He said he would kill me.",
  "He never hit me until last month, and now he does when he drinks.",
  "There was no violence before, but he hit me on Sunday.",
  "I'm scared he'll take the kids and not come back.",
  "He is not violent with the kids but he hits me.",
  "I don't feel safe at home.",
  "I'm not safe with him.",
  "He follows me to work.",
];
export const MUST_NOT_FLAG = [
  "No violence. He's a good dad just unreliable.",
  "He never hit me.",
  "There has never been any violence.",
  "He's not violent, just late with payments.",
  "I'm not afraid of him, I just want a schedule.",
  "No threats, no abuse, he's just disorganized.",
  "There is no abuse in our relationship.",
  "The bakery invoice for the wedding cake is still unpaid.",
];
for (const text of MUST_FLAG) check("E1-flag", storySuggestsDanger(text), JSON.stringify(text));
for (const text of MUST_NOT_FLAG) check("E1-no-flag", !storySuggestsDanger(text), JSON.stringify(text));
// The same screen writes the case file's "Safety" line (storyLines.ts).
const family1 = "We have a son together. No violence. He's a good dad just unreliable.";
const safetyLine = storyLines(family1, emptyCaseFile(), false).find((line) => line.fact === "safety");
check("E1-case-file", !safetyLine, `no Safety line from a denial (got ${JSON.stringify(safetyLine?.value ?? null)})`);
void DANGER_WORDS;

// ---- E2. Helplines on a case with no danger --------------------------------
// IntakeReviewPanel is a client component reading the browser store; the
// property is checked on its source: the helpline block is guarded by a family
// or danger condition. Replace with a rendered check when the block moves to a
// pure function.
const panel = readFileSync(join(process.cwd(), "app/_components/IntakeReviewPanel.tsx"), "utf8");
const line = panel.split(/\r?\n/).find((text) => text.includes('data-testid="intake-safety-resources"')) ?? "";
const guarded = /(?:courtPath\s*===\s*"family"|storySuggestsDanger\(|safetyConcern)[^<]*&&\s*<details[^>]*intake-safety-resources/.test(line);
check("E2-helplines-guarded", guarded, "IntakeReviewPanel's helplines (IMMEDIATE_DANGER_MESSAGE) shown only for family or a story that names danger");

// ---- F1. "Christmas 2025" ---------------------------------------------------
for (const text of ["Christmas 2025", "on Christmas Day 2025", "Boxing Day 2025", "New Year's Day 2026"]) {
  const read = readAnswerDate(text, { oneDate: true });
  check("F1-named-day", Boolean(read.iso) || Boolean(read.ask), `${JSON.stringify(text)} is counted or asked about (got ${JSON.stringify(read)})`);
}
check("F1-story", firstFullDate("It happened on Christmas 2025 at her house.") !== null || readAnswerDate("Christmas 2025", { oneDate: true }).ask !== null,
  "a story date written as Christmas 2025 is read as a day or asked for");

// ---- F2. Legislation Act s. 88 / s. 89 (1) ---------------------------------
const anniversary = "2027-12-25";
const result = computeDeadline({ from: "2025-12-25", length: { unit: "years", count: 2 }, regime: "legislation-act", direction: "after", extend: true } as Parameters<typeof computeDeadline>[0]);
let allHolidays = true;
for (let day = anniversary; day < result.deadline; day = addDays(day, 1)) if (!holidayFor(day, "legislation-act")) allHolidays = false;
check("F2-s89", !holidayFor(result.deadline, "legislation-act") && allHolidays && result.deadline >= anniversary,
  `two years from 2025-12-25 rolls to the first non-holiday on or after ${anniversary} (got ${result.deadline})`);

// ---- G. Family "which court" ------------------------------------------------
const neverMarried = "We were never married. We lived together four years and have a daughter, 5. I want a parenting schedule and child support. No violence. He's a good dad just unreliable.";
const city = "Oshawa";
const step = practicalFor("family:before-filing:deciding-where-to-start", "family", city, false, neverMarried);
check("G1-courthouse", familyCourtOfficesIn(city).length === 0 || (step?.courtOffices?.offices.length ?? 0) > 0,
  `the which-court step names ${city}'s family court office when the list has one (list: ${familyCourtOfficesIn(city).map((office) => office.name).join(", ")}; step offices: ${step?.courtOffices ? step.courtOffices.offices.length : "none"})`);
check("G2-form-8A", !(step?.forms ?? []).some((form) => form.number === "8A"), "Form 8A (Application (Divorce)) is not a form for the step of someone never married");
const triage = buildTriageOutcome({ ...emptyStatusRecord(), marriedToOtherParty: "no" } as Parameters<typeof buildTriageOutcome>[0]);
check("G2-triage", !triage.courtInformation.some((statement) => /divorce/i.test(statement.text)), "the triage's which-court statements carry no divorce statement after 'not married'");

// Every failing id is registered as a known problem.
const registered = new Set(KNOWN_PROBLEMS_29OCT_SAFETY.flatMap((problem) => problem.checks));
for (const failure of failures) {
  const id = failure.split(":")[0];
  if (!registered.has(id)) console.log(`UNREGISTERED failure ${id}: add it to knownProblems29oct-safety.ts`);
}
console.log(`\n${failures.length} failing check(s).`);
if (failures.length) process.exit(1);
