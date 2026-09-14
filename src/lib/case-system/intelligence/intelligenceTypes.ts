import { FactPatternAnalysisResult } from "../facts/factPatternTypes";
import type { ProceduralEvent } from "../procedure/proceduralStateArchitecture";
import { EvidenceIntelligenceResult } from "../evidence/evidenceIntelligenceTypes";

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

export type OfficialGuidanceReference = LegalSourceReference & {
  guidanceClassification: "official-guidance";
  isBinding: false;
  canShowToUser: boolean;
  canUseForReasoning: boolean;
  appliesToStages: IntelligenceStage[];
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

/**
 * Session 48. Was:
 *   "satisfied" | "partially-satisfied" | "missing" | "contradicted" | "not-applicable"
 *
 * "satisfied" is an assertion that THIS USER'S FACTS MEET A LEGAL TEST —
 * the "who does the applying" violation in CLAUDE.md section 2, encoded as
 * a required schema field rather than as prose. The model was told in the
 * prompt never to grade the case and then required to mark every element
 * satisfied or partially-satisfied. A schema constraint beats a prose
 * prohibition, so it complied with the requirement and violated the
 * prohibition.
 *
 * These values record what the USER SUPPLIED, which the system may state,
 * instead of whether a legal element is met, which it may not. The system
 * can see whether a document exists; it cannot decide whether it proves
 * anything.
 *
 * "conflicting-information" replaces "contradicted" for the same reason at
 * lower stakes: it describes the file (two things disagree) rather than
 * adjudicating which is right.
 */
export type ClaimElementStatus =
  | "documented"
  | "partially-documented"
  | "not-documented"
  | "conflicting-information"
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
  // Session 48: `strength` removed. The cognition prompt asked the model to
  // grade the proof for an issue as low/medium/high and to "explain why the
  // current proof is weak, developing, or stronger". `missingEvidence` already
  // states, factually, what is not in the file.
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
  officialGuidance: OfficialGuidanceReference[];
  precedentMatches: PrecedentMatchAssessment[];
  sourceWarnings: string[];
};

/**
 * Session 48 — FIX 3. Was:
 *   "proven" | "partly-proven" | "missing-proof" | "contradicted" | "not-applicable"
 *
 * The same violation as ClaimElementStatus above, renamed in the same pass
 * that renamed it (24e47c3 did the element status; this is the follow-up that
 * commit scoped). "Proven" asserts that the user's evidence establishes a
 * legal element. Whether something is proven is a conclusion for a court;
 * whether a document has been RECORDED against an element is a fact about the
 * file, and only the second is the system's to state.
 *
 * Cross-module, as that note predicted: renamed at all five declaration sites
 * (here, elementProofEngine.ts, architecture/masterCaseSchema.ts,
 * litigation-strategy/litigationStrategyArchitecture.ts, types/proof-map.ts)
 * plus the comparison sites in courtSimplifiedBrain.ts and
 * elementProofEngine.ts.
 *
 * CANNOT AFFECT GENERATION, which is why it is safe to do alongside a
 * measured prompt change: the model never sees this type. It is assigned
 * downstream by deterministic code from the element status the model
 * produced. Old values are mapped rather than rejected —
 * normalizeElementProofStatus() below — because saved case records carry
 * them, the same reasoning as normalizeElementStatus().
 */
export type ElementProofStatus =
  | "evidence-recorded"
  | "some-evidence-recorded"
  | "no-evidence-recorded"
  | "contradicted"
  | "not-applicable";

/**
 * Maps the old vocabulary rather than rejecting it, the same reasoning as
 * normalizeElementStatus() in courtSimplifiedBrain.ts: saved case records
 * written before this rename carry "proven"/"partly-proven"/"missing-proof",
 * and a hard rejection would turn a real recorded status into a defaulted
 * wrong one.
 *
 * Unrecognised input defaults to "some-evidence-recorded" for the same reason
 * the element status defaults to "partially-documented": the safer error is
 * to say something may have been recorded and let the user correct it, not to
 * tell them an element is empty because of an unexpected string.
 */
export function normalizeElementProofStatus(raw: string): ElementProofStatus {
  switch (raw) {
    case "evidence-recorded":
    case "some-evidence-recorded":
    case "no-evidence-recorded":
    case "contradicted":
    case "not-applicable":
      return raw;
    // Legacy vocabulary, from a saved record.
    case "proven":
      return "evidence-recorded";
    case "partly-proven":
      return "some-evidence-recorded";
    case "missing-proof":
      return "no-evidence-recorded";
    default:
      return "some-evidence-recorded";
  }
}

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
  nextAction: string;
  explanation: string;
};

/** Mirrors ElementsByRecordStatus in elementProofEngine.ts. */
export type ElementsByRecordStatus = {
  recorded: string[];
  partlyRecorded: string[];
  nothingRecorded: string[];
  contradicted: string[];
};

export type ClaimProofMap = {
  id: string;
  claimId: string;
  claimType: LegalDomain;
  claimTitle: string;
  // Session 48: overallProofStrength / weakestElements / strongestElements
  // removed. They ranked the user's case by how well each element was doing,
  // and overallProofStrength was computed as averageScore minus a penalty
  // weighting not-recorded and contradicted elements — a risk-weighted score.
  elementsByRecordStatus: ElementsByRecordStatus;
  missingEvidence: string[];
  nextActions: string[];
  elementFindings: ElementProofFinding[];
};

export type ElementProofEngineResult = {
  version: "1.0.0";
  claimProofMaps: ClaimProofMap[];
  globalNothingRecorded: string[];
  globalNextActions: string[];
  summary: string;
};

export type LegalIntelligenceResult = {
  id: string;
  /**
   * Whether the structured reasoning model actually ran. Machine-readable so
   * callers never have to pattern-match user-facing warning prose to detect
   * fallback mode, which previously coupled display text to route behaviour.
   */
  cognitionMode?: "structured" | "fallback";
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
  formRecommendations: FormRecommendation[];
  legalKnowledge: LegalKnowledgePacket;

  factPatternAnalysis?: FactPatternAnalysisResult;
  evidenceIntelligenceAnalysis?: EvidenceIntelligenceResult;
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
  allowExternalCognition?: boolean;
  /**
   * Live case_events rows for this case, already mapped through
   * events/caseEventAdapter.toProceduralEvents by the caller.
   *
   * Passed DOWN from the route rather than fetched here, for the same reason
   * existingMasterResult and existingNormalizedIntake are: every layer between
   * the route and the bridge stays a pure function, which is what lets the
   * fixture harness and verifyCaseOutcomeMatrix call them directly without a
   * database stub.
   *
   * Absent means NO events -- never a fallback to the narrative parse. A caller
   * that forgets to supply these produces an empty procedural event list, which
   * is visible, rather than silently reverting to unconfirmed inferences.
   */
  confirmedEvents?: ProceduralEvent[];
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
