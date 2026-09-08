/**
 * Session 29 -- reshapes GuidedSmallClaimsIntake.tsx's collected data into
 * analyzeSmallClaimsWithBrain's real SmallClaimsIntelligenceInput, so
 * guided intake can be analyzed by the exact same engine and routed
 * through the exact same builder/page.tsx handleComplete pipeline the
 * static form already uses -- no new save destination, no parallel logic.
 *
 * The honest limitation this file exists to make visible, not hide:
 * guided mode's question bank (15 questions) is narrower than the form's
 * ~25 fields, and more importantly, orchestrateIntakeTurn's IntakeFacts
 * only ever captures a handful of small STRUCTURED facts (role,
 * disputeCategory, claimFiled, claimServed, defenceFiled,
 * twentyDaysElapsed) -- it does not capture the raw TEXT of a user's
 * answer to a free-text question (what evidence they have, what remedy
 * they want, when things happened). Only the opening story survives as
 * real prose (passed in separately as `initialStory`, unchanged from what
 * the user actually typed). Every SmallClaimsIntelligenceInput field this
 * function cannot honestly populate from real data is left as an empty
 * string or empty array -- never a plausible-looking guess.
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
function inferCaseStage(filedDocuments: SmallClaimsFiledDocument[]): UniversalStage {
  if (filedDocuments.includes("defence")) return "responding";
  if (filedDocuments.includes("plaintiffs-claim")) return "already-started";
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
    caseStage: inferCaseStage(filedDocuments),
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
    amountClaimed: "", // sc-amount-claimed is asked, but its free-text answer isn't captured into IntakeFacts today -- see file header
    defendantAddress: "", // not collected
    agreementDetails: "", // not collected
    paymentHistory: "", // not collected
    damagesBreakdown: "", // not collected
    serviceDetails: "", // claimServed is a known boolean fact, but has no free-text home in this input shape
    deadlineDetails: "", // not collected
    facts: initialStory, // real -- the opening story, unchanged from what the user typed
    timeline: "", // sc-orient-when-happened is asked, its answer text isn't captured into IntakeFacts today
    evidence: "", // sc-evidence-available is asked, its answer text isn't captured into IntakeFacts today
    missingEvidence: "", // not collected
    settlementEfforts: "", // not collected
    defenceResponse: "", // not collected
    goal: "", // sc-remedy-sought is asked, its answer text isn't captured into IntakeFacts today
    urgent: "", // not collected
  };
}
