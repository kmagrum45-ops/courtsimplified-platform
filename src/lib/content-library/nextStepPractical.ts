/**
 * What the next step takes, in practice: the form, the fee, where and how to
 * file it, and how to serve it (master plan Phase 2, 2026-10-08).
 *
 * WHY. The finish-line walkthrough (20 cases) found the next-step card named
 * the step and its deadline but never said what it costs, where it is filed or
 * how it is served: 0 of 20 passed that check. Those are fixed facts set by the
 * rules and the fee regulations, so they live here, in code, per step -- not
 * in a model's answer.
 *
 * EVERY STATEMENT IS A QUOTE. Each fee, filing and service line carries a
 * RuleCitation whose words are read back out of the saved official text by
 * `npm run test:next-step-practical` (CLAUDE.md s. 2). The short plain-words
 * line beside each one says only what its quote says. The verified date shown
 * is the date that text was saved (docs/sources/corpus/manifest.json); the
 * suite checks the two agree.
 *
 * FORMS ARE THE STEP'S OWN. A form listed for a step must already be named in
 * that step's quoted rules, its deadlines or its published answer; the suite
 * fails on any other. The form's title and official link come from the forms
 * index (forms/formGuide.ts), read from the regulation and the Ontario Court
 * Forms site.
 *
 * NOTHING HERE JUDGES A CASE (CLAUDE.md s. 3). It says what a step costs and
 * how it is done, never whether to take it.
 */

import type { RuleCitation } from "../case-system/stage-map/citations";

export type PracticalCourt = "small-claims" | "civil" | "family";

/** How a step's document is served, which decides the rule shown. */
export type ServeKind = "originating" | "special" | "ordinary" | "summons" | "garnishment";

export type Fee = {
  id: string;
  court: PracticalCourt;
  amount: number;
  /** Plain words for what the fee is for; says only what `cite` says. */
  label: string;
  cite: RuleCitation;
};

export type StepPractical = {
  /** Form numbers for this court (or "civil:61A.3" for a form from another court's rules). */
  forms: string[];
  fees: string[];
  /** True when this step files something with the court office. */
  files: boolean;
  serve: ServeKind | null;
  /** Other must-know lines for this step, each a quote. */
  also?: RuleCitation[];
};

/** Plain words beside a quote. Every `say` paraphrases only the `cite` it sits with. */
export type PlainLine = { say: string; cite: RuleCitation };

const cite = (sourceId: RuleCitation["sourceId"], pinpoint: string, quote: string): RuleCitation => ({ sourceId, pinpoint, quote });

/** The date each source below was saved from the official site (manifest.json); checked by the suite. */
export const SOURCE_SAVED_ON: Partial<Record<RuleCitation["sourceId"], string>> = {
  "oreg-332-16-small-claims-fees": "2026-09-30",
  "oreg-293-92-superior-court-fees": "2026-09-30",
  "ontario-file-small-claims-online": "2026-09-27",
  "ontario-file-civil-claim-online": "2026-09-27",
  "ontario-fees-family": "2026-09-30",
  "ontario-fee-waiver": "2026-09-27",
  "oreg-258-98-small-claims-rules": "2026-09-27",
  "rules-of-civil-procedure": "2026-09-27",
  "family-law-rules": "2026-09-30",
};

// ---------------------------------------------------------------- fees

const sc = (pinpoint: string, quote: string) => cite("oreg-332-16-small-claims-fees", pinpoint, quote);
const sup = (pinpoint: string, quote: string) => cite("oreg-293-92-superior-court-fees", pinpoint, quote);

const FEE_LIST: Fee[] = [
  { id: "sc-claim", court: "small-claims", amount: 108, label: "Filing a claim (most people)", cite: sc("s. 1 (2), para. 1", "On the filing of a claim by an infrequent claimant, $108.") },
  { id: "sc-claim-frequent", court: "small-claims", amount: 228, label: "Filing a claim, if you have already filed 10 or more claims in that office this year", cite: sc("s. 1 (2), para. 2", "On the filing of a claim by a frequent claimant, $228.") },
  { id: "sc-defendants-claim", court: "small-claims", amount: 108, label: "Filing a defendant's claim", cite: sc("s. 1 (2), para. 3", "On the filing of a defendant’s claim, $108.") },
  { id: "sc-motion", court: "small-claims", amount: 127, label: "Filing a motion (paid by the person bringing it)", cite: sc("s. 1 (2), para. 4", "On the filing of a notice of motion served on another party, a notice of motion without notice or a notice of motion for a consent order (except a notice of motion under the Wages Act), $127.") },
  { id: "sc-defence", court: "small-claims", amount: 77, label: "Filing a defence", cite: sc("s. 1 (2), para. 5", "On the filing of a defence, $77.") },
  { id: "sc-trial", court: "small-claims", amount: 308, label: "Setting a trial or assessment hearing date (most people)", cite: sc("s. 1 (2), para. 6", "For the fixing of a date for a trial or an assessment hearing by an infrequent claimant, $308.") },
  { id: "sc-default", court: "small-claims", amount: 94, label: "Asking for default judgment (most people)", cite: sc("s. 1 (2), para. 8", "For the filing of a request for default judgment by an infrequent claimant, $94.") },
  { id: "sc-summons", court: "small-claims", amount: 33, label: "Issuing a summons to a witness", cite: sc("s. 1 (2), para. 10", "On the issue of a summons to a witness, $33.") },
  { id: "sc-certificate", court: "small-claims", amount: 30, label: "A certificate of judgment", cite: sc("s. 1 (2), para. 12", "On the issue of a certificate of judgment, $30.") },
  { id: "sc-writ-exam", court: "small-claims", amount: 68, label: "A writ of seizure and sale, a writ of delivery or a notice of examination", cite: sc("s. 1 (2), para. 13", "On the issue of a writ of delivery, a writ of seizure and sale or a notice of examination, $68.") },
  { id: "sc-garnishment", court: "small-claims", amount: 144, label: "A notice of garnishment", cite: sc("s. 1 (2), para. 14", "On the issue or renewal of a notice of garnishment, $144.") },
  { id: "sc-appeal", court: "small-claims", amount: 138, label: "Filing a notice of appeal of a final Small Claims order", cite: sup("s. 1 (1), para. 3 xi", "A notice of appeal or cross-appeal to an appellate court of a final order of the Small Claims Court, $138.") },

  { id: "civ-claim", court: "civil", amount: 243, label: "Issuing a statement of claim or notice of action", cite: sup("s. 1 (1), para. 1 i", "A statement of claim, notice of action or notice of application, $243.") },
  { id: "civ-third-party", court: "civil", amount: 243, label: "Issuing a third party claim", cite: sup("s. 1 (1), para. 1 ii", "A third or subsequent party claim, $243.") },
  { id: "civ-summons", court: "civil", amount: 33, label: "Issuing a summons to a witness", cite: sup("s. 1 (1), para. 1 iv", "A summons to a witness, $33.") },
  { id: "civ-writ", court: "civil", amount: 77, label: "Issuing a writ of execution", cite: sup("s. 1 (1), para. 1 vii", "A writ of execution, $77.") },
  { id: "civ-garnishment", court: "civil", amount: 155, label: "A notice of garnishment", cite: sup("s. 1 (1), para. 1 viii", "A notice of garnishment or notice of renewal of garnishment (including the filing of the notice with the sheriff), $155.") },
  { id: "civ-intent", court: "civil", amount: 194, label: "Filing a notice of intent to defend", cite: sup("s. 1 (1), para. 3 i", "A notice of intent to defend, $194.") },
  { id: "civ-defence", court: "civil", amount: 194, label: "Filing a defence (no fee if you already paid for a notice of intent to defend)", cite: sup("s. 1 (1), para. 3 ii", "If no notice of intent to defend has been filed by the same party, a statement of defence, a defence to counterclaim, a defence to crossclaim or a third party defence, $194.") },
  { id: "civ-motion", court: "civil", amount: 339, label: "Filing a motion (paid by the person bringing it)", cite: sup("s. 1 (1), para. 3 iv", "A notice of motion served on another party, a notice of motion without notice, a notice of motion for a consent order or a notice of motion for leave to appeal, other than a notice of motion in a family law appeal, $339.") },
  { id: "civ-default", court: "civil", amount: 177, label: "Asking the registrar to sign default judgment", cite: sup("s. 1 (1), para. 3 viii", "A requisition for signing of default judgment by registrar, $177.") },
  { id: "civ-trial-record", court: "civil", amount: 859, label: "Filing the trial record (first time only)", cite: sup("s. 1 (1), para. 3 ix", "A trial record, $859, for the first time only.") },
  { id: "civ-appeal-interlocutory", court: "civil", amount: 243, label: "A notice of appeal from an interlocutory order", cite: sup("s. 1 (1), para. 3 x", "A notice of appeal or cross-appeal from an interlocutory order, $243.") },
  { id: "civ-appeal-final", court: "civil", amount: 243, label: "A notice of appeal from a final order", cite: sup("s. 1 (1), para. 3 xii", "A notice of appeal or cross-appeal to an appellate court of a final order of any court or tribunal, other than the Small Claims Court or the Consent and Capacity Board, $243.") },
  { id: "civ-perfect", court: "civil", amount: 645, label: "Perfecting an appeal", cite: sup("s. 1 (1), para. 5", "For perfecting an appeal or judicial review application, $645.") },

  { id: "fam-application", court: "family", amount: 214, label: "Filing an application (Superior Court of Justice)", cite: sup("s. 1.2 (1), para. 1", "On the filing of an application, $214.") },
  { id: "fam-answer", court: "family", amount: 171, label: "Filing an answer (Superior Court of Justice)", cite: sup("s. 1.2 (1), para. 2", "On the filing of an answer, other than an answer referred to in paragraph 3, $171.") },
  { id: "fam-answer-divorce", court: "family", amount: 214, label: "Filing an answer that asks for a divorce (Superior Court of Justice)", cite: sup("s. 1.2 (1), para. 3", "On the filing of an answer that includes a request for a divorce by a respondent, $214.") },
  { id: "fam-list", court: "family", amount: 445, label: "Placing an application on the list for hearing (Superior Court of Justice)", cite: sup("s. 1.2 (1), para. 4", "On the placing of an application on the list for hearing, $445.") },
  { id: "fam-appeal-final", court: "family", amount: 243, label: "A notice of appeal from a final order", cite: sup("s. 1 (1), para. 3 xii", "A notice of appeal or cross-appeal to an appellate court of a final order of any court or tribunal, other than the Small Claims Court or the Consent and Capacity Board, $243.") },
  { id: "fam-appeal-interlocutory", court: "family", amount: 243, label: "A notice of appeal from a temporary (interlocutory) order", cite: sup("s. 1 (1), para. 3 x", "A notice of appeal or cross-appeal from an interlocutory order, $243.") },
  { id: "fam-summons", court: "family", amount: 33, label: "Issuing a summons to a witness (Superior Court of Justice)", cite: sup("s. 1.2 (1), para. 5", "On the issue of a summons to a witness, $33.") },
];

export const FEES: Record<string, Fee> = Object.fromEntries(FEE_LIST.map((fee) => [fee.id, fee]));

/** Lines shown with every family fee: which court charges nothing, and which cases pay no filing fee. */
export const FAMILY_FEE_NOTES: PlainLine[] = [
  {
    say: "In the Ontario Court of Justice there is no fee to file or list a family case.",
    cite: cite("ontario-fees-family", "Ontario Court of Justice fees", "There are no filing or listing fees in family proceedings in the Ontario Court of Justice."),
  },
  {
    say: "In the Superior Court, there is no fee to file an application or answer in a case only about parenting or support under the Children's Law Reform Act or the Family Law Act (other than its property and home parts).",
    cite: sup(
      "s. 1.2 (2)",
      "no fees are payable for the filing of an application, the filing of an answer or the placing of an application on the list for hearing in respect of, (a) proceedings under the Children’s Law Reform Act, the Family Law Act (except Parts I and II)",
    ),
  },
  {
    say: "A divorce claim also needs the federal government's $10 fee.",
    cite: cite("ontario-fees-family", "Superior Court and Family Court branch fees", "anyone filing an application or an answer with a divorce claim must include the federal government’s $10 fee"),
  },
];

/** Shown with a family appeal fee instead: appeals pay the civil fees. */
export const FAMILY_APPEAL_FEE_NOTE: PlainLine = {
  say: "Family appeals pay the civil court fees, unless you have a fee waiver certificate.",
  cite: cite(
    "ontario-fees-family",
    "Family appeal fees",
    "You must pay fees to appeal an order in a family court proceeding unless you have a fee waiver certificate ... For the purposes of court fees, family appeals are treated like civil court proceedings.",
  ),
};

/** The first-instance family fees, which the Ontario Court of Justice and some Superior Court cases do not charge. */
const FIRST_INSTANCE_FAMILY_FEES = new Set(["fam-application", "fam-answer", "fam-answer-divorce", "fam-list", "fam-summons"]);

export const FEE_WAIVER: PlainLine = {
  say: "If you cannot afford the fee, you can ask the court to waive it. Asking costs nothing.",
  cite: cite(
    "ontario-fee-waiver",
    "Overview",
    "If you cannot afford to pay the fees, you can ask the court to waive them. ... There is no cost to apply for a fee waiver.",
  ),
};

// ---------------------------------------------------------------- filing

export type FilingLines = { toronto: PlainLine; elsewhere: PlainLine; more: PlainLine[] };

export const FILING: Record<PracticalCourt, FilingLines> = {
  "small-claims": {
    toronto: {
      say: "In the Toronto region, file online through the Ontario Courts Public Portal.",
      cite: cite("ontario-file-small-claims-online", "Overview", "Starting October 14, 2025, all online filings for the Toronto region must be submitted using the Ontario Courts Public Portal."),
    },
    elsewhere: {
      say: "Outside Toronto, file online through the Small Claims Court Submissions Online portal.",
      cite: cite(
        "ontario-file-small-claims-online",
        "Overview",
        "The Small Claims Court Submissions Online portal will continue to be available to file court documents online for Small Claims Court cases in other regions outside of Toronto.",
      ),
    },
    more: [
      {
        say: "If a deadline is 3 business days away or less, you cannot file online for it: file in person at the courthouse, by mail or by email.",
        cite: cite(
          "ontario-file-small-claims-online",
          "Documents you cannot file online",
          "if you need to meet a deadline established by legislation or other court rules, court practice direction or a court order that is 3 business days or less away ... If you cannot submit your documents online, you may file them: in person at the courthouse by mail by email",
        ),
      },
    ],
  },
  civil: {
    toronto: {
      say: "In the Toronto region, file online through the Ontario Courts Public Portal.",
      cite: cite("ontario-file-civil-claim-online", "Overview", "Starting October 14, 2025, all online filings for the Toronto region must be submitted using the Ontario Courts Public Portal."),
    },
    elsewhere: {
      say: "Outside Toronto, file online through the Civil Claims Online or Civil Submissions Online portal.",
      cite: cite(
        "ontario-file-civil-claim-online",
        "Overview",
        "The Civil Claims Online and Civil Submissions Online portals will continue to be available to file court documents online for civil and Divisional Court cases in other regions outside of Toronto.",
      ),
    },
    more: [
      {
        say: "If a deadline is 3 business days away or fewer, you cannot file online for it.",
        cite: cite(
          "ontario-file-civil-claim-online",
          "Documents you can file online",
          "if you need to meet a deadline established by legislation or other court rules, court practice direction or a court order that is 3 business days or fewer away",
        ),
      },
    ],
  },
  family: {
    toronto: {
      say: "In the Toronto region, file online through the Ontario Courts Public Portal.",
      cite: cite("ontario-fees-family", "Paying family court fees online", "Use the Ontario Courts Public Portal for matters in the Toronto region."),
    },
    elsewhere: {
      say: "Outside Toronto, file online through the Justice Services Online portal.",
      cite: cite("ontario-fees-family", "Paying family court fees online", "Use the Justice Services Online portal for matters outside of Toronto."),
    },
    more: [],
  },
};

/** The City of Toronto, including the former cities it absorbed; anything else is outside the Toronto region. */
export function inTorontoRegion(city: string): boolean | null {
  const name = city.trim().toLowerCase();
  if (!name) return null;
  // Not "York" alone: York Region (Newmarket, Markham...) is outside Toronto.
  return /\b(toronto|scarborough|etobicoke|north york|east york)\b/.test(name);
}

// ---------------------------------------------------------------- service

export type ServiceLines = Record<ServeKind, PlainLine[]> & { proof: PlainLine };

const scr = (pinpoint: string, quote: string) => cite("oreg-258-98-small-claims-rules", pinpoint, quote);
const rcp = (pinpoint: string, quote: string) => cite("rules-of-civil-procedure", pinpoint, quote);
const flr = (pinpoint: string, quote: string) => cite("family-law-rules", pinpoint, quote);

export const SERVICE: Record<PracticalCourt, ServiceLines> = {
  "small-claims": {
    originating: [
      {
        say: "A claim must be served personally (a copy left with the person) or by an allowed alternative.",
        cite: scr("r. 8.01 (1)", "A plaintiff's claim or defendant's claim (Form 7A or 10A) shall be served personally as provided in rule 8.02 or by an alternative to personal service as provided in rule 8.03."),
      },
      {
        say: "One alternative: registered mail or courier to the person's home, if someone there signs for it.",
        cite: scr(
          "r. 8.03 (7)",
          "Service of a plaintiff's claim or defendant's claim on an individual against whom the claim is made may be made by sending a copy of the claim by registered mail or by courier to the individual's place of residence, if the signature of the individual or any person who appears to be a member of the same household, verifying receipt of the copy, is obtained.",
        ),
      },
    ],
    ordinary: [
      {
        say: "A defence and most other documents can be served by mail, courier, email or in person.",
        cite: scr(
          "r. 8.01 (14)",
          "The following documents may be served by mail, by courier, by email, personally as provided in rule 8.02 or by an alternative to personal service as provided in rule 8.03, unless the court orders otherwise: 1. A defence. 2. Any other document not referred to in subrules (1) to (13).",
        ),
      },
    ],
    special: [],
    summons: [
      {
        say: "A summons must be handed to the witness at least 10 days before the trial, with their attendance money.",
        cite: scr(
          "r. 8.01 (7)",
          "A summons to witness (Form 18A) shall be served personally by the party who requires the presence of the witness, or by the party's representative, at least 10 days before the trial date; at the time of service, attendance money calculated in accordance with the regulations made under the Administration of Justice Act shall be paid or tendered to the witness.",
        ),
      },
    ],
    garnishment: [
      {
        say: "A notice of garnishment is served on the debtor with your sworn affidavit for enforcement request, by mail, courier or in person.",
        cite: scr(
          "r. 8.01 (8)",
          "A notice of garnishment (Form 20E) shall be served by the creditor, (a) together with a sworn affidavit for enforcement request (Form 20P), on the debtor, by mail, by courier, personally as provided in rule 8.02 or by an alternative to personal service as provided in rule 8.03",
        ),
      },
    ],
    proof: {
      say: "Prove service with an affidavit of service (Form 8A) from whoever served it.",
      cite: scr("r. 8.09.1 (2)", "Service of a document may be proved by an affidavit of service (Form 8A) of the person who served it."),
    },
  },
  civil: {
    originating: [
      {
        say: "A statement of claim must be served personally or by an allowed alternative to personal service.",
        cite: rcp("r. 16.01 (1)", "An originating process shall be served personally as provided in rule 16.02 or by an alternative to personal service as provided in rule 16.03."),
      },
    ],
    ordinary: [
      {
        say: "Other documents go to the other side's lawyer if they have one; a person acting for themselves can be served by mail to their last address for service.",
        cite: rcp(
          "r. 16.01 (4)",
          "shall be served on a party who has a lawyer of record by serving the lawyer, and service may be made in a manner provided in rule 16.05; (b) may be served on a party acting in person or on a person who is not a party, (i) by mailing a copy of the document to the last address for service provided by the party or other person or, if no such address has been provided, to the party's or person's last known address",
        ),
      },
    ],
    special: [],
    summons: [
      {
        say: "A witness you need at trial is served with a summons to witness (Form 53A).",
        cite: rcp("r. 53.04 (1)", "A party who requires the attendance of a person in Ontario as a witness at a trial may serve the person with a summons to witness (Form 53A)"),
      },
    ],
    garnishment: [],
    proof: {
      say: "Prove service with an affidavit of service (Form 16B) from whoever served it.",
      cite: rcp("r. 16.09 (1)", "Service of a document may be proved by an affidavit of the person who served it (Form 16B)."),
    },
  },
  family: {
    originating: [
      {
        say: "An application is served right away on every other party, usually by special service.",
        cite: flr("r. 8 (5)", "The application shall be served immediately on every other party, and special service shall be used unless the party is listed in subrule (6)."),
      },
      {
        say: "Special service of an application must be done by someone other than you.",
        cite: flr(
          "r. 6 (4.1)",
          "special service of the following documents shall be carried out by a person other than the party required to serve the document: 1. An application (Form 8, 8A, 8B, 8B.1, 8B.2, 8C, 8D, 8D.1, 33D.1, 34L or 34N). 2. A motion to change (Form 15), with all required attachments.",
        ),
      },
    ],
    special: [
      {
        say: "A motion to change is served by special service, and someone other than you must do it.",
        cite: flr(
          "r. 6 (4.1)",
          "special service of the following documents shall be carried out by a person other than the party required to serve the document: 1. An application (Form 8, 8A, 8B, 8B.1, 8B.2, 8C, 8D, 8D.1, 33D.1, 34L or 34N). 2. A motion to change (Form 15), with all required attachments.",
        ),
      },
      {
        say: "One way to do special service: leave a copy with the person.",
        cite: flr("r. 6 (3)", "Special service of a document on a person is carried out by, (a) leaving a copy, (i) with the person to be served"),
      },
    ],
    ordinary: [
      {
        say: "Most other documents can be served by regular service, such as mailing or emailing a copy to the other party, or to their lawyer if they have one.",
        cite: flr(
          "r. 6 (2)",
          "Regular service of a document on a person is carried out by, (a) mailing a copy to the person’s licensed representative or, if none, to the person ... (e) emailing a copy to the person’s licensed representative or, if none, to the person",
        ),
      },
    ],
    summons: [
      {
        say: "A summons to witness must be handed to the witness (special service by leaving a copy), unless the court orders otherwise.",
        cite: flr(
          "r. 6 (4)",
          "Special service of the following documents shall be carried out only by a method set out in clause (3) (a), unless the court orders otherwise: 1. A notice of contempt motion. 2. A summons to witness.",
        ),
      },
      {
        say: "Someone other than you must serve it.",
        cite: flr(
          "r. 6 (4.1)",
          "special service of the following documents shall be carried out by a person other than the party required to serve the document: ... 3. A document listed in subrule (4).",
        ),
      },
    ],
    garnishment: [],
    proof: {
      say: "Prove service with an affidavit of service (Form 6B).",
      cite: flr("r. 6 (19)", "(b) an affidavit of service (Form 6B)"),
    },
  },
};

// ---------------------------------------------------------------- the steps

const SC_ATTACH = scr(
  "r. 7.01 (2), para. 2",
  "If the plaintiff's claim is based in whole or in part on a document, a copy of the document shall be attached to each copy of the claim, unless it is unavailable, in which case the claim shall state the reason why the document is not attached.",
);
const SC_ATTACH_DEFENCE = scr(
  "r. 9.02 (1), para. 2",
  "If the defence is based in whole or in part on a document, a copy of the document shall be attached to each copy of the defence",
);
const SC_HEARING_DATE = scr(
  "r. 15.01 (2)",
  "The moving party shall obtain a hearing date from the clerk before serving the notice of motion and supporting affidavit under subrule (3).",
);

const SC_START = scr("r. 7.01 (1)", "An action shall be commenced by filing a plaintiff's claim (Form 7A) with the clerk, together with a copy of the claim for each defendant.");
const CIV_START = rcp(
  "r. 14.03 (1), (2)",
  "The originating process for the commencement of an action is a statement of claim (Form 14A (general) or 14B (mortgage actions)) ... Where there is insufficient time to prepare a statement of claim, an action may be commenced by the issuing of a notice of action (Form 14C) that contains a short statement of the nature of the claim.",
);
const CIV_MOTION = rcp(
  "r. 37.01",
  "A motion shall be made by a notice of motion (in Form 37A) unless the nature of the motion or the circumstances make a notice of motion unnecessary or these rules provide otherwise.",
);
const FAM_MOTION = flr("r. 14 (9)", "A motion, whether made with or without notice, (a) requires a notice of motion (Form 14) and an affidavit (Form 14A); and (b) may be supported by additional evidence.");

const APPEAL_START = rcp(
  "r. 61.04 (1)",
  "An appeal to an appellate court shall be commenced by serving a notice of appeal in Form 61A.2 (Court of Appeal) or 61A.3 (Divisional Court) together with the certificate required by subrule 61.05 (1), within 30 days after the making of the order appealed from, unless a statute or these rules provide otherwise",
);

const NOTHING: StepPractical = { forms: [], fees: [], files: false, serve: null };

/**
 * Every step in the stage map has an entry; "unknown" and "out-of-scope" are
 * not steps. A step with nothing to file says so with NOTHING, deliberately,
 * so a missing entry is a test failure rather than a silent blank.
 */
export const STEP_PRACTICAL: Record<string, StepPractical> = {
  // ---- Small Claims: before filing
  "before-filing:deciding-whether-to-sue": { forms: ["7A"], fees: ["sc-claim", "sc-claim-frequent"], files: true, serve: null, also: [SC_START, SC_ATTACH] },
  "before-filing:notice-municipality": NOTHING,
  "before-filing:notice-toronto": NOTHING,
  "before-filing:notice-snow-ice-private": NOTHING,
  "before-filing:notice-vehicle-injury": NOTHING,
  "before-filing:notice-deadline-missed": NOTHING,
  "before-filing:limitation-period-may-have-passed": NOTHING,
  "before-filing:claim-exceeds-small-claims-limit": NOTHING,
  // ---- Small Claims: plaintiff
  "plaintiff:claim-drafted-not-filed": { forms: ["7A"], fees: ["sc-claim", "sc-claim-frequent"], files: true, serve: null, also: [SC_START, SC_ATTACH] },
  "plaintiff:claim-issued-not-served": { forms: ["8A"], fees: [], files: false, serve: "originating" },
  "plaintiff:service-attempted-failed": { forms: ["15A", "8A"], fees: ["sc-motion"], files: true, serve: "originating", also: [SC_HEARING_DATE] },
  "plaintiff:six-month-service-window-expired": { forms: ["15A"], fees: ["sc-motion"], files: true, serve: null, also: [SC_HEARING_DATE] },
  "plaintiff:served-awaiting-defence": NOTHING,
  "plaintiff:defence-period-expired-no-defence": { forms: ["9B", "11B"], fees: ["sc-default"], files: true, serve: null },
  "plaintiff:defendant-noted-in-default": { forms: ["11B", "15A", "9B"], fees: ["sc-default", "sc-motion", "sc-trial"], files: true, serve: null },
  "plaintiff:assessment-of-damages-needed": { forms: ["15A", "9B"], fees: ["sc-motion", "sc-trial"], files: true, serve: null },
  "plaintiff:default-judgment-signed": { forms: ["20P", "20E", "20H"], fees: ["sc-garnishment", "sc-writ-exam"], files: true, serve: "garnishment" },
  "plaintiff:defence-filed": { forms: ["13A"], fees: [], files: true, serve: "ordinary" },
  "plaintiff:served-with-defendants-claim": { forms: ["9A"], fees: ["sc-defence"], files: true, serve: "ordinary", also: [SC_ATTACH_DEFENCE] },
  "plaintiff:awaiting-settlement-conference": { forms: ["13A"], fees: [], files: true, serve: "ordinary" },
  "plaintiff:settlement-conference-held": { forms: ["9B"], fees: ["sc-trial"], files: true, serve: null },
  "plaintiff:trial-date-set": { forms: ["18A"], fees: ["sc-summons"], files: true, serve: "summons" },
  "plaintiff:judgment-in-my-favour-unpaid": { forms: ["20P", "20E", "20H", "20C"], fees: ["sc-garnishment", "sc-writ-exam"], files: true, serve: "garnishment" },
  "plaintiff:action-dismissed-for-delay": { forms: ["15A"], fees: ["sc-motion"], files: true, serve: "ordinary", also: [SC_HEARING_DATE] },
  // ---- Small Claims: defendant
  "defendant:served-defence-period-running": { forms: ["9A"], fees: ["sc-defence"], files: true, serve: "ordinary", also: [SC_ATTACH_DEFENCE] },
  "defendant:defence-period-expired-not-yet-noted": { forms: ["9A"], fees: ["sc-defence"], files: true, serve: "ordinary", also: [SC_ATTACH_DEFENCE] },
  "defendant:noted-in-default": { forms: ["15A"], fees: ["sc-motion"], files: true, serve: "ordinary", also: [SC_HEARING_DATE] },
  "defendant:default-judgment-against-me": { forms: ["15A"], fees: ["sc-motion"], files: true, serve: "ordinary", also: [SC_HEARING_DATE] },
  "defendant:defence-filed": { forms: ["13A"], fees: [], files: true, serve: "ordinary" },
  "defendant:considering-defendants-claim": { forms: ["10A"], fees: ["sc-defendants-claim"], files: true, serve: "originating" },
  "defendant:awaiting-settlement-conference": { forms: ["13A"], fees: [], files: true, serve: "ordinary" },
  "defendant:trial-date-set": { forms: ["18A"], fees: ["sc-summons"], files: true, serve: "summons" },
  "defendant:judgment-against-me": { forms: ["15A"], fees: ["sc-motion", "sc-appeal"], files: true, serve: "ordinary", also: [APPEAL_START] },
  // ---- Small Claims: either side
  "both:missed-settlement-conference": NOTHING,
  "both:missed-trial": { forms: ["15A"], fees: ["sc-motion"], files: true, serve: "ordinary", also: [SC_HEARING_DATE] },
  "both:filed-in-wrong-place": NOTHING,

  // ---- Civil: before filing
  "civil:before-filing:deciding-whether-to-sue": { forms: ["14A", "14C"], fees: ["civ-claim"], files: true, serve: null, also: [CIV_START] },
  "civil:before-filing:notice-required-before-suing": NOTHING,
  "civil:before-filing:limitation-period-may-have-passed": NOTHING,
  // ---- Civil: plaintiff
  "civil:plaintiff:claim-drafted-not-issued": { forms: ["14A", "14C"], fees: ["civ-claim"], files: true, serve: null, also: [CIV_START] },
  "civil:plaintiff:claim-issued-not-served": { forms: ["16B", "14D"], fees: [], files: true, serve: "originating" },
  "civil:plaintiff:service-attempted-failed": { forms: ["37A", "16B"], fees: ["civ-motion"], files: true, serve: "originating", also: [CIV_MOTION] },
  "civil:plaintiff:served-awaiting-defence": NOTHING,
  "civil:plaintiff:defence-period-expired-no-defence": { forms: ["19D", "19A"], fees: ["civ-default"], files: true, serve: null },
  "civil:plaintiff:defendant-noted-in-default": { forms: ["19D", "19A", "37A"], fees: ["civ-default", "civ-motion"], files: true, serve: null, also: [CIV_MOTION] },
  "civil:plaintiff:defence-received": { forms: ["25A", "30A"], fees: [], files: true, serve: "ordinary" },
  "civil:plaintiff:served-with-counterclaim": { forms: ["27C"], fees: ["civ-defence"], files: true, serve: "ordinary" },
  "civil:plaintiff:ready-to-set-down": { forms: [], fees: ["civ-trial-record"], files: true, serve: "ordinary" },
  "civil:plaintiff:struck-off-trial-list": { forms: ["37A"], fees: ["civ-motion"], files: true, serve: "ordinary", also: [CIV_MOTION] },
  "civil:plaintiff:action-dismissed-for-delay": { forms: ["37A"], fees: ["civ-motion"], files: true, serve: "ordinary", also: [CIV_MOTION] },
  "civil:plaintiff:wants-to-discontinue": { forms: ["23A"], fees: [], files: true, serve: "ordinary" },
  "civil:plaintiff:judgment-unpaid": { forms: ["60A", "60G", "60H"], fees: ["civ-writ", "civ-garnishment"], files: true, serve: null },
  // ---- Civil: defendant
  "civil:defendant:served-defence-period-running": { forms: ["18A", "18B"], fees: ["civ-intent", "civ-defence"], files: true, serve: "ordinary" },
  "civil:defendant:defence-delivered": { forms: ["30A"], fees: [], files: false, serve: "ordinary" },
  "civil:defendant:served-with-third-party-claim": { forms: ["29B"], fees: ["civ-defence"], files: true, serve: "ordinary" },
  "civil:defendant:served-with-counterclaim-as-new-party": { forms: ["27C"], fees: ["civ-defence"], files: true, serve: "ordinary" },
  "civil:defendant:served-with-crossclaim": { forms: ["28B"], fees: ["civ-defence"], files: true, serve: "ordinary" },
  "civil:defendant:action-discontinued-counterclaim-pending": { forms: ["23B"], fees: [], files: true, serve: "ordinary" },
  "civil:defendant:plaintiff-delaying": { forms: ["37A"], fees: ["civ-motion"], files: true, serve: "ordinary", also: [CIV_MOTION] },
  "civil:defendant:defence-period-expired-not-noted": { forms: ["18A"], fees: ["civ-defence"], files: true, serve: "ordinary" },
  "civil:defendant:noted-in-default": { forms: ["37A"], fees: ["civ-motion"], files: true, serve: "ordinary", also: [CIV_MOTION] },
  "civil:defendant:default-judgment-against-me": { forms: ["37A"], fees: ["civ-motion"], files: true, serve: "ordinary", also: [CIV_MOTION] },
  "civil:defendant:action-dismissed-counterclaim-pending": { forms: ["23B"], fees: [], files: true, serve: "ordinary" },
  "civil:defendant:judgment-being-enforced": { forms: ["61A.2", "61A.3", "61C"], fees: ["civ-appeal-final"], files: true, serve: "ordinary", also: [APPEAL_START] },
  // ---- Civil: either side
  "civil:both:lawyer-removed-from-record": { forms: ["15B", "15C"], fees: [], files: true, serve: "ordinary" },
  "civil:both:served-with-amended-pleading": NOTHING,
  "civil:both:discovery": { forms: ["30A"], fees: [], files: false, serve: "ordinary" },
  "civil:both:simplified-procedure-after-defence": { forms: ["30A", "76C"], fees: [], files: true, serve: "ordinary" },
  "civil:both:mandatory-mediation": { forms: ["24.1A", "24.1C"], fees: [], files: true, serve: "ordinary" },
  "civil:both:served-with-request-to-admit": { forms: ["51B"], fees: [], files: false, serve: "ordinary" },
  "civil:both:offer-to-settle": { forms: ["49A"], fees: [], files: false, serve: "ordinary" },
  "civil:both:summary-judgment-motion": { forms: ["37B"], fees: ["civ-motion"], files: true, serve: "ordinary" },
  "civil:both:motion-scheduled": { forms: ["37B"], fees: ["civ-motion"], files: true, serve: "ordinary" },
  "civil:both:interlocutory-order-made": { forms: ["61A", "62A"], fees: ["civ-motion", "civ-appeal-interlocutory"], files: true, serve: "ordinary" },
  "civil:both:pretrial-scheduled": { forms: ["50A"], fees: [], files: true, serve: "ordinary" },
  "civil:both:trial-date-set": { forms: ["53A"], fees: ["civ-summons"], files: true, serve: "summons" },
  "civil:both:missed-trial": { forms: ["37A", "61A.2", "61A.3", "61C"], fees: ["civ-motion", "civ-appeal-final"], files: true, serve: "ordinary", also: [CIV_MOTION, APPEAL_START] },
  "civil:both:judgment-given": { forms: ["61A.2", "61A.3", "61C"], fees: ["civ-appeal-final"], files: true, serve: "ordinary", also: [APPEAL_START] },
  "civil:both:appeal-in-progress": { forms: ["61D"], fees: ["civ-perfect"], files: true, serve: "ordinary" },

  // ---- Family: before filing
  "family:before-filing:deciding-where-to-start": NOTHING,
  "family:before-filing:property-claim-time-limit": NOTHING,
  // ---- Family: applicant
  "family:applicant:application-filed-not-served": { forms: ["6"], fees: [], files: false, serve: "originating" },
  "family:applicant:service-failed": NOTHING,
  "family:applicant:served-waiting-for-answer": NOTHING,
  "family:applicant:no-answer-filed": { forms: ["23C", "14A"], fees: [], files: true, serve: null },
  "family:applicant:answer-received": { forms: ["10A", "17"], fees: [], files: true, serve: "ordinary" },
  "family:applicant:uncontested-or-joint-divorce": { forms: ["36"], fees: [], files: true, serve: null },
  "family:applicant:amending-own-application": NOTHING,
  // ---- Family: respondent
  "family:respondent:served-time-to-answer-running": { forms: ["10", "13"], fees: ["fam-answer", "fam-answer-divorce"], files: true, serve: "ordinary" },
  "family:respondent:answer-time-missed": { forms: ["10", "13", "14", "14A"], fees: ["fam-answer"], files: true, serve: "ordinary", also: [FAM_MOTION] },
  "family:respondent:answer-filed": { forms: ["17", "10A"], fees: [], files: true, serve: "ordinary" },
  "family:respondent:served-with-amended-application": NOTHING,
  // ---- Family: either side
  "family:both:served-with-automatic-order": NOTHING,
  "family:both:case-conference-scheduled": { forms: ["17A", "17F", "13A"], fees: [], files: true, serve: "ordinary" },
  "family:both:settlement-conference-scheduled": { forms: ["17C", "17F", "13C"], fees: [], files: true, serve: "ordinary" },
  "family:both:trial-management-conference-scheduled": { forms: ["17E", "17F"], fees: [], files: true, serve: "ordinary" },
  "family:both:missed-or-unconfirmed-conference": NOTHING,
  "family:both:financial-disclosure-missing": NOTHING,
  "family:both:bringing-a-motion": { forms: ["14", "14A", "14C"], fees: [], files: true, serve: "ordinary", also: [FAM_MOTION] },
  "family:both:responding-to-a-motion": { forms: ["14A"], fees: [], files: true, serve: "ordinary", also: [FAM_MOTION] },
  "family:both:order-made-without-notice": NOTHING,
  "family:both:asking-to-change-final-order": { forms: ["15", "15C", "13"], fees: [], files: true, serve: "special" },
  "family:both:served-with-motion-to-change": { forms: ["15B", "13"], fees: [], files: true, serve: "ordinary" },
  "family:both:motion-to-change-response-time-missed": NOTHING,
  "family:both:trial-scheduled": { forms: ["13B", "23"], fees: ["fam-summons"], files: true, serve: "summons" },
  "family:both:appealing-temporary-order": { forms: ["38"], fees: ["fam-appeal-interlocutory"], files: true, serve: "ordinary" },
  "family:both:final-order-made": { forms: ["38", "civil:61A.2", "civil:61A.3"], fees: ["fam-appeal-final"], files: true, serve: "ordinary", also: [APPEAL_START] },
  "family:both:support-order-not-paid": NOTHING,
  "family:both:case-in-wrong-municipality": NOTHING,
  "family:both:notice-of-approaching-dismissal": NOTHING,
  "family:both:served-with-notice-of-default-hearing": { forms: ["30B", "13"], fees: [], files: true, serve: "ordinary" },
  "family:both:responding-to-summary-judgment": { forms: ["14A"], fees: [], files: true, serve: "ordinary", also: [FAM_MOTION] },
  "family:both:served-with-contempt-motion": { forms: ["14A"], fees: [], files: true, serve: "ordinary", also: [FAM_MOTION] },
  "family:both:document-disclosure-requested": NOTHING,
  "family:both:offer-to-settle": NOTHING,
  "family:both:served-with-notice-of-appeal": NOTHING,
  "family:both:served-with-licence-suspension-notice": NOTHING,
  "family:both:served-with-notice-of-garnishment": { forms: ["29E"], fees: [], files: true, serve: "ordinary" },
  "family:both:notice-case-may-be-stayed-or-dismissed": NOTHING,
  "family:both:served-with-request-to-admit": { forms: ["22A"], fees: [], files: false, serve: "ordinary" },
  "family:both:childrens-lawyer-report": NOTHING,
  "family:both:served-with-request-for-financial-statement": { forms: ["13"], fees: [], files: false, serve: null },
  "family:both:binding-judicial-dispute-resolution": { forms: ["43B", "43C"], fees: [], files: true, serve: "ordinary" },
  "family:both:questioning": NOTHING,
  "family:both:withdrawing-a-claim": { forms: ["12"], fees: [], files: true, serve: "ordinary" },
  "family:both:served-with-financial-examination-appointment": { forms: ["13"], fees: [], files: false, serve: "ordinary" },
};

// ---------------------------------------------------------------- what the card shows

export type PracticalView = {
  forms: { court: PracticalCourt; number: string }[];
  fees: Fee[];
  feeNotes: PlainLine[];
  feeWaiver: PlainLine | null;
  filing: PlainLine[];
  serving: PlainLine[];
  also: RuleCitation[];
};

/**
 * What the card shows for a step. `city` picks the Toronto or the other
 * portal; with no city, both are shown, since guessing would send a person to
 * the wrong portal. Null when the step has nothing to file, serve or pay.
 */
export function practicalFor(stepId: string, court: PracticalCourt, city = ""): PracticalView | null {
  const step = STEP_PRACTICAL[stepId];
  if (!step || (step.forms.length === 0 && step.fees.length === 0 && !step.files && !step.serve)) return null;
  const toronto = inTorontoRegion(city);
  const filingLines = FILING[court];
  const fees = step.fees.map((id) => FEES[id]).filter(Boolean);
  const serviceLines = step.serve ? SERVICE[court][step.serve] : [];
  return {
    forms: step.forms.map((form) => {
      const [other, number] = form.includes(":") ? form.split(":") : [court, form];
      return { court: other as PracticalCourt, number };
    }),
    fees,
    feeNotes:
      court !== "family"
        ? []
        : fees.some((fee) => FIRST_INSTANCE_FAMILY_FEES.has(fee.id))
          ? FAMILY_FEE_NOTES
          : fees.some((fee) => fee.id.startsWith("fam-appeal"))
            ? [FAMILY_APPEAL_FEE_NOTE]
            : [],
    feeWaiver: fees.length > 0 ? FEE_WAIVER : null,
    filing: step.files
      ? [...(toronto === true ? [filingLines.toronto] : toronto === false ? [filingLines.elsewhere] : [filingLines.toronto, filingLines.elsewhere]), ...filingLines.more]
      : [],
    serving: serviceLines.length > 0 ? [...serviceLines, SERVICE[court].proof] : [],
    also: step.also ?? [],
  };
}
