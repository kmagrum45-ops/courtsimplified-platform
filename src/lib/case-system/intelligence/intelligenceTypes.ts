export type CourtSimplifiedIntelligenceVersion =
  | "1.0.0"
  | "2.0.0";

export type IntelligenceCourtPath =
  | "family"
  | "small-claims"
  | "civil"
  | "tribunal"
  | "ltb"
  | "immigration"
  | "criminal-related"
  | "unknown";

export type IntelligenceProvince =
  | "Ontario"
  | "Alberta"
  | "British Columbia"
  | "Manitoba"
  | "New Brunswick"
  | "Newfoundland and Labrador"
  | "Northwest Territories"
  | "Nova Scotia"
  | "Nunavut"
  | "Prince Edward Island"
  | "Quebec"
  | "Saskatchewan"
  | "Yukon"
  | "Federal"
  | "Unknown";

export type IntelligenceStage =
  | "starting-case"
  | "responding"
  | "already-started"
  | "conference"
  | "motion"
  | "trial"
  | "enforcement"
  | "appeal"
  | "urgent"
  | "settlement"
  | "not-sure";

export type IntelligenceConfidence =
  | "very-low"
  | "low"
  | "medium"
  | "high"
  | "very-high";

export type IntelligenceSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type IntelligenceSourceType =
  | "user-intake"
  | "chat-message"
  | "uploaded-document"
  | "form-answer"
  | "evidence"
  | "system-inference"
  | "ai-extraction"
  | "manual-review"
  | "verified-law-source"
  | "court-rule"
  | "statute"
  | "precedent"
  | "official-form-guide";

export type LegalDomain =
  | "defamation"
  | "contract"
  | "property-damage"
  | "negligence"
  | "personal-injury"
  | "harassment"
  | "employment"
  | "debt"
  | "consumer"
  | "family-parenting"
  | "family-support"
  | "family-property"
  | "family-safety"
  | "civil-charter"
  | "civil-human-rights"
  | "civil-institutional-liability"
  | "landlord-tenant"
  | "immigration"
  | "procedural"
  | "unknown";

export type LegalAuthorityLevel =
  | "constitutional"
  | "statute"
  | "regulation"
  | "rule-of-court"
  | "scc-binding"
  | "court-of-appeal-binding"
  | "superior-court-persuasive"
  | "provincial-court-persuasive"
  | "tribunal-persuasive"
  | "official-guide"
  | "secondary-source"
  | "unknown";

export type LegalSourceVerificationStatus =
  | "verified"
  | "needs-review"
  | "outdated-risk"
  | "overruled-risk"
  | "not-verified"
  | "do-not-use";

export type LegalSourceReference = {
  id: string;
  title: string;
  citation?: string;
  sourceUrl?: string;
  sourceName:
    | "CanLII"
    | "Court Website"
    | "Government Website"
    | "Rules Website"
    | "Statute Database"
    | "Tribunal Website"
    | "Internal Verified Library"
    | "Unknown";
  jurisdiction: IntelligenceProvince | "Canada" | "Unknown";
  authorityLevel: LegalAuthorityLevel;
  verificationStatus: LegalSourceVerificationStatus;
  lastVerifiedAt?: string;
  legalDomains: LegalDomain[];
  summary: string;
  useLimits: string[];
  doNotUseFor: string[];
};

export type PrecedentReference = LegalSourceReference & {
  neutralCitation?: string;
  court?: string;
  year?: number;
  coreHolding: string;
  materialFacts: string[];
  legalTest?: string[];
  supports: string[];
  limits: string[];
  distinguishingFactors: string[];
  requiredFactPattern: string[];
  riskIfMisused: string[];
};

export type StatutoryReference = LegalSourceReference & {
  statuteName: string;
  section?: string;
  provisionTextSummary: string;
  requiredConditions: string[];
  proceduralEffect: string[];
  remediesAffected: string[];
};

export type ProceduralRuleReference = LegalSourceReference & {
  ruleSetName: string;
  ruleNumber?: string;
  appliesToStages: IntelligenceStage[];
  deadlineRelated: boolean;
  serviceRelated: boolean;
  filingRelated: boolean;
  evidenceRelated: boolean;
  practicalEffect: string[];
};

export type RemedyType =
  | "money-damages"
  | "general-damages"
  | "special-damages"
  | "aggravated-damages"
  | "punitive-damages"
  | "statutory-damages"
  | "injunction"
  | "declaration"
  | "apology"
  | "retraction"
  | "parenting-order"
  | "support-order"
  | "property-division"
  | "dismissal"
  | "costs"
  | "interest"
  | "enforcement-order"
  | "unknown";

export type BurdenOfProofStandard =
  | "balance-of-probabilities"
  | "clear-and-convincing"
  | "beyond-reasonable-doubt"
  | "statutory-test"
  | "best-interests"
  | "unknown";

export type BurdenOfProofAssessment = {
  id: string;
  claimType: LegalDomain;
  issueLabel: string;
  partyWithBurden: "user" | "other-side" | "shared" | "unknown";
  standard: BurdenOfProofStandard;
  whatMustBeProven: string[];
  currentProofStrength: IntelligenceConfidence;
  missingProof: string[];
  evidenceIds: string[];
  explanation: string;
};

export type ClaimClassificationStatus =
  | "detected"
  | "possible"
  | "insufficient-facts"
  | "rejected-false-positive"
  | "conflicting-signals";

export type LegalSignalPolarity =
  | "supports"
  | "weakens"
  | "neutral"
  | "contradicts";

export type LegalSignal = {
  id: string;
  label: string;
  domain: LegalDomain;
  polarity: LegalSignalPolarity;
  weight: number;
  confidence: IntelligenceConfidence;
  sourceType: IntelligenceSourceType;
  sourceText?: string;
  explanation: string;
};

export type ExtractedPartyRole =
  | "applicant"
  | "respondent"
  | "plaintiff"
  | "defendant"
  | "claimant"
  | "other-side"
  | "witness"
  | "recipient"
  | "child"
  | "parent"
  | "institution"
  | "unknown";

export type ExtractedParty = {
  id: string;
  name?: string;
  role: ExtractedPartyRole;
  description?: string;
  isUser?: boolean;
  confidence: IntelligenceConfidence;
  sourceText?: string;
};

export type ExtractedDate = {
  id: string;
  rawText: string;
  normalizedDate?: string;
  label?: string;
  confidence: IntelligenceConfidence;
  sourceText?: string;
};

export type ExtractedMoneyAmount = {
  id: string;
  amount?: number;
  currency: "CAD" | "USD" | "unknown";
  rawText: string;
  label:
    | "damages-claimed"
    | "repair-cost"
    | "debt-amount"
    | "income"
    | "support"
    | "expense"
    | "court-fee"
    | "costs"
    | "unknown";
  confidence: IntelligenceConfidence;
  sourceText?: string;
};

export type ExtractedEvidenceType =
  | "screenshot"
  | "text-message"
  | "email"
  | "photo"
  | "video"
  | "audio"
  | "contract"
  | "invoice"
  | "receipt"
  | "court-form"
  | "court-order"
  | "medical-record"
  | "police-record"
  | "witness"
  | "social-media"
  | "financial-record"
  | "official-record"
  | "unknown";

export type EvidenceAdmissibilityConcern = {
  id: string;
  concern:
    | "authenticity"
    | "hearsay"
    | "relevance"
    | "privacy"
    | "incomplete-record"
    | "missing-context"
    | "chain-of-custody"
    | "illegible"
    | "unknown";
  severity: IntelligenceSeverity;
  explanation: string;
  suggestedFix: string;
};

export type ExtractedEvidence = {
  id: string;
  type: ExtractedEvidenceType;
  title: string;
  description?: string;
  linkedFactIds: string[];
  linkedIssueIds: string[];
  strength: IntelligenceConfidence;
  gaps: string[];
  admissibilityConcerns: EvidenceAdmissibilityConcern[];
  sourceText?: string;
};

export type ExtractedEvent = {
  id: string;
  title: string;
  description: string;
  dateIds: string[];
  partyIds: string[];
  evidenceIds: string[];
  legalDomainSignals: LegalSignal[];
  sourceText?: string;
  confidence: IntelligenceConfidence;
};

export type ExtractedHarmType =
  | "reputational"
  | "financial"
  | "emotional-distress"
  | "physical-injury"
  | "property-loss"
  | "parenting-time"
  | "safety"
  | "privacy"
  | "procedural"
  | "unknown";

export type ExtractedHarm = {
  id: string;
  type: ExtractedHarmType;
  description: string;
  amountIds: string[];
  evidenceIds: string[];
  confidence: IntelligenceConfidence;
  sourceText?: string;
};

export type DesiredOutcomeType =
  | "money"
  | "apology"
  | "retraction"
  | "injunction"
  | "parenting-order"
  | "support-order"
  | "property-order"
  | "dismissal"
  | "settlement"
  | "court-guidance"
  | "forms"
  | "costs"
  | "interest"
  | "unknown";

export type DesiredOutcome = {
  id: string;
  type: DesiredOutcomeType;
  description: string;
  amountIds: string[];
  remedyTypes: RemedyType[];
  confidence: IntelligenceConfidence;
  sourceText?: string;
};

export type LimitationPeriodAssessment = {
  id: string;
  claimType: LegalDomain;
  jurisdiction: IntelligenceProvince;
  triggeringDateId?: string;
  possibleDeadline?: string;
  status:
    | "not-assessed"
    | "appears-within-time"
    | "possible-risk"
    | "likely-risk"
    | "unknown";
  reasons: string[];
  missingDateQuestions: string[];
  sourceReferences: LegalSourceReference[];
};

export type RemedyFitAssessment = {
  id: string;
  requestedRemedy: RemedyType;
  courtPath: IntelligenceCourtPath;
  fit:
    | "appears-available"
    | "possibly-available"
    | "unlikely-in-this-forum"
    | "unknown";
  reasons: string[];
  warnings: string[];
  alternativeRemedies: RemedyType[];
};

export type NormalizedIntake = {
  id: string;
  version: CourtSimplifiedIntelligenceVersion;
  createdAt: string;
  updatedAt: string;

  caseId?: string;
  courtPath: IntelligenceCourtPath;
  province: IntelligenceProvince;
  stage: IntelligenceStage;

  rawUserText: string;
  sourceType: IntelligenceSourceType;

  parties: ExtractedParty[];
  dates: ExtractedDate[];
  moneyAmounts: ExtractedMoneyAmount[];
  events: ExtractedEvent[];
  harms: ExtractedHarm[];
  evidence: ExtractedEvidence[];
  desiredOutcomes: DesiredOutcome[];

  userStatedClaimTypes: LegalDomain[];
  systemDetectedClaimTypes: LegalDomain[];

  unresolvedQuestions: string[];
  extractionWarnings: string[];
  confidence: IntelligenceConfidence;
};

export type ClaimElementStatus =
  | "satisfied"
  | "partially-satisfied"
  | "missing"
  | "contradicted"
  | "not-applicable";

export type ClaimElementAssessment = {
  id: string;
  claimType: LegalDomain;
  elementKey: string;
  label: string;
  status: ClaimElementStatus;
  explanation: string;
  supportingFactIds: string[];
  supportingEvidenceIds: string[];
  missingFacts: string[];
  risks: string[];
  confidence: IntelligenceConfidence;
};

export type ClaimClassification = {
  id: string;
  claimType: LegalDomain;
  status: ClaimClassificationStatus;
  score: number;
  confidence: IntelligenceConfidence;
  supportingSignals: LegalSignal[];
  weakeningSignals: LegalSignal[];
  rejectedBecause: string[];
  requiredElements: ClaimElementAssessment[];
  burdenOfProof: BurdenOfProofAssessment[];
  remedyFit: RemedyFitAssessment[];
  limitationAssessment?: LimitationPeriodAssessment;
  sourceReferences: LegalSourceReference[];
  explanation: string;
};

export type ProceduralPostureAssessment = {
  stage: IntelligenceStage;
  courtPath: IntelligenceCourtPath;
  province: IntelligenceProvince;
  confidence: IntelligenceConfidence;
  reasons: string[];
  missingProcedureInfo: string[];
  nextProceduralQuestions: string[];
  warnings: string[];
  ruleReferences: ProceduralRuleReference[];
};

export type EvidenceIssueLink = {
  id: string;
  issueLabel: string;
  claimType: LegalDomain;
  requiredProof: string;
  availableEvidenceIds: string[];
  missingEvidence: string[];
  admissibilityConcerns: EvidenceAdmissibilityConcern[];
  strength: IntelligenceConfidence;
  explanation: string;
};

export type ContradictionFinding = {
  id: string;
  severity: IntelligenceSeverity;
  title: string;
  description: string;
  affectedFields: string[];
  suggestedFix: string;
};

export type MissingInformationFinding = {
  id: string;
  severity: IntelligenceSeverity;
  field: string;
  question: string;
  reason: string;
  requiredFor: LegalDomain | "procedure" | "evidence" | "forms" | "export";
  alreadyAnsweredButUnclear?: boolean;
};

export type LitigationRisk = {
  id: string;
  severity: IntelligenceSeverity;
  title: string;
  explanation: string;
  claimType?: LegalDomain;
  source:
    | "facts"
    | "evidence"
    | "procedure"
    | "law"
    | "forms"
    | "strategy"
    | "limitations"
    | "remedy-fit";
  suggestedFix: string;
};

export type OpposingArgument = {
  id: string;
  claimType?: LegalDomain;
  argument: string;
  whyItMatters: string;
  responseStrategy: string;
  evidenceNeeded: string[];
};

export type JudgeConcern = {
  id: string;
  claimType?: LegalDomain;
  concern: string;
  whyJudgeMayCare: string;
  howToAddress: string;
};

export type FormRecommendation = {
  id: string;
  formNumber?: string;
  title: string;
  courtPath: IntelligenceCourtPath;
  stage: IntelligenceStage;
  reason: string;
  confidence: IntelligenceConfidence;
  notRecommendedForms: string[];
  warnings: string[];
};

export type PrecedentMatchAssessment = {
  id: string;
  precedent: PrecedentReference;
  claimType: LegalDomain;
  matchStrength: IntelligenceConfidence;
  matchingFacts: string[];
  missingFacts: string[];
  distinguishingRisks: string[];
  safeUseSummary: string;
  unsafeUseWarning: string;
};

export type LegalKnowledgePacket = {
  statutes: StatutoryReference[];
  proceduralRules: ProceduralRuleReference[];
  precedents: PrecedentReference[];
  precedentMatches: PrecedentMatchAssessment[];
  sourceWarnings: string[];
};

export type ElementProofStatus =
  | "proven"
  | "partly-proven"
  | "missing-proof"
  | "contradicted"
  | "not-applicable";

export type ElementProofFinding = {
  id: string;
  claimId: string;
  claimType: LegalDomain;
  elementId: string;
  elementKey: string;
  elementLabel: string;
  status: ElementProofStatus;
  proofStrength: IntelligenceConfidence;
  burdenRisk: IntelligenceSeverity;
  supportingEvidenceIds: string[];
  supportingEvidenceTitles: string[];
  missingEvidence: string[];
  judgeConcern: string;
  opposingArgument: string;
  nextAction: string;
  explanation: string;
};

export type ClaimProofMap = {
  id: string;
  claimId: string;
  claimType: LegalDomain;
  claimTitle: string;
  overallProofStrength: IntelligenceConfidence;
  weakestElements: string[];
  strongestElements: string[];
  missingEvidence: string[];
  judgeConcerns: string[];
  opposingArguments: string[];
  nextActions: string[];
  elementFindings: ElementProofFinding[];
};

export type ElementProofEngineResult = {
  version: "1.0.0";
  claimProofMaps: ClaimProofMap[];
  globalWeaknesses: string[];
  globalStrengths: string[];
  globalNextActions: string[];
  summary: string;
};

export type LegalIntelligenceResult = {
  id: string;
  version: CourtSimplifiedIntelligenceVersion;
  createdAt: string;
  updatedAt: string;

  normalizedIntake: NormalizedIntake;

  claimClassifications: ClaimClassification[];
  primaryClaimTypes: LegalDomain[];
  rejectedFalsePositives: ClaimClassification[];

  proceduralPosture: ProceduralPostureAssessment;

  evidenceIssueLinks: EvidenceIssueLink[];
  contradictions: ContradictionFinding[];
  missingInformation: MissingInformationFinding[];
  limitationAssessments: LimitationPeriodAssessment[];
  remedyFitAssessments: RemedyFitAssessment[];
  litigationRisks: LitigationRisk[];
  opposingArguments: OpposingArgument[];
  judgeConcerns: JudgeConcern[];
  formRecommendations: FormRecommendation[];
  legalKnowledge: LegalKnowledgePacket;

  elementProofAnalysis?: ElementProofEngineResult;

  plainLanguageSummary: string;
  structuredCaseSummary: string;
  nextBestActions: string[];

  systemWarnings: string[];
  confidence: IntelligenceConfidence;
};

export type CourtSimplifiedBrainInput = {
  caseId?: string;
  courtPath?: IntelligenceCourtPath;
  province?: IntelligenceProvince;
  stage?: IntelligenceStage;
  rawUserText: string;
  existingMasterResult?: unknown;
  existingNormalizedIntake?: NormalizedIntake;
  sourceType?: IntelligenceSourceType;
};

export type CourtSimplifiedBrainOutput = {
  intelligence: LegalIntelligenceResult;
  masterResultPatch: Record<string, unknown>;
  dashboardPatch: Record<string, unknown>;
  recommendedNextRoute?: string;
};

export type IntelligenceTestScenario = {
  id: string;
  name: string;
  courtPath: IntelligenceCourtPath;
  rawUserText: string;
  expectedPrimaryClaims: LegalDomain[];
  expectedRejectedClaims: LegalDomain[];
  expectedMoneyAmount?: number;
  expectedMissingFields: string[];
  expectedRemedies?: RemedyType[];
  expectedEvidenceIssues?: string[];
  notes: string[];
};