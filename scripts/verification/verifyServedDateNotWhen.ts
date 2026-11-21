/**
 * THE DAY A PERSON WAS SERVED IS NEVER SUGGESTED AS THE DAY THE DISPUTE HAPPENED (Chrome check of #547 at 0e0f7e9, G3a:
 * "On October 28, 2026 I was served with a Plaintiff's Claim..." offered October 28, 2026 for "When it happened").
 *
 * The day served is its own fact (servedDate), asked by its own question. What it checks, on both story readers:
 *   1. the review's suggestions (intakeReview.ts suggestInitialAnswers): for a served story, "When it happened" is not the
 *      day served (Small Claims; the date in a sentence about being served is skipped);
 *   2. the AI's story proposals (storyAnswerProposals.ts validateStoryProposals): a proposal for "When it happened" whose
 *      quote is about being served is refused;
 *   3. control: a plaintiff's story still gets its date suggested, and a proposal quoting it is kept.
 *
 * WHAT FAILURE THIS CATCHES: the service date recorded as when the dispute happened.
 *
 * Run: npm run test:served-date-not-when
 */
import { suggestInitialAnswers } from "../../src/lib/case-system/intakeReview";
import { validateStoryProposals } from "../../src/lib/case-system/intake/storyAnswerProposals";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const SERVED = "Synthetic: On October 28, 2026 I was served with a Plaintiff's Claim in Small Claims Court. My former roommate Casey Testline says I owe her $3,200 for rent and utilities. I have not filed anything yet.";
const SERVED_2 = "Synthetic: I have been served with a claim on November 3, 2026. My landlord says I damaged the carpet.";
const PLAINTIFF = "Synthetic: On March 3, 2026 my neighbour's tree fell on my fence. He will not pay for the repair.";

const checkpointOf = (story: string) => ({ version: 1, flowId: "f", courtPath: "small-claims", revision: "r", sections: { story: { text: story } } }) as never;
const when = (story: string) => suggestInitialAnswers(checkpointOf(story))["sc-orient-when-happened"];

check("1. served on October 28, 2026: not suggested as when it happened", when(SERVED) !== "2026-10-28", `suggested: ${when(SERVED)}`);
check("1. served on November 3, 2026: not suggested as when it happened", when(SERVED_2) !== "2026-11-03", `suggested: ${when(SERVED_2)}`);
check("3. control: a plaintiff's date is still suggested", when(PLAINTIFF) === "2026-03-03", `suggested: ${when(PLAINTIFF)}`);

const question = QUESTION_BANK.find((item) => item.id === "sc-orient-when-happened");
const propose = (story: string, answer: string, quote: string) =>
  question ? validateStoryProposals({ proposals: [{ questionId: question.id, answer, storyQuote: quote }] }, story, [question]) : [];
check("setup: the \"When it happened\" question exists", Boolean(question));
check("2. a proposal quoting the service sentence is refused", propose(SERVED, "October 28, 2026", "On October 28, 2026 I was served with a Plaintiff's Claim in Small Claims Court.").length === 0);
check("3. control: a proposal quoting the event is kept", propose(PLAINTIFF, "March 3, 2026", "On March 3, 2026 my neighbour's tree fell on my fence.").length === 1);

console.log(failures ? `\n${failures} check(s) failed.` : "\nThe day a person was served is never suggested as the day the dispute happened.");
process.exit(failures ? 1 : 0);
