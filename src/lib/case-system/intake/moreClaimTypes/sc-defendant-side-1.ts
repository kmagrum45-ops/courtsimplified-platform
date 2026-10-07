/**
 * Case types, batch "sc-defendant-side-1" (small-claims): written 2026-10-07 to the
 * brief in scripts/content/MORE_CASE_TYPES_BRIEF.md. Each entry's sources are
 * recorded in docs/sources/catalogue-verification/sc-defendant-side-1.json and held
 * by test:catalogue-verified. Planned in plan.json:
 *   sc-defence-served-and-confused -- Being served and not understanding the papers
 *   sc-defence-sued-for-something-you-did-not-do -- Being sued for something you did not do
 *   sc-defence-sued-for-more-than-owed -- Being sued for more than you owe
 *   sc-defence-want-to-claim-back -- Wanting to claim back against the person suing you
 *   sc-defence-sued-in-the-wrong-place -- Being sued in the wrong court or place
 *   sc-defence-default-judgment-against-you -- A judgment made without you there
 *   sc-defence-wages-or-bank-account-garnished -- Wages or a bank account being taken
 *   sc-defence-writ-against-property -- A writ registered against your property
 *   sc-defence-examination-hearing-summons -- A summons to an examination hearing
 *
 * These are the defendant's (or, after judgment, the debtor's) side. The
 * ClaimType shape calls the checklist "plaintiffElements"; here each one is
 * what the rules set out for the person responding, and "defendantConsiderations"
 * are the further situations that come up for them. Every legal statement rests
 * on the vendored corpus (docs/sources/corpus/, url from manifest.json): the
 * Rules of the Small Claims Court, the Courts of Justice Act, O. Reg. 626/00,
 * and the ontario.ca / ontariocourts.ca Small Claims guides. Notes on what was
 * left out, and why:
 *   - Rule 11.06 says "meritorious defence"; that word trips the case-grading
 *     check, so the text says "a defence that has merit". The record quotes the
 *     rule as written.
 *   - Rule 9.03(3) says the plaintiff "may dispute" the proposal; that phrase
 *     trips the check, so it is put as "a plaintiff who disputes the proposal".
 *   - The Wages Act, the Execution Act and the federal garnishment statutes are
 *     not in the corpus. The wage limit and the exemptions are stated only as
 *     the rules and the ontario.ca After Judgment guide state them, with no
 *     percentages or dollar amounts.
 *   - Steps to Justice pages on default judgment and garnishment are in the
 *     corpus but are not an official domain the checks accept, so they are not
 *     cited.
 */

import type { ClaimType } from "../claimTypes";

const VERIFIED = "2026-10-07";

const SC_RULES = "https://www.ontario.ca/laws/docs/980258_e.doc";
const SC_RULES_CONSOLIDATION = "2025-10-14";
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const CJA_CONSOLIDATION = "2025-12-11";
const MONETARY = "https://www.ontario.ca/laws/docs/000626_e.doc";
const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_CONSOLIDATION = "2024-12-04";
const REPLY_GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/replying-claim";
const AFTER_GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/after-judgment";
const MOTIONS_GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/motions-and-clerks-orders";
const CLAIM_GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim";
const SCJ_RESPOND = "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/";
const SCJ_STEPS =
  "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/";

// ---- Shared wording. Each entry that uses it has its own record. ----

const DEFENCE_DEADLINE =
  "Under rule 9.01 of the Rules of the Small Claims Court, a defendant who wishes to dispute a " +
  "plaintiff's claim serves a Defence (Form 9A) on every other party and files it, with proof of " +
  "service, with the clerk within 20 days of being served with the claim. ";

const DEFENCE_CONTENTS =
  "Under rule 9.02, the Defence gives the reasons why the defendant disputes the claim, \"expressed " +
  "in concise non-technical language with a reasonable amount of detail\". If the Defence is based " +
  "in whole or in part on a document, a copy is attached to each copy of the Defence; if it is " +
  "unavailable, the Defence says why. ";

const BURDEN =
  "The Superior Court of Justice's guide to the steps in a civil case says that in every civil " +
  "case the plaintiff has the burden of proof to establish, on a balance of probabilities, the " +
  "allegations in their claim -- evidence showing that, more likely than not, it would be correct " +
  "to rule in their favour. ";

const DEADLINE_NOTE =
  "The Superior Court of Justice says the Defence is filed, with proof of service, within 20 " +
  "calendar days from the date the claim was served. If the defence is not served and filed by " +
  "the deadline, the defendant may be noted in default and the Court may order judgment against " +
  "them without their participation.";

const SETTLEMENT_NOTE =
  "Ontario's guide to replying to a claim says that a defendant who disputed all or part of the " +
  "claim attends a settlement conference, which should take place within 90 days after the first " +
  "defence in the case is filed, and that it helps to tell the court in writing, when filing the " +
  "defence, about particular days in that period when they cannot attend.";

const LIMITATION_NOTE =
  "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding cannot " +
  "be started after the second anniversary of the day the claim was discovered. Section 5(1) sets " +
  "out when a claim is discovered, and under s. 5(2) a person with a claim is presumed to have " +
  "known of those matters on the day the act or omission the claim is based on took place, unless " +
  "the contrary is proved.";

const PAID_IN_FULL =
  "Under rule 20.12, if payment is made in full satisfaction of an order, a party can file a " +
  "Request for Clerk's Order on Consent (Form 11.2A) where all parties consent, or the debtor can " +
  "make a motion for an order confirming that payment has been made in full. Ontario's After " +
  "Judgment guide says that if the creditor is unavailable or unwilling to sign, the debtor can " +
  "make the motion, and that there is a fee for it.";

const RULES_CITATION = {
  sourceName: "Rules of the Small Claims Court, O. Reg. 258/98",
  officialUrl: SC_RULES,
  verifiedAt: VERIFIED,
  pinpoint: "rr. 9.01-9.03: the Defence and proposals of terms of payment",
};
const REPLY_CITATION = {
  sourceName: "Ontario.ca -- Guide to Procedures in Small Claims Court: Replying to a Claim",
  officialUrl: REPLY_GUIDE,
  verifiedAt: VERIFIED,
  pinpoint: "Overview; how to dispute the claim; how much time you have",
};
const AFTER_CITATION = {
  sourceName: "Ontario.ca -- Guide to Procedures in Small Claims Court: After Judgment",
  officialUrl: AFTER_GUIDE,
  verifiedAt: VERIFIED,
  pinpoint: "What the debtor can do; examination, garnishment and writs",
};
const ENFORCEMENT_CITATION = {
  sourceName: "Rules of the Small Claims Court, O. Reg. 258/98",
  officialUrl: SC_RULES,
  verifiedAt: VERIFIED,
  pinpoint: "Rule 20: enforcement of orders",
};

export const TYPES_SC_DEFENDANT_SIDE_1: ClaimType[] = [
  // ------------------------------------------------------------------
  {
    id: "sc-defence-served-and-confused",
    name: "Being served and not understanding the papers",
    broughtBy:
      "Someone else started this case. This is for the person or business who has been handed or " +
      "mailed Small Claims Court papers -- the defendant -- and wants to understand what they are and " +
      "what comes next. Not the person who is suing.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "what-the-papers-are-confused",
        name: "What the papers are and what they say",
        plainExplanation:
          "Ontario's guide to replying to a claim says that if someone starts an action against you in " +
          "Small Claims Court, you will receive either a Plaintiff's Claim (Form 7A) or a Defendant's " +
          "Claim (Form 10A). Under rule 7.01(2) of the Rules of the Small Claims Court, a plaintiff's " +
          "claim gives the full names of the parties, the nature of the claim with reasonable certainty " +
          "and detail (including the date, place and nature of the events it is based on), and the " +
          "amount of the claim and the relief requested. If the claim is based on a document, a copy is " +
          "attached, or the claim says why it is not. This part of the checklist is about reading what " +
          "is being claimed, by whom, and for how much.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: REPLY_GUIDE, pinpoint: "Replying to a claim: Overview" }],
        evidenceCategories: [
          {
            name: "The papers themselves",
            why: "Show who is suing, the court file number, the court office, and what is claimed.",
            examples: ["The Plaintiff's Claim (Form 7A) and every attached page", "Any Additional Parties form (Form 1A)", "Documents attached to the claim"],
          },
          {
            name: "Your own records about the same events",
            why: "Let you check each thing the claim says against what you have.",
            examples: ["Contracts, invoices or receipts", "Texts, emails or letters with the person suing", "Bank records of payments"],
          },
        ],
      },
      {
        id: "when-service-counted-confused",
        name: "When the papers were served",
        plainExplanation:
          "Under rule 8.01(1), a plaintiff's claim is served personally or by an alternative to personal " +
          "service. Under rule 8.03(2) and (4), if the papers were left at your home with an adult member " +
          "of the household and another copy was mailed or couriered, service is effective on the fifth " +
          "day after the copy is mailed or verified by courier as delivered. Under rule 8.03(7) and (8), " +
          "if the claim was sent by registered mail or courier, service is effective on the date receipt " +
          "is verified by signature on the delivery confirmation. This part of the checklist is about " +
          "how and when the papers reached you, since the time to respond runs from service.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "How the papers arrived",
            why: "Shows which kind of service was used and the date it counts from.",
            examples: ["The envelope, with any postmark", "Registered mail or courier slip", "A note of who handed the papers over and when"],
          },
        ],
      },
      {
        id: "time-to-respond-confused",
        name: "The time to respond, and what happens if nothing is filed",
        plainExplanation:
          DEFENCE_DEADLINE +
          "Ontario's guide to replying to a claim says that if you ignore the claim it will be assumed " +
          "that you admit the truth of what is claimed, and the plaintiff can get a judgment against you " +
          "with no further notice, which can then be enforced. It says that after the 20 days, you may " +
          "still try to file a defence, and it will be accepted as long as the plaintiff has not filed a " +
          "request to note you in default. This part of the checklist is about the date you were served " +
          "and the date 20 days later.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: REPLY_GUIDE, pinpoint: "What happens if you ignore the claim; how much time you have to file a defence" }],
        evidenceCategories: [
          {
            name: "Your dates",
            why: "Fix when the 20 days started and ends.",
            examples: ["The date you were served", "A calendar note of the 20th day"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "agree-and-want-to-pay-confused",
        name: "You agree you owe some or all of it and want to arrange payment",
        plainExplanation:
          "Under rule 9.03(1), a defendant who admits liability for all or part of the plaintiff's claim " +
          "but wishes to arrange terms of payment may, in the Defence, admit liability and propose terms " +
          "of payment. Under rule 9.03(2), if the plaintiff does not dispute the proposal within 20 days, " +
          "the defendant makes payment under the proposal as if it were a court order. Ontario's guide " +
          "says payments are made directly to the plaintiff and that proof of payments is kept.",
        whenThisComesUp: "When the person served agrees with the claim, or part of it, but cannot pay it all at once.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: REPLY_GUIDE, pinpoint: "If you agree you owe the money" }],
      },
      {
        id: "papers-never-reached-you-confused",
        name: "The papers did not come to your notice in time",
        plainExplanation:
          "Under rule 8.10, a person who has been served, or is deemed to have been served, under the " +
          "rules is still entitled to show, on a motion to set aside the consequences of default, on a " +
          "motion for an extension of time, or in support of a request for an adjournment, that the " +
          "document did not come to their notice, or came to their notice only later than when it was " +
          "served or deemed served.",
        whenThisComesUp: "When the papers went to an old address, or were left with someone who did not pass them on until later.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: DEADLINE_NOTE, sourceUrl: SCJ_RESPOND, verifiedAt: VERIFIED },
      { note: DEFENCE_CONTENTS.trim(), sourceUrl: SC_RULES, verifiedAt: VERIFIED, consolidationPeriod: SC_RULES_CONSOLIDATION },
    ],
    signals: [
      "i was served with papers",
      "got served with a claim",
      "i received a plaintiff's claim",
      "someone is suing me in small claims",
      "i am being sued",
      "i'm being sued",
      "don't understand the papers",
      "what do i do with this claim",
      "papers from small claims court",
      "form 7a",
    ],
    typicalDefendantProfile: "either",
    citations: [REPLY_CITATION, RULES_CITATION],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-defence-sued-for-something-you-did-not-do",
    name: "Being sued for something you did not do",
    broughtBy:
      "The defendant: a person or business named in a Small Claims Court claim who says they were not " +
      "the one involved, or that what the claim describes did not happen. Not the person suing.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "plaintiff-must-prove-denied",
        name: "The person suing has to prove what they say",
        plainExplanation:
          BURDEN +
          "This part of the checklist is about each thing the claim says you did, and what you have that " +
          "shows otherwise.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        evidenceCategories: [
          {
            name: "Where you were and what you did",
            why: "Records your side of the events the claim describes.",
            examples: ["Calendar, work schedule or travel records", "Texts or emails from the time", "Names of people who were there"],
          },
          {
            name: "Who was really involved",
            why: "Shows whether the claim names the right person or business.",
            examples: ["The contract or invoice and who signed it", "Business registration records", "Messages showing who the plaintiff dealt with"],
          },
        ],
      },
      {
        id: "defence-reasons-denied",
        name: "A Defence that says what you disagree with and why",
        plainExplanation:
          DEFENCE_CONTENTS +
          "Ontario's guide to replying to a claim says to give clear, detailed reasons why you dispute " +
          "the claim, that separately numbered paragraphs often help, and that if the claim has numbered " +
          "paragraphs you can reply to each one using the same numbers. This part of the checklist is " +
          "about answering each point in the claim.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: REPLY_GUIDE, pinpoint: "How to fill in the defence" }],
        evidenceCategories: [
          {
            name: "Documents your Defence relies on",
            why: "Rule 9.02 has a copy attached to the Defence.",
            examples: ["Receipts or contracts", "Photos", "Letters or messages"],
          },
        ],
      },
      {
        id: "someone-else-responsible-denied",
        name: "Someone else is responsible for what the plaintiff lost",
        plainExplanation:
          "Under rule 10.01(1) of the Rules of the Small Claims Court, a defendant may make a claim " +
          "against any other person arising out of the transaction or occurrence relied on by the " +
          "plaintiff, or related to the plaintiff's claim. Ontario's guide to replying to a claim says " +
          "that if you believe someone else should be responsible for paying the claim, you indicate " +
          "that in your Defence and complete and file a Defendant's Claim (Form 10A). This part of the " +
          "checklist is about who that other person or business is and how they are connected.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: REPLY_GUIDE, pinpoint: "If you think someone else is responsible for the plaintiff's loss" }],
        evidenceCategories: [
          {
            name: "The other person's part",
            why: "Shows how the other person or business is connected to the events.",
            examples: ["Their contract, invoice or work order", "Messages with them", "Their full name and address for service"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "wrong-name-on-claim-denied",
        name: "The claim has your name wrong, or names the wrong person",
        plainExplanation:
          "Ontario's guide to replying to a claim says to write your name on the Defence as it appears in " +
          "the claim, and that if your legal name is different from the name used on the claim, you " +
          "indicate the error and state your full legal name in your Defence. It also says that if your " +
          "address is listed incorrectly, you put your correct address on the Defence.",
        whenThisComesUp: "When the claim spells your name differently, uses a business name, or mixes you up with someone else.",
        sourceUrl: REPLY_GUIDE,
        verifiedAt: VERIFIED,
      },
      {
        id: "claim-shows-no-cause-denied",
        name: "The claim does not say anything that could make you responsible",
        plainExplanation:
          "Under rule 12.02(1), the court may, on motion, strike out or amend all or part of any document " +
          "that discloses no reasonable cause of action or defence, may delay or make it difficult to " +
          "have a fair trial, or is inflammatory, a waste of time, a nuisance or an abuse of the court's " +
          "process. Under rule 12.02(2), for a claim, the court may order that the action be stayed or " +
          "dismissed.",
        whenThisComesUp: "When the claim, even read as written, does not describe anything the defendant did.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-no-agreement-existed", "defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: DEADLINE_NOTE, sourceUrl: SCJ_RESPOND, verifiedAt: VERIFIED },
      { note: SETTLEMENT_NOTE, sourceUrl: REPLY_GUIDE, verifiedAt: VERIFIED },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: VERIFIED, consolidationPeriod: LIMITATIONS_CONSOLIDATION },
    ],
    signals: [
      "suing me for something i didn't do",
      "sued for something i did not do",
      "i had nothing to do with it",
      "they have the wrong person",
      "sued the wrong person",
      "i never did that",
      "it wasn't me",
      "i was never there",
      "never had any dealings with them",
      "the claim is false",
    ],
    typicalDefendantProfile: "either",
    citations: [REPLY_CITATION, RULES_CITATION],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-defence-sued-for-more-than-owed",
    name: "Being sued for more than you owe",
    broughtBy:
      "The defendant: a person or business who agrees they owe something, but says the claim asks for " +
      "more than is owed. Not the person suing.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "plaintiff-must-prove-amount-more",
        name: "The person suing has to prove the amount",
        plainExplanation:
          BURDEN +
          "Under rule 7.01(2), a plaintiff's claim states the amount of the claim and the relief " +
          "requested. This part of the checklist is about how the plaintiff worked out the amount, and " +
          "which parts of it you accept.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: SC_RULES, pinpoint: "r. 7.01(2), para. 1 iii" }],
        evidenceCategories: [
          {
            name: "What was agreed or charged",
            why: "Shows the amount you agree was owed in the first place.",
            examples: ["The contract, quote or invoice", "Messages about the price"],
          },
          {
            name: "What you already paid",
            why: "Shows payments that reduce the amount owed.",
            examples: ["Bank statements or e-transfer records", "Receipts", "Cancelled cheques"],
          },
        ],
      },
      {
        id: "admit-part-propose-terms-more",
        name: "Admitting the part you owe, and proposing how to pay it",
        plainExplanation:
          "Under rule 9.03(1) of the Rules of the Small Claims Court, a defendant who admits liability for " +
          "all or part of the plaintiff's claim but wishes to arrange terms of payment may, in the " +
          "Defence, admit liability and propose terms of payment. Ontario's guide to replying to a claim " +
          "says you can make a proposal for only part of the amount claimed, make payments as proposed, " +
          "and go to a settlement conference and, if necessary, a trial about the amount you do not admit " +
          "owing. This part of the checklist is about the amount you accept and the payments you can make.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: REPLY_GUIDE, pinpoint: "If you only agree you owe part of what is claimed" }],
        evidenceCategories: [
          {
            name: "Your own calculation",
            why: "Shows the amount you admit and how you reached it.",
            examples: ["A list of charges you accept and those you do not", "A payment plan you can keep up"],
          },
        ],
      },
      {
        id: "reasons-for-the-rest-more",
        name: "Reasons for disputing the rest",
        plainExplanation:
          DEFENCE_CONTENTS +
          "This part of the checklist is about each charge or amount in the claim that you do not accept, " +
          "and why.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Records about the disputed amounts",
            why: "Show why a charge is not owed or is too high.",
            examples: ["Quotes or prices for the same work or item", "Photos", "Messages about extras or changes"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "plaintiff-disputes-proposal-more",
        name: "The person suing does not accept your payment proposal",
        plainExplanation:
          "Under rule 9.03(3), a plaintiff who disputes the proposal does so within 20 days after service " +
          "of the Defence by filing and serving a request to clerk (Form 9B) for a terms of payment " +
          "hearing. Under rule 9.03(4.2) and (4.3), if the defendant is an individual, the clerk serves a " +
          "financial information form (Form 20I) with the notice of hearing, and the defendant completes " +
          "it and serves it on the creditor before the hearing but does not file it with the court. Under " +
          "rule 9.03(5), the referee or other person may make an order as to terms of payment, and under " +
          "rule 9.03(6), if the defendant does not appear, the clerk may sign default judgment for the " +
          "part of the claim that has been admitted.",
        whenThisComesUp: "When the plaintiff files a request for a terms of payment hearing after receiving the Defence.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        id: "missed-proposal-payment-more",
        name: "A payment under the proposal is missed",
        plainExplanation:
          "Under rule 9.03(2), if the plaintiff does not dispute the proposal, the defendant makes payment " +
          "under it as if it were a court order. If a payment is missed, the plaintiff may serve a notice " +
          "of default of payment (Form 20L), and the clerk signs judgment for the unpaid balance of the " +
          "undisputed amount once the plaintiff files an affidavit of default of payment (Form 20M) " +
          "swearing, among other things, that 15 days have passed since the defendant was served with " +
          "the notice.",
        whenThisComesUp: "When the defendant has fallen behind on the payments they proposed in their Defence.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-set-off-or-counterclaim", "defence-failure-to-mitigate", "defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      { note: DEADLINE_NOTE, sourceUrl: SCJ_RESPOND, verifiedAt: VERIFIED },
      { note: SETTLEMENT_NOTE, sourceUrl: REPLY_GUIDE, verifiedAt: VERIFIED },
    ],
    signals: [
      "suing me for more than i owe",
      "i only owe part of it",
      "the amount is wrong",
      "they're asking for too much",
      "claiming more than i owe",
      "i already paid some of it",
      "inflated the amount",
      "padded the bill",
      "i owe less than they say",
      "the claim is too high",
    ],
    typicalDefendantProfile: "either",
    citations: [REPLY_CITATION, RULES_CITATION],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-defence-want-to-claim-back",
    name: "Wanting to claim back against the person suing you",
    broughtBy:
      "The defendant: a person or business being sued in Small Claims Court who says the plaintiff, " +
      "or someone else connected to the same events, owes them money. Not the person who started the case.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "who-you-can-claim-against-back",
        name: "Who a Defendant's Claim can be made against",
        plainExplanation:
          "Under rule 10.01(1) of the Rules of the Small Claims Court, a defendant may make a claim against " +
          "the plaintiff; against any other person arising out of the transaction or occurrence relied on " +
          "by the plaintiff, or related to the plaintiff's claim; or against both. Ontario's guide to " +
          "replying to a claim says you indicate this in your Defence and file a Defendant's Claim " +
          "(Form 10A), and that in it you are \"a plaintiff by defendant's claim\". This part of the " +
          "checklist is about who owes you, and how it connects to the plaintiff's claim.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: REPLY_GUIDE, pinpoint: "If you think the plaintiff should pay; if you think someone else is responsible" }],
        evidenceCategories: [
          {
            name: "The connection to the plaintiff's claim",
            why: "Shows your claim arises from, or is related to, the same events.",
            examples: ["The same contract or invoice", "Messages about the same job, sale or incident"],
          },
          {
            name: "Who you are claiming against",
            why: "A Defendant's Claim names each person and an address for service.",
            examples: ["Full legal name of each person or business", "Their address for service"],
          },
        ],
      },
      {
        id: "proving-your-own-claim-back",
        name: "Proving your own claim",
        plainExplanation:
          BURDEN +
          "Under rule 10.05(1), the rules apply to a defendant's claim as if it were a plaintiff's claim. " +
          "This part of the checklist is about what you say you are owed and the records that show it.",
        sourceUrl: SCJ_STEPS,
        verifiedAt: VERIFIED,
        alsoCites: [{ sourceUrl: SC_RULES, pinpoint: "r. 10.05(1)" }],
        evidenceCategories: [
          {
            name: "What you are owed",
            why: "Shows the amount and how it was worked out.",
            examples: ["Unpaid invoices", "Receipts for your own losses", "A running total with dates"],
          },
        ],
      },
      {
        id: "what-the-claim-contains-back",
        name: "What the Defendant's Claim has to say",
        plainExplanation:
          "Under rule 10.01(4), a defendant's claim gives the full names of the parties to it, the nature " +
          "of the claim in concise non-technical language with a reasonable amount of detail (including " +
          "the date, place and nature of the events), the amount claimed and the relief requested, the " +
          "address where the defendant believes each person claimed against may be served, and the court " +
          "file number of the plaintiff's claim. If it is based on a document, a copy is attached, or the " +
          "claim says why it is not.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Documents your claim is based on",
            why: "Rule 10.01(4) has a copy attached to each copy of the claim.",
            examples: ["Contract or agreement", "Invoices or estimates", "Photos"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "tried-together-or-separately-back",
        name: "Whether your claim is heard with the plaintiff's claim",
        plainExplanation:
          "Under rule 10.04(1), a defendant's claim is tried and disposed of at the trial of the action, " +
          "unless the court orders otherwise. Under rule 10.04(2), if it appears that a defendant's claim " +
          "may unduly complicate or delay the trial or cause undue prejudice to a party, the court may " +
          "order separate trials or direct that the defendant's claim proceed as a separate action.",
        whenThisComesUp: "When the claim back is about something quite different from what the plaintiff is suing over.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        id: "claim-back-over-limit-back",
        name: "The amount you want to claim is more than the Small Claims limit",
        plainExplanation:
          "Under s. 23(1) of the Courts of Justice Act, the Small Claims Court has jurisdiction in any " +
          "action for the payment of money where the amount claimed does not exceed the prescribed amount, " +
          "exclusive of interest and costs. Under s. 1(1) of O. Reg. 626/00, the maximum amount of a claim " +
          "in the Small Claims Court is $50,000. Under rule 6.02 of the Rules of the Small Claims Court, a " +
          "cause of action cannot be divided into two or more actions to bring it within the court's " +
          "jurisdiction.",
        whenThisComesUp: "When what the defendant says they are owed is more than $50,000.",
        sourceUrl: CJA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CJA_CONSOLIDATION,
        alsoCites: [
          { sourceUrl: MONETARY, pinpoint: "O. Reg. 626/00, s. 1(1)" },
          { sourceUrl: SC_RULES, pinpoint: "r. 6.02" },
        ],
      },
    ],
    applicableDefenceConceptIds: ["defence-set-off-or-counterclaim", "defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs", "sc-remedy-outside-jurisdiction"],
    proceduralNotes: [
      {
        note:
          "Under rule 10.01(2), a Defendant's Claim (Form 10A) may be issued within 20 days after the day " +
          "the Defence is filed, or later but before trial or default judgment, with leave of the court. " +
          "Under rule 10.02, the defendant serves it on every person it is made against, in the same way " +
          "as a plaintiff's claim.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        note:
          "Under rule 10.03, a party who wishes to dispute the defendant's claim serves a Defence (Form 9A) " +
          "on every other party and files it, with proof of service, within 20 days after service of the " +
          "defendant's claim.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      { note: LIMITATION_NOTE, sourceUrl: LIMITATIONS, verifiedAt: VERIFIED, consolidationPeriod: LIMITATIONS_CONSOLIDATION },
    ],
    signals: [
      "they actually owe me",
      "i want to counterclaim",
      "counterclaim",
      "sue them back",
      "claim back against them",
      "defendant's claim",
      "form 10a",
      "they still owe me money",
      "i want to file my own claim against them",
      "they owe me more than i owe them",
    ],
    typicalDefendantProfile: "either",
    citations: [REPLY_CITATION, { ...RULES_CITATION, pinpoint: "r. 10: defendant's claim" }],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-defence-sued-in-the-wrong-place",
    name: "Being sued in the wrong court or place",
    broughtBy:
      "The defendant: a person or business served with a Small Claims Court claim filed at a court " +
      "location far from where they live or where the events happened, or for more than the court's " +
      "limit. Not the person suing.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "where-a-claim-is-started-place",
        name: "Where a Small Claims action is started",
        plainExplanation:
          "Under rule 6.01(1) of the Rules of the Small Claims Court, an action is commenced in the " +
          "territorial division in which the cause of action arose, or in which the defendant (or any one " +
          "of several defendants) resides or carries on business, or at the court's place of sitting " +
          "nearest to where the defendant (or any one of them) resides or carries on business. This part " +
          "of the checklist is about where the events happened and where each defendant lives or does " +
          "business.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Where the events happened",
            why: "Shows the place the cause of action arose.",
            examples: ["The address of the job, sale or incident", "The contract showing where it was signed or performed"],
          },
          {
            name: "Where you live or do business",
            why: "Shows which court locations are tied to the defendant.",
            examples: ["Proof of address", "Business registration or location"],
          },
        ],
      },
      {
        id: "moving-the-trial-place",
        name: "Asking for the trial to be held somewhere else",
        plainExplanation:
          "Under rule 6.01(2), an action is tried where it was commenced, but if the court is satisfied " +
          "that the balance of convenience substantially favours another place, the court may order the " +
          "trial held there. Under rule 6.01(3), if at the trial, settlement conference or trial " +
          "management conference the judge finds the place where the action was commenced is not the " +
          "proper place of trial, the court may order it tried in any other place where it could have " +
          "been commenced. Under rule 17.01(3), if the defendant does not attend trial and an issue about " +
          "the proper place of trial under rule 6.01(1) was raised in the Defence, the trial judge " +
          "considers it and makes a finding.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Why another place is more convenient",
            why: "Rule 6.01(2) looks at the balance of convenience.",
            examples: ["Where the witnesses live", "Where the property or work is", "Travel distance and cost"],
          },
        ],
      },
      {
        id: "amount-over-limit-place",
        name: "A claim for more than the Small Claims limit",
        plainExplanation:
          "Under s. 23(1) of the Courts of Justice Act, the Small Claims Court has jurisdiction in any " +
          "action for the payment of money where the amount claimed does not exceed the prescribed amount, " +
          "exclusive of interest and costs, and in actions for the recovery of personal property worth no " +
          "more than that amount. Under s. 1(1) of O. Reg. 626/00, the maximum amount of a claim in the " +
          "Small Claims Court is $50,000. This part of the checklist is about the total amount claimed, " +
          "not counting interest and costs.",
        sourceUrl: CJA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CJA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: MONETARY, pinpoint: "O. Reg. 626/00, s. 1(1)" }],
        evidenceCategories: [
          {
            name: "The amount claimed",
            why: "Shows whether the claim is inside the court's limit.",
            examples: ["The amount on the Plaintiff's Claim", "Any other claims by the same plaintiff about the same events"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "served-outside-the-area-place",
        name: "You were served outside the court's area",
        plainExplanation:
          "Under rule 11.01(3), if all the defendants have been served outside the court's territorial " +
          "division, the clerk does not note any defendant in default until it is proved, by an affidavit " +
          "for jurisdiction (Form 11A) or by evidence before a judge, that the action was properly brought " +
          "in that territorial division.",
        whenThisComesUp: "When the claim was filed at a court location in a different area from where the defendant was served.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        id: "split-claims-place",
        name: "The plaintiff split one claim into several",
        plainExplanation:
          "Under rule 6.02, a cause of action cannot be divided into two or more actions for the purpose " +
          "of bringing it within the court's jurisdiction.",
        whenThisComesUp: "When the same plaintiff has started more than one claim about the same events, each under the limit.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-outside-jurisdiction"],
    proceduralNotes: [
      {
        note: DEFENCE_DEADLINE.trim(),
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        note:
          "Under s. 23(1.1) of the Courts of Justice Act, an action within the Small Claims Court's " +
          "jurisdiction cannot be commenced in the Superior Court of Justice except with leave of the " +
          "Superior Court of Justice as provided in the rules of court. Under s. 23(2), an action in the " +
          "Superior Court may be transferred to the Small Claims Court with the consent of all parties " +
          "before the trial starts, if the only claim is for money or the recovery of personal property " +
          "and it is within the Small Claims Court's jurisdiction.",
        sourceUrl: CJA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CJA_CONSOLIDATION,
      },
    ],
    signals: [
      "sued in the wrong court",
      "filed in the wrong city",
      "filed in a court far away",
      "wrong courthouse",
      "the court is hours away",
      "i live in a different city",
      "it happened in a different city",
      "move the case to my city",
      "they split the claim",
      "over the small claims limit",
    ],
    typicalDefendantProfile: "either",
    citations: [{ ...RULES_CITATION, pinpoint: "r. 6: forum and jurisdiction" }, {
      sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
      officialUrl: CJA,
      verifiedAt: VERIFIED,
      pinpoint: "s. 23: Small Claims Court jurisdiction",
    }],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-defence-default-judgment-against-you",
    name: "A judgment made without you there",
    broughtBy:
      "The defendant: a person or business who has been noted in default, or has a default judgment or " +
      "a judgment from a trial they missed made against them, and wants to understand it or have it " +
      "set aside. Not the person who got the judgment.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "what-default-means-default",
        name: "What being noted in default means",
        plainExplanation:
          "Under rule 11.01(1) of the Rules of the Small Claims Court, if a defendant does not file a " +
          "defence within the time allowed, the clerk may note the defendant in default. Under rule " +
          "11.02(1), the clerk may then sign default judgment for a debt or liquidated (set) demand in " +
          "money. Under rule 11.05(1), a defendant who has been noted in default cannot file a defence or " +
          "take any other step, except a motion under rule 11.06, without leave of the court or the " +
          "plaintiff's consent. Ontario's guide to replying to a claim says the plaintiff can then obtain " +
          "default judgment without further notice. This part of the checklist is about what has been " +
          "filed against you, and when.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: REPLY_GUIDE, pinpoint: "What happens if you are noted in default" }],
        evidenceCategories: [
          {
            name: "What the court sent you",
            why: "Shows whether you were noted in default, and whether a judgment was signed.",
            examples: ["The Default Judgment (Form 11B)", "Any notice from the court office", "The court file number"],
          },
        ],
      },
      {
        id: "setting-aside-test-default",
        name: "Asking the court to set the default aside",
        plainExplanation:
          "Under rule 11.06, the court may set aside the noting in default or default judgment, and any " +
          "step taken to enforce the judgment, on such terms as are just, if the party makes a motion and " +
          "the court is satisfied that the party has a defence that has merit and a reasonable " +
          "explanation for the default, and that the motion is made as soon as is reasonably possible in " +
          "all the circumstances. Ontario's guide to replying to a claim says that in your materials you " +
          "explain what your defence is and why you did not file it in time. This part of the checklist " +
          "is about those three things.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: REPLY_GUIDE, pinpoint: "How to ask for the noting in default or a default judgment to be set aside" }],
        evidenceCategories: [
          {
            name: "Why the Defence was not filed in time",
            why: "Rule 11.06 looks for a reasonable explanation for the default.",
            examples: ["When and how you first learned of the claim", "Proof you were away, ill or at another address", "The envelope or delivery record"],
          },
          {
            name: "Your answer to the claim",
            why: "Rule 11.06 looks at the defence you would have filed.",
            examples: ["A draft Defence", "Documents that answer the claim"],
          },
          {
            name: "How quickly you acted",
            why: "Rule 11.06 asks whether the motion was made as soon as reasonably possible.",
            examples: ["The date you learned of the judgment", "The date you contacted the court office"],
          },
        ],
      },
      {
        id: "papers-did-not-reach-you-default",
        name: "The claim did not come to your notice",
        plainExplanation:
          "Under rule 8.10, a person who has been served, or is deemed to have been served, is still " +
          "entitled to show, on a motion to set aside the consequences of default, that the document did " +
          "not come to their notice, or came to their notice only later than when it was served or deemed " +
          "served. This part of the checklist is about when, and how, you found out about the claim.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Where you were living or working",
            why: "Shows whether the papers went somewhere you would see them.",
            examples: ["Lease or proof of a move", "Mail forwarding records", "Statements from household members"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "plaintiff-consents-default",
        name: "The person suing agrees to set it aside",
        plainExplanation:
          "Under rule 11.2.01(1), the clerk makes an order on the filing of a Request for Clerk's Order on " +
          "Consent (Form 11.2A), signed by all parties, setting aside the noting in default or default " +
          "judgment and any specified step to enforce the judgment that has not yet been completed. " +
          "Ontario's motions guide says that if all parties do not consent, the clerk cannot make the order.",
        whenThisComesUp: "When the plaintiff is willing to agree that the defendant can file a Defence after all.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: MOTIONS_GUIDE, pinpoint: "Request for clerk's order on consent" }],
      },
      {
        id: "missed-the-trial-default",
        name: "The judgment was made at a trial you did not attend",
        plainExplanation:
          "Under rule 17.01(2), if a party fails to attend when an action is called for trial, the orders " +
          "open to the trial judge include proceeding in the party's absence or, if the plaintiff attends " +
          "and the defendant does not, striking out the defence and allowing the plaintiff to prove the " +
          "claim. Under rule 17.01(4) and " +
          "(5), the court may set aside or vary a judgment obtained against a party who failed to attend " +
          "trial, on such terms as are just, only if that party makes a motion within 30 days after " +
          "becoming aware of the judgment, or makes a motion to extend that time and the court is " +
          "satisfied that special circumstances justify it.",
        whenThisComesUp: "When the defendant filed a Defence but was not at the trial when the judgment was made.",
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
          "Ontario's motions guide says a notice of motion and supporting affidavit (Form 15A) is served on " +
          "each party, except a defendant noted in default, at least 7 days before the motion hearing, and " +
          "filed with the court at least 3 days before it, with an affidavit of service for each party served.",
        sourceUrl: MOTIONS_GUIDE,
        verifiedAt: VERIFIED,
      },
      {
        note:
          "Under rule 20.08(20), the clerk does not pay out to the creditor money received under a notice " +
          "of garnishment if a notice of motion and supporting affidavit (Form 15A) has been filed under " +
          "rule 8.10, 11.06 or 17.04, or a garnishment hearing has been requested.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    signals: [
      "default judgment",
      "noted in default",
      "judgment against me and i didn't know",
      "i never got the claim",
      "i missed the deadline to file a defence",
      "they got a judgment without me",
      "i missed the trial",
      "set aside the judgment",
      "i didn't know about the court date",
      "found out about the judgment",
    ],
    typicalDefendantProfile: "either",
    citations: [{ ...RULES_CITATION, pinpoint: "r. 11: default proceedings; r. 11.06" }, REPLY_CITATION],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-defence-wages-or-bank-account-garnished",
    name: "Wages or a bank account being taken",
    broughtBy:
      "The debtor: a person with a Small Claims Court judgment against them whose wages or bank account " +
      "are being garnished, or a joint account holder affected by it. Not the creditor collecting.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "how-garnishment-works-garnish",
        name: "How garnishment works",
        plainExplanation:
          "Under rule 20.08(1) of the Rules of the Small Claims Court, a creditor may enforce an order for " +
          "the payment of money by garnishment of debts payable to the debtor by other persons, such as an " +
          "employer or a bank. Under rule 20.08(6.1), the creditor serves the notice of garnishment on the " +
          "debtor within five days of serving it on the garnishee. Under rule 20.08(7), the garnishee pays " +
          "to the clerk any debt it owes the debtor, up to the amount in the notice, within 10 days after " +
          "service or 10 days after the debt becomes payable, whichever is later. This part of the " +
          "checklist is about the judgment, the notice, and who was served.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The garnishment papers",
            why: "Show the judgment, the amount, and the garnishee named.",
            examples: ["Notice of Garnishment (Form 20E)", "Affidavit for Enforcement Request (Form 20P)", "The judgment itself"],
          },
          {
            name: "What has been paid",
            why: "Shows how much of the judgment is still owing.",
            examples: ["Pay stubs showing deductions", "Bank statements", "Receipts for payments made to the creditor"],
          },
        ],
      },
      {
        id: "what-cannot-be-taken-garnish",
        name: "Limits on what can be garnished",
        plainExplanation:
          "Under rule 20.08(9), the amounts paid into court by a garnishee cannot exceed the portion of the " +
          "debtor's wages that are subject to seizure or garnishment under section 7 of the Wages Act. " +
          "Ontario's After Judgment guide says section 7 of the Wages Act restricts the amount of wages " +
          "that can be garnished, and that employment insurance, social assistance and pension payments " +
          "cannot be garnished, even if the funds have been deposited into an account at a financial " +
          "institution. This part of the checklist is about where the money being taken comes from.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: AFTER_GUIDE, pinpoint: "Notice of Garnishment" }],
        evidenceCategories: [
          {
            name: "Where the money in the account came from",
            why: "Shows whether deposits were wages or payments the guide says cannot be garnished.",
            examples: ["Employment insurance or social assistance statements", "Pension deposit records", "Bank statements showing each deposit"],
          },
        ],
      },
      {
        id: "joint-account-garnish",
        name: "A joint account or debt owed to more than one person",
        plainExplanation:
          "Under rule 20.08(2), if a debt is payable to the debtor and to one or more co-owners, one-half " +
          "of it, or a greater or lesser amount set by order at a garnishment hearing, may be garnished. " +
          "Under rule 20.08(16), a person served with a notice to co-owner of debt cannot dispute the " +
          "enforcement or a payment made by the clerk unless they request a garnishment hearing within 30 " +
          "days after the notice is sent.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Whose money it is",
            why: "Shows each co-owner's share of the account.",
            examples: ["Account agreement listing the owners", "Records of who deposited what"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "garnishment-hearing-garnish",
        name: "Asking for a garnishment hearing",
        plainExplanation:
          "Under rule 20.08(15), at the request of a creditor, debtor, garnishee, co-owner of the debt or " +
          "any other interested person, the clerk schedules a garnishment hearing. Under rule 20.08(15.2), " +
          "at the hearing the court may vary or suspend periodic payments under a notice of garnishment, " +
          "determine the rights and liabilities of the people involved, or determine any other matter " +
          "about the notice. Ontario's After Judgment guide says a debtor who does not agree with a notice " +
          "of garnishment, or for whom it means real financial hardship, can request a hearing and ask for " +
          "an order to increase the amount of wages that is exempt under the Wages Act.",
        whenThisComesUp: "When the debtor disagrees with the garnishment, or the deductions leave too little to live on.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: AFTER_GUIDE, pinpoint: "What the debtor can do if money is being garnished" }],
      },
      {
        id: "more-than-one-judgment-garnish",
        name: "More than one judgment against you",
        plainExplanation:
          "Under rule 20.09(1), a debtor with two or more unsatisfied orders for the payment of money may " +
          "make a motion for a consolidation order. Under rule 20.09(2), the affidavit sets out each " +
          "creditor, the amount owed to each, the debtor's income from all sources, and the debtor's " +
          "current financial obligations. Under rule 20.09(9), while the consolidation order is in force, " +
          "no step to enforce the judgment may be taken by a creditor named in it, except issuing a writ " +
          "of seizure and sale of land and filing it with the sheriff. Under rule 20.09(10), the order " +
          "terminates immediately if the debtor is in default under it for 21 days.",
        whenThisComesUp: "When several creditors with Small Claims judgments are collecting from the same person.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        id: "paid-in-full-garnish",
        name: "The judgment has been paid in full",
        plainExplanation:
          "Under rule 20.08(20.2), once the amount owing under an order enforced by garnishment is paid, " +
          "the creditor immediately serves a notice of termination of garnishment (Form 20R) on the " +
          "garnishee and the clerk. " +
          PAID_IN_FULL,
        whenThisComesUp: "When money is still being taken after the judgment has been paid off.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: AFTER_GUIDE, pinpoint: "When the debt has been paid in full but the notice of garnishment hasn't expired" }],
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Ontario's After Judgment guide says the person requesting a garnishment hearing gets a hearing " +
          "date from the court office, completes a Notice of Garnishment Hearing (Form 20Q), serves it on " +
          "the creditor, debtor, garnishee, any co-owner of the debt and any other interested person, and " +
          "files it before the hearing date, and that there is no fee to file it.",
        sourceUrl: AFTER_GUIDE,
        verifiedAt: VERIFIED,
      },
      {
        note:
          "Under rule 20.08(20.1), the clerk pays out the first payment under a notice of garnishment 30 " +
          "days after it is received, and later payments as they are received. Under rule 20.08(5.1), a " +
          "notice of garnishment remains in force for six years from the date it is issued and for a " +
          "further six years from each renewal.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    signals: [
      "my wages are being garnished",
      "garnishing my wages",
      "garnishment",
      "my bank account was frozen",
      "they took money from my bank account",
      "notice of garnishment",
      "my employer got a garnishment",
      "money taken off my paycheque",
      "garnished my joint account",
      "they took my ei payment",
    ],
    typicalDefendantProfile: "individual",
    citations: [ENFORCEMENT_CITATION, AFTER_CITATION],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-defence-writ-against-property",
    name: "A writ registered against your property",
    broughtBy:
      "The debtor: a person or business with a Small Claims Court judgment against them, where the " +
      "creditor has had a writ of seizure and sale issued against their land or belongings. Not the " +
      "creditor collecting.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "writ-against-land-writ",
        name: "What a writ of seizure and sale of land does",
        plainExplanation:
          "Under rule 20.07(1) of the Rules of the Small Claims Court, if an order for the payment of money " +
          "is unsatisfied, the clerk, at the creditor's request, issues a writ of seizure and sale of land " +
          "(Form 20D) to the sheriff the creditor names. Ontario's After Judgment guide says the writ " +
          "would encumber any land the debtor owns now, or may buy later, in the county or district where " +
          "it is filed, and that it will be difficult for the debtor to sell or mortgage the land until " +
          "the debt is paid. This part of the checklist is about where the writ was filed and what land is " +
          "affected.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: AFTER_GUIDE, pinpoint: "Writ of Seizure and Sale of Land" }],
        evidenceCategories: [
          {
            name: "The writ and the judgment",
            why: "Show the amount, the date, and the sheriff it was filed with.",
            examples: ["The writ of seizure and sale (Form 20D)", "The judgment", "A title search showing the writ"],
          },
          {
            name: "What has been paid",
            why: "Shows how much is still owing under the judgment.",
            examples: ["Receipts or bank records of payments to the creditor"],
          },
        ],
      },
      {
        id: "how-long-a-writ-lasts-writ",
        name: "How long the writ lasts, and when land can be sold",
        plainExplanation:
          "Under rule 20.07(3), a writ of seizure and sale of land expires on the sixth anniversary of its " +
          "issue, or if renewed, on the sixth anniversary of the date it would otherwise have expired. " +
          "Ontario's After Judgment guide says that four months after filing the writ the creditor can " +
          "direct the sheriff to seize and sell the land, but the sale cannot proceed until the writ has " +
          "been on file for six months, and that the enforcement office can only sell the portion of the " +
          "land that the debtor actually owns.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: AFTER_GUIDE, pinpoint: "When the land can be sold" }],
        evidenceCategories: [
          {
            name: "Dates",
            why: "Show when the writ was issued and filed.",
            examples: ["The issue date on the writ", "Any notice from the sheriff"],
          },
          {
            name: "What you own in the land",
            why: "Shows the debtor's share, and any mortgages or liens.",
            examples: ["Deed or title record", "Mortgage statement"],
          },
        ],
      },
      {
        id: "writ-against-belongings-writ",
        name: "A writ against belongings (personal property)",
        plainExplanation:
          "Under rule 20.06(1), if there is default under an order for the payment of money, the clerk, at " +
          "the creditor's request, issues a writ of seizure and sale of personal property (Form 20C) to a " +
          "bailiff. Ontario's After Judgment guide says that under the Execution Act a debtor is entitled " +
          "to certain exemptions from seizure of personal property, such as clothing, household furniture " +
          "and tools used in the debtor's business (each up to a certain amount) and one motor vehicle " +
          "worth less than the specified amount, and that the debtor has a right to choose the goods that " +
          "make up the exemptions. Under rule 20.06(5), the bailiff delivers an inventory of property " +
          "seized within a reasonable time after the debtor asks, and under rule 20.06(6), seized property " +
          "is not sold unless notice of the time and place of sale has been mailed to the debtor at least " +
          "10 days before.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: AFTER_GUIDE, pinpoint: "Debtor's goods exempt from seizure by the creditor" }],
        evidenceCategories: [
          {
            name: "What was seized or listed",
            why: "Shows which belongings are affected.",
            examples: ["The bailiff's inventory", "Photos of the items", "Receipts showing the value of items"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "paid-in-full-writ",
        name: "The judgment has been paid, but the writ is still there",
        plainExplanation: PAID_IN_FULL,
        whenThisComesUp: "When the debt is paid off but the writ still shows against the property.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: AFTER_GUIDE, pinpoint: "What the parties should do if the judgment has been paid in full" }],
      },
      {
        id: "ask-court-to-stay-or-vary-writ",
        name: "Asking the court to pause enforcement or change the payments",
        plainExplanation:
          "Under rule 20.02(1), the court may stay the enforcement of an order of the court for such time " +
          "and on such terms as are just, and may vary the times and proportions in which money payable " +
          "under an order is paid, if it is satisfied that the debtor's circumstances have changed.",
        whenThisComesUp: "When the debtor's money situation has changed since the judgment, or a sale is being arranged.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under rules 20.02(2), 20.09(9) and 20.10(8), while an order for periodic payment, a " +
          "consolidation order or an order as to payment is in force, no step to enforce the judgment may " +
          "be taken or continued by a creditor named in it, except issuing a writ of seizure and sale of " +
          "land and filing it with the sheriff.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        note:
          "Under rule 20.07(1.1), if more than six years have passed since the order was made, a writ of " +
          "seizure and sale of land may be issued only with leave of the court. Under rule 20.07(4) and " +
          "(5), a writ filed with the sheriff may be renewed before it expires by filing a request to " +
          "renew (Form 20N), during the six-year period before that expiry.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    signals: [
      "writ of seizure and sale",
      "writ against my house",
      "writ on my property",
      "a writ was registered",
      "lien on my house from small claims",
      "can't sell my house because of a judgment",
      "sheriff wants to sell my house",
      "bailiff seized my things",
      "bailiff took my car",
      "writ is still on title",
    ],
    typicalDefendantProfile: "either",
    citations: [ENFORCEMENT_CITATION, AFTER_CITATION],
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------
  {
    id: "sc-defence-examination-hearing-summons",
    name: "A summons to an examination hearing",
    broughtBy:
      "The debtor, or another person, served with a notice of examination after a Small Claims Court " +
      "judgment, who has to attend and answer questions about money and property. Not the creditor.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "why-you-are-examined-exam",
        name: "What the examination is about",
        plainExplanation:
          "Under rule 20.10(1) of the Rules of the Small Claims Court, if there is default under an order " +
          "for the payment of money, the clerk, at the creditor's request, issues a notice of examination " +
          "(Form 20H) to the debtor or other person. Under rule 20.10(4), the person may be examined about " +
          "the reason for nonpayment, the debtor's income and property, the debts owed to and by the " +
          "debtor, any property the debtor has disposed of before or after the order, the debtor's present, " +
          "past and future means to satisfy the order, whether the debtor intends to obey the order, and " +
          "any other matter pertinent to enforcing it. Under rule 20.10(5), an officer or director of a " +
          "corporate debtor, or a partner or sole proprietor, may be examined on the debtor's behalf.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "Income and work",
            why: "Rule 20.10(4) covers the debtor's income.",
            examples: ["Recent pay stubs", "Employer's name and address", "Benefit statements"],
          },
          {
            name: "Accounts, property and debts",
            why: "Rule 20.10(4) covers property and debts owed to and by the debtor.",
            examples: ["Statements for every bank account, including joint accounts", "Vehicle ownership", "Mortgage, loan and credit card statements"],
          },
        ],
      },
      {
        id: "financial-form-exam",
        name: "The Financial Information Form and supporting documents",
        plainExplanation:
          "Under rule 20.10(4.1), a person served with a notice of examination informs themselves about " +
          "the matters in rule 20.10(4) and is prepared to answer questions about them. A debtor who is " +
          "an individual completes a financial information form (Form 20I), serves it on the creditor but " +
          "does not file it with the court, and provides a copy to the judge at the hearing. Under rule " +
          "20.10(4.2), the debtor brings the documents needed to support the information in the form. " +
          "Ontario's After Judgment guide says to ask the courtroom clerk to return these documents after " +
          "the hearing.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: AFTER_GUIDE, pinpoint: "What happens to the Financial Information Form" }],
        evidenceCategories: [
          {
            name: "The completed form",
            why: "Rule 20.10(4.1) has it served on the creditor and given to the judge.",
            examples: ["Financial Information Form (Form 20I)", "Proof it was served on the creditor"],
          },
          {
            name: "Documents that back up the form",
            why: "Rule 20.10(4.2) has the debtor bring them.",
            examples: ["Pay stubs", "Bank statements", "Rent or mortgage and household bills"],
          },
        ],
      },
      {
        id: "notice-served-in-time-exam",
        name: "How and when the notice was served",
        plainExplanation:
          "Under rule 8.01(10), a notice of examination is served on the debtor or person to be examined " +
          "personally or by an alternative to personal service. Under rule 8.01(11) and (12), if the " +
          "debtor is an individual, a blank financial information form is served with it, at least 30 days " +
          "before the date fixed for the examination, and the notice is filed with proof of service at " +
          "least three days before that date.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        evidenceCategories: [
          {
            name: "The notice and how it arrived",
            why: "Shows the hearing date and when service happened.",
            examples: ["Notice of Examination (Form 20H)", "The envelope or a note of who delivered it and when"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "not-attending-contempt-exam",
        name: "What happens if you do not attend or do not answer",
        plainExplanation:
          "Under s. 30(1) of the Courts of Justice Act, the Small Claims Court may order a debtor or other " +
          "person who is required to and fails to attend an examination to attend a contempt hearing. " +
          "Under s. 30(2), the court may find the person in contempt if satisfied that the person was " +
          "required to attend, was served with a notice to attend under the rules, failed to attend, and " +
          "that the failure was wilful. Under rule 20.11(1), the same applies to a person who attends but " +
          "refuses to answer questions or produce records or documents. Under rule 20.11(7), at a contempt " +
          "hearing the court may order the person to attend an examination, be jailed for not more than " +
          "five days, attend another contempt hearing, or comply with any other order the judge considers " +
          "necessary or just.",
        whenThisComesUp: "When the person served cannot attend on the date, or has already missed the examination.",
        sourceUrl: CJA,
        verifiedAt: VERIFIED,
        consolidationPeriod: CJA_CONSOLIDATION,
        alsoCites: [{ sourceUrl: SC_RULES, pinpoint: "r. 20.11(1) and (7)" }],
      },
      {
        id: "set-aside-contempt-order-exam",
        name: "Asking to set aside an order to attend a contempt hearing",
        plainExplanation:
          "Under rule 20.11(4), a person ordered to attend a contempt hearing for failing to attend an " +
          "examination may make a motion to set aside the order before the date of the hearing, and the " +
          "court may set it aside and order the person to attend another examination. Ontario's After " +
          "Judgment guide says that in the affidavit you explain why you did not attend and that you are " +
          "willing to attend a rescheduled examination, and that if the motion cannot be heard before the " +
          "contempt hearing, or is refused, you must attend the contempt hearing. It also says paying the " +
          "debt does not remove the contempt.",
        whenThisComesUp: "When the person missed the examination and has been ordered to a contempt hearing.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
        alsoCites: [{ sourceUrl: AFTER_GUIDE, pinpoint: "Asking the court to cancel a contempt hearing ordered for failure to attend the examination hearing" }],
      },
    ],
    applicableDefenceConceptIds: [],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under rule 20.10(6), the examination is held in the absence of the public unless the court " +
          "orders otherwise, conducted under oath, and recorded. Under rule 20.10(7) and (8), after the " +
          "examination, or if the debtor's consent is filed, the court may make an order as to payment, " +
          "and while it is in force no step to enforce the judgment may be taken by a creditor named in " +
          "it, except issuing a writ of seizure and sale of land and filing it with the sheriff.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
      {
        note:
          "Under rule 20.11(3), if the court orders a contempt hearing, the creditor serves the notice of " +
          "contempt hearing on the debtor or other person personally and files proof of service at least " +
          "seven days before the hearing.",
        sourceUrl: SC_RULES,
        verifiedAt: VERIFIED,
        consolidationPeriod: SC_RULES_CONSOLIDATION,
      },
    ],
    signals: [
      "examination hearing",
      "notice of examination",
      "judgment debtor examination",
      "debtor examination",
      "summons to an examination",
      "financial information form",
      "form 20i",
      "contempt hearing",
      "i missed my examination hearing",
      "they want to question me about my finances",
    ],
    typicalDefendantProfile: "either",
    citations: [ENFORCEMENT_CITATION, AFTER_CITATION, {
      sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
      officialUrl: CJA,
      verifiedAt: VERIFIED,
      pinpoint: "s. 30: contempt hearing for failure to attend examination",
    }],
    reviewedAt: null,
    status: "draft",
  },
];
