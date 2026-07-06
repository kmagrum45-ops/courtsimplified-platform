import {
  CourtSimplifiedBrainInput,
  LegalIntelligenceResult,
} from "../intelligence/intelligenceTypes";

import { MasterCaseSchema } from "../architecture/masterCaseSchema";

import {
  buildCourtSimplifiedBrainBridge,
  CourtSimplifiedBrainBridgeOutput,
} from "./courtSimplifiedBrainBridge";

export type BrainMigrationLayerVersion = "2.2.0";

export type BrainMigrationResult = {
  version: BrainMigrationLayerVersion;
  bridge: CourtSimplifiedBrainBridgeOutput;
  masterResultPatch: Record<string, unknown>;
  dashboardPatch: Record<string, unknown>;
  recommendedNextRoute?: string;
  warnings: string[];
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function uniqueStrings(items: unknown[]): string[] {
  return Array.from(
    new Set(items.map((item) => String(item || "").trim()).filter(Boolean)),
  );
}

function extractExistingMasterCase(
  input: CourtSimplifiedBrainInput,
): MasterCaseSchema | undefined {
  const existing = asObject(input.existingMasterResult);
  const masterCase = existing.masterCase;

  return masterCase && typeof masterCase === "object"
    ? (masterCase as MasterCaseSchema)
    : undefined;
}

function getRecommendedNextRoute(args: {
  bridge: CourtSimplifiedBrainBridgeOutput;
  fallbackRoute?: string;
}): string | undefined {
  return (
    args.bridge.recommendedNextRoute ||
    args.bridge.assembly.workflow.readiness.recommendedRoute ||
    args.fallbackRoute ||
    "/dashboard"
  );
}

function buildIntelligenceSummary(
  intelligence: LegalIntelligenceResult,
): Record<string, unknown> {
  return {
    caseId: intelligence.normalizedIntake.caseId,
    courtPath: intelligence.proceduralPosture.courtPath,
    province: intelligence.proceduralPosture.province,
    stage: intelligence.proceduralPosture.stage,
    claimCount: intelligence.claimClassifications.length,
    primaryClaimTypes: intelligence.primaryClaimTypes,
    evidenceCount: intelligence.normalizedIntake.evidence.length,
    timelineEventCount: intelligence.normalizedIntake.events.length,
    formRecommendationCount: intelligence.formRecommendations.length,
    missingInformationCount: intelligence.missingInformation.length,
    systemWarningCount: intelligence.systemWarnings.length,
    legalKnowledgeWarningCount:
      intelligence.legalKnowledge.sourceWarnings.length,
  };
}

function buildLitigationReadinessSummary(
  bridge: CourtSimplifiedBrainBridgeOutput,
): Record<string, unknown> {
  const reasoning = bridge.assembly.litigationReasoning;

  return {
    readinessScore: reasoning.readinessScore,
    readinessLevel: reasoning.readinessLevel,
    strongestCasePointCount: reasoning.strongestCasePoints.length,
    weakestCasePointCount: reasoning.weakestCasePoints.length,
    judicialConcernCount: reasoning.judicialConcerns.length,
    opposingArgumentCount: reasoning.opposingArguments.length,
    missingWorkCount: reasoning.missingWork.length,
    findingCount: reasoning.findings.length,
    nextActionCount: reasoning.nextActions.length,
    warningCount: reasoning.warnings.length,
    summary: reasoning.summary,
  };
}

function buildArchitectureStatus(args: {
  warnings: string[];
  recommendedNextRoute?: string;
}): Record<string, unknown> {
  return {
    version: "2.2.0",
    active: true,
    architectureMode: "master-case-source-of-truth",
    sourceOfTruth: "MasterCaseSchema",
    assemblySource: "CaseSystemAssembly",
    bridgeSource: "CourtSimplifiedBrainBridge",
    migrationLayer: "BrainMigrationLayer",
    reasoningSource: "LitigationReasoningEngine",
    compatibilityLayerActive: false,
    legacyReasoningIsolated: false,
    legacyCompatibilityOutputRemoved: true,
    deprecatedPatchMergingDisabled: true,
    recommendedNextRoute: args.recommendedNextRoute,
    nextAction:
      args.warnings.length > 0
        ? "Review current MasterCase, Assembly, and Litigation Reasoning warnings before relying on generated outputs."
        : "Continue through the unified CourtSimplified workflow.",
    explanation:
      "BrainMigrationLayer preserves MasterCaseSchema, CaseSystemAssembly, and LitigationReasoningEngine output as persisted litigation intelligence while allowing dashboard/UI patches to consume the same source-of-truth objects.",
    warnings: args.warnings,
  };
}

export function buildBrainMigrationLayer(args: {
  input: CourtSimplifiedBrainInput;
  intelligence: LegalIntelligenceResult;
  existingMasterResultPatch: Record<string, unknown>;
  existingDashboardPatch: Record<string, unknown>;
  existingRecommendedNextRoute?: string;
}): BrainMigrationResult {
  const bridge = buildCourtSimplifiedBrainBridge({
    intelligence: args.intelligence,
    existingCase: extractExistingMasterCase(args.input),
    recommendedNextRoute: args.existingRecommendedNextRoute,
  });

  const warnings = uniqueStrings([
    ...bridge.warnings,
    ...bridge.masterCase.systemWarnings,
    ...bridge.assembly.warnings,
    ...bridge.assembly.litigationReasoning.warnings,
    ...args.intelligence.systemWarnings,
    ...args.intelligence.legalKnowledge.sourceWarnings,
  ]);

  const recommendedNextRoute = getRecommendedNextRoute({
    bridge,
    fallbackRoute: args.existingRecommendedNextRoute,
  });

  const architectureStatus = buildArchitectureStatus({
    warnings,
    recommendedNextRoute,
  });

  const intelligenceSummary = buildIntelligenceSummary(args.intelligence);
  const litigationReadiness = buildLitigationReadinessSummary(bridge);

  const masterResultPatch: Record<string, unknown> = {
    ...args.existingMasterResultPatch,

    masterCase: bridge.masterCase,
    caseSystemAssembly: bridge.assembly,
    litigationReasoning: bridge.assembly.litigationReasoning,

    legalIntelligenceSummary: intelligenceSummary,
    litigationReadiness,

    courtSimplifiedArchitecture: architectureStatus,

    migrationMetadata: {
      version: "2.2.0",
      migratedAt: bridge.masterCase.updatedAt,
      sourceOfTruth: "MasterCaseSchema",
      bridgeVersion: bridge.version,
      assemblyVersion: bridge.assembly.version,
      litigationReasoningVersion: bridge.assembly.litigationReasoning.version,
      assemblyWarningsCount: bridge.assembly.warnings.length,
      litigationReasoningWarningsCount:
        bridge.assembly.litigationReasoning.warnings.length,
      masterCaseWarningsCount: bridge.masterCase.systemWarnings.length,
      totalWarningsCount: warnings.length,
    },

    updatedAt: bridge.masterCase.updatedAt,
  };

  const dashboardPatch: Record<string, unknown> = {
    ...args.existingDashboardPatch,

    masterCase: bridge.masterCase,
    caseSystemAssembly: bridge.assembly,
    litigationReasoning: bridge.assembly.litigationReasoning,

    readiness: bridge.masterCase.readiness,
    workflowReadiness: bridge.assembly.workflow.readiness,
    litigationReadiness,
    recommendedWorkflowRoute: recommendedNextRoute,

    strongestCasePoints: bridge.assembly.litigationReasoning.strongestCasePoints,
    weakestCasePoints: bridge.assembly.litigationReasoning.weakestCasePoints,
    judicialConcerns: bridge.assembly.litigationReasoning.judicialConcerns,
    opposingArguments: bridge.assembly.litigationReasoning.opposingArguments,
    missingWork: bridge.assembly.litigationReasoning.missingWork,
    litigationNextActions: bridge.assembly.litigationReasoning.nextActions,
    litigationFindings: bridge.assembly.litigationReasoning.findings,

    legalIntelligenceSummary: intelligenceSummary,

    architectureStatus,

    architectureWarnings: warnings,
    litigationWarnings: bridge.assembly.litigationReasoning.warnings,

    dashboardIntelligenceStatus: {
      sourceOfTruth: "MasterCaseSchema",
      assemblySource: "CaseSystemAssembly",
      reasoningSource: "LitigationReasoningEngine",
      bridgeVersion: bridge.version,
      migrationVersion: "2.2.0",
      assemblyVersion: bridge.assembly.version,
      litigationReasoningVersion: bridge.assembly.litigationReasoning.version,
      hasWarnings: warnings.length > 0,
      warningCount: warnings.length,
      litigationWarningCount: bridge.assembly.litigationReasoning.warnings.length,
      litigationReadinessScore:
        bridge.assembly.litigationReasoning.readinessScore,
      litigationReadinessLevel:
        bridge.assembly.litigationReasoning.readinessLevel,
      nextRoute: recommendedNextRoute,
    },
  };

  return {
    version: "2.2.0",
    bridge,
    masterResultPatch,
    dashboardPatch,
    recommendedNextRoute,
    warnings,
  };
}