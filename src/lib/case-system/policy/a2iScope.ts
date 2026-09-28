/**
 * What CourtSimplified is allowed to do for a user, one switch per kind of
 * help, in the order the A2I Stage 1 application asked to discuss them.
 *
 * WHY ONE REGISTRY (2026-09-28). The site owner's goal is for the platform to
 * do as much of what a lawyer does as the Law Society's Access to Innovation
 * program allows, and to widen that step by step as A2I approves more. The
 * application submitted on 2026-09-28 lists the steps. Building each step
 * behind a switch means an approval becomes a one-line change here, and a
 * withdrawal is the same line back -- the application promised both ("each
 * feature stays switched off until A2I approves it, and can be switched off
 * again immediately").
 *
 * TWO TIERS.
 *   - "information": the platform explains the law generally, organises the
 *     user's own material, and points out what is absent. The USER applies
 *     the law. This is what the platform does today (CLAUDE.md section 2).
 *   - "needs-a2i-approval": the platform applies the law to the user's facts
 *     or prepares a court document for them. Legal services under Law Society
 *     Act s. 1(6) on the face of the words (REGULATORY_POSITION.md 6.3-6.5).
 *     Built only behind this switch; OFF until A2I approves that specific
 *     capability in writing.
 *
 * Turning a "needs-a2i-approval" switch on is a regulatory decision, not a
 * code one. Record the approval (date, who, scope) in the `approval` field in
 * the same commit, and verifyA2iScope.ts refuses an enabled switch without one.
 */

export type ScopeTier = "information" | "needs-a2i-approval";

export type ScopeApproval = {
  /** ISO date of A2I's written approval. */
  approvedOn: string;
  /** Who at A2I approved it, and where the approval is filed. */
  reference: string;
  /** The scope as A2I worded it, including any conditions. */
  conditions: string;
};

export type ScopeCapability = {
  id: string;
  title: string;
  tier: ScopeTier;
  enabled: boolean;
  /** Required whenever a needs-a2i-approval capability is enabled. */
  approval?: ScopeApproval;
  /** What it does, in plain words. */
  description: string;
};

export const A2I_SCOPE = {
  /** Point out what is absent, unclear or inconsistent in the user's own record. */
  caseReviewGaps: {
    id: "case-review-gaps",
    title: "Case review: gaps and things to check",
    tier: "information",
    enabled: true,
    description:
      "Reads the user's confirmed case and points out what is missing, unclear or inconsistent in " +
      "their own record -- a document they mention but have not added, a date given only roughly, two " +
      "entries that do not match. Each item quotes the user's own words, verified by code. Nothing is " +
      "said about whether the facts meet any legal test.",
  },
  /** Say which kinds of claim the confirmed facts may raise, and what such a claim generally requires. */
  claimElementMapping: {
    id: "claim-element-mapping",
    title: "Case review: which kinds of claim the facts may raise",
    tier: "needs-a2i-approval",
    enabled: false,
    description:
      "Application step 1. Maps the user's confirmed facts to the kinds of claim or legal concepts they " +
      "may raise and to what a person bringing that claim generally has to show. Applies law to facts.",
  },
  /** Turn the user's confirmed facts into clear text for the reasons section of their form. */
  wordingHelp: {
    id: "wording-help",
    title: "Help with wording",
    tier: "needs-a2i-approval",
    enabled: false,
    description:
      "Application step 2. Drafts concise text for the reasons section of the user's court form from " +
      "their confirmed facts; the user reviews, edits and files it. Drafting a document for a proceeding.",
  },
  /** Complete court forms from confirmed facts. */
  formCompletion: {
    id: "form-completion",
    title: "Completing court forms",
    tier: "needs-a2i-approval",
    enabled: false,
    description:
      "Application step 3. Completes the court form from the user's confirmed facts. Built and switched " +
      "off; see COURT_DOCUMENT_DRAFTING_ENABLED.",
  },
  /** Itemise the amount claimed from the user's documents. */
  amountItemization: {
    id: "amount-itemization",
    title: "Itemizing the amount claimed",
    tier: "needs-a2i-approval",
    enabled: false,
    description:
      "Application step 4. Builds the amount claimed line by line from the user's own receipts, quotes " +
      "and invoices, showing the arithmetic and the document behind each line.",
  },
  /** Case-specific procedural answers computed from the user's confirmed dates. */
  caseSpecificDeadlines: {
    id: "case-specific-deadlines",
    title: "Case-specific procedural answers",
    tier: "needs-a2i-approval",
    enabled: false,
    description:
      "Application step 5. Answers procedural questions about the user's own case, such as which " +
      "deadline applies at their stage, calculated from the rule and dates they confirm.",
  },
} as const satisfies Record<string, ScopeCapability>;

export type ScopeKey = keyof typeof A2I_SCOPE;

/** The one question every feature asks. */
export function isInScope(key: ScopeKey): boolean {
  const capability: ScopeCapability = A2I_SCOPE[key];
  if (!capability.enabled) return false;
  // Belt and braces: an approval-tier switch with no recorded approval is off,
  // whatever `enabled` says. The suite fails loudly on this too.
  if (capability.tier === "needs-a2i-approval" && !capability.approval) return false;
  return true;
}

export function listScope(): ScopeCapability[] {
  return Object.values(A2I_SCOPE);
}
