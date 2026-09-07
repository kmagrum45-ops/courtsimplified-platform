/**
 * Small Claims claim-type registry -- Phase 0 content foundation, the
 * unifying structure over the eventual Small Claims taxonomy (see
 * docs/AI_INTAKE_DESIGN.md). No AI reads or surfaces these yet; this is
 * sourced content only. Reuses `EducationCitation` from educationTopics.ts
 * rather than redefining it, and references `remedyTypes.ts` entries by id
 * rather than duplicating remedy content here.
 *
 * DRAFT wording -- every `plainExplanation` below is pending lawyer/
 * paralegal review before it ships, same convention as the rest of this
 * directory.
 *
 * `plaintiffElements` and `defendantConsiderations` describe what a person
 * bringing (or defending against) this kind of claim generally must show,
 * and what courts typically expect documented -- never "your facts meet
 * this." See docs/AI_INTAKE_DESIGN.md, "who does the applying" test.
 *
 * Only 3 claim types are built this session, deliberately, to prove the
 * schema against real, verified sourcing before scaling to the rest of the
 * ~20-entry taxonomy in a later session:
 *   - Unpaid debt / non-payment for services (highest real-world volume)
 *   - Slip and fall / occupier's liability (business-defendant profile,
 *     Occupiers' Liability Act sourcing)
 *   - Improper or unauthorized towing (Towing and Storage Safety and
 *     Enforcement Act, 2021 -- a regulatory complaint path that runs
 *     alongside, not instead of, a Small Claims case)
 *
 * Sourcing note on the Occupiers' Liability Act and the Negligence Act:
 * ontario.ca's e-Laws statute viewer (ontario.ca/laws/statute/...) is a
 * JS-rendered page that returns an empty shell to a direct fetch -- this
 * was hit repeatedly this session and in earlier ones. The same statutes
 * are also published as static, non-JS documents at
 * ontario.ca/laws/docs/<id>.doc (still the ontario.ca domain, just a
 * different rendering path), which fetch cleanly and were used for every
 * OLA/Negligence Act citation below. This isn't a workaround -- it's the
 * same statutory text, the same domain, a fetchable format instead of one
 * this tooling can't render.
 */

import type { EducationCitation } from "./educationTopics";

export type EvidenceCategory = {
  name: string;
  why: string;
  examples: string[];
};

export type PlaintiffElement = {
  id: string;
  name: string;
  plainExplanation: string;
  sourceUrl: string;
  evidenceCategories: EvidenceCategory[];
};

export type DefendantConsideration = {
  id: string;
  name: string;
  plainExplanation: string;
  whenThisComesUp: string;
  sourceUrl: string;
};

export type ProceduralNote = {
  note: string;
  sourceUrl: string;
};

/**
 * A defence concept that applies across multiple claim types -- defined
 * once here, referenced by ClaimType.applicableDefenceConceptIds, never
 * duplicated per claim type. Same non-duplication principle as
 * remedyTypes.ts.
 *
 * 6 concepts were in scope; 5 are here. "Mitigation" (a plaintiff's duty
 * to take reasonable steps to limit their own losses) is deliberately
 * excluded -- checked this session and in the one that built
 * questionBank.ts's contractor-notice question: no page on ontario.ca,
 * ontariocourts.ca, or ontariocourtforms.on.ca states a mitigation-duty
 * rule in any form. It's a real, well-established common-law concept, but
 * every source for it found this session was either an appellate decision
 * (case-law synthesis, which CLAUDE.md's sourcing rule treats like a
 * CanLII-only fact) or absent entirely. Add it back if a future session
 * finds an actual page on one of the three approved domains stating it.
 */
export type DefenceConcept = {
  id: string;
  name: string;
  plainExplanation: string;
  sourceUrl: string;
  reviewedAt: string | null;
  status: "draft" | "reviewed";
};

export const DEFENCE_CONCEPTS: DefenceConcept[] = [
  {
    id: "defence-limitation-period-expired",
    name: "Limitation period expired",
    plainExplanation:
      "In most cases, a claim generally cannot be started more than 2 years after it was " +
      "discovered (or reasonably should have been discovered). If that window has passed, this is " +
      "often raised as a reason the claim can't proceed at all, separate from whether the " +
      "underlying facts are true.",
    sourceUrl: "https://www.ontario.ca/page/civil-claims-suing-and-being-sued",
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "defence-no-agreement-existed",
    name: "No agreement existed",
    plainExplanation:
      "The person bringing a claim generally has the burden of proving their allegations on a " +
      "balance of probabilities -- including that an agreement or understanding actually existed " +
      "in the first place. If that's disputed, it becomes one of the facts the plaintiff has to " +
      "establish with evidence, not something assumed true by default.",
    sourceUrl:
      "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "defence-set-off-or-counterclaim",
    name: "Set-off or counterclaim",
    plainExplanation:
      "A defendant can file their own claim against the plaintiff (or someone else) as part of the " +
      "same case, called a Defendant's Claim (Form 10A) -- for example, if the defendant believes " +
      "the plaintiff owes them money too, or that someone else should be responsible. It must " +
      "generally be filed within 20 days of filing a Defence, unless the court allows it later.",
    sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/replying-claim",
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "defence-waiver-release-assumption-of-risk",
    name: "Waiver, release, or assumption of risk",
    plainExplanation:
      "Under the Occupiers' Liability Act, an occupier's general duty to keep premises reasonably " +
      "safe does not apply to risks a person willingly assumed by entering -- though even then, the " +
      "occupier still can't deliberately create a danger or act with reckless disregard for that " +
      "person's safety. A signed waiver or release is often raised in connection with this.",
    sourceUrl: "https://www.ontario.ca/laws/docs/90o02_eV006.doc",
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "defence-contributory-negligence",
    name: "Contributory negligence",
    plainExplanation:
      "Ontario's Negligence Act says that when a court finds the plaintiff's own fault or " +
      "negligence contributed to their damages, the court apportions (divides) the damages between " +
      "the parties in proportion to their respective degree of fault, rather than an all-or-nothing " +
      "result.",
    sourceUrl: "https://www.ontario.ca/laws/docs/elaws_statutes_90n01_e.doc",
    reviewedAt: null,
    status: "draft",
  },
];

export type ClaimType = {
  id: string;
  name: string;
  courtArea: "small-claims";
  plaintiffElements: PlaintiffElement[];
  defendantConsiderations: DefendantConsideration[];
  /** DefenceConcept ids from DEFENCE_CONCEPTS above -- referenced, not duplicated. */
  applicableDefenceConceptIds: string[];
  /** RemedyTopic ids from remedyTypes.ts -- referenced, not duplicated. */
  remedies: string[];
  proceduralNotes: ProceduralNote[];
  /** Fact-pattern cues for later extraction matching. No AI here -- just data. */
  signals: string[];
  typicalDefendantProfile: "individual" | "business" | "either";
  /** Non-empty tuple, compile-time enforced -- same pattern as educationTopics.ts. */
  citations: [EducationCitation, ...EducationCitation[]];
  reviewedAt: string | null;
  status: "draft" | "reviewed";
};

export const CLAIM_TYPES: ClaimType[] = [
  {
    id: "sc-claim-unpaid-debt-services",
    name: "Unpaid debt or non-payment for services",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "existed-agreement-or-understanding",
        name: "An agreement or understanding for payment existed",
        plainExplanation:
          "The person bringing the claim generally has to show, on a balance of probabilities, " +
          "that there was an agreement or understanding involving payment -- whether written, " +
          "verbal, or based on the parties' conduct.",
        sourceUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        evidenceCategories: [
          {
            name: "Written agreement or contract",
            why: "Directly shows what was agreed to.",
            examples: ["Signed contract", "Email or text agreeing to terms", "Invoice with accepted terms"],
          },
          {
            name: "Communication showing the understanding",
            why: "Supports an unwritten or informal agreement.",
            examples: ["Text messages", "Emails", "Messaging app conversations"],
          },
        ],
      },
      {
        id: "services-or-money-provided",
        name: "Services were provided, or money was loaned or is owed",
        plainExplanation:
          "Small Claims Court's jurisdiction covers claims for payment of money -- this element is " +
          "about showing the underlying service was actually performed, or the money was actually " +
          "advanced or is owed.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        evidenceCategories: [
          {
            name: "Proof the work or service happened",
            why: "Shows the basis for the amount claimed.",
            examples: ["Photos of completed work", "Delivery confirmation", "Sign-off or acceptance message"],
          },
          {
            name: "Proof money changed hands (for a loan)",
            why: "Shows the amount was actually advanced.",
            examples: ["Bank transfer records", "E-transfer confirmation", "Receipt"],
          },
        ],
      },
      {
        id: "amount-unpaid",
        name: "The amount claimed is accurate and remains unpaid",
        plainExplanation:
          "The claimed amount, and the fact that it hasn't been paid, are part of what the court " +
          "will expect to see documented -- interest and costs are handled separately from, and in " +
          "addition to, the amount claimed itself.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        evidenceCategories: [
          {
            name: "Invoice or statement of account",
            why: "Shows exactly how the amount was calculated.",
            examples: ["Itemized invoice", "Statement of account", "Payment history/ledger"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-quality-or-completion",
        name: "The defendant disputes the work was completed or done properly",
        plainExplanation:
          "A defendant can file a Defence disputing that the work was finished, or that it met what " +
          "was agreed -- this becomes a fact the court has to weigh alongside the plaintiff's " +
          "evidence, not an automatic bar to the claim.",
        whenThisComesUp: "When the defendant has filed a Defence (Form 9A) raising quality or completion issues.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: "This kind of claim is started with a Plaintiff's Claim (Form 7A).",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
      },
    ],
    signals: [
      "didn't pay for services",
      "unpaid invoice",
      "hired someone and they didn't finish",
      "owes me money",
      "non-payment",
      "invoice not paid",
      "loan not repaid",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a Claim",
        officialUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-08-31",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-claim-slip-and-fall-occupier-liability",
    name: "Slip and fall / occupier's liability",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "defendant-was-occupier",
        name: "The defendant was the occupier of the premises",
        plainExplanation:
          "The Occupiers' Liability Act's duty of care applies to whoever occupies (is in " +
          "possession or control of) the premises where the incident happened -- often, but not " +
          "always, a business.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90o02_eV006.doc",
        evidenceCategories: [
          {
            name: "Proof of who controls the property",
            why: "Establishes who the correct defendant is.",
            examples: ["Business name/signage at the location", "Lease or ownership record", "Website or receipt showing the business name"],
          },
        ],
      },
      {
        id: "premises-not-reasonably-safe",
        name: "The premises were not kept reasonably safe",
        plainExplanation:
          "An occupier owes a duty to take reasonable care to see that people entering the premises " +
          "are reasonably safe. This applies whether the danger came from the condition of the " +
          "property itself or from an activity carried on there.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90o02_eV006.doc",
        evidenceCategories: [
          {
            name: "Photos or video of the condition",
            why: "Directly documents the hazard.",
            examples: ["Photo of the ice, spill, or defect", "Security or phone video", "Photos taken shortly after the incident"],
          },
          {
            name: "Records of the condition being known or reported",
            why: "Speaks to whether the hazard was something the occupier could have addressed.",
            examples: ["Incident report filed with the business", "Prior complaints", "Maintenance/inspection logs, if obtainable"],
          },
        ],
      },
      {
        id: "injury-and-connection",
        name: "The unsafe condition caused an injury or loss",
        plainExplanation:
          "There generally needs to be a connection shown between the unsafe condition and the harm " +
          "that resulted -- not just that a condition existed and separately that an injury occurred.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90o02_eV006.doc",
        evidenceCategories: [
          {
            name: "Medical records",
            why: "Documents the injury and when it was first treated.",
            examples: ["Emergency room or clinic records", "Physiotherapy or specialist records", "Photos of visible injuries"],
          },
          {
            name: "Witness accounts",
            why: "Supports that the fall happened at that location, in that way.",
            examples: ["Names/contact info of anyone who saw it happen", "Written witness statements"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "duty-restricted-by-contract",
        name: "The occupier's duty was restricted or excluded by contract",
        plainExplanation:
          "An occupier's duty of care applies except to the extent the occupier is free to, and " +
          "does, restrict, modify, or exclude that duty -- for example, through a signed waiver in " +
          "some contexts.",
        whenThisComesUp: "When the plaintiff signed a waiver, release, or contract with the occupier before the incident.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90o02_eV006.doc",
      },
    ],
    applicableDefenceConceptIds: [
      "defence-waiver-release-assumption-of-risk",
      "defence-contributory-negligence",
      "defence-limitation-period-expired",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: "Claims like this are generally subject to Ontario's standard 2-year limitation period, running from when the incident (or the injury) was discovered.",
        sourceUrl: "https://www.ontario.ca/page/civil-claims-suing-and-being-sued",
      },
    ],
    signals: [
      "slipped and fell",
      "fell on ice",
      "wet floor",
      "tripped",
      "injured on someone's property",
      "fell in a parking lot",
      "fell in a store",
    ],
    // "business" reflects the most common real-world defendant for this claim
    // type (a store, restaurant, or commercial landlord as occupier) -- a
    // private homeowner can also be an occupier under the Act, this field
    // names the typical case, not an exclusive one.
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Occupiers' Liability Act, R.S.O. 1990, c. O.2",
        officialUrl: "https://www.ontario.ca/laws/docs/90o02_eV006.doc",
        verifiedAt: "2026-09-07",
        pinpoint: "s.3(1)-(3): occupier's duty to take reasonable care that premises are reasonably safe",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-claim-improper-unauthorized-towing",
    name: "Improper or unauthorized towing",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "towed-without-consent",
        name: "The vehicle was towed without required consent",
        plainExplanation:
          "Under Ontario's towing rules, a tow truck driver or towing company generally needs the " +
          "vehicle owner's consent to tow a vehicle, unless the tow was initiated by police or " +
          "another authorized official.",
        sourceUrl: "https://www.ontario.ca/page/know-your-rights-when-getting-tow",
        evidenceCategories: [
          {
            name: "Records showing no consent was given",
            why: "Directly supports that the tow was unauthorized.",
            examples: ["Timeline of events", "Witness account of the tow happening", "Any communication with the towing company"],
          },
        ],
      },
      {
        id: "no-rate-disclosure",
        name: "Required rate or cost disclosure was not given",
        plainExplanation:
          "Tow truck drivers, towing companies, and vehicle storage providers must give their rates " +
          "before providing services, and must be certified to operate in Ontario.",
        sourceUrl: "https://www.ontario.ca/page/know-your-rights-when-getting-tow",
        evidenceCategories: [
          {
            name: "Invoice or receipt",
            why: "Shows what, if anything, was disclosed and charged.",
            examples: ["Final invoice", "Any rate sheet provided", "Photos of posted (or missing) rate/certificate signage"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "tow-authorized-by-police",
        name: "The tow was initiated by police or another authorized official",
        plainExplanation:
          "Vehicle-owner consent is not required when a tow is initiated by police or another " +
          "authorized official -- this is a recognized exception to the general consent " +
          "requirement.",
        whenThisComesUp: "When the towing company says the tow was requested by police or a similar authority, not by choice.",
        sourceUrl: "https://www.ontario.ca/page/know-your-rights-when-getting-tow",
      },
    ],
    applicableDefenceConceptIds: ["defence-set-off-or-counterclaim", "defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-return-of-property", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Separately from a Small Claims case, a complaint about a tow truck driver, towing " +
          "company, or vehicle storage service's conduct can be filed with the Ministry of " +
          "Transportation online -- this is a regulatory complaint path, not a substitute for " +
          "recovering money through the court.",
        sourceUrl: "https://www.ontario.ca/page/know-your-rights-when-getting-tow",
      },
      {
        note:
          "The Ministry's oversight under this Act only covers events on or after January 1, 2024.",
        sourceUrl: "https://www.ontario.ca/page/know-your-rights-when-getting-tow",
      },
    ],
    signals: [
      "car towed",
      "vehicle towed without permission",
      "towing company",
      "tow truck",
      "didn't consent to tow",
      "storage fees",
      "impound lot",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Ontario.ca — Know Your Rights When Getting a Tow",
        officialUrl: "https://www.ontario.ca/page/know-your-rights-when-getting-tow",
        verifiedAt: "2026-09-07",
        pinpoint: "Towing and Storage Safety and Enforcement Act, 2021; consent, rate disclosure, certification requirements",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
