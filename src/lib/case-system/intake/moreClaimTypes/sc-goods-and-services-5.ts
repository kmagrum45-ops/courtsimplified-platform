/**
 * Case types, batch "sc-goods-and-services-5" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-goods-and-services-5.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-claim-website-app-or-software-build -- A website, app or software not delivered
 *   sc-claim-hosting-or-saas-billing -- Domain, hosting or software billing
 *   sc-claim-influencer-or-brand-deal-unpaid -- An unpaid brand or influencer deal
 *   sc-claim-immigration-consultant-or-paralegal-fee -- An immigration consultant or paralegal fee
 *   sc-claim-financial-advisor-or-mortgage-broker -- A financial advisor or mortgage broker
 *   sc-claim-insurance-claim-denied -- An insurance claim refused
 *   sc-claim-bank-error-or-unauthorized-transaction -- A bank error or a transaction you did not make
 *   sc-claim-credit-report-error -- A mistake on your credit report
 *
 * Every legal statement below rests on text saved in this repository: the
 * vendored corpus (docs/sources/corpus/, url from manifest.json). Two planned
 * types are NOT written:
 *   - sc-claim-immigration-consultant-or-paralegal-fee: O. Reg. 17/05, s. 1
 *     exempts professional services of a person governed by the Law Society
 *     Act from the Consumer Protection Act, 2002, and the law that does govern
 *     a paralegal's fees (the Law Society Act, its by-laws and rules) is not
 *     saved; nothing saved governs immigration consultants. The only saved
 *     pages on fee complaints are Steps to Justice pages, not on a domain the
 *     checks accept.
 *   - sc-claim-financial-advisor-or-mortgage-broker: the Consumer Protection
 *     Act, 2002 does not apply to financial services related to investment
 *     products, or to services regulated under the Mortgage Brokerages,
 *     Lenders and Administrators Act, 2006 (s. 2(2)(b), (c)), and neither that
 *     Act nor the Securities Act is saved.
 * Notes on what was written:
 *   - The bank entry covers what the saved text states: the Consumer
 *     Protection Act, 2002's limit on a borrower's liability for unauthorized
 *     credit card charges (s. 69, O. Reg. 17/05, s. 58) and the lender's duty
 *     to correct a statement error (s. 71), and the Bills of Exchange Act on
 *     forged signatures (s. 48). The federal Bank Act and any rule on debit or
 *     online-banking losses are not saved, so nothing is said about them.
 *   - The Bills of Exchange Act is on laws-lois.justice.gc.ca, carried as
 *     alsoCites beside an ontario.ca source (as in sc-money-owed-1).
 *   - The insurance entry rests on Part III of the Insurance Act (contracts
 *     other than accident and sickness, life and marine insurance). The
 *     one-year limits in s. 259.1 (automobile loss or damage) and statutory
 *     condition 14 (fire insurance under Part IV) are stated for those
 *     contracts only.
 *   - The influencer entry is a plain agreement-to-pay claim: no saved
 *     statute governs it, so it rests on the burden of proof and the Small
 *     Claims guide and says nothing about contract formation.
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
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const INSURANCE = "https://www.ontario.ca/laws/docs/90i08_e.doc";
const INSURANCE_CONSOLIDATION = "2026-01-01";
const CRA = "https://www.ontario.ca/laws/docs/90c33_e.doc";
const CRA_CONSOLIDATION = "2026-07-01";
const BEA = "https://laws-lois.justice.gc.ca/eng/acts/B-4/FullText.html";

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

const FORM_7A_NOTE =
  "This kind of claim is started in the Small Claims Court with a Plaintiff's Claim (Form 7A). " +
  "Ontario's Small Claims Court guide says the reasons for the claim should \"give a full " +
  "explanation of what happened, including the dates and places and nature of the occurrences " +
  "involved.\"";

const CPA_COURT_NOTE =
  "Under s. 100(1) of the Consumer Protection Act, 2002, if a consumer has a right to commence " +
  "an action under the Act, the consumer may commence the action in the Superior Court of " +
  "Justice. Under s. 22(1) of the Courts of Justice Act, the Small Claims Court is continued as a " +
  "branch of the Superior Court of Justice. Under s. 100(2) of the Consumer Protection Act, 2002, " +
  "if a consumer is successful in an action, unless in the circumstances it would be inequitable " +
  "to do so, the court shall order that the consumer recover the full payment to which they are " +
  "entitled under the Act.";

const CPA_SCOPE =
  "Under s. 1 of the Consumer Protection Act, 2002, a \"consumer\" is an individual acting for " +
  "personal, family or household purposes, not for business purposes, and a \"consumer " +
  "agreement\" is an agreement in which a supplier -- a person in the business of supplying goods " +
  "or services -- agrees to supply goods or services for payment. Under s. 2(1), the Act applies " +
  "to consumer transactions if the consumer or the person dealing with the consumer is located in " +
  "Ontario when the transaction takes place. ";

const CPA_ESTIMATE =
  "Under s. 10(1) of the Consumer Protection Act, 2002, if a consumer agreement includes an " +
  "estimate, the supplier shall not charge the consumer an amount that exceeds the estimate by " +
  "more than 10 per cent. If the supplier does, the consumer may require that the supplier " +
  "provide the goods or services at the estimated price (s. 10(2)). Under s. 10(3), nothing in " +
  "that section prevents the consumer and the supplier from agreeing to amend the estimate or " +
  "price if the consumer requires additional or different goods or services.";

const CPA_SERVICES_QUALITY =
  "Under s. 9(1) of the Consumer Protection Act, 2002, the supplier is deemed to warrant that " +
  "the services supplied under a consumer agreement are of a reasonably acceptable quality. ";

const CPA_NO_WAIVER =
  "Under s. 9(3), any term or acknowledgement, whether part of the consumer agreement or not, " +
  "that purports to negate or vary an implied condition or warranty under the Sale of Goods Act " +
  "or a deemed condition or warranty under the Consumer Protection Act, 2002 is void. ";

const CPA_REFUND =
  "Under s. 96(1) of the Consumer Protection Act, 2002, if a consumer cancels a consumer " +
  "agreement, the supplier shall, in accordance with the prescribed requirements, refund to the " +
  "consumer any payment made under the agreement or any related agreement. O. Reg. 17/05, " +
  "s. 79(1) says the supplier shall do so within 15 days after the day the consumer gives notice " +
  "of cancellation in accordance with s. 92 of the Act. Under s. 96(6), if a consumer has " +
  "cancelled a consumer agreement and the supplier has not met its obligations under s. 96(1), " +
  "the consumer may commence an action. ";

const CPA_NOTICE =
  "Under s. 94, the consumer cancels by giving notice in accordance with s. 92, and the " +
  "cancellation takes effect when the notice is given. Under s. 92, the notice may be expressed in " +
  "any way, as long as it indicates the consumer's intention to seek the remedy being requested, " +
  "and unless the regulations require otherwise it may be oral or in writing and given by any " +
  "means. ";

const CPA_LATE_START =
  "Under s. 1 of the Consumer Protection Act, 2002, a \"future performance agreement\" is a " +
  "consumer agreement in respect of which delivery, performance or payment in full is not made " +
  "when the parties enter the agreement. Under s. 26(1)(b), a consumer may cancel a future " +
  "performance agreement at any time before performance begins if the supplier does not begin " +
  "performance within 30 days after the commencement date specified in the agreement, or an " +
  "amended commencement date the consumer agreed to in writing. If no commencement date is " +
  "specified, the consumer may cancel at any time before commencement if the supplier does not " +
  "commence performance within 30 days after the date the agreement is entered into (s. 26(2)). " +
  "Sections 22 to 26 apply where the consumer's total potential payment obligation under the " +
  "agreement, excluding the cost of borrowing, exceeds a prescribed amount (s. 21(1)); O. Reg. " +
  "17/05, s. 23.1 prescribes $50 for an agreement that is not a gift card agreement. ";

const LATE_START_ACCEPTED =
  "Under s. 26(3) of the Consumer Protection Act, 2002, if, after the 30-day period has expired, " +
  "the consumer agrees to accept delivery or authorize commencement, the consumer may not cancel " +
  "the agreement under that section.";

export const TYPES_SC_GOODS_AND_SERVICES_5: ClaimType[] = [
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-website-app-or-software-build",
    name: "A website, app or software not delivered",
    broughtBy:
      "A person or business that paid a developer or agency to build a website, app or software that was never delivered, was left unfinished, or did not work.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "build-agreement-web",
        name: "What was agreed, and what was paid",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the agreement with the developer: what was to be " +
          "built, the price, the deadlines or milestones, and what has been paid so far.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The agreement or quote",
            why: "Shows what was to be built, for how much, and by when.",
            examples: ["Signed contract or statement of work", "Written quote or proposal", "Emails or messages agreeing to the job"],
          },
          {
            name: "Proof of payment",
            why: "Shows what was paid, when and to whom.",
            examples: ["Invoices and receipts", "Bank, credit card or e-transfer records", "Deposit or milestone payment records"],
          },
        ],
      },
      {
        id: "work-not-acceptable-web",
        name: "For a consumer: the work was not of reasonably acceptable quality",
        plainExplanation:
          CPA_SCOPE +
          CPA_SERVICES_QUALITY +
          CPA_NO_WAIVER +
          "This part of the checklist applies where the website, app or software was ordered for " +
          "personal, family or household use. It is about what was delivered and what was wrong " +
          "with it.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "What was delivered",
            why: "Shows the state of the work when it was handed over or abandoned.",
            examples: ["Screenshots or screen recordings", "Links to the test or live site", "Copies of the files or code received"],
          },
          {
            name: "An independent opinion",
            why: "Describes what is missing or broken and what it takes to finish or fix it.",
            examples: ["Another developer's written review", "A quote to finish or redo the work", "Lists of bugs or errors"],
          },
        ],
      },
      {
        id: "work-never-started-web",
        name: "For a consumer: the work did not start, the agreement was cancelled, and no refund came",
        plainExplanation:
          CPA_LATE_START +
          CPA_NOTICE +
          CPA_REFUND,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, ss. 23.1, 79(1)" }],
        evidenceCategories: [
          {
            name: "Proof the work never started",
            why: "Shows nothing was begun by the agreed date, or within 30 days.",
            examples: ["Messages asking when work will start", "Missed kickoff or milestone dates", "No files, drafts or access ever provided"],
          },
          {
            name: "The cancellation and the refund request",
            why: "Shows when and how the agreement was cancelled and the money asked for.",
            examples: ["Cancellation email or letter", "Refund request and any reply"],
          },
        ],
      },
      {
        id: "amount-web",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about what was paid, the cost of finishing or redoing the " +
          "work, any refund already received, and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The figures",
            why: "Supports the dollar amount claimed.",
            examples: ["A short worked calculation", "Quotes from another developer", "Any partial refund received"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "extra-work-web",
        name: "The developer says the price went up because more work was asked for",
        plainExplanation:
          CPA_ESTIMATE +
          " This topic is about any change requests, and whether a new price was agreed for them.",
        whenThisComesUp:
          "When the developer bills more than the quote and says the customer asked for additional or different work.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
      },
      {
        id: "dispute-work-web",
        name: "The developer disputes what was agreed or says the work was done",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the work matched the agreement, or that " +
          "the customer caused the delay.",
        whenThisComesUp: "When the developer files a Defence (Form 9A) disputing the claim.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
      "defence-failure-to-mitigate",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      { note: CPA_COURT_NOTE, sourceUrl: CPA, verifiedAt: VERIFIED, consolidationPeriod: CPA_CONSOLIDATION },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "paid a developer and never got the website",
      "web designer disappeared with my deposit",
      "the app was never finished",
      "software they built doesn't work",
      "agency missed every deadline",
      "website was half done",
      "freelancer stopped responding",
      "want my money back for the website",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1, 2(1), 9(1), 9(3), 10, 21(1), 26, 92, 94, 96, 100",
      },
      {
        sourceName: "Rules of the Small Claims Court, O. Reg. 258/98",
        officialUrl: SC_RULES,
        verifiedAt: VERIFIED,
        pinpoint: "rr. 9.01, 9.02",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-hosting-or-saas-billing",
    name: "Domain, hosting or software billing",
    broughtBy:
      "A customer of a domain, web hosting, cloud or software subscription who was charged for something they did not agree to, or who cancelled and was not refunded.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "subscription-hst",
        name: "The subscription, and what it was for",
        plainExplanation:
          CPA_SCOPE +
          "This part of the checklist is about the plan or subscription, its price and renewal " +
          "terms, and whether it was for personal or household use.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The plan and its terms",
            why: "Shows what was ordered, the price and how renewal works.",
            examples: ["Order confirmation or welcome email", "Screenshot of the plan and price", "Terms of service in force at sign-up"],
          },
          {
            name: "The account",
            why: "Shows whose account it is and what it is used for.",
            examples: ["Account page in the customer's own name", "What the domain or service is used for"],
          },
        ],
      },
      {
        id: "material-change-hst",
        name: "Charges for a change the customer did not agree to",
        plainExplanation:
          "Under s. 13(4) of the Consumer Protection Act, 2002, if a consumer is receiving goods or " +
          "services on an ongoing or periodic basis and there is a material change in them, they are " +
          "deemed to be unsolicited from the time of the material change forward, unless the " +
          "supplier is able to establish that the consumer consented to the change. O. Reg. 17/05, " +
          "s. 20 says a change or series of changes is material if it could reasonably be expected " +
          "to influence a reasonable person's decision whether to enter into the agreement. Under " +
          "s. 13(5), the supplier may rely on consent given orally, in writing or by other " +
          "affirmative action, but bears the onus of proving it. Under s. 13(3), a request for goods " +
          "or services shall not be inferred solely on the basis of payment, inaction or the passing " +
          "of time. Under s. 13(6), a consumer who paid for unsolicited goods or services may demand " +
          "a refund in accordance with s. 92 within one year after making the payment; O. Reg. " +
          "17/05, s. 21 says the supplier shall refund it within 15 days after the demand. Under " +
          "s. 13(8), the consumer may commence an action to recover the payment in accordance with " +
          "s. 100.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, ss. 20, 21" }],
        evidenceCategories: [
          {
            name: "What changed",
            why: "Shows the price, plan or service before and after the change.",
            examples: ["Old and new invoices", "Notice of the price or plan change, if any", "Screenshots of the plan before and after"],
          },
          {
            name: "The refund demand",
            why: "Shows the refund was asked for, when, and the reply.",
            examples: ["Email or support ticket asking for the refund", "The provider's reply"],
          },
        ],
      },
      {
        id: "internet-agreement-hst",
        name: "An online sign-up that can be cancelled",
        plainExplanation:
          "Under s. 37 of the Consumer Protection Act, 2002, ss. 38 to 40 apply to an internet " +
          "agreement if the consumer's total potential payment obligation, excluding the cost of " +
          "borrowing, exceeds a prescribed amount; O. Reg. 17/05, s. 31 prescribes $50. Under " +
          "s. 38(1) and (2), before the consumer enters into an internet agreement, the supplier " +
          "shall disclose the prescribed information and give the consumer an express opportunity " +
          "to accept or decline the agreement and to correct errors immediately before entering " +
          "into it. Under s. 40(1), if the supplier did not do either of those things, the consumer " +
          "may cancel the agreement at any time from the date it is entered into until seven days " +
          "after the consumer receives a copy of it. Under s. 40(2), the consumer may cancel within " +
          "30 days after the date the agreement is entered into if the supplier does not comply " +
          "with a requirement under s. 39 (delivering a copy of the agreement). " +
          CPA_NOTICE +
          CPA_REFUND,
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, ss. 31, 79(1)" }],
        evidenceCategories: [
          {
            name: "The sign-up",
            why: "Shows what was shown before the order was placed, and whether a copy of the agreement came after.",
            examples: ["Screenshots of the checkout pages", "Confirmation emails received (or not)", "Date the order was placed"],
          },
          {
            name: "The cancellation and the refund request",
            why: "Shows when and how the agreement was cancelled.",
            examples: ["Cancellation email or support ticket", "Refund request and any reply"],
          },
        ],
      },
      {
        id: "amount-hst",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about each charge disputed, any refund already received, " +
          "and the documents those figures come from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The charges",
            why: "Supports the dollar amount claimed.",
            examples: ["Card or bank statements showing each charge", "Invoices", "A short list of each charge disputed"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "business-account-hst",
        name: "The provider says the account was for a business",
        plainExplanation:
          "Under s. 1 of the Consumer Protection Act, 2002, a \"consumer\" is an individual acting " +
          "for personal, family or household purposes, and does not include a person who is acting " +
          "for business purposes. This topic is about what the account was used for.",
        whenThisComesUp:
          "When the provider says the Consumer Protection Act, 2002 does not apply because the domain, hosting or software was for a business.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
      },
      {
        id: "dispute-charges-hst",
        name: "The provider says the charges were agreed",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the customer agreed to the renewal or the " +
          "change in price.",
        whenThisComesUp: "When the provider files a Defence (Form 9A) disputing the claim.",
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
          "Under s. 99(1) of the Consumer Protection Act, 2002, a consumer who charged a payment to " +
          "a credit card account may request the credit card issuer to cancel or reverse the charge " +
          "and any associated interest or other charges. Under s. 99(2), this applies to, among " +
          "others, a payment in respect of a consumer agreement that has been cancelled under the " +
          "Act, and a payment collected for unsolicited goods or services for which payment is not " +
          "required under s. 13. Under s. 99(3), the consumer may make the request if they have " +
          "cancelled the agreement or demanded a refund in accordance with the Act and the supplier " +
          "has not refunded all of the payment within the required period. Under s. 99(4), the " +
          "request shall be in writing and given to the credit card issuer in the prescribed period. " +
          "Under s. 99(6), a consumer may commence an action against a credit card issuer to recover " +
          "a payment and associated interest and other charges to which the consumer is entitled " +
          "under that section.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
      },
      { note: CPA_COURT_NOTE, sourceUrl: CPA, verifiedAt: VERIFIED, consolidationPeriod: CPA_CONSOLIDATION },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "hosting company charged me after I cancelled",
      "domain auto-renewed without asking",
      "software subscription price went up",
      "charged for a plan I didn't sign up for",
      "SaaS won't refund the annual fee",
      "web host keeps billing my card",
      "they changed my plan and charged more",
      "subscription renewed and they won't refund",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1, 2(1), 13, 37-40, 92, 94, 96, 99, 100",
      },
      {
        sourceName: "General, O. Reg. 17/05 (Consumer Protection Act, 2002)",
        officialUrl: CPA_REG,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 20, 21, 31, 79(1)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-influencer-or-brand-deal-unpaid",
    name: "An unpaid brand or influencer deal",
    broughtBy:
      "A content creator or influencer who made and posted content for a brand or agency and was not paid what was agreed.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "deal-terms-inf",
        name: "The deal: what was to be made, and what would be paid",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the agreement with the brand or agency: the content " +
          "to be made, where and when it was to be posted, any approval step, and the fee.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The agreement",
            why: "Shows what was promised on each side.",
            examples: ["Signed contract or brief", "Emails or direct messages agreeing to the deal", "Platform or agency booking confirmation"],
          },
          {
            name: "Who the deal was with",
            why: "Shows which person, brand or agency agreed to pay.",
            examples: ["Company name on the contract or invoice", "Agency contact details"],
          },
        ],
      },
      {
        id: "content-delivered-inf",
        name: "The content was made and posted as agreed",
        plainExplanation:
          "Ontario's Small Claims Court guide says the reasons for the claim should \"give a full " +
          "explanation of what happened, including the dates and places and nature of the " +
          "occurrences involved\", and that a copy of the supporting documents is attached to the " +
          "claim (if they are not attached, the claim gives the reasons why). This part of the " +
          "checklist is about what was posted, when and where, and any approval the brand gave.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The content",
            why: "Shows what was delivered and when it went live.",
            examples: ["Links to the posts or videos", "Dated screenshots", "Files sent to the brand"],
          },
          {
            name: "The brand's approval",
            why: "Shows the brand received and accepted the content.",
            examples: ["Approval emails or messages", "Performance reports sent to the brand"],
          },
        ],
      },
      {
        id: "amount-inf",
        name: "The amount owed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the agreed fee, any part already paid, and the " +
          "invoices and requests for payment.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Invoices and payment requests",
            why: "Supports the dollar amount claimed.",
            examples: ["Invoice sent to the brand", "Reminders and replies", "Records of any partial payment"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-deliverables-inf",
        name: "The brand says the content did not meet the brief",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the content was late, was not what was " +
          "agreed, or was never approved.",
        whenThisComesUp: "When the brand or agency files a Defence (Form 9A) disputing the claim.",
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
      { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "brand never paid me for the post",
      "influencer deal unpaid",
      "sponsored content not paid",
      "agency owes me for a campaign",
      "brand ghosted after I posted",
      "they used my content and didn't pay",
      "unpaid collaboration fee",
      "creator invoice ignored",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Guide to Procedures in Small Claims Court: Making a claim (ontario.ca)",
        officialUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        pinpoint: "How to fill out the claim form; Types of claims dealt with in Small Claims Court",
      },
      {
        sourceName: "Rules of the Small Claims Court, O. Reg. 258/98",
        officialUrl: SC_RULES,
        verifiedAt: VERIFIED,
        pinpoint: "rr. 9.01, 9.02",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-insurance-claim-denied",
    name: "An insurance claim refused",
    broughtBy:
      "A person insured under a policy (such as home, tenant or car insurance) whose claim the insurer refused or paid only in part.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "policy-terms-ins",
        name: "The policy, and what it covers",
        plainExplanation:
          "Under s. 122 of the Insurance Act, Part III applies to every contract of insurance made in " +
          "Ontario other than contracts of accident and sickness insurance, life insurance and " +
          "marine insurance, except where otherwise provided. Under s. 124(1), all the terms and " +
          "conditions of the contract shall be set out in full in the policy or by writing securely " +
          "attached to it when issued, and, unless so set out, no term or condition modifying or " +
          "impairing its effect is valid or admissible in evidence to the prejudice of the insured " +
          "or beneficiary. Under s. 125, an insurer shall upon request furnish to the insured a true " +
          "copy of the insured's application or proposal for insurance. This part of the checklist " +
          "is about the policy wording that covers the loss.",
        sourceUrl: INSURANCE,
        verifiedAt: VERIFIED,
        consolidationPeriod: INSURANCE_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The policy",
            why: "Shows what is covered, the limits, deductibles and exclusions.",
            examples: ["Full policy wording and declarations page", "Any endorsements attached", "Copy of the application, if requested"],
          },
          {
            name: "Proof the policy was in force",
            why: "Shows the coverage applied on the date of the loss.",
            examples: ["Premium payment records", "Renewal notices", "Pink slip or certificate of insurance"],
          },
        ],
      },
      {
        id: "loss-and-proof-ins",
        name: "The loss happened, and proof of loss was given",
        plainExplanation:
          "Under s. 136 of the Insurance Act, no action shall be brought for the recovery of money " +
          "payable under a contract of insurance until the expiration of sixty days after proof, in " +
          "accordance with the provisions of the contract, of the loss or of the happening of the " +
          "event upon which the insurance money is to become payable, or such shorter period as is " +
          "fixed by the contract. This part of the checklist is about what happened, when the claim " +
          "and proof of loss were given, and the insurer's refusal.",
        sourceUrl: INSURANCE,
        verifiedAt: VERIFIED,
        consolidationPeriod: INSURANCE_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Records of the loss",
            why: "Shows what was lost or damaged, and when.",
            examples: ["Dated photos or video", "Police or fire report, if any", "Receipts for the items lost"],
          },
          {
            name: "The claim and the refusal",
            why: "Shows when proof of loss was given and why the insurer refused.",
            examples: ["Proof of loss form and the date it was sent", "Claim number and adjuster's emails", "Denial letter"],
          },
        ],
      },
      {
        id: "amount-ins",
        name: "The amount claimed and how it is calculated",
        plainExplanation:
          AMOUNT +
          "This part of the checklist is about the value of the loss, the policy limits and " +
          "deductible, any amount the insurer already paid, and the documents those figures come " +
          "from.",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Value of the loss",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair or replacement quotes", "Receipts or appraisals", "A short worked calculation less the deductible"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "condition-not-met-ins",
        name: "The insurer says a condition of the policy was not met",
        plainExplanation:
          "Under s. 129 of the Insurance Act, where there has been imperfect compliance with a " +
          "statutory condition as to the proof of loss to be given by the insured, or another matter " +
          "or thing required to be done or omitted by the insured with respect to the loss, and a " +
          "consequent forfeiture or avoidance of the insurance in whole or in part, and the court " +
          "considers it inequitable that the insurance should be forfeited or avoided on that " +
          "ground, the court may relieve against the forfeiture or avoidance on such terms as it " +
          "considers just. Under s. 131(1), the insured's obligation to comply with a requirement " +
          "under a contract is excused to the extent that the insurer has given written notice that " +
          "compliance is excused, or the insurer's conduct reasonably causes the insured to believe " +
          "that compliance is excused and the insured acts on that belief to the insured's " +
          "detriment.",
        whenThisComesUp:
          "When the insurer refuses because proof of loss was late or incomplete, or another step under the policy was not taken.",
        sourceUrl: INSURANCE,
        verifiedAt: VERIFIED,
        consolidationPeriod: INSURANCE_CONSOLIDATION,
      },
      {
        id: "appraisal-ins",
        name: "The insurer disputes only the amount of the loss",
        plainExplanation:
          "Under s. 128(1) of the Insurance Act, s. 128 applies to a contract containing a " +
          "condition, statutory or otherwise, providing for an appraisal to determine specified " +
          "matters if the insured and the insurer disagree. Under s. 128(2) and (3), the insured and " +
          "the insurer each appoint an appraiser, the two appraisers appoint an umpire, and the " +
          "appraisers determine the matters in disagreement; if they fail to agree, they submit " +
          "their differences to the umpire, and the finding in writing of any two determines the " +
          "matters. Under s. 128(4), each party pays its own appraiser and they share equally the " +
          "expense of the appraisal and the umpire.",
        whenThisComesUp: "When the policy has an appraisal clause and the disagreement is about value or the amount of the loss.",
        sourceUrl: INSURANCE,
        verifiedAt: VERIFIED,
        consolidationPeriod: INSURANCE_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-no-agreement-existed"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "A dispute about statutory accident benefits after a car accident is NOT decided by this " +
          "court. Under s. 280(1) and (2) of the Insurance Act, a dispute about an insured person's " +
          "entitlement to statutory accident benefits, or the amount of them, may be brought by the " +
          "insured person or the insurer to the Licence Appeal Tribunal. Under s. 280(3), no person " +
          "may bring a proceeding in any court with respect to such a dispute, other than an appeal " +
          "from a decision of the Licence Appeal Tribunal or an application for judicial review.",
        sourceUrl: INSURANCE,
        verifiedAt: VERIFIED,
        consolidationPeriod: INSURANCE_CONSOLIDATION,
      },
      {
        note:
          "Some insurance claims have a one-year limit. Under s. 259.1 of the Insurance Act, a " +
          "proceeding against an insurer under a contract in respect of loss or damage to an " +
          "automobile or its contents shall be commenced within one year after the happening of the " +
          "loss or damage. For fire insurance to which Part IV of the Act applies (s. 143(1)), " +
          "statutory condition 14 in s. 148 says every action or proceeding against the insurer for " +
          "the recovery of a claim under the contract is absolutely barred unless commenced within " +
          "one year next after the loss or damage occurs; under s. 148(1), the statutory conditions " +
          "are deemed to be part of every contract in force in Ontario.",
        sourceUrl: INSURANCE,
        verifiedAt: VERIFIED,
        consolidationPeriod: INSURANCE_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "insurance denied my claim",
      "insurer refused to pay",
      "home insurance won't cover the damage",
      "tenant insurance claim rejected",
      "they only paid part of my claim",
      "insurance says I filed proof of loss too late",
      "car insurance won't pay for the damage",
      "adjuster denied the claim",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Insurance Act, R.S.O. 1990, c. I.8",
        officialUrl: INSURANCE,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 122, 124(1), 125, 128, 129, 131(1), 136, 143(1), 148 (statutory condition 14), 259.1, 280",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-bank-error-or-unauthorized-transaction",
    name: "A bank error or a transaction you did not make",
    broughtBy:
      "A customer who was charged for a credit card transaction they did not make, whose statement has an error the lender will not fix, or whose cheque was paid on a forged signature.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "account-and-transaction-bnk",
        name: "The account, and the transaction disputed",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about the account, each transaction or error disputed, " +
          "when it was noticed and reported, and what the bank or card issuer said.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "The statements",
            why: "Shows each transaction or error disputed and when it happened.",
            examples: ["Account or credit card statements", "Transaction details from online banking"],
          },
          {
            name: "The report and the reply",
            why: "Shows when the problem was reported and how the bank or issuer answered.",
            examples: ["Dispute form or letter", "Notes of calls with dates and names", "The written decision"],
          },
        ],
      },
      {
        id: "lost-or-stolen-card-bnk",
        name: "Charges on a lost or stolen credit card",
        plainExplanation:
          "Under s. 66 of the Consumer Protection Act, 2002, a \"lender\" includes a credit card " +
          "issuer, and a \"borrower\" is a consumer who, as a party to a credit agreement, receives " +
          "or may receive credit or a loan of money. Under s. 69, a borrower is not liable for any " +
          "amount greater than the prescribed maximum for unauthorized charges under a credit " +
          "agreement for open credit. O. Reg. 17/05, s. 58 applies to charges incurred without the " +
          "borrower's authorization when the credit card is used after having been lost or stolen: " +
          "the borrower is not liable for charges incurred after giving the lender oral or written " +
          "notice of the loss or theft, and the maximum liability for charges incurred before that " +
          "notice is the lesser of $50 and the amount fixed or agreed to by the lender as the " +
          "maximum. This part of the checklist is about when the card was lost or stolen and when " +
          "the issuer was told.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CPA_REG, pinpoint: "O. Reg. 17/05, s. 58" }],
        evidenceCategories: [
          {
            name: "The loss or theft",
            why: "Shows when the card went missing.",
            examples: ["Police report, if any", "Notes of when the card was last used by the cardholder"],
          },
          {
            name: "Notice to the issuer",
            why: "Shows when the issuer was told, which changes what the cardholder can be charged.",
            examples: ["Call log or reference number", "Email or chat confirming the card was reported"],
          },
        ],
      },
      {
        id: "statement-error-bnk",
        name: "An error on a credit card statement",
        plainExplanation:
          "Under s. 71 of the Consumer Protection Act, 2002, if there is an error in a statement of " +
          "account issued under a credit agreement for open credit, the lender shall correct the " +
          "error in accordance with the prescribed requirements. This part of the checklist is about " +
          "the error, when it was raised with the lender, and whether it was corrected.",
        sourceUrl: CPA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CPA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The error",
            why: "Shows what the statement says and what it should say.",
            examples: ["The statement with the error marked", "Receipts showing the correct amount"],
          },
          {
            name: "Requests to correct it",
            why: "Shows the lender was told and how it answered.",
            examples: ["Letters, emails or secure messages", "Notes of calls"],
          },
        ],
      },
      {
        id: "forged-cheque-bnk",
        name: "A cheque paid on a forged or unauthorized signature",
        plainExplanation:
          "Under s. 48(1) of the Bills of Exchange Act, subject to that Act, where a signature on a " +
          "bill is forged, or placed on it without the authority of the person whose signature it " +
          "purports to be, the forged or unauthorized signature is wholly inoperative, unless the " +
          "party against whom payment is sought to be enforced is precluded from setting up the " +
          "forgery or want of authority. Under s. 48(3), where a cheque payable to order is paid by " +
          "the drawee on a forged endorsement out of the funds of the drawer, or is so paid and " +
          "charged to the drawer's account, the drawer has no right of action against the drawee for " +
          "the amount unless the drawer gives notice in writing of the forgery to the drawee within " +
          "one year after acquiring notice of the forgery. Ontario's Small Claims Court guide says a " +
          "copy of the supporting documents is attached to the claim (if they are not attached, the " +
          "claim gives the reasons why).",
        sourceUrl: SC_GUIDE,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: BEA, pinpoint: "Bills of Exchange Act, s. 48(1) and (3)" }],
        evidenceCategories: [
          {
            name: "The cheque",
            why: "Shows the signature or endorsement that was forged.",
            examples: ["Image of the cleared cheque, front and back", "Statement showing it was charged to the account"],
          },
          {
            name: "Written notice of the forgery",
            why: "Shows the bank was told in writing, and when.",
            examples: ["Copy of the letter or email to the bank", "Proof of delivery"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-authorization-bnk",
        name: "The bank or issuer says the transaction was authorized",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the cardholder or account holder made or " +
          "allowed the transaction, or reported it too late.",
        whenThisComesUp: "When the bank or card issuer files a Defence (Form 9A) disputing the claim.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: FORM_7A_NOTE, sourceUrl: SC_GUIDE, verifiedAt: VERIFIED },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "charges on my credit card I didn't make",
      "my card was stolen and used",
      "bank won't reverse the charge",
      "error on my credit card statement",
      "someone forged my signature on a cheque",
      "bank cashed a forged cheque",
      "unauthorized transaction",
      "bank made a mistake on my account",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: CPA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 66, 69, 71",
      },
      {
        sourceName: "General, O. Reg. 17/05 (Consumer Protection Act, 2002)",
        officialUrl: CPA_REG,
        verifiedAt: VERIFIED,
        pinpoint: "s. 58",
      },
      {
        sourceName: "Bills of Exchange Act, R.S.C. 1985, c. B-4",
        officialUrl: BEA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 48(1), (3)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // -------------------------------------------------------------------------
  {
    id: "sc-claim-credit-report-error",
    name: "A mistake on your credit report",
    broughtBy:
      "A person whose credit report holds wrong information that the credit reporting agency did not correct, and who lost money because of it.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "report-inaccurate-crd",
        name: "The agency's file on the person holds wrong information",
        plainExplanation:
          "Under s. 1(1) of the Consumer Reporting Act, a \"consumer\" is a natural person (not a " +
          "person acting in the course of carrying on a business, other than in relation to " +
          "employment), a \"consumer reporting agency\" is a person who for gain or profit or on a " +
          "regular co-operative non-profit basis furnishes consumer reports, and a \"file\" is all " +
          "of the information about a consumer that the agency records and retains. Under s. 9(1), " +
          "every consumer reporting agency shall adopt all procedures reasonable for ensuring " +
          "accuracy and fairness in the contents of its consumer reports. Under s. 9(3), an agency " +
          "shall not include in a consumer report any credit information based on evidence that is " +
          "not the best evidence reasonably available, or any unfavourable personal information " +
          "unless it has made reasonable efforts to corroborate the evidence it is based on and the " +
          "lack of corroboration is noted with it. Under s. 12(1), a consumer may, in writing, " +
          "request a consumer reporting agency to provide the consumer's consumer report. This part " +
          "of the checklist is about what the report says and what is wrong with it.",
        sourceUrl: CRA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CRA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The credit report",
            why: "Shows the wrong information and when it was reported.",
            examples: ["Copy of the report from the agency", "Earlier reports, if any, for comparison"],
          },
          {
            name: "Proof of the true facts",
            why: "Shows what the information should say.",
            examples: ["Paid-in-full letter or account statement", "Proof an account is not the person's", "Identity theft report, if any"],
          },
        ],
      },
      {
        id: "dispute-not-corrected-crd",
        name: "The error was disputed, and the agency did not correct it",
        plainExplanation:
          "Under s. 13(1) of the Consumer Reporting Act, subject to any prescribed limitations, a " +
          "consumer may, in accordance with any prescribed requirements, dispute the accuracy or " +
          "completeness of any item of information in their file, and the consumer reporting agency " +
          "shall, within a reasonable time, use its best endeavours to confirm or complete the " +
          "information and shall correct, supplement or delete it in accordance with good practice. " +
          "Under s. 13(2), where the agency corrects, supplements or deletes information, it shall " +
          "notify the persons who were supplied with a consumer report based on the unamended file " +
          "within sixty days before the change, and the persons the consumer designates from among " +
          "those supplied with a report within the periods the section sets. This part of the " +
          "checklist is about the dispute, when it was made, and the agency's answer.",
        sourceUrl: CRA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CRA_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The dispute",
            why: "Shows what was disputed, when, and how.",
            examples: ["Dispute form, letter or online confirmation", "Documents sent with it"],
          },
          {
            name: "The agency's answer",
            why: "Shows whether the information was confirmed, corrected or left as it was.",
            examples: ["Letter or email with the results", "A later report still showing the error"],
          },
        ],
      },
      {
        id: "damages-crd",
        name: "The loss caused by the error",
        plainExplanation:
          "Under s. 23.1(1) of the Consumer Reporting Act, a person who contravenes the Act or the " +
          "regulations is liable to a consumer for any damages sustained by the consumer as a result " +
          "of the contravention. Under s. 23.1(3), this applies in addition to any other remedy " +
          "available by law to the consumer. " +
          AMOUNT +
          "This part of the checklist is about what the error cost: for example a loan refused or " +
          "made at a higher rate, and the documents those figures come from.",
        sourceUrl: CRA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CRA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: SC_GUIDE, pinpoint: "Making a claim -- How to fill out the claim form" }],
        evidenceCategories: [
          {
            name: "What the error led to",
            why: "Links the wrong information to the loss.",
            examples: ["Letter refusing credit, a rental or a job, giving the report as a reason", "Loan offer at a higher rate"],
          },
          {
            name: "The cost",
            why: "Supports the dollar amount claimed.",
            examples: ["Extra interest paid, with a short calculation", "Fees paid because of the refusal"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-report-crd",
        name: "The agency says its information was accurate, or its procedures were reasonable",
        plainExplanation:
          DEFENCE +
          "This topic is about a Defence whose reasons say the information was right, or that the " +
          "agency adopted reasonable procedures for accuracy as s. 9(1) of the Consumer Reporting " +
          "Act requires.",
        whenThisComesUp: "When the credit reporting agency files a Defence (Form 9A) disputing the claim.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: CRA, pinpoint: "Consumer Reporting Act, s. 9(1)" }],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 23.1(2) of the Consumer Reporting Act, a consumer has a right to commence an " +
          "action for those damages and may commence it in the Superior Court of Justice. Under " +
          "s. 22(1) of the Courts of Justice Act, the Small Claims Court is continued as a branch of " +
          "the Superior Court of Justice.",
        sourceUrl: CRA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CRA_CONSOLIDATION,
      },
      {
        note:
          "A complaint can also go to the Registrar of Consumer Reporting Agencies. Under s. 16(1) " +
          "of the Consumer Reporting Act, where the Registrar receives a written complaint about a " +
          "consumer reporting agency and so directs in writing, the agency shall furnish the " +
          "Registrar with such information about the matter complained of as the Registrar requires.",
        sourceUrl: CRA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CRA_CONSOLIDATION,
      },
      {
        note: LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: VERIFIED,
        consolidationPeriod: LIMITATIONS_CONSOLIDATION,
      },
    ],
    signals: [
      "mistake on my credit report",
      "Equifax won't fix my report",
      "TransUnion error",
      "debt on my credit report isn't mine",
      "paid account still showing as unpaid",
      "credit score dropped because of an error",
      "denied a loan because of my credit report",
      "credit bureau ignored my dispute",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Consumer Reporting Act, R.S.O. 1990, c. C.33",
        officialUrl: CRA,
        verifiedAt: VERIFIED,
        pinpoint: "ss. 1(1), 9(1), 9(3), 12(1), 13, 16(1), 23.1",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: CJA,
        verifiedAt: VERIFIED,
        pinpoint: "s. 22(1)",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
];
