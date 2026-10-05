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
import { buildEvidenceCategoryGuidance, type EvidenceGuidance } from "./evidenceGapDetector";
import { buildClaimGuidance, type ClaimGuidance } from "./claimGuidance";
import { selectQuestions, type IntakeFacts } from "./selectQuestions";
import { QUESTION_BANK, type CourtArea, type IntakeQuestion, type KnownFactField } from "./questionBank";
import { composeVoiceTurn, type VoiceTurn } from "./voiceLayer";
import {
  confirmedAnswersAsText,
  conversationForProposals,
  proposableQuestions,
  type EarlierConversation,
  proposeAnswersFromStory,
  type ConfirmedStoryAnswer,
  type StoryAnswerProposal,
} from "./storyAnswerProposals";

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
  /**
   * 2026-09-28. Opening story, and (2026-10-05) every answer turn that sends
   * `earlier`: answers the conversation already gives to the questions that
   * would otherwise be asked, each tied to a verified quote
   * from the story. NOT applied: no question is marked answered and no fact
   * is set by these. The caller shows them to the user, who confirms, edits
   * or removes each, and sends the confirmed ones back through
   * applyConfirmedStoryAnswers(). Empty when there is nothing to propose or
   * the proposal call failed -- a failure here never blocks intake.
   */
  storyProposals: StoryAnswerProposal[];
  /**
   * 2026-09-28. True when the safety pass found the user asking for legal
   * advice ("do I have a case", "will I win") in text sent this turn. The
   * caller shows LegalAdviceDeflection -- fixed words plus the reviewed
   * referral list -- and the intake carries on. Civil, Family and the Small
   * Claims form already did this; the guided intake computed the flag and
   * dropped it (story review battery). Always false when no new text.
   */
  requestsLegalAdvice: boolean;
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
/**
 * Injectable dependencies, for verification harnesses only.
 *
 * Every field defaults to the real function, so production callers pass
 * nothing and behave exactly as before. This exists so the classifier-gating
 * suite can replay a real turn sequence without a billed call — the
 * alternative was a second copy of the turn loop, and the pipelineRunner
 * extraction lesson says a second copy drifts from the first.
 */
export type OrchestrateIntakeTurnOverrides = {
  runSafety?: typeof runSafetyPass;
  extractFacts?: typeof extractIntakeFactsWithConfidence;
  classifyClaimType?: typeof classifyClaimTypeWithAi;
  composeVoice?: typeof composeVoiceTurn;
  proposeAnswers?: typeof proposeAnswersFromStory;
  /**
   * Replays the pre-fix behaviour: resolve the claim type on EVERY turn
   * carrying new text, not just the opening story. Governs BOTH paths -- the
   * exact matcher and the AI classifier -- because both were last-wins and
   * both are now gated. Exists so the before/after tables come from one code
   * path rather than from a description of the old one. Never set outside the
   * verification suite.
   */
  resolveClaimTypeEveryTurn?: boolean;
};

export async function orchestrateIntakeTurn(
  currentFacts: IntakeFacts,
  answeredIds: string[],
  newStoryText: string | undefined,
  apiKey: string,
  questionBank: readonly IntakeQuestion[] = QUESTION_BANK,
  claimTypes: readonly ClaimType[] = CLAIM_TYPES,
  courtArea: CourtArea = "small-claims",
  answeredQuestionId?: string,
  overrides: OrchestrateIntakeTurnOverrides = {},
  /**
   * 2026-10-05. On an answer turn: the opening story and every earlier
   * answer, so the questions about to be asked are checked against all of it
   * (see EarlierConversation). Without it, an answer turn proposes nothing,
   * exactly as before.
   */
  earlier?: EarlierConversation,
): Promise<OrchestrateIntakeTurnResult> {
  const runSafety = overrides.runSafety || runSafetyPass;
  const extractFacts = overrides.extractFacts || extractIntakeFactsWithConfidence;
  const classifyClaimType = overrides.classifyClaimType || classifyClaimTypeWithAi;
  const composeVoice = overrides.composeVoice || composeVoiceTurn;
  const proposeAnswers = overrides.proposeAnswers || proposeAnswersFromStory;

  let facts = currentFacts;
  let safetyClassification: SafetyClassification | undefined;
  let distressAcknowledgment: string | undefined;
  let matchedClaimTypes: ClaimTypeMatch[] = [];
  let suggestedClaimType: ClaimTypeAiSuggestion | undefined;
  let possibleCorrections: PossibleCorrection[] = [];
  let requestsLegalAdvice = false;
  let evidenceGuidance: EvidenceGuidance | undefined;
  let claimGuidance: ClaimGuidance | undefined;

  /**
   * True only for the very first turn — the user's own narrative, before any
   * question has been answered. Every later turn answers a known question, so
   * `answeredQuestionId` is set.
   *
   * This gates BOTH claim-type paths below: the exact matcher and the AI
   * classifier. A claim type is settled by the story, never by an answer.
   */
  const isOpeningStory = !answeredQuestionId || overrides.resolveClaimTypeEveryTurn === true;

  // 2026-10-05. Before the next question is asked, read everything the person
  // has said so far for its answer. Started now, beside the safety pass and
  // the extraction, so it adds no wait; which questions it checks is worked
  // out from the facts as they stand plus this answer, and anything that is
  // no longer due once the turn is merged is dropped below.
  const earlierCheck =
    answeredQuestionId && earlier && newStoryText?.trim()
      ? checkEarlierAnswers({
          facts: currentFacts,
          answeredIds,
          answeredQuestionId,
          answerText: newStoryText,
          earlier,
          questionBank,
          courtArea,
          apiKey,
          proposeAnswers: overrides.proposeAnswers || proposeAnswersFromStory,
        })
      : null;

  if (newStoryText) {
    const safety = await runSafety(newStoryText, apiKey);
    safetyClassification = safety.classification;
    requestsLegalAdvice = safety.requestsLegalAdvice === true;

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
        storyProposals: [],
        // A halt shows only the safety message; nothing else competes with it.
        requestsLegalAdvice: false,
      };
    }

    if (safety.classification === "distress") {
      distressAcknowledgment = safety.userMessage;
    }

    const { facts: extracted, directFields } = await extractFacts(newStoryText, apiKey);

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

    // Session 48. The exact matcher is gated to the opening story too, by the
    // same rule as the AI classifier below.
    //
    // It was last-wins across turns exactly as the classifier was, and the
    // exposure is real rather than theoretical. Measured against the standard
    // question set:
    //
    //   "I have the unpaid invoice and the bank transfer."  -> debt/services
    //   "Texts where he admits he owes me money."           -> debt/services
    //
    // Either is an ordinary answer to sc-evidence-available, and either would
    // re-route a user whose opening story matched something else. A claim type
    // must be settled by the user's story, not by a phrase that happens to
    // appear in an answer about what documents they hold.
    const candidate = isOpeningStory ? matchClaimType(newStoryText, claimTypes) : null;
    // 2026-09-28. A match resting only on scattered content words is not
    // treated as settled. Live run: a customer whose contractor quit halfway
    // ("hired a guy... stopped showing up... hire someone else to finish...
    // I want my 2000 back") matched sc-claim-unpaid-debt-services -- the
    // CONTRACTOR's claim for payment -- on scattered words, and was treated
    // as confirmed with no confirmation step, so every downstream card was
    // written for the other side. Such a story now goes to the side-aware AI
    // classifier below, whose answer the user must confirm. A whole-phrase
    // match is unchanged.
    const match = candidate && candidate.exactPhraseMatched ? candidate : null;
    matchedClaimTypes = match ? [match] : [];
    if (match) {
      evidenceGuidance = buildEvidenceCategoryGuidance(match.claimType);
      claimGuidance = buildClaimGuidance(match.claimType, facts);
    } else if (isOpeningStory) {
      // Session 48. The AI classifier runs ONLY on the opening story.
      //
      // It used to run on every turn carrying new text, and callers retain the
      // last non-null suggestion, so the classification was last-wins. A
      // three-word answer, classified in isolation with no surrounding
      // context, could overwrite a classification derived from the user's
      // whole story.
      //
      // Measured: story 4 of the paraphrase set ("My cousin was short when his
      // car went in for work... I moved some money across to him"). Classified
      // on its own, that story yields
      // sc-claim-personal-loan-between-individuals. Its live run retained
      // sc-claim-unpaid-debt-services, because later answers -- "$3,500", "I
      // want my money back" -- were each classified alone and the last one
      // won. The user was routed by a fragment, not by their story.
      //
      // The opening story is the only turn that carries enough context to
      // classify. Answers are responses to a known question, and an answer
      // must never re-route the claim type.
      //
      // Side effect, and a large one: this removes a billed call from roughly
      // ten of the eleven turns in a typical journey.
      suggestedClaimType = (await classifyClaimType(newStoryText, claimTypes, apiKey)) ?? undefined;
    }
  }

  // 2026-09-28. On the opening story only (never on an answer, never under
  // the verification replay flag), propose answers to the questions that
  // would now be asked. Proposals are returned, never applied -- see
  // storyProposals' doc comment. A failure is swallowed: proposing is a
  // convenience, and the intake must continue exactly as before without it.
  let storyProposals: StoryAnswerProposal[] = [];
  if (earlierCheck) {
    const due = new Set(selectQuestions(facts, answeredIds, questionBank, courtArea));
    storyProposals = (await earlierCheck).filter((proposal) => due.has(proposal.questionId));
  }
  if (newStoryText && !answeredQuestionId) {
    const upcoming = selectQuestions(facts, answeredIds, questionBank, courtArea)
      .map((id) => questionBank.find((question) => question.id === id))
      .filter((question): question is IntakeQuestion => Boolean(question));
    const offered = proposableQuestions(upcoming);
    if (offered.length > 0) {
      try {
        storyProposals = await proposeAnswers(newStoryText, offered, apiKey);
      } catch {
        storyProposals = [];
      }
    }
  }

  return finishTurn({
    facts,
    answeredIds,
    questionBank,
    courtArea,
    apiKey,
    composeVoice,
    base: {
      safetyClassification,
      distressAcknowledgment,
      matchedClaimTypes,
      suggestedClaimType,
      evidenceGuidance,
      claimGuidance,
      possibleCorrections,
      storyProposals,
      requestsLegalAdvice,
    },
  });
}

/** How many of the questions about to be asked are checked against the conversation each turn. */
export const EARLIER_CHECK_LOOKAHEAD = 3;

/**
 * Proposals, from the whole conversation, for the next few questions. Never
 * throws: a failure means the question is simply asked.
 */
async function checkEarlierAnswers(args: {
  facts: IntakeFacts;
  answeredIds: string[];
  answeredQuestionId: string;
  answerText: string;
  earlier: EarlierConversation;
  questionBank: readonly IntakeQuestion[];
  courtArea: CourtArea;
  apiKey: string;
  proposeAnswers: typeof proposeAnswersFromStory;
}): Promise<StoryAnswerProposal[]> {
  try {
    const answered = args.questionBank.find((question) => question.id === args.answeredQuestionId);
    const facts: IntakeFacts = { ...args.facts };
    if (answered?.capturesField && !facts[answered.capturesField]) {
      facts[answered.capturesField] = args.answerText.trim().slice(0, MAX_CAPTURED_ANSWER_LENGTH);
    }
    const declined = new Set(args.earlier.declined);
    const upcoming = selectQuestions(facts, args.answeredIds, args.questionBank, args.courtArea)
      .filter((id) => !declined.has(id))
      .map((id) => args.questionBank.find((question) => question.id === id))
      .filter((question): question is IntakeQuestion => Boolean(question));
    const offered = proposableQuestions(upcoming).slice(0, EARLIER_CHECK_LOOKAHEAD);
    if (offered.length === 0) return [];
    const conversation = conversationForProposals(
      {
        ...args.earlier,
        answers: [
          ...args.earlier.answers.filter((item) => item.questionId !== args.answeredQuestionId),
          { questionId: args.answeredQuestionId, answerText: args.answerText },
        ],
      },
      args.questionBank,
    );
    return await args.proposeAnswers(conversation.transcript, offered, args.apiKey, {
      quoteFrom: conversation.userWords,
    });
  } catch {
    return [];
  }
}

type FinishTurnArgs = {
  facts: IntakeFacts;
  answeredIds: string[];
  questionBank: readonly IntakeQuestion[];
  courtArea: CourtArea;
  apiKey: string;
  composeVoice: typeof composeVoiceTurn;
  base: Pick<
    OrchestrateIntakeTurnResult,
    | "safetyClassification"
    | "distressAcknowledgment"
    | "matchedClaimTypes"
    | "suggestedClaimType"
    | "evidenceGuidance"
    | "claimGuidance"
    | "possibleCorrections"
    | "storyProposals"
    | "requestsLegalAdvice"
  >;
};

/** Picks the next question (or reports completion). Shared by both entry points. */
async function finishTurn({
  facts,
  answeredIds,
  questionBank,
  courtArea,
  apiKey,
  composeVoice,
  base,
}: FinishTurnArgs): Promise<OrchestrateIntakeTurnResult> {
  const {
    safetyClassification,
    distressAcknowledgment,
    matchedClaimTypes,
    suggestedClaimType,
    evidenceGuidance,
    claimGuidance,
    possibleCorrections,
    storyProposals,
    requestsLegalAdvice,
  } = base;
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
      storyProposals,
      requestsLegalAdvice,
    };
  }

  const voiceTurn = await composeVoice(facts, nextQuestion, apiKey);

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
    storyProposals,
    requestsLegalAdvice,
  };
}

/**
 * 2026-09-28. Applies the story answers the user CONFIRMED (after editing or
 * removing any) as if each question had been asked and answered.
 *
 * For each confirmed answer:
 *   - its question id is added to answeredIds, so it is not asked again;
 *   - a question with a capturesField stores the user's confirmed words
 *     verbatim, exactly as a typed answer would.
 * Structured facts (role, dispute category, filing status) come from one pass
 * of the existing extractor over the confirmed question-and-answer pairs --
 * the same path any typed answer takes -- merged with the never-overwrite
 * rule. No claim type is resolved here: the claim type is settled by the
 * opening story alone.
 *
 * Only ids that exist in the bank and are not in the sensitive phase are
 * accepted; anything else is ignored rather than trusted.
 */
export async function applyConfirmedStoryAnswers(
  currentFacts: IntakeFacts,
  answeredIds: string[],
  confirmed: readonly ConfirmedStoryAnswer[],
  apiKey: string,
  questionBank: readonly IntakeQuestion[] = QUESTION_BANK,
  courtArea: CourtArea = "small-claims",
  overrides: Pick<OrchestrateIntakeTurnOverrides, "extractFacts" | "composeVoice" | "proposeAnswers"> = {},
  /**
   * 2026-09-28. One more read of the opening story, for questions the
   * confirmations just made applicable. The story review battery: a dog-bite
   * story said "On September 3rd", but the injury-date question only applies
   * once the dispute is known to be an injury -- which the first
   * confirmations establish -- so it was never offered and was asked again.
   * `alreadyOffered` excludes every question shown in the first card, so a
   * question the user unticked is asked, never offered twice. The caller
   * sends this on the FIRST confirmation only, so there is at most one extra
   * card.
   */
  repropose?: { story: string; alreadyOffered: readonly string[] },
): Promise<OrchestrateIntakeTurnResult> {
  const extractFacts = overrides.extractFacts || extractIntakeFactsWithConfidence;
  const composeVoice = overrides.composeVoice || composeVoiceTurn;
  const proposeAnswers = overrides.proposeAnswers || proposeAnswersFromStory;

  const allowed = new Set(proposableQuestions(questionBank).map((question) => question.id));
  const accepted = confirmed
    .filter((item) => allowed.has(item.questionId))
    .map((item) => ({
      questionId: item.questionId,
      answerText: item.answerText.trim().slice(0, MAX_CAPTURED_ANSWER_LENGTH),
    }))
    .filter((item) => item.answerText.length > 0);

  let facts = currentFacts;
  let possibleCorrections: PossibleCorrection[] = [];
  const nextAnsweredIds = [...answeredIds];

  if (accepted.length > 0) {
    const text = confirmedAnswersAsText(accepted, questionBank);
    const { facts: extracted, directFields } = text
      ? await extractFacts(text, apiKey)
      : { facts: {} as IntakeFacts, directFields: [] as KnownFactField[] };

    for (const item of accepted) {
      const question = questionBank.find((candidate) => candidate.id === item.questionId);
      if (question?.capturesField) {
        extracted[question.capturesField] = item.answerText;
        directFields.push(question.capturesField);
      }
      if (!nextAnsweredIds.includes(item.questionId)) nextAnsweredIds.push(item.questionId);
    }

    const merged = mergeFacts(facts, extracted, directFields);
    facts = merged.facts;
    possibleCorrections = merged.possibleCorrections;
  }

  let storyProposals: StoryAnswerProposal[] = [];
  if (repropose && repropose.story.trim()) {
    const excluded = new Set([...repropose.alreadyOffered, ...nextAnsweredIds]);
    const upcoming = selectQuestions(facts, nextAnsweredIds, questionBank, courtArea)
      .filter((id) => !excluded.has(id))
      .map((id) => questionBank.find((question) => question.id === id))
      .filter((question): question is IntakeQuestion => Boolean(question));
    const offered = proposableQuestions(upcoming);
    if (offered.length > 0) {
      try {
        storyProposals = await proposeAnswers(repropose.story, offered, apiKey);
      } catch {
        storyProposals = [];
      }
    }
  }

  return finishTurn({
    facts,
    answeredIds: nextAnsweredIds,
    questionBank,
    courtArea,
    apiKey,
    composeVoice,
    base: {
      matchedClaimTypes: [],
      possibleCorrections,
      storyProposals,
      requestsLegalAdvice: false,
    },
  });
}
