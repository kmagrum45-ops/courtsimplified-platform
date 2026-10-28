/**
 * WHAT A PERSON IS TOLD WHEN AN AI LIMIT IS REACHED (site owner, 2026-10-28).
 *
 * One copy of the words, used by the server (aiRateLimit.ts refusedResponseBody) and read back by
 * every screen that calls a limited route (limitMessageOf). Before, each screen showed its own
 * guess: the chat said "try again in a moment" when the wait was an hour, and "Explain in plain
 * words" said its check had failed. Safe in the browser: no server-only imports.
 */

/** When the site's daily count starts again: the next midnight UTC (the counter's day), in Toronto time. */
export function dailyResetWords(now: number = Date.now()): string {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  const time = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hour: "numeric", minute: "2-digit", hour12: true }).format(next).replace(":00", "");
  // After that hour in Toronto the next start is tomorrow's (reviewer of #509: "8 p.m." alone misleads at 9 p.m.).
  const day = (moment: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(moment);
  return `${time} ${day(next) === day(new Date(now)) ? "today" : "tomorrow"}`;
}

export function visitorLimitWords(): string {
  return "You have reached the limit for this kind of help for the past hour. Please try again in an hour.";
}

export function dailyLimitWords(now: number = Date.now()): string {
  return `The site has reached its limit for this kind of help for today. It starts again at ${dailyResetWords(now)}, Toronto time.`;
}

/** The words to show when a response is a limit refusal (status 429 with `limited`), else null. */
export function limitMessageOf(status: number, body: unknown): string | null {
  if (status !== 429) return null;
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (record.limited !== "visitor" && record.limited !== "daily") return null;
  if (typeof record.error === "string" && record.error.trim()) return record.error.trim();
  return record.limited === "visitor" ? visitorLimitWords() : dailyLimitWords();
}
