/**
 * Case types, batch "sc-property-damage-2" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-property-damage-2.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-vandalism-known-person -- Vandalism where you know who did it
 *   sc-claim-borrowed-item-not-returned -- Something lent and not returned, or returned broken
 *   sc-claim-landlord-disposed-of-belongings -- A landlord who got rid of your things
 *   sc-claim-towing-damage -- Damage done by a tow truck
 *   sc-claim-snow-plow-or-municipal-works-damage -- Damage by a plough or municipal works
 *   sc-claim-utility-work-damage -- Damage by utility or hydro work
 *   sc-claim-fire-or-smoke-from-next-door -- Fire or smoke spreading from next door
 *   sc-claim-drone-ball-or-sports-equipment -- Damage by a drone, ball or sports equipment
 *   sc-claim-short-term-rental-guest-damage -- Damage by a short-term rental guest
 *
 * Every legal statement below rests on text saved in this repository: the
 * vendored corpus (docs/sources/corpus/, url from manifest.json) or a decision
 * saved under docs/sources/decisions/. Notes on what was written:
 *   - Vandalism: nothing saved states the civil law of deliberate damage to
 *     another's property (trespass to goods). The entry therefore rests on the
 *     civil burden of proof (who did it, and the loss), the Parental
 *     Responsibility Act for a child, and the criminal-court routes that sit
 *     beside a civil claim (Trespass to Property Act s. 12; Criminal Code
 *     ss. 738, 741.2). It does not name a cause of action.
 *   - Borrowed item: the law of bailment is not saved. "Returned broken" is
 *     written as negligence (Mustapha, Ryan, Clements), as in batch 1's valet
 *     entry. Pecore (Rothstein J. for the majority) is cited for what it says
 *     about gratuitous transfers, and the entry says it was a joint-account case.
 *   - Landlord disposal: written from the Residential Tenancies Act ss. 41, 42,
 *     29, 31, 168, 207. Where the Act applies, the Board decides it.
 *   - Plough / municipal works: Nelson (City) v. Marchi is a judgment of the
 *     Court from British Columbia about personal injury; it is cited only for
 *     its general statements on public authorities and core policy.
 *   - The Criminal Code is on laws-lois.justice.gc.ca, which the
 *     intake-coverage check does not accept as a primary sourceUrl, so it is
 *     carried as alsoCites beside the Trespass to Property Act.
 */

import type { ClaimType } from "../claimTypes";

const VERIFIED = "2026-10-07";

const SCJ_STEPS =
  "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/";
const SC_GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim";
const SC_RULES = "https://www.ontario.ca/laws/docs/980258_e.doc";
const SC_RULES_CONSOLIDATION = "2025-10-14";
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const CJA_CONSOLIDATION = "2025-12-11";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_CONSOLIDATION = "2024-12-04";
const NEGLIGENCE_ACT = "https://www.ontario.ca/laws/docs/elaws_statutes_90n01_e.doc";
const NEGLIGENCE_ACT_CONSOLIDATION = "2004-01-01";
const PRA = "https://www.ontario.ca/laws/docs/00p04_e.doc";
const PRA_CONSOLIDATION = "2021-04-19";
const TPA = "https://www.ontario.ca/laws/docs/90t21_e.doc";
const TPA_CONSOLIDATION = "2025-06-05";
const CRIMINAL_CODE = "https://laws-lois.justice.gc.ca/eng/acts/C-46/FullText.html";
const RTA = "https://www.ontario.ca/laws/docs/06r17_e.doc";
const RTA_CONSOLIDATION = "2026-09-21";
const MUNICIPAL_ACT = "https://www.ontario.ca/laws/docs/01m25_e.doc";
const MUNICIPAL_ACT_CONSOLIDATION = "2026-06-02";
const TSSEA = "https://www.ontario.ca/laws/docs/21t26_e.doc";
const TSSEA_CONSOLIDATION = "2026-07-01";
const TOW_RIGHTS = "https://www.ontario.ca/page/know-your-rights-when-getting-tow";
const INSURANCE_ACT = "https://www.ontario.ca/laws/docs/90i08_e.doc";
const INSURANCE_ACT_CONSOLIDATION = "2026-01-01";
const MUSTAPHA = "docs/sources/decisions/mustapha-v-culligan-2008-SCC-27.english.txt";
const RYAN = "docs/sources/decisions/ryan-v-victoria-city-1999-1-SCR-201.english.txt";
const CLEMENTS = "docs/sources/decisions/clements-v-clements-2012-SCC-32.english.txt";
const NELSON = "docs/sources/decisions/nelson-city-v-marchi-2021-SCC-41.html.txt";
const PECORE = "docs/sources/decisions/pecore-v-pecore-2007-SCC-17.english.txt";
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
const PRA_CITATION = {
  sourceName: "Parental Responsibility Act, 2000, S.O. 2000, c. 4",
  officialUrl: PRA,
  verifiedAt: VERIFIED,
  pinpoint: "ss. 1, 2(1), (2), 5",
};

// Evidence lists reused by the negligence-based entries.
const PAYMENT_RECORDS = {
  name: "Payment records",
  why: "Shows what was actually paid and when.",
  examples: ["Receipts", "Bank or credit card statements"],
};

const limitationNote = {
  note: LIMITATION_NOTE,
  sourceUrl: LIMITATIONS,
  verifiedAt: VERIFIED,
  consolidationPeriod: LIMITATIONS_CONSOLIDATION,
};
const form7aNote = { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED };

export const TYPES_SC_PROPERTY_DAMAGE_2: ClaimType[] = [
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-vandalism-known-person",
    name: "Vandalism where you know who did it",
    broughtBy:
      "The owner of a car, house, fence or other property that someone deliberately damaged, who knows or can show who did it.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "who-did-it-vk",
        name: "The person sued is the one who damaged the property",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about what was damaged, that it is yours, and how you know " +
          "who did it -- what was seen, recorded, or admitted.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Who did it",
            why: "Connects the person sued to the damage.",
            examples: ["Security or doorbell camera video", "Names and statements of witnesses", "Texts or posts where the person admits it"],
          },
          {
            name: "The damage as it was found",
            why: "Records what was damaged and when.",
            examples: ["Dated photos and video", "Police occurrence number, if a report was made", "Proof you own the property, such as a receipt or ownership"],
          },
        ],
      },
      {
        id: "amount-vk",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost of repairing, cleaning or replacing what was " +
          "damaged, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Repair or replacement costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair invoices or written quotes", "Graffiti removal or cleaning invoice", "Insurance deductible paid"],
          },
          PAYMENT_RECORDS,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "child-did-it-vk",
        name: "The person who did it is under 18",
        plainExplanation:
          "Under s. 2(1) of the Parental Responsibility Act, 2000, where a child takes, damages or " +
          "destroys property, an owner or a person entitled to possession of the property may bring an " +
          "action in the Small Claims Court against a parent of the child, for loss of or damage to the " +
          "property and for economic loss that follows from it. Under s. 2(2), the parent is liable " +
          "unless the parent satisfies the court that they were exercising reasonable supervision over " +
          "the child at the time and made reasonable efforts to prevent or discourage that kind of " +
          "activity, or that the activity that caused the loss or damage was not intentional. Under " +
          "s. 1, a \"child\" is a person under 18. Under s. 5, in deciding the amount of damages the " +
          "court may take into account any amount ordered by a court as restitution or paid " +
          "voluntarily as restitution.",
        whenThisComesUp: "When the person who damaged the property is under 18 and the claim is against a parent.",
        sourceUrl: PRA,
        verifiedAt: VERIFIED,
        consolidationPeriod: PRA_CONSOLIDATION,
      },
      {
        id: "dispute-vk",
        name: "The person sued disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say they were not the person who did it, or " +
          "that the damage was already there.",
        whenThisComesUp: "When the person sued files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      form7aNote,
      {
        note:
          "A criminal or provincial offences court can also order payment for damage. Under s. 12(1) " +
          "of the Trespass to Property Act, where a person is convicted of trespass under s. 2 and " +
          "caused damage while committing the offence, the court shall, on the request of the " +
          "prosecutor and with the consent of the person who suffered the damage, determine the " +
          "damages and make a judgment for them. Under s. 12(4), that judgment ends the right to bring " +
          "a civil action for damages on the same facts; under s. 12(5), not asking for it, or its " +
          "being refused, does not affect that right. Under s. 738(1)(a) of the Criminal Code, a court " +
          "sentencing or discharging an offender may order restitution for damage to property as a " +
          "result of the offence, up to the replacement value, where the amount is readily " +
          "ascertainable; under s. 741.2, a civil remedy is not affected by reason only that a " +
          "restitution order has been made.",
        sourceUrl: TPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CRIMINAL_CODE, pinpoint: "Criminal Code, R.S.C. 1985, c. C-46, ss. 738(1)(a), 741.2" }],
      },
      limitationNote,
    ],
    signals: [
      "someone keyed my car",
      "my neighbour slashed my tires",
      "he spray painted my garage",
      "she smashed my window on purpose",
      "I have video of them damaging my property",
      "ex broke my things",
      "someone deliberately damaged my fence",
      "vandalized my car and I know who did it",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Superior Court of Justice -- Steps to a civil case",
        officialUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        pinpoint: "Burden of proof",
      },
      PRA_CITATION,
      {
        sourceName: "Trespass to Property Act, R.S.O. 1990, c. T.21",
        officialUrl: TPA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 12(1), (4), (5) (damage award on conviction)",
      },
      {
        sourceName: "Criminal Code, R.S.C. 1985, c. C-46",
        officialUrl: CRIMINAL_CODE,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 738(1)(a), 741.2 (restitution; civil remedy not affected)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-borrowed-item-not-returned",
    name: "Something lent and not returned, or returned broken",
    broughtBy:
      "The person who lent a tool, a car, equipment or another belonging to someone who has not given it back, or gave it back damaged.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "lent-and-kept-bi",
        name: "The item is yours, it was lent, and it has not come back",
        plainExplanation:
          BURDEN +
          "Under s. 23(1)(b) of the Courts of Justice Act, the Small Claims Court has jurisdiction in " +
          "any action for the recovery of possession of personal property where the value of the " +
          "property does not exceed the prescribed amount. This part of the checklist is about what " +
          "was lent, that it belongs to you, when it was lent, and the requests to give it back.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: CJA, pinpoint: "Courts of Justice Act, s. 23(1)" }],
        evidenceCategories: [
          {
            name: "Proof the item is yours",
            why: "Shows who owns the item.",
            examples: ["Purchase receipt or ownership papers", "Photos of the item with you before it was lent", "Serial number records"],
          },
          {
            name: "The loan and the requests to return it",
            why: "Shows it was lent, not given, and that it was asked for back.",
            examples: ["Texts or emails arranging the loan", "Messages asking for it back", "Notes of conversations with dates"],
          },
        ],
      },
      {
        id: "returned-damaged-bi",
        name: "If it came back broken: the borrower did not take reasonable care",
        plainExplanation:
          NEGLIGENCE_TEST +
          "This part of the checklist is about the item's condition when it was lent and when it came " +
          "back, and what was done with it in between.",
        sourceUrl: MUSTAPHA,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "Condition before and after",
            why: "Shows the damage was not there when the item was lent.",
            examples: ["Dated photos from before the loan", "Photos on return", "A repair shop's report on the cause"],
          },
          {
            name: "What the borrower said",
            why: "Shows what happened to the item, in their own words.",
            examples: ["Texts explaining or admitting the damage", "Witness accounts"],
          },
        ],
      },
      {
        id: "amount-bi",
        name: "The value claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the value of the item if it is not returned, or the " +
          "cost of repairing it if it came back broken, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Value or repair cost",
            why: "Supports the dollar amount claimed.",
            examples: ["Original receipt", "Prices for the same or a similar item", "Repair invoice or written quote"],
          },
          PAYMENT_RECORDS,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "says-it-was-a-gift-bi",
        name: "The borrower says the item was a gift",
        plainExplanation:
          "In Pecore v. Pecore, 2007 SCC 17 -- a case about money a parent put into joint bank " +
          "accounts -- the Supreme Court of Canada (Justice Rothstein for the majority) said that the " +
          "presumption of resulting trust is a rebuttable presumption of law and general rule that " +
          "applies to gratuitous transfers; that when a transfer is challenged, the presumption " +
          "allocates the legal burden of proof; and that where a transfer is made for no " +
          "consideration, the onus is placed on the transferee to demonstrate that a gift was " +
          "intended, because \"equity presumes bargains, not gifts\" (para. 24). This topic is about " +
          "the messages and circumstances that show whether the item was lent or given.",
        whenThisComesUp: "When the person who has the item says it was given to them, not lent.",
        sourceUrl: PECORE,
        verifiedAt: VERIFIED,
      },
      {
        id: "dispute-bi",
        name: "The borrower disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the item was already returned, was already " +
          "damaged when lent, or belongs to them.",
        whenThisComesUp: "When the person sued files a Defence (Form 9A).",
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
    remedies: ["sc-remedy-return-of-property", "sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      form7aNote,
      {
        note:
          "Under rule 20.05 of the Rules of the Small Claims Court, an order for the delivery of " +
          "personal property may be enforced by a writ of delivery (Form 20B), which the clerk issues " +
          "to a bailiff when the person who obtained the order asks, with an affidavit that the " +
          "property has not been delivered. If the bailiff cannot find or take the property, the person " +
          "who obtained the order can bring a motion for an order directing the bailiff to seize any " +
          "other personal property of the person the order was made against. The person who obtained " +
          "the order must pay the bailiff's storage expenses in advance and from time to time; if they " +
          "do not, the seizure is treated as abandoned.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      limitationNote,
    ],
    signals: [
      "lent my friend my tools and never got them back",
      "borrowed my lawnmower and broke it",
      "lent my car and it came back damaged",
      "returned my camera broken",
      "won't give back the ladder I lent",
      "borrowed my trailer and won't return it",
      "says what I lent them was a gift",
      "lent my laptop and it came back cracked",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: CJA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 23(1) (Small Claims Court jurisdiction)",
      },
      {
        sourceName: "Rules of the Small Claims Court, O. Reg. 258/98",
        officialUrl: SC_RULES,
        verifiedAt: VERIFIED,
        pinpoint: "r. 20.05 (writ of delivery)",
      },
      {
        sourceName: "Pecore v. Pecore, 2007 SCC 17",
        officialUrl: PECORE,
        verifiedAt: VERIFIED,
        pinpoint: "para. 24 (gratuitous transfers)",
      },
      MUSTAPHA_CITATION,
      RYAN_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-landlord-disposed-of-belongings",
    name: "A landlord who got rid of your things",
    broughtBy:
      "A tenant or former tenant whose belongings a landlord sold, kept, threw out or otherwise got rid of.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "act-covers-the-home-ld",
        name: "Whether the Residential Tenancies Act covers the home",
        plainExplanation:
          "Under s. 3(1) of the Residential Tenancies Act, 2006, the Act (except Part V.1) applies to " +
          "rental units in residential complexes despite any other Act and despite any agreement or " +
          "waiver to the contrary. Under s. 2(1), a \"rental unit\" means any living accommodation " +
          "used or intended for use as rented residential premises, and includes a room in a boarding " +
          "house, rooming house or lodging house. Section 5 lists living accommodation the Act does " +
          "not apply to. This part of the checklist is about what kind of home it was and the " +
          "rental arrangement.",
        sourceUrl: RTA,
        verifiedAt: VERIFIED,
        consolidationPeriod: RTA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The rental arrangement",
            why: "Shows who rented from whom, and what kind of home it was.",
            examples: ["Lease or rental agreement", "Rent receipts or e-transfer records", "Messages with the landlord"],
          },
          {
            name: "How the tenancy ended",
            why: "Shows whether there was a notice, an agreement, or a Board order.",
            examples: ["Notice of termination", "Agreement to end the tenancy", "Board order and the date the eviction was enforced"],
          },
        ],
      },
      {
        id: "disposal-rules-ld",
        name: "The landlord did not follow the rules for disposing of a tenant's property",
        plainExplanation:
          "Under s. 41(1) of the Residential Tenancies Act, 2006, a landlord may sell, keep or " +
          "otherwise dispose of property in a rental unit or the residential complex if the unit was " +
          "vacated under a notice of termination, an agreement to end the tenancy, s. 93(2), or a " +
          "Board order ending the tenancy or evicting the tenant. But where an eviction order is made, " +
          "the landlord shall not do so before 72 hours have passed after the order is enforced " +
          "(s. 41(2)), and shall make the property available to be retrieved at a location close to " +
          "the unit during the prescribed hours within those 72 hours (s. 41(3)). Under s. 42, where a " +
          "tenant has abandoned the unit, the landlord may dispose of property after obtaining an " +
          "order terminating the tenancy under s. 79, or after giving notice to the tenant and the " +
          "Board; unsafe or unhygienic items may be disposed of immediately, and other items once 30 " +
          "days have passed. Under ss. 41(4) and 42(8), a landlord is not liable for disposing of " +
          "property in accordance with those sections. This part of the checklist is about how and " +
          "when the belongings were disposed of.",
        sourceUrl: RTA,
        verifiedAt: VERIFIED,
        consolidationPeriod: RTA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "What happened to the belongings",
            why: "Shows when the belongings were removed and what was done with them.",
            examples: ["Messages from the landlord about the belongings", "Photos of items left at the curb or in a bin", "Witness accounts from neighbours"],
          },
          {
            name: "Dates and notices",
            why: "Compares what happened with the 72-hour and 30-day periods.",
            examples: ["The date the eviction was enforced", "Any notice of intention to dispose of property", "Messages asking to collect the belongings"],
          },
        ],
      },
      {
        id: "value-of-belongings-ld",
        name: "The cost of replacing the belongings",
        plainExplanation:
          "Under s. 41(6) of the Residential Tenancies Act, 2006, if on application by a former " +
          "tenant the Board determines that a landlord breached s. 41(2) or (3), the Board may order " +
          "the landlord to return property in the landlord's possession or control, and to pay the " +
          "reasonable costs the former tenant has incurred or will incur in repairing or, where " +
          "repairing is not reasonable, replacing property that was damaged, destroyed or disposed of " +
          "as a result, and other reasonable out-of-pocket expenses. Section 31(1)(b) gives the Board " +
          "the same kind of power on a tenant's application under paragraphs 2 to 6 of s. 29(1). This " +
          "part of the checklist is about what was lost and what it costs to replace.",
        sourceUrl: RTA,
        verifiedAt: VERIFIED,
        consolidationPeriod: RTA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "A list of what was lost",
            why: "Supports the replacement cost claimed.",
            examples: ["An itemized list with ages and conditions", "Photos of the items before", "Original receipts"],
          },
          {
            name: "Replacement and other costs",
            why: "Shows what replacing the items and related expenses cost.",
            examples: ["Prices for similar items", "Receipts for replacements bought", "Storage or moving receipts"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "agreement-on-property-ld",
        name: "The landlord and tenant agreed what would happen to the belongings",
        plainExplanation:
          "Under s. 41(5) of the Residential Tenancies Act, 2006, a landlord and a tenant may agree to " +
          "terms other than those set out in s. 41 with regard to the disposal of the tenant's " +
          "property.",
        whenThisComesUp: "When the landlord points to an agreement about what would happen to belongings left behind.",
        sourceUrl: RTA,
        verifiedAt: VERIFIED,
        consolidationPeriod: RTA_CONSOLIDATION,
      },
      {
        id: "arrears-and-sale-ld",
        name: "The landlord asked for rent arrears or sold the belongings",
        plainExplanation:
          "Under s. 42(6) of the Residential Tenancies Act, 2006, where a tenant has abandoned the " +
          "unit, the landlord may require the tenant to pay arrears of rent and any reasonable " +
          "out-of-pocket expenses for moving, storing or securing the property before allowing the " +
          "tenant to remove it. Under s. 42(7), if within six months after the notice was given or the " +
          "order was issued the tenant claims property the landlord has sold, the landlord shall pay " +
          "the tenant the amount by which the proceeds of sale exceed the landlord's reasonable " +
          "out-of-pocket expenses for moving, storing, securing or selling the property and any " +
          "arrears of rent.",
        whenThisComesUp: "When the landlord says the unit was abandoned, kept the belongings until rent was paid, or sold them.",
        sourceUrl: RTA,
        verifiedAt: VERIFIED,
        consolidationPeriod: RTA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-return-of-property", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Where the Residential Tenancies Act, 2006 applies, this is decided by the Landlord and " +
          "Tenant Board, not the Small Claims Court. Under s. 168(2), the Board has exclusive " +
          "jurisdiction to determine all applications under the Act and with respect to all matters " +
          "in which jurisdiction is conferred on it by the Act. Under s. 207(1), the Board may order " +
          "payment of up to the greater of $10,000 and the monetary jurisdiction of the Small Claims " +
          "Court; under s. 207(2), a person entitled to apply whose claim exceeds that amount may " +
          "start a proceeding in any court of competent jurisdiction.",
        sourceUrl: RTA,
        verifiedAt: VERIFIED,
        consolidationPeriod: RTA_CONSOLIDATION,
      },
      {
        note:
          "Under s. 41(6) of the Residential Tenancies Act, 2006, a former tenant may apply to the " +
          "Board about a landlord's breach of s. 41(2) or (3). Section 29(1) lists the orders a tenant " +
          "or former tenant may apply for, including that the landlord, superintendent or agent " +
          "substantially interfered with the reasonable enjoyment of the unit (para. 3), or harassed, " +
          "obstructed, coerced, threatened or interfered with the tenant during the tenancy (para. 4). " +
          "Under s. 29(2), no application under s. 29(1) may be made more than one year after the day " +
          "the conduct occurred.",
        sourceUrl: RTA,
        verifiedAt: VERIFIED,
        consolidationPeriod: RTA_CONSOLIDATION,
      },
      limitationNote,
    ],
    signals: [
      "landlord threw out my belongings",
      "landlord got rid of my stuff after I moved out",
      "landlord sold my furniture",
      "evicted and my things were thrown away",
      "landlord would not let me get my things",
      "came back and my belongings were gone",
      "landlord put my things on the curb",
      "landlord kept my things for unpaid rent",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Residential Tenancies Act, 2006, S.O. 2006, c. 17",
        officialUrl: RTA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 2(1), 3(1), 5, 29, 31(1), 41, 42, 168(2), 207",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-towing-damage",
    name: "Damage done by a tow truck",
    broughtBy: "The owner of a vehicle that was damaged while it was being towed or stored.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "tow-precautions-tw",
        name: "The tow or storage operator's duty to prevent damage",
        plainExplanation:
          "Under s. 6(2) of the Towing and Storage Safety and Enforcement Act, 2021, every towing or " +
          "vehicle storage certificate is deemed to contain the condition that the certificate holder " +
          "take all reasonable precautions to prevent loss of or from, or damage to, any motor vehicle " +
          "that is being towed, is being held in a vehicle storage yard facility or is otherwise under " +
          "the holder's control. Ontario's page on towing rights says tow drivers must take the most " +
          "direct route to the drop-off location, photographs of the vehicle if services other than a " +
          "basic tow are provided, and reasonable precautions to avoid further damage to the vehicle. " +
          "This part of the checklist is about who towed or stored the vehicle and what was done with " +
          "it.",
        sourceUrl: TSSEA,
        verifiedAt: VERIFIED,
        consolidationPeriod: TSSEA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: TOW_RIGHTS, pinpoint: "Know your rights when getting a tow -- Towing your vehicle" }],
        evidenceCategories: [
          {
            name: "Who towed or stored the vehicle",
            why: "Identifies the operator and driver.",
            examples: ["Consent-to-tow document", "Invoice", "Company name and certificate number on the truck"],
          },
          {
            name: "The vehicle's condition before the tow",
            why: "Shows the damage was not there before.",
            examples: ["Dated photos from before", "Dashcam footage", "Collision report, if the tow followed a collision"],
          },
        ],
      },
      {
        id: "tow-negligence-tw",
        name: "The tow or storage was not done with reasonable care",
        plainExplanation:
          NEGLIGENCE_TEST +
          "This part of the checklist is about how the vehicle was hooked up, moved and stored.",
        sourceUrl: MUSTAPHA,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "How the tow was done",
            why: "Shows what was done to the vehicle.",
            examples: ["Video of the hook-up or tow", "Witness statements", "The operator's photos and run sheet, if obtained"],
          },
          {
            name: "Where the vehicle was kept",
            why: "Shows the conditions while it was stored.",
            examples: ["Photos of the storage yard", "Release paperwork noting condition"],
          },
        ],
      },
      {
        id: "tow-caused-damage-tw",
        name: "The tow or storage caused the damage",
        plainExplanation:
          CAUSATION +
          "This part of the checklist is about what the damage is and how the tow or storage caused it.",
        sourceUrl: CLEMENTS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Damage assessment",
            why: "Describes the damage and what caused it.",
            examples: ["Body shop or mechanic's report", "Insurance adjuster's report", "Photos taken at pick-up"],
          },
          {
            name: "Timeline",
            why: "Shows when the damage first appeared.",
            examples: ["Times of the tow and release", "Messages with the company", "Notes made at pick-up"],
          },
        ],
      },
      {
        id: "amount-tw",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost of repairs, a rental car, the insurance " +
          "deductible, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Repair costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair invoice or estimate", "Rental car receipts", "Insurance deductible paid"],
          },
          PAYMENT_RECORDS,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "shared-fault-tw",
        name: "More than one person may share the fault",
        plainExplanation: SHARED_FAULT,
        whenThisComesUp:
          "When a storage yard, a second tow company or the earlier collision also had a part in the damage.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: VERIFIED,
        consolidationPeriod: NEGLIGENCE_ACT_CONSOLIDATION,
      },
      {
        id: "dispute-tw",
        name: "The towing company disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the damage was already there, or came from " +
          "a collision rather than the tow.",
        whenThisComesUp: "When the towing or storage company files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-set-off-or-counterclaim",
      "defence-contributory-negligence",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      form7aNote,
      {
        note:
          "Separately from a court claim, Ontario's page on towing rights says a concern or complaint " +
          "about towing or vehicle storage services, or the conduct of the driver or company, can be " +
          "filed with the Ministry of Transportation online. The Ministry can only address events that " +
          "happened on or after January 1, 2024. The page asks for supporting evidence, such as " +
          "photos, invoices, consent forms, dashcam video and collision reports. Under s. 16(1) of the " +
          "Towing and Storage Safety and Enforcement Act, 2021, no tow operator shall provide or offer " +
          "to provide towing services unless the operator is insured as required by the regulations.",
        sourceUrl: TOW_RIGHTS,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: TSSEA, pinpoint: "Towing and Storage Safety and Enforcement Act, 2021, s. 16(1)" }],
      },
      limitationNote,
    ],
    signals: [
      "tow truck damaged my car",
      "car was damaged during the tow",
      "bumper ripped off when towed",
      "towing company scratched my car",
      "car damaged at the impound lot",
      "transmission damaged by the tow",
      "car came back from the tow yard dented",
      "tow driver dragged my car",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Towing and Storage Safety and Enforcement Act, 2021, S.O. 2021, c. 26, Sched. 3",
        officialUrl: TSSEA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 6(2), 16(1)",
      },
      {
        sourceName: "Ontario.ca -- Know your rights when getting a tow",
        officialUrl: TOW_RIGHTS,
        verifiedAt: VERIFIED,
        pinpoint: "Towing your vehicle; Report a concern",
      },
      MUSTAPHA_CITATION,
      RYAN_CITATION,
      CLEMENTS_CITATION,
      NEGLIGENCE_ACT_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-snow-plow-or-municipal-works-damage",
    name: "Damage by a plough or municipal works",
    broughtBy:
      "A property or vehicle owner whose car, fence, mailbox, lawn or other property was damaged by a snow plough, road work or other work done by or for a municipality.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "public-authority-care-mw",
        name: "The municipality or its contractor did not take reasonable care",
        plainExplanation:
          NEGLIGENCE_TEST +
          "In Nelson (City) v. Marchi, 2021 SCC 41, the Supreme Court of Canada said that under " +
          "Canadian tort law there is no doubt that governments may sometimes be held liable for " +
          "damage caused by their negligence in the same way as private defendants (para. 1). This " +
          "part of the checklist is about what the plough, crew or contractor did and how it damaged " +
          "the property.",
        sourceUrl: MUSTAPHA,
        verifiedAt: VERIFIED,
        alsoCites: [
          { sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" },
          { sourceUrl: NELSON, pinpoint: "Nelson (City) v. Marchi, 2021 SCC 41, para. 1" },
        ],
        evidenceCategories: [
          {
            name: "What the plough or crew did",
            why: "Shows what happened and who did it.",
            examples: ["Doorbell or dashcam video", "Photos of plough marks or debris", "Witness statements"],
          },
          {
            name: "Who did the work",
            why: "Identifies the municipality or the contractor doing the work.",
            examples: ["Truck numbers or company names", "Signs at the work site", "Replies from the municipality"],
          },
        ],
      },
      {
        id: "highway-repair-mw",
        name: "If the road's condition caused the damage: the duty to keep it in repair",
        plainExplanation:
          "Under s. 44(1) of the Municipal Act, 2001, the municipality that has jurisdiction over a " +
          "highway or bridge shall keep it in a state of repair that is reasonable in the " +
          "circumstances, including its character and location. Under s. 44(2), a municipality that " +
          "defaults in doing so is, subject to the Negligence Act, liable for all damages any person " +
          "sustains because of the default. Under s. 44(15), a municipality is not liable for damages " +
          "under this section unless the person claiming has suffered a particular loss or damage " +
          "beyond what is suffered in common with all other persons affected by the lack of repair. " +
          "This part of the checklist is about the condition of the road and how it caused the damage.",
        sourceUrl: MUNICIPAL_ACT,
        verifiedAt: VERIFIED,
        consolidationPeriod: MUNICIPAL_ACT_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The road's condition",
            why: "Records the condition that caused the damage.",
            examples: ["Dated photos of the pothole, ridge or hazard", "Measurements", "Earlier complaints about the spot (311 records)"],
          },
          {
            name: "Where and when",
            why: "Places the damage on a road the municipality is responsible for.",
            examples: ["Exact location and time", "Map or street-view image", "Tow or repair records from that day"],
          },
        ],
      },
      {
        id: "caused-damage-mw",
        name: "That caused the damage",
        plainExplanation:
          CAUSATION +
          "This part of the checklist is about what was damaged and how the work or the road's " +
          "condition caused it.",
        sourceUrl: CLEMENTS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Damage assessment",
            why: "Describes the damage and what caused it.",
            examples: ["Repair shop or contractor report", "Insurance adjuster's report", "Photos right after"],
          },
          {
            name: "Witnesses",
            why: "Supports what happened and when.",
            examples: ["Neighbours who saw the plough", "Written statements"],
          },
        ],
      },
      {
        id: "amount-mw",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost of repairing or replacing what was damaged, " +
          "and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Repair costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair invoices or written quotes", "Landscaping or fence repair invoice", "Insurance deductible paid"],
          },
          PAYMENT_RECORDS,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "core-policy-mw",
        name: "The municipality says the decision was a policy decision",
        plainExplanation:
          "In Nelson (City) v. Marchi, 2021 SCC 41, the Supreme Court of Canada said that \"core " +
          "policy\" government decisions -- \"decisions as to a course or principle of action that are " +
          "based on public policy considerations, such as economic, social and political factors\" -- " +
          "must be shielded from liability in negligence (para. 2). It said the onus is always on the " +
          "public authority to establish that it is immune from liability because a core policy " +
          "decision is at issue, and that the decision must be neither irrational nor taken in bad " +
          "faith (para. 35). That case came from British Columbia and was about a personal injury; " +
          "this topic is about which decision -- a city-wide plan, or how a crew did the work on the " +
          "day -- led to the damage.",
        whenThisComesUp: "When the municipality says it was following its snow-clearing or road policy.",
        sourceUrl: NELSON,
        verifiedAt: VERIFIED,
      },
      {
        id: "repair-defences-mw",
        name: "The municipality relies on the defences in the Municipal Act",
        plainExplanation:
          "Under s. 44(3) of the Municipal Act, 2001, a municipality is not liable for failing to keep " +
          "a highway or bridge in a reasonable state of repair if it did not know and could not " +
          "reasonably have been expected to have known about the state of repair, if it took " +
          "reasonable steps to prevent the default from arising, or if minimum standards set under " +
          "s. 44(4) applied to the highway and the alleged default and those standards were met. " +
          "Under s. 44(8), no action shall be brought against a municipality for damages caused by the " +
          "presence, absence or insufficiency of any wall, fence, rail or barrier along or on a " +
          "highway, or by any construction, obstruction or arrangement of earth, rock, tree or other " +
          "material or object adjacent to or on an untravelled portion of a highway.",
        whenThisComesUp: "When the claim is about the road's state of repair and the municipality files a Defence.",
        sourceUrl: MUNICIPAL_ACT,
        verifiedAt: VERIFIED,
        consolidationPeriod: MUNICIPAL_ACT_CONSOLIDATION,
      },
      {
        id: "shared-fault-mw",
        name: "More than one person may share the fault",
        plainExplanation: SHARED_FAULT,
        whenThisComesUp:
          "When a private contractor did the ploughing or work for the municipality, or the municipality says the person claiming contributed to the damage.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: VERIFIED,
        consolidationPeriod: NEGLIGENCE_ACT_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "For a claim under s. 44(2) of the Municipal Act, 2001 (failing to keep a highway or bridge " +
          "in reasonable repair), s. 44(10) says no action shall be brought unless, within 10 days " +
          "after the occurrence of the injury, written notice of the claim and of the injury, " +
          "including the date, time and location of the occurrence, has been served on or sent by " +
          "registered mail to the clerk of the municipality (or of each municipality, if two or more " +
          "are jointly responsible). Under s. 44(12), failure to give notice or insufficient notice " +
          "is not a bar if a judge finds there is reasonable excuse and the municipality is not " +
          "prejudiced in its defence.",
        sourceUrl: MUNICIPAL_ACT,
        verifiedAt: VERIFIED,
        consolidationPeriod: MUNICIPAL_ACT_CONSOLIDATION,
      },
      form7aNote,
      limitationNote,
    ],
    signals: [
      "snow plow hit my car",
      "city plough damaged my lawn",
      "plow knocked over my mailbox",
      "snowplow broke my fence",
      "city road work damaged my driveway",
      "pothole damaged my car",
      "municipal crew damaged my property",
      "plough threw rocks at my house",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Municipal Act, 2001, S.O. 2001, c. 25",
        officialUrl: MUNICIPAL_ACT,
        verifiedAt: VERIFIED,
        pinpoint: "s. 44(1)-(3), (8), (10), (12), (15)",
      },
      {
        sourceName: "Nelson (City) v. Marchi, 2021 SCC 41",
        officialUrl: NELSON,
        verifiedAt: VERIFIED,
        pinpoint: "paras. 1, 2, 35 (public authorities; core policy)",
      },
      MUSTAPHA_CITATION,
      RYAN_CITATION,
      CLEMENTS_CITATION,
      NEGLIGENCE_ACT_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-utility-work-damage",
    name: "Damage by utility or hydro work",
    broughtBy:
      "A property owner whose lawn, driveway, foundation, pipes, wiring or belongings were damaged by work done by a hydro, gas, water, cable or phone company, or its contractor.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "utility-care-uw",
        name: "The utility or its contractor did not take reasonable care",
        plainExplanation:
          NEGLIGENCE_TEST +
          "This part of the checklist is about what work was done, who did it, and what was or was " +
          "not done to protect the property.",
        sourceUrl: MUSTAPHA,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "Who did the work",
            why: "Identifies the utility and any contractor.",
            examples: ["Work notice or door hanger", "Truck or company names in photos", "Work order or locate request numbers"],
          },
          {
            name: "What was done",
            why: "Shows how the work was carried out.",
            examples: ["Photos or video of the work", "Witness statements", "Messages with the crew or utility"],
          },
        ],
      },
      {
        id: "work-caused-damage-uw",
        name: "The work caused the damage",
        plainExplanation:
          CAUSATION +
          "This part of the checklist is about what was damaged and how the work caused it -- for " +
          "example a cut line, a power surge, or ground disturbed by digging.",
        sourceUrl: CLEMENTS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Before and after",
            why: "Shows the damage appeared after the work.",
            examples: ["Dated photos before and after", "Records of when appliances stopped working"],
          },
          {
            name: "Expert opinion",
            why: "Describes the damage and what caused it.",
            examples: ["Electrician's or plumber's report", "Contractor's inspection report", "Insurance adjuster's report"],
          },
        ],
      },
      {
        id: "amount-uw",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost of repairing or replacing what was damaged, " +
          "and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Repair or replacement costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair invoices or written quotes", "Receipts for replaced appliances or electronics", "Insurance deductible paid"],
          },
          PAYMENT_RECORDS,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "shared-fault-uw",
        name: "More than one person may share the fault",
        plainExplanation: SHARED_FAULT,
        whenThisComesUp:
          "When a contractor did the work for the utility, or the utility says someone else -- including the person claiming -- contributed to the damage.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: VERIFIED,
        consolidationPeriod: NEGLIGENCE_ACT_CONSOLIDATION,
      },
      {
        id: "dispute-uw",
        name: "The utility disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the work did not cause the damage, or that " +
          "the damage was already there.",
        whenThisComesUp: "When the utility or its contractor files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [form7aNote, limitationNote],
    signals: [
      "hydro crew damaged my lawn",
      "gas company dug up my yard and left it",
      "power surge after hydro work fried my appliances",
      "cable installer cut my sprinkler line",
      "utility contractor cracked my driveway",
      "hydro workers damaged my fence",
      "water main work flooded my basement",
      "phone company damaged my property",
    ],
    typicalDefendantProfile: "business",
    citations: [MUSTAPHA_CITATION, RYAN_CITATION, CLEMENTS_CITATION, NEGLIGENCE_ACT_CITATION],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-fire-or-smoke-from-next-door",
    name: "Fire or smoke spreading from next door",
    broughtBy:
      "The owner or tenant whose home, belongings or car were damaged by a fire, or its smoke, that started on a neighbouring property or in another unit.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "neighbour-care-fs",
        name: "The neighbour did not take reasonable care",
        plainExplanation:
          NEGLIGENCE_TEST +
          "This part of the checklist is about where and how the fire started -- cooking, smoking, a " +
          "fire pit, an appliance, wiring -- who was responsible for it, and what was or was not done.",
        sourceUrl: MUSTAPHA,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "Where and how the fire started",
            why: "Identifies the cause and who controlled it.",
            examples: ["Fire department incident report", "Fire investigator's or insurance report", "Photos or video of the fire"],
          },
          {
            name: "Earlier warnings",
            why: "Shows what the neighbour knew before.",
            examples: ["Messages about fire pits, smoking or wiring", "Complaints to the landlord or city", "Notes of conversations with dates"],
          },
        ],
      },
      {
        id: "fire-caused-damage-fs",
        name: "The fire or smoke caused the damage",
        plainExplanation:
          CAUSATION +
          "This part of the checklist is about what the fire, smoke or water used to fight it " +
          "damaged.",
        sourceUrl: CLEMENTS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Photos and video of the damage",
            why: "Records the damage as it was found.",
            examples: ["Dated photos of scorch or smoke damage", "Video walk-through", "Photos of damaged belongings"],
          },
          {
            name: "Cleaning and restoration reports",
            why: "Describes the damage and what it took to fix.",
            examples: ["Restoration company report", "Air quality or smoke odour testing", "Insurance adjuster's report"],
          },
        ],
      },
      {
        id: "amount-fs",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost of cleaning, repairing and replacing what was " +
          "damaged, any hotel or living costs while the home could not be used, and the documents " +
          "those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Restoration and repair invoices", "Receipts for replaced belongings", "Hotel receipts and insurance deductible"],
          },
          PAYMENT_RECORDS,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "insurer-paid-fs",
        name: "An insurance company already paid for some of the loss",
        plainExplanation:
          "Part IV of the Insurance Act (Fire Insurance) applies, under s. 143(1), to insurance " +
          "against loss of or damage to property arising from the peril of fire in any contract made " +
          "in Ontario, with listed exceptions. Under s. 152(1), the insurer, upon making a payment or " +
          "assuming liability under a contract to which that Part applies, is subrogated to all " +
          "rights of recovery of the insured against any person, and may bring action in the name of " +
          "the insured to enforce them. Under s. 152(2), where the net amount recovered, after the " +
          "costs of recovery, is not enough for a complete indemnity, it is divided between the " +
          "insurer and the insured in the proportions in which they bore the loss.",
        whenThisComesUp: "When a fire insurer has paid part of the loss and the insured is claiming the rest, such as the deductible.",
        sourceUrl: INSURANCE_ACT,
        verifiedAt: VERIFIED,
        consolidationPeriod: INSURANCE_ACT_CONSOLIDATION,
      },
      {
        id: "shared-fault-fs",
        name: "More than one person may share the fault",
        plainExplanation: SHARED_FAULT,
        whenThisComesUp:
          "When a landlord, a tenant next door, a contractor or a product maker also had a part in the fire, or the neighbour says the person claiming contributed to the damage.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: VERIFIED,
        consolidationPeriod: NEGLIGENCE_ACT_CONSOLIDATION,
      },
      {
        id: "dispute-fs",
        name: "The neighbour disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the fire did not start on their side, or " +
          "started from something they did not control.",
        whenThisComesUp: "When the neighbour files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-contributory-negligence",
      "defence-failure-to-mitigate",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [form7aNote, limitationNote],
    signals: [
      "fire next door spread to my house",
      "neighbour's fire pit burned my fence",
      "smoke damage from the unit next door",
      "neighbour's barbecue set my deck on fire",
      "fire started in the apartment beside mine",
      "neighbour's garage fire damaged my car",
      "my things smell of smoke after the neighbour's fire",
      "neighbour left cooking on and caused a fire",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      MUSTAPHA_CITATION,
      RYAN_CITATION,
      CLEMENTS_CITATION,
      NEGLIGENCE_ACT_CITATION,
      {
        sourceName: "Insurance Act, R.S.O. 1990, c. I.8",
        officialUrl: INSURANCE_ACT,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 143(1), 152 (subrogation, fire insurance)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-drone-ball-or-sports-equipment",
    name: "Damage by a drone, ball or sports equipment",
    broughtBy:
      "The owner of a window, car, roof or other property damaged by a drone, a golf ball, a baseball or other sports equipment.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "player-care-ds",
        name: "The person flying or playing did not take reasonable care",
        plainExplanation:
          NEGLIGENCE_TEST +
          "This part of the checklist is about who was flying the drone or playing, where, and what " +
          "made the risk of damage something to guard against.",
        sourceUrl: MUSTAPHA,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "Who was flying or playing",
            why: "Identifies the person responsible.",
            examples: ["Video or photos", "Witness statements", "Messages where the person admits it"],
          },
          {
            name: "Earlier incidents",
            why: "Shows whether balls or drones had come over before.",
            examples: ["Photos of earlier balls or damage", "Earlier complaints to the person, club or course", "Notes with dates"],
          },
        ],
      },
      {
        id: "impact-caused-damage-ds",
        name: "The drone, ball or equipment caused the damage",
        plainExplanation:
          CAUSATION +
          "This part of the checklist is about what was hit and the damage it caused.",
        sourceUrl: CLEMENTS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The damage",
            why: "Records what was hit and how.",
            examples: ["Dated photos of the damage", "The ball or drone parts, kept", "Doorbell or security camera footage"],
          },
          {
            name: "Repair opinion",
            why: "Describes the damage and what caused it.",
            examples: ["Glass or body shop report", "Roofer's inspection report"],
          },
        ],
      },
      {
        id: "amount-ds",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost of repairing or replacing what was damaged, " +
          "and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Repair costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair invoices or written quotes", "Insurance deductible paid"],
          },
          PAYMENT_RECORDS,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "child-was-playing-ds",
        name: "A child was flying or playing",
        plainExplanation:
          "Under s. 2(1) of the Parental Responsibility Act, 2000, where a child (a person under 18, " +
          "s. 1) takes, damages or destroys property, an owner or a person entitled to possession of " +
          "the property may bring an action in the Small Claims Court against a parent of the child. " +
          "Under s. 2(2), the parent is liable unless the parent satisfies the court that they were " +
          "exercising reasonable supervision and made reasonable efforts to prevent or discourage that " +
          "kind of activity, or that the activity that caused the loss or damage was not intentional.",
        whenThisComesUp: "When the person who damaged the property is under 18 and the claim is against a parent.",
        sourceUrl: PRA,
        verifiedAt: VERIFIED,
        consolidationPeriod: PRA_CONSOLIDATION,
      },
      {
        id: "shared-fault-ds",
        name: "More than one person may share the fault",
        plainExplanation: SHARED_FAULT,
        whenThisComesUp:
          "When a club, course, league or field owner also had a part, or the other side says the person claiming contributed to the damage.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: VERIFIED,
        consolidationPeriod: NEGLIGENCE_ACT_CONSOLIDATION,
      },
      {
        id: "dispute-ds",
        name: "The person sued disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the ball or drone was not theirs, or did " +
          "not cause the damage.",
        whenThisComesUp: "When the person sued files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-contributory-negligence",
      "defence-waiver-release-assumption-of-risk",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [form7aNote, limitationNote],
    signals: [
      "golf ball broke my window",
      "drone crashed into my car",
      "baseball smashed my windshield",
      "neighbour's kids hit a ball through my window",
      "hockey puck dented my car",
      "drone hit my roof",
      "golf course balls keep hitting my house",
      "soccer ball broke my window",
    ],
    typicalDefendantProfile: "either",
    citations: [MUSTAPHA_CITATION, RYAN_CITATION, CLEMENTS_CITATION, NEGLIGENCE_ACT_CITATION, PRA_CITATION],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-short-term-rental-guest-damage",
    name: "Damage by a short-term rental guest",
    broughtBy:
      "A host or owner whose cottage, vacation home or short-term rental was damaged by a guest who booked it.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "booking-terms-sr",
        name: "What the booking terms say about damage",
        plainExplanation:
          "In Sattva Capital Corp. v. Creston Moly Corp., 2014 SCC 53 (a judgment of the Court), the " +
          "Supreme Court of Canada said the overriding concern in interpreting a contract is to " +
          "determine \"the intent of the parties and the scope of their understanding\", and that to " +
          "do so a decision-maker must read the contract as a whole, giving the words their ordinary " +
          "and grammatical meaning, consistent with the surrounding circumstances known to the " +
          "parties at the time the contract was formed (para. 47). This part of the checklist is about " +
          "the booking or rental agreement, the house rules, and what they say about damage, deposits " +
          "and guests.",
        sourceUrl: SATTVA,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The booking and its terms",
            why: "Shows what the guest agreed to.",
            examples: ["Booking confirmation", "Rental agreement or house rules", "Platform listing as it read when booked"],
          },
          {
            name: "Messages with the guest",
            why: "Shows what was said about the stay and the damage.",
            examples: ["Platform messages", "Texts or emails", "Damage report sent to the guest or platform"],
          },
        ],
      },
      {
        id: "guest-care-sr",
        name: "The guest did not take reasonable care",
        plainExplanation:
          NEGLIGENCE_TEST +
          "This part of the checklist is about what the guest or their party did and how it damaged " +
          "the property.",
        sourceUrl: MUSTAPHA,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "Condition before and after the stay",
            why: "Shows the damage happened during the stay.",
            examples: ["Dated photos from check-in and check-out", "Cleaner's report", "Check-in and check-out times"],
          },
          {
            name: "What happened during the stay",
            why: "Shows what the guest or their party did.",
            examples: ["Noise or occupancy monitor records", "Neighbour complaints", "Police or security reports"],
          },
        ],
      },
      {
        id: "guest-caused-damage-sr",
        name: "The stay caused the damage",
        plainExplanation:
          CAUSATION +
          "This part of the checklist is about what was damaged and how it happened during the stay.",
        sourceUrl: CLEMENTS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Damage assessment",
            why: "Describes the damage and what caused it.",
            examples: ["Contractor or repair report", "Photos of the damage", "Insurance adjuster's report"],
          },
          {
            name: "Witnesses",
            why: "Supports what happened and when.",
            examples: ["Cleaner or property manager", "Neighbours"],
          },
        ],
      },
      {
        id: "amount-sr",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost of repairs, cleaning and replacement, any " +
          "amount already paid by a deposit or the platform, and the documents those figures come " +
          "from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair and cleaning invoices", "Receipts for replaced items", "Record of any deposit kept or platform payment"],
          },
          PAYMENT_RECORDS,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "not-a-tenancy-sr",
        name: "Whether the Residential Tenancies Act applies to the stay",
        plainExplanation:
          "Under s. 5(a) of the Residential Tenancies Act, 2006, the Act does not apply to living " +
          "accommodation intended to be provided to the travelling or vacationing public or occupied " +
          "for a seasonal or temporary period in a hotel, motel or motor hotel, resort, lodge, tourist " +
          "camp, cottage or cabin establishment, inn, campground, trailer park, tourist home, bed and " +
          "breakfast vacation establishment or vacation home. Under s. 168(2), where the Act does " +
          "apply, the Landlord and Tenant Board has exclusive jurisdiction to determine all " +
          "applications under it.",
        whenThisComesUp: "When the stay was long, or the guest says they were a tenant rather than a vacation guest.",
        sourceUrl: RTA,
        verifiedAt: VERIFIED,
        consolidationPeriod: RTA_CONSOLIDATION,
      },
      {
        id: "shared-fault-sr",
        name: "More than one person may share the fault",
        plainExplanation: SHARED_FAULT,
        whenThisComesUp:
          "When other members of the guest's party caused the damage, or the guest says the host or a cleaner contributed to it.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: VERIFIED,
        consolidationPeriod: NEGLIGENCE_ACT_CONSOLIDATION,
      },
      {
        id: "dispute-sr",
        name: "The guest disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the damage was already there, or happened " +
          "after they left.",
        whenThisComesUp: "When the guest files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-set-off-or-counterclaim",
      "defence-contributory-negligence",
      "defence-failure-to-mitigate",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [form7aNote, limitationNote],
    signals: [
      "airbnb guest damaged my property",
      "vrbo guest trashed my cottage",
      "short-term rental guests had a party and broke things",
      "guest damaged my rental and the platform won't pay",
      "vacation rental guest caused damage",
      "guests left my cottage damaged",
      "my airbnb was damaged during a booking",
      "guest broke furniture in my rental property",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Sattva Capital Corp. v. Creston Moly Corp., 2014 SCC 53",
        officialUrl: SATTVA,
        verifiedAt: VERIFIED,
        pinpoint: "para. 47 (reading a contract)",
      },
      {
        sourceName: "Residential Tenancies Act, 2006, S.O. 2006, c. 17",
        officialUrl: RTA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 5(a), 168(2)",
      },
      MUSTAPHA_CITATION,
      RYAN_CITATION,
      CLEMENTS_CITATION,
      NEGLIGENCE_ACT_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },
];
