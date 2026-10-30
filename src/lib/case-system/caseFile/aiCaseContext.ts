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
 * Only what a call needs is sent (classifyClaimTypeBody picks it). The model client forces
 * `store: false` on every request (openaiClient.ts) and the AI call log keeps a hash and length of
 * the input, never the story (audit/aiCallLog.ts). The AI only proposes: its answer is a suggestion
 * the person confirms (CLAUDE.md s. 4).
 */
import { claimKindOf, storyOfFile, type CaseFile, type ClaimKindSource } from "./caseFile";
import { CLAIM_TYPES } from "../intake/claimTypes";

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
