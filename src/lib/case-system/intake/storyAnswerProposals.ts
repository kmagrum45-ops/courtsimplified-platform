/**
 * Story answer proposals -- the confirmation half of docs/AI_INTAKE_DESIGN.md
 * phase 2 ("free text -> structured facts, shown back to the user for
 * confirmation"), which was designed and never built.
 *
 * WHY THIS EXISTS (live run, 2026-09-28). A user wrote a complete story --
 * who, when, how much was paid, what went wrong, that they texted for weeks
 * with no answer -- and the intake then asked them, one at a time, for the
 * date, their role, the kind of dispute, the amount, whether they gave notice,
 * and what evidence they had. Every one was already in the story. Nothing in
 * the pipeline could skip a question the story had answered.
 *
 * WHY THE EARLIER ATTEMPT FAILED, AND WHAT IS DIFFERENT. Story-based
 * suppression of depth questions was removed after it wrongly marked things
 * as provided five times out of five (selectDepthQuestions.ts). It decided
 * SILENTLY. This module never decides anything:
 *
 *   1. The model proposes an answer only where the story states it, and must
 *      return the exact words from the story it relied on.
 *   2. CODE checks that those words are really in the story. A proposal whose
 *      quote is not found is dropped -- the model cannot invent support.
 *   3. The user sees every proposal, can edit or remove it, and confirms.
 *      Only a confirmed proposal marks a question answered. Anything the user
 *      removes is simply asked as normal.
 *
 * Same boundary as the rest of this directory: the model reports what the
 * story says. It never characterises the facts legally, never says a test is
 * met, never assesses strength. The questions it answers are the reviewed
 * question bank's own fact-collection questions; the sensitive-phase safety
 * question is never proposed and is always asked.
 */

import { createOpenAIClient } from "../openaiClient";
import { modelParams } from "../aiModels";
import { withAiCallContext } from "../../audit/aiCallLog";
import type { IntakeQuestion } from "./questionBank";

/** Upper bound on one proposed answer, matching the captured-answer cap. */
const MAX_PROPOSED_ANSWER_LENGTH = 400;

export type StoryAnswerProposal = {
  questionId: string;
  /** The question text as the user would have seen it. */
  questionText: string;
  /** The proposed answer, in plain words, for the user to confirm or edit. */
  answer: string;
  /** The words from the user's own story the proposal relies on. Verified present. */
  storyQuote: string;
  /** The reviewed choices, for a choice question, so the user can pick another. */
  choices?: string[];
};

export type ConfirmedStoryAnswer = {
  questionId: string;
  answerText: string;
};

/** Questions a proposal may be offered for: never the sensitive phase. */
export function proposableQuestions(questions: readonly IntakeQuestion[]): IntakeQuestion[] {
  return questions.filter((question) => question.phase !== "sensitive" && !question.sensitive);
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Questions whose answer the quote must actually be ABOUT. 2026-09-28: the
 * story review battery found "Has a Plaintiff's Claim been filed? -> No"
 * proposed from "they've stopped responding to my emails" and from "I want
 * the rest back" -- real words from the story, saying nothing about filing.
 * The quote check alone cannot see that. A proposal for one of these whose
 * quote never touches the subject is dropped, and the question is asked.
 */
const QUOTE_MUST_MENTION: Record<string, RegExp> = {
  "sc-claim-filed": /\b(fil(e|ed|ing)|court|claim|su(e|ed|ing))\b/i,
};

/**
 * The code-side check. Pure, so it runs offline in the suite.
 *
 * Drops a proposal when:
 *   - its question is not one we offered;
 *   - its quote is empty or not found in the story (whitespace- and
 *     case-insensitive);
 *   - a choice question's answer is not one of the reviewed choices;
 *   - a yes-no answer is not yes or no;
 *   - the quote is not about the question's subject (QUOTE_MUST_MENTION);
 *   - the answer is empty or says the story does not say.
 * Keeps at most one proposal per question (the first).
 */
export function validateStoryProposals(
  raw: unknown,
  story: string,
  offered: readonly IntakeQuestion[],
): StoryAnswerProposal[] {
  if (!raw || typeof raw !== "object") return [];
  const list = (raw as { proposals?: unknown }).proposals;
  if (!Array.isArray(list)) return [];

  const byId = new Map(offered.map((question) => [question.id, question]));
  const normalizedStory = normalize(story);
  const seen = new Set<string>();
  const kept: StoryAnswerProposal[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const { questionId, answer, storyQuote } = item as Record<string, unknown>;
    if (typeof questionId !== "string" || typeof answer !== "string" || typeof storyQuote !== "string") continue;

    const question = byId.get(questionId);
    if (!question || seen.has(questionId)) continue;

    const trimmedAnswer = answer.trim().slice(0, MAX_PROPOSED_ANSWER_LENGTH);
    if (!trimmedAnswer || /not (stated|mentioned|said)|unknown|unclear/i.test(trimmedAnswer)) continue;

    const quote = normalize(storyQuote);
    if (quote.length < 3 || !normalizedStory.includes(quote)) continue;
    const mustMention = QUOTE_MUST_MENTION[questionId];
    if (mustMention && !mustMention.test(storyQuote)) continue;

    if (question.answerType === "choice") {
      const choice = (question.choices || []).find((option) => normalize(option) === normalize(trimmedAnswer));
      if (!choice) continue;
      kept.push({
        questionId,
        questionText: question.text,
        answer: choice,
        storyQuote: storyQuote.trim(),
        choices: [...(question.choices || [])],
      });
      seen.add(questionId);
      continue;
    }

    if (question.answerType === "yes-no" && !/^(yes|no)\b/i.test(trimmedAnswer)) continue;

    kept.push({ questionId, questionText: question.text, answer: trimmedAnswer, storyQuote: storyQuote.trim() });
    seen.add(questionId);
  }

  return kept;
}

const SYSTEM_PROMPT = `You read a person's own account of a dispute and a list of intake questions. For each question that the account ALREADY answers, you propose the answer so the person does not have to type it again. The person will see every proposal and confirm or correct it.

Rules:
- Only propose an answer when the account clearly states it. If the account does not say, leave that question out. Leaving a question out is always safe; a wrong proposal is not.
- Report facts only. Never characterise them legally, never say whether anything is enough, never judge who is right.
- Write the answer in plain words, as the person would, using their facts. Keep it short.
- For a question with choices, the answer must be exactly one of the listed choices, copied exactly.
- For a yes/no question, begin the answer with "Yes" or "No".
- Which side the person is on is stated by what they want: someone who says they want their money or property back from another person, or want to take them to court, and says nothing about being sued, is bringing the claim. Someone who says they have been sued or served with a claim is responding to it.
- When the account says something happened ONLY one way ("the only evidence is texts to my brother", "I only told my neighbour"), you may answer "No" to a question about another way (a newspaper, a broadcast, other people), quoting the words that say "only". Without words like that, leave the question out.
- "storyQuote" must be words copied exactly, character for character, from the account, that show where the answer comes from. Copy a short phrase, not a whole paragraph.

Return a JSON object: {"proposals": [{"questionId": "...", "answer": "...", "storyQuote": "..."}]}. Return {"proposals": []} if nothing is answered.`;

function describeQuestions(questions: readonly IntakeQuestion[]): string {
  return questions
    .map((question) => {
      const kind =
        question.answerType === "choice"
          ? `choices: ${(question.choices || []).map((choice) => JSON.stringify(choice)).join(", ")}`
          : question.answerType;
      return `- id: ${question.id}\n  question: ${question.text}\n  answer type: ${kind}`;
    })
    .join("\n");
}

export async function proposeAnswersFromStory(
  story: string,
  questions: readonly IntakeQuestion[],
  apiKey: string,
): Promise<StoryAnswerProposal[]> {
  const offered = proposableQuestions(questions);
  if (!story.trim() || offered.length === 0) return [];
  return withAiCallContext({ callType: "propose-story-answers" }, () =>
    proposeAnswersFromStoryInner(story, offered, apiKey),
  );
}

async function proposeAnswersFromStoryInner(
  story: string,
  offered: readonly IntakeQuestion[],
  apiKey: string,
): Promise<StoryAnswerProposal[]> {
  const client = createOpenAIClient(apiKey);
  const response = await client.chat.completions.create({
    ...modelParams("standard", { temperature: 0 }),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Questions:\n${describeQuestions(offered)}\n\nThe person's account:\n"""\n${story}\n"""`,
      },
    ],
  });

  let parsed: unknown = {};
  try {
    parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
  } catch {
    parsed = {};
  }
  return validateStoryProposals(parsed, story, offered);
}

/**
 * Renders confirmed answers as one text block for the existing fact
 * extractor, so structured facts (role, dispute category, filing status) come
 * out of the user's confirmed words by the same path as any other answer.
 */
export function confirmedAnswersAsText(
  confirmed: readonly ConfirmedStoryAnswer[],
  questions: readonly IntakeQuestion[],
): string {
  return confirmed
    .map((item) => {
      const question = questions.find((candidate) => candidate.id === item.questionId);
      return question ? `Q: ${question.text}\nA: ${item.answerText}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

/**
 * The same proposal step for the DEPTH questions (claim-type-specific
 * questions asked once a claim type is confirmed).
 *
 * WHY (site owner, 2026-10-04): a defamation user wrote that their only
 * evidence was text messages to their brother, and the depth phase still
 * asked whether it was published in a newspaper or broadcast. The depth phase
 * asks every authored question (selectDepthQuestions.ts) because keyword
 * suppression was measured wrong five times in five. This is NOT that: the
 * model must quote the user's own words, code verifies the quote is really in
 * what they wrote, and the user confirms each proposal before anything is
 * recorded. An unconfirmed or dropped proposal is simply asked as normal.
 */
export async function proposeDepthAnswersFromStory(
  story: string,
  questions: readonly { id: string; text: string; examples?: string[] }[],
  apiKey: string,
): Promise<StoryAnswerProposal[]> {
  return proposeAnswersFromStory(story, questions.map(depthAsIntakeQuestion), apiKey);
}

/** A depth question in the shape the proposal step reads. Exported for the suite. */
export function depthAsIntakeQuestion(question: { id: string; text: string; examples?: string[] }): IntakeQuestion {
  return {
    id: question.id,
    courtArea: "small-claims",
    text: question.text,
    answerType: "short-text",
    examples: question.examples,
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: null,
    status: "reviewed",
  };
}
