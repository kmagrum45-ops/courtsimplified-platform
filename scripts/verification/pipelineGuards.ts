/**
 * Shared guards for harnesses that drive the real pipeline against billed
 * OpenAI calls.
 *
 * Extracted from measureInterceptionRate.ts so runFixtures.ts reuses the same
 * timeout and failure handling rather than growing a second copy that can
 * drift from it.
 *
 * WHY THESE EXIST. Two incidents:
 *
 *  1. A measurement run against an exhausted daily quota sat for over two
 *     hours. The API returned 429s and one call never settled, so `await`
 *     never returned and the process looked alive while doing nothing.
 *     Nothing bounded a journey. Hence withTimeout().
 *
 *  2. The pipeline SWALLOWS API failures at two points, so a 429 does not
 *     reliably throw:
 *       - voiceLayer.ts catches everything and falls back to plain text;
 *       - courtSimplifiedBrain.ts's cognition call catches, returns null, and
 *         the caller substitutes buildFallbackCognition() — canned placeholder
 *         prose ("Detailed analysis is not available right now...").
 *     A run degraded that way COMPLETES and looks ordinary. A harness that
 *     writes its output captures placeholder text as if it were real pipeline
 *     behaviour. Hence describeRunDegradation().
 */

import type { PipelineRun } from "./fixtures/pipelineRunner";
import { isRateLimitError } from "../../src/lib/case-system/openaiClient";

export { isRateLimitError };

/**
 * Thrown to stop a harness immediately on the first rate-limit rejection.
 *
 * A 429 against a daily cap does not clear within a run, so every journey
 * attempted after the first one is guaranteed to fail, and each one still
 * spends requests failing. Continuing also corrupts the measurement: a failed
 * journey records zero interceptions, which reads as a clean journey.
 */
export class RateLimitAbort extends Error {
  constructor(context: string, cause: string) {
    super(`rate limited during ${context} — aborting before spending more quota: ${cause}`);
    this.name = "RateLimitAbort";
  }
}

/**
 * Rethrows as a RateLimitAbort when `error` is a 429, so callers can stop the
 * whole run rather than recording a per-journey failure and continuing.
 */
export function abortIfRateLimited(error: unknown, context: string): void {
  if (!isRateLimitError(error)) return;
  const cause = error instanceof Error ? error.message : String(error);
  throw new RateLimitAbort(context, cause.slice(0, 200));
}

/**
 * Per-journey ceiling. A journey is ~11 turns of 3-4 API calls; 90s is
 * generous for that and still bounded.
 */
export const PIPELINE_JOURNEY_TIMEOUT_MS = 90_000;

export async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Returns a reason string if this run is too degraded to record as real
 * pipeline output, or null if it is usable.
 *
 * Deliberately NOT treated as degradation:
 *   - `halted: true` — a safety halt is legitimate pipeline behaviour and is
 *     exactly what some fixtures exist to capture.
 *   - `analysisOutput: null` when the run halted — the analysis correctly did
 *     not run, and renderActualMarkdown already says so.
 *
 * KNOWN LIMIT, stated rather than hidden: a voiceLayer fallback is NOT
 * detectable here, because PipelineRun/TurnLog do not record
 * `fellBackToPlainText`. That fallback affects only the conversational lead-in
 * prose, which no harness writes into its output, so it does not corrupt a
 * captured fixture the way a cognition fallback does. If a harness ever starts
 * capturing lead-in text, this gap has to be closed first.
 */
export function describeRunDegradation(run: PipelineRun): string | null {
  // A run that did not halt but produced no analysis means the mapping or the
  // analysis step silently produced nothing.
  if (!run.halted && !run.analysisOutput) {
    return "pipeline returned no analysisOutput on a run that did not halt";
  }

  const cognitionMode = run.analysisOutput?.analysis?.intelligence?.cognitionMode;

  if (cognitionMode === "fallback") {
    return (
      "brain cognition fell back to buildFallbackCognition() — the structured " +
      "OpenAI call failed (rate limit, timeout, or parse error) and the summaries " +
      "are canned placeholder text, not real pipeline output"
    );
  }

  return null;
}
