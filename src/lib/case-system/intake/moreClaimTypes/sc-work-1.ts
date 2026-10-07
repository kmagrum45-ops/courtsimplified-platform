/**
 * Case types, batch "sc-work-1" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-work-1.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-unpaid-tips -- Unpaid tips
 *   sc-claim-unpaid-severance -- Unpaid severance or termination pay
 *   sc-claim-unpaid-bonus-after-termination -- A bonus or commission unpaid after leaving
 *   sc-claim-contractor-misclassification -- Being treated as a contractor when you were not
 *   sc-claim-gig-platform-payment -- A gig platform that will not pay
 *   sc-claim-caregiver-or-domestic-worker-unpaid -- A nanny, caregiver or domestic worker unpaid
 *   sc-claim-employer-suing-former-employee -- An employer suing a former employee
 *   sc-claim-bad-reference-or-employer-defamation -- Something untrue said by an employer
 *   sc-claim-non-compete-or-non-solicit -- A non-compete or non-solicit clause
 *
 * Every legal statement below rests on text saved in this repository: the
 * vendored corpus (docs/sources/corpus/, url from manifest.json) or a Supreme
 * Court decision saved under docs/sources/decisions/. Notes on what was left
 * out, and why:
 *   - Matthews v. Ocean Nutrition, 2020 SCC 26 (bonus during the notice
 *     period) is saved, but has no public page in publicSourceUrl.ts, so the
 *     bonus type does not rely on it. Nothing here says whether a bonus is owed
 *     for a period of reasonable notice.
 *   - No saved source sets out a test for telling an employee from an
 *     independent contractor, so none is stated; the misclassification type
 *     rests on the ESA's definitions and s. 5.1.
 *   - The Digital Platform Workers' Rights Act, 2022 is not saved, so the gig
 *     type says nothing about it.
 *   - The ESA regulation with special rules for some home workers is not
 *     saved, so the caregiver type rests only on the Act's general rules.
 *   - No saved source speaks to non-solicitation clauses; only the ESA's
 *     non-compete rules (Part XV.1) are stated.
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
const ESA = "https://www.ontario.ca/laws/docs/00e41_e.doc";
const ESA_CONSOLIDATION = "2026-01-01";
const ESA_TERMINATION_GUIDE = "https://www.ontario.ca/document/your-guide-employment-standards-act-0/termination-employment";
const LIBEL = "https://www.ontario.ca/laws/docs/90l12_e.doc";
const LIBEL_CONSOLIDATION = "2015-11-03";
const KERR = "docs/sources/kerr-v-baranow-2011-SCC-10.pdf";
const MACHTINGER = "docs/sources/decisions/machtinger-v-hoj-industries-1992-1-SCR-986.html.txt";
const HONDA = "docs/sources/decisions/honda-canada-v-keays-2008-SCC-39.english.txt";
const GRANT = "docs/sources/decisions/grant-v-torstar-2009-SCC-61.english.txt";
const HILL = "docs/sources/decisions/hill-v-church-of-scientology-1995-2-SCR-1130.html.txt";
const UBER = "docs/sources/decisions/uber-technologies-inc-v-heller-2020-SCC-16.english.txt";

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

const ESA_EMPLOYEE =
  "Under s. 1(1) of the Employment Standards Act, 2000, an \"employee\" includes a person who " +
  "performs work for an employer for wages, and a person who supplies services to an employer for " +
  "wages, and includes a person who was an employee. \"Wages\" include monetary remuneration " +
  "payable by an employer to an employee under the terms of an employment contract, oral or " +
  "written, express or implied. ";

const ESA_NO_TREATING =
  "Under s. 5.1(1), an employer shall not treat a person who is its employee as if the person " +
  "were not an employee under the Act. ";

const ESA_NO_CONTRACTING_OUT =
  "Under s. 5(1) of the Employment Standards Act, 2000, no employer or employee shall contract " +
  "out of or waive an employment standard, and any such contracting out or waiver is void. ";

const UE_TEST =
  "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada said the law permits recovery " +
  "for unjust enrichment whenever the plaintiff can establish three elements: an enrichment of or " +
  "benefit to the defendant, a corresponding deprivation of the plaintiff, and the absence of a " +
  "juristic reason for the enrichment (para. 32). For the first, the plaintiff must show that he " +
  "or she gave something to the defendant which the defendant received and retained; the benefit " +
  "must be tangible, and it must be one that can be restored to the plaintiff in specie or by " +
  "money (para. 38). The third element means there is no reason in law or justice for the " +
  "defendant's retention of the benefit conferred by the plaintiff (para. 40). ";

const ESA_CHOICE_NOTE =
  "Under s. 97(1) of the Employment Standards Act, 2000, an employee who files a complaint " +
  "under the Act about an alleged failure to pay wages may not start a civil proceeding about " +
  "the same matter, unless the complaint is withdrawn within two weeks after it is filed " +
  "(s. 97(4)). Under s. 98(1), an employee who starts a civil proceeding about an alleged " +
  "failure to pay wages may not file a complaint about the same matter or have one " +
  "investigated.";

const ESA_DIRECTOR_NOTE =
  "Under s. 8(2) of the Employment Standards Act, 2000, where an employee starts a civil " +
  "proceeding against their employer under the Act, notice of the proceeding is served on the " +
  "Director on a form approved by the Director, on or before the date the proceeding is set " +
  "down for trial.";

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

const ESA_CHOICE = { note: ESA_CHOICE_NOTE, sourceUrl: ESA, verifiedAt: VERIFIED, consolidationPeriod: ESA_CONSOLIDATION };
const ESA_DIRECTOR = { note: ESA_DIRECTOR_NOTE, sourceUrl: ESA, verifiedAt: VERIFIED, consolidationPeriod: ESA_CONSOLIDATION };
const LIMITATION = { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: VERIFIED, consolidationPeriod: LIMITATIONS_CONSOLIDATION };
const START = { note: START_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED };

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
const esaCitation = (pinpoint: string) => ({
  sourceName: "Employment Standards Act, 2000, S.O. 2000, c. 41",
  officialUrl: ESA,
  verifiedAt: VERIFIED,
  pinpoint,
});

export const TYPES_SC_WORK_1: ClaimType[] = [
  // ------------------------------------------------------------------
  {
    id: "sc-claim-unpaid-tips",
    name: "Unpaid tips",
    broughtBy:
      "An employee or former employee whose tips were kept, cut or taken back by the employer. Not a " +
      "customer, and not a worker suing a co-worker.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "money-was-a-tip-tips",
        name: "The money was a tip or other gratuity paid for the employee",
        plainExplanation:
          "Under s. 1(1) of the Employment Standards Act, 2000, a \"tip or other gratuity\" includes a " +
          "payment voluntarily made to or left for an employee by a customer of the employer, in such " +
          "circumstances that a reasonable person would be likely to infer that the customer intended " +
          "or assumed the payment would be kept by the employee or shared with other employees. It " +
          "also includes a payment a customer voluntarily makes to the employer, and a service charge " +
          "or similar charge the employer imposes on a customer, in such circumstances that a " +
          "reasonable person would be likely to infer the customer intended or assumed it would be " +
          "redistributed to an employee or employees. " +
          ESA_EMPLOYEE +
          "This part of the checklist is about the tips customers left, how they were paid (cash, card " +
          "or a service charge), and the work the employee did.",
        sourceUrl: ESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ESA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Records of the tips",
            why: "Shows what customers paid as tips during the employee's shifts.",
            examples: ["Card terminal or point-of-sale tip reports", "Receipts showing tips or a service charge", "Shift schedules"],
          },
          {
            name: "Proof of the job",
            why: "Shows the person was an employee of this employer.",
            examples: ["Pay stubs", "Record of Employment", "Offer letter or schedule messages"],
          },
        ],
      },
      {
        id: "tips-withheld-tips",
        name: "The employer kept, deducted or took back the tips",
        plainExplanation:
          "Under s. 14.2(1) of the Employment Standards Act, 2000, an employer shall not withhold tips " +
          "or other gratuities from an employee, make a deduction from them, or cause the employee to " +
          "return or give them to the employer, unless authorized to do so under that Part of the Act. " +
          "Under s. 14.2(2), if an employer does that, the amount withheld, deducted, returned or given " +
          "is a debt owing to the employee and is enforceable under the Act as if it were wages owing. " +
          "Under s. 14.1(1), an employer pays an employee's tips by cash, by cheque payable only to the " +
          "employee, by direct deposit, or by another prescribed method. This part of the checklist is " +
          "about what happened to the tips.",
        sourceUrl: ESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ESA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "What the employee received",
            why: "Shows the gap between tips collected and tips paid out.",
            examples: ["Pay stubs or tip-out sheets", "Bank deposits", "Cash envelopes or tip logs"],
          },
          {
            name: "The employer's tip rules",
            why: "Shows how the employer said tips would be handled.",
            examples: ["A posted tip policy", "Messages from a manager about tips", "Staff handbook"],
          },
        ],
      },
      {
        id: "amount-tips",
        name: "The amount of tips not paid",
        plainExplanation:
          AMOUNT + "This part of the checklist is about the total kept back and how it was worked out.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "A running total",
            why: "Shows how the amount claimed was calculated.",
            examples: ["A list of shifts with tips earned and tips paid", "Any request for payment and the reply"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "tip-pool-tips",
        name: "The employer says the tips were pooled, or a law or court order allowed it",
        plainExplanation:
          "Under s. 14.4(1) of the Employment Standards Act, 2000, an employer may withhold or deduct " +
          "tips, or have them given back, if it collects and redistributes tips among some or all of " +
          "its employees. Under s. 14.4(3), the employer, or a director or shareholder of the employer, " +
          "may not share in the redistributed tips, except (ss. 14.4(4) and (5)) a sole proprietor, " +
          "partner, director or shareholder who regularly performs to a substantial degree the same " +
          "work performed by some or all of the employees who share in the redistribution, or by " +
          "employees of other employers in the same industry who commonly receive or share tips. Under " +
          "s. 14.3(1), an employer may also withhold or deduct tips if a statute of Ontario or Canada " +
          "or a court order authorizes it.",
        whenThisComesUp:
          "When the employer's Defence says the tips went into a tip pool, were shared with other staff, " +
          "or were taken under a law or court order.",
        sourceUrl: ESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ESA_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [ESA_CHOICE, ESA_DIRECTOR, LIMITATION],
    signals: [
      "my tips",
      "kept our tips",
      "boss took the tips",
      "employer kept my tips",
      "tips were never paid out",
      "tip out",
      "tip pool",
      "manager shares the tips",
      "service charge never went to staff",
      "gratuities were withheld",
    ],
    typicalDefendantProfile: "business",
    citations: [esaCitation("s. 1(1) \"tip or other gratuity\"; ss. 14.1-14.4; ss. 97-98"), SC_GUIDE_CITATION, LIMITATION_CITATION],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-unpaid-severance",
    name: "Unpaid severance or termination pay",
    broughtBy:
      "An employee whose job was ended -- let go, fired without cause, or forced out -- and who was " +
      "not given the notice, termination pay or severance pay owed. Not an employee who quit on their " +
      "own.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "employment-ended-severance",
        name: "The employer ended the employment",
        plainExplanation:
          "Under s. 56(1) of the Employment Standards Act, 2000, an employer terminates employment if " +
          "it dismisses the employee or otherwise refuses or is unable to continue employing them; if " +
          "it constructively dismisses the employee and the employee resigns in response within a " +
          "reasonable period; or if it lays the employee off for longer than a temporary lay-off. The " +
          "Ministry's guide to the Act says a constructive dismissal may occur when an employer makes a " +
          "significant change to a fundamental term or condition of employment without the employee's " +
          "actual or implied consent. This part of the checklist is about how and when the job ended.",
        sourceUrl: ESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ESA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: ESA_TERMINATION_GUIDE, pinpoint: "Your guide to the ESA: Termination of employment > Constructive dismissal" }],
        evidenceCategories: [
          {
            name: "How the job ended",
            why: "Shows the date and the way the employment ended.",
            examples: ["Termination letter or email", "Record of Employment", "Messages about a lay-off or a change to the job"],
          },
          {
            name: "The length of the job",
            why: "Notice and severance depend on how long the person was employed.",
            examples: ["Offer letter or first pay stub", "T4 slips from each year"],
          },
        ],
      },
      {
        id: "notice-or-pay-owed-severance",
        name: "The notice, termination pay or severance pay the Act requires was not given",
        plainExplanation:
          "Under s. 54 of the Employment Standards Act, 2000, no employer shall terminate an employee " +
          "who has been continuously employed for three months or more unless it has given written " +
          "notice under s. 57 or 58 and the notice has expired, or has complied with s. 61. Section 57 " +
          "sets the notice from at least one week (less than one year of employment) up to at least " +
          "eight weeks (eight years or more). Under s. 61(1), an employer may give less notice if it " +
          "pays termination pay in a lump sum equal to what the employee would have received during " +
          "the notice and continues benefit plan contributions for that period. Separately, under " +
          "s. 64(1), an employer who severs the employment of an employee employed for five years or " +
          "more pays severance pay if the employer has a payroll of $2.5 million or more, or the " +
          "severance was part of a permanent discontinuance of all or part of the business at an " +
          "establishment in which 50 or more employees had their employment severed within six months. " +
          "Under s. 65(1), severance pay is the employee's regular wages for a regular work week times " +
          "the years and months of employment completed. This part of the checklist is about what was " +
          "given and what was not.",
        sourceUrl: ESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ESA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "What was paid at the end",
            why: "Shows whether termination or severance pay was paid, and how much.",
            examples: ["Final pay stub", "Record of Employment", "Any severance offer or release"],
          },
          {
            name: "The employer's size",
            why: "Severance pay under the Act depends on the employer's payroll or on a mass closure.",
            examples: ["Number of staff or locations", "Notices about a closure"],
          },
        ],
      },
      {
        id: "reasonable-notice-severance",
        name: "Reasonable notice under the employment contract",
        plainExplanation:
          "In Machtinger v. HOJ Industries Ltd., [1992] 1 S.C.R. 986, the Supreme Court of Canada said " +
          "that employment contracts for an indefinite period require the employer, absent express " +
          "contractual language to the contrary, to give reasonable notice of an intention to " +
          "terminate the contract if the dismissal is without cause. It said the Act's minimum notice " +
          "periods do not displace that presumption, and that a contract term giving less than the " +
          "Act's minimum is null and void and cannot be used as evidence of the parties' intention. In " +
          "Honda Canada Inc. v. Keays, 2008 SCC 39, the Court said courts have generally applied the " +
          "Bardal factors: the character of the employment, the length of service, the employee's age, " +
          "and the availability of similar employment having regard to the employee's experience, " +
          "training and qualifications (paras. 28-29). This part of the checklist is about the contract " +
          "and those facts.",
        sourceUrl: MACHTINGER,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: HONDA, pinpoint: "Honda Canada Inc. v. Keays, 2008 SCC 39, paras. 28-29" }],
        evidenceCategories: [
          {
            name: "The employment contract",
            why: "Shows any term about notice or termination.",
            examples: ["Signed offer letter or contract", "Any later agreement or policy on termination"],
          },
          {
            name: "The job and the person",
            why: "Records the facts the Bardal factors look at.",
            examples: ["Job title and duties", "Training and qualifications", "Job search records after the dismissal"],
          },
        ],
      },
      {
        id: "amount-severance",
        name: "The amount owed",
        plainExplanation:
          AMOUNT + "This part of the checklist is about the weeks of pay claimed and how they were worked out.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Pay rate and a calculation",
            why: "Shows how the amount claimed was reached.",
            examples: ["Pay stubs showing regular weekly pay", "A written calculation of the weeks claimed"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "exempt-from-notice-severance",
        name: "The employer says the employee was not entitled to notice or termination pay",
        plainExplanation:
          "The Ministry's guide to the Employment Standards Act, 2000 says the notice of termination and " +
          "termination pay requirements do not apply to some employees, including one who is guilty of " +
          "wilful misconduct, disobedience or wilful neglect of duty that is not trivial and has not " +
          "been condoned by the employer; one employed in construction; one who has refused an offer of " +
          "reasonable alternative employment with the employer; and one on a temporary lay-off. The " +
          "guide says poor work conduct that is accidental or unintentional is generally not considered " +
          "wilful. Under s. 54 of the Act, the notice rule applies to an employee continuously employed " +
          "for three months or more.",
        whenThisComesUp:
          "When the employer's Defence says the employee was fired for misconduct, worked in " +
          "construction, refused another job offered, or had not worked there for three months.",
        sourceUrl: ESA_TERMINATION_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: ESA, pinpoint: "Employment Standards Act, 2000, s. 54" }],
      },
      {
        id: "contract-clause-severance",
        name: "The employer points to a termination clause in the contract",
        plainExplanation:
          ESA_NO_CONTRACTING_OUT +
          "In Machtinger v. HOJ Industries Ltd., [1992] 1 S.C.R. 986, the Supreme Court of Canada said " +
          "the common law presumption of reasonable notice is rebuttable if the contract of employment " +
          "clearly specifies some other period of notice, whether expressly or impliedly; and that " +
          "contract terms giving less than the Act's minimum notice are null and void and cannot be " +
          "used as evidence of the parties' intention.",
        whenThisComesUp:
          "When the employer's Defence says the contract limited notice to the Act's minimum or to a set " +
          "number of weeks.",
        sourceUrl: MACHTINGER,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: ESA, pinpoint: "Employment Standards Act, 2000, s. 5(1)" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "The Ministry's guide to the Employment Standards Act, 2000 says the Act's termination and " +
          "severance rules are minimum requirements, and some employees may have greater rights under " +
          "the common law; an employee may sue a former employer in court for \"wrongful dismissal\". " +
          "The guide says an employee cannot both sue for wrongful dismissal and file a claim for " +
          "termination pay or severance pay with the ministry for the same termination or severance; " +
          "an employee must choose one or the other.",
        sourceUrl: ESA_TERMINATION_GUIDE,
        verifiedAt: VERIFIED,
      },
      ESA_DIRECTOR,
      LIMITATION,
    ],
    signals: [
      "never got my termination pay",
      "owed termination pay",
      "termination pay was not paid",
      "severance pay was not paid",
      "esa severance pay",
      "statutory severance",
      "laid off and never called back",
      "laid off for more than 35 weeks",
    ],
    typicalDefendantProfile: "business",
    citations: [
      esaCitation("ss. 54, 56(1), 57, 61(1), 64(1), 65(1)"),
      {
        sourceName: "Machtinger v. HOJ Industries Ltd., [1992] 1 S.C.R. 986",
        officialUrl: MACHTINGER,
        verifiedAt: VERIFIED,
        pinpoint: "Reasonable notice at common law; effect of the Employment Standards Act",
      },
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-unpaid-bonus-after-termination",
    name: "A bonus or commission unpaid after leaving",
    broughtBy:
      "A former employee who left or was let go and was not paid a bonus or commission earned while " +
      "they worked there. Not a current employee, and not an employer.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "earned-under-terms-bonus",
        name: "The bonus or commission was earned under the terms of the job",
        plainExplanation:
          "Under s. 1(1) of the Employment Standards Act, 2000, \"wages\" means monetary remuneration " +
          "payable by an employer to an employee under the terms of an employment contract, oral or " +
          "written, express or implied, and any payment the Act requires. Wages do not include sums " +
          "paid as gifts or bonuses that are dependent on the discretion of the employer and are not " +
          "related to hours, production or efficiency. " +
          BURDEN +
          "This part of the checklist is about the bonus or commission terms and what was earned " +
          "before the job ended.",
        sourceUrl: ESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ESA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: SCJ_STEPS, pinpoint: "Superior Court of Justice, Steps in a civil case (burden of proof)" }],
        evidenceCategories: [
          {
            name: "The terms",
            why: "Shows how the bonus or commission was to be earned and worked out.",
            examples: ["Commission or bonus plan", "Employment contract or offer letter", "Emails setting targets"],
          },
          {
            name: "What was earned before leaving",
            why: "Shows the sales, targets or results reached while employed.",
            examples: ["Sales reports or closed deals", "Performance or target reports", "Past bonus payments"],
          },
        ],
      },
      {
        id: "unpaid-at-end-bonus",
        name: "It was not paid when the job ended",
        plainExplanation:
          "Under s. 11(5) of the Employment Standards Act, 2000, when employment ends the employer pays " +
          "any wages the employee is entitled to no later than the later of seven days after the " +
          "employment ends and the day that would have been the employee's next pay day. " +
          ESA_NO_CONTRACTING_OUT +
          "This part of the checklist is about the last day of work and what was paid after it.",
        sourceUrl: ESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ESA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The end of the job",
            why: "Shows when the employment ended.",
            examples: ["Resignation or termination letter", "Record of Employment"],
          },
          {
            name: "Pay after leaving",
            why: "Shows what was and was not paid.",
            examples: ["Final pay stub", "Bank deposits after the last day", "Requests for the payment and any reply"],
          },
        ],
      },
      {
        id: "amount-bonus",
        name: "The amount owed",
        plainExplanation:
          AMOUNT + "This part of the checklist is about the bonus or commission claimed and how it was calculated.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "A calculation",
            why: "Shows how the amount claimed was reached.",
            examples: ["The plan's formula applied to the sales or results", "A list of each deal and its commission"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "discretionary-or-conditions-bonus",
        name: "The employer says the bonus was discretionary, or a condition was not met",
        plainExplanation:
          DEFENCE +
          "Under s. 1(1) of the Employment Standards Act, 2000, \"wages\" do not include sums paid as " +
          "gifts or bonuses that are dependent on the discretion of the employer and are not related " +
          "to hours, production or efficiency.",
        whenThisComesUp:
          "When the employer's Defence says the bonus was at its discretion, or that the plan required the " +
          "person to still be employed on the payout date.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: ESA, pinpoint: "Employment Standards Act, 2000, s. 1(1), \"wages\"" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [ESA_CHOICE, ESA_DIRECTOR, LIMITATION],
    signals: [
      "bonus after i left",
      "bonus after i was fired",
      "didn't pay my bonus when i quit",
      "commission owed after leaving",
      "commissions on deals i closed before i left",
      "year-end bonus after termination",
      "lost my bonus when they let me go",
      "final commission cheque",
    ],
    typicalDefendantProfile: "business",
    citations: [esaCitation("s. 1(1) \"wages\"; s. 5(1); s. 11(5); ss. 97-98"), SC_GUIDE_CITATION, LIMITATION_CITATION],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-contractor-misclassification",
    name: "Being treated as a contractor when you were not",
    broughtBy:
      "A worker who was called a contractor or freelancer, or paid on invoices, but says they were " +
      "really an employee and is owed what employees get under the Employment Standards Act.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "was-an-employee-misclass",
        name: "The worker was an employee under the Act",
        plainExplanation:
          ESA_EMPLOYEE +
          "An \"employer\" includes an owner, proprietor or manager of a business or undertaking who has " +
          "control or direction of, or is directly or indirectly responsible for, the employment of a " +
          "person in it. " +
          ESA_NO_TREATING +
          "This part of the checklist is about how the work was done: who set the hours and tasks, who " +
          "supplied the tools, and how pay was set.",
        sourceUrl: ESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ESA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "How the work was directed",
            why: "Shows who controlled the work and the schedule.",
            examples: ["Schedules or shift messages", "Instructions or supervision emails", "Company email, uniform or ID"],
          },
          {
            name: "How pay worked",
            why: "Shows the pay arrangement between the two.",
            examples: ["Contractor agreement", "Invoices and payments", "Messages setting the rate"],
          },
        ],
      },
      {
        id: "standard-not-given-misclass",
        name: "An employment standard was not given",
        plainExplanation:
          ESA_NO_CONTRACTING_OUT +
          "Under s. 1(1), an \"employment standard\" means a requirement or prohibition under the Act " +
          "that applies to an employer for the benefit of an employee. Examples in the Act include " +
          "paying at least the minimum wage (s. 23(1)), paying all wages earned in each pay period by " +
          "the pay day (s. 11(1)), and written notice or termination pay when employment of three " +
          "months or more is ended (s. 54). This part of the checklist is about which standard was not " +
          "met.",
        sourceUrl: ESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ESA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Hours and pay",
            why: "Shows what was worked and what was paid.",
            examples: ["Time records or a work diary", "Invoices and bank deposits"],
          },
          {
            name: "How it ended, if it did",
            why: "Shows whether notice or termination pay was given.",
            examples: ["The message ending the arrangement", "The date of the last payment"],
          },
        ],
      },
      {
        id: "amount-misclass",
        name: "The amount owed",
        plainExplanation:
          AMOUNT + "This part of the checklist is about each amount claimed and how it was worked out.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "A calculation",
            why: "Shows how the amount claimed was reached.",
            examples: ["A table of hours, pay received and the minimum owed", "Weeks of notice claimed and the weekly pay"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "says-contractor-misclass",
        name: "The business says the worker was an independent contractor",
        plainExplanation:
          DEFENCE +
          "Under s. 5.1(1) of the Employment Standards Act, 2000, an employer shall not treat a person " +
          "who is its employee as if the person were not an employee under the Act. Under s. 5(1), no " +
          "employer or employee shall contract out of or waive an employment standard, and any such " +
          "contracting out or waiver is void.",
        whenThisComesUp:
          "When the Defence points to a contractor agreement, invoices, or the worker's own business " +
          "number to say the worker was not an employee.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: ESA, pinpoint: "Employment Standards Act, 2000, ss. 5(1) and 5.1(1)" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [ESA_CHOICE, ESA_DIRECTOR, LIMITATION],
    signals: [
      "treated as a contractor",
      "called me a contractor",
      "independent contractor but",
      "misclassified",
      "paid on invoices",
      "they said i was self-employed",
      "made me sign a contractor agreement",
      "no vacation pay as a contractor",
      "really an employee",
    ],
    typicalDefendantProfile: "business",
    citations: [esaCitation("s. 1(1) \"employee\", \"employer\", \"employment standard\"; ss. 5(1), 5.1(1)"), SC_GUIDE_CITATION, LIMITATION_CITATION],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-gig-platform-payment",
    name: "A gig platform that will not pay",
    broughtBy:
      "A driver, courier or other worker who found jobs through an app or online platform and was not " +
      "paid for work done, or had pay held back.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "platform-terms-gig",
        name: "What the platform agreed to pay",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the platform's terms, the pay rate for each job, and " +
          "any change the platform made to them.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The terms",
            why: "Shows what the platform said it would pay.",
            examples: ["Screenshots or a saved copy of the terms you accepted", "Rate cards or pay notices in the app"],
          },
        ],
      },
      {
        id: "work-done-unpaid-gig",
        name: "The work was done and not paid",
        plainExplanation:
          AMOUNT + "This part of the checklist is about each job completed and the payment missing for it.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Jobs completed",
            why: "Shows the work was done.",
            examples: ["Trip or delivery history from the app", "Customer confirmations or ratings"],
          },
          {
            name: "Payments",
            why: "Shows what was paid and what is missing.",
            examples: ["Weekly earnings statements", "Bank deposits", "Support tickets about missing pay"],
          },
        ],
      },
      {
        id: "employee-status-gig",
        name: "If claiming what employees get: the worker was an employee",
        plainExplanation:
          ESA_EMPLOYEE +
          ESA_NO_TREATING +
          "This part of the checklist applies only if the claim includes something the Employment " +
          "Standards Act gives employees, such as minimum wage or termination pay.",
        sourceUrl: ESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ESA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "How the platform directed the work",
            why: "Shows who set the rules for the work.",
            examples: ["Rules for accepting or refusing jobs", "Deactivation or rating warnings", "How prices were set"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "arbitration-clause-gig",
        name: "The platform says its terms send disputes to arbitration",
        plainExplanation:
          "In Uber Technologies Inc. v. Heller, 2020 SCC 16, a food delivery driver in Toronto had to " +
          "accept, without negotiation, Uber's standard form services agreement, which required any " +
          "dispute to be resolved through mediation and arbitration in the Netherlands, with up-front " +
          "fees of US$14,500 (para. 2). The Supreme Court of Canada agreed that this arbitration " +
          "agreement was unconscionable, calling it one that makes it impossible for one party to " +
          "arbitrate (para. 4). The Court said unconscionability requires both an inequality of " +
          "bargaining power and a resulting improvident bargain (para. 65), and that an inequality of " +
          "bargaining power exists when one party cannot adequately protect their interests in the " +
          "contracting process (para. 66).",
        whenThisComesUp:
          "When the platform asks the court to stop the claim because its terms say disputes go to " +
          "arbitration.",
        sourceUrl: UBER,
        verifiedAt: VERIFIED,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [START, LIMITATION],
    signals: [
      "delivery app won't pay me",
      "rideshare driver not paid",
      "the app held my earnings",
      "deactivated and kept my pay",
      "gig app",
      "courier app owes me",
      "platform didn't pay for my deliveries",
      "missing payouts from the app",
    ],
    typicalDefendantProfile: "business",
    citations: [
      SC_GUIDE_CITATION,
      {
        sourceName: "Uber Technologies Inc. v. Heller, 2020 SCC 16",
        officialUrl: UBER,
        verifiedAt: VERIFIED,
        pinpoint: "paras. 2-4 and 65-66: unconscionable arbitration clause in a driver's agreement",
      },
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-caregiver-or-domestic-worker-unpaid",
    name: "A nanny, caregiver or domestic worker unpaid",
    broughtBy:
      "A nanny, caregiver, housekeeper or other worker hired by a household to work in the home, who " +
      "was not paid what they earned.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "hired-by-household-caregiver",
        name: "The household employed the worker",
        plainExplanation:
          ESA_EMPLOYEE +
          "This part of the checklist is about who hired the worker, what was agreed about the work " +
          "and the pay, and when the work started and ended. The agreement can be oral or written.",
        sourceUrl: ESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ESA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The agreement",
            why: "Shows who hired the worker and on what terms.",
            examples: ["A written contract", "Texts or emails about the job and the pay", "A job posting or ad"],
          },
          {
            name: "Who the employer was",
            why: "Identifies the person or people to name as defendants.",
            examples: ["Names and address of the household", "Messages from the parents or family member who managed the work"],
          },
        ],
      },
      {
        id: "wages-not-paid-caregiver",
        name: "Wages earned were not paid",
        plainExplanation:
          "Under s. 11(1) of the Employment Standards Act, 2000, an employer establishes a recurring pay " +
          "period and pay day and pays all wages earned during each pay period by the pay day. Under " +
          "s. 23(1), an employer pays employees at least the minimum wage; under s. 23(2), if the " +
          "employer provides room or board, the prescribed amount for it is deemed to have been paid as " +
          "wages. Under s. 13(1), an employer shall not withhold wages, make a deduction from them, or " +
          "cause the employee to return them unless authorized under that section. This part of the " +
          "checklist is about the pay agreed and the pay received.",
        sourceUrl: ESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ESA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Pay received",
            why: "Shows what was paid and when.",
            examples: ["E-transfers or cheques", "Cash notes or a pay log", "Bank statements"],
          },
        ],
      },
      {
        id: "hours-and-amount-caregiver",
        name: "The hours worked and the amount owed",
        plainExplanation:
          AMOUNT +
          "Under s. 15(1) of the Employment Standards Act, 2000, an employer records information for " +
          "each employee, including the dates and times the employee worked. This part of the checklist " +
          "is about the hours worked and how the amount was calculated.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: ESA, pinpoint: "Employment Standards Act, 2000, s. 15(1)" }],
        evidenceCategories: [
          {
            name: "Hours worked",
            why: "Shows the time the claim is for.",
            examples: ["A calendar or diary of shifts", "Messages arranging or changing shifts", "Photos or messages sent during work"],
          },
          {
            name: "A calculation",
            why: "Shows how the amount claimed was reached.",
            examples: ["Hours times the agreed rate, less what was paid"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "room-and-board-caregiver",
        name: "The household says room, board or other things covered the pay",
        plainExplanation:
          DEFENCE +
          "Under s. 23(2) of the Employment Standards Act, 2000, if an employer provides room or board, " +
          "the prescribed amount for it is deemed to have been paid as wages. Under s. 13(1), an " +
          "employer shall not withhold or deduct wages, or cause the employee to return them, unless " +
          "authorized under that section.",
        whenThisComesUp:
          "When the household's Defence says the worker's room, meals or other benefits were part of the " +
          "pay, or that money was kept back for something.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: ESA, pinpoint: "Employment Standards Act, 2000, ss. 13(1) and 23(2)" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [ESA_CHOICE, ESA_DIRECTOR, LIMITATION],
    signals: [
      "nanny not paid",
      "babysitter wasn't paid",
      "caregiver wages",
      "housekeeper not paid",
      "family didn't pay me for looking after",
      "live-in caregiver",
      "cleaning lady not paid",
      "worked in their home and they didn't pay",
    ],
    typicalDefendantProfile: "individual",
    citations: [esaCitation("s. 1(1) \"employee\", \"wages\"; ss. 11(1), 13(1), 15(1), 23(1)-(2)"), SC_GUIDE_CITATION, LIMITATION_CITATION],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-employer-suing-former-employee",
    name: "An employer suing a former employee",
    broughtBy:
      "An employer or business that says a former employee owes it money -- an overpayment, an advance " +
      "or loan not repaid -- or has not returned its property.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "what-was-agreed-employer",
        name: "What was agreed or what happened",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the loan, advance, overpayment or property, and any " +
          "agreement about repaying or returning it.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The agreement or record",
            why: "Shows what the former employee received and any promise to repay or return it.",
            examples: ["A signed loan or advance agreement", "Payroll records", "A property sign-out form"],
          },
        ],
      },
      {
        id: "overpayment-kept-employer",
        name: "For an overpayment: the former employee received and kept money not owed",
        plainExplanation:
          UE_TEST +
          "This part of the checklist is about each overpayment, why it was made, and why nothing " +
          "entitled the former employee to keep it.",
        sourceUrl: KERR,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The overpayment",
            why: "Shows the extra money paid and that it was not owed.",
            examples: ["Payroll records showing the error", "Bank records of the payment", "The pay the employee was entitled to"],
          },
          {
            name: "Requests to repay",
            why: "Records that repayment was asked for.",
            examples: ["Letters or emails asking for the money back", "Any reply"],
          },
        ],
      },
      {
        id: "money-or-property-employer",
        name: "The amount owed, or the property to be returned",
        plainExplanation:
          "Ontario's Small Claims Court guide says the court can handle any action for the payment of " +
          "money or the recovery of personal property where the amount claimed does not exceed $50,000, " +
          "excluding interest and costs such as court fees, including the value of all goods asked for. " +
          "The guide says the reasons for a claim should \"calculate and explain the amount of money and " +
          "any interest you are claiming\", with supporting documents attached. This part of the " +
          "checklist is about the amount or the items, and their value.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The amount or the items",
            why: "Shows what is claimed and its value.",
            examples: ["A calculation of the amount owed", "A list of the items with serial numbers and value"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "deductions-and-defendants-claim-employer",
        name: "The former employee says money was already kept from their pay, or that wages are owed to them",
        plainExplanation:
          "Under s. 13(1) of the Employment Standards Act, 2000, an employer shall not withhold wages, " +
          "make a deduction from them, or cause the employee to return them unless authorized under " +
          "that section. Under s. 13(3), it may do so with the employee's written authorization, but " +
          "under s. 13(5) that does not apply if the authorization does not refer to a specific amount " +
          "or a formula, or if wages were withheld or deducted because of faulty work, or because the " +
          "employer had a cash shortage, lost property or had property stolen and a person other than " +
          "the employee had access to it. Under rule 10.01(1) of the Rules of the Small Claims Court, a " +
          "defendant may make a claim against the plaintiff, in Form 10A (rule 10.01(2)).",
        whenThisComesUp:
          "When the former employee's Defence says the employer already took the amount out of their " +
          "final pay, or makes a claim of their own for unpaid wages.",
        sourceUrl: ESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ESA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: SC_RULES, pinpoint: "Rules of the Small Claims Court, r. 10.01(1)-(2)" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-return-of-property", "sc-remedy-interest-and-costs"],
    proceduralNotes: [START, LIMITATION],
    signals: [
      "former employee owes us",
      "ex-employee owes the company",
      "employee didn't repay the advance",
      "overpaid an employee",
      "paid him by mistake after he left",
      "ex-employee kept the company laptop",
      "never returned the work phone",
      "employee loan not repaid",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      SC_GUIDE_CITATION,
      {
        sourceName: "Kerr v. Baranow, 2011 SCC 10",
        officialUrl: KERR,
        verifiedAt: VERIFIED,
        pinpoint: "paras. 32, 38 and 40: the elements of unjust enrichment",
      },
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-bad-reference-or-employer-defamation",
    name: "Something untrue said by an employer",
    broughtBy:
      "An employee or former employee about whom an employer or manager said or wrote something " +
      "untrue that harmed their reputation -- to a new employer, clients or co-workers.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "words-defamatory-def",
        name: "The words would tend to lower the person's reputation",
        plainExplanation:
          "In Grant v. Torstar Corp., 2009 SCC 61, the Supreme Court of Canada said a plaintiff in a " +
          "defamation action is required to prove three things to obtain judgment and an award of " +
          "damages. The first is that the words were defamatory, in the sense that they would tend to " +
          "lower the plaintiff's reputation in the eyes of a reasonable person (para. 28). This part of " +
          "the checklist is about exactly what was said or written.",
        sourceUrl: GRANT,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The exact words",
            why: "Shows what was said or written.",
            examples: ["The reference letter or email", "Screenshots of messages or posts", "Notes made soon after hearing it"],
          },
        ],
      },
      {
        id: "about-and-published-def",
        name: "The words were about the person and were communicated to someone else",
        plainExplanation:
          "In Grant v. Torstar Corp., 2009 SCC 61, the Supreme Court of Canada said the second and third " +
          "things are that the words in fact referred to the plaintiff, and that they were published, " +
          "meaning communicated to at least one person other than the plaintiff. If these elements are " +
          "established on a balance of probabilities, falsity and damage are presumed; the plaintiff " +
          "is not required to show that the defendant intended to do harm (para. 28). This part of " +
          "the checklist is about who heard or read the words.",
        sourceUrl: GRANT,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Who received the words",
            why: "Shows the words reached someone other than the person they were about.",
            examples: ["A witness who heard or read them", "The prospective employer who asked for the reference", "Email recipients list"],
          },
        ],
      },
      {
        id: "spoken-words-business-def",
        name: "For spoken words: harm to the person's work or business",
        plainExplanation:
          "In Grant v. Torstar Corp., 2009 SCC 61, the Supreme Court of Canada noted that slander (spoken " +
          "words) requires proof of special damages, unless the words were slanderous per se (para. 28). " +
          "Under s. 16 of the Libel and Slander Act, in an action for slander for words calculated to " +
          "disparage the plaintiff in any office, profession, calling, trade or business held or carried " +
          "on by the plaintiff at the time, it is not necessary to allege or prove special damage. This " +
          "part of the checklist is about how the words touched the person's work, and any money lost.",
        sourceUrl: LIBEL,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIBEL_CONSOLIDATION,
        alsoCites: [{ sourceUrl: GRANT, pinpoint: "Grant v. Torstar Corp., 2009 SCC 61, para. 28" }],
        evidenceCategories: [
          {
            name: "Effect on work",
            why: "Shows the words were about the person's job or trade, and what followed.",
            examples: ["A job offer withdrawn after the reference", "Lost clients or contracts", "Messages showing the words were about the person's work"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "truth-def",
        name: "The employer says what was said was true",
        plainExplanation:
          "In Grant v. Torstar Corp., 2009 SCC 61, the Supreme Court of Canada said that if the plaintiff " +
          "proves the required elements, the onus shifts to the defendant to advance a defence (para. 29). " +
          "Where statements of fact are at issue, usually only two defences are available: that the " +
          "statement was substantially true (justification), and that it was made in a protected " +
          "context (privilege) (para. 32). For justification, a defendant must adduce evidence showing " +
          "that the statement was substantially true (para. 33).",
        whenThisComesUp: "When the employer's Defence says the statement about the person was true.",
        sourceUrl: GRANT,
        verifiedAt: VERIFIED,
      },
      {
        id: "reference-privilege-def",
        name: "The employer says a reference is a privileged occasion",
        plainExplanation:
          "In Grant v. Torstar Corp., 2009 SCC 61, the Supreme Court of Canada said some occasions, like " +
          "reference letters or credit reports, enjoy \"qualified\" privilege, meaning that the privilege " +
          "can be defeated by proof that the defendant acted with malice (para. 30). In Hill v. Church of " +
          "Scientology of Toronto, [1995] 2 S.C.R. 1130, the Court adopted a description of a privileged " +
          "occasion as one where the person who makes a communication has an interest or a duty, legal, social, or " +
          "moral, to make it to the person to whom it is made, and that person has a corresponding " +
          "interest or duty to receive it; and it said the privilege is not absolute and can be " +
          "defeated if the dominant motive for publishing the statement is actual or express malice.",
        whenThisComesUp:
          "When the employer's Defence says the words were given in a reference or to someone with a " +
          "duty or interest in hearing them.",
        sourceUrl: GRANT,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: HILL, pinpoint: "Hill v. Church of Scientology of Toronto, [1995] 2 S.C.R. 1130 (qualified privilege)" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [START, LIMITATION],
    signals: [
      "bad reference",
      "false reference",
      "my old boss told them lies",
      "former employer badmouthing me",
      "employer lied about me",
      "said i was fired for stealing",
      "told my new employer",
      "spreading lies about me at work",
      "defamation by my employer",
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
        pinpoint: "s. 16: slander affecting office, profession, calling, trade or business",
      },
      LIMITATION_CITATION,
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-claim-non-compete-or-non-solicit",
    name: "A non-compete or non-solicit clause",
    broughtBy:
      "An employer suing a former employee for money over a clause that limited what the employee " +
      "could do after leaving -- or the former employee who is being sued over one.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "the-clause-noncompete",
        name: "What the clause says and who agreed to it",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the exact wording of the clause, when it was signed, " +
          "and what the former employee did after leaving.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The signed clause",
            why: "Shows the exact promise and who made it.",
            examples: ["Employment contract or offer letter", "Any separate agreement signed later"],
          },
          {
            name: "What happened after leaving",
            why: "Shows the conduct the claim is about.",
            examples: ["Messages to clients", "The new business or employer", "Dates of contact"],
          },
        ],
      },
      {
        id: "esa-non-compete-rule-noncompete",
        name: "Whether the Employment Standards Act lets the clause stand",
        plainExplanation:
          "Under s. 67.1 of the Employment Standards Act, 2000, a \"non-compete agreement\" means an " +
          "agreement, or any part of one, between an employer and an employee that prohibits the " +
          "employee from engaging in any business, work, occupation, profession, project or other " +
          "activity that is in competition with the employer's business after the employment ends. " +
          "Under s. 67.2(1), no employer shall enter into an employment contract or other agreement " +
          "with an employee that is, or includes, a non-compete agreement; under s. 67.2(2), a " +
          "non-compete agreement made in breach of that is void. Section 67.2 does not apply to an " +
          "agreement made as part of the sale (including a lease) of a business where the seller becomes " +
          "the purchaser's employee right after the sale (s. 67.2(3)), or to an employee who is an " +
          "executive, such as a chief executive officer or president (ss. 67.2(4)-(5)). This part of the " +
          "checklist is about whether the clause is a non-compete agreement and whether either exception " +
          "applies.",
        sourceUrl: ESA,
        verifiedAt: VERIFIED,
        consolidationPeriod: ESA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The job and how it began",
            why: "Shows whether the person was an executive or became an employee as part of a business sale.",
            examples: ["Job title and duties", "Any purchase agreement for the business"],
          },
        ],
      },
      {
        id: "money-lost-noncompete",
        name: "The money claimed",
        plainExplanation:
          AMOUNT + "This part of the checklist is about the money lost and how it was worked out.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The loss",
            why: "Shows how the amount claimed was reached.",
            examples: ["Sales or client accounts lost, with dates", "Financial records before and after"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "clause-void-noncompete",
        name: "The former employee says the clause is void",
        plainExplanation:
          DEFENCE +
          "Under s. 67.2(2) of the Employment Standards Act, 2000, if an employer enters into an " +
          "agreement with an employee that is or includes a non-compete agreement, contrary to " +
          "s. 67.2(1), the non-compete agreement is void. Under s. 5(1), any contracting out or waiver of " +
          "an employment standard is void.",
        whenThisComesUp:
          "When the former employee's Defence says the clause is a non-compete that the Employment " +
          "Standards Act makes void.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: ESA, pinpoint: "Employment Standards Act, 2000, ss. 5(1) and 67.2(1)-(2)" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-outside-jurisdiction", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Ontario's Small Claims Court guide says the court can handle any action for the payment of " +
          "money or the recovery of personal property where the amount claimed does not exceed $50,000, " +
          "excluding interest and costs such as court fees. An order of another kind, such as one " +
          "stopping someone from working, is not among those.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
      },
      LIMITATION,
    ],
    signals: [
      "non-compete",
      "non compete clause",
      "non-competition agreement",
      "non-solicit",
      "non-solicitation clause",
      "took clients when he left",
      "went to work for a competitor",
      "started a competing business",
      "former employer says i can't work for a competitor",
    ],
    typicalDefendantProfile: "individual",
    citations: [esaCitation("ss. 5(1), 67.1, 67.2"), SC_GUIDE_CITATION, LIMITATION_CITATION],
    reviewedAt: null,
    status: "draft",
  },
];
