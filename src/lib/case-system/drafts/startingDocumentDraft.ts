/**
 * A working draft of the document that STARTS a case — Plaintiff's Claim
 * (Small Claims Form 7A), Statement of Claim (civil Form 14A), Application
 * (family Form 8) — laid out from the user's intake answers.
 *
 * Moved out of the builder on 2026-10-04 so the case page's Drafts tab can
 * offer it too (page walkthrough: "the drafting page does not offer the
 * Statement of Claim draft previously advertised"). Who may be offered it, and
 * when, is decided by the callers through the same gates as before: drafting
 * in scope, form completion not paused, the starting document not already
 * filed, and the user not on the responding side.
 *
 * Every line is the user's own answer or a plain label; "Not entered" marks
 * what they have not given yet.
 */

import { userStory } from "../userStory";
import { draftSmallClaimsPlaintiffClaim, type ClaimDraftInput } from "../claimDraftEngine";
import { newId, type CaseDraft, type DraftSection } from "./caseDrafts";

export type StartingDocumentIntake = ClaimDraftInput & {
  extra?: Record<string, unknown>;
};

const STARTING_DOCUMENT: Record<string, { title: string; factsHeading: string }> = {
  "small-claims": { title: "Draft Plaintiff’s Claim (Form 7A)", factsHeading: "Facts" },
  civil: { title: "Draft Statement of Claim (Form 14A)", factsHeading: "Material facts" },
  family: { title: "Draft Family Application (Form 8)", factsHeading: "Facts for review" },
};

export function startingDocumentTitle(courtPath: string | null | undefined): string | null {
  return (courtPath && STARTING_DOCUMENT[courtPath]?.title) || null;
}

const part = (heading: string, lines: string[]): DraftSection => ({
  id: newId("part"),
  heading,
  text: lines.join("\n\n"),
  reviewed: false,
});

export function startingDocumentDraft(
  courtPath: string | null | undefined,
  intake: StartingDocumentIntake,
  now: Date,
): CaseDraft | null {
  const spec = courtPath ? STARTING_DOCUMENT[courtPath] : undefined;
  if (!spec) return null;
  const stamp = now.toISOString();

  if (courtPath === "small-claims") {
    const claim = draftSmallClaimsPlaintiffClaim(intake);
    return {
      id: newId("draft"),
      title: spec.title,
      kind: "starting-document",
      createdAt: stamp,
      updatedAt: stamp,
      sections: [
        part("Parties", claim.partySection),
        part("What you are asking for", claim.claimOverview),
        part("Facts", claim.numberedClaimFacts),
        part("Amount claimed", claim.damagesSection),
        part("Evidence to review", claim.evidenceSection),
      ],
    };
  }

  const extra = (intake.extra ?? {}) as Record<string, unknown>;
  const amount = String(extra.amountClaimed || extra.damagesBreakdown || "").trim();
  return {
    id: newId("draft"),
    title: spec.title,
    kind: "starting-document",
    createdAt: stamp,
    updatedAt: stamp,
    sections: [
      part("Parties", [`Applicant/Plaintiff: ${intake.yourName || "Not entered"}`, `Other party: ${intake.otherParty || "Not entered"}`]),
      part(spec.factsHeading, [userStory(intake) || "No facts entered yet."]),
      part("Requested outcome", [intake.goal || "No requested outcome entered yet."]),
      part("Amount and timeline", [amount ? `Amount entered: ${amount}` : "No amount entered.", intake.timeline || "No timeline entered yet."]),
      part("Evidence to review", [intake.evidence || "No evidence description entered yet."]),
    ],
  };
}
