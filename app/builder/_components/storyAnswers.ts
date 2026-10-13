/**
 * Answers the person's own story already gives, with the words they came from
 * (2026-10-13). Used by the one-question-at-a-time chat to offer an answer
 * for one click ("From what you told us: ... Is that right?") instead of
 * asking for it cold. Each reader returns null unless the words say it
 * plainly; nothing here is ever applied without being shown.
 *
 * Pure: no browser, no network, no model.
 */

export type StoryAnswer = { value: string; quote: string };

function sentences(story: string): string[] {
  return story
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function firstSentence(story: string, pattern: RegExp): string | null {
  return sentences(story).find((sentence) => pattern.test(sentence)) ?? null;
}

const SUED_ME =
  /\b(?:su(?:ing|ed|es) me|(?:got |was |been )?served (?:me )?(?:with )?(?:a |the )?(?:statement of claim|claim|papers|application)|served me|took me to court|taking me to court|started a (?:court )?case against me|(?:filed|brought) (?:a |an )?(?:claim|case|application) against me|i got served|(?:got|received) (?:a |the )?statement of claim)\b/i;
const I_SUE =
  /\b(?:i (?:want|need|would like|plan) to (?:sue|take (?:him|her|them|my \w+) to court|start a (?:court )?case|file (?:a |an )?(?:claim|application)|apply)|i(?:'m| am|m) suing|im suing|i sued|i filed (?:a |an |my )?(?:claim|application|case))\b/i;

/** Civil: "plaintiff" or "defendant", when the story says which plainly. */
export function civilRoleFromStory(story: string): StoryAnswer | null {
  const sued = firstSentence(story, SUED_ME);
  const suing = firstSentence(story, I_SUE);
  if (sued && !suing) return { value: "defendant", quote: sued };
  if (suing && !sued) return { value: "plaintiff", quote: suing };
  return null;
}

/** Family: "applicant" or "respondent", when the story says which plainly. */
export function familyRoleFromStory(story: string): StoryAnswer | null {
  const sued = firstSentence(story, SUED_ME);
  const starting = firstSentence(story, I_SUE);
  if (sued && !starting) return { value: "respondent", quote: sued };
  if (starting && !sued) return { value: "applicant", quote: starting };
  return null;
}

const MONEY = /\$\s?\d[\d,]*(?:\.\d{2})?|\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b|\b\d+(?:\.\d+)?\s?k\b|\b\d{3,7}\s?dollars\b|\b(?:for|owe[sd]?|of|paid|lent|worth|costs?|claim(?:ing)?)\s+\$?\d{3,7}\b|\b\d{4,7}\b/i;

/** The first amount of money the story names ("75,000", "$5,200", "for 68000"); never a year. */
export function amountFromStory(story: string): StoryAnswer | null {
  for (const sentence of sentences(story)) {
    const match = MONEY.exec(sentence);
    if (!match) continue;
    const digits = match[0].replace(/[^\d.k]/gi, "");
    const number = /k$/i.test(digits) ? Number(digits.slice(0, -1)) * 1000 : Number(digits);
    if (!Number.isFinite(number) || number <= 0) continue;
    // "in 2022", "since 2019": a year, not money.
    if (number >= 1900 && number <= 2100 && !/[$,]|dollars/i.test(match[0])) continue;
    return { value: `$${number.toLocaleString("en-CA")}`, quote: sentence };
  }
  return null;
}

/** What the person says they want ("i want my money back", "I want joint custody"). */
export function goalFromStory(story: string): StoryAnswer | null {
  for (const sentence of sentences(story)) {
    const match = /\bi (?:want|need|would like|am asking for|just want)\b/i.exec(sentence);
    if (!match) continue;
    const before = sentence.slice(Math.max(0, match.index - 20), match.index).toLowerCase();
    // "i dont know what i need to bring": a question, not what they want.
    if (/\b(?:what|if|whether|know|sure|how)\s*$/.test(before)) continue;
    const value = sentence.slice(match.index).replace(/^i /i, "I ").trim();
    // "I want to sue the city" is how, not what they want ordered.
    if (/^I (?:want|need|would like) to (?:sue|take|file|start|know|understand|ask|bring)\b/i.test(value)) continue;
    if (value.length >= 8) return { value, quote: sentence };
  }
  return null;
}

/** The children, when the story says how old they are. */
export function childrenFromStory(story: string): StoryAnswer | null {
  const AGE = "(?:\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)";
  const pattern = new RegExp(
    `\\b(?:daughters?|sons?|kids?|children|child|baby|boys?|girls?)\\b[^.]{0,30}?\\b(?:is|are|aged|age)?\\s*${AGE}\\b(?!\\s*(?:years?|yrs?)\\s+ago)|\\b${AGE}[- ](?:year|yr)s?[- ]old\\b`,
    "i",
  );
  const sentence = firstSentence(story, pattern);
  return sentence ? { value: sentence, quote: sentence } : null;
}
