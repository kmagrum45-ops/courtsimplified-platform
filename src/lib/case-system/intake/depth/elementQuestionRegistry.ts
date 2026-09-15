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

  // Child support, FLA s. 33 path (2026-09-15).
  {
    elementId: "children-and-ages-recorded",
    reason:
      "Recorded by the s. 31 question, which asks the age of each child and what each is doing. " +
      "Not separately narrated. The sourced element list keeps this element because O. Reg. " +
      "391/97 s. 3 genuinely turns on the number of children and whether a child is the age of " +
      "majority — the element is real, the second question would not be.",
  },


  // The jurisdictional elements of the remaining fourteen (2026-09-14).
  //
  // NAMING PROBLEM, recorded and deliberately NOT fixed here:
  // `amount-owing-commercial` and `amount-within-jurisdiction-condo` read as
  // jurisdiction tests but their names bundle "the amount owing" into the
  // same element. Renaming them is not an authoring change — element ids
  // reach the readiness gate and the draft engine, and any rename needs the
  // fixtures regenerated. See OUTSTANDING_ISSUES.
  {
    elementId: "amount-within-jurisdiction",
    reason:
      "Checked against the amount already captured in amountClaimedText. Not a fact the user narrates.",
  },
  {
    elementId: "value-within-jurisdiction-property",
    reason:
      "Checked against the amount already captured in amountClaimedText. Not a fact the user narrates.",
  },
  {
    elementId: "amount-owing-commercial",
    reason:
      "Checked against the amount already captured in amountClaimedText. Not a fact the user narrates.",
  },
  {
    elementId: "amount-within-jurisdiction-wages",
    reason:
      "Checked against the amount already captured in amountClaimedText. Not a fact the user narrates.",
  },
  {
    elementId: "amount-within-jurisdiction-condo",
    reason:
      "Checked against the amount already captured in amountClaimedText. Not a fact the user narrates.",
  },


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
  // CHILD SUPPORT — Family Law Act s. 33 path (2026-09-15).
  //
  // Element ids are distinct from the Small Claims ones, so these live in
  // the same registry and reuse selectDepthQuestions, the readiness gate and
  // allowUnknown unchanged. See family/childSupportFlaPath.ts for the sourced
  // elements and for which instrument governs — one table, two instruments.
  //
  // CONDITIONAL ELEMENTS ARE OMITTED, NOT DEFAULTED. Two of the eight only
  // exist in some cases. The caller passes the applicable elements to
  // selectDepthQuestions; an element that does not apply is never passed, so
  // it is never asked and cannot hold the gate. That is the whole mechanism —
  // there is no 'not applicable' answer to record.
  // ===================================================================

  {
    id: "depth-cs-children-ages",
    elementId: "child-is-one-the-parent-must-support",
    text: "How old is each child, and what is each of them doing now?",
    examples: ["ages","at school full time","working","living with you"],
    why: "Family Law Act s. 31 (1) sets the obligation for an unmarried child who is a minor, is enrolled in a full-time program of education, or is unable by reason of illness, disability or other cause to withdraw from the charge of their parents. s. 31 (2) provides the obligation does not extend to a child who is sixteen or older and has withdrawn from parental control. Which of those describes a particular child is for the court.",
    sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-15",
  },
  {
    id: "depth-cs-other-parent",
    elementId: "respondent-is-a-parent",
    text: "Who is the other parent, and what is their relationship to the children?",
    examples: ["their full name","whether they are named on the birth registration","whether they live with the children"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-15",
  },

  // ss. 8 and 9 turn on "the majority of parenting time" and "not less than
  // 40%". Those are the court's thresholds. This asks days and nights and
  // never says whether a threshold is met.
  {
    id: "depth-cs-parenting-time",
    elementId: "parenting-time-arrangement-recorded",
    text: "In a typical year, roughly how many days or nights do the children spend with each of you?",
    examples: ["most nights with one of you","an alternating weekly schedule","roughly even","different for different children"],
    why: "O. Reg. 391/97 s. 8 applies where there are two or more children and each parent has the majority of parenting time with one or more of them. s. 9 applies where each parent exercises not less than 40% of parenting time with a child over the course of a year. Whether either applies to a particular arrangement is determined by the court, not by this answer.",
    sourceUrl: "https://www.ontario.ca/laws/docs/970391_e.doc",
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-15",
  },

  // THE INCOME QUESTION. Asked of everyone, once. The second income question
  // below is asked only where spousal support moves between the parties.
  {
    id: "depth-cs-income-table",
    elementId: "guidelines-income-for-table-stated",
    text: "What figure are you using for annual income, and where does that figure come from?",
    examples: ["line 15000 of a tax return","a notice of assessment","a figure you and the other parent agreed in writing","an estimate you have worked out yourself"],
    why: "O. Reg. 391/97 s. 16 determines annual income using the sources under \"Total income\" in the T1 General form, adjusted in accordance with Schedule III — so the figure on a T4 or a tax return is the starting point rather than the answer. s. 15 (2) provides that where both parties agree in writing on the annual income of a party, the court may consider that amount to be their income if it thinks the amount is reasonable having regard to the income information provided under s. 21. ss. 17 to 20, and Schedule III items 9 and 12, set out circumstances in which the court determines the figure instead.",
    sourceUrl: "https://www.ontario.ca/laws/docs/970391_e.doc",
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-15",
  },

  // --- Special or extraordinary expenses (conditional element) ---
  //
  // The FIRST question here is a ROUTING question. It decides whether the
  // second income element applies at all. It is attached to this element
  // rather than made an element of its own, deliberately: a question whose
  // only job is routing must not be able to hold the readiness gate.
  {
    id: "depth-cs-spousal-support-gate",
    elementId: "section-7-expenses-recorded",
    text: "Does spousal support get paid between you and the other parent, in either direction?",
    examples: ["you pay it","you receive it","neither","not sure yet"],
    why: "Schedule III treats spousal support differently depending on what is being calculated. Item 3, for the table amount, deducts spousal support RECEIVED from the other party. Item 3.1, for section 7 expenses, deducts spousal support PAID to the other party. Where support moves between the parties the two income figures are different numbers, which is why this is asked before the expenses.",
    sourceUrl: "https://www.ontario.ca/laws/docs/970391_e.doc",
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-15",
  },
  {
    id: "depth-cs-section-7-expenses",
    elementId: "section-7-expenses-recorded",
    text: "What extra costs are you paying for the children, and roughly how much a year?",
    examples: ["child care while you work","orthodontics or other health costs above what insurance covers","a school programme","an activity the children do"],
    why: "O. Reg. 391/97 s. 7 (1) lets a court provide for an amount covering all or part of six listed kinds of expense, taking into account the necessity of the expense in relation to the child's best interests and its reasonableness in relation to the means of the parties and the family's spending pattern before separation. s. 7 (1.1) defines what makes an expense \"extraordinary\". Whether a particular cost is necessary, reasonable or extraordinary is the court's assessment — this records what is being paid.",
    sourceUrl: "https://www.ontario.ca/laws/docs/970391_e.doc",
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-15",
  },
  {
    id: "depth-cs-insurance-share",
    elementId: "section-7-expenses-recorded",
    text: "What does the children's share of any medical or dental insurance premiums come to?",
    examples: ["from a benefits statement","the difference between single and family coverage"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-15",
  },

  // --- The second income figure (conditional element) ---
  //
  // Reached ONLY where s. 7 expenses are claimed AND spousal support moves
  // between the parties. Anyone else never sees a second income question, and
  // the element is never passed to the gate.
  {
    id: "depth-cs-income-section-7",
    elementId: "guidelines-income-for-section-7-stated",
    text: "Because spousal support moves between you, the Guidelines use a different income figure for special expenses than for the table amount. What figure are you using for the special-expenses calculation, and where does it come from?",
    examples: ["the same starting figure with spousal support paid deducted instead of received","a figure from a tax return adjusted differently","a figure you and the other parent agreed in writing"],
    why: "Schedule III item 3 applies \"to calculate income for the purpose of determining an amount under an applicable table\" and deducts the spousal support RECEIVED from the other party. Item 3.1 applies \"to calculate income for the purpose of determining an amount under section 7\" and deducts the spousal support PAID to the other party. The two items also treat the universal child care benefit differently. Where spousal support moves between the parties these are not the same number, and using one where the other belongs changes the amount.",
    sourceUrl: "https://www.ontario.ca/laws/docs/970391_e.doc",
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-15",
  },

  // --- The income documents ---
  //
  // MUST NOT BLOCK. s. 21 lists what a court requires; a user who has none of
  // it still needs a draft and the list. "I don't know" resolves to
  // cannot-provide, the gate does not hold on it, and the draft carries the
  // checklist under RECORDED AS NOT HELD. Getting this wrong recreates the
  // permanent-block defect recorded as OUTSTANDING_ISSUES section 32.
  {
    id: "depth-cs-income-documents",
    elementId: "income-documents-held",
    text: "Which of the income documents do you have to hand?",
    examples: ["tax returns for the last three years","notices of assessment for those years","a recent statement of earnings from an employer","financial statements for a business","none of these yet"],
    why: "O. Reg. 391/97 s. 21 (1) requires an applicant whose income information is necessary to determine the amount to include specified documents with the application, including personal income tax returns and notices of assessment for each of the three most recent taxation years, and further documents depending on whether the person is an employee, self-employed, a partner, a corporate controller or a trust beneficiary. Family Law Rules r. 13 (1) separately requires a party making a support claim to serve and file a financial statement with the document containing the claim.",
    sourceUrl: "https://www.ontario.ca/laws/docs/970391_e.doc",
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-15",
  },


  // ===================================================================
  // The remaining fourteen claim types (2026-09-14).
  //
  // Same rule as the batch above: every question asks for a FACT. Where an
  // element states a legal classification the user cannot answer, the
  // question asks the facts that bear on it and the provision is cited so
  // the reader can see the rule. Two do that explicitly — see the notes on
  // tenancy-is-commercial-not-residential and contract-covered-by-cooling-off.
  // ===================================================================

  // --- Slip and fall / occupier's liability ---
  {
    id: "depth-slip-occupier",
    elementId: "defendant-was-occupier",
    text: "Whose property was it, and what do you know about who looks after it?",
    examples: ["the business name on the door","who you reported it to","a landlord or property manager"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-slip-condition",
    elementId: "premises-not-reasonably-safe",
    text: "What was the condition that caused the fall, and what did it look like?",
    examples: ["ice that had not been cleared","a broken step","water on the floor","no warning sign"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-slip-injury",
    elementId: "injury-and-connection",
    text: "What injury did you have, and what treatment did you get?",
    examples: ["where you were hurt","whether you saw a doctor","time off work"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // --- Improper or unauthorized towing ---
  {
    id: "depth-tow-where-parked",
    elementId: "towed-without-consent",
    text: "Where was the vehicle parked when it was towed, and what were you told about why?",
    examples: ["a sign at the lot","what the tow operator said","where you found it"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-tow-rate-disclosure",
    elementId: "no-rate-disclosure",
    text: "Were you given anything in writing about the cost before or when you paid?",
    examples: ["an invoice","a posted rate sheet","nothing at all"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // --- Breach of contract, goods ---
  {
    id: "depth-goods-contract-agreement",
    elementId: "existed-agreement-goods",
    text: "What did you agree to buy, and how was it agreed?",
    examples: ["an online order","a written quote","a verbal agreement"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-goods-not-as-agreed",
    elementId: "goods-not-as-agreed",
    text: "What did you receive, and how did it differ from what you expected?",
    examples: ["it never arrived","it arrived damaged","it was a different model"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-goods-contract-loss",
    elementId: "loss-amount-goods",
    text: "What did this cost you, and how did you work that out?",
    examples: ["what you paid","what a replacement cost"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // --- Wrongful dismissal ---
  {
    id: "depth-dismissal-dates",
    elementId: "minimum-employment-length",
    text: "When did you start, and when did your employment end?",
    examples: ["your first day","your last day","what a record of employment shows"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-dismissal-notice",
    elementId: "notice-or-pay-not-given",
    text: "What notice or payment were you given when your employment ended?",
    examples: ["how much warning you had","any payment you received","what a termination letter said"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // --- Dog bite (Dog Owners' Liability Act) ---
  {
    id: "depth-dog-what-happened",
    elementId: "dog-caused-bite-or-attack",
    text: "What happened, and where were you when it happened?",
    examples: ["the date and place","what the dog did","whether anyone else saw it"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-dog-owner",
    elementId: "defendant-is-owner",
    text: "What do you know about who the dog belongs to?",
    examples: ["a name and address","what they said at the scene","what animal services recorded"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-dog-loss",
    elementId: "loss-amount-dog-bite",
    text: "What did this cost you, and how did you work that out?",
    examples: ["medical costs","damaged clothing","time off work"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // --- Breach of contract, services ---
  {
    id: "depth-services-agreement",
    elementId: "existed-agreement-services",
    text: "What work did you agree to, and how was it agreed?",
    examples: ["a written quote","a verbal agreement","messages setting it out"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-services-what-done",
    elementId: "service-not-performed-or-substandard",
    text: "What was actually done, and how did it differ from what you agreed?",
    examples: ["never started","stopped partway","done differently from what was agreed"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-services-loss",
    elementId: "loss-amount-services",
    text: "What did this cost you, and how did you work that out?",
    examples: ["what you paid","what someone else charged to finish it"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // --- Recovery of personal property ---
  {
    id: "depth-property-ownership",
    elementId: "plaintiff-owns-or-has-right-to-property",
    text: "What are the items, and how did you come to have them?",
    examples: ["you bought them","you inherited them","a receipt or photograph"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-property-possession",
    elementId: "defendant-possesses-and-wont-return",
    text: "How did they come to have the items, and what have you asked them?",
    examples: ["you lent them","left behind after moving out","messages asking for them back"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // --- Cancelled contract, refund (Consumer Protection Act) ---

  // Whether an agreement falls into a category carrying a statutory
  // cancellation right is a legal classification, and the periods differ by
  // category. The question asks what the agreement was for and where it was
  // signed — facts that bear on it — and cites the sections so the reader can
  // see the categories. A user cannot know their category without seeing the
  // categories, and the site does not pick one for them.
  {
    id: "depth-cancel-agreement-type",
    elementId: "contract-covered-by-cooling-off",
    text: "What was the agreement for, and where did you sign it?",
    examples: ["a gym or club membership","a door-to-door sale","signed at home, in a shop, or online"],
    why: "The Consumer Protection Act, 2002 gives a cancellation right for particular kinds of agreement, and the period differs between them: 10 days for a time share agreement (s. 28), personal development services such as a gym membership (s. 35), a direct agreement — one made in person somewhere other than the supplier's place of business (s. 43), and loan brokering or credit repair (s. 51); and seven days for an internet agreement (s. 40) or a remote agreement (s. 47), each of those conditional on the supplier having failed a disclosure requirement. Which category an agreement falls into is a legal question.",
    sourceUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-cancel-notice",
    elementId: "cancellation-given",
    text: "How and when did you tell them you were cancelling?",
    examples: ["the date","email, letter, or phone","what you said"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-cancel-refund",
    elementId: "refund-not-received-in-time",
    text: "What have you received back, and when?",
    examples: ["nothing","a partial refund","the date it arrived"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // --- Commercial tenancy ---

  // This is the one where getting it wrong costs the most. A RESIDENTIAL
  // tenancy goes to the Landlord and Tenant Board, not Small Claims Court,
  // and a person may not discover that until they are standing in the wrong
  // forum. So the question asks what the premises are used for and who
  // occupies them — facts — and cites the provisions that draw the line.
  // Nothing here classifies the tenancy.
  {
    id: "depth-commercial-use",
    elementId: "tenancy-is-commercial-not-residential",
    text: "What are the premises used for, and does anyone live there?",
    examples: ["a shop, office, or unit","a building with flats above","whether anyone lives on the premises"],
    why: "The Residential Tenancies Act, 2006 applies \"with respect to rental units in residential complexes\" (s. 3 (1)), and s. 2 defines a rental unit as living accommodation used or intended for use as rented residential premises. s. 5 lists what the Act does not apply to, including hotel and seasonal accommodation and accommodation tied to farm employment. Where the Act applies, the Landlord and Tenant Board has the dispute rather than the Small Claims Court. Which side of that line a particular tenancy falls on is a legal question.",
    sourceUrl: "https://www.ontario.ca/laws/docs/06r17_e.doc",
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-commercial-terms",
    elementId: "existed-agreement-commercial-lease",
    text: "What terms did you agree, and how were they set out?",
    examples: ["a signed lease","the monthly rent","the length of the term"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // --- Dishonoured (NSF) cheque ---
  {
    id: "depth-nsf-cheque-for",
    elementId: "payment-made-by-cheque",
    text: "What was the cheque for, and when did you receive it?",
    examples: ["the amount","the date written on it","what it was paying for"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-nsf-returned",
    elementId: "cheque-returned-nsf",
    text: "What did your bank tell you when the cheque did not clear?",
    examples: ["the reason given","the date it was returned","a notice from the bank"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-nsf-outstanding",
    elementId: "amount-unpaid-nsf",
    text: "Has any of it been paid since, and how much is still owing?",
    examples: ["a replacement payment","a part payment","nothing since"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // --- Unpaid overtime or vacation pay ---
  {
    id: "depth-wages-overtime",
    elementId: "overtime-not-paid",
    text: "What hours did you work beyond your normal hours, and what were you paid for them?",
    examples: ["your usual weekly hours","the extra hours worked","what your pay stubs show"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-wages-vacation",
    elementId: "vacation-pay-not-paid",
    text: "What vacation did you take or build up, and what vacation pay did you receive?",
    examples: ["days taken","what your pay stubs show","what you were told"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // --- Vehicle repair dispute ---
  {
    id: "depth-repair-estimate",
    elementId: "estimate-or-max-agreed",
    text: "Before the work started, what were you told it would cost, and was any of it in writing?",
    examples: ["a written estimate","a figure given over the phone","nothing said about cost"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-repair-charged",
    elementId: "charged-over-permitted-limit",
    text: "What were you charged in the end, and how does that compare to what you were told?",
    examples: ["the final invoice","the original figure","the difference between them"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-repair-claim",
    elementId: "amount-claimed-repair",
    text: "What are you asking for, and how did you work that out?",
    examples: ["the overcharge","what a second shop charged to put it right"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // --- Unpaid condominium common expenses ---
  {
    id: "depth-condo-parties",
    elementId: "plaintiff-is-condo-corp",
    text: "What is the corporation, and which unit is this about?",
    examples: ["the corporation's name and number","the unit number","who owns the unit"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },
  {
    id: "depth-condo-arrears",
    elementId: "owner-defaulted-common-expenses",
    text: "Which payments were missed, and for what period?",
    examples: ["the months unpaid","the monthly amount","any partial payments received"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },

  // --- Defamation: the one element of four still unauthored ---
  {
    id: "depth-defamation-publication",
    elementId: "limitation-if-newspaper-or-broadcast",
    text: "Was any of this published in a newspaper or broadcast, and if so, when?",
    examples: ["a newspaper or news website article","a radio or television broadcast","the date it appeared"],
    allowUnknown: true,
    status: "reviewed",
    reviewedAt: "2026-09-14",
  },


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
