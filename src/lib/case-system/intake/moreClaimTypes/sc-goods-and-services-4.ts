/**
 * Case types, batch "sc-goods-and-services-4" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-goods-and-services-4.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-door-to-door-sale -- Something bought at the door
 *   sc-claim-furniture-or-appliance-delivery -- Furniture or an appliance damaged or never delivered
 *   sc-claim-home-services-not-performed -- Cleaning, lawn, snow or pool work not done
 *   sc-claim-salon-spa-or-tattoo-result -- A salon, spa or tattoo that went wrong
 *   sc-claim-pet-grooming-or-boarding -- A pet hurt or lost at grooming or boarding
 *   sc-claim-daycare-or-camp-fees -- A daycare or camp fee dispute
 *   sc-claim-funeral-or-cemetery-dispute -- A funeral home or cemetery dispute
 *   sc-claim-ticket-resale-or-cancelled-event -- A resold ticket or a cancelled event
 *   sc-claim-gift-card-refused -- A gift card or prepaid card refused
 *   sc-claim-timeshare-or-vacation-club -- A timeshare or vacation club
 *
 * Every legal statement below rests on text saved in this repository: the
 * vendored corpus (docs/sources/corpus/, url from manifest.json). Two planned
 * types are NOT written:
 *   - sc-claim-funeral-or-cemetery-dispute: funeral, burial and cemetery
 *     services are governed by the Funeral, Burial and Cremation Services Act,
 *     2002, which is not saved. The saved ontario.ca page (cpo-funerals.txt) is
 *     an index of links, and O. Reg. 17/05, s. 9 exempts agreements under that
 *     Act from parts of the Consumer Protection Act, 2002, so the general
 *     consumer rules alone would misdescribe the law.
 *   - sc-claim-ticket-resale-or-cancelled-event: ticket resale and refunds for
 *     cancelled events are governed by the Ticket Sales Act, 2017, which is not
 *     saved; the only saved text is a one-line link description on an ontario.ca
 *     index page (cpo-travelling-and-entertainment.txt).
 *
 * sc-claim-daycare-or-camp-fees is written from the Consumer Protection Act,
 * 2002 and s. 15 of the Child Care and Early Years Act, 2014 only. The fee
 * rules for licensed child care are in a regulation under that Act that is not
 * saved, so nothing is said about them.
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
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const NEGLIGENCE = "https://www.ontario.ca/laws/docs/elaws_statutes_90n01_e.doc";
const NEGLIGENCE_CONSOLIDATION = "2004-01-01";
const CCEYA = "https://www.ontario.ca/laws/docs/14c11_e.doc";
const CCEYA_CONSOLIDATION = "2026-05-07";

const CPA_NAME = "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A";
const CPA_REG_NAME = "O. Reg. 17/05 (General), under the Consumer Protection Act, 2002";
const LIMITATIONS_NAME = "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B";

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
  "The guide says the court can handle any action for the payment of money or the recovery of " +
  "personal property where the amount claimed does not exceed $50,000, excluding interest and " +
  "costs such as court fees. ";

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

const CPA_COURT_NOTE =
  "Under s. 100(1) of the Consumer Protection Act, 2002, if a consumer has a right to commence " +
  "an action under the Act, the consumer may commence the action in the Superior Court of " +
  "Justice. Under s. 22(1) of the Courts of Justice Act, the Small Claims Court is continued as a " +
  "branch of the Superior Court of Justice. Under s. 100(3) of the Consumer Protection Act, 2002, " +
  "in addition to ordering that the consumer recover what the Act entitles them to, the court may " +
  "order exemplary or punitive damages or such other relief as the court considers proper.";

const CPA_SCOPE =
  "Under s. 1 of the Consumer Protection Act, 2002, a \"consumer\" is an individual acting for " +
  "personal, family or household purposes, not for business purposes, and a \"consumer " +
  "agreement\" is an agreement in which a supplier -- a person in the business of supplying goods " +
  "or services -- agrees to supply goods or services for payment. Under s. 2(1), the Act applies " +
  "to consumer transactions if the consumer or the person dealing with the consumer is located in " +
  "Ontario when the transaction takes place. ";

const CPA_SERVICES =
  "Under s. 9(1) of the Consumer Protection Act, 2002, the supplier is deemed to warrant that " +
  "the services supplied under a consumer agreement are of a reasonably acceptable quality. " +
  CPA_SCOPE +
  "Under s. 9(3), any term or acknowledgement that purports to negate or vary a deemed " +
  "condition or warranty under the Act is void. ";

const CPA_REFUND =
  "Under s. 96(1) of the Consumer Protection Act, 2002, if a consumer cancels a consumer " +
  "agreement, the supplier shall, in accordance with the prescribed requirements, refund to the " +
  "consumer any payment made under the agreement or any related agreement. O. Reg. 17/05, " +
  "s. 79(1) says the supplier shall do so within 15 days after the day the consumer gives notice " +
  "of cancellation in accordance with s. 92 of the Act. Under s. 96(6), if a consumer has " +
  "cancelled a consumer agreement and the supplier has not met its obligations under s. 96(1), " +
  "the consumer may commence an action. ";

const CPA_NOTICE =
  "Under s. 94, the consumer cancels by giving notice in accordance with s. 92, and the " +
  "cancellation takes effect when the notice is given. Under s. 92, the notice may be expressed " +
  "in any way, as long as it indicates the consumer's intention to seek the remedy being " +
  "requested, and unless the regulations require otherwise it may be oral or in writing and given " +
  "by any means. ";

const CPA_CARD =
  "Under s. 99(1), a consumer who charged a payment to a credit card account may request the " +
  "credit card issuer to cancel or reverse the charge and any associated interest or other " +
  "charges; this applies to a payment in respect of a consumer agreement that has been cancelled " +
  "under the Act (s. 99(2)(a)), and the request may be made if the consumer has cancelled and the " +
  "supplier has not refunded all of the payment within the required period (s. 99(3)). Under " +
  "s. 99(4), the request shall be in writing, and O. Reg. 17/05, s. 85(1) says it shall be given " +
  "to the credit card issuer within 60 days after the end of the period within which the " +
  "supplier was required to refund the payment.";

const CPA_BOUND =
  "Under s. 93(1) of the Consumer Protection Act, 2002, a consumer agreement is not binding on " +
  "the consumer unless the agreement is made in accordance with the Act and the regulations. " +
  "Under s. 93(2), a court may nonetheless order that a consumer is bound by all or a portion or " +
  "portions of a consumer agreement, even if it was not made in accordance with the Act or the " +
  "regulations, if the court determines that it would be inequitable in the circumstances for the " +
  "consumer not to be bound.";

const CPA_LATE =
  "Under s. 1 of the Consumer Protection Act, 2002, a \"future performance agreement\" is a " +
  "consumer agreement in respect of which delivery, performance or payment in full is not made " +
  "when the parties enter the agreement. Under s. 21(1), the rules in ss. 22 to 26 apply if the " +
  "consumer's total potential payment obligation, excluding the cost of borrowing, exceeds a " +
  "prescribed amount, and O. Reg. 17/05, s. 23.1 sets that amount at $50 (for an agreement that " +
  "is not a gift card agreement). ";

const CPA_LATE_DELIVERY =
  "Under s. 26(1)(a), the consumer may cancel at any time before delivery if the supplier does " +
  "not make delivery within 30 days after the delivery date specified in the agreement or an " +
  "amended delivery date the consumer agreed to in writing. Under s. 26(2), if no delivery or " +
  "commencement date is specified, the consumer may cancel at any time before delivery or " +
  "commencement if the supplier does not deliver or commence performance within 30 days after " +
  "the agreement is entered into. Under s. 26(3), if after that period the consumer agrees to " +
  "accept delivery or authorize commencement, the consumer may not cancel under that section. ";

const CPA_LATE_START =
  "Under s. 26(1)(b), the consumer may cancel at any time before performance begins if the " +
  "supplier does not begin performance within 30 days after the commencement date specified in " +
  "the agreement or an amended commencement date the consumer agreed to in writing. Under " +
  "s. 26(2), if no commencement date is specified, the consumer may cancel at any time before " +
  "commencement if the supplier does not commence performance within 30 days after the agreement " +
  "is entered into. Under s. 26(3), if after that period the consumer agrees to authorize " +
  "commencement, the consumer may not cancel under that section. ";

const CPA_ESTIMATE =
  "Under s. 10(1) of the Consumer Protection Act, 2002, if a consumer agreement includes an " +
  "estimate, the supplier shall not charge the consumer an amount that exceeds the estimate by " +
  "more than 10 per cent. Under s. 10(2), if the supplier does, the consumer may require that the " +
  "supplier provide the goods or services at the estimated price. Under s. 10(3), nothing in that " +
  "section prevents the consumer and supplier from agreeing to amend the estimate or price if the " +
  "consumer requires additional or different goods or services.";

const CPA_MISREP =
  "Under s. 14(1) of the Consumer Protection Act, 2002, it is an unfair practice for a person to " +
  "make a false, misleading or deceptive representation; s. 14(2) lists examples, including a " +
  "representation that the goods or services have benefits or qualities they do not have, and a " +
  "representation that a specific price advantage exists if it does not. Under s. 17(2), a " +
  "person who performs one such act is deemed to be engaging in an unfair practice. Under " +
  "s. 18(1), any agreement entered into by a consumer after or while a person has engaged in an " +
  "unfair practice may be rescinded by the consumer, and the consumer is entitled to any remedy " +
  "that is available in law, including damages. Under s. 18(3), the consumer must give notice " +
  "within one year after entering into the agreement, and under s. 18(4) the notice may be " +
  "expressed in any way as long as it indicates the consumer's intention to rescind the agreement " +
  "or to seek recovery where rescission is not possible, and the reasons for so doing.";

const CONTRIBUTORY =
  "Under s. 3 of the Negligence Act, in any action for damages founded on the fault or " +
  "negligence of the defendant, if fault or negligence is found on the part of the plaintiff that " +
  "contributed to the damages, the court shall apportion the damages in proportion to the degree " +
  "of fault or negligence found against the parties.";

export const TYPES_SC_GOODS_AND_SERVICES_4: ClaimType[] = [
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-door-to-door-sale",
    name: "Something bought at the door",
    broughtBy:
      "The customer who signed up for something with a salesperson who came to their home -- for example a water heater, furnace, air filter, home service or product -- and wants to cancel or get their money back. Not the seller.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "direct-agreement-d2d",
        name: "The agreement was made at the door",
        plainExplanation:
          "Under s. 20(1) of the Consumer Protection Act, 2002, a \"direct agreement\" is a consumer " +
          "agreement negotiated or concluded in person at a place other than the supplier's place of " +
          "business, a market place, an auction, trade fair, agricultural fair or exhibition. Under " +
          "s. 41(1), the rules in ss. 42 and 43 apply if the consumer's total potential payment " +
          "obligations under the agreement, excluding the cost of borrowing, exceed a prescribed " +
          "amount, and O. Reg. 17/05, s. 34 sets that amount at $50. Under s. 42(1), every direct " +
          "agreement shall be in writing, shall be delivered to the consumer and shall be made in " +
          "accordance with the prescribed requirements.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 34" }],
        evidenceCategories: [
          {
            name: "The agreement and when it was received",
            why: "Shows where it was signed, the total price, and the day a written copy was received.",
            examples: ["The signed agreement", "Any copy left at the door or emailed later", "Notes of the date and who came"],
          },
          {
            name: "Payment and financing records",
            why: "Shows what was paid or financed under the agreement.",
            examples: ["Receipts", "Bank or credit card statements", "Any rental or financing papers"],
          },
        ],
      },
      {
        id: "cancelled-in-time-d2d",
        name: "The agreement was cancelled within the time allowed",
        plainExplanation:
          "Under s. 43(1) of the Consumer Protection Act, 2002, a consumer may, without any reason, " +
          "cancel a direct agreement at any time from the date of entering into it until 10 days after " +
          "receiving the written copy of the agreement. Under s. 43(2), a consumer may also cancel " +
          "within one year after entering into it if the consumer does not receive a copy that meets " +
          "the requirements of s. 42. " +
          CPA_NOTICE +
          "This part of the checklist is about when the copy of the agreement was received, and when " +
          "and how the cancellation was given.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The cancellation notice",
            why: "Shows the cancellation was given, how and on what day.",
            examples: ["Copy of the cancellation letter, email or text", "Proof of sending, such as a registered mail receipt", "Notes of a phone call, with the date"],
          },
          {
            name: "What the written copy left out",
            why: "Shows whether the copy received was missing anything, if the one-year period is relied on.",
            examples: ["The copy of the agreement that was received", "A list of what is missing from it"],
          },
        ],
      },
      {
        id: "prohibited-at-the-door-d2d",
        name: "If it was a water heater, furnace, air or water device, or duct cleaning",
        plainExplanation:
          "Under s. 43.1(1) of the Consumer Protection Act, 2002, no supplier shall, while at a " +
          "consumer's dwelling, solicit the consumer to enter into a direct agreement for prescribed " +
          "goods or services, or enter into one, unless the consumer initiated contact and " +
          "specifically requested that the supplier attend for that purpose. O. Reg. 17/05, s. 35.1(1) " +
          "lists the prescribed goods and services: furnaces, air conditioners, air cleaners, air " +
          "purifiers, water heaters, water treatment devices, water purifiers, water filters, water " +
          "softeners, duct cleaning services, and goods or services that combine or perform their " +
          "functions. Under s. 43.1(3), a direct agreement entered into in contravention of " +
          "s. 43.1(1) is void, and under s. 43.1(4) related agreements, including a credit agreement " +
          "for the money owed under it, are void. Under s. 43.1(5), goods or services supplied under " +
          "a void agreement are deemed to be unsolicited. Under s. 43.1(6) the supplier is liable to " +
          "reimburse the consumer for related charges from a third party, including for the removal " +
          "or return of goods, and under s. 43.1(7) the consumer may commence an action to recover " +
          "that amount.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 35.1(1)" }],
        evidenceCategories: [
          {
            name: "How the visit started",
            why: "Shows whether the household asked the supplier to come, or the supplier came uninvited.",
            examples: ["Notes of the knock at the door, with the date", "Call history showing no call to the company", "Flyers or door hangers left"],
          },
          {
            name: "Third-party charges",
            why: "Shows any amounts charged by others because of the agreement.",
            examples: ["Removal or return charges", "Invoices from the previous rental company", "Bank statements"],
          },
        ],
      },
      {
        id: "refund-after-cancelling-d2d",
        name: "The money was not refunded after cancelling",
        plainExplanation: CPA_REFUND + CPA_CARD,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, ss. 79(1), 85(1)" }],
        evidenceCategories: [
          {
            name: "Refund requests",
            why: "Shows the refund was asked for and not paid within 15 days.",
            examples: ["Emails or letters asking for the money back", "Credit card dispute request", "Any reply from the seller"],
          },
          {
            name: "The amount paid",
            why: "Supports the dollar amount claimed.",
            examples: ["Receipts", "Bank or credit card statements", "Financing statements"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "bound-anyway-d2d",
        name: "The seller asks the court to hold the customer to the agreement",
        plainExplanation: CPA_BOUND,
        whenThisComesUp:
          "When the seller says that, even if the agreement did not follow the Act, it would be unfair for the customer not to pay.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
      },
      {
        id: "dispute-d2d",
        name: "The seller disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the cancellation came too late, the " +
          "customer asked the seller to come, or the agreement met the Act's requirements.",
        whenThisComesUp: "When the seller files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: CPA_COURT_NOTE,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CJA, pinpoint: "Courts of Justice Act, s. 22(1)" }],
      },
      { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "salesperson came to my door",
      "door to door salesman",
      "signed a contract at my front door",
      "water heater rental sold at the door",
      "furnace contract signed at home",
      "want to cancel a door to door contract",
      "cooling off period door to door",
      "they won't refund after I cancelled",
      "duct cleaning salesperson came to the house",
      "air purifier sold to me at home",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: CPA_NAME,
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 20(1) (\"direct agreement\"), 41(1), 42(1), 43(1)-(2), 43.1(1), (3)-(7); ss. 92-94, 96(1), 96(6), 99; s. 100",
      },
      {
        sourceName: CPA_REG_NAME,
        officialUrl: CPA_REG,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 34, 35.1(1), 79(1), 85(1)",
      },
      {
        sourceName: LIMITATIONS_NAME,
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
    id: "sc-claim-furniture-or-appliance-delivery",
    name: "Furniture or an appliance damaged or never delivered",
    broughtBy:
      "The customer who bought furniture or an appliance from a store or online seller that arrived damaged or defective, or was never delivered. Not the seller.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "purchase-fad",
        name: "What was bought, for what price, and the delivery date",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the purchase: the item, the price, what was paid, and " +
          "the delivery date that was promised.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The sales agreement",
            why: "Shows the item, the price and the delivery date.",
            examples: ["Sales receipt or bill of sale", "Order confirmation email", "Delivery booking"],
          },
          {
            name: "Payment records",
            why: "Shows what was paid and when.",
            examples: ["Credit card or bank statements", "Financing agreement", "Deposit receipt"],
          },
        ],
      },
      {
        id: "never-delivered-fad",
        name: "If the item was not delivered",
        plainExplanation:
          CPA_LATE +
          CPA_LATE_DELIVERY +
          CPA_NOTICE +
          "Separately, under s. 49(1) of the Sale of Goods Act, where the seller wrongfully neglects " +
          "or refuses to deliver the goods, the buyer may bring an action against the seller for " +
          "damages for non-delivery.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [
          { sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 23.1" },
          { sourceUrl: SGA, pinpoint: "Sale of Goods Act, s. 49(1)" },
        ],
        evidenceCategories: [
          {
            name: "The promised delivery date",
            why: "Shows the date in the agreement, or any new date agreed to in writing.",
            examples: ["Order confirmation with the delivery date", "Emails changing the date", "Texts from the delivery company"],
          },
          {
            name: "The cancellation",
            why: "Shows the order was cancelled before delivery, and when.",
            examples: ["Cancellation email or letter", "Chat transcript", "Notes of a call, with the date"],
          },
        ],
      },
      {
        id: "damaged-or-defective-fad",
        name: "If the item arrived damaged or defective",
        plainExplanation:
          "Under s. 9(2) of the Consumer Protection Act, 2002, the implied conditions and warranties " +
          "that apply to the sale of goods under the Sale of Goods Act are deemed to apply to goods " +
          "supplied under a consumer agreement. Under s. 15, para. 2 of the Sale of Goods Act, where " +
          "goods are bought by description from a seller who deals in goods of that description, " +
          "there is an implied condition that the goods will be of merchantable quality; but if the " +
          "buyer has examined the goods, there is no implied condition as regards defects that the " +
          "examination ought to have revealed. Under s. 9(3) of the Consumer Protection Act, 2002, any " +
          "term that purports to negate or vary an implied condition or warranty under the Sale of " +
          "Goods Act is void.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: SGA, pinpoint: "Sale of Goods Act, s. 15, para. 2" }],
        evidenceCategories: [
          {
            name: "Condition on arrival",
            why: "Shows the damage or defect and when it was found.",
            examples: ["Photos or video at unboxing", "Notes on the delivery receipt", "Technician's report"],
          },
          {
            name: "Reports to the seller",
            why: "Shows when the seller was told and how it answered.",
            examples: ["Emails or chats reporting the problem", "Return or exchange requests", "The seller's reply"],
          },
        ],
      },
      {
        id: "amount-fad",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the amount paid, the cost to repair or replace the " +
          "item, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Cost figures",
            why: "Supports the dollar amount claimed.",
            examples: ["Receipt for the price paid", "Repair quotes", "Price of a comparable replacement"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "refund-or-damages-measure-fad",
        name: "The seller says the item was accepted, or the loss is smaller",
        plainExplanation:
          "Under s. 34 of the Sale of Goods Act, the buyer is deemed to have accepted the goods when " +
          "the buyer tells the seller they have been accepted, does any act in relation to them after " +
          "delivery that is inconsistent with the ownership of the seller, or, after the lapse of a " +
          "reasonable time, keeps the goods without telling the seller they have been rejected. Under " +
          "s. 51(1), where the buyer treats a breach of a condition as a breach of warranty, the buyer " +
          "may set up the breach against the price or bring an action for damages. Under s. 51(3), " +
          "for a breach of warranty of quality, the loss is, in the absence of evidence to the " +
          "contrary, the difference between the value of the goods at delivery and the value they " +
          "would have had if they had answered to the warranty.",
        whenThisComesUp:
          "When the seller says the item was kept and used, or that the claim should be for the drop in value rather than the full price.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
      },
      {
        id: "dispute-fad",
        name: "The seller disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the item was delivered as agreed, was " +
          "damaged after delivery, or that the delivery date was changed with the customer's agreement.",
        whenThisComesUp: "When the seller files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-set-off-or-counterclaim",
      "defence-failure-to-mitigate",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note: CPA_REFUND + CPA_CARD,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, ss. 79(1), 85(1)" }],
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "couch was never delivered",
      "furniture store took my money and never delivered",
      "fridge arrived damaged",
      "washer was delivered broken",
      "appliance delivery keeps getting delayed",
      "sofa arrived with a tear",
      "dishwasher does not work out of the box",
      "furniture order cancelled but no refund",
      "the store won't replace my damaged dresser",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: CPA_NAME,
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 1 (\"future performance agreement\"); ss. 9(2), 9(3), 21(1), 26(1)-(3), 92, 94, 96(1), 96(6), 99",
      },
      {
        sourceName: "Sale of Goods Act, R.S.O. 1990, c. S.1",
        officialUrl: SGA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 15, para. 2; ss. 34, 49(1), 51(1), 51(3)",
      },
      {
        sourceName: CPA_REG_NAME,
        officialUrl: CPA_REG,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 23.1, 79(1), 85(1)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-home-services-not-performed",
    name: "Cleaning, lawn, snow or pool work not done",
    broughtBy:
      "The customer who paid for home services such as cleaning, lawn care, snow removal or pool care that were not done, were done badly, or cost more than the estimate. Not the service company that is owed money.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "service-agreement-hsn",
        name: "What the company agreed to do",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the service agreement: what work, how often, for what " +
          "season or dates, at what price, and the records that show it.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The service agreement",
            why: "Shows the work, the schedule and the price.",
            examples: ["Signed contract or seasonal agreement", "Quote or estimate", "Emails or texts booking the service"],
          },
          {
            name: "Payment records",
            why: "Shows what was paid and when.",
            examples: ["Receipts", "Bank or credit card statements", "E-transfer records"],
          },
        ],
      },
      {
        id: "service-quality-hsn",
        name: "The work was not done, or not of a reasonably acceptable quality",
        plainExplanation:
          CPA_SERVICES +
          "This part of the checklist is about which visits were missed or what work was poorly done, " +
          "and how that is shown.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Missed or poor work",
            why: "Shows the dates the work was not done or what was wrong with it.",
            examples: ["Dated photos of an unplowed driveway or uncut lawn", "A log of missed visits", "Photos of poor cleaning or pool condition"],
          },
          {
            name: "Complaints to the company",
            why: "Shows when the company was told and how it answered.",
            examples: ["Texts or emails reporting missed visits", "The company's reply"],
          },
        ],
      },
      {
        id: "never-started-hsn",
        name: "If the service never started",
        plainExplanation:
          CPA_LATE +
          CPA_LATE_START +
          CPA_NOTICE +
          CPA_REFUND,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, ss. 23.1, 79(1)" }],
        evidenceCategories: [
          {
            name: "The start date",
            why: "Shows the start date in the agreement, or any new date agreed to in writing.",
            examples: ["The agreement showing the start date", "Messages changing the date"],
          },
          {
            name: "The cancellation and refund request",
            why: "Shows the agreement was cancelled before the service started, and the refund was asked for.",
            examples: ["Copy of the cancellation email, text or letter", "Proof it was sent", "Any reply"],
          },
        ],
      },
      {
        id: "amount-hsn",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the amount paid for work not done, any cost to have " +
          "someone else do the work, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Cost figures",
            why: "Supports the dollar amount claimed.",
            examples: ["Receipts for what was paid", "Invoices from another company hired to do the work", "A calculation of missed visits times the per-visit price"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-hsn",
        name: "The company disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the work was done, the agreement did not " +
          "cover what is claimed, or money is owed by the customer.",
        whenThisComesUp: "When the service company files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
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
        note: CPA_ESTIMATE,
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
      "snow removal company never plowed",
      "paid for a season of snow plowing",
      "lawn care company stopped coming",
      "cleaning company did a terrible job",
      "cleaners never showed up",
      "pool company never opened my pool",
      "paid upfront for lawn service",
      "house cleaner charged more than the quote",
      "landscaper took a deposit and disappeared",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: CPA_NAME,
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1, 2(1), 9(1), 9(3), 10(1)-(3), 21(1), 26(1)(b), 26(2)-(3), 92, 94, 96(1), 96(6)",
      },
      {
        sourceName: CPA_REG_NAME,
        officialUrl: CPA_REG,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 23.1, 79(1)",
      },
      {
        sourceName: LIMITATIONS_NAME,
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
    id: "sc-claim-salon-spa-or-tattoo-result",
    name: "A salon, spa or tattoo that went wrong",
    broughtBy:
      "The customer of a hair salon, nail or beauty salon, spa, tattoo or piercing studio whose service was done badly or caused harm. Not the business that is owed money.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "service-booked-sst",
        name: "What service was booked and paid for",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the service that was asked for, what was agreed about " +
          "the result, the price, and the records that show it.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The booking and what was asked for",
            why: "Shows the service, the design or result agreed, and the price.",
            examples: ["Booking confirmation", "Reference photos or the agreed design", "Consent or intake form"],
          },
          {
            name: "Payment records",
            why: "Shows what was paid.",
            examples: ["Receipt", "Card or e-transfer record", "Deposit record"],
          },
        ],
      },
      {
        id: "service-quality-sst",
        name: "The service was not of a reasonably acceptable quality",
        plainExplanation:
          CPA_SERVICES +
          "This part of the checklist is about what went wrong -- the result, or any burn, infection, " +
          "hair or skin damage -- and how that is shown.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The result",
            why: "Shows what the service looked like right after and over the following days.",
            examples: ["Dated photos", "Messages sent to the business the same day", "Statements from people who saw it"],
          },
          {
            name: "Medical or repair records",
            why: "Shows any injury and the treatment or correction needed.",
            examples: ["Doctor or clinic notes", "Pharmacy receipts", "Invoice from another salon or artist for a correction or removal"],
          },
        ],
      },
      {
        id: "amount-sst",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the price paid, the cost of correction, removal or " +
          "treatment, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Cost figures",
            why: "Supports the dollar amount claimed.",
            examples: ["Original receipt", "Correction or removal quotes and invoices", "Medical and pharmacy receipts"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "aftercare-sst",
        name: "The business says the customer's own actions contributed",
        plainExplanation:
          CONTRIBUTORY +
          " This topic is about a business saying, for example, that aftercare instructions were not " +
          "followed.",
        whenThisComesUp:
          "When the business says the harm came partly from what the customer did after the appointment.",
        sourceUrl: NEGLIGENCE,
        verifiedAt: VERIFIED,
        consolidationPeriod: NEGLIGENCE_CONSOLIDATION,
      },
      {
        id: "dispute-sst",
        name: "The business disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the service was done as asked, or the " +
          "customer signed a consent or release form.",
        whenThisComesUp: "When the business files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-waiver-release-assumption-of-risk",
      "defence-contributory-negligence",
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
      "hair salon burned my scalp",
      "bad hair colour ruined my hair",
      "tattoo artist botched my tattoo",
      "tattoo got infected",
      "spa treatment burned my skin",
      "nail salon infection",
      "eyelash extensions damaged my lashes",
      "piercing went wrong",
      "salon refused a refund for a bad haircut",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: CPA_NAME,
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1, 2(1), 9(1), 9(3)",
      },
      {
        sourceName: "Negligence Act, R.S.O. 1990, c. N.1",
        officialUrl: NEGLIGENCE,
        verifiedAt: VERIFIED,
        pinpoint: "s. 3",
      },
      {
        sourceName: LIMITATIONS_NAME,
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
    id: "sc-claim-pet-grooming-or-boarding",
    name: "A pet hurt or lost at grooming or boarding",
    broughtBy:
      "The pet owner whose animal was hurt, became sick, or was lost while at a groomer, kennel, boarding facility, pet sitter or dog walker. Not the business that is owed money.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "care-agreement-pgb",
        name: "What the business agreed to do",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the grooming or boarding agreement: the animal, the " +
          "dates, the services, the price, and the records that show it.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The booking or boarding agreement",
            why: "Shows the services, the dates and any terms signed.",
            examples: ["Signed intake or boarding form", "Booking confirmation", "Receipt"],
          },
          {
            name: "The animal's condition before",
            why: "Shows the animal was healthy and unhurt when dropped off.",
            examples: ["Recent vet records", "Dated photos or video from before the drop-off"],
          },
        ],
      },
      {
        id: "service-quality-pgb",
        name: "The care was not of a reasonably acceptable quality",
        plainExplanation:
          CPA_SERVICES +
          "This part of the checklist is about what happened to the animal -- the injury, illness or " +
          "loss -- and how that is shown.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The injury, illness or loss",
            why: "Shows what happened and when it was discovered.",
            examples: ["Photos at pickup", "Vet records and diagnosis after pickup", "Messages from the business about an escape or incident"],
          },
          {
            name: "What the business said",
            why: "Shows how the business explained what happened.",
            examples: ["Incident report", "Texts or emails", "Notes of conversations, with dates"],
          },
        ],
      },
      {
        id: "amount-pgb",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about vet bills, search costs, the value of the animal, the " +
          "price paid for the service, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Cost figures",
            why: "Supports the dollar amount claimed.",
            examples: ["Vet invoices", "Receipts for search posters or ads", "Purchase or adoption records showing the animal's cost"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-pgb",
        name: "The business disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the injury or illness existed before, " +
          "happened despite proper care, or is covered by a waiver the owner signed. Under s. 9(3) of " +
          "the Consumer Protection Act, 2002, any term or acknowledgement that purports to negate or " +
          "vary a deemed condition or warranty under that Act is void.",
        whenThisComesUp: "When the groomer or boarding business files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA, pinpoint: "Consumer Protection Act, 2002, s. 9(3)" }],
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-waiver-release-assumption-of-risk",
      "defence-set-off-or-counterclaim",
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
      "groomer cut my dog",
      "dog was injured at the groomer",
      "kennel lost my dog",
      "my dog escaped from the boarding facility",
      "cat got sick at the boarding kennel",
      "dog walker lost my dog",
      "pet sitter let my dog get hurt",
      "doggy daycare injury",
      "vet bills after grooming",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: CPA_NAME,
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1, 2(1), 9(1), 9(3)",
      },
      {
        sourceName: "Rules of the Small Claims Court, O. Reg. 258/98",
        officialUrl: SC_RULES,
        verifiedAt: VERIFIED,
        pinpoint: "rr. 9.01, 9.02(1)",
      },
      {
        sourceName: LIMITATIONS_NAME,
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
    id: "sc-claim-daycare-or-camp-fees",
    name: "A daycare or camp fee dispute",
    broughtBy:
      "The parent who paid a daycare, child care provider, or day or summer camp and wants fees or a deposit back, or disputes what was charged. Not the provider that is owed fees.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "enrolment-agreement-dcf",
        name: "What the provider agreed to and what was paid",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the enrolment or registration agreement: the dates, " +
          "the fees, any deposit, the refund or withdrawal terms, and what was paid. Under s. 15 of the " +
          "Child Care and Early Years Act, 2014, on request, any licensee or child care provider shall " +
          "provide a receipt for payment to a person who pays for child care, free of charge and in " +
          "accordance with the regulations.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: CCEYA, pinpoint: "Child Care and Early Years Act, 2014, s. 15" }],
        evidenceCategories: [
          {
            name: "The enrolment or registration agreement",
            why: "Shows the fees, the dates and any refund or withdrawal terms.",
            examples: ["Signed enrolment contract or registration form", "Parent handbook or fee policy given at sign-up", "Confirmation email"],
          },
          {
            name: "Payment records",
            why: "Shows the fees and deposit paid.",
            examples: ["Receipts from the provider", "Bank or credit card statements", "E-transfer records"],
          },
        ],
      },
      {
        id: "written-agreement-dcf",
        name: "If fees were paid in advance and no proper written agreement was given",
        plainExplanation:
          CPA_LATE +
          "Under s. 22, every future performance agreement to which those rules apply shall be in " +
          "writing, shall be delivered to the consumer and shall be made in accordance with the " +
          "prescribed requirements. O. Reg. 17/05, s. 24 lists what it shall set out, including a fair " +
          "and accurate description of the services, an itemized list of prices, the terms and " +
          "methods of payment, and the rights the supplier agrees the consumer will have in relation " +
          "to cancellations and refunds. Under s. 23, a consumer may cancel a future performance " +
          "agreement within one year after entering into it if the consumer does not receive a copy " +
          "that meets the requirements of s. 22. " +
          CPA_NOTICE,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, ss. 23.1, 24" }],
        evidenceCategories: [
          {
            name: "The copy that was given",
            why: "Shows whether a written copy was received and what it left out.",
            examples: ["The agreement or form received", "A list of what is missing from it", "Note of the date it was received"],
          },
          {
            name: "The cancellation",
            why: "Shows when and how the agreement was cancelled.",
            examples: ["Withdrawal or cancellation email or letter", "Proof it was sent", "Any reply"],
          },
        ],
      },
      {
        id: "never-started-or-refund-dcf",
        name: "If the program never started, or a refund was not paid",
        plainExplanation:
          CPA_LATE +
          CPA_LATE_START +
          CPA_REFUND,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 79(1)" }],
        evidenceCategories: [
          {
            name: "The start date",
            why: "Shows the start date in the agreement and that the program did not begin.",
            examples: ["Registration confirmation showing the start date", "Notice that the program was cancelled or delayed"],
          },
          {
            name: "Refund requests",
            why: "Shows the refund was asked for and not paid.",
            examples: ["Emails or letters asking for the money back", "The provider's reply"],
          },
        ],
      },
      {
        id: "amount-dcf",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the fees or deposit to be returned, or the amount " +
          "overcharged, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Cost figures",
            why: "Supports the dollar amount claimed.",
            examples: ["Receipts", "Statement of account from the provider", "A calculation of fees paid for days or weeks not provided"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-dcf",
        name: "The provider disputes the claim or says fees are owed",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the withdrawal terms allow the provider to " +
          "keep the deposit or fees, or that the parent owes fees.",
        whenThisComesUp: "When the daycare or camp files a Defence (Form 9A), with or without its own claim for unpaid fees.",
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
      { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "daycare won't return my deposit",
      "daycare charged fees after we withdrew",
      "summer camp was cancelled and no refund",
      "camp kept our registration fee",
      "child care provider overcharged me",
      "daycare refused to give me receipts",
      "paid camp fees in advance",
      "daycare says I owe notice fees",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: CPA_NAME,
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 1 (\"future performance agreement\"); ss. 21(1), 22, 23, 26(1)(b), 26(2)-(3), 92, 94, 96(1), 96(6)",
      },
      {
        sourceName: CPA_REG_NAME,
        officialUrl: CPA_REG,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 23.1, 24, 79(1)",
      },
      {
        sourceName: "Child Care and Early Years Act, 2014, S.O. 2014, c. 11, Sched. 1",
        officialUrl: CCEYA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 15",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-gift-card-refused",
    name: "A gift card or prepaid card refused",
    broughtBy:
      "The person holding a store or prepaid gift card -- bought for themselves or received as a gift -- that a business refused to honour, said had expired, or charged fees against. Not the business.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "gift-card-covered-gcr",
        name: "The card is a gift card covered by the rules",
        plainExplanation:
          "Under s. 23 of O. Reg. 17/05 (under the Consumer Protection Act, 2002), a \"gift card\" is " +
          "a voucher in any form, including an electronic credit or written certificate, issued by a " +
          "supplier under a gift card agreement, that the holder is entitled to apply towards " +
          "purchasing goods or services covered by the voucher. Under s. 25.1(1), the gift card rules " +
          "in ss. 25.2 to 25.5 do not apply to a gift card issued for a charitable purpose, a gift " +
          "card that covers only one specific good or service, or a gift card issued by a financial " +
          "institution. Under s. 25.1(3), the rules apply whether the holder purchased the card for " +
          "themselves or received it from another person.",
        sourceUrl: CPA_REG,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_REG_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The card itself",
            why: "Shows who issued it, its value, and any terms printed on it.",
            examples: ["The physical card, front and back", "The email or app showing an e-gift card", "Any card number or balance screen"],
          },
          {
            name: "How the card was bought",
            why: "Shows the payment made for the card and when.",
            examples: ["Purchase receipt", "Gift message or email", "Bank or credit card statement of the buyer"],
          },
        ],
      },
      {
        id: "no-expiry-or-fees-gcr",
        name: "The card was refused as expired, or fees were taken",
        plainExplanation:
          "Under s. 25.3(1) of O. Reg. 17/05, no supplier shall enter into a gift card agreement that " +
          "has an expiry date on its future performance, and under s. 25.3(2) a gift card agreement " +
          "with an expiry date shall be effective as if it had no expiry date if the agreement is " +
          "otherwise valid. Under s. 25.4(1)(b), a supplier under a gift card agreement that is not " +
          "an open loop gift card agreement shall not charge the holder a fee for anything in relation " +
          "to the card, other than a fee for replacing a lost or stolen card or a fee to customize it. " +
          "Under s. 25.4(2)(b), a supplier under an open loop gift card agreement (one that can be " +
          "used to buy from multiple unaffiliated sellers) shall not charge the holder a fee for " +
          "anything in relation to the card other than a fee for replacing a lost or stolen card, a " +
          "fee to customize it, or a dormancy fee in accordance with s. 25.4(2.1), which requires, " +
          "among other things, that the fee does not exceed $2.50 per month. Under s. 25.4(3), the holder who paid a fee or amount charged " +
          "in contravention of s. 25.4(2) may demand a refund by giving notice under s. 92 of the Act " +
          "within one year after making the payment, and under s. 25.4(4) the supplier shall provide " +
          "the refund within 15 days of receiving the notice.",
        sourceUrl: CPA_REG,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_REG_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The refusal",
            why: "Shows the business would not accept the card, and why.",
            examples: ["Receipt or screen showing the card was declined", "Emails or chat with the business", "Notes of the date, store and staff member"],
          },
          {
            name: "Balance and fee history",
            why: "Shows the card's value and any fees taken from it.",
            examples: ["Balance checks over time", "Account statement for the card", "Copy of any refund demand sent"],
          },
        ],
      },
      {
        id: "amount-gcr",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the unused balance on the card, any fees taken, and " +
          "the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The balance",
            why: "Supports the dollar amount claimed.",
            examples: ["Last balance shown", "Original value on the receipt", "Records of purchases made with the card"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "excluded-card-gcr",
        name: "The business says the card is not covered by the gift card rules",
        plainExplanation:
          "Under s. 25.1(1) of O. Reg. 17/05, the gift card rules in ss. 25.2 to 25.5 do not apply to a " +
          "gift card that a supplier issues for a charitable purpose, a gift card that covers only one " +
          "specific good or service, a gift card issued by a financial institution, or the agreement " +
          "under which such a card is issued.",
        whenThisComesUp:
          "When the business says the card was a promotional, single-service, charity or bank-issued card.",
        sourceUrl: CPA_REG,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_REG_CONSOLIDATION,
      },
      {
        id: "dispute-gcr",
        name: "The business disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the balance was already used, or the card " +
          "was not issued by this business.",
        whenThisComesUp: "When the business files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: CPA_COURT_NOTE,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CJA, pinpoint: "Courts of Justice Act, s. 22(1)" }],
      },
      { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "store refused my gift card",
      "gift card expired",
      "they said my gift card was no good",
      "fees taken off my gift card balance",
      "prepaid card balance disappeared",
      "restaurant would not accept my gift certificate",
      "gift card dormancy fee",
      "store won't honour a gift card I was given",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: CPA_REG_NAME,
        officialUrl: CPA_REG,
        verifiedAt: VERIFIED,
        pinpoint: "s. 23 (\"gift card\"), ss. 25.1(1), 25.1(3), 25.3(1)-(2), 25.4(1)(b), 25.4(2.1), 25.4(3)-(4)",
      },
      {
        sourceName: CPA_NAME,
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 100(1), 100(3)",
      },
      {
        sourceName: LIMITATIONS_NAME,
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
    id: "sc-claim-timeshare-or-vacation-club",
    name: "A timeshare or vacation club",
    broughtBy:
      "The person who signed up for a timeshare, vacation ownership, or travel or vacation club membership and wants to cancel and get their money back. Not the seller or club.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "time-share-agreement-tsv",
        name: "The agreement is a time share agreement",
        plainExplanation:
          "Under s. 20(1) of the Consumer Protection Act, 2002, a \"time share agreement\" is a " +
          "consumer agreement by which a consumer acquires the right to use property as part of a " +
          "plan that provides for the use of the property to circulate periodically among persons " +
          "participating in the plan, whether or not the property is located in Ontario, or is " +
          "provided with access to discounts or benefits for the future provision of transportation, " +
          "accommodation or other goods or services related to travel. Under s. 2(2)(f), the Act does " +
          "not apply to consumer transactions for the purchase, sale or lease of real property, except " +
          "transactions with respect to time share agreements. Under s. 27, every time share agreement " +
          "shall be in writing, shall be delivered to the consumer and shall be made in accordance " +
          "with the prescribed requirements; O. Reg. 17/05, s. 26(1) says it shall be signed by the " +
          "consumer and the supplier and lists the information it shall set out.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 26(1)" }],
        evidenceCategories: [
          {
            name: "The agreement",
            why: "Shows what was bought, the price, and whether it was signed and delivered.",
            examples: ["Signed time share or membership agreement", "Any copy emailed later", "Note of the date the copy was received"],
          },
          {
            name: "What was paid",
            why: "Shows the deposit, down payment, financing and fees.",
            examples: ["Receipts", "Credit card statements", "Financing papers"],
          },
        ],
      },
      {
        id: "cancelled-in-time-tsv",
        name: "The agreement was cancelled within the time allowed",
        plainExplanation:
          "Under s. 28(1) of the Consumer Protection Act, 2002, a consumer may, without any reason, " +
          "cancel a time share agreement at any time from the date of entering into the agreement " +
          "until 10 days after receiving the written copy of it. Under s. 28(2), a consumer may also " +
          "cancel within one year after entering into it if the consumer does not receive a copy that " +
          "meets the requirements under s. 27. " +
          CPA_NOTICE,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The cancellation notice",
            why: "Shows the cancellation was given, how and on what day.",
            examples: ["Copy of the cancellation letter or email", "Registered mail or courier receipt", "Any reply"],
          },
          {
            name: "What the copy left out",
            why: "Shows whether the copy received met the requirements, if the one-year period is relied on.",
            examples: ["The copy of the agreement received", "A list of what is missing from it"],
          },
        ],
      },
      {
        id: "sales-pitch-tsv",
        name: "If the sales presentation was false or misleading",
        plainExplanation: CPA_MISREP,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "What was promised",
            why: "Shows what the seller said about the benefits, availability, resale or price.",
            examples: ["Brochures and handouts", "Notes made during or right after the presentation", "Emails or texts from the salesperson"],
          },
          {
            name: "What turned out to be true",
            why: "Shows how the promises differed from reality.",
            examples: ["Booking attempts that were refused", "Actual fee statements", "Prices found elsewhere"],
          },
        ],
      },
      {
        id: "refund-tsv",
        name: "The money was not refunded after cancelling",
        plainExplanation: CPA_REFUND + CPA_CARD,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, ss. 79(1), 85(1)" }],
        evidenceCategories: [
          {
            name: "Refund requests",
            why: "Shows the refund was asked for and not paid.",
            examples: ["Emails or letters asking for the money back", "Credit card dispute request", "Any reply from the seller"],
          },
          {
            name: "The amount paid",
            why: "Supports the dollar amount claimed.",
            examples: ["Receipts", "Bank or credit card statements", "Financing statements"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "bound-anyway-tsv",
        name: "The seller asks the court to hold the buyer to the agreement",
        plainExplanation: CPA_BOUND,
        whenThisComesUp:
          "When the seller says that, even if the agreement did not follow the Act, it would be unfair for the buyer not to be bound.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
      },
      {
        id: "dispute-tsv",
        name: "The seller disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the cancellation came too late, or the " +
          "agreement met the Act's requirements.",
        whenThisComesUp: "When the seller or club files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: CPA_COURT_NOTE,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CJA, pinpoint: "Courts of Justice Act, s. 22(1)" }],
      },
      { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "bought a timeshare and want out",
      "cancel my timeshare",
      "vacation club membership",
      "travel club promised discounts",
      "timeshare presentation pressure",
      "signed up for a vacation ownership plan",
      "timeshare company won't refund my deposit",
      "travel membership was a scam",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: CPA_NAME,
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 2(2)(f), 20(1) (\"time share agreement\"), 27, 28(1)-(2); ss. 14, 17(2), 18(1), 18(3)-(4); ss. 92-94, 96, 99, 100",
      },
      {
        sourceName: CPA_REG_NAME,
        officialUrl: CPA_REG,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 26(1), 79(1), 85(1)",
      },
      {
        sourceName: LIMITATIONS_NAME,
        officialUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 4, 5(1), 5(2)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
