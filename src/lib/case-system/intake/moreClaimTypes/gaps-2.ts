/**
 * Case types, batch "gaps-2" (small-claims): types first left out for want of saved law,
 * written once the law was saved (2026-10-07). Sources are recorded in
 * docs/sources/catalogue-verification/gaps-2.json and held by test:catalogue-verified.
 * Planned in plan.json:
 *   sc-claim-tree-roots-damage -- Tree roots damaging foundation, pipes or driveway
 *   sc-claim-noise-and-nuisance -- Noise or a persistent nuisance
 *   sc-claim-smoke-odours-or-cannabis -- Smoke, smells or cannabis drifting over
 *   sc-claim-overhanging-branches -- Overhanging branches and roots
 *   sc-claim-trespass-by-people-or-pets -- People, pets or children coming onto your land
 *   sc-claim-harassment-by-a-neighbour -- A neighbour who is harassing you
 *
 * Every legal statement below rests on text saved in this repository.
 *   - Private nuisance: Antrim Truck Centre Ltd. v. Ontario (Transportation), 2013 SCC 13
 *     (Cromwell J. for a unanimous Court), paras. 18-19, 22-24, 26, 29, 51. The two-part
 *     test (substantial, then unreasonable) is stated for private nuisance generally
 *     ("reasonableness is to be assessed in all cases where private nuisance is alleged",
 *     para. 51), although the facts concerned a public authority.
 *   - Harassment: Merrifield v. Canada (Attorney General), 2019 ONCA 205 (By the Court),
 *     paras. 1, 42, 45, 47, 53, 105. Stated only as the court held it: the trial judge
 *     erred in concluding that a tort of harassment exists in Ontario; the tort of
 *     intentional infliction of mental suffering (IIMS) is one of the remedies for conduct
 *     alleged to be harassment, and its test is set out. The entry says the case arose in a
 *     workplace. It never says whether a person has a claim.
 *
 * One planned type is NOT written:
 *   - sc-claim-trespass-by-people-or-pets: Non-Marine Underwriters v. Scalera, 2000 SCC 24,
 *     is about trespass to the person (battery); it does not state the tort of trespass to
 *     land. Writing the type as private nuisance would put Antrim's "substantial and
 *     unreasonable" threshold on facts the trespass tort governs, presenting a different
 *     rule as the one that applies. The Trespass to Property Act's offence and damages
 *     route is already a note on sc-claim-snow-or-leaves-dumped; damage by a dog is
 *     sc-claim-damage-caused-by-a-dog and animals at large sc-claim-livestock-or-animals-at-large.
 *
 * Not stated anywhere below, because nothing saved states it: a right to cut back
 * branches or roots that cross the line; an order to stop a nuisance (outside Small
 * Claims, signalled by sc-remedy-outside-jurisdiction only).
 */

import type { ClaimType } from "../claimTypes";

const VERIFIED = "2026-10-07";

const SC_GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim";
const SC_RULES = "https://www.ontario.ca/laws/docs/980258_e.doc";
const SC_RULES_CONSOLIDATION = "2025-10-14";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_CONSOLIDATION = "2024-12-04";
const FORESTRY = "https://www.ontario.ca/laws/docs/90f26_e.doc";
const FORESTRY_CONSOLIDATION = "2009-12-15";
const MUNICIPAL_ACT = "https://www.ontario.ca/laws/docs/01m25_e.doc";
const MUNICIPAL_ACT_CONSOLIDATION = "2026-06-02";
const CONDO = "https://www.ontario.ca/laws/docs/98c19_e.doc";
const CONDO_CONSOLIDATION = "2025-12-31";
const CAT_REG = "https://www.ontario.ca/laws/docs/170179_e.doc";
const TRESPASS_ACT = "https://www.ontario.ca/laws/docs/90t21_e.doc";
const TRESPASS_ACT_CONSOLIDATION = "2025-06-05";
const ANTRIM = "docs/sources/decisions/antrim-truck-centre-v-ontario-2013-SCC-13.html.txt";
const MERRIFIELD = "docs/sources/decisions/merrifield-v-canada-2019-ONCA-205.txt";

// ---- Shared wording. Each entry that uses it has its own record. ----

const NUISANCE_SUBSTANTIAL =
  "This checklist is for a claim in private nuisance. In Antrim Truck Centre Ltd. v. Ontario " +
  "(Transportation), 2013 SCC 13, the Supreme Court of Canada said that a nuisance consists of an " +
  "interference with the claimant's use or enjoyment of land that is both substantial and " +
  "unreasonable (paras. 18-19). A substantial interference with property is one that is " +
  "non-trivial: more than a slight annoyance or trifling interference (paras. 19, 22). The Court " +
  "said nuisance may take a variety of forms and may include not only actual physical damage to " +
  "land but also interference with the health, comfort or convenience of the owner or occupier " +
  "(para. 23), and that a private nuisance cannot be established where the interference is not, " +
  "at least, substantial (para. 24). ";

const COMFORT_STANDARD =
  "The Court repeated an earlier statement of the Supreme Court that actionable nuisances include " +
  "\"only those inconveniences that materially interfere with ordinary comfort as defined " +
  "according to the standards held by those of plain and sober tastes\" (para. 22). ";

const NUISANCE_UNREASONABLE =
  "In Antrim Truck Centre Ltd. v. Ontario (Transportation), 2013 SCC 13, the Supreme Court of " +
  "Canada said that once the interference is shown to be non-trivial, the question is whether it " +
  "was also unreasonable in all of the circumstances (para. 19), and that reasonableness is to be " +
  "assessed in all cases where private nuisance is alleged (para. 51). Courts weigh the gravity of " +
  "the harm against the utility of the defendant's conduct in all of the circumstances. On the " +
  "gravity of the harm, courts have considered the severity of the interference, the character of " +
  "the neighbourhood and the sensitivity of the plaintiff; the frequency and duration of an " +
  "interference may also be relevant. The Court said these factors are not a checklist (para. 26). " +
  "Where the defendant's conduct is either malicious or careless, that will be a significant " +
  "factor in the reasonableness analysis (para. 29). ";

const REASONABLE_CONDUCT =
  "In Antrim Truck Centre Ltd. v. Ontario (Transportation), 2013 SCC 13, the Supreme Court of " +
  "Canada said that where the defendant can establish that his or her conduct was reasonable, that " +
  "can be a relevant consideration, particularly in cases where a claim is brought against a public " +
  "authority, but that a finding of reasonable conduct will not necessarily preclude a finding of " +
  "liability (para. 29).";

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

const BOUNDARY_TREE =
  "Under s. 10(2) of the Forestry Act, every tree whose trunk is growing on the boundary between " +
  "adjoining lands is the common property of the owners of the adjoining lands. Under s. 10(3), " +
  "every person who injures or destroys a tree growing on the boundary between adjoining lands " +
  "without the consent of the land owners is guilty of an offence under that Act.";

const CONDO_NOTE =
  "Where this belongs if both homes are in the same condominium: under s. 117(2) of the " +
  "Condominium Act, 1998, no person shall carry on an activity, or permit one to be carried on, in " +
  "a unit, the common elements or the corporation's assets if it results in any unreasonable noise " +
  "that is a nuisance, annoyance or disruption to an individual there, or any other prescribed " +
  "nuisance, annoyance or disruption. Under s. 1.36(2), an owner or a mortgagee of a unit may apply " +
  "to the Condominium Authority Tribunal for the resolution of a prescribed dispute with the " +
  "corporation, another owner or an occupier of a unit. O. Reg. 179/17, s. 1(1) prescribes, among " +
  "others, disputes about s. 117(2) and about provisions of the declaration, by-laws or rules that " +
  "govern any other nuisance, annoyance or disruption to an individual in a unit or the common " +
  "elements. Under s. 1.42(1), the Tribunal has exclusive jurisdiction to exercise the powers " +
  "conferred on it under the Act. An application must be made within two years after the dispute " +
  "arose (s. 1.36(6)).";

const ANTRIM_CITATION = {
  sourceName: "Antrim Truck Centre Ltd. v. Ontario (Transportation), 2013 SCC 13",
  officialUrl: ANTRIM,
  verifiedAt: VERIFIED,
  pinpoint: "paras. 18-19, 22-24, 26, 29, 51 (private nuisance)",
};
const LIMITATIONS_CITATION = {
  sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
  officialUrl: LIMITATIONS,
  verifiedAt: VERIFIED,
  pinpoint: "ss. 4, 5(1), 5(2)",
};
const SC_RULES_CITATION = {
  sourceName: "Rules of the Small Claims Court, O. Reg. 258/98",
  officialUrl: SC_RULES,
  verifiedAt: VERIFIED,
  pinpoint: "rr. 9.01, 9.02",
};
const FORESTRY_CITATION = {
  sourceName: "Forestry Act, R.S.O. 1990, c. F.26",
  officialUrl: FORESTRY,
  verifiedAt: VERIFIED,
  pinpoint: "s. 10(2), (3)",
};
const MUNICIPAL_CITATION = {
  sourceName: "Municipal Act, 2001, S.O. 2001, c. 25",
  officialUrl: MUNICIPAL_ACT,
  verifiedAt: VERIFIED,
  pinpoint: "s. 128(1) (public nuisances); s. 129 (noise, vibration, odour, dust); s. 425(1) (offences)",
};
const CONDO_CITATIONS: ClaimType["citations"] = [
  {
    sourceName: "Condominium Act, 1998, S.O. 1998, c. 19",
    officialUrl: CONDO,
    verifiedAt: VERIFIED,
    pinpoint: "ss. 1.36(2), (6), 1.42(1), 117(2)",
  },
  {
    sourceName: "O. Reg. 179/17 (Condominium Authority Tribunal)",
    officialUrl: CAT_REG,
    verifiedAt: VERIFIED,
    pinpoint: "s. 1(1)(c.1), (d)(iii.2)",
  },
];

export const TYPES_GAPS_2: ClaimType[] = [
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-tree-roots-damage",
    name: "Tree roots damaging foundation, pipes or driveway",
    broughtBy:
      "The owner or occupant whose foundation, sewer or water pipes, driveway, patio, walkway or other part of their property was damaged by the roots of a tree growing on a neighbour's land.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "substantial-interference-tr",
        name: "The roots substantially interfered with the use or enjoyment of the property",
        plainExplanation:
          NUISANCE_SUBSTANTIAL +
          "This part of the checklist is about which tree the roots come from, where it stands, " +
          "what the roots reached -- a foundation, pipes, a driveway -- and what damage they did.",
        sourceUrl: ANTRIM,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Where the tree is and where the roots went",
            why: "Shows the roots come from the neighbour's tree and reached the property.",
            examples: ["Survey or site plan showing the tree and the property line", "Photos of the tree and the roots", "Plumber's camera inspection video of roots in the pipe"],
          },
          {
            name: "What the roots damaged",
            why: "Shows the interference is more than a slight annoyance.",
            examples: ["Dated photos of cracks, heaving or blockages", "Arborist's report", "Engineer's or foundation contractor's report"],
          },
        ],
      },
      {
        id: "unreasonable-interference-tr",
        name: "The interference was unreasonable in all of the circumstances",
        plainExplanation:
          NUISANCE_UNREASONABLE +
          "This part of the checklist is about how serious and how long-lasting the damage is, " +
          "when the neighbour was told about the roots, and what was done after that.",
        sourceUrl: ANTRIM,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "How serious and how long",
            why: "Goes to the severity, frequency and duration of the interference.",
            examples: ["Repeated plumbing calls for root blockages", "Photos over time showing the damage growing", "Notes of dates when problems happened"],
          },
          {
            name: "Telling the neighbour",
            why: "Shows when the neighbour knew about the roots and what they did.",
            examples: ["Letters, texts or emails about the roots", "Replies from the neighbour", "Notes of conversations with dates"],
          },
        ],
      },
      {
        id: "amount-tr",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost of repairing the foundation, pipes or " +
          "driveway, removing the roots, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Repair costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Plumbing, foundation or paving invoices", "Quotes for repair or root barriers", "Insurance deductible paid"],
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
        id: "dispute-tr",
        name: "The neighbour disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the roots came from a different tree, or " +
          "that the damage came from age, settling, frost or the pipe's own condition.",
        whenThisComesUp: "When the neighbour files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        id: "reasonable-conduct-tr",
        name: "The neighbour says they acted reasonably",
        plainExplanation: REASONABLE_CONDUCT,
        whenThisComesUp: "When the neighbour says they looked after the tree properly or did not know about the roots.",
        sourceUrl: ANTRIM,
        verifiedAt: VERIFIED,
      },
      {
        id: "boundary-tree-tr",
        name: "The tree grows on the property line",
        plainExplanation: BOUNDARY_TREE,
        whenThisComesUp: "When the trunk of the tree stands on the boundary between the two properties.",
        sourceUrl: FORESTRY,
        verifiedAt: VERIFIED,
        consolidationPeriod: FORESTRY_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs", "sc-remedy-outside-jurisdiction"],
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
      "neighbour's tree roots cracked my foundation",
      "tree roots in my sewer pipe",
      "roots from next door blocked my drain",
      "neighbour's tree roots lifted my driveway",
      "roots broke my water line",
      "tree roots heaving my patio",
      "plumber found roots from the neighbour's tree",
      "foundation damage from a tree next door",
    ],
    typicalDefendantProfile: "individual",
    citations: [ANTRIM_CITATION, FORESTRY_CITATION, SC_RULES_CITATION, LIMITATIONS_CITATION],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-noise-and-nuisance",
    name: "Noise or a persistent nuisance",
    broughtBy:
      "The owner or occupant whose use or enjoyment of their home or land is disrupted by repeated or ongoing noise, vibration, light or another disturbance coming from a neighbour's property.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "substantial-interference-nn",
        name: "The noise or disturbance substantially interfered with the use or enjoyment of the property",
        plainExplanation:
          NUISANCE_SUBSTANTIAL +
          COMFORT_STANDARD +
          "This part of the checklist is about what the noise or disturbance is, where it comes " +
          "from, how loud or intense it is, and what it stops the person from doing in their home.",
        sourceUrl: ANTRIM,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "A record of the noise",
            why: "Shows what the disturbance is and where it comes from.",
            examples: ["A log of dates, times and what was heard", "Audio or video recordings with dates", "Sound-meter app readings"],
          },
          {
            name: "Effect on the home",
            why: "Shows how it interferes with ordinary use of the home.",
            examples: ["Notes of lost sleep or rooms that cannot be used", "Statements from others in the home or visitors", "Doctor's notes, if health was affected"],
          },
        ],
      },
      {
        id: "unreasonable-interference-nn",
        name: "The interference was unreasonable in all of the circumstances",
        plainExplanation:
          NUISANCE_UNREASONABLE +
          "This part of the checklist is about how often and for how long it happens, the time of " +
          "day, the kind of neighbourhood, and what happened after the neighbour was asked to stop.",
        sourceUrl: ANTRIM,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "How often and how long",
            why: "Goes to the frequency and duration of the interference.",
            examples: ["A log kept over weeks or months", "Recordings at different times of day", "Calendar notes of each incident"],
          },
          {
            name: "Asking them to stop",
            why: "Shows the neighbour knew, and what they did after.",
            examples: ["Letters, texts or emails asking them to stop", "By-law complaint numbers and replies", "Condo or landlord complaint letters"],
          },
        ],
      },
      {
        id: "amount-nn",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the money claimed for the disturbance and any costs " +
          "it caused, such as soundproofing, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Costs caused by the noise",
            why: "Supports the dollar amount claimed.",
            examples: ["Soundproofing or window invoices", "Receipts for a hotel stay to get away from it", "Quotes for work to block the noise"],
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
        id: "dispute-nn",
        name: "The neighbour disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the noise comes from somewhere else, " +
          "happens less than described, or is ordinary household or neighbourhood activity.",
        whenThisComesUp: "When the neighbour files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        id: "reasonable-conduct-nn",
        name: "The neighbour says they acted reasonably",
        plainExplanation: REASONABLE_CONDUCT,
        whenThisComesUp: "When the neighbour says they kept within by-law hours or took steps to keep the noise down.",
        sourceUrl: ANTRIM,
        verifiedAt: VERIFIED,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs", "sc-remedy-outside-jurisdiction"],
    proceduralNotes: [
      { note: CONDO_NOTE, sourceUrl: CONDO, verifiedAt: VERIFIED, consolidationPeriod: CONDO_CONSOLIDATION, alsoCites: [{ sourceUrl: CAT_REG, pinpoint: "O. Reg. 179/17, s. 1(1)(c.1), (d)(iii.2)" }] },
      {
        note:
          "Municipal by-laws are a separate route. Under s. 129 of the Municipal Act, 2001, a local " +
          "municipality may prohibit and regulate with respect to noise, vibration, odour, dust and " +
          "outdoor illumination. Under s. 128(1), a local municipality may prohibit and regulate " +
          "with respect to public nuisances. Under s. 425(1), a municipality may pass by-laws " +
          "providing that a person who contravenes a by-law of the municipality passed under the " +
          "Act is guilty of an offence.",
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
      "neighbour plays loud music every night",
      "constant noise from next door",
      "neighbour's dog barks all day",
      "loud parties next door",
      "banging and stomping from the unit above",
      "neighbour's machinery runs all night",
      "vibration from the neighbour's equipment",
      "neighbour's floodlight shines into my bedroom",
      "I can't sleep because of my neighbour",
    ],
    typicalDefendantProfile: "individual",
    citations: [ANTRIM_CITATION, MUNICIPAL_CITATION, ...CONDO_CITATIONS, SC_RULES_CITATION, LIMITATIONS_CITATION],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-smoke-odours-or-cannabis",
    name: "Smoke, smells or cannabis drifting over",
    broughtBy:
      "The owner or occupant whose home or yard is repeatedly filled with smoke, cannabis smoke, fumes or smells coming from a neighbour's property or unit.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "substantial-interference-so",
        name: "The smoke or smell substantially interfered with the use or enjoyment of the property",
        plainExplanation:
          NUISANCE_SUBSTANTIAL +
          COMFORT_STANDARD +
          "This part of the checklist is about what the smoke or smell is, where it comes from, " +
          "how it gets in, and what it stops the person from doing in their home or yard.",
        sourceUrl: ANTRIM,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "A record of the smoke or smell",
            why: "Shows what it is, where it comes from and how often.",
            examples: ["A log of dates, times and what was smelled", "Photos or video of smoke crossing over", "Statements from visitors who noticed it"],
          },
          {
            name: "Effect on the home and health",
            why: "Shows how it interferes with ordinary use of the home.",
            examples: ["Notes of rooms or the yard that cannot be used", "Doctor's notes, if health was affected", "Air purifier or air-quality readings"],
          },
        ],
      },
      {
        id: "unreasonable-interference-so",
        name: "The interference was unreasonable in all of the circumstances",
        plainExplanation:
          NUISANCE_UNREASONABLE +
          "This part of the checklist is about how often and how long it happens, the kind of " +
          "building or neighbourhood, and what happened after the neighbour was asked to stop.",
        sourceUrl: ANTRIM,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "How often and how long",
            why: "Goes to the frequency and duration of the interference.",
            examples: ["A log kept over weeks or months", "Calendar notes of each incident"],
          },
          {
            name: "Asking them to stop",
            why: "Shows the neighbour knew, and what they did after.",
            examples: ["Letters, texts or emails asking them to stop", "Condo, landlord or by-law complaint letters and replies"],
          },
        ],
      },
      {
        id: "amount-so",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the money claimed for the disturbance and any costs " +
          "it caused, such as sealing or air purifiers, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Costs caused by the smoke or smell",
            why: "Supports the dollar amount claimed.",
            examples: ["Receipts for air purifiers or filters", "Invoices for sealing gaps or vents", "Cleaning or odour-removal invoices"],
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
        id: "dispute-so",
        name: "The neighbour disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the smoke or smell comes from someone " +
          "else, happens less than described, or does not reach the other property.",
        whenThisComesUp: "When the neighbour files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        id: "reasonable-conduct-so",
        name: "The neighbour says they acted reasonably",
        plainExplanation: REASONABLE_CONDUCT,
        whenThisComesUp: "When the neighbour says they smoke only in certain places or times, or took steps to keep it in.",
        sourceUrl: ANTRIM,
        verifiedAt: VERIFIED,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs", "sc-remedy-outside-jurisdiction"],
    proceduralNotes: [
      { note: CONDO_NOTE, sourceUrl: CONDO, verifiedAt: VERIFIED, consolidationPeriod: CONDO_CONSOLIDATION, alsoCites: [{ sourceUrl: CAT_REG, pinpoint: "O. Reg. 179/17, s. 1(1)(c.1), (d)(iii.2)" }] },
      {
        note:
          "Municipal by-laws are a separate route. Under s. 129 of the Municipal Act, 2001, a local " +
          "municipality may prohibit and regulate with respect to noise, vibration, odour, dust and " +
          "outdoor illumination. Under s. 425(1), a municipality may pass by-laws providing that a " +
          "person who contravenes a by-law of the municipality passed under the Act is guilty of an " +
          "offence.",
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
      "neighbour's smoke comes into my unit",
      "cannabis smell from next door",
      "neighbour smokes weed on the balcony and it comes in",
      "cigarette smoke drifting into my apartment",
      "neighbour's fire pit smoke fills my yard",
      "bad smell coming from the neighbour's property",
      "fumes from next door",
      "neighbour grows cannabis and the smell is everywhere",
    ],
    typicalDefendantProfile: "individual",
    citations: [ANTRIM_CITATION, MUNICIPAL_CITATION, ...CONDO_CITATIONS, SC_RULES_CITATION, LIMITATIONS_CITATION],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-overhanging-branches",
    name: "Overhanging branches and roots",
    broughtBy:
      "The owner or occupant whose yard, roof, gutters, garden or use of their land is affected by branches or roots of a neighbour's tree that grow across the property line.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "substantial-interference-ob",
        name: "The branches or roots substantially interfered with the use or enjoyment of the property",
        plainExplanation:
          NUISANCE_SUBSTANTIAL +
          "This part of the checklist is about which tree it is, where its trunk stands, what " +
          "crosses the line -- branches, roots, debris -- and what that does to the property or its use.",
        sourceUrl: ANTRIM,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Where the tree is and what crosses over",
            why: "Shows the branches or roots come from the neighbour's tree.",
            examples: ["Survey or site plan showing the tree and the property line", "Photos of branches over the roof or yard", "Photos of roots coming up in the lawn or garden"],
          },
          {
            name: "What it does to the property",
            why: "Shows the interference is more than a slight annoyance.",
            examples: ["Photos of damaged roofing, gutters or siding", "Photos of a garden or yard that cannot be used", "Arborist's or roofer's report"],
          },
        ],
      },
      {
        id: "unreasonable-interference-ob",
        name: "The interference was unreasonable in all of the circumstances",
        plainExplanation:
          NUISANCE_UNREASONABLE +
          "This part of the checklist is about how serious and how long-lasting the problem is, " +
          "when the neighbour was told, and what was done after that.",
        sourceUrl: ANTRIM,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "How serious and how long",
            why: "Goes to the severity and duration of the interference.",
            examples: ["Photos over several seasons", "Repeated gutter-cleaning or repair bills", "Notes of dates when problems happened"],
          },
          {
            name: "Telling the neighbour",
            why: "Shows when the neighbour knew and what they did.",
            examples: ["Letters, texts or emails about the tree", "Replies from the neighbour", "Notes of conversations with dates"],
          },
        ],
      },
      {
        id: "amount-ob",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost of repairs, clean-up or tree work caused by " +
          "the branches or roots, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Repair and clean-up costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Roof, gutter or siding repair invoices", "Arborist or tree-service invoices", "Quotes for repair work"],
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
        id: "boundary-tree-ob",
        name: "The tree grows on the property line",
        plainExplanation: BOUNDARY_TREE,
        whenThisComesUp: "When the trunk of the tree stands on the boundary, or anyone has cut or plans to cut the tree, its branches or its roots.",
        sourceUrl: FORESTRY,
        verifiedAt: VERIFIED,
        consolidationPeriod: FORESTRY_CONSOLIDATION,
      },
      {
        id: "dispute-ob",
        name: "The neighbour disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the tree is not theirs, the damage came " +
          "from something else, or the problem is minor.",
        whenThisComesUp: "When the neighbour files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        id: "reasonable-conduct-ob",
        name: "The neighbour says they acted reasonably",
        plainExplanation: REASONABLE_CONDUCT,
        whenThisComesUp: "When the neighbour says they trimmed or cared for the tree, or did not know about the problem.",
        sourceUrl: ANTRIM,
        verifiedAt: VERIFIED,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs", "sc-remedy-outside-jurisdiction"],
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
      "neighbour's tree hangs over my yard",
      "branches over my roof",
      "neighbour's tree branches damaging my roof",
      "leaves and needles from next door clog my gutters",
      "overhanging branches from the neighbour's tree",
      "neighbour won't trim their tree",
      "roots coming up in my lawn from next door",
      "tree on the property line",
    ],
    typicalDefendantProfile: "individual",
    citations: [ANTRIM_CITATION, FORESTRY_CITATION, SC_RULES_CITATION, LIMITATIONS_CITATION],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-harassment-by-a-neighbour",
    name: "A neighbour who is harassing you",
    broughtBy:
      "A person whose neighbour has repeatedly targeted them -- with threats, insults, intimidation, following, or interfering with their home -- and who is looking at what Ontario civil law recognizes for that conduct.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "flagrant-and-outrageous-conduct-hn",
        name: "The neighbour's conduct was flagrant and outrageous",
        plainExplanation:
          "In Merrifield v. Canada (Attorney General), 2019 ONCA 205, a case about harassment and " +
          "bullying by managers in the RCMP, the Court of Appeal for Ontario decided that the trial " +
          "judge erred in concluding that a tort of harassment exists in Ontario (paras. 1, 105). " +
          "The court said it did not foreclose the development of a properly conceived tort of " +
          "harassment that might apply in appropriate contexts (para. 53). It said there are legal " +
          "remedies available to redress conduct alleged to be harassment, and that the tort of " +
          "intentional infliction of mental suffering is one of them (para. 42). This checklist is " +
          "for that tort. The court said its test is met where the plaintiff establishes conduct " +
          "that is (1) flagrant and outrageous, (2) calculated to produce harm, and which (3) " +
          "results in visible and provable illness (para. 45). This part of the checklist is about " +
          "what the neighbour did, when, and how often.",
        sourceUrl: MERRIFIELD,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "A record of what happened",
            why: "Shows what the neighbour did, when, and how often.",
            examples: ["A dated log of each incident", "Doorbell or security camera footage", "Texts, emails, notes or social media posts from the neighbour"],
          },
          {
            name: "Others who saw it",
            why: "Gives an account of the conduct from someone else.",
            examples: ["Names of witnesses and what they saw", "Police occurrence numbers", "Complaints to a landlord, condo board or by-law office"],
          },
        ],
      },
      {
        id: "calculated-to-harm-hn",
        name: "The conduct was calculated to produce harm",
        plainExplanation:
          "In Merrifield v. Canada (Attorney General), 2019 ONCA 205, the Court of Appeal for " +
          "Ontario said the tort of intentional infliction of mental suffering is an intentional " +
          "tort, requiring an intention to cause the kind of harm that occurred or knowledge that " +
          "it was almost certain to occur, and that this is a purely subjective test (para. 47). " +
          "This part of the checklist is about what the neighbour said or did that shows what they " +
          "meant to do, or what they knew would happen.",
        sourceUrl: MERRIFIELD,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The neighbour's own words",
            why: "Shows what the neighbour intended or knew.",
            examples: ["Threatening or targeted messages", "Recordings of what was said", "Notes written down right after each incident"],
          },
          {
            name: "Continuing after being told",
            why: "Shows the neighbour knew the effect of the conduct.",
            examples: ["Letters or messages asking them to stop", "A notice not to come onto the property", "Notes of what happened after each request"],
          },
        ],
      },
      {
        id: "visible-and-provable-illness-hn",
        name: "The conduct caused a visible and provable illness",
        plainExplanation:
          "In Merrifield v. Canada (Attorney General), 2019 ONCA 205, the Court of Appeal for " +
          "Ontario said the tort of intentional infliction of mental suffering requires conduct that " +
          "is the proximate cause of a visible and provable illness (para. 47). This part of the " +
          "checklist is about the illness, when it began, and the medical records that describe it.",
        sourceUrl: MERRIFIELD,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Medical records",
            why: "Describes the illness and when it began.",
            examples: ["Family doctor's records or letter", "Psychologist's or psychiatrist's report", "Prescription records"],
          },
          {
            name: "Timing",
            why: "Links the start of the illness to the neighbour's conduct.",
            examples: ["Dates of the first doctor's visit compared with the incident log", "Statements from family about changes they saw"],
          },
        ],
      },
      {
        id: "amount-hn",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the money claimed, such as treatment costs and lost " +
          "income, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Treatment or counselling receipts", "Receipts for security cameras or locks", "Pay stubs showing time missed from work"],
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
        id: "dispute-hn",
        name: "The neighbour disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the incidents did not happen as " +
          "described, or that the illness has another cause.",
        whenThisComesUp: "When the neighbour files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs", "sc-remedy-outside-jurisdiction"],
    proceduralNotes: [
      { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note:
          "If the neighbour comes onto the property, the Trespass to Property Act gives a separate, " +
          "provincial offence route. Under s. 3(1), entry on premises may be prohibited by notice to " +
          "that effect. Under s. 5(1), a notice may be given orally or in writing, by signs posted " +
          "so they are clearly visible from each ordinary point of access, or by the marking system " +
          "in s. 7. Under s. 2(1), a person not acting under a right or authority conferred by law " +
          "who, without the express permission of the occupier, enters premises when entry is " +
          "prohibited under the Act, or does not leave immediately after being directed to by the " +
          "occupier or a person the occupier authorized, is guilty of an offence and liable to a " +
          "fine of not more than $10,000.",
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
      "my neighbour is harassing me",
      "neighbour keeps threatening me",
      "neighbour yells at me every time I go outside",
      "neighbour is bullying my family",
      "neighbour follows me and watches my house",
      "neighbour leaves nasty notes on my car",
      "neighbour intimidates me",
      "ongoing harassment from the people next door",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Merrifield v. Canada (Attorney General), 2019 ONCA 205",
        officialUrl: MERRIFIELD,
        verifiedAt: VERIFIED,
        pinpoint: "paras. 42, 45, 47, 53, 105",
      },
      {
        sourceName: "Trespass to Property Act, R.S.O. 1990, c. T.21",
        officialUrl: TRESPASS_ACT,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 2(1), 3(1), 5(1)",
      },
      SC_RULES_CITATION,
      LIMITATIONS_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },
];
