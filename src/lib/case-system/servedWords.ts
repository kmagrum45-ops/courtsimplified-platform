/**
 * Words saying the person was SERVED (given court papers). A date in such a sentence is the day served, its own fact
 * (servedDate), never the day the dispute happened (Chrome check of #547 at 0e0f7e9, G3a). One rule, read by every story
 * reader that suggests "When it happened" (intakeReview.ts whenItHappened, storyAnswerProposals.ts).
 */
import { sentenceAt } from "./sentences";

export const SERVED_WORDS = /\b(?:(?:was|were|been|got|get|being)\s+served|served\s+(?:me|us|on\s+me|on\s+us)|service\s+of\s+(?:the|a|their|his|her)\s+(?:claim|papers|application|statement|motion))\b/i;

/** Whether the date at `index` sits in a sentence about being served (the shared sentence reader, sentences.ts). */
export function servedDateAt(text: string, index: number): boolean {
  const sentence = sentenceAt(text, index);
  return SERVED_WORDS.test(sentence ? sentence.text : text);
}
