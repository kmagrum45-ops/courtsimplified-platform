/**
 * Event candidates: what the narrative parser suggested, and what the user has
 * said about each.
 *
 * COSTS NOTHING. Pure functions plus a hash. No API call.
 *
 * THE THREE STATES, AND WHY ONLY ONE IS STORED.
 *
 *   confirmed  -> a case_events row exists for it
 *   dismissed  -> a live case_event_candidate_dismissals row exists
 *   unanswered -> neither
 *
 * "Unanswered" is the absence of both, deliberately. There is nowhere to record
 * that a user did not answer, so nothing can convert silence into "no". A
 * candidate the user skipped stays answerable indefinitely, and that is a
 * property of the schema rather than of anyone remembering to be careful.
 *
 * WHY CANDIDATES ARE NOT EVENTS. `knownEvents` currently comes from a parse of
 * the intake narrative. That is an inference, and this codebase has removed
 * several things for exactly that reason. The case_events `source` CHECK has no
 * 'system-inference' value, so a parse cannot become a row until a user
 * confirms it — and when they do, the sentence it came from is kept in
 * `narrative_basis` so they can see what was read into their story.
 *
 * WHERE CANDIDATES COME FROM. `master_result.timeline`, written by `mapEvent`
 * in masterCaseBridge from `normalizedIntake.events`. Each carries a title, a
 * description and `sourceText` — the sentence. It carries NO procedural type,
 * and should not: classifying a sentence into the O. Reg. 258/98 vocabulary is
 * the user's judgment, and a parser guess would be the inference the source
 * CHECK exists to keep out.
 */

import { createHash } from "node:crypto";

import { type CaseEventRow } from "./caseEventAdapter";
import { type CaseEventType } from "./caseEventTypes";

/** A dismissal row, as selected from case_event_candidate_dismissals. */
export type CandidateDismissalRow = {
  id: string;
  case_id: string;
  candidate_fingerprint: string;
  narrative_basis: string;
  suggested_event_type: string;
  dismissed_at: string;
  restored_at: string | null;
};

/** What the parser produced, before a user has said anything about it. */
export type EventCandidate = {
  /**
   * Unstable across parses — nowId() regenerates it every run. Use it within a
   * single response only; never store it or key a decision on it.
   */
  transientId: string;
  title: string;
  /** The sentence this was read out of. Shown to the user, and fingerprinted. */
  narrativeBasis: string;
  /**
   * Absent by design. The parser does not classify, and the user chooses the
   * type when they confirm. Present only where a future source (a recognised
   * document, say) can supply one honestly.
   */
  suggestedEventType?: CaseEventType;
};

export type CandidateState = "confirmed" | "dismissed" | "unanswered";

export type ResolvedCandidate = EventCandidate & {
  fingerprint: string;
  state: CandidateState;
  /** Set when confirmed: the event row that came from this candidate. */
  confirmedEventId?: string;
  /** Set when dismissed: so the surface can offer to restore it. */
  dismissalId?: string;
};

/**
 * Normalization applied before hashing.
 *
 * Deliberately conservative: lowercase, normalize quotes, collapse whitespace,
 * strip trailing punctuation. It does NOT stem, reorder, or drop words. An
 * aggressive normalizer would collapse genuinely different sentences onto one
 * fingerprint and suppress a candidate the user never rejected — the failure
 * that matters.
 *
 * The opposite failure, a near-miss re-offering something already dismissed, is
 * mildly annoying and visible. Fingerprinting is tuned to fail that way.
 */
export function normalizeForFingerprint(sentence: string): string {
  return sentence
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?\s]+$/g, "")
    .trim();
}

/**
 * Identity for a candidate, over THE SENTENCE ALONE.
 *
 * Three reasons it is the sentence, not the id and not the type:
 *
 * 1. Candidate ids are `timeline_<Date.now()>_<random>`, regenerated on every
 *    parse. An id-keyed dismissal would match nothing on the next run and the
 *    candidate would come back.
 *
 * 2. Candidates carry no procedural type — the parser does not assign one.
 *
 * 3. Even where a type exists, hashing it in would make the same rejected
 *    sentence reappear under a different suggested type. Dismissing means "this
 *    sentence is not an event I want recorded", which is a statement about the
 *    sentence and independent of any type.
 */
export function candidateFingerprint(narrativeBasis: string): string {
  return createHash("sha256").update(normalizeForFingerprint(narrativeBasis)).digest("hex");
}

/** Dismissals that have not been restored. */
export function liveDismissals(rows: CandidateDismissalRow[]): CandidateDismissalRow[] {
  return rows.filter((row) => row.restored_at === null);
}

/**
 * Resolve each candidate against what the user has already said.
 *
 * A candidate counts as confirmed when an event row carries the same narrative
 * basis. That is what `narrative_basis` is for, and why the case_events CHECK
 * requires it on narrative-confirmed rows — matching on the sentence rather
 * than on a stored candidate id, for the same reason as the fingerprint.
 */
export function resolveCandidates(
  candidates: EventCandidate[],
  events: CaseEventRow[],
  dismissals: CandidateDismissalRow[],
): ResolvedCandidate[] {
  const dismissedByFingerprint = new Map(
    liveDismissals(dismissals).map((row) => [row.candidate_fingerprint, row]),
  );

  const confirmedByFingerprint = new Map<string, CaseEventRow>();
  for (const event of events) {
    if (!event.narrative_basis) continue;
    confirmedByFingerprint.set(candidateFingerprint(event.narrative_basis), event);
  }

  return candidates.map((candidate) => {
    const fingerprint = candidateFingerprint(candidate.narrativeBasis);

    const confirmed = confirmedByFingerprint.get(fingerprint);
    if (confirmed) {
      return { ...candidate, fingerprint, state: "confirmed", confirmedEventId: confirmed.id };
    }

    const dismissed = dismissedByFingerprint.get(fingerprint);
    if (dismissed) {
      return { ...candidate, fingerprint, state: "dismissed", dismissalId: dismissed.id };
    }

    // Neither. Nothing is stored for this state, and nothing should be.
    return { ...candidate, fingerprint, state: "unanswered" };
  });
}

/**
 * What the review surface prompts on: candidates still awaiting an answer.
 *
 * Confirmed and dismissed candidates are excluded from the prompt but stay in
 * the resolved list, so the surface can show what the user already decided and
 * offer to restore a dismissal.
 */
export function candidatesAwaitingAnswer(resolved: ResolvedCandidate[]): ResolvedCandidate[] {
  return resolved.filter((candidate) => candidate.state === "unanswered");
}

/**
 * Read candidates out of a persisted `master_result.timeline`.
 *
 * Tolerant by design: a case analysed before this feature existed, or by an
 * older pipeline, should yield the candidates it can rather than throwing. An
 * entry with no usable sentence is skipped — there would be nothing to show the
 * user and nothing to fingerprint.
 */
export function candidatesFromTimeline(timeline: unknown): EventCandidate[] {
  if (!Array.isArray(timeline)) return [];

  const candidates: EventCandidate[] = [];

  for (const entry of timeline) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;

    const sentence =
      typeof record.sourceText === "string" && record.sourceText.trim()
        ? record.sourceText.trim()
        : typeof record.description === "string" && record.description.trim()
          ? record.description.trim()
          : "";

    if (!sentence) continue;

    const title =
      typeof record.title === "string" && record.title.trim()
        ? record.title.trim()
        : sentence.slice(0, 80);

    candidates.push({
      transientId: typeof record.id === "string" ? record.id : `candidate_${candidates.length}`,
      title,
      narrativeBasis: sentence,
    });
  }

  return candidates;
}
