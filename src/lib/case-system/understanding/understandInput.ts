import { isRealIsoDate } from "../dates";
import { HOME_QUESTIONS } from "../caseFile/factQuestions";
/** One bounded contract for the front door and its API; never trim away facts. */
export const MAX_UNDERSTAND_TEXT = 48_000;
/**
 * One answer to a home question. `id` is the site's own question id (caseFile/factQuestions.ts): the card keeps answers by
 * it (19 Nov 2026). Answers saved before then carry only the question and the answer.
 */
export type UnderstandingAnswer = { id?: string; question: string; answer: string };

/**
 * The site's own home questions, by id, with each one's fixed words. An answer may carry an id only when it is one of
 * these and its question is that id's own words (hotfix, 21 Nov 2026: the card sent ids and this check turned every
 * answer down, so "Update with my answers" never finished; test:understand-request).
 */
const HOME_QUESTION_WORDS: ReadonlyMap<string, ReadonlySet<string>> = (() => {
  const words = new Map<string, Set<string>>();
  for (const sides of Object.values(HOME_QUESTIONS)) for (const list of Object.values(sides)) for (const item of list) words.set(item.id, (words.get(item.id) ?? new Set()).add(item.question));
  return words;
})();
const idFitsQuestion = (id: unknown, question: unknown) => id === undefined || (typeof id === "string" && typeof question === "string" && Boolean(HOME_QUESTION_WORDS.get(id)?.has(question)));

export function understandingInputError(story: string, city: string, answers: readonly UnderstandingAnswer[]): string | null {
  if (story.trim().length < 10) return "Please describe your situation in at least 10 characters.";
  if (story.length > 6_000 || city.length > 120 || answers.length > 200 ||
      answers.some((item) => item.question.length > 400 || item.answer.length > 1_000) ||
      story.length + city.length + answers.reduce((n, item) => n + item.question.length + item.answer.length + 10, 0) > MAX_UNDERSTAND_TEXT) {
    return "This request is too long to process together. Your text is still here. Each answer can contain up to 1,000 characters, with up to 48,000 characters in total.";
  }
  return null;
}

const MAX_STORY = 6_000;
const COURTS = new Set(["small-claims", "civil", "family"]);

type Body = {
  story: string;
  city?: string;
  chosenCourt?: "small-claims" | "civil" | "family";
  answers?: UnderstandingAnswer[];
  /** The person's own situation answers (situation.ts): their side, and the day they were served. */
  situation?: { side?: "starting" | "responding"; servedOn?: string; filed?: boolean; stageGiven?: true };
};

export function isUnderstandingBody(value: unknown): value is Body {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["story", "city", "chosenCourt", "answers", "situation"].includes(key))) return false;
  const situation = body.situation as Record<string, unknown> | undefined;
  if (situation !== undefined && (typeof situation !== "object" || situation === null || Object.keys(situation).some((key) => key !== "side" && key !== "servedOn" && key !== "filed" && key !== "stageGiven") ||
    (situation.filed !== undefined && typeof situation.filed !== "boolean") ||
    (situation.stageGiven !== undefined && situation.stageGiven !== true) ||
    (situation.side !== undefined && situation.side !== "starting" && situation.side !== "responding") ||
    (situation.servedOn !== undefined && !(typeof situation.servedOn === "string" && isRealIsoDate(situation.servedOn))))) return false;
  return (
    typeof body.story === "string" &&
    body.story.trim().length >= 10 &&
    body.story.length <= MAX_STORY &&
    (body.city === undefined || (typeof body.city === "string" && body.city.length <= 120)) &&
    (body.chosenCourt === undefined || (typeof body.chosenCourt === "string" && COURTS.has(body.chosenCourt))) &&
    (body.answers === undefined ||
      (Array.isArray(body.answers) &&
        body.answers.length <= 200 &&
        body.answers.every(
          (item) =>
            item &&
            typeof item === "object" &&
            Object.keys(item).every((key) => key === "question" || key === "answer" || key === "id") &&
            idFitsQuestion((item as { id?: unknown }).id, (item as { question?: unknown }).question) &&
            typeof (item as { question?: unknown }).question === "string" &&
            typeof (item as { answer?: unknown }).answer === "string" &&
            (item as { question: string }).question.length <= 400 &&
            (item as { answer: string }).answer.length <= 1_000,
        )))
  );
}
