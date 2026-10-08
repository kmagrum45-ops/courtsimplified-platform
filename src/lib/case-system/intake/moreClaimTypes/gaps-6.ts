/**
 * Case types, batch "gaps-6" (small-claims): types first left out for want of saved law,
 * written once the law was saved (2026-10-07). Sources are recorded in
 * docs/sources/catalogue-verification/gaps-6.json and held by test:catalogue-verified.
 *
 * Every legal statement rests on text saved in this repository:
 *   - Ontario Works Act, 1997 (ontario-works-act-1997.txt)
 *   - Ontario Disability Support Program Act, 1997 (odsp-act-1997.txt)
 *   - Solicitors Act (solicitors-act.txt) and Law Society Act (law-society-act.txt)
 *   - Mortgage Brokerages, Lenders and Administrators Act, 2006 (mortgage-brokerages-act-2006.txt)
 *   - Securities Act (securities-act.txt)
 *   - plus the Rules of the Small Claims Court, the Small Claims Court guide and the
 *     Limitations Act, 2002, all in the corpus.
 *
 * What is deliberately NOT said, because the text is not saved:
 *   - CRA, EI and CPP decisions (federal law). The benefits type covers Ontario Works
 *     and ODSP only, and says so.
 *   - The regulations under the Ontario Works and ODSP Acts, which set the time for
 *     asking for an internal review and for appealing to the Social Benefits Tribunal.
 *     The entry says the Acts leave those times to the regulations and stops.
 *   - Immigration consultants. Nothing saved governs them, so the fee type's plain
 *     name is "A lawyer's or paralegal's fee" (the id is kept).
 *   - Whether the Solicitors Act's bill and assessment sections apply to paralegals.
 *     Section 32.1 extends only the contingency-fee provisions to other licensees.
 *   - What a court needs before it awards money for bad financial or mortgage advice.
 *     The saved Acts set rules for brokers and advisers; they do not set out the
 *     elements of a civil claim for breaking them (other than the specific Securities
 *     Act rights used here).
 *   - Trespass by people or pets ("sc-claim-trespass-by-people-or-pets") is NOT written.
 *     The Trespass to Property Act sets up an offence and a damage award on conviction
 *     (s. 12), and s. 12(5) preserves a civil action, but it does not say what a civil
 *     trespass-to-land claim requires. TMS Lighting v. KJS Transport, 2014 ONCA 1, is
 *     about how trespass and nuisance damages are proved, and does not state the
 *     elements. Non-Marine Underwriters v. Scalera, 2000 SCC 24, describes trespass to
 *     the person (battery), not trespass to land. Stating the elements of trespass to
 *     land from those would be law from memory.
 */

import type { ClaimType } from "../claimTypes";

const VERIFIED = "2026-10-07";

const OWA = "https://www.ontario.ca/laws/docs/97o25a_e.doc";
const OWA_CONSOLIDATION = "2025-07-01";
const ODSPA = "https://www.ontario.ca/laws/docs/97o25b_e.doc";
const ODSPA_CONSOLIDATION = "2023-10-26";
const SOLICITORS = "https://www.ontario.ca/laws/docs/90s15_e.doc";
const SOLICITORS_CONSOLIDATION = "2021-07-01";
const LSA = "https://www.ontario.ca/laws/docs/90l08_e.doc";
const LSA_CONSOLIDATION = "2024-12-04";
const MBLAA = "https://www.ontario.ca/laws/docs/06m29_e.doc";
const MBLAA_CONSOLIDATION = "2022-04-29";
const SECURITIES = "https://www.ontario.ca/laws/docs/90s05_e.doc";
const SECURITIES_CONSOLIDATION = "2025-09-01";

const SC_GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim";
const SC_RULES = "https://www.ontario.ca/laws/docs/980258_e.doc";
const SC_RULES_CONSOLIDATION = "2025-10-14";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_CONSOLIDATION = "2024-12-04";

const OWA_NAME = "Ontario Works Act, 1997, S.O. 1997, c. 25, Sched. A";
const ODSPA_NAME = "Ontario Disability Support Program Act, 1997, S.O. 1997, c. 25, Sched. B";
const SOLICITORS_NAME = "Solicitors Act, R.S.O. 1990, c. S.15";
const LSA_NAME = "Law Society Act, R.S.O. 1990, c. L.8";
const MBLAA_NAME = "Mortgage Brokerages, Lenders and Administrators Act, 2006, S.O. 2006, c. 29";
const SECURITIES_NAME = "Securities Act, R.S.O. 1990, c. S.5";
const LIMITATIONS_NAME = "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B";
const SC_RULES_NAME = "Rules of the Small Claims Court, O. Reg. 258/98";
const SC_GUIDE_NAME = "Guide to Procedures in Small Claims Court: Making a claim (Ontario)";

// ---- Shared wording. Each entry that uses it has its own record. ----

const DEFENCE =
  "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
  "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
  "language with a reasonable amount of detail\", and a copy of any document the defence is " +
  "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a " +
  "defendant who wishes to dispute the claim serves the Defence on every other party and files " +
  "it, with proof of service, within 20 days of being served with the claim. ";

const LIMITATION_NOTE =
  "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
  "cannot be started after the second anniversary of the day the claim was discovered. Section " +
  "5(1) says when a claim is discovered: the earlier of the day the person first knew that the " +
  "injury, loss or damage had occurred, that it was caused or contributed to by an act or " +
  "omission, that the act or omission was that of the person the claim is against, and that, " +
  "having regard to the nature of the injury, loss or damage, a proceeding would be an " +
  "appropriate means to seek to remedy it -- and the day a reasonable person with their " +
  "abilities and in their circumstances first ought to have known those things. Under s. 5(2), " +
  "a person with a claim is presumed to have known of those matters on the day the act or " +
  "omission the claim is based on took place, unless the contrary is proved.";

const AMOUNT =
  "Ontario's Small Claims Court guide says the reasons for a claim should \"calculate and explain " +
  "the amount of money and any interest you are claiming\", and that a copy of the supporting " +
  "documents is attached to the claim (if they are not attached, the claim gives the reasons why). " +
  "The guide says the court can handle any action for the payment of money or the recovery of " +
  "personal property where the amount claimed does not exceed $50,000, excluding interest and " +
  "costs such as court fees.";

export const TYPES_GAPS_6: ClaimType[] = [
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-government-benefits-dispute",
    name: "An Ontario Works or ODSP decision",
    broughtBy:
      "A person who applied for or receives Ontario Works or ODSP (Ontario Disability Support Program) and disagrees with a decision about it, such as a refusal, a cut, or an overpayment. This checklist covers Ontario Works and ODSP only: the federal laws for CRA, EI and CPP decisions are not saved here, so it says nothing about them.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "appealable-decision-gbd",
        name: "A decision about eligibility or the amount of assistance",
        plainExplanation:
          "Under s. 24 of the Ontario Works Act, 1997, the administrator shall give notice of a " +
          "decision that may be appealed, and the notice shall say that the person may request an " +
          "internal review of it. Under s. 26(1), any decision of an administrator affecting " +
          "eligibility for or the amount of basic financial assistance may be appealed to the " +
          "Tribunal (the Social Benefits Tribunal), except the matters listed in s. 26(2) -- among " +
          "them decisions about discretionary benefits, emergency assistance, and a change caused " +
          "by an amendment to the Act or regulations. For ODSP, s. 19 of the Ontario Disability " +
          "Support Program Act, 1997 has the same notice rule, and under s. 21(1) any decision of " +
          "the Director affecting eligibility for or the amount of income support (and certain " +
          "other assistance and health benefits) may be appealed to the Tribunal, except the " +
          "matters in s. 21(2), such as discretionary income support, and decisions under Part III " +
          "(employment supports) under s. 21(3).",
        sourceUrl: OWA,
        verifiedAt: VERIFIED,
        consolidationPeriod: OWA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: ODSPA, pinpoint: "ss. 19, 21(1)-(3)" }],
        evidenceCategories: [
          {
            name: "The decision letter",
            why: "Shows what was decided, by whom, on what date, and whether it says it can be reviewed.",
            examples: ["Notice of decision", "Letter refusing or cutting assistance", "Overpayment notice"],
          },
          {
            name: "Your file with the office",
            why: "Shows what the office had in front of it when it decided.",
            examples: ["Application papers", "Documents you sent in, with dates", "Notes of calls with your caseworker"],
          },
        ],
      },
      {
        id: "internal-review-gbd",
        name: "An internal review was asked for first",
        plainExplanation:
          "Under s. 27(1) of the Ontario Works Act, 1997, no appeal may be commenced unless an " +
          "internal review has been requested, and under s. 27(2) the request must be made within " +
          "the prescribed time. Sections 22(1) and (2) of the Ontario Disability Support Program " +
          "Act, 1997 say the same for ODSP. \"Prescribed\" means the time is set by the " +
          "regulations, which are not saved here, so this checklist does not state the number of " +
          "days. The decision letter is the place to look for it. Under s. 25(3) of the Ontario " +
          "Works Act, 1997, a decision that may be appealed becomes final when the prescribed time " +
          "for requesting an internal review expires, if no review is requested in that time.",
        sourceUrl: OWA,
        verifiedAt: VERIFIED,
        consolidationPeriod: OWA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: ODSPA, pinpoint: "s. 22(1)-(2)" }],
        evidenceCategories: [
          {
            name: "The review request",
            why: "Shows that an internal review was asked for, and when.",
            examples: ["Copy of the internal review request", "Fax or email confirmation", "Receipt from the office"],
          },
          {
            name: "The review result",
            why: "Shows what the review decided and the day it was received.",
            examples: ["Internal review decision letter", "Envelope or email showing the date received"],
          },
        ],
      },
      {
        id: "tribunal-appeal-gbd",
        name: "The appeal to the Social Benefits Tribunal",
        plainExplanation:
          "Under s. 28(1) of the Ontario Works Act, 1997, an applicant or recipient may appeal a " +
          "decision within the prescribed period after an internal review by filing a notice of " +
          "appeal that shall include reasons for requesting the appeal. Under s. 28(2), the " +
          "Tribunal may extend the time for appealing if it is satisfied that there are apparent " +
          "grounds for an appeal and reasonable grounds for applying for the extension. Under " +
          "s. 28(11), the onus is on the person appealing to satisfy the Tribunal that the " +
          "decision is wrong. Sections 23(1), 23(2) and 23(10) of the Ontario Disability Support " +
          "Program Act, 1997 say the same for ODSP. The period itself is set by regulations not " +
          "saved here.",
        sourceUrl: OWA,
        verifiedAt: VERIFIED,
        consolidationPeriod: OWA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: ODSPA, pinpoint: "s. 23(1), (2), (10)" }],
        evidenceCategories: [
          {
            name: "The notice of appeal",
            why: "Shows the appeal was filed, when, and the reasons given.",
            examples: ["Copy of the notice of appeal", "Proof of filing with the Tribunal"],
          },
          {
            name: "Why the decision is wrong",
            why: "The person appealing has to satisfy the Tribunal the decision is wrong, so the papers that bear on it matter.",
            examples: ["Pay stubs or bank records", "Medical forms (for ODSP)", "Proof of rent, household or income changes"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "no-damages-action-gbd",
        name: "No damages action for acts done in good faith",
        plainExplanation:
          "Under s. 77(1) of the Ontario Works Act, 1997, no action or other proceeding in " +
          "damages shall be instituted against the Ministry, the Director, a delivery agent, a " +
          "delivery partner, or their officers or employees for any act done in good faith in the " +
          "execution or intended execution of a duty or authority under the Act, or for alleged " +
          "neglect or default in doing so in good faith. Under s. 77(2), this does not relieve the " +
          "Crown of liability for a tort it would otherwise be subject to. Section 58 of the " +
          "Ontario Disability Support Program Act, 1997 says the same for ODSP.",
        whenThisComesUp:
          "When someone wants to sue the Ontario Works or ODSP office, or a worker there, for money because of how a file was handled.",
        sourceUrl: OWA,
        verifiedAt: VERIFIED,
        consolidationPeriod: OWA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: ODSPA, pinpoint: "s. 58(1)-(2)" }],
      },
      {
        id: "missed-appeal-gbd",
        name: "If the decision was not appealed in time",
        plainExplanation:
          "Under s. 35 of the Ontario Works Act, 1997, if an administrator's decision is not " +
          "appealed to the Tribunal within the time required under the Act, no further appeal lies " +
          "to the Tribunal or a court with regard to that decision. Section 30 of the Ontario " +
          "Disability Support Program Act, 1997 says the same for ODSP. The Tribunal's power to " +
          "extend the time is in s. 28(2) of the Ontario Works Act, 1997 and s. 23(2) of the ODSP " +
          "Act.",
        whenThisComesUp: "When the time to ask for a review or to appeal has already passed.",
        sourceUrl: OWA,
        verifiedAt: VERIFIED,
        consolidationPeriod: OWA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: ODSPA, pinpoint: "ss. 23(2), 30" }],
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: ["sc-remedy-outside-jurisdiction"],
    proceduralNotes: [
      {
        note:
          "The Acts send these decisions through their own route, and neither sends them to the " +
          "Small Claims Court: an internal review, then an appeal to the Social Benefits Tribunal (s. 2 of the Ontario " +
          "Works Act, 1997 names it as the \"Tribunal\"), then, under s. 36(1), an appeal by the " +
          "Director or any party to the Divisional Court on a question of law. Section 31(1) lists " +
          "the orders open to the Tribunal in an appeal: denying it, granting it, granting it in " +
          "part, or referring the matter back to the administrator for reconsideration. For ODSP, s. 31(1) of the Ontario Disability Support Program Act, " +
          "1997 allows any party to a hearing before the Tribunal to appeal to the Divisional " +
          "Court on a question of law.",
        sourceUrl: OWA,
        verifiedAt: VERIFIED,
        consolidationPeriod: OWA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: ODSPA, pinpoint: "s. 31(1)" }],
      },
      {
        note:
          "Time limits: under s. 27(2) of the Ontario Works Act, 1997 the internal review request " +
          "must be made within the prescribed time, and under s. 28(1) the appeal is made within " +
          "the prescribed period after the internal review (ss. 22(2) and 23(1) of the ODSP Act " +
          "are the same). Those times are set by regulations that are not saved here, so this " +
          "checklist does not give the numbers; the decision letter and the Tribunal are the " +
          "places to confirm them. Under s. 28(2), the Tribunal may extend the time for appealing.",
        sourceUrl: OWA,
        verifiedAt: VERIFIED,
        consolidationPeriod: OWA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: ODSPA, pinpoint: "ss. 22(2), 23(1)" }],
      },
      {
        note:
          "Overpayments: under s. 21(2) of the Ontario Works Act, 1997, a decision that an " +
          "overpayment exists is final and enforceable as if it were an order of the Superior " +
          "Court of Justice if notice of it was given, the time for appealing to the Tribunal has " +
          "expired, and no appeal was started. Under s. 22, the administrator may recover an " +
          "overpayment as a debt due to the delivery agent in a court of competent jurisdiction, " +
          "whether or not that notice was given. That court claim is separate from the appeal " +
          "route.",
        sourceUrl: OWA,
        verifiedAt: VERIFIED,
        consolidationPeriod: OWA_CONSOLIDATION,
      },
    ],
    signals: [
      "ontario works cut me off",
      "odsp denied my application",
      "odsp says I was overpaid",
      "welfare reduced my cheque",
      "social assistance overpayment",
      "want to appeal ontario works decision",
      "social benefits tribunal appeal",
      "internal review of odsp decision",
      "caseworker stopped my benefits",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: OWA_NAME,
        officialUrl: OWA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 2 (\"Tribunal\"), 21(2), 22, 24, 25(3), 26, 27, 28(1), (2), (11), 31(1), 35, 36(1), 77",
      },
      {
        sourceName: ODSPA_NAME,
        officialUrl: ODSPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 19, 21, 22, 23(1), (2), (10), 30, 31(1), 58",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-immigration-consultant-or-paralegal-fee",
    name: "A lawyer's or paralegal's fee",
    broughtBy:
      "A client who was billed by, or paid, a lawyer or a licensed paralegal and disputes the fee or wants money back. Immigration consultants are not covered: the law that governs them is not saved here.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "licensee-lpf",
        name: "Who was hired: a lawyer or a licensed paralegal",
        plainExplanation:
          "Under s. 1(1) of the Law Society Act, a \"licensee\" is a person licensed to practise " +
          "law in Ontario as a barrister and solicitor (a lawyer), or a person licensed to provide " +
          "legal services in Ontario (a paralegal). Under s. 26.1(1), no person, other than a " +
          "licensee whose licence is not suspended, shall practise law or provide legal services " +
          "in Ontario, subject to s. 26.1(5) for persons the by-laws permit. Under s. 26.1(3), no " +
          "licensee shall practise law or provide legal services except to the extent permitted " +
          "by their licence. Which kind of licence the person holds matters below, because " +
          "the Solicitors Act's rules on bills speak of a \"solicitor\".",
        sourceUrl: LSA,
        verifiedAt: VERIFIED,
        consolidationPeriod: LSA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Who they are",
            why: "Shows whether the person was a lawyer or a paralegal, and the firm.",
            examples: ["Letterhead or business card", "Retainer agreement", "Their listing in the Law Society directory"],
          },
          {
            name: "What they were hired to do",
            why: "Shows the work agreed and the fee terms.",
            examples: ["Retainer or engagement letter", "Emails setting out the scope of work", "Fee quote"],
          },
        ],
      },
      {
        id: "the-bill-lpf",
        name: "The bill in dispute",
        plainExplanation:
          "Under s. 2(1) of the Solicitors Act, no action shall be brought for the recovery of a " +
          "solicitor's fees, charges or disbursements until one month after a bill, signed as the " +
          "section requires, has been delivered to the person to be charged. Under s. 2(3), a " +
          "bill is sufficient in form if it contains a reasonable statement or description of the " +
          "services with a lump sum charge, together with a detailed statement of disbursements. " +
          "Under s. 33(3), the rate of interest applicable to a bill shall be shown on the bill " +
          "delivered. This part of the checklist is about what was billed, when, and which parts " +
          "are disputed.",
        sourceUrl: SOLICITORS,
        verifiedAt: VERIFIED,
        consolidationPeriod: SOLICITORS_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The bills",
            why: "Shows what was charged, for what work, and the date each bill was delivered.",
            examples: ["Each account or invoice", "The envelope or email it came in", "Statement of disbursements"],
          },
          {
            name: "What is disputed",
            why: "Shows which charges are questioned and why.",
            examples: ["A list of disputed items", "Emails questioning the bill", "Notes of work not done"],
          },
        ],
      },
      {
        id: "what-was-paid-lpf",
        name: "What was paid, and any overpayment",
        plainExplanation:
          "Under s. 6(2) of the Solicitors Act, when a bill is referred for assessment, the " +
          "solicitor shall give credit for all money received from or on account of the client, " +
          "and shall refund what, if anything, appears on the assessment to have been overpaid. " +
          "Under s. 11, paying a bill does not stop the court from referring it for assessment if " +
          "the special circumstances of the case, in the court's opinion, appear to require it. " +
          "Under s. 33(2), where an assessment shows the client overpaid, the client is entitled to " +
          "interest on the overpayment from the date it was made.",
        sourceUrl: SOLICITORS,
        verifiedAt: VERIFIED,
        consolidationPeriod: SOLICITORS_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Payments",
            why: "Shows every amount paid and when.",
            examples: ["Receipts", "Bank or card statements", "Trust statements from the firm"],
          },
          {
            name: "The money asked for",
            why: "Supports the amount claimed back.",
            examples: ["A calculation of the amount in dispute", "Any refund promised in writing"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "fee-action-lpf",
        name: "When the lawyer sues for an unpaid bill",
        plainExplanation:
          "Under s. 2(1) of the Solicitors Act, a solicitor cannot bring an action for fees until " +
          "one month after the bill was delivered. Under s. 6(4), once a bill has been referred " +
          "for assessment, the solicitor shall not commence or prosecute an action about the " +
          "matters referred without leave of the court or a judge. Under s. 33(1), a solicitor may " +
          "charge interest on unpaid fees, calculated from one month after the bill is delivered.",
        whenThisComesUp: "When the lawyer has started, or threatens, a claim for an unpaid account.",
        sourceUrl: SOLICITORS,
        verifiedAt: VERIFIED,
        consolidationPeriod: SOLICITORS_CONSOLIDATION,
      },
      {
        id: "dispute-lpf",
        name: "The lawyer or paralegal disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the fee was agreed, the work was done, " +
          "or the bill was already settled.",
        whenThisComesUp: "When the lawyer or paralegal files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
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
        note:
          "The Solicitors Act sets out an assessment of a solicitor's bill. Under s. 3, where the " +
          "retainer is not disputed and there are no special circumstances, a client may obtain " +
          "an order on requisition from a local registrar of the Superior Court of Justice for the " +
          "delivery and assessment of the bill, or for the assessment of a bill already delivered " +
          "within one month from its delivery. Under s. 4(1), no reference is directed on the " +
          "client's application after a verdict or judgment, or after twelve months from delivery " +
          "of the bill, except under special circumstances proved to the court. These sections " +
          "speak of a \"solicitor\". Section 32.1(1) applies the Act's contingency-fee provisions to " +
          "other persons licensed under the Law Society Act; the saved text does not say whether " +
          "the assessment sections reach a paralegal's bill, so this checklist does not say so.",
        sourceUrl: SOLICITORS,
        verifiedAt: VERIFIED,
        consolidationPeriod: SOLICITORS_CONSOLIDATION,
      },
      {
        note:
          "The Law Society is a separate route from a claim for money. Under s. 49.3(1) of the " +
          "Law Society Act, the Society may conduct an investigation into a licensee's conduct if " +
          "it receives information suggesting the licensee may have engaged in professional " +
          "misconduct or conduct unbecoming a licensee. Under s. 51(5), Convocation in its absolute " +
          "discretion may make grants from the Compensation Fund to relieve or mitigate loss " +
          "caused by dishonesty on the part of a licensee in connection with their professional " +
          "business or a trust.",
        sourceUrl: LSA,
        verifiedAt: VERIFIED,
        consolidationPeriod: LSA_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "lawyer overcharged me",
      "paralegal charged too much",
      "dispute my lawyer's bill",
      "want a refund from my lawyer",
      "paralegal took my money and did nothing",
      "lawyer is suing me for fees",
      "assessment of a lawyer's account",
      "retainer money not returned",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: SOLICITORS_NAME,
        officialUrl: SOLICITORS,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 2(1), 2(3), 3, 4(1), 6(2), 6(4), 11, 32.1(1), 33(1)-(3)",
      },
      {
        sourceName: LSA_NAME,
        officialUrl: LSA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1(1) (\"licensee\"), 26.1(1), (3), (5), 49.3(1), 51(5)",
      },
      {
        sourceName: LIMITATIONS_NAME,
        officialUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 4, 5(1), 5(2)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-financial-advisor-or-mortgage-broker",
    name: "A financial advisor or mortgage broker",
    broughtBy:
      "A client of a mortgage broker or agent, or of a person who advised them about investing in securities, who lost money or was given false information. Not the broker or adviser.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "mortgage-dealing-fam",
        name: "The broker or agent was dealing in mortgages",
        plainExplanation:
          "Under s. 2(1) of the Mortgage Brokerages, Lenders and Administrators Act, 2006, a " +
          "person is dealing in mortgages when they, among other things, solicit someone to borrow " +
          "or lend money on the security of real property, provide information about a prospective " +
          "borrower to a prospective lender, assess a prospective borrower for a lender, or " +
          "negotiate or arrange a mortgage for someone else. Under s. 2(2), no one shall carry on " +
          "the business of dealing in mortgages in Ontario without a brokerage licence or an " +
          "exemption, and under s. 2(3), no individual shall deal in mortgages for pay unless they " +
          "have a mortgage broker's or agent's licence and act on behalf of a mortgage brokerage, " +
          "or are exempt.",
        sourceUrl: MBLAA,
        verifiedAt: VERIFIED,
        consolidationPeriod: MBLAA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Who dealt with you",
            why: "Shows the broker or agent, the brokerage, and what they did for you.",
            examples: ["Business card or email signature with licence number", "Mortgage application", "Commitment letter"],
          },
          {
            name: "The mortgage papers",
            why: "Shows the deal that was arranged and its terms.",
            examples: ["Mortgage commitment", "Disclosure statements", "Fee agreement with the brokerage"],
          },
        ],
      },
      {
        id: "registered-adviser-fam",
        name: "The adviser was advising on investing in securities",
        plainExplanation:
          "Under s. 1(1) of the Securities Act, an \"adviser\" is a person or company engaging in, " +
          "or holding themselves out as engaging in, the business of advising others as to " +
          "investing in or buying or selling securities. Under s. 25(3), unless exempt, a person " +
          "or company shall not engage in or hold themselves out as engaging in that business " +
          "unless registered as an adviser, or registered as an advising representative (or " +
          "associate advising representative) acting on behalf of a registered adviser. Under " +
          "s. 44(1), no one shall represent that they are registered unless it is true, and they " +
          "shall specify their category of registration.",
        sourceUrl: SECURITIES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SECURITIES_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The advice",
            why: "Shows what was recommended, when, and by whom.",
            examples: ["Emails or letters with the recommendation", "Meeting notes", "Account opening forms"],
          },
          {
            name: "How they described themselves",
            why: "Shows the title and registration they claimed.",
            examples: ["Business card or website", "Account documents naming the firm", "Registration search result"],
          },
        ],
      },
      {
        id: "false-information-fam",
        name: "What you were told",
        plainExplanation:
          "Under s. 43(2) of the Mortgage Brokerages, Lenders and Administrators Act, 2006, no " +
          "mortgage broker or agent shall give, assist in giving, or induce or counsel another to " +
          "give any false or deceptive information or document when dealing in or trading in " +
          "mortgages. Under s. 23(1), a mortgage brokerage shall disclose to each borrower the cost " +
          "of borrowing and any other prescribed information, and under s. 23(2) the cost of " +
          "borrowing is expressed as a rate per annum. Under s. 44(2) of the Securities Act, no " +
          "person or company shall make a statement about any matter that a reasonable investor " +
          "would consider relevant in deciding whether to enter into or maintain a trading or " +
          "advising relationship with them, if the statement is untrue or omits information " +
          "needed to keep it from being false or misleading. These are rules the Acts set; the " +
          "saved text does not set out what a court needs before it awards money for breaking them.",
        sourceUrl: MBLAA,
        verifiedAt: VERIFIED,
        consolidationPeriod: MBLAA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: SECURITIES, pinpoint: "s. 44(2)" }],
        evidenceCategories: [
          {
            name: "What was said or shown",
            why: "Shows the information given and how it differed from what was true.",
            examples: ["Emails, texts or letters", "Disclosure statements", "Notes of conversations with dates"],
          },
          {
            name: "The loss",
            why: "Supports the amount of money claimed.",
            examples: ["Account statements before and after", "Penalty or fee charges", "A calculation of the loss"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "unlicensed-fee-fam",
        name: "When the broker sues for a fee",
        plainExplanation:
          "Under s. 12(1) of the Mortgage Brokerages, Lenders and Administrators Act, 2006, a " +
          "person or entity is not entitled to commence an action to be paid for dealing in, " +
          "trading in or administering mortgages unless, at the time, they were licensed to do so " +
          "or were not required to be licensed. Under s. 12(2), the court may, on motion, stay such " +
          "an action.",
        whenThisComesUp: "When the broker claims a fee from the client, or the client counterclaims after being sued for one.",
        sourceUrl: MBLAA,
        verifiedAt: VERIFIED,
        consolidationPeriod: MBLAA_CONSOLIDATION,
      },
      {
        id: "dispute-fam",
        name: "The broker or adviser disputes the claim",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the information was accurate, was " +
          "disclosed, or that the loss came from something else.",
        whenThisComesUp: "When the broker, adviser or their firm files a Defence (Form 9A).",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 50(1) of the Mortgage Brokerages, Lenders and Administrators Act, 2006, if a " +
          "person is convicted of an offence under the Act, the court may order them to pay " +
          "compensation or make restitution. Under s. 50(3), no civil remedy is affected by reason " +
          "only that such an order was made. " +
          AMOUNT,
        sourceUrl: MBLAA,
        verifiedAt: VERIFIED,
        consolidationPeriod: MBLAA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: SC_GUIDE, pinpoint: "Making a claim -- Types of claims dealt with in Small Claims Court" }],
      },
      {
        note:
          "A short time limit in the Securities Act: under s. 136(1), if a registered dealer, " +
          "contrary to Ontario securities law, fails to disclose that it intended to act as " +
          "principal on a purchase or sale, the person may rescind the contract by mailing or " +
          "delivering written notice to the dealer within 60 days after delivery of the security. " +
          "Under s. 136(2), if it fails to disclose that it has acted as principal, the notice is " +
          "due within seven days after delivery of the written confirmation. Under s. 136(4), " +
          "this does not allow rescission if the person no longer owns the security, and under " +
          "s. 136(6), no action about the rescission may be started more than 90 days after the " +
          "notice was delivered.",
        sourceUrl: SECURITIES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SECURITIES_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "mortgage broker lied to me",
      "mortgage broker hid fees",
      "financial advisor lost my money",
      "investment advisor gave bad advice",
      "advisor was not registered",
      "mortgage agent misled me about the rate",
      "broker put me in the wrong mortgage",
      "financial planner sold me bad investments",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: MBLAA_NAME,
        officialUrl: MBLAA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 2(1)-(3), 12, 23(1)-(2), 43(2), 50(1), (3)",
      },
      {
        sourceName: SECURITIES_NAME,
        officialUrl: SECURITIES,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1(1) (\"adviser\"), 25(3), 44(1)-(2), 136(1), (2), (4), (6)",
      },
      {
        sourceName: SC_GUIDE_NAME,
        officialUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        pinpoint: "Making a claim",
      },
      {
        sourceName: SC_RULES_NAME,
        officialUrl: SC_RULES,
        verifiedAt: VERIFIED,
        pinpoint: "rr. 9.01, 9.02",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
