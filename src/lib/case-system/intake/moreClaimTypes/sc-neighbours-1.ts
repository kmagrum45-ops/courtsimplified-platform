/**
 * Case types, batch "sc-neighbours-1" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-neighbours-1.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-noise-and-nuisance -- Noise or a persistent nuisance
 *   sc-claim-smoke-odours-or-cannabis -- Smoke, smells or cannabis drifting over
 *   sc-claim-cameras-or-lights-aimed-at-you -- Cameras or lights pointed at your property
 *   sc-claim-trespass-by-people-or-pets -- People, pets or children coming onto your land
 *   sc-claim-shared-driveway-or-right-of-way -- A shared driveway or right of way
 *   sc-claim-encroachment-or-boundary -- An encroachment or a boundary in dispute
 *
 * Every legal statement below rests on text saved in this repository: the
 * vendored corpus (docs/sources/corpus/, url from manifest.json) or a decision
 * saved under docs/sources/decisions/. Five planned types are NOT written:
 *   - sc-claim-noise-and-nuisance and sc-claim-smoke-odours-or-cannabis: a
 *     money claim between neighbours for noise, smoke or smells is decided as
 *     private nuisance, and nothing saved states the law of private nuisance
 *     (Ryan v. Victoria deals only with public nuisance; Jones v. Tsige only
 *     mentions nuisance in passing). The saved routes that do exist -- s.
 *     117(2) of the Condominium Act, 1998 and the Condominium Authority
 *     Tribunal, the Landlord and Tenant Board, municipal by-laws -- are not a
 *     Small Claims checklist, and condo noise already has its own type
 *     (sc-claim-condo-water-or-noise-damage). Adding these needs a saved
 *     private-nuisance decision first.
 *   - sc-claim-trespass-by-people-or-pets, sc-claim-shared-driveway-or-right-of-way
 *     and sc-claim-encroachment-or-boundary: the money claim in each is the
 *     civil tort of trespass to land, and no accepted saved text states it.
 *     CLEO's Steps to Justice page "Someone is trespassing on my property" is
 *     vendored and does describe it, but stepstojustice.ca is not an accepted
 *     source (test:catalogue-verified and verifyIntakeCoverage both refuse
 *     it). What is saved covers only parts: the Trespass to Property Act
 *     offence and its s. 12 damage award; the Parental Responsibility Act,
 *     2000 (already sc-claim-damage-caused-by-a-child); Pounds Act s. 2
 *     (already the dog and livestock types); Real Property Limitations Act
 *     ss. 4, 31-32 and Land Titles Act s. 51 on long use; Courts of Justice
 *     Act ss. 96(3), 97 (no declarations or equitable relief in Small
 *     Claims). Boundary and long-possession claims themselves are the civil
 *     type civil-claim-adverse-possession-or-boundary. Adding these needs a
 *     saved decision stating trespass to land (and, for a blocked right of
 *     way, interference with an easement).
 * Notes on what was written:
 *   - The cameras type is written as intrusion upon seclusion (Jones v. Tsige,
 *     2012 ONCA 32, paras. 70-73, 87). Lights shining over are NOT covered:
 *     that is nuisance again. The type's broughtBy says so.
 */

import type { ClaimType } from "../claimTypes";

const VERIFIED = "2026-10-07";

const SC_GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim";
const SC_RULES = "https://www.ontario.ca/laws/docs/980258_e.doc";
const SC_RULES_CONSOLIDATION = "2025-10-14";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_CONSOLIDATION = "2024-12-04";
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const CJA_CONSOLIDATION = "2025-12-11";
const JONES = "docs/sources/decisions/jones-v-tsige-2012-ONCA-32.txt";

// ---- Shared wording. Each entry that uses it has its own record. ----

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

const SMALL_CLAIMS_POWERS_NOTE =
  "Under s. 23(1) of the Courts of Justice Act, the Small Claims Court has jurisdiction in any " +
  "action for the payment of money where the amount claimed does not exceed the prescribed " +
  "amount (exclusive of interest and costs), and in any action for the recovery of possession " +
  "of personal property where the value of the property does not exceed the prescribed amount. " +
  "Under s. 97, the Court of Appeal and the Superior Court of Justice, exclusive of the Small " +
  "Claims Court, may make binding declarations of right, whether or not any consequential " +
  "relief is or could be claimed. Under s. 96(3), only the Court of Appeal and the Superior " +
  "Court of Justice, exclusive of the Small Claims Court, may grant equitable relief, unless " +
  "otherwise provided.";

const JONES_CITATION = {
  sourceName: "Jones v. Tsige, 2012 ONCA 32",
  officialUrl: JONES,
  verifiedAt: VERIFIED,
  pinpoint: "paras. 70-72 (elements and limits of intrusion upon seclusion); para. 87 (damages)",
};
const SC_GUIDE_CITATION = {
  sourceName: "Guide to Procedures in Small Claims Court: Making a claim",
  officialUrl: SC_GUIDE,
  verifiedAt: VERIFIED,
  pinpoint: "How to fill out the claim form; types of claims dealt with in Small Claims Court",
};
const CJA_CITATION = {
  sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
  officialUrl: CJA,
  verifiedAt: VERIFIED,
  pinpoint: "ss. 23(1), 96(3), 97",
};
const LIMITATIONS_CITATION = {
  sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
  officialUrl: LIMITATIONS,
  verifiedAt: VERIFIED,
  pinpoint: "ss. 4, 5",
};

export const TYPES_SC_NEIGHBOURS_1: ClaimType[] = [
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-cameras-or-lights-aimed-at-you",
    name: "Cameras or lights pointed at your property",
    broughtBy:
      "A person whose neighbour has set up a camera that records into their home, yard or private " +
      "space, suing the neighbour for the invasion of their privacy. Lights shining onto a " +
      "property are not covered by this checklist.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "intentional-intrusion-cam",
        name: "The neighbour intruded on purpose, or recklessly",
        plainExplanation:
          "In Jones v. Tsige, 2012 ONCA 32, the Court of Appeal for Ontario adopted these elements " +
          "for the action for intrusion upon seclusion: one who intentionally intrudes, physically " +
          "or otherwise, upon the seclusion of another or their private affairs or concerns, is " +
          "subject to liability for invasion of privacy, if the invasion would be highly offensive " +
          "to a reasonable person (para. 70). The first key feature is that the defendant's " +
          "conduct must be intentional, which the Court said includes reckless (para. 71). This " +
          "part of the checklist is about where the camera points, what it records, and what the " +
          "neighbour did when asked about it.",
        sourceUrl: JONES,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Where the camera is and what it sees",
            why: "Shows what the camera is aimed at and what it can record.",
            examples: [
              "Dated photos of the camera and the direction it faces",
              "Photos taken from the camera's position, if it can be done lawfully",
              "Any footage the neighbour has shared or posted",
            ],
          },
          {
            name: "Signs it was deliberate",
            why: "The conduct must be intentional or reckless.",
            examples: [
              "Messages asking the neighbour to move the camera, and the replies",
              "Photos showing the camera was moved or re-aimed after a complaint",
              "Notes of conversations with dates",
            ],
          },
        ],
      },
      {
        id: "private-matters-cam",
        name: "Private matters were intruded on, without lawful justification",
        plainExplanation:
          "In Jones v. Tsige, 2012 ONCA 32, the Court of Appeal for Ontario said the second key " +
          "feature is that the defendant must have invaded, without lawful justification, the " +
          "plaintiff's private affairs or concerns (para. 71). It said a claim will arise only for " +
          "deliberate and significant invasions of personal privacy, and that it is only " +
          "intrusions into matters such as one's financial or health records, sexual practices and " +
          "orientation, employment, diary or private correspondence that, viewed objectively on " +
          "the reasonable person standard, can be described as highly offensive (para. 72). This " +
          "part of the checklist is about what private activity or information the camera " +
          "captured.",
        sourceUrl: JONES,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "What was captured",
            why: "Shows which private matters the recording reached.",
            examples: [
              "A description of the rooms, windows or spaces in view",
              "Footage or stills showing what was recorded",
              "Any use the neighbour made of the recordings",
            ],
          },
          {
            name: "Steps you took to keep it private",
            why: "Shows the space or activity was kept private.",
            examples: ["Photos of curtains, blinds, fences or screens", "Requests to the neighbour to stop"],
          },
        ],
      },
      {
        id: "highly-offensive-cam",
        name: "A reasonable person would regard the invasion as highly offensive",
        plainExplanation:
          "In Jones v. Tsige, 2012 ONCA 32, the Court of Appeal for Ontario said the third key " +
          "feature is that a reasonable person would regard the invasion as highly offensive " +
          "causing distress, humiliation or anguish, and that proof of harm to a recognized " +
          "economic interest is not an element (para. 71). Claims from individuals who are " +
          "sensitive or unusually concerned about their privacy are excluded (para. 72).",
        sourceUrl: JONES,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "How it affected you",
            why: "The invasion is measured by the distress, humiliation or anguish a reasonable person would feel.",
            examples: [
              "A journal of how it affected you and your household",
              "Notes from a doctor or counsellor, if you sought help",
              "Statements from people who saw the effect on you",
            ],
          },
          {
            name: "How long it went on",
            why: "Shows the extent of the intrusion over time.",
            examples: ["A dated timeline of when the camera went up and any changes", "Complaints to the city or police, with dates"],
          },
        ],
      },
      {
        id: "amount-cam",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "In Jones v. Tsige, 2012 ONCA 32, the Court of Appeal for Ontario said damages for " +
          "intrusion upon seclusion where the plaintiff has suffered no pecuniary loss should be " +
          "modest but sufficient to mark the wrong, and fixed the range at up to $20,000. It " +
          "listed factors for where in the range a case falls: the nature, incidence and occasion " +
          "of the wrongful act; its effect on the plaintiff's health, welfare, social, business or " +
          "financial position; any relationship between the parties; any distress, annoyance or " +
          "embarrassment suffered; and the conduct of the parties before and after, including any " +
          "apology or offer of amends (para. 87).",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: JONES, pinpoint: "Jones v. Tsige, 2012 ONCA 32, para. 87" }],
        evidenceCategories: [
          {
            name: "Costs you paid",
            why: "Supports any money spent because of the camera.",
            examples: ["Receipts for blinds, screens or privacy fencing", "Counselling invoices"],
          },
          {
            name: "Before and after",
            why: "Bears on the factors the Court listed, such as any apology or offer of amends.",
            examples: ["Any apology or offer from the neighbour", "Messages showing how the neighbour responded"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-cam",
        name: "The neighbour disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the camera does not record the " +
          "person's private space, or that it was not set up on purpose to do so.",
        whenThisComesUp: "When the neighbour files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        id: "justification-cam",
        name: "The neighbour says the camera is there for their own security",
        plainExplanation:
          "In Jones v. Tsige, 2012 ONCA 32, the Court of Appeal for Ontario said the invasion must " +
          "be without lawful justification (para. 71), and that no right to privacy can be absolute " +
          "and many claims for the protection of privacy will have to be reconciled with, and even " +
          "yield to, competing claims (para. 73).",
        whenThisComesUp: "When the neighbour's reason for the camera is to watch their own property.",
        sourceUrl: JONES,
        verifiedAt: VERIFIED,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs", "sc-remedy-outside-jurisdiction"],
    proceduralNotes: [
      { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note: SMALL_CLAIMS_POWERS_NOTE,
        sourceUrl: CJA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CJA_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "neighbour's camera points at my backyard",
      "security camera aimed at my window",
      "neighbour is recording my house",
      "camera pointed into my bedroom",
      "neighbour filming my yard",
      "doorbell camera watching my door",
      "they moved the camera to face my house",
      "neighbour posted video of my yard",
    ],
    typicalDefendantProfile: "individual",
    citations: [JONES_CITATION, SC_GUIDE_CITATION, CJA_CITATION, LIMITATIONS_CITATION],
    reviewedAt: null,
    status: "draft",
  },
];
