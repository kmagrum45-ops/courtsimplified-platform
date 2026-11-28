"use client";

/**
 * THE NEW SMALL CLAIMS FLOW'S ONE RECORD (site owner, 26 Nov 2026). Every step reads the case through this hook only: the
 * case file (caseFile.ts caseFileOf, from the tab's checkpoint and the saved case), with the story's facts added as
 * stated in the story (flow/storyStated.ts; the AI reading only for a signed-in person), and the person's choices on the
 * Understood step's offers. A step never keeps its own copy of what is answered.
 */
import { useIntakeRecovery, useIntakeReviewView } from "../../_components/IntakeRecovery";
import { caseFileOf, type CaseFile } from "../../../src/lib/case-system/caseFile/caseFile";
import { offerChoicesOf } from "../../../src/lib/case-system/caseFile/offerChoice";
import { readingOfSections, withStoryStated } from "../../../src/lib/case-system/flow/storyStated";

export function useFlowRecord(): { record: CaseFile | null; recovery: ReturnType<typeof useIntakeRecovery> } {
  const recovery = useIntakeRecovery();
  const view = useIntakeReviewView();
  if (!recovery || !view) return { record: null, recovery };
  const sections = view.checkpoint.sections as Record<string, unknown>;
  const base = caseFileOf(view.checkpoint, recovery.getSavedMaster() ?? undefined);
  const story = base.storyText ?? "";
  const record = withStoryStated(base, { story, reading: readingOfSections(sections, story), signedIn: Boolean(recovery.ownerId), choices: offerChoicesOf(sections) });
  return { record, recovery };
}
