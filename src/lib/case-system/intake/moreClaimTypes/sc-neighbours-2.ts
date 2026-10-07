/**
 * Case types, batch "sc-neighbours-2" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-neighbours-2.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-overhanging-branches -- Overhanging branches and roots
 *   sc-claim-snow-or-leaves-dumped -- Snow or leaves dumped on your property
 *   sc-claim-drainage-and-grading -- Drainage and grading between properties
 *   sc-claim-shared-well-or-septic -- A shared well, septic or rural service
 *   sc-claim-construction-noise-and-debris -- Construction noise and debris
 *   sc-claim-harassment-by-a-neighbour -- A neighbour who is harassing you
 *
 * Every legal statement below rests on text saved in this repository: the
 * vendored corpus (docs/sources/corpus/, url from manifest.json) or a decision
 * saved under docs/sources/decisions/. Two planned types are NOT written:
 *   - sc-claim-overhanging-branches: branches and roots crossing the line are
 *     usually decided as private nuisance, and the right to cut them back is
 *     common law; nothing saved states either (the same gap that kept
 *     sc-claim-tree-roots-damage out of sc-property-damage-1). Damage from a
 *     falling tree or branch is sc-claim-neighbours-tree-fell.
 *   - sc-claim-harassment-by-a-neighbour: nothing saved states a civil claim
 *     for harassment. Jones v. Tsige, 2012 ONCA 32 states intrusion upon
 *     seclusion, which is a privacy claim, not a harassment claim; using it
 *     here would present a partial rule as the whole one.
 * Notes on what was written:
 *   - Snow or leaves dumped, drainage and construction debris are written as
 *     negligence claims (Mustapha para. 3, Ryan para. 28, Clements paras.
 *     8-9), and each says so. Nuisance and the civil tort of trespass to land
 *     are not stated in any saved official text (CLEO's Steps to Justice page
 *     on trespass is vendored, but the catalogue check does not accept
 *     stepstojustice.ca as an official source), so they are not mentioned as
 *     law. The snow type also carries the Trespass to Property Act's notice,
 *     offence and damage-award route as a procedural note. Structural damage
 *     from building work next door is sc-claim-construction-or-excavation-next-door;
 *     the noise itself is covered only as a note on municipal by-law powers
 *     (Municipal Act, 2001, ss. 129 and 425(1)).
 *   - The shared well or septic type is written as a claim on an agreement
 *     between the neighbours. Rights that come with the land itself (an
 *     easement, co-ownership) are not covered; nothing saved states them.
 */

import type { ClaimType } from "../claimTypes";

const VERIFIED = "2026-10-07";

const SCJ_STEPS =
  "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/";
const SC_GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim";
const SUING = "https://www.ontario.ca/page/suing-someone-small-claims-court";
const SC_RULES = "https://www.ontario.ca/laws/docs/980258_e.doc";
const SC_RULES_CONSOLIDATION = "2025-10-14";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_CONSOLIDATION = "2024-12-04";
const NEGLIGENCE_ACT = "https://www.ontario.ca/laws/docs/elaws_statutes_90n01_e.doc";
const NEGLIGENCE_ACT_CONSOLIDATION = "2004-01-01";
const TRESPASS_ACT = "https://www.ontario.ca/laws/docs/90t21_e.doc";
const TRESPASS_ACT_CONSOLIDATION = "2025-06-05";
const MUNICIPAL_ACT = "https://www.ontario.ca/laws/docs/01m25_e.doc";
const MUNICIPAL_ACT_CONSOLIDATION = "2026-06-02";
const MUSTAPHA = "docs/sources/decisions/mustapha-v-culligan-2008-SCC-27.english.txt";
const RYAN = "docs/sources/decisions/ryan-v-victoria-city-1999-1-SCR-201.english.txt";
const CLEMENTS = "docs/sources/decisions/clements-v-clements-2012-SCC-32.english.txt";
const SATTVA = "docs/sources/decisions/sattva-capital-corp-v-creston-moly-corp-2014-SCC-53.english.txt";

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

const NEGLIGENCE_TEST =
  "This checklist is for a claim in negligence. In Mustapha v. Culligan of Canada Ltd., 2008 SCC " +
  "27, the Supreme Court of Canada said that a successful action in negligence requires the " +
  "plaintiff to show (1) that the defendant owed them a duty of care; (2) that the defendant's " +
  "behaviour breached the standard of care; (3) that the plaintiff sustained damage; and (4) that " +
  "the damage was caused, in fact and in law, by the defendant's breach (para. 3). In Ryan v. " +
  "Victoria (City), [1999] 1 S.C.R. 201, the Court said that conduct is negligent if it creates " +
  "an objectively unreasonable risk of harm, and that to avoid liability a person must exercise " +
  "the standard of care that would be expected of an ordinary, reasonable and prudent person in " +
  "the same circumstances (para. 28). ";

const CAUSATION =
  "In Clements v. Clements, 2012 SCC 32, the Supreme Court of Canada (Chief Justice McLachlin for " +
  "the majority; the two dissenting judges agreed with her analysis of the \"but for\" test) said " +
  "that the test for showing causation is the \"but for\" test: the plaintiff must show on a " +
  "balance of probabilities that, but for the defendant's negligent act, the injury would not " +
  "have occurred. It said this is a factual inquiry, and that the test is applied in a robust " +
  "common sense fashion, with no need for scientific evidence of the precise contribution the " +
  "defendant's negligence made to the injury (paras. 8-9). ";

const SHARED_FAULT =
  "Under s. 1 of the Negligence Act, where damages have been caused or contributed to by the " +
  "fault or neglect of two or more persons, the court shall determine the degree in which each of " +
  "them is at fault or negligent, and where two or more are found at fault or negligent, they are " +
  "jointly and severally liable to the person suffering the loss or damage. Under s. 3, in an " +
  "action founded on the fault or negligence of the defendant, if fault or negligence is found on " +
  "the part of the plaintiff that contributed to the damages, the court shall apportion the " +
  "damages in proportion to the degree of fault or negligence found against each party. Under " +
  "s. 5, wherever it appears that a person not already a party is or may be wholly or partly " +
  "responsible for the damages claimed, that person may be added as a party defendant, or made a " +
  "third party in the manner the rules of court prescribe.";

const MUSTAPHA_CITATION = {
  sourceName: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
  officialUrl: MUSTAPHA,
  verifiedAt: VERIFIED,
  pinpoint: "para. 3 (the four elements of negligence)",
};
const RYAN_CITATION = {
  sourceName: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201",
  officialUrl: RYAN,
  verifiedAt: VERIFIED,
  pinpoint: "para. 28 (standard of care)",
};
const CLEMENTS_CITATION = {
  sourceName: "Clements v. Clements, 2012 SCC 32",
  officialUrl: CLEMENTS,
  verifiedAt: VERIFIED,
  pinpoint: "paras. 8-9 (the \"but for\" test)",
};
const NEGLIGENCE_ACT_CITATION = {
  sourceName: "Negligence Act, R.S.O. 1990, c. N.1",
  officialUrl: NEGLIGENCE_ACT,
  verifiedAt: VERIFIED,
  pinpoint: "ss. 1, 3, 5",
};
const NEGLIGENCE_CITATIONS: ClaimType["citations"] = [MUSTAPHA_CITATION, RYAN_CITATION, CLEMENTS_CITATION, NEGLIGENCE_ACT_CITATION];

export const TYPES_SC_NEIGHBOURS_2: ClaimType[] = [
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-snow-or-leaves-dumped",
    name: "Snow or leaves dumped on your property",
    broughtBy:
      "The owner or occupant whose yard, driveway, garden or other property had snow, leaves, yard waste or other material put on it by a neighbour, or by someone the neighbour hired, without permission.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "reasonable-care-with-snow-or-leaves-sd",
        name: "The neighbour, or someone they hired, did not take reasonable care where the snow or leaves went",
        plainExplanation:
          NEGLIGENCE_TEST +
          "This part of the checklist is about what was put on the property -- snow, ice, leaves, " +
          "yard waste or other material -- who put it there, when, whether they were asked to stop, " +
          "and what they did.",
        sourceUrl: MUSTAPHA,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "Who put it there, and when",
            why: "Identifies the person or company that put the material on the property.",
            examples: ["Dated photos or video of snow being blown or plowed over", "Doorbell or security camera footage", "Notes of dates and times with what was seen"],
          },
          {
            name: "Asking them to stop",
            why: "Shows the neighbour knew about the problem, and when.",
            examples: ["Texts, emails or letters asking them to stop", "A written notice given to the neighbour", "Notes of conversations with dates"],
          },
        ],
      },
      {
        id: "material-caused-the-damage-sd",
        name: "The snow, leaves or material caused the damage",
        plainExplanation:
          CAUSATION +
          "This part of the checklist is about what was damaged -- plants, a fence, the lawn, a car " +
          "or a building -- and how the material put there caused it.",
        sourceUrl: CLEMENTS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Photos of the damage",
            why: "Shows what the material did to the property.",
            examples: ["Dated photos of crushed shrubs or fence", "Photos of water pooling from melting piles", "Before and after photos"],
          },
          {
            name: "Opinions about the damage",
            why: "Describes the damage and what caused it.",
            examples: ["Landscaper's or arborist's report", "Contractor's repair assessment", "Insurance adjuster's report"],
          },
        ],
      },
      {
        id: "amount-sd",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost of clearing the material away and repairing " +
          "what it damaged, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Clean-up and repair costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Snow or yard-waste removal invoices", "Landscaper's or repair quotes", "Receipts for replaced plants or materials"],
          },
          {
            name: "Payment records",
            why: "Shows what was actually paid and when.",
            examples: ["Receipts", "Bank or credit card statements"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-sd",
        name: "The neighbour disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say permission was given, or that the snow or " +
          "leaves came from somewhere else, such as a city plow or the wind.",
        whenThisComesUp: "When the neighbour files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        id: "shared-fault-sd",
        name: "The neighbour and a snow-removal or landscaping company point at each other",
        plainExplanation: SHARED_FAULT,
        whenThisComesUp:
          "When the neighbour says a snow-removal, landscaping or property-management company put the material there, or the company says it followed the neighbour's instructions.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: VERIFIED,
        consolidationPeriod: NEGLIGENCE_ACT_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note:
          "The Trespass to Property Act also gives a provincial offence route. Under s. 4(2), where " +
          "entry on premises is not otherwise prohibited and notice is given that a particular " +
          "activity is prohibited, that activity is prohibited. Under s. 5(1), a notice may be given " +
          "orally or in writing, by signs posted so they are clearly visible from each ordinary " +
          "point of access, or by the marking system in s. 7. Under s. 2(1), a person not acting " +
          "under a right or authority conferred by law who, without the express permission of the " +
          "occupier, engages in an activity on premises when the activity is prohibited under the " +
          "Act is guilty of an offence and liable to a fine of not more than $10,000. Under s. " +
          "12(1), when a person is convicted under s. 2 and someone suffered damage caused by that " +
          "person during the offence, the court shall, on the request of the prosecutor and with " +
          "the consent of the person who suffered the damage, determine the damages and make a " +
          "judgment for them. Under s. 12(4), that judgment ends the right of the person it favours " +
          "to bring a civil action for damages arising out of the same facts; under s. 12(5), not " +
          "asking for one, or being refused one, does not affect the right to bring a civil action.",
        sourceUrl: TRESPASS_ACT,
        verifiedAt: VERIFIED,
        consolidationPeriod: TRESPASS_ACT_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "neighbour blows snow onto my driveway",
      "neighbour plows snow onto my lawn",
      "snow piled on my property by the neighbour",
      "neighbour dumps leaves in my yard",
      "neighbour throws yard waste over the fence",
      "their snow plow company pushes snow onto my side",
      "grass clippings dumped on my property",
      "neighbour keeps dumping on my land",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      MUSTAPHA_CITATION,
      RYAN_CITATION,
      CLEMENTS_CITATION,
      {
        sourceName: "Trespass to Property Act, R.S.O. 1990, c. T.21",
        officialUrl: TRESPASS_ACT,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 2(1), 4(2), 5(1), 12(1), (4), (5)",
      },
      NEGLIGENCE_ACT_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-drainage-and-grading",
    name: "Drainage and grading between properties",
    broughtBy:
      "The owner or occupant whose basement, foundation, yard or belongings were damaged by surface water sent onto their land when the neighbouring lot was regraded, built up or landscaped, or its downspouts, sump pump or drains were redirected.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "reasonable-care-with-drainage-dg",
        name: "The neighbour, or whoever did the work, did not take reasonable care with where the water goes",
        plainExplanation:
          NEGLIGENCE_TEST +
          "This part of the checklist is about what changed on the neighbouring property -- the " +
          "grade, a new patio, pool, addition or retaining wall, downspouts, a sump pump outlet -- " +
          "who made the change, and what was known about where the water would go.",
        sourceUrl: MUSTAPHA,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "What changed next door",
            why: "Shows the change in grade or drainage and when it was made.",
            examples: ["Before and after photos of the neighbouring lot", "Lot grading or survey plans", "Building or pool permit information"],
          },
          {
            name: "Where the water goes",
            why: "Shows the path the water takes onto the property.",
            examples: ["Video of water flowing over during rain", "Photos of downspouts or sump discharge aimed at the property", "Messages raising the problem with the neighbour"],
          },
        ],
      },
      {
        id: "water-caused-the-damage-dg",
        name: "The water caused the damage",
        plainExplanation:
          CAUSATION +
          "This part of the checklist is about what the water damaged, and showing that the damage " +
          "came from the change next door rather than from something else.",
        sourceUrl: CLEMENTS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Timing",
            why: "Shows the water problems started after the change next door.",
            examples: ["Dated photos of a dry basement or yard before", "Dated photos of flooding after", "Notes of each heavy rain and what happened"],
          },
          {
            name: "An expert opinion",
            why: "Describes the damage and where the water came from.",
            examples: ["Engineer's or drainage contractor's report", "Waterproofing contractor's assessment", "Insurance adjuster's report"],
          },
        ],
      },
      {
        id: "amount-dg",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost of drying out and repairing, any work to " +
          "redirect the water, replaced belongings, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Repair and drainage costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Restoration and repair invoices", "Quotes for drainage work", "Insurance deductible paid"],
          },
          {
            name: "Payment records",
            why: "Shows what was actually paid and when.",
            examples: ["Receipts", "Bank or credit card statements"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "shared-fault-dg",
        name: "The neighbour and a builder or landscaper point at each other",
        plainExplanation: SHARED_FAULT,
        whenThisComesUp:
          "When the neighbour says a builder, landscaper or pool installer did the work, or either says the person claiming contributed to the damage -- for example through their own downspouts or grading.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: VERIFIED,
        consolidationPeriod: NEGLIGENCE_ACT_CONSOLIDATION,
      },
      {
        id: "dispute-dg",
        name: "The neighbour disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say nothing changed next door, or that the " +
          "water came from rain, the street, a high water table or the claimant's own property.",
        whenThisComesUp: "When the neighbour or the company that did the work files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence", "defence-failure-to-mitigate"],
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
      "neighbour regraded their yard and now my basement floods",
      "water runs off the neighbour's lot into my yard",
      "neighbour's downspout drains onto my property",
      "neighbour's sump pump discharges onto my lawn",
      "neighbour raised their yard and water pools on my side",
      "new patio next door sends water to my foundation",
      "drainage problem between our properties",
      "lot grading next door flooding my yard",
    ],
    typicalDefendantProfile: "either",
    citations: NEGLIGENCE_CITATIONS,
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-shared-well-or-septic",
    name: "A shared well, septic or rural service",
    broughtBy:
      "A neighbour who shares a well, septic system, private road, water line or other service with another property under an agreement between them, and is owed money or suffered a loss because the other side did not do what was agreed -- for example did not pay their share of a repair.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "agreement-and-its-terms-sw",
        name: "There was an agreement about the shared service, and what it required",
        plainExplanation:
          BURDEN +
          "Ontario's page on suing someone in Small Claims Court says you can sue for money owed " +
          "under an agreement, and for damages such as breach of contract. In Sattva Capital Corp. v. " +
          "Creston Moly Corp., 2014 SCC 53, the Supreme Court of Canada said the overriding concern " +
          "in interpreting a contract is to determine the intent of the parties and the scope of " +
          "their understanding, by reading the contract as a whole, giving the words their ordinary " +
          "and grammatical meaning, consistent with the surrounding circumstances known to the " +
          "parties when the contract was made (para. 47). This checklist is for a claim based on an " +
          "agreement between the neighbours; it does not cover rights that come with the land " +
          "itself. This part of the checklist is about who agreed, what each side was to do or pay, " +
          "and where the terms are found.",
        sourceUrl: SUING,
        verifiedAt: VERIFIED,
        alsoCites: [
          { sourceUrl: SCJ_STEPS, pinpoint: "Steps in a civil case -- the trial (burden of proof)" },
          { sourceUrl: SATTVA, pinpoint: "Sattva Capital Corp. v. Creston Moly Corp., 2014 SCC 53, para. 47" },
        ],
        evidenceCategories: [
          {
            name: "The agreement",
            why: "Shows what each side agreed to do or pay.",
            examples: ["A signed well or septic sharing agreement", "Terms in a deed, purchase agreement or letter", "Emails or texts setting out the arrangement"],
          },
          {
            name: "How it has worked in practice",
            why: "Shows how the costs and upkeep were shared before.",
            examples: ["Past invoices split between the properties", "Records of earlier payments by each side", "Notes of conversations with dates"],
          },
        ],
      },
      {
        id: "not-done-and-amount-sw",
        name: "The other side did not do what was agreed, and the amount claimed",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about what the other side did not do or pay -- a share " +
          "of a repair, pumping, testing or replacement, or upkeep they agreed to do -- the cost of " +
          "it, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The cost",
            why: "Supports the dollar amount claimed.",
            examples: ["Well, pump or septic contractor invoices", "Water testing or pumping receipts", "A calculation of the other side's share"],
          },
          {
            name: "Asking for payment",
            why: "Shows the other side was asked to pay and did not.",
            examples: ["Letters, emails or texts asking for their share", "Replies refusing or ignoring the request"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-sw",
        name: "The other neighbour disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say there was no agreement, that its terms " +
          "were different, that the work was not needed, or that the amount was already paid.",
        whenThisComesUp: "When the other neighbour files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
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
      "we share a well with the neighbour",
      "neighbour won't pay their share of the well pump",
      "shared septic system repair",
      "neighbour refuses to pay for septic pumping",
      "shared private road maintenance costs",
      "our properties share a water line",
      "well sharing agreement",
      "neighbour stopped paying for the shared well",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Ontario: Suing someone in Small Claims Court",
        officialUrl: SUING,
        verifiedAt: VERIFIED,
        pinpoint: "What you can sue for",
      },
      {
        sourceName: "Sattva Capital Corp. v. Creston Moly Corp., 2014 SCC 53",
        officialUrl: SATTVA,
        verifiedAt: VERIFIED,
        pinpoint: "para. 47 (interpreting a contract)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-construction-noise-and-debris",
    name: "Construction noise and debris",
    broughtBy:
      "The owner or occupant whose car, yard, roof, windows, garden or belongings were damaged or fouled by debris, dust, paint or materials from construction or renovation on the neighbouring property, claiming against the neighbour, the builder or both. Structural damage from digging or demolition next door has its own case type.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "reasonable-care-with-debris-cd",
        name: "Whoever did or controlled the work did not take reasonable care to keep debris off the property",
        plainExplanation:
          NEGLIGENCE_TEST +
          "This part of the checklist is about who did the work -- the neighbour, a contractor, a " +
          "roofer or a demolition crew -- and what was or was not done to keep debris, dust and " +
          "materials from landing on the property.",
        sourceUrl: MUSTAPHA,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "Who did the work",
            why: "Identifies everyone who did or controlled the work.",
            examples: ["Building permit posted on site", "Contractor's truck, sign or dumpster photos", "Messages with the neighbour about the project"],
          },
          {
            name: "How the debris got there",
            why: "Shows what was happening when the debris landed.",
            examples: ["Dated photos or video of debris falling or blowing over", "Photos of missing tarps or netting", "Complaints to the neighbour, builder or city"],
          },
        ],
      },
      {
        id: "debris-caused-the-damage-cd",
        name: "The debris caused the damage",
        plainExplanation:
          CAUSATION +
          "This part of the checklist is about what was damaged or fouled, and how the debris from " +
          "the work caused it.",
        sourceUrl: CLEMENTS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Photos and video",
            why: "Records the debris and the damage as they were found.",
            examples: ["Dated photos of nails, shingles or dust on the property", "Photos of scratches, dents or paint spray on a car", "Before and after photos"],
          },
          {
            name: "Repair opinions",
            why: "Describes the damage and what it takes to fix.",
            examples: ["Auto body or detailing estimate", "Roofer's or window repair report", "Insurance adjuster's report"],
          },
        ],
      },
      {
        id: "amount-cd",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost of clean-up and repairs, and the documents " +
          "those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Clean-up and repair costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair invoices or written quotes", "Cleaning or detailing receipts", "Insurance deductible paid"],
          },
          {
            name: "Payment records",
            why: "Shows what was actually paid and when.",
            examples: ["Receipts", "Bank or credit card statements"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "shared-fault-cd",
        name: "The neighbour and the builder point at each other",
        plainExplanation: SHARED_FAULT,
        whenThisComesUp:
          "When the neighbour says the builder is responsible, the builder says a subcontractor is, or either says the person claiming contributed to the damage.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: VERIFIED,
        consolidationPeriod: NEGLIGENCE_ACT_CONSOLIDATION,
      },
      {
        id: "dispute-cd",
        name: "The neighbour or builder disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the damage was already there, or that the " +
          "debris came from somewhere other than the work.",
        whenThisComesUp: "When the neighbour or builder files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note:
          "This checklist does not cover a claim for the noise itself. Under s. 129 of the " +
          "Municipal Act, 2001, a local municipality may prohibit and regulate with respect to noise, " +
          "vibration, odour, dust and outdoor illumination, and may prohibit those matters unless a " +
          "permit is obtained from the municipality, with conditions for the permit. Under s. 425(1), " +
          "a municipality may pass by-laws providing that a person who contravenes a by-law of the " +
          "municipality passed under the Act is guilty of an offence. Noise, vibration or dust from " +
          "the work can be raised with the municipality under its by-laws.",
        sourceUrl: MUNICIPAL_ACT,
        verifiedAt: VERIFIED,
        consolidationPeriod: MUNICIPAL_ACT_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "debris from the neighbour's renovation landed on my car",
      "roofers next door dropped shingles and nails in my yard",
      "construction dust covered my car and windows",
      "paint overspray from next door on my car",
      "neighbour's contractor threw materials over the fence",
      "construction debris in my garden",
      "nails in my driveway from the build next door",
      "construction noise next door every day",
    ],
    typicalDefendantProfile: "either",
    citations: [
      ...NEGLIGENCE_CITATIONS,
      {
        sourceName: "Municipal Act, 2001, S.O. 2001, c. 25",
        officialUrl: MUNICIPAL_ACT,
        verifiedAt: VERIFIED,
        pinpoint: "s. 129 (noise, vibration, odour, dust); s. 425(1) (offences)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
