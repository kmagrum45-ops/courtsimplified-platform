export type ContradictionSchemaVersion = "1.0.0";

export type ContradictionSourceType =
  | "fact"
  | "claim"
  | "evidence"
  | "timeline"
  | "party-statement"
  | "witness-statement"
  | "expert-opinion"
  | "document"
  | "procedure"
  | "authority"
  | "unknown";

export type ContradictionSeverity =
  | "low"
  | "moderate"
  | "high"
  | "critical";

export type ContradictionConfidence =
  | "very-low"
  | "low"
  | "medium"
  | "high"
  | "very-high";

export type ContradictionCategory =
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

export type ContradictionNode = {
  id: string;

  sourceType: ContradictionSourceType;

  sourceId: string;

  title: string;

  content: string;

  confidence: ContradictionConfidence;
};

export type ContradictionFinding = {
  id: string;

  category: ContradictionCategory;

  severity: ContradictionSeverity;

  confidence: ContradictionConfidence;

  leftNode: ContradictionNode;

  rightNode: ContradictionNode;

  explanation: string;

  whyItMatters: string;

  possibleResolutions: string[];

  judicialConcern: string;

  litigationRisk: string;

  requiresHumanReview: boolean;
};

export type ContradictionSummary = {
  totalFindings: number;

  criticalFindings: number;

  highFindings: number;

  moderateFindings: number;

  lowFindings: number;

  credibilityRiskScore: number;

  overallRisk:
    | "minimal"
    | "manageable"
    | "elevated"
    | "serious"
    | "critical";
};

export type ContradictionEngineResult = {
  findings: ContradictionFinding[];

  summary: ContradictionSummary;

  warnings: string[];
};