/**
 * THE GOAL SAID "NOT SURE" IN THE SMALL CLAIMS GUIDED CHAT IS NEVER ASKED AGAIN IN THE REVIEW
 * (founder, 1 Nov; strict check, NOT a carry-list entry).
 *
 * Seen once (run 41347257269 attempt 1), not reproduced, no code-line cause. In staging carry run
 * 41347257269 attempt 1, Small Claims signed-in questions route, the carry test recorded
 * "asked-twice wants @ review-entry@/builder?step=guided: twice: Goal (given at
 * sc-chat:sc-remedy-sought@/builder?step=guided "unsure")": the goal answered "not sure" in the guided
 * chat, then an empty "Goal" box in the review's summary (`[data-testid=intake-entry][data-empty=true]`,
 * tests/browser/harness/askOnce.ts "review-entry"). Attempt 2 was clean. Leads read (not proven as the
 * cause): #536's IntakeReviewPanel offered an unsure fact once more in its empty box (offeredInBox), and
 * #536's reviewQuestionList listed unsure questions through remainingEssentialQuestions(..., true).
 *
 * What decides it is pure, so this checks it without a browser, for every way the chat records the
 * goal as "not sure" (typed words, a skip, with and without the saved copy):
 *   1. the case file holds `wants` unsure;
 *   2. the review has a box for the goal, and every such box is "not-yet" (reviewBoxState), never
 *      "ask" -- the panel's `data-empty=true` is exactly "ask" (IntakeReviewPanel: empty, not from the
 *      start, nothing held, no quiet line);
 *   3. the review's one list (reviewQuestionList) never lists a goal question as still to answer;
 *   4. no chat may ask it (chatMayAsk / nextQuestion) and it is not remaining (remainingEssentialQuestions).
 * The browser twin is tests/browser/not-sure-goal-review.spec.ts (the real save path; needs staging).
 *
 * WHAT FAILURE THIS CATCHES: the goal said "not sure" in the guided chat shown again as an empty Goal
 * box, listed or counted as still to answer, or asked by any chat.
 */
import { caseFileOf, chatMayAsk, nextQuestion, slotsOfQuestion } from "../../src/lib/case-system/caseFile/caseFile";
import * as review from "../../src/lib/case-system/intakeReview";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ID = "00000000-0000-4000-8000-000000000101";
const QUESTION = "sc-remedy-sought";
const checkpoint = (sections: Record<string, Record<string, unknown>>): Checkpoint => ({ version: 1, flowId: ID, courtPath: "small-claims", revision: ID, sections: { story: { text: "Synthetic story: I did the work in May 2026 and was not paid.", location: { province: "Ontario", city: "Kingston" } }, "small-claims": { input: { goal: "" } }, ...sections } });

const reviewBoxState = (review as Record<string, unknown>).reviewBoxState as ((entry: review.ReviewEntry, file: ReturnType<typeof caseFileOf>) => string) | undefined;
check("the review decides each box through one pure rule (intakeReview.ts reviewBoxState)", typeof reviewBoxState === "function");

const WAYS: { name: string; sections: Record<string, Record<string, unknown>>; master?: unknown }[] = [
  ...["unsure", "I don't know", "not sure", "I do not know yet", "no idea"].map((words) => ({ name: `typed "${words}"`, sections: { guided: { earlierAnswers: [{ questionId: QUESTION, answerText: words }], answeredIds: [QUESTION] } } })),
  // (The guided chat has no per-question skip for the goal: an answered id with no words is an answer
  // whose words the captured field keeps, not a "not sure"; only a dated question is unsure that way.)
  { name: "typed \"unsure\", also in the saved copy", sections: { guided: { earlierAnswers: [{ questionId: QUESTION, answerText: "unsure" }], answeredIds: [QUESTION] } }, master: { intakeAnswers: [{ questionId: QUESTION, answerText: "unsure" }] } },
  { name: "only in the saved copy (reload before the checkpoint caught up)", sections: {}, master: { intakeAnswers: [{ questionId: QUESTION, answerText: "unsure" }] } },
];

for (const way of WAYS) {
  const stored = checkpoint(way.sections);
  const file = caseFileOf(stored, way.master);
  check(`${way.name}: the case file holds the goal (wants) not sure`, file.wants.state === "unsure", JSON.stringify(file.wants));
  if (file.wants.state !== "unsure") continue;
  const boxes = review.reviewEntries(stored).filter((entry) => slotsOfQuestion(entry.field).includes("wants") && !entry.fromStart);
  check(`${way.name}: the review has a box for the goal (so the check is not vacuous)`, boxes.length > 0, review.reviewEntries(stored).map((entry) => entry.field).join(", "));
  if (reviewBoxState) for (const entry of boxes) {
    const state = reviewBoxState(entry, file);
    check(`${way.name}: the review's "${entry.field}" box shows "Not answered yet", never an empty box asking (data-empty=true)`, state === "not-yet", state);
  }
  const list = review.reviewQuestionList(stored, way.master) as { id: string; answered: boolean; notYet?: unknown }[];
  const counted = list.filter((question) => !question.answered && !question.notYet && slotsOfQuestion(question.id).includes("wants"));
  check(`${way.name}: the review's one list never lists the goal as still to answer`, counted.length === 0, counted.map((question) => question.id).join(", "));
  check(`${way.name}: no chat asks for the goal again`, !chatMayAsk(file, QUESTION) && nextQuestion(file, [QUESTION]) === null);
  check(`${way.name}: the goal is not remaining (never blocks Confirm)`, !review.remainingEssentialQuestions(stored, way.master).some((question) => slotsOfQuestion(question.id).includes("wants")));
}

// The check still catches a real ask: with no "not sure" given, the empty Goal box asks.
{
  const fresh = checkpoint({});
  const file = caseFileOf(fresh);
  const boxes = review.reviewEntries(fresh).filter((entry) => slotsOfQuestion(entry.field).includes("wants") && !entry.fromStart);
  if (reviewBoxState) check("control: with nothing said, the empty Goal box asks (the rule is not closed for everything)", boxes.some((entry) => reviewBoxState(entry, file) === "ask"), boxes.map((entry) => reviewBoxState(entry, file)).join());
}

if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
console.log("the goal said \"not sure\" in the guided chat is never asked again in the review: every check passed.");
