import {
  CaseAuthorityAnalysis,
  CaseConfidence,
  CaseContradictionAnalysis,
  CaseCourtPath,
  CaseCredibilityAnalysis,
  CaseCredibilityRiskLevel,
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
  WorkflowOrchestrationModel,
  WorkflowProceduralInput,
  WorkflowProofInput,
} from "../workflow/workflowOrchestrationArchitecture";

export type CaseSystemAssemblyVersion = "1.3.0";

export type FormReadinessModel = {
  requiredLabels: string[];
  recommendedLabels: string[];
  completedLabels: string[];
  missingFormInformation: string[];
  formWarnings: string[];
  source: "courtSimplifiedBrain" | "fallback-assembly";
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

  formReadiness: FormReadinessModel;
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

export function buildCaseSystemAssembly(
  input: CaseSystemAssemblyInput,
): CaseSystemAssemblyOutput {
  const timestamp = nowIso();

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
    legalDomains: input.legalDomains,
    requestedAmounts: input.damages?.requestedAmounts || [],
    requestedRemedies: input.damages?.requestedRemedies || [],
    linkedTimelineEventIds: input.damages?.linkedTimelineEventIds || [],
    linkedEvidenceIds: input.damages?.linkedEvidenceIds || [],
  });

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
    legalDomains: input.legalDomains,
    narrativeSummary: input.rawNarrative,

    timelineWarnings: timelineOutput.warnings,
    evidenceWarnings: [...evidenceOutput.warnings, ...proofReadiness.warnings],
    procedureWarnings: proceduralOutput.warnings,
    damagesWarnings: damagesOutput.warnings,
    claimWarnings: claimOutput.warnings,

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
    hasEvidence: hasEvidence(evidenceOutput.graph),
    hasTimeline: hasTimeline(timelineOutput.timeline),
    hasDamagesModel: hasDamagesModel(damagesOutput.model),
    hasLegalKnowledgeWarnings:
      (input.knowledgeWarnings || []).length > 0 ||
      authorityReadiness.warnings.length > 0,

    proof: {
      hasProofAnalysis: proofReadiness.hasProofAnalysis,
      proofWeaknesses: proofReadiness.proofWeaknesses,
      proofStrengths: proofReadiness.proofStrengths,
      proofNextActions: proofReadiness.proofNextActions,
      weakClaimProofCount: proofReadiness.weakClaimProofCount,
      missingElementProofCount: proofReadiness.missingElementProofCount,
      contradictedElementProofCount:
        proofReadiness.contradictedElementProofCount,
    },

    authority: toWorkflowAuthorityInput(authorityReadiness),
    contradictions: toWorkflowContradictionInput(contradictionReadiness),
    credibility: toWorkflowCredibilityInput(credibilityIntelligence),
    procedural: workflowProceduralInput,

    claimWarnings: claimOutput.warnings,
    proceduralWarnings: proceduralOutput.warnings,
    evidenceWarnings: [...evidenceOutput.warnings, ...proofReadiness.warnings],
    timelineWarnings: timelineOutput.warnings,
    damagesWarnings: damagesOutput.warnings,
    credibilityWarnings: [
      ...credibilityOutput.warnings,
      ...credibilityIntelligence.warnings,
    ],
    authorityWarnings: authorityReadiness.warnings,
    contradictionWarnings: contradictionReadiness.warnings,
    knowledgeWarnings: input.knowledgeWarnings || [],
  });

  const warnings = uniqueStrings([
    ...timelineOutput.warnings,
    ...evidenceOutput.warnings,
    ...proceduralOutput.warnings,
    ...claimOutput.warnings,
    ...damagesOutput.warnings,
    ...credibilityOutput.warnings,
    ...workflowOutput.warnings,
    ...formReadiness.formWarnings,
    ...proofReadiness.warnings,
    ...authorityReadiness.warnings,
    ...contradictionReadiness.warnings,
    ...credibilityIntelligence.warnings,
    ...(input.knowledgeWarnings || []),
  ]);

  const assembly: CaseSystemAssemblyModel = {
    id: createId("case_system_assembly"),
    version: "1.3.0",
    createdAt: timestamp,
    updatedAt: timestamp,

    caseId: input.caseId,

    courtPath: input.courtPath,
    province: input.province,
    stage: input.stage,

    legalDomains: input.legalDomains,

    timeline: timelineOutput.timeline,
    evidenceGraph: evidenceOutput.graph,
    proceduralState: proceduralOutput.proceduralState,
    claimTheory: claimOutput.model,
    damagesRemedy: damagesOutput.model,
    credibilityRisk: credibilityOutput.model,
    workflow: workflowOutput.model,

    formReadiness,
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