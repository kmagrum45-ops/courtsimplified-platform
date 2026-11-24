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
export function storyFormValues(story: string): { field: string; value: string; quote: string }[] {
  if (!story.trim()) return [];
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
  return storyFormValues(storyOf(record)).flatMap(({ field, value, quote }) => {
    // The names are offered by the Parties step on the same page (parties.ts storyPartyOffers): the one place for them,
    // so a name is never offered twice on one screen.
    if (field === "otherParty" || field === "yourName") return [];
    if (!empty(boxes[field])) return [];
    if (field === "yourName" ? Boolean(record && heldYourName(record)) : Boolean(heldAnswer(record, field))) return [];
    return [{ field, facts: askedFacts(field), status: "offer" as const, value, quote }];
  });
}
