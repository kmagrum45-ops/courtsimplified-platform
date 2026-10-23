/** Review provenance on workflowStatus; intakeCompleted remains the completion flag. */
import { readCheckpoint, type Checkpoint } from "./intakeCheckpoint";
import { freshSections } from "./storyBasis";
import { locationOf, storyOf, STORY_INPUT_KEYS, STORY_SECTION, confirmedLocationOf } from "./intakeStory";
import { familyGuidedFields, civilGuidedFields, pendingFields, familyTimelineValues, servedDateOf, FAMILY_FILED_OPTIONS, FAMILY_ISSUE_OPTIONS, CIVIL_ISSUE_OPTIONS, CIVIL_DOCUMENT_OPTIONS } from "../../../app/builder/_components/guidedFields";
import { amountFromStory, goalFromStory } from "../../../app/builder/_components/storyAnswers";
import { QUESTION_BANK } from "./intake/questionBank";
import { selectQuestions, type IntakeFacts } from "./intake/selectQuestions";

type ObjectValue = Record<string, unknown>;
const object = (value: unknown): ObjectValue => value && typeof value === "object" && !Array.isArray(value) ? value as ObjectValue : {};
const OPTIONAL = new Set(["evidence", "missingEvidence", "uploadedEvidenceFiles", "uploadedFiles", "evidenceFiles", "evidenceText", "defenceEvidenceText"]);
const UI = new Set(["mode", "editingStory", "personSet", "personDocuments"]);
export type ReviewEntry = { section: string; field: string; nested?: string; label: string; value: string | string[] | number | boolean; essential: boolean; /** A choice field: stored values with the words the form shows. */ choices?: { value: string; label: string }[]; /** What the story says about an empty answer, to help fill it in. */ hint?: string };
const FAMILY_FIELDS = () => familyGuidedFields({ issues: FAMILY_ISSUE_OPTIONS, filed: FAMILY_FILED_OPTIONS });
const CIVIL_FIELDS = () => civilGuidedFields({ issues: CIVIL_ISSUE_OPTIONS, documents: CIVIL_DOCUMENT_OPTIONS });
/** The form's own wording for fields no question defines (Family: ten boxes were labelled from their code names, re-test 2026-10-18). */
const FIELD_LABELS: Record<string, string> = {
  adoptionDetails: "Adoption details", caseStage: "Case stage", currentLivingSituation: "Current living situation",
  missingEvidence: "Evidence still missing", pastLivingHistory: "Past caregiving / living history",
  propertyHomeDetails: "Property / home / financial disclosure details", safetyConcerns: "Safety or urgent concerns",
  timeline: "Timeline", yourName: "Your name", evidence: "Evidence you have",
};
const label = (key: string) => key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase());

/**
 * The civil or Family form field a remaining question fills, so the review panel can
 * offer a way to answer it there (#469 re-test: civil's remaining questions had only
 * an "I do not know yet" box). Small Claims questions come from the question bank.
 */
export function reviewQuestionField(courtPath: string, id: string): { kind: "text" | "longtext" | "choice" | "multi"; question: string; options: { value: string; label: string }[]; needsMore?: (value: string) => string | null } | null {
  const fields = courtPath === "family" ? FAMILY_FIELDS() : courtPath === "civil" ? CIVIL_FIELDS() : [];
  const field = fields.find((item) => item.key === id);
  // The field's own check (the served date's year) applies here as in the questions.
  return field ? { kind: field.kind, question: field.question, options: field.options ?? [], ...(field.needsMore ? { needsMore: field.needsMore } : {}) } : null;
}

/** A projection of existing answers, not another case model or question selector. */
export function reviewEntries(checkpoint: Checkpoint): ReviewEntry[] {
  // Answers based on an earlier version of the story are not shown as answers (storyBasis.ts).
  const { courtPath } = checkpoint;
  const sections = freshSections(checkpoint);
  const section = courtPath === "family" ? "family" : courtPath === "civil" ? "civil" : "small-claims";
  const fields = courtPath === "family" ? FAMILY_FIELDS() : courtPath === "civil" ? CIVIL_FIELDS() : [];
  const source = courtPath === "family" ? object(sections.family) : object(sections[section]?.input);
  const entries: ReviewEntry[] = [];
  const add = (area: string, key: string, value: unknown, nested?: string) => {
    if (UI.has(key) || (area !== STORY_SECTION && STORY_INPUT_KEYS.has(key)) || !(typeof value === "string" || typeof value === "number" || typeof value === "boolean" || (Array.isArray(value) && value.every(v => typeof v === "string")))) return;
    const definition = fields.find(field => field.key === key);
    const question = QUESTION_BANK.find(item => item.capturesField === key);
    entries.push({ section: area, field: key, nested, label: definition?.label ?? FIELD_LABELS[key] ?? question?.text ?? label(key), value: value as ReviewEntry["value"], essential: definition?.initial ?? !OPTIONAL.has(key), ...(definition?.options?.length ? { choices: definition.options } : {}) });
  };
  // The one copy of the story and location comes first, whatever the route (intakeStory.ts).
  entries.push({ section: STORY_SECTION, field: "text", label: "Your story", value: storyOf(sections), essential: true });
  if (courtPath === "small-claims" && sections.builder?.step === "guided") {
    const guided = object(sections.guided?.facts);
    for (const [key, value] of Object.entries(guided)) add("guided", key, value, "facts");
    // What an answer given in this panel stands for ("No" to "Has a Plaintiff's Claim been
    // filed?" is Claim Filed: no), where the guided questions did not record it (#470 re-test:
    // no "Claim Filed" line after "nothing filed" was answered).
    for (const [key, value] of Object.entries(panelAnswerFacts({ ...checkpoint, sections }))) if (!(key in guided)) add("guided", key, value, "facts");
  } else {
    for (const [key, value] of Object.entries(source)) add(section, key, value, courtPath === "family" ? undefined : "input");
  }
  // Family keeps the day of service inside the Timeline; it is shown as its own line
  // (re-test 2026-10-18: a confirmed "served last week" appeared nowhere in the review).
  if (courtPath === "family" && (object(sections.family).yourRole === "respondent" || servedDateOf(String(object(sections.family).timeline ?? "")))) {
    const served = servedDateOf(String(object(sections.family).timeline ?? ""));
    const said = served ? undefined : storyOf(sections).split(/(?<=[.!?])\s+|\n+/).find(sentence => /\bserved\b/i.test(sentence))?.trim();
    entries.push({ section: "family", field: "servedDate", label: "Day you were served", value: served, essential: true, ...(said ? { hint: `Your story says: “${said}”` } : {}) });
  }
  const location = locationOf(sections);
  if (location) entries.push({ section: STORY_SECTION, nested: "location", field: "city", label: "City", value: location.city, essential: true });
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
    if (!facts.has(key)) facts.set(key, JSON.stringify(entry.value));
  }
  facts.set("court", JSON.stringify(checkpoint.courtPath));
  for (const [question, answer] of Object.entries(initialAnswersOf(checkpoint))) facts.set(JSON.stringify(["initialAnswers", question]), JSON.stringify(answer));
  const answers = checkpoint.sections.home?.understoodAnswers;
  if (Array.isArray(answers) && answers.length) facts.set("home.understoodAnswers", JSON.stringify(answers));
  return facts;
}

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
  for (const [key, value] of materialFacts(previous)) if (after.get(key) !== value) return true;
  return false;
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
export function remainingEssentialQuestions(stored: Checkpoint, includeUnknown = false): { id: string; label: string }[] {
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
    const fields = checkpoint.courtPath === "family" ? FAMILY_FIELDS() : CIVIL_FIELDS();
    const skipped = new Set(Array.isArray(checkpoint.sections["form-chat"]?.skipped) ? checkpoint.sections["form-chat"].skipped as string[] : []);
    return pendingFields(fields, values, skipped).map(field => ({ id: field.key, label: field.question })).filter(field => includeUnknown || !unknowns.has(field.id));
  }
  const { facts, answered } = smallClaimsInitialAnswers(checkpoint);
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

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const SIDE_CUES: [RegExp, string][] = [
  [/\b(i was served|served me|sued me|suing me|claim against me|claimed against me|they are claiming|plaintiff's claim against)\b/i, "Responding to a claim (defendant)"],
  // The person telling a story about money they paid out is the one bringing the claim
  // ("a contractor took a $3,000 deposit and never did the work", re-test 2026-10-18).
  [/\b(owes? me|owed me|never paid|did not pay|didn't pay|won't pay|refused to (pay|refund|return)|kept my|i want to sue|i want (my|the) money|never came back|left the work|did not return|i paid|we paid|paid (him|her|them|a|an|the)|took (my|our|a|an|the)\b[^.]{0,30}\b(deposit|money|payment)|never (did|finished|completed|delivered|showed up|started))\b/i, "Bringing the claim (plaintiff)"],
];
const CATEGORY_CUES: [RegExp, string][] = [
  // A contractor's deposit is about the work, so this comes before "deposit".
  [/\b(contractor|renovat\w*|repair\w*|roof\w*|plumb\w*|electrician|landscap\w*|mechanic)\b/i, "Work or a service you paid for (e.g. a contractor)"],
  [/\bdeposit\b/i, "A deposit that wasn't returned"],
  [/\b(loan\w*|lent|borrow\w*)\b/i, "A loan or debt"],
  [/\b(bit|bite|bitten|fell|slipped|injur\w*)\b/i, "A personal injury (a fall, an animal bite, or similar)"],
  [/\b(defam\w*|lies about me|posted about me|rumou?rs?)\b/i, "Something said about you (defamation)"],
  [/\b(car|vehicle|truck|collision)\b/i, "A vehicle-related dispute"],
  [/\b(damaged|damage to)\b/i, "Property damage"],
  [/\b(invoice\w*|unpaid)\b/i, "Unpaid money owed to you"],
  [/\b(bought|purchase\w*|refund)\b/i, "A consumer purchase problem"],
  [/\b(contract|agreement)\b/i, "A contract or agreement dispute"],
];
const WRITTEN_DATE = new RegExp(String.raw`\b(${MONTHS.join("|")})\s+(\d{1,2}),?\s+(\d{4})\b`, "i");
const ISO_DATE = /\b(\d{4})-(\d{2})-(\d{2})\b/;
/** "August 2026": the question asks roughly when, so a month answers it. */
const MONTH_YEAR = new RegExp(String.raw`\b(${MONTHS.join("|")})\s+(\d{4})\b`, "i");

/**
 * Suggestions for the Small Claims initial questions, read from the story without
 * AI: the first full date written in it, and plain wording cues for side and kind
 * of dispute. Shown as suggestions the person confirms; never saved on their own
 * (re-test 2026-10-18: Confirm forced "I do not know yet" for what the story said).
 */
export function suggestInitialAnswers(checkpoint: Checkpoint): Record<string, string> {
  if (checkpoint.courtPath !== "small-claims") return {};
  const story = storyOf(checkpoint.sections);
  const out: Record<string, string> = {};
  const date = whenItHappened(story);
  if (date) out["sc-orient-when-happened"] = date;
  const side = SIDE_CUES.find(([cue]) => cue.test(story));
  if (side) out["sc-orient-role"] = side[1];
  // Someone billed for work they did and was not paid is owed money, whatever the work was
  // (re-test round 7: an unpaid renovation invoice was suggested as "a service you paid for").
  const owedForWork = /\b(invoice\w*|unpaid|never paid|did not pay|didn't pay|won't pay)\b/i.test(story) && !/\b(i|we) paid\b|\bdeposit\b/i.test(story);
  const category = owedForWork ? [/./, "Unpaid money owed to you"] as const : CATEGORY_CUES.find(([cue]) => cue.test(story));
  if (category) out["sc-orient-dispute-category"] = category[1];
  // The amount and the outcome, read as the form already reads them (storyAnswers.ts).
  const amount = amountFromStory(story);
  if (amount) out["sc-amount-claimed"] = amount.value;
  const goal = goalFromStory(story);
  if (goal) out["sc-remedy-sought"] = goal.value;
  return out;
}

/** "payment was due July 10", "by July 10": a deadline, not when it happened. */
const DEADLINE_BEFORE = /\b(?:due|deadline|payable|by|until|before|no later than|expires?|expiring)\s*(?:on\s*)?$/i;
const MONTH_DAY = new RegExp(String.raw`\b(${MONTHS.join("|")})\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b`, "gi");

/**
 * When it happened, from the story: the first date that is not written as a
 * deadline (re-test round 7: "work finished June 10, payment due July 10" was
 * read as July 10). A date with no year takes the year another date in the
 * story gives; a month and year alone ("August 2026") is used when no day is.
 */
function whenItHappened(story: string): string | null {
  const iso = ISO_DATE.exec(story);
  const candidates = [...story.matchAll(MONTH_DAY)].map(match => ({ match, deadline: DEADLINE_BEFORE.test(story.slice(Math.max(0, (match.index ?? 0) - 30), match.index)) }));
  const yearInStory = candidates.find(item => item.match[3])?.match[3] ?? MONTH_YEAR.exec(story)?.[2];
  const chosen = candidates.find(item => !item.deadline) ?? null;
  if (chosen) {
    const [, monthName, day, year] = chosen.match;
    const month = String(MONTHS.indexOf(monthName.toLowerCase()) + 1).padStart(2, "0");
    const knownYear = year ?? yearInStory;
    return knownYear ? `${knownYear}-${month}-${day.padStart(2, "0")}` : `${monthName[0].toUpperCase()}${monthName.slice(1).toLowerCase()} ${day}`;
  }
  if (iso && !DEADLINE_BEFORE.test(story.slice(Math.max(0, iso.index - 30), iso.index))) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const month = MONTH_YEAR.exec(story);
  if (month) return `${month[1][0].toUpperCase()}${month[1].slice(1).toLowerCase()} ${month[2]}`;
  return null;
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

/**
 * A material change cancels confirmation. `fromReview`: the change was made in the
 * review panel itself, so a confirmed intake returns to reviewing (the person is
 * already looking at it) rather than to collecting (re-test 2026-10-18).
 */
export function reconcileReview(workflow: ObjectValue, previous: Checkpoint, next: Checkpoint, fromReview = false): ObjectValue {
  const phase = reviewPhase(workflow, previous);
  const reviewing = phase === "reviewing" || (fromReview && phase === "user-confirmed");
  return { ...invalidateReview(workflow), ...(reviewing ? { intakeReview: { version: 1, reviewedRevision: inputRevision(next) } } : {}) };
}
