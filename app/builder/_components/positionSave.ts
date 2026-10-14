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

import { applyPositionPatch, readCasePosition, type PositionPatch } from "../../../src/lib/case-system/casePosition";
import { updateMasterResult } from "../../../src/lib/case-system/updateCaseRecord";

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

/*
 * STRAIGHT TO THE DATABASE FIRST (2026-10-14, walkthrough run 38511243860,
 * RN). The Small Claims guided defendant confirmed "I was served and need to
 * respond"; the results page said "Stage recorded", and the Overview and a
 * reload both asked again. The run's own log shows why: all four saves of
 * that stage (two from the click, two from the page's catch-up save, each
 * with its retry) ended `POST /api/cases/position failed: net::ERR_ABORTED`
 * -- every one ran past the ten-second limit, because the site's own server
 * was answering the page's long requests (the analysis, the case reader, the
 * research) and the save waited behind them. Nothing reached the case. The
 * case itself had been written moments before, straight to the database,
 * without trouble.
 *
 * So a position save now goes the way the case save goes: the person's own
 * signed-in client, through updateMasterResult (writes only over what it
 * read, so a save at the same moment is re-applied, never erased), with the
 * same applyPositionPatch the route uses (an unknown stage, a step from
 * another court or a date that is not a date is refused, never stored).
 * Row-level security limits it to the owner's own case, as it does the case
 * save. The route stays as the fallback for a write that failed outright.
 */

/** The parts of a Supabase client the direct save uses (the browser client, or a test double). */
export type PositionWriteClient = {
  from(table: "cases"): {
    select(columns: string): {
      eq(column: string, value: string): { maybeSingle(): PromiseLike<{ data: { court_path?: string | null } | null; error: unknown }> };
    };
  };
};

export type DirectSaveOutcome = "saved" | "refused" | "failed";

/** Applies a position patch to the case through the person's own client. Exported for test:case-position. */
export async function savePositionDirect(db: PositionWriteClient, caseId: string, patch: PositionPatch, now: () => Date = () => new Date()): Promise<DirectSaveOutcome> {
  try {
    const { data, error } = await db.from("cases").select("court_path").eq("id", caseId).maybeSingle();
    if (error || !data) return "failed";
    const courtPath = data.court_path ?? null;
    let refused = false;
    const result = await updateMasterResult(db, { caseId }, (stored) => {
      const applied = applyPositionPatch(readCasePosition(stored, courtPath), patch, courtPath, now());
      if (!applied.ok) {
        refused = true;
        return { reject: applied.error };
      }
      return { ...stored, position: applied.position };
    });
    if (result.ok) return "saved";
    return refused ? "refused" : "failed";
  } catch {
    return "failed";
  }
}

/** A promise that gives up after `ms` with `fallback` (its work may still finish). */
function within<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    work,
    new Promise<T>((resolve) => {
      timer = setTimeout(() => resolve(fallback), ms);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/** Set only by checks: the client the direct save uses instead of the browser's. */
let clientForChecks: PositionWriteClient | null = null;
export function setPositionClientForChecks(db: PositionWriteClient | null) {
  clientForChecks = db;
}

async function post(caseId: string, patch: Record<string, unknown>): Promise<boolean> {
  try {
    // Imported on use: pure helpers in modules that import this one are read
    // by checks that must not construct the Supabase client.
    const { supabase } = clientForChecks ? { supabase: null } : await import("@/src/lib/supabase/client");
    const direct = await within(
      savePositionDirect((clientForChecks ?? supabase) as unknown as PositionWriteClient, caseId, patch as PositionPatch),
      POSITION_SAVE_TIMEOUT_MS,
      "failed" as DirectSaveOutcome,
    );
    if (direct === "saved") return true;
    if (direct === "refused" || !supabase) return false;
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
