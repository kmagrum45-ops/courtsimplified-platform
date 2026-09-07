/**
 * Session 9 proof -- NOT a regression suite, NOT wired into CI. Makes
 * several real, billed OpenAI calls (safety + extraction + voice per turn
 * that includes free text; turns 2-3 below pass no new text, so they skip
 * safety/extraction and only cost a voice-layer call). Run manually:
 *
 *   node --import tsx --env-file=.env.local scripts/proofs/runOrchestratedConversationProof.ts
 *
 * The whole point of this script: no manual per-piece wiring. Every
 * earlier proof (Sessions 3, 4, 7) called safetyPass/extractIntakeFacts/
 * selectQuestions/composeVoiceTurn directly, by hand, in whatever order
 * that proof needed. This one calls orchestrateIntakeTurn() and nothing
 * else -- the sequencing, the safety-halt short-circuit, the fact merge,
 * the claim-type match, the question selection, and the voice-layer
 * composition are ALL its job now, not this script's.
 *
 * 5 turns, simulating a real conversation for the unpaid-debt/non-payment-
 * for-services scenario:
 *   Turn 1 -- opening story (Session 3's freelance-invoice story).
 *   Turn 2 -- the user answers turn 1's question with a plain date, no
 *             free text worth extracting from (newStoryText: undefined).
 *   Turn 3 -- the user answers turn 2's question, again no new free text.
 *   Turn 4 -- the user answers turn 3's question AND adds free text that
 *             deliberately tests both halves of the fact-merge rule at
 *             once: it claims the claim WAS filed (contradicting the
 *             already-confirmed claimFiled: false from turn 1 -- must be
 *             BLOCKED, and, since Session 10, flagged in
 *             possibleCorrections) and mentions service for the first
 *             time (claimServed was never set before -- must be FILLED
 *             IN, no correction flag, since there was nothing to
 *             contradict).
 *   Turn 5 -- Session 10's other required case: free text that mentions
 *             the SAME field (claimFiled) again, but as a hedged,
 *             undecided remark ("I've been going back and forth on
 *             whether to file, still haven't decided") rather than a
 *             direct assertion. Must NOT produce a possibleCorrection --
 *             proving the detector doesn't fire on every loose mention of
 *             a field that happens to already be confirmed.
 *
 * Uses the same "reviewed for this proof only" fixture trick as every
 * prior proof in this directory to get past selectQuestions.ts's
 * structural draft-status gate -- QUESTION_BANK itself is never mutated,
 * and it's passed to orchestrateIntakeTurn() via its own optional
 * questionBank parameter, exactly the mechanism the session asked for.
 */

import { orchestrateIntakeTurn } from "../../src/lib/case-system/intake/orchestrateIntakeTurn";
import { QUESTION_BANK, type IntakeQuestion } from "../../src/lib/case-system/intake/questionBank";
import type { IntakeFacts } from "../../src/lib/case-system/intake/selectQuestions";

const REVIEWED_FOR_THIS_PROOF: IntakeQuestion[] = QUESTION_BANK.map((question) => ({
  ...question,
  status: "reviewed",
  reviewedAt: "2026-09-07",
}));

const OPENING_STORY =
  "I'm a freelance web developer. Back in April, I built a full website for a small business owner " +
  "and delivered the finished site along with all the source files. We'd agreed by email that they'd " +
  "pay me $3,200 within 30 days of delivery. It's now been over three months, they haven't paid me " +
  "anything, and they've stopped responding to my emails about the unpaid invoice.";

// Deliberately tests both halves of mergeFacts() in one turn: claims
// claimFiled (already confirmed false in turn 1 -- must stay blocked) and
// mentions claimServed for the first time (previously unset -- must fill in).
const TURN4_TEXT =
  "Just to update you -- I actually went ahead and filed the Plaintiff's Claim with the court last " +
  "week, and I haven't served them with anything yet.";

// Session 10. Mentions the SAME already-confirmed field (claimFiled)
// again, but as a hedged, undecided remark -- must NOT produce a
// possibleCorrection, unlike TURN4_TEXT's direct assertion above.
const TURN5_TEXT =
  "I've been going back and forth on whether to file or not, still haven't decided what I want to do.";

function printTurn(label: string, result: Awaited<ReturnType<typeof orchestrateIntakeTurn>>) {
  console.log(`\n${"=".repeat(70)}\n=== ${label} ===`);
  console.log(`safetyClassification: ${result.safetyClassification ?? "(not run this turn)"}`);
  console.log(`halted: ${result.halted}`);
  if (result.haltMessage) console.log(`haltMessage: ${result.haltMessage}`);
  if (result.distressAcknowledgment) console.log(`distressAcknowledgment: ${result.distressAcknowledgment}`);
  console.log(`facts: ${JSON.stringify(result.facts)}`);
  console.log(`answeredIds (passed through): [${result.answeredIds.join(", ")}]`);
  console.log(
    `matchedClaimTypes: ${
      result.matchedClaimTypes.length > 0
        ? result.matchedClaimTypes.map((m) => `${m.claimType.id} (signals: ${m.matchedSignals.join(", ")})`).join("; ")
        : "(none this turn)"
    }`,
  );
  console.log(`intakeComplete: ${result.intakeComplete}`);
  console.log(
    `possibleCorrections: ${
      result.possibleCorrections.length > 0
        ? result.possibleCorrections
            .map((c) => `${c.field}: confirmed=${JSON.stringify(c.oldValue)} vs. new=${JSON.stringify(c.newValue)}`)
            .join("; ")
        : "(none)"
    }`,
  );
  if (result.nextQuestion) {
    console.log(`\n--- What the user would see (turn's nextQuestion, via voiceTurn) ---`);
    if (result.voiceTurn?.leadIn) console.log(result.voiceTurn.leadIn);
    console.log(result.voiceTurn?.questionText ?? result.nextQuestion.text);
  }
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set -- run with --env-file=.env.local");
    process.exitCode = 1;
    return;
  }

  // ---- Turn 1: opening story ----
  let facts: IntakeFacts = {};
  let answeredIds: string[] = [];

  const turn1 = await orchestrateIntakeTurn(facts, answeredIds, OPENING_STORY, apiKey, REVIEWED_FOR_THIS_PROOF);
  printTurn("Turn 1 -- opening story", turn1);
  facts = turn1.facts;
  if (turn1.nextQuestion) answeredIds = [...answeredIds, turn1.nextQuestion.id];

  // ---- Turn 2: answer turn 1's question, no new free text ----
  const turn2 = await orchestrateIntakeTurn(facts, answeredIds, undefined, apiKey, REVIEWED_FOR_THIS_PROOF);
  printTurn("Turn 2 -- answered previous question, no new free text", turn2);
  facts = turn2.facts;
  if (turn2.nextQuestion) answeredIds = [...answeredIds, turn2.nextQuestion.id];

  // ---- Turn 3: answer turn 2's question, no new free text ----
  const turn3 = await orchestrateIntakeTurn(facts, answeredIds, undefined, apiKey, REVIEWED_FOR_THIS_PROOF);
  printTurn("Turn 3 -- answered previous question, no new free text", turn3);
  facts = turn3.facts;
  if (turn3.nextQuestion) answeredIds = [...answeredIds, turn3.nextQuestion.id];

  // ---- Turn 4: answer turn 3's question, PLUS free text testing the merge rule ----
  console.log(`\n${"=".repeat(70)}\n=== Turn 4 setup: facts BEFORE this turn ===`);
  console.log(JSON.stringify(facts));
  console.log(`New free text this turn: "${TURN4_TEXT}"`);
  console.log(
    `Watch claimFiled (already false -- must NOT become true) and claimServed (previously unset -- must fill in).`,
  );

  const turn4 = await orchestrateIntakeTurn(facts, answeredIds, TURN4_TEXT, apiKey, REVIEWED_FOR_THIS_PROOF);
  printTurn("Turn 4 -- answered previous question + merge-rule test text", turn4);
  facts = turn4.facts;
  if (turn4.nextQuestion) answeredIds = [...answeredIds, turn4.nextQuestion.id];

  console.log(`\n${"=".repeat(70)}\n=== Turn 4 verdict ===`);
  console.log(
    `claimFiled: ${JSON.stringify(facts.claimFiled)} -- expected false (blocked overwrite, correct: was already ` +
      `confirmed false in turn 1, new text tried to claim true, must NOT have changed as the ACTIVE fact).`,
  );
  console.log(
    `claimServed: ${JSON.stringify(facts.claimServed)} -- expected false (allowed fill: was never previously set, ` +
      `new text mentioned it for the first time, must have filled in).`,
  );
  console.log(
    `possibleCorrections: expected exactly one entry for claimFiled (confirmed=false vs. new=true) -- the text ` +
      `directly and confidently asserted a contradiction, so it should be flagged for a future confirmation step, ` +
      `not silently discarded. Actual: ${
        turn4.possibleCorrections.length === 1 && turn4.possibleCorrections[0].field === "claimFiled"
          ? "MATCHES expected"
          : "DOES NOT MATCH expected -- see raw output above"
      }.`,
  );
  console.log(
    `Consequence visible in question selection: sc-defendant-served requires claimFiled === true. It is ` +
      `${turn4.nextQuestion?.id === "sc-defendant-served" ? "INCORRECTLY" : "correctly NOT"} the next question -- ` +
      `if the merge rule had let claimFiled flip to true, this question would have started applying to a claim ` +
      `that (per the very first confirmed fact) was never filed.`,
  );

  // ---- Turn 5: same field mentioned again, hedged this time -- must NOT flag a correction ----
  console.log(`\n${"=".repeat(70)}\n=== Turn 5 setup ===`);
  console.log(`New free text this turn (hedged, not a direct assertion): "${TURN5_TEXT}"`);
  console.log(`Expecting: no possibleCorrection for claimFiled, unlike turn 4's direct assertion.`);

  const turn5 = await orchestrateIntakeTurn(facts, answeredIds, TURN5_TEXT, apiKey, REVIEWED_FOR_THIS_PROOF);
  printTurn("Turn 5 -- hedged mention of an already-confirmed field", turn5);

  console.log(`\n${"=".repeat(70)}\n=== Turn 5 verdict ===`);
  console.log(
    `possibleCorrections: expected empty -- the mention was hedged/undecided, not a direct assertion. Actual: ` +
      `${turn5.possibleCorrections.length === 0 ? "MATCHES expected (empty)" : "DOES NOT MATCH expected -- see raw output above"}.`,
  );
  console.log(
    `facts.claimFiled: ${JSON.stringify(turn5.facts.claimFiled)} -- expected false, unchanged from turn 4 either way.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
