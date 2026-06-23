import {
  IntelligenceConfidence,
  IntelligenceSeverity,
} from "../intelligence/intelligenceTypes";

export type EvidenceStrength =
  | "very-weak"
  | "weak"
  | "moderate"
  | "strong"
  | "very-strong";

export type EvidenceGap = {
  id: string;

  title: string;

  explanation: string;

  severity: IntelligenceSeverity;

  recommendedEvidence: string[];
};

export type EvidenceContradiction = {
  id: string;

  title: string;

  explanation: string;

  evidenceIds: string[];

  severity: IntelligenceSeverity;
};

export type EvidenceIntelligenceFinding = {
  id: string;

  title: string;

  explanation: string;

  confidence: IntelligenceConfidence;

  strength: EvidenceStrength;

  supportingEvidenceIds: string[];

  litigationImpact: string;
};

export type EvidenceIntelligenceResult = {
  version: "1.0.0";

  findings: EvidenceIntelligenceFinding[];

  contradictions: EvidenceContradiction[];

  gaps: EvidenceGap[];

  strongestEvidence: string[];

  weakestEvidence: string[];

  recommendedEvidenceCollection: string[];

  summary: string;
};