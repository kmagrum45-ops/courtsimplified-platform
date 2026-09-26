/**
 * Licensee review tracking for every piece of legal or procedural content.
 *
 * THE STANDARD THIS SERVES: "Humans write the library; AI is the librarian."
 * The LSO A2I policy permits AI to select from human-reviewed content. It does
 * not permit AI to write legal content, and it does not treat content as
 * reviewed because a developer read it.
 *
 * *** WHY THIS IS SEPARATE FROM THE EXISTING `status`/`reviewedAt` FIELDS ***
 *
 * `questionBank.ts` and `educationTopics.ts` already carry
 * `status: "draft" | "reviewed"` and `reviewedAt`. Those record an INTERNAL
 * editorial pass — a developer checked the wording and the source link. Twenty
 * four questions are marked "reviewed" that way.
 *
 * None of them has been read by a licensed Ontario lawyer or paralegal.
 *
 * Reusing that field as "approved" would silently convert a developer's
 * proofread into a professional sign-off, and it would do so across ~160 items
 * in one commit. That is the single easiest way to tell the Law Society
 * something untrue, so licensee review is tracked in its own layer, keyed by
 * content id, and starts empty for everything.
 *
 * *** WHERE APPROVALS LIVE ***
 *
 * `approvals.json` in this directory, written by
 * `scripts/content/importReviewResults.ts` from a completed review packet.
 * A JSON file rather than a database table because the content it describes
 * lives in code catalogues: the approval and the thing approved should move
 * together through git, so a content edit and its stale approval collide in
 * review instead of diverging silently in production.
 */

import approvalsData from "./approvals.json";

/** What a licensee sign-off records. */
export type LicenseeApproval = {
  /** Content item id, matching the id in its own registry. */
  id: string;
  /**
   * The reviewing licensee, as name plus LSO number. Free text on purpose —
   * this file does not validate professional standing and must not imply it
   * has.
   */
  reviewedBy: string;
  /** ISO date of the sign-off. */
  reviewedAt: string;
  /**
   * The content version this approval attaches to. An approval is void once
   * the text changes — see `isApproved`.
   */
  version: number;
  /** Optional reviewer note carried through from the packet. */
  note?: string;
};

export type ContentType =
  | "intake-question"
  | "question-explanation"
  | "education-topic"
  | "claim-type"
  | "depth-question"
  | "next-step"
  | "pathway-description"
  | "form-guidance"
  | "procedural-stage"
  | "assistant-block"
  /** A published stage answer from the accuracy pipeline. See publishedLibrary.ts. */
  | "stage-answer"
  /**
   * A sentence the deadline engine can produce, as a template. Decision 5.
   * See case-system/deadlines/deadlineTemplates.ts for why the engine no
   * longer composes its own prose.
   */
  | "deadline-computation"
  | "doctrine"
  | "safety-resource"
  | "remedy";

/** A content item in the uniform shape the review packet and the guard use. */
export type ContentItem = {
  id: string;
  type: ContentType;
  /** Court pathway, or "all" where the item is pathway-independent. */
  pathway: string;
  /** Procedural stage, where the item is stage-specific. */
  stage: string;
  /** The exact text a user would see. */
  text: string;
  /** Official source (e-Laws, ontariocourts.ca, ontariocourtforms.on.ca). */
  sourceUrl: string;
  /** Where in the product this appears, for the reviewer's context. */
  appearsIn: string;
  /** Bumped whenever `text` changes, which voids any existing approval. */
  version: number;
};

const APPROVALS = approvalsData as { approvals: LicenseeApproval[] };

const BY_ID = new Map<string, LicenseeApproval>(
  APPROVALS.approvals.map((entry) => [entry.id, entry]),
);

/**
 * Whether serving unapproved content is permitted.
 *
 * DEFAULT FALSE, DELIBERATELY. Turning this on today would blank most of the
 * product, because nothing has been through licensee review yet. It is the
 * switch that gets flipped before launch, and the point of having it is that
 * flipping it is a one-line change rather than a project.
 *
 * `CONTENT_REQUIRE_APPROVED=true` in the environment turns it on.
 */
export const REQUIRE_APPROVED_CONTENT =
  process.env.CONTENT_REQUIRE_APPROVED === "true";

/**
 * Whether a specific item has a current licensee approval.
 *
 * An approval is tied to a version. If the text has been edited since sign-off,
 * the approval no longer applies — that is the difference between "a licensee
 * approved this" and "a licensee approved something that used to be here".
 */
export function isApproved(id: string, version: number): boolean {
  const approval = BY_ID.get(id);
  return Boolean(approval && approval.version === version);
}

/**
 * Whether an item may be shown to a user right now.
 *
 * With the flag off this is always true, and the function exists so that call
 * sites are already wired when the flag goes on.
 */
export function isServable(id: string, version: number): boolean {
  if (!REQUIRE_APPROVED_CONTENT) return true;
  return isApproved(id, version);
}

/** The approval record for an item, for reporting and the review packet. */
export function approvalFor(id: string): LicenseeApproval | null {
  return BY_ID.get(id) ?? null;
}

/** Counts for the compliance report and the quarterly return. */
export function approvalSummary(items: ContentItem[]): {
  total: number;
  approved: number;
  draft: number;
  staleApprovals: number;
} {
  let approved = 0;
  let stale = 0;

  for (const item of items) {
    const record = BY_ID.get(item.id);
    if (!record) continue;
    if (record.version === item.version) approved += 1;
    else stale += 1;
  }

  return {
    total: items.length,
    approved,
    draft: items.length - approved,
    staleApprovals: stale,
  };
}
