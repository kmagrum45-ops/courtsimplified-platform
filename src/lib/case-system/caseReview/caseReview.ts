/**
 * Case review -- the platform reading the WHOLE case the way a careful helper
 * would, and pointing out what is missing, unclear or inconsistent in the
 * user's own record.
 *
 * WHY (2026-09-28). In a live run, a user's story said a second contractor
 * "charged me 3200", that texts went unanswered "for weeks", and that the
 * contractor disputed the tiles were already cracked. A person reading that
 * story would ask for the receipt, the texts and photos, and the other party's
 * full name and address. The site asked for none of it: nothing read the
 * whole case at once.
 *
 * THE LINE THIS STAYS ON. This is the "information" tier of a2iScope.ts
 * (caseReviewGaps). Every finding is about the user's OWN record -- something
 * absent, approximate or inconsistent -- never about whether the facts meet a
 * legal test (CLAUDE.md section 2), never a grade or a severity (section 3),
 * never applied for the user (section 4: each item is dismissible and nothing
 * changes until the user acts). Mapping facts to kinds of claim is a separate,
 * approval-tier switch (claimElementMapping) and is not done here.
 *
 * TWO SOURCES, ONE SHAPE.
 *   - Deterministic findings (this file): computed from recorded fields. Where
 *     a finding repeats a rule, the rule is cited.
 *   - AI findings (caseReviewModel.ts): the model only points at the user's
 *     own words by quoting them and naming a fixed finding kind. The words the
 *     user sees come from the fixed templates below, never from the model
 *     (ACCURACY_ENGINE "model returns ids and enums only"), and every quote is
 *     checked by code to be the user's own text.
 */

import { parseRecordedAmount } from "../format/recordedAmount";

export const CASE_REVIEW_RULES_SOURCE = {
  sourceName: "Rules of the Small Claims Court, O. Reg. 258/98, r. 7.01(2)",
  sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
  verifiedAt: "2026-09-27",
} as const;

/** The confirmed facts a review reads. Every field is the user's own entry. */
export type ConfirmedCaseFile = {
  courtPath: "small-claims" | "civil" | "family" | string;
  /** "Plaintiff / claimant", "Defendant / responding party", or "". */
  role: string;
  /** The builder's recorded stage, e.g. "starting-case". */
  stage: string;
  story: string;
  yourName: string;
  otherParty: string;
  otherPartyAddress: string;
  amountText: string;
  timelineText: string;
  evidenceText: string;
  goalText: string;
  confirmedClaimTypeId: string | null;
  /** Recorded filings, e.g. ["plaintiffs-claim"]. */
  filedDocuments: string[];
};

export type FindingKind =
  // deterministic
  | "missing-your-name"
  | "missing-other-party-name"
  | "missing-other-party-address"
  | "amount-not-a-figure"
  | "no-evidence-recorded"
  | "no-claim-type-confirmed"
  // AI-located, template-worded
  | "document-mentioned"
  | "date-approximate"
  | "entries-differ"
  | "unknown-amount-mentioned";

export type CaseReviewFinding = {
  /** Stable within one review: kind + index. */
  id: string;
  kind: FindingKind;
  /** Fixed-template text shown to the user. Never model prose. */
  text: string;
  /** The user's own words this finding points at, verified present. */
  quotes: string[];
  /** Set when the finding repeats a rule. */
  source?: { sourceName: string; sourceUrl: string; verifiedAt: string };
  /** True when an AI located it; the UI labels those "AI suggestion". */
  aiLocated: boolean;
};

const isPlaintiff = (file: ConfirmedCaseFile) => /plaintiff|claimant/i.test(file.role);
const notYetFiled = (file: ConfirmedCaseFile) => !file.filedDocuments.includes("plaintiffs-claim");

/**
 * Findings computed from recorded fields alone. Pure.
 *
 * The Small Claims contents items are gated on the user's OWN record saying
 * they are bringing a claim that has not been filed -- the same posture as the
 * overview's starting-steps card -- and repeat r. 7.01(2), which lists what a
 * Plaintiff's Claim must contain.
 */
export function deterministicFindings(file: ConfirmedCaseFile): CaseReviewFinding[] {
  const out: Array<Omit<CaseReviewFinding, "id">> = [];
  const smallClaimsPlaintiffBeforeFiling =
    file.courtPath === "small-claims" && isPlaintiff(file) && notYetFiled(file);

  if (smallClaimsPlaintiffBeforeFiling) {
    if (!file.yourName.trim()) {
      out.push({
        kind: "missing-your-name",
        text:
          "Your full legal name isn't in your case file yet. The rules say a Plaintiff's Claim must " +
          "contain the full names of the parties.",
        quotes: [],
        source: CASE_REVIEW_RULES_SOURCE,
        aiLocated: false,
      });
    }
    if (!file.otherParty.trim()) {
      out.push({
        kind: "missing-other-party-name",
        text:
          "The other party's full name isn't in your case file yet. The rules say a Plaintiff's Claim " +
          "must contain the full names of the parties. If it's a business, its exact legal name is worth " +
          "finding.",
        quotes: [],
        source: CASE_REVIEW_RULES_SOURCE,
        aiLocated: false,
      });
    }
    if (!file.otherPartyAddress.trim()) {
      out.push({
        kind: "missing-other-party-address",
        text:
          "There's no address for the other party yet. The rules say a Plaintiff's Claim must give the " +
          "address where you believe the defendant can be served.",
        quotes: [],
        source: CASE_REVIEW_RULES_SOURCE,
        aiLocated: false,
      });
    }
    if (file.amountText.trim() && parseRecordedAmount(file.amountText) === null) {
      out.push({
        kind: "amount-not-a-figure",
        text:
          "The amount you recorded isn't a single figure yet. The rules say a Plaintiff's Claim must " +
          "state the amount of the claim. If part of it is still unknown, a written quote or estimate " +
          "can help you settle on a number.",
        quotes: [file.amountText.trim()],
        source: CASE_REVIEW_RULES_SOURCE,
        aiLocated: false,
      });
    }
  }

  if (!file.evidenceText.trim()) {
    out.push({
      kind: "no-evidence-recorded",
      text: "No evidence is recorded in your case file yet.",
      quotes: [],
      aiLocated: false,
    });
  }

  if (file.courtPath === "small-claims" && !file.confirmedClaimTypeId) {
    out.push({
      kind: "no-claim-type-confirmed",
      text:
        "You haven't confirmed what kind of claim this is, so the claim-specific checklists aren't " +
        "shown yet.",
      quotes: [],
      aiLocated: false,
    });
  }

  return out.map((finding, index) => ({ ...finding, id: `${finding.kind}:${index}` }));
}

/**
 * The fixed wording for each AI-located kind. `{q}` / `{q1}` / `{q2}` are the
 * user's own verified words; nothing else is filled in.
 */
export const AI_FINDING_TEMPLATES = {
  "document-mentioned":
    "You mentioned “{q}”. If you have something that shows this -- a receipt, invoice, " +
    "message, email or photo -- you can add it to your case file.",
  "date-approximate":
    "“{q}” -- if you can find the exact date (for example, from a message, receipt or " +
    "calendar), adding it will keep your timeline accurate.",
  "entries-differ":
    "These two things you entered may not match: “{q1}” and “{q2}”. You can check " +
    "them and correct one, or leave both as they are.",
  "unknown-amount-mentioned":
    "You said “{q}”. A written quote or estimate would give you a figure to record.",
} as const;

export type AiFindingKind = keyof typeof AI_FINDING_TEMPLATES;
export const AI_FINDING_KINDS = Object.keys(AI_FINDING_TEMPLATES) as AiFindingKind[];

/** How many quotes each kind takes. */
export const AI_FINDING_ARITY: Record<AiFindingKind, number> = {
  "document-mentioned": 1,
  "date-approximate": 1,
  "entries-differ": 2,
  "unknown-amount-mentioned": 1,
};

export function renderAiFinding(kind: AiFindingKind, quotes: string[]): string {
  const template: string = AI_FINDING_TEMPLATES[kind];
  if (AI_FINDING_ARITY[kind] === 2) {
    return template.replace("{q1}", quotes[0]).replace("{q2}", quotes[1]);
  }
  return template.replace("{q}", quotes[0]);
}

/** Everything the user wrote in their record, for quote verification and for the model. */
export function caseFileText(file: ConfirmedCaseFile): string {
  return [file.story, file.timelineText, file.amountText, file.evidenceText, file.goalText]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");
}

const str = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * Builds the case file from a saved case's master_result. Pure.
 *
 * Reads the builder's intake record (master_result.intakeData, a
 * StoredCaseData) and its `extra`, which carries the intake input fields and
 * the user-confirmed claim type. Only what the user entered or confirmed is
 * read; model output stored alongside it for audit is ignored.
 */
export function caseFileFromMasterResult(masterResult: unknown, courtPath: string | null): ConfirmedCaseFile {
  const master = (masterResult && typeof masterResult === "object" ? masterResult : {}) as Record<string, unknown>;
  const intake = (master.intakeData && typeof master.intakeData === "object" ? master.intakeData : {}) as Record<
    string,
    unknown
  >;
  const extra = (intake.extra && typeof intake.extra === "object" ? intake.extra : {}) as Record<string, unknown>;
  const filed = Array.isArray(extra.filedDocuments)
    ? extra.filedDocuments.filter((item): item is string => typeof item === "string")
    : [];

  return {
    courtPath: str(intake.courtPath) || courtPath || "",
    role: str(extra.yourRole),
    stage: str(intake.caseStage),
    story: str(intake.facts),
    yourName: str(intake.yourName),
    otherParty: str(intake.otherParty),
    otherPartyAddress: str(extra.defendantAddress),
    amountText: str(extra.amountClaimed),
    timelineText: str(intake.timeline),
    evidenceText: str(intake.evidence),
    goalText: str(intake.goal),
    confirmedClaimTypeId: typeof extra.confirmedClaimTypeId === "string" ? extra.confirmedClaimTypeId : null,
    filedDocuments: filed,
  };
}
