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
