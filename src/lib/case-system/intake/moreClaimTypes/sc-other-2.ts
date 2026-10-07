/**
 * Case types, batch "sc-other-2" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-other-2.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-against-a-school-board -- A claim against a school board
 *   sc-claim-against-a-municipality-other -- A claim against a municipality, other than roads and sidewalks
 *   sc-claim-against-police -- A claim about police conduct
 *   sc-claim-against-a-lawyer-or-paralegal -- A claim about a lawyer or paralegal
 *   sc-claim-against-another-professional -- A claim about an accountant, advisor or other professional
 *   sc-claim-against-a-hospital-or-clinic -- A claim against a hospital or clinic
 *   sc-claim-over-the-monetary-limit -- A claim worth more than this court can award
 *   sc-claim-franchise-dispute -- A franchise dispute
 *   sc-claim-partnership-or-joint-venture-breakup -- A small partnership or joint venture breaking up
 *
 * Every legal statement below rests on text saved in this repository: the
 * vendored corpus (docs/sources/corpus/, url from manifest.json) or a decision
 * saved under docs/sources/decisions/. Notes on what was left out, and why:
 *   - The Education Act is not saved, so nothing is said about a school
 *     board's statutory duties; the school-board type rests on Myers v. Peel
 *     County Board of Education and the Occupiers' Liability Act.
 *   - Vancouver (City) v. Ward (Charter damages) is saved, but no saved text
 *     says whether the Small Claims Court can award damages under s. 24(1) of
 *     the Charter, so the police type does not offer that route.
 *   - The Solicitors Act (assessment of a lawyer's bill) and Law Society of
 *     Ontario complaint materials are not saved on an official site, so the
 *     lawyer type says nothing about fee assessments or Law Society complaints.
 *   - The franchise type rests on the Arthur Wishart Act (Franchise
 *     Disclosure), 2000 (saved 2026-10-07: fair dealing, disclosure,
 *     rescission and its time limits, damages, waiver and scope) alongside
 *     the general law of contract (Sattva, Bhasin). The Act's regulation
 *     (prescribed contents, deposit amounts, exemptions) is not saved, so
 *     nothing is said about what is prescribed.
 *   - The partnership type rests on the Partnerships Act (saved 2026-10-07:
 *     when a partnership exists, partners' duties, dissolution and settling
 *     accounts) alongside contract, unjust enrichment (Kerr v. Baranow) for a
 *     joint venture that is not a partnership, and the Business Corporations
 *     Act. Limited liability partnerships are not covered.
 */

import type { ClaimType } from "../claimTypes";

const V = "2026-10-07";

const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_CP = "2024-12-04";
const NEGLIGENCE_ACT = "https://www.ontario.ca/laws/docs/elaws_statutes_90n01_e.doc";
const NEGLIGENCE_ACT_CP = "2004-01-01";
const OLA = "https://www.ontario.ca/laws/docs/90o02_e.doc";
const OLA_CP = "2021-01-29";
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const CJA_CP = "2025-12-11";
const OREG_626 = "https://www.ontario.ca/laws/docs/000626_e.doc";
const SC_RULES = "https://www.ontario.ca/laws/docs/980258_e.doc";
const SC_RULES_CP = "2025-10-14";
const CLPA = "https://www.ontario.ca/laws/docs/19c07c_e.doc";
const CLPA_CP = "2023-05-18";
const MUNICIPAL_ACT = "https://www.ontario.ca/laws/docs/01m25_e.doc";
const MUNICIPAL_ACT_CP = "2026-06-02";
const CSPA = "https://www.ontario.ca/laws/docs/19c01_e.doc";
const CSPA_CP = "2025-06-05";
const PHIPA = "https://www.ontario.ca/laws/docs/04p03_e.doc";
const PHIPA_CP = "2026-01-01";
const OBCA = "https://www.ontario.ca/laws/docs/90b16_e.doc";
const OBCA_CP = "2025-10-01";
const WISHART = "https://www.ontario.ca/laws/docs/00a03_e.doc";
const WISHART_CP = "2020-09-01";
const PARTNERSHIPS = "https://www.ontario.ca/laws/docs/90p05_e.doc";
const PARTNERSHIPS_CP = "2023-10-01";
const SC_GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim";
const SUING = "https://www.ontario.ca/page/suing-someone-small-claims-court";
const SCJ_STEPS =
  "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/";

const MUSTAPHA = "docs/sources/decisions/mustapha-v-culligan-2008-SCC-27.english.txt";
const CLEMENTS = "docs/sources/decisions/clements-v-clements-2012-SCC-32.english.txt";
const RYAN = "docs/sources/decisions/ryan-v-victoria-city-1999-1-SCR-201.english.txt";
const SNELL = "docs/sources/decisions/snell-v-farrell-1990-2-SCR-311.html.txt";
const NELSON = "docs/sources/decisions/nelson-city-v-marchi-2021-SCC-41.html.txt";
const MYERS = "docs/sources/decisions/myers-v-peel-county-board-of-education-1981-2-SCR-21.html.txt";
const MIAZGA = "docs/sources/decisions/miazga-v-kvello-estate-2009-SCC-51.html.txt";
const GRANT_THORNTON = "docs/sources/decisions/grant-thornton-v-new-brunswick-2021-SCC-31.english.txt";
const SATTVA = "docs/sources/decisions/sattva-capital-corp-v-creston-moly-corp-2014-SCC-53.english.txt";
const BHASIN = "docs/sources/decisions/bhasin-v-hrynew-2014-SCC-71.english.txt";
const KERR = "docs/sources/decisions/kerr-v-baranow-2011-SCC-10.english.txt";

// ---- Shared wording. Each entry that uses it has its own record. ----

const MUSTAPHA_ELEMENTS =
  "In Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, the Supreme Court of Canada said a " +
  "successful action in negligence requires the plaintiff to show (1) that the defendant owed them a " +
  "duty of care; (2) that the defendant's behaviour breached the standard of care; (3) that the " +
  "plaintiff sustained damage; and (4) that the damage was caused, in fact and in law, by the " +
  "defendant's breach (para. 3). ";

const RYAN_STANDARD =
  "In Ryan v. Victoria (City), [1999] 1 S.C.R. 201, the Court said conduct is negligent if it " +
  "creates an objectively unreasonable risk of harm, and to avoid liability a person must exercise " +
  "the standard of care that would be expected of an ordinary, reasonable and prudent person in the " +
  "same circumstances. What is reasonable depends on the facts of each case, including the " +
  "likelihood of a known or foreseeable harm, the gravity of that harm, and the burden or cost of " +
  "preventing the injury; one may also look to external indicators of reasonable conduct, such as " +
  "custom, industry practice, and statutory or regulatory standards (para. 28). ";

const CLEMENTS_CAUSE =
  "In Clements v. Clements, 2012 SCC 32, the majority of the Supreme Court of Canada said the test " +
  "for showing causation is the \"but for\" test: the plaintiff must show on a balance of " +
  "probabilities that \"but for\" the defendant's negligent act, the injury would not have occurred. " +
  "This is a factual inquiry (para. 8). The test must be applied in a robust common sense fashion, " +
  "and there is no need for scientific evidence of the precise contribution the defendant's " +
  "negligence made to the injury (para. 9). ";

const BURDEN =
  "The Superior Court of Justice's guide to the steps in a civil case says that in every civil " +
  "case the plaintiff has the burden of proof to establish, on a balance of probabilities, the " +
  "allegations in their claim -- evidence showing that, more likely than not, it would be " +
  "correct to rule in their favour. ";

const SATTVA_READING =
  "In Sattva Capital Corp. v. Creston Moly Corp., 2014 SCC 53, the Supreme Court of Canada said the " +
  "overriding concern in interpreting a contract is to determine the intent of the parties and the " +
  "scope of their understanding; to do so, a decision-maker must read the contract as a whole, " +
  "giving the words used their ordinary and grammatical meaning, consistent with the surrounding " +
  "circumstances known to the parties at the time of formation of the contract (para. 47). ";

const AMOUNT =
  "Ontario's Small Claims Court guide says the reasons for a claim should \"calculate and explain " +
  "the amount of money and any interest you are claiming\", and that a copy of the supporting " +
  "documents is attached to the claim (if they are not attached, the claim gives the reasons why). " +
  "The guide says the court can handle any action for the payment of money where the amount " +
  "claimed does not exceed $50,000, excluding interest and costs such as court fees. ";

const NEGLIGENCE_ACT_TEXT =
  "Under s. 1 of the Negligence Act, where damages have been caused or contributed to by the fault " +
  "or neglect of two or more persons, the court shall determine the degree in which each is at " +
  "fault, and those found at fault are jointly and severally liable to the person suffering the " +
  "loss. Under s. 3, if the plaintiff's own fault contributed to the damages, the court shall " +
  "apportion the damages in proportion to the degree of fault found against the parties. Under " +
  "s. 5, a person not already a party who is or may be wholly or partly responsible may be added as " +
  "a defendant, or made a third party.";

const FOUND_LATER_TEXT =
  "Under s. 5(1) of the Limitations Act, 2002, a claim is discovered on the earlier of the day the " +
  "person first knew that the injury, loss or damage had occurred, that it was caused or " +
  "contributed to by an act or omission, that the act or omission was that of the person the claim " +
  "is against, and that a proceeding would be an appropriate means to seek to remedy it -- and the " +
  "day a reasonable person with their abilities and in their circumstances first ought to have " +
  "known those things. In Grant Thornton LLP v. New Brunswick, 2021 SCC 31, a case about an " +
  "auditor under New Brunswick's limitation statute, the Supreme Court of Canada said a claim is " +
  "discovered when a plaintiff has knowledge, actual or constructive, of the material facts upon " +
  "which a plausible inference of liability on the defendant's part can be drawn (para. 42).";

const LIMITATION_NOTE =
  "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding cannot " +
  "be started after the second anniversary of the day the claim was discovered. Section 5(1) sets " +
  "out when a claim is discovered, and under s. 5(2) a person with a claim is presumed to have " +
  "known of those matters on the day the act or omission the claim is based on took place, unless " +
  "the contrary is proved.";

const SC_LIMIT_NOTE =
  "Ontario's Small Claims Court guide says the court can handle any action for the payment of " +
  "money or the recovery of personal property where the amount claimed does not exceed $50,000, " +
  "excluding interest and costs such as court fees.";

const NAMING_BUSINESS_NOTE =
  "Ontario's Small Claims Court guide says that when suing an incorporated company, the claim uses " +
  "the correct corporate name, address and postal code. If the business is not incorporated (for " +
  "example, a sole proprietorship or partnership), the claim needs the correct name of the business " +
  "and the address for service, and the plaintiff may also wish to name the proprietor or partners " +
  "as parties to obtain a judgment against them as well. The guide says that if the name on the " +
  "claim is not exactly right, a plaintiff may be unable to take steps to enforce a judgment.";

const EQUITABLE_NOTE =
  "Under s. 96(3) of the Courts of Justice Act, only the Court of Appeal and the Superior Court of " +
  "Justice, exclusive of the Small Claims Court, may grant equitable relief, unless otherwise " +
  "provided. The Small Claims Court guide says that court handles actions for the payment of money " +
  "or the recovery of personal property up to $50,000.";

const LIMITATION = { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: V, consolidationPeriod: LIMITATIONS_CP };
const SC_LIMIT = { note: SC_LIMIT_NOTE, sourceUrl: SC_GUIDE, verifiedAt: V };
const NAMING_BUSINESS = { note: NAMING_BUSINESS_NOTE, sourceUrl: SC_GUIDE, verifiedAt: V };
const EQUITABLE = {
  note: EQUITABLE_NOTE,
  sourceUrl: CJA,
  verifiedAt: V,
  consolidationPeriod: CJA_CP,
  alsoCites: [{ sourceUrl: SC_GUIDE, pinpoint: "Guide to Procedures in Small Claims Court: Making a Claim (jurisdiction)" }],
};

const LIMITATION_CITATION = {
  sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
  officialUrl: LIMITATIONS,
  verifiedAt: V,
  pinpoint: "ss. 4 and 5(1)-(2): two years from the day the claim was discovered",
};
const SC_GUIDE_CITATION = {
  sourceName: "Ontario.ca -- Guide to Procedures in Small Claims Court: Making a Claim",
  officialUrl: SC_GUIDE,
  verifiedAt: V,
  pinpoint: "Reasons for claim; naming the defendant; the $50,000 limit",
};
const NEGLIGENCE_CITATIONS = [
  { sourceName: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27", officialUrl: MUSTAPHA, verifiedAt: V, pinpoint: "para. 3" },
  { sourceName: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201", officialUrl: RYAN, verifiedAt: V, pinpoint: "para. 28" },
  { sourceName: "Clements v. Clements, 2012 SCC 32", officialUrl: CLEMENTS, verifiedAt: V, pinpoint: "paras. 8-9" },
];

const TIMELINE = {
  name: "A dated timeline",
  why: "Shows the order of events: what happened, then what followed.",
  examples: ["A written timeline with dates and times", "Messages, emails or notes made at or near the time", "Photos with their dates"],
};
const LOSS_RECORDS = {
  name: "Records of what the harm cost",
  why: "Shows the money and other losses that followed.",
  examples: ["Receipts, invoices and repair estimates", "Pay stubs or an employer letter showing time missed from work", "Bank or account statements showing the loss"],
};
const INJURY_RECORDS = {
  name: "Records of the injury",
  why: "Shows what the injury was, when it was treated and how long it has lasted.",
  examples: ["Emergency, hospital or clinic records", "Notes from a doctor, physiotherapist or counsellor", "Photos of visible injuries taken over time"],
};
const CALCULATION = {
  name: "A written calculation",
  why: "Shows how the amount claimed was reached.",
  examples: ["A list of each loss with its amount", "The documents behind each amount", "Any demand letter and the reply"],
};

export const TYPES_SC_OTHER_2: ClaimType[] = [
  // ------------------------------------------------------------------
  {
    id: "sc-claim-against-a-school-board",
    name: "A claim against a school board",
    broughtBy:
      "A student (through a parent or guardian, if under 18) hurt while in a school's care, or a person " +
      "whose property was damaged on school grounds, suing the school board for money. Not a complaint " +
      "about a grade, a placement or a discipline decision.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "supervision-scboard",
        name: "The school did not supervise as a careful parent would",
        plainExplanation:
          "In Myers v. Peel County Board of Education, [1981] 2 S.C.R. 21, the Supreme Court of Canada " +
          "said the standard of care to be exercised by school authorities in providing for the " +
          "supervision and protection of students for whom they are responsible is that of the careful " +
          "or prudent parent. The Court said it is not a standard applied in the same manner in every " +
          "case: its application depends on the number of students being supervised at the time, the " +
          "nature of the activity, the age and the degree of skill and training of the students, the " +
          "nature and condition of the equipment in use, the competency and capacity of the students, " +
          "and a host of other matters (pp. 31-32). This part of the checklist is about what the " +
          "student was doing, who was supervising, and what precautions were in place.",
        sourceUrl: MYERS,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "What happened and who was watching",
            why: "Myers looks at the activity, the supervision and the students' age and training.",
            examples: ["The school's incident or accident report", "Names of the teachers or staff on duty", "Names of students or others who saw it"],
          },
          {
            name: "The activity and the equipment",
            why: "The condition of the equipment and the nature of the activity are part of the standard.",
            examples: ["Photos of the place and the equipment", "Permission forms or trip letters", "Messages from the school about the activity"],
          },
        ],
      },
      {
        id: "premises-scboard",
        name: "An unsafe condition on school property",
        plainExplanation:
          "Under s. 3(1) of the Occupiers' Liability Act, an occupier of premises owes a duty to take " +
          "such care as in all the circumstances of the case is reasonable to see that persons entering " +
          "on the premises, and the property they bring, are reasonably safe while on the premises. " +
          "Under s. 3(2), that duty applies whether the danger is caused by the condition of the " +
          "premises or by an activity carried on there. Under s. 1, an \"occupier\" includes a person " +
          "who has responsibility for and control over the condition of premises or the activities " +
          "there carried on. This part of the checklist is about the place and the condition that " +
          "caused the harm.",
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: OLA_CP,
        evidenceCategories: [
          {
            name: "The condition of the place",
            why: "Shows the danger at the time and place of the harm.",
            examples: ["Photos or video of the spot, taken as soon as possible", "Earlier complaints to the school about it", "Witness names"],
          },
        ],
      },
      {
        id: "harm-and-cause-scboard",
        name: "The harm, and that the carelessness caused it",
        plainExplanation:
          MUSTAPHA_ELEMENTS +
          "In Clements v. Clements, 2012 SCC 32, the majority said the plaintiff must show on a balance " +
          "of probabilities that \"but for\" the defendant's negligent act, the injury would not have " +
          "occurred (para. 8). This part of the checklist is about the injury or loss, and how it " +
          "followed from what happened.",
        sourceUrl: MUSTAPHA,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: CLEMENTS, pinpoint: "Clements v. Clements, 2012 SCC 32, para. 8" }],
        evidenceCategories: [INJURY_RECORDS, LOSS_RECORDS],
      },
    ],
    defendantConsiderations: [
      {
        id: "shared-fault-scboard",
        name: "The board says the student, or someone else, shares the fault",
        plainExplanation: NEGLIGENCE_ACT_TEXT,
        whenThisComesUp:
          "When the board's Defence says the student's own choices, another student, or another person " +
          "or company caused or added to the harm.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: V,
        consolidationPeriod: NEGLIGENCE_ACT_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "A student under 18 sues through a litigation guardian. Under rule 1.02 of the Rules of the " +
          "Small Claims Court, \"disability\" includes being a minor, and under rule 4.01(1) an action " +
          "by a person under disability shall be started or continued by a litigation guardian. Under " +
          "rule 4.01(2), a minor may sue for any sum not exceeding $500 as if of full age.",
        sourceUrl: SC_RULES,
        verifiedAt: V,
        consolidationPeriod: SC_RULES_CP,
      },
      {
        note:
          "The claim is against the board, not the province. Under s. 9(1) of the Crown Liability and " +
          "Proceedings Act, 2019, the Crown is not liable for torts committed by transfer payment " +
          "recipients, and under s. 1(1) a \"transfer payment recipient\" includes a board within the " +
          "meaning of the Education Act.",
        sourceUrl: CLPA,
        verifiedAt: V,
        consolidationPeriod: CLPA_CP,
      },
      {
        note:
          LIMITATION_NOTE +
          " Under s. 6, the two-year period does not run during any time in which the person with the " +
          "claim is a minor and is not represented by a litigation guardian in relation to the claim.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_CP,
      },
    ],
    signals: [
      "suing the school board",
      "claim against the school board",
      "school board was negligent",
      "teacher wasn't supervising",
      "no teacher was watching the kids",
      "hurt in gym class",
      "injured on a school trip",
      "school board damaged my property",
      "my son was hurt at school",
      "my daughter was injured at school",
    ],
    typicalDefendantProfile: "business",
    citations: [
      { sourceName: "Myers v. Peel County Board of Education, [1981] 2 S.C.R. 21", officialUrl: MYERS, verifiedAt: V, pinpoint: "pp. 31-32" },
      { sourceName: "Occupiers' Liability Act, R.S.O. 1990, c. O.2", officialUrl: OLA, verifiedAt: V, pinpoint: "ss. 1, 3(1)-(2)" },
      { sourceName: "Rules of the Small Claims Court, O. Reg. 258/98", officialUrl: SC_RULES, verifiedAt: V, pinpoint: "rr. 1.02 (\"disability\"), 4.01(1)-(2)" },
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-against-a-municipality-other",
    name: "A claim against a municipality, other than roads and sidewalks",
    broughtBy:
      "A person or business harmed by a city or town service or worker -- for example a city vehicle, " +
      "tree, garbage or construction crew, or a city building -- suing the municipality for money. Not " +
      "a claim about a road, bridge or sidewalk in poor repair, and not a parking or by-law ticket.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "staff-tort-munother",
        name: "A wrong was done by a council member, officer, employee or agent of the municipality",
        plainExplanation:
          "Under s. 448(1) of the Municipal Act, 2001, no proceeding for damages shall be started " +
          "against a member of council or an officer, employee or agent of a municipality for any act " +
          "done in good faith in the performance or intended performance of a duty or authority under " +
          "the Act or a by-law. Under s. 448(2), that does not relieve the municipality itself of " +
          "liability it would otherwise have for a tort committed by a member of council, or an " +
          "officer, employee or agent of the municipality, or a person acting under their instructions. " +
          "This part of the checklist is about who did what, and for which municipality.",
        sourceUrl: MUNICIPAL_ACT,
        verifiedAt: V,
        consolidationPeriod: MUNICIPAL_ACT_CP,
        evidenceCategories: [
          {
            name: "Who acted, and for which municipality",
            why: "The claim rests on what the municipality's people did.",
            examples: ["Photos of the city vehicle, crew or equipment", "Work orders, letters or emails from the city", "A 311 or service request number"],
          },
          TIMELINE,
        ],
      },
      {
        id: "service-negligence-munother",
        name: "Carelessness in carrying out a service",
        plainExplanation:
          "In Nelson (City) v. Marchi, 2021 SCC 41, a case from British Columbia about a snowbank left " +
          "by city plowing, the Supreme Court of Canada said activities that open up a public authority " +
          "to liability for negligence have been defined as the practical implementation of formulated " +
          "policies, or the performance or carrying out of a policy (para. 52). On the standard of " +
          "care, a defendant must exercise the standard of care of an ordinary, reasonable and prudent " +
          "person in the same circumstances (para. 91), and the reasonableness standard applies " +
          "regardless of whether the defendant is a government or a private actor (para. 92). This " +
          "part of the checklist is about how the work was carried out.",
        sourceUrl: NELSON,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "How the work was carried out",
            why: "Nelson looks at how a policy was carried out in practice.",
            examples: ["Photos or video of the work or its result", "The city's written policy or schedule for that work, asked for in writing", "Witness names and statements"],
          },
          LOSS_RECORDS,
        ],
      },
      {
        id: "municipal-premises-munother",
        name: "An unsafe condition in a city building or property",
        plainExplanation:
          "Under s. 3(1) of the Occupiers' Liability Act, an occupier of premises owes a duty to take " +
          "such care as in all the circumstances of the case is reasonable to see that persons entering " +
          "on the premises, and the property they bring, are reasonably safe while on the premises. " +
          "Under s. 10(2), the Act does not apply to a municipal corporation where it is an occupier of " +
          "a public highway or a public road. This part of the checklist is about the place and the " +
          "condition that caused the harm.",
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: OLA_CP,
        evidenceCategories: [
          {
            name: "The condition of the place",
            why: "Shows the danger at the time and place of the harm.",
            examples: ["Photos of the spot, taken as soon as possible", "Earlier complaints to the city about it"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "policy-decision-munother",
        name: "The municipality says the harm came from a policy decision",
        plainExplanation:
          "Under s. 450 of the Municipal Act, 2001, no proceeding based on negligence in connection with " +
          "the exercise or non-exercise of a discretionary power, or the performance or non-performance " +
          "of a discretionary function, shall be started against a municipality if the action or " +
          "inaction results from a policy decision of the municipality made in a good faith exercise of " +
          "the discretion. In Nelson (City) v. Marchi, 2021 SCC 41, the Supreme Court of Canada said " +
          "core policy decisions are immune from negligence liability, and named factors for assessing " +
          "the nature of a government's decision, including the level and responsibilities of the " +
          "decision-maker, the process by which the decision was made, and the nature and extent of " +
          "budgetary considerations (para. 3).",
        whenThisComesUp:
          "When the municipality's Defence says the harm came from a budget, service-level or other " +
          "policy choice, rather than from how the work was carried out.",
        sourceUrl: MUNICIPAL_ACT,
        verifiedAt: V,
        consolidationPeriod: MUNICIPAL_ACT_CP,
        alsoCites: [{ sourceUrl: NELSON, pinpoint: "Nelson (City) v. Marchi, 2021 SCC 41, para. 3" }],
      },
      {
        id: "water-sewage-munother",
        name: "Water or sewage escaped from city works",
        plainExplanation:
          "Under s. 449(1) of the Municipal Act, 2001, no proceeding based on nuisance, in connection " +
          "with the escape of water or sewage from sewage works or water works, shall be started " +
          "against a municipality or local board, or their council or board members, officers, " +
          "employees or agents. Under s. 449(3), this does not exempt a municipality or local board " +
          "from liability arising from a cause of action created by a statute, or from an obligation " +
          "to pay compensation created by a statute.",
        whenThisComesUp: "When the damage came from a sewer backup, a watermain break or another escape of water or sewage.",
        sourceUrl: MUNICIPAL_ACT,
        verifiedAt: V,
        consolidationPeriod: MUNICIPAL_ACT_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "A claim about a highway or bridge not kept in repair has its own rules. Under s. 44(10) of " +
          "the Municipal Act, 2001, no action shall be brought for damages under s. 44(2) unless, " +
          "within 10 days after the injury, written notice of the claim and of the injury, including " +
          "the date, time and location of the occurrence, has been served on or sent by registered " +
          "mail to the clerk of the municipality. Under s. 44(11) and (12), failing to give notice is " +
          "not a bar if the injured person died as a result of the injury, or if a judge finds there is " +
          "reasonable excuse and the municipality is not prejudiced in its defence.",
        sourceUrl: MUNICIPAL_ACT,
        verifiedAt: V,
        consolidationPeriod: MUNICIPAL_ACT_CP,
      },
      SC_LIMIT,
      LIMITATION,
    ],
    signals: [
      "city garbage truck damaged my car",
      "city tree fell on my car",
      "city crew damaged my property",
      "city worker damaged my fence",
      "town snowplow damaged my lawn",
      "sewer backup flooded my basement",
      "watermain break damaged my house",
      "suing the city for damage",
      "claim against the municipality",
      "city construction damaged my house",
    ],
    typicalDefendantProfile: "business",
    citations: [
      { sourceName: "Municipal Act, 2001, S.O. 2001, c. 25", officialUrl: MUNICIPAL_ACT, verifiedAt: V, pinpoint: "ss. 44(10)-(12), 448, 449, 450" },
      { sourceName: "Nelson (City) v. Marchi, 2021 SCC 41", officialUrl: NELSON, verifiedAt: V, pinpoint: "paras. 3, 52, 91-92" },
      { sourceName: "Occupiers' Liability Act, R.S.O. 1990, c. O.2", officialUrl: OLA, verifiedAt: V, pinpoint: "ss. 3(1), 10(2)" },
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-against-police",
    name: "A claim about police conduct",
    broughtBy:
      "A person harmed by what a police officer did on duty -- property damaged or taken, an injury, or " +
      "a prosecution that ended in their favour -- suing the police service board, or the Crown for the " +
      "Ontario Provincial Police, for money.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "who-answers-police",
        name: "Who answers for the officer",
        plainExplanation:
          "Under s. 47(1) of the Community Safety and Policing Act, 2019, a police service board is " +
          "liable for the acts or omissions of members of its police service committed in the course " +
          "of their employment, and under s. 47(4) the municipality is responsible for those " +
          "liabilities. Under s. 63(1), the Crown in right of Ontario is liable for the acts or " +
          "omissions of members of the Ontario Provincial Police committed in the course of their " +
          "employment. Under s. 49(1), a police service board may sue and be sued in its own name. " +
          "This part of the checklist is about which police service was involved and what the officer " +
          "was doing at the time.",
        sourceUrl: CSPA,
        verifiedAt: V,
        consolidationPeriod: CSPA_CP,
        evidenceCategories: [
          {
            name: "Which officers, and which service",
            why: "The claim is against the board of that police service, or the Crown for the OPP.",
            examples: ["Officer names and badge numbers", "Occurrence, incident or property receipt numbers", "Any ticket, charge or release papers"],
          },
          TIMELINE,
        ],
      },
      {
        id: "negligence-police",
        name: "Where the claim is negligence: the officer did not take reasonable care",
        plainExplanation:
          MUSTAPHA_ELEMENTS +
          RYAN_STANDARD +
          "This part of the checklist is about what the officer did, and the harm that followed.",
        sourceUrl: MUSTAPHA,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "What was done",
            why: "Shows the act or omission the claim is about.",
            examples: ["Photos or video of the event or the damage", "Witness names and statements", "Body-worn or dashcam video, asked for in writing"],
          },
          LOSS_RECORDS,
        ],
      },
      {
        id: "malicious-prosecution-police",
        name: "Where the claim is malicious prosecution: the four elements",
        plainExplanation:
          "In Miazga v. Kvello Estate, 2009 SCC 51, the Supreme Court of Canada said that to succeed in " +
          "an action for malicious prosecution, a plaintiff must prove that the prosecution was (1) " +
          "initiated by the defendant; (2) terminated in favour of the plaintiff; (3) undertaken " +
          "without reasonable and probable cause; and (4) motivated by malice or a primary purpose " +
          "other than that of carrying the law into effect (para. 3). The first element identifies the " +
          "proper target of the suit: only those who were \"actively instrumental\" in setting the law " +
          "in motion are accountable (para. 53). The second may be satisfied whether the proceedings " +
          "ended in an acquittal, a discharge at a preliminary hearing, a withdrawal, or a stay " +
          "(para. 54). This part of the checklist is about the charge, who started it, and how it ended.",
        sourceUrl: MIAZGA,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "The charge and how it ended",
            why: "Shows who laid the charge and that it ended in the plaintiff's favour.",
            examples: ["The information or charge papers", "The court record showing an acquittal, withdrawal or stay", "Disclosure received in the criminal case"],
          },
          {
            name: "What the officer knew",
            why: "Reasonable and probable cause and purpose turn on what was known when the charge was laid.",
            examples: ["Notes, reports or statements disclosed in the criminal case", "A dated timeline of the investigation"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "malice-and-ending-police",
        name: "The board says there was no improper purpose, or the case did not end in the plaintiff's favour",
        plainExplanation:
          "In Miazga v. Kvello Estate, 2009 SCC 51, the Supreme Court of Canada said that by requiring " +
          "proof of an improper purpose, the malice element ensures liability will not be imposed where " +
          "a prosecutor proceeds without reasonable and probable grounds by reason of incompetence, " +
          "inexperience, poor judgment, lack of professionalism, laziness, recklessness, honest mistake, " +
          "negligence, or even gross negligence (para. 81). It also said that where the termination " +
          "does not result from an adjudication on the merits, for example a settlement or plea " +
          "bargain, a live issue may arise whether the proceedings ended \"in favour\" of the plaintiff " +
          "(para. 54).",
        whenThisComesUp:
          "When the Defence says the officer made an honest mistake, or the charge ended through a " +
          "plea, a peace bond or another agreement.",
        sourceUrl: MIAZGA,
        verifiedAt: V,
      },
      {
        id: "shared-fault-police",
        name: "The board says the plaintiff, or someone else, shares the fault",
        plainExplanation: NEGLIGENCE_ACT_TEXT,
        whenThisComesUp: "When the claim is for negligence and the Defence blames the plaintiff's own conduct or another person.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: V,
        consolidationPeriod: NEGLIGENCE_ACT_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-return-of-property", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "For the Ontario Provincial Police, notice to the Crown 60 days first. Under s. 63(1) of the " +
          "Community Safety and Policing Act, 2019, the Crown in right of Ontario is liable for OPP " +
          "members' acts in the course of their employment. Under s. 18(1) of the Crown Liability and " +
          "Proceedings Act, 2019, no proceeding that includes a claim for damages may be brought " +
          "against the Crown unless, at least 60 days before it is started, the claimant serves on the " +
          "Crown, in accordance with s. 15, notice of the claim with enough particulars to identify the " +
          "occasion out of which it arose. Under s. 18(6), a proceeding brought without that notice is " +
          "a nullity.",
        sourceUrl: CLPA,
        verifiedAt: V,
        consolidationPeriod: CLPA_CP,
        alsoCites: [{ sourceUrl: CSPA, pinpoint: "Community Safety and Policing Act, 2019, s. 63(1)" }],
      },
      {
        note:
          "A complaint is a separate process. Under s. 154(1) of the Community Safety and Policing Act, " +
          "2019, any person may make a complaint to the Complaints Director about the conduct of a " +
          "police officer. Under s. 158(1)(a), the Complaints Director may refuse to have a complaint " +
          "investigated if the facts it is based on occurred more than six months before the " +
          "complaint is made.",
        sourceUrl: CSPA,
        verifiedAt: V,
        consolidationPeriod: CSPA_CP,
      },
      LIMITATION,
    ],
    signals: [
      "suing the police",
      "police damaged my property",
      "police broke my door during a search",
      "police lost my property",
      "police officer injured me",
      "charges were withdrawn and I want to sue",
      "malicious prosecution",
      "wrongly charged by police",
      "OPP officer damaged my car",
      "claim against the police service board",
    ],
    typicalDefendantProfile: "business",
    citations: [
      { sourceName: "Community Safety and Policing Act, 2019, S.O. 2019, c. 1, Sched. 1", officialUrl: CSPA, verifiedAt: V, pinpoint: "ss. 47(1), (4), 49(1), 63(1), 154(1), 158(1)" },
      { sourceName: "Miazga v. Kvello Estate, 2009 SCC 51", officialUrl: MIAZGA, verifiedAt: V, pinpoint: "paras. 3, 53-54, 81" },
      { sourceName: "Crown Liability and Proceedings Act, 2019, S.O. 2019, c. 7, Sched. 17", officialUrl: CLPA, verifiedAt: V, pinpoint: "s. 18(1), (6)" },
      NEGLIGENCE_CITATIONS[0],
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-against-a-lawyer-or-paralegal",
    name: "A claim about a lawyer or paralegal",
    broughtBy:
      "A client who says the lawyer or paralegal they hired did careless work -- a missed deadline, a " +
      "document not filed, wrong advice -- that cost them money, suing that lawyer or paralegal or " +
      "their firm. Not a claim against the other side's lawyer.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "retainer-lawyer",
        name: "What the lawyer or paralegal was hired to do",
        plainExplanation:
          BURDEN +
          SATTVA_READING +
          "This part of the checklist is about the retainer: what was agreed, in writing or otherwise.",
        sourceUrl: SATTVA,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: SCJ_STEPS, pinpoint: "Superior Court of Justice, Steps in a civil case (burden of proof)" }],
        evidenceCategories: [
          {
            name: "The retainer",
            why: "Shows what the lawyer or paralegal agreed to do.",
            examples: ["The retainer agreement or engagement letter", "Emails giving instructions", "Invoices describing the work"],
          },
        ],
      },
      {
        id: "standard-lawyer",
        name: "The work fell below the standard of care",
        plainExplanation:
          MUSTAPHA_ELEMENTS +
          RYAN_STANDARD +
          "This part of the checklist is about what was done or not done, and when.",
        sourceUrl: RYAN,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: MUSTAPHA, pinpoint: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, para. 3" }],
        evidenceCategories: [
          {
            name: "The file",
            why: "Shows what was done on the matter, and when.",
            examples: ["A copy of the client file, asked for in writing", "Court or tribunal records showing deadlines and filings", "Letters and emails with the lawyer or paralegal"],
          },
          TIMELINE,
        ],
      },
      {
        id: "loss-caused-lawyer",
        name: "The careless work caused a loss",
        plainExplanation:
          CLEMENTS_CAUSE +
          "This part of the checklist is about the loss and how it followed from what was done or not done.",
        sourceUrl: CLEMENTS,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "What happened to the matter",
            why: "Shows the result that followed the work.",
            examples: ["The order, dismissal or decision that followed", "Letters from the other side or the court"],
          },
          LOSS_RECORDS,
        ],
      },
      {
        id: "amount-lawyer",
        name: "The amount claimed",
        plainExplanation: AMOUNT + "This part of the checklist is about each loss and how it was worked out.",
        sourceUrl: SC_GUIDE,
        verifiedAt: V,
        evidenceCategories: [CALCULATION],
      },
    ],
    defendantConsiderations: [
      {
        id: "found-later-lawyer",
        name: "The mistake was found out later",
        plainExplanation: FOUND_LATER_TEXT,
        whenThisComesUp:
          "When the Defence says the claim was started too late, and the client only learned of the " +
          "mistake, or what it cost, some time after the work.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_CP,
        alsoCites: [{ sourceUrl: GRANT_THORNTON, pinpoint: "Grant Thornton LLP v. New Brunswick, 2021 SCC 31, para. 42" }],
      },
      {
        id: "fees-claim-lawyer",
        name: "The lawyer or paralegal makes a claim for unpaid fees",
        plainExplanation:
          "Under rule 10.01(1) of the Rules of the Small Claims Court, a defendant may make a claim " +
          "against the plaintiff, or against any other person arising out of the transaction or " +
          "occurrence relied on by the plaintiff, or related to the plaintiff's claim. Under rule " +
          "10.01(2), the defendant's claim is in Form 10A and may be issued within 20 days after the " +
          "Defence is filed, or later but before trial or default judgment, with leave of the court.",
        whenThisComesUp: "When the lawyer or paralegal answers the claim by saying the client still owes fees.",
        sourceUrl: SC_RULES,
        verifiedAt: V,
        consolidationPeriod: SC_RULES_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim", "defence-contributory-negligence"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-outside-jurisdiction", "sc-remedy-interest-and-costs"],
    proceduralNotes: [NAMING_BUSINESS, SC_LIMIT, LIMITATION],
    signals: [
      "my lawyer missed a deadline",
      "my lawyer was negligent",
      "suing my former lawyer",
      "suing my paralegal",
      "paralegal didn't file my documents",
      "lawyer gave me bad advice",
      "my lawyer let the limitation period expire",
      "my case was dismissed because my lawyer",
      "legal malpractice",
    ],
    typicalDefendantProfile: "either",
    citations: [
      { sourceName: "Sattva Capital Corp. v. Creston Moly Corp., 2014 SCC 53", officialUrl: SATTVA, verifiedAt: V, pinpoint: "para. 47" },
      ...NEGLIGENCE_CITATIONS,
      { sourceName: "Grant Thornton LLP v. New Brunswick, 2021 SCC 31", officialUrl: GRANT_THORNTON, verifiedAt: V, pinpoint: "para. 42" },
      SC_GUIDE_CITATION,
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-against-another-professional",
    name: "A claim about an accountant, advisor or other professional",
    broughtBy:
      "A client who says an accountant, bookkeeper, tax preparer, financial advisor, engineer, " +
      "architect or other professional they hired did careless work that cost them money, suing that " +
      "professional or their firm. Not a claim about a doctor, dentist, lawyer or paralegal.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "engagement-prof",
        name: "What the professional was hired to do",
        plainExplanation:
          BURDEN +
          SATTVA_READING +
          "This part of the checklist is about the engagement: what was agreed, in writing or otherwise.",
        sourceUrl: SATTVA,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: SCJ_STEPS, pinpoint: "Superior Court of Justice, Steps in a civil case (burden of proof)" }],
        evidenceCategories: [
          {
            name: "The engagement",
            why: "Shows what the professional agreed to do.",
            examples: ["An engagement letter, contract or account agreement", "Emails giving instructions", "Invoices describing the work"],
          },
        ],
      },
      {
        id: "standard-prof",
        name: "The work fell below the standard of care",
        plainExplanation:
          MUSTAPHA_ELEMENTS +
          RYAN_STANDARD +
          "This part of the checklist is about what was done, and the practice for that kind of work.",
        sourceUrl: RYAN,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: MUSTAPHA, pinpoint: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, para. 3" }],
        evidenceCategories: [
          {
            name: "The work itself",
            why: "Shows what was done and what was not.",
            examples: ["The return, report, plan or statements prepared", "The professional's working papers, asked for in writing", "Notices from the Canada Revenue Agency or others that found the error"],
          },
          {
            name: "The practice for that kind of work",
            why: "Ryan names custom, industry practice and regulatory standards as indicators of reasonable conduct.",
            examples: ["Published standards or guidelines for that profession", "A report from another professional in the same field"],
          },
        ],
      },
      {
        id: "loss-caused-prof",
        name: "The careless work caused a loss",
        plainExplanation:
          CLEMENTS_CAUSE + "This part of the checklist is about the loss and how it followed from the work.",
        sourceUrl: CLEMENTS,
        verifiedAt: V,
        evidenceCategories: [LOSS_RECORDS, TIMELINE],
      },
      {
        id: "amount-prof",
        name: "The amount claimed",
        plainExplanation: AMOUNT + "This part of the checklist is about each loss and how it was worked out.",
        sourceUrl: SC_GUIDE,
        verifiedAt: V,
        evidenceCategories: [CALCULATION],
      },
    ],
    defendantConsiderations: [
      {
        id: "found-later-prof",
        name: "The mistake was found out later",
        plainExplanation: FOUND_LATER_TEXT,
        whenThisComesUp:
          "When the Defence says the claim was started too late, and the error only came to light later, " +
          "for example in a reassessment or an audit.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_CP,
        alsoCites: [{ sourceUrl: GRANT_THORNTON, pinpoint: "Grant Thornton LLP v. New Brunswick, 2021 SCC 31, para. 42" }],
      },
      {
        id: "shared-fault-prof",
        name: "The professional says the client, or someone else, shares the fault",
        plainExplanation: NEGLIGENCE_ACT_TEXT,
        whenThisComesUp:
          "When the Defence says the client gave wrong or incomplete information, or another adviser " +
          "caused or added to the loss.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: V,
        consolidationPeriod: NEGLIGENCE_ACT_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim", "defence-contributory-negligence"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-outside-jurisdiction", "sc-remedy-interest-and-costs"],
    proceduralNotes: [NAMING_BUSINESS, SC_LIMIT, LIMITATION],
    signals: [
      "my accountant made a mistake",
      "accountant's error cost me money",
      "tax preparer made a mistake on my return",
      "bookkeeper messed up my books",
      "financial advisor was negligent",
      "my advisor lost my money",
      "engineer's report was wrong",
      "architect's design mistake",
      "professional negligence",
    ],
    typicalDefendantProfile: "either",
    citations: [
      { sourceName: "Sattva Capital Corp. v. Creston Moly Corp., 2014 SCC 53", officialUrl: SATTVA, verifiedAt: V, pinpoint: "para. 47" },
      ...NEGLIGENCE_CITATIONS,
      { sourceName: "Grant Thornton LLP v. New Brunswick, 2021 SCC 31", officialUrl: GRANT_THORNTON, verifiedAt: V, pinpoint: "para. 42" },
      { sourceName: "Negligence Act, R.S.O. 1990, c. N.1", officialUrl: NEGLIGENCE_ACT, verifiedAt: V, pinpoint: "ss. 1, 3, 5" },
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-against-a-hospital-or-clinic",
    name: "A claim against a hospital or clinic",
    broughtBy:
      "A patient (or a parent or guardian for a patient under 18) harmed by care at a hospital, walk-in " +
      "clinic, dental office or other health facility, suing the facility, the practitioner, or both.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "standard-hosp",
        name: "The care fell below the standard of care",
        plainExplanation:
          MUSTAPHA_ELEMENTS +
          RYAN_STANDARD +
          "This part of the checklist is about the care given, by whom, and when.",
        sourceUrl: RYAN,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: MUSTAPHA, pinpoint: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, para. 3" }],
        evidenceCategories: [
          {
            name: "The health record",
            why: "Shows what was done, by whom, and when.",
            examples: ["The full chart, asked for in writing", "Discharge papers and test results", "Names of the staff involved"],
          },
          TIMELINE,
        ],
      },
      {
        id: "damage-hosp",
        name: "The patient suffered damage the law recognizes",
        plainExplanation:
          "In Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, the Supreme Court of Canada said a " +
          "plaintiff who suffers personal injury will generally be found to have suffered damage, and " +
          "that damage includes psychological injury (para. 8). Psychological disturbance that rises to " +
          "the level of personal injury must be distinguished from psychological upset; the law does not " +
          "recognize upset, disgust, anxiety, agitation or other mental states that fall short of injury, " +
          "and a compensable injury must be serious and prolonged and rise above the ordinary " +
          "annoyances, anxieties and fears that people living in society routinely accept (para. 9).",
        sourceUrl: MUSTAPHA,
        verifiedAt: V,
        evidenceCategories: [INJURY_RECORDS, LOSS_RECORDS],
      },
      {
        id: "causation-hosp",
        name: "The care caused the harm",
        plainExplanation:
          "In Snell v. Farrell, [1990] 2 S.C.R. 311, a medical case, the Supreme Court of Canada said " +
          "causation need not be determined by scientific precision. In many malpractice cases, the " +
          "facts lie particularly within the knowledge of the defendant, and very little affirmative " +
          "evidence on the part of the plaintiff will justify the drawing of an inference of causation " +
          "in the absence of evidence to the contrary. In Clements v. Clements, 2012 SCC 32, the " +
          "majority said the test is the \"but for\" test: the plaintiff must show on a balance of " +
          "probabilities that \"but for\" the defendant's negligent act, the injury would not have " +
          "occurred (para. 8).",
        sourceUrl: SNELL,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: CLEMENTS, pinpoint: "Clements v. Clements, 2012 SCC 32, para. 8" }],
        evidenceCategories: [
          {
            name: "What came next",
            why: "Shows how the harm followed the care.",
            examples: ["Records from the next doctor, clinic or hospital", "A dated list of symptoms and visits"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "shared-fault-hosp",
        name: "The facility says another practitioner, or the patient, shares the fault",
        plainExplanation: NEGLIGENCE_ACT_TEXT,
        whenThisComesUp:
          "When the Defence says a doctor who is not its employee, another clinic, or the patient's own " +
          "choices caused or added to the harm.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: V,
        consolidationPeriod: NEGLIGENCE_ACT_CP,
      },
      {
        id: "found-later-hosp",
        name: "The harm, or its cause, was found out later",
        plainExplanation: FOUND_LATER_TEXT,
        whenThisComesUp:
          "When the Defence says the claim was started too late, and the harm or its cause only came to " +
          "light some time after the care.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_CP,
        alsoCites: [{ sourceUrl: GRANT_THORNTON, pinpoint: "Grant Thornton LLP v. New Brunswick, 2021 SCC 31, para. 42" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-outside-jurisdiction", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Getting the record. Under s. 52(1) of the Personal Health Information Protection Act, 2004, " +
          "subject to that Part, an individual has a right of access to a record of personal health " +
          "information about them in the custody or control of a health information custodian, with " +
          "listed exceptions. Under s. 53(1), the right is exercised by a written request to the " +
          "custodian. Under s. 54(1)(a), a custodian that receives a request makes the record " +
          "available and, on request, provides a copy, unless one of the other responses in s. 54(1) " +
          "applies.",
        sourceUrl: PHIPA,
        verifiedAt: V,
        consolidationPeriod: PHIPA_CP,
      },
      {
        note:
          "The claim is against the hospital, not the province. Under s. 9(1) of the Crown Liability and " +
          "Proceedings Act, 2019, the Crown is not liable for torts committed by transfer payment " +
          "recipients, and under s. 1(1) a \"transfer payment recipient\" includes a hospital within " +
          "the meaning of the Public Hospitals Act and a private hospital within the meaning of the " +
          "Private Hospitals Act.",
        sourceUrl: CLPA,
        verifiedAt: V,
        consolidationPeriod: CLPA_CP,
      },
      LIMITATION,
    ],
    signals: [
      "suing the hospital",
      "hospital was negligent",
      "the emergency room sent me home and I got worse",
      "walk-in clinic missed my diagnosis",
      "nurse gave me the wrong medication",
      "infection from the hospital",
      "clinic made a mistake",
      "claim against the clinic",
    ],
    typicalDefendantProfile: "business",
    citations: [
      { sourceName: "Snell v. Farrell, [1990] 2 S.C.R. 311", officialUrl: SNELL, verifiedAt: V },
      ...NEGLIGENCE_CITATIONS,
      { sourceName: "Personal Health Information Protection Act, 2004, S.O. 2004, c. 3, Sched. A", officialUrl: PHIPA, verifiedAt: V, pinpoint: "ss. 52(1), 53(1), 54(1)" },
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-over-the-monetary-limit",
    name: "A claim worth more than this court can award",
    broughtBy:
      "A person or business owed more than $50,000, deciding whether to claim $50,000 in Small Claims " +
      "Court and give up the rest, or to sue for the full amount in the Superior Court of Justice.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "money-or-property-overlimit",
        name: "The claim is for money or personal property, up to the limit",
        plainExplanation:
          "Under s. 23(1) of the Courts of Justice Act, the Small Claims Court has jurisdiction in any " +
          "action for the payment of money where the amount claimed does not exceed the prescribed " +
          "amount, exclusive of interest and costs, and in any action for the recovery of possession of " +
          "personal property where the value of the property does not exceed the prescribed amount. " +
          "Under s. 1(1) of O. Reg. 626/00, the maximum amount of a claim in the Small Claims Court is " +
          "$50,000. This part of the checklist is about what is being claimed and its value.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: CJA_CP,
        alsoCites: [{ sourceUrl: OREG_626, pinpoint: "O. Reg. 626/00, s. 1(1)" }],
        evidenceCategories: [
          {
            name: "The full value of the claim",
            why: "Shows how much is owed before deciding where to claim it.",
            examples: ["Invoices, contracts or loan papers", "Repair estimates or valuations", "A list of every amount owed"],
          },
        ],
      },
      {
        id: "waive-overlimit",
        name: "Choosing to give up the amount over $50,000",
        plainExplanation:
          "Ontario's page on suing someone in Small Claims Court says that if what is owed is more than " +
          "$50,000, a person can still file in Small Claims Court if they are willing to waive the " +
          "amount over $50,000, and that for anything over $50,000 a person needs to go to the Superior " +
          "Court of Justice. This part of the checklist is about the decision and the amount given up.",
        sourceUrl: SUING,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "The amount given up",
            why: "Records what is claimed and what is waived.",
            examples: ["A calculation showing the full amount and the $50,000 claimed", "A note of the date the decision was made"],
          },
        ],
      },
      {
        id: "amount-overlimit",
        name: "The amount claimed",
        plainExplanation: AMOUNT + "This part of the checklist is about how the amount claimed was worked out.",
        sourceUrl: SC_GUIDE,
        verifiedAt: V,
        evidenceCategories: [CALCULATION],
      },
    ],
    defendantConsiderations: [
      {
        id: "claim-divided-overlimit",
        name: "The defendant says one claim was split to fit under the limit",
        plainExplanation:
          "Under rule 6.02 of the Rules of the Small Claims Court, a cause of action shall not be divided " +
          "into two or more actions for the purpose of bringing it within the court's jurisdiction.",
        whenThisComesUp:
          "When the plaintiff has started, or plans to start, more than one claim about the same debt or " +
          "event, each under $50,000.",
        sourceUrl: SC_RULES,
        verifiedAt: V,
        consolidationPeriod: SC_RULES_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-outside-jurisdiction", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Claims of $50,000 or less belong in Small Claims Court. Under s. 23(1.1) of the Courts of " +
          "Justice Act, an action within the Small Claims Court's jurisdiction shall not be started in " +
          "the Superior Court of Justice except with leave of the Superior Court of Justice as provided " +
          "in the rules of court. Under s. 23(2), an action in the Superior Court of Justice may be " +
          "transferred to the Small Claims Court by the local registrar, on requisition with the " +
          "consent of all parties filed before the trial starts, if the only claim is for the payment " +
          "of money or the recovery of personal property and it is within the Small Claims Court's " +
          "jurisdiction.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: CJA_CP,
      },
      EQUITABLE,
      LIMITATION,
    ],
    signals: [
      "owed more than $50,000",
      "more than the small claims limit",
      "over the small claims limit",
      "my claim is worth more than 50,000",
      "can I waive the amount over $50,000",
      "too much money for small claims court",
      "should I sue in superior court",
      "small claims maximum",
    ],
    typicalDefendantProfile: "either",
    citations: [
      { sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43", officialUrl: CJA, verifiedAt: V, pinpoint: "ss. 23(1), (1.1), (2), 96(3)" },
      { sourceName: "O. Reg. 626/00 (Small Claims Court Jurisdiction and Appeal Limit)", officialUrl: OREG_626, verifiedAt: V, pinpoint: "s. 1(1)" },
      { sourceName: "Ontario.ca -- Suing someone in Small Claims Court", officialUrl: SUING, verifiedAt: V, pinpoint: "Overview" },
      { sourceName: "Rules of the Small Claims Court, O. Reg. 258/98", officialUrl: SC_RULES, verifiedAt: V, pinpoint: "r. 6.02" },
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-franchise-dispute",
    name: "A franchise dispute",
    broughtBy:
      "A franchisee or a franchisor in a dispute about money under a franchise agreement -- fees, " +
      "royalties, deposits, supplies or losses -- suing the other side.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "agreement-terms-franchise",
        name: "What the franchise agreement required",
        plainExplanation:
          BURDEN +
          SATTVA_READING +
          "This part of the checklist is about the franchise agreement and the terms the claim relies on.",
        sourceUrl: SATTVA,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: SCJ_STEPS, pinpoint: "Superior Court of Justice, Steps in a civil case (burden of proof)" }],
        evidenceCategories: [
          {
            name: "The agreement",
            why: "Shows the terms the claim relies on.",
            examples: ["The signed franchise agreement and any amendments", "Schedules of fees and royalties", "Any operations manual the agreement refers to"],
          },
        ],
      },
      {
        id: "performance-franchise",
        name: "The other side did not deal fairly or honestly",
        plainExplanation:
          "Under s. 3(1) of the Arthur Wishart Act (Franchise Disclosure), 2000, every franchise " +
          "agreement imposes on each party a duty of fair dealing in its performance and enforcement. " +
          "Under s. 3(3), that duty includes the duty to act in good faith and in accordance with " +
          "reasonable commercial standards. Under s. 3(2), a party to a franchise agreement has a right " +
          "of action for damages against another party to it who breaches the duty of fair dealing. " +
          "Separately, in Bhasin v. Hrynew, 2014 SCC 71, the Supreme Court of Canada recognized a general duty of " +
          "honest performance, which requires the parties to be honest with each other in relation to " +
          "the performance of their contractual obligations (para. 93). This means simply that parties " +
          "must not lie or otherwise knowingly mislead each other about matters directly linked to the " +
          "performance of the contract; it does not impose a duty of loyalty or of disclosure, or " +
          "require a party to forego advantages flowing from the contract (para. 73). This part of the " +
          "checklist is about what each side did, and what was said about it.",
        sourceUrl: WISHART,
        verifiedAt: V,
        consolidationPeriod: WISHART_CP,
        alsoCites: [{ sourceUrl: BHASIN, pinpoint: "Bhasin v. Hrynew, 2014 SCC 71, paras. 73, 93" }],
        evidenceCategories: [
          {
            name: "What each side did",
            why: "Shows which obligations were met and which were not.",
            examples: ["Invoices, royalty reports and payment records", "Notices of default or termination", "Emails and letters between the franchisor and franchisee"],
          },
          TIMELINE,
        ],
      },
      {
        id: "disclosure-franchise",
        name: "The franchisor did not give proper disclosure",
        plainExplanation:
          "Under s. 5(1) of the Arthur Wishart Act (Franchise Disclosure), 2000, a franchisor shall " +
          "provide a prospective franchisee with a disclosure document, and the prospective franchisee " +
          "shall receive it not less than 14 days before the earlier of signing the franchise agreement " +
          "or any other agreement relating to the franchise (other than an agreement described in " +
          "s. 5(1.1)), and paying any consideration relating to the franchise (other than a deposit that " +
          "meets the conditions in s. 5(1)(b)). Under s. 5(3), it must be one document, delivered at one " +
          "time. Under s. 5(4), it shall contain all material facts, financial statements as prescribed, " +
          "and copies of all proposed franchise agreements and other agreements to be signed, among other " +
          "things, and under s. 5(5) the franchisor shall provide a written statement of any material " +
          "change. Under s. 7(1), if a franchisee suffers a loss because of a misrepresentation in the " +
          "disclosure document or a statement of material change, or as a result of the franchisor's " +
          "failure to comply in any way with s. 5, the franchisee has a right of action for damages " +
          "against the franchisor and the others the subsection lists, including every person who signed " +
          "the disclosure document. Under s. 7(2), a franchisee who acquired the franchise is deemed to " +
          "have relied on a misrepresentation in the disclosure document. Under s. 7(4), a person is not " +
          "liable for misrepresentation if the person proves that the franchisee acquired the franchise " +
          "with knowledge of the misrepresentation. This part of the checklist is about what was given, " +
          "when, and what it said.",
        sourceUrl: WISHART,
        verifiedAt: V,
        consolidationPeriod: WISHART_CP,
        evidenceCategories: [
          {
            name: "What was disclosed, and when",
            why: "Shows whether a disclosure document was given, and how long before signing or paying.",
            examples: ["The disclosure document and any statement of material change", "Registered mail or delivery receipts showing the date it arrived", "The dated franchise agreement and the record of the first payment"],
          },
          {
            name: "What turned out to be different",
            why: "Shows which statements in the disclosure were untrue or left out.",
            examples: ["The pages of the disclosure document relied on", "Records showing the true facts, such as sales or costs", "Emails or notes of what was said before signing"],
          },
        ],
      },
      {
        id: "amount-franchise",
        name: "The amount claimed",
        plainExplanation: AMOUNT + "This part of the checklist is about each amount owed and how it was worked out.",
        sourceUrl: SC_GUIDE,
        verifiedAt: V,
        evidenceCategories: [CALCULATION],
      },
    ],
    defendantConsiderations: [
      {
        id: "time-limit-agreed-franchise",
        name: "The agreement changed the time limit",
        plainExplanation:
          "Under s. 22(1) of the Limitations Act, 2002, a limitation period under the Act applies despite " +
          "any agreement to vary or exclude it, subject only to the exceptions in s. 22(2) to (6). Under " +
          "s. 22(5), in a business agreement, a limitation period under the Act (other than one set by " +
          "s. 15) may be varied or excluded by an agreement made on or after October 19, 2006. Under " +
          "s. 22(6), a \"business agreement\" is an agreement made by parties none of whom is a consumer " +
          "as defined in the Consumer Protection Act, 2002.",
        whenThisComesUp: "When the franchise agreement has a clause setting a shorter or different time to bring a claim.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_CP,
      },
      {
        id: "set-off-franchise",
        name: "The other side says money is owed the other way",
        plainExplanation:
          "Under s. 111(1) of the Courts of Justice Act, in an action for payment of a debt, the " +
          "defendant may, by way of defence, claim the right to set off against the plaintiff's claim a " +
          "debt owed by the plaintiff to the defendant. Under s. 111(2), mutual debts may be set off " +
          "against each other even if they are of a different nature, and under s. 111(3), if a larger " +
          "sum is found due from the plaintiff, the defendant is entitled to judgment for the balance.",
        whenThisComesUp: "When the Defence says unpaid royalties, fees or supplies are owed back to the defendant.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: CJA_CP,
      },
      {
        id: "act-scope-franchise",
        name: "Whether the franchise law applies, and whether rights were given up",
        plainExplanation:
          "Under s. 2(1) of the Arthur Wishart Act (Franchise Disclosure), 2000, the Act applies to a " +
          "franchise agreement, its renewal or extension, and the business operated under it, if the " +
          "business is to be operated partly or wholly in Ontario. Under s. 2(3), the Act does not apply " +
          "to certain relationships, including an employer-employee relationship, a partnership, and a " +
          "relationship arising out of an oral agreement where there is no writing which evidences any " +
          "material term. Under s. 12, the burden of proving an exemption or an exclusion is on the " +
          "person claiming it. Under s. 11, any purported waiver or release by a franchisee of a right " +
          "given under the Act is void. Under s. 10, a provision in a franchise agreement restricting the " +
          "application of the law of Ontario, or restricting jurisdiction or venue to a forum outside " +
          "Ontario, is void with respect to a claim otherwise enforceable under the Act in Ontario.",
        whenThisComesUp:
          "When the Defence says the deal was not a franchise or falls under an exception, points to a " +
          "release the franchisee signed, or relies on a clause naming another province's law or courts.",
        sourceUrl: WISHART,
        verifiedAt: V,
        consolidationPeriod: WISHART_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-outside-jurisdiction", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      EQUITABLE,
      {
        note:
          "Under s. 6(1) of the Arthur Wishart Act (Franchise Disclosure), 2000, a franchisee may " +
          "rescind the franchise agreement, without penalty or obligation, no later than 60 days after " +
          "receiving the disclosure document, if the franchisor failed to provide the disclosure document " +
          "or a statement of material change within the time required by s. 5, or if the contents of the " +
          "disclosure document did not meet the requirements of s. 5. Under s. 6(2), if the franchisor " +
          "never provided the disclosure document, the franchisee may rescind no later than two years " +
          "after entering into the franchise agreement. Under s. 6(3), notice of rescission shall be in " +
          "writing and delivered to the franchisor personally, by registered mail, by fax or by any other " +
          "prescribed method, at the franchisor's address for service or to any other person designated " +
          "for that purpose in the franchise agreement. Under s. 6(6), within 60 days of the effective " +
          "date of the rescission, the franchisor shall refund any money received from the franchisee " +
          "(other than money for inventory, supplies or equipment), purchase the remaining inventory and " +
          "the supplies and equipment the franchisee bought under the agreement at the price the " +
          "franchisee paid, and compensate the franchisee for losses incurred in acquiring, setting up " +
          "and operating the franchise, less those amounts.",
        sourceUrl: WISHART,
        verifiedAt: V,
        consolidationPeriod: WISHART_CP,
      },
      LIMITATION,
    ],
    signals: [
      "franchise agreement",
      "my franchisor",
      "the franchisee owes royalties",
      "franchise fee refund",
      "franchisor won't return my deposit",
      "franchise was terminated",
      "franchisor lied about the business",
      "unpaid franchise royalties",
      "never got a disclosure document",
      "I want to rescind my franchise",
      "franchisor did not act in good faith",
      "franchise disclosure was wrong",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Arthur Wishart Act (Franchise Disclosure), 2000, S.O. 2000, c. 3",
        officialUrl: WISHART,
        verifiedAt: V,
        pinpoint: "ss. 2(1), (3), 3, 5(1), (3)-(5), 6(1)-(3), (6), 7(1), (2), (4), 10-12",
      },
      { sourceName: "Sattva Capital Corp. v. Creston Moly Corp., 2014 SCC 53", officialUrl: SATTVA, verifiedAt: V, pinpoint: "para. 47" },
      { sourceName: "Bhasin v. Hrynew, 2014 SCC 71", officialUrl: BHASIN, verifiedAt: V, pinpoint: "paras. 73, 93" },
      { sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43", officialUrl: CJA, verifiedAt: V, pinpoint: "ss. 96(3), 111" },
      SC_GUIDE_CITATION,
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-partnership-or-joint-venture-breakup",
    name: "A small partnership or joint venture breaking up",
    broughtBy:
      "A person who went into a small business or project with someone else -- as partners, in a joint " +
      "venture, or through a shared company -- and is owed money back after it ended, suing the other " +
      "person or the business.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "agreement-partner",
        name: "What the partners agreed",
        plainExplanation:
          BURDEN +
          SATTVA_READING +
          "This part of the checklist is about what each person agreed to put in, do, and take out.",
        sourceUrl: SATTVA,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: SCJ_STEPS, pinpoint: "Superior Court of Justice, Steps in a civil case (burden of proof)" }],
        evidenceCategories: [
          {
            name: "The agreement",
            why: "Shows what was agreed about money, work and profits.",
            examples: ["A written partnership, joint venture or shareholder agreement", "Texts or emails setting out the deal", "Business registration papers"],
          },
        ],
      },
      {
        id: "partnership-existed-partner",
        name: "There was a partnership, and each partner's share",
        plainExplanation:
          "Under s. 2 of the Partnerships Act, partnership is the relation that subsists between persons " +
          "carrying on a business in common with a view to profit; the relation between the members of " +
          "an incorporated company is not a partnership within the meaning of the Act. Under s. 3, rule 3, " +
          "the receipt by a person of a share of the profits of a business is proof, in the absence of " +
          "evidence to the contrary, that the person is a partner in the business. Under s. 24, rule 1, " +
          "subject to any agreement express or implied between the partners, all the partners are " +
          "entitled to share equally in the capital and profits of the business and must contribute " +
          "equally towards the losses, with an exception the rule sets out. Under s. 20, the partners' " +
          "mutual rights and duties may be varied by the consent of all the partners, and that consent " +
          "may be expressed or inferred from a course of dealing. This part of the checklist is about how " +
          "the business was carried on together, and how profits and losses were shared.",
        sourceUrl: PARTNERSHIPS,
        verifiedAt: V,
        consolidationPeriod: PARTNERSHIPS_CP,
        evidenceCategories: [
          {
            name: "How the business was carried on together",
            why: "Shows two or more people running a business in common to make a profit.",
            examples: ["Business name registration listing the partners", "A shared business bank account", "Invoices, ads or a website naming the business"],
          },
          {
            name: "How profits and losses were shared",
            why: "Shows the share each person took, or was promised.",
            examples: ["Records of profit splits or draws", "Messages about how money would be divided", "Year-end statements or accounts"],
          },
        ],
      },
      {
        id: "duties-partner",
        name: "Partnership money or property was not accounted for",
        plainExplanation:
          "Under s. 21(1) of the Partnerships Act, partnership property must be held and applied by the " +
          "partners exclusively for the purposes of the partnership and in accordance with the " +
          "partnership agreement, and under s. 22, unless the contrary intention appears, property bought " +
          "with money belonging to the firm is deemed bought on the firm's account. Under s. 28, partners " +
          "are bound to render true accounts and full information of all things affecting the " +
          "partnership to any partner. Under s. 29(1), every partner must account to the firm for any " +
          "benefit derived without the consent of the other partners from any transaction concerning the " +
          "partnership or from any use of the partnership property, name or business connection. Under " +
          "s. 30, a partner who, without the consent of the other partners, carries on a business of the " +
          "same nature as and competing with the firm must account for and pay over to the firm all " +
          "profits made in that business. Under s. 24, rule 9, subject to any agreement, every partner " +
          "may have access to and inspect and copy the partnership books. This part of the checklist is " +
          "about partnership money and property, and who used it.",
        sourceUrl: PARTNERSHIPS,
        verifiedAt: V,
        consolidationPeriod: PARTNERSHIPS_CP,
        evidenceCategories: [
          {
            name: "The partnership's books",
            why: "Shows what came in, what went out, and to whom.",
            examples: ["Business bank statements", "Sales and expense records", "Requests to see the books, and the replies"],
          },
          {
            name: "Use of partnership property or connections",
            why: "Shows a partner taking a benefit or running a competing business without consent.",
            examples: ["Records of a competing business", "Messages with partnership customers or suppliers", "A list of partnership equipment and where it is now"],
          },
        ],
      },
      {
        id: "money-kept-partner",
        name: "Money or work put in and kept by the other side",
        plainExplanation:
          "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said the law permits recovery for " +
          "unjust enrichment whenever the plaintiff can establish three elements: an enrichment of or " +
          "benefit to the defendant, a corresponding deprivation of the plaintiff, and the absence of a " +
          "juristic reason for the enrichment (para. 32). For the first, the plaintiff must show that " +
          "he or she gave something to the defendant which the defendant received and retained; the " +
          "benefit must be tangible, and it must be one that can be restored to the plaintiff in specie " +
          "or by money (para. 38). The third element means there is no reason in law or justice for the " +
          "defendant's retention of the benefit conferred by the plaintiff (para. 40). This part of " +
          "the checklist is about what was put in, and who has it now.",
        sourceUrl: KERR,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "What was put in",
            why: "Shows the money, equipment or work each person contributed.",
            examples: ["Bank transfers or cheques into the business", "Receipts for equipment or stock bought", "Records of unpaid work done"],
          },
          {
            name: "Where it went",
            why: "Shows who kept the money, stock or equipment after the end.",
            examples: ["Business bank statements", "Messages about closing the business", "A list of assets and who has them"],
          },
          CALCULATION,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "corporation-partner",
        name: "The business was a corporation",
        plainExplanation:
          "Under s. 15 of the Business Corporations Act, a corporation has the capacity and the rights, " +
          "powers and privileges of a natural person. Under s. 92(1), the shareholders of a corporation " +
          "are not, as shareholders, liable for any act, default, obligation or liability of the " +
          "corporation, except under the provisions the subsection lists.",
        whenThisComesUp: "When the business was incorporated, and the Defence says the money is owed by or to the company, not a person.",
        sourceUrl: OBCA,
        verifiedAt: V,
        consolidationPeriod: OBCA_CP,
      },
      {
        id: "gift-or-contract-partner",
        name: "The other side says there was a reason to keep the money",
        plainExplanation:
          "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said juristic reasons to deny " +
          "recovery for unjust enrichment may be the intention to make a gift (a \"donative intent\"), a " +
          "contract, or a disposition of law (para. 41).",
        whenThisComesUp: "When the Defence says the money was a gift, an investment at risk, or dealt with by the agreement.",
        sourceUrl: KERR,
        verifiedAt: V,
      },
      {
        id: "dissolution-partner",
        name: "When the partnership ended, and how accounts are settled",
        plainExplanation:
          "Under s. 32 of the Partnerships Act, subject to any agreement between the partners, a " +
          "partnership is dissolved: if entered into for a fixed term, by the expiration of that term; if " +
          "entered into for a single adventure or undertaking, by its termination; or if entered into for " +
          "an undefined time, by a partner giving notice to the others of the intention to dissolve it, " +
          "as from the date in the notice or, if no date is given, the date the notice was communicated. " +
          "Under s. 35(1), on application by a partner, the court may order a dissolution in the cases " +
          "the subsection lists. Under s. 39, on dissolution every partner is entitled to have the " +
          "partnership property applied in payment of the firm's debts and liabilities, and the surplus " +
          "applied in payment of what may be due to the partners after deducting what may be due from " +
          "them to the firm. Under s. 44, rule 2, subject to any agreement, the firm's assets are applied " +
          "first to the debts of people who are not partners, then to each partner's advances, then to " +
          "each partner's capital. Under s. 43, subject to any agreement, the amount due to an outgoing " +
          "partner for that partner's share is a debt accruing at the date of the dissolution.",
        whenThisComesUp:
          "When the two sides disagree about whether or when the partnership ended, or about what must " +
          "be paid out of the business before each partner's share.",
        sourceUrl: PARTNERSHIPS,
        verifiedAt: V,
        consolidationPeriod: PARTNERSHIPS_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-return-of-property", "sc-remedy-outside-jurisdiction", "sc-remedy-interest-and-costs"],
    proceduralNotes: [NAMING_BUSINESS, EQUITABLE, LIMITATION],
    signals: [
      "my business partner kept the money",
      "we started a business together",
      "partnership broke up",
      "joint venture fell apart",
      "my share of the business",
      "business partner took the profits",
      "partner won't pay back my investment",
      "we closed the business and he kept the equipment",
      "my partner won't show me the books",
      "partner started a competing business",
      "dissolve the partnership",
      "my share of the profits",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Partnerships Act, R.S.O. 1990, c. P.5",
        officialUrl: PARTNERSHIPS,
        verifiedAt: V,
        pinpoint: "ss. 2, 3, 20-22, 24, 28-30, 32, 35(1), 39, 43, 44",
      },
      { sourceName: "Sattva Capital Corp. v. Creston Moly Corp., 2014 SCC 53", officialUrl: SATTVA, verifiedAt: V, pinpoint: "para. 47" },
      { sourceName: "Kerr v. Baranow, 2011 SCC 10", officialUrl: KERR, verifiedAt: V, pinpoint: "paras. 32, 38, 40-41" },
      { sourceName: "Business Corporations Act, R.S.O. 1990, c. B.16", officialUrl: OBCA, verifiedAt: V, pinpoint: "ss. 15, 92(1)" },
      SC_GUIDE_CITATION,
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },
];
