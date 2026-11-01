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
 * the first whose facts are all not asked, or null. A fact the person said they do not know
 * is never asked again, anywhere, by any screen (site owner, 31 Oct; it replaced "offered once
 * more at the end", option 1 of 24 Oct): screens show it as the quiet line "Not answered yet: add
 * it when you know" (askCopy.ts NOT_ANSWERED_YET), and the person adds it through the one change
 * path (withChange) when they know.
 *
 * Pure: no React, no network. States no law.
 */
import type { Checkpoint } from "../intakeCheckpoint";
import { freshSections } from "../storyBasis";
import { storyOfMaster } from "../intakeStory";
import { situationAnswers, situationOf, sideOf, firstPageOf, stepFromSituation } from "../situation/situation";
import { isKindOfClaim, kindFromStory, storyQuoteFor, wordsInStory } from "../intake/claimKind";
import { CLAIM_TYPES } from "../intake/claimTypes";
import { chatQuestionOf, chatSentencesFor, factOfAskedText, factsOfQuestion } from "./factsOfQuestion";
import { parseRecordedAmount } from "../format/recordedAmount";
import type { StatementOfClaimDraftInput } from "../statementOfClaimDraftEngine";
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
/**
 * `changed`: the value is the person's latest change (the change record, `CASE_FILE_SECTION.changes`).
 * `removed`: the person removed the answer (their latest change): not held, never brought back by an
 * older source, and not asked again by itself (they add it back with "Change").
 */
export type Slot = { state: SlotState; value?: string | number | boolean | string[]; source?: SlotSource; confirmed: boolean; changed?: true; removed?: true };
/** `answers`: every answer given to a named question (its id and words), for the step page's dates. */
export type CaseFile = Record<SlotFact, Slot> & {
  answers?: Record<string, string>;
  /** The papers the person said are filed, as stored (shown in words with "Anything filed yet"). */
  documents?: string[];
  /**
   * Date questions answered "I don't know yet" that no slot holds (the day a claim was issued):
   * never asked again, folded on the step page like the slots' days (story pack on GitHub, 27 Oct:
   * sc-date-claim-issued asked on the results page and again on the case page).
   */
  unsureDates?: string[];
  /** The side in the start answer's own words for a case already going ("I started this case (applicant)"). */
  sideWords?: string;
  /** The story as it is now, for the lines "What we have so far" quotes from it (storyLines.ts). */
  story?: string;
  /**
   * A kind of claim made by the site, not the person (the guided route's story match or the
   * classifier's suggestion not yet ticked, or an older saved case's unticked match): a PROPOSAL,
   * offered with the story's words, never the claimKind slot's value (site owner, 29 Oct).
   */
  claimKindProposal?: { claimTypeId: string; quote: string | null };
  /** The area the file is for (the checkpoint's court), so readers know whether a Small Claims kind applies. */
  area?: string;
  /** An older saved case with no checkpoint story: the story it saved, read only to word a proposal (claimKindOf). */
  savedStory?: string;
  /** The story's words a ticked suggestion was shown with (kept with the tick). */
  claimKindQuote?: string;
  /**
   * What the person recorded for each element of their kind of claim (the depth questions, the Form 7A
   * section's "I have this" / "I don't have this"), as the saved case keeps it: read by the Form 7A
   * section on every Small Claims route, never rebuilt from a screen's copy (site owner, 30 Oct).
   */
  elementStates?: Record<string, unknown>;
  /** The AI's suggested kind waiting for the person's "That's right" / "Not quite" (the guided route). */
  claimKindPending?: { claimTypeId: string; quote: string | null };
  /** Kinds the person said are not theirs ("Not quite"): never offered again, never sent to an AI as known. */
  claimKindRemoved?: string[];
  /** The facts the person changed or removed with "Change" (the change record), oldest change first. */
  changedFacts?: SlotFact[];
  /**
   * The questions the person answered in the review, as the saved case records them
   * (CASE_FILE_SECTION.answeredInReview): the review keeps each shown, answered, in its place, after a
   * reload, in a second tab and on every screen, never from a list held in the page (fault 1, 31 Oct).
   */
  answeredInReview?: string[];
};

/** Where the case file keeps what it adds: the facts answered "not sure", and the questions answered in the review. */
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

/**
 * "No court date yet", "none", "nothing scheduled": an answer to a court-date question that says there
 * is none, kept as the person's answer, never as a rough day (26 Oct re-test, case 14: "No court date
 * yet (day not given yet)").
 */
export function saysNoDateYet(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^\s*(?:no(?:pe)?|none(?: yet)?|not yet|nothing (?:scheduled|set|booked)(?: yet)?|no(?:t)? (?:any )?(?:court |next )?(?:dates?|hearings?|conferences?|appearances?)(?: (?:yet|scheduled|set|booked))*(?: yet)?|there (?:is|are) no (?:court )?(?:dates?|hearings?|conferences?)(?: (?:yet|scheduled|set))*)\s*[.!]?\s*$/i.test(value);
}
/** The slots a "no date yet" answer can close. */
const COURT_DAYS = new Set<SlotFact>(["conferenceDate", "courtDate"]);

/** The slots that hold a day. */
const DATED = new Set<SlotFact>(["whenHappened", "servedDate", "conferenceDate", "courtDate"]);

/** The one full day an answer's words give, or null (a day with no year is not one). */
function readFullDay(text: string): string | null {
  const worded = firstWordedDate(text);
  return worded && isRealIsoDate(worded.iso) ? worded.iso : null;
}

/** The day a slot holds, as an ISO date, whatever form it was given in; null when it holds none. */
export function dayOfSlot(slot: Slot): string | null {
  if (typeof slot.value !== "string") return null;
  return isRealIsoDate(slot.value) ? slot.value : readFullDay(slot.value);
}

/** The next court date is the conference: the same day in both slots (case 16), listed once. */
export function courtDateIsConference(file: CaseFile): boolean {
  const court = dayOfSlot(file.courtDate);
  return court !== null && court === dayOfSlot(file.conferenceDate);
}

/** "We were married in Lisbon, Portugal in 2009": the place named, with the words it came from, or null. */
export function marriedWhereIn(story: string): { place: string; quote: string } | null {
  const match = /\b(?:[Ww]e|I)\s+(?:were|was|got)\s+married\s+in\s+((?:[A-Z][\w'.-]*)(?:[ ,]+(?:[A-Z][\w'.-]*))*)/.exec(story);
  if (!match) return null;
  const place = match[1].replace(/[ ,]+$/, "").trim();
  return place ? { place, quote: match[0] } : null;
}

/** An answer that starts by naming a conference ("Case conference on …", "Conference on …"). */
const LEADS_WITH_CONFERENCE = /^\s*(?:(?:case|settlement|trial management|pre-?trial)\s+)?conference\b/i;

/** Records one answer into the file: the first answer stands; an unsure one never covers a real one. */
function give(file: CaseFile, fact: string, value: unknown, question: string) {
  // "Next court date" answers one of two slots: the conference date when the answer leads with a
  // conference ("Case conference on November 16, 2026"), else the court date. Conference audit,
  // 2026-10-26: family's box kept a case conference only in the typed words; "Trial on March 3,
  // 2027, set at the settlement conference" stays the court date (reviewer).
  if (/(?:^|:)upcomingCourtDate$/.test(question)) {
    const leads = typeof value === "string" && LEADS_WITH_CONFERENCE.test(value);
    if ((fact === "conferenceDate") !== leads) return;
  }
  if (!isSlot(fact) || blank(value)) return;
  const slot = file[fact];
  if (isUnsureAnswer(value)) {
    if (slot.state === "not-asked") file[fact] = { state: "unsure", source: { kind: "answer", question }, confirmed: true };
    return;
  }
  if (slot.state === "answered") return;
  // "No court date yet" answers the question: there is none (26 Oct re-test, case 14).
  if (COURT_DAYS.has(fact) && saysNoDateYet(value)) {
    file[fact] = { state: "answered", value: String(value).trim(), source: { kind: "answer", question }, confirmed: true };
    return;
  }
  // A rough time ("last summer", "June 2026") is kept as given, but is not the day itself:
  // the fact stays unsure, never asked again; the step page shows it folded (item 12; site owner, 31 Oct).
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

/**
 * "What kind of dispute is this?" keeps its answer as a code (facts.disputeCategory, the extractor's
 * list): the question's own choice words for it, so the answer is shown as given (26 Oct re-test,
 * case 20: "Unpaid money owed to you" confirmed in the chat, then "Kind of claim: Not sure yet:
 * nothing in your story shows it" and no line in "What we have so far").
 */
export const DISPUTE_CATEGORY_WORDS: Record<string, string> = {
  "unpaid-money": "Unpaid money owed to you",
  "contract-dispute": "A contract or agreement dispute",
  "property-damage": "Property damage",
  "loan-or-debt": "A loan or debt",
  "work-or-services": "Work or a service you paid for (e.g. a contractor)",
  "deposit-refund": "A deposit that wasn't returned",
  "consumer-purchase": "A consumer purchase problem",
  "vehicle-dispute": "A vehicle-related dispute",
  defamation: "Something said about you (defamation)",
  "personal-injury": "A personal injury (a fall, an animal bite, or similar)",
  other: "Something else",
};

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
  // Likewise a kind of claim they chose themselves (the overview's list, CLAIM_KIND_QUESTION).
  if (typeof position.claimKind === "string" && (position.claimKind === "not-sure" || isKindOfClaim(position.claimKind))) give(file, "claimKind", position.claimKind, CLAIM_KIND_QUESTION);

  // 1. The situation answers: the person's own, never tied to the story.
  const situation = situationOf(sections);
  const side = sideOf(situation);
  if (side) give(file, "side", side, "situation:started");
  if (situation.court) give(file, "court", situation.court, "situation:court");
  else if (court) give(file, "court", court, "situation:court");
  // Served: the step they picked since (a conference set, a motion), or responding (conference audit).
  const servedStep = situation.where === "served" ? stepFromSituation(situation, situation.court ?? court) : null;
  if (servedStep) give(file, "stage", servedStep, "situation:stage");
  else if (situation.where === "served") give(file, "stage", "responding", "situation:where");
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
  // The answers given to the story reading's questions on the home page (HomeLocationGate,
  // home:understoodAnswers): the person's own, so the fact each question asks for is held, by the
  // question's own words (factsOfQuestion.ts factOfAskedText). Before, nothing else knew of them
  // (Charter re-test 27 Oct: "What you want" was offered from a story sentence after the person
  // had answered it, declaration included).
  const homeAnswers = object(sections.home).understoodAnswers;
  for (const item of Array.isArray(homeAnswers) ? homeAnswers : []) {
    const { question, answer } = object(item);
    if (typeof question !== "string" || typeof answer !== "string" || !answer.trim()) continue;
    const fact = factOfAskedText(question);
    if (fact) give(file, fact, answer.trim(), `home:${fact}`);
  }

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
      // A list of documents also answers whether anything is filed.
      if ((key === "documents" || key === "filedDocuments") && Array.isArray(said) && said.length) give(file, "filed", !(said.length === 1 && said[0] === "nothing"), `${area}:${key}`);
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
      // fact with no words kept is unsure (never asked again; the step page shows it folded).
      const field = QUESTION_BANK.find((question) => question.id === id)?.capturesField;
      const captured = field ? guidedFacts[field] : id === "sc-orient-role" ? guidedFacts.role : id === "sc-orient-dispute-category" && typeof guidedFacts.disputeCategory === "string" ? DISPUTE_CATEGORY_WORDS[guidedFacts.disputeCategory] : undefined;
      if (captured === undefined && DATED.has(fact)) unsure(file, fact, id);
      else if (captured === undefined) file[fact] = { state: "answered", source: { kind: "answer", question: id }, confirmed: true };
      else give(file, fact, captured, id);
    }
  }
  // The guided route's kind: the person's when they ticked it ("That's right"), else a proposal only.
  const matched = object(guided.matchedClaimType);
  if (typeof matched.claimTypeId === "string" && isKindOfClaim(matched.claimTypeId)) {
    if (matched.userConfirmed === true) {
      give(file, "claimKind", matched.claimTypeId, CLAIM_KIND_TICKED);
      if (typeof matched.quote === "string") file.claimKindQuote ??= matched.quote;
    }
    else file.claimKindProposal ??= { claimTypeId: matched.claimTypeId, quote: typeof matched.quote === "string" ? matched.quote : null };
  }
  // The AI's suggestion waiting for an answer, and the kinds the person turned down (aiCaseContext.ts).
  const pending = object(guided.pendingSuggestion);
  if (typeof pending.claimTypeId === "string" && isKindOfClaim(pending.claimTypeId)) file.claimKindPending = { claimTypeId: pending.claimTypeId, quote: typeof pending.quote === "string" ? pending.quote : null };
  const turnedDown = strings(guided.rejectedSuggestionIds);
  if (turnedDown.length) file.claimKindRemoved = turnedDown;

  // 4. The review's answers, and its "I don't know yet".
  const builder = object(sections.builder);
  for (const [id, answer] of Object.entries(object(builder.initialAnswers))) {
    if (typeof answer === "string") answers[id] ??= answer;
    for (const fact of slotsOf(id)) give(file, fact, answer, `review:${id}`);
  }
  for (const id of strings(builder.initialUnknowns)) for (const fact of slotsOf(id)) unsure(file, fact, `review:${id}`);
  // A date question answered "I don't know yet", in the review or in words, whatever slot it has or not.
  const unsureDates = [...strings(builder.initialUnknowns), ...Object.entries(answers).filter(([, words]) => isUnsureAnswer(words)).map(([id]) => id)].filter((id) => /-date-/.test(id));
  if (unsureDates.length) file.unsureDates = [...new Set(unsureDates)];
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
  // An older saved case (before 29 Oct) kept the kind in the analysis copy (intakeData.extra): read
  // here only, as a fallback: ticked, it is the person's; unticked, a proposal (claim type, rule 3).
  const extra = object(object(object(master).intakeData).extra);
  if (typeof extra.confirmedClaimTypeId === "string" && isKindOfClaim(extra.confirmedClaimTypeId)) {
    if (extra.claimTypeUserConfirmed === true) {
      give(file, "claimKind", extra.confirmedClaimTypeId, CLAIM_KIND_TICKED);
      if (typeof extra.claimTypeQuote === "string") file.claimKindQuote ??= extra.claimTypeQuote;
    }
    else file.claimKindProposal ??= { claimTypeId: extra.confirmedClaimTypeId, quote: typeof extra.claimTypeQuote === "string" ? extra.claimTypeQuote : null };
  }
  // An older saved case with no checkpoint kept the issues picked on a civil or Family form only in its
  // analysis copy: read here only, as a fallback (route-implied, like the form's own answer).
  const savedArea = court ?? object(object(master).intakeData).courtPath;
  if (!checkpoint && (savedArea === "civil" || savedArea === "family") && strings(extra.issues).length) give(file, "claimKind", strings(extra.issues), `${savedArea}:issues`);
  // The element record the analysis saved with the case (the depth phase's answers), for the Form 7A section.
  const savedElementStates = object(extra.elementStateMap);
  if (Object.keys(savedElementStates).length) file.elementStates = savedElementStates;
  for (const answer of Array.isArray(object(master).intakeAnswers) ? (object(master).intakeAnswers as unknown[]) : []) {
    const item = object(answer);
    if (typeof item.questionId === "string" && typeof item.answerText === "string") answers[item.questionId] ??= item.answerText;
    // The saved copy of the guided answers gives the kind of claim only for a case with no checkpoint
    // (an older saved case): where the checkpoint is read, its answers are the one copy, so an answer
    // emptied there (a side change, the story-version rule) is not brought back from this copy.
    if (typeof item.questionId === "string") for (const fact of slotsOf(item.questionId)) if (!(fact === "claimKind" && checkpoint)) give(file, fact, item.answerText, item.questionId);
  }
  file.answers = answers;
  // The papers filed, as answered in any area's list (case 16: "the filed application and answer").
  // And the papers named in the situation answers ("I was served with a Plaintiff's Claim"), so "Anything
  // filed yet: Yes" names them in every area, not only where a form listed them (26 Oct re-test).
  const startCourt = situation.court ?? court;
  const startAnswers = startCourt === "small-claims" || startCourt === "civil" || startCourt === "family" ? situationAnswers(startCourt, situation) : null;
  const fromStart = startAnswers?.documents ?? [];
  // The side as the overview and the review word it (reviewer, 26 Oct: "Bringing the case" here).
  if (startAnswers?.roleWords) file.sideWords = startAnswers.roleWords;
  const listed = [...fromStart, ...forms.flatMap(([values]) => [values.documents, values.filedDocuments]).flatMap((value) => strings(value))].filter((item) => item !== "nothing" && item !== "not-sure");
  if (listed.length) file.documents = [...new Set(listed)];
  file.story = String(object(sections.story).text ?? "");
  file.area = checkpoint?.courtPath ?? court ?? undefined;
  if (!file.story.trim() && master) file.savedStory = storyOfMaster(master) ?? undefined;

  // 8. "Not quite": the kinds the person turned down, kept by the case file itself, so starting the
  // questions again (which resets the guided record) never offers one back (rule 6, 31 Oct).
  const turnedDownKinds = strings(object(object(sections[CASE_FILE_SECTION]).turnedDown).claimKind);
  if (turnedDownKinds.length) file.claimKindRemoved = [...new Set([...(file.claimKindRemoved ?? []), ...turnedDownKinds])];
  // The questions answered in the review (withAnsweredInReview), kept by the case file itself.
  const answeredInReview = strings(object(sections[CASE_FILE_SECTION]).answeredInReview);
  if (answeredInReview.length) file.answeredInReview = [...new Set(answeredInReview)];

  // 9. THE CHANGE RECORD: the person's latest change of each fact wins over every source above
  // (site owner, 31 Oct: "one change path, latest change wins"). Applied last, so nothing older
  // (a guided answer, the overview's pick, a form value, a situation answer, the saved position, the
  // saved copy) brings a changed or removed value back. The overview's own pick saved after the
  // change (position.claimKindAt, stamped by the server) is newer, so it wins in its turn.
  applyChanges(file, changesOf(sections), position);
  // A suggestion waiting for an answer is never one the person turned down or removed.
  if (file.claimKindPending && file.claimKindRemoved?.includes(file.claimKindPending.claimTypeId)) delete file.claimKindPending;
  return file;
}

/** The question id an answer given through "Change" is kept under (the slot's source). */
export const CHANGE_QUESTION = "change";

/** One change of one fact: a new answer, or the answer removed; `seq` orders changes, newest highest. */
export type FactChange =
  | { state: "answered"; value: string | number | boolean | string[]; at: string; seq: number }
  | { state: "removed"; at: string; seq: number };
export type FactChanges = Partial<Record<SlotFact, FactChange>>;
export type ChangeInput = { state: "answered"; value: string | number | boolean | string[] } | { state: "removed" };

const changeable = (value: unknown): value is string | number | boolean | string[] =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean" || Array.isArray(value);

/** The change record a checkpoint's sections hold (CASE_FILE_SECTION.changes): each fact's latest change. */
export function changesOf(sections: Record<string, unknown> | undefined): FactChanges {
  const out: FactChanges = {};
  for (const [fact, raw] of Object.entries(object(object(object(sections)[CASE_FILE_SECTION]).changes))) {
    const entry = object(raw);
    if (!isSlot(fact) || typeof entry.seq !== "number") continue;
    const at = typeof entry.at === "string" ? entry.at : "";
    if (entry.state === "removed") out[fact] = { state: "removed", at, seq: entry.seq };
    else if (entry.state === "answered" && !blank(entry.value) && changeable(entry.value)) out[fact] = { state: "answered", value: Array.isArray(entry.value) ? strings(entry.value) : entry.value, at, seq: entry.seq };
  }
  return out;
}

/**
 * THE ONE WRITE PATH for a changed or removed answer (site owner, 31 Oct): the change record after
 * the person's change of one fact, as the newest change. Every "Change" control saves through this
 * (recovery.put(CASE_FILE_SECTION, "changes", ...), a touched answer from the review), and
 * materialFacts reads the record, so the change counts as a change of a confirmed fact.
 */
export function withChange(changes: unknown, fact: SlotFact, change: ChangeInput, now: Date = new Date()): FactChanges {
  const current = changesOf({ [CASE_FILE_SECTION]: { changes } });
  const seq = Math.max(0, ...Object.values(current).map((entry) => entry?.seq ?? 0)) + 1;
  return { ...current, [fact]: { ...change, at: now.toISOString(), seq } as FactChange };
}

/**
 * A later answer to a fact already under the change record, given in a form or a question (the whole
 * form, the review's "Answered here"): it is the newest answer, so it is recorded as the newest change
 * too (latest change wins). Returns the new change record, or null when the write answers no fact
 * under the record. Only the keys the write changed count (a form re-saving its other answers is no
 * answer), and "not sure" or an emptied box is no new answer.
 */
export function followAnswer(sections: Record<string, unknown>, section: string, key: string, before: unknown, after: unknown, now: Date = new Date()): FactChanges | null {
  const changes = changesOf(sections);
  if (!Object.keys(changes).length) return null;
  const keyed = ((section === "civil" || section === "small-claims") && key === "input") || (section === "builder" && key === "initialAnswers");
  const pairs: [string, unknown, unknown][] = keyed
    ? Object.keys({ ...object(before), ...object(after) }).map((id) => [id, object(before)[id], object(after)[id]])
    : section === "family" ? [[key, before, after]] : [];
  let next: FactChanges | null = null;
  for (const [id, was, given] of pairs) {
    if (JSON.stringify(was) === JSON.stringify(given) || given === "not-sure" || isUnsureAnswer(given)) continue;
    const value = Array.isArray(given) ? strings(given).filter((item) => item !== "not-sure") : given;
    if (blank(value) || !changeable(value)) continue;
    for (const fact of slotsOf(id)) if ((next ?? changes)[fact]) next = withChange(next ?? changes, fact, { state: "answered", value }, now);
  }
  return next;
}

/**
 * For a screen that still shows a fact from its own copy (the overview's amount, parties and outcome
 * read the analysis copy): the person's change of it, in words, which the screen shows instead.
 * `undefined`: not changed (the screen keeps its own); `null`: removed (the screen shows nothing).
 */
export function changedWords(file: CaseFile | null | undefined, fact: SlotFact, formatDay: (iso: string) => string = (iso) => iso): string | null | undefined {
  const slot = file?.[fact];
  if (!slot?.changed) return undefined;
  if (slot.removed || slot.state === "not-asked") return null;
  return slotText(slot, formatDay);
}

/**
 * What a screen that REPEATS AN ANSWER BACK shows for a question now ("Got it: ..." in the questions one at a
 * time, "Confirmed from my story" in the Small Claims chat): the person's latest change of the question's fact
 * (the change record, newest wins) over the screen's own copy, `own`. `{ removed: true }` when that change
 * removed it. A question that answers more than one fact keeps its own copy (no one fact speaks for it).
 * Founder's Chrome check of #536, 1 Nov: "Got it: Contract / agreement dispute." stayed after the kind was
 * changed in the review, on a reload too.
 */
export function answerNow(file: CaseFile | null | undefined, questionId: string, own: unknown): { value: unknown; changed: boolean; removed: boolean } {
  const facts = slotsOf(questionId);
  const slot = facts.length === 1 ? file?.[facts[0]] : undefined;
  if (!slot?.changed) return { value: own, changed: false, removed: false };
  if (slot.removed || slot.state !== "answered") return { value: undefined, changed: true, removed: true };
  return { value: typeof slot.value === "number" ? slotText(slot, (iso) => iso) : slot.value, changed: true, removed: false };
}

/** The kinds the case file keeps as turned down ("Not quite"), with one more. */
export function withTurnedDown(section: unknown, fact: "claimKind", value: string): Record<string, string[]> {
  const current = object(object(section).turnedDown);
  return { ...Object.fromEntries(Object.entries(current).map(([key, list]) => [key, strings(list)])), [fact]: [...new Set([...strings(current[fact]), value])] };
}

/** The catalogue kind a held claimKind slot names (an sc-claim-* id, or a one-to-one dispute category), or null. */
function heldKindId(slot: Slot): string | null {
  if (slot.state !== "answered" || typeof slot.value !== "string") return null;
  if (isKindOfClaim(slot.value)) return slot.value;
  return DISPUTE_KIND[slot.value] ?? DISPUTE_KIND[DISPUTE_CATEGORY_WORDS[slot.value] ?? ""] ?? null;
}

function applyChanges(file: CaseFile, changes: FactChanges, position: Record<string, unknown>) {
  const ordered = (Object.entries(changes) as [SlotFact, FactChange][]).sort(([, a], [, b]) => a.seq - b.seq);
  if (!ordered.length) return;
  const pickedAt = typeof position.claimKindAt === "string" ? position.claimKindAt : "";
  for (const [fact, change] of ordered) {
    // The overview's own pick of a kind, saved after this change, is the newer answer.
    if (fact === "claimKind" && pickedAt && change.at && pickedAt > change.at && file.claimKind.source?.kind === "answer" && file.claimKind.source.question === CLAIM_KIND_QUESTION) continue;
    const was = file[fact];
    if (change.state === "removed") {
      // A removed kind is never offered back as the story's or the classifier's proposal either.
      const kind = fact === "claimKind" ? heldKindId(was) ?? file.claimKindProposal?.claimTypeId ?? null : null;
      if (kind) file.claimKindRemoved = [...new Set([...(file.claimKindRemoved ?? []), kind])];
      file[fact] = { state: "not-asked", confirmed: true, removed: true, changed: true, source: { kind: "answer", question: CHANGE_QUESTION } };
    } else {
      const fresh = emptyCaseFile();
      give(fresh, fact, change.value, CHANGE_QUESTION);
      file[fact] = { ...fresh[fact], changed: true };
    }
    // Nothing older keeps the fact another way: its answers by question (the step page's dates), a
    // day not known yet, a ticked suggestion's quote, the papers named, the place married from the story.
    if (file.answers) for (const id of Object.keys(file.answers)) if (slotsOf(id).includes(fact)) delete file.answers[id];
    if (file.unsureDates && DATED.has(fact)) file.unsureDates = file.unsureDates.filter((id) => !slotsOf(id).includes(fact));
    if (fact === "claimKind") { delete file.claimKindQuote; delete file.claimKindPending; }
    if (fact === "filed" && change.state === "removed") delete file.documents;
    if (fact === "side") delete file.sideWords;
    if (fact === "married" && !(file.married.state === "answered" && file.married.value === true) && file.marriedWhere.source?.kind === "story") file.marriedWhere = { state: "not-asked", confirmed: false };
  }
  file.changedFacts = ordered.map(([fact]) => fact);
}

/** The question id the overview's "Which kind of claim is this?" list answers (saved as position.claimKind). */
export const CLAIM_KIND_QUESTION = "claim-kind";
/** A kind the site suggested and the person ticked ("That's right"): theirs from then on. */
export const CLAIM_KIND_TICKED = "claim-kind-suggestion";

/**
 * The kind of claim the analysis follows, as the analysis engine's input field: the case file's kind
 * (claimKindOf), else the one it proposes from the story (the overview then labels its cards "this
 * matches"). The one place that field is filled from, on every route (site owner, 29 Oct).
 */
export function kindForAnalysis(held: ClaimKindHeld): string | null {
  return held.claimTypeId ?? held.proposal?.claimTypeId ?? null;
}
/** The analysis input's field for a kind of claim the case file gave (kindForAnalysis), or nothing. */
export function analysisClaimType(claimTypeId: string | null): { confirmedClaimTypeId?: string } {
  return claimTypeId ? { confirmedClaimTypeId: claimTypeId } : {};
}

/** The patch that keeps the person's pick from the overview's list with the saved case (read first by caseFileOf). */
export function claimKindAnswer(value: string): { claimKind: string } {
  return { claimKind: value };
}

/**
 * Where the kind of claim the file holds came from (site owner, 29 Oct: "one fact with a source"):
 *   person-said    their own answer ("What kind of dispute is this?", the overview's list, a form);
 *   confirmed      a kind the site suggested from the story, ticked by the person;
 *   route-implied  the issues they picked on an area's form (Family, civil), which choose the route.
 * A kind read from the story, or by the classifier, and not ticked is a `proposal`, never the fact.
 */
export type ClaimKindSource = "person-said" | "confirmed" | "route-implied";
export type ClaimKindHeld = {
  /** The claimKind slot's state: answered, unsure ("not sure"), or not asked. */
  state: SlotState;
  /** The catalogue's kind of claim (an sc-claim-* id) the answer names, or null (a kind in words only). */
  claimTypeId: string | null;
  /** What every screen shows for it: the person's words, or the catalogue's name for a kind they picked. */
  words: string | null;
  source: ClaimKindSource | null;
  /** The question the answer was given to (CLAIM_KIND_QUESTION for the overview's list), or null. */
  askedBy: string | null;
  /** For a suggestion the person ticked: the story's words it was shown with (checked to be in the story), else null. */
  quote: string | null;
  /** A kind made by the site and not ticked: offered with the story's words, never counted as held. */
  proposal: { claimTypeId: string; words: string; quote: string } | null;
};

/**
 * Answers to "What kind of dispute is this?" that name exactly one kind of claim in the catalogue,
 * so the claim's own checklists can follow the answer. Only a one-to-one name: "Property damage"
 * or "A vehicle-related dispute" cover several kinds and stay words (the person picks the kind).
 */
const DISPUTE_KIND: Record<string, string> = {
  defamation: "sc-claim-defamation-libel-slander",
  [DISPUTE_CATEGORY_WORDS.defamation]: "sc-claim-defamation-libel-slander",
};

const kindName = (id: string) => CLAIM_TYPES.find((claimType) => claimType.id === id)?.name ?? null;

/**
 * THE KIND OF CLAIM, AS THE CASE FILE HOLDS IT: every screen, card, checklist and AI prompt that
 * needs the kind of claim reads it here (site owner, 29 Oct). A separate "confirmed" flag never
 * blocks it: the person's own answer counts as soon as it is given.
 */
export function claimKindOf(file: CaseFile, listWords: (codes: string[]) => string = (codes) => codes.join(", ")): ClaimKindHeld {
  const slot = file.claimKind;
  const question = slot.source?.kind === "answer" ? slot.source.question : "";
  const source: ClaimKindSource | null = slot.state === "not-asked" ? null : question === CLAIM_KIND_TICKED ? "confirmed" : /^(?:civil|family):issues$/.test(question) ? "route-implied" : "person-said";
  let claimTypeId: string | null = null;
  let words: string | null = null;
  if (slot.state === "answered") {
    const value = slot.value;
    if (typeof value === "string" && isKindOfClaim(value)) {
      claimTypeId = kindName(value) ? value : null;
      words = kindName(value) ?? value;
    } else if (typeof value === "string" && value.trim()) {
      words = DISPUTE_CATEGORY_WORDS[value] ?? value.trim();
      claimTypeId = DISPUTE_KIND[value] ?? DISPUTE_KIND[words] ?? null;
    } else if (Array.isArray(value) && value.length) {
      words = listWords(value.filter((item): item is string => typeof item === "string"));
    }
  }
  const story = storyOfFile(file);
  // A ticked suggestion keeps the story's words it was shown with, as its source (checked to be in the story).
  const tickedKind = source === "confirmed" && claimTypeId ? CLAIM_TYPES.find((claimType) => claimType.id === claimTypeId) : undefined;
  const quote = tickedKind ? (file.claimKindQuote ? wordsInStory(story, file.claimKindQuote) : null) ?? storyQuoteFor(story, tickedKind) : null;
  // A proposal is offered only while nothing is held: it never covers the person's answer (rule 4).
  let proposal: ClaimKindHeld["proposal"] = null;
  // A kind the person turned down ("Not quite") or removed is never proposed again (rule 6, 31 Oct).
  const removed = new Set(file.claimKindRemoved ?? []);
  if (slot.state === "not-asked" && (file.area === "small-claims" || file.area === undefined)) {
    const stored = file.claimKindProposal;
    const name = stored ? kindName(stored.claimTypeId) : null;
    if (stored && removed.has(stored.claimTypeId)) {
      // Turned down: nothing is proposed in its place from the same story.
    } else if (stored && name) {
      const kind = CLAIM_TYPES.find((claimType) => claimType.id === stored.claimTypeId)!;
      // The story's own words for it: the words recorded with it, checked to be in the story, or its signal phrase.
      const quote = (stored.quote ? wordsInStory(story, stored.quote) : null) ?? storyQuoteFor(story, kind);
      if (quote) proposal = { claimTypeId: stored.claimTypeId, words: name, quote };
    } else if (!stored && story.trim()) {
      const read = kindFromStory(story, CLAIM_TYPES);
      if (read && !removed.has(read.claimType.id)) proposal = { claimTypeId: read.claimType.id, words: read.claimType.name, quote: read.quote };
    }
  }
  return { state: slot.state, claimTypeId, words, source, askedBy: question || null, quote, proposal };
}

/** The story the case file holds: the checkpoint's, else (an older saved case) the story it saved. */
export function storyOfFile(file: CaseFile): string {
  return file.story?.trim() ? file.story : file.savedStory ?? "";
}

/**
 * The Form 7A draft's fields, from the case file only (site owner, 30 Oct: the section is drawn on
 * every Small Claims route, never from one route's own copy): the story, and the amount and what they
 * want as the case file words them (slotText). Party names and addresses are never filled in here:
 * the person types them in the section, so an empty one stays empty and the draft says "[... to be
 * confirmed]".
 */
export function form7ADraftFields(file: CaseFile, formatDay: (iso: string) => string): StatementOfClaimDraftInput {
  const said = (fact: "amount" | "wants") => (file[fact].state === "answered" ? slotText(file[fact], formatDay) : "");
  return { yourName: "", yourAddress: "", otherParty: "", defendantAddress: "", amountClaimed: said("amount"), facts: storyOfFile(file), timeline: "", goal: said("wants") };
}

/**
 * The one line every screen shows for the kind of claim (the overview, the case file panel, the
 * Form 7A section): its label by source, the words, the catalogue kind its checklists follow, and
 * whether it is held (the person's) or only proposed. Null when there is neither: the screen asks.
 */
export function claimKindLine(held: ClaimKindHeld): { label: string; words: string; claimTypeId: string | null; quote: string | null; held: boolean } | null {
  if (held.state === "answered" && held.words) {
    const label = held.askedBy === CLAIM_KIND_QUESTION ? "Kind of claim you chose" : held.source === "confirmed" ? "Kind of claim you confirmed" : held.source === "route-implied" ? "Kind of dispute (from what you picked)" : "Kind of dispute (your answer)";
    return { label, words: held.words, claimTypeId: held.claimTypeId, quote: held.quote, held: true };
  }
  if (held.proposal) return { label: "Kind of claim this matches", words: held.proposal.words, claimTypeId: held.proposal.claimTypeId, quote: held.proposal.quote, held: false };
  return null;
}

/** Whether a question would ask for something the file already holds (an answer, or "not sure"). */
export function alreadyAsked(file: CaseFile, questionId: string, surface?: string): boolean {
  return slotsOf(questionId, surface).some((fact) => !notAsked(file[fact]));
}

/** Not asked yet: no answer, no "not sure", and not removed by the person (a removed answer is not asked again by itself). */
export const notAsked = (slot: Slot) => slot.state === "not-asked" && !slot.removed;

/**
 * THE ONE GATE. Of a screen's questions, in its order, the first whose facts the file
 * does not hold yet; null when none. A fact held answered OR unsure ("I don't know", "not
 * sure", a skip) is never asked again, on any screen and at no point (site owner, 31 Oct:
 * there is no "offered once more at the end"). A question that asks for no slot is the
 * screen's own.
 */
export function nextQuestion(file: CaseFile, candidates: readonly string[], options: { surface?: string } = {}): string | null {
  for (const id of candidates) {
    const facts = slotsOf(id, options.surface);
    if (!facts.length) return id;
    if (facts.every((fact) => notAsked(file[fact]))) return id;
  }
  return null;
}

/** The questions of a list the file still lets this screen ask (the gate, for screens that show several at once). */
export function askable(file: CaseFile, candidates: readonly string[], surface?: string): string[] {
  return candidates.filter((id) => nextQuestion(file, [id], { surface }) === id);
}

/**
 * THE GATE FOR EVERY CHAT (never ask twice, row 1, 29 Oct). A chat question is asked only when the
 * one gate lets it: a fact the file holds, answered or "not sure", is not asked by a chat, nor offered
 * as the story's suggestion (site owner, 31 Oct: a not-sure fact is asked nowhere again; screens show
 * it as "Not answered yet: add it when you know"). No file: nothing held.
 */
export function chatMayAsk(file: CaseFile | null | undefined, questionId: string): boolean {
  return !file || nextQuestion(file, [questionId]) === questionId;
}

/**
 * What a chat asks for one of its question sentences: the sentence, when the gate lets its fact be
 * asked; its open part (what the case file does not hold) when the fact is held; null when nothing
 * is left (factsOfQuestion.ts CHAT_QUESTIONS; row 1 review, 29 Oct: a compound question was dropped
 * whole once its fact was held, so when they first found out was never asked).
 */
export function chatQuestionToAsk(file: CaseFile | null | undefined, words: string, conversation: readonly ChatTurn[] = []): string | null {
  const question = chatQuestionOf(words);
  if (chatMayAsk(file, question.asks) && !askedAndReplied(conversation, words)) return words;
  return question.open && !askedAndReplied(conversation, question.open) ? question.open : null;
}

/** One turn of a chat's own conversation: the chat's message (with its question id, where it has one) or the person's. */
export type ChatTurn = { role: string; text: string; questionId?: string };

/**
 * THE CONVERSATION CHECK (site owner, 29 Oct; CI story pack m19-laptop-repair: the follow-up chat
 * asked "What proof do you already have...?", the person replied, and a later reply asked it again).
 * Whether this chat already asked the question in this conversation and the person replied after
 * it: by its question id where it has one (a turn's questionId, or the chat id its words ask by, so
 * the same fact in other words counts), else by its exact words. Asked and not replied to (nothing
 * from the person after it), it may be asked again. A person's reply is not saved to the case file,
 * so the case file cannot know; every chat checks its own conversation with this.
 */
export function askedAndReplied(conversation: readonly ChatTurn[], words: string): boolean {
  if (!conversation.length) return false;
  const key = chatQuestionOf(words).asks;
  const shown = [...new Set([words, ...chatSentencesFor(key)])].map((item) => item.trim().toLowerCase()).filter(Boolean);
  return conversation.some((turn, index) =>
    turn.role === "assistant" &&
    (turn.questionId === words || turn.questionId === key || shown.some((item) => turn.text.toLowerCase().includes(item))) &&
    conversation.slice(index + 1).some((later) => later.role === "user"),
  );
}

/** The case file section after the person answers "not sure" to a question: each of its facts kept as unsure. */
export function withUnsure(section: Record<string, unknown> | undefined, questionId: string, surface?: string): Record<string, unknown> {
  const current = object(section);
  const kept = { ...object(current.unsure) };
  for (const fact of slotsOf(questionId, surface)) kept[fact] = { question: questionId };
  return { ...current, unsure: kept };
}

/**
 * The case file section after the person answered a question in the review: recorded in the saved case,
 * so the review shows it answered, in its place, after a reload and in any tab (fault 1, 31 Oct).
 */
export function withAnsweredInReview(section: Record<string, unknown> | undefined, questionId: string): Record<string, unknown> {
  const current = object(section);
  return { ...current, answeredInReview: [...new Set([...strings(current.answeredInReview), questionId])] };
}

/** The slots a review box or question holds (its facts that are slots). */
export function slotsOfQuestion(questionId: string, surface?: string): SlotFact[] {
  return slotsOf(questionId, surface);
}

/** A slot's value in plain words, as the person gave it: a day as the court writes it, Yes or No, a list joined. */
export function slotText(slot: Slot, formatDay: (iso: string) => string): string {
  // A rough time given ("July 2026", "last summer") is shown as given: the day is what is not known yet
  // (#477 re-test, item 6: "When it happened" showed "Not sure yet" after a date was given).
  if (slot.state === "unsure") return typeof slot.value === "string" && slot.value.trim() && !isUnsureAnswer(slot.value) ? `${slot.value.trim()} (day not given yet)` : "Not sure yet";
  const value = slot.value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  // An amount as a court form writes it: "$2,500.00" (#477 re-test: "twenty five hundred").
  if (typeof value === "number") return `$${value.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  // A conference date of no named kind; one whose kind is known goes to that conference's question only (conferenceQuestions).
  conferenceDate: ["sc-date-settlement-conference", "case-date-case-conference-date"],
  courtDate: ["case-date-trial-date"],
};

/** Date questions that ask for the same moment under different ids (the Small Claims and the civil step maps). */
const SAME_MOMENT: readonly (readonly string[])[] = [
  ["sc-date-defence-filed", "case-date-own-defence-delivered"],
];

/** The step page's date questions for each day the person said they do not know: never asked again, shown folded as "Not answered yet: add it when you know" with "Add it" (StageAnswerPanel laterDates; site owner, 31 Oct). */
export function unsureDateQuestions(file: CaseFile): string[] {
  const ids: Record<string, readonly string[]> = {
    servedDate: ["sc-date-claim-served", "sc-date-defendants-claim-served", "case-date-served-with-application", "case-date-served-with-motion-to-change"],
    whenHappened: DATE_QUESTIONS_OF.whenHappened ?? [],
    conferenceDate: DATE_QUESTIONS_OF.conferenceDate ?? [],
    courtDate: DATE_QUESTIONS_OF.courtDate ?? [],
  };
  return [...new Set([...Object.entries(ids).flatMap(([fact, list]) => (file[fact as SlotFact].state === "unsure" ? [...list] : [])), ...(file.unsureDates ?? [])])];
}

/**
 * Each conference's date questions on the step page, by the conference's name as the deadline
 * events name it (deadlineEvents.ts). Conference audit, 2026-10-26: every conference date was one
 * "Conference date", so a trial management conference's day answered the case conference question.
 */
const CONFERENCE_QUESTIONS: readonly { kind: string; ids: readonly string[]; words: RegExp }[] = [
  { kind: "Trial management conference", ids: ["case-date-trial-management-conference-date"], words: /\btrial management conference\b/i },
  { kind: "Pre-trial conference", ids: ["case-date-pre-trial-conference-date"], words: /\bpre-?trial conference\b/i },
  { kind: "Settlement conference", ids: ["sc-date-settlement-conference", "case-date-family-settlement-conference-date"], words: /\bsettlement conference\b/i },
  { kind: "Case conference", ids: ["case-date-case-conference-date"], words: /\bcase conference\b/i },
];

/** Which conference a conference date is for: by the question answered, else by the words quoted. Null when not said. */
export function conferenceKind(slot: Slot): string | null {
  const source = slot.source;
  if (!source) return null;
  const words = source.kind === "answer" ? (typeof slot.value === "string" ? slot.value : "") : source.quote;
  if (source.kind === "answer") {
    const id = source.question.replace(/^[a-z-]+:/, "");
    const asked = CONFERENCE_QUESTIONS.find((entry) => entry.ids.includes(id));
    if (asked) return asked.kind;
  }
  // Otherwise the conference the words name ("Case conference on November 16, 2026").
  return CONFERENCE_QUESTIONS.find((entry) => entry.words.test(words))?.kind ?? null;
}

/** The step page's questions a conference date answers: its own conference's, else the unnamed default. */
function conferenceQuestions(slot: Slot, court: string): readonly string[] {
  const kind = conferenceKind(slot);
  const named = CONFERENCE_QUESTIONS.find((entry) => entry.kind === kind)?.ids;
  // Each named conference's questions, for this court's map only (a family settlement conference
  // never answers the Small Claims question); one of no named kind, the court's own default.
  const ownCourt = (id: string) => (court === "small-claims" ? id.startsWith("sc-") : court ? !id.startsWith("sc-") : true);
  return (named ?? DATE_QUESTIONS_OF.conferenceDate ?? []).filter(ownCourt);
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
    if (day) for (const id of fact === "conferenceDate" ? conferenceQuestions(file[fact], typeof file.court.value === "string" ? file.court.value : "") : ids) if (!out[id]) out[id] = day;
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
