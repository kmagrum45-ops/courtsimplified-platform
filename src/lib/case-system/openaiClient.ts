/**
 * The single place an OpenAI client is constructed.
 *
 * WHY THIS EXISTS. The usage dashboard showed 13,543 chat-completion requests
 * in one day against a 10,000/day cap, against call sites that imply roughly a
 * third of that. The gap was not a loop. It was the SDK's default retry
 * policy, applied silently at nine independent `new OpenAI({ apiKey })` sites
 * that had no options and no shared governance.
 *
 * openai@6 defaults to `maxRetries: 2` (client.js: `options.maxRetries ?? 2`),
 * so EVERY call was up to three requests. Worse, its shouldRetry() explicitly
 * retries rate limits:
 *
 *     // Retry on rate limits.
 *     if (response.status === 429) return true;
 *
 * So the request rate TRIPLED exactly when the quota was running out — the
 * failure mode accelerated itself. And against a DAILY cap a retry cannot
 * succeed by definition: the quota does not replenish in the seconds between
 * attempts, so all a retry can do is spend two more requests and deepen the
 * hole.
 *
 * Hence maxRetries: 0. This is a deliberate trade: a transient 500 or a
 * dropped connection that the SDK would previously have papered over now
 * surfaces to the caller. That is the behaviour we want here — every caller in
 * this codebase already handles failure explicitly (falling back to plain
 * text, to deterministic cognition, or to a typed null), and a visible failure
 * is worth more than an invisible 3x bill.
 */

import OpenAI from "openai";

/**
 * Never retry. See the file header: the dominant failure is a daily-cap 429,
 * which no retry can clear.
 */
export const OPENAI_MAX_RETRIES = 0;

export function createOpenAIClient(apiKey?: string): OpenAI {
  return new OpenAI({
    apiKey: apiKey ?? process.env.OPENAI_API_KEY,
    maxRetries: OPENAI_MAX_RETRIES,
  });
}

/**
 * True when an error is a rate-limit rejection.
 *
 * Harnesses use this to stop on the FIRST 429 rather than continuing to spend
 * quota on journeys that cannot succeed. Matches both the SDK's typed status
 * and the message text, because a 429 can reach a caller as a plain Error
 * after passing through one of the pipeline's catch-and-return-null sites.
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error) return false;

  const status = (error as { status?: number }).status;
  if (status === 429) return true;

  const message = error instanceof Error ? error.message : String(error);
  return /\b429\b|rate limit|rate_limit/i.test(message);
}

/**
 * Runs `work` with a hard ceiling, and ABORTS the underlying request when the
 * ceiling is hit.
 *
 * The pattern this replaces raced a request against a bare setTimeout:
 *
 *     const request = client.chat.completions.create({ ... });
 *     const timeout = new Promise((resolve) => setTimeout(() => resolve(null), ms));
 *     await Promise.race([request, timeout]);
 *
 * Promise.race abandons the LOSER's result, not the work behind it. The HTTP
 * request kept running after the caller had given up — billed, unobserved, and
 * (before maxRetries: 0) dragging its retries along with it. An AbortController
 * cancels the request itself.
 */
export async function withAbortableTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await run(controller.signal);
  } catch (error) {
    // An abort is the timeout firing, not a failure worth propagating — the
    // callers of this helper all treat "no output" as a fallback condition.
    // Any other error is the caller's to handle.
    if (controller.signal.aborted) return null;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
