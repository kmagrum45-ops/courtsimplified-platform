/**
 * Session 3 end-to-end proof -- NOT a CI script, NOT a verification script.
 * Makes one real, billed OpenAI call. Run manually only:
 *
 *   node --import tsx --env-file=.env.local scripts/proofs/runUnpaidDebtServicesProof.ts
 *
 * Proves: a real user story -> AI fact extraction -> claim-type matching
 * against claimTypes.ts's `signals` (plain keyword data, no AI) ->
 * selectQuestions.ts picking the right next question -- for exactly one
 * claim type (unpaid debt / non-payment for services), exactly one story.
 *
 * Important, not a bug: selectQuestions.ts structurally filters to
 * `status === "reviewed"` (built last session, on purpose, so unreviewed
 * question text can never reach a real user). Every question in the real
 * QUESTION_BANK is still "draft" -- calling selectQuestions() against it
 * unmodified always returns []. That's shown below as the honest current
 * answer. To also prove the underlying appliesWhen/ordering logic actually
 * responds to the extracted facts, this script additionally builds a
 * REVIEWED_FOR_THIS_PROOF copy of the same real question objects (content
 * untouched, only `status` flipped) and runs the identical selectQuestions
 * function against that -- QUESTION_BANK itself is never modified.
 */

import { extractIntakeFacts } from "../../src/lib/case-system/intake/extractIntakeFacts";
import { selectQuestions, type IntakeFacts } from "../../src/lib/case-system/intake/selectQuestions";
import { QUESTION_BANK, type IntakeQuestion } from "../../src/lib/case-system/intake/questionBank";
import { CLAIM_TYPES, type ClaimType } from "../../src/lib/case-system/intake/claimTypes";

const TEST_STORY =
  "I'm a freelance web developer. Back in April, I built a full website for a small business owner " +
  "and delivered the finished site along with all the source files. We'd agreed by email that they'd " +
  "pay me $3,200 within 30 days of delivery. It's now been over three months, they haven't paid me " +
  "anything, and they've stopped responding to my emails about the unpaid invoice.";

// Plain keyword-overlap matching against ClaimType.signals -- no AI, per
// that field's own "No AI here -- just data" annotation in claimTypes.ts.
function matchClaimType(storyText: string, claimTypes: readonly ClaimType[]): { claimType: ClaimType; matchedSignals: string[] } | null {
  const lowerStory = storyText.toLowerCase();
  let best: { claimType: ClaimType; matchedSignals: string[] } | null = null;

  for (const claimType of claimTypes) {
    const matchedSignals = claimType.signals.filter((signal) => lowerStory.includes(signal.toLowerCase()));
    if (matchedSignals.length > 0 && (!best || matchedSignals.length > best.matchedSignals.length)) {
      best = { claimType, matchedSignals };
    }
  }
  return best;
}

function describeQuestion(id: string, bank: readonly IntakeQuestion[]): string {
  const question = bank.find((q) => q.id === id);
  return question ? `${id}  ("${question.text}")` : id;
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set -- run with --env-file=.env.local");
    process.exitCode = 1;
    return;
  }

  console.log("=== Test story ===");
  console.log(TEST_STORY);

  console.log("\n=== Step 1: AI fact extraction ===");
  const facts: IntakeFacts = await extractIntakeFacts(TEST_STORY, apiKey);
  console.log(JSON.stringify(facts, null, 2));

  console.log("\n=== Step 2: claim-type matching against claimTypes.ts signals (no AI) ===");
  const match = matchClaimType(TEST_STORY, CLAIM_TYPES);
  if (match) {
    console.log(`Matched: ${match.claimType.id} ("${match.claimType.name}")`);
    console.log(`Matched signal(s): ${match.matchedSignals.join(", ")}`);
  } else {
    console.log("No claim type matched any signal.");
  }

  console.log("\n=== Step 3a: selectQuestions() against the REAL QUESTION_BANK, unmodified ===");
  const realResult = selectQuestions(facts, []);
  console.log(
    `Result: ${realResult.length} question(s). Expected 0 -- every real question is still status: "draft", ` +
      `and selectQuestions structurally never returns a draft question. This is the honest answer if this ` +
      `were wired into a live UI today.`,
  );

  console.log(
    "\n=== Step 3b: same real question objects, status flipped to \"reviewed\" for this proof only ===",
  );
  console.log("(QUESTION_BANK itself is never mutated -- this is a local copy.)");
  const REVIEWED_FOR_THIS_PROOF: IntakeQuestion[] = QUESTION_BANK.map((question) => ({
    ...question,
    status: "reviewed",
    reviewedAt: "2026-09-21",
  }));

  const freshOrder = selectQuestions(facts, [], REVIEWED_FOR_THIS_PROOF);
  console.log(`\nFull remaining order from a fresh intake (answeredIds=[]):`);
  freshOrder.forEach((id, index) => console.log(`  ${index + 1}. ${describeQuestion(id, REVIEWED_FOR_THIS_PROOF)}`));

  const orientationAnswered = ["sc-orient-when-happened", "sc-orient-role", "sc-orient-dispute-category"];
  const afterOrientation = selectQuestions(facts, orientationAnswered, REVIEWED_FOR_THIS_PROOF);
  console.log(
    `\nAfter orientation is answered, next substance question (this is where the extracted facts -- ` +
      `role="${facts.role}" -- actually change the outcome):`,
  );
  console.log(`  ${describeQuestion(afterOrientation[0], REVIEWED_FOR_THIS_PROOF)}`);
  console.log(`\nFull remaining order after orientation:`);
  afterOrientation.forEach((id, index) => console.log(`  ${index + 1}. ${describeQuestion(id, REVIEWED_FOR_THIS_PROOF)}`));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
