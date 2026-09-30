/**
 * The 21 procedural-stage cards shown on /legal-principles.
 *
 * *** WHY THIS MOVED OUT OF THE PAGE ***
 *
 * This content lived inside `app/legal-principles/page.tsx` as a module-private
 * const, which meant `contentInventory.ts` could not see it — so 926 lines of
 * live procedural content across three courts appeared in NO review packet. A
 * licensee could have signed off all 268 catalogued items and left every word
 * of this unreviewed.
 *
 * Found by independent review on 2026-09-23, recorded in
 * docs/lso-fixes-report.md, and moved here on the site owner's decision.
 *
 * *** NOTHING ABOUT THE CONTENT CHANGED IN THE MOVE ***
 *
 * The cards, the citation constants and the ordering are byte-for-byte what the
 * page rendered before. The page now imports from here and renders exactly the
 * same array. A move that also edited the content would make the diff
 * unreviewable, and this is content a licensee is about to read.
 *
 * *** 2026-09-30: AUDITED CLAIM BY CLAIM ***
 *
 * Every statement was checked against the vendored rules and pages. 28 were
 * corrected: two were wrong outright (a "1 day's notice" for family motions
 * and a "30 days after the settlement conference" trial request, neither in
 * any rule), the rest dropped a condition, cited only a guide for a rule's
 * requirement, or asked the platform to "assess" something. Statements of
 * what a rule requires now carry the rule's pinpoint and cite the rule.
 *
 * *** WHAT IT IS, AND WHAT IT IS NOT ***
 *
 * Hand-written by people, every card carrying at least one citation with an
 * official URL and a verification date. No model has ever touched it. That is
 * why it was not caught by the AI audit — and also why it still needs licensee
 * review: "not written by AI" and "checked by a licensee" are different claims,
 * and only the first was ever true here.
 */

export type PrincipleCitation = {
  sourceName: string;
  officialUrl: string;
  verifiedAt: string;
  pinpoint?: string;
};

export type PrincipleCard = {
  courtPath: "Small Claims Court" | "Superior Court (Civil)" | "Family Court";
  title: string;
  summary: string;
  keyFacts: string[];
  workflowUse: string[];
  commonRisks: string[];
  citations: [PrincipleCitation, ...PrincipleCitation[]];
};

const ONTARIO_COURTS_SMALL_CLAIMS_STEPS: PrincipleCitation = {
  sourceName: "Ontario Superior Court of Justice — Steps in a Case (Small Claims Court)",
  officialUrl:
    "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/steps-in-a-case/",
  verifiedAt: "2026-08-25",
};

const ONTARIO_COURTS_SMALL_CLAIMS_RESPOND: PrincipleCitation = {
  sourceName: "Ontario Superior Court of Justice — How to Respond to a Case (Small Claims Court)",
  officialUrl:
    "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
  verifiedAt: "2026-08-25",
};

const ONTARIO_COURTS_SMALL_CLAIMS_DEFAULT: PrincipleCitation = {
  sourceName: "Ontario Superior Court of Justice — Default Proceedings (Small Claims Court)",
  officialUrl:
    "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/default-proceedings/",
  verifiedAt: "2026-08-25",
};

const ONTARIO_SUING_SOMEONE_SMALL_CLAIMS: PrincipleCitation = {
  sourceName: "Ontario.ca — Suing Someone in Small Claims Court",
  officialUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
  verifiedAt: "2026-08-25",
  pinpoint: "monetary limit updated effective October 1, 2025",
};

// 2026-09-30: read from docs/sources/corpus/ontario-fee-waiver.txt, retrieved
// 2026-09-27 (manifest id "ontario-fee-waiver"). The page lists the income,
// liquid-asset and net-worth figures without making clear, in its text form,
// whether they combine, so the card names the income figure only as an example
// and sends the reader to the page for the rest.
const ONTARIO_FEE_WAIVER: PrincipleCitation = {
  sourceName: "Ontario.ca — Have your court fees waived",
  officialUrl: "https://www.ontario.ca/page/have-your-court-fees-waived",
  verifiedAt: "2026-09-27",
};

const ONTARIO_GUIDE_MAKING_CLAIM: PrincipleCitation = {
  sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a Claim",
  officialUrl:
    "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
  verifiedAt: "2026-08-25",
};

const ONTARIO_GUIDE_SERVING_DOCUMENTS: PrincipleCitation = {
  sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Serving Documents",
  officialUrl:
    "https://www.ontario.ca/document/guide-procedures-small-claims-court/serving-documents",
  verifiedAt: "2026-08-25",
};

const ONTARIO_GUIDE_GETTING_READY: PrincipleCitation = {
  sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Getting Ready for Court",
  officialUrl:
    "https://www.ontario.ca/document/guide-procedures-small-claims-court/getting-ready-court",
  verifiedAt: "2026-08-25",
};

const ONTARIO_COURT_FORMS_SMALL_CLAIMS: PrincipleCitation = {
  sourceName: "Ontario Court Services — Rules of the Small Claims Court Forms",
  officialUrl: "https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/",
  verifiedAt: "2026-08-25",
};

const ONTARIO_COURTS_CIVIL_STEPS: PrincipleCitation = {
  sourceName: "Ontario Superior Court of Justice — Steps to a Civil Case",
  officialUrl:
    "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
  verifiedAt: "2026-08-25",
};

const ONTARIO_CIVIL_CLAIMS_GUIDE: PrincipleCitation = {
  sourceName: "Ontario.ca — Civil Claims: Suing and Being Sued",
  officialUrl: "https://www.ontario.ca/page/civil-claims-suing-and-being-sued",
  verifiedAt: "2026-08-25",
};

const ONTARIO_COURT_FORMS_CIVIL: PrincipleCitation = {
  sourceName: "Ontario Court Services — Rules of Civil Procedure Forms",
  officialUrl: "https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/",
  verifiedAt: "2026-08-25",
};

const ONTARIO_COURTS_FAMILY_STEPS: PrincipleCitation = {
  sourceName: "Ontario Superior Court of Justice — The Steps in a Family Case",
  officialUrl:
    "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/family-resources-to-help-self-represented-litigants/steps/",
  verifiedAt: "2026-08-25",
};

const ONTARIO_COURT_FORMS_FAMILY: PrincipleCitation = {
  sourceName: "Ontario Court Services — Family Law Rules Forms",
  officialUrl: "https://ontariocourtforms.on.ca/en/family-law-rules-forms/",
  verifiedAt: "2026-08-25",
};

/*
 * The three procedural regulations themselves.
 *
 * Every other citation in this file points at a guide or a forms index. Those
 * are good sources for orientation and bad ones for a requirement: a guide
 * summarises, and the summary is where "filed with proof of service" goes
 * missing. Where a statement below says what a rule REQUIRES, it cites the rule.
 *
 * All three are vendored verbatim under docs/sources/ and were re-read there on
 * the verifiedAt date, not recalled.
 */
const OREG_258_98_RULES: PrincipleCitation = {
  sourceName: "O. Reg. 258/98 — Rules of the Small Claims Court (e-Laws)",
  officialUrl: "https://www.ontario.ca/laws/regulation/980258",
  verifiedAt: "2026-09-17",
};

const RCP_RULES: PrincipleCitation = {
  // Cited R.R.O. 1990, Reg. 194 — not "O. Reg. 194/90", which is a common but
  // incorrect form, and not "Ontario Regulation 194", which this file used
  // before 2026-09-17.
  sourceName: "R.R.O. 1990, Reg. 194 — Rules of Civil Procedure (e-Laws)",
  officialUrl: "https://www.ontario.ca/laws/regulation/900194",
  verifiedAt: "2026-09-17",
};

const FLR_RULES: PrincipleCitation = {
  sourceName: "O. Reg. 114/99 — Family Law Rules (e-Laws)",
  officialUrl: "https://www.ontario.ca/laws/regulation/990114",
  verifiedAt: "2026-09-17",
};

// 2026-09-30 audit: the sources below are vendored under docs/sources/corpus/
// (limitations-act-2002, ontario-fees-small-claims, ontario-file-small-claims-online,
// ontario-fees-family) and every statement citing them was re-read there.
const LIMITATIONS_ACT: PrincipleCitation = {
  sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B (e-Laws)",
  officialUrl: "https://www.ontario.ca/laws/statute/02l24",
  verifiedAt: "2026-09-30",
  pinpoint: "s. 4",
};

const ONTARIO_FEES_SMALL_CLAIMS: PrincipleCitation = {
  sourceName: "Ontario.ca — Fees for Small Claims Court",
  officialUrl: "https://www.ontario.ca/page/fees-small-claims-court",
  verifiedAt: "2026-09-30",
};

const ONTARIO_FILE_SMALL_CLAIMS_ONLINE: PrincipleCitation = {
  sourceName: "Ontario.ca — File Small Claims Court documents online",
  officialUrl: "https://www.ontario.ca/page/file-small-claims-court-documents-online",
  verifiedAt: "2026-09-30",
};

const ONTARIO_FEES_FAMILY: PrincipleCitation = {
  sourceName: "Ontario.ca — Family court fees",
  officialUrl: "https://www.ontario.ca/page/family-court-fees",
  verifiedAt: "2026-09-30",
  pinpoint: "Paying family court fees online",
};

export const PRINCIPLES: PrincipleCard[] = [
  // ---- Small Claims Court ----
  {
    courtPath: "Small Claims Court",
    title: "Monetary Jurisdiction",
    summary:
      "Small Claims Court can only hear claims up to a set dollar limit. Claims for more than that must go to the Superior Court of Justice, unless the excess is waived.",
    keyFacts: [
      "The claim limit is $50,000, excluding interest and costs.",
      "This limit increased from $35,000 effective October 1, 2025.",
      "The minimum amount that can be appealed also rose, from $3,500 to $5,000.",
      // Was "within two years of the incident". Limitations Act, 2002 s. 4 runs
      // from the day the claim was DISCOVERED (2026-09-30 audit).
      "Under the Limitations Act, 2002, a claim generally cannot be started more than two years after the day it was discovered (s. 4).",
    ],
    workflowUse: [
      "Confirm the claim amount fits Small Claims Court before starting a case.",
      "Use Evidence to support the dollar amount claimed.",
    ],
    commonRisks: [
      "Filing in the wrong court for the amount claimed.",
      "Missing the two-year limitation period.",
    ],
    citations: [ONTARIO_SUING_SOMEONE_SMALL_CLAIMS, LIMITATIONS_ACT],
  },
  {
    courtPath: "Small Claims Court",
    title: "Filing a Claim",
    summary: "Starting a Small Claims Court case requires the correct form, served on the defendant within a fixed window.",
    keyFacts: [
      "A claim is started with the Plaintiff's Claim (Form 7A).",
      "An action is commenced by filing the Plaintiff's Claim with the clerk, together with a copy for each defendant — not required if it is filed electronically.",
      // "additional parties use Form 1A" until 2026-09-17, which reads as a
      // way to ADD a party. Under r. 1.06 (3) Form 1A is a continuation sheet,
      // appended when a form's first page has no room to list everyone. A user
      // looking for joinder would have filled in the wrong document.
      "Counter-claims use the Defendant's Claim (Form 10A). Form 1A is a continuation sheet, appended to a form when its first page has no room to list all the parties.",
      "The claim must be served on the defendant within six months of being issued.",
      "Service of the claim is proved by an Affidavit of Service (Form 8A), or by a lawyer or paralegal's Certificate of Service (Form 8B) where that licensee served it, or caused it to be served, and is satisfied service was effected.",
    ],
    workflowUse: [
      "Use Forms to locate and complete Form 7A.",
      "Use Evidence to organize proof of the amount and basis of the claim before filing.",
    ],
    commonRisks: [
      "Letting the six-month service window lapse.",
      "Serving the claim but never filing proof of how and when it was served.",
      "Using the wrong form for the type of claim.",
    ],
    citations: [ONTARIO_GUIDE_MAKING_CLAIM, ONTARIO_COURT_FORMS_SMALL_CLAIMS, OREG_258_98_RULES],
  },
  {
    courtPath: "Small Claims Court",
    title: "Responding to a Claim",
    summary: "A defendant has a short, fixed window to file a defence, with a specific form required.",
    keyFacts: [
      "A defendant must serve and file a Defence (Form 9A) within 20 calendar days of being served with the claim.",
      // Was "An Affidavit of Service (Form 8A) must be filed to show all
      // parties were properly served" -- true, and it named only one of the two
      // ways r. 8.09.1 allows service to be proved. A defendant whose paralegal
      // served the defence and filed Form 8B would read this as saying their
      // file was incomplete.
      "The defence is served on every other party and filed with proof of service — an Affidavit of Service (Form 8A), or a lawyer or paralegal's Certificate of Service (Form 8B).",
      "The Defence can be filed in person, or online: through the Ontario Courts Public Portal for Toronto-region cases (since October 14, 2025), and through the Small Claims Court Submissions Online portal elsewhere.",
    ],
    workflowUse: [
      "Use Forms to complete Form 9A before the deadline.",
      "Use Dashboard to track the 20-day response deadline.",
    ],
    commonRisks: [
      "Missing the 20-day deadline.",
      "Filing the Defence without proof of service (Form 8A or 8B).",
    ],
    citations: [ONTARIO_COURTS_SMALL_CLAIMS_RESPOND, ONTARIO_FILE_SMALL_CLAIMS_ONLINE, OREG_258_98_RULES],
  },
  {
    courtPath: "Small Claims Court",
    title: "If a Defence Is Not Filed",
    summary: "Missing the defence deadline has a specific, serious procedural consequence.",
    keyFacts: [
      // "the court" until 2026-09-17. Under r. 11.01 (1) it is the CLERK who
      // notes a defendant in default, on the filing of the two things below --
      // an administrative step, not a judicial one. A user told to "ask the
      // court" is looking for the wrong counter.
      "If no defence is filed in time, the plaintiff may ask the clerk to note the defendant in default.",
      "The plaintiff asks by filing a request to note the defendant in default, which may be made in Form 9B.",
      "The clerk also requires proof that the claim was served within the court's territorial division.",
      "If every defendant was served outside that territorial division, no defendant can be noted in default until an Affidavit for Jurisdiction (Form 11A) is filed with the clerk, or the point is proved before a judge.",
      "A defendant noted in default cannot file a defence or take further steps without the plaintiff's consent or the court's permission.",
      "For a debt or a fixed sum of money, the clerk may sign default judgment (Form 11B).",
      "The plaintiff may be entitled to a judgment without the defendant's participation.",
      "A defendant can bring a motion to set aside a default notation or judgment.",
    ],
    workflowUse: [
      "Use Dashboard to flag cases at risk of default.",
      "Use Legal Strategy to organize the facts and documents a motion to set aside a default would involve (r. 11.06 lists what the court considers); a licensed paralegal or lawyer can assess it.",
    ],
    commonRisks: [
      "Assuming a late defence will still be accepted without consequence.",
      "Asking to note a defendant in default without having filed proof that the claim was served.",
      "Not knowing that a motion is required to reverse a default.",
    ],
    citations: [ONTARIO_COURTS_SMALL_CLAIMS_DEFAULT, OREG_258_98_RULES],
  },
  {
    courtPath: "Small Claims Court",
    title: "Serving Documents",
    summary: "Different documents in a Small Claims case require different service methods and notice periods.",
    keyFacts: [
      "Documents can be served personally, by mail, by courier, or by email where the Rules permit.",
      "A claim must be served within six months of issuance.",
      "Motions require at least 7 days' notice before the hearing.",
      "Examinations require at least 30 days' notice; witness summonses require at least 10 days' notice.",
      "Proof of service is filed using an Affidavit of Service (Form 8A), or a Certificate of Service (Form 8B) for licensees.",
    ],
    workflowUse: [
      "Use Dashboard to track service deadlines for each document type.",
      "Use Evidence to preserve proof of how and when service occurred.",
    ],
    commonRisks: [
      "Using a service method the Rules do not permit for a given document.",
      "Missing the notice period for a motion or examination.",
    ],
    citations: [ONTARIO_GUIDE_SERVING_DOCUMENTS],
  },
  {
    courtPath: "Small Claims Court",
    title: "Evidence and Witnesses for Trial",
    summary: "The court expects specific document deadlines and preparation before a settlement conference or trial.",
    keyFacts: [
      "Types of evidence include oral testimony, documents such as business records and written estimates, expert reports, and photographs that the person who took them can properly identify.",
      "Documents not already attached to the claim or defence must be served and filed at least 14 days before a settlement conference.",
      "A document, written statement or audio or visual record served on all parties who were served with the notice of trial, at least 30 days before the trial date, will be received in evidence unless the trial judge orders otherwise (r. 18.02(1)).",
      "A List of Proposed Witnesses (Form 13A) must be served at least 14 days before the settlement conference.",
      "Service of a summons to witness, and the payment or tender of attendance money, may be proved by an Affidavit of Service (Form 8A) or a lawyer or paralegal's Certificate of Service (Form 8B).",
      "Parties should bring original documents plus at least three copies to trial.",
    ],
    workflowUse: [
      "Use Evidence to label and organize exhibits ahead of these deadlines.",
      "Use Trial Package to prepare document copies and the witness list.",
    ],
    commonRisks: [
      "Serving documents or the witness list too close to the settlement conference or trial.",
      "Bringing only one copy of a document to trial.",
    ],
    citations: [ONTARIO_GUIDE_GETTING_READY, OREG_258_98_RULES],
  },
  {
    courtPath: "Small Claims Court",
    title: "Case Timeline",
    summary: "A Small Claims case moves through a defined sequence of stages, each with its own deadlines.",
    keyFacts: [
      "The stages run: Claim, Default Proceedings (if applicable), Settlement Conference, Motions (if needed), Trial, and Enforcement.",
      // Was "within 30 days after the settlement conference", which no rule
      // says (2026-09-30 audit). r. 16.01(1) sets no window; r. 11.1.01 is the
      // time consequence.
      "After a settlement conference has been held, the clerk fixes a trial date when a party files a Request to Clerk (Form 9B) to fix a date for trial and pays the fee (r. 16.01(1)).",
      "Unless the court orders otherwise, the clerk dismisses an action for delay if, by the second anniversary of its start, it has not been disposed of by order and the plaintiff has neither taken a step under r. 11.03 to obtain judgment nor requested a trial date, subject to the exceptions in r. 11.1.01(2).",
      "A notice of motion and supporting affidavit (Form 15A) must be served at least 7 days before the hearing and filed, with proof of service, at least 3 days before it.",
    ],
    workflowUse: [
      "Use Dashboard to see which stage a case is currently in.",
      "Use Court Package to prepare stage-appropriate materials.",
    ],
    commonRisks: [
      "Skipping the settlement conference step by mistake.",
      "Letting two years pass from the start of the action without requesting a trial date (r. 11.1.01).",
    ],
    citations: [ONTARIO_COURTS_SMALL_CLAIMS_STEPS, OREG_258_98_RULES],
  },
  {
    courtPath: "Small Claims Court",
    title: "Filing Fees",
    summary: "Filing a claim or taking further steps has fixed government fees, which vary by how often a party files.",
    keyFacts: [
      "An infrequent claimant pays $108 to file a claim.",
      "A frequent claimant (one who has already filed 10 or more claims in the same Small Claims Court office in that calendar year) pays $228 to file a claim.",
      "Additional fees apply for judgments, trials, and motions.",
      "If you cannot afford the fees, you can ask the court to waive them. Applying costs nothing, and a fee waiver covers one case.",
      "You may qualify if, for example, your household's main income is Ontario Works, the Ontario Disability Support Program, or Old Age Security with the Guaranteed Income Supplement, or if your household's income and assets are under the limits Ontario sets (the income limit for one person is $33,100 a year before taxes).",
      "If you think you qualify, use the Fee Waiver Request to Registrar, Clerk or Sheriff (form FW-A-3). If you do not, but still cannot afford the fees, use the Fee Waiver Request to Court (form FW-A 4) and a judge will look at your finances.",
      "A fee waiver is not available to someone acting for a business, and it does not cover fees for serving documents, bailiff enforcement fees, or costs a court orders you to pay the other side.",
    ],
    workflowUse: [
      "Use Dashboard to budget for filing and later-stage fees.",
      "Apply for a fee waiver before you file: it does not refund fees already paid.",
    ],
    commonRisks: [
      "Assuming filing is free.",
      "Not budgeting for motion or trial fees later in the case.",
      "Paying fees that could have been waived.",
    ],
    citations: [ONTARIO_SUING_SOMEONE_SMALL_CLAIMS, ONTARIO_FEES_SMALL_CLAIMS, ONTARIO_FEE_WAIVER],
  },

  // ---- Superior Court (Civil) ----
  {
    courtPath: "Superior Court (Civil)",
    title: "Starting a Claim",
    summary: "A civil claim above the Small Claims limit is started in the Superior Court of Justice with its own form, service window, and limitation period.",
    keyFacts: [
      "A claim is started with a Statement of Claim (Form 14A or 14B), or a Notice of Action (Form 14C) for extra time to prepare it.",
      "The claim must generally be served on each defendant within six months of being issued (r. 14.08).",
      "Under the Limitations Act, 2002, a claim generally cannot be started more than two years after the day it was discovered (s. 4).",
      "Service is proved by an Affidavit of Service (Form 16B) or, where a lawyer served the document or caused it to be served, a Lawyer's Certificate of Service (Form 16B.1) (r. 16.09).",
    ],
    workflowUse: [
      "Use Forms to locate the Statement of Claim form.",
      "Use Dashboard to track the limitation period and service deadline.",
    ],
    commonRisks: [
      "Missing the two-year limitation period.",
      "Letting the six-month service window lapse.",
    ],
    citations: [ONTARIO_COURTS_CIVIL_STEPS, ONTARIO_CIVIL_CLAIMS_GUIDE, RCP_RULES, LIMITATIONS_ACT],
  },
  {
    courtPath: "Superior Court (Civil)",
    title: "Defending a Claim",
    summary: "A defendant in a civil claim has a form-specific deadline that can be extended once, briefly.",
    keyFacts: [
      "A Statement of Defence (Form 18A) must be delivered within 20 days after service of the statement of claim if the defendant was served in Ontario, 40 days if served elsewhere in Canada or in the United States, or 60 days if served anywhere else (r. 18.01).",
      "A Notice of Intent to Defend (Form 18B), delivered within the time for the defence, gives an additional 10 days to deliver the Statement of Defence (r. 18.02).",
      "To deliver a document means to serve it and file it with proof of service (r. 1.03). Proof of service is an Affidavit of Service (Form 16B) or a Lawyer's Certificate of Service (Form 16B.1) (r. 16.09).",
    ],
    workflowUse: [
      "Use Forms to complete Form 18A or the Form 18B extension.",
      "Use Dashboard to track the Rule 18 deadline once it is confirmed for the specific case.",
    ],
    commonRisks: [
      "Assuming the deadline is the same as Small Claims Court's 20 days — Rule 18.01 deadlines are 20, 40 or 60 days depending on where the defendant was served.",
      "Not filing a Notice of Intent to Defend when more time is needed.",
    ],
    citations: [ONTARIO_COURTS_CIVIL_STEPS, RCP_RULES],
  },
  {
    courtPath: "Superior Court (Civil)",
    title: "Discovery",
    summary: "After pleadings close, both sides must exchange documents and may examine each other under oath, on a schedule.",
    keyFacts: [
      "Where a party intends to obtain evidence under Rules 30 to 33 or 35, the parties must agree to a discovery plan before the earlier of 60 days after the close of pleadings (or a longer period they agree to) and attempting to obtain that evidence (r. 29.1.03).",
      "Each side exchanges an Affidavit of Documents (Form 30A or 30B).",
      "No party may exceed a total of seven hours of oral examination for discovery, regardless of the number of parties or other persons examined, except with the consent of the parties or leave of the court (r. 31.05.1(1)).",
    ],
    workflowUse: [
      "Use Evidence to prepare the Affidavit of Documents.",
      "Use Evidence to organize the documents and facts that examinations for discovery may cover.",
    ],
    commonRisks: [
      "Missing the 60-day Discovery Plan deadline.",
      "Incomplete document disclosure in the Affidavit of Documents.",
    ],
    citations: [ONTARIO_COURTS_CIVIL_STEPS, RCP_RULES],
  },
  {
    courtPath: "Superior Court (Civil)",
    title: "Mandatory Mediation",
    summary: "In some regions, mediation is a required step before trial, on a fixed timeline.",
    keyFacts: [
      "Mandatory mediation applies to actions started in the City of Toronto, the City of Ottawa or the County of Essex on or after January 1, 2010, and to actions transferred there, with listed exceptions (r. 24.1.04). The court may also exempt an action on a party's motion (r. 24.1.05).",
      "A mediation session must take place within 180 days after the first defence is filed, unless the court orders otherwise (r. 24.1.09(1)).",
    ],
    workflowUse: [
      "Use Settlement Conference preparation tools if the case is in a mandatory mediation region.",
    ],
    commonRisks: [
      "Not scheduling mediation within the 180-day window in a mandatory region.",
    ],
    citations: [ONTARIO_COURTS_CIVIL_STEPS, RCP_RULES],
  },
  {
    courtPath: "Superior Court (Civil)",
    title: "Setting Down for Trial",
    summary: "A civil case must be actively moved toward trial or it can be dismissed for delay.",
    keyFacts: [
      "Unless the court orders otherwise, the parties must schedule a pre-trial conference with the registrar within 180 days after the action is set down for trial; if they do not, the registrar schedules one (r. 50.02).",
      "Unless the court orders otherwise, the registrar dismisses an action for delay if it has not been set down for trial or terminated by any means by the fifth anniversary of its start, subject to the exceptions in the rule (r. 48.14).",
    ],
    workflowUse: [
      "Use Dashboard to track the five-year dismissal risk on older cases.",
      "Use Trial Package once the case is set down for trial.",
    ],
    commonRisks: [
      "Letting a case sit without being set down for trial or settled.",
      "Missing the 180-day pre-trial conference window.",
    ],
    citations: [ONTARIO_COURTS_CIVIL_STEPS, ONTARIO_CIVIL_CLAIMS_GUIDE, RCP_RULES],
  },
  {
    courtPath: "Superior Court (Civil)",
    title: "Forms",
    summary: "Superior Court civil cases use a distinct set of forms from Small Claims Court, organized under the Rules of Civil Procedure.",
    keyFacts: [
      // "Ontario Regulation 194" until 2026-09-17. The regulation is correctly
      // cited R.R.O. 1990, Reg. 194 -- it predates the O. Reg. numbering, and
      // "O. Reg. 194/90" is a common but incorrect form of the same mistake.
      "Forms are catalogued under R.R.O. 1990, Reg. 194 (Rules of Civil Procedure) and include pleadings, motion forms, and enforcement writs.",
      "Documents can be filed in hardcopy at the court counter, and in some cases by mail, email, or through online filing portals.",
    ],
    workflowUse: [
      "Use Forms to locate the correct Rules of Civil Procedure form for each stage.",
    ],
    commonRisks: [
      "Using a Small Claims Court form in a Superior Court civil case, or vice versa.",
    ],
    citations: [ONTARIO_COURT_FORMS_CIVIL, RCP_RULES],
  },
  {
    /*
     * Added 2026-09-17. Small Claims had a "Serving Documents" stage and the
     * other two paths did not, which is why their per-stage omissions had
     * nothing to fall back on: a reader who missed proof of service under
     * "Starting a Claim" had nowhere else to find it.
     *
     * THE CERTIFICATE HERE IS NARROWER THAN SMALL CLAIMS'. r. 16.09 (1.1)
     * allows a LAWYER's certificate only. A paralegal cannot certify service
     * under the Rules of Civil Procedure the way one can under O. Reg. 258/98
     * r. 8.09.1 (3) or the Family Law Rules r. 6 (19) (f). Describing the three
     * paths in the same words would tell a paralegal-represented party their
     * proof of service is valid when it is not.
     */
    courtPath: "Superior Court (Civil)",
    title: "Serving Documents",
    summary: "Superior Court civil documents have their own service methods and their own ways of proving service.",
    keyFacts: [
      "Service of a document may be proved by an affidavit of the person who served it (Form 16B).",
      "A lawyer may instead prove service by a Lawyer's Certificate of Service (Form 16B.1), where the lawyer served the document or caused it to be served and is satisfied service was effected.",
      "This is narrower than Small Claims Court: under the Rules of Civil Procedure a paralegal cannot certify service, and an affidavit of service is used instead.",
      "Where a lawyer admits or accepts service on a party's behalf, that written admission is itself sufficient proof and needs no other proof of service.",
      "Personal service by a sheriff may be proved by a Sheriff's Certificate of Service (Form 16C).",
      "The affidavit or certificate may be printed on the backsheet of the document served, or on a stamp or sticker affixed to it.",
    ],
    workflowUse: [
      "Use Evidence to preserve proof of how and when each document was served.",
      "Use Dashboard to track which documents still need proof of service filed.",
    ],
    commonRisks: [
      "Assuming a paralegal's certificate of service is available in Superior Court as it is in Small Claims Court.",
      "Serving a document and never filing proof that it was served.",
    ],
    citations: [RCP_RULES, ONTARIO_COURTS_CIVIL_STEPS],
  },

  // ---- Family Court ----
  {
    courtPath: "Family Court",
    title: "Starting a Case",
    summary: "Most family law cases begin with a required education session before the case proceeds.",
    keyFacts: [
      "Attendance at a Mandatory Information Program (MIP) is required in most family cases, including claims about parenting, support, property and the matrimonial home, with exceptions such as cases proceeding on consent (r. 8.1(1)-(2)).",
      "Each party must attend within 45 days after the case is started (r. 8.1(4)).",
      "Until a party's certificate of attendance is filed, that party may take no other step, except that a respondent may still serve and file an Answer and a party may make an appointment for a case conference (r. 8.1(7)).",
      "The party starting the case is the applicant; the party who receives it is the respondent.",
    ],
    workflowUse: [
      "Use Dashboard to confirm MIP attendance has been arranged before other steps proceed.",
    ],
    commonRisks: [
      "Taking other steps before the MIP certificate of attendance is filed, apart from the exceptions in r. 8.1(7).",
    ],
    citations: [ONTARIO_COURTS_FAMILY_STEPS, FLR_RULES],
  },
  {
    courtPath: "Family Court",
    title: "Responding to an Application",
    summary: "A respondent has a fixed window to answer, and the applicant then has a further, shorter window to reply.",
    keyFacts: [
      "An Answer (Form 10) must be served and filed within 30 days of being served with the application (60 days if the application is served outside Canada or the United States) (r. 10(1)-(2)).",
      "The Answer can agree or disagree with the applicant's claims, state supporting facts, and make the respondent's own requests for court orders.",
      "A party may serve and file a Reply (Form 10A) within 10 days after being served with an Answer, in response to a claim made in it (r. 10(6)).",
    ],
    workflowUse: [
      "Use Forms to complete Form 10 or Form 10A.",
      "Use Dashboard to track the 30-day or 10-day response window.",
    ],
    commonRisks: [
      "Missing the 30-day deadline to answer.",
      "Missing the 10-day window for a Reply to a claim made in an Answer.",
    ],
    citations: [ONTARIO_COURTS_FAMILY_STEPS, FLR_RULES],
  },
  {
    /*
     * Added 2026-09-17, and the reason is different from the other two paths.
     *
     * THE FAMILY CONTENT WAS NOT WRONG. Family Law Rules r. 2 (1) defines
     * "file" as "to file, WITH PROOF OF SERVICE where service is required", so
     * every existing "serve and file" statement already carries the proof
     * requirement as a matter of law.
     *
     * It is still worth saying. A self-represented parent will not read a
     * definitions rule, and a requirement that reaches the reader only through
     * a defined term has not reached the reader. Being legally complete and
     * being understood are different tests, and this content is written against
     * the second one.
     */
    courtPath: "Family Court",
    title: "Serving Documents",
    summary: "Family documents must be served, and in family court filing a document already means filing proof that it was served.",
    keyFacts: [
      "In the Family Law Rules, to file a document means to file it with proof of service where service is required — so anywhere these steps say \"serve and file\", proof of service is part of filing.",
      "Service may be proved by an affidavit of service (Form 6B).",
      "A lawyer or paralegal may instead prove service by a Lawyer or Paralegal's Certificate of Service (Form 6C), where that licensee served the document or caused it to be served and is satisfied service was effected.",
      "Service may also be proved by the other person's written acceptance of service, by the return postcard for service by mail, by a document exchange date stamp, or by an electronic document exchange's record of service.",
    ],
    workflowUse: [
      "Use Evidence to preserve proof of how and when each document was served.",
      "Use Dashboard to track which documents still need proof of service filed.",
    ],
    commonRisks: [
      "Reading \"serve and file\" as two steps and filing without the proof of service that filing requires.",
      "Assuming the Small Claims Court forms (8A, 8B) apply in a family case.",
    ],
    citations: [FLR_RULES, ONTARIO_COURT_FORMS_FAMILY],
  },
  {
    courtPath: "Family Court",
    title: "Conferences",
    summary: "A family case moves through a sequence of court conferences before any trial.",
    keyFacts: [
      // Was a sequence naming a "Trial Scheduling and Management Conference",
      // from a guide page with no saved copy. Restated to the rules' own terms
      // (2026-09-30 audit).
      "In each case where an Answer is filed, a judge conducts at least one conference, subject to exceptions (r. 17(1)). The Family Law Rules name three kinds: the case conference, the settlement conference and the trial management conference (r. 17).",
      "On or before the first court date, the clerk confirms that all necessary documents have been served and filed (r. 39(5) for fast-track cases in the Family Court of the Superior Court of Justice; r. 40(4) in the Ontario Court of Justice).",
      "The Case Conference and Settlement Conference are opportunities to narrow or resolve disputed issues before trial.",
    ],
    workflowUse: [
      "Use Settlement Conference preparation tools ahead of each conference stage.",
      "Use Dashboard to see which conference stage the case has reached.",
    ],
    commonRisks: [
      "Arriving at a conference without documents properly served or filed.",
      "Treating a Case Conference as optional.",
    ],
    citations: [ONTARIO_COURTS_FAMILY_STEPS, FLR_RULES],
  },
  {
    courtPath: "Family Court",
    title: "Motions",
    summary: "Bringing a family court motion has its own notice rules, including an emergency exception.",
    keyFacts: [
      // Was "at least 1 day's notice", which no rule says (2026-09-30 audit).
      "Generally, no motion may be served or heard before a conference dealing with the substantive issues has been completed, unless the court finds urgency, hardship or another reason in the interest of justice, and some motions are excepted (r. 14(4), (4.2), (6)).",
      "A party making a motion with notice must serve the documents on all other parties at least six days before the motion date, file them at least four days before it, confer or try to confer with the other parties, and give the clerk a confirmation of motion (Form 14C) by 2 p.m. three days before (r. 14(11)).",
      "A motion may be made without notice only in the situations listed in r. 14(12), such as an immediate danger to the health or safety of a child or of the party making the motion where the delay of serving notice would probably have serious consequences.",
      "An order made on a motion without notice must require the matter to come back to court within 14 days or on a date chosen by the court (r. 14(14)).",
    ],
    workflowUse: [
      "Use Legal Strategy to organize the facts and documents for a motion; whether a motion fits a situation is a question for a licensed paralegal or lawyer.",
    ],
    commonRisks: [
      "Bringing a motion without notice when none of the situations in r. 14(12) applies.",
      "Missing the return date set in an order made without notice.",
      "Not giving the clerk the confirmation of motion (Form 14C) on time: unless the court orders otherwise, the motion will not be heard (r. 14(11.1)).",
    ],
    citations: [ONTARIO_COURTS_FAMILY_STEPS, FLR_RULES],
  },
  {
    courtPath: "Family Court",
    title: "Forms",
    summary: "Family Court uses its own set of forms under the Family Law Rules, distinct from civil or Small Claims forms.",
    keyFacts: [
      "Forms are catalogued under the Family Law Rules, O. Reg. 114/99, including Application (Form 8), Answer (Form 10), and Financial Statement (Form 13 or 13.1).",
      "Since October 14, 2025, family court documents are filed online through the Ontario Courts Public Portal for Toronto-region matters, and through Justice Services Online for matters outside Toronto.",
    ],
    workflowUse: [
      "Use Forms to locate the correct Family Law Rules form for each stage.",
    ],
    commonRisks: [
      "Using a civil or Small Claims form instead of the matching Family Law Rules form.",
    ],
    citations: [ONTARIO_COURT_FORMS_FAMILY, ONTARIO_FEES_FAMILY],
  },
];

/**
 * The array under the name the content library uses.
 *
 * `PRINCIPLES` is kept as the export the page has always imported, so the page
 * diff is an import line and nothing else.
 */
export const PROCEDURAL_STAGES = PRINCIPLES;
