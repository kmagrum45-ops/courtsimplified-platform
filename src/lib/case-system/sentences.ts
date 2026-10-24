/**
 * ONE WAY TO SPLIT THE PERSON'S WORDS INTO SENTENCES (#471 re-test).
 *
 * A full stop after one of these does not end a sentence: "I want Test Builder
 * Ltd. to finish the work" was cut at "Ltd." (PR #463 re-test, 2026-10-18), and
 * the same plain split elsewhere read "I paid Test Roofing Ltd. $9,000" as a
 * sentence starting "$9,000", so the payment was offered as the amount claimed.
 * Every place that quotes or reads the person's sentences, or splits the site's
 * own text into sentences (reading level, a card's lead), uses this.
 *
 * Pure.
 */
import { MONTH_NAMES_PATTERN, MONTH_WORDS_EN } from "./dates";

// An abbreviation counts only as a whole word: "the respondent's." is not "s." (step 1
// reviewer: the reading level joined "...the respondent's. Serve notice..." into one).
const WORD_START = String.raw`(?:^|[\s(])`;
// Titles and addresses: a name or place follows ("Dr. Patel", "St. Catharines").
const TITLES = new RegExp(String.raw`${WORD_START}(?:mr|mrs|ms|dr|prof|rev|hon|st|ave|blvd|rd|jr|sr|vs|e\.g|i\.e|o|reg|regs)\.$`, "i");
// Company endings and "etc.": the sentence goes on only into a small word, a number or an
// amount ("Ltd. to finish", "Ltd. $9,000"), so "I sued Bob Co. He lost." is two sentences.
const COMPANY = new RegExp(String.raw`${WORD_START}(?:ltd|inc|corp|co|llc|llp|etc|approx|apt)\.$`, "i");
// "R. v. Jordan": "v." in small letters only, so "except Part V." still ends a sentence.
const VERSUS = new RegExp(String.raw`${WORD_START}v\.$`);
// The legal references the site's own text and decisions carry ("s. 24 (1)", "r. 14.05",
// "para. 12", "No. 5"): joined only when a number, a bracket or "v." follows.
const BEFORE_NUMBER = new RegExp(String.raw`${WORD_START}(?:no|s|ss|r|rr|para|paras|art|sch|subs|cl)\.$`, "i");
// A shortened month before its day ("Oct. 6, 2026"); a full month name ends a sentence
// ("in March. 2 days later").
const FULL_MONTHS = new Set(MONTH_WORDS_EN.map((month) => month.toLowerCase()));
const SHORT_MONTHS = MONTH_NAMES_PATTERN.split("|").filter((name) => !FULL_MONTHS.has(name.toLowerCase()) && name.length <= 5);
const MONTH_ABBREVIATION = new RegExp(String.raw`${WORD_START}(?:${SHORT_MONTHS.join("|")})\.$`, "i");

function continues(previous: string, next: string): boolean {
  if (TITLES.test(previous) || VERSUS.test(previous)) return true;
  if (COMPANY.test(previous)) return /^[a-z\d$(]/.test(next);
  if (BEFORE_NUMBER.test(previous)) return /^(?:\d|\(|v\.)/.test(next);
  return MONTH_ABBREVIATION.test(previous) && /^\d/.test(next);
}

/** A sentence's place in the text: where it starts and ends, and its text. */
export type SentenceSpan = { start: number; end: number; text: string };

/**
 * Each sentence, and separate line, of a text with where it sits; an abbreviation's
 * full stop does not end one, and a line break always does.
 */
export function sentenceSpans(text: string): SentenceSpan[] {
  const spans: (SentenceSpan & { pieces: string[] })[] = [];
  const boundary = /(?<=[.!?])\s+|\n+/g;
  let from = 0;
  let afterLineBreak = false;
  const take = (to: number) => {
    const raw = text.slice(from, to);
    const piece = raw.trim();
    if (piece) {
      const start = from + raw.indexOf(piece);
      const previous = spans[spans.length - 1];
      if (previous && !afterLineBreak && continues(previous.pieces.join(" "), piece)) {
        previous.pieces.push(piece);
        previous.end = start + piece.length;
      } else spans.push({ start, end: start + piece.length, text: "", pieces: [piece] });
    }
  };
  for (const match of text.matchAll(boundary)) {
    take(match.index ?? 0);
    afterLineBreak = match[0].includes("\n");
    from = (match.index ?? 0) + match[0].length;
  }
  take(text.length);
  // A joined sentence never crosses a line break, so its text is the person's words as written.
  return spans.map(({ start, end }) => ({ start, end, text: text.slice(start, end) }));
}

/** The sentences, and separate lines, of a text; an abbreviation's full stop does not end one. */
export function sentences(text: string): string[] {
  return sentenceSpans(text).map((span) => span.text);
}

/** The sentence a position in the text falls in, or null. */
export function sentenceAt(text: string, index: number): SentenceSpan | null {
  return sentenceSpans(text).find((span) => index >= span.start && index < span.end) ?? null;
}
