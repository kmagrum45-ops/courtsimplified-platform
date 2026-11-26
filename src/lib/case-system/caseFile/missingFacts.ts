/**
 * THE ONE ASKER (site owner, 23 Nov 2026: "Every question a person is shown on any screen ... comes from ONE function that
 * takes the case record and returns only the facts still missing. No screen, route or component keeps its own question
 * list or its own 'already answered' logic").
 *
 * Chrome's test of #561 found 32 repeated questions while the C9 check counted 1: each screen kept its own questions and
 * its own idea of what was answered, and a story fact nothing had read into the record counted as nothing. This module is
 * the one place that decides:
 *   heldAnswer(record, field)       whether a box or question is held, and by what (the person's answer, "not sure", or
 *                                   removed): never asked again then. Moved here from intake/asker.ts (deleted there).
 *   missingFacts(record, place, ..) the facts a place may still show: each to ask, or to offer from the story once
 *                                   (Yes / No, that's not right / I'm not sure), never filled in silently.
 * The story is read from the record itself (its storyText), so it is read when it ARRIVES, from any entry, guest or signed
 * in, with no AI (rule-based readers only; names never go to OpenAI).
 *
 * Pure: no React, no network. States no law.
 */
import { heldYourName, SLOT_FACTS, type CaseFile, type SlotFact } from "./caseFile";
import { askedFacts, heldAnswer } from "./heldAnswer";
import { extractNarrativePrefill } from "../intelligence/narrativePrefill";
import { quotesOf, statedInStory } from "../intakeReview";
import { formatForCourt, isRealIsoDate } from "../dates";
import { sentences } from "../sentences";
import { slotStatus } from "./factStatus";
import { contextOfFile, factApplies } from "./factRegistry";
import { STATED_FACTS } from "../flow/storyStated";
import type { CaseFact } from "./factsOfQuestion";

export { askedFacts, heldAnswer, type Held } from "./heldAnswer";

/** One fact a place may still show: to ask, or to offer from the story (its value and the story's words). */
export type MissingFact = { field: string; facts: SlotFact[]; status: "ask" | "offer"; value?: string; quote?: string };

/** The Small Claims whole form's boxes the story can give, by box (the form's own field names). */
export const STORY_FORM_FIELDS = ["amountClaimed", "timeline", "evidence", "settlementEfforts", "yourEmail", "goal", "otherParty", "yourName"] as const;

/** The story values for the whole form's boxes, read from the record's story (rule-based, no AI). */
export function storyFormValues(record: CaseFile | null | undefined): { field: string; value: string; quote: string }[] {
  const story = storyOf(record);
  if (!story) return [];
  // The one story reader (intakeReview.ts statedInStory) for the facts it reads: the amount, when it happened (a month and
  // year as written), what they want and the other side (Chrome, test of #561, 1.4: "$5,468.45", "January 2026" and
  // "TEST Fakebuild Contracting Inc." were not read by the form's older reader).
  const read = quotesOf(statedInStory(story, [], "small-claims"));
  const text = (value: string | string[]) => (Array.isArray(value) ? value.join(", ") : value);
  const byReader: { field: string; value: string; quote: string }[] = (
    [["amountClaimed", read.amount], ["timeline", read.whenHappened && { ...read.whenHappened, value: isRealIsoDate(text(read.whenHappened.value)) ? formatForCourt(text(read.whenHappened.value)) : read.whenHappened.value }], ["goal", read.wants], ["otherParty", read.otherParty]] as const
  ).flatMap(([field, found]) => (found && text(found.value).trim() ? [{ field, value: text(found.value), quote: found.quote }] : []));
  // The older reader for the boxes the one reader does not read (the evidence, settlement efforts, email, own name).
  const rest = extractNarrativePrefill({ narrative: story, courtPath: "small-claims" }).facts
    .filter((fact) => fact.state === "direct" && (STORY_FORM_FIELDS as readonly string[]).includes(fact.field) && !byReader.some((item) => item.field === fact.field))
    .map((fact) => ({ field: fact.field, value: text(fact.value), quote: fact.sourceText }));
  return [...byReader, ...rest];
}

const storyOf = (record: CaseFile | null | undefined) => (record?.storyText || record?.savedStory || "").trim();
const empty = (value: unknown) => !(typeof value === "string" ? value.trim() : Array.isArray(value) ? value.length : value);

/**
 * The facts still missing at a place. "sc-form": the Small Claims whole form's story offers ("Found in your description"):
 * each box the story gives, offered while the box is empty and the record holds none of its facts (the person's own name:
 * while the parties hold none). Read from the record's story, so a story from the home page is offered on arrival.
 */
export function missingFacts(record: CaseFile | null | undefined, place: "sc-form" | "understood" | "questions", options: { boxes?: Record<string, unknown>; choices?: Readonly<Record<string, string>> } = {}): MissingFact[] {
  if (place === "understood") return understoodOffers(record);
  if (place === "questions") return flowQuestions(record);
  if (place !== "sc-form") return [];
  const boxes = options.boxes ?? {};
  // An offer the person already answered ("No, that's not right", "I'm not sure"; caseFile/offerChoice.ts, kept under the
  // offer's key "sc-form:<box>") is never offered again: its box asks instead, or is settled.
  const choices = options.choices ?? {};
  return storyFormValues(record).flatMap(({ field, value, quote }) => {
    // The names are offered by the Parties step on the same page (parties.ts storyPartyOffers): the one place for them,
    // so a name is never offered twice on one screen.
    if (field === "otherParty" || field === "yourName") return [];
    if (!empty(boxes[field]) || choices[`sc-form:${field}`]) return [];
    if (field === "yourName" ? Boolean(record && heldYourName(record)) : Boolean(heldAnswer(record, field))) return [];
    return [{ field, facts: askedFacts(field), status: "offer" as const, value, quote }];
  });
}

// ---- The Form 7A checklist, from the record (site owner, 23 Nov 2026, decision 3) --------------------------------------

/** One element of the kind of claim (claimTypes.ts PlaintiffElement): its id and name. */
export type ClaimElement = { id: string; name: string };
/** What the person recorded for an element (depth/elementStateMap.ts ElementRecord), as far as this reads it. */
export type ElementRecordLike = { state?: string; storyDeclined?: boolean };

/**
 * The case-file fact an element is about, when the record keeps one: what was agreed (an element about the agreement),
 * the amount (an element about the amount claimed, never the jurisdiction test, which is not the person's to answer).
 */
export function elementFact(element: ClaimElement): SlotFact | null {
  const words = `${element.id} ${element.name}`;
  if (/jurisdiction/i.test(words)) return null;
  if (/\bagree(?:d|ment)?\b|-agreement-|\bcontract\b|\bunderstanding\b|\barrangement\b/i.test(words) && !/\b(?:breach|broke|not of|quality)\b/i.test(words)) return "agreementTerms";
  if (/\bamount\b|\bhow much\b|\bcost of (?:repair|loss)\b/i.test(words)) return "amount";
  return null;
}

/** The words of a held fact, as a screen shows them. */
function heldWordsOf(record: CaseFile, fact: SlotFact): string {
  const slot = record[fact];
  if (!slot || slot.state !== "answered" || slot.value === undefined) return "";
  return typeof slot.value === "number" ? `$${slot.value.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : String(slot.value);
}

// The words that carry an element's meaning (its name without the filler), for finding the story sentence that says it.
const FILLER = new Set(["the", "a", "an", "was", "were", "is", "are", "of", "or", "and", "to", "it", "its", "that", "this", "by", "for", "with", "what", "how", "did", "do", "not", "reasonably", "acceptable", "claimed", "claim", "calculated"]);
const NEGATED_WORK = /\b(?:not|never|n't)\s+(?:been\s+)?(?:finished|completed|done|delivered|performed|repaired|fixed)\b|\bunfinished\b|\bincomplete\b|\bpoor(?:ly)?\b|\bdefective\b|\bbotched\b/i;

/** The story sentence that says an element, if any: by its fact's story reading, else by its meaning words. */
function storyQuoteFor(element: ClaimElement, story: string, reading: Partial<Record<string, { quote: string }>>): string | null {
  const fact = elementFact(element);
  if (fact) return reading[fact]?.quote ?? null;
  const name = element.name.toLowerCase();
  // The one sentence splitter (sentences.ts; test:shared-behaviour).
  const sentencesOf = sentences(story).map((item) => item.trim()).filter(Boolean);
  // Work not done, not finished or poor: the story's sentence that says so (Chrome 1.14: "The work was not finished").
  if (/\b(?:not finished|unfinished|quality|not performed|not done|incomplete|not delivered|poor)\b/.test(name)) {
    return sentencesOf.find((sentence) => NEGATED_WORK.test(sentence)) ?? null;
  }
  const words = name.replace(/[^a-z\s]/g, " ").split(/\s+/).filter((word) => word.length > 3 && !FILLER.has(word));
  if (words.length < 2) return null;
  return sentencesOf.find((sentence) => words.filter((word) => sentence.toLowerCase().includes(word)).length >= 2) ?? null;
}

/**
 * THE FORM 7A CHECKLIST, FROM THE RECORD. For each element of the person's kind of claim:
 *   held   the record holds its fact (the amount, what was agreed): shown with its value, never "Still to add";
 *   found  the story says it and the person has not answered it yet: offered on ONE screen ("From your story we found:
 *          ... Is this right?"), a single Yes and a "Not right" for each; once "Not right", never offered again;
 *   (the rest) still to add, as before.
 * An element the person already answered (provided, or "I don't have this") is neither held nor found here.
 */
export function form7aFromRecord(record: CaseFile | null | undefined, elements: readonly ClaimElement[], states: Readonly<Record<string, ElementRecordLike | undefined>>): { held: { elementId: string; name: string; value: string }[]; found: { elementId: string; name: string; quote: string }[] } {
  const held: { elementId: string; name: string; value: string }[] = [];
  const found: { elementId: string; name: string; quote: string }[] = [];
  if (!record) return { held, found };
  const story = storyOf(record);
  const reading = story ? (quotesOf(statedInStory(story, [], "small-claims")) as Partial<Record<string, { quote: string }>>) : {};
  for (const element of elements) {
    const answered = states[element.id]?.state === "provided" || states[element.id]?.state === "cannot-provide";
    if (answered) continue;
    const fact = elementFact(element);
    if (fact && heldAnswer(record, fact)?.held === "answered") {
      held.push({ elementId: element.id, name: element.name, value: heldWordsOf(record, fact) });
      continue;
    }
    if (states[element.id]?.storyDeclined || !story) continue;
    const quote = storyQuoteFor(element, story, reading);
    if (quote) found.push({ elementId: element.id, name: element.name, quote });
  }
  return { held, found };
}

// ---- The new Small Claims flow (SC_FLOW_V2; site owner, 26 Nov 2026) ----------------------------------------------------

/**
 * "understood": the story's facts the Understood step offers once (flow/storyStated.ts wrote them as stated in the story),
 * in its order, each with its value and the story's words. A fact the person confirmed, said "not sure" to, removed or
 * said "not right" to is not offered again.
 */
function understoodOffers(record: CaseFile | null | undefined): MissingFact[] {
  if (!record) return [];
  return STATED_FACTS.flatMap((fact) => {
    const slot = record[fact];
    if (slotStatus(slot) !== "offer" || slot?.declined || slot?.source?.kind !== "story") return [];
    const value = Array.isArray(slot.value) ? slot.value.join(", ") : String(slot.value ?? "");
    return value.trim() ? [{ field: fact, facts: [fact], status: "offer" as const, value, quote: slot.source.quote }] : [];
  });
}

/**
 * THE QUESTIONS PAGE'S ORDER (Small Claims): each fact, with the question whose words ask it (questionBank.ts keeps the
 * wording only: whether a question is shown is decided here, by the record and the registry). The person bringing the case
 * and the person responding each get their own; a fact that is the other side's does not apply (factRegistry.ts rules).
 * The names and addresses are the Parties step's (parties.ts), on the same page.
 */
export const FLOW_QUESTIONS: readonly { fact: CaseFact; question: string }[] = [
  { fact: "claimKind", question: "sc-orient-dispute-category" },
  { fact: "whenHappened", question: "sc-orient-when-happened" },
  { fact: "amount", question: "sc-amount-claimed" },
  { fact: "wants", question: "sc-remedy-sought" },
  { fact: "publication", question: "sc-defamation-publication-details" },
  { fact: "completionDate", question: "sc-contractor-completion-date" },
  { fact: "noticeToContractor", question: "sc-contractor-notice-before-replacement" },
  { fact: "responseFacts", question: "sc-defendant-response-facts" },
  { fact: "admission", question: "sc-defendant-admission-payment" },
  { fact: "defendantsClaim", question: "sc-defendant-counterclaim" },
  { fact: "evidence", question: "sc-evidence-available" },
];

/**
 * "questions": every fact still unknown, on ONE page, in FLOW_QUESTIONS' order (owner's change A, 26 Nov 2026): not held
 * (answered, "not sure", removed), not waiting on the Understood step's confirm (an offer), and applying to this case
 * (factRegistry.ts factApplies: nothing about court papers when nothing is filed; the defence only for the person
 * responding; a kind's own questions only for that kind). A story value said "not right" is asked here.
 */
function flowQuestions(record: CaseFile | null | undefined): MissingFact[] {
  if (!record) return [];
  const context = contextOfFile(record);
  return FLOW_QUESTIONS.flatMap(({ fact, question }) => {
    if (!factApplies(fact, context)) return [];
    // A fact with no slot of its own (what was published, the defence's facts) is held by its question's answer, or its
    // "not sure", in the record's answers (caseFile.ts file.answers, by question id).
    if (!(SLOT_FACTS as readonly string[]).includes(fact)) return record.answers?.[question]?.trim() || record.unknownQuestions?.includes(question) ? [] : [{ field: question, facts: [], status: "ask" as const }];
    const slotFact = fact as SlotFact;
    const slot = record[slotFact];
    const status = slotStatus(slot);
    if (status === "known" || status === "settled") return [];
    if (status === "offer" && !slot?.declined) return [];
    return [{ field: question, facts: [slotFact], status: "ask" as const }];
  });
}
