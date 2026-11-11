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

/** The cookie the server sets when it refuses a call for that limit (its value: the Toronto day). AiLimitNotice reads it. */
export const AI_LIMIT_COOKIE = "cs_ai_limit";

/** True when the cookie string holds today's limit mark (yesterday's mark has expired in effect). Pure. */
export function aiLimitMarkedToday(cookieString: string, today: string): boolean {
  return cookieString.split(";").some((part) => {
    const [name, ...value] = part.trim().split("=");
    return name === AI_LIMIT_COOKIE && decodeURIComponent(value.join("=")) === today;
  });
}
