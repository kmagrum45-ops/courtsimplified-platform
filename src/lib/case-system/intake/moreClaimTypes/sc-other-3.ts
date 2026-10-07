/**
 * Case types, batch "sc-other-3" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-other-3.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-sports-league-or-camp-fees -- Sports league, club or camp fees
 *   sc-claim-charity-or-fundraising-dispute -- A charity or fundraising dispute
 *   sc-claim-elder-financial-abuse -- Money taken from an older person
 *   sc-claim-parking-traffic-or-bylaw-charge -- A parking ticket, traffic or by-law charge
 *   sc-claim-government-benefits-dispute -- A CRA, EI, CPP or social assistance decision
 *   sc-claim-copyright-or-intellectual-property -- Copyright or intellectual property
 *   sc-claim-hit-and-run-or-uninsured-driver -- A hit and run, or a driver with no insurance
 *
 * Every legal statement below rests on text saved in this repository: the
 * vendored corpus (docs/sources/corpus/, url from manifest.json) or a Supreme
 * Court decision saved under docs/sources/decisions/. Notes on what was left
 * out, and why:
 *   - sc-claim-copyright-or-intellectual-property is NOT written. Neither the
 *     Copyright Act nor any other intellectual-property statute or decision is
 *     saved, and nothing saved says which court hears these claims.
 *   - The Charities Accounting Act is not saved, so the charity type rests only
 *     on unjust enrichment (Kerr v. Baranow) and the general Small Claims rules.
 *   - The Motor Vehicle Accident Claims Act is not saved, so the hit-and-run
 *     type says nothing about how the Fund pays claims; it rests on the Highway
 *     Traffic Act, the Insurance Act (s. 265) and the Negligence Act.
 *   - sc-claim-government-benefits-dispute is NOT written. No benefits statute
 *     (Ontario Works Act, ODSP Act, Employment Insurance Act, Canada Pension
 *     Plan, Income Tax Act) is saved. The only saved pages that route these
 *     decisions (Tribunals Ontario's SBT page, Steps to Justice) are not on a
 *     domain the catalogue check accepts as official, so nothing could be said.
 *   - The parking type is a routing entry: the saved Provincial Offences Act
 *     says "court" in that Act is the Ontario Court of Justice; the entry states
 *     the steps and deadlines that Act and the Municipal Act, 2001 set.
 */

import type { ClaimType } from "../claimTypes";

const VERIFIED = "2026-10-07";

const SCJ_STEPS =
  "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/";
const SC_GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim";
const SC_RULES = "https://www.ontario.ca/laws/docs/980258_e.doc";
const SC_RULES_CONSOLIDATION = "2025-10-14";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_CONSOLIDATION = "2024-12-04";
const CPA = "https://www.ontario.ca/laws/docs/02c30_e.doc";
const CPA_CONSOLIDATION = "2025-12-11";
const CPA_REG = "https://www.ontario.ca/laws/docs/050017_e.doc";
const FCA = "https://www.ontario.ca/laws/docs/90f34_e.doc";
const FCA_CONSOLIDATION = "1993-12-02";
const SDA = "https://www.ontario.ca/laws/docs/92s30_e.doc";
const SDA_CONSOLIDATION = "2024-04-01";
const POA = "https://www.ontario.ca/laws/docs/90p33_e.doc";
const POA_CONSOLIDATION = "2026-04-15";
const MUNICIPAL = "https://www.ontario.ca/laws/docs/01m25_e.doc";
const MUNICIPAL_CONSOLIDATION = "2026-06-02";
const HTA = "https://www.ontario.ca/laws/docs/90h08_e.doc";
const HTA_CONSOLIDATION = "2026-07-01";
const INSURANCE = "https://www.ontario.ca/laws/docs/90i08_e.doc";
const INSURANCE_CONSOLIDATION = "2026-01-01";
const NEGLIGENCE = "https://www.ontario.ca/laws/docs/elaws_statutes_90n01_e.doc";
const NEGLIGENCE_CONSOLIDATION = "2004-01-01";
const KERR = "docs/sources/decisions/kerr-v-baranow-2011-SCC-10.english.txt";
const PECORE = "docs/sources/decisions/pecore-v-pecore-2007-SCC-17.english.txt";

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

const DEFENCE =
  "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
  "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
  "language with a reasonable amount of detail\", and a copy of any document the defence is " +
  "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a " +
  "defendant who wishes to dispute the claim serves the Defence on every other party and files " +
  "it, with proof of service, within 20 days of being served with the claim. ";

const UE_BENEFIT =
  "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said the law permits recovery for " +
  "unjust enrichment whenever the plaintiff can establish three elements: an enrichment of or " +
  "benefit to the defendant, a corresponding deprivation of the plaintiff, and the absence of a " +
  "juristic reason for the enrichment (para. 32). For the first, the plaintiff must show that he " +
  "or she gave something to the defendant which the defendant received and retained; the benefit " +
  "must be tangible, and one that can be restored to the plaintiff in specie or by money " +
  "(para. 38). For the second, the plaintiff must establish that the enrichment corresponds to a " +
  "deprivation the plaintiff has suffered (para. 39). ";

const UE_NO_REASON =
  "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said the third element of unjust " +
  "enrichment means there is no reason in law or justice for the defendant's retention of the " +
  "benefit conferred by the plaintiff (para. 40). Quoting Garland, the Court said the plaintiff " +
  "must first show that no juristic reason from an established category exists to deny recovery; " +
  "the established categories include a contract, a disposition of law, a donative intent (an " +
  "intention to make a gift), and other valid common law, equitable or statutory obligations " +
  "(para. 43). ";

const UE_GIFT =
  "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said juristic reasons to deny " +
  "recovery for unjust enrichment may be the intention to make a gift (a \"donative intent\"), a " +
  "contract, or a disposition of law (para. 41). Quoting Garland, it said that if the plaintiff " +
  "shows no reason from an established category exists, the defendant can still show another " +
  "reason to deny recovery, and there is a de facto burden of proof on the defendant to show why " +
  "the enrichment should be retained; courts look at the reasonable expectations of the parties " +
  "and public policy considerations (para. 43). ";

const LIMITATION_NOTE =
  "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding cannot " +
  "be started after the second anniversary of the day the claim was discovered. Section 5(1) sets " +
  "out when a claim is discovered, and under s. 5(2) a person with a claim is presumed to have " +
  "known of those matters on the day the act or omission the claim is based on took place, unless " +
  "the contrary is proved.";

const NAMING_NOTE =
  "This kind of claim is started with a Plaintiff's Claim (Form 7A). The Small Claims Court guide " +
  "says that if the name used on the claim is not exactly right, a person may win the case but then " +
  "be unable to enforce the judgment. For an incorporated company, it says to have the correct " +
  "corporate name, address and postal code; for a business that is not incorporated (for example a " +
  "sole proprietorship or partnership), the correct name of the business and the address for " +
  "service, and the proprietors or partners may also be named to obtain a judgment against them.";

const LIMITATION = { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: VERIFIED, consolidationPeriod: LIMITATIONS_CONSOLIDATION };
const NAMING = { note: NAMING_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED };

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
  pinpoint: "Reasons for claim; information to include about the defendant; the $50,000 limit",
};
const KERR_CITATION = {
  sourceName: "Kerr v. Baranow, 2011 SCC 10",
  officialUrl: KERR,
  verifiedAt: VERIFIED,
  pinpoint: "paras. 32, 38-41, 43",
};

export const TYPES_SC_OTHER_3: ClaimType[] = [
  // ------------------------------------------------------------------
  {
    id: "sc-claim-sports-league-or-camp-fees",
    name: "Sports league, club or camp fees",
    broughtBy:
      "A participant, or a parent or guardian, who paid fees to a sports league, club, team or camp " +
      "and wants the money back because the program was cancelled, cut short or never provided. Not " +
      "the league or club collecting unpaid fees from a member.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "fees-paid-camp",
        name: "Fees were paid for a program that was agreed on",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about what was agreed: the program or season, its dates, the " +
          "fees paid, and any refund or cancellation terms in the registration.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The registration",
            why: "Shows what program was signed up for, its dates and its terms.",
            examples: ["Registration form or confirmation email", "Program or season schedule", "Refund or cancellation policy"],
          },
          {
            name: "Proof of payment",
            why: "Shows how much was paid, when, and to whom.",
            examples: ["Receipts", "Bank or credit card statements", "E-transfer confirmations"],
          },
        ],
      },
      {
        id: "program-cancelled-camp",
        name: "The program was cancelled or could not go ahead",
        plainExplanation:
          "Under s. 2(1) of the Frustrated Contracts Act, the Act applies to any contract governed by " +
          "the law of Ontario that has become impossible of performance or been otherwise frustrated, " +
          "and to the parties which for that reason have been discharged (\"discharged\" means relieved " +
          "from further performance of the contract, s. 1). Under s. 3(1), sums paid to a party under " +
          "the contract before the parties were discharged are recoverable from that party, and sums " +
          "payable cease to be payable. This part of the checklist is about what happened to the " +
          "program, when, and why it did not go ahead.",
        sourceUrl: FCA,
        verifiedAt: VERIFIED,
        consolidationPeriod: FCA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Notice of the cancellation",
            why: "Shows that the program was cancelled or cut short, and the date.",
            examples: ["Cancellation email or post from the league or camp", "Messages from coaches or organizers"],
          },
          {
            name: "What was and was not provided",
            why: "Shows how much of the program took place before it stopped.",
            examples: ["Game, practice or camp-day schedule", "Attendance records", "Notes of sessions that did not happen"],
          },
        ],
      },
      {
        id: "consumer-protection-camp",
        name: "Whether the Consumer Protection Act's personal development services rules apply",
        plainExplanation:
          "Under s. 20(1) of the Consumer Protection Act, 2002, \"personal development services\" " +
          "include services provided for martial arts, sports, dance or similar activities, and " +
          "facilities provided for or instruction on those services. Under s. 29(1), ss. 30 to 36 apply " +
          "to personal development services for which payment in advance is required and the " +
          "consumer's total potential payment obligation, excluding the cost of borrowing, exceeds a " +
          "prescribed amount; O. Reg. 17/05, s. 27 prescribes $50. Under s. 29(2), those sections do " +
          "not apply to services provided on a non-profit or co-operative basis, by a private club " +
          "primarily owned by its members, as an incidental part of other goods or services, by a " +
          "supplier funded or run by a charitable or municipal organization or by the Province of " +
          "Ontario or any of its agencies, or by a golf club. Where they apply, s. 35(1) lets a " +
          "consumer cancel, without any reason, within 10 days after the later of receiving the written " +
          "copy of the agreement and the day all the services are available, and s. 35(2) lets a " +
          "consumer cancel within one year after entering into the agreement if the consumer does not " +
          "receive a copy of the agreement that meets the requirements under s. 30.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 27" }],
        evidenceCategories: [
          {
            name: "Who runs the program",
            why: "The Act's rules do not apply to some providers, such as non-profit, municipal or member-owned clubs.",
            examples: ["The organization's website or registration page", "Its business or non-profit name on receipts"],
          },
          {
            name: "The written agreement and its dates",
            why: "Shows whether a written copy was given, and when.",
            examples: ["The signed agreement", "The email that delivered it", "The date the program or facility opened"],
          },
        ],
      },
      {
        id: "amount-camp",
        name: "The amount claimed",
        plainExplanation:
          AMOUNT + "This part of the checklist is about the fees paid, any part refunded, and how the amount claimed was worked out.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "A calculation",
            why: "Shows how the amount claimed was reached.",
            examples: ["A list of payments and any refunds or credits", "Any request for a refund and the reply"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "expenses-kept-camp",
        name: "The league or camp says it may keep some fees for expenses",
        plainExplanation:
          "Under s. 3(2) of the Frustrated Contracts Act, if, before the parties were discharged, the " +
          "party to whom the sums were paid incurred expenses in connection with the performance of the " +
          "contract, the court, if it considers it just to do so having regard to all the " +
          "circumstances, may allow that party to retain the whole or any part of the sums paid, not " +
          "exceeding the amount of the expenses. In estimating the expenses, the court may include a " +
          "reasonable sum for overhead expenses and for work or services performed personally by that " +
          "party.",
        whenThisComesUp:
          "When the league or camp says it had already spent money getting ready -- fields, staff, " +
          "equipment or uniforms -- and should keep part of the fees.",
        sourceUrl: FCA,
        verifiedAt: VERIFIED,
        consolidationPeriod: FCA_CONSOLIDATION,
      },
      {
        id: "refund-terms-camp",
        name: "The registration terms say what happens if the program is cancelled",
        plainExplanation:
          "Under s. 3(6) of the Frustrated Contracts Act, where the contract contains a provision that, " +
          "on its true construction, is intended to have effect in the event of circumstances that " +
          "would frustrate the contract, the court shall give effect to the provision and shall give " +
          "effect to s. 3 only to the extent, if any, that appears to the court to be consistent with " +
          "the provision.",
        whenThisComesUp:
          "When the registration or policy says that, if the program is cancelled, fees become a credit, " +
          "are only partly refunded, or are not refunded.",
        sourceUrl: FCA,
        verifiedAt: VERIFIED,
        consolidationPeriod: FCA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [NAMING, LIMITATION],
    signals: [
      "hockey season was cancelled",
      "summer camp cancelled and no refund",
      "soccer league kept our registration fees",
      "camp refused to refund",
      "paid for the season and it never happened",
      "sports club will only give a credit",
      "the camp shut down early",
      "registration fee refund",
      "league folded and kept the money",
    ],
    typicalDefendantProfile: "either",
    citations: [
      { sourceName: "Frustrated Contracts Act, R.S.O. 1990, c. F.34", officialUrl: FCA, verifiedAt: VERIFIED, pinpoint: "ss. 1, 2(1), 3(1), 3(2), 3(6)" },
      { sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A", officialUrl: CPA, verifiedAt: VERIFIED, pinpoint: "s. 20(1) (\"personal development services\"); ss. 29(1)-(2), 35(1)-(2)" },
      SC_GUIDE_CITATION,
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-charity-or-fundraising-dispute",
    name: "A charity or fundraising dispute",
    broughtBy:
      "A person or group who gave or raised money for a cause -- a charity drive, a crowdfunding " +
      "campaign, a team or community fundraiser -- and says the person holding it kept it instead of " +
      "using it for that cause. Not a charity asking a donor to pay a pledge.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "money-given-charity",
        name: "Money was given or raised, and the other person received and kept it",
        plainExplanation:
          UE_BENEFIT +
          "This part of the checklist is about the money: who gave it, to whom, how much, and where it is now.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Records of the money given",
            why: "Shows what was given or raised and who received it.",
            examples: ["Donation receipts or e-transfer confirmations", "Crowdfunding campaign page and payout records", "Bank statements"],
          },
          {
            name: "Where the money went",
            why: "Shows that the person who received the money kept it.",
            examples: ["Messages from the organizer about the money", "Statements showing the money was not passed on"],
          },
        ],
      },
      {
        id: "purpose-promised-charity",
        name: "What the money was raised or given for",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about what the person collecting the money said it would be " +
          "used for, and what was done with it.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The appeal for money",
            why: "Shows the purpose that was described when the money was asked for.",
            examples: ["Screenshots of the fundraising page or post", "Flyers, emails or messages asking for donations"],
          },
          {
            name: "What happened to the cause",
            why: "Shows whether the money reached the cause it was given for.",
            examples: ["Messages from the intended recipient", "Updates or silence from the organizer"],
          },
        ],
      },
      {
        id: "no-reason-to-keep-charity",
        name: "There is no reason in law for the other person to keep the money",
        plainExplanation:
          UE_NO_REASON + "This part of the checklist is about any agreement or understanding about the money.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Any agreement about the money",
            why: "Shows what was agreed about how the money would be held and used.",
            examples: ["Messages agreeing who would hold the money", "Group or committee minutes", "Campaign terms"],
          },
        ],
      },
      {
        id: "amount-charity",
        name: "The amount claimed",
        plainExplanation:
          AMOUNT + "This part of the checklist is about the total given or raised, anything already passed on, and how the amount claimed was worked out.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "A calculation",
            why: "Shows how the amount claimed was reached.",
            examples: ["A list of donations or contributions", "Any demand for the money and the reply"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "was-a-gift-charity",
        name: "The other person says the money was a gift to them, or they had a reason to keep it",
        plainExplanation: UE_GIFT,
        whenThisComesUp:
          "When the Defence says the money was given to the organizer personally, or that there was an " +
          "agreement allowing them to keep it.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
      },
      {
        id: "dispute-charity",
        name: "The other person disputes the claim",
        plainExplanation:
          DEFENCE + "This topic is about a Defence whose reasons say the money was used for the cause, or was never received.",
        whenThisComesUp: "When the person who received the money files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [NAMING, LIMITATION],
    signals: [
      "fundraiser kept the money",
      "gofundme money never went to the family",
      "crowdfunding organizer kept the donations",
      "donations were not used for the cause",
      "the money we raised was taken",
      "team fundraiser money missing",
      "charity drive money kept",
      "organizer spent the donations",
    ],
    typicalDefendantProfile: "either",
    citations: [KERR_CITATION, SC_GUIDE_CITATION, LIMITATION_CITATION],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-elder-financial-abuse",
    name: "Money taken from an older person",
    broughtBy:
      "An older person whose money was taken or used without their agreement -- by a family member, " +
      "a caregiver, an attorney under a power of attorney, or someone else they trusted -- or the " +
      "litigation guardian who brings the claim for them.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "transfer-without-payment-elder",
        name: "Money or property was transferred for nothing in return",
        plainExplanation:
          "In Pecore v. Pecore, 2007 SCC 17, the Supreme Court of Canada said the presumption of " +
          "resulting trust is a rebuttable presumption of law and general rule that applies to " +
          "gratuitous transfers: where a transfer is made for no consideration, the onus is placed on " +
          "the person who received it to demonstrate that a gift was intended, because \"equity " +
          "presumes bargains, not gifts\" (para. 24). The Court said it is common for ageing parents to " +
          "transfer their assets into joint accounts with their adult children so the child can help " +
          "manage their financial affairs, and that there should be a rebuttable presumption that the " +
          "adult child is holding the property in trust for the ageing parent (para. 36). This part of " +
          "the checklist is about each transfer: when, how much, to whom, and whether anything was " +
          "given in return.",
        sourceUrl: PECORE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Bank and account records",
            why: "Shows each transfer, withdrawal or change to an account.",
            examples: ["Bank statements", "Records of joint accounts being opened", "Cheques or e-transfers to the other person"],
          },
          {
            name: "What was said about the money",
            why: "Shows whether the money was a loan, help with managing affairs, or something else.",
            examples: ["Letters, texts or emails about the money", "Notes made at the time", "People who heard what was agreed"],
          },
        ],
      },
      {
        id: "attorney-duties-elder",
        name: "If the person was an attorney under a power of attorney: they broke their duties",
        plainExplanation:
          "Under s. 38(1) of the Substitute Decisions Act, 1992, s. 32 and s. 33 apply, with necessary " +
          "modifications, to an attorney acting under a continuing power of attorney if the grantor is " +
          "incapable of managing property or the attorney has reasonable grounds to believe that the " +
          "grantor is incapable of managing property. Under s. 32(1), a guardian of property is a " +
          "fiduciary whose powers and duties shall be exercised and performed diligently, with honesty " +
          "and integrity and in good faith, for the incapable person's benefit. Under s. 33(1), a " +
          "guardian of property is liable for damages resulting from a breach of the guardian's duty.",
        sourceUrl: SDA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SDA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The power of attorney",
            why: "Shows who was named and what kind of power of attorney it is.",
            examples: ["A copy of the continuing power of attorney for property", "Any letters the bank received about it"],
          },
          {
            name: "Records about the person's capacity",
            why: "The duties in s. 38(1) apply when the person is, or there are reasonable grounds to believe they are, incapable of managing property.",
            examples: ["A capacity assessment", "Doctor's notes about memory or decision-making"],
          },
          {
            name: "What the attorney did with the money",
            why: "Shows spending that was not for the person's benefit.",
            examples: ["Account statements during the attorney's control", "Receipts or the attorney's own records"],
          },
        ],
      },
      {
        id: "unjust-enrichment-elder",
        name: "The other person was enriched at the older person's expense",
        plainExplanation:
          UE_BENEFIT +
          "The third element, absence of a juristic reason, means there is no reason in law or justice " +
          "for the defendant's retention of the benefit (para. 40).",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "What the other person gained",
            why: "Shows the benefit received and kept.",
            examples: ["Purchases made with the money", "Deposits into the other person's account"],
          },
          {
            name: "What the older person lost",
            why: "Shows the loss that matches the other person's gain.",
            examples: ["Account balances before and after", "Bills left unpaid because money was gone"],
          },
        ],
      },
      {
        id: "amount-elder",
        name: "The amount claimed",
        plainExplanation:
          AMOUNT + "This part of the checklist is about the total taken and how it was worked out.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "A list of the transfers",
            why: "Shows how the amount claimed was reached.",
            examples: ["A table of each transfer or withdrawal with its date and amount", "Bank statements for each item"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "was-a-gift-elder",
        name: "The other person says the money was a gift",
        plainExplanation:
          UE_GIFT +
          "In Pecore v. Pecore, 2007 SCC 17, the Court said that where a transfer is made for no " +
          "consideration, the onus is placed on the person who received it to demonstrate that a gift " +
          "was intended (para. 24).",
        whenThisComesUp: "When the Defence says the older person meant to give the money away.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: PECORE, pinpoint: "Pecore v. Pecore, 2007 SCC 17, para. 24" }],
      },
      {
        id: "acted-honestly-elder",
        name: "The attorney says they acted honestly, reasonably and diligently",
        plainExplanation:
          "Under s. 33(2) of the Substitute Decisions Act, 1992, if the court is satisfied that a " +
          "guardian of property who has committed a breach of duty has nevertheless acted honestly, " +
          "reasonably and diligently, it may relieve the guardian from all or part of the liability. " +
          "Under s. 38(1), s. 33 also applies, with necessary modifications, to an attorney acting " +
          "under a continuing power of attorney when the grantor is incapable of managing property or " +
          "the attorney has reasonable grounds to believe so.",
        whenThisComesUp: "When an attorney under a power of attorney says any mistake was an honest one.",
        sourceUrl: SDA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SDA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under rule 4.01(1) of the Rules of the Small Claims Court, an action by a person under " +
          "disability is started or continued by a litigation guardian. Under rule 4.01(3), the " +
          "litigation guardian files a consent (Form 4A) that, among other things, states the nature of " +
          "the disability, sets out their relationship to the person, states that they have no " +
          "interest in the proceeding contrary to that of the person, and acknowledges that they are " +
          "aware of their liability to pay personally any costs awarded against them or the person.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        note:
          "An accounting is a separate step in a different court. Under s. 42(1) of the Substitute " +
          "Decisions Act, 1992, the court may, on application, order that all or a specified part of " +
          "the accounts of an attorney or guardian of property be passed, and under s. 42(2) the " +
          "attorney, the grantor or a person listed in s. 42(4) may apply. In that Act, \"court\" means " +
          "the Superior Court of Justice (s. 1).",
        sourceUrl: SDA,
        verifiedAt: VERIFIED,
        consolidationPeriod: SDA_CONSOLIDATION,
      },
      {
        note:
          LIMITATION_NOTE +
          " Under s. 7(1), the two-year period does not run while the person with the claim is " +
          "incapable of starting a proceeding because of their physical, mental or psychological " +
          "condition and is not represented by a litigation guardian; under s. 7(2), a person is " +
          "presumed to have been capable at all times unless the contrary is proved.",
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "my son took money from my mother's account",
      "caregiver took money from my father",
      "power of attorney spent her money",
      "grandson emptied his bank account",
      "money missing from an elderly parent's account",
      "added to the joint account and took the money",
      "my sister used dad's money for herself",
      "taking advantage of my grandmother financially",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      { sourceName: "Pecore v. Pecore, 2007 SCC 17", officialUrl: PECORE, verifiedAt: VERIFIED, pinpoint: "paras. 24, 36" },
      { sourceName: "Substitute Decisions Act, 1992, S.O. 1992, c. 30", officialUrl: SDA, verifiedAt: VERIFIED, pinpoint: "ss. 1, 32(1), 33(1)-(2), 38(1), 42(1)-(2)" },
      KERR_CITATION,
      { sourceName: "Rules of the Small Claims Court, O. Reg. 258/98", officialUrl: SC_RULES, verifiedAt: VERIFIED, pinpoint: "r. 4.01(1), (3)" },
      { ...LIMITATION_CITATION, pinpoint: "ss. 4, 5(1)-(2), 7(1)-(2)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-parking-traffic-or-bylaw-charge",
    name: "A parking ticket, traffic or by-law charge",
    broughtBy:
      "A person who got a parking ticket, a traffic ticket or a by-law penalty and wants to dispute " +
      "it. These are decided under the Provincial Offences Act or a municipality's own penalty system, " +
      "not by the Small Claims Court.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "kind-of-ticket-parking",
        name: "Which kind of ticket it is",
        plainExplanation:
          "Under s. 3(1) and (2) of the Provincial Offences Act, a provincial offences officer who " +
          "believes a person has committed an offence may issue a certificate of offence and either an " +
          "offence notice indicating the set fine for the offence, or a summons; under s. 3(3), the " +
          "offence notice or summons is served personally on the person charged within thirty days " +
          "after the alleged offence. Parking is dealt with separately: under s. 15(1), an officer who " +
          "believes from personal knowledge that a parking infraction has been committed may issue a " +
          "certificate of parking infraction and a parking infraction notice indicating the set fine, " +
          "and under s. 15(4) the notice may be served on the vehicle's owner by affixing it to the " +
          "vehicle in a conspicuous place at the time of the alleged infraction. This part of the " +
          "checklist is about which of these was received, and when.",
        sourceUrl: POA,
        verifiedAt: VERIFIED,
        consolidationPeriod: POA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The ticket itself",
            why: "Shows the kind of ticket, the charge, the date and the options.",
            examples: ["Both sides of the ticket", "A photo of the ticket if the original is lost"],
          },
          {
            name: "What happened",
            why: "Records the facts while they are fresh.",
            examples: ["Photos of the signs, the spot or the meter", "Notes of the date, time and place", "Names of witnesses"],
          },
        ],
      },
      {
        id: "ask-for-trial-parking",
        name: "Asking for a trial, or a meeting with the prosecutor, in time",
        plainExplanation:
          "Under s. 1(1) of the Provincial Offences Act, \"court\" means the Ontario Court of Justice. " +
          "Under s. 5(1), a defendant served with an offence notice may give notice of their intention " +
          "to appear in court to enter a plea and have a trial, in the ways the section sets out. Under " +
          "s. 5.1(2), where the offence notice offers it, the defendant may instead request a meeting " +
          "with the prosecutor to discuss resolving the offence, within 15 days after being served. " +
          "Under s. 9(1)(a), a defendant is deemed to not wish to dispute the charge if at least 15 " +
          "days have passed after being served and they did not give notice of intention to appear, " +
          "request a meeting, or plead guilty; under s. 9(2), the clerk then examines the certificate " +
          "of offence and, if it is not defective, enters a conviction without a hearing and imposes " +
          "the set fine.",
        sourceUrl: POA,
        verifiedAt: VERIFIED,
        consolidationPeriod: POA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Dates",
            why: "The 15-day periods run from the day the ticket was served.",
            examples: ["The date the ticket was given or served", "The date the notice or request was delivered"],
          },
          {
            name: "Proof the notice was delivered",
            why: "Shows the notice of intention to appear, or the meeting request, reached the court office named on the notice.",
            examples: ["Online confirmation", "A stamped copy or mailing receipt"],
          },
        ],
      },
      {
        id: "parking-infraction-parking",
        name: "For a parking infraction notice: asking for a trial",
        plainExplanation:
          "Under s. 17(1) of the Provincial Offences Act, a defendant served with a parking infraction " +
          "notice may give notice of intention to appear in court to enter a plea and have a trial, by " +
          "so indicating on the notice and delivering it to the place specified in it. Under s. 17(2), " +
          "if the defendant does so, a proceeding may be commenced on the charge if it is done within " +
          "seventy-five days after the day of the alleged infraction. Under s. 16, a defendant who does " +
          "not wish to dispute the charge may deliver the notice and the set fine to the place shown on " +
          "the notice.",
        sourceUrl: POA,
        verifiedAt: VERIFIED,
        consolidationPeriod: POA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The parking infraction notice",
            why: "Shows where the notice of intention to appear is to be delivered.",
            examples: ["Both sides of the notice", "The date of the alleged infraction"],
          },
          {
            name: "Ownership and use of the vehicle",
            why: "A parking charge can be laid against the owner of the vehicle.",
            examples: ["Vehicle permit", "Notes of who was driving"],
          },
        ],
      },
      {
        id: "administrative-penalty-parking",
        name: "For a municipal by-law penalty: the city's own penalty system",
        plainExplanation:
          "Under s. 434.1(1) of the Municipal Act, 2001, a municipality may require a person, subject to " +
          "conditions it considers appropriate, to pay an administrative penalty if it is satisfied the " +
          "person has failed to comply with one of its by-laws passed under that Act. Under s. 434.1(3), " +
          "the amount shall not be punitive in nature and shall not exceed the amount reasonably " +
          "required to promote compliance with the by-law. Under s. 434.1(4), a person required to pay " +
          "an administrative penalty for a contravention shall not be charged with an offence for the " +
          "same contravention. Section 102.1(1) separately allows administrative penalties for " +
          "failing to comply with by-laws on the parking, standing or stopping of vehicles.",
        sourceUrl: MUNICIPAL,
        verifiedAt: VERIFIED,
        consolidationPeriod: MUNICIPAL_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The penalty notice",
            why: "Shows whether it is an administrative penalty or a provincial offence ticket, and how to dispute it.",
            examples: ["The penalty notice", "The municipality's instructions for a review"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "convicted-without-hearing-parking",
        name: "A conviction was entered without a hearing",
        plainExplanation:
          "Under s. 9(3) of the Provincial Offences Act, a defendant convicted under s. 9(2) may, within " +
          "15 days after becoming aware of the conviction, apply to a justice to strike out the " +
          "conviction; under s. 9(4), the justice shall strike it out if satisfied that the certificate " +
          "of offence is defective, or is otherwise not complete and regular on its face. Separately, " +
          "under s. 11(1), a defendant convicted without a hearing may, within 15 days after becoming " +
          "aware of the conviction, apply to have it struck out; under s. 11(2), the clerk strikes it " +
          "out if satisfied that, through no fault of the defendant, they were unable to attend a " +
          "meeting under s. 5.1, were unable to appear for a hearing, or did not receive delivery of a " +
          "notice or document relating to the offence.",
        whenThisComesUp:
          "When the time to dispute the ticket passed, or a hearing or meeting was missed, and a " +
          "conviction was entered.",
        sourceUrl: POA,
        verifiedAt: VERIFIED,
        consolidationPeriod: POA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: [],
    proceduralNotes: [
      {
        note:
          "Not the Small Claims Court. Under s. 1(1) of the Provincial Offences Act, \"court\" in that " +
          "Act means the Ontario Court of Justice, and a defendant who wants a trial gives notice of " +
          "intention to appear under s. 5(1) (offence notice) or s. 17(1) (parking infraction notice).",
        sourceUrl: POA,
        verifiedAt: VERIFIED,
        consolidationPeriod: POA_CONSOLIDATION,
      },
      {
        note:
          "For a parking ticket that is neither paid nor disputed. Under s. 18(1) of the Provincial " +
          "Offences Act, the person designated by the regulations may give the defendant a notice of " +
          "impending conviction if at least fifteen and no more than thirty-five days have passed since " +
          "the alleged infraction, the fine has not been paid, and a notice of intention to appear has " +
          "not been received. Under s. 18(3), the notice indicates the set fine and that a conviction " +
          "will be registered unless the defendant pays it or gives notice of an intention to appear for " +
          "a trial; under s. 18.1(1), the defendant may give that notice on the notice of impending " +
          "conviction and deliver it to the place specified in it.",
        sourceUrl: POA,
        verifiedAt: VERIFIED,
        consolidationPeriod: POA_CONSOLIDATION,
      },
    ],
    signals: [
      "I got a parking ticket",
      "fight a speeding ticket",
      "traffic ticket I want to dispute",
      "by-law fine",
      "parking infraction notice",
      "city parking penalty",
      "ticket for something I did not do",
      "convicted of a ticket I never received",
    ],
    typicalDefendantProfile: "either",
    citations: [
      { sourceName: "Provincial Offences Act, R.S.O. 1990, c. P.33", officialUrl: POA, verifiedAt: VERIFIED, pinpoint: "ss. 1(1), 3(1)-(3), 5(1), 5.1(2), 9(1)-(4), 11(1)-(2), 15(1), (4), 16, 17(1)-(2), 18(1), (3), 18.1(1)" },
      { sourceName: "Municipal Act, 2001, S.O. 2001, c. 25", officialUrl: MUNICIPAL, verifiedAt: VERIFIED, pinpoint: "ss. 102.1(1), 434.1(1), (3), (4)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-hit-and-run-or-uninsured-driver",
    name: "A hit and run, or a driver with no insurance",
    broughtBy:
      "A person whose vehicle or property was damaged, or who was hurt, by a driver who left the " +
      "scene or who had no insurance, suing that driver or the vehicle's owner.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "driver-negligence-hitrun",
        name: "The driver was negligent, and who is answerable for it",
        plainExplanation:
          "Under s. 192(1) of the Highway Traffic Act, the driver of a motor vehicle is liable for loss " +
          "or damage sustained by any person by reason of negligence in the operation of the motor " +
          "vehicle on a highway. Under s. 192(2), the owner is also liable for that loss or damage, " +
          "unless the vehicle was, without the owner's consent, in the possession of someone other than " +
          "the owner or the owner's chauffeur. Under s. 192(6), the driver, owner, lessee and operator " +
          "who are liable under the section are jointly and severally liable.",
        sourceUrl: HTA,
        verifiedAt: VERIFIED,
        consolidationPeriod: HTA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Records of the collision",
            why: "Shows how it happened and what the other vehicle did.",
            examples: ["Police or collision reporting centre report number", "Photos of the scene and the damage", "Dashcam or security video"],
          },
          {
            name: "Witnesses",
            why: "People who saw it can describe the other vehicle and driver.",
            examples: ["Names and contact details of witnesses", "Written statements made soon after"],
          },
        ],
      },
      {
        id: "identify-driver-hitrun",
        name: "Who the driver and owner are",
        plainExplanation:
          "Under s. 200(1) of the Highway Traffic Act, where an accident occurs on a highway, every " +
          "person in charge of a vehicle directly or indirectly involved shall remain at or immediately " +
          "return to the scene, render all possible assistance, and, upon request, give in writing to " +
          "anyone sustaining loss or injury their name, address, driver's licence number and " +
          "jurisdiction of issuance, motor vehicle liability insurance policy insurer and policy number, " +
          "the name and address of the registered owner of the vehicle, and the vehicle permit number. " +
          "This part of the checklist is about what is known of the other driver and vehicle.",
        sourceUrl: HTA,
        verifiedAt: VERIFIED,
        consolidationPeriod: HTA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Details of the other vehicle",
            why: "A claim needs the names of the people being sued.",
            examples: ["Licence plate number", "Make, model and colour", "Any details the driver gave before leaving"],
          },
          {
            name: "Police follow-up",
            why: "Shows what the police found about the driver or owner.",
            examples: ["Report number and officer's name", "Letters or emails from the police"],
          },
        ],
      },
      {
        id: "amount-hitrun",
        name: "The amount claimed",
        plainExplanation:
          AMOUNT + "This part of the checklist is about the repair costs, other losses, and how they add up.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Repair and loss records",
            why: "Shows the cost of the damage.",
            examples: ["Repair estimates or invoices", "Towing and rental car receipts", "Insurance deductible paid"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "contributory-negligence-hitrun",
        name: "The driver says the person suing was partly at fault",
        plainExplanation:
          "Under s. 3 of the Negligence Act, in an action for damages founded on the fault or negligence " +
          "of the defendant, if fault or negligence is found on the part of the plaintiff that " +
          "contributed to the damages, the court shall apportion the damages in proportion to the degree " +
          "of fault or negligence found against the parties. Under s. 1, where two or more persons are " +
          "found at fault, they are jointly and severally liable to the person suffering the loss.",
        whenThisComesUp: "When the Defence says the person suing, or another driver, caused or contributed to the collision.",
        sourceUrl: NEGLIGENCE,
        verifiedAt: VERIFIED,
        consolidationPeriod: NEGLIGENCE_CONSOLIDATION,
      },
      {
        id: "plaintiff-uninsured-hitrun",
        name: "The vehicle damaged was itself required to be insured and was not",
        plainExplanation:
          "Under s. 265(7) of the Insurance Act, no person has a right of action against any other " +
          "person for damage to an uninsured automobile or its contents arising directly or indirectly " +
          "from the use or operation of an automobile if, at the time of the damage, the uninsured " +
          "automobile was required by any Act to be insured under a contract evidenced by a motor " +
          "vehicle liability policy.",
        whenThisComesUp: "When the Defence says the vehicle of the person suing had no insurance at the time.",
        sourceUrl: INSURANCE,
        verifiedAt: VERIFIED,
        consolidationPeriod: INSURANCE_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-contributory-negligence"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Your own policy may cover this. Under s. 265(1) of the Insurance Act, every contract " +
          "evidenced by a motor vehicle liability policy shall provide for payment of the sums a person " +
          "insured under it is legally entitled to recover from the owner or driver of an uninsured or " +
          "unidentified automobile as damages for bodily injuries, and from the identified owner or " +
          "driver of an uninsured automobile as damages for accidental damage to the insured automobile " +
          "or its contents, subject to the terms, conditions, provisions, exclusions and limits " +
          "prescribed by the regulations. Under s. 265(2), an \"unidentified automobile\" is one where " +
          "the identity of either the owner or driver cannot be ascertained. Under s. 265(6), where an " +
          "amount is paid, the insurer is subrogated to the rights of the person paid and may sue those " +
          "responsible for the uninsured or unidentified automobile.",
        sourceUrl: INSURANCE,
        verifiedAt: VERIFIED,
        consolidationPeriod: INSURANCE_CONSOLIDATION,
      },
      {
        note:
          "For an injury claim. Under s. 258.3(1) of the Insurance Act, an action for loss or damage " +
          "from bodily injury or death arising directly or indirectly from the use or operation of an " +
          "automobile shall not be started unless the plaintiff has applied for statutory accident " +
          "benefits and has served written notice of the intention to start the action on the defendant " +
          "within 120 days after the incident, or within a longer period a court authorizes on a motion " +
          "made before or after the 120 days end, along with the other steps the subsection lists.",
        sourceUrl: INSURANCE,
        verifiedAt: VERIFIED,
        consolidationPeriod: INSURANCE_CONSOLIDATION,
      },
      LIMITATION,
    ],
    signals: [
      "hit and run",
      "the driver drove off after hitting my car",
      "other driver had no insurance",
      "uninsured driver hit me",
      "someone hit my parked car and left",
      "driver fled the scene",
      "the other car's insurance was cancelled",
      "I have the plate number of the driver who hit me",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      { sourceName: "Highway Traffic Act, R.S.O. 1990, c. H.8", officialUrl: HTA, verifiedAt: VERIFIED, pinpoint: "ss. 192(1), (2), (6), 200(1)" },
      { sourceName: "Insurance Act, R.S.O. 1990, c. I.8", officialUrl: INSURANCE, verifiedAt: VERIFIED, pinpoint: "ss. 258.3(1), 265(1), (2), (6), (7)" },
      { sourceName: "Negligence Act, R.S.O. 1990, c. N.1", officialUrl: NEGLIGENCE, verifiedAt: VERIFIED, pinpoint: "ss. 1, 3" },
      SC_GUIDE_CITATION,
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },
];
