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
  const provinceRef = useRef<HTMLSelectElement | null>(null);
  const savedCaseRef = useRef<HTMLDivElement | null>(null);

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
      if (!id) clearGuestIntakeSession(sessionStorage);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (hydrated && path) scrollAndFocus(savedDraft ? savedCaseRef.current : provinceRef.current);
  }, [hydrated, path, savedDraft]);

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
    requestAnimationFrame(() => scrollAndFocus(provinceRef.current));
  }

  function continueToIntake() {
    if (!isOntarioReady || !path) return;
    const intakeStart = { courtPath: path, province: "Ontario", city: city.trim(), facts: facts.trim() };
    if (userId) {
      saveCompactBuilderDraft(localStorage, intakeStart, userId);
    } else {
      saveGuestIntakeSession(sessionStorage, intakeStart);
    }
    router.push(`/builder?path=${path}`);
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
          <label className="mt-5 block"><span className="font-semibold text-[#16302b]">Tell us what happened in your own words</span><textarea aria-label="Tell us what happened in your own words" value={facts} onChange={(event) => setFacts(event.target.value)} className="mt-2 min-h-32 w-full rounded-2xl border border-[#d8e6df] px-4 py-3" placeholder="Share the main events, people involved, and what you are trying to resolve." /></label>
          {province && province !== "Ontario" && <div role="alert" className="mt-5 rounded-2xl border border-[#ead9a7] bg-[#fffaf0] p-4 text-sm leading-6 text-[#6e5726]">CourtSimplified is currently an Ontario beta. It cannot start this Ontario court intake until Ontario is explicitly confirmed.</div>}
          <button type="button" onClick={continueToIntake} disabled={!isOntarioReady} className="mt-6 rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Continue to {pathLabels[path]} intake</button>
        </div>}
      </div>
    </section>
  );
}
