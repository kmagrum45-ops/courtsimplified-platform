/**
 * Case types, batch "sc-family-adjacent-1" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-family-adjacent-1.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-gift-or-loan-between-former-partners -- Money between former partners: a gift or a loan
 *   sc-claim-engagement-ring-and-wedding-gifts -- An engagement ring or wedding gifts
 *   sc-claim-pet-ownership-on-breakup -- Who keeps the pet after a breakup
 *   sc-claim-return-of-belongings-after-breakup -- Getting belongings back after a breakup
 *   sc-claim-jointly-bought-items-on-breakup -- Things bought together during a relationship
 *
 * Every legal statement below rests on text saved in this repository: the
 * vendored corpus (docs/sources/corpus/, url from manifest.json) or a Supreme
 * Court decision saved under docs/sources/ (read from its English text in
 * docs/sources/decisions/). Notes on what was left out, and why:
 *   - sc-claim-pet-ownership-on-breakup is NOT written. No saved text says how
 *     the law treats a pet in an ownership dispute (the Dog Owners' Liability
 *     Act and the Pounds Act speak of an animal's "owner" only for liability
 *     and impounding). Writing it would mean stating law from memory.
 *   - The engagement-ring type covers gifts between the two people who meant
 *     to marry (Marriage Act, s. 33 speaks of a gift "to another in
 *     contemplation of or conditional upon their marriage to each other").
 *     No saved text speaks to wedding gifts from guests, so nothing is said
 *     about them.
 *   - Schedule item 3 to s. 21.8 of the Courts of Justice Act sends resulting
 *     trust and unjust enrichment claims "between persons who have cohabited"
 *     to the Family Court where it sits. Each type built on those doctrines
 *     carries that as a procedural note rather than assuming Small Claims.
 *   - Pecore's para. 41 says "strong evidence"; that wording trips the
 *     case-grading check and is not used.
 */

import type { ClaimType } from "../claimTypes";

const VERIFIED = "2026-10-07";

const SCJ_STEPS =
  "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/";
const SC_GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim";
const SC_AFTER_JUDGMENT = "https://www.ontario.ca/document/guide-procedures-small-claims-court/after-judgment";
const SC_RULES = "https://www.ontario.ca/laws/docs/980258_e.doc";
const SC_RULES_CONSOLIDATION = "2025-10-14";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_CONSOLIDATION = "2024-12-04";
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const CJA_CONSOLIDATION = "2025-12-11";
const SC_LIMIT_REG = "https://www.ontario.ca/laws/docs/000626_e.doc";
const FLA = "https://www.ontario.ca/laws/docs/90f03_e.doc";
const FLA_CONSOLIDATION = "2026-05-01";
const MARRIAGE = "https://www.ontario.ca/laws/docs/90m03_e.doc";
const MARRIAGE_CONSOLIDATION = "2025-12-11";
const KERR = "docs/sources/kerr-v-baranow-2011-SCC-10.pdf";
const PECORE = "docs/sources/pecore-v-pecore-2007-SCC-17.pdf";

// ---- Shared wording. Each entry that uses it has its own record. ----

const BURDEN =
  "The Superior Court of Justice's guide to the steps in a civil case says that in every civil " +
  "case the plaintiff has the burden of proof to establish, on a balance of probabilities, the " +
  "allegations in their claim -- evidence showing that, more likely than not, it would be " +
  "correct to rule in their favour. ";

const AMOUNT =
  "Ontario's Small Claims Court guide says the reasons for a claim should \"calculate and explain " +
  "the amount of money and any interest you are claiming\", and that a copy of the supporting " +
  "documents is attached to the claim (if they are not attached, the claim gives the reasons why). " +
  "The guide says the court can handle any action for the payment of money where the amount " +
  "claimed does not exceed $50,000, excluding interest and costs such as court fees. ";

const PROPERTY_LIMIT =
  "Ontario's Small Claims Court guide says the court can handle any action for the payment of " +
  "money or the recovery of personal property where the amount claimed does not exceed $50,000, " +
  "excluding interest and costs such as court fees, and that this includes the value of all goods " +
  "the plaintiff is asking for in total, no matter how many defendants there are. ";

const GRATUITOUS =
  "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said a presumption of a resulting " +
  "trust is the general rule that applies to gratuitous transfers (transfers made for nothing in " +
  "return). When such a transfer is made, the onus is on the person receiving it to demonstrate " +
  "that a gift was intended; otherwise, that person holds the property in trust for the person " +
  "who gave it (para. 19). In Pecore v. Pecore, 2007 SCC 17, the Court said this is so because " +
  "equity presumes bargains, not gifts (para. 24). ";

const INTENTION =
  "In Pecore v. Pecore, 2007 SCC 17, the Supreme Court of Canada said the evidence needed to " +
  "rebut the presumption is evidence of the transferor's contrary intention on the balance of " +
  "probabilities (para. 43). Both sides normally bring evidence, and the inquiry starts with the " +
  "applicable presumption and weighs all of the evidence to find, on a balance of probabilities, " +
  "the transferor's actual intention (para. 44). ";

const SPOUSES_S14 =
  "Under s. 14 of the Family Law Act, the rule of law applying a presumption of a resulting trust " +
  "is applied in questions of the ownership of property between spouses as if they were not " +
  "married, except that (a) property held in the name of spouses as joint tenants is proof, in the " +
  "absence of evidence to the contrary, that the spouses are intended to own it as joint tenants, " +
  "and (b) money on deposit in the name of both spouses is deemed to be in their names as joint " +
  "tenants for that purpose. Section 1(1) defines \"spouse\" as either of two persons who are " +
  "married to each other, or who have together entered into a marriage that is voidable or void, " +
  "in good faith on the part of the person relying on that to assert a right.";

const FAMILY_COURT_NOTE =
  "Under s. 21.8 of the Courts of Justice Act, in the parts of Ontario where the Family Court has " +
  "jurisdiction, the proceedings listed in the Schedule to that section (except appeals and " +
  "prosecutions) are commenced, heard and determined in the Family Court. The Schedule lists " +
  "proceedings under the Family Law Act (except Part V); proceedings for the interpretation, " +
  "enforcement or variation of a marriage contract, cohabitation agreement or separation " +
  "agreement; and proceedings for relief by way of constructive or resulting trust or a monetary " +
  "award as compensation for unjust enrichment between persons who have cohabited.";

const JURISDICTION_NOTE =
  "Under s. 23(1) of the Courts of Justice Act, the Small Claims Court has jurisdiction in any " +
  "action for the payment of money where the amount claimed does not exceed the prescribed amount " +
  "(exclusive of interest and costs), and in any action for the recovery of possession of personal " +
  "property where the value of the property does not exceed the prescribed amount. Under s. 1(1) " +
  "of O. Reg. 626/00, the maximum amount of a claim in the Small Claims Court is $50,000.";

const LIMITATION_NOTE =
  "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding cannot " +
  "be started after the second anniversary of the day the claim was discovered. Section 5(1) sets " +
  "out when a claim is discovered, and under s. 5(2) a person with a claim is presumed to have " +
  "known of those matters on the day the act or omission the claim is based on took place, unless " +
  "the contrary is proved.";

const LIMITATION_CITATION = {
  sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
  officialUrl: LIMITATIONS,
  verifiedAt: VERIFIED,
  pinpoint: "ss. 4 and 5(1)-(2): two years from the day the claim was discovered",
};
const CJA_CITATION = {
  sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
  officialUrl: CJA,
  verifiedAt: VERIFIED,
  pinpoint: "s. 21.8 and its Schedule (Family Court); s. 23(1) (Small Claims Court jurisdiction)",
};
const KERR_CITATION = {
  sourceName: "Kerr v. Baranow, 2011 SCC 10",
  officialUrl: KERR,
  verifiedAt: VERIFIED,
  pinpoint: "paras. 17-19 (gratuitous transfers between partners) and 32-41 (unjust enrichment)",
};
const PECORE_CITATION = {
  sourceName: "Pecore v. Pecore, 2007 SCC 17",
  officialUrl: PECORE,
  verifiedAt: VERIFIED,
  pinpoint: "paras. 24-25 and 43-44: the presumption of resulting trust and how it is rebutted",
};
const FLA_CITATION = {
  sourceName: "Family Law Act, R.S.O. 1990, c. F.3",
  officialUrl: FLA,
  verifiedAt: VERIFIED,
  pinpoint: "ss. 1(1), 10(1) and 14: property questions between spouses",
};
const MARRIAGE_CITATION = {
  sourceName: "Marriage Act, R.S.O. 1990, c. M.3",
  officialUrl: MARRIAGE,
  verifiedAt: VERIFIED,
  pinpoint: "s. 32(1) (no action for breach of a promise to marry) and s. 33 (recovery of gifts made in contemplation of marriage)",
};
const SC_GUIDE_CITATION = {
  sourceName: "Ontario.ca -- Guide to Procedures in Small Claims Court: Making a Claim",
  officialUrl: SC_GUIDE,
  verifiedAt: VERIFIED,
  pinpoint: "Types of claims dealt with in Small Claims Court: the $50,000 limit",
};

export const TYPES_SC_FAMILY_ADJACENT_1: ClaimType[] = [
  // ------------------------------------------------------------------
  {
    id: "sc-claim-gift-or-loan-between-former-partners",
    name: "Money between former partners: a gift or a loan",
    broughtBy:
      "A person who gave money to a partner during a relationship, says it was a loan or was not " +
      "meant as a gift, and wants it back from the former partner after the relationship ended.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "money-went-to-partner-loan",
        name: "The money went from one partner to the other",
        plainExplanation:
          "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said resulting trusts " +
          "arising from gratuitous transfers are the ones relevant to domestic situations, one of " +
          "them being the gratuitous transfer of property from one partner to the other (para. 17). " +
          GRATUITOUS +
          "This part of the checklist is about each amount that was given, when, and how.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: PECORE, pinpoint: "Pecore v. Pecore, 2007 SCC 17, para. 24" }],
        evidenceCategories: [
          {
            name: "Proof of each payment",
            why: "Shows the money left one partner and reached the other.",
            examples: ["Bank statements", "E-transfer confirmations", "Cheques or receipts"],
          },
          {
            name: "What the money was for",
            why: "Records what the money paid for and who it benefited.",
            examples: ["Bills or invoices the money paid", "Messages asking for the money"],
          },
        ],
      },
      {
        id: "what-was-meant-loan",
        name: "What the person who gave the money meant at the time",
        plainExplanation:
          BURDEN +
          INTENTION +
          "This part of the checklist is about anything said or written about paying the money back.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: PECORE, pinpoint: "Pecore v. Pecore, 2007 SCC 17, paras. 43-44" }],
        evidenceCategories: [
          {
            name: "Words about repaying",
            why: "Shows what was said about the money being paid back.",
            examples: ["Texts or emails mentioning repayment", "A written note or IOU", "A witness to the conversation"],
          },
          {
            name: "Any repayments made",
            why: "Shows how both people treated the money afterwards.",
            examples: ["Partial repayments in bank records", "A list of amounts repaid, with dates"],
          },
        ],
      },
      {
        id: "amount-owing-loan",
        name: "The amount given, and what is still owed",
        plainExplanation:
          AMOUNT + "This part of the checklist is about the total given and anything paid back.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "A running total",
            why: "Shows how the amount claimed was worked out.",
            examples: ["A list of each amount given, with dates", "Records of anything repaid"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "partner-says-gift-loan",
        name: "The former partner says the money was a gift",
        plainExplanation:
          "In Pecore v. Pecore, 2007 SCC 17, the Supreme Court of Canada said that where a transfer " +
          "is made for no consideration, the onus is placed on the transferee to demonstrate that a " +
          "gift was intended (para. 24), and that the presumption of resulting trust alters the " +
          "general practice that a plaintiff bears the legal burden in a civil case: the onus is on " +
          "the transferee to rebut it (para. 25). " +
          INTENTION,
        whenThisComesUp:
          "When the former partner's Defence says the money was given freely, as a gift, with no " +
          "expectation of repayment.",
        sourceUrl: PECORE,
        verifiedAt: VERIFIED,
      },
      {
        id: "partners-were-married-loan",
        name: "The two people were married to each other",
        plainExplanation: SPOUSES_S14,
        whenThisComesUp:
          "When the two people were married, or when the money was in a bank account in both names.",
        sourceUrl: FLA,
        verifiedAt: VERIFIED,
        consolidationPeriod: FLA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs", "sc-remedy-outside-jurisdiction"],
    proceduralNotes: [
      { note: FAMILY_COURT_NOTE, sourceUrl: CJA, verifiedAt: VERIFIED, consolidationPeriod: CJA_CONSOLIDATION },
      {
        note: JURISDICTION_NOTE,
        sourceUrl: CJA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CJA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: SC_LIMIT_REG, pinpoint: "O. Reg. 626/00, s. 1(1)" }],
      },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: VERIFIED, consolidationPeriod: LIMITATIONS_CONSOLIDATION },
    ],
    signals: [
      "lent money to my ex",
      "loaned my ex money",
      "my ex says it was a gift",
      "ex boyfriend owes me money",
      "ex girlfriend owes me money",
      "ex partner owes me money",
      "paid for my partner while we were together",
      "gave my ex money during the relationship",
      "ex won't pay back the money",
      "money i gave my ex",
      "gave my ex boyfriend money",
      "gave my ex girlfriend money",
      "now says it was a gift",
      "money while we were together",
    ],
    typicalDefendantProfile: "individual",
    citations: [KERR_CITATION, PECORE_CITATION, CJA_CITATION, LIMITATION_CITATION],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-engagement-ring-and-wedding-gifts",
    name: "An engagement ring or wedding gifts",
    broughtBy:
      "A person who gave a gift, such as an engagement ring, to the person they planned to marry, " +
      "and wants it or its value back now that the marriage is not going ahead.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "gift-made-for-the-marriage-ring",
        name: "The gift was given because of the planned marriage",
        plainExplanation:
          "Section 33 of the Marriage Act deals with a gift one person makes to another \"in " +
          "contemplation of or conditional upon their marriage to each other\" where the marriage " +
          "fails to take place or is abandoned. This part of the checklist is about what was given, " +
          "when, and how it was connected to the planned marriage.",
        sourceUrl: MARRIAGE,
        verifiedAt: VERIFIED,
        consolidationPeriod: MARRIAGE_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The gift itself",
            why: "Identifies what was given and what it was worth.",
            examples: ["Receipt or appraisal for the ring", "Photos of the gift", "Credit card or bank statement for the purchase"],
          },
          {
            name: "The link to the wedding",
            why: "Shows the gift was given because of the engagement.",
            examples: ["Engagement photos or announcement", "Messages about the proposal", "Wedding bookings or invitations"],
          },
        ],
      },
      {
        id: "marriage-called-off-ring",
        name: "The marriage did not take place or was called off",
        plainExplanation:
          "Under s. 33 of the Marriage Act, where the marriage fails to take place or is abandoned, " +
          "the question of whether or not the failure or abandonment was caused by or was the fault " +
          "of the person who gave the gift is not considered in deciding that person's right to " +
          "recover it. This part of the checklist is about when and how the engagement ended.",
        sourceUrl: MARRIAGE,
        verifiedAt: VERIFIED,
        consolidationPeriod: MARRIAGE_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The end of the engagement",
            why: "Shows the marriage did not go ahead, and when.",
            examples: ["Messages ending the engagement", "Cancelled venue or vendor bookings"],
          },
          {
            name: "Requests to return the gift",
            why: "Records that the gift was asked for back.",
            examples: ["Messages or a letter asking for the ring back", "Any reply"],
          },
        ],
      },
      {
        id: "gift-value-ring",
        name: "What is being asked for: the gift itself or its value",
        plainExplanation:
          PROPERTY_LIMIT +
          "This part of the checklist is about whether the gift itself is being asked for, or its " +
          "value in money, and how that value was worked out.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Value of the gift",
            why: "Shows the amount claimed or the value of the item asked for.",
            examples: ["Purchase receipt", "Jeweller's appraisal", "Insurance listing for the item"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "not-given-for-marriage-ring",
        name: "The person who received it says it was not given because of the marriage",
        plainExplanation:
          "Section 33 of the Marriage Act speaks of a gift made by one person to another \"in " +
          "contemplation of or conditional upon their marriage to each other\". " +
          BURDEN.trim(),
        whenThisComesUp:
          "When the Defence says the item was an ordinary gift -- for a birthday or a holiday, for " +
          "example -- and not one connected to the planned marriage.",
        sourceUrl: MARRIAGE,
        verifiedAt: VERIFIED,
        consolidationPeriod: MARRIAGE_CONSOLIDATION,
        alsoCites: [{ sourceUrl: SCJ_STEPS, pinpoint: "Steps to a civil case: the trial (burden of proof)" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-return-of-property", "sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 32(1) of the Marriage Act, no action can be brought for a breach of a promise to " +
          "marry or for any damages resulting from it. A claim to recover a gift under s. 33 is a " +
          "different thing from a claim for the broken promise.",
        sourceUrl: MARRIAGE,
        verifiedAt: VERIFIED,
        consolidationPeriod: MARRIAGE_CONSOLIDATION,
      },
      {
        note: JURISDICTION_NOTE,
        sourceUrl: CJA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CJA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: SC_LIMIT_REG, pinpoint: "O. Reg. 626/00, s. 1(1)" }],
      },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: VERIFIED, consolidationPeriod: LIMITATIONS_CONSOLIDATION },
    ],
    signals: [
      "engagement ring",
      "wants the engagement ring back",
      "broke off the engagement",
      "called off the engagement",
      "called off the wedding",
      "wedding was cancelled",
      "engagement ended",
      "kept the engagement ring",
      "fiance kept the ring",
      "fiancee kept the ring",
    ],
    typicalDefendantProfile: "individual",
    citations: [MARRIAGE_CITATION, CJA_CITATION, SC_GUIDE_CITATION, LIMITATION_CITATION],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-return-of-belongings-after-breakup",
    name: "Getting belongings back after a breakup",
    broughtBy:
      "A person whose own belongings are still with a former partner after the relationship ended, " +
      "and the former partner will not return them.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "items-belong-to-claimant-belongings",
        name: "The items belong to the person asking for them",
        plainExplanation:
          "Ontario's Small Claims Court guide on what happens after judgment says that when a " +
          "person has personal property that does not belong to them and refuses to return it to " +
          "the rightful owner, the owner can request a court order for a writ of delivery. The " +
          "guide says the owner gives the court a full description of the property (serial " +
          "numbers, make, model, photographs if available), the exact location where the items can " +
          "be found, and proof of ownership, where applicable. This part of the checklist is about " +
          "each item and how it came to belong to the person asking for it.",
        sourceUrl: SC_AFTER_JUDGMENT,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Proof of ownership",
            why: "Shows each item belongs to the person asking for it.",
            examples: ["Receipts or bank statements for the purchase", "Warranty or registration in their name", "Photos of the item from before the relationship"],
          },
          {
            name: "A description of each item",
            why: "Lets each item be identified exactly.",
            examples: ["A list with make, model and serial numbers", "Photos of the items"],
          },
        ],
      },
      {
        id: "partner-has-and-refuses-belongings",
        name: "The former partner has the items and has not returned them",
        plainExplanation:
          "Under rule 20.05(1) of the Rules of the Small Claims Court, an order for the delivery of " +
          "personal property may be enforced by a writ of delivery (Form 20B), on the request of the " +
          "person the order favours, supported by an affidavit stating that the property has not " +
          "been delivered. The Small Claims Court guide says the affidavit describes the exact " +
          "details of the property and where it can be located. This part of the checklist is about " +
          "where the items are and the requests made for them.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: SC_AFTER_JUDGMENT, pinpoint: "After judgment > Writ of delivery" }],
        evidenceCategories: [
          {
            name: "Where the items are",
            why: "Shows the former partner has the items, and where.",
            examples: ["Messages mentioning the items", "Photos showing the items at their home"],
          },
          {
            name: "Requests to get them back",
            why: "Records that the items were asked for and not returned.",
            examples: ["Messages or a letter asking for the items", "Any reply or refusal", "Arrangements to pick up that fell through"],
          },
        ],
      },
      {
        id: "value-of-items-belongings",
        name: "The value of the items",
        plainExplanation:
          PROPERTY_LIMIT + "This part of the checklist is about what each item is worth.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Value of each item",
            why: "Shows the total value of what is being asked for.",
            examples: ["Receipts", "Current prices for similar items", "An appraisal for anything valuable"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "partner-says-gift-belongings",
        name: "The former partner says an item was given to them as a gift",
        plainExplanation: GRATUITOUS + INTENTION,
        whenThisComesUp:
          "When the Defence says one or more of the items was given to the former partner as a " +
          "present during the relationship.",
        sourceUrl: PECORE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: KERR, pinpoint: "Kerr v. Baranow, 2011 SCC 10, para. 19" }],
      },
      {
        id: "partners-were-married-belongings",
        name: "The two people were married to each other",
        plainExplanation:
          "Under s. 10(1) of the Family Law Act, a person may apply to the court for the " +
          "determination of a question between that person and their spouse or former spouse as to " +
          "the ownership or right to possession of particular property (other than a question " +
          "arising out of an equalization of net family properties under s. 5), and the court may " +
          "declare the ownership or right to possession, among other orders. Section 1(1) defines " +
          "\"court\" for that Act as the Ontario Court of Justice, the Family Court of the Superior " +
          "Court of Justice or the Superior Court of Justice, and defines \"spouse\" as either of " +
          "two persons who are married to each other (or who entered into a void or voidable " +
          "marriage in good faith).",
        whenThisComesUp: "When the two people were married to each other.",
        sourceUrl: FLA,
        verifiedAt: VERIFIED,
        consolidationPeriod: FLA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-return-of-property", "sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: JURISDICTION_NOTE,
        sourceUrl: CJA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CJA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: SC_LIMIT_REG, pinpoint: "O. Reg. 626/00, s. 1(1)" }],
      },
      { note: FAMILY_COURT_NOTE, sourceUrl: CJA, verifiedAt: VERIFIED, consolidationPeriod: CJA_CONSOLIDATION },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: VERIFIED, consolidationPeriod: LIMITATIONS_CONSOLIDATION },
    ],
    signals: [
      "ex has my belongings",
      "ex won't return my belongings",
      "ex kept my stuff after we broke up",
      "left my things at my ex's place",
      "ex boyfriend has my things",
      "ex girlfriend has my things",
      "after the breakup she kept my",
      "after the breakup he kept my",
      "can't get my belongings back from my ex",
    ],
    typicalDefendantProfile: "individual",
    citations: [CJA_CITATION, PECORE_CITATION, FLA_CITATION, LIMITATION_CITATION],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-jointly-bought-items-on-breakup",
    name: "Things bought together during a relationship",
    broughtBy:
      "A person who paid toward something bought during a relationship -- furniture, a car, " +
      "appliances -- that the former partner kept after the breakup.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "contributed-to-purchase-joint",
        name: "Both people paid toward the item, but the other one has it",
        plainExplanation:
          "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said one of the two " +
          "situations in which resulting trusts from gratuitous transfers arose in domestic cases is " +
          "the joint contribution by two partners to the acquisition of property, title to which is " +
          "in the name of only one of them; the contribution is gratuitous because there was no " +
          "consideration for it (para. 17). " +
          GRATUITOUS +
          "This part of the checklist is about what was bought, who paid what, and whose name it is in.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: PECORE, pinpoint: "Pecore v. Pecore, 2007 SCC 17, para. 24" }],
        evidenceCategories: [
          {
            name: "Who paid what",
            why: "Shows each person's share of the price.",
            examples: ["Receipts and bank or card statements", "E-transfers between the two of you for the purchase", "Financing or payment-plan records"],
          },
          {
            name: "Whose name it is in",
            why: "Shows who holds title to the item.",
            examples: ["Vehicle ownership or registration", "Store receipt or delivery record showing the buyer's name"],
          },
        ],
      },
      {
        id: "partner-enriched-joint",
        name: "The former partner kept a benefit that matches what was lost",
        plainExplanation:
          "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said the law permits " +
          "recovery for unjust enrichment whenever the plaintiff can establish three elements: an " +
          "enrichment of or benefit to the defendant, a corresponding deprivation of the plaintiff, " +
          "and the absence of a juristic reason for the enrichment (para. 32). The benefit must be " +
          "tangible, and one that can be restored to the plaintiff in specie or by money (para. 38); " +
          "the enrichment must correspond to a deprivation the plaintiff has suffered (para. 39); " +
          "and the third element means there is no reason in law or justice for the defendant's " +
          "retention of the benefit (para. 40). This part of the checklist is about what the former " +
          "partner kept and what the person asking lost.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "What was kept",
            why: "Shows the former partner has the item or got its value.",
            examples: ["Messages about who keeps what", "Proof the item was sold and who got the money"],
          },
          {
            name: "Why it was not a gift",
            why: "Bears on whether there was a reason for the former partner to keep it.",
            examples: ["Messages about splitting the cost", "Any agreement about dividing things on separation"],
          },
        ],
      },
      {
        id: "share-claimed-joint",
        name: "The share being asked for",
        plainExplanation:
          PROPERTY_LIMIT +
          "This part of the checklist is about whether the item itself or a share of its value is " +
          "being asked for, and how that amount was worked out.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "How the share was worked out",
            why: "Shows the amount claimed.",
            examples: ["Purchase price and each person's contribution", "Current value of the item"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "partner-says-gift-joint",
        name: "The former partner says the contribution was a gift",
        plainExplanation:
          "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said juristic reasons to deny " +
          "recovery may be the intention to make a gift (a \"donative intent\"), a contract, or a " +
          "disposition of law (para. 41). " +
          INTENTION,
        whenThisComesUp:
          "When the Defence says the money put toward the item was a present, or that the two agreed " +
          "the item would be the former partner's.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: PECORE, pinpoint: "Pecore v. Pecore, 2007 SCC 17, paras. 43-44" }],
      },
      {
        id: "partners-were-married-joint",
        name: "The two people were married, or the item or money was in both names",
        plainExplanation: SPOUSES_S14,
        whenThisComesUp:
          "When the two people were married, or when the purchase was paid from a bank account in " +
          "both names.",
        sourceUrl: FLA,
        verifiedAt: VERIFIED,
        consolidationPeriod: FLA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-return-of-property", "sc-remedy-interest-and-costs", "sc-remedy-outside-jurisdiction"],
    proceduralNotes: [
      { note: FAMILY_COURT_NOTE, sourceUrl: CJA, verifiedAt: VERIFIED, consolidationPeriod: CJA_CONSOLIDATION },
      {
        note: JURISDICTION_NOTE,
        sourceUrl: CJA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CJA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: SC_LIMIT_REG, pinpoint: "O. Reg. 626/00, s. 1(1)" }],
      },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: VERIFIED, consolidationPeriod: LIMITATIONS_CONSOLIDATION },
    ],
    signals: [
      "bought it together",
      "we bought it together",
      "split the cost of the couch",
      "split the cost with my ex",
      "paid half of the car",
      "paid half and my ex kept it",
      "ex kept the furniture we bought together",
      "bought during the relationship",
      "who keeps the furniture after the breakup",
      "put money toward the car in her name",
      "put money toward the car in his name",
    ],
    typicalDefendantProfile: "individual",
    citations: [KERR_CITATION, PECORE_CITATION, CJA_CITATION, FLA_CITATION, LIMITATION_CITATION],
    reviewedAt: null,
    status: "draft",
  },
];
