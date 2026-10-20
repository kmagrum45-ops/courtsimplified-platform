"use client";

import IntakeReviewPanel from "./IntakeReviewPanel";
import { startSignIn } from "./startSignIn";
import { guidanceIsCurrent, inputRevision, reconcileReview, materialInitialFacts, reviewPhase, transitionReview } from "../../src/lib/case-system/intakeReview";
import { IntakeRequest } from "./intakeRequest";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { resetIntakeInBrowser } from "../../src/lib/case-system/storage/resetIntake";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../src/lib/supabase/client";
import { GUEST_INTAKE_SESSION_KEY } from "../../src/lib/case-system/storage/intakeStorageKeys";
import { BASIS_SECTION, discardedFields, discardStale, onStoryChange, storyAnswersOutdated, STORY_TEXT_FIELD, tagAnswers } from "../../src/lib/case-system/storyBasis";
import { migrateStory, storyOf, STORY_INPUT_KEYS, STORY_SECTION, type CaseLocation } from "../../src/lib/case-system/intakeStory";
import { adoptStored, checkpointMatches, createCheckpointCase, intakeId, loadCheckpointCase, readCheckpoint, readIntakeSession, record, saveCheckpoint, saveReviewTransition, writeIntakeSession, type Checkpoint, type CheckpointRow, type IntakeCourt } from "../../src/lib/case-system/intakeCheckpoint";

async function readAuthSession() {
  const request = new IntakeRequest();
  const result = await request.run(() => supabase.auth.getSession(), 10_000);
  if (!result || result.error) throw new Error("Your account could not be checked. Reconnect and retry; your pending text remains in this tab.");
  return result;
}

export type ContinueKey = "form" | "guided" | "choose" | "family" | "civil";
export type ReviewView = { checkpoint: Checkpoint; workflowStatus: Record<string, unknown> };
type Recovery = {
  begin: (signal?: AbortSignal) => Promise<void>;
  subscribeField: (section: string, field: string, listener: () => void) => () => void;
  subscribe: (listener: () => void) => () => void;
  getReview: () => ReviewView;
  transition: (action: "review" | "collect" | "confirm", expectedInput: string) => Promise<void>;
  /** Each route registers the action that turns its confirmed answers into guidance. */
  registerContinue: (key: ContinueKey, handler: () => void) => () => void;
  /** The review panel's Continue: runs the open route's guidance action. */
  continueToGuidance: () => boolean;
  /** "Start the questions again": answers based on an earlier version of the story are emptied, in every area (storyBasis.ts). */
  discardStaleAnswers: () => void;
  /** "Go to the questions": opens this area's questions and scrolls to them. */
  openQuestions: () => void;
  read: (section: string, key: string) => unknown;
  /** `fromReview`: an edit made in the review panel (see reconcileReview). */
  put: (section: string, key: string, value: unknown, touched?: boolean, external?: boolean, fromReview?: boolean) => void;
  flush: (signal?: AbortSignal) => Promise<void>;
  validate: (signal?: AbortSignal) => Promise<void>;
  getCaseId: () => string | null;
  flowId: string;
  ownerId: string | null;
  resuming: boolean;
  row: CheckpointRow | null;
};
const Context = createContext<Recovery | null>(null);
export const useIntakeRecovery = () => useContext(Context);

export function useIntakeReviewView() {
  const recovery = useIntakeRecovery();
  return useSyncExternalStore(recovery?.subscribe ?? (() => () => {}), recovery?.getReview ?? (() => null), () => null);
}

/** Initial questions can run; full analysis must wait for the explicit review action. */
export function usePrepareCaseGuidance() {
  const recovery = useIntakeRecovery();
  return useCallback(async () => {
    if (!recovery) return false;
    await recovery.flush();
    const view = recovery.getReview();
    // Every route's guidance passes here: none is built from questions that read an earlier story.
    if (storyAnswersOutdated(view.checkpoint)) {
      document.querySelector('[data-testid="intake-review"]')?.scrollIntoView({ behavior: "auto", block: "start" });
      return false;
    }
    if (reviewPhase(view.workflowStatus, view.checkpoint) !== "user-confirmed") {
      await recovery.transition("review", inputRevision(view.checkpoint));
      document.querySelector('[data-testid="intake-review"]')?.scrollIntoView({ behavior: "auto", block: "start" });
      return false;
    }
    // A guest who confirmed reaches guidance too (site owner, 2026-10-18); their
    // confirmation lives in this tab, and the server serves guests without a case.
    return true;
  }, [recovery]);
}

export function intakeGuidanceHeaders(recovery: Recovery | null): Record<string, string> {
  const caseId = recovery?.getCaseId();
  return caseId && recovery ? { "x-courtsimplified-case-id": caseId, "x-courtsimplified-input-revision": inputRevision(recovery.getReview().checkpoint) } : {};
}

/** The existing case row is authoritative; this boundary connects unfinished UI fields to it. */
export function IntakeRecoveryBoundary({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const path = params.get("path");
  const caseId = params.get("caseId");
  const flow = params.get("intake");
  if (path !== "small-claims" && path !== "family" && path !== "civil") return <>{children}</>;
  return <RecoveryProvider key={`${path}:${caseId ?? ""}:${flow ?? ""}`} court={path} selectedId={caseId} requestedFlow={flow}>{children}</RecoveryProvider>;
}

function RecoveryProvider({ court, selectedId, requestedFlow, children }: { court: IntakeCourt; selectedId: string | null; requestedFlow: string | null; children: ReactNode }) {
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [notice, setNotice] = useState("Opening your intake…");
  const [failed, setFailed] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // An unsaved intake in this tab that a new one would overwrite (re-test 2026-10-18).
  const [unsaved, setUnsaved] = useState<{ court: IntakeCourt; flowId: string; signedIn: boolean } | null>(null);
  const discardAllowed = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    let active = true;
    let identity: string | null | undefined;
    let disposeStore = () => {};
    async function initialize(ownerId: string | null) {
      const epoch = ++generation.current;
      disposeStore();
      setRecovery(null);
      setFailed(false);
      setConflict(false);
      const current = () => active && epoch === generation.current;
      try {
        if ((selectedId && !intakeId(selectedId)) || (requestedFlow && !intakeId(requestedFlow))) throw new Error("This intake address is invalid. Please open the selected case from your account.");
        if (selectedId && !ownerId) throw new Error("Sign in to the account that owns this case to continue.");
        const flowId = selectedId || requestedFlow || crypto.randomUUID();
        const session = readIntakeSession(sessionStorage, flowId, ownerId, court);
        const row = ownerId && (selectedId || requestedFlow) ? await loadCheckpointCase(supabase, selectedId || flowId, ownerId, court) : null;
        if (!current()) return;
        if (selectedId && !row) throw new Error("The selected case is unavailable for this account or court. No other case has been opened.");
        if (requestedFlow && !row && !session) throw new Error("This intake is not available in this tab or account. Open your saved case, or start a new intake.");
        // A guest intake brought in at sign-in only ever creates a new case (guestCarry.ts).
        if (session?.carried && row) throw new Error("This intake was brought into your account when you signed in, and it is never added to a case you already have. Your saved cases were not changed; start a new intake to continue.");
        if (session?.caseId && !row) throw new Error("The selected saved intake could not be found. No other case has been opened.");
        const saved = readCheckpoint(row?.master_result.intakeCheckpoint, court, flowId);
        if (row?.master_result.intakeCheckpoint && !saved) throw new Error("This case has an incompatible intake checkpoint. No other case has been opened.");
        let serverRevision = saved?.revision ?? null;
        const initialConflict = Boolean(session && row && session.serverRevision !== serverRevision && session.checkpoint.revision !== serverRevision);
        let snapshot: Checkpoint = session?.checkpoint ?? saved ?? { version: 1, flowId, courtPath: court, revision: crypto.randomUUID(), sections: {} };
        snapshot = JSON.parse(JSON.stringify(snapshot)) as Checkpoint;
        snapshot.inputRevision ??= snapshot.revision;
        // One copy of the story: older checkpoints move theirs into sections.story once, here.
        const unmigrated = snapshot;
        snapshot = migrateStory(snapshot);
        const migrated = snapshot !== unmigrated;
        if (migrated) snapshot = { ...snapshot, revision: crypto.randomUUID() };
        let workflowStatus = ownerId ? record(row?.master_result.workflowStatus) : session?.workflowStatus ?? { intakeCompleted: false };
        let view: ReviewView = { checkpoint: snapshot, workflowStatus };
        const listeners = new Set<() => void>();
        const fieldListeners = new Map<string, Set<() => void>>();
        const emit = () => { view = { checkpoint: snapshot, workflowStatus }; listeners.forEach(listener => listener()); };
        let acknowledgedInput = inputRevision(snapshot);
        const leases = new WeakMap<AbortSignal, string>();
        const guided = snapshot.sections.guided;
        if (guided?.started && !guided.currentQuestion && !guided.proposalDrafts && !guided.intakeComplete && !guided.depthActive) guided.started = false;
        const sourced = snapshot.sections.sourced;
        if (sourced?.state === "loading") { sourced.state = Array.isArray(sourced.questions) && sourced.questions.length ? "ready" : "idle"; sourced.askedFor = ""; }
        if (!requestedFlow && !selectedId) {
          // Import only the existing, read-once hand-off. A fresh URL never loads an old draft.
          const legacy = record(JSON.parse(sessionStorage.getItem(GUEST_INTAKE_SESSION_KEY) || "null"));
          if (legacy.version !== 2 && legacy.courtPath === court && typeof legacy.facts === "string" && typeof legacy.city === "string") {
            snapshot.sections[STORY_SECTION] = { text: legacy.facts, location: { province: "Ontario", city: legacy.city } };
          }
          // This tab holds one intake. Starting another would overwrite an unsaved one
          // (a guest's, or text not yet saved to the account): ask first.
          const held = readHeldIntake(ownerId);
          if (held && !discardAllowed.current) { setUnsaved(held); setNotice("You have an unsaved case in this tab."); return; }
          discardAllowed.current = false;
          if (!ownerId && window.location.pathname === "/") resetIntakeInBrowser();
          if (!writeIntakeSession(sessionStorage, { version: 2, ownerId, caseId: null, serverRevision: null, checkpoint: snapshot })) throw new Error("This tab cannot retain intake text. Please enable session storage before continuing.");
          const url = new URL(window.location.href);
          url.searchParams.set("intake", flowId);
          window.history.replaceState(null, "", `${url.pathname}?${url.searchParams}`);
          return;
        }
        const address = new URL(window.location.href);
        const step = snapshot.sections.builder?.step;
        if (address.pathname === "/builder" && address.searchParams.get("step") === "results") {
          // Preserve the existing completed-case route; an interrupted unsaved analysis resumes intake.
          const pending = Boolean(session && session.checkpoint.revision !== serverRevision);
          if (row && guidanceIsCurrent(row.master_result, court, row.id) && !pending && !initialConflict) {
            window.location.replace(`/cases/${encodeURIComponent(row.id)}`);
            return;
          }
          if (step === "form" || step === "guided") address.searchParams.set("step", step);
          else address.searchParams.delete("step");
          window.history.replaceState(null, "", `${address.pathname}?${address.searchParams}`);
        }
        if (address.pathname === "/builder" && !address.searchParams.has("step") && (step === "form" || step === "guided")) {
          address.searchParams.set("step", step);
          window.history.replaceState(null, "", `${address.pathname}?${address.searchParams}`);
        }
        let caseId = row?.id ?? null;
        let dirty = migrated || Boolean(session && session.checkpoint.revision !== serverRevision);
        let timer: ReturnType<typeof setTimeout> | undefined;
        let flight: Promise<void> | null = null;
        const invalid = new Set<string>();
        // `pending`: something entered here has not reached the account (still saving,
        // a failed save, or no case created yet). Default values a form writes are not.
        const cache = () => writeIntakeSession(sessionStorage, { version: 2, ownerId, caseId, serverRevision, checkpoint: snapshot, ...(!ownerId ? { workflowStatus } : { pending: dirty || !caseId, ...(session?.carried && !caseId ? { carried: true } : {}) }) });
        const failure = (message: string) => { if (current()) { setFailed(true); setNotice(message); } };
        const flush = async (signal?: AbortSignal): Promise<void> => {
          signal?.throwIfAborted();
          // Let a discrete input event commit its last state and effects before taking the snapshot.
          await new Promise((resolve) => setTimeout(resolve, 0));
          if (!current()) throw new Error("The intake account or case changed. Please retry in the current case.");
          if (invalid.size) throw new Error("Your latest text is too large to save. Copy it before leaving and shorten it before continuing.");
          if (flight) { await flight; if (dirty) return flush(signal); return; }
          clearTimeout(timer);
          if (!cache()) { failure("This tab could not retain your latest text. Copy it before leaving and retry saving."); throw new Error("Your intake has not been saved. Your text is still on this page."); }
          if (!ownerId) return;
          const work = async () => {
            const { data: { session: auth } } = await readAuthSession();
            if (!current() || auth?.user.id !== ownerId) throw new Error("Sign in again to the same account before saving. Your pending text remains in this tab.");
            signal?.throwIfAborted();
            const sent = snapshot;
            let savedInput = inputRevision(sent);
            if (caseId && sent.revision === serverRevision) { dirty = false; return; }
            setNotice("Saving intake…");
            if (!caseId) {
              await createCheckpointCase(supabase, ownerId, sent);
              if (!current()) throw new Error("The account changed while saving.");
              caseId = sent.flowId;
              workflowStatus = { intakeCompleted: false, intakeReview: { version: 1 } };
            } else {
              // The saved record follows this tab: an edit made while reviewing stays in review.
              const outcome = await saveCheckpoint(supabase, ownerId, caseId, sent, serverRevision, current, inputRevision(sent) !== acknowledgedInput, reviewPhase(workflowStatus, sent) === "reviewing");
              if (!outcome.ok && !(outcome.reason === "rejected" && outcome.error === "intake-unchanged")) {
                if (!outcome.ok && outcome.error === "intake-conflict") { setConflict(true); throw new Error("Another tab changed this intake. Your pending text is retained here; open the saved case in a new tab before resolving the difference."); }
                throw new Error("Your intake could not be saved. Your pending text remains in this tab. Please retry before continuing.");
              }
              if (outcome.ok) {
                workflowStatus = record(outcome.master.workflowStatus);
                const committed = readCheckpoint(outcome.master.intakeCheckpoint, court, caseId);
                if (committed) savedInput = inputRevision(committed);
                if (committed && inputRevision(snapshot) === inputRevision(sent) && inputRevision(committed) !== inputRevision(sent)) snapshot = { ...snapshot, inputRevision: inputRevision(committed) };
              }
            }
            if (!current()) return;
            acknowledgedInput = savedInput;
            if (inputRevision(snapshot) !== acknowledgedInput) workflowStatus = reconcileReview(view.workflowStatus, view.checkpoint, snapshot);
            emit();
            serverRevision = sent.revision;
            dirty = snapshot.revision !== sent.revision;
            cache();
            setFailed(false);
            setNotice(dirty ? "Newer answers are waiting to save…" : "Intake saved to your account.");
          };
          flight = work().catch((error: unknown) => { failure(error instanceof Error && !["TypeError", "SyntaxError"].includes(error.name) ? error.message : "Your intake could not be saved. Please retry."); throw error; }).finally(() => { flight = null; });
          await flight;
          signal?.throwIfAborted();
          if (dirty) await flush(signal);
        };
        const continueHandlers = new Map<ContinueKey, () => void>();
        let pendingContinue: ContinueKey | null = null;
        /** True when a route took it now; false when it waits for that route to appear. */
        const runContinue = (key: ContinueKey): boolean => {
          const handler = continueHandlers.get(key);
          if (handler) { pendingContinue = null; handler(); return true; }
          pendingContinue = key;
          return false;
        };
        const store: Recovery = {
          discardStaleAnswers: () => {
            if (!current()) return;
            const fields = discardedFields(snapshot);
            const next = { ...discardStale(snapshot), revision: crypto.randomUUID() };
            if (materialInitialFacts(next) !== materialInitialFacts(snapshot)) { next.inputRevision = next.revision; workflowStatus = reconcileReview(workflowStatus, snapshot, next); }
            snapshot = next;
            for (const [section, key] of fields) fieldListeners.get(`${section}:${key}`)?.forEach(listener => listener());
            emit();
            dirty = true;
            if (!cache()) failure("This tab could not retain your pending text. Copy it before leaving and retry saving.");
            if (ownerId) { clearTimeout(timer); timer = setTimeout(() => { void flush().catch(() => {}); }, 400); }
          },
          openQuestions: () => {
            if (court === "small-claims") {
              const url = new URL(window.location.href);
              url.searchParams.set("step", "guided");
              window.history.pushState(null, "", `${url.pathname}?${url.searchParams}`);
            } else store.put(court, "mode", "chat", false, true);
            // After the questions have rendered: scroll to them.
            window.setTimeout(() => [...document.querySelectorAll<HTMLElement>('[data-testid="questions-story-changed"], [data-testid="guided-reading-outdated"], [data-testid="guided-form-chat"]')].find((element) => element.offsetParent !== null)?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
          },
          registerContinue: (key, handler) => {
            continueHandlers.set(key, handler);
            // A Continue pressed before this route mounted (Small Claims chooser -> form) runs now.
            if (pendingContinue === key) runContinue(key);
            return () => { if (continueHandlers.get(key) === handler) continueHandlers.delete(key); };
          },
          continueToGuidance: () => {
            // Never a next step from questions that read an earlier story, on any route.
            if (storyAnswersOutdated(snapshot)) return false;
            if (court !== "small-claims") return runContinue(court);
            // The route on screen is the address bar's; the saved step lags behind Back/Forward.
            const step = new URL(window.location.href).searchParams.get("step");
            return runContinue(step === "guided" ? "guided" : step === "form" ? "form" : "choose");
          },
          begin: async signal => { await flush(signal); signal?.throwIfAborted(); if (signal) leases.set(signal, inputRevision(snapshot)); },
          subscribeField: (section, field, listener) => {
            const key = `${section}:${field}`;
            const group = fieldListeners.get(key) ?? new Set<() => void>();
            fieldListeners.set(key, group); group.add(listener);
            return () => { group.delete(listener); };
          },
          subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
          getReview: () => view,
          transition: async (action, expectedInput) => {
            await flush();
            if (!current() || inputRevision(snapshot) !== expectedInput) throw new Error("Your initial facts changed. Review them again before confirming.");
            if (ownerId && caseId) {
              const result = await saveReviewTransition(supabase, ownerId, caseId, snapshot, action, expectedInput, current);
              if (!result.ok) { failure("Your review could not be saved. Your answers remain here; retry before continuing."); throw new Error("Review was not saved. Please retry."); }
              if (!current()) return;
              workflowStatus = record(result.master.workflowStatus);
              if (inputRevision(snapshot) !== expectedInput) {
                workflowStatus = reconcileReview(view.workflowStatus, view.checkpoint, snapshot);
                emit(); cache();
                throw new Error("Initial information changed while saving. Review the current information again.");
              }
            } else workflowStatus = transitionReview(workflowStatus, snapshot, action, expectedInput, new Date().toISOString());
            if (!current()) return;
            if (!cache()) { workflowStatus = view.workflowStatus; failure("Your review could not be retained in this tab. Copy your text before leaving."); throw new Error("Review was not retained. Please retry."); }
            emit();
          },
          ownerId, flowId: snapshot.flowId, resuming: Boolean(session || saved), row,
          getCaseId: () => caseId,
          read: (section, key) => snapshot.sections[section]?.[key],
          put: (section, key, value, touched = true, external = false, fromReview = false) => {
            if (!current()) return;
            const field = `${section}:${key}`;
            const json = JSON.stringify(value instanceof Set ? [...value] : value);
            if (json === undefined) return;
            const encoded: unknown = JSON.parse(json);
            if (JSON.stringify(snapshot.sections[section]?.[key]) === JSON.stringify(encoded)) { invalid.delete(field); return; }
            let sections: Checkpoint["sections"] = { ...snapshot.sections, [section]: { ...snapshot.sections[section], [key]: encoded } };
            // One record of which story each answer was based on (storyBasis.ts).
            const storyChanged = field === STORY_TEXT_FIELD;
            if (storyChanged) sections = onStoryChange(sections);
            // Only what the person enters or confirms is an answer; a form registering its defaults is not.
            if (touched) sections[BASIS_SECTION] = tagAnswers(sections, section, key, snapshot.sections[section]?.[key], encoded);
            const next = { ...snapshot, revision: crypto.randomUUID(), sections };
            if (touched && materialInitialFacts(next) !== materialInitialFacts(snapshot)) { next.inputRevision = next.revision; workflowStatus = reconcileReview(workflowStatus, snapshot, next, fromReview); }
            if (!readCheckpoint(next, court)) { invalid.add(field); dirty = true; emit(); failure("This intake is too large to save together. Nothing has been removed; copy your text before leaving."); return; }
            invalid.delete(field);
            snapshot = next;
            if (external) fieldListeners.get(field)?.forEach(listener => listener());
            if (storyChanged) for (const cleared of ["home:understoodAnswers", "home:draftAnswers", "form-chat:drafts"]) fieldListeners.get(cleared)?.forEach(listener => listener());
            emit();
            if (touched) dirty = true;
            if (!cache()) failure("This tab could not retain your pending text. Copy it before leaving and retry saving.");
            if (!touched) return;
            if (ownerId) {
              clearTimeout(timer);
              timer = setTimeout(() => { void flush().catch(() => {}); }, 400);
            }
          },
          flush,
          validate: async (signal) => {
            signal?.throwIfAborted();
            if (signal && leases.has(signal) && leases.get(signal) !== inputRevision(snapshot)) throw new Error("Initial information changed. The outdated AI response was discarded.");
            if (!current()) throw new Error("The intake account or case changed. Please retry.");
            if (flight) await flight;
            if (ownerId && caseId) {
              const matches = await checkpointMatches(supabase, caseId, ownerId, court, serverRevision);
              if (!current()) throw new Error("The intake account or case changed. Please retry.");
              if (!matches) {
                setConflict(true);
                const message = "Another tab changed this intake. The older AI response was discarded; your pending text remains here.";
                failure(message);
                throw new Error(message);
              }
            }
            signal?.throwIfAborted();
          },
        };
        const interruption = () => { if (dirty && current()) void flush().catch(() => {}); };
        const navigate = (event: MouseEvent) => {
          if (!ownerId || !dirty || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
          if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
          const target = new URL(anchor.href);
          if (target.origin !== window.location.origin || target.href === window.location.href) return;
          event.preventDefault();
          event.stopPropagation();
          void flush().then(() => { if (current()) window.location.assign(target.href); }).catch(() => {});
        };
        const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty && ownerId) { event.preventDefault(); } };
        document.addEventListener("click", navigate, true);
        window.addEventListener("pagehide", interruption);
        window.addEventListener("beforeunload", beforeUnload);
        document.addEventListener("visibilitychange", interruption);
        window.addEventListener("online", interruption);
        disposeStore = () => {
          clearTimeout(timer);
          document.removeEventListener("click", navigate, true);
          window.removeEventListener("pagehide", interruption);
          window.removeEventListener("beforeunload", beforeUnload);
          document.removeEventListener("visibilitychange", interruption);
          window.removeEventListener("online", interruption);
        };
        if (!cache()) failure("This tab cannot retain your pending intake text. Copy it before leaving.");
        else setNotice(ownerId ? (dirty ? "Pending answers recovered in this tab. Saving…" : caseId ? "Intake saved to your account." : "Answers will be saved to your account as you type.") : "Guest progress stays in this tab only. Seeing your next steps needs a free account; sign in from here and what you entered comes with you.");
        setRecovery(store);
        if (initialConflict) { setConflict(true); failure("Another tab changed this intake. Your pending text is shown here for you to copy. Open the saved case separately before resolving the difference."); }
        else if (dirty && ownerId) void flush().catch(() => {});
      } catch (error) { if (current()) { setFailed(true); setNotice(error instanceof Error && !["TypeError", "SyntaxError"].includes(error.name) ? error.message : "Your intake could not be opened. Please retry."); } }
    }
    void readAuthSession().then(({ data, error }) => {
      if (!active || identity !== undefined) return; // A newer auth event already chose this account.
      if (error) { setFailed(true); setNotice("Your account could not be checked. Reconnect and retry before continuing."); return; }
      identity = data.session?.user.id ?? null;
      void initialize(identity);
    }).catch(() => { if (active && identity === undefined) { setFailed(true); setNotice("Your account could not be checked. Reconnect and retry before continuing."); } });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      const next = session?.user.id ?? null;
      if (identity === next) return; // Token refresh and tab focus must not reset answers.
      identity = next;
      void initialize(next);
    });
    return () => { active = false; disposeStore(); listener.subscription.unsubscribe(); };
  }, [court, selectedId, requestedFlow, attempt]);

  const here = typeof window === "undefined" ? "/builder" : `${window.location.pathname}${window.location.search}`;
  if (unsaved) return <div className="mx-auto max-w-3xl px-6 py-8" role="alertdialog" aria-labelledby="unsaved-case-heading" data-testid="unsaved-case-warning">
    <h2 id="unsaved-case-heading" className="text-xl font-bold">You have an unsaved case in this tab</h2>
    <p className="mt-2">Starting a new case here will discard what you have entered so far. {unsaved.signedIn ? "Some of it has not reached your account yet (it may still be saving, or a save did not go through); open it to save it" : "It is not saved to an account"}{unsaved.court !== court ? `, and it is a ${unsaved.court === "small-claims" ? "Small Claims" : unsaved.court === "family" ? "Family" : "Civil"} case` : ""}.</p>
    <div className="mt-4 flex flex-wrap gap-3">
      <a data-testid="unsaved-case-keep" className="rounded bg-[#2f7d67] px-4 py-2 text-white" href={`/builder?path=${unsaved.court}&intake=${unsaved.flowId}`}>Keep working on it</a>
      <button data-testid="unsaved-case-discard" type="button" className="rounded border px-4 py-2" onClick={() => { discardAllowed.current = true; setUnsaved(null); setAttempt((value) => value + 1); }}>Discard it and start a new case</button>
    </div>
  </div>;
  return <Context.Provider value={recovery}>
    <div className="mx-auto max-w-6xl px-6 py-3 text-sm" role={failed ? "alert" : "status"} data-testid="intake-save-status">
      {notice}{" "}
      {failed && <button type="button" className="underline" onClick={() => recovery ? void recovery.flush().catch(() => {}) : setAttempt((value) => value + 1)}>Retry saving intake</button>}{" "}
      {(recovery || failed) && (!recovery?.ownerId || failed) && <a className="underline" href={`/login?next=${encodeURIComponent(here)}`} onClick={(event) => { event.preventDefault(); startSignIn(); }}>{recovery && !recovery.ownerId ? "Sign in or create a free account (what you entered comes with you)" : "Sign in for account recovery"}</a>}
      {conflict && recovery?.getCaseId() && <a className="underline" href={`/builder?path=${court}&caseId=${recovery.getCaseId()}`} target="_blank" rel="noopener noreferrer">Open the saved intake separately</a>}
      {!recovery && failed && <> · <a className="underline" href={`/builder?path=${court}`}>Start a new intake</a></>}
    </div>
    {recovery && <IntakeReviewPanel />}
    {recovery ? children : null}
  </Context.Provider>;
}

/** Existing component state remains the live UI; only its recoverable fields are checkpointed. */
/** `shared`: other components read this same field, so every write is announced to them. */
export function useIntakeState<T>(section: string, field: string, initial: T | (() => T), shared = false): [T, Dispatch<SetStateAction<T>>] {
  const recovery = useIntakeRecovery();
  const [value, setValue] = useState<T>(() => adoptStored(recovery?.read(section, field), typeof initial === "function" ? (initial as () => T)() : initial));
  useEffect(() => {
    if (!recovery) return;
    return recovery.subscribeField(section, field, () => {
      const stored = recovery.read(section, field);
      if (stored === undefined) return;
      setValue(current => {
        const next = current instanceof Set && Array.isArray(stored) ? new Set(stored) : stored;
        return JSON.stringify(current instanceof Set ? [...current] : current) === JSON.stringify(stored) ? current : next as T;
      });
    });
  }, [recovery, section, field]);
  const first = useRef(true);
  useEffect(() => {
    if (!recovery) { first.current = false; return; }
    if (first.current) {
      first.current = false;
      /*
       * THE FIRST REGISTRATION NEVER OVERWRITES. Between React showing the page
       * and this component subscribing, a write can land in the store (a
       * correction typed into the review panel just after a reload). This
       * component then still holds the value it read before, and registering it
       * would silently put the old text back under a confirmation that no longer
       * matches it (CI, PR #463, 2026-10-18). It adopts the stored value instead.
       */
      const stored = adoptStored(recovery.read(section, field), value);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- adopting the external store's value once, on first mount, is the point
      if (JSON.stringify(stored instanceof Set ? [...stored] : stored) !== JSON.stringify(value instanceof Set ? [...value] : value)) { setValue(stored); return; }
      recovery.put(section, field, value, false, shared);
      return;
    }
    recovery.put(section, field, value, true, shared);
  }, [recovery, section, field, value, shared]);
  return [value, setValue];
}

export function useIntakeRef<T>(section: string, field: string, initial: T) {
  const recovery = useIntakeRecovery();
  const [restored] = useIntakeState(section, field, initial);
  const reference = useRef(restored);
  useEffect(() => recovery?.subscribeField(section, field, () => {
    reference.current = recovery.read(section, field) as T;
  }), [recovery, section, field]);
  useEffect(() => { recovery?.put(section, field, reference.current, false); });
  return reference;
}

export function useBeforeIntakeAI() {
  const recovery = useIntakeRecovery();
  return useCallback(async (signal?: AbortSignal) => { await recovery?.begin(signal); signal?.throwIfAborted(); }, [recovery]);
}

export function useValidateIntakeResponse() {
  const recovery = useIntakeRecovery();
  return useCallback(async (signal?: AbortSignal) => { await recovery?.validate(signal); signal?.throwIfAborted(); }, [recovery]);
}

/** The person's story: the one copy every screen reads and every edit writes. */
export function useStory(): [string, Dispatch<SetStateAction<string>>] {
  return useIntakeState(STORY_SECTION, "text", "", true);
}

/** The person's location: one copy, `null` until a city has been entered. */
export function useCaseLocation(): [CaseLocation | null, Dispatch<SetStateAction<CaseLocation | null>>] {
  return useIntakeState<CaseLocation | null>(STORY_SECTION, "location", null, true);
}

type StoryInput = { facts: string; yourCity?: string; yourProvince?: string };
const withoutStory = <T extends StoryInput>(value: T) => Object.fromEntries(Object.entries(value).filter(([key]) => !STORY_INPUT_KEYS.has(key))) as Omit<T, "facts" | "yourCity" | "yourProvince">;

/**
 * A court form's input object whose `facts` (and city) ARE the one story and
 * location. Only the form's own answers are stored under `section.input`; the
 * story is joined in on read and split out on write, so the form keeps its
 * familiar `input.facts` while no second copy exists to go stale.
 */
export function useInputWithStory<T extends StoryInput>(section: string, initial: () => T): [T, Dispatch<SetStateAction<T>>] {
  const [story, setStory] = useStory();
  const [location] = useCaseLocation();
  const [first] = useState(initial);
  const [rest, setRest] = useIntakeState(section, "input", () => withoutStory(first));
  const hasCity = "yourCity" in first;
  // Stable between renders unless a part changes: forms run effects keyed on `input`.
  const value = useMemo(() => ({ ...rest, facts: story, ...(hasCity ? { yourCity: location?.city ?? first.yourCity ?? "", yourProvince: location?.province ?? first.yourProvince ?? "" } : {}) }) as T, [rest, story, location, hasCity, first]);
  const latest = useRef(value);
  useEffect(() => { latest.current = value; }, [value]);
  // A story read from a saved case or hand-off fills an empty story once; it never overwrites one.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (!story.trim() && first.facts.trim()) setStory(first.facts);
  }, [first, setStory, story]);
  const set = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    const resolved = typeof next === "function" ? (next as (current: T) => T)(latest.current) : next;
    if (resolved.facts !== latest.current.facts) setStory(resolved.facts);
    latest.current = resolved;
    setRest(withoutStory(resolved));
  }, [setRest, setStory]);
  return [value, set];
}

/** Registers this route's guidance action for the review panel's Continue; always calls the latest handler. */
export function useContinueHandler(key: ContinueKey, handler: () => void) {
  const recovery = useIntakeRecovery();
  const latest = useRef(handler);
  useEffect(() => { latest.current = handler; }, [handler]);
  useEffect(() => recovery?.registerContinue(key, () => latest.current()), [recovery, key]);
}

/** The intake this tab holds, when it has a story and is not saved to the account. */
function readHeldIntake(ownerId: string | null): { court: IntakeCourt; flowId: string; signedIn: boolean } | null {
  try {
    const value = record(JSON.parse(sessionStorage.getItem(GUEST_INTAKE_SESSION_KEY) || "null"));
    const checkpoint = record(value.checkpoint);
    const court = checkpoint.courtPath;
    if (value.version !== 2 || value.ownerId !== ownerId || (court !== "small-claims" && court !== "family" && court !== "civil") || !intakeId(checkpoint.flowId)) return null;
    // Signed in: held only when something entered has not reached the account. A
    // version check alone counted a form writing its defaults as unsaved text.
    const saved = ownerId !== null && (typeof value.pending === "boolean" ? !value.pending : value.caseId !== null && value.serverRevision === checkpoint.revision);
    const sections = record(checkpoint.sections) as Checkpoint["sections"];
    return !saved && storyOf(migrateStory({ ...(checkpoint as Checkpoint), sections }).sections).trim() ? { court, flowId: checkpoint.flowId as string, signedIn: ownerId !== null } : null;
  } catch { return null; }
}
