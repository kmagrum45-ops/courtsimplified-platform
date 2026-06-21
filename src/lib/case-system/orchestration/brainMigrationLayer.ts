import {
  CourtSimplifiedBrainInput,
  LegalIntelligenceResult,
} from "../intelligence/intelligenceTypes";

import {
  buildCourtSimplifiedBrainBridge,
  CourtSimplifiedBrainBridgeOutput,
} from "./courtSimplifiedBrainBridge";

export type BrainMigrationLayerVersion = "2.0.0";

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

function extractExistingMasterCase(input: CourtSimplifiedBrainInput) {
  const existing = asObject(input.existingMasterResult);
  return "masterCase" in existing ? (existing.masterCase as never) : undefined;
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
  ]);

  const recommendedNextRoute =
    bridge.recommendedNextRoute ||
    bridge.assembly.workflow.readiness.recommendedRoute ||
    args.existingRecommendedNextRoute;

  const masterResultPatch: Record<string, unknown> = {
    masterCase: bridge.masterCase,
    caseSystemAssembly: bridge.assembly,

    courtSimplifiedArchitecture: {
      version: "2.0.0",
      active: true,
      architectureMode: "master-case-source-of-truth",
      sourceOfTruth: "MasterCaseSchema",
      assemblySource: "CaseSystemAssembly",
      legacyCompatibilityOutputRemoved: true,
      deprecatedPatchMergingDisabled: true,
      explanation:
        "MasterCaseSchema and CaseSystemAssembly are now the only persisted litigation intelligence outputs from this migration layer.",
      warnings,
    },

    updatedAt: bridge.masterCase.updatedAt,
  };

  const dashboardPatch: Record<string, unknown> = {
    masterCase: bridge.masterCase,
    caseSystemAssembly: bridge.assembly,
    readiness: bridge.masterCase.readiness,
    workflowReadiness: bridge.assembly.workflow.readiness,
    recommendedWorkflowRoute: recommendedNextRoute,

    architectureStatus: {
      sourceOfTruth: "MasterCaseSchema",
      assemblySource: "CaseSystemAssembly",
      compatibilityLayerActive: false,
      legacyReasoningIsolated: false,
      legacyCompatibilityOutputRemoved: true,
      nextAction:
        warnings.length > 0
          ? "Review current MasterCase warnings before relying on generated outputs."
          : "Continue through the unified CourtSimplified workflow.",
    },

    architectureWarnings: warnings,
  };

  return {
    version: "2.0.0",
    bridge,
    masterResultPatch,
    dashboardPatch,
    recommendedNextRoute,
    warnings,
  };
}