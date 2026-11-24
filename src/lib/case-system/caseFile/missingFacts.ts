/**
 * THE ONE ASKER (site owner, 23 Nov 2026: "Every question a person is shown on any screen ... comes from ONE function that
 * takes the case record and returns only the facts still missing. No screen, route or component keeps its own question
 * list or its own 'already answered' logic").
 *
 * Chrome's test of #561 found 32 repeated questions while the C9 check counted 1: each screen kept its own questions and
 * its own idea of what was answered, and a story fact nothing had read into the record counted as nothing. This module is
 * the one place that decides:
 *   heldAnswer(record, field)       whether a box or question is held, and by what (the person's answer, "not sure", or
 *                                   removed): never asked again then. Moved here from intake/asker.ts askOf (deleted).
 *   missingFacts(record, place, ..) the facts a place may still show: each to ask, or to offer from the story once
 *                                   (Yes / No, that's not right / I'm not sure), never filled in silently.
 * The story is read from the record itself (its storyText), so it is read when it ARRIVES, from any entry, guest or signed
 * in, with no AI (rule-based readers only; names never go to OpenAI).
 *
 * Pure: no React, no network. States no law.
 */
import { heldYourName, type CaseFile, type SlotFact } from "./caseFile";
import { askedFacts, heldAnswer } from "./heldAnswer";
import { extractNarrativePrefill } from "../intelligence/narrativePrefill";
import { quotesOf, statedInStory } from "../intakeReview";
import { formatForCourt, isRealIsoDate } from "../dates";

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
export function missingFacts(record: CaseFile | null | undefined, place: "sc-form", options: { boxes?: Record<string, unknown> } = {}): MissingFact[] {
  if (place !== "sc-form") return [];
  const boxes = options.boxes ?? {};
  return storyFormValues(record).flatMap(({ field, value, quote }) => {
    // The names are offered by the Parties step on the same page (parties.ts storyPartyOffers): the one place for them,
    // so a name is never offered twice on one screen.
    if (field === "otherParty" || field === "yourName") return [];
    if (!empty(boxes[field])) return [];
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
  const sentencesOf = story.split(/(?<=[.!?])\s+/).map((item) => item.trim()).filter(Boolean);
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
