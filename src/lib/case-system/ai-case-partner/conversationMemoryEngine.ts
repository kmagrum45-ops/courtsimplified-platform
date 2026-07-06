import {
  CasePartnerConversationMessage,
  CasePartnerCourtArea,
  CasePartnerFact,
  CasePartnerLegalSignal,
  CasePartnerProceduralStage,
  ConversationIntelligenceResult,
} from "./conversationIntelligenceEngine";

export type ConversationMemoryVersion = "1.0.0";

export type MemoryConfidence = "low" | "medium" | "high";

export type MemorySource =
  | "user-message"
  | "assistant-message"
  | "conversation-intelligence"
  | "existing-memory"
  | "manual";

export type RememberedItem = {
  id: string;
  value: string;
  source: MemorySource;
  confidence: MemoryConfidence;
  firstSeenAt: string;
  lastSeenAt: string;
  timesSeen: number;
};

export type ConversationMemoryState = {
  version: ConversationMemoryVersion;
  caseId?: string;
  createdAt: string;
  updatedAt: string;

  summary: string;
  courtArea: CasePartnerCourtArea;
  proceduralStage: CasePartnerProceduralStage;
  userRole: string;
  userGoal: string;

  facts: RememberedItem[];
  timelineItems: RememberedItem[];
  parties: RememberedItem[];
  evidence: RememberedItem[];
  legalIssues: RememberedItem[];
  missingInformation: RememberedItem[];
  outstandingQuestions: RememberedItem[];
  answeredQuestions: RememberedItem[];
  riskFlags: RememberedItem[];
  proceduralItems: RememberedItem[];

  conversationCount: number;
  warnings: string[];
};

export type ConversationMemoryInput = {
  caseId?: string;
  existingMemory?: unknown;
  message: string;
  conversation?: CasePartnerConversationMessage[];
  intelligence: ConversationIntelligenceResult;
};

export type ConversationMemoryResult = {
  version: ConversationMemoryVersion;
  generatedAt: string;
  memory: ConversationMemoryState;
  memoryPatch: {
    addedFacts: string[];
    addedTimelineItems: string[];
    addedEvidence: string[];
    addedLegalIssues: string[];
    addedMissingInformation: string[];
    addedOutstandingQuestions: string[];
    addedRiskFlags: string[];
    updatedSummary: string;
    warnings: string[];
  };
};

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown): string {
  return clean(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(
    new Set(values.map((value) => clean(value)).filter(Boolean)),
  );
}

function normalizeConfidence(value: unknown): MemoryConfidence {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "low";
}

function normalizeCourtArea(value: unknown): CasePartnerCourtArea {
  const allowed: CasePartnerCourtArea[] = [
    "small-claims",
    "family",
    "civil",
    "ltb",
    "immigration",
    "criminal-related",
    "mixed",
    "unknown",
  ];

  return allowed.includes(value as CasePartnerCourtArea)
    ? (value as CasePartnerCourtArea)
    : "unknown";
}

function normalizeProceduralStage(value: unknown): CasePartnerProceduralStage {
  const allowed: CasePartnerProceduralStage[] = [
    "not-started",
    "starting-case",
    "responding",
    "already-filed",
    "conference",
    "motion",
    "settlement",
    "disclosure",
    "trial-preparation",
    "trial",
    "enforcement",
    "appeal-or-review",
    "urgent",
    "not-sure",
    "unknown",
  ];

  return allowed.includes(value as CasePartnerProceduralStage)
    ? (value as CasePartnerProceduralStage)
    : "unknown";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeRememberedItem(
  value: unknown,
  fallbackSource: MemorySource,
): RememberedItem | null {
  if (typeof value === "string") {
    const text = clean(value);
    if (!text) return null;

    return {
      id: createId("memory"),
      value: text,
      source: fallbackSource,
      confidence: "low",
      firstSeenAt: nowIso(),
      lastSeenAt: nowIso(),
      timesSeen: 1,
    };
  }

  const record = asRecord(value);
  const text = clean(record.value);

  if (!text) return null;

  return {
    id: clean(record.id) || createId("memory"),
    value: text,
    source:
      record.source === "user-message" ||
      record.source === "assistant-message" ||
      record.source === "conversation-intelligence" ||
      record.source === "existing-memory" ||
      record.source === "manual"
        ? record.source
        : fallbackSource,
    confidence: normalizeConfidence(record.confidence),
    firstSeenAt: clean(record.firstSeenAt) || nowIso(),
    lastSeenAt: clean(record.lastSeenAt) || nowIso(),
    timesSeen:
      typeof record.timesSeen === "number" && Number.isFinite(record.timesSeen)
        ? Math.max(1, Math.round(record.timesSeen))
        : 1,
  };
}

function normalizeItemList(
  value: unknown,
  fallbackSource: MemorySource,
): RememberedItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => normalizeRememberedItem(item, fallbackSource))
    .filter((item): item is RememberedItem => Boolean(item));
}

function createEmptyMemory(caseId?: string): ConversationMemoryState {
  const time = nowIso();

  return {
    version: "1.0.0",
    caseId,
    createdAt: time,
    updatedAt: time,

    summary: "",
    courtArea: "unknown",
    proceduralStage: "unknown",
    userRole: "unknown",
    userGoal: "",

    facts: [],
    timelineItems: [],
    parties: [],
    evidence: [],
    legalIssues: [],
    missingInformation: [],
    outstandingQuestions: [],
    answeredQuestions: [],
    riskFlags: [],
    proceduralItems: [],

    conversationCount: 0,
    warnings: [],
  };
}

function normalizeExistingMemory(
  value: unknown,
  caseId?: string,
): ConversationMemoryState {
  const record = asRecord(value);
  const empty = createEmptyMemory(caseId);

  if (Object.keys(record).length === 0) {
    return empty;
  }

  return {
    version: "1.0.0",
    caseId: clean(record.caseId) || caseId,
    createdAt: clean(record.createdAt) || empty.createdAt,
    updatedAt: clean(record.updatedAt) || empty.updatedAt,

    summary: clean(record.summary),
    courtArea: normalizeCourtArea(record.courtArea),
    proceduralStage: normalizeProceduralStage(record.proceduralStage),
    userRole: clean(record.userRole) || "unknown",
    userGoal: clean(record.userGoal),

    facts: normalizeItemList(record.facts, "existing-memory"),
    timelineItems: normalizeItemList(record.timelineItems, "existing-memory"),
    parties: normalizeItemList(record.parties, "existing-memory"),
    evidence: normalizeItemList(record.evidence, "existing-memory"),
    legalIssues: normalizeItemList(record.legalIssues, "existing-memory"),
    missingInformation: normalizeItemList(
      record.missingInformation,
      "existing-memory",
    ),
    outstandingQuestions: normalizeItemList(
      record.outstandingQuestions,
      "existing-memory",
    ),
    answeredQuestions: normalizeItemList(
      record.answeredQuestions,
      "existing-memory",
    ),
    riskFlags: normalizeItemList(record.riskFlags, "existing-memory"),
    proceduralItems: normalizeItemList(
      record.proceduralItems,
      "existing-memory",
    ),

    conversationCount:
      typeof record.conversationCount === "number" &&
      Number.isFinite(record.conversationCount)
        ? Math.max(0, Math.round(record.conversationCount))
        : 0,
    warnings: uniqueStrings(Array.isArray(record.warnings) ? record.warnings : []),
  };
}

function mergeRememberedItems(
  existing: RememberedItem[],
  incomingValues: string[],
  source: MemorySource,
  confidence: MemoryConfidence = "medium",
): { items: RememberedItem[]; added: string[] } {
  const time = nowIso();
  const items = [...existing];
  const added: string[] = [];

  for (const value of uniqueStrings(incomingValues)) {
    const key = normalize(value);
    if (!key) continue;

    const found = items.find((item) => normalize(item.value) === key);

    if (found) {
      found.lastSeenAt = time;
      found.timesSeen += 1;
      if (confidence === "high" && found.confidence !== "high") {
        found.confidence = "high";
      } else if (confidence === "medium" && found.confidence === "low") {
        found.confidence = "medium";
      }
      continue;
    }

    items.push({
      id: createId("memory"),
      value,
      source,
      confidence,
      firstSeenAt: time,
      lastSeenAt: time,
      timesSeen: 1,
    });

    added.push(value);
  }

  return { items, added };
}

function getFactsByCategory(
  facts: CasePartnerFact[],
  category: CasePartnerFact["category"],
): string[] {
  return facts
    .filter((fact) => fact.category === category)
    .map((fact) => fact.text);
}

function summarizeMemory(args: {
  previousSummary: string;
  message: string;
  intelligence: ConversationIntelligenceResult;
}): string {
  const pieces = uniqueStrings([
    args.previousSummary,
    args.intelligence.caseMemoryPatch.summary,
    args.message.slice(0, 500),
  ]);

  return pieces.join(" ").slice(0, 1200);
}

function inferAnsweredQuestions(
  existingQuestions: RememberedItem[],
  message: string,
): string[] {
  const text = normalize(message);
  const answered: string[] = [];

  for (const question of existingQuestions) {
    const q = normalize(question.value);

    if (
      q.includes("province") &&
      [
        "ontario",
        "alberta",
        "british columbia",
        "quebec",
        "manitoba",
        "saskatchewan",
        "nova scotia",
        "new brunswick",
        "newfoundland",
        "pei",
        "prince edward island",
        "yukon",
        "nunavut",
        "northwest territories",
      ].some((province) => text.includes(province))
    ) {
      answered.push(question.value);
    }

    if (
      q.includes("proof") &&
      ["text", "email", "screenshot", "recording", "document", "receipt"].some(
        (word) => text.includes(word),
      )
    ) {
      answered.push(question.value);
    }

    if (
      q.includes("filed") &&
      ["filed", "served", "issued", "court file", "order"].some((word) =>
        text.includes(word),
      )
    ) {
      answered.push(question.value);
    }

    if (
      q.includes("dates") &&
      /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(text)
    ) {
      answered.push(question.value);
    }
  }

  return uniqueStrings(answered);
}

export function buildConversationMemory(
  input: ConversationMemoryInput,
): ConversationMemoryResult {
  const existing = normalizeExistingMemory(input.existingMemory, input.caseId);
  const intelligence = input.intelligence;
  const patch = intelligence.caseMemoryPatch;

  const answeredNow = inferAnsweredQuestions(
    existing.outstandingQuestions,
    input.message,
  );

  const factsMerge = mergeRememberedItems(
    existing.facts,
    patch.factsToAdd,
    "conversation-intelligence",
    "medium",
  );

  const timelineMerge = mergeRememberedItems(
    existing.timelineItems,
    [
      ...patch.timelineItemsToReview,
      ...getFactsByCategory(intelligence.extractedFacts, "date"),
    ],
    "conversation-intelligence",
    "medium",
  );

  const evidenceMerge = mergeRememberedItems(
    existing.evidence,
    patch.evidenceToRequest,
    "conversation-intelligence",
    "medium",
  );

  const legalIssueMerge = mergeRememberedItems(
    existing.legalIssues,
    [
      ...patch.legalIssuesToReview,
      ...intelligence.legalSignals.map(
        (signal: CasePartnerLegalSignal) => signal.label,
      ),
    ],
    "conversation-intelligence",
    "medium",
  );

  const missingMerge = mergeRememberedItems(
    existing.missingInformation,
    intelligence.missingInformation,
    "conversation-intelligence",
    "medium",
  );

  const questionMerge = mergeRememberedItems(
    existing.outstandingQuestions.filter(
      (question) => !answeredNow.includes(question.value),
    ),
    patch.outstandingQuestions,
    "conversation-intelligence",
    "medium",
  );

  const answeredMerge = mergeRememberedItems(
    existing.answeredQuestions,
    answeredNow,
    "user-message",
    "medium",
  );

  const riskMerge = mergeRememberedItems(
    existing.riskFlags,
    patch.riskFlags,
    "conversation-intelligence",
    "medium",
  );

  const proceduralMerge = mergeRememberedItems(
    existing.proceduralItems,
    patch.proceduralItemsToReview,
    "conversation-intelligence",
    "medium",
  );

  const partyMerge = mergeRememberedItems(
    existing.parties,
    getFactsByCategory(intelligence.extractedFacts, "party"),
    "conversation-intelligence",
    "low",
  );

  const updatedMemory: ConversationMemoryState = {
    ...existing,
    caseId: input.caseId || existing.caseId,
    updatedAt: nowIso(),
    summary: summarizeMemory({
      previousSummary: existing.summary,
      message: input.message,
      intelligence,
    }),
    courtArea:
      intelligence.conversationFocus.courtArea !== "unknown"
        ? intelligence.conversationFocus.courtArea
        : existing.courtArea,
    proceduralStage:
      intelligence.conversationFocus.proceduralStage !== "unknown"
        ? intelligence.conversationFocus.proceduralStage
        : existing.proceduralStage,
    userRole:
      intelligence.conversationFocus.userRole !== "unknown"
        ? intelligence.conversationFocus.userRole
        : existing.userRole,
    userGoal:
      intelligence.conversationFocus.primaryGoal || existing.userGoal,

    facts: factsMerge.items,
    timelineItems: timelineMerge.items,
    parties: partyMerge.items,
    evidence: evidenceMerge.items,
    legalIssues: legalIssueMerge.items,
    missingInformation: missingMerge.items,
    outstandingQuestions: questionMerge.items,
    answeredQuestions: answeredMerge.items,
    riskFlags: riskMerge.items,
    proceduralItems: proceduralMerge.items,

    conversationCount: existing.conversationCount + 1,
    warnings: uniqueStrings([
      ...existing.warnings,
      ...intelligence.validation.needsLegalVerification.map(
        (item) => `Legal verification needed: ${item}`,
      ),
    ]),
  };

  return {
    version: "1.0.0",
    generatedAt: nowIso(),
    memory: updatedMemory,
    memoryPatch: {
      addedFacts: factsMerge.added,
      addedTimelineItems: timelineMerge.added,
      addedEvidence: evidenceMerge.added,
      addedLegalIssues: legalIssueMerge.added,
      addedMissingInformation: missingMerge.added,
      addedOutstandingQuestions: questionMerge.added,
      addedRiskFlags: riskMerge.added,
      updatedSummary: updatedMemory.summary,
      warnings: updatedMemory.warnings,
    },
  };
}