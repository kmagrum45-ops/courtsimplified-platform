/**
 * Case types, batch "family-1" (family): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/family-1.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   family-matter-child-support-variation -- Changing a child support order or agreement
 *   family-matter-spousal-support-variation -- Changing a spousal support order or agreement
 *   family-matter-support-enforcement-fro -- Getting unpaid support enforced (Family Responsibility Office)
 *   family-matter-relocation -- Moving with a child, or stopping a move
 *   family-matter-separation-agreement -- A separation agreement: making one, or setting one aside
 *   family-matter-matrimonial-home-possession -- Who stays in the family home after separation
 *   family-matter-common-law-property -- Property when a common-law relationship ends
 *   family-matter-grandparent-contact -- A grandparent or other relative seeking contact with a child
 *   family-matter-urgent-motion-before-conference -- Something urgent before the case conference
 *   family-matter-financial-disclosure -- Getting the other side's financial information
 *
 * Every legal statement below comes from text saved in docs/sources/corpus/
 * (the Family Law Act, Family Law Rules, Children's Law Reform Act, Ontario
 * Child Support Guidelines, Family Responsibility and Support Arrears
 * Enforcement Act, 1996, Limitations Act, 2002, Partition Act and Divorce
 * Act) or docs/sources/decisions/ (Kerr v. Baranow, 2011 SCC 10). Text the
 * e-Laws files mark "On a day to be named" is not stated as law. FLA s. 2(10)
 * is deliberately not paraphrased (its operative word is one the case-grading
 * check refuses, and changing the word would change the law).
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
const FRSAEA = "https://www.ontario.ca/laws/docs/96f31_e.doc";
const FRSAEA_CONSOLIDATION = "2026-05-01";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_CONSOLIDATION = "2024-12-04";
const PARTITION = "https://www.ontario.ca/laws/docs/90p04_e.doc";
const PARTITION_CONSOLIDATION = "2009-12-15";
const DIVORCE = "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html";
const KERR = "docs/sources/decisions/kerr-v-baranow-2011-SCC-10.english.txt";

const V = "2026-10-07";

export const TYPES_FAMILY_1: ClaimType[] = [
  // ---------------------------------------------------------------------------
  {
    id: "family-matter-child-support-variation",
    name: "Changing a child support order or agreement",
    broughtBy:
      "A parent, or another person named in a child support order, who wants the order changed, " +
      "suspended or ended, or wants relief from arrears. Also a parent with a support agreement " +
      "filed with the court. Either the parent who pays or the parent who receives can ask.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "who-can-apply-childsupportvariation",
        name: "Who can ask to change the order",
        plainExplanation:
          "Under s. 37(1) of the Family Law Act, an application to vary an order made or confirmed " +
          "under Part III (support) may be made by a dependant or respondent named in the order, a " +
          "parent of that dependant, the personal representative of that respondent, or an agency " +
          "referred to in s. 33(3). On the divorce path, s. 17(1)(a) of the Divorce Act says a court " +
          "may make an order varying, rescinding or suspending, retroactively or prospectively, a " +
          "support order or any provision of one, on application by either or both former spouses.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: DIVORCE, pinpoint: "Divorce Act, s. 17(1)(a)" }],
        evidenceCategories: [
          {
            name: "The order or agreement you want changed",
            why: "The change is asked for in relation to a specific order or filed agreement.",
            examples: [
              "A copy of the current child support order",
              "Any earlier variation orders",
              "A filed separation agreement, if support is set by agreement",
            ],
          },
          {
            name: "Which law the order was made under",
            why: "The Family Law Act and the Divorce Act each have their own variation rules.",
            examples: [
              "The heading of the order, showing the Act it was made under",
              "The divorce order, if there is one",
            ],
          },
        ],
      },
      {
        id: "change-in-circumstances-childsupportvariation",
        name: "A change in circumstances, or new evidence",
        plainExplanation:
          "Under s. 37(2.1) of the Family Law Act, for an order for the support of a child, if the " +
          "court is satisfied that there has been a change in circumstances within the meaning of the " +
          "child support guidelines, or that evidence not available on the previous hearing has " +
          "become available, the court may discharge, vary or suspend a term of the order, " +
          "prospectively or retroactively, relieve the respondent from paying part or all of the " +
          "arrears or any interest on them, and make any other child support order it could make " +
          "under s. 33. Section 14 of the Ontario Child Support Guidelines says what counts: where " +
          "the amount includes a determination made under the table, any change in circumstances " +
          "that would result in a different order or any provision of it; where it does not, any " +
          "change in the condition, means, needs or other circumstances of either parent or spouse " +
          "or of any child who is entitled to support. On the divorce path, s. 17(4) of the Divorce " +
          "Act says the court shall first satisfy itself that a change of circumstances as provided " +
          "for in the applicable guidelines has occurred since the order or the last variation order.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
        alsoCites: [
          { sourceUrl: FLA, pinpoint: "Family Law Act, s. 37(2.1)" },
          { sourceUrl: DIVORCE, pinpoint: "Divorce Act, s. 17(4)" },
        ],
        evidenceCategories: [
          {
            name: "What has changed since the order",
            why: "Section 14 of the Guidelines describes the changes that give rise to a variation.",
            examples: [
              "Pay stubs, a job loss letter or a Record of Employment",
              "Tax returns and notices of assessment since the order",
              "Records showing a change in where the child lives or in parenting time",
            ],
          },
          {
            name: "Evidence that was not available before",
            why: "Section 37(2.1) also covers evidence not available on the previous hearing.",
            examples: [
              "Documents that came to light after the order was made",
              "Income records the other parent did not disclose at the time",
            ],
          },
        ],
      },
      {
        id: "guidelines-apply-childsupportvariation",
        name: "The new amount is set under the Child Support Guidelines",
        plainExplanation:
          "Under s. 37(2.2) of the Family Law Act, a court making an order under s. 37(2.1) shall do " +
          "so in accordance with the child support guidelines. Under s. 37(2.3), the court may award " +
          "a different amount if it is satisfied that special provisions in an order or a written " +
          "agreement respecting the parents' financial obligations, or the division or transfer of " +
          "their property, directly or indirectly benefit a child, or that special provisions have " +
          "otherwise been made for the benefit of a child, and that applying the guidelines would " +
          "result in an amount that is inequitable given those special provisions. Under s. 37(2.5), " +
          "it may also award a different amount on the consent of both parents if it is satisfied " +
          "that reasonable arrangements have been made for the support of the child, and, where " +
          "support for the child is payable out of public money, the arrangements do not provide for " +
          "less than the guidelines amount. Sections 17(6.1), (6.2) and (6.4) of the Divorce Act set " +
          "out the same rules for a variation on the divorce path.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: DIVORCE, pinpoint: "Divorce Act, s. 17(6.1), (6.2), (6.4)" }],
        evidenceCategories: [
          {
            name: "Current income information for both parents",
            why: "The Guidelines amount is worked out from income.",
            examples: [
              "Most recent tax return and notice of assessment",
              "Recent pay stub or employer letter",
            ],
          },
          {
            name: "Any special provisions or agreed arrangements",
            why:
              "Section 37(2.3) and (2.5) refer to special provisions and to arrangements made on consent.",
            examples: [
              "A separation agreement dealing with property or support",
              "A written agreement between the parents about the child's support",
            ],
          },
        ],
      },
      {
        id: "filed-agreement-childsupportvariation",
        name: "Changing child support set by a filed agreement",
        plainExplanation:
          "Under s. 35(1) of the Family Law Act, a party to a domestic contract may file it with the " +
          "clerk of the Ontario Court of Justice or of the Family Court of the Superior Court of " +
          "Justice, with their affidavit stating that the contract is in effect and has not been set " +
          "aside or varied by a court or agreement. Under s. 35(2), a provision for support or " +
          "maintenance in a contract filed this way may be enforced, may be varied under s. 37, and, " +
          "for a provision for the support of a child, may be recalculated under s. 39.1, as if it " +
          "were an order of the court where it is filed.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The agreement and proof of filing",
            why: "Section 35(2) applies to a contract filed in the manner s. 35(1) describes.",
            examples: [
              "The signed separation agreement",
              "The court-stamped copy showing it was filed",
              "The affidavit filed with it",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "six-month-limit-childsupportvariation",
        name: "Asking again within six months",
        plainExplanation:
          "Under s. 37(3) of the Family Law Act, no application for variation shall be made within " +
          "six months after the making of the order for support or the disposition of another " +
          "application for variation in respect of the same order, except by leave of the court.",
        whenThisComesUp:
          "When the order was made, or an earlier request to change it was decided, less than six " +
          "months ago.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
      },
      {
        id: "yearly-income-information-childsupportvariation",
        name: "The yearly duty to share income information",
        plainExplanation:
          "Under s. 24.1(1) of the Ontario Child Support Guidelines, every person whose income or " +
          "other financial information is used to determine the amount of a child support order " +
          "shall, no later than 30 days after the anniversary of the date the order was made, in " +
          "every year in which the child is a child within the meaning of the Guidelines, give every " +
          "party to the order a copy of their personal income tax return and notice of assessment " +
          "(and any reassessment) for the most recent taxation year, and, as applicable, current " +
          "written information about any s. 7 expenses in the order, unless the parties have agreed " +
          "otherwise. Under s. 25(1), a parent or spouse against whom a child support order has been " +
          "made must also, on the written request of the other spouse or the person or agency " +
          "entitled to payment, not more than once a year, provide the documents listed in s. 21(1) " +
          "for any of the three most recent taxation years not already provided. Under s. 25(5), the " +
          "documents must be provided within 30 days after the request is received if the person " +
          "resides in Canada or the United States, and within 60 days if they reside elsewhere.",
        whenThisComesUp:
          "When a parent wants to know whether the other parent's income has changed before asking " +
          "for a change, or is asked for their own income information.",
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
          "How to ask: a motion to change under r. 15 of the Family Law Rules. Under r. 15(2), the " +
          "rule applies to a motion to change a final order, an agreement for support filed under " +
          "s. 35 of the Family Law Act, or a family arbitration award filed under s. 59.9 of that Act. " +
          "Under r. 15(5), subject to r. 15(17) and (18), a party who wants to change a final order " +
          "or agreement shall serve and file a motion to change (Form 15), with all required " +
          "attachments. Under r. 15(6), the party making the motion also serves a blank response to " +
          "motion to change (Form 15B) and a blank consent motion to change (Form 15C), and under r. " +
          "15(7) these documents are served by special service, not regular service. Under r. 15(9) " +
          "and (10), the other party serves and files a response (Form 15B), or returns a signed " +
          "consent (Form 15C), no later than 30 days after receiving the motion if they reside in " +
          "Canada or the United States, or 60 days in any other case. Under r. 15(18), if the parties " +
          "and any assignee agree to change only a child support obligation, they file a consent " +
          "motion to change child support (Form 15D) with the documents that subrule lists.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
      {
        note:
          "Financial statements on a motion to change. Under r. 13(4.2) of the Family Law Rules, " +
          "subject to r. 13(1.3), if a motion is made under r. 15 to change a final support order or " +
          "a support agreement, the party making the motion serves and files a financial statement " +
          "(Form 13 or 13.1) with the motion to change (Form 15), and the responding party serves and " +
          "files one within the time for responding set out in r. 15(10). Parties who bring the " +
          "motion by filing a consent motion to change child support (Form 15D) do not need to serve " +
          "or file financial statements. Under r. 13(5.0.1), a party required to serve a financial " +
          "statement on such a motion also serves, unless the court orders otherwise, the documents " +
          "referred to in r. 13(3.1), a current schedule of arrears from the Family Responsibility " +
          "Office, and proof of income for each year for which they are seeking to change or cancel " +
          "arrears.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
    ],
    signals: [
      "change my child support order",
      "my income went down and I can't pay the support",
      "lost my job and pay child support",
      "the other parent earns more now",
      "vary child support",
      "motion to change child support",
      "Form 15 motion to change",
      "child now lives with me but I still pay support",
      "reduce child support payments",
      "increase child support",
      "cancel child support arrears",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Family Law Act, R.S.O. 1990, c. F.3",
        officialUrl: FLA,
        verifiedAt: V,
        pinpoint: "ss. 35(1)-(2), 37(1), (2.1)-(2.3), (2.5), (3)",
      },
      {
        sourceName: "Child Support Guidelines, O. Reg. 391/97",
        officialUrl: CSG,
        verifiedAt: V,
        pinpoint: "ss. 14, 24.1(1), 25(1), (5)",
      },
      {
        sourceName: "Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.)",
        officialUrl: DIVORCE,
        verifiedAt: V,
        pinpoint: "s. 17(1)(a), (4), (6.1), (6.2), (6.4)",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "rr. 13(4.2), 13(5.0.1), 15(2), (5)-(7), (9), (10), (18)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "family-matter-spousal-support-variation",
    name: "Changing a spousal support order or agreement",
    broughtBy:
      "A former spouse or partner who pays or receives spousal support under an order or a filed " +
      "agreement and wants it changed, suspended or ended. Not a request about child support.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "material-change-fla-spousalvariation",
        name: "Under the Family Law Act: a material change, or new evidence",
        plainExplanation:
          "Under s. 37(1) of the Family Law Act, an application to vary an order made or confirmed " +
          "under Part III (support) may be made by a dependant or respondent named in the order, a " +
          "parent of that dependant, the personal representative of that respondent, or an agency " +
          "referred to in s. 33(3). Under s. 37(2), for an order for support of a spouse or parent, " +
          "if the court is satisfied that there has been a material change in the dependant's or " +
          "respondent's circumstances, or that evidence not available on the previous hearing has " +
          "become available, the court may discharge, vary or suspend a term of the order, " +
          "prospectively or retroactively, relieve the respondent from paying part or all of the " +
          "arrears or any interest on them, and make any other order under s. 34 that the court " +
          "considers appropriate in the circumstances referred to in s. 33.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The current order or filed agreement",
            why: "The variation is asked for in relation to a specific order.",
            examples: ["The spousal support order", "Any earlier variation orders"],
          },
          {
            name: "What has changed",
            why: "Section 37(2) refers to a material change in either person's circumstances.",
            examples: [
              "Income records since the order (tax returns, notices of assessment, pay stubs)",
              "Records of a job loss, retirement, illness or disability",
              "Records of a new household or other changed expenses",
            ],
          },
        ],
      },
      {
        id: "change-divorce-act-spousalvariation",
        name: "Under the Divorce Act: a change in condition, means, needs or other circumstances",
        plainExplanation:
          "Under s. 17(1)(a) of the Divorce Act, a court may make an order varying, rescinding or " +
          "suspending, retroactively or prospectively, a support order or any provision of one, on " +
          "application by either or both former spouses. Under s. 17(4.1), before the court makes a " +
          "variation order for a spousal support order, it shall satisfy itself that a change in the " +
          "condition, means, needs or other circumstances of either former spouse has occurred since " +
          "the order or the last variation order, and it shall take that change into consideration. " +
          "Under s. 17(7), a variation order varying a spousal support order should recognize any " +
          "economic advantages or disadvantages to the former spouses arising from the marriage or " +
          "its breakdown; apportion between them any financial consequences arising from the care of " +
          "any child of the marriage over and above any obligation for the support of any child of " +
          "the marriage; relieve any economic hardship of the former spouses arising from the " +
          "breakdown of the marriage; and, in so far as practicable, promote the economic " +
          "self-sufficiency of each former spouse within a reasonable period of time.",
        sourceUrl: DIVORCE,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "Each former spouse's current finances",
            why: "Section 17(4.1) looks at the condition, means, needs or other circumstances of either former spouse.",
            examples: [
              "Financial statement (Form 13 or 13.1)",
              "Tax returns and notices of assessment since the order",
              "Records of current expenses and debts",
            ],
          },
          {
            name: "Steps toward self-sufficiency",
            why: "Section 17(7)(d) refers to promoting each former spouse's economic self-sufficiency.",
            examples: [
              "Job search records, training or school enrolment",
              "Medical records, if health affects the ability to work",
            ],
          },
        ],
      },
      {
        id: "time-limited-order-spousalvariation",
        name: "Support that was for a set period, or until an event",
        plainExplanation:
          "Under s. 17(10) of the Divorce Act, where a spousal support order provides for support " +
          "for a definite period or until a specified event occurs, a court may not, on an " +
          "application started after that period ends or the event occurs, make a variation order " +
          "to resume that support unless it is satisfied that (a) a variation order is necessary to " +
          "relieve economic hardship arising from a change described in s. 17(4.1) that is related to " +
          "the marriage, and (b) the changed circumstances, had they existed when the spousal support " +
          "order or the last variation order was made, would likely have resulted in a different order.",
        sourceUrl: DIVORCE,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "The order's end date or end event",
            why: "Section 17(10) applies where the order was for a definite period or until a specified event.",
            examples: ["The term of the order setting the end date or event", "The date the period ended or the event happened"],
          },
          {
            name: "The hardship and how it relates to the marriage",
            why: "Section 17(10)(a) refers to economic hardship arising from a change related to the marriage.",
            examples: ["Records of current income and expenses", "Records connecting the change to the marriage"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "agreement-support-term-spousalvariation",
        name: "Spousal support set by a domestic contract",
        plainExplanation:
          "Under s. 35(2) of the Family Law Act, a provision for support or maintenance in a domestic " +
          "contract filed with the court under s. 35(1) may be enforced and may be varied under s. 37 " +
          "as if it were an order of the court where it is filed, and under s. 35(3), s. 33(4) " +
          "applies to a contract filed this way. Under s. 33(4), the court may set aside a provision " +
          "for support or a waiver of the right to support in a domestic contract, and may determine " +
          "and order support, even though the contract has an express provision excluding s. 33, (a) " +
          "if the provision for support or the waiver results in unconscionable circumstances; (b) if " +
          "the provision is in favour of, or the waiver is by or on behalf of, a dependant who " +
          "qualifies for an allowance for support out of public money; or (c) if there is default in " +
          "the payment of support under the contract when the application is made.",
        whenThisComesUp:
          "When spousal support was set, or given up, in a separation agreement rather than a court order.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
      },
      {
        id: "child-support-priority-spousalvariation",
        name: "Child support comes first",
        plainExplanation:
          "Under s. 15.3(1) of the Divorce Act, where a court is considering an application for a " +
          "child support order and an application for a spousal support order, the court shall give " +
          "priority to child support in determining the applications. Under s. 17(6.6), s. 15.3 " +
          "applies, with any necessary modifications, when a court is considering applications to " +
          "vary both a child support order and a spousal support order.",
        whenThisComesUp: "When a request to change spousal support is made together with a child support request.",
        sourceUrl: DIVORCE,
        verifiedAt: V,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "How to ask: a motion to change under r. 15 of the Family Law Rules. Under r. 15(2), the " +
          "rule applies to a motion to change a final order, an agreement for support filed under " +
          "s. 35 of the Family Law Act, or a family arbitration award filed under s. 59.9 of that Act. " +
          "Under r. 15(5), subject to r. 15(17) and (18), a party who wants to change a final order " +
          "or agreement shall serve and file a motion to change (Form 15), with all required " +
          "attachments, and under r. 15(7) it is served by special service. Under r. 15(9) and (10), " +
          "the other party serves and files a response (Form 15B), or returns a signed consent (Form " +
          "15C), no later than 30 days after receiving the motion if they reside in Canada or the " +
          "United States, or 60 days in any other case. Under r. 13(4.2), the party making the motion " +
          "serves and files a financial statement (Form 13 or 13.1) with the motion to change, and the " +
          "responding party serves and files one within the time for responding.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
      {
        note:
          "Six months between requests (Family Law Act orders). Under s. 37(3) of the Family Law Act, " +
          "no application for variation shall be made within six months after the making of the " +
          "order for support or the disposition of another application for variation in respect of " +
          "the same order, except by leave of the court.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
      },
    ],
    signals: [
      "change spousal support",
      "stop paying spousal support",
      "my ex remarried do I still pay spousal support",
      "retired and still paying my ex",
      "vary spousal support order",
      "reduce alimony",
      "my ex makes more money now",
      "spousal support ended and I need it back",
      "separation agreement waived spousal support",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Family Law Act, R.S.O. 1990, c. F.3",
        officialUrl: FLA,
        verifiedAt: V,
        pinpoint: "ss. 33(4), 35(2)-(3), 37(1)-(3)",
      },
      {
        sourceName: "Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.)",
        officialUrl: DIVORCE,
        verifiedAt: V,
        pinpoint: "ss. 15.3(1), 17(1)(a), (4.1), (6.6), (7), (10)",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "rr. 13(4.2), 15(2), (5), (7), (9), (10)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "family-matter-support-enforcement-fro",
    name: "Getting unpaid support enforced (Family Responsibility Office)",
    broughtBy:
      "A person who is owed child or spousal support under a court order or filed agreement and " +
      "is not being paid. A person who pays support and is facing enforcement steps also uses this " +
      "to understand the process.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "order-filed-with-director-fro",
        name: "A support order filed with the Family Responsibility Office",
        plainExplanation:
          "Under s. 1(1) of the Family Responsibility and Support Arrears Enforcement Act, 1996, the " +
          "\"Director\" is the Director of the Family Responsibility Office, a \"support order\" is a " +
          "provision in an order made in or outside Ontario and enforceable in Ontario for the " +
          "payment of money as support or maintenance, a \"payor\" is a person who is required to pay " +
          "support under a support order, and a \"recipient\" is a person entitled to support under a " +
          "support order or the parent, other than the payor, of a child entitled to support under a " +
          "support order. Under s. 5(1), it is the duty of the Director to enforce support orders " +
          "where the support order and the related support deduction order, if any, are filed in " +
          "the Director's office, and to pay the amounts collected to the person to whom they are " +
          "owed. Under s. 12(1), the clerk or registrar of the court that makes a support order shall " +
          "file it with the Director's office promptly after it is signed. Under s. 15, subject to " +
          "ss. 12, 12.1, 12.2, 13 and 14, a support order may be filed in the Director's office only " +
          "by the payor or recipient under the order. Under s. 6(2), the Director may enforce the " +
          "payment of arrears of support under a support order although they were incurred before " +
          "the order was filed in the Director's office.",
        sourceUrl: FRSAEA,
        verifiedAt: V,
        consolidationPeriod: FRSAEA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The support order",
            why: "The Director enforces support orders that are filed in the Director's office.",
            examples: [
              "The court order with the support terms",
              "A filed separation agreement with support terms",
              "Any letter from the Family Responsibility Office with a case number",
            ],
          },
          {
            name: "A record of what was paid and missed",
            why: "Arrears are the support owed and not paid.",
            examples: [
              "Bank statements showing payments received",
              "A list of each missed or partial payment with dates",
              "A statement of arrears from the Family Responsibility Office",
            ],
          },
        ],
      },
      {
        id: "support-deduction-order-fro",
        name: "Support taken from the payor's income (support deduction orders)",
        plainExplanation:
          "Under s. 10(1) of the Family Responsibility and Support Arrears Enforcement Act, 1996, an " +
          "Ontario court that makes a support order shall also make a support deduction order, and " +
          "under s. 10(4) it shall be made even though the court cannot identify an income source " +
          "for the payor when the support order is made. Under s. 1(1), an \"income source\" includes " +
          "an individual, corporation or other entity that owes or makes payments to or on behalf of " +
          "a payor of wages, wage supplements or salary. Under s. 22(1), an income source that " +
          "receives notice of a support deduction order, whether or not it is named in the order, " +
          "shall, subject to s. 23, deduct from the money it owes the payor the amount of support " +
          "owed, or the other amount set out in the notice, and pay that amount to the Director.",
        sourceUrl: FRSAEA,
        verifiedAt: V,
        consolidationPeriod: FRSAEA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Where the payor is paid from",
            why: "A support deduction order works through the payor's income sources.",
            examples: [
              "The payor's employer's name and address, if known",
              "Any pension, benefits or other regular payments the payor receives, if known",
            ],
          },
        ],
      },
      {
        id: "enforcement-steps-fro",
        name: "Other steps the Director can take",
        plainExplanation:
          "Under s. 6(1) of the Family Responsibility and Support Arrears Enforcement Act, 1996, the " +
          "Director may commence and conduct a proceeding and take any steps in the Director's name " +
          "for the benefit of recipients, including enforcing filed support deduction orders and " +
          "employing other enforcement mechanisms, whether or not expressly provided for in the Act. " +
          "Under s. 6(6), enforcement by one means does not prevent enforcement by other means at " +
          "the same time or different times. The Act lists, among others: under s. 34, when a filed " +
          "support order is in default, a first notice to the payor that their driver's licence may " +
          "be suspended unless, within 30 days, they make an arrangement satisfactory to the Director, " +
          "obtain and file an order to refrain, or pay all arrears; under s. 41(1), a default hearing, " +
          "where the Director serves a notice and statement of arrears requiring the payor to deliver " +
          "a financial statement and proof of income and appear before the court to explain the " +
          "default; and under s. 42(1), registration of a support order against the payor's land, so " +
          "that the obligation becomes a charge on the property.",
        sourceUrl: FRSAEA,
        verifiedAt: V,
        consolidationPeriod: FRSAEA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Information that helps locate the payor's income and property",
            why: "The Act's enforcement steps work on the payor's licence, income, land and other assets.",
            examples: [
              "The payor's current address, if known",
              "Any property the payor owns, if known",
              "Any business the payor runs, if known",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "director-may-refuse-fro",
        name: "When the Director may refuse to enforce",
        plainExplanation:
          "Under s. 7(1) of the Family Responsibility and Support Arrears Enforcement Act, 1996, " +
          "despite s. 5, the Director may at any time refuse to enforce a filed support order or " +
          "support deduction order, or any part of one, if, in the Director's opinion, any of the " +
          "listed circumstances applies. They include: the amount is nominal; the amount cannot be " +
          "determined from the face of the order; the meaning of the order is unclear or ambiguous; " +
          "the recipient has not complied with reasonable requests for information needed to enforce " +
          "the order or about the arrears; the recipient's whereabouts cannot be determined after " +
          "reasonable efforts; the recipient repeatedly accepts payment of support directly from the " +
          "payor; the recipient consents to a limitation of enforcement; enforcement has been stayed " +
          "by a court; or enforcement is otherwise unreasonable or impractical.",
        whenThisComesUp:
          "When the Family Responsibility Office says it will not, or will no longer, enforce an order.",
        sourceUrl: FRSAEA,
        verifiedAt: V,
        consolidationPeriod: FRSAEA_CONSOLIDATION,
      },
      {
        id: "withdrawing-order-fro",
        name: "Taking an order out of the Family Responsibility Office",
        plainExplanation:
          "Under s. 16(1) of the Family Responsibility and Support Arrears Enforcement Act, 1996, a " +
          "filed support order or support deduction order may be withdrawn at any time, as described " +
          "in s. 16(1.1), unless the support order states that it and the related support deduction " +
          "order cannot be withdrawn. Under s. 16(1.1), withdrawal is by written notice signed by the " +
          "recipient and the payor if the payor is in compliance as defined in the regulations, or by " +
          "the recipient if the payor is not. Under s. 16(3), the Director shall cease enforcement of " +
          "an order upon its withdrawal. Under s. 16(5), a support order cannot be withdrawn unless " +
          "the related support deduction order, if any, is also withdrawn, and the reverse.",
        whenThisComesUp:
          "When the parties want to deal with payments between themselves instead of through the office.",
        sourceUrl: FRSAEA,
        verifiedAt: V,
        consolidationPeriod: FRSAEA_CONSOLIDATION,
      },
      {
        id: "order-to-refrain-fro",
        name: "A payor facing a driver's licence suspension",
        plainExplanation:
          "Under s. 35(1) of the Family Responsibility and Support Arrears Enforcement Act, 1996, if " +
          "a payor is served with a first notice under s. 34 and makes a motion to change the support " +
          "order, the payor may also, on notice to the Director, make a motion for an order that the " +
          "Director refrain from directing the suspension of the payor's driver's licence under s. " +
          "37(1), on the terms that the court considers just, which may include payment terms. Under " +
          "s. 35(3), payment terms in an order to refrain do not affect the accruing of arrears, nor " +
          "any other means of enforcing the support order.",
        whenThisComesUp:
          "When a payor has received a first notice about a driver's licence suspension and is asking " +
          "to change the support order.",
        sourceUrl: FRSAEA,
        verifiedAt: V,
        consolidationPeriod: FRSAEA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "No limitation period. Under s. 16(1) of the Limitations Act, 2002, there is no limitation " +
          "period in respect of (b) a proceeding to enforce an order of a court, or any other order " +
          "that may be enforced in the same way as an order of a court; or (c) a proceeding to obtain " +
          "support under the Family Law Act or to enforce a provision for support or maintenance " +
          "contained in a contract or agreement that could be filed under s. 35 of that Act.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
      {
        note:
          "If the order is not filed with the Family Responsibility Office. Under s. 41(2) of the " +
          "Family Responsibility and Support Arrears Enforcement Act, 1996, when a support order that " +
          "is not filed in the Director's office is in default, the recipient may file a request with " +
          "the court, together with a statement of arrears, and the clerk shall, by notice served on " +
          "the payor with the statement of arrears, require the payor to file a financial statement " +
          "and appear before the court to explain the default. Under r. 26(3) of the Family Law " +
          "Rules, a payment order may be enforced by a request for a financial statement, a request " +
          "for disclosure from an income source, a financial examination, seizure and sale, " +
          "garnishment, a default hearing (if the order is a support order), the appointment of a " +
          "receiver, and registration under s. 42 of that Act. Under r. 26(5), a statement of money " +
          "owed is in Form 26, with a copy of the order that is in default attached.",
        sourceUrl: FRSAEA,
        verifiedAt: V,
        consolidationPeriod: FRSAEA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: FLR, pinpoint: "Family Law Rules, r. 26(3), (5)" }],
      },
    ],
    signals: [
      "ex is not paying child support",
      "support arrears are piling up",
      "Family Responsibility Office",
      "FRO won't enforce my order",
      "garnish his wages for support",
      "he owes me years of support",
      "how do I collect unpaid spousal support",
      "FRO is suspending my driver's licence",
      "file my support order with FRO",
      "support payments stopped",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Family Responsibility and Support Arrears Enforcement Act, 1996, S.O. 1996, c. 31",
        officialUrl: FRSAEA,
        verifiedAt: V,
        pinpoint: "ss. 1(1), 5(1), 6(1), (2), (6), 7(1), 10(1), (4), 12(1), 15, 16, 22(1), 34, 35(1), (3), 41(1)-(2), 42(1)",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: LIMITATIONS,
        verifiedAt: V,
        pinpoint: "s. 16(1)(b)-(c)",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "r. 26(3), (5)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "family-matter-relocation",
    name: "Moving with a child, or stopping a move",
    broughtBy:
      "A parent or other person with decision-making responsibility or parenting time who plans to " +
      "move in a way that affects the child's relationship with someone else, or a person with " +
      "parenting time, decision-making responsibility or contact who objects to a planned move.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "what-is-relocation-relocation",
        name: "What counts as a \"relocation\"",
        plainExplanation:
          "Under s. 18(1) of the Children's Law Reform Act, \"relocation\" means a change in residence " +
          "of a child, or of a person who has decision-making responsibility or parenting time with " +
          "respect to the child or is an applicant for a parenting order, that is likely to have a " +
          "significant impact on the child's relationship with another person who has " +
          "decision-making responsibility or parenting time or is an applicant for a parenting " +
          "order, or with a person who has contact with the child under a contact order. Section 2(1) " +
          "of the Divorce Act defines \"relocation\" in the same way for a child of the marriage.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: DIVORCE, pinpoint: "Divorce Act, s. 2(1) (\"relocation\")" }],
        evidenceCategories: [
          {
            name: "The current and planned addresses",
            why: "A relocation is a change in residence with a significant impact on a relationship.",
            examples: [
              "The current address and the new address",
              "Distance and travel time between them",
            ],
          },
          {
            name: "How the child's time is shared now",
            why: "The definition looks at the impact on the child's relationship with others.",
            examples: [
              "The current parenting order, contact order or agreement",
              "A calendar or log of the child's actual schedule",
            ],
          },
        ],
      },
      {
        id: "sixty-day-notice-relocation",
        name: "Notice at least 60 days before the move",
        plainExplanation:
          "Under s. 39.3(1) of the Children's Law Reform Act, a person who has decision-making " +
          "responsibility or parenting time and who intends a relocation shall, at least 60 days " +
          "before the expected date of the proposed relocation, notify any other person who has " +
          "decision-making responsibility, parenting time or contact under a contact order with " +
          "respect to the child. Under s. 39.3(2), the notice shall be in the form prescribed by the " +
          "regulations or, if no form is prescribed, in writing, and shall set out the expected date " +
          "of the relocation, the address of the new residence and contact information, a proposal " +
          "as to how decision-making responsibility, parenting time or contact could be exercised, " +
          "and any other prescribed information. Under s. 39.3(3), on application, the court may " +
          "provide that these notice requirements do not apply, or apply with changes, if it is of " +
          "the opinion that it is appropriate to do so, including if there is a risk of family " +
          "violence; under s. 39.3(4) that application may be made without notice to any other party. " +
          "Section 16.9 of the Divorce Act sets out a similar 60-day notice rule, in the form " +
          "prescribed by the regulations, on the divorce path.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: DIVORCE, pinpoint: "Divorce Act, s. 16.9(1)-(3)" }],
        evidenceCategories: [
          {
            name: "The notice that was given",
            why: "Section 39.3(1) and (2) set when the notice is given and what it says.",
            examples: [
              "A copy of the written notice or prescribed form",
              "Proof of the date it was delivered",
            ],
          },
          {
            name: "The proposal for the child's time after the move",
            why: "The notice includes a proposal for how parenting time or contact could be exercised.",
            examples: [
              "A proposed new schedule",
              "A plan for travel and who pays for it",
              "A plan for calls or video contact",
            ],
          },
        ],
      },
      {
        id: "objection-and-authorization-relocation",
        name: "Objecting within 30 days, and when the move can happen",
        plainExplanation:
          "Under s. 39.3(5) of the Children's Law Reform Act, a person with decision-making " +
          "responsibility or parenting time who receives notice of a proposed relocation may, no later " +
          "than 30 days after receiving it, object by notifying the person who gave the notice, or by " +
          "making an application under s. 21. Under s. 39.3(6), a notice of objection is in writing " +
          "and sets out a statement that the person objects, the reasons for the objection, the " +
          "person's views on the proposal in the notice, and any other prescribed information. Under " +
          "s. 39.4(2), a person who has given notice under s. 39.3 may relocate the child as of the " +
          "date in the notice if the relocation is authorized by a court, or if no objection is made " +
          "in accordance with s. 39.3(5) and there is no order prohibiting the relocation. Section " +
          "16.91 of the Divorce Act sets out a similar rule on the divorce path.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: DIVORCE, pinpoint: "Divorce Act, s. 16.91(1)-(2)" }],
        evidenceCategories: [
          {
            name: "The objection and its timing",
            why: "Section 39.3(5) sets a 30-day window for objecting.",
            examples: [
              "A copy of the written objection or court application",
              "The date the notice of relocation was received",
            ],
          },
        ],
      },
      {
        id: "best-interests-factors-relocation",
        name: "What the court considers in deciding whether to authorize a move",
        plainExplanation:
          "Under s. 39.4(3) of the Children's Law Reform Act, in determining whether to authorize the " +
          "relocation of a child, the court shall take into account the best interests of the child " +
          "in accordance with s. 24, as well as: (a) the reasons for the relocation; (b) the impact of " +
          "the relocation on the child; (c) the amount of time spent with the child by each person " +
          "who has parenting time or is an applicant for a parenting order, and each one's level of " +
          "involvement in the child's life; (d) whether the person who intends to relocate the child " +
          "has complied with any applicable notice requirement and any applicable Act, regulation, " +
          "order, family arbitration award and agreement; (e) the existence of an order, award or " +
          "agreement that specifies the geographic area in which the child is to reside; (f) the " +
          "reasonableness of the relocating person's proposal to vary the exercise of decision-making " +
          "responsibility, parenting time or contact, considering among other things the location of " +
          "the new residence and the travel expenses; and (g) whether each person with " +
          "decision-making responsibility or parenting time, or who is an applicant for a parenting " +
          "order, has complied with their obligations, and the likelihood of future compliance. Under " +
          "s. 39.4(4), the court shall not consider whether, if the relocation were prohibited, the " +
          "person who intends to relocate the child would relocate without the child or not " +
          "relocate. Section 16.92 of the Divorce Act lists the same factors on the divorce path.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: DIVORCE, pinpoint: "Divorce Act, s. 16.92(1)-(2)" }],
        evidenceCategories: [
          {
            name: "The reasons for the move",
            why: "Section 39.4(3)(a) lists the reasons for the relocation.",
            examples: [
              "A job offer or transfer letter",
              "Housing costs or a lease at the new location",
              "Family support available at the new location",
            ],
          },
          {
            name: "Each person's involvement in the child's life",
            why: "Section 39.4(3)(c) looks at time spent with the child and level of involvement.",
            examples: [
              "School, medical and activity records showing who attends",
              "A log of parenting time actually exercised",
            ],
          },
          {
            name: "Existing orders and compliance",
            why: "Section 39.4(3)(d), (e) and (g) look at orders, agreements and compliance with them.",
            examples: [
              "Any order or agreement naming where the child is to live",
              "Records of notices given and obligations met",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "burden-of-proof-relocation",
        name: "Who has to prove what",
        plainExplanation:
          "Under s. 39.4(5) of the Children's Law Reform Act, if the parties substantially comply with " +
          "an order, family arbitration award or agreement that provides that a child spend " +
          "substantially equal time in the care of each party, the party who intends to relocate the " +
          "child has the burden of proving that the relocation would be in the best interests of the " +
          "child. Under s. 39.4(6), if they substantially comply with one that provides that the " +
          "child spend the vast majority of time in the care of the party who intends to relocate, " +
          "the party opposing the relocation has the burden of proving that it would not be in the " +
          "child's best interests. Under s. 39.4(7), in any other case the parties have the burden of " +
          "proving whether the relocation is in the best interests of the child. Under s. 39.4(8), if " +
          "the order in s. 39.4(5) or (6) is an interim order, the court may determine that the " +
          "subsection does not apply. Section 16.93 of the Divorce Act sets out the same burdens.",
        whenThisComesUp: "When a court is asked to authorize or prohibit a relocation.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: DIVORCE, pinpoint: "Divorce Act, s. 16.93" }],
      },
      {
        id: "relocation-and-variation-relocation",
        name: "Relocation and changing an existing parenting order",
        plainExplanation:
          "Under s. 29(1) of the Children's Law Reform Act, a court shall not make an order that " +
          "varies a parenting order or contact order unless there has been a material change in " +
          "circumstances that affects or is likely to affect the best interests of the child. Under " +
          "s. 29(2), a relocation of a child in accordance with s. 39.4 constitutes a material change " +
          "in circumstances, unless the relocation had been prohibited by a court, in which case it " +
          "does not, in itself, constitute one. Under s. 17(5.2) and (5.3) of the Divorce Act, a " +
          "relocation is deemed to be a change in the child's circumstances, and a relocation that " +
          "was prohibited by a court does not, in itself, constitute one.",
        whenThisComesUp: "When a move has happened or is planned and someone asks to change the parenting order.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: DIVORCE, pinpoint: "Divorce Act, s. 17(5.2)-(5.3)" }],
      },
      {
        id: "relocation-costs-relocation",
        name: "Sharing the costs of parenting time after a move",
        plainExplanation:
          "Under s. 39.4(9) of the Children's Law Reform Act, if a court authorizes the relocation of " +
          "a child, it may provide for the apportionment of costs relating to the exercise of " +
          "parenting time by a person who is not relocating, between that person and the person who " +
          "is relocating the child.",
        whenThisComesUp: "When a move is authorized and travel for parenting time will cost more.",
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
          "Which court, and the affidavit that goes with the claim. Under s. 18(1) of the Children's " +
          "Law Reform Act, \"court\" means the Ontario Court of Justice, the Family Court or the " +
          "Superior Court of Justice. Under r. 35.1(1) of the Family Law Rules, if an application, " +
          "answer or motion to change a final order contains a claim respecting decision-making " +
          "responsibility, parenting time or contact, the party making the claim serves and files " +
          "with it an affidavit in Form 35.1 and, if the child or any party has been involved in a " +
          "child protection case or received services from a child protection agency, an affidavit " +
          "in Form 35.1A.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: FLR, pinpoint: "Family Law Rules, r. 35.1(1)" }],
      },
      {
        note:
          "Urgent motions about removing a child. Under r. 14(12)(b) of the Family Law Rules, a " +
          "motion may be made without notice if there is an immediate danger of a child's removal " +
          "from Ontario, and the delay involved in serving a notice of motion would probably have " +
          "serious consequences. Under r. 14(14), an order made on a motion without notice (Form 14D) " +
          "shall require the matter to come back to the court, and if possible to the same judge, " +
          "within 14 days or on a date chosen by the court.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
    ],
    signals: [
      "I want to move with my child to another city",
      "my ex wants to move away with the kids",
      "notice of relocation",
      "can I move with my kids without permission",
      "stop the other parent moving the children",
      "moving to another province with my child",
      "60 days notice to move",
      "object to the move",
      "relocate for a new job with my children",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Children's Law Reform Act, R.S.O. 1990, c. C.12",
        officialUrl: CLRA,
        verifiedAt: V,
        pinpoint: "ss. 18(1), 29(1)-(2), 39.3, 39.4(2)-(9)",
      },
      {
        sourceName: "Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.)",
        officialUrl: DIVORCE,
        verifiedAt: V,
        pinpoint: "ss. 2(1), 16.9, 16.91, 16.92, 16.93, 17(5.2)-(5.3)",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "rr. 14(12)(b), 14(14), 35.1(1)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "family-matter-separation-agreement",
    name: "A separation agreement: making one, or setting one aside",
    broughtBy:
      "Two people who lived together and have separated, making a written agreement about their " +
      "property, support and children; or one of them asking the court to set aside an agreement " +
      "already signed, or a part of it.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "what-it-covers-separationagreement",
        name: "What a separation agreement can cover",
        plainExplanation:
          "Under s. 54 of the Family Law Act, two persons who cohabited and are living separate and " +
          "apart may enter into an agreement in which they agree on their respective rights and " +
          "obligations, including (a) ownership in or division of property; (b) support obligations; " +
          "(c) the right to direct the education and moral training of their children; (d) the right " +
          "to decision-making responsibility or parenting time with respect to their children; and " +
          "(e) any other matter in the settlement of their affairs. Under s. 51, a separation " +
          "agreement is one of the kinds of \"domestic contract\".",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The dates of living together and separating",
            why: "Section 54 applies to two persons who cohabited and are living separate and apart.",
            examples: [
              "Records showing when you started and stopped living together",
              "Change-of-address records",
            ],
          },
          {
            name: "The topics the agreement deals with",
            why: "Section 54 lists property, support, the children and other matters.",
            examples: [
              "A list of property and debts",
              "Income records for support",
              "A proposed parenting schedule",
            ],
          },
        ],
      },
      {
        id: "writing-signed-witnessed-separationagreement",
        name: "In writing, signed and witnessed",
        plainExplanation:
          "Under s. 55(1) of the Family Law Act, a domestic contract, and an agreement to amend or " +
          "rescind one, are unenforceable unless made in writing, signed by the parties and " +
          "witnessed. Under s. 55(2), a minor has capacity to enter into a domestic contract, subject " +
          "to the approval of the court, which may be given before or after the minor enters into it.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The signed agreement",
            why: "Section 55(1) requires writing, the parties' signatures and a witness.",
            examples: [
              "The original signed agreement",
              "The witnesses' signatures and names",
              "Any signed amendments",
            ],
          },
        ],
      },
      {
        id: "setting-aside-separationagreement",
        name: "When the court may set an agreement aside",
        plainExplanation:
          "Under s. 56(4) of the Family Law Act, a court may, on application, set aside a domestic " +
          "contract or a provision in it (a) if a party failed to disclose to the other significant " +
          "assets, or significant debts or other liabilities, existing when the domestic contract was " +
          "made; (b) if a party did not understand the nature or consequences of the domestic " +
          "contract; or (c) otherwise in accordance with the law of contract. Under s. 56(7), s. 56(4) " +
          "applies despite any agreement to the contrary.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "What was disclosed when the agreement was signed",
            why: "Section 56(4)(a) refers to significant assets, debts or liabilities not disclosed.",
            examples: [
              "Financial statements or lists exchanged before signing",
              "Records of assets or debts that existed at the time but were not mentioned",
            ],
          },
          {
            name: "How the agreement was made",
            why: "Section 56(4)(b) refers to understanding the nature or consequences of the contract.",
            examples: [
              "Emails or messages from the time of negotiation",
              "Any certificate of independent legal advice",
              "Records of language, health or other circumstances at the time of signing",
            ],
          },
        ],
      },
      {
        id: "support-terms-separationagreement",
        name: "Support terms and waivers of support",
        plainExplanation:
          "Under s. 33(4) of the Family Law Act, the court may set aside a provision for support or a " +
          "waiver of the right to support in a domestic contract, and may determine and order support " +
          "in an application under s. 33(1), even though the contract has an express provision " +
          "excluding s. 33, (a) if the provision for support or the waiver results in unconscionable " +
          "circumstances; (b) if the provision is in favour of, or the waiver is by or on behalf of, a " +
          "dependant who qualifies for an allowance for support out of public money; or (c) if there " +
          "is default in the payment of support under the contract when the application is made.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The support terms and what has happened since",
            why: "Section 33(4) looks at unconscionable circumstances, public assistance and default.",
            examples: [
              "The support clause or waiver in the agreement",
              "Records of payments made or missed",
              "Records of any social assistance received",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "children-terms-separationagreement",
        name: "Terms about the children can be disregarded",
        plainExplanation:
          "Under s. 56(1) of the Family Law Act, in determining a matter respecting the education, " +
          "moral training or decision-making responsibility or parenting time with respect to a " +
          "child, the court may disregard any provision of a domestic contract about the matter " +
          "where, in its opinion, doing so is in the best interests of the child. Under s. 56(1.1), " +
          "in determining a matter respecting the support of a child, the court may disregard any " +
          "provision of a domestic contract about it where the provision is unreasonable having " +
          "regard to the child support guidelines and any other provision relating to support of the " +
          "child in the contract.",
        whenThisComesUp: "When the agreement includes terms about the children's care or child support.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
      },
      {
        id: "filing-agreement-separationagreement",
        name: "Filing the agreement with the court",
        plainExplanation:
          "Under s. 35(1) of the Family Law Act, a party to a domestic contract may file it with the " +
          "clerk of the Ontario Court of Justice or of the Family Court of the Superior Court of " +
          "Justice, with their affidavit stating that the contract is in effect and has not been set " +
          "aside or varied by a court or agreement. Under s. 35(2), a provision for support or " +
          "maintenance in a contract filed this way may be enforced, may be varied under s. 37, " +
          "except for child support may be increased under s. 38, and for child support may be " +
          "recalculated under s. 39.1, as if it were an order of the court where it is filed. Under " +
          "s. 35(3), s. 33(4) applies to a contract filed this way.",
        whenThisComesUp: "When support under the agreement is not being paid, or needs to change.",
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
          "Which rules apply. Under r. 1(2)(b) of the Family Law Rules, the Rules apply to family law " +
          "cases in the Family Court of the Superior Court of Justice, in the Superior Court of " +
          "Justice and in the Ontario Court of Justice for the interpretation, enforcement or " +
          "variation of a marriage contract, cohabitation agreement, separation agreement, paternity " +
          "agreement, family arbitration agreement or family arbitration award.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
      {
        note:
          "Changing support in a filed agreement. Under r. 15(2)(b) of the Family Law Rules, the " +
          "motion-to-change procedure in r. 15 applies to a motion to change an agreement for support " +
          "filed under s. 35 of the Family Law Act, and under r. 15(5) the party serves and files a " +
          "motion to change (Form 15), with all required attachments.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
    ],
    signals: [
      "separation agreement",
      "set aside my separation agreement",
      "I signed an agreement I didn't understand",
      "my ex hid assets when we signed the agreement",
      "do we need a lawyer to sign a separation agreement",
      "agreement was not witnessed",
      "waived spousal support in our agreement",
      "file our separation agreement with the court",
      "is our separation agreement valid",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Family Law Act, R.S.O. 1990, c. F.3",
        officialUrl: FLA,
        verifiedAt: V,
        pinpoint: "ss. 33(4), 35(1)-(3), 51, 54, 55(1)-(2), 56(1), (1.1), (4), (7)",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "rr. 1(2)(b), 15(2)(b), 15(5)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "family-matter-matrimonial-home-possession",
    name: "Who stays in the family home after separation",
    broughtBy:
      "A married spouse asking the court which of them lives in the matrimonial home after " +
      "separation, or asking to stop the other spouse from selling or mortgaging it. Part II of the " +
      "Family Law Act uses the definition of \"spouse\" for married people.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "matrimonial-home-defined-homepossession",
        name: "What the matrimonial home is, and who it applies to",
        plainExplanation:
          "Under s. 18(1) of the Family Law Act, every property in which a person has an interest and " +
          "that is or, if the spouses have separated, was at the time of separation ordinarily " +
          "occupied by the person and their spouse as their family residence is their matrimonial " +
          "home. Under s. 1(1), \"spouse\" means either of two persons who are married to each other, " +
          "or who have together entered into a marriage that is voidable or void, in good faith on " +
          "the part of the person relying on this to assert a right. Under s. 28(1), Part II applies " +
          "to matrimonial homes situated in Ontario.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The marriage",
            why: "Part II uses the s. 1(1) definition of spouse, which is based on marriage.",
            examples: ["Marriage certificate"],
          },
          {
            name: "The home and its use as the family residence",
            why: "Section 18(1) looks at a person's interest and the home's ordinary use as the family residence.",
            examples: [
              "Deed, title search or lease",
              "Mortgage statements",
              "Mail, ID or school records at that address",
            ],
          },
        ],
      },
      {
        id: "equal-right-possession-homepossession",
        name: "Both spouses have an equal right to possession",
        plainExplanation:
          "Under s. 19(1) of the Family Law Act, both spouses have an equal right to possession of a " +
          "matrimonial home. Under s. 19(2), when only one spouse has an interest in the home, the " +
          "other spouse's right of possession is personal as against the first spouse, and ends when " +
          "they cease to be spouses, unless a separation agreement or court order provides otherwise.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Who owns or rents the home",
            why: "Section 19(2) applies when only one spouse has an interest in the home.",
            examples: ["Deed or title search", "Lease naming the tenants"],
          },
        ],
      },
      {
        id: "exclusive-possession-order-homepossession",
        name: "Orders the court can make about the home",
        plainExplanation:
          "Under s. 24(1) of the Family Law Act, regardless of the ownership of a matrimonial home and " +
          "its contents, and despite s. 19, the court may on application make orders including: (a) " +
          "providing for the delivering up, safekeeping and preservation of the home and its " +
          "contents; (b) directing that one spouse be given exclusive possession of the home or part " +
          "of it for the period the court directs; (c) directing a spouse given exclusive possession " +
          "to make periodic payments to the other spouse; (d) directing that the contents remain in " +
          "the home for the use of the spouse given possession, or be removed for the use of a spouse " +
          "or child; and (e) ordering a spouse to pay for all or part of the repair and maintenance of " +
          "the home and other liabilities arising in respect of it. Under s. 24(2), the court may, on " +
          "motion, make a temporary or interim order under s. 24(1)(a) to (e).",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The home's costs",
            why: "Section 24(1)(c) and (e) refer to payments and to repair, maintenance and other liabilities.",
            examples: ["Mortgage or rent statements", "Property tax, insurance and utility bills"],
          },
          {
            name: "The contents",
            why: "Section 24(1)(a) and (d) deal with the home's contents.",
            examples: ["A list of furniture and household items", "Photos of the contents"],
          },
        ],
      },
      {
        id: "exclusive-possession-criteria-homepossession",
        name: "What the court considers for exclusive possession",
        plainExplanation:
          "Under s. 24(3) of the Family Law Act, in determining whether to make an order for exclusive " +
          "possession, the court shall consider: (a) the best interests of the children affected; (b) " +
          "any existing orders under Part I and any existing support orders or other enforceable " +
          "support obligations; (c) the financial position of both spouses; (d) any written agreement " +
          "between the parties; (e) the availability of other suitable and affordable accommodation; " +
          "and (f) any violence committed by a spouse against the other spouse or the children. Under " +
          "s. 24(4), in determining the best interests of a child, the court shall consider the " +
          "possible disruptive effects on the child of a move to other accommodation, and the child's " +
          "views and preferences, if they can reasonably be ascertained.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Information on each listed factor",
            why: "Section 24(3) lists what the court shall consider.",
            examples: [
              "Financial statement (Form 13.1)",
              "Any separation agreement or other written agreement",
              "Rental listings or other information about available accommodation",
            ],
          },
          {
            name: "The children's situation",
            why: "Section 24(3)(a) and (4) refer to the children's best interests and the effects of a move.",
            examples: [
              "The children's school and child care locations",
              "Records of the children's routines and activities",
            ],
          },
          {
            name: "Any violence",
            why: "Section 24(3)(f) refers to violence by a spouse against the other spouse or the children.",
            examples: [
              "Police reports or occurrence numbers",
              "Any peace bond, restraining order or bail conditions",
              "Medical records",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "no-sale-without-consent-homepossession",
        name: "Selling or mortgaging the home without the other spouse",
        plainExplanation:
          "Under s. 21(1) of the Family Law Act, no spouse shall dispose of or encumber an interest in " +
          "a matrimonial home unless (a) the other spouse joins in the instrument or consents to the " +
          "transaction; (b) the other spouse has released all rights under Part II by a separation " +
          "agreement; (c) a court order has authorized the transaction or released the property from " +
          "Part II; or (d) the property is not designated by both spouses as a matrimonial home and a " +
          "designation of another property made by both spouses is registered and not cancelled. " +
          "Under s. 21(2), a transaction in contravention of s. 21(1) may be set aside on an " +
          "application under s. 23, unless the person holding the interest or encumbrance at the time " +
          "of the application acquired it for value, in good faith and without notice that the " +
          "property was a matrimonial home. Under s. 23(b), the court may authorize a disposition or " +
          "encumbrance if the spouse whose consent is required cannot be found or is not available, " +
          "is not capable of giving or withholding consent, or is unreasonably withholding consent.",
        whenThisComesUp: "When one spouse wants to sell, refinance or mortgage the home, or already has.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
      },
      {
        id: "breach-and-variation-homepossession",
        name: "Breaking or changing an exclusive possession order",
        plainExplanation:
          "Under s. 24(5) of the Family Law Act, a person who contravenes an order for exclusive " +
          "possession is guilty of an offence and on conviction is liable, for a first offence, to a " +
          "fine of not more than $5,000 or imprisonment for not more than three months, or both, and " +
          "for a second or subsequent offence, to a fine of not more than $10,000 or imprisonment for " +
          "not more than two years, or both. Under s. 24(6), a police officer may arrest without " +
          "warrant a person the officer believes on reasonable and probable grounds to have " +
          "contravened an order for exclusive possession. Under s. 25(1), on the application of a " +
          "person named in an order under s. 24(1)(a) to (e), or their personal representative, if " +
          "the court is satisfied that there has been a material change in circumstances, it may " +
          "discharge, vary or suspend the order.",
        whenThisComesUp: "When there is already an exclusive possession order.",
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
          "Which court. Under s. 17 of the Family Law Act, for Part II (Matrimonial Home), \"court\" " +
          "means a court as defined in s. 1(1) but does not include the Ontario Court of Justice. " +
          "Section 1(1) lists the Ontario Court of Justice, the Family Court of the Superior Court of " +
          "Justice and the Superior Court of Justice.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
      },
      {
        note:
          "Financial statement. Under r. 13(1) of the Family Law Rules, if an application, answer or " +
          "motion contains a claim for exclusive possession of the matrimonial home and its contents, " +
          "the party making the claim serves and files a financial statement with the document that " +
          "contains the claim, and the party against whom the claim is made serves and files one " +
          "within the time for responding. Under r. 13(1.2), the financial statement is in Form 13.1.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
    ],
    signals: [
      "who gets to stay in the house after we separate",
      "exclusive possession of the matrimonial home",
      "can my husband make me leave the house",
      "can my wife kick me out of our home",
      "my spouse changed the locks",
      "my spouse is trying to sell the house",
      "the house is only in his name",
      "the house is only in her name",
      "who pays the mortgage after separation",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Family Law Act, R.S.O. 1990, c. F.3",
        officialUrl: FLA,
        verifiedAt: V,
        pinpoint: "ss. 1(1), 17, 18(1), 19, 21(1)-(2), 23(b), 24(1)-(6), 25(1), 28(1)",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "r. 13(1), (1.2)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "family-matter-common-law-property",
    name: "Property when a common-law relationship ends",
    broughtBy:
      "A person who lived with a partner without being married and, after the relationship ended, " +
      "is asking for a share of property or a payment for what they contributed. Not a claim between " +
      "married spouses (that is equalization).",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "no-equalization-unmarried-commonlawproperty",
        name: "The Family Law Act's property division is for married spouses",
        plainExplanation:
          "Under s. 1(1) of the Family Law Act, \"spouse\" means either of two persons who are married " +
          "to each other, or who have together entered into a marriage that is voidable or void, in " +
          "good faith on the part of the person relying on this to assert a right. Section 29 gives a " +
          "wider definition, which also includes two persons who are not married and have cohabited " +
          "continuously for not less than three years, or in a relationship of some permanence if " +
          "they are the parents of a child, but s. 29 says it applies \"In this Part\", meaning Part " +
          "III (support). Part I (Family Property) uses the s. 1(1) definition.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The relationship's dates",
            why: "Whether the s. 1(1) or s. 29 definition fits depends on marriage and on how long and how the couple lived together.",
            examples: [
              "Records showing when you moved in together and when you separated",
              "A child's birth certificate, if you have a child together",
            ],
          },
        ],
      },
      {
        id: "unjust-enrichment-elements-commonlawproperty",
        name: "Unjust enrichment: a benefit, a matching loss, and no reason in law for it",
        plainExplanation:
          "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said the law of unjust " +
          "enrichment has been the primary vehicle to address claims of inequitable distribution of " +
          "assets on the breakdown of a domestic relationship (para. 30). The first two steps are " +
          "whether the defendant has been enriched by the plaintiff and whether the plaintiff has " +
          "suffered a corresponding deprivation (para. 36). For enrichment, the plaintiff must show " +
          "that he or she gave something to the defendant which the defendant received and retained; " +
          "the benefit must be tangible, and it may be positive or negative, the latter in the sense " +
          "that it spares the defendant an expense he or she would have had to undertake (para. 38). " +
          "The plaintiff must also establish that the enrichment corresponds to a deprivation which " +
          "the plaintiff has suffered (para. 39). The third element is that the benefit and " +
          "corresponding detriment occurred without a juristic reason, meaning there is no reason in " +
          "law or justice for the defendant's retention of the benefit (para. 40). Juristic reasons " +
          "to deny recovery may be the intention to make a gift, a contract, or a disposition of law " +
          "(para. 41). The Court said domestic services constitute an enrichment because they are of " +
          "great value to the family and to the other spouse, and the unpaid provision of services " +
          "(including domestic services) or labour may also constitute a deprivation (para. 42).",
        sourceUrl: KERR,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "What you contributed",
            why: "Kerr, paras. 38 and 42: the plaintiff shows what they gave, including labour or domestic services.",
            examples: [
              "Bank records of money you paid toward the property, mortgage or household",
              "Receipts for renovations or work you did on the property",
              "Records of unpaid work in the other person's business",
              "Records of child care or household work you did",
            ],
          },
          {
            name: "What the other person kept",
            why: "Kerr, para. 38: the defendant received and retained the benefit.",
            examples: [
              "Title records showing who owns the property",
              "Account statements showing whose name assets are in",
            ],
          },
          {
            name: "Anything about gifts or agreements",
            why: "Kerr, para. 41: a gift, a contract or a disposition of law can be a juristic reason.",
            examples: [
              "Any cohabitation agreement",
              "Messages about whether money was a gift or a loan",
            ],
          },
        ],
      },
      {
        id: "remedies-commonlawproperty",
        name: "A money award, a share of property, or a share of wealth from a joint family venture",
        plainExplanation:
          "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said the first remedy to " +
          "consider is always a monetary award (para. 47). Where the plaintiff can demonstrate a link " +
          "or causal connection between his or her contributions and the acquisition, preservation, " +
          "maintenance or improvement of the disputed property, a share of the property proportionate " +
          "to the unjust enrichment can be impressed with a constructive trust (para. 50); a minor or " +
          "indirect contribution will not suffice (para. 51), and the plaintiff must also establish " +
          "that a monetary award would be insufficient (para. 52). The Court also said that when the " +
          "parties have been engaged in a joint family venture, and the claimant's contributions to " +
          "it are linked to the generation of wealth, a monetary award for unjust enrichment should " +
          "be calculated according to the share of the accumulated wealth proportionate to the " +
          "claimant's contributions (para. 87). It listed four headings for looking at the evidence: " +
          "mutual effort, economic integration, actual intent and priority of the family, and said " +
          "these are not a checklist (para. 89).",
        sourceUrl: KERR,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "The link between your contributions and the property",
            why: "Kerr, paras. 50-51: a constructive trust needs a link or causal connection to the property.",
            examples: [
              "Records of payments toward the purchase price or mortgage",
              "Records of work that improved or maintained the property",
            ],
          },
          {
            name: "How you lived your lives together",
            why: "Kerr, para. 89: mutual effort, economic integration, actual intent and priority of the family.",
            examples: [
              "Joint bank accounts or shared bills",
              "Decisions to have and raise children together",
              "Records of one partner leaving work or moving for the family",
              "How long the relationship lasted",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "no-presumption-commonlawproperty",
        name: "No presumption of equal sharing, or of a joint family venture",
        plainExplanation:
          "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said that, unlike much " +
          "matrimonial property legislation, the law of unjust enrichment does not mandate a " +
          "presumption of equal sharing (para. 62), and that there can be no presumption of a joint " +
          "family venture; the emphasis should be on how the parties actually lived their lives, not " +
          "on their after-the-fact assertions (para. 88). It also said that many domestic claims arise " +
          "out of relationships in which there has been a mutual conferral of benefits, and that it " +
          "is unjust to pay attention only to the contributions of one party in assessing an " +
          "appropriate remedy (para. 48).",
        whenThisComesUp: "When both partners contributed to the household or to property during the relationship.",
        sourceUrl: KERR,
        verifiedAt: V,
      },
      {
        id: "cohabitation-agreement-commonlawproperty",
        name: "A cohabitation agreement about property",
        plainExplanation:
          "Under s. 53(1) of the Family Law Act, two persons who are cohabiting or intend to cohabit " +
          "and who are not married to each other may enter into an agreement on their respective " +
          "rights and obligations during cohabitation, or on ceasing to cohabit or on death, " +
          "including ownership in or division of property and support obligations. Under s. 55(1), a " +
          "domestic contract is unenforceable unless made in writing, signed by the parties and " +
          "witnessed, and under s. 56(4) a court may, on application, set aside a domestic contract " +
          "or a provision in it on the grounds listed there.",
        whenThisComesUp: "When the partners signed an agreement about property during the relationship.",
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
          "Which rules apply. Under r. 1(2)(c) of the Family Law Rules, the Rules apply to family law " +
          "cases in the Family Court of the Superior Court of Justice, in the Superior Court of " +
          "Justice and in the Ontario Court of Justice for a constructive or resulting trust or a " +
          "monetary award as compensation for unjust enrichment between persons who have cohabited.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
      {
        note:
          "Land you own together. Under s. 3(1) of the Partition Act, any person interested in land " +
          "in Ontario may bring an action or make an application for the partition of the land, or " +
          "for its sale under the directions of the court if a sale is considered by the court to be " +
          "more advantageous to the parties interested. Under s. 2, joint tenants and tenants in " +
          "common, among others, may be compelled to make or suffer partition or sale. Under s. 1, " +
          "\"court\" in that Act means the Superior Court of Justice.",
        sourceUrl: PARTITION,
        verifiedAt: V,
        consolidationPeriod: PARTITION_CONSOLIDATION,
      },
      {
        note:
          "Time limits. Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a " +
          "proceeding shall not be commenced in respect of a claim after the second anniversary of " +
          "the day on which the claim was discovered. Section 5(1) says when a claim is discovered, " +
          "and s. 5(2) presumes a person knew of the matters in s. 5(1)(a) on the day the act or " +
          "omission on which the claim is based took place, unless the contrary is proved. Under s. " +
          "16(1)(c), there is no limitation period for a proceeding to obtain support under the " +
          "Family Law Act.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "we were common law and the house is in his name",
      "we were common law and the house is in her name",
      "common law partner property split",
      "not married but lived together for years",
      "I paid toward the mortgage but I'm not on title",
      "unjust enrichment common law",
      "joint family venture",
      "do common law partners split property in Ontario",
      "we own the house together and separated",
      "I worked in his business for free",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Kerr v. Baranow, 2011 SCC 10",
        officialUrl: KERR,
        verifiedAt: V,
        pinpoint: "paras. 30, 36, 38-42, 47-48, 50-52, 62, 87-89",
      },
      {
        sourceName: "Family Law Act, R.S.O. 1990, c. F.3",
        officialUrl: FLA,
        verifiedAt: V,
        pinpoint: "ss. 1(1), 29, 53(1), 55(1), 56(4)",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "r. 1(2)(c)",
      },
      {
        sourceName: "Partition Act, R.S.O. 1990, c. P.4",
        officialUrl: PARTITION,
        verifiedAt: V,
        pinpoint: "ss. 1, 2, 3(1)",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: LIMITATIONS,
        verifiedAt: V,
        pinpoint: "ss. 4, 5(1)-(2), 16(1)(c)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "family-matter-grandparent-contact",
    name: "A grandparent or other relative seeking contact with a child",
    broughtBy:
      "A grandparent, aunt, uncle or other person who is not the child's parent and wants a court " +
      "order for time with the child. Not a parent asking for parenting time.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "who-can-apply-grandparentcontact",
        name: "Who can ask for a contact order",
        plainExplanation:
          "Under s. 21(3) of the Children's Law Reform Act, any person other than the parent of a " +
          "child, including a grandparent, may apply to a court for a contact order with respect to " +
          "the child. Under s. 18(1), \"contact\" means the time a child spends in the care of a person " +
          "other than the child's parent, whether or not the child is physically with the person " +
          "during that time. Under s. 21(2), any person other than the parent, including a " +
          "grandparent, may also apply for a parenting order respecting decision-making " +
          "responsibility.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Your relationship to the child",
            why: "Section 21(3) is for a person other than the child's parent.",
            examples: [
              "Birth certificates showing the family connection",
              "Photos and records of time spent together",
            ],
          },
          {
            name: "Your history of time with the child",
            why: "Contact is time the child spends in the care of a person other than a parent.",
            examples: [
              "A calendar or log of visits and overnights",
              "Messages arranging visits",
              "Records of when contact stopped",
            ],
          },
        ],
      },
      {
        id: "affidavit-and-plan-grandparentcontact",
        name: "The affidavit and plan that go with the application",
        plainExplanation:
          "Under s. 21(4) of the Children's Law Reform Act, an application under s. 21(3) for a " +
          "contact order shall be accompanied by an affidavit, in the form specified by the rules of " +
          "court, of the person applying, containing (a) the person's proposed plan for the child's " +
          "care and upbringing; (b) information about the person's current or previous involvement in " +
          "any family proceedings, including proceedings under Part V of the Child, Youth and Family " +
          "Services Act, 2017, or in any criminal proceedings; and (c) any other information known to " +
          "the person that is relevant to the best-interests factors in s. 24. Under r. 35.1(1) of the " +
          "Family Law Rules, the party making a claim about contact serves and files an affidavit in " +
          "Form 35.1 with the document that contains the claim.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: FLR, pinpoint: "Family Law Rules, r. 35.1(1)" }],
        evidenceCategories: [
          {
            name: "Your proposed plan",
            why: "Section 21(4)(a) asks for a proposed plan for the child's care and upbringing.",
            examples: [
              "The schedule of contact you are asking for",
              "Where contact would take place and how the child would get there",
            ],
          },
          {
            name: "Any past court involvement",
            why: "Section 21(4)(b) asks about family, child protection and criminal proceedings.",
            examples: ["Court file numbers and orders from any earlier proceedings"],
          },
        ],
      },
      {
        id: "best-interests-grandparentcontact",
        name: "The child's best interests",
        plainExplanation:
          "Under s. 24(1) of the Children's Law Reform Act, in making a parenting order or contact " +
          "order, the court shall only take into account the best interests of the child in " +
          "accordance with s. 24. Under s. 24(2), the court shall consider all factors related to the " +
          "circumstances of the child and shall give primary consideration to the child's physical, " +
          "emotional and psychological safety, security and well-being. The factors in s. 24(3) " +
          "include the child's needs given their age and stage of development, such as the need for " +
          "stability; the nature and strength of the child's relationship with each parent, each " +
          "sibling and grandparents and any other person who plays an important role in the child's " +
          "life; the history of care of the child; the child's views and preferences, giving due " +
          "weight to the child's age and maturity, unless they cannot be ascertained; any plans for " +
          "the child's care; and any family violence and its impact.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Your role in the child's life",
            why: "Section 24(3)(b) refers to the child's relationship with grandparents and other important people.",
            examples: [
              "Records of caregiving, school pick-ups or regular visits",
              "Letters from teachers, coaches or others who know the relationship",
            ],
          },
          {
            name: "The child's needs and routine",
            why: "Section 24(3)(a) and (g) refer to the child's needs and plans for the child's care.",
            examples: ["The child's school and activity schedule", "Any health or special needs"],
          },
        ],
      },
      {
        id: "what-order-can-say-grandparentcontact",
        name: "What a contact order can say",
        plainExplanation:
          "Under s. 28(1) of the Children's Law Reform Act, on an application under s. 21(3), the " +
          "court may by order grant contact with respect to a child to one or more persons other than " +
          "a parent of the child, may determine any aspect of the incidents of the right to contact, " +
          "and may make any additional order it considers necessary and proper in the circumstances, " +
          "including an order limiting the duration, frequency, manner or location of contact or " +
          "communication between any of the parties, or between a party and the child.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The terms you are asking for",
            why: "Section 28(1) lets the court set the incidents of contact and add terms.",
            examples: [
              "Days, times and places of contact",
              "Phone or video calls",
              "Holidays and special occasions",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "divorce-act-leave-grandparentcontact",
        name: "If the parents are divorcing: leave of the court",
        plainExplanation:
          "Under s. 16.5(1) of the Divorce Act, a court may, on application by a person other than a " +
          "spouse, make an order providing for contact between that person and a child of the " +
          "marriage. Under s. 16.5(3), a person may make that application only with leave of the " +
          "court, unless they obtained leave to make an application under s. 16.1. Under s. 16.5(4), " +
          "in determining whether to make a contact order, the court shall consider all relevant " +
          "factors, including whether contact between the applicant and the child could otherwise " +
          "occur, for example during the parenting time of another person.",
        whenThisComesUp: "When the child's parents are in a divorce proceeding.",
        sourceUrl: DIVORCE,
        verifiedAt: V,
      },
      {
        id: "decision-making-non-parent-grandparentcontact",
        name: "A non-parent asking for decision-making responsibility",
        plainExplanation:
          "Under s. 21.1(1) of the Children's Law Reform Act, every person who applies for a parenting " +
          "order respecting decision-making responsibility and who is not a parent of the child shall " +
          "file the results of a recent police records check in accordance with the rules of court. " +
          "Under s. 21.2(2), that person shall also submit a request, in the form provided by the " +
          "Ministry of the Attorney General, to every children's aid society or other prescribed body " +
          "or person, for a report on whether a society has records relating to the applicant. Under " +
          "r. 35.1(3) of the Family Law Rules, the person attaches to Form 35.1 a police records check " +
          "obtained not more than 60 days before starting the claim, or proof of the request if it " +
          "has not yet been received.",
        whenThisComesUp:
          "When a grandparent or other relative asks for decision-making responsibility, not only contact.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: FLR, pinpoint: "Family Law Rules, r. 35.1(3)" }],
      },
      {
        id: "changing-contact-order-grandparentcontact",
        name: "Changing a contact order later",
        plainExplanation:
          "Under s. 29(1) of the Children's Law Reform Act, a court shall not make an order that " +
          "varies a parenting order or contact order unless there has been a material change in " +
          "circumstances that affects or is likely to affect the best interests of the child who is " +
          "the subject of the order.",
        whenThisComesUp: "When there is already a contact order and someone wants it changed.",
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
          "Which court, and when an Ontario court can decide. Under s. 18(1) of the Children's Law " +
          "Reform Act, \"court\" means the Ontario Court of Justice, the Family Court or the Superior " +
          "Court of Justice. Under s. 22(1), a court shall only exercise its jurisdiction to make a " +
          "parenting order or contact order if (a) the child is habitually resident in Ontario at the " +
          "commencement of the application, or (b) the child is not habitually resident in Ontario " +
          "but the court is satisfied of the matters listed in s. 22(1)(b), including that the child " +
          "is physically present in Ontario when the application starts and that substantial evidence " +
          "concerning the child's best interests is available in Ontario.",
        sourceUrl: CLRA,
        verifiedAt: V,
        consolidationPeriod: CLRA_CONSOLIDATION,
      },
      {
        note:
          "Starting the case. Under r. 8(1) of the Family Law Rules, to start a case a person shall " +
          "file an application (Form 8, 8A, 8B, 8B.1, 8B.2, 8C, 8D, 8D.1, 33D.1, 34L or 34N); r. 8 " +
          "itself does not say which form fits which case. Under r. 8(3.1), an application containing " +
          "a claim respecting decision-making responsibility, parenting time or contact shall be " +
          "accompanied by the applicable documents referred to in r. 35.1. Under r. 8(5), the " +
          "application shall be served immediately on every other party, by special service unless " +
          "the party is listed in r. 8(6).",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
    ],
    signals: [
      "grandparent access rights Ontario",
      "my son's ex won't let me see my grandchildren",
      "my daughter won't let me see my grandkids",
      "contact order for grandparents",
      "aunt wants to see her niece",
      "grandparents rights to visit",
      "the parents cut off contact with the grandparents",
      "apply for contact with my grandchild",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Children's Law Reform Act, R.S.O. 1990, c. C.12",
        officialUrl: CLRA,
        verifiedAt: V,
        pinpoint: "ss. 18(1), 21(2)-(4), 21.1(1), 21.2(2), 22(1), 24(1)-(3), 28(1), 29(1)",
      },
      {
        sourceName: "Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.)",
        officialUrl: DIVORCE,
        verifiedAt: V,
        pinpoint: "s. 16.5(1), (3), (4)",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "rr. 8(1), (3.1), (5), 35.1(1), (3)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "family-matter-urgent-motion-before-conference",
    name: "Something urgent before the case conference",
    broughtBy:
      "A party to a family case (or a person with an interest in it) who needs a temporary order " +
      "before the first case conference has happened, because the situation cannot wait.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "temporary-order-motion-urgentmotion",
        name: "A motion for a temporary order",
        plainExplanation:
          "Under r. 14(1) of the Family Law Rules, a person who wants a temporary order for a claim " +
          "made in an application, directions on how to carry on the case, or a change in a temporary " +
          "order may make a motion. Under r. 14(2), a motion may be made by a party to the case or by " +
          "a person with an interest in the case.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The claim in your application",
            why: "Rule 14(1) is about a temporary order for a claim made in an application.",
            examples: ["Your application or answer", "The court file number"],
          },
        ],
      },
      {
        id: "urgency-hardship-urgentmotion",
        name: "Urgency or hardship before the case conference",
        plainExplanation:
          "Under r. 14(4) of the Family Law Rules, no notice of motion or supporting evidence may be " +
          "served, and no motion may be heard, before a conference dealing with the substantive " +
          "issues in the case has been completed. Under r. 14(4.2), r. 14(4) does not apply if the " +
          "court is of the opinion that there is a situation of urgency or hardship, or that a case " +
          "conference is not required for some other reason in the interest of justice.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "What makes it urgent",
            why: "Rule 14(4.2) turns on a situation of urgency or hardship.",
            examples: [
              "Dates: what has happened and what is about to happen",
              "Messages or notices showing the threatened step (a move, a sale, a cut-off of money)",
              "Police reports or occurrence numbers, if safety is involved",
            ],
          },
          {
            name: "Why it cannot wait for the conference",
            why: "Rule 14(4) otherwise requires the case conference to happen first.",
            examples: [
              "The scheduled case conference date, if any",
              "Records of the harm that would happen before then",
            ],
          },
        ],
      },
      {
        id: "without-notice-urgentmotion",
        name: "Asking without notice to the other side",
        plainExplanation:
          "Under r. 14(12) of the Family Law Rules, a motion may be made without notice if (a) the " +
          "nature or circumstances of the motion make notice unnecessary or not reasonably possible; " +
          "(b) there is an immediate danger of a child's removal from Ontario, and the delay involved " +
          "in serving a notice of motion would probably have serious consequences; (c) there is an " +
          "immediate danger to the health or safety of a child or of the party making the motion, and " +
          "the delay involved in serving a notice of motion would probably have serious consequences; " +
          "or (d) service of a notice of motion would probably have serious consequences. Under r. " +
          "14(13), the documents are filed on or before the motion date, unless the court orders " +
          "otherwise. Under r. 14(14), an order made on a motion without notice (Form 14D) shall " +
          "require the matter to come back to the court, and if possible to the same judge, within 14 " +
          "days or on a date chosen by the court. Under r. 14(15), it shall be served immediately on " +
          "all parties affected, with all documents used on the motion, unless the court orders " +
          "otherwise.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Why notice would cause harm or is not possible",
            why: "Rule 14(12) lists when a motion may be made without notice.",
            examples: [
              "Records of a planned removal of the child (tickets, messages, a listing of the home)",
              "Records of a danger to health or safety",
            ],
          },
        ],
      },
      {
        id: "evidence-on-motion-urgentmotion",
        name: "The documents and evidence for the motion",
        plainExplanation:
          "Under r. 14(9) of the Family Law Rules, a motion, whether made with or without notice, " +
          "requires a notice of motion (Form 14) and an affidavit (Form 14A), and may be supported by " +
          "additional evidence. Under r. 14(17), evidence on a motion may be given by an affidavit or " +
          "other admissible evidence in writing, a transcript of questioning under r. 20, or, with the " +
          "court's permission, oral evidence. Under r. 14(18), an affidavit for a motion shall, as " +
          "much as possible, contain only information within the personal knowledge of the person " +
          "signing it. Under r. 14(19), it may also contain information the person learned from " +
          "someone else, but only if the source is identified by name and the affidavit states that " +
          "the person believes it is true.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Your affidavit",
            why: "Rule 14(9) requires an affidavit (Form 14A), and r. 14(18) asks for personal knowledge.",
            examples: [
              "A dated list of the events you saw or heard yourself",
              "For anything you were told, who told you",
            ],
          },
          {
            name: "Documents attached to the affidavit",
            why: "Rule 14(17) allows affidavit and other written evidence.",
            examples: ["Messages, emails and letters", "Police or medical records", "Existing orders"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "motions-not-covered-urgentmotion",
        name: "Motions the case-conference rule does not cover",
        plainExplanation:
          "Under r. 14(6) of the Family Law Rules, r. 14(4) does not apply to certain motions, " +
          "including a motion to change a temporary order under r. 25(19) (fraud, mistake, lack of " +
          "notice); a motion for a contempt order under r. 31; a motion for summary judgment under r. " +
          "16; a motion to require the Director of the Family Responsibility Office to refrain from " +
          "suspending a licence; a motion to limit or stay a support order, the enforcement of arrears " +
          "under a support order, or an alternative payment order; a motion in a child protection " +
          "case; and a motion made without notice, made on consent, that is unopposed or that is " +
          "limited to procedural, uncomplicated or unopposed matters (Form 14B).",
        whenThisComesUp: "When the motion is one of the kinds r. 14(6) lists.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
      {
        id: "responding-evidence-urgentmotion",
        name: "Responding to the motion, and the order of evidence",
        plainExplanation:
          "Under r. 14(11.3) of the Family Law Rules, a response to a motion made using a notice of " +
          "motion (Form 14) shall be served and filed not later than four days before the motion " +
          "date. Under r. 14(20), unless the court orders otherwise, the party making the motion " +
          "serves all the evidence in support with the notice of motion, the responding party then " +
          "serves all the evidence in response, the party making the motion may then serve evidence " +
          "replying to any new matters raised, and no other evidence may be used.",
        whenThisComesUp: "When you are the person served with an urgent motion.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Serving and confirming a motion with notice. Under r. 14(11) of the Family Law Rules, a " +
          "party making a motion with notice shall serve the documents on all other parties not later " +
          "than six days before the motion date; file them as soon as possible after service, but not " +
          "later than four days before the motion date; confer or make best efforts to confer with " +
          "every other party about the issues in dispute in the motion, unless prohibited by a court " +
          "order or there is a risk of domestic violence by a party who is not represented by a " +
          "licensed representative; and, not later than 2 p.m. three days before the motion date, give " +
          "the clerk the confirmation of motion (Form 14C). Under r. 14(11.1), unless the court orders " +
          "otherwise, a motion shall not be heard if confirmation is not given to the clerk in this way.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
      {
        note:
          "Updated financial information for a motion. Under r. 13(12)(b) of the Family Law Rules, " +
          "before a motion, a party updates their financial information if the information in their " +
          "last financial statement would be more than 30 days old by the time the motion is heard. " +
          "Under r. 13(12.2), for a motion this is done six days before the motion for the party " +
          "making it, and four days before for the other party.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
    ],
    signals: [
      "urgent motion family court",
      "emergency motion before case conference",
      "my ex is taking the kids out of the country",
      "need an order right away",
      "motion without notice",
      "ex parte motion family",
      "can't wait for the case conference",
      "temporary order before the first court date",
      "the other parent won't return the children",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "rr. 13(12)(b), (12.2), 14(1), (2), (4), (4.2), (6), (9), (11), (11.1), (11.3), (12)-(15), (17)-(20)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "family-matter-financial-disclosure",
    name: "Getting the other side's financial information",
    broughtBy:
      "A party to a family case about support or property who needs the other party's financial " +
      "statement, tax returns or other records, or who has been asked for their own.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "financial-statement-duty-disclosure",
        name: "The duty to serve and file a financial statement",
        plainExplanation:
          "Under r. 13(1) of the Family Law Rules, if an application, answer or motion contains a " +
          "claim for support, a property claim, or a claim for exclusive possession of the " +
          "matrimonial home and its contents, the party making the claim shall serve and file a " +
          "financial statement (Form 13 or 13.1) with the document that contains the claim, and the " +
          "party against whom the claim is made shall serve and file one within the time for serving " +
          "and filing an answer, reply, affidavit or other responding document, whether they serve " +
          "one or not. Under r. 13(1.1), a support claim without a property claim or exclusive " +
          "possession claim uses Form 13; under r. 13(1.2), a property claim or exclusive possession " +
          "claim uses Form 13.1. Under r. 13(1.3), if the only support claim is for child support in " +
          "the table amount of the applicable child support guidelines, the party making the claim is " +
          "not required to file a financial statement, unless there is also a property claim or an " +
          "exclusive possession claim.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "What the case claims",
            why: "Rule 13(1) applies when there is a support, property or exclusive possession claim.",
            examples: ["The application and answer", "Any motion that adds a support or property claim"],
          },
          {
            name: "Whether a financial statement was served",
            why: "Rule 13(1)(b) sets when the other party's statement is due.",
            examples: [
              "The date the other party was served",
              "Any financial statement they served, with its date",
            ],
          },
        ],
      },
      {
        id: "support-claim-documents-disclosure",
        name: "Income documents for a support claim",
        plainExplanation:
          "Under r. 13(3.1) of the Family Law Rules, a party required to serve and file a financial " +
          "statement for a support claim also serves, unless the court orders otherwise, the income " +
          "and financial information referred to in s. 21(1) of the child support guidelines; if they " +
          "became unemployed within the last three years, their Record of Employment or other " +
          "evidence of termination and a statement of any benefits or income still owed by the former " +
          "employer; and, for child support, proof of any special or extraordinary expenses under s. 7 " +
          "of the guidelines. Under r. 13(3.2.1), this information is also given to the other party " +
          "before any case conference, unless already served. Under s. 21(1) of the Ontario Child " +
          "Support Guidelines, the listed documents include every personal income tax return, and " +
          "every notice of assessment and reassessment, for each of the three most recent taxation " +
          "years, and, for an employee, the most recent statement of earnings or an employer's letter. " +
          "Under s. 21(2), a parent or spouse served with a child support application whose income " +
          "information is necessary must provide them within 30 days after service if they reside in " +
          "Canada or the United States, or within 60 days if they reside elsewhere, or another time " +
          "the court specifies.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CSG, pinpoint: "Child Support Guidelines, s. 21(1)-(2)" }],
        evidenceCategories: [
          {
            name: "A list of what has and has not been received",
            why: "Rule 13(3.1) and s. 21(1) of the Guidelines list the documents.",
            examples: [
              "Tax returns and notices of assessment received, by year",
              "Pay stubs or employer letters received",
              "A list of documents still missing",
            ],
          },
          {
            name: "Your own documents",
            why: "The same rules apply to your own support claim or response.",
            examples: [
              "Your tax returns and notices of assessment for three years",
              "Your most recent pay stub",
              "Receipts for any special expenses",
            ],
          },
        ],
      },
      {
        id: "request-and-order-disclosure",
        name: "Asking in writing, then asking the court",
        plainExplanation:
          "Under r. 13(11) of the Family Law Rules, if a party believes that the financial " +
          "disclosure provided by another party does not provide enough information for a full " +
          "understanding of the other party's financial circumstances, (a) the party shall make a " +
          "request in writing to the other party for the necessary additional information, and (b) " +
          "if any requested information is not given within seven days of the request, the court " +
          "may, on motion or at a case conference or settlement conference, order the other party to " +
          "give the information or to serve and file a new financial statement. Under r. 13(11.0.1), " +
          "in seeking that order the party specifies in the motion or conference brief the " +
          "information that was requested but not given. Under r. 13(17), if a party has not served " +
          "or filed a document as required by r. 13 or an Act or regulation, the court may on motion " +
          "order the party to serve or file it and, if it makes that order, it shall also order the " +
          "party to pay costs.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Your written request",
            why: "Rule 13(11)(a) requires the request to be in writing.",
            examples: [
              "A dated letter or email listing each document asked for",
              "Proof it was sent",
            ],
          },
          {
            name: "What came back, and when",
            why: "Rule 13(11)(b) turns on information not given within seven days.",
            examples: ["The reply, if any, with its date", "A list of items still not provided"],
          },
        ],
      },
      {
        id: "property-claim-documents-disclosure",
        name: "Documents for a property claim",
        plainExplanation:
          "Under r. 13(3.3) of the Family Law Rules, a party required to serve and file a financial " +
          "statement for a claim under Part I of the Family Law Act shall, no later than 30 days " +
          "after the financial statement is due, serve the listed information, unless the court " +
          "orders otherwise, including the statement issued closest to the valuation date for each " +
          "bank, pension, savings or investment account, a pension valuation request, and the " +
          "Municipal Property Assessment Corporation assessment of any Ontario real property. Under " +
          "s. 8 of the Family Law Act, in an application under s. 7, each party shall serve and file " +
          "a sworn or declared statement disclosing particulars of their property and debts and other " +
          "liabilities as of the date of the marriage, the valuation date and the date of the " +
          "statement; the deductions and exclusions they claim; and all property they disposed of " +
          "during the two years before the statement, or during the marriage, whichever period is " +
          "shorter.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
        alsoCites: [{ sourceUrl: FLA, pinpoint: "Family Law Act, s. 8" }],
        evidenceCategories: [
          {
            name: "Account and property records near the valuation date",
            why: "Rule 13(3.3) lists statements issued closest to the valuation date.",
            examples: [
              "Bank, RRSP and investment statements",
              "Pension valuation request",
              "Property tax assessment",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "guidelines-consequences-disclosure",
        name: "What can happen when income information is not provided (child support)",
        plainExplanation:
          "Under s. 22(1) of the Ontario Child Support Guidelines, where a parent or spouse fails to " +
          "comply with s. 21, the other spouse, an applicant under s. 33 of the Family Law Act or an " +
          "order assignee may apply to have the child support application set down for a hearing or " +
          "move for judgment, or for an order requiring the documents to be provided. Under s. 22(2), " +
          "the court may award costs up to an amount that fully compensates them for all costs " +
          "incurred. Under s. 23, where the court proceeds to a hearing on that basis, it may draw an " +
          "adverse inference against the parent or spouse who failed to comply and impute income to " +
          "them in such amount as it considers appropriate. Under s. 24, where a parent or spouse " +
          "fails to comply with an order requiring the documents, the court may strike out any of " +
          "their pleadings, make a contempt order, proceed to a hearing and draw an adverse inference " +
          "and impute income, and award costs.",
        whenThisComesUp: "When income documents for a child support claim have not been provided.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
      },
      {
        id: "duty-to-update-disclosure",
        name: "The duty to keep disclosure up to date",
        plainExplanation:
          "Under r. 13(12) of the Family Law Rules, before a case conference, settlement conference, " +
          "motion or trial, a party updates their financial information if the information in their " +
          "last financial statement would be more than 60 days old by a conference, more than 30 " +
          "days old by a motion, or more than 40 days old by trial. Under r. 13(15), as soon as a " +
          "party discovers that a document served under r. 13 is incorrect, incomplete or out of " +
          "date, the party shall serve, and if applicable file, a corrected, updated or new document. " +
          "Under r. 13(16), as soon as a party discovers that they failed to serve a required " +
          "document, they shall serve it.",
        whenThisComesUp: "When time has passed since financial statements were exchanged, or something has changed.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
      {
        id: "documents-and-questioning-disclosure",
        name: "Other documents, and questioning",
        plainExplanation:
          "Under r. 19(1) of the Family Law Rules, subject to r. 19(1.1), every party shall, within " +
          "10 days after another party's request, give the other party an affidavit listing every " +
          "document that is relevant to any issue in the case and in the party's control, or " +
          "available to the party on request; under r. 19(1.1)(b), this does not apply to documents " +
          "required to be served under r. 13. Under r. 19(2), the other party is entitled, on " +
          "request, to examine any listed document unless it is protected by a legal privilege, and " +
          "to receive a copy at their own expense at the legal aid rate. Under r. 20(4), outside a " +
          "child protection case, a party may obtain information from another party about any issue " +
          "with the other party's consent or by an order under r. 20(5). Under r. 20(5), the court " +
          "may, on motion, order questioning or disclosure if it would be unfair to the party who " +
          "wants it to carry on with the case without it, the information is not easily available by " +
          "any other method, and it will not cause unacceptable delay or undue expense. Under r. " +
          "13(13), a party may be questioned under r. 20 on a financial statement only after a " +
          "request for information has been made under r. 13(11)(a).",
        whenThisComesUp: "When the financial statement and r. 13 documents are not enough.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Disclosure after a child support order. Under s. 24.1(1) of the Ontario Child Support " +
          "Guidelines, every person whose income or other financial information is used to determine " +
          "the amount of a child support order shall, no later than 30 days after the anniversary of " +
          "the date the order was made, in every year in which the child is a child within the " +
          "meaning of the Guidelines, give every party a copy of their personal income tax return and " +
          "notice of assessment for the most recent taxation year, unless the parties have agreed " +
          "otherwise. Under s. 24.1(4), if a person fails to do so, a court may, on application by " +
          "the party who did not receive it, make an order finding the person in contempt, an order " +
          "for costs, or an order requiring the person to provide it.",
        sourceUrl: CSG,
        verifiedAt: V,
        consolidationPeriod: CSG_CONSOLIDATION,
      },
      {
        note:
          "Disclosure at the case conference. Under r. 17(3.1) of the Family Law Rules, before a " +
          "conference, each party shall, subject to r. 17(3.2), confer or make best efforts to confer " +
          "orally or in writing with every other party about the parties' requests for financial " +
          "disclosure, among other things. Under r. 17(4)(d), the purposes of a case conference " +
          "include ensuring disclosure of the relevant evidence, including the disclosure of financial " +
          "information required to resolve any support or property issue. Under r. 13(10), the clerk " +
          "shall not accept a document for filing without a financial statement if the rules require " +
          "it to be filed with one.",
        sourceUrl: FLR,
        verifiedAt: V,
        consolidationPeriod: FLR_CONSOLIDATION,
      },
    ],
    signals: [
      "my ex won't give me his tax returns",
      "my ex won't give me her tax returns",
      "financial statement Form 13",
      "the other side is hiding income",
      "request for financial disclosure",
      "they never served a financial statement",
      "need his bank statements for support",
      "how do I get my ex's income information",
      "motion for disclosure family court",
      "Form 13.1 financial statement property",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: FLR,
        verifiedAt: V,
        pinpoint: "rr. 13(1)-(1.3), (3.1), (3.2.1), (3.3), (10), (11), (11.0.1), (12), (13), (15)-(17), 17(3.1), 17(4)(d), 19(1)-(2), 20(4)-(5)",
      },
      {
        sourceName: "Child Support Guidelines, O. Reg. 391/97",
        officialUrl: CSG,
        verifiedAt: V,
        pinpoint: "ss. 21(1)-(2), 22-24, 24.1(1), (4)",
      },
      {
        sourceName: "Family Law Act, R.S.O. 1990, c. F.3",
        officialUrl: FLA,
        verifiedAt: V,
        pinpoint: "s. 8",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
