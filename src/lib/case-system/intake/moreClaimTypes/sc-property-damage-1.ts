/**
 * Case types, batch "sc-property-damage-1" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-property-damage-1.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-neighbours-tree-fell -- A neighbour's tree or branch came down
 *   sc-claim-tree-roots-damage -- Tree roots damaging foundation, pipes or driveway
 *   sc-claim-water-from-neighbouring-property -- Water or flooding from next door or upstairs
 *   sc-claim-fence-dispute -- A fence on the boundary
 *   sc-claim-retaining-wall-failure -- A retaining wall that failed
 *   sc-claim-damage-caused-by-a-dog -- Damage done by a dog
 *   sc-claim-livestock-or-animals-at-large -- Livestock or animals loose on your land
 *   sc-claim-damage-to-a-parked-vehicle -- A parked car damaged in a lot, by a valet or at a garage
 *   sc-claim-damage-by-tenant-guest-or-roommate -- Damage by a tenant's guest or a roommate
 *   sc-claim-construction-or-excavation-next-door -- Damage from building work next door
 *
 * Every legal statement below rests on text saved in this repository: the
 * vendored corpus (docs/sources/corpus/, url from manifest.json) or a decision
 * saved under docs/sources/decisions/. One planned type is NOT written:
 *   - sc-claim-tree-roots-damage: root encroachment between neighbours is
 *     usually decided as private nuisance, and nothing saved states the law of
 *     nuisance (no statute, no decision). A negligence-only checklist would
 *     present a partial rule as the whole one.
 * Notes on what was written:
 *   - The neighbour-tree, water, retaining-wall and construction types are
 *     written as negligence claims (Mustapha para. 3, Ryan para. 28, Clements
 *     para. 8), and each says so. Nuisance, the rule in Rylands v. Fletcher and
 *     the right of support of land are not saved, so they are not mentioned as
 *     law. Adding them needs a saved decision first.
 *   - Clements: McLachlin C.J. for the majority; LeBel J. (Rothstein J.
 *     concurring in the dissent) agreed with her analysis of the "but for"
 *     test (para. 55). Mustapha and Ryan are judgments of the Court.
 *   - The dog type covers attacks on domestic animals (Dog Owners' Liability
 *     Act) and other damage by a dog not permitted to run at large (Pounds Act
 *     s. 2). A person bitten by a dog is the core type sc-claim-dog-bite-animal-injury.
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
const NEGLIGENCE_ACT = "https://www.ontario.ca/laws/docs/elaws_statutes_90n01_e.doc";
const NEGLIGENCE_ACT_CONSOLIDATION = "2004-01-01";
const LINE_FENCES = "https://www.ontario.ca/laws/docs/90l17_e.doc";
const LINE_FENCES_CONSOLIDATION = "2024-06-06";
const FORESTRY = "https://www.ontario.ca/laws/docs/90f26_e.doc";
const FORESTRY_CONSOLIDATION = "2009-12-15";
const DOLA = "https://www.ontario.ca/laws/docs/90d16_e.doc";
const DOLA_CONSOLIDATION = "2024-06-06";
const POUNDS = "https://www.ontario.ca/laws/docs/90p17_e.doc";
const POUNDS_CONSOLIDATION = "2007-01-01";
const OLA = "https://www.ontario.ca/laws/docs/90o02_e.doc";
const OLA_CONSOLIDATION = "2021-01-29";
const RTA = "https://www.ontario.ca/laws/docs/06r17_e.doc";
const RTA_CONSOLIDATION = "2026-09-21";
const MUSTAPHA = "docs/sources/decisions/mustapha-v-culligan-2008-SCC-27.english.txt";
const RYAN = "docs/sources/decisions/ryan-v-victoria-city-1999-1-SCR-201.english.txt";
const CLEMENTS = "docs/sources/decisions/clements-v-clements-2012-SCC-32.english.txt";

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

export const TYPES_SC_PROPERTY_DAMAGE_1: ClaimType[] = [
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-neighbours-tree-fell",
    name: "A neighbour's tree or branch came down",
    broughtBy:
      "The owner or occupant whose house, car, fence or other property was damaged when a tree or branch from the neighbour's land came down.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "reasonable-care-with-the-tree-tf",
        name: "The neighbour did not take reasonable care with the tree",
        plainExplanation:
          NEGLIGENCE_TEST +
          "This part of the checklist is about whose tree it was, what condition it was in before " +
          "it came down, what could be seen or was known about it, and what was or was not done.",
        sourceUrl: MUSTAPHA,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "The tree's condition before it came down",
            why: "Shows what could be seen about the tree before it fell.",
            examples: ["Older photos showing dead limbs, a lean or rot", "Street-view or real estate photos", "An arborist's report"],
          },
          {
            name: "Warnings given or received",
            why: "Shows whether the neighbour was told about the tree, and when.",
            examples: ["Texts, emails or letters about the tree", "Notes of conversations with dates", "Any city or utility notice about the tree"],
          },
        ],
      },
      {
        id: "fall-caused-the-damage-tf",
        name: "The tree or branch coming down caused the damage",
        plainExplanation:
          CAUSATION +
          "This part of the checklist is about what was damaged and how the fall caused it.",
        sourceUrl: CLEMENTS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Photos and video right after",
            why: "Records where the tree or branch landed and what it hit.",
            examples: ["Dated photos of the tree on the property", "Video of the damage", "Photos of the stump or break point"],
          },
          {
            name: "Opinions about the damage",
            why: "Describes the damage and what caused it.",
            examples: ["Contractor's or roofer's inspection report", "Arborist's report on why the tree failed", "Insurance adjuster's report"],
          },
        ],
      },
      {
        id: "amount-tf",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost of removing the tree, repairing or replacing " +
          "what was damaged, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Costs of removal and repair",
            why: "Supports the dollar amount claimed.",
            examples: ["Tree removal invoice", "Repair invoices or written quotes", "Insurance deductible paid"],
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
        id: "dispute-tf",
        name: "The neighbour disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the tree was not the neighbour's, or " +
          "that nothing about the tree showed it needed attention.",
        whenThisComesUp: "When the neighbour files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        id: "boundary-tree-tf",
        name: "The tree grew on the property line",
        plainExplanation:
          "Under s. 10(2) of the Forestry Act, every tree whose trunk is growing on the boundary " +
          "between adjoining lands is the common property of the owners of the adjoining lands. " +
          "Under s. 10(3), every person who injures or destroys a tree growing on the boundary " +
          "between adjoining lands without the consent of the land owners is guilty of an offence " +
          "under that Act.",
        whenThisComesUp: "When the trunk of the tree stood on the boundary between the two properties.",
        sourceUrl: FORESTRY,
        verifiedAt: VERIFIED,
        consolidationPeriod: FORESTRY_CONSOLIDATION,
      },
      {
        id: "shared-fault-tf",
        name: "More than one person may share the fault",
        plainExplanation: SHARED_FAULT,
        whenThisComesUp:
          "When someone else also had a part in the tree's condition -- for example a tree service the neighbour hired -- or when the neighbour says the person claiming contributed to the damage.",
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
          "If a tree is thrown down, by accident or otherwise, so as to damage a line fence, s. 22(1) " +
          "of the Line Fences Act says the owner or occupant of the land on which the tree stood shall " +
          "immediately remove the tree and repair the fence. If they neglect or refuse to remove it " +
          "for 48 hours after notice in writing, the adjoining land-owner may remove it in the most " +
          "convenient and inexpensive manner, make good the fence, and keep the tree to pay for the " +
          "removal (s. 22(2)), and may recover the costs of repairing the fence in the same manner as " +
          "an owner under s. 11(3) (s. 22(3)). Under s. 22(5), all questions arising under that " +
          "section are adjusted by three fence-viewers of the municipality, and the decision of any " +
          "two of them binds the parties. Under s. 26, the Act (except s. 20) does not apply to land " +
          "in an area subject to a by-law passed under s. 98(1) of the Municipal Act, 2001 or " +
          "s. 109(1) of the City of Toronto Act, 2006.",
        sourceUrl: LINE_FENCES,
        verifiedAt: VERIFIED,
        consolidationPeriod: LINE_FENCES_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "neighbour's tree fell on my house",
      "branch fell on my car",
      "tree came down in the storm",
      "dead tree next door fell",
      "tree from next door crushed my fence",
      "neighbour's tree landed on my roof",
      "I warned them the tree was dying",
      "rotten tree fell onto my property",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      MUSTAPHA_CITATION,
      RYAN_CITATION,
      CLEMENTS_CITATION,
      NEGLIGENCE_ACT_CITATION,
      {
        sourceName: "Line Fences Act, R.S.O. 1990, c. L.17",
        officialUrl: LINE_FENCES,
        verifiedAt: VERIFIED,
        pinpoint: "s. 22 (tree thrown across a line fence); s. 26",
      },
      {
        sourceName: "Forestry Act, R.S.O. 1990, c. F.26",
        officialUrl: FORESTRY,
        verifiedAt: VERIFIED,
        pinpoint: "s. 10(2), (3) (boundary trees)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-water-from-neighbouring-property",
    name: "Water or flooding from next door or upstairs",
    broughtBy:
      "The owner or tenant whose home or belongings were damaged by water that came from a neighbouring house or from a unit above. Water between units of the same condominium has its own case type.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "reasonable-care-with-the-water-wn",
        name: "The neighbour or upstairs occupant did not take reasonable care",
        plainExplanation:
          NEGLIGENCE_TEST +
          "This part of the checklist is about where the water came from -- a pipe, a fixture, an " +
          "appliance, a drain or the way water was directed -- who was responsible for it, and what " +
          "was or was not done.",
        sourceUrl: MUSTAPHA,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "Where the water came from",
            why: "Identifies the source of the water and who controlled it.",
            examples: ["Plumber's report naming the source", "Photos of the leak or overflow", "Building staff or superintendent notes"],
          },
          {
            name: "What the other person knew",
            why: "Shows whether there were earlier leaks or warnings.",
            examples: ["Messages about earlier leaks", "Complaints to the landlord or owner", "Notes of conversations with dates"],
          },
        ],
      },
      {
        id: "water-caused-the-damage-wn",
        name: "The water caused the damage",
        plainExplanation:
          CAUSATION +
          "This part of the checklist is about what the water damaged and how it got there.",
        sourceUrl: CLEMENTS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Photos and video of the damage",
            why: "Records the water and the damage as they were found.",
            examples: ["Dated photos of stained ceilings or walls", "Video of water coming through", "Photos of damaged belongings"],
          },
          {
            name: "Repair and restoration reports",
            why: "Describes the damage and what it took to dry out and repair.",
            examples: ["Restoration company report", "Moisture readings", "Insurance adjuster's report"],
          },
        ],
      },
      {
        id: "amount-wn",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost of drying out, repairing and replacing what " +
          "was damaged, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Restoration and repair invoices", "Receipts for replaced belongings", "Insurance deductible paid"],
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
        id: "dispute-wn",
        name: "The neighbour or occupant disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the water did not come from their " +
          "property, or that they took reasonable care.",
        whenThisComesUp: "When the neighbour or occupant files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        id: "shared-fault-wn",
        name: "More than one person may share the fault",
        plainExplanation: SHARED_FAULT,
        whenThisComesUp:
          "When a plumber, a landlord, a building owner or someone else also had a part in the leak, or when the other side says the person claiming contributed to the damage.",
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
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "water leaked from the unit upstairs",
      "upstairs neighbour flooded my apartment",
      "water came through my ceiling",
      "neighbour's downspout floods my basement",
      "their washing machine overflowed",
      "burst pipe next door damaged my place",
      "water from next door ruined my things",
      "neighbour's pool drained into my yard",
    ],
    typicalDefendantProfile: "either",
    citations: NEGLIGENCE_CITATIONS,
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-fence-dispute",
    name: "A fence on the boundary",
    broughtBy:
      "A land owner who wants a fence on the boundary with a neighbour built, repaired or rebuilt and shared under the Line Fences Act, or who did fence work under a fence-viewers' award and wants the neighbour's share.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "award-or-agreement-fd",
        name: "There is a fence-viewers' award, or a fence agreement in the prescribed form",
        plainExplanation:
          "Under s. 4(1) of the Line Fences Act, an owner who wants a fence marking the boundary " +
          "with an adjoining owner's land constructed, repaired or reconstructed may, using the " +
          "prescribed form, notify the clerk of the local municipality that they want fence-viewers " +
          "to view and arbitrate what portion of the fence each owner shall construct, reconstruct or " +
          "repair and maintain and keep up. Under s. 8(1), the fence-viewers make an award, signed by " +
          "any two of them, that says either that each owner shall do and keep up a designated " +
          "one-half of the fence, or that one designated owner shall do the work and the other owner, " +
          "on being notified of the costs, shall pay that owner one-half of the costs -- unless the " +
          "fence-viewers consider either of those unjust in the circumstances, in which case they may " +
          "make the award they consider appropriate. Under s. 16, an agreement in writing in the " +
          "prescribed form between owners about a line fence may be registered and enforced as if it " +
          "were an award of fence-viewers. This part of the checklist is about the award or agreement " +
          "and what it says each owner must do or pay.",
        sourceUrl: LINE_FENCES,
        verifiedAt: VERIFIED,
        consolidationPeriod: LINE_FENCES_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The award or agreement",
            why: "Shows what each owner was ordered or agreed to do or pay.",
            examples: ["Copy of the award certified by the municipal clerk", "Registered fence agreement", "The notice sent to the clerk to start the process"],
          },
          {
            name: "Where the fence is",
            why: "Shows the fence and the boundary it marks.",
            examples: ["Survey or property plan", "Photos of the fence", "The award's description of the fence's location"],
          },
        ],
      },
      {
        id: "neighbour-did-not-obey-fd",
        name: "The neighbour did not do their part or pay their share, after notice",
        plainExplanation:
          "Under s. 11(1) of the Line Fences Act, where the award says one adjoining owner shall " +
          "do or keep up some or all of the fence and that owner fails to obey it, the other owner " +
          "may, by notice served on that owner and the occupant of their land, require them to obey " +
          "the award. If the notice is not obeyed within two weeks after it was served, the owner " +
          "enforcing the award may do or complete the work the award directs and may immediately " +
          "institute proceedings to recover the value of the work and the costs of the proceedings " +
          "from the adjoining owner (s. 11(3)). Where the award says one owner shall pay the " +
          "designated owner a portion of the costs, the designated owner serves notice of the amount " +
          "owing on the other owner and the occupant of their land, and if it is not paid within 28 " +
          "days after service is deemed made, the designated owner may institute proceedings to " +
          "recover it and the costs of the proceedings (s. 11(6)). Under s. 11(7), an owner who wants " +
          "to institute proceedings under s. 11(3) or (6) notifies the municipal clerk that they want " +
          "the three fence-viewers who made the award to come back and certify the adjoining owner's " +
          "default and the value of the work, or the portion of the costs, that the adjoining owner " +
          "should have done or paid.",
        sourceUrl: LINE_FENCES,
        verifiedAt: VERIFIED,
        consolidationPeriod: LINE_FENCES_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The notice to the neighbour",
            why: "Shows the neighbour was required to obey the award or told the amount owing.",
            examples: ["Copy of the notice", "Proof of service (mail receipt, courier record or email)"],
          },
          {
            name: "The work and its cost",
            why: "Shows the work that was done and what it cost.",
            examples: ["Fence contractor's invoice", "Receipts for materials", "Before and after photos"],
          },
          {
            name: "The fence-viewers' certificate",
            why: "Records the default and the amount the fence-viewers certified.",
            examples: ["Certificate from the fence-viewers", "Notice from the clerk that they would come back"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "appeal-of-award-fd",
        name: "The neighbour disagrees with the fence-viewers' award",
        plainExplanation:
          "Under s. 10(1) of the Line Fences Act, an owner dissatisfied with the award may appeal to " +
          "the referee by serving a notice of appeal in the prescribed form on the owner and occupant " +
          "of the adjoining land within fifteen days of receiving a copy of the award, and by filing a " +
          "copy of the notice, with an affidavit of service, and paying the prescribed fees to the " +
          "municipal clerk within that period. Under s. 10(6), the referee's decision is final, and " +
          "the award, as altered or affirmed, is dealt with in all respects as if it had not been " +
          "appealed.",
        whenThisComesUp: "When either owner does not accept what the fence-viewers decided.",
        sourceUrl: LINE_FENCES,
        verifiedAt: VERIFIED,
        consolidationPeriod: LINE_FENCES_CONSOLIDATION,
      },
      {
        id: "dispute-fd",
        name: "The neighbour disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the work was not what the award directed, " +
          "or that the amount claimed is not what is owed.",
        whenThisComesUp: "When the neighbour files a Defence (Form 9A) to a claim for their share.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under the Line Fences Act, the process starts with the municipality: under s. 4(1), the " +
          "owner may notify the clerk of the local municipality, using the prescribed form, that " +
          "they want fence-viewers to view and arbitrate. Under s. 4(3), the clerk's " +
          "notice sets an arbitration day no more than 30 days after the clerk is deemed to have " +
          "received the owner's notice and at least one week after the clerk's notice is deemed " +
          "served. Under s. 26, the Act (except s. 20) does not apply to land in an area subject to a " +
          "by-law passed under s. 98(1) of the Municipal Act, 2001 or s. 109(1) of the City of Toronto " +
          "Act, 2006, so the next step is to ask the municipal clerk whether the Act applies where " +
          "the land is.",
        sourceUrl: LINE_FENCES,
        verifiedAt: VERIFIED,
        consolidationPeriod: LINE_FENCES_CONSOLIDATION,
      },
      {
        note:
          "Under s. 12(9) of the Line Fences Act, the owner entitled to receive an amount the " +
          "fence-viewers certified may file a copy of the certificate and of the award, certified by " +
          "the municipal clerk, with the clerk of the Small Claims Court of the territorial division " +
          "where any part of the land affected by the award is, and once filed, the amount may be " +
          "levied against the adjoining owner's goods and chattels and land in the same manner as the " +
          "amount of a Small Claims Court judgment.",
        sourceUrl: LINE_FENCES,
        verifiedAt: VERIFIED,
        consolidationPeriod: LINE_FENCES_CONSOLIDATION,
      },
    ],
    signals: [
      "neighbour won't pay for half the fence",
      "boundary fence needs replacing",
      "fence between our properties is falling down",
      "fence-viewers award",
      "line fence dispute",
      "who pays for the fence on the property line",
      "neighbour refuses to fix the shared fence",
      "I paid for the whole fence",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Line Fences Act, R.S.O. 1990, c. L.17",
        officialUrl: LINE_FENCES,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 4, 8(1), 10(1), 10(6), 11, 12(9), 16, 26",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-retaining-wall-failure",
    name: "A retaining wall that failed",
    broughtBy:
      "The owner whose land, driveway, fence or building was damaged when a retaining wall failed, claiming against the neighbour who owns the wall or the contractor who built or worked on it.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "reasonable-care-with-the-wall-rw",
        name: "The owner or builder of the wall did not take reasonable care",
        plainExplanation:
          NEGLIGENCE_TEST +
          "This part of the checklist is about who owned, built or looked after the wall, its " +
          "condition before it failed, and what was or was not done about it.",
        sourceUrl: MUSTAPHA,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "The wall before it failed",
            why: "Shows its condition and any signs of trouble.",
            examples: ["Older photos showing bulging, cracks or leaning", "Messages about the wall", "Building permit or drawings, if any"],
          },
          {
            name: "Who owned or built the wall",
            why: "Identifies who was responsible for it.",
            examples: ["Survey showing where the wall is", "Contractor's invoice or contract", "Property records"],
          },
        ],
      },
      {
        id: "failure-caused-the-damage-rw",
        name: "The wall's failure caused the damage",
        plainExplanation:
          CAUSATION +
          "This part of the checklist is about what was damaged and how the wall's failure caused it.",
        sourceUrl: CLEMENTS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Photos and video after the failure",
            why: "Records the collapse and the damage as they were found.",
            examples: ["Dated photos of the collapsed wall", "Photos of the damaged driveway, fence or building", "Video"],
          },
          {
            name: "An expert opinion",
            why: "Describes why the wall failed and what it damaged.",
            examples: ["Engineer's report", "Landscaper's or contractor's assessment"],
          },
        ],
      },
      {
        id: "amount-rw",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost of repairing what was damaged, and the " +
          "documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Repair costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair invoices", "Written quotes", "Insurance deductible paid"],
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
        id: "dispute-rw",
        name: "The owner or builder disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the wall was not theirs, was built and " +
          "kept up properly, or did not cause the damage claimed.",
        whenThisComesUp: "When the neighbour or contractor files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        id: "shared-fault-rw",
        name: "More than one person may share the fault",
        plainExplanation: SHARED_FAULT,
        whenThisComesUp:
          "When a builder, an engineer, a former owner or someone else also had a part in the wall, or when the other side says the person claiming contributed to the damage (for example, by how water drained from their land).",
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
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "retaining wall collapsed",
      "neighbour's retaining wall fell into my yard",
      "retaining wall is bulging",
      "wall gave way and damaged my driveway",
      "landscaper built a retaining wall that failed",
      "soil came through when the wall broke",
    ],
    typicalDefendantProfile: "either",
    citations: NEGLIGENCE_CITATIONS,
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-damage-caused-by-a-dog",
    name: "Damage done by a dog",
    broughtBy:
      "The owner of a pet, livestock or property that someone else's dog attacked or damaged. A person who was bitten has the dog-bite case type.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "attack-on-a-domestic-animal-dg",
        name: "The dog bit or attacked a pet or other domestic animal",
        plainExplanation:
          "Under s. 2(1) of the Dog Owners' Liability Act, the owner of a dog is liable for damages " +
          "resulting from a bite or attack by the dog on another person or domestic animal. Under " +
          "s. 1(1), \"owner\" includes a person who possesses or harbours the dog and, where the owner " +
          "is a minor, the person responsible for the custody of the minor. Where there is more than " +
          "one owner, they are jointly and severally liable (s. 2(2)). Under s. 2(3), the owner's " +
          "liability does not depend on knowing the dog's propensity, or on fault or negligence by " +
          "the owner. This part of the checklist is about the attack and who owns the dog.",
        sourceUrl: DOLA,
        verifiedAt: VERIFIED,
        consolidationPeriod: DOLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Veterinary records",
            why: "Documents the animal's injuries and treatment.",
            examples: ["Vet's notes and invoices", "Photos of the injuries", "Records if the animal died"],
          },
          {
            name: "What happened and whose dog it was",
            why: "Shows the attack and who owns, keeps or harbours the dog.",
            examples: ["Witness names and accounts", "Animal control or by-law report", "Messages with the dog's owner"],
          },
        ],
      },
      {
        id: "other-damage-by-a-dog-at-large-dg",
        name: "A dog not allowed to run at large damaged property",
        plainExplanation:
          "Under s. 2 of the Pounds Act, the owner of any animal not permitted to run at large by the " +
          "by-laws of the municipality is liable for any damage done by that animal, even if the " +
          "fence around the complainant's premises was not the height those by-laws require; and the " +
          "owner or occupant of any land is responsible for any damage caused by any animal under " +
          "their charge and keeping as though it were their own. Under s. 1, the Act is in force in " +
          "every local municipality, but the municipality may by by-law vary how it applies. This " +
          "part of the checklist is about damage that was not a bite or attack -- for example digging, " +
          "chewing or trampling -- and the local by-law about dogs running at large.",
        sourceUrl: POUNDS,
        verifiedAt: VERIFIED,
        consolidationPeriod: POUNDS_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The local by-law",
            why: "Shows whether dogs are permitted to run at large where it happened.",
            examples: ["Copy of the municipality's animal control by-law", "By-law officer's report"],
          },
          {
            name: "The damage and the dog",
            why: "Shows what the dog damaged and that it was this dog.",
            examples: ["Dated photos or video", "Doorbell or security camera footage", "Witness accounts"],
          },
        ],
      },
      {
        id: "amount-dg",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the vet bills, repair or replacement costs, and the " +
          "documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Vet invoices", "Repair or replacement receipts", "Written quotes"],
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
        id: "claimant-fault-or-others-dg",
        name: "The dog owner says someone else was at fault too",
        plainExplanation:
          "Under s. 2(3) of the Dog Owners' Liability Act, the court shall reduce the damages awarded " +
          "in proportion to the degree, if any, to which the fault or negligence of the plaintiff " +
          "caused or contributed to the damages. Under s. 2(4), an owner who is liable to pay damages " +
          "under that section is entitled to recover contribution and indemnity from any other person " +
          "in proportion to the degree to which that person's fault or negligence caused or " +
          "contributed to the damages.",
        whenThisComesUp:
          "When the dog's owner says the person claiming, or someone else, caused or contributed to what happened.",
        sourceUrl: DOLA,
        verifiedAt: VERIFIED,
        consolidationPeriod: DOLA_CONSOLIDATION,
      },
      {
        id: "on-the-owners-premises-dg",
        name: "The attack happened on the dog owner's property",
        plainExplanation:
          "Under s. 3(1) of the Dog Owners' Liability Act, where damage is caused by being bitten or " +
          "attacked by a dog on the premises of the owner, the owner's liability is determined under " +
          "that Act and not under the Occupiers' Liability Act. Under s. 3(2), where a person is on " +
          "premises with the intention of committing, or in the commission of, a criminal act and is " +
          "damaged by being bitten or attacked by a dog, the owner is not liable under s. 2 unless " +
          "keeping the dog on the premises was unreasonable for the purpose of protecting persons or " +
          "property.",
        whenThisComesUp: "When the attack happened on the property where the dog is kept.",
        sourceUrl: DOLA,
        verifiedAt: VERIFIED,
        consolidationPeriod: DOLA_CONSOLIDATION,
      },
      {
        id: "dispute-dg",
        name: "The dog owner disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say it was not their dog, or that the dog did " +
          "not do the damage claimed.",
        whenThisComesUp: "When the dog's owner files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note:
          "A claim for money is separate from a provincial offence proceeding. Under s. 4(1) of the " +
          "Dog Owners' Liability Act, a proceeding may be commenced in the Ontario Court of Justice " +
          "against an owner of a dog if it is alleged that the dog has bitten or attacked a person or " +
          "domestic animal, has behaved in a manner that poses a menace to the safety of persons or " +
          "domestic animals, or that the owner did not exercise reasonable precautions to prevent " +
          "that. Under s. 4(1.2), Part IX of the Provincial Offences Act applies to that proceeding.",
        sourceUrl: DOLA,
        verifiedAt: VERIFIED,
        consolidationPeriod: DOLA_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "neighbour's dog attacked my cat",
      "a dog killed my chickens",
      "dog attacked my dog",
      "vet bills after a dog attack",
      "loose dog dug up my garden",
      "dog chewed my patio furniture",
      "neighbour's dog keeps getting into my yard",
      "off-leash dog injured my pet",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Dog Owners' Liability Act, R.S.O. 1990, c. D.16",
        officialUrl: DOLA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1(1), 2, 3, 4(1), 4(1.2)",
      },
      {
        sourceName: "Pounds Act, R.S.O. 1990, c. P.17",
        officialUrl: POUNDS,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1, 2",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-livestock-or-animals-at-large",
    name: "Livestock or animals loose on your land",
    broughtBy:
      "The owner or occupant of land whose crops, fences, garden or other property were damaged by someone else's livestock or other animals that got loose.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "animal-at-large-did-damage-la",
        name: "The animals were not allowed to run at large and did damage",
        plainExplanation:
          "Under s. 2 of the Pounds Act, the owner of any animal not permitted to run at large by the " +
          "by-laws of the municipality is liable for any damage done by that animal, even if the " +
          "fence around the complainant's premises was not the height those by-laws require; and the " +
          "owner or occupant of any land is responsible for any damage caused by any animal under " +
          "their charge and keeping as though it were their own. Under s. 1, the Act is in force in " +
          "every local municipality, but the municipality may by by-law vary how it applies. This " +
          "part of the checklist is about whose animals they were, the local by-law, and what the " +
          "animals damaged.",
        sourceUrl: POUNDS,
        verifiedAt: VERIFIED,
        consolidationPeriod: POUNDS_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Whose animals they were",
            why: "Identifies the owner, or the person who had charge and keeping of the animals.",
            examples: ["Ear tags, brands or markings", "Photos or video of the animals on the land", "Messages with the owner"],
          },
          {
            name: "The local by-law",
            why: "Shows whether these animals are permitted to run at large there.",
            examples: ["Copy of the municipality's by-law", "By-law officer's or animal control report"],
          },
        ],
      },
      {
        id: "outside-a-municipality-la",
        name: "Where the land is outside any organized municipality",
        plainExplanation:
          "Under s. 3 of the Pounds Act, no cattle, goat, horse, sheep or swine shall be allowed to " +
          "run at large in any part of a territorial district not included in an organized " +
          "municipality. Under s. 4, the owner of any of those animals running at large contrary to " +
          "s. 3 is liable in damages for all injuries committed by the animal or animals, and is also " +
          "guilty of an offence. This part of the checklist applies only where the land is in a " +
          "territorial district outside an organized municipality.",
        sourceUrl: POUNDS,
        verifiedAt: VERIFIED,
        consolidationPeriod: POUNDS_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Where the land is",
            why: "Shows the land is in a territorial district outside an organized municipality.",
            examples: ["Property tax or land registry records", "A letter or map showing the area is unorganized territory"],
          },
          {
            name: "What the animals were and what they did",
            why: "Shows the kind of animal and the injuries or damage.",
            examples: ["Dated photos or video", "Witness accounts"],
          },
        ],
      },
      {
        id: "amount-la",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the value of the crops, plants or property damaged, " +
          "the cost of repairs, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Value of what was damaged",
            why: "Supports the dollar amount claimed.",
            examples: ["Crop yield or sales records", "Receipts for plants, seed or feed", "Repair invoices or quotes"],
          },
          {
            name: "Payment records",
            why: "Shows what was actually paid and when.",
            examples: ["Receipts", "Bank statements"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-la",
        name: "The animals' owner disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the animals were not theirs, were " +
          "permitted to be where they were, or did not do the damage claimed.",
        whenThisComesUp: "When the animals' owner files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note:
          "Keeping the animals affects a claim for damages. Under s. 9(1) of the Pounds Act, if a " +
          "horse, bull, ox, cow, sheep, goat, pig or other cattle is distrained by a resident of the " +
          "municipality for straying in the resident's premises, the resident may keep the animal " +
          "instead of delivering it to the poundkeeper, if the resident makes no claim for damages " +
          "done by the animal and gives the required notices: notice in writing to the owner " +
          "forthwith if the owner is known (s. 9(2)), or, if the owner is unknown, notice in writing " +
          "to the municipal clerk within forty-eight hours describing the animal (s. 9(3)). Under " +
          "s. 8(1), a person who impounds an animal delivers to the poundkeeper, within twenty-four " +
          "hours, written statements of their demands against the owner for damages, if any, not " +
          "exceeding $20, done by the animal.",
        sourceUrl: POUNDS,
        verifiedAt: VERIFIED,
        consolidationPeriod: POUNDS_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "neighbour's cows got into my field",
      "horses broke through and trampled my garden",
      "goats ate my crops",
      "loose livestock damaged my property",
      "pigs got out and tore up my lawn",
      "farm animals keep wandering onto my land",
      "sheep got through the fence",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Pounds Act, R.S.O. 1990, c. P.17",
        officialUrl: POUNDS,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1, 2, 3, 4, 8(1), 9",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-damage-to-a-parked-vehicle",
    name: "A parked car damaged in a lot, by a valet or at a garage",
    broughtBy:
      "The owner of a vehicle that was damaged while parked in a lot or garage, or while a valet or other business had it.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "occupier-duty-pv",
        name: "The lot or garage did not take reasonable care to keep the vehicle reasonably safe",
        plainExplanation:
          "Under s. 3(1) of the Occupiers' Liability Act, an occupier of premises owes a duty to take " +
          "such care as in all the circumstances of the case is reasonable to see that persons " +
          "entering on the premises, and the property brought on the premises by those persons, are " +
          "reasonably safe while on the premises. Under s. 3(2), that duty applies whether the danger " +
          "is caused by the condition of the premises or by an activity carried on there. Under s. 1, " +
          "an \"occupier\" includes a person in physical possession of premises, or a person who has " +
          "responsibility for and control over the condition of premises or the activities carried on " +
          "there, or control over persons allowed to enter -- and there can be more than one occupier " +
          "of the same premises. This part of the checklist is about who ran or controlled the lot or " +
          "garage, and what condition or activity there damaged the vehicle.",
        sourceUrl: OLA,
        verifiedAt: VERIFIED,
        consolidationPeriod: OLA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Who ran the lot or garage",
            why: "Identifies the occupier.",
            examples: ["Parking ticket or receipt", "Signs naming the operator", "Monthly parking agreement"],
          },
          {
            name: "The condition or activity that caused the damage",
            why: "Shows what at the lot or garage damaged the vehicle.",
            examples: ["Photos of the hazard (falling debris, a broken gate, a pothole)", "Incident report from the attendant", "Security camera footage request"],
          },
        ],
      },
      {
        id: "valet-or-business-care-pv",
        name: "A valet or business that had the vehicle did not take reasonable care",
        plainExplanation:
          NEGLIGENCE_TEST +
          "This part of the checklist is about a valet, garage or other business that had the " +
          "vehicle, and what was done with it while they had it.",
        sourceUrl: MUSTAPHA,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "Proof the business had the vehicle",
            why: "Shows when the vehicle was handed over and returned.",
            examples: ["Valet ticket or claim check", "Work order or drop-off receipt", "Texts or emails with the business"],
          },
          {
            name: "The vehicle's condition before and after",
            why: "Shows the damage was not there before it was handed over.",
            examples: ["Dated photos from before", "Photos taken on pick-up", "Dashcam footage"],
          },
        ],
      },
      {
        id: "caused-the-damage-pv",
        name: "That caused the damage to the vehicle",
        plainExplanation:
          CAUSATION +
          "This part of the checklist is about what the damage is and how it happened.",
        sourceUrl: CLEMENTS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Damage assessment",
            why: "Describes the damage and what caused it.",
            examples: ["Body shop estimate", "Insurance adjuster's report", "Photos of the damage"],
          },
          {
            name: "Witnesses",
            why: "Supports what happened and when.",
            examples: ["Names of attendants or other drivers", "Written statements"],
          },
        ],
      },
      {
        id: "amount-pv",
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
        id: "not-responsible-sign-pv",
        name: "A sign or ticket says the lot is not responsible for damage",
        plainExplanation:
          "Under s. 3(3) of the Occupiers' Liability Act, the occupier's duty applies except in so far " +
          "as the occupier is free to and does restrict, modify or exclude it. Under s. 5(3), where an " +
          "occupier is free to restrict, modify or exclude its duty or its liability, it shall take " +
          "reasonable steps to bring that restriction, modification or exclusion to the attention of " +
          "the person to whom the duty is owed. Under s. 5(1), the duty or liability shall not be " +
          "restricted or excluded by any contract to which the person owed the duty is not a party.",
        whenThisComesUp:
          "When the lot, garage or valet points to a sign, a ticket or a contract that says it is not responsible for damage.",
        sourceUrl: OLA,
        verifiedAt: VERIFIED,
        consolidationPeriod: OLA_CONSOLIDATION,
      },
      {
        id: "independent-contractor-pv",
        name: "The lot says a contractor it hired caused the damage",
        plainExplanation:
          "Under s. 6(1) of the Occupiers' Liability Act, where damage to any person or their property " +
          "is caused by the negligence of an independent contractor employed by the occupier, the " +
          "occupier is not on that account liable if, in all the circumstances, the occupier acted " +
          "reasonably in entrusting the work to the contractor, took the steps (if any) it reasonably " +
          "ought to in order to be satisfied that the contractor was competent and the work had been " +
          "properly done, and it was reasonable that the work be undertaken.",
        whenThisComesUp:
          "When the damage came from work by a contractor the lot or building hired -- for example snow clearing or repairs.",
        sourceUrl: OLA,
        verifiedAt: VERIFIED,
        consolidationPeriod: OLA_CONSOLIDATION,
      },
      {
        id: "dispute-pv",
        name: "The business disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the damage was already there, or did not " +
          "happen while the vehicle was in its lot or care.",
        whenThisComesUp: "When the lot, garage or valet files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-waiver-release-assumption-of-risk",
      "defence-contributory-negligence",
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
      "my car was damaged in a parking lot",
      "valet damaged my car",
      "car was scratched in the parking garage",
      "parking garage gate hit my car",
      "car got damaged while parked at the garage",
      "lot says it is not responsible for damage",
      "valet crashed my car",
      "something fell on my parked car",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Occupiers' Liability Act, R.S.O. 1990, c. O.2",
        officialUrl: OLA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1, 3, 5, 6(1)",
      },
      MUSTAPHA_CITATION,
      RYAN_CITATION,
      CLEMENTS_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-damage-by-tenant-guest-or-roommate",
    name: "Damage by a tenant's guest or a roommate",
    broughtBy:
      "A landlord whose rental unit or building was damaged by a tenant's guest or another occupant, or a person whose home or belongings were damaged by a roommate.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "tenant-responsible-for-guests-tg",
        name: "Who caused the damage, and whether the Residential Tenancies Act covers it",
        plainExplanation:
          "Under s. 34 of the Residential Tenancies Act, 2006, the tenant is responsible for the " +
          "repair of undue damage to the rental unit or residential complex caused by the wilful or " +
          "negligent conduct of the tenant, another occupant of the rental unit or a person permitted " +
          "in the residential complex by the tenant. Under s. 3(1), the Act (except Part V.1) applies " +
          "to rental units in residential complexes despite any other Act and despite any agreement " +
          "or waiver to the contrary. This part of the checklist is about who caused the damage -- " +
          "the tenant, another occupant, a guest, or a roommate -- and whether the home is a rental " +
          "unit the Act covers.",
        sourceUrl: RTA,
        verifiedAt: VERIFIED,
        consolidationPeriod: RTA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The rental arrangement",
            why: "Shows who rents from whom and who lives there.",
            examples: ["Lease or rental agreement", "Roommate agreement", "Rent receipts"],
          },
          {
            name: "Who was there when the damage happened",
            why: "Identifies the person who caused the damage and who let them in.",
            examples: ["Messages about the guest or party", "Security camera footage", "Witness accounts"],
          },
        ],
      },
      {
        id: "wilful-or-negligent-damage-tg",
        name: "The damage was caused wilfully or by not taking reasonable care",
        plainExplanation:
          NEGLIGENCE_TEST +
          "This part of the checklist is about what the guest or roommate did and how it damaged the " +
          "home or belongings.",
        sourceUrl: MUSTAPHA,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "Photos and video of the damage",
            why: "Records the damage as it was found.",
            examples: ["Dated photos", "Move-in and move-out inspection reports", "Video"],
          },
          {
            name: "What the person said about it",
            why: "Shows what happened, in their own words.",
            examples: ["Texts or emails admitting or explaining the damage", "Police or incident report, if any"],
          },
        ],
      },
      {
        id: "amount-tg",
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
            examples: ["Repair invoices", "Written quotes", "Receipts for replaced belongings"],
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
        id: "shared-with-owner-tg",
        name: "The roommate shares a kitchen or bathroom with the owner",
        plainExplanation:
          "Under s. 5(i) of the Residential Tenancies Act, 2006, the Act does not apply with respect " +
          "to living accommodation whose occupant or occupants are required to share a bathroom or " +
          "kitchen facility with the owner, the owner's spouse, child or parent or the spouse's child " +
          "or parent, where the owner, spouse, child or parent lives in the building where the living " +
          "accommodation is.",
        whenThisComesUp:
          "When the person who caused the damage lives with the owner of the home and shares a kitchen or bathroom with them.",
        sourceUrl: RTA,
        verifiedAt: VERIFIED,
        consolidationPeriod: RTA_CONSOLIDATION,
      },
      {
        id: "shared-fault-tg",
        name: "More than one person may share the fault",
        plainExplanation: SHARED_FAULT,
        whenThisComesUp:
          "When the tenant, the guest and others each had a part in the damage, or when the other side says the person claiming contributed to it.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: VERIFIED,
        consolidationPeriod: NEGLIGENCE_ACT_CONSOLIDATION,
      },
      {
        id: "dispute-tg",
        name: "The guest or roommate disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say they did not cause the damage, or that it " +
          "was already there.",
        whenThisComesUp: "When the person sued files a Defence (Form 9A).",
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
      {
        note:
          "A landlord's claim against a tenant for damage goes to the Landlord and Tenant Board. " +
          "Under s. 89(1) of the Residential Tenancies Act, 2006, a landlord may apply to the Board " +
          "for an order requiring a tenant or former tenant to pay reasonable costs of repairing (or, " +
          "where repair is not reasonable, replacing) damaged property, if while the tenant was in " +
          "possession the tenant, another occupant of the rental unit or a person the tenant " +
          "permitted in the residential complex wilfully or negligently caused undue damage to the " +
          "rental unit or the residential complex (for a former tenant, s. 89(1)(b) adds a condition " +
          "about when they ceased to be in possession). Under s. 168(2), the Board has exclusive " +
          "jurisdiction to determine all applications under the Act and all matters in which the Act " +
          "gives it jurisdiction. Under s. 207(1), the Board may, where it otherwise has " +
          "jurisdiction, order payment of up to the greater of $10,000 and the monetary jurisdiction " +
          "of the Small Claims Court; under s. 207(2), a person entitled to apply under the Act whose " +
          "claim exceeds that may commence a proceeding in any court of competent jurisdiction.",
        sourceUrl: RTA,
        verifiedAt: VERIFIED,
        consolidationPeriod: RTA_CONSOLIDATION,
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
      "tenant's guest damaged the unit",
      "my roommate broke my things",
      "roommate damaged my furniture",
      "tenant's friend caused damage at a party",
      "guest of my tenant broke the door",
      "roommate ruined my belongings",
      "visitor damaged the rental property",
      "person living with me caused damage",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Residential Tenancies Act, 2006, S.O. 2006, c. 17",
        officialUrl: RTA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 3(1), 5(i), 34, 89(1), 168(2), 207",
      },
      MUSTAPHA_CITATION,
      RYAN_CITATION,
      NEGLIGENCE_ACT_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-construction-or-excavation-next-door",
    name: "Damage from building work next door",
    broughtBy:
      "The owner whose house, foundation, driveway, fence or yard was damaged by construction, demolition or digging on the neighbouring property, claiming against the neighbour, the builder or both.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "reasonable-care-in-the-work-cn",
        name: "Whoever did or controlled the work did not take reasonable care",
        plainExplanation:
          NEGLIGENCE_TEST +
          "This part of the checklist is about who did the work -- the neighbour, a builder, an " +
          "excavation or demolition company -- and how it was done.",
        sourceUrl: MUSTAPHA,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "Who did the work",
            why: "Identifies everyone who did or controlled the work.",
            examples: ["Building permit posted on site", "Contractor's truck or sign photos", "Messages with the neighbour about the project"],
          },
          {
            name: "How the work was done",
            why: "Shows what was done when the damage happened.",
            examples: ["Dated photos or video of the excavation or demolition", "Notes of vibration, cracks appearing or debris", "Complaints to the city or the builder"],
          },
        ],
      },
      {
        id: "work-caused-the-damage-cn",
        name: "The work caused the damage",
        plainExplanation:
          CAUSATION +
          "This part of the checklist is about what was damaged and how the work next door caused it.",
        sourceUrl: CLEMENTS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Before and after records",
            why: "Shows the damage was not there before the work started.",
            examples: ["Pre-construction survey or photos", "Dated photos of new cracks or settling", "Video"],
          },
          {
            name: "An expert opinion",
            why: "Describes the damage and what caused it.",
            examples: ["Engineer's report", "Contractor's assessment", "Insurance adjuster's report"],
          },
        ],
      },
      {
        id: "amount-cn",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the cost of repairs, and the documents those figures " +
          "come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Repair costs",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair invoices", "Written quotes", "Insurance deductible paid"],
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
        id: "shared-fault-cn",
        name: "The neighbour and the builder point at each other",
        plainExplanation: SHARED_FAULT,
        whenThisComesUp:
          "When the neighbour says the builder is responsible, the builder says a subcontractor is, or either says the person claiming contributed to the damage.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: VERIFIED,
        consolidationPeriod: NEGLIGENCE_ACT_CONSOLIDATION,
      },
      {
        id: "dispute-cn",
        name: "The neighbour or builder disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the damage was already there, or was " +
          "caused by something other than the work.",
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
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "excavation next door cracked my foundation",
      "construction next door damaged my house",
      "neighbour's renovation damaged my property",
      "demolition next door cracked my walls",
      "builder damaged my driveway",
      "digging next door caused my wall to crack",
      "new house being built next door damaged my fence",
    ],
    typicalDefendantProfile: "either",
    citations: NEGLIGENCE_CITATIONS,
    reviewedAt: null,
    status: "draft",
  },
];
