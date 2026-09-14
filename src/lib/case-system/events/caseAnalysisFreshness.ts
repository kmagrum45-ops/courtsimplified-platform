/**
 * Whether a case's stored analysis still reflects what the user has recorded.
 *
 * COSTS NOTHING. Pure comparison of two timestamps. No API call — which is the
 * entire point.
 *
 * `master_result` IS A DERIVED CACHE, NOT THE SOURCE OF TRUTH. Events plus
 * intake are the truth; `master_result` is what the pipeline produced from them
 * at one moment. It carries `derivedFrom` so that moment is recoverable.
 *
 * WHY STALENESS IS SHOWN AND NEVER SILENTLY FIXED. Recomputing means re-running
 * the brain, which costs OpenAI calls — this session cut a journey from roughly
 * 44 calls to 26 deliberately, and a background recompute on every new event
 * would hand that back and more. So the user is TOLD, and decides. A banner
 * they can ignore is cheaper than an automatic refresh they did not ask for,
 * and more honest than an analysis that silently changes under them.
 */

import { liveCaseEvents, type CaseEventRow } from "./caseEventAdapter";

/** Written into master_result each time the pipeline produces one. */
export type AnalysisDerivedFrom = {
  /** ISO timestamp: when this analysis was produced. */
  at: string;
  /**
   * `created_at` of the newest live event the analysis was derived from, or
   * null where there were none.
   *
   * Kept alongside `at` rather than relying on `at` alone because they answer
   * different questions: `at` says when we last ran, and this says what we last
   * saw. An analysis run before any events existed and an analysis run after
   * three were recorded both have an `at`; only this distinguishes them.
   */
  latestEventCreatedAt: string | null;
};

export type AnalysisFreshness =
  | { state: "fresh" }
  | { state: "never-analyzed" }
  | {
      state: "stale";
      /** How many live events postdate the analysis. */
      newEventCount: number;
      analysisAt: string;
    };

/** The value to write into master_result when an analysis is produced. */
export function buildDerivedFrom(events: CaseEventRow[], now: Date): AnalysisDerivedFrom {
  const live = liveCaseEvents(events);

  const latest = live.reduce<string | null>(
    (newest, event) => (newest === null || event.created_at > newest ? event.created_at : newest),
    null,
  );

  return { at: now.toISOString(), latestEventCreatedAt: latest };
}

export function readDerivedFrom(masterResult: unknown): AnalysisDerivedFrom | null {
  if (!masterResult || typeof masterResult !== "object") return null;

  const record = (masterResult as Record<string, unknown>).derivedFrom;
  if (!record || typeof record !== "object") return null;

  const at = (record as Record<string, unknown>).at;
  if (typeof at !== "string" || !at) return null;

  const latest = (record as Record<string, unknown>).latestEventCreatedAt;

  return {
    at,
    latestEventCreatedAt: typeof latest === "string" ? latest : null,
  };
}

/**
 * Compare what the analysis saw against what is recorded now.
 *
 * An analysis with no `derivedFrom` is "never-analyzed" rather than stale: it
 * predates this field, and calling it stale would tell every existing user
 * their analysis is out of date on the strength of a missing key.
 */
export function analysisFreshness(
  masterResult: unknown,
  events: CaseEventRow[],
): AnalysisFreshness {
  const derivedFrom = readDerivedFrom(masterResult);
  if (!derivedFrom) return { state: "never-analyzed" };

  // Events recorded after the analysis ran. Comparing created_at — when the
  // user told us — not occurred_at, which is when the thing happened and may
  // be absent, approximate, or long before the analysis.
  const newer = liveCaseEvents(events).filter((event) => event.created_at > derivedFrom.at);

  return newer.length === 0
    ? { state: "fresh" }
    : { state: "stale", newEventCount: newer.length, analysisAt: derivedFrom.at };
}

/**
 * The sentence shown to the user. Says what changed and what it means, and
 * does not imply the analysis is wrong — only that it has not seen everything.
 */
export function freshnessMessage(freshness: AnalysisFreshness): string | null {
  if (freshness.state !== "stale") return null;

  const count = freshness.newEventCount;
  const plural = count === 1 ? "event" : "events";

  return (
    `You have recorded ${count} ${plural} since this analysis was last updated, ` +
    `so parts of it may not reflect where your case is now. Updating is up to you — ` +
    `nothing here changes on its own.`
  );
}
