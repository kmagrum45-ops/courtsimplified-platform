/**
 * Where a case is, as the USER confirmed it, and the dates that set its
 * deadlines. Stored on the case as `master_result.position`.
 *
 * *** WHY THIS EXISTS (2026-10-04) ***
 *
 * The stage a user confirmed in the builder lived only in that page's memory.
 * Leaving the page lost it, so the case page could not say where the case was
 * or what came next, and a returning user was asked again. The exact step they
 * picked in the stage-answer panel was lost the same way, and the dates that
 * turn a period ("20 days after you were served") into a date ("by Monday
 * 26 October") were never asked anywhere, so the deadline engine — which can
 * do that arithmetic, with its working shown — had no input on any page.
 *
 * *** WHAT IS STORED, AND WHAT IS NOT ***
 *
 * Only what the user chose or typed: the broad stage they confirmed, the exact
 * step they picked, and dates they entered. Nothing here is a model's guess.
 * Every value is checked against the fixed vocabularies before it is kept:
 * a stage not in the list, a step from another court, a date question that
 * does not exist or a date that is not a real date is dropped, never stored.
 *
 * Pure: no I/O. The route that writes it is app/api/cases/position.
 */

import {
  DEADLINE_EVENTS,
  parseUserDate,
  type DeadlineEventKey,
} from "./deadlines/deadlineEvents";
import { findStage, isSpecialStage, pathwayOf, type StagePathway } from "./stage-map/stageMap";
import { isInScope } from "./policy/a2iScope";

/** The broad stages the builder's confirmation offers. Mirrors UniversalStage. */
export const CONFIRMABLE_STAGES = [
  "starting-case",
  "responding",
  "already-started",
  "conference",
  "motion",
  "trial",
  "enforcement",
  "urgent",
  "not-sure",
] as const;

export type ConfirmableStage = (typeof CONFIRMABLE_STAGES)[number];

export type CasePosition = {
  confirmedStage: ConfirmableStage | null;
  confirmedStageAt: string | null;
  /** A stage-map id ("defendant:served-defence-period-running"), chosen by the user. */
  stepId: string | null;
  stepChosenAt: string | null;
  /** Keyed by date-question id (e.g. "sc-date-claim-served"); ISO dates only. */
  dateAnswers: Record<string, string>;
};

export const EMPTY_POSITION: CasePosition = {
  confirmedStage: null,
  confirmedStageAt: null,
  stepId: null,
  stepChosenAt: null,
  dateAnswers: {},
};

/** Every date question we ask, by id, with the deadline events it sets. */
const DATE_QUESTIONS: Map<string, { question: string; events: DeadlineEventKey[] }> = (() => {
  const map = new Map<string, { question: string; events: DeadlineEventKey[] }>();
  for (const event of Object.values(DEADLINE_EVENTS)) {
    if (!event.questionId || !event.question) continue;
    const existing = map.get(event.questionId);
    if (existing) existing.events.push(event.key);
    else map.set(event.questionId, { question: event.question, events: [event.key] });
  }
  return map;
})();

export function isDateQuestionId(id: string): boolean {
  return DATE_QUESTIONS.has(id);
}

/** Every date question, id and wording (the case reader is told which dates it may report). */
export function allDateQuestions(): { id: string; question: string }[] {
  return [...DATE_QUESTIONS.entries()].map(([id, entry]) => ({ id, question: entry.question }));
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const isConfirmable = (value: unknown): value is ConfirmableStage =>
  typeof value === "string" && (CONFIRMABLE_STAGES as readonly string[]).includes(value);

/** A step is kept only if it exists, is a real position, and belongs to this case's court. */
export function isStepForCourt(stepId: unknown, courtPath: string | null | undefined): stepId is string {
  if (typeof stepId !== "string") return false;
  const stage = findStage(stepId);
  if (!stage || isSpecialStage(stepId)) return false;
  return pathwayOf(stage) === courtPath;
}

/** Reads the stored position, discarding anything that no longer validates. */
export function readCasePosition(masterResult: unknown, courtPath?: string | null): CasePosition {
  const raw = asRecord(asRecord(masterResult).position);
  const dateAnswers: Record<string, string> = {};
  for (const [key, value] of Object.entries(asRecord(raw.dateAnswers))) {
    if (isDateQuestionId(key) && typeof value === "string" && parseUserDate(value)) dateAnswers[key] = value;
  }
  const stepValid = courtPath === undefined ? typeof raw.stepId === "string" && Boolean(findStage(raw.stepId)) : isStepForCourt(raw.stepId, courtPath);
  return {
    confirmedStage: isConfirmable(raw.confirmedStage) ? raw.confirmedStage : null,
    confirmedStageAt: typeof raw.confirmedStageAt === "string" ? raw.confirmedStageAt : null,
    stepId: stepValid ? (raw.stepId as string) : null,
    stepChosenAt: stepValid && typeof raw.stepChosenAt === "string" ? raw.stepChosenAt : null,
    dateAnswers,
  };
}

export type PositionPatch = {
  confirmedStage?: unknown;
  stepId?: unknown;
  /** A value of "" removes that answer. */
  dateAnswers?: unknown;
};

export type PositionPatchResult =
  | { ok: true; position: CasePosition }
  | { ok: false; error: string };

/**
 * Applies a user's change to the stored position. Refuses the whole patch on
 * any invalid part, so a client bug cannot store half of what it meant.
 */
export function applyPositionPatch(
  current: CasePosition,
  patch: PositionPatch,
  courtPath: string | null | undefined,
  now: Date,
): PositionPatchResult {
  const next: CasePosition = { ...current, dateAnswers: { ...current.dateAnswers } };
  const stamp = now.toISOString();

  if (patch.confirmedStage !== undefined) {
    if (!isConfirmable(patch.confirmedStage)) return { ok: false, error: "Unknown stage." };
    if (patch.confirmedStage !== current.confirmedStage) {
      next.confirmedStage = patch.confirmedStage;
      next.confirmedStageAt = stamp;
    }
  }

  if (patch.stepId !== undefined) {
    if (patch.stepId === null || patch.stepId === "") {
      next.stepId = null;
      next.stepChosenAt = null;
    } else if (!isStepForCourt(patch.stepId, courtPath)) {
      return { ok: false, error: "That step is not one of this court's steps." };
    } else if (patch.stepId !== current.stepId) {
      next.stepId = patch.stepId;
      next.stepChosenAt = stamp;
    }
  }

  if (patch.dateAnswers !== undefined) {
    const answers = asRecord(patch.dateAnswers);
    if (Object.keys(answers).length > 20) return { ok: false, error: "Too many dates." };
    for (const [key, value] of Object.entries(answers)) {
      if (!isDateQuestionId(key)) return { ok: false, error: `Unknown date question: ${key}` };
      if (value === "" || value === null) {
        delete next.dateAnswers[key];
        continue;
      }
      if (typeof value !== "string" || value.length > 32 || !parseUserDate(value)) {
        return { ok: false, error: "A date could not be read. Use the date picker." };
      }
      next.dateAnswers[key] = parseUserDate(value) as string;
    }
  }

  return { ok: true, position: next };
}

export type DateQuestion = {
  id: string;
  question: string;
  /** The deadlines at this step that this date sets, in plain words. */
  sets: string[];
};

/** The date questions that set a deadline at this step. Empty where none is asked. */
export function dateQuestionsForStep(stepId: string | null | undefined): DateQuestion[] {
  const stage = stepId ? findStage(stepId) : undefined;
  if (!stage) return [];
  const byId = new Map<string, DateQuestion>();
  for (const deadline of stage.deadlines) {
    if (deadline.length.count === 0) continue;
    // The two-year limit is counted from an injury date under the Act's
    // presumption (computedDeadline.ts), so the injury date is asked for it.
    // An injury step (notice, slip and fall) asks the injury date once for
    // both; any other step asks for the day the claim is based on (page
    // review, 2026-10-07: a debt claimant was asked about an injury).
    const injuryStep = stage.deadlines.some((other) => other.countFromEvent === "injury-occurred");
    const countFrom =
      deadline.countFromEvent === "claim-discovered" && isInScope("caseSpecificDeadlines")
        ? injuryStep
          ? "injury-occurred"
          : "act-or-omission"
        : deadline.countFromEvent;
    const event = DEADLINE_EVENTS[countFrom as keyof typeof DEADLINE_EVENTS] as
      | { questionId?: string; question: string | null }
      | undefined;
    if (!event?.questionId || !event.question) continue;
    const entry = byId.get(event.questionId) ?? { id: event.questionId, question: event.question, sets: [] };
    if (!entry.sets.includes(deadline.what)) entry.sets.push(deadline.what);
    byId.set(event.questionId, entry);
  }
  return [...byId.values()];
}

/**
 * Dates the user already recorded on their timeline, offered as answers to
 * the date questions. A SUGGESTION: shown beside the field with where it came
 * from, and used only once the user saves it (CLAUDE.md section 4).
 *
 * Only exact dates the user picked from a calendar qualify; a date in their
 * own words ("early March") is a recollection and never becomes a deadline's
 * starting point. Each mapping is the same moment named twice, never an
 * inference: being served is being served.
 */
export const EVENT_TO_DATE_QUESTION: Record<string, string> = {
  "claim-served": "sc-date-claim-served",
  "defence-filed": "sc-date-defence-filed",
};

export type SuggestedDate = {
  value: string;
  basis: string;
  /** The person gave a month and day but no year: the card asks them which year (StageAnswerPanel yearChoices). */
  yearAssumed?: boolean;
};

export function suggestedDatesFromEvents(
  events: ReadonlyArray<{
    event_type: string;
    title: string;
    occurred_at_normalized: string | null;
    date_certainty: string;
  }>,
): Record<string, SuggestedDate> {
  const suggestions: Record<string, SuggestedDate> = {};
  for (const event of events) {
    const questionId = EVENT_TO_DATE_QUESTION[event.event_type];
    if (!questionId || event.date_certainty !== "exact" || !event.occurred_at_normalized) continue;
    const value = parseUserDate(event.occurred_at_normalized);
    if (!value || suggestions[questionId]) continue;
    suggestions[questionId] = { value, basis: `From your timeline: “${event.title}”` };
  }
  return suggestions;
}

export function courtPathAsPathway(courtPath: string | null | undefined): StagePathway | null {
  return courtPath === "small-claims" || courtPath === "civil" || courtPath === "family" ? courtPath : null;
}

/**
 * Where the user's own story mentions the moment a date question asks about,
 * quoted back beside that question so they do not have to remember what they
 * wrote ("read what they told us, fill in what it answers" — site owner,
 * 2026-10-04).
 *
 * A date is offered only when the sentence gives a complete one, year
 * included. "The papers came on September 25" is quoted as a reminder and
 * nothing is filled in: choosing the year would be the site guessing a fact
 * that a deadline is then counted from, the very conversion the events route
 * refuses to make (app/api/cases/events). Either way the user confirms.
 */
const STORY_CUES: Record<string, RegExp> = {
  "sc-date-claim-served": /\b(served|papers (?:came|arrived)|got the (?:papers|claim)|received the (?:papers|claim)|handed (?:me )?the (?:papers|claim))\b/i,
  "sc-date-claim-issued": /\b(issued|filed (?:my|the|a) (?:claim|plaintiff'?s claim))\b/i,
  "sc-date-defence-filed": /\bfiled (?:my|a|the|our) defen[cs]e\b/i,
  "sc-date-settlement-conference": /\bsettlement conference\b/i,
  "sc-date-injury": /\b(hurt|injur(?:ed|y)|fell|slipped|tripped|bitten|bit|attacked|hit by|accident|crash(?:ed)?)\b/i,
  // The day a non-injury claim is based on (2026-10-07).
  "case-date-act-or-omission": /\b(invoice|never paid|stopped paying|(?:refused|won'?t|wont|didn'?t) (?:to )?pay|stopped (?:showing up|coming|work)|last day|was due|due date|bounced|fired|let me go|let go|terminated|dismissed me|laid (?:me )?off)\b/i,
  // Civil and family (2026-10-05). Each names the document or event the date
  // question asks about, so the quote beside the question is about that.
  "case-date-served-with-application": /\b(served|got|received)\b.*\bapplication\b/i,
  "case-date-served-with-motion-to-change": /\bmotion to change\b/i,
  "case-date-case-conference-date": /\bcase conference\b/i,
  "case-date-family-settlement-conference-date": /\bsettlement conference\b/i,
  "case-date-trial-management-conference-date": /\btrial management conference\b/i,
  "case-date-trial-date": /\btrial\b/i,
  "case-date-motion-hearing-date": /\bmotion\b.*\b(heard|hearing|scheduled|date)\b/i,
  "case-date-served-with-notice-of-appeal": /\bnotice of appeal\b/i,
  "case-date-order-made": /\b(judge|court) (?:made|gave|issued) (?:an |a |the )?order\b|\border was made\b/i,
  "case-date-defence-served": /\bstatement of defen[cs]e\b/i,
  "case-date-served-with-request-to-admit": /\brequest to admit\b/i,
  "case-date-mediation-session-date": /\bmediation\b/i,
};

const MONTH = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const FULL_DATE = new RegExp(
  `\\b(\\d{4}-\\d{1,2}-\\d{1,2}|\\d{1,2}(?:st|nd|rd|th)? ${MONTH},? \\d{4}|${MONTH} \\d{1,2}(?:st|nd|rd|th)?,? \\d{4})\\b`,
  "i",
);

const MENTIONS_DATE = new RegExp(`\\b${MONTH}\\b|\\b\\d{1,2}[/-]\\d{1,2}\\b|\\b\\d{4}-\\d{1,2}-\\d{1,2}\\b`, "i");

/**
 * Dates the person already gave in the guided intake, offered -- never
 * applied -- for the same date question on the next-steps panel. Live test,
 * 2026-10-06: the injury date was confirmed in the intake and the panel asked
 * for it again. Only a full date in the answer counts; "last March" offers
 * nothing.
 */
export function suggestedDatesFromAnswers(
  answers: ReadonlyArray<{ questionId: string; answerText: string }>,
  now: Date = new Date(),
): Record<string, SuggestedDate> {
  const suggestions: Record<string, SuggestedDate> = {};
  for (const answer of answers) {
    if (!isDateQuestionId(answer.questionId) || suggestions[answer.questionId]) continue;
    const match = FULL_DATE.exec(answer.answerText);
    const full = match ? parseUserDate(match[1].replace(/,/g, "")) : null;
    // "October 1" with no year (walkthrough, 2026-10-08: a tenant confirmed
    // October 1 service and was asked for the date again): offered with the
    // card asks which year it was, and nothing is used until they choose.
    const assumed = full ? null : assumedYearDate(answer.answerText, now, UPCOMING_QUESTIONS.has(answer.questionId));
    const value = full ?? assumed;
    if (!value) continue;
    const quoted = answer.answerText.trim().slice(0, 120);
    suggestions[answer.questionId] = {
      value,
      basis: `You answered: “${quoted}”`,
      ...(assumed ? { yearAssumed: true } : {}),
    };
    // For an injury claim the day of the injury IS the day the claim is
    // based on: one answer, offered for both questions (2026-10-07).
    if (answer.questionId === "sc-date-injury" && !suggestions["case-date-act-or-omission"]) {
      suggestions["case-date-act-or-omission"] = { ...suggestions[answer.questionId] };
    }
  }
  return suggestions;
}

export type StoryHint = {
  quote: string;
  value: string | null;
  /** True when the story gave a month and day but no year, and the most recent such date was assumed. */
  yearAssumed?: boolean;
};

const MONTH_DAY = new RegExp(`\\b(${MONTH}) (\\d{1,2})(?:st|nd|rd|th)?\\b|\\b(\\d{1,2})(?:st|nd|rd|th)? (${MONTH})\\b`, "i");

/**
 * The date questions about something still to come: a conference, a trial, a
 * hearing. A month and day with no year in a story about one of these is the
 * NEXT such date, not the last. Walkthrough, 2026-10-08: "a case conference on
 * November 20", told in October 2026, was read as 20 November 2025, and the
 * card said its deadline had already passed.
 */
const UPCOMING_QUESTIONS = new Set([
  "sc-date-settlement-conference",
  "case-date-case-conference-date",
  "case-date-family-settlement-conference-date",
  "case-date-trial-management-conference-date",
  "case-date-trial-date",
  "case-date-motion-hearing-date",
  "case-date-mediation-session-date",
]);

/**
 * "September 20" with no year: the most recent September 20 on or before
 * today, or, for an upcoming event, the next one on or after today. Page
 * review, 2026-10-06: every served person's story gave the day ("I was served
 * on September 20") and no page worked out their deadline, because the story
 * hint offered a date only when the year was written. The assumption is shown
 * with the suggestion, and nothing is used until the user chooses it
 * (CLAUDE.md section 4).
 */
function assumedYearDate(sentence: string, now: Date, upcoming: boolean): string | null {
  const match = MONTH_DAY.exec(sentence);
  if (!match) return null;
  const month = (match[1] ?? match[4]) as string;
  const day = (match[2] ?? match[3]) as string;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const years = upcoming ? [now.getFullYear(), now.getFullYear() + 1] : [now.getFullYear(), now.getFullYear() - 1];
  for (const year of years) {
    const value = parseUserDate(`${month} ${day} ${year}`);
    if (value && (upcoming ? value >= today : value <= today)) return value;
  }
  return null;
}

/*
 * Every date question gets a cue, not only the hand-written ones above
 * (held-back walkthrough, 2026-10-09: "on september 25 2026 his lawyer served
 * me with a statement of defence and counterclaim" and the page still asked
 * "what date was it served?", because no cue existed for that question). The
 * generic cue is built from the question's own words: the document or event
 * it names ("garnishment", "crossclaim", "questioning") and, for a served,
 * filed or issued question, that verb.
 */
const EXTRA_CUES: Record<string, RegExp> = {
  "sc-date-defendants-claim-served": /\b(defendant'?s claim|counter-?claim|suing me back|sued me back)\b/i,
  "sc-date-learned-of-default": /\b(noted in default|in default)\b/i,
  "sc-date-learned-of-judgment": /\b(default judgment|judgment (?:against me|was made))\b/i,
  "case-date-served-with-crossclaim": /\bcross-?claim\b/i,
  "case-date-served-with-third-party-claim": /\bthird[- ]party claim\b/i,
  "case-date-pre-trial-conference-date": /\bpre-?trial\b/i,
  "case-date-motion-form-served": /\b(?:form 14b|motion form)\b/i,
  "case-date-own-defence-delivered": /\b(?:filed|served|delivered) (?:my|our) (?:statement of )?defen[cs]e\b/i,
};

const SKIP_WORDS = new Set(["notice", "statement", "order", "court", "served", "scheduled", "record", "date", "first", "material", "materials", "other", "party", "parties", "action", "about", "their", "there", "which", "where", "given"]);
const VERBS: Array<[RegExp, RegExp]> = [
  [/\bserved\b/i, /\b(serv(?:ed|e)|got|received|handed|gave me|delivered)\b/i],
  [/\bfiled\b/i, /\bfiled\b/i],
  [/\bissued\b/i, /\b(issued|dated)\b/i],
];

type Cue = { key: RegExp; verb?: RegExp };

function genericCue(question: string): Cue | null {
  const head = question.split("?")[0].replace(/,? what date.*$/i, "");
  const noun =
    /served with (?:an? |the )?(.+?)$/i.exec(head)?.[1] ??
    /^If (?:an? |the )?(.+?) (?:was|were|has been|have been|is|asked|made|issued)\b/i.exec(head)?.[1] ??
    "";
  const words = noun
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .split(/[^a-z']+/)
    .filter((word) => word.length >= 5 && !SKIP_WORDS.has(word))
    .map((word) => word.replace(/'s$/, "").replace(/(?:ing|ed|s)$/, "").slice(0, 8));
  if (!words.length) return null;
  // Every naming word must be there: "notice of default hearing" is not any hearing.
  const key = new RegExp(words.map((word) => `(?=[\\s\\S]*\\b${word})`).join(""), "i");
  const verb = VERBS.find(([inQuestion]) => inQuestion.test(head))?.[1];
  return { key, ...(verb ? { verb } : {}) };
}

/** The cue for each date question: its written one, else one built from its wording. */
function cueFor(questionId: string, question: string): Cue | null {
  const written = STORY_CUES[questionId] ?? EXTRA_CUES[questionId];
  return written ? { key: written } : genericCue(question);
}

const DATE_ANYWHERE = new RegExp(`${FULL_DATE.source}|${MONTH_DAY.source}`, "gi");
/*
 * Words naming a different KIND of moment. Between a served question's words
 * and its date, "filed" or "hearing" means the date belongs to something else;
 * "got" or "received" is the same moment told differently.
 */
const MOMENT_WORDS: Record<string, RegExp> = {
  served: /\b(filed|issued|hearing|conference|trial|mediation|scheduled|questioning)\b/i,
  filed: /\b(served|got|received|issued|hearing|conference|trial|mediation|scheduled)\b/i,
  issued: /\b(served|got|received|filed|hearing|conference|trial|mediation|scheduled)\b/i,
  upcoming: /\b(served|filed|issued|received|got)\b/i,
  other: /\b(served|filed|issued|hearing|conference|trial|mediation|scheduled)\b/i,
};

function momentOf(questionId: string, question: string): keyof typeof MOMENT_WORDS {
  if (UPCOMING_QUESTIONS.has(questionId) || /scheduled|will it be heard|first day of trial/i.test(question)) return "upcoming";
  if (/\bserved\b|\bdeliver/i.test(question)) return "served";
  if (/\bfiled\b/i.test(question)) return "filed";
  if (/\bissued\b|date is on it/i.test(question)) return "issued";
  return "other";
}

function cueMatches(cue: Cue, text: string): boolean {
  return cue.key.test(text) && (!cue.verb || cue.verb.test(text));
}

/** Where the cue's own words sit in the text: the verb if it has one, else the first naming word it matches. */
function cuePositions(cue: Cue, text: string): number[] {
  const source = cue.verb ?? cue.key;
  if (source.source.startsWith("(?=")) {
    const first = /\\b([a-z']+)\)/i.exec(source.source)?.[1];
    if (!first) return [0];
    return [...text.matchAll(new RegExp(`\\b${first}`, "gi"))].map((match) => match.index ?? 0);
  }
  return [...text.matchAll(new RegExp(source.source, "gi"))].map((match) => match.index ?? 0);
}

/**
 * The dated part of the story about one moment: every date in the story, with
 * the words around it (inside its sentence), tested against the cue. The
 * moment's words must be near the date and nothing about a different kind of
 * moment may sit between them, so "they served a motion and the hearing is on
 * December 3" gives December 3 to the hearing question, not the served one.
 */
function datedMention(sentences: string[], cue: Cue, moment: keyof typeof MOMENT_WORDS): { sentence: string; date: string } | null {
  let best: { sentence: string; date: string; distance: number } | null = null;
  for (const sentence of sentences) {
    for (const match of sentence.matchAll(DATE_ANYWHERE)) {
      const at = match.index ?? 0;
      const end = at + match[0].length;
      const from = Math.max(0, at - 110);
      const window = sentence.slice(from, end + 70);
      if (!cueMatches(cue, window)) continue;
      const other = MOMENT_WORDS[moment];
      for (const position of cuePositions(cue, window).map((offset) => offset + from)) {
        const between = position < at ? sentence.slice(position, at) : sentence.slice(end, position);
        // The cue's own words may be "hearing" (a hearing question); only a
        // DIFFERENT moment's word between them disqualifies.
        const cleaned = cue.key.source.startsWith("(?=") ? between : between.replace(new RegExp(cue.key.source, "gi"), " ");
        if (other.test(cleaned.replace(/^\w+/, ""))) continue;
        const distance = Math.abs(position - at);
        if (!best || distance < best.distance) best = { sentence, date: match[0], distance };
      }
    }
  }
  return best ? { sentence: best.sentence, date: best.date } : null;
}

export function storyHintsForDates(story: string | null | undefined, now: Date = new Date()): Record<string, StoryHint> {
  const hints: Record<string, StoryHint> = {};
  if (!story) return hints;
  const sentences = story.split(/(?<=[.!?])\s+|\n+/).map((sentence) => sentence.trim()).filter(Boolean);
  for (const { id: questionId, question } of allDateQuestions()) {
    const cue = cueFor(questionId, question);
    if (!cue) continue;
    // Of the sentences about that moment, the date nearest the moment's words
    // is the useful one ("The papers came on September 25." over "I was
    // served a claim saying ..."); with no date, the first such sentence is
    // quoted as a reminder.
    const dated = datedMention(sentences, cue, momentOf(questionId, question));
    const sentence = dated?.sentence ?? sentences.find((candidate) => cueMatches(cue, candidate));
    if (!sentence) continue;
    const dateText = dated?.date ?? "";
    const full = FULL_DATE.exec(dateText);
    const value = full ? parseUserDate(full[1].replace(/,/g, "")) : null;
    const assumed = value || !dateText ? null : assumedYearDate(dateText, now, UPCOMING_QUESTIONS.has(questionId));
    hints[questionId] = {
      quote: sentence.length > 240 ? `${sentence.slice(0, 237)}…` : sentence,
      value: value ?? assumed,
      ...(assumed ? { yearAssumed: true } : {}),
    };
  }
  // For an injury claim the day of the injury IS the day the claim is based
  // on, as in suggestedDatesFromAnswers (2026-10-09: a dog-bite story gave the
  // date and the starting step asked for it again).
  if (hints["sc-date-injury"]?.value && !hints["case-date-act-or-omission"]?.value) {
    hints["case-date-act-or-omission"] = { ...hints["sc-date-injury"] };
  }
  return hints;
}

/**
 * The date written in one sentence of the person's story, for a form that
 * would otherwise ask "The exact date, if you know it" beside that very
 * sentence (held-back walkthrough, 2026-10-09: "Now the trial is on January
 * 14 2027" was quoted and the date box was empty). A full date, year written,
 * fills the date; a month and day without a year fills only the words, since
 * the year would be a guess. The person still records it themselves.
 */
export function dateInSentence(sentence: string | null | undefined): { raw: string; iso: string | null } | null {
  if (!sentence) return null;
  const full = FULL_DATE.exec(sentence);
  if (full) {
    const iso = parseUserDate(full[1].replace(/,/g, ""));
    return { raw: full[1], iso };
  }
  const partial = MONTH_DAY.exec(sentence);
  return partial ? { raw: partial[0], iso: null } : null;
}
