/**
 * When service counts from, by the way the papers were served (build order
 * Step 2D, 2026-10-12).
 *
 * Deadlines that run from service ("20 days after you were served") count
 * from the day service is EFFECTIVE, and for most methods other than handing
 * the papers over in person the rules set that day later than the day they
 * were sent: the fifth day after mailing, the second day after a courier got
 * them, the next day for email sent after 4 p.m. The deadline engine counted
 * from whatever date the person typed, so a deadline could be several days
 * early or late. This module turns "the date I typed" + "how it was served"
 * into the date service counts from, with the rule that says so, for each of
 * the three courts.
 *
 * Every rule line quotes the saved official text (docs/sources/corpus/);
 * test:service-dates checks each quote is in that text, word for word.
 *
 * Where the text leaves the answer open, it says so instead of guessing:
 * - Small Claims: a fifth day that lands on a weekend or holiday. The rules
 *   say service is "effective on the fifth day" and r. 3.01 moves the last day
 *   of a period (docs/SMALL_CLAIMS_RULES_MAP.md flags how the two combine for a
 *   licensee). We give the fifth day, quote r. 3.01, and say to confirm --
 *   never "the rules don't say", which no saved text can show.
 * - Family: r. 6 (11.3) moves a closed-day effective date to the next open
 *   day; when the closed day is a holiday whose date rests on settled practice
 *   rather than a statute (holidays.ts), we say to confirm.
 */

import { addDays, dayOfWeek, holidayFor, type IsoDate } from "./holidays";

export type ServiceCourt = "small-claims" | "civil" | "family";

export type ServiceMethod =
  | "personal"
  | "personal-after-4pm"
  | "residence-and-mail"
  | "mail"
  | "registered-mail-signature"
  | "acknowledgment-card"
  | "corporation-mail"
  | "corporation-courier"
  | "courier"
  | "courier-same-day"
  | "courier-next-day"
  | "email"
  | "email-after-4pm";

export type ServiceRule = {
  method: ServiceMethod;
  /** How the person describes it. */
  label: string;
  /** Which day they should type. */
  dateToEnter: string;
  /** The rule, e.g. "O. Reg. 258/98, r. 8.07 (2)". Empty for service in person. */
  rule: string;
  /** Words from that rule, as saved, that say when service is effective. */
  quote: string;
  /** Days after the typed date that service is effective. */
  addDays: number;
  /** Family r. 6 (11.3) and civil r. 16.06.2: a closed day moves to the next open day. */
  rollsPastClosedDays?: boolean;
};

const SC = "O. Reg. 258/98";
const CIVIL = "R.R.O. 1990, Reg. 194";
const FAMILY = "O. Reg. 114/99";

export const SERVICE_RULES: Record<ServiceCourt, ServiceRule[]> = {
  "small-claims": [
    { method: "personal", label: "Handed to me in person", dateToEnter: "the day you got them", rule: "", quote: "", addDays: 0 },
    {
      method: "residence-and-mail",
      label: "Left at my home with an adult, and a copy mailed",
      dateToEnter: "the day the copy was mailed",
      rule: `${SC}, r. 8.03 (4)`,
      quote: "is effective on the fifth day after the document is mailed",
      addDays: 5,
    },
    {
      method: "registered-mail-signature",
      label: "Registered mail or courier that I (or someone at home) signed for",
      dateToEnter: "the day it was signed for",
      rule: `${SC}, r. 8.03 (8)`,
      quote: "is effective on the date on which receipt of the copy of the claim is verified by signature",
      addDays: 0,
    },
    {
      // r. 8.03 (3): a company not found at its address on record (legal review 2026-10-14).
      method: "corporation-mail",
      label: "Mailed to the company at its address on record, and to its directors",
      dateToEnter: "the day it was mailed",
      rule: `${SC}, r. 8.03 (3), (4)`,
      quote:
        "service may be made on the corporation, (a) by mailing or sending by courier a copy of the document to the corporation or to the attorney for service in Ontario, as the case may be, at that address; and (b) by mailing or sending by courier a copy of the document to each director of the corporation ... Service made under subrule (2) or (3) is effective on the fifth day after the document is mailed or verified by courier that it was delivered.",
      addDays: 5,
    },
    {
      // The same route by courier: r. 8.03 (4) counts from the courier's confirmed delivery (final re-check 2026-10-14).
      method: "corporation-courier",
      label: "Couriered to the company at its address on record, and to its directors",
      dateToEnter: "the day the courier confirmed it was delivered",
      rule: `${SC}, r. 8.03 (3), (4)`,
      quote:
        "service may be made on the corporation, (a) by mailing or sending by courier a copy of the document to the corporation or to the attorney for service in Ontario, as the case may be, at that address; and (b) by mailing or sending by courier a copy of the document to each director of the corporation ... Service made under subrule (2) or (3) is effective on the fifth day after the document is mailed or verified by courier that it was delivered.",
      addDays: 5,
    },
    {
      method: "mail",
      label: "Regular mail",
      dateToEnter: "the day it was mailed",
      rule: `${SC}, r. 8.07 (2)`,
      quote: "Service of a document by mail is deemed to be effective on the fifth day following the date of mailing.",
      addDays: 5,
    },
    {
      method: "courier",
      label: "Courier (no signature needed)",
      dateToEnter: "the day the courier confirmed it was delivered",
      rule: `${SC}, r. 8.07.1 (2)`,
      quote: "is deemed to be effective on the fifth day following the date on which the courier verifies to the sender that the document was delivered",
      addDays: 5,
    },
    {
      method: "email",
      label: "Email, sent before 4 p.m.",
      dateToEnter: "the day the email was sent",
      rule: `${SC}, r. 8.08 (4) (a)`,
      quote: "on the day the email is sent",
      addDays: 0,
    },
    {
      method: "email-after-4pm",
      label: "Email, sent between 4 p.m. and midnight",
      dateToEnter: "the day the email was sent",
      rule: `${SC}, r. 8.08 (4) (b)`,
      quote: "if the email is sent between 4 p.m. and midnight, on the following day",
      addDays: 1,
    },
  ],
  civil: [
    { method: "personal", label: "Handed to me in person", dateToEnter: "the day you got them", rule: "", quote: "", addDays: 0 },
    {
      method: "residence-and-mail",
      label: "Left at my home with an adult, and a copy mailed",
      dateToEnter: "the day the copy was mailed",
      rule: `${CIVIL}, r. 16.03 (5)`,
      quote: "and service in this manner is effective on the fifth day after the document is mailed",
      addDays: 5,
    },
    {
      method: "acknowledgment-card",
      label: "Mailed with a card I signed and sent back",
      dateToEnter: "the day the sender received the signed card",
      rule: `${CIVIL}, r. 16.03 (4)`,
      quote: "is only effective as of the date the sender receives the card",
      addDays: 0,
    },
    {
      // r. 16.03 (6): a company not found at its address on record; mail is effective under r. 16.06 (2).
      method: "corporation-mail",
      label: "Mailed to the company at its address on record",
      dateToEnter: "the day it was mailed",
      rule: `${CIVIL}, r. 16.03 (6), 16.06 (2)`,
      quote:
        "service may be made on the corporation by mailing a copy of the document to the corporation or to the attorney for service in Ontario, as the case may be, at that address ... Service of a document by mail, except under subrule 16.03 (4), is effective on the fifth day after the document is mailed",
      addDays: 5,
    },
    {
      method: "mail",
      label: "Regular or registered mail",
      dateToEnter: "the day it was mailed",
      rule: `${CIVIL}, r. 16.06 (2)`,
      quote: "is effective on the fifth day after the document is mailed",
      addDays: 5,
    },
    {
      method: "courier",
      label: "Courier",
      dateToEnter: "the day the courier was given the papers",
      rule: `${CIVIL}, r. 16.06.2`,
      quote: "is effective on the second day following the day the courier was given the document, or, if the second day is a holiday, on the next day that is not a holiday",
      addDays: 2,
      rollsPastClosedDays: true,
    },
  ],
  family: [
    {
      method: "personal",
      label: "Handed to me in person, before 4 p.m.",
      dateToEnter: "the day you got them",
      rule: `${FAMILY}, r. 6 (11.1)`,
      quote: "is effective on the day the copy of the document was left",
      addDays: 0,
      rollsPastClosedDays: true,
    },
    {
      method: "personal-after-4pm",
      label: "Handed to me in person, after 4 p.m.",
      dateToEnter: "the day you got them",
      rule: `${FAMILY}, r. 6 (11.1)`,
      quote: "or, if the document was left after 4 p.m., the following day",
      addDays: 1,
      rollsPastClosedDays: true,
    },
    {
      method: "residence-and-mail",
      label: "Left at my home with an adult, and a copy mailed",
      dateToEnter: "the day the copy was mailed",
      rule: `${FAMILY}, r. 6 (11.2)`,
      quote: "is effective on the fifth day after it was mailed",
      addDays: 5,
      rollsPastClosedDays: true,
    },
    {
      method: "mail",
      label: "Mail",
      dateToEnter: "the day it was mailed",
      rule: `${FAMILY}, r. 6 (7)`,
      quote: "Service of a document by mail is effective on the fifth day after it was mailed.",
      addDays: 5,
      rollsPastClosedDays: true,
    },
    {
      method: "courier-same-day",
      label: "Same-day courier",
      dateToEnter: "the day the courier picked it up",
      rule: `${FAMILY}, r. 6 (8) (a)`,
      quote: "the day after the day the courier picks it up, in the case of same-day courier service",
      addDays: 1,
      rollsPastClosedDays: true,
    },
    {
      method: "courier-next-day",
      label: "Next-day courier",
      dateToEnter: "the day the courier picked it up",
      rule: `${FAMILY}, r. 6 (8) (b)`,
      quote: "two days after the day the courier picks it up, in the case of next-day courier service",
      addDays: 2,
      rollsPastClosedDays: true,
    },
    {
      method: "email",
      label: "Email, sent before 4 p.m.",
      dateToEnter: "the date shown in the email",
      rule: `${FAMILY}, r. 6 (11) (a)`,
      quote: "the date shown on the first page of the fax or in the email message",
      addDays: 0,
      rollsPastClosedDays: true,
    },
    {
      method: "email-after-4pm",
      label: "Email, sent after 4 p.m.",
      dateToEnter: "the date shown in the email",
      rule: `${FAMILY}, r. 6 (11) (b)`,
      quote: "if the first page of the fax or the email message shows that the document was served after 4 p.m., the following day",
      addDays: 1,
      rollsPastClosedDays: true,
    },
  ],
};

/** Family r. 6 (11.3): the closed-day rule that applies to every family method above. */
export const FAMILY_CLOSED_DAY_RULE = {
  rule: `${FAMILY}, r. 6 (11.3)`,
  quote: "service is instead effective on the next day on which they are open",
};

export type EffectiveService = {
  /** The day service counts from. */
  date: IsoDate;
  /** The rules that put it there, in order. */
  rules: string[];
  /** Set when the text leaves the exact day open; the person should confirm with the court office. */
  confirm?: string;
};

function closedDay(date: IsoDate): { closed: boolean; settled: boolean; name?: string } {
  const weekday = dayOfWeek(date);
  if (weekday === 0 || weekday === 6) return { closed: true, settled: false, name: weekday === 0 ? "Sunday" : "Saturday" };
  // The Small Claims calendar is the civil rules' "holiday" list too (r. 1.03);
  // the family court offices close on the same days.
  const holiday = holidayFor(date, "small-claims-rules");
  if (holiday) return { closed: true, settled: holiday.basis.kind === "settled-practice", name: holiday.name };
  return { closed: false, settled: false };
}

/** Small Claims r. 3.01, the words the note below quotes; test:service-dates reads them back from the saved rules. */
export const SC_R3_01_LAST_DAY = {
  rule: `${SC}, r. 3.01`,
  quote: "if the last day of the period of time falls on a holiday, the period ends on the next day that is not a holiday",
};

/** The note for a Small Claims fifth day that falls on a weekend or holiday. */
export function smallClaimsFifthDayOnClosedDay(dayName: string): string {
  return (
    `Service counts from the fifth day, which is ${dayName} here. Rule 3.01 moves the last day of a period that falls on a holiday ` +
    `(“${SC_R3_01_LAST_DAY.quote}”, ${SC_R3_01_LAST_DAY.rule}), so the last day of your time is moved if it lands on one. ` +
    "This count starts from the fifth day as it falls. Confirm the date with the court office before you rely on it."
  );
}

/*
 * A claim or an application is not served like other papers (legal review
 * 2026-10-14): Small Claims r. 8.01 (1) -- personally or by an alternative
 * under r. 8.03; civil r. 16.01 (1) -- personally or by an alternative under
 * r. 16.03; family r. 8 (5) -- by special service, r. 6 (3). Rule 8.07 (mail)
 * applies only "If a document is to be served by mail under these rules", so
 * "Regular mail" with r. 8.07 (2) is not among the ways to serve a claim.
 * Every quote below is read back from the saved text by test:service-dates.
 */

/** The service-date questions about a claim or an application, per court. */
export const ORIGINATING_QUESTIONS: Record<ServiceCourt, ReadonlySet<string>> = {
  "small-claims": new Set(["sc-date-claim-served", "sc-date-defendants-claim-served"]),
  civil: new Set(["sc-date-claim-served"]),
  family: new Set(["case-date-served-with-application", "case-date-served-with-motion-to-change"]),
};

/** Whether `questionId` asks when a claim or an application was served, in `court`. */
export function isOriginatingService(court: ServiceCourt, questionId: string): boolean {
  return ORIGINATING_QUESTIONS[court].has(questionId);
}

/** The ways the rules allow a claim or application to be served, among SERVICE_RULES. */
export const ORIGINATING_METHODS: Record<ServiceCourt, readonly ServiceMethod[]> = {
  "small-claims": ["personal", "registered-mail-signature", "residence-and-mail", "corporation-mail", "corporation-courier"],
  civil: ["personal", "acknowledgment-card", "residence-and-mail", "corporation-mail"],
  family: ["personal", "personal-after-4pm", "residence-and-mail"],
};

/** The rule that says how a claim or application is served, quoted. */
export type OriginatingRule = { rule: string; quote: string; say: string };
export const ORIGINATING_RULE: Record<ServiceCourt, OriginatingRule> = {
  "small-claims": {
    rule: `${SC}, r. 8.01 (1)`,
    quote: "A plaintiff's claim or defendant's claim (Form 7A or 10A) shall be served personally as provided in rule 8.02 or by an alternative to personal service as provided in rule 8.03.",
    say: "A claim is to be served personally, or in one of the other ways the rules allow.",
  },
  civil: {
    rule: `${CIVIL}, r. 16.01 (1)`,
    quote: "An originating process shall be served personally as provided in rule 16.02 or by an alternative to personal service as provided in rule 16.03.",
    say: "A statement of claim is to be served personally, or in one of the other ways the rules allow.",
  },
  family: {
    rule: `${FAMILY}, r. 8 (5)`,
    quote: "The application shall be served immediately on every other party, and special service shall be used unless the party is listed in subrule (6).",
    say: "An application is to be served by special service: personally, or in one of the other ways the rules allow.",
  },
};

/**
 * A motion to change is not an application (legal review 2026-10-14): r. 15
 * (7) says its documents are served by special service; r. 15 (8) lets
 * officials and agencies under r. 8 (6) be served by regular service.
 */
export const MOTION_TO_CHANGE_RULE: OriginatingRule = {
  rule: `${FAMILY}, r. 15 (7)`,
  quote: "The documents referred to in subrules (5), (5.1) and (6) shall be served by special service (subrule 6 (3)), and not by regular service.",
  say: "A motion to change is to be served by special service: personally, or in one of the other ways the rules allow.",
};

/** The rule for the papers a service-date question asks about: the motion-to-change rule for a motion to change, else the court's claim or application rule. */
/**
 * Small Claims: a claim served by registered mail or courier and signed for
 * (review of 400ad42). The day offered from the person's words is the day the
 * papers reached them; service is effective on the date the delivery
 * confirmation shows the signature, and the one who signed may be anyone who
 * appears to be a member of the household -- so the date to check is on that
 * confirmation, and can be before the day the person got the papers.
 */
export const SC_SIGNED_FOR_NOTE = {
  rules: `${SC}, r. 8.03 (7), (8)`,
  quotes: [
    "if the signature of the individual or any person who appears to be a member of the same household, verifying receipt of the copy, is obtained",
    "is effective on the date on which receipt of the copy of the claim is verified by signature, as shown in a delivery confirmation provided by or obtained from Canada Post or the commercial courier",
  ],
  say:
    "For a claim signed for, service is effective on the date the signature is shown on the delivery confirmation from Canada Post or the courier. Someone who appears to live with you may have signed, so check that date: it can be earlier than the day you got the papers.",
} as const;

export function originatingRuleFor(court: ServiceCourt, questionId: string): OriginatingRule {
  return court === "family" && questionId === "case-date-served-with-motion-to-change" ? MOTION_TO_CHANGE_RULE : ORIGINATING_RULE[court];
}

/** Family r. 6 (3) (c): special service by mail with a return postcard. Its effective day is not one SERVICE_RULES counts, so it is listed without one. */
export const FAMILY_POSTCARD_WAY = {
  label: "Mailed to you with a prepaid return postcard (Form 6) to sign and send back",
  rule: `${FAMILY}, r. 6 (3) (c)`,
  quote: "mailing a copy to the person, together with an acknowledgment of service in the form of a prepaid return postcard (Form 6)",
};

/** The company route for a claim (r. 8.03 (3), 16.03 (6)): offered only for a claim. Its day comes from mailing, which can be before the papers arrive. */
export const COMPANY_ROUTE: ReadonlySet<ServiceMethod> = new Set<ServiceMethod>(["corporation-mail", "corporation-courier"]);

/**
 * Who the papers were served on, as far as the person's words say
 * (walkthrough run 38525903567, SD: "Mailed to the company at its address on
 * record, and to its directors" was offered to a homeowner). `company: false`
 * means the words do not make a company the party served, and the company
 * route of r. 8.03 (3) / 16.03 (6) -- which is service "on the corporation" --
 * is not offered; `undefined` (not known) keeps every way.
 */
export type ServedOn = { company?: boolean };

/*
 * Who was served, from the person's words (review of bee9daf: the first cut
 * hid the company route from every party not described in so many words as
 * a company). `company: false` ONLY on positive evidence that the party
 * served is an individual; no evidence either way is "not known", which keeps
 * every way. When the person received the papers, the party served is the
 * person; when they served them, it is the other side, judged by its name.
 */
const BUSINESS_WORDS =
  /\b(?:inc|ltd|corp|llc|limited|incorporated|corporation|company|business|numbered company|firm|\d{6,7}\s+(?:ontario|canada)\s+(?:inc|ltd|limited|corp))\b\.?/i;
const MY_BUSINESS = /\b(?:my|our)\s+(?:(?:small|numbered|family)\s+)?(?:business|company|corporation|firm|store|shop|restaurant)\b/i;
const ME_SERVED = /\b(?:suing me|sued me|served me|against me|i (?:was|got) served|i (?:got|received|recieved) (?:the |a )?(?:plaintiff'?s? |plaintifs )?claim|(?:the|a) claim (?:came|arrived) (?:to|at) my (?:house|home|apartment))\b/i;
/*
 * A relationship that can only be with a person (re-review of 6a0fce6): not
 * "landlord" or "tenant" (often a company), not "partner" (a business
 * partner), and "ex" only on its own ("my ex"), never "my ex boss".
 */
const A_PERSON =
  /\bmy (?:old |former |ex-)?(?:roommate|room-mate|neighbou?r|friend|brother|sister|cousin|uncle|aunt|father|mother|son|daughter|boyfriend|girlfriend|husband|wife)\b|\bmy ex\b(?![- ]?(?:boss|employer|landlord|company|business|partner|manager|supervisor|client|tenant))/i;

export function partyServedFrom(words: string, personWasServed: boolean): ServedOn {
  const text = words.replace(/"[A-Za-z_][A-Za-z0-9_]*"\s*:/g, " ");
  if (personWasServed) {
    if (MY_BUSINESS.test(text)) return { company: true };
    // Any business word in their own words ("I own a renovation company",
    // "I run a small contracting business", Inc., Ltd.): not known, never an individual.
    if (BUSINESS_WORDS.test(text) || /\b(?:own|run|operate)\s+(?:a|an|my|our)\b/i.test(text)) return {};
    return ME_SERVED.test(text) ? { company: false } : {};
  }
  // The other side: a business name or word makes it a company; a named relationship to a person makes it an individual.
  const withoutMine = text.replace(MY_BUSINESS, " ");
  const business = BUSINESS_WORDS.test(withoutMine);
  // Several parties named, one of them a landlord or a business: not known (third review).
  if (business && A_PERSON.test(text)) return {};
  if (business) return { company: true };
  if (/\b(?:landlord|tenant|property manag\w*)\b/i.test(text)) return {};
  return A_PERSON.test(text) ? { company: false } : {};
}

/** The ways the rules allow for a claim or application that come by post, each with its effective day and rule. */
export function postWaysForClaim(court: ServiceCourt, servedOn: ServedOn = {}): { label: string; effective: string | null; rule: string; quote: string }[] {
  const ways = ORIGINATING_METHODS[court]
    .filter((method) => servedOn.company !== false || !COMPANY_ROUTE.has(method))
    .map((method) => SERVICE_RULES[court].find((rule) => rule.method === method))
    .filter((rule): rule is ServiceRule => Boolean(rule) && !rule!.method.startsWith("personal"))
    .map((rule) => ({ label: rule.label, effective: whenEffectiveSay(rule), rule: rule.rule, quote: rule.quote }));
  return court === "family" ? [...ways, { ...FAMILY_POSTCARD_WAY, effective: null }] : ways;
}

/*
 * THE SIDE THAT SERVED (walkthrough run 38525903567, FM). A father bringing a
 * motion to change was asked "How were the papers served?" with "Handed to
 * me in person" and "If you were served with a motion to change, what date
 * was it served?" -- the receiving side's questions. His time limit is the
 * OTHER party's: r. 15 (10) runs "after the party responding to the motion
 * receives the motion to change", so he is asked how the motion was served on
 * them and the day they received it. Same rules and days; only the person
 * the words are about changes.
 */
export const MOTION_TO_CHANGE_SERVICE_QUESTION = "case-date-served-with-motion-to-change";

/** The date question the moving party is asked instead (r. 15 (10): from when the other party receives it). */
export const MOVING_PARTY_MOTION_QUESTION = "What date did the other party receive your motion to change?";

/** A way of serving, said about the person served rather than to them. */
export function forServingSide(rule: ServiceRule): ServiceRule {
  const third = (text: string) =>
    text
      .replace(/\bto me\b/g, "to them")
      .replace(/\bHanded to me\b/g, "Handed to them")
      .replace(/\bmy home\b/g, "their home")
      .replace(/\bMailed to you\b/g, "Mailed to them")
      .replace(/\bI \(or someone at home\) signed\b/g, "they (or someone at their home) signed")
      .replace(/\ba card I signed\b/g, "a card they signed")
      .replace(/\bthe day you got them\b/g, "the day they got them");
  return { ...rule, label: third(rule.label), dateToEnter: third(rule.dateToEnter) };
}

/**
 * The ways of serving to offer for a service date. For a claim or an
 * application, only the ways the rules allow for one (ORIGINATING_METHODS);
 * otherwise every way. `servedOn`: who was served (partyServedFrom); the
 * company route is left out for an individual. `serving`: said from the side
 * that served (forServingSide).
 */
export function serviceRulesFor(court: ServiceCourt, questionId = "", servedOn: ServedOn = {}, serving = false): ServiceRule[] {
  const rules =
    questionId && isOriginatingService(court, questionId)
      ? // The company route only when the party served is a company (or not known).
        SERVICE_RULES[court].filter((rule) => ORIGINATING_METHODS[court].includes(rule.method) && (servedOn.company !== false || !COMPANY_ROUTE.has(rule.method)))
      : // The company route is only for a claim (r. 8.03 (3), 16.03 (6)).
        SERVICE_RULES[court].filter((rule) => !COMPANY_ROUTE.has(rule.method));
  return serving ? rules.map(forServingSide) : rules;
}

/**
 * The day service counts from. `entered` is the day the person typed for the
 * method (see `dateToEnter`). Unknown method: the typed date, unchanged.
 */
export function effectiveServiceDate(court: ServiceCourt, method: ServiceMethod, entered: IsoDate): EffectiveService {
  const rule = SERVICE_RULES[court].find((candidate) => candidate.method === method);
  if (!rule) return { date: entered, rules: [] };
  let date = addDays(entered, rule.addDays);
  const rules = rule.rule ? [rule.rule] : [];
  let confirm: string | undefined;

  if (rule.rollsPastClosedDays) {
    let moved = false;
    for (let guard = 0; guard < 10; guard += 1) {
      const day = closedDay(date);
      if (!day.closed) break;
      if (day.settled) confirm = `${day.name} falls in this count; confirm with the court office that it was closed that day.`;
      date = addDays(date, 1);
      moved = true;
    }
    if (moved) rules.push(court === "family" ? FAMILY_CLOSED_DAY_RULE.rule : `${CIVIL}, r. 16.06.2`);
  } else if (court === "small-claims" && rule.addDays > 0 && closedDay(date).closed) {
    // Walkthrough 2026-10-13: "The rules don't say whether that moves" was
    // shown with no source, and an absence is the one claim the corpus cannot
    // check (blockGates.assertsAbsenceProblems). It now says what the rules DO
    // say: the fifth day (the rule above), and r. 3.01, which moves only the
    // last day of a period.
    confirm = smallClaimsFifthDayOnClosedDay(closedDay(date).name ?? "a holiday");
  }
  return { date, rules, ...(confirm ? { confirm } : {}) };
}

/**
 * How the papers were served, when the person's own words say so plainly
 * ("handed me the claim at my door", "came in the mail"), as a pre-selected
 * answer they can change -- never applied without being shown (2026-10-13,
 * walkthrough: "How were the papers served?" was asked after the story said
 * the claim was handed over at the door). Null when the words don't say, or
 * say more than one way.
 */
export function serviceMethodFromStory(court: ServiceCourt, story: string): ServiceMethod | null {
  const text = story.toLowerCase();
  const found = new Set<ServiceMethod>();
  if (/\b(?:handed (?:me|it|them|the)|gave (?:me )?(?:the )?(?:papers|claim|application)|at my door|in person|served me personally|personally served)\b/.test(text)) found.add("personal");
  if (/\b(?:registered mail|signed for)\b/.test(text)) found.add(court === "small-claims" ? "registered-mail-signature" : "mail");
  else if (/\b(?:in the mail|by mail|mailed|came in the post)\b/.test(text)) found.add("mail");
  if (/\b(?:by email|emailed|in an email|an email with)\b/.test(text)) found.add("email");
  if (found.size !== 1) return null;
  const method = [...found][0];
  return SERVICE_RULES[court].some((rule) => rule.method === method) ? method : null;
}

/**
 * Methods whose rule counts from the day the person themselves got the papers
 * (handed over, signed for, an email's own date). For the others -- mail,
 * courier, left at home and mailed -- the rule counts from the day they were
 * SENT, which the person usually doesn't know.
 */
const COUNTS_FROM_ARRIVAL: ReadonlySet<ServiceMethod> = new Set([
  "personal",
  "personal-after-4pm",
  "registered-mail-signature",
  "email",
  "email-after-4pm",
]);

const ARRIVED = /\b(?:got|received|recieved|came|arrived|showed up|delivered to me|found)\b/i;

/**
 * True when the date in `quote` is the day the papers ARRIVED but the rule for
 * `method` counts from the day they were sent (2026-10-13). "i got the
 * plaintiffs claim in the mail on september 28": service by mail counts from
 * the fifth day after MAILING (r. 8.07 (2)), and treating the arrival day as
 * the mailing day can give a deadline later than the real one. Such a date is
 * never counted from; the person is asked for the mailing date instead.
 */
export function arrivalNotSendDate(method: ServiceMethod | null | undefined, quote: string): boolean {
  if (!method || COUNTS_FROM_ARRIVAL.has(method)) return false;
  return ARRIVED.test(quote);
}

/*
 * What the rule says about papers that ARRIVED, in its own terms (walkthrough
 * 2026-10-14, RN: the note said "service counts from the day it was mailed",
 * while r. 8.07 (2) says service by mail is effective on the FIFTH DAY after
 * mailing; the deadline runs from that day, not from mailing).
 */
const ORDINAL: Record<number, string> = { 2: "second", 5: "fifth" };

/** "service is effective on the fifth day after the day it was mailed" -- the rule's effective day, from its own period and starting day. */
export function whenEffectiveSay(rule: Pick<ServiceRule, "addDays" | "dateToEnter">): string {
  if (rule.addDays === 0) return `service is effective on ${rule.dateToEnter}`;
  if (rule.addDays === 1) return `service is effective on the day after ${rule.dateToEnter}`;
  return `service is effective on the ${ORDINAL[rule.addDays] ?? `${rule.addDays}th`} day after ${rule.dateToEnter}`;
}

/**
 * Ways of serving whose starting day is always on or before the day the
 * papers reached the person: a letter is mailed before it arrives. For these,
 * a deadline counted as if the papers were mailed on the day they arrived is
 * the LATEST the real one can be (a later start never gives an earlier last
 * day). Courier is not here: under r. 8.07.1 (2) its day is when the courier
 * confirms delivery to the sender, which can be after the papers arrived. Nor
 * is "left at my home and mailed": the copy may be mailed after it was left.
 */
export const SENT_ON_OR_BEFORE_ARRIVAL: ReadonlySet<ServiceMethod> = new Set<ServiceMethod>(["mail"]);
