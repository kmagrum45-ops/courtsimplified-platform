/**
 * Standalone Ontario court-path classifier.
 *
 * Not wired into any route, component or engine. It is built and proved in
 * isolation first; callers are added in a later change.
 *
 * Two-stage design, cheapest first:
 *
 *   1. A free, synchronous keyword pass. This reuses the existing detection in
 *      conversationIntelligenceEngine rather than reimplementing it. The
 *      helpers there (inferCourtArea, detectIssueFrameworks,
 *      needsFamilyRelationshipClarification) are module-private, so this
 *      module goes through the exported buildConversationIntelligence entry
 *      point, which already folds all three together and reports "mixed" for a
 *      genuine cross-area conflict and "unknown" when a family relationship
 *      needs clarifying. Nothing in that file is modified.
 *
 *   2. An OpenAI call, only when stage 1 is genuinely ambiguous. A short story
 *      with one confident court area that does not contradict the declared
 *      path never reaches the network.
 */

import {
  buildConversationIntelligence,
  type CasePartnerCourtArea,
} from "../ai-case-partner/conversationIntelligenceEngine";

// The three paths CourtSimplified actually routes to. The keyword pass can
// return other areas (ltb, immigration, criminal-related); those are reported
// as-is by the keyword stage but are never asked of the model.
export type CourtPathValue = "family" | "small-claims" | "civil";

export type CourtPathClassification = {
  /** Best single court path, or "mixed"/"unknown" when no single path fits. */
  primaryPath: CourtPathValue | "mixed" | "unknown";
  /** Second path when the story genuinely spans two, otherwise null. */
  secondaryPath: CourtPathValue | null;
  /** 0-1. Keyword-only results are capped; see KEYWORD_CONFIDENCE. */
  confidence: number;
  /** One short sentence. Never legal advice. */
  reasoning: string;
  /** Which stage produced this result. */
  source: "keyword" | "ai" | "ai-unavailable" | "ai-error";
  /** True only when a network call was actually made. */
  aiCalled: boolean;
};

export type CourtPathClassifierInput = {
  story: string;
  declaredCourtPath?: string | null;
  /** Escape hatch for tests and for callers that must stay offline. */
  allowExternalCognition?: boolean;
};

/**
 * Stories at or below this length with one unambiguous court area skip the
 * model. Long stories are escalated because length correlates with multiple
 * intertwined issues, which is exactly what the keyword pass is weakest at.
 */
const SHORT_STORY_CHARACTERS = 320;

/** Confidence assigned to a clean keyword-only match. */
const KEYWORD_CONFIDENCE = 0.7;

/**
 * "mixed" is deliberately absent. When the keyword stage reports a genuine
 * cross-area conflict it has already answered the question, and the model adds
 * cost without adding information — it also tends to collapse such stories back
 * onto whichever topic is most prominent. Only a non-answer escalates.
 */
const AMBIGUOUS_AREAS: ReadonlySet<string> = new Set(["unknown"]);

const ROUTABLE_PATHS: ReadonlySet<string> = new Set([
  "family",
  "small-claims",
  "civil",
]);

function clean(value: unknown): string {
  return String(value || "").trim();
}

function normalizeDeclaredPath(value: unknown): CourtPathValue | null {
  const text = clean(value).toLowerCase().replace(/[\s_]+/g, "-");
  return ROUTABLE_PATHS.has(text) ? (text as CourtPathValue) : null;
}

function asRoutablePath(value: unknown): CourtPathValue | null {
  const text = clean(value).toLowerCase().replace(/[\s_]+/g, "-");
  return ROUTABLE_PATHS.has(text) ? (text as CourtPathValue) : null;
}

function clampConfidence(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(1, Math.max(0, num));
}

/**
 * Stage 1. Pure, synchronous, no network. Deliberately called WITHOUT a
 * courtContext so the returned area reflects the story alone — passing the
 * declared path in would let it colour its own verification.
 */
function detectFromKeywords(story: string): CasePartnerCourtArea {
  const result = buildConversationIntelligence({
    message: story,
    conversation: [],
  });

  return result.conversationFocus.courtArea;
}

type EscalationDecision = {
  escalate: boolean;
  reason: string;
};

/**
 * Escalate only when the cheap pass leaves a real question open:
 *   - it reported a cross-area conflict or could not decide;
 *   - the story is long enough that a single keyword hit is weak evidence;
 *   - the declared path contradicts what the story looks like.
 * A short, single-area story that agrees with the declared path is free.
 */
function decideEscalation(args: {
  story: string;
  keywordArea: CasePartnerCourtArea;
  declaredPath: CourtPathValue | null;
}): EscalationDecision {
  // A detected cross-area conflict is a final answer, whatever was declared
  // and however long the story is.
  if (args.keywordArea === "mixed") {
    return { escalate: false, reason: "keyword pass detected a cross-area conflict" };
  }

  if (AMBIGUOUS_AREAS.has(args.keywordArea)) {
    return {
      escalate: true,
      reason: `keyword pass returned "${args.keywordArea}"`,
    };
  }

  if (args.story.length > SHORT_STORY_CHARACTERS) {
    return {
      escalate: true,
      reason: `story is ${args.story.length} characters (over ${SHORT_STORY_CHARACTERS})`,
    };
  }

  // Only a single-area answer can "conflict" with a declared path.
  if (
    args.declaredPath &&
    asRoutablePath(args.keywordArea) &&
    args.declaredPath !== args.keywordArea
  ) {
    return {
      escalate: true,
      reason: `declared path "${args.declaredPath}" disagrees with detected "${args.keywordArea}"`,
    };
  }

  return { escalate: false, reason: "short story, one clear court area" };
}

const SYSTEM_PROMPT =
  "You classify which Ontario court path a self-represented litigant's story belongs to. " +
  "Reply with JSON only: " +
  '{"primaryPath":"family|small-claims|civil|mixed","secondaryPath":"family|small-claims|civil|null",' +
  '"confidence":0-1,"reasoning":"one short sentence"}. ' +
  "Decide by the relief actually being sought, not by the most prominent topic mentioned. " +
  "A story can name one court's subject matter as background, context or motive while the " +
  "relief the person actually wants belongs to a different court. Identify the operative claim. " +
  "For example, a story about false statements made because of an ongoing custody case is a " +
  "defamation claim; the custody case is only the motive, not the relief sought. " +
  "Use mixed only when the person genuinely wants relief from more than one court path. " +
  "State the operative claim in the reasoning. " +
  "Do not give legal advice, cite law, or add fields.";

function buildUserPrompt(args: {
  story: string;
  declaredPath: CourtPathValue | null;
}): string {
  const declared = args.declaredPath
    ? `The user selected "${args.declaredPath}". Treat that as a hint, not an answer.`
    : "The user did not select a path.";

  return `${declared}\n\nStory:\n${args.story}`;
}

type ModelPayload = {
  primaryPath?: unknown;
  secondaryPath?: unknown;
  confidence?: unknown;
  reasoning?: unknown;
};

function coerceModelPayload(
  payload: ModelPayload,
  fallbackArea: CasePartnerCourtArea,
): Omit<CourtPathClassification, "source" | "aiCalled"> {
  const rawPrimary = clean(payload.primaryPath).toLowerCase();
  const primaryPath =
    rawPrimary === "mixed"
      ? "mixed"
      : (asRoutablePath(rawPrimary) ??
        (asRoutablePath(fallbackArea) ?? "unknown"));

  const secondaryPath = asRoutablePath(payload.secondaryPath);

  return {
    primaryPath,
    // A secondary equal to the primary carries no information.
    secondaryPath: secondaryPath === primaryPath ? null : secondaryPath,
    confidence: clampConfidence(payload.confidence),
    reasoning: clean(payload.reasoning) || "No reasoning returned.",
  };
}

function keywordOnlyResult(args: {
  keywordArea: CasePartnerCourtArea;
  reason: string;
  source: CourtPathClassification["source"];
}): CourtPathClassification {
  const routable = asRoutablePath(args.keywordArea);

  const isConfident = Boolean(routable) || args.keywordArea === "mixed";

  return {
    primaryPath: args.keywordArea === "mixed" ? "mixed" : (routable ?? "unknown"),
    secondaryPath: null,
    confidence: isConfident ? KEYWORD_CONFIDENCE : 0.3,
    reasoning: args.reason,
    source: args.source,
    aiCalled: false,
  };
}

/**
 * Classify a story into an Ontario court path.
 *
 * Never throws: a missing API key or a failed/invalid model response falls back
 * to the keyword result, flagged through `source`.
 */
export async function classifyCourtPath(
  input: CourtPathClassifierInput,
): Promise<CourtPathClassification> {
  const story = clean(input.story);
  const declaredPath = normalizeDeclaredPath(input.declaredCourtPath);

  if (!story) {
    return {
      primaryPath: "unknown",
      secondaryPath: null,
      confidence: 0,
      reasoning: "No story text was provided.",
      source: "keyword",
      aiCalled: false,
    };
  }

  const keywordArea = detectFromKeywords(story);
  const escalation = decideEscalation({ story, keywordArea, declaredPath });

  if (!escalation.escalate) {
    return keywordOnlyResult({
      keywordArea,
      reason: `Keyword classification only (${escalation.reason}).`,
      source: "keyword",
    });
  }

  if (input.allowExternalCognition === false) {
    return keywordOnlyResult({
      keywordArea,
      reason: `External cognition disabled; ${escalation.reason}.`,
      source: "ai-unavailable",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return keywordOnlyResult({
      keywordArea,
      reason: `No configured model; ${escalation.reason}.`,
      source: "ai-unavailable",
    });
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.chat.completions.create({
      model:
        process.env.COURTSIMPLIFIED_CLASSIFIER_MODEL ||
        process.env.COURTSIMPLIFIED_REASONING_MODEL ||
        "gpt-4o-mini",
      temperature: 0,
      // Caps spend on a job whose answer is four short fields.
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt({ story, declaredPath }) },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return keywordOnlyResult({
        keywordArea,
        reason: `Model returned no content; ${escalation.reason}.`,
        source: "ai-error",
      });
    }

    const parsed = coerceModelPayload(
      JSON.parse(content) as ModelPayload,
      keywordArea,
    );

    return { ...parsed, source: "ai", aiCalled: true };
  } catch (error) {
    console.error("Court path classification failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });

    return keywordOnlyResult({
      keywordArea,
      reason: `Model call failed; ${escalation.reason}.`,
      source: "ai-error",
    });
  }
}
