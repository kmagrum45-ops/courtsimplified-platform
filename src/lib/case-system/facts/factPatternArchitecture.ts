import {
  CaseConfidence,
  CaseCourtPath,
  CaseEvidenceType,
  CaseLegalDomain,
  CaseProvince,
  CaseSeverity,
  CaseStage,
} from "../architecture/masterCaseSchema";

export type FactPatternEngineVersion = "1.0.0";

export type FactPatternCategory =
  | "family-support"
  | "family-parenting"
  | "family-safety"
  | "small-claims-debt"
  | "small-claims-contract"
  | "small-claims-property-damage"
  | "civil-negligence"
  | "civil-defamation"
  | "civil-institutional-liability"
  | "civil-human-rights"
  | "civil-charter"
  | "procedural"
  | "evidence"
  | "credibility"
  | "damages"
  | "unknown";

export type FactPatternStatus =
  | "detected"
  | "possible"
  | "weak-signal"
  | "insufficient-facts";

export type FactSignalType =
  | "payment"
  | "communication"
  | "delay"
  | "denial"
  | "admission"
  | "document"
  | "relationship"
  | "child-related"
  | "damage"
  | "injury"
  | "contract"
  | "service"
  | "filing"
  | "deadline"
  | "authority"
  | "credibility"
  | "contradiction"
  | "unknown";

export type FactPatternSignal = {
  id: string;
  signalType: FactSignalType;
  label: string;
  description: string;
  sourceText?: string;
  confidence: CaseConfidence;
  severity: CaseSeverity;
};

export type FactPatternFinding = {
  id: string;
  category: FactPatternCategory;
  status: FactPatternStatus;
  title: string;
  explanation: string;
  confidence: CaseConfidence;
  severity: CaseSeverity;
  relatedDomains: CaseLegalDomain[];
  supportingSignals: FactPatternSignal[];
  missingFacts: string[];
  evidenceNeeded: string[];
  proceduralSignals: string[];
  credibilitySignals: string[];
  judicialConcernSignals: string[];
  recommendedQuestions: string[];
};

export type ExtractedFactEntity = {
  id: string;
  label: string;
  entityType:
    | "person"
    | "organization"
    | "court"
    | "date"
    | "money"
    | "document"
    | "location"
    | "unknown";
  value: string;
  sourceText?: string;
  confidence: CaseConfidence;
};

export type FactPatternEvidenceCandidate = {
  id: string;
  type: CaseEvidenceType;
  title: string;
  description?: string;
  sourceText?: string;
  confidence: CaseConfidence;
};

export type FactPatternEngineInput = {
  caseId?: string;
  courtPath: CaseCourtPath;
  province: CaseProvince;
  stage: CaseStage;
  rawNarrative?: string;
  legalDomains?: CaseLegalDomain[];
  knownEvidence?: FactPatternEvidenceCandidate[];
  knownMissingInformation?: string[];
};

export type FactPatternReport = {
  id: string;
  version: FactPatternEngineVersion;
  createdAt: string;
  updatedAt: string;
  caseId?: string;

  courtPath: CaseCourtPath;
  province: CaseProvince;
  stage: CaseStage;

  detectedPatterns: FactPatternFinding[];
  extractedEntities: ExtractedFactEntity[];
  globalSignals: FactPatternSignal[];

  missingFacts: string[];
  evidenceNeeded: string[];
  proceduralSignals: string[];
  credibilitySignals: string[];
  judicialConcernSignals: string[];
  recommendedQuestions: string[];

  dominantPatternIds: string[];
  warnings: string[];
  summary: string;
  confidence: CaseConfidence;
};

export type FactPatternEngineOutput = {
  report: FactPatternReport;
  warnings: string[];
};