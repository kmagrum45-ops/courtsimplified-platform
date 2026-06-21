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

export type BuilderConfidence =
  | "very-low"
  | "low"
  | "medium"
  | "high"
  | "very-high";

export type BuilderSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type BuilderIntelligenceItem = {
  id?: string;

  title?: string;
  label?: string;
  text?: string;
  description?: string;
  explanation?: string;
  reason?: string;
  suggestedFix?: string;

  question?: string;
  argument?: string;
  concern?: string;
  whyItMatters?: string;
  responseStrategy?: string;
  howToAddress?: string;
  whyJudgeMayCare?: string;

  field?: string;
  source?: string;
  claimType?: string;

  severity?: BuilderSeverity;
  confidence?: BuilderConfidence;

  evidenceNeeded?: string[];
  affectedFields?: string[];
  missingEvidence?: string[];
  warnings?: string[];
};

export type BuilderEvidenceIssue = {
  id?: string;
  issueLabel: string;
  claimType?: string;
  requiredProof?: string;
  availableEvidenceIds?: string[];
  missingEvidence?: string[];
  strength?: BuilderConfidence;
  explanation?: string;
};

export type BuilderClaimClassification = {
  id?: string;
  claimType: string;
  status: string;
  score?: number;
  confidence?: BuilderConfidence;
  explanation?: string;
  rejectedBecause?: string[];
};

export type BuilderProceduralPosture = {
  stage?: UniversalStage | string;
  courtPath?: CourtPath | string;
  province?: string;
  confidence?: BuilderConfidence;
  reasons?: string[];
  missingProcedureInfo?: string[];
  nextProceduralQuestions?: string[];
  warnings?: string[];
};

export type BuilderFormRecommendation = {
  id?: string;
  formNumber?: string;
  title: string;
  courtPath?: CourtPath | string;
  stage?: UniversalStage | string;
  reason?: string;
  confidence?: BuilderConfidence;
  notRecommendedForms?: string[];
  warnings?: string[];
};

export type BuilderLegalIntelligenceSnapshot = {
  id?: string;
  confidence?: BuilderConfidence;

  primaryClaimTypes?: string[];
  rejectedFalsePositives?: BuilderClaimClassification[];
  claimClassifications?: BuilderClaimClassification[];

  proceduralPosture?: BuilderProceduralPosture;

  evidenceIssueLinks?: BuilderEvidenceIssue[];

  contradictions?: BuilderIntelligenceItem[];
  missingInformation?: BuilderIntelligenceItem[];
  litigationRisks?: BuilderIntelligenceItem[];
  opposingArguments?: BuilderIntelligenceItem[];
  judgeConcerns?: BuilderIntelligenceItem[];
  formRecommendations?: BuilderFormRecommendation[];

  plainLanguageSummary?: string;
  structuredCaseSummary?: string;
  nextBestActions?: string[];
  systemWarnings?: string[];

  normalizedIntake?: any;
  legalKnowledge?: any;
};

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

  detectedClaimTypes?: string[];
  damagesIssues?: string[];
  proceduralRisks?: string[];
  defenceAttacks?: string[];
  judgeConcerns?: string[];
  suggestedFocus?: string[];

  detectedFamilyIssues?: string[];
  bestInterestsFactors?: string[];
  parentingStrengths?: string[];
  parentingWeaknesses?: string[];
  missingParentingInfo?: string[];
  safetyFlags?: string[];
  supportFinancialIssues?: string[];
  likelyOtherSideArguments?: string[];
  likelyJudgeConcerns?: string[];
  recommendedEvidence?: string[];
  recommendedFamilyNextSteps?: string[];
  suggestedWordingImprovements?: string[];

  intelligence?: BuilderLegalIntelligenceSnapshot;
  intelligenceSummary?: string;
  structuredIntelligenceSummary?: string;
  intelligenceWarnings?: string[];
  intelligenceNextActions?: string[];
  intelligenceEvidenceIssues?: BuilderEvidenceIssue[];
  intelligenceFormRecommendations?: BuilderFormRecommendation[];
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

  intelligence?: BuilderLegalIntelligenceSnapshot;
  masterResultPatch?: any;
  dashboardPatch?: any;
  recommendedNextRoute?: string;
};

export function cleanList(items: string[]) {
  return Array.from(
    new Set(items.filter(Boolean).map((item) => item.trim()).filter(Boolean)),
  );
}

export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
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

export function normalizeBuilderStage(stage?: string): UniversalStage {
  if (
    stage === "starting-case" ||
    stage === "responding" ||
    stage === "already-started" ||
    stage === "conference" ||
    stage === "motion" ||
    stage === "trial" ||
    stage === "enforcement" ||
    stage === "urgent" ||
    stage === "not-sure"
  ) {
    return stage;
  }

  return "not-sure";
}

function itemToText(item: BuilderIntelligenceItem): string {
  return (
    item.question ||
    item.argument ||
    item.concern ||
    item.title ||
    item.label ||
    item.description ||
    item.explanation ||
    item.reason ||
    item.text ||
    ""
  ).trim();
}

function riskToText(item: BuilderIntelligenceItem): string {
  const main =
    item.title ||
    item.label ||
    item.description ||
    item.explanation ||
    item.text ||
    "";

  if (item.suggestedFix && main) {
    return `${main}: ${item.suggestedFix}`;
  }

  return item.suggestedFix || main;
}

function opposingArgumentToText(item: BuilderIntelligenceItem): string {
  if (item.argument && item.responseStrategy) {
    return `${item.argument} Response strategy: ${item.responseStrategy}`;
  }

  return itemToText(item);
}

function judgeConcernToText(item: BuilderIntelligenceItem): string {
  if (item.concern && item.howToAddress) {
    return `${item.concern} How to address it: ${item.howToAddress}`;
  }

  return itemToText(item);
}

export function mapIntelligenceToAnalysisPatch(
  intelligence?: BuilderLegalIntelligenceSnapshot,
): Partial<AnalysisResult> {
  if (!intelligence) return {};

  const detectedClaimTypes = intelligence.primaryClaimTypes || [];

  const missingInformation = cleanList(
    (intelligence.missingInformation || []).map(itemToText),
  );

  const risksAndGaps = cleanList(
    [
      ...(intelligence.litigationRisks || []).map(riskToText),
      ...(intelligence.contradictions || []).map(riskToText),
    ],
  );

  const opposingArguments = cleanList(
    (intelligence.opposingArguments || []).map(opposingArgumentToText),
  );

  const judgeConcerns = cleanList(
    (intelligence.judgeConcerns || []).map(judgeConcernToText),
  );

  const requiredNextForms = cleanList(
    (intelligence.formRecommendations || []).map((form) =>
      form.formNumber ? `${form.formNumber} — ${form.title}` : form.title,
    ),
  );

  const missingEvidence = cleanList(
    (intelligence.evidenceIssueLinks || []).flatMap((issue) =>
      issue.missingEvidence && issue.missingEvidence.length > 0
        ? issue.missingEvidence
        : [],
    ),
  );

  const evidenceWeaknesses = cleanList(
    (intelligence.evidenceIssueLinks || []).map((issue) =>
      issue.explanation
        ? `${issue.issueLabel}: ${issue.explanation}`
        : issue.issueLabel,
    ),
  );

  return {
    detectedClaimTypes,
    detectedIssues: detectedClaimTypes,
    legalIssues: detectedClaimTypes,

    missingInformation,
    risksAndGaps,

    opposingArguments,
    defenceAttacks: opposingArguments,

    judgeConcerns,
    courtConcerns: judgeConcerns,

    requiredNextForms,

    missingEvidence,
    evidenceWeaknesses,

    summary:
      intelligence.structuredCaseSummary ||
      intelligence.plainLanguageSummary ||
      "",

    guidance: intelligence.nextBestActions || [],
    nextBestActions: intelligence.nextBestActions || [],
    userWarnings: intelligence.systemWarnings || [],

    intelligence,
    intelligenceSummary: intelligence.plainLanguageSummary,
    structuredIntelligenceSummary: intelligence.structuredCaseSummary,
    intelligenceWarnings: intelligence.systemWarnings || [],
    intelligenceNextActions: intelligence.nextBestActions || [],
    intelligenceEvidenceIssues: intelligence.evidenceIssueLinks || [],
    intelligenceFormRecommendations: intelligence.formRecommendations || [],
  };
}