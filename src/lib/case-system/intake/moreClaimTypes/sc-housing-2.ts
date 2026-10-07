/**
 * Case types, batch "sc-housing-2" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-housing-2.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-short-term-rental-dispute -- A short-term rental dispute
 *   sc-claim-rooming-or-boarding-house -- A rooming or boarding house
 *   sc-claim-student-residence -- A student residence
 *   sc-claim-mobile-home-park -- A mobile home park
 *   sc-claim-home-purchase-closing-dispute -- A home purchase deposit or closing dispute
 *   sc-claim-contractor-lien-on-a-home -- A contractor's lien registered against a home
 *
 * Several of these are NOT decided by the Small Claims Court. Each type's
 * procedural notes say where the matter belongs, from the saved text: the
 * Landlord and Tenant Board under s. 168 (2) of the Residential Tenancies Act,
 * 2006 (unless s. 5 exempts the accommodation); the Superior Court of Justice
 * for a lien claim under s. 50 (1) of the Construction Act and for equitable
 * relief under s. 96 (3) of the Courts of Justice Act. The general regulation
 * under the Residential Tenancies Act (O. Reg. 516/06), the Real Estate and
 * Business Brokers Act and the Ontario New Home Warranties Plan Act are not
 * saved in docs/sources/corpus, so nothing here rests on them.
 */

import type { ClaimType } from "../claimTypes";

const RTA = "https://www.ontario.ca/laws/docs/06r17_e.doc";
const RTA_FROM = "2026-09-21";
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const CJA_FROM = "2025-12-11";
const SC_LIMIT = "https://www.ontario.ca/laws/docs/000626_e.doc";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_FROM = "2024-12-04";
const CONSTRUCTION = "https://www.ontario.ca/laws/docs/90c30_e.doc";
const CONSTRUCTION_FROM = "2026-01-01";
const STEPS =
  "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/";
const JESAN = "docs/sources/decisions/jesan-real-estate-v-doyle-2020-ONCA-714.txt";
const SOUTHCOTT = "docs/sources/decisions/southcott-estates-v-toronto-catholic-district-school-board-2012-SCC-51.english.txt";
const V = "2026-10-07";

export const TYPES_SC_HOUSING_2: ClaimType[] = [
  // ---------------------------------------------------------------------
  {
    id: "sc-claim-short-term-rental-dispute",
    name: "A short-term rental dispute",
    courtArea: "small-claims",
    broughtBy: "A guest or a host in a short stay -- a vacation home, cottage, cabin, or bed and breakfast -- who says the other owes money: a deposit or refund not paid back, or damage left behind.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "stay-was-vacation-or-temporary-accommodation",
        name: "The stay was vacation or temporary accommodation",
        plainExplanation:
          "Under s. 5 (a) of the Residential Tenancies Act, 2006, the Act does not apply to living " +
          "accommodation intended to be provided to the travelling or vacationing public, or occupied for a " +
          "seasonal or temporary period, in a hotel, motel, resort, lodge, cottage or cabin establishment, inn, " +
          "campground, trailer park, tourist home, bed and breakfast vacation establishment or vacation home. " +
          "What has to be shown is what kind of place it was and what the stay was for, because that decides " +
          "whether the Act and the Landlord and Tenant Board are involved.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        evidenceCategories: [
          {
            name: "The booking",
            why: "Shows the dates, the price, and that the stay was short or seasonal.",
            examples: ["Booking confirmation", "Listing for the property", "Receipt from the booking platform"],
          },
          {
            name: "How the place was offered",
            why: "Shows whether it was offered to travellers or vacationers.",
            examples: ["Screenshots of the listing", "House rules for guests", "Messages with the host or guest"],
          },
        ],
      },
      {
        id: "short-stay-money-owed",
        name: "Money is owed, within the Small Claims limit",
        plainExplanation:
          "Under s. 23 (1) of the Courts of Justice Act, the Small Claims Court has jurisdiction in any action " +
          "for the payment of money where the amount claimed does not exceed the prescribed amount exclusive " +
          "of interest and costs, and in any action for the recovery of possession of personal property up to " +
          "that value. That amount is $50,000 (O. Reg. 626/00, s. 1 (1)). What has to be shown is what was " +
          "paid or damaged, and the amount owed.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: CJA_FROM,
        alsoCites: [{ sourceUrl: SC_LIMIT, pinpoint: "O. Reg. 626/00, s. 1 (1)" }],
        evidenceCategories: [
          {
            name: "What was paid",
            why: "Supports a claim for a deposit or refund.",
            examples: ["Credit card or bank statement", "Damage deposit receipt", "Cancellation or refund terms"],
          },
          {
            name: "Condition before and after the stay",
            why: "Supports a claim for damage, or answers one.",
            examples: ["Check-in and check-out photos", "Cleaning or repair invoices", "Messages reporting a problem"],
          },
        ],
      },
      {
        id: "burden-of-proof-short-stay",
        name: "Proving it on a balance of probabilities",
        plainExplanation:
          "The Superior Court of Justice's guide to the steps in a civil case says that in every civil case " +
          "the plaintiff has the burden of proof to establish, on a balance of probabilities, the allegations " +
          "in their claim. For a short stay, the booking terms and the messages between host and guest are " +
          "usually what show what was agreed.",
        sourceUrl: STEPS,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "The terms of the stay",
            why: "Shows what each side agreed to about deposits, cancellations and damage.",
            examples: ["Rental agreement", "Platform terms shown at booking", "House rules"],
          },
          {
            name: "Messages between host and guest",
            why: "Shows what was said about the problem and when.",
            examples: ["Platform messages", "Texts", "Emails"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "short-stay-set-off",
        name: "Money the other side says they are owed in return",
        plainExplanation:
          "Under s. 111 (1) of the Courts of Justice Act, in an action for payment of a debt, the defendant " +
          "may, by way of defence, claim the right to set off against the plaintiff's claim a debt owed by the " +
          "plaintiff to the defendant.",
        whenThisComesUp: "When a host kept a deposit for cleaning or damage, or a guest says part of the stay was not provided.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: CJA_FROM,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Where this belongs: if the stay was not exempt under s. 5 of the Residential Tenancies Act, 2006 -- " +
          "for example, a place rented as someone's home rather than a vacation stay -- then under s. 168 (2) " +
          "the Landlord and Tenant Board \"has exclusive jurisdiction to determine all applications under this " +
          "Act and with respect to all matters in which jurisdiction is conferred on it by this Act.\" Where " +
          "s. 5 (a) applies, a money claim up to $50,000 is within the Small Claims Court's jurisdiction " +
          "(Courts of Justice Act, s. 23 (1); O. Reg. 626/00, s. 1 (1)).",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        alsoCites: [
          { sourceUrl: CJA, pinpoint: "Courts of Justice Act, s. 23 (1)" },
          { sourceUrl: SC_LIMIT, pinpoint: "O. Reg. 626/00, s. 1 (1)" },
        ],
      },
      {
        note:
          "Time limit: under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
          "shall not be commenced in respect of a claim after the second anniversary of the day on which the " +
          "claim was discovered.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_FROM,
      },
    ],
    signals: [
      "vacation rental host kept my deposit",
      "cottage rental refund",
      "short-term rental damage deposit",
      "guest damaged my vacation rental",
      "cabin booking cancelled and no refund",
      "host will not return my security deposit",
      "bed and breakfast owes me a refund",
      "guest trashed the cottage",
    ],
    citations: [
      { sourceName: "Residential Tenancies Act, 2006", officialUrl: RTA, verifiedAt: V, pinpoint: "s. 5 (a), s. 168 (2)" },
      { sourceName: "Courts of Justice Act", officialUrl: CJA, verifiedAt: V, pinpoint: "ss. 23 (1), 111 (1)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------
  {
    id: "sc-claim-rooming-or-boarding-house",
    name: "A rooming or boarding house",
    courtArea: "small-claims",
    broughtBy: "A person who rents a room in a rooming, boarding or lodging house, or the person who rents out the rooms, with a money dispute about the room.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "room-is-a-rental-unit",
        name: "Whether the room is a rental unit under the Act",
        plainExplanation:
          "In s. 2 (1) of the Residential Tenancies Act, 2006, \"rental unit\" includes a room in a boarding " +
          "house, rooming house or lodging house. Under s. 5 (i), the Act does not apply where the occupant is " +
          "required to share a bathroom or kitchen with the owner, or the owner's spouse, child or parent (or " +
          "the spouse's child or parent), and that person lives in the building. What has to be shown is who " +
          "owns the house, who lives there, and who shares the kitchen and bathroom.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        evidenceCategories: [
          {
            name: "Who owns and lives in the house",
            why: "Shows whether the owner or the owner's family lives in the building.",
            examples: ["Property ownership record", "Messages about who lives there", "Mail addressed to the owner at the house"],
          },
          {
            name: "What is shared",
            why: "Shows whether a kitchen or bathroom is shared, and with whom.",
            examples: ["Photos or a floor plan", "House rules", "The room rental agreement"],
          },
        ],
      },
      {
        id: "rooming-house-landlord-obligations",
        name: "The landlord did something listed in s. 29 (1)",
        plainExplanation:
          "Under s. 20 (1) of the Residential Tenancies Act, 2006, a landlord is responsible for providing and " +
          "maintaining a residential complex, including the rental units in it, in a good state of repair and " +
          "fit for habitation. Under s. 29 (1), a tenant or former tenant may apply to the Board for orders " +
          "including that the landlord breached that obligation, withheld or deliberately interfered with the " +
          "reasonable supply of a vital service, care service or food, substantially interfered with " +
          "reasonable enjoyment, harassed the tenant, changed the locks without giving replacement keys, or " +
          "illegally entered the unit.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        evidenceCategories: [
          {
            name: "Records of the problem",
            why: "Shows what happened and when.",
            examples: ["Dated photos or videos", "Written repair requests", "Texts or emails with the landlord"],
          },
          {
            name: "Costs and losses",
            why: "Supports any amount asked for.",
            examples: ["Receipts", "Hotel or moving receipts", "Food bought when meals were not provided"],
          },
        ],
      },
      {
        id: "rooming-house-money-collected",
        name: "Money was collected or kept against the Act",
        plainExplanation:
          "Under s. 135 (1) of the Residential Tenancies Act, 2006, a tenant or former tenant may apply to the " +
          "Board for an order that the landlord pay back any money collected or retained in contravention of " +
          "the Act. Section 105 (1) says the only security deposit a landlord may collect is a rent deposit " +
          "under s. 106, and s. 106 (2) caps a rent deposit at the lesser of one rent period and one month's " +
          "rent.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        evidenceCategories: [
          {
            name: "What was paid",
            why: "Shows the amount and what it was called.",
            examples: ["Deposit receipt", "E-transfer records", "The rental agreement"],
          },
          {
            name: "What happened to it",
            why: "Shows whether it was applied, returned or kept.",
            examples: ["Messages asking for it back", "Final rent statement"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "rooming-house-duty-to-minimize-losses",
        name: "The duty to take reasonable steps to minimize losses",
        plainExplanation:
          "Section 16 of the Residential Tenancies Act, 2006 says that when a landlord or a tenant becomes " +
          "liable to pay any amount as a result of a breach of a tenancy agreement, the person entitled to " +
          "claim the amount has a duty to take reasonable steps to minimize their losses.",
        whenThisComesUp: "When either side says the other could have kept the loss lower, for example by re-renting the room sooner.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
      },
      {
        id: "rooming-house-set-off",
        name: "Money the other side says they are owed in return",
        plainExplanation:
          "Where the Act does not apply and the claim is in the Small Claims Court, s. 111 (1) of the Courts " +
          "of Justice Act says that in an action for payment of a debt, the defendant may, by way of defence, " +
          "claim the right to set off against the plaintiff's claim a debt owed by the plaintiff to the " +
          "defendant.",
        whenThisComesUp: "When the person renting out the room says rent is unpaid, or the roomer says they paid for things the owner should have.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: CJA_FROM,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-return-of-property", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Where this belongs: under s. 168 (2) of the Residential Tenancies Act, 2006, the Landlord and Tenant " +
          "Board \"has exclusive jurisdiction to determine all applications under this Act and with respect to " +
          "all matters in which jurisdiction is conferred on it by this Act.\" A room covered by the Act goes " +
          "to the Board, which under s. 207 (1) may order payment of up to the greater of $10,000 and the " +
          "monetary jurisdiction of the Small Claims Court. Where s. 5 (i) exempts the room, a money claim up " +
          "to $50,000 is within the Small Claims Court's jurisdiction (Courts of Justice Act, s. 23 (1); " +
          "O. Reg. 626/00, s. 1 (1)).",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        alsoCites: [
          { sourceUrl: CJA, pinpoint: "Courts of Justice Act, s. 23 (1)" },
          { sourceUrl: SC_LIMIT, pinpoint: "O. Reg. 626/00, s. 1 (1)" },
        ],
      },
      {
        note:
          "Time limits in the Residential Tenancies Act, 2006: no application under s. 29 (1) may be made more " +
          "than one year after the day the conduct occurred (s. 29 (2)), and no order under s. 135 for an " +
          "application filed more than one year after the money was collected or retained (s. 135 (4)).",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
      },
      {
        note:
          "Time limit for a court claim: under s. 4 of the Limitations Act, 2002, unless the Act provides " +
          "otherwise, a proceeding shall not be commenced in respect of a claim after the second anniversary of " +
          "the day on which the claim was discovered.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_FROM,
      },
    ],
    signals: [
      "I rent a room in a rooming house",
      "boarding house owner kept my deposit",
      "rooming house landlord owes me",
      "I rent a room and share the kitchen with the owner",
      "lodging house",
      "room rental dispute",
      "owner of the house I board in",
      "boarder owes me rent",
    ],
    citations: [
      { sourceName: "Residential Tenancies Act, 2006", officialUrl: RTA, verifiedAt: V, pinpoint: "s. 2 (1) \"rental unit\", ss. 5 (i), 16, 20 (1), 29, 105 (1), 106 (2), 135, 168 (2), 207 (1)" },
      { sourceName: "Courts of Justice Act", officialUrl: CJA, verifiedAt: V, pinpoint: "ss. 23 (1), 111 (1)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------
  {
    id: "sc-claim-student-residence",
    name: "A student residence",
    courtArea: "small-claims",
    broughtBy: "A student (or the school or residence operator) with a money dispute about student housing: residence fees, a deposit, or damage.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "residence-exempt-or-covered",
        name: "Whether the residence is covered by the Act",
        plainExplanation:
          "Under s. 5 (g) of the Residential Tenancies Act, 2006, the Act does not apply to living accommodation " +
          "provided by an educational institution to its students or staff where (i) it is provided primarily " +
          "to persons under the age of majority, or all major questions about it are decided after " +
          "consultation with a council or association representing the residents, and (ii) it does not have " +
          "its own self-contained bathroom and kitchen facilities or is not intended for year-round occupancy " +
          "by full-time students or staff and their households. Both parts have to be met for the exemption.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        evidenceCategories: [
          {
            name: "Who provides the housing",
            why: "Shows whether the school itself provides it, or a private landlord.",
            examples: ["Residence agreement", "Housing offer letter", "Residence handbook"],
          },
          {
            name: "What the room is like",
            why: "Shows whether it has its own bathroom and kitchen, and whether it is for the school year or year-round.",
            examples: ["Floor plan or photos", "Term dates in the agreement", "Residence council information"],
          },
        ],
      },
      {
        id: "student-housing-money-owed",
        name: "Money is owed, within the Small Claims limit",
        plainExplanation:
          "Where the Act does not apply, s. 23 (1) of the Courts of Justice Act gives the Small Claims Court " +
          "jurisdiction in any action for the payment of money where the amount claimed does not exceed the " +
          "prescribed amount exclusive of interest and costs, which is $50,000 (O. Reg. 626/00, s. 1 (1)). " +
          "What has to be shown is what was agreed, what was paid, and what is owed.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: CJA_FROM,
        alsoCites: [{ sourceUrl: SC_LIMIT, pinpoint: "O. Reg. 626/00, s. 1 (1)" }],
        evidenceCategories: [
          {
            name: "What was agreed",
            why: "Shows the fees, deposit and refund terms.",
            examples: ["Residence contract", "Fee schedule", "Cancellation or withdrawal policy"],
          },
          {
            name: "What was paid or charged",
            why: "Supports the amount claimed.",
            examples: ["Student account statement", "Payment receipts", "Damage charge notices"],
          },
        ],
      },
      {
        id: "student-housing-covered-by-act",
        name: "If the Act applies: the landlord's obligations",
        plainExplanation:
          "If s. 5 does not exempt the housing, s. 29 (1) of the Residential Tenancies Act, 2006 lets a tenant " +
          "or former tenant apply to the Board for orders including that the landlord breached the duty in " +
          "s. 20 (1) to keep the complex in a good state of repair and fit for habitation, and s. 135 (1) lets " +
          "a tenant or former tenant apply for an order that the landlord pay back money collected or retained " +
          "in contravention of the Act.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        evidenceCategories: [
          {
            name: "Records of the problem",
            why: "Shows what happened and when.",
            examples: ["Repair requests", "Dated photos", "Emails with the landlord"],
          },
          {
            name: "Money paid",
            why: "Shows any deposit or charge in question.",
            examples: ["Receipts", "E-transfer records", "Lease terms"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "student-housing-set-off",
        name: "Money the other side says they are owed in return",
        plainExplanation:
          "Under s. 111 (1) of the Courts of Justice Act, in an action for payment of a debt, the defendant " +
          "may, by way of defence, claim the right to set off against the plaintiff's claim a debt owed by the " +
          "plaintiff to the defendant.",
        whenThisComesUp: "When the residence says the student owes fees or damage charges, or the student says a refund or deposit is owed back.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: CJA_FROM,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Where this belongs: if s. 5 (g) of the Residential Tenancies Act, 2006 does not exempt the housing, " +
          "then under s. 168 (2) the Landlord and Tenant Board \"has exclusive jurisdiction to determine all " +
          "applications under this Act and with respect to all matters in which jurisdiction is conferred on " +
          "it by this Act.\" Where the exemption applies, a money claim up to $50,000 is within the Small " +
          "Claims Court's jurisdiction (Courts of Justice Act, s. 23 (1)).",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        alsoCites: [{ sourceUrl: CJA, pinpoint: "Courts of Justice Act, s. 23 (1)" }],
      },
      {
        note:
          "Time limits: under the Residential Tenancies Act, 2006, no application under s. 29 (1) may be made " +
          "more than one year after the conduct occurred (s. 29 (2)), and no order under s. 135 for an " +
          "application filed more than one year after the money was collected or retained (s. 135 (4)). For a " +
          "court claim, s. 4 of the Limitations Act, 2002 says that, unless the Act provides otherwise, a " +
          "proceeding shall not be commenced after the second anniversary of the day the claim was discovered.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        alsoCites: [{ sourceUrl: LIMITATIONS, pinpoint: "Limitations Act, 2002, s. 4" }],
      },
    ],
    signals: [
      "university residence kept my deposit",
      "college residence fees refund",
      "student residence damage charge",
      "dorm room dispute",
      "residence cancelled and no refund",
      "off-campus student housing landlord",
      "school charged me for residence damage",
    ],
    citations: [
      { sourceName: "Residential Tenancies Act, 2006", officialUrl: RTA, verifiedAt: V, pinpoint: "ss. 5 (g), 20 (1), 29, 135, 168 (2)" },
      { sourceName: "Courts of Justice Act", officialUrl: CJA, verifiedAt: V, pinpoint: "ss. 23 (1), 111 (1)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------
  {
    id: "sc-claim-mobile-home-park",
    name: "A mobile home park",
    courtArea: "small-claims",
    broughtBy: "A person who owns a mobile home (or a land lease home) on a site rented in a park or land lease community, with a money dispute with the park's landlord -- or the landlord with a dispute with that tenant.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "rented-site-is-a-rental-unit",
        name: "The rented site is a rental unit under the Act",
        plainExplanation:
          "Under s. 2 (4) of the Residential Tenancies Act, 2006, a rented site for a mobile home or a land " +
          "lease home is a rental unit even if the home on the site is owned by the tenant. Under s. 152, " +
          "Part X of the Act applies to tenancies in mobile home parks and, with necessary modifications, to " +
          "land lease communities, and under s. 3 (3), if a provision in Part X conflicts with another Part, " +
          "Part X applies.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        evidenceCategories: [
          {
            name: "The site tenancy",
            why: "Shows the site, the rent, and the landlord.",
            examples: ["Site lease or tenancy agreement", "Rent receipts", "Park rules given to you"],
          },
          {
            name: "Ownership of the home",
            why: "Shows that the home itself is owned by the tenant.",
            examples: ["Bill of sale for the home", "Property tax or assessment notice for the home"],
          },
        ],
      },
      {
        id: "park-landlord-responsibilities",
        name: "The park landlord did not meet its responsibilities",
        plainExplanation:
          "Section 161 of the Residential Tenancies Act, 2006 says that, in addition to the duties in s. 20, " +
          "a park landlord is responsible for garbage removal at reasonable intervals, keeping park roads in " +
          "good repair, removing snow from park roads, maintaining the water, sewage, fuel, drainage and " +
          "electrical systems, maintaining the grounds and common buildings, and repairing damage to a " +
          "tenant's property caused by the landlord's wilful or negligent conduct. Under s. 29 (1) para. 1, a " +
          "tenant or former tenant may apply to the Board for an order that the landlord breached s. 20 (1) or " +
          "s. 161.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        evidenceCategories: [
          {
            name: "Records of the problem",
            why: "Shows what was not maintained or repaired, and when.",
            examples: ["Dated photos of roads, water or sewer problems", "Written complaints to the park office", "Notes of calls"],
          },
          {
            name: "Damage and costs",
            why: "Supports any amount asked for.",
            examples: ["Repair invoices for your home", "Receipts for water or services you had to buy"],
          },
        ],
      },
      {
        id: "park-charges-limited",
        name: "The park charged more than the Act allows",
        plainExplanation:
          "Under s. 166 of the Residential Tenancies Act, 2006, a landlord shall not charge for the entry, " +
          "exit, installation or removal of a mobile home in a park, or for testing water or sewage, except to " +
          "the extent of the landlord's reasonable out-of-pocket expenses. Under s. 135 (1), a tenant or " +
          "former tenant may apply to the Board for an order that the landlord pay back money collected or " +
          "retained in contravention of the Act.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        evidenceCategories: [
          {
            name: "The charge",
            why: "Shows what was charged and what it was for.",
            examples: ["Invoice or receipt from the park", "Notice of the fee", "Bank record of the payment"],
          },
          {
            name: "The landlord's actual costs",
            why: "Shows whether the charge was more than the out-of-pocket expense.",
            examples: ["Contractor's bill for the work", "Lab bill for water testing"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "park-equipment-standards",
        name: "The landlord may set reasonable standards for equipment",
        plainExplanation:
          "Under s. 160 (1) of the Residential Tenancies Act, 2006, a landlord shall not restrict a tenant's " +
          "right to buy goods or services from the person of their choice, except that under s. 160 (2) a " +
          "landlord may set reasonable standards for mobile home equipment.",
        whenThisComesUp: "When the park says the tenant's equipment or supplier did not meet the park's standards.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
      },
      {
        id: "park-duty-to-minimize-losses",
        name: "The duty to take reasonable steps to minimize losses",
        plainExplanation:
          "Section 16 of the Residential Tenancies Act, 2006 says that when a landlord or a tenant becomes " +
          "liable to pay any amount as a result of a breach of a tenancy agreement, the person entitled to " +
          "claim the amount has a duty to take reasonable steps to minimize their losses.",
        whenThisComesUp: "When either side says the other could have kept the loss lower.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Where this belongs: under s. 168 (2) of the Residential Tenancies Act, 2006, the Landlord and Tenant " +
          "Board \"has exclusive jurisdiction to determine all applications under this Act and with respect to " +
          "all matters in which jurisdiction is conferred on it by this Act.\" Applications under s. 29 (1) and " +
          "s. 135 (1) go to the Board. Under s. 207 (1) the Board may order payment of up to the greater of " +
          "$10,000 and the Small Claims Court's monetary jurisdiction; under s. 207 (2), a claim that exceeds " +
          "that limit may be brought in any court of competent jurisdiction.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
      },
      {
        note:
          "Time limits in the Residential Tenancies Act, 2006: no application under s. 29 (1) may be made more " +
          "than one year after the day the conduct occurred (s. 29 (2)), and no order under s. 135 for an " +
          "application filed more than one year after the money was collected or retained (s. 135 (4)).",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
      },
      {
        note:
          "If the tenancy ended and the home was left behind: under s. 162 (2) of the Residential Tenancies " +
          "Act, 2006, the landlord shall not dispose of the mobile home without first notifying the tenant by " +
          "registered mail and by a newspaper notice. Under s. 162 (4), if within six months after those " +
          "notices the tenant claims a home the landlord has already sold, the landlord shall pay the tenant " +
          "the amount by which the sale proceeds exceed the landlord's reasonable out-of-pocket expenses and " +
          "any arrears of rent.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
      },
    ],
    signals: [
      "mobile home park landlord",
      "trailer park lot rent dispute",
      "park will not fix the roads",
      "park charged me to move my mobile home out",
      "land lease community fees",
      "park owner sold my mobile home",
      "water and sewer problems in the mobile home park",
      "I own my mobile home but rent the lot",
    ],
    citations: [
      { sourceName: "Residential Tenancies Act, 2006", officialUrl: RTA, verifiedAt: V, pinpoint: "ss. 2 (4), 3 (3), 16, 29, 135, 152, 160-162, 166, 168 (2), 207" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------
  {
    id: "sc-claim-home-purchase-closing-dispute",
    name: "A home purchase deposit or closing dispute",
    courtArea: "small-claims",
    broughtBy: "A buyer or seller of a home where the deal did not close, or closed with a dispute, and the deposit or other money is in question.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "the-agreement-and-who-did-not-close",
        name: "The agreement, and who did not complete it",
        plainExplanation:
          "The Superior Court of Justice's guide to the steps in a civil case says that in every civil case " +
          "the plaintiff has the burden of proof to establish, on a balance of probabilities, the allegations " +
          "in their claim. Here that means the agreement of purchase and sale, its deposit and closing terms, " +
          "and what each side did or did not do on closing.",
        sourceUrl: STEPS,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "The agreement",
            why: "Shows the price, the deposit, the closing date and any conditions.",
            examples: ["Agreement of purchase and sale", "Amendments and waivers", "Deposit receipt from the brokerage or lawyer"],
          },
          {
            name: "What happened on closing",
            why: "Shows who was ready to close and who was not.",
            examples: ["Lawyers' letters around the closing date", "Financing or mortgage letters", "Emails between the parties or agents"],
          },
        ],
      },
      {
        id: "deposit-retained-on-failure-to-close",
        name: "The deposit when a buyer fails to close",
        plainExplanation:
          "In Jesan Real Estate Ltd. v. Doyle, 2020 ONCA 714, para. 54, the Court of Appeal for Ontario said " +
          "that when a purchaser fails to close an agreement of purchase and sale, the vendor is entitled to " +
          "retain the deposit regardless of whether they suffer a loss, subject to the court's ability to " +
          "grant relief from forfeiture. It quoted s. 98 of the Courts of Justice Act -- a court may grant " +
          "relief against penalties and forfeitures on just terms -- and the two-part test: whether the " +
          "forfeited deposit was out of all proportion to the damages suffered, and whether it would be " +
          "unconscionable for the seller to keep it.",
        sourceUrl: JESAN,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: CJA, pinpoint: "Courts of Justice Act, s. 98" }],
        evidenceCategories: [
          {
            name: "The deposit",
            why: "Shows how much was paid and on what terms.",
            examples: ["Deposit receipt", "Deposit clause in the agreement", "Trust account statement"],
          },
          {
            name: "The seller's actual loss",
            why: "Relevant to whether keeping the deposit is out of proportion to the loss.",
            examples: ["Later sale price of the home", "Carrying costs", "Listing history after the failed sale"],
          },
        ],
      },
      {
        id: "home-purchase-amount-within-limit",
        name: "The amount claimed is money, within the Small Claims limit",
        plainExplanation:
          "Under s. 23 (1) (a) of the Courts of Justice Act, the Small Claims Court has jurisdiction in any " +
          "action for the payment of money where the amount claimed does not exceed the prescribed amount " +
          "exclusive of interest and costs, which is $50,000 (O. Reg. 626/00, s. 1 (1)). A claim for a larger " +
          "amount, or for something other than money, is outside it (see the notes).",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: CJA_FROM,
        alsoCites: [{ sourceUrl: SC_LIMIT, pinpoint: "O. Reg. 626/00, s. 1 (1)" }],
        evidenceCategories: [
          {
            name: "How the amount is calculated",
            why: "Supports the specific dollar amount claimed.",
            examples: ["A table of the deposit and costs", "Invoices for legal or moving costs", "Bank statements"],
          },
          {
            name: "Requests for payment",
            why: "Shows the amount was asked for.",
            examples: ["Demand letter", "Lawyers' correspondence"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "home-purchase-mitigation",
        name: "Losses that could reasonably have been avoided",
        plainExplanation:
          "In Southcott Estates Inc. v. Toronto Catholic District School Board, 2012 SCC 51, para. 24, about " +
          "a failed land purchase, the Supreme Court of Canada said that as a general rule a plaintiff will not " +
          "be able to recover for losses which could have been avoided by taking reasonable steps, and that " +
          "where it is alleged the plaintiff failed to mitigate, the burden of proof is on the defendant, who " +
          "needs to prove both that the plaintiff failed to make reasonable efforts to mitigate and that " +
          "mitigation was possible.",
        whenThisComesUp: "When the other side says the seller could have resold sooner, or the buyer could have found another home.",
        sourceUrl: SOUTHCOTT,
        verifiedAt: V,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs", "sc-remedy-outside-jurisdiction"],
    proceduralNotes: [
      {
        note:
          "What the Small Claims Court cannot order: under s. 96 (3) of the Courts of Justice Act, only the " +
          "Court of Appeal and the Superior Court of Justice, exclusive of the Small Claims Court, may grant " +
          "equitable relief, unless otherwise provided, and under s. 97 the same courts, exclusive of the Small " +
          "Claims Court, may make binding declarations of right. A claim over $50,000 is also outside the " +
          "Small Claims Court (s. 23 (1); O. Reg. 626/00, s. 1 (1)).",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: CJA_FROM,
        alsoCites: [{ sourceUrl: SC_LIMIT, pinpoint: "O. Reg. 626/00, s. 1 (1)" }],
      },
      {
        note:
          "Time limit: under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
          "shall not be commenced in respect of a claim after the second anniversary of the day on which the " +
          "claim was discovered.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_FROM,
      },
    ],
    signals: [
      "buyer did not close on my house",
      "seller kept my deposit",
      "home purchase fell through",
      "deal did not close",
      "agreement of purchase and sale deposit",
      "I want my house deposit back",
      "buyer walked away from the deal",
      "could not get financing and lost my deposit",
      "new build deposit",
    ],
    citations: [
      { sourceName: "Jesan Real Estate Ltd. v. Doyle, 2020 ONCA 714", officialUrl: JESAN, verifiedAt: V, pinpoint: "para. 54" },
      { sourceName: "Southcott Estates Inc. v. Toronto Catholic District School Board, 2012 SCC 51", officialUrl: SOUTHCOTT, verifiedAt: V, pinpoint: "para. 24" },
      { sourceName: "Courts of Justice Act", officialUrl: CJA, verifiedAt: V, pinpoint: "ss. 23 (1), 96 (3), 97, 98" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------
  {
    id: "sc-claim-contractor-lien-on-a-home",
    name: "A contractor's lien registered against a home",
    courtArea: "small-claims",
    broughtBy: "A homeowner whose home has a construction lien registered on title by a contractor or trade, or a contractor or trade who worked on a home and was not paid.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "lien-for-services-or-materials-to-improvement",
        name: "Services or materials were supplied to an improvement",
        plainExplanation:
          "Under s. 14 (1) of the Construction Act, a person who supplies services or materials to an " +
          "improvement for an owner, contractor or subcontractor has a lien upon the owner's interest in the " +
          "premises improved for the price of those services or materials. Section 1 (1) defines " +
          "\"improvement\" to include any alteration, addition or capital repair to the land. Under s. 14 (2), " +
          "no one is entitled to a lien for interest on the amount owed.",
        sourceUrl: CONSTRUCTION,
        verifiedAt: V,
        consolidationPeriod: CONSTRUCTION_FROM,
        evidenceCategories: [
          {
            name: "The contract and the work",
            why: "Shows what was to be supplied and the price.",
            examples: ["Written contract or quote", "Change orders", "Photos of the work done"],
          },
          {
            name: "What was paid and what is owed",
            why: "Shows the unpaid price.",
            examples: ["Invoices", "Payment records", "Statement of account"],
          },
        ],
      },
      {
        id: "lien-preserved-and-perfected-in-time",
        name: "Whether the lien was preserved and perfected in time",
        plainExplanation:
          "Under s. 31 (2) of the Construction Act, a contractor's lien expires at the end of the 60-day period " +
          "after the earlier of publication of a certificate of substantial performance and the date the " +
          "contract is completed, abandoned or terminated (or, where there is no certificate, the earlier of " +
          "completion and abandonment or termination), unless preserved. Under s. 34 (1) (a) a lien that " +
          "attaches to the premises is preserved by registering a claim for lien on title. Under s. 36 (2) a " +
          "preserved lien expires unless perfected within the next 90 days, and under s. 36 (3) it is " +
          "perfected by starting an action to enforce it and registering a certificate of action.",
        sourceUrl: CONSTRUCTION,
        verifiedAt: V,
        consolidationPeriod: CONSTRUCTION_FROM,
        evidenceCategories: [
          {
            name: "The key dates",
            why: "The time limits run from these dates.",
            examples: ["Date the work was finished or stopped", "Any certificate of substantial performance", "Last invoice date"],
          },
          {
            name: "What is on title",
            why: "Shows when the claim for lien and any certificate of action were registered.",
            examples: ["Parcel register for the property", "Registered claim for lien", "Certificate of action"],
          },
        ],
      },
      {
        id: "unpaid-price-as-money-claim",
        name: "The unpaid price as a money claim",
        plainExplanation:
          "Apart from the lien, under s. 23 (1) (a) of the Courts of Justice Act the Small Claims Court has " +
          "jurisdiction in any action for the payment of money where the amount claimed does not exceed the " +
          "prescribed amount exclusive of interest and costs, which is $50,000 (O. Reg. 626/00, s. 1 (1)). " +
          "What has to be shown is the agreement, the work done, and the amount unpaid.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: CJA_FROM,
        alsoCites: [{ sourceUrl: SC_LIMIT, pinpoint: "O. Reg. 626/00, s. 1 (1)" }],
        evidenceCategories: [
          {
            name: "The agreement",
            why: "Shows the price and scope agreed.",
            examples: ["Contract", "Texts or emails accepting the quote"],
          },
          {
            name: "The unpaid amount",
            why: "Supports the amount claimed.",
            examples: ["Final invoice", "Payment history", "Demand letter"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "exaggerated-or-false-lien",
        name: "Liability for an exaggerated or false lien",
        plainExplanation:
          "Under s. 35 (1) of the Construction Act, a person who preserves a claim for lien is liable to any " +
          "person who suffers damages as a result where the person knows or ought to know that the amount of " +
          "the lien has been wilfully exaggerated, or that they do not have a lien. Under s. 47 (1), the court " +
          "may, on motion, order the discharge of a lien on the basis that the claim is frivolous, vexatious or " +
          "an abuse of process, or on any other proper ground.",
        whenThisComesUp: "When the homeowner says the amount on the lien is more than is owed, or that no lien should have been registered.",
        sourceUrl: CONSTRUCTION,
        verifiedAt: V,
        consolidationPeriod: CONSTRUCTION_FROM,
      },
      {
        id: "holdback-and-vacating-by-payment",
        name: "The holdback, and vacating the lien by paying into court",
        plainExplanation:
          "Under s. 22 (1) of the Construction Act, each payer on a contract under which a lien may arise " +
          "shall retain a holdback equal to 10 per cent of the price of the services or materials as they are " +
          "supplied, until the liens that may be claimed against it have expired or been satisfied, discharged " +
          "or provided for. Under s. 44 (1), on the motion of any person, the court shall vacate the " +
          "registration of a claim for lien where that person pays into court, or posts security for, the full " +
          "amount claimed plus the lesser of $250,000 or 25 per cent of it as security for costs.",
        whenThisComesUp: "When the homeowner needs the lien off title, for example to sell or refinance, or says a holdback was kept.",
        sourceUrl: CONSTRUCTION,
        verifiedAt: V,
        consolidationPeriod: CONSTRUCTION_FROM,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs", "sc-remedy-outside-jurisdiction"],
    proceduralNotes: [
      {
        note:
          "Where this belongs: under s. 50 (1) of the Construction Act, a lien claim is enforceable in an " +
          "action in the Superior Court of Justice, and s. 1 (1) defines \"court\" in the Act as the Superior " +
          "Court of Justice, so motions to vacate or discharge a lien go there. Under s. 58 (1) (c), if the " +
          "action is for an amount within the Small Claims Court's monetary jurisdiction, it can be referred " +
          "for trial to a deputy judge of that Court or to the Small Claims Court Administrative Judge.",
        sourceUrl: CONSTRUCTION,
        verifiedAt: V,
        consolidationPeriod: CONSTRUCTION_FROM,
      },
      {
        note:
          "Time limit for a money claim on the contract: under s. 4 of the Limitations Act, 2002, unless the " +
          "Act provides otherwise, a proceeding shall not be commenced in respect of a claim after the second " +
          "anniversary of the day on which the claim was discovered. The lien itself has the much shorter " +
          "limits in ss. 31 and 36 of the Construction Act.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_FROM,
        alsoCites: [{ sourceUrl: CONSTRUCTION, pinpoint: "Construction Act, ss. 31 (2), 36 (2)" }],
      },
    ],
    signals: [
      "contractor put a lien on my house",
      "construction lien on my home",
      "lien registered on title",
      "contractor registered a lien",
      "renovation contractor was not paid",
      "I did the work and the homeowner will not pay",
      "need to remove a lien to sell my house",
      "lien amount is too high",
    ],
    citations: [
      { sourceName: "Construction Act", officialUrl: CONSTRUCTION, verifiedAt: V, pinpoint: "ss. 1 (1), 14, 22 (1), 31 (2), 34 (1), 35 (1), 36, 44 (1), 47 (1), 50 (1), 58 (1)" },
      { sourceName: "Courts of Justice Act", officialUrl: CJA, verifiedAt: V, pinpoint: "s. 23 (1)" },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
