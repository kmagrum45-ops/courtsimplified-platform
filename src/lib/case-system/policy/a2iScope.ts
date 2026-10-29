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

import { capabilityAllowed, onProductionDeployment, type CapabilityContext, type CapabilityEnv } from "./capabilityAccess";

export type ScopeTier ="information" | "needs-a2i-approval";

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
  /**
   * Why an enabled capability is still for listed testers only on production
   * (capabilityAccess.ts), although it needs no A2I approval of its own.
   */
  productionTestersOnly?: string;
};

export const A2I_SCOPE = {
  /** Point out what is absent, unclear or inconsistent in the user's own record. */
  caseReviewGaps: {
    id: "case-review-gaps",
    title: "Case review: gaps and things to check",
    tier: "information",
    enabled: true,
    productionTestersOnly:
      "The model reads the person's case and writes about it, and the A2I answers say case review is not " +
      "offered yet (site owner, 2026-10-29: production defaults off, owner allowlist). The code-written " +
      "checks still run for everyone; only the AI part is gated.",
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
  /**
   * Complete court forms from confirmed facts, and assemble drafts of court documents
   * (Plaintiff's Claim Form 7A, Statement of Claim Form 14A, Family Application Form 8,
   * the responding documents): the builder's draft buttons, the Statement of Claim
   * surface and the case's drafts page all follow this switch (useCapabilities().formCompletion).
   *
   * Off for real users as of 2026-09-28. The site owner's standing decision is that users
   * fill in court forms themselves, and docs/REGULATORY_POSITION.md section 6.4 is the
   * reason: Law Society Act s. 1(6)2.vii names "selects, drafts, completes or revises, on
   * behalf of a person" a document for use in a proceeding, and a deterministic template
   * does not obviously take the platform outside it. (This note lived in
   * courtDocumentDrafting.ts, removed 2026-10-29 when its constant became per-person.)
   */
  formCompletion: {
    id: "form-completion",
    title: "Completing court forms",
    tier: "needs-a2i-approval",
    enabled: false,
    description:
      "Application step 3. Completes the court form from the user's confirmed facts. Built and switched " +
      "off; the drafting surfaces follow it too.",
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
  /**
   * Answer legal questions about the user's own matter instead of deflecting
   * them -- CLAUDE.md "Guide like a lawyer; never judge the case" (site owner,
   * 2026-10-04). Off: any legal question gets the fixed deflection. On: only a
   * request to JUDGE the case (do I have a case, will I win, how strong, should
   * I settle) is turned aside; "what is the limitation period", "what do I
   * have to prove", "help me word this" go on to the guidance.
   */
  answerLegalQuestions: {
    id: "answer-legal-questions",
    title: "Answering legal questions about the user's matter",
    tier: "needs-a2i-approval",
    enabled: false,
    description:
      "Lets the intake carry on with a question about what the law is or what applies to the user, " +
      "instead of turning it aside as legal advice. A request to judge the case -- whether they have " +
      "one, will win, or should settle -- is still turned aside, with any setting of this switch.",
  },
} as const satisfies Record<string, ScopeCapability>;

export type ScopeKey = keyof typeof A2I_SCOPE;

/**
 * TESTING PREVIEW (2026-09-28, at the site owner's request).
 *
 * The site owner wants to build and test every step on his wish list now, and
 * switch each one on for real users only when A2I approves it. So an
 * unapproved capability can be turned on for TESTING ONLY, never in
 * production: NEXT_PUBLIC_CS_SCOPE_PREVIEW must be exactly "on", and the
 * deployment must not be Vercel production. Moot while OWNER_LIVE_TESTING is
 * on, which turns them all on off production anyway.
 */
/**
 * OWNER LIVE TESTING (2026-09-30, the site owner's decision; narrowed 2026-10-29).
 *
 * "Put everything on live. My goal is to build as intended through everything
 * so it can go through live testing." -- site owner, 2026-09-30.
 *
 * 2026-10-29, the owner's decision "production defaults off, owner allowlist":
 * while this is enabled, every approval-tier capability is on
 *   - everywhere OFF production (previews, staging, local, the suites), and
 *   - ON production only for the signed-in testers listed in
 *     A2I_TESTER_USER_IDS (capabilityAccess.ts). Everyone else on production
 *     gets none of them.
 * Until 2026-10-29 it turned them on for everyone on production too.
 *
 * Every screen that shows one carries the testing notice (ScopePreviewNotice).
 * It is NOT an A2I approval and must never be recorded as one: `approval`
 * stays empty until the Law Society approves a capability in writing. Set
 * `enabled: false` to turn them off for the testers and off production too.
 */
export const OWNER_LIVE_TESTING = {
  enabled: true,
  decidedOn: "2026-09-30",
  decidedBy: "site owner",
  reason:
    "Live testing of the full intended product before any real users: on off production, and on " +
    "production only for the listed testers (owner's decision 2026-10-29, production defaults off).",
} as const;

/**
 * Whether unapproved capabilities are switched on for testing at all, before
 * WHO is asking is considered (capabilityAccess.capabilityAllowed does that).
 */
export function scopePreviewActive(env: CapabilityEnv = typeof process !== "undefined" ? process.env : {}): boolean {
  if (OWNER_LIVE_TESTING.enabled) return true;
  if (env.NEXT_PUBLIC_CS_SCOPE_PREVIEW !== "on") return false;
  return !onProductionDeployment(env);
}

export function approvedForRealUsers(capability: ScopeCapability): boolean {
  if (!capability.enabled) return false;
  // Belt and braces: an approval-tier switch with no recorded approval is off,
  // whatever `enabled` says. The suite fails loudly on this too.
  if (capability.tier === "needs-a2i-approval" && !capability.approval) return false;
  return true;
}

/**
 * The one question every feature asks. On production an unapproved capability
 * (and an approved one marked productionTestersOnly) is on only for a listed
 * tester (capabilityAccess.ts). `context` names the env and the user; it
 * defaults to process.env and the user the enclosing request named.
 */
export function isInScope(key: ScopeKey, context: CapabilityContext = {}): boolean {
  const capability: ScopeCapability = A2I_SCOPE[key];
  const approved = approvedForRealUsers(capability);
  if (approved && !capability.productionTestersOnly) return true;
  const env = context.env ?? (typeof process !== "undefined" ? process.env : {});
  const baseOn = approved || (capability.tier === "needs-a2i-approval" && scopePreviewActive(env));
  return capabilityAllowed(key, baseOn, context);
}

/** True when a capability is on only for testing (no A2I approval). */
export function scopeIsPreviewOnly(key: ScopeKey, context: CapabilityContext = {}): boolean {
  return isInScope(key, context) && !approvedForRealUsers(A2I_SCOPE[key]);
}

export function listScope(): ScopeCapability[] {
  return Object.values(A2I_SCOPE);
}
