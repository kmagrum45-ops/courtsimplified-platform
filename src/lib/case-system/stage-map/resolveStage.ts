/**
 * PART 5 — working out where a case actually is, at runtime.
 *
 * *** WHAT THIS REPLACES ***
 *
 * `inferStage`, which decided by `text.includes("defendant")`, and
 * `getStageForPersistence`, which fell back to `"starting-case"` when nothing
 * matched. Between them they gave eight of ten realistic stories the same
 * answer — "file a Defence within 20 days" — including to a defendant who
 * already had default judgment signed against them.
 *
 * The fallback was the worse half. A default is a confident answer given
 * without evidence, and it is how a person past default got told how to begin.
 *
 * *** THE MODEL REASONS; IT DOES NOT WRITE ***
 *
 * It receives the full case context and the stage map, reasons as freely as it
 * likes, and returns a STAGE ID from a fixed list. Nothing it writes reaches a
 * user. The words come from the published library, which went through the
 * drafter, the verifier and the code gates long before this call happened.
 *
 * Its reasoning IS captured — to `ai_call_log`, where a regulator can read why
 * a case was placed where it was. Logged, never shown. That is the design
 * principle exactly: reason deeply in private, answer only from verified content.
 *
 * *** THREE WAYS TO SAY "WE ARE NOT SURE", AND ALL OF THEM ARE REAL ANSWERS ***
 *
 *   the id is not in the stage map        -> UNKNOWN
 *   confidence below the floor            -> UNKNOWN, with the question that
 *                                            would settle it
 *   two candidates it cannot separate     -> UNKNOWN, with the recorded
 *                                            boundary between them
 *
 * The clarifying question is never written by the model. It comes from the
 * stage map's `distinguishedFrom`, which every citation in is verified against
 * the vendored corpus.
 *
 * *** IT SUGGESTS. IT DOES NOT DECIDE. ***
 *
 * The result is a suggestion the user confirms (CLAUDE.md §4). Nothing is
 * persisted, and no content is shown as settled, until they do.
 */

import { CASE_STAGES, findStage, isSpecialStage, type CaseStage } from "./stageMap";
import { clarifyingQuestionsFor, distinguishingQuestion } from "./stageMessages";

/**
 * Below this, we say we do not know.
 *
 * Deliberately high. The cost of a wrong stage is procedural guidance for
 * somebody else's position — the exact failure Part 0 documented — and the
 * cost of UNKNOWN is one more question. Those are not close.
 */
/*
 * *** 0.85, AND THIS NUMBER IS CALIBRATED RATHER THAN CHOSEN ***
 *
 * It was 0.7, picked a priori. The first eval runs then measured what the
 * model actually does, and the separation was clean:
 *
 *   stories it should have declined     0.80, every one
 *   stories with the fact plainly stated 0.90
 *
 * That is the model applying the distinction rule 5a asks for — 0.80 when it
 * is INFERRING the separating fact, 0.90 when the story states it — and
 * expressing it consistently. A floor of 0.7 sat below both, so it caught
 * nothing.
 *
 * *** THE HONEST CAVEAT ***
 *
 * A threshold set between two clusters in a 45-story sample is fitted to that
 * sample. If the model changes, or its calibration drifts, this number is
 * wrong and nothing will announce it. `npm run eval:accuracy` is what checks:
 * the overconfidence target is zero, so drift shows up as a failure rather
 * than as quietly worse answers.
 *
 * Raising it further is cheap in the right direction — the cost of UNKNOWN is
 * one more question, and the cost of a confident wrong stage is somebody
 * following another party's instructions for a week.
 */
export const CONFIDENCE_FLOOR = 0.85;

export type StageResolution =
  | {
      kind: "suggested";
      stageId: string;
      confidence: number;
      /** Shown so the user can see what we based it on, and disagree. */
      because: string;
      /** The next most likely, when there was one. Offered as an alternative. */
      alternative?: { stageId: string; question: string };
    }
  | {
      kind: "unknown";
      /** Why we stopped, in our words — never the model's. */
      reason: "no-match" | "low-confidence" | "ambiguous" | "no-answer";
      /** The fact that would settle it, from the stage map. May be absent. */
      clarifyingQuestion?: string;
      candidates: string[];
    }
  | { kind: "out-of-scope" };

/** What the model is allowed to return. Anything else is treated as no answer. */
export type StageModelOutput = {
  stageId: string;
  confidence: number;
  /** Logged to ai_call_log, never rendered. */
  reasoning: string;
  /** Optional second candidate, for the ambiguity path. */
  alternativeStageId?: string;
  /** The model's read that this is not a Small Claims matter at all. */
  outOfScope?: boolean;
};

/**
 * The stage list the model chooses from, with what separates each from its
 * neighbours.
 *
 * The boundaries are included on purpose. A classifier given only descriptions
 * picks the one that sounds closest; given the DISTINGUISHING FACT it can
 * notice that it does not know which side of the line the case falls on — and
 * saying so is what we want.
 */
export function stageCatalogueForPrompt(): string {
  return CASE_STAGES.filter((stage) => !isSpecialStage(stage.id))
    .map((stage) => {
      const boundaries = stage.distinguishedFrom
        .map((entry) => `      vs ${entry.stage}: ${entry.by}`)
        .join("\n");

      /*
       * WHOSE POSITION THIS IS, stated before anything else.
       *
       * The first eval run missed three stories by picking the opposite
       * side's twin: "he was served last Tuesday" from a PLAINTIFF was read
       * as defendant:served-defence-period-running.
       *
       * The cause was my stage descriptions. They are written from an
       * observer's view — "The defendant has been served and the time to
       * deliver a defence has not yet run out" — so a classifier matching on
       * words sees "defendant" and "served" and picks the defendant stage.
       * The `side` field was in the line already and was losing to the prose.
       *
       * Saying it as a sentence about the READER puts the decisive fact in
       * the same register as the story it is being matched against.
       */
      const whose =
        stage.side === "both"
          ? "THE READER IS ON EITHER SIDE."
          : `THE READER IS THE ${stage.side.toUpperCase()}.`;

      return `- ${stage.id}\n    ${whose} ${stage.description}\n    They are asking: ${stage.userQuestion}\n${boundaries}`;
    })
    .join("\n");
}

export const STAGE_RESOLVER_SYSTEM = `You work out where an Ontario Small Claims Court case currently stands.

You are given everything known about the case and a list of stages. Reason about it as carefully as you like — your reasoning is recorded but never shown to the user.

Then return ONE stage id from the list, and nothing else. You do not write anything the user reads. The words they see are already written and checked; your only job is to say which position they are in.

RULES
1. Return a stage id EXACTLY as it appears in the list. Never invent one.
2. Each stage lists what separates it from its neighbours. If you cannot tell which side of that line this case falls on, say so with a LOW confidence and name the other stage in alternativeStageId. Do not guess.
3. confidence is 0 to 1, and it has a MEANING. Use this scale exactly:
     0.9 to 1.0  the story STATES the fact that separates this stage from its neighbours, in so many words
     0.5 to 0.8  the fact is implied but not stated — you are reading between the lines
     0.0 to 0.4  you are inferring from what was NOT said, or several stages fit equally
   Only the top band results in the person being shown procedural steps. The middle band is not a weaker yes, it is a no with a reason: we ask them one more question instead. Do not compress everything into 0.8 and 0.9 — the difference between "she told me a defence arrived" and "she didn't mention a defence" is the whole decision.
4. If this is not an Ontario Small Claims matter at all — a family, criminal, immigration or tribunal matter, or a dispute outside Ontario — set outOfScope true.
5. Absence of information is not evidence, and this is the commonest way to get it wrong. If nothing says a defence was filed, that does not mean none was. If nothing says the claim was served, that does not mean it was not. "The claim went in a while back" tells you it was filed and NOTHING about what happened next — that is a low confidence, not a claim sitting unserved.
5a. THE TEST FOR CONFIDENCE. Each stage lists what separates it from its neighbours. Before answering above 0.7, check that the story actually STATES that separating fact. If it does not — if you are inferring it from what the person did not mention — your confidence must be below 0.7 and you must name the neighbour in alternativeStageId. "They served him ages ago and I'm not sure where things are at" does not say whether a defence came, so it cannot be answered confidently either way.
6. A VAGUE STORY IS NOT AN EARLY STORY. When someone says little — "I need help with my court case", "there is a court thing with my neighbour" — that tells you they did not explain, not that nothing has happened. Do NOT fall back on the earliest or most general stage. Use a low confidence and say what you would need to know.
7. Work out WHOSE side the reader is on before anything else. "He was served last week" from someone suing is a plaintiff waiting; the same words from someone being sued are a defendant's deadline running. Each stage says which side the reader is on. Getting this backwards sends a person the other party's instructions.
9. SCOPE IS DECIDED BEFORE YOU ARE CALLED, by a separate classifier. Assume this is a Small Claims matter. Set outOfScope true only as a backstop, when the subject plainly belongs elsewhere and the classifier has evidently let it through — a tenancy dispute (eviction, a notice to end a tenancy, rent under a current tenancy, repairs, tenancy rights), custody or support, human rights, employment standards, criminal charges, immigration, or a dispute outside Ontario.
   A MONEY CLAIM IS NOT A TENANCY DISPUTE. A claim for property damage, or a debt, between people who happen to be a landlord and a tenant is an ordinary Small Claims matter. Judge the subject, never a noun in the story.
8. Do not compute DATES — no counting days to a deadline, no working out when a period expires. A separate part of the system does that from the rules. You MAY make the coarse judgment a person would make without a calendar: "six weeks ago" is plainly more than twenty days, "yesterday" is plainly within them. That is reading the story, not doing arithmetic.

Reply with JSON only:
{"stageId": "...", "confidence": 0.0, "reasoning": "...", "alternativeStageId": "..." (optional), "outOfScope": false}`;

/**
 * Turns what the model returned into what we will act on.
 *
 * Pure, so the whole decision can be tested without a model: every path below
 * is reachable from a plain object, and the suite drives them directly.
 */
export function resolveFromModelOutput(
  output: StageModelOutput | null,
): StageResolution {
  if (!output) {
    return { kind: "unknown", reason: "no-answer", candidates: [] };
  }

  if (output.outOfScope) return { kind: "out-of-scope" };

  const stage = findStage(output.stageId);

  /*
   * An id that is not in the map is not a near miss to be repaired.
   *
   * Snapping it to the closest stage would be inventing an answer on the
   * model's behalf, which is the whole failure being replaced here.
   */
  if (!stage || isSpecialStage(stage.id)) {
    return { kind: "unknown", reason: "no-match", candidates: [] };
  }

  const alternative = output.alternativeStageId
    ? findStage(output.alternativeStageId)
    : undefined;

  const confidence = Number.isFinite(output.confidence) ? output.confidence : 0;

  if (confidence < CONFIDENCE_FLOOR) {
    const candidates = [stage.id, alternative?.id].filter(Boolean) as string[];
    return {
      kind: "unknown",
      reason: alternative ? "ambiguous" : "low-confidence",
      clarifyingQuestion:
        (alternative ? distinguishingQuestion(stage.id, alternative.id) : undefined) ??
        clarifyingQuestionsFor(candidates)[0],
      candidates,
    };
  }

  return {
    kind: "suggested",
    stageId: stage.id,
    confidence,
    because: stage.description,
    alternative:
      alternative && alternative.id !== stage.id
        ? {
            stageId: alternative.id,
            question:
              distinguishingQuestion(stage.id, alternative.id) ??
              `whether this is instead: ${alternative.description}`,
          }
        : undefined,
  };
}

/** The stage a resolution settles on, or null where we declined to say. */
export function resolvedStage(resolution: StageResolution): CaseStage | null {
  return resolution.kind === "suggested" ? findStage(resolution.stageId) ?? null : null;
}
