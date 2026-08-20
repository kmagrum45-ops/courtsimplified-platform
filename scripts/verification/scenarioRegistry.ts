export type CourtPath = "small-claims" | "family" | "civil";

export type RegistryScenario = {
  id: string;
  courtPath: CourtPath;
  intakeFacts: Record<string, unknown>;
  stage: string;
  role: string;
  filedServiceFacts: string[];
  evidenceFacts: string[];
  intentionalGaps: string[];
  contradictions: string[];
  expectedPossibleIssues: string[];
  expectedNextQuestion: string;
  expectedEvidenceGuidance: string[];
  expectedProceduralStatus: string[];
  reviewRequiredBoundaries: string[];
  prohibitedOutputWording: string[];
  expectedWorkflowAction: "organize-evidence" | "review-intake-details" | "check-official-forms-and-procedure";
  expectedPrivacySessionBehavior: string;
};

export const REGISTRY_SEED = 20260814;
const prohibited = ["fallback", "configuration", "Master Case ID", "Save: Waiting", "analysis unavailable", "will win", "entitled to damages"];
const stages = ["starting-case", "responding", "already-started", "conference", "motion", "trial", "enforcement", "not-sure", "service-uncertain", "default-review"];

function idPrefix(area: CourtPath) { return area === "small-claims" ? "SC" : area === "family" ? "FAM" : "CIV"; }

function baseScenario(area: CourtPath, index: number): RegistryScenario {
  const stage = stages[index % stages.length];
  const role = area === "small-claims" ? (index % 2 ? "Plaintiff / claimant" : "Defendant / responding party") : area === "family" ? (index % 2 ? "applicant" : "respondent") : (index % 2 ? "plaintiff" : "defendant");
  const defaultReview = area === "small-claims" && index === 0;
  const adultAdoption = area === "family" && index === 0;
  const minorAdoption = area === "family" && index === 1;
  const id = defaultReview ? "SC-DEFAMATION-FILED-SERVED-DEFAULT-001" : adultAdoption ? "FAM-ADOPTION-ADULT-001" : minorAdoption ? "FAM-ADOPTION-MINOR-CHILD-PROTECTION-001" : `${idPrefix(area)}-${String(index + 1).padStart(3, "0")}`;
  const facts = defaultReview
    ? "Synthetic alleged false text messages were communicated to an uncle and father."
    : adultAdoption
      ? "A 20-year-old adult wishes to be adopted by a long-term step-parent after living with her mother and step-parent for approximately 15 years. The biological father has not been involved for years and cannot currently be located."
      : minorAdoption
        ? "A proposed adoption involves a minor and an existing child-protection file that requires review."
        : `Synthetic ${area} matter ${index + 1}; saved facts require a focused review.`;
  const filedServiceFacts = defaultReview ? ["Plaintiff’s Claim filed and served", "Affidavit of Service filed with the court"] : [];
  const expectedIssue = defaultReview ? "Possible defamation or reputational-harm issue to review" : adultAdoption ? "Possible adult step-parent adoption process to review" : minorAdoption ? "Review required: minor adoption and child-protection circumstances" : `Possible issue to review: synthetic ${area} issue ${index + 1}`;
  return {
    id,
    courtPath: area,
    intakeFacts: {
      province: index === 28 ? "not-sure" : "Ontario",
      city: "Ottawa",
      facts,
      amountClaimed: area === "small-claims" ? "$10,000" : undefined,
      issueLabels: adultAdoption || minorAdoption ? ["Adoption — step-parent, relative, or adult adoption"] : undefined,
    },
    stage: defaultReview ? "already-started" : stage,
    role: adultAdoption ? "step-parent applicant" : role,
    filedServiceFacts,
    evidenceFacts: defaultReview ? ["screenshots/message threads"] : adultAdoption ? ["family relationship and living-history information"] : [],
    intentionalGaps: defaultReview ? ["Defence status"] : adultAdoption ? ["Adult person’s agreement"] : minorAdoption ? ["Child-protection circumstances"] : ["important date"],
    contradictions: index % 10 === 0 ? ["Synthetic conflicting date requires review"] : [],
    expectedPossibleIssues: [expectedIssue],
    expectedNextQuestion: defaultReview ? "Has the defendant filed a Defence?" : adultAdoption ? "Does the adult person freely agree to the proposed adoption?" : "What important fact should be confirmed next?",
    expectedEvidenceGuidance: defaultReview ? ["full message threads", "sender", "recipients", "dates/context", "falsity", "harm"] : adultAdoption ? ["full legal names", "Ontario residence", "living-history", "written wishes", "biological father", "reasonable efforts", "child-protection documents"] : ["supporting records"],
    expectedProceduralStatus: defaultReview ? ["Claim already filed and served", "Affidavit of Service recorded as filed with the court"] : filedServiceFacts,
    reviewRequiredBoundaries: ["No legal outcome is decided.", "Procedure and forms require verified official-source support."],
    prohibitedOutputWording: defaultReview ? [...prohibited, "recreate the Affidavit of Service", "upload the Affidavit of Service", "photocopy the Affidavit of Service", "re-file the Affidavit of Service"] : prohibited,
    expectedWorkflowAction: index % 3 === 0 ? "organize-evidence" : index % 3 === 1 ? "review-intake-details" : "check-official-forms-and-procedure",
    expectedPrivacySessionBehavior: index % 2 ? "logged-out intake remains tab-scoped and is not a shared draft" : "saved drafts remain scoped to the authenticated owner and selected case",
  };
}

export const baseScenarios: RegistryScenario[] = (["small-claims", "family", "civil"] as const).flatMap((area) => Array.from({ length: 30 }, (_, index) => baseScenario(area, index)));

function hash(value: string): number { let result = REGISTRY_SEED; for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619); return result >>> 0; }

export function generatedVariations(count = 3000) {
  return Array.from({ length: count }, (_, index) => {
    const base = baseScenarios[index % baseScenarios.length];
    const variation = hash(`${base.id}:${index}`) % 10;
    return { id: `${base.id}-V${String(index + 1).padStart(4, "0")}`, baseId: base.id, seed: REGISTRY_SEED, variation, courtPath: base.courtPath, expectedWorkflowAction: base.expectedWorkflowAction, prohibitedOutputWording: base.prohibitedOutputWording };
  });
}
