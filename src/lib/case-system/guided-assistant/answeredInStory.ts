/**
 * A CHAT QUESTION THE PERSON'S OWN STORY ALREADY ANSWERS IS NOT ASKED (Charter re-test 2026-10-26).
 *
 * The chat asked "Which public actor is involved?" after a story naming the TEST Capital Region
 * Police Service and both officers' badge numbers. Its only "already asked" check compared the chat's
 * own messages. This is the one list of the chat's questions a story can answer, each with what
 * answers it; the question is dropped when the story (or the conversation) has it. Dates are read
 * by the one date reader (dates.ts).
 *
 * And a question the person has answered anywhere else (the questions, the review, the step page)
 * is not asked again: each question below names the case-file fact it asks for, and the chat is
 * given the facts the case file holds (Charter re-test 27 Oct: the chat asked "what outcome are
 * you seeking?" after the person had said what they want, and "What exactly did they do or fail
 * to do?" after a story saying exactly that).
 *
 * Pure. States no law.
 */
import { dateMentionsIn } from "../dates";
import { caseFileOf, SLOT_FACTS, type SlotFact } from "../caseFile/caseFile";
import { readCheckpoint } from "../intakeCheckpoint";

const ANSWERED_BY: [RegExp, (known: string) => boolean][] = [
  // Which public body or official: the story names one.
  [/\bwhich (?:public|government)? ?(?:actor|authority|body|agency|official|institution)\b|\bwho is the (?:public|government) (?:actor|authority|body)\b|\bpublic actor\b/i,
    (known) => /\b(?:police(?: service| force| department| board)?|officers?|constables?|city of|municipality|ministry|government|crown|province of|public (?:body|authority)|board|agency|school board|hospital)\b/i.test(known)],
  // Who the other party is: the story names a person or body being sued.
  [/\bwho (?:is|are) the (?:other party|other side|defendants?|respondents?)\b|\bwho (?:are you|do you want to) su(?:e|ing)\b/i,
    (known) => /\b(?:sue|suing|sued|claim against)\s+(?:the|my|a|an|[A-Z])/.test(known)],
  // When it happened: the story gives a date.
  [/\bwhen did (?:this|it|the (?:incident|event|stop|arrest)) happen\b|\bwhat (?:date|day) did (?:this|it) happen\b/i,
    (known) => dateMentionsIn(known).length > 0],
];

/** The case-file fact each chat question asks for. */
const ASKS_FOR: [RegExp, SlotFact][] = [
  [/\bwhat (?:outcome|result|remedy)\b|\boutcome (?:are|do) you (?:seeking|want)\b|\bwhat (?:do|would) you (?:want|like) (?:to happen|the court to)\b|\bwhat are you (?:asking|seeking)\b/i, "wants"],
  [/\bhow much\b|\bwhat (?:is the )?amount\b/i, "amount"],
  [/\bwhen were you served\b|\bwhat (?:date|day) were you served\b/i, "servedDate"],
  [/\b(?:have you|has anyone|has anything been) (?:already )?(?:started|filed)\b|\bstarted a court case\b/i, "filed"],
  [/\bwho (?:is|are) the (?:other party|other side|defendants?|respondents?)\b|\bwho (?:are you|do you want to) su(?:e|ing)\b/i, "otherParty"],
  [/\bwhen did (?:this|it|the [a-z]+) happen\b/i, "whenHappened"],
];

/** What happened: the story itself says it, once it is more than a line. */
const ASKS_WHAT_HAPPENED = /\bwhat exactly did (?:they|he|she|it|the [a-z ]+?) do\b|\bwhat exactly happened\b|\bwhat did (?:they|he|she) do or fail to do\b/i;

/** The facts the saved case file holds an answer for (caseFile.ts), from the chat's case memory. */
export function answeredFactsOf(caseMemory: unknown): ReadonlySet<SlotFact> {
  const master = caseMemory && typeof caseMemory === "object" ? (caseMemory as { masterResult?: unknown }).masterResult : null;
  const stored = master && typeof master === "object" ? (master as { intakeCheckpoint?: { courtPath?: unknown } }).intakeCheckpoint : null;
  const court = stored?.courtPath;
  if (court !== "small-claims" && court !== "civil" && court !== "family") return new Set();
  const file = caseFileOf(readCheckpoint(stored, court), master);
  return new Set(SLOT_FACTS.filter((fact) => file[fact].state === "answered"));
}

/** Whether the story, the conversation or the case file already answers this question. */
export function answeredInStory(question: string, known: string, facts: ReadonlySet<SlotFact> = new Set()): boolean {
  if (ASKS_FOR.some(([asks, fact]) => asks.test(question) && facts.has(fact))) return true;
  if (ASKS_WHAT_HAPPENED.test(question) && known.trim().length >= 80) return true;
  if (!known.trim()) return false;
  return ANSWERED_BY.some(([asks, answered]) => asks.test(question) && answered(known));
}
