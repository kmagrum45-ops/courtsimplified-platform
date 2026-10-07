/**
 * Case types, batch "sc-goods-and-services-1" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-goods-and-services-1.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-contractor-poor-or-incomplete-work -- A contractor did poor or unfinished work
 *   sc-claim-contractor-took-deposit-and-left -- A contractor took a deposit and disappeared
 *   sc-claim-homeowner-wont-pay-contractor -- A homeowner will not pay the contractor
 *   sc-claim-defective-product -- Something bought that does not work
 *   sc-claim-used-vehicle-private-sale -- A used car bought privately
 *   sc-claim-new-vehicle-defects -- Defects in a new vehicle
 *   sc-claim-new-home-defects -- Defects in a newly built home
 *   sc-claim-home-inspector-missed-defects -- A home inspector who missed something
 *   sc-claim-undisclosed-defects-after-purchase -- Problems found after buying a house
 *   sc-claim-real-estate-deposit-dispute -- A real estate deposit in dispute
 *
 * Every legal statement below rests on text saved in this repository: the
 * vendored corpus (docs/sources/corpus/, url from manifest.json) or a decision
 * saved under docs/sources/. Two planned types are NOT written:
 *   - sc-claim-new-home-defects: the new-home warranty is statutory (the
 *     Ontario New Home Warranties Plan Act), and that Act is not saved. The only
 *     saved text about it is tarion.com's homeowner page, which is not an
 *     official domain the checks accept. Writing the type without the Act would
 *     leave out the rules that decide it.
 *   - sc-claim-undisclosed-defects-after-purchase: nothing saved states what a
 *     seller of a house must disclose or when a buyer can recover for a hidden
 *     defect. The Sale of Goods Act covers goods, not land, and the Consumer
 *     Protection Act, 2002 does not apply to the purchase or sale of real
 *     property (s. 2(2)(f)). Queen v. Cognos (negligent misrepresentation) is
 *     saved, but on its own it would present a partial rule as the whole one.
 * Notes on what was written:
 *   - Queen v. Cognos is Iacobucci J. for himself and Sopinka J.; La Forest J.
 *     agreed subject to his companion-case reasons. Said so wherever it is cited.
 *   - Jesan Real Estate v. Doyle, 2020 ONCA 714 (Feldman J.A., two judges
 *     agreeing) is read from docs/sources/decisions/. Its relief-from-forfeiture
 *     test is quoted from Azzarello v. Shawqi, which is not saved, so it is
 *     attributed to Jesan quoting Azzarello.
 *   - Which court may grant relief from forfeiture is not settled by the saved
 *     text (CJA s. 96(3) bars Small Claims from equitable relief "unless otherwise
 *     provided"; s. 98 says "a court"). The note says both and decides nothing.
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
const CPA = "https://www.ontario.ca/laws/docs/02c30_e.doc";
const CPA_CONSOLIDATION = "2025-12-11";
const CPA_REG = "https://www.ontario.ca/laws/docs/050017_e.doc";
const CPA_REG_CONSOLIDATION = "2026-06-10";
const SGA = "https://www.ontario.ca/laws/docs/90s01_e.doc";
const SGA_CONSOLIDATION = "1994-12-09";
const CONSTRUCTION = "https://www.ontario.ca/laws/docs/90c30_e.doc";
const CONSTRUCTION_CONSOLIDATION = "2026-01-01";
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const CJA_CONSOLIDATION = "2025-12-11";
const HTA = "https://www.ontario.ca/laws/docs/90h08_e.doc";
const HTA_CONSOLIDATION = "2026-07-01";
const MVDA = "https://www.ontario.ca/laws/docs/02m30_e.doc";
const MVDA_CONSOLIDATION = "2023-12-04";
const MVDA_REG = "https://www.ontario.ca/laws/docs/080333_e.doc";
const MVDA_REG_CONSOLIDATION = "2025-01-01";
const CONDO = "https://www.ontario.ca/laws/docs/98c19_e.doc";
const CONDO_CONSOLIDATION = "2025-12-31";
const COGNOS = "docs/sources/queen-v-cognos-inc-1993-1-SCR-87.pdf";
const JESAN = "docs/sources/decisions/jesan-real-estate-v-doyle-2020-ONCA-714.txt";

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

const LIMITATION_NOTE =
  "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
  "cannot be started after the second anniversary of the day the claim was discovered. Section " +
  "5(1) says when a claim is discovered: the earlier of the day the person first knew that the " +
  "injury, loss or damage had occurred, that it was caused or contributed to by an act or " +
  "omission, that the act or omission was that of the person the claim is against, and that, " +
  "having regard to the nature of the injury, loss or damage, a proceeding would be an " +
  "appropriate means to seek to remedy it -- and the day a reasonable person with their " +
  "abilities and in their circumstances first ought to have known those things. Under s. 5(2), " +
  "a person with a claim is presumed to have known of those matters on the day the act or " +
  "omission the claim is based on took place, unless the contrary is proved.";

const FORM_7A_NOTE =
  "This kind of claim is started in the Small Claims Court with a Plaintiff's Claim (Form 7A). " +
  "Ontario's Small Claims Court guide says the reasons for the claim should \"give a full " +
  "explanation of what happened, including the dates and places and nature of the occurrences " +
  "involved.\"";

const CPA_SCOPE =
  "Under s. 1 of the Consumer Protection Act, 2002, a \"consumer\" is an individual acting for " +
  "personal, family or household purposes, not for business purposes, and a \"consumer " +
  "agreement\" is an agreement in which a supplier -- a person in the business of supplying goods " +
  "or services -- agrees to supply goods or services for payment. Under s. 2(1), the Act applies " +
  "to consumer transactions if the consumer or the person dealing with the consumer is located in " +
  "Ontario when the transaction takes place. ";

const CPA_ESTIMATE =
  "Under s. 10(1) of the Consumer Protection Act, 2002, if a consumer agreement includes an " +
  "estimate, the supplier shall not charge the consumer an amount that exceeds the estimate by " +
  "more than 10 per cent. If the supplier does, the consumer may require that the supplier " +
  "provide the goods or services at the estimated price (s. 10(2)). Under s. 10(3), nothing in " +
  "that section prevents the consumer and the supplier from agreeing to amend the estimate or " +
  "price if the consumer requires additional or different goods or services.";

const SGA_QUALITY =
  "Under s. 15 of the Sale of Goods Act, subject to the Act and any statute in that behalf, there " +
  "is no implied warranty or condition as to the quality or fitness for any particular purpose of " +
  "goods supplied under a contract of sale, except as the section lists. Two of the exceptions: " +
  "where goods are bought by description from a seller who deals in goods of that description " +
  "(whether the seller is the manufacturer or not), there is an implied condition that the goods " +
  "will be of merchantable quality (para. 2); and where the buyer, expressly or by implication, " +
  "makes known to the seller the particular purpose for which the goods are required so as to show " +
  "that the buyer relies on the seller's skill or judgment, and the goods are of a description " +
  "that it is in the course of the seller's business to supply, there is an implied condition " +
  "that the goods will be reasonably fit for that purpose -- but not for a specified article sold " +
  "under its patent or other trade name (para. 1). Under para. 4, an express warranty or condition " +
  "does not negative a warranty or condition implied by the Act unless inconsistent with it. Under " +
  "s. 1(1), \"quality of goods\" includes their state or condition.";

const SGA_DAMAGES =
  "Under s. 51(1) of the Sale of Goods Act, where there is a breach of warranty by the seller, or " +
  "the buyer elects, or is compelled, to treat a breach of a condition as a breach of warranty, " +
  "the buyer may set up the breach against the seller in diminution or extinction of the price, or " +
  "maintain an action against the seller for damages for the breach. The measure of damages is " +
  "the estimated loss directly and naturally resulting in the ordinary course of events from the " +
  "breach (s. 51(2)). For a breach of warranty of quality, that loss is, in the absence of evidence " +
  "to the contrary, the difference between the value of the goods at the time of delivery to the " +
  "buyer and the value they would have had if they had answered to the warranty (s. 51(3)).";

const SGA_ACCEPTED =
  "Under s. 12(3) of the Sale of Goods Act, where a contract of sale is not severable and the " +
  "buyer has accepted the goods or part of them, the breach of any condition to be fulfilled by " +
  "the seller can only be treated as a breach of warranty, and not as a ground for rejecting the " +
  "goods and treating the contract as repudiated, unless there is a term of the contract, express " +
  "or implied, to that effect. Under s. 34, the buyer is deemed to have accepted the goods when " +
  "the buyer tells the seller they have been accepted, does any act in relation to them after " +
  "delivery that is inconsistent with the ownership of the seller, or, after the lapse of a " +
  "reasonable time, keeps the goods without telling the seller they have been rejected. Under " +
  "s. 51(1), a buyer in that position may still set up the breach of warranty against the price " +
  "or bring an action for damages for it.";

const COGNOS_TEST =
  "In Queen v. Cognos Inc., [1993] 1 S.C.R. 87, a case about statements made to a job applicant " +
  "in a hiring interview, Justice Iacobucci (writing for himself and Justice Sopinka; Justice La " +
  "Forest said he agreed with Justices Iacobucci and McLachlin, subject to his reasons in a " +
  "companion case) listed five general requirements for a negligent misrepresentation claim: (1) " +
  "a duty of care based on a \"special relationship\" between the person who made the statement " +
  "and the person who received it; (2) the statement must be untrue, inaccurate, or misleading; " +
  "(3) the person who made it must have acted negligently in making it; (4) the person who " +
  "received it must have relied on it in a reasonable manner; and (5) the reliance must have been " +
  "detrimental, in the sense that damages resulted (p. 110). ";

export const TYPES_SC_GOODS_AND_SERVICES_1: ClaimType[] = [
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-contractor-poor-or-incomplete-work",
    name: "A contractor did poor or unfinished work",
    broughtBy:
      "The customer who hired a contractor or tradesperson for work on their home or property, where the work was done badly or left unfinished. Not the contractor who is owed money.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "agreement-for-the-work-cpw",
        name: "What the contractor agreed to do",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about what the contractor agreed to do, for what price, " +
          "and by when, and the records that show it.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The agreement or estimate",
            why: "Shows the work that was agreed, the price and the schedule.",
            examples: ["Signed contract or quote", "Written estimate", "Texts or emails agreeing on the job"],
          },
          {
            name: "Payment records",
            why: "Shows what was paid and when.",
            examples: ["E-transfer or bank records", "Receipts", "Cheque images"],
          },
        ],
      },
      {
        id: "reasonably-acceptable-quality-cpw",
        name: "The work was not of a reasonably acceptable quality, or was not finished",
        plainExplanation:
          "Under s. 9(1) of the Consumer Protection Act, 2002, the supplier is deemed to warrant that " +
          "the services supplied under a consumer agreement are of a reasonably acceptable quality. " +
          CPA_SCOPE +
          "Under s. 9(3), any term or acknowledgement that purports to negate or vary a deemed " +
          "condition or warranty under the Act is void. This part of the checklist is about what was " +
          "wrong with the work, or what was left undone.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Photos or video of the work",
            why: "Records the condition of the work and what was left unfinished.",
            examples: ["Dated photos of the problems", "Video walk-through", "Photos taken when the contractor stopped coming"],
          },
          {
            name: "An independent opinion",
            why: "Describes the problems and what it takes to fix or finish them.",
            examples: ["Report or quote from another contractor", "Building inspector's notes", "Written list of deficiencies"],
          },
          {
            name: "Messages about the problems",
            why: "Shows when the contractor was told and how they answered.",
            examples: ["Texts or emails listing the problems", "Requests to come back and fix the work", "Replies or silence"],
          },
        ],
      },
      {
        id: "amount-cpw",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost of fixing or finishing the work, what was " +
          "already paid, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Cost to fix or finish",
            why: "Supports the dollar amount claimed.",
            examples: ["Invoices from the contractor who fixed or finished the work", "Written quotes", "Receipts for materials"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-quality-cpw",
        name: "The contractor disputes that the work was poor or unfinished",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the work was done properly, or was " +
          "finished as agreed.",
        whenThisComesUp: "When the contractor files a Defence (Form 9A) saying the work met the agreement.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        id: "estimate-exceeded-cpw",
        name: "The contractor says more money is owed than the estimate",
        plainExplanation: CPA_ESTIMATE,
        whenThisComesUp:
          "When the contractor says the customer owes more than the estimate, or claims the extra amount back from the customer.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
      "defence-failure-to-mitigate",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "contractor did a bad job",
      "poor workmanship",
      "renovation was never finished",
      "contractor left the job unfinished",
      "work was not done properly",
      "had to hire someone else to fix it",
      "shoddy work",
      "the job was only half done",
      "deficiencies in the renovation",
      "contractor won't come back to fix it",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 9(1) (services deemed warranted to be of reasonably acceptable quality); s. 9(3); s. 10 (estimates); ss. 1, 2(1)",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 4, 5(1), 5(2)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-contractor-took-deposit-and-left",
    name: "A contractor took a deposit and disappeared",
    broughtBy:
      "The customer who paid a contractor a deposit for work that was never started, and wants the deposit back.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "agreement-and-deposit-dtl",
        name: "An agreement was made and a deposit was paid",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the agreement, the deposit that was paid, and the " +
          "start date that was agreed (if one was).",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The agreement",
            why: "Shows the work, the price and any start date.",
            examples: ["Signed contract or quote", "Texts or emails agreeing on the job and start date"],
          },
          {
            name: "Proof the deposit was paid",
            why: "Shows how much was paid, to whom and when.",
            examples: ["E-transfer confirmation", "Bank or credit card statement", "Receipt"],
          },
        ],
      },
      {
        id: "work-not-started-cancelled-dtl",
        name: "The work did not start, and the agreement was cancelled",
        plainExplanation:
          "Under s. 1 of the Consumer Protection Act, 2002, a \"future performance agreement\" is a " +
          "consumer agreement in respect of which delivery, performance or payment in full is not made " +
          "when the parties enter the agreement. Under s. 26(1)(b), a consumer may cancel a future " +
          "performance agreement at any time before performance begins if the supplier does not begin " +
          "performance within 30 days after the commencement date specified in the agreement, or an " +
          "amended commencement date the consumer agreed to in writing. If no commencement date is " +
          "specified, the consumer may cancel at any time before commencement if the supplier does not " +
          "commence performance within 30 days after the date the agreement is entered into (s. 26(2)). " +
          "Sections 22 to 26 apply where the consumer's total potential payment obligation under the " +
          "agreement, excluding the cost of borrowing, exceeds a prescribed amount (s. 21(1)); O. Reg. " +
          "17/05, s. 23.1 prescribes $50 for an agreement that is not a gift card agreement. Under s. 94, " +
          "the consumer cancels by giving notice in accordance with s. 92, and the cancellation takes " +
          "effect when the notice is given. Under s. 92, the notice may be expressed in any way, as long " +
          "as it indicates the consumer's intention to seek the remedy being requested, and unless the " +
          "regulations require otherwise it may be oral or in writing and given by any means.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 23.1" }],
        evidenceCategories: [
          {
            name: "Proof the work never started",
            why: "Shows that nothing was done by the agreed date, or within 30 days.",
            examples: ["Dated photos of the untouched site", "Messages asking when the work will start", "Notes of no-shows"],
          },
          {
            name: "The cancellation notice",
            why: "Shows the agreement was cancelled, how, and when.",
            examples: ["Copy of the email, text or letter cancelling", "Proof it was sent"],
          },
        ],
      },
      {
        id: "refund-not-made-dtl",
        name: "The deposit was not refunded after the cancellation",
        plainExplanation:
          "Under s. 96(1) of the Consumer Protection Act, 2002, if a consumer cancels a consumer " +
          "agreement, the supplier shall, in accordance with the prescribed requirements, refund to the " +
          "consumer any payment made under the agreement or any related agreement. O. Reg. 17/05, " +
          "s. 79(1) says the supplier shall do so within 15 days after the day the consumer gives notice " +
          "of cancellation in accordance with s. 92 of the Act. Under s. 96(6), if a consumer has " +
          "cancelled a consumer agreement and the supplier has not met its obligations under s. 96(1), " +
          "the consumer may commence an action.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 79(1)" }],
        evidenceCategories: [
          {
            name: "Requests for the refund",
            why: "Shows the refund was asked for and not paid.",
            examples: ["Messages asking for the deposit back", "Demand letter", "Any reply from the contractor"],
          },
        ],
      },
      {
        id: "amount-dtl",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT + "This part of the checklist is about the deposit paid and any part of it already returned.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Payment and refund records",
            why: "Supports the dollar amount claimed.",
            examples: ["Deposit receipt or transfer record", "Record of any partial refund"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "late-start-accepted-dtl",
        name: "The contractor says the customer accepted a later start, or turned the crew away",
        plainExplanation:
          "Under s. 26(3) of the Consumer Protection Act, 2002, if, after the 30-day period has " +
          "expired, the consumer agrees to accept delivery or authorize commencement, the consumer may " +
          "not cancel the agreement under that section. Under s. 26(4)(b), a supplier is considered to " +
          "have commenced performance if commencement was attempted but was refused by the consumer at " +
          "the time, or was attempted but did not occur because no person was available to enable " +
          "commencement on the day for which reasonable notice was given to the consumer that " +
          "commencement was to occur.",
        whenThisComesUp:
          "When the contractor's Defence says the customer agreed to a later start date, or that the crew came and was refused or could not get in.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
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
          "If the agreement was negotiated or concluded in person somewhere other than the supplier's " +
          "place of business (a \"direct agreement\", Consumer Protection Act, 2002, s. 20(1)), s. 43(1) " +
          "separately lets the consumer cancel it without any reason from the date of entering into it " +
          "until 10 days after receiving the written copy, and s. 43(2) lets the consumer cancel within " +
          "one year after entering into it if they did not receive a copy that meets the requirements of " +
          "s. 42. These sections apply where the consumer's total potential payment obligations, " +
          "excluding the cost of borrowing, exceed a prescribed amount (s. 41(1)); O. Reg. 17/05, s. 34 " +
          "prescribes $50. Under s. 101, if a consumer is required to give notice under the Act to " +
          "obtain a remedy, a court may disregard the requirement to give the notice, or any requirement " +
          "relating to it, if it is in the interest of justice to do so.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 34" }],
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "contractor took my deposit and never started",
      "contractor disappeared with my deposit",
      "paid a deposit and the contractor never showed up",
      "contractor never started the work",
      "contractor stopped answering after I paid the deposit",
      "never came to start the job",
      "want my deposit back from the contractor",
      "contractor ghosted me after taking the deposit",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 1 (future performance agreement); s. 21(1); s. 26 (late delivery or commencement); ss. 43, 92, 94, 96(1), 96(6), 101",
      },
      {
        sourceName: "O. Reg. 17/05 (General), Consumer Protection Act, 2002",
        officialUrl: CPA_REG,
        verifiedAt: VERIFIED,
        pinpoint: "s. 23.1 ($50 threshold); s. 34 ($50 threshold); s. 79(1) (refund within 15 days of the cancellation notice)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-homeowner-wont-pay-contractor",
    name: "A homeowner will not pay the contractor",
    broughtBy:
      "The contractor or tradesperson who did work on someone's home or property and has not been paid. Not the customer who paid for work that went wrong.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "agreement-and-price-hwp",
        name: "The work and the price were agreed",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the work that was agreed, the price, and the payment " +
          "terms, and the records that show them.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The agreement",
            why: "Shows the work, the price and when payment was due.",
            examples: ["Signed contract or quote", "Written estimate accepted by the owner", "Texts or emails agreeing on the job"],
          },
          {
            name: "Changes to the job",
            why: "Shows any extra or different work the owner asked for, and the price agreed for it.",
            examples: ["Signed change orders", "Messages asking for extra work"],
          },
        ],
      },
      {
        id: "proper-invoice-hwp",
        name: "The work was done and a proper invoice was given",
        plainExplanation:
          "Under s. 6.1(1) of the Construction Act (Part I.1, prompt payment), a \"proper invoice\" is a " +
          "written bill or other request for payment for services or materials in respect of an " +
          "improvement under a contract, if it contains listed information -- including the " +
          "contractor's name and address, the date of the invoice and the period, milestone or other " +
          "payment entitlement it relates to, a description of the services or materials supplied, and " +
          "the amount payable and the payment terms -- and meets any other requirements the contract " +
          "specifies. Under s. 6.1(2), an invoice that does not meet those requirements is deemed to be a " +
          "proper invoice unless, no later than seven days after receiving it, the owner notifies the " +
          "contractor in writing of the deficiency and of what is required to address it. Under " +
          "s. 87.3(4), Part I.1 does not apply to a contract entered into before the day subsection 11(1) " +
          "of the Construction Lien Amendment Act, 2017 came into force, or to some contracts whose " +
          "procurement began before that day.",
        sourceUrl: CONSTRUCTION,
        verifiedAt: VERIFIED,
        consolidationPeriod: CONSTRUCTION_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Proof the work was done",
            why: "Shows the services or materials that were supplied.",
            examples: ["Dated photos of the finished work", "Material receipts and delivery slips", "Sign-off or messages accepting the work"],
          },
          {
            name: "The invoices",
            why: "Shows what was billed, when, and when the owner received it.",
            examples: ["Copies of each invoice", "Email or text sending the invoice", "Any reply about the invoice"],
          },
        ],
      },
      {
        id: "payment-due-hwp",
        name: "Payment was due and was not made",
        plainExplanation:
          "Under s. 6.4(1) of the Construction Act, subject to the giving of a notice of non-payment, an " +
          "owner shall pay the amount payable under a proper invoice no later than 28 days after " +
          "receiving the proper invoice from the contractor. Under s. 6.9, interest begins to accrue on an " +
          "amount that is not paid when it is due under Part I.1, at the prejudgment interest rate " +
          "determined under s. 127(2) of the Courts of Justice Act or, if the contract specifies a " +
          "different interest rate for the purpose, the greater of the two.",
        sourceUrl: CONSTRUCTION,
        verifiedAt: VERIFIED,
        consolidationPeriod: CONSTRUCTION_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Payment history",
            why: "Shows what was paid, what was not, and the dates.",
            examples: ["Bank deposit records", "Statement of account", "Messages asking for payment"],
          },
        ],
      },
      {
        id: "amount-hwp",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT + "This part of the checklist is about the unpaid balance, any interest, and how they are worked out.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Statement of the balance",
            why: "Shows exactly how the amount was calculated.",
            examples: ["Itemized statement of account", "Invoices and payments listed by date"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "notice-of-non-payment-hwp",
        name: "The owner gave a notice of non-payment",
        plainExplanation:
          "Under s. 6.4(2) of the Construction Act, an owner who disputes a proper invoice may refuse to " +
          "pay all or any portion of the amount payable within the 28 days if, no later than 14 days " +
          "after receiving the proper invoice, the owner gives the contractor a notice of non-payment, in " +
          "the prescribed form and manner, specifying the amount of the invoice that is not being paid " +
          "and detailing all of the reasons for non-payment. Under s. 6.4(3), the 28-day requirement " +
          "continues to apply to any amount that is not the subject of the notice.",
        whenThisComesUp: "When the owner says they sent a notice of non-payment disputing the invoice.",
        sourceUrl: CONSTRUCTION,
        verifiedAt: VERIFIED,
        consolidationPeriod: CONSTRUCTION_CONSOLIDATION,
      },
      {
        id: "estimate-exceeded-hwp",
        name: "The homeowner says the bill is more than the estimate",
        plainExplanation: CPA_ESTIMATE,
        whenThisComesUp:
          "When the homeowner says the bill is more than 10 per cent over the estimate they were given.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
      },
      {
        id: "dispute-quality-hwp",
        name: "The homeowner disputes the quality or completion of the work",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the work was unfinished or not done as " +
          "agreed.",
        whenThisComesUp: "When the homeowner files a Defence (Form 9A) raising quality or completion problems.",
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
          "The Construction Act also gives a person who supplies services or materials to an " +
          "improvement for an owner, contractor or subcontractor a lien on the owner's interest in the " +
          "premises improved, for the price of those services or materials (s. 14(1)). Unless preserved " +
          "under s. 34, a contractor's lien expires at the end of the 60-day period set out in s. 31(2) " +
          "-- for example, the 60 days following the date the contract is completed, abandoned or " +
          "terminated, where there is no certificate or declaration of substantial performance. Where the " +
          "lien attaches to the premises, s. 34(1) preserves it by registering a claim for lien on the " +
          "title of the premises in the proper land registry office. Under s. 50(1), a lien claim is " +
          "enforceable in an action in the Superior Court of Justice.",
        sourceUrl: CONSTRUCTION,
        verifiedAt: VERIFIED,
        consolidationPeriod: CONSTRUCTION_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "homeowner won't pay for the renovation",
      "customer won't pay my invoice for the work",
      "finished the job and they won't pay",
      "client refuses to pay for the work I did",
      "homeowner owes me for materials and labour",
      "unpaid renovation invoice",
      "won't pay the balance on the contract",
      "did the work on their house and never got paid",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Construction Act, R.S.O. 1990, c. C.30",
        officialUrl: CONSTRUCTION,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 6.1, 6.4, 6.9 (prompt payment); s. 87.3(4); ss. 14(1), 31(2), 34(1), 50(1) (liens)",
      },
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 10 (estimates)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-defective-product",
    name: "Something bought that does not work",
    broughtBy: "The buyer of an item that does not work, or is not of the quality expected.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "purchase-defp",
        name: "The item was bought, and what it was described as",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the purchase -- who sold the item, how it was " +
          "described, what was paid, and when it was delivered.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Purchase records",
            why: "Shows the seller, the price and the date.",
            examples: ["Receipt or invoice", "Order confirmation", "Bank or credit card statement"],
          },
          {
            name: "How the item was described",
            why: "Shows what the item was sold as.",
            examples: ["Product listing or ad", "Box or packaging", "Messages with the seller about what it does"],
          },
        ],
      },
      {
        id: "not-merchantable-or-fit-defp",
        name: "The item was not of merchantable quality, or not fit for the purpose made known",
        plainExplanation: SGA_QUALITY,
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The defect",
            why: "Records what is wrong and when it showed up.",
            examples: ["Photos or video of the item failing", "Repair technician's report", "Dated notes of each failure"],
          },
          {
            name: "The purpose the seller was told about",
            why: "Relevant if the item was bought for a particular use the seller knew of.",
            examples: ["Messages telling the seller what it was for", "Notes of the conversation in the store"],
          },
        ],
      },
      {
        id: "consumer-implied-terms-defp",
        name: "If bought from a business for personal use: the implied terms cannot be signed away",
        plainExplanation:
          "Under s. 9(2) of the Consumer Protection Act, 2002, the implied conditions and warranties " +
          "applying to the sale of goods by virtue of the Sale of Goods Act are deemed to apply with " +
          "necessary modifications to goods that are leased or traded or otherwise supplied under a " +
          "consumer agreement. Under s. 9(3), any term or acknowledgement, whether part of the consumer " +
          "agreement or not, that purports to negate or vary any implied condition or warranty under the " +
          "Sale of Goods Act, or any deemed condition or warranty under the Consumer Protection Act, " +
          "2002, is void. " +
          CPA_SCOPE.trim(),
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Who the seller was",
            why: "Shows whether the item was bought from a business for personal use.",
            examples: ["Store receipt with business name", "Seller's website or listing"],
          },
          {
            name: "Any \"as is\" or no-warranty wording",
            why: "Shows the terms the seller relies on.",
            examples: ["Receipt or terms printed on the sale", "Return policy", "Warranty card"],
          },
        ],
      },
      {
        id: "loss-defp",
        name: "The loss caused by the defect",
        plainExplanation: SGA_DAMAGES,
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Cost and value records",
            why: "Supports the amount claimed.",
            examples: ["Price paid", "Repair or replacement quotes", "Receipts for costs caused by the defect"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "buyer-examined-defp",
        name: "The seller says the buyer examined the item before buying",
        plainExplanation:
          "Under s. 15, para. 2 of the Sale of Goods Act, the implied condition of merchantable quality " +
          "does not extend to defects that an examination the buyer actually made ought to have " +
          "revealed.",
        whenThisComesUp: "When the seller says the problem was visible and the buyer looked the item over before buying.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
      },
      {
        id: "goods-accepted-defp",
        name: "The seller says the buyer kept and used the item",
        plainExplanation: SGA_ACCEPTED,
        whenThisComesUp: "When the seller says it is too late to return the item because the buyer kept or used it.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
      },
      {
        id: "sold-as-is-defp",
        name: "The seller says the item was sold \"as is\" or without warranty",
        plainExplanation:
          "Under s. 53 of the Sale of Goods Act, where any right, duty or liability would arise under a " +
          "contract of sale by implication of law, it may be negatived or varied by express agreement, " +
          "by the course of dealing between the parties, or by usage if the usage binds both parties. " +
          "For goods supplied under a consumer agreement, s. 9(3) of the Consumer Protection Act, 2002 " +
          "makes void any term or acknowledgement that purports to negate or vary any implied condition " +
          "or warranty under the Sale of Goods Act.",
        whenThisComesUp: "When the seller points to \"as is\", \"final sale\" or \"no warranty\" wording.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA, pinpoint: "Consumer Protection Act, 2002, s. 9(3)" }],
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
      "defence-failure-to-mitigate",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "stopped working after a week",
      "bought it and it doesn't work",
      "broke right after I bought it",
      "appliance is defective",
      "store won't take it back",
      "seller refuses a refund for a broken item",
      "item was faulty",
      "it never worked properly",
      "manufacturing defect",
      "warranty claim was refused",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Sale of Goods Act, R.S.O. 1990, c. S.1",
        officialUrl: SGA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 15 (merchantable quality; fitness for purpose; examination); ss. 12(3), 34 (acceptance); s. 51 (damages); s. 53",
      },
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 9(2)-(3)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-used-vehicle-private-sale",
    name: "A used car bought privately",
    broughtBy:
      "The person who bought a used vehicle from a private seller (not a dealer) and found problems with it.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "not-as-described-uvp",
        name: "The vehicle did not match how it was described",
        plainExplanation:
          "Under s. 14 of the Sale of Goods Act, where there is a contract for the sale of goods by " +
          "description, there is an implied condition that the goods will correspond with the " +
          "description. This part of the checklist is about how the vehicle was described -- in the ad, " +
          "in messages, or in what the seller said -- and how it was different.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The description",
            why: "Shows what the vehicle was sold as.",
            examples: ["Screenshot of the online ad", "Messages with the seller", "Bill of sale"],
          },
          {
            name: "What the vehicle turned out to be",
            why: "Shows the difference from the description.",
            examples: ["Mechanic's inspection report", "Vehicle history report", "Used Vehicle Information Package (UVIP)"],
          },
        ],
      },
      {
        id: "right-to-sell-no-lien-uvp",
        name: "The seller had the right to sell, and the vehicle was free of undisclosed debts",
        plainExplanation:
          "Under s. 13 of the Sale of Goods Act, unless the circumstances of the contract show a " +
          "different intention, there is an implied condition that the seller has a right to sell the " +
          "goods (s. 13(a)), an implied warranty that the buyer will have and enjoy quiet possession of " +
          "the goods (s. 13(b)), and an implied warranty that the goods will be free from any charge or " +
          "encumbrance in favour of any third party not declared or known to the buyer before or at the " +
          "time the contract is made (s. 13(c)).",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Ownership and lien records",
            why: "Shows who owned the vehicle and whether anything was owing on it.",
            examples: ["Vehicle permit (ownership)", "Lien information in the UVIP", "Letter from a lender claiming the vehicle"],
          },
        ],
      },
      {
        id: "untrue-statement-uvp",
        name: "A statement the seller made about the vehicle was untrue",
        plainExplanation:
          COGNOS_TEST +
          "That case was not about a vehicle sale, and whether a \"special relationship\" exists between " +
          "a private seller and a buyer is not something it decides. This part of the checklist is about " +
          "what the seller said, how it differed from the facts, and how the buyer relied on it.",
        sourceUrl: COGNOS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "What the seller said",
            why: "Records the statement and when it was made.",
            examples: ["Messages or emails", "The ad text", "Notes made right after talking to the seller"],
          },
          {
            name: "What was true",
            why: "Shows how the statement differed from the facts.",
            examples: ["Vehicle history report", "Mechanic's findings", "Accident or repair records"],
          },
        ],
      },
      {
        id: "amount-uvp",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT + "This part of the checklist is about the repair costs or other losses claimed and the documents they come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Cost records",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair invoices or quotes", "Price paid for the vehicle", "Towing or rental receipts"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "no-implied-quality-private-uvp",
        name: "The seller says a private sale carries no promise about condition",
        plainExplanation:
          "Under s. 15 of the Sale of Goods Act, subject to the Act and any statute in that behalf, " +
          "there is no implied warranty or condition as to the quality or fitness for any particular " +
          "purpose of goods supplied under a contract of sale, except as the section lists. The implied " +
          "condition of merchantable quality in para. 2 applies where goods are bought by description " +
          "from a seller who deals in goods of that description, and the implied condition of fitness in " +
          "para. 1 applies where the goods are of a description that it is in the course of the seller's " +
          "business to supply. Under para. 3, an implied warranty or condition as to quality or fitness " +
          "for a particular purpose may be annexed by the usage of trade. Section 14 (correspondence with " +
          "the description) is not limited to sellers in business.",
        whenThisComesUp: "When the seller's Defence says it was a private sale and nothing was promised about the vehicle's condition.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
      },
      {
        id: "sold-as-is-uvp",
        name: "The seller says the vehicle was sold \"as is\"",
        plainExplanation:
          "Under s. 53 of the Sale of Goods Act, where any right, duty or liability would arise under a " +
          "contract of sale by implication of law, it may be negatived or varied by express agreement, " +
          "by the course of dealing between the parties, or by usage if the usage binds both parties.",
        whenThisComesUp: "When the bill of sale or the messages say \"as is\" or \"no warranty\".",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
      },
      {
        id: "seller-acting-as-dealer-uvp",
        name: "The \"private\" seller was in the business of selling vehicles",
        plainExplanation:
          "Under s. 4(1)(a) of the Motor Vehicle Dealers Act, 2002, no person shall act as a motor " +
          "vehicle dealer unless the person is registered as a motor vehicle dealer under that Act. " +
          "Under s. 1(1), a \"motor vehicle dealer\" means a person who trades in motor vehicles, whether " +
          "for the person's own account or the account of any other person, or who holds themself out as " +
          "trading in motor vehicles.",
        whenThisComesUp: "When it turns out the seller sells vehicles regularly, or advertised several vehicles for sale.",
        sourceUrl: MVDA,
        verifiedAt: VERIFIED,
        consolidationPeriod: MVDA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
      "defence-failure-to-mitigate",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 11.1(1) of the Highway Traffic Act, every person who sells, offers for sale or " +
          "transfers a used motor vehicle shall provide a valid used vehicle information package for " +
          "inspection by proposed purchasers or transferees, and shall deliver the package to the " +
          "purchaser or transferee at the time of sale or transfer. Under s. 11.1(5), failing to comply " +
          "is an offence.",
        sourceUrl: HTA,
        verifiedAt: VERIFIED,
        consolidationPeriod: HTA_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "bought a used car privately",
      "bought a car on kijiji",
      "bought a car on facebook marketplace",
      "private seller lied about the car",
      "bought a car from a private seller",
      "seller hid problems with the car",
      "seller said the car had no accidents",
      "found a lien on the car I bought",
      "car broke down right after I bought it from someone",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Sale of Goods Act, R.S.O. 1990, c. S.1",
        officialUrl: SGA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 13 (right to sell; free from encumbrance); s. 14 (description); s. 15 (no implied quality term except as listed); s. 53",
      },
      {
        sourceName: "Supreme Court of Canada — Queen v. Cognos Inc., [1993] 1 S.C.R. 87",
        officialUrl: COGNOS,
        verifiedAt: VERIFIED,
        pinpoint: "p. 110 -- five general requirements for negligent misrepresentation (Iacobucci J., for himself and Sopinka J.)",
      },
      {
        sourceName: "Highway Traffic Act, R.S.O. 1990, c. H.8",
        officialUrl: HTA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 11.1(1), (5) (used vehicle information package)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-new-vehicle-defects",
    name: "Defects in a new vehicle",
    broughtBy: "The person who bought a new vehicle from a dealer for personal use and found defects in it.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "consumer-purchase-nvd",
        name: "The vehicle was bought from a dealer for personal use",
        plainExplanation:
          CPA_SCOPE +
          "Under s. 9(2), the implied conditions and warranties applying to the sale of goods by virtue " +
          "of the Sale of Goods Act are deemed to apply with necessary modifications to goods that are " +
          "leased or traded or otherwise supplied under a consumer agreement, and under s. 9(3) any term " +
          "or acknowledgement that purports to negate or vary them is void.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The sale contract",
            why: "Shows the dealer, the vehicle, the price and the date.",
            examples: ["Bill of sale or purchase agreement", "Financing or lease documents", "Delivery documents"],
          },
          {
            name: "Warranty documents",
            why: "Shows any written warranty and its terms.",
            examples: ["Manufacturer's warranty booklet", "Extended warranty contract"],
          },
        ],
      },
      {
        id: "not-merchantable-nvd",
        name: "The vehicle was not of merchantable quality, or not fit for the purpose made known",
        plainExplanation: SGA_QUALITY,
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Repair history",
            why: "Records each defect and each repair attempt.",
            examples: ["Repair orders and work orders", "Dates the vehicle was in the shop", "Recall or service bulletins received"],
          },
          {
            name: "Independent findings",
            why: "Describes the defect in someone else's words.",
            examples: ["Report from an independent mechanic", "Photos or video of the problem"],
          },
        ],
      },
      {
        id: "loss-nvd",
        name: "The loss caused by the defects",
        plainExplanation: SGA_DAMAGES,
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Cost records",
            why: "Supports the amount claimed.",
            examples: ["Repair bills not covered by warranty", "Rental or towing receipts", "Appraisal of the vehicle's value"],
          },
        ],
      },
      {
        id: "amount-nvd",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT + "This part of the checklist is about how the amount claimed is worked out from those records.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Calculation",
            why: "Shows how each figure adds up to the total.",
            examples: ["A list of each cost with its receipt", "Interest calculation"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "vehicle-accepted-nvd",
        name: "The dealer says the buyer accepted and kept the vehicle",
        plainExplanation: SGA_ACCEPTED,
        whenThisComesUp: "When the dealer says it is too late to return the vehicle because the buyer kept and drove it.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-set-off-or-counterclaim",
      "defence-failure-to-mitigate",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under O. Reg. 333/08, s. 39(2), para. 26 and s. 39(6) (Motor Vehicle Dealers Act, 2002), a " +
          "registered dealer's contract to sell a new motor vehicle must include a statement that the " +
          "Canadian Motor Vehicle Arbitration Plan (CAMVAP) \"allows consumers to resolve disputes with " +
          "participating manufacturers about possible defects in a vehicle's assembly or materials, or how " +
          "the manufacturer is applying or administering its new vehicle warranty.\" Under s. 39(2), " +
          "para. 25 and s. 39(4), the contract must also say that, in case of concerns with the sale, the " +
          "purchaser should first contact the dealer and, if concerns persist, may contact the Ontario " +
          "Motor Vehicle Industry Council, and that the purchaser may be eligible for compensation from " +
          "the Motor Vehicle Dealers Compensation Fund if they suffer a financial loss from the trade and " +
          "the dealer is unable or unwilling to make good on the loss. The required statement ends: \"You " +
          "may have additional rights at law.\"",
        sourceUrl: MVDA_REG,
        verifiedAt: VERIFIED,
        consolidationPeriod: MVDA_REG_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "brand new car has defects",
      "new car keeps breaking down",
      "dealer can't fix my new car",
      "new vehicle keeps going back to the dealer",
      "bought a new car and it's a lemon",
      "new truck has a manufacturing defect",
      "same problem with my new car keeps coming back",
      "new car still under warranty keeps failing",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Sale of Goods Act, R.S.O. 1990, c. S.1",
        officialUrl: SGA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 15 (merchantable quality; fitness for purpose); ss. 12(3), 34; s. 51",
      },
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 9(2)-(3); ss. 1, 2(1)",
      },
      {
        sourceName: "O. Reg. 333/08 (General), Motor Vehicle Dealers Act, 2002",
        officialUrl: MVDA_REG,
        verifiedAt: VERIFIED,
        pinpoint: "s. 39(2), paras. 25-26; s. 39(4), (6) (OMVIC, Compensation Fund and CAMVAP statements in new-vehicle contracts)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-home-inspector-missed-defects",
    name: "A home inspector who missed something",
    broughtBy:
      "The person who paid a home inspector, where the inspection or report missed a problem that was there at the time.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "inspection-agreement-hid",
        name: "What the inspector agreed to inspect",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about what the inspection was to cover, what was paid, and the " +
          "inspection agreement and report.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The inspection agreement",
            why: "Shows what the inspection was to cover, and any limits in it.",
            examples: ["Signed inspection agreement", "Booking confirmation", "Invoice and payment record"],
          },
          {
            name: "The report",
            why: "Shows what the inspector said about each part of the home.",
            examples: ["The full inspection report", "Photos in the report", "Notes from the walk-through"],
          },
        ],
      },
      {
        id: "reasonably-acceptable-quality-hid",
        name: "The inspection was not of a reasonably acceptable quality",
        plainExplanation:
          "Under s. 9(1) of the Consumer Protection Act, 2002, the supplier is deemed to warrant that " +
          "the services supplied under a consumer agreement are of a reasonably acceptable quality. " +
          CPA_SCOPE +
          "Under s. 1, \"services\" means anything other than goods, including any service, right, " +
          "entitlement or benefit. Under s. 9(3), any term or acknowledgement that purports to negate or " +
          "vary a deemed condition or warranty under the Act is void.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The problem that was missed",
            why: "Shows what was there and where.",
            examples: ["Dated photos of the problem", "Report from a contractor or engineer who found it"],
          },
          {
            name: "Signs it was there at the time",
            why: "Speaks to whether it could have been seen at the inspection.",
            examples: ["Expert opinion on how long it had been there", "Photos from the listing or the report itself"],
          },
        ],
      },
      {
        id: "report-statement-hid",
        name: "What the report said was untrue, inaccurate or misleading",
        plainExplanation:
          COGNOS_TEST +
          "That case was not about a home inspection. This part of the checklist is about what the " +
          "report said about the part of the home where the problem was found, how that differed from " +
          "the condition at the time, and how the report was relied on.",
        sourceUrl: COGNOS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Reliance on the report",
            why: "Shows what was decided because of the report.",
            examples: ["Waiving an inspection condition after reading the report", "Messages with an agent about the report"],
          },
        ],
      },
      {
        id: "amount-hid",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT + "This part of the checklist is about the repair cost or other loss claimed and the documents they come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Repair costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair invoices", "Written quotes", "Inspection fee paid"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "regulated-professional-exempt-hid",
        name: "The inspector is a regulated professional the Consumer Protection Act does not cover",
        plainExplanation:
          "Under s. 2(2)(e) of the Consumer Protection Act, 2002, the Act does not apply in respect of " +
          "prescribed professional services that are regulated under a statute of Ontario. O. Reg. 17/05, " +
          "s. 1 exempts a professional service provided by a person governed by, or subject to, any of a " +
          "list of Acts, including the Architects Act and the Professional Engineers Act.",
        whenThisComesUp:
          "When the inspector is a licensed engineer or architect, or another professional governed by an Act on that list.",
        sourceUrl: CPA_REG,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_REG_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA, pinpoint: "Consumer Protection Act, 2002, s. 2(2)(e)" }],
      },
      {
        id: "limitation-clause-hid",
        name: "The inspection agreement limits the inspector's liability",
        plainExplanation:
          "In Queen v. Cognos Inc., [1993] 1 S.C.R. 87, Justice Iacobucci wrote that in determining " +
          "whether a limitation (or exclusion) of liability clause protects a defendant in a particular " +
          "situation, \"the first step is to interpret the clause to see if it applies to the tort or " +
          "breach of contract complained of\" (p. 140). Separately, for services supplied under a " +
          "consumer agreement, s. 9(3) of the Consumer Protection Act, 2002 makes void any term or " +
          "acknowledgement that purports to negate or vary a deemed condition or warranty under that Act, " +
          "which includes the s. 9(1) warranty that services are of a reasonably acceptable quality.",
        whenThisComesUp:
          "When the inspection agreement has a clause limiting what the inspector can be held responsible for (for example, to the fee paid).",
        sourceUrl: COGNOS,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: CPA, pinpoint: "Consumer Protection Act, 2002, s. 9(1), (3)" }],
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-failure-to-mitigate",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "home inspector missed",
      "inspection report didn't mention",
      "inspector didn't catch the problem",
      "home inspection missed the foundation crack",
      "paid for a home inspection and they missed it",
      "inspector said the roof was fine",
      "problems the inspector should have seen",
      "home inspector was negligent",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 9(1), (3); ss. 1, 2(1), 2(2)(e)",
      },
      {
        sourceName: "O. Reg. 17/05 (General), Consumer Protection Act, 2002",
        officialUrl: CPA_REG,
        verifiedAt: VERIFIED,
        pinpoint: "s. 1 (professional services regulated by statute, exempt)",
      },
      {
        sourceName: "Supreme Court of Canada — Queen v. Cognos Inc., [1993] 1 S.C.R. 87",
        officialUrl: COGNOS,
        verifiedAt: VERIFIED,
        pinpoint: "p. 110 (five general requirements); p. 140 (limitation of liability clauses)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-real-estate-deposit-dispute",
    name: "A real estate deposit in dispute",
    broughtBy:
      "Usually the buyer who paid a deposit on a home purchase that did not close and wants it back; sometimes the seller who says the deposit is theirs to keep.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "agreement-and-deposit-red",
        name: "The agreement of purchase and sale and the deposit",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the agreement of purchase and sale, the deposit that was " +
          "paid, who holds it, and what happened to the deal.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The agreement",
            why: "Shows the deposit terms, the closing date and any conditions.",
            examples: ["Agreement of purchase and sale", "Amendments and waivers", "Notices sent between the lawyers"],
          },
          {
            name: "The deposit",
            why: "Shows how much was paid and who holds it.",
            examples: ["Deposit receipt", "Bank draft copy", "Brokerage trust account letter"],
          },
        ],
      },
      {
        id: "condo-rescission-red",
        name: "For a new condominium unit bought from the developer: the agreement was rescinded in time",
        plainExplanation:
          "Under s. 73(1) of the Condominium Act, 1998, a purchaser who receives a disclosure statement " +
          "and the condominium guide under s. 72(1) may rescind the agreement of purchase and sale before " +
          "accepting a deed to the unit in registerable form. Section 72(1) concerns a person who purchases " +
          "a unit or proposed unit from the declarant (the developer). Under s. 73(2), the purchaser or " +
          "their solicitor gives a written notice of rescission to the declarant or the declarant's " +
          "solicitor, who must receive it within 10 days of the latest of the date the purchaser receives " +
          "the disclosure statement, the date they receive a copy of the condominium guide, and the date " +
          "they receive a copy of the agreement signed by the declarant and the purchaser. Under s. 73(3), " +
          "the declarant shall then promptly refund, without penalty or charge, all money received from " +
          "the purchaser under the agreement and credited towards the purchase price, together with " +
          "interest at the prescribed rate.",
        sourceUrl: CONDO,
        verifiedAt: VERIFIED,
        consolidationPeriod: CONDO_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Dates of receipt",
            why: "Shows when the 10 days began.",
            examples: ["Receipt for the disclosure statement", "Date the signed agreement was received", "Date the condominium guide was received"],
          },
          {
            name: "The notice of rescission",
            why: "Shows the notice was given in writing and when it was received.",
            examples: ["Copy of the notice", "Courier or email delivery record"],
          },
        ],
      },
      {
        id: "relief-from-forfeiture-red",
        name: "If the buyer did not close: relief from forfeiture of the deposit",
        plainExplanation:
          "In Jesan Real Estate Ltd. v. Doyle, 2020 ONCA 714, the Court of Appeal for Ontario said that " +
          "when a purchaser fails to close an agreement of purchase and sale, the vendor is entitled to " +
          "retain the deposit regardless of whether he or she suffers a loss, subject to the court's " +
          "ability to grant relief from forfeiture (para. 54). Quoting its earlier decision in Azzarello " +
          "v. Shawqi, 2019 ONCA 820, the Court called relief from forfeiture an equitable remedy, pointed " +
          "to s. 98 of the Courts of Justice Act (\"[a] court may grant relief against penalties and " +
          "forfeitures, on such terms as to compensation or otherwise as are considered just\"), and set " +
          "out the two-pronged test followed in Ontario: \"1) whether the forfeited deposit was out of all " +
          "proportion to the damages suffered; and 2) whether it would be unconscionable for the seller to " +
          "retain the deposit\" (para. 54). At para. 55 the Court said, quoting an earlier case, that the " +
          "finding of unconscionability \"must be an exceptional one, strongly compelled on the facts of " +
          "the case\"; that where there is no gross disproportionality in the size of the deposit, the " +
          "court must consider other indicia of unconscionability; and that relevant factors include the " +
          "gravity of the breach and the conduct of the parties.",
        sourceUrl: JESAN,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: CJA, pinpoint: "Courts of Justice Act, s. 98" }],
        evidenceCategories: [
          {
            name: "The seller's loss, if any",
            why: "Relevant to whether the deposit is out of proportion to the damages suffered.",
            examples: ["Price the home later sold for", "Seller's carrying costs", "Listing history after the deal failed"],
          },
          {
            name: "What happened before closing",
            why: "Relevant to the conduct of the parties and the gravity of the breach.",
            examples: ["Messages about financing or extensions", "Requests for an amendment and the replies"],
          },
        ],
      },
      {
        id: "amount-red",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT + "This part of the checklist is about the deposit amount, any interest, and the documents they come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Deposit records",
            why: "Supports the dollar amount claimed.",
            examples: ["Deposit receipt", "Any partial return of the deposit"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "vendor-retains-deposit-red",
        name: "The seller says the deposit is theirs to keep because the buyer did not close",
        plainExplanation:
          "In Jesan Real Estate Ltd. v. Doyle, 2020 ONCA 714, the Court of Appeal for Ontario said that " +
          "when a purchaser fails to close an agreement of purchase and sale, the vendor is entitled to " +
          "retain the deposit regardless of whether he or she suffers a loss, subject to the court's " +
          "ability to grant relief from forfeiture (para. 54).",
        whenThisComesUp: "When the buyer did not complete the purchase on the closing date and the seller keeps the deposit.",
        sourceUrl: JESAN,
        verifiedAt: VERIFIED,
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-outside-jurisdiction", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 96(3) of the Courts of Justice Act, only the Court of Appeal and the Superior Court " +
          "of Justice, exclusive of the Small Claims Court, may grant equitable relief, unless otherwise " +
          "provided. In Jesan Real Estate Ltd. v. Doyle, 2020 ONCA 714 (para. 54), the Court of Appeal, " +
          "quoting Azzarello v. Shawqi, called relief from forfeiture an \"equitable remedy\"; s. 98 of " +
          "the same Act says \"a court\" may grant relief against penalties and forfeitures. These " +
          "sources do not say, in so many words, which court hears a request for relief from forfeiture " +
          "of a deposit.",
        sourceUrl: CJA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CJA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: JESAN, pinpoint: "Jesan Real Estate Ltd. v. Doyle, 2020 ONCA 714, para. 54" }],
      },
      {
        note:
          "Under s. 2(2)(f) of the Consumer Protection Act, 2002, the Act does not apply in respect of " +
          "consumer transactions for the purchase, sale or lease of real property, except transactions " +
          "with respect to time share agreements.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "want my deposit back on the house",
      "seller kept my deposit",
      "deal fell through and they kept the deposit",
      "couldn't close on the house",
      "buyer didn't close and I kept the deposit",
      "deposit on a new condo",
      "financing fell through and they won't return the deposit",
      "agreement of purchase and sale deposit",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Court of Appeal for Ontario — Jesan Real Estate Ltd. v. Doyle, 2020 ONCA 714",
        officialUrl: JESAN,
        verifiedAt: VERIFIED,
        pinpoint: "paras. 54-55 (vendor's right to retain the deposit; relief from forfeiture test, quoting Azzarello v. Shawqi, 2019 ONCA 820)",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: CJA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 96(3) (equitable relief); s. 98 (relief against penalties and forfeitures)",
      },
      {
        sourceName: "Condominium Act, 1998, S.O. 1998, c. 19",
        officialUrl: CONDO,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 72(1), 73(1)-(3) (10-day rescission and refund)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
