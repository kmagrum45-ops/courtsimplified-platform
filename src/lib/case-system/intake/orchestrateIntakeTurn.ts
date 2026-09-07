/**
 * The real orchestrator -- the function a UI would actually call, one turn
 * at a time. Composes the five pieces already built and proven
 * (safetyPass, extractIntakeFacts, claimTypeMatcher, selectQuestions,
 * voiceLayer) in the right order with the right data. Reinvents none of
 * their logic -- every substantive decision (is this dangerous? what did
 * the user say? which question is next? what does the lead-in say?) is
 * still made by the module that owns it. This file only sequences them
 * and carries state between them within a single turn.
 *
 * State model: this function is stateless across calls by design, same
 * philosophy as selectQuestions.ts. The caller owns `facts` and
 * `answeredIds` as persistent state across turns (accumulate
 * `nextQuestion.id` into `answeredIds` once the user has answered it,
 * before calling again) -- this file never reaches for a database, a
 * session store, or anything else outside its arguments.
 *
 * `matchedClaimTypes` is turn-scoped, not accumulated: it reflects only
 * what `claimTypeMatcher` finds in *this* call's `newStoryText`, empty
 * when no new text is given this turn. A caller that wants a matched
 * claim type to persist in a UI across turns (rather than flicker away
 * the moment the user answers a fixed-choice question with no free text)
 * needs to retain the last non-empty result themselves -- the same
 * pattern they already use for `facts`/`answeredIds`. Extending this
 * function to remember matches itself would mean tracking accumulated
 * story text as state, which its signature deliberately doesn't carry;
 * left as a documented decision for a future session, not solved here.
 */

import { runSafetyPass, type SafetyClassification } from "./safetyPass";
import { extractIntakeFacts } from "./extractIntakeFacts";
import { matchClaimType, type ClaimTypeMatch } from "./claimTypeMatcher";
import { CLAIM_TYPES } from "./claimTypes";
import { selectQuestions, type IntakeFacts } from "./selectQuestions";
import { QUESTION_BANK, type IntakeQuestion, type KnownFactField } from "./questionBank";
import { composeVoiceTurn, type VoiceTurn } from "./voiceLayer";

export type OrchestrateIntakeTurnResult = {
  /** Set only when newStoryText was provided this turn -- undefined otherwise. */
  safetyClassification?: SafetyClassification;
  /** True only for "immediate-danger" -- nothing else in this turn ran. */
  halted: boolean;
  /** Fixed IMMEDIATE_DANGER_MESSAGE text, set only when halted. */
  haltMessage?: string;
  /** Fixed DISTRESS_ACKNOWLEDGMENT text, set only when classification was "distress". */
  distressAcknowledgment?: string;
  /** The merged facts -- see mergeFacts() for the never-overwrite rule. */
  facts: IntakeFacts;
  /** Passed through unchanged -- this function never adds to it itself. */
  answeredIds: string[];
  /** See the file header note on why this is turn-scoped, not accumulated. */
  matchedClaimTypes: ClaimTypeMatch[];
  /** Absent when intake is complete or the turn halted. */
  nextQuestion?: IntakeQuestion;
  /** Absent when there's no nextQuestion. */
  voiceTurn?: VoiceTurn;
  /** True once selectQuestions() has nothing left to ask. */
  intakeComplete: boolean;
};

/**
 * Never silently overwrites a fact already present in `current` -- new
 * extraction only fills fields that are currently missing. This is what
 * makes suggest-then-confirm durable: once a fact is confirmed (by
 * extraction or by the user directly answering its dedicated question),
 * later free text in the same conversation cannot silently change it.
 * Correcting a previously-confirmed fact needs an explicit mechanism,
 * which doesn't exist yet -- this function's job is only to make sure
 * ordinary free text can't do it by accident.
 */
function mergeFacts(current: IntakeFacts, extracted: IntakeFacts): IntakeFacts {
  const merged: IntakeFacts = { ...current };
  for (const key of Object.keys(extracted) as KnownFactField[]) {
    if (merged[key] === undefined) {
      merged[key] = extracted[key];
    }
    // else: already present. Deliberately left untouched, even if the new
    // extraction disagrees with it.
  }
  return merged;
}

/**
 * One turn of intake, start to finish:
 *   1. If newStoryText is given: safety pass first. immediate-danger halts
 *      here -- nothing else below runs this turn.
 *   2. distress doesn't halt -- its fixed acknowledgment is carried in the
 *      result, and the turn continues.
 *   3. Extraction runs on newStoryText (when given), merged into facts via
 *      mergeFacts() -- never overwrites an already-known fact.
 *   4. claimTypeMatcher runs against newStoryText (when given) -- plain
 *      keyword data, no AI, doesn't affect question selection.
 *   5. selectQuestions() picks the next question from the (possibly
 *      caller-supplied, e.g. a "reviewed" fixture) question bank.
 *   6. If there's a next question, composeVoiceTurn() wraps it. If not,
 *      the turn reports intake as complete.
 */
export async function orchestrateIntakeTurn(
  currentFacts: IntakeFacts,
  answeredIds: string[],
  newStoryText: string | undefined,
  apiKey: string,
  questionBank: readonly IntakeQuestion[] = QUESTION_BANK,
): Promise<OrchestrateIntakeTurnResult> {
  let facts = currentFacts;
  let safetyClassification: SafetyClassification | undefined;
  let distressAcknowledgment: string | undefined;
  let matchedClaimTypes: ClaimTypeMatch[] = [];

  if (newStoryText) {
    const safety = await runSafetyPass(newStoryText, apiKey);
    safetyClassification = safety.classification;

    if (safety.classification === "immediate-danger") {
      return {
        safetyClassification,
        halted: true,
        haltMessage: safety.userMessage,
        facts,
        answeredIds,
        matchedClaimTypes: [],
        intakeComplete: false,
      };
    }

    if (safety.classification === "distress") {
      distressAcknowledgment = safety.userMessage;
    }

    const extracted = await extractIntakeFacts(newStoryText, apiKey);
    facts = mergeFacts(facts, extracted);

    const match = matchClaimType(newStoryText, CLAIM_TYPES);
    matchedClaimTypes = match ? [match] : [];
  }

  const remainingIds = selectQuestions(facts, answeredIds, questionBank);
  const nextQuestion = remainingIds.length > 0 ? questionBank.find((q) => q.id === remainingIds[0]) : undefined;

  if (!nextQuestion) {
    return {
      safetyClassification,
      halted: false,
      distressAcknowledgment,
      facts,
      answeredIds,
      matchedClaimTypes,
      intakeComplete: true,
    };
  }

  const voiceTurn = await composeVoiceTurn(facts, nextQuestion, apiKey);

  return {
    safetyClassification,
    halted: false,
    distressAcknowledgment,
    facts,
    answeredIds,
    matchedClaimTypes,
    nextQuestion,
    voiceTurn,
    intakeComplete: false,
  };
}
