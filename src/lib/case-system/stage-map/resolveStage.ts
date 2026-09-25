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
export const CONFIDENCE_FLOOR = 0.7;

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
      return `- ${stage.id} (${stage.side})\n    ${stage.description}\n${boundaries}`;
    })
    .join("\n");
}

export const STAGE_RESOLVER_SYSTEM = `You work out where an Ontario Small Claims Court case currently stands.

You are given everything known about the case and a list of stages. Reason about it as carefully as you like — your reasoning is recorded but never shown to the user.

Then return ONE stage id from the list, and nothing else. You do not write anything the user reads. The words they see are already written and checked; your only job is to say which position they are in.

RULES
1. Return a stage id EXACTLY as it appears in the list. Never invent one.
2. Each stage lists what separates it from its neighbours. If you cannot tell which side of that line this case falls on, say so with a LOW confidence and name the other stage in alternativeStageId. Do not guess.
3. confidence is 0 to 1. Use it honestly. A confident wrong answer sends somebody procedural steps for a position they are not in; an unsure answer costs one more question.
4. If this is not an Ontario Small Claims matter at all — a family, criminal, immigration or tribunal matter, or a dispute outside Ontario — set outOfScope true.
5. Absence of information is not evidence. If nothing says a defence was filed, that does not mean none was.

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
