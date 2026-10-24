/** Plain readings of a Family story, shared by the triage and the builder (no React, no network). */
import { sentenceAt } from "./sentences";

/**
 * The clause of the story just before a position: from the start of its sentence (the
 * shared splitter, so "Dr. Patel" does not start one) to the position, after any ";"
 * or ", but" / ", and".
 */
function clauseBefore(story: string, index: number): string {
  const sentence = sentenceAt(story, index);
  return story.slice(sentence ? sentence.start : 0, index).split(/;|,\s*(?:but|and)\b/i).pop() ?? "";
}

export function existingFamilyOrder(story: string): boolean {
  return existingFamilyOrderQuote(story) !== null;
}

/**
 * The sentence of the story that says there is already an order, or null. Shown
 * with it, so the site never states the fact without the person's own words
 * (#469 re-test: "You told us there is already a court order" when nothing like
 * that was entered). Asking FOR an order ("I want a support order", "asking for a
 * parenting order") is not having one.
 */
export function existingFamilyOrderQuote(story: string): string | null {
  const pattern = /\b(?:court order|(?:final|support|custody|parenting) order|ordered (?:him |her |them |me )?to pay|motion to change|family responsibility office|\bFRO\b|order (?:from|says|made) )/gi;
  for (const match of story.matchAll(pattern)) {
    const clause = clauseBefore(story, match.index ?? 0);
    if (/\b(?:no|never|not|without|nor|n't)\b/i.test(clause)) continue;
    // Asking for an order is not having one; wanting a motion to change, or the FRO, still means one exists.
    if (/order/i.test(match[0]) && !/motion to change/i.test(match[0]) && /\b(?:want|wants|wanted|asking|ask|asked|seek|seeking|apply|applying|need|needs|get|getting|hope|hoping|like|request|requesting|would)\b/i.test(clause)) continue;
    // The whole sentence, by the shared splitter (step 1 reviewer: "My lawyer is Dr. Patel and
    // there is a court order" was quoted from "Patel").
    return sentenceAt(story, match.index ?? 0)?.text ?? story.trim();
  }
  return null;
}

/**
 * True when a phrase is mentioned and not denied in its own clause. "We never
 * had a court order" mentions "court order" and says the opposite (PR #463
 * re-test, 2026-10-18: a served Application with "never a court order" got the
 * existing-order banner).
 */
function mentionedNotNegated(pattern: RegExp, story: string): boolean {
  for (const match of story.matchAll(pattern)) {
    const clause = clauseBefore(story, match.index ?? 0);
    if (!/\b(?:no|never|not|without|nor|n't)\b/i.test(clause)) return true;
  }
  return false;
}

/**
 * The person was served with someone else's family case (2026-10-13,
 * walkthrough: a father served with an application read the rules about where
 * to START a case first). They answer in the court where it was started.
 */
export function respondingInFamilyStory(story: string): boolean {
  return /\b(?:(?:was|been|got|i was|they) served|served (?:me|with)|application (?:against|from)|respondent|filed (?:a case |an application )?against me|took me to court|taking me to court|answer (?:the|her|his|their) application)\b/i.test(story);
}
