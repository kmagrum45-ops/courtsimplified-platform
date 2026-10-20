/**
 * WHICH VERSION OF THE STORY EACH STORY-DERIVED ANSWER WAS BASED ON.
 *
 * The PR #463 re-tests found the same fault five times in different places: each
 * flow kept its own copy of answers read from (or given about) the story, so a
 * fix to one flow left the others showing the old story's facts. This is the one
 * record for all three areas.
 *
 * Every answer the intake stores is tagged, when it is stored, with a version of
 * the story as it was then (`sections.storyBasis`: answer key -> version). When
 * the story changes, every answer tagged with another version is STALE: shown
 * nowhere as a current answer, never pre-filled, never merged into a new reading,
 * and no next step is built while any remains. "Start the questions again"
 * (discardStaleAnswers) empties them, in every area at once.
 *
 * Answer keys: "family.<field>", "civil.input.<field>", "small-claims.input.<field>",
 * "guided.facts.<field>", "builder.initialAnswers.<question>", and whole fields
 * such as "guided.answeredIds" or "sourced.answers". The story and location
 * themselves are not answers (intakeStory.ts).
 */
import type { Checkpoint } from "./intakeCheckpoint";
import { guidedReadingOutdated, STORY_INPUT_KEYS, STORY_SECTION, storyOf } from "./intakeStory";

type Sections = Checkpoint["sections"];
export const BASIS_SECTION = "storyBasis";
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Navigation and display state that holds no answer, and facts about the person rather than the story (their own name and contact details, the court file number). */
const NOT_ANSWERS = new Set(["mode", "editingStory", "personSet", "personDocuments", "step", "startedModes", "intakeCity", "familyQuestionsDone", "uploadedEvidenceFiles",
  "yourName", "yourAddress", "yourPhone", "yourEmail", "courtFileNumber", "courtLocation"]);
/** Fields holding one answer per key: each key is tagged on its own. */
const KEYED = new Set(["civil.input", "small-claims.input", "guided.facts", "builder.initialAnswers"]);
/** Whole fields that are answers. Everything in "family" is, except NOT_ANSWERS. */
// "I do not know yet" (builder.initialUnknowns) is not read from the story's words, so it is not here.
const WHOLE = new Set(["guided.answeredIds", "guided.matchedClaimType", "guided.earlierAnswers", "builder.triageState", "sourced.answers"]);
/** Question-and-answer state that is reset with the questions (not tagged answer by answer). */
const CONVERSATION: Record<string, Record<string, unknown>> = {
  "form-chat": { heard: [], drafts: {}, skipped: [], notFromStory: [], edited: [], knownAtStart: [], changing: null, needsMore: null },
  home: { understoodAnswers: [], draftAnswers: [] },
  // The Small Claims guided conversation, read from the old story: started again from the beginning, so
  // one "Start the questions again" clears the block from any route (re-test round 7: from the form it
  // cleared the answers but not this reading, and only a second click on the guided page did).
  guided: { readFrom: "", started: false, messages: [], facts: {}, answeredIds: [], currentQuestion: null, halted: false, intakeComplete: false,
    evidenceGuidance: null, claimGuidance: null, matchedClaimType: null, pendingSuggestion: null, suggestionStoryText: "", rejectedSuggestionIds: [],
    noClaimTypeMatch: false, depthQuestions: [], depthIndex: 0, depthActive: false, completionPayload: null, heldPayload: null, proposalDrafts: null,
    proposalMode: "intake", reproposed: false, earlierAnswers: [], declinedIds: [], inputText: "" },
};

/** A version of the story: the same words in the same order (case and spacing ignored) are the same version. */
export function storyVersion(text: string): string {
  const words = text.toLowerCase().replace(/\s+/g, " ").trim();
  let hash = 0x811c9dc5;
  for (let index = 0; index < words.length; index++) hash = Math.imul(hash ^ words.charCodeAt(index), 0x01000193) >>> 0;
  return `${words.length}:${hash.toString(16)}`;
}

const empty = (value: unknown) => value === undefined || value === null || value === "" || value === "not-sure" || value === false ||
  (Array.isArray(value) && value.length === 0) || (typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length === 0);

/** The answer keys a write to (section, key) stores, each with its value. */
function answersIn(section: string, key: string, value: unknown): [string, unknown][] {
  if (NOT_ANSWERS.has(key)) return [];
  const field = `${section}.${key}`;
  if (KEYED.has(field)) return Object.entries(object(value)).filter(([inner]) => !STORY_INPUT_KEYS.has(inner) && !NOT_ANSWERS.has(inner)).map(([inner, item]) => [`${field}.${inner}`, item]);
  if (section === "family" || WHOLE.has(field)) return [[field, value]];
  return [];
}

/**
 * The basis after a write: every answer the write changes to a non-empty value is
 * tagged with the current story's version. An answer emptied loses its tag.
 */
export function tagAnswers(sections: Sections, section: string, key: string, before: unknown, after: unknown): Record<string, string> {
  const basis = { ...(object(sections[BASIS_SECTION]) as Record<string, string>) };
  const previous = new Map(answersIn(section, key, before).map(([answer, item]) => [answer, JSON.stringify(item)]));
  const version = storyVersion(storyOf(sections));
  for (const [answer, item] of answersIn(section, key, after)) {
    if (empty(item)) delete basis[answer];
    else if (previous.get(answer) !== JSON.stringify(item)) basis[answer] = version;
  }
  for (const answer of previous.keys()) if (!answersIn(section, key, after).some(([next]) => next === answer)) delete basis[answer];
  return basis;
}

/** Answers that still hold a value but were based on another version of the story. */
export function staleAnswerKeys(checkpoint: Checkpoint): string[] {
  const version = storyVersion(storyOf(checkpoint.sections));
  // An answer stored before there was any story was not based on an earlier version of it.
  const noStory = storyVersion("");
  return Object.entries(object(checkpoint.sections[BASIS_SECTION]))
    .filter(([answer, based]) => based !== version && based !== noStory && !empty(valueAt(checkpoint.sections, answer)))
    .map(([answer]) => answer);
}

function valueAt(sections: Sections, answer: string): unknown {
  const [section, field, inner] = answer.split(".");
  const value = sections[section]?.[field];
  return inner === undefined ? value : object(value)[inner];
}

/** The empty value of an answer's own type (so every screen showing it updates, not just forgets it). */
function emptied(value: unknown): unknown {
  if (Array.isArray(value)) return [];
  if (typeof value === "string") return "";
  if (typeof value === "boolean") return false;
  if (value && typeof value === "object") return {};
  return null;
}

/** The sections as screens should read them: stale answers emptied, nothing else changed. */
export function freshSections(checkpoint: Checkpoint): Sections {
  const stale = staleAnswerKeys(checkpoint);
  if (!stale.length) return checkpoint.sections;
  const sections: Sections = { ...checkpoint.sections };
  for (const answer of stale) {
    const [section, field, inner] = answer.split(".");
    sections[section] = { ...sections[section] };
    if (inner === undefined) sections[section][field] = emptied(sections[section][field]);
    else sections[section][field] = { ...object(sections[section][field]), [inner]: emptied(object(sections[section][field])[inner]) };
  }
  return sections;
}

/** The fields (section, key) discardStale changes, so the screens holding them can be told. */
export function discardedFields(checkpoint: Checkpoint): [string, string][] {
  const fields = new Set(staleAnswerKeys(checkpoint).map(answer => answer.split(".").slice(0, 2).join(".")));
  for (const [section, keys] of Object.entries(CONVERSATION)) for (const key of Object.keys(keys)) fields.add(`${section}.${key}`);
  return [...fields].map(field => field.split(".") as [string, string]);
}

/** "Start the questions again": stale answers emptied and untagged, the question-and-answer state reset. */
export function discardStale(checkpoint: Checkpoint): Checkpoint {
  const stale = staleAnswerKeys(checkpoint);
  const sections = freshSections(checkpoint);
  const basis = { ...(object(sections[BASIS_SECTION]) as Record<string, string>) };
  for (const answer of stale) delete basis[answer];
  sections[BASIS_SECTION] = basis;
  for (const [section, keys] of Object.entries(CONVERSATION)) {
    if (section === "guided" && !sections.guided) continue; // only where that conversation exists
    sections[section] = { ...sections[section], ...keys };
  }
  return { ...checkpoint, sections };
}

/** When the story itself changes: the answers given about the old one on the Home page, and an unsent copy of it in the question box, go. */
export function onStoryChange(sections: Sections): Sections {
  const next: Sections = { ...sections, home: { ...sections.home, ...CONVERSATION.home } };
  const drafts = object(sections["form-chat"]?.drafts);
  if ("facts" in drafts) next["form-chat"] = { ...sections["form-chat"], drafts: Object.fromEntries(Object.entries(drafts).filter(([key]) => key !== "facts")) };
  return next;
}

export const STORY_TEXT_FIELD = `${STORY_SECTION}:text`;

/** No next step while any answer was based on another version of the story, in any area. */
export function storyAnswersOutdated(checkpoint: Checkpoint): boolean {
  return staleAnswerKeys(checkpoint).length > 0 || guidedReadingOutdated(checkpoint);
}
