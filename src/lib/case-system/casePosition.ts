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
  "sc-date-injury": /\b(hurt|injur(?:ed|y)|fell|slipped|tripped|bitten|bit me|hit by|accident|crash(?:ed)?)\b/i,
  // The day a non-injury claim is based on (2026-10-07).
  "case-date-act-or-omission": /\b(invoice|never paid|stopped paying|(?:refused|won'?t|wont|didn'?t) (?:to )?pay|stopped (?:showing up|coming|work)|last day|was due|due date|bounced)\b/i,
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

export function storyHintsForDates(story: string | null | undefined, now: Date = new Date()): Record<string, StoryHint> {
  const hints: Record<string, StoryHint> = {};
  if (!story) return hints;
  const sentences = story.split(/(?<=[.!?])\s+|\n+/).map((sentence) => sentence.trim()).filter(Boolean);
  for (const [questionId, cue] of Object.entries(STORY_CUES)) {
    // Of the sentences about that moment, the one that names a date is the
    // useful reminder ("The papers came on September 25." over "I was served a
    // claim saying ...").
    const about = sentences.filter((candidate) => cue.test(candidate));
    const sentence = about.find((candidate) => MENTIONS_DATE.test(candidate)) ?? about[0];
    if (!sentence) continue;
    const match = FULL_DATE.exec(sentence);
    const value = match ? parseUserDate(match[1].replace(/,/g, "")) : null;
    const assumed = value ? null : assumedYearDate(sentence, now, UPCOMING_QUESTIONS.has(questionId));
    hints[questionId] = {
      quote: sentence.length > 240 ? `${sentence.slice(0, 237)}…` : sentence,
      value: value ?? assumed,
      ...(assumed ? { yearAssumed: true } : {}),
    };
  }
  return hints;
}
