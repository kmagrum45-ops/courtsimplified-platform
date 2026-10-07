/**
 * The family library: the kinds of family matter a person brings to court in
 * Ontario, from the Family Law Act, the Children's Law Reform Act, the Divorce
 * Act, both sets of Child Support Guidelines, the Family Law Rules and the
 * Family Responsibility and Support Arrears Enforcement Act -- all vendored
 * whole on 2026-09-30 (scripts/rules/familyLawSources.ts).
 *
 * Same shape as the Small Claims catalogue (ClaimType), read the same way:
 *   plaintiffElements       -- what the person applying sets out, and what the
 *                              law says about it;
 *   defendantConsiderations -- what the other party may raise, or what else
 *                              the law says applies;
 *   proceduralNotes         -- the steps and time limits.
 *
 * Every sentence is quoted in docs/sources/catalogue-verification.json and was
 * re-read by an independent reviewer. It states which Act each rule comes from
 * (the Divorce Act path and the Family Law Act path differ), uses the 2021
 * vocabulary (decision-making responsibility, parenting time, contact), states
 * family violence only in the statutes' words, and computes nothing. Text not
 * yet in force (the 2025, c. 6 replacements of FLA s. 46 and CLRA s. 35) is
 * not stated as law. status "reviewed" is the site owner's pre-launch decision
 * -- not a licensee review.
 *
 * `family-matter-restraining-order` must be shown with the family safety
 * resources (familySafetyResources.ts) wherever it appears.
 */

import type { ClaimType } from "./claimTypes";
import { MORE_FAMILY_TYPES } from "./moreClaimTypes";

const CORE_FAMILY_MATTER_TYPES: ClaimType[] = [
  {
    id: "family-matter-child-support",
    name: "Child support (asking for it, or being asked to pay it)",
    broughtBy:
      "Usually a parent asking the court to order the other parent to pay support for their child. " +
      "Under the Family Law Act, the child or certain social assistance agencies can also apply. On " +
      "the divorce path, either or both married spouses apply. Not a claim for support for an adult " +
      "partner (that is spousal support).",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "duty-to-pay-childsupport",
        name: "Who has a legal duty to support the child, and who can apply",
        plainExplanation:
          "This part of the checklist is about who has a legal duty to pay child support, and who can " +
          "ask the court for an order. Under s. 31(1) of the Family Law Act, every parent has an " +
          "obligation to provide support, to the extent the parent is capable of doing so, for their " +
          "unmarried child who is a minor, is enrolled in a full-time program of education, or is " +
          "unable by reason of illness, disability or other cause to withdraw from the charge of their " +
          "parents. Under s. 31(2), that obligation does not extend to a child who is sixteen or older " +
          "and has withdrawn from parental control. Under s. 1(1), \"parent\" includes a person who has " +
          "demonstrated a settled intention to treat a child as a child of their family, except where " +
          "the child is placed \"for valuable consideration in a foster home by a person having lawful " +
          "custody\". Under s. 33(1), a court may, on application, order a person to provide support for " +
          "their dependants and determine the amount. Under s. 33(2), the application may be made by " +
          "the dependant or the dependant's parent. Under s. 33(3), where the dependant is the " +
          "respondent's spouse or child, one of the listed public agencies may also apply if it is " +
          "providing or has provided a listed benefit, assistance or income support for the dependant's " +
          "support, or if an application for one has been made to it by or on behalf of the dependant. " +
          "For married spouses in a divorce, s. 15.1(1) of the Divorce Act says a court may, on " +
          "application by either or both spouses, make an order requiring a spouse to pay for the " +
          "support of any or all children of the marriage.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
        alsoCites: [
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
            pinpoint: "Divorce Act, s. 15.1(1)",
          },
        ],
        evidenceCategories: [
          {
            name: "Who the child is and who the parents are",
            why: "Identifies the child and each parent the application is about.",
            examples: [
              "Birth certificate",
              "Documents naming the parents",
              "Records showing a person treated the child as part of their family",
            ],
          },
          {
            name: "The child's current situation",
            why:
              "Shows the child's age, schooling and living arrangements at the time of the application.",
            examples: [
              "School enrolment letter or transcript",
              "Records showing where the child lives",
              "Medical records, if the child cannot withdraw from the parents' charge because of illness or disability",
            ],
          },
        ],
      },
      {
        id: "which-child-childsupport",
        name: "Which children the support is for (\"child\" and \"child of the marriage\")",
        plainExplanation:
          "This part of the checklist is about which children an order can cover. Under s. 2(1) of the " +
          "Ontario Child Support Guidelines (O. Reg. 391/97), \"child\" means a child who is a dependant " +
          "under the Family Law Act, or, where the Divorce Act applies, a child of the marriage under " +
          "that Act. Under s. 1(1) of the Family Law Act, \"child\" includes a person whom a parent has " +
          "demonstrated a settled intention to treat as a child of their family (with the same " +
          "foster-home exception as for \"parent\"), and under s. 29 a \"dependant\" is a person to whom " +
          "another has an obligation to provide support under Part III. Under s. 2(1) of the Divorce " +
          "Act, a \"child of the marriage\" is a child of two spouses or former spouses who, at the " +
          "material time, (a) is under the age of majority and has not withdrawn from their charge, or " +
          "(b) is the age of majority or over and under their charge but unable, by reason of illness, " +
          "disability or other cause, to withdraw from their charge or to obtain the necessaries of " +
          "life. Under s. 2(2), this includes any child for whom they both stand in the place of " +
          "parents, and any child of whom one is the parent and for whom the other stands in the place " +
          "of a parent. Under s. 2(1) of the Federal Child Support Guidelines, \"child\" means a child of " +
          "the marriage.",
        sourceUrl: "https://www.ontario.ca/laws/docs/970391_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-07-26",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
            pinpoint: "Family Law Act, ss. 1(1), 29",
          },
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
            pinpoint: "Divorce Act, s. 2(1)-(2)",
          },
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/regulations/SOR-97-175/FullText.html",
            pinpoint: "Federal Child Support Guidelines, s. 2(1)",
          },
        ],
        evidenceCategories: [
          {
            name: "Each child's details",
            why: "An order names each child it relates to.",
            examples: [
              "Birth certificate for each child",
              "List of each child's full name and birth date",
            ],
          },
          {
            name: "How each adult relates to the child",
            why: "Shows whether a person is a parent or has stood in the place of a parent.",
            examples: [
              "Records of the child living in the household",
              "School or medical forms naming the adult as a parent or guardian",
              "Messages or documents about the adult's role in the child's life",
            ],
          },
        ],
      },
      {
        id: "guidelines-amount-childsupport",
        name:
          "How the amount is set under the Child Support Guidelines (table amount plus special or " +
          "extraordinary expenses)",
        plainExplanation:
          "Under s. 33(11) of the Family Law Act, a court making an order for the support of a child " +
          "shall do so in accordance with the child support guidelines. On the divorce path, s. 15.1(3) " +
          "of the Divorce Act says the court shall do so in accordance with the \"applicable " +
          "guidelines\". Under s. 2(1) of the Divorce Act, the \"applicable guidelines\" are (a) if both " +
          "spouses or former spouses are habitually resident in the same province at the time an " +
          "application is made for a child support order (or a variation order, or when the amount is " +
          "to be calculated or recalculated under s. 25.01 or 25.1), and that province has been " +
          "designated by an order made under s. 2(5), the laws of the province specified in the order, " +
          "and (b) in any other case, the Federal Child Support Guidelines. Both Acts also say when a " +
          "court may award a different amount. Under s. 33(12) of the Family Law Act, despite s. " +
          "33(11), a court may award an amount that is different from the guidelines amount if the " +
          "court is satisfied (a) that special provisions in an order or a written agreement respecting " +
          "the financial obligations of the parents, or the division or transfer of their property, " +
          "directly or indirectly benefit a child, or that special provisions have otherwise been made " +
          "for the benefit of a child, and (b) that applying the guidelines would result in an amount " +
          "of child support that is inequitable given those special provisions. Under s. 33(14), a " +
          "court may also award a different amount on the consent of both parents if it is satisfied " +
          "that (a) reasonable arrangements have been made for the support of the child, and (b) where " +
          "support for the child is payable out of public money, the arrangements do not provide for " +
          "less than the guidelines amount; under s. 33(15), the court shall have regard to the " +
          "guidelines in deciding whether arrangements are reasonable, and shall not consider them " +
          "unreasonable solely because the amount agreed to is not the same as the guidelines amount. " +
          "Section 15.1(5) of the Divorce Act is to the same effect as s. 33(12) (it also refers to " +
          "special provisions in a judgment), and under s. 15.1(7) and (8) a court may award a " +
          "different amount on the consent of both spouses if it is satisfied that reasonable " +
          "arrangements have been made for the support of the child, with the same rule about having " +
          "regard to the guidelines. Under s. 3(1) of the Ontario Child Support Guidelines, unless the " +
          "guidelines say otherwise, the amount of an order for children under the age of majority is " +
          "(a) the amount set out in the applicable table, according to the number of children under " +
          "the age of majority the order relates to and the income of the parent or spouse against whom " +
          "the order is sought, and (b) the amount, if any, determined under s. 7. Section 3(1) of the " +
          "Federal Child Support Guidelines says the same, using \"spouse\". Under s. 4 of the Ontario " +
          "Guidelines, where the income of the parent or spouse against whom the order is sought is " +
          "over $150,000, the amount is (a) the amount determined under s. 3, or (b) if the court " +
          "considers that amount to be inappropriate, the table amount on the first $150,000 of income, " +
          "the amount the court considers appropriate on the balance (having regard to the condition, " +
          "means, needs and other circumstances of the children and the financial ability of each " +
          "parent or spouse to contribute), and the amount, if any, determined under s. 7. Under s. " +
          "2(1) of the Ontario Guidelines, the \"table\" is the table set out in the Federal Child " +
          "Support Guidelines for Ontario if the parent or spouse against whom the order is sought " +
          "ordinarily resides in Ontario at the time of the application, or for the province or " +
          "territory where they ordinarily reside if that is elsewhere in Canada; the definition has " +
          "further rules for a change of residence and for a person who lives outside Canada or whose " +
          "residence is unknown. Under s. 7(1), on the request of either parent or spouse or of an " +
          "applicant under s. 33 of the Family Law Act, the court may provide for all or part of these " +
          "expenses: child care expenses incurred because of the employment, illness, disability or " +
          "education or training for employment of the parent or spouse who has the majority of " +
          "parenting time; the portion of medical and dental insurance premiums attributable to the " +
          "child; health-related expenses that exceed insurance reimbursement by at least $100 a year; " +
          "extraordinary expenses for primary or secondary school education or other educational " +
          "programs that meet the child's particular needs; expenses for post-secondary education; and " +
          "extraordinary expenses for extracurricular activities. It takes into account the necessity " +
          "of the expense in relation to the child's best interests, and its reasonableness in relation " +
          "to the means of the parents or spouses and of the child and to the family's spending pattern " +
          "for the child during cohabitation. Under s. 7(2), the guiding principle is that the expense " +
          "is shared by the parents or spouses in proportion to their incomes, after deducting any " +
          "contribution from the child.",
        sourceUrl: "https://www.ontario.ca/laws/docs/970391_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-07-26",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
            pinpoint: "Family Law Act, s. 33(11), (12), (14), (15)",
          },
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
            pinpoint: "Divorce Act, ss. 2(1), 15.1(3), (5), (7), (8)",
          },
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/regulations/SOR-97-175/FullText.html",
            pinpoint: "Federal Child Support Guidelines, s. 3(1)",
          },
        ],
        evidenceCategories: [
          {
            name: "Where the paying parent or spouse lives",
            why:
              "The table used depends on where the parent or spouse against whom the order is sought " +
              "ordinarily resides.",
            examples: ["Their current address", "Lease or other record of where they live"],
          },
          {
            name: "Special or extraordinary expenses",
            why: "Section 7 expenses are listed separately from the table amount.",
            examples: [
              "Daycare or before- and after-school care receipts",
              "Receipts for braces, therapy, prescriptions or glasses and what insurance paid",
              "Tuition, program or activity fees",
              "Any subsidy, benefit or tax credit received for the expense",
            ],
          },
        ],
      },
      {
        id: "income-and-disclosure-childsupport",
        name: "Income, and the duty to provide income information",
        plainExplanation:
          "Under s. 2(1) of the Ontario Child Support Guidelines, \"income\" means the annual income " +
          "determined under ss. 15 to 20. Under s. 15(1), subject to s. 15(2), the court determines a " +
          "parent's or spouse's annual income in accordance with ss. 16 to 20; under s. 15(2), where " +
          "both agree in writing on a parent's or spouse's annual income, the court may use that amount " +
          "if it thinks it is reasonable having regard to the income information provided under s. 21. " +
          "Under s. 16, subject to ss. 17 to 20, annual income is determined using the sources of " +
          "income under the heading \"Total income\" in the T1 General form issued by the Canada Revenue " +
          "Agency, adjusted in accordance with Schedule III. Section 17 lets the court look at the last " +
          "three years where s. 16 would not be the fairest determination, and s. 19(1) lets the court " +
          "impute an amount of income it considers appropriate in listed circumstances, including where " +
          "a parent or spouse is intentionally under-employed or unemployed (other than where required " +
          "by the needs of a child or the parent's or spouse's reasonable educational or health needs), " +
          "or has failed to provide income information when under a legal obligation to do so. Under s. " +
          "21(1), a parent or spouse who applies for child support and whose income information is " +
          "necessary to determine the amount must include with the application, among other things, a " +
          "copy of every personal income tax return filed for each of the three most recent taxation " +
          "years, every notice of assessment and reassessment for those years, and, if an employee, the " +
          "most recent statement of earnings (or an employer's letter); s. 21(1)(d) to (h) list further " +
          "documents for self-employed people, partners, people who control a corporation, trust " +
          "beneficiaries and people with other income sources. Under s. 21(2), a parent or spouse who " +
          "is served with the application and whose income information is necessary must provide the " +
          "same documents within 30 days after service if they reside in Canada or the United States, " +
          "or within 60 days if they reside elsewhere, or within another time the court specifies. " +
          "Sections 21(1) and (2) of the Federal Child Support Guidelines set out the same duties for " +
          "spouses on the divorce path.",
        sourceUrl: "https://www.ontario.ca/laws/docs/970391_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-07-26",
        alsoCites: [
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/regulations/SOR-97-175/FullText.html",
            pinpoint: "Federal Child Support Guidelines, s. 21(1)-(2)",
          },
        ],
        evidenceCategories: [
          {
            name: "Tax records",
            why:
              "Section 21(1) lists these as documents an applicant whose income is needed must include.",
            examples: [
              "Personal income tax returns for the three most recent taxation years",
              "Notices of assessment and reassessment for those years",
            ],
          },
          {
            name: "Current earnings",
            why:
              "Section 21(1)(c) and (h) ask for the most recent statement of earnings or income.",
            examples: [
              "Most recent pay stub showing year-to-date earnings",
              "Employer letter stating salary",
              "Statements of employment insurance, pension, disability or social assistance income",
            ],
          },
          {
            name: "Business or corporate records, if they apply",
            why:
              "Section 21(1)(d) to (g) list extra documents for self-employment, partnerships, corporations " +
              "and trusts.",
            examples: [
              "Business financial statements for three years",
              "Partnership income and draw confirmation",
              "Corporate financial statements",
              "Trust settlement agreement and trust financial statements",
            ],
          },
        ],
      },
      {
        id: "split-shared-parenting-time-childsupport",
        name: "Split and shared parenting time",
        plainExplanation:
          "This part of the checklist is about how the Guidelines treat arrangements where the " +
          "children's time is divided between the adults. Under s. 2(1) of the Ontario Child Support " +
          "Guidelines, \"majority of parenting time\" means more than 60 per cent of parenting time over " +
          "the course of a year. Under s. 8 (split parenting time), if there are two or more children " +
          "and each parent or spouse has the majority of parenting time with one or more of them, the " +
          "amount of the order is the difference between the amount each would otherwise pay if an " +
          "order were sought against each of them. Under s. 9 (shared parenting time), where each " +
          "parent or spouse exercises parenting time with a child for not less than 40 per cent of the " +
          "time over the course of a year, the amount must be determined by taking into account (a) the " +
          "table amounts for each of them, (b) the increased costs of shared parenting time " +
          "arrangements, and (c) the condition, means, needs and other circumstances of each parent or " +
          "spouse and of any child for whom support is sought. Sections 2(1), 8 and 9 of the Federal " +
          "Child Support Guidelines set out the same rules for spouses on the divorce path.",
        sourceUrl: "https://www.ontario.ca/laws/docs/970391_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-07-26",
        alsoCites: [
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/regulations/SOR-97-175/FullText.html",
            pinpoint: "Federal Child Support Guidelines, ss. 2(1), 8, 9",
          },
        ],
        evidenceCategories: [
          {
            name: "The actual parenting schedule over a year",
            why:
              "Sections 8 and 9 turn on the share of parenting time each adult has over the course of a " +
              "year.",
            examples: [
              "Existing order, agreement or written schedule",
              "Calendar or log of overnights and days with each adult",
              "Messages arranging exchanges",
            ],
          },
          {
            name: "Costs of the arrangement",
            why:
              "Section 9(b) and (c) refer to the increased costs of shared parenting time and each " +
              "household's circumstances.",
            examples: [
              "Housing, transportation and child-related costs in each home",
              "Financial statements",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "undue-hardship-childsupport",
        name: "Undue hardship",
        plainExplanation:
          "Under s. 10(1) of the Ontario Child Support Guidelines, on the application of either spouse " +
          "or an applicant under s. 33 of the Family Law Act, a court may award an amount of child " +
          "support that is different from the amount determined under any of ss. 3 to 5, 8 or 9 if the " +
          "court finds that the parent or spouse making the request, or a child in respect of whom the " +
          "request is made, would otherwise suffer undue hardship. Under s. 10(2), circumstances that " +
          "may cause undue hardship include: (a) responsibility for an unusually high level of debts " +
          "reasonably incurred to support the parents or spouses and their children during cohabitation " +
          "or to earn a living; (b) unusually high expenses in relation to exercising parenting time " +
          "with a child; (c) a legal duty under a judgment, order or written separation agreement to " +
          "support any person; (d) a spouse's legal duty to support a child, other than a child of the " +
          "marriage, who is under the age of majority, or the age of majority or over but unable, by " +
          "reason of illness, disability or other cause, to obtain the necessaries of life; (e) a " +
          "parent's legal duty to support a child, other than the child who is the subject of the " +
          "application, who is under the age of majority or enrolled in a full time course of " +
          "education; and (f) a legal duty to support any person who is unable to obtain the " +
          "necessaries of life due to an illness or disability. Under s. 10(3), despite a finding of " +
          "undue hardship, the application must be denied if the court is of the opinion that the " +
          "household of the parent or spouse who claims undue hardship would, after the child support " +
          "amount is determined, have a higher standard of living than the other household; under s. " +
          "10(4), the court may use the comparison test in Schedule II. Section 10 of the Federal Child " +
          "Support Guidelines has a parallel rule for spouses on the divorce path.",
        whenThisComesUp:
          "When a parent or spouse asks for an amount of child support different from the Guidelines " +
          "amount because paying, or receiving, that amount would cause hardship.",
        sourceUrl: "https://www.ontario.ca/laws/docs/970391_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-07-26",
        alsoCites: [
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/regulations/SOR-97-175/FullText.html",
            pinpoint: "s. 10(1)",
          },
        ],
      },
      {
        id: "child-age-of-majority-or-over-childsupport",
        name: "A child who is the age of majority or over",
        plainExplanation:
          "Under s. 31(1) of the Family Law Act, a parent's obligation covers an unmarried child who is " +
          "a minor, is enrolled in a full-time program of education, or is unable by reason of illness, " +
          "disability or other cause to withdraw from the charge of their parents; under s. 31(2), it " +
          "does not extend to a child who is sixteen or older and has withdrawn from parental control. " +
          "On the divorce path, a \"child of the marriage\" under s. 2(1) of the Divorce Act includes a " +
          "child who is the age of majority or over and under the spouses' charge but unable, by reason " +
          "of illness, disability or other cause, to withdraw from their charge or to obtain the " +
          "necessaries of life. Section 2(1) of the Divorce Act also defines \"age of majority\", in " +
          "respect of a child, as the age of majority as determined by the laws of the province where " +
          "the child habitually resides, or, if the child habitually resides outside of Canada, " +
          "eighteen years of age. Under s. 3(2) of the Ontario Child Support Guidelines, unless the " +
          "guidelines say otherwise, where a child is the age of majority or over, the amount is (a) " +
          "the amount found by applying the guidelines as if the child were under the age of majority, " +
          "or (b) if the court considers that approach inappropriate, the amount it considers " +
          "appropriate, having regard to the condition, means, needs and other circumstances of the " +
          "child and the financial ability of each parent or spouse to contribute. Section 3(2) of the " +
          "Federal Child Support Guidelines is to the same effect for spouses.",
        whenThisComesUp:
          "When the child the support is for has reached, or is about to reach, the age of majority, " +
          "for example while in school or because of illness or disability.",
        sourceUrl: "https://www.ontario.ca/laws/docs/970391_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-07-26",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
            pinpoint: "s. 31(1)-(2)",
          },
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
            pinpoint: "s. 2(1) (\"age of majority\"); s. 2(1) (\"child of the marriage\")",
          },
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/regulations/SOR-97-175/FullText.html",
            pinpoint: "s. 3(2)",
          },
        ],
      },
      {
        id: "variation-childsupport",
        name: "Changing (varying) an existing child support order",
        plainExplanation:
          "Under s. 37(1) of the Family Law Act, an application to vary an order made or confirmed " +
          "under Part III may be made by a dependant or respondent named in the order, a parent of that " +
          "dependant, the personal representative of that respondent, or an agency referred to in s. " +
          "33(3). Under s. 37(2.1), for an order for the support of a child, if the court is satisfied " +
          "that there has been a change in circumstances within the meaning of the child support " +
          "guidelines, or that evidence not available on the previous hearing has become available, the " +
          "court may discharge, vary or suspend a term of the order, prospectively or retroactively, " +
          "relieve the respondent from paying part or all of the arrears or interest, and make any " +
          "other child support order it could make under s. 33. Under s. 37(3), no application for " +
          "variation shall be made within six months after the order or the disposition of another " +
          "variation application for the same order, except by leave of the court. Under s. 14 of the " +
          "Ontario Child Support Guidelines, where the amount includes a determination made under the " +
          "table, any change in circumstances that would result in a different order or any provision " +
          "of it is a change of circumstances; where it does not, any change in the condition, means, " +
          "needs or other circumstances of either parent or spouse or of any child entitled to support " +
          "is one. On the divorce path, s. 17(1)(a) of the Divorce Act lets a court vary, rescind or " +
          "suspend a support order, retroactively or prospectively, on application by either or both " +
          "former spouses, and under s. 17(4) the court shall first satisfy itself that a change of " +
          "circumstances as provided for in the applicable guidelines has occurred since the order or " +
          "the last variation order; s. 14 of the Federal Child Support Guidelines describes those " +
          "changes.",
        whenThisComesUp:
          "When there is already a child support order and either party wants it changed, suspended or " +
          "ended, or wants relief from arrears.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/970391_e.doc",
            pinpoint: "s. 14, paras. 1-2",
          },
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
            pinpoint: "s. 17(1)(a); s. 17(4)",
          },
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/regulations/SOR-97-175/FullText.html",
            pinpoint: "s. 14",
          },
        ],
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Financial disclosure under r. 13 of the Family Law Rules. Under r. 13(1), if an application, " +
          "answer or motion contains a claim for support, the party making the claim shall serve and " +
          "file a financial statement (Form 13 or 13.1) with the document that contains the claim, and " +
          "the party against whom the claim is made shall serve and file one within the time for " +
          "serving and filing an answer, reply, affidavit or other responding document, whether or not " +
          "they serve one. Under r. 13(1.1), a support claim without a property claim or a claim for " +
          "exclusive possession of the matrimonial home uses Form 13. Under r. 13(1.3), if the only " +
          "support claim is for child support in the table amount of the applicable child support " +
          "guidelines, the party making the claim is not required to file a financial statement, unless " +
          "there is also a property claim or a claim for exclusive possession of the matrimonial home. " +
          "Under r. 13(3.1), a party required to serve and file a financial statement for a support " +
          "claim shall also serve, unless the court orders otherwise, the income and financial " +
          "information in s. 21(1) of the child support guidelines, Record of Employment information if " +
          "they became unemployed within the last three years, and, for child support, proof of the " +
          "amount of any s. 7 special or extraordinary expenses. Under r. 13(3.2)(a), where there is no " +
          "property claim, that information is served with the financial statement, and under r. " +
          "13(3.2.1) it must also be given to the other party before any case conference unless already " +
          "served.",
        sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-18",
      },
      {
        note:
          "Enforcement through the Family Responsibility Office. Under s. 1(1) of the Family " +
          "Responsibility and Support Arrears Enforcement Act, 1996, the \"Director\" is the Director of " +
          "the Family Responsibility Office, and a \"support order\" is a provision in an order made in " +
          "or outside Ontario and enforceable in Ontario for the payment of money as support or " +
          "maintenance. Under s. 5(1), it is the duty of the Director to enforce support orders where " +
          "the support order and the related support deduction order, if any, are filed in the " +
          "Director's office, and to pay the amounts collected to the person they are owed to. Under s. " +
          "10(1), an Ontario court that makes a support order shall also make a support deduction " +
          "order, and under s. 10(4) it must do so even if the court cannot identify an income source " +
          "for the payor at that time. Under s. 12(1), the clerk or registrar of the court that makes a " +
          "support order shall file it with the Director's office promptly after it is signed. Under s. " +
          "22(1), an income source (for example, an employer paying wages, as listed in the s. 1(1) " +
          "definition) that receives notice of a support deduction order shall, subject to s. 23, " +
          "deduct the support owed (or the other amount set out in the notice) from the money it owes " +
          "the payor and pay it to the Director. Under s. 16(1), a filed support order or support " +
          "deduction order may be withdrawn at any time, in the way s. 16(1.1) describes, unless the " +
          "support order says it cannot be withdrawn; under s. 16(3), the Director stops enforcing an " +
          "order once it is withdrawn. Section 10(5) says a support deduction order shall not be made " +
          "in respect of a provisional order. Under s. 16(2), a support order and related support " +
          "deduction order that have been assigned to an agency referred to in s. 14(1) may not be " +
          "withdrawn except by the agency or with the agency's consent, so long as the orders are under " +
          "assignment. Under s. 16(5), a support order cannot be withdrawn unless the related support " +
          "deduction order, if any, is also withdrawn, and a support deduction order cannot be " +
          "withdrawn unless the related support order, if any, is also withdrawn. Under s. 16(4), if " +
          "there are arrears owing to an agency referred to in s. 14(1) from a past assignment, the " +
          "Director may continue to enforce the support order and related support deduction order, if " +
          "any, to collect the arrears owed to the agency, even if the payor and recipient have " +
          "withdrawn the orders.",
        sourceUrl: "https://www.ontario.ca/laws/docs/96f31_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
      },
      {
        note:
          "Starting a case under r. 8 of the Family Law Rules. Under r. 8(1), to start a case a person " +
          "shall file an application (Form 8, 8A, 8B, 8B.1, 8B.2, 8C, 8D, 8D.1, 33D.1, 34L or 34N); r. " +
          "8 itself does not say which of these forms fits which kind of case. Under r. 8(3), an " +
          "application may contain a claim against more than one person and more than one claim against " +
          "the same person, and under r. 8(3.1) an application with a claim about decision-making " +
          "responsibility, parenting time or contact shall be accompanied by the documents referred to " +
          "in r. 35.1. Under r. 8(4), when an application is filed the clerk shall set a court date " +
          "(except as r. 39(7) and r. 41(4) provide) and seal the application. Under r. 8(5), the " +
          "application shall be served immediately on every other party, by special service unless the " +
          "party is listed in r. 8(6). Under r. 8(2), subject to r. 25(19), a party who wants to change " +
          "a final order, an agreement for support filed under s. 35 of the Family Law Act, or a family " +
          "arbitration award filed under s. 59.9 of that Act, may do so only by a motion under r. 15 (if that rule permits it), with the exception in r. 8(2.1) " +
          "for related claims.",
        sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-18",
      },
    ],
    signals: [
      "other parent won't pay child support",
      "how is child support worked out from income",
      "my ex stopped paying for the kids",
      "need support for my child from their father",
      "need support for my child from their mother",
      "we share the kids half the time who pays",
      "each of us has one of the kids",
      "who pays for daycare and braces",
      "my teenager is going to college does support continue",
      "he says he can't afford the table amount",
      "ex won't show me his tax returns",
      "want to change the support order because my income dropped",
      "Family Responsibility Office garnishing my pay",
      "support payments taken off my paycheque",
      "never married but we have a child together",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Family Law Act, R.S.O. 1990, c. F.3",
        officialUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 1(1), 29, 31, 33(1)-(3), 33(11), 37",
      },
      {
        sourceName: "Child Support Guidelines, O. Reg. 391/97",
        officialUrl: "https://www.ontario.ca/laws/docs/970391_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 2(1), 3, 7, 8, 9, 10, 14, 15-17, 19, 21",
      },
      {
        sourceName: "Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.)",
        officialUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 2(1)-(2), 15.1, 17(1), 17(4)",
      },
      {
        sourceName: "Federal Child Support Guidelines, SOR/97-175",
        officialUrl: "https://laws-lois.justice.gc.ca/eng/regulations/SOR-97-175/FullText.html",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 2(1), 3, 8, 9, 10, 14, 21",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "rr. 8, 13",
      },
      {
        sourceName: "Family Responsibility and Support Arrears Enforcement Act, 1996, S.O. 1996, c. 31",
        officialUrl: "https://www.ontario.ca/laws/docs/96f31_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 1(1), 5(1), 10, 12(1), 16, 22(1)",
      },
    ],
    reviewedAt: "2026-09-30",
    status: "reviewed",
  },
  {
    id: "family-matter-divorce",
    name: "Getting a divorce",
    broughtBy:
      "A married spouse, or both spouses together. Under s. 8(1) of the Divorce Act, the " +
      "application is made by either or both spouses. People who were never married to each other " +
      "do not apply for a divorce.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "habitual-residence-one-year-divorce",
        name: "A spouse has been habitually resident in the province for at least one year",
        plainExplanation:
          "Under s. 3(1) of the Divorce Act, a court in a province has jurisdiction to hear and " +
          "determine a divorce proceeding if either spouse has been habitually resident in the province " +
          "for at least one year immediately preceding the commencement of the proceeding. Only one " +
          "spouse needs to meet this. Under s. 2(1), \"court\" for the Province of Ontario means the " +
          "Superior Court of Justice (and includes any other court in the province whose judges are " +
          "appointed by the Governor General and that the Lieutenant Governor in Council of the " +
          "province designates as a court for the purposes of the Act).",
        sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Where each spouse has been living",
            why:
              "Section 3(1) looks at habitual residence in the province for the year before the proceeding " +
              "starts.",
            examples: [
              "Lease, deed or utility bills showing an Ontario address",
              "Ontario driver's licence or health card",
              "Employment or school records in Ontario",
            ],
          },
        ],
      },
      {
        id: "breakdown-of-marriage-ground-divorce",
        name: "The only ground for divorce is breakdown of the marriage",
        plainExplanation:
          "Under s. 8(1) of the Divorce Act, a court of competent jurisdiction may, on application by " +
          "either or both spouses, grant a divorce on the ground that there has been a breakdown of " +
          "their marriage. Under s. 8(2), breakdown of a marriage is established only in the ways " +
          "listed there: (a) the spouses have lived separate and apart for at least one year " +
          "immediately preceding the determination of the divorce proceeding and were living separate " +
          "and apart when the proceeding started; or (b) the spouse against whom the proceeding is " +
          "brought has, since the marriage, committed adultery, or treated the other spouse with " +
          "physical or mental cruelty of such a kind as to render intolerable the continued " +
          "cohabitation of the spouses. Under s. 11(1)(c), where a divorce is sought under s. 8(2)(b), " +
          "it is the duty of the court to satisfy itself that there has been no condonation or " +
          "connivance on the part of the spouse bringing the proceeding, and to dismiss the application " +
          "if that spouse has condoned or connived at the act or conduct complained of, unless, in the " +
          "opinion of the court, the public interest would be better served by granting the divorce. " +
          "Under s. 11(2), conduct that has been condoned cannot be revived to constitute a " +
          "circumstance described in s. 8(2)(b). Under s. 11(3), a continuation or resumption of " +
          "cohabitation during a period of, or periods totalling, not more than ninety days with " +
          "reconciliation as its primary purpose is not considered condonation.",
        sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "The date the spouses started living separate and apart",
            why:
              "Section 8(2)(a) is measured by at least one year of living separate and apart before the " +
              "determination of the proceeding.",
            examples: [
              "Messages or letters around the time of separation",
              "Change-of-address records",
              "A separation agreement, if there is one",
            ],
          },
        ],
      },
      {
        id: "separate-and-apart-period-divorce",
        name: "How the period of living separate and apart is counted",
        plainExplanation:
          "Under s. 8(3)(a) of the Divorce Act, spouses are deemed to have lived separate and apart for " +
          "any period during which they lived apart and either of them had the intention to live " +
          "separate and apart from the other. Under s. 8(3)(b), a period of living separate and apart " +
          "is not considered interrupted or terminated (i) only because a spouse has become incapable " +
          "of forming or having an intention to continue to live separate and apart, or of continuing " +
          "to live separate and apart of their own volition, if it appears to the court that the " +
          "separation would probably have continued if the spouse had not become so incapable; or (ii) " +
          "only because the spouses resumed cohabitation during a period of, or periods totalling, not " +
          "more than ninety days with reconciliation as its primary purpose.",
        sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Any time spent living together again",
            why:
              "Section 8(3)(b)(ii) refers to resuming cohabitation for not more than ninety days in total " +
              "with reconciliation as its primary purpose.",
            examples: [
              "Dates any attempt at reconciliation started and ended",
              "Records of where each spouse was living during that time",
            ],
          },
        ],
      },
      {
        id: "duties-of-parties-divorce",
        name: "Duties the Divorce Act places on the parties",
        plainExplanation:
          "Sections 7.1 to 7.6 of the Divorce Act, under the heading \"Parties to a Proceeding\", set out " +
          "duties. Under s. 7.1, a person with parenting time or decision-making responsibility for a " +
          "child of the marriage, or who has contact with that child under a contact order, shall " +
          "exercise that time, responsibility or contact in a manner consistent with the best interests " +
          "of the child. Under s. 7.2, a party shall, to the best of their ability, protect any child " +
          "of the marriage from conflict arising from the proceeding. Under s. 7.3, to the extent that " +
          "it is appropriate to do so, the parties shall try to resolve the matters that may be the " +
          "subject of an order through a family dispute resolution process, which s. 2(1) defines as a " +
          "process outside of court, including negotiation, mediation and collaborative law. Under s. " +
          "7.4, a party to a proceeding under the Act, or a person who is subject to an order made " +
          "under the Act, shall provide complete, accurate and up-to-date information if required to do " +
          "so under the Act. Under s. 7.5, a person subject to an order shall comply with it until it " +
          "is no longer in effect. Under s. 7.6, every document that formally starts a proceeding, or " +
          "responds to one, filed by a party must contain a statement by the party certifying that they " +
          "are aware of their duties under ss. 7.1 to 7.5.",
        sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Records of attempts to resolve matters outside court",
            why:
              "Section 7.3 refers to trying to resolve matters through a family dispute resolution process, " +
              "to the extent that it is appropriate.",
            examples: [
              "Correspondence about negotiation",
              "Records of mediation sessions attended",
              "Any written agreement reached",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "child-support-arrangements-bar-divorce",
        name:
          "The court must be satisfied that reasonable arrangements for child support have been made",
        plainExplanation:
          "Under s. 11(1)(b) of the Divorce Act, in a divorce proceeding it is the duty of the court to " +
          "satisfy itself that reasonable arrangements have been made for the support of any children " +
          "of the marriage, having regard to the applicable guidelines, and, if such arrangements have " +
          "not been made, to stay the granting of the divorce until they are made. Rule 36(5) of the " +
          "Family Law Rules requires the Form 36 affidavit to include the information about these " +
          "arrangements and, as exhibits, the income and financial information required by section 21 " +
          "of the child support guidelines. Rule 12(6) of the Family Law Rules also refers to this: the " +
          "court may, on motion, split a divorce from the other issues in a case only if neither spouse " +
          "will be disadvantaged by the order and reasonable arrangements have been made for the " +
          "support of any children of the marriage.",
        whenThisComesUp:
          "When the spouses have a child of the marriage and one spouse applies for a divorce.",
        sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
        verifiedAt: "2026-09-30",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
            pinpoint: "r. 12(6); r. 36(5), para. 4",
          },
        ],
      },
      {
        id: "adultery-other-person-named-divorce",
        name: "If an application names the other person in an adultery allegation",
        plainExplanation:
          "Under rule 36(3) of the Family Law Rules, in an application for divorce claiming that the " +
          "other spouse committed adultery with another person, that person does not need to be named, " +
          "but if named, shall be served with the application and has all the rights of a respondent in " +
          "the case.",
        whenThisComesUp: "When a divorce application relies on s. 8(2)(b)(i) of the Divorce Act (adultery).",
        sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-18",
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Starting the case: sole or joint application. Under rule 36(1) of the Family Law Rules, " +
          "either spouse may start a divorce case by filing an application naming the other spouse as a " +
          "respondent, or by filing a joint application with no respondent. Under rule 36(2), in a " +
          "joint application the divorce and any other order sought shall be made only with the consent " +
          "of both spouses.",
        sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-18",
      },
      {
        note:
          "Documents for a divorce on affidavit evidence. Under rule 36(4), the court shall not grant a " +
          "divorce until a marriage certificate or marriage registration certificate has been filed " +
          "(unless the application states that it is impractical to obtain one and explains why), and a " +
          "report on earlier divorce cases started by either spouse, issued under the Central Registry " +
          "of Divorce Proceedings Regulations (Canada), has been filed. Under rule 36(5) and (5.1), an " +
          "affidavit in Form 36 is filed by the applicant if the respondent files no answer (or files " +
          "one and later withdraws it), or by both applicants in a joint application. Under rule 36(6), " +
          "the applicant files with the affidavit three copies of a draft divorce order (Form 25A), a " +
          "stamped envelope addressed to each party, and, if the order is to contain a support order, " +
          "an extra copy of the draft order and two copies of a draft support deduction order. Under " +
          "rule 36(7), once the requirements of subrules (4) to (6) have been met, the clerk prepares a " +
          "certificate (Form 36A) and presents the documents to a judge. The rule lists what the judge " +
          "can then do: (a) grant the divorce as set out in the draft order; (b) have the clerk return " +
          "the documents to the applicant to make any needed corrections; or (c) grant the divorce but " +
          "make changes to the draft order, or refuse to grant the divorce, after giving the applicant " +
          "a chance to file an additional affidavit or come to court to explain why the order should be " +
          "made without change.",
        sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-18",
      },
      {
        note:
          "When the divorce takes effect, and the divorce certificate. Under s. 12(1) of the Divorce " +
          "Act, subject to that section, a divorce takes effect on the thirty-first day after the day " +
          "on which the judgment granting the divorce is rendered. Section 12(2) to (6) set out other " +
          "effective dates (under s. 12(2), where the court is of the opinion that by reason of special " +
          "circumstances the divorce should take effect earlier, and the spouses agree and undertake " +
          "that no appeal will be taken or any appeal taken has been abandoned, the court may order " +
          "that the divorce takes effect at an earlier time it considers appropriate; and cases where " +
          "an appeal is taken). Under s. 12(7), when a divorce takes effect, a judge or officer of the " +
          "court shall, on request, issue to any person a certificate that a divorce dissolved the " +
          "marriage of the specified persons effective as of a specified date. Under rule 36(8) of the " +
          "Family Law Rules, when a divorce takes effect the clerk shall, on either party's request, " +
          "check that no appeal has been taken (or any appeal has been disposed of) and that no order " +
          "has extended the time for an appeal (or any extended time has expired without an appeal), " +
          "and if satisfied, issue a divorce certificate (Form 36B).",
        sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
        verifiedAt: "2026-09-30",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
            pinpoint: "r. 36(8)",
          },
        ],
      },
    ],
    signals: [
      "I want to get divorced",
      "how do I file for divorce in Ontario",
      "joint divorce application",
      "uncontested divorce",
      "divorce after one year of separation",
      "we have been separated over a year and want a divorce",
      "divorce certificate",
      "when does my divorce become final",
      "my spouse won't agree to a divorce",
      "can I get a divorce if we still live in the same house",
      "divorce on grounds of adultery",
      "simple divorce no other issues",
      "we got married in another country and want a divorce here",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.)",
        officialUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 2(1), 3(1), 7.1-7.6, 8(1)-(3), 11(1)(b), 12(1), (2), (7)",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "r. 12(6); r. 36(1)-(8)",
      },
    ],
    reviewedAt: "2026-09-30",
    status: "reviewed",
  },
  {
    id: "family-matter-parenting",
    name: "Decision-making responsibility, parenting time or contact for a child",
    broughtBy:
      "Usually a parent asking a court to decide who makes significant decisions for a child and " +
      "how the child's time is shared. Under the Children's Law Reform Act, a person who is not a " +
      "parent (including a grandparent) may also apply for decision-making responsibility or for " +
      "contact. Under the Divorce Act, a spouse may apply, and a non-spouse who is a parent, stands " +
      "in the place of a parent or intends to may apply only with leave of the court. This entry " +
      "does not cover child support or property.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "orders-defined-parenting",
        name: "What decision-making responsibility, parenting time and contact mean",
        plainExplanation:
          "Under s. 18(1) of the Children's Law Reform Act (CLRA), \"decision-making responsibility\" " +
          "means responsibility for making significant decisions about a child's well-being, including " +
          "health, education, culture, language, religion and spirituality, and significant " +
          "extra-curricular activities. \"Parenting time\" means the time a child spends in the care of a " +
          "parent of the child, whether or not the child is physically with the parent during that " +
          "time. \"Contact\" means the time a child spends in the care of a person other than the child's " +
          "parent. Under s. 21(1), a parent may apply for a parenting order about decision-making " +
          "responsibility and parenting time; under s. 18(1), a contact order is an order under s. 28 " +
          "about contact. The Divorce Act, s. 2(1), defines decision-making responsibility in almost " +
          "the same words. Under the Divorce Act, parenting time is the time a child of the marriage " +
          "spends in the care of a person referred to in s. 16.1(1), and a contact order is an order " +
          "made under s. 16.5(1). Under s. 18(5) and (6) of the CLRA, unless the context requires " +
          "otherwise, a reference in an Act or regulation to \"custody\" of a child includes " +
          "decision-making responsibility, and a reference to \"access\" includes parenting time or " +
          "contact. This part of the checklist is about which of these orders the application asks for.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
            pinpoint: "Divorce Act, s. 2(1)",
          },
        ],
        evidenceCategories: [
          {
            name: "What is being asked for",
            why: "Shows which orders the application asks the court to make.",
            examples: [
              "A list of the significant decisions in question (for example health or education)",
              "A written proposed schedule for the child's time",
            ],
          },
          {
            name: "Existing arrangements",
            why: "Shows what is already in place, in writing or in practice.",
            examples: [
              "Any existing court order or separation agreement about the child",
              "A calendar showing how the child's time is shared now",
            ],
          },
        ],
      },
      {
        id: "who-may-apply-parenting",
        name: "Who may apply, and which Act applies",
        plainExplanation:
          "Under s. 21(1) of the CLRA, a parent of a child may apply to a court for a parenting order " +
          "about decision-making responsibility and parenting time. Under s. 21(2), any person other " +
          "than the parent, including a grandparent, may apply for a parenting order about " +
          "decision-making responsibility. Under s. 21(3), any person other than the parent, including " +
          "a grandparent, may apply for a contact order. Under s. 18(1) of the CLRA, \"court\" means the " +
          "Ontario Court of Justice, the Family Court or the Superior Court of Justice. The Divorce Act " +
          "applies to a child of the marriage. Under s. 16.1(1) of the Divorce Act, a parenting order " +
          "may be made on application by either or both spouses, or by a person other than a spouse who " +
          "is a parent of the child, stands in the place of a parent or intends to stand in the place " +
          "of a parent. Under s. 16.1(3), that second group may apply only with leave of the court. " +
          "Under s. 16.5(1) and (3), a person other than a spouse may apply for a contact order, only " +
          "with leave of the court unless they already got leave to apply under s. 16.1. Under s. 2(1) " +
          "of the Divorce Act, \"court\" for Ontario means the Superior Court of Justice, and includes " +
          "any other court designated as that definition describes. Under s. 27 of the CLRA, if an " +
          "action for divorce is started under the Divorce Act, a CLRA application about " +
          "decision-making responsibility, parenting time or contact that has not been determined is " +
          "stayed except by leave of the court. This part of the checklist is about who is applying and " +
          "under which Act.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
            pinpoint: "Divorce Act, ss. 2(1), 16.1(1), (3), 16.5(1), (3)",
          },
        ],
        evidenceCategories: [
          {
            name: "The applicant's relationship to the child",
            why: "Shows whether the applicant is a parent, a spouse or another person.",
            examples: [
              "The child's birth certificate",
              "Documents showing the applicant's role in the child's life, if not a parent",
            ],
          },
          {
            name: "Marriage and divorce status",
            why: "Shows whether the Divorce Act or the CLRA is the Act in question.",
            examples: [
              "Marriage certificate, if the parents were married",
              "Any divorce application already started",
            ],
          },
        ],
      },
      {
        id: "best-interests-test-parenting",
        name: "The best interests of the child is the only consideration",
        plainExplanation:
          "Under s. 24(1) of the CLRA, in making a parenting order or contact order, the court shall " +
          "only take into account the best interests of the child, in accordance with s. 24. Under s. " +
          "24(2), the court shall consider all factors related to the circumstances of the child and " +
          "shall give primary consideration to the child's physical, emotional and psychological " +
          "safety, security and well-being. The Divorce Act says the same thing in s. 16(1) and (2): " +
          "the court shall take into consideration only the best interests of the child of the " +
          "marriage, and shall give primary consideration to the child's physical, emotional and " +
          "psychological safety, security and well-being. Under s. 24(7) of the CLRA and s. 16(7) of " +
          "the Divorce Act, these rules also apply to interim orders and to variation orders. This part " +
          "of the checklist is about the test both Acts use.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
            pinpoint: "Divorce Act, s. 16(1), (2), (7)",
          },
        ],
        evidenceCategories: [
          {
            name: "The child's circumstances",
            why: "Gives the court information about the child's life as it is now.",
            examples: [
              "School report cards or attendance records",
              "Information about the child's health care or special needs",
              "A description of the child's usual weekly routine",
            ],
          },
        ],
      },
      {
        id: "best-interests-factors-parenting",
        name: "The factors listed in the Acts",
        plainExplanation:
          "Under s. 24(3) of the CLRA, factors related to the circumstances of a child include: (a) the " +
          "child's needs, given the child's age and stage of development, such as the child's need for " +
          "stability; (b) the nature and strength of the child's relationship with each parent, each of " +
          "the child's siblings and grandparents and any other person who plays an important role in " +
          "the child's life; (c) each parent's willingness to support the development and maintenance " +
          "of the child's relationship with the other parent; (d) the history of care of the child; (e) " +
          "the child's views and preferences, giving due weight to the child's age and maturity, unless " +
          "they cannot be ascertained; (f) the child's cultural, linguistic, religious and spiritual " +
          "upbringing and heritage, including Indigenous upbringing and heritage; (g) any plans for the " +
          "child's care; (h) the ability and willingness of each person the order would apply to, to " +
          "care for and meet the needs of the child; (i) the ability and willingness of each person the " +
          "order would apply to, to communicate and co-operate, in particular with one another, on " +
          "matters affecting the child; (j) any family violence and its impact on, among other things, " +
          "the ability and willingness of any person who engaged in the family violence to care for and " +
          "meet the needs of the child, and the appropriateness of making an order that would require " +
          "persons in respect of whom the order would apply to co-operate on issues affecting the child " +
          "(the next part of the checklist); and (k) any civil or criminal proceeding, order, condition " +
          "or measure that is relevant to the safety, security and well-being of the child. Section " +
          "16(3) of the Divorce Act lists the same factors, using \"spouse\" where the CLRA says \"parent\" " +
          "in (b) and (c). Two more rules appear in both Acts. Under s. 24(5) of the CLRA and s. 16(5) " +
          "of the Divorce Act, the court shall not take into consideration the past conduct of any " +
          "person unless the conduct is relevant to the exercise of that person's decision-making " +
          "responsibility, parenting time or contact. Under s. 24(6) of the CLRA and s. 16(6) of the " +
          "Divorce Act, in allocating parenting time the court shall give effect to the principle that " +
          "a child should have as much time with each parent (each spouse, in the Divorce Act) as is " +
          "consistent with the best interests of the child. This part of the checklist is about the " +
          "listed factors.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
            pinpoint: "Divorce Act, s. 16(3), (5), (6)",
          },
        ],
        evidenceCategories: [
          {
            name: "History of care",
            why: "Relates to the history of care of the child (factor (d)).",
            examples: [
              "Records of who attended the child's medical or school appointments",
              "Daycare or school pick-up records",
            ],
          },
          {
            name: "Plans for the child's care",
            why: "Relates to any plans for the child's care (factor (g)).",
            examples: [
              "A written proposed parenting plan or schedule",
              "Information about the child's school, childcare and home under the plan",
            ],
          },
          {
            name: "The child's relationships and heritage",
            why: "Relates to factors (b) and (f).",
            examples: [
              "Information about siblings, grandparents and other important people in the child's life",
              "Information about the child's language, culture, religion or Indigenous heritage",
            ],
          },
        ],
      },
      {
        id: "family-violence-factor-parenting",
        name: "Family violence as a factor",
        plainExplanation:
          "Under s. 18(1) of the CLRA, \"family violence\" means any conduct by a family member towards " +
          "another family member that is violent or threatening, that constitutes a pattern of coercive " +
          "and controlling behaviour, or that causes the other family member to fear for their own " +
          "safety or for that of another person. In the case of a child, it includes direct or indirect " +
          "exposure to such conduct. Under s. 18(2), the conduct need not constitute a criminal " +
          "offence. Section 18(2) also lists what the definition includes: physical abuse, including " +
          "forced confinement but excluding the use of reasonable force to protect oneself or another " +
          "person; sexual abuse; threats to kill or cause bodily harm to any person; harassment, " +
          "including stalking; the failure to provide the necessaries of life; psychological abuse; " +
          "financial abuse; threats to kill or harm an animal or damage property; and the killing or " +
          "harming of an animal or the damaging of property. Under s. 18(1), \"family member\" includes a " +
          "member of a household of a child or of a parent, as well as a dating partner of a parent who " +
          "participates in the activities of the household. One of the listed factors is any family " +
          "violence and its impact on, among other things, (i) the ability and willingness of any " +
          "person who engaged in the family violence to care for and meet the needs of the child, and " +
          "(ii) the appropriateness of making an order that would require persons in respect of whom " +
          "the order would apply to co-operate on issues affecting the child (s. 24(3)(j)). Under s. " +
          "24(4), in considering that impact the court shall take into account: the nature, seriousness " +
          "and frequency of the family violence and when it occurred; whether there is a pattern of " +
          "coercive and controlling behaviour in relation to a family member; whether the family " +
          "violence is directed toward the child or whether the child is directly or indirectly exposed " +
          "to it; the physical, emotional and psychological harm or risk of harm to the child; any " +
          "compromise to the safety of the child or other family member; whether the family violence " +
          "causes the child or other family member to fear for their own safety or for that of another " +
          "person; any steps taken by the person engaging in the family violence to prevent further " +
          "family violence and improve their ability to care for and meet the needs of the child; and " +
          "any other relevant factor. The Divorce Act has an essentially identical definition in s. " +
          "2(1) and essentially the same list of considerations in s. 16(4). This part of the checklist " +
          "is about how both Acts treat family violence.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
            pinpoint: "Divorce Act, ss. 2(1), 16(3)(j), 16(4)",
          },
        ],
        evidenceCategories: [
          {
            name: "Orders and proceedings already in place",
            why:
              "Relates to factor (k): any civil or criminal proceeding, order, condition or measure " +
              "relevant to the child's safety, security and well-being.",
            examples: [
              "Copies of any existing restraining order or other court order",
              "Copies of any conditions from another court case",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "moving-notice-parenting",
        name: "Notice before a move: change in residence and relocation",
        plainExplanation:
          "Both Acts separate an ordinary change in residence from a \"relocation\". Under s. 18(1) of " +
          "the CLRA, a relocation is a change in residence of a child, or of a person who has " +
          "decision-making responsibility or parenting time (or who has applied for a parenting order), " +
          "that is likely to have a significant impact on the child's relationship with another such " +
          "person or with a person who has contact under a contact order. Section 2(1) of the Divorce " +
          "Act defines relocation in similar words. Change in residence that is not a relocation: under " +
          "s. 39.1(1)-(2) of the CLRA, a person with decision-making responsibility or parenting time " +
          "who intends to change their residence, or the child's, shall notify any other person who has " +
          "decision-making responsibility, parenting time or contact under a contact order. The notice " +
          "shall be in writing and set out the date the change is expected to occur and the new address " +
          "and contact information. Section 39.1(5) says s. 39.1 does not apply to relocations. The " +
          "Divorce Act rule is s. 16.8(1)-(2), and s. 16.7 says s. 16.8 does not apply to a relocation. " +
          "Relocation: under s. 39.3(1)-(2) of the CLRA, a person with decision-making responsibility " +
          "or parenting time who intends a relocation shall notify every other person who has " +
          "decision-making responsibility, parenting time or contact under a contact order at least 60 " +
          "days before the expected date. The notice shall be in the form prescribed by the regulations " +
          "or, if no form is prescribed, in writing, and shall set out the expected date, the new " +
          "address and contact information, a proposal as to how decision-making responsibility, " +
          "parenting time or contact could be exercised, and any other information prescribed by the " +
          "regulations. Under s. 16.9(1)-(2) of the Divorce Act, the notice must be given at least 60 " +
          "days before the expected date, in the form prescribed by the regulations, with the same " +
          "contents. A person with contact: under s. 39.2 of the CLRA and s. 16.96 of the Divorce Act, " +
          "a person who has contact under a contact order and intends to change residence shall notify, " +
          "in writing, the people with decision-making responsibility or parenting time. If the change " +
          "is likely to have a significant impact on the child's relationship with that person, the " +
          "notice must be given at least 60 days before the change and include a proposal as to how " +
          "contact could be exercised. Exceptions: under ss. 39.1(3)-(4), 39.2(4)-(5) and 39.3(3)-(4) " +
          "of the CLRA and ss. 16.8(3)-(4), 16.9(3)-(4) and 16.96(3)-(4) of the Divorce Act, on " +
          "application the court may provide that these notice requirements do not apply, or apply with " +
          "changes, including if there is a risk of family violence. That application may be made " +
          "without notice to any other party.",
        whenThisComesUp:
          "When a person with decision-making responsibility, parenting time or contact plans to move, " +
          "or to move the child.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
            pinpoint: "Divorce Act, ss. 2(1), 16.7-16.9, 16.96",
          },
        ],
      },
      {
        id: "relocation-objection-burden-parenting",
        name: "Objecting to a relocation, and who has to prove what",
        plainExplanation:
          "Objecting: under s. 39.3(5) of the CLRA, a person with decision-making responsibility or " +
          "parenting time who receives notice of a proposed relocation may object no later than 30 days " +
          "after receiving the notice, either by notifying the person who gave notice or by making an " +
          "application under s. 21. Under s. 39.3(6), a written objection shall set out a statement " +
          "that the person objects, the reasons for the objection, the person's views on the proposal " +
          "in the notice, and any other information prescribed by the regulations. Under s. 39.4(2), a " +
          "person who gave notice under s. 39.3 may relocate the child as of the date in the notice if " +
          "the relocation is authorized by a court, or if no objection is made under s. 39.3(5) and " +
          "there is no order prohibiting the relocation. Under s. 16.91(1) of the Divorce Act, the " +
          "person may relocate as of the date in the notice if a court authorizes it, or if the person " +
          "who received the notice does not object within 30 days after the day it is received (in a " +
          "form prescribed by the regulations, or in an application under s. 16.1(1) or s. 17(1)(b)) " +
          "and there is no order prohibiting the relocation. Deciding a relocation: under s. 39.4(3) of " +
          "the CLRA and s. 16.92(1) of the Divorce Act, the court takes into account the best interests " +
          "of the child as well as the reasons for the relocation, its impact on the child, the time " +
          "each person spends with the child and their level of involvement, whether notice and other " +
          "obligations were complied with, any order, arbitration award or agreement about where the " +
          "child is to live, how reasonable the relocating person's proposal is (including the new " +
          "location and travel expenses), and whether each person has complied with their obligations " +
          "and the likelihood of future compliance. Under s. 39.4(4) of the CLRA and s. 16.92(2) of the " +
          "Divorce Act, the court shall not consider whether, if the relocation were prohibited, the " +
          "person would relocate without the child or not relocate. Burden of proof (CLRA s. " +
          "39.4(5)-(8); Divorce Act ss. 16.93-16.94): if the parties substantially comply with an " +
          "order, arbitration award or agreement that provides that the child spend substantially equal " +
          "time in the care of each party, the party who intends to relocate the child has the burden " +
          "of proving that the relocation would be in the best interests of the child. If the parties " +
          "substantially comply with an order, arbitration award or agreement that provides that the " +
          "child spend the vast majority of time in the care of the party who intends to relocate, the " +
          "party opposing the relocation has the burden of proving that the relocation would not be in " +
          "the best interests of the child. In any other case, the parties have the burden of proving " +
          "whether the relocation is in the best interests of the child. If the order in the first two " +
          "rules is an interim order, the court may decide that the rule does not apply.",
        whenThisComesUp:
          "When a relocation notice has been given or received, or an objection to a relocation has " +
          "been made.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
            pinpoint: "Divorce Act, ss. 16.91-16.94",
          },
        ],
      },
      {
        id: "parenting-plan-agreement-parenting",
        name: "A written parenting plan the parties agree on",
        plainExplanation:
          "Under s. 28(7) of the CLRA, the court shall include in a parenting order or contact order " +
          "any written parenting plan submitted by the parties that contains the elements relating to " +
          "decision-making responsibility, parenting time or contact to which the parties agree, " +
          "subject to any changes the court may specify if it considers it to be in the best interests " +
          "of the child to do so. Under s. 16.6(1) of the Divorce Act, the court shall include in the " +
          "order any parenting plan submitted by the parties unless, in the opinion of the court, it is " +
          "not in the best interests of the child to do so; in that case the court may modify the plan " +
          "and include it in the order. Section 16.6(2) defines a parenting plan as a document or part " +
          "of a document that contains the elements relating to parenting time, decision-making " +
          "responsibility or contact to which the parties agree. Under s. 33.1(3) of the CLRA and s. " +
          "7.3 of the Divorce Act, to the extent that it is appropriate to do so, the parties to a " +
          "proceeding shall try to resolve the matters through an alternative (CLRA) or family (Divorce " +
          "Act) dispute resolution process; the CLRA names negotiation, mediation or collaborative law " +
          "as examples.",
        whenThisComesUp:
          "When the parties have agreed, in writing, on some or all of the arrangements for the child.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
            pinpoint: "Divorce Act, ss. 7.3, 16.6",
          },
        ],
      },
      {
        id: "childs-views-parenting",
        name: "The child's views and preferences",
        plainExplanation:
          "Under s. 24(3)(e) of the CLRA and s. 16(3)(e) of the Divorce Act, one of the listed factors " +
          "is the child's views and preferences, giving due weight to the child's age and maturity, " +
          "unless they cannot be ascertained. The Acts list it alongside the other factors, and under " +
          "s. 24(2) of the CLRA and s. 16(2) of the Divorce Act, primary consideration goes to the " +
          "child's physical, emotional and psychological safety, security and well-being. Separately, " +
          "under s. 33.1(2) of the CLRA and s. 7.2 of the Divorce Act, a party to a proceeding shall, " +
          "to the best of their ability, protect any child from conflict arising from the proceeding.",
        whenThisComesUp:
          "When the child has expressed views about the arrangements, or a party wants the child's " +
          "views to be known.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
            pinpoint: "Divorce Act, ss. 7.2, 16(3)(e)",
          },
        ],
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Starting a case. Under r. 8(1) of the Family Law Rules, to start a case a person shall file " +
          "an application (Form 8 or one of the other forms the rule lists). Under r. 8(3.1), an " +
          "application that contains a claim about decision-making responsibility, parenting time or " +
          "contact with respect to a child shall be accompanied by the applicable documents referred to " +
          "in r. 35.1. Under r. 8(5), the application shall be served immediately on every other party, " +
          "and special service shall be used unless the party is listed in r. 8(6).",
        sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-18",
      },
      {
        note:
          "The affidavit that goes with the claim. Under s. 21(4) of the CLRA, an application for a " +
          "parenting order or contact order shall be accompanied by an affidavit of the person " +
          "applying, in the form the rules of court specify, containing: the person's proposed plan for " +
          "the child's care and upbringing; information about the person's current or previous " +
          "involvement in any family proceedings (including proceedings under Part V of the Child, " +
          "Youth and Family Services Act, 2017) or in any criminal proceedings; and any other " +
          "information known to the person that is relevant to the s. 24 best-interests factors. Under " +
          "r. 35.1(1) of the Family Law Rules, the party making a claim about decision-making " +
          "responsibility, parenting time or contact shall serve and file, with the document that " +
          "contains the claim, an affidavit in Form 35.1, and also an affidavit in Form 35.1A if the " +
          "child or any party has been involved in a child protection case or has received services " +
          "from a child protection agency. Under r. 35.1(3)-(4), a person who is not a parent and " +
          "claims decision-making responsibility shall attach a police records check obtained not more " +
          "than 60 days before starting the claim, or proof of the request if it has not arrived yet; " +
          "in that case the check is served and filed no later than 10 days after receiving it. Under " +
          "s. 21.2(2) of the CLRA, a person who applies under s. 21 for a parenting order respecting " +
          "decision-making responsibility and who is not a parent of the child shall submit a request, " +
          "in the form provided by the Ministry of the Attorney General, to every children's aid " +
          "society or other body or person prescribed by the regulations, for a report on whether a " +
          "society has records relating to the applicant; under r. 35.1(5), every person required to " +
          "submit that request shall provide to the court a copy of the request together with Form " +
          "35.1. Under r. 35.1(6), the clerk shall not accept the document for filing without the " +
          "affidavit in Form 35.1 (and in Form 35.1A, if applicable) and the documents referred to in " +
          "r. 35.1(3) and (5), if applicable. Under r. 35.1(7), a person who discovers that information " +
          "in their affidavit is incorrect or incomplete, or has changed, shall immediately serve and " +
          "file a new affidavit (or, for a minor change, an affidavit in Form 14A).",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
            pinpoint: "Family Law Rules, r. 35.1(1), (3)-(7)",
          },
        ],
      },
      {
        note:
          "Mandatory information program. Under r. 8.1(1) of the Family Law Rules, the rule applies to " +
          "cases started after August 31, 2011 that deal with a claim about decision-making " +
          "responsibility, parenting time or contact under the Divorce Act or Part III of the CLRA (and " +
          "certain other claims). Under r. 8.1(4), each party to the case shall attend the program no " +
          "later than 45 days after the case is started. Under r. 8.1(5), the applicant shall arrange " +
          "their own appointment, obtain an appointment for the respondent, and serve notice of the " +
          "respondent's appointment with the application. Under r. 8.1(6)-(7), the certificate of " +
          "attendance is filed as soon as possible and no later than 2 p.m. on the second day before " +
          "the case conference, if one is scheduled, and a party shall not take any step in the case " +
          "before their certificate is filed, except that a respondent may serve and file an answer and " +
          "a party may make an appointment for a case conference. Under r. 8.1(2), subrules (4) to (7) " +
          "do not apply to some parties, including parties in cases proceeding on consent and parties " +
          "who have already attended a mandatory information program. Under r. 8.1(8), the court may, " +
          "on motion, order that any or all of subrules (4) to (7) do not apply to a party because of " +
          "urgency or hardship or for some other reason in the interest of justice.",
        sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-18",
      },
      {
        note:
          "Case conferences. Under r. 17(1) of the Family Law Rules, in each case in which an answer is " +
          "filed, a judge shall conduct at least one conference (with exceptions for child protection " +
          "and international child abduction cases). Under r. 17(4), the purposes of a case conference " +
          "include exploring the chances of settling the case, identifying the issues in dispute and " +
          "those not in dispute, exploring ways to resolve the issues in dispute, ensuring disclosure " +
          "of the relevant evidence, noting admissions that may simplify the case, setting the date for " +
          "the next step, setting a timetable, organizing or holding a settlement conference, and " +
          "giving directions about any intended motion. Under r. 17(3.1), before a conference each " +
          "party shall confer, or make best efforts to confer, with every other party about requests " +
          "for financial disclosure and a temporary resolution of the issues in dispute. Under r. " +
          "17(3.2), that does not apply to a party who is prohibited from such communication by court " +
          "order, or if there is a risk of domestic violence by a party who is not represented by a " +
          "licensed representative. Under r. 14(4), no motion may be heard before a conference dealing " +
          "with the substantive issues has been completed, unless r. 14(4.2) or (6) applies.",
        sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-18",
      },
    ],
    signals: [
      "parenting time schedule with my ex for our kids",
      "who makes the decisions about my child's school and health after we separated",
      "want a court order about which days the kids are with me",
      "ex won't let me see my children",
      "grandparent wants time with grandchild",
      "decision-making responsibility for my son",
      "ex wants to move away with our daughter",
      "moving to another city with my kids after separation",
      "we can't agree on a parenting plan",
      "custody of my kids after we split up",
      "want to change the parenting schedule in our order",
      "my child says she wants to live with me",
      "shared parenting week on week off",
      "other parent keeps changing the pickup days",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Children's Law Reform Act, R.S.O. 1990, c. C.12",
        officialUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 18, 21, 24, 27, 28(7), 33.1, 39.1-39.4",
      },
      {
        sourceName: "Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.)",
        officialUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 2(1), 7.2, 7.3, 16, 16.1, 16.5-16.96",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "rr. 8, 8.1, 14(4), 17, 35.1",
      },
    ],
    reviewedAt: "2026-09-30",
    status: "reviewed",
  },
  {
    id: "family-matter-property-division",
    name: "Dividing property after a marriage ends (equalization and the matrimonial home)",
    broughtBy:
      "A spouse, former spouse or deceased spouse's personal representative asking the court to " +
      "decide the equalization of net family property: under s. 7(1) of the Family Law Act, the court " +
      "may, on the application of any of them, determine any matter respecting the spouses' " +
      "entitlement under s. 5. Under s. 7(2), entitlement " +
      "under s. 5(1), (2) and (3) is personal as between the spouses, but an application based on " +
      "s. 5(1) or (3) and started before a spouse's death may be continued by or against the " +
      "deceased spouse's estate, and an application based on s. 5(2) may be made by or against a " +
      "deceased spouse's estate. Part I and Part II of the Act use the s. 1(1) definition of " +
      "\"spouse\": either of two persons who are married to each other, or who have together entered " +
      "into a marriage that is voidable or void, in good faith on the part of a person relying on this " +
      "to assert a right. It does not include unmarried partners, even though Part III (support) " +
      "uses a wider definition in s. 29.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "married-spouses-part-i-property",
        name: "Part I and Part II apply to married spouses",
        plainExplanation:
          "Under s. 1(1) of the Family Law Act, \"spouse\" means either of two persons who are married to " +
          "each other, or who have together entered into a marriage that is voidable or void, in good " +
          "faith on the part of the person relying on this to assert a right. Under s. 1(2), in that " +
          "definition a reference to marriage includes a marriage that is actually or potentially " +
          "polygamous, if it was celebrated in a jurisdiction whose system of law recognizes it as " +
          "valid. Part I (Family Property) and Part II (Matrimonial Home) use this definition. Section " +
          "29 gives a wider definition of \"spouse\" that also includes some unmarried people who have " +
          "cohabited, but s. 29 says that wider definition is \"In this Part\", meaning Part III (Support " +
          "Obligations). It does not apply to property division under Part I. Under s. 7(1), the court " +
          "may, on the application of a spouse, former spouse or deceased spouse's personal " +
          "representative, determine any matter respecting the spouses' entitlement under section 5. " +
          "Under s. 7(2), entitlement under s. 5(1), (2) and (3) is personal as between the spouses, " +
          "but an application based on s. 5(1) or (3) and started before a spouse's death may be " +
          "continued by or against the deceased spouse's estate, and an application based on s. 5(2) " +
          "may be made by or against a deceased spouse's estate.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
        evidenceCategories: [
          {
            name: "Proof of the marriage",
            why:
              "Part I and Part II use the s. 1(1) definition of spouse, which is based on marriage.",
            examples: [
              "Marriage certificate or marriage registration certificate",
              "Any document showing the date of the marriage",
            ],
          },
        ],
      },
      {
        id: "net-family-property-defined-property",
        name: "What \"net family property\", \"property\" and \"valuation date\" mean",
        plainExplanation:
          "Under s. 4(1) of the Family Law Act, \"net family property\" means the value of all the " +
          "property (except excluded property under s. 4(2)) that a spouse owns on the valuation date, " +
          "after deducting (a) the spouse's debts and other liabilities, and (b) the value of property, " +
          "other than a matrimonial home, that the spouse owned on the date of the marriage, after " +
          "deducting the spouse's debts and liabilities at that date (other than debts or liabilities " +
          "related directly to acquiring or significantly improving a matrimonial home). Under s. " +
          "4(1.1), the debts and liabilities deducted under (a) and (b) include any applicable " +
          "contingent tax liabilities in respect of the property. \"Property\" means any interest, " +
          "present or future, vested or contingent, in real or personal property. It includes, for a " +
          "pension plan, the imputed value of the spouse's interest for the period from the date of the " +
          "marriage to the valuation date, determined under s. 10.1. The \"valuation date\" is the " +
          "earliest of five dates listed in s. 4(1), including the date the spouses separate and there " +
          "is no reasonable prospect that they will resume cohabitation, and the date a divorce is " +
          "granted. Under s. 4(5), if a spouse's net family property is less than zero, it is deemed to " +
          "be equal to zero.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
        evidenceCategories: [
          {
            name: "Values on the valuation date",
            why:
              "Net family property is based on the property a spouse owns, and the debts they have, on the " +
              "valuation date. Rule 13(3.3) of the Family Law Rules lists documents of this kind.",
            examples: [
              "Bank, investment and savings statements issued closest to the valuation date",
              "Statements for any mortgage, line of credit or credit card closest to the valuation date",
              "Municipal Property Assessment Corporation assessment for Ontario real property",
              "Pension valuation request",
            ],
          },
          {
            name: "Values on the date of marriage",
            why:
              "The definition deducts the value of property (other than a matrimonial home) owned on the " +
              "date of the marriage, after that date's debts.",
            examples: [
              "Any available statements showing what was owned on the date of marriage",
              "Any available statements showing debts owed on the date of marriage",
            ],
          },
          {
            name: "The date of separation",
            why:
              "One of the listed valuation dates is the date the spouses separate and there is no " +
              "reasonable prospect that they will resume cohabitation.",
            examples: [
              "Messages or letters around the time of separation",
              "Change-of-address records",
              "A separation agreement, if there is one",
            ],
          },
        ],
      },
      {
        id: "one-half-difference-property",
        name:
          "The spouse with the lesser net family property is entitled to one-half the difference",
        plainExplanation:
          "Under s. 5(1) of the Family Law Act, when a divorce is granted, a marriage is declared a " +
          "nullity, or the spouses are separated and there is no reasonable prospect that they will " +
          "resume cohabitation, the spouse whose net family property is the lesser of the two is " +
          "entitled to one-half the difference between them. Section 5(7) says the purpose of the " +
          "section is to recognize that child care, household management and financial provision are " +
          "the joint responsibilities of the spouses, and that inherent in the marital relationship " +
          "there is equal contribution, whether financial or otherwise, subject only to the equitable " +
          "considerations in s. 5(6).",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
        evidenceCategories: [
          {
            name: "Both spouses' financial disclosure",
            why:
              "The entitlement under s. 5(1) compares the two spouses' net family properties.",
            examples: [
              "Each spouse's financial statement (Form 13.1)",
              "Each spouse's net family property statement (Form 13B)",
              "Documents exchanged under rule 13(3.3) of the Family Law Rules",
            ],
          },
        ],
      },
      {
        id: "matrimonial-home-possession-property",
        name: "Both spouses have an equal right to possession of the matrimonial home",
        plainExplanation:
          "Under s. 18(1) of the Family Law Act, every property in which a person has an interest and " +
          "that is, or if the spouses have separated was at the time of separation, ordinarily occupied " +
          "by the person and their spouse as their family residence is their matrimonial home. Under s. " +
          "19(1), both spouses have an equal right to possession of a matrimonial home. Under s. 19(2), " +
          "when only one spouse has an interest in the home, the other spouse's right of possession is " +
          "personal as against the first spouse, and ends when they cease to be spouses, unless a " +
          "separation agreement or court order provides otherwise.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
        evidenceCategories: [
          {
            name: "The home and who has an interest in it",
            why:
              "Section 18(1) defines the matrimonial home by a person's interest in the property and its " +
              "ordinary use as the family residence.",
            examples: [
              "Deed, title search or lease",
              "Mortgage statements",
              "Records showing the address was the family residence",
            ],
          },
        ],
      },
      {
        id: "exclusive-possession-order-property",
        name: "Orders for exclusive possession of the matrimonial home",
        plainExplanation:
          "Under s. 24(1) of the Family Law Act, regardless of who owns the matrimonial home and its " +
          "contents, and despite s. 19, the court may on application make orders about the home. These " +
          "include directing that one spouse be given exclusive possession of the home or part of it " +
          "for the period the court directs. Under s. 24(2), the court may, on motion, make a temporary " +
          "or interim order of this kind. Under s. 24(3), in deciding whether to make an order for " +
          "exclusive possession, the court shall consider: (a) the best interests of the children " +
          "affected; (b) any existing orders under Part I and any existing support orders or other " +
          "enforceable support obligations; (c) the financial position of both spouses; (d) any written " +
          "agreement between the parties; (e) the availability of other suitable and affordable " +
          "accommodation; and (f) any violence committed by a spouse against the other spouse or the " +
          "children. Under s. 24(4), in determining the best interests of a child, the court shall " +
          "consider the possible disruptive effects on the child of a move to other accommodation, and " +
          "the child's views and preferences, if they can reasonably be ascertained.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
        evidenceCategories: [
          {
            name: "Information on the listed factors",
            why: "Section 24(3) lists what the court shall consider.",
            examples: [
              "Existing court orders or support arrangements",
              "Financial statement (Form 13.1)",
              "Any written agreement between the spouses",
              "Information about other accommodation available",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "excluded-property-onus-property",
        name: "Excluded property, and who must prove a deduction or exclusion",
        plainExplanation:
          "Under s. 4(2) of the Family Law Act, the value of certain property a spouse owns on the " +
          "valuation date does not form part of their net family property. The list includes: property " +
          "(other than a matrimonial home) acquired by gift or inheritance from a third person after " +
          "the date of the marriage; income from that property, if the donor or testator expressly " +
          "stated it is to be excluded; damages or a right to damages for personal injuries, nervous " +
          "shock, mental distress or loss of guidance, care and companionship (or the part of a " +
          "settlement that represents those damages); proceeds of a life insurance policy payable on " +
          "the death of the life insured; property (other than a matrimonial home) into which that " +
          "property can be traced; property the spouses agreed by a domestic contract is not to be " +
          "included; and unadjusted pensionable earnings under the Canada Pension Plan. Under s. 4(3), " +
          "the onus of proving a deduction under the definition of \"net family property\", or an " +
          "exclusion under s. 4(2), is on the person claiming it.",
        whenThisComesUp:
          "When either spouse says some property should be deducted or left out of their net family " +
          "property, for example because it was an inheritance, a gift, or owned before the marriage.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
      },
      {
        id: "unequal-share-unconscionable-property",
        name: "An amount more or less than half, where equalizing would be unconscionable",
        plainExplanation:
          "Under s. 5(6) of the Family Law Act, the court may award a spouse an amount that is more or " +
          "less than half the difference between the net family properties if the court is of the " +
          "opinion that equalizing them would be unconscionable, having regard to: (a) a spouse's " +
          "failure to disclose to the other spouse debts or other liabilities existing at the date of " +
          "the marriage; (b) the fact that debts or other liabilities claimed in reduction of a " +
          "spouse's net family property were incurred recklessly or in bad faith; (c) the part of a " +
          "spouse's net family property that consists of gifts made by the other spouse; (d) a spouse's " +
          "intentional or reckless depletion of their net family property; (e) the fact that the amount " +
          "a spouse would otherwise receive is disproportionately large in relation to a period of " +
          "cohabitation that is less than five years; (f) the fact that one spouse has incurred a " +
          "disproportionately larger amount of debts or other liabilities than the other spouse for the " +
          "support of the family; (g) a written agreement between the spouses that is not a domestic " +
          "contract; or (h) any other circumstance relating to the acquisition, disposition, " +
          "preservation, maintenance or improvement of property. The test in the Act is " +
          "\"unconscionable\".",
        whenThisComesUp:
          "When either spouse asks for an amount other than one-half the difference between the net " +
          "family properties.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
      },
      {
        id: "home-disposal-restricted-property",
        name: "Selling or mortgaging the matrimonial home without the other spouse",
        plainExplanation:
          "Under s. 21(1) of the Family Law Act, no spouse shall dispose of or encumber an interest in " +
          "a matrimonial home unless (a) the other spouse joins in the instrument or consents to the " +
          "transaction; (b) the other spouse has released all rights under Part II by a separation " +
          "agreement; (c) a court order has authorized the transaction or released the property from " +
          "Part II; or (d) the property is not designated by both spouses as a matrimonial home and a " +
          "designation of another property as a matrimonial home, made by both spouses, is registered " +
          "and not cancelled. Under s. 21(2), a transaction made in contravention of s. 21(1) may be " +
          "set aside on an application under s. 23, unless the person holding the interest or " +
          "encumbrance at the time of the application acquired it for value, in good faith and without " +
          "notice that the property was a matrimonial home.",
        whenThisComesUp:
          "When one spouse wants to sell, mortgage or otherwise deal with the matrimonial home, or " +
          "already has, without the other spouse's involvement.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Time limits. Under s. 7(3) of the Family Law Act, an application based on s. 5(1) or (2) " +
          "shall not be brought after the earliest of: (a) two years after the day the marriage is " +
          "terminated by divorce or judgment of nullity; (b) six years after the day the spouses " +
          "separate and there is no reasonable prospect that they will resume cohabitation; (c) six " +
          "months after the first spouse's death. The earliest of these dates applies. Under s. 2(8), " +
          "the court may, on motion, extend a time prescribed by the Act if it is satisfied that (a) " +
          "there are apparent grounds for relief; (b) relief is unavailable because of delay that has " +
          "been incurred in good faith; and (c) no person will suffer substantial prejudice by reason " +
          "of the delay.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
      },
      {
        note:
          "Which court. For Part I (Family Property) and Part II (Matrimonial Home), s. 4(1) and s. 17 " +
          "of the Family Law Act define \"court\" as a court under s. 1(1) but not including the Ontario " +
          "Court of Justice. Section 1(1) lists the Ontario Court of Justice, the Family Court of the " +
          "Superior Court of Justice and the Superior Court of Justice.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
      },
      {
        note:
          "Financial disclosure. Under s. 8 of the Family Law Act, in an application under s. 7 each " +
          "party shall serve on the other and file with the court a sworn or declared statement " +
          "disclosing particulars of their property and debts and other liabilities (as of the date of " +
          "the marriage, the valuation date and the date of the statement), the deductions and " +
          "exclusions they claim, and all property they disposed of during the two years before the " +
          "statement or during the marriage, whichever period is shorter. Under rule 13(1) and (1.2) of " +
          "the Family Law Rules, a party making a property claim or a claim for exclusive possession of " +
          "the matrimonial home serves and files a financial statement in Form 13.1 with the document " +
          "that contains the claim, and the party against whom the claim is made serves and files one " +
          "within the time for responding. Under rule 13(3.3), no later than 30 days after the " +
          "financial statement is due, a party to a claim under Part I serves the listed documents " +
          "(such as account statements closest to the valuation date, pension valuation requests, " +
          "property assessments and debt statements), unless the court orders otherwise. Under rule " +
          "13(14), before a settlement conference or trial, each party to a Part I property claim " +
          "serves and files a net family property statement (Form 13B), or an affidavit that an earlier " +
          "one has not changed and is still true, by the times in rule 13(14.0.1). Under rule 13(14.2), " +
          "parties who have served and filed net family property statements file a joint comparison " +
          "(Form 13C) no later than six days before a settlement conference; if they fail to agree on a " +
          "joint comparison, rule 13(14.3) requires each to serve and file their own comparison (Form " +
          "13C) no later than six days before the settlement conference for the party requesting it " +
          "(or, if no party requested it, the applicant or the party making the motion) and four days " +
          "before it for the other party.",
        sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-18",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
            pinpoint: "s. 8",
          },
        ],
      },
    ],
    signals: [
      "equalization payment after separation",
      "net family property calculation",
      "dividing property with my husband after we separated",
      "dividing property with my wife after we separated",
      "who gets the matrimonial home",
      "exclusive possession of the house",
      "my spouse wants to sell the house without my consent",
      "splitting assets in a separation",
      "property I owned before the marriage",
      "inheritance and separation property split",
      "valuation date for separation",
      "pension division after separation",
      "financial statement Form 13.1",
      "can my spouse make me leave the house",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Family Law Act, R.S.O. 1990, c. F.3",
        officialUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint:
          "ss. 1(1), 2(8), 4, 5(1), 5(6), 5(7), 7(1), 7(3), 8, 17, 18(1), 19, 21, 24(1)-(4), 29",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "r. 13(1), (1.2), (3.3), (14), (14.0.1), (14.2), (14.3)",
      },
    ],
    reviewedAt: "2026-09-30",
    status: "reviewed",
  },
  {
    id: "family-matter-restraining-order",
    name: "Restraining order in a family case",
    broughtBy:
      "A person who has reasonable grounds to fear for their own safety, or for the safety of a " +
      "child in their lawful custody, asking a family court for an order under s. 46 of the Family " +
      "Law Act or s. 35 of the Children's Law Reform Act. Under the Family Law Act the order is " +
      "made against a spouse or former spouse, or a person the applicant lives with or has lived " +
      "with in a conjugal relationship; the Children's Law Reform Act provision allows an order " +
      "against any person. This entry covers only those two provisions.",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "reasonable-grounds-fear-restraining",
        name: "Reasonable grounds to fear for safety",
        plainExplanation:
          "Under s. 46(1) of the Family Law Act (FLA), on application, the court may make an interim or " +
          "final restraining order against a person described in s. 46(2) if the applicant has " +
          "reasonable grounds to fear for his or her own safety or for the safety of any child in his " +
          "or her lawful custody. Section 35(1) of the Children's Law Reform Act (CLRA) uses the same " +
          "words: on application, the court may make an interim or final restraining order against any " +
          "person if the applicant has reasonable grounds to fear for his or her own safety or for the " +
          "safety of any child in his or her lawful custody. Under s. 18(5) of the CLRA, unless the " +
          "context requires otherwise, a reference in an Act or regulation to lawful custody of a child " +
          "includes decision-making responsibility with respect to the child under the CLRA. This part " +
          "of the checklist is about the fear for safety that the application sets out.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
            pinpoint: "Children's Law Reform Act, ss. 18(5), 35(1)",
          },
        ],
        evidenceCategories: [
          {
            name: "The applicant's own account",
            why:
              "The application sets out, in the applicant's words, why the applicant fears for their safety " +
              "or a child's safety.",
            examples: [
              "A dated, written account in the applicant's own words",
              "Dates and places written down close to when things happened",
            ],
          },
          {
            name: "Existing orders and conditions",
            why: "Shows any order already in place involving the same people.",
            examples: [
              "Copies of any earlier restraining order or other court order",
              "Copies of any conditions from another court case",
            ],
          },
        ],
      },
      {
        id: "against-whom-restraining",
        name: "Who the order can be made against",
        plainExplanation:
          "Under s. 46(2) of the FLA, a restraining order under s. 46(1) may be made against a spouse " +
          "or former spouse of the applicant, or against a person other than a spouse or former spouse " +
          "if that person is cohabiting with the applicant or has cohabited with the applicant for any " +
          "period of time. Under s. 1(1) of the FLA, \"cohabit\" means to live together in a conjugal " +
          "relationship, whether within or outside marriage. Section 35(1) of the CLRA allows a " +
          "restraining order against any person. This part of the checklist is about the applicant's " +
          "relationship to the person the order would be made against.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
            pinpoint: "Children's Law Reform Act, s. 35(1)",
          },
        ],
        evidenceCategories: [
          {
            name: "The relationship between the applicant and the respondent",
            why:
              "Shows whether the respondent is a spouse, former spouse or a person the applicant cohabits " +
              "or cohabited with.",
            examples: [
              "Marriage certificate, if married",
              "A lease, bill or other document showing a shared address",
            ],
          },
        ],
      },
      {
        id: "order-contents-restraining",
        name: "What a restraining order may contain",
        plainExplanation:
          "Under s. 46(3) of the FLA and s. 35(2) of the CLRA, a restraining order shall be in the form " +
          "prescribed by the rules of court and may contain one or more of the following provisions, as " +
          "the court considers appropriate: (1) restraining the respondent, in whole or in part, from " +
          "directly or indirectly contacting or communicating with the applicant or any child in the " +
          "applicant's lawful custody; (2) restraining the respondent from coming within a specified " +
          "distance of one or more locations; (3) specifying one or more exceptions to (1) and (2); and " +
          "(4) any other provision that the court considers appropriate. Under r. 25(11.1) of the " +
          "Family Law Rules, a restraining order under s. 35 of the CLRA or s. 46 of the FLA shall be " +
          "in Form 25F or 25G, and under r. 25(11.2) an order terminating one shall be in Form 25H. " +
          "Under r. 25(11)(b)(i.1), the clerk shall prepare the order for signature as soon as it is " +
          "made. This part of the checklist is about the terms the application asks for.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
            pinpoint: "Children's Law Reform Act, s. 35(2)",
          },
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
            pinpoint: "Family Law Rules, r. 25(11)(b)(i.1), (11.1), (11.2)",
          },
        ],
        evidenceCategories: [
          {
            name: "Places the order would name",
            why:
              "Relates to a provision restraining the respondent from coming within a specified distance of " +
              "one or more locations.",
            examples: [
              "Addresses of the applicant's home and workplace",
              "Address of a child's school or childcare",
            ],
          },
          {
            name: "Arrangements that may need an exception",
            why: "Relates to a provision specifying exceptions.",
            examples: [
              "Any existing parenting time or contact schedule",
              "Any existing order about exchanges of a child",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "duty-to-comply-restraining",
        name: "The duty to comply with an order",
        plainExplanation:
          "Under s. 47.2(3) of the FLA, a person who is subject to an order made under Part III of the " +
          "FLA shall comply with the order until it is no longer in effect. Section 46 is in Part III " +
          "of the FLA. Section 33.1(5) of the CLRA says the same for orders under Part III of the CLRA, " +
          "which includes s. 35.",
        whenThisComesUp:
          "When a restraining order has been made and a question comes up about following it.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
            pinpoint: "Children's Law Reform Act, s. 33.1(5)",
          },
        ],
      },
      {
        id: "other-orders-checked-restraining",
        name: "Other safety orders and proceedings the court checks for",
        plainExplanation:
          "Under s. 47.4(2) of the FLA and s. 33.3(2) of the CLRA, the court has a duty to consider " +
          "whether any of the following are pending or in effect in relation to any party, unless the " +
          "circumstances of the case are of such a nature that it would clearly not be appropriate to " +
          "do so: a restraining order under s. 46 of the FLA, the CLRA or the Child, Youth and Family " +
          "Services Act, 2017, or any other civil order made to protect a person's safety; a child " +
          "protection order, proceeding, agreement or measure; and an order, proceeding, undertaking or " +
          "recognizance in relation to any matter of a criminal nature. Under s. 47.4(3) of the FLA and " +
          "s. 33.3(3) of the CLRA, to carry out that duty the court may make inquiries of the parties " +
          "or review information that is readily available and that has been obtained through a lawful " +
          "search.",
        whenThisComesUp:
          "When there is another family, child protection or criminal case, or another order, involving " +
          "either party.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
            pinpoint: "Children's Law Reform Act, s. 33.3(2)-(3)",
          },
        ],
      },
      {
        id: "contact-limits-other-orders-restraining",
        name: "Contact limits inside other family orders",
        plainExplanation:
          "Some limits on contact can also be made inside other family orders. Under s. 47.1 of the " +
          "FLA, in making any order under Part III of the FLA other than an order under s. 46, the " +
          "court may also make an interim order prohibiting, in whole or in part, a party from directly " +
          "or indirectly contacting or communicating with another party, if the court determines that " +
          "the order is necessary to ensure that an application under that Part is dealt with justly. " +
          "Under s. 28(1)(c) of the CLRA, the court to which an application under s. 21 (for a " +
          "parenting order or contact order) is made may make any additional order it considers " +
          "necessary and proper in the circumstances, including an order limiting the duration, " +
          "frequency, manner or location of contact or communication between any of the parties, or " +
          "between a party and the child, and an order prohibiting a party or other person from " +
          "engaging in specified conduct in the presence of the child or at any time when the person is " +
          "responsible for the care of the child.",
        whenThisComesUp:
          "When a support, parenting or contact case is already under way, or being started, between " +
          "the same people.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
            pinpoint: "Children's Law Reform Act, s. 28(1)(c)(i)-(ii)",
          },
        ],
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Urgent motion without notice. Under r. 14(12) of the Family Law Rules, a motion may be made " +
          "without notice if: (a) the nature or circumstances of the motion make notice unnecessary or " +
          "not reasonably possible; (b) there is an immediate danger of a child's removal from Ontario, " +
          "and the delay involved in serving a notice of motion would probably have serious " +
          "consequences; (c) there is an immediate danger to the health or safety of a child or of the " +
          "party making the motion, and the delay involved in serving a notice of motion would probably " +
          "have serious consequences; or (d) service of a notice of motion would probably have serious " +
          "consequences. Under r. 14(9), a motion, with or without notice, requires a notice of motion " +
          "(Form 14) and an affidavit (Form 14A). Under r. 14(13), the documents for a motion without " +
          "notice shall be filed on or before the motion date, unless the court orders otherwise. Under " +
          "r. 14(14), an order made on a motion without notice (Form 14D) shall require the matter to " +
          "come back to the court, and if possible to the same judge, within 14 days or on a date " +
          "chosen by the court. Under r. 14(15), the order shall be served immediately on all parties " +
          "affected, together with all documents used on the motion, unless the court orders otherwise.",
        sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-18",
      },
      {
        note:
          "Motions before a case conference. Under r. 14(4) of the Family Law Rules, no motion may be " +
          "heard before a conference dealing with the substantive issues in the case has been " +
          "completed. Under r. 14(4.2), that does not apply if the court is of the opinion that there " +
          "is a situation of urgency or hardship, or that a case conference is not required for some " +
          "other reason in the interest of justice. Under r. 14(6)(e.2), it also does not apply to a " +
          "motion made without notice.",
        sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-18",
      },
      {
        note:
          "Mandatory information program and conferring with the other party. Under r. 8.1(1) of the " +
          "Family Law Rules, the mandatory information program rule applies to cases started after " +
          "August 31, 2011 that deal with a restraining order under the FLA or the CLRA (among other " +
          "claims), and under r. 8.1(4) each party shall attend no later than 45 days after the case is " +
          "started. Under r. 8.1(8), the court may, on motion, order that any or all of subrules (4) to " +
          "(7) do not apply to a party because of urgency or hardship or for some other reason in the " +
          "interest of justice. Before a motion with notice, r. 14(11)(c) requires a party to confer or " +
          "make best efforts to confer with every other party about the issues in dispute, unless the " +
          "party is prohibited from such communication by a court order or there is a risk of domestic " +
          "violence by a party who is not represented by a licensed representative. Rule 17(3.2) sets " +
          "the same two exceptions for the duty to confer before a conference.",
        sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-18",
      },
    ],
    signals: [
      "restraining order against my ex",
      "family court order to keep my former partner away from me and the kids",
      "I fear for my safety from my ex",
      "order so my ex can't contact me",
      "want my ex to stay away from my home",
      "protect my children from my former partner",
      "no contact order against my spouse",
      "stop my ex from coming near my work",
      "urgent order to keep my ex away",
      "afraid of my ex-husband",
      "afraid of my ex-wife",
      "ex partner won't stop contacting me",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Family Law Act, R.S.O. 1990, c. F.3",
        officialUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 1(1), 46, 47.1, 47.2(3), 47.4",
      },
      {
        sourceName: "Children's Law Reform Act, R.S.O. 1990, c. C.12",
        officialUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 18(5), 28(1)(c), 33.1(5), 33.3, 35",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "rr. 8.1, 14(4), (4.2), (6), (9), (11)(c), (12)-(15), 17(3.2), 25(11)-(11.2)",
      },
    ],
    reviewedAt: "2026-09-30",
    status: "reviewed",
  },
  {
    id: "family-matter-spousal-support",
    name: "Spousal support (support for a married or common-law partner after separation)",
    broughtBy:
      "Usually a spouse or former spouse, married or unmarried, asking the court to order the other " +
      "to pay support for them. Under s. 29 of the Family Law Act, unmarried partners count as " +
      "spouses for support only if they have cohabited continuously for not less than three years, " +
      "or in a relationship of some permanence if they are the parents of a child as set out in s. 4 " +
      "of the Children's Law Reform Act. On the divorce path, either or both married spouses apply. Under " +
      "the Family Law Act, certain social assistance agencies can also apply. Not a claim for " +
      "support for a child (that is child support).",
    courtArea: "family",
    plaintiffElements: [
      {
        id: "who-is-spouse-spousalsupport",
        name: "Who counts as a \"spouse\" for support (including unmarried partners)",
        plainExplanation:
          "This part of the checklist is about whether the two people are \"spouses\" under the law that " +
          "applies. Under s. 1(1) of the Family Law Act, \"spouse\" means either of two persons who are " +
          "married to each other, or who have together entered into a marriage that is voidable or " +
          "void, in good faith on the part of the person relying on this to assert a right. For " +
          "support, s. 29 adds either of two persons who are not married to each other and have " +
          "cohabited (a) continuously for a period of not less than three years, or (b) in a " +
          "relationship of some permanence, if they are the parents of a child as set out in s. 4 of " +
          "the Children's Law Reform Act. Under s. 1(1), \"cohabit\" means to live together in a conjugal " +
          "relationship, whether within or outside marriage. The Divorce Act applies to married spouses " +
          "in a divorce; under s. 2(1) of that Act, \"spouse\" includes a former spouse in ss. 15.1 to " +
          "16.96 and some other provisions.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
        alsoCites: [
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
            pinpoint: "Divorce Act, s. 2(1) (\"spouse\")",
          },
        ],
        evidenceCategories: [
          {
            name: "Marriage records, if married",
            why: "Shows the parties were married to each other.",
            examples: ["Marriage certificate", "Divorce application or order, if one exists"],
          },
          {
            name: "Living together, if not married",
            why:
              "Section 29 turns on continuous cohabitation for at least three years, or a relationship of " +
              "some permanence where the two are parents of a child.",
            examples: [
              "Leases or mortgage in both names",
              "Mail, bills or ID at the shared address over time",
              "Joint bank accounts or tax returns listing a common-law partner",
              "Child's birth certificate naming both parents",
            ],
          },
          {
            name: "When the relationship started and ended",
            why: "Dates frame how long the parties cohabited.",
            examples: [
              "Move-in and move-out records",
              "Messages or documents showing the date of separation",
            ],
          },
        ],
      },
      {
        id: "obligation-spousalsupport",
        name:
          "The obligation of spouses to support each other, and who can apply (Family Law Act)",
        plainExplanation:
          "Under s. 30 of the Family Law Act, every spouse has an obligation to provide support for " +
          "themself and for the other spouse, in accordance with need, to the extent they are capable " +
          "of doing so. Under s. 33(1), a court may, on application, order a person to provide support " +
          "for their dependants and determine the amount. Under s. 33(2), the application may be made " +
          "by the dependant, and under s. 33(3), one of the listed public agencies may also apply if it " +
          "is providing or has provided a listed benefit, assistance or income support for the " +
          "dependant's support, or if an application for one has been made to it by or on behalf of the " +
          "dependant. Under s. 33(10), the obligation to provide support for a spouse exists without " +
          "regard to the conduct of either spouse, but in determining the amount the court may have " +
          "regard to a course of conduct \"so unconscionable as to constitute an obvious and gross " +
          "repudiation of the relationship\".",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
        evidenceCategories: [
          {
            name: "Each person's financial situation",
            why: "Section 30 refers to need and to each spouse's capacity to provide support.",
            examples: [
              "Financial statement (Form 13 or 13.1)",
              "Recent pay stubs and tax returns",
              "Monthly budget and list of debts",
            ],
          },
        ],
      },
      {
        id: "purposes-and-factors-fla-spousalsupport",
        name: "What an order should do, and what the court considers (Family Law Act)",
        plainExplanation:
          "Under s. 33(8) of the Family Law Act, an order for the support of a spouse should (a) " +
          "recognize the spouse's contribution to the relationship and the economic consequences of the " +
          "relationship for the spouse; (b) share the economic burden of child support equitably; (c) " +
          "make fair provision to assist the spouse to become able to contribute to their own support; " +
          "and (d) relieve financial hardship, if this has not been done by orders under Parts I " +
          "(Family Property) and II (Matrimonial Home). Under s. 33(9), in determining the amount and " +
          "duration, if any, of support for a spouse in relation to need, the court shall consider all " +
          "the circumstances of the parties, including: current assets and means, and those they are " +
          "likely to have in the future; the dependant's capacity to contribute to their own support " +
          "and the respondent's capacity to provide support; their ages and physical and mental health; " +
          "the dependant's needs, having regard to the accustomed standard of living while the parties " +
          "resided together; the measures available for the dependant to become self-supporting and the " +
          "time and cost involved; any legal obligation of either to support another person; the " +
          "desirability of either remaining at home to care for a child; a contribution by the " +
          "dependant to the realization of the respondent's career potential; and any other legal right " +
          "of the dependant to support, other than out of public money. Where the dependant is a " +
          "spouse, s. 33(9)(l) adds the length of time they cohabited; the effect on the spouse's " +
          "earning capacity of responsibilities assumed during cohabitation; whether the spouse has " +
          "undertaken the care of, or to assist in continuing a program of education for, a child " +
          "eighteen or over who is unable by reason of illness, disability or other cause to withdraw " +
          "from the charge of the parents; housekeeping, child care or other domestic service performed " +
          "for the family, treated as if the time were spent in paid employment contributing to the " +
          "family's support; and the effect on the spouse's earnings and career development of caring " +
          "for a child.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
        evidenceCategories: [
          {
            name: "The history of the relationship",
            why:
              "Section 33(9)(l) refers to the length of cohabitation and the roles each person took on.",
            examples: [
              "Timeline of the relationship with key dates",
              "Records of who cared for children or the home",
              "Records of moves, career changes or time out of the workforce",
            ],
          },
          {
            name: "Present and future means",
            why: "Section 33(9)(a)-(d) refer to each party's assets, means and capacity.",
            examples: [
              "Financial statements",
              "Tax returns and pay records",
              "Education, training or job-search records and their costs",
            ],
          },
          {
            name: "Health and other obligations",
            why:
              "Section 33(9)(e) and (h) refer to age and health, and to other support obligations.",
            examples: [
              "Medical documentation, if health is relevant",
              "Other support orders or agreements",
            ],
          },
        ],
      },
      {
        id: "divorce-act-order-spousalsupport",
        name: "Spousal support on the divorce path (Divorce Act)",
        plainExplanation:
          "For married spouses in a divorce, s. 15.2(1) of the Divorce Act says a court may, on " +
          "application by either or both spouses, make an order requiring a spouse to secure or pay (or " +
          "both) such lump sum or periodic sums, or both, as the court thinks reasonable for the " +
          "support of the other spouse. Under s. 15.2(3), the order may be for a definite or indefinite " +
          "period or until a specified event occurs. Under s. 15.2(4), the court shall take into " +
          "consideration the condition, means, needs and other circumstances of each spouse, including " +
          "(a) the length of time the spouses cohabited, (b) the functions performed by each spouse " +
          "during cohabitation, and (c) any order, agreement or arrangement relating to support of " +
          "either spouse. Under s. 15.2(5), the court shall not take into consideration any misconduct " +
          "of a spouse in relation to the marriage. Under s. 15.2(6), the order should (a) recognize " +
          "any economic advantages or disadvantages to the spouses arising from the marriage or its " +
          "breakdown, (b) apportion between the spouses any financial consequences arising from the " +
          "care of any child of the marriage over and above any child support obligation, (c) relieve " +
          "any economic hardship of the spouses arising from the breakdown of the marriage, and (d) in " +
          "so far as practicable, promote the economic self-sufficiency of each spouse within a " +
          "reasonable period of time. Under s. 15.3(1), where a court is considering both a child " +
          "support application and a spousal support application, it shall give priority to child " +
          "support.",
        sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Roles during the marriage",
            why:
              "Section 15.2(4)(b) refers to the functions each spouse performed during cohabitation.",
            examples: [
              "Records of who earned income and who cared for children or the home",
              "Employment history for each spouse",
            ],
          },
          {
            name: "Existing orders or agreements about support",
            why:
              "Section 15.2(4)(c) refers to any order, agreement or arrangement relating to support.",
            examples: [
              "Separation agreement or marriage contract",
              "Any earlier court order",
              "Records of voluntary payments since separation",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "domestic-contract-waiver-spousalsupport",
        name: "A domestic contract that sets or waives support",
        plainExplanation:
          "Under s. 51 of the Family Law Act, a \"domestic contract\" means a marriage contract, " +
          "separation agreement, cohabitation agreement, paternity agreement or family arbitration " +
          "agreement. Under s. 33(4), the court may set aside a provision for support or a waiver of " +
          "the right to support in a domestic contract, and may determine and order support in an " +
          "application under s. 33(1), even though the contract contains an express provision excluding " +
          "the application of s. 33: (a) if the provision for support or the waiver results in " +
          "unconscionable circumstances; (b) if the provision for support is in favour of, or the " +
          "waiver is by or on behalf of, a dependant who qualifies for an allowance for support out of " +
          "public money; or (c) if there is default in the payment of support under the contract at the " +
          "time the application is made. On the divorce path, s. 15.2(4)(c) of the Divorce Act lists " +
          "\"any order, agreement or arrangement relating to support of either spouse\" among the " +
          "circumstances the court shall take into consideration.",
        whenThisComesUp:
          "When the parties signed a marriage contract, cohabitation agreement or separation agreement " +
          "that sets an amount of support or says neither will claim support.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
        alsoCites: [
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
            pinpoint: "s. 15.2(4)(c)",
          },
        ],
      },
      {
        id: "variation-spousalsupport",
        name: "Changing (varying) an existing spousal support order",
        plainExplanation:
          "Under s. 37(1) of the Family Law Act, an application to vary an order made or confirmed " +
          "under Part III may be made by a dependant or respondent named in the order, a parent of that " +
          "dependant, the personal representative of that respondent, or an agency referred to in s. " +
          "33(3). Under s. 37(2), for an order for support of a spouse, if the court is satisfied that " +
          "there has been a material change in the dependant's or respondent's circumstances, or that " +
          "evidence not available on the previous hearing has become available, the court may " +
          "discharge, vary or suspend a term of the order, prospectively or retroactively, relieve the " +
          "respondent from paying part or all of the arrears or interest, and make any other order " +
          "under s. 34 it considers appropriate. Under s. 37(3), no application for variation shall be " +
          "made within six months after the order or the disposition of another variation application " +
          "for the same order, except by leave of the court. On the divorce path, s. 17(1)(a) of the " +
          "Divorce Act lets a court vary, rescind or suspend a support order, retroactively or " +
          "prospectively, on application by either or both former spouses. Under s. 17(4.1), before " +
          "varying a spousal support order the court shall satisfy itself that a change in the " +
          "condition, means, needs or other circumstances of either former spouse has occurred since " +
          "the order or the last variation order, and shall take that change into consideration. Under " +
          "s. 17(7), a variation order should (a) recognize any economic advantages or disadvantages to " +
          "the former spouses arising from the marriage or its breakdown, (b) apportion between them " +
          "any financial consequences arising from the care of any child of the marriage over and above " +
          "any child support obligation, (c) relieve any economic hardship of the former spouses " +
          "arising from the breakdown of the marriage, and (d) in so far as practicable, promote the " +
          "economic self-sufficiency of each former spouse within a reasonable period of time. Under s. " +
          "17(10), where a spousal support order is for a definite period or until a specified event, a " +
          "court may not, on an application started after that period ends or that event occurs, make a " +
          "variation order to resume that support unless it is satisfied of the two matters in s. " +
          "17(10)(a) and (b).",
        whenThisComesUp:
          "When there is already a spousal support order and either person wants it changed, suspended, " +
          "ended or resumed, or wants relief from arrears.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
        alsoCites: [
          {
            sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
            pinpoint: "s. 17(1)(a); s. 17(10); s. 17(4.1); s. 17(7)",
          },
        ],
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Financial disclosure under r. 13 of the Family Law Rules. Under r. 13(1), if an application, " +
          "answer or motion contains a claim for support, the party making the claim shall serve and " +
          "file a financial statement (Form 13 or 13.1) with the document that contains the claim, and " +
          "the party against whom the claim is made shall serve and file one within the time for " +
          "serving and filing an answer, reply, affidavit or other responding document, whether or not " +
          "they serve one. Under r. 13(1.1), a support claim with no property claim and no claim for " +
          "exclusive possession of the matrimonial home uses Form 13; under r. 13(1.2), if there is a " +
          "property claim or a claim for exclusive possession, Form 13.1 is used, whether or not " +
          "support is also claimed. Under r. 13(3.1), unless the court orders otherwise, a party who " +
          "must serve and file a financial statement for a support claim shall also serve the income " +
          "and financial information in s. 21(1) of the child support guidelines and, if they became " +
          "unemployed within the last three years, a complete copy of their Record of Employment (or " +
          "other evidence of termination) and a statement of any benefits or income still owed by the " +
          "former employer. Under r. 13(3.2), that information is served with the financial statement " +
          "if there is no property claim, or with the documents required under r. 13(3.3) or (3.4) if " +
          "there is one; under r. 13(3.2.1) it must also be given to the other party before any case " +
          "conference unless already served.",
        sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-09-18",
      },
      {
        note:
          "Limitation period for Family Law Act support claims. Section 50 of the Family Law Act now " +
          "reads only \"Repealed: 2002, c. 24, Sched. B, s. 25.\" Under s. 16(1)(c) of the Limitations " +
          "Act, 2002, there is no limitation period in respect of a proceeding to obtain support under " +
          "the Family Law Act, or to enforce a provision for support or maintenance contained in a " +
          "contract or agreement that could be filed under s. 35 of that Act. Under s. 33(2.1) of the " +
          "Family Law Act, the Limitations Act, 2002 applies to an application made by the dependant's " +
          "parent or by an agency referred to in s. 33(3) as if it were made by the dependant. This " +
          "note does not address Divorce Act claims; the passages read from that Act do not set a " +
          "limitation period for a spousal support application (s. 17(10), covered under variation, is " +
          "a separate rule about resuming time-limited support).",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
            pinpoint: "s. 33(2.1); s. 50",
          },
        ],
      },
      {
        note:
          "Enforcement through the Family Responsibility Office (the same Act covers spousal and child " +
          "support orders). Under s. 1(1) of the Family Responsibility and Support Arrears Enforcement " +
          "Act, 1996, the \"Director\" is the Director of the Family Responsibility Office, and a " +
          "\"support order\" is a provision in an order made in or outside Ontario and enforceable in " +
          "Ontario for the payment of money as support or maintenance. Under s. 5(1), it is the duty of " +
          "the Director to enforce support orders where the support order and the related support " +
          "deduction order, if any, are filed in the Director's office, and to pay the amounts " +
          "collected to the person they are owed to. Under s. 10(1), an Ontario court that makes a " +
          "support order shall also make a support deduction order, and under s. 10(4) it must do so " +
          "even if the court cannot identify an income source for the payor at that time. Under s. " +
          "12(1), the clerk or registrar of the court that makes a support order shall file it with the " +
          "Director's office promptly after it is signed. Under s. 22(1), an income source (for " +
          "example, an employer paying wages, as listed in the s. 1(1) definition) that receives notice " +
          "of a support deduction order shall, subject to s. 23, deduct the support owed (or the other " +
          "amount set out in the notice) from the money it owes the payor and pay it to the Director. " +
          "Under s. 16(1), a filed support order or support deduction order may be withdrawn at any " +
          "time, in the way s. 16(1.1) describes, unless the support order says it cannot be withdrawn; " +
          "under s. 16(3), the Director stops enforcing an order once it is withdrawn. Section 10(5) " +
          "says a support deduction order shall not be made in respect of a provisional order. Under s. " +
          "16(2), a support order and related support deduction order that have been assigned to an " +
          "agency referred to in s. 14(1) may not be withdrawn except by the agency or with the " +
          "agency's consent, so long as the orders are under assignment. Under s. 16(5), a support " +
          "order cannot be withdrawn unless the related support deduction order, if any, is also " +
          "withdrawn, and a support deduction order cannot be withdrawn unless the related support " +
          "order, if any, is also withdrawn. Under s. 16(4), if there are arrears owing to an agency " +
          "referred to in s. 14(1) from a past assignment, the Director may continue to enforce the " +
          "support order and related support deduction order, if any, to collect the arrears owed to " +
          "the agency, even if the payor and recipient have withdrawn the orders.",
        sourceUrl: "https://www.ontario.ca/laws/docs/96f31_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-05-01",
      },
    ],
    signals: [
      "can I get spousal support after we separated",
      "we lived common-law for years do I get support",
      "ex husband won't pay spousal support",
      "ex wife asking me for spousal support",
      "I gave up my career to raise the kids and now we split",
      "stayed home for years and now I have no income",
      "partner left and I can't support myself",
      "we signed a cohabitation agreement waiving support",
      "separation agreement says no support is it final",
      "my ex's income went up can I get more support",
      "I lost my job and can't keep paying support",
      "want to end the support I pay my ex",
      "alimony after divorce",
      "how long do support payments last after divorce",
      "is there a deadline to ask for support",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Family Law Act, R.S.O. 1990, c. F.3",
        officialUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 1(1), 29, 30, 33(1)-(4), 33(8)-(10), 37, 50, 51",
      },
      {
        sourceName: "Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.)",
        officialUrl: "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 2(1), 15.2, 15.3(1), 17(1), 17(4.1), 17(7), 17(10)",
      },
      {
        sourceName: "Family Law Rules, O. Reg. 114/99",
        officialUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "r. 13",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "s. 16(1)(c)",
      },
      {
        sourceName: "Family Responsibility and Support Arrears Enforcement Act, 1996, S.O. 1996, c. 31",
        officialUrl: "https://www.ontario.ca/laws/docs/96f31_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 1(1), 5(1), 10, 12(1), 16, 22(1)",
      },
    ],
    reviewedAt: "2026-09-30",
    status: "reviewed",
  },
];

/**
 * The first library above, then every batch written after it
 * (moreClaimTypes/, 2026-10-07: the owner's direction to cover hundreds of
 * case types, each sourced and checked by test:catalogue-verified).
 */
export const FAMILY_MATTER_TYPES: ClaimType[] = [...CORE_FAMILY_MATTER_TYPES, ...MORE_FAMILY_TYPES];
