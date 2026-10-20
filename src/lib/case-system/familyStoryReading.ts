/** Plain readings of a Family story, shared by the triage and the builder (no React, no network). */

export function existingFamilyOrder(story: string): boolean {
  return mentionedNotNegated(/\b(?:court order|(?:final|support|custody|parenting) order|ordered (?:him |her |them |me )?to pay|motion to change|family responsibility office|\bFRO\b|order (?:from|says|made) )/gi, story);
}

/**
 * True when a phrase is mentioned and not denied in its own clause. "We never
 * had a court order" mentions "court order" and says the opposite (PR #463
 * re-test, 2026-10-18: a served Application with "never a court order" got the
 * existing-order banner).
 */
function mentionedNotNegated(pattern: RegExp, story: string): boolean {
  for (const match of story.matchAll(pattern)) {
    const clause = story.slice(0, match.index).split(/[.;!?\n]|,\s*(?:but|and)\b/i).pop() ?? "";
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
