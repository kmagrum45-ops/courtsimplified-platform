/**
 * Corpus sources for the CLAIM-TYPE profiles — "what kind of case do I have",
 * as opposed to the stage map's "where am I in the process".
 *
 * Every id below was resolved by FETCHING the document and reading its own title,
 * citation and consolidation header, never by deriving a filename and trusting it.
 * docs/SOURCING_NOTES.md says the id pattern is not consistent, and this batch
 * produced four fresh proofs of that:
 *
 *   - `00p04` and `06r17` — S.O. statutes using the CHAPTER-LETTER form
 *     (`<yy><letter><chapter>`), not the `<yy>c<chapter>` form that S.O. 1998,
 *     c. 19 uses. Both forms are live; neither is the rule.
 *   - `elaws_statutes_90n01` — the Negligence Act resolves ONLY under the
 *     prefixed form. `90n01_e.doc` is a 403. This was already recorded in
 *     SOURCING_NOTES and the plain id was ALSO listed there as an example of the
 *     normal pattern, which is a contradiction now corrected.
 *   - `19c07c` — the Crown Liability and Proceedings Act, 2019 is S.O. 2019,
 *     c. 7, **Schedule 17**, and lives at suffix `c`. The schedule suffix is a
 *     SEQUENCE POSITION among the schedules e-Laws publishes separately, not the
 *     schedule number. Deriving `19c07s17` finds nothing.
 *   - `05p28` — the Ontario Career Colleges Act, 2005 lives under `p`, from its
 *     former name, the *Private* Career Colleges Act, 2005. The id is frozen at
 *     the original short title while the document's own heading shows the new one.
 *
 * *** THE SCHEDULE TRAP IS THE DANGEROUS ONE HERE ***
 *
 * S.O. 2002, c. 30 publishes the Consumer Protection Act, 2002 as Schedule A and
 * the Motor Vehicle Dealers Act, 2002 as Schedule B. `02c30_e.doc` silently
 * returns Schedule A. A consumer profile that meant to cite the dealer statute and
 * derived the chapter id would quote the wrong Act while looking correct, so every
 * schedule statute below carries its SCHEDULE marker in mustContain and fails
 * closed if the fetch lands on a sibling.
 *
 * *** ONE SOURCE COULD NOT BE FETCHED ***
 *
 * The Towing and Storage Safety and Enforcement Act, 2021 resolves under no id
 * tried (`21t04`, `21c04`, `21c4`, the `elaws_statutes_` prefix, and schedule
 * suffixes a-t and s1-s20). See docs/SOURCING_NOTES.md. Towing profiles therefore
 * cite the Consumer Protection Act, 2002 and the Repair and Storage Liens Act,
 * which ARE here, and the towing-specific statute is recorded as a content gap
 * rather than written from anyone's memory.
 */

import type { CorpusSource } from "./corpusSources";

const ELAWS = (id: string) => `https://www.ontario.ca/laws/docs/${id}_e.doc`;

export const CLAIM_TYPE_SOURCES: CorpusSource[] = [
  // ---------------------------------------------------------------------------
  // Liability for damage and injury
  // ---------------------------------------------------------------------------
  {
    id: "negligence-act",
    title: "Negligence Act",
    citation: "R.S.O. 1990, c. N.1",
    url: ELAWS("elaws_statutes_90n01"),
    format: "elaws-doc",
    mustContain: ["NEGLIGENCE ACT", "CONSOLIDATION PERIOD"],
    minCharacters: 2500,
    why:
      "Apportionment between people who are both partly responsible, which comes " +
      "up in nearly every damage and injury profile: the neighbour who did not " +
      "maintain a tree AND the contractor who felled it badly. Only resolves " +
      "under the elaws_statutes_ prefix; 90n01_e.doc is a 403. It is a short Act, " +
      "hence the lowered minimum.",
  },
  {
    id: "parental-responsibility-act-2000",
    title: "Parental Responsibility Act, 2000",
    citation: "S.O. 2000, c. 4",
    url: ELAWS("00p04"),
    format: "elaws-doc",
    mustContain: ["PARENTAL RESPONSIBILITY ACT", "CONSOLIDATION PERIOD"],
    minCharacters: 5000,
    why:
      "The statute behind 'a kid smashed my window' on BOTH sides: it is what " +
      "makes a parent answerable for a child's deliberate damage, and it is also " +
      "what gives the parent the reasonable-supervision answer. A profile that " +
      "stated the first without the second would be telling half the law to the " +
      "person being sued.",
  },
  {
    id: "dog-owners-liability-act",
    title: "Dog Owners' Liability Act",
    citation: "R.S.O. 1990, c. D.16",
    url: ELAWS("90d16"),
    format: "elaws-doc",
    mustContain: ["DOG OWNERS", "LIABILITY ACT", "CONSOLIDATION PERIOD"],
    why:
      "Dog bites and dog-caused damage, both sides. The liability here does not " +
      "depend on the owner having been careless, which is the single fact a " +
      "self-represented person on either side most often has backwards.",
  },
  {
    id: "pounds-act",
    title: "Pounds Act",
    citation: "R.S.O. 1990, c. P.17",
    url: ELAWS("90p17"),
    format: "elaws-doc",
    mustContain: ["POUNDS ACT", "CONSOLIDATION PERIOD"],
    minCharacters: 8000,
    why: "Livestock and other animals at large — the rural counterpart to the dog and property profiles.",
  },

  // ---------------------------------------------------------------------------
  // Land, boundaries and neighbours
  // ---------------------------------------------------------------------------
  {
    id: "forestry-act",
    title: "Forestry Act",
    citation: "R.S.O. 1990, c. F.26",
    url: ELAWS("90f26"),
    format: "elaws-doc",
    mustContain: ["FORESTRY ACT", "CONSOLIDATION PERIOD"],
    minCharacters: 8000,
    why:
      "Boundary trees. The most common neighbour dispute we see described, and " +
      "the rule about a tree growing on the line is in a statute nobody expects " +
      "to be called the Forestry Act.",
  },
  {
    id: "line-fences-act",
    title: "Line Fences Act",
    citation: "R.S.O. 1990, c. L.17",
    url: ELAWS("90l17"),
    format: "elaws-doc",
    mustContain: ["LINE FENCES ACT", "CONSOLIDATION PERIOD"],
    why:
      "Fence disputes have their own route — fence-viewers — that is not the " +
      "Small Claims Court. A forum check that sent a fence dispute to court " +
      "without saying so would waste a filing fee.",
  },
  {
    id: "trespass-to-property-act",
    title: "Trespass to Property Act",
    citation: "R.S.O. 1990, c. T.21",
    url: ELAWS("90t21"),
    format: "elaws-doc",
    mustContain: ["TRESPASS TO PROPERTY ACT", "CONSOLIDATION PERIOD"],
    minCharacters: 6000,
    why:
      "People, pets and children coming onto land. Also a forum-check source: " +
      "this Act creates an OFFENCE, so part of what a user describes may be a " +
      "provincial charge rather than a civil claim.",
  },

  // ---------------------------------------------------------------------------
  // Consumer and commercial
  // ---------------------------------------------------------------------------
  {
    id: "consumer-protection-act-2002",
    title: "Consumer Protection Act, 2002",
    citation: "S.O. 2002, c. 30, Sched. A",
    url: ELAWS("02c30"),
    format: "elaws-doc",
    mustContain: ["CONSUMER PROTECTION ACT", "SCHEDULE A", "CONSOLIDATION PERIOD"],
    why:
      "The backbone of the consumer profiles: cooling-off periods, direct " +
      "agreements, internet agreements, repair estimates, deemed conditions. " +
      "Carries its SCHEDULE A marker because S.O. 2002, c. 30 also publishes the " +
      "Motor Vehicle Dealers Act as Schedule B, and the chapter id returns this one.",
  },
  {
    id: "oreg-17-05-consumer-protection-general",
    title: "General regulation under the Consumer Protection Act, 2002",
    citation: "O. Reg. 17/05",
    url: ELAWS("050017"),
    format: "elaws-doc",
    mustContain: ["ONTARIO REGULATION 17/05", "CONSOLIDATION PERIOD"],
    why:
      "Where the Consumer Protection Act's actual numbers live — the periods, " +
      "thresholds and the classes of agreement the Act only frames. Citing the " +
      "Act without the regulation is how a cooling-off period gets stated wrongly.",
  },
  {
    id: "motor-vehicle-dealers-act-2002",
    title: "Motor Vehicle Dealers Act, 2002",
    citation: "S.O. 2002, c. 30, Sched. B",
    url: ELAWS("02m30"),
    format: "elaws-doc",
    mustContain: ["MOTOR VEHICLE DEALERS ACT", "SCHEDULE B", "CONSOLIDATION PERIOD"],
    why:
      "Used-car purchases from a dealer, and the OMVIC route that exists instead " +
      "of or alongside a claim. Resolved at 02m30, NOT at the chapter id — see " +
      "the schedule trap in this file's header.",
  },
  {
    id: "sale-of-goods-act",
    title: "Sale of Goods Act",
    citation: "R.S.O. 1990, c. S.1",
    url: ELAWS("90s01"),
    format: "elaws-doc",
    mustContain: ["SALE OF GOODS ACT", "CONSOLIDATION PERIOD"],
    why:
      "Defective goods and private sales, where the Consumer Protection Act does " +
      "not reach — a Facebook Marketplace sale between two individuals is not a " +
      "consumer agreement, and this is the statute that still applies.",
  },
  {
    id: "consumer-reporting-act",
    title: "Consumer Reporting Act",
    citation: "R.S.O. 1990, c. C.33",
    url: ELAWS("90c33"),
    format: "elaws-doc",
    mustContain: ["CONSUMER REPORTING ACT", "CONSOLIDATION PERIOD"],
    why: "Credit-report errors. Chiefly a forum check: there is a statutory correction route that is not a lawsuit.",
  },
  {
    id: "collection-and-debt-settlement-services-act",
    title: "Collection and Debt Settlement Services Act",
    citation: "R.S.O. 1990, c. C.14",
    url: ELAWS("90c14"),
    format: "elaws-doc",
    mustContain: ["COLLECTION AND DEBT SETTLEMENT SERVICES ACT", "CONSOLIDATION PERIOD"],
    why:
      "The rules a collection agency must follow, for the very common 'a " +
      "collection agency is suing me' position. Regulates conduct; it is not " +
      "itself a defence to the debt, and a profile must not imply that it is.",
  },
  {
    id: "repair-and-storage-liens-act",
    title: "Repair and Storage Liens Act",
    citation: "R.S.O. 1990, c. R.25",
    url: ELAWS("90r25"),
    format: "elaws-doc",
    mustContain: ["REPAIR AND STORAGE LIENS ACT", "CONSOLIDATION PERIOD"],
    why:
      "'The garage/tow yard/storage company is holding my car until I pay.' A " +
      "lien claim has its own procedure and its own time limits, and the answer " +
      "is not simply to sue for the goods back.",
  },
  {
    id: "ontario-career-colleges-act-2005",
    title: "Ontario Career Colleges Act, 2005",
    citation: "S.O. 2005, c. 28, Sched. L",
    url: ELAWS("05p28"),
    format: "elaws-doc",
    mustContain: ["CAREER COLLEGES ACT", "SCHEDULE L", "CONSOLIDATION PERIOD"],
    why:
      "Private-career-college refunds, which have a statutory route and a " +
      "training-completion fund rather than a plain contract claim. The id is " +
      "frozen at the Act's former name — see this file's header.",
  },

  // ---------------------------------------------------------------------------
  // Construction and property services
  // ---------------------------------------------------------------------------
  {
    id: "construction-act",
    title: "Construction Act",
    citation: "R.S.O. 1990, c. C.30",
    url: ELAWS("90c30"),
    format: "elaws-doc",
    mustContain: ["CONSTRUCTION ACT", "CONSOLIDATION PERIOD"],
    why:
      "Contractor-versus-homeowner, both directions. A contractor's lien rights " +
      "expire on their own timetable, so a contractor told only about Small " +
      "Claims could lose the lien while the claim is pending — and a homeowner " +
      "with a lien registered against the house needs to know what that is.",
  },

  // ---------------------------------------------------------------------------
  // Housing and occupancy — forum checks
  // ---------------------------------------------------------------------------
  {
    id: "residential-tenancies-act-2006",
    title: "Residential Tenancies Act, 2006",
    citation: "S.O. 2006, c. 17",
    url: ELAWS("06r17"),
    format: "elaws-doc",
    mustContain: ["RESIDENTIAL TENANCIES ACT", "CONSOLIDATION PERIOD"],
    why:
      "The single most important forum check we have. Most of what users " +
      "describe about renting belongs to the Landlord and Tenant Board and not " +
      "to this court, but the exemptions and the former-tenant provisions mean " +
      "some of it genuinely belongs here. Both halves have to come from the Act.",
  },
  {
    id: "commercial-tenancies-act",
    title: "Commercial Tenancies Act",
    citation: "R.S.O. 1990, c. L.7",
    url: ELAWS("90l07"),
    format: "elaws-doc",
    mustContain: ["COMMERCIAL TENANCIES ACT", "CONSOLIDATION PERIOD"],
    why:
      "Commercial tenancies are NOT at the Landlord and Tenant Board, which " +
      "surprises small-business users on both sides. Chapter L.7 despite the " +
      "name — another reason ids are resolved and not derived.",
  },
  {
    id: "condominium-act-1998",
    title: "Condominium Act, 1998",
    citation: "S.O. 1998, c. 19",
    url: ELAWS("98c19"),
    format: "elaws-doc",
    mustContain: ["CONDOMINIUM ACT", "CONSOLIDATION PERIOD"],
    why:
      "Forum check for condo disputes: the Condominium Authority Tribunal has " +
      "defined subject matter, and what falls outside it goes elsewhere. Needed " +
      "to avoid sending a records dispute to court or a damage claim to the CAT.",
  },

  // ---------------------------------------------------------------------------
  // Money, estates, and claims against government
  // ---------------------------------------------------------------------------
  {
    id: "insurance-act",
    title: "Insurance Act",
    citation: "R.S.O. 1990, c. I.8",
    url: ELAWS("90i08"),
    format: "elaws-doc",
    mustContain: ["INSURANCE ACT", "CONSOLIDATION PERIOD"],
    why:
      "Whether a motor-vehicle claim can be brought at all, and against whom. " +
      "The existing docs/sources/insurance-act-s263.txt holds one section; a " +
      "claim-type profile needs the surrounding provisions to state a forum " +
      "check rather than one rule out of context.",
  },
  {
    // 2026-10-05: named as missing by the research step's first real case (a
    // pedestrian hit by a city bus). Vehicle-injury claims turn on its rules
    // of the road and the onus provisions; the library had none of it.
    id: "highway-traffic-act",
    title: "Highway Traffic Act",
    citation: "R.S.O. 1990, c. H.8",
    url: ELAWS("90h08"),
    format: "elaws-doc",
    mustContain: ["HIGHWAY TRAFFIC ACT", "CONSOLIDATION PERIOD"],
    why:
      "Injury and damage claims from vehicles: the duties of drivers toward " +
      "pedestrians and cyclists, and the onus provisions a court applies. " +
      "Named as a gap by the research step on a bus-injury story.",
  },
  {
    id: "trustee-act",
    title: "Trustee Act",
    citation: "R.S.O. 1990, c. T.23",
    url: ELAWS("90t23"),
    format: "elaws-doc",
    mustContain: ["TRUSTEE ACT", "CONSOLIDATION PERIOD"],
    why:
      "Claims by or against a deceased person's estate carry their own hard " +
      "limitation, shorter than the general one. Information only, but omitting " +
      "it from an estate profile would be the most costly silence in the library.",
  },
  {
    id: "crown-liability-and-proceedings-act-2019",
    title: "Crown Liability and Proceedings Act, 2019",
    citation: "S.O. 2019, c. 7, Sched. 17",
    url: ELAWS("19c07c"),
    format: "elaws-doc",
    mustContain: ["CROWN LIABILITY AND PROCEEDINGS ACT", "SCHEDULE 17", "CONSOLIDATION PERIOD"],
    why:
      "Claims against the Province require notice before they start. A " +
      "claim-barring requirement, so it ranks with the municipal notices in " +
      "priority. Lives at suffix `c` although it is Schedule 17.",
  },
  {
    id: "libel-and-slander-act",
    title: "Libel and Slander Act",
    citation: "R.S.O. 1990, c. L.12",
    url: ELAWS("90l12"),
    format: "elaws-doc",
    mustContain: ["LIBEL AND SLANDER ACT", "CONSOLIDATION PERIOD"],
    why:
      "Defamation carries a notice requirement and a limitation far shorter than " +
      "the general one for some publications. Another claim-barring source, and " +
      "one users reliably do not expect.",
  },
  {
    id: "marriage-act",
    title: "Marriage Act",
    citation: "R.S.O. 1990, c. M.3",
    url: ELAWS("90m03"),
    format: "elaws-doc",
    mustContain: ["MARRIAGE ACT", "CONSOLIDATION PERIOD"],
    why:
      "Engagement rings and gifts made in contemplation of a marriage that did " +
      "not happen. A property question with a statutory answer, kept strictly " +
      "clear of family law.",
  },

  // ---------------------------------------------------------------------------
  // Forum checks out of this court entirely
  // ---------------------------------------------------------------------------
  {
    id: "human-rights-code",
    title: "Human Rights Code",
    citation: "R.S.O. 1990, c. H.19",
    url: ELAWS("90h19"),
    format: "elaws-doc",
    mustContain: ["HUMAN RIGHTS CODE", "CONSOLIDATION PERIOD"],
    why:
      "Forum check only. Discrimination claims go to the Human Rights Tribunal " +
      "of Ontario, and the Code itself is what says so — needed so the refusal " +
      "names a route instead of just declining.",
  },
  {
    id: "provincial-offences-act",
    title: "Provincial Offences Act",
    citation: "R.S.O. 1990, c. P.33",
    url: ELAWS("90p33"),
    format: "elaws-doc",
    mustContain: ["PROVINCIAL OFFENCES ACT", "CONSOLIDATION PERIOD"],
    why:
      "Forum check only. Parking tickets, traffic and by-law charges are " +
      "prosecutions, not claims, and users describe them in the same breath as " +
      "money disputes.",
  },
];
