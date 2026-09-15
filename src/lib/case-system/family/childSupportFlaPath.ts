/**
 * Child support on the FAMILY LAW ACT path — initial application, no existing
 * order, parties never married to each other.
 *
 * COSTS NOTHING. Static sourced content. No AI, no network, no calculation.
 *
 * *** WHICH PATH, AND THEREFORE WHICH TABLE ***
 *
 * This module is the FLA s. 33 path only. Where the parties were married to
 * each other the Divorce Act s. 15.1 applies and SOR/97-175 governs instead —
 * a different instrument, a different consolidation date, different
 * vocabulary. `statusTriage.marriedToOtherParty` is the fact that decides it,
 * and nothing here may be shown to a married applicant.
 *
 * THE TABLE IS NOT WHAT DIVIDES THEM. O. Reg. 303/24 revoked Schedule I of
 * O. Reg. 391/97 and rewrote its s. 2 (1) so that "table" means the table in
 * the federal Guidelines. One table, both paths. Which PROVINCE'S table turns
 * on where the parent or spouse against whom the order is sought ordinarily
 * resides — not where the case is filed.
 *
 * See docs/sources/ontario-child-support-guidelines.txt for the quoted s. 2
 * (1), and federal-child-support-table-structure.txt for the table's shape.
 *
 * *** WHAT THIS MODULE WILL NOT DO ***
 *
 * It never computes a support amount. FLA s. 33 (11) requires an order to be
 * made "in accordance with the child support guidelines", and the Guidelines
 * amount depends on Guidelines income, which s. 16 defines as the T1 General
 * "Total income" line ADJUSTED IN ACCORDANCE WITH SCHEDULE III, and which
 * ss. 17 to 20 let a court determine differently altogether. The table is also
 * a formula rather than a lookup cell. Every one of those is a step the site
 * states and the reader takes.
 */

export const ONTARIO_GUIDELINES_URL = "https://www.ontario.ca/laws/docs/970391_e.doc";
export const FLA_URL = "https://www.ontario.ca/laws/docs/90f03_e.doc";
export const FLR_URL = "https://www.ontario.ca/laws/docs/990114_e.doc";
export const FEDERAL_GUIDELINES_URL =
  "https://laws-lois.justice.gc.ca/eng/regulations/SOR-97-175/FullText.html";

export const CHILD_SUPPORT_VERIFIED_AT = "2026-09-15";

export type SupportElementId =
  | "child-is-one-the-parent-must-support"
  | "respondent-is-a-parent"
  | "children-and-ages-recorded"
  | "parenting-time-arrangement-recorded"
  | "guidelines-income-for-table-stated"
  | "guidelines-income-for-section-7-stated"
  | "section-7-expenses-recorded"
  | "income-documents-held";

export type SupportElement = {
  id: SupportElementId;
  name: string;
  /** What the provision says, in general terms. Never applied to the reader. */
  plainExplanation: string;
  sourceUrl: string;
  /** The provision, as a reader would cite it. */
  pinpoint: string;
  /**
   * True where the element exists only because a prior answer made it relevant.
   * A conditional element is NOT shown, and never holds the gate, when its
   * condition is unmet — see `appliesWhen`.
   */
  conditional?: boolean;
  /** Plain statement of when a conditional element applies. */
  appliesWhen?: string;
};

export const SUPPORT_ELEMENTS: SupportElement[] = [
  {
    id: "child-is-one-the-parent-must-support",
    name: "The child is one a parent has an obligation to support",
    plainExplanation:
      "Family Law Act s. 31 (1) provides that every parent has an obligation to provide support, to " +
      "the extent that the parent is capable of doing so, for their unmarried child who is a minor, " +
      "is enrolled in a full-time program of education, or is unable by reason of illness, disability " +
      "or other cause to withdraw from the charge of their parents. s. 31 (2) provides that the " +
      "obligation does not extend to a child who is sixteen or older and has withdrawn from parental " +
      "control.",
    sourceUrl: FLA_URL,
    pinpoint: "FLA s. 31",
  },
  {
    id: "respondent-is-a-parent",
    name: "The order is sought against a parent",
    plainExplanation:
      "Family Law Act s. 33 (1) provides that a court may, on application, order a person to provide " +
      "support for their dependants and determine the amount of support.",
    sourceUrl: FLA_URL,
    pinpoint: "FLA s. 33 (1)",
  },
  {
    id: "children-and-ages-recorded",
    name: "The children and their ages are recorded",
    plainExplanation:
      "The Guidelines amount depends on the number of children and whether a child is under the age " +
      "of majority: O. Reg. 391/97 s. 3 (1) sets the amount by reference to the number of children " +
      "under the age of majority, and s. 3 (2) provides a different approach where a child is the " +
      "age of majority or over.",
    sourceUrl: ONTARIO_GUIDELINES_URL,
    pinpoint: "O. Reg. 391/97 s. 3",
  },
  {
    id: "parenting-time-arrangement-recorded",
    name: "The parenting-time arrangement is recorded",
    plainExplanation:
      "Two provisions turn on the arrangement. O. Reg. 391/97 s. 8 applies where there are two or " +
      "more children and each parent has the majority of parenting time with one or more of them. " +
      "s. 9 applies where each parent exercises not less than 40% of parenting time with a child " +
      "over the course of a year, and requires the amount to be determined taking into account the " +
      "table amounts for each parent, the increased costs of the arrangement, and the conditions, " +
      "means, needs and other circumstances of each parent and child. Whether either applies to a " +
      "particular arrangement is for the court.",
    sourceUrl: ONTARIO_GUIDELINES_URL,
    pinpoint: "O. Reg. 391/97 ss. 8 and 9",
  },
  {
    id: "guidelines-income-for-table-stated",
    name: "An annual income figure for the table amount, and where it comes from",
    plainExplanation:
      "O. Reg. 391/97 s. 16 determines annual income using the sources of income under the heading " +
      "\"Total income\" in the T1 General form, adjusted in accordance with Schedule III. s. 15 (2) " +
      "provides that where both parties agree in writing on the annual income of a party, the court " +
      "may consider that amount to be their income if it thinks the amount is reasonable having " +
      "regard to the income information provided under s. 21.",
    sourceUrl: ONTARIO_GUIDELINES_URL,
    pinpoint: "O. Reg. 391/97 ss. 15, 16 and Schedule III",
  },
  {
    id: "guidelines-income-for-section-7-stated",
    name: "A separate annual income figure for special or extraordinary expenses",
    plainExplanation:
      "Schedule III treats spousal support differently depending on what is being calculated. Item 3 " +
      "applies \"to calculate income for the purpose of determining an amount under an applicable " +
      "table\" and deducts spousal support RECEIVED from the other party. Item 3.1 applies \"to " +
      "calculate income for the purpose of determining an amount under section 7\" and deducts " +
      "spousal support PAID to the other party. The two items also treat the universal child care " +
      "benefit differently. Where spousal support is paid or received, the two figures are not the " +
      "same number.",
    sourceUrl: ONTARIO_GUIDELINES_URL,
    pinpoint: "O. Reg. 391/97 Schedule III, items 3 and 3.1",
    conditional: true,
    appliesWhen:
      "Only where special or extraordinary expenses are claimed AND spousal support is paid or " +
      "received between the parties. Otherwise there is one income figure, not two, and this is " +
      "never asked.",
  },
  {
    id: "section-7-expenses-recorded",
    name: "Special or extraordinary expenses claimed, if any",
    plainExplanation:
      "O. Reg. 391/97 s. 7 (1) lets a court provide for an amount covering all or part of six listed " +
      "kinds of expense — child care resulting from the employment, illness, disability or education " +
      "of the parent with the majority of parenting time; the child's portion of medical and dental " +
      "insurance premiums; health-related expenses exceeding insurance reimbursement by at least " +
      "$100 annually; extraordinary expenses for primary or secondary school or other educational " +
      "programs meeting the child's particular needs; expenses for post-secondary education; and " +
      "extraordinary expenses for extracurricular activities. The court takes into account the " +
      "necessity of the expense in relation to the child's best interests and its reasonableness in " +
      "relation to the means of the parties and the family's spending pattern before separation.",
    sourceUrl: ONTARIO_GUIDELINES_URL,
    pinpoint: "O. Reg. 391/97 s. 7",
    conditional: true,
    appliesWhen: "Only where the applicant is claiming one or more of the six listed kinds of expense.",
  },
  {
    id: "income-documents-held",
    name: "The income documents the Guidelines require with the application",
    plainExplanation:
      "O. Reg. 391/97 s. 21 (1) requires an applicant whose income information is necessary to " +
      "determine the amount to include specified documents with the application, including personal " +
      "income tax returns and notices of assessment for each of the three most recent taxation " +
      "years, and — depending on the person's circumstances — recent statements of earnings, " +
      "financial statements of a business or professional practice, partnership or corporate " +
      "information, trust documents, and statements of income from other sources. Family Law Rules " +
      "r. 13 (1) separately requires a party making a support claim to serve and file a financial " +
      "statement with the document containing the claim.",
    sourceUrl: ONTARIO_GUIDELINES_URL,
    pinpoint: "O. Reg. 391/97 s. 21; FLR r. 13",
  },
];

/**
 * Circumstances in which a COURT determines the income figure rather than the
 * reader, shown alongside the income questions.
 *
 * ss. 17 to 20 are the familiar four. Schedule III items 9 and 12 belong with
 * them and are easy to miss, because they sit in a list that otherwise reads as
 * arithmetic: item 9 adds back non-arm's-length payments "unless the spouse
 * establishes that the payments were necessary to earn the self-employment
 * income and were reasonable in the circumstances", and item 12 deducts amounts
 * "properly required" for capitalization. Both turn on a burden of proof, not a
 * calculation, and neither is something a reader can settle for themselves.
 */
export const COURT_DETERMINES_INCOME: { pinpoint: string; summary: string }[] = [
  {
    pinpoint: "s. 17",
    summary:
      "Where the court is of the opinion that s. 16 would not be the fairest determination, it may " +
      "have regard to income over the last three years and determine an amount that is fair and " +
      "reasonable in light of any pattern, fluctuation, or non-recurring amount.",
  },
  {
    pinpoint: "s. 18",
    summary:
      "Where a person is a shareholder, director or officer of a corporation and the court is of the " +
      "opinion that s. 16 does not fairly reflect all the money available for support, the court may " +
      "include corporate pre-tax income or an amount commensurate with services provided.",
  },
  {
    pinpoint: "s. 19",
    summary:
      "The court may impute income in circumstances the section lists, including intentional " +
      "under-employment or unemployment, diverted income, property not reasonably used to generate " +
      "income, failure to provide income information when legally obliged to, and unreasonably " +
      "deducted expenses.",
  },
  {
    pinpoint: "s. 20",
    summary:
      "Where a person is a non-resident, income is generally determined as though they were a " +
      "resident of Canada, with a different rule where they reside where effective tax rates are " +
      "significantly higher.",
  },
  {
    pinpoint: "Schedule III, item 9",
    summary:
      "Salaries, benefits, wages or management fees paid to non-arm's-length persons and deducted " +
      "from net self-employment income are added back UNLESS the person establishes the payments " +
      "were necessary to earn the income and reasonable in the circumstances. That is something a " +
      "person must establish, not something to be calculated.",
  },
  {
    pinpoint: "Schedule III, item 12",
    summary:
      "Where income is earned through a partnership or sole proprietorship, an amount included in " +
      "income that is \"properly required\" by the business for capitalization is deducted. Whether " +
      "an amount is properly required is a judgment, not arithmetic.",
  },
];

/**
 * Schedule III's cross-references into the Income Tax Act, named but NOT
 * reproduced.
 *
 * Item 1 deducts a spouse's applicable employment expenses "described in the
 * following provisions of the Income Tax Act" and then lists thirteen
 * paragraphs by number. Items 10, 13 and 14 cross-refer to further ITA
 * sections.
 *
 * THE ITA IS NOT VENDORED AND IS NOT PARAPHRASED. Stating what any of these
 * paragraphs covers, from the number alone, would be writing law from memory.
 * The site names which paragraphs Schedule III points at and says plainly that
 * it is not reproducing them, so a reader knows exactly what to go and read.
 */
export const SCHEDULE_III_ITA_REFERENCES = {
  notReproduced:
    "Schedule III points at provisions of the Income Tax Act by number. CourtSimplified does not " +
    "reproduce or summarise them — what each covers has to be read in the Act itself.",
  item1Paragraphs: [
    "8(1)(d)",
    "8(1)(e)",
    "8(1)(f)",
    "8(1)(g)",
    "8(1)(h)",
    "8(1)(h.1)",
    "8(1)(i)",
    "8(1)(j)",
    "8(1)(l.1)",
    "8(1)(n)",
    "8(1)(o)",
    "8(1)(p)",
    "8(1)(q)",
  ],
  otherItems: [
    "Item 10 refers to Income Tax Act ss. 34.1 and 34.2 (additional amounts from self-employment earned in a prior period).",
    "Item 14 refers to Income Tax Act para. 60.03(2)(b) (a deemed split-pension amount).",
  ],
};

/**
 * What the Schedule III adjustments do, grouped by operation.
 *
 * Grouped this way deliberately. The "replace" items are why a T4 or Total
 * income figure is not merely a bit off: replacing the grossed-up taxable
 * amount of dividends with the actual amount received, and taxable capital
 * gains with actual gains net of actual losses, can move the figure
 * substantially in either direction. A reader who thinks the adjustments are
 * minor deductions has the wrong picture.
 */
export const SCHEDULE_III_SHAPE = {
  deduct: [
    "Item 1 — applicable employment expenses, by reference to thirteen Income Tax Act paragraphs",
    "Item 2 — child support received that is included in Total income",
    "Item 4 — social assistance income not attributable to the person",
    "Item 7 — actual business investment losses suffered in the year",
    "Item 8 — carrying charges and interest expenses deductible under the Income Tax Act",
    "Item 10 — self-employment income earned in a prior period, net of reserves",
    "Item 12 — partnership or sole proprietorship income properly required for capitalization",
    "Item 14 — a deemed split-pension amount included in Total income",
  ],
  replace: [
    "Item 5 — the TAXABLE amount of dividends from taxable Canadian corporations is replaced by the ACTUAL amount received",
    "Item 6 — TAXABLE capital gains are replaced by ACTUAL capital gains in excess of actual capital losses in that year",
  ],
  addBack: [
    "Item 9 — non-arm's-length salaries, benefits, wages or management fees deducted from net self-employment income",
    "Item 11 — a deduction for allowable capital cost allowance with respect to real property",
    "Item 13 — the spread on exercised employee stock options in a CCPC, deducted again on disposal of the shares",
  ],
  dependsOnWhatIsBeingCalculated: [
    "Item 3 — for the TABLE amount: deduct spousal support RECEIVED from the other party, and any universal child care benefit included in Total income",
    "Item 3.1 — for SECTION 7 expenses: deduct spousal support PAID to the other party, with universal child care benefits deducted or included depending on whether s. 7 expenses are being requested for that child",
  ],
};
