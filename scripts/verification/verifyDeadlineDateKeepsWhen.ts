/**
 * A DATE THE PERSON GIVES ON THE STEP PAGE TO WORK OUT A DEADLINE NEVER REPLACES THEIR "WHEN IT HAPPENED" ANSWER
 * (Chrome re-check of #545 at dc909096, 10 Nov 2026: "The date I gave for working out the deadline replaced the 'When it
 * happened' answer: it changed from March 2026 to May 15, 2026").
 *
 * The step page's "Work out your dates" asks `case-date-act-or-omission` (the day the thing the claim is about happened)
 * to count a deadline. That question was mapped to the `whenHappened` fact (factsOfQuestion.ts), so the step page's save
 * (factSave.ts positionFactWrites, `force`) recorded the typed day as the person's NEWEST answer to "When it happened",
 * and the case file reads the newest typed answer (caseFile.ts NEWEST_TYPED_FACTS): "March 2026" became May 15, 2026.
 *
 * What it checks, in all three courts, on the real save functions in the order the step page runs them
 * (positionFactWrites -> applyFactWrites, the server's save -> caseFileOfMaster, what every screen reads):
 *   1. "When it happened" is still the person's own answer ("March 2026") after a day is given on the step page;
 *   2. the day given on the step page is kept for the deadline (the saved position still holds it);
 *   3. control: a different fact given on the step page (the day served) is still recorded as that fact;
 *   4. a day the step page already saved as "When it happened" before this fix (its numbered record) is not shown over
 *      the person's answer either (the save as it ran before: no saved case passed to positionFactWrites).
 *
 * WHAT FAILURE THIS CATCHES: a question writing a fact that is not its own (a deadline's date replacing an answer).
 *
 * Run: npm run test:deadline-date-keeps-when
 */
import { positionFactWrites } from "../../src/lib/case-system/caseFile/factSave";
import { applyFactWrites } from "../../src/lib/case-system/caseFile/factRecord";
import { caseFileOfMaster } from "../../src/lib/case-system/caseFile/caseFileOfMaster";
import { CASE_FILE_SECTION } from "../../src/lib/case-system/caseFile/caseFile";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const CASE = "00000000-0000-4000-8000-000000000010";
const STEP_DATE = "2026-05-15";
const ID = "case-date-act-or-omission";
type Court = "small-claims" | "civil" | "family";

const masterFor = (court: Court) => ({
  courtPath: court,
  intakeCheckpoint: {
    version: 1 as const,
    flowId: CASE,
    courtPath: court,
    revision: "00000000-0000-4000-8000-000000000011",
    sections: {
      builder: { step: "guided", initialAnswers: court === "small-claims" ? { "sc-orient-when-happened": "March 2026" } : { timelineText: "March 2026" } },
      // The person's answer, as the review's writer records it.
      [CASE_FILE_SECTION]: { facts: { whenHappened: { state: "answered", value: "March 2026", source: "person", at: "2026-11-10T10:00:00.000Z", seq: 3 } } },
    },
  },
});

/** The step page's save: the old copy (the position) and the facts it answers, as saveWithFacts applies them. */
function stepSave(master: Record<string, unknown>, court: Court, dateAnswers: Record<string, string>, asBefore = false) {
  const position = { ...(master.position as Record<string, unknown> | undefined), dateAnswers };
  const changed = { ...master, position };
  const writes = asBefore ? positionFactWrites({ dateAnswers }, position) : positionFactWrites({ dateAnswers }, position, changed);
  if (!writes.length) return changed;
  const applied = applyFactWrites(changed, court, CASE, writes, new Date("2026-11-10T11:00:00.000Z"));
  if (!applied.ok) throw new Error(`${court}: the save refused: ${applied.reject}`);
  return applied.master;
}

for (const court of ["small-claims", "civil", "family"] as const) {
  const saved = stepSave(masterFor(court), court, { [ID]: STEP_DATE });
  const when = caseFileOfMaster(saved, court).whenHappened;
  check(`${court}: 1. "When it happened" is still the person's "March 2026" after ${STEP_DATE} was given to work out a deadline`, when.value === "March 2026", JSON.stringify(when));
  check(`${court}: 2. the step page's day is kept for the deadline`, (saved.position as { dateAnswers?: Record<string, string> } | undefined)?.dateAnswers?.[ID] === STEP_DATE);
  const before = caseFileOfMaster(stepSave(masterFor(court), court, { [ID]: STEP_DATE }, true), court).whenHappened;
  check(`${court}: 4. a day already saved by the step page before the fix is not shown over "March 2026"`, before.value === "March 2026", JSON.stringify(before));
  const served = caseFileOfMaster(stepSave(masterFor(court), court, { "sc-date-claim-served": "2026-10-28" }), court).servedDate;
  check(`${court}: 3. control: the day served given on the step page is still recorded as the day served`, served.state === "answered" && served.value === "2026-10-28", JSON.stringify(served));
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nA day given on the step page to work out a deadline never replaces \"When it happened\".");
process.exit(failures ? 1 : 0);
