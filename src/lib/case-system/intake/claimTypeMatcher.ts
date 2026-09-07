/**
 * Claim-type matcher -- promotes Session 3's proof-script `matchClaimType`
 * out of scripts/proofs/ into real, reusable code. Same logic, not a
 * redesign: plain keyword overlap against claimTypes.ts's `signals`
 * field, which is itself annotated "No AI here -- just data." This
 * function honors that literally -- no AI, no network, pure string
 * matching, already proven correct in Session 3's proof.
 *
 * Does not gate question selection -- that remains exclusively
 * selectQuestions.ts's job, driven by `disputeCategory` via
 * questionBank.ts's `appliesWhen`. This exists to identify which claim
 * type a story resembles, for surfacing education/remedy content later
 * (not built yet).
 *
 * Note, not acted on here (would be a redesign, not a promotion): unlike
 * selectQuestions.ts, this has no built-in `status === "reviewed"` gate.
 * Every ClaimType is currently "draft," same as QUESTION_BANK once was --
 * if matched claim-type content is ever shown directly to a user, a
 * future session should decide whether this needs the same structural
 * gate selectQuestions.ts has, the way sc-safety-check's accidental
 * removal motivated adding one there.
 */

import type { ClaimType } from "./claimTypes";

export type ClaimTypeMatch = {
  claimType: ClaimType;
  matchedSignals: string[];
};

/**
 * Case-insensitive substring match of each claim type's `signals` against
 * the given text. Returns the best match (most matched signals), or null
 * if nothing matched. A later claim type only replaces the current best
 * on a strictly greater match count, so ties go to whichever claim type
 * appears first in `claimTypes`.
 */
export function matchClaimType(
  storyText: string,
  claimTypes: readonly ClaimType[],
): ClaimTypeMatch | null {
  const lowerStory = storyText.toLowerCase();
  let best: ClaimTypeMatch | null = null;

  for (const claimType of claimTypes) {
    const matchedSignals = claimType.signals.filter((signal) => lowerStory.includes(signal.toLowerCase()));
    if (matchedSignals.length > 0 && (!best || matchedSignals.length > best.matchedSignals.length)) {
      best = { claimType, matchedSignals };
    }
  }
  return best;
}
