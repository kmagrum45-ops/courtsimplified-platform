export type CourtPath = "family" | "small-claims" | "civil";

export type UniversalStage =
  | "starting-case"
  | "responding"
  | "already-started"
  | "conference"
  | "motion"
  | "trial"
  | "enforcement"
  | "urgent"
  | "not-sure";

export type AnalysisResult = {
  courtPath: CourtPath;
  caseStage: string;

  completedForms: string[];
  receivedForms: string[];
  requiredNextForms: string[];
  notNeededNow: string[];

  detectedIssues: string[];
  inferredFacts: string[];
  missingInformation: string[];
  risksAndGaps: string[];
  guidance: string[];
  summary: string;

  legalIssues?: string[];
  proceduralStageReasoning?: string[];
  timelineAnalysis?: string[];
  evidenceStrengths?: string[];
  evidenceWeaknesses?: string[];
  missingEvidence?: string[];
  deadlineRisks?: string[];
  serviceRisks?: string[];
  partyRisks?: string[];
  jurisdictionRisks?: string[];
  limitationRisks?: string[];
  opposingArguments?: string[];
  courtConcerns?: string[];
  recommendedQuestions?: string[];
  caseStrategy?: string[];
  casePackageItems?: string[];
  documentUploadRequests?: string[];
  nextBestActions?: string[];
  userWarnings?: string[];
};

export type StoredCaseData = {
  courtPath: CourtPath;
  pathLabel: string;
  caseStage: UniversalStage;
  yourName: string;
  otherParty: string;
  facts: string;
  timeline: string;
  evidence: string;
  missingEvidence: string;
  goal: string;
  urgent: string;
  analysis: AnalysisResult;
  extra: Record<string, unknown>;
};

export function cleanList(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

export function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function hasMeaningfulText(value: string) {
  return value.trim().length > 8;
}

export function getPathLabel(path: CourtPath) {
  if (path === "family") return "Family";
  if (path === "small-claims") return "Small Claims";
  return "Civil";
}

export function getStageLabel(stage: UniversalStage) {
  const labels: Record<UniversalStage, string> = {
    "starting-case": "Starting a new case",
    responding: "Responding to a case",
    "already-started": "Case already started",
    conference: "Conference / settlement step",
    motion: "Motion stage",
    trial: "Trial preparation",
    enforcement: "Enforcement",
    urgent: "Urgent issue",
    "not-sure": "Stage unclear",
  };

  return labels[stage];
}