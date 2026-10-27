/**
 * THE PERSON'S OWN ANSWER IS THEIR CONFIRMATION OF THE STAGE (2026-10-14,
 * walkthrough SW and RN).
 *
 * A Toronto sidewalk plaintiff answered "What has been filed" with "Nothing
 * filed yet" in the guided intake, and the results then asked "From what you
 * told us: I have not filed anything yet. Yes, that is right" -- the same
 * question twice. A Small Claims defendant answered "Have you filed a Defence
 * (Form 9A) yet?" with "No" and was asked to confirm "I was served and need to
 * respond".
 *
 * CLAUDE.md section 4: a stage a model detects is a suggestion the person
 * confirms. An answer the person gave themselves -- the side they picked and
 * what they said has been filed -- IS a confirmation. So when those answers
 * map to exactly one stage, and it is the stage the site suggests, the stage
 * is recorded from them, shown with the answer it came from and a Change.
 *
 * Never from the story alone: only answers the person gave or confirmed in
 * the intake (`PersonAnswers`, written by the intakes from the person's own
 * clicks and replies), never a value read out of their words and not shown to
 * them. Only the two mappings that leave no doubt:
 *
 *   starting-case  the person bringing the case, with nothing filed yet;
 *   responding     the person served, with the originating document received
 *                  and their own response not yet filed.
 *
 * Anything else (a motion, an existing order, a mix of documents, an answer
 * of "not sure") settles nothing, and the stage is asked as before.
 *
 * Pure: no I/O.
 */

import type { UniversalStage } from "./builderTypes";
import { broadStageOfStep, stageFromSituation, stepFromSituation, type Situation } from "@/src/lib/case-system/situation/situation";
import { findStage } from "@/src/lib/case-system/stage-map/stageMap";

/**
 * What the person themselves answered about their side and what has been
 * filed, recorded by the intake at the moment they answered (never prefilled).
 * Civil and family: the form fields they set. Small Claims guided: the
 * question-bank answers they gave or confirmed, with the fact each produced.
 */
export type PersonAnswers = {
  /** civil: plaintiff/defendant/...; family: applicant/respondent; Small Claims: plaintiff/defendant. */
  side?: string;
  /** civil `documents`, family `filedDocuments` option values, as they chose them. */
  filed?: string[];
  /** The option labels of `filed`, for showing the answer back. */
  filedLabels?: string[];
  /** Small Claims guided: their own answer to "Has a Plaintiff's Claim been filed?" (plaintiff). */
  claimFiled?: boolean;
  /** Small Claims guided: their own answer to "Have you filed a Defence yet?" (defendant). */
  defenceFiled?: boolean;
  /** Small Claims guided: the words of the filing answer, as they gave or confirmed them. */
  filingAnswerText?: string;
};

export type StageFromAnswers = { stage: UniversalStage; because: string };

const short = (text: string) => {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > 120 ? `${cleaned.slice(0, 117)}…` : cleaned;
};

/** Documents that start the other side's case, by court. Receiving one is being served. */
const ORIGINATING: Record<"civil" | "family", string[]> = {
  civil: ["statement-claim"],
  family: ["application"],
};
/** The person's own response, by court. Filed means past the responding stage. */
const OWN_RESPONSE: Record<"civil" | "family", string[]> = {
  civil: ["statement-defence"],
  family: ["answer"],
};
/** Documents that, alongside the originating one, still fit "served and need to respond". */
const SERVED_EXTRAS: Record<"civil" | "family", string[]> = {
  civil: ["affidavit-service"],
  family: ["financial-statement"],
};
const STARTING_SIDES: Record<"civil" | "family", string[]> = { civil: ["plaintiff"], family: ["applicant"] };
const RESPONDING_SIDES: Record<"civil" | "family", string[]> = { civil: ["defendant"], family: ["respondent"] };

/** The stage the person's own answers settle, or null when they do not settle one beyond doubt. */
export function stageFromPersonAnswers(courtPath: string, answers: PersonAnswers | null | undefined): StageFromAnswers | null {
  if (!answers || !answers.side) return null;

  if (courtPath === "small-claims") {
    if (answers.side === "plaintiff" && answers.claimFiled === false) {
      return { stage: "starting-case", because: answers.filingAnswerText ? short(answers.filingAnswerText) : "No claim filed yet" };
    }
    if (answers.side === "defendant" && answers.defenceFiled === false) {
      return { stage: "responding", because: answers.filingAnswerText ? short(answers.filingAnswerText) : "No defence filed yet" };
    }
    return null;
  }

  if (courtPath !== "civil" && courtPath !== "family") return null;
  const filed = (answers.filed ?? []).filter(Boolean);
  if (filed.length === 0 || filed.includes("not-sure")) return null;
  const label = (answers.filedLabels ?? []).filter(Boolean).join("; ");

  if (STARTING_SIDES[courtPath].includes(answers.side) && filed.length === 1 && filed[0] === "nothing") {
    return { stage: "starting-case", because: label || "Nothing filed yet" };
  }
  if (
    RESPONDING_SIDES[courtPath].includes(answers.side) &&
    filed.some((item) => ORIGINATING[courtPath].includes(item)) &&
    !filed.some((item) => OWN_RESPONSE[courtPath].includes(item)) &&
    filed.every((item) => ORIGINATING[courtPath].includes(item) || SERVED_EXTRAS[courtPath].includes(item))
  ) {
    return { stage: "responding", because: label || filed.join("; ") };
  }
  return null;
}

/**
 * The stage to record from the person's answers: only when it is the one the
 * site suggests (two readings agreeing), never when they differ -- then the
 * person is asked, as before.
 */
export function stageRecordedFromAnswers(
  courtPath: string,
  answers: PersonAnswers | null | undefined,
  suggested: UniversalStage,
  /** The situation answers (situation.ts): the person's own, read first (step 2). */
  situation: Situation | null = null,
): StageFromAnswers | null {
  // The situation answers are the person's own and settle the stage whatever the analysis
  // suggests (step 2b): served, starting with nothing filed, or the step of a case already
  // going they chose ("not sure" there is remembered: the step panel offers the steps once more).
  // A step picked at the start wins over the bare "served".
  const fromSituation = situation ? stageOfCaseGoing(courtPath, situation) ?? stageFromSituation(situation) : null;
  if (fromSituation) return fromSituation;
  const settled = stageFromPersonAnswers(courtPath, answers);
  // The person's own answer settles the stage where the analysis was not sure either
  // (#469 re-test: civil and Family "Nothing filed yet" ended at "I am not sure").
  return settled && (settled.stage === suggested || suggested === "not-sure") ? settled : null;
}

/** Reads the person's answers kept on the intake payload (`extra.personAnswers`). */
export function personAnswersOf(extra: unknown): PersonAnswers | null {
  const record = extra && typeof extra === "object" && !Array.isArray(extra) ? (extra as Record<string, unknown>).personAnswers : null;
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const raw = record as Record<string, unknown>;
  const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined);
  return {
    ...(typeof raw.side === "string" ? { side: raw.side } : {}),
    ...(strings(raw.filed) ? { filed: strings(raw.filed) } : {}),
    ...(strings(raw.filedLabels) ? { filedLabels: strings(raw.filedLabels) } : {}),
    ...(typeof raw.claimFiled === "boolean" ? { claimFiled: raw.claimFiled } : {}),
    ...(typeof raw.defenceFiled === "boolean" ? { defenceFiled: raw.defenceFiled } : {}),
    ...(typeof raw.filingAnswerText === "string" ? { filingAnswerText: raw.filingAnswerText } : {}),
  };
}

/**
 * Small Claims guided intake: the side and the filing answer, only where the
 * person answered (or confirmed from their story) the question itself.
 * `answers` are the confirmed answers the guided intake keeps; `facts` the
 * facts those answers produced.
 */
export function personAnswersFromGuided(
  answers: ReadonlyArray<{ questionId: string; answerText: string }>,
  facts: Record<string, unknown>,
): PersonAnswers {
  // The last answer to each question is the one that stands.
  const answered = (id: string) => [...answers].reverse().find((answer) => answer.questionId === id);
  const out: PersonAnswers = {};
  const role = answered("sc-orient-role");
  const side = role ? sideInAnswer(role.answerText) : null;
  // The facts are the model's reading of the whole conversation; the answer's
  // own words decide, and a fact that disagrees with them settles nothing.
  if (side && (facts.role === undefined || facts.role === side)) out.side = side;
  const claimAnswer = answered("sc-claim-filed");
  const claimFiled = claimAnswer ? yesOrNo(claimAnswer.answerText) : null;
  if (out.side === "plaintiff" && claimAnswer && claimFiled !== null && (facts.claimFiled === undefined || facts.claimFiled === claimFiled)) {
    out.claimFiled = claimFiled;
    out.filingAnswerText = claimAnswer.answerText;
  }
  const defenceAnswer = answered("sc-defendant-defence-filed");
  const defenceFiled = defenceAnswer ? yesOrNo(defenceAnswer.answerText) : null;
  if (out.side === "defendant" && defenceAnswer && defenceFiled !== null && (facts.defenceFiled === undefined || facts.defenceFiled === defenceFiled)) {
    out.defenceFiled = defenceFiled;
    out.filingAnswerText = defenceAnswer.answerText;
  }
  return out;
}

/** The side a role answer names ("Responding to a claim (defendant)"), or null when it names neither or both. */
export function sideInAnswer(text: string): "plaintiff" | "defendant" | null {
  const defendant = /\b(?:defendant|responding|being sued|sued me|suing me)\b/i.test(text);
  const plaintiff = /\b(?:plaintiff|bringing the claim|i(?:'m| am) (?:suing|bringing))\b/i.test(text);
  return defendant === plaintiff ? null : defendant ? "defendant" : "plaintiff";
}

/**
 * A plain yes or no at the start of an answer to a yes-no question ("No, I
 * haven't filed anything yet", "not yet", "yes"), or null for anything less
 * plain ("I think so", "not sure", "I don't know").
 */
export function yesOrNo(text: string): boolean | null {
  const start = text.trim().toLowerCase();
  // A hedge anywhere makes it no answer (review 2026-10-14: "No idea", "no
  // clue", "Nope, not sure", "Yes I think so" were read as a plain no or yes).
  if (/\b(?:idea|clue|sure|unsure|think\w*|thought|remember\w*|recall\w*|know\w*|maybe|perhaps|probably|guess\w*|might|possibly|wonder\w*|decid\w*)\b/.test(start)) return null;
  if (/^(?:no\b|nope\b|not yet\b|i (?:have not|haven'?t|did not|didn'?t)\b|nothing\b)/.test(start)) return false;
  if (/^(?:yes\b|yeah\b|yep\b|i (?:have|did)\b(?! not))/.test(start)) return true;
  return null;
}

/**
 * The stage OFFERED for confirmation, for the person's side (L48). For someone
 * who was served, "The case has started" is true but sat beside a "Where you
 * are" step on the defending side ("Defence period missed"), as if it said
 * something else; they are offered "I was served and need to respond" instead.
 * Civil and Family analyses suggest "I am not sure" for the same person, so
 * that is offered as responding too (#468 re-test).
 * Only the suggestion: a stage the person confirmed stays theirs (CLAUDE.md s. 4).
 */
export function suggestionForSide(stage: UniversalStage, responding: boolean): UniversalStage {
  return responding && (stage === "already-started" || stage === "not-sure") ? "responding" : stage;
}

/** A case already going: the broad stage of the step the person chose, or "already started" when they were not sure. */
function stageOfCaseGoing(courtPath: string, situation: Situation): StageFromAnswers | null {
  // Served with something since counts too (conference audit, 2026-10-26: a respondent's case conference).
  if ((situation.where !== "going" && situation.where !== "served") || !situation.stage) return null;
  const step = stepFromSituation(situation, courtPath);
  if (step) return { stage: broadStageOfStep(step), because: findStage(step)!.userQuestion };
  return situation.where === "going" && situation.stage === "not-sure" ? { stage: "already-started", because: "A case is already going" } : null;
}
