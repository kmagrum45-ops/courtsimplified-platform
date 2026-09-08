/**
 * Session 30 proof -- NOT wired into CI, makes real, billed OpenAI calls
 * (safety + extraction + voice on the opening-story turn; the 5 target-
 * question turns below skip extraction/voice, since orchestrateIntakeTurn
 * only runs those when a turn carries a nextQuestion to compose voice for
 * -- every turn still costs a voice-layer call while a question remains).
 *
 * Run manually:
 *   node --import tsx --env-file=.env.local scripts/proofs/runDirectCaptureProof.ts
 *
 * Walks a full guided conversation, answering sc-amount-claimed,
 * sc-orient-when-happened, sc-evidence-available, sc-remedy-sought, and
 * sc-defendant-served with realistic free text and each question's own id
 * (answeredQuestionId) -- exactly what GuidedSmallClaimsIntake.tsx now
 * sends on every answer turn. Confirms two things end to end:
 *   1. orchestrateIntakeTurn() captures each answer verbatim into the new
 *      IntakeFacts field the question's capturesField names.
 *   2. mapGuidedIntakeToSmallClaimsInput() reads those fields back out into
 *      amountClaimed/timeline/evidence/goal/serviceDetails.
 *
 * Every other question in the bank is answered with a blank ("skip") reply
 * -- cheap (no extraction call) and irrelevant to what this proof checks.
 */

import { orchestrateIntakeTurn } from "../../src/lib/case-system/intake/orchestrateIntakeTurn";
import { QUESTION_BANK, type IntakeQuestion } from "../../src/lib/case-system/intake/questionBank";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import type { IntakeFacts } from "../../src/lib/case-system/intake/selectQuestions";
import { mapGuidedIntakeToSmallClaimsInput } from "../../app/builder/_components/guidedIntakeToSmallClaimsInput";

const REVIEWED_FOR_THIS_PROOF: IntakeQuestion[] = QUESTION_BANK.map((question) => ({
  ...question,
  status: "reviewed",
  reviewedAt: "2026-09-07",
}));

const OPENING_STORY =
  "I'm a freelance web developer bringing a claim. I built a full website for a small business client " +
  "back in April, and we'd agreed by email they'd pay me $3,200 within 30 days of delivery. They never " +
  "paid. I already filed my Plaintiff's Claim with the court last month.";

const TARGET_ANSWERS: Record<string, string> = {
  "sc-amount-claimed": "$3,200, which is the full amount we agreed on in the email.",
  "sc-orient-when-happened": "The site was delivered in April 2026, and payment was due 30 days later.",
  "sc-evidence-available":
    "I have the email agreement, my invoice, and text messages where they said they'd pay.",
  "sc-remedy-sought": "I want the court to order them to pay me the full $3,200 plus my court costs.",
  "sc-defendant-served": "Yes, served by mail, and I have a completed Affidavit of Service (Form 8A).",
};

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set -- run with --env-file=.env.local");
    process.exitCode = 1;
    return;
  }

  let facts: IntakeFacts = {};
  let answeredIds: string[] = [];

  const opening = await orchestrateIntakeTurn(facts, answeredIds, OPENING_STORY, apiKey, REVIEWED_FOR_THIS_PROOF);
  facts = opening.facts;
  let next = opening.nextQuestion;
  console.log(`Opening story -- facts so far: ${JSON.stringify(facts)}`);

  let turnCount = 0;
  while (next && turnCount < 20) {
    answeredIds = [...answeredIds, next.id];
    const answerText = TARGET_ANSWERS[next.id];
    const answeredQuestionId = answerText ? next.id : undefined;

    console.log(
      `\nTurn ${turnCount + 1} -- question "${next.id}", ` +
        `${answerText ? `answering: "${answerText}"` : "blank/skip"}`,
    );

    const result = await orchestrateIntakeTurn(
      facts,
      answeredIds,
      answerText,
      apiKey,
      REVIEWED_FOR_THIS_PROOF,
      CLAIM_TYPES,
      "small-claims",
      answeredQuestionId,
    );
    facts = result.facts;
    next = result.nextQuestion;
    turnCount++;
  }

  console.log(`\n${"=".repeat(70)}\n=== Conversation complete after ${turnCount} turn(s) ===`);
  console.log(`Final facts: ${JSON.stringify(facts, null, 2)}`);

  console.log(`\n${"=".repeat(70)}\n=== Verdict: the 5 new capturesField facts ===`);
  for (const [questionId, field] of Object.entries({
    "sc-amount-claimed": "amountClaimedText",
    "sc-orient-when-happened": "timelineText",
    "sc-evidence-available": "evidenceText",
    "sc-remedy-sought": "remedySoughtText",
    "sc-defendant-served": "serviceDetailsText",
  })) {
    const value = (facts as Record<string, unknown>)[field];
    const expected = TARGET_ANSWERS[questionId];
    const matches = value === expected;
    console.log(`${field}: ${JSON.stringify(value)} -- ${matches ? "MATCHES verbatim answer" : "MISMATCH, expected " + JSON.stringify(expected)}`);
  }

  const mapped = mapGuidedIntakeToSmallClaimsInput(
    { facts: facts as Record<string, string | number | boolean>, answeredIds, matchedClaimType: null },
    { province: "Ontario", city: "Toronto" },
    OPENING_STORY,
  );

  console.log(`\n${"=".repeat(70)}\n=== Verdict: mapGuidedIntakeToSmallClaimsInput() output ===`);
  console.log(`amountClaimed: ${JSON.stringify(mapped.amountClaimed)}`);
  console.log(`timeline: ${JSON.stringify(mapped.timeline)}`);
  console.log(`evidence: ${JSON.stringify(mapped.evidence)}`);
  console.log(`goal: ${JSON.stringify(mapped.goal)}`);
  console.log(`serviceDetails: ${JSON.stringify(mapped.serviceDetails)}`);

  console.log(`\n=== Still empty (not collected by guided intake at all -- expected) ===`);
  console.log(
    `yourAddress=${JSON.stringify(mapped.yourAddress)}, otherParty=${JSON.stringify(mapped.otherParty)}, ` +
      `claimNumber=${JSON.stringify(mapped.claimNumber)}, missingEvidence=${JSON.stringify(mapped.missingEvidence)}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
