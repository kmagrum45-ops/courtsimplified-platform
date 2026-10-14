/**
 * One question at a time in the guided Small Claims chat (walkthrough
 * 2026-10-13, V3). The claim-type suggestion ("is that right?") arrives in the
 * same turn as the next question, and both were on screen at once. While the
 * suggestion waits, the question it came with is held back.
 *
 * Pure, so verifyIntakeSequencing can run it.
 */

export type TranscriptMessage = {
  from: "user" | "assistant";
  text: string;
  isQuestion?: boolean;
};

/**
 * Where the question still waiting for an answer starts in the transcript
 * (with the one-time intro, when it came with it), or the transcript's length
 * when nothing is waiting. A question the person already replied to is never
 * held back, and nothing before the waiting question is ever hidden.
 */
export function unansweredQuestionStart(messages: readonly TranscriptMessage[], introText: string): number {
  const last = messages.length - 1;
  if (last < 0 || messages[last].from !== "assistant" || !messages[last].isQuestion) return messages.length;
  const before = messages[last - 1];
  return before && before.from === "assistant" && before.text === introText ? last - 1 : last;
}
