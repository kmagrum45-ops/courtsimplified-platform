/**
 * THE HOME PAGE'S STORY-READING REQUEST, BUILT IN ONE PLACE (hotfix, 21 Nov 2026).
 *
 * "Update with my answers" failed on every click (Chrome check of ad67c3f7, S6: "Your update did not finish", three
 * times): the card sent each answer with its question's id, and /api/case/understand turned down any answer with a key
 * other than question and answer. The page built the body inline, and every browser test answered that route with a
 * stand-in that never ran the route's check, so nothing compared the two.
 *
 * The card (CaseUnderstandingCard.tsx) builds its answers here and the page (HomeLocationGate.tsx) builds the request
 * body here, so test:understand-request checks exactly what the page sends against the route's own check
 * (understandInput.ts isUnderstandingBody), for every court, side and home question.
 */
import { filedFromSituation, sideOf, situationAnswers, type Situation } from "../situation/situation";
import type { UnderstandingAnswer } from "./understandInput";

type Court = "small-claims" | "civil" | "family";

/**
 * The card's answers, one per question with a reply, kept by the question's id (replies are kept by id, 19 Nov 2026).
 * `draft`: the box's text as typed (the draft the page holds while the person types); otherwise trimmed, as sent.
 */
export function cardAnswers(questions: readonly { id?: string; question: string }[], replies: Readonly<Record<string, string>>, options: { draft?: boolean } = {}): UnderstandingAnswer[] {
  return questions
    .map((item) => {
      const typed = item.id ? replies[item.id] ?? "" : "";
      return { ...(item.id ? { id: item.id } : {}), question: item.question, answer: options.draft ? typed : typed.trim() };
    })
    .filter((item) => item.answer.trim());
}

/** The body the page posts to /api/case/understand. */
export function understandRequestBody(input: { story: string; city: string; chosenCourt: Court; answers: readonly UnderstandingAnswer[]; situation: Situation }) {
  const { story, city, chosenCourt, answers, situation } = input;
  const side = sideOf(situation);
  const servedOn = situationAnswers(chosenCourt, situation).servedOn;
  const filed = filedFromSituation(situation);
  return {
    story,
    city,
    chosenCourt,
    ...(answers.length ? { answers: [...answers] } : {}),
    // The person's situation answers (step 2): their side and the day served, never read from the story instead.
    ...(side ? { situation: { side: side === "responding" ? "responding" as const : "starting" as const, ...(servedOn ? { servedOn } : {}), ...(filed !== undefined ? { filed } : {}), ...(situation.stage ? { stageGiven: true as const } : {}) } } : {}),
  };
}
