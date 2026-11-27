/**
 * A SAVE THAT DID NOT GO THROUGH, IN PLAIN WORDS (site owner, 27 Nov 2026, item D).
 *
 * The intake's save showed any error's own message unless it was a TypeError or a SyntaxError, so a timeout
 * (AbortSignal.timeout: a DOMException named "TimeoutError", message "signal timed out") reached the page word for
 * word (#567's browser shard). Now: only a sentence this site wrote for the person (a plain `Error` with words of
 * ours) is shown; anything else gives the plain words passed in. And a save that timed out or got no answer at all
 * is worth one more try by itself; one the person's page cancelled, or one the server refused, is not.
 */
const RAW = /signal timed out|AbortError|TimeoutError|Error:|\bundefined\b|\[object|\bnull\b|elementStateMap|fetch failed|Failed to fetch|NetworkError|Load failed/;

/** The words to show for a failed save: the site's own sentence, or `plain`. */
export function saveFailureWords(error: unknown, plain: string): string {
  if (!(error instanceof Error) || error.name !== "Error") return plain;
  const message = error.message.trim();
  return message && !RAW.test(message) ? message : plain;
}

/**
 * A save the database did not answer in time. supabase-js does not throw on a timeout: it hands it back as an error
 * value ("AbortError: signal timed out"), which saveCheckpoint returns as `{ ok: false, reason: "error" }`. Found
 * 27 Nov 2026 while writing the lost-reply test: without this, only the facts request (a plain fetch, which throws) was
 * ever tried again, and a checkpoint that timed out was given up at once.
 */
export class SaveNoAnswer extends Error {
  constructor() {
    super("The save got no answer in time.");
    this.name = "SaveNoAnswer";
  }
}

type CheckpointOutcome = { ok: true } | { ok: false; reason: string; error?: string; code?: string };

/**
 * What a checkpoint save's answer means (IntakeRecovery.tsx). "saved" includes "intake-unchanged": the case already
 * holds this exact revision, which is what a retry finds when its first try landed but the answer was lost. So a lost
 * answer ends saved, with nothing written twice. "no-answer" is tried once more; "conflict" and "failed" are not.
 */
export function checkpointSaveResult(outcome: CheckpointOutcome): "saved" | "conflict" | "no-answer" | "failed" {
  if (outcome.ok) return "saved";
  if (outcome.reason === "rejected" && outcome.error === "intake-unchanged") return "saved";
  if (outcome.error === "intake-conflict") return "conflict";
  // A database that answered (a Postgres or PostgREST code) answered; only a request given up or never answered is "no answer".
  if (outcome.reason === "error" && !outcome.code && saveWorthRetrying({ name: "", message: outcome.error ?? "" })) return "no-answer";
  return "failed";
}

/** A save run once, and once more by itself when it got no answer (saveWorthRetrying). The retry runs the same save again. */
export async function saveWithOneRetry<T>(save: () => Promise<T>, options: { cancelled?: () => boolean; onRetry?: () => void } = {}): Promise<T> {
  try {
    return await save();
  } catch (error) {
    if (options.cancelled?.() || !saveWorthRetrying(error)) throw error;
    options.onRetry?.();
    return save();
  }
}

/** Whether a failed save is tried once more by itself: it timed out, or the request got no answer (a network failure). */
export function saveWorthRetrying(error: unknown, cancelled = false): boolean {
  if (cancelled || !error || typeof error !== "object") return false;
  if (error instanceof SaveNoAnswer) return true;
  const name = String((error as { name?: unknown }).name ?? "");
  const message = String((error as { message?: unknown }).message ?? "");
  return name === "TimeoutError" || name === "TypeError" || /signal timed out|timed? ?out|Failed to fetch|NetworkError|Load failed|fetch failed/i.test(`${name} ${message}`);
}

/** One choice saved, tried once more by itself if it did not go through (the kind-of-claim chooser, item D). */
export async function saveOnceMore(save: () => Promise<boolean>): Promise<boolean> {
  return (await save()) || save();
}
