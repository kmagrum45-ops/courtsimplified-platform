"use client";

import { isRealIsoDate, yearChoicesAround } from "../../../src/lib/case-system/dates";
import { sentences as splitSentences } from "../../../src/lib/case-system/sentences";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";

import { dateQuestionsForStep, isServiceDateQuestion } from "@/src/lib/case-system/casePosition";
import {
  effectiveServiceDate,
  serviceMethodFromStory,
  arrivalNotSendDate,
  serviceRulesFor,
  SENT_ON_OR_BEFORE_ARRIVAL,
  ORIGINATING_RULE,
  COMPANY_ROUTE,
  originatingRuleFor,
  isOriginatingService,
  postWaysForClaim,
  partyServedFrom,
  whenEffectiveSay,
  MOTION_TO_CHANGE_SERVICE_QUESTION,
  MOVING_PARTY_MOTION_QUESTION,
  type ServedOn,
  type ServiceCourt,
  type ServiceMethod,
} from "@/src/lib/case-system/deadlines/serviceEffectiveDate";

import { findStage, stagesForPathway, type StagePathway } from "@/src/lib/case-system/stage-map/stageMap";
import { DEADLINE_EVENTS, caseDatesFrom } from "@/src/lib/case-system/deadlines/deadlineEvents";
import { formatLongDate } from "@/src/lib/case-system/deadlines/holidays";
import { computedDeadlinesFor } from "@/src/lib/content-library/computedDeadline";
import type { DateQuestion, StoryHint, SuggestedDate } from "@/src/lib/case-system/casePosition";
import FormsNamedHere from "../../_components/FormsNamedHere";
import NextStepPractical from "../../_components/NextStepPractical";
import WhatComesNext from "../../_components/WhatComesNext";
import GetHelp from "../../_components/GetHelp";
import { replayPendingPositionSaves, unsavedFromEarlierPage, savePositionQueued } from "./positionSave";
import { officialFormsNamedIn } from "@/src/lib/content-library/forms/formsInText";
import {
  PASSED_CHECK_CLOSED,
  changeMipNoteFor,
  isChangeMip,
  SOURCE_SAVED_ON,
  claimFit,
  deadlineLineFor,
  PASSED_BAR_WARNING,
  companyIsTheParty,
  limitForSide,
  keptForNotices,
  limitNotesFor,
  limitPassedState,
  noticeFit,
  noticeStepTitle,
  noticesNarrowed,
  practicalFor,
  personDeadlineOf,
  filingDeadlineDivisionalOnly,
  todayInOntario,
  type PlainLine,
  type PracticalCourt,
} from "@/src/lib/content-library/nextStepPractical";
import { datesFromPicture, stepFromPicture, type CasePicture } from "@/src/lib/case-system/intake/caseReader";
import { amountNoteFor } from "@/src/lib/case-system/amountNotes";
import { officialUrl, sourceName, type RuleCitation } from "@/src/lib/case-system/stage-map/citations";

/**
 * "Where exactly is your case?" — the reviewed answer for the position the
 * user picks.
 *
 * *** WHY THE USER PICKS ***
 *
 * The 35 Small Claims stage answers are reviewed text tied to one precise
 * position. Choosing that position for someone is a decision about their case,
 * so this panel asks them to choose it from the stage list, in their own
 * words (each stage's `userQuestion`), and shows nothing until they have
 * (CLAUDE.md §4). No model is involved; /api/case/stage-answer renders the
 * published block through the same gates as every other door.
 *
 * Added 2026-10-01, when it was found that no page showed these answers.
 */

type RenderedAnswer = {
  stageId: string;
  question: string;
  sections: { heading: string; text: string }[];
  /** `checkedOn`: the day the source's text was saved and checked (walkthrough run 38525903567: no list showed one). */
  sources: { name: string; pinpoint: string; url: string; checkedOn?: string }[];
  /** The rule itself beside a sentence proved from a guide (sentenceRules.ts). */
  sentenceRules?: { sentence: string; rules: (RuleCitation & { checkedOn?: string })[] }[];
  status: string;
  release: { runId: string; promotedAt: string };
};

/** What the route says about each limit besides its words: its id, the rule that sets it, and, for a bar, the rule's own exceptions. */
type LimitSource = {
  qualifier?: string;
  qualifierRules?: RuleCitation[];
  id?: string;
  rule?: RuleCitation;
  consequence?: "bars-the-claim" | "changes-what-happens-next";
  notABar?: RuleCitation[];
  statutory?: boolean;
  /** A point after which the court's leave is needed (r. 20.08 (2.1)), not a time to act. */
  threshold?: boolean;
  /** Sentences of the deadline that say when service counts, each with the subrule it restates. */
  servedWhen?: PlainLine[];
  /** Set by limitForSide for the person responding: the limit's note in their words, and the rules the wording relies on. */
  sideNote?: PlainLine;
  alsoRules?: RuleCitation[];
};

type NextStepSummary = {
  title: string;
  deadlines: ({ what: string; date: string; statement: string } & LimitSource)[];
  periods: ({ what: string; count: number; unit: string; countFrom: string } & LimitSource)[];
};

type Response =
  | { outcome: "rendered"; answer: RenderedAnswer; dateQuestions?: DateQuestion[]; nextStep?: NextStepSummary | null }
  | { outcome: "needs-a-fact"; question: string; answer: RenderedAnswer | null }
  | { outcome: "unavailable"; message: string };

const GROUPS: Record<StagePathway, { side: string; label: string }[]> = {
  "small-claims": [
    { side: "before-filing", label: "Before a case is started" },
    { side: "plaintiff", label: "I am bringing the claim (plaintiff)" },
    { side: "defendant", label: "I am responding to a claim (defendant)" },
    { side: "both", label: "Either side — something went wrong" },
  ],
  civil: [
    { side: "plaintiff", label: "I am suing (plaintiff)" },
    { side: "defendant", label: "I am being sued (defendant)" },
    { side: "both", label: "Either side" },
  ],
  family: [
    { side: "applicant", label: "I started the case (applicant)" },
    { side: "respondent", label: "The case was started against me (respondent)" },
    { side: "both", label: "Either side" },
  ],
};

/*
 * Before-filing stages are Small Claims ids with side "plaintiff"; they are
 * grouped by their id prefix so a reader who has filed nothing finds them.
 */
function groupOf(stage: { id: string; side: string }): string {
  return stage.id.startsWith("before-filing:") ? "before-filing" : stage.side;
}

// Moved to the library so server routes can use the same suggestion
// (Phase 1: the Deadlines view counted nothing until a step was picked).
export { suggestedStageFor } from "@/src/lib/case-system/stage-map/suggestedStep";
import { suggestedStageFor } from "@/src/lib/case-system/stage-map/suggestedStep";
import { isLeaveSentence, withLeaveRulesQuoted } from "@/src/lib/content-library/leaveRuleWords";

export function orderGroupsForReader<T extends { side: string; label: string }>(
  groups: readonly T[],
  responding: boolean,
): T[] {
  const own = responding ? ["defendant", "respondent"] : ["before-filing", "plaintiff", "applicant"];
  return [
    ...groups.filter((group) => own.includes(group.side)),
    ...groups.filter((group) => group.side === "both"),
    ...groups
      .filter((group) => !own.includes(group.side) && group.side !== "both")
      .map((group) => ({ ...group, label: `Other situations — ${group.label}` })),
  ];
}

/**
 * The two years a month and day with no year can mean: the one nearest today
 * on the right side (an upcoming conference is this year's or next; a service
 * date is this year's or last), and the one beyond it. The person picks.
 * Exported for test:case-position.
 */
export function yearChoices(isoDate: string, today: string = todayIso()): string[] {
  return yearChoicesAround(isoDate, today);
}

/** The courts whose service rules the site holds. */
function serviceCourt0(courtPath: string): ServiceCourt | null {
  return courtPath === "small-claims" || courtPath === "civil" || courtPath === "family" ? courtPath : null;
}

/** Today in Ontario, whatever the device's clock zone (walkthrough run 38500825561). Exported for test:next-step. */
export function todayIso(now: Date = new Date()): string {
  return todayInOntario(now);
}

/** The rule that sets a time limit, beside it on the card (2026-10-13: limits were shown with no source). */
function LimitRule({ rule }: { rule?: RuleCitation }) {
  if (!rule) return null;
  const saved = SOURCE_SAVED_ON[rule.sourceId];
  return (
    <span data-testid="next-step-limit-rule" className="block text-xs text-[#4d675f]">
      <a href={officialUrl(rule)} target="_blank" rel="noreferrer" className="underline">
        {sourceName(rule)}
      </a>
      , {rule.pinpoint}
      {saved ? ` · checked ${saved}` : ""}
    </span>
  );
}

/**
 * The rule itself beside a sentence the answer proved from a guide
 * (walkthrough run 38525903567, SJ: "serve the notice at least 30 days before
 * the hearing" showed no source). Each rule quoted, with its checked date.
 */
function SentenceRulesBox({ entries }: { entries: NonNullable<RenderedAnswer["sentenceRules"]> }) {
  if (entries.length === 0) return null;
  return (
    <div data-testid="stage-answer-sentence-rules" className="mt-2 rounded-xl border border-[#d8e6df] bg-[#f8fcfa] px-3 py-2 text-sm leading-6 text-[#2b4640]">
      <p className="font-semibold text-[#16302b]">The rules for these sentences</p>
      <ul className="mt-1 space-y-2">
        {entries.map((entry) => (
          <li key={entry.sentence}>
            {entry.sentence}
            {entry.rules.map((rule) => (
              <QuotedRule key={rule.pinpoint} rule={rule} />
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A rule's source line, with its words folded underneath unless they are already shown. */
function QuotedRule({ rule, quote = true }: { rule: RuleCitation; quote?: boolean }) {
  const saved = SOURCE_SAVED_ON[rule.sourceId];
  const head = (
    <>
      <a href={officialUrl(rule)} target="_blank" rel="noreferrer" className="underline">
        {sourceName(rule)}
      </a>
      , {rule.pinpoint}
      {saved ? ` · checked ${saved}` : ""}
    </>
  );
  if (!quote) return <span className="block text-xs">{head}</span>;
  return (
    <details className="mt-1 text-xs">
      <summary className="cursor-pointer">{head}</summary>
      <span className="mt-1 block italic">“{rule.quote}”</span>
    </details>
  );
}

/**
 * The sentence of the story that says how the papers came, for the method
 * read from the whole story (walkthrough run 38500825561, RN: "How were the
 * papers served?" was drawn as an open select though the story said "i got
 * the plaintiffs claim in the mail"). Null when the story names no single
 * method. Exported for test:next-step.
 */
const ABOUT_THE_PAPERS = /\b(?:papers?|claim|application|summons|served|serve|serving|statement of claim|court documents?|documents? from the court|lawsuit|sued|suing me|motion)\b/i;
export function serviceMethodShown(court: ServiceCourt, story: string): { method: ServiceMethod; quote: string } | null {
  const method = serviceMethodFromStory(court, story);
  if (!method) return null;
  const sentences = splitSentences(story);
  // Only a sentence about the court papers reaching them (review 2026-10-13:
  // "I emailed him the invoice three times", "we met in person to sign the
  // lease" and "i mailed my defence to the court" are not how they were served).
  const quote = sentences.find((sentence) => serviceMethodFromStory(court, sentence) === method && ABOUT_THE_PAPERS.test(sentence) && !/\bmy (?:defen[cs]e|answer|reply)\b/i.test(sentence));
  return quote ? { method, quote } : null;
}

/**
 * How the "how were the papers served" line is drawn: "chosen" (the person
 * picked it), "suggested" (read from their words, with Change), or "choose"
 * (the open choice). Exported for test:next-step.
 */
export function serviceMethodDisplay(chosen: ServiceMethod | undefined, fromStory: ServiceMethod | null, changing: boolean): "chosen" | "suggested" | "choose" {
  if (changing) return "choose";
  if (chosen) return "chosen";
  return fromStory ? "suggested" : "choose";
}

/** A last day counted for the note, with whether it has passed (limitPassedState, the card's own test). */
export type ArrivalDate = { id?: string; what: string; date: string; iso: string; passed: boolean };

export type ArrivalNote = {
  quote: string;
  /** The story gave no year for the arrival day, so the dates assume the most recent one. */
  yearAssumed: boolean;
  /** The arrival day the dates were counted from (YYYY-MM-DD), or "" when none was read. */
  arrivedOn: string;
  /**
   * "claim": the papers are a claim or an application, which the rules do not
   * let be served by regular mail (Small Claims r. 8.01 (1), civil r. 16.01 (1),
   * family r. 8 (5) and 6 (3)). "sent": any other document sent by a way whose
   * day is set from the day it was sent.
   */
  kind: "claim" | "sent";
  dateToEnter: string;
  rule: string;
  ruleQuote: string;
  /** "sent": the rule's effective day in plain words. */
  effectiveSay: string;
  /**
   * "sent", by regular mail only: each last day counted as if the papers were
   * mailed the day they arrived -- the latest the real one can be.
   */
  latest: ArrivalDate[];
  /** "claim": the rule on how a claim or application is served, quoted. */
  claimRule: { rule: string; quote: string; say: string } | null;
  /** "claim": the ways the rules allow that come by post, each with its effective day. */
  postWays: { label: string; effective: string | null; rule: string; quote: string }[];
  /** "claim": each last day counted from the day the person gave. */
  safest: ArrivalDate[];
  /** "claim": the person's words say that day is the first copy reaching the home (signed for, left there, or first), so it may be called the safest date. */
  firstCopy: boolean;
  /**
   * "claim": a company is the party (its words, or the company route was
   * chosen). Service on it by mail is effective on the fifth day after
   * mailing, which can be before the papers arrived, so the date is never
   * called the safest, and the note speaks of "your address".
   */
  company: boolean;
};

/** Words saying the day is when the FIRST copy reached the home: signed for there, left with someone there, or "first". */
export function firstCopyQuote(quote: string): boolean {
  // Only words about a copy reaching the home (final re-check 2026-10-14):
  // "I first saw the claim on october 5" or "first got" is not one.
  return /\bsigned for\b|\bleft (?:a copy|it|them|the (?:papers|claim|application)) with\b|\bfirst (?:copy )?(?:came|arrived)\b/i.test(quote);
}

/**
 * A step on which the person has RECEIVED papers (a defendant, a respondent,
 * someone served with something), so a deadline running from that service
 * is theirs (legal review 2026-10-14: the arrival note fired on plaintiff
 * steps and said "your last day" of the defendant's deadline).
 */
export function receivesPapersStep(stageId: string, responding = false): boolean {
  // `responding`: the person's side on an "either side" step (family:both:...),
  // as respondingStep takes it (legal review 2026-10-14).
  return (responding && /:both:/.test(stageId)) || /(?:^|:)defendant:|:respondent:|served-with|responding-to/.test(stageId);
}

/** The person's answer to the motion-to-change reading (casePosition `motionToChange`). */
/**
 * Where a date came from, in the person's words: their story, or an answer they gave.
 * The dates are read from the story together with the Timeline, where an answer such as
 * the day they were served is kept, and that answer was labelled "From your story"
 * (#470 re-test).
 */
export function hintBasis(quote: string, storyText: string | undefined): string {
  return (storyText ?? "").includes(quote) ? `from your story: “${quote}”` : `from your answer: “${quote.replace(/^[^:“]{1,40}:s*/, "")}”`;
}

export type MotionSide = { answer: "yes" | "other" | "not-sure"; readingKind: "asking" | "responding" | "if-served" };

/**
 * Whether the person SERVED the papers service date `questionId` asks about
 * (walkthrough run 38525903567, FM): the moving party on a motion to change.
 * r. 15 (10) counts the other party's time from when THEY receive the motion,
 * so the mover is asked how it was served on them and the day they got it.
 * Read from the side (a step where the person receives papers is never one),
 * and from their answer to the motion-to-change reading when there is one:
 * an answer that makes the motion the other side's means they did not serve
 * it. Exported for test:service-dates.
 */
export function servesPapersFor(stageId: string, questionId: string, court: ServiceCourt | null, responding = false, motion?: MotionSide | null): boolean {
  if (court !== "family" || questionId !== MOTION_TO_CHANGE_SERVICE_QUESTION) return false;
  if (receivesPapersStep(stageId, responding)) return false;
  if (motion) {
    // "Not sure": neither side's wording is assumed; the neutral question is asked (review of 70b717b).
    if (motion.answer === "not-sure") return false;
    const route = motion.answer === "yes" ? motion.readingKind : motion.answer === "other" ? (motion.readingKind === "asking" ? "if-served" : "asking") : null;
    if (route && route !== "asking") return false;
  }
  return true;
}

/** The date question as the person reads it: the moving party's own wording when they served the papers. */
export function dateQuestionTextFor(question: { id: string; question: string }, serving: boolean): string {
  return serving && question.id === MOTION_TO_CHANGE_SERVICE_QUESTION ? MOVING_PARTY_MOTION_QUESTION : question.question;
}

/** The step's last days that run from service date `questionId`, counted from `serviceDay`, each with whether it has passed. */
export function countedFromService(stageId: string, questionId: string, serviceDay: string, today: string = todayIso(), responding = false): ArrivalDate[] {
  if (!isRealIsoDate(serviceDay)) return [];
  const stage = findStage(stageId);
  if (!stage) return [];
  const runsFromIt = stage.deadlines.filter(
    (deadline) => (DEADLINE_EVENTS as Record<string, { questionId?: string }>)[deadline.countFromEvent]?.questionId === questionId && !/^If\b/.test(deadline.what),
  );
  return computedDeadlinesFor(runsFromIt, caseDatesFrom({ [questionId]: serviceDay }), `arrival:${stageId}`).map((entry) => {
    const deadline = runsFromIt.find((item) => item.id === entry.deadlineId);
    return {
      id: entry.deadlineId,
      // In the person's own words on an either-side step (reviewer 2026-10-14:
      // "The other party's time ..." on a respondent's arrival note).
      what: deadline ? limitForSide(deadline, responding).what : "",
      date: formatLongDate(entry.date),
      iso: entry.date,
      passed: limitPassedState({ date: entry.date, statutory: deadline?.regime === "legislation-act" }, today).passed,
    };
  });
}

/**
 * The latest each of the person's last days can be, for a document that may
 * be served by regular mail and arrived on `arrivedOn` (walkthrough
 * 2026-10-14, RN). The rule's effective day from the arrival day, then the
 * step's deadlines from it. A later starting day never gives an earlier last
 * day, so each is an upper bound. Never for a claim or an application (they
 * are not served by regular mail: legal review 2026-10-14), and only on a
 * step where the person received the papers. Exported for test:service-dates.
 */
export function latestFromArrival(
  stageId: string,
  questionId: string,
  court: ServiceCourt,
  method: ServiceMethod | null | undefined,
  arrivedOn: string,
  today: string = todayIso(),
  responding = false,
): ArrivalDate[] {
  if (!method || !SENT_ON_OR_BEFORE_ARRIVAL.has(method) || isOriginatingService(court, questionId) || !receivesPapersStep(stageId, responding)) return [];
  if (!isRealIsoDate(arrivedOn)) return [];
  return countedFromService(stageId, questionId, effectiveServiceDate(court, method, arrivedOn).date, today, responding);
}

/**
 * Time limits that bar a claim and have passed (2026-10-13). Pass ONLY the
 * limits the card kept (cardLimits().kept): a notice the card dropped as not
 * fitting the person's words never gets a "passed" box of its own. A
 * statutory limit whose counted day was a Saturday, Sunday or holiday has
 * passed only once the next open weekday has too (limitPassedState;
 * Legislation Act s. 89 (2)). Exported for test:next-step.
 */
/**
 * The stage the person is at once a running-time step's own deadline has passed
 * (the map's whenTimeRunsOut), or null while it is running or not yet counted.
 * The card shows that stage's title instead of "time ... still running" beside
 * "That date has already passed" (Part 3b, #465 re-test). Exported for test:time-ran-out.
 */
/** The map has no stage for after this time ran out (whenTimeRunsOut.stage null). */
export const NOT_COVERED = { id: "", title: "the step after this time has run out is not covered yet" } as const;

export function stageAfterTimeRanOut(stepId: string, deadlines: { id?: string; date: string; statement: string; statutory?: boolean }[], today: string = todayIso()) {
  const link = findStage(stepId)?.whenTimeRunsOut;
  if (!link) return null;
  const own = deadlines.find((deadline) => deadline.id === link.deadline && deadline.date);
  if (!own || !deadlineLineFor(own, today).passed) return null;
  return link.stage ? findStage(link.stage) ?? null : NOT_COVERED;
}

export function passedBars(kept: Pick<NextStepSummary, "deadlines">, today: string = todayIso()) {
  return kept.deadlines.filter((deadline) => deadline.consequence === "bars-the-claim" && limitPassedState(deadline, today).passed);
}

/**
 * Who the papers were served on, for the ways offered (walkthrough run
 * 38525903567, SD: the company route was offered to a homeowner; review of
 * bee9daf: it was then hidden from real companies). On a step where the
 * person received the papers the party served is the person; otherwise it
 * is the other side (partyServedFrom). The company route is hidden only on
 * positive evidence of an individual; a route already chosen is always kept,
 * so a detected or saved route always has its option. Exported for
 * test:service-dates.
 */
export function servedOnFor(words: string, stageId: string, responding: boolean, chosen?: ServiceMethod): ServedOn {
  if (chosen && COMPANY_ROUTE.has(chosen)) return { company: true };
  if (companyIsTheParty(words) && receivesPapersStep(stageId, responding)) return { company: true };
  return partyServedFrom(words, receivesPapersStep(stageId, responding));
}

/**
 * The words after a date counted from a month and day with no year
 * (walkthrough run 38525903567: "(counting that day in its most recent year)"
 * read as unclear). Says plainly which day was used. Exported for test:service-dates.
 */
export function yearAssumedWords(arrivedOn: string): string {
  return isRealIsoDate(arrivedOn)
    ? ` (you did not say which year, so we counted from ${formatLongDate(arrivedOn)})`
    : " (you did not say which year, so we counted from the most recent one)";
}

/**
 * The days the card's filing and mail lines are timed against (walkthrough
 * run 38525903567, SD; review of bee9daf): the earliest of the person's own
 * filing deadlines and of their own serving deadlines (PERSON_SERVE_OR_FILE),
 * from the card's leading counted days and the days counted from the papers'
 * arrival. Never the court's own timing, a leave threshold or an issue-only
 * limit. Exported for test:next-step.
 */
export function cardFilingDeadline(
  summary: Pick<NextStepSummary, "deadlines" | "periods">,
  arrival: Pick<ArrivalNote, "safest" | "latest"> | null,
  responding: boolean,
  userWords: string,
  city: string,
  stepId: string,
): { filing: string; serving: string; divisionalOnly: boolean } {
  const { main } = cardLimits(summary, responding, userWords, city, stepId);
  const counted = [
    ...main.deadlines.map((item) => ({ id: item.id, date: item.date })),
    ...[...(arrival?.safest ?? []), ...(arrival?.latest ?? [])].map((item) => ({ id: item.id, date: item.iso })),
  ];
  return { filing: personDeadlineOf(counted, "files"), serving: personDeadlineOf(counted, "serves"), divisionalOnly: filingDeadlineDivisionalOnly(counted) };
}

/**
 * "Your next step", first (master plan Phase 2). The step, its deadline
 * counted from the person's dates (or the period and what it runs from), what
 * to do, and the forms -- the answer a lawyer gives first -- with the full
 * reviewed answer and every rule folded underneath. Every sentence here is
 * from the stage map, the reviewed deadline templates or the published answer;
 * the card only chooses what goes first.
 */
export function NextStepCard({
  onChooseStep,
  summary: summaryAsGiven,
  answer,
  court,
  userWords,
  askedForDates,
  stepId,
  city,
  fromStory = [],
  responding = false,
  arrival = null,
  noticeStepId = "",
}: {
  /** Opens another step, as choosing it in "Where is your case?" does. */
  onChooseStep?: (id: string) => void;
  summary: NextStepSummary;
  answer: RenderedAnswer;
  court: string;
  userWords: string;
  askedForDates: boolean;
  stepId: string;
  /** The person's city, which decides the filing portal (Toronto region or not). */
  city: string;
  /** Dates used for this count that came from the person's own words and are not yet saved. */
  /** Each with the sentence it came from (basis), shown beside it (#469: no fact without its source). */
  fromStory?: { label: string; date: string; basis?: string }[];
  /** The person's side, so an "either side" step leads with their own limit ("If you are responding ..."). */
  responding?: boolean;
  /** A service date the story gives as the day the papers ARRIVED, for a way of serving that counts from the day they were sent. */
  arrival?: ArrivalNote | null;
  /** The written-notice step the case's claim points to, so a municipal one keeps the line on serving a municipality. */
  noticeStepId?: string;
}) {
  // Limits written from the moving party's side read as the person's own when they respond
  // (final re-check 2026-10-14: "The other party's time ..." for a respondent's own deadline).
  const summary = sideSummary(summaryAsGiven, responding);
  const today = todayIso();
  // The counted last day the filing and service lines are timed against (walkthrough run 38525903567, SD).
  const filingDeadline = cardFilingDeadline(summary, arrival, responding, userWords, city, stepId);
  const practical = practicalFor(stepId, court as PracticalCourt, city, responding, userWords, noticeStepId, { deadline: filingDeadline.filing, serveBy: filingDeadline.serving, today, divisionalOnly: filingDeadline.divisionalOnly });
  const toDo = answer.sections.find((section) => section.heading === "What to do next")?.text ?? "";
  // The answer's first paragraph speaks of every notice the step covers; once
  // the notice filter has narrowed them, the card leaves it to the full
  // answer (walkthrough run 38500825561, SW: "Leave the notice to the Crown
  // ..." led a Toronto sidewalk card). "How to give the notice" covers the
  // kept one from its own rule.
  const firstParagraph = cardShowsLead(summary, userWords, city)
    ? forThisPerson(toDo.split(/\n\s*\n/)[0]?.trim() ?? "", {
        userWords,
        filingShown: Boolean(practical?.filing.length),
      })
    : "";
  const unit = (count: number, word: string) => `${count} ${count === 1 ? word.replace(/s$/, "") : word}`;
  const { main, conditional, notClaimed, mipNote, changeMip, kept } = cardLimits(summary, responding, userWords, city, stepId);
  const mayApply = {
    deadlines: conditional.deadlines.filter((item) => !notClaimed.deadlines.includes(item) && !changeMip.deadlines.includes(item)),
    periods: conditional.periods.filter((item) => !notClaimed.periods.includes(item) && !changeMip.periods.includes(item)),
  };
  const passed = passedBars({ deadlines: kept }, today);
  const ranOut = stageAfterTimeRanOut(stepId, main.deadlines, today);
  // Once the time to defend has passed, the step's sentence about a notice of intent to defend
  // (Form 18B, delivered within that time) is not shown on this card (Jason, 2026-10-24). On
  // this screen only: the published library and the full answer keep their text.
  const shownLead = courtWords(ranOut ? withoutSentencesNaming(firstParagraph, SENTENCES_ONLY_WHILE_TIME_RUNS) : firstParagraph, court);
  const deadlineItem = (deadline: NextStepSummary["deadlines"][number]) => {
    // limitPassedState decides "passed"; deadlineLineFor decides the words, so
    // a statutory counted day on a closed day is never called THE last day
    // (walkthrough run 38500825561, SW) -- the same conditional words as the
    // passed box, with s. 89 (2) quoted.
    const line = deadlineLineFor(deadline, today);
    return (
      <li key={`${deadline.what}-${deadline.date}`} data-testid="next-step-deadline">
        <span className="font-semibold">{deadline.what}.</span> {line.statement ? courtWords(line.statement, court) : line.statement}
        {line.statement && line.passed ? <span className="font-semibold text-[#8a1c1c]"> That date has already passed.</span> : null}
        {line.closedDay ? (
          <span data-testid="next-step-closed-day" className={`block font-semibold ${line.passed || line.closedDay.say.includes("Act ") ? "text-[#8a1c1c]" : "text-[#16302b]"}`}>
            {line.closedDay.say}
            <QuotedRule rule={line.closedDay.cite} />
          </span>
        ) : null}
        <LimitRule rule={deadline.rule} />
        <SideRules item={deadline} />
      </li>
    );
  };
  const periodItem = (period: NextStepSummary["periods"][number]) => (
    <li key={period.what} data-testid="next-step-period">
      <span className="font-semibold">{period.what}.</span> {unit(period.count, period.unit)} after {period.countFrom}.
      {askedForDates ? (period.threshold ? ` ${THRESHOLD_ASK}` : " Give the date below and we will count the last day for you.") : ""}
      <LimitRule rule={period.rule} />
      <SideRules item={period} />
    </li>
  );
  return (
    <div data-testid="next-step-card" className="mt-4 rounded-2xl border-2 border-[#2f7d67] bg-[#f2fbf7] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#2f7d67]">Your next step</p>
      {ranOut ? (
        // The counted deadline has passed: the title agrees with it (whenTimeRunsOut).
        <p data-testid="next-step-time-ran-out" className="mt-1 text-sm text-[#4d675f]">
          Where you are: {ranOut.title}{" "}
          {onChooseStep && ranOut.id ? <button type="button" onClick={() => onChooseStep(ranOut.id)} className="font-semibold text-[#2f7d67] underline">Open this step</button> : null}
        </p>
      ) : (
        <p className="mt-1 text-sm text-[#4d675f]">Where you are: {summary.title}</p>
      )}
      {fromStory.length > 0 ? (
        <p data-testid="next-step-from-story" className="mt-2 text-sm leading-6 text-[#16302b]">
          Counted from what you told us: {fromStory.map((entry) => `${entry.label} ${entry.date}`.trim() + (entry.basis ? ` (${entry.basis})` : "")).join("; ")}. Check the date
          below and save it to your case.
        </p>
      ) : null}
      {main.deadlines.length > 0 || main.periods.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[#16302b]">
          {main.deadlines.map(deadlineItem)}
          {main.periods.map(periodItem)}
        </ul>
      ) : null}
      {passed.map((deadline) => (
        // A time limit that bars the claim has passed (2026-10-13, walkthrough:
        // the Toronto notice date passed with no plain warning, no word of the
        // rule's own exceptions and no pointer to urgent help). What the rule
        // says, quoted; never what a judge will do.
        <div
          key={`passed-${deadline.what}`}
          data-testid="next-step-passed-bar"
          role="alert"
          className="mt-3 rounded-xl border border-[#e2a3a3] bg-[#fff5f5] px-3 py-3 text-sm leading-6 text-[#5c1414]"
        >
          <p className="font-semibold">The last day counted for this has passed: {deadline.what.replace(/^If [^,]+, /, "").replace(/^./, (c) => c.toUpperCase())}.</p>
          <div className="mt-1">
            {PASSED_BAR_WARNING}
            {deadline.rule ? <QuotedRule rule={deadline.rule} /> : null}
          </div>
          {deadline.qualifier ? (
            <div data-testid="next-step-passed-qualifier" className="mt-2">
              <p>{courtWords(deadline.qualifier, court)}</p>
              {deadline.qualifierRules?.map((rule) => (
                <QuotedRule key={`${rule.sourceId}:${rule.pinpoint}`} rule={rule} />
              ))}
            </div>
          ) : null}
          {deadline.statutory ? (
            <div className="mt-2">
              {PASSED_CHECK_CLOSED.say}
              <QuotedRule rule={PASSED_CHECK_CLOSED.cite} />
            </div>
          ) : null}
          {deadline.notABar && deadline.notABar.length > 0 ? (
            <div className="mt-2">
              <p>The law itself says when missing it is not a bar:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {deadline.notABar.map((rule) => (
                  <li key={rule.pinpoint}>
                    <span className="italic">“{rule.quote}”</span>
                    <QuotedRule rule={rule} quote={false} />
                  </li>
                ))}
              </ul>
              <p className="mt-1">
                Where an exception depends on what a judge finds, that is for the judge to decide. This site cannot tell you how that will go.
              </p>
            </div>
          ) : (
            <p className="mt-2">The rule&apos;s own exceptions, if any, are in the full answer below, with its source.</p>
          )}
          <GetHelp heading="Get help now about the passed date" why="A lawyer or paralegal can look at your dates and your situation with you." />
        </div>
      ))}
      {arrival ? (
        // Papers that ARRIVED by mail on a day the story gives (2026-10-13,
        // walkthrough: "i got the plaintiffs claim in the mail on september 28"
        // was counted as the mailing day, and a definite date was shown).
        <div data-testid="next-step-arrival" className="mt-3 rounded-xl border border-[#f0c88a] bg-[#fffaf2] px-3 py-2 text-sm leading-6 text-[#7a4b12]">
          <p>You wrote: “{arrival.quote}” That is the day the papers reached you.</p>
          {arrival.kind === "claim" && arrival.claimRule ? (
            // A claim or application (legal review 2026-10-14): not served by
            // regular mail, so no "no later than" date from r. 8.07 (2). The
            // rule, the ways that come by post with their days, and the
            // safest date to act by. Never whether service was valid.
            <>
              <p className="mt-1">
                {arrival.claimRule.say}
                <span className="block text-xs">
                  {arrival.claimRule.rule}: “{arrival.claimRule.quote}”
                </span>
              </p>
              {arrival.postWays.length > 0 ? (
                <div className="mt-1">
                  <p>The ways the rules allow that come by post, and when each takes effect:</p>
                  <ul data-testid="next-step-arrival-ways" className="mt-1 list-disc space-y-1 pl-5">
                    {arrival.postWays.map((way) => (
                      <li key={way.rule}>
                        {way.label}
                        {way.effective ? `: ${way.effective}.` : "."}
                        <span className="block text-xs">
                          {way.rule}: “{way.quote}”
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {arrival.safest.length > 0 ? (
                <p data-testid="next-step-arrival-safest" className="mt-1">
                  <span className="font-semibold">
                    {arrival.firstCopy
                      ? "The safest date to act by, counted from the first day a copy reached your home: "
                      : "Counted from the day you gave: "}
                    {arrival.safest.map((entry) => `${entry.what}: ${entry.date}${entry.passed ? ". That date has already passed" : ""}`).join("; ")}
                    {arrival.yearAssumed ? yearAssumedWords(arrival.arrivedOn) : ""}.
                  </span>{" "}
                  {arrival.company
                    ? "Count from the first day a copy reached your address: signed for there, left with someone there, or arrived in the mail. If a copy was left at your address earlier than the one you got in the mail, count from the day it was left. If it was mailed to the company, service is effective on the fifth day after mailing, which can be before it arrived. The mailing date is on the affidavit of service."
                    : "Count from the first day a copy reached your home: signed for there, left with someone there, or arrived in the mail. If a copy was left at your home earlier than the one you got in the mail, count from the day it was left."}
                </p>
              ) : null}
              <p className="mt-1">
                How and when the papers were served is on the other side&apos;s affidavit of service. The court office can also tell you.
              </p>
            </>
          ) : (
            <>
              <p className="mt-1">
                For papers sent this way, {arrival.effectiveSay}, not on the day they arrived.
                {arrival.rule ? (
                  <span className="block text-xs">
                    {arrival.rule}: “{arrival.ruleQuote}”
                  </span>
                ) : null}
              </p>
              {arrival.latest.length > 0 ? (
                // The latest each last day can be, never THE last day: mailed
                // papers were mailed on or before the day they arrived.
                <p data-testid="next-step-arrival-latest" className="mt-1">
                  They were mailed on or before the day they reached you. So if they came by regular mail, your last day is no later
                  than:{" "}
                  {arrival.latest.map((entry) => `${entry.what}: ${entry.date}${entry.passed ? ". That date has already passed" : ""}`).join("; ")}
                  {arrival.yearAssumed ? yearAssumedWords(arrival.arrivedOn) : ""}. It may be earlier.
                </p>
              ) : null}
              <p className="mt-1">
                The exact last day is shown once you give {arrival.dateToEnter} below. The postmark, or the date on the other side&apos;s
                affidavit of service, often shows it.
              </p>
            </>
          )}
        </div>
      ) : null}
      {mipNote ? (
        // The information program on a motion to change that is support-only,
        // or does not say what it changes: folded under its condition with
        // r. 8.1 (1) para. 6, never dropped (walkthrough run 38525903567, FM).
        <details data-testid="next-step-mip-fold" className="mt-3 text-sm leading-6 text-[#16302b]">
          <summary className="cursor-pointer font-semibold text-[#2f7d67]">
            Only if {responding ? "the" : "your"} motion changes more than child or spousal support ({changeMip.deadlines.length + changeMip.periods.length})
          </summary>
          <p data-testid="next-step-mip-note" className="mt-2 text-[#4d675f]">
            {mipNote.say}
            <QuotedRule rule={mipNote.cite} />
          </p>
          <ul className="mt-2 space-y-2">
            {changeMip.deadlines.map(deadlineItem)}
            {changeMip.periods.map(periodItem)}
          </ul>
        </details>
      ) : null}
      {mayApply.deadlines.length > 0 || mayApply.periods.length > 0 ? (
        // "If your action is under the simplified procedure ..." -- time limits
        // that apply only in some cases. Folded, so the card leads with the one
        // that applies now (held-back walkthrough, 2026-10-09: seven conditional
        // limits each said "Give the date below").
        <details data-testid="next-step-conditional" className="mt-3 text-sm leading-6 text-[#16302b]">
          <summary className="cursor-pointer font-semibold text-[#2f7d67]">
            Other time limits that may apply later ({mayApply.deadlines.length + mayApply.periods.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {mayApply.deadlines.map(deadlineItem)}
            {mayApply.periods.map(periodItem)}
          </ul>
        </details>
      ) : null}
      {notClaimed.deadlines.length > 0 || notClaimed.periods.length > 0 ? (
        // A limit the rule ties to a kind of claim the person's words show no
        // sign of (walkthrough run 38500825561, FR: a parenting-only
        // respondent read the property-papers limit among his next steps).
        // Folded under its own heading that says why, never removed.
        <details data-testid="next-step-not-claimed" className="mt-3 text-sm leading-6 text-[#16302b]">
          <summary className="cursor-pointer font-semibold text-[#2f7d67]">
            Only if the case has a kind of claim you have not mentioned ({notClaimed.deadlines.length + notClaimed.periods.length})
          </summary>
          <p className="mt-2 text-[#4d675f]">
            Each of these starts with &ldquo;If&rdquo;: it applies only when the case has that claim. What you told us does not mention one. If the
            other side&apos;s papers or your own answer make that claim, it applies to you.
          </p>
          <ul className="mt-2 space-y-2">
            {notClaimed.deadlines.map(deadlineItem)}
            {notClaimed.periods.map(periodItem)}
          </ul>
        </details>
      ) : null}
      {shownLead ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#2b4640]">{shownLead}</p> : null}
      {shownLead ? <SentenceRulesBox entries={(answer.sentenceRules ?? []).filter((entry) => !isLeaveSentence(entry.sentence) && shownLead.includes(courtWords(entry.sentence, court)))} /> : null}
      {/* The form, fee, filing and service for this step (Phase 2); the forms
          the answer's text names are the fallback for a step with none recorded. */}
      {practical ? <NextStepPractical stepId={stepId} court={court} city={city} responding={responding} story={userWords} noticeStepId={noticeStepId} deadline={filingDeadline.filing} serveBy={filingDeadline.serving} divisionalOnly={filingDeadline.divisionalOnly} today={today} timeRanOut={Boolean(ranOut)} /> : null}
      {!practical?.forms.length && toDo ? <FormsNamedHere texts={[toDo]} court={court} userWords={userWords} heading="Forms for this step" /> : null}
      {(() => {
        // Say what the card doesn't list yet, instead of leaving a gap the
        // person can't see (build order Step 2E, 2026-10-12). Worded so it
        // never claims something must be filed or served at this step.
        const missing = [
          !practical?.forms.length && officialFormsNamedIn(toDo ? [toDo] : [], court).length === 0 ? "the form" : "",
          !practical?.fees.length && !practical?.feeNotes.length ? "the fee" : "",
          !practical?.filing.length ? "where and how to file" : "",
          !practical?.serving.length ? "how to serve" : "",
        ].filter(Boolean);
        if (missing.length === 0) return null;
        // A step done outside court (a notice before suing) shows the rule for
        // it and has nothing to file at court, so there is nothing missing.
        if (practical && practical.also.length > 0 && !practical.forms.length && !practical.filing.length && !practical.serving.length) return null;
        const list = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(", ")} or ${missing[missing.length - 1]}`;
        return (
          <p data-testid="next-step-not-listed" className="mt-3 text-sm leading-6 text-[#4d675f]">
            This card doesn&apos;t list {list} for this step yet. If you need to file or serve something now, the court
            office can tell you how, and the full answer below has the rules.
          </p>
        );
      })()}
      {answer.sources.length > 0 ? (
        <p className="mt-3 text-xs leading-5 text-[#4d675f]">
          {answer.sources.slice(0, 4).map((source, index) => (
            <span key={`${source.name}-${source.pinpoint}`}>
              {index > 0 ? "; " : "Sources: "}
              <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                {source.name}
              </a>
              {source.pinpoint ? `, ${source.pinpoint}` : ""}
              {source.checkedOn ? ` · checked ${source.checkedOn}` : ""}
            </span>
          ))}
          {answer.sources.length > 4 ? " — all sources are in the full answer below." : ""}
        </p>
      ) : null}
      <WhatComesNext stepId={stepId} responding={responding} story={userWords} city={city} />
      {limitNotesFor(court as PracticalCourt, userWords).map((line) => (
        <p key={line.cite.pinpoint} data-testid="next-step-limit" className="mt-3 rounded-xl border border-[#f0c88a] bg-[#fffaf2] px-3 py-2 text-sm leading-6 text-[#7a4b12]">
          {line.say}{" "}
          <a href={officialUrl(line.cite)} target="_blank" rel="noreferrer" className="underline">
            {sourceName(line.cite)}, {line.cite.pinpoint}
          </a>
        </p>
      ))}
      <GetHelp compact heading="Want a person to check this step with you?" />
    </div>
  );
}

/**
 * Whether the card shows the answer's first "What to do next" paragraph: not
 * once the notice filter has left a notice out, since that paragraph speaks
 * of every notice the step covers (walkthrough run 38500825561, SW). The full
 * answer keeps the paragraph whenever the card does not show it.
 */
export function cardShowsLead(summary: Pick<NextStepSummary, "deadlines" | "periods">, userWords: string, city: string): boolean {
  return !noticesNarrowed([...summary.deadlines, ...summary.periods], userWords, city);
}

/** The step's title fitted to the one notice the person's words keep, or null to use the step's own question. */
export function stepTitleFor(summary: Pick<NextStepSummary, "deadlines" | "periods">, userWords: string, city: string): string | null {
  return noticeStepTitle([...summary.deadlines, ...summary.periods], userWords, city);
}

/** Every service-timing sentence of the step's limits with its subrule, once each. */
export function servedWhenOf(summary: Pick<NextStepSummary, "deadlines" | "periods">): PlainLine[] {
  const seen = new Set<string>();
  return [...summary.deadlines, ...summary.periods]
    .flatMap((item) => item.servedWhen ?? [])
    .filter((line) => (seen.has(line.say) ? false : (seen.add(line.say), true)));
}

/**
 * The "What to do next" paragraph the card above already shows (build order
 * Step 2B, 2026-10-12): the full answer printed it again word for word under
 * the card, and the walkthrough flagged that on 7 of 10 cases.
 */
export function cardLeadOf(answer: RenderedAnswer): string {
  const toDo = answer.sections.find((section) => section.heading === "What to do next")?.text ?? "";
  return toDo.split(/\n\s*\n/)[0]?.trim() ?? "";
}

/** A section's text without the paragraph the card already shows. */
export function withoutCardLead(heading: string, text: string, cardLead: string): string {
  if (!cardLead || heading !== "What to do next") return text;
  const paragraphs = text.split(/\n\s*\n/);
  if ((paragraphs[0] ?? "").trim() !== cardLead) return text;
  return paragraphs.slice(1).join("\n\n").trim();
}

function AnswerView({
  answer,
  court,
  userWords = "",
  underCard = false,
  servedWhen = [],
}: {
  answer: RenderedAnswer;
  court: string;
  userWords?: string;
  /** Shown under the next-step card, which already shows the first step. */
  underCard?: boolean;
  /** Service-timing sentences of the step's deadlines, each with its subrule, shown under "Your deadline" where the sentence appears. */
  servedWhen?: PlainLine[];
}) {
  const cardLead = underCard ? cardLeadOf(answer) : "";
  return (
    <div className="mt-4 space-y-4" data-testid="stage-answer">
      <h4 className="text-base font-bold text-[#10231f]">{courtWords(answer.question, court)}</h4>
      {answer.status === "rules-only" ? (
        <p data-testid="stage-rules-only" className="text-xs leading-5 text-[#4d675f]">
          We have not written a step-by-step answer for this step yet. These are its deadlines and
          the rules that apply to it, in the official words.
        </p>
      ) : null}
      {answer.sections.map((section) => {
        const text = courtWords(withoutCardLead(section.heading, section.text, cardLead), court);
        return (
          <div key={section.heading}>
            <p className="text-sm font-semibold text-[#16302b]">{section.heading}</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#2b4640]">
              {text || "The first step is in \"Your next step\" above."}
            </p>
            <SentenceRulesBox entries={(answer.sentenceRules ?? []).filter((entry) => !isLeaveSentence(entry.sentence) && text.includes(courtWords(entry.sentence, court)))} />
            {section.heading === "Your deadline" && servedWhen.some((line) => text.includes(line.say)) ? (
              // The rule beside each "when service counts" sentence above
              // (walkthrough run 38500825561, FR: the 4 p.m. sentence had none).
              <div data-testid="stage-answer-served-when" className="mt-2 rounded-xl border border-[#d8e6df] bg-[#f8fcfa] px-3 py-2 text-sm leading-6 text-[#2b4640]">
                <p className="font-semibold text-[#16302b]">When service counts: the rules for the sentences above</p>
                <ul className="mt-1 space-y-2">
                  {servedWhen
                    .filter((line) => text.includes(line.say))
                    .map((line) => (
                      <li key={line.say}>
                        {line.say}
                        <QuotedRule rule={line.cite} />
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </div>
        );
      })}
      <FormsNamedHere texts={answer.sections.map((section) => section.text)} court={court} userWords={userWords} />
      {answer.sources.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-[#16302b]">Sources</p>
          <ul className="mt-1 list-disc pl-5 text-sm leading-6 text-[#2b4640]">
            {answer.sources.map((source) => (
              <li key={`${source.name}-${source.pinpoint}`}>
                <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                  {source.name}
                </a>
                {source.pinpoint ? `, ${source.pinpoint}` : ""}
                {source.checkedOn ? ` · checked ${source.checkedOn}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs leading-5 text-[#4d675f]">
        {answer.status === "rules-only" ? "Quoted from" : "Written from"} the official sources above. CourtSimplified guides you through the process
        but is not your lawyer, so check the source before you rely on it.
      </p>
    </div>
  );
}

/**
 * The facts a step's answer is loaded with: the municipality the person gave
 * (in the "Which city?" box) or, for the Toronto notice question, Toronto --
 * choosing that question IS the person saying it was in Toronto. Every load
 * of a step uses this, so a reload never drops a fact already given (review
 * 2026-10-13). Exported for test:next-step.
 */
export function factsForStep(stepId: string, municipality: string): Record<string, string> {
  if (municipality.trim()) return { municipality: municipality.trim() };
  return stepId === "before-filing:notice-toronto" ? { municipality: "Toronto" } : {};
}

/** Saves the user's own choice to the case, one save at a time (positionSave.ts). */
function savePosition(caseId: string, patch: Record<string, unknown>): Promise<boolean> {
  return savePositionQueued(caseId, patch);
}

/**
 * Which time limits lead the next-step card, and in what order (2026-10-13).
 *
 * Lead: the ones with no "if", plus the "if" ones that name the person's own
 * side ("If you are the other party, serve and file your case conference
 * brief"). The walkthrough's family respondent saw the confirmation (3 days
 * before the conference) lead while her own brief, due 4 days before, was
 * folded under "may apply later". With nothing for their side, one neutral
 * limit leads, as before. Shown in the order they fall due: dated ones by
 * date; "N days before" ones furthest-before first; "N days after" ones
 * soonest first.
 */
/** The responding note and the extra rules limitForSide adds, each with its rule quoted. */
function SideRules({ item }: { item: { sideNote?: PlainLine; alsoRules?: RuleCitation[] } }) {
  if (!item.sideNote && !item.alsoRules?.length) return null;
  return (
    <span data-testid="next-step-side-rules" className="block">
      {item.sideNote ? (
        <span className="block">
          {item.sideNote.say}
          <QuotedRule rule={item.sideNote.cite} />
        </span>
      ) : null}
      {(item.alsoRules ?? []).map((rule) => (
        <QuotedRule key={rule.pinpoint} rule={rule} />
      ))}
    </span>
  );
}

/** The card's limits as the person's side reads them (limitForSide). Exported for test:next-step. */
export function sideSummary<T extends Pick<NextStepSummary, "deadlines" | "periods">>(summary: T, responding: boolean): T {
  return {
    ...summary,
    deadlines: summary.deadlines.map((item) => limitForSide(item, responding)),
    periods: summary.periods.map((item) => limitForSide(item, responding)),
  };
}

/**
 * A counted leave threshold more than a year away is folded under the limits
 * that may apply later (walkthrough run 38525903567, SJ: an unpaid judgment
 * led with the six-year leave limit, above what the person could do now).
 * An uncounted one stays in place (review of bee9daf: without the order date
 * nobody can say it is far off), worded "give the order date to see whether
 * leave is needed" (thresholdAsk). Exported for test:next-step.
 */
/** What an uncounted leave threshold asks for: not a "last day", a point after which leave is needed. */
export const THRESHOLD_ASK = "Give the order date below to see whether leave is needed.";

export function thresholdNear(item: { threshold?: boolean; date?: string }, today: string = todayIso()): boolean {
  if (!item.threshold) return true;
  if (!item.date || !isRealIsoDate(item.date)) return true;
  const yearOut = `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;
  return item.date <= yearOut;
}

export function cardLimits(summary: Pick<NextStepSummary, "deadlines" | "periods">, responding: boolean, story = "", city = "", stepId = "", today: string = todayIso()) {
  const isConditional = (what: string) => /^(if|where|when|unless)\b/i.test(what.trim());
  const ownSide = (what: string) =>
    (responding ? /\bresponding\b|\bthe other party\b|\brespondent\b/i : /\bbringing\b|\bmoving party\b|\bapplicant\b|\bmade the motion\b/i).test(what);
  const otherSide = (what: string) =>
    (responding ? /\bbringing\b|\bmoving party\b|\bapplicant\b|\bmade the motion\b/i : /\bresponding\b|\bthe other party\b|\brespondent\b/i).test(what);
  const leads = <T extends { what: string }>(items: T[]) => items.filter((item) => !isConditional(item.what) || (ownSide(item.what) && !otherSide(item.what)));
  const backwards = (period: NextStepSummary["periods"][number]) => /counting backwards|\bbefore\b/i.test(`${period.countFrom} ${period.what}`);
  const byDue = (a: NextStepSummary["periods"][number], b: NextStepSummary["periods"][number]) =>
    backwards(a) !== backwards(b) ? (backwards(a) ? -1 : 1) : backwards(a) ? b.count - a.count : a.count - b.count;
  let deadlines = leads(summary.deadlines);
  let periods = leads(summary.periods);
  if (deadlines.length + periods.length === 0) {
    const neutralDeadlines = summary.deadlines.filter((item) => !otherSide(item.what));
    const neutralPeriods = summary.periods.filter((item) => !otherSide(item.what));
    deadlines = neutralDeadlines.slice(0, 1);
    periods = neutralDeadlines.length ? [] : neutralPeriods.slice(0, 1);
  }
  /*
   * Notices the person's words point to lead; notices for other kinds of
   * claim are left out once one fits (2026-10-13, walkthrough: a Toronto
   * sidewalk fall led with the general two years, its 10-day City notice
   * folded beside Crown and libel notices). When none fits, nothing changes.
   */
  const fit = (what: string) => noticeFit(what, story, city);
  // The one notice filter (keptForNotices), shared with the Case file and Timeline.
  const keptWhat = new Set(keptForNotices([...summary.deadlines, ...summary.periods], story, city).map((item) => item.what));
  const anyFits = [...summary.deadlines, ...summary.periods].some((item) => fit(item.what) === "fits");
  const keep = <T extends { what: string }>(items: T[]) => items.filter((item) => keptWhat.has(item.what));
  if (anyFits) {
    deadlines = [...summary.deadlines.filter((item) => fit(item.what) === "fits"), ...deadlines.filter((item) => fit(item.what) !== "not" && fit(item.what) !== "fits")];
    periods = [...summary.periods.filter((item) => fit(item.what) === "fits"), ...periods.filter((item) => fit(item.what) !== "not" && fit(item.what) !== "fits")];
  }
  /*
   * A limit the rule ties to a claim the person's words do not include is
   * folded, not led with (2026-10-13, walkthrough: a parenting-only respondent
   * led with "If the application or your answer has a property claim"; a
   * support-only motion to change led with the information program, which
   * r. 8.1 (1) para. 6 leaves out). Folded, never dropped.
   */
  const fitsClaims = (item: { id?: string; what: string }) => claimFit(item, story, stepId, responding) === "fits";
  const main = {
    deadlines: [...deadlines].filter(fitsClaims).filter((item) => thresholdNear(item, today)).sort((a, b) => a.date.localeCompare(b.date)),
    periods: [...periods].filter(fitsClaims).filter((item) => thresholdNear(item, today)).sort(byDue),
  };
  const conditional = {
    deadlines: keep(summary.deadlines).filter((item) => !main.deadlines.includes(item)),
    periods: keep(summary.periods).filter((item) => !main.periods.includes(item)),
  };
  // The information program on a motion to change, folded under its own
  // condition (r. 8.1 (1) para. 6) when the words do not show a change beyond
  // support: support-only, or not said (walkthrough run 38525903567, FM).
  const changeMip = {
    deadlines: conditional.deadlines.filter((item) => isChangeMip(item) && !fitsClaims(item)),
    periods: conditional.periods.filter((item) => isChangeMip(item) && !fitsClaims(item)),
  };
  const mipNote = changeMip.deadlines.length + changeMip.periods.length > 0 ? changeMipNoteFor(story, responding) : null;
  // Every dated limit the card shows, led or folded: the only ones its
  // passed-date box may speak of (review 2026-10-13: a dropped Municipal Act
  // notice still got its own red "passed" box).
  const kept = [...main.deadlines, ...conditional.deadlines];
  // The folded limits that are folded only because the words name no claim of their kind.
  // Only "If ..." lines: the information program note (mipNote) explains its own fold.
  const ifClaimed = (item: { id?: string; what: string }) => !fitsClaims(item) && isConditional(item.what);
  const notClaimed = {
    deadlines: conditional.deadlines.filter(ifClaimed),
    periods: conditional.periods.filter(ifClaimed),
  };
  return { main, conditional, notClaimed, mipNote, changeMip, kept };
}

/**
 * Service dates the story gives as the day the papers ARRIVED, for a way of
 * serving that counts from the day they were SENT (2026-10-13). Never counted
 * from; see arrivalNotSendDate.
 */
export function arrivalOnlyDates(args: {
  stageId: string;
  court: ServiceCourt | null;
  storyText: string;
  storyHints: Record<string, StoryHint>;
  methods: Record<string, ServiceMethod | undefined>;
  /** The person's side on an "either side" step. */
  responding?: boolean;
}): Record<string, string> {
  // Only where the person received the papers: "the day the papers reached
  // you" means nothing to the side that served them (legal review 2026-10-14).
  if (!args.court || !receivesPapersStep(args.stageId, args.responding)) return {};
  const storyMethod = serviceMethodShown(args.court, args.storyText)?.method ?? null;
  const out: Record<string, string> = {};
  for (const question of dateQuestionsForStep(args.stageId)) {
    if (!isServiceDateQuestion(question.id, question.question)) continue;
    const hint = args.storyHints[question.id];
    if (hint?.value && arrivalNotSendDate(args.methods[question.id] ?? storyMethod, hint.quote)) out[question.id] = hint.quote;
  }
  return out;
}

/**
 * The card's note for a service date the story gives as an arrival day, not
 * yet replaced by a date the person entered (2026-10-13). Null when there is
 * none. Exported for test:service-dates.
 */
export function arrivalNoteFor(
  questions: { id: string }[],
  arrival: Record<string, string>,
  answered: Record<string, string>,
  court: ServiceCourt | null,
  methods: Record<string, ServiceMethod | undefined>,
  storyMethod: ServiceMethod | null,
  /** The step and the story's own date for each arrival, so the latest last day can be counted (latestFromArrival). */
  bound?: { stageId: string; hints: Record<string, StoryHint | undefined>; responding?: boolean; storyText?: string },
  today: string = todayIso(),
): ArrivalNote | null {
  if (!court) return null;
  const question = questions.find((candidate) => arrival[candidate.id] && !answered[candidate.id]);
  if (!question) return null;
  const method = methods[question.id] ?? storyMethod;
  const claim = isOriginatingService(court, question.id);
  const servedOn = servedOnFor(bound?.storyText ?? "", bound?.stageId ?? "", Boolean(bound?.responding), method ?? undefined);
  const rule = serviceRulesFor(court, question.id, servedOn).find((candidate) => candidate.method === method);
  const dateToEnter = rule?.dateToEnter ?? "the day they were sent";
  const hint = bound?.hints[question.id];
  const arrivedOn = bound && hint?.value ? hint.value : "";
  const company = claim && (Boolean(method && COMPANY_ROUTE.has(method)) || companyIsTheParty(bound?.storyText ?? ""));
  return {
    quote: arrival[question.id],
    yearAssumed: Boolean(hint?.yearAssumed),
    arrivedOn,
    kind: claim ? "claim" : "sent",
    dateToEnter,
    rule: claim ? "" : (rule?.rule ?? ""),
    ruleQuote: claim ? "" : (rule?.quote ?? ""),
    effectiveSay: rule ? whenEffectiveSay(rule) : `service is effective on a day set from ${dateToEnter}`,
    latest: !claim && bound && arrivedOn ? latestFromArrival(bound.stageId, question.id, court, method, arrivedOn, today, bound.responding) : [],
    claimRule: claim ? originatingRuleFor(court, question.id) : null,
    postWays: claim ? postWaysForClaim(court, servedOn) : [],
    // Counted from the day they gave, never called the last day; called the
    // safest date only when their words say it is the FIRST copy to reach
    // the home (legal review 2026-10-14: the day the mailed copy arrived can
    // be after service took effect on a copy left or signed for earlier).
    safest: claim && bound && arrivedOn && receivesPapersStep(bound.stageId, bound.responding) ? countedFromService(bound.stageId, question.id, arrivedOn, today, Boolean(bound.responding)) : [],
    firstCopy: claim && firstCopyQuote(arrival[question.id]) && !company,
    company,
  };
}

/**
 * Whether a date from the story may be offered as a one-click count (2026-10-13,
 * walkthrough: "i got the plaintiffs claim in the mail on september 28" was
 * offered as "Which year was that?" and one click counted it as the mailing
 * day). An arrival-only date is never offered: the person gives the mailing
 * date instead. Exported for test:service-dates.
 */
export function offerStoryDate(questionId: string, arrival: Record<string, string>): boolean {
  return !arrival[questionId];
}

/** Saved dates without the story's arrival-only service dates (unless saved with how they were served). */
function withoutArrivalDates(
  answers: Record<string, string>,
  arrival: Record<string, string>,
  storyHints: Record<string, StoryHint>,
  service: Record<string, unknown>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(answers).filter(([id, value]) => !(arrival[id] && !service[id] && storyHints[id]?.value === value)),
  );
}

/**
 * The card's opening paragraph, without what does not concern this person
 * (held-back walkthrough, 2026-10-09): the portal sentence when the card's
 * own filing lines already name their portal ("Toronto uses ..." shown to a
 * Hamilton plaintiff), and the mortgage-action form for someone whose case is
 * not about a mortgage. Whole sentences or that one aside are dropped, never
 * reworded; the full answer below keeps every word.
 */
/** The Act's own words for the leave rule, with its section. */
// The leave rules in their own words, one place (leaveRuleWords.ts).
export { CJA_23_1_1_WORDS } from "@/src/lib/content-library/leaveRuleWords";

/**
 * The court's own word for a case started in it (Jason, 2026-10-24), applied where the
 * library's text is shown, never in the published library itself: a claim in Small Claims;
 * an action in the Superior Court, with "(lawsuit)" beside its first mention.
 */
export function courtWords(given: string, court: string): string {
  // The published library says the Courts of Justice Act s. 23 (1.1) rule and r. 14.01.1 (2), (3) in
  // its own words; on screen each is the Act's or the rule's words with its citation, and our "A claim
  // above it needs no such leave." goes (site owner, 2026-10-26 and 28). The library is never edited by hand.
  const text = given ? withLeaveRulesQuoted(given) : given;
  if (!text || !/\blawsuits?\b/i.test(text)) return text;
  if (court === "small-claims") return text.replace(/\blawsuit(s?)\b/g, "claim$1").replace(/\bLawsuit(s?)\b/g, "Claim$1");
  if (court === "civil") {
    let first = !/\baction \(lawsuit\)/i.test(text);
    return text.replace(/(\b[Aa] )?(?<!\()\blawsuit(s?)\b(?!\))/g, (_, article: string | undefined, plural: string) => {
      const lead = article ? (article.startsWith("A") ? "An " : "an ") : "";
      const shown = `${lead}action${plural}${first && !plural ? " (lawsuit)" : ""}`;
      first = false;
      return shown;
    });
  }
  return text;
}

/** The sentences naming what can be done only while the time runs (Form 18B). */
const SENTENCES_ONLY_WHILE_TIME_RUNS = /\bForm 18B\b|\bnotice of intent to defend\b/i;

/** A paragraph without its sentences that match: the rest, as written. */
export function withoutSentencesNaming(paragraph: string, naming: RegExp): string {
  if (!paragraph || !naming.test(paragraph)) return paragraph;
  return splitSentences(paragraph).filter((sentence) => !naming.test(sentence)).join(" ").replace(/\s+/g, " ").trim();
}

export function forThisPerson(paragraph: string, { userWords, filingShown }: { userWords: string; filingShown: boolean }): string {
  let text = paragraph;
  if (!/\bmortgage/i.test(userWords)) {
    text = text.replace(/,? or Form 14B for a mortgage action/g, "").replace(/ \(Form 14A, or Form 14B for a mortgage action\)/g, " (Form 14A)");
  }
  if (filingShown) {
    text = splitSentences(text)
      .filter((sentence) => !/\bportal\b/i.test(sentence))
      .join(" ");
  }
  return text.trim();
}

/**
 * "If you were served with a defendant's claim, what date was it served?" as
 * the label of an answer already known: "Served with a defendant's claim".
 */
export function shortLabel(question: string): string {
  if (question === MOVING_PARTY_MOTION_QUESTION) return "The other party received your motion to change";
  const head = question.split("?")[0].split(/,\s*what date|,\s*what is/i)[0].replace(/^If\s+/i, "");
  const served = /^you were (served with .+)$/i.exec(head);
  const text = served ? served[1] : head.replace(/^(?:a|an|the)\s+/i, "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatIso(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function StageAnswerPanel({
  courtPath,
  confirmedStage = null,
  responding = false,
  sideFromRecord = false,
  caseId = null,
  initialStepId = null,
  initialDateAnswers: givenDateAnswers = {},
  initialService: givenService = {},
  suggestedDates = {},
  storyHints = {},
  noticeStepId = null,
  userWords = "",
  recordedAmount = "",
  city = "",
  storyText = "",
  picture = null,
  motionToChange = null,
  suggestedStepId = null,
  laterDates = [],
  onSaved,
}: {
  courtPath: StagePathway;
  confirmedStage?: string | null;
  responding?: boolean;
  /** `responding` is the person's situation answer (situation.ts): it wins over the story's reading of the side. */
  sideFromRecord?: boolean;
  /**
   * With a case, the step the user picks and the dates they enter are saved
   * to it (master_result.position), so the case page and a return visit show
   * the same step. Without one, nothing is saved.
   */
  caseId?: string | null;
  /** The step this user picked before, from the case. Wins over the suggestion. */
  initialStepId?: string | null;
  initialDateAnswers?: Record<string, string>;
  /** How service dates were served, as saved (position.service; Step 2D). */
  initialService?: Record<string, { method: ServiceMethod; enteredOn: string }>;
  /** Exact dates the user recorded elsewhere, offered — never applied — as answers. */
  suggestedDates?: Record<string, SuggestedDate>;
  /** Sentences from the user's story about each moment, quoted beside its question. */
  storyHints?: Record<string, StoryHint>;
  /**
   * A written-notice step the person's claim and story point to
   * (claim-types/noticeStep.ts). Suggested first when nothing is filed yet,
   * because its deadline runs from the incident and comes before filing.
   */
  noticeStepId?: string | null;
  /** The user's own words, so a family step lists only the forms for their kind of case. */
  userWords?: string;
  /** The amount the user recorded, set against the court's limits at the starting step (amountNotes.ts). */
  recordedAmount?: string;
  /** The person's city, so the card names the filing portal for their region. */
  city?: string;
  /** The person's own story (not the analysis), read for a procedural event they name, such as "noted in default". */
  storyText?: string;
  /**
   * The case reader's checked reading of everything they wrote
   * (intake/caseReader.ts), when CASE_READER is on. Its step and dates come
   * first; without it, the phrase lists below are the fallback.
   */
  picture?: CasePicture | null;
  /** Their answer to the motion-to-change reading, so the moving party is asked their own date questions (servesPapersFor). */
  motionToChange?: MotionSide | null;
  /**
   * The step the front door's reading of the whole story places them at
   * (understanding/understandCase.ts, CLAUDE.md s. 2a). Shown as the
   * suggestion, with "Not right? Choose another step"; never saved as theirs.
   */
  suggestedStepId?: string | null;
  /**
   * Date questions whose day the person said they do not know, already offered once more
   * in the review (Jason, 2026-10-24, option 1): shown folded with "Add it", which is not a
   * second question (the case file, caseFile.ts).
   */
  laterDates?: readonly string[];
  /** Told what the person chose (dates and step), so a page that remounts this panel can show it again; called just AFTER the save to the case is queued, so positionSavesSettled(caseId) inside it waits for that save. */
  onSaved?: (saved: {
    stepId?: string | null;
    dateAnswers?: Record<string, string>;
    service?: Record<string, { method: ServiceMethod; enteredOn: string } | null>;
  }) => void;
}) {
  const options = stagesForPathway(courtPath).map((stage) => ({
    id: stage.id,
    group: groupOf(stage),
    label: stage.userQuestion,
  }));
  const noticeFirst =
    courtPath !== "family" &&
    !responding &&
    (confirmedStage === "starting-case" || !confirmedStage) &&
    Boolean(noticeStepId) &&
    options.some((option) => option.id === noticeStepId);
  const readStep = suggestedStepId && options.some((option) => option.id === suggestedStepId) ? suggestedStepId : "";
  const suggested = noticeFirst
    ? (noticeStepId as string)
    : readStep || stepFromPicture(courtPath, picture, responding, sideFromRecord) || suggestedStageFor(courtPath, confirmedStage, responding, storyText);
  // Dates the case reader found in their words, under what the guided intake recorded.
  const offeredDates = { ...datesFromPicture(picture), ...suggestedDates };
  /*
   * A save of these dates an earlier page in this tab left on its way (a reload, a typed address)
   * is sent by this page and counted here at once: the page that holds this panel may have read the
   * case before it landed (28 Oct, family reload; positionSave.ts, pendingPositionSaves.ts).
   */
  const replayedHere = caseId ? unsavedFromEarlierPage(caseId) : null;
  useEffect(() => {
    if (caseId) replayPendingPositionSaves(caseId);
  }, [caseId]);
  const replayedDates = JSON.stringify(replayedHere?.dateAnswers ?? {});
  const replayedService = JSON.stringify(replayedHere?.service ?? {});
  const givenDatesKey = JSON.stringify(givenDateAnswers);
  const givenServiceKey = JSON.stringify(givenService);
  const initialDateAnswers = useMemo<Record<string, string>>(
    () => ({ ...JSON.parse(givenDatesKey), ...Object.fromEntries(Object.entries(JSON.parse(replayedDates) as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== "")) }),
    [givenDatesKey, replayedDates],
  );
  const initialService = useMemo<Record<string, { method: ServiceMethod; enteredOn: string }>>(
    () => ({ ...JSON.parse(givenServiceKey), ...Object.fromEntries(Object.entries(JSON.parse(replayedService) as Record<string, unknown>).filter(([, entry]) => Boolean(entry) && typeof entry === "object")) }),
    [givenServiceKey, replayedService],
  );
  const savedStep = initialStepId && options.some((option) => option.id === initialStepId) ? initialStepId : "";
  const startingStep = savedStep || suggested;
  const [stageId, setStageId] = useState(startingStep);
  const [choosingStep, setChoosingStep] = useState(false);
  // A folded "not known yet" date the person chose to add after all.
  const [openedLater, setOpenedLater] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<Response | null>(null);
  const [municipality, setMunicipality] = useState("");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const initialServiceCourt: ServiceCourt | null = courtPath === "small-claims" || courtPath === "civil" || courtPath === "family" ? courtPath : null;
  const initialCountable = () =>
    withoutArrivalDates(
      initialDateAnswers,
      arrivalOnlyDates({
        stageId,
        court: initialServiceCourt,
        storyText: storyText ?? "",
        storyHints,
        methods: Object.fromEntries(Object.entries(initialService).map(([id, entry]) => [id, entry.method])),
        responding,
      }),
      storyHints,
      initialService,
    );
  const [dateAnswers, setDateAnswers] = useState<Record<string, string>>(initialCountable);
  const [dateDraft, setDateDraft] = useState<Record<string, string>>(initialCountable);
  // How the papers were served, per service date (Step 2D, 2026-10-12): the
  // deadline counts from the day service is effective, not the day typed.
  const [serviceMethod, setServiceMethod] = useState<Record<string, ServiceMethod>>(() =>
    Object.fromEntries(Object.entries(initialService).map(([id, entry]) => [id, entry.method])),
  );
  // What the story says about how the papers came, pre-selected (Step 2D).
  // Only from a sentence about the papers reaching them (serviceMethodShown).
  const storyServiceMethod =
    courtPath === "small-claims" || courtPath === "civil" || courtPath === "family" ? (serviceMethodShown(courtPath, storyText ?? "")?.method ?? null) : null;
  // A method already known (chosen, or from the story) is shown as a fact with
  // a Change button; the select opens only on Change or when none is known.
  const [changingMethod, setChangingMethod] = useState<Record<string, boolean>>({});
  const storyMethodShown = serviceCourt0(courtPath) ? serviceMethodShown(serviceCourt0(courtPath)!, storyText ?? "") : null;
  const [serviceSaved, setServiceSaved] = useState<Record<string, { method: ServiceMethod; enteredOn: string }>>(initialService);
  const serviceCourt: ServiceCourt | null = courtPath === "small-claims" || courtPath === "civil" || courtPath === "family" ? courtPath : null;
  // The story's way of serving, for one question, only if the rules allow it
  // for those papers: "in the mail" is never offered for a claim or an
  // application (legal review 2026-10-14; serviceRulesFor with the question).
  // The moving party on a motion to change served it: their questions are
  // about the other party receiving it (servesPapersFor; walkthrough FM).
  const serving = (questionId: string) => servesPapersFor(stageId, questionId, serviceCourt, responding, motionToChange);
  // The ways offered for one question: the same list everywhere on this panel
  // (review of bee9daf), for who was served (servedOnFor) and said from the
  // side that served when the person served them (serving).
  const waysFor = (questionId: string) =>
    serviceCourt
      ? serviceRulesFor(serviceCourt, questionId, servedOnFor(storyText || userWords, stageId, responding, serviceMethod[questionId]), serving(questionId))
      : [];
  // The story tells how papers reached the person; never how they served theirs.
  const storyMethodFor = (questionId: string): ServiceMethod | null =>
    serviceCourt && storyServiceMethod && !serving(questionId) && waysFor(questionId).some((rule) => rule.method === storyServiceMethod) ? storyServiceMethod : null;
  const [dateStatus, setDateStatus] = useState<"" | "saving" | "saved" | "not-saved">("");
  /*
   * Page review 2026-10-07: a confirmed defendant scrolled 36 to 48 steps,
   * half of them the other side's (and saw "I have a settlement conference
   * date" twice, once per side). Once the side is known, the list shows that
   * side and "either side"; the rest is one tap away, never removed.
   */
  const [showOtherSide, setShowOtherSide] = useState(false);
  /*
   * A full date the person already gave -- in the guided intake, in their
   * story, or found by the case reader in their words -- is USED for the count
   * straight away and shown as theirs, instead of being asked again (held-back
   * walkthrough, 2026-10-09: "on september 25 2026 his lawyer served me" and
   * the page asked "what date was it served?"). Nothing is saved until they
   * confirm it (CLAUDE.md section 4); "No, change it" drops it.
   */
  const [rejected, setRejected] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const offeredKey = JSON.stringify(offeredDates);
  const hintsKey = JSON.stringify(storyHints);
  /*
   * A service date the story gives as the day the papers ARRIVED, when the
   * way they came (mail, courier) counts from the day they were SENT
   * (2026-10-13: "i got the plaintiffs claim in the mail on september 28" was
   * counted as if mailed that day). Never counted from; the person is asked
   * for the mailing date, with what they wrote shown beside it.
   */
  const methodKey = JSON.stringify(serviceMethod);
  const arrivalOnly = useMemo(
    () => arrivalOnlyDates({ stageId, court: serviceCourt, storyText: storyText ?? "", storyHints, methods: serviceMethod, responding }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hintsKey, stageId, methodKey, storyText, responding],
  );
  const arrivalKey = JSON.stringify(arrivalOnly);
  const storyDates = useMemo(() => {
    const out: Record<string, { value: string; basis: string }> = {};
    for (const [id, hint] of Object.entries(storyHints)) {
      if (hint.value && !hint.yearAssumed && !arrivalOnly[id]) out[id] = { value: hint.value, basis: hintBasis(hint.quote, storyText) };
    }
    for (const [id, offered] of Object.entries(offeredDates)) {
      if (offered.value && !offered.yearAssumed && !arrivalOnly[id]) out[id] = { value: offered.value, basis: offered.basis };
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offeredKey, hintsKey, arrivalKey, storyText]);
  const withStoryDates = (answers: Record<string, string>, dropped: Record<string, boolean> = rejected) => {
    const fromStory: Record<string, string> = {};
    for (const [id, date] of Object.entries(storyDates)) if (!dropped[id]) fromStory[id] = date.value;
    return { ...fromStory, ...answers };
  };
  /** The person chooses a step: from "Where is your case?", or the card's "Open this step" (whenTimeRunsOut). */
  function chooseStep(id: string) {
    setStageId(id);
    setChoosingStep(false);
    setResult(null);
    setMunicipality("");
    // Choosing the Toronto question IS the person saying it was in
    // Toronto — the fact comes from them, which is what the stage's
    // confirmed-fact rule requires. Every other municipality has its
    // own question.
    const facts = factsForStep(id, "");
    setMunicipality(facts.municipality ?? "");
    if (id) void load(id, facts);
    // The user picked this: recorded on their case (queued first, so
    // a page that waits for the save before reading waits for this
    // one), and kept on the page for this visit.
    if (caseId) void savePosition(caseId, { stepId: id || null });
    onSaved?.({ stepId: id || null });
  }

  const amountNote = amountNoteFor({ courtPath, stepId: stageId, recordedAmount });

  // Dates saved to the case after this panel mounted (the guided intake's
  // confirmed dates are saved with the case) are counted when they arrive.
  const initialKey = JSON.stringify(initialDateAnswers);
  useEffect(() => {
    // A saved service date that is the story's arrival day, saved without how
    // it was served, is not counted from (see arrivalOnly).
    const arriving = Object.entries(withoutArrivalDates(initialDateAnswers, arrivalOnly, storyHints, initialService)).filter(
      ([key, value]) => value && !(key in dateAnswers),
    );
    if (!arriving.length) return;
    const next = { ...Object.fromEntries(arriving), ...dateAnswers };
    setDateAnswers(next);
    setDateDraft((current) => ({ ...Object.fromEntries(arriving), ...current }));
    if (stageId) void load(stageId, factsForStep(stageId, municipality), next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  // Show the saved (or suggested) step's answer straight away; the user can change it.
  //
  // Choosing a step saves it, the case page reads the case again, and
  // initialStepId -- so startingStep -- changes to the step just chosen
  // (review 2026-10-13). Reloading it with no facts brought back "Which city?"
  // on the Small Claims Toronto notice step the person had just answered.
  // The facts already given are kept (factsForStep), and a step already on
  // screen is not reloaded at all.
  useEffect(() => {
    if (startingStep && startingStep === stageId && result) return;
    setStageId(startingStep);
    // The Toronto fact only for a step the person chose (savedStep), never
    // for one the site suggested: the fact must come from them.
    const given = startingStep === stageId ? municipality : "";
    if (startingStep) void load(startingStep, startingStep === savedStep ? factsForStep(startingStep, given) : given ? { municipality: given } : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startingStep]);

  async function load(
    id: string,
    facts: Record<string, string> = {},
    answers: Record<string, string> = dateAnswers,
    dropped: Record<string, boolean> = rejected,
  ) {
    setLoading(true);
    setFailed(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/case/stage-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ caseId, stageId: id, courtPath, confirmedFacts: facts, dateAnswers: withStoryDates(answers, dropped) }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setResult((await response.json()) as Response);
    } catch {
      setResult(null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  async function countDeadline(draft: Record<string, string>) {
    if (result?.outcome !== "rendered") return;
    const asked = Object.fromEntries(
      (result.dateQuestions ?? []).map((question) => [question.id, draft[question.id] ?? ""]),
    );
    // A service date counts from the day service is effective under the
    // court's rules for how it was served (serviceEffectiveDate.ts).
    const servicePatch: Record<string, { method: ServiceMethod; enteredOn: string } | null> = {};
    for (const question of result.dateQuestions ?? []) {
      const typed = asked[question.id];
      const method = serviceMethod[question.id] ?? storyMethodFor(question.id) ?? undefined;
      if (!serviceCourt || !isServiceDateQuestion(question.id, question.question)) continue;
      if (typed && method) {
        asked[question.id] = effectiveServiceDate(serviceCourt, method, typed).date;
        servicePatch[question.id] = { method, enteredOn: typed };
      } else {
        servicePatch[question.id] = null;
      }
    }
    setServiceSaved((current) => {
      const out = { ...current };
      for (const [id, entry] of Object.entries(servicePatch)) {
        if (entry) out[id] = entry;
        else delete out[id];
      }
      return out;
    });
    const next = { ...dateAnswers };
    for (const [key, value] of Object.entries(asked)) {
      if (value) next[key] = value;
      else delete next[key];
    }
    setDateAnswers(next);
    void load(stageId, factsForStep(stageId, municipality), next);
    // The page keeps what the person chose for this visit whether or not the
    // save below succeeds, so Back and Forward show the counted date again
    // (walkthrough, 2026-10-08: it was kept only after a successful save, and
    // two runs lost it on returning to the results).
    //
    // The save is QUEUED first, then onSaved is told (review 2026-10-13): the
    // case page's onSaved waits for positionSavesSettled(caseId) before it
    // reads the case again, and that wait returns at once if nothing is
    // queued yet.
    // The step is saved with the dates: counting a deadline at the suggested
    // step is the user acting on it, and the case file needs the step to show
    // the counted date (page review, 2026-10-06).
    const saving = caseId
      ? savePosition(caseId, {
          dateAnswers: asked,
          stepId: stageId || null,
          ...(Object.keys(servicePatch).length ? { service: servicePatch } : {}),
        })
      : null;
    onSaved?.({ dateAnswers: next, stepId: stageId || null, ...(Object.keys(servicePatch).length ? { service: servicePatch } : {}) });
    if (!saving) return;
    setDateStatus("saving");
    const saved = await saving;
    setDateStatus(saved ? "saved" : "not-saved");
  }

  /*
   * A full date the person wrote in their story (with its year) is kept with
   * the case as soon as it is shown, instead of waiting for "Yes, save this
   * date" (build order Step 2B, 2026-10-12). It is their own statement, not a
   * guess; the deadline was already counted from it; and the walkthrough
   * flagged the waiting prompt as asking again on 8 cases, including after
   * every reload, because nothing was saved until the click. The quote it
   * came from stays on screen with "Change", and a date with no year is still
   * asked (yearAssumed never reaches storyDates).
   */
  const [keptFromStory, setKeptFromStory] = useState<Record<string, string>>({});
  const autoKeptFor = useRef("");
  useEffect(() => {
    if (result?.outcome !== "rendered") return;
    const fill: Record<string, string> = {};
    const bases: Record<string, string> = {};
    for (const question of result.dateQuestions ?? []) {
      const story = storyDates[question.id];
      if (story && !dateAnswers[question.id] && !rejected[question.id]) {
        fill[question.id] = story.value;
        bases[question.id] = story.basis;
      }
    }
    const key = `${stageId}|${JSON.stringify(fill)}`;
    if (Object.keys(fill).length === 0 || autoKeptFor.current === key) return;
    autoKeptFor.current = key;
    setKeptFromStory((current) => ({ ...current, ...bases }));
    setDateDraft((current) => ({ ...current, ...fill }));
    // A service date with the way it was served from the story counts from
    // the day service is effective, like a date typed in (Step 2D).
    const keptService: Record<string, { method: ServiceMethod; enteredOn: string }> = {};
    const counted = { ...fill };
    for (const question of result.dateQuestions ?? []) {
      const storyMethod = storyMethodFor(question.id);
      if (!fill[question.id] || !serviceCourt || !storyMethod || !isServiceDateQuestion(question.id, question.question)) continue;
      keptService[question.id] = { method: storyMethod, enteredOn: fill[question.id] };
      counted[question.id] = effectiveServiceDate(serviceCourt, storyMethod, fill[question.id]).date;
    }
    if (Object.keys(keptService).length) setServiceSaved((current) => ({ ...current, ...keptService }));
    const next = { ...dateAnswers, ...counted };
    setDateAnswers(next);
    // Only the dates: the step is saved when the person acts on it, never
    // because a date was kept (case position stores only what they chose).
    // Queued before onSaved is told, so a page waiting on it waits for it.
    if (caseId) {
      void savePosition(caseId, { dateAnswers: counted, ...(Object.keys(keptService).length ? { service: keptService } : {}) }).then((saved) =>
        setDateStatus(saved ? "saved" : "not-saved"),
      );
    }
    onSaved?.({ dateAnswers: next, ...(Object.keys(keptService).length ? { service: keptService } : {}) });
    // Counted straight away, as a date that arrives saved is (above): the deadline needed a
    // second "Count my deadline" press once the date was saved (Charter re-test 2026-10-26).
    // autoKeptFor stops the answer this brings back from keeping the same dates again.
    if (stageId) void load(stageId, factsForStep(stageId, municipality), next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, storyDates, stageId]);

  return (
    <section
      data-testid="stage-answer-panel"
      data-stage-id={stageId}
      className="rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm"
    >
      <h3 className="text-lg font-bold text-[#10231f]">What happens next at your exact step</h3>
      <p className="mt-2 text-sm leading-6 text-[#4d675f]">
        {noticeFirst && suggested === stageId
          ? "Before filing: this step may apply to the kind of claim you described. It shows a written-notice deadline counted from the day of the injury, with the rule it comes from. If it does not fit, choose the question closest to where your case is."
          : suggested
          ? "This step is suggested for your case. If it is not right, choose the question closest to where your case is."
          : "Choose the question closest to where your case is. We will show what the court rules and official guides say about that step, with the sources."}
      </p>

      {/* With a step already suggested from what they told us, the person sees
          it named, not a "Where is your case?" list asking them again
          (walkthrough, 2026-10-08: the list stayed open after every stage was
          confirmed, and read as the question being asked twice). The list is
          one click away. */}
      {stageId && !choosingStep ? (
        <p className="mt-4 text-sm text-[#16302b]" data-testid="stage-answer-current">
          <span className="font-semibold">Your step: </span>
          {/* Fitted to the one notice the person's words keep (walkthrough run
              38500825561, SW), else the step's own question. */}
          {(result?.outcome === "rendered" && result.nextStep ? stepTitleFor(result.nextStep, userWords, city) : null) ??
            options.find((option) => option.id === stageId)?.label ??
            ""}{" "}
          <button
            type="button"
            data-testid="stage-answer-change"
            onClick={() => setChoosingStep(true)}
            className="font-semibold text-[#2f7d67] underline"
          >
            Not right? Choose another step
          </button>
        </p>
      ) : null}
      <label className={stageId && !choosingStep ? "hidden" : "mt-4 block"}>
        <span className="text-sm font-semibold text-[#16302b]">Where is your case?</span>
        <select
          aria-label="Where is your case?"
          data-testid="stage-answer-select"
          value={stageId}
          onChange={(event) => chooseStep(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
        >
          <option value="">Choose one…</option>
          {orderGroupsForReader(GROUPS[courtPath], responding)
            .filter(
              (group) =>
                showOtherSide ||
                !confirmedStage ||
                !group.label.startsWith("Other situations") ||
                options.some((option) => option.group === group.side && option.id === stageId),
            )
            .map((group) => (
            <optgroup key={group.side} label={group.label}>
              {options.filter((option) => option.group === group.side).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {confirmedStage && !showOtherSide && (choosingStep || !stageId) ? (
        <button
          type="button"
          data-testid="stage-answer-show-other-side"
          onClick={() => setShowOtherSide(true)}
          className="mt-2 text-sm font-semibold text-[#2f7d67] underline"
        >
          Show the other side&apos;s steps too
        </button>
      ) : null}

      {loading && <p className="mt-3 text-sm text-[#4d675f]">Loading…</p>}
      {failed && (
        <p className="mt-3 text-sm text-[#7a4b12]">
          We could not load this just now. Please try again.
        </p>
      )}

      {result?.outcome === "rendered" && result.nextStep ? (
        <NextStepCard
          onChooseStep={chooseStep}
          summary={result.nextStep}
          answer={result.answer}
          court={courtPath}
          userWords={userWords}
          askedForDates={(result.dateQuestions ?? []).some((question) => !dateAnswers[question.id] && !(storyDates[question.id] && !rejected[question.id]))}
          stepId={stageId}
          city={city}
          responding={responding}
          noticeStepId={noticeStepId ?? ""}
          fromStory={(result.dateQuestions ?? [])
            .filter((question) => !dateAnswers[question.id] && storyDates[question.id] && !rejected[question.id])
            .map((question) => ({ label: "", date: formatIso(storyDates[question.id].value), basis: storyDates[question.id].basis }))}
          arrival={arrivalNoteFor(result.dateQuestions ?? [], arrivalOnly, dateAnswers, serviceCourt, serviceMethod, storyServiceMethod, {
            stageId,
            hints: storyHints,
            responding,
            storyText: storyText ?? "",
          })}
        />
      ) : null}

      {result?.outcome === "rendered" && (result.dateQuestions?.length ?? 0) > 0 && (
        <div id="work-out-your-dates" data-testid="stage-answer-dates" className="mt-5 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
          <p className="text-sm font-semibold text-[#16302b]">Work out your dates</p>
          <p className="mt-1 text-sm leading-6 text-[#4d675f]">
            Give the date and we will count the deadline for you, with the working shown below.
            Leave it empty if you do not know. You will still see the time period.
          </p>
          <div className="mt-3 space-y-4">
            {result.dateQuestions!.map((question) => {
              if (laterDates.includes(question.id) && !dateAnswers[question.id] && !openedLater[question.id]) {
                return (
                  <p key={question.id} data-testid="stage-answer-date-later" className="text-sm text-[#16302b]">
                    <span className="font-semibold">{shortLabel(dateQuestionTextFor(question, serving(question.id)))}:</span> not known yet.{" "}
                    <button type="button" onClick={() => setOpenedLater((now) => ({ ...now, [question.id]: true }))} className="font-semibold text-[#2f7d67] underline">Add it</button>
                  </p>
                );
              }
              const hint = storyHints[question.id];
              // An arrival day is not offered as the date to count from (see offerStoryDate).
              const suggestion: { value: string; basis: string; yearAssumed?: boolean } | undefined = !offerStoryDate(question.id, arrivalOnly)
                ? undefined
                : offeredDates[question.id] ??
                  (hint?.value
                    ? { value: hint.value, basis: hintBasis(hint.quote, storyText), yearAssumed: hint.yearAssumed }
                    : undefined);
              const value = dateDraft[question.id] ?? "";
              const saved = dateAnswers[question.id];
              const fromStory = !saved && !rejected[question.id] ? storyDates[question.id] : undefined;
              if ((saved || fromStory) && !editing[question.id]) {
                return (
                  <div key={question.id} data-testid={`stage-answer-known-${question.id}`}>
                    <p className="text-sm text-[#16302b]">
                      <span className="font-semibold">{shortLabel(dateQuestionTextFor(question, serving(question.id)))}:</span> {formatIso(saved || fromStory!.value)}
                    </p>
                    {saved && serviceCourt && serviceSaved[question.id] ? (
                      (() => {
                        const entry = serviceSaved[question.id];
                        const how = waysFor(question.id).find((rule) => rule.method === entry.method);
                        const effective = effectiveServiceDate(serviceCourt, entry.method, entry.enteredOn);
                        return (
                          <p data-testid={`stage-answer-service-${question.id}`} className="text-xs text-[#16302b]">
                            {how?.label ?? entry.method}, {formatIso(entry.enteredOn)}.{" "}
                            {effective.date !== entry.enteredOn ? `Service counts from ${formatIso(effective.date)}` : "Service counts from that day"}
                            {effective.rules.length ? ` (${effective.rules.join("; ")})` : ""}.
                            {effective.confirm ? ` ${effective.confirm}` : ""}
                          </p>
                        );
                      })()
                    ) : null}
                    <p className="text-xs text-[#4d675f]">
                      {saved
                        ? keptFromStory[question.id]
                          ? `${keptFromStory[question.id].replace(/^from your/, "From your")}. Saved to your case.`
                          : "Saved to your case."
                        : `${fromStory!.basis.replace(/^from your/, "From your")}`}{" "}
                      Used for:{" "}
                      {question.sets.join("; ")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {fromStory ? (
                        <button
                          type="button"
                          data-testid={`stage-answer-date-suggestion-${question.id}`}
                          // Held while a deadline is counted ("Counting your deadline…" says so): pressed twice it counted twice (fresh review, 28 Oct).
                          disabled={dateStatus === "saving"}
                          onClick={() => {
                            const draft = { ...dateDraft, [question.id]: fromStory.value };
                            setDateDraft(draft);
                            void countDeadline(draft);
                          }}
                          className="rounded-xl bg-[#2f7d67] px-4 py-2 text-sm font-semibold text-white"
                        >
                          Yes, save this date
                        </button>
                      ) : null}
                      <button
                        type="button"
                        data-testid={`stage-answer-date-change-${question.id}`}
                        data-replaced-while-working="the date opens for editing at once; the step's answer reloads behind it"
                        onClick={() => {
                          setEditing({ ...editing, [question.id]: true });
                          // Edit the day they typed, not the day service is effective.
                          if (serviceSaved[question.id]) setDateDraft({ ...dateDraft, [question.id]: serviceSaved[question.id].enteredOn });
                          if (fromStory) {
                            const dropped = { ...rejected, [question.id]: true };
                            setRejected(dropped);
                            void load(stageId, factsForStep(stageId, municipality), dateAnswers, dropped);
                          }
                        }}
                        className="rounded-xl border border-[#d8e6df] bg-white px-4 py-2 text-sm font-semibold text-[#2f7d67]"
                      >
                        {fromStory ? "No, change it" : "Change"}
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={question.id} data-testid="stage-answer-date-question" data-question-id={question.id}>
                  {serviceCourt &&
                  isServiceDateQuestion(question.id, question.question) &&
                  serviceMethodDisplay(serviceMethod[question.id], storyMethodFor(question.id), Boolean(changingMethod[question.id])) !== "choose" ? (
                    <div data-testid={`stage-answer-service-method-known-${question.id}`} className="mb-2 text-sm text-[#16302b]">
                      {/* A suggestion from their words, never stated as settled (review 2026-10-13). */}
                      <span className="font-semibold">
                        {serviceMethodDisplay(serviceMethod[question.id], storyMethodFor(question.id), false) === "chosen"
                          ? serving(question.id)
                            ? "How it was served on them: "
                            : "How the papers were served: "
                          : "From what you told us, the papers came this way: "}
                      </span>
                      {waysFor(question.id).find((rule) => rule.method === (serviceMethod[question.id] ?? storyMethodFor(question.id)))?.label ?? ""}.
                      {!serviceMethod[question.id] && storyMethodShown?.quote ? (
                        <span className="block text-xs text-[#4d675f]">You wrote: &ldquo;{storyMethodShown.quote}&rdquo; If that is not how the papers were served, choose Change.</span>
                      ) : null}{" "}
                      <button
                        type="button"
                        data-testid={`stage-answer-service-method-change-${question.id}`}
                        onClick={() => setChangingMethod({ ...changingMethod, [question.id]: true })}
                        className="font-semibold text-[#2f7d67] underline"
                      >
                        Change
                      </button>
                    </div>
                  ) : serviceCourt && isServiceDateQuestion(question.id, question.question) ? (
                    <label className="mb-2 block">
                      <span className="text-sm font-semibold text-[#16302b]">
                        {serving(question.id) ? "How was your motion to change served on the other party?" : "How were the papers served?"}
                      </span>
                      <span className="block text-xs text-[#4d675f]">
                        The rules count service from a different day depending on how it was done.
                      </span>
                      <select
                        data-testid={`stage-answer-service-method-${question.id}`}
                        value={serviceMethod[question.id] ?? storyMethodFor(question.id) ?? ""}
                        onChange={(event) => {
                          setServiceMethod({ ...serviceMethod, [question.id]: event.target.value as ServiceMethod });
                          if (event.target.value) setChangingMethod({ ...changingMethod, [question.id]: false });
                        }}
                        className="mt-2 rounded-xl border border-[#d8e6df] bg-white px-3 py-2"
                      >
                        <option value="">Choose how</option>
                        {waysFor(question.id).map((rule) => (
                          <option key={rule.method} value={rule.method}>
                            {rule.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="block">
                    <span className="text-sm font-semibold text-[#16302b]">
                      {serviceCourt && (serviceMethod[question.id] ?? (isServiceDateQuestion(question.id, question.question) ? storyMethodFor(question.id) : null))
                        ? `Enter ${waysFor(question.id).find((rule) => rule.method === (serviceMethod[question.id] ?? storyMethodFor(question.id)))?.dateToEnter ?? "the date"}`
                        : dateQuestionTextFor(question, serving(question.id))}
                    </span>
                    <span className="block text-xs text-[#4d675f]">Used for: {question.sets.join("; ")}</span>
                    <input
                      type="date"
                      data-testid={`stage-answer-date-${question.id}`}
                      value={value}
                      onChange={(event) => setDateDraft({ ...dateDraft, [question.id]: event.target.value })}
                      className="mt-2 rounded-xl border border-[#d8e6df] bg-white px-3 py-2"
                    />
                  </label>
                  {arrivalOnly[question.id] && !value && serviceCourt ? (
                    <p className="mt-2 text-sm leading-6 text-[#16302b]" data-testid={`stage-answer-arrival-${question.id}`}>
                      {(() => {
                        // The same words as the card's note (walkthrough 2026-10-14, RN): what the rule
                        // says about when service is effective, never "counts from the day it was mailed".
                        const rule = waysFor(question.id).find((candidate) => candidate.method === (serviceMethod[question.id] ?? storyMethodFor(question.id)));
                        if (isOriginatingService(serviceCourt, question.id) && !rule) {
                          // A claim or application (legal review 2026-10-14): the rule on how it is served,
                          // and the ways above; never a mail rule, never whether service was valid.
                          return `You wrote: “${arrivalOnly[question.id]}” That is the day the papers reached you. ${originatingRuleFor(serviceCourt, question.id).say} Choose how above, and give the day it asks for. The other side's affidavit of service shows how and when, and the court office can tell you.`;
                        }
                        const effective = rule ? whenEffectiveSay(rule) : "service is effective on a day set from the day they were sent";
                        return `You wrote: “${arrivalOnly[question.id]}” That is the day the papers reached you. For papers sent this way, ${effective}, not on the day they arrived. Give ${
                          rule?.dateToEnter ?? "the day they were sent"
                        } above. The envelope or the other side's proof of service often shows it, and the court office can tell you.`;
                      })()}
                    </p>
                  ) : null}
                  {hint && !hint.value && !suggestion && !value ? (
                    <p className="mt-2 text-sm text-[#4d675f]" data-testid={`stage-answer-story-hint-${question.id}`}>
                      {/*
                        2026-10-17 live bug: this always said "Pick that date
                        above, with its year" -- right for a date missing
                        only its year, but wrong and confusing when the
                        quoted sentence has no date in it at all ("He never
                        paid anything" was quoted here and told the person
                        to "pick that date"). hint.mentionsDate tells the two
                        apart; false means genuinely no date was found.
                      */}
                      You wrote: &ldquo;{hint.quote}&rdquo;{" "}
                      {hint.mentionsDate === false
                        ? "That doesn't give a date. Enter it above if you know it."
                        : "Pick that date above, with its year."}
                    </p>
                  ) : null}
                  {suggestion && !value && suggestion.yearAssumed ? (
                    // The person gave a month and day but no year. The deadline
                    // depends on the year, so we ask instead of guessing
                    // (site owner, 2026-10-08: "why wouldn't the site ask for
                    // the year when it knows the rule depends on it?"). One
                    // click on their year uses it and counts the deadline.
                    <div className="mt-2" data-testid={`stage-answer-year-choice-${question.id}`}>
                      <p className="text-sm text-[#16302b]">
                        {suggestion.basis.replace(/^from your/, "From your")}.{" "}
                        <span className="font-semibold">Which year was that?</span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {yearChoices(suggestion.value).map((choice) => (
                          <button
                            key={choice}
                            type="button"
                            data-testid={`stage-answer-year-${question.id}-${choice.slice(0, 4)}`}
                            disabled={dateStatus === "saving"}
                            onClick={() => {
                              const draft = { ...dateDraft, [question.id]: choice };
                              setDateDraft(draft);
                              void countDeadline(draft);
                            }}
                            className="rounded-xl border border-[#2f7d67] bg-white px-4 py-2 text-sm font-semibold text-[#2f7d67]"
                          >
                            {formatIso(choice)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : suggestion && !value ? (
                    // One click uses the suggested date AND counts the deadline:
                    // choosing it is the user's confirmation (page review,
                    // 2026-10-06: no served person ever saw their due date).
                    <button
                      type="button"
                      data-testid={`stage-answer-date-suggestion-${question.id}`}
                      disabled={dateStatus === "saving"}
                      onClick={() => {
                        const draft = { ...dateDraft, [question.id]: suggestion.value };
                        setDateDraft(draft);
                        void countDeadline(draft);
                      }}
                      className="mt-2 block rounded-xl border border-[#2f7d67] bg-white px-4 py-2 text-left text-sm font-semibold text-[#2f7d67]"
                    >
                      Count my deadline from {formatIso(suggestion.value)}
                      <span className="block text-xs font-normal text-[#4d675f]">{suggestion.basis}</span>
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-testid="stage-answer-dates-save"
              disabled={dateStatus === "saving"}
              aria-busy={dateStatus === "saving"}
              onClick={() => void countDeadline(dateDraft)}
              className="rounded-xl bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {/* It says it is working, not only greys out (Charter re-test 27 Oct). */}
              {dateStatus === "saving" ? "Counting your deadline…" : "Count my deadline"}
            </button>
            {dateStatus === "saving" ? <span role="status" data-testid="stage-answer-dates-working" className="sr-only">Counting your deadline</span> : null}
            {dateStatus === "saved" ? <span className="text-sm text-[#2f7d67]">Saved to your case.</span> : null}
            {dateStatus === "not-saved" ? (
              <span className="text-sm text-[#7a4b12]">Shown here, but it could not be saved to your case.</span>
            ) : null}
          </div>
        </div>
      )}

      {result?.outcome === "rendered" && amountNote ? (
        <div data-testid="stage-answer-amount" className="mt-5 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
          <p className="text-sm font-semibold text-[#16302b]">Your amount</p>
          <p className="mt-1 text-sm leading-6 text-[#2b4640]">{amountNote.text}</p>
          <p className="mt-2 text-xs leading-5 text-[#4d675f]">
            {amountNote.sources.map((source, index) => (
              <span key={`${source.sourceId}-${source.pinpoint}`}>
                {index > 0 ? "; " : "Source: "}
                <a href={officialUrl(source)} target="_blank" rel="noreferrer" className="underline">
                  {sourceName(source)}
                </a>
                , {source.pinpoint}
              </span>
            ))}
          </p>
        </div>
      ) : null}

      {result?.outcome === "rendered" && result.nextStep ? (
        <details data-testid="stage-answer-full" className="mt-5 rounded-2xl border border-[#d8e6df] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#2f7d67]">
            The full answer for this step, with every rule and source
          </summary>
          <AnswerView
            answer={result.answer}
            court={courtPath}
            userWords={userWords}
            underCard={cardShowsLead(result.nextStep, userWords, city)}
            servedWhen={servedWhenOf(result.nextStep)}
          />
        </details>
      ) : result?.outcome === "rendered" ? (
        <AnswerView answer={result.answer} court={courtPath} userWords={userWords} />
      ) : null}

      {result?.outcome === "needs-a-fact" && (
        <div className="mt-4">
          <label className="block">
            <span className="text-sm font-semibold text-[#16302b]">{result.question}</span>
            <input
              data-testid="stage-answer-fact"
              value={municipality}
              onChange={(event) => setMunicipality(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
            />
          </label>
          <button
            type="button"
            disabled={!municipality.trim()}
            onClick={() => void load(stageId, { municipality })}
            className="mt-3 rounded-xl bg-[#2f7d67] px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            Show the steps for that place
          </button>
          {result.answer && <AnswerView answer={result.answer} court={courtPath} userWords={userWords} />}
        </div>
      )}

      {result?.outcome === "unavailable" && (
        <p className="mt-3 rounded-xl border border-[#f0c88a] bg-[#fffaf2] px-4 py-3 text-sm leading-6 text-[#7a4b12]">
          {result.message}
        </p>
      )}
    </section>
  );
}
