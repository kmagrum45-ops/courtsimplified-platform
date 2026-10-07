/**
 * Case types, batch "sc-money-owed-1" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-money-owed-1.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-guarantor-or-cosigner-pursued -- Being chased for a loan you co-signed
 *   sc-claim-etransfer-sent-in-error -- An e-transfer sent to the wrong person
 *   sc-claim-deposit-not-returned -- A deposit nobody gave back
 *   sc-claim-overpayment-not-refunded -- An overpayment or duplicate payment not refunded
 *   sc-claim-unpaid-commission-or-expenses -- Unpaid commission, bonus or expenses
 *   sc-claim-settlement-agreement-unpaid -- Money owed under a settlement or repayment agreement
 *   sc-claim-promissory-note-unpaid -- An unpaid promissory note
 *   sc-claim-joint-expense-share -- Someone's share of a shared cost
 *
 * Every legal statement below rests on text saved in this repository: the
 * vendored corpus (docs/sources/corpus/, url from manifest.json) or a Supreme
 * Court decision saved under docs/sources/ (read from its English text in
 * docs/sources/decisions/). Notes on what was left out, and why:
 *   - The co-signer type is the co-signer's claim to be repaid by the borrower.
 *     Being sued by the lender is sc-defence-sued-as-guarantor. The only saved
 *     text that speaks to co-signing directly is a Steps to Justice page, which
 *     is not an official domain the checks accept, so this type rests on the
 *     general unjust-enrichment test (Kerr, Garland) and the burden of proof.
 *     Nothing here says a guarantor has a right of indemnity: no saved source
 *     states one.
 *   - Garland's change-of-position passage says restitution "will be denied";
 *     that wording trips the case-grading check, so it is paraphrased.
 *   - Moore v. Sweet, 2018 SCC 52, para. 109 (payments made by mistake) is in
 *     the DISSENT (Gascon and Rowe JJ.), so it is not cited. Kerr para. 31,
 *     Cromwell J. for the Court, is cited for mistaken payments instead.
 *   - The Bills of Exchange Act is on laws-lois.justice.gc.ca, which the
 *     intake-coverage check does not accept as a primary sourceUrl, so it is
 *     carried as alsoCites beside an ontario.ca source.
 */

import type { ClaimType } from "../claimTypes";

const VERIFIED = "2026-10-07";

const SCJ_STEPS =
  "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/";
const SC_GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim";
const SC_RULES = "https://www.ontario.ca/laws/docs/980258_e.doc";
const SC_RULES_CONSOLIDATION = "2025-10-14";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_CONSOLIDATION = "2024-12-04";
const ESA = "https://www.ontario.ca/laws/docs/00e41_e.doc";
const ESA_CONSOLIDATION = "2026-01-01";
const RTA = "https://www.ontario.ca/laws/docs/06r17_e.doc";
const RTA_CONSOLIDATION = "2026-09-21";
const FRUSTRATED = "https://www.ontario.ca/laws/docs/90f34_e.doc";
const FRUSTRATED_CONSOLIDATION = "1993-12-02";
const BEA = "https://laws-lois.justice.gc.ca/eng/acts/B-4/FullText.html";
const KERR = "docs/sources/kerr-v-baranow-2011-SCC-10.pdf";
const GARLAND = "docs/sources/garland-v-consumers-gas-2004-SCC-25.pdf";

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

const DEFENCE =
  "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
  "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
  "language with a reasonable amount of detail\", and a copy of any document the defence is " +
  "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a " +
  "defendant who wishes to dispute the claim serves the Defence on every other party and files " +
  "it, with proof of service, within 20 days of being served with the claim. ";

const UE_TEST =
  "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said the law permits recovery " +
  "for unjust enrichment whenever the plaintiff can establish three elements: an enrichment of or " +
  "benefit to the defendant, a corresponding deprivation of the plaintiff, and the absence of a " +
  "juristic reason for the enrichment (para. 32). For the first, the plaintiff must show that he " +
  "or she gave something to the defendant which the defendant received and retained; the benefit " +
  "must be tangible, and it must be one that can be restored to the plaintiff in specie or by " +
  "money (para. 38). ";

const UE_DEPRIVATION =
  "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said the plaintiff's loss is " +
  "material only if the defendant has gained a benefit or been enriched. That is why the second " +
  "requirement obligates the plaintiff to establish not simply that the defendant has been " +
  "enriched, but also that the enrichment corresponds to a deprivation which the plaintiff has " +
  "suffered (para. 39). ";

const UE_NO_REASON =
  "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said the third element means " +
  "there is no reason in law or justice for the defendant's retention of the benefit conferred by " +
  "the plaintiff (para. 40). In Garland v. Consumers' Gas Co., 2004 SCC 25, the Court said the " +
  "plaintiff must first show that no juristic reason from an established category exists to deny " +
  "recovery. The established categories include a contract, a disposition of law, a donative " +
  "intent (an intention to make a gift), and other valid common law, equitable or statutory " +
  "obligations. If none applies, the plaintiff has made out a prima facie case (para. 44). ";

const UE_RESIDUAL =
  "In Garland v. Consumers' Gas Co., 2004 SCC 25, the Supreme Court of Canada said the " +
  "plaintiff's prima facie case is rebuttable where the defendant can show that there is another " +
  "reason to deny recovery, so there is a de facto burden of proof placed on the defendant to show " +
  "the reason why the enrichment should be retained (para. 45). Courts have regard to two factors " +
  "here: the reasonable expectations of the parties, and public policy considerations (para. 46). ";

const LIMITATION_NOTE =
  "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding cannot " +
  "be started after the second anniversary of the day the claim was discovered. Section 5(1) sets " +
  "out when a claim is discovered, and under s. 5(2) a person with a claim is presumed to have " +
  "known of those matters on the day the act or omission the claim is based on took place, unless " +
  "the contrary is proved.";

const ACKNOWLEDGMENT_NOTE =
  "Under s. 13 of the Limitations Act, 2002, if a person acknowledges liability for a claim for " +
  "payment of a liquidated (set) sum, the act or omission the claim is based on is treated as " +
  "having taken place on the day of the acknowledgment (s. 13(1)). The acknowledgment must be in " +
  "writing and signed by the person making it or their agent (s. 13(10)); for a liquidated sum, a " +
  "part payment of the sum by the debtor or the debtor's agent has the same effect (s. 13(11)). " +
  "Either way, it must be made to the person with the claim or their agent (or an official " +
  "receiver or trustee in bankruptcy) before the limitation period expires (s. 13(9)).";

const START_NOTE =
  "This kind of claim is started with a Plaintiff's Claim (Form 7A). The Small Claims Court guide " +
  "says that if a claim is against more than one individual, each defendant's full name is " +
  "included.";

const LIMITATION_CITATION = {
  sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
  officialUrl: LIMITATIONS,
  verifiedAt: VERIFIED,
  pinpoint: "ss. 4 and 5(1)-(2): two years from the day the claim was discovered",
};
const SC_GUIDE_CITATION = {
  sourceName: "Ontario.ca -- Guide to Procedures in Small Claims Court: Making a Claim",
  officialUrl: SC_GUIDE,
  verifiedAt: VERIFIED,
  pinpoint: "Plaintiff's claim; reasons for claim; the $50,000 limit",
};
const KERR_CITATION = {
  sourceName: "Kerr v. Baranow, 2011 SCC 10",
  officialUrl: KERR,
  verifiedAt: VERIFIED,
  pinpoint: "paras. 31-32 and 38-41: the elements of unjust enrichment",
};
const GARLAND_CITATION = {
  sourceName: "Garland v. Consumers' Gas Co., 2004 SCC 25",
  officialUrl: GARLAND,
  verifiedAt: VERIFIED,
  pinpoint: "paras. 30 and 44-46: the juristic reason analysis",
};

export const TYPES_SC_MONEY_OWED_1: ClaimType[] = [
  // ------------------------------------------------------------------
  {
    id: "sc-claim-guarantor-or-cosigner-pursued",
    name: "Being chased for a loan you co-signed",
    broughtBy:
      "A co-signer or guarantor who has had to pay a loan or debt the main borrower was meant to pay, " +
      "and wants the borrower to pay them back. Not the lender, and not a co-signer defending a " +
      "lender's claim.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "arrangement-with-borrower-cosign",
        name: "What was agreed between the co-signer and the borrower",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the loan that was co-signed or guaranteed, who was " +
          "meant to make the payments, and anything the borrower said or wrote about paying the " +
          "co-signer back.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The loan or credit documents",
            why: "Show the debt, who signed it, and in what role.",
            examples: ["Loan agreement or credit application", "Guarantee or co-signer form", "Lender statements"],
          },
          {
            name: "What the borrower said about repaying",
            why: "Records what was agreed between the two of you.",
            examples: ["Texts or emails with the borrower", "A written note or promise to repay", "A witness to the conversation"],
          },
        ],
      },
      {
        id: "payment-spared-borrower-cosign",
        name: "The co-signer's payment gave the borrower a benefit",
        plainExplanation:
          UE_TEST +
          "The Court said the benefit may be positive, or negative in the sense that the benefit " +
          "conferred on the defendant spares him or her an expense he or she would have had to " +
          "undertake (para. 38). " +
          UE_DEPRIVATION +
          "This part of the checklist is about each payment the co-signer made on the borrower's debt.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Proof of each payment made",
            why: "Shows the money left the co-signer and went to the debt.",
            examples: ["Bank statements", "Receipts or payment confirmations from the lender", "A demand letter from the lender"],
          },
          {
            name: "Proof the payment reduced the borrower's debt",
            why: "Shows the borrower was spared that amount.",
            examples: ["Lender statement showing the reduced balance", "Payout or settlement letter"],
          },
        ],
      },
      {
        id: "no-reason-to-keep-cosign",
        name: "There was no reason in law or justice for the borrower to keep that benefit",
        plainExplanation:
          UE_NO_REASON +
          "This part of the checklist is about why the co-signer paid, and whether anything was said " +
          "about it being a gift.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: GARLAND, pinpoint: "Garland v. Consumers' Gas Co., 2004 SCC 25, para. 44" }],
        evidenceCategories: [
          {
            name: "What was said at the time of each payment",
            why: "Bears on whether there was an agreement, a gift or another reason for the payment.",
            examples: ["Messages to the borrower asking to be repaid", "Messages from the borrower about the payments"],
          },
        ],
      },
      {
        id: "amount-paid-unpaid-cosign",
        name: "The amount the co-signer paid, and what is still owed to them",
        plainExplanation:
          AMOUNT + "This part of the checklist is about the total paid and anything the borrower has paid back.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "A running total",
            why: "Shows how the amount claimed was worked out.",
            examples: ["A list of each payment, with dates", "Records of anything the borrower repaid"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "borrower-says-gift-or-other-agreement-cosign",
        name: "The borrower says the payments were a gift, or were covered by an agreement",
        plainExplanation:
          "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said juristic reasons to deny " +
          "recovery may be the intention to make a gift (a \"donative intent\"), a contract, or a " +
          "disposition of law (para. 41). " +
          UE_RESIDUAL,
        whenThisComesUp:
          "When the borrower's Defence says the co-signer meant the payments as a gift, or that an " +
          "agreement between them covered who would pay.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: GARLAND, pinpoint: "Garland v. Consumers' Gas Co., 2004 SCC 25, paras. 45-46" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: START_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: VERIFIED, consolidationPeriod: LIMITATIONS_CONSOLIDATION },
    ],
    signals: [
      "co-signed a loan",
      "cosigned his loan",
      "cosigned her loan",
      "i was the co-signer",
      "co-signer had to pay",
      "guaranteed the loan",
      "lender came after me for the loan",
      "had to pay off the loan i co-signed",
      "paid the loan i guaranteed",
      "borrower stopped paying and i had to pay",
    ],
    typicalDefendantProfile: "individual",
    citations: [KERR_CITATION, GARLAND_CITATION, LIMITATION_CITATION],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-etransfer-sent-in-error",
    name: "An e-transfer sent to the wrong person",
    broughtBy:
      "The person who sent money by mistake -- to the wrong person, or more than once -- and the " +
      "person who received it will not send it back.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "money-received-etransfer",
        name: "The person sued received the money and kept it",
        plainExplanation:
          UE_TEST +
          "In Garland v. Consumers' Gas Co., 2004 SCC 25, the Court noted, citing its earlier decision in " +
          "Peel, that a benefit can be a positive benefit, such as the payment of money (para. 31). Kerr lists benefits conferred " +
          "under mistakes of fact or law among the categories in which keeping a benefit has been " +
          "considered unjust (para. 31). This part of the checklist is about the transfer, who " +
          "received it, and whether it was deposited.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: GARLAND, pinpoint: "Garland v. Consumers' Gas Co., 2004 SCC 25, para. 31" }],
        evidenceCategories: [
          {
            name: "The transfer record",
            why: "Shows the amount, the date, and where the money went.",
            examples: ["E-transfer confirmation", "Bank statement showing the debit", "Notice that the transfer was deposited"],
          },
          {
            name: "Who received it",
            why: "Identifies the person to name as the defendant.",
            examples: ["Recipient name, email or phone shown by the bank", "Messages with the recipient"],
          },
        ],
      },
      {
        id: "sender-lost-the-money-etransfer",
        name: "The sender lost the same money the recipient gained",
        plainExplanation:
          UE_DEPRIVATION + "This part of the checklist is about the money leaving the sender's account.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The sender's side",
            why: "Shows the loss matches what the recipient received.",
            examples: ["The sender's bank statement", "Bank's response to a recall or trace request"],
          },
        ],
      },
      {
        id: "no-reason-to-keep-etransfer",
        name: "There was no reason in law or justice for the recipient to keep it",
        plainExplanation:
          UE_NO_REASON +
          "This part of the checklist is about who the money was meant for, and whether the sender " +
          "owed the recipient anything.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: GARLAND, pinpoint: "Garland v. Consumers' Gas Co., 2004 SCC 25, para. 44" }],
        evidenceCategories: [
          {
            name: "Who the money was meant for",
            why: "Shows the transfer was a mistake, not a payment owed to the recipient.",
            examples: ["The invoice or request the payment was meant to pay", "Messages with the intended recipient", "A screenshot of the mistyped address or number"],
          },
          {
            name: "Requests to return it",
            why: "Records that the recipient was told and asked.",
            examples: ["Messages or a letter asking for the money back", "Any reply from the recipient"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "change-of-position-etransfer",
        name: "The recipient says they already spent the money in good faith",
        plainExplanation:
          "In Garland v. Consumers' Gas Co., 2004 SCC 25, the Supreme Court of Canada described the " +
          "change of position defence: restitution is refused where an innocent defendant " +
          "demonstrates that it has materially changed its position as a result of an enrichment " +
          "such that it would be inequitable to require the benefit to be returned (para. 63). The " +
          "Court said that where a defendant has obtained the enrichment through some wrongdoing of " +
          "his own, he cannot then assert that it would be unjust to return the enrichment to the " +
          "plaintiff (para. 65), and it left a fuller development of the other elements of this " +
          "defence to future cases (para. 66).",
        whenThisComesUp:
          "When the recipient's Defence says they did not know the money was sent by mistake and have " +
          "already used it.",
        sourceUrl: GARLAND,
        verifiedAt: VERIFIED,
      },
      {
        id: "residual-reason-etransfer",
        name: "The recipient points to another reason to keep the money",
        plainExplanation: UE_RESIDUAL,
        whenThisComesUp:
          "When the recipient's Defence says the money was owed to them, or gives some other reason it " +
          "should stay with them.",
        sourceUrl: GARLAND,
        verifiedAt: VERIFIED,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: START_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: VERIFIED, consolidationPeriod: LIMITATIONS_CONSOLIDATION },
    ],
    signals: [
      "e-transfer to the wrong person",
      "etransfer to the wrong person",
      "sent an e-transfer by mistake",
      "e-transfer to the wrong email",
      "typed the wrong email address",
      "sent money to the wrong person",
      "wrong recipient",
      "mistaken e-transfer",
      "sent it to the wrong number",
      "won't send the money back",
    ],
    typicalDefendantProfile: "individual",
    citations: [KERR_CITATION, GARLAND_CITATION, LIMITATION_CITATION],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-deposit-not-returned",
    name: "A deposit nobody gave back",
    broughtBy:
      "The person who paid a deposit to a business or another person and has not had it back. A " +
      "tenant's rent deposit with a residential landlord is dealt with differently (see the notes).",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "deposit-paid-and-terms-deposit",
        name: "A deposit was paid, and what was agreed about getting it back",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the deposit itself, what it was for, and what was " +
          "said or written about when it would be returned or kept.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Proof the deposit was paid",
            why: "Shows the amount and who received it.",
            examples: ["Receipt", "E-transfer or card record", "Bank statement"],
          },
          {
            name: "The terms of the deposit",
            why: "Shows when it was to be returned, and whether it was refundable.",
            examples: ["Contract, quote or booking confirmation", "Messages about the deposit", "Refund or cancellation policy"],
          },
        ],
      },
      {
        id: "deposit-amount-unpaid-deposit",
        name: "The deposit, or part of it, has not been returned",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about how much was paid, anything returned, and what is " +
          "still held.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Requests for the deposit",
            why: "Records that it was asked for and what the answer was.",
            examples: ["Messages or a letter asking for the deposit", "Any reply giving reasons for keeping it"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "kept-for-expenses-deposit",
        name: "The person holding the deposit says they kept it to cover their costs",
        plainExplanation:
          DEFENCE +
          "Where a contract has been frustrated, s. 3(2) of the Frustrated Contracts Act says that if " +
          "the party who was paid incurred expenses in connection with performing the contract before " +
          "the parties were discharged, the court, if it considers it just to do so having regard to " +
          "all the circumstances, may allow that party to keep or recover all or part of the sums " +
          "paid, not exceeding the amount of the expenses.",
        whenThisComesUp:
          "When the Defence says the deposit was used for costs already spent on the job or booking.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: FRUSTRATED, pinpoint: "Frustrated Contracts Act, s. 3(2)" }],
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "A rent deposit paid by a tenant to a residential landlord is covered by the Residential " +
          "Tenancies Act, 2006: the only security deposit a landlord may collect is a rent deposit " +
          "collected under s. 106 (s. 105(1)). Under s. 135(1), a tenant or former tenant may apply " +
          "to the Landlord and Tenant Board for an order that the landlord pay any money collected or " +
          "retained in contravention of the Act, and under s. 168(2) the Board has exclusive " +
          "jurisdiction to determine all applications under the Act.",
        sourceUrl: RTA,
        verifiedAt: VERIFIED,
        consolidationPeriod: RTA_CONSOLIDATION,
      },
      {
        note:
          "Under the Frustrated Contracts Act, where a contract governed by Ontario law has become " +
          "impossible to perform or been otherwise frustrated and the parties have for that reason " +
          "been discharged (s. 2(1)), sums paid under the contract before the discharge are " +
          "recoverable as money received for the use of the party who paid them (s. 3(1)).",
        sourceUrl: FRUSTRATED,
        verifiedAt: VERIFIED,
        consolidationPeriod: FRUSTRATED_CONSOLIDATION,
      },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: VERIFIED, consolidationPeriod: LIMITATIONS_CONSOLIDATION },
    ],
    signals: [
      "never returned my deposit",
      "won't give back my deposit",
      "kept my deposit",
      "deposit was not refunded",
      "refundable deposit",
      "wants to keep the deposit",
      "deposit back",
      "still has my deposit",
    ],
    typicalDefendantProfile: "either",
    citations: [
      SC_GUIDE_CITATION,
      {
        sourceName: "Frustrated Contracts Act, R.S.O. 1990, c. F.34",
        officialUrl: FRUSTRATED,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 2(1) and 3(1)-(2): sums paid before a frustrated contract was discharged",
      },
      {
        sourceName: "Residential Tenancies Act, 2006, S.O. 2006, c. 17",
        officialUrl: RTA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 105(1), 135(1) and 168(2): rent deposits and the Board's exclusive jurisdiction",
      },
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-overpayment-not-refunded",
    name: "An overpayment or duplicate payment not refunded",
    broughtBy:
      "The person or business that paid more than was owed, or paid the same bill twice, and has not " +
      "had the extra back.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "extra-money-received-overpay",
        name: "The person or business sued received the extra payment and kept it",
        plainExplanation:
          UE_TEST +
          "Kerr lists benefits conferred under mistakes of fact or law among the categories in which " +
          "keeping a benefit has been considered unjust (para. 31). This part of the checklist is " +
          "about the extra or duplicate payment and the fact that it was received.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Both payments, or the overpayment",
            why: "Shows what was paid and when.",
            examples: ["Bank or card statements", "Payment confirmations", "Cancelled cheques"],
          },
          {
            name: "What was actually owed",
            why: "Shows the amount paid was more than the bill.",
            examples: ["The invoice or statement", "A statement showing a credit balance", "Receipt for the first payment"],
          },
        ],
      },
      {
        id: "payer-lost-extra-overpay",
        name: "The payer lost the same amount the other side gained",
        plainExplanation: UE_DEPRIVATION + "This part of the checklist is about the extra money leaving the payer's account.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The payer's records",
            why: "Shows the loss matches what was received.",
            examples: ["The payer's bank statement", "Accounting records"],
          },
        ],
      },
      {
        id: "no-reason-to-keep-overpay",
        name: "There was no reason in law or justice to keep the extra",
        plainExplanation:
          UE_NO_REASON + "This part of the checklist is about whether any agreement covered the extra amount.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: GARLAND, pinpoint: "Garland v. Consumers' Gas Co., 2004 SCC 25, para. 44" }],
        evidenceCategories: [
          {
            name: "Requests for a refund",
            why: "Records that the overpayment was pointed out and what the answer was.",
            examples: ["Emails or letters asking for a refund", "Customer-service chat records", "Any reply refusing"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "says-money-was-owed-overpay",
        name: "The other side says the extra money was owed under an agreement",
        plainExplanation:
          "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said juristic reasons to deny " +
          "recovery may be the intention to make a gift (a \"donative intent\"), a contract, or a " +
          "disposition of law (para. 41). " +
          UE_RESIDUAL,
        whenThisComesUp:
          "When the Defence says the amount was owed -- for example under a contract, a fee or a later " +
          "bill -- rather than paid by mistake.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: GARLAND, pinpoint: "Garland v. Consumers' Gas Co., 2004 SCC 25, paras. 45-46" }],
      },
      {
        id: "change-of-position-overpay",
        name: "The other side says it already used the money in good faith",
        plainExplanation:
          "In Garland v. Consumers' Gas Co., 2004 SCC 25, the Supreme Court of Canada described the " +
          "change of position defence: restitution is refused where an innocent defendant " +
          "demonstrates that it has materially changed its position as a result of an enrichment " +
          "such that it would be inequitable to require the benefit to be returned (para. 63). The " +
          "Court said that where a defendant has obtained the enrichment through some wrongdoing of " +
          "his own, he cannot then assert that it would be unjust to return the enrichment to the " +
          "plaintiff (para. 65), and it left a fuller development of the other elements of this " +
          "defence to future cases (para. 66).",
        whenThisComesUp: "When the Defence says the extra money was passed on or spent before anyone knew of the mistake.",
        sourceUrl: GARLAND,
        verifiedAt: VERIFIED,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: START_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: VERIFIED, consolidationPeriod: LIMITATIONS_CONSOLIDATION },
    ],
    signals: [
      "paid twice",
      "paid the bill twice",
      "duplicate payment",
      "double payment",
      "overpaid",
      "paid more than i owed",
      "charged twice for the same",
      "won't refund the overpayment",
      "credit balance on my account",
    ],
    typicalDefendantProfile: "either",
    citations: [KERR_CITATION, GARLAND_CITATION, LIMITATION_CITATION],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-unpaid-commission-or-expenses",
    name: "Unpaid commission, bonus or expenses",
    broughtBy:
      "An employee, former employee or sales agent who is owed commission, a bonus, or repayment of " +
      "work expenses. Not an employer suing a worker.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "payment-owed-under-agreement-commission",
        name: "The commission, bonus or expense repayment was owed under the agreement",
        plainExplanation:
          "Under s. 1(1) of the Employment Standards Act, 2000, \"wages\" means monetary remuneration " +
          "payable by an employer to an employee under the terms of an employment contract, oral or " +
          "written, express or implied, and any payment the Act requires. Wages do not include sums " +
          "paid as gifts or bonuses that are dependent on the discretion of the employer and are not " +
          "related to hours, production or efficiency, or expenses and travelling allowances. " +
          BURDEN +
          "This part of the checklist is about the commission plan, bonus terms or expense policy, " +
          "and what was earned or spent under it.",
        sourceUrl: ESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ESA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: SCJ_STEPS, pinpoint: "Superior Court of Justice, Steps in a civil case (burden of proof)" }],
        evidenceCategories: [
          {
            name: "The terms",
            why: "Shows how the commission, bonus or expense repayment was to be worked out.",
            examples: ["Employment or agency contract", "Commission plan or bonus letter", "Expense policy"],
          },
          {
            name: "What was earned or spent",
            why: "Shows the sales, targets or costs the payment depends on.",
            examples: ["Sales reports or closed deals", "Expense receipts and claim forms", "Mileage logs"],
          },
        ],
      },
      {
        id: "amount-unpaid-commission",
        name: "The amount owed and not paid",
        plainExplanation:
          AMOUNT +
          "Under s. 11(5) of the Employment Standards Act, 2000, when employment ends the employer " +
          "pays any wages the employee is entitled to no later than the later of seven days after the " +
          "employment ends and the day that would have been the employee's next pay day. This part of " +
          "the checklist is about the amount claimed and how it was calculated.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: ESA, pinpoint: "Employment Standards Act, 2000, s. 11(5)" }],
        evidenceCategories: [
          {
            name: "Pay records",
            why: "Shows what was paid and what was left out.",
            examples: ["Pay stubs", "Record of Employment", "Bank deposits"],
          },
          {
            name: "Requests for payment",
            why: "Records that the amount was asked for.",
            examples: ["Emails to the employer or principal", "Submitted expense claims and their status"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "discretionary-bonus-commission",
        name: "The employer says the bonus was discretionary, or the expense was not covered",
        plainExplanation:
          DEFENCE +
          "Under s. 1(1) of the Employment Standards Act, 2000, \"wages\" do not include sums paid as " +
          "gifts or bonuses that are dependent on the discretion of the employer and are not related " +
          "to hours, production or efficiency, or expenses and travelling allowances.",
        whenThisComesUp:
          "When the Defence says the bonus was at the employer's discretion, or that the expenses were " +
          "not approved or not covered by any policy.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: ESA, pinpoint: "Employment Standards Act, 2000, s. 1(1), \"wages\"" }],
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 97(1) of the Employment Standards Act, 2000, an employee who files a complaint " +
          "under the Act about an alleged failure to pay wages may not start a civil proceeding about " +
          "the same matter, unless the complaint is withdrawn within two weeks after it is filed " +
          "(s. 97(4)). Under s. 98(1), an employee who starts a civil proceeding about an alleged " +
          "failure to pay wages may not file a complaint about the same matter or have one " +
          "investigated.",
        sourceUrl: ESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ESA_CONSOLIDATION,
      },
      {
        note:
          "Under s. 8(2) of the Employment Standards Act, 2000, where an employee starts a civil " +
          "proceeding against their employer under the Act, notice of the proceeding is served on the " +
          "Director on a form approved by the Director, on or before the date the proceeding is set " +
          "down for trial.",
        sourceUrl: ESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ESA_CONSOLIDATION,
      },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: VERIFIED, consolidationPeriod: LIMITATIONS_CONSOLIDATION },
    ],
    signals: [
      "unpaid commission",
      "commission i earned",
      "owed commission",
      "sales commission",
      "bonus they promised",
      "never paid my bonus",
      "expenses not reimbursed",
      "never reimbursed my expenses",
      "mileage was not paid",
      "commission after i left",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Employment Standards Act, 2000, S.O. 2000, c. 41",
        officialUrl: ESA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 1(1) \"wages\"; s. 8(2); s. 11(5); ss. 97-98",
      },
      SC_GUIDE_CITATION,
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-settlement-agreement-unpaid",
    name: "Money owed under a settlement or repayment agreement",
    broughtBy:
      "The person owed money under a settlement or repayment plan that the other side agreed to and " +
      "then did not pay.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "agreement-reached-settlement",
        name: "A settlement or repayment agreement was reached",
        plainExplanation:
          BURDEN +
          "If the settlement was made in a Small Claims Court case, rule 14.01.1(1) of the Rules of " +
          "the Small Claims Court says an offer to settle, an acceptance of an offer to settle and a " +
          "notice of withdrawal of an offer to settle shall be in writing, and rule 14.01.1(3) says " +
          "the terms of an accepted offer may be set out in terms of settlement (Form 14D). This part " +
          "of the checklist is about the agreement and its payment terms.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: SC_RULES, pinpoint: "Rules of the Small Claims Court, r. 14.01.1(1) and (3)" }],
        evidenceCategories: [
          {
            name: "The agreement",
            why: "Shows what was agreed and when payments were due.",
            examples: ["Signed settlement or minutes of settlement", "Offer to settle and acceptance (Forms 14A and 14B)", "Terms of settlement (Form 14D)"],
          },
          {
            name: "How it was agreed",
            why: "Supports an agreement that was not in a single signed document.",
            examples: ["Emails or texts agreeing to the plan", "A letter confirming the terms"],
          },
        ],
      },
      {
        id: "payments-missed-settlement",
        name: "The payments were not made as agreed",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about each payment that was due, what was paid, and what is " +
          "still owing.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Payment history",
            why: "Shows which payments were made and which were missed.",
            examples: ["Bank records of payments received", "A dated list of missed payments"],
          },
          {
            name: "Notice of the missed payments",
            why: "Records that the other side was told.",
            examples: ["Messages or letters about the default"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "disputes-terms-or-payment-settlement",
        name: "The other side says the terms were different, or that it has paid",
        plainExplanation: DEFENCE + "This topic is about a Defence whose reasons dispute the terms agreed or the amount still owed.",
        whenThisComesUp: "When the Defence disputes what was agreed, or says payments were made that are not counted.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under rule 14.06 of the Rules of the Small Claims Court, if a party to an accepted offer to " +
          "settle fails to comply with its terms, the other party may make a motion to the court for " +
          "judgment in the terms of the accepted offer, or continue the proceeding as if there had " +
          "been no offer to settle.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        note:
          "Under rule 9.03 of the Rules of the Small Claims Court, a defendant who admits liability " +
          "may propose terms of payment in the Defence. If the plaintiff does not dispute the proposal " +
          "within 20 days after service of the Defence, the defendant makes payment as proposed as if " +
          "it were a court order. If the defendant fails to pay, the plaintiff may serve a notice of " +
          "default of payment (Form 20L), and the clerk signs judgment for the unpaid balance of the " +
          "undisputed amount on the filing of an affidavit of default of payment (Form 20M) swearing " +
          "that the defendant failed to pay as proposed, to the amount paid and the unpaid balance, and " +
          "that 15 days have passed since the defendant was served with the notice of default.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      { note: ACKNOWLEDGMENT_NOTE, sourceUrl: LIMITATIONS, verifiedAt: VERIFIED, consolidationPeriod: LIMITATIONS_CONSOLIDATION },
    ],
    signals: [
      "settlement agreement",
      "minutes of settlement",
      "signed a settlement",
      "accepted offer to settle",
      "repayment agreement",
      "agreed to a payment plan",
      "stopped making the payments we agreed",
      "missed payments under our agreement",
      "agreed to pay in instalments",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Rules of the Small Claims Court, O. Reg. 258/98",
        officialUrl: SC_RULES,
        verifiedAt: VERIFIED,
        pinpoint: "r. 9.03 (terms of payment); r. 14.01.1 and 14.06 (offers to settle)",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        pinpoint: "s. 13(1), (9)-(11): acknowledgment and part payment",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-promissory-note-unpaid",
    name: "An unpaid promissory note",
    broughtBy: "The person holding a signed promissory note (a written promise to pay) that has not been paid.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "signed-note-promnote",
        name: "There is a signed promissory note",
        plainExplanation:
          "Under s. 176(1) of the Bills of Exchange Act, a promissory note is an unconditional promise " +
          "in writing made by one person to another person, signed by the maker, engaging to pay, on " +
          "demand or at a fixed or determinable future time, a sum certain in money to, or to the " +
          "order of, a specified person or to bearer. Under s. 185(a), the maker of a note, by making " +
          "it, engages that he will pay it according to its tenor. Under s. 179(2), where a note bears " +
          "the words \"I promise to pay\" and is signed by two or more persons, it is deemed to be " +
          "their joint and several note. Ontario's Small Claims Court guide says a copy of the " +
          "supporting documents is attached to the claim (if they are not attached, the claim gives " +
          "the reasons why).",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: BEA, pinpoint: "Bills of Exchange Act, ss. 176(1), 179(2) and 185(a)" }],
        evidenceCategories: [
          {
            name: "The note itself",
            why: "Shows the promise, the amount, the signature and when it is payable.",
            examples: ["The original signed note", "A copy for the claim", "Any schedule of payments attached to it"],
          },
          {
            name: "The money behind it",
            why: "Shows what the note was given for.",
            examples: ["Record of the money advanced", "Messages about the loan"],
          },
        ],
      },
      {
        id: "payment-due-promnote",
        name: "Payment came due and was not made",
        plainExplanation:
          "A promissory note is payable on demand or at a fixed or determinable future time (Bills of " +
          "Exchange Act, s. 176(1)). Under s. 183(3), when no place of payment is specified in the " +
          "body of the note, presentment for payment is not necessary in order to render the maker " +
          "liable. Under s. 5(3) of the Limitations Act, 2002, for a demand obligation the day the " +
          "loss occurs is the first day there is a failure to perform the obligation once a demand " +
          "for performance is made; under s. 5(4) this applies to every demand obligation created on " +
          "or after January 1, 2004. The two-year period in s. 4 runs from the day the claim is " +
          "discovered.",
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
        alsoCites: [{ sourceUrl: BEA, pinpoint: "Bills of Exchange Act, ss. 176(1) and 183(3)" }],
        evidenceCategories: [
          {
            name: "The due date or the demand",
            why: "Shows when payment was owed.",
            examples: ["The due date written on the note", "A written demand for payment, with its date", "Proof the demand was sent"],
          },
        ],
      },
      {
        id: "amount-unpaid-promnote",
        name: "The amount still unpaid on the note",
        plainExplanation:
          AMOUNT + "This part of the checklist is about the amount of the note, any payments made, and any interest it states.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Payments and interest",
            why: "Shows how the balance was worked out.",
            examples: ["Records of any payments received", "The interest rate written on the note"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "endorser-not-maker-promnote",
        name: "The person sued endorsed the note rather than making it",
        plainExplanation:
          DEFENCE +
          "Under s. 184(1) of the Bills of Exchange Act, presentment for payment is necessary in order " +
          "to render the endorser of a note liable, and under s. 184(2), where a note is in the body of " +
          "it made payable at a particular place, presentment at that place is necessary in order to " +
          "render an endorser liable.",
        whenThisComesUp: "When the person sued signed the back of the note as an endorser, not as its maker.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: BEA, pinpoint: "Bills of Exchange Act, s. 184(1)-(2)" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: START_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      { note: ACKNOWLEDGMENT_NOTE, sourceUrl: LIMITATIONS, verifiedAt: VERIFIED, consolidationPeriod: LIMITATIONS_CONSOLIDATION },
    ],
    signals: [
      "promissory note",
      "signed a note promising to pay",
      "signed an iou",
      "note payable on demand",
      "i promise to pay",
      "note is overdue",
      "won't pay the note",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Bills of Exchange Act, R.S.C. 1985, c. B-4",
        officialUrl: BEA,
        verifiedAt: VERIFIED,
        pinpoint: "Part IV, ss. 176(1), 179(2), 183(3), 184 and 185",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 4, 5(3)-(4) (demand obligations) and 13 (acknowledgment)",
      },
      SC_GUIDE_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-joint-expense-share",
    name: "Someone's share of a shared cost",
    broughtBy:
      "The person who paid a shared bill or cost -- with a roommate, friend, relative or co-owner -- " +
      "and wants the other person's share.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "agreed-to-share-jointexp",
        name: "What was agreed about sharing the cost",
        plainExplanation:
          BURDEN + "This part of the checklist is about the cost, who agreed to pay what share, and how that was agreed.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The agreement to share",
            why: "Shows who agreed to pay which part.",
            examples: ["Messages agreeing to split", "A shared spreadsheet or budgeting app", "A written roommate or cost-sharing agreement"],
          },
          {
            name: "Past sharing",
            why: "Supports an informal arrangement that was followed before.",
            examples: ["Earlier payments of their share", "Transfer memos naming the bill"],
          },
        ],
      },
      {
        id: "paid-their-share-jointexp",
        name: "The plaintiff paid a share that was the other person's to pay",
        plainExplanation:
          UE_TEST +
          "The Court said the benefit may be positive, or negative in the sense that the benefit " +
          "conferred on the defendant spares him or her an expense he or she would have had to " +
          "undertake (para. 38). It also said the third element means there is no reason in law or " +
          "justice for the defendant's retention of the benefit conferred by the plaintiff (para. 40). " +
          "This part of the checklist is about each bill paid and whose share it covered.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The bills and who paid them",
            why: "Shows the cost and that the plaintiff paid it.",
            examples: ["Invoices or bills", "Bank or card statements", "Receipts"],
          },
        ],
      },
      {
        id: "amount-of-share-jointexp",
        name: "The amount of the other person's share still owing",
        plainExplanation: AMOUNT + "This part of the checklist is about how the share was calculated and anything already paid.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The calculation",
            why: "Shows how the amount claimed was worked out.",
            examples: ["A list of each bill and the share owed", "Records of anything paid back"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "disputes-share-jointexp",
        name: "The other person disputes their share, or says it was a gift",
        plainExplanation:
          DEFENCE +
          "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said juristic reasons to deny " +
          "recovery may be the intention to make a gift (a \"donative intent\"), a contract, or a " +
          "disposition of law (para. 41).",
        whenThisComesUp:
          "When the Defence says a different split was agreed, that the cost was not theirs, or that the " +
          "plaintiff paid it as a gift.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: KERR, pinpoint: "Kerr v. Baranow, 2011 SCC 10, para. 41" }],
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: START_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: VERIFIED, consolidationPeriod: LIMITATIONS_CONSOLIDATION },
    ],
    signals: [
      "agreed to split the cost",
      "split the bills",
      "won't pay their share",
      "won't pay his share",
      "won't pay her share",
      "their half of the bill",
      "shared expenses",
      "roommate owes me for utilities",
      "split the cost of the trip",
    ],
    typicalDefendantProfile: "individual",
    citations: [SC_GUIDE_CITATION, KERR_CITATION, LIMITATION_CITATION],
    reviewedAt: null,
    status: "draft",
  },
];
