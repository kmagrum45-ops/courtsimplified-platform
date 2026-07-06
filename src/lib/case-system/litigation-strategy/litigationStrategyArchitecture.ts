import {
  CaseConfidence,
  CaseCourtPath,
  CaseCredibilityRiskLevel,
  CaseLegalDomain,
  CaseProvince,
  CaseSeverity,
  CaseStage,
} from "../architecture/masterCaseSchema";

export type LitigationStrategyArchitectureVersion = "1.3.0";

export type LitigationStrategyPriority = "critical" | "high" | "medium" | "low";

export type LitigationStrategyReadinessLevel =
  | "not-ready"
  | "early-development"
  | "developing"
  | "strategy-ready"
  | "court-ready-review-required";

export type LitigationStrategyRoute =
  | "/builder"
  | "/case-dashboard"
  | "/evidence"
  | "/documents"
  | "/forms"
  | "/court-package"
  | "/settlement-conference"
  | "/trial-package"
  | "/generated-documents"
  | "/litigation-strategy"
  | "/legal-principles"
  | "/dashboard";

export type LitigationStrategySource =
  | "conversation-intelligence"
  | "case-investigation"
  | "fact-pattern"
  | "evidence-intelligence"
  | "timeline"
  | "procedure"
  | "claim-theory"
  | "damages"
  | "credibility"
  | "authority"
  | "knowledge"
  | "legal-reasoning"
  | "workflow"
  | "litigation-reasoning"
  | "assembly"
  | "brain-bridge"
  | "brain-migration"
  | "ai-case-partner"
  | "manual"
  | "unknown";

export type LitigationStrategyFindingCategory =
  | "case-theory"
  | "legal-theory"
  | "facts"
  | "timeline"
  | "evidence"
  | "burden"
  | "procedure"
  | "authority"
  | "credibility"
  | "contradiction"
  | "causation"
  | "damages"
  | "remedy"
  | "witness"
  | "opposing-argument"
  | "judicial-concern"
  | "settlement"
  | "trial"
  | "appeal"
  | "charter"
  | "public-authority"
  | "abuse-of-process"
  | "limitation"
  | "jurisdiction"
  | "service"
  | "filing"
  | "record-preservation"
  | "strategy-dependency"
  | "unknown";

export type LitigationStrategyRiskCategory =
  | "missing-element"
  | "missing-proof"
  | "weak-evidence"
  | "contradicted-proof"
  | "credibility-risk"
  | "timeline-risk"
  | "limitation-risk"
  | "procedural-risk"
  | "jurisdiction-risk"
  | "authority-risk"
  | "causation-risk"
  | "damages-risk"
  | "remedy-risk"
  | "opposing-argument-risk"
  | "judicial-concern-risk"
  | "settlement-risk"
  | "trial-risk"
  | "appeal-risk"
  | "charter-risk"
  | "public-authority-risk"
  | "abuse-of-process-risk"
  | "record-risk"
  | "dependency-risk"
  | "unknown";

export type LitigationStrategyBurdenStandard =
  | "balance-of-probabilities"
  | "best-interests"
  | "clear-and-convincing"
  | "statutory-threshold"
  | "procedural-threshold"
  | "onus-on-moving-party"
  | "onus-on-responding-party"
  | "unknown";

export type LitigationStrategyReference = {
  source: LitigationStrategySource;
  sourceId?: string;
  label: string;
  explanation: string;
  confidence: CaseConfidence;
};

export type LitigationStrategyLinkedItem = {
  id?: string;
  label: string;
  source: LitigationStrategySource;
  significance: string;
};

export type LitigationStrategyTheory = {
  id: string;
  domain: CaseLegalDomain;
  title: string;
  status:
    | "dominant"
    | "strong-alternative"
    | "possible"
    | "weak"
    | "not-ready"
    | "rejected";
  explanation: string;
  legalTheory: string;
  factualTheory: string;
  strongestFacts: string[];
  weakestFacts: string[];
  requiredProof: string[];
  missingProof: string[];
  likelyDefences: string[];
  judgeConcerns: string[];
  recommendedDevelopment: string[];
  fallbackTheoryIds: string[];
  fatalDefectRisks: string[];
  score: number;
  confidence: CaseConfidence;
};

export type LitigationStrategyIssueTreeNode = {
  id: string;
  parentId?: string;
  label: string;
  domain?: CaseLegalDomain;
  issueType:
    | "claim"
    | "element"
    | "fact"
    | "evidence"
    | "burden"
    | "procedure"
    | "defence"
    | "remedy"
    | "threshold"
    | "record"
    | "strategy"
    | "unknown";
  status:
    | "strong"
    | "developing"
    | "weak"
    | "missing"
    | "contradicted"
    | "not-applicable"
    | "unknown";
  explanation: string;
  proofNeeded: string[];
  linkedEvidenceIds: string[];
  childIds: string[];
  dependencyIds: string[];
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyDependencyGraphNode = {
  id: string;
  label: string;
  nodeType:
    | "claim"
    | "element"
    | "fact"
    | "evidence"
    | "witness"
    | "record"
    | "procedure"
    | "authority"
    | "remedy"
    | "strategy"
    | "unknown";
  status: "satisfied" | "developing" | "missing" | "blocked" | "unknown";
  importance: LitigationStrategyPriority;
  failureImpact: "minor" | "moderate" | "major" | "fatal" | "unknown";
  explanation: string;
};

export type LitigationStrategyDependencyGraphEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationship:
    | "proves"
    | "weakens"
    | "contradicts"
    | "depends-on"
    | "unlocks"
    | "blocks"
    | "supports"
    | "requires"
    | "unknown";
  explanation: string;
  confidence: CaseConfidence;
};

export type LitigationStrategyDependencyGraph = {
  nodes: LitigationStrategyDependencyGraphNode[];
  edges: LitigationStrategyDependencyGraphEdge[];
  criticalNodeIds: string[];
  blockedNodeIds: string[];
  warnings: string[];
};

export type LitigationStrategyElementMatrixRow = {
  id: string;
  claimTheoryId?: string;
  domain: CaseLegalDomain;
  elementKey: string;
  elementLabel: string;
  burdenStandard: LitigationStrategyBurdenStandard;
  proofStatus:
    | "proven"
    | "partially-proven"
    | "missing-proof"
    | "contradicted"
    | "not-assessed";
  supportingFacts: string[];
  supportingEvidence: string[];
  missingFacts: string[];
  missingEvidence: string[];
  opposingAttack: string;
  judicialConcern: string;
  nextStep: string;
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyProofDependency = {
  id: string;
  elementMatrixRowId?: string;
  issueTreeNodeId?: string;
  whatNeedsProof: string;
  proves: string[];
  disproves: string[];
  strengthens: string[];
  weakens: string[];
  missingEvidence: string[];
  bestEvidenceAvailable: string[];
  riskIfNotResolved: string;
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyFinding = {
  id: string;
  category: LitigationStrategyFindingCategory;
  title: string;
  explanation: string;
  whyItMatters: string;
  strategicImpact: string;
  recommendedResponse: string;
  severity: CaseSeverity;
  confidence: CaseConfidence;
  priority: LitigationStrategyPriority;
  sources: LitigationStrategyReference[];
  linkedFacts: LitigationStrategyLinkedItem[];
  linkedEvidence: LitigationStrategyLinkedItem[];
  linkedIssues: LitigationStrategyLinkedItem[];
  warnings: string[];
};

export type LitigationStrategyOpportunity = {
  id: string;
  category:
    | "strong-fact"
    | "strong-evidence"
    | "admission"
    | "contradiction-use"
    | "procedural-leverage"
    | "settlement-leverage"
    | "trial-leverage"
    | "authority-leverage"
    | "credibility-leverage"
    | "burden-leverage"
    | "damages-leverage"
    | "remedy-leverage"
    | "public-authority-leverage"
    | "charter-leverage"
    | "appeal-leverage"
    | "record-leverage"
    | "unknown";
  title: string;
  explanation: string;
  whyItMatters: string;
  howToUse: string;
  limits: string[];
  requiredProof: string[];
  relatedRisks: string[];
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
  sources: LitigationStrategyReference[];
};

export type LitigationStrategyRisk = {
  id: string;
  category: LitigationStrategyRiskCategory;
  title: string;
  explanation: string;
  whyItMatters: string;
  likelyConsequence: string;
  mitigation: string;
  severity: CaseSeverity;
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
  affectedDomains: CaseLegalDomain[];
  affectedRoutes: LitigationStrategyRoute[];
  sources: LitigationStrategyReference[];
};

export type LitigationStrategyDecisionBranch = {
  id: string;
  title: string;
  condition: string;
  ifTrue: string;
  ifFalse: string;
  riskIfWrong: string;
  evidenceNeededToChoose: string[];
  recommendedRoute: LitigationStrategyRoute;
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyDynamicStrategyBranch = {
  id: string;
  branchName: string;
  triggerCondition: string;
  useWhen: string[];
  avoidWhen: string[];
  requiredProofBeforeUsing: string[];
  fallbackBranchId?: string;
  recommendedRoute: LitigationStrategyRoute;
  consequences: string[];
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyBurdenIssue = {
  id: string;
  domain: CaseLegalDomain;
  issueLabel: string;
  partyWithBurden:
    | "user"
    | "opposing-party"
    | "moving-party"
    | "responding-party"
    | "applicant"
    | "respondent"
    | "plaintiff"
    | "defendant"
    | "crown"
    | "authority"
    | "unknown";
  standard: LitigationStrategyBurdenStandard;
  whatMustBeProven: string[];
  currentProofStrength: CaseConfidence;
  missingProof: string[];
  contradictedProof: string[];
  evidencePriorities: string[];
  consequenceIfNotProven: string;
  recommendedStrategy: string;
  confidence: CaseConfidence;
};

export type LitigationStrategyEvidenceWeight = {
  id: string;
  evidenceId?: string;
  label: string;
  relevanceScore: number;
  reliabilityScore: number;
  admissibilityScore: number;
  corroborationScore: number;
  contradictionRiskScore: number;
  burdenSupportScore: number;
  judicialImportanceScore: number;
  overallWeightScore: number;
  supportsIssues: string[];
  weakensIssues: string[];
  warnings: string[];
};

export type LitigationStrategyInvestigationTarget = {
  id: string;
  title: string;
  reason: string;
  priority: LitigationStrategyPriority;
  category:
    | "fact"
    | "timeline"
    | "evidence"
    | "witness"
    | "procedure"
    | "authority"
    | "damages"
    | "credibility"
    | "opposing-party"
    | "record"
    | "unknown";
  questionsToAnswer: string[];
  evidenceToLookFor: string[];
  expectedImpact: string;
  blockedUntilResolved: boolean;
};

export type LitigationStrategyInvestigationPlan = {
  id: string;
  planName: string;
  objective: string;
  orderedTargets: LitigationStrategyInvestigationTarget[];
  unlocks: string[];
  blockedBy: string[];
  routeAfterCompletion: LitigationStrategyRoute;
  priority: LitigationStrategyPriority;
  warnings: string[];
};

export type LitigationStrategyEvidencePriority = {
  id: string;
  label: string;
  reason: string;
  connectedIssue: string;
  connectedBurden: string;
  priority: LitigationStrategyPriority;
  currentStatus:
    | "available"
    | "mentioned-not-collected"
    | "missing"
    | "unclear"
    | "contradicted"
    | "needs-authentication";
  courtUseConcern: string;
  nextStep: string;
};

export type LitigationStrategyWitnessPriority = {
  id: string;
  label: string;
  expectedKnowledge: string;
  whyImportant: string;
  riskIfMissing: string;
  credibilityConcerns: string[];
  documentsToCompare: string[];
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyCrossExaminationRisk = {
  id: string;
  witnessOrParty: string;
  riskArea: string;
  likelyQuestionTheme: string;
  vulnerableFacts: string[];
  documentsLikelyUsed: string[];
  preparationNeeded: string[];
  severity: CaseSeverity;
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyExhibitPlanItem = {
  id: string;
  label: string;
  exhibitType:
    | "document"
    | "message"
    | "email"
    | "photo"
    | "video"
    | "audio"
    | "record"
    | "transcript"
    | "order"
    | "financial"
    | "medical"
    | "court-file"
    | "government-record"
    | "other"
    | "unknown";
  proves: string[];
  authenticationConcern: string;
  admissibilityConcern: string;
  missingContext: string[];
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyRecordPreservationItem = {
  id: string;
  recordType:
    | "transcript"
    | "audio"
    | "video"
    | "order"
    | "endorsement"
    | "pleading"
    | "motion-record"
    | "affidavit"
    | "email"
    | "message"
    | "financial"
    | "medical"
    | "police"
    | "government"
    | "other"
    | "unknown";
  label: string;
  whyNeeded: string;
  riskIfMissing: string;
  howToRequestOrPreserve: string;
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyJudicialReasoningQuestion = {
  id: string;
  question: string;
  whyJudgeWouldAsk: string;
  answerStatus: "answered" | "partially-answered" | "missing" | "unknown";
  evidenceNeeded: string[];
  riskIfUnanswered: string;
  priority: LitigationStrategyPriority;
};

export type LitigationStrategyJudicialConcern = {
  id: string;
  domain?: CaseLegalDomain;
  concern: string;
  whyJudgeMayCare: string;
  howToAddress: string;
  evidenceNeeded: string[];
  proceduralConcern: boolean;
  credibilityConcern: boolean;
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyOpposingArgument = {
  id: string;
  domain?: CaseLegalDomain;
  argument: string;
  whyItMatters: string;
  likelyUse:
    | "pleading-attack"
    | "motion"
    | "settlement"
    | "cross-examination"
    | "trial"
    | "appeal"
    | "general-defence"
    | "unknown";
  responseStrategy: string;
  evidenceNeeded: string[];
  vulnerabilities: string[];
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategySettlementScenario = {
  id: string;
  title: string;
  userLeverage: string[];
  opposingLeverage: string[];
  settlementRisks: string[];
  informationNeededBeforeOffer: string[];
  possibleOfferStructure: string[];
  costsPressure: string;
  nonMoneyTerms: string[];
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyCourtReadinessSimulation = {
  id: string;
  stageTested:
    | "conference"
    | "motion"
    | "settlement"
    | "trial"
    | "appeal"
    | "enforcement"
    | "unknown";
  likelySurvival:
    | "likely-survives"
    | "uncertain"
    | "likely-fails"
    | "not-enough-information";
  reasons: string[];
  failurePoints: string[];
  requiredImprovements: string[];
  confidence: CaseConfidence;
};

export type LitigationStrategyRiskSimulation = {
  id: string;
  scenario: string;
  assumptionChanged: string;
  expectedImpact:
    | "minor"
    | "moderate"
    | "major"
    | "case-changing"
    | "fatal"
    | "unknown";
  scoreImpactEstimate: number;
  mitigation: string;
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyTrialIssue = {
  id: string;
  issue: string;
  whyItMattersAtTrial: string;
  proofNeeded: string[];
  witnessesNeeded: string[];
  exhibitsNeeded: string[];
  crossExaminationRisks: string[];
  judgeConcerns: string[];
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyAppealIssue = {
  id: string;
  issue: string;
  possibleErrorType:
    | "legal-error"
    | "procedural-unfairness"
    | "evidentiary-error"
    | "misapprehension-of-evidence"
    | "reasons-insufficiency"
    | "jurisdiction-error"
    | "standard-of-review-risk"
    | "record-problem"
    | "unknown";
  recordNeeded: string[];
  preservationNeeded: string[];
  riskIfNotPreserved: string;
  likelyDifficulty: "low" | "medium" | "high" | "unknown";
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyCharterIssue = {
  id: string;
  issue: string;
  possibleRightOrPrinciple: string;
  governmentActor: string;
  stateActionOrDecision: string;
  harmOrImpact: string;
  remedyPossibility: string;
  proofNeeded: string[];
  proceduralRisks: string[];
  warnings: string[];
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyPublicAuthorityIssue = {
  id: string;
  actor: string;
  allegedConduct: string;
  theory:
    | "operational-negligence"
    | "bad-faith"
    | "charter"
    | "misfeasance"
    | "procedural-unfairness"
    | "negligent-investigation"
    | "institutional-liability"
    | "unknown";
  protectedDecisionRisk: boolean;
  immunityOrLeaveRisk: boolean;
  noticeOrLimitationRisk: boolean;
  collateralAttackRisk: boolean;
  causationRisk: boolean;
  requiredRecords: string[];
  questionsToResolve: string[];
  recommendedFraming: string;
  warnings: string[];
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyAbuseOfProcessIssue = {
  id: string;
  issue: string;
  conductConcern: string;
  recordNeeded: string[];
  prejudiceOrUnfairness: string;
  remedyRequested: string;
  riskIfUnsupported: string;
  warnings: string[];
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyProceduralOpportunity = {
  id: string;
  title: string;
  explanation: string;
  proceduralContext:
    | "starting-case"
    | "responding"
    | "conference"
    | "motion"
    | "trial"
    | "settlement"
    | "appeal"
    | "enforcement"
    | "urgent"
    | "unknown";
  possibleUse: string;
  prerequisiteFacts: string[];
  requiredDocumentsOrSteps: string[];
  risks: string[];
  verificationNeeded: string[];
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyDamageLeverage = {
  id: string;
  damageType:
    | "liquidated"
    | "out-of-pocket"
    | "income-loss"
    | "property-loss"
    | "reputational"
    | "emotional-distress"
    | "punitive"
    | "aggravated"
    | "support"
    | "costs"
    | "interest"
    | "unknown";
  explanation: string;
  proofAvailable: string[];
  proofMissing: string[];
  calculationIssues: string[];
  mitigationIssues: string[];
  strategicUse: string;
  risks: string[];
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyRemedyLeverage = {
  id: string;
  remedy:
    | "money"
    | "declaration"
    | "injunction"
    | "specific-performance"
    | "dismissal"
    | "parenting-order"
    | "support-order"
    | "property-order"
    | "apology"
    | "retraction"
    | "costs"
    | "interest"
    | "other"
    | "unknown";
  fit: "strong" | "possible" | "weak" | "unknown";
  explanation: string;
  prerequisites: string[];
  risks: string[];
  alternatives: string[];
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyNarrativeAssessment = {
  id: string;
  theme: string;
  userStoryStrength: CaseConfidence;
  internalConsistency: CaseConfidence;
  evidenceSupport: CaseConfidence;
  legalFit: CaseConfidence;
  proceduralFit: CaseConfidence;
  judgeClarity: CaseConfidence;
  strengths: string[];
  weaknesses: string[];
  factsToClarify: string[];
  evidenceToAdd: string[];
  suggestedPlainLanguageFraming: string;
  warnings: string[];
};

export type LitigationStrategyCompetingNarrative = {
  id: string;
  narrativeName: string;
  whoWouldUseIt: "user" | "opposing-party" | "judge" | "unknown";
  summary: string;
  factsSupporting: string[];
  factsWeakening: string[];
  evidenceNeeded: string[];
  strategicRisk: string;
  responsePlan: string;
  confidence: CaseConfidence;
};

export type LitigationStrategyConsistencyCheck = {
  id: string;
  title: string;
  issue: string;
  affectedFields: string[];
  severity: CaseSeverity;
  explanation: string;
  suggestedFix: string;
  priority: LitigationStrategyPriority;
  confidence: CaseConfidence;
};

export type LitigationStrategyCriticalPathItem = {
  id: string;
  title: string;
  reason: string;
  mustHappenBefore: LitigationStrategyRoute[];
  blockedBy: string[];
  unlocks: LitigationStrategyRoute[];
  priority: LitigationStrategyPriority;
  estimatedImpact: "minor" | "moderate" | "major" | "case-changing" | "unknown";
  confidence: CaseConfidence;
};

export type LitigationStrategyMilestone = {
  id: string;
  title: string;
  targetRoute: LitigationStrategyRoute;
  completionCriteria: string[];
  blockingRisks: string[];
  evidenceRequired: string[];
  priority: LitigationStrategyPriority;
  completed: boolean;
};

export type LitigationStrategyHumanReviewTrigger = {
  id: string;
  trigger:
    | "urgent-deadline"
    | "limitation-risk"
    | "public-authority"
    | "charter"
    | "criminal-overlap"
    | "child-safety"
    | "serious-credibility-risk"
    | "contradicted-proof"
    | "unsafe-authority"
    | "complex-procedure"
    | "appeal"
    | "abuse-of-process"
    | "record-problem"
    | "unknown";
  explanation: string;
  whyHumanReviewMatters: string;
  urgency: LitigationStrategyPriority;
  recommendedReviewer:
    | "lawyer"
    | "duty-counsel"
    | "court-clerk"
    | "legal-clinic"
    | "trusted-adult"
    | "subject-matter-expert"
    | "unknown";
  warnings: string[];
};

export type LitigationStrategyDashboardSummary = {
  headline: string;
  shortSummary: string;
  strongestPoint: string;
  biggestRisk: string;
  nextBestStep: string;
  recommendedRoute: LitigationStrategyRoute;
  readinessLevel: LitigationStrategyReadinessLevel;
  strategyScore: number;
  warningCount: number;
  criticalRiskCount: number;
  humanReviewRequired: boolean;
};

export type LitigationStrategyUserFacingExplanation = {
  opening: string;
  whatMattersMost: string[];
  whatCouldHurtTheCase: string[];
  whatToDoNext: string[];
  whatNotToAssume: string[];
  plainLanguageSummary: string;
};

export type LitigationStrategyInternalNotes = {
  synthesis: string;
  litigationPosture: string;
  strategicTheory: string;
  developmentPlan: string;
  unresolvedRisks: string[];
  downstreamInstructions: string[];
};

export type LitigationStrategyIntegrationSnapshot = {
  sourceVersions: {
    litigationStrategyArchitecture: LitigationStrategyArchitectureVersion;
    caseAssemblyVersion?: string;
    workflowVersion?: string;
    litigationReasoningVersion?: string;
    legalReasoningVersion?: string;
    brainBridgeVersion?: string;
    brainMigrationVersion?: string;
  };
  consumedSources: LitigationStrategySource[];
  missingSources: LitigationStrategySource[];
  warnings: string[];
};

export type LitigationStrategyValidationResult = {
  safeToUseForUserGuidance: boolean;
  safeToUseForDocuments: boolean;
  safeToUseForCourtPackage: boolean;
  requiresHumanReview: boolean;
  warnings: string[];
};

export type LitigationStrategyModel = {
  id: string;
  version: LitigationStrategyArchitectureVersion;
  createdAt: string;
  updatedAt: string;

  caseId?: string;
  courtPath: CaseCourtPath;
  province: CaseProvince;
  stage: CaseStage;
  legalDomains: CaseLegalDomain[];

  overallReadiness: LitigationStrategyReadinessLevel;
  overallConfidence: CaseConfidence;
  strategyScore: number;

  dominantTheory?: LitigationStrategyTheory;
  alternativeTheories: LitigationStrategyTheory[];
  rejectedOrWeakTheories: LitigationStrategyTheory[];

  issueTree: LitigationStrategyIssueTreeNode[];
  dependencyGraph: LitigationStrategyDependencyGraph;
  elementMatrix: LitigationStrategyElementMatrixRow[];
  proofDependencies: LitigationStrategyProofDependency[];
  decisionBranches: LitigationStrategyDecisionBranch[];
  dynamicBranches: LitigationStrategyDynamicStrategyBranch[];

  findings: LitigationStrategyFinding[];
  opportunities: LitigationStrategyOpportunity[];
  risks: LitigationStrategyRisk[];

  burdenIssues: LitigationStrategyBurdenIssue[];
  investigationTargets: LitigationStrategyInvestigationTarget[];
  investigationPlans: LitigationStrategyInvestigationPlan[];
  evidencePriorities: LitigationStrategyEvidencePriority[];
  evidenceWeights: LitigationStrategyEvidenceWeight[];
  witnessPriorities: LitigationStrategyWitnessPriority[];
  crossExaminationRisks: LitigationStrategyCrossExaminationRisk[];
  exhibitPlan: LitigationStrategyExhibitPlanItem[];
  recordPreservation: LitigationStrategyRecordPreservationItem[];

  judicialReasoningQuestions: LitigationStrategyJudicialReasoningQuestion[];
  judicialConcerns: LitigationStrategyJudicialConcern[];
  opposingArguments: LitigationStrategyOpposingArgument[];

  settlementScenarios: LitigationStrategySettlementScenario[];
  courtReadinessSimulations: LitigationStrategyCourtReadinessSimulation[];
  riskSimulations: LitigationStrategyRiskSimulation[];
  trialIssues: LitigationStrategyTrialIssue[];
  appealIssues: LitigationStrategyAppealIssue[];

  charterIssues: LitigationStrategyCharterIssue[];
  publicAuthorityIssues: LitigationStrategyPublicAuthorityIssue[];
  abuseOfProcessIssues: LitigationStrategyAbuseOfProcessIssue[];
  proceduralOpportunities: LitigationStrategyProceduralOpportunity[];
  damagesLeverage: LitigationStrategyDamageLeverage[];
  remedyLeverage: LitigationStrategyRemedyLeverage[];

  narrativeAssessment: LitigationStrategyNarrativeAssessment;
  competingNarratives: LitigationStrategyCompetingNarrative[];
  consistencyChecks: LitigationStrategyConsistencyCheck[];
  criticalPath: LitigationStrategyCriticalPathItem[];
  milestones: LitigationStrategyMilestone[];
  humanReviewTriggers: LitigationStrategyHumanReviewTrigger[];

  dashboardSummary: LitigationStrategyDashboardSummary;
  userFacingExplanation: LitigationStrategyUserFacingExplanation;
  internalNotes: LitigationStrategyInternalNotes;
  integrationSnapshot: LitigationStrategyIntegrationSnapshot;
  validation: LitigationStrategyValidationResult;

  warnings: string[];
  nextActions: string[];
};

export type LitigationStrategyEngineInput = {
  caseId?: string;
  courtPath: CaseCourtPath;
  province: CaseProvince;
  stage: CaseStage;
  legalDomains: CaseLegalDomain[];
  sources: {
    conversationIntelligence?: unknown;
    caseInvestigation?: unknown;
    factPatternReadiness?: unknown;
    evidenceIntelligenceReadiness?: unknown;
    timeline?: unknown;
    evidenceGraph?: unknown;
    proceduralState?: unknown;
    claimTheory?: unknown;
    damagesRemedy?: unknown;
    credibilityRisk?: unknown;
    authorityReadiness?: unknown;
    legalReasoning?: unknown;
    workflow?: unknown;
    litigationReasoning?: unknown;
    assembly?: unknown;
    brainBridge?: unknown;
    brainMigration?: unknown;
  };
  options?: {
    includeUserFacingExplanation?: boolean;
    includeInternalNotes?: boolean;
    includeDashboardSummary?: boolean;
    requireHumanReviewForHighRisk?: boolean;
  };
};

export type LitigationStrategyEngineOutput = {
  model: LitigationStrategyModel;
  warnings: string[];
};

export const LITIGATION_STRATEGY_ARCHITECTURE_VERSION: LitigationStrategyArchitectureVersion =
  "1.3.0";

export const EMPTY_LITIGATION_STRATEGY_DASHBOARD_SUMMARY: LitigationStrategyDashboardSummary =
  {
    headline: "Litigation strategy not developed yet",
    shortSummary:
      "The system needs more facts, evidence, procedure, and legal reasoning before producing a reliable strategy.",
    strongestPoint: "",
    biggestRisk: "Strategy is not ready yet.",
    nextBestStep: "Continue building the case record.",
    recommendedRoute: "/builder",
    readinessLevel: "not-ready",
    strategyScore: 0,
    warningCount: 0,
    criticalRiskCount: 0,
    humanReviewRequired: false,
  };

export const EMPTY_LITIGATION_STRATEGY_USER_EXPLANATION: LitigationStrategyUserFacingExplanation =
  {
    opening:
      "I can help organize this into a strategy, but the case needs more development before relying on final litigation guidance.",
    whatMattersMost: [],
    whatCouldHurtTheCase: [],
    whatToDoNext: [
      "Continue adding facts, dates, evidence, and the outcome being requested.",
    ],
    whatNotToAssume: [
      "Do not assume the strongest legal theory is confirmed until the facts, evidence, procedure, and legal authority are reviewed.",
    ],
    plainLanguageSummary:
      "The strategy layer is waiting for enough case information to identify strengths, weaknesses, risks, and next steps.",
  };

export const EMPTY_LITIGATION_STRATEGY_INTERNAL_NOTES: LitigationStrategyInternalNotes =
  {
    synthesis: "No complete strategy synthesis has been generated yet.",
    litigationPosture: "Unknown litigation posture.",
    strategicTheory: "No dominant strategic theory has been selected.",
    developmentPlan: "Continue building the case record.",
    unresolvedRisks: [],
    downstreamInstructions: [],
  };

export const EMPTY_LITIGATION_STRATEGY_NARRATIVE_ASSESSMENT: LitigationStrategyNarrativeAssessment =
  {
    id: "empty_narrative_assessment",
    theme: "No strategy narrative yet",
    userStoryStrength: "very-low",
    internalConsistency: "very-low",
    evidenceSupport: "very-low",
    legalFit: "very-low",
    proceduralFit: "very-low",
    judgeClarity: "very-low",
    strengths: [],
    weaknesses: ["The strategy narrative has not been developed yet."],
    factsToClarify: [],
    evidenceToAdd: [],
    suggestedPlainLanguageFraming:
      "Continue adding facts, dates, evidence, and the outcome being requested.",
    warnings: ["Strategy narrative is not ready."],
  };

export const EMPTY_LITIGATION_STRATEGY_DEPENDENCY_GRAPH: LitigationStrategyDependencyGraph =
  {
    nodes: [],
    edges: [],
    criticalNodeIds: [],
    blockedNodeIds: [],
    warnings: ["No strategy dependency graph has been generated yet."],
  };

export const EMPTY_LITIGATION_STRATEGY_INTEGRATION_SNAPSHOT: LitigationStrategyIntegrationSnapshot =
  {
    sourceVersions: {
      litigationStrategyArchitecture: "1.3.0",
    },
    consumedSources: [],
    missingSources: [],
    warnings: ["No strategy sources have been consumed yet."],
  };

export const EMPTY_LITIGATION_STRATEGY_VALIDATION: LitigationStrategyValidationResult =
  {
    safeToUseForUserGuidance: false,
    safeToUseForDocuments: false,
    safeToUseForCourtPackage: false,
    requiresHumanReview: false,
    warnings: ["Litigation strategy has not been validated yet."],
  };

export function createEmptyLitigationStrategyModel(args: {
  caseId?: string;
  courtPath: CaseCourtPath;
  province: CaseProvince;
  stage: CaseStage;
  legalDomains: CaseLegalDomain[];
  createdAt: string;
}): LitigationStrategyModel {
  return {
    id: `litigation_strategy_${args.caseId || "unknown"}`,
    version: "1.3.0",
    createdAt: args.createdAt,
    updatedAt: args.createdAt,

    caseId: args.caseId,
    courtPath: args.courtPath,
    province: args.province,
    stage: args.stage,
    legalDomains: args.legalDomains,

    overallReadiness: "not-ready",
    overallConfidence: "very-low",
    strategyScore: 0,

    dominantTheory: undefined,
    alternativeTheories: [],
    rejectedOrWeakTheories: [],

    issueTree: [],
    dependencyGraph: EMPTY_LITIGATION_STRATEGY_DEPENDENCY_GRAPH,
    elementMatrix: [],
    proofDependencies: [],
    decisionBranches: [],
    dynamicBranches: [],

    findings: [],
    opportunities: [],
    risks: [],

    burdenIssues: [],
    investigationTargets: [],
    investigationPlans: [],
    evidencePriorities: [],
    evidenceWeights: [],
    witnessPriorities: [],
    crossExaminationRisks: [],
    exhibitPlan: [],
    recordPreservation: [],

    judicialReasoningQuestions: [],
    judicialConcerns: [],
    opposingArguments: [],

    settlementScenarios: [],
    courtReadinessSimulations: [],
    riskSimulations: [],
    trialIssues: [],
    appealIssues: [],

    charterIssues: [],
    publicAuthorityIssues: [],
    abuseOfProcessIssues: [],
    proceduralOpportunities: [],
    damagesLeverage: [],
    remedyLeverage: [],

    narrativeAssessment: EMPTY_LITIGATION_STRATEGY_NARRATIVE_ASSESSMENT,
    competingNarratives: [],
    consistencyChecks: [],
    criticalPath: [],
    milestones: [],
    humanReviewTriggers: [],

    dashboardSummary: EMPTY_LITIGATION_STRATEGY_DASHBOARD_SUMMARY,
    userFacingExplanation: EMPTY_LITIGATION_STRATEGY_USER_EXPLANATION,
    internalNotes: EMPTY_LITIGATION_STRATEGY_INTERNAL_NOTES,
    integrationSnapshot: EMPTY_LITIGATION_STRATEGY_INTEGRATION_SNAPSHOT,
    validation: EMPTY_LITIGATION_STRATEGY_VALIDATION,

    warnings: ["Litigation strategy has not been generated yet."],
    nextActions: ["Continue building the case record."],
  };
}