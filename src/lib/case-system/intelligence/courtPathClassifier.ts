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
} from "../guided-assistant/conversationIntelligenceEngine";
import { getOutOfScopeForum, type OutOfScopeForum } from "./outOfScopeForums";
import { withAiCallContext } from "../../audit/aiCallLog";
import { modelParams } from "../aiModels";

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
 * Session 24. A small, deliberately narrow, LTB-specific secondary signal
 * list -- same style as claimTypes.ts's `signals`: plain substring
 * matching, no AI, short enough to review at a glance. Detects language
 * suggesting the tenancy described has already ended, distinct from the
 * LTB keyword list in conversationIntelligenceEngine.ts (lines ~757-769),
 * which fires on bare "landlord"/"tenant" regardless of timing.
 *
 * This does NOT resolve the underlying legal question -- confirmed
 * unsourceable from ontario.ca/ontariocourts.ca/ontariocourtforms.on.ca in
 * an earlier session (see docs/AI_INTAKE_DESIGN.md's open-questions
 * section) -- of exactly where the LTB/Small-Claims jurisdictional line
 * falls for a former tenant. It only stops the classifier from being
 * confidently wrong about something it was never entitled to be
 * confident about: a story with both an LTB keyword and one of these
 * signals gets a lower confidence and a different, honest reasoning
 * string (see keywordOnlyResult below) instead of the ordinary
 * high-confidence LTB redirect.
 */
const TENANCY_ENDED_SIGNALS = [
  "moved out",
  "former tenant",
  "former landlord",
  "ex-landlord",
  // Added with the Part 6 scope work. "My old landlord is suing me for $2,800
  // in damage" was matching LTB at full confidence, because none of the
  // phrases here cover "old" — so a plain debt claim was being redirected to
  // a tribunal that does not hear it. Same class of signal, same purpose.
  "old landlord",
  "old tenant",
  "previous landlord",
  "previous tenant",
  "ex-tenant",
  "no longer living there",
  "no longer live there",
  "after i left",
  "after i moved out",
  "since moving out",
  "tenancy ended",
  "tenancy has ended",
  "lease ended",
  "already moved",
];

function hasTenancyEndedSignal(story: string): boolean {
  const normalized = story.toLowerCase();
  return TENANCY_ENDED_SIGNALS.some((signal) => normalized.includes(signal));
}

/*
 * *** WSIAT REQUIRES A WORK CONNECTION. THIS CHECKS FOR ONE. ***
 *
 * The story that forced this: "I slipped on the sidewalk outside the library on
 * Elgin Street on February 3rd. It was solid ice, nobody had salted it. I broke
 * my wrist and I'm off work. The city owns that sidewalk."
 *
 * Classified out-of-scope `wsiat` at 0.9 confidence, reasoning "a workplace
 * injury due to slipping on ice". It is a municipal non-repair claim with a
 * TEN-DAY notice deadline under Municipal Act s. 44 (10), and the person was
 * turned away from the platform entirely. That is the worst outcome this product
 * has: a claim-barring deadline, and we sent them somewhere that cannot hear it.
 *
 * The prompt already told the model that an injury away from work is not wsiat,
 * in as many words, after two slip-and-fall stories went there in an earlier
 * run. It said so and was ignored — because "I'm off work" reads as a work
 * connection, when it describes a CONSEQUENCE of the injury and says nothing
 * about where it happened. A prompt is a request, not a safeguard.
 *
 * So this is a code check, and it is not a heuristic: WSIA s. 123 (1) gives the
 * Appeals Tribunal exclusive jurisdiction over appeals from FINAL DECISIONS OF
 * THE BOARD on entitlement under the insurance plan (quoted in
 * outOfScopeForums.ts). That presupposes a worker, an employer and a Board
 * claim. A member of the public who fell on a city sidewalk has none of those,
 * so "wsiat" with no work connection anywhere in the story is internally
 * incoherent whatever words it happens to contain.
 *
 * *** THE TRADE-OFF, STATED ***
 *
 * A genuine workplace injury described without any of these phrases would now
 * be let through as in-scope. That is the lesser harm, deliberately: the reader
 * gets Small Claims guidance and referrals rather than being turned away from a
 * 10-day notice period, and the stage resolver's own out-of-scope backstop is
 * still downstream of this. Nothing here decides anything — the classification
 * is a dismissible suggestion (CLAUDE.md §4).
 *
 * Note what is NOT in the list: bare "work". "off work", "can't work", "missed
 * work" and "back to work" must not match, and they are the exact phrases a
 * person with a broken wrist uses.
 */
const WORKPLACE_SIGNALS = [
  "at work",
  "on the job",
  "job site",
  "jobsite",
  "work site",
  "worksite",
  "workplace",
  "my employer",
  "the employer",
  "my boss",
  "my shift",
  "on shift",
  "during my shift",
  "while working",
  "wsib",
  "workers compensation",
  "workers' compensation",
  "workplace safety",
  "occupational",
  "on duty",
  "my employee",
  "work injury",
  "injured at work",
  "hurt at work",
];

function hasWorkplaceSignal(story: string): boolean {
  const normalized = story.toLowerCase();
  return WORKPLACE_SIGNALS.some((signal) => normalized.includes(signal));
}

/**
 * Is this out-of-scope forum coherent with the story at all?
 *
 * Returns the forum, or null to refuse it. Refusing means the story falls
 * through to ordinary in-scope handling, which is what a personal injury claim
 * against a municipality or an occupier is: a Small Claims matter up to the
 * $50,000 limit (O. Reg. 626/00 s. 1 (1)).
 *
 * Only wsiat is checked here, because only wsiat's own statute makes the
 * requirement checkable without deciding anything about the reader's case.
 */
function coherentForum(forum: OutOfScopeForum, story: string): OutOfScopeForum | null {
  if (forum.id === "wsiat" && !hasWorkplaceSignal(story)) return null;
  if (forum.id === "ltb" && isCommercialTenancyOnly(story)) return null;
  return forum;
}

/**
 * 2026-09-29. Residential Tenancies Act, 2006 s. 3 (1): the Act -- and so
 * the LTB -- "applies with respect to rental units in residential complexes"
 * (docs/sources/corpus, e-Laws 06r17_e.doc, retrieved 2026-09-27). The model
 * named the LTB for a restaurant's strip-mall lease while its own reasoning
 * said "commercial lease" (story review SC17). The keyword pass already
 * scores no LTB signal for such a story; this refuses the model's LTB too.
 */
function isCommercialTenancyOnly(story: string): boolean {
  const text = story.toLowerCase();
  const commercial = ["commercial", "strip mall", "storefront", "retail unit", "office space", "my restaurant", "my store", "my shop", "business premises"];
  const residential = ["apartment", "residential", "rental unit", "basement", "my home", "house i rent"];
  return commercial.some((term) => text.includes(term)) && !residential.some((term) => text.includes(term));
}

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

/**
 * 2026-09-28. The line between small-claims and civil is an amount, and the
 * keyword pass never looked at one: the story review battery saw a $185,000
 * renovation routed to Small Claims on keywords alone, because it was short
 * and said "contractor". Courts of Justice Act s. 23 (1) gives the Small
 * Claims Court money claims up to "the prescribed amount" exclusive of
 * interest and costs; O. Reg. 626/00 s. 1 (1) prescribes $50,000 (both read
 * from docs/sources/corpus, retrieved 2026-09-27; e-Laws 90c43_e.doc and
 * 000626_e.doc). And s. 23 (1.1): an action within that jurisdiction must
 * start in Small Claims unless the Superior Court gives leave.
 *
 * Used only to ESCALATE to the model when the keyword answer and the stated
 * amounts point different ways. It never decides a path on its own: a story
 * can mention a house price or a salary that is not the amount in dispute.
 */
export const SMALL_CLAIMS_LIMIT = 50_000;

export function statedDollarAmounts(story: string): number[] {
  const amounts: number[] = [];
  const pattern = /\$\s?(\d{1,3}(?:,\d{3})+|\d+)(\.\d{1,2})?\s*(k|thousand|million)?\b/gi;
  for (const match of story.matchAll(pattern)) {
    let value = Number(match[1].replace(/,/g, "") + (match[2] || ""));
    const unit = (match[3] || "").toLowerCase();
    if (unit === "k" || unit === "thousand") value *= 1_000;
    if (unit === "million") value *= 1_000_000;
    if (Number.isFinite(value)) amounts.push(value);
  }
  return amounts;
}

function amountContradicts(area: CasePartnerCourtArea, story: string): string | null {
  const amounts = statedDollarAmounts(story);
  if (amounts.length === 0) return null;
  const largest = Math.max(...amounts);
  if (area === "small-claims" && largest > SMALL_CLAIMS_LIMIT) {
    return `keyword pass said small-claims but the story states $${largest.toLocaleString("en-CA")}, over the $50,000 limit`;
  }
  if (area === "civil" && largest <= SMALL_CLAIMS_LIMIT) {
    return `keyword pass said civil but every amount stated is within the $50,000 Small Claims limit`;
  }
  return null;
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

  const amountConflict = amountContradicts(args.keywordArea, args.story);
  if (amountConflict) {
    return { escalate: true, reason: amountConflict };
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
  "An injury on its own is NOT wsiat. wsiat is workplace injury and workers compensation: the person must have " +
  "been hurt AT WORK or be dealing with WSIB. Slipping on an icy sidewalk, falling in a shop car park, or any " +
  "other injury away from work is an ordinary court matter, not a tribunal one. BEING OFF WORK IS NOT A WORK " +
  "CONNECTION: 'I'm off work', 'I can't work', 'I've missed work' describe a CONSEQUENCE of an injury and say " +
  "nothing about where it happened — a real run classified a broken wrist from a fall on a city sidewalk as wsiat " +
  "at 0.9 confidence on exactly those words, and that person has a TEN-DAY notice deadline. An injury claim " +
  "against a city, a shop or another occupier is a court matter (small-claims for $50,000 or less, civil above " +
  "that) — a real run sent two slip-and-fall " +
  "stories to wsiat purely because somebody was hurt. " +
  "each id -- never inferred from the story's absence of an in-scope fit. Out-of-scope is never a default for an " +
  "unclear or uninformative story. A story that is vague, generic, or simply too short to identify any specific " +
  "claim is NOT evidence of being out-of-scope -- the mere fact that a story doesn't clearly fit family, " +
  "small-claims, or civil does not make it landlord-tenant, or discrimination, or anything else. In that case, " +
  "prefer whatever in-scope signal exists even if weak, and set confidence low; only use out-of-scope when you " +
  "can point to the specific words that put it there. " +
  "Only set outOfScopeForum when you can name a specific forum id; never as a vague catch-all, and never invent " +
  "an id outside the list given. " +
  "Between small-claims and civil, the dividing line is the amount. The Small Claims Court hears claims for money, " +
  "or for the return of personal property, worth up to $50,000 not counting interest and costs -- whatever the " +
  "subject: a debt, a loan, unpaid work, a contractor, damaged property, an injury such as a dog bite, or something " +
  "said about the person. A claim of that size must be started there. A claim for more than $50,000 is civil. When " +
  "the story states the amount in dispute, route by it; when it states none, an ordinary money dispute between " +
  "individuals or small businesses is small-claims. " +
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

export type ModelPayload = {
  primaryPath?: unknown;
  secondaryPath?: unknown;
  outOfScopeForum?: unknown;
  confidence?: unknown;
  reasoning?: unknown;
};

/**
 * Turns a model payload into a classification.
 *
 * *** EXPORTED AS A TEST SEAM, FOR A REASON WORTH READING ***
 *
 * The WSIAT failure happened here, on the AI path, and the first attempt to
 * check it drove `classifyCourtPath` offline instead. Those assertions passed —
 * and they passed with the refusal deleted, because the KEYWORD pass never
 * called those stories wsiat in the first place. `forum=none` looked like the
 * check working and was the check testing nothing.
 *
 * Found by mutation-testing it. So the checks now feed this function the exact
 * payload the model actually returned — `out-of-scope` / `wsiat` at 0.9 — which
 * is the only way to assert the refusal without paying for a model call and
 * without depending on what a model says today.
 */
export function coerceModelPayload(
  payload: ModelPayload,
  fallbackArea: CasePartnerCourtArea,
  story: string,
): Omit<CourtPathClassification, "source" | "aiCalled"> {
  const rawPrimary = clean(payload.primaryPath).toLowerCase();
  /** A forum the model named and `coherentForum` refused. Changes the reasoning. */
  let refusedForum: OutOfScopeForum | null = null;

  if (rawPrimary === "out-of-scope") {
    const named = asOutOfScopeForum(payload.outOfScopeForum);
    // An incoherent forum is refused here, before the payload becomes an
    // answer. See coherentForum: a wsiat call on a story with no work
    // connection anywhere in it contradicts wsiat's own jurisdiction.
    const forum = named ? coherentForum(named, story) : null;
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
    if (named && !forum) refusedForum = named;
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
    /*
     * *** THE MODEL'S REASONING DOES NOT SURVIVE A REFUSED FORUM ***
     *
     * Carrying it did, at first, and the result was a classification reading
     * `primaryPath: "unknown"` with `reasoning: "The injury occurred on a city
     * sidewalk, which indicates a potential workplace injury claim."` — the
     * argument for a conclusion this function had just rejected, attached to
     * the opposite answer, on a field a caller may show.
     *
     * A justification is only ever a justification for the answer it came with.
     */
    reasoning: refusedForum
      ? `This does not appear to be a ${refusedForum.name} matter: nothing in the story ` +
        `indicates the injury happened at work or that a Workplace Safety and Insurance ` +
        `Board claim is involved. Treating it as a court matter.`
      : clean(payload.reasoning) || "No reasoning returned.",
  };
}

function keywordOnlyResult(args: {
  story: string;
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
    // Session 24, LTB only (see TENANCY_ENDED_SIGNALS above): a story that
    // also signals the tenancy has already ended is a genuine boundary
    // case, not a confident LTB match -- lower confidence and a different,
    // honest reasoning string instead of the ordinary redirect. This is
    // the entire fix: HomeLocationGate.tsx already only surfaces an
    // out-of-scope suggestion at confidence >= SUGGESTION_CONFIDENCE_FLOOR
    // (0.6), so dropping below that is what actually stops the hard
    // redirect from firing, with no caller-side change needed. The forum
    // object itself (name, redirectMessage) is untouched -- reused as-is,
    // exactly the existing, already-reviewed LTB content, and the ordinary
    // active-tenancy case below is completely unaffected.
    if (outOfScope.id === "ltb" && hasTenancyEndedSignal(args.story)) {
      return {
        primaryPath: "out-of-scope",
        secondaryPath: null,
        outOfScopeForum: outOfScope,
        confidence: 0.3,
        reasoning:
          `This may involve the ${outOfScope.name}, or it may be a Small Claims matter depending on timing -- ` +
          "this is a boundary CourtSimplified can't resolve. The LTB or a paralegal can confirm which applies.",
        source: args.source,
        aiCalled: false,
      };
    }

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
  // LSO Step 7. The audit row is written by openaiClient.ts's wrapper; this
  // context is what tells it which call site the row belongs to. The body is a
  // separate function rather than an inlined arrow so the transform is a rename
  // plus four lines, reviewable at a glance, and the original body is untouched.
  return withAiCallContext({ callType: "court-path-classifier" }, () =>
    classifyCourtPathInner(input),
  );
}

async function classifyCourtPathInner(
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
      story,
      keywordArea,
      reason: `Keyword classification only (${escalation.reason}).`,
      source: "keyword",
    });
  }

  if (input.allowExternalCognition === false) {
    return keywordOnlyResult({
      story,
      keywordArea,
      reason: `External cognition disabled; ${escalation.reason}.`,
      source: "ai-unavailable",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return keywordOnlyResult({
      story,
      keywordArea,
      reason: `No configured model; ${escalation.reason}.`,
      source: "ai-unavailable",
    });
  }

  try {
    const { createOpenAIClient } = await import("../openaiClient");
    const client = createOpenAIClient();

    const response = await client.chat.completions.create({
      ...modelParams("deep", {
        temperature: 0,
        // Caps spend on a job whose answer is four short fields. modelParams
        // adds reasoning headroom on top: thinking tokens count against this
        // cap, and 200 alone would be spent before the answer was written.
        maxOutputTokens: 200,
      }),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt({ story, declaredPath }) },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return keywordOnlyResult({
        story,
        keywordArea,
        reason: `Model returned no content; ${escalation.reason}.`,
        source: "ai-error",
      });
    }

    const parsed = coerceModelPayload(
      JSON.parse(content) as ModelPayload,
      keywordArea,
      story,
    );

    return { ...parsed, source: "ai", aiCalled: true };
  } catch (error) {
    console.error("Court path classification failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });

    return keywordOnlyResult({
      story,
      keywordArea,
      reason: `Model call failed; ${escalation.reason}.`,
      source: "ai-error",
    });
  }
}
