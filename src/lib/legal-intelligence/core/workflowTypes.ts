import type {
  ConfidenceLevel,
  CourtSimplifiedArea,
  ProceduralStage,
} from "./caseModel";

export type WorkflowActionType =
  | "ask-follow-up-questions"
  | "collect-evidence"
  | "organize-timeline"
  | "clarify-parties"
  | "clarify-remedy"
  | "check-jurisdiction"
  | "check-deadline"
  | "review-procedure"
  | "identify-legal-issues"
  | "map-proof"
  | "prepare-form"
  | "prepare-draft-document"
  | "prepare-affidavit"
  | "prepare-statement-of-claim"
  | "prepare-defence-or-response"
  | "prepare-motion"
  | "prepare-conference-brief"
  | "prepare-settlement-position"
  | "prepare-trial-plan"
  | "prepare-enforcement-step"
  | "review-opposing-materials"
  | "build-court-package"
  | "recommend-human-review"
  | "pause-for-verification";

export type WorkflowPriority = "low" | "medium" | "high" | "urgent";

export type WorkflowReadiness =
  | "ready-now"
  | "partially-ready"
  | "not-ready"
  | "blocked"
  | "unknown";

export type WorkflowStep = {
  id: string;
  title: string;
  actionType: WorkflowActionType;
  area: CourtSimplifiedArea;
  proceduralStage: ProceduralStage;
  priority: WorkflowPriority;
  readiness: WorkflowReadiness;
  confidence: ConfidenceLevel;

  whyThisMatters: string;
  userFacingInstruction: string;

  requiredInputs: string[];
  missingInputs: string[];
  evidenceNeeded: string[];
  relatedDocuments: string[];
  relatedLegalIssues: string[];

  risksIfSkipped: string[];
  judgeConcernsAddressed: string[];
  opposingArgumentsAddressed: string[];

  canBeAutomated: boolean;
  requiresUserReview: boolean;
  requiresVerifiedLawCheck: boolean;
  requiresHumanReview: boolean;
};

export type WorkflowPlan = {
  id: string;
  area: CourtSimplifiedArea;
  proceduralStage: ProceduralStage;
  confidence: ConfidenceLevel;

  summary: string;
  immediateNextStep: WorkflowStep;
  recommendedSteps: WorkflowStep[];
  blockedSteps: WorkflowStep[];

  missingInformationBeforeDocuments: string[];
  missingEvidenceBeforeDocuments: string[];
  verificationNeededBeforeProceeding: string[];

  userShouldNotDoYet: string[];
  safeProgressUserCanMakeNow: string[];
};

export const DEFAULT_WORKFLOW_STEP: WorkflowStep = {
  id: "",
  title: "Clarify the case before recommending a court step",
  actionType: "ask-follow-up-questions",
  area: "unknown",
  proceduralStage: "unknown",
  priority: "medium",
  readiness: "unknown",
  confidence: "low",
  whyThisMatters:
    "CourtSimplified should not recommend documents, forms, or legal steps until the case facts and procedural stage are clear enough.",
  userFacingInstruction:
    "Answer the missing questions first so the system can safely identify the next step.",
  requiredInputs: [],
  missingInputs: [],
  evidenceNeeded: [],
  relatedDocuments: [],
  relatedLegalIssues: [],
  risksIfSkipped: [],
  judgeConcernsAddressed: [],
  opposingArgumentsAddressed: [],
  canBeAutomated: false,
  requiresUserReview: true,
  requiresVerifiedLawCheck: true,
  requiresHumanReview: false,
};

export const DEFAULT_WORKFLOW_PLAN: WorkflowPlan = {
  id: "",
  area: "unknown",
  proceduralStage: "unknown",
  confidence: "low",
  summary:
    "The safest next step is to clarify the case before recommending forms, documents, deadlines, or legal arguments.",
  immediateNextStep: DEFAULT_WORKFLOW_STEP,
  recommendedSteps: [],
  blockedSteps: [],
  missingInformationBeforeDocuments: [],
  missingEvidenceBeforeDocuments: [],
  verificationNeededBeforeProceeding: [],
  userShouldNotDoYet: [],
  safeProgressUserCanMakeNow: [],
};

export function isWorkflowStepReady(step: WorkflowStep): boolean {
  return step.readiness === "ready-now" && step.confidence !== "low";
}

export function shouldPauseForVerification(step: WorkflowStep): boolean {
  return step.requiresVerifiedLawCheck || step.actionType === "pause-for-verification";
}

export function requiresHumanReview(step: WorkflowStep): boolean {
  return step.requiresHumanReview || step.priority === "urgent";
}

export function canAutomateWorkflowStep(step: WorkflowStep): boolean {
  return (
    step.canBeAutomated &&
    step.readiness === "ready-now" &&
    !step.requiresHumanReview &&
    !step.requiresVerifiedLawCheck
  );
}