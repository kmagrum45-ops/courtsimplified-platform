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
 *
 * Session 10 adds `possibleCorrections`: the Session 9 proof surfaced a
 * real gap in mergeFacts()'s never-overwrite protection -- it correctly
 * blocks an accidental conflict, but had no way to let a genuine
 * correction through either. This still doesn't let one through (the old
 * confirmed value remains the active fact this turn, unconditionally) --
 * it distinguishes a direct, confident restatement ("I filed it last
 * week") from an incidental or hedged one ("I was going to file but
 * haven't decided") via `extractIntakeFactsWithConfidence()`'s
 * `directFields`, and only the former gets flagged as a possible
 * correction for a caller to eventually re-ask about. No re-asking flow
 * exists yet -- that's UI/conversation-design work for later.
 */

import { runSafetyPass, type SafetyClassification } from "./safetyPass";
import { extractIntakeFactsWithConfidence } from "./extractIntakeFacts";
import { matchClaimType, type ClaimTypeMatch } from "./claimTypeMatcher";
import { classifyClaimTypeWithAi, type ClaimTypeAiSuggestion } from "./claimTypeAiClassifier";
import { CLAIM_TYPES, type ClaimType } from "./claimTypes";
import { detectEvidenceGaps, type EvidenceGuidance } from "./evidenceGapDetector";
import { buildClaimGuidance, type ClaimGuidance } from "./claimGuidance";
import { selectQuestions, type IntakeFacts } from "./selectQuestions";
import { QUESTION_BANK, type CourtArea, type IntakeQuestion, type KnownFactField } from "./questionBank";
import { composeVoiceTurn, type VoiceTurn } from "./voiceLayer";

// Session 30: a sane upper bound on a single question's captured raw
// answer text, independent of MAX_STORY_TEXT_LENGTH (guided-turn/route.ts),
// which bounds the whole turn's newStoryText, not one stored fact value.
const MAX_CAPTURED_ANSWER_LENGTH = 1_000;

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
  /**
   * Session 37 (commit f034748's follow-up). Set only when
   * matchClaimType() found nothing this turn AND the AI fallback
   * (claimTypeAiClassifier.ts) found a candidate. This is a SUGGESTION,
   * not a match -- deliberately excluded from matchedClaimTypes, and
   * evidenceGuidance/claimGuidance are NOT computed for it. A caller
   * must run it through an explicit user confirmation step (see
   * app/api/intake/classify-claim-type/route.ts) before treating it as
   * the retained claim type anywhere -- same suggest-never-decide
   * pattern as every other AI-generated suggestion in this codebase.
   * Turn-scoped, same caveat as matchedClaimTypes above.
   */
  suggestedClaimType?: ClaimTypeAiSuggestion;
  /**
   * Session 22. General evidence-category guidance for the claim type
   * matched THIS turn (see matchedClaimTypes above) -- absent whenever
   * matchedClaimTypes is empty, same turn-scoping and the same caveat: a
   * caller wanting this evaluated against a later turn's text (e.g. the
   * user's actual answer to "what evidence do you have," which often
   * won't itself contain fresh claim-matching signals) needs to retain
   * the last matched claim type themselves and call
   * evidenceGapDetector.ts's detectEvidenceGaps() directly against it --
   * exactly the pattern already established for matchedClaimTypes.
   */
  evidenceGuidance?: EvidenceGuidance;
  /**
   * Session 32. General education-topic and remedy guidance for the claim
   * type matched THIS turn (see matchedClaimTypes above) -- same
   * turn-scoping and caveat as evidenceGuidance directly above: a caller
   * wanting this evaluated against a later turn needs to retain the last
   * matched claim type (and current facts) itself and call
   * claimGuidance.ts's buildClaimGuidance() directly, the same pattern
   * already established for matchedClaimTypes/evidenceGuidance.
   */
  claimGuidance?: ClaimGuidance;
  /** Absent when intake is complete or the turn halted. */
  nextQuestion?: IntakeQuestion;
  /** Absent when there's no nextQuestion. */
  voiceTurn?: VoiceTurn;
  /** True once selectQuestions() has nothing left to ask. */
  intakeComplete: boolean;
  /**
   * Session 10. Facts where new extraction directly, confidently
   * contradicted an already-confirmed value this turn. The OLD value is
   * still what's active in `facts` above -- this is visibility only, not
   * an automatic correction. Always empty when no newStoryText was given.
   * Re-asking the user to confirm which value is right is future UI/
   * conversation-design work, not built this session.
   */
  possibleCorrections: PossibleCorrection[];
};

export type PossibleCorrection = {
  field: KnownFactField;
  oldValue: string | number | boolean;
  newValue: string | number | boolean;
};

/**
 * The merge rule, with correction detection layered on top -- still never
 * silently overwrites a fact already present in `current`; that core
 * protection from Session 9 is unchanged. New behavior: when the new
 * extraction disagrees with an already-confirmed value AND that field was
 * flagged as a direct, confident assertion (not an incidental or hedged
 * mention), it's recorded as a possible correction instead of being
 * silently discarded. The old value still wins as the active fact this
 * turn either way -- distinguishing "the user is telling us something
 * changed" from "this happened to come up in passing" only changes
 * whether it's flagged for a future confirmation step, not whether it's
 * applied now.
 */
function mergeFacts(
  current: IntakeFacts,
  extracted: IntakeFacts,
  directFields: readonly KnownFactField[],
): { facts: IntakeFacts; possibleCorrections: PossibleCorrection[] } {
  const merged: IntakeFacts = { ...current };
  const possibleCorrections: PossibleCorrection[] = [];
  const directSet = new Set(directFields);

  for (const key of Object.keys(extracted) as KnownFactField[]) {
    const newValue = extracted[key];
    if (newValue === undefined) continue;
    const oldValue = merged[key];

    if (oldValue === undefined) {
      merged[key] = newValue;
      continue;
    }

    if (oldValue !== newValue && directSet.has(key)) {
      possibleCorrections.push({ field: key, oldValue, newValue });
    }
    // else: already present, either agrees or wasn't asserted directly --
    // left untouched either way.
  }

  return { facts: merged, possibleCorrections };
}

/**
 * One turn of intake, start to finish:
 *   1. If newStoryText is given: safety pass first. immediate-danger halts
 *      here -- nothing else below runs this turn.
 *   2. distress doesn't halt -- its fixed acknowledgment is carried in the
 *      result, and the turn continues.
 *   3. Extraction (with confidence) runs on newStoryText (when given),
 *      merged into facts via mergeFacts() -- never overwrites an
 *      already-known fact; a direct, confident contradiction is recorded
 *      in possibleCorrections instead of silently applied or discarded.
 *   4. claimTypeMatcher runs against newStoryText (when given) -- plain
 *      keyword data, no AI, doesn't affect question selection. When it
 *      matches, evidenceGapDetector.ts runs against the same newStoryText
 *      to produce evidenceGuidance (Session 22) -- also plain keyword
 *      data, no AI, and equally turn-scoped (see evidenceGuidance's own
 *      doc comment above) -- and claimGuidance.ts's buildClaimGuidance()
 *      runs against the matched claim type and the merged facts to
 *      produce claimGuidance (Session 32), same turn-scoping again.
 *      Session 37: when claimTypeMatcher finds nothing, claimTypeAiClassifier.ts
 *      gets one AI-assisted attempt against the same newStoryText. Its
 *      result is surfaced as `suggestedClaimType` only -- unlike an exact
 *      match, it never populates matchedClaimTypes and never triggers
 *      evidenceGuidance/claimGuidance in this same call, because it has
 *      not been confirmed by the user yet (see suggestedClaimType's own
 *      doc comment above).
 *   5. selectQuestions() picks the next question from the (possibly
 *      caller-supplied, e.g. a "reviewed" fixture) question bank.
 *   6. If there's a next question, composeVoiceTurn() wraps it. If not,
 *      the turn reports intake as complete.
 *
 * Session 16: `claimTypes` and `courtArea` are new optional parameters,
 * same backward-compatible pattern as `questionBank` above -- every
 * existing caller (the guided-turn route, the Session 9 proof script)
 * passes at most 5 positional arguments, so both default in unchanged.
 * This is infrastructure only: CLAIM_TYPES/QUESTION_BANK still hold only
 * Small Claims content. A future Family/Civil session supplies its own
 * bank/claim-types/courtArea here without touching this function again.
 *
 * Session 30: `answeredQuestionId` is a new, final optional parameter --
 * when the caller knows `newStoryText` is a direct answer to a specific
 * question (not free-form story text), it passes that question's id here.
 * If the question bank entry for that id declares a `capturesField`, the
 * raw `newStoryText` is stored verbatim into that fact field, alongside
 * (not instead of) the existing AI extraction step above. This is
 * deliberately NOT run through the AI extractor: which question was asked
 * and exactly what the user typed are both already known with certainty,
 * so there is nothing for an extractor to infer, and asking one would only
 * add cost and a chance of misreading text that's already verbatim.
 */
export async function orchestrateIntakeTurn(
  currentFacts: IntakeFacts,
  answeredIds: string[],
  newStoryText: string | undefined,
  apiKey: string,
  questionBank: readonly IntakeQuestion[] = QUESTION_BANK,
  claimTypes: readonly ClaimType[] = CLAIM_TYPES,
  courtArea: CourtArea = "small-claims",
  answeredQuestionId?: string,
): Promise<OrchestrateIntakeTurnResult> {
  let facts = currentFacts;
  let safetyClassification: SafetyClassification | undefined;
  let distressAcknowledgment: string | undefined;
  let matchedClaimTypes: ClaimTypeMatch[] = [];
  let suggestedClaimType: ClaimTypeAiSuggestion | undefined;
  let possibleCorrections: PossibleCorrection[] = [];
  let evidenceGuidance: EvidenceGuidance | undefined;
  let claimGuidance: ClaimGuidance | undefined;

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
        possibleCorrections: [],
      };
    }

    if (safety.classification === "distress") {
      distressAcknowledgment = safety.userMessage;
    }

    const { facts: extracted, directFields } = await extractIntakeFactsWithConfidence(newStoryText, apiKey);

    const answeredQuestion = answeredQuestionId
      ? questionBank.find((question) => question.id === answeredQuestionId)
      : undefined;
    if (answeredQuestion?.capturesField) {
      const verbatimAnswer = newStoryText.trim().slice(0, MAX_CAPTURED_ANSWER_LENGTH);
      if (verbatimAnswer) {
        extracted[answeredQuestion.capturesField] = verbatimAnswer;
        directFields.push(answeredQuestion.capturesField);
      }
    }

    const merged = mergeFacts(facts, extracted, directFields);
    facts = merged.facts;
    possibleCorrections = merged.possibleCorrections;

    const match = matchClaimType(newStoryText, claimTypes);
    matchedClaimTypes = match ? [match] : [];
    if (match) {
      evidenceGuidance = detectEvidenceGaps(match.claimType, newStoryText);
      claimGuidance = buildClaimGuidance(match.claimType, facts);
    } else {
      suggestedClaimType = (await classifyClaimTypeWithAi(newStoryText, claimTypes, apiKey)) ?? undefined;
    }
  }

  const remainingIds = selectQuestions(facts, answeredIds, questionBank, courtArea);
  const nextQuestion = remainingIds.length > 0 ? questionBank.find((q) => q.id === remainingIds[0]) : undefined;

  if (!nextQuestion) {
    return {
      safetyClassification,
      halted: false,
      distressAcknowledgment,
      facts,
      answeredIds,
      matchedClaimTypes,
      suggestedClaimType,
      evidenceGuidance,
      claimGuidance,
      intakeComplete: true,
      possibleCorrections,
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
    suggestedClaimType,
    evidenceGuidance,
    claimGuidance,
    nextQuestion,
    voiceTurn,
    intakeComplete: false,
    possibleCorrections,
  };
}
