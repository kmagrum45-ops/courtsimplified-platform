/**
 * Case types, batch "sc-goods-and-services-3" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-goods-and-services-3.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-warranty-refused -- A warranty the seller will not honour
 *   sc-claim-private-career-college-refund -- A private career college refund
 *   sc-claim-college-or-university-fee-dispute -- A college or university fee dispute
 *   sc-claim-driving-school -- A driving school or lessons
 *   sc-claim-item-damaged-by-a-service -- Something damaged by a cleaner, tailor or repairer
 *   sc-claim-courier-lost-or-damaged-parcel -- A parcel lost or damaged by a courier
 *   sc-claim-phone-internet-or-tv-billing -- A phone, internet or TV bill
 *   sc-claim-electricity-or-gas-billing -- An electricity or gas bill
 *   sc-claim-water-heater-or-hvac-rental -- A water heater or furnace rental contract
 *   sc-claim-solar-or-energy-efficiency-contract -- A solar or energy-efficiency contract
 *
 * Every legal statement below rests on text saved in this repository: the
 * vendored corpus (docs/sources/corpus/, url from manifest.json). Four planned
 * types are NOT written:
 *   - sc-claim-college-or-university-fee-dispute: the only saved text on a
 *     student's claim against a university is Jaffer v. York University, 2010
 *     ONCA 654 (docs/sources/decisions/), which has no verified public page in
 *     publicSourceUrl.ts, so it cannot be cited. The Ontario Career Colleges
 *     Act, 2005 excludes colleges of applied arts and technology and
 *     universities (s. 1(1), "career college"). Nothing else saved states the
 *     rules.
 *   - sc-claim-courier-lost-or-damaged-parcel: nothing saved states a
 *     carrier's liability for lost or damaged goods, or the limits on it. The
 *     Consumer Protection Act, 2002's general service warranty alone would
 *     present a partial rule as the whole one.
 *   - sc-claim-phone-internet-or-tv-billing: the saved telecom material is
 *     the CCTS page (ccts-cprst.ca) and Steps to Justice pages, none on an
 *     official domain the checks accept; no federal telecom rule is saved.
 *   - sc-claim-electricity-or-gas-billing: the Consumer Protection Act, 2002
 *     does not apply to the supply of a public utility (s. 2(3), (5)), and the
 *     law that does govern energy retailers and utilities is not saved (the
 *     OEB page is a menu, on a domain the checks do not accept).
 * Notes on what was written:
 *   - The career college refund rests on the Act's own requirements (written
 *     contract, refund policy in the contract, two-day rescission). The
 *     prescribed contents of the refund policy are in a regulation that is not
 *     saved, so the entry points to the contract's own policy and says no more.
 *   - CPA s. 100(1) says a consumer's action may be started in the Superior
 *     Court of Justice; CJA s. 22(1) says the Small Claims Court is a branch of
 *     that court. The notes state both and nothing further.
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
const HTA = "https://www.ontario.ca/laws/docs/90h08_e.doc";
const CAREER = "https://www.ontario.ca/laws/docs/05p28_e.doc";
const CAREER_CONSOLIDATION = "2024-01-01";
const RSLA = "https://www.ontario.ca/laws/docs/90r25_e.doc";
const RSLA_CONSOLIDATION = "2024-01-01";

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

const CPA_COURT_NOTE =
  "Under s. 100(1) of the Consumer Protection Act, 2002, if a consumer has a right to commence " +
  "an action under the Act, the consumer may commence the action in the Superior Court of " +
  "Justice. Under s. 22(1) of the Courts of Justice Act, the Small Claims Court is continued as a " +
  "branch of the Superior Court of Justice. Under s. 100(2) of the Consumer Protection Act, 2002, " +
  "if a consumer is successful in an action, unless in the circumstances it would be inequitable " +
  "to do so, the court shall order that the consumer recover the full payment to which they are " +
  "entitled under the Act.";

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

const CPA_SERVICES_QUALITY =
  "Under s. 9(1) of the Consumer Protection Act, 2002, the supplier is deemed to warrant that " +
  "the services supplied under a consumer agreement are of a reasonably acceptable quality. ";

const CPA_NO_WAIVER =
  "Under s. 9(3), any term or acknowledgement, whether part of the consumer agreement or not, " +
  "that purports to negate or vary an implied condition or warranty under the Sale of Goods Act " +
  "or a deemed condition or warranty under the Consumer Protection Act, 2002 is void. ";

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
  "cancellation takes effect when the notice is given. Under s. 92, the notice may be expressed in " +
  "any way, as long as it indicates the consumer's intention to seek the remedy being requested, " +
  "and unless the regulations require otherwise it may be oral or in writing and given by any " +
  "means. ";

const CPA_UNFAIR_PRACTICE =
  "Under s. 14(1) of the Consumer Protection Act, 2002, it is an unfair practice for a person to " +
  "make a false, misleading or deceptive representation. The examples in s. 14(2) include a " +
  "representation that the goods or services have performance characteristics, benefits or " +
  "qualities they do not have (para. 1), and a representation that a specific price advantage " +
  "exists, if it does not (para. 11). Under s. 18(1), any agreement entered into by a consumer " +
  "after or while a person has engaged in an unfair practice may be rescinded by the consumer, " +
  "and the consumer is entitled to any remedy that is available in law, including damages. Under " +
  "s. 18(3), the consumer must give notice within one year after entering into the agreement. " +
  "Under s. 18(4), the notice may be expressed in any way as long as it indicates the intention " +
  "to rescind the agreement (or to seek recovery where rescission is not possible) and the " +
  "reasons for doing so. ";

const CPA_UNFAIR_PRACTICE_NOTE =
  "Under s. 18(8) of the Consumer Protection Act, 2002, if a consumer has delivered notice under " +
  "s. 18 and has not received a satisfactory response within the prescribed period, the consumer " +
  "may commence an action. O. Reg. 17/05, s. 22 sets that period: the consumer may commence an " +
  "action if they do not receive a satisfactory response within 30 days after the day they give " +
  "the notice.";

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
  "under its patent or other trade name (para. 1). Under s. 1(1), \"quality of goods\" includes " +
  "their state or condition. ";

const SGA_DAMAGES =
  "Under s. 51(1) of the Sale of Goods Act, where there is a breach of warranty by the seller, or " +
  "the buyer elects, or is compelled, to treat a breach of a condition as a breach of warranty, " +
  "the buyer may set up the breach against the seller in diminution or extinction of the price, or " +
  "maintain an action against the seller for damages for the breach. The measure of damages is " +
  "the estimated loss directly and naturally resulting in the ordinary course of events from the " +
  "breach (s. 51(2)). For a breach of warranty of quality, that loss is, in the absence of evidence " +
  "to the contrary, the difference between the value of the goods at the time of delivery to the " +
  "buyer and the value they would have had if they had answered to the warranty (s. 51(3)). ";

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

const DIRECT_AGREEMENT =
  "Under s. 20(1) of the Consumer Protection Act, 2002, a \"direct agreement\" is a consumer " +
  "agreement that is negotiated or concluded in person at a place other than the supplier's place " +
  "of business, or a market place, auction, trade fair, agricultural fair or exhibition. ";

const DIRECT_AGREEMENT_RETURN =
  "Under s. 96(2) of the Consumer Protection Act, 2002, upon cancelling a consumer agreement, the " +
  "consumer, in accordance with the prescribed requirements, shall permit the goods that came into " +
  "their possession under the agreement or a related agreement to be repossessed, shall return the " +
  "goods, or shall deal with them in such manner as may be prescribed. Under s. 96(3), the consumer " +
  "shall take reasonable care of those goods for the prescribed period. Under s. 96(7), if a " +
  "consumer has cancelled a consumer agreement and has not met the consumer's obligations under " +
  "s. 96, the supplier or the person to whom the obligation is owed may commence an action.";

export const TYPES_SC_GOODS_AND_SERVICES_3: ClaimType[] = [
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-warranty-refused",
    name: "A warranty the seller will not honour",
    broughtBy:
      "The buyer of goods that broke down or proved faulty, where the seller will not repair, replace or refund under the warranty.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "purchase-and-warranty-wr",
        name: "What was bought, and what the warranty promised",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the purchase, the written warranty or promise that " +
          "came with it, and what it said would be done if the goods failed.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Proof of purchase",
            why: "Shows what was bought, from whom, when, and for how much.",
            examples: ["Receipt or invoice", "Order confirmation", "Bank or credit card statement"],
          },
          {
            name: "The warranty terms",
            why: "Shows what the warranty covered and for how long.",
            examples: ["Warranty card or booklet", "Extended warranty contract", "Screenshot of the warranty on the seller's website"],
          },
        ],
      },
      {
        id: "goods-not-merchantable-wr",
        name: "The goods were not of merchantable quality or fit for their purpose",
        plainExplanation:
          SGA_QUALITY +
          "Under para. 4 of s. 15, an express warranty or condition does not negative a warranty or " +
          "condition implied by the Act unless inconsistent with it. This part of the checklist is " +
          "about what went wrong with the goods and when.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Records of the fault",
            why: "Shows what went wrong and when it started.",
            examples: ["Dated photos or video of the fault", "Error messages", "Notes of when it stopped working"],
          },
          {
            name: "An independent opinion",
            why: "Describes the defect and what it takes to fix it.",
            examples: ["Repair shop diagnosis", "Written repair quote", "Technician's report"],
          },
        ],
      },
      {
        id: "consumer-terms-cannot-be-waived-wr",
        name: "For a consumer: the implied terms apply and cannot be signed away",
        plainExplanation:
          CPA_SCOPE +
          "Under s. 9(2), the implied conditions and warranties applying to the sale of goods by " +
          "virtue of the Sale of Goods Act are deemed to apply with necessary modifications to goods " +
          "that are leased or traded or otherwise supplied under a consumer agreement. " +
          CPA_NO_WAIVER +
          "Under s. 11, any ambiguity that allows for more than one reasonable interpretation of a " +
          "consumer agreement provided by the supplier to the consumer shall be interpreted to the " +
          "benefit of the consumer. This part of the checklist is about the warranty wording and any " +
          "terms the seller points to.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The seller's refusal",
            why: "Shows what the seller said and which terms it relied on.",
            examples: ["Email or letter refusing the warranty claim", "Notes of phone calls", "Chat transcripts"],
          },
          {
            name: "The purchase was for personal use",
            why: "Shows the buyer was acting for personal, family or household purposes.",
            examples: ["Receipt in the buyer's own name", "Where the goods are used"],
          },
        ],
      },
      {
        id: "loss-wr",
        name: "The loss, and how the amount is calculated",
        plainExplanation:
          SGA_DAMAGES +
          AMOUNT +
          "This part of the checklist is about the cost of repair or replacement, or the loss in " +
          "value, and the documents those figures come from.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: SC_GUIDE, pinpoint: "Making a claim -- How to fill out the claim form" }],
        evidenceCategories: [
          {
            name: "Cost of repair or replacement",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair invoices", "Written quotes", "Price of a comparable replacement"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "goods-accepted-wr",
        name: "The goods were kept and used before the problem was raised",
        plainExplanation: SGA_ACCEPTED,
        whenThisComesUp:
          "When the seller says the buyer kept and used the goods for a long time, so they can no longer be returned for a refund.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
      },
      {
        id: "dispute-cause-wr",
        name: "The seller disputes what caused the fault",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the fault is not covered, for example " +
          "because of misuse or wear.",
        whenThisComesUp: "When the seller files a Defence (Form 9A) saying the fault falls outside the warranty.",
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
      "store won't honour the warranty",
      "still under warranty",
      "warranty claim was denied",
      "manufacturer refused to fix it",
      "extended warranty refused",
      "they said the warranty doesn't cover it",
      "broke down within the warranty period",
      "seller won't repair or replace it",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Sale of Goods Act, R.S.O. 1990, c. S.1",
        officialUrl: SGA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 1(1) (\"quality of goods\"); s. 12(3); s. 15; s. 34; s. 51",
      },
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1, 2(1), 9(2), 9(3), 11",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-private-career-college-refund",
    name: "A private career college refund",
    broughtBy:
      "A student (or former student) of a private career college who wants fees refunded. Not a student of a public college or a university.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "career-college-contract-pcc",
        name: "A written contract with a career college, and the fees paid",
        plainExplanation:
          "Under s. 1(1) of the Ontario Career Colleges Act, 2005, a \"career college\" is an " +
          "institution, agency or entity that provides one or more vocational programs to students " +
          "for a fee and under individual contracts with the students. It does not include a college " +
          "of applied arts and technology, a university established under any Act, or a school as " +
          "defined in the Education Act. Under s. 1(2), a fee includes any fee charged by a career " +
          "college, including an application, administrative or tuition fee. Under s. 28, every " +
          "career college shall ensure that each contract with a student for a vocational program " +
          "for a fee is in writing, and shall give the student a copy. This part of the checklist is " +
          "about the contract and what was paid.",
        sourceUrl: CAREER,
        verifiedAt: VERIFIED,
        consolidationPeriod: CAREER_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The enrolment contract",
            why: "Shows the program, the fees and the terms agreed.",
            examples: ["Signed enrolment contract", "Program outline", "Fee schedule"],
          },
          {
            name: "Proof of payment",
            why: "Shows what was paid, when and how.",
            examples: ["Receipts", "Bank or credit card statements", "Student loan disbursement records"],
          },
        ],
      },
      {
        id: "refund-policy-pcc",
        name: "The refund the college's own policy provides",
        plainExplanation:
          "Under s. 29(1) of the Ontario Career Colleges Act, 2005, every career college shall adopt " +
          "a policy relating to the refund of fees paid by students to the college. Under s. 29(2), " +
          "the policy shall include the prescribed provisions, including provisions respecting the " +
          "refund of fees paid by international students. Under s. 29(3), the college shall include " +
          "its fee refund policy in every contract it enters into with a student. This part of the " +
          "checklist is about what the refund policy in the contract says, when the student withdrew " +
          "or was dismissed, and what refund that works out to.",
        sourceUrl: CAREER,
        verifiedAt: VERIFIED,
        consolidationPeriod: CAREER_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The refund policy",
            why: "Sets out the refund owed at each point in the program.",
            examples: ["Refund policy page of the contract", "Any separate refund schedule the college gave"],
          },
          {
            name: "When and how the student left",
            why: "The refund owed can depend on the date of withdrawal or dismissal.",
            examples: ["Withdrawal letter or email", "Dismissal notice", "Attendance record"],
          },
        ],
      },
      {
        id: "two-day-rescission-pcc",
        name: "The contract was cancelled within two days of getting a copy",
        plainExplanation:
          "Under s. 36(1) of the Ontario Career Colleges Act, 2005, a person who enters into a " +
          "written contract with a career college to receive instruction in a vocational program may " +
          "rescind the contract by delivering a written notice of rescission to the college within " +
          "two days after receiving a copy of the contract. Under s. 36(2), the notice is delivered " +
          "to the college at the address shown in the contract. Under s. 36(3), the person shall " +
          "immediately return any goods received under the contract and the career college shall " +
          "return any money received under the contract. This part of the checklist applies only " +
          "where the contract was cancelled in that two-day window.",
        sourceUrl: CAREER,
        verifiedAt: VERIFIED,
        consolidationPeriod: CAREER_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The notice of rescission",
            why: "Shows it was in writing, sent to the contract address, and when.",
            examples: ["Copy of the letter or email", "Proof of delivery", "Date the contract copy was received"],
          },
          {
            name: "Return of goods",
            why: "Shows any goods received under the contract were returned.",
            examples: ["Receipt for returned books or equipment", "Courier tracking"],
          },
        ],
      },
      {
        id: "amount-pcc",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the fees paid, the refund the policy provides, any " +
          "amount already refunded, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Refund calculation",
            why: "Supports the dollar amount claimed.",
            examples: ["A short worked calculation using the refund policy", "Any partial refund received", "Requests for the refund and replies"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "college-claims-fees-pcc",
        name: "The college says fees are owed by the student",
        plainExplanation:
          "Under s. 12(1) of the Ontario Career Colleges Act, 2005, no action shall be brought " +
          "against a student for a fee in relation to a vocational program unless the program was " +
          "provided by a career college whose operator is registered and the provision of the " +
          "program has been approved by the Superintendent. Under s. 12(2), the court may stay such " +
          "an action upon motion.",
        whenThisComesUp:
          "When the college answers the refund claim by saying the student owes it fees, or sues the student for them.",
        sourceUrl: CAREER,
        verifiedAt: VERIFIED,
        consolidationPeriod: CAREER_CONSOLIDATION,
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
          "Under s. 31 of the Ontario Career Colleges Act, 2005, every career college shall establish " +
          "a procedure to resolve student complaints and shall include it in every contract it enters " +
          "into with a student. Under s. 3(2), the Training Completion Assurance Fund exists so that, " +
          "if a career college ceases to provide a vocational program in which students are " +
          "enrolled, the students will be given the opportunity to complete the program elsewhere, or " +
          "will receive a refund of the portion of the fees they paid for which they did not receive " +
          "any instruction or other benefit.",
        sourceUrl: CAREER,
        verifiedAt: VERIFIED,
        consolidationPeriod: CAREER_CONSOLIDATION,
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
      "career college won't refund my tuition",
      "private college refund",
      "I withdrew from the program",
      "dropped out of a private college",
      "the school closed my program",
      "vocational school kept my fees",
      "cancelled my enrolment contract",
      "college refund policy",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Ontario Career Colleges Act, 2005, S.O. 2005, c. 28, Sched. L",
        officialUrl: CAREER,
        verifiedAt: VERIFIED,
        pinpoint: "s. 1 (\"career college\"); s. 3(2); s. 12; s. 28; s. 29; s. 31; s. 36",
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
    id: "sc-claim-driving-school",
    name: "A driving school or lessons",
    broughtBy:
      "A student (or a parent who paid) who bought driving lessons or a driving course that was not delivered, was cancelled, or was not as promised.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "lessons-quality-drv",
        name: "The lessons were not of a reasonably acceptable quality",
        plainExplanation:
          CPA_SERVICES_QUALITY +
          CPA_SCOPE +
          CPA_NO_WAIVER +
          "This part of the checklist is about the lessons that were agreed, what was paid, and what " +
          "was wrong with the lessons that were given.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The agreement and payment",
            why: "Shows the lessons or course bought, the price and the schedule.",
            examples: ["Contract or registration form", "Receipt", "Course outline or package description"],
          },
          {
            name: "Records of the lessons",
            why: "Shows which lessons happened and what went wrong.",
            examples: ["Lesson log or booking history", "Messages about missed or cut-short lessons", "Notes kept after each lesson"],
          },
        ],
      },
      {
        id: "lessons-not-started-drv",
        name: "The lessons did not start, the agreement was cancelled, and no refund came",
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
          "17/05, s. 23.1 prescribes $50 for an agreement that is not a gift card agreement. " +
          CPA_NOTICE +
          CPA_REFUND,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, ss. 23.1, 79(1)" }],
        evidenceCategories: [
          {
            name: "Proof the lessons never started",
            why: "Shows nothing was provided by the agreed date, or within 30 days.",
            examples: ["Messages asking when lessons will start", "Booking requests with no reply", "Notes of no-shows"],
          },
          {
            name: "The cancellation and refund request",
            why: "Shows the agreement was cancelled, how and when, and that no refund came.",
            examples: ["Copy of the cancellation email, text or letter", "Proof it was sent", "Any reply from the school"],
          },
        ],
      },
      {
        id: "licence-misrepresented-drv",
        name: "The school or instructor was not what it said it was",
        plainExplanation:
          "Under s. 58(1) of the Highway Traffic Act, an individual shall not provide a prescribed " +
          "class of driving instruction for compensation except under the authority of a driving " +
          "instructor licence that authorizes that class of instruction. Under s. 58(6), no person " +
          "shall hold themself out as being qualified to provide driving instruction for compensation " +
          "in a prescribed class unless licensed to do so. Under s. 14(1) of the Consumer Protection " +
          "Act, 2002, it is an unfair practice to make a false, misleading or deceptive " +
          "representation; the examples in s. 14(2) include a representation that the person who is " +
          "to supply the goods or services has sponsorship, approval, status, affiliation or " +
          "connection the person does not have (para. 2). Under s. 18(1), an agreement entered into " +
          "after or while a person has engaged in an unfair practice may be rescinded by the " +
          "consumer, and the consumer is entitled to any remedy available in law, including damages. " +
          "Under s. 18(3), the consumer must give notice within one year after entering into the " +
          "agreement.",
        sourceUrl: HTA,
        verifiedAt: VERIFIED,
        consolidationPeriod: "2026-07-01",
        alsoCites: [{ sourceUrl: CPA, pinpoint: "ss. 14(1), 14(2) para. 2, 18(1), 18(3)" }],
        evidenceCategories: [
          {
            name: "What the school said about itself",
            why: "Shows the representation that was made before signing up.",
            examples: ["Website or ad screenshots", "Brochure", "Messages describing the instructor or course"],
          },
          {
            name: "The notice to the school",
            why: "Shows the agreement was rescinded, why, and when.",
            examples: ["Copy of the email or letter", "Proof it was sent within one year"],
          },
        ],
      },
      {
        id: "amount-drv",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about what was paid, the value of any lessons actually " +
          "received, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Payment and refund records",
            why: "Supports the dollar amount claimed.",
            examples: ["Receipts and statements", "Any partial refund received", "A short worked calculation"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "late-start-accepted-drv",
        name: "The student agreed to a late start",
        plainExplanation:
          "Under s. 26(3) of the Consumer Protection Act, 2002, if, after the 30-day period has " +
          "expired, the consumer agrees to accept delivery or authorize commencement, the consumer may " +
          "not cancel the agreement under s. 26. Under s. 26(4)(b), a supplier is considered to have " +
          "commenced performance if commencement was attempted but was refused by the consumer, or did " +
          "not occur because no person was available to enable commencement on a day for which " +
          "reasonable notice was given.",
        whenThisComesUp:
          "When the school says the student agreed to new lesson dates, or did not show up for lessons that were booked.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
      },
      {
        id: "dispute-quality-drv",
        name: "The school disputes what was wrong with the lessons",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the lessons were given as agreed.",
        whenThisComesUp: "When the school files a Defence (Form 9A) saying the lessons met the agreement.",
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
        note: CPA_COURT_NOTE,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CJA, pinpoint: "s. 22(1)" }],
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "driving school took my money",
      "driving lessons never happened",
      "driving instructor kept cancelling",
      "paid for a driver training course",
      "driving school won't refund",
      "instructor was not licensed",
      "beginner driver course",
      "driving school closed",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1, 2(1), 9(1), 9(3), 14, 18, 21(1), 26, 92, 94, 96, 100",
      },
      {
        sourceName: "Highway Traffic Act, R.S.O. 1990, c. H.8",
        officialUrl: HTA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 58(1), (6)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-item-damaged-by-a-service",
    name: "Something damaged by a cleaner, tailor or repairer",
    broughtBy:
      "A customer who left an item (clothing, an appliance, a device or other belongings) with a business for cleaning, alteration or repair, and got it back damaged, or not at all.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "item-left-for-service-dmg",
        name: "The item was left with the business, and its condition then",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about what was left with the business, what work was agreed, " +
          "and what condition the item was in when it was handed over.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The ticket or work order",
            why: "Shows the item was left with the business and what was to be done.",
            examples: ["Claim ticket or receipt", "Work order", "Messages arranging the job"],
          },
          {
            name: "The item's condition before",
            why: "Shows the item was undamaged when it was handed over.",
            examples: ["Earlier photos", "Purchase receipt", "Anyone who saw the item before"],
          },
        ],
      },
      {
        id: "service-not-acceptable-dmg",
        name: "The service was not of a reasonably acceptable quality",
        plainExplanation:
          CPA_SERVICES_QUALITY +
          CPA_SCOPE +
          CPA_NO_WAIVER +
          "This part of the checklist is about the damage, and any sign or term the business points " +
          "to about not being responsible.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Photos of the damage",
            why: "Records the damage as it was when the item came back.",
            examples: ["Dated photos taken at pickup", "Close-ups of the damage", "Video"],
          },
          {
            name: "Messages with the business",
            why: "Shows when the business was told and how it answered.",
            examples: ["Emails or texts reporting the damage", "Notes of conversations", "Any written reply"],
          },
        ],
      },
      {
        id: "care-while-held-dmg",
        name: "A repairer holding the item had to take reasonable care of it",
        plainExplanation:
          "Under s. 1(1) of the Repair and Storage Liens Act, a \"repairer\" is a person who makes a " +
          "repair on the understanding that the person will be paid for the repair, and \"repair\" " +
          "means an expenditure of money on, or the application of labour, skill or materials to, an " +
          "article for the purpose of altering, improving or restoring its properties or maintaining " +
          "its condition. Under s. 28(1)(a), where an article that is subject to a lien is in the lien " +
          "claimant's possession, the lien claimant shall use reasonable care in the custody and " +
          "preservation of the article, unless a higher standard of care is imposed by law. Under " +
          "s. 28(4), a lien claimant is liable for any loss or damage caused by a failure to meet any " +
          "obligation imposed by that section, but does not lose the lien by reason only of that " +
          "failure.",
        sourceUrl: RSLA,
        verifiedAt: VERIFIED,
        consolidationPeriod: RSLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "How the item was kept",
            why: "Shows what happened to the item while the business had it.",
            examples: ["What the business said happened", "Photos of how it was stored or returned", "Dates it was held"],
          },
        ],
      },
      {
        id: "amount-dmg",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost to repair or replace the item, its value, and " +
          "the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Cost to repair or replace",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair quote from another business", "Original receipt", "Price of a comparable replacement"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "repairer-keeps-item-dmg",
        name: "The business keeps the item until the bill is paid",
        plainExplanation:
          "Under s. 3(1) of the Repair and Storage Liens Act, in the absence of a written agreement to " +
          "the contrary, a repairer has a lien against an article that the repairer has repaired, for " +
          "the amount the person who requested the repair agreed to pay (or, where no amount was " +
          "agreed, the fair value of the repair, or of the part completed), and the repairer may " +
          "retain possession of the article until the amount is paid. Under s. 24(1) and (1.2), where " +
          "a lien claimant refuses to surrender the article and there is a dispute about the amount " +
          "of the lien (including the quality of the repair), the amount of work authorized, or the " +
          "right to keep the article, the owner may apply to the court to have the dispute resolved " +
          "and the article returned. Under s. 24(4), the applicant pays into court, or deposits " +
          "security for, the full amount claimed (or the amount offered in settlement plus security " +
          "for the balance). Under s. 25, the application may be brought in any court of appropriate " +
          "monetary jurisdiction.",
        whenThisComesUp:
          "When the business will not give the item back until its bill is paid, and the bill or the work is disputed.",
        sourceUrl: RSLA,
        verifiedAt: VERIFIED,
        consolidationPeriod: RSLA_CONSOLIDATION,
      },
      {
        id: "estimate-exceeded-dmg",
        name: "The business charges more than its estimate",
        plainExplanation: CPA_ESTIMATE,
        whenThisComesUp: "When the bill for the work is more than the estimate the customer was given.",
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
      "dry cleaner ruined my clothes",
      "tailor damaged my suit",
      "repair shop broke my phone",
      "they lost my item",
      "my laptop came back worse",
      "the cleaners shrank my coat",
      "repairer damaged it",
      "won't give my item back until I pay",
      "not responsible for damage sign",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1, 2(1), 9(1), 9(3), 10",
      },
      {
        sourceName: "Repair and Storage Liens Act, R.S.O. 1990, c. R.25",
        officialUrl: RSLA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 1(1) (\"repair\", \"repairer\"); s. 3(1); s. 24; s. 25; s. 28(1), (4)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-water-heater-or-hvac-rental",
    name: "A water heater or furnace rental contract",
    broughtBy:
      "A homeowner who signed a rental or purchase contract for a water heater, furnace, air conditioner, water treatment device or similar equipment, often at the door, and wants out of it or wants money back.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "contract-and-payments-whr",
        name: "The contract, where it was signed, and what was paid",
        plainExplanation:
          DIRECT_AGREEMENT +
          "Under s. 9(2) of the Act, the implied conditions and warranties applying to the sale of " +
          "goods under the Sale of Goods Act are deemed to apply with necessary modifications to goods " +
          "that are leased or traded or otherwise supplied under a consumer agreement. This part of the " +
          "checklist is about the contract, where and how it was signed, who started the contact, and " +
          "every payment made under it.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The contract",
            why: "Shows the equipment, the rental or price terms, and the date and place of signing.",
            examples: ["Signed rental or purchase agreement", "Any financing agreement", "Copy left at the door"],
          },
          {
            name: "Payment records",
            why: "Shows every amount paid under the contract.",
            examples: ["Monthly bills or statements", "Bank or pre-authorized debit records", "Receipts"],
          },
        ],
      },
      {
        id: "door-to-door-void-whr",
        name: "The contract was solicited at home without the customer asking",
        plainExplanation:
          "Under s. 43.1(1) of the Consumer Protection Act, 2002, no supplier shall, while at a " +
          "consumer's dwelling, solicit the consumer to enter into a direct agreement for the supply " +
          "of prescribed goods or services, or enter into such an agreement, unless the consumer has " +
          "initiated contact with the supplier and has specifically requested that the supplier " +
          "attend at the dwelling for the purpose of entering into such an agreement. O. Reg. 17/05, " +
          "s. 35.1(1) prescribes furnaces, air conditioners, air cleaners, air purifiers, water " +
          "heaters, water treatment devices, water purifiers, water filters, water softeners, duct " +
          "cleaning services, and any goods or services that combine or perform their functions. " +
          "Under s. 43.1(3), a direct agreement entered into in contravention of s. 43.1(1) is void, " +
          "and under s. 43.1(4), any agreement related to the consumer's obligations under it -- " +
          "including a credit agreement for money the consumer is required to pay under it -- is " +
          "void.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 35.1(1)" }],
        evidenceCategories: [
          {
            name: "How the salesperson came to the home",
            why: "Shows whether the customer asked the supplier to come to sign a contract.",
            examples: ["The customer's own account of the visit", "Call logs showing no call to the supplier", "Flyers or door hangers left"],
          },
          {
            name: "What the salesperson said",
            why: "Records the visit and any claims made at the door.",
            examples: ["Business card", "Notes made after the visit", "Anyone else present"],
          },
        ],
      },
      {
        id: "payments-refund-whr",
        name: "Payments made under a void contract, and related charges",
        plainExplanation:
          "Under s. 43.1(5) of the Consumer Protection Act, 2002, if a supplier supplies goods or " +
          "services under a direct agreement that is void, the goods or services are deemed to be " +
          "unsolicited and s. 13(1), (2), (3), (6), (7) and (8) apply. Under s. 13(1), a recipient of " +
          "unsolicited goods or services has no legal obligation in respect of their use or disposal, " +
          "and under s. 13(2), no supplier shall demand payment for them. Under s. 13(6), a consumer " +
          "who made a payment for unsolicited goods or services may demand a refund in accordance with " +
          "s. 92 within one year after making the payment; O. Reg. 17/05, s. 21 says the supplier " +
          "shall refund within 15 days after the demand; and under s. 13(8), the consumer may commence " +
          "an action to recover the payment in accordance with s. 100. Under s. 43.1(6), the supplier " +
          "is liable to reimburse the consumer for charges from a third party related to the void " +
          "agreement, including charges for the removal or return of goods the consumer is liable to " +
          "return to the third party, and under s. 43.1(7) the consumer may commence an action under " +
          "s. 100 to recover that amount.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 21" }],
        evidenceCategories: [
          {
            name: "The refund demand",
            why: "Shows the refund was demanded, when, and that it was not paid.",
            examples: ["Copy of the demand letter or email", "Proof it was sent", "Any reply"],
          },
          {
            name: "Third-party charges",
            why: "Supports any removal, return or swap-out charges claimed.",
            examples: ["Invoice for removing the equipment", "Buy-out or return charges from the previous provider"],
          },
        ],
      },
      {
        id: "amount-whr",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the payments made, any third-party charges, and the " +
          "documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "A payment summary",
            why: "Supports the dollar amount claimed.",
            examples: ["A list of payments with dates", "Statements showing each charge", "Invoices for related charges"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "customer-asked-for-visit-whr",
        name: "The supplier says the customer asked it to come",
        plainExplanation:
          "Under O. Reg. 17/05, s. 35.1(2), a consumer has initiated contact and specifically " +
          "requested that the supplier attend at their dwelling to enter into a direct agreement for " +
          "prescribed goods or services if, among other things, the consumer initiated communications " +
          "with the supplier and specifically requested the visit, by mail, fax, phone or electronic " +
          "communication, or in person at the supplier's place of business or at a market place, " +
          "auction, trade fair, agricultural fair or exhibition. Under s. 35.2(1), a supplier who " +
          "enters into such an agreement after the consumer initiated contact shall maintain records " +
          "of that contact for three years from the date of entering into the agreement.",
        whenThisComesUp:
          "When the supplier says the customer called or wrote first and asked for the home visit.",
        sourceUrl: CPA_REG,
        verifiedAt: VERIFIED,
        consolidationPeriod: "2026-06-10",
      },
      {
        id: "goods-to-be-returned-whr",
        name: "The equipment has to be made available for the supplier to collect",
        plainExplanation: DIRECT_AGREEMENT_RETURN,
        whenThisComesUp:
          "When the customer cancels and the supplier says the equipment was not returned or made available.",
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
          "Under s. 43(1) of the Consumer Protection Act, 2002, a consumer may, without any reason, " +
          "cancel a direct agreement at any time from the date of entering into the agreement until 10 " +
          "days after receiving the written copy of the agreement. Under s. 43(2), a consumer may " +
          "cancel a direct agreement within one year after entering into it if the consumer does not " +
          "receive a copy of the agreement that meets the requirements under s. 42. Sections 42 and 43 " +
          "apply where the consumer's total potential payment obligations, excluding the cost of " +
          "borrowing, exceed a prescribed amount (s. 41(1)); O. Reg. 17/05, s. 34 prescribes $50. " +
          CPA_NOTICE.trim(),
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 34" }],
      },
      {
        note: CPA_COURT_NOTE,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CJA, pinpoint: "s. 22(1)" }],
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "water heater rental contract",
      "door to door salesman signed me up",
      "furnace rental",
      "they replaced my water heater without asking",
      "air conditioner rental agreement",
      "water softener contract",
      "can't get out of my rental contract",
      "huge buyout fee for the water heater",
      "salesman came to my door",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 9(2), 13, 20(1), 41, 42, 43, 43.1, 92, 94, 96, 100",
      },
      {
        sourceName: "O. Reg. 17/05 (General), under the Consumer Protection Act, 2002",
        officialUrl: CPA_REG,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 21, 34, 35.1, 35.2",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-solar-or-energy-efficiency-contract",
    name: "A solar or energy-efficiency contract",
    broughtBy:
      "A homeowner who signed a contract for solar panels, insulation, windows, a heat pump or other energy-saving work or equipment, and wants to cancel it, get money back, or be paid for poor work.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "consumer-agreement-sol",
        name: "A consumer agreement for goods or services for the home",
        plainExplanation:
          CPA_SCOPE +
          "Under s. 2(6), despite the exclusion of real property transactions, the Act applies to a " +
          "consumer agreement under which a supplier supplies goods to a consumer that are not part of " +
          "real property when the parties enter into the agreement but that subsequently become so " +
          "under the agreement. " +
          DIRECT_AGREEMENT +
          "This part of the checklist is about the contract, where it was signed, and what was paid.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The contract and any financing",
            why: "Shows what was agreed, the price, and the date and place of signing.",
            examples: ["Signed contract", "Financing or loan agreement", "Quote or proposal"],
          },
          {
            name: "Payment records",
            why: "Shows what was paid and to whom.",
            examples: ["Deposit receipt", "Bank or credit card statements", "Loan statements"],
          },
        ],
      },
      {
        id: "cancelled-direct-agreement-sol",
        name: "The contract was cancelled in time",
        plainExplanation:
          "Under s. 43(1) of the Consumer Protection Act, 2002, a consumer may, without any reason, " +
          "cancel a direct agreement at any time from the date of entering into the agreement until 10 " +
          "days after receiving the written copy of the agreement. Under s. 43(2), a consumer may " +
          "cancel a direct agreement within one year after entering into it if the consumer does not " +
          "receive a copy of the agreement that meets the requirements under s. 42. Sections 42 and 43 " +
          "apply where the consumer's total potential payment obligations, excluding the cost of " +
          "borrowing, exceed a prescribed amount (s. 41(1)); O. Reg. 17/05, s. 34 prescribes $50. " +
          CPA_NOTICE +
          "Under s. 95, cancellation operates to cancel, as if they never existed, the agreement, all " +
          "related agreements, and all credit agreements and other payment instruments extended, " +
          "arranged or facilitated by the person with whom the consumer reached the agreement or " +
          "otherwise related to it.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 34" }],
        evidenceCategories: [
          {
            name: "The cancellation notice",
            why: "Shows the contract was cancelled, how, and when.",
            examples: ["Copy of the email, text or letter cancelling", "Proof it was sent", "Date the written copy of the contract was received"],
          },
        ],
      },
      {
        id: "unfair-practice-sol",
        name: "The contract was signed after a false or misleading claim",
        plainExplanation: CPA_UNFAIR_PRACTICE.trim(),
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "What was promised",
            why: "Shows the representation made before signing, such as promised savings or rebates.",
            examples: ["Sales brochure or proposal", "Savings estimate the salesperson gave", "Texts or emails from the salesperson"],
          },
          {
            name: "What turned out to be true",
            why: "Shows how the representation differed from the facts.",
            examples: ["Energy bills before and after", "Rebate program's own terms", "Written opinion from another installer"],
          },
        ],
      },
      {
        id: "refund-not-made-sol",
        name: "The money was not refunded",
        plainExplanation:
          CPA_REFUND +
          AMOUNT +
          "This part of the checklist is about what was paid, what has been refunded, and the " +
          "documents those figures come from.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [
          { sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 79(1)" },
          { sourceUrl: SC_GUIDE, pinpoint: "Making a claim -- How to fill out the claim form" },
        ],
        evidenceCategories: [
          {
            name: "Requests for the refund",
            why: "Shows the refund was asked for and not paid.",
            examples: ["Messages asking for the money back", "Demand letter", "Any reply from the supplier"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "goods-to-be-returned-sol",
        name: "The equipment has to be made available for the supplier to collect",
        plainExplanation: DIRECT_AGREEMENT_RETURN,
        whenThisComesUp:
          "When the customer cancels and the supplier says equipment that was delivered was not returned or made available.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
      },
      {
        id: "notice-late-sol",
        name: "The supplier says the notice came too late",
        plainExplanation:
          "Under s. 18(3) of the Consumer Protection Act, 2002, a consumer seeking to rescind an " +
          "agreement for an unfair practice must give notice within one year after entering into the " +
          "agreement. Under s. 101, if a consumer is required to give notice under the Act in order to " +
          "obtain a remedy, a court may disregard the requirement to give the notice or any " +
          "requirement relating to the notice if it is in the interest of justice to do so.",
        whenThisComesUp:
          "When the supplier says the customer cancelled or complained after the time the Act allows.",
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
        note: CPA_UNFAIR_PRACTICE_NOTE,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 22" }],
      },
      {
        note: CPA_COURT_NOTE,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CJA, pinpoint: "s. 22(1)" }],
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "solar panel contract",
      "solar company misled me",
      "promised energy savings never happened",
      "home energy upgrade contract",
      "insulation company door to door",
      "heat pump installation contract",
      "they said there was a government rebate",
      "want to cancel my solar contract",
      "energy efficiency salesman",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1, 2(1), 2(6), 14, 18, 20(1), 41, 42, 43, 92, 94, 95, 96, 100, 101",
      },
      {
        sourceName: "O. Reg. 17/05 (General), under the Consumer Protection Act, 2002",
        officialUrl: CPA_REG,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 22, 34, 79(1)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
