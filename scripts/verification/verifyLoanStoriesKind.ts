/**
 * A STORY WHERE THE PERSON LENT MONEY IS A LOAN, WHATEVER THE MONEY WAS FOR (Chrome check of #547 at 0e0f7e9, G1: "In
 * March 2026 I lent my friend Alex Testwood $4,500 for a car repair" was suggested as "Work or a service you paid for (e.g.
 * a contractor)").
 *
 * Cause: the review's suggestion for "What kind of dispute is this?" (intakeReview.ts suggestInitialAnswers) reads the cue
 * table in order and takes the first match; the work cue ("repair", "roof", "plumb"...) came before the loan cue, so what
 * the loan was FOR decided the kind. The AI reading of the story (extractIntakeFacts.ts) can make the same mistake.
 *
 * What it checks, on both readers (the review's code cues, and the guard applied to the AI reading's category):
 *   1. five stories where the person lent money (lent, loaned, an IOU, a promissory note, "borrowed ... from me") are a
 *      loan or debt, even when the money was for a repair, a roof, plumbing or a renovation;
 *   2. contractor stories (the person PAID for work; or borrowed money themselves to pay for it) still read as work or a
 *      service you paid for.
 *
 * WHAT FAILURE THIS CATCHES: a lent-money story offered as a contractor dispute.
 *
 * Run: npm run test:loan-stories-kind
 */
import { suggestInitialAnswers } from "../../src/lib/case-system/intakeReview";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const LOAN = "A loan or debt";
const WORK = "Work or a service you paid for (e.g. a contractor)";
const LOANS = [
  "Synthetic: In March 2026 I lent my friend Alex Testwood $4,500 for a car repair. He promised in a text message to pay me back by June 1, 2026. He has not paid anything back.",
  "Synthetic: I loaned my brother $2,000 in May to fix the roof on his cottage. He said he would repay me by September and has paid nothing.",
  "Synthetic: My cousin signed an IOU for $1,200 to cover his mechanic's bill. He has not repaid any of it.",
  "Synthetic: I gave my neighbour $3,000 for her plumbing work and she signed a promissory note to pay it back by July 2026. She has not paid.",
  "Synthetic: Dana Testwood borrowed $5,000 from me to renovate her kitchen and has not paid it back.",
];
const WORKS = [
  "Synthetic: I paid a contractor $6,000 to renovate my bathroom and the work was never finished.",
  "Synthetic: I took out a loan to pay a roofer $8,000, and the roof still leaks after the repair.",
  "Synthetic: A mechanic charged me $1,800 for a repair that did not fix my car's engine.",
  "Synthetic: I borrowed money from my parents to pay a plumber, and the plumber flooded my basement.",
];

const checkpointOf = (story: string) =>
  ({ version: 1, flowId: "f", courtPath: "small-claims", revision: "r", sections: { story: { text: story } } }) as never;
const reviewKind = (story: string) => suggestInitialAnswers(checkpointOf(story))["sc-orient-dispute-category"];

async function main() {
  const extract = (await import("../../src/lib/case-system/intake/extractIntakeFacts")) as { categoryForStory?: (category: unknown, story: string) => unknown };
  const aiKind = (category: string, story: string) => (extract.categoryForStory ? extract.categoryForStory(category, story) : category);

  LOANS.forEach((story, index) => {
    const review = reviewKind(story);
    check(`1. loan story ${index + 1}: the review suggests "${LOAN}"`, review === LOAN, `suggested: ${review}`);
    const ai = aiKind("work-or-services", story);
    check(`1. loan story ${index + 1}: the AI reading's "work-or-services" is read as "loan-or-debt"`, ai === "loan-or-debt", `kept: ${ai}`);
  });
  WORKS.forEach((story, index) => {
    const review = reviewKind(story);
    check(`2. contractor story ${index + 1}: the review still suggests "${WORK}"`, review === WORK, `suggested: ${review}`);
    const ai = aiKind("work-or-services", story);
    check(`2. contractor story ${index + 1}: the AI reading's "work-or-services" is kept`, ai === "work-or-services", `changed to: ${ai}`);
  });

  console.log(failures ? `\n${failures} check(s) failed.` : "\nA story where the person lent money is a loan, whatever the money was for.");
  process.exit(failures ? 1 : 0);
}
void main();
