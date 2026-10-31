/**
 * "NOT SURE" IS NEVER ASKED AGAIN, ANYWHERE (site owner, 31 Oct; replaces option 1 of 24 Oct).
 *
 * After a person says "I don't know" or "not sure" -- a skip in the questions one at a time, the
 * words typed in the Small Claims guided chat or in the whole form, or the review's "I do not know
 * yet" -- no screen in any of the three courts asks that question again. The review shows a quiet
 * line instead ("Not answered yet: add it when you know", askCopy.ts) with a control to fill it in.
 *
 * Checks, as properties of the shared pieces (never a list of today's question ids):
 *   1. the case file keeps each kind of "not sure" as unsure, in every court;
 *   2. the one gate (caseFile.ts nextQuestion / askable / chatMayAsk) never returns a question whose
 *      facts are all unsure, whatever options it is given: there is no "offered once more at the end";
 *   3. remainingEssentialQuestions never lists such a question, whatever it is passed, so it is never
 *      counted as remaining and never blocks Confirm;
 *   4. the review's quiet lines (intakeReview.ts notAnsweredYet) list it, and its boxes
 *      (reviewBoxState) show it as "not-yet", never as a box asking for it;
 *   5. a value added through the one change path (withChange) wins over the "not sure".
 *
 * WHAT FAILURE THIS CATCHES: an unsure fact offered again at the end (nextQuestion's atEnd), listed
 * in the review's questions or shown as an empty box asking for it, counted as still to answer, or
 * a "not sure" that hides a value the person added later.
 */
import { caseFileOf, nextQuestion, askable, chatMayAsk, slotsOfQuestion, withChange, CASE_FILE_SECTION, type SlotFact } from "../../src/lib/case-system/caseFile/caseFile";
import * as review from "../../src/lib/case-system/intakeReview";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ID = "00000000-0000-4000-8000-000000000031";
const checkpoint = (courtPath: Checkpoint["courtPath"], sections: Record<string, Record<string, unknown>>): Checkpoint => ({ version: 1, flowId: ID, courtPath, revision: ID, sections: { story: { text: "Synthetic story: something went wrong in May 2026.", location: { province: "Ontario", city: "Kingston" } }, ...sections } });

/** Each way a person says "not sure", in each court: the question, the fact it holds, the sections. */
const CASES: { name: string; court: Checkpoint["courtPath"]; question: string; fact: SlotFact; sections: Record<string, Record<string, unknown>> }[] = [
  { name: "Small Claims guided chat, \"I don't know\" typed", court: "small-claims", question: "sc-remedy-sought", fact: "wants", sections: { guided: { earlierAnswers: [{ questionId: "sc-remedy-sought", answerText: "I don't know" }], answeredIds: ["sc-remedy-sought"] } } },
  { name: "Small Claims guided chat, a skipped date", court: "small-claims", question: "sc-orient-when-happened", fact: "whenHappened", sections: { guided: { answeredIds: ["sc-orient-when-happened"] } } },
  { name: "Small Claims review, \"I do not know yet\"", court: "small-claims", question: "sc-amount-claimed", fact: "amount", sections: { builder: { initialUnknowns: ["sc-amount-claimed"] } } },
  { name: "Small Claims whole form, \"I don't know\" typed", court: "small-claims", question: "sc-remedy-sought", fact: "wants", sections: { "small-claims": { input: { goal: "I don't know" } } } },
  { name: "civil questions one at a time, a skip", court: "civil", question: "legalRemedy", fact: "wants", sections: { "form-chat": { skipped: ["legalRemedy"] } } },
  { name: "civil whole form, \"not sure\" typed", court: "civil", question: "legalRemedy", fact: "wants", sections: { civil: { input: { legalRemedy: "not sure" } } } },
  { name: "civil review, \"I do not know yet\"", court: "civil", question: "urgent", fact: "urgent", sections: { builder: { initialUnknowns: ["urgent"] } } },
  { name: "Family questions one at a time, a skip", court: "family", question: "childrenInfo", fact: "children", sections: { "form-chat": { skipped: ["childrenInfo"] } } },
  { name: "Family whole form, \"I don't know\" typed", court: "family", question: "goal", fact: "wants", sections: { family: { goal: "I don't know" } } },
  { name: "Family review, \"I do not know yet\"", court: "family", question: "urgent", fact: "urgent", sections: { builder: { initialUnknowns: ["urgent"] } } },
];

const notAnsweredYet = (review as Record<string, unknown>).notAnsweredYet as ((stored: Checkpoint, master?: unknown) => { id: string; facts: SlotFact[] }[]) | undefined;
const reviewBoxState = (review as Record<string, unknown>).reviewBoxState as ((entry: review.ReviewEntry, file: ReturnType<typeof caseFileOf>) => string) | undefined;
check("the review has one list of quiet \"not answered yet\" lines (intakeReview.ts notAnsweredYet)", typeof notAnsweredYet === "function");
check("the review decides each box through one rule (intakeReview.ts reviewBoxState)", typeof reviewBoxState === "function");

for (const item of CASES) {
  const stored = checkpoint(item.court, item.sections);
  const file = caseFileOf(stored);
  // 1. Kept as unsure.
  check(`${item.name}: the case file keeps ${item.fact} as unsure`, file[item.fact].state === "unsure", JSON.stringify(file[item.fact]));
  // 2. The gate: never asked again, whatever options (there is no "at the end").
  const facts = slotsOfQuestion(item.question);
  check(`${item.name}: ${item.question} asks for ${item.fact}`, facts.includes(item.fact), facts.join());
  for (const options of [undefined, { atEnd: true }, { atEnd: true, offered: [] }] as never[]) {
    check(`${item.name}: the gate never asks it again (options ${JSON.stringify(options ?? {})})`, nextQuestion(file, [item.question], options) === null);
  }
  check(`${item.name}: askable and chatMayAsk leave it out`, !askable(file, [item.question]).includes(item.question) && !chatMayAsk(file, item.question));
  // 3. Never listed as remaining, whatever the call passes.
  for (const extra of [undefined, false, true] as never[]) {
    const listed = (review.remainingEssentialQuestions as (stored: Checkpoint, ...rest: never[]) => { id: string }[])(stored, ...(extra === undefined ? [] : [extra]));
    const offending = listed.filter((question) => { const own = slotsOfQuestion(question.id); return own.length > 0 && own.every((fact) => file[fact].state === "unsure"); });
    check(`${item.name}: remainingEssentialQuestions(${extra === undefined ? "" : String(extra)}) never lists a not-sure question`, offending.length === 0, offending.map((question) => question.id).join(", "));
  }
  // 4. The review shows it as a quiet line, never as a box asking for it.
  if (notAnsweredYet) {
    const quiet = notAnsweredYet(stored);
    const entries = review.reviewEntries(stored).filter((entry) => slotsOfQuestion(entry.field).includes(item.fact));
    // Every box for the fact shows the quiet line; with no box, the quiet list holds it.
    check(`${item.name}: the review shows ${item.fact} as "not answered yet" (a box or the quiet list)`, entries.length > 0 || quiet.some((line) => line.facts.includes(item.fact)), JSON.stringify(quiet));
  }
  if (reviewBoxState) {
    for (const entry of review.reviewEntries(stored).filter((each) => slotsOfQuestion(each.field).includes(item.fact) && !each.fromStart)) {
      check(`${item.name}: the review's box "${entry.field}" shows the quiet line, never asks`, reviewBoxState(entry, file) === "not-yet", reviewBoxState(entry, file));
    }
  }
  // 5. Added later through the one change path: the value wins.
  // A day is added as a full day (ChangeAnswer asks for one), anything else in words.
  const value = item.fact === "whenHappened" ? "October 6, 2026" : "Synthetic: added later";
  const added = checkpoint(item.court, { ...item.sections, [CASE_FILE_SECTION]: { changes: withChange(undefined, item.fact, { state: "answered", value }) } });
  const after = caseFileOf(added);
  check(`${item.name}: added through the change path, ${item.fact} is answered`, after[item.fact].state === "answered" && after[item.fact].changed === true, JSON.stringify(after[item.fact]));
  if (notAnsweredYet) check(`${item.name}: once added, no quiet line remains for it`, !notAnsweredYet(added).some((line) => line.facts.includes(item.fact)));
}

// A real answer is never hidden by a "not sure" given elsewhere: the gate and the review treat it as answered.
{
  const both = checkpoint("small-claims", { guided: { earlierAnswers: [{ questionId: "sc-amount-claimed", answerText: "$2,500" }] }, builder: { initialUnknowns: ["sc-amount-claimed"] } });
  if (notAnsweredYet) check("an answer given elsewhere is never shown as \"not answered yet\"", !notAnsweredYet(both).some((line) => line.facts.includes("amount")));
}
// A question nobody has answered or skipped is still asked (the gate is not closed for everything).
{
  const fresh = checkpoint("civil", {});
  check("a question never answered is still asked", nextQuestion(caseFileOf(fresh), ["legalRemedy"]) === "legalRemedy");
}

if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
console.log("not sure is never asked again: every check passed.");
