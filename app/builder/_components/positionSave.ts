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
import { situationOfCase, withoutSituationDates } from "../../../src/lib/case-system/situation/situation";
import {
  addPendingPositionSave,
  casesWithPendingPositionSaves,
  mergePositionPatches,
  readPendingPositionSaves,
  RESEND_HEADER,
  settlePendingPositionSave,
  takePendingPositionSaves,
} from "../../../src/lib/case-system/storage/pendingPositionSaves";

/*
 * ONE QUEUE FOR EVERY WRITE TO A CASE'S ROW THAT A PAGE STARTS (2026-10-14,
 * walkthrough run 38525903567: two of five journeys stopped on "Saving your
 * case" and "Opening your case…", the browser logging PATCH and GET
 * /rest/v1/cases 500 57014, "canceling statement due to statement timeout").
 * The case save (builder page.tsx, saveChainRef) and these position saves
 * were two separate queues, so each was one at a time on its own, but the two
 * -- and the family-answers save, the drafts and form-answers routes, and the
 * case reader's write, which were in no queue -- wrote the same large
 * master_result row at the same moment. Each write of that row sends and
 * rewrites the whole record; a second UPDATE of a row waits on the first's
 * row lock, and that wait counts against the statement timeout.
 *
 * Now every write to a case's row that the builder, the case pages or the
 * Forms page start -- straight to the database or through a route that writes
 * it (caseRouteWrite) -- goes through runCaseWrite, one per case at a time.
 * Each request in it is given up after CASE_REQUEST_TIMEOUT_MS; a save given
 * up on still holds the queue until its request has really ended (HOLD_CAP_MS
 * at most); and a piece of work that never settles at all holds it for
 * WORK_CAP_MS at most, so nothing can stall the queue for good.
 *
 * Not in the queue: a route the server runs on its own (none on these pages
 * today) and the case's creation (an insert: there is no row to overlap).
 */
const chains = new Map<string, Promise<void>>();

/** How long one save may take before it is given up (and reported as not saved). */
export const POSITION_SAVE_TIMEOUT_MS = 10_000;

/**
 * Each read or write of the case from a page is given up after this long. Above
 * the database's own statement timeout for signed-in requests (8 s on
 * Supabase), so a request is never abandoned while the database could still
 * finish it.
 */
export const CASE_REQUEST_TIMEOUT_MS = 10_000;

/** How long a route write through the queue may take before the page gives up on it. */
export const CASE_ROUTE_TIMEOUT_MS = 20_000;

/** How long a given-up write may still hold the queue before the next goes ahead regardless. */
const HOLD_CAP_MS = 15_000;

/**
 * How long one piece of work may hold the queue at all. The case save, its
 * slowest legitimate run (two tries of a read and a write, each given up at
 * CASE_REQUEST_TIMEOUT_MS, and the pause between) fits inside it.
 */
const WORK_CAP_MS = 45_000;

/** Set only by checks: shorter limits. */
let saveTimeoutMs = POSITION_SAVE_TIMEOUT_MS;
let workCapMs = WORK_CAP_MS;
let holdCapMs = HOLD_CAP_MS;
export function setPositionSaveTimeoutForChecks(ms: number | null) {
  saveTimeoutMs = ms ?? POSITION_SAVE_TIMEOUT_MS;
}
export function setCaseWriteCapsForChecks(caps: { workMs?: number; holdMs?: number } | null) {
  workCapMs = caps?.workMs ?? WORK_CAP_MS;
  holdCapMs = caps?.holdMs ?? HOLD_CAP_MS;
}

function settledWithin(work: Promise<unknown>[], capMs: number): Promise<void> {
  if (work.length === 0) return Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    Promise.allSettled(work).then(() => undefined),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, capMs);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Runs `work` once every earlier write to this case started on this page has
 * finished, and holds the next write until `work` (and anything it handed to
 * `hold`) has finished -- or until the caps above, so work that never settles
 * cannot stall the queue. Every write to a case's row that a page starts goes
 * through here; a reader of the case waits for it (positionSavesSettled).
 */
export function runCaseWrite<T>(caseId: string, work: (hold: (pending: Promise<unknown>) => void) => Promise<T>): Promise<T> {
  const previous = chains.get(caseId) ?? Promise.resolve();
  const held: Promise<unknown>[] = [];
  const run = previous.then(() => work((pending) => held.push(pending)));
  const released = previous.then(() => settledWithin([run], workCapMs)).then(() => settledWithin(held, holdCapMs));
  chains.set(caseId, released);
  void released.then(() => {
    if (chains.get(caseId) === released) chains.delete(caseId);
  });
  void track(caseId, released);
  return track(caseId, run);
}

/**
 * A request to a route that writes the case's row (/api/cases/drafts,
 * /api/cases/form-applicability), sent from inside the case's queue and given
 * up after `timeoutMs`. Resolves to null when it could not be sent or was
 * given up.
 */
export function caseRouteWrite(caseId: string, url: string, init: RequestInit, timeoutMs = CASE_ROUTE_TIMEOUT_MS): Promise<Response | null> {
  return runCaseWrite(caseId, () => fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })).catch(() => null);
}

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
 * save. The route stays as the fallback only for a save whose request got no
 * answer from the database at all (a network failure); when the database
 * answered with an error, or ran past the time, the route -- the same
 * database -- is not tried.
 */

type Builder<T> = PromiseLike<T> & { abortSignal?: (signal: AbortSignal) => Builder<T> };

/** The parts of a Supabase client the direct save uses (the browser client, or a test double). */
export type PositionWriteClient = {
  from(table: "cases"): {
    select(columns: string): {
      eq(column: string, value: string): { maybeSingle(): Builder<{ data: { court_path?: string | null; position?: unknown } | null; error: unknown }> };
    };
  };
};

export type DirectSaveOutcome = "saved" | "refused" | "failed";

/** A JSON form with sorted keys, so two equal values compare equal whatever their key order. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

const UNCHANGED = "unchanged";

type DirectSaveDetail = {
  outcome: DirectSaveOutcome;
  /**
   * The database answered with an error code, or the request ran past its
   * time: the route goes to the same database, so it is not tried. False
   * when the request got no answer at all (a network failure).
   */
  databaseBusy: boolean;
};

/** Whether a client error came from the database (a Postgres or PostgREST code) or a request given up, rather than no answer at all. */
export function databaseAnswered(error: unknown): boolean {
  const record = (error && typeof error === "object" ? error : {}) as { code?: unknown; message?: unknown; name?: unknown };
  if (typeof record.code === "string" && record.code.trim()) return true;
  return /abort|timed? ?out/i.test(`${String(record.name ?? "")} ${String(record.message ?? "")}`);
}

async function directSave(
  db: PositionWriteClient,
  caseId: string,
  patch: PositionPatch,
  options: { now?: () => Date; abandoned?: { gaveUp: boolean } } = {},
): Promise<DirectSaveDetail> {
  const now = options.now ?? (() => new Date());
  try {
    /*
     * ALREADY ON THE CASE? -- READ ONLY THE POSITION (2026-10-14). The court
     * and the stored position alone (a JSON path, not the whole record) say
     * whether this patch changes anything. When it does not, nothing more is
     * read and nothing is written; only a real change reads the whole record
     * (updateMasterResult) to write it back.
     */
    let read = db.from("cases").select("court_path,position:master_result->position").eq("id", caseId).maybeSingle();
    if (typeof read.abortSignal === "function") read = read.abortSignal(AbortSignal.timeout(CASE_REQUEST_TIMEOUT_MS));
    const { data, error } = await read;
    if (error) return { outcome: "failed", databaseBusy: databaseAnswered(error) };
    if (!data) return { outcome: "failed", databaseBusy: false };
    const courtPath = data.court_path ?? null;
    const before = readCasePosition({ position: data.position }, courtPath);
    const preview = applyPositionPatch(before, patch, courtPath, now());
    if (!preview.ok) return { outcome: "refused", databaseBusy: false };
    if (canonical(preview.position) === canonical(before)) return { outcome: "saved", databaseBusy: false };

    let refused = false;
    const result = await updateMasterResult(
      db,
      { caseId },
      (stored) => {
        // Given up on (it ran past its time and the next save has gone ahead):
        // it must not land later and put an older choice over a newer one
        // (review 2026-10-14). A write already sent when it was given up loses
        // to any newer save through updateMasterResult's updated_at check.
        if (options.abandoned?.gaveUp) return { reject: "gave up" };
        const current = readCasePosition(stored, courtPath);
        const applied = applyPositionPatch(current, patch, courtPath, now());
        if (!applied.ok) {
          refused = true;
          return { reject: applied.error };
        }
        // Already on the case by the time of the full read: nothing is written.
        if (canonical(applied.position) === canonical(current)) return { reject: UNCHANGED };
        // The situation's own date is read over the position, never written into it (situation.ts).
        return { ...stored, position: { ...applied.position, dateAnswers: withoutSituationDates(applied.position.dateAnswers, courtPath, situationOfCase(stored)) } };
      },
      4,
      { requestTimeoutMs: CASE_REQUEST_TIMEOUT_MS },
    );
    if (result.ok) return { outcome: "saved", databaseBusy: false };
    if (result.reason === "rejected" && result.error === UNCHANGED) return { outcome: "saved", databaseBusy: false };
    if (refused) return { outcome: "refused", databaseBusy: false };
    const answered =
      result.reason === "conflict" ||
      Boolean(options.abandoned?.gaveUp) ||
      (result.reason === "error" && databaseAnswered({ code: result.code, message: result.error }));
    return { outcome: "failed", databaseBusy: answered };
  } catch {
    return { outcome: "failed", databaseBusy: false };
  }
}

/** Applies a position patch to the case through the person's own client. Exported for test:case-position. */
export async function savePositionDirect(
  db: PositionWriteClient,
  caseId: string,
  patch: PositionPatch,
  options: { now?: () => Date; abandoned?: { gaveUp: boolean } } = {},
): Promise<DirectSaveOutcome> {
  return (await directSave(db, caseId, patch, options)).outcome;
}

/**
 * The direct save, given up after `ms`: from then on it writes nothing
 * (`abandoned`), so a slow save cannot land after a newer one. `finished`
 * settles when the request itself has; the queue waits for it.
 */
function directSaveWithin(
  db: PositionWriteClient,
  caseId: string,
  patch: PositionPatch,
  ms: number,
): { result: Promise<DirectSaveDetail>; finished: Promise<unknown> } {
  const abandoned = { gaveUp: false };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const work = directSave(db, caseId, patch, { abandoned });
  const result = Promise.race([
    work,
    new Promise<DirectSaveDetail>((resolve) => {
      timer = setTimeout(() => {
        abandoned.gaveUp = true;
        resolve({ outcome: "failed", databaseBusy: true });
      }, ms);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
  return { result, finished: work };
}

/** The direct save, given up after `ms`. Exported for test:case-position. */
export async function savePositionDirectWithin(db: PositionWriteClient, caseId: string, patch: PositionPatch, ms: number): Promise<DirectSaveOutcome> {
  return (await directSaveWithin(db, caseId, patch, ms).result).outcome;
}

/** Set only by checks: the client the direct save uses instead of the browser's. */
let clientForChecks: PositionWriteClient | null = null;
/** Set only by checks: what the route fallback does instead of the network. */
let routeForChecks: ((patch: Record<string, unknown>) => Promise<boolean>) | null = null;
export function setPositionClientForChecks(db: PositionWriteClient | null, route: ((patch: Record<string, unknown>) => Promise<boolean>) | null = null) {
  clientForChecks = db;
  routeForChecks = route;
}

async function post(caseId: string, patch: Record<string, unknown>, hold: (pending: Promise<unknown>) => void): Promise<DirectSaveOutcome> {
  try {
    // Imported on use: pure helpers in modules that import this one are read
    // by checks that must not construct the Supabase client.
    const { supabase } = clientForChecks ? { supabase: null } : await import("@/src/lib/supabase/client");
    const direct = directSaveWithin((clientForChecks ?? supabase) as unknown as PositionWriteClient, caseId, patch as PositionPatch, saveTimeoutMs);
    // A request given up on still holds the queue until it has finished.
    hold(direct.finished);
    const { outcome, databaseBusy } = await direct.result;
    if (outcome !== "failed") return outcome;
    // The route writes the same row in the same database. When the database
    // itself answered with an error or ran past the time, it would only add
    // a second full read and write to a database already behind (run
    // 38525903567). A request that got no answer at all (the network) is
    // tried through the route.
    if (databaseBusy) return "failed";
    if (routeForChecks) {
      const routed = routeForChecks(patch);
      hold(routed);
      return (await routed) ? "saved" : "failed";
    }
    if (!supabase) return "failed";
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return "failed";
    const routed = postWithTimeout("/api/cases/position", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ caseId, ...patch }),
    });
    hold(routed);
    return (await routed) ? "saved" : "failed";
  } catch {
    return "failed";
  }
}

/*
 * WHAT IS ALREADY ON THE CASE IS NOT SENT AGAIN (2026-10-14, run 38525903567).
 * The builder's catch-up save re-sent every part decided on the page each time
 * any one changed -- the stage again with each date, the dates again with each
 * step -- on top of the deadline box's own save of the same thing, and each
 * send read and rewrote the whole case. What this page has saved is
 * remembered per case, and the catch-up sends only what is not yet saved.
 * Only the catch-up uses this: a person's own click is always sent (and costs
 * no write when the case already holds it, above).
 */
type SavedParts = { stage?: string; motion?: string; stepId?: string; dates: Record<string, string>; service: Record<string, string> };
const savedParts = new Map<string, SavedParts>();

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/** The part of `patch` this page has not already saved to the case, or null when all of it has been. */
export function unsavedPositionPatch(caseId: string, patch: Record<string, unknown>): Record<string, unknown> | null {
  const saved = savedParts.get(caseId) ?? { dates: {}, service: {} };
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (key === "confirmedStageFrom") continue;
    if (key === "confirmedStage") {
      if (canonical([value, patch.confirmedStageFrom ?? null]) !== saved.stage) {
        out.confirmedStage = value;
        if (patch.confirmedStageFrom !== undefined) out.confirmedStageFrom = patch.confirmedStageFrom;
      }
    } else if (key === "motionToChange") {
      if (canonical(value) !== saved.motion) out.motionToChange = value;
    } else if (key === "stepId") {
      if (canonical(value) !== saved.stepId) out.stepId = value;
    } else if (key === "dateAnswers" || key === "service") {
      const known = key === "dateAnswers" ? saved.dates : saved.service;
      const left = Object.fromEntries(Object.entries(asObject(value)).filter(([id, entry]) => canonical(entry) !== known[id]));
      if (Object.keys(left).length) out[key] = left;
    } else {
      out[key] = value;
    }
  }
  return Object.keys(out).length ? out : null;
}

function rememberSaved(caseId: string, patch: Record<string, unknown>) {
  const saved = savedParts.get(caseId) ?? { dates: {}, service: {} };
  savedParts.set(caseId, saved);
  if (patch.confirmedStage !== undefined) saved.stage = canonical([patch.confirmedStage, patch.confirmedStageFrom ?? null]);
  if (patch.motionToChange !== undefined) saved.motion = canonical(patch.motionToChange);
  if (patch.stepId !== undefined) saved.stepId = canonical(patch.stepId);
  for (const [id, entry] of Object.entries(asObject(patch.dateAnswers))) {
    saved.dates[id] = canonical(entry);
    // A removed date takes its service details with it (applyPositionPatch).
    if (entry === "" || entry === null) delete saved.service[id];
  }
  for (const [id, entry] of Object.entries(asObject(patch.service))) saved.service[id] = canonical(entry);
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
 * case's saves (each queued write -- the case save too -- and any multi-save
 * run the builder registered) before it reads. Saves for another case never
 * hold it up.
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

/**
 * Saves the person's own choice to the case, after any write to it already on
 * its way; says how it went. With `onlyUnsaved`, what this page has already
 * saved is left out when its turn comes (so a save queued just before it
 * counts), and nothing is sent when all of it has been.
 */
export function savePositionQueuedOutcome(caseId: string, wanted: Record<string, unknown>, options: { onlyUnsaved?: boolean } = {}): Promise<DirectSaveOutcome> {
  // A save an earlier page in this tab left unfinished goes first, so this newer one lands over it.
  replayPendingPositionSaves(caseId);
  // Written down before it is sent, crossed off once the case holds it (pendingPositionSaves.ts).
  const pending = { id: `${Date.now().toString(36)}-${(pendingCounter += 1)}`, at: Date.now(), patch: wanted };
  addPendingPositionSave(caseId, pending);
  watchPageClose(caseId);
  listenForPageClose();
  return runCaseWrite(caseId, async (hold) => {
    const patch = options.onlyUnsaved ? unsavedPositionPatch(caseId, wanted) : wanted;
    if (!patch) return "saved";
    const outcome = await post(caseId, patch, hold);
    if (outcome === "saved") rememberSaved(caseId, patch);
    return outcome;
  })
    .catch((): DirectSaveOutcome => "failed")
    .then((outcome) => {
      // Finished -- saved, refused or failed -- it is crossed off: a failed save already says "not
      // saved" here, and sending it later could put it over a newer choice (fresh review, 28 Oct).
      // Only a save cut off by the page going stays written down: one that "fails" because the page
      // is leaving (the browser cancels its request) is exactly that one, so it is kept.
      if (!pageLeaving) settlePendingPositionSave(caseId, pending.id);
      return outcome;
    });
}

/*
 * WHAT A PAGE LEFT UNSAVED IS SENT BY THE NEXT (28 Oct, #488 at real speed). The queue above lives
 * in the page's memory: a reload or a typed address while a save waited its turn lost it, and the
 * case page never had the date the next-step page had counted. Each save is written down in this
 * tab first (pendingPositionSaves.ts); the first save to or read of a case on a new page sends what
 * is still written down for it, merged in order, before anything else of that case. A closed tab
 * sends it as it closes (watchPageClose). Both go through the same guarded read-change-write, so a
 * save that had in fact landed changes nothing when it is sent again.
 */
let pendingCounter = 0;
const replayed = new Set<string>();

/** Set only by checks: forgets which cases this "page" has replayed, as a new page load would. */
export function resetPageForChecks() {
  replayed.clear();
  replayedPatches.clear();
  formsReplayed.clear();
  formsWatched.clear();
  pageLeaving = false;
  watched.clear();
  chains.clear();
  inFlight.clear();
  savedParts.clear();
}

/** What this page sent for each case from an earlier page (so a page that read the case before it landed can show it). */
const replayedPatches = new Map<string, Record<string, unknown>>();

/** Sends, once per page, what an earlier page in this tab left unsaved for this case. */
export function replayPendingPositionSaves(caseId: string): void {
  if (replayed.has(caseId)) return;
  replayed.add(caseId);
  const left = takePendingPositionSaves(caseId);
  if (!left) return;
  replayedPatches.set(caseId, left);
  // Shown over what the page read only until it has landed: then the case holds it, and a newer
  // choice made on this page is never covered by it (fresh review, 28 Oct).
  void savePositionQueuedOutcome(caseId, left).then(() => {
    replayedPatches.delete(caseId);
  });
}

/** What an earlier page in this tab left unsaved for this case: being sent by this page, or still written down. Reads only. */
export function unsavedFromEarlierPage(caseId: string): Record<string, unknown> | null {
  return replayedPatches.get(caseId) ?? (replayed.has(caseId) ? null : mergePositionPatches(readPendingPositionSaves(caseId).map((entry) => entry.patch)));
}

/**
 * The case as just read, with what this page is sending from an earlier page already applied.
 * The builder reads the case through the intake store before any save can run, so a reload of the
 * next-step page showed the date as not given while it was on its way (28 Oct, family): the same
 * applyPositionPatch the save uses puts it on the page at once.
 */
export function withReplayedPosition(master: Record<string, unknown>, caseId: string, courtPath: string | null): Record<string, unknown> {
  replayPendingPositionSaves(caseId);
  const patch = replayedPatches.get(caseId);
  if (!patch) return master;
  const applied = applyPositionPatch(readCasePosition(master, courtPath), patch as PositionPatch, courtPath, new Date());
  return applied.ok ? { ...master, position: applied.position } : master;
}

/*
 * A CLOSED TAB SENDS WHAT IS STILL WRITTEN DOWN. Session storage dies with the tab, so as the page
 * goes (pagehide) each case's unsaved parts are sent to the position route with keepalive, which the
 * browser finishes after the page has gone. The sign-in token is read while the page is still here.
 */
const watched = new Set<string>();
let accessToken: string | null = null;
let pageCloseListening = false;

function watchPageClose(caseId: string) {
  watched.add(caseId);
  if (typeof window === "undefined" || clientForChecks) return;
  void import("@/src/lib/supabase/client")
    .then(({ supabase }) => supabase.auth.getSession())
    .then(({ data }) => {
      accessToken = data.session?.access_token ?? accessToken;
    })
    .catch(() => {});
  listenForPageClose();
}

/**
 * Set once the page is going (a reload, a typed address, a closed tab): from then on a save whose
 * request the browser cancels is not crossed off, because it was cut off, not finished. Set on
 * pagehide only, which cannot be cancelled and comes before the page's requests are cancelled --
 * not on beforeunload, where "Leave site?" can be answered Stay and the page goes on (second fresh
 * review, 28 Oct: then nothing on that page was ever crossed off).
 */
let pageLeaving = false;

/** What the page does as it goes. Exported for checks. */
export function pageGoing() {
  pageLeaving = true;
  sendPendingAsPageCloses();
}

function listenForPageClose() {
  if (pageCloseListening || typeof window === "undefined") return;
  pageCloseListening = true;
  window.addEventListener("pagehide", () => pageGoing());
  // Back from the browser's page cache: the page is here again, and its saves finish normally.
  window.addEventListener("pageshow", (event) => {
    if ((event as PageTransitionEvent).persisted) pageLeaving = false;
  });
}

type CloseSend = { caseId: string; url: string; method: "POST" | "PATCH"; body: Record<string, unknown> };

/** What the page sends as it closes: each watched case's unsaved parts, merged in order. Exported for checks. */
export function pendingSendsAsPageCloses(): CloseSend[] {
  const positions = casesWithPendingPositionSaves(watched)
    .map((caseId) => ({ caseId, patch: mergePositionPatches(readPendingPositionSaves(caseId).map((entry) => entry.patch)) }))
    .filter((send): send is { caseId: string; patch: Record<string, unknown> } => Boolean(send.patch))
    .map(({ caseId, patch }): CloseSend => ({ caseId, url: "/api/cases/position", method: "POST", body: { caseId, ...patch } }));
  const choices = casesWithPendingPositionSaves(formsWatched, "formApplicability")
    .map((caseId) => ({ caseId, patch: mergePositionPatches(readPendingPositionSaves(caseId, Date.now(), "formApplicability").map((entry) => entry.patch), "formApplicability") }))
    .filter((send): send is { caseId: string; patch: Record<string, unknown> } => Boolean(send.patch))
    .map(({ caseId, patch }): CloseSend => ({ caseId, url: "/api/cases/form-applicability", method: "PATCH", body: { caseId, formApplicability: patch } }));
  return [...positions, ...choices];
}

function sendPendingAsPageCloses() {
  if (!accessToken) return;
  for (const { url, method, body } of pendingSendsAsPageCloses()) {
    try {
      void fetch(url, {
        method,
        keepalive: true,
        // Tried once by the route: a case changed since is not written over (RESEND_HEADER).
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, [RESEND_HEADER]: "1" },
        body: JSON.stringify(body),
      }).catch(() => {});
    } catch {
      // Nothing more can be done as the page goes; the next page in this tab sends it again.
    }
  }
}

/*
 * THE FORMS PAGE'S "DOES THIS FORM APPLY" CHOICES, THE SAME WAY (owner, 28 Oct). They go through
 * the case's queue to /api/cases/form-applicability, so a reload while one waited lost it as a date
 * was lost. Written down first (kind "formApplicability"), crossed off once the route has answered;
 * the next Forms page in this tab sends what is left before it reads the choices.
 */
const formsReplayed = new Set<string>();
const formsWatched = new Set<string>();
/** Set only by checks: what the forms route answers instead of the network. */
let formsRouteForChecks: ((body: Record<string, unknown>) => Promise<Response | null>) | null = null;
export function setFormsRouteForChecks(route: typeof formsRouteForChecks) {
  formsRouteForChecks = route;
}

/** Saves the Forms page's choices through the case's queue, written down first. Returns the route's answer (null: none). */
export async function saveFormApplicabilityQueued(caseId: string, formApplicability: Record<string, unknown>, token: string): Promise<Response | null> {
  await replayPendingFormApplicability(caseId, token);
  const pending = { id: `${Date.now().toString(36)}-${(pendingCounter += 1)}`, at: Date.now(), patch: formApplicability };
  addPendingPositionSave(caseId, pending, "formApplicability");
  formsWatched.add(caseId);
  accessToken = token;
  listenForPageClose();
  const body = { caseId, formApplicability };
  const response = formsRouteForChecks
    ? await formsRouteForChecks(body)
    : await caseRouteWrite(caseId, "/api/cases/form-applicability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
  // Finished, whatever the answer: crossed off (the page says when it did not save). Only a save
  // cut off by the page going stays written down -- including one whose request was cancelled as it went.
  if (!pageLeaving) settlePendingPositionSave(caseId, pending.id, "formApplicability");
  return response;
}

/** Sends, once per page, the Forms choices an earlier page in this tab left unsaved; resolves once sent. */
export async function replayPendingFormApplicability(caseId: string, token: string): Promise<void> {
  if (formsReplayed.has(caseId)) return;
  formsReplayed.add(caseId);
  const left = takePendingPositionSaves(caseId, "formApplicability");
  if (left) await saveFormApplicabilityQueued(caseId, left, token);
}

/** Saves the person's own choice to the case, after any write to it already on its way. */
export function savePositionQueued(caseId: string, patch: Record<string, unknown>): Promise<boolean> {
  return savePositionQueuedOutcome(caseId, patch).then((outcome) => outcome === "saved");
}

/*
 * AN OLDER RETRY NEVER LANDS OVER A NEWER SAVE (review 2026-10-14). A save
 * that failed is tried once more after a pause; meanwhile the person may have
 * chosen again, and that newer save may already have landed. The retry would
 * then write the older choice last. Each run of saves takes a number from a
 * counter its page keeps; when its retry's turn comes and a newer run has
 * started, the retry is dropped (the newer run carries what is current).
 */
export type SaveGenerations = { current: number };

/** Starts a new run of saves; older runs' retries are dropped from now on. */
export function nextSaveGeneration(generations: SaveGenerations): number {
  generations.current += 1;
  return generations.current;
}

/**
 * One save with one retry after `pauseMs` (plus jitter) if it failed. The
 * retry is dropped -- "superseded" -- when a newer run took a number in the
 * meantime.
 */
export async function saveWithRetryUnlessSuperseded(
  generations: SaveGenerations,
  mine: number,
  attempt: () => Promise<DirectSaveOutcome>,
  pauseMs = 2_000,
): Promise<DirectSaveOutcome | "superseded"> {
  const first = await attempt();
  if (first !== "failed") return first;
  await new Promise((resolve) => setTimeout(resolve, pauseMs + Math.floor(Math.random() * Math.min(500, pauseMs + 1))));
  if (generations.current !== mine) return "superseded";
  return attempt();
}

/*
 * THE STAGE AND THE REST ARE SUPERSEDED SEPARATELY (review 2026-10-14). A
 * stage click supersedes only the stage: a catch-up carrying dates whose
 * first try failed, followed by a click on the same stage within the pause,
 * dropped the whole retry -- and a click that changes nothing does not
 * re-run the catch-up, so the dates were never sent. Now the page keeps two
 * counters: a newer catch-up supersedes an older catch-up's whole retry (it
 * carries everything current); a newer stage save (a click, or a catch-up
 * carrying the stage) supersedes only the stage part of it.
 */
export type PositionGenerations = { stage: number; catchUp: number };

/** The stage counter alone, for saveWithRetryUnlessSuperseded (the stage click's retry). */
export function stageGenerations(generations: PositionGenerations): SaveGenerations {
  return {
    get current() {
      return generations.stage;
    },
    set current(value: number) {
      generations.stage = value;
    },
  };
}

/** The patch without its stage, or null when the stage was all it carried. */
export function withoutStage(patch: Record<string, unknown>): Record<string, unknown> | null {
  const rest = Object.fromEntries(Object.entries(patch).filter(([key]) => key !== "confirmedStage" && key !== "confirmedStageFrom"));
  return Object.keys(rest).length ? rest : null;
}

/** Starts a catch-up run: always a new catch-up number, and a new stage number when it carries the stage. */
export function startCatchUp(generations: PositionGenerations, carriesStage: boolean): PositionGenerations {
  generations.catchUp += 1;
  if (carriesStage) generations.stage += 1;
  return { ...generations };
}

/**
 * A catch-up save with one retry after `pauseMs` if it failed. The retry is
 * dropped when a newer catch-up has started; it is sent without its stage
 * when only a newer stage save has started.
 */
export async function retryCatchUp(
  generations: PositionGenerations,
  mine: PositionGenerations,
  patch: Record<string, unknown>,
  attempt: (patch: Record<string, unknown>) => Promise<DirectSaveOutcome>,
  pauseMs = 2_000,
): Promise<DirectSaveOutcome | "superseded"> {
  const first = await attempt(patch);
  if (first !== "failed") return first;
  await new Promise((resolve) => setTimeout(resolve, pauseMs + Math.floor(Math.random() * Math.min(500, pauseMs + 1))));
  if (generations.catchUp !== mine.catchUp) return "superseded";
  const retry = generations.stage !== mine.stage ? withoutStage(patch) : patch;
  return retry ? attempt(retry) : "superseded";
}

/** Registers a run of saves for this case (with its retries) that a reader of the case must wait for. */
export function trackPositionWork<T>(caseId: string, work: Promise<T>): Promise<T> {
  return track(caseId, work);
}

/**
 * Resolves once every save for this case started on this page so far has
 * finished (or after `maxWaitMs`, so nothing can stop the case opening).
 * Resolves straight away when nothing for this case is on its way. The
 * default covers an ordinary case save followed by its stage save, each a
 * read and a write of a second or two.
 */
export async function positionSavesSettled(caseId: string, maxWaitMs = 15_000): Promise<void> {
  // What an earlier page in this tab left unsaved is sent first, and waited for like any other save.
  replayPendingPositionSaves(caseId);
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
