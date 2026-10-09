/**
 * THE CASE READER (master plan Phase 3, 2026-10-08): the AI reads everything
 * the person has written about their case and reports what it says, the way a
 * person reading it would -- and code checks every word of the report before
 * anything uses it.
 *
 * WHY. Site owner, 2026-10-08: "if it was you doing the intake, you would
 * understand someone's basic story and ask the right questions ... mine
 * sounds stupid and unless it gets exact phrases, it screws up." Until now the
 * site read a story with fixed phrase lists ("noted in default", "we were
 * never married", "November 20") and missed anything said another way. The
 * reader understands language; code still owns the law, the arithmetic and
 * the guardrails:
 *
 *   - Every item carries a quote, and the quote must be the PERSON's own
 *     words (the story or their answers -- never our questions), found word
 *     for word. No quote, no item.
 *   - It reports only from fixed lists: the procedural events below, the
 *     site's own date questions, a side, an amount. Code turns those into a
 *     step, a form and a deadline; the reader never names a rule or a form.
 *   - A date's year is kept ONLY if the year is in the quote. Otherwise the
 *     year is null, and the card asks the person which year it was. The
 *     reader cannot guess a year: the check removes it.
 *   - Nothing is applied: the step is suggested, the dates are offered, and
 *     the person confirms (CLAUDE.md s. 4). Nothing grades the case (s. 3).
 *
 * Behind its own switch (CASE_READER=on), off until it has been tested on
 * the walkthrough. With the switch off, or when the call fails, the site
 * behaves exactly as before (the phrase lists stay as the fallback).
 *
 * Pure (no network): the types, the check, and the mapping to steps and date
 * offers, safe for the page to import. The model call is caseReaderModel.ts.
 * Tested offline by test:case-reader (validator and step mapping, with stub
 * model output).
 */

import { isDateQuestionId } from "../casePosition";
import { findStage, type StagePathway } from "../stage-map/stageMap";

/** Procedural events a person can describe. Code maps each to a step; the reader only recognises them. */
export const CASE_EVENTS = {
  "thinking-of-suing": "They want to take someone to court and nothing has been filed yet.",
  "claim-filed-not-served": "They filed (started) a claim but it has not been served on the other side yet.",
  "served-with-claim": "They were served with (handed, mailed, given) a claim or lawsuit against them.",
  "served-with-application": "Family: they were served with an application started by the other person.",
  "noted-in-default": "They were noted in default (the court recorded that they did not defend in time).",
  "default-judgment-against-them": "A default judgment has been made against them.",
  "other-side-noted-in-default": "They are the claimant and the other side was noted in default.",
  "defence-filed": "A defence (or a family answer) has been filed in their case.",
  "served-with-defendants-claim": "They brought a Small Claims case and were served with a defendant's claim against them.",
  "served-with-counterclaim": "They brought a civil case and were served with a defence and counterclaim.",
  "settlement-conference-scheduled": "A settlement conference date has been set.",
  "case-conference-scheduled": "Family: a case conference date has been set.",
  "trial-scheduled": "A trial date has been set.",
  "motion-scheduled": "A motion is scheduled (someone asked the court for an order in the existing case).",
  "served-with-summary-judgment-motion": "Civil: they were served with a motion for summary judgment.",
  "wants-to-change-final-order": "Family: they want to change a final order or support agreement.",
  "served-with-motion-to-change": "Family: they were served with a motion to change a final order.",
  "judgment-obtained-unpaid": "They won (have a judgment or order) and it has not been paid.",
  "support-order-not-paid": "Family: a support order is not being paid.",
  "judgment-against-them": "A judgment was given against them after a hearing or trial.",
} as const;

export type CaseEvent = keyof typeof CASE_EVENTS;

export type Quoted<T> = { value: T; quote: string };

export type ReadDate = {
  questionId: string;
  /** "YYYY-MM-DD" when the year is in the quote; otherwise null (the card asks for it). */
  date: string | null;
  month: number;
  day: number;
  quote: string;
};

export type CasePicture = {
  side: Quoted<"bringing" | "responding"> | null;
  events: Quoted<CaseEvent>[];
  dates: ReadDate[];
  amount: Quoted<number> | null;
  otherParty: Quoted<string> | null;
  married: Quoted<"yes" | "no"> | null;
  childTogether: Quoted<"yes" | "no"> | null;
};

export const EMPTY_PICTURE: CasePicture = {
  side: null,
  events: [],
  dates: [],
  amount: null,
  otherParty: null,
  married: null,
  childTogether: null,
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** The quote names this month: by name ("nov", "November") or as a number in a numeric date. */
function quoteNamesMonth(quote: string, month: number): boolean {
  const text = quote.toLowerCase();
  if (new RegExp(`\\b${MONTHS[month - 1]}`).test(text)) return true;
  return new RegExp(`\\b0?${month}[/-]\\d{1,2}\\b|\\b\\d{1,2}[/-]0?${month}\\b|\\d{4}-0?${month}-`).test(text);
}

function quoteNamesDay(quote: string, day: number): boolean {
  return new RegExp(`(?<![\\d])0?${day}(?:st|nd|rd|th)?(?![\\d])`, "i").test(quote);
}

const isQuote = (value: unknown, words: string): value is string => {
  if (typeof value !== "string") return false;
  const quote = normalize(value);
  return quote.length >= 3 && words.includes(quote);
};

/**
 * The code-side check. Pure, so it runs offline. Everything that fails a
 * check is dropped, never repaired, so a dropped item means the site asks.
 */
export function validateCasePicture(raw: unknown, personsWords: string): CasePicture {
  const words = normalize(personsWords);
  const picture: CasePicture = { ...EMPTY_PICTURE, events: [], dates: [] };
  if (!raw || typeof raw !== "object") return picture;
  const input = raw as Record<string, unknown>;
  const record = (value: unknown) => (value && typeof value === "object" ? (value as Record<string, unknown>) : null);

  const side = record(input.side);
  if (side && (side.value === "bringing" || side.value === "responding") && isQuote(side.quote, words)) {
    picture.side = { value: side.value, quote: String(side.quote).trim() };
  }

  if (Array.isArray(input.events)) {
    const seen = new Set<string>();
    for (const item of input.events) {
      const event = record(item);
      if (!event || typeof event.value !== "string" || !(event.value in CASE_EVENTS) || seen.has(event.value)) continue;
      if (!isQuote(event.quote, words)) continue;
      seen.add(event.value);
      picture.events.push({ value: event.value as CaseEvent, quote: String(event.quote).trim() });
    }
  }

  if (Array.isArray(input.dates)) {
    const seen = new Set<string>();
    for (const item of input.dates) {
      const date = record(item);
      if (!date || typeof date.questionId !== "string" || !isDateQuestionId(date.questionId) || seen.has(date.questionId)) continue;
      const month = Number(date.month);
      const day = Number(date.day);
      if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 31) continue;
      if (!isQuote(date.quote, words)) continue;
      const quote = String(date.quote).trim();
      // The month and day must be in the quote; the year is kept only if it is too.
      if (!quoteNamesMonth(quote, month) || !quoteNamesDay(quote, day)) continue;
      const year = Number(date.year);
      const yearInQuote = Number.isInteger(year) && year >= 1950 && year <= 2100 && quote.includes(String(year));
      const iso = yearInQuote ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
      if (iso && Number.isNaN(Date.parse(iso))) continue;
      seen.add(date.questionId);
      picture.dates.push({ questionId: date.questionId, date: iso, month, day, quote });
    }
  }

  const amount = record(input.amount);
  if (amount && typeof amount.value === "number" && amount.value > 0 && amount.value < 100_000_000 && isQuote(amount.quote, words)) {
    // The number must be in the quote (with or without separators).
    const digits = String(Math.round(amount.value));
    if (normalize(String(amount.quote)).replace(/[,\s$]/g, "").includes(digits)) {
      picture.amount = { value: amount.value, quote: String(amount.quote).trim() };
    }
  }

  const other = record(input.otherParty);
  if (other && typeof other.value === "string" && other.value.trim() && other.value.length <= 120 && isQuote(other.quote, words)) {
    picture.otherParty = { value: other.value.trim(), quote: String(other.quote).trim() };
  }

  for (const key of ["married", "childTogether"] as const) {
    const fact = record(input[key]);
    if (fact && (fact.value === "yes" || fact.value === "no") && isQuote(fact.quote, words)) {
      picture[key] = { value: fact.value, quote: String(fact.quote).trim() };
    }
  }

  return picture;
}

/**
 * The step the person's own described events point to, by court and side.
 * Later events win over earlier ones (noted in default is past being
 * served), so the table is read most-advanced first. Every id is checked to
 * exist in the stage map by the suite. "" when nothing they described names
 * a step, so the stage they confirmed decides, as before.
 */
const STEP_BY_EVENT: Record<StagePathway, { event: CaseEvent; side?: "bringing" | "responding"; step: string }[]> = {
  "small-claims": [
    { event: "judgment-against-them", step: "defendant:judgment-against-me" },
    { event: "judgment-obtained-unpaid", step: "plaintiff:judgment-in-my-favour-unpaid" },
    { event: "default-judgment-against-them", step: "defendant:default-judgment-against-me" },
    { event: "noted-in-default", step: "defendant:noted-in-default" },
    { event: "other-side-noted-in-default", step: "plaintiff:defendant-noted-in-default" },
    { event: "trial-scheduled", side: "responding", step: "defendant:trial-date-set" },
    { event: "trial-scheduled", step: "plaintiff:trial-date-set" },
    { event: "settlement-conference-scheduled", side: "responding", step: "defendant:awaiting-settlement-conference" },
    { event: "settlement-conference-scheduled", step: "plaintiff:awaiting-settlement-conference" },
    { event: "served-with-defendants-claim", step: "plaintiff:served-with-defendants-claim" },
    { event: "served-with-claim", step: "defendant:served-defence-period-running" },
    { event: "defence-filed", side: "responding", step: "defendant:defence-filed" },
    { event: "defence-filed", step: "plaintiff:defence-filed" },
    { event: "claim-filed-not-served", step: "plaintiff:claim-issued-not-served" },
  ],
  civil: [
    { event: "judgment-against-them", step: "civil:both:judgment-given" },
    { event: "judgment-obtained-unpaid", step: "civil:plaintiff:judgment-unpaid" },
    { event: "default-judgment-against-them", step: "civil:defendant:default-judgment-against-me" },
    { event: "noted-in-default", step: "civil:defendant:noted-in-default" },
    { event: "other-side-noted-in-default", step: "civil:plaintiff:defendant-noted-in-default" },
    { event: "served-with-summary-judgment-motion", step: "civil:both:summary-judgment-motion" },
    { event: "trial-scheduled", step: "civil:both:trial-date-set" },
    { event: "motion-scheduled", step: "civil:both:motion-scheduled" },
    { event: "served-with-counterclaim", step: "civil:plaintiff:served-with-counterclaim" },
    { event: "served-with-claim", step: "civil:defendant:served-defence-period-running" },
    { event: "defence-filed", side: "bringing", step: "civil:plaintiff:defence-received" },
    { event: "claim-filed-not-served", step: "civil:plaintiff:claim-issued-not-served" },
  ],
  family: [
    { event: "support-order-not-paid", step: "family:both:support-order-not-paid" },
    { event: "served-with-motion-to-change", step: "family:both:served-with-motion-to-change" },
    { event: "wants-to-change-final-order", step: "family:both:asking-to-change-final-order" },
    { event: "trial-scheduled", step: "family:both:trial-scheduled" },
    { event: "settlement-conference-scheduled", step: "family:both:settlement-conference-scheduled" },
    { event: "case-conference-scheduled", step: "family:both:case-conference-scheduled" },
    { event: "motion-scheduled", side: "responding", step: "family:both:responding-to-a-motion" },
    { event: "motion-scheduled", step: "family:both:bringing-a-motion" },
    { event: "served-with-application", step: "family:respondent:served-time-to-answer-running" },
  ],
};

export function stepFromPicture(court: StagePathway, picture: CasePicture | null | undefined, responding: boolean): string {
  if (!picture || picture.events.length === 0) return "";
  const side = picture.side?.value ?? (responding ? "responding" : "bringing");
  const described = new Set(picture.events.map((event) => event.value));
  for (const row of STEP_BY_EVENT[court]) {
    if (!described.has(row.event)) continue;
    if (row.side && row.side !== side) continue;
    return findStage(row.step) ? row.step : "";
  }
  return "";
}

/** Every step the table can name, for the suite. */
export function stepsNamedByEvents(): string[] {
  return Object.values(STEP_BY_EVENT).flatMap((rows) => rows.map((row) => row.step));
}

/**
 * The read dates as the card's offers: a full date is a one-click suggestion;
 * a month and day without a year is offered for the person to choose the year.
 */
export function datesFromPicture(
  picture: CasePicture | null | undefined,
  now: Date = new Date(),
): Record<string, { value: string; basis: string; yearAssumed?: boolean }> {
  const offers: Record<string, { value: string; basis: string; yearAssumed?: boolean }> = {};
  if (!picture) return offers;
  for (const date of picture.dates) {
    if (date.date) {
      offers[date.questionId] = { value: date.date, basis: `You wrote: “${date.quote}”` };
      continue;
    }
    // No year in their words: the nearest such date is listed first among the
    // two the card offers, and nothing is counted until they pick one.
    const today = now.toISOString().slice(0, 10);
    const thisYear = `${now.getFullYear()}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
    if (Number.isNaN(Date.parse(thisYear))) continue;
    const upcoming = /conference|trial|hearing|mediation/.test(date.questionId);
    const nearest = upcoming
      ? thisYear >= today
        ? thisYear
        : `${now.getFullYear() + 1}${thisYear.slice(4)}`
      : thisYear <= today
        ? thisYear
        : `${now.getFullYear() - 1}${thisYear.slice(4)}`;
    offers[date.questionId] = { value: nearest, basis: `You wrote: “${date.quote}”`, yearAssumed: true };
  }
  return offers;
}

/**
 * A picture stored on the case (master_result.casePicture), re-checked for
 * shape before any page uses it: a missing or malformed one is null, and the
 * page behaves as if the reader were off.
 */
export function readStoredPicture(value: unknown): CasePicture | null {
  if (!value || typeof value !== "object") return null;
  const stored = value as Record<string, unknown>;
  if (!Array.isArray(stored.events) || !Array.isArray(stored.dates)) return null;
  const events = stored.events.filter(
    (event): event is Quoted<CaseEvent> =>
      !!event && typeof event === "object" && typeof (event as Quoted<string>).value === "string" && (event as Quoted<string>).value in CASE_EVENTS,
  );
  const dates = stored.dates.filter(
    (date): date is ReadDate =>
      !!date &&
      typeof date === "object" &&
      isDateQuestionId(String((date as ReadDate).questionId)) &&
      Number.isInteger((date as ReadDate).month) &&
      Number.isInteger((date as ReadDate).day) &&
      ((date as ReadDate).date === null || typeof (date as ReadDate).date === "string"),
  );
  const side = stored.side as CasePicture["side"];
  return {
    ...EMPTY_PICTURE,
    side: side && (side.value === "bringing" || side.value === "responding") ? side : null,
    events,
    dates,
    amount: (stored.amount as CasePicture["amount"]) ?? null,
    otherParty: (stored.otherParty as CasePicture["otherParty"]) ?? null,
    married: (stored.married as CasePicture["married"]) ?? null,
    childTogether: (stored.childTogether as CasePicture["childTogether"]) ?? null,
  };
}
