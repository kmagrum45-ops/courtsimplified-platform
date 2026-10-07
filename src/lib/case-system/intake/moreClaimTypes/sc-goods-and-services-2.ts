/**
 * Case types, batch "sc-goods-and-services-2" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-goods-and-services-2.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-real-estate-agent-conduct -- A real estate agent's commission or conduct
 *   sc-claim-moving-company-damage-or-loss -- A moving company that damaged or lost things
 *   sc-claim-storage-company-dispute -- A dispute with a storage company
 *   sc-claim-wedding-or-event-vendor-failure -- A wedding or event supplier who let you down
 *   sc-claim-travel-agent-or-tour-operator -- A travel agent or tour operator
 *   sc-claim-airline-delay-or-cancellation -- A flight delayed, cancelled, or boarding denied
 *   sc-claim-airline-baggage-lost-or-damaged -- Baggage lost or damaged by an airline
 *   sc-claim-gym-or-personal-development-contract -- Cancelling a gym or class membership
 *   sc-claim-subscription-cancellation -- A subscription that will not cancel
 *   sc-claim-marketplace-private-sale -- A Marketplace or Kijiji sale that went wrong
 *
 * Every legal statement below rests on text saved in this repository: the
 * vendored corpus (docs/sources/corpus/, url from manifest.json). Four planned
 * types are NOT written:
 *   - sc-claim-real-estate-agent-conduct: the statute that governs real estate
 *     brokerages and their commissions and conduct is not saved. The only saved
 *     RECO page (reco-complaints.txt) is about complaints against RECO itself.
 *   - sc-claim-travel-agent-or-tour-operator: the Travel Industry Act, 2002 and
 *     the rules of the Travel Industry Compensation Fund are not saved; the only
 *     saved text is a one-line link description on an ontario.ca index page.
 *   - sc-claim-airline-delay-or-cancellation and
 *     sc-claim-airline-baggage-lost-or-damaged: air travel is governed by federal
 *     law and international conventions (passenger protection rules, carrier
 *     liability for baggage), none of which is saved.
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
const SGA = "https://www.ontario.ca/laws/docs/90s01_e.doc";
const SGA_CONSOLIDATION = "1994-12-09";
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const RSLA = "https://www.ontario.ca/laws/docs/90r25_e.doc";
const RSLA_CONSOLIDATION = "2024-01-01";
const FCA = "https://www.ontario.ca/laws/docs/90f34_e.doc";
const FCA_CONSOLIDATION = "1993-12-02";

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

const CPA_NOTICE =
  "Under s. 94, the consumer cancels by giving notice in accordance with s. 92, and the " +
  "cancellation takes effect when the notice is given. Under s. 92, the notice may be expressed " +
  "in any way, as long as it indicates the consumer's intention to seek the remedy being " +
  "requested, and unless the regulations require otherwise it may be oral or in writing and given " +
  "by any means. ";

const CPA_REFUND =
  "Under s. 96(1) of the Consumer Protection Act, 2002, if a consumer cancels a consumer " +
  "agreement, the supplier shall, in accordance with the prescribed requirements, refund to the " +
  "consumer any payment made under the agreement or any related agreement. O. Reg. 17/05, " +
  "s. 79(1) says the supplier shall do so within 15 days after the day the consumer gives notice " +
  "of cancellation in accordance with s. 92 of the Act. Under s. 96(6), if a consumer has " +
  "cancelled a consumer agreement and the supplier has not met its obligations under s. 96(1), " +
  "the consumer may commence an action. ";

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

const SGA_DAMAGES =
  "Under s. 51(1) of the Sale of Goods Act, where there is a breach of warranty by the seller, or " +
  "the buyer elects, or is compelled, to treat a breach of a condition as a breach of warranty, " +
  "the buyer may set up the breach against the seller in diminution or extinction of the price, or " +
  "maintain an action against the seller for damages for the breach. The measure of damages is " +
  "the estimated loss directly and naturally resulting in the ordinary course of events from the " +
  "breach (s. 51(2)). For a breach of warranty of quality, that loss is, in the absence of evidence " +
  "to the contrary, the difference between the value of the goods at the time of delivery to the " +
  "buyer and the value they would have had if they had answered to the warranty (s. 51(3)).";

export const TYPES_SC_GOODS_AND_SERVICES_2: ClaimType[] = [
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-moving-company-damage-or-loss",
    name: "A moving company that damaged or lost things",
    broughtBy:
      "The customer who hired a moving company, where belongings were damaged, lost, or held back until more money was paid. Not the mover who is owed money.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "agreement-for-the-move-mcd",
        name: "What the moving company agreed to do",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about what the moving company agreed to move, from where " +
          "to where, for what price, and the records that show it.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The moving contract or quote",
            why: "Shows what was to be moved, the price and the dates.",
            examples: ["Signed contract or bill of lading", "Written quote or estimate", "Emails or texts booking the move"],
          },
          {
            name: "An inventory of what was moved",
            why: "Shows which items the movers took.",
            examples: ["Inventory list signed at pickup", "Photos of the boxes and furniture before loading", "Your own packing list"],
          },
        ],
      },
      {
        id: "service-quality-mcd",
        name: "The move was not of a reasonably acceptable quality",
        plainExplanation:
          CPA_SERVICES +
          "This part of the checklist is about which belongings were damaged or lost, and how that " +
          "is shown.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Condition before and after",
            why: "Shows the items were fine before the move and damaged or missing after.",
            examples: ["Dated photos before packing", "Photos at unloading", "Notes made on the delivery receipt"],
          },
          {
            name: "Messages with the mover about the damage",
            why: "Shows when the mover was told and how they answered.",
            examples: ["Claim form or email to the mover", "Texts reporting missing items", "The mover's reply"],
          },
        ],
      },
      {
        id: "goods-held-for-more-money-mcd",
        name: "If the mover held belongings back to get more money",
        plainExplanation:
          "Under s. 16 of the Consumer Protection Act, 2002, it is an unfair practice for a person to " +
          "use their custody or control of a consumer's goods to pressure the consumer into " +
          "renegotiating the terms of a consumer transaction. Under s. 17(2), a person who performs " +
          "one such act is deemed to be engaging in an unfair practice. Under s. 18(1), any agreement " +
          "entered into by a consumer after or while a person has engaged in an unfair practice may " +
          "be rescinded by the consumer, and the consumer is entitled to any remedy that is available " +
          "in law, including damages. Under s. 18(3), the consumer must give notice within one year " +
          "after entering into the agreement, and under s. 18(4) the notice may be expressed in any " +
          "way as long as it indicates the consumer's intention to rescind the agreement or to seek " +
          "recovery where rescission is not possible, and the reasons for so doing.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The demand for more money",
            why: "Shows the mover asked for more than the agreed price before releasing the belongings.",
            examples: ["Texts or emails demanding extra payment", "New invoice handed over at delivery", "Notes of what was said, with the date"],
          },
          {
            name: "What was paid and the notice given",
            why: "Shows the extra amount paid and the notice sent afterward.",
            examples: ["Receipt or bank record for the extra payment", "Copy of the notice sent to the mover"],
          },
        ],
      },
      {
        id: "amount-mcd",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost of repairing or replacing the belongings, " +
          "any extra amount that was paid, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Cost to repair or replace",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair quotes or invoices", "Original receipts", "Prices for comparable replacement items"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-damage-mcd",
        name: "The mover disputes that it damaged or lost the belongings",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the items were already damaged, were " +
          "never handed over, or were delivered as agreed.",
        whenThisComesUp: "When the moving company files a Defence (Form 9A) saying it is not responsible for the damage or loss.",
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
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-return-of-property", "sc-remedy-interest-and-costs"],
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
      "movers broke my furniture",
      "moving company damaged my things",
      "movers lost some of my boxes",
      "items went missing during the move",
      "movers would not unload until I paid more",
      "moving company held my stuff hostage",
      "movers charged more than the quote",
      "furniture arrived scratched and broken",
      "the movers dropped my TV",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1, 2(1), 9(1), 9(3) (services); ss. 16, 17(2), 18(1), 18(3), 18(4) (goods held to renegotiate)",
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
    id: "sc-claim-storage-company-dispute",
    name: "A dispute with a storage company",
    broughtBy:
      "The customer who stored belongings with a storage company, where things were damaged, lost, or sold, or the storage bill is disputed. Not the storage company that is owed fees.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "storage-agreement-scd",
        name: "What the storage company agreed to provide",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the storage agreement: what was stored, where, at " +
          "what rate, and the records that show it.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The storage agreement",
            why: "Shows the unit, the rate and the terms.",
            examples: ["Signed rental or storage agreement", "Online booking confirmation", "Rate sheet"],
          },
          {
            name: "Payment records",
            why: "Shows what was paid and when.",
            examples: ["Bank or credit card statements", "Receipts", "Account statements from the company"],
          },
        ],
      },
      {
        id: "service-quality-scd",
        name: "The storage was not of a reasonably acceptable quality",
        plainExplanation:
          CPA_SERVICES +
          "This part of the checklist is about what was damaged or lost while in storage, and how " +
          "that is shown.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Condition of the belongings",
            why: "Shows the condition when stored and when taken out.",
            examples: ["Photos when the items went in", "Photos of water, pest or other damage", "List of missing items"],
          },
          {
            name: "Reports about the problem",
            why: "Shows when the company was told and what it said.",
            examples: ["Emails or texts to the company", "Incident report", "The company's reply"],
          },
        ],
      },
      {
        id: "sold-without-notice-scd",
        name: "If the storage company sold the belongings",
        plainExplanation:
          "Under s. 1(1) of the Repair and Storage Liens Act, a \"storer\" is a person who receives an " +
          "article for storage, or storage and repair, on the understanding that the person will be " +
          "paid for it. Under s. 15(1), a lien claimant who has a right under the Act to sell an " +
          "article shall not exercise that right unless it has given notice of intention to sell the " +
          "article. Under s. 15(2), the notice shall be in writing and shall be given at least fifteen " +
          "days before the sale to, among others, the person from whom the article was received for " +
          "storage. Under s. 21, a lien claimant who fails to comply with the requirements of that " +
          "Part is liable to any person who suffers damages as a result, and shall pay the person an " +
          "amount equal to the greater of $200 or the actual damages.",
        sourceUrl: RSLA,
        verifiedAt: VERIFIED,
        consolidationPeriod: RSLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Notices from the company",
            why: "Shows whether a written notice of intention to sell was given, and when.",
            examples: ["Letters or emails about unpaid fees", "Any notice of sale or auction", "Envelope or email showing the date sent"],
          },
          {
            name: "What was sold",
            why: "Shows which belongings were sold and their value.",
            examples: ["Auction listing", "List of the unit's contents", "Receipts or photos showing value"],
          },
        ],
      },
      {
        id: "amount-scd",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the value of what was damaged, lost or sold, any " +
          "fees disputed, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Value of the belongings",
            why: "Supports the dollar amount claimed.",
            examples: ["Original receipts", "Repair quotes", "Prices for comparable replacement items"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "storer-lien-scd",
        name: "The storage company says fees are owed and keeps the belongings",
        plainExplanation:
          "Under s. 4(1) of the Repair and Storage Liens Act, a storer has a lien against an article " +
          "it has stored for the amount agreed for the storage or, where no amount was agreed, the " +
          "fair value of the storage determined in accordance with any applicable regulations, and " +
          "the storer may retain possession of the article until the amount is paid. Under s. 22, " +
          "before the lien claimant has sold the article (or contracted for its sale), is deemed to " +
          "have irrevocably elected to retain it, or has given it to a charity, the owner may redeem the article " +
          "by paying the amount required to satisfy the lien.",
        whenThisComesUp: "When the storage company says the storage fees were not paid and will not release the belongings.",
        sourceUrl: RSLA,
        verifiedAt: VERIFIED,
        consolidationPeriod: RSLA_CONSOLIDATION,
      },
      {
        id: "dispute-damage-scd",
        name: "The storage company disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the company did not cause the damage or " +
          "loss, or that it followed the agreement.",
        whenThisComesUp: "When the storage company files a Defence (Form 9A) saying it is not responsible.",
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
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-return-of-property", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note:
          "Under s. 24(1) of the Repair and Storage Liens Act, where a person claims a lien against an " +
          "article and refuses to surrender possession of it to its owner, and there is a dispute about " +
          "the amount of the lien (including any question about the quality of the storage) or about " +
          "the right to keep the article (s. 24(1.2)), the owner may apply to the court to have the " +
          "dispute resolved and the article returned. Under s. 24(4), the applicant pays into court, or " +
          "deposits security for, the full amount claimed; where the application includes an offer of " +
          "settlement, the applicant pays in the amount offered and pays in or secures the balance. " +
          "Under s. 25, an application under that Part may be brought in any court of appropriate " +
          "monetary jurisdiction.",
        sourceUrl: RSLA,
        verifiedAt: VERIFIED,
        consolidationPeriod: RSLA_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "storage unit was broken into",
      "my things in storage were damaged",
      "water got into my storage locker",
      "storage company auctioned my unit",
      "they sold the contents of my storage unit",
      "self storage lost my belongings",
      "storage locker contents went missing",
      "mould on everything in storage",
      "storage company overcharged me",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Repair and Storage Liens Act, R.S.O. 1990, c. R.25",
        officialUrl: RSLA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 1(1) (\"storer\"); s. 4(1) (storer's lien); ss. 15(1)-(2), 21, 22; ss. 24(1), 24(1.2), 24(4), 25",
      },
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1, 2(1), 9(1), 9(3)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-wedding-or-event-vendor-failure",
    name: "A wedding or event supplier who let you down",
    broughtBy:
      "The customer who hired a business for a wedding or other event -- a venue, caterer, photographer, DJ, florist or planner -- that did not show up, did poor work, or kept a deposit. Not the supplier who is owed money.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "booking-agreement-wev",
        name: "What the supplier agreed to provide",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about what the supplier agreed to provide for the event, " +
          "the date, the price, the deposit, and the records that show it.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The booking agreement",
            why: "Shows the services, the event date, the price and any cancellation terms.",
            examples: ["Signed contract", "Booking confirmation email", "Invoice or quote"],
          },
          {
            name: "Payment records",
            why: "Shows the deposit and any other payments.",
            examples: ["E-transfer or credit card records", "Receipts"],
          },
        ],
      },
      {
        id: "service-quality-wev",
        name: "The services were not of a reasonably acceptable quality",
        plainExplanation:
          CPA_SERVICES +
          "This part of the checklist is about what the supplier did not provide, or what was wrong " +
          "with what was provided.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "What happened on the day",
            why: "Shows what was missing or done badly.",
            examples: ["Photos or video from the event", "Statements from guests or the venue", "The photos or files the supplier delivered"],
          },
          {
            name: "Messages with the supplier",
            why: "Shows when the supplier was told and how they answered.",
            examples: ["Emails or texts before and after the event", "Any explanation or apology"],
          },
        ],
      },
      {
        id: "cancelled-not-started-wev",
        name: "If the supplier never started, and the agreement was cancelled",
        plainExplanation:
          "Under s. 1 of the Consumer Protection Act, 2002, a \"future performance agreement\" is a " +
          "consumer agreement in respect of which delivery, performance or payment in full is not made " +
          "when the parties enter the agreement. Under s. 26(1)(b), a consumer may cancel a future " +
          "performance agreement at any time before performance begins if the supplier does not begin " +
          "performance within 30 days after the commencement date specified in the agreement, or an " +
          "amended commencement date the consumer agreed to in writing. Sections 22 to 26 apply where " +
          "the consumer's total potential payment obligation under the agreement, excluding the cost of " +
          "borrowing, exceeds a prescribed amount (s. 21(1)); O. Reg. 17/05, s. 23.1 prescribes $50 for " +
          "an agreement that is not a gift card agreement. " +
          CPA_NOTICE +
          CPA_REFUND,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, ss. 23.1, 79(1)" }],
        evidenceCategories: [
          {
            name: "Proof nothing was provided",
            why: "Shows the supplier did not begin by the agreed date or within 30 days after it.",
            examples: ["Messages asking where the supplier was", "Statements from people at the event", "Notes of no-shows"],
          },
          {
            name: "The cancellation and refund request",
            why: "Shows the agreement was cancelled, how and when, and that the refund was asked for.",
            examples: ["Copy of the cancellation email, text or letter", "Proof it was sent", "Any reply"],
          },
        ],
      },
      {
        id: "amount-wev",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the deposit and other payments, any extra cost of " +
          "hiring someone else, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Payments and replacement costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Receipts for the deposit", "Invoice from the replacement supplier", "Price difference shown in quotes"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "event-frustrated-wev",
        name: "The supplier says the event could not go ahead and keeps money for expenses",
        plainExplanation:
          "Under s. 2(1) of the Frustrated Contracts Act, the Act applies to any contract governed by " +
          "the law of Ontario that has become impossible of performance or been otherwise frustrated, " +
          "and to the parties which for that reason have been discharged. Under s. 3(1), sums paid " +
          "under the contract before the parties were discharged are recoverable, and sums payable " +
          "cease to be payable. Under s. 3(2), if the party to whom the sums were paid incurred " +
          "expenses in connection with performance before the parties were discharged, the court, if " +
          "it considers it just to do so having regard to all the circumstances, may allow that party " +
          "to retain or recover all or part of the sums paid or payable, not exceeding the amount of " +
          "the expenses. Under s. 3(6), where the contract contains a provision intended to have effect " +
          "in the event of circumstances that would frustrate it, the court shall give effect to that " +
          "provision, and to s. 3 only to the extent consistent with it.",
        whenThisComesUp:
          "When the supplier says the event could not happen for reasons outside anyone's control, and keeps some or all of the deposit for its expenses.",
        sourceUrl: FCA,
        verifiedAt: VERIFIED,
        consolidationPeriod: FCA_CONSOLIDATION,
      },
      {
        id: "dispute-services-wev",
        name: "The supplier disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the services were provided as agreed, or " +
          "that the contract allowed the supplier to keep the deposit.",
        whenThisComesUp: "When the supplier files a Defence (Form 9A) saying it did what it agreed to do.",
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
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "wedding photographer never delivered the photos",
      "caterer did not show up",
      "DJ cancelled on our wedding day",
      "venue kept our deposit",
      "wedding vendor will not refund the deposit",
      "event planner let us down",
      "florist did not deliver the flowers",
      "wedding photos were terrible",
      "the venue cancelled our booking",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1, 2(1), 9(1), 9(3); ss. 21(1), 26(1)(b) (future performance agreements); ss. 92, 94, 96(1), 96(6)",
      },
      {
        sourceName: "Frustrated Contracts Act, R.S.O. 1990, c. F.34",
        officialUrl: FCA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 2(1), 3(1), 3(2), 3(6)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-gym-or-personal-development-contract",
    name: "Cancelling a gym or class membership",
    broughtBy:
      "The member who joined a gym, fitness club, martial arts, dance or similar program, paid in advance, and wants to cancel or get money back. Not the gym that is owed fees.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "personal-development-agreement-gym",
        name: "The membership is a personal development services agreement",
        plainExplanation:
          "Under s. 20(1) of the Consumer Protection Act, 2002, \"personal development services\" " +
          "include services provided for health, fitness, diet or matters of a similar nature, and for " +
          "martial arts, sports, dance or similar activities, along with facilities provided for or " +
          "instruction on those services. Under s. 29(1), ss. 30 to 36 apply to personal development " +
          "services for which payment in advance is required and the consumer's total potential " +
          "payment obligation, excluding the cost of borrowing, exceeds a prescribed amount; O. Reg. " +
          "17/05, s. 27 prescribes $50. Under s. 29(2), those sections do not apply to services " +
          "provided on a non-profit or co-operative basis, by a private club primarily owned by its " +
          "members, as an incidental part of other goods or services, by a supplier funded or run by a " +
          "charitable or municipal organization or by the Province of Ontario or any of its agencies, " +
          "or by a golf club. Under s. 30(1), every personal development services agreement shall be " +
          "in writing, shall be delivered to the consumer and shall be made in accordance with the " +
          "prescribed requirements. Under s. 31(1), no such agreement may be made for a term longer " +
          "than one year after the day that all the services are made available to the consumer.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 27" }],
        evidenceCategories: [
          {
            name: "The membership agreement",
            why: "Shows what was bought, the term, and whether a written copy was given.",
            examples: ["Signed membership agreement", "Email with the agreement attached", "Note of the date the copy was received"],
          },
          {
            name: "Proof of payment in advance",
            why: "Shows that payment was required before the services were provided, and how much.",
            examples: ["Receipt for the upfront payment", "Bank or credit card statements", "Payment plan schedule"],
          },
        ],
      },
      {
        id: "cancellation-gym",
        name: "The membership was cancelled, or not renewed, as the Act allows",
        plainExplanation:
          "Under s. 35(1) of the Consumer Protection Act, 2002, a consumer may, without any reason, " +
          "cancel a personal development services agreement at any time within 10 days after the later " +
          "of receiving the written copy of the agreement and the day all the services are available. " +
          "Under s. 35(2), the consumer may also cancel within one year after entering into the " +
          "agreement if the consumer does not receive a copy of the agreement that meets the " +
          "requirements under s. 30. Under s. 31(4), an agreement that provides for a renewal or " +
          "extension is deemed not to be renewed or extended if the consumer notifies the supplier, " +
          "before the time for renewal or extension, that the consumer does not want to renew or " +
          "extend. " +
          CPA_NOTICE,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The cancellation or non-renewal notice",
            why: "Shows the notice was given, how, and on what date.",
            examples: ["Copy of the cancellation email or letter", "Screenshot of an online cancellation", "Notes of a phone call or visit, with the date"],
          },
          {
            name: "Dates that set the time limits",
            why: "Shows when the agreement was made, when the copy was received, and when all services became available.",
            examples: ["Date on the agreement", "Email delivering the copy", "Opening date of the facility or class"],
          },
        ],
      },
      {
        id: "refund-gym",
        name: "The money was not refunded after cancelling",
        plainExplanation: CPA_REFUND + CPA_CARD,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, ss. 79(1), 85(1)" }],
        evidenceCategories: [
          {
            name: "Charges after cancelling",
            why: "Shows payments taken after the cancellation took effect.",
            examples: ["Bank or credit card statements", "Receipts or account history from the gym"],
          },
          {
            name: "Refund requests",
            why: "Shows the refund was asked for and not paid.",
            examples: ["Emails or letters asking for the money back", "Credit card dispute request", "Any reply from the gym"],
          },
        ],
      },
      {
        id: "amount-gym",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the payments made, the charges after cancelling, and " +
          "the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "A list of payments",
            why: "Supports the dollar amount claimed.",
            examples: ["Table of each payment with its date", "Statements showing each charge"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "court-may-bind-gym",
        name: "The gym says the member is still bound by the agreement",
        plainExplanation: CPA_BOUND,
        whenThisComesUp:
          "When the gym says the member must keep paying even though the agreement or its copy did not meet the Act's requirements.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
      },
      {
        id: "dispute-cancellation-gym",
        name: "The gym disputes the cancellation",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the cancellation was late, was never " +
          "received, or was not allowed by the agreement.",
        whenThisComesUp: "When the gym files a Defence (Form 9A) saying the membership was not cancelled.",
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
      "gym will not let me cancel my membership",
      "fitness club contract cancellation",
      "gym auto-renewed my membership",
      "martial arts school will not refund",
      "dance studio kept my prepaid fees",
      "personal training package refund",
      "gym says I signed for two years",
      "yoga studio membership will not cancel",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 20(1) (\"personal development services\"); ss. 29-31, 35 (personal development services); ss. 92-96, 99, 100",
      },
      {
        sourceName: "O. Reg. 17/05 (General), under the Consumer Protection Act, 2002",
        officialUrl: CPA_REG,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 27, 79(1), 85(1)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-subscription-cancellation",
    name: "A subscription that will not cancel",
    broughtBy:
      "The customer who signed up for a subscription or ongoing service -- online, by phone or by mail -- and is still being charged, or was charged for something they did not agree to.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "subscription-terms-sub",
        name: "What the subscription agreement says about ending it",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the subscription's terms, how and when it was " +
          "cancelled, and the charges made after that.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The subscription terms",
            why: "Shows the price, how often it is charged, and how to cancel.",
            examples: ["Sign-up confirmation email", "Screenshot of the terms or plan page", "Account settings page"],
          },
          {
            name: "Proof of cancelling",
            why: "Shows when and how the cancellation was made.",
            examples: ["Cancellation confirmation", "Email or chat transcript asking to cancel", "Notes of a phone call, with the date"],
          },
        ],
      },
      {
        id: "internet-agreement-rules-sub",
        name: "If signed up online: the disclosure and copy rules",
        plainExplanation:
          "Under s. 20(1) of the Consumer Protection Act, 2002, an \"internet agreement\" is a consumer " +
          "agreement formed by text-based internet communications. Sections 38 to 40 apply where the " +
          "consumer's total potential payment obligation, excluding the cost of borrowing, exceeds a " +
          "prescribed amount (s. 37); O. Reg. 17/05, s. 31 prescribes $50. Under s. 38(1), before the " +
          "consumer enters into an internet agreement, the supplier shall disclose the prescribed " +
          "information; O. Reg. 17/05, s. 32, para. 6 includes, if the goods and services are to be " +
          "supplied during an indefinite period, the amount and frequency of periodic payments. Under " +
          "s. 38(2), the supplier shall give the consumer an express opportunity to accept or decline " +
          "the agreement and to correct errors immediately before entering into it. Under s. 40(1), " +
          "the consumer may cancel at any time from the date the agreement is entered into until seven " +
          "days after receiving a copy of it if the supplier did not make that disclosure or give that " +
          "opportunity. Under s. 39(1) and O. Reg. 17/05, s. 33(1), the supplier shall deliver a copy " +
          "of the agreement in writing within 15 days after the consumer enters into it, and under " +
          "s. 40(2) the consumer may cancel within 30 days after entering into the agreement if the " +
          "supplier does not comply with a requirement under s. 39.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, ss. 31, 32 para. 6, 33(1)" }],
        evidenceCategories: [
          {
            name: "The sign-up screens",
            why: "Shows what was disclosed and whether there was a clear chance to accept or decline.",
            examples: ["Screenshots of the checkout or sign-up page", "Order summary", "The written copy received, with its date"],
          },
        ],
      },
      {
        id: "unsolicited-or-changed-sub",
        name: "If charged for something not requested, or after a material change",
        plainExplanation:
          "Under s. 13(3) of the Consumer Protection Act, 2002, a request for goods or services shall " +
          "not be inferred solely on the basis of payment, inaction or the passing of time. Under " +
          "s. 13(4), if a consumer is receiving goods or services on an ongoing or periodic basis and " +
          "there is a material change in them, they are deemed to be unsolicited from the time of the " +
          "material change forward unless the supplier is able to establish that the consumer " +
          "consented to the material change; under s. 13(5), the supplier may rely on consent made " +
          "orally, in writing or by other affirmative action, but bears the onus of proving it. Under " +
          "s. 13(2), no supplier shall demand payment, or suggest that a consumer is required to pay, " +
          "for unsolicited goods or services. Under s. 13(6), a consumer who paid for unsolicited goods " +
          "or services may demand a refund in accordance with s. 92 within one year after making the " +
          "payment; O. Reg. 17/05, s. 21 says the supplier shall refund it within 15 days after the day " +
          "the consumer demands it, and under s. 13(8) the consumer may commence an action to recover " +
          "the payment in accordance with s. 100.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 21" }],
        evidenceCategories: [
          {
            name: "What changed, and when",
            why: "Shows the service or price changed, or that the charge was for something never requested.",
            examples: ["Notice of a price or plan change", "Statements showing new charges", "Screenshots of the old and new plan"],
          },
          {
            name: "The refund demand",
            why: "Shows the refund was asked for within one year of the payment.",
            examples: ["Copy of the refund demand", "Proof it was sent", "Any reply"],
          },
        ],
      },
      {
        id: "amount-sub",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about each charge being disputed, and the documents those " +
          "figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "A list of the disputed charges",
            why: "Supports the dollar amount claimed.",
            examples: ["Table of each charge with its date", "Bank or credit card statements"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-cancellation-sub",
        name: "The company disputes the cancellation or the charges",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the subscription was never cancelled, or " +
          "that the customer agreed to the charges.",
        whenThisComesUp: "When the company files a Defence (Form 9A) saying the charges were authorized.",
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
      "subscription will not let me cancel",
      "still charging me after I cancelled the subscription",
      "free trial turned into monthly charges",
      "subscription price went up without asking",
      "recurring charge I never signed up for",
      "cannot find a way to cancel online",
      "streaming service keeps billing me",
      "auto-renewal charge on my credit card",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 13 (unsolicited goods or services); s. 20(1) (\"internet agreement\"); ss. 37-40 (internet agreements); s. 100",
      },
      {
        sourceName: "O. Reg. 17/05 (General), under the Consumer Protection Act, 2002",
        officialUrl: CPA_REG,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 21, 31, 32 para. 6, 33(1)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-marketplace-private-sale",
    name: "A Marketplace or Kijiji sale that went wrong",
    broughtBy:
      "The buyer who bought something from a private person through an online marketplace or classified ad, where the item was not as described, was never delivered, or was not the seller's to sell.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "contract-of-sale-mps",
        name: "There was a sale of goods",
        plainExplanation:
          "Under s. 2(1) of the Sale of Goods Act, a contract of sale of goods is a contract whereby " +
          "the seller transfers or agrees to transfer the property in the goods to the buyer for a " +
          "money consideration, called the price. This part of the checklist is about the item, the " +
          "price, what the ad and the messages said, and how it was paid for.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The ad and the messages",
            why: "Shows how the item was described and what was agreed.",
            examples: ["Screenshot of the listing", "Marketplace or Kijiji messages", "Texts with the seller"],
          },
          {
            name: "Proof of payment",
            why: "Shows the price paid and to whom.",
            examples: ["E-transfer confirmation", "Bank statement", "Receipt or note of a cash payment"],
          },
        ],
      },
      {
        id: "description-and-title-mps",
        name: "The item did not match the description, or was not the seller's to sell",
        plainExplanation:
          "Under s. 14 of the Sale of Goods Act, where there is a contract for the sale of goods by " +
          "description, there is an implied condition that the goods will correspond with the " +
          "description. Under s. 13, unless the circumstances of the contract show a different " +
          "intention, there is an implied condition that the seller has a right to sell the goods, an " +
          "implied warranty that the buyer will have and enjoy quiet possession of the goods, and an " +
          "implied warranty that the goods will be free from any charge or encumbrance in favour of a " +
          "third party not declared or known to the buyer before or at the time the contract is made. " +
          "Under s. 15, subject to the Act and any statute, there is no implied warranty or condition " +
          "as to the quality or fitness for any particular purpose of goods supplied under a contract " +
          "of sale, except as that section lists; the implied condition of merchantable quality in " +
          "para. 2 applies where goods are bought by description from a seller who deals in goods of " +
          "that description.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "How the item differs from the ad",
            why: "Compares what was described with what was received.",
            examples: ["The listing next to photos of the item received", "Repair person's note on the item", "Serial number or model check"],
          },
          {
            name: "Proof someone else owns it",
            why: "Shows the seller had no right to sell it, or it was subject to someone else's claim.",
            examples: ["Police report about stolen property", "Notice from a lender or the true owner", "Record of the item being taken back"],
          },
        ],
      },
      {
        id: "not-delivered-mps",
        name: "If the item was paid for but never handed over",
        plainExplanation:
          "Under s. 49(1) of the Sale of Goods Act, where the seller wrongfully neglects or refuses to " +
          "deliver the goods to the buyer, the buyer may bring an action against the seller for " +
          "damages for non-delivery. The measure of damages is the estimated loss directly and " +
          "naturally resulting in the ordinary course of events from the seller's breach of contract " +
          "(s. 49(2)). Under s. 52, nothing in the Act affects the right of the buyer to recover money " +
          "paid where the consideration for the payment of it has failed.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Proof nothing was delivered",
            why: "Shows the seller was paid and did not hand over or ship the item.",
            examples: ["Messages arranging pickup or shipping", "Messages asking where the item is", "Screenshot showing the seller blocked you or deleted the ad"],
          },
        ],
      },
      {
        id: "amount-mps",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          SGA_DAMAGES +
          " This part of the checklist is about the price paid, what the item is actually worth or " +
          "costs to fix, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: SGA, pinpoint: "Sale of Goods Act, s. 51(1)-(3)" }],
        evidenceCategories: [
          {
            name: "Value and repair costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair quote", "Prices of the same item in working condition", "Proof of the price paid"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "goods-accepted-mps",
        name: "The seller says the buyer accepted the item",
        plainExplanation: SGA_ACCEPTED,
        whenThisComesUp: "When the seller says the buyer looked at the item, took it and kept it, so it cannot be returned.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
      },
      {
        id: "sold-as-is-mps",
        name: "The seller says the item was sold \"as is\"",
        plainExplanation:
          "Under s. 53 of the Sale of Goods Act, where any right, duty or liability would arise under a " +
          "contract of sale by implication of law, it may be negatived or varied by express agreement, " +
          "or by the course of dealing between the parties, or by usage, if the usage is such as to " +
          "bind both parties to the contract.",
        whenThisComesUp: "When the seller says the ad or the messages said \"as is\" or that no promises were made about the item.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
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
      "bought it on Facebook Marketplace",
      "Kijiji seller lied about the item",
      "paid by e-transfer and never got the item",
      "the item was not as described in the ad",
      "seller blocked me after I paid",
      "bought a stolen item from an online ad",
      "private seller will not give my money back",
      "it broke the day after I bought it from a stranger",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Sale of Goods Act, R.S.O. 1990, c. S.1",
        officialUrl: SGA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 2(1), 12(3), 13, 14, 15, 34, 49, 51, 52, 53",
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
];
