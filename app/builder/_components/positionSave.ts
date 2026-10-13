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
