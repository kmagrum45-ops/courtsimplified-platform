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
 *   say service is "effective on the fifth day" and r. 3.01 moves the end of a
 *   period, but how the two combine is not stated (docs/SMALL_CLAIMS_RULES_MAP.md
 *   flags it for a licensee). We give the fifth day and say to confirm.
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

export function serviceRulesFor(court: ServiceCourt): ServiceRule[] {
  return SERVICE_RULES[court];
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
    confirm =
      `Service counts from the fifth day, ${closedDay(date).name}. The rules don't say whether that moves to the next ` +
      "day the court office is open, so confirm the date with the court office before you rely on it.";
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
