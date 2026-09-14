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

  // The jurisdictional elements of the six claim types authored 2026-09-14.
  // Same reason as the existing entries: checked against the amount already
  // captured, not a fact the user narrates. Excluded from the gate entirely,
  // so they cannot hold a draft the user can never release.
  {
    elementId: "amount-within-jurisdiction-goods-sold",
    reason:
      "Checked against the amount already captured in amountClaimedText. Not a fact the user narrates.",
  },
  {
    elementId: "amount-within-jurisdiction-cpa",
    reason:
      "Checked against the amount already captured in amountClaimedText. Not a fact the user narrates.",
  },
  {
    elementId: "amount-within-jurisdiction-vehicle",
    reason:
      "Checked against the amount already captured in amountClaimedText. Not a fact the user narrates.",
  },
  {
    elementId: "amount-within-jurisdiction-vehicle-accident",
    reason:
      "Checked against the amount already captured in amountClaimedText. Not a fact the user narrates.",
  },
  {
    elementId: "amount-within-jurisdiction-property-in-care",
    reason:
      "Checked against the amount already captured in amountClaimedText. Not a fact the user narrates.",
  },

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

  // ===================================================================
  // The six 4+-element claim types (2026-09-14).
  //
  // Authored after the claim-type matcher was fixed. Before that fix the
  // matcher returned null for essentially every story, so these claim types
  // were never reached and the bare attestation list was invisible. It is
  // visible now, which is why these exist.
  //
  // EVERY QUESTION ASKS FOR A FACT, NOT A CHARACTERISATION. The element
  // names are legal — existed-agreement-sale, duty-of-care-negligence,
  // breach-of-standard-of-care — and the tempting question is the element
  // name with a question mark. "Was there a contract?" asks the user to
  // answer the legal test. "What did you agree to, and how?" asks what
  // happened and leaves the test alone.
  //
  // The causation elements are the sharpest case. Asking "was the damage
  // caused by their breach" is the legal question. Asking "was any of it
  // there before" is a fact that bears on it.
  // ===================================================================

  // --- Non-payment for goods sold ---
  {
    id: "depth-goods-agreement",
    elementId: "existed-agreement-sale",
    text: "What did you and {defendantLabel} agree to, and how was it agreed?",
    slots: ["defendantLabel"],
    examples: ["a written order","a verbal agreement","an exchange of messages","an invoice they accepted"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-goods-delivered",
    elementId: "goods-delivered",
    text: "What did you send or hand over, and when?",
    examples: ["the delivery date","what was shipped","who signed for it"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-goods-amount-unpaid",
    elementId: "amount-unpaid-goods",
    text: "How much is still owing, and how did you work that out?",
    examples: ["the invoice total","part payments received","the arithmetic behind the figure"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // --- Consumer Protection Act issue ---
  {
    id: "depth-cpa-representation",
    elementId: "false-misleading-representation",
    text: "What were you told, who told you, and when?",
    examples: ["what was said in the shop","wording in an advertisement","a promise made on the phone"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-cpa-withdrawal",
    elementId: "withdrawal-notice-timely",
    text: "If you told them you were cancelling, when and how did you tell them?",
    examples: ["the date you told them","email, letter, or phone","what you said"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-cpa-loss",
    elementId: "loss-amount-cpa",
    text: "What did this cost you, and how did you arrive at that figure?",
    examples: ["what you paid","what you paid afterwards to put it right"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // --- Used vehicle, dealer non-disclosure ---
  {
    id: "depth-vehicle-disclosure",
    elementId: "dealer-failed-to-disclose",
    text: "What were you told about the vehicle's history before you bought it, and what did you find out afterwards?",
    examples: ["what the dealer said","what a history report showed","what a mechanic found"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // cancelled-within-90-days SPLIT INTO TWO. The delivery date is a fact
  // everyone in this situation has. The cancellation date only exists if they
  // cancelled, and asking both in one question makes a user who has not
  // cancelled feel they answered wrongly.
  {
    id: "depth-vehicle-delivery-date",
    elementId: "cancelled-within-90-days",
    text: "When did you actually receive the vehicle?",
    examples: ["the date you drove it away","the date it was delivered to you"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-vehicle-cancellation-date",
    elementId: "cancelled-within-90-days",
    text: "If you have told the dealer you are cancelling the contract, when did you tell them?",
    examples: ["the date you told them","how you told them","not applicable if you have not cancelled"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-vehicle-loss",
    elementId: "amount-claimed-vehicle",
    text: "What has this cost you, and how did you work that out?",
    examples: ["the purchase price","repairs you have paid for","what you paid to replace it"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // --- Vehicle accident, uninsured at-fault driver ---

  // dcpd-bar-does-not-apply is a LEGAL CONCLUSION and no fact question
  // resolves it. This asks the fact that usually decides it — whether the
  // other automobile was insured — and cites the provision so the reader can
  // see the rule rather than be told the answer. Insurance Act s. 263 (1) (c)
  // applies the section only where at least one OTHER automobile involved was
  // insured; s. 263 (5) (a) is what removes the right of action when it does.
  //
  // The element may stay unresolved, and that is safe: only `not-yet` holds
  // the readiness gate, and "I don't know" resolves to cannot-provide, which
  // does not. The element is then listed in the draft under RECORDED AS NOT
  // HELD rather than silently assumed.
  {
    id: "depth-accident-other-insurance",
    elementId: "dcpd-bar-does-not-apply",
    text: "What do you know about the other driver's insurance at the time of the accident?",
    examples: ["what the police report recorded","what your own insurer told you","what the other driver said at the scene"],
    why: "Ontario's direct-compensation scheme applies only where at least one other automobile involved in the accident was insured — Insurance Act, s. 263 (1) (c). Where it applies, s. 263 (5) (a) provides that an insured has no right of action against any person involved other than their own insurer for damage to their own automobile. Whether it applies to a particular accident is a legal question; whether the other driver was insured is a fact.",
    sourceUrl: "https://www.ontario.ca/laws/docs/90i08_e.doc",
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-accident-where-when",
    elementId: "duty-of-care-negligence",
    text: "Where and when did the accident happen, and who was driving?",
    examples: ["the road or intersection","the date and time","who was in each vehicle"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-accident-what-happened",
    elementId: "breach-of-standard-of-care",
    text: "What did the other driver do, in your own words?",
    examples: ["ran a red light","rear-ended you","changed lanes into you"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-accident-damage",
    elementId: "damage-to-vehicle",
    text: "What was damaged, and what state is it in now?",
    examples: ["which panels or parts","whether it still drives","photographs you have"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-accident-pre-existing",
    elementId: "causation-vehicle-accident",
    text: "Was any of the damage there before the accident?",
    examples: ["damage that was already there","what a repair estimate attributes to this collision"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // --- Property damaged or lost in a business's care ---
  {
    id: "depth-bailment-what-left",
    elementId: "duty-of-care-property-in-business-care",
    text: "What did you leave with them, and what was the arrangement?",
    examples: ["what you dropped off","the date you left it","a ticket or receipt you were given"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // Ordered so the user's own account comes FIRST. Asking what the business
  // said, on its own, records only the business's version of events in the
  // user's own case file.
  {
    id: "depth-bailment-what-happened",
    elementId: "breach-of-standard-of-care-property-in-care",
    text: "What happened to it while it was in their care, as far as you know?",
    examples: ["what you found when you collected it","what you were able to see","what you were told by anyone else"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-bailment-their-account",
    elementId: "breach-of-standard-of-care-property-in-care",
    text: "What did the business tell you had happened?",
    examples: ["what staff said","what a manager said","what a written response said"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-bailment-condition",
    elementId: "damage-or-loss-to-property-in-care",
    text: "What condition was it in when you left it, and what condition was it in when you got it back?",
    examples: ["photographs before","photographs after","what is missing"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-bailment-pre-existing",
    elementId: "causation-property-in-care",
    text: "Was there anything wrong with it before you left it with them?",
    examples: ["existing wear or marks","a previous repair"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // --- Contractor damage: the one element of four still unauthored ---
  {
    id: "depth-contractor-loss",
    elementId: "loss-amount-contractor",
    text: "What will it cost to put right, and where does that figure come from?",
    examples: ["a repair quote","an invoice you have already paid","more than one estimate"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

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
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-12",
  },
  {
    id: "depth-debt-work-done",
    elementId: "services-or-money-provided",
    text: "What did you provide, and when?",
    examples: ["the dates work started and finished", "what was delivered", "when the money was lent"],
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
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-12",
  },
  {
    id: "depth-contractor-damage",
    elementId: "work-caused-damage",
    text: "What was damaged or left different from what was agreed?",
    examples: ["what was affected", "when it was noticed", "what condition it was in before"],
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
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-12",
  },
  {
    id: "depth-loan-unpaid",
    elementId: "amount-remains-unpaid-personal-loan",
    text: "Has any of it been repaid?",
    examples: ["a partial repayment and its date", "nothing has been repaid"],
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
