/** Review provenance on workflowStatus; intakeCompleted remains the completion flag. */
import { sentences as sharedSentences } from "./sentences";
import { canonicalJson } from "./canonicalJson";
import { sideOf, situationAnswers, situationOf, stageWords } from "./situation/situation";
import { countable, dayWrittenBefore, findDates, formatForCourt, findDayMonthWithoutYear, MONTH_WORDS_EN } from "./dates";
import { readCheckpoint, type Checkpoint } from "./intakeCheckpoint";
import { freshSections } from "./storyBasis";
import { locationOf, storyOf, STORY_INPUT_KEYS, STORY_SECTION, confirmedLocationOf } from "./intakeStory";
import { familyGuidedFields, civilGuidedFields, pendingFields, familyTimelineValues, servedDateOf, FAMILY_FILED_OPTIONS, FAMILY_ISSUE_OPTIONS, CIVIL_ISSUE_OPTIONS, CIVIL_DOCUMENT_OPTIONS, SMALL_CLAIMS_FILED_OPTIONS } from "../../../app/builder/_components/guidedFields";
import { amountFromStory, goalFromStory, kindsFromStory, type KindCue } from "../../../app/builder/_components/storyAnswers";
import { QUESTION_BANK } from "./intake/questionBank";
import { PHASE_ORDER, selectQuestions, type IntakeFacts } from "./intake/selectQuestions";
import { alreadyAsked, caseFileOf, changesOf, claimKindOf, emptyCaseFile, slotsOfQuestion } from "./caseFile/caseFile";
import { LOAN_WORDS } from "./intake/claimKind";
import { againstThemIn, lossesIn, publicBodyIn, timelineIn } from "./caseFile/storyFacts";

type ObjectValue = Record<string, unknown>;
const object = (value: unknown): ObjectValue => value && typeof value === "object" && !Array.isArray(value) ? value as ObjectValue : {};
const OPTIONAL = new Set(["evidence", "missingEvidence", "uploadedEvidenceFiles", "uploadedFiles", "evidenceFiles", "evidenceText", "defenceEvidenceText"]);
const UI = new Set(["mode", "editingStory", "personSet", "personDocuments"]);
/** Family details that belong to one issue: asked for only when that issue is chosen. */
const HUMAN_RIGHTS = ["human-rights", "disability-accommodation", "employment-human-rights", "housing-human-rights", "education-human-rights"];
const PUBLIC_BODY = ["government-public-authority", "charter", "police-conduct", "judicial-review", "tribunal-overlap"];
/**
 * Details that belong to one kind of matter: asked for only when the person chose it ("Adoption
 * details" on a divorce case, #477 re-test case 14; "Human rights grounds", "Discrimination facts"
 * and "Accommodation requests" on a Charter claim against police, Charter re-test 2026-10-26).
 */
/** No answer: empty text, an empty list, nothing, or "not sure". */
const blankAnswer = (value: unknown) => value === undefined || value === null || value === "not-sure" || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && value.length === 0);
const ISSUE_ONLY: Record<string, string[]> = {
  adoptionDetails: ["adoption"],
  humanRightsGrounds: HUMAN_RIGHTS, discriminationFacts: HUMAN_RIGHTS, accommodationRequests: HUMAN_RIGHTS,
  governmentActor: PUBLIC_BODY, publicDecisionOrConduct: PUBLIC_BODY,
  institutionalFacts: ["institutional-negligence"],
  privacyRecordsFacts: ["privacy"],
};
export type ReviewEntry = { section: string; field: string; nested?: string; label: string; value: string | string[] | number | boolean; essential: boolean; /** A choice field: stored values with the words the form shows. */ choices?: { value: string; label: string }[]; /** What the story says about an empty answer, to help fill it in. */ hint?: string; /** The question the field answers, where one is written: a date question's box asks for the year (dates.ts). */ question?: string; /** Answered in the situation questions before the story (situation.ts): shown, changed only there. */ fromStart?: boolean; /** What the story says for an empty box, offered in one click (storyFacts.ts). */ fromStory?: { value: string; quote: string } };

/** Small Claims' roles in the form's own words (one place: the review and its start answers). */
const SMALL_CLAIMS_ROLE_WORDS: Record<string, string> = { plaintiff: "Plaintiff / claimant", defendant: "Defendant / responding party" };

/** The civil review's boxes the story can fill, each by its reader (Charter re-test 27 Oct: the public body, the losses and the timeline were empty). */
const BOX_FROM_STORY: Record<string, (story: string) => { value: string; quote: string } | null> = {
  governmentActor: publicBodyIn,
  damagesBreakdown: lossesIn,
  timeline: timelineIn,
};
const FAMILY_FIELDS = () => familyGuidedFields({ issues: FAMILY_ISSUE_OPTIONS, filed: FAMILY_FILED_OPTIONS });
const CIVIL_FIELDS = () => civilGuidedFields({ issues: CIVIL_ISSUE_OPTIONS, documents: CIVIL_DOCUMENT_OPTIONS });
/** The form's own wording for fields no question defines (Family: ten boxes were labelled from their code names, re-test 2026-10-18). */
const FIELD_LABELS: Record<string, string> = {
  adoptionDetails: "Adoption details", caseStage: "Case stage", currentLivingSituation: "Current living situation",
  missingEvidence: "Evidence still missing", pastLivingHistory: "Past caregiving / living history",
  propertyHomeDetails: "Property / home / financial disclosure details", safetyConcerns: "Safety or urgent concerns",
  timeline: "Timeline", yourName: "Your name", evidence: "Evidence you have",
  uploadedEvidenceFiles: "Documents you uploaded", uploadedFiles: "Documents you uploaded", evidenceFiles: "Documents you uploaded",
  placeOfMarriage: "Where you married", existingOrderDate: "Date of the existing order",
  // Civil's own detail boxes, in words (the Charter re-test showed them as "Government actor", "Institutional facts").
  humanRightsGrounds: "The grounds of discrimination", discriminationFacts: "What happened that was discriminatory",
  accommodationRequests: "The accommodation you asked for", governmentActor: "The public body or official involved",
  publicDecisionOrConduct: "The decision or conduct you are challenging", institutionalFacts: "What the institution did or did not do",
  privacyRecordsFacts: "The records or privacy issue", damagesBreakdown: "What your losses are made up of",
  settlementEfforts: "What you have tried to settle it", limitationDeadline: "A deadline you know of",
  courtLocation: "Court location", courtFileNumber: "Court file number", otherParty: "The other party",
};
/** Whether a field has words written for it (a field with none would show its code name turned into words). */
export function hasWrittenLabel(courtPath: string, key: string): boolean {
  const fields = courtPath === "family" ? FAMILY_FIELDS() : courtPath === "civil" ? CIVIL_FIELDS() : [];
  return Boolean(fields.find((field) => field.key === key)?.label ?? FIELD_LABELS[key] ?? QUESTION_BANK.find((item) => item.capturesField === key)?.text);
}
// Plain sentence case for a field with no written label ("Children info", not "Children Info").
const label = (key: string) => key.replace(/([a-z])([A-Z])/g, (_, a: string, b: string) => `${a} ${b.toLowerCase()}`).replace(/^./, c => c.toUpperCase());

/**
 * The civil or Family form field a remaining question fills, so the review panel can
 * offer a way to answer it there (#469 re-test: civil's remaining questions had only
 * an "I do not know yet" box). Small Claims questions come from the question bank.
 */
export function reviewQuestionField(courtPath: string, id: string, checkpoint?: Checkpoint): { kind: "text" | "longtext" | "choice" | "multi"; question: string; options: { value: string; label: string }[]; needsMore?: (value: string) => string | null; fromStory?: string; suggested?: string[]; suggestedQuote?: string } | null {
  const fields = courtPath === "family" ? FAMILY_FIELDS() : courtPath === "civil" ? CIVIL_FIELDS() : [];
  const field = fields.find((item) => item.key === id);
  // What the story already says for a typed answer, offered for one click as in the questions
  // (#477 re-test, cases 14 and 16: the children and the court date asked when the story gave them).
  const said = field && checkpoint ? field.fromStory?.({ ...object(courtPath === "family" ? freshSections(checkpoint).family : freshSections(checkpoint)[courtPath]?.input), facts: storyOf(checkpoint.sections) }) : null;
  const offered = said && (field?.kind === "text" || field?.kind === "longtext") && typeof said.value === "string" && said.value.trim() ? said.value : undefined;
  // A pick-everything-that-fits field: the choices the story names, ticked for the person to confirm.
  const suggested = said && field?.kind === "multi" && Array.isArray(said.value) && said.value.length ? said.value.filter((value) => field.options?.some((option) => option.value === value)) : undefined;
  // The field's own check (the served date's year) applies here as in the questions.
  return field ? { kind: field.kind, question: field.question, options: field.options ?? [], ...(field.needsMore ? { needsMore: field.needsMore } : {}), ...(offered ? { fromStory: offered } : {}), ...(suggested?.length ? { suggested, suggestedQuote: said!.quote } : {}) } : null;
}

/** A projection of existing answers, not another case model or question selector. */
export function reviewEntries(checkpoint: Checkpoint): ReviewEntry[] {
  // Answers based on an earlier version of the story are not shown as answers (storyBasis.ts).
  const { courtPath } = checkpoint;
  const sections = freshSections(checkpoint);
  const section = courtPath === "family" ? "family" : courtPath === "civil" ? "civil" : "small-claims";
  const fields = courtPath === "family" ? FAMILY_FIELDS() : courtPath === "civil" ? CIVIL_FIELDS() : [];
  // The situation answers (situation.ts) are the side, what was filed and the day served: shown
  // as the person gave them, never the area's own stale copy, and changed only at the top (step 2).
  const fromStart = situationAnswers(courtPath, situationOf(sections));
  const startKeys = new Set<string>();
  const stored = courtPath === "family" ? object(sections.family) : object(sections[section]?.input);
  // The same answers before any is set aside for an earlier story (for which questions apply).
  const asStored = courtPath === "family" ? object(checkpoint.sections.family) : object(checkpoint.sections[section]?.input);
  const source: Record<string, unknown> = { ...stored };
  if (fromStart.role) { source.yourRole = courtPath === "small-claims" ? SMALL_CLAIMS_ROLE_WORDS[fromStart.role] ?? fromStart.role : fromStart.role; startKeys.add("yourRole"); }
  if (fromStart.documents) { source[courtPath === "civil" ? "documents" : "filedDocuments"] = fromStart.documents; startKeys.add(courtPath === "civil" ? "documents" : "filedDocuments"); }
  if (fromStart.caseStage) { source.caseStage = fromStart.caseStage; startKeys.add("caseStage"); }
  else if (Array.isArray(source[courtPath === "civil" ? "documents" : "filedDocuments"]) && fromStart.excludeDocuments) source[courtPath === "civil" ? "documents" : "filedDocuments"] = (source[courtPath === "civil" ? "documents" : "filedDocuments"] as string[]).filter(item => !fromStart.excludeDocuments!.includes(item));
  const entries: ReviewEntry[] = [];
  const add = (area: string, key: string, value: unknown, nested?: string) => {
    // Civil keeps the location as city and province in its form input too: a second copy of the one location, not a second answer.
    if (UI.has(key) || (area !== STORY_SECTION && STORY_INPUT_KEYS.has(key)) || (area === "civil" && (key === "city" || key === "province")) || !(typeof value === "string" || typeof value === "number" || typeof value === "boolean" || (Array.isArray(value) && value.every(v => typeof v === "string")))) return;
    const definition = fields.find(field => field.key === key);
    const question = QUESTION_BANK.find(item => item.capturesField === key);
    // What the person picked at the start, in their words: the step's title and who started the case.
    // The stage in words for every start answer (the step's title, or "Responding to a case"), never its code (26 Oct re-test: "Case stage: responding").
    // The Small Claims chat keeps the side as `role` (reviewer, 26 Oct: "Role: plaintiff" in a text box).
    const roleKey = key === "yourRole" || (area === "guided" && key === "role");
    const fromStartHere = (area === section && startKeys.has(key)) || (area === "guided" && key === "role" && Boolean(fromStart.role));
    const startWords = fromStartHere && typeof value === "string" ? (key === "caseStage" ? stageWords(fromStart) ?? undefined : roleKey ? fromStart.roleWords : undefined) : undefined;
    // Small Claims keeps its role as a code ("plaintiff"): shown in the form's words, not in a text box (26 Oct re-test).
    const roleWords = !startWords && courtPath === "small-claims" && roleKey && typeof value === "string" ? SMALL_CLAIMS_ROLE_WORDS[value] : undefined;
    const choices = startWords ? [{ value: value as string, label: startWords }] : roleWords ? Object.entries(SMALL_CLAIMS_ROLE_WORDS).map(([code, label]) => ({ value: code, label })) : definition?.options ?? (courtPath === "small-claims" && key === "filedDocuments" ? SMALL_CLAIMS_FILED_OPTIONS : undefined);
    // A detail of one issue is asked for only when that issue is the person's ("Adoption details"
    // showed on a divorce case, #477 re-test case 14).
    const issueOnly = ISSUE_ONLY[key];
    // Judged on the answers as given, set-aside ones included: an answer kept from an earlier
    // story stays on its own line, marked, never moved to an unlabelled list (story-change test).
    // Each answer as it is now, or as it was given where it has been set aside (emptied).
    const asGiven = { ...source, ...Object.fromEntries(Object.entries(asStored).filter(([name, value]) => blankAnswer(source[name]) && !blankAnswer(value))) };
    const notTheirIssue = issueOnly ? !issueOnly.some((issue) => [...(Array.isArray(source.issues) ? source.issues as string[] : []), ...(Array.isArray(asStored.issues) ? asStored.issues as string[] : [])].includes(issue)) : false;
    // A question asked only on one side or in one situation (its `when`: "When and how you were
    // served" is the responding side's) is not essential for anyone else.
    const notTheirQuestion = definition?.when ? !definition.when({ ...asGiven, facts: storyOf(sections) } as never) : false;
    entries.push({ section: area, field: key, nested, label: definition?.label ?? FIELD_LABELS[key] ?? question?.text ?? label(key), value: value as ReviewEntry["value"], essential: notTheirIssue || notTheirQuestion ? false : definition?.initial ?? !OPTIONAL.has(key), ...(choices?.length ? { choices } : {}), ...(definition?.question ?? question?.text ? { question: definition?.question ?? question?.text } : {}), ...(fromStartHere ? { fromStart: true } : {}) });
  };
  // The one copy of the story and location comes first, whatever the route (intakeStory.ts).
  entries.push({ section: STORY_SECTION, field: "text", label: "Your story", value: storyOf(sections), essential: true });
  if (courtPath === "small-claims" && sections.builder?.step === "guided") {
    const guided: Record<string, unknown> = { ...object(sections.guided?.facts) };
    if (fromStart.role) guided.role = fromStart.role;
    if (fromStart.claimFiled !== undefined) guided.claimFiled = fromStart.claimFiled;
    // An answer given for an earlier version of the story stays on its line, marked, as
    // in Family; it was dropped, so a story change "wiped" the side and Yes/No answers (#471 re-test).
    const earlier = object(checkpoint.sections.guided?.facts);
    // The earlier answer is shown where the current story has none (an emptied key showed as a blank box).
    const isBlank = (value: unknown) => value === undefined || value === null || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && value.length === 0);
    for (const key of new Set([...Object.keys(earlier), ...Object.keys(guided)])) add("guided", key, isBlank(guided[key]) ? earlier[key] : guided[key], "facts");
    // What an answer given in this panel stands for ("No" to "Has a Plaintiff's Claim been
    // filed?" is Claim Filed: no), where the guided questions did not record it (#470 re-test:
    // no "Claim Filed" line after "nothing filed" was answered).
    for (const [key, value] of Object.entries(panelAnswerFacts({ ...checkpoint, sections }))) if (!(key in guided)) add("guided", key, value, "facts");
  } else {
    for (const [key, value] of Object.entries(source)) add(section, key, value, courtPath === "family" ? undefined : "input");
  }
  // Family keeps the day of service inside the Timeline; it is shown as its own line
  // (re-test 2026-10-18: a confirmed "served last week" appeared nowhere in the review).
  if (courtPath === "family" && (source.yourRole === "respondent" || servedDateOf(String(object(sections.family).timeline ?? "")))) {
    const startServed = fromStart.servedOn ? formatForCourt(fromStart.servedOn) : "";
    const served = startServed || servedDateOf(String(object(sections.family).timeline ?? ""));
    const said = served ? undefined : sharedSentences(storyOf(sections)).find(sentence => /\bserved\b/i.test(sentence))?.trim();
    entries.push({ section: "family", field: "servedDate", label: "Day you were served", value: served, essential: true, ...(said ? { hint: `Your story says: “${said}”` } : {}), ...(startServed ? { fromStart: true } : {}) });
  }
  const location = locationOf(sections);
  if (location) entries.push({ section: STORY_SECTION, nested: "location", field: "city", label: "City", value: location.city, essential: true });
  // An empty civil box the story answers: its words offered in one click, never filled for them (s. 4).
  const story = storyOf(sections);
  if (story.trim()) for (const entry of entries) {
    const read = entry.section === "civil" && (!entry.nested || entry.nested === "input") ? BOX_FROM_STORY[entry.field] : undefined;
    const offer = read && typeof entry.value === "string" && !entry.value.trim() ? read(story) : null;
    if (offer) entry.fromStory = offer;
  }
  return entries;
}

/** UI navigation, research results and later evidence never masquerade as initial fact edits. */
/** Each material fact, keyed by where it lives: the basis of materialInitialFacts. */
function materialFacts(checkpoint: Checkpoint): Map<string, string> {
  // Which Small Claims route is OPEN is navigation, not a fact: the answers of both
  // routes count, so choosing the other route never cancels a confirmation (re-test 2026-10-18).
  const onStep = (step: string): Checkpoint => ({ ...checkpoint, sections: { ...checkpoint.sections, builder: { ...checkpoint.sections.builder, step } } });
  const views = checkpoint.courtPath === "small-claims" ? [onStep("form"), onStep("guided")] : [checkpoint];
  const facts = new Map<string, string>();
  for (const entry of views.flatMap(view => reviewEntries(view))) {
    if (OPTIONAL.has(entry.field)) continue;
    // Unknown is not a fact: an empty field or "not sure" is the same as no answer.
    if (entry.section !== STORY_SECTION && (entry.value === "" || entry.value === "not-sure" || (Array.isArray(entry.value) && entry.value.length === 0))) continue;
    const key = JSON.stringify([entry.section, entry.nested, entry.field]);
    // Each value in one canonical form (canonicalJson.ts): the saved copy comes back from jsonb with its
    // keys reordered, and must still be the same fact (Chrome, 28 Oct: Confirm bounced on that alone).
    if (!facts.has(key)) facts.set(key, canonicalJson(entry.value));
  }
  facts.set("court", canonicalJson(checkpoint.courtPath));
  for (const [question, answer] of Object.entries(initialAnswersOf(checkpoint))) facts.set(JSON.stringify(["initialAnswers", question]), canonicalJson(answer));
  const answers = checkpoint.sections.home?.understoodAnswers;
  if (Array.isArray(answers) && answers.length) facts.set("home.understoodAnswers", canonicalJson(answers));
  // The situation answers (situation.ts) are facts the guidance rests on: changing one is confirmed again.
  for (const [key, value] of Object.entries(situationOf(checkpoint.sections))) facts.set(JSON.stringify(["situation", key]), canonicalJson(value));
  // The change record (caseFile.ts withChange): each change is a change of a confirmed fact (rule 6,
  // 31 Oct), so it cancels the confirmation that rested on the old answer (isChangeKey below).
  for (const [fact, change] of Object.entries(changesOf(checkpoint.sections))) facts.set(JSON.stringify([CHANGE_KEY, fact]), canonicalJson(change));
  return facts;
}

/** The material-fact key of one fact's change record: a change counts even where the fact had no key before. */
const CHANGE_KEY = "caseFile.change";
const isChangeKey = (key: string) => key.startsWith(`["${CHANGE_KEY}",`);

export function materialInitialFacts(checkpoint: Checkpoint): string {
  return JSON.stringify([...materialFacts(checkpoint)].sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * True when an answer the person already had was changed or removed. A field that
 * was empty getting its first value is not counted: that is how a form registers
 * its defaults, and treating it as an edit cancelled the confirmation on the first
 * "Show my next step" (re-test 2026-10-18).
 */
export function existingFactChanged(previous: Checkpoint, next: Checkpoint): boolean {
  const after = materialFacts(next);
  const before = materialFacts(previous);
  for (const [key, value] of before) if (after.get(key) !== value) return true;
  // A new change through "Change" is never "only an added answer": it replaces or removes one.
  for (const [key, value] of after) if (isChangeKey(key) && before.get(key) !== value) return true;
  return false;
}

/**
 * THE ONE RULE for whether a person's change starts a new input revision, used by the
 * browser store (IntakeRecovery.tsx put and "Start the questions again"); the server's
 * safety net (intakeCheckpoint.ts saveCheckpoint) applies the same existingFactChanged.
 *
 * Once the intake is confirmed, only an answer the person already had being changed or
 * removed cancels the confirmation; an answer that only ADDS a fact keeps it. The browser
 * used to renew on any difference, so one more answer after Confirm took the tick away
 * and "Continue to your next steps" sent the person back to the review, on every route
 * (Chrome re-test 29 Oct, D1), while the server would have kept it.
 *
 * Before Confirm any material change renews, so a tick given before a late answer is
 * asked for again ("You changed an answer. Please tick to confirm again.").
 */
export function renewsInputRevision(workflow: ObjectValue, previous: Checkpoint, next: Checkpoint): boolean {
  if (reviewPhase(workflow, previous) === "user-confirmed") return confirmedAnswerChanged(workflow, previous, next);
  return materialInitialFacts(next) !== materialInitialFacts(previous);
}

/** A short, stable mark of one fact's value: enough to tell that it changed, without keeping a copy. */
function fingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return `${hash.toString(16)}:${value.length}`;
}

/** Each material fact's mark, as confirmed: recorded with the confirmation (transitionReview). */
export function confirmedFactMarks(checkpoint: Checkpoint): Record<string, string> {
  return Object.fromEntries([...materialFacts(checkpoint)].map(([key, value]) => [key, fingerprint(value)]));
}

/**
 * After Confirm: was an answer the person CONFIRMED changed or removed? Compared with the facts
 * as they stood at the click (intakeReview.confirmedFacts), never with the last key press: a box
 * empty at Confirm, typed into one key at a time, is one added answer, not a string of changed
 * ones (Chrome check of #514's preview, 29 Oct: typing into "Important dates / timeline" after
 * Confirm cancelled it, because "Ma" counted as changing "M"). A confirmation recorded before the
 * marks existed falls back to the previous state (existingFactChanged).
 */
export function confirmedAnswerChanged(workflow: ObjectValue, previous: Checkpoint, next: Checkpoint): boolean {
  const marks = object(object(workflow.intakeReview).confirmedFacts);
  if (!Object.keys(marks).length) return existingFactChanged(previous, next);
  const now = confirmedFactMarks(next);
  // A change made through "Change" after Confirm replaces or removes a confirmed answer, even where
  // the answer it replaces was held outside these marks (the saved position, the saved copy).
  return Object.entries(marks).some(([key, mark]) => now[key] !== mark) || Object.entries(now).some(([key, mark]) => isChangeKey(key) && marks[key] !== mark);
}

/**
 * The browser store's one step for a change of the person's answers (IntakeRecovery.tsx put and
 * "Start the questions again"): any change of the facts renews `factsRevision`, so next steps
 * made before it are outdated; `inputRevision` is renewed only when renewsInputRevision says
 * so. Sets them on `next`; true when the input revision was renewed (the review is reconciled).
 */
export function applyFactRevisions(workflow: ObjectValue, previous: Checkpoint, next: Checkpoint): boolean {
  if (materialInitialFacts(next) !== materialInitialFacts(previous)) next.factsRevision = next.revision;
  if (!renewsInputRevision(workflow, previous, next)) return false;
  next.inputRevision = next.revision;
  return true;
}

export const inputRevision = (checkpoint: Checkpoint) => checkpoint.inputRevision ?? checkpoint.revision;
/**
 * Which version of the facts the guidance must have been built from. An answer added after
 * Confirm keeps the confirmation (renewsInputRevision) but not the guidance: the next steps
 * were made without it, so they are outdated until made again (D1 review, 29 Oct).
 */
export const factsRevision = (checkpoint: Checkpoint) => checkpoint.factsRevision ?? inputRevision(checkpoint);
/** The facts version the stored guidance was built from (older guidance: its input revision). */
export const guidanceFactsRevision = (master: unknown): unknown => object(master).guidanceFactsRevision ?? object(master).guidanceInputRevision;
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
  if (!revision || object(master).guidanceInputRevision !== revision) return false;
  // confirmedIntakeRevision read this checkpoint already, so it is valid for this court.
  const checkpoint = object(object(master).intakeCheckpoint) as unknown as Checkpoint;
  // An answer added after Confirm keeps the confirmation, never next steps made without it (D1 review).
  return guidanceFactsRevision(master) === factsRevision(checkpoint);
}

/**
 * Confirmed, with next steps made for the confirmed information, but an answer has been added
 * since: the confirmation stands and only the next steps need making again ("Update them"),
 * never "review again".
 */
export function guidanceNeedsUpdate(master: unknown, court?: string | null, caseId?: string): boolean {
  const revision = confirmedIntakeRevision(master, court, caseId);
  return Boolean(revision && object(master).guidanceInputRevision === revision && !guidanceIsCurrent(master, court, caseId));
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

/**
 * A review question's fixed place: its place in the court's own list of questions (Small Claims: the
 * question bank in the order the selector asks it, by phase then bank order; civil and Family: the
 * form's fields in order). The review sorts its questions by this, so each keeps its place while
 * answered, after a reload and in any tab, with nothing held in the page (fault 1, 31 Oct; the earlier
 * owner rule, #471 re-test: answered questions must not jump). A question in neither list goes last.
 */
export function reviewQuestionRank(courtPath: string, id: string): number {
  const order = courtPath === "family" ? FAMILY_FIELDS().map((field) => field.key)
    : courtPath === "civil" ? CIVIL_FIELDS().map((field) => field.key)
    : QUESTION_BANK.filter((question) => question.courtArea === "small-claims").sort((a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase]).map((question) => question.id);
  const place = order.indexOf(id);
  return place === -1 ? Number.MAX_SAFE_INTEGER : place;
}

/** Whether a review question holds an answer in the checkpoint now (a civil or Family form field, Family's day of service in its Timeline, a Small Claims review answer). */
function holdsAnswer(checkpoint: Checkpoint, id: string): boolean {
  const fresh: Checkpoint = { ...checkpoint, sections: freshSections(checkpoint) };
  const value = checkpoint.courtPath === "civil" ? object(fresh.sections.civil?.input)[id]
    : checkpoint.courtPath === "family" ? (id === "servedDate" ? familyTimelineValues(String(object(fresh.sections.family).timeline ?? "")).servedDate : object(fresh.sections.family)[id])
    : initialAnswersOf(fresh)[id];
  return Array.isArray(value) ? value.length > 0 : typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null;
}

/**
 * THE REVIEW'S ONE LIST ("Initial questions"), from the saved case only (fault 1, 31 Oct): the questions
 * still to answer, and those the person answered in the review, as the case file records them
 * (caseFileOf -> answeredInReview), each in its fixed place (reviewQuestionRank). Nothing in it comes
 * from the page, so a reload, a second tab and every screen show the same list. An answered question
 * is listed only while it still holds its answer and its fact was not since changed with "Change".
 */
export function reviewQuestionList(checkpoint: Checkpoint, master?: unknown): { id: string; label: string; answered: boolean }[] {
  const file = caseFileOf(checkpoint, master);
  const unanswered = remainingEssentialQuestions(checkpoint, true, master);
  const listed = [
    ...unanswered.map((question) => ({ ...question, answered: false })),
    ...(file.answeredInReview ?? [])
      .filter((id) => reviewQuestionRank(checkpoint.courtPath, id) !== Number.MAX_SAFE_INTEGER && !unanswered.some((question) => question.id === id) && holdsAnswer(checkpoint, id) && !slotsOfQuestion(id).some((fact) => file[fact].changed))
      .map((id) => ({ id, label: reviewQuestionField(checkpoint.courtPath, id)?.question ?? QUESTION_BANK.find((item) => item.id === id)?.text ?? id, answered: true })),
  ];
  return listed.sort((a, b) => reviewQuestionRank(checkpoint.courtPath, a.id) - reviewQuestionRank(checkpoint.courtPath, b.id));
}

/** Reuse the existing initial selectors. Unknown/skipped is an answer, never an invented fact. */
/**
 * `master`: the saved case, when there is one, so the review reads the same case file as the
 * results and case pages (its saved position: a kind of claim picked on the overview, a step, the
 * step page's dates). Site owner, 29 Oct: the review listed "What kind of dispute is this?" as still
 * needed while the overview showed the person's answer.
 */
export function remainingEssentialQuestions(stored: Checkpoint, includeUnknown = false, master?: unknown): { id: string; label: string }[] {
  // The case file is the one gate (caseFile.ts): a question whose fact is held anywhere is not
  // asked again here, and never blocks Confirm. A fact the person said they did not know gets
  // its one more offer in this review (Jason, 2026-10-24, option 1), as ONE field: its box when
  // the review shows one, otherwise this question (listed with `includeUnknown`, never required).
  // Those this review marked "I don't know yet" stay listed (marked) so they can be changed.
  const unknown = new Set(Array.isArray(stored.sections.builder?.initialUnknowns) ? stored.sections.builder.initialUnknowns as string[] : []);
  const file = caseFileOf(stored, master);
  // Only the boxes the review shows: essential ones, and optional ones with something in them.
  const boxFacts = new Set(reviewEntries(stored).filter(entry => entry.essential || !(entry.value === "" || (Array.isArray(entry.value) && entry.value.length === 0))).flatMap(entry => slotsOfQuestion(entry.field)));
  // Each unsure fact once: a fact already offered by a box, or by an earlier question here, is not offered again.
  const offered = new Set<string>(boxFacts);
  const listed = remainingBeforeCaseFile(stored, includeUnknown);
  // A question this review already offered and the person marked "I don't know yet" covers its facts too.
  for (const question of listed) if (unknown.has(question.id)) for (const fact of slotsOfQuestion(question.id)) offered.add(fact);
  return listed.filter(question => {
    if (!alreadyAsked(file, question.id)) return true;
    if (!includeUnknown) return false;
    if (unknown.has(question.id)) return true;
    const facts = slotsOfQuestion(question.id);
    if (!facts.length || !facts.every(fact => file[fact].state === "unsure") || facts.some(fact => offered.has(fact))) return false;
    for (const fact of facts) offered.add(fact);
    return true;
  });
}

function remainingBeforeCaseFile(stored: Checkpoint, includeUnknown: boolean): { id: string; label: string }[] {
  // A question answered only for an earlier version of the story is asked again (storyBasis.ts).
  const checkpoint: Checkpoint = { ...stored, sections: freshSections(stored) };
  const unknowns = new Set(Array.isArray(checkpoint.sections.builder?.initialUnknowns) ? checkpoint.sections.builder.initialUnknowns as string[] : []);
  if (checkpoint.courtPath === "family" || checkpoint.courtPath === "civil") {
    const source = checkpoint.courtPath === "family" ? object(checkpoint.sections.family) : object(checkpoint.sections.civil?.input);
    const values: Record<string, string | string[] | undefined> = {};
    for (const [key, value] of Object.entries(source)) if (typeof value === "string" || Array.isArray(value) && value.every(item => typeof item === "string")) values[key] = value as string | string[];
    // The story lives in its own section, and Family keeps the served date in the
    // Timeline: both count as answered (re-test 2026-10-18 listed them as missing).
    values.facts = storyOf(checkpoint.sections);
    if (checkpoint.courtPath === "family") Object.assign(values, familyTimelineValues(String(values.timeline ?? "")));
    // What the situation answers settle is answered, never asked again (step 2).
    const fromStart = situationAnswers(checkpoint.courtPath, situationOf(checkpoint.sections));
    if (fromStart.role) values.yourRole = fromStart.role;
    if (fromStart.documents) values[checkpoint.courtPath === "family" ? "filedDocuments" : "documents"] = fromStart.documents;
    if (fromStart.servedOn && checkpoint.courtPath === "family") values.servedDate = formatForCourt(fromStart.servedOn);
    const fields = checkpoint.courtPath === "family" ? FAMILY_FIELDS() : CIVIL_FIELDS();
    const skipped = new Set(Array.isArray(checkpoint.sections["form-chat"]?.skipped) ? checkpoint.sections["form-chat"].skipped as string[] : []);
    return pendingFields(fields, values, skipped).map(field => ({ id: field.key, label: field.question })).filter(field => includeUnknown || !unknowns.has(field.id));
  }
  const initial = smallClaimsInitialAnswers(checkpoint);
  // What the situation answers settle is answered, never asked again (step 2).
  const fromStart = situationAnswers("small-claims", situationOf(checkpoint.sections));
  const facts: IntakeFacts = {
    ...initial.facts,
    ...(fromStart.role ? { role: fromStart.role as IntakeFacts["role"] } : {}),
    ...(fromStart.claimFiled !== undefined ? { claimFiled: fromStart.claimFiled } : {}),
    ...(fromStart.claimServed !== undefined ? { claimServed: fromStart.claimServed } : {}),
  };
  const answered = [...new Set([...initial.answered, ...fromStart.questionIds])];
  return selectQuestions(facts, answered, QUESTION_BANK, "small-claims", "initial").map(id => ({ id, label: QUESTION_BANK.find(question => question.id === id)!.text })).filter(question => includeUnknown || !unknowns.has(question.id));
}

/** What an answer given in the review panel says as a fact, for the questions that depend on it. */
const PANEL_FACT: Record<string, (answer: string) => IntakeFacts> = {
  "sc-orient-role": answer => ({ role: /defendant|responding/i.test(answer) ? "defendant" : "plaintiff" }),
  "sc-orient-dispute-category": answer => (/injury/i.test(answer) ? { disputeCategory: "personal-injury" } : {}),
  "sc-claim-filed": answer => ({ claimFiled: /^yes/i.test(answer) }),
  "sc-defendant-served": answer => ({ claimServed: /^yes/i.test(answer) }),
  "sc-defence-filed": answer => ({ defenceFiled: /^yes/i.test(answer) }),
  "sc-defendant-defence-filed": answer => ({ defenceFiled: /^yes/i.test(answer) }),
};

/** The facts the review panel's own answers stand for (a question's captured field, or its yes/no or choice). */
export function panelAnswerFacts(checkpoint: Checkpoint): IntakeFacts {
  const facts: IntakeFacts = {};
  for (const [id, answer] of Object.entries(initialAnswersOf(checkpoint))) {
    const question = QUESTION_BANK.find(item => item.id === id);
    if (question?.capturesField && question.answerType !== "yes-no") facts[question.capturesField] = answer;
    Object.assign(facts, PANEL_FACT[id]?.(answer) ?? {});
  }
  return facts;
}

/**
 * Small Claims' initial questions, answered from every place an answer can be
 * given: the guided questions, the form, and the review panel. One merged set,
 * whichever route is open (re-test round 7: an answer given in the panel never
 * reached the facts the next questions depend on, so "what you want", the
 * amount and Form 7A were never asked, and the panel's own answers could not
 * clear "Still needed").
 */
export function smallClaimsInitialAnswers(checkpoint: Checkpoint): { facts: IntakeFacts; answered: string[] } {
  const source = object(checkpoint.sections["small-claims"]?.input);
  const aliases: Record<string, string> = { role: "yourRole", remedySought: "goal", remedySoughtText: "goal", amountClaimedText: "amountClaimed", evidenceText: "evidence", timelineText: "timeline" };
  const formFacts = Object.fromEntries(QUESTION_BANK.flatMap(question => {
    if (!question.capturesField) return [];
    const value = source[aliases[question.capturesField] ?? question.capturesField];
    return (typeof value === "string" && value.trim() && value !== "not-sure") || typeof value === "boolean" || typeof value === "number" ? [[question.capturesField, value]] : [];
  })) as IntakeFacts;
  if (source.yourRole === "plaintiff" || source.yourRole === "defendant") formFacts.role = source.yourRole;
  const facts: IntakeFacts = { ...formFacts, ...(object(checkpoint.sections.guided?.facts) as IntakeFacts), ...panelAnswerFacts(checkpoint) };
  const answered = [
    ...(Array.isArray(checkpoint.sections.guided?.answeredIds) ? checkpoint.sections.guided.answeredIds as string[] : []),
    ...QUESTION_BANK.filter(question => question.capturesField && facts[question.capturesField] !== undefined).map(question => question.id),
    ...Object.keys(initialAnswersOf(checkpoint)),
    ...(facts.role ? ["sc-orient-role"] : []),
  ];
  return { facts, answered: [...new Set(answered)] };
}
/** Answers to the initial questions given in the review panel (question id -> answer). */
export function initialAnswersOf(checkpoint: Checkpoint): Record<string, string> {
  const answers = object(checkpoint.sections.builder?.initialAnswers);
  return Object.fromEntries(Object.entries(answers).filter(([, value]) => typeof value === "string" && value.trim())) as Record<string, string>;
}

const SIDE_CUES: [RegExp, string][] = [
  [/\b(i was served|served me|sued me|suing me|claim against me|claimed against me|they are claiming|plaintiff's claim against)\b/i, "Responding to a claim (defendant)"],
  // The person telling a story about money they paid out is the one bringing the claim
  // ("a contractor took a $3,000 deposit and never did the work", re-test 2026-10-18).
  [/\b(owes? me|owed me|never paid|did not pay|didn't pay|won't pay|refused to (pay|refund|return)|kept my|i want to sue|i want (my|the) money|never came back|left the work|did not return|i paid|we paid|paid (him|her|them|a|an|the)|took (my|our|a|an|the)\b[^.]{0,30}\b(deposit|money|payment)|never (did|finished|completed|delivered|showed up|started))\b/i, "Bringing the claim (plaintiff)"],
];
/** Small Claims' cue table for "What kind of dispute is this?", read by the one shared reader (storyAnswers.ts kindsFromStory). */
export const SMALL_CLAIMS_KIND_CUES: readonly KindCue[] = [
  // A contractor's deposit is about the work, so this comes before "deposit".
  ["Work or a service you paid for (e.g. a contractor)", /\b(contractor|renovat\w*|repair\w*|roof\w*|plumb\w*|electrician|landscap\w*|mechanic)\b/i],
  ["A deposit that wasn't returned", /\bdeposit\b/i],
  ["A loan or debt", LOAN_WORDS],
  // "fell" of a person, never of a thing that "fell apart" or "fell off".
  ["A personal injury (a fall, an animal bite, or similar)", /\b(bit|bite|bitten|slipped|tripped|injur\w*)\b|\bfell\b(?!\s+(?:apart|off|through|behind|short|out of)\b)/i],
  ["Something said about you (defamation)", /\b(defam\w*|lies about me|posted about me|rumou?rs?)\b/i],
  // A vehicle only when the same sentence says it crashed, hit or was damaged, or it is theirs: a truck merely
  // parked outside named a vehicle dispute for "A moving company broke my dining table" (carry, Small Claims
  // second case). The shared reader tests one sentence at a time (sentences.ts), so both words are in one sentence.
  ["A vehicle-related dispute", /\b(car|vehicle|truck)\b.*\b(hit|crash\w*|collid\w*|damag\w*|dent\w*|scratch\w*|accident|rear-ended|backed into)\b|\b(hit|crash\w*|collid\w*|damag\w*|dent\w*|scratch\w*|accident|rear-ended|backed into)\b.*\b(car|vehicle|truck)\b|\bcollision\b|\bmy (car|vehicle|truck)\b/i],
  // "broke" of a thing, never of an agreement ("broke the contract", "broke the lease", "broke up", "broke down").
  ["Property damage", /\b(damaged|damage to|smashed|cracked|shattered|destroyed|ruined)\b|\b(broke|broken)\b(?!\s+(?:(?:the|our|my|their|his|her|a|an|its)\s+)?(?:contract|lease|agreement|promise|deal|law|laws|rules?|terms|news|up|down|in|off)\b)/i],
  ["Unpaid money owed to you", /\b(invoice\w*|unpaid)\b/i],
  ["A consumer purchase problem", /\b(bought|purchase\w*|refund)\b/i],
  ["A contract or agreement dispute", /\b(contract|agreement)\b/i],
];

/**
 * Suggestions for the Small Claims initial questions, read from the story without
 * AI: the first full date written in it, and plain wording cues for side and kind
 * of dispute. Shown as suggestions the person confirms; never saved on their own
 * (re-test 2026-10-18: Confirm forced "I do not know yet" for what the story said).
 */
export function suggestInitialAnswers(checkpoint: Checkpoint): Record<string, string> {
  if (checkpoint.courtPath !== "small-claims") return {};
  const whole = storyOf(checkpoint.sections);
  // Someone responding is asked about the claim against them: read the sentences about it, never
  // the claim they once meant to bring (26 Oct re-test, case 19 after the side change: "Work or a
  // service you paid for" was suggested for the defamation claim against him). None: nothing offered.
  const story = sideOf(situationOf(checkpoint.sections)) === "responding" ? againstThemIn(whole) : whole;
  if (!story.trim()) return {};
  const out: Record<string, string> = {};
  const date = whenItHappened(story);
  if (date) out["sc-orient-when-happened"] = date;
  const side = SIDE_CUES.find(([cue]) => cue.test(story));
  if (side) out["sc-orient-role"] = side[1];
  // Someone billed for work they did and was not paid is owed money, whatever the work was
  // (re-test round 7: an unpaid renovation invoice was suggested as "a service you paid for").
  // A loan named ("I lent my cousin $2,000 and she never paid it back") is a loan, not money owed for work.
  const owedForWork = /\b(invoice\w*|unpaid|never paid|did not pay|didn't pay|won't pay)\b/i.test(story) && !/\b(i|we) paid\b|\bdeposit\b/i.test(story) && !LOAN_WORDS.test(story);
  const category = owedForWork ? "Unpaid money owed to you" : kindsFromStory(story, SMALL_CLAIMS_KIND_CUES, { first: true })?.value[0];
  // Never a kind the person removed or turned down ("Not quite"), rule 6 (31 Oct): the case file says which.
  const file = caseFileOf(checkpoint);
  const named = claimKindOf({ ...emptyCaseFile(), claimKind: { state: "answered", value: category ?? "", confirmed: true } }).claimTypeId;
  if (category && !file.claimKind.removed && !(named && file.claimKindRemoved?.includes(named))) out["sc-orient-dispute-category"] = category;
  // The amount and the outcome, read as the form already reads them (storyAnswers.ts).
  const amount = amountFromStory(story);
  if (amount) out["sc-amount-claimed"] = amount.value;
  const goal = goalFromStory(story);
  if (goal) out["sc-remedy-sought"] = goal.value;
  return out;
}

/** "payment was due July 10", "by July 10": a deadline, not when it happened. */
const DEADLINE_BEFORE = /\b(?:due|deadline|payable|by|until|before|no later than|expires?|expiring)\s*(?:on\s*)?$/i;

/**
 * When it happened, from the story: the first date that is not written as a
 * deadline (re-test round 7: "work finished June 10, payment due July 10" was
 * read as July 10), read by the shared reader (dates.ts). A full date is offered
 * as it is, a month and year ("August 2026") as it is. A day and month with no
 * year is not offered: its year would be a guess (it took another date's year
 * before), so the person types it and is asked for the year.
 */
function whenItHappened(story: string): string | null {
  const notDeadline = (index: number) => !DEADLINE_BEFORE.test(story.slice(Math.max(0, index - 30), index));
  const mentions = [
    ...findDates(story).filter((date) => (date.precision === "day" ? countable(date) : date.precision === "month" && !dayWrittenBefore(story, date))).map((date) => ({ index: story.indexOf(date.source), date })),
    ...findDayMonthWithoutYear(story).filter((date) => !date.numeric).map((date) => ({ index: date.index, date: null })),
  ].filter((mention) => mention.index >= 0).sort((a, b) => a.index - b.index);
  const chosen = mentions.find((mention) => notDeadline(mention.index));
  if (!chosen || !chosen.date) return null;
  if (chosen.date.precision === "day") return chosen.date.iso;
  const [year, month] = chosen.date.iso.split("-").map(Number);
  return `${MONTH_WORDS_EN[month - 1]} ${year}`;
}

export function transitionReview(workflow: ObjectValue, checkpoint: Checkpoint, action: "review" | "collect" | "confirm", expectedInputRevision: string, now: string, master?: unknown): ObjectValue {
  if (inputRevision(checkpoint) !== expectedInputRevision) throw new Error("The initial facts changed. Please review the current information again.");
  // "You changed an answer, so please review and confirm again." is kept, in the saved record, until the
  // person confirms again: opening the review or returning to the questions never drops it (founder's
  // Chrome check of #536, 1 Nov: reloaded before the change was saved, the review opened collecting, and
  // "Stop initial questions and review" took the message away).
  const marker = action !== "confirm" && object(workflow.intakeReview).changedAfterConfirm === true ? { changedAfterConfirm: true } : {};
  if (action === "collect") return { ...invalidateReview(workflow), intakeReview: { version: 1, ...marker } };
  if (!canReview(checkpoint)) throw new Error("Add your city and a description of your situation before reviewing.");
  if (action === "confirm" && reviewPhase(workflow, checkpoint) === "user-confirmed") return workflow;
  if (action === "confirm" && reviewPhase(workflow, checkpoint) !== "reviewing") throw new Error("Review the current information before confirming it.");
  if (action === "confirm" && remainingEssentialQuestions(checkpoint, false, master).length) throw new Error("Answer the remaining initial questions, or explicitly mark what you do not know, before confirming.");
  return { ...workflow, intakeCompleted: action === "confirm", intakeReview: { version: 1, reviewedRevision: expectedInputRevision, ...marker, ...(action === "confirm" ? { confirmedRevision: expectedInputRevision, confirmedAt: now, confirmedFacts: confirmedFactMarks(checkpoint) } : {}) } };
}

/**
 * A material change cancels confirmation. `fromReview`: the change was made in the
 * review panel itself, so a confirmed intake returns to reviewing (the person is
 * already looking at it) rather than to collecting (re-test 2026-10-18).
 */
export function reconcileReview(workflow: ObjectValue, previous: Checkpoint, next: Checkpoint, fromReview = false): ObjectValue {
  const phase = reviewPhase(workflow, previous);
  const reviewing = phase === "reviewing" || (fromReview && phase === "user-confirmed");
  // Remembered until confirmed again, so the review can say why (rule 6, 31 Oct): "You changed an
  // answer, so please review and confirm again." Kept on the server too (saveCheckpoint reconciles).
  const marker = phase === "user-confirmed" || object(workflow.intakeReview).changedAfterConfirm === true ? { changedAfterConfirm: true } : {};
  return { ...invalidateReview(workflow), intakeReview: { version: 1, ...(reviewing ? { reviewedRevision: inputRevision(next) } : {}), ...marker } };
}

/** An answer was changed after Confirm and it is not confirmed again yet: the review says so (reconcileReview). */
export function changedAfterConfirm(workflow: ObjectValue, checkpoint: Checkpoint): boolean {
  return object(workflow.intakeReview).changedAfterConfirm === true && reviewPhase(workflow, checkpoint) !== "user-confirmed";
}

/**
 * The same, for a saved case (the case page): read from the saved record only, so the case page says
 * "You changed an answer, so please review and confirm again." and shows the newest answers before the
 * person confirms again (founder's Chrome check of #536, 1 Nov: the case page showed neither).
 */
export function savedCaseChangedAfterConfirm(master: unknown, court?: string | null, caseId?: string): boolean {
  const record = object(master);
  const area = court ?? object(record.intakeCheckpoint).courtPath;
  if (area !== "small-claims" && area !== "family" && area !== "civil") return false;
  const checkpoint = readCheckpoint(object(record.intakeCheckpoint), area, caseId);
  return Boolean(checkpoint && changedAfterConfirm(object(record.workflowStatus), checkpoint));
}
