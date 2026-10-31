/**
 * THE CASE CONTEXT AN AI CALL IS GIVEN, FROM THE CASE FILE (site owner's rule 8, 30 Oct): every AI
 * call gets its case context from the case file through one shared builder, never from a screen's
 * state. Started with the one fact moved into the case file so far, the kind of claim; each fact
 * converted next adds its part here, and each AI call converted next reads it here.
 *
 * What it holds, and what it never does:
 *   - the story, as the case file holds it (storyOfFile);
 *   - the kind of claim the person gave or confirmed (claimKindOf: held, with its source);
 *   - an open suggestion: the AI's suggestion waiting for an answer, else the case file's proposal
 *     from the story; offered only while no kind is held, never as known;
 *   - the kinds the person turned down ("Not quite"): sent only as kinds to leave out, never as known,
 *     and never offered again;
 *   - the side, as plaintiff or defendant, when the case file holds it.
 * Only what a call needs is sent (classifyClaimTypeBody picks it for the claim-type call;
 * researchCaseContext / researchContextLines for the analysis's AI research, in all three courts). The model client forces
 * `store: false` on every request (openaiClient.ts) and the AI call log keeps a hash and length of
 * the input, never the story (audit/aiCallLog.ts). The AI only proposes: its answer is a suggestion
 * the person confirms (CLAUDE.md s. 4).
 */
import { claimKindOf, storyOfFile, type CaseFile, type ClaimKindSource } from "./caseFile";
import { CLAIM_TYPES } from "../intake/claimTypes";
import { inWords } from "../copy/rawKeys";

export type ClaimKindAiContext = {
  story: string;
  side: "plaintiff" | "defendant" | null;
  /** The kind the case file holds as the person's (their answer, a ticked suggestion, the issues they picked). */
  confirmed: { claimTypeId: string | null; words: string; source: ClaimKindSource } | null;
  /** A kind made by the site, waiting for the person's answer: never sent as known. */
  openSuggestion: { claimTypeId: string; words: string; quote: string | null } | null;
  /** Kinds the person turned down: to leave out, never known, never offered again. */
  removed: string[];
};

const nameOf = (id: string) => CLAIM_TYPES.find((claimType) => claimType.id === id)?.name ?? null;

function sideOfFile(file: CaseFile): ClaimKindAiContext["side"] {
  if (file.side.state !== "answered" || typeof file.side.value !== "string") return null;
  if (/respond|defend/i.test(file.side.value)) return "defendant";
  if (/bring|plaintiff/i.test(file.side.value)) return "plaintiff";
  return null;
}

/** The kind-of-claim context of a case, from its case file only. */
export function claimKindAiContext(file: CaseFile): ClaimKindAiContext {
  const held = claimKindOf(file);
  const removed = [...new Set(file.claimKindRemoved ?? [])];
  const confirmed = held.state === "answered" && held.words && held.source ? { claimTypeId: held.claimTypeId, words: held.words, source: held.source } : null;
  let openSuggestion: ClaimKindAiContext["openSuggestion"] = null;
  if (!confirmed) {
    const pending = file.claimKindPending && !removed.includes(file.claimKindPending.claimTypeId) ? file.claimKindPending : null;
    const pendingName = pending ? nameOf(pending.claimTypeId) : null;
    if (pending && pendingName) openSuggestion = { claimTypeId: pending.claimTypeId, words: pendingName, quote: pending.quote };
    else if (held.proposal && !removed.includes(held.proposal.claimTypeId)) openSuggestion = { claimTypeId: held.proposal.claimTypeId, words: held.proposal.words, quote: held.proposal.quote };
  }
  return { story: storyOfFile(file), side: sideOfFile(file), confirmed, openSuggestion, removed };
}

/**
 * The body of /api/intake/classify-claim-type: the person's answer ("That's right" / "Not quite") to
 * the suggestion they were shown, with only what the route needs from the case file (the story, the
 * side, the kinds turned down). Null when the suggestion answered is one they already turned down,
 * or the case file holds no story to read.
 */
export function classifyClaimTypeBody(
  context: ClaimKindAiContext,
  action: "confirm" | "reject",
  answering: string,
): { storyText: string; facts: { role?: "plaintiff" | "defendant" }; action: "confirm" | "reject"; claimTypeId: string; priorRejectedIds: string[] } | null {
  if (!context.story.trim() || context.removed.includes(answering)) return null;
  return {
    storyText: context.story,
    facts: context.side ? { role: context.side } : {},
    action,
    claimTypeId: answering,
    // The route caps this list at five: the latest five turned down.
    priorRejectedIds: context.removed.slice(-5),
  };
}

/**
 * WHAT THE ANALYSIS'S AI RESEARCH IS TOLD BEYOND THE STORY (site owner, 31 Oct, Chrome check item 4).
 * A Small Claims case confirmed as "Property damage" was researched from the story alone ("their
 * truck was parked outside") and showed the Highway Traffic Act: "Property damage" is a dispute
 * category with no catalogue id, so nothing about the kind reached the analysis. Now the research
 * (retrieval/storyRetrieval.ts queryPrompt, used by researchStory and plain retrieval) is told:
 *   - kind: the kind the case file holds as the person's, in its WORDS (a Small Claims dispute
 *     category, a catalogue kind's name, the civil or Family issues picked, each by its label), with
 *     where it came from;
 *   - suggestedKind: only while no kind is held, a kind the site suggested, sent marked as a
 *     suggestion the person has not confirmed;
 *   - never a kind the person turned down (not even as one to leave out: the research needs none).
 * Only words: no story (the analysis sends its own account), no names. Built in the browser from the
 * case file, sent with the analysis request, checked by the route (parseResearchCaseContext).
 */
export type ResearchCaseContext = {
  kind?: { words: string; source: ClaimKindSource };
  suggestedKind?: { words: string };
};

const MAX_CONTEXT_WORDS = 300;
const SOURCES: readonly ClaimKindSource[] = ["person-said", "confirmed", "route-implied"];

/** The research's case context, from the case file only. Empty when the file holds no kind. */
export function researchCaseContext(file: CaseFile): ResearchCaseContext {
  const held = claimKindOf(file, inWords);
  const context = claimKindAiContext(file);
  // A list answer (civil, Family issues) in its labels; a one-line answer given in the review as a code too.
  const words = held.state === "answered" && held.source && held.words?.trim() ? inWords(held.words.trim().split(/,\s*/)).slice(0, MAX_CONTEXT_WORDS) : "";
  if (words && held.source && !(held.claimTypeId && context.removed.includes(held.claimTypeId))) return { kind: { words, source: held.source } };
  if (context.openSuggestion && !context.removed.includes(context.openSuggestion.claimTypeId)) return { suggestedKind: { words: context.openSuggestion.words.slice(0, MAX_CONTEXT_WORDS) } };
  return {};
}

/**
 * The analyze routes' check of a case context sent with an analysis request: absent is fine (null);
 * anything other than the shape above, with short strings, is refused (false). Never free fields.
 */
export function parseResearchCaseContext(value: unknown): ResearchCaseContext | null | false {
  if (value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== "kind" && key !== "suggestedKind")) return false;
  const text = (item: unknown) => typeof item === "string" && item.trim().length > 0 && item.length <= MAX_CONTEXT_WORDS;
  const out: ResearchCaseContext = {};
  if (record.kind !== undefined) {
    const kind = record.kind as Record<string, unknown> | null;
    if (!kind || typeof kind !== "object" || Object.keys(kind).some((key) => key !== "words" && key !== "source")) return false;
    if (!text(kind.words) || !SOURCES.includes(kind.source as ClaimKindSource)) return false;
    out.kind = { words: kind.words as string, source: kind.source as ClaimKindSource };
  }
  if (record.suggestedKind !== undefined) {
    const suggested = record.suggestedKind as Record<string, unknown> | null;
    if (!suggested || typeof suggested !== "object" || Object.keys(suggested).some((key) => key !== "words") || !text(suggested.words)) return false;
    // A suggestion is offered only while no kind is held.
    if (!out.kind) out.suggestedKind = { words: suggested.words as string };
  }
  return out;
}

/** The lines the research prompt adds for the case context: the kind as the person's, a suggestion as one. */
export function researchContextLines(context: ResearchCaseContext | undefined): string[] {
  if (!context) return [];
  const how: Record<ClaimKindSource, string> = { "person-said": "as they gave it", confirmed: "as they confirmed it", "route-implied": "as they picked it" };
  if (context.kind) return [`The kind of case, ${how[context.kind.source]}: ${context.kind.words}.`];
  if (context.suggestedKind) return [`A kind of case the site suggested from their account (a suggestion they have not confirmed, not a fact): ${context.suggestedKind.words}.`];
  return [];
}
