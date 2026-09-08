/**
 * Session 22 proof -- NOT a regression suite, NOT wired into CI. Extends
 * Session 9's runOrchestratedConversationProof.ts pattern: real turns
 * through orchestrateIntakeTurn(), the unpaid-debt/non-payment-for-services
 * scenario, no mocking of the pipeline itself. Makes real, billed OpenAI
 * calls (safety + extraction + voice per turn with free text). Run
 * manually:
 *
 *   node --import tsx --env-file=.env.local scripts/proofs/runEvidenceGapDetectorProof.ts
 *
 * What this proves, in two parts:
 *
 * 1. orchestrateIntakeTurn()'s evidenceGuidance field, exactly as wired --
 *    turn-scoped to whatever claim type matchClaimType() finds in THAT
 *    turn's newStoryText, same as matchedClaimTypes. The scenario is
 *    driven all the way to the sc-evidence-available question and
 *    answered, and the result's evidenceGuidance is printed as-is,
 *    honestly -- including if it comes back empty, since an evidence
 *    answer ("I have the email and photos...") often won't itself contain
 *    the dispute-identifying signals (`didn't pay`, `owes me money`, etc.)
 *    matchClaimType() looks for, and evidenceGuidance is only computed
 *    when matchedClaimTypes is non-empty that same turn. That is not a
 *    bug in this proof -- it is the exact, documented turn-scoping
 *    tradeoff evidenceGuidance inherits from matchedClaimTypes.
 *
 * 2. evidenceGapDetector.ts's detectEvidenceGaps(), called directly and
 *    standalone -- the pattern a real caller uses to work around part 1's
 *    turn-scoping: retain the last matched claim type (from turn 1, where
 *    the opening story matched it), and call detectEvidenceGaps() against
 *    it directly with the evidence answer's text, independent of whether
 *    that same turn happened to re-match a claim type on its own. This is
 *    the demonstration that actually answers the session's ask -- showing
 *    real addressed/unaddressed categories for real evidence text.
 *
 * 3. Session 25 -- negation awareness. EVIDENCE_ANSWER was deliberately
 *    written (Session 22) to include "I never sent a formal invoice or
 *    statement of account... so I don't have that document" specifically
 *    to catch a real bug: the pre-Session-25 detector flagged "Invoice or
 *    statement of account" as addressed purely because the word "invoice"
 *    appeared, with no check for the negation right next to it. Asserted
 *    below, not just printed -- this is the one thing this proof now
 *    hard-fails on if it regresses.
 */

import assert from "node:assert/strict";

import { orchestrateIntakeTurn } from "../../src/lib/case-system/intake/orchestrateIntakeTurn";
import { detectEvidenceGaps } from "../../src/lib/case-system/intake/evidenceGapDetector";

const OPENING_STORY =
  "I'm a freelance web developer. Back in April, I built a full website for a small business owner " +
  "and delivered the finished site along with all the source files. We'd agreed by email that they'd " +
  "pay me $3,200 within 30 days of delivery. It's now been over three months, they haven't paid me " +
  "anything, and they've stopped responding to my emails about the unpaid invoice.";

// Deliberately mixes evidence the "unpaid debt" claim type's categories
// cover (a written/email agreement, proof the work happened) with a gap
// left open (no proof money changed hands -- there's nothing to prove,
// since nothing was paid) and an explicit statement that no invoice/
// statement-of-account document exists.
const EVIDENCE_ANSWER =
  "I have the email thread where we agreed on the $3,200 price and the delivery date, and I have " +
  "screenshots of the finished website before I handed it over. I never sent a formal invoice or " +
  "statement of account, just the email agreement, so I don't have that document.";

function printCategoryList(label: string, categories: { name: string }[]) {
  console.log(`  ${label}: ${categories.length === 0 ? "(none)" : categories.map((c) => c.name).join("; ")}`);
}

function printEvidenceGuidance(label: string, guidance: ReturnType<typeof detectEvidenceGaps> | undefined) {
  console.log(`\n--- ${label} ---`);
  if (!guidance) {
    console.log("  (undefined this turn -- no claim type matched newStoryText this turn)");
    return;
  }
  console.log(`  Claim type: ${guidance.claimTypeName} (${guidance.claimTypeId})`);
  printCategoryList("Addressed", guidance.addressedCategories);
  printCategoryList("Unaddressed", guidance.unaddressedCategories);
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set -- run with --env-file=.env.local");
    process.exitCode = 1;
    return;
  }

  let facts = {};
  let answeredIds: string[] = [];

  // ---- Turn 1: opening story -- this is where the claim type matches ----
  const turn1 = await orchestrateIntakeTurn(facts, answeredIds, OPENING_STORY, apiKey);
  console.log(`${"=".repeat(70)}\nTurn 1 -- opening story`);
  console.log(
    `matchedClaimTypes: ${
      turn1.matchedClaimTypes.length > 0
        ? turn1.matchedClaimTypes.map((m) => `${m.claimType.id} (signals: ${m.matchedSignals.join(", ")})`).join("; ")
        : "(none)"
    }`,
  );
  printEvidenceGuidance("Turn 1 evidenceGuidance (from orchestrateIntakeTurn, turn-scoped)", turn1.evidenceGuidance);
  facts = turn1.facts;
  if (turn1.nextQuestion) answeredIds = [...answeredIds, turn1.nextQuestion.id];

  // Retain the matched claim type the way a real caller must, per the
  // documented turn-scoping caveat -- matchedClaimTypes/evidenceGuidance
  // both flicker away once a turn's newStoryText doesn't itself match.
  const retainedClaimType = turn1.matchedClaimTypes[0]?.claimType;
  if (!retainedClaimType) {
    console.error("Turn 1 did not match a claim type -- cannot continue the proof.");
    process.exitCode = 1;
    return;
  }

  // ---- Advance turns with no new free text until sc-evidence-available is next ----
  let current = turn1;
  let guard = 0;
  while (current.nextQuestion && current.nextQuestion.id !== "sc-evidence-available" && guard < 15) {
    guard += 1;
    current = await orchestrateIntakeTurn(facts, answeredIds, undefined, apiKey);
    facts = current.facts;
    if (current.nextQuestion) answeredIds = [...answeredIds, current.nextQuestion.id];
  }

  if (current.nextQuestion?.id !== "sc-evidence-available") {
    console.error(`Did not reach sc-evidence-available (stopped at: ${current.nextQuestion?.id ?? "intake complete"}).`);
    process.exitCode = 1;
    return;
  }
  console.log(`\n${"=".repeat(70)}\nReached sc-evidence-available. Answering it now.`);
  console.log(`Evidence answer: "${EVIDENCE_ANSWER}"`);

  // ---- Answer the evidence question ----
  const evidenceTurn = await orchestrateIntakeTurn(facts, answeredIds, EVIDENCE_ANSWER, apiKey);
  printEvidenceGuidance(
    "Evidence-answer turn's evidenceGuidance (from orchestrateIntakeTurn, turn-scoped)",
    evidenceTurn.evidenceGuidance,
  );

  // ---- Part 2: the real demonstration -- standalone detectEvidenceGaps() ----
  const standalone = detectEvidenceGaps(retainedClaimType, EVIDENCE_ANSWER);
  printEvidenceGuidance(
    "Standalone detectEvidenceGaps(retained claim type, evidence answer) -- the real caller pattern",
    standalone,
  );

  console.log(`\n${"=".repeat(70)}\nVerdict`);
  console.log(
    `Categories for "${retainedClaimType.name}": ` +
      `${standalone.addressedCategories.length} addressed, ${standalone.unaddressedCategories.length} unaddressed.`,
  );
  console.log(
    "Expected: the email/agreement and delivered-work categories addressed; the money-changed-hands, " +
      "communication (singular/plural stemming gap, a separate documented limitation), and " +
      "invoice/statement-of-account categories unaddressed (the answer explicitly says no invoice " +
      "was sent, no statement of account exists, and nothing was paid).",
  );

  // ---- Session 25 assertion: negation awareness ----------------------------
  // Before Session 25, "Invoice or statement of account" was incorrectly
  // flagged addressed here, purely because the word "invoice" appears in
  // the text -- with no check for "I never sent... I don't have that
  // document" negating it right next to the match. This is the regression
  // guard: fail loudly, not just print a mismatch, if that bug comes back.
  const invoiceCategoryName = "Invoice or statement of account";
  const addressedNames = standalone.addressedCategories.map((category) => category.name);
  const unaddressedNames = standalone.unaddressedCategories.map((category) => category.name);

  assert.ok(
    !addressedNames.includes(invoiceCategoryName),
    `Regression: "${invoiceCategoryName}" was flagged addressed despite the explicit negation ` +
      `("I never sent a formal invoice or statement of account... I don't have that document"). ` +
      `Addressed categories were: ${addressedNames.join(", ")}`,
  );
  assert.ok(
    unaddressedNames.includes(invoiceCategoryName),
    `"${invoiceCategoryName}" should be unaddressed (negated, not confirmed absent) but was missing ` +
      `from unaddressedCategories entirely. Unaddressed categories were: ${unaddressedNames.join(", ")}`,
  );

  console.log(
    `\nSession 25 negation assertion PASSED: "${invoiceCategoryName}" correctly stayed unaddressed ` +
      "despite the literal word \"invoice\" appearing in the text, because it's negated nearby.",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
