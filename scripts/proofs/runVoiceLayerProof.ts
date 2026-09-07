/**
 * Session 7 proof -- NOT a regression suite (scripts/verification/), NOT
 * wired into CI. Makes up to 3 real, billed OpenAI calls (2 voice-layer
 * generations + 1 reused extraction call for turn 1; turn 3 makes none --
 * see below). Run manually:
 *
 *   node --import tsx --env-file=.env.local scripts/proofs/runVoiceLayerProof.ts
 *
 * Three turns, each testing something different:
 *
 *   Turn 1: a clean, ordinary extraction (Session 3's freelance-invoice
 *   story, run through the real extractIntakeFacts.ts, not hand-faked) ->
 *   selectQuestions() -> composeVoiceTurn(). Proves the full chain,
 *   extraction included, not just voice-layer composition in isolation.
 *
 *   Turn 2: facts carried forward from turn 1, but this time the user
 *   also said something with real feeling ("I'm honestly so frustrated
 *   and disappointed about this -- I really thought they were reliable.").
 *   Passed to composeVoiceTurn() as userStatedTone, which the system
 *   prompt allows the model to briefly acknowledge -- never amplify,
 *   never turn into a legal characterization. The report below assesses
 *   whether the actual output does that or overreaches.
 *
 *   Turn 3: proves the guardrail catches something, not just that it
 *   never had anything to catch. A deliberately bad lead-in is
 *   hand-constructed here (NOT model output) containing a banned term,
 *   and run directly through validateVoiceLayerOutput() -- the same pure
 *   function composeVoiceTurn() calls on every real generation before
 *   anything is shown to a user. No OpenAI call for this turn: the
 *   validator is deterministic, and proving it rejects a known-bad string
 *   doesn't require generating one.
 *
 * Uses the same "reviewed for this proof only" fixture trick as Session
 * 3's runUnpaidDebtServicesProof.ts to get past selectQuestions.ts's
 * structural draft-status gate -- QUESTION_BANK itself is never mutated,
 * selectQuestions.ts is called completely unmodified.
 */

import { extractIntakeFacts } from "../../src/lib/case-system/intake/extractIntakeFacts";
import { composeVoiceTurn, validateVoiceLayerOutput } from "../../src/lib/case-system/intake/voiceLayer";
import { selectQuestions, type IntakeFacts } from "../../src/lib/case-system/intake/selectQuestions";
import { QUESTION_BANK, type IntakeQuestion } from "../../src/lib/case-system/intake/questionBank";

const REVIEWED_FOR_THIS_PROOF: IntakeQuestion[] = QUESTION_BANK.map((question) => ({
  ...question,
  status: "reviewed",
  reviewedAt: "2026-09-28",
}));

// Same story used in Session 3's runUnpaidDebtServicesProof.ts.
const CLEAR_STORY =
  "I'm a freelance web developer. Back in April, I built a full website for a small business owner " +
  "and delivered the finished site along with all the source files. We'd agreed by email that they'd " +
  "pay me $3,200 within 30 days of delivery. It's now been over three months, they haven't paid me " +
  "anything, and they've stopped responding to my emails about the unpaid invoice.";

const FRUSTRATED_STATEMENT =
  "I'm honestly so frustrated and disappointed about this -- I really thought they were reliable.";

function findNextQuestion(facts: IntakeFacts, answeredIds: string[]): IntakeQuestion | undefined {
  const remaining = selectQuestions(facts, answeredIds, REVIEWED_FOR_THIS_PROOF);
  return REVIEWED_FOR_THIS_PROOF.find((q) => q.id === remaining[0]);
}

function printVoiceTurn(voiceTurn: { leadIn: string | null; questionText: string; fellBackToPlainText: boolean }) {
  console.log(`Fell back to plain question text: ${voiceTurn.fellBackToPlainText}`);
  console.log(`\n--- What the user would see ---`);
  if (voiceTurn.leadIn) console.log(voiceTurn.leadIn);
  console.log(voiceTurn.questionText);
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set -- run with --env-file=.env.local");
    process.exitCode = 1;
    return;
  }

  // ---- Turn 1: real extraction, clean/ordinary story -----------------
  console.log(`${"=".repeat(70)}\n=== Turn 1 -- real extraction from Session 3's story ===`);
  console.log(`Story: ${CLEAR_STORY}`);

  const turn1Facts = await extractIntakeFacts(CLEAR_STORY, apiKey);
  console.log(`\nExtracted facts: ${JSON.stringify(turn1Facts)}`);

  const turn1AnsweredIds: string[] = [];
  const turn1Question = findNextQuestion(turn1Facts, turn1AnsweredIds);
  if (!turn1Question) throw new Error("Turn 1: no next question -- unexpected, stopping.");
  console.log(`selectQuestions() next question: ${turn1Question.id}`);

  const turn1Voice = await composeVoiceTurn(turn1Facts, turn1Question, apiKey);
  printVoiceTurn(turn1Voice);

  // ---- Turn 2: same facts carried forward, plus a stated feeling -----
  console.log(`\n${"=".repeat(70)}\n=== Turn 2 -- same facts, plus something said with real feeling ===`);
  const turn2AnsweredIds = [...turn1AnsweredIds, turn1Question.id];
  const turn2Question = findNextQuestion(turn1Facts, turn2AnsweredIds);
  if (!turn2Question) throw new Error("Turn 2: no next question -- unexpected, stopping.");
  console.log(`Facts (unchanged from turn 1): ${JSON.stringify(turn1Facts)}`);
  console.log(`User's own words (passed as tone context, not a new fact): "${FRUSTRATED_STATEMENT}"`);
  console.log(`selectQuestions() next question: ${turn2Question.id}`);

  const turn2Voice = await composeVoiceTurn(turn1Facts, turn2Question, apiKey, {
    userStatedTone: FRUSTRATED_STATEMENT,
  });
  printVoiceTurn(turn2Voice);

  // ---- Turn 3: hand-constructed bad output, proving the guardrail ----
  console.log(`\n${"=".repeat(70)}\n=== Turn 3 -- hand-constructed bad lead-in, proving the validator catches it ===`);
  const turn3AnsweredIds = [...turn2AnsweredIds, turn2Question.id];
  const turn3Question = findNextQuestion(turn1Facts, turn3AnsweredIds);
  if (!turn3Question) throw new Error("Turn 3: no next question -- unexpected, stopping.");
  console.log(`selectQuestions() next question: ${turn3Question.id}`);

  const deliberatelyBadLeadIn =
    "Based on what you've told us, this looks like a strong case of negligence and you have a valid " +
    "claim that will win.";
  console.log(`\nHand-constructed bad lead-in (NOT model output): "${deliberatelyBadLeadIn}"`);

  const validation = validateVoiceLayerOutput(deliberatelyBadLeadIn);
  console.log(`validateVoiceLayerOutput() result: ${JSON.stringify(validation)}`);
  if (validation.valid) {
    throw new Error("Turn 3: validator FAILED to reject a deliberately bad string containing banned terms.");
  }
  console.log(`\nCorrectly rejected -- matched banned term "${validation.matchedTerm}".`);
  console.log(
    `In composeVoiceTurn(), a rejection like this is exactly what triggers the fallback path: ` +
      `leadIn: null, fellBackToPlainText: true, and only the plain fixed question text is shown:`,
  );
  console.log(`\n--- What the user would see if the model had generated this ---`);
  console.log(turn3Question.text);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
