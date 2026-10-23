/**
 * ONE WAY TO SPLIT THE PERSON'S WORDS INTO SENTENCES (#471 re-test).
 *
 * A full stop after one of these does not end a sentence: "I want Test Builder
 * Ltd. to finish the work" was cut at "Ltd." (PR #463 re-test, 2026-10-18), and
 * the same plain split elsewhere read "I paid Test Roofing Ltd. $9,000" as a
 * sentence starting "$9,000", so the payment was offered as the amount claimed.
 * Every place that quotes or reads the person's sentences uses this.
 *
 * Pure.
 */
const ABBREVIATIONS = /\b(?:ltd|inc|corp|co|llc|llp|mr|mrs|ms|dr|st|ave|rd|no|jr|sr|vs|etc|e\.g|i\.e|approx|apt)\.$/i;

/** The sentences, and separate lines, of a text; an abbreviation's full stop does not end one. */
export function sentences(text: string): string[] {
  const out: string[] = [];
  for (const piece of text.split(/(?<=[.!?])\s+|\n+/)) {
    const previous = out[out.length - 1];
    if (previous !== undefined && ABBREVIATIONS.test(previous)) out[out.length - 1] = `${previous} ${piece.trim()}`;
    else out.push(piece.trim());
  }
  return out.filter(Boolean);
}
