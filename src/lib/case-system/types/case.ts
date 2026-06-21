export type CourtSimplifiedCasePath =
  | "family"
  | "small-claims"
  | "civil"
  | "tribunal"
  | "ltb"
  | "immigration"
  | "criminal-related"
  | "unknown";

export type LitigationStage =
  | "intake"
  | "pre-filing"
  | "starting-case"
  | "responding"
  | "already-started"
  | "conference"
  | "motion"
  | "urgent-motion"
  | "trial-preparation"
  | "trial"
  | "enforcement"
  | "appeal-or-review"
  | "closed"
  | "not-sure";

export type PartyRole =
  | "applicant"
  | "respondent"
  | "plaintiff"
  | "defendant"
  | "claimant"
  | "moving-party"
  | "responding-party"
  | "witness"
  | "third-party"
  | "unknown";

export type EvidenceStrength =
  | "strong"
  | "moderate"
  | "partial"
  | "weak"
  | "unknown";

export type RiskSeverity = "low" | "medium" | "high" | "critical";

export type CaseReadinessLevel =
  | "not-ready"
  | "developing"
  | "organized"
  | "filing-ready"
  | "conference-ready"
  | "hearing-ready"
  | "trial-ready";

export type CasePerson = {
  id: string;
  fullName: string;
  role: PartyRole;
  email?: string;
  phone?: string;
  address?: string;
  lawyerName?: string;
  isSelfRepresented?: boolean;
  notes?: string;
};

export type CaseIssue = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  legalTheory?: string;
  legalElements: string[];
  linkedEvidenceIds: string[];
  linkedTimelineEventIds: string[];
  linkedFormIds: string[];
  unresolvedGaps: string[];
  risks: string[];
  userWording?: string;
  improvedCourtWording?: string;
};

export type CaseTimelineEvent = {
  id: string;
  date?: string;
  title: string;
  description?: string;
  source?: string;
  linkedIssueIds: string[];
  linkedEvidenceIds: string[];
  confidence: EvidenceStrength;
};

export type CaseEvidenceItem = {
  id: string;
  title: string;
  type:
    | "document"
    | "screenshot"
    | "message"
    | "email"
    | "photo"
    | "video"
    | "audio"
    | "record"
    | "court-form"
    | "witness"
    | "receipt"
    | "contract"
    | "other";
  description?: string;
  date?: string;
  source?: string;
  fileName?: string;
  filePath?: string;
  contentText?: string;
  relevance?: string;
  linkedIssueIds: string[];
  linkedTimelineEventIds: string[];
  proves: string[];
  doesNotProve: string[];
  weaknesses: string[];
  contradictions: string[];
  strength: EvidenceStrength;
};

export type ProofMapItem = {
  id: string;
  issueId: string;
  element: string;
  requiredProof: string;
  supportingEvidenceIds: string[];
  missingProof: string[];
  riskLevel: RiskSeverity;
  notes?: string;
};

export type CaseRisk = {
  id: string;
  title: string;
  description: string;
  severity: RiskSeverity;
  source:
    | "intake"
    | "evidence"
    | "timeline"
    | "legal-theory"
    | "procedure"
    | "forms"
    | "strategy"
    | "court-package";
  suggestedFix?: string;
};

export type CaseFormNeed = {
  id: string;
  formNumber?: string;
  title: string;
  reason: string;
  stage: LitigationStage | "general";
  status:
    | "needed-now"
    | "not-needed-yet"
    | "already-completed"
    | "possibly-needed"
    | "not-applicable"
    | "unknown";
  linkedIssueIds: string[];
  linkedEvidenceIds: string[];
};

export type ProceduralIntelligence = {
  likelyForumIssues: string[];
  limitationConcerns: string[];
  urgencyConcerns: string[];
  serviceConcerns: string[];
  disclosureConcerns: string[];
  nextProceduralFocus: string[];
  pathwayWarnings: string[];
};

export type StrategyProfile = {
  strengths: string[];
  weaknesses: string[];
  likelyOtherSideArguments: string[];
  likelyJudgeConcerns: string[];
  suggestedWordingImprovements: string[];
  settlementConsiderations: string[];
  nextStrategicSteps: string[];
};

export type CourtPackagePlan = {
  packageSections: string[];
  exhibitOrder: string[];
  missingPackageItems: string[];
  filingNotes: string[];
  serviceNotes: string[];
  exportNotes: string[];
};

export type CaseReadiness = {
  level: CaseReadinessLevel;
  score: number;
  reasons: string[];
  blockers: string[];
};

export type CaseAiMemory = {
  plainLanguageSummary: string;
  structuredSummary: string;
  userGoals: string[];
  importantFacts: string[];
  unresolvedQuestions: string[];
  warningsForAi: string[];
  lastUpdatedByEngine?: string;
};

export type CaseFile = {
  id: string;
  userId?: string;

  createdAt: string;
  updatedAt: string;

  casePath: CourtSimplifiedCasePath;
  province?: string;
  jurisdiction?: string;
  courtOrTribunal?: string;

  stage: LitigationStage;
  userRole: PartyRole;

  title: string;
  summary: string;

  parties: CasePerson[];
  facts: string[];
  issues: CaseIssue[];
  timeline: CaseTimelineEvent[];
  evidence: CaseEvidenceItem[];
  proofMap: ProofMapItem[];

  formNeeds: CaseFormNeed[];
  risks: CaseRisk[];

  proceduralIntelligence: ProceduralIntelligence;
  strategy: StrategyProfile;
  courtPackage: CourtPackagePlan;
  readiness: CaseReadiness;
  aiMemory: CaseAiMemory;

  domainData?: {
    family?: unknown;
    civil?: unknown;
    smallClaims?: unknown;
    tribunal?: unknown;
    ltb?: unknown;
    immigration?: unknown;
  };
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyCaseFile(
  overrides: Partial<CaseFile> = {},
): CaseFile {
  const now = new Date().toISOString();

  return {
    id: overrides.id || createId("case"),
    userId: overrides.userId,

    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,

    casePath: overrides.casePath || "unknown",
    province: overrides.province || "Ontario",
    jurisdiction: overrides.jurisdiction || "",
    courtOrTribunal: overrides.courtOrTribunal || "",

    stage: overrides.stage || "intake",
    userRole: overrides.userRole || "unknown",

    title: overrides.title || "Untitled case",
    summary: overrides.summary || "",

    parties: overrides.parties || [],
    facts: overrides.facts || [],
    issues: overrides.issues || [],
    timeline: overrides.timeline || [],
    evidence: overrides.evidence || [],
    proofMap: overrides.proofMap || [],

    formNeeds: overrides.formNeeds || [],
    risks: overrides.risks || [],

    proceduralIntelligence:
      overrides.proceduralIntelligence || {
        likelyForumIssues: [],
        limitationConcerns: [],
        urgencyConcerns: [],
        serviceConcerns: [],
        disclosureConcerns: [],
        nextProceduralFocus: [],
        pathwayWarnings: [],
      },

    strategy:
      overrides.strategy || {
        strengths: [],
        weaknesses: [],
        likelyOtherSideArguments: [],
        likelyJudgeConcerns: [],
        suggestedWordingImprovements: [],
        settlementConsiderations: [],
        nextStrategicSteps: [],
      },

    courtPackage:
      overrides.courtPackage || {
        packageSections: [],
        exhibitOrder: [],
        missingPackageItems: [],
        filingNotes: [],
        serviceNotes: [],
        exportNotes: [],
      },

    readiness:
      overrides.readiness || {
        level: "not-ready",
        score: 0,
        reasons: [],
        blockers: [],
      },

    aiMemory:
      overrides.aiMemory || {
        plainLanguageSummary: "",
        structuredSummary: "",
        userGoals: [],
        importantFacts: [],
        unresolvedQuestions: [],
        warningsForAi: [],
      },

    domainData: overrides.domainData || {},
  };
}

export function updateCaseFileTimestamp(caseFile: CaseFile): CaseFile {
  return {
    ...caseFile,
    updatedAt: new Date().toISOString(),
  };
}