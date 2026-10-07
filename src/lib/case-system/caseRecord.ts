/**
 * The case record: one read of everything the person has told us about their
 * case, for every page to use. Master plan Phase 1 (docs/MASTER_PLAN.md).
 *
 * WHY THIS EXISTS. Four page reviews (2026-10-06/07) kept finding the same
 * thing in new places: a fact given once was asked again, a date counted on
 * one page was missing on the next, a confirmed stage read "not enough
 * recorded". The facts were all saved -- across intakeData, its `extra`, the
 * civil `civilInput`, intakeFacts, position, familyStatus -- but each page
 * read its own slice, and some read the wrong key (the builder took filed
 * documents from a top-level key that does not exist, so form-intake cases
 * saved no filing facts at all). This module is the one place that knows
 * where each fact lives.
 *
 * Every fact carries where it came from. "confirmed" means the person chose
 * it on the case page or in a confirmation; "intake" and "guided" are their
 * own answers in an intake; nothing here is inferred by a model.
 *
 * Pure: no React, no Supabase. Pages read through it; writers stay where they
 * are.
 */

import { readCasePosition, suggestedDatesFromAnswers, type CasePosition } from "./casePosition";
import { filingFactsFromDocuments, recordedDocuments } from "./intelligence/answeredQuestions";
import { userStory } from "./userStory";
import { recordedAmountOf } from "./amountNotes";

export type CourtPath = "small-claims" | "civil" | "family";
export type Provenance = "confirmed" | "intake" | "guided";
export type RecordedFact<T> = { value: T; source: Provenance };

/** The side of the case the person is on, in the stage map's two words. */
export type Side = "starting" | "responding";

export type CaseRecord = {
  courtPath: CourtPath | null;
  side: RecordedFact<Side> | null;
  position: CasePosition;
  /** Dates by date-question id ("sc-date-claim-served"); confirmed ones win. */
  dates: Record<string, RecordedFact<string>>;
  amount: string;
  claimTypeId: string | null;
  yourName: string;
  otherParty: string;
  city: string;
  story: string;
  /** The documents the person recorded as filed or received, as they chose them. */
  documents: string[];
  filings: ReturnType<typeof filingFactsFromDocuments>;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export function courtPathOf(value: unknown): CourtPath | null {
  return value === "small-claims" || value === "civil" || value === "family" ? value : null;
}

/**
 * The documents list, wherever the intake that wrote it put it: Small Claims
 * and family write `extra.filedDocuments`, civil writes `extra.documents` and
 * `extra.civilInput.documents`.
 */
export function documentsOf(intake: unknown): unknown[] {
  const data = asRecord(intake);
  const extra = asRecord(data.extra);
  const civil = asRecord(extra.civilInput);
  for (const candidate of [extra.filedDocuments, extra.documents, civil.documents, data.filedDocuments]) {
    if (Array.isArray(candidate) && candidate.length) return candidate;
  }
  return [];
}

const RESPONDING = /defendant|respondent|responding/i;
const STARTING = /plaintiff|claimant|applicant|moving/i;

function sideOf(master: Record<string, unknown>, position: CasePosition): RecordedFact<Side> | null {
  if (position.confirmedStage === "responding") return { value: "responding", source: "confirmed" };
  const facts = asRecord(master.intakeFacts);
  if (facts.role === "defendant") return { value: "responding", source: "guided" };
  if (facts.role === "plaintiff") return { value: "starting", source: "guided" };
  const intake = asRecord(master.intakeData);
  const extra = asRecord(intake.extra);
  const civil = asRecord(extra.civilInput);
  for (const role of [extra.yourRole, civil.yourRole, intake.yourRole]) {
    const value = text(role);
    if (RESPONDING.test(value)) return { value: "responding", source: "intake" };
    if (STARTING.test(value)) return { value: "starting", source: "intake" };
  }
  if (position.confirmedStage === "starting-case") return { value: "starting", source: "confirmed" };
  return null;
}

type Answer = { questionId: string; answerText: string };

export function readCaseRecord(masterResult: unknown, courtPathColumn?: string | null): CaseRecord {
  const master = asRecord(masterResult);
  const intake = asRecord(master.intakeData);
  const extra = asRecord(intake.extra);
  const civil = asRecord(extra.civilInput);
  const courtPath = courtPathOf(courtPathColumn) ?? courtPathOf(intake.courtPath);
  const position = readCasePosition(master, courtPath);

  // Guided answers the person confirmed (saved as intakeAnswers since
  // 2026-10-07), then their own dates on the case page, which win.
  const dates: Record<string, RecordedFact<string>> = {};
  const answers = (Array.isArray(master.intakeAnswers) ? master.intakeAnswers : []) as Answer[];
  for (const [id, suggestion] of Object.entries(suggestedDatesFromAnswers(answers.filter(isAnswer)))) {
    dates[id] = { value: suggestion.value, source: "guided" };
  }
  for (const [id, value] of Object.entries(position.dateAnswers)) {
    dates[id] = { value, source: "confirmed" };
  }

  const documents = recordedDocuments(documentsOf(intake));
  return {
    courtPath,
    side: sideOf(master, position),
    position,
    dates,
    amount: recordedAmountOf(intake),
    claimTypeId: text(extra.confirmedClaimTypeId) || null,
    yourName: text(intake.yourName) || text(extra.yourName) || text(civil.yourName),
    otherParty: text(intake.otherParty) || text(extra.otherParty) || text(civil.otherParty),
    city: text(extra.yourCity) || text(extra.city) || text(civil.city),
    story: userStory(intake),
    documents,
    filings: filingFactsFromDocuments(documentsOf(intake)),
  };
}

function isAnswer(value: unknown): value is Answer {
  const record = asRecord(value);
  return typeof record.questionId === "string" && typeof record.answerText === "string";
}

/** The record's dates as plain answers, for a date form's starting values. */
export function recordedDateAnswers(record: CaseRecord): Record<string, string> {
  return Object.fromEntries(Object.entries(record.dates).map(([id, fact]) => [id, fact.value]));
}
