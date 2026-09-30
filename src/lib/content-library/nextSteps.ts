/**
 * Next-step content blocks, keyed by pathway and stage.
 *
 * *** WHY THIS FILE EXISTS ***
 *
 * `analysis.nextBestActions` was model output. It flowed through
 * `buildSummary()` into `context.summary` and from there into
 * `documentGenerationEngine.ts`, which pushed it into a document the user
 * downloads. That is AI-written procedural content delivered to a user without
 * human review — the clearest breach of the LSO A2I policy in the codebase
 * (docs/lso-ai-audit.md, finding B-4).
 *
 * The model now returns only a STAGE CODE from a fixed enum. This catalogue
 * supplies the words. Nothing the model writes reaches a user.
 *
 * *** WHERE THE TEXT CAME FROM ***
 *
 * Small Claims blocks restate requirements already sourced in this codebase,
 * each citing the rule in O. Reg. 258/98 vendored verbatim under
 * docs/sources/oreg-258-98-cited-rules.txt. They are assembled from existing
 * building blocks, not newly authored.
 *
 * Until 2026-09-30 every other pathway and stage carried an explicit
 * `[NEEDS LICENSEE REVIEW: ...]` placeholder, because there was no sourced
 * wording to give. On that date the Family Law Rules and the Rules of Civil
 * Procedure were vendored whole, and every Family and Civil block was written
 * from them, quoted in docs/sources/catalogue-verification.json, and re-read
 * by an independent reviewer.
 *
 * *** NOTHING HERE IS LICENSEE-APPROVED YET ***
 *
 * Every block starts unapproved. `licenseeReview.ts` tracks sign-off
 * separately, and `REQUIRE_APPROVED_CONTENT` will gate serving when it is
 * turned on before launch.
 */

export type NextStepBlock = {
  /** Stable id. Also the id the review packet and approvals use. */
  id: string;
  pathway: "small-claims" | "family" | "civil";
  /** Matches UniversalStage in app/builder/_components/builderTypes.ts. */
  stage: string;
  /** The heading shown above the steps. */
  title: string;
  /** The text a user reads. Rendered verbatim; never model-generated. */
  text: string;
  sourceUrl: string;
};

/*
 * Every block is now authored (2026-09-30). A new block that is not ready is
 * written as `[NEEDS LICENSEE REVIEW: <what is missing>]` -- isPlaceholder()
 * and outputGuard stop it reaching a user.
 */

export const NEXT_STEP_BLOCKS: NextStepBlock[] = [
  // ---------------------------------------------------------- Small Claims
  {
    id: "next:small-claims:starting-case",
    pathway: "small-claims",
    stage: "starting-case",
    title: "Starting your claim",
    text:
      "An action is started by filing a Plaintiff's Claim (Form 7A) with the clerk, together with a copy for each defendant. A copy for each defendant is not required if the claim is filed electronically (r. 7.01 (1), (1.1)).\n\n" +
      "The claim must be served on the defendant within six months after the date it is issued. The court may extend that time, before or after the six months has passed (r. 8.01 (2)).\n\n" +
      "Service is proved by an Affidavit of Service (Form 8A), or by a lawyer or paralegal's Certificate of Service (Form 8B) where that licensee served it, or caused it to be served, and is satisfied service was effected (r. 8.09.1).",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
  },
  {
    id: "next:small-claims:responding",
    pathway: "small-claims",
    stage: "responding",
    title: "Responding to a claim",
    text:
      "A defendant who wishes to dispute a claim must, within 20 days of being served, serve a Defence (Form 9A) on every other party and file it with the clerk, with proof of service (r. 9.01).\n\n" +
      "Proof of service is an Affidavit of Service (Form 8A) or a lawyer or paralegal's Certificate of Service (Form 8B) (r. 8.09.1).",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
  },
  {
    id: "next:small-claims:already-started",
    pathway: "small-claims",
    stage: "already-started",
    title: "Where the case stands",
    text:
      "If no defence has been filed in time, the plaintiff may ask the clerk to note the defendant in default. The clerk requires a request to note in default (which may be made in Form 9B) and proof that the claim was served within the court's territorial division (r. 11.01 (1)).\n\n" +
      "If every defendant was served outside that territorial division, no defendant can be noted in default until an Affidavit for Jurisdiction (Form 11A) is filed with the clerk, or the point is proved before a judge (r. 11.01 (3)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
  },
  {
    id: "next:small-claims:conference",
    pathway: "small-claims",
    stage: "conference",
    title: "Before the settlement conference",
    text:
      "Documents not already attached to the claim or defence must be served and filed at least 14 days before a settlement conference.\n\n" +
      "A List of Proposed Witnesses (Form 13A) must also be served on every other party and filed with the court at least 14 days before the settlement conference (r. 13.03 (2)).",
    sourceUrl:
      "https://www.ontario.ca/document/guide-procedures-small-claims-court/getting-ready-court",
  },
  {
    id: "next:small-claims:motion",
    pathway: "small-claims",
    stage: "motion",
    title: "Bringing a motion",
    text:
      "A motion is made by a notice of motion and supporting affidavit (Form 15A).\n\n" +
      "It must be served on every party who has filed a claim, and any defendant not noted in default, at least seven days before the hearing date, and filed with proof of service at least three days before the hearing date (r. 15.01 (1), (3)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
  },
  {
    id: "next:small-claims:trial",
    pathway: "small-claims",
    stage: "trial",
    title: "Preparing for trial",
    text:
      "A document, written statement or audio or visual record served on all parties who were served with the notice of trial, at least 30 days before the trial date, will be received in evidence unless the trial judge orders otherwise (r. 18.02 (1)).\n\n" +
      "Service of a summons to witness, and the payment or tender of attendance money, may be proved by an Affidavit of Service (Form 8A) or a lawyer or paralegal's Certificate of Service (Form 8B) (r. 18.03 (4)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
  },
  {
    id: "next:small-claims:enforcement",
    pathway: "small-claims",
    stage: "enforcement",
    title: "Enforcing an order",
    text:
      "An order for the payment or recovery of money may be enforced by a writ of seizure and sale of personal property (Form 20C) under rule 20.06, a writ of seizure and sale of land (Form 20D) under rule 20.07, and garnishment under rule 20.08, and a further order as to payment may be made after an examination (r. 20.03).\n\n" +
      "If there is default under the order, the clerk of a court in the territorial division where the debtor lives or carries on business will, at the creditor's request, issue a notice of examination (Form 20H), supported by an affidavit for enforcement request (Form 20P) (r. 20.10 (1), (2)).\n\n" +
      "To enforce at another court location, the clerk will, at the creditor's request supported by Form 20P stating the amount still owing, issue a certificate of judgment (Form 20A) to the clerk at that location (r. 20.04 (1)).\n\n" +
      "The court may stay enforcement, and may vary the times and proportions in which money is to be paid if it is satisfied that the debtor's circumstances have changed (r. 20.02 (1)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
  },
  {
    id: "next:small-claims:urgent",
    pathway: "small-claims",
    stage: "urgent",
    title: "When time is short",
    text:
      "The court may lengthen or shorten any time set by the rules or by an order, on such terms as are just (r. 3.02 (1)). A time for serving or filing a document can also be lengthened or shortened by filing the consent of the parties (r. 3.02 (2)).\n\n" +
      "A party who has been noted in default, or has a default judgment against them, can make a motion to set it aside. Under rule 11.06, the court may do so if it is satisfied of two things: that the party has a defence on the merits and a reasonable explanation for the default, and that the motion is made as soon as is reasonably possible.\n\n" +
      "A motion is made by a notice of motion and supporting affidavit (Form 15A), with a hearing date obtained from the clerk before it is served (r. 15.01 (1), (2)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
  },
  {
    id: "next:small-claims:not-sure",
    pathway: "small-claims",
    stage: "not-sure",
    title: "Not sure where you are",
    text:
      "If you are not sure what stage your case is at, that is a question a lawyer or paralegal can help with. Ontario's Small Claims Court guide says that if you wish to consult an Ontario lawyer or paralegal, you may contact the Law Society Referral Service, operated by the Law Society of Ontario. It can give you the name of a lawyer or paralegal in your area, who will provide a free initial consultation of up to 30 minutes to help determine your rights and options.\n\n" +
      "You can ask for a referral by completing the online request form at www.lawsocietyreferralservice.ca.",
    sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/after-judgment",
  },

  // ---------------------------------------------------------------- Family
  // Written 2026-09-30 from the Family Law Rules (O. Reg. 114/99) and the
  // FRSAEA, vendored whole; each block's passages are recorded in
  // docs/sources/catalogue-verification.json ("nextSteps") and it was re-read
  // by an independent reviewer. The Family pathway is still gated
  // (phaseScope.ts); these are ready for when it opens.
  {
    id: "next:family:starting-case",
    pathway: "family",
    stage: "starting-case",
    title: "Starting a family case",
    text:
      "A case is started by filing an application (Form 8, 8A, 8B, 8B.1, 8B.2, 8C, 8D, 8D.1, 33D.1, 34L or 34N) (r. 8 (1)). When an application is filed, the clerk sets a court date, except in the case-management situations the rule refers to, and seals the application (r. 8 (4)). An application with a claim about decision-making responsibility, parenting time or contact with respect to a child must be accompanied by the applicable documents referred to in rule 35.1 (r. 8 (3.1)).\n\n" +
      "The application must be served immediately on every other party, and special service must be used unless the party is one of the officials or agencies listed in subrule 8 (6) (r. 8 (5)). Special service includes leaving a copy with the person to be served (r. 6 (3)). No person may serve a document under the rules unless they are at least 18 years of age (r. 6 (1.1)).\n\n" +
      "In cases that deal with a claim listed in r. 8.1 (1), such as decision-making responsibility, parenting time or contact, net family property, the matrimonial home, support, or a restraining order, each party must attend the mandatory information program no later than 45 days after the case is started (r. 8.1 (1), (4)). The applicant arranges their own appointment, obtains an appointment for the respondent, and serves notice of the respondent's appointment with the application (r. 8.1 (5)). Some parties are excepted, including parties in cases proceeding on consent (r. 8.1 (2)).\n\n" +
      "If an application contains a claim for support, a property claim, or a claim for exclusive possession of the matrimonial home and its contents, the party making the claim must serve and file a financial statement (Form 13 or 13.1) with the document that contains the claim (r. 13 (1) (a)). If the only support claim is for child support in the amount specified in the table of the applicable child support guidelines, the party making the claim is not required to file a financial statement, unless the application also contains a property claim or a claim for exclusive possession of the matrimonial home and its contents (r. 13 (1.3)). Form 13 is used for a support claim without a property claim; Form 13.1 is used where there is a property claim or a claim for exclusive possession of the matrimonial home (r. 13 (1.1), (1.2)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
  },
  {
    id: "next:family:responding",
    pathway: "family",
    stage: "responding",
    title: "Responding to a family case",
    text:
      "A person against whom an application is made must serve an answer (Form 10, 33B, 33B.1, 33B.2 or 33D.3) on every other party and file it within 30 days after being served with the application (r. 10 (1)). In an application to dispense with a parent's consent before adoption placement (Form 8D.1), the time for serving the answer is 20 days if the application is served in Canada or the United States of America, and 40 days if served outside Canada or the United States of America (r. 10 (2.1)). If the application is served outside Canada or the United States of America, the time for serving and filing an answer is 60 days (r. 10 (2)).\n\n" +
      "If the application contains a claim for support, a property claim, or a claim for exclusive possession of the matrimonial home and its contents, the party against whom the claim is made must serve and file a financial statement within the time for serving and filing an answer, whether or not that party is serving an answer (r. 13 (1) (b)).\n\n" +
      "If a respondent does not serve and file an answer, the consequences in paragraphs 1 to 4 of r. 1 (8.4) apply, with necessary changes (r. 10 (5)). Those are: the party is not entitled to any further notice of steps in the case (except service of an order), is not entitled to participate in the case in any way, the case may be dealt with in the party's absence, and a date may be set for an uncontested trial (r. 1 (8.4)).\n\n" +
      "In a case the mandatory information program applies to, a party may not take any step before their certificate of attendance is filed, except that a respondent may serve and file an answer and a party may make an appointment for a case conference (r. 8.1 (7)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
  },
  {
    id: "next:family:already-started",
    pathway: "family",
    stage: "already-started",
    title: "Financial disclosure as the case goes on",
    text:
      "A party who must serve and file a financial statement in relation to a claim for support must also serve the information the rule lists, unless the court orders otherwise. This includes the income and financial information referred to in subsection 21 (1) of the child support guidelines and, for a claim for the support of a child, proof of the amount of any special or extraordinary expenses (r. 13 (3.1)). Where there is no property claim, this is served with the financial statement (r. 13 (3.2) (a)).\n\n" +
      "A party who must serve and file a financial statement in relation to a claim under Part I of the Family Law Act must, no later than 30 days after the day the financial statement is required to be served, serve on the other party the documents listed in the rule, unless the court orders otherwise. The list includes the statement issued closest to the valuation date for each bank or other account, pension, and savings or investment the party had an interest in on that date (r. 13 (3.3)).\n\n" +
      "Service of these documents is confirmed by serving a certificate of financial disclosure (Form 13A) with them, and filing it no later than six days before a case conference for the applicant or party making the motion, and four days before for the other party (r. 13 (5.0.2)). If a party believes the disclosure they received is not enough for a full understanding of the other party's financial circumstances, they must first make a written request for the necessary additional information; if it is not given within seven days, the court may, on motion or at a case conference or settlement conference, order it given (r. 13 (11)).\n\n" +
      "Before a case conference, settlement conference, motion or trial, a party must update their financial information if the last financial statement would be more than 60 days old at a conference, more than 30 days old when a motion is heard, or more than 40 days old at trial (r. 13 (12)). Before a settlement conference or trial, each party to a property claim under Part I of the Family Law Act must serve and file a net family property statement (Form 13B), or an affidavit that an earlier statement has not changed and is still true (r. 13 (14)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
  },
  {
    id: "next:family:conference",
    pathway: "family",
    stage: "conference",
    title: "Before a case conference",
    text:
      "Subject to exceptions, in each case in which an answer is filed, at least one conference is conducted by a judge (r. 17 (1)). The purposes of a case conference include identifying the issues that are in dispute and those that are not, exploring ways to resolve the issues in dispute, ensuring disclosure of the relevant evidence, and setting the date for the next step in the case (r. 17 (4)). A party who asks for a case conference must serve and file a case conference notice (Form 17) (r. 17 (4.1)).\n\n" +
      "Before a conference, each party must confer, or make best efforts to confer, orally or in writing with every other party about requests for financial disclosure and a temporary resolution of the issues in dispute (r. 17 (3.1)). This does not apply to a party who is prohibited from such communication by court order, or where there is a risk of domestic violence by a party who is not represented by a licensed representative (r. 17 (3.2)).\n\n" +
      "For a case conference, each party serves and files a case conference brief (Form 17A or 17B) (r. 17 (13)). The party requesting the conference (or, if no party requested it, the applicant or party making the motion) must do so not later than six days before the conference, and the other party not later than four days before (r. 17 (13.1)).\n\n" +
      "Each party must give a copy of the confirmation of conference (Form 17F) to every other party, and give it to the clerk not later than 2 p.m. three days before the conference date (r. 17 (14)). Unless the court orders otherwise, a conference is not held if confirmation is not given to the clerk (r. 17 (14.1)). Where the mandatory information program applies, the certificate of attendance must be filed no later than 2 p.m. on the second day before the case conference (r. 8.1 (6)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
  },
  {
    id: "next:family:motion",
    pathway: "family",
    stage: "motion",
    title: "Bringing a motion",
    text:
      "A motion may be made for a temporary order for a claim made in an application, for directions on how to carry on the case, or for a change in a temporary order (r. 14 (1)). A motion requires a notice of motion (Form 14) and an affidavit (Form 14A) (r. 14 (9)). A motion limited to procedural, uncomplicated or unopposed matters may use a motion form (Form 14B) instead (r. 14 (10)).\n\n" +
      "No notice of motion or supporting evidence may be served, and no motion heard, before a conference dealing with the substantive issues in the case has been completed (r. 14 (4)). The rule lists motions this does not apply to, including motions made without notice, on consent, unopposed or limited to procedural, uncomplicated or unopposed matters, and motions in a child protection case (r. 14 (6)). It also does not apply if the court is of the opinion that there is a situation of urgency or hardship or that a case conference is not required for some other reason in the interest of justice (r. 14 (4.2)).\n\n" +
      "A party making a motion with notice must serve the documents on all other parties not later than six days before the motion date, file them not later than four days before the motion date, confer or make best efforts to confer with every other party about the issues in dispute in the motion (unless prohibited by court order or there is a risk of domestic violence by a party who is not represented by a licensed representative), and give the clerk the confirmation of motion (Form 14C) not later than 2 p.m. three days before the motion date (r. 14 (11) (a), (b), (c), (e)). Unless the court orders otherwise, a motion is not heard if confirmation is not given to the clerk (r. 14 (11.1)).\n\n" +
      "A response to a motion made by notice of motion (Form 14) must be served and filed not later than four days before the motion date (r. 14 (11.3)). A response to a motion made by motion form (Form 14B) must be served and filed not later than seven days after the motion form is served (r. 14 (11.4)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
  },
  {
    id: "next:family:trial",
    pathway: "family",
    stage: "trial",
    title: "Preparing for trial",
    text:
      "A case is not scheduled for trial unless a settlement conference has been conducted or a judge has ordered that the case be scheduled for trial (r. 17 (10)). In the Superior Court of Justice or the Family Court of the Superior Court of Justice, unless the court orders otherwise in advance, a case is also not scheduled for trial until the trial scheduling endorsement form has been completed by the parties and endorsed by the court (r. 17 (11)). This does not apply to a child protection case or a case to be scheduled for an uncontested trial, among others, unless an order requires the form (r. 17 (11.2)).\n\n" +
      "The purposes of a trial management conference include arranging to receive evidence by a written report, an agreed statement of facts, an affidavit or another method, if appropriate; deciding how the trial will proceed; ensuring that the parties know what witnesses will testify and what other evidence will be presented; estimating the time needed for trial; and setting the trial date, if not already done (r. 17 (6)). For a trial management conference in the Ontario Court of Justice, each party serves and files a trial management conference brief (Form 17E); in the Superior Court of Justice or its Family Court, the documents include the endorsed trial scheduling endorsement form, an offer to settle all outstanding claims, and an outline of the party's opening statement, except that a trial management conference brief (Form 17E) is used in a case to which subrule 17 (11) does not apply (r. 17 (13) paras. 3-5).\n\n" +
      "At least 20 days before the earlier of the start of the trial and of the trial sitting, the applicant must serve and file a trial record containing a table of contents and the listed documents, including the application, answer and reply, any agreed statement of facts, and any temporary order relating to a matter still in dispute (r. 23 (1)). Not later than seven days before the start of the trial, a respondent may serve, file and add to the trial record any listed document not already in it (r. 23 (2)).\n\n" +
      "A party who wants a witness to give evidence in court must serve a summons to witness (Form 23) by special service in accordance with subrule 6 (4), together with the witness fee (r. 23 (3)). It must be served at least seven days before the person is required to be present in court (r. 23 (3.2)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
  },
  {
    id: "next:family:enforcement",
    pathway: "family",
    stage: "enforcement",
    title: "Enforcing a family order",
    text:
      "An order that has not been obeyed may, in addition to any other method of enforcement provided by law, be enforced as the rules provide (r. 26 (2)). A payment order may be enforced by a request for a financial statement, a request for disclosure from an income source, a financial examination, seizure and sale, garnishment, a default hearing if the order is a support order, the appointment of a receiver, and registration under section 42 of the Family Responsibility and Support Arrears Enforcement Act, 1996 (r. 26 (3)).\n\n" +
      "An order other than a payment order may be enforced by a writ of temporary seizure of property, a contempt order, and the appointment of a receiver (r. 26 (4)). A statement of money owed is in Form 26, with a copy of the order that is in default attached (r. 26 (5)).\n\n" +
      "Under the Family Responsibility and Support Arrears Enforcement Act, 1996, it is the duty of the Director of the Family Responsibility Office to enforce support orders where the support order and the related support deduction order, if any, are filed in the Director's office, and to pay the amounts collected to the person to whom they are owed (s. 5 (1)). The clerk or registrar of the court that makes a support order files it with the Director's office promptly after it is signed (s. 12 (1)).\n\n" +
      "If the Director enforces an order under that Act, anything in the rules relating to enforcement by the person in whose favour the order was made applies to the Director (r. 26 (10)). A recipient who files a support order in the Director's office must, on the Director's request, assign to the Director any enforcement the recipient has started (r. 26 (12)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
  },
  {
    id: "next:family:urgent",
    pathway: "family",
    stage: "urgent",
    title: "When a matter is urgent",
    text:
      "The rule that no motion may be served or heard before a conference dealing with the substantive issues has been completed does not apply if the court is of the opinion that there is a situation of urgency or hardship, or that a case conference is not required for some other reason in the interest of justice (r. 14 (4), (4.2)).\n\n" +
      "A motion may be made without notice if the nature or circumstances of the motion make notice unnecessary or not reasonably possible; if there is an immediate danger of a child's removal from Ontario, or an immediate danger to the health or safety of a child or of the party making the motion, and the delay involved in serving a notice of motion would probably have serious consequences; or if service of a notice of motion would probably have serious consequences (r. 14 (12)). The documents for a motion without notice are filed on or before the motion date, unless the court orders otherwise (r. 14 (13)).\n\n" +
      "An order made on a motion without notice (Form 14D) must require the matter to come back to the court, and if possible to the same judge, within 14 days or on a date chosen by the court (r. 14 (14)). It must be served immediately on all parties affected, together with all documents used on the motion, unless the court orders otherwise (r. 14 (15)).\n\n" +
      "The court may, on motion, order that the mandatory information program's attendance requirements do not apply to a party because of urgency or hardship or for some other reason in the interest of justice (r. 8.1 (8)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
  },
  {
    id: "next:family:not-sure",
    pathway: "family",
    stage: "not-sure",
    title: "Not sure where you are",
    text:
      "Ontario's Small Claims Court guide says that a lawyer or paralegal is in the best position to advise you about your legal rights and responsibilities, and that if you wish to consult an Ontario lawyer or paralegal, you may contact the Law Society Referral Service, operated by the Law Society of Ontario. It can give you the name of a lawyer or paralegal in your area, who will provide a free initial consultation of up to 30 minutes to help determine your rights and options.\n\n" +
      "You can ask for a referral by completing the online request form at www.lawsocietyreferralservice.ca.",
    sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/after-judgment",
  },

  // ----------------------------------------------------------------- Civil
  // Written 2026-09-30 from the Rules of Civil Procedure (Reg. 194) and the
  // Courts of Justice Act, vendored whole; recorded and re-read the same way.
  {
    id: "next:civil:starting-case",
    pathway: "civil",
    stage: "starting-case",
    title: "Starting an action",
    text:
      "An action is usually started with a statement of claim (Form 14A for most actions). Where there is not enough time to prepare a statement of claim, an action may be started by issuing a notice of action (Form 14C) that contains a short statement of the nature of the claim (r. 14.03 (1), (2)).\n\n" +
      "Where a notice of action is used, the plaintiff must file a statement of claim (Form 14D) within thirty days after the notice of action is issued (r. 14.03 (3)). Where an action is started by a statement of claim, the statement of claim must be served within six months after it is issued; where it is started by a notice of action, the notice of action and the statement of claim must be served together within six months after the notice of action is issued (r. 14.08 (1), (2)). An originating process must be served personally as provided in rule 16.02, or by an alternative to personal service as provided in rule 16.03 (r. 16.01 (1)).\n\n" +
      "The simplified procedure in Rule 76 must be used where the plaintiff's claim is exclusively for money, real property or personal property, and the total of the money claimed and the fair market value of any real or personal property is $200,000 or less exclusive of interest and costs (r. 14.03.1; r. 76.02 (1)). Rule 76 does not apply to some actions, including class proceedings, actions under the Construction Act (except trust claims), and actions in which a jury notice is delivered in accordance with subrule 76.02.1 (2) (r. 76.01 (1)).\n\n" +
      "Under the Courts of Justice Act, an action that is within the Small Claims Court's jurisdiction cannot be started in the Superior Court of Justice except with leave of the Superior Court of Justice as provided in the rules of court (Courts of Justice Act, s. 23 (1.1)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
  },
  {
    id: "next:civil:responding",
    pathway: "civil",
    stage: "responding",
    title: "Responding to a statement of claim",
    text:
      "A statement of defence (Form 18A) must be delivered within 20 days after service of the statement of claim where the defendant is served in Ontario, within 40 days where the defendant is served elsewhere in Canada or in the United States of America, and within 60 days where the defendant is served anywhere else (r. 18.01).\n\n" +
      "A defendant who intends to defend may deliver a notice of intent to defend (Form 18B) within the time for delivering a statement of defence (r. 18.02 (1)). A defendant who does so is entitled to ten days, in addition to the time in rule 18.01, to deliver a statement of defence (r. 18.02 (2)).\n\n" +
      "A defendant may deliver a statement of defence at any time before being noted in default (r. 19.01 (5)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
  },
  {
    id: "next:civil:already-started",
    pathway: "civil",
    stage: "already-started",
    title: "Where the action stands",
    text:
      "Where a defendant does not deliver a statement of defence within the time allowed, the plaintiff may, on filing proof of service of the statement of claim, require the registrar to note the defendant in default (r. 19.01 (1)).\n\n" +
      "Once a defendant has been noted in default, the plaintiff may require the registrar to sign judgment for certain kinds of claims, including a debt or liquidated demand in money (Form 19A) (r. 19.04 (1)). For any other claim, the plaintiff may move before a judge for judgment on the statement of claim, and a claim for unliquidated damages must be supported by evidence given by affidavit (r. 19.05 (1), (2)).\n\n" +
      "Where a party intends to obtain evidence through discovery of documents or examination for discovery, the parties must agree to a written discovery plan, before the earlier of 60 days after the close of pleadings (or a longer period the parties agree to) and attempting to obtain the evidence (r. 29.1.03 (1), (2), (3)).\n\n" +
      "Each party must serve on every other party an affidavit of documents (Form 30A or 30B) disclosing all documents relevant to any matter in issue that are or have been in the party's possession, control or power (r. 30.03 (1)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
  },
  {
    id: "next:civil:conference",
    pathway: "civil",
    stage: "conference",
    title: "Mediation and the pre-trial conference",
    text:
      "Mandatory mediation under Rule 24.1 applies to actions that include those started on or after January 1, 2010 in the City of Ottawa, the City of Toronto or the County of Essex, subject to listed exceptions such as mortgage actions (r. 24.1.04 (1), (2)). For an action started in one of those places, a mediation session must take place within 180 days after the first defence has been filed, unless the court orders otherwise (r. 24.1.09 (1)). For an action transferred to one of those places on or after January 1, 2014, the 180-day rule does not apply and the court may set the date by which mediation must take place (r. 24.1.04 (1) para. 3; r. 24.1.09 (2.1)). The court may, on a party's motion, exempt an action from the Rule (r. 24.1.05).\n\n" +
      "Unless the court orders otherwise, within 180 days after an action is set down for trial, the parties must schedule with the registrar a pre-trial conference before a judge or associate judge (r. 50.02 (1)). If the parties do not, the registrar schedules one and gives the parties notice (r. 50.02 (2)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
  },
  {
    id: "next:civil:motion",
    pathway: "civil",
    stage: "motion",
    title: "Bringing a motion",
    text:
      "A motion is made by a notice of motion (Form 37A), unless the nature of the motion or the circumstances make one unnecessary (r. 37.01). The notice must state the precise relief sought, the grounds to be argued, and the documentary evidence to be used at the hearing (r. 37.06).\n\n" +
      "The notice of motion must be served on any party or other person who will be affected by the order sought, at least seven days before the date the motion is to be heard, and filed with proof of service at least seven days before the hearing date in the court office where the motion is to be heard (r. 37.07 (1), (6); r. 37.08 (1)).\n\n" +
      "A plaintiff may, after the defendant has delivered a statement of defence or served a notice of motion, move for summary judgment on all or part of the claim, and a defendant may do so after delivering a statement of defence (r. 20.01 (1), (3)). The rule says the court shall grant summary judgment if it is satisfied that there is no genuine issue requiring a trial with respect to a claim or defence, or if the parties agree and the court is satisfied that it is appropriate (r. 20.04 (2)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
  },
  {
    id: "next:civil:trial",
    pathway: "civil",
    stage: "trial",
    title: "Setting down for trial",
    text:
      "Where an action is defended, a party who wishes to set it down for trial does so by serving a trial record prepared in accordance with rule 48.03 on every party, and then filing it with proof of service (r. 48.02 (1)).\n\n" +
      "The trial record contains, in order, a table of contents, a copy of any jury notice, a copy of the pleadings, any demand or order for particulars and the particulars delivered, any notice of amounts and particulars of special damages, any order respecting the trial, and a certificate (r. 48.03 (1)).\n\n" +
      "Rule 49.10 sets out costs consequences for an offer to settle made at least seven days before the hearing begins, that is not withdrawn and does not expire before then, and is not accepted. Where the offer was the plaintiff's and the plaintiff obtains a judgment as favourable as or more favourable than its terms, the plaintiff is entitled to partial indemnity costs to the date the offer was served and substantial indemnity costs from that date. Where the offer was the defendant's and the plaintiff obtains a judgment as favourable as or less favourable than its terms, the plaintiff is entitled to partial indemnity costs to the date the offer was served and the defendant is entitled to partial indemnity costs from that date. Both apply unless the court orders otherwise (r. 49.10 (1), (2)).\n\n" +
      "The party claiming the benefit of either subrule has the burden of proving how the judgment compares with the offer (r. 49.10 (3)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
  },
  {
    id: "next:civil:enforcement",
    pathway: "civil",
    stage: "enforcement",
    title: "Enforcing an order",
    text:
      "Where an order may be enforced by a writ of seizure and sale, the creditor is entitled to one or more writs of seizure and sale (Form 60A) on filing a requisition with the registrar where the proceeding was started. The requisition sets out the date and amount of any payment received since the order was made, the amount owing and the rate of postjudgment interest, and is filed with a copy of the order as entered and any other evidence necessary to establish the amount awarded and the creditor's entitlement (r. 60.07 (1)). If six years or more have passed since the date of the order, or if its enforcement is subject to a condition, a writ of seizure and sale is not issued unless leave of the court is first obtained (r. 60.07 (2)).\n\n" +
      "A creditor under an order for the payment or recovery of money may enforce it by garnishment of debts payable to the debtor by other persons (r. 60.08 (1)). If six years or more have passed since the date of the order, or if its enforcement is subject to a condition, a notice of garnishment is not issued unless leave of the court is first obtained (r. 60.08 (2)).\n\n" +
      "A creditor may examine the debtor about matters including the reason for nonpayment, the debtor's income and property, and the debtor's means to satisfy the order (r. 60.18 (2)). Only one such examination may be held in a twelve month period in respect of a debtor in the same proceeding, unless the court orders otherwise (r. 60.18 (4)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
  },
  {
    id: "next:civil:urgent",
    pathway: "civil",
    stage: "urgent",
    title: "When time is short",
    text:
      "The court may by order extend or abridge any time prescribed by the rules or an order, on such terms as are just (r. 3.02 (1)). An order extending or abridging a time that relates to an appeal to an appellate court may be made only by a judge of the appellate court (r. 3.02 (3)). A motion for an order extending time may be made before or after the time has expired (r. 3.02 (2)). A time prescribed by the rules for serving, filing or delivering a document may also be extended or abridged by filing a consent (r. 3.02 (4)).\n\n" +
      "A default judgment signed by the registrar, or granted on motion under rule 19.04, may be set aside or varied by the court on such terms as are just (r. 19.08 (1)). On setting aside a judgment, the noting of default may also be set aside (r. 19.08 (3)).\n\n" +
      "An interlocutory injunction or mandatory order under section 101 or 102 of the Courts of Justice Act may be obtained on motion to a judge by a party to a pending or intended proceeding (r. 40.01).",
    sourceUrl: "https://www.ontario.ca/laws/docs/900194_e.doc",
  },
  {
    id: "next:civil:not-sure",
    pathway: "civil",
    stage: "not-sure",
    title: "Not sure where you are",
    text:
      "Ontario's Small Claims Court guide says that a lawyer or paralegal is in the best position to advise you about your legal rights and responsibilities, and that if you wish to consult an Ontario lawyer or paralegal, you may contact the Law Society Referral Service, operated by the Law Society of Ontario. It can give you the name of a lawyer or paralegal in your area, who will provide a free initial consultation of up to 30 minutes to help determine your rights and options.\n\n" +
      "You can ask for a referral by completing the online request form at www.lawsocietyreferralservice.ca.",
    sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/after-judgment",
  },
];

const BY_KEY = new Map(NEXT_STEP_BLOCKS.map((block) => [`${block.pathway}:${block.stage}`, block]));
const BY_ID = new Map(NEXT_STEP_BLOCKS.map((block) => [block.id, block]));

/** The block for a pathway and stage, or null. Never throws, never invents. */
export function nextStepBlockFor(pathway: string, stage: string): NextStepBlock | null {
  return BY_KEY.get(`${pathway}:${stage}`) ?? null;
}

/**
 * Resolve a block id the model returned.
 *
 * Returns null for anything not in the catalogue, which is what makes a
 * hallucinated or stale id harmless rather than user-visible.
 */
export function nextStepBlockById(id: string): NextStepBlock | null {
  return BY_ID.get(id) ?? null;
}

/** Whether a block is still an unreviewed placeholder. */
export function isPlaceholder(block: NextStepBlock): boolean {
  return block.text.startsWith("[NEEDS LICENSEE REVIEW:");
}
