"use client";

/**
 * Confirms, corrects or rejects the procedural events read out of the intake
 * narrative.
 *
 * WHERE THIS SITS AND WHY. Directly after the case overview and BEFORE the
 * Statement of Claim surface. A user should settle what actually happened
 * before drafting anything from it: the draft is built on the record, so the
 * record is the thing to get right first. It is also the only screen that
 * writes to case_events, and everything downstream — deriveCaseStage, the
 * procedural engine, form routing — reads from there.
 *
 * A CANDIDATE IS NOT AN EVENT. Each row below is a sentence from the user's own
 * story that MIGHT describe a procedural event. The parser does not classify it
 * — it assigns no rule and no type — so the user chooses. Confirming writes a
 * case_events row with source "confirmed-from-narrative" and the sentence kept
 * in narrative_basis, so what was read into their story stays visible.
 *
 * SILENCE IS NOT "NO". A candidate left unanswered stays unanswered forever.
 * There is no expiry, no "dismiss all", and no implicit rejection when the user
 * navigates away — the schema has nowhere to record that they did not answer,
 * and this screen must not invent one. The note at the bottom says so to the
 * user rather than leaving them to guess.
 */

import { useCallback, useEffect, useState } from "react";

import { supabase } from "../../../src/lib/supabase/client";
import {
  CASE_EVENT_TYPES,
  type CaseEventType,
} from "../../../src/lib/case-system/events/caseEventTypes";

type CandidateState = "confirmed" | "dismissed" | "unanswered";

type ResolvedCandidate = {
  transientId: string;
  title: string;
  narrativeBasis: string;
  fingerprint: string;
  state: CandidateState;
  confirmedEventId?: string;
  dismissalId?: string;
};

type Draft = {
  eventType: CaseEventType | "";
  title: string;
  occurredAtRaw: string;
  occurredAtNormalized: string;
  dateCertainty: "exact" | "approximate" | "unknown";
};

function emptyDraft(candidate: ResolvedCandidate): Draft {
  return {
    eventType: "",
    title: candidate.title,
    occurredAtRaw: "",
    occurredAtNormalized: "",
    dateCertainty: "unknown",
  };
}

async function authHeaders(): Promise<Record<string, string> | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }
    : null;
}

export default function EventCandidateSurface({ caseId }: { caseId: string }) {
  const [candidates, setCandidates] = useState<ResolvedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  /**
   * Always reaches the `finally`, whatever the guard does.
   *
   * An earlier version returned early when `caseId` was absent and never
   * cleared `loading`, leaving the surface stuck rendering nothing forever.
   * The lint rule about synchronous setState in an effect is what surfaced it.
   */
  const load = useCallback(async () => {
    try {
      if (!caseId) return;

      const headers = await authHeaders();
      if (!headers) return;

      const response = await fetch(
        `/api/cases/event-candidates?caseId=${encodeURIComponent(caseId)}`,
        { headers },
      );
      const body = response.ok ? await response.json() : null;
      setCandidates(Array.isArray(body?.candidates) ? body.candidates : []);
    } catch {
      setError("The events from your story could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    let active = true;

    // Deferred so the effect does not setState synchronously on mount.
    void (async () => {
      await load();
      if (!active) return;
    })();

    return () => {
      active = false;
    };
  }, [load]);

  const draftFor = (candidate: ResolvedCandidate): Draft =>
    drafts[candidate.fingerprint] ?? emptyDraft(candidate);

  const setDraft = (candidate: ResolvedCandidate, patch: Partial<Draft>) =>
    setDrafts((current) => ({
      ...current,
      [candidate.fingerprint]: { ...draftFor(candidate), ...patch },
    }));

  async function confirm(candidate: ResolvedCandidate) {
    const draft = draftFor(candidate);
    if (!draft.eventType || !draft.title.trim()) {
      setError("Choose what kind of event this was, and give it a short title.");
      return;
    }

    setBusyId(candidate.fingerprint);
    setError("");

    try {
      const headers = await authHeaders();
      if (!headers) return;

      const response = await fetch("/api/cases/events", {
        method: "POST",
        headers,
        body: JSON.stringify({
          caseId,
          eventType: draft.eventType,
          title: draft.title.trim(),
          // The sentence is kept so the user can always see what this came from.
          narrativeBasis: candidate.narrativeBasis,
          source: "confirmed-from-narrative",
          occurredAtRaw: draft.occurredAtRaw || undefined,
          // Only ever a date the user picked. The server rejects prose here.
          occurredAtNormalized: draft.occurredAtNormalized || undefined,
          dateCertainty: draft.dateCertainty,
        }),
      });

      if (response.status === 409) {
        const body = await response.json();
        // The singleton prompt. Not a silent merge and not a silent duplicate —
        // the user says which it is.
        const same = window.confirm(
          `${body.message}\n\n` +
            (body.ruleQuote ? `${body.rule}: "${body.ruleQuote}"\n\n` : "") +
            "OK — this is a correction, replace what I recorded.\n" +
            "Cancel — leave both and I will sort it out.",
        );

        const retry = await fetch("/api/cases/events", {
          method: "POST",
          headers,
          body: JSON.stringify({
            caseId,
            eventType: draft.eventType,
            title: draft.title.trim(),
            narrativeBasis: candidate.narrativeBasis,
            source: "confirmed-from-narrative",
            occurredAtRaw: draft.occurredAtRaw || undefined,
            occurredAtNormalized: draft.occurredAtNormalized || undefined,
            dateCertainty: draft.dateCertainty,
            ...(same
              ? { supersedesEventId: body.existing?.[0]?.id }
              : { acknowledgedCollision: true }),
          }),
        });

        if (!retry.ok) setError("That event could not be recorded.");
      } else if (!response.ok) {
        setError("That event could not be recorded.");
      }

      await load();
    } catch {
      setError("That event could not be recorded.");
    } finally {
      setBusyId(null);
    }
  }

  async function dismiss(candidate: ResolvedCandidate) {
    setBusyId(candidate.fingerprint);
    setError("");

    try {
      const headers = await authHeaders();
      if (!headers) return;

      await fetch("/api/cases/event-candidates", {
        method: "POST",
        headers,
        body: JSON.stringify({
          caseId,
          action: "dismiss",
          narrativeBasis: candidate.narrativeBasis,
        }),
      });
      await load();
    } catch {
      setError("That could not be set aside.");
    } finally {
      setBusyId(null);
    }
  }

  async function restore(candidate: ResolvedCandidate) {
    if (!candidate.dismissalId) return;
    setBusyId(candidate.fingerprint);

    try {
      const headers = await authHeaders();
      if (!headers) return;

      await fetch("/api/cases/event-candidates", {
        method: "POST",
        headers,
        body: JSON.stringify({
          caseId,
          action: "restore",
          dismissalId: candidate.dismissalId,
        }),
      });
      await load();
    } catch {
      setError("That could not be brought back.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return null;
  if (candidates.length === 0) return null;

  const unanswered = candidates.filter((candidate) => candidate.state === "unanswered");
  const decided = candidates.filter((candidate) => candidate.state !== "unanswered");

  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-[#10231f]">Things that may have happened in your case</h2>
      <p className="mt-2 text-sm text-[#4f685f]">
        These are sentences from what you wrote. They might describe steps in the court process.
        Nothing here is recorded on your case until you confirm it, and we have not decided what
        any of them means — that is yours to say.
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          {error}
        </p>
      ) : null}

      <ul className="mt-5 space-y-4">
        {unanswered.map((candidate) => {
          const draft = draftFor(candidate);
          const busy = busyId === candidate.fingerprint;

          return (
            <li
              key={candidate.fingerprint}
              className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5"
            >
              <p className="text-sm italic text-[#24463d]">&ldquo;{candidate.narrativeBasis}&rdquo;</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="font-semibold text-[#10231f]">What kind of step was this?</span>
                  <select
                    value={draft.eventType}
                    onChange={(event) =>
                      setDraft(candidate, { eventType: event.target.value as CaseEventType })
                    }
                    className="mt-1 w-full rounded-xl border border-[#d8e6df] bg-white p-2"
                  >
                    <option value="">Choose…</option>
                    {CASE_EVENT_TYPES.map((definition) => (
                      <option key={definition.type} value={definition.type}>
                        {definition.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm">
                  <span className="font-semibold text-[#10231f]">Short title</span>
                  <input
                    value={draft.title}
                    onChange={(event) => setDraft(candidate, { title: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#d8e6df] bg-white p-2"
                  />
                </label>

                <label className="text-sm">
                  <span className="font-semibold text-[#10231f]">When, in your words</span>
                  <input
                    value={draft.occurredAtRaw}
                    onChange={(event) => setDraft(candidate, { occurredAtRaw: event.target.value })}
                    placeholder="e.g. early March, or the week after I got the letter"
                    className="mt-1 w-full rounded-xl border border-[#d8e6df] bg-white p-2"
                  />
                </label>

                <label className="text-sm">
                  {/*
                    A picker, never a parse. The server refuses a prose date here
                    because "4 March" has no year in it and guessing one would
                    store a guess as a fact.
                  */}
                  <span className="font-semibold text-[#10231f]">
                    The exact date, if you know it
                  </span>
                  <input
                    type="date"
                    value={draft.occurredAtNormalized}
                    onChange={(event) =>
                      setDraft(candidate, {
                        occurredAtNormalized: event.target.value,
                        dateCertainty: event.target.value ? "exact" : "unknown",
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-[#d8e6df] bg-white p-2"
                  />
                  <span className="mt-1 block text-xs text-[#4f685f]">
                    Leave this empty if you are not sure. An approximate date is fine in the box
                    beside it.
                  </span>
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void confirm(candidate)}
                  className="rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-bold text-white disabled:opacity-70"
                >
                  {busy ? "Recording…" : "Record this"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void dismiss(candidate)}
                  className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d] disabled:opacity-70"
                >
                  Not a court step
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {decided.length > 0 ? (
        <div className="mt-6 border-t border-[#e3efe9] pt-4">
          <h3 className="text-sm font-bold text-[#10231f]">Already decided</h3>
          <ul className="mt-2 space-y-2 text-sm text-[#4f685f]">
            {decided.map((candidate) => (
              <li key={candidate.fingerprint} className="flex flex-wrap items-center gap-2">
                <span>
                  {candidate.state === "confirmed" ? "Recorded" : "Set aside"}:{" "}
                  &ldquo;{candidate.narrativeBasis.slice(0, 90)}
                  {candidate.narrativeBasis.length > 90 ? "…" : ""}&rdquo;
                </span>
                {candidate.state === "dismissed" ? (
                  <button
                    type="button"
                    onClick={() => void restore(candidate)}
                    className="text-xs font-semibold text-[#2f7d67] underline"
                  >
                    Bring it back
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-5 text-xs text-[#4f685f]">
        Anything you leave alone stays here. Nothing expires, and not answering is not taken as a
        no.
      </p>
    </section>
  );
}
