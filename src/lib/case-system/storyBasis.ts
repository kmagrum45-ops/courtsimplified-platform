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
import { sentences } from "./sentences";

type Sections = Checkpoint["sections"];
export const BASIS_SECTION = "storyBasis";
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Navigation and display state that holds no answer, and facts about the person rather than the story (their own name and contact details, the court file number). */
const NOT_ANSWERS = new Set(["mode", "editingStory", "storyDraft", "reviewStoryDraft", "personSet", "personDocuments", "step", "startedModes", "intakeCity", "familyQuestionsDone", "uploadedEvidenceFiles",
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
  // Replies to the Home page card's questions about the story (CaseUnderstandingCard; found by the Part 3 registry check).
  "home-card": { replies: {} },
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

/**
 * A saved position re-analysed for a story that differs from the one its last
 * analysis read: the dates and service details recorded for the old story no
 * longer count any deadline (Part 3, stale-story audit item 2). Same story, or
 * either story unknown (an older case): unchanged.
 */
export function positionForStory<T extends { dateAnswers?: unknown; service?: unknown }>(position: T, analysedStory: unknown, story: unknown): T {
  if (typeof analysedStory !== "string" || typeof story !== "string" || !analysedStory.trim() || !story.trim()) return position;
  if (storyVersion(analysedStory) === storyVersion(story)) return position;
  return { ...position, dateAnswers: {}, service: {} };
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

/**
 * The basis after the person answers again with the same value: that answer (or,
 * without `only`, every answer in the field) is now based on the current story.
 * An unchanged value is otherwise not re-tagged, so re-choosing the same side after
 * the story changed left "Answered for an earlier version of your story" in place
 * (#470 re-test).
 */
export function reaffirmAnswers(sections: Sections, section: string, key: string, value: unknown, only?: string): Record<string, string> {
  const basis = { ...(object(sections[BASIS_SECTION]) as Record<string, string>) };
  const version = storyVersion(storyOf(sections));
  for (const [answer, item] of answersIn(section, key, value)) {
    if (only !== undefined && answer !== `${section}.${key}` && !answer.endsWith(`.${only}`)) continue;
    if (!empty(item)) basis[answer] = version;
  }
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

/** The story's sentences, each as compared (case, spacing and punctuation ignored). */
const sentencesOf = (text: string) => sentences(text).map(comparable).filter(Boolean);
const comparable = (text: string) => text.toLowerCase().replace(/[^a-z0-9$]+/g, " ").trim();

/**
 * An edit to some of the story, not a new one (#477 re-test: editing one sentence lost every
 * follow-up answer): the sentences removed or changed, when at least half of the old story's
 * sentences are still there; null for a new story (then every answer is set aside, as before).
 */
export function editedSentences(before: string, after: string): string[] | null {
  const old = sentencesOf(before);
  const kept = new Set(sentencesOf(after));
  if (!old.length) return null;
  const removed = old.filter((sentence) => !kept.has(sentence));
  return removed.length * 2 > old.length ? null : removed;
}

/** Whether an answer's own words come from one of these sentences (an amount by its digits). */
function fromSentences(value: unknown, sentences: string[]): boolean {
  const words = (Array.isArray(value) ? value : [value]).filter((item): item is string | number => typeof item === "string" || typeof item === "number").map((item) => comparable(String(item)));
  return words.some((word) => {
    if (word.length < 3) return false;
    const digits = word.replace(/[^0-9]/g, "");
    return sentences.some((sentence) => sentence.includes(word) || (digits.length >= 2 && sentence.replace(/[^0-9 ]/g, " ").split(/\s+/).includes(digits)));
  });
}

/**
 * When the story itself changes: the answers given about the old one on the Home page (and its
 * card), and an unsent copy of it in the question box, go. Given the story before the change,
 * an edit to some of it keeps every answer whose words do not come from a sentence removed or
 * changed: each stays based on the story as it is now, so nothing is asked again for it.
 */
export function onStoryChange(sections: Sections, before?: Sections): Sections {
  const removed = before ? editedSentences(storyOf(before), storyOf(sections)) : null;
  if (removed) {
    const version = storyVersion(storyOf(sections));
    const previous = storyVersion(storyOf(before!));
    const basis = { ...(object(sections[BASIS_SECTION]) as Record<string, string>) };
    for (const [answer, based] of Object.entries(basis)) if (based === previous && !fromSentences(valueAt(sections, answer), removed)) basis[answer] = version;
    const keep = (items: unknown) => (Array.isArray(items) ? items : []).filter((item) => !fromSentences(object(item).answer, removed));
    const drafts = object(sections["form-chat"]?.drafts);
    return {
      ...sections,
      [BASIS_SECTION]: basis,
      home: { ...sections.home, understoodAnswers: keep(sections.home?.understoodAnswers), draftAnswers: keep(sections.home?.draftAnswers) },
      "home-card": { ...sections["home-card"], ...CONVERSATION["home-card"] },
      ...("facts" in drafts ? { "form-chat": { ...sections["form-chat"], drafts: Object.fromEntries(Object.entries(drafts).filter(([key]) => key !== "facts")) } } : {}),
    };
  }
  const next: Sections = { ...sections, home: { ...sections.home, ...CONVERSATION.home }, "home-card": { ...sections["home-card"], ...CONVERSATION["home-card"] } };
  const drafts = object(sections["form-chat"]?.drafts);
  if ("facts" in drafts) next["form-chat"] = { ...sections["form-chat"], drafts: Object.fromEntries(Object.entries(drafts).filter(([key]) => key !== "facts")) };
  return next;
}

export const STORY_TEXT_FIELD = `${STORY_SECTION}:text`;

/** No next step while any answer was based on another version of the story, in any area. */
export function storyAnswersOutdated(checkpoint: Checkpoint): boolean {
  if (staleAnswerKeys(checkpoint).length > 0) return true;
  // The Small Claims guided reading of an earlier story blocks while any of its answers is
  // still from that story. Once each one is given again or set aside in the review (each is
  // tagged, so each can be), it no longer does, as in Family (#471 re-test: Small Claims stayed
  // blocked after every answer was given again). Answers saved before they were tagged cannot
  // be told apart, so they still block until the questions are started again.
  if (!guidedReadingOutdated(checkpoint)) return false;
  const basis = object(checkpoint.sections[BASIS_SECTION]);
  return !Object.keys(basis).some((answer) => answer.startsWith("guided."));
}
