/**
 * THE step a case is at, as every case page shows it: the one the person
 * chose, else the one the Overview's next-step card opens on.
 *
 * WHY (walkthrough, 2026-10-13, R5). A Toronto sidewalk fall: the Overview's
 * card opened on the pre-suit notice step and counted its deadlines from the
 * injury date the person gave, while the printable Case file named "How do I
 * start my action in the Superior Court?" as their step and said "None yet"
 * for deadlines. Three places worked the step out three ways: the card
 * (StageAnswerPanel) put a notice step first; the case layout and the
 * Timeline/Case file deadline route did not, and each read the story slightly
 * differently. A date counted on one step was then looked for on another.
 *
 * This is the card's own order, written once for the pages that cannot
 * render the card:
 *   1. the step the person chose (position.stepId, valid for this court);
 *   2. a notice step their claim and story point to, for someone starting a
 *      case (not family, not responding, stage "starting-case" or none);
 *   3. the step their story's events name (the case reader's picture);
 *   4. the step their confirmed stage points to, or that their words name.
 * Every one but the first is a SUGGESTION, shown as such on the card with a
 * way to choose another step (CLAUDE.md section 4).
 *
 * Pure. Asserted by `npm run test:case-position`.
 */

import { readCasePosition, settledStage } from "./casePosition";
import { readCaseRecord } from "./caseRecord";
import { suggestedNoticeStep } from "./claim-types/noticeStep";
import { readStoredPicture, stepFromPicture } from "./intake/caseReader";
import { findStage, stagesForPathway, type StagePathway } from "./stage-map/stageMap";
import { suggestedStageFor } from "./stage-map/suggestedStep";
import { broadStageOfStep, sideOf, situationOfCase, stepFromSituation } from "./situation/situation";
import { getStageLabel } from "../../../app/builder/_components/builderTypes";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/** The words the card reads for the step: the story, then the goal and what is urgent. */
export function stepStoryText(masterResult: unknown, courtPath: StagePathway | null): string {
  const master = asRecord(masterResult);
  const intake = asRecord(master.intakeData);
  const record = readCaseRecord(master, courtPath);
  return [record.story, intake.goal, intake.urgent].filter((part) => typeof part === "string" && part).join("\n");
}

/** The notice step the card puts first, or null (the same call the Overview passes the card). */
export function noticeStepForCase(masterResult: unknown, courtPath: StagePathway | null): string | null {
  if (!courtPath) return null;
  const record = readCaseRecord(asRecord(masterResult), courtPath);
  return suggestedNoticeStep({ claimTypeId: record.claimTypeId, story: record.story, courtPath });
}

/**
 * The step the card would open on with no step chosen. `confirmedStage` may
 * be null (the card puts a notice step first then too).
 */
export function suggestedStepForCase(masterResult: unknown, courtPath: StagePathway, responding: boolean): string {
  const master = asRecord(masterResult);
  const position = readCasePosition(master, courtPath);
  const confirmedStage = position.confirmedStage;
  const notice = noticeStepForCase(master, courtPath);
  const noticeFirst =
    courtPath !== "family" &&
    !responding &&
    (confirmedStage === "starting-case" || !confirmedStage) &&
    Boolean(notice) &&
    stagesForPathway(courtPath).some((stage) => stage.id === notice);
  if (noticeFirst) return notice as string;
  return (
    stepFromPicture(courtPath, readStoredPicture(master.casePicture), responding, sideOf(situationOfCase(master)) !== null) ||
    suggestedStageFor(courtPath, confirmedStage, responding, stepStoryText(master, courtPath))
  );
}

/**
 * The case's step: chosen, else suggested. With `requireConfirmedStage`, a
 * case whose stage is not confirmed has no suggested step (the case pages'
 * own rule: the card is shown only once a stage is confirmed).
 */
export function caseStepFor(
  masterResult: unknown,
  courtPath: StagePathway | null,
  responding: boolean,
  options: { requireConfirmedStage?: boolean } = {},
): string {
  if (!courtPath) return "";
  const position = readCasePosition(asRecord(masterResult), courtPath);
  if (position.stepId) return position.stepId;
  // A step picked in the start answers is chosen too, and needs no confirmed stage.
  const picked = startStep(masterResult, courtPath);
  if (picked) return picked;
  if (options.requireConfirmedStage && !settledStage(position)) return "";
  return suggestedStepForCase(masterResult, courtPath, responding);
}

/**
 * The step the person picked themselves: on the step page, else in their start answers (a case
 * already going, or served and something has happened since). Conference audit, 2026-10-26:
 * case 16 picked "Case conference scheduled" at the start and the case pages showed only
 * "Conference stage", or "Starting a new case".
 */
export function chosenStepFor(masterResult: unknown, courtPath: StagePathway | null): string | null {
  if (!courtPath) return null;
  const master = asRecord(masterResult);
  return readCasePosition(master, courtPath).stepId ?? startStep(master, courtPath);
}

/**
 * The step picked in the start answers, while it agrees with any stage confirmed since: a later
 * confirmation ("trial" after a case conference was picked) wins (reviewer, 2026-10-26).
 */
function startStep(masterResult: unknown, courtPath: StagePathway): string | null {
  const master = asRecord(masterResult);
  const picked = stepFromSituation(situationOfCase(master), courtPath);
  if (!picked) return null;
  const settled = settledStage(readCasePosition(master, courtPath));
  return !settled || settled === broadStageOfStep(picked) ? picked : null;
}

/** Where the case is, in words, for every page that says it: the picked step's own title, else the confirmed stage. */
export function caseStageWords(masterResult: unknown, courtPath: StagePathway | null): string | null {
  const step = chosenStepFor(masterResult, courtPath);
  const title = step ? findStage(step)?.title : undefined;
  if (title) return title;
  const stage = courtPath ? settledStage(readCasePosition(asRecord(masterResult), courtPath)) : null;
  return stage ? getStageLabel(stage) : null;
}
