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

import { CLAIM_TYPES } from "./intake/claimTypes";
import { nameRecorded } from "./privacy/modelPayloadNames";
import { readCasePosition, suggestedDatesFromAnswers, type CasePosition } from "./casePosition";
import { filingFactsFromDocuments, recordedDocuments } from "./intelligence/answeredQuestions";
import { userStory } from "./userStory";
import { recordedAmountOf } from "./amountNotes";
import { sideOf as situationSide, situationOfCase, stepFromSituation, type Situation } from "./situation/situation";

export type CourtPath = "small-claims" | "civil" | "family";
export type Provenance = "confirmed" | "intake" | "guided" | "situation";
export type RecordedFact<T> = { value: T; source: Provenance };

/** The side of the case the person is on, in the stage map's two words. */
export type Side = "starting" | "responding";

export type CaseRecord = {
  courtPath: CourtPath | null;
  side: RecordedFact<Side> | null;
  position: CasePosition;
  /** The step picked in the start answers (a case going, or served and something since), or null (conference audit, 2026-10-26). */
  startStepId: string | null;
  /** Dates by date-question id ("sc-date-claim-served"); confirmed ones win. */
  dates: Record<string, RecordedFact<string>>;
  amount: string;
  claimTypeId: string | null;
  yourName: string;
  otherParty: string;
  /** The court file number the person typed, if their case has one ("" if not). */
  courtFileNumber: string;
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

/**
 * THE one rule for which side the person is on (build order Step 2A,
 * 2026-10-12). The builder and the case pages used a second rule
 * (respondingSide.userIsResponding) that never read civilInput.yourRole, so a
 * civil defendant could be treated as starting the case. Both now call this.
 */
export function sideFromParts(parts: {
  confirmedStage: string | null | undefined;
  intakeData: unknown;
  intakeFacts: unknown;
  /** The situation answers given before the story (situation.ts): the person's own answer, read first (step 2). */
  situation: Situation | null;
}): RecordedFact<Side> | null {
  const answered = parts.situation ? situationSide(parts.situation) : null;
  if (answered) return { value: answered === "bringing" ? "starting" : "responding", source: "situation" };
  if (parts.confirmedStage === "responding") return { value: "responding", source: "confirmed" };
  const facts = asRecord(parts.intakeFacts);
  if (facts.role === "defendant") return { value: "responding", source: "guided" };
  if (facts.role === "plaintiff") return { value: "starting", source: "guided" };
  const intake = asRecord(parts.intakeData);
  const extra = asRecord(intake.extra);
  const civil = asRecord(extra.civilInput);
  for (const role of [extra.yourRole, civil.yourRole, intake.yourRole]) {
    const value = text(role);
    if (RESPONDING.test(value)) return { value: "responding", source: "intake" };
    if (STARTING.test(value)) return { value: "starting", source: "intake" };
  }
  if (parts.confirmedStage === "starting-case") return { value: "starting", source: "confirmed" };
  return null;
}

function sideOf(master: Record<string, unknown>, position: CasePosition): RecordedFact<Side> | null {
  return sideFromParts({
    confirmedStage: position.confirmedStage,
    intakeData: master.intakeData,
    intakeFacts: master.intakeFacts,
    situation: situationOfCase(master),
  });
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
    // A date whose year was guessed is not the person's date: it is offered on
    // the card for them to choose the year (StageAnswerPanel), never recorded.
    if (suggestion.yearAssumed) continue;
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
    startStepId: courtPath ? stepFromSituation(situationOfCase(master), courtPath) : null,
    dates,
    amount: recordedAmountOf(intake),
    claimTypeId: text(extra.confirmedClaimTypeId) || null,
    yourName: text(intake.yourName) || text(extra.yourName) || text(civil.yourName),
    otherParty: text(intake.otherParty) || text(extra.otherParty) || text(civil.otherParty),
    // Small Claims saves its court file number as extra.claimNumber (SmallClaimsIntake).
    courtFileNumber: text(civil.courtFileNumber) || text(extra.courtFileNumber) || text(intake.courtFileNumber) || text(extra.claimNumber),
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

/**
 * What the person already entered, as starting values for the intake form
 * when they come back to update it (Phase 1 inventory, 2026-10-07: "Update
 * your story" opened a blank form -- role, names, amount and documents all
 * gone though the case held them). Keys are the intake forms' own prefill
 * keys. Only the person's own entries; nothing a model wrote.
 */
export function storedIntakeValues(masterResult: unknown): Record<string, string | string[]> {
  const master = asRecord(masterResult);
  const intake = asRecord(master.intakeData);
  const extra = asRecord(intake.extra);
  const civil = asRecord(extra.civilInput);
  const position = readCasePosition(master, text(intake.courtPath) || null);
  const pick = (...values: unknown[]) => values.map(text).find(Boolean) ?? "";
  const out: Record<string, string | string[]> = {
    facts: userStory(intake),
    yourName: pick(intake.yourName, extra.yourName, civil.yourName),
    otherParty: pick(intake.otherParty, extra.otherParty, civil.otherParty),
    yourRole: pick(extra.yourRole, civil.yourRole),
    caseStage: pick(position.confirmedStage, intake.caseStage, civil.caseStage),
    amountClaimed: pick(extra.amountClaimed, civil.amountClaimed),
    damagesBreakdown: pick(extra.damagesBreakdown, civil.damagesBreakdown),
    timeline: pick(intake.timeline, civil.timeline),
    evidence: pick(intake.evidence, civil.evidence),
    goal: pick(intake.goal, extra.goal),
    legalRemedy: pick(extra.legalRemedy, civil.legalRemedy),
    serviceDetails: pick(extra.serviceDetails, civil.serviceDetails),
    settlementEfforts: pick(extra.settlementEfforts, civil.settlementEfforts),
    urgent: pick(intake.urgent, extra.urgent, civil.urgent),
    // 2026-10-16 live bug: after the guided route had already classified the
    // claim, reopening the form route (e.g. to edit a saved case) showed
    // "kind of claim not clear yet" -- the claim type was saved to
    // extra.confirmedClaimTypeId, but this allow-list, the only thing the
    // form route reads a saved case's values back through, never carried it.
    confirmedClaimTypeId: pick(extra.confirmedClaimTypeId),
  };
  const documents = documentsOf(intake).map(String);
  if (documents.length) out.documentStatus = documents;
  return Object.fromEntries(Object.entries(out).filter(([, value]) => (Array.isArray(value) ? value.length : value)));
}

/**
 * What the case already records, in plain lines, for the assistant
 * (master plan Phase 1, 2026-10-08: the assistant was given only the story,
 * so it could ask again for a date or step the person had already given).
 * Built from the saved record only -- never from the request -- and says
 * where each fact came from. Empty when nothing is recorded.
 */
export function caseFactsText(record: CaseRecord, describe: { stepTitle?: (stepId: string) => string | undefined; dateQuestion?: (id: string) => string | undefined } = {}): string {
  const lines: string[] = [];
  const from = (source: Provenance) => (source === "confirmed" ? "confirmed by the person" : "from their intake");
  if (record.side) lines.push(`Side: ${record.side.value === "responding" ? "responding to a case someone else started" : "bringing the case"} (${from(record.side.source)})`);
  if (record.position.confirmedStage) lines.push(`Where the case is: ${record.position.confirmedStage} (confirmed by the person)`);
  const stepId = record.position.stepId ?? record.startStepId;
  if (stepId) lines.push(`Their exact step: ${describe.stepTitle?.(stepId) ?? stepId} (chosen by the person)`);
  for (const [id, fact] of Object.entries(record.dates)) {
    lines.push(`${describe.dateQuestion?.(id) ?? id}: ${fact.value} (${from(fact.source)})`);
  }
  if (record.amount) lines.push(`Amount: ${record.amount} (from their intake)`);
  // The kind of claim the person confirmed (it was never sent: the law lookup guessed one).
  const kind = record.claimTypeId ? CLAIM_TYPES.find((type) => type.id === record.claimTypeId)?.name : undefined;
  if (kind) lines.push(`Kind of claim: ${kind} (confirmed by the person)`);
  // Names never go to the model (privacy/modelPayloadNames.ts): only that one is recorded. This
  // text is sent to the checked answer by /api/assistant/law; it carried the other party's name
  // until 2026-10-25 (found writing the site map).
  if (record.otherParty) lines.push(`The other party: ${nameRecorded(record.otherParty)} (from their intake)`);
  if (record.city) lines.push(`City: ${record.city} (from their intake)`);
  if (record.documents.length) lines.push(`Documents recorded as filed or received: ${record.documents.join(", ")}`);
  return lines.join("\n");
}
