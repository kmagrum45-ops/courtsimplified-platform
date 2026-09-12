/**
 * Authored depth questions, keyed by claim-type ELEMENT ID.
 *
 * Three authoring states per element (design section 1):
 *
 *   | authored question | a reviewed question targeting this element's fact  |
 *   | noQuestionNeeded  | jurisdictional/procedural — no user-narrated fact  |
 *   | not yet authored  | falls back to readiness attestation, i.e. today's  |
 *   |                   | behaviour. NEVER to a generated question.          |
 *
 * The fallback matters more than coverage: an unauthored element degrades to
 * exactly what happens today, never to a bad question. That is what makes this
 * incrementally shippable.
 *
 * A CORRECTION TO THE DESIGN'S COST ARGUMENT, recorded here because the next
 * person to author will hit it. Design section 1 argues authoring is cheap
 * because elements recur — "the single name 'The amount claimed falls within
 * Small Claims Court's jurisdiction' appears 8 times". That is true BY NAME.
 * It is not true by id: all 75 element ids in claimTypes.ts are distinct, so
 * keying by id yields ZERO reuse. Worse, the 11 recurring jurisdictional
 * entries are exactly the noQuestionNeeded category, which needs no authoring
 * anyway. Real reuse among askable elements is 3 names covering 6 entries.
 *
 * So the honest burden is roughly 64 authored questions, not "133 minus heavy
 * reuse". Keying by id is still correct — ids are the stable handle and a
 * shared name across two claim types does not guarantee the same question is
 * apt — but the saving the design projected is not there.
 *
 * CLAUDE.md section 2: any question whose `text` or `why` states a legal or
 * procedural fact carries `sourceUrl`. Questions that only elicit a fact from
 * the user's own experience state no legal fact and need none.
 *
 * CLAUDE.md section 3: a question asks for a fact and stops. No question text
 * and no `examples` entry may indicate that one answer is better than another.
 * `examples` must not be ordered best-to-worst. Enforced by
 * verifyDepthQuestions.ts, not left to reviewer memory.
 */

import type { SlotName } from "./slots";

export type DepthQuestion = {
  id: string;
  /** The claimTypes.ts PlaintiffElement.id this question targets. */
  elementId: string;
  /**
   * Authored text, which may contain slots (see slots.ts). Must read
   * correctly with every slot defaulted.
   */
  text: string;
  /** Slots this question uses, declared so the harness can check them. */
  slots?: SlotName[];
  /** Neutral examples of the KIND of answer wanted. Never ranked. */
  examples?: string[];
  /** States a legal fact only if sourceUrl is also set (CLAUDE.md section 2). */
  why?: string;
  sourceUrl?: string;
  /**
   * Terms that mean the user already covered this in their own words.
   * Authored next to the question so a reviewer can read both together.
   */
  coveredWhenMentioned: string[];
  /**
   * PROPERTY 4: mandatory and always true. Typed as the literal so a question
   * with an unknown-dead-end cannot be written at all.
   */
  allowUnknown: true;
  /** selectQuestions.ts's existing convention: only "reviewed" is askable. */
  status: "draft" | "reviewed";
  /** Mirrors questionBank.ts: the date the site owner reviewed this entry. */
  reviewedAt: string | null;
};

/** Elements with no user-narrated fact behind them. Explicit, not absent. */
export type NoQuestionNeeded = {
  elementId: string;
  reason: string;
};

/**
 * Jurisdictional and procedural elements. These are legal conditions checked
 * against facts already captured, not things a user narrates. Marking them
 * explicitly is what stops them reading as an authoring gap.
 */
export const NO_QUESTION_NEEDED: NoQuestionNeeded[] = [
  {
    elementId: "amount-within-jurisdiction-defamation",
    reason:
      "Checked against the amount already captured in amountClaimedText. Not a fact the user narrates.",
  },
  {
    elementId: "amount-within-jurisdiction-contractor",
    reason:
      "Checked against the amount already captured in amountClaimedText. Not a fact the user narrates.",
  },
  {
    elementId: "amount-within-jurisdiction-personal-loan",
    reason:
      "Checked against the amount already captured in amountClaimedText. Not a fact the user narrates.",
  },
];

/**
 * Authored questions. Deliberately a small, reviewed set across four different
 * claim categories rather than thin coverage everywhere — unauthored elements
 * degrade safely, so partial coverage is the intended shipping state.
 */
export const DEPTH_QUESTIONS: DepthQuestion[] = [
  // --- debt / services ---
  {
    id: "depth-debt-agreement",
    elementId: "existed-agreement-or-understanding",
    text: "How was the arrangement with {defendantLabel} set up?",
    slots: ["defendantLabel"],
    examples: [
      "a written contract",
      "a verbal agreement",
      "an exchange of messages",
      "a purchase order",
    ],
    coveredWhenMentioned: ["contract", "agreement", "quote", "invoice", "signed", "verbal", "agreed"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-12",
  },
  {
    id: "depth-debt-work-done",
    elementId: "services-or-money-provided",
    text: "What did you provide, and when?",
    examples: ["the dates work started and finished", "what was delivered", "when the money was lent"],
    coveredWhenMentioned: ["provided", "delivered", "completed", "finished", "worked", "lent", "loaned"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-12",
  },
  {
    id: "depth-debt-amount-unpaid",
    elementId: "amount-unpaid",
    text: "Has any part of {amountLabel} been paid?",
    slots: ["amountLabel"],
    examples: ["a partial payment and its date", "nothing has been paid", "a payment that was reversed"],
    coveredWhenMentioned: ["paid", "payment", "partial", "deposit", "instalment", "unpaid", "outstanding"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-12",
  },

  // --- defamation ---
  {
    id: "depth-defamation-communicated",
    elementId: "statement-made-and-communicated",
    text: "Apart from you, who saw or heard {subjectLabel}?",
    slots: ["subjectLabel"],
    // Deliberately NO `why` and no sourceUrl.
    //
    // The first draft carried "A claim in defamation concerns a statement
    // communicated to someone other than the person it is about", cited to the
    // Libel and Slander Act. Retrieving the Act (90l12_e.doc) showed it does
    // NOT say that: s. 2 deems defamatory words in a newspaper or broadcast to
    // be published and to constitute libel, which is narrower and different.
    // The general third-party publication rule is common law, and CLAUDE.md
    // section 2 forbids citing from recall.
    //
    // The question asks for a fact and states no legal proposition, so it
    // needs no citation at all. The element's own plainExplanation in
    // claimTypes.ts already carries the reviewed legal framing.
    examples: ["named people who saw it", "a public post", "people at a meeting"],
    coveredWhenMentioned: ["posted", "said", "told", "wrote", "shared", "sent", "published", "saw", "heard"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-12",
  },
  {
    id: "depth-defamation-newspaper-notice",
    elementId: "notice-if-newspaper-or-broadcast",
    text: "Did this involve a newspaper or a broadcast?",
    // Verified 2026-09-12 by retrieving https://www.ontario.ca/laws/docs/90l12_e.doc
    // (plain _e.doc = current consolidation) and reading ss. 5(1) and 6:
    //   s. 5(1) "No action for libel in a newspaper or in a broadcast lies
    //            unless the plaintiff has, within six weeks after the alleged
    //            libel has come to the plaintiff's knowledge, given to the
    //            defendant notice in writing..."
    //   s. 6    "...shall be commenced within three months after the libel has
    //            come to the knowledge of the person defamed..."
    // Same URL the reviewed element in claimTypes.ts already cites.
    why:
      "The Libel and Slander Act sets specific notice and limitation requirements for libel in a newspaper or in a broadcast.",
    sourceUrl: "https://www.ontario.ca/laws/docs/90l12_e.doc",
    examples: ["a newspaper article", "a radio or television segment", "neither"],
    coveredWhenMentioned: ["newspaper", "broadcast", "radio", "television", "tv", "article", "journalist"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-12",
  },

  // --- contractor damage ---
  {
    id: "depth-contractor-agreement",
    elementId: "existed-agreement-contractor",
    text: "What was agreed with {defendantLabel} about the work?",
    slots: ["defendantLabel"],
    examples: ["a written quote", "a scope of work", "a verbal arrangement"],
    coveredWhenMentioned: ["quote", "contract", "agreement", "estimate", "scope", "hired", "agreed"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-12",
  },
  {
    id: "depth-contractor-damage",
    elementId: "work-caused-damage",
    text: "What was damaged or left different from what was agreed?",
    examples: ["what was affected", "when it was noticed", "what condition it was in before"],
    coveredWhenMentioned: ["damage", "damaged", "broke", "broken", "cracked", "leak", "ruined", "redo", "redone"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-12",
  },
  {
    id: "depth-contractor-loss",
    elementId: "loss-amount-contractor",
    text: "How was {amountLabel} worked out?",
    slots: ["amountLabel"],
    examples: ["a repair invoice", "a replacement quote", "an estimate from someone else"],
    coveredWhenMentioned: ["estimate", "quote", "invoice", "receipt", "cost", "paid", "repair"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-12",
  },

  // --- personal loan ---
  {
    id: "depth-loan-agreement",
    elementId: "loan-agreement-existed",
    text: "What was said or written about repaying the money?",
    examples: ["a repayment date", "instalments", "a message about paying it back", "nothing specific"],
    coveredWhenMentioned: ["repay", "pay back", "loan", "lent", "borrowed", "agreed", "promised"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-12",
  },
  {
    id: "depth-loan-unpaid",
    elementId: "amount-remains-unpaid-personal-loan",
    text: "Has any of it been repaid?",
    examples: ["a partial repayment and its date", "nothing has been repaid"],
    coveredWhenMentioned: ["repaid", "paid", "payment", "partial", "returned", "still owes", "outstanding"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-12",
  },
];

const BY_ELEMENT_ID = new Map<string, DepthQuestion[]>();
for (const question of DEPTH_QUESTIONS) {
  const list = BY_ELEMENT_ID.get(question.elementId) || [];
  list.push(question);
  BY_ELEMENT_ID.set(question.elementId, list);
}

const NO_QUESTION_IDS = new Set(NO_QUESTION_NEEDED.map((entry) => entry.elementId));

export function questionsForElement(elementId: string): DepthQuestion[] {
  return BY_ELEMENT_ID.get(elementId) || [];
}

export function isNoQuestionNeeded(elementId: string): boolean {
  return NO_QUESTION_IDS.has(elementId);
}
