/**
 * Routing rules fixed by law, decided in code before and over the model
 * (CLAUDE.md s. 2a, site owner 2026-10-14).
 *
 * Why this exists: on 2026-10-13 a homeowner with a $60,000 construction lien
 * on his house was routed by a single sentence in the classifier's prompt, and
 * the site then gave him the ordinary 20-day civil Defence deadline. Where a
 * statute itself names the court, the answer is not a judgment call for a
 * model: it is a rule, so it lives here, it is tested offline, and it wins.
 *
 * Each rule carries the provision that fixes it, quoted word for word from
 * docs/sources/corpus (checked by scripts/verification/verifyFixedRegimes.ts),
 * so the reasoning a person sees is sourced.
 *
 * Detection is deliberately narrow. A miss falls back to the ordinary
 * classifier (no worse than before); a false hit would send someone to the
 * wrong court, so each signal needs the context that makes it unambiguous.
 */

export type FixedRegimeId = "construction-lien" | "over-small-claims-limit";

export type FixedRegimeRule = {
  /** docs/sources/corpus/manifest.json id. */
  sourceId: string;
  pinpoint: string;
  /** Word for word from the corpus file (whitespace-normalised). */
  quote: string;
  officialUrl: string;
};

export type FixedRegime = {
  id: FixedRegimeId;
  /** The court path this regime fixes. */
  court: "civil";
  /** Plain words shown to the person; names the rule, never judges the case. */
  reasoning: string;
  rule: FixedRegimeRule;
  /**
   * True when the ordinary procedure for `court` (stage map, Rules of Civil
   * Procedure deadlines) must NOT be presented as this person's procedure,
   * because the statute has its own. The next-step card says "not covered
   * yet" instead (s. 2a: gaps are said, not filled).
   */
  ownProcedure: boolean;
  /**
   * The stage map's own steps for this regime, when it has them
   * (civilStages.ts). A regime with `ownProcedure` shows only these, never
   * the ordinary steps of `court`.
   */
  stages?: readonly string[];
};

/** The construction lien steps in the stage map (civilStages.ts, 2026-10-14). */
export const LIEN_STAGES = {
  owner: "civil:defendant:lien-registered-on-title",
  served: "civil:defendant:served-with-lien-claim",
  claimant: "civil:plaintiff:lien-claimant",
} as const;

/**
 * Which lien step a story most likely describes, as a suggestion the person
 * confirms or changes (CLAUDE.md s. 4). The one bringing the lien starts at
 * the claimant's step; an owner served with a statement of claim is in the
 * lien action; any other owner has a lien on title and no action yet. Pure.
 */
export function lienStepFor(story: string, side: "starting" | "responding" | "unclear"): string {
  if (side === "starting") return LIEN_STAGES.claimant;
  if (/\bstatement of claim\b|\b(?:sued|suing)\s+(?:me|us)\b|\bserved\s+(?:me|us|with)\b/i.test(story || "")) return LIEN_STAGES.served;
  return LIEN_STAGES.owner;
}

export const CONSTRUCTION_ACT_S50_1: FixedRegimeRule = {
  sourceId: "construction-act",
  pinpoint: "s. 50 (1)",
  quote: "A lien claim is enforceable in an action in the Superior Court of Justice.",
  officialUrl: "https://www.ontario.ca/laws/statute/90c30",
};

export const SMALL_CLAIMS_LIMIT_RULE: FixedRegimeRule = {
  sourceId: "oreg-626-00-monetary-jurisdiction",
  pinpoint: "s. 1 (1)",
  quote: "The maximum amount of a claim in the Small Claims Court is $50,000.",
  officialUrl: "https://www.ontario.ca/laws/regulation/000626",
};

// ---------------------------------------------------------------------------
// Construction liens
// ---------------------------------------------------------------------------

/** Words that are only ever about a construction lien. */
const EXPLICIT_LIEN =
  /\b(?:construction lien|claim for lien|lien claim(?:ant)?s?|preserv(?:e|ed|ing) (?:a |the |my |his |her |their |our )?lien|perfect(?:ed|ing)? (?:a |the |my |his |her |their |our )?lien|construction act|construction lien act)\b/i;

/**
 * "Holdback" alone is a payroll or rent word as often as a construction one
 * ("the holdback on my paycheque", "the landlord kept a holdback"; review
 * 2026-10-14). It counts only beside the work or the Act.
 */
const HOLDBACK_NEAR_WORK =
  /\bholdbacks?\b[^.?!\n]{0,80}\b(?:contractors?|sub-?contractors?|renovat\w*|construction|builders?)\b|\b(?:contractors?|sub-?contractors?|renovat\w*|construction|builders?)\b[^.?!\n]{0,80}\bholdbacks?\b/i;

/** The work that gives rise to a construction lien. */
const IMPROVEMENT_WORDS = String.raw`(?:contractors?|sub-?contractors?|renovat\w*|construction|builders?|roofer|roofing|interlock|landscap\w*|paving|plumb\w*|electrician|drywall|framing|foundation|deck|addition|basement|supplier|supplied materials)`;

/** The lien and the work in the same passage (about 120 characters either way), not anywhere in the story. */
const LIEN_NEAR_WORK = new RegExp(
  String.raw`\bliens?\b[^?!\n]{0,120}\b${IMPROVEMENT_WORDS}\b|\b${IMPROVEMENT_WORDS}\b[^?!\n]{0,120}\bliens?\b`,
  "i",
);

/** Land or a building the lien is against. */
const ON_LAND =
  /\bliens?\b[^.?!\n]{0,80}\b(?:house|home|property|title|land|lot|cottage|building|condo unit|premises)\b|\b(?:house|home|property|title|land|cottage|building)\b[^.?!\n]{0,80}\bliens?\b/i;

/**
 * Liens that are NOT construction liens and go elsewhere, when they sit beside
 * the lien: a condominium's common-expense lien, a repair or storage lien on a
 * car or goods, a tax lien, a mortgage or a judgment or support lien.
 */
const OTHER_LIEN_NEAR =
  /\bliens?\b[^.?!\n]{0,80}\b(?:common expenses?|condo(?:minium)? (?:fees?|corporation|board)|repair and storage|storage|tow(?:ed|ing)?|impound\w*|tax|taxes|cra|canada revenue|ppsa|mortgage|lender|bank|line of credit|fro|family responsibility|support|writ|judgment)\b|\b(?:common expenses?|condo(?:minium)? (?:fees?|corporation|board)|repair and storage|storage|tow(?:ed|ing)?|impound\w*|tax|taxes|cra|canada revenue|ppsa|mortgage|lender|bank|line of credit|fro|family responsibility|support|writ|judgment)\b[^.?!\n]{0,80}\bliens?\b/i;

const VEHICLE = /\b(?:car|truck|vehicle|motorcycle|boat|trailer|garage|mechanic'?s? shop)\b/i;

/**
 * A construction lien in the person's story. Narrow by design: a false hit
 * sends someone to the wrong court. "Mechanic's lien" is how many people name
 * a construction lien, so it counts unless a vehicle is in the story.
 */
export function detectsConstructionLien(story: string): boolean {
  const text = story || "";
  if (EXPLICIT_LIEN.test(text) || HOLDBACK_NEAR_WORK.test(text)) return true;
  if (/\bmechanic'?s lien\b/i.test(text)) return !VEHICLE.test(text) && ON_LAND.test(text);
  if (!/\bliens?\b/i.test(text)) return false;
  if (OTHER_LIEN_NEAR.test(text)) return false;
  if (VEHICLE.test(text) && !ON_LAND.test(text)) return false;
  return ON_LAND.test(text) && LIEN_NEAR_WORK.test(text);
}

// ---------------------------------------------------------------------------
// The Small Claims limit, by the amount the person says is claimed
// ---------------------------------------------------------------------------

const AMOUNT = String.raw`\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?\s*(k|thousand|million)?\b`;

/**
 * Only an amount the story ties to the person's own claim: "suing him for
 * $80,000", "he owes me $75k". A house price or a salary elsewhere is not the
 * amount in dispute, which is why the old code only escalated on amounts and
 * never decided (courtPathClassifier.ts, SMALL_CLAIMS_LIMIT). Review
 * 2026-10-14: "claim" alone also caught "my insurance claim of $70,000" and
 * "the contractor claimed $80,000 for the job", so a bare "claim" is not used.
 */
const CLAIMED_AMOUNT = new RegExp(
  String.raw`\b(?:su(?:e|ed|ing)\s+(?:\w+\s+){0,3}for|(?:i|we)\s+(?:want|need|plan|am going|are going)\s+to\s+(?:claim|sue for|recover)|(?:my|our)\s+claim\s+(?:is\s+)?(?:for|of)|owes?\s+(?:me|us)|owed\s+(?:me|us)|owing\s+(?:me|us)|damages\s+of)\s+(?:about\s+|around\s+|over\s+|roughly\s+|nearly\s+)?` +
    AMOUNT,
  "gi",
);

/** The person says they will give up the amount over the limit to stay in Small Claims. */
const WAIVES_EXCESS = /\b(?:give up|giving up|waive|waiving|abandon|abandoning|forgo|forgoing)\b[^.?!\n]{0,80}\b(?:extra|excess|rest|difference|over|above|amount)\b|\bstay in small claims\b/i;

function toNumber(digits: string, unit: string | undefined): number {
  let value = Number(digits.replace(/,/g, ""));
  const u = (unit || "").toLowerCase();
  if (u === "k" || u === "thousand") value *= 1_000;
  if (u === "million") value *= 1_000_000;
  return value;
}

export function claimedAmounts(story: string): number[] {
  const out: number[] = [];
  for (const match of (story || "").matchAll(CLAIMED_AMOUNT)) {
    const value = toNumber(match[1], match[2]);
    if (Number.isFinite(value)) out.push(value);
  }
  return out;
}

export const SMALL_CLAIMS_MAXIMUM = 50_000;

// ---------------------------------------------------------------------------

/**
 * The regime the law fixes for this story, or null when the ordinary
 * classifier decides. Construction liens are checked first: a lien under
 * $50,000 still goes to the Superior Court (s. 50 (1)).
 */
export function fixedRegimeFor(story: string): FixedRegime | null {
  // (applied to a classification by applyFixedRegime in courtPathClassifier.ts)
  if (detectsConstructionLien(story)) {
    return {
      id: "construction-lien",
      court: "civil",
      ownProcedure: true,
      stages: Object.values(LIEN_STAGES),
      rule: CONSTRUCTION_ACT_S50_1,
      reasoning:
        "This involves a construction lien. Under the Construction Act, s. 50 (1), a lien claim is enforced " +
        "in the Superior Court of Justice, whatever the amount. The Act and its regulation (O. Reg. 302/18) " +
        "set special procedures for lien actions, which apply before the ordinary court rules (s. 50 (2)).",
    };
  }
  const claimed = claimedAmounts(story);
  if (claimed.length > 0 && Math.max(...claimed) > SMALL_CLAIMS_MAXIMUM && !WAIVES_EXCESS.test(story)) {
    const largest = Math.max(...claimed);
    return {
      id: "over-small-claims-limit",
      court: "civil",
      ownProcedure: false,
      rule: SMALL_CLAIMS_LIMIT_RULE,
      reasoning:
        `You said the amount claimed is $${largest.toLocaleString("en-CA")}. The most the Small Claims Court can ` +
        "hear is $50,000 (O. Reg. 626/00, s. 1 (1)), so a claim for more goes to the Superior Court of Justice.",
    };
  }
  return null;
}
