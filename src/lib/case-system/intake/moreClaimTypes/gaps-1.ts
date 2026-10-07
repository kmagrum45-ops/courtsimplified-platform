/**
 * Case types, batch "gaps-1" (small-claims): types first left out for want of saved law,
 * written once the law was saved (2026-10-07). Sources are recorded in
 * docs/sources/catalogue-verification/gaps-1.json and held by test:catalogue-verified.
 *
 * Every legal statement rests on text saved in this repository:
 *   - Ontario New Home Warranties Plan Act (ontario-new-home-warranties-plan-act.txt)
 *   - Trust in Real Estate Services Act, 2002 (trust-in-real-estate-services-act.txt)
 *   - Travel Industry Act, 2002 (travel-industry-act-2002.txt)
 *   - Funeral, Burial and Cremation Services Act, 2002 (funeral-burial-cremation-services-act.txt)
 *   - Ticket Sales Act, 2017 (ticket-sales-act-2017.txt)
 *   - Jaffer v. York University, 2010 ONCA 654 (docs/sources/decisions/)
 *   - plus the Consumer Protection Act regulation (O. Reg. 17/05, s. 9), the Rules of
 *     the Small Claims Court, the Small Claims Court guide, the Courts of Justice Act
 *     and the Limitations Act, 2002, all in the corpus.
 *
 * What is deliberately NOT said, because the text is not saved:
 *   - The regulations under these Acts (the warranty-claim timelines, the Travel
 *     Industry Compensation Fund rules, the funeral compensation fund rules and the
 *     prescribed refund amounts). Where an Act hands a point to its regulations,
 *     the entry says so and stops.
 *   - The Arbitration Act, 1991, which s. 17(4) of the new-home Act applies to
 *     purchase agreements and construction contracts.
 *   - For the travel Act, only the wording in force is used; the saved text also
 *     carries replacement wording (travel "seller" / "salesperson") not yet in force.
 */

import type { ClaimType } from "../claimTypes";

const VERIFIED = "2026-10-07";

const ONHWPA = "https://www.ontario.ca/laws/docs/90o31_e.doc";
const ONHWPA_CONSOLIDATION = "2024-12-04";
const TRESA = "https://www.ontario.ca/laws/docs/02r30_e.doc";
const TRESA_CONSOLIDATION = "2023-12-01";
const TIA = "https://www.ontario.ca/laws/docs/02t30_e.doc";
const TIA_CONSOLIDATION = "2022-03-01";
const FBCSA = "https://www.ontario.ca/laws/docs/02f33_e.doc";
const FBCSA_CONSOLIDATION = "2025-12-11";
const TSA = "https://www.ontario.ca/laws/docs/17t33_e.doc";
const TSA_CONSOLIDATION = "2026-06-10";
const JAFFER = "docs/sources/decisions/jaffer-v-york-university-2010-ONCA-654.txt";

const SC_GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim";
const SC_RULES = "https://www.ontario.ca/laws/docs/980258_e.doc";
const SC_RULES_CONSOLIDATION = "2025-10-14";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_CONSOLIDATION = "2024-12-04";
const CPA_REG = "https://www.ontario.ca/laws/docs/050017_e.doc";
const CPA_REG_CONSOLIDATION = "2026-06-10";
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";

const ONHWPA_NAME = "Ontario New Home Warranties Plan Act, R.S.O. 1990, c. O.31";
const TRESA_NAME = "Trust in Real Estate Services Act, 2002, S.O. 2002, c. 30, Sched. C";
const TIA_NAME = "Travel Industry Act, 2002, S.O. 2002, c. 30, Sched. D";
const FBCSA_NAME = "Funeral, Burial and Cremation Services Act, 2002, S.O. 2002, c. 33";
const TSA_NAME = "Ticket Sales Act, 2017, S.O. 2017, c. 33, Sched. 3";
const CPA_REG_NAME = "O. Reg. 17/05 (General), under the Consumer Protection Act, 2002";
const LIMITATIONS_NAME = "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B";
const SC_RULES_NAME = "Rules of the Small Claims Court, O. Reg. 258/98";

// ---- Shared wording. Each entry that uses it has its own record. ----

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

const AMOUNT =
  "Ontario's Small Claims Court guide says the reasons for a claim should \"calculate and explain " +
  "the amount of money and any interest you are claiming\", and that a copy of the supporting " +
  "documents is attached to the claim (if they are not attached, the claim gives the reasons why). " +
  "The guide says the court can handle any action for the payment of money or the recovery of " +
  "personal property where the amount claimed does not exceed $50,000, excluding interest and " +
  "costs such as court fees. ";

const CPA_EXEMPTION = (act: string) =>
  "Under s. 9(1) of O. Reg. 17/05 (the general regulation under the Consumer Protection Act, " +
  "2002), the supply of goods or services under an agreement that is subject to the " +
  act +
  " is exempt from sections 22, 23, 26 and 37 to 47 of the Consumer Protection Act, 2002. Under " +
  "s. 9(2), that exemption from sections 22, 23 and 26 applies even if section 21 of that Act " +
  "says they do apply. Those sections of the Consumer Protection Act, 2002 are therefore not the " +
  "rules for this kind of agreement; this checklist uses the " +
  act +
  " instead.";

export const TYPES_GAPS_1: ClaimType[] = [
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-new-home-defects",
    name: "Defects in a newly built home",
    broughtBy:
      "The owner of a newly built house or condominium unit -- the first buyer, or someone who later bought it from them -- who has found defects in it. Not the builder or seller.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "new-home-owner-nhd",
        name: "It is a new home, bought from its vendor or built by a builder",
        plainExplanation:
          "Under s. 1(1) of the Ontario New Home Warranties Plan Act, a \"home\" includes a " +
          "self-contained one-family dwelling (detached or attached by common walls), a building of " +
          "not more than two such dwellings under one ownership, and a condominium unit that is a " +
          "residential dwelling, but not a dwelling built and sold for temporary or seasonal " +
          "occupancy. An \"owner\" is a person who first acquires a home from its vendor for " +
          "occupancy, and that person's successors in title. A \"vendor\" is a person who, on their " +
          "own behalf, sells a home not previously occupied to an owner, and includes a builder " +
          "who acts as such under a contract with the owner. Under s. 13(5), a warranty is " +
          "enforceable even though there is no privity of contract between the owner and the " +
          "vendor -- so a later buyer is not shut out because they did not sign with the builder.",
        sourceUrl: ONHWPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ONHWPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Purchase or construction papers",
            why: "Shows who sold or built the home, and that it had not been lived in before.",
            examples: ["Agreement of purchase and sale", "Construction contract", "Deed or transfer of title"],
          },
          {
            name: "The certificate of completion and possession",
            why: "Shows the date the home was completed for possession, which is when the warranties start.",
            examples: ["Certificate of completion and possession", "Closing documents"],
          },
        ],
      },
      {
        id: "warranty-breached-nhd",
        name: "A defect the statutory warranty covers",
        plainExplanation:
          "Under s. 13(1) of the Ontario New Home Warranties Plan Act, every vendor of a home " +
          "warrants to the owner that the home is constructed in a workmanlike manner and is free " +
          "from defects in material, is fit for habitation, and is constructed in accordance with " +
          "the Ontario Building Code; that it is free of major structural defects as defined by the " +
          "regulations; and any other warranties the regulations prescribe. Under s. 13(6), these " +
          "warranties apply despite any agreement or waiver to the contrary, and are in addition to " +
          "any other rights the owner may have and to any other warranty agreed upon. This part of " +
          "the checklist is about what the defect is and which of these warranties it touches.",
        sourceUrl: ONHWPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ONHWPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The defect itself",
            why: "Shows what is wrong, where, and when it was first seen.",
            examples: ["Dated photos or video", "A list of defects with dates noticed", "An inspector's or contractor's report"],
          },
          {
            name: "Repair costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair quotes", "Invoices for repairs already done", "Receipts"],
          },
        ],
      },
      {
        id: "claim-in-time-nhd",
        name: "The warranty claim was made within the warranty period",
        plainExplanation:
          "Under s. 13(3) of the Ontario New Home Warranties Plan Act, the vendor shall deliver to " +
          "the owner a certificate specifying the date the home is completed for the owner's " +
          "possession, and the warranties take effect from that date. Under s. 13(4), a warranty " +
          "under s. 13(1) applies only in respect of claims made within one year after the warranty " +
          "takes effect, or such longer time under such conditions as are prescribed by the " +
          "regulations. Under s. 14(4), an owner who suffers damage because of a major structural " +
          "defect is entitled, subject to the regulations, to payment out of the guarantee fund for " +
          "the cost of the remedial work if the owner makes a claim within four years after the " +
          "warranty expires or such longer time as is prescribed. The regulations that set the " +
          "longer periods are not saved here.",
        sourceUrl: ONHWPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ONHWPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Dates",
            why: "Shows when the warranties took effect and when each defect was reported.",
            examples: ["Certificate of completion and possession", "Copies of warranty claim forms sent, with dates", "Emails to the builder reporting the defects"],
          },
          {
            name: "Replies to the reports",
            why: "Shows what was done after each defect was reported.",
            examples: ["Builder's replies", "Notices of decision received", "Notes of repair visits"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "exclusions-nhd",
        name: "Things the warranty does not cover",
        plainExplanation:
          "Under s. 13(2) of the Ontario New Home Warranties Plan Act, a warranty under s. 13(1) " +
          "does not apply in respect of, among other things: defects in materials, design and work " +
          "supplied by the owner; secondary damage caused by defects, such as property damage and " +
          "personal injury; normal wear and tear; normal shrinkage of materials caused by drying " +
          "after construction; damage caused by dampness or condensation due to the owner's failure " +
          "to maintain adequate ventilation; damage resulting from improper maintenance; " +
          "alterations, deletions or additions made by the owner; damage resulting from an act of " +
          "God; damage caused by municipal services or other utilities; and surface defects in work " +
          "and materials specified and accepted in writing by the owner at the date of possession.",
        whenThisComesUp:
          "When the builder or seller says a defect falls into one of the listed exclusions, such as owner alterations, wear and tear, or a surface defect accepted in writing at possession.",
        sourceUrl: ONHWPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ONHWPA_CONSOLIDATION,
      },
      {
        id: "dispute-nhd",
        name: "The builder or seller disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the defect is excluded, was reported too " +
          "late, or was already repaired.",
        whenThisComesUp: "When the builder or seller files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 17(2) of the Ontario New Home Warranties Plan Act, where there is a dispute " +
          "between a vendor and an owner arising out of a purchase agreement or construction " +
          "contract, neither party shall commence any proceeding about it until after fifteen days " +
          "after the party notifies the Corporation (the body that runs the warranty plan under the " +
          "Act) of the dispute, to give it an opportunity to conciliate. Under s. 17(1), the " +
          "Corporation may, on an owner's request, conciliate any dispute between the owner and a " +
          "vendor. Under s. 17(4), every purchase agreement and construction contract between a " +
          "vendor and prospective owner is deemed to contain a written agreement to submit present " +
          "or future differences to arbitration, subject to appeal to the Divisional Court, and the " +
          "Arbitration Act, 1991 applies. The Arbitration Act, 1991 is not saved here, so this " +
          "checklist does not say how that deemed arbitration agreement affects starting a claim in " +
          "court.",
        sourceUrl: ONHWPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ONHWPA_CONSOLIDATION,
      },
      {
        note:
          "Separately from a claim against the builder, s. 14(3) of the Ontario New Home Warranties " +
          "Plan Act says that, subject to the regulations, an owner is entitled to payment out of the " +
          "guarantee fund for damages resulting from a breach of warranty if they became the owner " +
          "through a transfer of title or the substantial performance of a construction contract, " +
          "and have a cause of action against the vendor or builder for those damages. Under " +
          "s. 14(6), the Corporation shall investigate the concern and decide whether the claimant " +
          "is entitled to compensation. Under s. 14(13) and (14), it serves notice of its decision " +
          "with reasons, and the notice shall state that the claimant is entitled to appeal the " +
          "decision to the tribunal in the form and within the time prescribed. Under s. 14(20), " +
          "unless the regulations specifically provide otherwise, nothing in the Act restricts the " +
          "remedies otherwise available to an owner.",
        sourceUrl: ONHWPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ONHWPA_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "defects in my new house",
      "builder won't fix problems in new home",
      "new build home warranty claim",
      "cracks in the foundation of my new house",
      "new condo has defects",
      "basement leaking in brand new house",
      "builder didn't follow the building code",
      "new home warranty claim denied",
      "problems found after closing on a new home",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: ONHWPA_NAME,
        officialUrl: ONHWPA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 1(1) (\"home\", \"owner\", \"vendor\"); ss. 13(1)-(6); 14(3), (4), (6), (13), (14), (20); 17(1), (2), (4)",
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
    id: "sc-claim-real-estate-agent-conduct",
    name: "A real estate agent's commission or conduct",
    broughtBy:
      "A person who bought, sold or rented property through a real estate brokerage and has a money dispute with the brokerage -- about the commission charged, a deposit it held in trust, or how its agent dealt with them.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "brokerage-registrant-rea",
        name: "The other side is a real estate brokerage or agent",
        plainExplanation:
          "Under s. 1(1) of the Trust in Real Estate Services Act, 2002, a \"brokerage\" is an " +
          "organization or entity that, on behalf of others and for compensation or reward or the " +
          "expectation of it, trades in real estate or holds itself out as such. A \"registrant\" is " +
          "a brokerage, broker or salesperson registered under the Act, and a \"trade\" includes a " +
          "disposition or acquisition of or transaction in real estate by sale, purchase, " +
          "agreement for purchase and sale, exchange, option, lease, rental or otherwise. Under " +
          "s. 26, a brokerage shall ensure that every salesperson and broker it employs is " +
          "carrying out their duties in compliance with the Act and the regulations.",
        sourceUrl: TRESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TRESA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The agreement with the brokerage",
            why: "Shows which brokerage and agent acted, and what they agreed to do.",
            examples: ["Listing agreement", "Buyer representation agreement", "Agent's business card or registration details"],
          },
          {
            name: "The transaction papers",
            why: "Shows the deal the brokerage worked on.",
            examples: ["Agreement of purchase and sale or lease", "Offers and counter-offers", "Closing statement"],
          },
        ],
      },
      {
        id: "commission-terms-rea",
        name: "The commission charged was not what the Act allows or what was agreed",
        plainExplanation:
          "Under s. 36(1) of the Trust in Real Estate Services Act, 2002, all remuneration payable " +
          "to a brokerage in respect of a trade in real estate shall be an agreed amount or " +
          "percentage of the sale price or rental price, or a combination of both. Under s. 36(3), " +
          "no registrant shall request or enter into an arrangement for remuneration based on the " +
          "difference between the listed price and the actual sale or rental price, nor is a " +
          "registrant entitled to retain any remuneration computed on that basis. Under s. 33(3), " +
          "unless agreed to in writing by the seller, no brokerage is entitled to claim " +
          "remuneration from the seller if the real estate is, to the knowledge of the brokerage, " +
          "covered by an unexpired listing agreement with another brokerage.",
        sourceUrl: TRESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TRESA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The commission terms",
            why: "Shows the agreed amount or percentage.",
            examples: ["The commission clause of the listing or buyer agreement", "Any written amendment"],
          },
          {
            name: "What was actually charged",
            why: "Supports the difference claimed.",
            examples: ["Commission invoice", "Lawyer's trust ledger or statement of adjustments", "Bank records"],
          },
        ],
      },
      {
        id: "trust-money-rea",
        name: "A deposit held in trust was not handled as the Act requires",
        plainExplanation:
          "Under s. 27(1) of the Trust in Real Estate Services Act, 2002, every brokerage shall " +
          "maintain a trust account in Ontario, deposit into it all money that comes into its " +
          "hands in trust for other persons in connection with its business, keep that money " +
          "separate from its own money at all times, and disburse the money only in accordance " +
          "with the terms of the trust. Under s. 27(3), unless otherwise provided by contract, all " +
          "interest on the trust money shall be paid to the beneficial owner of the trust money.",
        sourceUrl: TRESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TRESA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The deposit",
            why: "Shows how much was paid in trust, to whom, and on what terms.",
            examples: ["Deposit receipt", "The deposit clause of the agreement", "Bank draft or cheque copy"],
          },
          {
            name: "What happened to it",
            why: "Shows whether and how the money was paid out.",
            examples: ["Letters or emails asking for the deposit back", "Brokerage's reply", "Any mutual release signed"],
          },
        ],
      },
      {
        id: "false-information-rea",
        name: "False or misleading information or advertising",
        plainExplanation:
          "Under s. 34 of the Trust in Real Estate Services Act, 2002, no registrant shall falsify, " +
          "or assist in or counsel falsifying, any information or document relating to a trade in " +
          "real estate. Under s. 35, no registrant shall furnish, or assist in or counsel " +
          "furnishing, any false or deceptive information or documents relating to a trade in " +
          "real estate. Under s. 37, no registrant shall make false, misleading or deceptive " +
          "statements in any advertisement, circular, pamphlet or material published by any means " +
          "relating to trading in real estate. This part of the checklist is about what was said " +
          "or written, by whom, and what money was lost because of it.",
        sourceUrl: TRESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TRESA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "What was said or published",
            why: "Shows the statement or document and who made it.",
            examples: ["The listing or advertisement", "Emails or texts from the agent", "Feature sheets"],
          },
          {
            name: "The money lost",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair or replacement costs", "Price difference records", "Receipts"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "registration-for-commission-rea",
        name: "A claim for commission needs registration",
        plainExplanation:
          "Under s. 9 of the Trust in Real Estate Services Act, 2002, no action shall be brought " +
          "for remuneration for services in connection with a trade in real estate unless, at the " +
          "time of rendering the services, the person bringing the action was registered or exempt " +
          "from registration under the Act, and the court may stay any such action upon motion.",
        whenThisComesUp:
          "When a brokerage or agent brings its own claim to be paid a commission for the deal.",
        sourceUrl: TRESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TRESA_CONSOLIDATION,
      },
      {
        id: "dispute-rea",
        name: "The brokerage disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the commission was agreed in writing, " +
          "the deposit was paid out under the terms of the trust, or nothing false was said.",
        whenThisComesUp: "When the brokerage files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: CPA_EXEMPTION("Trust in Real Estate Services Act, 2002"),
        sourceUrl: CPA_REG,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_REG_CONSOLIDATION,
      },
      {
        note:
          "Under s. 19(1) of the Trust in Real Estate Services Act, 2002, the registrar may receive " +
          "complaints about conduct that may be in contravention of the Act or the regulations, " +
          "make written requests to registrants for information about complaints, and attempt to " +
          "mediate or resolve complaints. Under s. 20, if the registrar is of the opinion that a " +
          "registrant has contravened the Act or the regulations, the registrar may, among other " +
          "things, give a written warning or refer the matter to the discipline committee. A " +
          "complaint to the registrar is a separate process from a claim for money in the Small " +
          "Claims Court.",
        sourceUrl: TRESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TRESA_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "real estate agent overcharged commission",
      "realtor won't return my deposit",
      "brokerage kept the deposit",
      "agent lied about the house",
      "dispute with my real estate agent",
      "charged commission by two brokerages",
      "realtor misrepresented the property",
      "commission not what we agreed",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: TRESA_NAME,
        officialUrl: TRESA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 1(1) (\"brokerage\", \"registrant\", \"trade\"); ss. 9, 19(1), 20, 26, 27(1), (3), 33(3), 34, 35, 36(1), (3), 37",
      },
      {
        sourceName: CPA_REG_NAME,
        officialUrl: CPA_REG,
        verifiedAt: VERIFIED,
        pinpoint: "s. 9(1)-(2)",
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
    id: "sc-claim-travel-agent-or-tour-operator",
    name: "A travel agent or tour operator",
    broughtBy:
      "A traveller who paid a travel agent, travel company or tour operator for a trip, flight, cruise or hotel and is owed money back. Not the travel business.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "travel-business-tra",
        name: "The money was paid to a travel agent or travel wholesaler",
        plainExplanation:
          "Under s. 1(1) of the Travel Industry Act, 2002, a \"travel agent\" is a person who sells, " +
          "to consumers, travel services provided by another person, and a \"travel wholesaler\" " +
          "is a person who acquires rights to travel services for resale to a travel agent, or " +
          "who carries on the business of dealing with travel agents or travel wholesalers for the " +
          "sale of travel services provided by another person. \"Travel services\" means " +
          "transportation or sleeping accommodation for a traveller, tourist or sightseer, or " +
          "other services combined with them. Under s. 4(1), no person shall act or hold " +
          "themselves out as available to act as a travel agent or travel wholesaler unless " +
          "registered as one under the Act. (The saved text also shows replacement wording, using " +
          "\"travel seller\", that is not yet in force; the wording above is the one in force.)",
        sourceUrl: TIA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TIA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The booking",
            why: "Shows who sold the trip and what was booked.",
            examples: ["Booking confirmation or invoice", "Itinerary", "Emails with the agent"],
          },
          {
            name: "Payments",
            why: "Shows how much was paid and to whom.",
            examples: ["Receipts", "Credit card or bank statements", "e-transfer confirmations"],
          },
        ],
      },
      {
        id: "repayment-owed-tra",
        name: "Money owed back was not repaid",
        plainExplanation:
          "Under s. 25(1) of the Travel Industry Act, 2002, where any person is entitled to the " +
          "repayment of any money paid for or on account of a travel service, any travel agent and " +
          "any travel wholesaler who received that money or any part of it is liable, jointly and " +
          "severally with any other person liable for it, for repaying it to the extent of the " +
          "amount they received. This section does not itself say when a person is entitled to " +
          "repayment; that comes from the booking terms or other law. This part of the checklist " +
          "is about why the money is owed back and which businesses received it.",
        sourceUrl: TIA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TIA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Why the money is owed back",
            why: "Shows the cancellation, change or failure that gives the right to a refund.",
            examples: ["Cancellation notice from the airline, hotel or tour company", "Booking terms and refund policy", "Refund promises in writing"],
          },
          {
            name: "Where the money went",
            why: "Shows which businesses received the payment.",
            examples: ["Card statement showing the merchant name", "Supplier confirmation numbers", "Agent's invoice"],
          },
        ],
      },
      {
        id: "false-information-tra",
        name: "False or misleading information or advertising",
        plainExplanation:
          "Under s. 26 of the Travel Industry Act, 2002, no registrant shall falsify, or assist in " +
          "or counsel falsifying, any information or document relating to the provision of travel " +
          "services. Under s. 27, no registrant shall furnish, or assist in or counsel furnishing, " +
          "any false or deceptive information or documents relating to the provision of travel " +
          "services. Under s. 28, no registrant shall make false, misleading or deceptive " +
          "statements in any advertisement, circular, pamphlet or material published by any means " +
          "relating to the provision of travel services.",
        sourceUrl: TIA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TIA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "What was said or advertised",
            why: "Shows the statement and who made it.",
            examples: ["The advertisement or web page", "Emails or chat messages with the agent", "Brochures"],
          },
          {
            name: "What the trip actually was",
            why: "Shows the difference between what was promised and what was provided.",
            examples: ["Photos", "Hotel or airline records", "Notes made during the trip"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "properly-disbursed-tra",
        name: "The agent says it passed the money on properly",
        plainExplanation:
          "Under s. 25(2) of the Travel Industry Act, 2002 (the wording in force), the liability " +
          "under s. 25(1) does not apply if the travel agent or travel wholesaler has properly " +
          "disbursed the money received, has acted in good faith and at arm's length with the " +
          "person with whom it would be jointly and severally liable, and that person is not in " +
          "breach of a requirement to be registered under the Act. All three conditions are part " +
          "of the exception.",
        whenThisComesUp:
          "When the travel agent says it paid the money over to the airline, hotel or tour company and does not have it.",
        sourceUrl: TIA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TIA_CONSOLIDATION,
      },
      {
        id: "registration-for-commission-tra",
        name: "A claim against a traveller for a commission needs registration",
        plainExplanation:
          "Under s. 7 of the Travel Industry Act, 2002 (the wording in force), no action shall be " +
          "brought against a consumer of travel services for a commission or other remuneration in " +
          "relation to those services unless, at the time of rendering them, the person bringing " +
          "the action was registered or exempt from registration under the Act, and the court may " +
          "stay any such action upon motion.",
        whenThisComesUp: "When the travel business brings its own claim against the traveller for a commission or fee.",
        sourceUrl: TIA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TIA_CONSOLIDATION,
      },
      {
        id: "dispute-tra",
        name: "The travel business disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say no refund was owed under the booking " +
          "terms, or the money was passed on to the supplier.",
        whenThisComesUp: "When the travel business files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: CPA_EXEMPTION("Travel Industry Act, 2002"),
        sourceUrl: CPA_REG,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_REG_CONSOLIDATION,
      },
      {
        note:
          "Under s. 41 of the Travel Industry Act, 2002, the Travel Industry Compensation Fund is " +
          "continued, and it shall be administered and managed in accordance with the regulations. " +
          "Those regulations -- who can claim from the Fund, and how -- are not saved here, so this " +
          "checklist does not describe them. Under s. 16(1) and (4), if the registrar receives a " +
          "complaint about a registrant, the registrar may request information from any registrant " +
          "and may, among other things, attempt to mediate or resolve the complaint. These are " +
          "separate from a claim for money in the Small Claims Court.",
        sourceUrl: TIA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TIA_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "travel agent won't refund my trip",
      "tour company cancelled our vacation",
      "paid a travel agency and never got the tickets",
      "vacation package refund",
      "travel agent kept my deposit",
      "cruise booked through an agent was cancelled",
      "travel company went out of business",
      "trip was not as advertised",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: TIA_NAME,
        officialUrl: TIA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 1(1) (\"travel agent\", \"travel services\", \"travel wholesaler\"); ss. 4(1), 7, 16(1), (4), 25(1)-(2), 26-28, 41",
      },
      {
        sourceName: CPA_REG_NAME,
        officialUrl: CPA_REG,
        verifiedAt: VERIFIED,
        pinpoint: "s. 9(1)-(2)",
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
    id: "sc-claim-funeral-or-cemetery-dispute",
    name: "A funeral home or cemetery dispute",
    broughtBy:
      "A person who signed a contract with a funeral home, cemetery, crematorium or similar licensed business -- for a funeral, burial, cremation, plot, marker or pre-arranged services -- and wants a refund or the overcharge back. Not the business.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "contract-requirements-fun",
        name: "The contract did not meet the Act's requirements",
        plainExplanation:
          "Under s. 40(1) of the Funeral, Burial and Cremation Services Act, 2002, a contract for " +
          "licensed supplies or services is not enforceable by an operator unless, among other " +
          "things, it is written, signed by both parties and complies with the regulations; it " +
          "sets out the purchaser's cancellation rights under the Act; it sets out all the " +
          "supplies and services to be provided and the price charged for each; and the operator " +
          "delivers a signed copy to the purchaser. Under s. 41(1), a purchaser under a contract " +
          "that is not enforceable under s. 40(1) may cancel it at any time by giving the operator " +
          "written notice, and under s. 41(2) the operator shall, within 30 days of receiving the " +
          "notice, refund all money received under the contract together with the prescribed " +
          "amounts. Under s. 40(2), if the operator refuses to pay that refund, the purchaser may " +
          "bring an action in a court of competent jurisdiction to recover any amounts paid under " +
          "the contract together with costs.",
        sourceUrl: FBCSA,
        verifiedAt: VERIFIED,
        consolidationPeriod: FBCSA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The contract",
            why: "Shows whether it was written and signed, and what it lists and prices.",
            examples: ["The signed contract", "Any price list given", "The cemetery by-laws, if a plot was bought"],
          },
          {
            name: "The written cancellation and the reply",
            why: "Shows the cancellation was given in writing and the refund was not paid within 30 days.",
            examples: ["Copy of the cancellation letter or email", "Proof of delivery", "The operator's reply"],
          },
        ],
      },
      {
        id: "cooling-off-fun",
        name: "The contract was cancelled within 30 days",
        plainExplanation:
          "Under s. 42(1) of the Funeral, Burial and Cremation Services Act, 2002, a purchaser is " +
          "entitled to cancel a contract at any time within 30 days after the day the last of the " +
          "s. 40(1) requirements is met, by giving the operator written notice (s. 42(2)); under " +
          "s. 42(3), the operator shall, within 30 days after receiving the notice, refund all money " +
          "received together with the prescribed amounts. Under s. 43(2), a purchaser may also " +
          "cancel, by written notice, within 30 days after the day the contract is made if the " +
          "operator has not fully performed it. Under s. 43(4), the operator shall then refund, " +
          "within 30 days, all money received if nothing has been provided, or all money received " +
          "less the value of what has been provided in accordance with the contract.",
        sourceUrl: FBCSA,
        verifiedAt: VERIFIED,
        consolidationPeriod: FBCSA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Dates",
            why: "Shows when the contract was made and when the written cancellation was given.",
            examples: ["The dated contract", "Dated cancellation letter or email", "Proof of delivery"],
          },
          {
            name: "What was provided",
            why: "Shows whether any supplies or services had been provided when the contract was cancelled.",
            examples: ["Invoices", "Delivery records", "Statements from the operator"],
          },
        ],
      },
      {
        id: "later-cancellation-fun",
        name: "The contract was cancelled later, before it was fully performed",
        plainExplanation:
          "Under s. 44(1) of the Funeral, Burial and Cremation Services Act, 2002, the purchaser " +
          "under a contract for licensed supplies or services, other than interment rights and " +
          "scattering rights, may cancel it at any time if a right to cancel under s. 42 or 43 no " +
          "longer applies and the operator has not fully performed the contract, by giving written " +
          "notice (s. 44(3)). Under s. 44(4), the operator shall, within 30 days of receiving the " +
          "notice, refund all money received with the prescribed amounts, less a prescribed amount " +
          "-- and, if part of the supplies and services has been provided, less their value. The " +
          "prescribed amounts are in a regulation that is not saved here.",
        sourceUrl: FBCSA,
        verifiedAt: VERIFIED,
        consolidationPeriod: FBCSA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The pre-arranged contract",
            why: "Shows what was bought ahead of time and what was paid.",
            examples: ["The contract", "Payment records", "Annual statements"],
          },
          {
            name: "The written cancellation",
            why: "Shows the cancellation was given in writing and when.",
            examples: ["Copy of the letter or email", "Proof of delivery", "Any reply"],
          },
        ],
      },
      {
        id: "over-price-list-fun",
        name: "Charged more than the price list or the contract price",
        plainExplanation:
          "Under s. 34(1) of the Funeral, Burial and Cremation Services Act, 2002, no licensee " +
          "shall charge, collect or receive more for a licensed supply or service than the price " +
          "on the price list maintained under s. 33. Under s. 34(2), a licensee who does, or who " +
          "charges more than the price charged for a similar supply or service when it is not on " +
          "the price list, shall repay the difference to the purchaser within 30 days. Under s. 38, " +
          "if money is paid in advance and the price later increases before the supplies and " +
          "services are provided, the operator shall not charge the purchaser any additional amount " +
          "for the increase.",
        sourceUrl: FBCSA,
        verifiedAt: VERIFIED,
        consolidationPeriod: FBCSA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The price list",
            why: "Shows the listed price for each item.",
            examples: ["The operator's price list", "A photo or copy of it", "The price list on the operator's website"],
          },
          {
            name: "What was charged",
            why: "Shows the amount over the listed or contract price.",
            examples: ["Final invoice", "The contract", "Receipts"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "rights-exercised-fun",
        name: "Cancellation rights that do not apply",
        plainExplanation:
          "Under s. 43(3) of the Funeral, Burial and Cremation Services Act, 2002, the right to " +
          "cancel within 30 days under s. 43(2) does not apply to interment or scattering rights " +
          "that have been exercised. Under s. 44(1), the later right to cancel does not cover " +
          "interment rights and scattering rights, and under s. 44(2) it does not apply to the " +
          "portion of a contract relating to private structures or a private scattering ground, " +
          "where that portion's own cancellation terms apply.",
        whenThisComesUp:
          "When the operator says the contract, or part of it, cannot be cancelled because it is for interment or scattering rights, or a private structure.",
        sourceUrl: FBCSA,
        verifiedAt: VERIFIED,
        consolidationPeriod: FBCSA_CONSOLIDATION,
      },
      {
        id: "dispute-fun",
        name: "The operator disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the contract met the Act's requirements, " +
          "the cancellation came too late, or the refund paid was the right amount.",
        whenThisComesUp: "When the funeral home, cemetery or other operator files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: CPA_EXEMPTION("Funeral, Burial and Cremation Services Act, 2002"),
        sourceUrl: CPA_REG,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_REG_CONSOLIDATION,
      },
      {
        note:
          "Under s. 66(1) of the Funeral, Burial and Cremation Services Act, 2002, the registrar " +
          "may receive complaints about conduct that may be in contravention of a requirement " +
          "under the Act, make inquiries about them, and attempt to mediate or resolve them. Under " +
          "s. 61(1) and (2), a compensation fund scheme is established in accordance with the " +
          "regulations, and its purpose is to compensate a person who suffers a financial loss due " +
          "to a licensee's failure to comply with the Act, the regulations or the terms of an " +
          "agreement made under the Act. The regulations that set out how to claim from it are not " +
          "saved here. These are separate from a claim for money in the Small Claims Court.",
        sourceUrl: FBCSA,
        verifiedAt: VERIFIED,
        consolidationPeriod: FBCSA_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "funeral home overcharged us",
      "want to cancel a pre-arranged funeral",
      "cemetery won't refund the plot",
      "funeral home won't give a refund",
      "charged more than the price list",
      "cancelled prepaid funeral contract",
      "dispute with a cemetery",
      "cremation cost more than agreed",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: FBCSA_NAME,
        officialUrl: FBCSA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 34(1)-(2), 38, 40(1)-(2), 41(1)-(2), 42(1)-(3), 43(2)-(4), 44(1)-(4), 61(1)-(2), 66(1)",
      },
      {
        sourceName: CPA_REG_NAME,
        officialUrl: CPA_REG,
        verifiedAt: VERIFIED,
        pinpoint: "s. 9(1)-(2)",
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
    id: "sc-claim-ticket-resale-or-cancelled-event",
    name: "A resold ticket or a cancelled event",
    broughtBy:
      "A person who bought a ticket to an event in Ontario -- usually a resold ticket -- that was cancelled, fake, did not get them in or was not as described, or who paid more than the Act allows. Not the seller.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "ticket-and-seller-tix",
        name: "A ticket to an Ontario event, bought from a ticket business",
        plainExplanation:
          "Under s. 1 of the Ticket Sales Act, 2017, a \"ticket\" is any card, pass, paper, " +
          "document or thing, electronic or not, that on presentation entitles the holder to " +
          "admission to a recreational, sporting or cultural event or other prescribed event in " +
          "Ontario. A \"ticket business\" is a primary seller, a secondary seller or an operator " +
          "of a secondary ticketing platform. A \"secondary seller\" is a person engaged in the " +
          "business of making available for sale tickets that were originally made available by a " +
          "primary seller, and a \"secondary ticketing platform\" is a website, online service, " +
          "app, print publication or physical location that gives ticket sellers other than " +
          "primary sellers a venue to sell tickets. Under s. 1.1, a sale on the secondary market " +
          "is the sale of a ticket originally made available for sale by a primary seller.",
        sourceUrl: TSA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TSA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The ticket and the order",
            why: "Shows the event, who sold the ticket and through which site or app.",
            examples: ["The ticket or e-ticket", "Order confirmation email", "Screenshots of the listing"],
          },
          {
            name: "Payment",
            why: "Shows the total price paid.",
            examples: ["Receipt", "Credit card statement", "PayPal or e-transfer record"],
          },
        ],
      },
      {
        id: "refund-guarantee-tix",
        name: "A resold ticket covered by the refund guarantee",
        plainExplanation:
          "Under s. 2(1) of the Ticket Sales Act, 2017, every person who makes a ticket available " +
          "for sale on the secondary market, or facilitates that sale, shall provide one of the " +
          "listed guarantees or confirmations when the ticket is made available. One is a written " +
          "guarantee by a secondary seller or platform operator of a full refund if the event is " +
          "cancelled before the ticket can be used; if the ticket does not grant admission to the " +
          "event (unless due to an action taken by the primary seller or venue after the ticket " +
          "is sold); if the ticket is counterfeit; or if it does not match its description as " +
          "advertised or represented. Another is a written confirmation from the primary seller " +
          "that the ticket is valid. Under s. 2(2), if the person facilitating the sale complies, " +
          "no other person is required to. This guarantee is about resale; the saved Act does not " +
          "set a refund rule for a ticket bought from the primary seller.",
        sourceUrl: TSA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TSA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The guarantee",
            why: "Shows which guarantee or confirmation was given, and by whom.",
            examples: ["Screenshot of the guarantee on the site", "The terms shown at checkout", "Any confirmation of validity"],
          },
          {
            name: "What went wrong",
            why: "Shows the event was cancelled, entry was refused, or the ticket was fake or not as described.",
            examples: ["Cancellation notice from the event", "Notes or photos from the gate", "The listing compared with the ticket received"],
          },
        ],
      },
      {
        id: "price-and-disclosure-tix",
        name: "Charged more than allowed, or the price was not disclosed",
        plainExplanation:
          "Under s. 2(3) of the Ticket Sales Act, 2017, no person shall make a ticket available " +
          "for sale on the secondary market, or facilitate that sale, for an amount that exceeds " +
          "the total price paid when the ticket was bought from the primary seller, plus any " +
          "applicable fees, service charges and taxes charged by the secondary seller or platform " +
          "operator. Under s. 6(3) and (4), the offer on the secondary market shall disclose the " +
          "total price of the ticket when bought from the primary seller, the total price charged " +
          "on the resale, and an itemized list of the fees, service charges and taxes. Under s. 3, " +
          "no person shall make a ticket available for sale if the ticket is not in their " +
          "possession or control.",
        sourceUrl: TSA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TSA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The prices",
            why: "Shows the original price and the resale price charged.",
            examples: ["The price printed or displayed on the ticket", "The resale listing", "Checkout screen showing fees"],
          },
          {
            name: "The offer as shown",
            why: "Shows what the offer did or did not disclose.",
            examples: ["Screenshots of the listing", "Order confirmation"],
          },
        ],
      },
      {
        id: "loss-from-contravention-tix",
        name: "A loss caused by breaking the Act",
        plainExplanation:
          "Under s. 11(1) of the Ticket Sales Act, 2017, a ticket purchaser who has suffered a loss " +
          "as a result of a person's contravention of the Act or the regulations may commence an " +
          "action in a court against that person. Under s. 11(3), if the court finds that the " +
          "defendant contravened the provision, it may order restitution of any money paid by the " +
          "plaintiff, award damages in the amount of any loss suffered because of the " +
          "contravention, including exemplary or punitive damages, or make other orders listed in " +
          "that subsection.",
        sourceUrl: TSA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TSA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The loss",
            why: "Supports the dollar amount claimed.",
            examples: ["Amount paid for the ticket", "Fees charged", "Travel or other costs caused by the problem"],
          },
          {
            name: "Requests for a refund",
            why: "Shows the refund was asked for and what answer came back.",
            examples: ["Emails or chat transcripts with the seller or platform", "Refund request forms", "Replies"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "charity-or-other-complied-tix",
        name: "The resale rules do not apply, or someone else gave the guarantee",
        plainExplanation:
          "Under s. 2(4) of the Ticket Sales Act, 2017, section 2 does not apply if the ticket sale " +
          "is for the benefit of a registered charity as defined in subsection 248(1) of the Income " +
          "Tax Act (Canada). Under s. 2(2), if a person who facilitates the sale of a ticket on the " +
          "secondary market complies with s. 2(1) for that sale, no other person is required to " +
          "comply with s. 2(1) for that sale.",
        whenThisComesUp:
          "When the seller says the sale was for a registered charity, or that the platform, not the seller, gave the required guarantee.",
        sourceUrl: TSA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TSA_CONSOLIDATION,
      },
      {
        id: "due-diligence-tix",
        name: "Exemplary or punitive damages and due diligence",
        plainExplanation:
          "Under s. 11(4) of the Ticket Sales Act, 2017, an order for exemplary or punitive damages " +
          "may not be made if the person took reasonable precautions and exercised due diligence " +
          "to avoid contravening the provision.",
        whenThisComesUp: "When exemplary or punitive damages are claimed.",
        sourceUrl: TSA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TSA_CONSOLIDATION,
      },
      {
        id: "dispute-tix",
        name: "The seller or platform disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say a refund was offered or paid, the " +
          "required guarantee was given, or entry was refused because of something the event or " +
          "venue did after the sale.",
        whenThisComesUp: "When the seller or platform files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 11(1) of the Ticket Sales Act, 2017, the action is commenced \"in a court\". " +
          "Under s. 11(2), a person seeking an injunction or an order of specific performance under " +
          "s. 11(3)(c) or (d) must commence the action in the Superior Court of Justice. " +
          AMOUNT.trim(),
        sourceUrl: TSA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TSA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: SC_GUIDE, pinpoint: "Making a claim -- Types of claims dealt with in Small Claims Court" }],
      },
      {
        note:
          "Under s. 12(1) of the Ticket Sales Act, 2017, the Ministry may receive complaints about " +
          "conduct that may be in contravention of the Act, and may make inquiries and attempt to " +
          "mediate or resolve them. Under s. 12(2), the Ministry may mediate a complaint if the " +
          "parties agree to mediation. This is separate from a claim for money in the Small Claims " +
          "Court.",
        sourceUrl: TSA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TSA_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "concert was cancelled and no refund",
      "bought fake tickets online",
      "resale ticket didn't work at the gate",
      "ticket reseller won't refund",
      "paid way more than face value for a ticket",
      "event cancelled ticket refund",
      "resold ticket was not the seat advertised",
      "ticket resale site refund",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: TSA_NAME,
        officialUrl: TSA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1, 1.1, 2(1)-(4), 3, 6(3)-(4), 11(1)-(4), 12(1)-(2)",
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
    id: "sc-claim-college-or-university-fee-dispute",
    name: "A college or university fee dispute",
    broughtBy:
      "A student or former student who has a money dispute with a college or university -- for example fees paid for a program, course or service that was not provided as agreed. Not the school.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "contract-with-school-uni",
        name: "The student's relationship with the school, and what it promised",
        plainExplanation:
          "In Jaffer v. York University, 2010 ONCA 654, at para. 30, the Court of Appeal for " +
          "Ontario said there is no dispute that the relationship between a student and a " +
          "university has a contractual foundation, giving rise to duties in both contract and " +
          "tort. At para. 29, it said that a claim that the university owed the student " +
          "obligations in contract and in tort, and that its failure to meet them caused damages, " +
          "falls within the jurisdiction of the Superior Court. This part of the checklist is about what the school agreed to " +
          "provide, what was paid, and what was not provided.",
        sourceUrl: JAFFER,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "What the school promised",
            why: "Shows the terms of enrolment and the program or service paid for.",
            examples: ["Offer of admission and acceptance", "Program description or calendar for that year", "Fee schedule and refund policy"],
          },
          {
            name: "What was paid and what was received",
            why: "Shows the fees paid and what was or was not provided.",
            examples: ["Fee statements and receipts", "Emails with the school", "Course cancellation notices"],
          },
        ],
      },
      {
        id: "money-not-grade-uni",
        name: "The claim is for money, not to change an academic decision",
        plainExplanation:
          "In Jaffer v. York University, 2010 ONCA 654, at para. 26, the Court of Appeal set out the " +
          "conclusion of an earlier decision of that court (Gauthier) that it is the remedy sought " +
          "that is indicative of jurisdiction: judicial " +
          "review is the proper procedure when seeking to reverse an internal academic decision, " +
          "but if a plaintiff alleges the basis for a cause of action in tort or contract and " +
          "claims damages, the court has jurisdiction even if the dispute arises out of an " +
          "academic matter. At para. 29, the court noted that the claim before it was not an " +
          "indirect attempt at judicial review, because the student did not seek to reverse " +
          "decisions about his grades or compel the university to readmit him.",
        sourceUrl: JAFFER,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "What is being asked for",
            why: "Shows the claim is for a sum of money, such as fees back or costs caused.",
            examples: ["A calculation of the fees and costs claimed", "Receipts"],
          },
          {
            name: "Any internal process already used",
            why: "Shows what the school was asked and what it decided.",
            examples: ["Refund or appeal requests to the school", "The school's written decision"],
          },
        ],
      },
      {
        id: "amount-uni",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the fees paid, any refund already received, and the " +
          "documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Fee figures",
            why: "Supports the dollar amount claimed.",
            examples: ["Fee statements", "Receipts or bank records", "Any partial refund received"],
          },
          {
            name: "Other costs",
            why: "Supports any other amount claimed because of what happened.",
            examples: ["Receipts for replacement courses", "Other out-of-pocket costs"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "academic-discretion-uni",
        name: "The school's discretion over academic matters",
        plainExplanation:
          "In Jaffer v. York University, 2010 ONCA 654, at para. 27, the Court of Appeal noted that " +
          "by enrolling at a university, a student agrees to be subject to the institution's " +
          "discretion in resolving academic matters, including the assessment of the quality of " +
          "the student's work and the organization and implementation of its programs. At " +
          "para. 28, it noted that the court may strike a claim when, for example, it is simply an " +
          "indirect attempt to appeal an academic decision for which the appropriate remedy is " +
          "judicial review, or when the pleadings do not disclose details needed to show that the " +
          "university's actions go beyond the broad discretion it enjoys.",
        whenThisComesUp:
          "When the school says the dispute is about an academic decision, such as a grade or a program change, rather than a promise about fees or services.",
        sourceUrl: JAFFER,
        verifiedAt: VERIFIED,
      },
      {
        id: "dispute-uni",
        name: "The school disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the fees were owed under the school's " +
          "terms, a refund policy was followed, or the matter is an academic one.",
        whenThisComesUp: "When the college or university files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "In Jaffer v. York University, 2010 ONCA 654, at para. 29, the Court of Appeal said that " +
          "claims that a university owed a student obligations in contract and tort, and that its " +
          "failure to meet them caused damages, fall within the jurisdiction of the Superior " +
          "Court. Under s. 22(1) of the Courts of Justice Act, the Small Claims Court is continued " +
          "as a branch of the Superior Court of Justice. A request to reverse an internal academic " +
          "decision is, under para. 26 of Jaffer, a matter for judicial review, not a claim for " +
          "damages.",
        sourceUrl: JAFFER,
        verifiedAt: VERIFIED,
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
      "college won't refund my tuition",
      "university charged fees for a program that was cancelled",
      "dispute with my college over fees",
      "paid tuition for a course that never ran",
      "school promised a program it didn't deliver",
      "want my tuition back",
      "university fee refund dispute",
      "college kept my deposit",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Jaffer v. York University, 2010 ONCA 654",
        officialUrl: JAFFER,
        verifiedAt: VERIFIED,
        pinpoint: "paras. 26-30",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: CJA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 22(1)",
      },
      {
        sourceName: SC_RULES_NAME,
        officialUrl: SC_RULES,
        verifiedAt: VERIFIED,
        pinpoint: "rr. 9.01, 9.02",
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
