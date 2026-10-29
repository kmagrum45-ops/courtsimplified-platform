/**
 * A CHAT QUESTION THE PERSON'S OWN STORY ALREADY ANSWERS IS NOT ASKED (Charter re-test 2026-10-26).
 *
 * The chat asked "Which public actor is involved?" after a story naming the TEST Capital Region
 * Police Service and both officers' badge numbers. Its only "already asked" check compared the chat's
 * own messages. This is the one list of the chat's questions a story can answer, each with what
 * answers it; the question is dropped when the story (or the conversation) has it. Dates are read
 * by the one date reader (dates.ts).
 *
 * And a question whose fact the saved case file holds is not asked: the chat asks by FACT, through
 * the one gate (caseFile.ts chatMayAsk), never by its own wording. Held means given anywhere (the
 * questions, the review, the step page) or answered "I don't know yet": the chat is never where an
 * unsure fact is offered once more (never ask twice, row 1, 29 Oct: "What are you trying to get or
 * fix through the legal process?" after the review recorded "I don't know yet" for what they want).
 * Charter re-test 27 Oct: "what outcome are you seeking?" after the person had said what they want,
 * and "What exactly did they do or fail to do?" after a story saying exactly that.
 *
 * Pure. States no law.
 */
import { dateMentionsIn } from "../dates";
import { caseFileOf, chatQuestionToAsk, type CaseFile } from "../caseFile/caseFile";
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


/** What happened: the story itself says it, once it is more than a line. */
const ASKS_WHAT_HAPPENED = /\bwhat exactly did (?:they|he|she|it|the [a-z ]+?) do\b|\bwhat exactly happened\b|\bwhat did (?:they|he|she) do or fail to do\b/i;

/** The saved case file the chat reads (caseFile.ts), from its case memory (the saved case's master result); null when there is none. */
export function caseFileOfChat(caseMemory: unknown): CaseFile | null {
  if (!caseMemory || typeof caseMemory !== "object") return null;
  const master = (caseMemory as { masterResult?: unknown }).masterResult;
  const stored = master && typeof master === "object" ? (master as { intakeCheckpoint?: { courtPath?: unknown } }).intakeCheckpoint : null;
  // The checkpoint's own court, else the saved case's (the route passes it as `path`).
  const court = stored?.courtPath ?? (caseMemory as { path?: unknown }).path;
  if (!master || (court !== "small-claims" && court !== "civil" && court !== "family")) return null;
  return caseFileOf(stored ? readCheckpoint(stored, court) : null, master);
}

/**
 * Whether the story, the conversation or the case file already answers this question as it stands
 * (a compound question whose fact is held is not asked as it stands: its open part may be, through
 * caseFile.ts chatQuestionToAsk).
 */
export function answeredInStory(question: string, known: string, file: CaseFile | null = null): boolean {
  if (chatQuestionToAsk(file, question) !== question) return true;
  if (ASKS_WHAT_HAPPENED.test(question) && known.trim().length >= 80) return true;
  if (!known.trim()) return false;
  return ANSWERED_BY.some(([asks, answered]) => asks.test(question) && answered(known));
}
