/**
 * THE CASE FILE: ONE SLOT PER FACT, AND THE ONE RULE FOR ASKING (Jason, 2026-10-24).
 *
 * The site must always know that it has already asked a question and what the answer
 * was, and never ask the same thing twice -- in the situation questions, the questions
 * one at a time, the Small Claims guided questions, the review, the Family triage, the
 * results page, the step page or the case page -- the same way in Small Claims, civil
 * and Family.
 *
 * Each slot holds:
 *   state      "not-asked", "answered" or "unsure" ("I don't know yet", "not sure", a
 *              skip): unsure is an answer too, and counts as asked;
 *   value      what the person gave (an amount as a number);
 *   source     their own answer (which question) or a story quote;
 *   confirmed  true for their own answer; a story suggestion is never a slot's value
 *              until they confirm it (then it is their answer).
 *
 * The slots are read from every place an answer is kept today (the situation answers,
 * each area's form, the guided answers, the review's answers and its "I don't know
 * yet", the questions skipped one at a time, the Family triage, the saved position),
 * through `freshSections`, so an answer given for an earlier version of the story is not
 * read (the story-version rule): a story edit reopens only story-derived answers, never
 * the situation answers.
 *
 * `nextQuestion` is the one gate: a screen offers its questions in order and gets back
 * the first whose facts are all not asked, or null. At the end (`atEnd`), each unsure
 * fact is offered once more.
 *
 * Pure: no React, no network. States no law.
 */
import type { Checkpoint } from "../intakeCheckpoint";
import { freshSections } from "../storyBasis";
import { situationOf, sideOf, firstPageOf, stepFromSituation } from "../situation/situation";
import { isKindOfClaim } from "../intake/claimKind";
import { factsOfQuestion } from "./factsOfQuestion";
import { parseRecordedAmount } from "../format/recordedAmount";
import { firstWordedDate, isRealIsoDate } from "../dates";
import { QUESTION_BANK } from "../intake/questionBank";

/** The case file's slots, in the order "What we have so far" shows them. */
export const SLOT_FACTS = [
  "side", "court", "stage", "filed", "papers", "servedDate", "amount", "otherParty", "children",
  "married", "marriedWhere", "claimKind", "wants", "whenHappened", "conferenceDate", "defenceFiled",
  "outcome", "urgent", "courtDate",
] as const;
export type SlotFact = (typeof SLOT_FACTS)[number];
export type SlotState = "not-asked" | "answered" | "unsure";
export type SlotSource = { kind: "answer"; question: string } | { kind: "story"; quote: string };
export type Slot = { state: SlotState; value?: string | number | boolean | string[]; source?: SlotSource; confirmed: boolean };
/** `answers`: every answer given to a named question (its id and words), for the step page's dates. */
export type CaseFile = Record<SlotFact, Slot> & { answers?: Record<string, string> };

/** Where the case file keeps what it adds: the facts answered "not sure", and those offered again at the end. */
export const CASE_FILE_SECTION = "caseFile";

const isSlot = (fact: string): fact is SlotFact => (SLOT_FACTS as readonly string[]).includes(fact);
const object = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

/** An answer that gives nothing but "I don't know": kept as unsure, never as a value. */
export function isUnsureAnswer(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^\s*(?:i\s*(?:do\s*not|don'?t|dont)\s*know(?:\s*yet)?|not\s*sure(?:\s*yet)?|unsure|no\s*idea|i'?m\s*not\s*sure|idk|not-sure|unknown|skip(?:ped)?)\s*[.!]?\s*$/i.test(value);
}

const blank = (value: unknown) =>
  value === undefined || value === null || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && value.length === 0);

export function emptyCaseFile(): CaseFile {
  return Object.fromEntries(SLOT_FACTS.map((fact) => [fact, { state: "not-asked", confirmed: false }])) as unknown as CaseFile;
}

/** The slots that hold a day. */
const DATED = new Set<SlotFact>(["whenHappened", "servedDate", "conferenceDate", "courtDate"]);

/** The one full day an answer's words give, or null (a day with no year is not one). */
function readFullDay(text: string): string | null {
  const worded = firstWordedDate(text);
  return worded && isRealIsoDate(worded.iso) ? worded.iso : null;
}

/** "We were married in Lisbon, Portugal in 2009": the place named, with the words it came from, or null. */
export function marriedWhereIn(story: string): { place: string; quote: string } | null {
  const match = /\b(?:[Ww]e|I)\s+(?:were|was|got)\s+married\s+in\s+((?:[A-Z][\w'.-]*)(?:[ ,]+(?:[A-Z][\w'.-]*))*)/.exec(story);
  if (!match) return null;
  const place = match[1].replace(/[ ,]+$/, "").trim();
  return place ? { place, quote: match[0] } : null;
}

/** Records one answer into the file: the first answer stands; an unsure one never covers a real one. */
function give(file: CaseFile, fact: string, value: unknown, question: string) {
  if (!isSlot(fact) || blank(value)) return;
  const slot = file[fact];
  if (isUnsureAnswer(value)) {
    if (slot.state === "not-asked") file[fact] = { state: "unsure", source: { kind: "answer", question }, confirmed: true };
    return;
  }
  if (slot.state === "answered") return;
  // A rough time ("last summer", "June 2026") is kept as given, but is not the day itself:
  // the fact stays unsure, so the exact day is offered once more at the end (item 12).
  if (DATED.has(fact) && typeof value === "string" && !isRealIsoDate(value) && !readFullDay(value)) {
    if (slot.state === "not-asked") file[fact] = { state: "unsure", value, source: { kind: "answer", question }, confirmed: true };
    return;
  }
  const kept = fact === "amount" ? (typeof value === "number" ? value : parseRecordedAmount(String(value)) ?? String(value)) : (value as Slot["value"]);
  file[fact] = { state: "answered", value: kept, source: { kind: "answer", question }, confirmed: true };
}

/** Marks a fact unsure ("not sure", a skip), unless it was answered. */
function unsure(file: CaseFile, fact: string, question: string) {
  if (isSlot(fact) && file[fact].state === "not-asked") file[fact] = { state: "unsure", source: { kind: "answer", question }, confirmed: true };
}

/** Every slot an answer to this question gives (its facts that are slots). */
const slotsOf = (questionId: string, surface?: string): SlotFact[] => factsOfQuestion(questionId, surface).filter(isSlot);

/**
 * The case file for an intake checkpoint, and (on the results and case pages) the saved
 * case's master result, which adds the saved position: the dates given on the step page,
 * the stage chosen there, and a kind of claim chosen.
 */
export function caseFileOf(checkpoint: Checkpoint | null, master?: unknown): CaseFile {
  const file = emptyCaseFile();
  const sections = checkpoint ? freshSections(checkpoint) : {};
  const court = checkpoint?.courtPath ?? (typeof object(master).courtPath === "string" ? (object(master).courtPath as string) : null);

  // 0. A step the person chose on the step page is their latest answer to "where the case is":
  // it wins over the stage given at the start (reviewer, 2026-10-24: a later correction never won).
  const position = object(object(master).position);
  if (typeof position.stepId === "string" && position.stepId) give(file, "stage", position.stepId, "step");
  // Likewise a kind of claim they chose themselves.
  if (typeof position.claimKind === "string" && (position.claimKind === "not-sure" || isKindOfClaim(position.claimKind))) give(file, "claimKind", position.claimKind, "claim-kind");

  // 1. The situation answers: the person's own, never tied to the story.
  const situation = situationOf(sections);
  const side = sideOf(situation);
  if (side) give(file, "side", side, "situation:started");
  if (situation.court) give(file, "court", situation.court, "situation:court");
  else if (court) give(file, "court", court, "situation:court");
  if (situation.where === "served") give(file, "stage", "responding", "situation:where");
  if (situation.where === "starting" && situation.filed === "nothing") give(file, "stage", "starting-case", "situation:filed");
  if (situation.where === "going" && situation.stage === "not-sure") give(file, "stage", "not-sure", "situation:stage");
  else if (situation.where === "going" && stepFromSituation(situation, situation.court ?? court)) give(file, "stage", situation.stage, "situation:stage");
  // An older record: "something filed" when starting is a case that has started (stageFromSituation agrees).
  if (situation.where === "starting" && situation.filed === "something") give(file, "stage", "already-started", "situation:filed");
  if (situation.where === "starting" && situation.filed) give(file, "filed", situation.filed === "something", "situation:filed");
  if (situation.where === "going" || situation.where === "served") give(file, "filed", true, "situation:where");
  if (situation.papers) give(file, "papers", situation.papers === "not-sure" ? "not-sure" : firstPageOf(situation.papers)?.title ?? situation.papers, "situation:papers");
  if (situation.receivedOn) give(file, "servedDate", situation.receivedOn === "unknown" ? "unknown" : situation.receivedOn, "situation:received");

  // 2. Each area's own form (civil, Family, the Small Claims form).
  const forms: [Record<string, unknown>, string][] = [
    [object(sections.civil?.input), "civil"],
    [object(sections.family), "family"],
    [object(sections["small-claims"]?.input), "small-claims"],
  ];
  for (const [values, area] of forms) {
    for (const [key, value] of Object.entries(values)) {
      if (key === "facts") continue;
      // The Small Claims form starts with "Nothing filed yet" ticked: only an answer the person changed counts.
      if (area === "small-claims" && key === "filedDocuments" && strings(value).join() === "nothing") continue;
      // A form's "not sure" is its starting value, never asked by itself: no answer (the
      // questions one at a time record a skip separately, which is a "not sure").
      if (value === "not-sure") continue;
      const list = strings(value);
      if (Array.isArray(value) && list.every((item) => item === "not-sure")) continue;
      const said = Array.isArray(value) ? list.filter((item) => item !== "not-sure") : value;
      for (const fact of slotsOf(key)) give(file, fact, said, `${area}:${key}`);
    }
  }
  // Family keeps the day served in its own field or the timeline; the children in one line.
  const family = object(sections.family);
  if (typeof family.servedDate === "string") give(file, "servedDate", family.servedDate, "family:servedDate");

  // 3. Small Claims guided answers (typed, or confirmed from the story's proposals).
  const guided = object(sections.guided);
  const answers: Record<string, string> = {};
  for (const answer of Array.isArray(guided.earlierAnswers) ? guided.earlierAnswers : []) {
    const item = object(answer);
    if (typeof item.questionId === "string" && typeof item.answerText === "string") answers[item.questionId] ??= item.answerText;
    if (typeof item.questionId === "string") for (const fact of slotsOf(item.questionId)) give(file, fact, item.answerText, item.questionId);
  }
  const guidedFacts = object(guided.facts);
  for (const id of strings(guided.answeredIds)) {
    for (const fact of slotsOf(id)) {
      if (file[fact].state !== "not-asked") continue;
      // The answer's own words where the question keeps them (its captured field); a dated
      // fact with no words kept is unsure (the exact day is offered once more at the end).
      const field = QUESTION_BANK.find((question) => question.id === id)?.capturesField;
      const captured = field ? guidedFacts[field] : id === "sc-orient-role" ? guidedFacts.role : undefined;
      if (captured === undefined && DATED.has(fact)) unsure(file, fact, id);
      else if (captured === undefined) file[fact] = { state: "answered", source: { kind: "answer", question: id }, confirmed: true };
      else give(file, fact, captured, id);
    }
  }
  const matched = object(guided.matchedClaimType);
  if (typeof matched.claimTypeId === "string" && matched.userConfirmed === true && isKindOfClaim(matched.claimTypeId)) give(file, "claimKind", matched.claimTypeId, "claim-kind-suggestion");

  // 4. The review's answers, and its "I don't know yet".
  const builder = object(sections.builder);
  for (const [id, answer] of Object.entries(object(builder.initialAnswers))) {
    if (typeof answer === "string") answers[id] ??= answer;
    for (const fact of slotsOf(id)) give(file, fact, answer, `review:${id}`);
  }
  for (const id of strings(builder.initialUnknowns)) for (const fact of slotsOf(id)) unsure(file, fact, `review:${id}`);
  // Skipped in the questions one at a time (civil, Family).
  for (const key of strings(object(sections["form-chat"]).skipped)) for (const fact of slotsOf(key)) unsure(file, fact, `chat:${key}`);

  // 5. The Family triage.
  const triage = object(object(builder.triageState).record);
  const yesNo = (value: unknown) => (value === "yes" ? true : value === "no" ? false : value === "unsure" ? "not-sure" : undefined);
  if (yesNo(triage.marriedToOtherParty) !== undefined) give(file, "married", yesNo(triage.marriedToOtherParty), "married-to-other-party");
  // Where they married, carried from the story's own sentence once the person says they were
  // married (item 12, case 14: a marriage abroad is a fact to carry, never assumed Ontario).
  if (file.married.state === "answered" && file.married.value === true && file.marriedWhere.state === "not-asked") {
    const said = marriedWhereIn(String(object(sections.story).text ?? ""));
    if (said) file.marriedWhere = { state: "answered", value: said.place, source: { kind: "story", quote: said.quote }, confirmed: false };
  }
  if (yesNo(triage.caseInvolvesChildren) !== undefined) give(file, "children", yesNo(triage.caseInvolvesChildren), "case-involves-children");
  else if (yesNo(triage.haveChildTogether) !== undefined) give(file, "children", yesNo(triage.haveChildTogether), "child-together");

  // 6. The case file's own record of "not sure" answers.
  for (const [fact, entry] of Object.entries(object(object(sections[CASE_FILE_SECTION]).unsure))) unsure(file, fact, String(object(entry).question ?? "unsure"));

  // 7. The saved case: dates given on the step page, the stage and kind of claim chosen there.
  const dates = object(position.dateAnswers);
  for (const [id, value] of Object.entries(dates)) for (const fact of slotsOf(id)) give(file, fact, value, id);
  const extra = object(object(object(master).intakeData).extra);
  if (typeof extra.confirmedClaimTypeId === "string" && extra.claimTypeUserConfirmed === true && isKindOfClaim(extra.confirmedClaimTypeId)) give(file, "claimKind", extra.confirmedClaimTypeId, "claim-kind-suggestion");
  for (const answer of Array.isArray(object(master).intakeAnswers) ? (object(master).intakeAnswers as unknown[]) : []) {
    const item = object(answer);
    if (typeof item.questionId === "string" && typeof item.answerText === "string") answers[item.questionId] ??= item.answerText;
    if (typeof item.questionId === "string") for (const fact of slotsOf(item.questionId)) give(file, fact, item.answerText, item.questionId);
  }
  file.answers = answers;
  return file;
}

/** Whether a question would ask for something the file already holds (an answer, or "not sure"). */
export function alreadyAsked(file: CaseFile, questionId: string, surface?: string): boolean {
  return slotsOf(questionId, surface).some((fact) => file[fact].state !== "not-asked");
}

/**
 * THE ONE GATE. Of a screen's questions, in its order, the first whose facts the file
 * does not hold yet; null when none. At the end (`atEnd`), the first whose fact the
 * person was unsure of and has not yet been offered again (`offered`): each unsure fact
 * is offered once more, once. A question that asks for no slot is the screen's own.
 */
export function nextQuestion(file: CaseFile, candidates: readonly string[], options: { surface?: string; atEnd?: boolean; offered?: readonly string[] } = {}): string | null {
  for (const id of candidates) {
    const facts = slotsOf(id, options.surface);
    if (!facts.length) return id;
    if (!options.atEnd && facts.every((fact) => file[fact].state === "not-asked")) return id;
    if (options.atEnd && facts.some((fact) => file[fact].state === "unsure" && !(options.offered ?? []).includes(fact))) return id;
  }
  return null;
}

/** The questions of a list the file still lets this screen ask (the gate, for screens that show several at once). */
export function askable(file: CaseFile, candidates: readonly string[], surface?: string): string[] {
  return candidates.filter((id) => nextQuestion(file, [id], { surface }) === id);
}

/** The case file section after the person answers "not sure" to a question: each of its facts kept as unsure. */
export function withUnsure(section: Record<string, unknown> | undefined, questionId: string, surface?: string): Record<string, unknown> {
  const current = object(section);
  const kept = { ...object(current.unsure) };
  for (const fact of slotsOf(questionId, surface)) kept[fact] = { question: questionId };
  return { ...current, unsure: kept };
}

/** The case file section after a fact was offered again at the end (it is not offered a third time). */
export function withOfferedAtEnd(section: Record<string, unknown> | undefined, fact: SlotFact): Record<string, unknown> {
  const current = object(section);
  return { ...current, offeredAtEnd: [...new Set([...strings(current.offeredAtEnd), fact])] };
}

export function offeredAtEnd(sections: Record<string, unknown> | undefined): SlotFact[] {
  return strings(object(object(sections)[CASE_FILE_SECTION]).offeredAtEnd).filter(isSlot);
}

/** The slots a review box or question holds (its facts that are slots). */
export function slotsOfQuestion(questionId: string, surface?: string): SlotFact[] {
  return slotsOf(questionId, surface);
}

/** A slot's value in plain words, as the person gave it: a day as the court writes it, Yes or No, a list joined. */
export function slotText(slot: Slot, formatDay: (iso: string) => string): string {
  if (slot.state === "unsure") return "Not sure yet";
  const value = slot.value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return `$${value.toLocaleString("en-CA", { maximumFractionDigits: 2 })}`;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string" && isRealIsoDate(value)) return formatDay(value);
  return typeof value === "string" ? value : "";
}

/**
 * The step page's date questions for each dated slot: a day the person already gave for
 * that moment is their answer there, never asked again (when it happened, the day they
 * were served, the conference or court date).
 */
const DATE_QUESTIONS_OF: Partial<Record<SlotFact, readonly string[]>> = {
  whenHappened: ["case-date-act-or-omission"],
  servedDate: [],
  conferenceDate: ["sc-date-settlement-conference", "case-date-case-conference-date"],
  courtDate: ["case-date-trial-date"],
};

/** Date questions that ask for the same moment under different ids (the Small Claims and the civil step maps). */
const SAME_MOMENT: readonly (readonly string[])[] = [
  ["sc-date-defence-filed", "case-date-own-defence-delivered"],
];

/** The step page's date questions for each day the person said they do not know (offered once more at the end). */
export function unsureDateQuestions(file: CaseFile): string[] {
  const ids: Record<string, readonly string[]> = {
    servedDate: ["sc-date-claim-served", "sc-date-defendants-claim-served", "case-date-served-with-application", "case-date-served-with-motion-to-change"],
    whenHappened: DATE_QUESTIONS_OF.whenHappened ?? [],
    conferenceDate: DATE_QUESTIONS_OF.conferenceDate ?? [],
    courtDate: DATE_QUESTIONS_OF.courtDate ?? [],
  };
  return Object.entries(ids).flatMap(([fact, list]) => (file[fact as SlotFact].state === "unsure" ? [...list] : []));
}

/** The one full day (with its year) a slot holds, as YYYY-MM-DD, or null. */
export function slotDay(slot: Slot, readDay: (text: string) => string | null): string | null {
  if (slot.state !== "answered" || typeof slot.value !== "string") return null;
  if (isRealIsoDate(slot.value)) return slot.value;
  return readDay(slot.value);
}

/**
 * The date answers the case file gives the step page, keyed by date question, under the
 * person's own answers there (`answered`), which win. `readDay` reads one full day from an
 * answer's words (a day with no year gives none: it is asked, never guessed).
 */
export function withCaseFileDates(answered: Record<string, string>, file: CaseFile, readDay: (text: string) => string | null): Record<string, string> {
  const out = { ...answered };
  for (const [fact, ids] of Object.entries(DATE_QUESTIONS_OF) as [SlotFact, readonly string[]][]) {
    const day = slotDay(file[fact], readDay);
    if (day) for (const id of ids) if (!out[id]) out[id] = day;
  }
  // The day served, given anywhere but the situation questions (whose day withSituationDates
  // places by the papers picked): only the court's own first served-date question (reviewer 2).
  const served = file.servedDate;
  const servedDay = served.source?.kind === "answer" && !served.source.question.startsWith("situation:") ? slotDay(served, readDay) : null;
  const court = typeof file.court.value === "string" ? file.court.value : "";
  const servedId = court === "family" ? "case-date-served-with-application" : court === "small-claims" || court === "civil" ? "sc-date-claim-served" : null;
  if (servedDay && servedId && !out[servedId]) out[servedId] = servedDay;
  // A date question answered in the questions or the review is answered on the step page too,
  // and so is its twin there (the same moment asked under another id, w4/w5 in the story pack).
  for (const [id, words] of Object.entries(file.answers ?? {})) {
    if (!/-date-/.test(id) || out[id]) continue;
    const day = isRealIsoDate(words) ? words : readDay(words);
    if (day) out[id] = day;
  }
  for (const group of SAME_MOMENT) {
    const day = group.map((id) => out[id]).find(Boolean);
    if (day) for (const id of group) if (!out[id]) out[id] = day;
  }
  return out;
}

/** The date answers to keep on a saved position: none that only repeats a day the case file holds elsewhere. */
export function withoutCaseFileDates(answers: Record<string, string>, before: Record<string, string>, file: CaseFile, readDay: (text: string) => string | null): Record<string, string> {
  const given = withCaseFileDates({}, file, readDay);
  return Object.fromEntries(Object.entries(answers).filter(([id, value]) => before[id] !== undefined || given[id] !== value));
}
