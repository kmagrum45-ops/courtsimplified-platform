/**
 * WHETHER A BOX OR QUESTION IS HELD (part of the one asker, caseFile/missingFacts.ts; site owner, 23 Nov 2026). Moved here
 * from intake/asker.ts askOf, which is deleted with its second copies (mayAsk, foundStillToOffer). Its own module so the
 * review (intakeReview.ts), which missingFacts reads the story through, can use it without an import loop.
 *
 * Pure: no React, no network. States no law.
 */
import { askedAndReplied, slotsOfQuestion, type CaseFile, type ChatTurn, type Slot, type SlotFact } from "./caseFile";
import { slotStatus } from "../caseFile/factStatus";
import { chatMayAsk } from "./factStatus";
import { chatQuestionOf } from "./factsOfQuestion";

/**
 * May a slot still be asked or offered: not known (no answer of the person's), not settled ("not sure", a skip, removed).
 * A story value not yet decided is an offer, so it may be shown. Moved here from caseFile.ts notAsked (23 Nov 2026).
 */
const stillOpen = (slot: Slot | undefined): boolean => { const status = slotStatus(slot); return status === "ask" || status === "offer"; };

/** Whether a question asks for something the record already holds (an answer, or "not sure"). Was caseFile.ts alreadyAsked. */
export function isHeld(record: CaseFile, questionId: string, surface?: string): boolean {
  return slotsOfQuestion(questionId, surface).some((fact) => !stillOpen(record[fact]));
}

/**
 * Of a screen's questions, in its order, those whose facts the record does not hold yet (the first is the next to ask). A
 * fact held answered OR unsure is never asked again, on any screen (site owner, 31 Oct). A question that asks for no slot
 * is the screen's own. Was caseFile.ts nextQuestion (the first) and askable (all), deleted with them (23 Nov 2026).
 */
export function missingQuestions(record: CaseFile, candidates: readonly string[], surface?: string): string[] {
  return candidates.filter((id) => {
    const facts = slotsOfQuestion(id, surface);
    return !facts.length || facts.every((fact) => stillOpen(record[fact]));
  });
}

/**
 * What a chat may ask for one of its question sentences: the sentence, while its fact may be asked; its open part (what the
 * record does not hold) when the fact is held; null when nothing is left (factsOfQuestion.ts CHAT_QUESTIONS). Was
 * caseFile.ts chatQuestionToAsk (23 Nov 2026).
 */
export function chatQuestionFor(record: CaseFile | null | undefined, words: string, conversation: readonly ChatTurn[] = []): string | null {
  const question = chatQuestionOf(words);
  if (chatMayAsk(record, question.asks) && !askedAndReplied(conversation, words)) return words;
  return question.open && !askedAndReplied(conversation, question.open) ? question.open : null;
}

export type Held = { held: "answered" | "unsure" | "removed"; fact: SlotFact; slot: Slot };

/** Form boxes whose key names no fact of its own: the fact they ask for (the timeline box asks when it happened). */
const FORM_FIELD_FACTS: Record<string, readonly SlotFact[]> = { timeline: ["whenHappened"] };

/** The case-file facts a question or box asks for. None: it is the screen's own, never hidden by the case file. */
export function askedFacts(questionId: string, surface?: string): SlotFact[] {
  return [...(FORM_FIELD_FACTS[questionId] ?? slotsOfQuestion(questionId, surface))];
}

/**
 * Held by the person, from the one function (factStatus.ts): known is their answer, settled is "not sure" or removed.
 * A story value not decided yet (an offer) and a story value said "not right" are not held.
 */
const heldState = (slot: Slot | undefined): Held["held"] | null => {
  const status = slotStatus(slot);
  if (status === "known") return "answered";
  if (status !== "settled") return null;
  return slot?.removed ? "removed" : "unsure";
};

/**
 * Whether a question or box is held: by the strongest state among its facts (an answer, then "not sure", then removed).
 * Null: none of its facts is held, so it may be asked. No record: nothing is held.
 */
export function heldAnswer(record: CaseFile | null | undefined, questionId: string, surface?: string): Held | null {
  if (!record) return null;
  const states = askedFacts(questionId, surface).map((fact) => ({ fact, slot: record[fact], held: heldState(record[fact]) })).filter((item) => item.held);
  for (const want of ["answered", "unsure", "removed"] as const) {
    const found = states.find((item) => item.held === want);
    if (found) return { held: want, fact: found.fact, slot: found.slot };
  }
  return null;
}
