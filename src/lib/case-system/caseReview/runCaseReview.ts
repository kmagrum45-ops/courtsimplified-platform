/**
 * One case review: deterministic findings always, AI-located findings when the
 * scope switch is on and the model is available. Pure apart from the injected
 * locator, so the suite runs it offline.
 */

import { isInScope } from "../policy/a2iScope";
import { caseFileText, deterministicFindings, type CaseReviewFinding, type ConfirmedCaseFile } from "./caseReview";
import { locateCaseReviewFindings } from "./caseReviewModel";

/** A record longer than this is reviewed deterministically only. */
export const MAX_REVIEW_TEXT_CHARS = 20_000;

export type CaseReviewResult = {
  findings: CaseReviewFinding[];
  /** False when the AI half did not run or failed -- shown so nothing implies a full read happened. */
  aiRan: boolean;
};

export async function runCaseReview(
  file: ConfirmedCaseFile,
  apiKey: string | null,
  locate: typeof locateCaseReviewFindings = locateCaseReviewFindings,
): Promise<CaseReviewResult> {
  const fixed = deterministicFindings(file);
  if (!isInScope("caseReviewGaps") || !apiKey) return { findings: fixed, aiRan: false };

  const text = caseFileText(file);
  if (!text || text.length > MAX_REVIEW_TEXT_CHARS) return { findings: fixed, aiRan: false };

  try {
    const located = await locate(file, apiKey);
    return { findings: [...fixed, ...located], aiRan: true };
  } catch {
    return { findings: fixed, aiRan: false };
  }
}
