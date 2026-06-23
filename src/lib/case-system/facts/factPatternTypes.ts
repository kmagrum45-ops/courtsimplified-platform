import {
  IntelligenceConfidence,
  IntelligenceSeverity,
} from "../intelligence/intelligenceTypes";

export type FactPatternCategory =
  | "admission"
  | "denial"
  | "contradiction"
  | "timeline"
  | "motive"
  | "intent"
  | "knowledge"
  | "notice"
  | "credibility"
  | "conduct"
  | "causation"
  | "damages"
  | "procedure"
  | "unknown";

export type FactPatternFinding = {
  id: string;

  category: FactPatternCategory;

  title: string;

  description: string;

  supportingFactIds: string[];

  supportingEvidenceIds: string[];

  confidence: IntelligenceConfidence;

  severity: IntelligenceSeverity;

  significance: string;

  litigationImpact: string;
};

export type FactPatternAnalysisResult = {
  version: "1.0.0";

  findings: FactPatternFinding[];

  admissions: FactPatternFinding[];

  contradictions: FactPatternFinding[];

  credibilityIssues: FactPatternFinding[];

  knowledgeIndicators: FactPatternFinding[];

  timelineIssues: FactPatternFinding[];

  causationIssues: FactPatternFinding[];

  damagesIndicators: FactPatternFinding[];

  strongestPatterns: string[];

  weakestPatterns: string[];

  nextActions: string[];

  summary: string;
};