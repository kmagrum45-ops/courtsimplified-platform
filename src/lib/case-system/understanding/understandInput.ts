/** One bounded contract for the front door and its API; never trim away facts. */
export const MAX_UNDERSTAND_TEXT = 48_000;
export type UnderstandingAnswer = { question: string; answer: string };

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
  answers?: { question: string; answer: string }[];
};

export function isUnderstandingBody(value: unknown): value is Body {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["story", "city", "chosenCourt", "answers"].includes(key))) return false;
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
            Object.keys(item).every((key) => key === "question" || key === "answer") &&
            typeof (item as { question?: unknown }).question === "string" &&
            typeof (item as { answer?: unknown }).answer === "string" &&
            (item as { question: string }).question.length <= 400 &&
            (item as { answer: string }).answer.length <= 1_000,
        )))
  );
}
