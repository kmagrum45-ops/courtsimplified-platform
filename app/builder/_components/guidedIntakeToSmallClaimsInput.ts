/**
 * Session 29 -- reshapes GuidedSmallClaimsIntake.tsx's collected data into
 * analyzeSmallClaimsWithBrain's real SmallClaimsIntelligenceInput, so
 * guided intake can be analyzed by the exact same engine and routed
 * through the exact same builder/page.tsx handleComplete pipeline the
 * static form already uses -- no new save destination, no parallel logic.
 *
 * The honest limitation this file exists to make visible, not hide:
 * guided mode's question bank (15 questions) is narrower than the form's
 * ~25 fields, so many SmallClaimsIntelligenceInput fields (name, address,
 * defendant's address, claim number, and others with no corresponding
 * guided question at all) are still left empty below.
 *
 * Session 30 closed the specific gap this file's header used to describe
 * here: orchestrateIntakeTurn.ts now captures a direct answer's raw text
 * verbatim (see questionBank.ts's capturesField, orchestrateIntakeTurn.ts)
 * into amountClaimedText/timelineText/evidenceText/remedySoughtText/
 * serviceDetailsText, so amountClaimed/timeline/evidence/goal/
 * serviceDetails below are now real user text, not fabricated. Only the
 * opening story remains passed in separately (`initialStory`), unchanged
 * from what the user actually typed. Every field this function still
 * cannot honestly populate from real data is left as an empty string or
 * empty array -- never a plausible-looking guess.
 */

import type {
  SmallClaimsIntelligenceInput,
  SmallClaimsIssue,
  SmallClaimsFiledDocument,
} from "../../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import type { UniversalStage } from "./builderTypes";
import type { GuidedIntakeCompletionResult } from "./GuidedSmallClaimsIntake";

const KNOWN_SMALL_CLAIMS_ISSUES = new Set<SmallClaimsIssue>([
  "unpaid-money",
  "contract-dispute",
  "property-damage",
  "loan-or-debt",
  "work-or-services",
  "deposit-refund",
  "consumer-purchase",
  "vehicle-dispute",
  "defamation-reputation",
  "harassment-communications",
  "defending-claim",
  "settlement",
  "enforcement",
  "other",
]);

// extractIntakeFacts.ts's own extraction prompt tells the model to use
// slugs like "work-or-services" or "defamation" for disputeCategory --
// "work-or-services" already matches SmallClaimsIssue exactly, but
// "defamation" doesn't match this engine's "defamation-reputation". A
// small, explicit, reviewable alias table reconciles the two independently
// -evolved vocabularies -- never a guess at what the model meant.
const DISPUTE_CATEGORY_ALIASES: Record<string, SmallClaimsIssue> = {
  defamation: "defamation-reputation",
  harassment: "harassment-communications",
};

function mapDisputeCategoryToIssues(disputeCategory: unknown): SmallClaimsIssue[] {
  if (typeof disputeCategory !== "string" || !disputeCategory) return [];
  const aliased = DISPUTE_CATEGORY_ALIASES[disputeCategory];
  if (aliased) return [aliased];
  if (KNOWN_SMALL_CLAIMS_ISSUES.has(disputeCategory as SmallClaimsIssue)) {
    return [disputeCategory as SmallClaimsIssue];
  }
  // An unrecognized slug is left out entirely rather than guessed at or
  // forced into "other" -- "other" is itself a real signal the engine
  // reads, and asserting it for a slug that just doesn't match anything
  // known would be a fabrication in the other direction.
  return [];
}

function mapFiledDocuments(facts: GuidedIntakeCompletionResult["facts"]): SmallClaimsFiledDocument[] {
  const filed: SmallClaimsFiledDocument[] = [];
  if (facts.claimFiled === true) filed.push("plaintiffs-claim");
  if (facts.defenceFiled === true) filed.push("defence");
  return filed.length > 0 ? filed : ["nothing"];
}

/**
 * Session 30: reads one of the new verbatim-captured text facts
 * (amountClaimedText, timelineText, evidenceText, remedySoughtText,
 * serviceDetailsText). Guards the type rather than trusting it, since
 * `facts` here is GuidedSmallClaimsIntake.tsx's loose client-side
 * Record<string, string | number | boolean>, not the server's
 * KnownFactField-keyed IntakeFacts.
 */
function textField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapYourRole(role: unknown): string {
  if (role === "plaintiff") return "Plaintiff / claimant";
  if (role === "defendant") return "Defendant / responding party";
  // Genuinely unknown -- left blank rather than defaulting to a guessed
  // role the way the form's own editable default field can safely do,
  // since nothing here gets a human review pass before analysis runs.
  return "";
}

/**
 * Small, direct mirror of SmallClaimsIntake.tsx's own (unexported)
 * inferStage() -- filedDocuments branches only. That function also
 * inspects free-text fields (facts/serviceDetails/defenceResponse) guided
 * mode doesn't have available here, so this covers only what's honestly
 * derivable from the same two structured facts already used above.
 */
/*
 * *** ROLE DECIDES WHICH STAGE, NOT JUST WHICH DOCUMENTS EXIST ***
 *
 * This read documents only, and each stage's next-step block (nextSteps.ts)
 * is written for ONE side. Found 2026-09-27 by the case-review batch:
 *
 *   - A PLAINTIFF whose defendant had filed a Defence was mapped to
 *     "responding" and told "A defendant who wishes to dispute a claim must,
 *     within 20 days of being served, serve a Defence".
 *   - A DEFENDANT who had been served (so claimFiled is true -- the
 *     plaintiff's claim) was mapped to "already-started" and told the
 *     PLAINTIFF may ask the clerk to note the defendant in default.
 *
 * Both are the other side's instructions.
 *
 * A defended action goes to the "conference" stage for either side:
 * "A settlement conference shall be held in every defended action"
 * (O. Reg. 258/98 r. 13.01 (1), read from
 * docs/sources/corpus/oreg-258-98-small-claims-rules.txt line 1863,
 * 2026-09-27). The conference block is written for both parties.
 *
 * When role is unknown, the documents-only order below is unchanged -- a
 * guess at role would be worse than the old behaviour, not better.
 */
function inferCaseStage(filedDocuments: SmallClaimsFiledDocument[], role: unknown): UniversalStage {
  const defenceFiled = filedDocuments.includes("defence");
  const claimFiled = filedDocuments.includes("plaintiffs-claim");

  if (role === "defendant") {
    return defenceFiled ? "conference" : "responding";
  }
  if (role === "plaintiff") {
    if (defenceFiled) return "conference";
    if (claimFiled) return "already-started";
    return "starting-case";
  }

  if (defenceFiled) return "responding";
  if (claimFiled) return "already-started";
  return "starting-case";
}

/**
 * Pure mapping: guided intake's completion result + the location already
 * confirmed earlier in the builder flow + the original story text ->
 * SmallClaimsIntelligenceInput. Every field either carries real,
 * user-provided data or is left empty -- see the file header for exactly
 * which fields fall into the second category and why.
 */
export function mapGuidedIntakeToSmallClaimsInput(
  result: GuidedIntakeCompletionResult,
  location: { province: "Ontario"; city: string },
  initialStory: string,
): SmallClaimsIntelligenceInput {
  const filedDocuments = mapFiledDocuments(result.facts);
  const issues = mapDisputeCategoryToIssues(result.facts.disputeCategory);

  return {
    caseStage: inferCaseStage(filedDocuments, result.facts.role),
    issues,
    filedDocuments,
    uploadedEvidenceFiles: [], // guided mode has no file-upload capability at all

    yourName: "", // not collected -- questionBank.ts has no name question
    yourAddress: "", // not collected
    yourCity: location.city, // real -- confirmed earlier in the same builder flow
    yourProvince: location.province, // real
    yourPostalCode: "", // not collected
    yourPhone: "", // not collected
    yourEmail: "", // not collected

    otherParty: "", // not collected -- no "other party's name" question in the guided bank
    otherPartyPhone: "", // not collected
    otherPartyEmail: "", // not collected

    yourRole: mapYourRole(result.facts.role),
    courtLocation: "", // not collected
    claimNumber: "", // not collected
    amountClaimed: textField(result.facts.amountClaimedText), // real -- verbatim answer to sc-amount-claimed
    defendantAddress: "", // not collected
    agreementDetails: "", // not collected
    paymentHistory: "", // not collected
    damagesBreakdown: "", // not collected
    serviceDetails: textField(result.facts.serviceDetailsText), // real -- verbatim answer to sc-defendant-served
    deadlineDetails: "", // not collected
    facts: initialStory, // real -- the opening story, unchanged from what the user typed
    timeline: textField(result.facts.timelineText), // real -- verbatim answer to sc-orient-when-happened
    evidence: textField(result.facts.evidenceText), // real -- verbatim answer to sc-evidence-available
    missingEvidence: "", // not collected
    settlementEfforts: "", // not collected
    defenceResponse: "", // not collected
    goal: textField(result.facts.remedySoughtText), // real -- verbatim answer to sc-remedy-sought
    urgent: "", // not collected
  };
}
