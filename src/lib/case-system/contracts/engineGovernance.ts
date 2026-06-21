export type EngineLayer =
  | "foundational-truth"
  | "analytical-cognition"
  | "synthesis"
  | "orchestration"
  | "output"
  | "persistence"
  | "ui";

export type EngineAuthority =
  | "read-only"
  | "analysis-only"
  | "synthesis-only"
  | "orchestration-only"
  | "state-mutation"
  | "presentation-only";

export type EngineName =
  | "intake-normalization"
  | "claim-arbitration"
  | "claim-reasoning"
  | "evidence-cognition"
  | "procedural-posture"
  | "litigation-synthesis"
  | "legal-knowledge"
  | "court-simplified-brain"
  | "forms-engine"
  | "document-export"
  | "case-persistence"
  | "ui-layer"
  | "ai-chat";

export type EngineGovernanceRule = {
  id: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
};

export type EngineGovernanceProfile = {
  engine: EngineName;
  layer: EngineLayer;
  authority: EngineAuthority;

  mayReadFrom: EngineName[];
  mayWriteTo: EngineName[];

  mayCreateClaims: boolean;
  mayModifyClaims: boolean;
  maySuppressClaims: boolean;

  mayGenerateForms: boolean;
  mayGenerateDocuments: boolean;

  mayMutateCaseState: boolean;
  mayOverrideProcedure: boolean;
  mayOverrideEvidence: boolean;
  mayOverrideArbitration: boolean;

  governanceRules: EngineGovernanceRule[];
};

export const ENGINE_GOVERNANCE: Record<
  EngineName,
  EngineGovernanceProfile
> = {
  "intake-normalization": {
    engine: "intake-normalization",
    layer: "foundational-truth",
    authority: "analysis-only",

    mayReadFrom: [],
    mayWriteTo: [
      "claim-arbitration",
      "claim-reasoning",
      "evidence-cognition",
      "procedural-posture",
    ],

    mayCreateClaims: false,
    mayModifyClaims: false,
    maySuppressClaims: false,

    mayGenerateForms: false,
    mayGenerateDocuments: false,

    mayMutateCaseState: false,
    mayOverrideProcedure: false,
    mayOverrideEvidence: false,
    mayOverrideArbitration: false,

    governanceRules: [
      {
        id: "INTAKE_001",
        title: "Facts Only",
        description:
          "The intake engine may organize facts but must not determine final legal outcomes.",
        severity: "critical",
      },
    ],
  },

  "claim-arbitration": {
    engine: "claim-arbitration",
    layer: "foundational-truth",
    authority: "analysis-only",

    mayReadFrom: ["intake-normalization"],
    mayWriteTo: [
      "claim-reasoning",
      "evidence-cognition",
      "procedural-posture",
      "litigation-synthesis",
      "legal-knowledge",
    ],

    mayCreateClaims: true,
    mayModifyClaims: true,
    maySuppressClaims: true,

    mayGenerateForms: false,
    mayGenerateDocuments: false,

    mayMutateCaseState: false,
    mayOverrideProcedure: false,
    mayOverrideEvidence: false,
    mayOverrideArbitration: false,

    governanceRules: [
      {
        id: "ARBITRATION_001",
        title: "Claim Authority",
        description:
          "Claim arbitration is the authoritative source of dominant and rejected claims.",
        severity: "critical",
      },
    ],
  },

  "claim-reasoning": {
    engine: "claim-reasoning",
    layer: "analytical-cognition",
    authority: "analysis-only",

    mayReadFrom: ["claim-arbitration"],
    mayWriteTo: ["litigation-synthesis"],

    mayCreateClaims: false,
    mayModifyClaims: false,
    maySuppressClaims: false,

    mayGenerateForms: false,
    mayGenerateDocuments: false,

    mayMutateCaseState: false,
    mayOverrideProcedure: false,
    mayOverrideEvidence: false,
    mayOverrideArbitration: false,

    governanceRules: [
      {
        id: "REASONING_001",
        title: "No Claim Mutation",
        description:
          "Reasoning engines may analyze claims but may not independently create or suppress claims.",
        severity: "critical",
      },
    ],
  },

  "evidence-cognition": {
    engine: "evidence-cognition",
    layer: "analytical-cognition",
    authority: "analysis-only",

    mayReadFrom: ["claim-arbitration", "intake-normalization"],
    mayWriteTo: ["litigation-synthesis"],

    mayCreateClaims: false,
    mayModifyClaims: false,
    maySuppressClaims: false,

    mayGenerateForms: false,
    mayGenerateDocuments: false,

    mayMutateCaseState: false,
    mayOverrideProcedure: false,
    mayOverrideEvidence: false,
    mayOverrideArbitration: false,

    governanceRules: [
      {
        id: "EVIDENCE_001",
        title: "Evidence Does Not Create Claims",
        description:
          "Evidence may support claims but must not independently create legal theories.",
        severity: "critical",
      },
    ],
  },

  "procedural-posture": {
    engine: "procedural-posture",
    layer: "analytical-cognition",
    authority: "analysis-only",

    mayReadFrom: ["claim-arbitration", "intake-normalization"],
    mayWriteTo: ["litigation-synthesis"],

    mayCreateClaims: false,
    mayModifyClaims: false,
    maySuppressClaims: false,

    mayGenerateForms: false,
    mayGenerateDocuments: false,

    mayMutateCaseState: false,
    mayOverrideProcedure: false,
    mayOverrideEvidence: false,
    mayOverrideArbitration: false,

    governanceRules: [
      {
        id: "PROCEDURE_001",
        title: "Procedure Does Not Determine Legal Truth",
        description:
          "Procedural posture may guide sequencing but may not determine legal merits.",
        severity: "critical",
      },
    ],
  },

  "litigation-synthesis": {
    engine: "litigation-synthesis",
    layer: "synthesis",
    authority: "synthesis-only",

    mayReadFrom: [
      "claim-arbitration",
      "claim-reasoning",
      "evidence-cognition",
      "procedural-posture",
      "legal-knowledge",
    ],
    mayWriteTo: ["court-simplified-brain"],

    mayCreateClaims: false,
    mayModifyClaims: false,
    maySuppressClaims: false,

    mayGenerateForms: false,
    mayGenerateDocuments: false,

    mayMutateCaseState: false,
    mayOverrideProcedure: false,
    mayOverrideEvidence: false,
    mayOverrideArbitration: false,

    governanceRules: [
      {
        id: "SYNTHESIS_001",
        title: "Synthesis Integrity",
        description:
          "Synthesis must preserve arbitration hierarchy and may not invent unsupported litigation state.",
        severity: "critical",
      },
    ],
  },

  "legal-knowledge": {
    engine: "legal-knowledge",
    layer: "synthesis",
    authority: "read-only",

    mayReadFrom: ["claim-arbitration", "procedural-posture"],
    mayWriteTo: ["litigation-synthesis"],

    mayCreateClaims: false,
    mayModifyClaims: false,
    maySuppressClaims: false,

    mayGenerateForms: false,
    mayGenerateDocuments: false,

    mayMutateCaseState: false,
    mayOverrideProcedure: false,
    mayOverrideEvidence: false,
    mayOverrideArbitration: false,

    governanceRules: [
      {
        id: "KNOWLEDGE_001",
        title: "Authority Separation",
        description:
          "Legal knowledge must distinguish verified authority from operational guidance and AI inference.",
        severity: "critical",
      },
    ],
  },

  "court-simplified-brain": {
    engine: "court-simplified-brain",
    layer: "orchestration",
    authority: "orchestration-only",

    mayReadFrom: [
      "litigation-synthesis",
      "legal-knowledge",
      "claim-arbitration",
    ],
    mayWriteTo: [
      "case-persistence",
      "forms-engine",
      "document-export",
      "ui-layer",
      "ai-chat",
    ],

    mayCreateClaims: false,
    mayModifyClaims: false,
    maySuppressClaims: false,

    mayGenerateForms: false,
    mayGenerateDocuments: false,

    mayMutateCaseState: false,
    mayOverrideProcedure: false,
    mayOverrideEvidence: false,
    mayOverrideArbitration: false,

    governanceRules: [
      {
        id: "BRAIN_001",
        title: "No Independent Cognition",
        description:
          "The orchestration brain may coordinate systems but may not independently invent litigation logic.",
        severity: "critical",
      },
    ],
  },

  "forms-engine": {
    engine: "forms-engine",
    layer: "output",
    authority: "presentation-only",

    mayReadFrom: [
      "court-simplified-brain",
      "procedural-posture",
      "claim-arbitration",
    ],
    mayWriteTo: ["document-export"],

    mayCreateClaims: false,
    mayModifyClaims: false,
    maySuppressClaims: false,

    mayGenerateForms: true,
    mayGenerateDocuments: false,

    mayMutateCaseState: false,
    mayOverrideProcedure: false,
    mayOverrideEvidence: false,
    mayOverrideArbitration: false,

    governanceRules: [
      {
        id: "FORMS_001",
        title: "Forms Are Downstream",
        description:
          "Forms are outputs of litigation cognition and must not independently determine legal theory.",
        severity: "critical",
      },
    ],
  },

  "document-export": {
    engine: "document-export",
    layer: "output",
    authority: "presentation-only",

    mayReadFrom: [
      "court-simplified-brain",
      "forms-engine",
      "case-persistence",
    ],
    mayWriteTo: ["ui-layer"],

    mayCreateClaims: false,
    mayModifyClaims: false,
    maySuppressClaims: false,

    mayGenerateForms: false,
    mayGenerateDocuments: true,

    mayMutateCaseState: false,
    mayOverrideProcedure: false,
    mayOverrideEvidence: false,
    mayOverrideArbitration: false,

    governanceRules: [
      {
        id: "EXPORT_001",
        title: "No Fact Invention",
        description:
          "Document exports must never invent facts, evidence, procedural posture, or legal authority.",
        severity: "critical",
      },
    ],
  },

  "case-persistence": {
    engine: "case-persistence",
    layer: "persistence",
    authority: "state-mutation",

    mayReadFrom: ["court-simplified-brain"],
    mayWriteTo: ["ui-layer", "ai-chat"],

    mayCreateClaims: false,
    mayModifyClaims: false,
    maySuppressClaims: false,

    mayGenerateForms: false,
    mayGenerateDocuments: false,

    mayMutateCaseState: true,
    mayOverrideProcedure: false,
    mayOverrideEvidence: false,
    mayOverrideArbitration: false,

    governanceRules: [
      {
        id: "PERSISTENCE_001",
        title: "Persistence Integrity",
        description:
          "Persistence layers must preserve historical litigation state and may not silently overwrite authoritative state.",
        severity: "critical",
      },
    ],
  },

  "ui-layer": {
    engine: "ui-layer",
    layer: "ui",
    authority: "presentation-only",

    mayReadFrom: [
      "court-simplified-brain",
      "case-persistence",
      "document-export",
    ],
    mayWriteTo: [],

    mayCreateClaims: false,
    mayModifyClaims: false,
    maySuppressClaims: false,

    mayGenerateForms: false,
    mayGenerateDocuments: false,

    mayMutateCaseState: false,
    mayOverrideProcedure: false,
    mayOverrideEvidence: false,
    mayOverrideArbitration: false,

    governanceRules: [
      {
        id: "UI_001",
        title: "UI Cannot Infer Law",
        description:
          "Presentation layers may display intelligence but must not independently infer litigation outcomes.",
        severity: "critical",
      },
    ],
  },

  "ai-chat": {
    engine: "ai-chat",
    layer: "ui",
    authority: "presentation-only",

    mayReadFrom: [
      "court-simplified-brain",
      "case-persistence",
      "legal-knowledge",
    ],
    mayWriteTo: [],

    mayCreateClaims: false,
    mayModifyClaims: false,
    maySuppressClaims: false,

    mayGenerateForms: false,
    mayGenerateDocuments: false,

    mayMutateCaseState: false,
    mayOverrideProcedure: false,
    mayOverrideEvidence: false,
    mayOverrideArbitration: false,

    governanceRules: [
      {
        id: "CHAT_001",
        title: "Chat Obeys Case State",
        description:
          "AI chat must speak from authoritative litigation state rather than free-floating inference.",
        severity: "critical",
      },
    ],
  },
};

export function getEngineGovernance(
  engine: EngineName,
): EngineGovernanceProfile {
  return ENGINE_GOVERNANCE[engine];
}

export function mayEngineWriteTo(
  source: EngineName,
  target: EngineName,
): boolean {
  return ENGINE_GOVERNANCE[source].mayWriteTo.includes(target);
}

export function mayEngineReadFrom(
  source: EngineName,
  target: EngineName,
): boolean {
  return ENGINE_GOVERNANCE[source].mayReadFrom.includes(target);
}