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

export type AiCasePartnerOrchestratorVersion = "1.2.0";

export type AiCasePartnerOrchestratorInput = {
  caseId?: string;
  message: string;
  conversation?: CasePartnerConversationMessage[];
  caseMemory?: unknown;
  mode?: string;
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

  result: {
    conversationIntelligence: ReturnType<typeof buildConversationIntelligence>;
    legalReasoning: CoordinatedReasoningPackage;
    conversationMemory: ReturnType<typeof buildConversationMemory>;
    caseInvestigation: ReturnType<typeof buildCaseInvestigation>;
  };
};

function nowIso(): string {
  return new Date().toISOString();
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstItem(items: unknown): string {
  return Array.isArray(items) && typeof items[0] === "string" ? items[0] : "";
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

  if (text.includes("payment") || text.includes("debt") || text.includes("owed")) {
    domains.push("debt");
  }

  if (text.includes("property damage") || text.includes("damaged")) {
    domains.push("property-damage");
  }

  if (text.includes("negligence")) {
    domains.push("negligence");
  }

  if (text.includes("family") || text.includes("parenting") || text.includes("custody")) {
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

  if (text.includes("procedure") || text.includes("court") || text.includes("form")) {
    domains.push("procedural");
  }

  return uniqueDomains(domains.length > 0 ? domains : ["unknown"]);
}

function buildWarmOpening(intelligence: ReturnType<typeof buildConversationIntelligence>): string {
  const issue =
    intelligence.hypotheses?.[0]?.label ||
    intelligence.legalSignals?.[0]?.label ||
    "";

  if (issue.toLowerCase().includes("defamation")) {
    return "I’m sorry you’re dealing with that. Statements being shared about you can become stressful quickly, especially when they affect your reputation or relationships. Let’s organize this carefully so we can separate what was said, who received it, what proof exists, and what legal issues may need review.";
  }

  if (issue.toLowerCase().includes("family")) {
    return "I know family court issues can feel overwhelming, especially when children, support, or existing orders are involved. Let’s slow it down and organize the facts in a way that can actually help your case.";
  }

  if (issue.toLowerCase().includes("contract") || issue.toLowerCase().includes("payment")) {
    return "I can help you organize this into a clear claim story. The main thing is to connect the agreement, what went wrong, the proof, and the money or remedy you’re asking for.";
  }

  if (issue.toLowerCase().includes("property damage")) {
    return "I can help you turn this into a structured property damage claim. The important part is proving what was damaged, who caused it, what it cost, and what evidence supports that.";
  }

  if (
    issue.toLowerCase().includes("public") ||
    issue.toLowerCase().includes("crown") ||
    issue.toLowerCase().includes("police")
  ) {
    return "This kind of issue needs to be handled carefully because public authority cases can depend heavily on the exact actor, the record, the legal power being used, and what proof exists. Let’s organize it step by step instead of jumping to conclusions.";
  }

  return "I can help you organize this. Let’s turn what happened into a clear case record by identifying the people involved, the key facts, the evidence, the legal issues, and the next best step.";
}

function buildLegalExplanation(args: {
  intelligence: ReturnType<typeof buildConversationIntelligence>;
  legalReasoning: CoordinatedReasoningPackage;
}): string {
  const hypothesis = args.intelligence.hypotheses?.[0];
  const signal = args.intelligence.legalSignals?.[0];

  const burden = firstItem(args.legalReasoning.reasoningSummary.burdenPriorities);
  const judicialConcern = firstItem(
    args.legalReasoning.reasoningSummary.judicialConcerns,
  );

  if (hasText(burden) && hasText(judicialConcern)) {
    return `The legal reasoning package is focusing first on this point: ${burden}. A likely court concern to keep in mind is: ${judicialConcern}`;
  }

  if (!hypothesis && !signal) {
    return "The first job is not to guess the answer. The first job is to understand the facts well enough to know what legal issue, court path, evidence, and remedy fit.";
  }

  const label = hypothesis?.label || signal?.label || "possible legal issue";

  if (label.toLowerCase().includes("defamation")) {
    return "For a possible defamation issue, the legal focus is usually on the exact words, whether they were about you, whether they were communicated to someone else, whether they could harm your reputation, and whether any defence might apply. The exact wording and context matter a lot.";
  }

  if (label.toLowerCase().includes("contract") || label.toLowerCase().includes("payment")) {
    return "For a contract or payment dispute, the legal focus is usually on what agreement existed, what each side was supposed to do, what proof shows the agreement, what was breached, and what loss resulted.";
  }

  if (label.toLowerCase().includes("property damage")) {
    return "For property damage, the legal focus is usually on causation and proof: what was damaged, who caused it, how it happened, and what records prove the repair cost or loss.";
  }

  if (label.toLowerCase().includes("family")) {
    return "For family matters, the court usually needs child-focused facts, current orders or arrangements, the status quo, support/payment records if relevant, and evidence showing why the requested outcome is appropriate.";
  }

  if (
    label.toLowerCase().includes("public") ||
    label.toLowerCase().includes("crown") ||
    label.toLowerCase().includes("police")
  ) {
    return "For public authority issues, the legal focus is usually on who did what, what legal power or duty was involved, whether there is a court or tribunal record, whether any immunity or special rule applies, and what harm can be proven.";
  }

  return `The issue I’m seeing is ${label}. I’ll use that as a working theory only, then keep asking questions to confirm whether it actually fits.`;
}

function buildProofGuidance(args: {
  intelligence: ReturnType<typeof buildConversationIntelligence>;
  legalReasoning: CoordinatedReasoningPackage;
}): string {
  const profileEvidence = firstItem(
    args.legalReasoning.reasoningSummary.evidencePriorities,
  );

  if (hasText(profileEvidence)) {
    return `For court preparation, we should start preserving proof early. Based on the reasoning profile, one priority is: ${profileEvidence}`;
  }

  const evidenceQuestions = args.intelligence.questions
    ?.filter((question) => question.relatedTo === "evidence")
    .map((question) => question.question)
    .slice(0, 2);

  if (evidenceQuestions?.length > 0) {
    return `For court preparation, we should start preserving proof early. The most useful evidence question right now is: ${evidenceQuestions[0]}`;
  }

  return "For court preparation, we should start preserving proof early: messages, emails, screenshots, documents, dates, witness names, photos, records, and anything showing what happened or what harm followed.";
}

function buildBestQuestion(args: {
  intelligence: ReturnType<typeof buildConversationIntelligence>;
  legalReasoning: CoordinatedReasoningPackage;
}): string {
  const question = args.intelligence.selectedNextQuestion;

  if (question) {
    return `My next question is: ${question.question}\n\nI’m asking because ${question.reason}`;
  }

  const reasoningQuestion = firstItem(
    args.legalReasoning.reasoningSummary.firstQuestions,
  );

  if (hasText(reasoningQuestion)) {
    return `My next question is: ${reasoningQuestion}\n\nI’m asking because this is the first question in the legal reasoning profile for this type of issue.`;
  }

  return "Start by telling me the main dates, what proof you have, and what outcome you want.";
}

function buildCaution(
  investigation: ReturnType<typeof buildCaseInvestigation>,
): string {
  const warning = firstItem(investigation.validation?.warnings);

  if (!hasText(warning)) return "";

  if (warning.toLowerCase().includes("jurisdiction")) {
    return "I’m going to avoid deadline or form advice until the province is confirmed, because court rules and limitation periods can change depending on where this happened.";
  }

  return `One thing I’ll be careful about: ${warning}`;
}

function buildAnswer(args: {
  intelligence: ReturnType<typeof buildConversationIntelligence>;
  legalReasoning: CoordinatedReasoningPackage;
  investigation: ReturnType<typeof buildCaseInvestigation>;
}): string {
  const opening = buildWarmOpening(args.intelligence);
  const explanation = buildLegalExplanation({
    intelligence: args.intelligence,
    legalReasoning: args.legalReasoning,
  });
  const proof = buildProofGuidance({
    intelligence: args.intelligence,
    legalReasoning: args.legalReasoning,
  });
  const caution = buildCaution(args.investigation);
  const question = buildBestQuestion({
    intelligence: args.intelligence,
    legalReasoning: args.legalReasoning,
  });

  return [opening, explanation, proof, caution, question]
    .filter(hasText)
    .join("\n\n")
    .trim();
}

export function runAiCasePartnerOrchestrator(
  input: AiCasePartnerOrchestratorInput,
): AiCasePartnerOrchestratorResult {
  const message = clean(input.message);

  const conversationIntelligence = buildConversationIntelligence({
    message,
    conversation: input.conversation || [],
    caseMemory: input.caseMemory,
    mode: input.mode,
  });

  const legalDomains = detectLegalDomains(conversationIntelligence);

  const legalReasoning = buildLegalReasoningCoordinator({
    courtPath:
      conversationIntelligence.conversationFocus.courtArea === "mixed"
        ? "unknown"
        : conversationIntelligence.conversationFocus.courtArea,
    jurisdiction: "Unknown",
    stage: "not-sure",
    legalDomains,
    knowledgeObjects: DOCTRINE_SEED_LIBRARY,
    mode: "operational",
  });

  const conversationMemory = buildConversationMemory({
    caseId: input.caseId,
    existingMemory: input.caseMemory,
    message,
    conversation: input.conversation || [],
    intelligence: conversationIntelligence,
  });

  const caseInvestigation = buildCaseInvestigation({
    caseId: input.caseId,
    message,
    intelligence: conversationIntelligence,
    memory: conversationMemory,
  });

  const userFacingAnswer = buildAnswer({
    intelligence: conversationIntelligence,
    legalReasoning,
    investigation: caseInvestigation,
  });

  return {
    version: "1.2.0",
    generatedAt: nowIso(),
    ok: true,

    userFacingAnswer,
    answer: userFacingAnswer,

    conversationIntelligence,
    legalReasoning,
    conversationMemory,
    caseInvestigation,

    caseMemory: conversationMemory.memory,

    result: {
      conversationIntelligence,
      legalReasoning,
      conversationMemory,
      caseInvestigation,
    },
  };
}