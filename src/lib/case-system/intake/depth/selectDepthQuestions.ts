/**
 * Selects which depth questions to ask for a confirmed claim type.
 *
 * PURE. No AI, no network. Every decision about WHICH questions are asked is
 * deterministic and inspectable; the only model involvement in the depth phase
 * is the voice lead-in, which never authors question text.
 *
 * Order of operations, and each step's reason:
 *
 *   1. Walk plaintiffElements in the claim type's own order. Ordering by
 *      element position, never by importance — ranking elements by importance
 *      to THIS case would be assessment (CLAUDE.md section 3).
 *   2. noQuestionNeeded  -> skip, element left not-yet for the readiness gate.
 *   3. unauthored        -> skip, degrades to attestation (today's behaviour).
 *   4. status !== reviewed -> skip. An unreviewed question is structurally
 *      unaskable; this reuses selectQuestions.ts's existing convention rather
 *      than inventing a second gate.
 *   5. alreadyCovered    -> suppress, and record the element as PROVIDED with
 *      the user's matching words attached.
 *   6. budget            -> ask at most MAX_ASKED. Overflow is NOT dropped:
 *      it stays not-yet and the readiness section surfaces it.
 */

import type { PlaintiffElement } from "../claimTypes";
import { isAlreadyCovered } from "./alreadyCovered";
import {
  isNoQuestionNeeded,
  questionsForElement,
  type DepthQuestion,
} from "./elementQuestionRegistry";
import { fillSlots, type SlotValues } from "./slots";
import {
  createElementStateMap,
  recordCoveredByStory,
  type ElementStateMap,
} from "./elementStateMap";

/**
 * Hard ceiling on questions ASKED, not authored (design section 6).
 *
 * Guided intake already runs ~15 questions. An unbounded second phase would
 * roughly double a flow users already complete under effort, and abandonment
 * produces worse drafts than asking nothing.
 */
export const MAX_ASKED = 5;

export type DepthSelectionInput = {
  elements: PlaintiffElement[];
  /** Every piece of the user's own verbatim text the pipeline holds. */
  userTexts: string[];
  slotValues: SlotValues;
};

export type SelectedDepthQuestion = {
  question: DepthQuestion;
  elementId: string;
  /** Slot-substituted text, ready to show. Never model-authored. */
  renderedText: string;
  /** Slots that fell back to their neutral default, for the harness. */
  defaultedSlots: string[];
};

export type DepthSelectionResult = {
  asked: SelectedDepthQuestion[];
  /** Elements whose question was suppressed because the story covered it. */
  suppressed: { elementId: string; questionId: string; matchedTerms: string[]; matchedText?: string }[];
  /** Survived filtering but exceeded the budget. Still surfaced by readiness. */
  deferredToReadiness: { elementId: string; questionId: string }[];
  /** Elements with no authored question — attestation only. */
  unauthored: string[];
  /** Elements explicitly marked as needing no question. */
  noQuestionNeeded: string[];
  /**
   * The state map after suppression, with covered elements already PROVIDED.
   * The readiness gate reads this same map — one structure, not two.
   */
  stateMap: ElementStateMap;
};

export function selectDepthQuestions(input: DepthSelectionInput): DepthSelectionResult {
  let stateMap = createElementStateMap(
    input.elements.map((element) => ({ id: element.id, name: element.name })),
  );

  const asked: SelectedDepthQuestion[] = [];
  const suppressed: DepthSelectionResult["suppressed"] = [];
  const deferredToReadiness: DepthSelectionResult["deferredToReadiness"] = [];
  const unauthored: string[] = [];
  const noQuestionNeeded: string[] = [];

  for (const element of input.elements) {
    if (isNoQuestionNeeded(element.id)) {
      noQuestionNeeded.push(element.id);
      continue;
    }

    const candidates = questionsForElement(element.id).filter(
      (question) => question.status === "reviewed",
    );

    if (candidates.length === 0) {
      unauthored.push(element.id);
      continue;
    }

    for (const question of candidates) {
      const coverage = isAlreadyCovered({
        userTexts: input.userTexts,
        coveredWhenMentioned: question.coveredWhenMentioned,
      });

      if (coverage.covered) {
        suppressed.push({
          elementId: element.id,
          questionId: question.id,
          matchedTerms: coverage.matchedTerms,
          matchedText: coverage.matchedText,
        });

        // Suppressed means the user DID state it — so the element is provided,
        // carrying their words, so a wrong suppression is visible and fixable.
        stateMap = recordCoveredByStory(stateMap, {
          elementId: element.id,
          questionId: question.id,
          matchedText: coverage.matchedText || "",
        });
        continue;
      }

      if (asked.length >= MAX_ASKED) {
        // Budget reached. Deferred, never silently dropped: the element stays
        // not-yet and the readiness section still surfaces it.
        deferredToReadiness.push({ elementId: element.id, questionId: question.id });
        continue;
      }

      const filled = fillSlots(question.text, input.slotValues);

      asked.push({
        question,
        elementId: element.id,
        renderedText: filled.text,
        defaultedSlots: filled.defaulted.map((entry) => entry.slot),
      });
    }
  }

  return {
    asked,
    suppressed,
    deferredToReadiness,
    unauthored,
    noQuestionNeeded,
    stateMap,
  };
}

/**
 * Recognises an "I don't know" style answer.
 *
 * PROPERTY 4: this resolves the element to cannot-provide — a recorded
 * absence, not a gap to re-ask. Pure and conservative: it matches only clear
 * statements of not knowing or not having, so a substantive answer that
 * happens to contain "don't" is not misread as an absence.
 */
const UNKNOWN_PATTERNS = [
  /\bi don'?t know\b/i,
  /\bi do not know\b/i,
  /\bnot sure\b/i,
  /\bno idea\b/i,
  /\bcan'?t remember\b/i,
  /\bcannot remember\b/i,
  /\bdon'?t remember\b/i,
  /\bi don'?t have (that|it|any|anything)\b/i,
  /\bi do not have (that|it|any|anything)\b/i,
  /\bnothing (like that|in writing)\b/i,
  /\bunsure\b/i,
];

export function isUnknownAnswer(answerText: string): boolean {
  const text = (answerText || "").trim();
  if (text.length === 0) return false;
  return UNKNOWN_PATTERNS.some((pattern) => pattern.test(text));
}
