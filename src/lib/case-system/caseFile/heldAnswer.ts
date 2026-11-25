/**
 * WHETHER A BOX OR QUESTION IS HELD (part of the one asker, caseFile/missingFacts.ts; site owner, 23 Nov 2026). Moved here
 * from intake/asker.ts, whose second copies are deleted (23 Nov 2026). Its own module so the
 * review (intakeReview.ts), which missingFacts reads the story through, can use it without an import loop.
 *
 * Pure: no React, no network. States no law.
 */
import { askedAndReplied, slotsOfQuestion, type CaseFile, type ChatTurn, type Slot, type SlotFact } from "./caseFile";
import { slotStatus } from "../caseFile/factStatus";
import { chatMayAsk } from "./factStatus";
import { chatQuestionOf } from "./factsOfQuestion";
import { mayAskWords } from "./factStatus";
import { stageAnswersFilingQuestions, type RecordedFilingFacts } from "../intelligence/answeredQuestions";

/**
 * May a slot still be asked or offered: not known (no answer of the person's), not settled ("not sure", a skip, removed).
 * A story value not yet decided is an offer, so it may be shown. Moved here from caseFile.ts notAsked (23 Nov 2026).
 */
const stillOpen = (slot: Slot | undefined): boolean => { const status = slotStatus(slot); return status === "ask" || status === "offer"; };

/** Whether a question asks for something the record already holds (an answer, or "not sure"). Moved here from caseFile.ts. */
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
 * caseFile.ts (23 Nov 2026).
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

// ---- Questions known only by their words (the AI's, the fixed procedural ones): moved here from
// intelligence/answeredQuestions.ts (23 Nov 2026) ----------------------------------------------------------------------

/**
 * Questions the recorded facts already answer. Each entry pairs the question
 * wording produced somewhere in the system with the fact that settles it.
 */
const ANSWERED_WHEN: Array<{
  pattern: RegExp;
  answered: (facts: RecordedFilingFacts) => boolean;
}> = [
  {
    // A default judgment is only available because no Defence was filed, so
    // either a Defence on record or a default judgment settles this.
    pattern: /has the (defendant|respondent) filed a defence\??/i,
    answered: (facts) => facts.defenceOnRecord || facts.defaultJudgmentOnRecord,
  },
  {
    pattern: /has anything already been filed\??/i,
    answered: (facts) => facts.anythingFiled,
  },
  {
    pattern: /has anything already been served\??/i,
    answered: (facts) => facts.anythingServed,
  },
];

const STAGE_ANSWERS = /^(Has anything already been (filed|served)\?|Are there court dates, limitation dates, or urgent deadlines\?)$/;

const ASKS_MUNICIPALITY = /\bmunicipalit(?:y|ies)\b|\bwhich (?:city|town)\b|\bwhere (?:does|do) (?:each (?:parent|of you)|you|the other (?:person|parent)|both (?:of you|parents)) (?:now )?live\b/i;

/** What a caller knows beside the record: the papers on record, the stage, the city it holds, the side, the story read. */
export type WordsContext = { filing?: RecordedFilingFacts; caseStage?: string | null; stepWords?: string | null; municipality?: string | null; responding?: boolean; court?: string | null; wordsOnly?: { storySays: Partial<Record<string, unknown>> } };

/**
 * THE QUESTIONS KNOWN ONLY BY THEIR WORDS STILL TO SHOW, in order (the one asker): never one the papers on record answer
 * ("Has the defendant filed a Defence?" with a Defence or a default judgment on record), never a general filing or
 * court-date question once the stage is known, never the city once the record holds it (only the rest of a question that
 * asks it with something else is kept), and never one whose fact the record holds (factStatus.ts mayAskWords). Was
 * the four filters of intelligence/answeredQuestions.ts, deleted (23 Nov 2026).
 */
export function missingWords(record: CaseFile | null | undefined, questions: readonly string[], context: WordsContext = {}): string[] {
  const filing = context.filing;
  const answeredByFiling = (question: string) => Boolean(filing) && ANSWERED_WHEN.some((rule) => rule.pattern.test(question.trim()) && rule.answered(filing!));
  const stageKnown = stageAnswersFilingQuestions(context.caseStage, context.stepWords);
  const city = context.municipality?.trim();
  return questions
    .filter((question) => question.trim() && !answeredByFiling(question))
    .flatMap((question) => {
      if (!city || !ASKS_MUNICIPALITY.test(question)) return [question];
      const parts = question.split(/,\s*and\s+|;\s*and\s+/i);
      const rest = parts.slice(1).filter((part) => !ASKS_MUNICIPALITY.test(part)).join(", and ").trim();
      if (!rest) return [];
      const sentence = rest.charAt(0).toUpperCase() + rest.slice(1);
      return [sentence.endsWith("?") ? sentence : `${sentence.replace(/[.!]+$/, "")}?`];
    })
    .filter((question) => !(stageKnown && STAGE_ANSWERS.test(question.trim())))
    .filter((question) => !record || mayAskWords(record, question, { ...(context.responding !== undefined ? { responding: context.responding } : {}), ...(context.court ? { court: context.court } : {}), ...(context.wordsOnly ? { wordsOnly: context.wordsOnly } : {}) }));
}

/**
 * THE CIVIL AND FAMILY QUESTIONS STILL TO ASK, in order (the one asker): applicable to what is answered so far, not
 * answered on the screen, not skipped, and (given the record) not held by it. Moved here from guidedFields.ts, deleted there
 * (23 Nov 2026). `answered`: the screen's rule for an answer in its own box (guidedFields.ts isAnswered).
 */
export function missingFields<F extends { key: string; initial?: boolean; when?: (values: never) => boolean }, V>(record: CaseFile | null | undefined, fields: readonly F[], values: Record<string, V>, skipped: ReadonlySet<string>, answered: (field: F, value: V) => boolean): F[] {
  return fields.filter((field) => field.initial !== false && (field.when ? field.when(values as never) : true) && !answered(field, values[field.key]) && !skipped.has(field.key) && (!record || heldAnswer(record, field.key) === null));
}
