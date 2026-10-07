/**
 * Case types, batch "gaps-4" (civil): types first left out for want of saved law,
 * written once the law was saved (2026-10-07). Sources are recorded in
 * docs/sources/catalogue-verification/gaps-4.json and held by test:catalogue-verified.
 *
 *   civil-claim-assault-and-battery -- Someone hurt you on purpose (assault and battery, civil claim)
 *
 * What a battery claim requires comes from Non-Marine Underwriters, Lloyd's of
 * London v. Scalera, 2000 SCC 24, saved at docs/sources/decisions/. On battery,
 * McLachlin J. wrote for four of the seven judges (L'Heureux-Dube, Gonthier,
 * McLachlin and Binnie JJ.). The decision does not state the elements of an
 * assault in the sense of a threat without contact, so the elements here are
 * those of battery; the Limitations Act, 2002 says "assault" includes a battery.
 */

import type { ClaimType } from "../claimTypes";

const V = "2026-10-07";

const SCALERA = "docs/sources/decisions/non-marine-underwriters-v-scalera-2000-SCC-24.html.txt";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const OREG_626 = "https://www.ontario.ca/laws/docs/000626_e.doc";
const SCJ_STEPS =
  "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/";

const SCALERA_NAME = "Non-Marine Underwriters, Lloyd's of London v. Scalera, 2000 SCC 24";

export const TYPES_GAPS_4: ClaimType[] = [
  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-assault-and-battery",
    name: "Someone hurt you on purpose (assault and battery, civil claim)",
    courtArea: "civil",
    broughtBy:
      "A person who was hit, pushed, grabbed or touched by someone on purpose, suing that person for " +
      "damages in a civil court (separate from any criminal charge).",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "direct-contact-civbat",
        name: "The defendant made direct contact with you through a deliberate act",
        plainExplanation:
          "In Non-Marine Underwriters, Lloyd's of London v. Scalera, 2000 SCC 24, McLachlin J., writing " +
          "for four of the seven judges on battery, described the settled rule as requiring the " +
          "plaintiff in a battery case to show only contact through a direct, intentional act of the " +
          "defendant, with the onus on the defendant of showing consent or lawful excuse (para. 7). " +
          "The plaintiff in an action for trespass to the person (which includes battery) succeeds if " +
          "she can prove direct interference with her person. Interference is direct if it is the " +
          "immediate consequence of a force set in motion by an act of the defendant. The burden is " +
          "then on the defendant to allege and prove his defence (para. 8). The Court said the " +
          "plaintiff in an action for battery need prove only a direct interference, at which point " +
          "the onus shifts to the person said to have violated the right to justify the intrusion, " +
          "excuse it or raise some other defence (para. 10).",
        sourceUrl: SCALERA,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "What happened, and who did it",
            why: "Shows the contact itself and that it came directly from the defendant's act.",
            examples: [
              "Your own written account, made as soon as you could",
              "Names and statements of people who saw it",
              "Video from a phone, doorbell or security camera",
            ],
          },
          {
            name: "Records made at the time",
            why: "Shows when and where it happened, and what was reported.",
            examples: [
              "A police report or occurrence number",
              "Texts, emails or social media messages about the incident",
              "Photos of the place and of any injuries, with their dates",
            ],
          },
        ],
      },
      {
        id: "beyond-ordinary-contact-civbat",
        name: "The contact was more than the ordinary contact of everyday life",
        plainExplanation:
          "In Scalera, the Court said contact must be \"harmful or offensive\" to constitute battery, " +
          "but that not every trivial contact suffices: a person who enters a crowd cannot sue for " +
          "being jostled (paras. 18-19). All contact outside the exceptional category of contact that " +
          "is generally accepted or expected in the course of ordinary life is prima facie offensive " +
          "(para. 18). The ordinary contacts the cases have in mind include brushing someone's hand " +
          "while exchanging a gift, a handshake, or being jostled in a crowd; sexual contact is not in " +
          "that category (para. 21). The case law generally does not require actual physical or " +
          "psychological injury (para. 16). Physical and psychological harm may go to damages (para. 23).",
        sourceUrl: SCALERA,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "What kind of contact it was",
            why: "Shows the contact was not the everyday kind people are expected to accept.",
            examples: [
              "A description of exactly what was done (a punch, a shove, a grab, unwanted touching)",
              "Witness accounts of what they saw",
              "Video or audio of the incident",
            ],
          },
          {
            name: "Records of any injury",
            why: "Physical or psychological harm goes to the damages claimed.",
            examples: [
              "Emergency, hospital, clinic or doctor's records",
              "Notes from a counsellor, therapist or psychologist",
              "Photos of injuries taken over time",
            ],
          },
          {
            name: "Records of what the harm cost",
            why: "Shows the money and other losses that followed.",
            examples: [
              "Receipts for treatment, medication and travel to appointments",
              "Pay stubs or an employer letter showing time missed from work",
              "Receipts for damaged clothing, glasses or a phone",
            ],
          },
        ],
      },
      {
        id: "burden-of-proof-civbat",
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
          {
            name: "A dated timeline",
            why: "Shows the order of events: what happened, then what followed.",
            examples: [
              "A written timeline with dates and times",
              "Messages or notes made at or near the time",
              "Photos with their dates",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "consent-civbat",
        name: "The defendant says you consented",
        plainExplanation:
          "In Scalera, the Court said Canadian law places the onus of proving consent on the defendant " +
          "(paras. 3-4, 6). It quoted the Court's earlier statement that \"Consent, express or implied, " +
          "is a defence to battery\" (para. 6). For sexual battery, it said that if the defendant does " +
          "not dispute that the contact took place, he bears the burden of proving that the plaintiff " +
          "consented or that a reasonable person in his position would have thought that she consented " +
          "(para. 2), and the plaintiff may establish an action for sexual battery without negativing " +
          "actual or constructive consent (para. 18). If the defendant can show he acted with consent, the prima facie violation is negated " +
          "and the plaintiff's claim will fail (para. 15).",
        whenThisComesUp:
          "When the Statement of Defence says you agreed to the contact -- for example, in a sport, a " +
          "medical treatment, or a sexual or personal relationship.",
        sourceUrl: SCALERA,
        verifiedAt: V,
      },
      {
        id: "no-intent-or-negligence-civbat",
        name: "The defendant says the contact was neither intended nor careless",
        plainExplanation:
          "In Scalera, the Court said the right protected by battery is not absolute, because a " +
          "defendant who violates it can still exonerate himself by proving a lack of intention or " +
          "negligence (para. 10). It quoted an earlier decision stating that where the plaintiff proves " +
          "he has been injured by the direct act of the defendant, the onus falls on the defendant to " +
          "prove that his act was both unintentional and without negligence on his part (para. 5).",
        whenThisComesUp:
          "When the Statement of Defence says the contact was an accident and happened without any " +
          "carelessness.",
        sourceUrl: SCALERA,
        verifiedAt: V,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-waiver-release-assumption-of-risk"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Which court. Under s. 23(1) of the Courts of Justice Act, the Small Claims Court has " +
          "jurisdiction in an action for the payment of money where the amount claimed does not exceed " +
          "the prescribed amount, not counting interest and costs; under s. 1(1) of O. Reg. 626/00, that " +
          "amount is $50,000. Under s. 23(1.1), an action that is within the Small Claims Court's " +
          "jurisdiction shall not be started in the Superior Court of Justice except with leave of the " +
          "Superior Court of Justice as provided in the rules of court. Under s. 23(1.2), that does not " +
          "apply to a counterclaim, crossclaim or third party claim where the main action was started " +
          "in the Superior Court.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: "2025-12-11",
        alsoCites: [{ sourceUrl: OREG_626, pinpoint: "O. Reg. 626/00, s. 1(1)" }],
      },
      {
        note:
          "Time limit. Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a " +
          "proceeding cannot be started after the second anniversary of the day the claim was " +
          "discovered. Under s. 5(1), a claim is discovered on the earlier of the day the person first " +
          "knew that the injury, loss or damage had occurred, that it was caused or contributed to by an " +
          "act or omission, that the act or omission was that of the person the claim is against, and " +
          "that, having regard to the nature of the injury, loss or damage, a proceeding would be an " +
          "appropriate means to seek to remedy it -- and the day a reasonable person with their " +
          "abilities and in their circumstances first ought to have known those things. Under s. 5(2), " +
          "a person is presumed to have known those things on the day the act or omission took place, " +
          "unless the contrary is proved.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: "2024-12-04",
      },
      {
        note:
          "When there is no time limit. Under s. 1 of the Limitations Act, 2002, \"assault\" includes a " +
          "battery. Under s. 16(1)(h), there is no limitation period for a proceeding based on a sexual " +
          "assault. Under s. 16(1)(h.2), there is no limitation period for a proceeding based on an " +
          "assault if, at the time of the assault, the person with the claim was a minor, or the two " +
          "had an intimate relationship, or the person with the claim was financially, emotionally, " +
          "physically or otherwise dependent on the other person. Under s. 16(1.1), these clauses apply " +
          "whenever the act occurred or the proceeding was started, and regardless of the expiry of any " +
          "previously applicable limitation period -- but under s. 16(1.2), not to a proceeding that a " +
          "court has dismissed with no further appeal available, or that the parties have settled with a " +
          "legally binding settlement.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: "2024-12-04",
      },
    ],
    signals: [
      "someone punched me",
      "I was assaulted and want to sue",
      "he hit me on purpose",
      "pushed me to the ground",
      "attacked me and I was injured",
      "touched me without my consent",
      "suing the person who assaulted me",
      "beaten up",
      "civil claim for assault",
      "sexual assault civil lawsuit",
    ],
    citations: [
      {
        sourceName: SCALERA_NAME,
        officialUrl: SCALERA,
        verifiedAt: V,
        pinpoint: "paras. 2-8, 10, 15-16, 18-19, 21, 23",
      },
      { sourceName: "Superior Court of Justice -- Steps in a civil case", officialUrl: SCJ_STEPS, verifiedAt: V, pinpoint: "Burden of proof" },
      { sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43", officialUrl: CJA, verifiedAt: V, pinpoint: "s. 23(1)-(1.2)" },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: LIMITATIONS,
        verifiedAt: V,
        pinpoint: "ss. 1, 4, 5(1), 5(2), 16(1)(h), (h.2), (1.1), (1.2)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
