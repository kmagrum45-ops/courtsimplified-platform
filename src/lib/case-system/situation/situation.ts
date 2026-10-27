/**
 * THE SITUATION RECORD (step 2): where the person is, asked before their story.
 *
 *   (a) where:    starting a case / served with court papers / a case is already going
 *   (b) started:  for a case already going, did they start it or are they responding
 *   (c) papers:   if served or responding, which papers (picked by the top of the first
 *                 page), and the day they got them (the one date rule, dates.ts)
 *   (d) filed:    when starting, whether anything has been filed yet (asked once); "yes"
 *                 means the case is already going, which they started
 *   (e) court:    the court, when neither the papers nor their own choice of area says
 *   (f) stage:    for a case already going, what has happened so far: one of the stage
 *                 map's steps for that court and side (stageMap.ts), or "not sure"
 *
 * These are the person's own answers, kept in the checkpoint's `situation` section:
 * they are not tied to a version of the story (storyBasis.ts never tags this section),
 * so changing the story never sets them aside. Every later step reads them from here
 * and never asks again; what the story seems to say is only a cross-check, and a
 * contradiction is asked about, never applied (CLAUDE.md s. 4).
 *
 * Pure: no React, no network.
 */
import { formatForCourt, isRealIsoDate } from "../dates";
import TOPS from "./firstPageTops.json";
import { findStage, pathwayOf, stagesForPathway, type CaseStage } from "../stage-map/stageMap";
import type { SituationCourt } from "./firstPageForms";

export type { SituationCourt } from "./firstPageForms";

export const SITUATION_SECTION = "situation";
/** The one field the record is kept in: sections.situation.record. */
export const SITUATION_FIELD = "record";

export type Where = "starting" | "served" | "going";
export type Started = "me" | "them";
/** "<court>-<form number>" for a picked first page, or "other" / "not-sure". */
export type Papers = string;
export type Situation = {
  where?: Where;
  started?: Started;
  papers?: Papers;
  /** The day they got the papers, YYYY-MM-DD, or "unknown" when they do not know it. */
  receivedOn?: string;
  filed?: "nothing" | "something";
  court?: SituationCourt;
  /** How the court is known: from the papers, from the area they chose, or asked here. */
  courtFrom?: "papers" | "choice" | "asked";
  /**
   * For a case already going, or one they were served in: the stage map step they say they are
   * at, "not-sure", or (served) "just-served" when nothing else has happened yet. A respondent was
   * never asked (conference audit, 2026-10-26: a case conference set after service was lost).
   */
  stage?: string;
};

export type SituationQuestion = "where" | "started" | "papers" | "received" | "filed" | "court" | "stage";

export type FirstPage = { court: SituationCourt; number: string; title: string; date: string; pdf: string; image: string; retrievedOn: string };
export const FIRST_PAGES: FirstPage[] = (TOPS as { forms: FirstPage[] }).forms;

const COURTS: SituationCourt[] = ["small-claims", "civil", "family"];
const isCourt = (value: unknown): value is SituationCourt => COURTS.includes(value as SituationCourt);

/** The situation record kept in a checkpoint's sections, with anything malformed dropped. */
export function situationOf(sections: Record<string, unknown> | null | undefined): Situation {
  const raw = (((sections?.[SITUATION_SECTION] ?? {}) as Record<string, unknown>).record ?? {}) as Record<string, unknown>;
  const out: Situation = {};
  if (raw.where === "starting" || raw.where === "served" || raw.where === "going") out.where = raw.where;
  if (raw.started === "me" || raw.started === "them") out.started = raw.started;
  if (typeof raw.papers === "string" && (raw.papers === "other" || raw.papers === "not-sure" || FIRST_PAGES.some((page) => paperId(page) === raw.papers))) out.papers = raw.papers;
  if (typeof raw.receivedOn === "string" && (raw.receivedOn === "unknown" || isRealIsoDate(raw.receivedOn))) out.receivedOn = raw.receivedOn;
  if (raw.filed === "nothing" || raw.filed === "something") out.filed = raw.filed;
  if (isCourt(raw.court)) out.court = raw.court;
  if (raw.courtFrom === "papers" || raw.courtFrom === "choice" || raw.courtFrom === "asked") out.courtFrom = raw.courtFrom;
  if (typeof raw.stage === "string" && (raw.stage === "not-sure" || (raw.stage === JUST_SERVED && raw.where === "served") || findStage(raw.stage))) out.stage = raw.stage;
  return out;
}

/** The record from its stored value (the store's situation.record), with anything malformed dropped. */
export function situationFromRaw(raw: unknown): Situation {
  return situationOf({ [SITUATION_SECTION]: { [SITUATION_FIELD]: raw } });
}

/** The checkpoint section that holds a record, for a new flow's sections. */
export function situationSection(situation: Situation): Record<string, Record<string, unknown>> {
  return { [SITUATION_SECTION]: { [SITUATION_FIELD]: situation } };
}

export const paperId = (page: Pick<FirstPage, "court" | "number">): string => `${page.court}-${page.number}`;
export const firstPageOf = (papers: Papers | undefined): FirstPage | null => FIRST_PAGES.find((page) => paperId(page) === papers) ?? null;

/** Whether the person is bringing the case or responding to it, from their own answers, or null. */
export function sideOf(situation: Situation): "bringing" | "responding" | null {
  if (situation.where === "starting") return "bringing";
  if (situation.where === "served") return "responding";
  if (situation.where === "going" && situation.started) return situation.started === "me" ? "bringing" : "responding";
  return null;
}

/** Whether they were given papers to respond to: the papers and the day they got them are asked. */
export function receivedPapers(situation: Situation): boolean {
  return sideOf(situation) === "responding";
}

/** The court the papers say, when a picked first page names one. */
export function courtOfPapers(situation: Situation): SituationCourt | null {
  return firstPageOf(situation.papers)?.court ?? null;
}

/**
 * The next question to ask, or null when the record is complete. `chosenCourt` is the
 * area the person picked (the landing page's ?path): their own choice answers (e) unless
 * their papers say another court, which is then asked about (never switched for them).
 */
export function nextSituationQuestion(situation: Situation, chosenCourt: SituationCourt | null): SituationQuestion | null {
  if (!situation.where) return "where";
  if (situation.where === "going" && !situation.started) return "started";
  if (receivedPapers(situation)) {
    if (!situation.papers) return "papers";
    if (!situation.receivedOn) return "received";
  }
  if (situation.where === "starting" && !situation.filed) return "filed";
  if (!situation.court) return "court";
  const papersCourt = courtOfPapers(situation);
  if (papersCourt && papersCourt !== situation.court) return "court";
  if ((situation.where === "going" || situation.where === "served") && !stageFitsSituation(situation)) return "stage";
  void chosenCourt;
  return null;
}

/**
 * The steps offered for "what has happened so far", for a case already going: the stage
 * map's steps for the court, on the person's side or either side, past filing. Steps
 * where something has gone wrong come after the others. Empty until side and court are known.
 */
export function stageChoices(situation: Situation): CaseStage[] {
  const side = sideOf(situation);
  if (!side || !situation.court) return [];
  const own = side === "bringing" ? ["plaintiff", "applicant"] : ["defendant", "respondent"];
  const steps = stagesForPathway(situation.court).filter(
    (step) => (own.includes(step.side) || step.side === "both") && !/before-filing|drafted-not/.test(step.id),
  );
  return [...steps.filter((step) => !step.wentWrong), ...steps.filter((step) => step.wentWrong)];
}

/** Whether the stage answer still fits the side and court answered ("not sure" always does). */
function stageFitsSituation(situation: Situation): boolean {
  if (!situation.stage) return false;
  if (situation.stage === "not-sure") return true;
  if (situation.stage === JUST_SERVED) return situation.where === "served";
  return stageChoices(situation).some((step) => step.id === situation.stage);
}

/** Served, and nothing else has happened yet: the step is the one service starts (no step of its own). */
export const JUST_SERVED = "just-served";

/** The stage map step the person said their case is at (a case already going, or one they were served in), for this court, or null. */
export function stepFromSituation(situation: Situation, court: string | null | undefined): string | null {
  if ((situation.where !== "going" && situation.where !== "served") || !situation.stage || situation.stage === "not-sure" || situation.stage === JUST_SERVED) return null;
  const step = findStage(situation.stage);
  return step && pathwayOf(step) === court && stageFitsSituation(situation) ? step.id : null;
}

/**
 * The results page's broad stage for a step (StageConfirmation's list), so the step a
 * person chose for a case already going settles that too. A plain reading of the step's
 * id; nothing is shown from it but the person's own choice.
 */
export function broadStageOfStep(stepId: string): "responding" | "already-started" | "conference" | "motion" | "trial" | "enforcement" {
  const id = stepId.replace(/^(civil|family):/, "");
  if (/conference|pretrial|mediation|dispute-resolution/.test(id)) return "conference";
  if (/trial/.test(id)) return "trial";
  if (/motion|injunction|summary-judgment/.test(id)) return "motion";
  if (/judgment|enforc|garnish|debtor|not-paid|licence-suspension|default-hearing|financial-examination|request-for-financial/.test(id)) return "enforcement";
  if (/^(defendant|respondent):served-(defence-period|time-to-answer)/.test(id)) return "responding";
  return "already-started";
}

/** The record once a court is known from the papers or the person's own choice of area. */
export function withKnownCourt(situation: Situation, chosenCourt: SituationCourt | null): Situation {
  if (situation.court) return situation;
  const papersCourt = courtOfPapers(situation);
  if (papersCourt && (!chosenCourt || papersCourt === chosenCourt)) return { ...situation, court: papersCourt, courtFrom: "papers" };
  if (chosenCourt && !papersCourt) return { ...situation, court: chosenCourt, courtFrom: "choice" };
  return situation;
}

/** The record after one answer: later answers that no longer apply are cleared. */
export function answerSituation(situation: Situation, question: SituationQuestion, value: string): Situation {
  const next: Situation = { ...situation };
  if (question === "where") {
    next.where = value as Where;
    if (value !== "going") { delete next.started; delete next.stage; }
    if (value === "starting") { delete next.papers; delete next.receivedOn; }
    if (value !== "starting") delete next.filed;
  }
  if (question === "started") {
    if (next.started !== value) delete next.stage;
    next.started = value as Started;
    if (value === "me") { delete next.papers; delete next.receivedOn; }
  }
  if (question === "papers") {
    next.papers = value;
    if (next.courtFrom === "papers") { delete next.court; delete next.courtFrom; }
  }
  if (question === "received") next.receivedOn = value;
  // Something filed when starting is a case already going, which they started: its
  // stage is asked next, and "has anything been filed" is never asked again (finding 1).
  if (question === "filed") {
    if (value === "something") { next.where = "going"; next.started = "me"; delete next.filed; delete next.stage; }
    else next.filed = "nothing";
  }
  if (question === "court" && isCourt(value)) { next.court = value; next.courtFrom = courtOfPapers(next) === value ? "papers" : "asked"; }
  if (question === "stage") next.stage = value;
  // A stage chosen for another side or court no longer applies.
  if (next.stage && next.stage !== "not-sure" && next.court && !stageFitsSituation(next)) delete next.stage;
  return next;
}

const COURT_LINE: Record<SituationCourt, { bringing: string; responding: string }> = {
  "small-claims": { bringing: "You're suing in Small Claims Court", responding: "You're being sued in Small Claims Court" },
  civil: { bringing: "You're bringing a civil case", responding: "You're responding to a civil case" },
  family: { bringing: "You're bringing a family case", responding: "You're responding to a family case" },
};

/**
 * The top line shown on every page, from the person's own answers only, e.g.
 * "You're being sued in Small Claims Court · Plaintiff's Claim (Form 7A) · served
 * October 6, 2026". Null until the record is complete.
 */
export function situationLine(situation: Situation): string | null {
  const side = sideOf(situation);
  if (!side || !situation.court) return null;
  const parts = [COURT_LINE[situation.court][side]];
  const page = firstPageOf(situation.papers);
  if (page) parts.push(`${page.title} (Form ${page.number})`);
  if (situation.receivedOn && situation.receivedOn !== "unknown") parts.push(`${situation.where === "served" ? "served" : "received"} ${formatForCourt(situation.receivedOn)}`);
  if (situation.where === "starting" && situation.filed === "nothing") parts.push("nothing filed yet");
  const step = stepFromSituation(situation, situation.court);
  if (step) parts.push(`now: “${findStage(step)!.userQuestion}”`);
  return parts.join(" · ");
}

/**
 * The answers each area's own questions would ask, read from the situation record so
 * they are never asked again (step 2). Only what the person's answers settle is given;
 * anything else is left for the area to ask.
 *
 *   role:        the area's word for the side (Small Claims and civil plaintiff /
 *                defendant, Family applicant / respondent)
 *   documents:   the area's "what has been filed" values the answers settle
 *   claimFiled / claimServed: Small Claims' two facts
 *   servedOn:    the day they got the papers, YYYY-MM-DD
 *   questionIds: the question-bank and date-question ids these answer
 */
export type SituationAnswers = {
  role?: string;
  documents?: string[];
  /** "What has been filed" choices the answers rule out: "nothing", once papers exist. */
  excludeDocuments?: string[];
  /** The area's stage the answers settle (starting a case, or served and responding), or none for a case already going. */
  caseStage?: "starting-case" | "already-started" | "responding" | "conference" | "motion" | "trial" | "enforcement";
  claimFiled?: boolean;
  claimServed?: boolean;
  servedOn?: string;
  /** For a case already going: the step picked, by its own title in the stage map ("Case conference scheduled"). */
  stepTitle?: string;
  /** For a case already going: who started it, in words for the side shown ("I started this case (applicant)"). */
  roleWords?: string;
  questionIds: string[];
};

const DOCUMENT_OF_PAPERS: Record<string, string> = {
  "small-claims-7A": "plaintiffs-claim",
  "civil-14A": "statement-claim",
  "civil-14B": "statement-claim",
  "civil-14D": "statement-claim",
  "civil-14E": "notice-application",
  "family-8": "application",
  "family-8A": "application",
  "family-8B": "application",
};

/**
 * The case stage the start answers settle, in words: the step picked by its own title in the stage
 * map, else the broad stage. One wording for every "Case stage" box (conference audit 2026-10-26:
 * the intake forms said "Starting a new case" for anything but responding or already started).
 */
export function stageWords(answers: Pick<SituationAnswers, "caseStage" | "stepTitle">): string | null {
  if (answers.stepTitle) return answers.stepTitle;
  switch (answers.caseStage) {
    case "starting-case": return "Starting a new case";
    case "responding": return "Responding to a case";
    case undefined: return null;
    default: return "Case already started";
  }
}

export function situationAnswers(court: SituationCourt, situation: Situation): SituationAnswers {
  const side = sideOf(situation);
  const out: SituationAnswers = { questionIds: [] };
  if (!side) return out;
  out.role = court === "family" ? (side === "bringing" ? "applicant" : "respondent") : side === "bringing" ? "plaintiff" : "defendant";
  if (court === "small-claims") out.questionIds.push("sc-orient-role");
  if (situation.where === "starting" && situation.filed === "nothing") out.documents = ["nothing"];
  // Papers exist when something was filed, or they were served: "Nothing filed yet" is not an answer then.
  // A case already going has papers filed too (finding 1).
  if ((situation.where === "starting" && situation.filed === "something") || side === "responding" || situation.where === "going") out.excludeDocuments = ["nothing"];
  const step = stepFromSituation(situation, court);
  out.caseStage =
    situation.where === "starting"
      ? situation.filed === "something" ? "already-started" : "starting-case"
      : situation.where === "served"
        ? step ? broadStageOfStep(step) : "responding"
        : situation.where === "going" && situation.stage
          ? step ? broadStageOfStep(step) : "already-started"
          : undefined;
  // A case already going: the step as picked, and the side as who started it (#477 re-test, case 16:
  // "Case stage: conference" and "Your side: I'm starting it (or I want to)").
  if (step) out.stepTitle = findStage(step)?.title;
  if (situation.where === "going" && situation.started) out.roleWords = situation.started === "me" ? `I started this case (${out.role})` : `The other side started this case (${out.role})`;
  const document = situation.papers ? DOCUMENT_OF_PAPERS[situation.papers] : undefined;
  if (document && courtOfPapers(situation) === court) out.documents = [document];
  if (court === "small-claims") {
    if (situation.where === "starting" && situation.filed) out.claimFiled = situation.filed === "something";
    // They started a case already going: their claim is filed.
    if (situation.where === "going" && situation.started === "me") out.claimFiled = true;
    if (side === "responding" && situation.papers === "small-claims-7A") { out.claimFiled = true; out.claimServed = true; }
    if (out.claimFiled !== undefined) out.questionIds.push("sc-claim-filed");
  }
  if (side === "responding" && situation.receivedOn && situation.receivedOn !== "unknown") {
    out.servedOn = situation.receivedOn;
    const dateQuestion = situation.papers ? SERVED_DATE_QUESTION[situation.papers] : undefined;
    if (dateQuestion) out.questionIds.push(dateQuestion);
    // Small Claims asks a defendant when they got the claim and which papers: both answered here.
    if (court === "small-claims" && courtOfPapers(situation) === "small-claims") out.questionIds.push("sc-defendant-claim-received");
  }
  return out;
}

/**
 * The date answers to keep on a saved position: the situation's own date is never
 * written into it (step 2 reviewer: saved there, it then counted as the step page's
 * answer and outlived a change of the situation answer). A date the person gave on
 * the step page that differs from the situation's is theirs and is kept.
 */
export function withoutSituationDates(answers: Record<string, string>, court: string | null | undefined, situation: Situation): Record<string, string> {
  if (court !== "small-claims" && court !== "civil" && court !== "family") return answers;
  const fromStart = situationAnswers(court, situation);
  if (!fromStart.servedOn) return answers;
  return Object.fromEntries(Object.entries(answers).filter(([id, value]) => !(fromStart.questionIds.includes(id) && value === fromStart.servedOn)));
}

/**
 * The stage the situation answers settle beyond doubt, in the person's own terms:
 * served with papers is "served and need to respond"; starting with nothing filed is
 * "starting a case". A case already going settles none (it may be at any step).
 */
export function stageFromSituation(situation: Situation): { stage: "starting-case" | "responding"; because: string } | null {
  if (situation.where === "served") return { stage: "responding", because: "You told us you were served with court papers" };
  if (situation.where === "starting" && situation.filed === "nothing") return { stage: "starting-case", because: "You told us nothing has been filed yet" };
  return null;
}

/**
 * The date answers the situation record gives, keyed by date question, under the
 * person's own answers on the step page (`answered`), which win: the day they got the
 * papers counts as their answer to that date question (step 2).
 */
export function withSituationDates(answered: Record<string, string>, court: string | null | undefined, situation: Situation): Record<string, string> {
  if (court !== "small-claims" && court !== "civil" && court !== "family") return answered;
  const fromStart = situationAnswers(court, situation);
  const out = { ...answered };
  if (fromStart.servedOn) for (const id of fromStart.questionIds) if (id.includes("-date-") && !out[id]) out[id] = fromStart.servedOn;
  return out;
}

/** The situation record kept in a saved case's master result (its intake checkpoint). */
export function situationOfCase(masterResult: unknown): Situation {
  const master = (masterResult && typeof masterResult === "object" ? masterResult : {}) as Record<string, unknown>;
  const checkpoint = (master.intakeCheckpoint && typeof master.intakeCheckpoint === "object" ? master.intakeCheckpoint : {}) as Record<string, unknown>;
  return situationOf((checkpoint.sections && typeof checkpoint.sections === "object" ? checkpoint.sections : {}) as Record<string, unknown>);
}

/**
 * The deadline engine's date question each picked document's service day answers
 * (deadlineEvents.ts): being served is being served, so the person's answer is that
 * date. Papers not listed (a Notice of Action, "something else", "not sure") answer
 * no date question; the step asks for its own date.
 */
export const SERVED_DATE_QUESTION: Record<string, string> = {
  "small-claims-7A": "sc-date-claim-served",
  "small-claims-10A": "sc-date-defendants-claim-served",
  "civil-14A": "sc-date-claim-served",
  "civil-14B": "sc-date-claim-served",
  "civil-14D": "sc-date-claim-served",
  "civil-14E": "case-date-served-with-application",
  "family-8": "case-date-served-with-application",
  "family-8A": "case-date-served-with-application",
  "family-8B": "case-date-served-with-application",
  "family-15": "case-date-served-with-motion-to-change",
};

/**
 * What the story seems to say about the side, against the person's answer: a
 * contradiction to ask about, or null. Never changes the record.
 */
export function sideContradiction(situation: Situation, storySide: "bringing" | "responding" | null): { answered: "bringing" | "responding"; story: "bringing" | "responding" } | null {
  const answered = sideOf(situation);
  return answered && storySide && storySide !== answered ? { answered, story: storySide } : null;
}

/** Whether a case is started, as the situation answers say: undefined when they do not say yet. */
export function filedFromSituation(situation: Situation): boolean | undefined {
  if (situation.where === "going" || situation.where === "served") return true;
  if (situation.where === "starting" && situation.filed) return situation.filed === "something";
  return undefined;
}
