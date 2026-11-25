/**
 * THE SITUATION QUESTIONS ASK ONLY WHAT THE CASE FILE DOES NOT HOLD (C9, 23 Nov 2026: "Fix them by making each page read
 * the one shared reader of the case file and never decide for itself whether to ask").
 *
 * The situation questions (situation.ts nextSituationQuestion) decided from the situation record alone, so a fact the case
 * file held from another place (the chat, the review, an older saved case, the step page) was asked again there. This
 * returns the situation with every unanswered question whose fact the case file holds, from another place, filled from
 * the case file: the person's own answer ("known") or "I'm not sure" ("settled"), through the one function
 * (factStatus.ts slotStatus). It is read, never saved: the situation record keeps only what was answered in it, so no
 * second copy is made. Callers decide the next question from it (IntakeRecovery SituationGate, SituationQuestions).
 *
 * Filled only where the case file's value says exactly the situation's answer:
 *   started   who started a case already going: the side (bringing: "me", responding: "them");
 *   where     a case being started, nothing filed: the side "bringing" and filed "no";
 *   filed     a case being started: filed yes or no;
 *   papers    the papers received: a first page the case file names by its title, or "not sure";
 *   received  the day they were received: the served date, or "unknown" when not sure;
 *   stage     a case already going: a step this court and side offer, or "not sure".
 * The court is never filled here: withKnownCourt already does (the person's chosen court).
 *
 * Pure, no React, no network. States no law.
 */
import { slotStatus } from "./factStatus";
import type { CaseFile, Slot } from "./caseFile";
import { FIRST_PAGES, paperId, stageChoices, type Situation } from "../situation/situation";
import { isRealIsoDate } from "../dates";

/** A slot the person settled somewhere other than the situation questions: their answer, or "not sure". */
function heldElsewhere(slot: Slot | undefined): "known" | "settled" | null {
  if (!slot) return null;
  if (slot.source?.kind === "answer" && slot.source.question.startsWith("situation:")) return null;
  const status = slotStatus(slot);
  return status === "known" || status === "settled" ? status : null;
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function situationWithHeld(situation: Situation, file: CaseFile | null | undefined): Situation {
  if (!file) return situation;
  const out: Situation = { ...situation };
  const side = heldElsewhere(file.side) === "known" ? text(file.side.value) : "";
  const bringing = side === "bringing" || side === "plaintiff" || side === "applicant";
  const responding = side === "responding" || side === "defendant" || side === "respondent";
  const filed = heldElsewhere(file.filed) === "known" ? file.filed.value : undefined;
  const filedNo = filed === false || /^(?:no|nothing)\b/i.test(text(filed));
  const filedYes = filed === true || /^(?:yes|something)\b/i.test(text(filed));

  if (!out.where && bringing && filedNo) out.where = "starting";
  if (out.where === "going" && !out.started && (bringing || responding)) out.started = bringing ? "me" : "them";
  if (out.where === "starting" && !out.filed && (filedNo || filedYes)) out.filed = filedNo ? "nothing" : "something";

  const papers = heldElsewhere(file.papers);
  if (!out.papers && papers) {
    const value = text(file.papers.value);
    if (papers === "settled" || value === "not-sure") out.papers = "not-sure";
    else {
      const page = FIRST_PAGES.find((item) => item.title === value || paperId(item) === value);
      if (page) out.papers = paperId(page);
    }
  }
  const served = heldElsewhere(file.servedDate);
  if (!out.receivedOn && served) {
    const value = text(file.servedDate.value);
    if (served === "settled" || value === "unknown") out.receivedOn = "unknown";
    else if (isRealIsoDate(value)) out.receivedOn = value;
  }
  const stage = heldElsewhere(file.stage);
  if (!out.stage && stage && (out.where === "going" || out.where === "served")) {
    const value = text(file.stage.value);
    if (stage === "settled" || value === "not-sure") out.stage = "not-sure";
    else if (stageChoices(out).some((step) => step.id === value)) out.stage = value;
  }
  return out;
}
