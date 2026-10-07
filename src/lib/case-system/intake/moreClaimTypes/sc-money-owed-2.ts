/**
 * Case types, batch "sc-money-owed-2" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-money-owed-2.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-group-prize-dispute -- A lottery pool or group prize dispute
 *   sc-claim-unpaid-lesson-or-childcare-fees -- Unpaid lesson, tutoring or child-care fees
 *   sc-claim-unpaid-clinic-invoice -- An unpaid clinic, dental or vet invoice
 *   sc-claim-business-to-business-invoice -- One business owed money by another
 *   sc-claim-investment-in-a-friends-business -- Money put into a friend's business and not returned
 *   sc-claim-unpaid-commercial-rent -- Unpaid commercial rent
 *   sc-claim-club-or-association-dues -- Unpaid club, league or association dues
 *
 * Every entry rests on text saved in this repository: the e-Laws copies and
 * ontario.ca / ontariocourts.ca pages in docs/sources/corpus/ (their manifest
 * url is the sourceUrl), and Garland v. Consumers' Gas Co., 2004 SCC 25, saved
 * at docs/sources/garland-v-consumers-gas-2004-SCC-25.pdf (English text in
 * docs/sources/decisions/garland-v-consumers-gas-2004-SCC-25.english.txt).
 *
 * Nothing in the saved text speaks to lottery pools, child-care fees, clinic
 * billing or club dues as such. Those entries use only the general rules the
 * saved text does state (burden of proof, what a claim must set out, the
 * $50,000 limit, the Limitations Act, the Consumer Protection Act's personal
 * development services rules and its professional-services exemption), and say
 * no more than those rules say.
 */

import type { ClaimType } from "../claimTypes";

const STEPS =
  "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/";
const GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim";
const SUING = "https://www.ontario.ca/page/suing-someone-small-claims-court";
const RENTING = "https://www.ontario.ca/page/renting-commercial-property-ontario";
const RULES = "https://www.ontario.ca/laws/docs/980258_e.doc";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const CTA = "https://www.ontario.ca/laws/docs/90l07_e.doc";
const CPA = "https://www.ontario.ca/laws/docs/02c30_e.doc";
const CPA_REG = "https://www.ontario.ca/laws/docs/050017_e.doc";
const PHIPA = "https://www.ontario.ca/laws/docs/04p03_e.doc";
const SGA = "https://www.ontario.ca/laws/docs/90s01_e.doc";
const GARLAND = "docs/sources/garland-v-consumers-gas-2004-SCC-25.pdf";

const V = "2026-10-07";
const RULES_CP = "2025-10-14";
const LIMITATIONS_CP = "2024-12-04";
const CTA_CP = "2022-12-08";
const CPA_CP = "2025-12-11";
const CPA_REG_CP = "2026-06-10";
const PHIPA_CP = "2026-01-01";
const SGA_CP = "1994-12-09";

const BURDEN =
  "The Superior Court of Justice's guide to the steps in a civil case says that in every civil case the " +
  "plaintiff has the burden of proof to establish, on a balance of probabilities, the allegations in their " +
  "claim -- evidence showing that, more likely than not, it would be correct to rule in their favour. ";

const DEFENCE_RULES =
  "Under rule 9.01 of the Rules of the Small Claims Court, a defendant who wishes to dispute the claim " +
  "serves a Defence (Form 9A) on every other party and files it, with proof of service, within 20 days of " +
  "being served with the claim. Under rule 9.02, the Defence sets out \"the reasons why the defendant " +
  "disputes the plaintiff's claim, expressed in concise non-technical language with a reasonable amount of " +
  "detail\", and a copy of any document the defence is based on is attached (if it is unavailable, the " +
  "Defence says why). ";

const LIMITATION_NOTE =
  "Under s. 4 of the Limitations Act, 2002, a proceeding shall not be commenced in respect of a claim after " +
  "the second anniversary of the day on which the claim was discovered. Section 5(1) sets out when a claim " +
  "is discovered, and under s. 5(2) the person with the claim is presumed to have known of those matters on " +
  "the day the act or omission the claim is based on took place, unless the contrary is proved.";

const ACKNOWLEDGMENT_NOTE =
  "Under s. 13(1) of the Limitations Act, 2002, if a person acknowledges liability for a claim for payment " +
  "of a liquidated (set) sum, the act or omission the claim is based on is treated as having taken place on " +
  "the day of the acknowledgment. The acknowledgment must be in writing and signed by the person making it " +
  "or their agent (s. 13(10)); for a liquidated sum, a part payment by the person the claim is against, or " +
  "their agent, has the same effect (s. 13(11)).";

export const TYPES_SC_MONEY_OWED_2: ClaimType[] = [
  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-group-prize-dispute",
    name: "A lottery pool or group prize dispute",
    broughtBy:
      "A member of a lottery pool, office pool or group that shared in a ticket, draw or prize, who says they were not paid their share.",
    courtArea: "small-claims",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "group-agreement-to-share",
        name: "The group agreed to share the ticket or prize",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about what the group agreed: who was in the pool, who paid in for " +
          "which draw, and how a prize was to be split.",
        sourceUrl: STEPS,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "Records of the pool's terms",
            why: "Shows who was in the group and how a prize was to be shared.",
            examples: ["A written pool sign-up sheet or list of members", "Group chat or emails setting the rules", "Copies or photos of the tickets bought for the group"],
          },
          {
            name: "Proof of paying in",
            why: "Shows a share was paid for the draw that won.",
            examples: ["E-transfer or cash records for the buy-in", "Messages confirming the payment was received", "A witness who collected or saw the contributions"],
          },
        ],
      },
      {
        id: "share-of-prize-unpaid",
        name: "The amount of the share, and that it has not been paid",
        plainExplanation:
          "Ontario's Small Claims Court guide says the reasons for a claim should give a full explanation of " +
          "what happened, including the dates and places, and \"calculate and explain the amount of money and " +
          "any interest you are claiming\", with copies of supporting documents attached to the claim. Under " +
          "rule 7.01(2) of the Rules of the Small Claims Court, if the claim is based in whole or in part on a " +
          "document, a copy is attached, or the claim says why it is not. This part of the checklist is about " +
          "the size of the prize, how the share is worked out, and what has been paid.",
        sourceUrl: GUIDE,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: RULES, pinpoint: "O. Reg. 258/98, r. 7.01 (2)" }],
        evidenceCategories: [
          {
            name: "Proof of the prize amount",
            why: "The share is worked out from the amount actually won.",
            examples: ["Prize claim receipt or cheque", "Lottery or draw results", "Bank deposit of the winnings"],
          },
          {
            name: "Your calculation of the share",
            why: "Shows how the amount claimed was reached.",
            examples: ["A written breakdown of the prize divided by the members", "Records of any part already paid out"],
          },
        ],
      },
      {
        id: "unjust-enrichment-alternative-prize",
        name: "If no agreement is shown: the other person was enriched at your expense",
        plainExplanation:
          "In Garland v. Consumers' Gas Co., 2004 SCC 25, para. 30, the Supreme Court of Canada (Iacobucci J., " +
          "for the Court) said a claim for unjust enrichment has three elements: an enrichment of the " +
          "defendant, a corresponding deprivation of the plaintiff, and an absence of juristic (legal) reason " +
          "for the enrichment. At para. 44, the Court said the established categories of juristic reason " +
          "include a contract, a disposition of law, a donative intent (a gift), and other valid common law, " +
          "equitable or statutory obligations. This part of the checklist is about what you put in, what the " +
          "other person kept, and why.",
        sourceUrl: GARLAND,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "What you contributed",
            why: "Shows your side of the deprivation.",
            examples: ["Records of each buy-in you paid", "Messages asking you to pay your share"],
          },
          {
            name: "What the other person received and kept",
            why: "Shows the enrichment.",
            examples: ["Proof they collected the prize", "Messages about what they did with it"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "defence-says-not-in-pool-for-that-draw",
        name: "The Defence says you were not in the pool for the winning draw",
        plainExplanation:
          DEFENCE_RULES +
          "This topic is about a Defence whose reasons say you had left the group, had not paid in for that " +
          "draw, or that the winning ticket was bought separately.",
        whenThisComesUp: "When the Defence says the winning ticket was not a group ticket, or that you were not in the group for that draw.",
        sourceUrl: RULES,
        verifiedAt: V,
        consolidationPeriod: RULES_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-no-agreement-existed", "defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-outside-jurisdiction", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Ontario's page on suing someone in Small Claims Court says that for anything over $50,000 you need " +
          "to go to the Superior Court of Justice, and that if what you are owed is more than $50,000 you can " +
          "still file in Small Claims Court if you are willing to waive the amount over $50,000.",
        sourceUrl: SUING,
        verifiedAt: V,
      },
      {
        note:
          "Ontario's Small Claims Court guide says that together you and one or more other plaintiffs can sue " +
          "one or more defendants. The other plaintiffs are listed on an Additional Parties form (Form 1A) " +
          "attached to the Plaintiff's Claim.",
        sourceUrl: GUIDE,
        verifiedAt: V,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_CP,
      },
    ],
    signals: [
      "lottery pool",
      "lotto pool",
      "office pool",
      "won the lottery and didn't share",
      "winning ticket",
      "my share of the winnings",
      "split the winnings",
      "group ticket",
      "kept the whole prize",
      "share of the jackpot",
    ],
    citations: [
      { sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a claim", officialUrl: GUIDE, verifiedAt: V, pinpoint: "Reasons for claim; more than one plaintiff" },
      { sourceName: "Ontario.ca — Small claims court: suing someone", officialUrl: SUING, verifiedAt: V, pinpoint: "Overview: $50,000 limit and waiving the excess" },
      { sourceName: "Garland v. Consumers' Gas Co., 2004 SCC 25", officialUrl: GARLAND, verifiedAt: V, pinpoint: "paras. 30 and 44" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-unpaid-lesson-or-childcare-fees",
    name: "Unpaid lesson, tutoring or child-care fees",
    broughtBy:
      "The teacher, tutor, coach, studio, school or child-care provider who gave the lessons or care and was not paid. Not the parent or student asking for money back.",
    courtArea: "small-claims",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "agreement-for-lessons-or-care",
        name: "There was an agreement for the lessons, tutoring or care, and its price",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about what was agreed: which lessons or care, how often, the fee, " +
          "and when it was due.",
        sourceUrl: STEPS,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "The agreement or registration",
            why: "Shows the services and fees that were agreed.",
            examples: ["Signed registration or enrolment form", "Fee schedule or price list given to the family", "Texts or emails agreeing the schedule and price"],
          },
        ],
      },
      {
        id: "lessons-or-care-given-and-amount-owing",
        name: "The lessons or care were given, and the amount owing",
        plainExplanation:
          "Ontario's Small Claims Court guide says the reasons for a claim should give a full explanation of " +
          "what happened, including the dates, and \"calculate and explain the amount of money and any interest " +
          "you are claiming.\" The guide describes a \"liquidated\" claim as a claim for a set amount owing " +
          "under a written contract or verbal agreement, such as an unpaid invoice. To ask for interest, it " +
          "must be asked for in the claim form, and an agreed rate is stated in the claim. This part of the " +
          "checklist is about the sessions given, the fees charged, and what has been paid.",
        sourceUrl: GUIDE,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "Attendance records",
            why: "Shows the lessons or care were actually given.",
            examples: ["Attendance or sign-in sheets", "Calendar or booking records", "Messages confirming sessions"],
          },
          {
            name: "Invoices and payment history",
            why: "Shows how the amount claimed is calculated.",
            examples: ["Invoices or statements sent", "Record of payments received", "Reminders sent about the balance"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "personal-development-services-agreement-rules",
        name: "The Consumer Protection Act's rules for personal development services",
        plainExplanation:
          "Under the Consumer Protection Act, 2002, \"personal development services\" include services for " +
          "martial arts, sports, dance or similar activities, and instruction on them (s. 1). Sections 30 to " +
          "36 apply to those services where payment in advance is required and the consumer's total potential " +
          "payment obligation, excluding cost of borrowing, exceeds a prescribed amount (s. 29(1)), which is " +
          "$50 (O. Reg. 17/05, s. 27). They do not apply to services provided on a non-profit or co-operative " +
          "basis, or by a private club primarily owned by its members, among other exceptions (s. 29(2)). " +
          "Where they apply, the agreement must be in writing, delivered to the consumer and made in " +
          "accordance with the prescribed requirements (s. 30(1)), and no supplier shall require or accept " +
          "payment from a consumer without an agreement that meets those requirements (s. 30(2)). Under " +
          "s. 93(1), a consumer agreement is not binding on the consumer unless it is made in accordance with " +
          "the Act and the regulations; under s. 93(2), a court may order that the consumer is bound by all or " +
          "part of it if it would be inequitable in the circumstances for the consumer not to be bound.",
        whenThisComesUp:
          "When the lessons are in sports, dance, martial arts, fitness or a similar activity, were paid for in advance, and the Defence says the agreement did not meet the Act's requirements.",
        sourceUrl: CPA,
        verifiedAt: V,
        consolidationPeriod: CPA_CP,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 27" }],
      },
      {
        id: "defence-disputes-sessions-or-fees",
        name: "The Defence disputes the sessions given or the fees charged",
        plainExplanation:
          DEFENCE_RULES +
          "This topic is about a Defence whose reasons say some sessions did not happen, the family had " +
          "ended the arrangement, or the fee was different from what is claimed.",
        whenThisComesUp: "When the Defence disputes how many sessions were given, when the arrangement ended, or the price.",
        sourceUrl: RULES,
        verifiedAt: V,
        consolidationPeriod: RULES_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-no-agreement-existed", "defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Ontario's Small Claims Court guide says a Plaintiff's Claim (Form 7A) commences an action, and that " +
          "the Small Claims Court can handle any action for the payment of money where the amount claimed does " +
          "not exceed $50,000, excluding interest and costs such as court fees.",
        sourceUrl: GUIDE,
        verifiedAt: V,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_CP,
      },
    ],
    signals: [
      "unpaid tuition fees",
      "unpaid tutoring fees",
      "parent never paid for the lessons",
      "owes me for piano lessons",
      "unpaid daycare fees",
      "unpaid child care fees",
      "didn't pay for the babysitting",
      "owes for dance classes",
      "stopped paying for lessons",
      "hasn't paid for tutoring",
    ],
    citations: [
      { sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a claim", officialUrl: GUIDE, verifiedAt: V, pinpoint: "Reasons for claim; liquidated claims; interest" },
      { sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A", officialUrl: CPA, verifiedAt: V, pinpoint: "s. 1 (personal development services), ss. 29-30, s. 93" },
      { sourceName: "O. Reg. 17/05 (General), Consumer Protection Act, 2002", officialUrl: CPA_REG, verifiedAt: V, pinpoint: "s. 27" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-unpaid-clinic-invoice",
    name: "An unpaid clinic, dental or vet invoice",
    broughtBy:
      "The clinic, dentist, veterinarian or other practitioner who gave treatment and was not paid. Not the patient or pet owner disputing a bill they already paid.",
    courtArea: "small-claims",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "treatment-agreed-to",
        name: "The patient or owner agreed to the treatment and its cost",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about what the patient or owner agreed to pay for: the treatment " +
          "plan, estimate or fee schedule, and any signed consent to the cost.",
        sourceUrl: STEPS,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "Estimate or treatment plan",
            why: "Shows the cost that was agreed to before treatment.",
            examples: ["Signed estimate or treatment plan", "Financial or payment agreement", "Clinic fee schedule given to the patient or owner"],
          },
        ],
      },
      {
        id: "invoice-unpaid-amount",
        name: "The treatment was given, and the invoice is unpaid",
        plainExplanation:
          "Ontario's Small Claims Court guide describes a \"liquidated\" claim as a claim for a set amount " +
          "owing under a written contract or verbal agreement, such as an unpaid invoice, and says the reasons " +
          "for a claim should \"calculate and explain the amount of money and any interest you are claiming\", " +
          "with copies of supporting documents attached. To ask for interest, it must be asked for in the " +
          "claim form. This part of the checklist is about the invoice, any insurance or partial payments, and " +
          "the balance.",
        sourceUrl: GUIDE,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "Invoice and account statement",
            why: "Shows how the balance is calculated.",
            examples: ["Itemized invoice", "Statement of account", "Record of insurance or partial payments received"],
          },
          {
            name: "Collection notices",
            why: "Shows the balance was asked for before the claim.",
            examples: ["Reminder letters or emails", "Final notice before collection"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "consumer-protection-act-exemption-health-and-vet",
        name: "The Consumer Protection Act does not apply to these professional services",
        plainExplanation:
          "Under s. 2(2)(e) of the Consumer Protection Act, 2002, the Act does not apply to prescribed " +
          "professional services that are regulated under a statute of Ontario. Section 1 of O. Reg. 17/05 " +
          "says a professional service provided by a person governed by, or subject to, the Regulated Health " +
          "Professions Act, 1991 and any Act named in its Schedule 1, or the Veterinarians Act, among others, " +
          "is exempt from the application of the Consumer Protection Act, 2002.",
        whenThisComesUp: "When the Defence relies on the Consumer Protection Act, 2002 against a bill for regulated health or veterinary services.",
        sourceUrl: CPA_REG,
        verifiedAt: V,
        consolidationPeriod: CPA_REG_CP,
        alsoCites: [{ sourceUrl: CPA, pinpoint: "Consumer Protection Act, 2002, s. 2 (2) (e)" }],
      },
      {
        id: "defence-disputes-treatment-or-bill",
        name: "The Defence disputes the treatment or the bill",
        plainExplanation:
          DEFENCE_RULES +
          "This topic is about a Defence whose reasons say the treatment was not agreed to, the price was " +
          "different, or the treatment was not done as agreed.",
        whenThisComesUp: "When the Defence disputes consent to the cost, the amount billed, or the treatment itself.",
        sourceUrl: RULES,
        verifiedAt: V,
        consolidationPeriod: RULES_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-no-agreement-existed", "defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 41(1)(a) of the Personal Health Information Protection Act, 2004, a health information " +
          "custodian may disclose personal health information about an individual for the purpose of a " +
          "proceeding or contemplated proceeding in which the custodian is, or is expected to be, a party or " +
          "witness, if the information relates to or is a matter in issue in the proceeding. A health care " +
          "practitioner, or a person who operates a group practice of health care practitioners, is a health " +
          "information custodian under s. 3(1).",
        sourceUrl: PHIPA,
        verifiedAt: V,
        consolidationPeriod: PHIPA_CP,
      },
      {
        note: ACKNOWLEDGMENT_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_CP,
      },
    ],
    signals: [
      "patient never paid the bill",
      "unpaid dental bill",
      "unpaid vet bill",
      "unpaid veterinary invoice",
      "clinic invoice unpaid",
      "owes the clinic",
      "didn't pay for the treatment",
      "patient balance owing",
      "pet owner didn't pay",
    ],
    citations: [
      { sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a claim", officialUrl: GUIDE, verifiedAt: V, pinpoint: "Liquidated claims; reasons for claim" },
      { sourceName: "O. Reg. 17/05 (General), Consumer Protection Act, 2002", officialUrl: CPA_REG, verifiedAt: V, pinpoint: "s. 1, paras. 11 and 15" },
      { sourceName: "Personal Health Information Protection Act, 2004, S.O. 2004, c. 3, Sched. A", officialUrl: PHIPA, verifiedAt: V, pinpoint: "s. 3 (1) para. 1; s. 41 (1) (a)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-business-to-business-invoice",
    name: "One business owed money by another",
    broughtBy:
      "A business that sold goods or services to another business on account and was not paid.",
    courtArea: "small-claims",
    typicalDefendantProfile: "business",
    plaintiffElements: [
      {
        id: "b2b-agreement-and-terms",
        name: "There was an agreement between the businesses, on the terms claimed",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the order, contract or account terms: what was supplied, the " +
          "price, the payment terms and any agreed interest on late payment.",
        sourceUrl: STEPS,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "The order or contract",
            why: "Shows what was agreed between the businesses.",
            examples: ["Purchase order or signed quote", "Credit application or account terms", "Emails confirming the order and price"],
          },
          {
            name: "Who the customer is",
            why: "The claim is against the business that made the agreement.",
            examples: ["Business name on the order or credit application", "Ontario business registry search", "Any personal guarantee signed"],
          },
        ],
      },
      {
        id: "b2b-goods-delivered-price-unpaid",
        name: "The goods or services were delivered and the price is unpaid",
        plainExplanation:
          "For a sale of goods, s. 47(1) of the Sale of Goods Act allows the seller to bring an action against " +
          "the buyer for the price of the goods where, under a contract of sale, the property in the goods has " +
          "passed to the buyer and the buyer wrongfully neglects or refuses to pay for the goods according to " +
          "the terms of the contract. For services, this part of the checklist is about the work done and the " +
          "invoices for it.",
        sourceUrl: SGA,
        verifiedAt: V,
        consolidationPeriod: SGA_CP,
        evidenceCategories: [
          {
            name: "Proof of delivery or completion",
            why: "Shows the goods arrived or the work was done.",
            examples: ["Signed delivery slips or bills of lading", "Courier tracking", "Sign-off or acceptance emails"],
          },
        ],
      },
      {
        id: "b2b-amount-and-interest",
        name: "The amount owing, and any agreed interest",
        plainExplanation:
          "Ontario's Small Claims Court guide says the reasons for a claim should \"calculate and explain the " +
          "amount of money and any interest you are claiming.\" To ask for interest, it must be asked for in " +
          "the claim form, and if the rate of interest was agreed to by the parties, that rate is stated in " +
          "the claim. The guide describes a claim for a set amount owing under a written contract or verbal " +
          "agreement, such as an unpaid invoice, as a \"liquidated\" claim.",
        sourceUrl: GUIDE,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "Statement of account",
            why: "Shows each invoice, payment and the balance.",
            examples: ["Aged receivables statement", "Copies of each unpaid invoice", "Terms showing any late-payment interest rate"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "b2b-defence-and-defendants-claim",
        name: "The customer disputes the invoice or makes its own claim",
        plainExplanation:
          DEFENCE_RULES +
          "Under rule 10.01, a defendant may also make a claim against the plaintiff (a Defendant's Claim, " +
          "Form 10A), issued within 20 days after the day the defence is filed, or later with leave of the " +
          "court, before trial or default judgment.",
        whenThisComesUp: "When the customer business says the goods were defective, short-shipped or late, or that it is owed money in return.",
        sourceUrl: RULES,
        verifiedAt: V,
        consolidationPeriod: RULES_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-no-agreement-existed", "defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Ontario's Small Claims Court guide says to make sure you have the correct corporate name, address " +
          "and postal code when suing an incorporated company; if the business is not incorporated (for " +
          "example, a sole proprietorship or partnership), you will need the correct name of the business and " +
          "the address for service. If the name on the claim is not exactly right, you may be unable to take " +
          "steps to enforce the judgment. Where an owner signed a personal guarantee, the guide's example names " +
          "both the company and the guarantor as defendants.",
        sourceUrl: GUIDE,
        verifiedAt: V,
      },
      {
        note:
          "Under s. 22(1) of the Limitations Act, 2002, a limitation period applies despite any agreement to " +
          "vary or exclude it, subject only to the exceptions in s. 22(2) to (6). For a business agreement -- " +
          "an agreement made by parties none of whom is a consumer as defined in the Consumer Protection Act, " +
          "2002 (s. 22(6)) -- a limitation period other than the one in s. 15 may be varied or excluded by an " +
          "agreement made on or after October 19, 2006 (s. 22(5)). Under s. 4, unless the Act provides " +
          "otherwise, the basic period is two years from the day the claim was discovered.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_CP,
      },
    ],
    signals: [
      "customer business hasn't paid our invoices",
      "net 30 invoice unpaid",
      "supplier invoice not paid",
      "client company owes us",
      "unpaid account receivable",
      "business customer stopped paying",
      "corporate client won't pay",
      "wholesale order not paid for",
    ],
    citations: [
      { sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a claim", officialUrl: GUIDE, verifiedAt: V, pinpoint: "Naming a corporation or business; interest; liquidated claims" },
      { sourceName: "Sale of Goods Act, R.S.O. 1990, c. S.1", officialUrl: SGA, verifiedAt: V, pinpoint: "s. 47 (1)" },
      { sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B", officialUrl: LIMITATIONS, verifiedAt: V, pinpoint: "s. 4; s. 22 (1), (5), (6)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-investment-in-a-friends-business",
    name: "Money put into a friend's business and not returned",
    broughtBy:
      "The person who put money into a friend's or relative's business, as a loan or an investment, and wants it back.",
    courtArea: "small-claims",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "what-was-agreed-about-the-money",
        name: "What was agreed about the money: a loan, or a stake in the business",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about what was said or written when the money was handed over -- " +
          "whether it was to be repaid, when, and by whom (the friend personally, or the business).",
        sourceUrl: STEPS,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "Records of the terms",
            why: "Shows whether the money was to be repaid, and by whom.",
            examples: ["A written loan or investment agreement", "Texts or emails about repayment", "A promissory note or IOU"],
          },
          {
            name: "Proof the money was transferred",
            why: "Shows how much was put in, when, and to whom.",
            examples: ["Bank or e-transfer records", "Cheques and who they were made out to"],
          },
        ],
      },
      {
        id: "amount-outstanding-investment",
        name: "The amount put in, anything returned, and what is still owed",
        plainExplanation:
          "Ontario's Small Claims Court guide says the reasons for a claim should give a full explanation of " +
          "what happened, including the dates, and \"calculate and explain the amount of money and any interest " +
          "you are claiming\", with copies of supporting documents attached to the claim.",
        sourceUrl: GUIDE,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "A running record",
            why: "Shows how the amount claimed was reached.",
            examples: ["List of each amount put in", "Records of anything paid back"],
          },
        ],
      },
      {
        id: "unjust-enrichment-if-no-repayment-term",
        name: "If no repayment was agreed: the business was enriched without a legal reason",
        plainExplanation:
          "In Garland v. Consumers' Gas Co., 2004 SCC 25, para. 30, the Supreme Court of Canada (Iacobucci J., " +
          "for the Court) said a claim for unjust enrichment has three elements: an enrichment of the " +
          "defendant, a corresponding deprivation of the plaintiff, and an absence of juristic (legal) reason " +
          "for the enrichment. At para. 44, the Court said the established categories of juristic reason " +
          "include a contract, a disposition of law, a donative intent (a gift), and other valid common law, " +
          "equitable or statutory obligations. Because a contract and a gift are both on that list, this part " +
          "of the checklist is about whether there was an agreement about the money, or a gift, and what was " +
          "said when it was handed over.",
        sourceUrl: GARLAND,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "What the business received",
            why: "Shows the enrichment and who received it.",
            examples: ["Bank records showing the money went to the business account", "Invoices the money paid for"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "defence-says-investment-or-gift",
        name: "The Defence says the money was an investment at risk, or a gift",
        plainExplanation:
          DEFENCE_RULES +
          "This topic is about a Defence whose reasons say the money bought a share of the business, was " +
          "never to be repaid, or was owed by the business and not by the friend personally.",
        whenThisComesUp: "When the Defence says the money was not a loan, or that a different person or company owes it.",
        sourceUrl: RULES,
        verifiedAt: V,
        consolidationPeriod: RULES_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-no-agreement-existed", "defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Ontario's Small Claims Court guide says that when suing an incorporated company you need its correct " +
          "corporate name, address and postal code, and that if the business is not incorporated (for example, " +
          "a sole proprietorship or partnership) you will need the correct name of the business and the address " +
          "for service; you may also wish to name the proprietor or partners if you want a judgment against " +
          "them as well. Under rule 5.01 of the Rules of the Small Claims Court, a proceeding against two or " +
          "more persons as partners may be commenced using the firm name of the partnership.",
        sourceUrl: GUIDE,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: RULES, pinpoint: "O. Reg. 258/98, r. 5.01" }],
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_CP,
      },
    ],
    signals: [
      "invested in my friend's business",
      "put money into his business",
      "put money into her business",
      "invested in their company",
      "business partner won't return my investment",
      "money for the business was never paid back",
      "helped start the business with my savings",
      "friend's restaurant took my money",
    ],
    citations: [
      { sourceName: "Garland v. Consumers' Gas Co., 2004 SCC 25", officialUrl: GARLAND, verifiedAt: V, pinpoint: "paras. 30 and 44" },
      { sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a claim", officialUrl: GUIDE, verifiedAt: V, pinpoint: "Naming a business or partnership; reasons for claim" },
      { sourceName: "Rules of the Small Claims Court, O. Reg. 258/98", officialUrl: RULES, verifiedAt: V, pinpoint: "r. 5.01; rr. 9.01-9.02" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-unpaid-commercial-rent",
    name: "Unpaid commercial rent",
    broughtBy:
      "The landlord of a store, office, warehouse or other business premises whose tenant has not paid the rent. Not a residential landlord.",
    courtArea: "small-claims",
    typicalDefendantProfile: "business",
    plaintiffElements: [
      {
        id: "premises-are-commercial",
        name: "The tenancy is commercial, not residential",
        plainExplanation:
          "Under s. 2 of the Commercial Tenancies Act, the Act does not apply to tenancies and tenancy " +
          "agreements to which the Residential Tenancies Act, 2006 applies. Ontario's page on renting " +
          "commercial property says that if there is a question about whether a tenancy is residential or " +
          "commercial, a landlord or tenant can apply to the Landlord and Tenant Board for a determination " +
          "about whether the Residential Tenancies Act applies.",
        sourceUrl: CTA,
        verifiedAt: V,
        consolidationPeriod: CTA_CP,
        alsoCites: [{ sourceUrl: RENTING, pinpoint: "Renting commercial property in Ontario -- Resolving conflicts" }],
        evidenceCategories: [
          {
            name: "Proof the premises are used for business",
            why: "Shows the tenancy is commercial.",
            examples: ["Commercial lease", "Business registration at the address", "Photos of the storefront or office"],
          },
        ],
      },
      {
        id: "lease-rent-terms",
        name: "The lease and the rent it sets",
        plainExplanation:
          "Ontario's page on renting commercial property says a signed commercial lease agreement may take " +
          "precedence over the Commercial Tenancies Act, and that most commercial leases should cover the rent " +
          "amount, including rules for rent increases and notice requirements. It also says that if a tenant " +
          "wants to end a fixed-term lease early, they must pay the rent for the remaining term unless there " +
          "is a clause in the lease allowing the tenant to end the lease early.",
        sourceUrl: RENTING,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "The lease",
            why: "Sets the rent, the due dates and the term.",
            examples: ["Signed lease and any amendments", "Renewal or extension agreements", "Notices of rent increase"],
          },
        ],
      },
      {
        id: "rent-arrears-amount",
        name: "The rent owing",
        plainExplanation:
          "Ontario's page on suing someone in Small Claims Court lists unpaid rent among the claims for money " +
          "owed under an agreement that can be brought there. Ontario's Small Claims Court guide says the " +
          "reasons for a claim should \"calculate and explain the amount of money and any interest you are " +
          "claiming\", with copies of supporting documents attached.",
        sourceUrl: SUING,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: GUIDE, pinpoint: "Making a claim -- How to fill out the claim form" }],
        evidenceCategories: [
          {
            name: "Rent ledger",
            why: "Shows each month's rent, payments and the balance.",
            examples: ["Rent ledger or statement", "Bank records of rent received", "Demand letters for the arrears"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "tenant-set-off-against-rent",
        name: "The tenant sets off a debt the landlord owes it",
        plainExplanation:
          "Under s. 35(1) of the Commercial Tenancies Act, a tenant may set off against the rent due a debt " +
          "due to the tenant by the landlord. Sections 35(2) and (3) deal with notice of that set-off (Form 2) " +
          "and its effect where the landlord is seizing the tenant's goods for rent (distress).",
        whenThisComesUp: "When the tenant says the landlord owes it money -- for example for repairs or a deposit -- that should come off the rent.",
        sourceUrl: CTA,
        verifiedAt: V,
        consolidationPeriod: CTA_CP,
      },
      {
        id: "landlord-already-used-cta-remedy",
        name: "The landlord has already changed the locks or seized property",
        plainExplanation:
          "Ontario's page on renting commercial property says that when a tenant has failed to pay rent on " +
          "time, the landlord has two options under the Commercial Tenancies Act: change the locks and end " +
          "the tenancy, or seize and sell the tenant's property to cover unpaid rent -- and they can't do " +
          "both. The proceeds from a sale must be applied to the rent arrears and the costs of the distress, " +
          "and any amount left over must be paid to the tenant.",
        whenThisComesUp: "When the landlord has changed the locks or seized and sold the tenant's property before suing for rent.",
        sourceUrl: RENTING,
        verifiedAt: V,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Ontario's page on renting commercial property says legal disputes between commercial landlords and " +
          "tenants about money or personal property under $50,000 can be brought before Small Claims Court; " +
          "otherwise, a claim must be brought before the Superior Court of Justice.",
        sourceUrl: RENTING,
        verifiedAt: V,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_CP,
      },
    ],
    signals: [
      "commercial tenant stopped paying rent",
      "store tenant owes back rent",
      "office tenant behind on rent",
      "rent arrears for my commercial unit",
      "business tenant broke the lease and left",
      "tenant left the plaza unit owing rent",
      "warehouse tenant hasn't paid",
    ],
    citations: [
      { sourceName: "Commercial Tenancies Act, R.S.O. 1990, c. L.7", officialUrl: CTA, verifiedAt: V, pinpoint: "s. 2; s. 35 (1)" },
      { sourceName: "Ontario.ca — Renting commercial property in Ontario", officialUrl: RENTING, verifiedAt: V, pinpoint: "Resolving conflicts; Ending a tenancy; Late or unpaid rent" },
      { sourceName: "Ontario.ca — Small claims court: suing someone", officialUrl: SUING, verifiedAt: V, pinpoint: "What you can sue for: unpaid rent" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-club-or-association-dues",
    name: "Unpaid club, league or association dues",
    broughtBy:
      "The club, sports league, team or association owed membership dues or fees by a member. Not a member asking for dues back.",
    courtArea: "small-claims",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "membership-and-dues-agreed",
        name: "The member joined and agreed to the dues",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the membership: when the person joined, the dues or fees set, " +
          "and the rules they agreed to.",
        sourceUrl: STEPS,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "Membership records",
            why: "Shows the person was a member and agreed to the dues.",
            examples: ["Signed membership or registration form", "The club's rules or by-laws on dues", "Emails confirming the membership"],
          },
        ],
      },
      {
        id: "dues-unpaid-amount",
        name: "The dues owing",
        plainExplanation:
          "Ontario's Small Claims Court guide describes a \"liquidated\" claim as a claim for a set amount owing " +
          "under a written contract or verbal agreement, and says the reasons for a claim should \"calculate " +
          "and explain the amount of money and any interest you are claiming\", with copies of supporting " +
          "documents attached to the claim.",
        sourceUrl: GUIDE,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "Dues statements",
            why: "Shows each charge, payment and the balance.",
            examples: ["Dues invoices", "Member account statement", "Reminder notices sent"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "personal-development-services-and-member-clubs",
        name: "Whether the Consumer Protection Act's personal development services rules apply",
        plainExplanation:
          "Under s. 29(1) of the Consumer Protection Act, 2002, sections 30 to 36 apply to personal development " +
          "services (services for health, fitness, martial arts, sports, dance or similar activities, under " +
          "s. 1) where payment in advance is required and the consumer's total potential payment obligation " +
          "exceeds a prescribed amount. Under s. 29(2), those sections do not apply to personal development " +
          "services provided on a non-profit or co-operative basis, or by a private club primarily owned by " +
          "its members, among other exceptions. Where they apply, s. 30(1) requires the agreement to be in " +
          "writing, delivered to the consumer and made in accordance with the prescribed requirements.",
        whenThisComesUp: "When the Defence relies on the Consumer Protection Act, 2002 against fitness, sports or similar club dues.",
        sourceUrl: CPA,
        verifiedAt: V,
        consolidationPeriod: CPA_CP,
      },
      {
        id: "defence-says-membership-ended",
        name: "The Defence says the membership had ended",
        plainExplanation:
          DEFENCE_RULES +
          "This topic is about a Defence whose reasons say the member resigned or cancelled before the dues " +
          "claimed were charged.",
        whenThisComesUp: "When the Defence says the person was no longer a member for the period claimed.",
        sourceUrl: RULES,
        verifiedAt: V,
        consolidationPeriod: RULES_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-no-agreement-existed", "defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under rule 7.01 of the Rules of the Small Claims Court, an action is commenced by filing a " +
          "plaintiff's claim (Form 7A). The claim sets out, in concise and non-technical language, the full " +
          "names of the parties and, if relevant, the capacity in which they sue or are sued, and the nature " +
          "of the claim with reasonable certainty and detail, including the date, place and nature of the " +
          "occurrences on which it is based.",
        sourceUrl: RULES,
        verifiedAt: V,
        consolidationPeriod: RULES_CP,
      },
      {
        note: ACKNOWLEDGMENT_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_CP,
      },
    ],
    signals: [
      "unpaid membership dues",
      "member owes club dues",
      "league fees not paid",
      "association dues unpaid",
      "didn't pay the team fees",
      "golf club dues owing",
      "member stopped paying dues",
    ],
    citations: [
      { sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a claim", officialUrl: GUIDE, verifiedAt: V, pinpoint: "Liquidated claims; reasons for claim" },
      { sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A", officialUrl: CPA, verifiedAt: V, pinpoint: "s. 1 (personal development services); s. 29 (1)-(2); s. 30 (1)" },
      { sourceName: "Rules of the Small Claims Court, O. Reg. 258/98", officialUrl: RULES, verifiedAt: V, pinpoint: "r. 7.01; rr. 9.01-9.02" },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
