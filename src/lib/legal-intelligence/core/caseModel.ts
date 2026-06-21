export type CourtSimplifiedArea =
  | "small-claims"
  | "family"
  | "civil"
  | "ltb"
  | "immigration"
  | "unknown"
  | "mixed";

export type ProceduralStage =
  | "not-started"
  | "starting-case"
  | "responding"
  | "already-filed"
  | "conference"
  | "motion"
  | "settlement"
  | "disclosure"
  | "trial-preparation"
  | "trial"
  | "enforcement"
  | "appeal-or-review"
  | "urgent"
  | "not-sure"
  | "unknown";

export type ConfidenceLevel = "low" | "medium" | "high";

export type PartyRole =
  | "claimant"
  | "plaintiff"
  | "applicant"
  | "respondent"
  | "defendant"
  | "moving-party"
  | "responding-party"
  | "witness"
  | "child"
  | "third-party"
  | "organization"
  | "unknown";

export type EvidenceStrength =
  | "strong"
  | "moderate"
  | "weak"
  | "missing"
  | "unknown";

export type LegalIssueStatus =
  | "recognized"
  | "possible"
  | "uncertain"
  | "mixed"
  | "not-yet-mapped";

export type CaseParty = {
  id: string;
  name?: string;
  role: PartyRole;
  description?: string;
};

export type CaseTimelineEvent = {
  id: string;
  date?: string;
  dateKnown: boolean;
  title: string;
  description: string;
  relatedPartyIds?: string[];
  relatedEvidenceIds?: string[];
};

export type CaseEvidenceItem = {
  id: string;
  title: string;
  description?: string;
  type:
    | "document"
    | "photo"
    | "video"
    | "audio"
    | "message"
    | "email"
    | "receipt"
    | "contract"
    | "court-file"
    | "witness"
    | "expert"
    | "financial-record"
    | "medical-record"
    | "police-record"
    | "other";
  strength: EvidenceStrength;
  proves?: string[];
  weaknesses?: string[];
  missingContext?: string[];
};

export type CaseLegalIssue = {
  id: string;
  label: string;
  area: CourtSimplifiedArea;
  status: LegalIssueStatus;
  userDescription: string;
  possibleLegalTheory?: string;
  proofNeeded: string[];
  evidenceAvailable: string[];
  evidenceMissing: string[];
  risks: string[];
  judgeConcerns: string[];
  opposingArguments: string[];
  confidence: ConfidenceLevel;
};

export type CaseRemedy = {
  id: string;
  remedyType:
    | "money"
    | "parenting"
    | "support"
    | "property"
    | "injunction"
    | "declaration"
    | "order"
    | "costs"
    | "enforcement"
    | "other";
  description: string;
  amountClaimed?: number;
  calculationKnown?: boolean;
  proofNeeded?: string[];
};

export type CaseDocumentStatus =
  | "not-started"
  | "draft-needed"
  | "in-progress"
  | "filed"
  | "served"
  | "received"
  | "not-needed-now"
  | "unknown";

export type CaseDocumentNeed = {
  id: string;
  title: string;
  courtArea: CourtSimplifiedArea;
  status: CaseDocumentStatus;
  whyItMayBeNeeded: string;
  missingBeforeDrafting: string[];
  shouldRecommendNow: boolean;
  confidence: ConfidenceLevel;
};

export type CaseRiskFlag = {
  id: string;
  severity: "low" | "medium" | "high";
  category:
    | "missing-evidence"
    | "deadline"
    | "jurisdiction"
    | "procedure"
    | "credibility"
    | "causation"
    | "damages"
    | "service"
    | "form-selection"
    | "legal-uncertainty"
    | "other";
  description: string;
  suggestedResponse?: string;
};

export type CaseInternalNotes = {
  classificationWarnings: string[];
  uncertaintyFlags: string[];
  avoidGivingCertainty: boolean;
  avoidFormRecommendation: boolean;
  requiresVerifiedLawCheck: boolean;
  requiresUrgencyWarning: boolean;
};

export type UniversalCaseModel = {
  caseId?: string;
  createdAt?: string;
  updatedAt?: string;

  area: CourtSimplifiedArea;
  proceduralStage: ProceduralStage;
  confidence: ConfidenceLevel;

  userGoal: string;
  userRole?: PartyRole;
  plainLanguageSummary: string;

  parties: CaseParty[];
  timeline: CaseTimelineEvent[];
  evidence: CaseEvidenceItem[];
  legalIssues: CaseLegalIssue[];
  remedies: CaseRemedy[];
  documentNeeds: CaseDocumentNeed[];
  riskFlags: CaseRiskFlag[];

  missingInformation: string[];
  followUpQuestions: string[];
  nextBestSteps: string[];

  internalNotes: CaseInternalNotes;
};

export const EMPTY_INTERNAL_NOTES: CaseInternalNotes = {
  classificationWarnings: [],
  uncertaintyFlags: [],
  avoidGivingCertainty: true,
  avoidFormRecommendation: true,
  requiresVerifiedLawCheck: true,
  requiresUrgencyWarning: false,
};

export const EMPTY_CASE_MODEL: UniversalCaseModel = {
  area: "unknown",
  proceduralStage: "unknown",
  confidence: "low",
  userGoal: "",
  userRole: "unknown",
  plainLanguageSummary: "",
  parties: [],
  timeline: [],
  evidence: [],
  legalIssues: [],
  remedies: [],
  documentNeeds: [],
  riskFlags: [],
  missingInformation: [],
  followUpQuestions: [],
  nextBestSteps: [],
  internalNotes: EMPTY_INTERNAL_NOTES,
};

export function createEmptyCaseModel(
  overrides: Partial<UniversalCaseModel> = {}
): UniversalCaseModel {
  return {
    ...EMPTY_CASE_MODEL,
    ...overrides,

    parties: overrides.parties ?? [],
    timeline: overrides.timeline ?? [],
    evidence: overrides.evidence ?? [],
    legalIssues: overrides.legalIssues ?? [],
    remedies: overrides.remedies ?? [],
    documentNeeds: overrides.documentNeeds ?? [],
    riskFlags: overrides.riskFlags ?? [],

    missingInformation: overrides.missingInformation ?? [],
    followUpQuestions: overrides.followUpQuestions ?? [],
    nextBestSteps: overrides.nextBestSteps ?? [],

    internalNotes: {
      classificationWarnings:
        overrides.internalNotes?.classificationWarnings ??
        EMPTY_INTERNAL_NOTES.classificationWarnings,

      uncertaintyFlags:
        overrides.internalNotes?.uncertaintyFlags ??
        EMPTY_INTERNAL_NOTES.uncertaintyFlags,

      avoidGivingCertainty:
        overrides.internalNotes?.avoidGivingCertainty ??
        EMPTY_INTERNAL_NOTES.avoidGivingCertainty,

      avoidFormRecommendation:
        overrides.internalNotes?.avoidFormRecommendation ??
        EMPTY_INTERNAL_NOTES.avoidFormRecommendation,

      requiresVerifiedLawCheck:
        overrides.internalNotes?.requiresVerifiedLawCheck ??
        EMPTY_INTERNAL_NOTES.requiresVerifiedLawCheck,

      requiresUrgencyWarning:
        overrides.internalNotes?.requiresUrgencyWarning ??
        EMPTY_INTERNAL_NOTES.requiresUrgencyWarning,
    },
  };
}

export function isKnownCourtArea(area: CourtSimplifiedArea): boolean {
  return area !== "unknown" && area !== "mixed";
}

export function shouldAvoidDocumentRecommendation(
  model: UniversalCaseModel
): boolean {
  return (
    model.confidence === "low" ||
    model.internalNotes.avoidFormRecommendation === true ||
    model.documentNeeds.every((document) => !document.shouldRecommendNow)
  );
}