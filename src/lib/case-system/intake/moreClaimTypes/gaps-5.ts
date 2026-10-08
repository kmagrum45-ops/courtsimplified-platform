/**
 * Case types, batch "gaps-5" (small-claims): types first left out for want of saved law,
 * written once the law was saved (2026-10-07). Sources are recorded in
 * docs/sources/catalogue-verification/gaps-5.json and held by test:catalogue-verified.
 *
 * Every legal statement rests on text saved in this repository:
 *   - Air Passenger Protection Regulations, SOR/2019-150 (air-passenger-protection-regulations.txt)
 *   - Energy Consumer Protection Act, 2010 (energy-consumer-protection-act-2010.txt)
 *   - Copyright Act, R.S.C. 1985, c. C-42 (copyright-act.txt)
 *   - plus the Rules of the Small Claims Court, the Small Claims Court guide, the
 *     Courts of Justice Act and the Limitations Act, 2002, all in the corpus.
 *
 * The two federal texts come from laws-lois.justice.gc.ca, whose saved copies state
 * no "CONSOLIDATION PERIOD"; entries resting on them carry no consolidationPeriod
 * (the catalogue check requires one only for an e-Laws .doc). The intake-coverage
 * check does not accept laws-lois.justice.gc.ca as a primary sourceUrl, so, as in
 * sc-money-owed-1, each federal source is carried as alsoCites beside an ontario.ca
 * source the entry also quotes.
 *
 * What is deliberately NOT said, because the text is not saved:
 *   - The Canada Transportation Act, which sets out the Canadian Transportation
 *     Agency's complaint process. The Regulations only require the carrier to tell
 *     passengers of their recourse, "including their recourse to the Agency".
 *   - The Carriage by Air Act and the Montreal Convention in its Schedule VI, which
 *     s. 23 of the Regulations uses to set the amount for lost or damaged baggage.
 *     So no baggage dollar amount is given.
 *   - The regulations under the Energy Consumer Protection Act, 2010 (refund time
 *     limits, prescribed cancellation fees, unfair practices) and the Ontario Energy
 *     Board Act, 1998. A bill from the local utility (a "distributor") is outside
 *     Part II of the Act, which is about retailers and gas marketers.
 *   - Trade-marks and patents: only the Copyright Act is saved, so the
 *     "copyright or intellectual property" type covers copyright alone.
 */

import type { ClaimType } from "../claimTypes";

const VERIFIED = "2026-10-07";

const APPR = "https://laws-lois.justice.gc.ca/eng/regulations/SOR-2019-150/FullText.html";
const ECPA = "https://www.ontario.ca/laws/docs/10e08_e.doc";
const ECPA_CONSOLIDATION = "2024-12-04";
const COPYRIGHT = "https://laws-lois.justice.gc.ca/eng/acts/C-42/FullText.html";

const SC_GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim";
const SC_RULES = "https://www.ontario.ca/laws/docs/980258_e.doc";
const SC_RULES_CONSOLIDATION = "2025-10-14";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_CONSOLIDATION = "2024-12-04";
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";

const APPR_NAME = "Air Passenger Protection Regulations, SOR/2019-150";
const ECPA_NAME = "Energy Consumer Protection Act, 2010, S.O. 2010, c. 8";
const COPYRIGHT_NAME = "Copyright Act, R.S.C. 1985, c. C-42";
const LIMITATIONS_NAME = "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B";
const SC_RULES_NAME = "Rules of the Small Claims Court, O. Reg. 258/98";
const CJA_NAME = "Courts of Justice Act, R.S.O. 1990, c. C.43";

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

const AMOUNT =
  "Ontario's Small Claims Court guide says the reasons for a claim should \"calculate and explain " +
  "the amount of money and any interest you are claiming\", and that a copy of the supporting " +
  "documents is attached to the claim (if they are not attached, the claim gives the reasons why). " +
  "The guide says the court can handle any action for the payment of money or the recovery of " +
  "personal property where the amount claimed does not exceed $50,000, excluding interest and " +
  "costs such as court fees.";

const DOCS =
  " Ontario's Small Claims Court guide says a copy of the supporting documents is attached to " +
  "the claim (if they are not attached, the claim gives the reasons why).";

const AGENCY_NOTE =
  "Under s. 5(3) of the Air Passenger Protection Regulations, a carrier must provide information " +
  "on the treatment of passengers, the minimum compensation owed by the carrier and \"the " +
  "recourse against the carrier available to passengers, including their recourse to the " +
  "Agency\" (the Canadian Transportation Agency) on all digital platforms it uses to sell tickets " +
  "and on all documents on which the passenger's itinerary appears. Under s. 13(1)(d), a " +
  "carrier must also tell passengers affected by a cancellation, delay or denial of boarding " +
  "the recourse available against the carrier, including their recourse to the Agency. The " +
  "Canada Transportation Act, which sets out how a complaint to the Agency works, is not saved " +
  "here, so this checklist does not say how that recourse works or how it relates to a claim " +
  "in the Small Claims Court. Ontario's Small Claims Court guide says a Plaintiff's Claim " +
  "(Form 7A) commences an action.";

export const TYPES_GAPS_5: ClaimType[] = [
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-airline-delay-or-cancellation",
    name: "A flight delayed, cancelled, or boarding denied",
    broughtBy:
      "An air passenger whose flight was delayed or cancelled, or who was denied boarding, and who did not receive the compensation, refund or care they say the airline owed them.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "disruption-in-carrier-control-apd",
        name: "What happened, and whether it was within the airline's control",
        plainExplanation:
          "Under s. 2(1) of the Air Passenger Protection Regulations, the carrier operating a " +
          "flight is liable to passengers for the obligations set out in sections 7 to 22 and 24, " +
          "or the obligations on the same matter in the applicable tariff if they are more " +
          "favourable to the passengers. What the carrier owes depends on the kind of disruption. " +
          "Section 12 applies to a delay, cancellation or denial of boarding that is within the " +
          "carrier's control and is not required for safety purposes; s. 11 applies to one within " +
          "the carrier's control but required for safety purposes; and s. 10 applies to one due " +
          "to situations outside the carrier's control. Under s. 1(3), there is a denial of " +
          "boarding when a passenger is not permitted to occupy a seat because the number of " +
          "seats that may be occupied is less than the number of passengers who have checked in " +
          "by the required time, hold a confirmed reservation and valid travel documentation, and " +
          "are present at the boarding gate at the required boarding time." + DOCS,
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: APPR, pinpoint: "Air Passenger Protection Regulations, ss. 1(3), 2(1), 10(1), 11(1), 12(1)" }],
        evidenceCategories: [
          {
            name: "The booking",
            why: "Shows the flight, the original departure and arrival times, and which airline operated it.",
            examples: ["Ticket or e-ticket receipt", "Booking confirmation and itinerary", "Boarding pass"],
          },
          {
            name: "What the airline said about the disruption",
            why: "Shows when the passenger was told and the reason the airline gave.",
            examples: ["Delay or cancellation emails and app notifications", "Screenshots of the flight status", "Notes of gate announcements, with times"],
          },
        ],
      },
      {
        id: "minimum-compensation-apd",
        name: "The minimum compensation set by the Regulations",
        plainExplanation:
          "Under s. 12(2)(d) and (3)(d) of the Air Passenger Protection Regulations, for a delay " +
          "or cancellation within the carrier's control and not required for safety purposes, " +
          "where the passenger is informed 14 days or less before the departure time on the " +
          "original ticket, the carrier must provide minimum compensation under s. 19. Under " +
          "s. 19(1), a large carrier must provide $400 if arrival at the destination on the " +
          "original ticket is delayed by three hours or more but less than six hours, $700 if " +
          "delayed by six hours or more but less than nine hours, and $1,000 if delayed by nine " +
          "hours or more; a small carrier must provide $125, $250 and $500 for the same delays. " +
          "Under s. 19(2), if the ticket is refunded under s. 17(2), the minimum compensation is " +
          "$400 for a large carrier and $125 for a small carrier. Under s. 12(4)(d) and s. 20(1), " +
          "for a denial of boarding within the carrier's control, the minimum compensation is $900 " +
          "if arrival is delayed by less than six hours, $1,800 if delayed by six hours or more " +
          "but less than nine hours, and $2,400 if delayed by nine hours or more. Under s. 1(2), " +
          "a \"large carrier\" is one that has transported a worldwide total of two million " +
          "passengers or more during each of the two preceding calendar years; any other carrier " +
          "is a \"small carrier\"." + DOCS,
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: APPR, pinpoint: "Air Passenger Protection Regulations, ss. 1(2), 12(2)(d), (3)(d), (4)(d), 19(1)-(2), 20(1)" }],
        evidenceCategories: [
          {
            name: "Arrival time",
            why: "The amount turns on how late the passenger arrived at the destination on the original ticket.",
            examples: ["Boarding pass for the replacement flight", "Airline's record of the actual arrival", "Messages or photos showing the arrival time"],
          },
          {
            name: "When the passenger was told",
            why: "Compensation under s. 19 applies where the passenger was informed 14 days or less before departure.",
            examples: ["The first delay or cancellation notice, with its date", "Email or app history"],
          },
        ],
      },
      {
        id: "request-and-response-apd",
        name: "The compensation request and the airline's answer",
        plainExplanation:
          "Under s. 19(3) of the Air Passenger Protection Regulations, to receive the minimum " +
          "compensation for a delay or cancellation, a passenger must file a request for " +
          "compensation with the carrier before the first anniversary of the day on which the " +
          "flight delay or cancellation occurred. Under s. 19(4), the carrier must, within 30 " +
          "days after receiving the request, provide the compensation or an explanation as to why " +
          "compensation is not payable. Under s. 20(2), compensation for a denial of boarding must " +
          "be provided as soon as it is operationally feasible, but not later than 48 hours after " +
          "the denial of boarding. Under s. 21, compensation must be in the form of money unless " +
          "the passenger was told in writing of the value of another form, that other form has a " +
          "greater monetary value and does not expire, and the passenger confirmed in writing that " +
          "they chose it." + DOCS,
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: APPR, pinpoint: "Air Passenger Protection Regulations, ss. 19(3)-(4), 20(2), 21" }],
        evidenceCategories: [
          {
            name: "The request",
            why: "Shows that a request was filed with the carrier, and when.",
            examples: ["Copy of the online claim form or email sent", "Claim or reference number", "Proof of the date sent"],
          },
          {
            name: "The airline's reply",
            why: "Shows whether compensation was paid, refused with an explanation, or not answered within 30 days.",
            examples: ["Airline's reply letter or email", "Any voucher offered and what it said", "Notes of phone calls, with dates"],
          },
        ],
      },
      {
        id: "refund-and-care-apd",
        name: "Refund, rebooking and care during the wait",
        plainExplanation:
          "Under s. 17(1) of the Air Passenger Protection Regulations, where the disruption is " +
          "within the carrier's control, the carrier must provide alternate travel arrangements " +
          "free of charge, and under s. 17(2), if those do not accommodate the passenger's travel " +
          "needs, refund the unused portion of the ticket (or, where the travel no longer serves " +
          "a purpose, refund the ticket and provide a flight back to the point of origin). Section " +
          "18 sets out the rebooking and refund rules where the disruption is outside the " +
          "carrier's control. Under " +
          "s. 18.2(2), refunds must be provided within 30 days after the day the carrier becomes " +
          "obligated to provide them. Under s. 14(1) and (2), where the passenger was informed of " +
          "the delay or cancellation less than 12 hours before the departure time on the original " +
          "ticket and has waited two hours after that departure time, the carrier must provide " +
          "food and drink in reasonable quantities and access to a means of communication, and " +
          "must offer hotel or comparable accommodation and transportation if an overnight wait " +
          "is expected." + DOCS,
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: APPR, pinpoint: "Air Passenger Protection Regulations, ss. 12(2)(b), 14(1)-(2), 17(1)-(2), 18(1), 18.2(2)" }],
        evidenceCategories: [
          {
            name: "Out-of-pocket costs",
            why: "Supports any amount claimed for the ticket or for costs during the wait.",
            examples: ["Receipts for meals, hotel and transport", "Receipt for a replacement ticket bought", "Bank or card statement"],
          },
          {
            name: "What was offered",
            why: "Shows what rebooking, refund or care the airline offered, and when.",
            examples: ["Rebooking notices", "Meal or hotel vouchers", "Refund confirmation or refusal"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "outside-control-apd",
        name: "The airline says the disruption was outside its control or required for safety",
        plainExplanation:
          DEFENCE +
          "Under s. 10(1) of the Air Passenger Protection Regulations, situations outside the " +
          "carrier's control include, but are not limited to, war or political instability, " +
          "meteorological conditions or natural disasters that make the safe operation of the " +
          "aircraft impossible, instructions from air traffic control, a security threat, airport " +
          "operation issues, a medical emergency, a collision with wildlife, and a labour " +
          "disruption within the carrier or within an essential service provider. Under s. 10(2), " +
          "a disruption directly attributable to an earlier one outside the carrier's control is " +
          "also considered outside its control if the carrier took all reasonable measures to " +
          "mitigate the impact of the earlier disruption. Under s. 1(1), \"required for safety " +
          "purposes\" means required by law in order to reduce risk to passenger safety, but does " +
          "not include scheduled maintenance in compliance with legal requirements. The minimum " +
          "compensation in s. 19 and s. 20 is tied to s. 12, which applies to disruptions within " +
          "the carrier's control and not required for safety purposes.",
        whenThisComesUp:
          "When the airline's reply or Defence says the delay, cancellation or denial of boarding was caused by weather, air traffic control, a safety issue or another situation outside its control.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: APPR, pinpoint: "Air Passenger Protection Regulations, ss. 1(1), 10(1)-(2), 19(1), 20(1)" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: AGENCY_NOTE,
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: APPR, pinpoint: "Air Passenger Protection Regulations, ss. 5(3), 13(1)(d)" }],
      },
      { note: AMOUNT, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "my flight was delayed",
      "flight cancelled and airline won't pay compensation",
      "denied boarding because the flight was overbooked",
      "bumped from my flight",
      "airline refused my delay compensation claim",
      "airline won't refund my cancelled flight",
      "stuck overnight at the airport and airline didn't pay for hotel",
      "arrived nine hours late",
      "airline says delay was outside their control",
      "air passenger protection regulations",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: APPR_NAME,
        officialUrl: APPR,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1(1)-(3), 2(1), 5(3), 10(1)-(2), 12(2)-(4), 13(1)(d), 14(1)-(2), 17(1)-(2), 18.2(2), 19(1)-(4), 20(1)-(2), 21",
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
    id: "sc-claim-airline-baggage-lost-or-damaged",
    name: "Baggage lost or damaged by an airline",
    broughtBy:
      "An air passenger whose checked baggage was lost, delayed or damaged by the airline and who was not paid what they say is owed.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "lost-or-damaged-apb",
        name: "The baggage was lost for more than 21 days, admitted lost, or damaged",
        plainExplanation:
          "Under s. 23(1) of the Air Passenger Protection Regulations, if a carrier admits to the " +
          "loss of baggage, or if baggage is lost for more than 21 days or is damaged, the carrier " +
          "must provide compensation equal to or greater than the sum of the fees paid for that " +
          "baggage and, where the Carriage by Air Act applies, the compensation payable under that " +
          "Act (or, where it does not apply, the amount that would be payable under the Convention " +
          "set out in Schedule VI to that Act if the carrier were conducting international " +
          "carriage of baggage). The Carriage by Air Act and its Convention are not saved here, so " +
          "this checklist does not say what that amount is." + DOCS,
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: APPR, pinpoint: "Air Passenger Protection Regulations, s. 23(1)" }],
        evidenceCategories: [
          {
            name: "The baggage and the flight",
            why: "Shows which bag was checked, on which flight, and the baggage fees paid.",
            examples: ["Baggage claim tag", "Ticket and itinerary", "Receipt for baggage fees"],
          },
          {
            name: "The report to the airline",
            why: "Shows when the loss or damage was reported and how long the bag was missing.",
            examples: ["Property irregularity report or file reference", "Emails with the airline's baggage office", "Photos of the damage"],
          },
          {
            name: "Value of the contents or repair",
            why: "Supports the dollar amount claimed.",
            examples: ["Receipts for the bag and its contents", "Repair quote or invoice", "Receipts for essentials bought while the bag was missing"],
          },
        ],
      },
      {
        id: "temporary-loss-apb",
        name: "The baggage was lost for 21 days or less",
        plainExplanation:
          "Under s. 23(2) of the Air Passenger Protection Regulations, if baggage is lost for 21 " +
          "days or less, the carrier must provide compensation equal to or greater than the sum of " +
          "the fees paid for that baggage and, where the Carriage by Air Act applies, the " +
          "compensation payable under that Act (or, where it does not apply, the amount that would " +
          "be payable for delay in the carriage of baggage under the Convention set out in " +
          "Schedule VI to that Act). Those texts are not saved here, so this checklist does not " +
          "say what that amount is." + DOCS,
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: APPR, pinpoint: "Air Passenger Protection Regulations, s. 23(2)" }],
        evidenceCategories: [
          {
            name: "How long the bag was missing",
            why: "Shows the days between arrival and the bag's return.",
            examples: ["Delivery receipt or message when the bag was returned", "Airline's baggage tracking updates"],
          },
          {
            name: "Costs while it was missing",
            why: "Supports the amount claimed.",
            examples: ["Receipts for clothing and toiletries bought", "Bank or card statement"],
          },
        ],
      },
      {
        id: "terms-apb",
        name: "The airline's terms for lost or damaged baggage",
        plainExplanation:
          "Under s. 5(1)(b) of the Air Passenger Protection Regulations, a carrier must make its " +
          "terms and conditions of carriage that apply to lost or damaged baggage available in " +
          "simple, clear and concise language, and under s. 5(2) they must be made available on " +
          "all digital platforms the carrier uses to sell tickets and on all documents on which " +
          "the passenger's itinerary appears. This part of the checklist is about what those " +
          "terms said at the time of the flight." + DOCS,
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: APPR, pinpoint: "Air Passenger Protection Regulations, s. 5(1)(b), (2)" }],
        evidenceCategories: [
          {
            name: "The terms",
            why: "Shows what the airline's own terms said about lost or damaged baggage.",
            examples: ["Screenshot or saved copy of the baggage terms", "Terms printed on the itinerary"],
          },
          {
            name: "The airline's answer",
            why: "Shows what the airline offered or refused, and why.",
            examples: ["Airline's reply letter or email", "Any offer of payment or voucher"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-apb",
        name: "The airline disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the bag was returned, the damage was " +
          "not caused in its care, or the amount claimed is more than the airline owes.",
        whenThisComesUp: "When the airline files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: AGENCY_NOTE,
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: APPR, pinpoint: "Air Passenger Protection Regulations, ss. 5(3), 13(1)(d)" }],
      },
      { note: AMOUNT, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "airline lost my luggage",
      "my suitcase never arrived",
      "airline damaged my suitcase",
      "checked bag was broken when I got it back",
      "luggage delayed for days",
      "airline won't pay for my lost bag",
      "things missing from my checked bag",
      "had to buy clothes because my bag was lost",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: APPR_NAME,
        officialUrl: APPR,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 5(1)(b), 5(2), 5(3), 13(1)(d), 23(1), 23(2)",
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
    id: "sc-claim-electricity-or-gas-billing",
    name: "An electricity or gas bill",
    broughtBy:
      "A household or small user with a contract to buy electricity or natural gas from an energy retailer or gas marketer, who cancelled the contract or says it is void and wants their money back. Not a bill dispute with the local utility that delivers the energy.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "retail-contract-ecb",
        name: "A contract with an energy retailer or gas marketer",
        plainExplanation:
          "Under s. 3(1) of the Energy Consumer Protection Act, 2010, Part II of the Act applies " +
          "to gas marketing and retailing of electricity to consumers, and under s. 3(2) it applies " +
          "despite any contract, other agreement or waiver to the contrary. Under s. 2, a " +
          "\"contract\" is an agreement between a consumer and a retailer for the provision of " +
          "electricity, or between a consumer and a gas marketer for the provision of gas. A " +
          "\"retailer\" is a person who retails electricity, but does not include a distributor, " +
          "a suite meter provider or such other persons as may be prescribed. For gas, a " +
          "\"consumer\" is a person who annually uses less than the prescribed amount of gas; for " +
          "electricity, a person who uses, for their own consumption, electricity they did not " +
          "generate and who annually uses less than the prescribed amount. Under " +
          "s. 6, any ambiguity that allows for more than one reasonable interpretation of a " +
          "contract provided by a supplier to a consumer is interpreted to the benefit of the " +
          "consumer.",
        sourceUrl: ECPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ECPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The contract",
            why: "Shows who the supplier is and the terms signed.",
            examples: ["Text-based copy of the contract", "Verification call record or letter", "Welcome letter from the retailer or gas marketer"],
          },
          {
            name: "The bills",
            why: "Shows the supplier's charges on the bill and what was paid.",
            examples: ["Energy bills showing the supplier's charges", "Bank statements showing payments"],
          },
        ],
      },
      {
        id: "cancelled-or-void-ecb",
        name: "The contract was cancelled or is deemed void",
        plainExplanation:
          "Under s. 19(1) of the Energy Consumer Protection Act, 2010, a consumer may, without any " +
          "reason, cancel a contract from the date of entering into it until 10 days after a " +
          "text-based copy of the contract is delivered and the consumer acknowledges its receipt. " +
          "Under s. 19(2) and (3), a consumer may cancel at any time if the requirements of " +
          "s. 12(1) are not met or if the supplier engages in an unfair practice, and under " +
          "s. 19(5), at any time and without cause on giving the prescribed period of notice. " +
          "Under s. 21, a cancellation may be expressed in any way that indicates the intention to " +
          "cancel; unless the regulations provide otherwise it is in writing, and it may be given " +
          "by any means that provides evidence of the date it was delivered or sent. Under " +
          "s. 16(1), a contract is deemed to be void in listed situations, including where a " +
          "text-based copy is not delivered as s. 13(1) requires or the contract is not verified " +
          "as s. 15 requires. Under s. 16(4), the consumer is then not liable for any obligations " +
          "under the contract, including cancellation charges, administration charges or any " +
          "other charges or penalties.",
        sourceUrl: ECPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ECPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The cancellation",
            why: "Shows that the contract was cancelled, and the date.",
            examples: ["Copy of the cancellation letter or email", "Registered mail or courier receipt", "Fax confirmation"],
          },
          {
            name: "Dates of delivery and verification",
            why: "Shows when the contract copy was delivered and whether, and when, it was verified.",
            examples: ["Envelope or email showing when the contract arrived", "Verification letter or recording", "Notes of the sales visit or call"],
          },
        ],
      },
      {
        id: "refund-not-received-ecb",
        name: "No refund was received",
        plainExplanation:
          "Under s. 27 of the Energy Consumer Protection Act, 2010, a consumer may commence an " +
          "action against the supplier if the consumer has cancelled a contract under Part II, or " +
          "if the contract is deemed void under s. 16, and the consumer has not received a refund " +
          "within the prescribed time after the cancellation or the day the contract was deemed " +
          "void. Under s. 28(2), if the consumer is successful in such an action, unless in the " +
          "circumstances it would be inequitable to do so, the court shall order that the consumer " +
          "recover all of the money paid under the contract for a cancellation under s. 19(2), (4) " +
          "or (5), and twice the amount of the money paid under the contract for a cancellation " +
          "under s. 19(1) or (3) or a contract deemed to be void. Under s. 28(3), the court may " +
          "also order exemplary or punitive damages or such other relief as it considers proper. " +
          "The regulations that set the refund time are not saved here.",
        sourceUrl: ECPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ECPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Money paid under the contract",
            why: "Supports the amount claimed.",
            examples: ["Bills showing the supplier's charges", "Bank statements", "A list of payments with dates"],
          },
          {
            name: "Asking for the refund",
            why: "Shows the refund was asked for and not received.",
            examples: ["Refund request letter or email", "Supplier's reply", "Notes of calls, with dates"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "cancellation-fees-ecb",
        name: "The supplier says cancellation fees are owed",
        plainExplanation:
          "Under s. 22(1) of the Energy Consumer Protection Act, 2010, a consumer who cancels a " +
          "contract under s. 19(1), (2) or (3) is not liable for any obligations in respect of the " +
          "cancellation, including cancellation charges, administration charges or any other " +
          "charges or fees, or for monetary obligations under the contract for any period after " +
          "the cancellation takes effect. Under s. 22(2), a consumer who cancels under s. 19(4) or " +
          "(5) is liable for such classes of obligations in respect of the cancellation as may be " +
          "prescribed and no others, and for such classes of monetary obligations under the " +
          "contract for the period after the cancellation as may be prescribed, in each case up to " +
          "any prescribed amount. Those prescribed classes and amounts are in regulations not " +
          "saved here. Under " +
          "s. 26, no cause of action against the consumer arises as a result of the cancellation " +
          "of a contract under Part II.",
        whenThisComesUp:
          "When the retailer or gas marketer says a cancellation or exit fee, or charges after the cancellation, are owed.",
        sourceUrl: ECPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ECPA_CONSOLIDATION,
      },
      {
        id: "dispute-ecb",
        name: "The supplier disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the contract was not cancelled, was " +
          "properly delivered and verified, or that a refund was already paid.",
        whenThisComesUp: "When the retailer or gas marketer files a Defence (Form 9A).",
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
          "Under s. 28(1) of the Energy Consumer Protection Act, 2010, if a consumer has a right " +
          "to commence an action under the Act, the consumer may commence the action in the " +
          "Superior Court of Justice. Under s. 22(1) of the Courts of Justice Act, the Small Claims " +
          "Court is continued as a branch of the Superior Court of Justice. Under s. 3(3) of the " +
          "Energy Consumer Protection Act, 2010, a contract term that requires disputes to be " +
          "submitted to arbitration is invalid in so far as it prevents a consumer from exercising " +
          "a right to commence an action in the Superior Court of Justice. Under s. 29, if a " +
          "consumer is required to give notice under Part II to obtain a remedy, a court may " +
          "disregard the requirement if it is in the interest of justice to do so.",
        sourceUrl: ECPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ECPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CJA, pinpoint: "Courts of Justice Act, s. 22(1)" }],
      },
      {
        note:
          "Part II of the Energy Consumer Protection Act, 2010 is about retailers and gas " +
          "marketers. Under s. 2, a \"retailer\" does not include a distributor. Under s. 1(5), " +
          "nothing in the Act abrogates or derogates from the powers and duties of the Ontario " +
          "Energy Board as they apply in respect of energy consumers under the Ontario Energy " +
          "Board Act, 1998. That Act, and the regulations under the Energy Consumer Protection " +
          "Act, 2010, are not saved here, so this checklist does not cover a bill dispute with the " +
          "local distributor or say what the Ontario Energy Board does about one.",
        sourceUrl: ECPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ECPA_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "energy retailer contract on my hydro bill",
      "signed a gas contract at my door",
      "cancelled my energy contract and they kept charging me",
      "gas marketer won't refund me",
      "cancellation fee for electricity contract",
      "door-to-door energy salesperson",
      "fixed rate gas contract I didn't agree to",
      "retailer charges on my electricity bill",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: ECPA_NAME,
        officialUrl: ECPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1(5); 2 (\"consumer\", \"contract\", \"retailer\"); 3(1)-(3); 6; 16(1), (4); 19(1)-(3), (5); 21; 22; 26; 27; 28(1)-(3); 29",
      },
      {
        sourceName: CJA_NAME,
        officialUrl: CJA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 22(1)",
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
    id: "sc-claim-copyright-or-intellectual-property",
    name: "Copyright or intellectual property",
    broughtBy:
      "A person who made or owns a work -- a photo, drawing, piece of writing, music or software -- and says someone copied or used it without permission. This checklist covers copyright only.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "copyright-owned-cop",
        name: "Copyright exists in the work, and the claimant owns it",
        plainExplanation:
          "Under s. 5(1) of the Copyright Act, copyright subsists in Canada in every original " +
          "literary, dramatic, musical and artistic work if one of the conditions listed there is " +
          "met. Under s. 2, an \"artistic work\" includes paintings, drawings, maps, charts, plans, " +
          "photographs, engravings, sculptures and works of artistic craftsmanship, and a " +
          "\"literary work\" includes tables and computer programs. Under s. 13(1), the author of " +
          "a work is the first owner of the copyright, but under s. 13(3), where the author made " +
          "the work in the course of employment, the employer is the first owner in the absence " +
          "of any agreement to the contrary. Under s. 13(4), no assignment or licence is valid " +
          "unless it is in writing signed by the owner of the right or their agent. Under " +
          "s. 34.1(1), where the defendant puts the copyright or the plaintiff's title in issue, " +
          "copyright is presumed to subsist and the author is presumed to be the owner, unless the " +
          "contrary is proved." + DOCS,
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: COPYRIGHT, pinpoint: "Copyright Act, ss. 2, 5(1), 13(1), (3), (4), 34.1(1)" }],
        evidenceCategories: [
          {
            name: "Making the work",
            why: "Shows who created the work and when.",
            examples: ["Original files with their dates (for example, camera raw files)", "Drafts and sketches", "Earlier publication with the author's name"],
          },
          {
            name: "Ownership papers",
            why: "Shows who owns the copyright if it was assigned, licensed or made for an employer.",
            examples: ["Written assignment or licence", "Employment or commission contract", "Copyright registration, if any"],
          },
        ],
      },
      {
        id: "use-without-consent-cop",
        name: "The other person did something only the owner may do, without consent",
        plainExplanation:
          "Under s. 3(1) of the Copyright Act, copyright in a work means the sole right to produce " +
          "or reproduce the work or any substantial part of it in any material form whatever, to " +
          "perform it in public or, if unpublished, to publish it, and includes, among others, the " +
          "sole right to communicate a literary, dramatic, musical or artistic work to the public " +
          "by telecommunication, and to authorize any such acts. Under s. 27(1), it is an " +
          "infringement of copyright for any person to do, without the consent of the owner of the " +
          "copyright, anything that by the Act only the owner has the right to do." + DOCS,
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: COPYRIGHT, pinpoint: "Copyright Act, ss. 3(1), 27(1)" }],
        evidenceCategories: [
          {
            name: "The use",
            why: "Shows what was copied or used, where, and when.",
            examples: ["Dated screenshots of the web page or post", "Copies of the printed item", "Archived copies of the page"],
          },
          {
            name: "No permission",
            why: "Shows that consent was not given, or what the permission covered.",
            examples: ["Messages asking for or refusing permission", "Licence terms showing what was allowed"],
          },
        ],
      },
      {
        id: "damages-cop",
        name: "The money claimed: damages and profits, or statutory damages",
        plainExplanation:
          "Under s. 35(1) of the Copyright Act, a person who infringes copyright is liable to pay " +
          "the owner the damages the owner has suffered due to the infringement and, in addition, " +
          "such part of the infringer's profits not taken into account in calculating the damages " +
          "as the court considers just. Under s. 35(2), in proving profits the plaintiff is " +
          "required to prove only receipts or revenues derived from the infringement, and the " +
          "defendant is required to prove every element of cost it claims. Under s. 38.1(1), the " +
          "owner may instead elect, at any time before final judgment, to recover statutory " +
          "damages: \"in a sum of not less than $500 and not more than $20,000 that the court " +
          "considers just\" for all infringements in the proceedings for each work, if the " +
          "infringements are for commercial purposes; and \"in a sum of not less than $100 and not " +
          "more than $5,000 that the court considers just\" for all infringements in the " +
          "proceedings for all works, if they are for non-commercial purposes." + DOCS,
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: COPYRIGHT, pinpoint: "Copyright Act, ss. 35(1)-(2), 38.1(1)" }],
        evidenceCategories: [
          {
            name: "Loss",
            why: "Supports the damages claimed.",
            examples: ["The usual licence fee for the work (rate card or past invoices)", "Lost sales or commissions"],
          },
          {
            name: "The other side's use for money",
            why: "Bears on profits, and on whether the use was commercial or non-commercial.",
            examples: ["Product listings or ads using the work", "Evidence of sales"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "fair-dealing-cop",
        name: "Fair dealing",
        plainExplanation:
          DEFENCE +
          "Under s. 29 of the Copyright Act, fair dealing for the purpose of research, private " +
          "study, education, parody or satire does not infringe copyright. Under s. 29.1, fair " +
          "dealing for the purpose of criticism or review does not infringe copyright if the " +
          "source is mentioned and, if given in the source, the name of the author of the work.",
        whenThisComesUp:
          "When the other side says the work was used for research, private study, education, parody, satire, criticism or review.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: COPYRIGHT, pinpoint: "Copyright Act, ss. 29, 29.1" }],
      },
      {
        id: "unaware-cop",
        name: "The other side says they did not know",
        plainExplanation:
          DEFENCE +
          "Under s. 38.1(2) of the Copyright Act, if the owner has elected statutory damages and " +
          "the defendant satisfies the court that the defendant was not aware and had no " +
          "reasonable grounds to believe that the defendant had infringed copyright, the court may " +
          "reduce the amount of the award under s. 38.1(1)(a) to less than $500, but not less than " +
          "$200.",
        whenThisComesUp:
          "When statutory damages for commercial use are claimed and the other side says it did not know the use infringed copyright.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: COPYRIGHT, pinpoint: "Copyright Act, s. 38.1(2)" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs", "sc-remedy-outside-jurisdiction"],
    proceduralNotes: [
      {
        note:
          "Under s. 41.24 of the Copyright Act, the Federal Court has concurrent jurisdiction with " +
          "provincial courts to hear and determine all proceedings, other than the prosecution of " +
          "offences under sections 42 and 43, for the enforcement of a provision of the Act or of " +
          "the civil remedies it provides. Under s. 34(1), where copyright has been infringed, the " +
          "owner is entitled to all remedies by way of injunction, damages, accounts, delivery up " +
          "and otherwise that are or may be conferred by law. " +
          AMOUNT,
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: COPYRIGHT, pinpoint: "Copyright Act, ss. 34(1), 41.24" }],
      },
      {
        note:
          "Under s. 43.1(1) of the Copyright Act, a court may award a remedy for an act or omission " +
          "contrary to the Act only if the proceedings are commenced within three years after it " +
          "occurred, where the plaintiff knew, or could reasonably have been expected to know, of " +
          "it at the time; or within three years after the plaintiff first knew of it, or could " +
          "reasonably have been expected to know of it, where the plaintiff did not know and could " +
          "not reasonably have been expected to know of it at the time. Under s. 43.1(2), the court " +
          "applies that period only in respect of a party who pleads a limitation period. " +
          "Ontario's Small Claims Court guide says the reasons for a claim should \"give a full " +
          "explanation of what happened, including the dates and places and nature of the " +
          "occurrences involved.\"",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: COPYRIGHT, pinpoint: "Copyright Act, s. 43.1" }],
      },
    ],
    signals: [
      "someone used my photo without permission",
      "my picture was copied onto their website",
      "business used my artwork without paying",
      "copied my writing",
      "copyright infringement",
      "used my music without permission",
      "they stole my design and are selling it",
      "copied my software code",
      "intellectual property was taken",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: COPYRIGHT_NAME,
        officialUrl: COPYRIGHT,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 2 (\"artistic work\", \"literary work\"); 3(1); 5(1); 13(1), (3), (4); 27(1); 29; 29.1; 34(1); 34.1(1); 35; 38.1(1), (2); 41.24; 43.1",
      },
      {
        sourceName: SC_RULES_NAME,
        officialUrl: SC_RULES,
        verifiedAt: VERIFIED,
        pinpoint: "rr. 9.01, 9.02",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
