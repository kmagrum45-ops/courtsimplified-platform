/**
 * Session 36 -- the exact real-pipeline turn loop Session 35's
 * runFixtures.ts originally had inline, extracted here so the new
 * generated-story harness (runGeneratedFixtures.ts) runs through the
 * IDENTICAL code, not a second, independently-maintained copy of the same
 * logic that could quietly drift from it. runFixtures.ts now imports this
 * too -- its own behavior and output are unchanged by the extraction.
 *
 * Three real calls, no shortcuts, no mocks:
 *   1. orchestrateIntakeTurn() -- turn by turn, same as
 *      GuidedSmallClaimsIntake.tsx's sendTurn().
 *   2. mapGuidedIntakeToSmallClaimsInput() -- same function
 *      builder/page.tsx's handleGuidedComplete() calls.
 *   3. analyzeSmallClaimsWithBrain(input, {allowExternalCognition: true}) --
 *      the exact server-side function /api/small-claims/analyze/route.ts
 *      calls internally, called directly instead of through the HTTP+auth
 *      wrapper (same pattern every proofs/ script in this codebase uses).
 */

import { orchestrateIntakeTurn } from "../../../src/lib/case-system/intake/orchestrateIntakeTurn";
import { QUESTION_BANK, type IntakeQuestion } from "../../../src/lib/case-system/intake/questionBank";
import { CLAIM_TYPES } from "../../../src/lib/case-system/intake/claimTypes";
import type { IntakeFacts } from "../../../src/lib/case-system/intake/selectQuestions";
import { analyzeSmallClaimsWithBrain } from "../../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { mapGuidedIntakeToSmallClaimsInput } from "../../../app/builder/_components/guidedIntakeToSmallClaimsInput";
import type { GuidedIntakeCompletionResult } from "../../../app/builder/_components/GuidedSmallClaimsIntake";

const MAX_TURNS = 20; // safety cap -- QUESTION_BANK has 15 entries, so 20 is generous headroom.

export type PipelineStoryInput = {
  id: string;
  story: string;
  answers: Record<string, string>;
  location: { province: "Ontario"; city: string };
};

export type TurnLog = {
  questionAsked: string | null;
  answerGiven: string | null;
  matchedClaimTypeThisTurn: string | null;
  /**
   * Session 37 (42274b3). The AI classifier's fallback suggestion for THIS
   * turn, if any -- same turn-scoping as matchedClaimTypeThisTurn. Only
   * ever set when matchedClaimTypeThisTurn is null (orchestrateIntakeTurn.ts
   * only calls the AI fallback when the exact matcher finds nothing), which
   * is itself the leak check: a caller can verify a suggestion never
   * appeared alongside a same-turn exact match or evidenceGuidance.
   */
  suggestedClaimTypeThisTurn: string | null;
  evidenceGuidanceThisTurn: { addressed: string[]; unaddressed: string[] } | null;
  factsAfter: IntakeFacts;
  possibleCorrections: string[];
};

export type RetainedMatch = { claimTypeId: string; claimTypeName: string };

export type PipelineRun = {
  input: PipelineStoryInput;
  turns: TurnLog[];
  halted: boolean;
  haltMessage: string;
  intakeComplete: boolean;
  finalFacts: IntakeFacts;
  finalAnsweredIds: string[];
  retainedMatchedClaimType: RetainedMatch | null;
  /**
   * Session 37 (42274b3). Last non-null AI-classifier suggestion seen
   * across all turns, same retain-the-last-value pattern as
   * retainedMatchedClaimType. Unlike retainedMatchedClaimType, this is
   * NEVER written into mappedInput/analysisOutput below -- an AI
   * suggestion this raw pipeline run produces is exactly what a real user
   * would see as a pending confirmation card, not yet a match. A caller
   * that wants to simulate the user confirming or rejecting it calls
   * claimTypeSuggestionResolution.ts's resolveClaimTypeSuggestion()
   * directly against input.story, the same real function the confirm/
   * reject API route calls -- not reimplemented here.
   */
  retainedSuggestedClaimType: RetainedMatch | null;
  mappedInput: ReturnType<typeof mapGuidedIntakeToSmallClaimsInput> | null;
  analysisOutput: Awaited<ReturnType<typeof analyzeSmallClaimsWithBrain>> | null;
};

export async function runStoryThroughPipeline(input: PipelineStoryInput, apiKey: string): Promise<PipelineRun> {
  let facts: IntakeFacts = {};
  let answeredIds: string[] = [];
  let retainedMatchedClaimType: RetainedMatch | null = null;
  let retainedSuggestedClaimType: RetainedMatch | null = null;
  const turns: TurnLog[] = [];
  let halted = false;
  let haltMessage = "";
  let intakeComplete = false;

  // --- Turn 1: opening story ---
  let result = await orchestrateIntakeTurn(facts, answeredIds, input.story, apiKey, QUESTION_BANK, CLAIM_TYPES);
  facts = result.facts;
  recordTurn(null, input.story, result);

  let turnCount = 0;
  while (!halted && !intakeComplete && result.nextQuestion && turnCount < MAX_TURNS) {
    const question: IntakeQuestion = result.nextQuestion;
    answeredIds = [...answeredIds, question.id];
    const answerText = input.answers[question.id];
    if (answerText === undefined) {
      throw new Error(`Story "${input.id}" has no answer for question id "${question.id}" -- story is incomplete.`);
    }

    result = await orchestrateIntakeTurn(
      facts,
      answeredIds,
      answerText,
      apiKey,
      QUESTION_BANK,
      CLAIM_TYPES,
      "small-claims",
      question.id,
    );
    facts = result.facts;
    recordTurn(question.id, answerText, result);
    turnCount += 1;
  }

  function recordTurn(questionId: string | null, answerText: string | null, r: Awaited<ReturnType<typeof orchestrateIntakeTurn>>) {
    if (r.halted) {
      halted = true;
      haltMessage = r.haltMessage || "";
    }
    if (r.intakeComplete) intakeComplete = true;
    const freshMatch = r.matchedClaimTypes[0]?.claimType;
    if (freshMatch) retainedMatchedClaimType = { claimTypeId: freshMatch.id, claimTypeName: freshMatch.name };
    if (r.suggestedClaimType) retainedSuggestedClaimType = r.suggestedClaimType;
    turns.push({
      questionAsked: questionId,
      answerGiven: answerText,
      matchedClaimTypeThisTurn: freshMatch ? `${freshMatch.id} (${freshMatch.name})` : null,
      suggestedClaimTypeThisTurn: r.suggestedClaimType
        ? `${r.suggestedClaimType.claimTypeId} (${r.suggestedClaimType.claimTypeName})`
        : null,
      evidenceGuidanceThisTurn: r.evidenceGuidance
        ? {
            addressed: r.evidenceGuidance.addressedCategories.map((c) => c.name),
            unaddressed: r.evidenceGuidance.unaddressedCategories.map((c) => c.name),
          }
        : null,
      factsAfter: r.facts,
      possibleCorrections: r.possibleCorrections.map((c) => `${c.field}: ${JSON.stringify(c.oldValue)} -> ${JSON.stringify(c.newValue)}`),
    });
  }

  const completionResult: GuidedIntakeCompletionResult = {
    facts: facts as GuidedIntakeCompletionResult["facts"],
    answeredIds,
    matchedClaimType: retainedMatchedClaimType,
  };

  const mappedInput = halted
    ? null
    : mapGuidedIntakeToSmallClaimsInput(completionResult, input.location, input.story);

  const analysisOutput = mappedInput
    ? await analyzeSmallClaimsWithBrain(mappedInput, { allowExternalCognition: true })
    : null;

  return {
    input,
    turns,
    halted,
    haltMessage,
    intakeComplete,
    finalFacts: facts,
    finalAnsweredIds: answeredIds,
    retainedMatchedClaimType,
    retainedSuggestedClaimType,
    mappedInput,
    analysisOutput,
  };
}
