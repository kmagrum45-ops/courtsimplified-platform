/**
 * The word-for-word quote check, in one place.
 *
 * A quote counts only when, after lower-casing and setting aside quote marks
 * and spacing, it is at least MIN_QUOTE_CHARS long and appears in the source
 * text. Library quotes are checked this way (groundedCognition.checkCitation),
 * and so are quotes from a court decision a person uploaded to their own case
 * (case-workspace/courtDecision.ts) -- the same function, so the two cannot
 * drift apart. No imports: safe in the browser and on the server.
 */

export const MIN_QUOTE_CHARS = 15;

export function normalizeQuoteText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when `quote` is long enough to prove anything and appears in `source`. */
export function quoteAppearsIn(quote: string, source: string): boolean {
  const wanted = normalizeQuoteText(quote);
  return wanted.length >= MIN_QUOTE_CHARS && normalizeQuoteText(source).includes(wanted);
}
