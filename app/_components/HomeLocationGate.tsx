"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../src/lib/supabase/client";
import {
  clearCompactBuilderDraft,
  clearGuestIntakeSession,
  loadCompactBuilderDraft,
  saveGuestIntakeSession,
  saveCompactBuilderDraft,
  type BuilderDraftCourtPath,
} from "../../src/lib/case-system/builderDraftStorage";
import { scrollAndFocus } from "./scrollFocus";

const pathLabels: Record<BuilderDraftCourtPath, string> = {
  family: "Family",
  "small-claims": "Small Claims",
  civil: "Civil",
};

/**
 * Below this, the classifier is not confident enough to be worth interrupting
 * the user with. It stays silent and the user's own selection stands.
 */
const SUGGESTION_CONFIDENCE_FLOOR = 0.6;

type CourtPathSuggestion =
  | { kind: "switch-path"; suggestedPath: BuilderDraftCourtPath; reasoning: string }
  | { kind: "out-of-scope"; forumName: string; message: string };

function asCourtPath(value: unknown): BuilderDraftCourtPath | null {
  return value === "family" || value === "small-claims" || value === "civil"
    ? value
    : null;
}

export default function HomeLocationGate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawPath = searchParams.get("path");
  const path: BuilderDraftCourtPath | null = rawPath === "family" || rawPath === "small-claims" || rawPath === "civil" ? rawPath : null;
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [facts, setFacts] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [savedDraft, setSavedDraft] = useState<ReturnType<typeof loadCompactBuilderDraft>>(null);
  const [hydrated, setHydrated] = useState(false);
  const [checking, setChecking] = useState(false);
  const [suggestion, setSuggestion] = useState<CourtPathSuggestion | null>(null);
  const provinceRef = useRef<HTMLSelectElement | null>(null);
  const savedCaseRef = useRef<HTMLDivElement | null>(null);
  const suggestionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    async function hydrate() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      const id = data.user?.id || null;
      setUserId(id);
      setSavedDraft(id ? loadCompactBuilderDraft(localStorage, id) : null);
      setHydrated(true);
    }
    void hydrate();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id || null;
      setUserId(id);
      setSavedDraft(id ? loadCompactBuilderDraft(localStorage, id) : null);
      setProvince("");
      setCity("");
      setFacts("");
      setSuggestion(null);
      if (!id) clearGuestIntakeSession(sessionStorage);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (hydrated && path) scrollAndFocus(savedDraft ? savedCaseRef.current : provinceRef.current);
  }, [hydrated, path, savedDraft]);

  useEffect(() => {
    if (suggestion) scrollAndFocus(suggestionRef.current);
  }, [suggestion]);

  if (!path) return null;
  const isOntarioReady = province === "Ontario" && city.trim().length > 0 && facts.trim().length > 0;

  function resumeSavedCase() {
    if (!savedDraft || !userId) return;
    setProvince(savedDraft.province === "Ontario" ? "Ontario" : "");
    setCity(savedDraft.city);
    setFacts(savedDraft.facts);
    setSavedDraft(null);
  }

  function startNewCase() {
    if (userId) clearCompactBuilderDraft(localStorage, userId);
    setSavedDraft(null);
    setProvince("");
    setCity("");
    setFacts("");
    setSuggestion(null);
    requestAnimationFrame(() => scrollAndFocus(provinceRef.current));
  }

  /** Commits to a path and leaves the gate. Only ever called from a user action. */
  function goToIntake(chosenPath: BuilderDraftCourtPath) {
    const intakeStart = { courtPath: chosenPath, province: "Ontario", city: city.trim(), facts: facts.trim() };
    if (userId) {
      saveCompactBuilderDraft(localStorage, intakeStart, userId);
    } else {
      saveGuestIntakeSession(sessionStorage, intakeStart);
    }
    router.push(`/builder?path=${chosenPath}`);
  }

  /**
   * Reads the story before committing to a court path. The user picked a path
   * from the navigation before writing anything down, so that selection is a
   * guess. When the story points somewhere else we surface it and let the user
   * decide; we never silently reroute, and we never block on this check.
   */
  async function continueToIntake() {
    if (!isOntarioReady || !path || checking) return;

    setChecking(true);
    setSuggestion(null);

    try {
      const response = await fetch("/api/classify-court-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story: facts.trim(), declaredCourtPath: path }),
      });

      if (response.ok) {
        const result = (await response.json()) as {
          primaryPath?: unknown;
          confidence?: unknown;
          reasoning?: unknown;
          outOfScopeForum?: { name?: unknown; redirectMessage?: unknown } | null;
        };

        const confidence = typeof result.confidence === "number" ? result.confidence : 0;

        if (
          result.primaryPath === "out-of-scope" &&
          result.outOfScopeForum &&
          confidence >= SUGGESTION_CONFIDENCE_FLOOR
        ) {
          const forumName = String(result.outOfScopeForum.name || "").trim();
          const message = String(result.outOfScopeForum.redirectMessage || "").trim();

          // Both must be present -- a partial out-of-scope result has nothing
          // useful to show, so it falls through to the normal in-scope intake
          // below rather than showing an empty or half-written message.
          if (forumName && message) {
            setSuggestion({ kind: "out-of-scope", forumName, message });
            setChecking(false);
            return;
          }
        }

        const suggested = asCourtPath(result.primaryPath);

        if (suggested && suggested !== path && confidence >= SUGGESTION_CONFIDENCE_FLOOR) {
          setSuggestion({
            kind: "switch-path",
            suggestedPath: suggested,
            reasoning: String(result.reasoning || "").trim(),
          });
          setChecking(false);
          return;
        }
      }
    } catch {
      // A classification failure must never trap the user on this screen.
    }

    setChecking(false);
    goToIntake(path);
  }

  return (
    <section className="border-y border-[#d9e6df] bg-white" data-testid="court-path-location-gate" tabIndex={-1}>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#2f7d67]">{pathLabels[path]} intake</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#10231f]">Confirm your location before starting this path</h1>
        {!hydrated ? <p className="mt-6 text-sm font-semibold text-[#4d675f]" aria-live="polite">Preparing a private case start…</p> : savedDraft ? <div ref={savedCaseRef} tabIndex={-1} className="mt-6 rounded-3xl border border-[#cde7dc] bg-[#f8fcfa] p-5" data-testid="saved-case-panel"><h2 className="text-lg font-bold text-[#10231f]">Saved case on this device</h2><p className="mt-2 text-sm leading-6 text-[#4d675f]">Resume your saved {pathLabels[savedDraft.courtPath || path]} case, or begin a separate new case.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={resumeSavedCase} className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white">Resume saved case</button><button type="button" onClick={startNewCase} className="rounded-xl border border-[#bdd4ca] bg-white px-5 py-3 text-sm font-semibold text-[#1c473d]">Start a new case</button></div></div> : <div data-testid="court-path-location-gate-ready">
          {!userId && <p className="mt-6 rounded-2xl border border-[#cde7dc] bg-[#f8fcfa] p-4 text-sm text-[#24463d]">You can begin now. Sign in when you want to save and return to this case.</p>}
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="block"><span className="font-semibold text-[#16302b]">Province or territory</span><select ref={provinceRef} aria-label="Province or territory" value={province} onChange={(event) => setProvince(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white px-4 py-3"><option value="">Select province or territory</option><option value="Ontario">Ontario</option><option value="not-sure">Not sure</option><option value="Other">Another province or territory</option></select></label>
            <label className="block"><span className="font-semibold text-[#16302b]">City or municipality</span><input aria-label="City or municipality" value={city} onChange={(event) => setCity(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3" placeholder="City or municipality" /></label>
          </div>
          <label className="mt-5 block"><span className="font-semibold text-[#16302b]">Tell us what happened in your own words</span><textarea aria-label="Tell us what happened in your own words" value={facts} onChange={(event) => { setFacts(event.target.value); setSuggestion(null); }} className="mt-2 min-h-32 w-full rounded-2xl border border-[#d8e6df] px-4 py-3" placeholder="Share the main events, people involved, and what you are trying to resolve." /></label>
          {province && province !== "Ontario" && <div role="alert" className="mt-5 rounded-2xl border border-[#ead9a7] bg-[#fffaf0] p-4 text-sm leading-6 text-[#6e5726]">CourtSimplified is currently an Ontario beta. It cannot start this Ontario court intake until Ontario is explicitly confirmed.</div>}

          {suggestion && suggestion.kind === "switch-path" && (
            <div
              ref={suggestionRef}
              tabIndex={-1}
              role="group"
              aria-label="Court path check"
              data-testid="court-path-suggestion"
              className="mt-6 rounded-3xl border border-[#cde7dc] bg-[#f8fcfa] p-5"
            >
              <h2 className="text-lg font-bold text-[#10231f]">
                This looks like it may be {pathLabels[suggestion.suggestedPath]}, not {pathLabels[path]}
              </h2>
              {suggestion.reasoning && (
                <p className="mt-2 text-sm leading-6 text-[#4d675f]">{suggestion.reasoning}</p>
              )}
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                This is a suggestion based on the words you used, not a decision about your case. You choose which path to continue with, and you can change it later.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  data-testid="court-path-suggestion-accept"
                  onClick={() => goToIntake(suggestion.suggestedPath)}
                  className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white"
                >
                  Switch to {pathLabels[suggestion.suggestedPath]}
                </button>
                <button
                  type="button"
                  data-testid="court-path-suggestion-keep"
                  onClick={() => goToIntake(path)}
                  className="rounded-xl border border-[#bdd4ca] bg-white px-5 py-3 text-sm font-semibold text-[#1c473d]"
                >
                  Keep {pathLabels[path]}
                </button>
              </div>
            </div>
          )}

          {suggestion && suggestion.kind === "out-of-scope" && (
            <div
              ref={suggestionRef}
              tabIndex={-1}
              role="group"
              aria-label="Court path check"
              data-testid="court-path-out-of-scope"
              className="mt-6 rounded-3xl border border-[#ead9a7] bg-[#fffaf0] p-5"
            >
              <h2 className="text-lg font-bold text-[#10231f]">CourtSimplified doesn&apos;t cover this</h2>
              <p className="mt-2 text-sm leading-6 text-[#6e5726]">{suggestion.message}</p>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                This is a suggestion based on the words you used, not a decision about your case. If you believe this belongs in {pathLabels[path]}, you can continue anyway.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  data-testid="court-path-out-of-scope-continue"
                  onClick={() => goToIntake(path)}
                  className="rounded-xl border border-[#bdd4ca] bg-white px-5 py-3 text-sm font-semibold text-[#1c473d]"
                >
                  Continue with {pathLabels[path]} anyway
                </button>
              </div>
            </div>
          )}

          <button type="button" onClick={continueToIntake} disabled={!isOntarioReady || checking} className="mt-6 rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{checking ? "Checking your description…" : `Continue to ${pathLabels[path]} intake`}</button>
        </div>}
      </div>
    </section>
  );
}
