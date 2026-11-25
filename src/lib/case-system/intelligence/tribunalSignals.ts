/**
 * The signals that say a story belongs to a tribunal, and the keyword pass that names it: pure, no network, no model.
 *
 * Moved here unchanged from courtPathClassifier.ts (9 Nov 2026, C1) so that the shared tribunal rule
 * (fixedRegimes.ts exclusiveTribunalFor), which every screen runs before its first follow-up question, and the court
 * path classifier read one copy. Nothing here imports a server-only module, so the browser can run the same rule.
 */
import {
  buildConversationIntelligence,
  inferCourtArea,
  type CasePartnerCourtArea,
} from "../guided-assistant/conversationIntelligenceEngine";
import { getOutOfScopeForum, type OutOfScopeForum } from "./outOfScopeForums";
import { COMMERCIAL_TENANCY_WORDS, RESIDENTIAL_TENANCY_WORDS } from "./tenancyWords";

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

/**
 * The person says the case is already in Small Claims Court ("my former
 * landlord sued me in Small Claims for $6,000"). Where a former tenancy
 * belongs is a boundary this platform cannot source (above), but a case
 * already filed there is where they must respond, so it is not sent to a
 * tribunal (independent review of the coverage run, 2026-10-06). Narrow by
 * design: the court must be named.
 */
const EXISTING_SMALL_CLAIMS_CASE = /\b(?:sued|suing|sues|claim|filed|served)\b[^.?!]{0,60}\bsmall claims\b/i;

export function namesExistingSmallClaimsCase(story: string): boolean {
  return EXISTING_SMALL_CLAIMS_CASE.test(story);
}

export function hasTenancyEndedSignal(story: string): boolean {
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
export function coherentForum(forum: OutOfScopeForum, story: string): OutOfScopeForum | null {
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
export function isCommercialTenancyOnly(story: string): boolean {
  const text = story.toLowerCase();
  const commercial: readonly string[] = COMMERCIAL_TENANCY_WORDS;
  const residential: readonly string[] = RESIDENTIAL_TENANCY_WORDS;
  return commercial.some((term) => text.includes(term)) && !residential.some((term) => text.includes(term));
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
export function keywordCourtArea(story: string): CasePartnerCourtArea {
  const blended = buildConversationIntelligence({
    message: story,
    conversation: [],
  }).conversationFocus.courtArea;

  if (blended === "family" || blended === "small-claims" || blended === "civil") {
    const rawArea = inferCourtArea(story);
    if (getOutOfScopeForum(String(rawArea).toLowerCase())) return rawArea;
  }

  return blended;
}
