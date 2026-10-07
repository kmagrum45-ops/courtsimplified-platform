/**
 * Case types, batch "sc-injury-2" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-injury-2.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-injury-from-a-falling-object -- An injury from a falling object or a building site
 *   sc-claim-injury-at-school-or-daycare -- An injury at school or daycare
 *   sc-claim-injury-on-public-transit -- An injury on public transit
 *   sc-claim-escooter-bicycle-or-pedestrian-collision -- An e-scooter, bicycle or pedestrian collision
 *   sc-claim-minor-assault-or-battery -- Being hit or attacked by someone
 *   sc-claim-injury-from-a-cosmetic-procedure -- An injury from a salon, spa or cosmetic procedure
 *   sc-claim-professional-negligence-medical-or-dental -- Harm from medical, dental or other professional care
 *
 * Six of the seven are written. Every legal statement comes from the saved
 * text of the Occupiers' Liability Act, Negligence Act, Limitations Act, 2002,
 * Courts of Justice Act, O. Reg. 626/00, the Rules of the Small Claims Court,
 * the Highway Traffic Act, the Municipal Act, 2001, the Consumer Protection
 * Act, 2002 and O. Reg. 17/05, the Personal Health Information Protection
 * Act, the ontario.ca Small Claims guide, and six saved Supreme Court of
 * Canada decisions (Mustapha, Clements, Waldick, Ryan, Myers, Snell) -- each
 * of which has a public page in publicSourceUrl.ts.
 *
 * NOT WRITTEN: sc-claim-minor-assault-or-battery. As civil-1 found for
 * civil-claim-assault-and-battery, nothing saved in this repository says what
 * a civil claim for assault or battery requires. The Limitations Act, 2002
 * defines "assault" to include a battery (s. 1) and deals with the limitation
 * period for some assault claims (s. 16), and the Criminal Code defines the
 * criminal offence, but none of that states the elements of the civil wrong.
 *
 * Deliberately left out: nothing saved states a special standard of care for
 * doctors, dentists or other professionals, so the professional-care entry
 * states the general standard from Ryan and the causation reasoning from
 * Snell v. Farrell, and says no more. Nothing saved says whether an e-scooter
 * is a "motor vehicle" under the Highway Traffic Act, so the collision entry
 * applies ss. 192-193 only "if a motor vehicle was involved". The Insurance
 * Act limits on suing for a motor-vehicle injury (s. 267.5) were not read for
 * this batch and are not described.
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
const SC_RULES = "https://www.ontario.ca/laws/docs/980258_e.doc";
const SC_RULES_FROM = "2025-10-14";
const HTA = "https://www.ontario.ca/laws/docs/90h08_e.doc";
const HTA_FROM = "2026-07-01";
const MUNICIPAL_ACT = "https://www.ontario.ca/laws/docs/01m25_e.doc";
const CPA = "https://www.ontario.ca/laws/docs/02c30_e.doc";
const CPA_FROM = "2025-12-11";
const OREG_17_05 = "https://www.ontario.ca/laws/docs/050017_e.doc";
const OREG_17_05_FROM = "2026-06-10";
const PHIPA = "https://www.ontario.ca/laws/docs/04p03_e.doc";
const PHIPA_FROM = "2026-01-01";
const SC_GUIDE = "https://www.ontario.ca/page/suing-someone-small-claims-court";

const MUSTAPHA = "docs/sources/decisions/mustapha-v-culligan-2008-SCC-27.english.txt";
const CLEMENTS = "docs/sources/decisions/clements-v-clements-2012-SCC-32.english.txt";
const WALDICK = "docs/sources/decisions/waldick-v-malcolm-1991-2-SCR-456.html.txt";
const RYAN = "docs/sources/decisions/ryan-v-victoria-city-1999-1-SCR-201.english.txt";
const MYERS = "docs/sources/decisions/myers-v-peel-county-board-of-education-1981-2-SCR-21.html.txt";
const SNELL = "docs/sources/decisions/snell-v-farrell-1990-2-SCR-311.html.txt";

const WALDICK_PIN = "Waldick v. Malcolm, [1991] 2 S.C.R. 456 (reasons of Iacobucci J. for the Court)";
const CLEMENTS_PIN = "Clements v. Clements, 2012 SCC 32, paras. 8-9";
const MUSTAPHA_PIN = "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, para. 3";
const RYAN_PIN = "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, paras. 28-29";
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

const STATUTE_BREACH_TEXT =
  "The Court added that legislative standards are relevant to the common law standard of care, but the two " +
  "are not necessarily the same: a statutory breach does not automatically give rise to civil liability; " +
  "it is merely some evidence of negligence. By the same token, mere compliance with a statute does not, " +
  "in and of itself, preclude a finding of civil liability (para. 29).";

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

const SEVERAL_AT_FAULT_TEXT =
  "Under s. 1 of the Negligence Act, where damages have been caused or contributed to by the fault or " +
  "neglect of two or more persons, the court shall determine the degree in which each is at fault or " +
  "negligent; where two or more are found at fault or negligent, they are jointly and severally liable to " +
  "the person suffering the loss, and as between themselves each must contribute in the degree of their " +
  "own fault. Under s. 4, if it is not practicable to determine the respective degree of fault as between " +
  "parties, they are deemed to be equally at fault. Under s. 5, a person not already a party who is or may " +
  "be wholly or partly responsible for the damages may be added as a defendant or made a third party.";

const CONTRACTOR_TEXT =
  "Under s. 6(1) of the Occupiers' Liability Act, where damage is caused by the negligence of an " +
  "independent contractor employed by the occupier, the occupier is not on that account liable if in all " +
  "the circumstances the occupier acted reasonably in entrusting the work to the contractor, took such " +
  "steps, if any, as it reasonably ought to be satisfied that the contractor was competent and the work " +
  "had been properly done, and it was reasonable that the work should have been undertaken. Under s. 6(3), " +
  "nothing in the section affects any duty of the occupier that is non-delegable at common law.";

const WILLING_TEXT =
  "Under s. 4(1) of the Occupiers' Liability Act, the s. 3(1) duty does not apply to risks willingly " +
  "assumed by the person who enters on the premises; in that case the occupier still owes a duty not to " +
  "create a danger with the deliberate intent of doing harm or damage, and not to act with reckless " +
  "disregard of the person's presence. Under s. 3(3), the duty applies except in so far as the occupier is " +
  "free to and does restrict, modify or exclude it; under s. 5(3), where the occupier is free to do so, the " +
  "occupier shall take reasonable steps to bring the restriction to the attention of the person to whom " +
  "the duty is owed.";

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

const CHILD_LIMITATION_NOTE =
  LIMITATION_NOTE +
  " For a child: under s. 6, the limitation period in s. 4 does not run during any time in which the " +
  "person with the claim is a minor and is not represented by a litigation guardian in relation to the " +
  "claim. Under s. 8, if the person is represented by a litigation guardian, s. 5 applies as if the " +
  "litigation guardian were the person with the claim.";

const CHILD_PARTY_NOTE =
  "A child's claim is brought by a litigation guardian. Under rule 4.01(1) of the Rules of the Small Claims " +
  "Court, an action by a person under disability -- which under rule 1.02(1) includes a minor -- shall be " +
  "commenced or continued by a litigation guardian, except that under rule 4.01(2) a minor may sue for any " +
  "sum not exceeding $500 as if of full age. Under rule 4.01(3), the litigation guardian files a consent " +
  "(Form 4A). Under rule 4.03(2)(a), for a minor, the parent or person with lawful custody or another " +
  "suitable person shall be the litigation guardian. Under rule 4.07, no settlement of a claim made by a " +
  "person under disability is binding on the person without the approval of the court; under rule " +
  "4.08(1), money payable to the person under an order or settlement shall be paid into court unless the " +
  "court orders otherwise.";

const SIDEWALK_TEXT =
  "Under s. 10(2) of the Occupiers' Liability Act, the Act does not apply to any municipal corporation " +
  "where it is an occupier of a public highway or a public road. Under s. 44(9) of the Municipal Act, " +
  "2001, except in case of gross negligence, a municipality is not liable for a personal injury caused " +
  "by snow or ice on a sidewalk. Under s. 44(2), a municipality that defaults in keeping a highway or " +
  "bridge it has jurisdiction over in a reasonable state of repair (s. 44(1)) is, subject to the " +
  "Negligence Act, liable for all damages any person sustains because of the default. Under s. 44(10), " +
  "no action can be brought for damages under s. 44(2) unless, within 10 days after the injury, written " +
  "notice of the claim and of the injury, including the date, time and location of the occurrence, has " +
  "been served on or sent by registered mail to the clerk of the municipality.";

const CPA_EXEMPT_TEXT =
  "Under s. 2(2)(e) of the Consumer Protection Act, 2002, the Act does not apply in respect of prescribed " +
  "professional services that are regulated under a statute of Ontario. Under s. 1 of O. Reg. 17/05, a " +
  "professional service provided by a person governed by, or subject to, any of the listed Acts is exempt " +
  "from the Consumer Protection Act, 2002; the list includes the Regulated Health Professions Act, 1991 and " +
  "any Act named in Schedule 1 to it, and the Veterinarians Act. Under s. 2, a professional service " +
  "provided at a hospital under the Public Hospitals Act, or at a pharmacy under Part VI of the Drug and " +
  "Pharmacies Regulation Act, is also exempt.";

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

const DAMAGE_ELEMENT = (suffix: string, name = "You were hurt, and the harm came from what happened") => ({
  id: `damage-and-cause-${suffix}`,
  name,
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

const CONTRIBUTORY_NEG = (suffix: string, when: string) => ({
  id: `contributory-negligence-${suffix}`,
  name: "The injured person's own carelessness is said to have contributed",
  plainExplanation: CONTRIBUTORY_NEG_TEXT,
  whenThisComesUp: when,
  sourceUrl: NEGLIGENCE_ACT,
  verifiedAt: V,
  consolidationPeriod: NEGLIGENCE_FROM,
});

const SEVERAL_AT_FAULT = (suffix: string, when: string) => ({
  id: `more-than-one-at-fault-${suffix}`,
  name: "More than one person is said to be at fault",
  plainExplanation: SEVERAL_AT_FAULT_TEXT,
  whenThisComesUp: when,
  sourceUrl: NEGLIGENCE_ACT,
  verifiedAt: V,
  consolidationPeriod: NEGLIGENCE_FROM,
});

const PERSON_NEGLIGENCE = (
  suffix: string,
  name: string,
  evidenceCategories: { name: string; why: string; examples: string[] }[],
  withStatute = false,
) => ({
  id: `negligence-${suffix}`,
  name,
  plainExplanation:
    NEGLIGENCE_ELEMENTS_TEXT + " " + STANDARD_OF_CARE_TEXT + (withStatute ? " " + STATUTE_BREACH_TEXT : ""),
  sourceUrl: RYAN,
  verifiedAt: V,
  alsoCites: [{ sourceUrl: MUSTAPHA, pinpoint: MUSTAPHA_PIN }],
  evidenceCategories,
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
const CITE_RYAN = (pinpoint: string) => ({
  sourceName: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201",
  officialUrl: RYAN,
  verifiedAt: V,
  pinpoint,
});
const CITE_NEG = (pinpoint: string) => ({
  sourceName: "Negligence Act, R.S.O. 1990, c. N.1",
  officialUrl: NEGLIGENCE_ACT,
  verifiedAt: V,
  pinpoint,
});
const CITE_CJA = { sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43", officialUrl: CJA, verifiedAt: V, pinpoint: "s. 23(1)" };
const CITE_626 = { sourceName: "O. Reg. 626/00 (Small Claims Court jurisdiction)", officialUrl: OREG_626, verifiedAt: V, pinpoint: "s. 1(1)" };
const CITE_LIM = (pinpoint = "ss. 4, 5(1), 5(2)") => ({
  sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
  officialUrl: LIMITATIONS,
  verifiedAt: V,
  pinpoint,
});
const CITE_HTA = {
  sourceName: "Highway Traffic Act, R.S.O. 1990, c. H.8",
  officialUrl: HTA,
  verifiedAt: V,
  pinpoint: "ss. 192(1), (2), 193(1), (2), (5)",
};
const CITE_CPA = (pinpoint: string) => ({
  sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
  officialUrl: CPA,
  verifiedAt: V,
  pinpoint,
});
const CITE_17_05 = {
  sourceName: "O. Reg. 17/05 (General regulation under the Consumer Protection Act, 2002)",
  officialUrl: OREG_17_05,
  verifiedAt: V,
  pinpoint: "ss. 1, 2",
};

export const TYPES_SC_INJURY_2: ClaimType[] = [
  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-injury-from-a-falling-object",
    name: "An injury from a falling object or a building site",
    courtArea: "small-claims",
    broughtBy:
      "A person hit by something that fell from a building, balcony, roof, shelf or scaffold, or hurt on or " +
      "beside a construction or renovation site, suing the owner, builder, contractor or person responsible.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "who-is-occupier-scobj",
        name: "The person or business you are suing was an occupier of the place the object fell from or where you were hurt",
        plainExplanation: OCCUPIER_TEXT,
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: OLA_FROM,
        evidenceCategories: [
          {
            name: "Who controlled the building or site",
            why: "There can be more than one occupier: an owner, a builder, a contractor or a tenant.",
            examples: [
              "Site signs or building permits naming the owner or builder",
              "Names on trucks, fencing or equipment at the site",
              "The name of the business or landlord at the address",
            ],
          },
          {
            name: "Where it happened",
            why: "Shows where you were and where the object came from.",
            examples: ["Photos of the spot, the building and the object", "A sketch with measurements"],
          },
        ],
      },
      {
        id: "reasonable-care-scobj",
        name: "The occupier did not take the care that was reasonable in the circumstances",
        plainExplanation: REASONABLE_CARE_TEXT,
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: OLA_FROM,
        alsoCites: [{ sourceUrl: WALDICK, pinpoint: WALDICK_PIN }],
        evidenceCategories: [
          {
            name: "The object and how it fell",
            why: "Shows the condition or activity that caused the harm.",
            examples: [
              "The object itself, or photos of it",
              "Photos or video of the building, shelf, scaffold or work area",
              "Witness names and statements",
            ],
          },
          {
            name: "What was done to keep people safe",
            why: "What is reasonable depends on the circumstances, including barriers, warnings and upkeep.",
            examples: [
              "Photos showing fencing, covered walkways or warning signs, or that there were none",
              "Earlier complaints about loose material, ice or falling debris",
              "An incident report made with the owner, builder or store",
            ],
          },
        ],
      },
      PERSON_NEGLIGENCE(
        "scobj",
        "If you were not on their property: their careless conduct caused the injury",
        [
          {
            name: "What the person or business did",
            why: "Shows the conduct said to fall below what a reasonable person would do in the same circumstances.",
            examples: [
              "Photos or video of the work being done",
              "Statements from people who saw it",
              "Any notice or order from the city about the site, if one exists",
            ],
          },
          {
            name: "Who is responsible",
            why: "A claim needs the full name and address of each person or business sued.",
            examples: ["Business names from signs, trucks or invoices", "Messages exchanged after the injury"],
          },
        ],
        true,
      ),
      DAMAGE_ELEMENT("scobj"),
    ],
    defendantConsiderations: [
      CONTRACTOR(
        "scobj",
        "When the owner says a builder, roofer or other contractor was doing the work that caused the harm.",
      ),
      SEVERAL_AT_FAULT(
        "scobj",
        "When an owner, a general contractor and a subcontractor each say someone else was responsible.",
      ),
      CONTRIBUTORY_OLA(
        "scobj",
        "When the Defence says the person ignored a barrier or sign, or entered a closed work area.",
      ),
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: SC_REMEDIES,
    proceduralNotes: [SNOW, SC_COURT, LIMITATION],
    signals: [
      "something fell off a building and hit me",
      "ice fell off the roof onto me",
      "hit by debris from a construction site",
      "a brick fell from the scaffolding",
      "a box fell off a high shelf onto my head",
      "something fell from a balcony and hit me",
      "hurt walking past a renovation",
      "tripped over materials left by the contractor",
    ],
    citations: [
      CITE_OLA("ss. 1-3, 6, 6.1, 9(3)"),
      CITE_WALDICK,
      CITE_MUSTAPHA("paras. 3, 8-9"),
      CITE_RYAN("paras. 28-29"),
      CITE_CLEMENTS,
      CITE_NEG("ss. 1, 3, 4, 5"),
      CITE_CJA,
      CITE_626,
      CITE_LIM(),
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-injury-at-school-or-daycare",
    name: "An injury at school or daycare",
    courtArea: "small-claims",
    broughtBy:
      "A parent or guardian, on behalf of a child hurt at school, daycare, a school trip or a program, suing " +
      "the school board, daycare operator or program; or an older student suing for their own injury.",
    typicalDefendantProfile: "business",
    plaintiffElements: [
      {
        id: "supervision-standard-scschool",
        name: "The school or daycare did not take the care required in supervising and protecting the child",
        plainExplanation:
          "In Myers v. Peel County Board of Education, [1981] 2 S.C.R. 21, the Supreme Court of Canada said the " +
          "standard of care to be exercised by school authorities in providing for the supervision and " +
          "protection of students for whom they are responsible is that of the careful or prudent parent. " +
          "The Court said it is not a standard which can be applied in the same manner and to the same extent " +
          "in every case: its application will vary from case to case and will depend upon the number of " +
          "students being supervised at any given time, the nature of the exercise or activity in progress, " +
          "the age and the degree of skill and training the students may have received in connection with the " +
          "activity, the nature and condition of the equipment in use at the time, the competency and capacity " +
          "of the students involved, and a host of other matters. For others caring for a child, such as a " +
          "daycare, the general standard stated in Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28 is " +
          "that a person must exercise the standard of care that would be expected of an ordinary, reasonable " +
          "and prudent person in the same circumstances, and one may look to external indicators of reasonable " +
          "conduct, such as custom, industry practice, and statutory or regulatory standards.",
        sourceUrl: MYERS,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: RYAN, pinpoint: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201, para. 28" }],
        evidenceCategories: [
          {
            name: "Supervision at the time",
            why: "The standard depends on how many children were supervised, by whom, and doing what.",
            examples: [
              "The name of the teacher, staff member or supervisor on duty",
              "The incident or accident report from the school or daycare (ask for a copy in writing)",
              "Statements from other children's parents, staff or witnesses",
            ],
          },
          {
            name: "The activity and equipment",
            why: "The nature of the activity and the condition of the equipment are part of the standard.",
            examples: [
              "Photos of the playground, gym equipment or area",
              "Program, class or trip descriptions and permission forms",
              "Any school or daycare safety rules or policies",
            ],
          },
        ],
      },
      {
        id: "premises-care-scschool",
        name: "The building or grounds were not reasonably safe",
        plainExplanation: OCCUPIER_TEXT + " " + REASONABLE_CARE_TEXT,
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: OLA_FROM,
        alsoCites: [{ sourceUrl: WALDICK, pinpoint: WALDICK_PIN }],
        evidenceCategories: [
          {
            name: "The hazard",
            why: "Shows the condition of the building, grounds or equipment that caused the harm.",
            examples: [
              "Photos of the broken equipment, surface or hazard",
              "Earlier complaints or reports about the same hazard",
              "Witness names and statements",
            ],
          },
          {
            name: "Who runs the place",
            why: "A school board, a daycare operator and a building owner can each be an occupier.",
            examples: ["Registration or enrolment papers", "Invoices or receipts naming the operator"],
          },
        ],
      },
      DAMAGE_ELEMENT("scschool", "The child was hurt, and the harm came from what happened"),
    ],
    defendantConsiderations: [
      {
        id: "contributory-negligence-scschool",
        name: "The student's own conduct is said to have contributed",
        plainExplanation:
          CONTRIBUTORY_NEG_TEXT +
          " In Myers v. Peel County Board of Education, [1981] 2 S.C.R. 21, the Court restored the trial " +
          "judgment, leaving intact the finding of contributory negligence against the student.",
        whenThisComesUp:
          "When the Defence says the student broke a rule, ignored instructions or tried something they were " +
          "told not to.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: V,
        consolidationPeriod: NEGLIGENCE_FROM,
        alsoCites: [{ sourceUrl: MYERS, pinpoint: "Myers v. Peel County Board of Education, [1981] 2 S.C.R. 21" }],
      },
      WILLING(
        "scschool",
        "When the Defence points to a permission form, waiver or posted rule for a trip, sport or activity.",
      ),
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-contributory-negligence",
      "defence-waiver-release-assumption-of-risk",
    ],
    remedies: SC_REMEDIES,
    proceduralNotes: [
      {
        note: CHILD_PARTY_NOTE,
        sourceUrl: SC_RULES,
        verifiedAt: V,
        consolidationPeriod: SC_RULES_FROM,
      },
      SC_COURT,
      {
        note: CHILD_LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_FROM,
      },
    ],
    signals: [
      "my child was hurt at school",
      "my son got injured at daycare",
      "my daughter fell off the playground equipment at school",
      "nobody was supervising the kids",
      "injured in gym class",
      "hurt on a school trip",
      "the daycare did not tell me how my child got hurt",
      "my child was hurt at day camp",
    ],
    citations: [
      {
        sourceName: "Myers v. Peel County Board of Education, [1981] 2 S.C.R. 21",
        officialUrl: MYERS,
        verifiedAt: V,
      },
      CITE_RYAN("para. 28"),
      CITE_OLA("ss. 1-5, 9(3)"),
      CITE_WALDICK,
      CITE_MUSTAPHA("paras. 8-9"),
      CITE_CLEMENTS,
      CITE_NEG("s. 3"),
      {
        sourceName: "Rules of the Small Claims Court, O. Reg. 258/98",
        officialUrl: SC_RULES,
        verifiedAt: V,
        pinpoint: "rr. 1.02(1), 4.01, 4.03(2), 4.07, 4.08(1)",
      },
      CITE_CJA,
      CITE_626,
      CITE_LIM("ss. 4, 5(1), 5(2), 6, 8"),
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-injury-on-public-transit",
    name: "An injury on public transit",
    courtArea: "small-claims",
    broughtBy:
      "A passenger, or a person at a station, platform or stop, hurt on or around a bus, streetcar, subway or " +
      "train, suing the transit operator, and sometimes the driver.",
    typicalDefendantProfile: "business",
    plaintiffElements: [
      {
        id: "station-or-vehicle-occupier-sctransit",
        name: "At a station, platform or stopped vehicle: the operator did not take reasonable care",
        plainExplanation:
          "Under s. 1 of the Occupiers' Liability Act, an \"occupier\" includes a person in physical possession " +
          "of premises, or a person who has responsibility for and control over the condition of premises or the " +
          "activities carried on there. \"Premises\" means lands and structures, and includes trains, railway " +
          "cars, vehicles and aircraft, except while in operation. Under s. 3(1), an occupier owes a duty to " +
          "take such care as in all the circumstances of the case is reasonable to see that persons entering on " +
          "the premises are reasonably safe while on the premises; under s. 3(2), this applies whether the " +
          "danger is caused by the condition of the premises or by an activity carried on there. Under s. 9(1), " +
          "nothing in the Act relieves an occupier from any higher liability or higher standard of care imposed " +
          "by any enactment or rule of law on particular classes of persons, including common carriers.",
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: OLA_FROM,
        evidenceCategories: [
          {
            name: "The hazard",
            why: "Shows the condition of the station, stairs, escalator, platform or vehicle.",
            examples: [
              "Photos of the spot, the stairs, the door or the floor",
              "An incident report made with transit staff",
              "Witness names and statements",
            ],
          },
          {
            name: "Where and when",
            why: "Transit systems keep video and records by station, vehicle and time.",
            examples: [
              "The route, vehicle number, station and time",
              "A written request to keep security video, sent soon after",
              "Fare card or app records showing the trip",
            ],
          },
        ],
      },
      PERSON_NEGLIGENCE(
        "sctransit",
        "On a moving vehicle: the driver or operator was careless",
        [
          {
            name: "How the vehicle was driven",
            why: "Shows the conduct said to fall below what a reasonable person would do in the same circumstances.",
            examples: [
              "Your notes of the sudden stop, turn or door closing",
              "Statements from other passengers",
              "The route, vehicle number and time, to ask for onboard video",
            ],
          },
          {
            name: "Who operates the service",
            why: "A claim needs the operator's full legal name.",
            examples: ["The transit agency's name on the vehicle, ticket or website", "Any reply to your complaint"],
          },
        ],
      ),
      DAMAGE_ELEMENT("sctransit"),
    ],
    defendantConsiderations: [
      {
        id: "highway-driver-onus-sctransit",
        name: "The driver and owner of a motor vehicle or street car on a highway",
        plainExplanation:
          "Under s. 192(1) and (2) of the Highway Traffic Act, the driver, and the owner, of a motor vehicle or " +
          "street car is liable for loss or damage sustained by any person by reason of negligence in its " +
          "operation on a highway (the owner, unless it was in someone else's possession without the owner's " +
          "consent). Under s. 193(1), when loss or damage is sustained by any person by reason of a motor " +
          "vehicle on a highway, the onus of proof that it did not arise through the negligence or improper " +
          "conduct of the owner, driver, lessee or operator is on them; but under s. 193(2), this does not " +
          "apply to an action brought by a passenger in a motor vehicle for injuries sustained while a " +
          "passenger. Under s. 193(5), in s. 193 \"motor vehicle\" includes a street car.",
        whenThisComesUp:
          "When the person hurt was a pedestrian or someone outside the bus or streetcar, or when the Defence " +
          "says the passenger has to prove the driver was careless.",
        sourceUrl: HTA,
        verifiedAt: V,
        consolidationPeriod: HTA_FROM,
      },
      {
        id: "sidewalk-or-road-sctransit",
        name: "The injury happened at a stop on a public sidewalk or road",
        plainExplanation: SIDEWALK_TEXT,
        whenThisComesUp:
          "When the fall happened at a stop or shelter on the public sidewalk or road, rather than in a station.",
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: OLA_FROM,
        alsoCites: [{ sourceUrl: MUNICIPAL_ACT, pinpoint: "Municipal Act, 2001, s. 44(1), (2), (9), (10)" }],
      },
      CONTRIBUTORY_NEG(
        "sctransit",
        "When the Defence says the passenger was not holding on, was standing in a marked area, or was rushing.",
      ),
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: SC_REMEDIES,
    proceduralNotes: [SNOW, SC_COURT, LIMITATION],
    signals: [
      "the bus driver slammed on the brakes and I fell",
      "fell on the bus",
      "the streetcar doors closed on me",
      "slipped on the subway stairs",
      "hurt on the escalator at the station",
      "fell on the train platform",
      "the bus pulled away before I sat down",
      "slipped on ice at the bus stop",
    ],
    citations: [
      CITE_OLA("ss. 1, 3, 6.1, 9(1), 10(2)"),
      CITE_HTA,
      { sourceName: "Municipal Act, 2001, S.O. 2001, c. 25", officialUrl: MUNICIPAL_ACT, verifiedAt: V, pinpoint: "s. 44(1), (2), (9), (10)" },
      CITE_MUSTAPHA("paras. 3, 8-9"),
      CITE_RYAN("para. 28"),
      CITE_CLEMENTS,
      CITE_NEG("s. 3"),
      CITE_CJA,
      CITE_626,
      CITE_LIM(),
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-escooter-bicycle-or-pedestrian-collision",
    name: "An e-scooter, bicycle or pedestrian collision",
    courtArea: "small-claims",
    broughtBy:
      "A pedestrian, cyclist or e-scooter rider hurt in a collision with another rider, a pedestrian or a " +
      "vehicle, suing the person whose conduct caused it (and, for a vehicle, its owner).",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      PERSON_NEGLIGENCE(
        "sccoll",
        "The other person did not take the care a reasonable person would have taken",
        [
          {
            name: "How the collision happened",
            why: "Shows the conduct said to fall below what a reasonable person would do in the same circumstances.",
            examples: [
              "Photos or video of the scene, the path, the lights and the signs",
              "Witness names and statements",
              "A sketch showing where each person was and which way they were going",
            ],
          },
          {
            name: "Who the other person is",
            why: "A claim needs their full name and address.",
            examples: [
              "Their name and contact details exchanged at the scene",
              "A police or collision report number, if one was made",
              "Rental or share-scheme records for the e-scooter or bike",
            ],
          },
        ],
        true,
      ),
      {
        id: "motor-vehicle-sccoll",
        name: "If a motor vehicle was involved: the driver and owner are liable for negligent operation, and must disprove negligence",
        plainExplanation:
          "Under s. 192(1) of the Highway Traffic Act, the driver of a motor vehicle or street car is liable " +
          "for loss or damage sustained by any person by reason of negligence in its operation on a highway. " +
          "Under s. 192(2), the owner is liable too, unless the vehicle was without the owner's consent in the " +
          "possession of some person other than the owner or the owner's chauffeur. Under s. 193(1), when loss " +
          "or damage is sustained by any person by reason of a motor vehicle on a highway, the onus of proof " +
          "that the loss or damage did not arise through the negligence or improper conduct of the owner, " +
          "driver, lessee or operator is on them. Under s. 193(2), this does not apply to a collision between " +
          "motor vehicles or to an action by a passenger in a motor vehicle.",
        sourceUrl: HTA,
        verifiedAt: V,
        consolidationPeriod: HTA_FROM,
        evidenceCategories: [
          {
            name: "The vehicle and its owner",
            why: "The owner can be liable along with the driver.",
            examples: [
              "The licence plate, make and colour of the vehicle",
              "The driver's name, licence and insurance details from the scene",
              "The police or collision report",
            ],
          },
          {
            name: "Where it happened",
            why: "These sections apply to a motor vehicle on a highway.",
            examples: ["Photos of the road, intersection or crossing", "The street names and time"],
          },
        ],
      },
      DAMAGE_ELEMENT("sccoll"),
    ],
    defendantConsiderations: [
      CONTRIBUTORY_NEG(
        "sccoll",
        "When the Defence says the injured person was riding too fast, on the wrong side, without lights, or " +
        "crossed against a signal.",
      ),
      SEVERAL_AT_FAULT(
        "sccoll",
        "When more than one rider or driver was involved, or each side says the other was to blame.",
      ),
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: SC_REMEDIES,
    proceduralNotes: [SC_COURT, LIMITATION],
    signals: [
      "an e-scooter hit me on the sidewalk",
      "a cyclist crashed into me",
      "I was knocked off my bike",
      "a pedestrian walked into my bike lane",
      "hit by a car while riding my bike",
      "a driver opened their door and I hit it",
      "hit by a car in the crosswalk",
      "collided with another cyclist on the trail",
    ],
    citations: [
      CITE_MUSTAPHA("paras. 3, 8-9"),
      CITE_RYAN("paras. 28-29"),
      CITE_CLEMENTS,
      CITE_HTA,
      CITE_NEG("ss. 1, 3, 4, 5"),
      CITE_CJA,
      CITE_626,
      CITE_LIM(),
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-injury-from-a-cosmetic-procedure",
    name: "An injury from a salon, spa or cosmetic procedure",
    courtArea: "small-claims",
    broughtBy:
      "A customer burned, scarred, infected or otherwise hurt by a hair, nail, waxing, laser, tattoo, " +
      "piercing or other cosmetic service, suing the salon, spa, studio or the person who did it.",
    typicalDefendantProfile: "business",
    plaintiffElements: [
      PERSON_NEGLIGENCE(
        "sccos",
        "The salon or practitioner did not take the care a reasonable person would have taken",
        [
          {
            name: "What was done",
            why: "Shows the treatment and how it was carried out.",
            examples: [
              "The booking, receipt or treatment record",
              "Product names, settings or instructions used, if known",
              "Aftercare instructions you were given",
            ],
          },
          {
            name: "Outside indicators of reasonable conduct",
            why: "Custom, industry practice and regulatory standards can show what reasonable care was.",
            examples: [
              "A public health inspection report for the business, if one exists",
              "The product maker's instructions or warnings",
              "Messages with the business about what went wrong",
            ],
          },
        ],
      ),
      {
        id: "services-quality-sccos",
        name: "If you paid for it: the service was not of a reasonably acceptable quality",
        plainExplanation:
          "Under s. 9(1) of the Consumer Protection Act, 2002, the supplier is deemed to warrant that the " +
          "services supplied under a consumer agreement are of a reasonably acceptable quality. Under s. 1, a " +
          "\"consumer\" is an individual acting for personal, family or household purposes; a \"consumer " +
          "agreement\" is an agreement between a supplier and a consumer in which the supplier agrees to supply " +
          "goods or services for payment; and \"services\" means anything other than goods, including any " +
          "service. Under s. 9(3), any term or acknowledgement, whether part of the consumer agreement or not, " +
          "that purports to negate or vary any deemed condition or warranty under the Act is void.",
        sourceUrl: CPA,
        verifiedAt: V,
        consolidationPeriod: CPA_FROM,
        evidenceCategories: [
          {
            name: "The agreement",
            why: "The deemed warranty is part of a consumer agreement between you and the business.",
            examples: ["A receipt, invoice or card statement", "The booking confirmation or price list"],
          },
          {
            name: "The result",
            why: "Shows what was wrong with the service.",
            examples: [
              "Dated photos of the burn, rash, scarring or result",
              "A doctor's or pharmacist's note about the reaction",
            ],
          },
        ],
      },
      DAMAGE_ELEMENT("sccos"),
    ],
    defendantConsiderations: [
      {
        id: "regulated-professional-sccos",
        name: "The treatment was given by a regulated health professional or at a hospital",
        plainExplanation: CPA_EXEMPT_TEXT,
        whenThisComesUp:
          "When the treatment (such as an injection or laser treatment) was given by a doctor, nurse or other " +
          "regulated health professional, or at a hospital.",
        sourceUrl: OREG_17_05,
        verifiedAt: V,
        consolidationPeriod: OREG_17_05_FROM,
        alsoCites: [{ sourceUrl: CPA, pinpoint: "Consumer Protection Act, 2002, s. 2(2)(e)" }],
      },
      {
        id: "signed-form-sccos",
        name: "A consent or release form was signed before the treatment",
        plainExplanation:
          "Under s. 9(3) of the Consumer Protection Act, 2002, any term or acknowledgement, whether part of the " +
          "consumer agreement or not, that purports to negate or vary any implied condition or warranty under " +
          "the Sale of Goods Act or any deemed condition or warranty under the Consumer Protection Act, 2002 is " +
          "void. Under s. 9(4), if such a term is part of the agreement, it is severable from the agreement and " +
          "is not evidence of circumstances showing an intent that the deemed or implied warranty or condition " +
          "does not apply.",
        whenThisComesUp:
          "When the business points to a form signed before the treatment that says the customer accepts the risks.",
        sourceUrl: CPA,
        verifiedAt: V,
        consolidationPeriod: CPA_FROM,
      },
      CONTRIBUTORY_NEG(
        "sccos",
        "When the Defence says the customer did not follow aftercare instructions or did not mention an allergy " +
        "or condition.",
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
      "the salon burned my scalp",
      "chemical burn from hair dye",
      "got an infection from a pedicure",
      "laser hair removal burned my skin",
      "the waxing tore my skin",
      "my eyelash extensions caused an infection",
      "the tattoo got infected",
      "the spa treatment left scars",
    ],
    citations: [
      CITE_MUSTAPHA("paras. 3, 8-9"),
      CITE_RYAN("para. 28"),
      CITE_CLEMENTS,
      CITE_CPA("ss. 1, 2(2)(e), 9(1), (3), (4)"),
      CITE_17_05,
      CITE_NEG("s. 3"),
      CITE_CJA,
      CITE_626,
      CITE_LIM(),
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-professional-negligence-medical-or-dental",
    name: "Harm from medical, dental or other professional care",
    courtArea: "small-claims",
    broughtBy:
      "A patient or client harmed by care from a doctor, dentist, physiotherapist, chiropractor or other " +
      "professional, suing the practitioner or the clinic.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      PERSON_NEGLIGENCE(
        "scmed",
        "The practitioner owed you a duty of care and fell below the standard",
        [
          {
            name: "Your records",
            why: "Shows what was done, when, and what you were told.",
            examples: [
              "Your chart or treatment records from the clinic (asked for in writing)",
              "Appointment confirmations, invoices and receipts",
              "Consent forms and written instructions you were given",
            ],
          },
          {
            name: "Outside indicators of reasonable conduct",
            why: "Custom and practice in the field can show what reasonable care was.",
            examples: [
              "A written opinion from another practitioner in the same field",
              "Notes from the practitioner who treated the problem afterwards",
            ],
          },
        ],
      ),
      {
        id: "harm-and-cause-scmed",
        name: "You were harmed, and the harm came from the care",
        plainExplanation:
          DAMAGE_AND_CAUSE_TEXT +
          " In Snell v. Farrell, [1990] 2 S.C.R. 311, a medical case, the Supreme Court of Canada said that in " +
          "many malpractice cases the facts lie particularly within the knowledge of the defendant, and in " +
          "these circumstances very little affirmative evidence on the part of the plaintiff will justify the " +
          "drawing of an inference of causation in the absence of evidence to the contrary. The legal or " +
          "ultimate burden remains with the plaintiff, but in the absence of evidence to the contrary adduced by " +
          "the defendant, an inference of causation may be drawn although positive or scientific proof of " +
          "causation has not been adduced. The Court said it is not essential to have a positive medical " +
          "opinion to support a finding of causation.",
        sourceUrl: SNELL,
        verifiedAt: V,
        alsoCites: [
          { sourceUrl: MUSTAPHA, pinpoint: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, paras. 8-9" },
          { sourceUrl: CLEMENTS, pinpoint: CLEMENTS_PIN },
        ],
        evidenceCategories: [
          INJURY_RECORDS,
          {
            name: "What happened, in order",
            why: "Shows how the harm followed the care.",
            examples: [
              "A dated timeline of appointments, symptoms and treatment",
              "Records from the practitioner who treated the problem afterwards",
            ],
          },
          LOSS_RECORDS,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "cpa-does-not-apply-scmed",
        name: "The Consumer Protection Act, 2002 does not apply to regulated health care",
        plainExplanation: CPA_EXEMPT_TEXT,
        whenThisComesUp:
          "When the claim relies on consumer protection rules for care from a regulated health professional, " +
          "a veterinarian, or care at a hospital or pharmacy.",
        sourceUrl: OREG_17_05,
        verifiedAt: V,
        consolidationPeriod: OREG_17_05_FROM,
        alsoCites: [{ sourceUrl: CPA, pinpoint: "Consumer Protection Act, 2002, s. 2(2)(e)" }],
      },
      CONTRIBUTORY_NEG(
        "scmed",
        "When the Defence says the patient did not follow advice, missed follow-up appointments or did not " +
        "give a full history.",
      ),
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: SC_REMEDIES,
    proceduralNotes: [
      {
        note:
          "Getting your records. Under s. 52(1) of the Personal Health Information Protection Act, 2004, " +
          "subject to Part V of the Act, an individual has a right of access to a record of personal health " +
          "information about the individual that is in the custody or under the control of a health " +
          "information custodian, with listed exceptions. Under s. 53(1), the individual exercises that right " +
          "by making a written request for access to the custodian that has custody or control of the " +
          "information; under s. 53(2), the request must contain sufficient detail to enable the custodian to " +
          "identify and locate the record with reasonable efforts.",
        sourceUrl: PHIPA,
        verifiedAt: V,
        consolidationPeriod: PHIPA_FROM,
      },
      SC_COURT,
      LIMITATION,
    ],
    signals: [
      "the dentist damaged my tooth",
      "my doctor missed the diagnosis",
      "the surgery went wrong",
      "the physiotherapist injured me",
      "the chiropractor hurt my neck",
      "I was given the wrong medication",
      "the dental work was done badly and I needed it redone",
      "the clinic did not follow up on my test results",
    ],
    citations: [
      CITE_MUSTAPHA("paras. 3, 8-9"),
      CITE_RYAN("para. 28"),
      { sourceName: "Snell v. Farrell, [1990] 2 S.C.R. 311", officialUrl: SNELL, verifiedAt: V },
      CITE_CLEMENTS,
      CITE_17_05,
      CITE_CPA("s. 2(2)(e)"),
      {
        sourceName: "Personal Health Information Protection Act, 2004, S.O. 2004, c. 3, Sched. A",
        officialUrl: PHIPA,
        verifiedAt: V,
        pinpoint: "ss. 52(1), 53(1), (2)",
      },
      CITE_NEG("s. 3"),
      CITE_CJA,
      CITE_626,
      CITE_LIM(),
    ],
    reviewedAt: null,
    status: "draft",
  },
];

// Helpers used above, declared as functions so they are hoisted.
function CONTRACTOR(suffix: string, when: string) {
  return {
    id: `independent-contractor-${suffix}`,
    name: "A contractor did the work that is said to have caused the harm",
    plainExplanation: CONTRACTOR_TEXT,
    whenThisComesUp: when,
    sourceUrl: OLA,
    verifiedAt: V,
    consolidationPeriod: OLA_FROM,
  };
}

function WILLING(suffix: string, when: string) {
  return {
    id: `willing-assumption-${suffix}`,
    name: "Risks willingly assumed, or a duty limited by a sign, form or waiver",
    plainExplanation: WILLING_TEXT,
    whenThisComesUp: when,
    sourceUrl: OLA,
    verifiedAt: V,
    consolidationPeriod: OLA_FROM,
  };
}
