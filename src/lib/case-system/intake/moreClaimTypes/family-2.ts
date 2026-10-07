/**
 * Case types, batch "family-2" (family): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/family-2.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   family-matter-section-7-expenses -- Sharing special child expenses (section 7)
 *   family-matter-undue-hardship -- Asking for different child support because of undue hardship
 *   family-matter-imputing-income -- When a parent's income is not what they say
 *   family-matter-retroactive-support -- Support owed for the past (retroactive support)
 *   family-matter-parenting-plan-change -- Changing a parenting order
 *   family-matter-denied-parenting-time -- Parenting time not being followed
 *   family-matter-annulment-or-validity-of-marriage -- Whether a marriage is valid
 *   family-matter-marriage-contract -- A marriage contract or cohabitation agreement
 *   family-matter-child-protection -- A children's aid society is involved with your child
 *   family-matter-unequal-division -- Asking for an unequal division of property
 *
 * Every legal statement below comes from text saved in docs/sources/corpus/
 * (the Family Law Act, Family Law Rules, Children's Law Reform Act, Ontario
 * Child Support Guidelines, Limitations Act, 2002, Marriage Act, Courts of
 * Justice Act, Child, Youth and Family Services Act, 2017 and Divorce Act).
 * No court decision is cited: the Supreme Court decisions on retroactive
 * support saved under docs/sources/decisions/ (D.B.S. v. S.R.G., Colucci,
 * Michel v. Graydon) have no verified public page in publicSourceUrl.ts, so
 * the retroactive-support entry rests on the statutes alone. The grounds on
 * which a marriage is void or voidable are not in any saved text, so the
 * validity-of-marriage entry states only the Marriage Act's requirements,
 * its good-faith rule, the Family Law Act's treatment of a void or voidable
 * marriage, and where the proceeding is heard.
 */

import type { ClaimType } from "../claimTypes";

const FLA = "https://www.ontario.ca/laws/docs/90f03_e.doc";
const FLA_CONSOLIDATION = "2026-05-01";
const FLR = "https://www.ontario.ca/laws/docs/990114_e.doc";
const FLR_CONSOLIDATION = "2026-09-18";
const CLRA = "https://www.ontario.ca/laws/docs/90c12_e.doc";
const CLRA_CONSOLIDATION = "2025-12-11";
const CSG = "https://www.ontario.ca/laws/docs/970391_e.doc";
const CSG_CONSOLIDATION = "2024-07-26";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_CONSOLIDATION = "2024-12-04";
const MARRIAGE = "https://www.ontario.ca/laws/docs/90m03_e.doc";
const MARRIAGE_CONSOLIDATION = "2025-12-11";
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const CJA_CONSOLIDATION = "2025-12-11";
const CYFSA = "https://www.ontario.ca/laws/docs/17c14_e.doc";
const CYFSA_CONSOLIDATION = "2026-07-01";
const DIVORCE = "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html";

const V = "2026-10-07";

export const TYPES_FAMILY_2: ClaimType[] = [
  // ---------------------------------------------------------------------------
  {
    id: "family-matter-section-7-expenses",
    name: "Sharing special child expenses (section 7)",
    broughtBy:
      "A parent who pays for a child's special or extra costs, such as child care, health costs not covered by " +
      "insurance, school programs or activities, and wants the other parent to share them. Either parent can ask.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "listed-expense-section7",
        name: "The cost is one of the kinds the Guidelines list",
        plainExplanation:
          "Under s. 7(1) of the Ontario Child Support Guidelines, in an order for the support of a child the court " +
          "may, on the request of either parent or spouse or of an applicant under s. 33 of the Family Law Act, " +
          "provide for an amount to cover all or any portion of these expenses: (a) child care expenses incurred " +
          "as a result of the employment, illness, disability or education or training for employment of the " +
          "parent who has the majority of parenting time; (b) the portion of medical and dental insurance " +
          "premiums attributable to the child; (c) health-related expenses that exceed insurance reimbursement " +
          "by at least $100 annually, such as orthodontic treatment, counselling, physiotherapy, prescription " +
          "drugs, hearing aids, glasses and contact lenses; (d) extraordinary expenses for primary or secondary " +
          "school education or other educational programs that meet the child's particular needs; (e) expenses " +
          "for post-secondary education; and (f) extraordinary expenses for extracurricular activities. The " +
          "expenses may be estimated.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Receipts and invoices for each cost",
            why: "Section 7(1) lists the kinds of expense the court may provide for.",
            examples: [
              "Daycare or after-school care receipts",
              "Orthodontist, counsellor or physiotherapist invoices",
              "Tuition, registration or activity fee receipts",
            ],
          },
          {
            name: "What insurance paid",
            why: "Health-related expenses count when they exceed insurance reimbursement by at least $100 a year.",
            examples: [
              "Insurance claim statements showing what was reimbursed",
              "A list of health costs for the year, with amounts not covered",
            ],
          },
          {
            name: "Why child care was needed",
            why: "Child care counts when it is incurred because of work, illness, disability or education or training for work.",
            examples: ["An employment letter or work schedule", "Proof of enrolment in a training program"],
          },
        ],
      },
      {
        id: "necessary-and-reasonable-section7",
        name: "The cost is necessary and reasonable, and extraordinary where that is required",
        plainExplanation:
          "Under s. 7(1) of the Guidelines, the court takes into account the necessity of the expense in relation " +
          "to the child's best interests, and the reasonableness of the expense in relation to the means of the " +
          "parents and those of the child and to the parents' spending pattern for the child during " +
          "cohabitation. For school programs under clause (d) and activities under clause (f), s. 7(1.1) says " +
          "\"extraordinary expenses\" means expenses that exceed those the parent requesting the amount can " +
          "reasonably cover, taking into account that parent's income and the table amount they would receive; " +
          "or, where that does not apply, expenses the court considers extraordinary taking into account the " +
          "amount of the expense in relation to that parent's income, the nature and number of the programs and " +
          "activities, any special needs and talents of the child, the overall cost, and any other similar " +
          "factors the court considers relevant.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Why the cost is in the child's best interests",
            why: "Section 7(1) looks at the necessity of the expense in relation to the child's best interests.",
            examples: [
              "A doctor's, teacher's or counsellor's letter recommending the treatment or program",
              "School records showing a particular need",
            ],
          },
          {
            name: "What the family spent before separation",
            why: "Section 7(1) refers to the parents' spending pattern for the child during cohabitation.",
            examples: [
              "Past receipts for the same activity or program",
              "Bank or card statements showing what was paid while living together",
            ],
          },
        ],
      },
      {
        id: "shared-by-income-section7",
        name: "How the cost is shared",
        plainExplanation:
          "Under s. 7(2) of the Guidelines, the guiding principle is that the expense is shared by the parents in " +
          "proportion to their respective incomes, after deducting from the expense the contribution, if any, from " +
          "the child. Under s. 7(3), subject to s. 7(4), the court must take into account any subsidies, benefits " +
          "or income tax deductions or credits relating to the expense, and any eligibility to claim them.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Each parent's income",
            why: "The expense is shared in proportion to the parents' incomes.",
            examples: [
              "Most recent tax return and notice of assessment for each parent",
              "Recent pay stubs",
            ],
          },
          {
            name: "Subsidies, credits and the child's own contribution",
            why: "Section 7(2) and (3) deduct the child's contribution and take account of subsidies, benefits and tax credits.",
            examples: [
              "Child care subsidy letters",
              "Tax slips showing child care or medical expense credits",
              "Records of the child's own earnings, scholarships or bursaries used for the cost",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "recipient-income-documents-section7",
        name: "The parent asking for s. 7 expenses must also share income documents",
        plainExplanation:
          "Under s. 21(3) of the Guidelines, where a parent requests an amount to cover expenses referred to in " +
          "s. 7(1), the parent who would be receiving the child support must, within 30 days after the amount is " +
          "sought (60 days if they reside outside Canada and the United States), or such other time limit as the " +
          "court specifies, provide the court and the other parent with the income documents listed in s. 21(1).",
        whenThisComesUp: "When the parent receiving child support asks for a share of special expenses.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
      },
      {
        id: "yearly-update-section7",
        name: "The yearly update on s. 7 expenses in an order",
        plainExplanation:
          "Under s. 24.1(1) of the Guidelines, every person whose income or other financial information is used " +
          "to determine a child support order shall, no later than 30 days after each anniversary of the order, " +
          "give every party a copy of their tax return and notice of assessment for the most recent year and, as " +
          "applicable, current written information about the status and amount of any expenses included in the " +
          "order under s. 7(1), unless the parties have agreed otherwise.",
        whenThisComesUp: "When an order already includes s. 7 expenses and one parent wants up-to-date information.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Proof of the expenses. Under r. 13(3.1) of the Family Law Rules, a party who must serve and file a " +
          "financial statement in relation to a claim for support shall also serve, unless the court orders " +
          "otherwise, the income and financial information referred to in s. 21(1) of the child support " +
          "guidelines and, in a claim for the support of a child, proof of the amount of any special or " +
          "extraordinary expenses within the meaning of s. 7 of the guidelines.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
      {
        note:
          "Starting or changing. Under r. 8(1) of the Family Law Rules, to start a case a person files an " +
          "application. Under r. 8(2), a party who wants to change a final order, or an agreement for support " +
          "filed under s. 35 of the Family Law Act, may do so only by a motion under r. 15 (if permitted by that " +
          "rule). Under s. 33(11) of the Family Law Act, a court making an order for the support of a child shall " +
          "do so in accordance with the child support guidelines.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
        alsoCites: [{ sourceUrl: FLA, pinpoint: "Family Law Act, s. 33(11)" }],
      },
    ],
    signals: [
      "split the daycare costs",
      "section 7 expenses",
      "special expenses for my child",
      "won't pay half of hockey",
      "share the cost of braces",
      "extracurricular activities cost",
      "orthodontist bill for my son",
      "university costs for our daughter",
      "extraordinary expenses child",
      "child care costs while I work",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Child Support Guidelines, O. Reg. 391/97",
        officialUrl: CSG,
        verifiedAt: V,
        pinpoint: "ss. 7(1)-(3), 21(3), 24.1(1)",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "rr. 8(1)-(2), 13(3.1)",
      },
      {
        sourceName: "Family Law Act, R.S.O. 1990, c. F.3",
        officialUrl: FLA,
        verifiedAt: V,
        pinpoint: "s. 33(11)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "family-matter-undue-hardship",
    name: "Asking for different child support because of undue hardship",
    broughtBy:
      "A parent who says paying, or receiving only, the table amount of child support would cause them or a " +
      "child undue hardship, and asks the court for a different amount. Either parent can ask.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "undue-hardship-test-hardship",
        name: "Undue hardship to the parent asking, or to a child",
        plainExplanation:
          "Under s. 10(1) of the Ontario Child Support Guidelines, on the application of either spouse or an " +
          "applicant under s. 33 of the Family Law Act, a court may award an amount of child support that is " +
          "different from the amount determined under any of ss. 3 to 5, 8 or 9 if the court finds that the parent " +
          "or spouse making the request, or a child in respect of whom the request is made, would otherwise suffer " +
          "undue hardship.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The child support amount being asked about",
            why: "Section 10(1) is about an amount different from the amount under ss. 3 to 5, 8 or 9.",
            examples: [
              "The current order or the amount claimed",
              "A table-amount calculation for the paying parent's income",
            ],
          },
          {
            name: "Each household's finances",
            why: "The hardship claimed has to be shown, and s. 10(3) compares the two households.",
            examples: [
              "Financial statement (Form 13 or 13.1)",
              "Monthly budget with proof of major expenses",
              "Tax returns and notices of assessment",
            ],
          },
        ],
      },
      {
        id: "listed-circumstances-hardship",
        name: "Circumstances that may cause undue hardship",
        plainExplanation:
          "Under s. 10(2) of the Guidelines, circumstances that may cause undue hardship include: (a) an unusually " +
          "high level of debts reasonably incurred to support the family during cohabitation or to earn a living; " +
          "(b) unusually high expenses in relation to exercising parenting time with a child; (c) a legal duty " +
          "under a judgment, order or written separation agreement to support any person; (d) a spouse's legal " +
          "duty to support a child, other than a child of the marriage, who is under the age of majority or is " +
          "unable, by reason of illness, disability or other cause, to obtain the necessaries of life; (e) a " +
          "parent's legal duty to support another child who is under the age of majority or enrolled in a full " +
          "time course of education; and (f) a legal duty to support any person who is unable to obtain the " +
          "necessaries of life due to an illness or disability.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Debts from the relationship or from earning a living",
            why: "Section 10(2)(a) refers to an unusually high level of debts reasonably incurred.",
            examples: ["Loan and credit statements with balances", "Records of what each debt was for"],
          },
          {
            name: "Costs of parenting time",
            why: "Section 10(2)(b) refers to unusually high expenses of exercising parenting time.",
            examples: ["Travel receipts, flights or fuel records", "The parenting schedule and distance between homes"],
          },
          {
            name: "Other people the parent must support",
            why: "Section 10(2)(c) to (f) refer to legal duties to support other people.",
            examples: [
              "Another support order or a written separation agreement",
              "Birth certificates or school enrolment for other children",
              "Medical records for a dependant who cannot obtain the necessaries of life",
            ],
          },
        ],
      },
      {
        id: "standard-of-living-hardship",
        name: "The comparison of household standards of living",
        plainExplanation:
          "Under s. 10(3) of the Guidelines, despite a finding of undue hardship, the application must be denied " +
          "by the court if it is of the opinion that the household of the parent claiming undue hardship would, " +
          "after child support is determined under ss. 3 to 5, 8 or 9, have a higher standard of living than the " +
          "household of the other parent. Under s. 10(4), in comparing standards of living the court may use the " +
          "comparison of household standards of living test set out in Schedule II.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Who lives in each household and their income",
            why: "Section 10(3) compares the standard of living of the two households.",
            examples: [
              "Income records for each adult in each household",
              "A list of who lives in each home, including children",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "time-and-reasons-hardship",
        name: "A different amount can be time-limited, and reasons are recorded",
        plainExplanation:
          "Under s. 10(5) of the Guidelines, where the court awards a different amount under s. 10(1), it may " +
          "specify in the order a reasonable time for the satisfaction of any obligation arising from the " +
          "circumstances that cause undue hardship, and the amount payable at the end of that time. Under " +
          "s. 10(6), where the court orders a different amount under s. 10, it must record its reasons for doing so.",
        whenThisComesUp: "When the hardship comes from a debt or cost that will end, such as a loan being paid off.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
      },
      {
        id: "recipient-documents-hardship",
        name: "Income documents when undue hardship is pleaded",
        plainExplanation:
          "Under s. 21(3) of the Guidelines, where a parent pleads undue hardship, the parent who would be " +
          "receiving the child support must, within 30 days after undue hardship is pleaded (60 days if they " +
          "reside outside Canada and the United States), or such other time limit as the court specifies, " +
          "provide the court and the other parent with the income documents listed in s. 21(1).",
        whenThisComesUp: "When one parent claims undue hardship and the household comparison needs both incomes.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Financial statements. Under r. 13(1) of the Family Law Rules, if an application, answer or motion " +
          "contains a claim for support, the party making the claim shall serve and file a financial statement " +
          "(Form 13 or 13.1) with the document that contains the claim, and the party against whom the claim is " +
          "made shall serve and file one within the time for responding. Under r. 13(1.3), a party claiming only " +
          "the table amount of child support (with no property claim or claim for exclusive possession of the " +
          "matrimonial home) is not required to file one.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
      {
        note:
          "The usual rule. Under s. 33(11) of the Family Law Act, a court making an order for the support of a " +
          "child shall do so in accordance with the child support guidelines. Section 10(1) of the Guidelines is " +
          "the provision under which a court may award a different amount for undue hardship.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CSG, pinpoint: "Child Support Guidelines, s. 10(1)" }],
      },
    ],
    signals: [
      "undue hardship child support",
      "can't afford the table amount",
      "I also support kids from my new relationship",
      "huge debts from the marriage",
      "travel costs to see my kids",
      "pay less than the guidelines",
      "support for another child too",
      "child support leaves me unable to live",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Child Support Guidelines, O. Reg. 391/97",
        officialUrl: CSG,
        verifiedAt: V,
        pinpoint: "ss. 10(1)-(6), 21(3)",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "r. 13(1), (1.3)",
      },
      {
        sourceName: "Family Law Act, R.S.O. 1990, c. F.3",
        officialUrl: FLA,
        verifiedAt: V,
        pinpoint: "s. 33(11)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "family-matter-imputing-income",
    name: "When a parent's income is not what they say",
    broughtBy:
      "A parent in a child support case who says the other parent's real income is higher than they report, " +
      "for example because they are working less on purpose, are paid through a company, or will not share " +
      "income documents. The court can be asked to set (impute) an income.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "how-income-is-set-imputing",
        name: "How income is normally worked out",
        plainExplanation:
          "Under s. 15(1) of the Ontario Child Support Guidelines, subject to s. 15(2), a parent's annual income " +
          "is determined by the court in accordance with ss. 16 to 20. Under s. 16, subject to ss. 17 to 20, it " +
          "is determined using the sources of income under the heading \"Total income\" in the T1 General form " +
          "issued by the Canada Revenue Agency, adjusted in accordance with Schedule III. Under s. 17(1), if the " +
          "court is of the opinion that the s. 16 figure would not be the fairest determination of that income, " +
          "it may have regard to the parent's income over the last three years and determine an amount that is " +
          "fair and reasonable in light of any pattern of income, fluctuation in income or receipt of a " +
          "non-recurring amount during those years.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Tax records over several years",
            why: "Section 16 starts from \"Total income\" on the tax return, and s. 17(1) can look at the last three years.",
            examples: [
              "Tax returns and notices of assessment for the last three years",
              "Records of bonuses, overtime or one-time payments",
            ],
          },
        ],
      },
      {
        id: "imputing-circumstances-imputing",
        name: "Circumstances in which income may be imputed",
        plainExplanation:
          "Under s. 19(1) of the Guidelines, the court may impute such amount of income to a parent as it " +
          "considers appropriate in the circumstances, which include: (a) the parent is intentionally " +
          "under-employed or unemployed, other than where that is required by the needs of any child or by the " +
          "reasonable educational or health needs of the parent; (b) the parent is exempt from paying federal or " +
          "provincial income tax; (c) the parent lives in a country with significantly lower effective income tax " +
          "rates; (d) it appears that income has been diverted which would affect the level of child support; " +
          "(e) the parent's property is not reasonably utilized to generate income; (f) the parent has failed to " +
          "provide income information when under a legal obligation to do so; (g) the parent unreasonably deducts " +
          "expenses from income; (h) the parent derives a significant portion of income from dividends, capital " +
          "gains or other sources taxed at a lower rate or exempt from tax; and (i) the parent is a beneficiary " +
          "under a trust and is or will be in receipt of income or other benefits from it.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Work history and earning ability",
            why: "Section 19(1)(a) refers to being intentionally under-employed or unemployed.",
            examples: [
              "Past pay stubs, job postings or a resume showing earlier earnings",
              "Records of a job quit or hours reduced, and when",
            ],
          },
          {
            name: "Business, company and lifestyle records",
            why: "Section 19(1)(d), (g) and (h) refer to diverted income, unreasonable expense deductions and income taxed at a lower rate.",
            examples: [
              "Business financial statements and corporate records",
              "Records of personal expenses paid by a business",
              "Bank statements showing spending well above reported income",
            ],
          },
          {
            name: "Property that earns little or nothing",
            why: "Section 19(1)(e) refers to property not reasonably utilized to generate income.",
            examples: ["Records of investments, rental property or other assets and what they earn"],
          },
        ],
      },
      {
        id: "failure-to-disclose-imputing",
        name: "When income documents are not provided",
        plainExplanation:
          "Under s. 21(2) of the Guidelines, a parent served with an application for child support whose income " +
          "information is necessary must, within 30 days after service (60 days if they reside outside Canada and " +
          "the United States), or such other time as the court specifies, provide the court and the other party " +
          "with the documents in s. 21(1). Under s. 22(1), where a parent fails to comply with s. 21, the other " +
          "party may apply to have the application set down for a hearing, or move for judgment, or for an order " +
          "requiring the documents to be provided. Under s. 23, where the court proceeds to a hearing on the basis " +
          "of an application under s. 22(1)(a), the court may draw an adverse inference against the parent who " +
          "failed to comply and impute income to that parent in such amount as it considers appropriate.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Proof of what was asked for and when",
            why: "Sections 21(2) and 22(1) turn on whether the documents were provided in time.",
            examples: [
              "The date the application was served (affidavit of service)",
              "Letters or emails asking for the documents",
              "A list of the documents still missing",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "needs-exception-imputing",
        name: "Working less for a child's needs or for education or health",
        plainExplanation:
          "Under s. 19(1)(a) of the Guidelines, being intentionally under-employed or unemployed is not a " +
          "circumstance for imputing income where the under-employment or unemployment is required by the needs " +
          "of any child or by the reasonable educational or health needs of the parent. Under s. 19(2), for " +
          "clause (1)(g), the reasonableness of an expense deduction is not solely governed by whether the " +
          "deduction is permitted under the Income Tax Act (Canada).",
        whenThisComesUp:
          "When the parent earning less says it is because of a child's needs, school, retraining or a health " +
          "condition, or when business expense deductions are questioned.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
      },
      {
        id: "agreed-income-imputing",
        name: "An income both parents agreed to in writing",
        plainExplanation:
          "Under s. 15(2) of the Guidelines, where both parents agree in writing on the annual income of a " +
          "parent, the court may consider that amount to be the parent's income for the Guidelines if the court " +
          "thinks the amount is reasonable having regard to the income information provided under s. 21.",
        whenThisComesUp: "When the parents signed something that states one parent's income.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Financial disclosure in the case. Under r. 13(1) of the Family Law Rules, a claim for support requires " +
          "a financial statement (Form 13 or 13.1) from the party making it, and from the party against whom it " +
          "is made within the time for responding. Under r. 13(3.1), a party required to file a financial " +
          "statement for a support claim also serves, unless the court orders otherwise, the income and financial " +
          "information in s. 21(1) of the child support guidelines and, if they became unemployed within the last " +
          "three years, a complete copy of their Record of Employment or other evidence of termination.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
      {
        note:
          "If an order to produce documents is not obeyed. Under s. 24 of the Guidelines, where a parent fails " +
          "to comply with an order issued on an application under s. 22(1)(b), the court may strike out any of " +
          "that parent's pleadings, make a contempt order against them, or proceed to a hearing. Under s. 22(2), " +
          "where the court makes an order under s. 22(1)(a) or (b), it may award costs up to an amount that fully " +
          "compensates the other party for all costs incurred in the proceedings.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
      },
    ],
    signals: [
      "he says he makes less than he does",
      "quit his job to avoid child support",
      "paid in cash under the table",
      "runs everything through his company",
      "impute income",
      "she is deliberately underemployed",
      "won't give me his tax returns",
      "hiding income from child support",
      "writes off personal expenses as business",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Child Support Guidelines, O. Reg. 391/97",
        officialUrl: CSG,
        verifiedAt: V,
        pinpoint: "ss. 15-17, 19, 21(2), 22-24",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "r. 13(1), (3.1)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "family-matter-retroactive-support",
    name: "Support owed for the past (retroactive support)",
    broughtBy:
      "A parent or former partner who asks for child or spousal support for a period before the court order, " +
      "or asks for an existing order to be changed back to an earlier date. Also a parent who pays and is " +
      "facing such a request.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "power-to-order-past-period-retroactive",
        name: "The court may order support for a period before the order",
        plainExplanation:
          "Under s. 33(1) of the Family Law Act, a court may, on application, order a person to provide support " +
          "for their dependants and determine the amount. Under s. 34(1)(f), in an application under s. 33 the " +
          "court may make an interim or final order requiring that support be paid in respect of any period " +
          "before the date of the order.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The period you are asking about",
            why: "Section 34(1)(f) refers to support for a period before the date of the order.",
            examples: [
              "The date of separation",
              "The date support was first asked for, in writing if possible",
              "Messages or letters asking for support or for income information",
            ],
          },
          {
            name: "What was actually paid during that period",
            why: "The amount owed for the past depends on what was already paid.",
            examples: ["Bank records or e-transfer history of payments", "A list of payments and dates"],
          },
        ],
      },
      {
        id: "underlying-obligation-retroactive",
        name: "The support obligation itself",
        plainExplanation:
          "Under s. 31(1) of the Family Law Act, every parent has an obligation to provide support, to the extent " +
          "the parent is capable of doing so, for their unmarried child who is a minor, is enrolled in a " +
          "full-time program of education, or is unable by reason of illness, disability or other cause to " +
          "withdraw from the charge of their parents. Under s. 30, every spouse has an obligation to provide " +
          "support for themselves and for the other spouse, in accordance with need, to the extent they are " +
          "capable of doing so. Under s. 33(11), an order for the support of a child is made in accordance with " +
          "the child support guidelines.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Income for each year in the period",
            why: "Child support is set under the Guidelines from income, so each past year's income matters.",
            examples: [
              "Tax returns and notices of assessment for each year claimed",
              "Pay stubs or employer letters for those years",
            ],
          },
          {
            name: "The child's situation during the period",
            why: "Section 31(1) describes the children a parent must support.",
            examples: ["Where the child lived during the period", "School enrolment records for an older child"],
          },
        ],
      },
      {
        id: "changing-existing-order-retroactive",
        name: "Changing an existing order back to an earlier date",
        plainExplanation:
          "Under s. 37(2.1) of the Family Law Act, for an order for support of a child, if the court is satisfied " +
          "that there has been a change in circumstances within the meaning of the child support guidelines, or " +
          "that evidence not available on the previous hearing has become available, the court may discharge, " +
          "vary or suspend a term of the order, prospectively or retroactively, and relieve the respondent from " +
          "paying part or all of the arrears or any interest on them. On the divorce path, s. 17(1) of the Divorce " +
          "Act says a court may make an order varying, rescinding or suspending, retroactively or prospectively, " +
          "a support order or any provision of one.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: DIVORCE, pinpoint: "Divorce Act, s. 17(1)(a)" }],
        evidenceCategories: [
          {
            name: "The existing order and what has changed since",
            why: "Section 37(2.1) requires a change in circumstances or evidence not available before.",
            examples: [
              "The current support order",
              "Income records since the order for both parents",
              "Records that came to light after the order",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "past-income-documents-retroactive",
        name: "Income information for past years",
        plainExplanation:
          "Under s. 21(1) of the Ontario Child Support Guidelines, a parent applying for child support whose " +
          "income information is necessary must include copies of every personal income tax return and every " +
          "notice of assessment and reassessment for each of the three most recent taxation years. Under " +
          "s. 25(1), a parent against whom a child support order has been made must, on written request not more " +
          "than once a year, provide the documents listed in s. 21(1) for any of the three most recent taxation " +
          "years for which they have not previously been provided.",
        whenThisComesUp: "When one parent wants to show what the other earned in the years being claimed.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
      },
      {
        id: "relief-from-arrears-retroactive",
        name: "Asking to be relieved of arrears",
        plainExplanation:
          "Under s. 37(2) of the Family Law Act, for an order for support of a spouse or parent, and under " +
          "s. 37(2.1) for a child, the court may relieve the respondent from the payment of part or all of the " +
          "arrears or any interest due on them, where it is satisfied that there has been the required change in " +
          "circumstances or that evidence not available on the previous hearing has become available.",
        whenThisComesUp: "When the paying parent says past arrears built up after their circumstances changed.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Time limits. Under s. 16(1)(c) of the Limitations Act, 2002, there is no limitation period in respect " +
          "of a proceeding to obtain support under the Family Law Act, or to enforce a provision for support or " +
          "maintenance contained in a contract or agreement that could be filed under s. 35 of that Act.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
      {
        note:
          "How to ask. Under r. 8(1) of the Family Law Rules, a case is started by filing an application. Under " +
          "r. 8(2), a party who wants to change a final order or an agreement for support filed under s. 35 of " +
          "the Family Law Act may do so only by a motion under r. 15 (if permitted by that rule). Under r. 13(1), " +
          "a claim for support is served and filed with a financial statement (Form 13 or 13.1).",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
    ],
    signals: [
      "back child support",
      "retroactive child support",
      "he never paid support since we separated",
      "support for the years before the order",
      "his income went up and he never told me",
      "retroactive spousal support",
      "claim support going back years",
      "arrears from before the court order",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Family Law Act, R.S.O. 1990, c. F.3",
        officialUrl: FLA,
        verifiedAt: V,
        pinpoint: "ss. 30, 31(1), 33(1), (11), 34(1)(f), 37(2), (2.1)",
      },
      {
        sourceName: "Child Support Guidelines, O. Reg. 391/97",
        officialUrl: CSG,
        verifiedAt: V,
        pinpoint: "ss. 21(1), 25(1)",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: LIMITATIONS,
        verifiedAt: V,
        pinpoint: "s. 16(1)(c)",
      },
      {
        sourceName: "Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.)",
        officialUrl: DIVORCE,
        verifiedAt: V,
        pinpoint: "s. 17(1)(a)",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "rr. 8(1)-(2), 13(1)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "family-matter-parenting-plan-change",
    name: "Changing a parenting order",
    broughtBy:
      "A parent, or another person named in a parenting order or contact order, who wants the order about " +
      "decision-making responsibility, parenting time or contact changed. Not a move with the child, which is " +
      "its own case type.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "material-change-parentingchange",
        name: "A material change in circumstances affecting the child",
        plainExplanation:
          "Under s. 29(1) of the Children's Law Reform Act, a court shall not make an order that varies a " +
          "parenting order or contact order unless there has been a material change in circumstances that " +
          "affects or is likely to affect the best interests of the child who is the subject of the order. On the " +
          "divorce path, s. 17(5) of the Divorce Act says that before making a variation order for a parenting " +
          "order or contact order, the court shall satisfy itself that there has been a change in the " +
          "circumstances of the child since the making of the order or the last variation order.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: DIVORCE, pinpoint: "Divorce Act, s. 17(5)" }],
        evidenceCategories: [
          {
            name: "The current order",
            why: "The change is measured from the order or the last variation order.",
            examples: ["The parenting order and any later orders", "The divorce order, if there is one"],
          },
          {
            name: "What has changed for the child since",
            why: "Section 29(1) looks for a material change that affects the child's best interests.",
            examples: [
              "School records, report cards or attendance records",
              "Records of a new work schedule, a move or a change in health",
              "Notes of how the current schedule has worked, with dates",
            ],
          },
        ],
      },
      {
        id: "best-interests-parentingchange",
        name: "The new order must be in the child's best interests",
        plainExplanation:
          "Under s. 24(1) of the Children's Law Reform Act, in making a parenting order or contact order the court " +
          "shall only take into account the best interests of the child in accordance with that section. Under " +
          "s. 24(2), it considers all factors related to the child's circumstances and gives primary " +
          "consideration to the child's physical, emotional and psychological safety, security and well-being. " +
          "Section 24(3) lists factors, including the child's needs given their age and stage of development, the " +
          "nature and strength of the child's relationships, each parent's willingness to support the child's " +
          "relationship with the other parent, the history of care, the child's views and preferences, any plans " +
          "for the child's care, each person's ability and willingness to care for the child and to communicate " +
          "and co-operate on matters affecting the child, and any family violence.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Your plan for the child",
            why: "Section 24(3)(g) refers to any plans for the child's care.",
            examples: [
              "A proposed schedule",
              "Where the child would live and go to school",
              "Who would help with care and transportation",
            ],
          },
          {
            name: "The child's day-to-day life and relationships",
            why: "Section 24(3) looks at the child's needs, relationships and history of care.",
            examples: [
              "Records of who has handled school, medical and activity matters",
              "Letters from teachers, doctors or counsellors",
            ],
          },
        ],
      },
      {
        id: "who-can-apply-parentingchange",
        name: "Who can ask",
        plainExplanation:
          "Under s. 21(1) of the Children's Law Reform Act, a parent of a child may apply to a court for a " +
          "parenting order respecting decision-making responsibility and parenting time. Under s. 21(3), any " +
          "person other than a parent, including a grandparent, may apply for a contact order. On the divorce " +
          "path, s. 17(1)(b) of the Divorce Act allows an application to vary a parenting order by either or both " +
          "former spouses, or by another person who is a parent of the child, stands in the place of a parent or " +
          "intends to stand in the place of a parent, and s. 17(2) says a person to whom the parenting order does " +
          "not relate needs leave of the court.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: DIVORCE, pinpoint: "Divorce Act, s. 17(1)(b), (2)" }],
        evidenceCategories: [
          {
            name: "Your connection to the child",
            why: "Who may apply depends on being a parent, a former spouse or another person named in the law.",
            examples: ["Birth certificate", "The existing order naming you"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "past-conduct-parentingchange",
        name: "Past conduct counts only when it relates to parenting",
        plainExplanation:
          "Under s. 24(5) of the Children's Law Reform Act, in determining what is in the best interests of the " +
          "child, the court shall not take into consideration the past conduct of any person unless the conduct " +
          "is relevant to the exercise of the person's decision-making responsibility, parenting time or contact " +
          "with respect to the child.",
        whenThisComesUp: "When the request to change the order rests on things a parent did that are not about parenting.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
      },
      {
        id: "as-much-time-parentingchange",
        name: "As much time with each parent as fits the child's best interests",
        plainExplanation:
          "Under s. 24(6) of the Children's Law Reform Act, in allocating parenting time the court shall give " +
          "effect to the principle that a child should have as much time with each parent as is consistent with " +
          "the best interests of the child.",
        whenThisComesUp: "When the change asked for would reduce one parent's time with the child.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "How to ask: a motion to change under r. 15 of the Family Law Rules. Under r. 15(2), the rule applies " +
          "to a motion to change a final order. Under r. 15(5), subject to r. 15(17) and (18), a party who wants " +
          "to change a final order shall serve and file a motion to change (Form 15), with all required " +
          "attachments, and under r. 15(7) it is served by special service, not regular service.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
    ],
    signals: [
      "change the custody order",
      "change the parenting schedule",
      "vary the parenting order",
      "motion to change parenting time",
      "my child wants to live with me now",
      "the parenting order no longer works",
      "change decision-making responsibility",
      "more time with my kids than the order says",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Children's Law Reform Act, R.S.O. 1990, c. C.12",
        officialUrl: CLRA,
        verifiedAt: V,
        pinpoint: "ss. 21(1), (3), 24(1)-(3), (5), (6), 29(1)",
      },
      {
        sourceName: "Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.)",
        officialUrl: DIVORCE,
        verifiedAt: V,
        pinpoint: "s. 17(1)(b), (2), (5)",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "r. 15(2), (5), (7)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "family-matter-denied-parenting-time",
    name: "Parenting time not being followed",
    broughtBy:
      "A parent or other person with parenting time or contact under a court order whose time is being " +
      "refused, cut short or not followed, or whose child is being kept from them.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "duty-to-comply-deniedtime",
        name: "The order must be followed",
        plainExplanation:
          "Under s. 33.1(5) of the Children's Law Reform Act, for greater certainty, a person who is subject to an " +
          "order made under Part III shall comply with the order until it is no longer in effect. Under " +
          "s. 33.1(1), a person to whom decision-making responsibility, parenting time or contact has been granted " +
          "under a parenting order or contact order shall exercise it in a manner consistent with the best " +
          "interests of the child within the meaning of s. 24.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The order",
            why: "What has to be followed is set by the terms of the order.",
            examples: ["The parenting order or contact order", "Any later orders changing it"],
          },
          {
            name: "A record of each missed or refused visit",
            why: "Showing that the order was not followed means showing when and how.",
            examples: [
              "A dated log of missed exchanges",
              "Texts or emails cancelling or refusing parenting time",
              "Notes of who was present at a failed exchange",
            ],
          },
        ],
      },
      {
        id: "failure-to-obey-deniedtime",
        name: "What the court can do when an order is not obeyed",
        plainExplanation:
          "Under r. 1(8) of the Family Law Rules, if a person fails to obey an order in a case or a related case, " +
          "the court may deal with the failure by making any order that it considers necessary for a just " +
          "determination of the matter, including an order for costs, an order to pay an amount to a party or " +
          "into court as a penalty or fine, an order striking out documents filed by a party, an order that the " +
          "party is not entitled to any further order unless the court orders otherwise, and an order postponing " +
          "the trial or any other step.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Proof the other person knew about the order",
            why: "The failure has to be to obey an order in the case.",
            examples: ["Proof the order was served or that they were in court when it was made"],
          },
        ],
      },
      {
        id: "contempt-deniedtime",
        name: "A contempt motion",
        plainExplanation:
          "Under r. 31(1) of the Family Law Rules, an order, other than a payment order, may be enforced by a " +
          "contempt motion made in the case in which the order was made, even if another penalty is available. " +
          "Under r. 31(5), if the court finds a person in contempt, it may order, among other things, that the " +
          "person be imprisoned for any period and on any conditions that are just, pay a fine, pay an amount to " +
          "a party as a penalty, do anything else the court decides is appropriate, pay costs, and obey any other " +
          "order. Under s. 38(1) of the Children's Law Reform Act, the Ontario Court of Justice may punish wilful " +
          "contempt of its orders under that Act by a fine not exceeding $5,000 or imprisonment not exceeding " +
          "ninety days, or both.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CLRA, pinpoint: "Children's Law Reform Act, s. 38(1)" }],
        evidenceCategories: [
          {
            name: "An affidavit setting out each breach",
            why: "Rule 31(2) says the notice of contempt motion is served with a supporting affidavit.",
            examples: [
              "Dates and details of each refused visit",
              "Copies of messages about the refusals",
            ],
          },
        ],
      },
      {
        id: "child-withheld-deniedtime",
        name: "When a child is being unlawfully withheld",
        plainExplanation:
          "Under s. 36(1) of the Children's Law Reform Act, where a court is satisfied on application by a person " +
          "in whose favour a parenting order or contact order has been made that there are reasonable and probable " +
          "grounds for believing that any person is unlawfully withholding the child from the applicant, the court " +
          "may authorize the applicant or someone on their behalf to apprehend the child to give effect to their " +
          "rights. Under s. 36(2), on reasonable and probable grounds that a person is unlawfully withholding a " +
          "child from a person entitled to parenting time or contact, the court may direct a police service to " +
          "locate, apprehend and deliver the child to the person named in the order, and under s. 36(3) that " +
          "order may be made without notice where the court is satisfied that action is needed without delay.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Where the child is and how long they have been kept",
            why: "Section 36 requires reasonable and probable grounds for believing the child is being unlawfully withheld.",
            examples: [
              "Messages refusing to return the child",
              "The last date the child was with you under the order",
              "Any police occurrence number",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "supervision-deniedtime",
        name: "Supervised parenting time",
        plainExplanation:
          "Under s. 34(1) of the Children's Law Reform Act, a court may give such directions as it considers " +
          "appropriate for the supervision, by a person, a children's aid society or other body, of " +
          "decision-making responsibility, parenting time or contact under a parenting order or contact order. " +
          "Under s. 34(2), it shall not direct a person, society or body to supervise unless they have consented " +
          "to act as supervisor.",
        whenThisComesUp: "When the parent refusing visits raises a concern about the child's safety during parenting time.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
      },
      {
        id: "protect-from-conflict-deniedtime",
        name: "Keeping the child out of the conflict",
        plainExplanation:
          "Under s. 33.1(2) of the Children's Law Reform Act, a party to a proceeding under Part III shall, to the " +
          "best of the party's ability, protect any child from conflict arising from the proceeding. Under " +
          "s. 33.1(3), to the extent it is appropriate to do so, the parties shall try to resolve the matters " +
          "through an alternative dispute resolution process, such as negotiation, mediation or collaborative law.",
        whenThisComesUp: "Throughout the dispute, including at exchanges and in messages the child might see.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Serving a contempt motion. Under r. 31(2) of the Family Law Rules, the notice of contempt motion " +
          "(Form 31) shall be served together with a supporting affidavit, by special service in accordance with " +
          "r. 6(4), unless the court orders otherwise.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
      {
        note:
          "If the order itself needs to change. Under s. 29(1) of the Children's Law Reform Act, a court shall not " +
          "vary a parenting order or contact order unless there has been a material change in circumstances that " +
          "affects or is likely to affect the best interests of the child, and under r. 15(5) of the Family Law " +
          "Rules a change to a final order is asked for by a motion to change (Form 15).",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: FLR, pinpoint: "Family Law Rules, r. 15(5)" }],
      },
    ],
    signals: [
      "she won't let me see my kids",
      "he keeps cancelling my parenting time",
      "refusing access to my child",
      "not following the custody order",
      "kept my child from me",
      "won't return the children after the weekend",
      "contempt motion parenting time",
      "denied access weekend",
      "withholding the child",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Children's Law Reform Act, R.S.O. 1990, c. C.12",
        officialUrl: CLRA,
        verifiedAt: V,
        pinpoint: "ss. 29(1), 33.1(1)-(3), (5), 34(1)-(2), 36(1)-(3), 38(1)",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "rr. 1(8), 15(5), 31(1), (2), (5)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "family-matter-annulment-or-validity-of-marriage",
    name: "Whether a marriage is valid",
    broughtBy:
      "A person who wants a court to declare that a marriage is valid or invalid, or to annul it, for example " +
      "where there was a problem with the licence, the ceremony, consent or capacity. Also a person who needs " +
      "to know their rights if a marriage turns out to be void.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "marriage-act-requirements-validity",
        name: "What the Marriage Act requires for a marriage",
        plainExplanation:
          "Under s. 4 of the Marriage Act, no marriage may be solemnized except under the authority of a licence " +
          "issued in accordance with the Act or the publication of banns. Under s. 5(1), any person who is of the " +
          "age of majority may obtain a licence or be married under the authority of the publication of banns, " +
          "provided no lawful cause exists to hinder the solemnization. Under s. 5(2), no person shall issue a " +
          "licence to a minor, or solemnize a minor's marriage under banns, except where the minor is sixteen or " +
          "more and has the written consent of both parents in the prescribed form. Under s. 7, no person shall " +
          "issue a licence to or solemnize the marriage of any person who, based on what they know or have " +
          "reasonable grounds to believe, lacks mental capacity to marry by reason of being under the influence of " +
          "intoxicating liquor or drugs or for any other reason.",
        sourceUrl: MARRIAGE,
        verifiedAt: V,
        consolidationPeriod: MARRIAGE_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The marriage records",
            why: "The Marriage Act requires a licence or banns, and the person solemnizing must be authorized.",
            examples: [
              "The marriage licence and marriage certificate",
              "The name of the person who performed the ceremony",
              "Any record of banns being published",
            ],
          },
          {
            name: "Age, consent and capacity at the time",
            why: "Sections 5 and 7 deal with age, parental consent for a minor, and mental capacity.",
            examples: [
              "Birth certificates of both spouses",
              "Any written parental consent",
              "Statements from people who attended the ceremony",
            ],
          },
          {
            name: "Any earlier marriage",
            why: "Under s. 8 a previously married applicant needs that marriage dissolved or annulled before a licence issues.",
            examples: ["A divorce certificate or annulment judgment for any earlier marriage"],
          },
        ],
      },
      {
        id: "good-faith-marriage-validity",
        name: "A marriage solemnized in good faith",
        plainExplanation:
          "Under s. 31 of the Marriage Act, if the parties to a marriage solemnized in good faith and intended to " +
          "be in compliance with the Act are not under a legal disqualification to contract such marriage, and " +
          "after the solemnization have lived together and cohabited as a married couple, the marriage shall be " +
          "deemed a valid marriage, although the person who solemnized it was not authorized to do so, and despite " +
          "the absence of or any irregularity or insufficiency in the publication of banns or the issue of the " +
          "licence.",
        sourceUrl: MARRIAGE,
        verifiedAt: V,
        consolidationPeriod: MARRIAGE_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Living together after the ceremony",
            why: "Section 31 applies where the parties lived together and cohabited as a married couple afterwards.",
            examples: ["A shared lease or deed", "Joint bills, tax returns or bank accounts"],
          },
          {
            name: "What the parties believed at the time",
            why: "Section 31 applies to a marriage solemnized in good faith and intended to comply with the Act.",
            examples: ["Messages or documents from the wedding planning", "The officiant's representations"],
          },
        ],
      },
      {
        id: "rights-if-void-validity",
        name: "Family Law Act rights where a marriage is void or voidable",
        plainExplanation:
          "Under s. 1(1) of the Family Law Act, \"spouse\" means either of two persons who are married to each " +
          "other, or have together entered into a marriage that is voidable or void, in good faith on the part of " +
          "a person relying on this clause to assert any right. Under s. 5(1), when a marriage is declared a " +
          "nullity, the spouse whose net family property is the lesser of the two is entitled to one-half the " +
          "difference between them.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Good faith at the time of the marriage",
            why: "The definition of \"spouse\" covers a void or voidable marriage entered into in good faith by the person relying on it.",
            examples: ["What you knew about any problem with the marriage, and when you learned it"],
          },
          {
            name: "Property and debts",
            why: "Section 5(1) applies when a marriage is declared a nullity.",
            examples: ["Records of property and debts at the date of marriage and at separation"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "nullity-time-limit-validity",
        name: "Time limit for a property claim after a nullity judgment",
        plainExplanation:
          "Under s. 7(3) of the Family Law Act, an application based on s. 5(1) shall not be brought after the " +
          "earliest of two years after the day the marriage is terminated by divorce or judgment of nullity, six " +
          "years after the day the spouses separate and there is no reasonable prospect that they will resume " +
          "cohabitation, and six months after the first spouse's death. Under s. 2(8), the court may, on motion, " +
          "extend a time prescribed by the Act if it is satisfied that there are apparent grounds for relief, " +
          "relief is unavailable because of delay incurred in good faith, and no person will suffer substantial " +
          "prejudice by reason of the delay.",
        whenThisComesUp: "When a property claim is made after a judgment of nullity or a long separation.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Which court and rules. Under the Family Law Rules, r. 1(2)(d), the rules apply to family law cases in " +
          "the Family Court of the Superior Court of Justice, the Superior Court of Justice and the Ontario Court " +
          "of Justice for annulment of a marriage or a declaration of validity or invalidity of a marriage. Under " +
          "s. 21.8(1) of the Courts of Justice Act, in the parts of Ontario where the Family Court has " +
          "jurisdiction, the proceedings in its Schedule, which include proceedings for annulment of a marriage " +
          "or for a declaration of validity or invalidity of a marriage, shall be commenced, heard and determined " +
          "in the Family Court.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CJA, pinpoint: "Courts of Justice Act, s. 21.8(1) and Schedule, item 4" }],
      },
    ],
    signals: [
      "annul my marriage",
      "annulment",
      "is my marriage legal",
      "marriage was never valid",
      "he was still married to someone else",
      "the officiant wasn't licensed",
      "declaration that the marriage is invalid",
      "married without a proper licence",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Marriage Act, R.S.O. 1990, c. M.3",
        officialUrl: MARRIAGE,
        verifiedAt: V,
        pinpoint: "ss. 4, 5(1)-(2), 7, 8(1), 31",
      },
      {
        sourceName: "Family Law Act, R.S.O. 1990, c. F.3",
        officialUrl: FLA,
        verifiedAt: V,
        pinpoint: "ss. 1(1) (\"spouse\"), 2(8), 5(1), 7(3)",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "r. 1(2)(d)",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: CJA,
        verifiedAt: V,
        pinpoint: "s. 21.8(1), Schedule item 4",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "family-matter-marriage-contract",
    name: "A marriage contract or cohabitation agreement",
    broughtBy:
      "A married or engaged couple, or a couple living together or planning to, who signed or want to sign an " +
      "agreement about property and support. Also a person who wants such an agreement, or part of it, set " +
      "aside or enforced after separation.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "what-it-can-cover-marriagecontract",
        name: "What a marriage contract or cohabitation agreement can cover",
        plainExplanation:
          "Under s. 52(1) of the Family Law Act, two persons who are married to each other or intend to marry may " +
          "enter into an agreement on their respective rights and obligations under the marriage or on " +
          "separation, on the annulment or dissolution of the marriage or on death, including ownership in or " +
          "division of property, support obligations, the right to direct the education and moral training of " +
          "their children (but not decision-making responsibility or parenting time), and any other matter in the " +
          "settlement of their affairs. Under s. 53(1), two persons who are cohabiting or intend to cohabit and " +
          "are not married to each other may make a cohabitation agreement on the same kinds of matters. Under " +
          "s. 53(2), if the parties to a cohabitation agreement marry each other, it is deemed to be a marriage " +
          "contract.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The agreement and any amendments",
            why: "What the agreement covers depends on its terms.",
            examples: ["The signed agreement", "Any later written amendments", "Schedules listing property"],
          },
          {
            name: "Relationship dates",
            why: "Sections 52 and 53 depend on whether the parties were married, intending to marry, or cohabiting.",
            examples: ["Marriage certificate", "Records of when you began living together"],
          },
        ],
      },
      {
        id: "form-marriagecontract",
        name: "In writing, signed and witnessed",
        plainExplanation:
          "Under s. 55(1) of the Family Law Act, a domestic contract and an agreement to amend or rescind a " +
          "domestic contract are unenforceable unless made in writing, signed by the parties and witnessed. Under " +
          "s. 55(2), a minor has capacity to enter into a domestic contract, subject to the approval of the court, " +
          "which may be given before or after the minor enters into it.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The signing",
            why: "Section 55(1) requires writing, the parties' signatures and a witness.",
            examples: [
              "The signature page showing both signatures and the witness",
              "The name of the witness and the date and place of signing",
            ],
          },
        ],
      },
      {
        id: "setting-aside-marriagecontract",
        name: "Grounds to set aside the agreement or part of it",
        plainExplanation:
          "Under s. 56(4) of the Family Law Act, a court may, on application, set aside a domestic contract or a " +
          "provision in it if a party failed to disclose to the other significant assets, or significant debts or " +
          "other liabilities, existing when the contract was made; if a party did not understand the nature or " +
          "consequences of the contract; or otherwise in accordance with the law of contract. Under s. 56(7), " +
          "s. 56(4) applies despite any agreement to the contrary. Under s. 33(4), the court may set aside a " +
          "provision for support or a waiver of support and order support even if the contract excludes that " +
          "section, if the provision or waiver results in unconscionable circumstances, if it is in favour of or " +
          "by a dependant who qualifies for support out of public money, or if there is default in payment under " +
          "the contract when the application is made.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "What was disclosed when it was signed",
            why: "Section 56(4)(a) refers to failing to disclose significant assets, debts or other liabilities.",
            examples: [
              "Financial disclosure exchanged before signing",
              "Records of assets or debts that were not disclosed",
            ],
          },
          {
            name: "Understanding of the agreement",
            why: "Section 56(4)(b) refers to a party not understanding the nature or consequences of the contract.",
            examples: [
              "Any certificate of independent legal advice",
              "Messages about the agreement before signing",
              "Records of language or timing issues at signing",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "limits-marriagecontract",
        name: "What a contract cannot do",
        plainExplanation:
          "Under s. 52(2) of the Family Law Act, a provision in a marriage contract purporting to limit a spouse's " +
          "rights under Part II (Matrimonial Home) is unenforceable. Under s. 56(1), on a matter about the " +
          "education, moral training, decision-making responsibility or parenting time of a child, the court may " +
          "disregard any provision of a domestic contract where, in its opinion, doing so is in the best " +
          "interests of the child. Under s. 56(1.1), on child support, the court may disregard a provision that " +
          "is unreasonable having regard to the child support guidelines and to any other provision on support of " +
          "the child in the contract.",
        whenThisComesUp: "When the agreement deals with the family home, the children's care or child support.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Which court. Under s. 21.8(1) of the Courts of Justice Act, in the parts of Ontario where the Family " +
          "Court has jurisdiction, the proceedings in its Schedule, which include proceedings for the " +
          "interpretation, enforcement or variation of a marriage contract or cohabitation agreement, shall be " +
          "commenced, heard and determined in the Family Court. Rule 1(2)(b) of the Family Law Rules applies the " +
          "rules to such cases.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: CJA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: FLR, pinpoint: "Family Law Rules, r. 1(2)(b)" }],
      },
      {
        note:
          "Filing a contract's support terms with the court. Under s. 35(1) of the Family Law Act, a party to a " +
          "domestic contract may file it with the clerk of the Ontario Court of Justice or of the Family Court, " +
          "with an affidavit stating that the contract is in effect and has not been set aside or varied. Under " +
          "s. 35(2), a support provision in a filed contract may be enforced and may be varied under s. 37 as if " +
          "it were an order of the court where it is filed.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
      },
    ],
    signals: [
      "prenup",
      "prenuptial agreement",
      "marriage contract",
      "cohabitation agreement",
      "set aside the prenup",
      "signed a prenup without a lawyer",
      "he hid assets before we signed",
      "living together agreement",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Family Law Act, R.S.O. 1990, c. F.3",
        officialUrl: FLA,
        verifiedAt: V,
        pinpoint: "ss. 33(4), 35(1)-(2), 52, 53, 55(1)-(2), 56(1), (1.1), (4), (7)",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: CJA,
        verifiedAt: V,
        pinpoint: "s. 21.8(1), Schedule item 2",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "r. 1(2)(b)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "family-matter-child-protection",
    name: "A children's aid society is involved with your child",
    broughtBy:
      "A children's aid society starts a child protection case about a child. The child's parents, and others " +
      "who have cared for the child, respond. This entry is for a parent or caregiver responding to the society.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "need-of-protection-protection",
        name: "What the court decides: whether the child is in need of protection",
        plainExplanation:
          "Under s. 81(1) of the Child, Youth and Family Services Act, 2017, a society may apply to the court to " +
          "determine whether a child is in need of protection. Under s. 90(1), the court shall hold a hearing to " +
          "determine the issue and make an order under s. 101. Section 74(2) sets out when a child is in need of " +
          "protection, including where the child has suffered physical harm, or there is a risk that the child is " +
          "likely to suffer physical harm, inflicted by the person having charge of the child or resulting from " +
          "that person's failure to adequately care for, provide for, supervise or protect the child or pattern " +
          "of neglect; sexual abuse or exploitation or a risk of it; a child who requires treatment that is not " +
          "provided; and emotional harm, or a risk of it, of the kinds the section describes.",
        sourceUrl: CYFSA,
        verifiedAt: V,
        consolidationPeriod: CYFSA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "What the society says happened",
            why: "The hearing decides whether the child is in need of protection under s. 74(2).",
            examples: [
              "The society's application and any affidavits served on you",
              "Any notes or letters from the society",
            ],
          },
          {
            name: "Your care of the child",
            why: "Section 74(2) looks at the care, supervision and protection the child has had.",
            examples: [
              "Medical and dental records",
              "School attendance and report cards",
              "Letters from people who know your care of the child",
            ],
          },
        ],
      },
      {
        id: "orders-court-can-make-protection",
        name: "The orders the court can make",
        plainExplanation:
          "Under s. 101(1) of the Act, where the court finds that a child is in need of protection and is " +
          "satisfied that intervention through a court order is necessary to protect the child in the future, the " +
          "court shall make one of these orders, or an order under s. 102, in the child's best interests: a " +
          "supervision order placing the child with a parent or another person subject to the society's " +
          "supervision for at least three months and not more than 12 months; interim society care for not more " +
          "than 12 months; extended society care; or interim society care followed by supervision for a total of " +
          "not more than 12 months. Under s. 101(2), the court shall ask the parties what efforts the society or " +
          "another person or entity has made to assist the child before intervention.",
        sourceUrl: CYFSA,
        verifiedAt: V,
        consolidationPeriod: CYFSA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Your plan of care for the child",
            why: "The order is made in the child's best interests, and a party's plan of care is put before the court.",
            examples: [
              "Where the child would live and who would care for them",
              "Programs, counselling or treatment you have started or completed",
              "Family members or others ready to help",
            ],
          },
          {
            name: "What help was offered before court",
            why: "Section 101(2) asks what efforts were made to assist the child before intervention.",
            examples: ["Records of services offered or used", "Any agreement signed with the society"],
          },
        ],
      },
      {
        id: "temporary-care-protection",
        name: "Where the child stays while the case is adjourned",
        plainExplanation:
          "Under s. 94(2) of the Act, where a hearing is adjourned, the court shall make a temporary order for " +
          "care and custody providing that the child remain in or be returned to the person who had charge of the " +
          "child immediately before intervention; remain with or be returned to that person subject to the " +
          "society's supervision and reasonable terms and conditions; be placed with another person, with that " +
          "person's consent, subject to the society's supervision; or remain or be placed in the care and custody " +
          "of the society. Under s. 94(1), the court shall not adjourn a hearing for more than 30 days unless all " +
          "the parties present and the person who will be caring for the child consent, or if it is aware that a " +
          "party who is not present objects to the longer adjournment.",
        sourceUrl: CYFSA,
        verifiedAt: V,
        consolidationPeriod: CYFSA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "A safe place for the child in the meantime",
            why: "Section 94(2) lists who the child may stay with during an adjournment.",
            examples: [
              "Details of a relative or friend willing to care for the child",
              "Terms you are willing to follow, such as supervision or programs",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "five-days-protection",
        name: "When a child has been taken to a place of safety",
        plainExplanation:
          "Under s. 88 of the Act, as soon as practicable, but in any event within five days after a child is " +
          "brought to a place of safety under s. 81, the matter shall be brought before a court for a child " +
          "protection hearing, or the child shall be returned to the person who last had charge of the child, or " +
          "a temporary care agreement or an agreement with a 16 or 17 year old shall be made. Under s. 81(7), a " +
          "child protection worker who believes on reasonable and probable grounds that a child younger than 16 " +
          "is in need of protection and that there would be a substantial risk to the child's health or safety " +
          "during the time needed to get a hearing or a warrant may bring the child to a place of safety without " +
          "a warrant.",
        whenThisComesUp: "When the society has removed the child from the home.",
        sourceUrl: CYFSA,
        verifiedAt: V,
        consolidationPeriod: CYFSA_CONSOLIDATION,
      },
      {
        id: "parties-and-child-lawyer-protection",
        name: "Who takes part in the case",
        plainExplanation:
          "Under s. 79(1) of the Act, the parties to a proceeding include the applicant, the society having " +
          "jurisdiction, the child's parent, and for a First Nations, Inuk or Métis child a representative chosen " +
          "by each of the child's bands and communities. Under s. 79(3), a person, including a foster parent, who " +
          "has cared for the child continuously during the six months immediately before the hearing is entitled " +
          "to the same notice as a party, may be present, may be represented by a lawyer and may make " +
          "submissions. Under s. 78(1), a child may have legal representation at any stage in the proceeding.",
        whenThisComesUp: "When a grandparent, relative or other caregiver wants to be involved, or the child's own views matter.",
        sourceUrl: CYFSA,
        verifiedAt: V,
        consolidationPeriod: CYFSA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "The court's timetable. Under r. 33(1) of the Family Law Rules, every child protection case, including " +
          "a status review application, is governed by a timetable that sets maximum times from the start of the " +
          "case: the first hearing within 5 days if the child has been brought to a place of safety, answers and " +
          "plans of care within 30 days, the temporary care and custody hearing within 35 days, a settlement " +
          "conference within 80 days and the hearing within 120 days. Under r. 33(3), the court may lengthen a " +
          "time only if the best interests of the child require it, and under r. 33(4) the parties may not " +
          "lengthen a time by consent.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
      {
        note:
          "Your plan of care. Under r. 33(5) of the Family Law Rules, a party who wants the court to consider a " +
          "plan of care or supervision shall serve it on the other parties and file it not later than seven days " +
          "before a conference, even if that is sooner than the timetable would require. Under r. 33(7)(c.1), a " +
          "respondent who is not a children's aid society uses Form 33B.1 for their answer and plan of care. " +
          "Under r. 33(6), evidence at a temporary care and custody hearing is given by affidavit, unless the " +
          "court orders otherwise.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
    ],
    signals: [
      "children's aid society",
      "CAS took my kids",
      "CAS apprehended my child",
      "child protection application",
      "society says my child is in need of protection",
      "plan of care",
      "supervision order",
      "temporary care and custody hearing",
      "CAS worker came to my home",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Child, Youth and Family Services Act, 2017, S.O. 2017, c. 14, Sched. 1",
        officialUrl: CYFSA,
        verifiedAt: V,
        pinpoint: "ss. 74(2), 78(1), 79(1), (3), 81(1), (7), 88, 90(1), 94(1)-(2), 101(1)-(2)",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "r. 33(1), (3)-(7)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "family-matter-unequal-division",
    name: "Asking for an unequal division of property",
    broughtBy:
      "A married spouse (or former spouse) in a property case who says splitting the difference in net family " +
      "property equally would be unconscionable, and asks for more or less than half. Common-law partners " +
      "have a separate case type for property.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "baseline-equalization-unequal",
        name: "The starting point: equalizing net family property",
        plainExplanation:
          "Under s. 5(1) of the Family Law Act, when a divorce is granted or a marriage is declared a nullity, or " +
          "when the spouses are separated and there is no reasonable prospect that they will resume cohabitation, " +
          "the spouse whose net family property is the lesser of the two is entitled to one-half the difference " +
          "between them. Under s. 5(7), the purpose of the section is to recognize that child care, household " +
          "management and financial provision are the joint responsibilities of the spouses and that there is " +
          "equal contribution by the spouses, entitling each to equalization, subject only to the equitable " +
          "considerations set out in s. 5(6).",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Each spouse's net family property",
            why: "The equalization payment is half the difference between the two net family properties.",
            examples: [
              "Net family property statement (Form 13B)",
              "Property and debt values at the date of marriage and the valuation date",
            ],
          },
        ],
      },
      {
        id: "unconscionable-unequal",
        name: "Equalizing would be unconscionable, because of a listed circumstance",
        plainExplanation:
          "Under s. 5(6) of the Family Law Act, the court may award a spouse an amount that is more or less than " +
          "half the difference between the net family properties if it is of the opinion that equalizing would be " +
          "unconscionable, having regard to: (a) a failure to disclose debts or liabilities existing at the date " +
          "of the marriage; (b) debts or liabilities claimed in reduction that were incurred recklessly or in bad " +
          "faith; (c) the part of a spouse's net family property that consists of gifts made by the other spouse; " +
          "(d) a spouse's intentional or reckless depletion of their net family property; (e) an amount that is " +
          "disproportionately large in relation to a period of cohabitation that is less than five years; (f) one " +
          "spouse having incurred a disproportionately larger amount of debts or liabilities for the support of the " +
          "family; (g) a written agreement between the spouses that is not a domestic contract; or (h) any other " +
          "circumstance relating to the acquisition, disposition, preservation, maintenance or improvement of " +
          "property.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Records of debts and spending",
            why: "Clauses (a), (b), (d) and (f) are about debts and depletion of property.",
            examples: [
              "Credit and loan statements, with dates",
              "Records of large withdrawals, sales or transfers before or after separation",
              "Debts not disclosed at the date of marriage",
            ],
          },
          {
            name: "Length of cohabitation",
            why: "Clause (e) refers to a period of cohabitation of less than five years.",
            examples: ["Records of when you began and stopped living together"],
          },
          {
            name: "Gifts and written agreements between the spouses",
            why: "Clauses (c) and (g) refer to gifts from the other spouse and to written agreements that are not domestic contracts.",
            examples: ["Records of gifts between the spouses", "Any written agreement between you"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "time-limit-unequal",
        name: "The time limit for a property claim",
        plainExplanation:
          "Under s. 7(3) of the Family Law Act, an application based on s. 5(1) or (2) shall not be brought after " +
          "the earliest of two years after the day the marriage is terminated by divorce or judgment of nullity, " +
          "six years after the day the spouses separate and there is no reasonable prospect that they will resume " +
          "cohabitation, and six months after the first spouse's death. Under s. 2(8), the court may, on motion, " +
          "extend a time prescribed by the Act if it is satisfied that there are apparent grounds for relief, " +
          "relief is unavailable because of delay incurred in good faith, and no person will suffer substantial " +
          "prejudice by reason of the delay.",
        whenThisComesUp: "When the divorce or separation happened some time ago.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
      },
      {
        id: "statement-of-property-unequal",
        name: "Each party must disclose their property",
        plainExplanation:
          "Under s. 8 of the Family Law Act, in an application under s. 7 each party shall serve and file a sworn " +
          "statement disclosing particulars of their property and debts and other liabilities as of the date of " +
          "the marriage, the valuation date and the date of the statement; the deductions and exclusions they " +
          "claim; and all property they disposed of during the two years immediately before the statement, or " +
          "during the marriage, whichever period is shorter.",
        whenThisComesUp: "When one spouse says the other spent down or transferred property.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Starting the claim. Under s. 7(1) of the Family Law Act, the court may, on the application of a spouse, " +
          "former spouse or deceased spouse's personal representative, determine any matter respecting the " +
          "spouses' entitlement under s. 5.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
      },
      {
        note:
          "Financial statements and the net family property statement. Under r. 13(1) and (1.2) of the Family " +
          "Law Rules, a property claim is served and filed with a financial statement in Form 13.1. Under " +
          "r. 13(14), before a settlement conference or trial, each party to a property claim under Part I of the " +
          "Family Law Act shall serve and file a net family property statement (Form 13B), or an affidavit saying " +
          "that the information in an earlier statement has not changed and is still true.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
    ],
    signals: [
      "unequal division of property",
      "equalization would be unfair",
      "he ran up debts before we separated",
      "she drained the bank accounts",
      "short marriage equalization",
      "unconscionable equalization payment",
      "spent our savings before the separation",
      "more than half the net family property",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Family Law Act, R.S.O. 1990, c. F.3",
        officialUrl: FLA,
        verifiedAt: V,
        pinpoint: "ss. 2(8), 5(1), (6), (7), 7(1), (3), 8",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "r. 13(1), (1.2), (14)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
