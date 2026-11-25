/**
 * THE DEADLINES COUNTED FOR THE STEP A CASE IS AT, FOR "WHAT WE HAVE SO FAR" (Charter re-test 2026-10-26).
 *
 * The same count the next-step card makes (app/api/case/stage-answer: computedDeadlinesFor over the
 * step's own deadlines and the person's dates), so the two can never show different days. Each
 * comes with the stage map's own words for what it is. Nothing is counted without a saved step and
 * a date the person gave.
 *
 * Pure: no React, no network. States no law of its own.
 */
import { findStage } from "../stage-map/stageMap";
import { caseDatesFrom } from "../deadlines/deadlineEvents";
import { computedDeadlinesFor } from "../../content-library/computedDeadline";
import { caseFileOf, withCaseFileDates } from "./caseFile";
import { readCheckpoint } from "../intakeCheckpoint";
import { fullDayIn, readCasePosition } from "../casePosition";

export type CountedDeadline = { id: string; what: string; date: string };

export function countedStepDeadlines(stepId: string | null | undefined, dateAnswers: Record<string, string> | null | undefined): CountedDeadline[] {
  const stage = stepId ? findStage(stepId) : null;
  if (!stage || !dateAnswers || !Object.keys(dateAnswers).length) return [];
  return computedDeadlinesFor(stage.deadlines, caseDatesFrom(dateAnswers), "caseFile").map((entry) => ({
    id: entry.deadlineId,
    what: stage.deadlines.find((deadline) => deadline.id === entry.deadlineId)?.what ?? "",
    date: entry.date,
  })).filter((entry) => entry.what);
}

/**
 * THE ONE SOURCE of the deadlines the case page ("What we have so far") and the case file page ("Deadlines worked out
 * from your dates") show (Chrome check of #544, 6 Nov, F4: the next-step card said 3 March 2028, the case file page
 * "None yet"). The same count the next-step card makes, over the same dates: the step page's dates, with the case
 * file's dates added (withCaseFileDates, as the card's initialDateAnswers). How a deadline is counted is not changed.
 */
export function caseDeadlines(master: unknown, courtPath: string | null, stepId: string | null | undefined): CountedDeadline[] {
  const record = (master && typeof master === "object" ? master : {}) as Record<string, unknown>;
  const court = courtPath === "small-claims" || courtPath === "civil" || courtPath === "family" ? courtPath : null;
  const position = readCasePosition(record, court);
  const file = caseFileOf(court ? readCheckpoint(record.intakeCheckpoint, court) : null, record);
  return countedStepDeadlines(stepId, withCaseFileDates(position.dateAnswers, file, fullDayIn));
}
