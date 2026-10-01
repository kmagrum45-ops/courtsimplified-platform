/**
 * The two things we say when we will not name a stage.
 *
 * *** THESE ARE CONTENT, AND THEY ARE THE ONLY CONTENT IN THE STAGE MAP ***
 *
 * Everything else under stage-map/ is a model: ids, cues, boundaries,
 * citations. These two strings are read by users, so they are fixed wording,
 * never generated, and they state nothing about law — only that we do not
 * know, and where someone can go who does.
 *
 * *** WHY THE UNKNOWN MESSAGE NAMES THE MISSING FACT ***
 *
 * "We're not sure" on its own is a dead end. The stage map already records
 * what separates each stage from its neighbours, so when the classifier is
 * caught between two positions we can say exactly which fact would settle it —
 * "has a defence been filed?" — and let the user answer it. That turns a
 * refusal into the next useful question, which is the difference between
 * honest and useless.
 *
 * The question text comes from `distinguishedFrom`, which is checked by
 * `verifyStageMap`. It is not written by a model.
 */

import { REFERRAL_RESOURCES, type ReferralResource } from "@/src/lib/content-library/referralResources";

import { findStage } from "./stageMap";

/**
 * Shown when the case cannot be placed.
 *
 * It does not apologise at length, does not guess, and does not imply that
 * more typing will help. Part 0 found the old code defaulting to
 * "starting-case" in this situation, which told a defendant with a judgment
 * against them how to begin a claim.
 */
export const UNKNOWN_STAGE_MESSAGE =
  "We can't tell where your case is up to from what we have so far, and we'd " +
  "rather say that than guess — the next step is different at every stage, and " +
  "the wrong one can cost you a deadline. Answering the question below would " +
  "settle it. If you'd rather not, these services can help you work out where " +
  "you stand.";

/** Used when there is no single fact that would resolve the ambiguity. */
export const UNKNOWN_STAGE_MESSAGE_NO_QUESTION =
  "We can't tell where your case is up to from what we have so far, and we'd " +
  "rather say that than guess — the next step is different at every stage, and " +
  "the wrong one can cost you a deadline. These services can help you work out " +
  "where you stand.";

/**
 * Shown when a stage WAS identified but its answer cannot be shown.
 *
 * 2026-10-01 audit: these cases used UNKNOWN_STAGE_MESSAGE_NO_QUESTION, which
 * tells the reader we cannot tell where their case is. That was false — the
 * stage was resolved — and it sent people to work out something we knew. The
 * honest messages say what we do know and what we are missing.
 */
export const STAGE_SCOPE_UNCONFIRMED_MESSAGE =
  "We think we can see where your case is up to, but we can't yet confirm it " +
  "belongs in Small Claims Court, and the guidance for this step is written only " +
  "for that court. We'd rather say that than give you steps for the wrong court. " +
  "These services can help you confirm which court your matter belongs in.";

export const STAGE_ANSWER_UNAVAILABLE_MESSAGE =
  "We can see where your case is up to, but we don't have checked guidance for " +
  "this step yet, and we'd rather say that than give you something unchecked. " +
  "These services can help you with it.";

/**
 * Shown when the matter is not an Ontario Small Claims matter.
 *
 * Kept separate from `OUT_OF_SCOPE_MESSAGE` in referralResources.ts, which
 * describes the product's eventual three pathways. This one speaks for the
 * stage map, which models Small Claims only.
 */
export const OUT_OF_SCOPE_STAGE_MESSAGE =
  "This doesn't look like an Ontario Small Claims Court matter, so the steps " +
  "and deadlines we track don't apply to it. We'd rather tell you that than " +
  "give you guidance built for the wrong court. These services can point you " +
  "to the right place.";

/** The referrals shown with both messages. Real services, already sourced. */
export const STAGE_REFERRALS: readonly ReferralResource[] = REFERRAL_RESOURCES;

/**
 * The question that would separate two candidate stages.
 *
 * Returns the recorded distinguishing fact, or undefined where the stage map
 * does not record a boundary between those two. Undefined is answered with
 * UNKNOWN_STAGE_MESSAGE_NO_QUESTION rather than an invented question.
 */
export function distinguishingQuestion(
  candidateId: string,
  otherId: string,
): string | undefined {
  const candidate = findStage(candidateId);
  const recorded = candidate?.distinguishedFrom.find((entry) => entry.stage === otherId);
  if (recorded) return recorded.by;

  // Boundaries are recorded on one side or the other, not always both.
  const other = findStage(otherId);
  return other?.distinguishedFrom.find((entry) => entry.stage === candidateId)?.by;
}

/**
 * Every distinguishing fact among a set of candidate stages, most useful
 * first — a fact that separates more pairs resolves more of the ambiguity.
 */
export function clarifyingQuestionsFor(candidateIds: string[]): string[] {
  const counts = new Map<string, number>();

  for (const a of candidateIds) {
    for (const b of candidateIds) {
      if (a === b) continue;
      const question = distinguishingQuestion(a, b);
      if (question) counts.set(question, (counts.get(question) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .map(([question]) => question);
}
