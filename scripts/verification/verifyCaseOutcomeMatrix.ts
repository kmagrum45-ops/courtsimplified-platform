import { NextRequest } from "next/server";

import { POST as smallClaimsPost } from "../../app/api/small-claims/analyze/route";
import { POST as familyPost } from "../../app/api/family/analyze/route";
import {
  POST as civilPost,
  createCivilAnalyzePost,
} from "../../app/api/civil/analyze/route";
import { POST as aiPartnerPost } from "../../app/api/ai-case-partner/route";
import { runCivilIntakeCanonicalIntegration } from "../../src/lib/case-system/orchestration/civilIntakeCanonicalAdapter";

type CourtPath = "small-claims" | "family" | "civil" | "ai-case-partner";
type ExpectedRoute = {
  status: number;
  ok: boolean;
  reasoningMode?: "deterministic-fallback";
  routedCourt?: "small-claims" | "family" | "civil" | "mixed";
};
type CanonicalExpectation = {
  required: boolean;
  preserveCaseId?: string;
  preserveFields?: Record<string, unknown>;
};
type AuthenticationExpectation = {
  authenticated: boolean;
  externalAiAllowed: boolean;
  ownership?: "anonymous" | "owned" | "denied" | "isolated-users";
};
type Fixture = {
  id: string;
  selectedCourtPath: CourtPath;
  province: "Ontario";
  role: string;
  stage: string;
  narrative: string;
  structuredIntake: Record<string, unknown>;
  requiredPrimaryClassifications: string[];
  allowedSecondaryClassifications: string[];
  forbiddenClassifications: string[];
  reviewRequiredClassifications: string[];
  requiredOutputText: string[];
  expectedRouteResult: ExpectedRoute;
  requiredQuestions: string[];
  forbiddenQuestions: string[];
  requiredWarnings: string[];
  forbiddenWarnings: string[];
  expectedEvidenceCategories: string[];
  expectedProofGaps: string[];
  canonical: CanonicalExpectation;
  authentication: AuthenticationExpectation;
  regression: string;
  mode?: "route" | "civil-owned" | "civil-denied" | "civil-two-users";
};
type FixtureRun = {
  fixture: Fixture;
  status: number;
  body: Record<string, any>;
  externalAiObserved?: boolean;
};
type FixtureReport = {
  id: string;
  area: CourtPath;
  status: "PASS" | "FAIL" | "REVIEW";
  classifications: string;
  mismatches: Array<{ category: FailureCategory; message: string }>;
  reviewNotes: string[];
};
type FailureCategory = "confirmed-production-defect" | "legitimate-secondary-overlap" | "evaluator-defect" | "product-or-legal-review-required";

delete process.env.OPENAI_API_KEY;

const smallClaimsIssues = [
  ["unpaid-money", "debt", "A client has not paid a $900 invoice despite written requests."],
  ["contract-dispute", "contract", "The parties agreed in writing to repairs, the work was not completed, and payment was retained."],
  ["property-damage", "property-damage", "A delivery vehicle damaged a fence and photographs show the physical damage."],
  ["loan-or-debt", "debt", "A synthetic borrower received a $700 loan and did not pay it back."],
  ["work-or-services", "contract", "A written quote required painting services, but the promised work was not completed."],
  ["deposit-refund", "contract", "A written agreement required return of a deposit, but the deposit was not returned."],
  ["consumer-purchase", "consumer", "A consumer paid for a synthetic appliance that was never delivered."],
  ["vehicle-dispute", "property-damage", "A synthetic collision damaged a vehicle and repair photographs are available."],
  ["defamation-reputation", "defamation", "A person sent a false statement about Rowan Test to two unrelated recipients."],
  ["harassment-communications", "harassment", "A person keeps messaging Rowan Test after repeated requests to stop contacting them."],
  ["defending-claim", "procedural", "Rowan Test was served with a claim and needs to respond to the allegations."],
  ["settlement", "procedural", "The parties exchanged a settlement proposal in this existing dispute."],
  ["enforcement", "procedural", "A judgment exists and Rowan Test is seeking an enforcement workflow."],
  ["other", "unknown", "A private dispute requires clarification because the relevant issue is not yet known."],
] as const;

const familyIssues = [
  ["decision-making-responsibility", "family-parenting", "The applicant requests a decision-making responsibility order for a synthetic child."],
  ["parenting-time", "family-parenting", "The applicant requests a defined parenting-time schedule."],
  ["child-support", "family-support", "The applicant requests child support and identifies missing income disclosure."],
  ["spousal-support", "family-support", "The applicant requests spousal support and identifies missing income records."],
  ["property-division", "family-property", "The applicant requests division of family property and disclosure."],
  ["matrimonial-home", "family-property", "The applicant requests relief concerning the matrimonial home."],
  ["safety-concerns", "family-safety", "The applicant describes immediate family safety concerns and requests a safety-focused order."],
  ["relocation", "family-parenting", "The applicant requests permission to relocate with a synthetic child."],
  ["disclosure", "family-support", "The applicant requests financial disclosure needed for a support issue."],
  ["enforcement", "procedural", "The applicant seeks enforcement of an existing family order."],
  ["other", "unknown", "The applicant has an unclear family concern and needs a focused clarification question."],
] as const;

const civilIssues = [
  ["contract", "contract"], ["negligence", "negligence"],
  ["institutional-negligence", "civil-institutional-liability"],
  ["professional-negligence", "negligence"], ["human-rights", "civil-human-rights"],
  ["disability-accommodation", "civil-human-rights"], ["employment-human-rights", "civil-human-rights"],
  ["housing-human-rights", "civil-human-rights"], ["education-human-rights", "civil-human-rights"],
  ["charter", "civil-charter"], ["government-public-authority", "civil-institutional-liability"],
  ["police-conduct", "civil-institutional-liability"], ["judicial-review", "procedural"],
  ["tribunal-overlap", "procedural"], ["defamation", "defamation"], ["privacy", "harassment"],
  ["property", "property-damage"], ["debt", "debt"], ["employment", "employment"],
  ["fraud-misrepresentation", "contract"], ["intentional-tort", "harassment"],
  ["injunction", "procedural"], ["estate", "unknown"], ["motion", "procedural"],
  ["appeal", "procedural"], ["enforcement", "procedural"], ["other", "unknown"],
] as const;

const smallStages = ["starting-case", "responding", "already-started", "conference", "motion", "trial", "enforcement", "appeal", "urgent", "settlement", "not-sure"];
const familyStages = ["starting-case", "responding", "already-started", "conference", "motion", "trial", "enforcement", "urgent", "not-sure"];
const civilStages = ["starting-case", "responding", "already-started", "conference", "motion", "trial", "enforcement", "urgent", "not-sure"];
const familyRoles = ["applicant", "respondent", "joint-applicant", "third-party-caregiver", "not-sure"];
const civilRoles = ["plaintiff", "defendant", "applicant", "respondent", "moving-party", "responding-party", "other", "not-sure"];
const smallDocuments = ["plaintiffs-claim", "defence", "affidavit-service", "offer-settle", "settlement-conference", "default-judgment", "witness-list", "enforcement-documents", "nothing", "not-sure"];
const familyDocuments = ["Application already filed / served", "Answer / response already filed", "Financial statement already completed", "Affidavit already prepared", "Motion materials already filed", "Conference brief already filed", "Existing court order or agreement", "Nothing filed yet", "Not sure"];
const civilDocuments = ["statement-claim", "statement-defence", "notice-application", "notice-motion", "affidavit-service", "affidavit", "order", "judgment", "tribunal-application", "human-rights-application", "judicial-review-materials", "demand-letter", "discovery", "trial-record", "nothing", "not-sure"];
const smallEvidence = ["Screenshots / messages", "Social media posts", "Emails", "Witness / recipient information", "Reputation / harm proof", "Payment / financial proof", "Contract / agreement, only if relevant", "Photos / physical damage, only if relevant", "Court document", "Service / delivery proof", "Settlement discussion", "Other"];
const familyEvidence = ["Parenting / decision-making", "Parenting time / access", "Child support", "Spousal support", "Financial disclosure", "Property / home", "Safety / urgency", "School / child records", "Messages / communication", "Court document", "Agreement / order", "Other"];

function smallInput(patch: Record<string, unknown> = {}) {
  return {
    caseStage: "starting-case", issues: ["other"], filedDocuments: ["nothing"], uploadedEvidenceFiles: [],
    yourName: "Rowan Test", yourAddress: "1 Synthetic Street", yourCity: "Toronto", yourProvince: "Ontario",
    yourPostalCode: "M1M 1M1", yourPhone: "416-555-0100", yourEmail: "rowan@example.test",
    otherParty: "Morgan Example", otherPartyPhone: "", otherPartyEmail: "", yourRole: "Plaintiff / claimant",
    courtLocation: "Toronto", claimNumber: "", amountClaimed: "", defendantAddress: "2 Synthetic Avenue",
    agreementDetails: "", paymentHistory: "", damagesBreakdown: "", serviceDetails: "", deadlineDetails: "",
    facts: "A private dispute requires clarification.", timeline: "The date is not yet known.", evidence: "Synthetic notes.",
    missingEvidence: "Source and date records.", settlementEfforts: "", defenceResponse: "", goal: "Clarify the available remedy.", urgent: "",
    ...patch,
  };
}

function familyInput(patch: Record<string, unknown> = {}) {
  return {
    caseStage: "starting-case", role: "applicant", relationshipStatus: "Separated", issues: ["other"],
    filedDocuments: ["Nothing filed yet"], completedForms: [], receivedForms: [], yourName: "Avery Test",
    otherParty: "Casey Example", childrenInfo: "", currentLivingSituation: "Stable synthetic residence.",
    pastLivingHistory: "No additional history.", facts: "An unclear family concern needs clarification.", timeline: "Date not known.",
    evidence: "Synthetic communications.", missingEvidence: "Relevant records.", goal: "Clarify the requested family outcome.", urgent: "",
    safetyConcerns: "", propertyHomeDetails: "", upcomingCourtDate: "", financialDisclosure: "", parentingSchedule: "",
    communicationHistory: "", policeInvolvement: "", childProtectionInvolvement: "", schoolIssues: "", medicalIssues: "",
    relocationDetails: "", existingOrders: "", settlementHistory: "", uploadedFiles: [], ...patch,
  };
}

function civilInput(patch: Record<string, unknown> = {}) {
  return {
    caseId: "civil-matrix-default", caseStage: "starting-case", issues: ["other"], documents: ["nothing"], uploadedEvidenceFiles: [],
    yourName: "Taylor Test", otherParty: "Jordan Example", yourRole: "plaintiff", courtLocation: "Toronto", courtFileNumber: "",
    amountClaimed: "", limitationDeadline: "Unknown", facts: "A civil dispute requires clarification.", timeline: "Date not known.",
    evidence: "Synthetic notes.", missingEvidence: "Source and date records.", damagesBreakdown: "", legalRemedy: "Clarification",
    settlementEfforts: "", serviceDetails: "", urgent: "", humanRightsGrounds: "", discriminationFacts: "",
    accommodationRequests: "", governmentActor: "", publicDecisionOrConduct: "", institutionalFacts: "", privacyRecordsFacts: "",
    ...patch,
  };
}

function completeFixture(partial: Partial<Fixture> & Pick<Fixture, "id" | "selectedCourtPath" | "narrative" | "structuredIntake" | "regression">): Fixture {
  return {
    province: "Ontario", role: "not-sure", stage: "not-sure", requiredPrimaryClassifications: [],
    allowedSecondaryClassifications: [], forbiddenClassifications: [], reviewRequiredClassifications: [], requiredOutputText: [], expectedRouteResult: { status: 200, ok: true, reasoningMode: "deterministic-fallback" },
    requiredQuestions: [], forbiddenQuestions: [], requiredWarnings: [], forbiddenWarnings: ["OPENAI_API_KEY"],
    expectedEvidenceCategories: [], expectedProofGaps: [], canonical: { required: true },
    authentication: { authenticated: false, externalAiAllowed: false, ownership: "anonymous" }, mode: "route", ...partial,
  };
}

const fixtures: Fixture[] = [];

smallClaimsIssues.forEach(([issue, domain, narrative], index) => {
  const stage = smallStages[index % smallStages.length];
  const document = smallDocuments[index % smallDocuments.length];
  const evidenceCategory = smallEvidence[index % smallEvidence.length];
  fixtures.push(completeFixture({
    id: `sc-issue-${issue}`, selectedCourtPath: "small-claims", role: stage === "responding" ? "Defendant / responding party" : "Plaintiff / claimant", stage,
    narrative, structuredIntake: smallInput({ caseStage: stage, issues: [issue], filedDocuments: [document], yourRole: stage === "responding" ? "Defendant / responding party" : "Plaintiff / claimant", facts: narrative,
      defenceResponse: stage === "responding" ? "The synthetic allegations are disputed." : "", uploadedEvidenceFiles: [{ id: `sc-evidence-${index}`, name: "synthetic.txt", size: 20, type: "text/plain", lastModified: 1, title: evidenceCategory, description: narrative, category: evidenceCategory, evidenceDate: "2026-01-10", source: "Synthetic source", relevance: "Tests category coverage." }] }),
    requiredPrimaryClassifications: ["defending-claim", "settlement", "enforcement"].includes(issue) ? [] : [domain],
    allowedSecondaryClassifications: issue === "work-or-services" ? ["defamation"] : ["defending-claim", "settlement", "enforcement"].includes(issue) ? ["unknown"] : [],
    forbiddenClassifications: issue === "work-or-services" ? ["personal-injury"] : [],
    reviewRequiredClassifications: ["defending-claim", "settlement", "enforcement"].includes(issue) ? [domain] : [],
    requiredOutputText: [issue],
    expectedEvidenceCategories: [evidenceCategory], expectedProofGaps: ["source"], regression: `Covers the live Small Claims ${issue} issue, ${stage} stage, ${document} document, and ${evidenceCategory} evidence choice.`,
  }));
});

familyIssues.forEach(([issue, domain, narrative], index) => {
  const stage = familyStages[index % familyStages.length];
  const role = familyRoles[index % familyRoles.length];
  const document = familyDocuments[index % familyDocuments.length];
  const evidenceCategory = familyEvidence[index % familyEvidence.length];
  fixtures.push(completeFixture({
    id: `family-issue-${issue}`, selectedCourtPath: "family", role, stage, narrative,
    structuredIntake: familyInput({ caseStage: stage, role, issues: [issue], filedDocuments: [document], facts: narrative,
      uploadedFiles: [{ id: `family-evidence-${index}`, fileName: "synthetic.txt", originalName: "synthetic.txt", mimeType: "text/plain", sizeBytes: 20, title: evidenceCategory, description: narrative, category: evidenceCategory, source: "Synthetic source", notes: "Tests category coverage." }] }),
    requiredPrimaryClassifications: ["decision-making-responsibility", "parenting-time", "child-support", "spousal-support", "other"].includes(issue) ? [domain] : [],
    allowedSecondaryClassifications: ["child-support", "spousal-support"].includes(issue) ? ["family-parenting"] : ["decision-making-responsibility", "parenting-time", "child-support", "spousal-support", "other"].includes(issue) ? [] : ["unknown"],
    reviewRequiredClassifications: ["decision-making-responsibility", "parenting-time", "child-support", "spousal-support", "other"].includes(issue) ? [] : [domain],
    requiredOutputText: [issue],
    expectedEvidenceCategories: [evidenceCategory], expectedProofGaps: ["record"], regression: `Covers the live Family ${issue} issue, ${role} role, ${stage} stage, ${document} document, and ${evidenceCategory} evidence choice.`,
  }));
});

civilIssues.forEach(([issue, domain], index) => {
  const stage = civilStages[index % civilStages.length];
  const role = civilRoles[index % civilRoles.length];
  const document = civilDocuments[index % civilDocuments.length];
  const narrative = `Synthetic ${issue} facts identify conduct, context, requested relief, and available records for evaluation.`;
  fixtures.push(completeFixture({
    id: `civil-issue-${issue}`, selectedCourtPath: "civil", role, stage, narrative,
    structuredIntake: civilInput({ caseId: `civil-${issue}`, caseStage: stage, yourRole: role, issues: [issue], documents: [document], facts: narrative,
      uploadedEvidenceFiles: [{ id: `civil-evidence-${index}`, name: "synthetic.txt", size: 20, type: "text/plain", lastModified: 1, title: `${issue} record`, description: narrative, relatedIssue: issue, evidenceDate: "2026-01-10", createdBy: "Synthetic source", whyItMatters: "Tests uploaded-civil-evidence coverage." }] }),
    requiredPrimaryClassifications: ["negligence", "institutional-negligence", "professional-negligence", "human-rights", "disability-accommodation", "employment-human-rights", "housing-human-rights", "education-human-rights", "charter", "government-public-authority", "police-conduct", "defamation", "estate", "other"].includes(issue) ? [domain] : [],
    allowedSecondaryClassifications: issue === "institutional-negligence" ? ["negligence"] : issue === "charter" ? ["civil-human-rights"] : issue === "intentional-tort" ? ["personal-injury"] : issue === "enforcement" ? ["civil-human-rights", "unknown"] : ["contract", "judicial-review", "tribunal-overlap", "privacy", "property", "debt", "employment", "fraud-misrepresentation", "injunction", "motion", "appeal"].includes(issue) ? ["unknown"] : [],
    forbiddenClassifications: ["government-public-authority", "police-conduct"].includes(issue) ? ["civil-charter"] : [],
    reviewRequiredClassifications: ["contract", "judicial-review", "tribunal-overlap", "privacy", "property", "debt", "employment", "fraud-misrepresentation", "intentional-tort", "injunction", "motion", "appeal", "enforcement"].includes(issue) ? [domain] : [],
    requiredOutputText: [issue], expectedEvidenceCategories: ["uploaded-civil-evidence"],
    expectedProofGaps: ["source"], canonical: { required: true, preserveCaseId: `civil-${issue}` }, regression: `Covers the live Civil ${issue} issue, ${role} role, ${stage} stage, and ${document} document choice.`,
  }));
});

const exactReputation = "Someone sent false messages to my uncle and father about me because I was a witness in another person's custody proceeding.";
fixtures.push(
  completeFixture({ id: "collision-reputation-custody-background", selectedCourtPath: "small-claims", role: "Plaintiff / claimant", stage: "starting-case", narrative: exactReputation,
    structuredIntake: smallInput({ issues: ["defamation-reputation"], facts: exactReputation, evidence: "Synthetic screenshots and recipients.", goal: "Address false statements and reputation harm." }),
    requiredPrimaryClassifications: ["defamation"], forbiddenClassifications: ["contract", "family-parenting", "harassment"], regression: "Prevents a custody proceeding mentioned as motive or witness context from overriding a reputation dispute." }),
  completeFixture({ id: "collision-genuine-family-relief", selectedCourtPath: "ai-case-partner", role: "applicant", stage: "starting-case", narrative: "I need a parenting order and child support because the other parent is not paying support.",
    structuredIntake: { courtContext: { courtPath: "small-claims", jurisdiction: "Ontario", stage: "starting-case" } }, requiredPrimaryClassifications: ["family-parenting"], expectedRouteResult: { status: 200, ok: true, routedCourt: "family" },
    requiredQuestions: ["order"], canonical: { required: false }, regression: "Keeps genuine parenting and support relief routed to Family." }),
  completeFixture({ id: "collision-actual-contract", selectedCourtPath: "small-claims", role: "Plaintiff / claimant", stage: "starting-case", narrative: "A written agreement required delivery after payment, but delivery never occurred.",
    structuredIntake: smallInput({ issues: ["contract-dispute"], agreementDetails: "Written delivery agreement.", paymentHistory: "Paid in full.", facts: "A written agreement required delivery after payment, but delivery never occurred." }), requiredPrimaryClassifications: ["contract"], regression: "Preserves contract classification when agreement, obligation, and breach facts exist." }),
  completeFixture({ id: "collision-conversational-agreement", selectedCourtPath: "small-claims", role: "Plaintiff / claimant", stage: "starting-case", narrative: "I agree this conversation happened, but the dispute is a false message sent to a third party.",
    structuredIntake: smallInput({ issues: ["defamation-reputation"], facts: "I agree this conversation happened, but the dispute is a false message sent to a third party.", goal: "Address reputation harm." }), requiredPrimaryClassifications: ["defamation"], forbiddenClassifications: ["contract"], regression: "Prevents conversational use of agreement from becoming a contract claim." }),
  completeFixture({ id: "collision-one-message", selectedCourtPath: "small-claims", role: "Plaintiff / claimant", stage: "starting-case", narrative: "One false message was sent to one recipient.",
    structuredIntake: smallInput({ issues: ["defamation-reputation"], facts: "One false message was sent to one recipient.", goal: "Address the false statement." }), requiredPrimaryClassifications: ["defamation"], forbiddenClassifications: ["harassment"], regression: "Distinguishes one publication from repeated-harassment screening." }),
  completeFixture({ id: "collision-repeated-harassment", selectedCourtPath: "small-claims", role: "Plaintiff / claimant", stage: "starting-case", narrative: "The person repeatedly messages and threatens me after several requests to stop contacting me.",
    structuredIntake: smallInput({ issues: ["harassment-communications"], facts: "The person repeatedly messages and threatens me after several requests to stop contacting me." }), requiredPrimaryClassifications: ["harassment"], regression: "Requires repeated-contact facts for harassment screening." }),
  completeFixture({ id: "collision-public-authority", selectedCourtPath: "civil", role: "applicant", stage: "starting-case", narrative: "A named public authority made a decision affecting the synthetic applicant.",
    structuredIntake: civilInput({ caseId: "civil-public", issues: ["government-public-authority"], yourRole: "applicant", facts: "A named public authority made a decision affecting the synthetic applicant.", governmentActor: "Synthetic municipal agency", publicDecisionOrConduct: "A recorded administrative decision." }),
    requiredPrimaryClassifications: ["civil-institutional-liability"], forbiddenClassifications: ["contract", "civil-charter"], canonical: { required: true, preserveCaseId: "civil-public" }, regression: "Separates public-actor screening from ordinary private disputes." }),
  completeFixture({ id: "collision-private-no-public", selectedCourtPath: "civil", role: "plaintiff", stage: "starting-case", narrative: "Two private people dispute a false statement sent to a neighbour.",
    structuredIntake: civilInput({ caseId: "civil-private", issues: ["defamation"], facts: "Two private people dispute a false statement sent to a neighbour.", legalRemedy: "Compensation" }), requiredPrimaryClassifications: ["defamation"], forbiddenClassifications: ["civil-charter", "civil-institutional-liability"], canonical: { required: true, preserveCaseId: "civil-private" }, regression: "Prevents ordinary private disputes from acquiring public-authority domains." }),
  completeFixture({ id: "collision-witness-versus-role", selectedCourtPath: "small-claims", role: "Plaintiff / claimant", stage: "starting-case", narrative: "The claimant was a witness in another proceeding but is the plaintiff starting this selected case.",
    structuredIntake: smallInput({ issues: ["defamation-reputation"], facts: "A false statement was sent to a third party because the claimant was a witness in another proceeding." }), requiredPrimaryClassifications: ["defamation"], forbiddenClassifications: ["procedural"], regression: "Keeps a witness role in another proceeding separate from the selected case role." }),
  completeFixture({ id: "collision-mixed-relief", selectedCourtPath: "ai-case-partner", role: "not-sure", stage: "starting-case", narrative: "Someone sent false messages about me and I want compensation, but I also need a custody order changing parenting time.",
    structuredIntake: { courtContext: { courtPath: "small-claims", jurisdiction: "Ontario", stage: "starting-case" } }, requiredPrimaryClassifications: ["defamation", "family-parenting"], expectedRouteResult: { status: 200, ok: true, routedCourt: "mixed" }, requiredQuestions: ["main issue"], canonical: { required: false }, regression: "Requires clarification when requested relief genuinely spans court areas." }),
);

for (const [id, deadline, expectedWarning] of [
  ["limitation-known", "A known date is 2026-01-15", "limitation"], ["limitation-unknown", "Unknown", "limitation"],
  ["limitation-recent", "The conduct occurred recently on 2026-07-01", "limitation"], ["limitation-potentially-old", "The conduct may date to 2018", "limitation"],
]) {
  fixtures.push(completeFixture({ id, selectedCourtPath: "civil", role: "plaintiff", stage: "starting-case", narrative: String(deadline),
    structuredIntake: civilInput({ caseId: id, issues: ["other"], limitationDeadline: String(deadline), facts: "A synthetic event requires date verification." }),
    requiredPrimaryClassifications: ["unknown"], requiredWarnings: [String(expectedWarning)], canonical: { required: true, preserveCaseId: id }, regression: `Checks provisional limitation handling for ${id.replace("limitation-", "")} dates without encoding a legal deadline.` }));
}

fixtures.push(
  completeFixture({ id: "coverage-family-evidence-other", selectedCourtPath: "family", role: "applicant", stage: "starting-case", narrative: "An unclear family concern includes a synthetic evidence item categorized as Other.",
    structuredIntake: familyInput({ issues: ["other"], facts: "An unclear family concern includes a synthetic evidence item categorized as Other.", uploadedFiles: [{ id: "family-evidence-other", fileName: "synthetic.txt", originalName: "synthetic.txt", mimeType: "text/plain", sizeBytes: 20, title: "Other evidence", description: "Synthetic uncategorized record.", category: "Other", source: "Synthetic source", notes: "Completes live evidence-category coverage." }] }),
    requiredPrimaryClassifications: ["unknown"], expectedEvidenceCategories: ["Other"], regression: "Completes coverage of the live Family Other evidence category." }),
  completeFixture({ id: "security-small-unknown-field", selectedCourtPath: "small-claims", role: "Plaintiff / claimant", stage: "starting-case", narrative: "Unknown field injection.", structuredIntake: smallInput({ unknownField: "reject" }),
    expectedRouteResult: { status: 400, ok: false }, canonical: { required: false }, regression: "Rejects unknown Small Claims fields." }),
  completeFixture({ id: "security-small-cross-area", selectedCourtPath: "small-claims", role: "Plaintiff / claimant", stage: "starting-case", narrative: "Cross-area injection.", structuredIntake: smallInput({ courtPath: "family" }),
    expectedRouteResult: { status: 400, ok: false }, canonical: { required: false }, regression: "Rejects Family fields injected into Small Claims." }),
  completeFixture({ id: "security-family-cross-area", selectedCourtPath: "family", role: "applicant", stage: "starting-case", narrative: "Cross-area injection.", structuredIntake: familyInput({ courtPath: "civil" }),
    expectedRouteResult: { status: 400, ok: false }, canonical: { required: false }, regression: "Rejects Civil fields injected into Family." }),
  completeFixture({ id: "security-civil-cross-area", selectedCourtPath: "civil", role: "plaintiff", stage: "starting-case", narrative: "Cross-area injection.", structuredIntake: civilInput({ courtPath: "family" }),
    expectedRouteResult: { status: 400, ok: false }, canonical: { required: false }, regression: "Rejects Family fields injected into Civil." }),
  completeFixture({ id: "isolation-civil-owned-preservation", selectedCourtPath: "civil", role: "plaintiff", stage: "starting-case", narrative: "Owned case update.", structuredIntake: civilInput({ caseId: "owned-matrix-case", issues: ["contract"], facts: "A written contract required delivery and delivery failed." }),
    requiredPrimaryClassifications: ["contract"], canonical: { required: true, preserveCaseId: "owned-matrix-case", preserveFields: { title: "Preserved matrix title", status: "paused", userId: "user-alpha" } },
    authentication: { authenticated: true, externalAiAllowed: false, ownership: "owned" }, mode: "civil-owned", regression: "Preserves unrelated canonical fields after verified ownership." }),
  completeFixture({ id: "isolation-civil-denied", selectedCourtPath: "civil", role: "plaintiff", stage: "starting-case", narrative: "Foreign case ID.", structuredIntake: civilInput({ caseId: "user-beta-case" }),
    expectedRouteResult: { status: 404, ok: false }, canonical: { required: false }, authentication: { authenticated: true, externalAiAllowed: false, ownership: "denied" }, mode: "civil-denied", regression: "A supplied case ID cannot load or overwrite another user's case." }),
  completeFixture({ id: "isolation-two-users", selectedCourtPath: "civil", role: "plaintiff", stage: "starting-case", narrative: "Two synthetic owners.", structuredIntake: civilInput({ caseId: "user-alpha-case" }),
    allowedSecondaryClassifications: ["unknown"], canonical: { required: true, preserveCaseId: "user-alpha-case" }, authentication: { authenticated: true, externalAiAllowed: false, ownership: "isolated-users" }, mode: "civil-two-users", regression: "Two authenticated users retain separate selected case IDs and canonical results." }),
  completeFixture({ id: "warnings-relevance-deduplication", selectedCourtPath: "small-claims", role: "Plaintiff / claimant", stage: "starting-case", narrative: exactReputation,
    structuredIntake: smallInput({ issues: ["defamation-reputation"], facts: exactReputation }), requiredPrimaryClassifications: ["defamation"],
    forbiddenWarnings: ["OPENAI_API_KEY", "Family parenting", "public-authority"], regression: "Keeps warnings relevant, bounded, and deduplicated." }),
);

function request(url: string, input: Record<string, unknown>) {
  return new NextRequest(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input }) });
}

async function runRouteFixture(fixture: Fixture): Promise<FixtureRun> {
  if (fixture.mode === "civil-owned") {
    const baseline = await runCivilIntakeCanonicalIntegration(fixture.structuredIntake as any, { allowExternalCognition: false });
    const existingMasterCase = { ...(baseline.masterResultPatch.masterCase as object), ...fixture.canonical.preserveFields };
    let observed = false;
    const handler = createCivilAnalyzePost({ authenticate: async () => ({ id: "user-alpha" }) as never,
      loadOwnedMasterResult: async () => ({ masterCase: existingMasterCase }), hasExternalAiKey: () => false,
      analyze: async (input, options) => { observed = Boolean(options?.allowExternalCognition); return runCivilIntakeCanonicalIntegration(input, { ...options, allowExternalCognition: false }); } });
    const response = await handler(request("http://matrix/api/civil/analyze", fixture.structuredIntake));
    return { fixture, status: response.status, body: await response.json(), externalAiObserved: observed };
  }
  if (fixture.mode === "civil-denied") {
    let observed = false;
    const handler = createCivilAnalyzePost({ authenticate: async () => ({ id: "user-alpha" }) as never,
      loadOwnedMasterResult: async () => null, hasExternalAiKey: () => true,
      analyze: async (input, options) => { observed = true; return runCivilIntakeCanonicalIntegration(input, options); } });
    const response = await handler(request("http://matrix/api/civil/analyze", fixture.structuredIntake));
    return { fixture, status: response.status, body: await response.json(), externalAiObserved: observed };
  }
  if (fixture.mode === "civil-two-users") {
    const secondInput = civilInput({ caseId: "user-beta-case", facts: "A separate synthetic dispute for user beta." });
    const handlerFor = (userId: string, ownedCaseId: string) => createCivilAnalyzePost({
      authenticate: async () => ({ id: userId }) as never,
      loadOwnedMasterResult: async (_request, _user, caseId) => caseId === ownedCaseId ? {} : null,
      hasExternalAiKey: () => false,
    });
    const firstResponse = await handlerFor("user-alpha", "user-alpha-case")(request("http://matrix/api/civil/analyze", fixture.structuredIntake));
    const secondResponse = await handlerFor("user-beta", "user-beta-case")(request("http://matrix/api/civil/analyze", secondInput));
    const firstBody = await firstResponse.json();
    const secondBody = await secondResponse.json();
    return { fixture, status: firstResponse.status, body: { ...firstBody,
      isolationIds: [(firstBody.result?.masterResultPatch?.masterCase as any)?.id, (secondBody.result?.masterResultPatch?.masterCase as any)?.id] }, externalAiObserved: false };
  }
  if (fixture.selectedCourtPath === "ai-case-partner") {
    const response = await aiPartnerPost(new NextRequest("http://matrix/api/ai-case-partner", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: fixture.id, message: fixture.narrative, conversation: [{ role: "user", content: fixture.narrative }], ...fixture.structuredIntake, mode: "verification" }) }));
    return { fixture, status: response.status, body: await response.json(), externalAiObserved: false };
  }
  const url = `http://matrix/api/${fixture.selectedCourtPath}/analyze`;
  const handler = fixture.selectedCourtPath === "small-claims" ? smallClaimsPost : fixture.selectedCourtPath === "family" ? familyPost : civilPost;
  const response = await handler(request(url, fixture.structuredIntake));
  return { fixture, status: response.status, body: await response.json(), externalAiObserved: false };
}

function intelligenceFor(run: FixtureRun): any {
  if (run.fixture.selectedCourtPath === "ai-case-partner") return run.body.conversationIntelligence || {};
  const result = run.body.result || {};
  return run.fixture.selectedCourtPath === "small-claims" ? result.analysis?.intelligence || {} : result.brain?.intelligence || {};
}

function classificationsFor(run: FixtureRun): string[] {
  const intelligence = intelligenceFor(run);
  if (run.fixture.selectedCourtPath === "ai-case-partner") {
    const labels = (intelligence.hypotheses || []).map((item: any) => String(item.label).toLowerCase());
    const domains: string[] = [];
    if (labels.some((label: string) => label.includes("defamation") || label.includes("reputation"))) domains.push("defamation");
    if (labels.some((label: string) => label.includes("contract") || label.includes("payment dispute"))) domains.push("contract");
    if (labels.some((label: string) => label.includes("family parenting") || label.includes("support issue"))) domains.push("family-parenting");
    if (labels.some((label: string) => label.includes("public-authority") || label.includes("crown") || label.includes("police issue"))) domains.push("civil-institutional-liability");
    return [...new Set(domains)];
  }
  const result = run.body.result || {};
  const claims = run.fixture.selectedCourtPath === "small-claims" ? result.analysis?.detectedClaimTypes : intelligence.primaryClaimTypes;
  return [...new Set<string>((claims || []).map((claim: unknown) => String(claim)))];
}

function questionsFor(run: FixtureRun): string[] {
  const intelligence = intelligenceFor(run);
  return [
    intelligence.selectedNextQuestion?.question,
    ...(intelligence.questions || []).map((item: any) => item.question),
    ...(intelligence.missingInformation || []).map((item: any) =>
      typeof item === "string" ? item : item.question,
    ),
  ].filter(Boolean).map(String);
}

function warningsFor(run: FixtureRun): string[] {
  const intelligence = intelligenceFor(run);
  return [...(intelligence.systemWarnings || []), ...(intelligence.legalKnowledge?.sourceWarnings || []), ...(run.body.caseInvestigation?.validation?.warnings || [])].map(String);
}

function canonicalFor(run: FixtureRun): { masterCase?: any; migration?: any; assembly?: any } {
  const result = run.body.result || {};
  const patch = result.masterResultPatch || {};
  return { masterCase: patch.masterCase, migration: patch.courtSimplifiedArchitecture, assembly: patch.caseSystemAssembly };
}

function containsEvery(haystack: string, needles: string[]) { return needles.filter((needle) => !haystack.toLowerCase().includes(needle.toLowerCase())); }

function evaluate(run: FixtureRun): FixtureReport {
  const { fixture, body } = run;
  const mismatches: FixtureReport["mismatches"] = [];
  const reviewNotes = fixture.reviewRequiredClassifications.map((classification) =>
    `${classification}: ${classificationsFor(run).includes(classification) ? "present but mapping remains review-required" : "not emitted; mapping remains review-required"}`,
  );
  const fail = (message: string, category: FailureCategory = "confirmed-production-defect") => mismatches.push({ category, message });
  const classifications = classificationsFor(run);
  const questions = questionsFor(run);
  const warnings = warningsFor(run);
  const fullText = JSON.stringify(body);
  const canonical = canonicalFor(run);
  if (run.status !== fixture.expectedRouteResult.status) fail(`HTTP status expected ${fixture.expectedRouteResult.status}, received ${run.status}`);
  if (Boolean(body.ok) !== fixture.expectedRouteResult.ok) fail(`ok expected ${fixture.expectedRouteResult.ok}, received ${String(body.ok)}`);
  if (fixture.expectedRouteResult.reasoningMode && body.reasoningMode !== fixture.expectedRouteResult.reasoningMode) fail(`reasoningMode expected ${fixture.expectedRouteResult.reasoningMode}, received ${String(body.reasoningMode)}`);
  const routedCourt = body.conversationIntelligence?.conversationFocus?.courtArea;
  if (fixture.expectedRouteResult.routedCourt && routedCourt !== fixture.expectedRouteResult.routedCourt) fail(`routed court expected ${fixture.expectedRouteResult.routedCourt}, received ${String(routedCourt)}`);
  for (const required of fixture.requiredPrimaryClassifications) if (!classifications.includes(required)) fail(`missing required primary classification: ${required}`);
  const permitted = new Set([...fixture.requiredPrimaryClassifications, ...fixture.allowedSecondaryClassifications, ...fixture.reviewRequiredClassifications]);
  for (const actual of classifications) if (!permitted.has(actual) && !fixture.forbiddenClassifications.includes(actual)) fail(`unexpected classification: ${actual}`);
  for (const forbidden of fixture.forbiddenClassifications) if (classifications.includes(forbidden)) fail(`forbidden classification present: ${forbidden}`);
  for (const missing of containsEvery(questions.join("\n"), fixture.requiredQuestions)) fail(`required question text absent: ${missing}`);
  for (const forbidden of fixture.forbiddenQuestions) if (questions.join("\n").toLowerCase().includes(forbidden.toLowerCase())) fail(`forbidden question text present: ${forbidden}`);
  for (const missing of containsEvery(warnings.join("\n"), fixture.requiredWarnings)) fail(`required warning absent: ${missing}`);
  for (const forbidden of fixture.forbiddenWarnings) if (warnings.join("\n").toLowerCase().includes(forbidden.toLowerCase())) fail(`forbidden warning present: ${forbidden}`);
  const systemWarnings = (intelligenceFor(run).systemWarnings || []).map(String);
  const knowledgeWarnings = (intelligenceFor(run).legalKnowledge?.sourceWarnings || []).map(String);
  if (new Set(systemWarnings).size !== systemWarnings.length) fail(`duplicate system warnings present (${systemWarnings.length - new Set(systemWarnings).size} duplicate entries)`);
  if (new Set(knowledgeWarnings).size !== knowledgeWarnings.length) fail(`duplicate knowledge warnings present (${knowledgeWarnings.length - new Set(knowledgeWarnings).size} duplicate entries)`);
  for (const missing of containsEvery(fullText, fixture.requiredOutputText)) fail(`selected issue absent from output: ${missing}`);
  for (const missing of containsEvery(fullText, fixture.expectedEvidenceCategories)) fail(`expected evidence category absent: ${missing}`);
  for (const missing of containsEvery(fullText, fixture.expectedProofGaps)) fail(`expected proof-gap text absent: ${missing}`);
  if (fixture.canonical.required) {
    if (!canonical.masterCase) fail("canonical masterCase absent");
    if (!canonical.migration || canonical.migration.migrationLayer !== "BrainMigrationLayer") fail("BrainMigrationLayer marker absent");
    if (!canonical.assembly) fail("caseSystemAssembly absent");
    if (canonical.masterCase?.courtPath !== (fixture.selectedCourtPath === "ai-case-partner" ? undefined : fixture.selectedCourtPath)) fail(`canonical courtPath mismatch: ${String(canonical.masterCase?.courtPath)}`);
  }
  if (fixture.canonical.preserveCaseId && canonical.masterCase?.id !== fixture.canonical.preserveCaseId) fail(`case ID expected ${fixture.canonical.preserveCaseId}, received ${String(canonical.masterCase?.id)}`);
  for (const [key, expected] of Object.entries(fixture.canonical.preserveFields || {})) if (JSON.stringify(canonical.masterCase?.[key]) !== JSON.stringify(expected)) fail(`unrelated masterCase field not preserved: ${key}`);
  if (fixture.authentication.ownership === "isolated-users" && JSON.stringify(body.isolationIds) !== JSON.stringify(["user-alpha-case", "user-beta-case"])) fail(`two-user isolation IDs incorrect: ${JSON.stringify(body.isolationIds)}`);
  if (body.authenticated !== undefined && Boolean(body.authenticated) !== fixture.authentication.authenticated) fail(`authenticated expected ${fixture.authentication.authenticated}, received ${String(body.authenticated)}`);
  if (run.externalAiObserved === true && !fixture.authentication.externalAiAllowed) fail("external AI became eligible contrary to fixture expectation");
  return { id: fixture.id, area: fixture.selectedCourtPath, status: mismatches.length ? "FAIL" : reviewNotes.length ? "REVIEW" : "PASS", classifications: classifications.join(", ") || "(none)", mismatches, reviewNotes };
}

async function main() {
  const reports: FixtureReport[] = [];
  for (const fixture of fixtures) {
    try { reports.push(evaluate(await runRouteFixture(fixture))); }
    catch (error) { reports.push({ id: fixture.id, area: fixture.selectedCourtPath, status: "FAIL", classifications: "(route error)", mismatches: [{ category: "evaluator-defect", message: `route execution error: ${error instanceof Error ? error.message : String(error)}` }], reviewNotes: [] }); }
  }
  console.table(reports.map(({ id, area, status, classifications }) => ({ ID: id, Area: area, Result: status, Classifications: classifications })));
  const failures = reports.filter((report) => report.status === "FAIL");
  if (failures.length) {
    console.error("\nCASE OUTCOME MATRIX MISMATCHES");
    for (const report of failures) {
      const fixture = fixtures.find((item) => item.id === report.id)!;
      console.error(`\n[${report.id}] ${fixture.regression}`);
      for (const mismatch of report.mismatches) console.error(`  - [${mismatch.category}] ${mismatch.message}`);
    }
  }
  const reviews = reports.filter((report) => report.status === "REVIEW");
  if (reviews.length) {
    console.log("\nCASE OUTCOME MATRIX REVIEW-REQUIRED RESULTS");
    for (const report of reviews) {
      console.log(`\n[${report.id}]`);
      for (const note of report.reviewNotes) console.log(`  - [product-or-legal-review-required] ${note}`);
    }
  }
  const counts = fixtures.reduce<Record<string, number>>((acc, fixture) => { acc[fixture.selectedCourtPath] = (acc[fixture.selectedCourtPath] || 0) + 1; return acc; }, {});
  console.log(`\nFixture totals: ${fixtures.length} total; ${Object.entries(counts).map(([area, count]) => `${area}=${count}`).join(", ")}.`);
  console.log(`Outcome totals: PASS=${reports.filter((report) => report.status === "PASS").length}; FAIL=${failures.length}; REVIEW=${reviews.length}.`);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
