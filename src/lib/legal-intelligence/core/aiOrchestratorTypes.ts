import type {
  ConfidenceLevel,
  CourtSimplifiedArea,
  ProceduralStage,
  UniversalCaseModel,
} from "./caseModel";

import type {
  KnowledgeMatchResult,
  LegalKnowledgeItem,
} from "./legalKnowledgeTypes";

import type {
  LegalPrecedent,
  PrecedentSearchResult,
} from "./precedentTypes";

import type { AIAnswerValidationResult } from "./validationTypes";
import type { WorkflowPlan } from "./workflowTypes";

export type AIInteractionMode =
  | "sandbox-test"
  | "case-intake"
  | "case-review"
  | "evidence-review"
  | "document-preparation"
  | "procedure-guidance"
  | "settlement-preparation"
  | "motion-preparation"
  | "conference-preparation"
  | "trial-preparation"
  | "general-question";

export type AIUserIntent =
  | "tell-case-story"
  | "ask-what-to-do-next"
  | "ask-if-they-have-a-case"
  | "ask-about-proof"
  | "ask-about-evidence"
  | "ask-about-procedure"
  | "ask-about-forms"
  | "ask-about-deadline"
  | "ask-about-precedent"
  | "ask-about-opposing-arguments"
  | "ask-about-judge-concerns"
  | "ask-to-draft"
  | "ask-to-review-document"
  | "ask-to-prepare-for-court"
  | "ask-to-organize-case"
  | "unknown-or-mixed";

export type AIConversationMessage = {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
};

export type AIOrchestratorInput = {
  mode: AIInteractionMode;
  userMessage: string;
  conversationHistory: AIConversationMessage[];

  existingCaseModel?: UniversalCaseModel;

  knownArea?: CourtSimplifiedArea;
  knownProceduralStage?: ProceduralStage;

  availableKnowledge?: LegalKnowledgeItem[];
  availablePrecedents?: LegalPrecedent[];

  userContext?: {
    jurisdiction?: string;
    province?: string;
    court?: string;
    selfRepresented?: boolean;
    hasLawyer?: boolean;
    urgencyClaimed?: boolean;
  };
};

export type AIInterpretationResult = {
  intent: AIUserIntent;
  area: CourtSimplifiedArea;
  proceduralStage: ProceduralStage;
  confidence: ConfidenceLevel;

  understoodUserGoal: string;
  plainLanguageCaseSummary: string;

  extractedFacts: string[];
  extractedTimelineEvents: string[];
  extractedEvidence: string[];
  extractedMissingInformation: string[];

  possibleIssues: string[];
  issueUncertainty: string[];

  shouldAskBeforeAnswering: boolean;
  followUpQuestions: string[];
};

export type AILegalKnowledgeContext = {
  matchedKnowledge: KnowledgeMatchResult[];
  matchedPrecedents: PrecedentSearchResult[];

  knowledgeUsedInAnswer: string[];
  precedentUsedInAnswer: string[];

  verificationWarnings: string[];
  unavailableKnowledgeWarnings: string[];
};

export type AIReasoningResult = {
  caseModel: UniversalCaseModel;
  legalKnowledgeContext: AILegalKnowledgeContext;
  workflowPlan: WorkflowPlan;
  validation: AIAnswerValidationResult;

  judgeConcerns: string[];
  opposingArguments: string[];
  proofProblems: string[];
  proceduralProblems: string[];
  documentReadinessProblems: string[];

  reasoningConfidence: ConfidenceLevel;
};

export type AIUserFacingResponse = {
  answer: string;

  keyPoints: string[];
  missingInformation: string[];
  evidenceNeeded: string[];
  risksAndWarnings: string[];
  nextSteps: string[];
  followUpQuestions: string[];

  shouldShowStructuredSummary: boolean;
};

export type AIOrchestratorOutput = {
  ok: boolean;

  mode: AIInteractionMode;
  intent: AIUserIntent;

  area: CourtSimplifiedArea;
  proceduralStage: ProceduralStage;
  confidence: ConfidenceLevel;

  userFacingResponse: AIUserFacingResponse;

  caseModel: UniversalCaseModel;
  workflowPlan: WorkflowPlan;
  validation: AIAnswerValidationResult;
  legalKnowledgeContext: AILegalKnowledgeContext;

  internalControl: {
    answerWasBlocked: boolean;
    answerLimitedByMissingFacts: boolean;
    answerLimitedByUnverifiedLaw: boolean;
    shouldNotRecommendFormsYet: boolean;
    shouldNotMentionPrecedentYet: boolean;
    requiresHumanReview: boolean;
    logs: string[];
  };
};

export const DEFAULT_AI_USER_FACING_RESPONSE: AIUserFacingResponse = {
  answer:
    "I need a few more details before giving specific guidance. I can help organize the case, identify missing facts, and explain what should be checked next.",
  keyPoints: [],
  missingInformation: [],
  evidenceNeeded: [],
  risksAndWarnings: [],
  nextSteps: [],
  followUpQuestions: [],
  shouldShowStructuredSummary: true,
};

export const DEFAULT_LEGAL_KNOWLEDGE_CONTEXT: AILegalKnowledgeContext = {
  matchedKnowledge: [],
  matchedPrecedents: [],
  knowledgeUsedInAnswer: [],
  precedentUsedInAnswer: [],
  verificationWarnings: [],
  unavailableKnowledgeWarnings: [],
};

export function shouldLimitAIAnswer(output: AIOrchestratorOutput): boolean {
  return (
    output.internalControl.answerWasBlocked ||
    output.internalControl.answerLimitedByMissingFacts ||
    output.internalControl.answerLimitedByUnverifiedLaw ||
    output.validation.mustAvoidFinalConclusion
  );
}

export function canAIRecommendDocuments(output: AIOrchestratorOutput): boolean {
  return (
    !output.internalControl.shouldNotRecommendFormsYet &&
    output.validation.canMentionForms &&
    !output.validation.mustAskFollowUpQuestions
  );
}

export function canAIMentionPrecedent(output: AIOrchestratorOutput): boolean {
  return (
    !output.internalControl.shouldNotMentionPrecedentYet &&
    output.validation.canMentionPrecedents
  );
}