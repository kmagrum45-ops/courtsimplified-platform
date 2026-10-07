/**
 * Case types, batch "civil-1" (civil): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/civil-1.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   civil-claim-car-accident-injury -- Injury in a car accident (suing the at-fault driver)
 *   civil-claim-occupier-injury -- Injured on someone else's property (Superior Court)
 *   civil-claim-medical-or-professional-negligence -- Harm from a professional's careless work (Superior Court)
 *   civil-claim-claim-against-government -- Suing the Ontario government or a Crown agency
 *   civil-claim-claim-against-municipality -- Suing a city or town (road, sidewalk or service)
 *   civil-claim-dog-bite-injury -- Injured by a dog (Superior Court)
 *   civil-claim-assault-and-battery -- Someone hurt you on purpose (assault and battery, civil claim)
 *   civil-claim-privacy-intrusion -- Your privacy was invaded
 *   civil-claim-insurance-claim-denied -- Your insurer refused a claim
 *   civil-claim-construction-lien -- Enforcing or fighting a construction lien
 *
 * NOT WRITTEN: civil-claim-assault-and-battery. Nothing saved in this
 * repository says what a civil claim for assault or battery requires. The
 * Limitations Act, 2002 defines "assault" to include a battery (s. 1) and
 * removes the limitation period for some assault claims (s. 16 (1) (h),
 * (h.2)); Jones v. Tsige and Whiten v. Pilot mention the torts in passing.
 * None of them states the elements, so no entry was written. It needs a
 * decision that states them, saved under docs/sources/decisions/.
 *
 * Decisions are cited by their saved text under docs/sources/decisions/.
 */

import type { ClaimType } from "../claimTypes";

const V = "2026-10-07";

const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const NEGLIGENCE_ACT = "https://www.ontario.ca/laws/docs/elaws_statutes_90n01_e.doc";
const OLA = "https://www.ontario.ca/laws/docs/90o02_e.doc";
const HTA = "https://www.ontario.ca/laws/docs/90h08_e.doc";
const INSURANCE_ACT = "https://www.ontario.ca/laws/docs/90i08_e.doc";
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const OREG_626 = "https://www.ontario.ca/laws/docs/000626_e.doc";
const CLPA = "https://www.ontario.ca/laws/docs/19c07c_e.doc";
const MUNICIPAL_ACT = "https://www.ontario.ca/laws/docs/01m25_e.doc";
const DOLA = "https://www.ontario.ca/laws/docs/90d16_e.doc";
const CONSTRUCTION_ACT = "https://www.ontario.ca/laws/docs/90c30_e.doc";
const RCP = "https://www.ontario.ca/laws/docs/900194_e.doc";
const PHIPA = "https://www.ontario.ca/laws/docs/04p03_e.doc";
const SCJ_STEPS =
  "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/";

const MUSTAPHA = "docs/sources/decisions/mustapha-v-culligan-2008-SCC-27.english.txt";
const CLEMENTS = "docs/sources/decisions/clements-v-clements-2012-SCC-32.english.txt";
const RYAN = "docs/sources/decisions/ryan-v-victoria-city-1999-1-SCR-201.english.txt";
const SNELL = "docs/sources/decisions/snell-v-farrell-1990-2-SCR-311.html.txt";
const WALDICK = "docs/sources/decisions/waldick-v-malcolm-1991-2-SCR-456.html.txt";
const NELSON = "docs/sources/decisions/nelson-city-v-marchi-2021-SCC-41.html.txt";
const JONES = "docs/sources/decisions/jones-v-tsige-2012-ONCA-32.txt";
const SATTVA = "docs/sources/decisions/sattva-capital-corp-v-creston-moly-corp-2014-SCC-53.english.txt";
const FIDLER = "docs/sources/decisions/fidler-v-sun-life-assurance-co-2006-SCC-30.english.txt";
const GRANT_THORNTON = "docs/sources/decisions/grant-thornton-v-new-brunswick-2021-SCC-31.english.txt";

/** The Limitations Act note, worded once and used by several case types. */
const LIMITATION_NOTE =
  "Time limit. Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a " +
  "proceeding cannot be started after the second anniversary of the day the claim was discovered. " +
  "Under s. 5(1), a claim is discovered on the earlier of the day the person first knew that the " +
  "injury, loss or damage had occurred, that it was caused or contributed to by an act or omission, " +
  "that the act or omission was that of the person the claim is against, and that, having regard to " +
  "the nature of the injury, loss or damage, a proceeding would be an appropriate means to seek to " +
  "remedy it -- and the day a reasonable person with their abilities and in their circumstances first " +
  "ought to have known those things. Under s. 5(2), a person is presumed to have known those things " +
  "on the day the act or omission took place, unless the contrary is proved.";

/** Which court: the Small Claims limit and the leave rule. */
const WHICH_COURT_NOTE =
  "Which court. Under s. 23(1) of the Courts of Justice Act, the Small Claims Court has jurisdiction " +
  "in an action for the payment of money where the amount claimed does not exceed the prescribed " +
  "amount, not counting interest and costs; under s. 1(1) of O. Reg. 626/00, that amount is $50,000. " +
  "Under s. 23(1.1), an action that is within the Small Claims Court's jurisdiction shall not be " +
  "started in the Superior Court of Justice except with leave of the Superior Court of Justice as " +
  "provided in the rules of court. Under s. 23(1.2), that does not apply to a counterclaim, " +
  "crossclaim or third party claim where the main action was started in the Superior Court.";

const MUSTAPHA_ELEMENTS =
  "In Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, the Supreme Court of Canada said a " +
  "successful action in negligence requires the plaintiff to show (1) that the defendant owed them a " +
  "duty of care; (2) that the defendant's behaviour breached the standard of care; (3) that the " +
  "plaintiff sustained damage; and (4) that the damage was caused, in fact and in law, by the " +
  "defendant's breach (para. 3).";

const CLEMENTS_CAUSATION =
  "In Clements v. Clements, 2012 SCC 32, the majority of the Supreme Court of Canada said the test " +
  "for showing causation is the \"but for\" test: the plaintiff must show on a balance of " +
  "probabilities that \"but for\" the defendant's negligent act, the injury would not have occurred. " +
  "This is a factual inquiry (para. 8). The test must be applied in a robust common sense fashion, " +
  "and there is no need for scientific evidence of the precise contribution the defendant's " +
  "negligence made to the injury (para. 9).";

const INJURY_RECORDS = {
  name: "Records of the injury",
  why: "Shows what the injury was, when it was first treated and how long it has lasted.",
  examples: [
    "Emergency, hospital or clinic records",
    "Notes from a family doctor, specialist, physiotherapist or counsellor",
    "Photos of visible injuries taken over time",
  ],
};

const LOSS_RECORDS = {
  name: "Records of what the harm cost",
  why: "Shows the money and other losses that followed.",
  examples: [
    "Receipts for treatment, medication and travel to appointments",
    "Pay stubs or an employer letter showing time missed from work",
    "Repair estimates or replacement receipts for damaged property",
  ],
};

const TIMELINE = {
  name: "A dated timeline",
  why: "Shows the order of events: what happened, then what followed.",
  examples: [
    "A written timeline with dates and times",
    "Messages, emails or notes made at or near the time",
    "Photos with their dates",
  ],
};

export const TYPES_CIVIL_1: ClaimType[] = [
  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-car-accident-injury",
    name: "Injury in a car accident (suing the at-fault driver)",
    courtArea: "civil",
    broughtBy:
      "A person hurt in a crash -- a driver, passenger, cyclist or person on foot -- suing the driver " +
      "and owner of the vehicle they say was driven carelessly.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "driver-negligence-civcar",
        name: "The driver was negligent in operating the vehicle, and who is answerable for it",
        plainExplanation:
          "Under s. 192(1) of the Highway Traffic Act, the driver of a motor vehicle is liable for loss " +
          "or damage sustained by any person by reason of negligence in the operation of the motor " +
          "vehicle on a highway. Under s. 192(2), the owner is also liable for that loss or damage, " +
          "unless the vehicle was, without the owner's consent, in the possession of someone other than " +
          "the owner or the owner's chauffeur. Under s. 192(6), the driver, owner, lessee and operator " +
          "who are liable under the section are jointly and severally liable. What has to be shown is " +
          "negligence. " +
          MUSTAPHA_ELEMENTS,
        sourceUrl: HTA,
        verifiedAt: V,
        consolidationPeriod: "2026-07-01",
        alsoCites: [{ sourceUrl: MUSTAPHA, pinpoint: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, para. 3" }],
        evidenceCategories: [
          {
            name: "Records of the collision",
            why: "Shows how the crash happened and what each vehicle was doing.",
            examples: [
              "The police report or collision report number",
              "Photos of the scene, the vehicles and the road",
              "Dashcam or nearby security video",
            ],
          },
          {
            name: "Who was driving and who owned the vehicle",
            why: "Section 192 makes the driver and, in most cases, the owner answerable.",
            examples: [
              "The driver and insurance details exchanged at the scene",
              "Vehicle ownership or plate information",
              "A rental or lease agreement, if the vehicle was rented or leased",
            ],
          },
          {
            name: "Witnesses",
            why: "People who saw the crash can describe what the driver did.",
            examples: ["Names and contact details of witnesses", "Written statements made soon after the crash"],
          },
        ],
      },
      {
        id: "injury-threshold-civcar",
        name: "For pain and suffering and health care costs: the injury meets the legal threshold",
        plainExplanation:
          "Under s. 267.5(5) of the Insurance Act, the owner of an automobile, the occupants of an " +
          "automobile and any person present at the incident are not liable in an action in Ontario " +
          "for damages for non-pecuniary loss (such as pain and suffering) from bodily injury arising " +
          "from the use or operation of the automobile, unless, as a result, the injured person has died " +
          "or has sustained permanent serious disfigurement, or permanent serious impairment of an " +
          "important physical, mental or psychological function. Section 267.5(3) sets the same " +
          "condition for damages for health care expenses. Under s. 267.5(7), subject to subsections " +
          "(5), (12), (13) and (15), the court first decides the amount of non-pecuniary damages in the " +
          "same manner as in an action the section does not apply to, and then, subject to subsections " +
          "(8), (8.1) and (8.1.1), reduces it by the greater of $15,000 and the amount prescribed by the " +
          "regulations. Under s. 267.4(1), these rules apply to bodily injury or death arising from the " +
          "use or operation of an automobile after November 1, 1996, in Canada, the United States, or a " +
          "jurisdiction designated in the Statutory Accident Benefits Schedule.",
        sourceUrl: INSURANCE_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-01-01",
        evidenceCategories: [
          {
            name: "Medical records about how serious and lasting the injury is",
            why: "The threshold turns on permanent serious disfigurement or permanent serious impairment.",
            examples: [
              "Specialist reports and test results",
              "Treatment records over time from each provider",
              "Photos of scarring or disfigurement",
            ],
          },
          {
            name: "Records of how the injury affects daily life",
            why: "Shows which physical, mental or psychological functions are affected.",
            examples: [
              "A daily journal of pain and limits",
              "Statements from family, co-workers or caregivers",
              "Records of work, school or activities given up",
            ],
          },
        ],
      },
      {
        id: "income-loss-limits-civcar",
        name: "Lost income: the part that can be claimed from the driver",
        plainExplanation:
          "Under s. 267.5(1) of the Insurance Act, the owner of an automobile, the occupants and any " +
          "person present at the incident are not liable in an action in Ontario for income loss " +
          "suffered in the seven days after the incident, or for income loss suffered more than seven " +
          "days after the incident and before trial in excess of 70 per cent of the gross income lost " +
          "during that period, as determined under the regulations. Damages for loss of earning " +
          "capacity before trial are limited the same way. Under s. 267.5(6) and (6.1), these " +
          "protections do not apply to a person defended by an insurer that is not licensed to " +
          "undertake automobile insurance in Ontario (unless it has filed an undertaking under s. " +
          "226.1), or to the owner or driver of a public transit vehicle that did not collide with " +
          "another automobile or any other object.",
        sourceUrl: INSURANCE_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-01-01",
        evidenceCategories: [
          {
            name: "Income before and after the crash",
            why: "The amount turns on gross income lost in each period.",
            examples: [
              "Pay stubs and tax returns from before the crash",
              "An employer letter about time off and lost hours",
              "Business records, for self-employed people",
            ],
          },
          {
            name: "Medical notes about being unable to work",
            why: "Links the time off work to the injury.",
            examples: ["Off-work notes from a doctor", "Return-to-work or modified-duty plans"],
          },
        ],
      },
      {
        id: "causation-civcar",
        name: "The crash caused the injury",
        plainExplanation: CLEMENTS_CAUSATION,
        sourceUrl: CLEMENTS,
        verifiedAt: V,
        evidenceCategories: [
          TIMELINE,
          {
            name: "Records connecting the injury to the crash",
            why: "Speaks to whether the injury came from this crash and not something else.",
            examples: [
              "A treating doctor's notes on how the injury happened",
              "Medical records from before the crash, to show what changed",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "contributory-negligence-civcar",
        name: "The injured person's own fault, or another driver's, is said to have contributed",
        plainExplanation:
          "Under s. 3 of the Negligence Act, in an action for damages founded on the fault or negligence " +
          "of the defendant, if fault or negligence is found on the part of the plaintiff that " +
          "contributed to the damages, the court shall apportion the damages in proportion to the degree " +
          "of fault or negligence found against the parties. Under s. 1, where two or more persons are " +
          "found at fault, they are jointly and severally liable to the person suffering the loss. For " +
          "a car accident, s. 267.5(7), paragraph 4, of the Insurance Act says that where the injured " +
          "person's own fault contributed to the damages for non-pecuniary loss, the award is reduced " +
          "under paragraph 3 (the deductible) before the damages are apportioned under s. 3 of the " +
          "Negligence Act.",
        whenThisComesUp:
          "When the Statement of Defence says the injured person's own actions contributed to the crash " +
          "or the injuries, or blames another driver as well.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: V,
        consolidationPeriod: "2004-01-01",
        alsoCites: [{ sourceUrl: INSURANCE_ACT, pinpoint: "Insurance Act, s. 267.5(7), para. 4" }],
      },
      {
        id: "onus-on-driver-civcar",
        name: "When the driver has to prove they were not negligent",
        plainExplanation:
          "Under s. 193(1) of the Highway Traffic Act, when loss or damage is sustained by any person by " +
          "reason of a motor vehicle on a highway, the onus of proof that the loss or damage did not " +
          "arise through the negligence or improper conduct of the owner, driver, lessee or operator is " +
          "on the owner, driver, lessee or operator. Under s. 193(2), this does not apply in cases of a " +
          "collision between motor vehicles, or to an action brought by a passenger in a motor vehicle " +
          "for injuries sustained while a passenger.",
        whenThisComesUp:
          "When the person hurt was not in a motor vehicle that collided with another one, and was not a " +
          "passenger -- for example, someone on foot.",
        sourceUrl: HTA,
        verifiedAt: V,
        consolidationPeriod: "2026-07-01",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Before suing. Under s. 258.3(1) of the Insurance Act, an action for loss or damage from bodily " +
          "injury or death arising directly or indirectly from the use or operation of an automobile " +
          "shall not be started unless the plaintiff has applied for statutory accident benefits, and " +
          "has served written notice of the intention to start the action on the defendant within 120 " +
          "days after the incident, or within a longer period a court authorizes on a motion made before " +
          "or after the 120 days end. The plaintiff must also provide the information prescribed by the " +
          "regulations, and, if the defendant asks, undergo examinations by health professionals the " +
          "defendant selects (requested within 90 days after the notice), and provide a statutory " +
          "declaration about the incident and evidence of identity. Under s. 258.3(2), an insured who " +
          "receives the notice shall give a copy to their insurer within seven days.",
        sourceUrl: INSURANCE_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-01-01",
      },
      {
        note:
          "Accident benefits are a separate process, not this court. Under s. 280 of the Insurance Act, " +
          "a dispute about an insured person's entitlement to statutory accident benefits, or the " +
          "amount, may be brought by the insured person or the insurer to the Licence Appeal Tribunal " +
          "(s. 280(2)). Under s. 280(3), no person may bring a proceeding in any court about such a " +
          "dispute, other than an appeal from a decision of the Licence Appeal Tribunal or an " +
          "application for judicial review.",
        sourceUrl: INSURANCE_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-01-01",
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: "2024-12-04",
      },
    ],
    signals: [
      "injured in a car accident",
      "rear-ended and hurt",
      "hit by a car while walking",
      "suing the other driver",
      "car crash injuries",
      "the driver ran a red light and hit me",
      "hurt as a passenger in a crash",
      "knocked off my bike by a car",
      "motor vehicle accident lawsuit",
      "whiplash from a collision",
    ],
    citations: [
      { sourceName: "Highway Traffic Act, R.S.O. 1990, c. H.8", officialUrl: HTA, verifiedAt: V, pinpoint: "ss. 192(1), (2), (6), 193(1), (2)" },
      { sourceName: "Insurance Act, R.S.O. 1990, c. I.8", officialUrl: INSURANCE_ACT, verifiedAt: V, pinpoint: "ss. 258.3(1)-(2), 267.4(1), 267.5(1), (3), (5)-(7), 280(1)-(3)" },
      { sourceName: "Negligence Act, R.S.O. 1990, c. N.1", officialUrl: NEGLIGENCE_ACT, verifiedAt: V, pinpoint: "ss. 1, 3" },
      { sourceName: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27", officialUrl: MUSTAPHA, verifiedAt: V, pinpoint: "para. 3" },
      { sourceName: "Clements v. Clements, 2012 SCC 32", officialUrl: CLEMENTS, verifiedAt: V, pinpoint: "paras. 8-9" },
      { sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B", officialUrl: LIMITATIONS, verifiedAt: V, pinpoint: "ss. 4, 5(1), 5(2)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-occupier-injury",
    name: "Injured on someone else's property (Superior Court)",
    courtArea: "civil",
    broughtBy:
      "A person hurt on land or in a building -- a store, home, parking lot, rental building or venue -- " +
      "suing the occupier: the person or business in possession or control of the place.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "who-is-occupier-civocc",
        name: "The defendant was an occupier of the premises",
        plainExplanation:
          "Under s. 1 of the Occupiers' Liability Act, an \"occupier\" includes a person in physical " +
          "possession of premises, or a person who has responsibility for and control over the condition " +
          "of premises or the activities carried on there, or control over who is allowed to enter -- " +
          "and there can be more than one occupier of the same premises. \"Premises\" means lands and " +
          "structures, and includes water, ships and vessels, trailers and portable structures, and " +
          "trains, railway cars, vehicles and aircraft except while in operation. Under s. 2, subject to " +
          "s. 9, the Act applies in place of the common law rules about the care an occupier must show " +
          "to people entering the premises and the property they bring.",
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: "2021-01-29",
        evidenceCategories: [
          {
            name: "Who controlled the place",
            why: "There can be more than one occupier: an owner, a tenant, a manager or a contractor.",
            examples: [
              "Signs or receipts naming the business",
              "Property ownership or lease information",
              "Names of property managers or maintenance contractors",
            ],
          },
          {
            name: "Where it happened",
            why: "Shows the exact spot and what kind of premises it was.",
            examples: ["Photos of the spot and the area around it", "A sketch or map with measurements"],
          },
        ],
      },
      {
        id: "reasonable-care-civocc",
        name: "The occupier did not take the care that was reasonable in the circumstances",
        plainExplanation:
          "Under s. 3(1) of the Occupiers' Liability Act, an occupier owes a duty to take such care as in " +
          "all the circumstances of the case is reasonable to see that persons entering on the premises, " +
          "and the property they bring, are reasonably safe while on the premises. Under s. 3(2), this " +
          "applies whether the danger is caused by the condition of the premises or by an activity " +
          "carried on there. In Waldick v. Malcolm, [1991] 2 S.C.R. 456, the Supreme Court of Canada said " +
          "the duty is to take reasonable care in the circumstances to make the premises safe; the duty " +
          "does not change, but the factors relevant to what is reasonable care are very specific to " +
          "each fact situation. The Court said the existence of customary practices which are " +
          "unreasonable in themselves, or which are not otherwise acceptable to courts, in no way ousts " +
          "the duty of care owed by occupiers under s. 3(1).",
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: "2021-01-29",
        alsoCites: [{ sourceUrl: WALDICK, pinpoint: "Waldick v. Malcolm, [1991] 2 S.C.R. 456 (reasons of Iacobucci J. for the Court)" }],
        evidenceCategories: [
          {
            name: "The hazard",
            why: "Shows the condition or activity that caused the harm.",
            examples: [
              "Photos or video of the hazard taken as soon as possible",
              "An incident report made with the business or landlord",
              "Witness names and statements",
            ],
          },
          {
            name: "What the occupier did, or did not do, about it",
            why: "What is reasonable depends on the circumstances, including inspection and maintenance.",
            examples: [
              "Inspection, cleaning or maintenance logs (asked for in writing)",
              "Earlier complaints or warnings about the same hazard",
              "Warning signs, or photos showing there were none",
            ],
          },
        ],
      },
      {
        id: "damage-and-cause-civocc",
        name: "The plaintiff was harmed, and the harm came from the condition or activity",
        plainExplanation:
          "In Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, the Supreme Court of Canada said a " +
          "plaintiff who suffers personal injury will generally be found to have suffered damage, and " +
          "that damage includes psychological injury (para. 8); but the law does not recognize upset, " +
          "disgust, anxiety, agitation or other mental states that fall short of injury (para. 9). " +
          CLEMENTS_CAUSATION,
        sourceUrl: MUSTAPHA,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: CLEMENTS, pinpoint: "Clements v. Clements, 2012 SCC 32, paras. 8-9" }],
        evidenceCategories: [INJURY_RECORDS, LOSS_RECORDS],
      },
    ],
    defendantConsiderations: [
      {
        id: "willing-assumption-civocc",
        name: "Risks willingly assumed, or a duty limited by notice",
        plainExplanation:
          "Under s. 4(1) of the Occupiers' Liability Act, the s. 3(1) duty does not apply to risks " +
          "willingly assumed by the person who enters on the premises; in that case the occupier still " +
          "owes a duty not to create a danger with the deliberate intent of doing harm or damage, and not " +
          "to act with reckless disregard of the person's presence. Under s. 4(2), a person on premises " +
          "with the intention of committing, or in the commission of, a criminal act is deemed to have " +
          "willingly assumed all risks. Under s. 3(3), the duty applies except in so far as the occupier " +
          "is free to and does restrict, modify or exclude it; under s. 5(3), where the occupier is free " +
          "to do so, the occupier shall take reasonable steps to bring the restriction to the attention " +
          "of the person to whom the duty is owed.",
        whenThisComesUp:
          "When the Statement of Defence points to a waiver, a posted sign, or says the person chose to " +
          "take the risk.",
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: "2021-01-29",
      },
      {
        id: "contributory-negligence-civocc",
        name: "The injured person's own carelessness is said to have contributed",
        plainExplanation:
          "Under s. 9(3) of the Occupiers' Liability Act, the Negligence Act applies to causes of action " +
          "under the Occupiers' Liability Act. Under s. 3 of the Negligence Act, if fault or negligence " +
          "is found on the part of the plaintiff that contributed to the damages, the court shall " +
          "apportion the damages in proportion to the degree of fault or negligence found against the " +
          "parties.",
        whenThisComesUp:
          "When the Statement of Defence says the injured person was not watching where they were going, " +
          "or their footwear or conduct contributed.",
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: "2021-01-29",
        alsoCites: [{ sourceUrl: NEGLIGENCE_ACT, pinpoint: "Negligence Act, s. 3" }],
      },
      {
        id: "public-road-civocc",
        name: "The place was a public highway or road run by the province or a municipality",
        plainExplanation:
          "Under s. 10(2) of the Occupiers' Liability Act, the Act does not apply to the Crown or to any " +
          "municipal corporation where the Crown or the municipal corporation is an occupier of a public " +
          "highway or a public road. Under s. 10(1), the Act binds the Crown, subject to the Crown " +
          "Liability and Proceedings Act, 2019.",
        whenThisComesUp:
          "When the injury happened on a public highway or road, rather than on private land or in a " +
          "building.",
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: "2021-01-29",
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-waiver-release-assumption-of-risk",
      "defence-contributory-negligence",
    ],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Snow and ice: a 60-day written notice. Under s. 6.1(1) of the Occupiers' Liability Act, no " +
          "action for damages for personal injury caused by snow or ice can be brought against an " +
          "occupier, or an independent contractor employed by the occupier to remove snow or ice, " +
          "unless, within 60 days after the injury, written notice of the claim, including the date, " +
          "time and location of the occurrence, has been personally served on or sent by registered " +
          "mail to at least one of them. Under s. 6.1(5) and (6), failing to give the notice is not a " +
          "bar if the injured person died as a result of the injury, or if a judge finds there is " +
          "reasonable excuse for the missing or insufficient notice and the defendant is not prejudiced " +
          "in its defence.",
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: "2021-01-29",
      },
      {
        note: WHICH_COURT_NOTE,
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: "2025-12-11",
        alsoCites: [{ sourceUrl: OREG_626, pinpoint: "O. Reg. 626/00, s. 1(1)" }],
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: "2024-12-04",
      },
    ],
    signals: [
      "slipped and fell in a store",
      "fell on an icy parking lot",
      "tripped on a broken step",
      "injured on someone's property",
      "fell in my apartment building's stairwell",
      "hurt at a venue because of a hazard",
      "suing the property owner for my fall",
      "wet floor with no sign and I fell",
      "occupiers liability claim",
    ],
    citations: [
      { sourceName: "Occupiers' Liability Act, R.S.O. 1990, c. O.2", officialUrl: OLA, verifiedAt: V, pinpoint: "ss. 1-4, 5(3), 6.1, 9(3), 10" },
      { sourceName: "Waldick v. Malcolm, [1991] 2 S.C.R. 456", officialUrl: WALDICK, verifiedAt: V },
      { sourceName: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27", officialUrl: MUSTAPHA, verifiedAt: V, pinpoint: "paras. 8-9" },
      { sourceName: "Clements v. Clements, 2012 SCC 32", officialUrl: CLEMENTS, verifiedAt: V, pinpoint: "paras. 8-9" },
      { sourceName: "Negligence Act, R.S.O. 1990, c. N.1", officialUrl: NEGLIGENCE_ACT, verifiedAt: V, pinpoint: "s. 3" },
      { sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43", officialUrl: CJA, verifiedAt: V, pinpoint: "s. 23(1)-(1.2)" },
      { sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B", officialUrl: LIMITATIONS, verifiedAt: V, pinpoint: "ss. 4, 5(1), 5(2)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-medical-or-professional-negligence",
    name: "Harm from a professional's careless work (Superior Court)",
    courtArea: "civil",
    broughtBy:
      "A patient or client harmed by careless work from a doctor, dentist, accountant, engineer or other " +
      "professional, suing the professional or their firm or institution.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "duty-and-standard-civprof",
        name: "The professional owed a duty of care and did not meet the standard of care",
        plainExplanation:
          MUSTAPHA_ELEMENTS +
          " On the standard of care, in Ryan v. Victoria (City), [1999] 1 S.C.R. 201, the Court said " +
          "conduct is negligent if it creates an objectively unreasonable risk of harm, and to avoid " +
          "liability a person must exercise the standard of care that would be expected of an ordinary, " +
          "reasonable and prudent person in the same circumstances. What is reasonable depends on the " +
          "facts of each case, including the likelihood of a known or foreseeable harm, the gravity of " +
          "that harm, and the burden or cost of preventing the injury; one may also look to external " +
          "indicators of reasonable conduct, such as custom, industry practice, and statutory or " +
          "regulatory standards (para. 28).",
        sourceUrl: RYAN,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: MUSTAPHA, pinpoint: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, para. 3" }],
        evidenceCategories: [
          {
            name: "The professional relationship",
            why: "Shows who took on the work or treatment, and what they were asked to do.",
            examples: [
              "Appointment records, an engagement letter or a retainer",
              "Invoices and receipts",
              "Consent forms or instructions you gave",
            ],
          },
          {
            name: "What was done, and the practice for that kind of work",
            why: "Ryan names custom, industry practice and regulatory standards as indicators of reasonable conduct.",
            examples: [
              "Your full file or chart, asked for in writing",
              "Published guidelines or standards for that profession",
              "A report from another professional in the same field",
            ],
          },
        ],
      },
      {
        id: "damage-civprof",
        name: "The plaintiff suffered damage the law recognizes",
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
        id: "causation-civprof",
        name: "The careless work caused the harm",
        plainExplanation:
          "In Snell v. Farrell, [1990] 2 S.C.R. 311, a medical case, the Supreme Court of Canada said " +
          "causation need not be determined by scientific precision. In many malpractice cases, the " +
          "facts lie particularly within the knowledge of the defendant, and very little affirmative " +
          "evidence on the part of the plaintiff will justify the drawing of an inference of causation " +
          "in the absence of evidence to the contrary. The legal or ultimate burden remains with the " +
          "plaintiff, but in the absence of evidence to the contrary from the defendant, an inference of " +
          "causation may be drawn although positive or scientific proof of causation has not been " +
          "given. The Court said it is not essential to have a positive medical opinion to support a " +
          "finding of causation. In Clements v. Clements, 2012 SCC 32, the majority said the test is " +
          "the \"but for\" test: the plaintiff must show on a balance of probabilities that \"but for\" " +
          "the defendant's negligent act, the injury would not have occurred (para. 8).",
        sourceUrl: SNELL,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: CLEMENTS, pinpoint: "Clements v. Clements, 2012 SCC 32, para. 8" }],
        evidenceCategories: [
          TIMELINE,
          {
            name: "Records of what happened during the work or treatment",
            why: "Snell notes the facts often lie within the defendant's knowledge; the records show them.",
            examples: [
              "Operative, procedure or chart notes",
              "The professional's working papers or file",
              "Records from the next professional who saw the problem",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "others-at-fault-civprof",
        name: "Someone else, or the plaintiff, is said to share the fault",
        plainExplanation:
          "Under s. 1 of the Negligence Act, where damages have been caused or contributed to by the " +
          "fault or neglect of two or more persons, the court shall determine the degree in which each " +
          "is at fault, and those found at fault are jointly and severally liable to the person " +
          "suffering the loss. Under s. 3, if the plaintiff's own fault contributed to the damages, the " +
          "court shall apportion the damages in proportion to the degree of fault found against the " +
          "parties. Under s. 5, a person not already a party who is or may be wholly or partly " +
          "responsible may be added as a defendant, or made a third party.",
        whenThisComesUp:
          "When the Statement of Defence blames another professional, the clinic or firm, or the " +
          "plaintiff's own choices.",
        sourceUrl: NEGLIGENCE_ACT,
        verifiedAt: V,
        consolidationPeriod: "2004-01-01",
      },
      {
        id: "harm-found-later-civprof",
        name: "The harm, or who caused it, was found out later",
        plainExplanation:
          "Under s. 5(1) of the Limitations Act, 2002, a claim is discovered on the earlier of the day " +
          "the person first knew that the injury, loss or damage had occurred, that it was caused or " +
          "contributed to by an act or omission, that the act or omission was that of the person the " +
          "claim is against, and that a proceeding would be an appropriate means to seek to remedy it " +
          "-- and the day a reasonable person with their abilities and in their circumstances first " +
          "ought to have known those things. In Grant Thornton LLP v. New Brunswick, 2021 SCC 31, a case " +
          "under New Brunswick's limitation statute, the Supreme Court of Canada said a claim is " +
          "discovered when a plaintiff has knowledge, actual or constructive, of the material facts upon " +
          "which a plausible inference of liability on the defendant's part can be drawn (para. 42).",
        whenThisComesUp:
          "When the Statement of Defence says the claim was started too late, and the harm, or its " +
          "cause, only came to light some time after the work or treatment.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: "2024-12-04",
        alsoCites: [{ sourceUrl: GRANT_THORNTON, pinpoint: "Grant Thornton LLP v. New Brunswick, 2021 SCC 31, para. 42" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Expert reports. Under r. 53.03(1) of the Rules of Civil Procedure, a party who intends to call " +
          "an expert witness at trial shall, not less than 90 days before the pre-trial conference, " +
          "serve on every other party a report, signed by the expert, containing the information listed " +
          "in r. 53.03(2.1). Under r. 53.03(2), a party who intends to call an expert to respond to " +
          "another party's expert shall serve that report not less than 60 days before the pre-trial " +
          "conference.",
        sourceUrl: RCP,
        verifiedAt: V,
        consolidationPeriod: "2026-09-01",
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: "2024-12-04",
      },
      {
        note: WHICH_COURT_NOTE,
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: "2025-12-11",
        alsoCites: [{ sourceUrl: OREG_626, pinpoint: "O. Reg. 626/00, s. 1(1)" }],
      },
    ],
    signals: [
      "doctor made a mistake during surgery",
      "medical malpractice",
      "my dentist damaged my teeth",
      "misdiagnosis caused me harm",
      "accountant's mistake cost me money",
      "engineer's careless work",
      "professional negligence claim",
      "botched procedure",
      "my surgeon was careless",
    ],
    citations: [
      { sourceName: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27", officialUrl: MUSTAPHA, verifiedAt: V, pinpoint: "paras. 3, 8-9" },
      { sourceName: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201", officialUrl: RYAN, verifiedAt: V, pinpoint: "para. 28" },
      { sourceName: "Snell v. Farrell, [1990] 2 S.C.R. 311", officialUrl: SNELL, verifiedAt: V },
      { sourceName: "Clements v. Clements, 2012 SCC 32", officialUrl: CLEMENTS, verifiedAt: V, pinpoint: "para. 8" },
      { sourceName: "Grant Thornton LLP v. New Brunswick, 2021 SCC 31", officialUrl: GRANT_THORNTON, verifiedAt: V, pinpoint: "para. 42" },
      { sourceName: "Negligence Act, R.S.O. 1990, c. N.1", officialUrl: NEGLIGENCE_ACT, verifiedAt: V, pinpoint: "ss. 1, 3, 5" },
      { sourceName: "Rules of Civil Procedure, R.R.O. 1990, Reg. 194", officialUrl: RCP, verifiedAt: V, pinpoint: "r. 53.03(1), (2)" },
      { sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B", officialUrl: LIMITATIONS, verifiedAt: V, pinpoint: "ss. 4, 5(1), 5(2)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-claim-against-government",
    name: "Suing the Ontario government or a Crown agency",
    courtArea: "civil",
    broughtBy:
      "A person harmed by something an Ontario government ministry's officer, employee or agent did, " +
      "suing the Crown in right of Ontario.",
    typicalDefendantProfile: "business",
    plaintiffElements: [
      {
        id: "crown-tort-civcrown",
        name: "A wrong was committed by an officer, employee or agent of the Crown",
        plainExplanation:
          "Under s. 8(1) of the Crown Liability and Proceedings Act, 2019, except as otherwise provided " +
          "by that Act or any other Act, the Crown is subject to all the liabilities in tort to which it " +
          "would be liable if it were a person, in respect of (a) a tort committed by an officer, " +
          "employee or agent of the Crown; (b) a breach of duty attaching to the ownership, occupation, " +
          "possession or control of property; (c) a breach of an employment-related obligation owed to " +
          "an officer or employee of the Crown; and (d) under any Act, regulation or by-law. Under s. " +
          "8(2), clause (a) does not make the Crown liable for a tort that is not attributable to the " +
          "acts or omissions of an officer, employee or agent of the Crown. Under s. 1(1), \"Crown\" " +
          "means the Crown in right of Ontario.",
        sourceUrl: CLPA,
        verifiedAt: V,
        consolidationPeriod: "2023-05-18",
        evidenceCategories: [
          {
            name: "Who acted, and for which ministry",
            why: "The claim rests on what an officer, employee or agent of the Crown did.",
            examples: [
              "Names, titles and ministry of the people involved",
              "Letters, emails or decisions on government letterhead",
              "File or reference numbers",
            ],
          },
          TIMELINE,
        ],
      },
      {
        id: "tort-elements-civcrown",
        name: "The elements of the wrong itself are shown",
        plainExplanation:
          "The Crown is liable as if it were a person, so the plaintiff has to show the same things as in " +
          "a claim against a person. Where the claim is for negligence: " +
          MUSTAPHA_ELEMENTS,
        sourceUrl: MUSTAPHA,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "What was done or not done",
            why: "Shows the act or omission the claim is about.",
            examples: ["Records of the decision, inspection or service", "Witness names and statements"],
          },
          LOSS_RECORDS,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "agencies-and-funded-bodies-civcrown",
        name: "The wrong was done by a Crown agency, Crown corporation or funded body",
        plainExplanation:
          "Under s. 9(1) of the Crown Liability and Proceedings Act, 2019, the Crown is not liable for " +
          "torts committed by Crown agencies, Crown corporations, transfer payment recipients, or " +
          "independent contractors providing services to the Crown. Under s. 1(1), a \"transfer payment " +
          "recipient\" is a person or entity that directly or indirectly receives Crown funding to " +
          "support the delivery of services to the public, including a municipality, a hospital, a " +
          "board under the Education Act, a university, college or other post-secondary institution, a " +
          "children's aid society and a long-term care home. " +
          "A \"Crown agency\" includes a corporation that is expressly stated by or under an Act to be " +
          "an agent of the Crown.",
        whenThisComesUp:
          "When the body that caused the harm is an agency, a Crown corporation, or a body such as a " +
          "hospital, school board or municipality, rather than a ministry itself.",
        sourceUrl: CLPA,
        verifiedAt: V,
        consolidationPeriod: "2023-05-18",
      },
      {
        id: "policy-and-regulatory-decisions-civcrown",
        name: "The claim is about a law, a policy or a regulatory decision",
        plainExplanation:
          "Under s. 11(1) of the Crown Liability and Proceedings Act, 2019, no cause of action arises " +
          "against the Crown for negligence or failure to take reasonable care in performing duties or " +
          "functions of a legislative nature, including making a regulation. Under s. 11(2), none " +
          "arises for a regulatory decision made in good faith, where the harm came from an act or " +
          "omission of someone who was the subject of the decision and the claim is that the decision " +
          "was made negligently. Under s. 11(4), none arises for negligence or failure to " +
          "take reasonable care in making a decision in good faith respecting a policy matter, or for " +
          "negligence in failing to make one; s. 11(5) lists what a policy matter includes, such as the " +
          "design and funding of a program.",
        whenThisComesUp:
          "When the harm is said to come from how a program was designed or funded, from a regulation, " +
          "or from a licensing or other regulatory decision.",
        sourceUrl: CLPA,
        verifiedAt: V,
        consolidationPeriod: "2023-05-18",
      },
      {
        id: "misfeasance-leave-civcrown",
        name: "A claim of misfeasance in public office or bad faith needs leave",
        plainExplanation:
          "Under s. 17(1) and (2) of the Crown Liability and Proceedings Act, 2019, a proceeding against " +
          "the Crown or an officer or employee of the Crown that includes a claim for the tort of " +
          "misfeasance in public office, or a tort based on bad faith in the exercise of the officer or " +
          "employee's powers or duties, may proceed only with leave of the court, and until leave is " +
          "granted it is deemed to be stayed. Under s. 17(3), on the motion for leave the claimant " +
          "shall serve and file an affidavit setting out a concise statement of the material facts, and " +
          "an affidavit of documents.",
        whenThisComesUp: "When the claim says a public official acted in bad faith or abused their office.",
        sourceUrl: CLPA,
        verifiedAt: V,
        consolidationPeriod: "2023-05-18",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Notice 60 days before suing. Under s. 18(1) of the Crown Liability and Proceedings Act, 2019, " +
          "no proceeding that includes a claim for damages may be brought against the Crown unless, at " +
          "least 60 days before it is started, the claimant serves on the Crown, in accordance with s. " +
          "15, notice of the claim with enough particulars to identify the occasion out of which it " +
          "arose. Section 15 says documents served personally on the Crown are left with an employee at " +
          "the Crown Law Office (Civil Law) of the Ministry of the Attorney General. Under s. 18(6), a " +
          "proceeding brought without the notice is a nullity. Under s. 18(3), if the notice is served " +
          "before the limitation period expires but the 60 days end after it, the limitation period is " +
          "extended to the seventh day after the 60 days end. Under s. 18(4), for a claim about a breach " +
          "of duty relating to property under s. 8(1)(b), the notice must be served no later than 10 " +
          "days after the event.",
        sourceUrl: CLPA,
        verifiedAt: V,
        consolidationPeriod: "2023-05-18",
      },
      {
        note:
          "How the case runs. Under s. 14 of the Crown Liability and Proceedings Act, 2019, the Crown is " +
          "named as \"His Majesty the King in right of Ontario\". Under s. 20, a proceeding against the " +
          "Crown is tried without a jury. Under s. 22(1), the court shall not grant an injunction or " +
          "order specific performance against the Crown; under s. 22(3), subject to s. 22(4), it may " +
          "instead make an order declaring the rights of the parties.",
        sourceUrl: CLPA,
        verifiedAt: V,
        consolidationPeriod: "2023-05-18",
      },
      {
        note:
          "Time limit. Under s. 16(3) of the Crown Liability and Proceedings Act, 2019, a proceeding " +
          "against the Crown is subject to any bar in law based on the passage of time. Under s. 4 of the " +
          "Limitations Act, 2002, unless the Act provides otherwise, a proceeding cannot be started after " +
          "the second anniversary of the day the claim was discovered.",
        sourceUrl: CLPA,
        verifiedAt: V,
        consolidationPeriod: "2023-05-18",
        alsoCites: [{ sourceUrl: LIMITATIONS, pinpoint: "Limitations Act, 2002, s. 4" }],
      },
    ],
    signals: [
      "suing the Ontario government",
      "suing a provincial ministry",
      "a government employee caused me harm",
      "claim against the Crown",
      "province of Ontario was negligent",
      "suing His Majesty the King in right of Ontario",
      "ministry staff made a mistake that hurt me",
      "notice of claim to the Crown",
    ],
    citations: [
      { sourceName: "Crown Liability and Proceedings Act, 2019, S.O. 2019, c. 7, Sched. 17", officialUrl: CLPA, verifiedAt: V, pinpoint: "ss. 1(1), 8, 9(1), 11, 14-18, 20, 22" },
      { sourceName: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27", officialUrl: MUSTAPHA, verifiedAt: V, pinpoint: "para. 3" },
      { sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B", officialUrl: LIMITATIONS, verifiedAt: V, pinpoint: "s. 4" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-claim-against-municipality",
    name: "Suing a city or town (road, sidewalk or service)",
    courtArea: "civil",
    broughtBy:
      "A person hurt, or whose vehicle or property was damaged, because of the condition of a municipal " +
      "road, bridge or sidewalk, or a city service, suing the municipality.",
    typicalDefendantProfile: "business",
    plaintiffElements: [
      {
        id: "road-not-in-repair-civmuni",
        name: "The road or bridge was not kept in a reasonable state of repair",
        plainExplanation:
          "Under s. 44(1) of the Municipal Act, 2001, the municipality that has jurisdiction over a " +
          "highway or bridge shall keep it in a state of repair that is reasonable in the " +
          "circumstances, including the character and location of the highway or bridge. Under s. " +
          "44(2), a municipality that defaults in complying with s. 44(1) is, subject to the " +
          "Negligence Act, liable for all damages any person sustains because of the default.",
        sourceUrl: MUNICIPAL_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-06-02",
        evidenceCategories: [
          {
            name: "The condition of the road, bridge or sidewalk",
            why: "Shows the state of repair at the time and place of the harm.",
            examples: [
              "Photos with measurements (for example, the depth of a pothole)",
              "Earlier complaints or 311 reports about the spot",
              "Witness names and statements",
            ],
          },
          {
            name: "Where it was and who is responsible for it",
            why: "The duty belongs to the municipality with jurisdiction over that highway or bridge.",
            examples: ["The exact location, with a map or GPS point", "Records showing which municipality maintains the road"],
          },
        ],
      },
      {
        id: "particular-loss-civmuni",
        name: "The plaintiff suffered a particular loss, beyond what everyone suffered",
        plainExplanation:
          "Under s. 44(15) of the Municipal Act, 2001, a municipality is not liable for damages under s. " +
          "44 unless the person claiming has suffered a particular loss or damage beyond what is suffered " +
          "by that person in common with all other persons affected by the lack of repair.",
        sourceUrl: MUNICIPAL_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-06-02",
        evidenceCategories: [INJURY_RECORDS, LOSS_RECORDS],
      },
      {
        id: "service-negligence-civmuni",
        name: "For other city services: carelessness in carrying out a service",
        plainExplanation:
          "In Nelson (City) v. Marchi, 2021 SCC 41, a case from British Columbia about a snowbank left " +
          "by city plowing, the Supreme Court of Canada said activities that open up a public authority " +
          "to liability for negligence have been defined as the practical implementation of formulated " +
          "policies, or the performance or carrying out of a policy (para. 52). On the standard of " +
          "care, a defendant must exercise the standard of care of an ordinary, reasonable and prudent " +
          "person in the same circumstances (para. 91), and the reasonableness standard applies " +
          "regardless of whether the defendant is a government or a private actor (para. 92).",
        sourceUrl: NELSON,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "How the service was carried out",
            why: "Nelson looks at how a policy was carried out in practice.",
            examples: [
              "Photos or video of the work or its result",
              "Records of the city's written policies and practices (asked for in writing)",
              "How nearby municipalities do the same work",
            ],
          },
          TIMELINE,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "statutory-defences-civmuni",
        name: "The municipality says it did not know, took reasonable steps, or met minimum standards",
        plainExplanation:
          "Under s. 44(3) of the Municipal Act, 2001, a municipality is not liable for failing to keep a " +
          "highway or bridge in a reasonable state of repair if (a) it did not know and could not " +
          "reasonably have been expected to have known about the state of repair; (b) it took reasonable " +
          "steps to prevent the default from arising; or (c) at the time the cause of action arose, " +
          "minimum standards established under s. 44(4) applied to the highway or bridge and to the " +
          "alleged default, and those standards have been met.",
        whenThisComesUp:
          "When the Statement of Defence says the municipality did not know of the problem, inspected and " +
          "repaired as required, or met the minimum maintenance standards.",
        sourceUrl: MUNICIPAL_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-06-02",
      },
      {
        id: "sidewalk-ice-and-roadside-civmuni",
        name: "Snow or ice on a sidewalk, things beside the road, and individual staff",
        plainExplanation:
          "Under s. 44(9) of the Municipal Act, 2001, except in case of gross negligence, a municipality " +
          "is not liable for a personal injury caused by snow or ice on a sidewalk. Under s. 44(8), no " +
          "action shall be brought against a municipality for damages caused by the presence, absence " +
          "or insufficiency of any wall, fence, rail or barrier along or on a highway, or by any " +
          "construction, obstruction or erection, or any siting or arrangement of any earth, rock, tree " +
          "or other material or object, adjacent to or on any untravelled portion of a highway. Under s. 45(1), no proceeding " +
          "shall be started against a member of council or an officer or employee of the municipality " +
          "for damages based on the municipality's default in keeping a highway or bridge in repair; " +
          "under s. 45(2), that does not apply to a contractor whose act or omission caused the damages.",
        whenThisComesUp:
          "When the injury was a fall on an icy or snowy sidewalk, involved a guardrail or something " +
          "beside the road, or the claim names individual city staff.",
        sourceUrl: MUNICIPAL_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-06-02",
      },
      {
        id: "core-policy-civmuni",
        name: "The municipality says the decision was a core policy decision",
        plainExplanation:
          "In Nelson (City) v. Marchi, 2021 SCC 41, the Supreme Court of Canada said core policy " +
          "decisions are immune from negligence liability, and identified four factors for assessing the " +
          "nature of a government's decision, including the level and responsibilities of the " +
          "decision-maker, the process by which the decision was made, and the nature and extent of " +
          "budgetary considerations (para. 3). In that case the Court said the City had not met its " +
          "burden of proving that the claim challenged a core policy decision immune from negligence " +
          "liability (para. 86).",
        whenThisComesUp:
          "When the Statement of Defence says the harm came from a policy choice, such as a budget or " +
          "service-level decision, rather than from how the work was carried out.",
        sourceUrl: NELSON,
        verifiedAt: V,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "A 10-day written notice for road and bridge repair claims. Under s. 44(10) of the Municipal " +
          "Act, 2001, no action shall be brought for damages under s. 44(2) unless, within 10 days after " +
          "the injury, written notice of the claim and of the injury, including the date, time and " +
          "location of the occurrence, has been served on or sent by registered mail to the clerk of the " +
          "municipality (or the clerk of each municipality, if two or more are jointly responsible). " +
          "Under s. 44(11) and (12), failing to give notice is not a bar if the injured person died as a " +
          "result of the injury, or if a judge finds there is reasonable excuse for the missing or " +
          "insufficient notice and the municipality is not prejudiced in its defence.",
        sourceUrl: MUNICIPAL_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-06-02",
      },
      {
        note:
          "Public roads are not covered by the Occupiers' Liability Act. Under s. 10(2) of the Occupiers' " +
          "Liability Act, that Act does not apply to any municipal corporation where it is an occupier " +
          "of a public highway or a public road.",
        sourceUrl: OLA,
        verifiedAt: V,
        consolidationPeriod: "2021-01-29",
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: "2024-12-04",
      },
    ],
    signals: [
      "hit a pothole and damaged my car",
      "fell on a broken city sidewalk",
      "suing the city",
      "the town didn't fix the road",
      "tripped on a raised sidewalk slab",
      "slipped on an icy sidewalk",
      "city snow plow left a dangerous snowbank",
      "claim against the municipality",
      "road in bad repair caused my crash",
    ],
    citations: [
      { sourceName: "Municipal Act, 2001, S.O. 2001, c. 25", officialUrl: MUNICIPAL_ACT, verifiedAt: V, pinpoint: "ss. 44(1)-(3), (8)-(12), (15), 45" },
      { sourceName: "Nelson (City) v. Marchi, 2021 SCC 41", officialUrl: NELSON, verifiedAt: V, pinpoint: "paras. 3, 52, 86, 91-92" },
      { sourceName: "Occupiers' Liability Act, R.S.O. 1990, c. O.2", officialUrl: OLA, verifiedAt: V, pinpoint: "s. 10(2)" },
      { sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B", officialUrl: LIMITATIONS, verifiedAt: V, pinpoint: "ss. 4, 5(1), 5(2)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-dog-bite-injury",
    name: "Injured by a dog (Superior Court)",
    courtArea: "civil",
    broughtBy:
      "A person bitten or attacked by a dog, or whose domestic animal was, suing the dog's owner -- " +
      "including anyone who possesses or harbours the dog.",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "owner-civdog",
        name: "The defendant is an owner of the dog",
        plainExplanation:
          "Under s. 1(1) of the Dog Owners' Liability Act, \"owner\", in relation to a dog, includes a " +
          "person who possesses or harbours the dog and, where the owner is a minor, the person " +
          "responsible for the custody of the minor. Under s. 2(2), where there is more than one owner " +
          "of a dog, they are jointly and severally liable.",
        sourceUrl: DOLA,
        verifiedAt: V,
        consolidationPeriod: "2024-06-06",
        evidenceCategories: [
          {
            name: "Who owned, kept or was looking after the dog",
            why: "An owner includes anyone who possesses or harbours the dog.",
            examples: [
              "Dog licence or registration records",
              "Messages or statements about who the dog lives with",
              "Names of anyone walking or minding the dog at the time",
            ],
          },
        ],
      },
      {
        id: "bite-or-attack-civdog",
        name: "The dog bit or attacked, and damages resulted",
        plainExplanation:
          "Under s. 2(1) of the Dog Owners' Liability Act, the owner of a dog is liable for damages " +
          "resulting from a bite or attack by the dog on another person or domestic animal. Under s. " +
          "2(3), the owner's liability does not depend upon knowledge of the propensity of the dog or " +
          "fault or negligence on the part of the owner.",
        sourceUrl: DOLA,
        verifiedAt: V,
        consolidationPeriod: "2024-06-06",
        evidenceCategories: [
          {
            name: "Records of the bite or attack",
            why: "Shows that a bite or attack happened, where and when.",
            examples: [
              "Photos of the wounds and the place",
              "Witness names and statements",
              "A report made to animal control or public health",
            ],
          },
          INJURY_RECORDS,
          LOSS_RECORDS,
        ],
      },
      {
        id: "burden-of-proof-civdog",
        name: "The plaintiff proves the claim on a balance of probabilities",
        plainExplanation:
          "The Superior Court of Justice's guide to the steps in a civil case says that in every civil " +
          "case the plaintiff has the burden of proof to establish, on a balance of probabilities, the " +
          "allegations in the Statement of Claim -- evidence showing that, more likely than not, it would " +
          "be correct to rule in their favour.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "An organized record of your evidence",
            why: "Each part of the claim needs evidence behind it.",
            examples: ["A dated timeline", "A list of documents and what each one shows", "Witness contact details"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "plaintiff-fault-civdog",
        name: "The injured person's own fault, or someone else's, is said to have contributed",
        plainExplanation:
          "Under s. 2(3) of the Dog Owners' Liability Act, the court shall reduce the damages awarded in " +
          "proportion to the degree, if any, to which the fault or negligence of the plaintiff caused or " +
          "contributed to the damages. Under s. 2(4), an owner who is liable is entitled to recover " +
          "contribution and indemnity from any other person in proportion to the degree to which that " +
          "person's fault or negligence caused or contributed to the damages.",
        whenThisComesUp:
          "When the Statement of Defence says the injured person provoked the dog or ignored warnings, or " +
          "blames someone else who was handling the dog.",
        sourceUrl: DOLA,
        verifiedAt: V,
        consolidationPeriod: "2024-06-06",
      },
      {
        id: "on-owners-premises-civdog",
        name: "The bite happened on the owner's property",
        plainExplanation:
          "Under s. 3(1) of the Dog Owners' Liability Act, where damage is caused by being bitten or " +
          "attacked by a dog on the premises of the owner, the owner's liability is determined under the " +
          "Dog Owners' Liability Act and not under the Occupiers' Liability Act. Under s. 3(2), where a " +
          "person is on the premises with the intention of committing, or in the commission of, a " +
          "criminal act, the owner is not liable under s. 2 unless keeping the dog there was " +
          "unreasonable for the purpose of the protection of persons or property.",
        whenThisComesUp: "When the bite or attack happened at the dog owner's home or on their land.",
        sourceUrl: DOLA,
        verifiedAt: V,
        consolidationPeriod: "2024-06-06",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "A separate process about the dog. Under s. 4(1) of the Dog Owners' Liability Act, a proceeding " +
          "may be started in the Ontario Court of Justice against an owner if it is alleged that the dog " +
          "has bitten or attacked a person or domestic animal, has behaved in a way that poses a menace " +
          "to the safety of persons or domestic animals, or that the owner did not take reasonable " +
          "precautions to prevent that. Under s. 4(1.2), Part IX of the Provincial Offences Act applies " +
          "to that proceeding. That is a different process from a claim for damages.",
        sourceUrl: DOLA,
        verifiedAt: V,
        consolidationPeriod: "2024-06-06",
      },
      {
        note: WHICH_COURT_NOTE,
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: "2025-12-11",
        alsoCites: [{ sourceUrl: OREG_626, pinpoint: "O. Reg. 626/00, s. 1(1)" }],
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: "2024-12-04",
      },
    ],
    signals: [
      "bitten by a dog",
      "dog attack injuries",
      "neighbour's dog bit me",
      "dog attacked my child",
      "a dog attacked my dog",
      "serious dog bite needed surgery",
      "suing the dog owner",
      "mauled by a dog",
    ],
    citations: [
      { sourceName: "Dog Owners' Liability Act, R.S.O. 1990, c. D.16", officialUrl: DOLA, verifiedAt: V, pinpoint: "ss. 1(1), 2, 3, 4(1), (1.2)" },
      { sourceName: "Superior Court of Justice -- Steps in a civil case", officialUrl: SCJ_STEPS, verifiedAt: V, pinpoint: "Burden of proof" },
      { sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43", officialUrl: CJA, verifiedAt: V, pinpoint: "s. 23(1)-(1.2)" },
      { sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B", officialUrl: LIMITATIONS, verifiedAt: V, pinpoint: "ss. 4, 5(1), 5(2)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-privacy-intrusion",
    name: "Your privacy was invaded",
    courtArea: "civil",
    broughtBy:
      "A person whose private affairs were deliberately intruded on -- for example, their bank or health " +
      "records looked at without reason, or their private messages read -- suing the person who did it.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "intentional-intrusion-civpriv",
        name: "The defendant intruded on purpose, or recklessly",
        plainExplanation:
          "In Jones v. Tsige, 2012 ONCA 32, the Court of Appeal for Ontario recognized a right of action " +
          "for intrusion upon seclusion. It adopted this formulation: one who intentionally intrudes, " +
          "physically or otherwise, upon the seclusion of another or their private affairs or concerns, " +
          "is subject to liability for invasion of privacy, if the invasion would be highly offensive " +
          "to a reasonable person (para. 70). The first key feature is that the defendant's conduct must " +
          "be intentional, which the Court said includes reckless (para. 71).",
        sourceUrl: JONES,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "Records of the access or intrusion",
            why: "Shows what was looked at, recorded or entered, and when.",
            examples: [
              "An access log or audit report from a bank, clinic or employer",
              "Screenshots, recordings or devices found",
              "A letter from an organization confirming the access",
            ],
          },
          {
            name: "Signs it was deliberate",
            why: "The conduct must be intentional or reckless.",
            examples: [
              "How many times it happened and over how long",
              "Messages from the person showing what they knew",
              "Any admission or apology",
            ],
          },
        ],
      },
      {
        id: "private-matters-civpriv",
        name: "The matters intruded on were private, and there was no lawful justification",
        plainExplanation:
          "In Jones v. Tsige, 2012 ONCA 32, the Court of Appeal for Ontario said the second key feature " +
          "is that the defendant must have invaded, without lawful justification, the plaintiff's " +
          "private affairs or concerns (para. 71). The Court said it is only intrusions into matters " +
          "such as one's financial or health records, sexual practices and orientation, employment, " +
          "diary or private correspondence that, viewed objectively on the reasonable person standard, " +
          "can be described as highly offensive (para. 72).",
        sourceUrl: JONES,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "What the information was",
            why: "Shows the kind of private matter involved.",
            examples: [
              "A description of the records or messages involved",
              "Proof the information was kept private (passwords, locked files, closed accounts)",
            ],
          },
          {
            name: "Whether the person had any reason to access it",
            why: "The invasion has to be without lawful justification.",
            examples: [
              "The person's job duties, if they accessed records at work",
              "Any consent you did or did not give",
            ],
          },
        ],
      },
      {
        id: "highly-offensive-civpriv",
        name: "A reasonable person would regard the invasion as highly offensive",
        plainExplanation:
          "In Jones v. Tsige, 2012 ONCA 32, the Court of Appeal for Ontario said the third key feature is " +
          "that a reasonable person would regard the invasion as highly offensive causing distress, " +
          "humiliation or anguish. Proof of harm to a recognized economic interest is not an element " +
          "(para. 71). A claim will arise only for deliberate and significant invasions of personal " +
          "privacy; claims from individuals who are sensitive or unusually concerned about their privacy " +
          "are excluded (para. 72).",
        sourceUrl: JONES,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "How it affected you",
            why: "The invasion is measured by the distress, humiliation or anguish a reasonable person would feel.",
            examples: [
              "A journal of how it affected you",
              "Notes from a doctor or counsellor, if you sought help",
              "Statements from people who saw the effect on you",
            ],
          },
          TIMELINE,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "damages-range-civpriv",
        name: "How much money is at stake",
        plainExplanation:
          "In Jones v. Tsige, 2012 ONCA 32, the Court of Appeal for Ontario said damages for intrusion " +
          "upon seclusion where the plaintiff has suffered no pecuniary loss should be modest but " +
          "sufficient to mark the wrong, and fixed the range at up to $20,000 (para. 87). It listed " +
          "factors for where in the range a case falls: the nature, incidence and occasion of the " +
          "wrongful act; its effect on the plaintiff's health, welfare, social, business or financial " +
          "position; any relationship between the parties; any distress, annoyance or embarrassment " +
          "suffered; and the conduct of the parties before and after, including any apology or offer of " +
          "amends (para. 87). The Court said it would neither exclude nor encourage awards of aggravated " +
          "and punitive damages (para. 88).",
        whenThisComesUp: "When working out the amount to claim, and so which court to use.",
        sourceUrl: JONES,
        verifiedAt: V,
      },
      {
        id: "competing-interests-civpriv",
        name: "Freedom of expression or of the press is involved",
        plainExplanation:
          "In Jones v. Tsige, 2012 ONCA 32, the Court of Appeal for Ontario said claims for the protection " +
          "of privacy may give rise to competing claims, foremost freedom of expression and freedom of " +
          "the press; no right to privacy can be absolute, and many claims for the protection of privacy " +
          "will have to be reconciled with, and even yield to, such competing claims (para. 73).",
        whenThisComesUp: "When the intrusion was by a journalist or was connected to something published.",
        sourceUrl: JONES,
        verifiedAt: V,
      },
      {
        id: "health-information-civpriv",
        name: "The information was personal health information",
        plainExplanation:
          "Under s. 65(1) of the Personal Health Information Protection Act, 2004, if the Information and " +
          "Privacy Commissioner has made an order under that Act that has become final, a person " +
          "affected by the order may start a proceeding in the Superior Court of Justice for damages for " +
          "actual harm suffered as a result of a contravention of the Act or its regulations. Under s. " +
          "65(2), the same applies after a person has been convicted of an offence under the Act and the " +
          "conviction is final. Under s. 65(3), if the court finds the harm was caused by a " +
          "contravention or offence engaged in wilfully or recklessly, it may include an award of not " +
          "more than $10,000 for mental anguish.",
        whenThisComesUp:
          "When the records looked at were health records held by a hospital, clinic, pharmacy or other " +
          "health care provider.",
        sourceUrl: PHIPA,
        verifiedAt: V,
        consolidationPeriod: "2026-01-01",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: [],
    proceduralNotes: [
      {
        note: WHICH_COURT_NOTE,
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: "2025-12-11",
        alsoCites: [{ sourceUrl: OREG_626, pinpoint: "O. Reg. 626/00, s. 1(1)" }],
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: "2024-12-04",
      },
    ],
    signals: [
      "someone snooped in my bank records",
      "invasion of privacy",
      "they looked at my medical records without reason",
      "read my private messages",
      "secretly recorded me",
      "intrusion upon seclusion",
      "employee accessed my file without permission",
      "my ex went through my private emails",
    ],
    citations: [
      { sourceName: "Jones v. Tsige, 2012 ONCA 32", officialUrl: JONES, verifiedAt: V, pinpoint: "paras. 70-73, 87-88" },
      { sourceName: "Personal Health Information Protection Act, 2004, S.O. 2004, c. 3, Sched. A", officialUrl: PHIPA, verifiedAt: V, pinpoint: "s. 65" },
      { sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43", officialUrl: CJA, verifiedAt: V, pinpoint: "s. 23(1)-(1.2)" },
      { sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B", officialUrl: LIMITATIONS, verifiedAt: V, pinpoint: "ss. 4, 5(1), 5(2)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-insurance-claim-denied",
    name: "Your insurer refused a claim",
    courtArea: "civil",
    broughtBy:
      "A person or business whose own insurer refused, delayed or underpaid a claim under their policy, " +
      "suing the insurer.",
    typicalDefendantProfile: "business",
    plaintiffElements: [
      {
        id: "policy-covers-loss-civins",
        name: "The policy covers the loss",
        plainExplanation:
          "An insurance policy is a contract. In Sattva Capital Corp. v. Creston Moly Corp., 2014 SCC 53, " +
          "the Supreme Court of Canada said the overriding concern in interpreting a contract is to " +
          "determine the intent of the parties and the scope of their understanding; to do so, a " +
          "decision-maker must read the contract as a whole, giving the words used their ordinary and " +
          "grammatical meaning, consistent with the surrounding circumstances known to the parties at " +
          "the time of formation of the contract (para. 47).",
        sourceUrl: SATTVA,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "The full policy",
            why: "The contract is read as a whole.",
            examples: [
              "The complete policy wording, including endorsements and exclusions",
              "The declarations page for the period of the loss",
              "Renewal notices and any changes to coverage",
            ],
          },
          {
            name: "What happened",
            why: "Shows the loss and how it fits the coverage.",
            examples: ["Photos and videos of the loss", "Police, fire or repair reports", "Receipts and an inventory of what was lost"],
          },
        ],
      },
      {
        id: "notice-and-proof-of-loss-civins",
        name: "Notice and proof of loss were given",
        plainExplanation:
          "For contracts of fire insurance under Part IV of the Insurance Act (s. 143(1) sets out which " +
          "contracts that Part applies to), s. 148(1) says the statutory conditions are deemed to be part " +
          "of every contract. Statutory condition 6(1) says that on any loss or damage to the insured " +
          "property the insured shall, if the loss is covered, forthwith give notice in writing to the " +
          "insurer, and deliver as soon as practicable a proof of loss verified by a statutory " +
          "declaration, giving a complete inventory of the destroyed and damaged property and stating " +
          "when and how the loss occurred. Statutory condition 12 says the loss is payable within sixty " +
          "days after completion of the proof of loss, unless the contract provides for a shorter " +
          "period.",
        sourceUrl: INSURANCE_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-01-01",
        evidenceCategories: [
          {
            name: "Your notice and proof of loss",
            why: "Shows when notice was given and when the proof of loss was complete.",
            examples: [
              "The written notice of loss and how it was sent",
              "The signed proof of loss and statutory declaration",
              "The insurer's acknowledgement and claim number",
            ],
          },
          {
            name: "The insurer's response",
            why: "Shows what the insurer decided and when.",
            examples: ["The denial letter and its reasons", "Adjuster emails and reports", "Dates of every request and reply"],
          },
        ],
      },
      {
        id: "good-faith-civins",
        name: "How the insurer handled the claim (the duty of good faith)",
        plainExplanation:
          "In Fidler v. Sun Life Assurance Co. of Canada, 2006 SCC 30, the Supreme Court of Canada " +
          "described an insurer's independent contractual obligation to deal with an insured's claim in " +
          "good faith, adopting this statement: the duty of good faith requires an insurer to deal with " +
          "its insured's claim fairly, both in how it investigates and assesses the claim and in deciding " +
          "whether to pay; it must assess the merits of the claim in a balanced and reasonable manner, " +
          "and must not deny coverage or delay payment in order to take advantage of the insured's " +
          "economic vulnerability or to gain bargaining leverage. The duty does not require an insurer " +
          "to be correct, and mere denial of a claim that ultimately succeeds is not, in itself, an act " +
          "of bad faith (para. 63).",
        sourceUrl: FIDLER,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "How the claim was investigated and decided",
            why: "The duty covers both the investigation and the decision.",
            examples: [
              "The full claim file (asked for in writing)",
              "Notes of every call with the adjuster",
              "Settlement offers and what was said with them",
            ],
          },
          TIMELINE,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "relief-from-forfeiture-civins",
        name: "The insurer relies on a missed requirement",
        plainExplanation:
          "Under s. 129 of the Insurance Act, where there has been imperfect compliance with a statutory " +
          "condition as to the proof of loss, or another thing the insured had to do or not do about the " +
          "loss, with a resulting forfeiture or avoidance of the insurance, and the court considers it " +
          "inequitable that the insurance should be forfeited or avoided on that ground, the court may " +
          "relieve against the forfeiture or avoidance on such terms as it considers just. Under s. " +
          "131(1), the insured's obligation to comply with a requirement is excused to the extent the " +
          "insurer gave written notice excusing it, or the insurer's conduct reasonably caused the " +
          "insured to believe it was excused and the insured acted on that belief to their detriment.",
        whenThisComesUp:
          "When the denial says notice or proof of loss was late or incomplete, or another policy " +
          "requirement was not met.",
        sourceUrl: INSURANCE_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-01-01",
      },
      {
        id: "appraisal-civins",
        name: "The disagreement is about the amount of the loss",
        plainExplanation:
          "Under s. 128 of the Insurance Act, where a contract provides for appraisal if the insured and " +
          "insurer disagree, each appoints an appraiser, the two appoint an umpire, and the finding in " +
          "writing of any two determines the matters; each party pays its own appraiser and they share " +
          "the cost of the appraisal and the umpire. For fire insurance, statutory condition 11 says a " +
          "disagreement about the value of the property, the property saved or the amount of the loss " +
          "shall be determined by appraisal before there can be any recovery under the contract, and " +
          "there is no right to an appraisal until a specific demand is made in writing and after proof " +
          "of loss has been delivered.",
        whenThisComesUp: "When the insurer accepts the loss is covered but the two sides disagree on how much it is worth.",
        sourceUrl: INSURANCE_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-01-01",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Shorter time limits for some insurance claims. For fire insurance, statutory condition 14 in " +
          "s. 148 of the Insurance Act says every action against the insurer for the recovery of a claim " +
          "under the contract is absolutely barred unless started within one year next after the loss or " +
          "damage occurs. Under s. 259.1, a proceeding against an insurer for loss or damage to an " +
          "automobile or its contents shall be started within one year after the loss or damage. Under " +
          "s. 19(1) of the Limitations Act, 2002, a limitation period in another Act has no effect " +
          "unless it is listed in that Act's Schedule; the Schedule lists Insurance Act s. 148, " +
          "statutory condition 14, and s. 259.1.",
        sourceUrl: INSURANCE_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-01-01",
        alsoCites: [{ sourceUrl: LIMITATIONS, pinpoint: "Limitations Act, 2002, s. 19(1) and Schedule" }],
      },
      {
        note:
          "Accident benefits go to a tribunal, not this court. Under s. 280(2) of the Insurance Act, a " +
          "dispute about entitlement to statutory accident benefits, or their amount, may be brought to " +
          "the Licence Appeal Tribunal, and under s. 280(3) no person may bring a proceeding in any " +
          "court about such a dispute, other than an appeal from the Tribunal's decision or an " +
          "application for judicial review.",
        sourceUrl: INSURANCE_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-01-01",
      },
      {
        note: WHICH_COURT_NOTE,
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: "2025-12-11",
        alsoCites: [{ sourceUrl: OREG_626, pinpoint: "O. Reg. 626/00, s. 1(1)" }],
      },
    ],
    signals: [
      "my insurance company denied my claim",
      "insurer refused to pay for the fire",
      "home insurance claim rejected",
      "insurance company won't pay",
      "denied coverage under my policy",
      "insurer is delaying my claim",
      "disability insurance claim denied",
      "suing my insurance company",
    ],
    citations: [
      { sourceName: "Insurance Act, R.S.O. 1990, c. I.8", officialUrl: INSURANCE_ACT, verifiedAt: V, pinpoint: "ss. 128, 129, 131(1), 143(1), 148 (statutory conditions 6, 11, 12, 14), 259.1, 280" },
      { sourceName: "Sattva Capital Corp. v. Creston Moly Corp., 2014 SCC 53", officialUrl: SATTVA, verifiedAt: V, pinpoint: "para. 47" },
      { sourceName: "Fidler v. Sun Life Assurance Co. of Canada, 2006 SCC 30", officialUrl: FIDLER, verifiedAt: V, pinpoint: "para. 63" },
      { sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B", officialUrl: LIMITATIONS, verifiedAt: V, pinpoint: "s. 19(1) and Schedule" },
      { sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43", officialUrl: CJA, verifiedAt: V, pinpoint: "s. 23(1)-(1.2)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-construction-lien",
    name: "Enforcing or fighting a construction lien",
    courtArea: "civil",
    broughtBy:
      "A contractor, subcontractor or supplier who was not paid for work or materials on a building " +
      "project, enforcing a lien -- or a property owner whose land has a lien registered against it.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "lien-arises-civlien",
        name: "Services or materials were supplied to an improvement",
        plainExplanation:
          "Under s. 14(1) of the Construction Act, a person who supplies services or materials to an " +
          "improvement for an owner, contractor or subcontractor has a lien upon the interest of the " +
          "owner in the premises improved for the price of those services or materials. Under s. 14(2), " +
          "no one is entitled to a lien for interest on the amount owed. Under s. 1(1), an " +
          "\"improvement\" includes any alteration, addition or capital repair to the land, and any " +
          "construction, erection or installation on the land; an \"owner\" is any person having an " +
          "interest in the premises at whose request and upon whose credit, or on whose behalf, or with " +
          "whose privity or consent, or for whose direct benefit, the improvement is made, but does not " +
          "include a home buyer.",
        sourceUrl: CONSTRUCTION_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-01-01",
        evidenceCategories: [
          {
            name: "The contract and the work",
            why: "Shows who asked for the work, what was supplied and the agreed price.",
            examples: [
              "The contract or subcontract, quotes and change orders",
              "Invoices, delivery slips and timesheets",
              "Photos of the work done",
            ],
          },
          {
            name: "The property",
            why: "The lien is on the owner's interest in the premises improved.",
            examples: ["The property address and legal description", "A title search showing the owner"],
          },
        ],
      },
      {
        id: "lien-preserved-civlien",
        name: "The lien was preserved before it expired",
        plainExplanation:
          "Under s. 31(1) of the Construction Act, unless preserved under s. 34, a lien expires as " +
          "provided in s. 31. Under s. 31(2), a contractor's lien, for services or materials supplied on " +
          "or before the date certified or declared to be the date of substantial performance, expires " +
          "at the end of the 60-day period after the earlier of the publication of that certificate or " +
          "declaration and the date the contract is completed, abandoned or terminated; where there is " +
          "no certification or declaration, it expires at the end of the 60-day period after the earlier " +
          "of the date the contract is completed and the date it is abandoned or terminated. Section " +
          "31(3) sets the 60-day periods for other people, which include the date the person last " +
          "supplied services or materials. Under s. 34(1), a lien may be preserved during the supply of services " +
          "or materials or at any time before it expires: where the lien attaches to the premises, by " +
          "registering a claim for lien on title in the proper land registry office; where it does not, " +
          "by giving the owner a copy of the claim for lien.",
        sourceUrl: CONSTRUCTION_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-01-01",
        evidenceCategories: [
          {
            name: "Key dates",
            why: "The 60-day periods run from specific events.",
            examples: [
              "The last day you supplied services or materials",
              "Any published certificate or declaration of substantial performance",
              "The date the contract was completed, abandoned or terminated",
            ],
          },
          {
            name: "The claim for lien",
            why: "Shows when and how the lien was preserved.",
            examples: ["The registered claim for lien and its registration date", "Proof a copy was given to the owner, where required"],
          },
        ],
      },
      {
        id: "lien-perfected-civlien",
        name: "The lien was perfected by starting an action in time",
        plainExplanation:
          "Under s. 36(1) of the Construction Act, a lien may not be perfected unless it is preserved. " +
          "Under s. 36(2), a preserved lien expires unless it is perfected before the end of the 90-day " +
          "period after the last day, under s. 31, on which it could have been preserved. Under s. " +
          "36(3), where the lien attaches to the premises, it is perfected when the lien claimant starts " +
          "an action to enforce it and registers a certificate of action on title (unless an order " +
          "vacating the lien's registration is made); where it does not attach to the premises, when the " +
          "action is started.",
        sourceUrl: CONSTRUCTION_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-01-01",
        evidenceCategories: [
          {
            name: "The action and certificate",
            why: "Shows the lien was perfected within the 90 days.",
            examples: ["The issued Statement of Claim and its date", "The registered certificate of action"],
          },
          TIMELINE,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "vacate-by-security-civlien",
        name: "Removing the lien from title by paying money or security into court",
        plainExplanation:
          "Under s. 44(1) of the Construction Act, on the motion of any person, without notice, the court " +
          "shall make an order vacating the registration of a claim for lien (and any certificate of " +
          "action) where the person pays into court, or posts security in, an amount equal to the full " +
          "amount claimed in the lien plus the lesser of $250,000 or 25 per cent of that amount as " +
          "security for costs. Under s. 44(2), on motion, the court may vacate the registration on " +
          "payment into court or posting of security of an amount the court determines to be reasonable " +
          "in the circumstances to satisfy the lien.",
        whenThisComesUp:
          "When an owner needs the lien off title -- for example, to sell or refinance -- while the dispute " +
          "about the money continues.",
        sourceUrl: CONSTRUCTION_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-01-01",
      },
      {
        id: "discharge-or-exaggerated-civlien",
        name: "The lien is said to be improper, exaggerated or expired",
        plainExplanation:
          "Under s. 47(1) of the Construction Act, the court may, on motion, order the discharge of a " +
          "lien on the basis that the claim for lien is frivolous, vexatious or an abuse of process, or " +
          "on any other proper ground; under s. 47(1.1), it may also, on any proper ground, vacate the " +
          "registration, declare a lien expired, or dismiss an action. Under s. 35(1), a person who " +
          "preserves a claim for lien is liable to any person who suffers damages as a result, where the " +
          "person knows or ought to know that the amount of the lien has been wilfully exaggerated, or " +
          "that they do not have a lien.",
        whenThisComesUp:
          "When the owner says the lien was registered too late, is for more than is owed, or should not " +
          "have been registered at all.",
        sourceUrl: CONSTRUCTION_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-01-01",
      },
      {
        id: "older-contracts-civlien",
        name: "The contract was made before July 1, 2018",
        plainExplanation:
          "Under s. 87.3(1) of the Construction Act, the Act and the regulations as they read on June 29, " +
          "2018 continue to apply to an improvement if a contract for the improvement was entered into, " +
          "or a procurement process for it was started by the owner, before July 1, 2018 (with a further " +
          "rule for some leasehold premises).",
        whenThisComesUp: "When the contract for the project was signed, or the project was tendered, before July 1, 2018.",
        sourceUrl: CONSTRUCTION_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-01-01",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Which court. Under s. 50(1) of the Construction Act, a lien claim is enforceable in an action " +
          "in the Superior Court of Justice. Under s. 50(2), the Courts of Justice Act and the rules of " +
          "court apply except where inconsistent with the Act and its prescribed procedures. Under s. " +
          "50(3), the procedure shall be as far as possible of a summary character, having regard to the " +
          "amount and nature of the liens in question.",
        sourceUrl: CONSTRUCTION_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-01-01",
      },
      {
        note:
          "Moving the action forward. Under s. 37(1) of the Construction Act, a perfected lien expires " +
          "immediately after the second anniversary of the start of the action that perfected it, unless " +
          "on or before that anniversary an order is made for the trial of an action in which the lien " +
          "may be enforced, or such an action is set down for trial. Under s. 38, the expiry of a lien " +
          "does not affect any other legal or equitable right or remedy otherwise available to the person " +
          "whose lien has expired.",
        sourceUrl: CONSTRUCTION_ACT,
        verifiedAt: V,
        consolidationPeriod: "2026-01-01",
      },
    ],
    signals: [
      "contractor put a lien on my house",
      "construction lien",
      "registered a claim for lien",
      "not paid for renovation work and want a lien",
      "subcontractor unpaid on a building project",
      "supplier wasn't paid for materials",
      "need to get a lien off my title",
      "lien registered on my property",
    ],
    citations: [
      { sourceName: "Construction Act, R.S.O. 1990, c. C.30", officialUrl: CONSTRUCTION_ACT, verifiedAt: V, pinpoint: "ss. 1(1), 14, 31, 34(1), 35(1), 36-38, 44, 47, 50, 87.3(1)" },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
