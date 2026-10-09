/**
 * Law as it read on a past date (scripts/retrieval/historicalSources.ts holds
 * the list). Shared by the index build and the checked answer, so both agree
 * on what counts as historical.
 */

export const HISTORICAL_ID_PREFIX = "historical-";

/** True for a passage or source id from the historical shelf ("corpus:historical-...:3" or "historical-..."). */
export function isHistoricalId(id: string): boolean {
  return id.replace(/^[a-z]+:/, "").startsWith(HISTORICAL_ID_PREFIX);
}

/**
 * A statement may rest on a past version of a law only if it says it is about
 * the past: it names a year, or "at the time", "then", "former", "before it
 * was repealed", and the like. "The Crown cannot be sued for ..." from a 2007
 * text, said in the present tense, would state old law as today's
 * (owner, 2026-10-09).
 */
export function historicalStatementOk(text: string): boolean {
  return /\b(?:1[89]\d{2}|20\d{2})\b|\bat the time\b|\bthen in force\b|\bin force (?:then|at that time)\b|\bformer\b|\bbefore (?:it|the act|the law) was (?:repealed|replaced|amended)\b|\bused to\b|\bas it (?:then )?read\b/i.test(
    text,
  );
}
