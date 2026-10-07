/**
 * Case types, batch "sc-other-1" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-other-1.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-sick-or-misrepresented-pet -- A sick pet from a breeder or seller
 *   sc-claim-vet-negligence -- Harm caused by veterinary care
 *   sc-claim-scam-or-fraud-recovery -- Money lost to a scam or fraud
 *   sc-claim-romance-or-investment-scam -- A romance or investment scam
 *   sc-claim-cryptocurrency-or-exchange-loss -- Cryptocurrency or an online exchange loss
 *   sc-claim-defamation-online-or-in-print -- Something untrue posted about you online
 *   sc-claim-privacy-breach-or-intrusion -- A privacy breach
 *   sc-claim-intimate-image-abuse -- Intimate images shared without consent
 *   sc-claim-harassment-or-cyberbullying -- Harassment or cyberbullying
 *
 * Every legal statement below rests on text saved in this repository: the
 * vendored corpus (docs/sources/corpus/, url from manifest.json) or a decision
 * saved under docs/sources/decisions/. Notes on what was left out, and why:
 *   - sc-claim-intimate-image-abuse is NOT written. The only saved civil
 *     privacy authority is Jones v. Tsige, 2012 ONCA 32, which recognizes
 *     intrusion upon seclusion and expressly sets apart "public disclosure of
 *     embarrassing private facts" as a different wrong (paras. 18, 21). No
 *     saved Ontario decision or statute gives a civil claim for sharing an
 *     intimate image; Criminal Code s. 162.1 is an offence, not a claim for
 *     money. Writing it from intrusion upon seclusion would misdescribe the
 *     usual facts (images that were given, then shared).
 *   - sc-claim-harassment-or-cyberbullying is NOT written. No saved source
 *     sets out a civil claim for harassment; Jones v. Tsige mentions
 *     harassment cases only in its survey of other decisions, and Criminal
 *     Code s. 264 is an offence.
 *   - The crypto type says nothing about securities law: the Securities Act
 *     is not saved. It rests on contract principles from saved SCC decisions,
 *     civil fraud (Hryniak), and CPA s. 2.
 *   - No saved source says whether an animal is "goods"; the pet type quotes
 *     the Sale of Goods Act definition and leaves the application alone.
 */

import type { ClaimType } from "../claimTypes";

const VERIFIED = "2026-10-07";

const SCJ_STEPS =
  "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/";
const SC_GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim";
const CPO_SCAM = "https://www.ontario.ca/page/identify-scam-or-fraud";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_CONSOLIDATION = "2024-12-04";
const SGA = "https://www.ontario.ca/laws/docs/90s01_e.doc";
const SGA_CONSOLIDATION = "1994-12-09";
const CPA = "https://www.ontario.ca/laws/docs/02c30_e.doc";
const CPA_CONSOLIDATION = "2025-12-11";
const LIBEL = "https://www.ontario.ca/laws/docs/90l12_e.doc";
const LIBEL_CONSOLIDATION = "2015-11-03";
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const CJA_CONSOLIDATION = "2025-12-11";
const PHIPA = "https://www.ontario.ca/laws/docs/04p03_e.doc";
const PHIPA_CONSOLIDATION = "2026-01-01";
const VETS = "https://www.ontario.ca/laws/docs/90v03_e.doc";
const VETS_CONSOLIDATION = "2024-06-06";
const NEGLIGENCE = "https://www.ontario.ca/laws/docs/elaws_statutes_90n01_e.doc";
const NEGLIGENCE_CONSOLIDATION = "2004-01-01";

const GRANT = "docs/sources/decisions/grant-v-torstar-2009-SCC-61.english.txt";
const HILL = "docs/sources/decisions/hill-v-church-of-scientology-1995-2-SCR-1130.html.txt";
const WIC = "docs/sources/decisions/wic-radio-v-simpson-2008-SCC-40.html.txt";
const JONES = "docs/sources/decisions/jones-v-tsige-2012-ONCA-32.txt";
const HRYNIAK = "docs/sources/decisions/hryniak-v-mauldin-2014-SCC-7.html.txt";
const KERR = "docs/sources/decisions/kerr-v-baranow-2011-SCC-10.english.txt";
const PECORE = "docs/sources/decisions/pecore-v-pecore-2007-SCC-17.english.txt";
const MUSTAPHA = "docs/sources/decisions/mustapha-v-culligan-2008-SCC-27.english.txt";
const RYAN = "docs/sources/decisions/ryan-v-victoria-city-1999-1-SCR-201.english.txt";
const CLEMENTS = "docs/sources/decisions/clements-v-clements-2012-SCC-32.english.txt";
const SATTVA = "docs/sources/decisions/sattva-capital-corp-v-creston-moly-corp-2014-SCC-53.english.txt";
const BHASIN = "docs/sources/decisions/bhasin-v-hrynew-2014-SCC-71.english.txt";
const TERCON = "docs/sources/decisions/tercon-contractors-ltd-v-british-columbia-2010-SCC-4.english.txt";
const FIDLER = "docs/sources/decisions/fidler-v-sun-life-assurance-co-2006-SCC-30.english.txt";

// ---- Shared wording. Each entry that uses it has its own record. ----

const BURDEN =
  "The Superior Court of Justice's guide to the steps in a civil case says that in every civil " +
  "case the plaintiff has the burden of proof to establish, on a balance of probabilities, the " +
  "allegations in their claim -- evidence showing that, more likely than not, it would be " +
  "correct to rule in their favour. ";

const AMOUNT =
  "Ontario's Small Claims Court guide says the reasons for a claim should \"calculate and explain " +
  "the amount of money and any interest you are claiming\", and that a copy of the supporting " +
  "documents is attached to the claim (if they are not attached, the claim gives the reasons why). " +
  "The guide says the court can handle any action for the payment of money where the amount " +
  "claimed does not exceed $50,000, excluding interest and costs such as court fees. ";

const FRAUD_TEST =
  "In Hryniak v. Mauldin, 2014 SCC 7, the Supreme Court of Canada said the tort of civil fraud has " +
  "four elements, which must be proven on a balance of probabilities: (1) a false representation by " +
  "the defendant; (2) some level of knowledge of the falsehood of the representation on the part of " +
  "the defendant (whether knowledge or recklessness); (3) the false representation caused the " +
  "plaintiff to act; and (4) the plaintiff's actions resulted in a loss (para. 87). ";

const MUSTAPHA_ELEMENTS =
  "In Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, the Supreme Court of Canada said a " +
  "successful action in negligence requires the plaintiff to show (1) that the defendant owed them a " +
  "duty of care; (2) that the defendant's behaviour breached the standard of care; (3) that the " +
  "plaintiff sustained damage; and (4) that the damage was caused, in fact and in law, by the " +
  "defendant's breach (para. 3). ";

const GRANT_ELEMENTS =
  "In Grant v. Torstar Corp., 2009 SCC 61, the Supreme Court of Canada said a plaintiff in a " +
  "defamation action is required to prove three things to obtain judgment and an award of " +
  "damages: that the words were defamatory, in the sense that they would tend to lower the " +
  "plaintiff's reputation in the eyes of a reasonable person; that the words in fact referred to " +
  "the plaintiff; and that they were published, meaning communicated to at least one person other " +
  "than the plaintiff (para. 28). ";

const SCAM_REPORT_NOTE =
  "Ontario's page on identifying a scam or fraud says that anyone who thinks they may be a victim " +
  "should stop all communication with the scammer, notify banks and other companies where they " +
  "have an account that may have been affected, and report the scam or fraud to their local police " +
  "and the Canadian Anti-Fraud Centre. It says to gather all records of the fraud -- correspondence " +
  "with the scammer, financial statements, receipts, contracts, the contact information and " +
  "websites or social media accounts the scammer used -- and to keep a log of what was done, " +
  "including when the fraud was first noticed.";

const LIMITATION_NOTE =
  "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding cannot " +
  "be started after the second anniversary of the day the claim was discovered. Section 5(1) sets " +
  "out when a claim is discovered, and under s. 5(2) a person with a claim is presumed to have " +
  "known of those matters on the day the act or omission the claim is based on took place, unless " +
  "the contrary is proved.";

const START_NOTE =
  "This kind of claim is started with a Plaintiff's Claim (Form 7A). The Small Claims Court guide " +
  "says that if a claim is against more than one individual, each defendant's full name is " +
  "included.";

const LIMITATION = { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: VERIFIED, consolidationPeriod: LIMITATIONS_CONSOLIDATION };
const START = { note: START_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED };
const SCAM_REPORT = { note: SCAM_REPORT_NOTE, sourceUrl: CPO_SCAM, verifiedAt: VERIFIED };

const LIMITATION_CITATION = {
  sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
  officialUrl: LIMITATIONS,
  verifiedAt: VERIFIED,
  pinpoint: "ss. 4 and 5(1)-(2): two years from the day the claim was discovered",
};
const SC_GUIDE_CITATION = {
  sourceName: "Ontario.ca -- Guide to Procedures in Small Claims Court: Making a Claim",
  officialUrl: SC_GUIDE,
  verifiedAt: VERIFIED,
  pinpoint: "Plaintiff's claim; reasons for claim; the $50,000 limit",
};
const HRYNIAK_CITATION = {
  sourceName: "Hryniak v. Mauldin, 2014 SCC 7",
  officialUrl: HRYNIAK,
  verifiedAt: VERIFIED,
  pinpoint: "para. 87: the four elements of civil fraud",
};
const CPO_SCAM_CITATION = {
  sourceName: "Ontario.ca -- Identify a scam or fraud",
  officialUrl: CPO_SCAM,
  verifiedAt: VERIFIED,
  pinpoint: "Report a scam",
};

const amountElement = (suffix: string, about: string, examples: string[]) => ({
  id: `amount-${suffix}`,
  name: "The amount claimed",
  plainExplanation: AMOUNT + about,
  sourceUrl: SC_GUIDE,
  verifiedAt: VERIFIED,
  evidenceCategories: [
    {
      name: "A calculation of the loss",
      why: "Shows how the amount claimed was reached.",
      examples,
    },
  ],
});

export const TYPES_SC_OTHER_1: ClaimType[] = [
  // ------------------------------------------------------------------
  {
    id: "sc-claim-sick-or-misrepresented-pet",
    name: "A sick pet from a breeder or seller",
    broughtBy:
      "A buyer who paid a breeder, pet store or private seller for a pet that turned out to be sick, or " +
      "not what the seller said it was (its breed, age, health or papers). Not a claim about a vet's care.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "matched-description-pet",
        name: "The pet did not match how it was described",
        plainExplanation:
          "Under s. 14 of the Sale of Goods Act, where there is a contract for the sale of goods by " +
          "description, there is an implied condition that the goods will correspond with the " +
          "description. Section 1(1) of the Act defines \"goods\" as all chattels personal, other than " +
          "things in action and money. This part of the checklist is about what the seller said the " +
          "animal was -- its breed, age, health or papers -- and what it turned out to be.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "What the seller said",
            why: "Shows the description the pet was sold under.",
            examples: ["The online ad or listing", "Messages with the seller", "Registration papers or a health guarantee"],
          },
          {
            name: "What the pet turned out to be",
            why: "Shows how the pet differed from the description.",
            examples: ["A vet's report or diagnosis", "DNA or breed test results", "Photos and dates"],
          },
        ],
      },
      {
        id: "quality-and-fitness-pet",
        name: "The pet was not fit or of merchantable quality",
        plainExplanation:
          "Under s. 15 of the Sale of Goods Act, there is no implied condition as to quality or fitness " +
          "except as the section sets out. Where the buyer makes known to the seller the particular " +
          "purpose for which the goods are required, so as to show that the buyer relies on the " +
          "seller's skill or judgment, and the goods are of a description that it is in the course of " +
          "the seller's business to supply, there is an implied condition that the goods will be " +
          "reasonably fit for that purpose (para. 1). Where goods are bought by description from a " +
          "seller who deals in goods of that description, there is an implied condition that the goods " +
          "will be of merchantable quality; but if the buyer has examined the goods, there is no implied " +
          "condition as regards defects that the examination ought to have revealed (para. 2). This part " +
          "of the checklist is about the pet's health when it was handed over, what the buyer told the " +
          "seller, and whether the seller is in the business of selling animals.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The pet's health soon after the sale",
            why: "Shows the condition the pet was in when it came home.",
            examples: ["Vet records from the first visits", "Test results and dates", "Notes of symptoms with dates"],
          },
          {
            name: "The seller's business",
            why: "The implied conditions depend on whether the seller deals in or supplies animals.",
            examples: ["The seller's website or many ads", "A business name or kennel name", "A receipt or invoice"],
          },
        ],
      },
      {
        id: "false-representation-pet",
        name: "A seller in business made a false or misleading representation",
        plainExplanation:
          "Under s. 1 of the Consumer Protection Act, 2002, a \"consumer\" is an individual acting for " +
          "personal, family or household purposes, and a \"supplier\" is a person who is in the business " +
          "of selling, leasing or trading in goods or services. Under s. 14(1), it is an unfair practice " +
          "for a person to make a false, misleading or deceptive representation; the examples in " +
          "s. 14(2) include a representation that goods have qualities they do not have (para. 1), and " +
          "that goods are of a particular standard, quality or grade if they are not (para. 3). Under " +
          "s. 18(1), any agreement a consumer enters into after or while a person has engaged in an " +
          "unfair practice may be rescinded by the consumer, and the consumer is entitled to any remedy " +
          "that is available in law, including damages. Under s. 9(2), the implied conditions and " +
          "warranties of the Sale of Goods Act are deemed to apply to goods supplied under a consumer " +
          "agreement. This part of the checklist is about what a seller in the business said about the pet.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The representation",
            why: "Shows exactly what the seller said about the pet.",
            examples: ["Screenshots of the listing", "A health certificate or guarantee", "Texts or emails before the sale"],
          },
          {
            name: "The purchase",
            why: "Shows the buyer bought the pet for personal or household purposes from a business.",
            examples: ["Receipt or e-transfer record", "Sale contract", "The seller's business details"],
          },
        ],
      },
      amountElement("pet", "This part of the checklist is about the price paid and any costs that followed.", [
        "Receipt for the pet",
        "Vet bills",
        "A written list of each cost and its date",
      ]),
    ],
    defendantConsiderations: [
      {
        id: "not-in-business-pet",
        name: "The seller says they are not in the business of selling animals",
        plainExplanation:
          "Under s. 15 of the Sale of Goods Act, the implied condition of fitness for a purpose applies " +
          "where the goods are of a description that it is in the course of the seller's business to " +
          "supply (para. 1), and the implied condition of merchantable quality applies where goods are " +
          "bought by description from a seller who deals in goods of that description (para. 2). Under " +
          "s. 1 of the Consumer Protection Act, 2002, a \"supplier\" is a person who is in the business of " +
          "selling, leasing or trading in goods or services, and a \"consumer agreement\" is an agreement " +
          "between a supplier and a consumer.",
        whenThisComesUp:
          "When the seller's Defence says it was a one-time private sale of a family pet or a single litter.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA, pinpoint: "Consumer Protection Act, 2002, s. 1 (\"supplier\", \"consumer agreement\")" }],
      },
      {
        id: "sold-as-is-pet",
        name: "The seller points to an \"as is\" term or a signed waiver",
        plainExplanation:
          "Under s. 53 of the Sale of Goods Act, where any right, duty or liability would arise under a " +
          "contract of sale by implication of law, it may be negatived or varied by express agreement, by " +
          "the course of dealing between the parties, or by usage that binds both parties. For a consumer " +
          "agreement, s. 9(3) of the Consumer Protection Act, 2002 says any term or acknowledgement that " +
          "purports to negate or vary any implied condition or warranty under the Sale of Goods Act, or " +
          "any deemed condition or warranty under that Act, is void.",
        whenThisComesUp:
          "When the seller's Defence says the buyer signed a contract saying the pet was sold as is, or " +
          "with a limited health guarantee.",
        sourceUrl: SGA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SGA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA, pinpoint: "Consumer Protection Act, 2002, s. 9(3)" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 18(3) of the Consumer Protection Act, 2002, a consumer must give notice within one " +
          "year after entering into the agreement if they seek to rescind it under s. 18(1), or seek " +
          "recovery under s. 18(2) where rescission is not possible. Under s. 18(4) and (5), the notice " +
          "may be expressed in any way, as long as it indicates the intention to rescind or seek " +
          "recovery and the reasons, and it may be delivered by any means.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
      },
      START,
      LIMITATION,
    ],
    signals: [
      "breeder sold me a sick puppy",
      "puppy was sick when we got it",
      "kitten died after we bought it",
      "pet store sold me a sick",
      "puppy had parvo",
      "not purebred like they said",
      "fake registration papers",
      "breeder lied about the health",
      "puppy mill",
      "vet bills for the new puppy",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Sale of Goods Act, R.S.O. 1990, c. S.1",
        officialUrl: SGA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1(1) \"goods\", 14, 15, 53",
      },
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1, 9(2)-(3), 14, 18",
      },
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-vet-negligence",
    name: "Harm caused by veterinary care",
    broughtBy:
      "An animal's owner whose pet or animal was hurt, or died, after care from a veterinarian or " +
      "animal clinic that the owner says fell below the expected standard. Not a dispute only about " +
      "the size of a vet bill.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "duty-and-standard-vet",
        name: "The vet owed a duty of care and did not meet the standard of care",
        plainExplanation:
          MUSTAPHA_ELEMENTS +
          "On the standard of care, in Ryan v. Victoria (City), [1999] 1 S.C.R. 201, the Court said " +
          "conduct is negligent if it creates an objectively unreasonable risk of harm, and to avoid " +
          "liability a person must exercise the standard of care that would be expected of an ordinary, " +
          "reasonable and prudent person in the same circumstances. What is reasonable depends on the " +
          "facts of each case, including the likelihood of a known or foreseeable harm, the gravity of " +
          "that harm, and the burden or cost of preventing the injury; one may also look to external " +
          "indicators of reasonable conduct, such as custom, industry practice, and statutory or " +
          "regulatory standards (para. 28). This part of the checklist is about what the vet was asked " +
          "to do, and what was done.",
        sourceUrl: RYAN,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: MUSTAPHA, pinpoint: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, para. 3" }],
        evidenceCategories: [
          {
            name: "The care given",
            why: "Shows what treatment was given, when, and by whom.",
            examples: ["The clinic's medical records for the animal", "Consent and estimate forms", "Invoices listing each procedure or drug"],
          },
          {
            name: "What the usual practice is",
            why: "Shows the standard the care can be measured against.",
            examples: ["A second vet's written opinion", "Discharge instructions", "Notes of what staff said at the time"],
          },
        ],
      },
      {
        id: "harm-caused-vet",
        name: "The care caused the harm",
        plainExplanation:
          "In Clements v. Clements, 2012 SCC 32, the Supreme Court of Canada said the test for showing " +
          "causation is the \"but for\" test: the plaintiff must show on a balance of probabilities that, " +
          "but for the defendant's negligent act, the injury would not have occurred. This is a factual " +
          "inquiry (para. 8). In Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, the Court listed " +
          "damage, and damage caused in fact and in law by the defendant's breach, among the things a " +
          "successful action in negligence requires (para. 3). This part of the checklist is about what " +
          "happened to the animal and what links it to the care.",
        sourceUrl: CLEMENTS,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: MUSTAPHA, pinpoint: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, para. 3" }],
        evidenceCategories: [
          {
            name: "What happened to the animal",
            why: "Shows the harm and when it appeared.",
            examples: ["Records from another clinic or an emergency hospital", "A necropsy report", "Photos and a dated timeline"],
          },
          {
            name: "The link to the care",
            why: "Shows how the harm connects to what the vet did or did not do.",
            examples: ["A second vet's opinion on the cause", "Test results before and after"],
          },
        ],
      },
      amountElement("vet", "This part of the checklist is about the costs that followed the care.", [
        "Bills from other clinics for follow-up care",
        "Receipts for medication",
        "A written list of each cost and its date",
      ]),
    ],
    defendantConsiderations: [
      {
        id: "owner-contributed-vet",
        name: "The clinic says the owner's own actions added to the harm",
        plainExplanation:
          "Under s. 3 of the Negligence Act, in any action for damages founded on the fault or negligence " +
          "of the defendant, if fault or negligence is found on the part of the plaintiff that contributed " +
          "to the damages, the court shall apportion the damages in proportion to the degree of fault or " +
          "negligence found against the parties.",
        whenThisComesUp:
          "When the clinic's Defence says the owner did not follow discharge instructions, delayed coming " +
          "back, or declined a recommended test or treatment.",
        sourceUrl: NEGLIGENCE,
        verifiedAt: VERIFIED,
        consolidationPeriod: NEGLIGENCE_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-contributory-negligence",
      "defence-set-off-or-counterclaim",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 24(1) of the Veterinarians Act, the Complaints Committee of the College of " +
          "Veterinarians of Ontario considers and investigates complaints made by members of the public " +
          "about the conduct of a member or former member of the College. It takes no action under " +
          "s. 24(2) unless a written complaint has been filed with the Registrar and the member has been " +
          "notified and given at least two weeks to submit an explanation in writing. Under s. 24(2), " +
          "the Committee may refer the matter to the Discipline Committee, direct that it not be " +
          "referred, or take other action it considers appropriate that is not inconsistent with the Act.",
        sourceUrl: VETS,
        verifiedAt: VERIFIED,
        consolidationPeriod: VETS_CONSOLIDATION,
      },
      START,
      LIMITATION,
    ],
    signals: [
      "vet negligence",
      "vet made a mistake",
      "my dog died after surgery at the vet",
      "vet misdiagnosed my cat",
      "wrong medication from the vet",
      "pet died at the clinic",
      "botched spay",
      "vet malpractice",
      "animal hospital made it worse",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: MUSTAPHA,
        verifiedAt: VERIFIED,
        pinpoint: "para. 3: the elements of negligence",
      },
      {
        sourceName: "Ryan v. Victoria (City), [1999] 1 S.C.R. 201",
        officialUrl: RYAN,
        verifiedAt: VERIFIED,
        pinpoint: "para. 28: the standard of care",
      },
      {
        sourceName: "Veterinarians Act, R.S.O. 1990, c. V.3",
        officialUrl: VETS,
        verifiedAt: VERIFIED,
        pinpoint: "s. 24: complaints to the College",
      },
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-scam-or-fraud-recovery",
    name: "Money lost to a scam or fraud",
    broughtBy:
      "A person or small business that paid money to someone who lied to get it -- a fake seller, a fake " +
      "contractor, an impersonation or phishing scheme -- and who knows, or can find out, who has the " +
      "money. Not a claim against a bank for a transaction the person did not make.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "false-representation-scam",
        name: "The person told a lie and knew it was false, or did not care",
        plainExplanation:
          FRAUD_TEST +
          "This part of the checklist is about the first two: what the person said, and what shows they " +
          "knew it was false or were reckless about whether it was true.",
        sourceUrl: HRYNIAK,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "What was said",
            why: "Shows the exact statement that was false.",
            examples: ["Texts, emails or chat messages", "The ad, listing or website", "Notes of phone calls with dates"],
          },
          {
            name: "Signs the person knew",
            why: "Shows the person knew the statement was false, or did not care.",
            examples: ["A fake name, address or business", "The same story told to others", "Messages after payment that stop or change"],
          },
        ],
      },
      {
        id: "acted-and-lost-scam",
        name: "The lie led to the payment, and money was lost",
        plainExplanation:
          FRAUD_TEST +
          "This part of the checklist is about the last two: what was paid or handed over because of " +
          "the lie, and what was lost.",
        sourceUrl: HRYNIAK,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The payment",
            why: "Shows what was paid, when, and to whom.",
            examples: ["E-transfer or wire confirmation", "Bank or credit card statements", "Receipts or gift card numbers"],
          },
          {
            name: "Why it was paid",
            why: "Connects the payment to what the person said.",
            examples: ["Messages just before the payment", "An invoice or request for payment"],
          },
        ],
      },
      {
        id: "received-and-kept-scam",
        name: "The person received the money and kept it with no reason in law",
        plainExplanation:
          "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said that for recovery in unjust " +
          "enrichment, something must have been given by the plaintiff and received and retained by the " +
          "defendant without juristic reason, and that the categories where keeping a benefit was " +
          "considered unjust included benefits conferred under mistakes of fact or law (para. 31). The " +
          "law permits recovery whenever the plaintiff can establish an enrichment of or benefit to the " +
          "defendant, a corresponding deprivation of the plaintiff, and the absence of a juristic reason " +
          "for the enrichment (para. 32). The third means there is no reason in law or justice for the " +
          "defendant's retention of the benefit (para. 40). This part of the checklist is about who " +
          "received the money and whether they still have it.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Where the money went",
            why: "Shows who received the money.",
            examples: ["The name on the receiving account", "The e-mail address or phone number an e-transfer went to", "A bank's letter about the transfer"],
          },
        ],
      },
      amountElement("scam", "This part of the checklist is about the total paid and anything already recovered.", [
        "A list of each payment with its date",
        "Any refund or chargeback already received",
      ]),
    ],
    defendantConsiderations: [
      {
        id: "did-not-know-scam",
        name: "The person who got the money says they did not know about the lie",
        plainExplanation:
          "In Hryniak v. Mauldin, 2014 SCC 7, the Supreme Court of Canada said the second element of " +
          "civil fraud is some level of knowledge of the falsehood of the representation on the part of " +
          "the defendant -- knowledge or recklessness (para. 87). In Kerr v. Baranow, 2011 SCC 10, the " +
          "Court said juristic reasons to deny recovery in unjust enrichment may be the intention to make " +
          "a gift, a contract, or a disposition of law (para. 41).",
        whenThisComesUp:
          "When the Defence says the money went through their account for someone else, that they were " +
          "paid it under a deal of their own, or that they never made the statement.",
        sourceUrl: HRYNIAK,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: KERR, pinpoint: "Kerr v. Baranow, 2011 SCC 10, para. 41" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [SCAM_REPORT, START, LIMITATION],
    signals: [
      "got scammed",
      "i was scammed",
      "fake seller took my money",
      "paid for something that never existed",
      "they pretended to be my bank",
      "phishing",
      "sent an e-transfer to a scammer",
      "lied to get my money",
      "fraudster",
      "know who scammed me",
    ],
    typicalDefendantProfile: "either",
    citations: [HRYNIAK_CITATION, CPO_SCAM_CITATION, LIMITATION_CITATION],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-romance-or-investment-scam",
    name: "A romance or investment scam",
    broughtBy:
      "A person who sent money to someone they met online or through a friend, after being told it was " +
      "for an emergency, a trip, a loan or an investment, and who later learned the story was false.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "false-story-romance",
        name: "The person told a false story and knew it was false, or did not care",
        plainExplanation:
          FRAUD_TEST +
          "This part of the checklist is about the first two: the story the person told, and what shows " +
          "they knew it was false or were reckless about whether it was true.",
        sourceUrl: HRYNIAK,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The story",
            why: "Shows exactly what the person said the money was for.",
            examples: ["Chat, text or dating-app messages", "Investment statements or dashboards they sent", "Photos or documents they shared"],
          },
          {
            name: "Signs it was false",
            why: "Shows the story was not true and the person knew it.",
            examples: ["A fake name or photos found elsewhere", "An investment site that disappeared", "Requests that kept growing"],
          },
        ],
      },
      {
        id: "sent-and-lost-romance",
        name: "The story led to the payments, and money was lost",
        plainExplanation:
          FRAUD_TEST +
          "This part of the checklist is about the last two: each payment made because of the story, and " +
          "what was lost.",
        sourceUrl: HRYNIAK,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The payments",
            why: "Shows each amount sent, when, and to whom.",
            examples: ["Bank, wire or e-transfer records", "Crypto or money-transfer receipts", "Gift card receipts"],
          },
        ],
      },
      {
        id: "not-a-gift-romance",
        name: "The money was not a gift",
        plainExplanation:
          "In Pecore v. Pecore, 2007 SCC 17, the Supreme Court of Canada said the presumption of resulting " +
          "trust is a rebuttable presumption of law and general rule that applies to gratuitous " +
          "transfers: where a transfer is made for no consideration, the onus is placed on the person who " +
          "received it to demonstrate that a gift was intended, because equity presumes bargains, not " +
          "gifts (para. 24). The Court said that, depending on the nature of the relationship between the " +
          "person who gave and the person who received, the presumption of resulting trust will not arise " +
          "and there will be a presumption of advancement instead; then it falls on the party " +
          "challenging the transfer to rebut the presumption of a gift (para. 27). " +
          BURDEN +
          "This part of the checklist is about what was said, at the time, about paying the money back.",
        sourceUrl: PECORE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: SCJ_STEPS, pinpoint: "Superior Court of Justice, Steps in a civil case (burden of proof)" }],
        evidenceCategories: [
          {
            name: "Words about repayment",
            why: "Shows the money was a loan or an investment, not a gift.",
            examples: ["Messages promising to pay it back", "Promised returns or payout dates", "A note or agreement"],
          },
        ],
      },
      amountElement("romance", "This part of the checklist is about the total sent and anything paid back.", [
        "A list of each payment with its date",
        "Any amounts returned as \"profits\" or repayments",
      ]),
    ],
    defendantConsiderations: [
      {
        id: "gift-romance",
        name: "The person says the money was a gift",
        plainExplanation:
          "In Pecore v. Pecore, 2007 SCC 17, the Supreme Court of Canada said that where a transfer is made " +
          "for no consideration, the onus is placed on the person who received it to demonstrate that a " +
          "gift was intended (para. 24), and that the presumption of resulting trust alters the general " +
          "practice that a plaintiff bears the legal burden in a civil case (para. 25).",
        whenThisComesUp: "When the Defence says the money was given freely during a relationship.",
        sourceUrl: PECORE,
        verifiedAt: VERIFIED,
      },
      {
        id: "real-investment-romance",
        name: "The person says it was a real investment that lost money",
        plainExplanation:
          "In Hryniak v. Mauldin, 2014 SCC 7, the Supreme Court of Canada said the elements of civil fraud " +
          "include a false representation by the defendant and some level of knowledge of the falsehood " +
          "of the representation on the part of the defendant, whether knowledge or recklessness " +
          "(para. 87).",
        whenThisComesUp:
          "When the Defence says the money was invested as promised and was lost in trading or a failed " +
          "business.",
        sourceUrl: HRYNIAK,
        verifiedAt: VERIFIED,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      SCAM_REPORT,
      {
        note:
          "Under s. 2(2) of the Consumer Protection Act, 2002, the Act does not apply to consumer " +
          "transactions regulated under the Securities Act, to financial services related to investment " +
          "products or income securities, or to consumer transactions regulated under the Commodity " +
          "Futures Act.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
      },
      LIMITATION,
    ],
    signals: [
      "romance scam",
      "met online and sent money",
      "catfished",
      "online boyfriend asked for money",
      "online girlfriend needed money",
      "investment scam",
      "fake investment",
      "promised big returns",
      "sent money for an emergency overseas",
      "pig butchering",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      HRYNIAK_CITATION,
      {
        sourceName: "Pecore v. Pecore, 2007 SCC 17",
        officialUrl: PECORE,
        verifiedAt: VERIFIED,
        pinpoint: "paras. 24-25, 27: the presumption of resulting trust",
      },
      CPO_SCAM_CITATION,
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-cryptocurrency-or-exchange-loss",
    name: "Cryptocurrency or an online exchange loss",
    broughtBy:
      "A customer of an online cryptocurrency exchange, trading app or seller who could not withdraw " +
      "their funds, never received the coins they paid for, or lost funds the platform held for them. " +
      "Not someone whose loss came only from prices going down.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "agreement-terms-crypto",
        name: "What the agreement with the platform or seller said",
        plainExplanation:
          "In Sattva Capital Corp. v. Creston Moly Corp., 2014 SCC 53, the Supreme Court of Canada said the " +
          "overriding concern in interpreting a contract is to determine the intent of the parties and the " +
          "scope of their understanding; to do so, a decision-maker must read the contract as a whole, " +
          "giving the words used their ordinary and grammatical meaning, consistent with the surrounding " +
          "circumstances known to the parties at the time of formation of the contract (para. 47). " +
          BURDEN +
          "This part of the checklist is about the account terms, the order, and what was promised.",
        sourceUrl: SATTVA,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: SCJ_STEPS, pinpoint: "Superior Court of Justice, Steps in a civil case (burden of proof)" }],
        evidenceCategories: [
          {
            name: "The terms",
            why: "Shows what the platform or seller agreed to do.",
            examples: ["The user agreement in force when the account was opened", "Order or trade confirmations", "Withdrawal rules or fee pages"],
          },
          {
            name: "The account",
            why: "Shows the balance and what happened to it.",
            examples: ["Account statements or screenshots with dates", "Deposit and withdrawal history", "Wallet addresses and transaction IDs"],
          },
        ],
      },
      {
        id: "promise-not-kept-crypto",
        name: "The platform or seller did not do what it promised",
        plainExplanation:
          "In Fidler v. Sun Life Assurance Co. of Canada, 2006 SCC 30, the Supreme Court of Canada said a " +
          "court should ask \"what did the contract promise?\" and provide compensation for those " +
          "promises; the aim of compensatory damages is to restore the wronged party to the position he " +
          "or she would have been in had the contract not been broken (para. 44). In Bhasin v. Hrynew, " +
          "2014 SCC 71, the Court said parties must not lie or otherwise knowingly mislead each other " +
          "about matters directly linked to the performance of the contract (para. 73). This part of the " +
          "checklist is about the withdrawal or delivery that did not happen, and what the platform said.",
        sourceUrl: FIDLER,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: BHASIN, pinpoint: "Bhasin v. Hrynew, 2014 SCC 71, para. 73" }],
        evidenceCategories: [
          {
            name: "The request and the reply",
            why: "Shows what was asked for and how the platform answered.",
            examples: ["Withdrawal requests and their status", "Support tickets and emails", "Notices that the account was frozen or closed"],
          },
        ],
      },
      {
        id: "deception-crypto",
        name: "If the platform or seller lied to get the money",
        plainExplanation:
          FRAUD_TEST +
          "This part of the checklist is about any statement that was false -- for example about the " +
          "platform being real, or about the coins being sent.",
        sourceUrl: HRYNIAK,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The statement",
            why: "Shows what was said and that it was false.",
            examples: ["The website or ad", "Messages from the seller or \"support\"", "Blockchain records showing no transfer"],
          },
        ],
      },
      amountElement("crypto", "This part of the checklist is about the money or coins lost and how their value was worked out.", [
        "Deposits made, with dates and amounts",
        "The value of the coins on the date chosen, and where that value came from",
      ]),
    ],
    defendantConsiderations: [
      {
        id: "terms-limit-liability-crypto",
        name: "The platform points to a term that limits or excludes its liability",
        plainExplanation:
          "In Tercon Contractors Ltd. v. British Columbia, 2010 SCC 4, the Supreme Court of Canada agreed on " +
          "the approach to an exclusion clause set out by Binnie J. (para. 62). The first issue is whether, " +
          "as a matter of interpretation, the exclusion clause even applies to the circumstances " +
          "established in evidence, which depends on the intention of the parties as expressed in the " +
          "contract. If it applies, the second issue is whether the clause was unconscionable at the time " +
          "the contract was made, as might arise from situations of unequal bargaining power. If the " +
          "clause is valid and applicable, the court may undertake a third enquiry: whether to refuse to " +
          "enforce it because of an overriding public policy, proof of which lies on the party seeking to " +
          "avoid enforcement of the clause (paras. 121-123).",
        whenThisComesUp:
          "When the platform's Defence says its user agreement excludes or caps its liability, or lets it " +
          "freeze accounts.",
        sourceUrl: TERCON,
        verifiedAt: VERIFIED,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 2(1) of the Consumer Protection Act, 2002, the Act applies to consumer transactions if " +
          "the consumer or the person engaging in the transaction with the consumer is located in Ontario " +
          "when the transaction takes place. Under s. 2(2), it does not apply to consumer transactions " +
          "regulated under the Securities Act, to financial services related to investment products or " +
          "income securities, or to consumer transactions regulated under the Commodity Futures Act.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
      },
      START,
      LIMITATION,
    ],
    signals: [
      "crypto exchange",
      "can't withdraw my crypto",
      "exchange froze my account",
      "bitcoin never arrived",
      "crypto platform shut down",
      "lost my coins",
      "trading app won't let me withdraw",
      "paid for bitcoin and got nothing",
      "crypto wallet emptied",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Fidler v. Sun Life Assurance Co. of Canada, 2006 SCC 30",
        officialUrl: FIDLER,
        verifiedAt: VERIFIED,
        pinpoint: "para. 44: what the contract promised",
      },
      {
        sourceName: "Tercon Contractors Ltd. v. British Columbia, 2010 SCC 4",
        officialUrl: TERCON,
        verifiedAt: VERIFIED,
        pinpoint: "paras. 62, 121-123: exclusion clauses",
      },
      HRYNIAK_CITATION,
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-defamation-online-or-in-print",
    name: "Something untrue posted about you online",
    broughtBy:
      "A person or small business about whom someone posted, published or printed something untrue " +
      "that harmed their reputation -- a social media post, an online review, a website, a flyer or a " +
      "newspaper. Not words said by an employer about an employee.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "words-defamatory-defo",
        name: "The words or images would tend to lower the person's reputation",
        plainExplanation:
          GRANT_ELEMENTS +
          "This part of the checklist is about the first: exactly what was posted or printed. Under " +
          "s. 1(2) of the Libel and Slander Act, any reference to words in that Act includes pictures, " +
          "visual images, gestures and other methods of signifying meaning.",
        sourceUrl: GRANT,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: LIBEL, pinpoint: "Libel and Slander Act, s. 1(2)" }],
        evidenceCategories: [
          {
            name: "The exact post or publication",
            why: "Shows what was said, where and when.",
            examples: ["Screenshots showing the date, the account and the web address", "A saved copy of the page", "The printed flyer or article"],
          },
        ],
      },
      {
        id: "about-and-published-defo",
        name: "The words were about the person and were seen by others",
        plainExplanation:
          GRANT_ELEMENTS +
          "If these elements are established on a balance of probabilities, falsity and damage are " +
          "presumed, and the plaintiff is not required to show that the defendant intended to do harm " +
          "(para. 28). This part of the checklist is about how readers would know the words meant this " +
          "person, and who saw them.",
        sourceUrl: GRANT,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Who the words point to",
            why: "Shows the words referred to this person or business.",
            examples: ["The name, photo or tag used", "Comments from readers naming the person"],
          },
          {
            name: "Who saw them",
            why: "Shows the words reached people other than the person they were about.",
            examples: ["Likes, shares, comments or view counts", "Messages from people who saw it", "Where the flyer or paper was handed out"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "truth-or-privilege-defo",
        name: "The poster says what was said was true, or was said on a protected occasion",
        plainExplanation:
          "In Grant v. Torstar Corp., 2009 SCC 61, the Supreme Court of Canada said that if the plaintiff " +
          "proves the required elements, the onus shifts to the defendant to advance a defence (para. 29). " +
          "Where statements of fact are at issue, usually only two defences are available: that the " +
          "statement was substantially true (justification), and that it was made in a protected context " +
          "(privilege) (para. 32). For justification, a defendant must adduce evidence showing that the " +
          "statement was substantially true (para. 33). In Hill v. Church of Scientology of Toronto, [1995] " +
          "2 S.C.R. 1130, the Court said qualified privilege is not absolute and can be defeated if the " +
          "dominant motive for publishing the statement is actual or express malice.",
        whenThisComesUp: "When the Defence says the post was true, or was a report to someone with a duty to hear it.",
        sourceUrl: GRANT,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: HILL, pinpoint: "Hill v. Church of Scientology of Toronto, [1995] 2 S.C.R. 1130 (qualified privilege)" }],
      },
      {
        id: "fair-comment-defo",
        name: "The poster says it was an opinion on a matter of public interest",
        plainExplanation:
          "In WIC Radio Ltd. v. Simpson, 2008 SCC 40, the Supreme Court of Canada endorsed this test for " +
          "the fair comment defence: the comment must be on a matter of public interest; it must be based " +
          "on fact; though it can include inferences of fact, it must be recognisable as comment; it must " +
          "satisfy the objective test of whether any person could honestly express that opinion on the " +
          "proved facts; and even if it does, the defence can be defeated if the plaintiff proves that " +
          "the defendant was actuated by express malice (para. 28).",
        whenThisComesUp: "When the Defence says the post or review was the writer's honest opinion.",
        sourceUrl: WIC,
        verifiedAt: VERIFIED,
      },
      {
        id: "public-interest-motion-defo",
        name: "The poster asks the court to dismiss the claim as being about public interest expression",
        plainExplanation:
          "Under s. 137.1(3) of the Courts of Justice Act, on motion by a person against whom a proceeding " +
          "is brought, a judge shall, subject to s. 137.1(4), dismiss the proceeding if the person " +
          "satisfies the judge that the proceeding arises from an expression made by the person that " +
          "relates to a matter of public interest. Under s. 137.1(4), a judge shall not dismiss it if the " +
          "responding party satisfies the judge that there are grounds to believe the proceeding has " +
          "substantial merit and the moving party has no valid defence, and that the harm likely to be or " +
          "have been suffered by the responding party as a result of the expression is sufficiently serious that the public interest in " +
          "permitting the proceeding to continue outweighs the public interest in protecting that " +
          "expression. Under s. 137.1(7), if a judge dismisses a proceeding under the section, the moving " +
          "party is entitled to costs on the motion and in the proceeding on a full indemnity basis, " +
          "unless the judge determines that such an award is not appropriate.",
        whenThisComesUp:
          "When the person sued brings a motion saying the post was about a matter of public interest, " +
          "such as a public review of a business or comment on a public issue.",
        sourceUrl: CJA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CJA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 5(1) of the Libel and Slander Act, no action for libel in a newspaper or in a broadcast " +
          "lies unless the plaintiff has, within six weeks after the alleged libel has come to their " +
          "knowledge, given the defendant notice in writing specifying the matter complained of. Under " +
          "s. 7, s. 5(1) and s. 6 apply only to newspapers printed and published in Ontario and to " +
          "broadcasts from a station in Ontario. Section 1(1) defines \"newspaper\" as a paper containing " +
          "public news, intelligence or occurrences, or remarks or observations on them, printed for " +
          "distribution to the public and published periodically at least twelve times a year.",
        sourceUrl: LIBEL,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIBEL_CONSOLIDATION,
      },
      {
        note:
          "Under s. 6 of the Libel and Slander Act, an action for a libel in a newspaper or in a broadcast " +
          "shall be commenced within three months after the libel has come to the knowledge of the person " +
          "defamed.",
        sourceUrl: LIBEL,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIBEL_CONSOLIDATION,
      },
      LIMITATION,
    ],
    signals: [
      "posted lies about me online",
      "defamatory post",
      "false facebook post about me",
      "fake review about my business",
      "libel",
      "ruined my reputation online",
      "false accusations on social media",
      "untrue google review",
      "printed something false about me",
      "defamation online",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Grant v. Torstar Corp., 2009 SCC 61",
        officialUrl: GRANT,
        verifiedAt: VERIFIED,
        pinpoint: "paras. 28-33: elements of defamation; justification and privilege",
      },
      {
        sourceName: "Libel and Slander Act, R.S.O. 1990, c. L.12",
        officialUrl: LIBEL,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1, 5(1), 6, 7: newspapers and broadcasts; notice and time",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: CJA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 137.1: dismissal of a proceeding about expression on a matter of public interest",
      },
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-privacy-breach-or-intrusion",
    name: "A privacy breach",
    broughtBy:
      "A person whose private records or affairs -- bank, health or employment records, private messages " +
      "or a diary -- were deliberately looked into by someone with no right to, such as a co-worker, an " +
      "ex-partner or a business's employee.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "intentional-intrusion-priv",
        name: "Someone deliberately intruded into the person's private affairs without lawful justification",
        plainExplanation:
          "In Jones v. Tsige, 2012 ONCA 32, the Court of Appeal for Ontario adopted, as the elements of the " +
          "action for intrusion upon seclusion, the rule that one who intentionally intrudes, physically or " +
          "otherwise, upon the seclusion of another or his private affairs or concerns, is subject to " +
          "liability for invasion of privacy if the invasion would be highly offensive to a reasonable " +
          "person (para. 70). The key features are, first, that the defendant's conduct must be " +
          "intentional, which includes reckless; and second, that the defendant must have invaded, without " +
          "lawful justification, the plaintiff's private affairs or concerns (para. 71). This part of the " +
          "checklist is about what was looked at or accessed, by whom, and how.",
        sourceUrl: JONES,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Proof of the access",
            why: "Shows who looked into the records, when, and how often.",
            examples: ["An access log or audit report", "A letter from the organization about the breach", "Messages showing the person knew private details"],
          },
          {
            name: "That it was deliberate",
            why: "Shows the access was intentional or reckless, not an accident.",
            examples: ["The number of times it happened", "No work reason for the access", "An admission or apology"],
          },
        ],
      },
      {
        id: "highly-offensive-priv",
        name: "A reasonable person would see the intrusion as highly offensive",
        plainExplanation:
          "In Jones v. Tsige, 2012 ONCA 32, the Court of Appeal for Ontario said the third key feature is " +
          "that a reasonable person would regard the invasion as highly offensive causing distress, " +
          "humiliation or anguish (para. 71). A claim arises only for deliberate and significant invasions " +
          "of personal privacy; it is only intrusions into matters such as one's financial or health " +
          "records, sexual practices and orientation, employment, diary or private correspondence that, " +
          "viewed objectively on the reasonable person standard, can be described as highly offensive " +
          "(para. 72). This part of the checklist is about what kind of information it was.",
        sourceUrl: JONES,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "What the information was",
            why: "Shows the records were of a private kind.",
            examples: ["The type of record (bank, health, employment, messages)", "How much was seen"],
          },
        ],
      },
      {
        id: "damages-priv",
        name: "What the intrusion did, and the amount claimed",
        plainExplanation:
          "In Jones v. Tsige, 2012 ONCA 32, the Court of Appeal for Ontario said proof of harm to a " +
          "recognized economic interest is not an element of the cause of action (para. 71). Where the " +
          "plaintiff has suffered no pecuniary loss, damages should be modest but sufficient to mark the " +
          "wrong, and the Court fixed the range at up to $20,000. Factors that help place a case in the " +
          "range include the nature, incidence and occasion of the wrongful act; its effect on the " +
          "plaintiff's health, welfare, social, business or financial position; any relationship between " +
          "the parties; any distress, annoyance or embarrassment suffered; and the conduct of the parties " +
          "before and after, including any apology or offer of amends (para. 87). This part of the " +
          "checklist is about how the intrusion affected the person.",
        sourceUrl: JONES,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The effect",
            why: "Shows the distress, embarrassment or other effects of the intrusion.",
            examples: ["Notes of how it affected sleep, work or relationships", "Any counselling or doctor's records", "Messages after the discovery"],
          },
          {
            name: "What happened afterward",
            why: "The conduct of both sides afterward is one of the factors.",
            examples: ["Any apology or offer", "Whether the access stopped"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "lawful-reason-priv",
        name: "The person says they had a lawful reason, or that free expression is at stake",
        plainExplanation:
          "In Jones v. Tsige, 2012 ONCA 32, the Court of Appeal for Ontario said the defendant must have " +
          "invaded the plaintiff's private affairs or concerns without lawful justification (para. 71). " +
          "It also said claims for the protection of privacy may give rise to competing claims, foremost " +
          "among them claims for the protection of freedom of expression and freedom of the press; no " +
          "right to privacy can be absolute, and many claims for the protection of privacy will have to " +
          "be reconciled with, and even yield to, such competing claims (para. 73).",
        whenThisComesUp:
          "When the Defence says the records were looked at for a work reason, with permission, or as " +
          "part of reporting on a public matter.",
        sourceUrl: JONES,
        verifiedAt: VERIFIED,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "For personal health information, under s. 56(1) of the Personal Health Information Protection " +
          "Act, 2004, a person who has reasonable grounds to believe another person has contravened the " +
          "Act may make a complaint to the Information and Privacy Commissioner; under s. 56(2) it must be " +
          "in writing and filed within one year after the subject-matter first came, or should reasonably " +
          "have come, to the complainant's attention, or a longer period the Commissioner permits. Under " +
          "s. 65(1), if the Commissioner has made an order under the Act that has become final, a person " +
          "affected by the order may commence a proceeding in the Superior Court of Justice for damages " +
          "for actual harm suffered as a result of a contravention of the Act.",
        sourceUrl: PHIPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: PHIPA_CONSOLIDATION,
      },
      START,
      LIMITATION,
    ],
    signals: [
      "snooped in my records",
      "looked at my medical file",
      "looked up my bank account",
      "read my private messages",
      "invasion of privacy",
      "privacy breach",
      "intrusion upon seclusion",
      "went through my private records",
      "co-worker accessed my file",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Jones v. Tsige, 2012 ONCA 32",
        officialUrl: JONES,
        verifiedAt: VERIFIED,
        pinpoint: "paras. 70-73, 87: intrusion upon seclusion and its damages",
      },
      {
        sourceName: "Personal Health Information Protection Act, 2004, S.O. 2004, c. 3, Sched. A",
        officialUrl: PHIPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 56(1)-(2), 65(1)",
      },
      SC_GUIDE_CITATION,
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },
];
