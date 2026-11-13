/**
 * A KIND OF CLAIM AS SHOWN ON ITS OWN COURT'S CASES: nothing in it points to another court's source (sourceCourt.ts;
 * Chrome check of #545, 9 Nov 2026, item 4: Small Claims evidence linked the Superior Court's civil guide).
 *
 * An element whose source is written for another court keeps its name and its evidence (what to gather), and loses its
 * link and its explanation: the explanation states what that source says, and shown without it would be unsourced
 * (CLAUDE.md s. 2). The catalogue itself is not changed; each screen that shows a kind reads it through here. A defence
 * whose source is another court's is not shown.
 */
import { sourceFitsCourt } from "../../content-library/sourceCourt";
import type { ClaimType, DefenceConcept } from "./claimTypes";

export function courtFitClaimType(claimType: ClaimType): ClaimType {
  const court = claimType.courtArea;
  if (claimType.plaintiffElements.every((element) => sourceFitsCourt(element.sourceUrl, court))) return claimType;
  return {
    ...claimType,
    plaintiffElements: claimType.plaintiffElements.map((element) =>
      sourceFitsCourt(element.sourceUrl, court) ? element : { ...element, sourceUrl: "", plainExplanation: "" },
    ),
  };
}

/** Whether a defence may be shown on a case in `court`. */
export function defenceFitsCourt(concept: DefenceConcept, court: string): boolean {
  return sourceFitsCourt(concept.sourceUrl, court);
}
