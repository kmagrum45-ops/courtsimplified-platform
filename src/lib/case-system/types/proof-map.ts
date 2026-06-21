import type { EvidenceStrength, RiskSeverity } from "./case";

export type ProofBurden =
  | "balance-of-probabilities"
  | "clear-and-convincing"
  | "statutory-test"
  | "best-interests"
  | "procedural-threshold"
  | "unknown";

export type ProofStatus =
  | "not-started"
  | "missing-proof"
  | "partially-supported"
  | "well-supported"
  | "contradicted"
  | "not-applicable"
  | "unknown";

export type ProofRiskSource =
  | "missing-evidence"
  | "weak-evidence"
  | "contradiction"
  | "credibility"
  | "causation"
  | "damages"
  | "limitation"
  | "jurisdiction"
  | "procedure"
  | "legal-element"
  | "unknown";

export type ProofElement = {
  id: string;
  issueId: string;
  elementName: string;
  plainLanguageMeaning: string;
  burden: ProofBurden;
  requiredFacts: string[];
  supportingEvidenceIds: string[];
  weakEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  missingProof: string[];
  status: ProofStatus;
  strength: EvidenceStrength;
  riskLevel: RiskSeverity;
  riskSources: ProofRiskSource[];
  suggestedQuestions: string[];
  suggestedNextEvidence: string[];
};

export type IssueProofMap = {
  id: string;
  caseId?: string;
  issueId: string;
  issueTitle: string;
  legalTheory?: string;
  elements: ProofElement[];
  overallStatus: ProofStatus;
  overallStrength: EvidenceStrength;
  overallRisk: RiskSeverity;
  strongestProof: string[];
  weakestProof: string[];
  contradictions: string[];
  missingEvidence: string[];
  courtWordingNotes: string[];
  strategyNotes: string[];
};

export type CaseProofMap = {
  caseId?: string;
  issueMaps: IssueProofMap[];
  globalMissingProof: string[];
  globalContradictions: string[];
  globalStrengths: string[];
  globalWeaknesses: string[];
  nextProofSteps: string[];
  readinessWarning: string[];
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyProofElement(
  overrides: Partial<ProofElement> = {},
): ProofElement {
  return {
    id: overrides.id || createId("proof_element"),
    issueId: overrides.issueId || "",
    elementName: overrides.elementName || "",
    plainLanguageMeaning: overrides.plainLanguageMeaning || "",
    burden: overrides.burden || "unknown",
    requiredFacts: overrides.requiredFacts || [],
    supportingEvidenceIds: overrides.supportingEvidenceIds || [],
    weakEvidenceIds: overrides.weakEvidenceIds || [],
    contradictingEvidenceIds: overrides.contradictingEvidenceIds || [],
    missingProof: overrides.missingProof || [],
    status: overrides.status || "unknown",
    strength: overrides.strength || "unknown",
    riskLevel: overrides.riskLevel || "medium",
    riskSources: overrides.riskSources || [],
    suggestedQuestions: overrides.suggestedQuestions || [],
    suggestedNextEvidence: overrides.suggestedNextEvidence || [],
  };
}

export function createEmptyIssueProofMap(
  overrides: Partial<IssueProofMap> = {},
): IssueProofMap {
  return {
    id: overrides.id || createId("issue_proof_map"),
    caseId: overrides.caseId,
    issueId: overrides.issueId || "",
    issueTitle: overrides.issueTitle || "",
    legalTheory: overrides.legalTheory || "",
    elements: overrides.elements || [],
    overallStatus: overrides.overallStatus || "unknown",
    overallStrength: overrides.overallStrength || "unknown",
    overallRisk: overrides.overallRisk || "medium",
    strongestProof: overrides.strongestProof || [],
    weakestProof: overrides.weakestProof || [],
    contradictions: overrides.contradictions || [],
    missingEvidence: overrides.missingEvidence || [],
    courtWordingNotes: overrides.courtWordingNotes || [],
    strategyNotes: overrides.strategyNotes || [],
  };
}

export function createEmptyCaseProofMap(
  overrides: Partial<CaseProofMap> = {},
): CaseProofMap {
  return {
    caseId: overrides.caseId,
    issueMaps: overrides.issueMaps || [],
    globalMissingProof: overrides.globalMissingProof || [],
    globalContradictions: overrides.globalContradictions || [],
    globalStrengths: overrides.globalStrengths || [],
    globalWeaknesses: overrides.globalWeaknesses || [],
    nextProofSteps: overrides.nextProofSteps || [],
    readinessWarning: overrides.readinessWarning || [],
  };
}