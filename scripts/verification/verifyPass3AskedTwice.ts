/**
 * CHROME PASS 3 ON #550 (19 Nov 2026): THE "ASKED TWICE" FINDINGS, WITH CHROME'S OWN INPUTS.
 *
 *   4a  S1: the review would not continue until "If this involves an injury, what date did it happen?" was answered,
 *       though the story says "On Oct 4, 2026" and "Roughly when did the situation ... happen?" was offered with it on the
 *       same page. Both are the one fact whenHappened (fact table D1). One question per fact on a page
 *       (intakeReview.ts oneQuestionPerFact): the second is never listed, never required.
 *
 * What it asserts: for Chrome's S1 (Small Claims, personal injury), the review's list and the questions still needed
 * before Continue hold no two questions of the same fact, and sc-date-injury is not among them while the event date
 * question is; and for every court, a list with two questions of one fact keeps only the first (planted control).
 *
 * WHAT FAILURE THIS CATCHES: one fact asked, or required, twice on the review.
 *
 * Run: npm run test:pass3-asked-twice
 */
import { oneQuestionPerFact, remainingEssentialQuestions, reviewQuestionList } from "../../src/lib/case-system/intakeReview";
import { slotsOfQuestion } from "../../src/lib/case-system/caseFile/caseFile";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`); if (!ok) failed++; };

const S1 = "On Oct 4, 2026 at about 6:40 pm I slipped on a wet floor near the milk fridge at a Circle K in Ottawa. There was no wet-floor sign. I fell on my right hip. I missed 3 days of work (Oct 5 to 7) at $150 a day and bought Tylenol and an ice pack for $18.45. I want to claim $5,000 for pain and suffering, $450 lost wages and $18.45 for medicine.";
const s1 = { version: 1, flowId: "pass3-s1", courtPath: "small-claims", revision: "r1",
  sections: { story: { text: S1, location: { province: "Ontario", city: "Ottawa" } }, guided: { started: true, facts: { role: "plaintiff", disputeCategory: "personal-injury" }, answeredIds: ["sc-orient-role", "sc-orient-dispute-category"] }, builder: { step: "guided" } } } as unknown as Checkpoint;

/** Facts asked by more than one question of a list. */
function doubled(ids: readonly string[]): string[] {
  const seen = new Map<string, string>();
  const out: string[] = [];
  for (const id of ids) for (const fact of slotsOfQuestion(id)) { if (seen.has(fact)) out.push(`${fact}: ${seen.get(fact)} and ${id}`); else seen.set(fact, id); }
  return out;
}

const remaining = remainingEssentialQuestions(s1).map((question) => question.id);
const listed = reviewQuestionList(s1).map((question) => question.id);
check("4a. S1: the questions still needed before Continue ask no fact twice", doubled(remaining).length === 0, doubled(remaining).join("; "));
check("4a. S1: the review's list asks no fact twice", doubled(listed).length === 0, doubled(listed).join("; "));
check("4a. S1: the injury date is not required beside the event date (the same fact)", !remaining.includes("sc-date-injury") && remaining.includes("sc-orient-when-happened"), JSON.stringify(remaining));
check("planted: two questions of one fact keep only the first", JSON.stringify(oneQuestionPerFact([{ id: "sc-orient-when-happened" }, { id: "sc-date-injury" }, { id: "sc-amount-claimed" }]).map((q) => q.id)) === JSON.stringify(["sc-orient-when-happened", "sc-amount-claimed"]));

console.log(failed ? `\n${failed} check(s) failed` : "\nAll pass-3 asked-twice checks passed");
process.exitCode = failed ? 1 : 0;
