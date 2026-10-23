/**
 * ONE RULE FOR A DATE TYPED WITHOUT ITS YEAR (#471 re-test).
 *
 * A day and month with no year ("October 6", "6 Oct", "10/06") is asked for its
 * year, in every box that asks for a date, in every area: the questions one at a
 * time (Small Claims, civil, Family), the review panel's questions and its
 * served-date box. Before, only Family's served-date question and the review
 * box asked; Small Claims and civil kept "October 6", and the results page then
 * asked "2026 or 2025?" (or, in Small Claims' guided questions, dropped it).
 *
 * Pure. Practical reading of the person's own words, not law.
 */

const MONTH = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
const MONTH_DAY = new RegExp(`\\b${MONTH}\\s+\\d{1,2}(?:st|nd|rd|th)?\\b`, "i");
const DAY_MONTH = new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH}(?![a-z])`, "i");
const NUMERIC_DAY_MONTH = /\b\d{1,2}[/-]\d{1,2}\b(?![/-]\d)/;
const YEAR = /\b(?:19|20)\d{2}\b/;

export const ADD_THE_YEAR = "Please add the year, for example October 6, 2026.";

/** The request to add the year when the answer names a day without one, or null. */
export function needsYear(answer: string): string | null {
  const text = answer.trim();
  if (!text || YEAR.test(text)) return null;
  return MONTH_DAY.test(text) || DAY_MONTH.test(text) || NUMERIC_DAY_MONTH.test(text) ? ADD_THE_YEAR : null;
}

/** Whether a question asks for a date ("When ...?", "What day ...?", "... date ..."). */
export function asksForDate(question: string): boolean {
  return /\b(?:when|what day|which day|date)\b/i.test(question);
}
