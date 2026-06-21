import type {
  ConfidenceLevel,
  CourtSimplifiedArea,
  ProceduralStage,
} from "../core/caseModel";

import type {
  AIConversationMessage,
  AIInterpretationResult,
  AIUserIntent,
} from "../core/aiOrchestratorTypes";

export type InterpretationSignal = {
  label: string;
  matched: boolean;
  confidence: ConfidenceLevel;
  reason: string;
};

export type InterpretationInput = {
  userMessage: string;
  conversationHistory?: AIConversationMessage[];
  knownArea?: CourtSimplifiedArea;
  knownProceduralStage?: ProceduralStage;
};

const AREA_SIGNALS: Record<CourtSimplifiedArea, string[]> = {
  "small-claims": [
    "money",
    "owe",
    "owed",
    "loan",
    "contract",
    "damage",
    "property",
    "repair",
    "deposit",
    "invoice",
    "paid",
    "refund",
    "defamation",
    "slander",
    "libel",
    "small claims",
    "settlement conference",
  ],
  family: [
    "custody",
    "parenting",
    "decision-making",
    "access",
    "child support",
    "spousal support",
    "case conference",
    "family court",
    "motion to change",
    "parenting time",
    "children",
  ],
  civil: [
    "statement of claim",
    "civil claim",
    "charter",
    "negligence",
    "misfeasance",
    "injunction",
    "superior court",
    "damages",
    "duty of care",
  ],
  ltb: [
    "landlord",
    "tenant",
    "rent",
    "eviction",
    "n4",
    "n5",
    "maintenance",
    "lease",
    "landlord tenant board",
  ],
  immigration: [
    "immigration",
    "refugee",
    "sponsorship",
    "removal",
    "work permit",
    "study permit",
    "pr",
    "permanent residence",
  ],
  unknown: [],
  mixed: [],
};

const STAGE_SIGNALS: Record<ProceduralStage, string[]> = {
  "not-started": ["haven't filed", "not filed", "before filing", "thinking of suing"],
  "starting-case": ["start a case", "file a claim", "application", "statement of claim"],
  responding: ["served", "respond", "defence", "answer", "replying"],
  "already-filed": ["already filed", "filed", "court file", "claim number"],
  conference: ["conference", "case conference", "settlement conference"],
  motion: ["motion", "urgent motion", "bring a motion"],
  settlement: ["settlement", "offer", "minutes of settlement", "settle"],
  disclosure: ["disclosure", "documents", "production"],
  "trial-preparation": ["trial prep", "prepare for trial", "witness list"],
  trial: ["trial", "hearing"],
  enforcement: ["enforce", "garnish", "judgment debtor", "writ"],
  "appeal-or-review": ["appeal", "review", "set aside"],
  urgent: ["urgent", "emergency", "immediate", "danger", "without notice"],
  "not-sure": ["not sure", "don't know", "confused"],
  unknown: [],
};

export function interpretUserMessage(
  input: InterpretationInput
): AIInterpretationResult {
  const text = normalizeText(input.userMessage);
  const conversationText = normalizeText(
    [input.userMessage, ...(input.conversationHistory ?? []).map((m) => m.content)].join(" ")
  );

  const area = input.knownArea ?? detectArea(conversationText);
  const proceduralStage =
    input.knownProceduralStage ?? detectProceduralStage(conversationText);

  const intent = detectIntent(text);
  const extractedFacts = extractFactLikeStatements(input.userMessage);
  const extractedEvidence = extractEvidenceSignals(conversationText);
  const extractedMissingInformation = detectMissingInformation(area, intent, conversationText);
  const possibleIssues = detectPossibleIssues(area, conversationText);
  const followUpQuestions = buildFollowUpQuestions(
    area,
    proceduralStage,
    intent,
    extractedMissingInformation
  );

  const confidence = calculateInterpretationConfidence({
    area,
    proceduralStage,
    factsCount: extractedFacts.length,
    evidenceCount: extractedEvidence.length,
    missingCount: extractedMissingInformation.length,
  });

  return {
    intent,
    area,
    proceduralStage,
    confidence,
    understoodUserGoal: buildUnderstoodGoal(intent, area, input.userMessage),
    plainLanguageCaseSummary: buildPlainLanguageSummary(
      area,
      proceduralStage,
      extractedFacts
    ),
    extractedFacts,
    extractedTimelineEvents: extractTimelineSignals(input.userMessage),
    extractedEvidence,
    extractedMissingInformation,
    possibleIssues,
    issueUncertainty: buildIssueUncertainty(area, possibleIssues, extractedMissingInformation),
    shouldAskBeforeAnswering:
      confidence === "low" || extractedMissingInformation.length >= 3,
    followUpQuestions,
  };
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function detectArea(text: string): CourtSimplifiedArea {
  const scores = Object.entries(AREA_SIGNALS).map(([area, signals]) => ({
    area: area as CourtSimplifiedArea,
    score: signals.filter((signal) => text.includes(signal)).length,
  }));

  const meaningfulScores = scores.filter(
    (entry) => entry.area !== "unknown" && entry.area !== "mixed" && entry.score > 0
  );

  if (meaningfulScores.length === 0) return "unknown";

  const sorted = meaningfulScores.sort((a, b) => b.score - a.score);
  if (sorted.length > 1 && sorted[0].score === sorted[1].score) return "mixed";

  return sorted[0].area;
}

function detectProceduralStage(text: string): ProceduralStage {
  const scores = Object.entries(STAGE_SIGNALS).map(([stage, signals]) => ({
    stage: stage as ProceduralStage,
    score: signals.filter((signal) => text.includes(signal)).length,
  }));

  const sorted = scores.filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score);

  return sorted[0]?.stage ?? "unknown";
}

function detectIntent(text: string): AIUserIntent {
  if (containsAny(text, ["draft", "write", "prepare document"])) return "ask-to-draft";
  if (containsAny(text, ["what do i do", "next step", "what's next"])) {
    return "ask-what-to-do-next";
  }
  if (containsAny(text, ["do i have a case", "can i sue", "is this a case"])) {
    return "ask-if-they-have-a-case";
  }
  if (containsAny(text, ["proof", "prove", "evidence"])) return "ask-about-proof";
  if (containsAny(text, ["form", "which form"])) return "ask-about-forms";
  if (containsAny(text, ["deadline", "limitation", "late"])) return "ask-about-deadline";
  if (containsAny(text, ["case law", "precedent", "cases"])) return "ask-about-precedent";
  if (containsAny(text, ["judge", "court care about"])) return "ask-about-judge-concerns";
  if (containsAny(text, ["other side", "defence", "argument against"])) {
    return "ask-about-opposing-arguments";
  }

  return "tell-case-story";
}

function containsAny(text: string, signals: string[]): boolean {
  return signals.some((signal) => text.includes(signal));
}

function extractFactLikeStatements(message: string): string[] {
  return message
    .split(/[.!?\n]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 12)
    .slice(0, 12);
}

function extractTimelineSignals(message: string): string[] {
  const datePattern =
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|\d{1,2}[/-]\d{1,2}[/-]?\d{0,4}|\d{4})\b/i;

  return message
    .split(/[.!?\n]/)
    .map((part) => part.trim())
    .filter((part) => datePattern.test(part))
    .slice(0, 10);
}

function extractEvidenceSignals(text: string): string[] {
  const evidenceSignals = [
    "text message",
    "texts",
    "screenshot",
    "email",
    "photo",
    "video",
    "recording",
    "receipt",
    "invoice",
    "contract",
    "witness",
    "police report",
    "court order",
    "medical record",
    "bank statement",
  ];

  return evidenceSignals.filter((signal) => text.includes(signal));
}

function detectPossibleIssues(
  area: CourtSimplifiedArea,
  text: string
): string[] {
  const issues = new Set<string>();

  if (containsAny(text, ["defamation", "slander", "libel", "called me", "telling people"])) {
    issues.add("possible-defamation-or-reputation-harm");
  }

  if (containsAny(text, ["owe", "owed", "loan", "unpaid", "invoice"])) {
    issues.add("possible-unpaid-money-or-debt");
  }

  if (containsAny(text, ["contract", "agreement", "breach"])) {
    issues.add("possible-contract-dispute");
  }

  if (containsAny(text, ["damage", "damaged", "repair", "property"])) {
    issues.add("possible-property-damage");
  }

  if (containsAny(text, ["custody", "parenting", "decision-making", "access"])) {
    issues.add("possible-parenting-or-decision-making");
  }

  if (containsAny(text, ["support", "child support", "spousal support"])) {
    issues.add("possible-support-issue");
  }

  if (containsAny(text, ["negligence", "injury", "duty", "failed to"])) {
    issues.add("possible-negligence-or-duty-breach");
  }

  if (area === "unknown" && issues.size === 0) {
    issues.add("not-yet-mapped-user-described-issue");
  }

  return Array.from(issues);
}

function detectMissingInformation(
  area: CourtSimplifiedArea,
  intent: AIUserIntent,
  text: string
): string[] {
  const missing: string[] = [];

  if (!containsAny(text, ["when", "date", "202", "yesterday", "today", "last week"])) {
    missing.push("dates or timeline");
  }

  if (!containsAny(text, ["proof", "screenshot", "text", "email", "witness", "document"])) {
    missing.push("what evidence exists");
  }

  if (!containsAny(text, ["want", "asking", "seeking", "money", "order", "custody", "support"])) {
    missing.push("what outcome or remedy the user wants");
  }

  if (area === "unknown" || area === "mixed") {
    missing.push("court area or type of legal process");
  }

  if (intent === "ask-to-draft" && !containsAny(text, ["filed", "served", "court", "claim"])) {
    missing.push("current procedural stage before drafting");
  }

  return missing;
}

function buildFollowUpQuestions(
  area: CourtSimplifiedArea,
  stage: ProceduralStage,
  intent: AIUserIntent,
  missing: string[]
): string[] {
  const questions: string[] = [];

  if (missing.includes("dates or timeline")) {
    questions.push("When did the main events happen, even approximately?");
  }

  if (missing.includes("what evidence exists")) {
    questions.push("What proof do you have right now, such as texts, screenshots, emails, witnesses, receipts, photos, or court documents?");
  }

  if (missing.includes("what outcome or remedy the user wants")) {
    questions.push("What do you want the court process to help you get or fix?");
  }

  if (missing.includes("court area or type of legal process")) {
    questions.push("Is this connected to Small Claims, Family Court, Civil Court, a tribunal, or are you not sure yet?");
  }

  if (stage === "unknown" || stage === "not-sure") {
    questions.push("Has anything already been filed or served, or are you still deciding how to start?");
  }

  if (intent === "ask-to-draft") {
    questions.push("What document are you trying to prepare, and has the court already given you a file number?");
  }

  if (area === "small-claims") {
    questions.push("What amount of money are you claiming or defending against, and how did you calculate it?");
  }

  return Array.from(new Set(questions)).slice(0, 6);
}

function buildUnderstoodGoal(
  intent: AIUserIntent,
  area: CourtSimplifiedArea,
  message: string
): string {
  const shortMessage = message.trim().slice(0, 180);

  if (intent === "ask-to-draft") {
    return `The user appears to want help preparing a legal document related to a ${area} matter.`;
  }

  if (intent === "ask-what-to-do-next") {
    return `The user appears to want help identifying the safest next procedural step in a ${area} matter.`;
  }

  if (intent === "ask-if-they-have-a-case") {
    return `The user appears to want a cautious assessment of whether the facts may support a legal claim.`;
  }

  return `The user is describing a situation that needs to be organized into legally useful facts: "${shortMessage}${
    message.length > 180 ? "..." : ""
  }"`;
}

function buildPlainLanguageSummary(
  area: CourtSimplifiedArea,
  stage: ProceduralStage,
  facts: string[]
): string {
  if (facts.length === 0) {
    return "The user has not provided enough factual detail yet to build a reliable case summary.";
  }

  return `This appears to involve a ${area} matter at the ${stage} stage. The main facts provided so far are: ${facts
    .slice(0, 3)
    .join("; ")}.`;
}

function buildIssueUncertainty(
  area: CourtSimplifiedArea,
  possibleIssues: string[],
  missing: string[]
): string[] {
  const uncertainty: string[] = [];

  if (area === "unknown" || area === "mixed") {
    uncertainty.push("The court area is not yet clear enough to safely route the matter.");
  }

  if (possibleIssues.length === 0 || possibleIssues.includes("not-yet-mapped-user-described-issue")) {
    uncertainty.push("The issue may not yet be mapped to a known legal framework.");
  }

  if (missing.length > 0) {
    uncertainty.push("Important facts are missing before legal or procedural guidance should become specific.");
  }

  return uncertainty;
}

function calculateInterpretationConfidence(input: {
  area: CourtSimplifiedArea;
  proceduralStage: ProceduralStage;
  factsCount: number;
  evidenceCount: number;
  missingCount: number;
}): ConfidenceLevel {
  let score = 0;

  if (input.area !== "unknown" && input.area !== "mixed") score += 2;
  if (input.proceduralStage !== "unknown" && input.proceduralStage !== "not-sure") {
    score += 2;
  }
  if (input.factsCount >= 2) score += 2;
  if (input.evidenceCount >= 1) score += 1;
  if (input.missingCount >= 3) score -= 2;

  if (score >= 5) return "high";
  if (score >= 2) return "medium";
  return "low";
}