/**
 * ONE SAVE AT A TIME (2026-10-13).
 *
 * The stage, the step and the dates are saved to the case through
 * /api/cases/position, which reads the case, changes the position and writes
 * it back. Two saves sent at the same moment both read the case before either
 * wrote, so the second write erased the first. That happened every time a
 * stage was confirmed: the deadline box opened and saved the dates from the
 * story at the same instant, and the confirmed stage was lost -- the case page
 * then asked for it again (walkthrough, 2026-10-13: the commonest of the 17
 * "asked twice" failures). Every position save on a page goes through this
 * queue, so each one starts after the last has finished.
 */

let chain: Promise<unknown> = Promise.resolve();

/** How long one save may take before it is given up (and reported as not saved). */
export const POSITION_SAVE_TIMEOUT_MS = 10_000;

/**
 * A POST that gives up after `timeoutMs`, so a save that hangs cannot hold up
 * the queue or the case page waiting on it (review 2026-10-13: with no
 * timeout, one hung save made every case open wait the full 15 seconds).
 */
export async function postWithTimeout(url: string, init: RequestInit, timeoutMs = POSITION_SAVE_TIMEOUT_MS): Promise<boolean> {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    return response.ok;
  } catch {
    return false;
  }
}

async function post(caseId: string, patch: Record<string, unknown>): Promise<boolean> {
  try {
    // Imported on use: pure helpers in modules that import this one are read
    // by checks that must not construct the Supabase client.
    const { supabase } = await import("@/src/lib/supabase/client");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return false;
    return await postWithTimeout("/api/cases/position", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ caseId, ...patch }),
    });
  } catch {
    return false;
  }
}

/*
 * WAIT FOR SAVES ON THEIR WAY BEFORE READING THE CASE (2026-10-13,
 * walkthrough R4/R5). The results page counted the defence deadline from the
 * mailing date, said "Saved to your case", and the person pressed "Open your
 * case page" while those saves were still going (the builder sends the stage,
 * the step, the dates and how the papers were served one after another, with
 * a retry two seconds after a failure). The case page read the case before
 * they landed, so the Overview asked "How were the papers served?" and "Which
 * year was that?" again, and the Case file said "None yet"; a reload a minute
 * later showed everything saved. The case page is reached by in-app
 * navigation, so this module is the same one: the case page waits for THAT
 * case's saves (each queued save, and any multi-save run the builder
 * registered) before it reads. Saves for another case never hold it up.
 */
const inFlight = new Map<string, Set<Promise<unknown>>>();

function track<T>(caseId: string, work: Promise<T>): Promise<T> {
  const set = inFlight.get(caseId) ?? new Set<Promise<unknown>>();
  inFlight.set(caseId, set);
  set.add(work);
  const done = () => {
    set.delete(work);
    if (set.size === 0 && inFlight.get(caseId) === set) inFlight.delete(caseId);
  };
  work.then(done, done);
  return work;
}

/** Saves the person's own choice to the case, after any save already on its way. */
export function savePositionQueued(caseId: string, patch: Record<string, unknown>): Promise<boolean> {
  const run = chain.then(() => post(caseId, patch));
  chain = run.catch(() => undefined);
  return track(caseId, run.catch(() => false));
}

/** Registers a run of saves for this case (with its retries) that a reader of the case must wait for. */
export function trackPositionWork<T>(caseId: string, work: Promise<T>): Promise<T> {
  return track(caseId, work);
}

/**
 * Resolves once every save for this case started on this page so far has
 * finished (or after `maxWaitMs`, so nothing can stop the case opening).
 * Resolves straight away when nothing for this case is on its way.
 */
export async function positionSavesSettled(caseId: string, maxWaitMs = 15_000): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  for (;;) {
    const pending = [...(inFlight.get(caseId) ?? [])];
    if (pending.length === 0) return;
    const remaining = deadline - Date.now();
    if (remaining <= 0) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      Promise.allSettled(pending),
      new Promise((resolve) => {
        timer = setTimeout(resolve, remaining);
      }),
    ]);
    if (timer) clearTimeout(timer);
    // A save queued while we waited is waited for too (the loop reads again).
  }
}
