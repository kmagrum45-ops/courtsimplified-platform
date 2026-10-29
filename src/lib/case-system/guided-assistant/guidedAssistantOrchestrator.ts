import { internalWordingIn } from "../copy/rawKeys";
import { answeredInStory, caseFileOfChat } from "./answeredInStory";
import { chatMayAsk, type CaseFile } from "../caseFile/caseFile";
import {
  buildConversationIntelligence,
  CasePartnerCourtContext,
  CasePartnerConversationMessage,
} from "./conversationIntelligenceEngine";

import { sentenceFromRecord, userStory } from "../userStory";
import { sentences as splitSentences } from "../sentences";
import { buildConversationMemory } from "./conversationMemoryEngine";

import { buildCaseInvestigation } from "./caseInvestigationEngine";

import {
  buildLegalReasoningCoordinator,
  CoordinatedReasoningPackage,
} from "../knowledge/legalReasoningCoordinator";

import { DOCTRINE_SEED_LIBRARY } from "../knowledge/doctrineSeedLibrary";

import { assistantText } from "../../content-library/renderAssistantBlock";

/*
 * Every object in DOCTRINE_SEED_LIBRARY carries verificationStatus
 * "not-verified". Read from the library rather than hard-coded, so that
 * verifying an object is what changes this -- not an edit here.
 */
const DOCTRINE_VERIFICATION_STATUS =
  DOCTRINE_SEED_LIBRARY.every((entry) => entry.source.verificationStatus === "verified")
    ? "approved"
    : "not-verified";

import {
  CaseCourtPath,
  CaseLegalDomain,
  CaseProvince,
  CaseStage,
} from "../architecture/masterCaseSchema";

export type GuidedAssistantOrchestratorVersion = "1.5.0";

export type GuidedAssistantCourtContextInput = {
  courtPath?: string;
  jurisdiction?: string;
  city?: string;
  stage?: string;
};

export type GuidedAssistantResolvedCourtContext = {
  courtPath: CaseCourtPath;
  jurisdiction: CaseProvince | "Canada";
  city?: string;
  stage: CaseStage;
};

export type GuidedAssistantOrchestratorInput = {
  caseId?: string;
  message: string;
  conversation?: CasePartnerConversationMessage[];
  caseMemory?: unknown;
  courtContext?: GuidedAssistantCourtContextInput;
  mode?: string;
  diagnosticId?: string;
};

export type GuidedAssistantDiagnosticStage =
  | "conversation-intelligence"
  | "legal-domain-detection"
  | "legal-reasoning"
  | "conversation-memory"
  | "case-investigation"
  | "response-construction";

export type GuidedAssistantStageDiagnostic = {
  stage: GuidedAssistantDiagnosticStage;
  ok: true;
  durationMs: number;
  outputBytes: number;
};

export type GuidedAssistantOrchestratorDiagnostics = {
  diagnosticId: string;
  totalDurationMs: number;
  inputMetrics: {
    messageCharacters: number;
    conversationMessages: number;
    conversationCharacters: number;
    caseMemoryBytes: number;
  };
  stages: GuidedAssistantStageDiagnostic[];
};

export type GuidedAssistantOrchestratorResult = {
  version: GuidedAssistantOrchestratorVersion;
  generatedAt: string;
  ok: true;

  userFacingAnswer: string;
  answer: string;

  courtContext: GuidedAssistantResolvedCourtContext;

  conversationIntelligence: ReturnType<typeof buildConversationIntelligence>;
  legalReasoning: CoordinatedReasoningPackage;
  conversationMemory: ReturnType<typeof buildConversationMemory>;
  caseInvestigation: ReturnType<typeof buildCaseInvestigation>;

  caseMemory: ReturnType<typeof buildConversationMemory>["memory"];

  diagnostics: GuidedAssistantOrchestratorDiagnostics;

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
  | "document-readiness"
  | "next-clarification"
  | "general";


type OrchestratorStageError = Error & {
  stage?: GuidedAssistantDiagnosticStage;
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
  stage: GuidedAssistantDiagnosticStage;
  diagnosticId: string;
}): OrchestratorStageError {
  const original =
    args.error instanceof Error
      ? args.error
      : new Error(String(args.error));

  const stageError = new Error(
    original.message ||
      `guided assistant failed during ${args.stage}.`,
  ) as OrchestratorStageError;

  stageError.name = "GuidedAssistantOrchestratorStageError";
  stageError.stage = args.stage;
  stageError.diagnosticId = args.diagnosticId;
  stageError.cause = original;
  stageError.stack = original.stack || stageError.stack;

  return stageError;
}

function runDiagnosticStage<T>(args: {
  stage: GuidedAssistantDiagnosticStage;
  diagnosticId: string;
  diagnostics: GuidedAssistantStageDiagnostic[];
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
    console.error("guided assistant orchestrator stage failed", {
      diagnosticId: args.diagnosticId,
      stage: args.stage,
      durationMs: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : "UnknownError",
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

function normalizeKey(value: unknown): string {
  return normalize(value).replace(/_/g, "-");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getNestedValue(value: unknown, path: string[]): unknown {
  let current: unknown = value;

  for (const key of path) {
    const record = asRecord(current);

    if (!(key in record)) {
      return undefined;
    }

    current = record[key];
  }

  return current;
}

function asCourtPath(value: unknown): CaseCourtPath {
  const normalized = normalizeKey(value);

  if (normalized === "smallclaims" || normalized === "small-claim") {
    return "small-claims";
  }

  if (normalized === "criminal") {
    return "criminal-related";
  }

  if (normalized === "landlord-tenant") {
    return "ltb";
  }

  if (
    normalized === "family" ||
    normalized === "small-claims" ||
    normalized === "civil" ||
    normalized === "tribunal" ||
    normalized === "ltb" ||
    normalized === "immigration" ||
    normalized === "criminal-related"
  ) {
    return normalized;
  }

  return "unknown";
}

function firstCourtPath(values: unknown[]): CaseCourtPath {
  for (const value of values) {
    const courtPath = asCourtPath(value);

    if (courtPath !== "unknown") {
      return courtPath;
    }
  }

  return "unknown";
}

function asJurisdiction(value: unknown): CaseProvince | "Canada" {
  const jurisdictions: Record<string, CaseProvince | "Canada"> = {
    ontario: "Ontario",
    alberta: "Alberta",
    "british columbia": "British Columbia",
    manitoba: "Manitoba",
    "new brunswick": "New Brunswick",
    "newfoundland and labrador": "Newfoundland and Labrador",
    "northwest territories": "Northwest Territories",
    "nova scotia": "Nova Scotia",
    nunavut: "Nunavut",
    "prince edward island": "Prince Edward Island",
    quebec: "Quebec",
    saskatchewan: "Saskatchewan",
    yukon: "Yukon",
    federal: "Federal",
    canada: "Canada",
  };

  return jurisdictions[normalize(value)] || "Unknown";
}

function firstJurisdiction(
  values: unknown[],
): CaseProvince | "Canada" {
  for (const value of values) {
    const jurisdiction = asJurisdiction(value);

    if (jurisdiction !== "Unknown") {
      return jurisdiction;
    }
  }

  return "Unknown";
}

function asCaseStage(value: unknown): CaseStage {
  const normalized = normalizeKey(value);

  if (normalized === "not-started") return "pre-litigation";
  if (normalized === "already-filed") return "already-started";
  if (normalized === "trial-preparation") return "trial";
  if (normalized === "appeal-or-review") return "appeal";
  if (normalized === "disclosure") return "already-started";

  if (
    normalized === "pre-litigation" ||
    normalized === "starting-case" ||
    normalized === "responding" ||
    normalized === "already-started" ||
    normalized === "conference" ||
    normalized === "motion" ||
    normalized === "trial" ||
    normalized === "settlement" ||
    normalized === "enforcement" ||
    normalized === "appeal" ||
    normalized === "urgent" ||
    normalized === "closed"
  ) {
    return normalized;
  }

  return "not-sure";
}

function firstCaseStage(values: unknown[]): CaseStage {
  for (const value of values) {
    const stage = asCaseStage(value);

    if (stage !== "not-sure") {
      return stage;
    }
  }

  return "not-sure";
}

function toConversationCourtPath(
  courtPath: CaseCourtPath,
): CasePartnerCourtContext["courtPath"] {
  return courtPath === "tribunal" ? "unknown" : courtPath;
}

function toConversationStage(
  stage: CaseStage,
): CasePartnerCourtContext["proceduralStage"] {
  if (stage === "pre-litigation") return "not-started";
  if (stage === "already-started") return "already-filed";
  if (stage === "appeal") return "appeal-or-review";
  if (stage === "closed") return "unknown";

  return stage;
}

function resolveStructuredCourtContext(
  input: GuidedAssistantOrchestratorInput,
): GuidedAssistantResolvedCourtContext {
  const memory = input.caseMemory;

  return {
    courtPath: firstCourtPath([
      input.courtContext?.courtPath,
      getNestedValue(memory, ["masterResult", "masterCase", "courtPath"]),
      getNestedValue(memory, ["masterCase", "courtPath"]),
      getNestedValue(memory, [
        "caseData",
        "intake",
        "masterResultPatch",
        "masterCase",
        "courtPath",
      ]),
      getNestedValue(memory, ["caseData", "courtPath"]),
      getNestedValue(memory, [
        "caseData",
        "analysis",
        "intelligence",
        "proceduralPosture",
        "courtPath",
      ]),
      getNestedValue(memory, ["caseData", "intake", "courtPath"]),
      getNestedValue(memory, ["path"]),
      getNestedValue(memory, ["selectedCourtArea"]),
      getNestedValue(memory, ["courtArea"]),
    ]),
    jurisdiction: firstJurisdiction([
      input.courtContext?.jurisdiction,
      getNestedValue(memory, ["masterResult", "masterCase", "province"]),
      getNestedValue(memory, ["masterCase", "province"]),
      getNestedValue(memory, [
        "caseData",
        "intake",
        "masterResultPatch",
        "masterCase",
        "province",
      ]),
      getNestedValue(memory, [
        "caseData",
        "analysis",
        "intelligence",
        "proceduralPosture",
        "province",
      ]),
      getNestedValue(memory, [
        "caseData",
        "intake",
        "intelligence",
        "proceduralPosture",
        "province",
      ]),
      getNestedValue(memory, [
        "caseData",
        "intake",
        "extra",
        "input",
        "yourProvince",
      ]),
      getNestedValue(memory, ["jurisdiction"]),
    ]),
    city:
      clean(input.courtContext?.city) ||
      clean(getNestedValue(memory, ["caseData", "intake", "extra", "yourCity"])) ||
      clean(getNestedValue(memory, ["caseData", "intake", "yourCity"])) ||
      undefined,
    stage: firstCaseStage([
      input.courtContext?.stage,
      getNestedValue(memory, ["masterResult", "masterCase", "stage"]),
      getNestedValue(memory, ["masterCase", "stage"]),
      getNestedValue(memory, [
        "caseData",
        "intake",
        "masterResultPatch",
        "masterCase",
        "stage",
      ]),
      getNestedValue(memory, [
        "caseData",
        "analysis",
        "intelligence",
        "proceduralPosture",
        "stage",
      ]),
      getNestedValue(memory, ["caseData", "intake", "caseStage"]),
      getNestedValue(memory, ["proceduralStage"]),
    ]),
  };
}

function resolveFinalCourtContext(args: {
  input: GuidedAssistantOrchestratorInput;
  structured: GuidedAssistantResolvedCourtContext;
  intelligence: ReturnType<typeof buildConversationIntelligence>;
}): GuidedAssistantResolvedCourtContext {
  return {
    courtPath: firstCourtPath([
      args.structured.courtPath,
      args.intelligence.conversationFocus.selectedCourtArea,
      args.intelligence.conversationFocus.courtArea,
      getNestedValue(args.input.caseMemory, ["selectedCourtArea"]),
      getNestedValue(args.input.caseMemory, ["courtArea"]),
    ]),
    jurisdiction: firstJurisdiction([
      args.structured.jurisdiction,
      args.intelligence.conversationFocus.jurisdiction,
      getNestedValue(args.input.caseMemory, ["jurisdiction"]),
    ]),
    city: args.structured.city,
    stage: firstCaseStage([
      args.structured.stage,
      args.intelligence.conversationFocus.proceduralStage,
      getNestedValue(args.input.caseMemory, ["proceduralStage"]),
    ]),
  };
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
  const hypothesisText = intelligence.hypotheses
    .map((item) => item.label)
    .join(" ")
    .toLowerCase();
  const signalText = [
    ...intelligence.legalSignals.map((item) => item.label),
    ...intelligence.legalSignals.map((item) => item.explanation),
  ]
    .join(" ")
    .toLowerCase();

  const domains: CaseLegalDomain[] = [];

  if (
    hypothesisText.includes("defamation") ||
    hypothesisText.includes("reputation")
  ) {
    domains.push("defamation");
  }

  if (hypothesisText.includes("contract / payment dispute")) {
    domains.push("contract");
  }

  if (
    hypothesisText.includes("payment") ||
    hypothesisText.includes("debt") ||
    hypothesisText.includes("owed")
  ) {
    domains.push("debt");
  }

  if (
    hypothesisText.includes("property damage") ||
    hypothesisText.includes("damaged")
  ) {
    domains.push("property-damage");
  }

  if (hypothesisText.includes("negligence")) {
    domains.push("negligence");
  }

  if (
    hypothesisText.includes("family") ||
    hypothesisText.includes("parenting") ||
    hypothesisText.includes("custody")
  ) {
    domains.push("family-parenting");
  }

  if (hypothesisText.includes("support")) {
    domains.push("family-support");
  }

  if (
    hypothesisText.includes("public") ||
    hypothesisText.includes("crown") ||
    hypothesisText.includes("police") ||
    hypothesisText.includes("government") ||
    hypothesisText.includes("institutional")
  ) {
    domains.push("civil-institutional-liability");
  }

  if (hypothesisText.includes("charter")) {
    domains.push("civil-charter");
  }

  if (
    signalText.includes("procedure") ||
    signalText.includes("court") ||
    signalText.includes("form")
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
    text.includes("evidence do i need") ||
    // Everyday wording of the same question (#468 re-test: "What should I gather
    // first?" got the general reply).
    /\b(gather|collect|evidence|proof|documents? (do|should) i|what (do|should) i (need|bring|keep))\b/.test(text)
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
    return assistantText("assistant:opening:defamation");
  }

  if (
    normalizedIssue.includes("family") ||
    normalizedIssue.includes("parenting") ||
    normalizedIssue.includes("support")
  ) {
    return assistantText("assistant:opening:family");
  }

  if (
    normalizedIssue.includes("contract") ||
    normalizedIssue.includes("payment") ||
    normalizedIssue.includes("debt")
  ) {
    return assistantText("assistant:opening:contract");
  }

  if (normalizedIssue.includes("property damage")) {
    return assistantText("assistant:opening:property-damage");
  }

  if (
    normalizedIssue.includes("public") ||
    normalizedIssue.includes("crown") ||
    normalizedIssue.includes("police")
  ) {
    return assistantText("assistant:opening:public-authority");
  }

  return assistantText("assistant:opening:generic");
}

function buildLegalExplanation(args: {
  intelligence: ReturnType<typeof buildConversationIntelligence>;
  legalReasoning: CoordinatedReasoningPackage;
  /** The case's court came from its confirmed intake (the route only answers for one). */
  courtConfirmed?: boolean;
}): string {
  // With the court already confirmed, "confirm the court path" is not the next step:
  // nothing is said rather than that (L47: Family's first reply was this generic line).
  const unknown = () => (args.courtConfirmed ? "" : assistantText("assistant:explain:unknown"));
  const hypothesis = args.intelligence.hypotheses?.[0];
  const signal = args.intelligence.legalSignals?.[0];

  const burden = firstItem(
    args.legalReasoning.reasoningSummary.burdenPriorities,
  );

  /*
   * The burden priority comes from doctrineSeedLibrary, every object of which
   * is marked verificationStatus "not-verified". The block is gated on that
   * status, so today this renders nothing and the caller falls through to the
   * explanation below. See renderAssistantBlock.
   */
  if (hasText(burden)) {
    const rendered = assistantText(
      "assistant:explain:burden",
      { burden },
      DOCTRINE_VERIFICATION_STATUS,
    );
    if (rendered) return rendered;
  }

  if (!hypothesis && !signal) {
    return unknown();
  }

  const label =
    hypothesis?.label ||
    signal?.label ||
    "possible legal issue";

  const normalizedLabel = normalize(label);

  if (normalizedLabel.includes("defamation")) {
    return assistantText("assistant:explain:defamation") || unknown();
  }

  if (
    normalizedLabel.includes("contract") ||
    normalizedLabel.includes("payment") ||
    normalizedLabel.includes("debt")
  ) {
    return assistantText("assistant:explain:contract") || unknown();
  }

  if (normalizedLabel.includes("property damage")) {
    return assistantText("assistant:explain:property-damage") || unknown();
  }

  if (
    normalizedLabel.includes("family") ||
    normalizedLabel.includes("parenting") ||
    normalizedLabel.includes("support")
  ) {
    return assistantText("assistant:explain:family") || unknown();
  }

  if (
    normalizedLabel.includes("public") ||
    normalizedLabel.includes("crown") ||
    normalizedLabel.includes("police")
  ) {
    return assistantText("assistant:explain:public-authority") || unknown();
  }

  return assistantText("assistant:explain:working-issue", { label });
}

function buildEvidenceAnswer(args: {
  intelligence: ReturnType<typeof buildConversationIntelligence>;
  legalReasoning: CoordinatedReasoningPackage;
  investigation: ReturnType<typeof buildCaseInvestigation>;
  recorded?: string[];
}): string {
  // What the person already said they have, in their own words (#469 re-test: the
  // reply asked what proof they had when the story listed it).
  const recorded = args.recorded ?? [];
  const opening = recorded.length ? assistantText("assistant:evidence:recorded", { items: recorded.map((item) => `\u201C${item}\u201D`).join(" ") }) : "";
  const evidenceNeeds = uniqueStrings([
    ...(args.investigation.evidenceNeeded || []).map(
      (item: any) => item?.label,
    ),
    ...(args.legalReasoning.reasoningSummary.evidencePriorities || []),
    ...(args.intelligence.caseMemoryPatch.evidenceToRequest || []),
  ]);

  // Once something is recorded, "what proof do you already have" is not asked again.
  const stillNeeded = recorded.length ? evidenceNeeds.filter((need) => !/^what proof do you already have/i.test(clean(need))) : evidenceNeeds;

  if (stillNeeded.length === 0) {
    return opening || assistantText("assistant:evidence:none");
  }

  const list = formatList(
    assistantText("assistant:evidence:heading"),
    stillNeeded,
    5,
  );
  return opening ? `${opening}\n\n${list}` : list;
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
    // The reasoning domains are codes, never listed (reviewer, 26 Oct: "civil-institutional-liability", "unknown").
  ]).filter((label) => label !== "unknown" && internalWordingIn(String(label ?? "")).length === 0);

  if (issues.length === 0) {
    return assistantText("assistant:issues:none");
  }

  return formatList(
    assistantText("assistant:issues:heading"),
    issues,
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
    return assistantText("assistant:readiness:none");
  }

  return formatList(
    assistantText("assistant:readiness:heading"),
    readinessIssues,
    6,
  );
}

function buildBestQuestion(args: {
  intelligence: ReturnType<typeof buildConversationIntelligence>;
  legalReasoning: CoordinatedReasoningPackage;
  /** The saved story: a question it answers is not asked (answeredInStory.ts). */
  knownStory?: string;
  /** The saved case file: the chat asks no fact it holds (caseFile.ts chatMayAsk). */
  caseFile?: CaseFile | null;
}): string {
  const selectedQuestion =
    args.intelligence.selectedNextQuestion;

  if (selectedQuestion?.question) {
    const reason = clean(selectedQuestion.reason);

    return reason
      ? assistantText("assistant:question:selected", {
          question: selectedQuestion.question,
          reason,
        })
      : assistantText("assistant:question:plain", {
          question: selectedQuestion.question,
        });
  }

  const reasoningQuestion = firstItem(
    args.legalReasoning.reasoningSummary.firstQuestions.filter((question) => !answeredInStory(question, args.knownStory ?? "", args.caseFile ?? null)),
  );

  if (hasText(reasoningQuestion)) {
    return assistantText("assistant:question:plain", { question: reasoningQuestion });
  }

  // Only the parts the case does not already hold: the dates (the message, the saved story or the
  // case file), the proof (dropped by the caller once evidence is named), what they want.
  const datesKnown = args.intelligence.extractedFacts.some((fact) => fact.category === "date" && fact.confidence !== "low") || !chatMayAsk(args.caseFile, "chat:main-dates");
  return [
    datesKnown ? null : assistantText("assistant:question:part-dates"),
    assistantText("assistant:question:part-proof"),
    chatMayAsk(args.caseFile, "chat:outcome") ? assistantText("assistant:question:part-outcome") : null,
  ].filter(Boolean).join(" ");
}

function buildCaution(
  investigation: ReturnType<typeof buildCaseInvestigation>,
  /** The case's court, in Ontario, came from its confirmed intake (#468 re-test). */
  courtConfirmed = false,
): string {
  const warnings = uniqueStrings(
    investigation.validation?.warnings || [],
  );

  const jurisdictionWarning = warnings.find((warning) =>
    normalize(warning).includes("jurisdiction"),
  );

  // "The province ... must be confirmed" is not true of a confirmed Ontario case.
  if (jurisdictionWarning && !courtConfirmed) return assistantText("assistant:caution:jurisdiction");

  // The other warnings are the engine's notes to itself ("Knowledge retrieval
  // warning: procedural stage is uncertain", a doctrine seed "must not be cited
  // until verification is complete"). Shown as "Important limitation: ..." they
  // answered nothing the person asked (#468 re-test). Never shown.
  return "";
}

/**
 * Evidence the person already named, in their own words: their answer to the
 * evidence question, and up to two sentences of their story that mention it.
 */
/** The person's own saved story (never the labelled record), for what is already known. */
function savedStoryOf(caseMemory: unknown): string {
  const caseData = getNestedValue(caseMemory, ["caseData"]);
  const own = getNestedValue(caseData, ["story"]);
  return clean(typeof own === "string" && own.trim() ? own : userStory(caseData as Parameters<typeof userStory>[0]));
}

function recordedEvidenceOf(caseMemory: unknown): string[] {
  const caseData = getNestedValue(caseMemory, ["caseData"]);
  // The person's own words, never the labelled record the analysis reads ("Court path:
  // Civil / Stage: Stage unclear / Main story: ..." was quoted back, #470 re-test).
  const answer = clean(sentenceFromRecord(clean(getNestedValue(caseData, ["evidence"]))));
  const own = getNestedValue(caseData, ["story"]);
  const story = clean(typeof own === "string" && own.trim() ? own : userStory(caseData as Parameters<typeof userStory>[0]));
  // #470 re-test: Family and Small Claims stories said "I have our tax returns" or "I have
  // my pay stubs", which this list did not know, and the reply fell back to "what proof do
  // you have". A sentence saying what the person has comes first; one that only describes
  // court papers ("I was served with a Statement of Claim") is not their evidence.
  const EVIDENCE = /\b(text messages?|texts|messages?|emails?|receipts?|invoices?|contracts?|agreements?|leases?|guarantees?|photos?|pictures?|screenshots?|recordings?|videos?|witness(?:es)?|letters?|records?|statements?|documents?|tax returns?|pay ?stubs?|estimates?|surveys?|certificates?|reports?|notes|logs?|diary|journal|calendar|job offer|offer letter|e-transfer|can confirm|will confirm|saw (?:it|what happened))\b/i;
  const HAVE = /\b(?:I|we)(?:'ve| have| still have| kept| saved| got)\b/i;
  // Court papers are not the person's evidence; a sentence is left out only when they are
  // all it names ("I was served with a Statement of Claim"), not when it also names their
  // own ("served me with an application ...; my bank statements show I paid", #471 re-test).
  const COURT_PAPERS = /\bstatement of claim\b|\bplaintiff'?s claim\b|\bstatement of defence\b|\bapplication\b|\banswer\b/gi;
  const ownEvidence = (sentence: string) => EVIDENCE.test(sentence.replace(COURT_PAPERS, " "));
  // Sentences, and lines: evidence written on its own line ("Evidence: contract, emails").
  const found = splitSentences(story).flatMap((sentence) => sentence.split(/(?<=;)\s+/)).map((sentence) => sentence.trim())
    .filter((sentence) => sentence && ownEvidence(sentence) && !sentence.endsWith("?"));
  const sentences = [...found.filter((sentence) => HAVE.test(sentence)), ...found.filter((sentence) => !HAVE.test(sentence))];
  return uniqueStrings([...(answer ? [answer] : []), ...sentences]).slice(0, 3);
}

function buildDirectAnswer(args: {
  intent: ResponseIntent;
  recorded?: string[];
  knownStory?: string;
  /** The saved case file: the chat asks no fact it holds (caseFile.ts chatMayAsk). */
  caseFile?: CaseFile | null;
  intelligence: ReturnType<typeof buildConversationIntelligence>;
  legalReasoning: CoordinatedReasoningPackage;
  investigation: ReturnType<typeof buildCaseInvestigation>;
}): string {
  switch (args.intent) {
    case "evidence":
      return buildEvidenceAnswer(args);

    case "legal-issues":
      return buildLegalIssuesAnswer(args);

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
  courtConfirmed: boolean;
  /** The message asks something (the follow-up chat looks the law up beside the reply). */
  askedQuestion: boolean;
  /** Evidence the person already named, in their own words. */
  recordedEvidence?: string[];
  knownStory?: string;
  /** The saved case file: the chat asks no fact it holds (caseFile.ts chatMayAsk). */
  caseFile?: CaseFile | null;
  intelligence: ReturnType<typeof buildConversationIntelligence>;
  legalReasoning: CoordinatedReasoningPackage;
  investigation: ReturnType<typeof buildCaseInvestigation>;
  previousAssistantText: string;
}): string {
  const paragraphs: string[] = [];

  if (args.firstTurn && !(args.askedQuestion && args.courtConfirmed)) {
    paragraphs.push(buildWarmOpening(args.intelligence));
    paragraphs.push(
      buildLegalExplanation({
        intelligence: args.intelligence,
        legalReasoning: args.legalReasoning,
        courtConfirmed: args.courtConfirmed,
      }),
    );
  } else if (args.firstTurn) {
    // A question on a confirmed case: the first line says where its answer is (the
    // checked law, shown beside this reply), not a generic opening (#468 re-test).
    paragraphs.push(args.askedQuestion && args.courtConfirmed ? assistantText("assistant:opening:question") : buildWarmOpening(args.intelligence));
    paragraphs.push(
      buildLegalExplanation({
        intelligence: args.intelligence,
        legalReasoning: args.legalReasoning,
        courtConfirmed: args.courtConfirmed,
      }),
    );
  } else if (args.askedQuestion && args.courtConfirmed) {
    // A question is never recorded as a fact (#469 re-test: "I've added the new
    // information to the case record: How long do I have to respond?").
    paragraphs.push(assistantText("assistant:opening:question"));
  } else {
    const newlyAddedFacts: string[] = [];

    // The engine's own facts and issue labels ("The user appears to have ...",
    // "Possible legal issue identified: ...") are not the person's words: not shown.
    const newlyIdentifiedIssues: string[] = [];

    if (newlyAddedFacts.length > 0) {
      paragraphs.push(
        assistantText("assistant:recorded:facts", {
          facts: uniqueStrings(newlyAddedFacts).slice(0, 3).join("; "),
        }),
      );
    }

    if (newlyIdentifiedIssues.length > 0) {
      paragraphs.push(
        assistantText("assistant:recorded:issues", {
          issues: uniqueStrings(newlyIdentifiedIssues).slice(0, 3).join("; "),
        }),
      );
    }

    if (
      newlyAddedFacts.length === 0 &&
      newlyIdentifiedIssues.length === 0
    ) {
      paragraphs.push(assistantText("assistant:recorded:plain"));
    }
  }

  /*
   * The general path keeps its first-turn rule: a conversational answer that
   * repeated the same caution on every turn would train people to skip it. The
   * DIRECT-intent answers carry it every time instead -- see buildAnswer --
   * because those are the ones a person acts on.
   */
  const caution = buildCaution(args.investigation, args.courtConfirmed);

  if (args.firstTurn && hasText(caution)) {
    paragraphs.push(caution);
  }

  const bestQuestion = buildBestQuestion({
    intelligence: args.intelligence,
    legalReasoning: args.legalReasoning,
    knownStory: args.knownStory,
    caseFile: args.caseFile,
  });
  // Not "what proof do you already have" when the person has said what they have
  // (#470 re-test: it followed a reply quoting their own list of evidence).
  const askedForProof = /what proof do you (?:already |currently )?have/i.test(bestQuestion);
  if (!(askedForProof && (args.recordedEvidence?.length ?? 0) > 0)) paragraphs.push(bestQuestion);

  const kept = deduplicateParagraphs(paragraphs, args.previousAssistantText);

  // The law-answer line names the checked law shown beside THIS reply, so every
  // question gets it, even after an earlier one did. Removed as a repeat, a third
  // message fell through to "I recorded that update" (#469 re-test, found by the
  // route-level chat test).
  if (args.askedQuestion && args.courtConfirmed) {
    const opening = assistantText("assistant:opening:question");
    if (kept[0] !== opening) kept.unshift(opening);
    // "To keep your case record complete:" leads into the question for the record, so it
    // goes with that question and only when it is still there: removed as a repeat, the
    // line ended the reply with nothing after it (#470 re-test).
    const at = kept.indexOf(clean(bestQuestion));
    if (at > 0) kept[at] = `${assistantText("assistant:opening:question-record")} ${kept[at]}`;
  }

  return kept.join("\n\n").trim();
}

function buildAnswer(args: {
  message: string;
  courtConfirmed: boolean;
  /** Evidence the person already named: quotes from their story and their own answer. */
  recordedEvidence?: string[];
  knownStory?: string;
  /** The saved case file: the chat asks no fact it holds (caseFile.ts chatMayAsk). */
  caseFile?: CaseFile | null;
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
      recorded: args.recordedEvidence,
      knownStory: args.knownStory,
      caseFile: args.caseFile,
      intelligence: args.intelligence,
      legalReasoning: args.legalReasoning,
      investigation: args.investigation,
    });

    /*
     * THE CAUTION NOW ACCOMPANIES EVERY SUBSTANTIVE ANSWER, 2026-09-23.
     *
     * It used to fire only in `buildGeneralAnswer`, and only on the first
     * turn. So the four direct-intent answers — evidence, legal issues,
     * document readiness, next question — never carried one at all, and a user
     * whose opening message was "what evidence do I need?" got a substantive
     * answer with no qualification whatsoever.
     *
     * Found by independent review of the chat engine
     * (docs/chat-engine-report.md), and it is the worse half of that finding:
     * the direct-intent answers are the ones a person acts on.
     *
     * `deduplicateParagraphs` against the previous turn stops it repeating on
     * every message in a conversation, which is what made the first-turn-only
     * rule tempting in the first place.
     */
    const directCaution = buildCaution(args.investigation, args.courtConfirmed);

    return (
      deduplicateParagraphs(
        hasText(directCaution) ? [directAnswer, directCaution] : [directAnswer],
        previousAssistantText,
      ).join("\n\n") ||
      directAnswer ||
      assistantText("assistant:fallback:need-more")
    );
  }

  return buildGeneralAnswer({
    firstTurn,
    courtConfirmed: args.courtConfirmed,
    recordedEvidence: args.recordedEvidence,
    knownStory: args.knownStory,
    caseFile: args.caseFile,
    askedQuestion: /\?\s*$/.test(args.message.trim()) || /^(what|how|when|where|who|why|which|can|could|do|does|did|should|is|are|will|would)\b/i.test(args.message.trim()),
    intelligence: args.intelligence,
    legalReasoning: args.legalReasoning,
    investigation: args.investigation,
    previousAssistantText,
  }) || assistantText("assistant:fallback:recorded");
}

export function runGuidedAssistantOrchestrator(
  input: GuidedAssistantOrchestratorInput,
): GuidedAssistantOrchestratorResult {
  const diagnosticId =
    clean(input.diagnosticId) || createDiagnosticId();

  const totalStartedAt = Date.now();
  const stageDiagnostics: GuidedAssistantStageDiagnostic[] = [];

  const message = clean(input.message);
  const conversation = input.conversation || [];
  const structuredCourtContext = resolveStructuredCourtContext(input);

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
        courtContext: {
          courtPath: toConversationCourtPath(
            structuredCourtContext.courtPath,
          ),
          jurisdiction: structuredCourtContext.jurisdiction,
          proceduralStage: toConversationStage(
            structuredCourtContext.stage,
          ),
        },
        mode: input.mode,
      }),
  });

  const courtContext = resolveFinalCourtContext({
    input,
    structured: structuredCourtContext,
    intelligence: conversationIntelligence,
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
        courtPath: courtContext.courtPath,
        jurisdiction: courtContext.jurisdiction,
        stage: courtContext.stage,
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
        // The caller named the case's court: the guided route passes the confirmed case's.
        courtConfirmed: Boolean(clean(input.courtContext?.courtPath)),
        recordedEvidence: recordedEvidenceOf(input.caseMemory),
        knownStory: savedStoryOf(input.caseMemory),
        caseFile: caseFileOfChat(input.caseMemory),
        conversation,
        intelligence: conversationIntelligence,
        legalReasoning,
        investigation: caseInvestigation,
      }),
  });

  const diagnostics: GuidedAssistantOrchestratorDiagnostics = {
    diagnosticId,
    totalDurationMs: Date.now() - totalStartedAt,
    inputMetrics,
    stages: stageDiagnostics,
  };

  console.info("guided assistant orchestrator completed", diagnostics);

  return {
    version: "1.5.0",
    generatedAt: nowIso(),
    ok: true,

    userFacingAnswer,
    answer: userFacingAnswer,

    courtContext,

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
