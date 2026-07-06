import {
  CaseAuthorityAnalysis,
  CaseConfidence,
  CaseContradictionAnalysis,
  CaseCourtPath,
  CaseCredibilityAnalysis,
  CaseCredibilityRiskLevel,
  CaseEvidenceIntelligence,
  CaseFactPatternAnalysis,
  CaseLegalDomain,
  CaseProvince,
  CaseStage,
} from "../architecture/masterCaseSchema";

import { buildTimelineCognition } from "../timeline/timelineCognitionEngine";
import { buildEvidenceRelationshipGraph } from "../evidence/evidenceRelationshipEngine";
import { buildProceduralState } from "../procedure/proceduralStateEngine";
import { buildClaimTheoryModel } from "../claims/claimTheoryEngine";
import { buildDamagesRemedyModel } from "../damages/damagesRemedyEngine";
import { buildCredibilityRiskModel } from "../credibility/credibilityRiskEngine";
import { buildWorkflowOrchestration } from "../workflow/workflowOrchestrationEngine";

import {
  buildLitigationReasoning,
  LitigationReasoningResult,
} from "../litigation-intelligence/litigationReasoningEngine";

import {
  buildLegalReasoningCoordinator,
  CoordinatedReasoningPackage,
} from "../knowledge/legalReasoningCoordinator";

import { DOCTRINE_SEED_LIBRARY } from "../knowledge/doctrineSeedLibrary";

import {
  LitigationTimelineModel,
  TimelineBuildInput,
} from "../timeline/timelineEventArchitecture";

import {
  EvidenceRelationshipGraph,
  EvidenceGraphBuildInput,
} from "../evidence/evidenceRelationshipArchitecture";

import {
  ProceduralStateModel,
  ProceduralStateBuildInput,
} from "../procedure/proceduralStateArchitecture";

import {
  ClaimTheoryModel,
  ClaimTheoryBuildInput,
} from "../claims/claimTheoryArchitecture";

import {
  DamagesRemedyModel,
  DamagesRemedyBuildInput,
} from "../damages/damagesRemedyArchitecture";

import { CredibilityRiskModel } from "../credibility/credibilityRiskArchitecture";

import {
  WorkflowAuthorityInput,
  WorkflowContradictionInput,
  WorkflowCredibilityInput,
  WorkflowLegalReasoningInput,
  WorkflowOrchestrationModel,
  WorkflowProceduralInput,
  WorkflowProofInput,
} from "../workflow/workflowOrchestrationArchitecture";

export type CaseSystemAssemblyVersion = "1.6.0";

export type FormReadinessModel = {
  requiredLabels: string[];
  recommendedLabels: string[];
  completedLabels: string[];
  missingFormInformation: string[];
  formWarnings: string[];
  source: "courtSimplifiedBrain" | "fallback-assembly";
};

export type AssemblyLegalReasoningReadinessModel = {
  hasLegalReasoning: boolean;
  legalReasoningReadiness: CaseConfidence;
  primaryDomains: CaseLegalDomain[];
  profileCount: number;
  authorityCount: number;
  knowledgeObjectCount: number;
  investigationPriorities: string[];
  evidencePriorities: string[];
  burdenPriorities: string[];
  proceduralWatchPoints: string[];
  judicialConcerns: string[];
  opposingArguments: string[];
  firstQuestions: string[];
  warnings: string[];
  blockedObjects: string[];
  summary: string;
};

export type AssemblyFactPatternReadinessModel = {
  hasFactPatternAnalysis: boolean;
  factPatternReadiness: CaseConfidence;
  findingCount: number;
  admissionCount: number;
  contradictionCount: number;
  credibilityIssueCount: number;
  knowledgeIndicatorCount: number;
  timelineIssueCount: number;
  causationIssueCount: number;
  damagesIndicatorCount: number;
  strongestPatterns: string[];
  weakestPatterns: string[];
  nextActions: string[];
  warnings: string[];
  summary: string;
};

export type AssemblyEvidenceIntelligenceReadinessModel = {
  hasEvidenceIntelligence: boolean;
  evidenceIntelligenceReadiness: CaseConfidence;
  findingCount: number;
  gapCount: number;
  contradictionCount: number;
  strongestEvidence: string[];
  weakestEvidence: string[];
  recommendedEvidenceCollection: string[];
  warnings: string[];
  summary: string;
};

export type AssemblyProofReadinessModel = {
  hasProofAnalysis: boolean;
  proofReadiness: CaseConfidence;
  proofWeaknesses: string[];
  proofStrengths: string[];
  proofNextActions: string[];
  weakClaimProofCount: number;
  missingElementProofCount: number;
  contradictedElementProofCount: number;
  warnings: string[];
};

export type AssemblyAuthorityReadinessModel = {
  hasAuthorityAnalysis: boolean;
  authorityReadiness: CaseConfidence;
  verifiedAuthorityCount: number;
  strongestAuthorityCount: number;
  unsafeAuthorityCount: number;
  directlyApplicableAuthorityCount: number;
  wrongJurisdictionAuthorityCount: number;
  warnings: string[];
  summary: string;
};

export type AssemblyContradictionReadinessModel = {
  hasContradictionAnalysis: boolean;
  contradictionReadiness: CaseConfidence;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  moderateFindings: number;
  lowFindings: number;
  overallRisk: "minimal" | "manageable" | "elevated" | "serious" | "critical";
  warnings: string[];
  summary: string;
};

export type AssemblyCredibilityIntelligenceModel = {
  hasCredibilityAnalysis: boolean;
  credibilityReadiness: CaseConfidence;
  overallScore: number;
  overallLevel: CaseCredibilityRiskLevel;
  judgeConcernScore: number;
  crossExaminationRiskScore: number;
  settlementPressureScore: number;
  documentReadinessImpact: "none" | "minor" | "moderate" | "major" | "severe";
  warnings: string[];
  nextActions: string[];
  summary: string;
};

export type CaseSystemAssemblyInput = {
  caseId?: string;
  courtPath: CaseCourtPath;
  province: CaseProvince;
  stage: CaseStage;
  rawNarrative?: string;

  legalDomains: CaseLegalDomain[];

  timeline?: Omit<
    TimelineBuildInput,
    "caseId" | "courtPath" | "province" | "stage"
  >;

  evidence?: Omit<EvidenceGraphBuildInput, "caseId" | "stage">;

  procedure?: Omit<
    ProceduralStateBuildInput,
    "caseId" | "courtPath" | "province" | "stage"
  >;

  claims?: Omit<ClaimTheoryBuildInput, "caseId" | "stage">;

  damages?: Omit<
    DamagesRemedyBuildInput,
    "caseId" | "stage" | "legalDomains"
  >;

  forms?: {
    requiredLabels?: string[];
    recommendedLabels?: string[];
    completedLabels?: string[];
    missingFormInformation?: string[];
    formWarnings?: string[];
  };

  factPatternAnalysis?: CaseFactPatternAnalysis;
  evidenceIntelligence?: CaseEvidenceIntelligence;
  proof?: WorkflowProofInput;

  authorityAnalysis?: CaseAuthorityAnalysis;
  contradictionAnalysis?: CaseContradictionAnalysis;
  credibilityAnalysis?: CaseCredibilityAnalysis;

  knowledgeWarnings?: string[];
};

export type CaseSystemAssemblyModel = {
  id: string;
  version: CaseSystemAssemblyVersion;
  createdAt: string;
  updatedAt: string;

  caseId?: string;

  courtPath: CaseCourtPath;
  province: CaseProvince;
  stage: CaseStage;

  legalDomains: CaseLegalDomain[];

  timeline: LitigationTimelineModel;
  evidenceGraph: EvidenceRelationshipGraph;
  proceduralState: ProceduralStateModel;
  claimTheory: ClaimTheoryModel;
  damagesRemedy: DamagesRemedyModel;
  credibilityRisk: CredibilityRiskModel;
  workflow: WorkflowOrchestrationModel;
  litigationReasoning: LitigationReasoningResult;
  legalReasoning: CoordinatedReasoningPackage;

  formReadiness: FormReadinessModel;
  legalReasoningReadiness: AssemblyLegalReasoningReadinessModel;
  factPatternReadiness: AssemblyFactPatternReadinessModel;
  evidenceIntelligenceReadiness: AssemblyEvidenceIntelligenceReadinessModel;
  proofReadiness: AssemblyProofReadinessModel;
  authorityReadiness: AssemblyAuthorityReadinessModel;
  contradictionReadiness: AssemblyContradictionReadinessModel;
  credibilityIntelligence: AssemblyCredibilityIntelligenceModel;

  warnings: string[];
};

export type CaseSystemAssemblyOutput = {
  assembly: CaseSystemAssemblyModel;
  warnings: string[];
};

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function cleanString(value: unknown): string {
  return String(value || "").trim();
}

function uniqueStrings(items: unknown[]): string[] {
  return Array.from(new Set(items.map(cleanString).filter(Boolean)));
}

function hasDominantClaim(model: ClaimTheoryModel): boolean {
  return (model?.arbitration?.dominantClaimTheoryIds || []).length > 0;
}

function hasEvidence(graph: EvidenceRelationshipGraph): boolean {
  return (graph?.nodes || []).length > 0;
}

function hasTimeline(timeline: LitigationTimelineModel): boolean {
  return (timeline?.events || []).length > 0;
}

function hasDamagesModel(model: DamagesRemedyModel): boolean {
  return (
    (model?.amounts || []).length > 0 ||
    (model?.remedyAssessments || []).length > 0
  );
}

function safeLegalDomains(domains: CaseLegalDomain[]): CaseLegalDomain[] {
  const cleaned = uniqueStrings(domains) as CaseLegalDomain[];
  return cleaned.length > 0 ? cleaned : ["unknown"];
}

function buildFallbackFormReadiness(input: CaseSystemAssemblyInput): FormReadinessModel {
  const requiredLabels: string[] = [];
  const recommendedLabels: string[] = [];
  const missingFormInformation: string[] = [];
  const formWarnings: string[] = [];

  if (input.courtPath === "family") {
    if (input.stage === "starting-case") requiredLabels.push("Form 8 — Application");
    if (input.stage === "responding") requiredLabels.push("Form 10 — Answer");
    if (input.stage === "conference") requiredLabels.push("Form 17A — Case Conference Brief");

    if (input.stage === "motion" || input.stage === "urgent") {
      requiredLabels.push("Form 14 — Notice of Motion");
      requiredLabels.push("Form 14A — Affidavit");
    }
  }

  if (input.courtPath === "civil") {
    if (input.stage === "starting-case") {
      requiredLabels.push("Form 14A — Statement of Claim");
      recommendedLabels.push("Form 4A — General Heading");
      recommendedLabels.push("Form 4C — Backsheet");
    }

    if (input.stage === "responding") requiredLabels.push("Form 18A — Statement of Defence");

    if (input.stage === "motion" || input.stage === "urgent") {
      requiredLabels.push("Form 37A — Notice of Motion");
      recommendedLabels.push("Affidavit in support of motion");
    }
  }

  if (input.courtPath === "small-claims") {
    if (input.stage === "starting-case") requiredLabels.push("Form 7A — Plaintiff’s Claim");
    if (input.stage === "responding") requiredLabels.push("Form 9A — Defence");
    if (input.stage === "conference") recommendedLabels.push("Settlement Conference preparation materials");
  }

  if (input.stage === "not-sure") {
    formWarnings.push("The procedural stage is not clear enough for reliable form selection.");
    missingFormInformation.push(
      "Clarify whether the user is starting a case, responding, attending a conference, bringing a motion, preparing for trial, or enforcing an order.",
    );
  }

  return {
    requiredLabels: uniqueStrings([...(input.forms?.requiredLabels || []), ...requiredLabels]),
    recommendedLabels: uniqueStrings([...(input.forms?.recommendedLabels || []), ...recommendedLabels]),
    completedLabels: uniqueStrings(input.forms?.completedLabels || []),
    missingFormInformation: uniqueStrings([
      ...(input.forms?.missingFormInformation || []),
      ...missingFormInformation,
    ]),
    formWarnings: uniqueStrings([...(input.forms?.formWarnings || []), ...formWarnings]),
    source: input.forms ? "courtSimplifiedBrain" : "fallback-assembly",
  };
}

function buildLegalReasoningReadiness(
  legalReasoning: CoordinatedReasoningPackage,
): AssemblyLegalReasoningReadinessModel {
  const warnings = uniqueStrings(legalReasoning.knowledge.warnings || []);
  const blockedObjects = uniqueStrings(
    (legalReasoning.knowledge.blockedObjects || []).map(
      (object) => `${object.objectId}: ${object.reason}`,
    ),
  );

  const profileCount = legalReasoning.profiles.length;
  const authorityCount = legalReasoning.authorities.length;
  const knowledgeObjectCount = legalReasoning.knowledge.objects.length;

  const hasLegalReasoning =
    profileCount > 0 ||
    authorityCount > 0 ||
    knowledgeObjectCount > 0 ||
    legalReasoning.reasoningSummary.primaryDomains.length > 0;

  const legalReasoningReadiness: CaseConfidence =
    blockedObjects.length > 0
      ? "low"
      : warnings.length > 0
        ? "medium"
        : profileCount > 0 &&
            legalReasoning.reasoningSummary.evidencePriorities.length > 0 &&
            legalReasoning.reasoningSummary.burdenPriorities.length > 0
          ? "high"
          : hasLegalReasoning
            ? "medium"
            : "low";

  return {
    hasLegalReasoning,
    legalReasoningReadiness,
    primaryDomains: legalReasoning.reasoningSummary.primaryDomains,
    profileCount,
    authorityCount,
    knowledgeObjectCount,
    investigationPriorities: uniqueStrings(
      legalReasoning.reasoningSummary.investigationPriorities,
    ),
    evidencePriorities: uniqueStrings(
      legalReasoning.reasoningSummary.evidencePriorities,
    ),
    burdenPriorities: uniqueStrings(
      legalReasoning.reasoningSummary.burdenPriorities,
    ),
    proceduralWatchPoints: uniqueStrings(
      legalReasoning.reasoningSummary.proceduralWatchPoints,
    ),
    judicialConcerns: uniqueStrings(
      legalReasoning.reasoningSummary.judicialConcerns,
    ),
    opposingArguments: uniqueStrings(
      legalReasoning.reasoningSummary.opposingArguments,
    ),
    firstQuestions: uniqueStrings(legalReasoning.reasoningSummary.firstQuestions),
    warnings,
    blockedObjects,
    summary: hasLegalReasoning
      ? `Legal reasoning assembled with ${profileCount} profile(s), ${knowledgeObjectCount} knowledge object(s), and ${authorityCount} authority entrie(s).`
      : "Legal reasoning was assembled but no matching reasoning profile, authority, or knowledge object was found.",
  };
}

function buildFactPatternReadiness(
  factPatternAnalysis?: CaseFactPatternAnalysis,
): AssemblyFactPatternReadinessModel {
  if (!factPatternAnalysis) {
    return {
      hasFactPatternAnalysis: false,
      factPatternReadiness: "low",
      findingCount: 0,
      admissionCount: 0,
      contradictionCount: 0,
      credibilityIssueCount: 0,
      knowledgeIndicatorCount: 0,
      timelineIssueCount: 0,
      causationIssueCount: 0,
      damagesIndicatorCount: 0,
      strongestPatterns: [],
      weakestPatterns: [],
      nextActions: [],
      warnings: ["Fact pattern analysis has not been supplied to the assembly layer."],
      summary: "No fact pattern analysis was supplied to assembly.",
    };
  }

  const contradictionCount = factPatternAnalysis.contradictions.length;
  const credibilityIssueCount = factPatternAnalysis.credibilityIssues.length;
  const causationIssueCount = factPatternAnalysis.causationIssues.length;
  const damagesIndicatorCount = factPatternAnalysis.damagesIndicators.length;

  const factPatternReadiness: CaseConfidence =
    credibilityIssueCount > 0 || contradictionCount > 0
      ? "low"
      : causationIssueCount > 0 || damagesIndicatorCount > 0
        ? "medium"
        : factPatternAnalysis.findings.length > 0
          ? "high"
          : "medium";

  return {
    hasFactPatternAnalysis: true,
    factPatternReadiness,
    findingCount: factPatternAnalysis.findings.length,
    admissionCount: factPatternAnalysis.admissions.length,
    contradictionCount,
    credibilityIssueCount,
    knowledgeIndicatorCount: factPatternAnalysis.knowledgeIndicators.length,
    timelineIssueCount: factPatternAnalysis.timelineIssues.length,
    causationIssueCount,
    damagesIndicatorCount,
    strongestPatterns: uniqueStrings(factPatternAnalysis.strongestPatterns),
    weakestPatterns: uniqueStrings(factPatternAnalysis.weakestPatterns),
    nextActions: uniqueStrings(factPatternAnalysis.nextActions),
    warnings: uniqueStrings([
      ...factPatternAnalysis.warnings,
      contradictionCount > 0
        ? `${contradictionCount} fact pattern contradiction(s) require review.`
        : "",
      credibilityIssueCount > 0
        ? `${credibilityIssueCount} fact pattern credibility issue(s) require review.`
        : "",
      factPatternAnalysis.timelineIssues.length > 0
        ? `${factPatternAnalysis.timelineIssues.length} timeline issue(s) should be organized into chronology.`
        : "",
      causationIssueCount > 0
        ? `${causationIssueCount} causation issue(s) should be proof-tested.`
        : "",
      damagesIndicatorCount > 0
        ? `${damagesIndicatorCount} damages signal(s) should be linked to records or calculations.`
        : "",
    ]),
    summary: factPatternAnalysis.summary,
  };
}

function buildEvidenceIntelligenceReadiness(
  evidenceIntelligence?: CaseEvidenceIntelligence,
): AssemblyEvidenceIntelligenceReadinessModel {
  if (!evidenceIntelligence) {
    return {
      hasEvidenceIntelligence: false,
      evidenceIntelligenceReadiness: "low",
      findingCount: 0,
      gapCount: 0,
      contradictionCount: 0,
      strongestEvidence: [],
      weakestEvidence: [],
      recommendedEvidenceCollection: [],
      warnings: ["Evidence intelligence has not been supplied to the assembly layer."],
      summary: "No evidence intelligence was supplied to assembly.",
    };
  }

  const gapCount = evidenceIntelligence.gaps.length;
  const contradictionCount = evidenceIntelligence.contradictions.length;

  const hasCriticalGap = evidenceIntelligence.gaps.some(
    (gap) => gap.severity === "critical" || gap.severity === "high",
  );

  const evidenceIntelligenceReadiness: CaseConfidence =
    hasCriticalGap || contradictionCount > 0
      ? "low"
      : gapCount > 0
        ? "medium"
        : evidenceIntelligence.findings.length > 0
          ? "high"
          : "low";

  return {
    hasEvidenceIntelligence: true,
    evidenceIntelligenceReadiness,
    findingCount: evidenceIntelligence.findings.length,
    gapCount,
    contradictionCount,
    strongestEvidence: uniqueStrings(evidenceIntelligence.strongestEvidence),
    weakestEvidence: uniqueStrings(evidenceIntelligence.weakestEvidence),
    recommendedEvidenceCollection: uniqueStrings(
      evidenceIntelligence.recommendedEvidenceCollection,
    ),
    warnings: uniqueStrings([
      ...evidenceIntelligence.warnings,
      gapCount > 0 ? `${gapCount} evidence gap(s) require review.` : "",
      contradictionCount > 0
        ? `${contradictionCount} evidence contradiction/context issue(s) require review.`
        : "",
      evidenceIntelligence.weakestEvidence.length > 0
        ? `${evidenceIntelligence.weakestEvidence.length} weak evidence item(s) should be strengthened or explained.`
        : "",
    ]),
    summary: evidenceIntelligence.summary,
  };
}

function buildProofReadiness(input: CaseSystemAssemblyInput): AssemblyProofReadinessModel {
  const proof = input.proof;

  if (!proof?.hasProofAnalysis) {
    return {
      hasProofAnalysis: false,
      proofReadiness: "low",
      proofWeaknesses: [],
      proofStrengths: [],
      proofNextActions: [],
      weakClaimProofCount: 0,
      missingElementProofCount: 0,
      contradictedElementProofCount: 0,
      warnings: ["Element proof analysis has not been supplied to the assembly layer."],
    };
  }

  const weakClaimProofCount = proof.weakClaimProofCount || 0;
  const missingElementProofCount = proof.missingElementProofCount || 0;
  const contradictedElementProofCount = proof.contradictedElementProofCount || 0;

  const proofReadiness: CaseConfidence =
    contradictedElementProofCount > 0
      ? "very-low"
      : missingElementProofCount > 0
        ? "low"
        : weakClaimProofCount > 0
          ? "medium"
          : (proof.proofStrengths || []).length > 0
            ? "high"
            : "medium";

  return {
    hasProofAnalysis: true,
    proofReadiness,
    proofWeaknesses: uniqueStrings(proof.proofWeaknesses || []),
    proofStrengths: uniqueStrings(proof.proofStrengths || []),
    proofNextActions: uniqueStrings(proof.proofNextActions || []),
    weakClaimProofCount,
    missingElementProofCount,
    contradictedElementProofCount,
    warnings: uniqueStrings([
      ...(proof.proofWeaknesses || []).map((weakness) => `Proof weakness: ${weakness}`),
      contradictedElementProofCount > 0
        ? `${contradictedElementProofCount} element(s) appear contradicted and require review.`
        : "",
      missingElementProofCount > 0
        ? `${missingElementProofCount} element(s) are missing proof.`
        : "",
      weakClaimProofCount > 0
        ? `${weakClaimProofCount} claim proof map(s) are weak.`
        : "",
    ]),
  };
}

function buildAuthorityReadiness(
  authorityAnalysis?: CaseAuthorityAnalysis,
): AssemblyAuthorityReadinessModel {
  if (!authorityAnalysis) {
    return {
      hasAuthorityAnalysis: false,
      authorityReadiness: "low",
      verifiedAuthorityCount: 0,
      strongestAuthorityCount: 0,
      unsafeAuthorityCount: 0,
      directlyApplicableAuthorityCount: 0,
      wrongJurisdictionAuthorityCount: 0,
      warnings: ["Authority analysis has not been supplied to the assembly layer."],
      summary: "No authority analysis was supplied to assembly.",
    };
  }

  const unsafeAuthorityCount = authorityAnalysis.unsafeAuthorityIds.length;
  const wrongJurisdictionAuthorityCount =
    authorityAnalysis.wrongJurisdictionAuthorityIds.length;

  const authorityReadiness: CaseConfidence =
    unsafeAuthorityCount > 0
      ? "very-low"
      : wrongJurisdictionAuthorityCount > 0
        ? "low"
        : authorityAnalysis.warnings.length > 0
          ? "medium"
          : authorityAnalysis.strongestAuthorityIds.length > 0
            ? "high"
            : "medium";

  return {
    hasAuthorityAnalysis: true,
    authorityReadiness,
    verifiedAuthorityCount: authorityAnalysis.verifiedAuthorityIds.length,
    strongestAuthorityCount: authorityAnalysis.strongestAuthorityIds.length,
    unsafeAuthorityCount,
    directlyApplicableAuthorityCount:
      authorityAnalysis.directlyApplicableAuthorityIds.length,
    wrongJurisdictionAuthorityCount,
    warnings: uniqueStrings(authorityAnalysis.warnings),
    summary: authorityAnalysis.summary,
  };
}

function buildContradictionReadiness(
  contradictionAnalysis?: CaseContradictionAnalysis,
): AssemblyContradictionReadinessModel {
  if (!contradictionAnalysis) {
    return {
      hasContradictionAnalysis: false,
      contradictionReadiness: "low",
      totalFindings: 0,
      criticalFindings: 0,
      highFindings: 0,
      moderateFindings: 0,
      lowFindings: 0,
      overallRisk: "minimal",
      warnings: ["Contradiction analysis has not been supplied to the assembly layer."],
      summary: "No contradiction analysis was supplied to assembly.",
    };
  }

  const contradictionReadiness: CaseConfidence =
    contradictionAnalysis.criticalFindings > 0
      ? "very-low"
      : contradictionAnalysis.highFindings > 0
        ? "low"
        : contradictionAnalysis.totalFindings > 0
          ? "medium"
          : "high";

  return {
    hasContradictionAnalysis: true,
    contradictionReadiness,
    totalFindings: contradictionAnalysis.totalFindings,
    criticalFindings: contradictionAnalysis.criticalFindings,
    highFindings: contradictionAnalysis.highFindings,
    moderateFindings: contradictionAnalysis.moderateFindings,
    lowFindings: contradictionAnalysis.lowFindings,
    overallRisk: contradictionAnalysis.overallRisk,
    warnings: uniqueStrings(contradictionAnalysis.warnings),
    summary: contradictionAnalysis.summary,
  };
}

function buildCredibilityIntelligence(
  credibilityAnalysis?: CaseCredibilityAnalysis,
): AssemblyCredibilityIntelligenceModel {
  if (!credibilityAnalysis) {
    return {
      hasCredibilityAnalysis: false,
      credibilityReadiness: "low",
      overallScore: 0,
      overallLevel: "manageable",
      judgeConcernScore: 0,
      crossExaminationRiskScore: 0,
      settlementPressureScore: 0,
      documentReadinessImpact: "none",
      warnings: ["Credibility analysis has not been supplied to the assembly layer."],
      nextActions: [],
      summary: "No credibility analysis was supplied to assembly.",
    };
  }

  const credibilityReadiness: CaseConfidence =
    credibilityAnalysis.overallLevel === "critical"
      ? "very-low"
      : credibilityAnalysis.overallLevel === "serious"
        ? "low"
        : credibilityAnalysis.overallLevel === "elevated"
          ? "medium"
          : "high";

  return {
    hasCredibilityAnalysis: true,
    credibilityReadiness,
    overallScore: credibilityAnalysis.overallScore,
    overallLevel: credibilityAnalysis.overallLevel,
    judgeConcernScore: credibilityAnalysis.judgeConcernScore,
    crossExaminationRiskScore: credibilityAnalysis.crossExaminationRiskScore,
    settlementPressureScore: credibilityAnalysis.settlementPressureScore,
    documentReadinessImpact: credibilityAnalysis.documentReadinessImpact,
    warnings: uniqueStrings(credibilityAnalysis.warnings),
    nextActions: uniqueStrings(credibilityAnalysis.nextActions),
    summary: credibilityAnalysis.summary,
  };
}

function toWorkflowAuthorityInput(
  authority: AssemblyAuthorityReadinessModel,
): WorkflowAuthorityInput {
  return {
    hasAuthorityAnalysis: authority.hasAuthorityAnalysis,
    authorityWarnings: authority.warnings,
    verifiedAuthorityCount: authority.verifiedAuthorityCount,
    strongestAuthorityCount: authority.strongestAuthorityCount,
    unsafeAuthorityCount: authority.unsafeAuthorityCount,
    directlyApplicableAuthorityCount: authority.directlyApplicableAuthorityCount,
    wrongJurisdictionAuthorityCount: authority.wrongJurisdictionAuthorityCount,
  };
}

function toWorkflowContradictionInput(
  contradictions: AssemblyContradictionReadinessModel,
): WorkflowContradictionInput {
  return {
    hasContradictionAnalysis: contradictions.hasContradictionAnalysis,
    totalFindings: contradictions.totalFindings,
    criticalFindings: contradictions.criticalFindings,
    highFindings: contradictions.highFindings,
    moderateFindings: contradictions.moderateFindings,
    lowFindings: contradictions.lowFindings,
    overallRisk: contradictions.overallRisk,
    warnings: contradictions.warnings,
  };
}

function toWorkflowCredibilityInput(
  credibility: AssemblyCredibilityIntelligenceModel,
): WorkflowCredibilityInput {
  return {
    hasCredibilityAnalysis: credibility.hasCredibilityAnalysis,
    overallLevel: credibility.overallLevel,
    overallScore: credibility.overallScore,
    judgeConcernScore: credibility.judgeConcernScore,
    crossExaminationRiskScore: credibility.crossExaminationRiskScore,
    settlementPressureScore: credibility.settlementPressureScore,
    documentReadinessImpact: credibility.documentReadinessImpact,
    warnings: credibility.warnings,
    nextActions: credibility.nextActions,
  };
}

function toWorkflowProceduralInput(
  proceduralState: ProceduralStateModel,
): WorkflowProceduralInput {
  const risks = proceduralState.risks || [];

  return {
    hasProceduralAnalysis: true,
    overallProceduralReadiness: proceduralState.readiness.overallReadiness,
    deadlineReadiness: proceduralState.readiness.deadlineReadiness,
    complianceReadiness: proceduralState.readiness.overallReadiness,
    serviceReadiness: proceduralState.readiness.serviceReadiness,
    filingReadiness: proceduralState.readiness.filingReadiness,
    motionReadiness: proceduralState.readiness.motionReadiness,
    discoveryReadiness: proceduralState.readiness.discoveryReadiness,
    settlementReadiness: proceduralState.readiness.settlementReadiness,
    preTrialReadiness: proceduralState.readiness.preTrialReadiness,
    trialReadiness: proceduralState.readiness.preTrialReadiness,
    costsReadiness: proceduralState.readiness.costsReadiness,
    assessmentReadiness: proceduralState.readiness.assessmentReadiness,
    dependencyCount: proceduralState.dependencies.length,
    blockerCount: proceduralState.readiness.blockers.length,
    riskCount: risks.length,
    deadlineCount: proceduralState.deadlines.length,
    criticalRiskCount: risks.filter((risk) => risk.severity === "critical").length,
    highRiskCount: risks.filter((risk) => risk.severity === "high").length,
    warnings: proceduralState.warnings,
    blockers: proceduralState.readiness.blockers,
    nextActions: proceduralState.readiness.nextActions,
  };
}

function toWorkflowLegalReasoningInput(
  legalReasoning: AssemblyLegalReasoningReadinessModel,
): WorkflowLegalReasoningInput {
  return {
    hasLegalReasoning: legalReasoning.hasLegalReasoning,
    primaryDomains: legalReasoning.primaryDomains,
    profileCount: legalReasoning.profileCount,
    authorityCount: legalReasoning.authorityCount,
    knowledgeObjectCount: legalReasoning.knowledgeObjectCount,
    investigationPriorities: legalReasoning.investigationPriorities,
    evidencePriorities: legalReasoning.evidencePriorities,
    burdenPriorities: legalReasoning.burdenPriorities,
    proceduralWatchPoints: legalReasoning.proceduralWatchPoints,
    judicialConcerns: legalReasoning.judicialConcerns,
    opposingArguments: legalReasoning.opposingArguments,
    firstQuestions: legalReasoning.firstQuestions,
    warnings: legalReasoning.warnings,
    blockedObjects: legalReasoning.blockedObjects,
  };
}

export function buildCaseSystemAssembly(
  input: CaseSystemAssemblyInput,
): CaseSystemAssemblyOutput {
  const timestamp = nowIso();

  const legalDomains = safeLegalDomains(input.legalDomains);

  const timelineOutput = buildTimelineCognition({
    caseId: input.caseId,
    courtPath: input.courtPath,
    province: input.province,
    stage: input.stage,
    rawNarrative: input.rawNarrative,
    eventCandidates: input.timeline?.eventCandidates || [],
  });

  const evidenceOutput = buildEvidenceRelationshipGraph({
    caseId: input.caseId,
    stage: input.stage,
    evidenceCandidates: input.evidence?.evidenceCandidates || [],
  });

  const proceduralOutput = buildProceduralState({
    caseId: input.caseId,
    courtPath: input.courtPath,
    province: input.province,
    stage: input.stage,
    rawNarrative: input.rawNarrative,
    knownEvents: input.procedure?.knownEvents || [],
    knownDeadlines: input.procedure?.knownDeadlines || [],
    authorityReferences: input.procedure?.authorityReferences || [],
    requirements: input.procedure?.requirements || [],
    courtPowers: input.procedure?.courtPowers || [],
  });

  const claimOutput = buildClaimTheoryModel({
    caseId: input.caseId,
    stage: input.stage,
    claimCandidates: input.claims?.claimCandidates || [],
  });

  const damagesOutput = buildDamagesRemedyModel({
    caseId: input.caseId,
    stage: input.stage,
    legalDomains,
    requestedAmounts: input.damages?.requestedAmounts || [],
    requestedRemedies: input.damages?.requestedRemedies || [],
    linkedTimelineEventIds: input.damages?.linkedTimelineEventIds || [],
    linkedEvidenceIds: input.damages?.linkedEvidenceIds || [],
  });

  const legalReasoning = buildLegalReasoningCoordinator({
    courtPath: input.courtPath,
    jurisdiction: input.province,
    stage: input.stage,
    legalDomains,
    knowledgeObjects: DOCTRINE_SEED_LIBRARY,
    mode: "operational",
  });

  const legalReasoningReadiness = buildLegalReasoningReadiness(legalReasoning);

  const factPatternReadiness = buildFactPatternReadiness(
    input.factPatternAnalysis,
  );
  const evidenceIntelligenceReadiness = buildEvidenceIntelligenceReadiness(
    input.evidenceIntelligence,
  );
  const proofReadiness = buildProofReadiness(input);
  const authorityReadiness = buildAuthorityReadiness(input.authorityAnalysis);
  const contradictionReadiness = buildContradictionReadiness(
    input.contradictionAnalysis,
  );
  const credibilityIntelligence = buildCredibilityIntelligence(
    input.credibilityAnalysis,
  );

  const credibilityOutput = buildCredibilityRiskModel({
    caseId: input.caseId,
    stage: input.stage,
    legalDomains,
    narrativeSummary: input.rawNarrative,

    timelineWarnings: [
      ...timelineOutput.warnings,
      ...factPatternReadiness.warnings.filter((warning) =>
        warning.toLowerCase().includes("timeline"),
      ),
    ],
    evidenceWarnings: [
      ...evidenceOutput.warnings,
      ...evidenceIntelligenceReadiness.warnings,
      ...proofReadiness.warnings,
      ...legalReasoningReadiness.evidencePriorities.map(
        (priority) => `Legal reasoning evidence priority: ${priority}`,
      ),
      ...legalReasoningReadiness.burdenPriorities.map(
        (priority) => `Legal reasoning burden priority: ${priority}`,
      ),
    ],
    procedureWarnings: [
      ...proceduralOutput.warnings,
      ...legalReasoningReadiness.proceduralWatchPoints,
    ],
    damagesWarnings: [
      ...damagesOutput.warnings,
      ...factPatternReadiness.warnings.filter((warning) =>
        warning.toLowerCase().includes("damages"),
      ),
    ],
    claimWarnings: [
      ...claimOutput.warnings,
      ...factPatternReadiness.warnings,
      ...legalReasoningReadiness.judicialConcerns.map(
        (concern) => `Legal reasoning judicial concern: ${concern}`,
      ),
      ...legalReasoningReadiness.opposingArguments.map(
        (argument) => `Likely opposing argument: ${argument}`,
      ),
    ],

    linkedEvidenceIds: evidenceOutput.graph.nodes.map((node) => node.id),
    linkedTimelineEventIds: timelineOutput.timeline.events.map((event) => event.id),
  });

  const formReadiness = buildFallbackFormReadiness(input);
  const workflowProceduralInput = toWorkflowProceduralInput(
    proceduralOutput.proceduralState,
  );

  const workflowOutput = buildWorkflowOrchestration({
    caseId: input.caseId,
    courtPath: input.courtPath,
    province: input.province,
    stage: input.stage,

    hasDominantClaim: hasDominantClaim(claimOutput.model),
    hasEvidence:
      hasEvidence(evidenceOutput.graph) ||
      evidenceIntelligenceReadiness.findingCount > 0,
    hasTimeline:
      hasTimeline(timelineOutput.timeline) ||
      factPatternReadiness.timelineIssueCount > 0,
    hasDamagesModel:
      hasDamagesModel(damagesOutput.model) ||
      factPatternReadiness.damagesIndicatorCount > 0,
    hasLegalKnowledgeWarnings:
      (input.knowledgeWarnings || []).length > 0 ||
      authorityReadiness.warnings.length > 0 ||
      legalReasoningReadiness.warnings.length > 0 ||
      legalReasoningReadiness.blockedObjects.length > 0,

    legalReasoning: toWorkflowLegalReasoningInput(legalReasoningReadiness),

    proof: {
      hasProofAnalysis: proofReadiness.hasProofAnalysis,
      proofWeaknesses: uniqueStrings([
        ...proofReadiness.proofWeaknesses,
        ...legalReasoningReadiness.burdenPriorities.map(
          (priority) => `Legal reasoning burden priority needs proof review: ${priority}`,
        ),
      ]),
      proofStrengths: proofReadiness.proofStrengths,
      proofNextActions: uniqueStrings([
        ...proofReadiness.proofNextActions,
        ...factPatternReadiness.nextActions,
        ...evidenceIntelligenceReadiness.recommendedEvidenceCollection,
        ...legalReasoningReadiness.firstQuestions,
        ...legalReasoningReadiness.investigationPriorities.map(
          (priority) => `Investigate legal reasoning priority: ${priority}`,
        ),
        ...legalReasoningReadiness.evidencePriorities.map(
          (priority) => `Collect evidence for legal reasoning priority: ${priority}`,
        ),
      ]),
      weakClaimProofCount: proofReadiness.weakClaimProofCount,
      missingElementProofCount:
        proofReadiness.missingElementProofCount +
        evidenceIntelligenceReadiness.gapCount,
      contradictedElementProofCount:
        proofReadiness.contradictedElementProofCount +
        factPatternReadiness.contradictionCount +
        evidenceIntelligenceReadiness.contradictionCount,
    },

    authority: toWorkflowAuthorityInput(authorityReadiness),
    contradictions: toWorkflowContradictionInput(contradictionReadiness),
    credibility: toWorkflowCredibilityInput(credibilityIntelligence),
    procedural: workflowProceduralInput,

    claimWarnings: [
      ...claimOutput.warnings,
      ...factPatternReadiness.warnings,
      ...legalReasoningReadiness.judicialConcerns.map(
        (concern) => `Legal reasoning judicial concern: ${concern}`,
      ),
      ...legalReasoningReadiness.opposingArguments.map(
        (argument) => `Likely opposing argument: ${argument}`,
      ),
    ],
    legalReasoningWarnings: [
      ...legalReasoningReadiness.warnings,
      ...legalReasoningReadiness.blockedObjects,
    ],
    proceduralWarnings: [
      ...proceduralOutput.warnings,
      ...legalReasoningReadiness.proceduralWatchPoints,
    ],
    evidenceWarnings: [
      ...evidenceOutput.warnings,
      ...evidenceIntelligenceReadiness.warnings,
      ...proofReadiness.warnings,
      ...legalReasoningReadiness.evidencePriorities.map(
        (priority) => `Legal reasoning evidence priority: ${priority}`,
      ),
    ],
    timelineWarnings: [
      ...timelineOutput.warnings,
      ...factPatternReadiness.warnings.filter((warning) =>
        warning.toLowerCase().includes("timeline"),
      ),
    ],
    damagesWarnings: [
      ...damagesOutput.warnings,
      ...factPatternReadiness.warnings.filter((warning) =>
        warning.toLowerCase().includes("damages"),
      ),
    ],
    credibilityWarnings: [
      ...credibilityOutput.warnings,
      ...credibilityIntelligence.warnings,
      ...factPatternReadiness.warnings,
      ...legalReasoningReadiness.judicialConcerns,
    ],
    authorityWarnings: [
      ...authorityReadiness.warnings,
      ...legalReasoningReadiness.warnings,
    ],
    contradictionWarnings: [
      ...contradictionReadiness.warnings,
      ...factPatternReadiness.warnings.filter((warning) =>
        warning.toLowerCase().includes("contradiction"),
      ),
      ...evidenceIntelligenceReadiness.warnings.filter((warning) =>
        warning.toLowerCase().includes("contradiction"),
      ),
    ],
    knowledgeWarnings: [
      ...(input.knowledgeWarnings || []),
      ...legalReasoningReadiness.warnings,
      ...legalReasoningReadiness.blockedObjects,
    ],
  });

  const litigationReasoning = buildLitigationReasoning({
    caseId: input.caseId,

    claimTheoryModel: {
      theories: claimOutput.model.theories.map((theory) => ({
        id: theory.id,
        title: theory.title,
        status: theory.status,
        confidence: theory.confidence,
        linkedEvidenceIds: theory.linkedEvidenceIds,
        risks: theory.risks.map((risk) => ({
          title: risk.title,
          severity: risk.severity,
          explanation: risk.explanation,
        })),
      })),
      warnings: uniqueStrings([
        ...claimOutput.warnings,
        ...legalReasoningReadiness.judicialConcerns.map(
          (concern) => `Legal reasoning judicial concern: ${concern}`,
        ),
        ...legalReasoningReadiness.opposingArguments.map(
          (argument) => `Likely opposing argument: ${argument}`,
        ),
      ]),
    },

    proofAnalysis: {
      globalWeaknesses: uniqueStrings([
        ...proofReadiness.proofWeaknesses,
        ...legalReasoningReadiness.burdenPriorities.map(
          (priority) => `Burden priority needs proof review: ${priority}`,
        ),
      ]),
      globalStrengths: proofReadiness.proofStrengths,
      globalNextActions: uniqueStrings([
        ...proofReadiness.proofNextActions,
        ...legalReasoningReadiness.firstQuestions,
        ...legalReasoningReadiness.investigationPriorities,
        ...legalReasoningReadiness.evidencePriorities.map(
          (priority) => `Collect evidence for: ${priority}`,
        ),
      ]),
      summary: proofReadiness.hasProofAnalysis
        ? "Proof readiness was supplied through the assembly layer and enriched with legal reasoning priorities."
        : "No detailed proof map was supplied to the assembly layer; legal reasoning priorities should guide proof development.",
    },

    evidenceAnalysis: {
      proofGaps: uniqueStrings([
        ...evidenceIntelligenceReadiness.warnings,
        ...proofReadiness.warnings,
        ...legalReasoningReadiness.evidencePriorities.map(
          (priority) => `Legal reasoning evidence priority: ${priority}`,
        ),
        ...legalReasoningReadiness.burdenPriorities.map(
          (priority) => `Legal reasoning burden priority: ${priority}`,
        ),
      ]),
      contradictionNotes: uniqueStrings([
        ...factPatternReadiness.warnings.filter((warning) =>
          warning.toLowerCase().includes("contradiction"),
        ),
        ...evidenceIntelligenceReadiness.warnings.filter((warning) =>
          warning.toLowerCase().includes("contradiction"),
        ),
      ]),
      credibilityConcerns: uniqueStrings([
        ...factPatternReadiness.warnings.filter((warning) =>
          warning.toLowerCase().includes("credibility"),
        ),
        ...credibilityIntelligence.warnings,
        ...legalReasoningReadiness.judicialConcerns,
      ]),
      chronologyConcerns: uniqueStrings([
        ...timelineOutput.warnings,
        ...factPatternReadiness.warnings.filter((warning) =>
          warning.toLowerCase().includes("timeline"),
        ),
      ]),
      bundleWarnings: uniqueStrings([
        ...evidenceOutput.warnings,
        ...evidenceIntelligenceReadiness.warnings,
        ...legalReasoningReadiness.evidencePriorities,
      ]),
      corroborationNotes: uniqueStrings([
        ...evidenceIntelligenceReadiness.strongestEvidence,
        ...legalReasoningReadiness.investigationPriorities,
      ]),
    },

    authorityAnalysis: {
      verifiedAuthorityIds: input.authorityAnalysis?.verifiedAuthorityIds || [],
      strongestAuthorityIds: input.authorityAnalysis?.strongestAuthorityIds || [],
      unsafeAuthorityIds: input.authorityAnalysis?.unsafeAuthorityIds || [],
      warnings: uniqueStrings([
        ...authorityReadiness.warnings,
        ...legalReasoningReadiness.warnings,
        ...legalReasoningReadiness.blockedObjects,
      ]),
    },

    contradictionAnalysis: {
      warnings: contradictionReadiness.warnings,
    },

    credibilityAnalysis: {
      overallLevel: credibilityIntelligence.overallLevel,
      overallScore: credibilityIntelligence.overallScore,
      warnings: uniqueStrings([
        ...credibilityIntelligence.warnings,
        ...legalReasoningReadiness.judicialConcerns,
        ...legalReasoningReadiness.opposingArguments,
      ]),
    },

    procedureWarnings: uniqueStrings([
      ...proceduralOutput.warnings,
      ...legalReasoningReadiness.proceduralWatchPoints,
    ]),
    workflowWarnings: workflowOutput.warnings,
  });

  const warnings = uniqueStrings([
    ...timelineOutput.warnings,
    ...evidenceOutput.warnings,
    ...proceduralOutput.warnings,
    ...claimOutput.warnings,
    ...damagesOutput.warnings,
    ...credibilityOutput.warnings,
    ...workflowOutput.warnings,
    ...litigationReasoning.warnings,
    ...formReadiness.formWarnings,
    ...legalReasoningReadiness.warnings,
    ...legalReasoningReadiness.blockedObjects,
    ...legalReasoningReadiness.proceduralWatchPoints,
    ...legalReasoningReadiness.judicialConcerns,
    ...legalReasoningReadiness.opposingArguments,
    ...factPatternReadiness.warnings,
    ...evidenceIntelligenceReadiness.warnings,
    ...proofReadiness.warnings,
    ...authorityReadiness.warnings,
    ...contradictionReadiness.warnings,
    ...credibilityIntelligence.warnings,
    ...(input.knowledgeWarnings || []),
  ]);

  const assembly: CaseSystemAssemblyModel = {
    id: createId("case_system_assembly"),
    version: "1.6.0",
    createdAt: timestamp,
    updatedAt: timestamp,

    caseId: input.caseId,

    courtPath: input.courtPath,
    province: input.province,
    stage: input.stage,

    legalDomains,

    timeline: timelineOutput.timeline,
    evidenceGraph: evidenceOutput.graph,
    proceduralState: proceduralOutput.proceduralState,
    claimTheory: claimOutput.model,
    damagesRemedy: damagesOutput.model,
    credibilityRisk: credibilityOutput.model,
    workflow: workflowOutput.model,
    litigationReasoning,
    legalReasoning,

    formReadiness,
    legalReasoningReadiness,
    factPatternReadiness,
    evidenceIntelligenceReadiness,
    proofReadiness,
    authorityReadiness,
    contradictionReadiness,
    credibilityIntelligence,

    warnings,
  };

  return {
    assembly,
    warnings,
  };
}