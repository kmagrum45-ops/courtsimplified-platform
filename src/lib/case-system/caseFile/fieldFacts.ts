/**
 * THE ONE FIELD-TO-FACT TABLE (case core G0, "the rails"; CASE_CORE_DESIGN.md §10).
 *
 * Every place a save point writes into the intake checkpoint is a (section, field) pair: a field the
 * screens keep with useIntakeState / recovery.put. When the save points move onto the one writer
 * (`give`, POST /api/cases/facts), each old field must be written under its fact id too. This table
 * says which fact each field holds, ONCE, by the store's own layout -- never per screen -- and the
 * fact always comes from factsOfQuestion.ts (the same table the ask-once gate and caseFileOf use), so
 * the table cannot disagree with them.
 *
 * Three kinds of row:
 *   ANSWER   the field holds one answer to one question: its fact is factsOfQuestion(question).
 *   KEYED    the field holds an object (or list) whose keys are question ids (civil.input,
 *            builder.initialAnswers, guided.facts, position.dateAnswers, ...): each key's fact is
 *            factsOfQuestion(key) -- the container is mapped once, not each key by hand.
 *   NONE     the field holds no fact (page state, a draft, a copy for the AI), with the reason.
 *
 * A field (or key) whose question asks for TWO facts (serviceDetails: the day and the way served;
 * upcomingCourtDate: a court date or a conference date) maps to NEITHER: it is reported as compound,
 * because a value written under two facts would be a fact written twice. Splitting those is G3-G5.
 *
 * test:fact-rails checks: every mapped fact is a real fact (FACT_IDS); no field maps to two facts;
 * every compound row really asks for two; and every literal (section, field) a save point writes today
 * has a row here, so a new field written without a decision fails.
 *
 * Pure. States no law.
 */
import { factsOfQuestion } from "./factsOfQuestion";
// Only isFactId, called later, is read from factRecord: nothing at load time, so the import cycle through
// intakeCheckpoint -> positionSave -> factSave -> here never reads it half-loaded.
import { isFactId, type FactId } from "./factRecord";

export type FieldRow =
  | { kind: "answer"; section: string; field: string; question: string }
  | { kind: "keyed"; section: string; field: string; surface?: string; aliases?: Record<string, string> }
  | { kind: "none"; section: string; field: string; why: string };

const answer = (section: string, field: string, question = field): FieldRow => ({ kind: "answer", section, field, question });
const keyed = (section: string, field: string, extra: { surface?: string; aliases?: Record<string, string> } = {}): FieldRow => ({ kind: "keyed", section, field, ...extra });
const none = (section: string, field: string, why: string): FieldRow => ({ kind: "none", section, field, why });

const PAGE_STATE = "page state (which step, mode or card is showing), not something the person told us";
const AI_COPY = "an AI reply or a copy built from the story for a screen, not an answer";
const NOT_A_FACT_YET = "an answer with no fact id yet: the design's later facts (timeline, parentingTime, ...) or no fact at all; added to FACT_IDS and factsOfQuestion.ts when built";

/** Every (section, field) a save point writes, by the store's layout. Order: by section. */
export const FIELD_ROWS: readonly FieldRow[] = [
  // The situation answers: one record keyed by the situation question ids (situation.ts).
  keyed("situation", "record", { surface: "situation" }),
  none("situation", "keptAgainst", PAGE_STATE),
  // The one story and location.
  answer("story", "text", "facts"),
  none("story", "location", "the person's city, used to pick a courthouse; not a case fact in FACT_IDS"),
  // The home page's story reading.
  none("home", "understoodAnswers", "answers to the story reading's questions, keyed by the question's words: mapped by factOfAskedText when they move (G6), never a field id"),
  // The other party the story reading named, put on the record when the person accepted the reading (B1, 8 Nov).
  answer("home", "otherParty"),
  none("home", "draftAnswers", "unsent drafts of the story reading's answers"),
  none("home", "readFrom", PAGE_STATE),
  none("home", "suggestion", AI_COPY),
  none("home", "understood", AI_COPY),
  none("home-card", "replies", "replies to the story card's numbered questions, keyed by number, not by a question id: no fact id yet"),
  // Civil and Small Claims whole forms: one object keyed by question id.
  keyed("civil", "input"),
  none("civil", "mode", PAGE_STATE),
  none("civil", "personSet", "which form fields the person touched (bookkeeping beside the answers)"),
  none("civil", "personDocuments", "which documents the person ticked (bookkeeping beside the answers)"),
  keyed("small-claims", "input"),
  none("small-claims", "mode", PAGE_STATE),
  none("small-claims", "filledWords", "the words the case file put in each form box it filled (asker.ts filledToFollow), so a box still holding them follows the newest answer and is never counted as the person's own: page bookkeeping, no fact"),
  none("small-claims", "filledFromCaseFile", "which form boxes were filled from the case file once (asker.ts formFill), so a box the person cleared is never filled again: page bookkeeping, no fact"),
  // Family: one field per question.
  answer("family", "otherParty"),
  answer("family", "childrenInfo"),
  answer("family", "goal"),
  answer("family", "issues"),
  answer("family", "filedDocuments"),
  answer("family", "caseStage"),
  answer("family", "upcomingCourtDate"),
  answer("family", "urgent"),
  answer("family", "yourRole"),
  answer("family", "evidence"),
  answer("family", "servedDate"),
  none("family", "timeline", NOT_A_FACT_YET),
  none("family", "currentLivingSituation", NOT_A_FACT_YET),
  none("family", "pastLivingHistory", NOT_A_FACT_YET),
  none("family", "propertyHomeDetails", NOT_A_FACT_YET),
  none("family", "safetyConcerns", NOT_A_FACT_YET),
  none("family", "adoptionDetails", NOT_A_FACT_YET),
  none("family", "missingEvidence", NOT_A_FACT_YET),
  none("family", "uploadedEvidenceFiles", "file references, not an answer"),
  none("family", "yourName", NOT_A_FACT_YET),
  none("family", "mode", PAGE_STATE),
  none("family", "personSet", "which form fields the person touched (bookkeeping beside the answers)"),
  none("family", "personDocuments", "which documents the person ticked (bookkeeping beside the answers)"),
  // The Small Claims guided questions.
  keyed("guided", "earlierAnswers"),
  keyed("guided", "answeredIds"),
  keyed("guided", "facts"),
  answer("guided", "matchedClaimType", "claim-kind-suggestion"),
  none("guided", "pendingSuggestion", "an AI suggestion waiting for the person: a suggestion, never a fact until accepted"),
  none("guided", "rejectedSuggestionIds", "kinds turned down: the case file's turnedDown, not a fact value"),
  none("guided", "declinedIds", "questions the person declined: kept by the gate, not a fact value"),
  none("guided", "depthStateMap", "each element's recorded state (the design's elementStates / evidence): no fact id yet"),
  ...["asksForAdvice", "claimGuidance", "completionPayload", "currentQuestion", "depthActive", "depthIndex", "depthQuestions", "evidenceGuidance",
    "halted", "heldPayload", "inputText", "intakeComplete", "messages", "noClaimTypeMatch", "proposalDrafts", "proposalMode", "readFrom", "reproposed", "started"]
    .map((field) => none("guided", field, field === "messages" || field.endsWith("Guidance") || field.endsWith("Payload") ? AI_COPY : PAGE_STATE)),
  // The questions one at a time (civil, Family).
  keyed("form-chat", "skipped"),
  ...["changing", "heard", "knownAtStart", "needsMore", "drafts", "notFromStory", "edited"].map((field) => none("form-chat", field, PAGE_STATE)),
  // The review and the builder.
  keyed("builder", "initialAnswers"),
  keyed("builder", "initialUnknowns"),
  keyed("builder", "triageState", { aliases: { marriedToOtherParty: "married-to-other-party", caseInvolvesChildren: "case-involves-children", haveChildTogether: "child-together" } }),
  ...["step", "familyQuestionsDone", "intakeCity", "startedModes"].map((field) => none("builder", field, PAGE_STATE)),
  // The case file's own section: the change record, "not sure", turned down, answered in review.
  none("caseFile", "changes", "the change record: becomes the fact record itself (G2), never mapped through a field"),
  none("caseFile", "turnedDown", "values turned down: caseFile.turnedDown in the design, not a fact value"),
  none("caseFile", "answeredInReview", "which questions the review keeps shown: page bookkeeping held by the case file"),
  none("caseFile", "unsure", "the facts answered not sure, keyed by fact id already"),
  // The case position (casePosition.ts), saved by the step page and the overview: the kind of claim, and the
  // dates keyed by the stage map's question ids.
  answer("position", "claimKind", "claim-kind-suggestion"),
  keyed("position", "dateAnswers"),
  // Other sections.
  none("safety", "checkUnavailable", PAGE_STATE),
  none("sourced", "askedFor", PAGE_STATE),
  none("sourced", "index", PAGE_STATE),
  keyed("sourced", "answers"),
  none("sourced", "questions", AI_COPY),
  none("sourced", "state", PAGE_STATE),
  none("urgent-warning", "municipalNotice", PAGE_STATE),
];

/** The real facts a question asks for (a question's own-id fallback that is not a fact is no fact). */
const realFacts = (question: string, surface?: string): FactId[] => factsOfQuestion(question, surface).filter(isFactId);

export type FieldFact = { fact: FactId } | { compound: FactId[] } | { none: string } | { unmapped: true };

/** The row for a (section, field), or undefined when the table has none. */
export const fieldRow = (section: string, field: string): FieldRow | undefined => FIELD_ROWS.find((row) => row.section === section && row.field === field);

/**
 * The fact a value written at (section, field) holds -- and, for a keyed container, at its `key`.
 * Exactly one fact, or compound (two facts: written under neither), or none, or unmapped.
 */
export function factOfField(section: string, field: string, key?: string): FieldFact {
  const row = fieldRow(section, field);
  if (!row) return { unmapped: true };
  if (row.kind === "none") return { none: row.why };
  const question = row.kind === "answer" ? row.question : key === undefined ? null : row.aliases?.[key] ?? key;
  if (question === null) return { none: "a keyed container: name the key" };
  const facts = realFacts(question, row.kind === "keyed" ? row.surface : undefined);
  if (facts.length === 0) return { none: `${question} asks for no fact in FACT_IDS` };
  if (facts.length > 1) return { compound: facts };
  return { fact: facts[0] };
}

