import {
  buildConversationIntelligence,
  CasePartnerConversationMessage,
} from "./conversationIntelligenceEngine";

import { buildConversationMemory } from "./conversationMemoryEngine";

import { buildCaseInvestigation } from "./caseInvestigationEngine";

import {
  buildLegalReasoningCoordinator,
  CoordinatedReasoningPackage,
} from "../knowledge/legalReasoningCoordinator";

import { DOCTRINE_SEED_LIBRARY } from "../knowledge/doctrineSeedLibrary";

import { CaseLegalDomain } from "../architecture/masterCaseSchema";

export type AiCasePartnerOrchestratorVersion = "1.4.0";

export type AiCasePartnerOrchestratorInput = {
  caseId?: string;
  message: string;
  conversation?: CasePartnerConversationMessage[];
  caseMemory?: unknown;
  mode?: string;
  diagnosticId?: string;
};

export type AiCasePartnerDiagnosticStage =
  | "conversation-intelligence"
  | "legal-domain-detection"
  | "legal-reasoning"
  | "conversation-memory"
  | "case-investigation"
  | "response-construction";

export type AiCasePartnerStageDiagnostic = {
  stage: AiCasePartnerDiagnosticStage;
  ok: true;
  durationMs: number;
  outputBytes: number;
};

export type AiCasePartnerOrchestratorDiagnostics = {
  diagnosticId: string;
  totalDurationMs: number;
  inputMetrics: {
    messageCharacters: number;
    conversationMessages: number;
    conversationCharacters: number;
    caseMemoryBytes: number;
  };
  stages: AiCasePartnerStageDiagnostic[];
};

export type AiCasePartnerOrchestratorResult = {
  version: AiCasePartnerOrchestratorVersion;
  generatedAt: string;
  ok: true;

  userFacingAnswer: string;
  answer: string;

  conversationIntelligence: ReturnType<typeof buildConversationIntelligence>;
  legalReasoning: CoordinatedReasoningPackage;
  conversationMemory: ReturnType<typeof buildConversationMemory>;
  caseInvestigation: ReturnType<typeof buildCaseInvestigation>;

  caseMemory: ReturnType<typeof buildConversationMemory>["memory"];

  diagnostics: AiCasePartnerOrchestratorDiagnostics;

  result: {
    conversationIntelligence: ReturnType<typeof buildConversationIntelligence>;
    legalReasoning: CoordinatedReasoningPackage;
    conversationMemory: ReturnType<typeof buildConversationMemory>;
    caseInvestigation: ReturnType<typeof buildCaseInvestigation>;
  };
};

type ResponseIntent =
  | "evidence"
  | "legal-issues"
  | "judge-concerns"
  | "document-readiness"
  | "next-clarification"
  | "general";


type OrchestratorStageError = Error & {
  stage?: AiCasePartnerDiagnosticStage;
  diagnosticId?: string;
  cause?: unknown;
};

function createDiagnosticId(): string {
  return `orchestrator_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function estimateJsonSize(value: unknown): number {
  try {
    return JSON.stringify(value).length;
  } catch {
    return -1;
  }
}

function buildStageError(args: {
  error: unknown;
  stage: AiCasePartnerDiagnosticStage;
  diagnosticId: string;
}): OrchestratorStageError {
  const original =
    args.error instanceof Error
      ? args.error
      : new Error(String(args.error));

  const stageError = new Error(
    original.message ||
      `AI Case Partner failed during ${args.stage}.`,
  ) as OrchestratorStageError;

  stageError.name = "AiCasePartnerOrchestratorStageError";
  stageError.stage = args.stage;
  stageError.diagnosticId = args.diagnosticId;
  stageError.cause = original;
  stageError.stack = original.stack || stageError.stack;

  return stageError;
}

function runDiagnosticStage<T>(args: {
  stage: AiCasePartnerDiagnosticStage;
  diagnosticId: string;
  diagnostics: AiCasePartnerStageDiagnostic[];
  operation: () => T;
}): T {
  const startedAt = Date.now();

  try {
    const output = args.operation();

    args.diagnostics.push({
      stage: args.stage,
      ok: true,
      durationMs: Date.now() - startedAt,
      outputBytes: estimateJsonSize(output),
    });

    return output;
  } catch (error) {
    console.error("AI Case Partner orchestrator stage failed", {
      diagnosticId: args.diagnosticId,
      stage: args.stage,
      durationMs: Date.now() - startedAt,
      error,
    });

    throw buildStageError({
      error,
      stage: args.stage,
      diagnosticId: args.diagnosticId,
    });
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown): string {
  return clean(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function firstItem(items: unknown): string {
  return Array.isArray(items) && typeof items[0] === "string"
    ? clean(items[0])
    : "";
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueStrings(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const text = clean(value);
    const key = normalize(text);

    if (!text || !key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(text);
  }

  return result;
}

function uniqueDomains(values: CaseLegalDomain[]): CaseLegalDomain[] {
  return Array.from(new Set(values));
}

function detectLegalDomains(
  intelligence: ReturnType<typeof buildConversationIntelligence>,
): CaseLegalDomain[] {
  const text = [
    intelligence.conversationFocus.primaryGoal,
    ...intelligence.hypotheses.map((item) => item.label),
    ...intelligence.hypotheses.map((item) => item.explanation),
    ...intelligence.legalSignals.map((item) => item.label),
    ...intelligence.legalSignals.map((item) => item.explanation),
    ...intelligence.caseMemoryPatch.legalIssuesToReview,
  ]
    .join(" ")
    .toLowerCase();

  const domains: CaseLegalDomain[] = [];

  if (text.includes("defamation") || text.includes("reputation")) {
    domains.push("defamation");
  }

  if (text.includes("contract") || text.includes("agreement")) {
    domains.push("contract");
  }

  if (
    text.includes("payment") ||
    text.includes("debt") ||
    text.includes("owed")
  ) {
    domains.push("debt");
  }

  if (
    text.includes("property damage") ||
    text.includes("damaged")
  ) {
    domains.push("property-damage");
  }

  if (text.includes("negligence")) {
    domains.push("negligence");
  }

  if (
    text.includes("family") ||
    text.includes("parenting") ||
    text.includes("custody")
  ) {
    domains.push("family-parenting");
  }

  if (text.includes("support")) {
    domains.push("family-support");
  }

  if (
    text.includes("public") ||
    text.includes("crown") ||
    text.includes("police") ||
    text.includes("government") ||
    text.includes("institutional")
  ) {
    domains.push("civil-institutional-liability");
  }

  if (text.includes("charter")) {
    domains.push("civil-charter");
  }

  if (
    text.includes("procedure") ||
    text.includes("court") ||
    text.includes("form")
  ) {
    domains.push("procedural");
  }

  return uniqueDomains(
    domains.length > 0 ? domains : ["unknown"],
  );
}

function detectResponseIntent(message: string): ResponseIntent {
  const text = normalize(message);

  if (
    text.includes("what evidence am i missing") ||
    text.includes("missing evidence") ||
    text.includes("what proof") ||
    text.includes("evidence do i need")
  ) {
    return "evidence";
  }

  if (
    text.includes("what legal issues") ||
    text.includes("legal issues should be reviewed") ||
    text.includes("what claims") ||
    text.includes("what issue applies")
  ) {
    return "legal-issues";
  }

  if (
    text.includes("what would a judge") ||
    text.includes("judge likely") ||
    text.includes("judge concerned") ||
    text.includes("court concerned")
  ) {
    return "judge-concerns";
  }

  if (
    text.includes("before generating documents") ||
    text.includes("document ready") ||
    text.includes("ready for documents") ||
    text.includes("what should i fix")
  ) {
    return "document-readiness";
  }

  if (
    text.includes("most important thing") ||
    text.includes("clarify next") ||
    text.includes("what should i clarify") ||
    text.includes("next question")
  ) {
    return "next-clarification";
  }

  return "general";
}

function countUserMessages(
  conversation: CasePartnerConversationMessage[],
): number {
  return conversation.filter(
    (message) =>
      (message as any)?.role === "user" &&
      hasText((message as any)?.content),
  ).length;
}

function isFirstMeaningfulTurn(
  conversation: CasePartnerConversationMessage[],
): boolean {
  return countUserMessages(conversation) <= 1;
}

function getPreviousAssistantText(
  conversation: CasePartnerConversationMessage[],
): string {
  return conversation
    .filter(
      (message) =>
        (message as any)?.role === "assistant" &&
        hasText((message as any)?.content),
    )
    .map((message) => clean((message as any).content))
    .join("\n\n");
}

function paragraphAlreadyUsed(
  paragraph: string,
  previousAssistantText: string,
): boolean {
  const paragraphKey = normalize(paragraph);
  const previousKey = normalize(previousAssistantText);

  if (!paragraphKey || !previousKey) {
    return false;
  }

  return previousKey.includes(paragraphKey);
}

function deduplicateParagraphs(
  paragraphs: string[],
  previousAssistantText: string,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const paragraph of paragraphs) {
    const text = clean(paragraph);
    const key = normalize(text);

    if (!text || !key || seen.has(key)) {
      continue;
    }

    if (paragraphAlreadyUsed(text, previousAssistantText)) {
      continue;
    }

    seen.add(key);
    result.push(text);
  }

  return result;
}

function formatList(
  heading: string,
  values: string[],
  maximum = 4,
): string {
  const items = uniqueStrings(values).slice(0, maximum);

  if (items.length === 0) {
    return "";
  }

  return [
    heading,
    ...items.map((item, index) => `${index + 1}. ${item}`),
  ].join("\n");
}

function buildWarmOpening(
  intelligence: ReturnType<typeof buildConversationIntelligence>,
): string {
  const issue =
    intelligence.hypotheses?.[0]?.label ||
    intelligence.legalSignals?.[0]?.label ||
    "";

  const normalizedIssue = normalize(issue);

  if (normalizedIssue.includes("defamation")) {
    return "I’m sorry you’re dealing with that. Let’s organize the exact words, who received them, what proof exists, and what harm followed.";
  }

  if (
    normalizedIssue.includes("family") ||
    normalizedIssue.includes("parenting") ||
    normalizedIssue.includes("support")
  ) {
    return "Family matters can become overwhelming quickly. Let’s organize the current arrangements, any existing orders, the important dates, and the records that support what you are saying.";
  }

  if (
    normalizedIssue.includes("contract") ||
    normalizedIssue.includes("payment") ||
    normalizedIssue.includes("debt")
  ) {
    return "Let’s organize the agreement, what each side was expected to do, what went wrong, the proof, and the outcome you are seeking.";
  }

  if (normalizedIssue.includes("property damage")) {
    return "Let’s organize what was damaged, how it happened, who may be responsible, and the records showing the repair cost or loss.";
  }

  if (
    normalizedIssue.includes("public") ||
    normalizedIssue.includes("crown") ||
    normalizedIssue.includes("police")
  ) {
    return "This needs careful fact organization because the specific actor, decision, record, legal authority, and resulting harm may all matter.";
  }

  return "I’ll help organize what happened into a clear case record, identify missing information, and focus on the next useful question.";
}

function buildLegalExplanation(args: {
  intelligence: ReturnType<typeof buildConversationIntelligence>;
  legalReasoning: CoordinatedReasoningPackage;
}): string {
  const hypothesis = args.intelligence.hypotheses?.[0];
  const signal = args.intelligence.legalSignals?.[0];

  const burden = firstItem(
    args.legalReasoning.reasoningSummary.burdenPriorities,
  );

  const judicialConcern = firstItem(
    args.legalReasoning.reasoningSummary.judicialConcerns,
  );

  if (hasText(burden) && hasText(judicialConcern)) {
    return `The main proof issue currently identified is: ${burden}. A related court concern is: ${judicialConcern}`;
  }

  if (!hypothesis && !signal) {
    return "There is not enough information yet to identify the legal issue confidently. The next step is to confirm the court path, important facts, proof, and requested outcome.";
  }

  const label =
    hypothesis?.label ||
    signal?.label ||
    "possible legal issue";

  const normalizedLabel = normalize(label);

  if (normalizedLabel.includes("defamation")) {
    return "A possible defamation issue usually turns on the exact words, whether they referred to you, whether they were communicated to another person, the context, any resulting reputational harm, and any defence that may apply.";
  }

  if (
    normalizedLabel.includes("contract") ||
    normalizedLabel.includes("payment") ||
    normalizedLabel.includes("debt")
  ) {
    return "A contract or payment dispute usually turns on the agreement, each side’s obligations, the alleged breach, supporting records, and the resulting loss.";
  }

  if (normalizedLabel.includes("property damage")) {
    return "A property-damage issue usually turns on causation, responsibility, photographs or records, repair estimates, invoices, and proof of the amount claimed.";
  }

  if (
    normalizedLabel.includes("family") ||
    normalizedLabel.includes("parenting") ||
    normalizedLabel.includes("support")
  ) {
    return "A family matter usually requires child-focused facts where applicable, current arrangements, existing orders, payment or disclosure records, and evidence supporting the requested outcome.";
  }

  if (
    normalizedLabel.includes("public") ||
    normalizedLabel.includes("crown") ||
    normalizedLabel.includes("police")
  ) {
    return "A public-authority issue usually requires the exact actor, conduct, decision, governing power or duty, available record, procedural requirements, and provable harm.";
  }

  return `The current working issue is: ${label}. This remains a preliminary classification until the missing facts and proof are confirmed.`;
}

function buildEvidenceAnswer(args: {
  intelligence: ReturnType<typeof buildConversationIntelligence>;
  legalReasoning: CoordinatedReasoningPackage;
  investigation: ReturnType<typeof buildCaseInvestigation>;
}): string {
  const evidenceNeeds = uniqueStrings([
    ...(args.investigation.evidenceNeeded || []).map(
      (item: any) => item?.label,
    ),
    ...(args.legalReasoning.reasoningSummary.evidencePriorities || []),
    ...(args.intelligence.caseMemoryPatch.evidenceToRequest || []),
  ]);

  if (evidenceNeeds.length === 0) {
    return "No case-specific evidence gap has been identified yet. Start by listing the documents, messages, photographs, recordings, receipts, witnesses, and court records you already have.";
  }

  return formatList(
    "The most important evidence gaps currently identified are:",
    evidenceNeeds,
    5,
  );
}

function buildLegalIssuesAnswer(args: {
  intelligence: ReturnType<typeof buildConversationIntelligence>;
  investigation: ReturnType<typeof buildCaseInvestigation>;
  legalReasoning: CoordinatedReasoningPackage;
}): string {
  const issues = uniqueStrings([
    ...(args.investigation.issues || []).map(
      (issue: any) => issue?.label,
    ),
    ...(args.intelligence.legalSignals || []).map(
      (signal) => signal.label,
    ),
    ...(args.intelligence.hypotheses || []).map(
      (hypothesis) => hypothesis.label,
    ),
    ...(args.legalReasoning.reasoningSummary.primaryDomains || []),
  ]);

  if (issues.length === 0) {
    return "The legal issues cannot be classified confidently yet. More information is needed about what happened, where it happened, who was involved, and the outcome being requested.";
  }

  return formatList(
    "These are the main issues currently flagged for review:",
    issues,
    5,
  );
}

function buildJudgeConcernsAnswer(args: {
  investigation: ReturnType<typeof buildCaseInvestigation>;
  legalReasoning: CoordinatedReasoningPackage;
}): string {
  const concerns = uniqueStrings([
    ...(args.legalReasoning.reasoningSummary.judicialConcerns || []),
    ...(args.investigation.judgeConcerns || []),
  ]);

  if (concerns.length === 0) {
    return "No specific judicial concern has been identified yet. A court will usually want a clear timeline, reliable evidence, a defined legal basis, and a precise explanation of the requested remedy.";
  }

  return formatList(
    "A court may focus on these concerns:",
    concerns,
    5,
  );
}

function buildDocumentReadinessAnswer(args: {
  intelligence: ReturnType<typeof buildConversationIntelligence>;
  investigation: ReturnType<typeof buildCaseInvestigation>;
  legalReasoning: CoordinatedReasoningPackage;
}): string {
  const readinessIssues = uniqueStrings([
    ...(args.investigation.missingInformation || []).map(
      (item) => `Confirm: ${item}`,
    ),
    ...(args.investigation.evidenceNeeded || []).map(
      (item: any) => `Identify or collect: ${item?.label}`,
    ),
    ...(args.legalReasoning.reasoningSummary.proceduralWatchPoints || []).map(
      (item) => `Check procedure: ${item}`,
    ),
  ]);

  if (readinessIssues.length === 0) {
    return "No specific blocker has been identified, but all names, dates, allegations, requested remedies, exhibits, court information, and filing requirements should still be verified before generating final documents.";
  }

  return formatList(
    "Before generating documents, address these items:",
    readinessIssues,
    6,
  );
}

function buildBestQuestion(args: {
  intelligence: ReturnType<typeof buildConversationIntelligence>;
  legalReasoning: CoordinatedReasoningPackage;
}): string {
  const selectedQuestion =
    args.intelligence.selectedNextQuestion;

  if (selectedQuestion?.question) {
    const reason = clean(selectedQuestion.reason);

    return reason
      ? `${selectedQuestion.question}\n\nWhy this matters: ${reason}`
      : selectedQuestion.question;
  }

  const reasoningQuestion = firstItem(
    args.legalReasoning.reasoningSummary.firstQuestions,
  );

  if (hasText(reasoningQuestion)) {
    return reasoningQuestion;
  }

  return "What are the main dates, what proof do you currently have, and what outcome are you seeking?";
}

function buildCaution(
  investigation: ReturnType<typeof buildCaseInvestigation>,
): string {
  const warnings = uniqueStrings(
    investigation.validation?.warnings || [],
  );

  const jurisdictionWarning = warnings.find((warning) =>
    normalize(warning).includes("jurisdiction"),
  );

  if (jurisdictionWarning) {
    return "The province or jurisdiction must be confirmed before relying on any deadline, form, filing, or court-procedure information.";
  }

  const firstWarning = firstItem(warnings);

  if (!hasText(firstWarning)) {
    return "";
  }

  return `Important limitation: ${firstWarning}`;
}

function buildDirectAnswer(args: {
  intent: ResponseIntent;
  intelligence: ReturnType<typeof buildConversationIntelligence>;
  legalReasoning: CoordinatedReasoningPackage;
  investigation: ReturnType<typeof buildCaseInvestigation>;
}): string {
  switch (args.intent) {
    case "evidence":
      return buildEvidenceAnswer(args);

    case "legal-issues":
      return buildLegalIssuesAnswer(args);

    case "judge-concerns":
      return buildJudgeConcernsAnswer(args);

    case "document-readiness":
      return buildDocumentReadinessAnswer(args);

    case "next-clarification":
      return buildBestQuestion(args);

    default:
      return "";
  }
}

function buildGeneralAnswer(args: {
  firstTurn: boolean;
  intelligence: ReturnType<typeof buildConversationIntelligence>;
  legalReasoning: CoordinatedReasoningPackage;
  investigation: ReturnType<typeof buildCaseInvestigation>;
  previousAssistantText: string;
}): string {
  const paragraphs: string[] = [];

  if (args.firstTurn) {
    paragraphs.push(buildWarmOpening(args.intelligence));
    paragraphs.push(
      buildLegalExplanation({
        intelligence: args.intelligence,
        legalReasoning: args.legalReasoning,
      }),
    );
  } else {
    const newlyAddedFacts =
      args.intelligence.caseMemoryPatch.factsToAdd || [];

    const newlyIdentifiedIssues =
      args.intelligence.caseMemoryPatch.legalIssuesToReview || [];

    if (newlyAddedFacts.length > 0) {
      paragraphs.push(
        `I’ve added the new information to the case record: ${uniqueStrings(
          newlyAddedFacts,
        )
          .slice(0, 3)
          .join("; ")}`,
      );
    }

    if (newlyIdentifiedIssues.length > 0) {
      paragraphs.push(
        `The new information may affect these issues: ${uniqueStrings(
          newlyIdentifiedIssues,
        )
          .slice(0, 3)
          .join("; ")}`,
      );
    }

    if (
      newlyAddedFacts.length === 0 &&
      newlyIdentifiedIssues.length === 0
    ) {
      paragraphs.push(
        "I’ve added that response to the case record.",
      );
    }
  }

  const caution = buildCaution(args.investigation);

  if (args.firstTurn && hasText(caution)) {
    paragraphs.push(caution);
  }

  paragraphs.push(
    buildBestQuestion({
      intelligence: args.intelligence,
      legalReasoning: args.legalReasoning,
    }),
  );

  return deduplicateParagraphs(
    paragraphs,
    args.previousAssistantText,
  )
    .join("\n\n")
    .trim();
}

function buildAnswer(args: {
  message: string;
  conversation: CasePartnerConversationMessage[];
  intelligence: ReturnType<typeof buildConversationIntelligence>;
  legalReasoning: CoordinatedReasoningPackage;
  investigation: ReturnType<typeof buildCaseInvestigation>;
}): string {
  const intent = detectResponseIntent(args.message);
  const firstTurn = isFirstMeaningfulTurn(args.conversation);
  const previousAssistantText = getPreviousAssistantText(
    args.conversation,
  );

  if (intent !== "general") {
    const directAnswer = buildDirectAnswer({
      intent,
      intelligence: args.intelligence,
      legalReasoning: args.legalReasoning,
      investigation: args.investigation,
    });

    return (
      deduplicateParagraphs(
        [directAnswer],
        previousAssistantText,
      ).join("\n\n") ||
      directAnswer ||
      "More case information is needed before this can be answered reliably."
    );
  }

  return buildGeneralAnswer({
    firstTurn,
    intelligence: args.intelligence,
    legalReasoning: args.legalReasoning,
    investigation: args.investigation,
    previousAssistantText,
  });
}

export function runAiCasePartnerOrchestrator(
  input: AiCasePartnerOrchestratorInput,
): AiCasePartnerOrchestratorResult {
  const diagnosticId =
    clean(input.diagnosticId) || createDiagnosticId();

  const totalStartedAt = Date.now();
  const stageDiagnostics: AiCasePartnerStageDiagnostic[] = [];

  const message = clean(input.message);
  const conversation = input.conversation || [];

  const inputMetrics = {
    messageCharacters: message.length,
    conversationMessages: conversation.length,
    conversationCharacters: conversation.reduce(
      (total, item) => total + clean((item as any)?.content).length,
      0,
    ),
    caseMemoryBytes: estimateJsonSize(input.caseMemory),
  };

  const conversationIntelligence = runDiagnosticStage({
    stage: "conversation-intelligence",
    diagnosticId,
    diagnostics: stageDiagnostics,
    operation: () =>
      buildConversationIntelligence({
        message,
        conversation,
        caseMemory: input.caseMemory,
        mode: input.mode,
      }),
  });

  const legalDomains = runDiagnosticStage({
    stage: "legal-domain-detection",
    diagnosticId,
    diagnostics: stageDiagnostics,
    operation: () => detectLegalDomains(conversationIntelligence),
  });

  const legalReasoning = runDiagnosticStage({
    stage: "legal-reasoning",
    diagnosticId,
    diagnostics: stageDiagnostics,
    operation: () =>
      buildLegalReasoningCoordinator({
        courtPath:
          conversationIntelligence.conversationFocus.courtArea === "mixed"
            ? "unknown"
            : conversationIntelligence.conversationFocus.courtArea,
        jurisdiction: "Unknown",
        stage: "not-sure",
        legalDomains,
        knowledgeObjects: DOCTRINE_SEED_LIBRARY,
        mode: "operational",
      }),
  });

  const conversationMemory = runDiagnosticStage({
    stage: "conversation-memory",
    diagnosticId,
    diagnostics: stageDiagnostics,
    operation: () =>
      buildConversationMemory({
        caseId: input.caseId,
        existingMemory: input.caseMemory,
        message,
        conversation,
        intelligence: conversationIntelligence,
      }),
  });

  const caseInvestigation = runDiagnosticStage({
    stage: "case-investigation",
    diagnosticId,
    diagnostics: stageDiagnostics,
    operation: () =>
      buildCaseInvestigation({
        caseId: input.caseId,
        message,
        intelligence: conversationIntelligence,
        memory: conversationMemory,
        legalReasoning,
      }),
  });

  const userFacingAnswer = runDiagnosticStage({
    stage: "response-construction",
    diagnosticId,
    diagnostics: stageDiagnostics,
    operation: () =>
      buildAnswer({
        message,
        conversation,
        intelligence: conversationIntelligence,
        legalReasoning,
        investigation: caseInvestigation,
      }),
  });

  const diagnostics: AiCasePartnerOrchestratorDiagnostics = {
    diagnosticId,
    totalDurationMs: Date.now() - totalStartedAt,
    inputMetrics,
    stages: stageDiagnostics,
  };

  console.info("AI Case Partner orchestrator completed", diagnostics);

  return {
    version: "1.4.0",
    generatedAt: nowIso(),
    ok: true,

    userFacingAnswer,
    answer: userFacingAnswer,

    conversationIntelligence,
    legalReasoning,
    conversationMemory,
    caseInvestigation,

    caseMemory: conversationMemory.memory,

    diagnostics,

    result: {
      conversationIntelligence,
      legalReasoning,
      conversationMemory,
      caseInvestigation,
    },
  };
}