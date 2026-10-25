/**
 * Words that suggest the person may be in danger from someone: threats,
 * violence, harassment, fear for their safety. A screen for whether to ask the
 * safety question, never a finding about anyone.
 */
export const DANGER_WORDS =
  /\b(?:threat(?:en(?:ed|ing|s)?)?|unsafe|afraid|scared|frightened|in danger|harass(?:ed|ing|ment)?|stalk(?:ed|ing)?|hit me|hurt me|hits me|beat(?:s)? me|attack(?:ed)? me|assault(?:ed)? me|abus(?:e|ed|ive)|violen(?:t|ce)|weapon|knife|gun|kill|follow(?:s|ed|ing)? me|restraining order|peace bond)\b/i;

export function storySuggestsDanger(text: string): boolean {
  return DANGER_WORDS.test(text);
}
