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

async function post(caseId: string, patch: Record<string, unknown>): Promise<boolean> {
  try {
    // Imported on use: pure helpers in modules that import this one are read
    // by checks that must not construct the Supabase client.
    const { supabase } = await import("@/src/lib/supabase/client");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return false;
    const response = await fetch("/api/cases/position", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ caseId, ...patch }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Saves the person's own choice to the case, after any save already on its way. */
export function savePositionQueued(caseId: string, patch: Record<string, unknown>): Promise<boolean> {
  const run = chain.then(() => post(caseId, patch));
  chain = run.catch(() => undefined);
  return run.catch(() => false);
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
 * navigation, so this module -- and the queue above -- is the same one: the
 * case page waits for it to drain (and for any multi-save run the builder
 * registered) before it reads.
 */
const inFlight = new Set<Promise<unknown>>();

/** Registers a run of saves (with its retries) that a reader of the case must wait for. */
export function trackPositionWork<T>(work: Promise<T>): Promise<T> {
  inFlight.add(work);
  const done = () => inFlight.delete(work);
  work.then(done, done);
  return work;
}

/**
 * Resolves once every position save started on this page so far has finished
 * (or after `maxWaitMs`, so a save that hangs never stops the case opening).
 * Resolves straight away when nothing is on its way.
 */
export async function positionSavesSettled(maxWaitMs = 15_000): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  for (;;) {
    const waitingOn = chain;
    const pending = [waitingOn, ...inFlight];
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
    // A save queued while we waited is waited for too.
    if (chain === waitingOn && inFlight.size === 0) return;
    if (Date.now() >= deadline) return;
  }
}
