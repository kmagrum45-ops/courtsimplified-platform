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

import { observeAiCall } from "../audit/aiCallLog";
import { createWithParamFallback } from "./aiModels";

/**
 * Logged when a model rejects a sampling parameter and the call is retried
 * without it (see aiModels.ts). A warning, not an error: the user got their
 * answer. But it means modelParams() is sending something this model does not
 * take, and the fix belongs there so the extra 400 stops happening.
 */
function warnDroppedParam(param: string, model: unknown): void {
  console.warn(
    `[openaiClient] ${String(model)} rejected '${param}'; retried without it. ` +
      "Update modelParams() in src/lib/case-system/aiModels.ts so this stops happening.",
  );
}

/**
 * Never retry. See the file header: the dominant failure is a daily-cap 429,
 * which no retry can clear.
 */
export const OPENAI_MAX_RETRIES = 0;

/**
 * `store: false` on every request, forced, not defaulted.
 *
 * WHAT GOES TO OPENAI. `buildCognitionPrompt` sends the whole
 * `NormalizedIntake` — including `rawUserText`, the user's account of their own
 * legal problem verbatim, and the extracted party names. Five other call sites
 * send the story text. This is the most sensitive data the platform holds and
 * it leaves the system on every analysis.
 *
 * WHY SET IT WHEN THE DEFAULT ALREADY COVERS US. Verified on 2026-09-15: every
 * call site uses CHAT COMPLETIONS, where `store` defaults to false, and the
 * OpenAI dashboard's Logs tab offers an Enable button rather than any records —
 * nothing has ever been stored in the org's logs.
 *
 * That position rests on two things nobody rechecks:
 *
 *   1. An org-level setting, which someone can flip.
 *   2. The fact that no call site has moved to the RESPONSES API, where
 *      `store` defaults to TRUE. That is where OpenAI is steering new work, so
 *      the first person to use it would silently start logging user narratives
 *      while every existing check stayed green.
 *
 * Forcing it here makes the property independent of both. It is the same
 * reasoning that put `maxRetries` in this file: nine independent `new OpenAI()`
 * sites with no shared governance is how the retry storm happened, and a
 * privacy guarantee spread across seven call sites has the same shape.
 *
 * WHAT THIS DOES NOT DO — and the privacy notice must not claim otherwise.
 * `store: false` removes retention in OUR logs. It does NOT remove OpenAI's
 * ABUSE-MONITORING retention, which applies under the standard API terms
 * regardless. Zero Data Retention is what removes that, it is an application
 * rather than a toggle, and this account has not applied. See
 * docs/security/DATA_FLOW_INVENTORY.md section 3.
 *
 * SPREAD LAST, DELIBERATELY. `{ ...body, store: false }` means a caller cannot
 * turn it on by passing `store: true` — accidentally or otherwise. If a request
 * ever genuinely needs storing, that is a change to this file, which is a
 * visible diff someone writes and someone reviews.
 */
export function forceNoStore<T>(client: T): T {
  const target = client as unknown as { chat: { completions: { create: (...args: unknown[]) => unknown } } };
  const chatCreate = target.chat.completions.create.bind(target.chat.completions);
  target.chat.completions.create = ((body: Record<string, unknown>, options?: unknown) =>
    // LSO Step 7. The audit row is written HERE, for the same reason store:false
    // is set here -- see src/lib/audit/aiCallLog.ts. "Every model call is
    // logged" has to be a property of the client, not a habit of seven callers.
    // observeAiCall is an observer: it returns and throws exactly what the call
    // returns and throws.
    observeAiCall(body, async () =>
      createWithParamFallback(
        (attempt) => chatCreate({ ...attempt, store: false }, options) as Promise<unknown>,
        body,
        warnDroppedParam,
      ),
    )) as never;

  /*
   * `chat.completions.parse` — the SDK's structured-output helper.
   *
   * Wrapped 2026-09-23 after independent review pointed out that only
   * `.create` was covered. `.parse` is the method someone reaches for when
   * they want a typed response under a JSON schema, which is exactly the
   * direction this codebase is being pushed — so it is the single most likely
   * next call, and it would have bypassed BOTH `store: false` and the audit
   * log in one line.
   *
   * Guarded by a typeof check rather than assumed present: it arrived in a
   * recent SDK version and pinning behaviour to its existence would break the
   * client on an older one.
   */
  const chatCompletions = target.chat.completions as unknown as Record<string, unknown>;
  if (typeof chatCompletions.parse === "function") {
    const chatParse = (chatCompletions.parse as (...args: unknown[]) => unknown).bind(
      target.chat.completions,
    );
    chatCompletions.parse = ((body: Record<string, unknown>, options?: unknown) =>
      observeAiCall(body, async () =>
        createWithParamFallback(
          (attempt) => chatParse({ ...attempt, store: false }, options) as Promise<unknown>,
          body,
          warnDroppedParam,
        ),
      )) as never;
  }

  // The Responses API is wrapped too, even though nothing uses it yet. It is
  // the one that defaults to storing, so it is the one most worth covering
  // BEFORE somebody reaches for it.
  const responses = (client as unknown as { responses?: { create?: unknown } }).responses;
  if (responses && typeof responses.create === "function") {
    const responsesCreate = (responses.create as (...args: unknown[]) => unknown).bind(responses);
    responses.create = ((body: Record<string, unknown>, options?: unknown) =>
      observeAiCall(body, async () =>
        responsesCreate({ ...body, store: false }, options),
      )) as never;
  }

  /*
   * `embeddings.create` -- added 2026-10-05 for meaning-based retrieval over
   * the corpus (retrieval/storyRetrieval.ts). Embeddings have no `store`
   * parameter and are not retained as completions are, so nothing is forced
   * here; it is wrapped so the call is in the audit log like every other.
   * What it is sent is the AI-written legal search phrases, not the story.
   */
  const embeddings = (client as unknown as { embeddings?: { create?: unknown } }).embeddings;
  if (embeddings && typeof embeddings.create === "function") {
    const embeddingsCreate = (embeddings.create as (...args: unknown[]) => unknown).bind(embeddings);
    embeddings.create = ((body: Record<string, unknown>, options?: unknown) =>
      observeAiCall(body, async () => embeddingsCreate(body, options))) as never;
  }

  return client;
}

export function createOpenAIClient(apiKey?: string): OpenAI {
  return forceNoStore(
    new OpenAI({
      apiKey: apiKey ?? process.env.OPENAI_API_KEY,
      maxRetries: OPENAI_MAX_RETRIES,
    }),
  );
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
