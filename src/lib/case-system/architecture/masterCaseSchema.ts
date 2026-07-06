export type CourtSimplifiedSchemaVersion = "1.1.0";

export type CaseSystemAuthorityLayer =
  | "user-fact"
  | "uploaded-evidence"
  | "normalized-intake"
  | "fact-pattern-analysis"
  | "evidence-intelligence"
  | "claim-arbitration"
  | "procedural-posture"
  | "claim-reasoning"
  | "evidence-cognition"
  | "legal-knowledge"
  | "litigation-synthesis"
  | "court-simplified-brain"
  | "authority-analysis"
  | "contradiction-analysis"
  | "credibility-analysis"
  | "human-review"
  | "unknown";

export type CaseConfidence =
  | "very-low"
  | "low"
  | "medium"
  | "high"
  | "very-high";

export type CaseSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type CaseCourtPath =
  | "family"
  | "small-claims"
  | "civil"
  | "tribunal"
  | "ltb"
  | "immigration"
  | "criminal-related"
  | "unknown";

export type CaseProvince =
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

export type CaseStage =
  | "pre-litigation"
  | "starting-case"
  | "responding"
  | "already-started"
  | "conference"
  | "motion"
  | "trial"
  | "settlement"
  | "enforcement"
  | "appeal"
  | "urgent"
  | "closed"
  | "not-sure";

export type CaseLegalDomain =
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

export type CaseClaimStatus =
  | "dominant"
  | "active"
  | "secondary"
  | "possible"
  | "suppressed"
  | "rejected"
  | "unknown";

export type CasePartyRole =
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
  | "expert"
  | "court"
  | "unknown";

export type CaseEvidenceType =
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
  | "school-record"
  | "witness"
  | "social-media"
  | "financial-record"
  | "official-record"
  | "expert-report"
  | "other"
  | "unknown";

export type CaseEvidenceLifecycleStatus =
  | "uploaded"
  | "parsed"
  | "categorized"
  | "mapped"
  | "linked-to-issue"
  | "linked-to-burden"
  | "linked-to-timeline"
  | "reviewed"
  | "contradiction-checked"
  | "affidavit-referenced"
  | "hearing-referenced"
  | "exhibit-ready"
  | "filed"
  | "excluded"
  | "unknown";

export type CaseDocumentStatus =
  | "draft"
  | "generated"
  | "review-needed"
  | "ready"
  | "filed"
  | "served"
  | "replaced"
  | "archived";

export type CaseDocumentType =
  | "pleading"
  | "application"
  | "defence"
  | "reply"
  | "affidavit"
  | "motion-material"
  | "conference-brief"
  | "settlement-material"
  | "trial-material"
  | "exhibit-book"
  | "timeline"
  | "evidence-summary"
  | "court-form"
  | "letter"
  | "export-package"
  | "unknown";

export type CaseKnowledgeAuthorityLevel =
  | "constitutional"
  | "statute"
  | "regulation"
  | "rule-of-court"
  | "practice-direction"
  | "official-form"
  | "official-guide"
  | "scc-binding"
  | "court-of-appeal-binding"
  | "superior-court-persuasive"
  | "tribunal-persuasive"
  | "secondary-source"
  | "operational-guidance"
  | "ai-inference"
  | "unknown";

export type CaseKnowledgeVerificationStatus =
  | "verified"
  | "needs-review"
  | "outdated-risk"
  | "overruled-risk"
  | "not-verified"
  | "do-not-use";

export type CaseElementProofStatus =
  | "proven"
  | "partly-proven"
  | "missing-proof"
  | "contradicted"
  | "not-applicable";

export type CaseAuthorityWeightGrade =
  | "controlling"
  | "strong"
  | "moderate"
  | "limited"
  | "unsafe";

export type CaseCitationSafetyLevel =
  | "safe"
  | "review-required"
  | "unsafe";

export type CaseJurisdictionAuthorityFit =
  | "directly-applicable"
  | "federal-applicable"
  | "persuasive-only"
  | "wrong-jurisdiction"
  | "unknown";

export type CaseContradictionSeverity =
  | "low"
  | "moderate"
  | "high"
  | "critical";

export type CaseContradictionCategory =
  | "date-conflict"
  | "timeline-conflict"
  | "identity-conflict"
  | "location-conflict"
  | "amount-conflict"
  | "causation-conflict"
  | "evidence-conflict"
  | "claim-conflict"
  | "credibility-conflict"
  | "procedural-conflict"
  | "authority-conflict"
  | "statement-conflict"
  | "unknown";

export type CaseCredibilityRiskLevel =
  | "minimal"
  | "manageable"
  | "elevated"
  | "serious"
  | "critical";

export type CaseFactPatternCategory =
  | "admission"
  | "denial"
  | "contradiction"
  | "timeline"
  | "motive"
  | "intent"
  | "knowledge"
  | "notice"
  | "credibility"
  | "conduct"
  | "causation"
  | "damages"
  | "procedure"
  | "unknown";

export type CaseEvidenceStrength =
  | "very-weak"
  | "weak"
  | "moderate"
  | "strong"
  | "very-strong";

export type CaseAuditEvent = {
  id: string;
  createdAt: string;
  authorityLayer: CaseSystemAuthorityLayer;
  action: string;
  explanation: string;
  affectedIds: string[];
};

export type CaseParty = {
  id: string;
  name?: string;
  role: CasePartyRole;
  isUser?: boolean;
  description?: string;
  contactSummary?: string;
  confidence: CaseConfidence;
  sourceText?: string;
};

export type CaseTimelineEvent = {
  id: string;
  title: string;
  description: string;
  dateRaw?: string;
  dateNormalized?: string;
  dateConfidence: CaseConfidence;
  partyIds: string[];
  evidenceIds: string[];
  claimIds: string[];
  proceduralRelevance: string[];
  contradictionFlags: string[];
  sourceText?: string;
  confidence: CaseConfidence;
};

export type CaseClaim = {
  id: string;
  domain: CaseLegalDomain;
  status: CaseClaimStatus;
  title: string;
  explanation: string;
  score?: number;
  confidence: CaseConfidence;
  supportingFactIds: string[];
  supportingEvidenceIds: string[];
  missingFacts: string[];
  burdenIssues: string[];
  remedyIssues: string[];
  suppressionReason?: string;
  arbitrationNotes: string[];
};

export type CaseEvidenceItem = {
  id: string;
  type: CaseEvidenceType;
  title: string;
  description?: string;
  lifecycleStatus: CaseEvidenceLifecycleStatus;
  uploadedPath?: string;
  storagePath?: string;
  fileName?: string;
  linkedEventIds: string[];
  linkedClaimIds: string[];
  linkedIssueIds: string[];
  linkedDocumentIds: string[];
  linkedBurdenLabels: string[];
  admissibilityConcerns: string[];
  authenticityConcerns: string[];
  missingContext: string[];
  exhibitLabel?: string;
  exhibitGroup?: string;
  readiness: CaseConfidence;
  confidence: CaseConfidence;
};

export type CaseDocument = {
  id: string;
  title: string;
  type: CaseDocumentType;
  status: CaseDocumentStatus;
  courtPath: CaseCourtPath;
  stage: CaseStage;
  generatedAt?: string;
  filedAt?: string;
  servedAt?: string;
  storagePath?: string;
  linkedClaimIds: string[];
  linkedEvidenceIds: string[];
  linkedEventIds: string[];
  warnings: string[];
  notes: string[];
};

export type CaseLegalKnowledgeReference = {
  id: string;
  title: string;
  citation?: string;
  sourceUrl?: string;
  jurisdiction: CaseProvince | "Canada" | "Unknown";
  authorityLevel: CaseKnowledgeAuthorityLevel;
  verificationStatus: CaseKnowledgeVerificationStatus;
  legalDomains: CaseLegalDomain[];
  proceduralStages: CaseStage[];
  principleSummary: string;
  proceduralEffect: string[];
  evidenceEffect: string[];
  burdenEffect: string[];
  strategicEffect: string[];
  useLimits: string[];
  doNotUseFor: string[];
  lastVerifiedAt?: string;
};

export type CaseRisk = {
  id: string;
  severity: CaseSeverity;
  title: string;
  explanation: string;
  source:
    | "facts"
    | "evidence"
    | "procedure"
    | "law"
    | "forms"
    | "strategy"
    | "limitations"
    | "remedy-fit"
    | "credibility"
    | "proportionality"
    | "unknown";
  claimId?: string;
  suggestedFix: string;
};

export type CaseJudicialConcern = {
  id: string;
  concern: string;
  whyCourtMayCare: string;
  howToAddress: string;
  linkedClaimIds: string[];
  linkedEvidenceIds: string[];
  severity: CaseSeverity;
};

export type CaseOpposingArgument = {
  id: string;
  argument: string;
  whyItMatters: string;
  responseStrategy: string;
  evidenceNeeded: string[];
  linkedClaimIds: string[];
};

export type CaseFactPatternFinding = {
  id: string;
  category: CaseFactPatternCategory;
  title: string;
  description: string;
  supportingFactIds: string[];
  supportingEvidenceIds: string[];
  confidence: CaseConfidence;
  severity: CaseSeverity;
  significance: string;
  litigationImpact: string;
};

export type CaseFactPatternAnalysis = {
  version: "1.0.0";
  generatedAt?: string;
  findings: CaseFactPatternFinding[];
  admissions: CaseFactPatternFinding[];
  contradictions: CaseFactPatternFinding[];
  credibilityIssues: CaseFactPatternFinding[];
  knowledgeIndicators: CaseFactPatternFinding[];
  timelineIssues: CaseFactPatternFinding[];
  causationIssues: CaseFactPatternFinding[];
  damagesIndicators: CaseFactPatternFinding[];
  strongestPatterns: string[];
  weakestPatterns: string[];
  nextActions: string[];
  warnings: string[];
  summary: string;
};

export type CaseEvidenceIntelligenceFinding = {
  id: string;
  title: string;
  explanation: string;
  confidence: CaseConfidence;
  strength: CaseEvidenceStrength;
  supportingEvidenceIds: string[];
  litigationImpact: string;
};

export type CaseEvidenceGap = {
  id: string;
  title: string;
  explanation: string;
  severity: CaseSeverity;
  recommendedEvidence: string[];
};

export type CaseEvidenceContradiction = {
  id: string;
  title: string;
  explanation: string;
  evidenceIds: string[];
  severity: CaseSeverity;
};

export type CaseEvidenceIntelligence = {
  version: "1.0.0";
  generatedAt?: string;
  findings: CaseEvidenceIntelligenceFinding[];
  contradictions: CaseEvidenceContradiction[];
  gaps: CaseEvidenceGap[];
  strongestEvidence: string[];
  weakestEvidence: string[];
  recommendedEvidenceCollection: string[];
  warnings: string[];
  summary: string;
};

export type CaseElementProofFinding = {
  id: string;
  claimId: string;
  claimDomain: CaseLegalDomain;
  elementId: string;
  elementKey: string;
  elementLabel: string;
  status: CaseElementProofStatus;
  proofStrength: CaseConfidence;
  burdenRisk: CaseSeverity;
  supportingEvidenceIds: string[];
  supportingEvidenceTitles: string[];
  missingEvidence: string[];
  judgeConcern: string;
  opposingArgument: string;
  nextAction: string;
  explanation: string;
};

export type CaseClaimProofMap = {
  id: string;
  claimId: string;
  claimDomain: CaseLegalDomain;
  claimTitle: string;
  overallProofStrength: CaseConfidence;
  weakestElements: string[];
  strongestElements: string[];
  missingEvidence: string[];
  judgeConcerns: string[];
  opposingArguments: string[];
  nextActions: string[];
  elementFindings: CaseElementProofFinding[];
};

export type CaseProofAnalysis = {
  version: "1.0.0";
  claimProofMaps: CaseClaimProofMap[];
  globalWeaknesses: string[];
  globalStrengths: string[];
  globalNextActions: string[];
  summary: string;
};

export type CaseAuthorityVerificationFinding = {
  authorityId: string;
  verified: boolean;
  citationSafe: boolean;
  requiresManualReview: boolean;
  authorityWeight: number;
  bindingLevel: string;
  verificationStatus: string;
  warnings: string[];
  explanation: string;
};

export type CaseAuthorityWeightFinding = {
  authorityId: string;
  weightScore: number;
  weightGrade: CaseAuthorityWeightGrade;
  bindingLevel: string;
  jurisdictionFit: string;
  courtLevelFit: string;
  citationSafe: boolean;
  verified: boolean;
  requiresManualReview: boolean;
  useRecommendation: string;
  warnings: string[];
};

export type CaseCitationSafetyFinding = {
  authorityId: string;
  safeToCite: boolean;
  safetyLevel: CaseCitationSafetyLevel;
  useContext: string;
  citationSafe: boolean;
  verified: boolean;
  authorityWeight: number;
  requiresManualReview: boolean;
  reasons: string[];
  warnings: string[];
  recommendation: string;
};

export type CaseJurisdictionAuthorityFinding = {
  authorityId: string;
  targetJurisdiction: string;
  authorityJurisdiction: string;
  jurisdictionFit: CaseJurisdictionAuthorityFit;
  usableInTargetJurisdiction: boolean;
  shouldPreferLocalAuthority: boolean;
  weightScore: number;
  citationSafe: boolean;
  safeToCite: boolean;
  warnings: string[];
  recommendation: string;
};

export type CaseAuthorityAnalysis = {
  version: "1.0.0";
  generatedAt?: string;
  verificationResults: CaseAuthorityVerificationFinding[];
  weightResults: CaseAuthorityWeightFinding[];
  citationSafetyResults: CaseCitationSafetyFinding[];
  jurisdictionResults: CaseJurisdictionAuthorityFinding[];
  verifiedAuthorityIds: string[];
  strongestAuthorityIds: string[];
  unsafeAuthorityIds: string[];
  directlyApplicableAuthorityIds: string[];
  wrongJurisdictionAuthorityIds: string[];
  warnings: string[];
  summary: string;
};

export type CaseContradictionNode = {
  id: string;
  sourceType: string;
  sourceId: string;
  title: string;
  content: string;
  confidence: CaseConfidence;
};

export type CaseContradictionFinding = {
  id: string;
  category: CaseContradictionCategory;
  severity: CaseContradictionSeverity;
  confidence: CaseConfidence;
  leftNode: CaseContradictionNode;
  rightNode: CaseContradictionNode;
  explanation: string;
  whyItMatters: string;
  possibleResolutions: string[];
  judicialConcern: string;
  litigationRisk: string;
  requiresHumanReview: boolean;
};

export type CaseContradictionAnalysis = {
  version: "1.0.0";
  generatedAt?: string;
  findings: CaseContradictionFinding[];
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  moderateFindings: number;
  lowFindings: number;
  credibilityRiskScore: number;
  overallRisk: "minimal" | "manageable" | "elevated" | "serious" | "critical";
  warnings: string[];
  summary: string;
};

export type CaseCredibilityRiskFinding = {
  id: string;
  category: string;
  level: CaseCredibilityRiskLevel;
  score: number;
  title: string;
  explanation: string;
  linkedContradictionIds: string[];
  judgeConcern: string;
  opposingCounselUse: string;
  recommendedFix: string;
};

export type CaseCredibilityAnalysis = {
  version: "1.0.0";
  generatedAt?: string;
  overallScore: number;
  overallLevel: CaseCredibilityRiskLevel;
  findings: CaseCredibilityRiskFinding[];
  judgeConcernScore: number;
  crossExaminationRiskScore: number;
  settlementPressureScore: number;
  documentReadinessImpact: "none" | "minor" | "moderate" | "major" | "severe";
  warnings: string[];
  nextActions: string[];
  summary: string;
};

export type CaseWorkflowState = {
  currentRoute?: string;
  recommendedNextRoute?: string;
  activeStage: CaseStage;
  courtPath: CaseCourtPath;
  province: CaseProvince;
  blockers: string[];
  nextActions: string[];
  dependencyWarnings: string[];
  missingInformation: string[];
};

export type CaseReadinessState = {
  overallScore: number;
  overallLevel: "not-ready" | "early" | "developing" | "near-ready" | "ready";
  pleadingReadiness: CaseConfidence;
  evidenceReadiness: CaseConfidence;
  proceduralReadiness: CaseConfidence;
  courtroomReadiness: CaseConfidence;
  settlementReadiness: CaseConfidence;
  blockers: string[];
  reasons: string[];
};

export type CaseMemorySnapshot = {
  id: string;
  createdAt: string;
  summary: string;
  dominantClaimIds: string[];
  activeClaimIds: string[];
  rejectedClaimIds: string[];
  evidenceCount: number;
  documentCount: number;
  stage: CaseStage;
  courtPath: CaseCourtPath;
  warnings: string[];
  factPatternFindingCount: number;
  evidenceGapCount: number;
  proofWeaknessCount: number;
  proofStrengthCount: number;
  authorityWarningCount: number;
  contradictionCount: number;
  credibilityRiskLevel: CaseCredibilityRiskLevel;
};

export type MasterCaseSchema = {
  id: string;
  version: CourtSimplifiedSchemaVersion;
  createdAt: string;
  updatedAt: string;

  title?: string;
  userId?: string;

  courtPath: CaseCourtPath;
  province: CaseProvince;
  stage: CaseStage;
  status: "active" | "paused" | "closed" | "archived";

  plainLanguageSummary: string;
  structuredSummary: string;

  parties: CaseParty[];
  claims: CaseClaim[];
  timeline: CaseTimelineEvent[];
  evidence: CaseEvidenceItem[];
  documents: CaseDocument[];
  legalKnowledge: CaseLegalKnowledgeReference[];

  risks: CaseRisk[];
  judicialConcerns: CaseJudicialConcern[];
  opposingArguments: CaseOpposingArgument[];

  factPatternAnalysis: CaseFactPatternAnalysis;
  evidenceIntelligence: CaseEvidenceIntelligence;
  proofAnalysis: CaseProofAnalysis;
  authorityAnalysis: CaseAuthorityAnalysis;
  contradictionAnalysis: CaseContradictionAnalysis;
  credibilityAnalysis: CaseCredibilityAnalysis;

  workflow: CaseWorkflowState;
  readiness: CaseReadinessState;

  memorySnapshots: CaseMemorySnapshot[];
  auditTrail: CaseAuditEvent[];

  systemWarnings: string[];
  confidence: CaseConfidence;
};