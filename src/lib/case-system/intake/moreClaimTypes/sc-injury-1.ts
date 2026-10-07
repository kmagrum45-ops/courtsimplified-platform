/**
 * Case types, batch "sc-injury-1" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-injury-1.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-fall-in-a-parking-lot-or-plaza -- A fall in a parking lot or plaza
 *   sc-claim-fall-at-a-rental-property -- A fall where you rent
 *   sc-claim-fall-at-a-municipal-facility -- A fall at an arena, pool or park
 *   sc-claim-injury-at-a-business-or-event -- An injury at a shop, restaurant or event
 *   sc-claim-food-poisoning -- Food poisoning
 *   sc-claim-injury-at-a-gym-or-sport -- An injury at a gym or playing sport
 *   sc-claim-injury-from-a-defective-product -- An injury caused by a product
 *
 * All seven are written. Every legal statement comes from the saved text of the
 * Occupiers' Liability Act, Negligence Act, Limitations Act, 2002, Courts of
 * Justice Act, O. Reg. 626/00, Residential Tenancies Act, 2006, Municipal Act,
 * 2001, Sale of Goods Act, Consumer Protection Act, 2002, the ontario.ca Small
 * Claims guide, and four saved Supreme Court of Canada decisions (Mustapha,
 * Clements, Waldick, Ryan) -- each of which has a public page in
 * publicSourceUrl.ts.
 *
 * Deliberately left out: nothing saved here states a rule of product
 * liability beyond Mustapha's statement about the manufacturer of a
 * "consumable good", so the defective-product entry does not say a
 * manufacturer of other goods owes a duty; it states the general negligence
 * elements and the Sale of Goods Act conditions between buyer and seller.
 */

import type { ClaimType } from "../claimTypes";

const V = "2026-10-07";

const OLA = "https://www.ontario.ca/laws/docs/90o02_e.doc";
const OLA_FROM = "2021-01-29";
const NEGLIGENCE_ACT = "https://www.ontario.ca/laws/docs/elaws_statutes_90n01_e.doc";
const NEGLIGENCE_FROM = "2004-01-01";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_FROM = "2024-12-04";
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const CJA_FROM = "2025-12-11";
const OREG_626 = "https://www.ontario.ca/laws/docs/000626_e.doc";
const RTA = "https://www.ontario.ca/laws/docs/06r17_e.doc";
const RTA_FROM = "2026-09-21";
const MUNICIPAL_ACT = "https://www.ontario.ca/laws/docs/01m25_e.doc";
const SGA = "https://www.ontario.ca/laws/docs/90s01_e.doc";
const SGA_FROM = "1994-12-09";
const CPA = "https://www.ontario.ca/laws/docs/02c30_e.doc";
const SC_GUIDE = "https://www.ontario.ca/page/suing-someone-small-claims-court";

const MUSTAPHA = "docs/sources/decisions/mustapha-v-culligan-2008-SCC-27.english.txt";
const CLEMENTS = "docs/sources/decisions/clements-v-clements-2012-SCC-32.english.txt";
const WALDICK = "docs/sources/decisions/waldick-v-malcolm-1991-2-SCR-456.html.txt";
const RYAN = "docs/sources/decisions/ryan-v-victoria-city-1999-1-SCR-201.english.txt";

const WALDICK_PIN = "Waldick v. Malcolm, [1991] 2 S.C.R. 456 (reasons of Iacobucci J. for the Court)";
const CLEMENTS_PIN = "Clements v. Clements, 2012 SCC 32, paras. 8-9";
const NEG_PIN = "Negligence Act, s. 3";

// ---------------------------------------------------------------------------
// Shared wording. Each is a direct restatement of the saved text it cites.

const OCCUPIER_TEXT =
  "Under s. 1 of the Occupiers' Liability Act, an \"occupier\" includes a person in physical possession " +
  "of premises, or a person who has responsibility for and control over the condition of premises or the " +
  "activities carried on there, or control over who is allowed to enter -- and there can be more than one " +
  "occupier of the same premises. \"Premises\" means lands and structures. Under s. 2, subject to s. 9, the " +
  "Act applies in place of the common law rules about the care an occupier must show to people entering " +
  "the premises and the property they bring.";

const REASONABLE_CARE_TEXT =
  "Under s. 3(1) of the Occupiers' Liability Act, an occupier owes a duty to take such care as in all the " +
  "circumstances of the case is reasonable to see that persons entering on the premises, and the property " +
  "they bring, are reasonably safe while on the premises. Under s. 3(2), this applies whether the danger is " +
  "caused by the condition of the premises or by an activity carried on there. In Waldick v. Malcolm, " +
  "[1991] 2 S.C.R. 456, the Supreme Court of Canada said the duty is to take reasonable care in the " +
  "circumstances to make the premises safe; the duty does not change, but the factors relevant to what is " +
  "reasonable care are very specific to each fact situation. The Court said customary practices which are " +
  "unreasonable in themselves, or not otherwise acceptable to courts, in no way oust the duty of care owed " +
  "by occupiers under s. 3(1).";

const DAMAGE_AND_CAUSE_TEXT =
  "In Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, the Supreme Court of Canada said a plaintiff who " +
  "suffers personal injury will generally be found to have suffered damage, and that damage includes " +
  "psychological injury (para. 8); but the law does not recognize upset, disgust, anxiety, agitation or " +
  "other mental states that fall short of injury (para. 9). In Clements v. Clements, 2012 SCC 32, the " +
  "majority said the test for showing causation is the \"but for\" test: the plaintiff must show on a " +
  "balance of probabilities that \"but for\" the defendant's negligent act, the injury would not have " +
  "occurred. This is a factual inquiry (para. 8). The test must be applied in a robust common sense " +
  "fashion, and there is no need for scientific evidence of the precise contribution the defendant's " +
  "negligence made to the injury (para. 9).";

const NEGLIGENCE_ELEMENTS_TEXT =
  "In Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, the Supreme Court of Canada said a successful " +
  "action in negligence requires the plaintiff to show (1) that the defendant owed them a duty of care; " +
  "(2) that the defendant's behaviour breached the standard of care; (3) that the plaintiff sustained " +
  "damage; and (4) that the damage was caused, in fact and in law, by the defendant's breach (para. 3).";

const STANDARD_OF_CARE_TEXT =
  "On the standard of care, in Ryan v. Victoria (City), [1999] 1 S.C.R. 201, the Court said conduct is " +
  "negligent if it creates an objectively unreasonable risk of harm, and a person must exercise the " +
  "standard of care that would be expected of an ordinary, reasonable and prudent person in the same " +
  "circumstances. What is reasonable depends on the facts of each case, including the likelihood of a " +
  "known or foreseeable harm, the gravity of that harm, and the burden or cost of preventing the injury; " +
  "one may also look to external indicators of reasonable conduct, such as custom, industry practice, and " +
  "statutory or regulatory standards (para. 28).";

const WILLING_TEXT =
  "Under s. 4(1) of the Occupiers' Liability Act, the s. 3(1) duty does not apply to risks willingly " +
  "assumed by the person who enters on the premises; in that case the occupier still owes a duty not to " +
  "create a danger with the deliberate intent of doing harm or damage, and not to act with reckless " +
  "disregard of the person's presence. Under s. 3(3), the duty applies except in so far as the occupier is " +
  "free to and does restrict, modify or exclude it; under s. 5(3), where the occupier is free to do so, the " +
  "occupier shall take reasonable steps to bring the restriction to the attention of the person to whom " +
  "the duty is owed.";

const CONTRIBUTORY_OLA_TEXT =
  "Under s. 9(3) of the Occupiers' Liability Act, the Negligence Act applies to causes of action under the " +
  "Occupiers' Liability Act. Under s. 3 of the Negligence Act, if fault or negligence is found on the part " +
  "of the plaintiff that contributed to the damages, the court shall apportion the damages in proportion " +
  "to the degree of fault or negligence found against the parties.";

const CONTRIBUTORY_NEG_TEXT =
  "Under s. 3 of the Negligence Act, in any action for damages founded on the fault or negligence of the " +
  "defendant, if fault or negligence is found on the part of the plaintiff that contributed to the " +
  "damages, the court shall apportion the damages in proportion to the degree of fault or negligence found " +
  "against the parties.";

const CONTRACTOR_TEXT =
  "Under s. 6(1) of the Occupiers' Liability Act, where damage is caused by the negligence of an " +
  "independent contractor employed by the occupier, the occupier is not on that account liable if in all " +
  "the circumstances the occupier acted reasonably in entrusting the work to the contractor, took such " +
  "steps, if any, as it reasonably ought to be satisfied that the contractor was competent and the work " +
  "had been properly done, and it was reasonable that the work should have been undertaken. Under s. 6(3), " +
  "nothing in the section affects any duty of the occupier that is non-delegable at common law.";

const SNOW_NOTE =
  "Snow and ice: a 60-day written notice. Under s. 6.1(1) of the Occupiers' Liability Act, no action for " +
  "damages for personal injury caused by snow or ice can be brought against an occupier, or an independent " +
  "contractor employed by the occupier to remove snow or ice, unless, within 60 days after the injury, " +
  "written notice of the claim, including the date, time and location of the occurrence, has been " +
  "personally served on or sent by registered mail to at least one of them. Under s. 6.1(5) and (6), " +
  "failing to give the notice is not a bar if the injured person died as a result of the injury, or if a " +
  "judge finds there is reasonable excuse for the missing or insufficient notice and the defendant is not " +
  "prejudiced in its defence.";

const SC_COURT_NOTE =
  "Which court. Under s. 23(1)(a) of the Courts of Justice Act, the Small Claims Court has jurisdiction in " +
  "any action for the payment of money where the amount claimed does not exceed the prescribed amount, not " +
  "counting interest and costs; under s. 1(1) of O. Reg. 626/00, the maximum amount of a claim in the " +
  "Small Claims Court is $50,000. Ontario's guide to suing in Small Claims Court lists personal injuries " +
  "among the claims for damages that can be brought there, and says that if what you are owed is more than " +
  "$50,000, you can still file in Small Claims Court if you are willing to waive the amount over $50,000.";

const LIMITATION_NOTE =
  "Time limit. Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
  "cannot be started after the second anniversary of the day the claim was discovered. Under s. 5(1), a " +
  "claim is discovered on the earlier of the day the person first knew that the injury, loss or damage had " +
  "occurred, that it was caused or contributed to by an act or omission, that the act or omission was that " +
  "of the person the claim is against, and that, having regard to the nature of the injury, loss or " +
  "damage, a proceeding would be an appropriate means to seek to remedy it -- and the day a reasonable " +
  "person with their abilities and in their circumstances first ought to have known those things. Under " +
  "s. 5(2), a person is presumed to have known those things on the day the act or omission took place, " +
  "unless the contrary is proved.";

const SALE_OF_GOODS_TEXT =
  "Under s. 15 of the Sale of Goods Act, where goods are bought by description from a seller who deals in " +
  "goods of that description (whether the seller is the manufacturer or not), there is an implied " +
  "condition that the goods will be of merchantable quality; but if the buyer has examined the goods, there " +
  "is no implied condition as regards defects that the examination ought to have revealed. Where the buyer " +
  "makes known to the seller the particular purpose for which the goods are required, so as to show that " +
  "the buyer relies on the seller's skill or judgment, and the goods are of a description the seller " +
  "supplies in the course of business, there is an implied condition that the goods will be reasonably fit " +
  "for that purpose. Under s. 9(2) of the Consumer Protection Act, 2002, these implied conditions and " +
  "warranties are deemed to apply, with necessary modifications, to goods leased, traded or otherwise " +
  "supplied under a consumer agreement; under s. 9(3), any term or acknowledgement that purports to negate " +
  "or vary them is void.";

// ---------------------------------------------------------------------------
// Shared evidence.

const INJURY_RECORDS = {
  name: "Records of the injury",
  why: "Shows what the injury was, when it was first treated and how long it has lasted.",
  examples: [
    "Emergency, hospital or clinic records",
    "Notes from a family doctor, specialist or physiotherapist",
    "Photos of visible injuries taken over time",
  ],
};

const LOSS_RECORDS = {
  name: "Records of what the harm cost",
  why: "Shows the money and other losses that followed.",
  examples: [
    "Receipts for treatment, medication and travel to appointments",
    "Pay stubs or an employer letter showing time missed from work",
    "Receipts for damaged clothing, glasses or other property",
  ],
};

const HAZARD = {
  name: "The hazard",
  why: "Shows the condition or activity that caused the harm.",
  examples: [
    "Photos or video of the hazard taken as soon as possible",
    "An incident report made with the business, landlord or facility",
    "Witness names and statements",
  ],
};

const WHAT_WAS_DONE = {
  name: "What the occupier did, or did not do, about it",
  why: "What is reasonable depends on the circumstances, including inspection and maintenance.",
  examples: [
    "Inspection, cleaning, salting or maintenance logs (asked for in writing)",
    "Earlier complaints or warnings about the same hazard",
    "Warning signs, or photos showing there were none",
  ],
};

const DAMAGE_ELEMENT = (suffix: string) => ({
  id: `damage-and-cause-${suffix}`,
  name: "You were hurt, and the harm came from what happened",
  plainExplanation: DAMAGE_AND_CAUSE_TEXT,
  sourceUrl: MUSTAPHA,
  verifiedAt: V,
  alsoCites: [{ sourceUrl: CLEMENTS, pinpoint: CLEMENTS_PIN }],
  evidenceCategories: [INJURY_RECORDS, LOSS_RECORDS],
});

const CONTRIBUTORY_OLA = (suffix: string, when: string) => ({
  id: `contributory-negligence-${suffix}`,
  name: "The injured person's own carelessness is said to have contributed",
  plainExplanation: CONTRIBUTORY_OLA_TEXT,
  whenThisComesUp: when,
  sourceUrl: OLA,
  verifiedAt: V,
  consolidationPeriod: OLA_FROM,
  alsoCites: [{ sourceUrl: NEGLIGENCE_ACT, pinpoint: NEG_PIN }],
});

const WILLING = (suffix: string, when: string) => ({
  id: `willing-assumption-${suffix}`,
  name: "Risks willingly assumed, or a duty limited by a sign, ticket or waiver",
  plainExplanation: WILLING_TEXT,
  whenThisComesUp: when,
  sourceUrl: OLA,
  verifiedAt: V,
  consolidationPeriod: OLA_FROM,
});

const CONTRACTOR = (suffix: string, when: string) => ({
  id: `independent-contractor-${suffix}`,
  name: "A contractor did the work that is said to have caused the harm",
  plainExplanation: CONTRACTOR_TEXT,
  whenThisComesUp: when,
  sourceUrl: OLA,
  verifiedAt: V,
  consolidationPeriod: OLA_FROM,
});

const SNOW = { note: SNOW_NOTE, sourceUrl: OLA, verifiedAt: V, consolidationPeriod: OLA_FROM };
const SC_COURT = {
  note: SC_COURT_NOTE,
  sourceUrl: CJA,
  verifiedAt: V,
  consolidationPeriod: CJA_FROM,
  alsoCites: [
    { sourceUrl: OREG_626, pinpoint: "O. Reg. 626/00, s. 1(1)" },
    { sourceUrl: SC_GUIDE, pinpoint: "Small claims court: suing someone -- Overview; What you can sue for" },
  ],
};
const LIMITATION = { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: V, consolidationPeriod: LIMITATIONS_FROM };

const SC_REMEDIES = ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs", "sc-remedy-outside-jurisdiction"];

const CITE_OLA = (pinpoint: string) => ({
  sourceName: "Occupiers' Liability Act, R.S.O. 1990, c. O.2",
  officialUrl: OLA,
  verifiedAt: V,
  pinpoint,
});
const CITE_WALDICK = { sourceName: "Waldick v. Malcolm, [1991] 2 S.C.R. 456", officialUrl: WALDICK, verifiedAt: V };
const CITE_MUSTAPHA = (pinpoint: string) => ({
  sourceName: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
  officialUrl: MUSTAPHA,
  verifiedAt: V,
  pinpoint,
});
const CITE_CLEMENTS = { sourceName: "Clements v. Clements, 2012 SCC 32", officialUrl: CLEMENTS, verifiedAt: V, pinpoint: "paras. 8-9" };
const CITE_RYAN = { sourceName: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201", officialUrl: RYAN, verifiedAt: V, pinpoint: "para. 28" };
const CITE_NEG = { sourceName: "Negligence Act, R.S.O. 1990, c. N.1", officialUrl: NEGLIGENCE_ACT, verifiedAt: V, pinpoint: "s. 3" };
const CITE_CJA = { sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43", officialUrl: CJA, verifiedAt: V, pinpoint: "s. 23(1)" };
const CITE_626 = { sourceName: "O. Reg. 626/00 (Small Claims Court jurisdiction)", officialUrl: OREG_626, verifiedAt: V, pinpoint: "s. 1(1)" };
const CITE_LIM = {
  sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
  officialUrl: LIMITATIONS,
  verifiedAt: V,
  pinpoint: "ss. 4, 5(1), 5(2)",
};

export const TYPES_SC_INJURY_1: ClaimType[] = [
  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-fall-in-a-parking-lot-or-plaza",
    name: "A fall in a parking lot or plaza",
    courtArea: "small-claims",
    broughtBy:
      "A person who slipped, tripped or fell in a parking lot, plaza or shopping-centre walkway, suing the " +
      "owner, manager, store or snow-clearing contractor in charge of the area.",
    typicalDefendantProfile: "business",
    plaintiffElements: [
      {
        id: "who-is-occupier-scpark",
        name: "The person or business you are suing was an occupier of the lot or plaza",
        plainExplanation: OCCUPIER_TEXT,
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: OLA_FROM,
        evidenceCategories: [
          {
            name: "Who controlled the lot or plaza",
            why: "There can be more than one occupier: a landlord, a store, a property manager or a contractor.",
            examples: [
              "Signs in the lot naming the owner or property manager",
              "The name of the store or business nearest the spot",
              "Names on snow-clearing or maintenance trucks seen at the site",
            ],
          },
          {
            name: "Where it happened",
            why: "Shows the exact spot and what part of the property it was.",
            examples: ["Photos of the spot and the area around it", "A sketch or map with measurements"],
          },
        ],
      },
      {
        id: "reasonable-care-scpark",
        name: "The occupier did not take the care that was reasonable in the circumstances",
        plainExplanation: REASONABLE_CARE_TEXT,
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: OLA_FROM,
        alsoCites: [{ sourceUrl: WALDICK, pinpoint: WALDICK_PIN }],
        evidenceCategories: [HAZARD, WHAT_WAS_DONE],
      },
      DAMAGE_ELEMENT("scpark"),
    ],
    defendantConsiderations: [
      CONTRACTOR(
        "scpark",
        "When the owner or store says a snow-clearing, paving or maintenance contractor was in charge of the area.",
      ),
      CONTRIBUTORY_OLA(
        "scpark",
        "When the Defence says the person was not watching where they were going, or their footwear contributed.",
      ),
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-contributory-negligence",
      "defence-waiver-release-assumption-of-risk",
    ],
    remedies: SC_REMEDIES,
    proceduralNotes: [SNOW, SC_COURT, LIMITATION],
    signals: [
      "slipped on ice in a parking lot",
      "fell in the plaza parking lot",
      "tripped on a pothole in the parking lot",
      "fell on an unsalted walkway outside a store",
      "tripped over a curb stop",
      "the mall parking lot was not plowed",
      "fell outside the grocery store",
      "broken pavement in the plaza",
    ],
    citations: [
      CITE_OLA("ss. 1-3, 6, 6.1, 9(3)"),
      CITE_WALDICK,
      CITE_MUSTAPHA("paras. 8-9"),
      CITE_CLEMENTS,
      CITE_NEG,
      CITE_CJA,
      CITE_626,
      CITE_LIM,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-fall-at-a-rental-property",
    name: "A fall where you rent",
    courtArea: "small-claims",
    broughtBy:
      "A tenant, or a visitor to a rental building, who was hurt by a fall on stairs, in a hallway, on a " +
      "walkway or in the unit, suing the landlord or property manager.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "landlord-repair-duty-scrent",
        name: "The landlord was responsible for keeping the place in good repair",
        plainExplanation:
          "Under s. 20(1) of the Residential Tenancies Act, 2006, a landlord is responsible for providing and " +
          "maintaining a residential complex, including the rental units in it, in a good state of repair and " +
          "fit for habitation, and for complying with health, safety, housing and maintenance standards. Under " +
          "s. 20(2), this applies even if the tenant was aware of a state of non-repair or a contravention of a " +
          "standard before entering into the tenancy agreement. Under s. 2(1), a \"residential complex\" " +
          "includes all common areas and services and facilities available for the use of its residents.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        evidenceCategories: [
          {
            name: "The tenancy",
            why: "Shows who the landlord is and what the landlord took on.",
            examples: [
              "The lease or tenancy agreement",
              "Rent receipts or e-transfer records",
              "Notices from the landlord or property manager",
            ],
          },
          {
            name: "Repair requests",
            why: "Shows whether the landlord was told about the problem, and when.",
            examples: [
              "Emails, texts or letters asking for the repair",
              "Maintenance request forms or portal records",
              "Notes of phone calls with dates",
            ],
          },
        ],
      },
      {
        id: "landlord-as-occupier-scrent",
        name: "The danger came from the landlord's failure to carry out that responsibility",
        plainExplanation:
          "Under s. 8(1) of the Occupiers' Liability Act, where premises are occupied or used under a tenancy " +
          "under which the landlord is responsible for maintenance or repair, the landlord owes any person on " +
          "the premises the same duty of care, for dangers arising from any failure in carrying out that " +
          "responsibility, as the Act requires of an occupier. Under s. 8(2), a landlord is not deemed to have " +
          "defaulted toward a person unless the default is actionable at the suit of the person entitled to " +
          "possession of the premises. Under s. 8(3), obligations imposed by any enactment by virtue of a " +
          "tenancy are treated as imposed by the tenancy. Under s. 3(1), an occupier's duty is to take such " +
          "care as in all the circumstances of the case is reasonable to see that persons entering on the " +
          "premises are reasonably safe while on the premises.",
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: OLA_FROM,
        evidenceCategories: [
          HAZARD,
          {
            name: "How long the problem had been there",
            why: "Shows what the landlord knew or had been told before the fall.",
            examples: [
              "Dated photos of the broken step, railing, lighting or flooring",
              "Statements from other tenants who saw or reported it",
              "Inspection reports or orders from the city, if any",
            ],
          },
        ],
      },
      DAMAGE_ELEMENT("scrent"),
    ],
    defendantConsiderations: [
      CONTRIBUTORY_OLA(
        "scrent",
        "When the Defence says the tenant or visitor knew about the problem and was careless around it.",
      ),
      CONTRACTOR(
        "scrent",
        "When the landlord says a snow-clearing, cleaning or repair contractor did the work.",
      ),
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: SC_REMEDIES,
    proceduralNotes: [
      {
        note:
          "The Landlord and Tenant Board. Under s. 168(2) of the Residential Tenancies Act, 2006, the Board has " +
          "exclusive jurisdiction to determine all applications under the Act and with respect to all matters " +
          "in which jurisdiction is conferred on it by the Act. Under s. 29(1), paragraph 1, a tenant or former " +
          "tenant may apply to the Board for an order determining that the landlord has breached an obligation " +
          "under s. 20(1). Under s. 207(1), the Board may, where it otherwise has the jurisdiction, order " +
          "payment of up to the greater of $10,000 and the monetary jurisdiction of the Small Claims Court.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
      },
      SNOW,
      LIMITATION,
    ],
    signals: [
      "fell on the stairs in my apartment building",
      "the landlord never fixed the broken step",
      "slipped on ice in front of my rental",
      "the railing gave way and I fell",
      "tripped in the hallway because the light was out",
      "fell because of the loose carpet in my building",
      "hurt in my apartment because of a repair the landlord ignored",
      "visiting a friend's building and fell on the stairs",
    ],
    citations: [
      {
        sourceName: "Residential Tenancies Act, 2006, S.O. 2006, c. 17",
        officialUrl: RTA,
        verifiedAt: V,
        pinpoint: "ss. 2(1), 20, 29(1), 168(2), 207(1)",
      },
      CITE_OLA("ss. 3(1), 6, 6.1, 8, 9(3)"),
      CITE_MUSTAPHA("paras. 8-9"),
      CITE_CLEMENTS,
      CITE_NEG,
      CITE_LIM,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-fall-at-a-municipal-facility",
    name: "A fall at an arena, pool or park",
    courtArea: "small-claims",
    broughtBy:
      "A person hurt by a fall at a public arena, pool, community centre, library or park, suing the city, " +
      "town or other body that runs the facility.",
    typicalDefendantProfile: "business",
    plaintiffElements: [
      {
        id: "who-is-occupier-scmuni",
        name: "The city, town or operator was an occupier of the facility",
        plainExplanation: OCCUPIER_TEXT,
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: OLA_FROM,
        evidenceCategories: [
          {
            name: "Who ran the facility",
            why: "A facility may be owned by a municipality and run by a board, club or company.",
            examples: [
              "Signs, receipts or program registrations naming the operator",
              "The facility's website or posted notices",
              "Names of staff or supervisors on duty",
            ],
          },
          {
            name: "Where it happened",
            why: "Shows the exact spot inside the facility or park.",
            examples: ["Photos of the spot and the area around it", "A sketch or map with measurements"],
          },
        ],
      },
      {
        id: "reasonable-care-scmuni",
        name: "The occupier did not take the care that was reasonable in the circumstances",
        plainExplanation: REASONABLE_CARE_TEXT,
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: OLA_FROM,
        alsoCites: [{ sourceUrl: WALDICK, pinpoint: WALDICK_PIN }],
        evidenceCategories: [HAZARD, WHAT_WAS_DONE],
      },
      DAMAGE_ELEMENT("scmuni"),
    ],
    defendantConsiderations: [
      {
        id: "free-recreational-entry-scmuni",
        name: "Free entry for recreation on certain kinds of land",
        plainExplanation:
          "Under s. 4(3) of the Occupiers' Liability Act, a person who enters premises described in s. 4(4) is " +
          "deemed to have willingly assumed all risks, and is owed the duty in s. 4(1), where (among other " +
          "cases) the entry is for the purpose of a recreational activity, no fee is paid for the entry or " +
          "activity (other than a benefit or payment received from a government or government agency or a " +
          "non-profit recreation club or association), and the person is not being provided with living " +
          "accommodation by the occupier. The premises in s. 4(4) include rural premises that are vacant, " +
          "undeveloped, forested or wilderness premises; golf courses when not open for playing; and " +
          "recreational trails reasonably marked by notice as such. Under s. 4(3.1), a fee charged for a " +
          "purpose incidental to the entry or activity, such as for parking, is not a fee for entry.",
        whenThisComesUp:
          "When the fall happened on a trail, wooded area or open land rather than inside a building, and no " +
          "fee was paid to be there.",
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: OLA_FROM,
      },
      {
        id: "sidewalk-or-road-scmuni",
        name: "The fall was on a public sidewalk or road, not at the facility",
        plainExplanation:
          "Under s. 10(2) of the Occupiers' Liability Act, the Act does not apply to any municipal corporation " +
          "where it is an occupier of a public highway or a public road. Under s. 44(9) of the Municipal Act, " +
          "2001, except in case of gross negligence, a municipality is not liable for a personal injury caused " +
          "by snow or ice on a sidewalk. Under s. 44(2), a municipality that defaults in keeping a highway or " +
          "bridge it has jurisdiction over in a reasonable state of repair (s. 44(1)) is, subject to the " +
          "Negligence Act, liable for all damages any person sustains because of the default. Under s. 44(10), " +
          "no action can be brought for damages under s. 44(2) unless, within 10 days after the injury, written notice of the claim and of the injury, including " +
          "the date, time and location of the occurrence, has been served on or sent by registered mail to the " +
          "clerk of the municipality.",
        whenThisComesUp:
          "When the fall happened on the sidewalk or road leading to the facility rather than on the " +
          "facility's own grounds.",
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: OLA_FROM,
        alsoCites: [{ sourceUrl: MUNICIPAL_ACT, pinpoint: "Municipal Act, 2001, s. 44(1), (2), (9), (10)" }],
      },
      CONTRIBUTORY_OLA(
        "scmuni",
        "When the Defence says the person ignored a posted rule or was not watching where they were going.",
      ),
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-contributory-negligence",
      "defence-waiver-release-assumption-of-risk",
    ],
    remedies: SC_REMEDIES,
    proceduralNotes: [SNOW, SC_COURT, LIMITATION],
    signals: [
      "fell at the city arena",
      "slipped on the pool deck",
      "tripped at the community centre",
      "fell in a city park",
      "hurt at the municipal pool",
      "slipped on ice outside the rec centre",
      "broken bleachers at the arena",
      "fell on the playground at the park",
    ],
    citations: [
      CITE_OLA("ss. 1-4, 9(3), 10(2), 6.1"),
      { sourceName: "Municipal Act, 2001, S.O. 2001, c. 25", officialUrl: MUNICIPAL_ACT, verifiedAt: V, pinpoint: "s. 44(1), (2), (9), (10)" },
      CITE_WALDICK,
      CITE_MUSTAPHA("paras. 8-9"),
      CITE_CLEMENTS,
      CITE_NEG,
      CITE_CJA,
      CITE_626,
      CITE_LIM,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-injury-at-a-business-or-event",
    name: "An injury at a shop, restaurant or event",
    courtArea: "small-claims",
    broughtBy:
      "A customer or guest hurt inside a store, restaurant, bar, hotel, concert or other event, suing the " +
      "business or organizer in charge of the place.",
    typicalDefendantProfile: "business",
    plaintiffElements: [
      {
        id: "who-is-occupier-scbiz",
        name: "The business or organizer was an occupier of the place",
        plainExplanation: OCCUPIER_TEXT,
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: OLA_FROM,
        evidenceCategories: [
          {
            name: "Who ran the place or event",
            why: "A store, a landlord, an event organizer and a venue can each be an occupier.",
            examples: [
              "Receipts, tickets or a reservation showing the business name",
              "Event posters, websites or programs naming the organizer",
              "Names of staff or managers on duty",
            ],
          },
          {
            name: "Where it happened",
            why: "Shows the exact spot inside the premises.",
            examples: ["Photos of the spot and the area around it", "A sketch of the room or aisle"],
          },
        ],
      },
      {
        id: "reasonable-care-scbiz",
        name: "The occupier did not take the care that was reasonable in the circumstances",
        plainExplanation: REASONABLE_CARE_TEXT,
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: OLA_FROM,
        alsoCites: [{ sourceUrl: WALDICK, pinpoint: WALDICK_PIN }],
        evidenceCategories: [
          HAZARD,
          WHAT_WAS_DONE,
          {
            name: "Video",
            why: "Stores and venues often have cameras that show the hazard and the fall.",
            examples: [
              "A written request to keep security video, sent soon after",
              "Video or photos taken by you or other guests",
            ],
          },
        ],
      },
      DAMAGE_ELEMENT("scbiz"),
    ],
    defendantConsiderations: [
      WILLING(
        "scbiz",
        "When the Defence points to a sign, the back of a ticket, or a waiver signed at the door.",
      ),
      CONTRIBUTORY_OLA(
        "scbiz",
        "When the Defence says the person was not watching where they were going, or had been drinking.",
      ),
      CONTRACTOR(
        "scbiz",
        "When the business says a cleaning, security or event-setup contractor was responsible.",
      ),
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-contributory-negligence",
      "defence-waiver-release-assumption-of-risk",
    ],
    remedies: SC_REMEDIES,
    proceduralNotes: [SNOW, SC_COURT, LIMITATION],
    signals: [
      "slipped on a wet floor in a store",
      "fell in a restaurant",
      "something fell off a shelf and hit me",
      "hurt at a concert",
      "tripped over a cord at an event",
      "injured at a hotel",
      "no wet floor sign and I fell",
      "fell down the stairs at a bar",
    ],
    citations: [
      CITE_OLA("ss. 1-6, 6.1, 9(3)"),
      CITE_WALDICK,
      CITE_MUSTAPHA("paras. 8-9"),
      CITE_CLEMENTS,
      CITE_NEG,
      CITE_CJA,
      CITE_626,
      CITE_LIM,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-food-poisoning",
    name: "Food poisoning",
    courtArea: "small-claims",
    broughtBy:
      "A person who became ill after eating food or drink bought from a restaurant, store, caterer or food " +
      "maker, suing the business that made or sold it.",
    typicalDefendantProfile: "business",
    plaintiffElements: [
      {
        id: "duty-and-breach-scfood",
        name: "The business owed a duty of care in making or supplying the food, and fell below the standard",
        plainExplanation:
          NEGLIGENCE_ELEMENTS_TEXT +
          " In the same decision, the Court said it has long been established that the manufacturer of a " +
          "consumable good owes a duty of care to the ultimate consumer of that good (para. 6). " +
          STANDARD_OF_CARE_TEXT,
        sourceUrl: MUSTAPHA,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "What was eaten, where and when",
            why: "Ties the illness to a particular meal or product.",
            examples: [
              "The receipt, order confirmation or delivery record",
              "Photos of the food, its packaging and any lot or best-before code",
              "Names of others who ate the same food, and whether they became ill",
            ],
          },
          {
            name: "Anything showing how the food was handled",
            why: "The standard of care can be measured against practice and regulatory standards.",
            examples: [
              "A public health inspection report or notice for the business",
              "A product recall notice",
              "Leftover food kept sealed and cold",
            ],
          },
        ],
      },
      {
        id: "sale-of-goods-scfood",
        name: "If you bought it: the food was not of merchantable quality or fit for its purpose",
        plainExplanation: SALE_OF_GOODS_TEXT,
        sourceUrl: SGA,
        verifiedAt: V,
        consolidationPeriod: SGA_FROM,
        alsoCites: [{ sourceUrl: CPA, pinpoint: "Consumer Protection Act, 2002, s. 9(2), (3)" }],
        evidenceCategories: [
          {
            name: "Proof of purchase",
            why: "The Sale of Goods Act conditions are part of a sale between buyer and seller.",
            examples: ["A receipt, card statement or app order history", "The menu or product listing"],
          },
          {
            name: "The food itself",
            why: "Shows what was wrong with what was sold.",
            examples: ["Photos of the food and packaging", "Any lab or public health test result"],
          },
        ],
      },
      {
        id: "illness-and-cause-scfood",
        name: "You became ill, and the illness came from the food",
        plainExplanation: DAMAGE_AND_CAUSE_TEXT,
        sourceUrl: MUSTAPHA,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: CLEMENTS, pinpoint: CLEMENTS_PIN }],
        evidenceCategories: [
          {
            name: "Medical records",
            why: "Shows the illness, when it started and what it was put down to.",
            examples: [
              "Emergency, clinic or doctor's notes",
              "Lab results, such as a stool test",
              "A report to or from public health",
            ],
          },
          LOSS_RECORDS,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "remoteness-scfood",
        name: "Whether the harm is too remote from what went wrong",
        plainExplanation:
          "In Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, the Supreme Court of Canada said the remoteness " +
          "inquiry asks whether the harm is too unrelated to the wrongful conduct to hold the defendant fairly " +
          "liable (para. 12), and that the question is what a person of ordinary fortitude would suffer " +
          "(para. 14). In that case, the plaintiff sued for psychiatric injury sustained as a result of " +
          "seeing dead flies in a bottle of water supplied by the defendant (para. 1); the Court said his " +
          "damage was too remote to allow recovery (para. 3).",
        whenThisComesUp:
          "When the harm claimed is distress or a reaction to finding something in the food, rather than " +
          "illness from eating it.",
        sourceUrl: MUSTAPHA,
        verifiedAt: V,
      },
      {
        id: "who-bought-scfood",
        name: "The person who became ill was not the buyer",
        plainExplanation:
          "Section 15 of the Sale of Goods Act speaks of goods supplied under a contract of sale, and of the " +
          "buyer and the seller. Under s. 1(1), \"buyer\" means the person who buys or agrees to buy goods. " +
          "A claim in negligence does not depend on a sale: in Mustapha v. Culligan of Canada Ltd., 2008 SCC " +
          "27, para. 6, the Court said the manufacturer of a consumable good owes a duty of care to the " +
          "ultimate consumer of that good.",
        whenThisComesUp: "When someone else paid for the meal or bought the food.",
        sourceUrl: SGA,
        verifiedAt: V,
        consolidationPeriod: SGA_FROM,
        alsoCites: [{ sourceUrl: MUSTAPHA, pinpoint: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, para. 6" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: SC_REMEDIES,
    proceduralNotes: [SC_COURT, LIMITATION],
    signals: [
      "got food poisoning from a restaurant",
      "sick after eating takeout",
      "found something in my food",
      "the chicken was undercooked and I got sick",
      "food from the grocery store made me ill",
      "ended up in hospital after eating there",
      "the caterer's food made our guests sick",
      "the product was recalled after I got sick",
    ],
    citations: [
      CITE_MUSTAPHA("paras. 1, 3, 6, 8-9, 12, 14"),
      CITE_RYAN,
      CITE_CLEMENTS,
      { sourceName: "Sale of Goods Act, R.S.O. 1990, c. S.1", officialUrl: SGA, verifiedAt: V, pinpoint: "ss. 1(1), 15" },
      { sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A", officialUrl: CPA, verifiedAt: V, pinpoint: "s. 9(2), (3)" },
      CITE_CJA,
      CITE_626,
      CITE_LIM,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-injury-at-a-gym-or-sport",
    name: "An injury at a gym or playing sport",
    courtArea: "small-claims",
    broughtBy:
      "A person hurt at a gym, fitness class, climbing or trampoline centre, or while playing a sport, suing " +
      "the facility, the organizer, or the person whose conduct caused the injury.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "facility-care-scgym",
        name: "Against the facility: it did not take reasonable care to keep people reasonably safe",
        plainExplanation: OCCUPIER_TEXT + " " + REASONABLE_CARE_TEXT,
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: OLA_FROM,
        alsoCites: [{ sourceUrl: WALDICK, pinpoint: WALDICK_PIN }],
        evidenceCategories: [
          {
            name: "The equipment or condition",
            why: "Shows what failed or what was unsafe.",
            examples: [
              "Photos of the machine, mat, floor or field",
              "An incident report made with the facility",
              "Maintenance or inspection records (asked for in writing)",
            ],
          },
          {
            name: "Supervision and instruction",
            why: "Shows what the facility or organizer did to keep the activity safe.",
            examples: [
              "Class or program descriptions and posted rules",
              "Names of instructors, coaches or staff present",
              "Witness statements",
            ],
          },
        ],
      },
      {
        id: "person-negligence-scgym",
        name: "Against another person: their careless conduct caused the injury",
        plainExplanation: NEGLIGENCE_ELEMENTS_TEXT + " " + STANDARD_OF_CARE_TEXT,
        sourceUrl: RYAN,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: MUSTAPHA, pinpoint: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, para. 3" }],
        evidenceCategories: [
          {
            name: "What the other person did",
            why: "Shows the conduct said to fall below what a reasonable person would do in the same circumstances.",
            examples: [
              "Video of the game or session",
              "Statements from teammates, opponents, referees or other members",
              "League rules or the facility's posted rules",
            ],
          },
          {
            name: "Who the person is",
            why: "A claim needs the person's full name and address.",
            examples: ["Team rosters or registration records", "Messages exchanged after the injury"],
          },
        ],
      },
      DAMAGE_ELEMENT("scgym"),
    ],
    defendantConsiderations: [
      WILLING(
        "scgym",
        "When the Defence points to a waiver signed when joining, a posted sign, or says the risk was part of the sport.",
      ),
      CONTRIBUTORY_OLA(
        "scgym",
        "When the Defence says the person ignored instructions or used equipment the wrong way.",
      ),
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-contributory-negligence",
      "defence-waiver-release-assumption-of-risk",
    ],
    remedies: SC_REMEDIES,
    proceduralNotes: [SC_COURT, LIMITATION],
    signals: [
      "hurt at the gym",
      "a gym machine broke while I was using it",
      "injured in a fitness class",
      "hurt at a trampoline park",
      "another player injured me",
      "injured playing hockey",
      "I signed a waiver at the gym but got hurt",
      "the personal trainer pushed me too hard and I got hurt",
    ],
    citations: [
      CITE_OLA("ss. 1-5, 9(3)"),
      CITE_WALDICK,
      CITE_MUSTAPHA("paras. 3, 8-9"),
      CITE_RYAN,
      CITE_CLEMENTS,
      CITE_NEG,
      CITE_CJA,
      CITE_626,
      CITE_LIM,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-injury-from-a-defective-product",
    name: "An injury caused by a product",
    courtArea: "small-claims",
    broughtBy:
      "A person hurt by something they bought or used -- an appliance, tool, toy, piece of furniture or " +
      "other product -- suing the seller, the maker, or both.",
    typicalDefendantProfile: "business",
    plaintiffElements: [
      {
        id: "negligence-scprod",
        name: "The maker or seller owed a duty of care and fell below the standard",
        plainExplanation: NEGLIGENCE_ELEMENTS_TEXT + " " + STANDARD_OF_CARE_TEXT,
        sourceUrl: MUSTAPHA,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "The product",
            why: "Shows what the product is, who made it and what went wrong.",
            examples: [
              "The product itself, kept as it was after the injury",
              "Photos of the product, its labels, model and serial number",
              "The instructions, warnings and packaging",
            ],
          },
          {
            name: "Outside indicators of reasonable conduct",
            why: "Custom, industry practice and regulatory standards can show what reasonable care was.",
            examples: [
              "A recall notice or safety warning for the product",
              "Complaints or reviews describing the same failure",
              "Messages with the maker or seller about the problem",
            ],
          },
        ],
      },
      {
        id: "sale-of-goods-scprod",
        name: "If you bought it: the product was not of merchantable quality or fit for its purpose",
        plainExplanation: SALE_OF_GOODS_TEXT,
        sourceUrl: SGA,
        verifiedAt: V,
        consolidationPeriod: SGA_FROM,
        alsoCites: [{ sourceUrl: CPA, pinpoint: "Consumer Protection Act, 2002, s. 9(2), (3)" }],
        evidenceCategories: [
          {
            name: "Proof of purchase",
            why: "The Sale of Goods Act conditions are part of a sale between buyer and seller.",
            examples: ["A receipt, invoice or card statement", "The product listing or advertisement"],
          },
          {
            name: "What the seller was told",
            why: "The fitness condition depends on the buyer making the purpose known and relying on the seller.",
            examples: ["Messages or notes of what you told the seller you needed it for", "Names of staff you spoke to"],
          },
        ],
      },
      {
        id: "damage-and-cause-scprod",
        name: "You were hurt, and the harm came from the product",
        plainExplanation: DAMAGE_AND_CAUSE_TEXT,
        sourceUrl: MUSTAPHA,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: CLEMENTS, pinpoint: CLEMENTS_PIN }],
        evidenceCategories: [INJURY_RECORDS, LOSS_RECORDS],
      },
    ],
    defendantConsiderations: [
      {
        id: "examined-or-trade-name-scprod",
        name: "The buyer examined the goods, or bought a named brand for a particular purpose",
        plainExplanation:
          "Under s. 15, paragraph 2, of the Sale of Goods Act, if the buyer has examined the goods, there is no " +
          "implied condition of merchantable quality as regards defects that the examination ought to have " +
          "revealed. Under paragraph 1, in the case of a contract for the sale of a specified article under its " +
          "patent or other trade name, there is no implied condition as to its fitness for any particular " +
          "purpose. Under s. 9(3) of the Consumer Protection Act, 2002, any term or acknowledgement that " +
          "purports to negate or vary an implied condition or warranty under the Sale of Goods Act is void.",
        whenThisComesUp:
          "When the seller says the buyer inspected the product before buying, or asked for it by brand name.",
        sourceUrl: SGA,
        verifiedAt: V,
        consolidationPeriod: SGA_FROM,
        alsoCites: [{ sourceUrl: CPA, pinpoint: "Consumer Protection Act, 2002, s. 9(3)" }],
      },
      {
        id: "contributory-negligence-scprod",
        name: "The injured person's own use of the product is said to have contributed",
        plainExplanation: CONTRIBUTORY_NEG_TEXT,
        whenThisComesUp:
          "When the Defence says the product was misused, modified, or used against its instructions or warnings.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: V,
        consolidationPeriod: NEGLIGENCE_FROM,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: SC_REMEDIES,
    proceduralNotes: [SC_COURT, LIMITATION],
    signals: [
      "a product I bought injured me",
      "the appliance caught fire and burned me",
      "the ladder broke and I fell",
      "the chair collapsed under me",
      "a defective toy hurt my child",
      "the product was recalled after it hurt me",
      "the battery exploded",
      "the tool broke apart while I was using it",
    ],
    citations: [
      CITE_MUSTAPHA("paras. 3, 8-9"),
      CITE_RYAN,
      CITE_CLEMENTS,
      { sourceName: "Sale of Goods Act, R.S.O. 1990, c. S.1", officialUrl: SGA, verifiedAt: V, pinpoint: "s. 15" },
      { sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A", officialUrl: CPA, verifiedAt: V, pinpoint: "s. 9(2), (3)" },
      CITE_NEG,
      CITE_CJA,
      CITE_626,
      CITE_LIM,
    ],
    reviewedAt: null,
    status: "draft",
  },
];
