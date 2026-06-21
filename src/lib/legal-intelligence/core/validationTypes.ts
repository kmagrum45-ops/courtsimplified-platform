import type {
  ConfidenceLevel,
  CourtSimplifiedArea,
  ProceduralStage,
} from "./caseModel";

export type ValidationSeverity = "low" | "medium" | "high" | "blocking";

export type ValidationCategory =
  | "missing-facts"
  | "missing-evidence"
  | "legal-uncertainty"
  | "procedure-uncertainty"
  | "deadline-risk"
  | "jurisdiction-risk"
  | "form-risk"
  | "precedent-risk"
  | "source-risk"
  | "overconfidence-risk"
  | "user-safety"
  | "scope-of-service"
  | "other";

export type AIOutputDecision =
  | "safe-to-answer"
  | "answer-with-caution"
  | "ask-follow-up-first"
  | "block-specific-guidance"
  | "requires-human-review";

export type ValidationFlag = {
  id: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  message: string;
  userFacingMessage?: string;
  suggestedFix?: string;
};

export type ValidationCheckResult = {
  id: string;
  passed: boolean;
  category: ValidationCategory;
  severityIfFailed: ValidationSeverity;
  explanation: string;
  flagIfFailed?: ValidationFlag;
};

export type AIAnswerValidationResult = {
  decision: AIOutputDecision;
  confidence: ConfidenceLevel;
  area: CourtSimplifiedArea;
  proceduralStage: ProceduralStage;

  passedChecks: ValidationCheckResult[];
  failedChecks: ValidationCheckResult[];
  flags: ValidationFlag[];

  canMentionLaw: boolean;
  canMentionForms: boolean;
  canMentionDeadlines: boolean;
  canMentionPrecedents: boolean;
  canDraftDocuments: boolean;

  mustAskFollowUpQuestions: boolean;
  mustUseUncertaintyLanguage: boolean;
  mustAvoidLegalAdviceLanguage: boolean;
  mustAvoidFinalConclusion: boolean;
  mustRecommendVerification: boolean;

  safeUserMessage: string;
};

export const DEFAULT_VALIDATION_RESULT: AIAnswerValidationResult = {
  decision: "ask-follow-up-first",
  confidence: "low",
  area: "unknown",
  proceduralStage: "unknown",
  passedChecks: [],
  failedChecks: [],
  flags: [],
  canMentionLaw: false,
  canMentionForms: false,
  canMentionDeadlines: false,
  canMentionPrecedents: false,
  canDraftDocuments: false,
  mustAskFollowUpQuestions: true,
  mustUseUncertaintyLanguage: true,
  mustAvoidLegalAdviceLanguage: true,
  mustAvoidFinalConclusion: true,
  mustRecommendVerification: true,
  safeUserMessage:
    "I need a few more details before giving specific guidance. I can help organize the issue, identify missing information, and explain what should be checked next.",
};

export function hasBlockingValidationFlag(
  result: AIAnswerValidationResult
): boolean {
  return result.flags.some((flag) => flag.severity === "blocking");
}

export function shouldAskFollowUpBeforeGuidance(
  result: AIAnswerValidationResult
): boolean {
  return (
    result.decision === "ask-follow-up-first" ||
    result.mustAskFollowUpQuestions ||
    hasBlockingValidationFlag(result)
  );
}

export function canSafelyRecommendForms(
  result: AIAnswerValidationResult
): boolean {
  return (
    result.canMentionForms &&
    !result.mustAskFollowUpQuestions &&
    !hasBlockingValidationFlag(result)
  );
}

export function canSafelyUsePrecedent(
  result: AIAnswerValidationResult
): boolean {
  return (
    result.canMentionPrecedents &&
    result.decision !== "block-specific-guidance" &&
    !hasBlockingValidationFlag(result)
  );
}