/**
 * EVERY PLACE THAT STORES DATA, AND WHERE IT STANDS WHEN THE STORY CHANGES.
 *
 * The PR #463 re-tests and the stale-story audit that followed found the same
 * fault again and again: a copy of something read from the story, kept somewhere
 * the version record (storyBasis.ts) did not reach, still deciding a stage, a
 * deadline or a form after the person changed their story. This file lists each
 * store with exactly one StoryDataClass (intakeStorageKeys.ts), and
 * `npm run test:story-data-registry` fails when the code gains a store that is
 * not listed here, or a listed one stops being used (remove its line).
 *
 * Browser keys are classified on their own entries in intakeStorageKeys.ts.
 * Here: the intake record's sections, the case's master_result keys, and the
 * database tables written.
 */
import type { StoryDataClass } from "./intakeStorageKeys";

export type StoryDataEntry = { storyData: StoryDataClass; note: string };

/** Sections of the intake record (the tab's checkpoint, saved with the case). */
export const INTAKE_SECTIONS: Record<string, StoryDataEntry> = {
  story: { storyData: "version-record", note: "The story and location themselves; the version every answer is tagged with is computed from it." },
  storyBasis: { storyData: "version-record", note: "The record: answer key -> story version it was given for." },
  family: { storyData: "version-record", note: "Family answers, each tagged (navigation and the person's own contact details excepted)." },
  civil: { storyData: "version-record", note: "Civil form input, tagged field by field." },
  "small-claims": { storyData: "version-record", note: "Small Claims form input, tagged field by field." },
  guided: { storyData: "version-record", note: "Guided facts and answers tagged; the conversation is restarted with the questions." },
  builder: { storyData: "version-record", note: "Review-panel answers and triage tagged; the step is navigation." },
  sourced: { storyData: "version-record", note: "Sourced-question answers, tagged." },
  "form-chat": { storyData: "version-record", note: "Question-at-a-time state, reset with the questions; an unsent copy of the story goes when it changes." },
  home: { storyData: "version-record", note: "Home page answers, cleared when the story changes." },
  "home-card": { storyData: "version-record", note: "Replies to the Home page card's questions, cleared when the story changes." },
  safety: { storyData: "not-story", note: "Whether the safety check could run." },
  "urgent-warning": { storyData: "not-story", note: "The answer to a warning, kept with the warning's own key; a different warning ignores it." },
};

/** Keys written into cases.master_result. */
export const MASTER_RESULT_KEYS: Record<string, StoryDataEntry> = {
  intakeCheckpoint: { storyData: "version-record", note: "The intake record itself (INTAKE_SECTIONS)." },
  workflowStatus: { storyData: "not-story", note: "Review and confirmation state; a changed story re-opens the review." },
  source: { storyData: "not-story", note: "Which screen created the case." },
  lifecycleStage: { storyData: "not-story", note: "Where the case is in the site's own flow." },
  updatedAt: { storyData: "not-story", note: "When the analysis was saved." },
  guidanceInputRevision: { storyData: "not-story", note: "Which confirmed input the guidance was built from; the gate compares it." },
  derivedFrom: { storyData: "not-story", note: "Which events and input the analysis saw (caseAnalysisFreshness.ts)." },
  intakeData: { storyData: "analysis-gate", note: "The input the last analysis read, including its story; shown only while it matches the confirmed facts, and compared on re-analysis (positionForStory)." },
  intakeFacts: { storyData: "analysis-gate", note: "Facts the last analysis read." },
  intakeAnalysis: { storyData: "analysis-gate", note: "The last analysis." },
  courtSimplifiedIntelligence: { storyData: "analysis-gate", note: "The last analysis's reasoning output." },
  masterCaseFile: { storyData: "analysis-gate", note: "The case file built by the last analysis." },
  persistedRecord: { storyData: "analysis-gate", note: "The last analysis's record." },
  dashboardPatch: { storyData: "analysis-gate", note: "Dashboard summary from the last analysis." },
  recommendedNextRoute: { storyData: "analysis-gate", note: "Next route from the last analysis." },
  updatedSubsystems: { storyData: "analysis-gate", note: "Which parts the last analysis updated." },
  familyStatus: { storyData: "analysis-gate", note: "Family triage saved with the analysis." },
  casePicture: { storyData: "analysis-gate", note: "The case reader's reading; cleared when the guidance input changes." },
  position: { storyData: "analysis-gate", note: "The person's stage, step, dates and service; dates and service recorded for an earlier story are dropped on re-analysis (positionForStory)." },
  drafts: { storyData: "analysis-gate", note: "Drafts the person edits. Kept across a re-analysis (stale-story audit item 5, held for later)." },
  formApplicability: { storyData: "analysis-gate", note: "Forms page answers. Kept across a re-analysis (audit item 5, held for later)." },
  intakeAnswers: { storyData: "analysis-gate", note: "Guided answers copied to the case at analysis. Kept across a re-analysis (audit item 5, held for later)." },
};

/** Database tables written by the site. */
export const TABLES: Record<string, StoryDataEntry> = {
  cases: { storyData: "not-story", note: "The case row; its master_result keys are classified one by one above." },
  case_events: { storyData: "analysis-gate", note: "An event confirmed from a story sentence counts only while that sentence is in the story (eventsForStory)." },
  case_event_candidate_dismissals: { storyData: "analysis-gate", note: "Dismissed readings, matched to sentences still in the story." },
  case_chat_messages: { storyData: "not-story", note: "The person's follow-up chat transcript; nothing reads it into answers, dates or forms (audit item 8, display only)." },
  workspace_documents: { storyData: "not-story", note: "Documents the person uploaded." },
  workspace_document_text: { storyData: "not-story", note: "Text read from uploaded documents." },
  ai_call_log: { storyData: "not-story", note: "Call metadata only, no story text." },
  canlii_cache: { storyData: "not-story", note: "CanLII API metadata cache." },
  pdf_overlay_fields: { storyData: "not-story", note: "Field positions on court PDFs." },
  case_intakes: { storyData: "legacy", note: "No code writes or reads it (Part 2). Any rows left are for the site owner to check; nothing here reads them." },
  case_generated_documents: { storyData: "legacy", note: "No code writes or reads it (Part 2). Any rows left are for the site owner to check; nothing here reads them." },
};
