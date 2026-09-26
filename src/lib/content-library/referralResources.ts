/**
 * Where we send someone when we cannot help them.
 *
 * *** WHY THIS EXISTS ***
 *
 * The audit found zero references anywhere in the codebase to Legal Aid
 * Ontario, Pro Bono Ontario, Steps to Justice or the Law Society Referral
 * Service. A platform whose whole premise is "legal information, not legal
 * advice" had nowhere to send a user who needed advice.
 *
 * Two paths use this:
 *
 *   1. A user asks a legal question -- "will I win", "what should I argue",
 *      "draft my argument". We answer with the fixed message below and these
 *      resources, and nothing else.
 *   2. The matter is outside Ontario, or outside the three court paths.
 *
 * *** THE MESSAGE IS FIXED ***
 *
 * DEFLECTION_MESSAGE is a constant, never model-generated, and is on the
 * allowlist in outputGuard.ts. The model's only role is setting the boolean
 * that decides whether it shows.
 *
 * *** URL VERIFICATION, 2026-09-22 ***
 *
 * All four were fetched and returned HTTP 200. Two -- lso.ca and
 * probonoontario.org -- return 403 to a plain request and 200 with an ordinary
 * browser User-Agent; they block bots, not people. docs/SOURCING_NOTES.md
 * already records that behaviour for lso.ca. Note that probonoontario.org
 * serves only the www host: the apex returns 403 even with a browser agent, so
 * the www form below is deliberate.
 *
 * NOT licensee-reviewed. These are organisation names and links rather than
 * legal statements, but the framing sentence around them is still content.
 */

export type ReferralResource = {
  id: string;
  name: string;
  /** One line on what they do. No legal statements. */
  description: string;
  url: string;
};

export const REFERRAL_RESOURCES: readonly ReferralResource[] = [
  {
    id: "referral:lso",
    name: "Law Society Referral Service",
    description:
      "Connects you with a lawyer or paralegal for a free consultation of up to 30 minutes.",
    url: "https://lso.ca/public-resources/finding-a-lawyer-or-paralegal/law-society-referral-service",
  },
  {
    id: "referral:legal-aid-ontario",
    name: "Legal Aid Ontario",
    description: "Legal help for people with low income. Check whether you qualify.",
    url: "https://www.legalaid.on.ca/",
  },
  {
    id: "referral:pro-bono-ontario",
    name: "Pro Bono Ontario",
    description: "Free legal advice by phone for certain civil matters.",
    url: "https://www.probonoontario.org/",
  },
  {
    id: "referral:steps-to-justice",
    name: "CLEO Steps to Justice",
    description: "Plain-language legal information about everyday legal problems in Ontario.",
    url: "https://stepstojustice.ca/",
  },
] as const;

/**
 * Shown when a user asks for legal advice. Fixed wording, never generated.
 *
 * Deliberately says what we cannot do and immediately what they can do
 * instead. It does not apologise at length, and it does not hint at an answer.
 */
export const DEFLECTION_MESSAGE =
  "We can't answer that. Questions like how strong your case is, what you should " +
  "argue, or what the law means for your situation are legal advice, and " +
  "CourtSimplified gives legal information only. A lawyer or paralegal can answer " +
  "it properly, and these services can help you reach one.";

/**
 * Shown when the chat has no verified content that answers the question.
 *
 * *** WHY IT SAYS WHAT WE LACK AND NOT WHAT THE LAW LACKS ***
 *
 * Decision 1, applied to a new surface. The library covers 16 of 37 positions,
 * so "we have not written this yet" is the commonest honest answer the chat can
 * give — and the tempting alternatives are both worse. Offering the nearest
 * block misleads twice, once about the answer and once about whether we had one.
 * Saying the rules do not cover it is a claim about the law that nothing in the
 * corpus can verify, and we have been wrong about exactly that twice before.
 */
export const CHAT_NO_MATCH_MESSAGE =
  "We don't have verified guidance that answers that yet. We only show steps we " +
  "have checked against the actual rules, and this is not one of them. The court " +
  "office where your case is filed can answer procedural questions, and the " +
  "services below can help you work out where you stand.";

/** Shown when the matter is outside Ontario or outside the three court paths. */
export const OUT_OF_SCOPE_MESSAGE =
  "CourtSimplified only covers Family, Small Claims and Civil matters in the " +
  "Ontario court system. We can't help with this one, but these services can " +
  "point you in the right direction.";
