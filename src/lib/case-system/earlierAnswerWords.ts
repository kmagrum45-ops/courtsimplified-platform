/**
 * AN ANSWER GIVEN FOR AN EARLIER VERSION OF THE STORY, IN WORDS (the review's "Other answers given for an
 * earlier version of your story", IntakeReviewPanel; founder's Chrome check of #541, 2 Nov).
 *
 * The review showed the stored value as it is kept: the questions answered one at a time as their ids
 * ("sc-orient-role / sc-claim-filed / ..."), the chosen kind of claim with its id ("sc-claim-homeowner-wont-pay-
 * contractor; A homeowner will not pay the contractor; ..."), and each kept answer object as "[object Object]".
 * Present on main too (the panel's shownAnswer, unchanged by #541). Here every stored shape has its words:
 *   - a question id: the question as asked (QUESTION_BANK text);
 *   - a kept answer {questionId, answerText} or {question, answer}: "question: answer";
 *   - the kind of claim {claimTypeId, claimTypeName, quote}: its name;
 *   - any other object: its plain text values that are not codes; a code alone: nothing.
 * Nothing it returns holds a raw code or object text (copy/rawKeys.ts rawKeysIn; test:raw-keys checks it).
 * Pure; states no law.
 */
import { QUESTION_BANK } from "./intake/questionBank";
import { rawKeysIn } from "./copy/rawKeys";

const QUESTION_TEXT = new Map(QUESTION_BANK.map((question) => [question.id, question.text]));
/** A stored choice such as "not-sure", shown in words; a question id as its question. */
const SLUG = /^[a-z]+(?:-[a-z0-9]+)+$/;

function itemWords(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const text = value.trim();
    if (QUESTION_TEXT.has(text)) return QUESTION_TEXT.get(text)!;
    if (SLUG.test(text)) return rawKeysIn(text).length ? "" : text.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
    return text;
  }
  if (Array.isArray(value)) return value.map(itemWords).filter(Boolean).join("\n");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const question = typeof record.questionId === "string" ? QUESTION_TEXT.get(record.questionId) ?? "" : typeof record.question === "string" ? record.question : "";
    const answer = "answerText" in record ? itemWords(record.answerText) : "answer" in record ? itemWords(record.answer) : null;
    if (answer !== null) return question ? `${question}: ${answer}` : answer;
    if (typeof record.claimTypeName === "string") return record.claimTypeName;
    return Object.values(record).map((item) => (typeof item === "object" ? "" : itemWords(item))).filter(Boolean).join("; ");
  }
  return "";
}

/** The words for one earlier answer as stored (a section's field, or one of its keys). */
export function earlierAnswerWords(value: unknown): string {
  return itemWords(value);
}
