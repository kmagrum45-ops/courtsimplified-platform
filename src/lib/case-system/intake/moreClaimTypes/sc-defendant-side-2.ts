/**
 * Case types, batch "sc-defendant-side-2" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-defendant-side-2.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-defence-sued-by-a-collection-agency -- Being sued by a collection agency or debt buyer
 *   sc-defence-sued-by-a-bank-or-lender -- Being sued by a bank or lender
 *   sc-defence-debt-already-paid-or-not-yours -- Being sued for a debt paid, or not yours
 *   sc-defence-sued-as-guarantor -- Being sued as a guarantor or co-signer
 *   sc-defence-sued-by-an-insurer -- Being sued by an insurance company
 *   sc-defence-sued-as-parent-owner-or-employer -- Being sued as a parent, dog owner, occupier or employer
 *   sc-defence-sued-by-a-contractor -- Being sued by a contractor over work you dispute
 *   sc-defence-sued-by-a-former-partner -- Being sued by a former partner over money or property
 *   sc-defence-money-you-say-was-a-gift -- Being sued over money you say was a gift
 *
 * These are written from the side of the person being sued. "plaintiffElements"
 * here are what the person suing has to show; "defendantConsiderations" are the
 * rules the person being sued can point to.
 *
 * Every entry rests on text saved in this repository: the e-Laws copies and
 * ontario.ca / ontariocourts.ca pages in docs/sources/corpus/ (their manifest
 * url is the sourceUrl), and three saved decisions read through their text
 * under docs/sources/decisions/: Garland v. Consumers' Gas Co., 2004 SCC 25;
 * Kerr v. Baranow, 2011 SCC 10; Pecore v. Pecore, 2007 SCC 17.
 *
 * Not covered: nothing saved in the repository states when an EMPLOYER is
 * responsible for what an employee did (vicarious liability), so the
 * parent/owner/occupier/employer entry covers parents (Parental Responsibility
 * Act, 2000), dog owners (Dog Owners' Liability Act) and occupiers (Occupiers'
 * Liability Act) only, and says nothing about employers. Nothing saved states
 * the law on assignment of debts, so the debt-buyer entry says only what the
 * collection-agency guide and the Rules say.
 */

import type { ClaimType } from "../claimTypes";

const STEPS =
  "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/";
const GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim";
const REPLY = "https://www.ontario.ca/document/guide-procedures-small-claims-court/replying-claim";
const COLLECT = "https://www.ontario.ca/page/guide-collection-agencies";
const RULES = "https://www.ontario.ca/laws/docs/980258_e.doc";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const INSURANCE = "https://www.ontario.ca/laws/docs/90i08_e.doc";
const NEGLIGENCE = "https://www.ontario.ca/laws/docs/elaws_statutes_90n01_e.doc";
const PARENTAL = "https://www.ontario.ca/laws/docs/00p04_e.doc";
const DOGS = "https://www.ontario.ca/laws/docs/90d16_e.doc";
const OCCUPIERS = "https://www.ontario.ca/laws/docs/90o02_e.doc";
const CPA = "https://www.ontario.ca/laws/docs/02c30_e.doc";
const CONSTRUCTION = "https://www.ontario.ca/laws/docs/90c30_e.doc";
const FLA = "https://www.ontario.ca/laws/docs/90f03_e.doc";
const GARLAND = "docs/sources/decisions/garland-v-consumers-gas-2004-SCC-25.english.txt";
const KERR = "docs/sources/decisions/kerr-v-baranow-2011-SCC-10.english.txt";
const PECORE = "docs/sources/decisions/pecore-v-pecore-2007-SCC-17.english.txt";

const V = "2026-10-07";
const RULES_CP = "2025-10-14";
const LIMITATIONS_CP = "2024-12-04";
const INSURANCE_CP = "2026-01-01";
const NEGLIGENCE_CP = "2004-01-01";
const PARENTAL_CP = "2021-04-19";
const DOGS_CP = "2024-06-06";
const OCCUPIERS_CP = "2021-01-29";
const CPA_CP = "2025-12-11";
const CONSTRUCTION_CP = "2026-01-01";
const FLA_CP = "2026-05-01";

const BURDEN =
  "The Superior Court of Justice's guide to the steps in a civil case says that in every civil case the " +
  "plaintiff has the burden of proof to establish, on a balance of probabilities, the allegations in their " +
  "claim -- evidence showing that, more likely than not, it would be correct to rule in their favour. ";

const CLAIM_CONTENTS =
  "Under rule 7.01(2) of the Rules of the Small Claims Court, the plaintiff's claim gives the full names of " +
  "the parties and, if relevant, the capacity in which they sue, and the nature of the claim with reasonable " +
  "certainty and detail. If the claim is based in whole or in part on a document, a copy is attached to the " +
  "claim, or the claim says why it is not. ";

const DEFENCE_RULES =
  "Under rule 9.01 of the Rules of the Small Claims Court, a defendant who wishes to dispute the claim " +
  "serves a Defence (Form 9A) on every other party and files it, with proof of service, within 20 days of " +
  "being served with the claim. Under rule 9.02, the Defence sets out \"the reasons why the defendant " +
  "disputes the plaintiff's claim, expressed in concise non-technical language with a reasonable amount of " +
  "detail\", and a copy of any document the defence is based on is attached (if it is unavailable, the " +
  "Defence says why). ";

const DEFENDANTS_CLAIM =
  "Under rule 10.01 of the Rules of the Small Claims Court, a defendant may make a claim against the " +
  "plaintiff, or against any other person if it arises out of the transaction or occurrence relied upon by " +
  "the plaintiff or is related to the plaintiff's claim. The defendant's claim is in Form 10A and may be " +
  "issued within 20 days after the day the defence is filed, or later but before trial or default judgment " +
  "with leave (permission) of the court. ";

const IGNORE_NOTE =
  "Ontario's guide to replying to a Small Claims Court claim says that if you ignore the claim it will be " +
  "assumed that you admit to the truth of what is claimed against you, and the plaintiff can then get a " +
  "judgment against you with no further notice, just as if there had been a trial. You have 20 calendar days " +
  "from the date you were served with the claim to file your Defence; after 20 days, the plaintiff can have " +
  "you noted in default.";

const SETTLEMENT_NOTE =
  "Ontario's guide to replying to a claim says that if you disputed all or part of the claim you will have " +
  "to attend a settlement conference, which should take place within 90 days after the first defence in the " +
  "case is filed.";

const LIMITATION_NOTE =
  "Under s. 4 of the Limitations Act, 2002, a proceeding shall not be commenced in respect of a claim after " +
  "the second anniversary of the day on which the claim was discovered. Section 5(1) sets out when a claim " +
  "is discovered, and under s. 5(2) the person with the claim is presumed to have known of those matters on " +
  "the day the act or omission the claim is based on took place, unless the contrary is proved.";

const DEMAND_NOTE =
  " Under s. 5(3), for a demand obligation (money payable when it is asked for), the day the loss occurs is " +
  "the first day there is a failure to perform the obligation, once a demand for performance is made; s. 5(4) " +
  "says this applies to every demand obligation created on or after January 1, 2004.";

const ACKNOWLEDGMENT_NOTE =
  "Under s. 13(1) of the Limitations Act, 2002, if a person acknowledges liability for a claim for payment " +
  "of a liquidated (set) sum, the act or omission the claim is based on is treated as having taken place on " +
  "the day of the acknowledgment. The acknowledgment must be in writing and signed by the person making it " +
  "or their agent (s. 13(10)); for a liquidated sum, a part payment by the person the claim is against, or " +
  "their agent, has the same effect (s. 13(11)).";

export const TYPES_SC_DEFENDANT_SIDE_2: ClaimType[] = [
  // ---------------------------------------------------------------------------
  {
    id: "sc-defence-sued-by-a-collection-agency",
    name: "Being sued by a collection agency or debt buyer",
    broughtBy:
      "A collection agency, or a company that bought the debt, suing the person it says owes the money. Here the user is the person being sued, not the agency.",
    courtArea: "small-claims",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "agency-has-to-prove-the-debt",
        name: "The agency or debt buyer has to prove the debt and the amount",
        plainExplanation:
          BURDEN +
          CLAIM_CONTENTS +
          "This part of the checklist is about what the claim says you owe, who it says the debt was " +
          "first owed to, and what documents it attaches.",
        sourceUrl: STEPS,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: RULES, pinpoint: "O. Reg. 258/98, r. 7.01 (2)" }],
        evidenceCategories: [
          {
            name: "Your own records of the account",
            why: "Lets you compare the amount claimed with what you know was owed and paid.",
            examples: ["Old account statements", "Your bank records of payments made", "The original agreement, if you have it"],
          },
          {
            name: "The claim and what is attached to it",
            why: "Shows what the agency says the debt is and what it relies on.",
            examples: ["The Plaintiff's Claim (Form 7A) you were served with", "Any statements or agreements attached to it", "Letters the agency sent before suing"],
          },
        ],
      },
      {
        id: "who-the-agency-is",
        name: "Who is suing: the original creditor, an agency, or a debt buyer",
        plainExplanation:
          "Ontario's guide for collection agencies, under the Collection and Debt Settlement Services Act, " +
          "describes a collection agency as a person who, among other things, obtains or arranges for " +
          "payment of money owing to another person, or purchases debts that are in arrears and collects " +
          "them (with some exceptions). The guide says that before an agency can contact a debtor to demand " +
          "payment, it must send a written notice that includes the name of the creditor, details about the " +
          "debt including the balance owing, the name of the agency and collector, and the agency's authority " +
          "to demand payment of the debt. This part of the checklist is about whose name is on the claim and " +
          "what the agency's notice said about the creditor and its authority.",
        sourceUrl: COLLECT,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "The agency's written notice",
            why: "Names the creditor, the balance and the agency's authority to collect.",
            examples: ["The first letter or email from the agency", "The \"Debt Collection: Information About Your Rights\" statement sent with it"],
          },
          {
            name: "Records naming the original creditor",
            why: "Shows which account the claim is about.",
            examples: ["Statements from the original lender or company", "A credit report entry for the account"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "collection-agency-conduct-rules",
        name: "Rules collection agencies must follow",
        plainExplanation:
          "Ontario's guide for collection agencies says an agency cannot threaten legal action without the " +
          "creditor's written authority to commence legal proceedings, and cannot continue contacting the " +
          "debtor after the debtor advises that they are disputing the debt and requests that the matter be " +
          "taken to court. Before recommending that a creditor start a legal proceeding to collect a debt, the " +
          "agency must notify the debtor that it intends to make the recommendation. An agency cannot ask the " +
          "debtor to pay charges incurred by the agency or the creditor (for example, commissions). This " +
          "topic is about what the agency sent you, what it charged, and when.",
        whenThisComesUp: "When the agency contacted you before the lawsuit, kept contacting you after you disputed the debt, or added its own charges to the amount.",
        sourceUrl: COLLECT,
        verifiedAt: V,
      },
      {
        id: "defence-to-agency-claim",
        name: "Your Defence to the agency's claim",
        plainExplanation:
          DEFENCE_RULES +
          "This topic is about a Defence whose reasons say the debt is not yours, the amount is wrong, it " +
          "was paid, or the claim was started more than two years after the claim was discovered (see the " +
          "time-limit note).",
        whenThisComesUp: "When you disagree with all or part of what the agency says you owe.",
        sourceUrl: RULES,
        verifiedAt: V,
        consolidationPeriod: RULES_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: IGNORE_NOTE, sourceUrl: REPLY, verifiedAt: V },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: V, consolidationPeriod: LIMITATIONS_CP },
      { note: ACKNOWLEDGMENT_NOTE, sourceUrl: LIMITATIONS, verifiedAt: V, consolidationPeriod: LIMITATIONS_CP },
    ],
    signals: [
      "sued by a collection agency",
      "collection agency took me to court",
      "debt collector sued me",
      "debt buyer",
      "they bought my debt",
      "old credit card debt",
      "collections lawsuit",
      "never heard of this company",
      "agency says I owe",
      "claim from a collection company",
    ],
    citations: [
      { sourceName: "Ontario.ca — Guide for collection agencies", officialUrl: COLLECT, verifiedAt: V, pinpoint: "Definitions; Prohibited practices and conduct" },
      { sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Replying to a claim", officialUrl: REPLY, verifiedAt: V, pinpoint: "What happens if you ignore the claim; How much time you have" },
      { sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B", officialUrl: LIMITATIONS, verifiedAt: V, pinpoint: "ss. 4, 5, 13" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-defence-sued-by-a-bank-or-lender",
    name: "Being sued by a bank or lender",
    broughtBy:
      "A bank, credit union, finance company or other lender suing a borrower over an unpaid loan, line of credit or credit card. Here the user is the borrower being sued.",
    courtArea: "small-claims",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "lender-has-to-prove-loan-and-balance",
        name: "The lender has to prove the loan and the balance",
        plainExplanation:
          BURDEN +
          CLAIM_CONTENTS +
          "This part of the checklist is about the loan or card agreement, the balance the lender says is " +
          "owing, and how that balance was worked out.",
        sourceUrl: STEPS,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: RULES, pinpoint: "O. Reg. 258/98, r. 7.01 (2)" }],
        evidenceCategories: [
          {
            name: "The agreement",
            why: "Shows the amount borrowed, the payments and the terms.",
            examples: ["Loan or line-of-credit agreement", "Credit card agreement and later notices of change", "Any renewal or amending agreement"],
          },
          {
            name: "Payment history",
            why: "Shows what was paid and when, against the balance claimed.",
            examples: ["Monthly statements", "Bank records of payments", "Letters about missed payments"],
          },
        ],
      },
      {
        id: "interest-the-lender-claims",
        name: "The interest the lender claims",
        plainExplanation:
          "Ontario's Small Claims Court guide says that a plaintiff who wants interest must ask for it in the " +
          "claim form, and that if a rate of interest was agreed by the parties (for example, in a written " +
          "contract they signed), the claim states that rate. The guide says interest must be expressed as an " +
          "annual rate (for example, 24% per year and not 2% per month), and that the Interest Act (Canada) " +
          "provides that where a contract does not provide for an annualized rate equivalent to the monthly, " +
          "weekly or daily rate charged, no interest exceeding 5% per year shall be chargeable. This part of " +
          "the checklist is about the interest rate in your agreement and how the lender's figure was " +
          "calculated.",
        sourceUrl: GUIDE,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "Where the rate is stated",
            why: "Shows the rate agreed and how it is expressed.",
            examples: ["The interest clause in the agreement", "Disclosure statements you received", "Statements showing interest charged each month"],
          },
          {
            name: "The lender's calculation",
            why: "Lets you check the interest figure in the claim.",
            examples: ["The interest calculation in or attached to the claim", "A demand letter giving the balance and interest"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "admit-part-and-propose-payments",
        name: "Admitting all or part and proposing payments",
        plainExplanation:
          "Under rule 9.03(1) of the Rules of the Small Claims Court, a defendant who admits liability for all " +
          "or part of the claim but wishes to arrange terms of payment may, in the Defence, admit liability and " +
          "propose terms of payment. Under rule 9.03(3), the plaintiff has 20 days after service of the Defence to " +
          "dispute the proposal, by asking for a terms of payment hearing. Under rule 9.03(2), if the " +
          "plaintiff does not dispute it, the defendant shall make payment in accordance with the proposal as " +
          "if it were a court order. This topic is about what you agree you owe and what payments you can make.",
        whenThisComesUp: "When you agree you owe some or all of the balance but cannot pay it all at once.",
        sourceUrl: RULES,
        verifiedAt: V,
        consolidationPeriod: RULES_CP,
      },
      {
        id: "defence-to-lender-claim",
        name: "Your Defence to the lender's claim",
        plainExplanation:
          DEFENCE_RULES +
          "This topic is about a Defence whose reasons say the balance or the interest is wrong, payments " +
          "were not credited, or the account is not yours.",
        whenThisComesUp: "When you disagree with all or part of the balance or interest claimed.",
        sourceUrl: RULES,
        verifiedAt: V,
        consolidationPeriod: RULES_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: IGNORE_NOTE, sourceUrl: REPLY, verifiedAt: V },
      { note: LIMITATION_NOTE + DEMAND_NOTE, sourceUrl: LIMITATIONS, verifiedAt: V, consolidationPeriod: LIMITATIONS_CP },
      { note: ACKNOWLEDGMENT_NOTE, sourceUrl: LIMITATIONS, verifiedAt: V, consolidationPeriod: LIMITATIONS_CP },
    ],
    signals: [
      "bank is suing me",
      "sued by my bank",
      "lender sued me",
      "unpaid line of credit",
      "credit card company sued me",
      "car loan default",
      "personal loan lawsuit",
      "finance company claim",
      "missed loan payments",
      "they want the full balance",
    ],
    citations: [
      { sourceName: "Rules of the Small Claims Court, O. Reg. 258/98", officialUrl: RULES, verifiedAt: V, pinpoint: "rr. 7.01, 9.01-9.03" },
      { sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a claim", officialUrl: GUIDE, verifiedAt: V, pinpoint: "Asking for interest on the money claimed" },
      { sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B", officialUrl: LIMITATIONS, verifiedAt: V, pinpoint: "ss. 4, 5, 13" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-defence-debt-already-paid-or-not-yours",
    name: "Being sued for a debt paid, or not yours",
    broughtBy:
      "Anyone suing for a debt -- a business, lender, collection agency or individual -- where the person being sued says it was already paid or settled, or belongs to someone else. Here the user is the person being sued.",
    courtArea: "small-claims",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "plaintiff-has-to-prove-you-owe-it",
        name: "The person suing has to prove you owe it",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about whether the claim names the right person and the right " +
          "debt, and what it relies on to show that.",
        sourceUrl: STEPS,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "Records showing whose account it is",
            why: "Shows whether the debt is yours.",
            examples: ["Your own account numbers and statements", "Proof of your address and legal name at the time", "A report you made if someone used your identity"],
          },
          {
            name: "The claim and its attachments",
            why: "Shows which debt the claim is about.",
            examples: ["The Plaintiff's Claim (Form 7A)", "Invoices or statements attached to it"],
          },
        ],
      },
      {
        id: "amount-after-payments",
        name: "The amount claimed, after every payment made",
        plainExplanation:
          "Ontario's Small Claims Court guide says the reasons for a claim should give a full explanation of " +
          "what happened, including the dates, and \"calculate and explain the amount of money and any " +
          "interest you are claiming\", with copies of supporting documents attached. This part of the " +
          "checklist is about whether the amount claimed takes account of every payment already made, and " +
          "any settlement already reached.",
        sourceUrl: GUIDE,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "Proof of payment",
            why: "Shows the debt, or part of it, was paid.",
            examples: ["Receipts", "Cancelled cheques or bank records", "E-transfer confirmations"],
          },
          {
            name: "Proof of a settlement",
            why: "Shows the debt was settled for an agreed amount.",
            examples: ["A settlement or paid-in-full letter", "Emails agreeing to a settlement amount", "Proof the settlement amount was paid"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "defence-with-proof",
        name: "A Defence that says why, with the documents",
        plainExplanation:
          "Ontario's guide to replying to a claim says the Defence (Form 9A) is your answer to the claim, the " +
          "form you use to explain what you disagree with in the claim and why, and what, if anything, you " +
          "agree with. If your defence is based in whole or in part on a document (the guide gives a contract " +
          "or invoice as examples), attach a copy; if you no longer have it or cannot find it, state in your " +
          "Defence why it is not attached. If your legal name is different from the name used on the claim, " +
          "indicate the error and state your full legal name in your Defence.",
        whenThisComesUp: "When you have receipts, bank records or a settlement letter, or the claim names you for someone else's account.",
        sourceUrl: REPLY,
        verifiedAt: V,
      },
      {
        id: "collector-and-the-wrong-person",
        name: "A collector contacting the wrong person",
        plainExplanation:
          "Ontario's guide for collection agencies says an agency cannot contact or attempt to contact someone " +
          "if it knows or reasonably should know they are not responsible for the debt, or if they have told " +
          "the agency it has the wrong person, unless the agency has taken reasonable steps to confirm it does " +
          "have the right person.",
        whenThisComesUp: "When a collection agency chased you for a debt you say is not yours before the claim was filed.",
        sourceUrl: COLLECT,
        verifiedAt: V,
      },
    ],
    applicableDefenceConceptIds: ["defence-no-agreement-existed", "defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: IGNORE_NOTE, sourceUrl: REPLY, verifiedAt: V },
      { note: SETTLEMENT_NOTE, sourceUrl: REPLY, verifiedAt: V },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: V, consolidationPeriod: LIMITATIONS_CP },
    ],
    signals: [
      "I already paid this",
      "debt was paid off",
      "paid in full",
      "not my debt",
      "identity theft debt",
      "wrong person sued",
      "never had an account with them",
      "settled this already",
      "they didn't credit my payments",
      "someone else's account",
    ],
    citations: [
      { sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Replying to a claim", officialUrl: REPLY, verifiedAt: V, pinpoint: "Definition of a defence; How to fill in the defence" },
      { sourceName: "Ontario.ca — Guide for collection agencies", officialUrl: COLLECT, verifiedAt: V, pinpoint: "Trying to collect from the wrong person" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-defence-sued-as-guarantor",
    name: "Being sued as a guarantor or co-signer",
    broughtBy:
      "A lender, landlord, supplier or other creditor suing a person who signed a guarantee or co-signed for someone else's debt. Here the user is the guarantor or co-signer being sued.",
    courtArea: "small-claims",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "guarantee-was-signed",
        name: "The creditor has to show what you signed",
        plainExplanation:
          BURDEN +
          "Ontario's Small Claims Court guide gives the example of a person who signs a personal guarantee " +
          "for a company's credit and, by doing so, is agreeing to pay the debt personally if the company " +
          "does not; if the creditor sues, the company and the person who signed the guarantee could both be " +
          "named as defendants. This part of the checklist is about what you signed, for whose debt, and for " +
          "how much.",
        sourceUrl: STEPS,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: GUIDE, pinpoint: "Making a claim, Example 3 (personal guarantee)" }],
        evidenceCategories: [
          {
            name: "The guarantee or co-signed document",
            why: "Shows exactly what you agreed to.",
            examples: ["The signed guarantee", "The loan, lease or credit application you co-signed", "Any limit on the amount guaranteed"],
          },
          {
            name: "Later changes to the debt",
            why: "Shows whether the debt you are sued for is the one you signed for.",
            examples: ["Renewals or increases of the loan", "New agreements the borrower signed without you"],
          },
        ],
      },
      {
        id: "amount-the-borrower-did-not-pay",
        name: "What the borrower has not paid",
        plainExplanation:
          "Ontario's Small Claims Court guide says the reasons for a claim should give a full explanation of " +
          "what happened, including the dates, and \"calculate and explain the amount of money and any " +
          "interest you are claiming\", with copies of supporting documents attached. This part of the " +
          "checklist is about how much of the debt is unpaid and what the main borrower has already paid.",
        sourceUrl: GUIDE,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "The borrower's payment record",
            why: "Shows how much is still owing.",
            examples: ["Statements on the account", "Messages from the borrower about payments", "Demand letters sent to the borrower"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "defence-as-guarantor",
        name: "Your Defence as guarantor or co-signer",
        plainExplanation:
          DEFENCE_RULES +
          "This topic is about a Defence whose reasons say you did not sign a guarantee, what you signed " +
          "covered a different debt or a smaller amount, or the borrower has paid.",
        whenThisComesUp: "When you dispute what you signed or the amount claimed from you.",
        sourceUrl: RULES,
        verifiedAt: V,
        consolidationPeriod: RULES_CP,
      },
      {
        id: "claim-against-the-borrower",
        name: "A defendant's claim against the borrower",
        plainExplanation:
          DEFENDANTS_CLAIM +
          "This topic is about a claim you make, in the same case, against the borrower whose debt you " +
          "guaranteed or co-signed.",
        whenThisComesUp: "When you want the borrower to answer for the amount you are being asked to pay.",
        sourceUrl: RULES,
        verifiedAt: V,
        consolidationPeriod: RULES_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-no-agreement-existed", "defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: IGNORE_NOTE, sourceUrl: REPLY, verifiedAt: V },
      {
        note:
          "Ontario's guide for collection agencies says an agency can contact a debtor's spouse, family member, " +
          "household member, relative, neighbour, friend or acquaintance only in listed cases, one of which is " +
          "that the person has guaranteed to pay the debt and the contact is regarding that guarantee.",
        sourceUrl: COLLECT,
        verifiedAt: V,
      },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: V, consolidationPeriod: LIMITATIONS_CP },
    ],
    signals: [
      "co-signed a loan",
      "I was the guarantor",
      "cosigner being sued",
      "signed a personal guarantee",
      "guaranteed my friend's loan",
      "co-signed for my ex",
      "co-signed a lease",
      "coming after me for his debt",
      "personal guarantee for the company",
      "guarantor on the loan",
    ],
    citations: [
      { sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a claim", officialUrl: GUIDE, verifiedAt: V, pinpoint: "Example 3 (personal guarantee)" },
      { sourceName: "Rules of the Small Claims Court, O. Reg. 258/98", officialUrl: RULES, verifiedAt: V, pinpoint: "rr. 9.01, 9.02, 10.01" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-defence-sued-by-an-insurer",
    name: "Being sued by an insurance company",
    broughtBy:
      "An insurance company that paid its own customer for a loss (a car accident, water or fire damage) and then sues the person it says caused it, often in the customer's name. Here the user is the person being sued.",
    courtArea: "small-claims",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "insurer-right-to-sue-after-paying",
        name: "The insurer's right to sue after paying its customer",
        plainExplanation:
          "Under s. 278(1) of the Insurance Act, in the Part on automobile insurance, an insurer who makes any " +
          "payment or assumes liability under a contract is subrogated to all rights of recovery of the " +
          "insured against any person -- that is, it takes over its customer's rights to recover from others " +
          "-- and may bring action in the name of the insured to enforce those rights. Section 152(1) says the " +
          "same for contracts under the Part that applies to insurance against loss or damage to property " +
          "from fire (s. 143(1)). This part of the checklist is about who was paid, how much, and in whose " +
          "name the claim is brought.",
        sourceUrl: INSURANCE,
        verifiedAt: V,
        consolidationPeriod: INSURANCE_CP,
        evidenceCategories: [
          {
            name: "What the insurer paid",
            why: "The insurer steps into its customer's rights for what it paid.",
            examples: ["Proof of payment attached to the claim", "The adjuster's report", "Repair invoices the insurer paid"],
          },
          {
            name: "The demand letter",
            why: "Shows who is claiming and for what.",
            examples: ["The insurer's demand or subrogation letter", "The Plaintiff's Claim and its attachments"],
          },
        ],
      },
      {
        id: "fault-and-the-loss",
        name: "Fault, and the amount of the loss",
        plainExplanation:
          BURDEN +
          "Under s. 1 of the Negligence Act, where damages have been caused or contributed to by the fault or " +
          "neglect of two or more persons, the court shall determine the degree in which each of them is at " +
          "fault or negligent. Under s. 3, if fault or negligence is found on the part of the plaintiff that " +
          "contributed to the damages, the court shall apportion the damages in proportion to the degree of " +
          "fault or negligence found against the parties. This part of the checklist is about what happened, " +
          "who did what, and what the loss cost.",
        sourceUrl: STEPS,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: NEGLIGENCE, pinpoint: "Negligence Act, R.S.O. 1990, c. N.1, ss. 1, 3" }],
        evidenceCategories: [
          {
            name: "What happened",
            why: "Shows how the loss happened and who was involved.",
            examples: ["Photos of the scene or damage", "Witness names and statements", "Police or fire report, if any"],
          },
          {
            name: "The cost of the loss",
            why: "Lets you check the amount claimed.",
            examples: ["Repair estimates and invoices", "Photos of the damage before repair"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "direct-compensation-car-damage",
        name: "Car damage paid under direct compensation",
        plainExplanation:
          "Section 263 of the Insurance Act applies when an automobile or its contents suffers damage arising " +
          "directly or indirectly from the use or operation in Ontario of one or more other automobiles, and " +
          "the automobiles are insured as that section describes. When it applies, under s. 263(5) an insured " +
          "has no right of action against any person involved in the incident other than the insured's own " +
          "insurer for damages to the insured's automobile or its contents or for loss of use, and an insurer, " +
          "except as permitted by the regulations, has no right of indemnification from or subrogation against " +
          "any person for payments made to its insured under that section.",
        whenThisComesUp: "When an insurer sues over damage to its customer's car after a collision with your car in Ontario.",
        sourceUrl: INSURANCE,
        verifiedAt: V,
        consolidationPeriod: INSURANCE_CP,
      },
      {
        id: "defence-to-insurer-claim",
        name: "Your Defence to the insurer's claim",
        plainExplanation:
          DEFENCE_RULES +
          "This topic is about a Defence whose reasons dispute how the loss happened, who was at fault, or " +
          "the amount paid.",
        whenThisComesUp: "When you dispute fault or the amount claimed.",
        sourceUrl: RULES,
        verifiedAt: V,
        consolidationPeriod: RULES_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-contributory-negligence", "defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: IGNORE_NOTE, sourceUrl: REPLY, verifiedAt: V },
      { note: DEFENDANTS_CLAIM.trim(), sourceUrl: RULES, verifiedAt: V, consolidationPeriod: RULES_CP },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: V, consolidationPeriod: LIMITATIONS_CP },
    ],
    signals: [
      "insurance company is suing me",
      "subrogation claim",
      "insurer wants me to pay for the damage",
      "their insurance sued me",
      "letter from an insurance company demanding payment",
      "sued by the other driver's insurer",
      "water damage to the unit below",
      "fire spread to the neighbour",
      "insurer paid them and wants it from me",
    ],
    citations: [
      { sourceName: "Insurance Act, R.S.O. 1990, c. I.8", officialUrl: INSURANCE, verifiedAt: V, pinpoint: "ss. 152(1), 263, 278(1)" },
      { sourceName: "Negligence Act, R.S.O. 1990, c. N.1", officialUrl: NEGLIGENCE, verifiedAt: V, pinpoint: "ss. 1, 3" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-defence-sued-as-parent-owner-or-employer",
    name: "Being sued as a parent, dog owner, occupier or employer",
    broughtBy:
      "A person whose property was damaged or who was hurt, suing a parent over what their child did, a dog owner over a bite or attack, or the occupier of a property over an injury or damage there. Here the user is the parent, owner or occupier being sued.",
    courtArea: "small-claims",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "parent-child-took-or-damaged-property",
        name: "If you are sued as a parent: the Parental Responsibility Act",
        plainExplanation:
          "Under s. 2(1) of the Parental Responsibility Act, 2000, where a child (a person under 18, s. 1) " +
          "takes, damages or destroys property, the owner or a person entitled to possession of the property " +
          "may bring an action in the Small Claims Court against a parent of the child for the loss of or " +
          "damage to the property, and for economic loss that follows from it. Under s. 2(2), the parent is " +
          "liable unless the parent satisfies the court that he or she was exercising reasonable supervision " +
          "over the child at the time and made reasonable efforts to prevent or discourage the child from " +
          "that kind of activity, or that the activity that caused the loss or damage was not intentional. " +
          "Under s. 2(3), on supervision the court may consider matters including the child's age and prior " +
          "conduct, whether the child was under the parent's direct supervision, and any other matter the " +
          "court considers relevant. This part of the checklist is about what the child did, and what " +
          "supervision and efforts were in place.",
        sourceUrl: PARENTAL,
        verifiedAt: V,
        consolidationPeriod: PARENTAL_CP,
        evidenceCategories: [
          {
            name: "Supervision at the time",
            why: "Section 2(2)(a) turns on reasonable supervision and reasonable efforts.",
            examples: ["Who was looking after the child and where", "Arrangements made for supervision", "Rules or steps taken to discourage the activity"],
          },
          {
            name: "What happened",
            why: "Section 2(2)(b) turns on whether the activity was intentional.",
            examples: ["Messages or statements about the incident", "Photos of the damage", "Witness names"],
          },
        ],
      },
      {
        id: "dog-owner-bite-or-attack",
        name: "If you are sued as a dog owner: the Dog Owners' Liability Act",
        plainExplanation:
          "Under s. 2(1) of the Dog Owners' Liability Act, the owner of a dog is liable for damages resulting " +
          "from a bite or attack by the dog on another person or domestic animal. Under s. 2(3), that " +
          "liability does not depend upon knowledge of the dog's propensity or fault or negligence on the part " +
          "of the owner, but the court shall reduce the damages in proportion to the degree, if any, to which " +
          "the fault or negligence of the plaintiff caused or contributed to the damages. \"Owner\" includes a " +
          "person who possesses or harbours the dog (s. 1(1)). Under s. 2(4), an owner who is liable is " +
          "entitled to recover contribution and indemnity from any other person in proportion to that " +
          "person's fault or negligence. This part of the checklist is about whose dog it was, what happened, " +
          "and what the person who was bitten did.",
        sourceUrl: DOGS,
        verifiedAt: V,
        consolidationPeriod: DOGS_CP,
        evidenceCategories: [
          {
            name: "Who owned or kept the dog",
            why: "The Act applies to the owner, including a person who possesses or harbours the dog.",
            examples: ["Licence or registration records", "Who the dog lived with"],
          },
          {
            name: "How the bite or attack happened",
            why: "Damages are reduced for the plaintiff's own fault or negligence (s. 2(3)).",
            examples: ["Witness names", "Photos or video", "Messages after the incident"],
          },
        ],
      },
      {
        id: "occupier-duty-of-care",
        name: "If you are sued as an occupier: the Occupiers' Liability Act",
        plainExplanation:
          "Under s. 3(1) of the Occupiers' Liability Act, an occupier of premises owes a duty to take such care " +
          "as in all the circumstances of the case is reasonable to see that persons entering on the premises, " +
          "and the property they bring, are reasonably safe while on the premises. Under s. 4(1), that duty " +
          "does not apply to risks willingly assumed by the person who enters, though the occupier still owes " +
          "a duty not to create a danger with the deliberate intent of doing harm and not to act with reckless " +
          "disregard of the person's presence. This part of the checklist is about the condition of the " +
          "property, what was done to keep it reasonably safe, and how the injury or damage happened.",
        sourceUrl: OCCUPIERS,
        verifiedAt: V,
        consolidationPeriod: OCCUPIERS_CP,
        evidenceCategories: [
          {
            name: "Upkeep of the property",
            why: "Shows the care taken to keep the premises reasonably safe.",
            examples: ["Maintenance or salting and shovelling records", "Photos of the area", "Contracts with snow-removal or repair companies"],
          },
          {
            name: "How the incident happened",
            why: "Shows what the person was doing and what risk was involved.",
            examples: ["Witness names", "Incident notes made at the time"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "work-done-by-an-independent-contractor",
        name: "Damage caused by a contractor you hired",
        plainExplanation:
          "Under s. 6(1) of the Occupiers' Liability Act, where damage to any person or their property is " +
          "caused by the negligence of an independent contractor employed by the occupier, the occupier is not " +
          "on that account liable if in all the circumstances the occupier had acted reasonably in entrusting " +
          "the work to the contractor, had taken such steps, if any, as the occupier reasonably ought in order " +
          "to be satisfied that the contractor was competent and the work had been properly done, and it was " +
          "reasonable that the work should have been undertaken.",
        whenThisComesUp: "When the injury or damage came from work done by a contractor you hired, such as snow removal or repairs.",
        sourceUrl: OCCUPIERS,
        verifiedAt: V,
        consolidationPeriod: OCCUPIERS_CP,
      },
      {
        id: "plaintiffs-own-fault",
        name: "The other person's own fault",
        plainExplanation:
          "Under s. 3 of the Negligence Act, in any action for damages founded upon the fault or negligence of " +
          "the defendant, if fault or negligence is found on the part of the plaintiff that contributed to the " +
          "damages, the court shall apportion the damages in proportion to the degree of fault or negligence " +
          "found against the parties.",
        whenThisComesUp: "When the person suing did something that contributed to their own injury or damage.",
        sourceUrl: NEGLIGENCE,
        verifiedAt: V,
        consolidationPeriod: NEGLIGENCE_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-contributory-negligence", "defence-waiver-release-assumption-of-risk", "defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: IGNORE_NOTE, sourceUrl: REPLY, verifiedAt: V },
      {
        note:
          "Under s. 6.1(1) of the Occupiers' Liability Act, no action shall be brought for damages for personal " +
          "injury caused by snow or ice against an occupier (or a snow-removal contractor the occupier " +
          "employed) unless, within 60 days after the injury, written notice of the claim, including the date, " +
          "time and location, has been personally served on or sent by registered mail to at least one of " +
          "them. Under s. 6.1(6), failing to give that notice is not a bar if a judge finds there is a " +
          "reasonable excuse and the defendant is not prejudiced in its defence.",
        sourceUrl: OCCUPIERS,
        verifiedAt: V,
        consolidationPeriod: OCCUPIERS_CP,
      },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: V, consolidationPeriod: LIMITATIONS_CP },
    ],
    signals: [
      "suing me for what my child did",
      "my son damaged",
      "my daughter damaged",
      "my teenager vandalized",
      "my dog bit",
      "dog bite claim against me",
      "neighbour suing over my dog",
      "someone slipped on my property",
      "fell on my driveway",
      "slip and fall at my house",
    ],
    citations: [
      { sourceName: "Parental Responsibility Act, 2000, S.O. 2000, c. 4", officialUrl: PARENTAL, verifiedAt: V, pinpoint: "ss. 1, 2" },
      { sourceName: "Dog Owners' Liability Act, R.S.O. 1990, c. D.16", officialUrl: DOGS, verifiedAt: V, pinpoint: "ss. 1(1), 2" },
      { sourceName: "Occupiers' Liability Act, R.S.O. 1990, c. O.2", officialUrl: OCCUPIERS, verifiedAt: V, pinpoint: "ss. 3, 4, 6, 6.1" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-defence-sued-by-a-contractor",
    name: "Being sued by a contractor over work you dispute",
    broughtBy:
      "A contractor, renovator or trades business suing a customer for an unpaid bill, where the customer disputes the work or the price. Here the user is the customer being sued.",
    courtArea: "small-claims",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "contractor-has-to-prove-agreement-and-work",
        name: "The contractor has to prove the agreement and the work",
        plainExplanation:
          BURDEN +
          CLAIM_CONTENTS +
          "This part of the checklist is about what was agreed (the job, the price or estimate, and any " +
          "changes), and what work was actually done.",
        sourceUrl: STEPS,
        verifiedAt: V,
        alsoCites: [{ sourceUrl: RULES, pinpoint: "O. Reg. 258/98, r. 7.01 (2)" }],
        evidenceCategories: [
          {
            name: "The agreement and any changes",
            why: "Shows the job and the price you agreed to.",
            examples: ["Written contract, quote or estimate", "Texts or emails approving extra work", "Change orders"],
          },
          {
            name: "The state of the work",
            why: "Shows what was done and how.",
            examples: ["Dated photos and video", "A report or quote from another contractor", "Inspection results"],
          },
        ],
      },
      {
        id: "amount-claimed-for-the-work",
        name: "How the amount claimed is worked out",
        plainExplanation:
          "Ontario's Small Claims Court guide says the reasons for a claim should give a full explanation of " +
          "what happened, including the dates, and \"calculate and explain the amount of money and any " +
          "interest you are claiming\", with copies of supporting documents attached. This part of the " +
          "checklist is about the invoices, what you have already paid, and what is said to be left.",
        sourceUrl: GUIDE,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "Invoices and payments",
            why: "Lets you check the balance claimed.",
            examples: ["Every invoice received", "Proof of deposits and progress payments", "Messages disputing an invoice"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "estimate-ten-per-cent-rule",
        name: "If you were given an estimate: the 10 per cent rule",
        plainExplanation:
          "Under s. 10(1) of the Consumer Protection Act, 2002, if a consumer agreement includes an estimate, " +
          "the supplier shall not charge the consumer an amount that exceeds the estimate by more than 10 per " +
          "cent, and under s. 10(2), if it does, the consumer may require the supplier to provide the goods or " +
          "services at the estimated price. Under s. 10(3), this does not prevent the consumer and supplier " +
          "from agreeing to amend the estimate or price if the consumer requires additional or different goods " +
          "or services. Under s. 1, a \"consumer\" is an individual acting for personal, family or household " +
          "purposes, not a person acting for business purposes.",
        whenThisComesUp: "When the bill is more than 10 per cent over the written estimate, for work on your home or for your own use.",
        sourceUrl: CPA,
        verifiedAt: V,
        consolidationPeriod: CPA_CP,
      },
      {
        id: "quality-of-the-work-and-claim-back",
        name: "Work you say was deficient, and a claim back",
        plainExplanation:
          "Under s. 9(1) of the Consumer Protection Act, 2002, the supplier is deemed to warrant that the " +
          "services supplied under a consumer agreement are of a reasonably acceptable quality. Under rule " +
          "10.01 of the Rules of the Small Claims Court, a defendant may make a claim against the plaintiff " +
          "(a defendant's claim, Form 10A), within 20 days after the day the defence is filed, or later but " +
          "before trial or default judgment with leave of the court. This topic is about a Defence or " +
          "defendant's claim that says the work was deficient and what it costs to fix.",
        whenThisComesUp: "When the work was unfinished or deficient and you paid, or need to pay, someone else to fix it.",
        sourceUrl: CPA,
        verifiedAt: V,
        consolidationPeriod: CPA_CP,
        alsoCites: [{ sourceUrl: RULES, pinpoint: "O. Reg. 258/98, r. 10.01 (1)-(2)" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-set-off-or-counterclaim", "defence-no-agreement-existed", "defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: IGNORE_NOTE, sourceUrl: REPLY, verifiedAt: V },
      {
        note:
          "Under s. 14(1) of the Construction Act, a person who supplies services or materials to an " +
          "improvement for an owner has a lien upon the interest of the owner in the premises improved for " +
          "the price of those services or materials. Under s. 50(1), a lien claim is enforceable in an action " +
          "in the Superior Court of Justice.",
        sourceUrl: CONSTRUCTION,
        verifiedAt: V,
        consolidationPeriod: CONSTRUCTION_CP,
      },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: V, consolidationPeriod: LIMITATIONS_CP },
    ],
    signals: [
      "contractor is suing me",
      "renovator suing for the balance",
      "refused to pay for bad work",
      "charged more than the estimate",
      "bill much higher than the quote",
      "unfinished renovation and they want paid",
      "deficient work and they sued",
      "withheld the final payment",
      "roofer is suing me",
      "contractor took me to small claims",
    ],
    citations: [
      { sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A", officialUrl: CPA, verifiedAt: V, pinpoint: "ss. 1, 9(1), 10" },
      { sourceName: "Rules of the Small Claims Court, O. Reg. 258/98", officialUrl: RULES, verifiedAt: V, pinpoint: "rr. 7.01, 10.01" },
      { sourceName: "Construction Act, R.S.O. 1990, c. C.30", officialUrl: CONSTRUCTION, verifiedAt: V, pinpoint: "ss. 14(1), 50(1)" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-defence-sued-by-a-former-partner",
    name: "Being sued by a former partner over money or property",
    broughtBy:
      "A former spouse, common-law partner, boyfriend or girlfriend suing over money, shared bills, a loan or property after the relationship ended. Here the user is the former partner being sued.",
    courtArea: "small-claims",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "former-partner-has-to-prove-claim",
        name: "The former partner has to prove what they claim",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about what the former partner says was agreed -- a loan, a share of " +
          "bills, or who owns something -- and the records they rely on.",
        sourceUrl: STEPS,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "Messages about money",
            why: "Shows what each of you said about loans, gifts and shared costs.",
            examples: ["Texts and emails", "Notes on e-transfers", "Messages after the breakup"],
          },
          {
            name: "Who paid for what",
            why: "Shows each person's contributions during the relationship.",
            examples: ["Bank and credit card statements", "Receipts for shared purchases", "Rent or mortgage records"],
          },
        ],
      },
      {
        id: "unjust-enrichment-after-a-relationship",
        name: "If the claim is for unjust enrichment",
        plainExplanation:
          "In Kerr v. Baranow, 2011 SCC 10, the Supreme Court of Canada (Cromwell J., for the Court) said the " +
          "law of unjust enrichment has been the primary vehicle to address claims of inequitable distribution " +
          "of assets on the breakdown of a domestic relationship (para. 30). It permits recovery whenever the " +
          "plaintiff can establish an enrichment of or benefit to the defendant, a corresponding deprivation " +
          "of the plaintiff, and the absence of a juristic (legal) reason for the enrichment (para. 32). " +
          "Juristic reasons to deny recovery may be the intention to make a gift, a contract, or a disposition " +
          "of law (para. 41). The Court said many domestic claims arise out of relationships in which there " +
          "has been a mutual conferral of benefits, and it is unjust to pay attention only to the " +
          "contributions of one party in assessing an appropriate remedy (para. 48). This part of the " +
          "checklist is about what each of you gave and received, and why.",
        sourceUrl: KERR,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "What you contributed",
            why: "Benefits went both ways in many relationships.",
            examples: ["Bills, rent or groceries you paid", "Work you did on the home or for the other person", "Money you gave the other person"],
          },
          {
            name: "Why money or property changed hands",
            why: "A gift, a contract or a legal rule can be a reason to keep a benefit.",
            examples: ["Cards or messages showing a gift", "Any written agreement between you"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "married-spouses-property-presumption",
        name: "Between married spouses: the Family Law Act presumption",
        plainExplanation:
          "Under s. 14 of the Family Law Act, the rule of law applying a presumption of a resulting trust is " +
          "applied in questions of the ownership of property between spouses as if they were not married, " +
          "except that property held in the name of spouses as joint tenants is proof, in the absence of " +
          "evidence to the contrary, that they intended to own it as joint tenants, and money on deposit in " +
          "both their names is treated as held by them as joint tenants. Under s. 1(1), \"spouse\" means " +
          "either of two persons who are married to each other (or who entered a void or voidable marriage in " +
          "good faith).",
        whenThisComesUp: "When you were married to the person suing you and the dispute is about who owns property or money.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CP,
      },
      {
        id: "defence-and-claim-back-against-former-partner",
        name: "Your Defence, and a claim back",
        plainExplanation:
          DEFENCE_RULES +
          "Under rule 10.01, a defendant may also make a claim against the plaintiff (Form 10A), within 20 " +
          "days after the day the defence is filed or later with leave of the court. This topic is about a " +
          "Defence whose reasons say the money was a gift or your share of joint expenses, and any claim you " +
          "make back against the former partner.",
        whenThisComesUp: "When you say you owe nothing, or that the former partner owes you too.",
        sourceUrl: RULES,
        verifiedAt: V,
        consolidationPeriod: RULES_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-no-agreement-existed", "defence-set-off-or-counterclaim", "defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-return-of-property", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: IGNORE_NOTE, sourceUrl: REPLY, verifiedAt: V },
      {
        note:
          "Under s. 10(1) of the Family Law Act, a person may apply to the court for the determination of a " +
          "question between that person and his or her spouse or former spouse as to the ownership or right to " +
          "possession of particular property. In the Act, \"court\" (s. 1(1)) means the Ontario Court of " +
          "Justice, the Family Court of the Superior Court of Justice or the Superior Court of Justice.",
        sourceUrl: FLA,
        verifiedAt: V,
        consolidationPeriod: FLA_CP,
      },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: V, consolidationPeriod: LIMITATIONS_CP },
    ],
    signals: [
      "my ex is suing me",
      "ex-girlfriend took me to small claims",
      "ex-boyfriend wants money back",
      "former partner suing over a loan",
      "ex says I owe half the bills",
      "ex wants the car back",
      "money my ex gave me during the relationship",
      "suing me after the breakup",
      "ex-wife sued me in small claims",
      "ex-husband sued me in small claims",
    ],
    citations: [
      { sourceName: "Kerr v. Baranow, 2011 SCC 10", officialUrl: KERR, verifiedAt: V, pinpoint: "paras. 30, 32, 41, 48" },
      { sourceName: "Family Law Act, R.S.O. 1990, c. F.3", officialUrl: FLA, verifiedAt: V, pinpoint: "ss. 1(1), 10(1), 14" },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-defence-money-you-say-was-a-gift",
    name: "Being sued over money you say was a gift",
    broughtBy:
      "A family member, friend, former partner or acquaintance suing to get back money they say was a loan. Here the user is the person who received the money and says it was a gift.",
    courtArea: "small-claims",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "money-given-and-said-to-be-a-loan",
        name: "The money that was given, and what is said to make it a loan",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about how and when the money was given, and what the person suing " +
          "relies on to say it was a loan.",
        sourceUrl: STEPS,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "How the money was given",
            why: "Shows the amount, the date and any note attached.",
            examples: ["E-transfer records and their messages", "Cheques and what was written on them", "Bank records"],
          },
          {
            name: "What was said at the time",
            why: "Shows whether repayment was ever discussed.",
            examples: ["Texts or emails before and after", "Cards or notes that came with the money", "People who were there"],
          },
        ],
      },
      {
        id: "unjust-enrichment-and-gifts",
        name: "If the claim is for unjust enrichment",
        plainExplanation:
          "In Garland v. Consumers' Gas Co., 2004 SCC 25, para. 30, the Supreme Court of Canada (Iacobucci J., " +
          "for the Court) said a claim for unjust enrichment has three elements: an enrichment of the " +
          "defendant, a corresponding deprivation of the plaintiff, and an absence of juristic (legal) reason " +
          "for the enrichment. At para. 44, the Court said the established categories of juristic reason " +
          "include a contract, a disposition of law, a donative intent (an intention to make a gift), and " +
          "other valid common law, equitable or statutory obligations. This part of the checklist is about " +
          "why the money was given.",
        sourceUrl: GARLAND,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "Signs of a gift",
            why: "A donative intent is one of the established juristic reasons.",
            examples: ["A card or message calling it a gift", "An occasion such as a birthday or wedding", "Similar gifts given to others"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "who-has-to-show-it-was-a-gift",
        name: "Who has to show it was a gift",
        plainExplanation:
          "In Pecore v. Pecore, 2007 SCC 17, the Supreme Court of Canada (Rothstein J., for the majority) said " +
          "the presumption of resulting trust is a rebuttable presumption of law and general rule that " +
          "applies to gratuitous transfers (transfers for nothing in return): where a transfer is made for no " +
          "consideration, the onus is placed on the transferee -- the person who received it -- to " +
          "demonstrate that a gift was intended (para. 24). This alters the general practice that a plaintiff " +
          "bears the legal burden in a civil case (para. 25). If instead the presumption of advancement " +
          "applies, which depends on the relationship between the giver and the receiver, it falls on the " +
          "party challenging the transfer to rebut the presumption of a gift (para. 27); the Court said the " +
          "presumption of advancement should not apply in respect of independent adult children (para. 36). " +
          "The evidence required to rebut either presumption is evidence of the giver's contrary intention on " +
          "the balance of probabilities (para. 43), and the judge weighs all of the evidence to ascertain the " +
          "giver's actual intention (para. 44).",
        whenThisComesUp: "When the person suing says the money was a loan and you say they meant it as a gift.",
        sourceUrl: PECORE,
        verifiedAt: V,
      },
      {
        id: "defence-that-it-was-a-gift",
        name: "A Defence that says it was a gift",
        plainExplanation:
          DEFENCE_RULES +
          "This topic is about a Defence whose reasons say the money was a gift, with the messages, cards or " +
          "other records that show it.",
        whenThisComesUp: "When you are filing your Defence.",
        sourceUrl: RULES,
        verifiedAt: V,
        consolidationPeriod: RULES_CP,
      },
    ],
    applicableDefenceConceptIds: ["defence-no-agreement-existed", "defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: IGNORE_NOTE, sourceUrl: REPLY, verifiedAt: V },
      { note: SETTLEMENT_NOTE, sourceUrl: REPLY, verifiedAt: V },
      { note: LIMITATION_NOTE + DEMAND_NOTE, sourceUrl: LIMITATIONS, verifiedAt: V, consolidationPeriod: LIMITATIONS_CP },
    ],
    signals: [
      "it was a gift",
      "they gave me the money",
      "now they say it was a loan",
      "gift not a loan",
      "parents want the money back",
      "never agreed to pay it back",
      "birthday money",
      "help with my down payment",
      "friend wants back money they gave me",
      "the e-transfer was a gift",
    ],
    citations: [
      { sourceName: "Pecore v. Pecore, 2007 SCC 17", officialUrl: PECORE, verifiedAt: V, pinpoint: "paras. 24-25, 27, 36, 43-44" },
      { sourceName: "Garland v. Consumers' Gas Co., 2004 SCC 25", officialUrl: GARLAND, verifiedAt: V, pinpoint: "paras. 30, 44" },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
