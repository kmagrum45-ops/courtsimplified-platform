/** Review provenance on workflowStatus; intakeCompleted remains the completion flag. */
import { readCheckpoint, type Checkpoint } from "./intakeCheckpoint";
import { locationOf, storyOf, STORY_INPUT_KEYS, STORY_SECTION, confirmedLocationOf } from "./intakeStory";
import { familyGuidedFields, civilGuidedFields, pendingFields } from "../../../app/builder/_components/guidedFields";
import { QUESTION_BANK } from "./intake/questionBank";
import { selectQuestions, type IntakeFacts } from "./intake/selectQuestions";

type ObjectValue = Record<string, unknown>;
const object = (value: unknown): ObjectValue => value && typeof value === "object" && !Array.isArray(value) ? value as ObjectValue : {};
const OPTIONAL = new Set(["evidence", "missingEvidence", "uploadedEvidenceFiles", "uploadedFiles", "evidenceFiles", "evidenceText", "defenceEvidenceText"]);
const UI = new Set(["mode", "editingStory", "personSet", "personDocuments"]);
export type ReviewEntry = { section: string; field: string; nested?: string; label: string; value: string | string[] | number | boolean; essential: boolean };
const label = (key: string) => key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase());

/** A projection of existing answers, not another case model or question selector. */
export function reviewEntries(checkpoint: Checkpoint): ReviewEntry[] {
  const { sections, courtPath } = checkpoint;
  const section = courtPath === "family" ? "family" : courtPath === "civil" ? "civil" : "small-claims";
  const fields = courtPath === "family" ? familyGuidedFields({ issues: [], filed: [] }) : courtPath === "civil" ? civilGuidedFields({ issues: [], documents: [] }) : [];
  const source = courtPath === "family" ? object(sections.family) : object(sections[section]?.input);
  const entries: ReviewEntry[] = [];
  const add = (area: string, key: string, value: unknown, nested?: string) => {
    if (UI.has(key) || (area !== STORY_SECTION && STORY_INPUT_KEYS.has(key)) || !(typeof value === "string" || typeof value === "number" || typeof value === "boolean" || (Array.isArray(value) && value.every(v => typeof v === "string")))) return;
    const definition = fields.find(field => field.key === key);
    const question = QUESTION_BANK.find(item => item.capturesField === key);
    entries.push({ section: area, field: key, nested, label: definition?.label ?? question?.text ?? label(key), value: value as ReviewEntry["value"], essential: definition?.initial ?? !OPTIONAL.has(key) });
  };
  // The one copy of the story and location comes first, whatever the route (intakeStory.ts).
  entries.push({ section: STORY_SECTION, field: "text", label: "Your story", value: storyOf(sections), essential: true });
  if (courtPath === "small-claims" && sections.builder?.step === "guided") {
    for (const [key, value] of Object.entries(object(sections.guided?.facts))) add("guided", key, value, "facts");
  } else {
    for (const [key, value] of Object.entries(source)) add(section, key, value, courtPath === "family" ? undefined : "input");
  }
  const location = locationOf(sections);
  if (location) entries.push({ section: STORY_SECTION, nested: "location", field: "city", label: "City", value: location.city, essential: true });
  return entries;
}

/** UI navigation, research results and later evidence never masquerade as initial fact edits. */
export function materialInitialFacts(checkpoint: Checkpoint): string {
  // Which Small Claims route is OPEN is navigation, not a fact: the answers of both
  // routes count, so choosing the other route never cancels a confirmation (re-test 2026-10-18).
  const onStep = (step: string): Checkpoint => ({ ...checkpoint, sections: { ...checkpoint.sections, builder: { ...checkpoint.sections.builder, step } } });
  const views = checkpoint.courtPath === "small-claims" ? [onStep("form"), onStep("guided")] : [checkpoint];
  const seen = new Set<string>();
  const entries = views.flatMap(view => reviewEntries(view)).filter(entry => !OPTIONAL.has(entry.field)).filter(entry => {
    const key = JSON.stringify([entry.section, entry.nested, entry.field]);
    return !seen.has(key) && Boolean(seen.add(key));
  });
  return JSON.stringify({ home: { answers: checkpoint.sections.home?.understoodAnswers }, court: checkpoint.courtPath, story: storyOf(checkpoint.sections), location: locationOf(checkpoint.sections), answers: entries.map(entry => [entry.section, entry.nested, entry.field, entry.value]).sort((a, b) => String(a.slice(0, 3)).localeCompare(String(b.slice(0, 3)))) });
}

export const inputRevision = (checkpoint: Checkpoint) => checkpoint.inputRevision ?? checkpoint.revision;
/** Shared UI/API policy. Legacy booleans never establish explicit confirmation. */
export function confirmedIntakeRevision(master: unknown, court?: string | null, caseId?: string): string | null {
  const record = object(master);
  const stored = object(record.intakeCheckpoint);
  const area = court ?? stored.courtPath;
  if (area !== "small-claims" && area !== "family" && area !== "civil") return null;
  const checkpoint = readCheckpoint(stored, area, caseId);
  return checkpoint && reviewPhase(object(record.workflowStatus), checkpoint) === "user-confirmed" ? inputRevision(checkpoint) : null;
}

/** A confirmed revision cannot reveal analysis produced for earlier facts. */
export function guidanceIsCurrent(master: unknown, court?: string | null, caseId?: string): boolean {
  const revision = confirmedIntakeRevision(master, court, caseId);
  return Boolean(revision && object(master).guidanceInputRevision === revision);
}

/** An unfinished case API returns intake/user records, never cached procedural output. */
export function intakeRecordView(master: unknown, court?: string | null, caseId?: string): ObjectValue {
  const value = object(master);
  if (guidanceIsCurrent(value, court, caseId)) return value;
  const intake = object(value.intakeData);
  return { ...Object.fromEntries(["intakeCheckpoint", "workflowStatus", "intakeAnswers", "intakeFacts", "familyStatus", "documents", "evidence", "drafts", "formApplicability"].filter(key => value[key] !== undefined).map(key => [key, value[key]])), intakeData: Object.fromEntries(["courtPath", "caseStage", "yourName", "otherParty", "facts", "timeline", "evidence", "missingEvidence", "goal", "urgent"].filter(key => intake[key] !== undefined).map(key => [key, intake[key]])) };
}
export function reviewPhase(workflow: ObjectValue, checkpoint: Checkpoint): "collecting" | "reviewing" | "user-confirmed" {
  const proof = object(workflow.intakeReview);
  if (workflow.intakeCompleted === true && proof.version === 1 && proof.confirmedRevision === inputRevision(checkpoint)) return "user-confirmed";
  return proof.version === 1 && proof.reviewedRevision === inputRevision(checkpoint) ? "reviewing" : "collecting";
}
export function invalidateReview(workflow: ObjectValue): ObjectValue {
  return { ...workflow, intakeCompleted: false, intakeReview: { version: 1 } };
}
export function canReview(checkpoint: Checkpoint): boolean {
  return Boolean(confirmedLocationOf(checkpoint.sections)) && storyOf(checkpoint.sections).trim().length > 0;
}

/** Reuse the existing initial selectors. Unknown/skipped is an answer, never an invented fact. */
export function remainingEssentialQuestions(checkpoint: Checkpoint, includeUnknown = false): { id: string; label: string }[] {
  const unknowns = new Set(Array.isArray(checkpoint.sections.builder?.initialUnknowns) ? checkpoint.sections.builder.initialUnknowns as string[] : []);
  if (checkpoint.courtPath === "family" || checkpoint.courtPath === "civil") {
    const source = checkpoint.courtPath === "family" ? object(checkpoint.sections.family) : object(checkpoint.sections.civil?.input);
    const values: Record<string, string | string[] | undefined> = {};
    for (const [key, value] of Object.entries(source)) if (typeof value === "string" || Array.isArray(value) && value.every(item => typeof item === "string")) values[key] = value as string | string[];
    const fields = checkpoint.courtPath === "family" ? familyGuidedFields({ issues: [], filed: [] }) : civilGuidedFields({ issues: [], documents: [] });
    const skipped = new Set(Array.isArray(checkpoint.sections["form-chat"]?.skipped) ? checkpoint.sections["form-chat"].skipped as string[] : []);
    return pendingFields(fields, values, skipped).map(field => ({ id: field.key, label: field.question })).filter(field => includeUnknown || !unknowns.has(field.id));
  }
  const guided = checkpoint.sections.builder?.step === "guided";
  const source = object(checkpoint.sections["small-claims"]?.input);
  const facts = guided ? object(checkpoint.sections.guided?.facts) as IntakeFacts : Object.fromEntries(QUESTION_BANK.flatMap(question => {
    if (!question.capturesField) return [];
    const aliases: Record<string, string> = { role: "yourRole", remedySought: "goal", evidenceText: "evidence" };
    const value = source[aliases[question.capturesField] ?? question.capturesField];
    return (typeof value === "string" && value.trim() && value !== "not-sure") || typeof value === "boolean" || typeof value === "number" ? [[question.capturesField, value]] : [];
  })) as IntakeFacts;
  const answered = guided && Array.isArray(checkpoint.sections.guided?.answeredIds) ? checkpoint.sections.guided.answeredIds as string[] : QUESTION_BANK.filter(question => question.capturesField && facts[question.capturesField] !== undefined).map(question => question.id);
  return selectQuestions(facts, answered, QUESTION_BANK, "small-claims", "initial").map(id => ({ id, label: QUESTION_BANK.find(question => question.id === id)!.text })).filter(question => includeUnknown || !unknowns.has(question.id));
}
export function transitionReview(workflow: ObjectValue, checkpoint: Checkpoint, action: "review" | "collect" | "confirm", expectedInputRevision: string, now: string): ObjectValue {
  if (inputRevision(checkpoint) !== expectedInputRevision) throw new Error("The initial facts changed. Please review the current information again.");
  if (action === "collect") return invalidateReview(workflow);
  if (!canReview(checkpoint)) throw new Error("Add your city and a description of your situation before reviewing.");
  if (action === "confirm" && reviewPhase(workflow, checkpoint) === "user-confirmed") return workflow;
  if (action === "confirm" && reviewPhase(workflow, checkpoint) !== "reviewing") throw new Error("Review the current information before confirming it.");
  if (action === "confirm" && remainingEssentialQuestions(checkpoint).length) throw new Error("Answer the remaining initial questions, or explicitly mark what you do not know, before confirming.");
  return { ...workflow, intakeCompleted: action === "confirm", intakeReview: { version: 1, reviewedRevision: expectedInputRevision, ...(action === "confirm" ? { confirmedRevision: expectedInputRevision, confirmedAt: now } : {}) } };
}

export function reconcileReview(workflow: ObjectValue, previous: Checkpoint, next: Checkpoint): ObjectValue {
  const reviewing = reviewPhase(workflow, previous) === "reviewing";
  return { ...invalidateReview(workflow), ...(reviewing ? { intakeReview: { version: 1, reviewedRevision: inputRevision(next) } } : {}) };
}
