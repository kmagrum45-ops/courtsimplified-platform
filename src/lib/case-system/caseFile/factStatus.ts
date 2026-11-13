/**
 * THE ONE FUNCTION THAT SAYS WHETHER A FACT IS KNOWN (site owner, 11 Nov 2026: "one function decides whether a fact is
 * known; every screen gets its questions and its still-needed labels from it, never from a list of its own").
 *
 * A fact in the case file is one of four:
 *   known    the person's own answer: typed, chosen, or a story value they said Yes to. Never asked again, never shown
 *            as needing confirmation.
 *   offer    stated in the story and not decided yet (a story slot not confirmed, or the story reader's value): shown
 *            ONCE with three choices, Yes / No, that's not right / I'm not sure.
 *   ask      not known: never given, or the person said the story's value was not right ("No"). Asked once; that ask
 *            is the fact's single ask.
 *   settled  "I'm not sure", a skip, "I don't know", or removed by the person: never asked again, shown as "add it
 *            when you know".
 * `stated`: the story reader's values (intakeReview.ts statedInStory), for facts the case file holds nothing for.
 *
 * Pure, no React, no network. Imports no value from caseFile.ts (which uses this): only its types.
 */
import { factsOfQuestion } from "./factsOfQuestion";
import type { CaseFile, Slot, SlotFact } from "./caseFile";

export type FactStatus = "known" | "offer" | "ask" | "settled";
/** The story reader's values, by fact (statedInStory). */
export type Stated = Partial<Record<SlotFact, string>>;

/** The status of one slot, with the story reader's value for it when there is one. */
export function slotStatus(slot: Slot | undefined, statedValue?: string): FactStatus {
  if (!slot) return statedValue ? "offer" : "ask";
  if (slot.removed) return "settled";
  if (slot.confirmed && slot.state === "answered") return "known";
  if (slot.confirmed && slot.state === "unsure") return "settled";
  if (slot.declined) return "ask";
  if (slot.state === "answered" && slot.source?.kind === "story") return "offer";
  return statedValue ? "offer" : "ask";
}

/** THE ONE FUNCTION: whether this fact is known, to be offered, to be asked, or settled. No file: nothing is known. */
export function factStatus(file: CaseFile | null | undefined, fact: SlotFact, stated?: Stated): FactStatus {
  return slotStatus(file?.[fact], stated?.[fact]);
}

/** The case-file facts a question asks for (none: the screen's own question, never decided here). */
export function factsOfAQuestion(file: CaseFile | null | undefined, questionId: string, surface?: string): SlotFact[] {
  return factsOfQuestion(questionId, surface).filter((fact): fact is SlotFact => !file || fact in file) as SlotFact[];
}

/**
 * A question's status: known or settled when ANY of its facts is (it is not asked again); else offer when one of its
 * facts is stated; else ask. A question that asks for no fact is the screen's own: "ask".
 */
export function questionStatus(file: CaseFile | null | undefined, questionId: string, stated?: Stated, surface?: string): FactStatus {
  if (!file) return "ask";
  const statuses = factsOfAQuestion(file, questionId, surface).map((fact) => factStatus(file, fact, stated));
  for (const held of ["known", "settled", "offer"] as const) if (statuses.includes(held)) return held;
  return "ask";
}

/** Whether a screen may show this question (to ask it, or to offer the story's value for it). */
export function mayShowQuestion(file: CaseFile | null | undefined, questionId: string, stated?: Stated, surface?: string): boolean {
  const status = questionStatus(file, questionId, stated, surface);
  return status === "ask" || status === "offer";
}

/** Every fact of a list that is not known, with its status; a settled one is shown as "add it when you know". */
export function stillNeeded(file: CaseFile | null | undefined, facts: readonly SlotFact[], stated?: Stated): { fact: SlotFact; status: Exclude<FactStatus, "known">; addWhenYouKnow: boolean }[] {
  return facts.flatMap((fact) => {
    const status = factStatus(file, fact, stated);
    return status === "known" ? [] : [{ fact, status, addWhenYouKnow: status === "settled" }];
  });
}

/**
 * THE GATE FOR EVERY CHAT (never ask twice, row 1, 29 Oct), now the one function: a chat asks a question, or
 * offers the story's value for it, only while mayShowQuestion lets it. A fact the file holds, answered or "not
 * sure", is not asked by a chat, nor offered as the story's suggestion. No file: nothing held.
 * caseFile.ts re-exports it, so every chat that used the gate gets this answer.
 */
export function chatMayAsk(file: CaseFile | null | undefined, questionId: string): boolean {
  return mayShowQuestion(file, questionId);
}
