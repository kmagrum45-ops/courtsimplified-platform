/**
 * EVERY FACT HAS A TYPE, AND THE ONE WRITER KEEPS ONLY A VALUE OF THAT TYPE (site owner, 18 Nov 2026, decision 1 on
 * 2d0ebd53: "validate the value against the fact's type (yes/no, number, date, person's name, place) and reject
 * mismatches (a sentence in a yes/no fact, words in an amount such as "$2,400 plus my costs", a place such as "Gatineau"
 * as a person's first name; keep "plus my costs" apart as a costs note)").
 *
 * Read by the one writer (caseFile.ts give, for the case file's slots; factRecord.ts normalised, for every fact the
 * server saves), by the story suggestions (a suggestion that does not fit its question's fact is never offered:
 * orchestrateIntakeTurn.ts, storyOffers.ts) and by the Parties step (a party's name or city). A value that does not fit is
 * not kept: the fact stays to ask, and the person's words stay in the answer they gave.
 *
 * The table is typed by CaseFact, so a fact with no type does not compile; test:fact-types lists every fact and its type.
 * Pure. States no law. No model.
 */
import { factsOfQuestion, type CaseFact } from "./factsOfQuestion";
import { amountWithCostsNote, parseRecordedAmount } from "../format/recordedAmount";
import { firstWordedDate, isRealIsoDate, mentionsDate } from "../dates";
import ocj from "../../content-library/courts/ocjCourthouses.json";

export type FactType =
  /** Only a plain yes or no ("Yes", "no.", true, false). A sentence is never a yes or no, even one that starts "Yes." */
  | "yes-no"
  /** A sum of money: a number, or words that are one amount ("$2,400"); "$2,400 plus my costs" is 2400 with its note. */
  | "amount"
  /** A day, a rough time ("June 2026", "last summer"), or that there is none yet ("No court date yet", "unknown"). */
  | "date"
  /** Someone's name (a person or a business): never a place ("Gatineau"), never a question. */
  | "name"
  /** A place (a city, a province, a country): never a question, never a sentence. */
  | "place"
  /** One of the site's own choices (a code or its words, or a list of them), set by a button, never typed. */
  | "choice"
  /** The person's own words: anything they wrote. */
  | "words";

/**
 * The type of every fact. "words" is kept for facts a question asks in the person's own words (the question bank's
 * short-text questions, the chat's compound questions); "yes-no" for facts every asker asks as Yes / No.
 */
export const FACT_TYPES: Record<CaseFact, FactType> = {
  situation: "choice",
  side: "choice",
  court: "choice",
  stage: "choice",
  // The review asks it Yes / No; the chat's "Has anything already been filed, served, ordered, scheduled, or decided...?"
  // in the person's words ("I filed my application in June"), so it holds words.
  filed: "words",
  defenceFiled: "yes-no",
  // Whether the person is making a Defendant's Claim (decision 1, 18 Nov 2026): the review's and the chat's "Do you
  // believe the plaintiff, or someone else, owes you money...?" and the Forms tab's "Are you making a Defendant's Claim?".
  defendantsClaim: "yes-no",
  claimServed: "yes-no",
  papers: "choice",
  servedDate: "date",
  serviceMethod: "words",
  amount: "amount",
  otherParty: "name",
  children: "words",
  married: "yes-no",
  claimKind: "choice",
  wants: "words",
  whenHappened: "date",
  evidence: "words",
  story: "words",
  urgent: "words",
  courtFileNumber: "words",
  courtDate: "date",
  conferenceDate: "date",
  claimIssuedDate: "date",
  defenceFiledDate: "date",
  marriedWhere: "place",
  // A defendant's own outcome, in their words ("Only responding to the claim"); whether they claim money back is
  // defendantsClaim.
  outcome: "words",
  filedDocuments: "choice",
  safety: "words",
  publication: "words",
  twentyDaysPassed: "yes-no",
  notedInDefault: "words",
  responseFacts: "words",
  admission: "words",
  completionDate: "date",
  noticeToContractor: "yes-no",
  timeline: "words",
  livingSituation: "words",
  livingHistory: "words",
  property: "words",
  adoption: "words",
  missingEvidence: "words",
  yourName: "name",
  divorceSought: "words",
  cohabitation: "words",
  municipality: "place",
  otherPartyMunicipality: "place",
};

const STEP_DATE = /^(?:sc|case)-date-/;

/** The type of a fact, or undefined for a word that is not a fact (test:fact-types plants one). */
export function factTypeOf(fact: string): FactType | undefined {
  // A dated step question ("sc-date-...", "case-date-...") is its own fact, a day (test:every-question-has-fact).
  if (STEP_DATE.test(fact)) return "date";
  return (FACT_TYPES as Record<string, FactType | undefined>)[fact];
}

/** A plain yes or no: the whole answer is the word (with a full stop or "!"), never a sentence. */
/** The person's own answer that opens with an explicit Yes or No and goes on in their words. */
const OPENS_WITH_YES_NO = /^\s*(yes|no)\s*[.,!;:—-]\s*\S/i;

export const PLAIN_YES_NO = /^\s*(yes|no)\s*[.!]?\s*$/i;

/** Places a name is never: Canada's provinces and territories and largest cities, and every Ontario courthouse's city. */
const PLACES = new Set(
  [
    "Ontario", "Quebec", "Québec", "British Columbia", "Alberta", "Saskatchewan", "Manitoba", "New Brunswick", "Nova Scotia",
    "Prince Edward Island", "Newfoundland", "Newfoundland and Labrador", "Yukon", "Northwest Territories", "Nunavut", "Canada",
    "Montreal", "Montréal", "Gatineau", "Quebec City", "Laval", "Longueuil", "Sherbrooke", "Vancouver", "Surrey", "Burnaby",
    "Victoria", "Calgary", "Edmonton", "Winnipeg", "Regina", "Saskatoon", "Halifax", "Moncton", "Fredericton", "Saint John",
    "Charlottetown", "St. John's", "Whitehorse", "Yellowknife", "Iqaluit",
    "Toronto", "Ottawa", "Mississauga", "Brampton", "Hamilton", "London", "Markham", "Vaughan", "Kitchener", "Windsor",
    "Richmond Hill", "Oakville", "Burlington", "Oshawa", "Barrie", "St. Catharines", "Cambridge", "Kingston", "Guelph",
    "Waterloo", "Whitby", "Ajax", "Pickering", "Milton", "Niagara Falls", "Thunder Bay", "Sudbury", "Peterborough", "Belleville",
    "Kanata", "Nepean", "Orleans", "Scarborough", "Etobicoke", "North York",
    ...(ocj as { courthouses: { city: string }[] }).courthouses.map((house) => house.city),
  ].map((place) => place.toLowerCase()),
);

/** Whether some words are a place, as a whole ("Gatineau", "Gatineau, QC", "Ottawa ON"). */
export function isPlaceName(value: string): boolean {
  // Each part a place or a province's short form: "Gatineau", "Gatineau, Quebec", "Ottawa ON", "Gatineau QC".
  const parts = value.trim().replace(/[.]+$/, "").split(/\s*,\s*/).map((part) => part.replace(/\s+(?:on|qc|bc|ab|sk|mb|nb|ns|pe|nl|yt|nt|nu)$/i, "").trim().toLowerCase()).filter(Boolean);
  return parts.length > 0 && parts.every((part) => PLACES.has(part) || /^(?:on|qc|bc|ab|sk|mb|nb|ns|pe|nl|yt|nt|nu)$/.test(part));
}

/** A year on its own ("2024", "summer 2025"); every other date or time is read by the one date reader (dates.ts mentionsDate). */
const A_YEAR = /\b(?:1[89]|20)\d{2}\b/;
const NO_DATE_YET = /^\s*(?:unknown|not[- ]sure|none(?: yet)?|no (?:court |hearing |conference )?date(?: yet)?|not (?:set|scheduled)(?: yet)?|nothing (?:set|scheduled)(?: yet)?)\b/i;
const QUESTION = /\?\s*$/;

export type Fits = { ok: true; value: string | number | boolean | string[]; note?: string } | { ok: false; reason: string };

/**
 * Whether a value fits a fact's type: the value to keep (an amount's number, with "plus my costs" as its note), or why
 * it does not fit. A fact with no type fits nothing (test:fact-types: every fact has one).
 */
/**
 * `fromSuggestion`: the value is a story suggestion the site would offer, not the person's own answer. A yes/no fact then
 * takes only the bare word; the person's own answer may open with it and go on in their words ("No. I only want to defend
 * the claim."), kept as that Yes or No (the words stay in the answer they gave).
 */
export function fitsFactType(fact: string, value: unknown, options: { fromSuggestion?: boolean } = {}): Fits {
  const type = factTypeOf(fact);
  if (!type) return { ok: false, reason: `${fact} has no type` };
  if (value === undefined || value === null) return { ok: false, reason: "empty" };
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    return (type === "choice" || type === "words") && items.length > 0 ? { ok: true, value: items } : { ok: false, reason: `a list is not ${type}` };
  }
  if (typeof value === "boolean") return type === "yes-no" || type === "choice" || type === "words" ? { ok: true, value } : { ok: false, reason: `true/false is not ${type}` };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { ok: false, reason: "not a number" };
    return type === "amount" || type === "words" || type === "choice" ? { ok: true, value } : { ok: false, reason: `a number is not ${type}` };
  }
  if (typeof value !== "string") return { ok: false, reason: "not a value" };
  const text = value.trim();
  if (!text) return { ok: false, reason: "empty" };
  switch (type) {
    case "yes-no":
      if (PLAIN_YES_NO.test(text)) return { ok: true, value: text };
      if (!options.fromSuggestion) {
        const opening = OPENS_WITH_YES_NO.exec(text);
        // Their whole answer is kept beside it as the note, never dropped (a No that still claims money back stays readable).
        if (opening) return { ok: true, value: opening[1].charAt(0).toUpperCase() + opening[1].slice(1).toLowerCase(), note: text };
      }
      return { ok: false, reason: "not a plain yes or no" };
    case "amount": {
      const sum = parseRecordedAmount(text);
      if (sum !== null) return { ok: true, value: sum };
      const withNote = amountWithCostsNote(text);
      return withNote ? { ok: true, value: withNote.amount, note: withNote.note } : { ok: false, reason: "not one amount" };
    }
    case "date":
      return isRealIsoDate(text) || firstWordedDate(text) || mentionsDate(text) || A_YEAR.test(text) || NO_DATE_YET.test(text) ? { ok: true, value: text } : { ok: false, reason: "no day or time in it" };
    case "name":
      if (QUESTION.test(text)) return { ok: false, reason: "a question is not a name" };
      if (isPlaceName(text)) return { ok: false, reason: "a place is not a name" };
      return text.length <= 200 ? { ok: true, value: text } : { ok: false, reason: "too long for a name" };
    case "place":
      if (QUESTION.test(text)) return { ok: false, reason: "a question is not a place" };
      return text.length <= 120 && !/[.!]\s+\S/.test(text) ? { ok: true, value: text } : { ok: false, reason: "a sentence is not a place" };
    case "choice":
      return text.length <= 300 && !QUESTION.test(text) ? { ok: true, value: text } : { ok: false, reason: "not one of the choices" };
    case "words":
      return { ok: true, value: text };
  }
}

/**
 * Whether a story suggestion for a question may be offered: its answer fits every fact the question asks for. A question
 * that asks for no fact (the screen's own) takes any answer.
 */
export function suggestionFits(questionId: string, answer: unknown): boolean {
  return factsOfQuestion(questionId).every((fact) => fitsFactType(fact, answer, { fromSuggestion: true }).ok);
}

/**
 * The type of each party detail on the Parties step (the same rule, decision 1): a name is never a place, a city is a
 * place. Typed by detail, so a detail with no type does not compile (parties.ts PARTY_DETAILS).
 */
export const PARTY_DETAIL_TYPES = {
  companyName: "name", firstName: "name", secondName: "name", lastName: "name", fullName: "name", alsoKnownAs: "name",
  street: "words", city: "place", province: "place", postalCode: "words", phone: "words", email: "words",
  repName: "name", repLso: "words", repStreet: "words", repCity: "place", repProvince: "place", repPostalCode: "words", repPhone: "words", repEmail: "words",
} as const satisfies Record<string, FactType>;

/** Whether a value fits a party detail's type (a place as a first name does not). */
export function partyDetailFits(detail: string, value: string): boolean {
  const type = (PARTY_DETAIL_TYPES as Record<string, FactType | undefined>)[detail];
  if (!type) return false;
  const text = value.trim();
  if (!text) return false;
  if (type === "name") return !QUESTION.test(text) && !isPlaceName(text) && text.length <= 200;
  if (type === "place") return !QUESTION.test(text) && text.length <= 120;
  return true;
}
