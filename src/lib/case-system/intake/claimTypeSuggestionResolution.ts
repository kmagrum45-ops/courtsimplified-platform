/**
 * Resolves what happens after claimTypeAiClassifier.ts suggests a claim
 * type -- the confirm/reject half of the suggest-never-decide flow
 * orchestrateIntakeTurn.ts starts (see its `suggestedClaimType` doc
 * comment). Deliberately separate from a normal intake turn: confirming
 * or rejecting a suggestion doesn't re-run the safety pass, extraction,
 * or question selection -- it only resolves the one pending claim-type
 * suggestion, using the same real story text the suggestion was made
 * against.
 *
 * "Reject" gets exactly one AI-assisted retry, not an open-ended loop --
 * the caller passes `priorRejectedIds` (empty on the first rejection);
 * once it's non-empty, this function refuses a second retry and returns
 * "no-match" outright rather than calling the AI again, so a user (or a
 * malicious client bypassing the UI) cannot force unbounded reclassification
 * calls by repeatedly rejecting. This mirrors the task's own instruction:
 * one more attempt, then an honest "we don't have a specific match for
 * this yet" rather than looping indefinitely.
 */

import { classifyClaimTypeWithAi, type ClaimTypeAiSuggestion } from "./claimTypeAiClassifier";
import { buildEvidenceCategoryGuidance, type EvidenceGuidance } from "./evidenceGapDetector";
import { buildClaimGuidance, type ClaimGuidance } from "./claimGuidance";
import type { ClaimType } from "./claimTypes";
import type { IntakeFacts } from "./selectQuestions";

export type ClaimTypeSuggestionResolution =
  | {
      outcome: "confirmed";
      claimType: { claimTypeId: string; claimTypeName: string };
      evidenceGuidance: EvidenceGuidance;
      claimGuidance: ClaimGuidance;
    }
  | { outcome: "revised"; suggestedClaimType: ClaimTypeAiSuggestion }
  | { outcome: "no-match" };

/**
 * `claimTypeId` is the suggestion currently being acted on (confirmed, or
 * rejected). `priorRejectedIds` is every id already rejected earlier in
 * this same suggestion cycle -- empty on the very first rejection, and
 * capped at one retry (see file header).
 */
export async function resolveClaimTypeSuggestion(
  action: "confirm" | "reject",
  storyText: string,
  claimTypes: readonly ClaimType[],
  facts: IntakeFacts,
  apiKey: string,
  claimTypeId: string,
  priorRejectedIds: readonly string[] = [],
): Promise<ClaimTypeSuggestionResolution> {
  if (action === "confirm") {
    const claimType = claimTypes.find((candidate) => candidate.id === claimTypeId);
    if (!claimType) return { outcome: "no-match" };

    return {
      outcome: "confirmed",
      claimType: { claimTypeId: claimType.id, claimTypeName: claimType.name },
      evidenceGuidance: buildEvidenceCategoryGuidance(claimType),
      claimGuidance: buildClaimGuidance(claimType, facts),
    };
  }

  // action === "reject"
  if (priorRejectedIds.length > 0) {
    // Already used the one retry this cycle allows -- stop here.
    return { outcome: "no-match" };
  }

  const revised = await classifyClaimTypeWithAi(storyText, claimTypes, apiKey, [
    ...priorRejectedIds,
    claimTypeId,
  ]);

  return revised ? { outcome: "revised", suggestedClaimType: revised } : { outcome: "no-match" };
}
