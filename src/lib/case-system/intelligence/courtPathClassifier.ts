/**
 * Ontario court-path classifier.
 *
 * Wired in: app/api/classify-court-path/route.ts calls this directly, and
 * HomeLocationGate.tsx (the home-page location gate) calls that route before
 * every intake. The result is always shown as a dismissible suggestion --
 * the caller decides whether to switch paths, keep their own selection, or
 * (for an out-of-scope result) continue anyway. This module never routes or
 * persists anything itself.
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
 *
 * Out-of-scope forums (2026-08-25 audit): before this fix, conversationIntelligenceEngine's
 * keyword-detected out-of-scope areas were silently discarded back to
 * "unknown" by asRoutablePath(), and the AI escalation prompt had no way to
 * say "out of scope" at all -- both funnelled a real tenancy dispute into a
 * false "civil" suggestion. All nine forums from the audit are now wired:
 * ltb, hrto, wsiat, cat, social-benefits-tribunal, lat, divisional-court,
 * immigration, criminal-related (see outOfScopeForums.ts for the redirect
 * message each carries). LTB was built and proven first, deliberately, to
 * validate the mechanism on one forum before repeating it eight more times --
 * that sequencing also caught two real bugs the other eight inherit the
 * fixes for:
 *   1. A keyword-list precision bug: countSignals does plain substring
 *      matching, so bare "rent" matched inside "parent"/"different" and bare
 *      "lease" matched inside "please" -- an adult step-parent adoption story
 *      was classified out-of-scope "ltb" purely because it said "step-parent"
 *      twice. Every keyword list here uses whole words or multi-word phrases
 *      specific enough not to collide with unrelated words.
 *   2. A prompt-calibration bug: the model treated "doesn't clearly fit
 *      family/small-claims/civil" as evidence FOR an out-of-scope forum,
 *      rather than as genuine uncertainty -- a totally generic, content-free
 *      story was classified out-of-scope "ltb" at 0.9 confidence, reasoning
 *      "The story does not indicate a specific claim... suggesting it may
 *      pertain to landlord-tenant issues." SYSTEM_PROMPT now explicitly
 *      requires affirmative words, not absence of fit.
 */

import {
  buildConversationIntelligence,
  inferCourtArea,
  type CasePartnerCourtArea,
} from "../ai-case-partner/conversationIntelligenceEngine";
import { getOutOfScopeForum, type OutOfScopeForum } from "./outOfScopeForums";

// The three paths CourtSimplified actually routes to. The keyword pass can
// return other areas (ltb, immigration, criminal-related); those are reported
// as-is by the keyword stage but are never asked of the model.
export type CourtPathValue = "family" | "small-claims" | "civil";

export type CourtPathClassification = {
  /** Best single court path, "mixed"/"unknown", or "out-of-scope" for a different forum entirely. */
  primaryPath: CourtPathValue | "mixed" | "unknown" | "out-of-scope";
  /** Second path when the story genuinely spans two, otherwise null. */
  secondaryPath: CourtPathValue | null;
  /** Set only when primaryPath is "out-of-scope"; names the specific forum. */
  outOfScopeForum: OutOfScopeForum | null;
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

/**
 * A keyword area (e.g. "ltb") or a model's raw outOfScopeForum string both
 * use the same id space, so one lookup serves both callers.
 */
function asOutOfScopeForum(value: unknown): OutOfScopeForum | null {
  return getOutOfScopeForum(clean(value).toLowerCase());
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
 *
 * buildConversationIntelligence's own courtArea gives an issue framework
 * (contract, property-damage, etc. -- all family/small-claims/civil only,
 * with no concept of an out-of-scope forum) priority over inferCourtArea's
 * raw result. That's the right call for the chat interface this engine also
 * serves, where the more specific issue match should win. But it let a
 * confident "ltb" detection get silently overridden here: a landlord/eviction
 * story that also said "the broken heater" and "get the repairs done" hit
 * the property-damage framework's "repair"/"broken" signals and came back
 * "small-claims" instead (confirmed against the live engine, not assumed).
 *
 * Falling back to the raw keyword area is safe specifically when the blended
 * result is one of the three in-scope paths: buildConversationIntelligence
 * decides a genuine cross-area conflict ("mixed") or a family-relationship
 * clarification ("unknown") before frameworks are even consulted, so those
 * cases can never reach this branch with an in-scope blended result to begin
 * with -- this can only fire in exactly the case that was actually broken.
 */
function detectFromKeywords(story: string): CasePartnerCourtArea {
  const blended = buildConversationIntelligence({
    message: story,
    conversation: [],
  }).conversationFocus.courtArea;

  if (blended === "family" || blended === "small-claims" || blended === "civil") {
    const rawArea = inferCourtArea(story);
    if (asOutOfScopeForum(rawArea)) return rawArea;
  }

  return blended;
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
  "You classify which Ontario forum a self-represented litigant's story belongs to. " +
  "Reply with JSON only: " +
  '{"primaryPath":"family|small-claims|civil|mixed|out-of-scope",' +
  '"secondaryPath":"family|small-claims|civil|null",' +
  '"outOfScopeForum":"ltb|hrto|wsiat|cat|social-benefits-tribunal|lat|divisional-court|immigration|criminal-related|null",' +
  '"confidence":0-1,"reasoning":"one short sentence"}. ' +
  "CourtSimplified only handles Family, Small Claims, and Civil matters in the Ontario court system. The other " +
  "nine ids are different forums entirely: ltb (Landlord and Tenant Board -- residential tenancy), hrto (Human " +
  "Rights Tribunal of Ontario -- discrimination, protected grounds, accommodation), wsiat (workplace injury or " +
  "workers' compensation), cat (Condominium Authority Tribunal -- condo corporation/board disputes), " +
  "social-benefits-tribunal (Ontario Works or ODSP appeals), lat (Licence Appeal Tribunal -- statutory accident " +
  "benefits, licensing appeals), divisional-court (judicial review of a government or tribunal decision), " +
  "immigration (Immigration and Refugee Board, federal immigration/refugee matters), criminal-related (a " +
  "criminal charge or criminal court process). " +
  'Set primaryPath to "out-of-scope" and outOfScopeForum to the matching id ONLY when the story affirmatively ' +
  "describes that forum's specific subject matter -- an explicit landlord/tenant/eviction relationship for ltb, " +
  "an explicit discrimination/accommodation issue for hrto, an explicit workplace injury for wsiat, and so on for " +
  "each id -- never inferred from the story's absence of an in-scope fit. Out-of-scope is never a default for an " +
  "unclear or uninformative story. A story that is vague, generic, or simply too short to identify any specific " +
  "claim is NOT evidence of being out-of-scope -- the mere fact that a story doesn't clearly fit family, " +
  "small-claims, or civil does not make it landlord-tenant, or discrimination, or anything else. In that case, " +
  "prefer whatever in-scope signal exists even if weak, and set confidence low; only use out-of-scope when you " +
  "can point to the specific words that put it there. " +
  "Only set outOfScopeForum when you can name a specific forum id; never as a vague catch-all, and never invent " +
  "an id outside the list given. " +
  "When the story is in scope, decide by the relief actually being sought, not by the most prominent topic " +
  "mentioned. A story can name one court's subject matter as background, context or motive while the relief the " +
  "person actually wants belongs to a different court. Identify the operative claim. For example, a story about " +
  "false statements made because of an ongoing custody case is a defamation claim; the custody case is only the " +
  "motive, not the relief sought. Use mixed only when the person genuinely wants relief from more than one of " +
  "family, small-claims, or civil. " +
  "Whether in scope or out of scope, name only the forum and the general topic -- never state that the person's " +
  "facts satisfy any court or tribunal's legal test. State the operative claim (or the specific out-of-scope " +
  "words that justify it) in the reasoning. " +
  "Decide reasoning first, then set primaryPath and outOfScopeForum to exactly match what reasoning concludes -- " +
  "if reasoning names a specific out-of-scope forum, primaryPath MUST be \"out-of-scope\" and outOfScopeForum " +
  "MUST be that same forum's id; the two must never disagree. Do not give legal advice, cite law, or add fields.";

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
  outOfScopeForum?: unknown;
  confidence?: unknown;
  reasoning?: unknown;
};

function coerceModelPayload(
  payload: ModelPayload,
  fallbackArea: CasePartnerCourtArea,
): Omit<CourtPathClassification, "source" | "aiCalled"> {
  const rawPrimary = clean(payload.primaryPath).toLowerCase();

  if (rawPrimary === "out-of-scope") {
    const forum = asOutOfScopeForum(payload.outOfScopeForum);
    if (forum) {
      return {
        primaryPath: "out-of-scope",
        secondaryPath: null,
        outOfScopeForum: forum,
        confidence: clampConfidence(payload.confidence),
        reasoning: clean(payload.reasoning) || "No reasoning returned.",
      };
    }
    // The model said out-of-scope but didn't name a forum this platform
    // recognizes -- fall through to the ordinary in-scope handling rather
    // than surface an out-of-scope suggestion with nothing to point the
    // user to.
  }

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
    outOfScopeForum: null,
    confidence: clampConfidence(payload.confidence),
    reasoning: clean(payload.reasoning) || "No reasoning returned.",
  };
}

function keywordOnlyResult(args: {
  keywordArea: CasePartnerCourtArea;
  reason: string;
  source: CourtPathClassification["source"];
}): CourtPathClassification {
  // A recognized out-of-scope area is a confident, final answer -- it must
  // not fall through to "unknown" the way it did before this fix. That
  // silent downgrade was the actual bug: a correctly-detected LTB story
  // used to lose its answer here, then get forced into "civil" (or worse,
  // "unknown") by callers with no other option.
  const outOfScope = asOutOfScopeForum(args.keywordArea);
  if (outOfScope) {
    return {
      primaryPath: "out-of-scope",
      secondaryPath: null,
      outOfScopeForum: outOfScope,
      confidence: KEYWORD_CONFIDENCE,
      reasoning: args.reason,
      source: args.source,
      aiCalled: false,
    };
  }

  const routable = asRoutablePath(args.keywordArea);

  const isConfident = Boolean(routable) || args.keywordArea === "mixed";

  return {
    primaryPath: args.keywordArea === "mixed" ? "mixed" : (routable ?? "unknown"),
    secondaryPath: null,
    outOfScopeForum: null,
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
      outOfScopeForum: null,
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
