/**
 * Formats a money amount the user typed, for display only.
 *
 * COSTS NOTHING. Pure string work, no API call, no legal judgment.
 *
 * THE RULE: FORMAT WHAT IS UNAMBIGUOUS, RETURN THE REST UNTOUCHED.
 *
 * A user types "10000.00", "$10,000", "10,000.00" or "about ten grand plus
 * costs". The first three are the same number written three ways and should
 * all render as `$10,000.00`. The fourth is not a number and must be shown
 * back exactly as typed.
 *
 * The temptation is to pull the digits out of anything and format those. That
 * would turn "about $10,000 plus costs" into "$10,000.00" — dropping "about"
 * and "plus costs", which changes what the user said about their own claim.
 * Display formatting must never remove a qualifier. So the parse is
 * deliberately strict: the WHOLE string, once currency symbols, separators and
 * surrounding whitespace are removed, must be a plain number. Anything else is
 * returned verbatim.
 *
 * This is not a judgment about the amount, its reasonableness, or whether it
 * is within any monetary limit. It is digits and separators.
 */

/** Canadian dollars, two decimals, grouped — the format a court form uses. */
const FORMATTER = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  currencyDisplay: "symbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * The strict shape: optional leading `$`, digits with optional thousands
 * separators (comma or space), optional decimal part of one or two digits.
 * Anything outside this — words, ranges, "plus costs", "approx" — fails.
 */
const PLAIN_AMOUNT = /^\$?\s*(\d{1,3}(?:[, ]\d{3})*|\d+)(?:\.(\d{1,2}))?$/;

/**
 * Parses a recorded amount to a number, or null when the string is not a
 * plain amount. Exported so callers can branch on "is this a bare number"
 * without re-implementing the test.
 */
export function parseRecordedAmount(raw: unknown): number | null {
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  const match = PLAIN_AMOUNT.exec(trimmed);
  if (!match) return null;

  const whole = match[1].replace(/[, ]/g, "");
  const fraction = match[2] || "0";

  const value = Number(`${whole}.${fraction}`);
  return Number.isFinite(value) ? value : null;
}

/**
 * The display string for a recorded amount.
 *
 * Returns `$10,000.00` for "10000.00", "$10,000" and "10,000.00" alike, and
 * returns the user's own text unchanged for anything it cannot parse as a
 * plain number. Never returns an empty string for a non-empty input.
 */
export function formatRecordedAmount(raw: unknown): string {
  if (typeof raw !== "string") return "";

  const trimmed = raw.trim();
  if (!trimmed) return "";

  const value = parseRecordedAmount(trimmed);
  return value === null ? trimmed : FORMATTER.format(value);
}
