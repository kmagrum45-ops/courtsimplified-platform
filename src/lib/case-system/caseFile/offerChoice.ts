/**
 * THE PERSON'S CHOICE ON AN OFFER, KEPT ONCE (site owner, 14 Nov 2026, decision 2 on the batch report: on the offers set
 * aside on the page only, and "I'm not sure" on the kind of case, "No, that's not right" must record "ask once" and
 * "I'm not sure" must record settled, so neither is asked again anywhere).
 *
 * Every offer is made with the one three-choice control (app/_components/UseSuggestion.tsx), and its No and Not sure go
 * through one handler (app/_components/offerChoiceSave.ts), which saves what this module works out:
 *   - "no" (No, that's not right): the offer is kept as declined under its key, so it is never made again; the question
 *     or box it was offered for stays, asked once, plainly, to answer in the person's own words;
 *   - "unsure" (I'm not sure): kept under its key too, and the fact the offer is for (if it is one of the case file's
 *     facts) is recorded "not sure" through the change record, so caseFileOf holds it settled and no screen that asks
 *     by fact status asks it again ("add it when you know").
 * An offer that fills no case-file fact (a wording fix, the Timeline's kind of step, a form's applicability answer) has
 * `fact: null`: its choice is kept under its key only, and the offer is not made again.
 *
 * Where it is kept: the case record's own section, `caseFile.offerChoices` (additive: a case saved before has none and
 * reads as no choice made). Pure: no React, no network. States no law.
 */
import { CASE_FILE_SECTION, emptyCaseFile, withChange, type CaseFile, type FactChanges, type SlotFact } from "./caseFile";
import { factsOfQuestion } from "./factsOfQuestion";
import type { FactWrite } from "./factRecord";

export type OfferChoice = "no" | "unsure";

/** What an offer is for: its key (stable across reloads) and the case file's fact it fills, or null. */
export type OfferTarget = {
  key: string;
  fact: SlotFact | null;
  /**
   * "screen": the screen keeps this choice in a record of its own and passes onNo and onUnsure that record it (the
   * review's reviewOfferChoices, the chat's story offers, the kind-of-claim card). Listed in verifySuggestionsOffered.ts.
   */
  recordedBy?: "screen";
};

export const OFFER_CHOICES_FIELD = "offerChoices";
/** The question id a fact settled from an offer's "I'm not sure" is kept under. */
export const OFFER_UNSURE_PLACE = "offer";
const KEY = /^[\w:.\-/@ ]{1,200}$/;
const MAX_CHOICES = 500;

const object = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

/** A key an offer may be kept under (short, plain characters). */
export const isOfferKey = (key: unknown): key is string => typeof key === "string" && KEY.test(key);

/**
 * The target of an offer made for a question (a date, a triage question, a chat or form box): the key, and the first of
 * the case file's facts the question asks for (factsOfQuestion.ts), so "I'm not sure" settles the question everywhere
 * (factStatus.ts questionStatus: a question is settled when any of its facts is). Null when it asks for none.
 */
export function offerForQuestion(key: string, questionId: string, surface?: string): OfferTarget {
  const slots = emptyCaseFile();
  const fact = factsOfQuestion(questionId, surface).find((candidate) => candidate in slots) as SlotFact | undefined;
  return { key, fact: fact ?? null };
}

/**
 * Whether the case file holds an answer to this fact. "I'm not sure" never takes an answer away (site owner, 14 Nov 2026,
 * decision B: a typed answer beats "not sure" for the same fact; only "removed" takes an answer away): an offer's Not sure
 * on an answered fact keeps the choice under its key and leaves the fact as it is.
 */
export const answeredIn = (held: CaseFile, fact: SlotFact): boolean => held[fact]?.state === "answered";

/** The choices a case holds, by offer key (a malformed entry is left out). */
export function offerChoicesOf(sections: Record<string, unknown> | undefined): Record<string, OfferChoice> {
  const raw = object(object(object(sections)[CASE_FILE_SECTION])[OFFER_CHOICES_FIELD]);
  const out: Record<string, OfferChoice> = {};
  for (const [key, choice] of Object.entries(raw)) if (isOfferKey(key) && (choice === "no" || choice === "unsure")) out[key] = choice;
  return out;
}

/** The person's choice on this offer, or null when none is kept. */
export const offerChoiceOf = (sections: Record<string, unknown> | undefined, key: string): OfferChoice | null => offerChoicesOf(sections)[key] ?? null;

/** The choices with this one added (the newest choice on a key wins); never more than MAX_CHOICES. */
export function withOfferChoice(choices: unknown, key: string, choice: OfferChoice): Record<string, OfferChoice> {
  if (!isOfferKey(key)) throw new Error("Not an offer key.");
  const current = offerChoicesOf({ [CASE_FILE_SECTION]: { [OFFER_CHOICES_FIELD]: choices } });
  delete current[key];
  const kept = Object.entries(current).slice(-(MAX_CHOICES - 1));
  return { ...Object.fromEntries(kept), [key]: choice };
}

/**
 * The case-file section's new parts for one choice, for a screen with the intake's save (IntakeRecovery): the choices,
 * and, for "I'm not sure" on an offer for a fact, the change record with that fact settled "not sure".
 */
export function offerChoiceParts(caseFileSection: unknown, target: OfferTarget, choice: OfferChoice, now: Date, seen: number | undefined, held: CaseFile): { offerChoices: Record<string, OfferChoice>; changes?: FactChanges } {
  const section = object(caseFileSection);
  const offerChoices = withOfferChoice(section[OFFER_CHOICES_FIELD], target.key, choice);
  if (choice !== "unsure" || !target.fact || answeredIn(held, target.fact)) return { offerChoices };
  const changes = withChange(section.changes, target.fact, { state: "unsure" }, now, seen);
  changes[target.fact] = { ...changes[target.fact]!, place: `${OFFER_UNSURE_PLACE}:${target.key}`.slice(0, 200) };
  return { offerChoices, changes };
}

/** The same choice as the server's fact write, for a screen with no intake save (the case pages: POST /api/cases/facts). */
export function offerChoiceWrites(target: OfferTarget, choice: OfferChoice, seenSeq: number, held: CaseFile): FactWrite[] {
  if (choice !== "unsure" || !target.fact || answeredIn(held, target.fact)) return [];
  return [{ fact: target.fact as FactWrite["fact"], state: "unsure", source: "person", question: `${OFFER_UNSURE_PLACE}:${target.key}`.slice(0, 200), seenSeq }];
}

/** The offer choices in a request body, checked: [{ key, choice }], at most 20; or the reason it is refused. */
export function readOfferChoices(body: unknown): { ok: true; offers: { key: string; choice: OfferChoice }[] } | { ok: false; error: string } {
  const raw = object(body).offers;
  if (raw === undefined) return { ok: true, offers: [] };
  if (!Array.isArray(raw) || raw.length > 20) return { ok: false, error: "offers must be a list of at most 20." };
  const offers: { key: string; choice: OfferChoice }[] = [];
  for (const entry of raw) {
    const item = object(entry);
    if (!isOfferKey(item.key) || (item.choice !== "no" && item.choice !== "unsure")) return { ok: false, error: "An offer choice is not well formed." };
    offers.push({ key: item.key, choice: item.choice });
  }
  return { ok: true, offers };
}

/** The checkpoint's case-file section with these offer choices kept (the server's save). */
export function sectionWithOfferChoices(caseFileSection: unknown, offers: readonly { key: string; choice: OfferChoice }[]): Record<string, unknown> {
  const section = object(caseFileSection);
  let choices: unknown = section[OFFER_CHOICES_FIELD];
  for (const offer of offers) choices = withOfferChoice(choices, offer.key, offer.choice);
  return { ...section, [OFFER_CHOICES_FIELD]: choices };
}
