/**
 * WHAT A PERSON IS TOLD WHEN AN AI LIMIT IS REACHED (site owner, 2026-10-28).
 *
 * One copy of the words, used by the server (aiRateLimit.ts refusedResponseBody) and read back by
 * every screen that calls a limited route (limitMessageOf). Before, each screen showed its own
 * guess: the chat said "try again in a moment" when the wait was an hour, and "Explain in plain
 * words" said its check had failed. Safe in the browser: no server-only imports.
 */

import { timeOfDayInOntario, todayInOntario } from "../case-system/dates";

/** When the site's daily count starts again: the next midnight UTC (the counter's day), in Toronto time. */
export function dailyResetWords(now: number = Date.now()): string {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  // The shared Ontario readers (dates.ts). After that hour in Toronto the next start is tomorrow's
  // (reviewer of #509: "8 p.m." alone misleads at 9 p.m.).
  return `${timeOfDayInOntario(next)} ${todayInOntario(next) === todayInOntario(new Date(now)) ? "today" : "tomorrow"}`;
}

export function visitorLimitWords(): string {
  return "You have reached the limit for this kind of help for the past hour. Please try again in an hour.";
}

export function dailyLimitWords(now: number = Date.now()): string {
  return `The site has reached its limit for this kind of help for today. It starts again at ${dailyResetWords(now)}, Toronto time.`;
}

/**
 * A signed-in person's own allowance over a rolling 24 hours (help with a court decision, document
 * analysis). Rolling, so "tomorrow" would be wrong: it comes back as each use passes 24 hours.
 */
export function personLimitWords(used: string): string {
  return `You have ${used} in the past 24 hours, which is the limit. It becomes available again as each of those passes 24 hours.`;
}

/** The kinds of limit a refusal names (`limited` in its body). */
export type LimitKind = "visitor" | "daily" | "person";

/** The words to show when a response is a limit refusal (status 429 with `limited`), else null. */
export function limitMessageOf(status: number, body: unknown): string | null {
  if (status !== 429) return null;
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (record.limited !== "visitor" && record.limited !== "daily" && record.limited !== "person") return null;
  if (typeof record.error === "string" && record.error.trim()) return record.error.trim();
  return record.limited === "visitor" ? visitorLimitWords() : record.limited === "daily" ? dailyLimitWords() : "You have reached the limit for this kind of help for the past 24 hours.";
}

/**
 * THE SITE'S DAILY SPENDING LIMIT FOR AI HELP (site owner, 10 Nov 2026; aiSpendLimit.ts). One person's day, one address's
 * day or the whole site's day: the same words, exactly as the owner set them.
 */
export const AI_LIMIT_WORDS =
  "You've reached today's limit for AI help. Your case is saved. The rest of the site still works, and AI help is back tomorrow.";

/**
 * The cookie the server sets when it refuses a call for a spending limit. Its value names the kind of limit and when
 * that limit ends ("user-hourly|1794445200000"); it expires then, and a later call that succeeds clears it
 * (site owner, 11 Nov 2026: an hour's limit had said "back tomorrow" until midnight). AiLimitNotice reads it.
 */
export const AI_LIMIT_COOKIE = "cs_ai_limit";

/** The spending limits (aiSpendLimit.ts SpendLimitKind), named here so the browser can read the mark. */
export type SpendKind = "user-daily" | "user-hourly" | "ip-daily" | "site-daily";
const KINDS: readonly SpendKind[] = ["user-daily", "user-hourly", "ip-daily", "site-daily"];

/** The next Toronto midnight after `now` (Toronto's offsets are whole hours: the first hour whose day is another). */
function nextOntarioMidnight(now: number): number {
  const today = todayInOntario(new Date(now));
  let at = Math.floor(now / 3_600_000) * 3_600_000 + 3_600_000;
  while (todayInOntario(new Date(at)) === today) at += 3_600_000;
  return at;
}

/** When a limit refused at `now` lets help back: the next clock hour for the hourly limit, else the next Toronto midnight. */
export function limitEndsAt(kind: SpendKind, now: number): number {
  return kind === "user-hourly" ? Math.floor(now / 3_600_000) * 3_600_000 + 3_600_000 : nextOntarioMidnight(now);
}

/** The words for a refusal by this limit: the owner's words for a day's limit; for the hour's, the time help is back. */
export function limitWordsFor(kind: SpendKind, now: number = Date.now()): string {
  if (kind !== "user-hourly") return AI_LIMIT_WORDS;
  return `You've reached this hour's limit for AI help. Your case is saved. The rest of the site still works, and AI help is back at ${timeOfDayInOntario(new Date(limitEndsAt(kind, now)))}.`;
}

/** The mark a refusal leaves: its cookie value, how long it lasts (seconds) and when it ends. Pure. */
export function limitMark(kind: SpendKind, now: number): { value: string; maxAge: number; until: number } {
  const until = limitEndsAt(kind, now);
  return { value: `${kind}|${until}`, maxAge: Math.max(1, Math.round((until - now) / 1000)), until };
}

/** The banner's words for the mark in a cookie string while it lasts, else null (no mark, an old mark, or its time passed). Pure. */
export function limitNoticeWords(cookieString: string, now: number): string | null {
  for (const part of cookieString.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== AI_LIMIT_COOKIE) continue;
    const [kind, until] = decodeURIComponent(rest.join("=")).split("|");
    const ends = Number(until);
    if (!KINDS.includes(kind as SpendKind) || !Number.isFinite(ends) || now >= ends) return null;
    return limitWordsFor(kind as SpendKind, ends - 1);
  }
  return null;
}
