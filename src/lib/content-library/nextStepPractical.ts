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
import { R_15_01_MOTION_FORM, R_6_01_PLACE, S_CLPA_18_1_NOTICE } from "../case-system/stage-map/citations";
import { COURT_LOCATIONS, COURT_LOCATIONS_RETRIEVED_AT, OCJ_COURTHOUSES, OCJ_SOURCE } from "./courts/courtLocations";
import { addDays, dayOfWeek, formatLongDate, holidayFor } from "../case-system/deadlines/holidays";
import { COURT_SERVICE_NOTICES } from "../case-system/deadlines/courtServiceNotices";

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
  /**
   * Small Claims: the fee list names no fee for the papers at this step
   * (checked item by item against O. Reg. 332/16, s. 1 (2), 2026-10-13), so
   * the card says so instead of "doesn't list the fee".
   */
  noFee?: true;
};

/**
 * Plain words beside a quote. Every `say` paraphrases only the `cite` it sits with.
 * `about`, when set, keeps the line to people whose words match it (a line
 * about serving a city is not shown to someone suing a neighbour); with no
 * words at all, every line is shown.
 */
export type PlainLine = { say: string; cite: RuleCitation; about?: RegExp };

const cite = (sourceId: RuleCitation["sourceId"], pinpoint: string, quote: string): RuleCitation => ({ sourceId, pinpoint, quote });

/** The date each source below was saved from the official site (manifest.json); checked by the suite. */
export const SOURCE_SAVED_ON: Partial<Record<RuleCitation["sourceId"], string>> = {
  "oreg-332-16-small-claims-fees": "2026-09-30",
  "oreg-293-92-superior-court-fees": "2026-09-30",
  "ontario-file-small-claims-online": "2026-09-27",
  "ontario-file-civil-claim-online": "2026-09-27",
  "ontario-fees-family": "2026-09-30",
  "ontario-fee-waiver": "2026-09-27",
  "oreg-417-95-family-court-fees": "2026-10-14",
  // The construction lien steps (stageSequence.ts moves and final steps).
  "construction-act": "2026-09-27",
  "oreg-302-18-construction-act-procedures": "2026-10-14",
  "toronto-how-to-file-a-claim": "2026-10-16",
  "oreg-258-98-small-claims-rules": "2026-09-27",
  "rules-of-civil-procedure": "2026-09-27",
  "family-law-rules": "2026-09-30",
  "cja-courts-of-justice-act": "2026-09-27",
  "municipal-act-2001": "2026-09-27",
  "city-of-toronto-act-2006": "2026-09-27",
  "occupiers-liability-act": "2026-09-27",
  "insurance-act": "2026-09-27",
  // Cited by the step chain's "What can happen next" (stageSequence.ts).
  "limitations-act-2002": "2026-09-27",
  "oreg-626-00-monetary-jurisdiction": "2026-09-27",
  "crown-liability-and-proceedings-act-2019": "2026-09-27",
  "family-law-act": "2026-09-30",
  "family-responsibility-support-arrears-enforcement-act": "2026-09-30",
  "divorce-act": "2026-09-30",
  // The passed-notice check (s. 89 (2)) and the card's own limit sources.
  "legislation-act-2006": "2026-09-27",
  // The garnishee lines (walkthrough run 38525903567, SJ).
  "guide-after-judgment": "2026-09-27",
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
  /*
   * On a defence step (walkthrough run 38525903567, SD: a homeowner who wants
   * the contractor to pay for the repairs read about a Defendant's Claim, Form
   * 10A, but never its fee). Only if they make one: the label says so.
   */
  { id: "sc-defendants-claim-if", court: "small-claims", amount: 108, label: "Only if you also make a defendant's claim (Form 10A)", cite: sc("s. 1 (2), para. 3", "On the filing of a defendant’s claim, $108.") },
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

/*
 * The Family Court branch of the Superior Court charges under its own
 * regulation, O. Reg. 417/95 (saved 2026-10-14 through Vendor Sources; it was
 * missing, and the card said to ask the office: walkthrough ledger F3). Its
 * filing and listing fees are the same amounts as O. Reg. 293/92 s. 1.2, and
 * its s. 2 exempts the same parenting and support cases.
 */
const fcb = (pinpoint: string, quote: string): RuleCitation => cite("oreg-417-95-family-court-fees", pinpoint, quote);
export const FAMILY_COURT_BRANCH_FEE: PlainLine = {
  say: "In the Family Court branch of the Superior Court (O. Reg. 417/95), filing an application costs $214, an answer $171 ($214 if it asks for a divorce), and listing a case for hearing $445.",
  cite: fcb(
    "s. 1 (1), paras. 1-4",
    "1. On the filing of an application, $214. 2. On the filing of an answer, other than an answer referred to in paragraph 3, $171. 3. On the filing of an answer that includes a request for a divorce by a respondent, $214. 4. On the placing of an application on the list for hearing, $445.",
  ),
};
export const FAMILY_COURT_BRANCH_EXEMPTION: PlainLine = {
  say: "In the Family Court branch too, there is no fee to file an application or answer, or to list the case, in a case only about parenting or support under the Children's Law Reform Act or the Family Law Act (other than its property and home parts).",
  cite: fcb(
    "s. 2 (a)",
    "no fees are payable for the filing of an application, the filing of an answer or the placing of an application on the list for hearing in respect of, (a) proceedings under the Child, Youth and Family Services Act, 2017, the Children’s Law Reform Act, the Family Law Act (except Parts I and II)",
  ),
};

/** Lines shown with every family fee: which court charges nothing, and which cases pay no filing fee. */
export const FAMILY_FEE_NOTES: PlainLine[] = [
  {
    say: "In the Ontario Court of Justice there is no fee to file or list a family case.",
    cite: cite("ontario-fees-family", "Ontario Court of Justice fees", "There are no filing or listing fees in family proceedings in the Ontario Court of Justice."),
  },
  FAMILY_COURT_BRANCH_FEE,
  {
    say: "In the Superior Court of Justice (under O. Reg. 293/92), there is no fee to file an application or answer in a case only about parenting or support under the Children's Law Reform Act or the Family Law Act (other than its property and home parts).",
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

/** The no-fee rule for a case only about parenting or support (O. Reg. 293/92, s. 1.2 (2)). */
const FAMILY_EXEMPTION_NOTE = FAMILY_FEE_NOTES[2];
/** The federal $10 divorce fee. */
const FAMILY_DIVORCE_FEE_NOTE = FAMILY_FEE_NOTES[3];
FAMILY_FEE_NOTES.splice(3, 0, FAMILY_COURT_BRANCH_EXEMPTION);

/**
 * The family fee notes, in the order that fits the person's words (review
 * 2026-10-13: a parenting-only respondent read the $10 divorce fee among the
 * notes leading the fees, with the no-fee rule that applies to them third).
 * When the exemption leads, it comes first. The divorce note is left out when
 * their words name no divorce or marriage (and they name something else);
 * otherwise it is last, after the fees.
 */
export function familyFeeNotesFor(claims: FamilyClaims | null, exemptionLeads: boolean): PlainLine[] {
  const noDivorce = Boolean(claims && claims.known && !claims.divorce);
  const exemptions = [FAMILY_EXEMPTION_NOTE, FAMILY_COURT_BRANCH_EXEMPTION];
  const others = FAMILY_FEE_NOTES.filter((line) => !exemptions.includes(line) && line !== FAMILY_DIVORCE_FEE_NOTE);
  const ordered = exemptionLeads ? [...exemptions, ...others] : [...others, ...exemptions];
  return noDivorce ? ordered : [...ordered, FAMILY_DIVORCE_FEE_NOTE];
}

/*
 * PARENTING ONLY: THE NO-FEE RULE LEADS, THE AMOUNTS ARE FOLDED UNDER THEIR
 * CONDITION (walkthrough run 38525903567, FR). A father answering a custody
 * application read "no fee to file an answer in a case only about parenting
 * ... under the Children's Law Reform Act" beside "Filing an answer (Superior
 * Court of Justice): $171" and the Family Court branch's $214 / $171 / $445,
 * with nothing saying which applied. O. Reg. 293/92 s. 1.2 (2) (a) and
 * O. Reg. 417/95 s. 2 (a): "no fees are payable for the filing of an
 * application, the filing of an answer or the placing of an application on
 * the list for hearing in respect of, (a) proceedings under ... the
 * Children's Law Reform Act, the Family Law Act (except Parts I and II)". The
 * fees apply to a proceeding outside those Acts or under FLA Parts I and II
 * (net family property, the matrimonial home) -- a divorce is under the
 * Divorce Act. Support under FLA Part III is inside the exemption, so the
 * fold's condition names a divorce, property and the home, not support.
 */
export const FEES_IF_CLAIMED_LABEL = "Only if the case also asks for a divorce, or claims property or the matrimonial home";

/**
 * A family step that files papers but has no fee of its own (held-back
 * walkthrough, 2026-10-09: a parent served with a motion to change was promised
 * a fee and shown none). The schedule lists what is charged; this step's
 * papers are not on it.
 */
export const FAMILY_NO_STEP_FEE: PlainLine[] = [
  {
    say: "In the Superior Court of Justice, the family fee list (O. Reg. 293/92) charges for filing an application or an answer and for listing a case for hearing. It lists no fee for the papers at this step.",
    cite: sup(
      "s. 1.2 (1)",
      "1. On the filing of an application, $214. 2. On the filing of an answer, other than an answer referred to in paragraph 3, $171. 3. On the filing of an answer that includes a request for a divorce by a respondent, $214. 4. On the placing of an application on the list for hearing, $445.",
    ),
  },
  {
    say: "In the Ontario Court of Justice there is no fee to file or list a family case.",
    cite: cite("ontario-fees-family", "Ontario Court of Justice fees", "There are no filing or listing fees in family proceedings in the Ontario Court of Justice."),
  },
  {
    say: "The Family Court branch's fee list (O. Reg. 417/95) also charges only for filing an application or an answer and for listing a case for hearing, and lists no fee for the papers at this step.",
    cite: FAMILY_COURT_BRANCH_FEE.cite,
  },
];

/**
 * A Small Claims step whose papers are not on the fee list (a list of
 * witnesses, a settlement conference). The walkthrough's settlement-conference
 * case (2026-10-13) was told "This card doesn't list the fee for this step
 * yet" -- true, but the fee list itself answers it.
 */
export const SC_NO_STEP_FEE: PlainLine[] = [
  {
    say: "The Small Claims fee list charges for things like filing a claim, a defence or a motion, setting a trial date, and enforcing a judgment. It lists no fee for the papers at this step.",
    cite: cite(
      "oreg-332-16-small-claims-fees",
      "s. 1 (2)",
      "The following fees are payable to clerks of the Small Claims Court in respect of proceedings in that Court:",
    ),
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
  /*
   * Walkthrough run 38525903567 (senior-lawyer review): "file online through
   * the Justice Services Online portal" was backed only by "Use the Justice
   * Services Online portal for matters outside of Toronto.", a sentence under
   * the page's heading about paying fees. The sentence that says documents
   * are FILED online through these portals opens the same list; it is quoted
   * with each line now.
   */
  family: {
    toronto: {
      say: "In the Toronto region, file online through the Ontario Courts Public Portal.",
      cite: cite(
        "ontario-fees-family",
        "Paying family court fees online",
        "Starting October 14, 2025, there are different online portals to file court documents online depending on the region or level of court you are filing in. Use the Ontario Courts Public Portal for matters in the Toronto region.",
      ),
    },
    elsewhere: {
      say: "Outside Toronto, file online through the Justice Services Online portal.",
      cite: cite(
        "ontario-fees-family",
        "Paying family court fees online",
        "Starting October 14, 2025, there are different online portals to file court documents online depending on the region or level of court you are filing in. ... Use the Justice Services Online portal for matters outside of Toronto.",
      ),
    },
    more: [],
  },
};

// ---------------------------------------------------------------- a deadline too close to file online

/*
 * Walkthrough run 38525903567 (SD, senior-lawyer review 2026-10-14): on
 * Wednesday 14 October a defendant whose counted last day was Monday 19
 * October was told "Outside Toronto, file online", beside the page's own
 * quote that a deadline "3 business days or less away" cannot be filed
 * online. The two lines were never joined to the counted date.
 *
 * HOW "AWAY" IS COUNTED. The saved guide's own example (outside Toronto):
 * "if your court date is on Tuesday, February 9 , you cannot submit documents
 * online after Wednesday, February 3". From Wednesday 3 February the business
 * days up to and including Tuesday 9 February are Thu 4, Fri 5, Mon 8, Tue 9:
 * four, so filing online is still open; from Thursday 4 they are three, and it
 * is closed. So a deadline is N business days away when N business days fall
 * after today, up to and including the deadline itself. test:next-step-practical
 * checks this reading against the guide's example, worked from the calendar.
 * (The Toronto paragraph's example, "after Monday, February 1", does not fit
 * any count of business days and is not used.)
 *
 * WHICH DAYS ARE BUSINESS DAYS. Neither guide defines the term. A court office
 * is closed on a Saturday, a Sunday, every holiday either calendar names
 * (holidays.ts: r. 1.02 adds Saturday and Civic Holiday, the Legislation Act
 * substitutes Christmas differently -- the two-calendar trap in
 * ACCURACY_ENGINE.md), and the days the ministry announces closures
 * (courtServiceNotices.ts: 30 September, filed online "on the next business
 * day"). A day any of those calls closed is not a business day. That makes
 * the count smaller, never larger, so the card can only warn early, never late.
 */
export function isCourtBusinessDay(date: string, strict = true): boolean {
  const dow = dayOfWeek(date);
  if (dow === 0 || dow === 6) return false;
  // Strict: a weekday EITHER calendar calls a holiday is not a business day.
  // Not strict: every weekday but an announced closure is (to see whether a
  // weekday holiday changed the count; re-review of 6a0fce6).
  if (strict && (holidayFor(date, "small-claims-rules") || holidayFor(date, "legislation-act"))) return false;
  return !COURT_SERVICE_NOTICES.some((notice) => notice.closedOn === date);
}

/** Business days after `today`, up to and including `deadline` (0 when the deadline is today or has passed). */
export function businessDaysAway(today: string, deadline: string, strict = true): number {
  let count = 0;
  for (let day = addDays(today, 1), guard = 0; day <= deadline && guard < 4000; day = addDays(day, 1), guard += 1) {
    if (isCourtBusinessDay(day, strict)) count += 1;
  }
  return count;
}

/**
 * The online portals refuse a deadline 3 business days away or less (both
 * saved guides). A deadline that has passed is not one the guides speak of
 * (review of bee9daf): it is not "too close", and the card keeps its portal
 * lines beside "That date has already passed".
 */
export function tooCloseToFileOnline(today: string, deadline: string): boolean {
  return deadline >= today && businessDaysAway(today, deadline) <= 3;
}

/**
 * Too close only because a weekday holiday was left out of the count (Good
 * Friday, Easter Monday, Civic Holiday...). Neither guide says whether such a
 * day is a business day, so the card says "may be" (re-review of 6a0fce6:
 * 24 to 31 March 2027, over Easter, was stated as certain).
 */
export function tooCloseOnlyByHoliday(today: string, deadline: string): boolean {
  return tooCloseToFileOnline(today, deadline) && businessDaysAway(today, deadline, false) > 3;
}

const SC_TOO_CLOSE_CITE = cite(
  "ontario-file-small-claims-online",
  "Documents you cannot file online",
  "if you need to meet a deadline established by legislation or other court rules, court practice direction or a court order that is 3 business days or less away ... If you cannot submit your documents online, you may file them: in person at the courthouse by mail by email",
);
const CIVIL_TOO_CLOSE_CITE = cite(
  "ontario-file-civil-claim-online",
  "Documents you can file online",
  "if you need to meet a deadline established by legislation or other court rules, court practice direction or a court order that is 3 business days or fewer away",
);

/**
 * The filing line for a deadline too close to file online, in place of the
 * portal lines. Small Claims lists only the ways its guide names (in person,
 * mail, email); the civil guide names none, so the civil line says to ask
 * the court office. Family's saved pages state no business-day limit: null.
 */
export function tooCloseFilingLine(court: PracticalCourt, today: string, deadline: string, divisionalOnly = false): PlainLine | null {
  if (court === "family" || !tooCloseToFileOnline(today, deadline)) return null;
  const fewer = court === "civil" ? "fewer" : "less";
  const last = `${divisionalOnly && court === "civil" ? "If your appeal is in the Divisional Court, your" : "Your"} last day, ${formatLongDate(deadline)},`;
  // Hedged when the answer turns on a weekday holiday: "If so, file it ... instead" (third review).
  if (tooCloseOnlyByHoliday(today, deadline)) {
    const when = `${last} may be 3 business days away or ${fewer}, depending on whether a holiday in between counts as a business day, and the portal cannot be used for a deadline that close.`;
    return court === "small-claims"
      ? { say: `${when} If so, file it in person at the courthouse, by mail or by email instead.`, cite: SC_TOO_CLOSE_CITE }
      : { say: `${when} If so, file it another way instead: the court office can tell you how.`, cite: CIVIL_TOO_CLOSE_CITE };
  }
  const when = `${last} is 3 business days away or ${fewer}, so you cannot file online for it`;
  return court === "small-claims"
    ? { say: `${when}. File it in person at the courthouse, by mail or by email instead.`, cite: SC_TOO_CLOSE_CITE }
    : { say: `${when}. The court office can tell you how to file it instead.`, cite: CIVIL_TOO_CLOSE_CITE };
}

/*
 * Serving by mail near the deadline (same review). r. 8.07 (2): mail counts
 * only on the fifth day after mailing; r. 8.07.1 (2): a courier, the fifth day
 * after it confirms delivery. A defence mailed four days before the last day
 * is served after it. The card says so with the dates, and names the ways the
 * same rule (r. 8.01 (14)) allows that count sooner: email (r. 8.08 (4)) and in
 * person (r. 8.02 (a)). What the rules provide, never which to choose.
 */
export const SC_MAIL_RULE = scrCite(
  "r. 8.07 (2)",
  "Service of a document by mail is deemed to be effective on the fifth day following the date of mailing.",
);
export const SC_COURIER_RULE = scrCite(
  "r. 8.07.1 (2)",
  "Service of a document sent by courier is deemed to be effective on the fifth day following the date on which the courier verifies to the sender that the document was delivered.",
);
export const SC_SOONER_WAYS: PlainLine[] = [
  {
    say: "By email, service counts on the day the email is sent, or the next day if it is sent between 4 p.m. and midnight. It goes to the last email address the other side or their representative gave.",
    cite: scrCite(
      "r. 8.08 (1) (a), (4)",
      "the last email address provided by the person to be served or the person's representative or, if no email address is provided, to the person's or representative's last known email address ... Service of a document by email is deemed to be effective, (a) on the day the email is sent; or (b) if the email is sent between 4 p.m. and midnight, on the following day.",
    ),
  },
  {
    say: "In person, you leave a copy with the person, if they are an individual.",
    cite: scrCite("r. 8.02 (a)", "on an individual, other than a person under disability, by leaving a copy of the document with him or her"),
  },
  {
    say: "For a corporation, you leave a copy with an officer, a director or another person authorized to act for it, or with the person in charge at one of its places of business.",
    cite: scrCite(
      "r. 8.02 (c)",
      "on any other corporation, by leaving a copy of the document with, (i) an officer, a director or another person authorized to act on behalf of the corporation, or (ii) a person at any place of business of the corporation who appears to be in control or management of the place of business",
    ),
  },
];
function scrCite(pinpoint: string, quote: string): RuleCitation {
  return cite("oreg-258-98-small-claims-rules", pinpoint, quote);
}

/*
 * WHICH COUNTED DAYS TIME THESE LINES (review of bee9daf). The first cut took
 * the card's earliest counted day, whatever it was: the court's 90-day target
 * for a settlement conference became "your last day ... cannot file online",
 * and a defendant's claim's 20 days to be ISSUED got mail timing, though
 * issuing is not serving. Only the deadlines listed here, each a time limit
 * the PERSON must meet by serving or filing a document, time them:
 *   files -- the deadline is met by filing with the court (the too-close line);
 *   serves -- it is met by serving, in a way r. 8.01 (14) lets go by mail
 *            (the mail timing). A claim (r. 8.01 (1)) and a summons
 *            (r. 8.01 (7)) are not mailed, so they are never "serves" here.
 * Never a "court holds" period, a leave threshold, an issue-only limit, the
 * other side's time, or a limit met by asking for something.
 * test:next-step-practical checks every listed id is a reader's deadline in
 * the stage map whose own words say serve, file, deliver, make a motion or
 * request -- and that EVERY Small Claims and civil deadline is either listed
 * or in NOT_TIMED with its reason, so a new deadline fails until classified.
 *
 * Re-review of 6a0fce6: a motion to be made, and a request filed with the
 * clerk, are the person's own filing deadlines -- the online guides' limit
 * covers "a deadline established by legislation or other court rules". So the
 * motion to set aside a judgment after a missed trial (r. 17.01 (5) (a)), the
 * motion for a new trial (r. 17.04 (1)) and the "request a trial date, or the
 * clerk will dismiss" limits (r. 11.1.01 (1)) time the filing line. Civil
 * carries the same limit ("3 business days or fewer away", the saved civil
 * guide), so its filing deadlines are listed too; family's saved pages state
 * no such limit, and family deadlines time nothing.
 */
/** Civil (Rules of Civil Procedure): "deliver" is "serve and file with proof of service" (r. 1.03 (1)); a motion to be made is filed. Met by filing; never mail-timed (that is Small Claims only). */
const CIVIL_FILES: string[] = [
  "deadline:civil:associate-judge-appeal-record-7-days",
  "deadline:civil:associate-judge-appeal-respondent-4-days",
  "deadline:civil:basic-limitation",
  "deadline:civil:basic-limitation-claim-drafted",
  "deadline:civil:basic-limitation-may-have-passed",
  "deadline:civil:basic-limitation-notice-stage",
  "deadline:civil:certificate-of-readiness-30-days",
  "deadline:civil:confirmation-of-motion-5-days",
  "deadline:civil:counterclaim-election-30-days",
  "deadline:civil:counterclaim-election-after-discontinuance-30-days",
  "deadline:civil:defence",
  "deadline:civil:lien-defence-20-days",
  "deadline:civil:defence-to-counterclaim-20-days",
  "deadline:civil:defence-to-counterclaim-new-party",
  "deadline:civil:defence-to-crossclaim-20-days",
  "deadline:civil:discontinuance-costs-30-days",
  "deadline:civil:discontinuance-costs-30-days:counterclaim-pending",
  "deadline:civil:discontinue-before-pleadings-close",
  "deadline:civil:dismissal-costs-30-days",
  "deadline:civil:dismissal-costs-30-days:plaintiff",
  "deadline:civil:file-notice-of-appeal-10-days",
  "deadline:civil:five-year-dismissal-awaiting-defence",
  "deadline:civil:five-year-dismissal-claim-issued",
  "deadline:civil:five-year-dismissal-defence-expired",
  "deadline:civil:five-year-dismissal-defence-received",
  "deadline:civil:five-year-dismissal-discovery",
  "deadline:civil:five-year-dismissal-noted",
  "deadline:civil:five-year-dismissal-ready-to-set-down",
  "deadline:civil:five-year-dismissal-served-with-counterclaim",
  "deadline:civil:five-year-dismissal-service-failed",
  "deadline:civil:five-year-dismissal-simplified",
  "deadline:civil:injunction-serve-7-days",
  "deadline:civil:jury-notice:defence-delivered",
  "deadline:civil:jury-notice:defence-received",
  "deadline:civil:jury-notice:served-with-counterclaim",
  "deadline:civil:late-defence-before-noting",
  "deadline:civil:leave-motion-response-25-days",
  "deadline:civil:leave-to-appeal-interlocutory-15-days",
  "deadline:civil:libel-action-three-months",
  "deadline:civil:motion-in-writing-response-10-days",
  "deadline:civil:motion-moving-party-7-days",
  "deadline:civil:motion-responding-factum-4-days",
  "deadline:civil:motion-responding-record-4-days",
  "deadline:civil:note-default-30-days",
  "deadline:civil:perfect-appeal-no-transcript-30-days",
  "deadline:civil:perfect-appeal-with-transcript-60-days",
  "deadline:civil:pretrial-brief-5-days",
  "deadline:civil:reply-10-days",
  "deadline:civil:reply-to-defence-to-counterclaim-10-days",
  "deadline:civil:reply-to-third-party-defence-10-days",
  "deadline:civil:respondent-certificate-15-days",
  "deadline:civil:respondent-factum-60-days",
  "deadline:civil:responding-confirmation-4-days",
  "deadline:civil:restore-trial-list-30-days",
  "deadline:civil:set-aside-default-judgment",
  "deadline:civil:set-aside-dismissal-forthwith",
  "deadline:civil:set-aside-noting",
  "deadline:civil:set-aside-order-missed-motion",
  "deadline:civil:set-down-six-months-after-pleadings",
  "deadline:civil:set-down-six-months-after-pleadings:defence-received",
  "deadline:civil:set-down-six-months-after-pleadings:discovery",
  "deadline:civil:set-down-six-months-after-pleadings:served-with-counterclaim",
  "deadline:civil:simplified-set-down-180-days",
  "deadline:civil:simplified-set-down-180-days:both",
  "deadline:civil:simplified-set-down-180-days:defence-received",
  "deadline:civil:simplified-set-down-180-days:served-with-counterclaim",
  "deadline:civil:simplified-trial-record-10-days",
  "deadline:civil:special-damages-update-10-days",
  "deadline:civil:statement-of-claim-after-notice-of-action",
  "deadline:civil:strike-serve-7-days",
  "deadline:civil:struck-off-two-year-dismissal",
  "deadline:civil:summary-judgment-moving-7-days",
  "deadline:civil:summary-judgment-responding-4-days",
  "deadline:civil:summary-judgment-responding-record-4-days",
  "deadline:civil:third-party-defence",
  "deadline:civil:transcript-ordered-30-days",
];
/** Civil deadlines that time nothing, each with why. */
const CIVIL_NOT_TIMED: Record<string, string> = {
  "deadline:civil:schedule-pretrial-180-days": "met by booking a date with the registrar, not by filing a document",
  "deadline:civil:adverse-party-witness-10-days": "met by serving a summons to witness on the person, not by filing",
  "deadline:civil:appeal-associate-judge-7-days": "met by serving a document on a party; nothing is filed with the court by this deadline",
  "deadline:civil:business-records-notice-7-days": "met by giving notice to a party (or the mediator), not by filing with the court",
  "deadline:civil:cross-appeal-15-days": "met by serving a document on a party; nothing is filed with the court by this deadline",
  "deadline:civil:discovery-plan": "met by agreeing, meeting or holding a session with the other parties, not by a document filed with the court",
  "deadline:civil:discovery-plan:defence-delivered": "met by agreeing, meeting or holding a session with the other parties, not by a document filed with the court",
  "deadline:civil:discovery-plan:defence-received": "met by agreeing, meeting or holding a session with the other parties, not by a document filed with the court",
  "deadline:civil:discovery-plan:served-with-counterclaim": "met by agreeing, meeting or holding a session with the other parties, not by a document filed with the court",
  "deadline:civil:discovery-plan:simplified": "met by agreeing, meeting or holding a session with the other parties, not by a document filed with the court",
  "deadline:civil:expert-report-90-days": "met by serving a document on a party; nothing is filed with the court by this deadline",
  "deadline:civil:expert-report-schedule-60-days": "met by agreeing, meeting or holding a session with the other parties, not by a document filed with the court",
  "deadline:civil:mediation-180-days": "met by agreeing, meeting or holding a session with the other parties, not by a document filed with the court",
  "deadline:civil:mediation-180-days:defence-delivered": "met by agreeing, meeting or holding a session with the other parties, not by a document filed with the court",
  "deadline:civil:mediation-180-days:defence-received": "met by agreeing, meeting or holding a session with the other parties, not by a document filed with the court",
  "deadline:civil:mediation-180-days:discovery": "met by agreeing, meeting or holding a session with the other parties, not by a document filed with the court",
  "deadline:civil:mediation-180-days:served-with-counterclaim": "met by agreeing, meeting or holding a session with the other parties, not by a document filed with the court",
  "deadline:civil:mediation-180-days:simplified": "met by agreeing, meeting or holding a session with the other parties, not by a document filed with the court",
  "deadline:civil:mediation-statement-7-days": "met by giving notice to a party (or the mediator), not by filing with the court",
  "deadline:civil:notice-of-appeal-30-days": "met by serving a document on a party; nothing is filed with the court by this deadline",
  "deadline:civil:notice-of-appeal-30-days:judgment-being-enforced": "met by serving a document on a party; nothing is filed with the court by this deadline",
  "deadline:civil:notice-of-appeal-30-days:missed-trial": "met by serving a document on a party; nothing is filed with the court by this deadline",
  "deadline:civil:offer-to-settle-7-days": "met by serving a document on a party; nothing is filed with the court by this deadline",
  "deadline:civil:practitioner-report-notice-10-days": "met by giving notice to a party (or the mediator), not by filing with the court",
  "deadline:civil:renew-writ-six-years": "met at the sheriff's enforcement office, not by filing in the court file",
  "deadline:civil:response-to-request-to-admit-20-days": "met by serving a document on a party; nothing is filed with the court by this deadline",
  "deadline:civil:serve-claim-six-months": "met by serving a document on a party; nothing is filed with the court by this deadline",
  "deadline:civil:serve-claim-six-months:failed-service": "met by serving a document on a party; nothing is filed with the court by this deadline",
  "deadline:civil:serve-third-party-claim-30-days": "met by serving a document on a party; nothing is filed with the court by this deadline",
  "deadline:civil:simplified-affidavit-of-documents": "met by serving a document on a party; nothing is filed with the court by this deadline",
  "deadline:civil:simplified-affidavit-of-documents:defence-delivered": "met by serving a document on a party; nothing is filed with the court by this deadline",
  "deadline:civil:simplified-affidavit-of-documents:defence-received": "met by serving a document on a party; nothing is filed with the court by this deadline",
  "deadline:civil:simplified-affidavit-of-documents:served-with-counterclaim": "met by serving a document on a party; nothing is filed with the court by this deadline",
  "deadline:civil:simplified-cross-examine-notice-10-days": "met by giving notice to a party (or the mediator), not by filing with the court",
  "deadline:civil:simplified-settlement-discussion": "met by agreeing, meeting or holding a session with the other parties, not by a document filed with the court",
  "deadline:civil:simplified-settlement-discussion:defence-delivered": "met by agreeing, meeting or holding a session with the other parties, not by a document filed with the court",
  "deadline:civil:simplified-settlement-discussion:defence-received": "met by agreeing, meeting or holding a session with the other parties, not by a document filed with the court",
  "deadline:civil:simplified-settlement-discussion:served-with-counterclaim": "met by agreeing, meeting or holding a session with the other parties, not by a document filed with the court",
  "deadline:civil:simplified-trial-management-plan-30-days": "met by agreeing, meeting or holding a session with the other parties, not by a document filed with the court",
  "deadline:civil:supplementary-expert-report-45-days": "met by serving a document on a party; nothing is filed with the court by this deadline",
  "deadline:civil:undertakings-60-days": "met by answering the undertaking to the other party, not by filing",
  "deadline:civil:undertakings-60-days:simplified": "met by answering the undertaking to the other party, not by filing",
  "deadline:civil:crown-notice-60-days": "a notice given before suing, outside the court; nothing is filed with the court",
  "deadline:civil:libel-notice-six-weeks": "a notice given before suing, outside the court; nothing is filed with the court",
  "deadline:civil:municipal-notice-10-days": "a notice given before suing, outside the court; nothing is filed with the court",
  "deadline:civil:occupier-notice-60-days": "a notice given before suing, outside the court; nothing is filed with the court",
  "deadline:civil:toronto-notice-10-days": "a notice given before suing, outside the court; nothing is filed with the court",
  "deadline:civil:defence:plaintiff-view": "binds the other side, not the person",
  "deadline:civil:simplified-set-down-180-days:defendant-view": "binds the other side, not the person",
};

/** Small Claims deadlines that time nothing, each with why. */
const SC_NOT_TIMED: Record<string, string> = {
  "deadline:municipal-notice-10-days": "a notice given before suing, outside the court; nothing is filed with the court",
  "deadline:toronto-notice-10-days": "a notice given before suing, outside the court; nothing is filed with the court",
  "deadline:occupier-notice-60-days": "a notice given before suing, outside the court; nothing is filed with the court",
  "deadline:vehicle-injury-notice-120-days": "a notice given before suing, outside the court; nothing is filed with the court",
  "deadline:serve-claim-six-months": "a claim is served personally or by an alternative (r. 8.01 (1)), never by mail, and nothing is filed by this deadline",
  "deadline:serve-claim-six-months:failed-service": "a claim is served personally or by an alternative (r. 8.01 (1)), never by mail, and nothing is filed by this deadline",
  "deadline:defence-20-days:plaintiff-view": "binds the other side, not the person",
  "deadline:settlement-conference-90-days": "the court's own timing for the settlement conference, not the person's",
  "deadline:settlement-conference-90-days:defendant": "the court's own timing for the settlement conference, not the person's",
  "deadline:sc-enforce-six-years-leave": "a leave threshold, not a time to serve or file",
  "deadline:sc-enforce-six-years-leave:default-judgment": "a leave threshold, not a time to serve or file",
  "deadline:trial-summons-10-days": "a summons is served personally (r. 8.01 (7)) and is not filed",
  "deadline:trial-summons-10-days:defendant": "a summons is served personally (r. 8.01 (7)) and is not filed",
  "deadline:set-aside-as-soon-as-possible": "the rule sets no fixed period, so no day is ever counted",
  "deadline:appeal-notice": "an appeal is started in the Divisional Court under the Rules of Civil Procedure (r. 61.04), not filed in the Small Claims court file these lines describe",
};

/** Every Small Claims and civil deadline that times nothing, with why (the completeness check reads this). */
export const NOT_TIMED: Record<string, string> = { ...SC_NOT_TIMED, ...CIVIL_NOT_TIMED };

const DISMISSAL_REQUESTS = [
  "deadline:dismissal-for-delay-two-years-claim-issued-not-served",
  "deadline:dismissal-for-delay-two-years-service-attempted-failed",
  "deadline:dismissal-for-delay-two-years-six-month-service-window-expired",
  "deadline:dismissal-for-delay-two-years-served-awaiting-defence",
  "deadline:dismissal-for-delay-two-years-defence-period-expired-no-defence",
  "deadline:dismissal-for-delay-two-years-noted",
  "deadline:dismissal-for-delay-two-years-assessment-of-damages-needed",
  "deadline:dismissal-for-delay-two-years-defence-filed",
  "deadline:dismissal-for-delay-two-years-awaiting-settlement-conference",
  "deadline:dismissal-for-delay-two-years",
];

/*
 * Third review of the lists (96057cc):
 *   - a claim the court ISSUES is filed to be issued, and online review takes
 *     up to 3 business days, so the defendant's claim (r. 10.01 (2) (a)) and a
 *     third party claim (r. 29.02 (1)) time the filing line -- never the mail
 *     timing (issuing is not serving);
 *   - after a lawyer is removed, the client's Form 15B or 15C is served AND
 *     filed with proof of service (r. 15.04 (16) refers to r. 15.03 (2), (3):
 *     "serving on every other party and filing, with proof of service");
 *   - responding to an amended pleading (r. 26.05 (1)) is delivering a
 *     pleading, which is filing.
 */
const ALSO_FILES = [
  "deadline:issue-defendants-claim-20-days",
  "deadline:issue-defendants-claim-20-days:defence-filed",
  "deadline:civil:third-party-claim-10-days",
  "deadline:civil:third-party-claim-10-days:defence-delivered",
  "deadline:civil:after-lawyer-removed-30-days",
  "deadline:civil:respond-to-amended-pleading",
];

/*
 * Appeals under r. 61 go to the Court of Appeal OR the Divisional Court, and
 * the saved civil guide covers "civil and Divisional Court cases" only. These
 * time the filing line only as "if your appeal is in the Divisional Court",
 * with the portal lines kept. (The r. 61.03.1 leave motion and the r. 62.01
 * associate-judge appeal are in the Divisional Court or the Superior Court
 * and stay as they are.)
 */
export const DIVISIONAL_COURT_ONLY: ReadonlySet<string> = new Set([
  "deadline:civil:file-notice-of-appeal-10-days",
  "deadline:civil:perfect-appeal-no-transcript-30-days",
  "deadline:civil:perfect-appeal-with-transcript-60-days",
  "deadline:civil:respondent-certificate-15-days",
  "deadline:civil:respondent-factum-60-days",
  "deadline:civil:transcript-ordered-30-days",
]);

export const PERSON_SERVE_OR_FILE: Record<string, { files: boolean; serves: boolean }> = {
  ...Object.fromEntries(CIVIL_FILES.map((id) => [id, { files: true, serves: false }])),
  ...Object.fromEntries(ALSO_FILES.map((id) => [id, { files: true, serves: false }])),
  ...Object.fromEntries(DISMISSAL_REQUESTS.map((id) => [id, { files: true, serves: false }])),
  "deadline:set-aside-after-missed-trial": { files: true, serves: false },
  "deadline:new-trial-motion": { files: true, serves: false },
  "deadline:basic-limitation": { files: true, serves: false },
  "deadline:basic-limitation-claim-drafted": { files: true, serves: false },
  "deadline:defence-20-days": { files: true, serves: true },
  "deadline:defence-to-defendants-claim-20-days": { files: true, serves: true },
  "deadline:settlement-conference-disclosure-14-days": { files: true, serves: true },
  "deadline:settlement-conference-disclosure-14-days:defendant": { files: true, serves: true },
  "deadline:trial-evidence-30-days": { files: false, serves: true },
  "deadline:trial-evidence-30-days:defendant": { files: false, serves: true },
  "deadline:sc-motion-serve-7-days": { files: false, serves: true },
  "deadline:sc-motion-file-3-days": { files: true, serves: false },
  "deadline:sc-motion-response-2-days": { files: true, serves: true },
  "deadline:sc-defence-with-proposal-20-days": { files: true, serves: true },
  "deadline:sc-dispute-proposal-20-days": { files: true, serves: true },
  "deadline:sc-offer-7-days-before-trial": { files: false, serves: true },
  "deadline:sc-amend-30-days-before-trial": { files: true, serves: true },
  "deadline:sc-strike-motion-serve-7-days": { files: false, serves: true },
  "deadline:sc-strike-motion-file-3-days": { files: true, serves: false },
  "deadline:sc-dismissal-submission-20-days": { files: true, serves: false },
};

/**
 * The earliest counted day among the person's own deadlines met by filing
 * (`files`) or by serving (`serves`); "" when none is counted.
 */
export function personDeadlineOf(items: readonly { id?: string; date: string }[], kind: "files" | "serves"): string {
  return items
    .filter((item) => item.id && PERSON_SERVE_OR_FILE[item.id]?.[kind] && /^\d{4}-\d{2}-\d{2}$/.test(item.date))
    .map((item) => item.date)
    .sort()[0] ?? "";
}

/** Whether the person's earliest filing deadline is one the guide covers only in the Divisional Court (any of them, on a tie). */
export function filingDeadlineDivisionalOnly(items: readonly { id?: string; date: string }[]): boolean {
  const date = personDeadlineOf(items, "files");
  return Boolean(date) && items.some((item) => item.date === date && item.id && PERSON_SERVE_OR_FILE[item.id]?.files && DIVISIONAL_COURT_ONLY.has(item.id));
}

/**
 * The mail warning for a Small Claims step served the ordinary way, with a
 * counted last day still to come; empty otherwise. The first line gives the
 * dates: mailed today, the fifth day after; the last day it can be mailed to
 * count in time (five days before the last day).
 */
export function mailTimingLines(today: string, deadline: string): PlainLine[] {
  if (deadline < today) return [];
  const countsOn = addDays(today, 5);
  const lastMailing = addDays(deadline, -5);
  const late = countsOn > deadline;
  const say = late
    ? `Mail is too slow for this: service by mail counts only on the fifth day after mailing. Mailed today, ${formatLongDate(today)}, it would count on ${formatLongDate(countsOn)}, after your last day, ${formatLongDate(deadline)}.`
    : `Service by mail counts only on the fifth day after mailing. To count by your last day, ${formatLongDate(deadline)}, it must be mailed no later than ${lastMailing === today ? "today, " : ""}${formatLongDate(lastMailing)}.`;
  return [
    { say, cite: SC_MAIL_RULE },
    { say: "A courier is the same: service counts on the fifth day after the courier confirms delivery.", cite: SC_COURIER_RULE },
    ...SC_SOONER_WAYS,
  ];
}

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

/*
 * Words that put a municipality in the case (review 2026-10-13: "I'm suing
 * Brampton for flooding my basement" named no keyword and lost the line on
 * serving a municipality). Public-way words, the word for a municipal body,
 * or suing / a claim against a named Ontario place -- the court-location
 * cities plus the larger municipalities that have no courthouse.
 */
const PLACE_NAMES = Array.from(
  new Set([
    ...COURT_LOCATIONS.flatMap((location) => location.address.map((line) => /^([^,]+),\s*Ontario\b/i.exec(line)?.[1]?.trim() ?? "")),
    ...OCJ_COURTHOUSES.map((courthouse) => courthouse.city.replace(/\s*\(.*$/, "").trim()),
    "Mississauga", "Markham", "Vaughan", "Richmond Hill", "Oakville", "Burlington", "Ajax", "Pickering", "Whitby", "Clarington",
    "Cambridge", "Waterloo", "Caledon", "Halton Hills", "Niagara Falls", "Thunder Bay", "Greater Sudbury", "Kawartha Lakes",
  ]),
)
  .filter((name) => /^[A-Za-z][A-Za-z .'’-]+$/.test(name))
  .map((name) => name.replace(/[.]/g, "\\.").replace(/\s+/g, "\\s+"));
export const MUNICIPAL_PARTY = new RegExp(
  "\\b(?:city|town|township|municipal\\w*|county|region|village|sidewalk|road|street|highway|bridge|pothole|sewer|water main)\\b" +
    `|\\b(?:sue|sued|suing|against)\\s+(?:the\\s+)?(?:(?:city|town|township|region|county|municipality)\\s+of\\s+)?(?:${PLACE_NAMES.join("|")})\\b`,
  "i",
);

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
      // How, in practice (held-back walkthrough, 2026-10-09: "stamped copies
      // for you to serve" never said how). Each from rule 8.02 itself.
      {
        say: "To serve a person personally, leave a copy with them. A person under disability, such as a minor, is served another way.",
        cite: scr("r. 8.02 (a)", "on an individual, other than a person under disability, by leaving a copy of the document with him or her"),
      },
      // Review 2026-10-13: the Small Claims rule for serving a municipality.
      {
        say: "To serve a city or town (a municipal corporation), hand a copy to the mayor, chair, warden or reeve, to the clerk or deputy clerk, or to a lawyer for the municipality.",
        cite: scr(
          "r. 8.02 (b)",
          "on a municipal corporation, by leaving a copy of the document with the chair, mayor, warden or reeve of the municipality, with the clerk or deputy clerk of the municipality or with a lawyer for the municipality",
        ),
        about: MUNICIPAL_PARTY,
      },
      {
        say: "To serve a business that is a corporation, hand a copy to an officer or director, or to the person in charge at one of its places of business.",
        cite: scr(
          "r. 8.02 (c)",
          "on any other corporation, by leaving a copy of the document with, (i) an officer, a director or another person authorized to act on behalf of the corporation, or (ii) a person at any place of business of the corporation who appears to be in control or management of the place of business",
        ),
      },
      {
        say: "Serve the claim within six months after the court issues it. The court can give more time.",
        cite: scr("r. 8.01 (2)", "A claim shall be served within six months after the date it is issued, but the court may extend the time for service, before or after the six months has elapsed."),
      },
      {
        say: "If the other side is outside Ontario, the court can add the reasonable cost of serving them there to the costs it awards.",
        cite: scr("r. 8.05", "If the defendant is outside Ontario, the court may award as costs of the action the costs reasonably incurred in effecting service of the claim on the defendant there."),
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
      {
        say: "By mail, send it to the other side's last known address (or their representative's). It counts as served on the fifth day after you mail it.",
        cite: scr(
          "r. 8.07 (1), (2)",
          "If a document is to be served by mail under these rules, it shall be sent, by regular lettermail or registered mail, to the last address of the person or of the person's representative that is ... known to the sender, if the document is to be served by any other person. ... Service of a document by mail is deemed to be effective on the fifth day following the date of mailing.",
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
    // Walkthrough 2026-10-13 (unpaid judgment, debtor works at a dealership):
    // the card said how to serve the debtor, not the employer (the garnishee),
    // nor which comes first.
    garnishment: [
      {
        say: "You serve the notice of garnishment on the garnishee (the person who owes the debtor money, such as an employer) with a garnishee's statement (Form 20F), by mail, courier or in person.",
        cite: scr(
          "r. 8.01 (8) (b)",
          "A notice of garnishment (Form 20E) shall be served by the creditor, ... (b) together with a garnishee's statement (Form 20F), on the garnishee, by mail, by courier, personally as provided in rule 8.02 or by an alternative to personal service as provided in rule 8.03",
        ),
      },
      {
        say: "You also serve it on the debtor, with your sworn affidavit for enforcement request (Form 20P), by mail, courier or in person.",
        cite: scr(
          "r. 8.01 (8) (a)",
          "A notice of garnishment (Form 20E) shall be served by the creditor, (a) together with a sworn affidavit for enforcement request (Form 20P), on the debtor, by mail, by courier, personally as provided in rule 8.02 or by an alternative to personal service as provided in rule 8.03",
        ),
      },
      {
        say: "Serve the debtor within five days after you serve the garnishee.",
        cite: scr("r. 20.08 (6.1)", "The creditor shall serve the notice of garnishment on the debtor within five days of serving it on the garnishee."),
      },
      {
        say: "If the garnishee is a bank or other financial institution, serve it at the branch where the debt is payable.",
        cite: scr(
          "r. 20.08 (6.2)",
          "If the garnishee is a financial institution, the notice of garnishment and all further notices required to be served under this rule shall be served at the branch at which the debt is payable.",
        ),
      },
      {
        say: "Once served, the garnishee must pay the clerk what it owes the debtor, up to the amount in the notice, within 10 days after service or 10 days after the debt becomes payable, whichever is later.",
        cite: scr(
          "r. 20.08 (7)",
          "The garnishee is liable to pay to the clerk any debt of the garnishee to the debtor, up to the amount shown in the notice of garnishment, within 10 days after service of the notice on the garnishee or 10 days after the debt becomes payable, whichever is later.",
        ),
      },
      // Review 2026-10-13: wages have a limit, set by the Wages Act.
      {
        say: "From wages, what the garnishee pays in is limited to the part of the debtor's wages that section 7 of the Wages Act allows to be seized or garnished.",
        cite: scr(
          "r. 20.08 (9)",
          "the amounts paid into court shall not exceed the portion of the debtor's wages that are subject to seizure or garnishment under section 7 of the Wages Act.",
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
      {
        say: "To serve a person personally, leave a copy with them. A person under disability, such as a minor, is served another way.",
        cite: rcp("r. 16.02 (1) (a)", "on an individual, other than a person under disability, by leaving a copy of the document with the individual"),
      },
      // Walkthrough 2026-10-13 (Toronto sidewalk fall, suing the City): the
      // card said how to serve a person and a company, not a city.
      {
        say: "To serve a city or town (a municipal corporation), hand a copy to the mayor, chair, warden or reeve, to the clerk or deputy clerk, or to a lawyer for the municipality.",
        cite: rcp(
          "r. 16.02 (1) (b)",
          "on a municipal corporation, by leaving a copy of the document with the chair, mayor, warden or reeve of the municipality, with the clerk or deputy clerk of the municipality or with a lawyer for the municipality",
        ),
        about: MUNICIPAL_PARTY,
      },
      {
        say: "To serve a corporation, such as an employer, hand a copy to an officer, director or agent, or to the person in charge at one of its places of business.",
        cite: rcp(
          "r. 16.02 (1) (c)",
          "on any other corporation, by leaving a copy of the document with an officer, director or agent of the corporation, or with a person at any place of business of the corporation who appears to be in control or management of the place of business",
        ),
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
      {
        say: "To serve their lawyer: mail it or send it by courier to the lawyer's office, leave it with someone at that office, or email it to the email address the lawyer gave for service.",
        cite: rcp(
          "r. 16.05 (1)",
          "Service of a document on the lawyer of record of a party may be made, (a) by mailing a copy to the lawyer's office; (b) by leaving a copy with a lawyer or employee in the lawyer's office; ... (e) by sending a copy to the lawyer's office by courier; or (f) by emailing a copy to the last email address for service provided by the lawyer",
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

// ---------------------------------------------------------------- an employer named only vaguely

/*
 * Walkthrough run 38525903567 (SJ, senior-lawyer review): "he works at a car
 * dealership in kanata i think" -- the card led with the six-year leave limit
 * and never used it. A notice of garnishment is directed to a NAMED garnishee,
 * so an employer known only as "a car dealership, I think" is not yet one the
 * affidavit can name; and the rules' own way to find out where a debtor works
 * is to examine him. Both are set out as what the rules provide, side by side;
 * the card never says which to choose, and never says whether anything will be
 * collected (CLAUDE.md s. 3, s. 4).
 */
const judgmentGuide = (pinpoint: string, quote: string) => cite("guide-after-judgment", pinpoint, quote);
export const GARNISHEE_NOT_NAMED: PlainLine[] = [
  {
    say: "A notice of garnishment is directed to one named garnishee, such as an employer. The affidavit for enforcement request (Form 20P) you file for it must give the garnishee's name and address.",
    cite: scrCite(
      "r. 20.08 (3) (a) (vi)",
      "an affidavit for enforcement request (Form 20P) naming one debtor and one garnishee and stating, ... (vi) the name and address of the named garnishee to whom a notice of garnishment is to be directed,",
    ),
  },
  {
    say: "The court's guide says that to garnish wages you must know the employer's correct legal name and address.",
    cite: judgmentGuide("Information needed to proceed", "If you are garnishing wages, you must know the correct legal name and address of the employer."),
  },
  {
    say: "The rules also let you ask the clerk for a notice of examination (Form 20H). At an examination, the debtor can be asked about the debtor's income and property.",
    cite: scrCite(
      "r. 20.10 (1), (4) (b)",
      "the clerk of a court in the territorial division in which the debtor or other person to be examined resides or carries on business shall, at the creditor's request, issue a notice of examination (Form 20H) directed to the debtor or other person. ... may be examined in relation to, (a) the reason for nonpayment; (b) the debtor's income and property;",
    ),
  },
  {
    say: "The court's guide says an examination may give you what you need to ask for a garnishment, such as where the debtor works or banks.",
    cite: judgmentGuide(
      "Examination Hearing",
      "It may be that the creditor wants to enforce an order through garnishment and needs to know where the debtor works or banks. The examination may give the creditor the information needed to request a garnishment.",
    ),
  },
];

const WORKS_AT = /\b(?:works?|working|employed|job)\b[^.!?\n]*\b(?:at|for|in)\b/i;
const HEDGED = /\b(?:i think|i believe|i guess|not sure|maybe|probably|somewhere|some kind of|i heard)\b/i;
/** "at a car dealership", "for some company": a workplace named by its kind, not its name. */
const UNNAMED_PLACE = /\b(?:works?|working|employed|job)\b[^.!?\n]*\b(?:at|for)\s+(?:a|an|some)\s+/i;

/**
 * The sentence of the person's story that names the debtor's work only
 * vaguely (hedged, or a workplace given by its kind), or null. A named
 * employer ("works at Kanata Toyota") is not vague.
 */
export function vagueEmployerSentence(story: string): string | null {
  const sentences = proseOf(story).split(/(?<=[.!?])\s+|\n+/).map((sentence) => sentence.trim()).filter(Boolean);
  return sentences.find((sentence) => WORKS_AT.test(sentence) && (HEDGED.test(sentence) || UNNAMED_PLACE.test(sentence))) ?? null;
}

/** The garnishee lines for a garnishment step whose story names the employer only vaguely; null otherwise. */
export function garnisheeNotesFor(stepId: string, story: string): { quote: string; lines: PlainLine[] } | null {
  if (STEP_PRACTICAL[stepId]?.serve !== "garnishment") return null;
  const quote = vagueEmployerSentence(story);
  return quote ? { quote, lines: GARNISHEE_NOT_NAMED } : null;
}

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
/** Once issued, the claim is served within six months (2026-10-13: the card for a drafted claim said nothing about serving it). */
const CIV_SERVE_IN_SIX_MONTHS = rcp("r. 14.08 (1)", "Where an action is commenced by a statement of claim, the statement of claim shall be served within six months after it is issued.");
const CIV_MOTION = rcp(
  "r. 37.01",
  "A motion shall be made by a notice of motion (in Form 37A) unless the nature of the motion or the circumstances make a notice of motion unnecessary or these rules provide otherwise.",
);
/*
 * 2026-10-13, walkthrough (urgent safety case, nothing filed yet): the motion
 * card named Forms 14 and 14A but not that a temporary order is for a claim
 * made in an application, nor that the usual wait for a case conference can
 * be skipped when it is urgent.
 */
const FAM_MOTION_IN_APPLICATION = flr("r. 14 (1)", "A person who wants any of the following may make a motion: 1. A temporary order for a claim made in an application.");
const FAM_MOTION_URGENT = flr(
  "r. 14 (4), (4.2)",
  "No notice of motion or supporting evidence may be served and no motion may be heard before a conference dealing with the substantive issues in the case has been completed. ... Subrule (4) does not apply if the court is of the opinion that there is a situation of urgency or hardship",
);
const FAM_MOTION = flr("r. 14 (9)", "A motion, whether made with or without notice, (a) requires a notice of motion (Form 14) and an affidavit (Form 14A); and (b) may be supported by additional evidence.");

/*
 * Starting a family case (2026-10-13). Family has no "file your application"
 * step: a person with nothing filed is on "deciding where to start", whose
 * card listed no form, fee, filing or service -- the walkthrough's two family
 * applicants were told "This card doesn't list the form". These are the
 * rules that say what starts the case and what goes with it.
 */
const FAM_START = flr("r. 8 (1)", "To start a case, a person shall file an application (Form 8, 8A, 8B, 8B.1, 8B.2, 8C, 8D, 8D.1, 33D.1, 34L or 34N).");
const FAM_FINANCIAL_STATEMENT = flr(
  "r. 13 (1)",
  "If an application, answer or motion contains a claim for support, a property claim, or a claim for exclusive possession of the matrimonial home and its contents, (a) the party making the claim shall serve and file a financial statement (Form 13 or 13.1) with the document that contains the claim",
);
const FAM_PARENTING_AFFIDAVIT = flr(
  "r. 35.1 (1)",
  "If an application, answer or motion to change a final order contains a claim respecting decision-making responsibility, parenting time or contact with respect to a child, the party making the claim shall serve and file with the document that contains the claim, (a) an affidavit in Form 35.1",
);

const APPEAL_START = rcp(
  "r. 61.04 (1)",
  "An appeal to an appellate court shall be commenced by serving a notice of appeal in Form 61A.2 (Court of Appeal) or 61A.3 (Divisional Court) together with the certificate required by subrule 61.05 (1), within 30 days after the making of the order appealed from, unless a statute or these rules provide otherwise",
);

// Build order Step 3, 2026-10-12/13: the Small Claims steps that were empty.
// Notice before suing: no court form or fee; the card quotes how the notice
// must be given (the published answer explains it in plain words).
const MUNICIPAL_NOTICE = cite(
  "municipal-act-2001",
  "s. 44 (10)",
  "No action shall be brought for the recovery of damages under subsection (2) unless, within 10 days after the occurrence of the injury, written notice of the claim and of the injury complained of, including the date, time and location of the occurrence, has been served upon or sent by registered mail to, (a) the clerk of the municipality",
);
const TORONTO_NOTICE = cite(
  "city-of-toronto-act-2006",
  "s. 42 (6)",
  "No action shall be brought for the recovery of damages under subsection (2) unless, within 10 days after the occurrence of the injury, written notice of the claim and of the injury complained of, including the date, time and location of the occurrence, has been served upon or sent by registered mail to, (a) the city clerk",
);
const SNOW_ICE_NOTICE = cite(
  "occupiers-liability-act",
  "s. 6.1 (1)",
  "No action shall be brought for the recovery of damages for personal injury caused by snow or ice against a person or persons listed in subsection (2) unless, within 60 days after the occurrence of the injury, written notice of the claim, including the date, time and location of the occurrence, has been personally served on or sent by registered mail to at least one person listed in subsection (2).",
);
const VEHICLE_NOTICE = cite(
  "insurance-act",
  "s. 258.3 (1) (a), (b)",
  "(a) the plaintiff has applied for statutory accident benefits; (b) the plaintiff served written notice of the intention to commence the action on the defendant within 120 days after the incident or within such longer period as a court in which the action may be commenced may authorize, on motion made before or after the expiry of the 120-day period;",
);
// Paying a judgment by instalments (r. 20.02 (2)-(4)).
const SC_PERIODIC_ENFORCEMENT = scr(
  "r. 20.02 (2)",
  "While an order for periodic payment is in force, no step to enforce the judgment may be taken or continued against the debtor by a creditor named in the order, except issuing a writ of seizure and sale of land and filing it with the sheriff.",
);
const SC_PERIODIC_DEFAULT = scr(
  "r. 20.02 (3)",
  "The creditor may serve the debtor with a notice of default of payment (Form 20L) in accordance with subrule 8.01 (14) and file a copy of it, together with an affidavit of default of payment (Form 20M), if the debtor fails to make payments under an order for periodic payment.",
);
const SC_PERIODIC_ENDS = scr(
  "r. 20.02 (4)",
  "An order for periodic payment terminates on the day that is 15 days after the creditor serves the debtor with the notice of default of payment, unless a consent (Form 13B) in which the creditor waives the default is filed within the 15-day period.",
);
// The cap on costs in Small Claims Court.
const SC_COSTS_CAP = cite(
  "cja-courts-of-justice-act",
  "s. 29",
  "An award of costs in the Small Claims Court, other than disbursements, shall not exceed 15 per cent of the amount claimed or the value of the property sought to be recovered unless the court considers it necessary in the interests of justice to penalize a party or a party's representative for unreasonable behaviour in the proceeding.",
);

const SC_GARNISHMENT_PAID = scr(
  "r. 20.08 (20.2)",
  "Once the amount owing under an order that is enforced by garnishment is paid, the creditor shall immediately serve a notice of termination of garnishment (Form 20R) on the garnishee and on the clerk.",
);

const NOTHING: StepPractical = { forms: [], fees: [], files: false, serve: null };

/*
 * The court case that follows a notice before suing (walkthrough run
 * 38500825561, SW: the notice card never named the later claim form). A
 * notice step has no form of its own; once the notice is given, the action
 * itself is started by the court's originating document. Shown after the
 * notice, never before it. Each line is the start rule or the fee, quoted.
 */
const NOTICE_SOURCES = new Set<RuleCitation["sourceId"]>([
  "municipal-act-2001",
  "city-of-toronto-act-2006",
  "occupiers-liability-act",
  "crown-liability-and-proceedings-act-2019",
  "insurance-act",
]);
export const CLAIM_AFTER_NOTICE: Record<"civil" | "small-claims", { start: PlainLine; fees: string[]; form: string }> = {
  civil: {
    start: { say: "After the notice, the court case itself is started with a statement of claim (Form 14A).", cite: CIV_START },
    fees: ["civ-claim"],
    form: "14A",
  },
  "small-claims": {
    start: { say: "After the notice, the court case itself is started by filing a plaintiff's claim (Form 7A) with the clerk, with a copy for each defendant.", cite: SC_START },
    form: "7A",
    // Both claim fees, as on every other Small Claims claim step (review 2026-10-13).
    fees: ["sc-claim", "sc-claim-frequent"],
  },
};
/*
 * The Crown's notice is not "first the notice, then the claim" but "at least
 * 60 days before" the claim (CLPA s. 18 (1); review 2026-10-13). When the
 * Crown's notice is the one that fits, the line says so; when it is one of
 * several kept, it says so for a claim against the Crown.
 */
export const CROWN_WAIT: { only: PlainLine; among: PlainLine } = {
  only: { say: "Start the court case at least 60 days after you served the notice on the Crown, not sooner.", cite: S_CLPA_18_1_NOTICE },
  among: { say: "If your claim is against the Ontario Crown, the court case can be started only at least 60 days after the notice was served on the Crown.", cite: S_CLPA_18_1_NOTICE },
};
/** The lines for starting the case after a notice step, keyed to the notices the words fit; none for a step that is not a notice before suing. */
export function claimAfterNotice(stepId: string, court: PracticalCourt, story = "", city = ""): PlainLine[] {
  const step = STEP_PRACTICAL[stepId];
  if (!step || court === "family" || step.forms.length > 0) return [];
  const notices = alsoFor(step.also ?? [], story, city).filter((rule) => NOTICE_SOURCES.has(rule.sourceId));
  if (notices.length === 0) return [];
  const crown = notices.some((rule) => rule.sourceId === "crown-liability-and-proceedings-act-2019");
  const crownLine = crown ? [notices.length === 1 ? CROWN_WAIT.only : CROWN_WAIT.among] : [];
  const after = CLAIM_AFTER_NOTICE[court];
  const fees = after.fees.map((id) => FEES[id]).filter(Boolean);
  // Where and how to file it, and -- when the notice is to a municipality --
  // how to serve the claim on it (walkthrough 2026-10-14, SW: the card showed
  // the $243 fee but not where to file the claim or how to serve the City).
  // The court's own filing lines and service rules, never new words.
  const toronto = inTorontoRegion(city);
  const filing = FILING[court];
  const filingLines = [...(toronto === true ? [filing.toronto] : toronto === false ? [filing.elsewhere] : [filing.toronto, filing.elsewhere]), ...filing.more];
  // Only when every notice kept is to a municipality: words that fit no notice keep all of them.
  const municipal = notices.every((rule) => MUNICIPAL_NOTICE_SOURCES.has(rule.sourceId));
  const serving = municipal
    ? SERVICE[court].originating.filter((line, index) => index === 0 || line.about === MUNICIPAL_PARTY)
    : [];
  return [...crownLine, after.start, ...fees.map((fee) => ({ say: `${fee.label}: $${fee.amount}.`, cite: fee.cite })), ...filingLines, ...serving];
}
/** The notices that are notices to a municipality (the Municipal Act's and the City of Toronto Act's). */
const MUNICIPAL_NOTICE_SOURCES = new Set<string>(["municipal-act-2001", "city-of-toronto-act-2006"]);

/**
 * Every step in the stage map has an entry; "unknown" and "out-of-scope" are
 * not steps. A step with nothing to file says so with NOTHING, deliberately,
 * so a missing entry is a test failure rather than a silent blank.
 */
export const STEP_PRACTICAL: Record<string, StepPractical> = {
  // ---- Small Claims: before filing
  "before-filing:deciding-whether-to-sue": { forms: ["7A"], fees: ["sc-claim", "sc-claim-frequent"], files: true, serve: null, also: [SC_START, SC_ATTACH] },
  "before-filing:notice-municipality": { forms: [], fees: [], files: false, serve: null, also: [MUNICIPAL_NOTICE] },
  "before-filing:notice-toronto": { forms: [], fees: [], files: false, serve: null, also: [TORONTO_NOTICE] },
  "before-filing:notice-snow-ice-private": { forms: [], fees: [], files: false, serve: null, also: [SNOW_ICE_NOTICE] },
  "before-filing:notice-vehicle-injury": { forms: [], fees: [], files: false, serve: null, also: [VEHICLE_NOTICE] },
  "before-filing:notice-deadline-missed": { forms: ["7A"], fees: ["sc-claim", "sc-claim-frequent"], files: true, serve: "originating", also: [SC_START, SC_ATTACH] },
  "before-filing:limitation-period-may-have-passed": NOTHING,
  // Two routes, both named: Small Claims (waiving the excess) or the Superior Court.
  "before-filing:claim-exceeds-small-claims-limit": { forms: ["7A", "civil:14A"], fees: [], files: false, serve: null, also: [SC_START, CIV_START] },
  // ---- Small Claims: plaintiff
  // Served once issued: the card says how and within six months (r. 8.01 (2)).
  "plaintiff:claim-drafted-not-filed": { forms: ["7A"], fees: ["sc-claim", "sc-claim-frequent"], files: true, serve: "originating", also: [SC_START, SC_ATTACH] },
  "plaintiff:claim-issued-not-served": { forms: ["8A"], fees: [], files: false, serve: "originating" },
  "plaintiff:service-attempted-failed": { forms: ["15A", "8A"], fees: ["sc-motion"], files: true, serve: "originating", also: [SC_HEARING_DATE] },
  "plaintiff:six-month-service-window-expired": { forms: ["15A"], fees: ["sc-motion"], files: true, serve: null, also: [SC_HEARING_DATE] },
  "plaintiff:served-awaiting-defence": { forms: ["8A", "9B"], fees: [], files: true, serve: null },
  "plaintiff:defence-period-expired-no-defence": { forms: ["9B", "11B", "11A"], fees: ["sc-default"], files: true, serve: null },
  "plaintiff:defendant-noted-in-default": { forms: ["11B", "15A", "9B"], fees: ["sc-default", "sc-motion", "sc-trial"], files: true, serve: null },
  "plaintiff:assessment-of-damages-needed": { forms: ["15A", "9B"], fees: ["sc-motion", "sc-trial"], files: true, serve: null },
  "plaintiff:default-judgment-signed": { forms: ["20P", "20E", "20H", "20C", "20D", "20A", "20I", "20F"], fees: ["sc-garnishment", "sc-writ-exam"], files: true, serve: "garnishment" },
  "plaintiff:defence-filed": { forms: ["13A", "20L", "20M"], fees: [], files: true, serve: "ordinary" },
  "plaintiff:served-with-defendants-claim": { forms: ["9A"], fees: ["sc-defence"], files: true, serve: "ordinary", also: [SC_ATTACH_DEFENCE] },
  "plaintiff:awaiting-settlement-conference": { forms: ["13A", "1B"], fees: [], files: true, serve: "ordinary", noFee: true },
  "plaintiff:settlement-conference-held": { forms: ["9B", "14D"], fees: ["sc-trial"], files: true, serve: null },
  "plaintiff:trial-date-set": { forms: ["18A"], fees: ["sc-summons"], files: true, serve: "summons", also: [SC_COSTS_CAP] },
  "plaintiff:judgment-in-my-favour-unpaid": { forms: ["20P", "20E", "20H", "20C", "20D", "20A", "20I", "20F", "20R"], fees: ["sc-garnishment", "sc-writ-exam"], files: true, serve: "garnishment", also: [SC_GARNISHMENT_PAID, SC_PERIODIC_ENFORCEMENT, SC_PERIODIC_DEFAULT, SC_PERIODIC_ENDS] },
  "plaintiff:action-dismissed-for-delay": { forms: ["15A", "11.2A"], fees: ["sc-motion"], files: true, serve: "ordinary", also: [SC_HEARING_DATE] },
  // ---- Small Claims: defendant
  "defendant:served-defence-period-running": { forms: ["9A"], fees: ["sc-defence", "sc-defendants-claim-if"], files: true, serve: "ordinary", also: [SC_ATTACH_DEFENCE] },
  "defendant:defence-period-expired-not-yet-noted": { forms: ["9A"], fees: ["sc-defence", "sc-defendants-claim-if"], files: true, serve: "ordinary", also: [SC_ATTACH_DEFENCE] },
  "defendant:noted-in-default": { forms: ["15A", "11.2A"], fees: ["sc-motion"], files: true, serve: "ordinary", also: [SC_HEARING_DATE] },
  "defendant:default-judgment-against-me": { forms: ["15A", "11.2A"], fees: ["sc-motion"], files: true, serve: "ordinary", also: [SC_HEARING_DATE] },
  "defendant:defence-filed": { forms: ["13A"], fees: [], files: true, serve: "ordinary", noFee: true },
  "defendant:considering-defendants-claim": { forms: ["10A"], fees: ["sc-defendants-claim"], files: true, serve: "originating" },
  "defendant:awaiting-settlement-conference": { forms: ["13A"], fees: [], files: true, serve: "ordinary", noFee: true },
  "defendant:trial-date-set": { forms: ["18A"], fees: ["sc-summons"], files: true, serve: "summons", also: [SC_COSTS_CAP] },
  "defendant:judgment-against-me": { forms: ["15A", "11.2A", "20I"], fees: ["sc-motion", "sc-appeal"], files: true, serve: "ordinary", also: [APPEAL_START] },
  // ---- Small Claims: either side
  "both:missed-settlement-conference": { forms: ["13A"], fees: [], files: true, serve: "ordinary", noFee: true },
  "both:missed-trial": { forms: ["15A", "15B"], fees: ["sc-motion"], files: true, serve: "ordinary", also: [SC_HEARING_DATE] },
  "both:filed-in-wrong-place": { forms: ["9A", "15A"], fees: ["sc-defence", "sc-motion"], files: true, serve: "ordinary", also: [SC_HEARING_DATE] },
  // ---- Small Claims: steps added from the law map (2026-10-13)
  "both:bringing-a-motion": { forms: ["15A"], fees: ["sc-motion"], files: true, serve: "ordinary", also: [SC_HEARING_DATE] },
  "both:responding-to-a-motion": { forms: ["15B"], fees: [], files: true, serve: "ordinary" },
  "defendant:admitted-and-proposed-terms": { forms: ["9A"], fees: ["sc-defence"], files: true, serve: "ordinary", also: [SC_ATTACH_DEFENCE] },
  "plaintiff:defendant-proposed-terms": { forms: ["9B"], fees: [], files: true, serve: "ordinary" },
  "both:trial-management-conference": NOTHING,
  "both:offer-to-settle": { forms: ["14A", "14B", "14C"], fees: [], files: false, serve: "ordinary" },
  // The notice of examination is served under r. 8.01 (10)-(12); no service line is shown for it here.
  "plaintiff:debtor-examination": { forms: ["20H", "20P", "20A"], fees: ["sc-writ-exam"], files: true, serve: null },
  "defendant:judgment-being-enforced": { forms: ["15A"], fees: ["sc-motion"], files: true, serve: "ordinary", also: [R_15_01_MOTION_FORM, SC_HEARING_DATE] },
  "plaintiff:wants-to-discontinue": { forms: ["11.3A"], fees: [], files: true, serve: "ordinary" },
  // The amended version of the claim or defence already filed (Form 7A, 9A or 10A), marked "Amended".
  "both:amending-a-claim-or-defence": { forms: [], fees: [], files: true, serve: "ordinary" },
  "both:motion-to-strike-out": { forms: ["15A"], fees: ["sc-motion"], files: true, serve: "ordinary", also: [SC_HEARING_DATE] },
  // A written submission to the court, not a form; the step's own rule says how long and by when.
  "plaintiff:court-considering-dismissal": NOTHING,

  // ---- Civil: before filing
  "civil:before-filing:deciding-whether-to-sue": { forms: ["14A", "14C"], fees: ["civ-claim"], files: true, serve: null, also: [CIV_START] },
  // Done outside court: the notice itself. The step's own deadlines say which applies and count it;
  // the card shows each notice rule so the person sees what the notice must say and who gets it.
  "civil:before-filing:notice-required-before-suing": { forms: [], fees: [], files: false, serve: null, also: [MUNICIPAL_NOTICE, TORONTO_NOTICE, SNOW_ICE_NOTICE, S_CLPA_18_1_NOTICE] },
  "civil:before-filing:limitation-period-may-have-passed": NOTHING,
  // ---- Civil: plaintiff
  "civil:plaintiff:claim-drafted-not-issued": { forms: ["14A", "14C"], fees: ["civ-claim"], files: true, serve: "originating", also: [CIV_START, CIV_SERVE_IN_SIX_MONTHS] },
  "civil:plaintiff:claim-issued-not-served": { forms: ["16B", "14D"], fees: [], files: true, serve: "originating" },
  // A motion on notice; how it is served on the Crown is in s. 15 of the Crown Liability and Proceedings Act, quoted in the step's own rules.
  "civil:plaintiff:crown-misfeasance-leave-needed": { forms: ["37A"], fees: ["civ-motion"], files: true, serve: null, also: [CIV_MOTION] },
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
  // Construction lien steps (2026-10-14): the forms and fees for a lien action
  // are not yet on the map, so none are listed rather than the ordinary ones.
  "civil:defendant:lien-registered-on-title": NOTHING,
  "civil:defendant:served-with-lien-claim": NOTHING,
  "civil:plaintiff:lien-claimant": NOTHING,
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
  "civil:both:summary-judgment-motion": { forms: ["37A", "37B"], fees: ["civ-motion"], files: true, serve: "ordinary", also: [CIV_MOTION] },
  "civil:both:motion-scheduled": { forms: ["37A", "37B"], fees: ["civ-motion"], files: true, serve: "ordinary", also: [CIV_MOTION] },
  "civil:both:motion-to-strike-or-dismiss": { forms: ["37A"], fees: ["civ-motion"], files: true, serve: "ordinary", also: [CIV_MOTION] },
  "civil:both:asking-for-injunction": { forms: ["37A"], fees: ["civ-motion"], files: true, serve: "ordinary", also: [CIV_MOTION] },
  // Amended on the face of the pleading already filed; leave, when needed, is asked by motion (the step's own rules).
  "civil:both:amending-a-pleading": NOTHING,
  // The order is asked for by motion, which may be made without notice (r. 42.01 (3), in the step's rules).
  "civil:plaintiff:certificate-of-pending-litigation": { forms: ["37A", "42A"], fees: ["civ-motion"], files: true, serve: null, also: [CIV_MOTION] },
  // The motion's own timing is in s. 137.2 of the Courts of Justice Act, in the step's rules.
  "civil:defendant:sued-over-public-expression": { forms: ["37A"], fees: ["civ-motion"], files: true, serve: "ordinary", also: [CIV_MOTION] },
  "civil:both:interlocutory-order-made": { forms: ["61A", "62A"], fees: ["civ-motion", "civ-appeal-interlocutory"], files: true, serve: "ordinary" },
  "civil:both:pretrial-scheduled": { forms: ["50A"], fees: [], files: true, serve: "ordinary" },
  "civil:both:trial-date-set": { forms: ["53A"], fees: ["civ-summons"], files: true, serve: "summons" },
  "civil:both:missed-trial": { forms: ["37A", "61A.2", "61A.3", "61C"], fees: ["civ-motion", "civ-appeal-final"], files: true, serve: "ordinary", also: [CIV_MOTION, APPEAL_START] },
  "civil:both:judgment-given": { forms: ["61A.2", "61A.3", "61C"], fees: ["civ-appeal-final"], files: true, serve: "ordinary", also: [APPEAL_START] },
  "civil:both:appeal-in-progress": { forms: ["61D"], fees: ["civ-perfect"], files: true, serve: "ordinary" },

  // ---- Family: before filing
  "family:before-filing:deciding-where-to-start": {
    forms: ["8", "8A", "13", "13.1", "35.1"],
    fees: ["fam-application"],
    files: true,
    serve: "originating",
    also: [FAM_START, FAM_FINANCIAL_STATEMENT, FAM_PARENTING_AFFIDAVIT],
  },
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
  // Form 35.1 (walkthrough run 38525903567, FR): r. 35.1 (1) requires it with an
  // answer that claims decision-making responsibility, parenting time or
  // contact; folded when the words name no parenting claim (FAMILY_FORM_NEEDS).
  "family:respondent:served-time-to-answer-running": { forms: ["10", "35.1", "13"], fees: ["fam-answer", "fam-answer-divorce"], files: true, serve: "ordinary" },
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
  "family:both:bringing-a-motion": { forms: ["14", "14A", "14C"], fees: [], files: true, serve: "ordinary", also: [FAM_MOTION, FAM_MOTION_IN_APPLICATION, FAM_MOTION_URGENT] },
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

// ---------------------------------------------------------------- giving a notice before suing

/*
 * What the notice must say, who gets it and how (walkthrough 2026-10-13, a
 * Toronto sidewalk fall: "no help writing the notice to the City"). Each line
 * says only what its section says. The City Hall mailing address below (C1
 * follow-up, 2026-10-16) comes from toronto.ca's own "How to File a Claim"
 * page, not the statute -- the statute only names the office ("the city
 * clerk"), and the address is the City's own practical answer to where that
 * office receives mail, vendored as a human-snapshot source because this
 * sandbox's network allowlist cannot reach toronto.ca (see
 * docs/SOURCING_NOTES.md).
 */
const torontoNotice = (pinpoint: string, quote: string) => cite("city-of-toronto-act-2006", pinpoint, quote);
const torontoHowToFile = (pinpoint: string, quote: string) => cite("toronto-how-to-file-a-claim", pinpoint, quote);
const municipalNotice = (pinpoint: string, quote: string) => cite("municipal-act-2001", pinpoint, quote);
const occupierNotice = (pinpoint: string, quote: string) => cite("occupiers-liability-act", pinpoint, quote);

export const NOTICE_HOW: Partial<Record<RuleCitation["sourceId"], PlainLine[]>> = {
  "city-of-toronto-act-2006": [
    {
      say: "Write the notice. Say what you are claiming and what your injury is, and give the date, time and place where it happened.",
      cite: torontoNotice("s. 42 (6)", "written notice of the claim and of the injury complained of, including the date, time and location of the occurrence"),
    },
    {
      say: "Give it to the city clerk: serve it on the clerk, or send it to the clerk by registered mail. Do this within 10 days after the injury.",
      cite: torontoNotice("s. 42 (6)", "within 10 days after the occurrence of the injury, ... has been served upon or sent by registered mail to, (a) the city clerk"),
    },
    {
      say: "If the City and another municipality are jointly responsible for repairing the road or bridge, the notice goes to the city clerk and to the clerk of each of the others.",
      cite: torontoNotice(
        "s. 42 (6) (b)",
        "(b) if the claim is against the City and one or more municipalities jointly responsible for the repair of the highway or bridge, the city clerk and the clerk of each of the other municipalities",
      ),
    },
    {
      say: "By mail or courier, the City accepts it at: Claims, City Hall, 100 Queen St. W., 5th Floor, East Tower, Toronto, Ontario, M5H 2N2.",
      cite: torontoHowToFile(
        "Submit a Claim by Mail or Courier",
        "Claims City Hall 100 Queen St. W., 5th Floor, East Tower Toronto, Ontario, M5H 2N2",
      ),
    },
  ],
  "municipal-act-2001": [
    {
      say: "Write the notice. Say what you are claiming and what your injury is, and give the date, time and place where it happened.",
      cite: municipalNotice("s. 44 (10)", "written notice of the claim and of the injury complained of, including the date, time and location of the occurrence"),
    },
    {
      say: "Give it to the clerk of the municipality: serve it on the clerk, or send it to the clerk by registered mail. Do this within 10 days after the injury.",
      cite: municipalNotice("s. 44 (10)", "within 10 days after the occurrence of the injury, ... has been served upon or sent by registered mail to, (a) the clerk of the municipality"),
    },
    {
      say: "If two or more municipalities are jointly responsible for repairing the road or bridge, the notice goes to the clerk of each one.",
      cite: municipalNotice("s. 44 (10) (b)", "(b) if the claim is against two or more municipalities jointly responsible for the repair of the highway or bridge, the clerk of each of the municipalities"),
    },
  ],
  "occupiers-liability-act": [
    {
      say: "Write the notice. Say what you are claiming, and give the date, time and place where it happened.",
      cite: occupierNotice("s. 6.1 (1)", "written notice of the claim, including the date, time and location of the occurrence"),
    },
    {
      say: "Serve it in person on, or send it by registered mail to, the occupier or the contractor they hired to clear the snow or ice. Do this within 60 days after the injury.",
      cite: occupierNotice(
        "s. 6.1 (1), (2)",
        "within 60 days after the occurrence of the injury, ... has been personally served on or sent by registered mail to at least one person listed in subsection (2). ... 1. An occupier. 2. An independent contractor employed by the occupier to remove snow or ice on the premises during the relevant period in which the injury occurred.",
      ),
    },
  ],
};

// ---------------------------------------------------------------- the person's family claims

/**
 * Which kinds of family claim the person's own words (and the issues they
 * ticked, which reach here as words such as "child-support") mention. `known`
 * is false when the words name none of them, and then nothing is folded or
 * reordered on their account. When it is true, a gap in these patterns can
 * fold a line under "may apply later" (with the rule that says when it
 * applies) but never removes one; and the forms a rule makes the person file
 * whatever they claim (a respondent's financial statement, r. 13 (1) (b)) are
 * never folded at all.
 */
export type FamilyClaims = { known: boolean; parenting: boolean; support: boolean; property: boolean; home: boolean; divorce: boolean };

export function familyClaimsIn(words: string): FamilyClaims {
  const text = proseOf(words).toLowerCase();
  const parenting = /\b(?:decision-making|parenting|custody|access|relocat\w*|move (?:away |to \w+ )?with (?:her|him|them|the kids?|the children|my (?:son|daughter|kids?|children))|contact with|my (?:son|daughter|daugter|kids?|children)|our (?:son|daughter|daugter|kids?|children))\b/.test(text);
  const support = /\b(?:child-support|spousal-support|support|suport|child support|spousal support|alimony)\b/.test(text);
  const property = /\b(?:property-division|property|equaliz\w*|net family|pension|assets?|house we (?:own|bought))\b/.test(text);
  const home = /\b(?:matrimonial-home|matrimonial home|exclusive possession)\b/.test(text);
  // "We were never married" is not a divorce (formsInText.ts has the same test).
  const divorce = /\bdivorce|(?<!never |not |n't |were not |weren't )\bmarried\b|\bhusband\b|\bwife\b/.test(text);
  return { known: parenting || support || property || home || divorce, parenting, support, property, home, divorce };
}

/** The person's words name only parenting (no support, property, home or divorce). */
export function parentingOnly(claims: FamilyClaims): boolean {
  return claims.known && claims.parenting && !claims.support && !claims.property && !claims.home && !claims.divorce;
}

/** The person's words name support and nothing else (no parenting, property or home). */
export function supportOnly(claims: FamilyClaims): boolean {
  return claims.known && claims.support && !claims.parenting && !claims.property && !claims.home;
}

/*
 * Family forms that a rule requires only with a particular claim
 * (walkthrough 2026-10-13: a father in a parenting-only case was shown
 * "Form 13 -- Financial Statement (Support Claims)" as his form). They are
 * folded under the rule that says when they are needed -- never removed.
 *
 * The financial statement on a step where the person is RESPONDING (legal
 * review 2026-10-14): r. 13 (1) (b) makes the party a support or property
 * claim is made AGAINST serve and file one within their time to respond,
 * answer or not. Whether it binds them turns on what the application or
 * motion CLAIMS, not on the person's own words, and nothing in the intake
 * records what the other side's papers claim. So on a responding step Form
 * 13 is never folded: it stays in the step's forms with r. 13 (1) (b)'s
 * condition beside it (financialStatementNoteFor). On any other step it is
 * folded under r. 13 (1) (a) and (b) only when the person's words show no
 * support or money at all. Never removed.
 */
const FINANCIAL_STATEMENT_WHEN: PlainLine = {
  say: "A financial statement (Form 13 or 13.1) is needed when an application, answer or motion claims support or property, or the matrimonial home. If the other side's papers make that claim against you, you must serve and file one within your time to answer, even if you file no answer.",
  cite: flr(
    "r. 13 (1) (a), (b)",
    "If an application, answer or motion contains a claim for support, a property claim, or a claim for exclusive possession of the matrimonial home and its contents, (a) the party making the claim shall serve and file a financial statement (Form 13 or 13.1) with the document that contains the claim; and (b) the party against whom the claim is made shall serve and file a financial statement within the time for serving and filing an answer, reply or affidavit or other document responding to the motion, whether the party is serving an answer, reply or affidavit or other document responding to the motion or not.",
  ),
};
/** The same condition said to the person answering the papers: r. 13 (1) (b), when the claim against them includes support or property. */
export const FINANCIAL_STATEMENT_WHEN_RESPONDING: PlainLine = {
  say: "A financial statement (Form 13 or 13.1) is needed from you only if the papers served on you claim support or property from you, or the matrimonial home. If they do, you must serve and file one within your time to answer, even if you file no answer. Check the claims listed in the application.",
  cite: flr(
    "r. 13 (1) (b)",
    "If an application, answer or motion contains a claim for support, a property claim, or a claim for exclusive possession of the matrimonial home and its contents, ... (b) the party against whom the claim is made shall serve and file a financial statement within the time for serving and filing an answer, reply or affidavit or other document responding to the motion, whether the party is serving an answer, reply or affidavit or other document responding to the motion or not.",
  ),
};
/** The same, on a motion to change: the response to a motion, so "within your time to respond" (legal review 2026-10-14). */
export const FINANCIAL_STATEMENT_WHEN_RESPONDING_MOTION: PlainLine = {
  say: "A financial statement (Form 13 or 13.1) is needed from you only if the motion served on you claims support or property from you, or the matrimonial home. If it does, you must serve and file one within your time to respond, even if you file no response. Check the claims in the motion.",
  cite: FINANCIAL_STATEMENT_WHEN_RESPONDING.cite,
};
/** The condition shown beside Form 13 on a responding step: the motion-to-change wording on a motion-to-change step. */
export function financialStatementNoteFor(stepId: string): PlainLine {
  return /motion-to-change|change-final-order/.test(stepId) ? FINANCIAL_STATEMENT_WHEN_RESPONDING_MOTION : FINANCIAL_STATEMENT_WHEN_RESPONDING;
}
const PARENTING_AFFIDAVIT_WHEN: PlainLine = {
  say: "The parenting affidavit (Form 35.1) is needed when an application, answer or motion to change claims decision-making responsibility, parenting time or contact.",
  cite: FAM_PARENTING_AFFIDAVIT,
};
/** Words that show support, property or money at all; with any of them, the financial statement is never folded. */
export const MONEY_WORDS = /\b(?:support|suport|pay|pays|paid|paying|owe|owes|owed|owing|amount|money|income|wages?|salary|alimony|property|pension|house|home|assets?|debts?)\b|\$/i;
const moneyFits = (claims: FamilyClaims, words: string) => claims.support || claims.property || claims.home || MONEY_WORDS.test(proseOf(words));
const FAMILY_FORM_NEEDS: Record<string, { when: PlainLine; respondingNote?: boolean; conditionNote?: boolean; fits: (claims: FamilyClaims, words: string, responding: boolean) => boolean }> = {
  // Never folded on a responding step: the duty turns on what the other side's papers claim.
  "13": { when: FINANCIAL_STATEMENT_WHEN, respondingNote: true, fits: (claims, words, responding) => responding || moneyFits(claims, words) },
  "13.1": { when: FINANCIAL_STATEMENT_WHEN, respondingNote: true, fits: (claims, words, responding) => responding || moneyFits(claims, words) },
  // Shown with its condition beside it wherever it is listed (FR): it is the claim, not the step, that needs it.
  "35.1": { when: PARENTING_AFFIDAVIT_WHEN, conditionNote: true, fits: (claims) => claims.parenting },
};

/** A step on which the person answers papers served on them, so r. 13 (1) (b) can bind them. */
export function respondingStep(stepId: string, responding: boolean): boolean {
  return responding || /:respondent:|served-with|responding-to/.test(stepId);
}

/*
 * The mandatory information program and a support-only motion to change
 * (walkthrough 2026-10-13: a father asking to lower child support was told
 * first to "Attend the mandatory information program"). Rule 8.1 (1) lists
 * a motion to change among the cases it covers, except one that deals only
 * with changing child or spousal support.
 */
export const MIP_SUPPORT_ONLY_CHANGE: PlainLine = {
  say: "The mandatory information program rule covers a motion to change, except one that deals only with changing child or spousal support. What you told us is about support only, so it is not listed first. If your motion asks to change anything other than child or spousal support, it applies.",
  cite: flr("r. 8.1 (1), para. 6", "6. A motion to change a final order or agreement under rule 15, except motions that deal only with changing child or spousal support."),
};
/*
 * The same rule when the words do not say what the motion changes
 * (walkthrough run 38525903567, FM): the program is not led with, because
 * para. 6 leaves a support-only change out, and it is folded under its
 * condition instead of being dropped.
 */
export const MIP_CHANGE_SUBJECT_UNKNOWN: PlainLine = {
  say: "The mandatory information program rule covers a motion to change, except one that deals only with changing child or spousal support. What you told us does not say what the motion changes. If it asks to change anything other than child or spousal support, this applies.",
  cite: MIP_SUPPORT_ONLY_CHANGE.cite,
};

/** A motion-to-change information-program limit (r. 8.1 (1) para. 6 decides whether it applies). */
export function isChangeMip(item: { id?: string }): boolean {
  return Boolean(item.id && /mip-45-days/.test(item.id) && /motion-to-change/.test(item.id));
}

/**
 * Whether the words show a motion to change that deals with more than child
 * or spousal support (parenting, property or the matrimonial home): only
 * then does the information program lead (r. 8.1 (1) para. 6).
 */
/*
 * Stricter than familyClaimsIn's parenting (re-review of 7f2868f): that one is
 * shared by every family fold and counts "my son" as parenting, so "i pay
 * support for our kids, how do i get it lowered" would lead with the
 * information program. Here a parenting term, or a parenting request in plain
 * words, is needed. Each plain phrase is tied to the children or to
 * parenting (third review of ed02093): "the payment schedule", "the FRO set
 * a schedule", "i visit my lawyer", "i see him in court" and "access to her
 * income records" are support-only words.
 */
const CHILD_NOUN = "(?:son|daughter|daugter|kids?|children)";
const PARENTING_CHANGE = new RegExp(
  // "access to my son" is parenting; "access to her income records" is not.
  `\\b(?:decision-making|parenting|custody|access(?! to (?!(?:my|our|the|her|his) ${CHILD_NOUN}))|relocat\\w*|move (?:away |to \\w+ )?with|contact with|more time with|time with (?:him|her|them|my|our)` +
    `|see (?:my|our|the) ${CHILD_NOUN}|live with me|visitation|visit\\w* (?:with )?(?:my|our|the) ${CHILD_NOUN}` +
    "|(?:parenting|access|visit\\w*|time-sharing|weekend) schedule)\\b",
);

export function changeBeyondSupport(words: string): boolean {
  const claims = familyClaimsIn(words);
  return PARENTING_CHANGE.test(proseOf(words).toLowerCase()) || claims.property || claims.home;
}

/** The note beside a folded motion-to-change information program: support-only, or not said. */
export function changeMipNoteFor(words: string, responding = false): PlainLine {
  // Support named and no change beyond it, by the same test that decides the fold (changeBeyondSupport).
  const line = familyClaimsIn(words).support && !changeBeyondSupport(words) ? MIP_SUPPORT_ONLY_CHANGE : MIP_CHANGE_SUBJECT_UNKNOWN;
  // Served with the motion, it is the other side's motion.
  return responding ? { ...line, say: line.say.replace(/\byour motion\b/g, "the motion") } : line;
}

/**
 * Whether a time limit on the card fits the claims the person's words name:
 * "not" for a limit the rule ties to a claim their words do not include (a
 * property limit for a parenting-only case; the information program for a
 * support-only motion to change), otherwise "fits". Such a limit is folded
 * under "may apply later", never dropped.
 */
export function claimFit(item: { id?: string; what: string }, words: string, stepId = "", responding = false): "fits" | "not" {
  const claims = familyClaimsIn(words);
  // The information program on a motion to change leads only when the words
  // show a change beyond child or spousal support; support-only or not said,
  // it is folded under its condition (r. 8.1 (1) para. 6; walkthrough run
  // 38525903567, FM).
  if (isChangeMip(item)) return changeBeyondSupport(words) ? "fits" : "not";
  if (!claims.known) return "fits";
  // On a step whose own subject is a kind of claim, a line about that kind is
  // the step itself, never "a claim you have not mentioned" (review
  // 2026-10-13: the surviving-spouse election on the property-claim step).
  const subject = claimKindsNamedIn(stepId.replace(/[-:]/g, " "));
  if (subject.length > 0 && claimKindsNamedIn(item.what).some((kind) => subject.includes(kind))) return "fits";
  if (/\bproperty (?:claim|papers)\b/i.test(item.what) && !claims.property && !claims.home) return "not";
  // Not on a responding step: there the duty turns on what the other side's papers claim (legal review 2026-10-14).
  if (/\b(?:support claim|financial statement)\b/i.test(item.what) && !moneyFits(claims, words) && !respondingStep(stepId, responding)) return "not";
  /*
   * Any other limit the rule makes conditional on a kind of claim ("If the
   * motion asks to change temporary support", "If your answer made its own
   * claim about parenting, property or support", "If you want your
   * equalization entitlement") fits when the words show at least one of the
   * kinds it names, and is folded when they show none (walkthrough run
   * 38500825561, FR). Only "If ..." lines are read this way; a limit with no
   * condition always fits.
   */
  // Only a line whose condition is a claim ("makes a ... claim", "asks to
  // change ..."); a kind named in passing ("indexed support" in a garnishment
  // dispute) is not one (review 2026-10-13).
  if (/^(?:if|where|when)\b/i.test(item.what.trim()) && /\b(?:claims?|asks? to change)\b/i.test(item.what) && !(item.id && !/family/.test(item.id))) {
    const named = claimKindsNamedIn(item.what);
    if (named.length > 0 && !named.some((kind) => (kind === "support" ? moneyFits(claims, words) : claims[kind]))) return "not";
  }
  return "fits";
}

/** The kinds of family claim a limit's own "If ..." line names. */
function claimKindsNamedIn(what: string): ("parenting" | "support" | "property" | "home" | "divorce")[] {
  const kinds: ("parenting" | "support" | "property" | "home" | "divorce")[] = [];
  if (/\b(?:parenting|decision-making|custody|contact with)\b/i.test(what)) kinds.push("parenting");
  if (/\bsupport\b/i.test(what)) kinds.push("support");
  if (/\b(?:property|equaliz\w*)\b/i.test(what)) kinds.push("property");
  if (/\bmatrimonial home\b|\bexclusive possession\b/i.test(what)) kinds.push("home");
  if (/\bdivorce\b/i.test(what)) kinds.push("divorce");
  return kinds;
}

// ---------------------------------------------------------------- the family court office

/*
 * Which court office (walkthrough 2026-10-13: two family cases were never told
 * where their court is). A case that exists goes on where it was started
 * (r. 5 (4)); a motion to change starts where a new case would (r. 15 (4),
 * r. 5 (1)). The offices for the person's city come from the courts' own
 * location pages (courts/courtLocations.ts, checked by test:court-locations).
 */
const FAMILY_SAME_PLACE: PlainLine = {
  say: "Every step in your case, except enforcing an order, takes place in the municipality where the case was started (or moved to). The court is named on the papers.",
  cite: flr("r. 5 (4)", "All steps in the case, other than enforcement, shall take place in the municipality where the case is started or transferred."),
};
const FAMILY_CHANGE_PLACE: PlainLine[] = [
  {
    say: "A motion to change is started where a new case would be.",
    cite: flr("r. 15 (4)", "Rule 5 (where a case starts) applies to a motion to change a final order or agreement as if the motion were a new case."),
  },
  {
    say: "That is the municipality where a party lives or, for a change about decision-making responsibility, parenting time or contact, where the child usually lives, subject to the Courts of Justice Act's rules for the Family Court.",
    cite: flr(
      "r. 5 (1) (a), (b)",
      "Subject to sections 21.8 and 21.11 of the Courts of Justice Act (territorial jurisdiction — Family Court), a case shall be started, (a) in the municipality where a party resides; (b) if the case deals with decision-making responsibility, parenting time or contact with respect to a child, in the municipality where the child habitually resides, except as provided for under section 22 of the Children’s Law Reform Act",
    ),
  },
  // Review 2026-10-13: where the Family Court sits, the case goes there.
  {
    say: "Where the Family Court of the Superior Court of Justice sits, a family case under the Acts it lists (such as the Divorce Act, the Children's Law Reform Act and the Family Law Act except Part V) is started and heard there.",
    cite: cite(
      "cja-courts-of-justice-act",
      "s. 21.8 (1), Schedule",
      "In the parts of Ontario where the Family Court has jurisdiction, proceedings referred to in the Schedule to this section, except appeals and prosecutions, shall be commenced, heard and determined in the Family Court. ... SCHEDULE 1. PROCEEDINGS UNDER THE FOLLOWING STATUTORY PROVISIONS: ... Children's Law Reform Act, except sections 59 and 60 ... Divorce Act (Canada) ... Family Law Act, except Part V",
    ),
  },
];

/** `from`: the saved entry it was built from (a location slug, or an OCJ list city), so a check can find it. */
export type CourtOffice = { court: "Superior Court of Justice" | "Ontario Court of Justice"; name: string; address: string[]; emails: string[]; url: string; from: string };
export type CourtOffices = { place: PlainLine[]; city: string; offices: CourtOffice[]; source: { url: string; readOn: string } };

/** The city in an address line such as "Barrie, Ontario L4M 3P2". */
const cityOfAddress = (lines: string[]) => lines.map((line) => /^([^,]+),\s*Ontario\b/i.exec(line)?.[1]?.trim() ?? "").find(Boolean) ?? "";

/** Anything about criminal court or bail, which a family card never lists (review 2026-10-13). */
export const NOT_FAMILY = /\b(?:criminal|crim|bail|trbc)\b|criminal|crim@/i;

/**
 * An Ontario Court of Justice entry's family emails, only where the saved list
 * marks them family: the entry's own name says "Family" (311 Jarvis Family), or
 * the email is labelled "Family" (Milton, Thunder Bay). Unlabelled entries are
 * not shown: the list does not say they take family cases, and some are
 * criminal-only (Ottawa.criminal@, yorkcrim@).
 */
function ocjFamilyEmails(courthouse: { city: string; emails: string[] }): string[] {
  if (/\bfamily\b/i.test(courthouse.city)) return courthouse.emails.filter((email) => !NOT_FAMILY.test(email));
  return courthouse.emails
    .filter((email) => /(?:^|\s)family\s*[–-]|[–-]\s*family\s*$/i.test(email))
    .map((email) => email.replace(/^\s*family\s*[–-]\s*/i, "").replace(/\s*[–-]\s*family\s*$/i, "").trim())
    .filter((email) => !NOT_FAMILY.test(email));
}

/**
 * Family court offices in the person's city: Superior Court locations with a
 * family service (its family address and family contacts only, never the
 * building's criminal lines), and Ontario Court of Justice entries the saved
 * list marks family.
 */
export function familyCourtOfficesIn(city: string): CourtOffice[] {
  const wanted = city.trim().toLowerCase();
  if (!wanted) return [];
  const torontoWanted = inTorontoRegion(city) === true;
  const sameCity = (name: string) => {
    const lower = name.replace(/\s*\(.*$/, "").trim().toLowerCase();
    return lower === wanted || (torontoWanted && inTorontoRegion(name) === true);
  };
  const scj: CourtOffice[] = COURT_LOCATIONS.flatMap((location) => {
    const family = location.services.filter((service) => service.court === "family");
    const place = cityOfAddress(location.address);
    if (!family.length || !sameCity(place)) return [];
    const emails = Array.from(new Set(family.flatMap((service) => service.contacts.map((contact) => contact.email).filter((email): email is string => Boolean(email) && !NOT_FAMILY.test(email ?? ""))))).slice(0, 2);
    return [
      {
        court: "Superior Court of Justice" as const,
        // A building that also hears criminal cases is named by its city, not its "Criminal & Family" title.
        name: NOT_FAMILY.test(location.name) ? `Superior Court of Justice family court, ${place}` : location.name,
        address: family.flatMap((service) => service.address).filter((line) => !NOT_FAMILY.test(line)),
        emails,
        url: location.url,
        from: location.slug,
      },
    ];
  });
  const ocj: CourtOffice[] = OCJ_COURTHOUSES.flatMap((courthouse) => {
    const inPlace = sameCity(courthouse.city) || (torontoWanted && /^toronto$/i.test(courthouse.region));
    const emails = inPlace ? ocjFamilyEmails(courthouse) : [];
    if (!emails.length || NOT_FAMILY.test(courthouse.city)) return [];
    return [{ court: "Ontario Court of Justice" as const, name: `Ontario Court of Justice, ${courthouse.city}`, address: [], emails, url: OCJ_SOURCE, from: courthouse.city }];
  });
  return [...scj, ...ocj];
}

/** The court office lines for a family step, or null for a step before any case exists. */
export function familyCourtOfficesFor(stepId: string, city: string): CourtOffices | null {
  if (!stepId.startsWith("family:") || stepId.startsWith("family:before-filing:")) return null;
  const place = stepId === "family:both:asking-to-change-final-order" ? FAMILY_CHANGE_PLACE : [FAMILY_SAME_PLACE];
  return { place, city: city.trim(), offices: familyCourtOfficesIn(city), source: { url: "https://www.ontariocourts.ca/scj/court-locations/all-court-locations/", readOn: COURT_LOCATIONS_RETRIEVED_AT } };
}

// ------------------------------------------------- the small claims / civil court office

/*
 * Walkthrough 2026-10-14: a real Ottawa Small Claims case was given only the
 * generic online-filing-portal lines, never the Ottawa courthouse itself,
 * although the city was already known from intake and the Ottawa small-claims
 * service entry (address and contacts) was already sitting in
 * courts/courtLocations.json, the same already-verified data the family
 * lookup above has used since 2026-10-13.
 *
 * Small Claims and civil cases are never heard at the Ontario Court of
 * Justice (that list is criminal/family only in this saved data), so unlike
 * the family lookup, there is no OCJ branch here -- only Superior Court of
 * Justice locations, filtered to the matching service.
 *
 * 2026-10-16 live bug: one case got the "where your case is heard" caution
 * (as separate, AI-grounded commentary tied to a specific before-filing
 * stage) and an otherwise-identical case -- same facts shape, only the
 * claim type differed -- did not, and went straight to this function's own
 * office list as if venue were already settled. That caution belongs here,
 * not upstream of it: it is this function the office list actually comes
 * from, on every route and whatever stage got resolved, so it is the one
 * place that can make the caution appear in every case rather than
 * whichever ones happen to pass through that other stage's own commentary.
 * SMALL_CLAIMS_PLACE below is this function's own static "where your case
 * is heard" line, carried on `place` the same way FAMILY_SAME_PLACE /
 * FAMILY_CHANGE_PLACE already is for family above -- a Small Claims
 * equivalent now exists (Rule 6.01 (1) is a clean, directly quotable
 * provision for this). Civil's own matching rule (r. 13.1.01 (2), "a county
 * with which there is a rational connection") still leans on a list of
 * factors in a different rule and is not yet sourced and verified here, so
 * civil cases still get only the courthouse address, not this caution.
 */

/**
 * Small Claims' "where your case is heard" caution (r. 6.01 (1)): the
 * person's own city settles nothing by itself -- venue is the territorial
 * division the cause of action arose in, or where a defendant lives or does
 * business. Plain-language companion to R_6_01_PLACE's verbatim quote, same
 * shape as FAMILY_SAME_PLACE above.
 */
const SMALL_CLAIMS_PLACE: PlainLine = {
  say: "The right Small Claims court location is the one where your claim arose, or where the defendant lives or carries on business -- not simply where you live. Living in a city does not, by itself, make that city the proper court location.",
  cite: R_6_01_PLACE,
};

/**
 * Small Claims or civil court offices in the person's city: Superior Court
 * locations with a matching service, named and addressed from that service's
 * own saved entry. When the saved service entry carries no address of its
 * own (civil's often doesn't -- the location's shared building address
 * covers it instead), the building's own address is used, since that is
 * still where the office is reached.
 */
export function civilCourtOfficesIn(court: "small-claims" | "civil", city: string): CourtOffice[] {
  const wanted = city.trim().toLowerCase();
  if (!wanted) return [];
  const torontoWanted = inTorontoRegion(city) === true;
  const sameCity = (name: string) => {
    const lower = name.replace(/\s*\(.*$/, "").trim().toLowerCase();
    return lower === wanted || (torontoWanted && inTorontoRegion(name) === true);
  };
  return COURT_LOCATIONS.flatMap((location) => {
    const matching = location.services.filter((service) => service.court === court);
    const place = cityOfAddress(location.address);
    if (!matching.length || !sameCity(place)) return [];
    const emails = Array.from(new Set(matching.flatMap((service) => service.contacts.map((contact) => contact.email).filter((email): email is string => Boolean(email))))).slice(0, 2);
    const serviceAddress = matching.flatMap((service) => service.address);
    return [
      {
        court: "Superior Court of Justice" as const,
        name: location.name,
        address: serviceAddress.length ? serviceAddress : location.address,
        emails,
        url: location.url,
        from: location.slug,
      },
    ];
  });
}

/**
 * The court office lines for a small-claims or civil step, or null for a step
 * before any case exists (no office to point to yet).
 *
 * Unlike civil and family, a Small Claims step id in STEP_PRACTICAL carries
 * no "small-claims:" prefix of its own (its keys are bare "before-filing:",
 * "plaintiff:", "defendant:", "both:" -- see STEP_PRACTICAL above); civil's
 * keys are all prefixed "civil:". So the two courts are checked differently
 * here, each against its own actual id shape.
 */
export function civilCourtOfficesFor(stepId: string, court: "small-claims" | "civil", city: string): CourtOffices | null {
  const beforeFiling = court === "small-claims" ? stepId.startsWith("before-filing:") : stepId.startsWith("civil:before-filing:");
  if (beforeFiling) return null;
  return {
    // 2026-10-16 live bug: the caution belongs with the office list itself,
    // not only with whatever stage's own separate commentary happened to
    // run first -- that is how one case got it and an otherwise-identical
    // one didn't. Carried on every small-claims office list regardless of
    // step or route; civil's not yet (see SMALL_CLAIMS_PLACE's own comment).
    place: court === "small-claims" ? [SMALL_CLAIMS_PLACE] : [],
    city: city.trim(),
    offices: civilCourtOfficesIn(court, city),
    source: { url: "https://www.ontariocourts.ca/scj/court-locations/all-court-locations/", readOn: COURT_LOCATIONS_RETRIEVED_AT },
  };
}

// ---------------------------------------------------------------- a time limit that has passed

/*
 * When a time limit that bars a claim has passed (walkthrough 2026-10-13: the
 * Toronto notice date passed with no plain warning, no mention of the rule's
 * own exceptions and no pointer to urgent help). Before anything else: a
 * statutory time limit that ends on a day the place is closed runs on to the
 * next day it is open.
 */
export const PASSED_CHECK_CLOSED: PlainLine = {
  say: "First check the date: if the place where this had to be done was closed on the last day, the time runs to the next day it is open.",
  cite: cite(
    "legislation-act-2006",
    "s. 89 (2)",
    "Time limits for registering or filing documents or for doing anything else that expire on a day when the place for doing so is not open during its regular hours of business are extended to include the next day the place is open during its regular hours of business.",
  ),
};

/**
 * The first day on or after `date` that is not a Saturday, a Sunday or a
 * holiday the site's calendar knows (holidays.ts, Legislation Act list) --
 * the day a public office keeping regular weekday hours is next open.
 */
export function nextWeekdayOpen(date: string): string {
  let day = date;
  for (let guard = 0; guard < 30; guard += 1) {
    const dow = dayOfWeek(day);
    if (dow !== 0 && dow !== 6 && !holidayFor(day, "legislation-act")) return day;
    day = addDays(day, 1);
  }
  return day;
}

/**
 * Whether a counted last day has passed, today (2026-10-13 review).
 *
 * A statutory limit (Legislation Act regime) can end on a Saturday or a
 * holiday, but s. 89 (2) runs it to the next day the place for doing it is
 * open (PASSED_CHECK_CLOSED quotes it). So a statutory limit is "passed" only
 * when the next weekday that is not a holiday is also before today; while it
 * is not, `runsTo` names that day, and the card says the counted day and that
 * if the office was closed the time runs to it. A rules-regime date is
 * already extended past weekends and holidays by the engine, so it passes the
 * day after it.
 */
export function limitPassedState(limit: { date: string; statutory?: boolean }, today: string): { passed: boolean; runsTo: string | null } {
  if (!(limit.date < today)) return { passed: false, runsTo: null };
  if (!limit.statutory) return { passed: true, runsTo: null };
  const open = nextWeekdayOpen(limit.date);
  return open < today ? { passed: true, runsTo: null } : { passed: false, runsTo: open };
}

/** The line for a statutory counted day that has passed while the next open day has not (limitPassedState's runsTo). */
export function closedDayLine(countedDay: string, runsTo: string, today = ""): PlainLine {
  // "Act today" only when today is that next open day (final review, 2026-10-13).
  const act = !today || runsTo === today ? "Act today." : "Act by then, sooner if you can.";
  return {
    say: `The last day counted for this was ${formatLongDate(countedDay)}. If the place where this had to be done was closed that day, the time runs to the next day it is open: ${formatLongDate(runsTo)}, if it keeps its regular weekday hours. ${act}`,
    cite: PASSED_CHECK_CLOSED.cite,
  };
}

/**
 * Today's date in Ontario (walkthrough run 38500825561, 2026-10-13 22:30 in
 * Toronto: a browser clock on UTC read 14 October and called a Toronto notice
 * passed whose next open day was still today). The deadlines are Ontario
 * deadlines, so the day is Ontario's day.
 */
export function todayInOntario(now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
    const iso = `${part("year")}-${part("month")}-${part("day")}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  } catch {
    // No time-zone data: fall back to the device's own day.
  }
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * The words the card shows for a counted last day (walkthrough run
 * 38500825561, SW: "the last day for this is Saturday 10 October 2026. That
 * date has already passed." while s. 89 (2) may run it to Tuesday 13
 * October). For a statutory limit whose counted day is a day a public office
 * keeping weekday hours is closed, the counted day is never called THE last
 * day: the line says the counted day and the next open day, in the same
 * conditional words as the passed box (PASSED_CHECK_CLOSED), and whether that
 * day has gone by too. Every other limit keeps the engine's own statement.
 */
export type DeadlineLine = { statement: string | null; closedDay: PlainLine | null; passed: boolean };
export function deadlineLineFor(limit: { date: string; statutory?: boolean; statement: string }, today: string): DeadlineLine {
  const state = limitPassedState(limit, today);
  const open = limit.statutory ? nextWeekdayOpen(limit.date) : limit.date;
  if (!limit.statutory || open === limit.date) return { statement: limit.statement, closedDay: null, passed: state.passed };
  if (state.runsTo) return { statement: null, closedDay: closedDayLine(limit.date, state.runsTo, today), passed: false };
  if (state.passed) {
    return {
      statement: null,
      closedDay: {
        say: `The last day counted for this was ${formatLongDate(limit.date)}. If the place where this had to be done was closed that day, the time ran to the next day it was open: ${formatLongDate(open)}, if it keeps its regular weekday hours. That day has passed too.`,
        cite: PASSED_CHECK_CLOSED.cite,
      },
      passed: true,
    };
  }
  // Not yet reached: the counted day, and that a closed office runs it on.
  return {
    statement: null,
    closedDay: {
      say: `The last day counted for this is ${formatLongDate(limit.date)}. If the place where this has to be done is closed that day, the time runs to the next day it is open: ${formatLongDate(open)}, if it keeps its regular weekday hours. Earlier is safer.`,
      cite: PASSED_CHECK_CLOSED.cite,
    },
    passed: false,
  };
}

/** The card's words when a time limit that bars the claim has passed (the passed box's first line). */
export const PASSED_BAR_WARNING =
  "Missing this time limit can stop the claim from going ahead. Act now, and talk to a lawyer or paralegal as soon as you can.";

/**
 * What every page that lists a counted deadline says about where it stands
 * today (walkthrough run 2026-10-14, SW: the Overview card said the Toronto
 * notice's counted Saturday ran to Tuesday 13 October "if it keeps its regular
 * weekday hours. That day has passed too", while the Timeline and the printable
 * Case file showed "2026-10-10" and the engine's "the last day for this is
 * Saturday 10 October 2026" with no word that it had passed). The Timeline,
 * the Deadlines view and the Case file take their words from here, and the
 * card's from deadlineLineFor, which this calls: one test, one set of words.
 *
 * `statement` replaces the engine's sentence (it IS the engine's sentence
 * unless the counted day is a closed day for a statutory limit); `passedLine`
 * is the card's "That date has already passed." beside a kept statement;
 * `barWarning` is the passed box's warning for a limit that bars the claim.
 */
export type DeadlineStanding = {
  statement: string;
  cite: RuleCitation | null;
  passed: boolean;
  /** The next open day is still to come or is today: the card's "Act ..." words are in `statement`. */
  urgent: boolean;
  passedLine: string | null;
  barWarning: string | null;
};
export function deadlineStandingFor(
  limit: { date: string; statutory?: boolean; statement: string; consequence?: string },
  today: string,
): DeadlineStanding {
  const line = deadlineLineFor(limit, today);
  return {
    statement: line.closedDay?.say ?? line.statement ?? limit.statement,
    cite: line.closedDay?.cite ?? null,
    passed: line.passed,
    urgent: !line.passed && Boolean(line.closedDay?.say.includes("Act ")),
    passedLine: line.statement && line.passed ? "That date has already passed." : null,
    barWarning: line.passed && limit.consequence === "bars-the-claim" ? PASSED_BAR_WARNING : null,
  };
}

/**
 * The standing as the Timeline, Deadlines view and Case file carry it
 * (organisation route -> buildTimeline's deadlineRules): a stage-map limit and
 * the engine's counted entry, with Ontario's today. Pure, so test:next-step
 * checks the pages' words against the card's over many dates.
 */
export function timelineStandingFor(
  limit: { regime?: string; consequence?: string },
  entry: { date: string; statement: string },
  today: string,
  nameOf: (rule: RuleCitation) => string,
): { statement: string; passed: boolean; urgent: boolean; lines: string[]; rule: string | null; ruleQuote: string | null } {
  const standing = deadlineStandingFor(
    { date: entry.date, statutory: limit.regime === "legislation-act", statement: entry.statement, consequence: limit.consequence },
    today,
  );
  return {
    statement: standing.statement,
    passed: standing.passed,
    urgent: standing.urgent,
    lines: [standing.passedLine, standing.barWarning].filter((line): line is string => Boolean(line)),
    rule: standing.cite ? `${nameOf(standing.cite)}, ${standing.cite.pinpoint}` : null,
    ruleQuote: standing.cite?.quote ?? null,
  };
}

/*
 * The rule beside each sentence of a deadline that says when service counts
 * (walkthrough run 38500825561, FR: "Papers left with you after 4 p.m. count
 * as served the next day" was shown with no rule beside it, though r. 6 (11.1)
 * was among the deadline's own exceptions). Each sentence is matched to the
 * subrule it restates, and the quote is taken from the deadline's own
 * rule and exceptions (the stage map), so a sentence whose rule the stage
 * does not carry gets nothing rather than a quote from elsewhere.
 */
const SERVED_WHEN: { sentence: RegExp; sourceId: RuleCitation["sourceId"]; pinpoint: string }[] = [
  { sentence: /Papers left with (?:you|the respondent) after 4 p\.m\. count as served the next day\./, sourceId: "family-law-rules", pinpoint: "r. 6 (11.1)" },
  { sentence: /Papers left at (?:your|the) home with an adult, with a copy mailed, count as served on the fifth day after mailing\./, sourceId: "family-law-rules", pinpoint: "r. 6 (11.2)" },
  { sentence: /If that day is one when court offices are closed, service counts on the next open day\./, sourceId: "family-law-rules", pinpoint: "r. 6 (11.3)" },
  { sentence: /The general rule for mail is the fifth day after mailing\./, sourceId: "family-law-rules", pinpoint: "r. 6 (7)" },
  { sentence: /If the notice came by mail, it counts as served on the fifth day after mailing\./, sourceId: "family-law-rules", pinpoint: "r. 6 (7)" },
  { sentence: /If it came by email, it counts as served on the date in the email, or the next day if sent after 4 p\.m\./, sourceId: "family-law-rules", pinpoint: "r. 6 (11)" },
  { sentence: /A document served after 4 p\.m\., or on a Saturday, Sunday or holiday, counts as served on the next day that is not a holiday\./, sourceId: "rules-of-civil-procedure", pinpoint: "r. 3.01 (1) (d)" },
];
export function servedWhenLines(qualifier: string, rules: RuleCitation[]): PlainLine[] {
  const out: PlainLine[] = [];
  for (const entry of SERVED_WHEN) {
    const said = entry.sentence.exec(qualifier)?.[0];
    const rule = rules.find((item) => item.sourceId === entry.sourceId && item.pinpoint === entry.pinpoint);
    if (said && rule) out.push({ say: said, cite: rule });
  }
  return out;
}

/** The exceptions a rule itself gives to its bar: the quotes that say missing it "is not a bar". */
export function notABarExceptions(exceptions: RuleCitation[]): RuleCitation[] {
  return exceptions.filter((exception) => /\bis not a bar\b/i.test(exception.quote));
}

/** Every plain line added for the card on 2026-10-13, so test:next-step-practical reads each quote back. */
export const MORE_CARD_LINES: PlainLine[] = [
  ...Object.values(NOTICE_HOW).flatMap((lines) => lines ?? []),
  FINANCIAL_STATEMENT_WHEN,
  FINANCIAL_STATEMENT_WHEN_RESPONDING,
  FINANCIAL_STATEMENT_WHEN_RESPONDING_MOTION,
  PARENTING_AFFIDAVIT_WHEN,
  MIP_SUPPORT_ONLY_CHANGE,
  MIP_CHANGE_SUBJECT_UNKNOWN,
  FAMILY_SAME_PLACE,
  ...FAMILY_CHANGE_PLACE,
  SMALL_CLAIMS_PLACE,
  PASSED_CHECK_CLOSED,
  CLAIM_AFTER_NOTICE.civil.start,
  CLAIM_AFTER_NOTICE["small-claims"].start,
  CROWN_WAIT.only,
  CROWN_WAIT.among,
  ...GARNISHEE_NOT_NAMED,
];

// ---------------------------------------------------------------- what the card shows

/** A form that leads the case's forms catalogue, with what to call it there. */
export type LeadForm = { number: string; label: "For your step" | "After the notice" | "Optional: your own claim" };

export type PracticalView = {
  /** `note`: the condition a rule sets for this form, shown beside it (Form 13 on a responding step). */
  forms: { court: PracticalCourt; number: string; note?: PlainLine }[];
  /** Forms a rule needs only with a claim the person's words do not name, with that rule. Shown folded. */
  formsIfClaimed: { court: PracticalCourt; number: string; when: PlainLine }[];
  fees: Fee[];
  feeNotes: PlainLine[];
  /** The notes lead the fees: the person's words point to a case the fee exemption covers. */
  feeNotesFirst: boolean;
  feeWaiver: PlainLine | null;
  /**
   * Parenting-only words (parentingOnly): the fee amounts, the branch's fee
   * line, the divorce fee and the waiver, folded under FEES_IF_CLAIMED_LABEL
   * while the no-fee rule leads. Null otherwise.
   */
  feesIfClaimed: { fees: Fee[]; notes: PlainLine[]; waiver: PlainLine | null } | null;
  filing: PlainLine[];
  /** Family: where the case is, and the family court offices in the person's city. */
  courtOffices: CourtOffices | null;
  serving: PlainLine[];
  also: RuleCitation[];
  /** How to give each notice the step's rules require, for the notices that fit the person's words. */
  noticeHow: PlainLine[];
  /** After a notice before suing: the form that starts the court case, and its fee (shown after the notice). */
  afterNotice: PlainLine[];
  /**
   * The forms of this court that lead the case's forms catalogue: the step's
   * own, then the form that starts the court case after a notice step
   * (walkthrough 2026-10-14, SW), each with its label: the claim form is
   * "After the notice", never "For your step" (legal review 2026-10-14).
   * Folded forms are not among them.
   */
  leadForms: LeadForm[];
  /**
   * A garnishment step whose story names the debtor's work only vaguely: the
   * person's own sentence, and what the rules say about naming the garnishee
   * and examining the debtor (garnisheeNotesFor). Null otherwise.
   */
  garnishee: { quote: string; lines: PlainLine[] } | null;
};

/**
 * What the card shows for a step. `city` picks the Toronto or the other
 * portal; with no city, both are shown, since guessing would send a person to
 * the wrong portal. Null when the step has nothing to file, serve or pay.
 */
/**
 * Forms only the person bringing a motion files. On an "either side" step, a
 * person responding sees their own forms first (held-back walkthrough,
 * 2026-10-09: a defendant served with a summary judgment motion was shown
 * "Form 37A -- Notice of Motion" first). Reordered, never removed.
 */
const MOVING_PARTY_FORMS: Record<PracticalCourt, ReadonlySet<string>> = {
  "small-claims": new Set(["15A"]),
  civil: new Set(["37A"]),
  family: new Set(["14"]),
};

/**
 * Which of a step's notice rules fit the person's words (2026-10-13,
 * walkthrough: a woman hurt on a Toronto sidewalk was shown the Crown and
 * libel notices beside the City of Toronto one). Only rules whose source
 * appears here are filtered; when the words fit none of them, every one is
 * shown, so a gap in these patterns never hides a notice that might apply.
 */
const PUBLIC_WAY = /\b(?:city|town|township|municipal\w*|sidewalk|road|street|highway|bridge|pothole)\b/i;

/*
 * Words that name Toronto without placing anything in it (review of
 * f71a316, 2026-10-14): organisations named after the city, and where the
 * person came from. Taken out before any place is read.
 */
const NOT_A_PLACE =
  /\b(?:toronto[-\s]dominion(?:\s+bank)?|td(?:\s+bank|\s+canada\s+trust)?|toronto\s+hydro|toronto\s+police(?:\s+service)?|toronto\s+transit(?:\s+commission)?|ttc|toronto\s+star|toronto\s+sun|toronto\s+maple\s+leafs|toronto\s+raptors|toronto\s+blue\s+jays|university\s+of\s+toronto|toronto\s+metropolitan\s+university|toronto\s+general(?:\s+hospital)?|toronto\s+western(?:\s+hospital)?|toronto\s+pearson)\b|\b(?:moved|came|come|relocated|originally|am|is|was|were|are)\s+(?:here\s+)?from\s+(?:the\s+)?(?:city\s+of\s+)?toronto\b|\bfrom\s+toronto\b/gi;

/*
 * A place name followed by a street word is a street, not the place
 * ("Kingston Road" and "Markham Road" are in Toronto; "East York Avenue" can
 * be in Markham). Taken out before any place is read.
 */
const STREET_WORD = "(?:road|rd|street|st|avenue|ave|boulevard|blvd|drive|dr|lane|ln|way|crescent|cres|parkway|line|sideroad|trail)\\b\\.?";
const TORONTO_NAMES = ["toronto", "scarborough", "etobicoke", "north\\s+york", "east\\s+york"];

/** The person's words with organisation names and street names taken out, for reading a place. */
function placeProse(words: string): string {
  const names = [...TORONTO_NAMES, ...PLACE_NAMES].join("|");
  return proseOf(words)
    .replace(NOT_A_PLACE, " ")
    .replace(new RegExp(`\\b(?:${names})\\s+${STREET_WORD}`, "gi"), " ");
}

const TORONTO_PLACE = new RegExp(`\\b(?:${TORONTO_NAMES.join("|")})\\b`, "i");

/*
 * A named Ontario place that is not Toronto, or the word for a kind of
 * municipality Toronto is not (a town, township, village or county).
 */
const OTHER_PLACE = new RegExp(
  `\\b(?:town|township|village|county)\\b|\\b(?:${PLACE_NAMES.filter(
    (name) => inTorontoRegion(name.replace(/\\s\+/g, " ").replace(/\\\./g, ".")) === false,
  ).join("|")})\\b`,
  "i",
);

/**
 * Where the municipality in the person's words is: "toronto" when only
 * Toronto is named; "elsewhere" when only another Ontario place (or kind of
 * municipality) is named; "unknown" when both are named ("I live in Toronto
 * but slipped in Ottawa"), so both laws stay in play. When neither is named,
 * the saved city decides; with no saved city, "unknown". Organisation names
 * ("Toronto Hydro", "TD") and street names ("Kingston Road") never count.
 * Review of f71a316, 2026-10-14.
 */
export type MunicipalPlace = "toronto" | "elsewhere" | "unknown";
export function municipalPlaceOf(words: string, city = ""): MunicipalPlace {
  const prose = placeProse(words);
  const toronto = TORONTO_PLACE.test(prose);
  const other = OTHER_PLACE.test(prose);
  if (toronto && other) return "unknown";
  if (toronto) return "toronto";
  if (other) return "elsewhere";
  const saved = inTorontoRegion(city);
  return saved === true ? "toronto" : saved === false ? "elsewhere" : "unknown";
}

/**
 * Toronto in the person's saved city or in their own words (organisation and
 * street names aside). The Toronto half of the notice filter below.
 */
export function torontoInWords(words: string, city = ""): boolean {
  return inTorontoRegion(city) === true || TORONTO_PLACE.test(placeProse(words));
}

/**
 * A person who FELL ON a public way, read sentence by sentence (re-review of
 * 8792939, 2026-10-14: word lists over the whole story both fired for a dog
 * bite on a sidewalk and stayed silent for a sidewalk in front of a building).
 *
 * Why only this: City of Toronto Act s. 42 (6) and Municipal Act s. 44 (10)
 * bar only an action "under subsection (2)", the municipality's default in
 * keeping a highway or bridge in repair (s. 42 (1)-(2), s. 44 (1)-(2)).
 *
 * The rule, in one sentence of the person's words (or a sentence and the one
 * before it, when it says "I tripped on it"):
 *   1. the person fell: slipped, tripped, fell, stumbled, lost their footing,
 *      rolled or twisted an ankle -- with the person (I, we, my son ...) before
 *      the verb, so "a branch fell on my car" is not a fall;
 *   2. ON a public way: the way word is what they fell on -- reached from the
 *      verb through prepositions ("slipped on ice on the sidewalk"), or named
 *      first with the verb taking no other place ("On a cracked sidewalk, I
 *      tripped"), or a named street right after the fall ("slipped on Queen
 *      Street") -- never a street in the same sentence that is only an
 *      address ("fell behind on rent for my apartment on Main Street");
 *   3. and nothing in that sentence says it happened somewhere else (in a
 *      store or mall, on stairs or a deck, in a parking lot or driveway, on a
 *      bus or streetcar, on their property, at school, at a cottage, a
 *      provincial highway) or that something else caused it (a car accident,
 *      hit by a car, a bite or a dog that knocked them, a cyclist, pushed,
 *      assaulted, attacked, the police pushing, a shoe that broke, their own
 *      feet when no defect in the way is named).
 * Every fall verb in the sentence is tried ("Last fall I slipped on ...").
 * "Broke" or "hurt" alone is never enough. The place need not be known: a
 * fall on a sidewalk with no city named gets the line with both Acts.
 */
const FALL =
  /\b(?:slip(?:ped|ping|s)?|trip(?:ped|ping|s)?|fell|fall(?:en|ing)?|stumbl\w*|lost\s+(?:my|his|her|their|our)\s+footing|(?:rolled|twisted)\s+(?:my|his|her|their)\s+ankle|caught\s+(?:my|his|her|their)\s+(?:foot|toe|heel|shoe|boot)|went\s+down)\b/gi;
/** The person, before the verb: "I", "we", "my son", "my elderly father" (one word allowed after "my"). */
const FALLER =
  /\b(?:i|we|he|she|they|my\s+(?:[a-z]+\s+)?(?:son|daughter|wife|husband|partner|mother|father|mom|mum|dad|child|kid|grandmother|grandfather|grandma|grandpa|friend|aunt|uncle|sister|brother))\b/i;
/** Or the verb opens the sentence ("Slipped on ice on a city sidewalk ..."). */
const OPENS = /^\s*(?:(?:and|then|so|but)\s+)?$/i;
const WAY = "(?:sidewalks?|side\\s+walks?|roads?|roadway|streets?|curbs?|kerbs?|crosswalks?|cross\\s+walks?|potholes?|boulevards?)";
const WAY_WORD = new RegExp(`\\b${WAY}\\b`, "i");
/*
 * What the person fell ON: right after the verb (an adverb allowed), a chain
 * of up to four phrases, each a preposition, an optional article and up to
 * three lower-case words, the last ending in the way word. Lower-case only,
 * so "on Main Street" (a capitalised name) never reaches "Street" this way:
 * a named street counts only right after the fall (NAMED_STREET_FALL). And
 * "with", "behind", "asleep", "out of", "in love" never start or continue
 * the chain, so "fell in love with a house on Maple Street" and "fell
 * asleep at the wheel on the road" are not falls on a way (re-review of
 * 41a8364).
 */
const PREP = "(?:on|onto|into|over|in|off|along|across|crossing|at|from|near|outside|of|by|down|covering|coating)\\s+(?:(?:the|a|an|some|my|our|this|that|his|her|their)\\s+)?";
/*
 * Words inside a phrase: never a clause or an idiom ("while working on a
 * house on the street", "on hard times living on the street"): no "-ing"
 * word and no joining word. And a phrase BEFORE the last one must name a
 * surface the person fell on ("slipped on black ice on the sidewalk"), so
 * the chain cannot wander from "a hose in my neighbour's yard" or "drugs" to
 * a street (re-review of db40587).
 */
const WORDS = "(?:(?!(?:while|when|after|because|before|and|to|for|but|so|on|onto|into|over|in|off|at|by|from|near|outside|along|across)\\b)[a-z][a-z'’-]*(?<!ing)\\s+){0,3}?";
const SURFACE = "(?:(?:black\\s+|wet\\s+|thin\\s+)?ice|snow|slush|pavement|asphalt|concrete|edge|piece|part|corner|middle|side|lip|plates?|covers?|grates?|manholes?|utility\\s+covers?|(?:a\\s+)?(?:patch|sheet|ridge|chunk)\\s+of\\s+(?:black\\s+)?ice|cracks?|holes?|slabs?|debris|leaves|gravel|sand|water|a\\s+puddle|puddles?)";
const SURFACE_PHRASE = `${PREP}(?:[a-z][a-z'’-]*(?<!ing)\\s+){0,2}?${SURFACE}\\s+`;
const ON_THE_WAY = new RegExp(`^\\s+(?:(?:down|over|badly|hard|backwards|forwards?|again)\\s+)?(?:${SURFACE_PHRASE}){0,2}${PREP}${WORDS}${WAY}\\b`);
const NAMED_STREET_FALL = /^\s+(?:(?:on\s+(?:the\s+)?ice|on\s+(?:some\s+)?snow|badly)\s+)?(?:on|along|crossing)\s+(?:[A-Z][a-z]+\s+){1,3}(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Drive|Dr)\b/;
/*
 * Or the way came first in the sentence and the verb takes no other place:
 * "On a cracked sidewalk outside my building, I tripped and ...", "the
 * plow left a ridge of ice on the sidewalk and I slipped on October 2",
 * "my bike hit a pothole on Dundas and I fell".
 */
const WAY_BEFORE = new RegExp(`\\b(?:on|onto|in|into|along|across|over)\\s+(?:the|a|an|some)\\s+(?:[a-z][a-z'’-]*\\s+){0,3}${WAY}\\b|\\bpotholes?\\b`, "i");
/** A defective way named before the fall, with no preposition: "There was a cracked sidewalk outside my building, I tripped". */
const DEFECTIVE_WAY_BEFORE = new RegExp(`\\b(?:a|an|the)\\s+(?:[a-z]+\\s+){0,2}?(?:uneven|broken|cracked|raised|lifted|icy|unsalted|slippery|sunken|heaved)\\s+(?:[a-z]+\\s+){0,1}${WAY}\\b`, "i");
const NO_OTHER_PLACE_AFTER =
  /^\s*(?:$|[,.;!?]|and\b|then\b|but\b|(?:down|over|badly|hard)\b|on\s+(?:(?:january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\d))/i;
const REFERS_BACK = /^\s+(?:on|over|into|in)\s+(?:it|that|there|them)\b/i;
const ELSEWHERE_IN_SENTENCE =
  /\b(?:in|inside|at|into)\s+(?:the\s+|a\s+|an\s+|my\s+|their\s+|his\s+|her\s+)?(?:[\w'’-]+\s+){0,2}(?:store|shop|mall|supermarket|grocery|restaurant|plaza|community\s+cent(?:re|er)|construction\s+site|cottage|arena|condo\s+complex|hospital|yard|backyard)\b|\bon\s+(?:the\s+|a\s+|their\s+|his\s+|her\s+|my\s+|our\s+)?(?:[\w'’-]+\s+){0,2}(?:stairs|steps|staircase|stairwell|deck|porch|track)\b|\b(?:in|on|at|into)\s+(?:the\s+|a\s+|their\s+|my\s+|his\s+|her\s+)?(?:[\w'’-]+\s+){0,2}(?:parking\s+(?:lot|garage)|driveway)\b|\b(?:on|in|off|onto|boarding|getting\s+(?:off|on))\s+(?:the\s+|a\s+)?(?:ttc\s+)?(?:bus|streetcar|subway|train)\b|\b(?:bus|streetcar|subway|train)\s+(?:braked|stopped|lurched|jerked|started|moved|pulled)\b|\bon\s+(?:their|his|her)\s+(?:property|land|premises)\b|\bprivate\b|\bcondo\s+complex\b|\b(?:at|on|around)\s+the\s+(?:[\w'’-]+\s+){0,2}track\b|\bat\s+(?:my\s+|his\s+|her\s+|the\s+|their\s+)?school\b|\bschool\s+board\b|\b(?:deck|cottage|roof|ladder|yard|backyard|hospital)\b|\b(?:highway|hwy)\s*\d+|\bqew\b|\bprovincial\b/i;
/*
 * Another cause, named as the cause: a bite, a dog that knocked or jumped,
 * the police pushing -- never "walking my dog" or "called the police".
 */
const OTHER_CAUSE_IN_SENTENCE =
  /\bcar\s+accident\b|\b(?:hit|struck|knocked\s+(?:down|over)?)\s+(?:me\s+)?by\s+(?:a\s+|the\s+)?(?:car|truck|vehicle|van|bus|cyclist|bike|bicycle|dog)\b|\b(?:bit|bitten|bites?)\b|\bdogs?\s+(?:knocked|jumped|pulled|ran\s+into|tripped|lunged)\b|\bcyclist\b|\bknocked\s+(?:me|him|her|us)\b|\b(?:pushed|shoved|tackled|punched)\b|\bassault\w*|\battack\w*|\bpolice\s+(?:officers?\s+)?(?:pushed|shoved|tackled|grabbed|knocked|threw|tripped)\b|\bby\s+(?:the\s+|a\s+)?police\b|\b(?:my|his|her)\s+(?:shoe|heel|boot|sandal|flip-?flop)s?\s+(?:broke|snapped|came\s+off|gave\s+way)\b|\bbecause\s+(?:of\s+)?(?:my|his|her)\s+(?:shoe|heel|boot)s?\b/i;
/** "My own feet" is the cause only when the sentence names no defect in the way. */
const OWN_FEET = /\bown\s+feet\b/i;
const DEFECT = /\b(?:uneven|broken|cracked|raised|lifted|icy|ice|potholes?|holes?|cracks?|unsalted|slippery|sunken|heaved)\b/i;

/** The sentences of the person's words. */
function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function fallOnWay(sentence: string, before: string): boolean {
  for (const fall of sentence.matchAll(FALL)) {
    const at = fall.index ?? 0;
    const lead = sentence.slice(0, at);
    if (!FALLER.test(lead) && !OPENS.test(lead)) continue;
    // "a slip on my windshield", "the trip": a noun, not a fall.
    if (/\b(?:a|an|the|my|his|her|our|their|this|that)\s*$/i.test(lead)) continue;
    const after = sentence.slice(at + fall[0].length);
    let scope = "";
    if (ON_THE_WAY.test(after) || NAMED_STREET_FALL.test(after)) scope = sentence;
    else if ((WAY_BEFORE.test(lead) || DEFECTIVE_WAY_BEFORE.test(lead)) && NO_OTHER_PLACE_AFTER.test(after)) scope = sentence;
    // "I tripped over my own feet because the sidewalk was so uneven": the
    // feet are named, but so is a defect in the way, and the way is the cause.
    else if (OWN_FEET.test(after) && DEFECT.test(sentence) && WAY_WORD.test(after)) scope = sentence;
    else if (REFERS_BACK.test(after) && WAY_WORD.test(before)) scope = `${before} ${sentence}`;
    if (!scope) continue;
    if (ELSEWHERE_IN_SENTENCE.test(scope) || OTHER_CAUSE_IN_SENTENCE.test(scope)) continue;
    if (OWN_FEET.test(scope) && !DEFECT.test(scope)) continue;
    return true;
  }
  return false;
}

export function municipalWayInjury(words: string, _city = ""): boolean {
  const sentences = sentencesOf(proseOf(words));
  return sentences.some((sentence, at) => fallOnWay(sentence, at > 0 ? sentences[at - 1] : ""));
}

const NOTICE_FITS: Partial<Record<RuleCitation["sourceId"], (story: string, city: string) => boolean>> = {
  // Both fit when the words name Toronto and another place (municipalPlaceOf "unknown").
  "city-of-toronto-act-2006": (story, city) => PUBLIC_WAY.test(story) && municipalPlaceOf(story, city) !== "elsewhere" && torontoInWords(story, city),
  "municipal-act-2001": (story, city) => PUBLIC_WAY.test(story) && municipalPlaceOf(story, city) !== "toronto",
  "occupiers-liability-act": (story) => /\b(?:snow|ice|icy)\b/i.test(story) && /\b(?:property|premises|store|shop|parking|lot|driveway|building|landlord|mall|restaurant|plaza)\b/i.test(story),
  // Not "province" alone: a saved address says which province (walkthrough
  // run 38482600205: a Toronto sidewalk fall led with the Crown's notice).
  "crown-liability-and-proceedings-act-2019": (story) =>
    /\b(?:the crown|ontario government|government of ontario|provincial government|the province|ministry|minister|opp|ontario provincial police)\b/i.test(story),
};

/**
 * The person's words without the field names of saved answers ("city":,
 * "province":), so a field's name never counts as something they said.
 */
function proseOf(words: string): string {
  return words.replace(/"[A-Za-z_][A-Za-z0-9_]*"\s*:/g, " ");
}

/**
 * Whether a time limit about a notice fits the person's words, read from the
 * limit's own "If ..." line: "fits", "not", or null when the line is not about
 * one of these notices. Uses the same tests as the notice rules above.
 */
const LIBEL = /\b(?:libel\w*|slander\w*|defam\w*|newspaper|broadcast|radio|television|tv)\b/i;
export function noticeFit(what: string, words: string, city = ""): "fits" | "not" | null {
  const story = proseOf(words);
  if (!story.trim()) return null;
  const test = (fits: boolean) => (fits ? "fits" : "not");
  if (/\bCity of Toronto\b/.test(what)) return test(NOTICE_FITS["city-of-toronto-act-2006"]!(story, city));
  if (/\bmunicipality\b/i.test(what)) return test(NOTICE_FITS["municipal-act-2001"]!(story, city));
  if (/snow or ice on someone's premises/i.test(what)) return test(NOTICE_FITS["occupiers-liability-act"]!(story, city));
  if (/\bOntario Crown\b/.test(what)) return test(NOTICE_FITS["crown-liability-and-proceedings-act-2019"]!(story, city));
  if (/\blibel\b/i.test(what)) return test(LIBEL.test(story));
  return null;
}

/**
 * The time limits a page keeps for the person's notices: when any limit's
 * notice fits their words, the notices that do not fit are left out (a Toronto
 * sidewalk fall keeps the City of Toronto notice and drops the general
 * municipal, Crown, occupier and libel ones); when none fits, all are kept.
 * Limits that are not about a notice are always kept. The one filter for the
 * Overview card (cardLimits), its passed-date box, the Case file and the
 * Timeline (review 2026-10-13: the other tabs counted every notice).
 */
export function keptForNotices<T extends { what: string }>(items: readonly T[], words: string, city = ""): T[] {
  const anyFits = items.some((item) => noticeFit(item.what, words, city) === "fits");
  return anyFits ? items.filter((item) => noticeFit(item.what, words, city) !== "not") : [...items];
}

/** Which notice a limit's own "If ..." line is about, read the same way noticeFit reads it; null when it is not about one. */
export type NoticeKind = "toronto" | "municipality" | "occupier" | "crown" | "libel";
export function noticeKindOf(what: string): NoticeKind | null {
  if (/\bCity of Toronto\b/.test(what)) return "toronto";
  if (/\bmunicipality\b/i.test(what)) return "municipality";
  if (/snow or ice on someone's premises/i.test(what)) return "occupier";
  if (/\bOntario Crown\b/.test(what)) return "crown";
  if (/\blibel\b/i.test(what)) return "libel";
  return null;
}

/** True when the notice filter left some notice out for these words (keptForNotices kept fewer than all). */
export function noticesNarrowed(items: readonly { what: string }[], words: string, city = ""): boolean {
  return keptForNotices(items, words, city).length < items.length;
}

/*
 * The step's title once the notice filter has narrowed the notices to one
 * kind (walkthrough run 38500825561, SW: "Your step: Do I have to send a
 * notice before I sue the government, the city, a property owner or a
 * newspaper?" for a Toronto sidewalk fall). Plain words that say only what
 * the kept notice's own rule says: no action is brought unless that written
 * notice is given (s. 42 (6), s. 44 (10), s. 6.1 (1), CLPA s. 18 (1),
 * Libel and Slander Act s. 5 (1)).
 */
const NOTICE_TITLES: Record<NoticeKind, string> = {
  toronto: "Giving written notice to the City of Toronto before you sue",
  municipality: "Giving written notice to the municipality before you sue",
  occupier: "Giving written notice to the occupier or their snow-removal contractor before you sue",
  crown: "Serving notice of your claim on the Ontario Crown before you sue",
  // Libel and Slander Act s. 5 (1): the notice goes to the defendant (review 2026-10-13).
  libel: "Giving written notice to the person you will sue, before suing for libel in a newspaper or broadcast",
};
export function noticeStepTitle(items: readonly { what: string }[], words: string, city = ""): string | null {
  if (!noticesNarrowed(items, words, city)) return null;
  const kinds = new Set(keptForNotices(items, words, city).map((item) => noticeKindOf(item.what)).filter((kind): kind is NoticeKind => kind !== null));
  return kinds.size === 1 ? NOTICE_TITLES[[...kinds][0]] : null;
}

/** A step's extra rule lines, narrowed to the notices the person's words fit (all of them when the words fit none). */
export function alsoFor(also: RuleCitation[], words = "", city = ""): RuleCitation[] {
  const story = proseOf(words);
  if (!story.trim()) return also;
  const judged = also.filter((cite) => NOTICE_FITS[cite.sourceId]);
  const fitting = judged.filter((cite) => NOTICE_FITS[cite.sourceId]!(story, city));
  if (judged.length === 0 || fitting.length === 0) return also;
  return also.filter((cite) => !NOTICE_FITS[cite.sourceId] || fitting.includes(cite));
}

/**
 * A list of rules with the notice rules the person's words do not fit left
 * out, once their words fit some notice (walkthrough run 38500825561, SW: the
 * Toronto card's "What can happen next" quoted the Crown's s. 18 (1) notice).
 * Rules that are not about a notice are always kept; with words that fit no
 * notice, nothing is left out. An empty result means every rule was a notice
 * the words do not fit.
 */
export function rulesForWords(rules: RuleCitation[], words = "", city = ""): RuleCitation[] {
  const story = proseOf(words);
  if (!story.trim()) return rules;
  const fitting = new Set(Object.entries(NOTICE_FITS).filter(([, fits]) => fits!(story, city)).map(([id]) => id));
  if (fitting.size === 0) return rules;
  return rules.filter((rule) => !NOTICE_FITS[rule.sourceId] || fitting.has(rule.sourceId));
}

/** A step's lines without those whose `about` the person's words do not match (all of them with no words). */
function linesAbout(lines: PlainLine[], story: string, municipalNotice = false): PlainLine[] {
  const prose = proseOf(story);
  if (!prose.trim()) return lines;
  return lines.filter((line) => !line.about || (municipalNotice && line.about === MUNICIPAL_PARTY) || line.about.test(prose));
}

/** A notice step on the case that is a notice to a municipality (review 2026-10-13: then the municipal service line always shows). */
export function isMunicipalNoticeStep(noticeStepId: string, story = "", city = ""): boolean {
  if (/^before-filing:notice-(?:municipality|toronto)$/.test(noticeStepId)) return true;
  // The civil notice step covers every notice; it is a municipal one when the words fit one.
  const prose = proseOf(story);
  return noticeStepId === "civil:before-filing:notice-required-before-suing" && (NOTICE_FITS["municipal-act-2001"]!(prose, city) || NOTICE_FITS["city-of-toronto-act-2006"]!(prose, city));
}

export function practicalFor(
  stepId: string,
  court: PracticalCourt,
  city = "",
  responding = false,
  story = "",
  /** The written-notice step the case's claim points to (claim-types/noticeStep.ts), if any. */
  noticeStepId = "",
  /**
   * The step's counted last day and Ontario's today, when the card knows them
   * (walkthrough run 38525903567, SD): a deadline 3 business days away or less
   * replaces the online-portal lines, and a Small Claims step served the
   * ordinary way gets the mail timing lines.
   */
  timing: { deadline?: string; serveBy?: string; today?: string; divisionalOnly?: boolean } = {},
): PracticalView | null {
  const step = STEP_PRACTICAL[stepId];
  if (!step || (step.forms.length === 0 && step.fees.length === 0 && !step.files && !step.serve && !(step.also ?? []).length)) return null;
  const toronto = inTorontoRegion(city);
  const filingLines = FILING[court];
  const claims = court === "family" ? familyClaimsIn(story) : null;
  // A parenting-only (or support-only, not property) case: the fee exemption
  // leads the fees (walkthrough 2026-10-13: "$171" first, the no-fee rule
  // for a parenting case buried under it).
  const exemptionLeads = Boolean(claims && claims.known && !claims.property && !claims.home && !claims.divorce);
  const allFees = step.fees.map((id) => FEES[id]).filter(Boolean);
  // The divorce-answer fee is for an answer that asks for a divorce; it goes last when their words name none.
  const fees = claims && claims.known && !claims.divorce ? [...allFees.filter((fee) => fee.id !== "fam-answer-divorce"), ...allFees.filter((fee) => fee.id === "fam-answer-divorce")] : allFees;
  const serviceLines = step.serve ? linesAbout(SERVICE[court][step.serve], story, isMunicipalNoticeStep(noticeStepId, story, city)) : [];
  const allForms = step.forms
    .map((form) => {
      const [other, number] = form.includes(":") ? form.split(":") : [court, form];
      return { court: other as PracticalCourt, number };
    })
    .sort((a, b) =>
      responding && stepId.includes(":both:")
        ? Number(MOVING_PARTY_FORMS[a.court]?.has(a.number) ?? false) - Number(MOVING_PARTY_FORMS[b.court]?.has(b.number) ?? false)
        : 0,
    );
  const folded = (form: { court: PracticalCourt; number: string }) =>
    form.court === "family" &&
    claims?.known === true &&
    FAMILY_FORM_NEEDS[form.number] !== undefined &&
    !FAMILY_FORM_NEEDS[form.number].fits(claims, story, respondingStep(stepId, responding));
  const also = alsoFor(step.also ?? [], story, city);
  // Parenting only: the amounts are folded under their condition (FR, run 38525903567).
  const foldFees = court === "family" && claims !== null && parentingOnly(claims) && fees.some((fee) => FIRST_INSTANCE_FAMILY_FEES.has(fee.id));
  const familyNotes = foldFees ? familyFeeNotesFor(claims, true) : [];
  // `deadline`: the person's own filing deadline; `serveBy`: their own serving deadline (personDeadlineOf).
  const iso = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
  const tooClose = iso(timing.deadline) && iso(timing.today) ? tooCloseFilingLine(court, timing.today!, timing.deadline!, Boolean(timing.divisionalOnly)) : null;
  const portalLines = [...(toronto === true ? [filingLines.toronto] : toronto === false ? [filingLines.elsewhere] : [filingLines.toronto, filingLines.elsewhere]), ...filingLines.more];
  const mailTiming = iso(timing.serveBy) && iso(timing.today) && court === "small-claims" && step.serve === "ordinary" ? mailTimingLines(timing.today!, timing.serveBy!) : [];
  return {
    // On a responding step, Form 13 carries r. 13 (1) (b)'s condition beside it.
    forms: allForms
      .filter((form) => !folded(form))
      .map((form) =>
        form.court === "family" && FAMILY_FORM_NEEDS[form.number]?.respondingNote && respondingStep(stepId, responding)
          ? { ...form, note: financialStatementNoteFor(stepId) }
          : form.court === "family" && FAMILY_FORM_NEEDS[form.number]?.conditionNote
            ? { ...form, note: FAMILY_FORM_NEEDS[form.number].when }
            : form,
      ),
    formsIfClaimed: allForms.filter(folded).map((form) => ({ ...form, when: FAMILY_FORM_NEEDS[form.number].when })),
    feeNotesFirst: foldFees || (exemptionLeads && fees.some((fee) => FIRST_INSTANCE_FAMILY_FEES.has(fee.id))),
    courtOffices: !step.files
      ? null
      : court === "family"
        ? familyCourtOfficesFor(stepId, city)
        : civilCourtOfficesFor(stepId, court, city),
    noticeHow: also.flatMap((rule) => (rule.pinpoint.startsWith("s. 42 (6)") || rule.pinpoint.startsWith("s. 44 (10)") || rule.pinpoint.startsWith("s. 6.1 (1)") ? NOTICE_HOW[rule.sourceId] ?? [] : [])),
    afterNotice: claimAfterNotice(stepId, court, story, city),
    leadForms: [
      ...allForms.filter((form) => !folded(form) && form.court === court).map((form) => ({ number: form.number, label: "For your step" as const })),
      ...(court !== "family" && claimAfterNotice(stepId, court, story, city).length > 0
        ? [{ number: CLAIM_AFTER_NOTICE[court].form, label: "After the notice" as const }]
        : []),
      /*
       * Form 10A beside Form 9A (walkthrough 2026-10-15, RN: a defendant who
       * explicitly asked to recover repair costs still saw only Form 9A on
       * the Forms tab, with Form 10A buried in the full catalogue pending
       * another confirmation). The step's own fee list already anticipates
       * this -- "sc-defendants-claim-if" ("Only if you also make a
       * defendant's claim (Form 10A)") exists for exactly these steps -- so
       * surfacing the form wherever that fee already does, labelled
       * optional, ties it to a decision already recorded in the step map
       * rather than reading the person's own words.
       */
      ...(court === "small-claims" && step.fees.includes("sc-defendants-claim-if")
        ? [{ number: "10A", label: "Optional: your own claim" as const }]
        : []),
    ],
    fees: foldFees ? [] : fees,
    feesIfClaimed: foldFees
      ? {
          fees,
          notes: [...familyNotes.filter((line) => line === FAMILY_COURT_BRANCH_FEE), FAMILY_DIVORCE_FEE_NOTE],
          waiver: FEE_WAIVER,
        }
      : null,
    feeNotes: foldFees
      ? familyNotes.filter((line) => line !== FAMILY_COURT_BRANCH_FEE && line !== FAMILY_DIVORCE_FEE_NOTE)
      : court !== "family"
        ? step.noFee && fees.length === 0
          ? SC_NO_STEP_FEE
          : []
        : fees.some((fee) => FIRST_INSTANCE_FAMILY_FEES.has(fee.id))
          ? familyFeeNotesFor(claims, exemptionLeads)
          : fees.some((fee) => fee.id.startsWith("fam-appeal"))
            ? [FAMILY_APPEAL_FEE_NOTE]
            : fees.length === 0 && step.files
              ? FAMILY_NO_STEP_FEE
              : [],
    feeWaiver: fees.length > 0 && !foldFees ? FEE_WAIVER : null,
    // A Divisional-Court-only line keeps the portal lines: the appeal may be in the Court of Appeal.
    filing: step.files ? (tooClose ? (timing.divisionalOnly && court === "civil" ? [...portalLines, tooClose] : [tooClose]) : portalLines) : [],
    serving: serviceLines.length > 0 ? [...serviceLines, ...mailTiming, SERVICE[court].proof] : [],
    also,
    garnishee: court === "small-claims" ? garnisheeNotesFor(stepId, story) : null,
  };
}



// ---------------------------------------------------------------- limits of acting alone

/**
 * Where the rules themselves say a person cannot act on their own, shown on
 * the card (held-back walkthrough, 2026-10-09: a company defending a civil
 * summary judgment motion was never told that a corporation needs a lawyer in
 * the Superior Court). Keyed on the person's own words; a suggestion of what
 * the rule says, never a judgment of the case.
 */
const CORPORATION_NEEDS_LAWYER: PlainLine = {
  say: "In this court, a company (a corporation) must be represented by a lawyer, unless the court gives permission for someone else.",
  cite: rcp("r. 15.01 (2)", "A party to a proceeding that is a corporation shall be represented by a lawyer, except with leave of the court."),
};

export function limitNotesFor(court: PracticalCourt, userWords: string): PlainLine[] {
  const words = userWords.toLowerCase();
  return court === "civil" && companyIsTheParty(words) ? [CORPORATION_NEEDS_LAWYER] : [];
}

/**
 * The person's words make a company (a corporation) the party, not just
 * mention one ("he took from our company account" is a person suing).
 */
export function companyIsTheParty(userWords: string): boolean {
  const words = userWords.toLowerCase();
  return /\b(?:sued|suing|sue) (?:my|our) (?:company|corporation|business)\b|\b(?:my|our) (?:company|corporation) (?:is|was|has been) (?:being )?(?:sued|suing)\b|\bon behalf of (?:my|our) (?:company|corporation)\b|\b(?:my|our) (?:company|corporation) (?:wants|needs) to (?:sue|defend|respond)\b/.test(words);
}

/*
 * A limit written from the moving party's side, as the responding party
 * reads it on an either-side step (final re-check 2026-10-14: a respondent
 * to a motion to change saw "The other party's time to serve and file a
 * response, or return a signed consent" for their own deadline). Family Law
 * Rules r. 15 (6) names the blank response (Form 15B) and consent (Form 15C)
 * served with the motion; r. 15 (9) says which one to use.
 */
export type RespondingView = {
  what: string;
  countFrom: string;
  /** The stage map's qualifier said to the person responding, with its rule (reviewer, 2026-10-14: "if they do not live" under "Your time"). */
  note: PlainLine;
  /** The rules the responding wording itself relies on, beyond the limit's own (r. 15 (9) names Form 15B and the signed consent). */
  alsoRules: RuleCitation[];
};
export const RESPONDING_VIEW: Record<string, RespondingView> = {
  "deadline:family:motion-to-change-response:moving-party-view": {
    what: "Your time to serve and file a response (Form 15B) or return a signed consent (Form 15C)",
    countFrom: "the day you receive the motion to change and its supporting documents",
    note: {
      say: "It is 60 days if you do not live in Canada or the United States.",
      cite: flr(
        "r. 15 (10) (b)",
        "(b) no later than 60 days after the party responding to the motion receives the motion to change and the supporting documents, in any other case.",
      ),
    },
    alsoRules: [
      flr(
        "r. 15 (9), paras. 1, 2",
        "1. If the party does not agree to the change or if the party wants to ask the court to make an additional or a different change to the final order or agreement, the party shall serve and file a response to motion to change (Form 15B), with all required attachments, within the time set out in clause (10) (a) or (b), as the case may be. 2. If the party agrees to the change or if the parties agree to a different change, the party shall complete the applicable portions of the consent motion to change (Form 15C) and shall, within the time set out in clause (10) (a) or (b), as the case may be, i. return a signed copy of the consent motion to change to the party making the motion",
      ),
    ],
  },
};
/** The limit as the person's side reads it: the responding wording, its note and the rules it relies on, for a moving-party limit when they are responding. */
export function limitForSide<T extends { id?: string; what: string; countFrom?: string }>(
  item: T,
  responding: boolean,
): T & { sideNote?: PlainLine; alsoRules?: RuleCitation[] } {
  const view = responding && item.id ? RESPONDING_VIEW[item.id] : undefined;
  if (!view) return item;
  return {
    ...item,
    what: view.what,
    ...(item.countFrom !== undefined ? { countFrom: view.countFrom } : {}),
    sideNote: view.note,
    alsoRules: view.alsoRules,
  };
}
