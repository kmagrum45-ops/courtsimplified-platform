/**
 * The in-app deadline reminder (master plan 6D, 2026-10-14): on "My cases",
 * each case shows its nearest counted date, so a person who opens the site
 * sees what is coming without opening every case.
 *
 * Reads only what the Timeline view already returns
 * (/api/workspace/organisation?view=timeline): the deadline engine's counted
 * dates for the step the person chose and the dates they gave, titled by the
 * stage map. Writes no law and counts nothing itself (CLAUDE.md s. 2a): it
 * picks one of the engine's dates and says how many days away it is.
 *
 * Email reminders are a separate decision (docs/DEADLINE_TRACKING_DESIGN.md
 * s. 2.3): they put case content in an email, a privacy-notice change, and
 * share Supabase's 30-an-hour mail limit with password resets.
 *
 * Pure.
 */

import type { TimelineItem } from "./timeline";

export type CountedDateReminder = {
  /** The stage map's name for the deadline. */
  title: string;
  /** ISO date the engine counted. */
  date: string;
  /** As the Timeline shows it. */
  displayDate: string;
  /** Whole days from today (Ontario); negative once passed. */
  daysAway: number;
  passed: boolean;
};

/** How far ahead a counted date is shown as coming up. */
export const REMINDER_HORIZON_DAYS = 30;
/** How long a passed date stays on the card, so it is seen, then gives way. */
export const PASSED_SHOWN_DAYS = 14;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Today in Ontario, as an ISO date. */
export function ontarioToday(now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
    const iso = `${part("year")}-${part("month")}-${part("day")}`;
    if (ISO.test(iso)) return iso;
  } catch {
    // No time-zone data: the device's own day.
  }
  return now.toISOString().slice(0, 10);
}

/**
 * The one counted date to show for a case: the nearest one still to come
 * within the horizon; failing that, the latest one that passed in the last
 * two weeks (a passed date matters more than nothing, and is said plainly);
 * otherwise none.
 */
export function nextCountedDate(items: readonly TimelineItem[], today: string): CountedDateReminder | null {
  if (!ISO.test(today)) return null;
  const now = dayNumber(today);
  const counted = items
    .filter((item) => item.source.kind === "computed" && ISO.test(item.date))
    .map((item) => {
      const daysAway = dayNumber(item.date) - now;
      return {
        title: item.title,
        date: item.date,
        displayDate: item.displayDate,
        daysAway,
        passed: daysAway < 0 || Boolean(item.standing?.passed),
      };
    });
  const coming = counted
    .filter((entry) => !entry.passed && entry.daysAway <= REMINDER_HORIZON_DAYS)
    .sort((a, b) => a.daysAway - b.daysAway);
  if (coming.length) return coming[0];
  const passed = counted
    .filter((entry) => entry.passed && entry.daysAway >= -PASSED_SHOWN_DAYS)
    .sort((a, b) => b.daysAway - a.daysAway);
  return passed[0] ?? null;
}

/** The card's one line. Names the date and the distance; says it was counted, never that it is certain. */
export function reminderLine(reminder: CountedDateReminder): string {
  if (reminder.passed) {
    return `${reminder.title}: the date counted from what you gave, ${reminder.displayDate}, has passed. Open the case to see what comes next.`;
  }
  const when = reminder.daysAway === 0 ? "today" : reminder.daysAway === 1 ? "tomorrow" : `in ${reminder.daysAway} days`;
  return `${reminder.title}: ${reminder.displayDate}, ${when}. Counted from the dates you gave; check it against your court papers.`;
}
