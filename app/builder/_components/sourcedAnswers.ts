/**
 * Follow-up answers kept with a case (intakeData.extra.sourcedAnswers), as
 * plain functions with no browser or network code, so a check can run them
 * (build order Step 2A, 2026-10-12).
 */

/** Same cap as SourcedQuestions.tsx's MAX_SOURCED_ANSWER_LENGTH. */
const MAX_SOURCED_ANSWER_LENGTH = 800;

/** A follow-up question the person answered, kept with their case. */
export type SourcedAnswer = { question: string; answer: string };

/** Most kept per case; the newest win. */
export const MAX_KEPT_ANSWERS = 20;

/**
 * The follow-up answers saved on a case (intakeData.extra.sourcedAnswers),
 * or none. Reads only well-formed entries.
 */
export function readSourcedAnswers(value: unknown): SourcedAnswer[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is SourcedAnswer =>
        Boolean(item) &&
        typeof (item as SourcedAnswer).question === "string" &&
        typeof (item as SourcedAnswer).answer === "string" &&
        (item as SourcedAnswer).answer.trim().length > 0,
    )
    .map((item) => ({ question: item.question.slice(0, 500), answer: item.answer.slice(0, MAX_SOURCED_ANSWER_LENGTH) }))
    .slice(-MAX_KEPT_ANSWERS);
}

/** The answers as text to add to the story; empty when there are none. */
export function sourcedAnswerListText(list: readonly SourcedAnswer[]): string {
  const lines = list.filter((item) => item.answer.trim()).map((item) => `Q: ${item.question}\nA: ${item.answer.trim()}`);
  return lines.length > 0 ? `Answers to follow-up questions about the law that applies:\n${lines.join("\n")}` : "";
}

/** The story with every answer (earlier visits and this one) added. */
export function withSourcedAnswerList(story: string, list: readonly SourcedAnswer[]): string {
  const extra = sourcedAnswerListText(list);
  return extra ? `${story.trim()}\n\n${extra}` : story;
}

