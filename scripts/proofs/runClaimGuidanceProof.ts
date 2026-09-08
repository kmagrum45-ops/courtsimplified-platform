/**
 * Session 32 proof -- NOT wired into CI, makes real, billed OpenAI calls
 * (safety + extraction + voice on the opening-story turn; the target
 * turn below skips extraction since it carries no new free text, but
 * still costs a voice-layer call while a nextQuestion remains).
 *
 * Run manually:
 *   node --import tsx --env-file=.env.local scripts/proofs/runClaimGuidanceProof.ts
 *
 * Confirms end to end: once a real conversation's opening story matches a
 * claim type, orchestrateIntakeTurn()'s result carries claimGuidance with
 * that claim type's education topics (courtArea + surfacedWhen match) and
 * remedies (claimTypes.ts's own `remedies` id references), same
 * turn-scoped pattern already proven for evidenceGuidance.
 */

import { orchestrateIntakeTurn } from "../../src/lib/case-system/intake/orchestrateIntakeTurn";
import { buildClaimGuidance } from "../../src/lib/case-system/intake/claimGuidance";
import { QUESTION_BANK, type IntakeQuestion } from "../../src/lib/case-system/intake/questionBank";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import type { IntakeFacts } from "../../src/lib/case-system/intake/selectQuestions";

const REVIEWED_FOR_THIS_PROOF: IntakeQuestion[] = QUESTION_BANK.map((question) => ({
  ...question,
  status: "reviewed",
  reviewedAt: "2026-09-08",
}));

// Deliberately includes "unpaid invoice" and "owes me money" verbatim --
// claimTypeMatcher.ts does plain substring matching against claimTypes.ts's
// own `signals` phrases, not semantic matching.
// Deliberately says nothing about whether a claim has been filed -- leaves
// facts.claimFiled genuinely undefined (not false), the real test of
// sc-topic-filing-form-7a's surfacedWhen: { field: "claimFiled", op:
// "notExists" } -- "notExists" means never determined either way, not
// "determined to be false" (a real distinction the first draft of this
// proof got wrong: an explicit "I haven't filed yet" extracts to
// claimFiled: false, which DOES exist, so notExists correctly excludes the
// topic then too -- only genuinely unmentioned filing status should surface it).
const OPENING_STORY =
  "I'm a freelance web developer bringing a claim. I built a full website for a small business client " +
  "back in April, and we'd agreed by email they'd pay me $3,200 within 30 days of delivery. There's an " +
  "unpaid invoice -- the client owes me money and hasn't paid.";

function printClaimGuidance(label: string, claimGuidance: Awaited<ReturnType<typeof orchestrateIntakeTurn>>["claimGuidance"]) {
  console.log(`\n${"=".repeat(70)}\n=== ${label} ===`);
  if (!claimGuidance) {
    console.log("claimGuidance: absent");
    return;
  }
  console.log(`claimTypeId: ${claimGuidance.claimTypeId}`);
  console.log(`claimTypeName: ${claimGuidance.claimTypeName}`);
  console.log(`\neducationTopics (${claimGuidance.educationTopics.length}):`);
  for (const topic of claimGuidance.educationTopics) {
    console.log(`  - [${topic.id}] ${topic.title}`);
  }
  console.log(`\nremedies (${claimGuidance.remedies.length}):`);
  for (const remedy of claimGuidance.remedies) {
    console.log(`  - [${remedy.id}] ${remedy.title}`);
  }
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set -- run with --env-file=.env.local");
    process.exitCode = 1;
    return;
  }

  const facts: IntakeFacts = {};
  const answeredIds: string[] = [];

  const turn1 = await orchestrateIntakeTurn(facts, answeredIds, OPENING_STORY, apiKey, REVIEWED_FOR_THIS_PROOF, CLAIM_TYPES);

  console.log(`Matched claim type: ${turn1.matchedClaimTypes[0]?.claimType.id ?? "(none)"}`);
  console.log(`Facts after opening story: ${JSON.stringify(turn1.facts)}`);
  printClaimGuidance("Turn 1 -- opening story (claimFiled never mentioned, so sc-topic-filing-form-7a should surface)", turn1.claimGuidance);

  console.log(`\n${"=".repeat(70)}\n=== Verdict ===`);
  const topicIds = new Set((turn1.claimGuidance?.educationTopics ?? []).map((t) => t.id));
  const remedyIds = new Set((turn1.claimGuidance?.remedies ?? []).map((r) => r.id));
  console.log(
    `sc-topic-filing-form-7a present in the LIVE turn (surfacedWhen: claimFiled notExists, ` +
      `facts.claimFiled=${JSON.stringify(turn1.facts.claimFiled)}): ` +
      `${topicIds.has("sc-topic-filing-form-7a") ? "YES" : "NO"} -- the AI extractor inferred a claimFiled ` +
      `value from this story even though filing was never explicitly mentioned, so this depends on the ` +
      `model's read of the text, not on buildClaimGuidance()'s own logic; see the deterministic check below ` +
      `for that.`,
  );
  console.log(
    `sc-topic-monetary-limit present (no surfacedWhen -- generally relevant): ` +
      `${topicIds.has("sc-topic-monetary-limit") ? "YES -- correct" : "NO -- unexpected"}`,
  );

  // Deterministic check, no AI involved: buildClaimGuidance() called directly
  // with facts genuinely lacking claimFiled -- proves the surfacedWhen gate
  // itself (evaluateFactCondition's "notExists"), independent of whatever
  // the live extractor happened to infer above.
  const matchedClaimTypeForGate = CLAIM_TYPES.find((claimType) => claimType.id === turn1.matchedClaimTypes[0]?.claimType.id);
  if (matchedClaimTypeForGate) {
    const guidanceWithNoClaimFiledFact = buildClaimGuidance(matchedClaimTypeForGate, {});
    const gateTopicIds = new Set(guidanceWithNoClaimFiledFact.educationTopics.map((t) => t.id));
    console.log(
      `sc-topic-filing-form-7a present when facts={} (deterministic, claimFiled genuinely undefined): ` +
        `${gateTopicIds.has("sc-topic-filing-form-7a") ? "YES -- correct" : "NO -- unexpected"}`,
    );
    const guidanceWithClaimFiledTrue = buildClaimGuidance(matchedClaimTypeForGate, { claimFiled: true });
    const gateTopicIdsFiled = new Set(guidanceWithClaimFiledTrue.educationTopics.map((t) => t.id));
    console.log(
      `sc-topic-filing-form-7a present when facts={claimFiled: true} (should be gated OUT): ` +
        `${gateTopicIdsFiled.has("sc-topic-filing-form-7a") ? "NO -- MISMATCH, should be absent" : "correctly absent"}`,
    );
  }
  const matchedClaimType = CLAIM_TYPES.find((claimType) => claimType.id === turn1.matchedClaimTypes[0]?.claimType.id);
  const expectedRemedies = matchedClaimType ? new Set(matchedClaimType.remedies) : new Set<string>();
  const remediesMatch =
    remedyIds.size === expectedRemedies.size && [...remedyIds].every((id) => expectedRemedies.has(id));
  console.log(
    `remedies exactly match matched claim type's own \`remedies\` id list (${[...expectedRemedies].join(", ")}): ` +
      `${remediesMatch ? "YES -- correct" : "NO -- MISMATCH, see raw output above"}`,
  );

  // ---- Turn 2: answer the next question with no new free text -- claimGuidance must be absent (turn-scoped) ----
  const facts2 = turn1.facts;
  const answeredIds2 = turn1.nextQuestion ? [...answeredIds, turn1.nextQuestion.id] : answeredIds;
  const turn2 = await orchestrateIntakeTurn(facts2, answeredIds2, undefined, apiKey, REVIEWED_FOR_THIS_PROOF, CLAIM_TYPES);
  printClaimGuidance("Turn 2 -- no new free text (claimGuidance should be absent, turn-scoped)", turn2.claimGuidance);
  console.log(
    `\nTurn 2 claimGuidance absent as expected: ${turn2.claimGuidance === undefined ? "YES -- correct" : "NO -- unexpected"}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
