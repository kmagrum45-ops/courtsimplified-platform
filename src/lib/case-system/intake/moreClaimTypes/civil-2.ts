/**
 * Case types, batch "civil-2" (civil): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/civil-2.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   civil-claim-mortgage-enforcement -- A lender enforcing a mortgage (power of sale)
 *   civil-claim-partition-or-sale-of-property -- Co-owners who cannot agree: partition or sale of property
 *   civil-claim-adverse-possession-or-boundary -- A boundary or land dispute
 *   civil-claim-estate-dispute-will-challenge -- Challenging a will or how an estate is handled
 *   civil-claim-dependant-support-from-estate -- Support from the estate of someone who supported you
 *   civil-claim-power-of-attorney-accounting -- An attorney or guardian who must account for money they managed
 *   civil-claim-fraudulent-conveyance -- A debtor moved property to avoid paying
 *   civil-claim-oppression-shareholder -- A company's owners or managers treating a shareholder unfairly
 *   civil-claim-employment-human-rights-damages -- Discrimination at work (court claim with another cause of action)
 *   civil-claim-enforcing-a-judgment -- Collecting on a Superior Court judgment
 *
 * Every entry rests on a statute or regulation vendored under
 * docs/sources/corpus/, except one that also cites Machtinger v. HOJ
 * Industries (saved under docs/sources/decisions/, with a public SCC page).
 *
 * LEFT OUT ON PURPOSE, because nothing saved here states it:
 *   - the common-law test for adverse possession (what kind of possession is
 *     needed). The entry says only what the Real Property Limitations Act and
 *     the Land Titles Act say.
 *   - the tests for testamentary capacity, knowledge and approval, undue
 *     influence and suspicious circumstances. Vout v. Hay is saved as text but
 *     has no verified public page (verifySourceLinks), so it is not cited.
 *   - BCE Inc. v. 1976 Debentureholders on the oppression remedy, for the same
 *     reason. The oppression entry rests on the Business Corporations Act only.
 */

import type { ClaimType } from "../claimTypes";

const V = "2026-10-07";

const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const OREG_626 = "https://www.ontario.ca/laws/docs/000626_e.doc";
const RCP = "https://www.ontario.ca/laws/docs/900194_e.doc";
const MORTGAGES_ACT = "https://www.ontario.ca/laws/docs/90m40_e.doc";
const RPLA = "https://www.ontario.ca/laws/docs/90l15_e.doc";
const LAND_TITLES = "https://www.ontario.ca/laws/docs/90l05_e.doc";
const PARTITION_ACT = "https://www.ontario.ca/laws/docs/90p04_e.doc";
const FLA = "https://www.ontario.ca/laws/docs/90f03_e.doc";
const SLRA = "https://www.ontario.ca/laws/docs/90s26_e.doc";
const ESTATES_ACT = "https://www.ontario.ca/laws/docs/90e21_e.doc";
const TRUSTEE_ACT = "https://www.ontario.ca/laws/docs/90t23_e.doc";
const SDA = "https://www.ontario.ca/laws/docs/92s30_e.doc";
const FCA = "https://www.ontario.ca/laws/docs/elaws_statutes_90f29_e.doc";
const OBCA = "https://www.ontario.ca/laws/docs/90b16_e.doc";
const HRC = "https://www.ontario.ca/laws/docs/90h19_e.doc";

const MACHTINGER = "docs/sources/decisions/machtinger-v-hoj-industries-1992-1-SCR-986.html.txt";

/** Consolidation start dates of the vendored e-Laws files (manifest.json). */
const C_LIMITATIONS = "2024-12-04";
const C_CJA = "2025-12-11";
const C_RCP = "2026-09-01";
const C_MORTGAGES = "2022-01-01";
const C_RPLA = "2009-12-15";
const C_LAND_TITLES = "2026-08-17";
const C_PARTITION = "2009-12-15";
const C_FLA = "2026-05-01";
const C_SLRA = "2025-12-11";
const C_ESTATES = "2021-04-01";
const C_SDA = "2024-04-01";
const C_FCA = "1990-12-31";
const C_OBCA = "2025-10-01";
const C_HRC = "2025-07-01";

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

/** Proceedings that a statute allows to be started by application. */
const APPLICATION_UNDER_STATUTE =
  "Under rule 14.05(2) of the Rules of Civil Procedure, a proceeding may be started by an " +
  "application to the Superior Court of Justice or to a judge of that court, if a statute so " +
  "authorizes.";

const TIMELINE = {
  name: "A dated timeline",
  why: "Shows the order of events: what happened, then what followed.",
  examples: [
    "A written timeline with dates",
    "Messages, emails or letters made at or near the time",
    "Notes of conversations, with their dates",
  ],
};

const LAND_RECORDS = {
  name: "Records of the land and who is on title",
  why: "Shows what the property is and who holds an interest in it.",
  examples: [
    "The deed, transfer or parcel register for the property",
    "A survey or reference plan",
    "Property tax bills",
  ],
};

export const TYPES_CIVIL_2: ClaimType[] = [
  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-mortgage-enforcement",
    name: "A lender enforcing a mortgage (power of sale)",
    courtArea: "civil",
    broughtBy:
      "A lender (the mortgagee) that wants to sell a property after the borrower fell behind -- or the " +
      "borrower or owner (the mortgagor) who has received a notice of sale and wants to know the rules.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "default-and-timing-civmort",
        name: "There was a default, and the waiting periods were respected",
        plainExplanation:
          "Under s. 32 of the Mortgages Act, where a mortgage by its terms gives a power of sale on a " +
          "certain default, notice of exercising the power of sale cannot be given until the default " +
          "has continued for at least fifteen days, and the sale cannot be made for at least " +
          "thirty-five days after the notice has been given. Where the mortgage itself has no power of " +
          "sale, s. 24 gives the lender a power of sale at any time after three months from a default in " +
          "paying money due under the mortgage; under s. 26, no sale under that power can be made until " +
          "after forty-five days' written notice, which may be given any time after fifteen days' " +
          "default in a payment. Under s. 38, despite any agreement to the contrary, ss. 31 to 36 apply " +
          "to any power of sale in a mortgage.",
        sourceUrl: MORTGAGES_ACT,
        verifiedAt: V,
        consolidationPeriod: C_MORTGAGES,
        evidenceCategories: [
          {
            name: "The mortgage and its terms",
            why: "Shows whether the mortgage has its own power of sale and what counts as a default.",
            examples: [
              "The registered mortgage (charge) and its standard charge terms",
              "Any renewal or amending agreement",
            ],
          },
          {
            name: "The payment record",
            why: "Shows when the default started and how long it continued.",
            examples: [
              "Mortgage statements",
              "Bank records of payments made or missed",
              "Letters from the lender about missed payments",
            ],
          },
          TIMELINE,
        ],
      },
      {
        id: "notice-of-sale-civmort",
        name: "The notice of sale was given to the right people, in the right way",
        plainExplanation:
          "Under s. 31(1) of the Mortgages Act, a lender cannot exercise a power of sale unless a notice " +
          "of exercising the power of sale, in the form prescribed by the regulations, has been given " +
          "to the persons the section lists -- for land under the Land Titles Act, to every person " +
          "appearing by the parcel register and by the index of executions to have an interest in the " +
          "property, and to anyone else whose interest the lender has actual notice of in writing before " +
          "the notice is given. Under s. 33(1), the notice must be given by personal service or by " +
          "registered mail to the person's usual or last known address (or the other addresses the " +
          "section allows), or by leaving it at one of those addresses -- or by personal service only, " +
          "where the mortgage says so.",
        sourceUrl: MORTGAGES_ACT,
        verifiedAt: V,
        consolidationPeriod: C_MORTGAGES,
        evidenceCategories: [
          {
            name: "The notice of sale itself",
            why: "Shows its date, who it was sent to and what it said.",
            examples: [
              "The notice of sale under mortgage",
              "Registered mail receipts or a process server's affidavit of service",
            ],
          },
          {
            name: "Who had an interest in the property",
            why: "Shows who had to receive the notice.",
            examples: [
              "The parcel register for the property",
              "Any execution or lien registered against the owner",
              "Letters telling the lender about another person's interest",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "pay-arrears-relief-civmort",
        name: "Paying what is in default before the sale",
        plainExplanation:
          "Under s. 22(1) of the Mortgages Act, despite any agreement to the contrary, where the whole " +
          "amount of a mortgage has become due because of a default, the borrower may -- at any time " +
          "before sale under the mortgage, or before an action to enforce it is started -- perform the " +
          "covenant or pay the amount due, not counting money that is not payable merely because time " +
          "has passed, plus any expenses the lender necessarily incurred, and is then relieved from the " +
          "consequences of the default. Under s. 22(2) and (3), the borrower may ask in writing for a " +
          "statement of the amount in default and the expenses; the lender must answer within fifteen " +
          "days, and if, without reasonable excuse, it fails to, or the answer is incomplete or " +
          "incorrect, its rights to enforce the mortgage are suspended until it complies. Under s. " +
          "43(1), where a demand or notice requires payment of all money secured by the mortgage, the " +
          "person who made it is bound to accept payment made as the demand or notice requires.",
        whenThisComesUp:
          "When the borrower has received a notice of sale and wants to bring the mortgage back into good " +
          "standing, or does not know exactly how much is owed.",
        sourceUrl: MORTGAGES_ACT,
        verifiedAt: V,
        consolidationPeriod: C_MORTGAGES,
      },
      {
        id: "relief-after-action-civmort",
        name: "Paying after the lender has started a court action",
        plainExplanation:
          "Under s. 23(1) of the Mortgages Act, in an action to enforce a mortgage, the borrower may, on " +
          "paying $100 into court as security for costs, apply to the court. On condition that the " +
          "borrower performs the covenant or pays the money due under the mortgage (not counting money " +
          "not payable merely because time has passed) and the costs of the action, the court shall " +
          "dismiss the action if judgment has not been recovered, or may stay the action if judgment has " +
          "been recovered and no sale, recovery of possession or final foreclosure has taken place. " +
          "Under s. 23(3), if the action is stayed and default happens again, the court may remove the " +
          "stay on application.",
        whenThisComesUp:
          "When the lender has already sued -- for example for possession or on the mortgage -- and the " +
          "borrower can now pay what is in default.",
        sourceUrl: MORTGAGES_ACT,
        verifiedAt: V,
        consolidationPeriod: C_MORTGAGES,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "No other court step while the notice runs. Under s. 42(1) of the Mortgages Act, once a demand " +
          "or notice has been given under the mortgage requiring payment, or declaring an intention to " +
          "exercise the power of sale, no further proceeding and no action to enforce the mortgage can " +
          "be started or taken until the time stated in the demand or notice has passed, unless a judge " +
          "of the Superior Court of Justice makes an order permitting it. Under s. 42(3), this does not " +
          "apply to proceedings to stay waste or other injury to the property.",
        sourceUrl: MORTGAGES_ACT,
        verifiedAt: V,
        consolidationPeriod: C_MORTGAGES,
      },
      {
        note:
          "Time limits. Under s. 43(1) of the Real Property Limitations Act, no action on a covenant in " +
          "a mortgage to repay money secured by it can be started after the later of 10 years after the " +
          "day the cause of action arose and 10 years after the day the interest of the person liable on " +
          "the covenant in the mortgaged land was conveyed or transferred. Under s. 4, an action to " +
          "recover land must be brought within ten years after the right to bring it first accrued.",
        sourceUrl: RPLA,
        verifiedAt: V,
        consolidationPeriod: C_RPLA,
      },
    ],
    signals: [
      "notice of power of sale",
      "the bank is selling my house",
      "behind on my mortgage payments",
      "mortgage default",
      "lender wants to sell the property",
      "private lender power of sale",
      "my mortgage went into arrears",
      "notice of sale under mortgage",
    ],
    citations: [
      { sourceName: "Mortgages Act, R.S.O. 1990, c. M.40", officialUrl: MORTGAGES_ACT, verifiedAt: V, pinpoint: "ss. 22(1)-(3), 23(1), (3), 24, 26, 31(1), 32, 33(1), 38, 42(1), (3), 43(1)" },
      { sourceName: "Real Property Limitations Act, R.S.O. 1990, c. L.15", officialUrl: RPLA, verifiedAt: V, pinpoint: "ss. 4, 43(1)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-partition-or-sale-of-property",
    name: "Co-owners who cannot agree: partition or sale of property",
    courtArea: "civil",
    broughtBy:
      "A person who owns land together with others -- a sibling, former partner, friend or investor -- " +
      "and wants the land divided or sold because the owners cannot agree.",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "interest-in-land-civpart",
        name: "The person applying has an interest in the land",
        plainExplanation:
          "Under s. 3(1) of the Partition Act, any person interested in land in Ontario, or the guardian " +
          "of a minor entitled to the immediate possession of an estate in it, may bring an action or " +
          "make an application for the partition of the land, or for its sale under the directions of " +
          "the court. Under s. 2, all joint tenants, tenants in common, mortgagees or other creditors " +
          "having liens on the land, and all parties interested in it, may be compelled to make or " +
          "suffer partition or sale of the land, whether the estate is legal and equitable or equitable " +
          "only. Under s. 1, \"court\" means the Superior Court of Justice.",
        sourceUrl: PARTITION_ACT,
        verifiedAt: V,
        consolidationPeriod: C_PARTITION,
        evidenceCategories: [
          LAND_RECORDS,
          {
            name: "How the co-ownership came about",
            why: "Shows each owner's share and how they came to hold it.",
            examples: [
              "The purchase agreement and closing documents",
              "A will or estate documents, if the land was inherited",
              "Any co-ownership agreement between the owners",
            ],
          },
        ],
      },
      {
        id: "partition-or-sale-civpart",
        name: "What is asked for: dividing the land, or selling it",
        plainExplanation:
          "Under s. 3(1) of the Partition Act, the court may order partition of the land, or its sale " +
          "under the directions of the court if a sale is considered by the court to be more " +
          "advantageous to the parties interested. Under s. 6, a partition or sale made by the court is " +
          "as effectual for a party who is a minor or is incapable as for a party who is competent to " +
          "act.",
        sourceUrl: PARTITION_ACT,
        verifiedAt: V,
        consolidationPeriod: C_PARTITION,
        evidenceCategories: [
          {
            name: "Whether the land can be divided",
            why: "Speaks to whether dividing the land or selling it is more practical.",
            examples: [
              "A survey or plan of the property",
              "Information about zoning or whether the lot can be split",
            ],
          },
          {
            name: "The property's value and costs",
            why: "Shows what each owner has put in and what a sale could bring.",
            examples: [
              "An appraisal or agent's market opinion",
              "Records of mortgage, tax, insurance and repair payments by each owner",
            ],
          },
          TIMELINE,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "inherited-land-wait-civpart",
        name: "Land inherited together: the one-year wait",
        plainExplanation:
          "Under s. 3(2) of the Partition Act, where the land is held in joint tenancy, tenancy in common " +
          "or coparcenary because of a will (a devise) or an intestacy, no proceeding can be taken until " +
          "one year after the death of the person in whom the land was vested.",
        whenThisComesUp: "When the co-owners received the land from someone who died less than a year ago.",
        sourceUrl: PARTITION_ACT,
        verifiedAt: V,
        consolidationPeriod: C_PARTITION,
      },
      {
        id: "missing-co-owner-civpart",
        name: "A co-owner who cannot be found",
        plainExplanation:
          "Under s. 4(1) of the Partition Act, where a person interested in the land has not been heard " +
          "of for three years or more and it is uncertain whether they are living or dead, the court, on " +
          "the application of anyone interested in the land, may appoint a guardian to take charge of " +
          "that person's interest. Under s. 4(2), the guardian represents the absent person in the " +
          "proceeding.",
        whenThisComesUp: "When one of the owners has disappeared and cannot be served or consulted.",
        sourceUrl: PARTITION_ACT,
        verifiedAt: V,
        consolidationPeriod: C_PARTITION,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Which court and how to start. Under s. 1 of the Partition Act, the court is the Superior " +
          "Court of Justice, and under s. 3(1) a person may bring an action or make an application. " +
          APPLICATION_UNDER_STATUTE +
          " Under s. 7 of the Partition Act, an appeal from any order made under the Act goes to the " +
          "Divisional Court.",
        sourceUrl: PARTITION_ACT,
        verifiedAt: V,
        consolidationPeriod: C_PARTITION,
        alsoCites: [{ sourceUrl: RCP, pinpoint: "Rules of Civil Procedure, r. 14.05(2)" }],
      },
      {
        note:
          "Spouses and former spouses. Under s. 10(1) of the Family Law Act, a person may apply to the " +
          "court for the determination of a question between them and their spouse or former spouse " +
          "about the ownership or right to possession of particular property (other than a question " +
          "arising out of an equalization of net family properties), and the court may, among other " +
          "things, order that the property be partitioned or sold for the purpose of realizing the " +
          "interests in it.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: C_FLA,
      },
    ],
    signals: [
      "force the sale of a house we co-own",
      "my sibling won't agree to sell the property",
      "co-owner refuses to sell",
      "partition and sale",
      "we inherited a house together and can't agree",
      "jointly owned property dispute",
      "want my share of the house",
      "tenants in common disagreement",
    ],
    citations: [
      { sourceName: "Partition Act, R.S.O. 1990, c. P.4", officialUrl: PARTITION_ACT, verifiedAt: V, pinpoint: "ss. 1, 2, 3(1)-(2), 4(1)-(2), 6, 7" },
      { sourceName: "Rules of Civil Procedure, R.R.O. 1990, Reg. 194", officialUrl: RCP, verifiedAt: V, pinpoint: "r. 14.05(2)" },
      { sourceName: "Family Law Act, R.S.O. 1990, c. F.3", officialUrl: FLA, verifiedAt: V, pinpoint: "s. 10(1)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-adverse-possession-or-boundary",
    name: "A boundary or land dispute",
    courtArea: "civil",
    broughtBy:
      "A landowner in a dispute with a neighbour over where the boundary is, or over land one of them " +
      "has used or occupied for a long time.",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "ten-year-limit-civland",
        name: "When the right to recover land runs out: ten years",
        plainExplanation:
          "Under s. 4 of the Real Property Limitations Act, no person can make an entry or bring an " +
          "action to recover land except within ten years after the right to do so first accrued to them " +
          "or to someone through whom they claim. Under s. 5(1), where the person claiming the land (or " +
          "someone through whom they claim) was in possession and was dispossessed, or discontinued " +
          "possession, the right is deemed to have first accrued at the time of the dispossession or " +
          "discontinuance. Under s. 15, at the end of that period, the person's right and title to the " +
          "land is extinguished.",
        sourceUrl: RPLA,
        verifiedAt: V,
        consolidationPeriod: C_RPLA,
        evidenceCategories: [
          {
            name: "Who used the land, and since when",
            why: "The ten years are counted from the dispossession or discontinuance of possession.",
            examples: [
              "Dated photos, including old ones, of fences, sheds, gardens or driveways",
              "Aerial or satellite images from different years",
              "Statements from neighbours or past owners",
            ],
          },
          LAND_RECORDS,
          TIMELINE,
        ],
      },
      {
        id: "where-the-boundary-is-civland",
        name: "Where the boundary is",
        plainExplanation:
          "Under s. 140(2) of the Land Titles Act, the description of registered land is not conclusive " +
          "as to the boundaries or extent of the land. Under rule 14.05(3)(e) of the Rules of Civil " +
          "Procedure, a proceeding may be brought by application where the relief claimed is the " +
          "declaration of an interest in or charge on land, including the nature and extent of the " +
          "interest or the boundaries of the land.",
        sourceUrl: LAND_TITLES,
        verifiedAt: V,
        consolidationPeriod: C_LAND_TITLES,
        alsoCites: [{ sourceUrl: RCP, pinpoint: "Rules of Civil Procedure, r. 14.05(3)(e)" }],
        evidenceCategories: [
          {
            name: "Surveys and plans",
            why: "Shows where the lines are drawn on paper and on the ground.",
            examples: [
              "A survey by an Ontario land surveyor",
              "The registered plan or reference plan",
              "Survey markers or monuments found on site",
            ],
          },
          {
            name: "What is on the ground",
            why: "Shows fences, walls or structures near the line.",
            examples: ["Photos and measurements", "Records of when a fence or structure was built"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "land-titles-no-possession-civland",
        name: "Land in the Land Titles system: no title by possession",
        plainExplanation:
          "Under s. 51(1) of the Land Titles Act, despite the Real Property Limitations Act or any other " +
          "Act, no title to, and no right or interest in, land registered under the Land Titles Act that " +
          "is adverse to or in derogation of the registered owner's title can be acquired after that by " +
          "any length of possession or by prescription. Under s. 51(2), this does not prejudice, as " +
          "against a person registered as first owner with a possessory title only, an adverse claim of " +
          "a person who was in possession when that first owner was registered.",
        whenThisComesUp:
          "When someone says they own part of a neighbour's land because they have used it for years, and " +
          "the land is registered in the Land Titles system.",
        sourceUrl: LAND_TITLES,
        verifiedAt: V,
        consolidationPeriod: C_LAND_TITLES,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Telling others about the dispute. Under s. 103(1) of the Courts of Justice Act, starting a " +
          "proceeding in which an interest in land is in question is not notice of it to a person who is " +
          "not a party until a certificate of pending litigation is issued by the court and registered " +
          "in the proper land registry office.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: C_CJA,
      },
      {
        note:
          "Which time limit applies. Under s. 2(1)(a) of the Limitations Act, 2002, that Act does not " +
          "apply to proceedings to which the Real Property Limitations Act applies. Under s. 4 of the " +
          "Real Property Limitations Act, an action to recover land must be brought within ten years " +
          "after the right to bring it first accrued.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: C_LIMITATIONS,
        alsoCites: [{ sourceUrl: RPLA, pinpoint: "Real Property Limitations Act, s. 4" }],
      },
    ],
    signals: [
      "boundary dispute with my neighbour",
      "neighbour's fence is on my property",
      "property line disagreement",
      "neighbour claims part of my land",
      "adverse possession",
      "squatter's rights",
      "survey shows the fence is in the wrong place",
      "used the strip of land for years",
    ],
    citations: [
      { sourceName: "Real Property Limitations Act, R.S.O. 1990, c. L.15", officialUrl: RPLA, verifiedAt: V, pinpoint: "ss. 4, 5(1), 15" },
      { sourceName: "Land Titles Act, R.S.O. 1990, c. L.5", officialUrl: LAND_TITLES, verifiedAt: V, pinpoint: "ss. 51(1)-(2), 140(2)" },
      { sourceName: "Rules of Civil Procedure, R.R.O. 1990, Reg. 194", officialUrl: RCP, verifiedAt: V, pinpoint: "r. 14.05(3)(e)" },
      { sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43", officialUrl: CJA, verifiedAt: V, pinpoint: "s. 103(1)" },
      { sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B", officialUrl: LIMITATIONS, verifiedAt: V, pinpoint: "s. 2(1)(a)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-estate-dispute-will-challenge",
    name: "Challenging a will or how an estate is handled",
    courtArea: "civil",
    broughtBy:
      "A family member, beneficiary or other person with a financial interest in an estate who questions " +
      "the will, or how the executor (estate trustee) is handling the estate.",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "financial-interest-civwill",
        name: "The person has a financial interest in the estate",
        plainExplanation:
          "Under rule 75.03(1) of the Rules of Civil Procedure, at any time before a certificate of " +
          "appointment of estate trustee has been issued, any person who appears to have a financial " +
          "interest in the estate may give notice of an objection by filing a notice of objection " +
          "(Form 75.1) stating the nature of the interest and of the objection. Under rule 75.01, an " +
          "estate trustee or any person appearing to have a financial interest in an estate may apply " +
          "under rule 75.06 to have a testamentary instrument put forward as the last will proved in " +
          "such manner as the court directs.",
        sourceUrl: RCP,
        verifiedAt: V,
        consolidationPeriod: C_RCP,
        evidenceCategories: [
          {
            name: "Your connection to the estate",
            why: "Shows why you have a financial interest.",
            examples: [
              "The will, or earlier wills, naming you",
              "Records showing your family relationship to the person who died",
            ],
          },
          {
            name: "Estate court documents",
            why: "Shows whether a certificate of appointment has been applied for or issued.",
            examples: [
              "A notice of application for a certificate of appointment served on you",
              "The court file number and court location",
            ],
          },
        ],
      },
      {
        id: "will-formalities-civwill",
        name: "Whether the will was made with the required formalities",
        plainExplanation:
          "Under s. 3 of the Succession Law Reform Act, a will is valid only when it is in writing. Under " +
          "s. 4(2), subject to s. 4(3) and ss. 5 and 6, a will is not valid unless, at its end, it is " +
          "signed by the testator (or by someone else in their presence and by their direction), the " +
          "testator makes or acknowledges the signature in the presence of two or more attesting " +
          "witnesses present at the same time, and two or more of those witnesses sign the will in the " +
          "testator's presence. Under s. 6, a testator may make a valid will wholly by their own " +
          "handwriting and signature, without witnesses. Under s. 7(1), a will is valid as to the " +
          "position of the signature if it is placed at, after, under or beside the end of the will so " +
          "that it is apparent on the face of the will that the testator intended to give effect by the " +
          "signature to the writing signed as their will.",
        sourceUrl: SLRA,
        verifiedAt: V,
        consolidationPeriod: C_SLRA,
        evidenceCategories: [
          {
            name: "The will itself",
            why: "Shows how it was signed and witnessed.",
            examples: [
              "A copy of the will and any codicils",
              "Any earlier wills",
              "The affidavit of execution sworn by a witness, if there is one",
            ],
          },
          {
            name: "How the will was made",
            why: "Shows who was present when it was signed.",
            examples: [
              "Names of the witnesses",
              "The lawyer's or drafter's file, if a lawyer prepared it",
            ],
          },
        ],
      },
      {
        id: "estate-trustee-conduct-civwill",
        name: "How the estate trustee is handling the estate",
        plainExplanation:
          "Under rule 74.15(1) of the Rules of Civil Procedure, any person who appears to have a " +
          "financial interest in an estate may move for orders including an order requiring an estate " +
          "trustee to file a statement of the nature and value, at the date of death, of each of the " +
          "assets of the estate (clause (d)), and an order requiring an estate trustee to pass accounts " +
          "(clause (h)). Under s. 37(1) of the Trustee Act, the Superior Court of Justice may remove a " +
          "personal representative on any ground on which it may remove any other trustee, and appoint " +
          "another person to act; under s. 37(3), the order may be made on the application of any person " +
          "interested in the estate, among others.",
        sourceUrl: RCP,
        verifiedAt: V,
        consolidationPeriod: C_RCP,
        alsoCites: [{ sourceUrl: TRUSTEE_ACT, pinpoint: "Trustee Act, s. 37(1), (3)" }],
        evidenceCategories: [
          {
            name: "What you know about the estate's assets",
            why: "Shows what should be accounted for.",
            examples: [
              "Bank, investment or property records of the person who died",
              "Any inventory or statement the estate trustee has given",
            ],
          },
          {
            name: "Communications with the estate trustee",
            why: "Shows what was asked for and what was or was not provided.",
            examples: ["Letters or emails asking for information or accounts", "The replies, or the lack of them"],
          },
          TIMELINE,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "court-ordered-validity-civwill",
        name: "A document not properly signed may still be given effect",
        plainExplanation:
          "Under s. 21.1(1) of the Succession Law Reform Act, if the Superior Court of Justice is " +
          "satisfied that a document or writing that was not properly executed or made under the Act " +
          "sets out the testamentary intentions of a deceased, the court may, on application, order that " +
          "the document is as valid and fully effective as the will of the deceased as if it had been " +
          "properly executed. Under s. 21.1(2), this is subject to s. 31 of the Electronic Commerce Act, " +
          "2000, and under s. 21.1(3) it applies if the deceased died on or after the day the section " +
          "came into force.",
        whenThisComesUp: "When the will is challenged because it was not signed or witnessed as the Act requires.",
        sourceUrl: SLRA,
        verifiedAt: V,
        consolidationPeriod: C_SLRA,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Directions from the court. Under rule 75.06(1) of the Rules of Civil Procedure, any person who " +
          "appears to have a financial interest in an estate may apply (or move) for directions as to the " +
          "procedure for bringing any matter before the court. Under rule 75.06(2), the application or " +
          "motion for directions must be served on all persons appearing to have a financial interest in " +
          "the estate, or as the court directs, at least 10 days before the hearing. Under rule 75.06(3), " +
          "the court may direct the issues to be decided, who are parties and the procedures for bringing " +
          "the matter before the court. Under rule 75.03(2), a notice of objection expires three years " +
          "after it is filed.",
        sourceUrl: RCP,
        verifiedAt: V,
        consolidationPeriod: C_RCP,
      },
      {
        note:
          "Mediation in some cities. Under rule 75.1.02(1), mandatory mediation applies to proceedings " +
          "started in the City of Toronto, the City of Ottawa or the County of Essex (from the dates the " +
          "rule sets out) under, among others, rule 75.01 (formal proof of a will), rule 75.03 (objection " +
          "to issuing a certificate of appointment), and rule 74.18 (passing accounts) if the application " +
          "is contested.",
        sourceUrl: RCP,
        verifiedAt: V,
        consolidationPeriod: C_RCP,
      },
      {
        note:
          "Getting the will produced. Under s. 9(1) of the Estates Act, whether or not a proceeding is " +
          "pending, the Superior Court of Justice may, on motion or otherwise in a summary way, order any " +
          "person to produce and bring before the registrar any paper or writing that is or purports to " +
          "be testamentary and that is shown to be in that person's possession or control.",
        sourceUrl: ESTATES_ACT,
        verifiedAt: V,
        consolidationPeriod: C_ESTATES,
      },
    ],
    signals: [
      "challenge my father's will",
      "contest a will",
      "the will was not witnessed",
      "executor won't share information about the estate",
      "executor is not accounting for the estate",
      "notice of objection to probate",
      "remove the executor",
      "estate trustee is stalling",
      "handwritten will",
    ],
    citations: [
      { sourceName: "Succession Law Reform Act, R.S.O. 1990, c. S.26", officialUrl: SLRA, verifiedAt: V, pinpoint: "ss. 3, 4(2), 6, 7(1), 21.1(1)-(3)" },
      { sourceName: "Rules of Civil Procedure, R.R.O. 1990, Reg. 194", officialUrl: RCP, verifiedAt: V, pinpoint: "rr. 74.15(1)(d), (h), 75.01, 75.03(1)-(2), 75.06(1)-(3), 75.1.02(1)" },
      { sourceName: "Trustee Act, R.S.O. 1990, c. T.23", officialUrl: TRUSTEE_ACT, verifiedAt: V, pinpoint: "s. 37(1), (3)" },
      { sourceName: "Estates Act, R.S.O. 1990, c. E.21", officialUrl: ESTATES_ACT, verifiedAt: V, pinpoint: "s. 9(1)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-dependant-support-from-estate",
    name: "Support from the estate of someone who supported you",
    courtArea: "civil",
    broughtBy:
      "A spouse, former spouse, parent, child, brother or sister whom the person who died was supporting, " +
      "or had to support, and who was left without adequate provision.",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "is-a-dependant-civdep",
        name: "The person is a dependant of the person who died",
        plainExplanation:
          "Under s. 57(1) of the Succession Law Reform Act, a \"dependant\" means the spouse, a parent, a " +
          "child, or a brother or sister of the deceased, to whom the deceased was providing support or " +
          "was under a legal obligation to provide support immediately before their death. \"Child\" " +
          "includes a grandchild and a person the deceased demonstrated a settled intention to treat as " +
          "a child of their family (except a child placed for valuable consideration in a foster home), " +
          "and \"spouse\" has the same meaning as in s. 29 of the Family Law Act and also includes a " +
          "former spouse whose marriage to the deceased ended by divorce. Under s. 58(2), the application " +
          "may be made by the dependant or the dependant's parent.",
        sourceUrl: SLRA,
        verifiedAt: V,
        consolidationPeriod: C_SLRA,
        evidenceCategories: [
          {
            name: "The relationship",
            why: "Shows that you fall within the Act's list of dependants.",
            examples: [
              "A marriage certificate, or proof of living together",
              "A birth certificate or other proof of the family relationship",
            ],
          },
          {
            name: "The support that was being given or owed",
            why: "Shows support provided, or a legal obligation to provide it, just before the death.",
            examples: [
              "Bank records of regular payments",
              "A support order or separation agreement",
              "Proof of shared household expenses",
            ],
          },
        ],
      },
      {
        id: "no-adequate-provision-civdep",
        name: "The person who died did not make adequate provision for the dependant's support",
        plainExplanation:
          "Under s. 58(1) of the Succession Law Reform Act, where a deceased, whether they left a will or " +
          "not, has not made adequate provision for the proper support of their dependants, the court, " +
          "on application, may order that such provision as it considers adequate be made out of the " +
          "estate. Under s. 58(4), the adequacy of provision is determined as of the date of the hearing. " +
          "Under s. 72(1), for the purposes of this Part, some transactions made before death are treated " +
          "as part of the net estate -- including money in a joint account payable to the survivor, " +
          "property held by the deceased and another as joint tenants, and amounts payable under a life " +
          "insurance policy the deceased owned or under a designation of beneficiary under Part III.",
        sourceUrl: SLRA,
        verifiedAt: V,
        consolidationPeriod: C_SLRA,
        evidenceCategories: [
          {
            name: "What the will or intestacy gives you",
            why: "Shows what provision, if any, was made.",
            examples: ["The will, or confirmation there is none", "Any statement from the estate trustee"],
          },
          {
            name: "Your current means and needs",
            why: "Adequacy is decided as of the hearing date.",
            examples: [
              "Your income records and a budget of your expenses",
              "Medical records, if health affects your ability to support yourself",
            ],
          },
          {
            name: "Assets outside the will",
            why: "Some assets that pass outside the will are treated as part of the estate under s. 72.",
            examples: [
              "Joint bank account statements",
              "Life insurance or beneficiary designation information",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "amount-factors-civdep",
        name: "What the court looks at when setting the amount",
        plainExplanation:
          "Under s. 62(1) of the Succession Law Reform Act, in deciding the amount and duration, if any, " +
          "of support, the court shall consider all the circumstances, including the dependant's current " +
          "assets and means, their capacity to contribute to their own support, their age and physical " +
          "and mental health, their needs (having regard to their accustomed standard of living), the " +
          "proximity and duration of their relationship with the deceased, the circumstances of the " +
          "deceased at the time of death, any agreement between the deceased and the dependant, and the " +
          "claims that any other person may have as a dependant.",
        whenThisComesUp: "When the estate trustee or other beneficiaries respond to the amount asked for.",
        sourceUrl: SLRA,
        verifiedAt: V,
        consolidationPeriod: C_SLRA,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Time limit: six months. Under s. 61(1) of the Succession Law Reform Act, subject to s. 61(2), " +
          "no application for an order under s. 58 may be made after six months from the grant of letters " +
          "probate of the will or of letters of administration. Under s. 61(2), the court, if it considers " +
          "it proper, may allow an application at any time as to any portion of the estate remaining " +
          "undistributed at the date of the application.",
        sourceUrl: SLRA,
        verifiedAt: V,
        consolidationPeriod: C_SLRA,
      },
      {
        note:
          "How it is started, and holding the estate. Under s. 60(1) of the Succession Law Reform Act, an " +
          "application may be made to the court by notice of application; under s. 57(1), the court is " +
          "the Superior Court of Justice. Under s. 59(1), on an application by or on behalf of the " +
          "dependants, the court may make an order suspending in whole or in part the administration of " +
          "the deceased's estate, for such time and to such extent as it decides.",
        sourceUrl: SLRA,
        verifiedAt: V,
        consolidationPeriod: C_SLRA,
      },
    ],
    signals: [
      "left out of the will and he was supporting me",
      "dependant support claim against the estate",
      "my late husband left me nothing",
      "my father was paying my support before he died",
      "the will doesn't provide for me",
      "support from my partner's estate",
      "child support stopped when he died",
    ],
    citations: [
      { sourceName: "Succession Law Reform Act, R.S.O. 1990, c. S.26", officialUrl: SLRA, verifiedAt: V, pinpoint: "ss. 57(1), 58(1), (2), (4), 59(1), 60(1), 61(1)-(2), 62(1), 72(1)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-power-of-attorney-accounting",
    name: "An attorney or guardian who must account for money they managed",
    courtArea: "civil",
    broughtBy:
      "A family member, the person themselves, or another person listed in the Substitute Decisions Act " +
      "who wants an attorney for property or a guardian of property to account for how they managed " +
      "someone's money.",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "who-may-apply-civpoa",
        name: "The person asking is allowed to apply to pass the accounts",
        plainExplanation:
          "Under s. 42(1) of the Substitute Decisions Act, 1992, the court may, on application, order that " +
          "all or a specified part of the accounts of an attorney or guardian of property be passed. " +
          "Under s. 42(2), an attorney, the grantor, or any person listed in s. 42(4) may apply to pass " +
          "the attorney's accounts; under s. 42(3), a guardian of property, the incapable person or any " +
          "person listed in s. 42(4) may apply to pass the guardian's accounts. The persons listed in s. " +
          "42(4) are the grantor's or incapable person's guardian of the person or attorney for personal " +
          "care, a dependant, the Public Guardian and Trustee, the Children's Lawyer, a judgment creditor, " +
          "and any other person, with leave of the court.",
        sourceUrl: SDA,
        verifiedAt: V,
        consolidationPeriod: C_SDA,
        evidenceCategories: [
          {
            name: "The power of attorney or guardianship order",
            why: "Shows who was appointed and what for.",
            examples: [
              "The continuing power of attorney for property",
              "The court order or certificate appointing a guardian of property",
            ],
          },
          {
            name: "Your relationship to the person",
            why: "Shows which category in s. 42 you fall in, or why leave of the court is asked for.",
            examples: [
              "Proof of family relationship or dependency",
              "Any appointment as attorney for personal care",
            ],
          },
        ],
      },
      {
        id: "duties-and-accounts-civpoa",
        name: "The attorney or guardian had duties, including keeping accounts",
        plainExplanation:
          "Under s. 32(1) of the Substitute Decisions Act, 1992, a guardian of property is a fiduciary " +
          "whose powers and duties must be exercised and performed diligently, with honesty and integrity " +
          "and in good faith, for the incapable person's benefit. Under s. 32(6), a guardian must, in " +
          "accordance with the regulations, keep accounts of all transactions involving the property. " +
          "Under s. 38(1), s. 32 (except subsections (10) and (11)) and s. 33 also apply, with necessary " +
          "modifications, to an attorney acting under a continuing power of attorney if the grantor is " +
          "incapable of managing property or the attorney has reasonable grounds to believe so. Under s. " +
          "33(1), a guardian of property is liable for damages resulting from a breach of the guardian's " +
          "duty.",
        sourceUrl: SDA,
        verifiedAt: V,
        consolidationPeriod: C_SDA,
        evidenceCategories: [
          {
            name: "Records of the money and property",
            why: "Shows what came in, what went out, and to whom.",
            examples: [
              "Bank and investment statements for the period",
              "Records of property sales or large purchases",
              "Any accounts the attorney or guardian has given",
            ],
          },
          {
            name: "Requests for information",
            why: "Shows what was asked for and what was provided.",
            examples: ["Letters or emails asking for the accounts", "The replies, or the lack of them"],
          },
          TIMELINE,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "relief-if-honest-civpoa",
        name: "Relief for a guardian who acted honestly, reasonably and diligently",
        plainExplanation:
          "Under s. 33(2) of the Substitute Decisions Act, 1992, if the court is satisfied that a guardian " +
          "of property who has committed a breach of duty has nevertheless acted honestly, reasonably and " +
          "diligently, it may relieve the guardian from all or part of the liability. Under s. 38(1), s. " +
          "33 also applies, with necessary modifications, to an attorney acting under a continuing power " +
          "of attorney if the grantor is incapable of managing property or the attorney has reasonable " +
          "grounds to believe so. Under s. 32(7), a guardian who is not compensated must exercise the " +
          "care, diligence and skill of a person of ordinary prudence in their own affairs; under s. " +
          "32(8), one who is compensated must exercise the care, diligence and skill required of a person " +
          "in the business of managing the property of others.",
        whenThisComesUp: "When the accounts show a loss and the attorney or guardian says they did their best.",
        sourceUrl: SDA,
        verifiedAt: V,
        consolidationPeriod: C_SDA,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "What the court can do. Under s. 42(6) of the Substitute Decisions Act, 1992, the accounts are " +
          "filed in the court office and the procedure on passing them is the same, and has the same " +
          "effect, as on the passing of executors' and administrators' accounts. Under s. 42(7), on an " +
          "application to pass an attorney's accounts, the court may, on motion or on its own initiative, " +
          "suspend the power of attorney pending the application, appoint the Public Guardian and Trustee " +
          "or another person as guardian of property pending the application, order an assessment of the " +
          "grantor's capacity, or order that the power of attorney be terminated.",
        sourceUrl: SDA,
        verifiedAt: V,
        consolidationPeriod: C_SDA,
      },
      {
        note:
          "Mediation in some cities. Under rule 75.1.02(1) of the Rules of Civil Procedure, mandatory " +
          "mediation applies to proceedings under the Substitute Decisions Act, 1992 started in the City " +
          "of Toronto, the City of Ottawa or the County of Essex (from the dates the rule sets out).",
        sourceUrl: RCP,
        verifiedAt: V,
        consolidationPeriod: C_RCP,
      },
    ],
    signals: [
      "my sibling has power of attorney and won't show the bank statements",
      "power of attorney misusing mom's money",
      "attorney for property won't account",
      "pass the accounts of the power of attorney",
      "guardian of property taking money",
      "where did dad's savings go",
      "POA spending on themselves",
    ],
    citations: [
      { sourceName: "Substitute Decisions Act, 1992, S.O. 1992, c. 30", officialUrl: SDA, verifiedAt: V, pinpoint: "ss. 32(1), (6)-(8), 33(1)-(2), 38(1), 42(1)-(4), (6)-(7)" },
      { sourceName: "Rules of Civil Procedure, R.R.O. 1990, Reg. 194", officialUrl: RCP, verifiedAt: V, pinpoint: "r. 75.1.02(1)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-fraudulent-conveyance",
    name: "A debtor moved property to avoid paying",
    courtArea: "civil",
    broughtBy:
      "A creditor -- often someone who already has a judgment or a claim for money -- who finds that the " +
      "debtor transferred a house, money or other property to someone else.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "a-conveyance-civfc",
        name: "Property was transferred or encumbered",
        plainExplanation:
          "Under s. 1 of the Fraudulent Conveyances Act, \"conveyance\" includes a gift, grant, " +
          "alienation, bargain, charge, encumbrance, or limitation of use of real property (land) or " +
          "personal property, by writing or otherwise. \"Personal property\" includes goods, chattels, " +
          "effects, bills, bonds, notes and securities, and shares, dividends, premiums and bonuses in a " +
          "bank, company or corporation.",
        sourceUrl: FCA,
        verifiedAt: V,
        consolidationPeriod: C_FCA,
        evidenceCategories: [
          {
            name: "Records of the transfer",
            why: "Shows what was transferred, when, to whom and for what price.",
            examples: [
              "The parcel register showing a transfer or new mortgage",
              "Vehicle ownership history",
              "Bank records showing money moved out",
            ],
          },
          TIMELINE,
        ],
      },
      {
        id: "intent-to-defeat-creditors-civfc",
        name: "The transfer was made with intent to defeat, hinder, delay or defraud creditors",
        plainExplanation:
          "Under s. 2 of the Fraudulent Conveyances Act, every conveyance of real or personal property " +
          "made with intent to defeat, hinder, delay or defraud creditors or others of their just and " +
          "lawful actions, suits, debts, accounts, damages, penalties or forfeitures is void as against " +
          "those persons and their assigns. Under s. 4, s. 2 applies to every conveyance made with that " +
          "intent even if it was made for valuable consideration and was meant to actually transfer the " +
          "property, unless it is protected under s. 3.",
        sourceUrl: FCA,
        verifiedAt: V,
        consolidationPeriod: C_FCA,
        evidenceCategories: [
          {
            name: "The debt or claim",
            why: "Shows that you were a creditor, or had a claim, at the time.",
            examples: [
              "The judgment, invoice, loan agreement or statement of claim",
              "Demand letters sent before the transfer",
            ],
          },
          {
            name: "The circumstances of the transfer",
            why: "Speaks to the intent behind it: timing, price and who received it.",
            examples: [
              "The price paid compared with the property's value",
              "The relationship between the debtor and the person who received it",
              "What the debtor still owns after the transfer",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "good-faith-purchaser-civfc",
        name: "A buyer in good faith, for good consideration, without notice",
        plainExplanation:
          "Under s. 3 of the Fraudulent Conveyances Act, s. 2 does not apply to an estate or interest in " +
          "real or personal property conveyed upon good consideration and in good faith to a person who, " +
          "at the time of the conveyance, did not have notice or knowledge of the intent set out in s. 2.",
        whenThisComesUp:
          "When the person who received the property says they paid for it and knew nothing about the " +
          "debtor's creditors.",
        sourceUrl: FCA,
        verifiedAt: V,
        consolidationPeriod: C_FCA,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "When land is involved. Under s. 103(1) of the Courts of Justice Act, starting a proceeding in " +
          "which an interest in land is in question is not notice of it to a person who is not a party " +
          "until a certificate of pending litigation is issued by the court and registered in the proper " +
          "land registry office.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: C_CJA,
      },
      {
        note:
          "Finding out about transfers. Under rule 60.18(2) of the Rules of Civil Procedure, a creditor " +
          "under an order may examine the debtor about, among other things, the debtor's income and " +
          "property and the disposal the debtor has made of any property either before or after the " +
          "making of the order.",
        sourceUrl: RCP,
        verifiedAt: V,
        consolidationPeriod: C_RCP,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: C_LIMITATIONS,
      },
    ],
    signals: [
      "debtor transferred his house to his wife",
      "moved assets to avoid paying the judgment",
      "fraudulent conveyance",
      "sold the car to a relative for a dollar",
      "put the property in someone else's name",
      "hiding assets from creditors",
      "transferred everything before I could collect",
    ],
    citations: [
      { sourceName: "Fraudulent Conveyances Act, R.S.O. 1990, c. F.29", officialUrl: FCA, verifiedAt: V, pinpoint: "ss. 1, 2, 3, 4" },
      { sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43", officialUrl: CJA, verifiedAt: V, pinpoint: "s. 103(1)" },
      { sourceName: "Rules of Civil Procedure, R.R.O. 1990, Reg. 194", officialUrl: RCP, verifiedAt: V, pinpoint: "r. 60.18(2)" },
      { sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B", officialUrl: LIMITATIONS, verifiedAt: V, pinpoint: "ss. 4, 5(1), 5(2)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-oppression-shareholder",
    name: "A company's owners or managers treating a shareholder unfairly",
    courtArea: "civil",
    broughtBy:
      "A shareholder, director or officer (current or former) of an Ontario business corporation who " +
      "says the company is being run in a way that is unfair to them.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "is-a-complainant-civopp",
        name: "The person is a complainant",
        plainExplanation:
          "Under s. 248(1) of the Business Corporations Act, a complainant may apply to the court for an " +
          "order under the section. Under s. 245, a \"complainant\" means a registered holder or " +
          "beneficial owner, or a former one, of a security of a corporation or any of its affiliates; a " +
          "director or officer, or a former one, of a corporation or any of its affiliates; or any other " +
          "person who, in the discretion of the court, is a proper person to make an application. Under " +
          "s. 1(1), a \"corporation\" means a body corporate with share capital to which the Act applies, " +
          "and the \"court\" is the Superior Court of Justice.",
        sourceUrl: OBCA,
        verifiedAt: V,
        consolidationPeriod: C_OBCA,
        evidenceCategories: [
          {
            name: "Your shares or position",
            why: "Shows that you are, or were, a security holder, director or officer.",
            examples: [
              "Share certificates or the securities register",
              "A shareholder agreement",
              "Minutes or filings naming you as a director or officer",
            ],
          },
          {
            name: "The corporation's records",
            why: "Shows which Act the corporation is under and who runs it.",
            examples: ["Articles of incorporation", "A corporate profile report"],
          },
        ],
      },
      {
        id: "oppressive-conduct-civopp",
        name: "The conduct is oppressive, unfairly prejudicial, or unfairly disregards your interests",
        plainExplanation:
          "Under s. 248(2) of the Business Corporations Act, the court may make an order to rectify the " +
          "matters complained of where it is satisfied that, in respect of a corporation or any of its " +
          "affiliates, an act or omission of the corporation effects or threatens to effect a result, the " +
          "business or affairs of the corporation are, have been or are threatened to be carried on, or " +
          "the powers of the directors are, have been or are threatened to be exercised, in a manner that " +
          "is oppressive or unfairly prejudicial to, or that unfairly disregards the interests of, any " +
          "security holder, creditor, director or officer. Under s. 248(3), the court may make any interim " +
          "or final order it thinks fit, including an order restraining the conduct, appointing a " +
          "receiver, directing the corporation or any other person to purchase a security holder's " +
          "securities, setting aside a transaction, requiring financial statements or an accounting, " +
          "compensating an aggrieved person, or winding up the corporation.",
        sourceUrl: OBCA,
        verifiedAt: V,
        consolidationPeriod: C_OBCA,
        evidenceCategories: [
          {
            name: "What was done",
            why: "Shows the acts, decisions or exercise of directors' powers complained of.",
            examples: [
              "Board or shareholder minutes and resolutions",
              "Notices of meetings, or the lack of them",
              "Records of dividends, salaries or transfers to insiders",
            ],
          },
          {
            name: "Your interests and what you were told",
            why: "Shows the interests said to be disregarded or prejudiced.",
            examples: [
              "The shareholder agreement and any side agreements",
              "Emails or letters about your role, shares or payments",
              "Financial statements, or requests for them",
            ],
          },
          TIMELINE,
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "harm-to-corporation-civopp",
        name: "Harm done to the corporation itself: a derivative action needs leave",
        plainExplanation:
          "Under s. 246(1) of the Business Corporations Act, a complainant may apply to the court for leave " +
          "to bring an action in the name and on behalf of a corporation. Under s. 246(2), no such action " +
          "may be brought unless the complainant has given fourteen days' notice to the directors of the " +
          "intention to apply, and the court is satisfied that the directors will not bring or diligently " +
          "prosecute the action, the complainant is acting in good faith, and it appears to be in the " +
          "interests of the corporation that the action be brought. Under s. 246(2.1), the notice is not " +
          "required if all of the directors are defendants in the action.",
        whenThisComesUp:
          "When the wrong complained of is a loss to the company itself -- for example, money taken out of " +
          "the business -- rather than unfair treatment of the shareholder.",
        sourceUrl: OBCA,
        verifiedAt: V,
        consolidationPeriod: C_OBCA,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Which court and how to start. Under s. 1(1) of the Business Corporations Act, the court is the " +
          "Superior Court of Justice, and under s. 248(1) a complainant may apply to it. " +
          APPLICATION_UNDER_STATUTE,
        sourceUrl: OBCA,
        verifiedAt: V,
        consolidationPeriod: C_OBCA,
        alsoCites: [{ sourceUrl: RCP, pinpoint: "Rules of Civil Procedure, r. 14.05(2)" }],
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: C_LIMITATIONS,
      },
    ],
    signals: [
      "minority shareholder squeezed out",
      "my business partner locked me out of the company",
      "shareholder oppression",
      "removed as a director without notice",
      "they won't show me the company's financial statements",
      "paying themselves and not dividends",
      "unfairly treated as a shareholder",
      "co-owner of the corporation took the money",
    ],
    citations: [
      { sourceName: "Business Corporations Act, R.S.O. 1990, c. B.16", officialUrl: OBCA, verifiedAt: V, pinpoint: "ss. 1(1), 245, 246(1)-(2.1), 248(1)-(3)" },
      { sourceName: "Rules of Civil Procedure, R.R.O. 1990, Reg. 194", officialUrl: RCP, verifiedAt: V, pinpoint: "r. 14.05(2)" },
      { sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B", officialUrl: LIMITATIONS, verifiedAt: V, pinpoint: "ss. 4, 5(1), 5(2)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-employment-human-rights-damages",
    name: "Discrimination at work (court claim with another cause of action)",
    courtArea: "civil",
    broughtBy:
      "An employee or former employee who is suing their employer in court for something else -- for " +
      "example, a dismissal without reasonable notice -- and says they were also discriminated against " +
      "or harassed at work.",
    typicalDefendantProfile: "business",
    plaintiffElements: [
      {
        id: "code-right-infringed-civhr",
        name: "A right under Part I of the Human Rights Code was infringed",
        plainExplanation:
          "Under s. 5(1) of the Human Rights Code, every person has a right to equal treatment with " +
          "respect to employment without discrimination because of race, ancestry, place of origin, " +
          "colour, ethnic origin, citizenship, creed, sex, sexual orientation, gender identity, gender " +
          "expression, age, record of offences, marital status, family status or disability. Under s. " +
          "5(2), every employee has a right to freedom from harassment in the workplace by the employer " +
          "or agent of the employer or by another employee because of race, ancestry, place of origin, " +
          "colour, ethnic origin, citizenship, creed, sexual orientation, gender identity, gender " +
          "expression, age, record of offences, marital status, family status or disability.",
        sourceUrl: HRC,
        verifiedAt: V,
        consolidationPeriod: C_HRC,
        evidenceCategories: [
          {
            name: "What happened, and why you connect it to a Code ground",
            why: "Shows the treatment and the ground it relates to.",
            examples: [
              "Emails, texts or messages from managers or co-workers",
              "Notes of comments made, with dates and who was present",
              "Requests for accommodation and the replies",
            ],
          },
          {
            name: "How others were treated",
            why: "Shows any difference in treatment.",
            examples: ["Names of witnesses", "Workplace policies and how they were applied"],
          },
          TIMELINE,
        ],
      },
      {
        id: "another-cause-of-action-civhr",
        name: "The court case rests on another cause of action as well",
        plainExplanation:
          "Under s. 46.1(2) of the Human Rights Code, s. 46.1(1) does not permit a person to start an " +
          "action based solely on an infringement of a right under Part I. One such other cause of action " +
          "is a claim for reasonable notice of dismissal: in Machtinger v. HOJ Industries Ltd., [1992] 1 " +
          "S.C.R. 986, the Supreme Court of Canada said that in Canada, employment contracts for an " +
          "indefinite period require the employer, absent express contractual language to the contrary, " +
          "to give reasonable notice of an intention to terminate the contract if the dismissal is without " +
          "cause.",
        sourceUrl: HRC,
        verifiedAt: V,
        consolidationPeriod: C_HRC,
        alsoCites: [{ sourceUrl: MACHTINGER, pinpoint: "Machtinger v. HOJ Industries Ltd., [1992] 1 S.C.R. 986, Part B (Iacobucci J.)" }],
        evidenceCategories: [
          {
            name: "The employment and how it ended",
            why: "Shows the contract and the dismissal the court case is about.",
            examples: [
              "The employment contract or offer letter",
              "The termination letter and any severance offer",
              "Pay stubs and benefit statements",
            ],
          },
          {
            name: "Length and type of employment",
            why: "Speaks to the notice the contract or the law provided.",
            examples: ["Start date and job titles held", "Records of your job search after dismissal"],
          },
        ],
      },
      {
        id: "orders-court-can-make-civhr",
        name: "What the court can order for the infringement",
        plainExplanation:
          "Under s. 46.1(1) of the Human Rights Code, if, in a civil proceeding in a court, the court finds " +
          "that a party has infringed a right under Part I of another party, the court may order the party " +
          "who infringed the right to pay monetary compensation for loss arising out of the infringement, " +
          "including compensation for injury to dignity, feelings and self-respect, or to make restitution " +
          "other than through money, or both.",
        sourceUrl: HRC,
        verifiedAt: V,
        consolidationPeriod: C_HRC,
        evidenceCategories: [
          {
            name: "The effect on you",
            why: "Shows the loss, including injury to dignity, feelings and self-respect.",
            examples: [
              "A journal of how the treatment affected you",
              "Records from a doctor or counsellor",
              "Statements from family or friends",
            ],
          },
          {
            name: "Money lost",
            why: "Shows financial loss arising from the infringement.",
            examples: ["Lost pay and benefits records", "Receipts for costs incurred"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "contract-notice-term-civhr",
        name: "The contract set its own notice period",
        plainExplanation:
          "In Machtinger v. HOJ Industries Ltd., [1992] 1 S.C.R. 986, at p. 998, the Supreme Court of " +
          "Canada characterized the common law principle of termination only on reasonable notice as a " +
          "presumption, rebuttable if the contract of employment clearly specifies some other period of " +
          "notice, whether expressly or impliedly.",
        whenThisComesUp: "When the employer points to a termination clause in the employment contract.",
        sourceUrl: MACHTINGER,
        verifiedAt: V,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Court or Tribunal, not both. Under s. 34(1) of the Human Rights Code, a person who believes their " +
          "Part I rights were infringed may apply to the Human Rights Tribunal of Ontario within one year " +
          "after the incident, or the last incident in a series. Under s. 34(11), they may not apply to the " +
          "Tribunal about that right if a civil proceeding has been started in a court in which they seek " +
          "an order under s. 46.1 about the alleged infringement and it has not been finally determined or " +
          "withdrawn, or if a court has finally determined whether the right was infringed or the matter " +
          "has been settled.",
        sourceUrl: HRC,
        verifiedAt: V,
        consolidationPeriod: C_HRC,
      },
      {
        note:
          "Which court. Under s. 23(1) of the Courts of Justice Act, the Small Claims Court has jurisdiction " +
          "in an action for the payment of money where the amount claimed does not exceed the prescribed " +
          "amount, not counting interest and costs; under s. 1(1) of O. Reg. 626/00, that amount is " +
          "$50,000. Under s. 23(1.1), an action within the Small Claims Court's jurisdiction shall not be " +
          "started in the Superior Court of Justice except with leave of the Superior Court of Justice as " +
          "provided in the rules of court.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: C_CJA,
        alsoCites: [{ sourceUrl: OREG_626, pinpoint: "O. Reg. 626/00, s. 1(1)" }],
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: C_LIMITATIONS,
      },
    ],
    signals: [
      "fired because of my disability",
      "wrongful dismissal and discrimination",
      "let go after I told them I was pregnant",
      "harassed at work because of my race",
      "suing my employer for discrimination",
      "terminated after asking for accommodation",
      "age discrimination when they fired me",
      "human rights damages in a wrongful dismissal lawsuit",
    ],
    citations: [
      { sourceName: "Human Rights Code, R.S.O. 1990, c. H.19", officialUrl: HRC, verifiedAt: V, pinpoint: "ss. 5(1)-(2), 34(1), (11), 46.1(1)-(2)" },
      { sourceName: "Machtinger v. HOJ Industries Ltd., [1992] 1 S.C.R. 986", officialUrl: MACHTINGER, verifiedAt: V, pinpoint: "p. 998 and Part B (Iacobucci J.)" },
      { sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43", officialUrl: CJA, verifiedAt: V, pinpoint: "s. 23(1), (1.1)" },
      { sourceName: "O. Reg. 626/00 (Small Claims Court jurisdiction and appeal limit)", officialUrl: OREG_626, verifiedAt: V, pinpoint: "s. 1(1)" },
      { sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B", officialUrl: LIMITATIONS, verifiedAt: V, pinpoint: "ss. 4, 5(1), 5(2)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "civil-claim-enforcing-a-judgment",
    name: "Collecting on a Superior Court judgment",
    courtArea: "civil",
    broughtBy:
      "A person or business that has a Superior Court of Justice order for payment of money and has not " +
      "been paid.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "order-for-money-civenf",
        name: "There is an order for the payment of money, and the ways to enforce it",
        plainExplanation:
          "Under rule 60.02(1) of the Rules of Civil Procedure, in addition to any other method of " +
          "enforcement provided by law, an order for the payment or recovery of money may be enforced by a " +
          "writ of seizure and sale (Form 60A) under rule 60.07, garnishment under rule 60.08, a writ of " +
          "sequestration (Form 60B) under rule 60.09, and the appointment of a receiver.",
        sourceUrl: RCP,
        verifiedAt: V,
        consolidationPeriod: C_RCP,
        evidenceCategories: [
          {
            name: "The order",
            why: "Shows what the court ordered and when.",
            examples: ["The judgment or order as entered", "Any costs order or certificate of assessment"],
          },
          {
            name: "What has been paid",
            why: "Shows the amount still owing.",
            examples: ["Records of any payments received since the order", "An interest calculation"],
          },
        ],
      },
      {
        id: "writ-of-seizure-and-sale-civenf",
        name: "A writ of seizure and sale",
        plainExplanation:
          "Under rule 60.07(1) of the Rules of Civil Procedure, where an order may be enforced by a writ of " +
          "seizure and sale, the creditor is entitled to the issue of one or more writs (Form 60A) on " +
          "filing with the registrar where the proceeding was started a requisition setting out the date " +
          "and amount of any payment received since the order was made, and the amount owing and the rate " +
          "of postjudgment interest, together with a copy of the order as entered and any other evidence " +
          "necessary to establish the amount awarded and the creditor's entitlement.",
        sourceUrl: RCP,
        verifiedAt: V,
        consolidationPeriod: C_RCP,
        evidenceCategories: [
          {
            name: "What the debtor owns",
            why: "Shows what a writ could reach.",
            examples: [
              "A property search showing land in the debtor's name",
              "Information about vehicles or other valuable property",
            ],
          },
          {
            name: "The requisition details",
            why: "The requisition must state payments received, the amount owing and the interest rate.",
            examples: ["A payment history since the order", "The postjudgment interest rate stated in the order"],
          },
        ],
      },
      {
        id: "garnishment-civenf",
        name: "Garnishment of money owed to the debtor",
        plainExplanation:
          "Under rule 60.08(1) of the Rules of Civil Procedure, a creditor under an order for the payment or " +
          "recovery of money may enforce it by garnishment of debts payable to the debtor by other persons. " +
          "Under rule 60.08(1.1), where a debt is payable to the debtor and to one or more co-owners, " +
          "one-half of it, or a greater or lesser amount the court specifies, may be garnished.",
        sourceUrl: RCP,
        verifiedAt: V,
        consolidationPeriod: C_RCP,
        evidenceCategories: [
          {
            name: "Who owes the debtor money",
            why: "Shows who could be served with a notice of garnishment.",
            examples: [
              "The debtor's employer",
              "The debtor's bank",
              "Tenants or customers who pay the debtor",
            ],
          },
          {
            name: "Information from an examination",
            why: "An examination in aid of execution can show income, bank accounts and debts owed to the debtor.",
            examples: ["Transcript or notes from the examination", "Documents the debtor produced"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "six-years-leave-civenf",
        name: "Six years after the order: leave of the court is needed",
        plainExplanation:
          "Under rule 60.07(2) of the Rules of Civil Procedure, if six years or more have passed since the " +
          "date of the order, or if its enforcement is subject to a condition, a writ of seizure and sale " +
          "shall not be issued unless leave of the court is first obtained. Rule 60.08(2) says the same " +
          "for a notice of garnishment. Under rules 60.07(3) and 60.08(3), an order granting leave ceases " +
          "to have effect if the writ or notice is not issued within one year after the order granting " +
          "leave, but the court may grant leave again on a later motion.",
        whenThisComesUp: "When the judgment is old, or the order says payment depends on a condition.",
        sourceUrl: RCP,
        verifiedAt: V,
        consolidationPeriod: C_RCP,
      },
      {
        id: "examination-limits-civenf",
        name: "Being examined about your finances",
        plainExplanation:
          "Under rule 60.18(2) of the Rules of Civil Procedure, a creditor may examine the debtor about the " +
          "reason for nonpayment, the debtor's income and property, debts owed to and by the debtor, the " +
          "disposal of any property before or after the order, the debtor's present, past and future means " +
          "to satisfy the order, and whether the debtor intends to obey it. Under rule 60.18(4), only one " +
          "such examination may be held in a twelve-month period for a debtor in the same proceeding, " +
          "unless the court orders otherwise. Under rule 60.18(7), the debtor must be served with the " +
          "notice of examination personally or by an alternative to personal service.",
        whenThisComesUp: "When the debtor is served with a notice of examination in aid of execution.",
        sourceUrl: RCP,
        verifiedAt: V,
        consolidationPeriod: C_RCP,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "No limitation period to enforce. Under s. 16(1)(b) of the Limitations Act, 2002, there is no " +
          "limitation period in respect of a proceeding to enforce an order of a court, or any other order " +
          "that may be enforced in the same way as an order of a court.",
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: C_LIMITATIONS,
      },
      {
        note:
          "Interest after judgment. Under s. 129(1) of the Courts of Justice Act, money owing under an " +
          "order, including costs to be assessed or costs fixed by the court, bears interest at the " +
          "postjudgment interest rate, calculated from the date of the order.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: C_CJA,
      },
    ],
    signals: [
      "I won but they haven't paid",
      "collect on my judgment",
      "garnish wages after judgment",
      "writ of seizure and sale",
      "enforce a Superior Court order",
      "judgment debtor won't pay",
      "examination in aid of execution",
      "garnish their bank account",
    ],
    citations: [
      { sourceName: "Rules of Civil Procedure, R.R.O. 1990, Reg. 194", officialUrl: RCP, verifiedAt: V, pinpoint: "rr. 60.02(1), 60.07(1)-(3), 60.08(1)-(3), 60.18(2), (4), (7)" },
      { sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B", officialUrl: LIMITATIONS, verifiedAt: V, pinpoint: "s. 16(1)(b)" },
      { sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43", officialUrl: CJA, verifiedAt: V, pinpoint: "s. 129(1)" },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
