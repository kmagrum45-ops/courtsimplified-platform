/**
 * Case types, batch "sc-housing-1" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-housing-1.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-landlord-against-former-tenant -- A landlord claiming against a former tenant
 *   sc-claim-tenant-against-former-landlord -- A tenant claiming against a former landlord
 *   sc-claim-roommate-or-shared-house -- A roommate or shared-house dispute
 *   sc-claim-subletter-not-paying -- A subletter or roommate not paying their share
 *   sc-claim-condo-owner-against-corporation -- A condo owner against the condo corporation
 *   sc-claim-condo-water-or-noise-damage -- Water or noise damage between condo units
 *   sc-claim-co-owner-dispute -- A dispute between co-owners
 *
 * Many of these matters are NOT decided by the Small Claims Court. Each type's
 * procedural notes say where the matter belongs, from the saved text: the
 * Landlord and Tenant Board under s. 168 (2) of the Residential Tenancies Act,
 * 2006; the Condominium Authority Tribunal under s. 1.36 of the Condominium
 * Act, 1998 and O. Reg. 179/17; the Superior Court of Justice under the
 * Partition Act and ss. 134-135 of the Condominium Act. The general regulation
 * under the Residential Tenancies Act (O. Reg. 516/06) is not saved in
 * docs/sources/corpus, so nothing here rests on it.
 */

import type { ClaimType } from "../claimTypes";

const RTA = "https://www.ontario.ca/laws/docs/06r17_e.doc";
const RTA_FROM = "2026-09-21";
const CONDO = "https://www.ontario.ca/laws/docs/98c19_e.doc";
const CONDO_FROM = "2025-12-31";
const CAT_REG = "https://www.ontario.ca/laws/docs/170179_e.doc";
const CAT_REG_FROM = "2026-07-20";
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const CJA_FROM = "2025-12-11";
const SC_LIMIT = "https://www.ontario.ca/laws/docs/000626_e.doc";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_FROM = "2024-12-04";
const PARTITION = "https://www.ontario.ca/laws/docs/90p04_e.doc";
const PARTITION_FROM = "2009-12-15";
const STEPS =
  "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/";
const MUSTAPHA = "docs/sources/decisions/mustapha-v-culligan-2008-SCC-27.english.txt";
const V = "2026-10-07";

export const TYPES_SC_HOUSING_1: ClaimType[] = [
  // ---------------------------------------------------------------------
  {
    id: "sc-claim-landlord-against-former-tenant",
    name: "A landlord claiming against a former tenant",
    courtArea: "small-claims",
    broughtBy: "A landlord who rented a home to a tenant who has now moved out, and says the former tenant owes rent or caused damage. Not the tenant claiming against the landlord.",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "rent-lawfully-required-not-paid",
        name: "Rent that was lawfully required was not paid",
        plainExplanation:
          "Under s. 87 (1) of the Residential Tenancies Act, 2006, a landlord may apply to the Landlord and " +
          "Tenant Board for an order requiring a tenant or former tenant to pay arrears of rent if the tenant " +
          "or former tenant did not pay rent lawfully required under the tenancy agreement. For a former " +
          "tenant who has moved out, s. 87 (1) (b) adds that they ceased to be in possession on or after the " +
          "day a 2020 amendment came into force (the Act's amendment table lists it as in force on 01/09/2021). " +
          "What has to be shown is the rent that was owed under the agreement and what was not paid.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        evidenceCategories: [
          {
            name: "The tenancy agreement and the rent",
            why: "Shows what rent was required and when it was due.",
            examples: ["Written lease", "Texts or emails setting the rent", "Rent increase notices"],
          },
          {
            name: "Payment records",
            why: "Shows what was paid and what was not.",
            examples: ["Rent ledger", "Bank deposits or e-transfer history", "Receipts given to the tenant"],
          },
          {
            name: "When the tenant left",
            why: "The move-out date matters for which rules and time limits apply.",
            examples: ["Notice of termination", "Key return record", "Move-out inspection notes"],
          },
        ],
      },
      {
        id: "undue-damage-wilful-or-negligent",
        name: "Undue damage was caused wilfully or negligently",
        plainExplanation:
          "Under s. 34 of the Residential Tenancies Act, 2006, the tenant is responsible for the repair of " +
          "undue damage to the rental unit or residential complex caused by the wilful or negligent conduct " +
          "of the tenant, another occupant of the unit, or a person the tenant permitted in the complex. " +
          "Under s. 89 (1), a landlord may apply to the Board for an order requiring a tenant or former tenant " +
          "to pay the reasonable costs of repair or, where repairing is not reasonable, replacement of the " +
          "damaged property. What has to be shown is the damage, who caused it, and the reasonable cost.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        evidenceCategories: [
          {
            name: "Condition before and after",
            why: "Shows what was damaged during the tenancy.",
            examples: ["Move-in and move-out photos", "Inspection checklists", "Dated videos"],
          },
          {
            name: "Repair or replacement costs",
            why: "Supports the amount claimed as reasonable.",
            examples: ["Contractor invoices", "Written quotes", "Receipts for materials"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "landlord-duty-to-minimize-losses",
        name: "The landlord's duty to take reasonable steps to minimize losses",
        plainExplanation:
          "Section 16 of the Residential Tenancies Act, 2006 says that when a landlord or a tenant becomes " +
          "liable to pay any amount as a result of a breach of a tenancy agreement, the person entitled to " +
          "claim the amount has a duty to take reasonable steps to minimize their losses. Where a tenant left " +
          "without proper notice, s. 88 (4) says that in working out the rent arrears owing, consideration " +
          "shall be given to whether the landlord took reasonable steps to minimize losses.",
        whenThisComesUp: "When the former tenant says the unit could have been re-rented sooner, or that the landlord did nothing to reduce the loss.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
      },
      {
        id: "rent-deposit-applied-to-last-period",
        name: "A rent deposit is applied to the last rent period",
        plainExplanation:
          "Under s. 105 (1) of the Residential Tenancies Act, 2006, the only security deposit a landlord may " +
          "collect is a rent deposit collected under s. 106. Section 106 (10) says a landlord shall apply a " +
          "rent deposit the tenant paid in payment of the rent for the last rent period before the tenancy " +
          "terminates.",
        whenThisComesUp: "When the former tenant paid a last month's rent deposit, or the landlord kept a separate damage deposit.",
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
          "all matters in which jurisdiction is conferred on it by this Act.\" A landlord's claim against a " +
          "former tenant for rent arrears (s. 87) or for damage (s. 89) is an application to the Board. Each " +
          "may be made no later than one year after the former tenant ceased to be in possession of the unit " +
          "(ss. 87 (1.1) and 89 (1.1)).",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
      },
      {
        note:
          "Under s. 207 (1) of the Residential Tenancies Act, 2006, the Board may order payment of up to the " +
          "greater of $10,000 and the monetary jurisdiction of the Small Claims Court. Under s. 207 (2), a " +
          "person entitled to apply under the Act whose claim exceeds that limit may commence a proceeding in " +
          "any court of competent jurisdiction. Under s. 207 (3), if a party claims an amount within the " +
          "Board's limit, all rights to more than that limit are extinguished once the Board issues its order.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
      },
      {
        note:
          "Section 5 of the Residential Tenancies Act, 2006 lists living accommodation the Act does not apply " +
          "to -- for example, under s. 5 (i), where the occupant is required to share a bathroom or kitchen " +
          "with the owner or the owner's spouse, child or parent (or the spouse's child or parent) who lives " +
          "in the building. Where the Act does not apply, the Small Claims Court has jurisdiction in any " +
          "action for the payment of money up to the prescribed amount, exclusive of interest and costs " +
          "(Courts of Justice Act, s. 23 (1)), which is $50,000 (O. Reg. 626/00, s. 1 (1)).",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        alsoCites: [
          { sourceUrl: CJA, pinpoint: "Courts of Justice Act, s. 23 (1)" },
          { sourceUrl: SC_LIMIT, pinpoint: "O. Reg. 626/00, s. 1 (1)" },
        ],
      },
    ],
    signals: [
      "former tenant owes me rent",
      "tenant moved out owing rent",
      "tenant left without paying rent",
      "tenant damaged my rental unit",
      "tenant left the apartment damaged",
      "suing my old tenant",
      "tenant skipped out on the lease",
      "unpaid rent after tenant moved out",
    ],
    citations: [
      { sourceName: "Residential Tenancies Act, 2006", officialUrl: RTA, verifiedAt: V, pinpoint: "ss. 5, 16, 34, 87, 88 (4), 89, 105 (1), 106 (10), 168 (2), 207" },
      { sourceName: "Courts of Justice Act", officialUrl: CJA, verifiedAt: V, pinpoint: "s. 23 (1)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------
  {
    id: "sc-claim-tenant-against-former-landlord",
    name: "A tenant claiming against a former landlord",
    courtArea: "small-claims",
    broughtBy: "A tenant who has moved out and says the former landlord owes them money: a deposit, money collected against the rules, or compensation. Not the landlord claiming against the tenant.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "landlord-conduct-listed-in-s29",
        name: "The landlord did something listed in s. 29 (1)",
        plainExplanation:
          "Under s. 29 (1) of the Residential Tenancies Act, 2006, a tenant or former tenant may apply to the " +
          "Landlord and Tenant Board for an order determining that the landlord: breached the duty in s. 20 (1) " +
          "to maintain the rental unit in a good state of repair and fit for habitation; withheld or " +
          "deliberately interfered with the reasonable supply of a vital service; substantially interfered " +
          "with reasonable enjoyment of the unit; harassed, obstructed, coerced, threatened or interfered with " +
          "the tenant; changed the locks without giving the tenant replacement keys; or illegally entered the " +
          "unit. What has to be shown is what the landlord, superintendent or agent did, and when.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        evidenceCategories: [
          {
            name: "Records of the problem",
            why: "Shows what happened and when.",
            examples: ["Dated photos or videos", "Repair requests sent to the landlord", "Texts or emails with the landlord"],
          },
          {
            name: "Costs and losses",
            why: "Supports any amount asked for.",
            examples: ["Receipts for repairs or replacement items", "Hotel or moving receipts", "Utility bills"],
          },
        ],
      },
      {
        id: "money-collected-or-retained-against-the-act",
        name: "The landlord collected or kept money the Act does not allow",
        plainExplanation:
          "Under s. 135 (1) of the Residential Tenancies Act, 2006, a tenant or former tenant may apply to the " +
          "Board for an order that the landlord pay back any money the landlord collected or retained in " +
          "contravention of the Act. For example, s. 105 (1) says the only security deposit a landlord may " +
          "collect is a rent deposit under s. 106, and s. 106 (2) caps it at the lesser of one rent period and " +
          "one month's rent. Under s. 107 (1), a landlord shall repay a rent deposit if vacant possession of " +
          "the unit is not given to the prospective tenant.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        evidenceCategories: [
          {
            name: "What was paid",
            why: "Shows the amount the landlord received and what it was for.",
            examples: ["Receipt for a deposit", "E-transfer confirmation", "Lease clause naming the deposit"],
          },
          {
            name: "What happened at the end",
            why: "Shows whether the money was applied, returned or kept.",
            examples: ["Messages asking for the deposit back", "Final rent statement", "Move-out date records"],
          },
        ],
      },
      {
        id: "notice-given-in-bad-faith",
        name: "The landlord gave a notice to end the tenancy in bad faith",
        plainExplanation:
          "Under s. 57 (1) of the Residential Tenancies Act, 2006, on application by a former tenant, the Board " +
          "may make an order if it determines the landlord gave a notice of termination under s. 48, 49 or 50 " +
          "in bad faith, the former tenant moved out because of the notice (or a Board application or order " +
          "based on it), and the unit was not then used for the purpose the notice gave within a reasonable " +
          "time. Under s. 57 (3), the orders include paying increased rent for a one-year period, general " +
          "compensation of up to 12 months of the last rent, and reasonable moving and storage expenses.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        evidenceCategories: [
          {
            name: "The notice and why it was given",
            why: "Shows which notice was given and the reason stated.",
            examples: ["Copy of the N12 or N13 notice", "Messages about the landlord's plans", "Any Board order on the notice"],
          },
          {
            name: "What happened to the unit afterwards",
            why: "Shows how the unit was used after the move-out.",
            examples: ["Rental listing for the unit", "Photos of the unit or building", "Statements from neighbours"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "tenant-duty-to-minimize-losses",
        name: "The tenant's duty to take reasonable steps to minimize losses",
        plainExplanation:
          "Section 16 of the Residential Tenancies Act, 2006 applies to both sides: when a landlord or a tenant " +
          "becomes liable to pay any amount as a result of a breach of a tenancy agreement, the person entitled " +
          "to claim the amount has a duty to take reasonable steps to minimize their losses.",
        whenThisComesUp: "When the landlord's response is that the former tenant's costs could have been kept lower.",
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
          "all matters in which jurisdiction is conferred on it by this Act.\" A former tenant's applications " +
          "under s. 29 (1), s. 57 and s. 135 are applications to the Board.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
      },
      {
        note:
          "Time limits in the Residential Tenancies Act, 2006: no application under s. 29 (1) may be made more " +
          "than one year after the day the conduct occurred (s. 29 (2)); no application under s. 57 (1) more " +
          "than one year after the former tenant vacated (s. 57 (2)); and no order under s. 135 for an " +
          "application filed more than one year after the money was collected or retained (s. 135 (4)).",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
      },
      {
        note:
          "Under s. 207 (1) of the Residential Tenancies Act, 2006, the Board may order payment of up to the " +
          "greater of $10,000 and the monetary jurisdiction of the Small Claims Court; under s. 207 (2), a " +
          "claim that exceeds that limit may be brought in any court of competent jurisdiction. Where the Act " +
          "does not apply to the home at all (s. 5 lists those exemptions), the Small Claims Court has " +
          "jurisdiction in any action for the payment of money up to $50,000, exclusive of interest and costs " +
          "(Courts of Justice Act, s. 23 (1); O. Reg. 626/00, s. 1 (1)).",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        alsoCites: [
          { sourceUrl: CJA, pinpoint: "Courts of Justice Act, s. 23 (1)" },
          { sourceUrl: SC_LIMIT, pinpoint: "O. Reg. 626/00, s. 1 (1)" },
        ],
      },
    ],
    signals: [
      "landlord kept my deposit",
      "landlord never returned my last month's rent",
      "former landlord owes me money",
      "landlord evicted me for his own use",
      "landlord said his family was moving in",
      "landlord re-rented the unit after evicting me",
      "landlord changed the locks on me",
      "landlord entered my apartment without notice",
      "suing my old landlord",
    ],
    citations: [
      { sourceName: "Residential Tenancies Act, 2006", officialUrl: RTA, verifiedAt: V, pinpoint: "ss. 5, 16, 29, 57, 105-107, 135, 168 (2), 207" },
      { sourceName: "Courts of Justice Act", officialUrl: CJA, verifiedAt: V, pinpoint: "s. 23 (1)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------
  {
    id: "sc-claim-roommate-or-shared-house",
    name: "A roommate or shared-house dispute",
    courtArea: "small-claims",
    broughtBy: "A person who shared a home with someone else -- a roommate or housemate -- and says that person owes them money for shared costs or kept their things.",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "who-the-arrangement-was-with",
        name: "Who the living arrangement was with",
        plainExplanation:
          "Whether the Residential Tenancies Act, 2006 covers a dispute depends on who the parties are. In s. 2 " +
          "(1), the definition of \"landlord\" leaves out \"a tenant who occupies a rental unit in a " +
          "residential complex and who permits another person to also occupy the unit or any part of the " +
          "unit\". Under s. 5 (i), the Act does not apply where the occupant is required to share a bathroom or " +
          "kitchen with the owner, or the owner's spouse, child or parent (or the spouse's child or parent), " +
          "who lives in the building. What has to be shown is who was on the lease, who owned the home, and " +
          "who shared what.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        evidenceCategories: [
          {
            name: "Who was on the lease or owned the home",
            why: "Shows each person's role in the household.",
            examples: ["Lease showing the named tenants", "Messages about who rented to whom", "Property tax or ownership record"],
          },
          {
            name: "How the home was shared",
            why: "Shows whether a kitchen or bathroom was shared, and with whom.",
            examples: ["Floor plan or photos", "House rules or roommate agreement", "Messages about shared spaces"],
          },
        ],
      },
      {
        id: "money-owed-or-property-kept",
        name: "Money is owed, or personal property is being kept",
        plainExplanation:
          "Under s. 23 (1) of the Courts of Justice Act, the Small Claims Court has jurisdiction in any action " +
          "for the payment of money where the amount claimed does not exceed the prescribed amount exclusive " +
          "of interest and costs, and in any action for the recovery of possession of personal property where " +
          "the value does not exceed the prescribed amount. That amount is $50,000 (O. Reg. 626/00, s. 1 (1)). " +
          "What has to be shown is what was agreed about shared costs, what was paid, and what is owed or kept.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: CJA_FROM,
        alsoCites: [{ sourceUrl: SC_LIMIT, pinpoint: "O. Reg. 626/00, s. 1 (1)" }],
        evidenceCategories: [
          {
            name: "What was agreed about shared costs",
            why: "Shows how rent, bills or groceries were to be split.",
            examples: ["Roommate agreement", "Group chat about splitting bills", "Shared spreadsheet"],
          },
          {
            name: "What was paid and by whom",
            why: "Supports the amount claimed.",
            examples: ["Utility and internet bills", "E-transfer history between roommates", "Bank statements"],
          },
          {
            name: "Property being kept",
            why: "Identifies the items and their value.",
            examples: ["Photos of the items", "Purchase receipts", "Messages asking for the items back"],
          },
        ],
      },
      {
        id: "burden-of-proof-roommate",
        name: "Proving it on a balance of probabilities",
        plainExplanation:
          "The Superior Court of Justice's guide to the steps in a civil case says that in every civil case " +
          "the plaintiff has the burden of proof to establish, on a balance of probabilities, the allegations " +
          "in their claim. Between roommates, agreements are often spoken or in texts, so the records of what " +
          "was said and paid are what show it.",
        sourceUrl: STEPS,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "Messages between roommates",
            why: "Shows what each person said they would pay or return.",
            examples: ["Texts", "Messaging-app chats", "Emails"],
          },
          {
            name: "People who saw or heard the arrangement",
            why: "Can describe what was agreed.",
            examples: ["Other housemates", "A friend present when the split was agreed"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "roommate-set-off",
        name: "Money the other roommate says they are owed in return",
        plainExplanation:
          "Under s. 111 (1) of the Courts of Justice Act, in an action for payment of a debt, the defendant " +
          "may, by way of defence, claim the right to set off against the plaintiff's claim a debt owed by the " +
          "plaintiff to the defendant. Under s. 111 (2), mutual debts may be set off against each other even " +
          "if they are of a different nature.",
        whenThisComesUp: "When each roommate says the other owes them for different shared bills or items.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: CJA_FROM,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-return-of-property", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Where this belongs: the Landlord and Tenant Board's exclusive jurisdiction under s. 168 (2) of the " +
          "Residential Tenancies Act, 2006 is over \"all applications under this Act and with respect to all " +
          "matters in which jurisdiction is conferred on it by this Act.\" If the person who brought you into " +
          "the home is a landlord under the Act and s. 5 does not exempt the home, applications under the Act " +
          "against them -- such as those in s. 29 (1) and s. 135 (1) -- go to the Board. A dispute " +
          "between roommates who are not each other's landlord under s. 2 (1) is a money claim the Small " +
          "Claims Court has jurisdiction over (Courts of Justice Act, s. 23 (1)).",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        alsoCites: [{ sourceUrl: CJA, pinpoint: "Courts of Justice Act, s. 23 (1)" }],
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
      "roommate owes me for bills",
      "roommate owes me for utilities",
      "housemate stopped paying the hydro",
      "split the rent with my roommate",
      "shared house bills",
      "roommate kept my things",
      "my roommate left and stuck me with the bills",
      "housemate owes me money",
    ],
    citations: [
      { sourceName: "Residential Tenancies Act, 2006", officialUrl: RTA, verifiedAt: V, pinpoint: "s. 2 (1) \"landlord\", s. 5 (i), s. 168 (2)" },
      { sourceName: "Courts of Justice Act", officialUrl: CJA, verifiedAt: V, pinpoint: "ss. 23 (1), 111" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------
  {
    id: "sc-claim-subletter-not-paying",
    name: "A subletter or roommate not paying their share",
    courtArea: "small-claims",
    broughtBy: "A tenant who sublet their place, or let someone share it, and says that person has not paid what they owed.",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "was-it-a-sublet",
        name: "Whether the arrangement was a sublet",
        plainExplanation:
          "Under s. 2 (2) of the Residential Tenancies Act, 2006, subletting means the tenant vacates the " +
          "rental unit, gives one or more other persons the right to occupy it for a term ending on a specified " +
          "date before the end of the tenant's term or period, and has the right to resume occupancy after that " +
          "date. Under s. 97 (1), a tenant may sublet a rental unit to another person with the consent of the " +
          "landlord. A tenant who stays living in the unit and lets someone share it is not subletting under " +
          "that definition.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        evidenceCategories: [
          {
            name: "The subletting agreement",
            why: "Shows the term, the rent and the return date.",
            examples: ["Written sublet agreement", "Messages setting the dates and amount", "Listing for the sublet"],
          },
          {
            name: "The landlord's consent",
            why: "Shows whether the landlord agreed to the sublet.",
            examples: ["Email or letter from the landlord", "Consent form"],
          },
        ],
      },
      {
        id: "subtenant-liable-to-tenant",
        name: "The subtenant did not meet their obligations",
        plainExplanation:
          "Under s. 97 (4) (b) of the Residential Tenancies Act, 2006, the subtenant is entitled to the benefits, " +
          "and is liable to the tenant for the breaches, of the subtenant's obligations under the subletting " +
          "agreement or the Act during the subtenancy. Under s. 99, sections 87 and 89 (rent arrears and " +
          "damage) apply to a tenant who has sublet as if the tenant were the landlord and the subtenant were " +
          "the tenant, along with the provisions about applying to the Board under those sections.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        evidenceCategories: [
          {
            name: "What was owed and paid",
            why: "Supports the amount claimed.",
            examples: ["Payment history", "E-transfer records", "A running list of missed payments"],
          },
          {
            name: "Condition of the unit",
            why: "Shows any damage during the subtenancy.",
            examples: ["Photos before and after", "Repair receipts"],
          },
        ],
      },
      {
        id: "share-of-costs-not-a-sublet",
        name: "A roommate's share of costs, where it was not a sublet",
        plainExplanation:
          "In s. 2 (1) of the Residential Tenancies Act, 2006, the definition of \"landlord\" leaves out a " +
          "tenant who occupies a rental unit and permits another person to also occupy the unit or any part of " +
          "it. For a money claim outside the Act, the Small Claims Court has jurisdiction in any action for the " +
          "payment of money where the amount claimed does not exceed $50,000, exclusive of interest and costs " +
          "(Courts of Justice Act, s. 23 (1); O. Reg. 626/00, s. 1 (1)).",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        alsoCites: [
          { sourceUrl: CJA, pinpoint: "Courts of Justice Act, s. 23 (1)" },
          { sourceUrl: SC_LIMIT, pinpoint: "O. Reg. 626/00, s. 1 (1)" },
        ],
        evidenceCategories: [
          {
            name: "What share was agreed",
            why: "Shows the amount each person was to pay.",
            examples: ["Roommate agreement", "Messages agreeing the split", "Past payments of the same amount"],
          },
          {
            name: "What was not paid",
            why: "Supports the amount claimed.",
            examples: ["Rent receipts paid by you", "Bank statements", "Messages asking for payment"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "subletter-set-off",
        name: "Money the subtenant or roommate says they are owed in return",
        plainExplanation:
          "Under s. 111 (1) of the Courts of Justice Act, in an action for payment of a debt, the defendant may, " +
          "by way of defence, claim the right to set off against the plaintiff's claim a debt owed by the " +
          "plaintiff to the defendant.",
        whenThisComesUp: "When the person who did not pay says they paid other costs, or are owed a deposit back.",
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
          "Where this belongs: for a true sublet, s. 99 of the Residential Tenancies Act, 2006 applies the " +
          "Board application provisions for rent arrears (s. 87) and damage (s. 89) to the tenant as if the " +
          "tenant were the landlord, and under s. 168 (2) the Landlord and Tenant Board has exclusive " +
          "jurisdiction to determine all applications under the Act. A roommate's share where there was no " +
          "sublet and no landlord under the Act is a money claim in the Small Claims Court (Courts of Justice " +
          "Act, s. 23 (1)).",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
        alsoCites: [{ sourceUrl: CJA, pinpoint: "Courts of Justice Act, s. 23 (1)" }],
      },
      {
        note:
          "If a subtenant stays after the subtenancy ends: under s. 97 (5) of the Residential Tenancies Act, " +
          "2006, a subtenant has no right to occupy the unit after the end of the subtenancy. Under s. 101, the " +
          "landlord or the tenant may apply to the Board for an order evicting the subtenant, within 60 days " +
          "after the end of the subtenancy, and under s. 102 the tenant may apply for compensation for use and " +
          "occupation if the subtenant is in possession at the time of the application.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
      },
    ],
    signals: [
      "subletter stopped paying rent",
      "sublet my apartment and they did not pay",
      "subtenant owes me rent",
      "person I sublet to owes me",
      "roommate stopped paying their share of the rent",
      "roommate owes me their half of the rent",
      "subletter would not leave",
    ],
    citations: [
      { sourceName: "Residential Tenancies Act, 2006", officialUrl: RTA, verifiedAt: V, pinpoint: "ss. 2 (1) \"landlord\", 2 (2), 97, 99, 101, 102, 168 (2)" },
      { sourceName: "Courts of Justice Act", officialUrl: CJA, verifiedAt: V, pinpoint: "ss. 23 (1), 111" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------
  {
    id: "sc-claim-condo-owner-against-corporation",
    name: "A condo owner against the condo corporation",
    courtArea: "small-claims",
    broughtBy: "A condominium unit owner who says the condo corporation did not do what the Condominium Act, 1998 or its declaration requires, and lost money because of it. Not the corporation collecting unpaid common expenses.",
    typicalDefendantProfile: "business",
    plaintiffElements: [
      {
        id: "corporation-duty-under-the-act",
        name: "The corporation had a duty under the Act or the declaration",
        plainExplanation:
          "Under s. 17 (2) of the Condominium Act, 1998, the corporation has a duty to control, manage and " +
          "administer the common elements and its assets. Under s. 90 (1), subject to s. 91, the corporation " +
          "shall maintain the common elements and each owner shall maintain the owner's unit. Under s. 89 (1), " +
          "subject to ss. 91 and 123, the corporation shall repair the units and common elements after damage. " +
          "Section 91 lets the declaration change who maintains and repairs what, so the declaration has to be " +
          "read too.",
        sourceUrl: CONDO,
        verifiedAt: V,
        consolidationPeriod: CONDO_FROM,
        evidenceCategories: [
          {
            name: "The condo's governing documents",
            why: "Shows who is responsible for maintaining and repairing what.",
            examples: ["Declaration", "By-laws, including any standard unit by-law", "Rules"],
          },
          {
            name: "Requests to the corporation",
            why: "Shows the corporation was told about the problem.",
            examples: ["Emails to property management", "Service requests", "Board meeting minutes"],
          },
        ],
      },
      {
        id: "loss-from-failure-to-perform-duty",
        name: "The owner lost money because the duty was not performed",
        plainExplanation:
          "Section 136 of the Condominium Act, 1998 says that unless the Act specifically provides the " +
          "contrary, nothing in it restricts the remedies otherwise available to a person for the failure of " +
          "another to perform a duty imposed by the Act. A claim for payment of money up to $50,000, exclusive " +
          "of interest and costs, is within the Small Claims Court's jurisdiction (Courts of Justice Act, s. 23 " +
          "(1); O. Reg. 626/00, s. 1 (1)). What has to be shown is the loss and how it came from the failure.",
        sourceUrl: CONDO,
        verifiedAt: V,
        consolidationPeriod: CONDO_FROM,
        alsoCites: [
          { sourceUrl: CJA, pinpoint: "Courts of Justice Act, s. 23 (1)" },
          { sourceUrl: SC_LIMIT, pinpoint: "O. Reg. 626/00, s. 1 (1)" },
        ],
        evidenceCategories: [
          {
            name: "The loss",
            why: "Supports the amount claimed.",
            examples: ["Repair invoices you paid", "Insurance deductible paid", "Photos of the damage"],
          },
          {
            name: "Timeline",
            why: "Shows when the problem started and when it was reported.",
            examples: ["Dated photos", "Emails with dates", "Notes of calls"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "declaration-or-improvement-shifts-the-duty",
        name: "The declaration moved the duty, or the item is an improvement",
        plainExplanation:
          "Under s. 91 of the Condominium Act, 1998, the declaration may alter the obligation to maintain or to " +
          "repair after damage -- for example, by providing that each owner shall repair the owner's unit after " +
          "damage. Under s. 89 (2), the corporation's obligation to repair after damage does not include " +
          "repairing improvements made to a unit, and under s. 89 (3) what is an improvement is measured " +
          "against a standard unit for that class of unit.",
        whenThisComesUp: "When the corporation says the declaration makes the owner responsible, or that the damaged item was an upgrade.",
        sourceUrl: CONDO,
        verifiedAt: V,
        consolidationPeriod: CONDO_FROM,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Where this belongs: some condo disputes go to the Condominium Authority Tribunal. Under s. 1.36 (2) " +
          "of the Condominium Act, 1998, an owner may apply to the Tribunal for the resolution of a prescribed " +
          "dispute with the corporation. O. Reg. 179/17, s. 1 (1) prescribes them: disputes about records " +
          "under s. 55; about unreasonable noise and other nuisance under s. 117 (2); and about declaration, " +
          "by-law or rule provisions on pets and animals, vehicles, parking and storage, and nuisance, " +
          "annoyance or disruption. Under s. 1.42 (1), the Tribunal has exclusive jurisdiction to exercise the " +
          "powers conferred on it under the Act. An application must be made within two years after the " +
          "dispute arose (s. 1.36 (6)).",
        sourceUrl: CONDO,
        verifiedAt: V,
        consolidationPeriod: CONDO_FROM,
        alsoCites: [{ sourceUrl: CAT_REG, pinpoint: "O. Reg. 179/17, s. 1 (1)" }],
      },
      {
        note:
          "Some condo orders come only from the Superior Court of Justice. Under s. 134 (1) of the Condominium " +
          "Act, 1998, an owner may apply to the Superior Court of Justice for an order enforcing compliance with " +
          "the Act, the declaration, the by-laws or the rules; under s. 134 (2), if the mediation and " +
          "arbitration processes in s. 132 are required, that must be tried first. Under s. 135, an owner may " +
          "apply to the Superior Court of Justice where conduct is oppressive or unfairly prejudicial, and under " +
          "s. 135 (3) (b) the orders include an order requiring the payment of compensation.",
        sourceUrl: CONDO,
        verifiedAt: V,
        consolidationPeriod: CONDO_FROM,
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
      "condo corporation will not fix",
      "condo board refused to repair",
      "property management ignored the leak",
      "condo corporation owes me",
      "suing my condo corporation",
      "common elements were not maintained",
      "condo board will not give me the records",
    ],
    citations: [
      { sourceName: "Condominium Act, 1998", officialUrl: CONDO, verifiedAt: V, pinpoint: "ss. 1.36, 1.42, 17, 89-91, 134-136" },
      { sourceName: "O. Reg. 179/17 (Condominium Authority Tribunal)", officialUrl: CAT_REG, verifiedAt: V, pinpoint: "s. 1 (1)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------
  {
    id: "sc-claim-condo-water-or-noise-damage",
    name: "Water or noise damage between condo units",
    courtArea: "small-claims",
    broughtBy: "A condo owner or occupant whose unit was damaged by water from another unit, or who is disturbed by noise from another unit.",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "condition-likely-to-damage-property",
        name: "Someone caused a condition likely to damage property",
        plainExplanation:
          "Under s. 117 (1) of the Condominium Act, 1998, no person shall, through an act or omission, cause a " +
          "condition to exist or an activity to take place in a unit, the common elements or the corporation's " +
          "assets if it is likely to damage the property or the assets or to cause an injury or illness. Under " +
          "s. 119 (1) owners and occupiers shall comply with the Act, and under s. 119 (2) an owner shall take " +
          "all reasonable steps to ensure that an occupier of the owner's unit complies. What has to be shown " +
          "is where the water came from and what caused it.",
        sourceUrl: CONDO,
        verifiedAt: V,
        consolidationPeriod: CONDO_FROM,
        evidenceCategories: [
          {
            name: "Where the water came from",
            why: "Connects the damage to the other unit.",
            examples: ["Plumber's or property manager's report", "Photos of the source", "Incident report from the building"],
          },
          {
            name: "The damage",
            why: "Shows what was damaged.",
            examples: ["Dated photos and video", "Restoration company report"],
          },
        ],
      },
      {
        id: "negligence-elements-water-damage",
        name: "Duty, breach, damage and cause",
        plainExplanation:
          "In Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, para. 3, the Supreme Court of Canada said a " +
          "successful action in negligence requires the plaintiff to show that the defendant owed them a duty " +
          "of care, that the defendant's behaviour breached the standard of care, that the plaintiff sustained " +
          "damage, and that the damage was caused, in fact and in law, by the defendant's breach. Section 136 " +
          "of the Condominium Act, 1998 says that, unless the Act specifically provides the contrary, nothing " +
          "in it restricts the remedies otherwise available for the failure of another to perform a duty " +
          "imposed by the Act.",
        sourceUrl: MUSTAPHA,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: CONDO, pinpoint: "Condominium Act, 1998, s. 136" }],
        evidenceCategories: [
          {
            name: "What the other owner or occupant did or did not do",
            why: "Shows the act or omission behind the damage.",
            examples: ["Messages about the leak", "Records of earlier leaks or warnings", "Notes from the building's staff"],
          },
          {
            name: "Your costs",
            why: "Supports the amount claimed.",
            examples: ["Repair invoices", "Insurance deductible", "Receipts for replacing belongings"],
          },
        ],
      },
      {
        id: "unreasonable-noise-nuisance",
        name: "Unreasonable noise that is a nuisance",
        plainExplanation:
          "Under s. 117 (2) (a) of the Condominium Act, 1998, no person shall carry on or permit an activity in " +
          "a unit, the common elements or the corporation's assets if it results in the creation or " +
          "continuation of any unreasonable noise that is a nuisance, annoyance or disruption to an individual " +
          "in a unit, the common elements or the assets. What has to be shown is the noise, how often, and how " +
          "it affected you.",
        sourceUrl: CONDO,
        verifiedAt: V,
        consolidationPeriod: CONDO_FROM,
        evidenceCategories: [
          {
            name: "A record of the noise",
            why: "Shows when it happens and for how long.",
            examples: ["Noise log with dates and times", "Audio or video recordings", "Sound meter readings"],
          },
          {
            name: "Complaints made",
            why: "Shows the corporation and the other unit were told.",
            examples: ["Emails to property management", "Security incident reports", "Letters from the corporation"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "corporation-repairs-and-deductible",
        name: "The corporation's duty to repair, and the insurance deductible",
        plainExplanation:
          "Under s. 89 (1) of the Condominium Act, 1998, subject to ss. 91 and 123, the corporation shall repair " +
          "the units and common elements after damage. Under s. 105 (2), if an owner, a lessee of an owner or a " +
          "person living in the owner's unit with permission, through an act or omission causes damage to the " +
          "owner's unit, the lesser of the repair cost and the deductible of the corporation's insurance policy " +
          "is added to the common expenses for that owner's unit; s. 105 (3) lets the corporation pass a by-law " +
          "extending this.",
        whenThisComesUp: "When the other owner says the corporation or its insurer is responsible for the repair, or a deductible has already been charged back.",
        sourceUrl: CONDO,
        verifiedAt: V,
        consolidationPeriod: CONDO_FROM,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Where this belongs -- noise: under s. 1.36 (2) of the Condominium Act, 1998, an owner may apply to the " +
          "Condominium Authority Tribunal for the resolution of a prescribed dispute with the corporation, " +
          "another owner or an occupier. O. Reg. 179/17, s. 1 (1) (c.1) prescribes disputes about s. 117 (2), " +
          "which covers unreasonable noise. Under s. 1.44 (1) para. 3, the Tribunal may order compensation for " +
          "damages up to the greater of $25,000 or a prescribed amount. An application must be made within two " +
          "years after the dispute arose (s. 1.36 (6)).",
        sourceUrl: CONDO,
        verifiedAt: V,
        consolidationPeriod: CONDO_FROM,
        alsoCites: [{ sourceUrl: CAT_REG, pinpoint: "O. Reg. 179/17, s. 1 (1) (c.1)" }],
      },
      {
        note:
          "Where this belongs -- water and other property damage: under s. 1.36 (4) (a) of the Condominium Act, " +
          "1998, an application may not be made to the Condominium Authority Tribunal with respect to a dispute " +
          "under s. 117 (1) (a condition likely to damage property or cause injury), and O. Reg. 179/17, s. 1 " +
          "(3) says the noise and nuisance categories do not apply to a dispute that is also about s. 117 (1). " +
          "A money claim for the damage up to $50,000 is within the Small Claims Court's jurisdiction (Courts of " +
          "Justice Act, s. 23 (1); O. Reg. 626/00, s. 1 (1)).",
        sourceUrl: CONDO,
        verifiedAt: V,
        consolidationPeriod: CONDO_FROM,
        alsoCites: [
          { sourceUrl: CAT_REG, pinpoint: "O. Reg. 179/17, s. 1 (3)" },
          { sourceUrl: CJA, pinpoint: "Courts of Justice Act, s. 23 (1)" },
          { sourceUrl: SC_LIMIT, pinpoint: "O. Reg. 626/00, s. 1 (1)" },
        ],
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
      "water leaked from the unit above",
      "upstairs condo flooded my unit",
      "neighbour's washing machine leaked into my condo",
      "leak from the unit upstairs",
      "noise from the condo above",
      "condo neighbour is too loud",
      "water came through my ceiling from upstairs",
      "unit above overflowed",
    ],
    citations: [
      { sourceName: "Condominium Act, 1998", officialUrl: CONDO, verifiedAt: V, pinpoint: "ss. 1.36, 1.44, 89, 105, 117, 119, 136" },
      { sourceName: "O. Reg. 179/17 (Condominium Authority Tribunal)", officialUrl: CAT_REG, verifiedAt: V, pinpoint: "s. 1 (1) (c.1), s. 1 (3)" },
      { sourceName: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27", officialUrl: MUSTAPHA, verifiedAt: V, pinpoint: "para. 3" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------
  {
    id: "sc-claim-co-owner-dispute",
    name: "A dispute between co-owners",
    courtArea: "small-claims",
    broughtBy: "A person who owns a property together with someone else and says the other co-owner owes them money for the property.",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "what-was-agreed-between-co-owners",
        name: "What the co-owners agreed about paying for the property",
        plainExplanation:
          "The Superior Court of Justice's guide to the steps in a civil case says that in every civil case " +
          "the plaintiff has the burden of proof to establish, on a balance of probabilities, the allegations " +
          "in their claim. This part is about what the co-owners agreed about sharing costs such as the " +
          "mortgage, taxes and repairs, and the records that show it.",
        sourceUrl: STEPS,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "The ownership and any agreement",
            why: "Shows who owns what share and what was agreed about costs.",
            examples: ["Deed or transfer", "Co-ownership agreement", "Messages agreeing to split costs"],
          },
          {
            name: "Who paid what",
            why: "Shows the payments each co-owner made.",
            examples: ["Mortgage statements", "Property tax bills and receipts", "Repair invoices and proof of payment"],
          },
        ],
      },
      {
        id: "co-owner-amount-within-limit",
        name: "The amount claimed is money, within the Small Claims limit",
        plainExplanation:
          "Under s. 23 (1) (a) of the Courts of Justice Act, the Small Claims Court has jurisdiction in any " +
          "action for the payment of money where the amount claimed does not exceed the prescribed amount " +
          "exclusive of interest and costs, which is $50,000 (O. Reg. 626/00, s. 1 (1)). Section 23 (1) also " +
          "covers the recovery of personal property; a partition or sale of land is under the Partition Act " +
          "(see the notes).",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: CJA_FROM,
        alsoCites: [{ sourceUrl: SC_LIMIT, pinpoint: "O. Reg. 626/00, s. 1 (1)" }],
        evidenceCategories: [
          {
            name: "How the amount is calculated",
            why: "Supports the specific dollar amount claimed.",
            examples: ["A table of payments by each owner", "Bank statements", "Receipts"],
          },
          {
            name: "Requests for payment",
            why: "Shows the amount was asked for.",
            examples: ["Emails or texts asking for the share", "Demand letter"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "co-owner-set-off",
        name: "Money the other co-owner says they are owed in return",
        plainExplanation:
          "Under s. 111 (1) of the Courts of Justice Act, in an action for payment of a debt, the defendant may, " +
          "by way of defence, claim the right to set off against the plaintiff's claim a debt owed by the " +
          "plaintiff to the defendant. Under s. 111 (3), if a larger sum is found to be due from the plaintiff " +
          "to the defendant, the defendant is entitled to judgment for the balance.",
        whenThisComesUp: "When the other co-owner says they paid more of the mortgage, taxes or repairs at another time.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: CJA_FROM,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs", "sc-remedy-outside-jurisdiction"],
    proceduralNotes: [
      {
        note:
          "Where this belongs -- dividing or selling the property: under s. 3 (1) of the Partition Act, any " +
          "person interested in land in Ontario may bring an action or make an application for the partition " +
          "of the land or for its sale under the directions of the court, and s. 2 says joint tenants and " +
          "tenants in common may be compelled to make or suffer partition or sale. Section 1 defines \"court\" " +
          "as the Superior Court of Justice. Under s. 3 (2), where the land is co-owned because of a will or an " +
          "intestacy, no proceeding shall be taken until one year after the death.",
        sourceUrl: PARTITION,
        verifiedAt: V,
        consolidationPeriod: PARTITION_FROM,
      },
      {
        note:
          "Not the Landlord and Tenant Board: in s. 2 (1) of the Residential Tenancies Act, 2006, \"tenant\" " +
          "does not include a person who has the right to occupy a rental unit by virtue of being a co-owner of " +
          "the residential complex in which the unit is located.",
        sourceUrl: RTA,
        verifiedAt: V,
        consolidationPeriod: RTA_FROM,
      },
      {
        note:
          "Time limit for a money claim: under s. 4 of the Limitations Act, 2002, unless the Act provides " +
          "otherwise, a proceeding shall not be commenced in respect of a claim after the second anniversary of " +
          "the day on which the claim was discovered.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_FROM,
      },
    ],
    signals: [
      "co-owner will not pay their share of the mortgage",
      "we own the house together",
      "jointly owned property",
      "co-owner owes me for the property taxes",
      "my co-owner stopped paying",
      "force the sale of the house we own together",
      "tenants in common",
    ],
    citations: [
      { sourceName: "Partition Act", officialUrl: PARTITION, verifiedAt: V, pinpoint: "ss. 1-3" },
      { sourceName: "Courts of Justice Act", officialUrl: CJA, verifiedAt: V, pinpoint: "ss. 23 (1), 111" },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
