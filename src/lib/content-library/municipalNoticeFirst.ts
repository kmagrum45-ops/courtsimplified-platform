/**
 * The notice to a municipality, shown FIRST in the intake when the person's
 * words show they were hurt on a municipal sidewalk, road or bridge.
 *
 * WHY (senior-lawyer review, round 4, 2026-10-14; persona
 * civil-plaintiff-municipal-slip): "I slipped on ice on the sidewalk on Queen
 * Street in Toronto on September 30 ... I want to sue the city." The intake's
 * only legal line was a model-written question citing Municipal Act, 2001
 * s. 44 (9), which s. 7.1 (1) says does not apply to the City of Toronto; and
 * nothing said that the City of Toronto Act, 2006 s. 42 (6) bars the action
 * unless written notice reaches the city clerk within 10 days of the injury --
 * a date that, on October 14, had already passed.
 *
 * WHAT IT IS: fixed words, never model text. The rule is the stage map's own
 * deadline (deadline:civil:toronto-notice-10-days, or the Municipal Act's
 * deadline:civil:municipal-notice-10-days outside Toronto), with its quote
 * (checked against the saved text by test:stage-map). The last day is counted
 * by the deadline engine from the injury date in the story (the same reading
 * the next-step card uses, storyHintsForDates), and its standing today --
 * passed, or run on past a closed day under Legislation Act s. 89 (2) -- in
 * the card's own words (deadlineStandingFor, todayInOntario). The rule's own
 * "is not a bar" exceptions are quoted (s. 42 (7) and (8)), with the card's
 * line that what a judge finds is for the judge to decide. Nothing here says
 * whether the person has a case or how an exception would go (CLAUDE.md s. 3).
 *
 * Pure and client-safe. Asserted by `npm run test:municipal-notice-first`.
 */

import { storyHintsForDates } from "../case-system/casePosition";
import type { RuleCitation } from "../case-system/stage-map/citations";
import { S_TORONTO_42_6_NOTICE } from "../case-system/stage-map/citations";
import { findStage, type StageDeadline } from "../case-system/stage-map/stageMap";
import { computedDeadlinesFor } from "./computedDeadline";
import { formatLongDate } from "../case-system/deadlines/holidays";
import {
  deadlineStandingFor,
  municipalPlaceOf,
  municipalWayInjury,
  notABarExceptions,
  todayInOntario,
  type DeadlineStanding,
  type MunicipalPlace,
} from "./nextStepPractical";

export const NOTICE_STEP_ID = "civil:before-filing:notice-required-before-suing";
export const TORONTO_DEADLINE_ID = "deadline:civil:toronto-notice-10-days";
export const MUNICIPAL_DEADLINE_ID = "deadline:civil:municipal-notice-10-days";

/** The card's words for an exception that turns on what a judge finds (StageAnswerPanel's passed box). */
export const JUDGE_DECIDES =
  "Where an exception depends on what a judge finds, that is for the judge to decide. This site cannot tell you how that will go.";

export type MunicipalNoticeFirst = {
  place: MunicipalPlace;
  heading: string;
  /** What the notice is, in plain words, with the rule that sets it, quoted. */
  rule: RuleCitation;
  ruleSay: string;
  /** Unknown place: the City of Toronto Act's same notice, so neither law is hidden. */
  alsoToronto: { say: string; rule: RuleCitation } | null;
  /** The injury date read from the story, and the words it came from. */
  injury: { date: string; quote: string; yearAssumed: boolean } | null;
  /** The counted last day and where it stands today; null with no injury date. */
  counted: (DeadlineStanding & { date: string }) | null;
  /** The rule's own "is not a bar" exceptions, quoted. */
  notABar: RuleCitation[];
  judgeDecides: string;
  helpWhy: string;
};

function deadlineFor(id: string): StageDeadline | undefined {
  return findStage(NOTICE_STEP_ID)?.deadlines.find((deadline) => deadline.id === id);
}

/**
 * The notice line for these words, or null when they do not show an injury
 * on a municipal way. `city` is the person's saved city, when known; `now`
 * and `today` are for the suite.
 */
export type NoticeAnswer = "yes" | "no" | "not-sure" | null;

/** Stable story identity within the existing owned intake checkpoint. */
export function noticeAnswerKey(story: string): string {
  let hash = 0;
  for (const ch of story.trim().toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return `cs-municipal-notice:${(hash >>> 0).toString(36)}`;
}

export function showsFullNotice(answer: NoticeAnswer): boolean {
  return answer === "yes" || answer === "not-sure";
}

export function municipalNoticeFirst(
  words: string,
  options: { city?: string; now?: Date; today?: string } = {},
): MunicipalNoticeFirst | null {
  const city = options.city ?? "";
  if (!words || !municipalWayInjury(words, city)) return null;
  const place = municipalPlaceOf(words, city);
  const deadline = deadlineFor(place === "toronto" ? TORONTO_DEADLINE_ID : MUNICIPAL_DEADLINE_ID);
  if (!deadline) return null;
  const now = options.now ?? new Date();
  const today = options.today ?? todayInOntario(now);

  const hint = storyHintsForDates(words, now)["sc-date-injury"];
  const injury = hint?.value ? { date: hint.value, quote: hint.quote, yearAssumed: Boolean(hint.yearAssumed) } : null;
  let counted: MunicipalNoticeFirst["counted"] = null;
  if (injury) {
    const entry = computedDeadlinesFor([deadline], { "injury-occurred": injury.date }, "intakeNoticeFirst")[0];
    if (entry) {
      counted = {
        date: entry.date,
        ...deadlineStandingFor(
          { date: entry.date, statutory: deadline.regime === "legislation-act", statement: entry.statement, consequence: deadline.consequence },
          today,
        ),
      };
    }
  }

  const toronto = place === "toronto";
  return {
    place,
    heading: toronto
      ? "Before anything else: written notice to the City of Toronto within 10 days"
      : "Before anything else: written notice to the municipality within 10 days",
    rule: deadline.rule,
    ruleSay: toronto
      ? "The City of Toronto Act, 2006 says no action for damages for a highway or bridge the City did not keep in repair is brought unless written notice of the claim and the injury, with the date, time and place, is served on or sent by registered mail to the city clerk within 10 days after the injury."
      : "The Municipal Act, 2001 says no action for damages for a highway or bridge the municipality did not keep in repair is brought unless written notice of the claim and the injury, with the date, time and place, is served on or sent by registered mail to the clerk of the municipality within 10 days after the injury.",
    alsoToronto:
      place === "unknown"
        ? {
            say: "If this happened in Toronto, the City of Toronto Act, 2006 sets the same 10 days, with notice to the city clerk.",
            rule: S_TORONTO_42_6_NOTICE,
          }
        : null,
    injury,
    counted,
    notABar: notABarExceptions(deadline.exceptions).filter((rule) => rule.sourceId === deadline.rule.sourceId),
    judgeDecides: JUDGE_DECIDES,
    helpWhy: "A lawyer or paralegal can look at your dates and your situation with you.",
  };
}

/** Whether an exception turns on what a judge finds (s. 42 (8), s. 44 (12)); the death exception (s. 42 (7), s. 44 (11)) does not. */
export function turnsOnJudge(rule: RuleCitation): boolean {
  return /\bif a judge finds\b/.test(rule.quote);
}

/** The injury date as the line says it: the long date, and that the year was assumed when it was. */
export function injuryDateWords(injury: NonNullable<MunicipalNoticeFirst["injury"]>): string {
  return `${formatLongDate(injury.date)}${injury.yearAssumed ? " (you did not give the year; we took the most recent one -- check it)" : ""}`;
}
