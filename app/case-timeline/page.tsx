"use client";

/**
 * The case timeline — what the user has recorded, where that puts the case, and
 * what still needs their attention.
 *
 * WHY THIS PAGE EXISTS. Four finished pieces had no screen: the events list,
 * the derived stage and its basis, the staleness banner, and the contradiction
 * notices. All four were computed, checked and returned by
 * GET /api/cases/events, and nothing rendered any of them. A user could record
 * events and observe none of the consequences.
 *
 * IT RENDERS ONLY WHAT THE API PRODUCES. Every value below — events, all,
 * stage, freshness, freshnessMessage, inconsistencies — comes from one response
 * to one request. Nothing is derived here. That matters because the stage and
 * its basis must agree: a component deriving its own stage could show a label
 * and a reason that contradict each other, and the user would have no way to
 * tell which was wrong.
 *
 * The one exception is the stage LABEL, which is presentation. getStageLabel
 * covers the four real stages; "unknown" is handled explicitly rather than
 * rendered as an empty string.
 */

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { supabase } from "../../src/lib/supabase/client";
import { getStageLabel, type UniversalStage } from "../builder/_components/builderTypes";
import {
  CASE_EVENT_TYPES,
  type CaseEventType,
} from "../../src/lib/case-system/events/caseEventTypes";

type EventRow = {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  occurred_at_raw: string | null;
  occurred_at_normalized: string | null;
  date_certainty: "exact" | "approximate" | "unknown";
  scheduled_for_raw: string | null;
  narrative_basis: string | null;
  source: string;
  supersedes_event_id: string | null;
  retracted_at: string | null;
  created_at: string;
};

type Inconsistency = {
  id: string;
  observation: string;
  rule: string;
  ruleQuote: string;
  options: string[];
  relatedEventIds: string[];
};

type TimelineResponse = {
  events: EventRow[];
  all: EventRow[];
  stage: { stage: string; basis: string[] };
  freshness: { state: string; newEventCount?: number };
  freshnessMessage: string | null;
  inconsistencies: Inconsistency[];
};

type NewEvent = {
  eventType: CaseEventType | "";
  title: string;
  description: string;
  occurredAtRaw: string;
  occurredAtNormalized: string;
};

const EMPTY_NEW_EVENT: NewEvent = {
  eventType: "",
  title: "",
  description: "",
  occurredAtRaw: "",
  occurredAtNormalized: "",
};

async function authHeaders(): Promise<Record<string, string> | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }
    : null;
}

function stageLabel(stage: string): string {
  if (stage === "unknown") return "Not enough recorded to say";
  return getStageLabel(stage as UniversalStage) || "Not enough recorded to say";
}

function whenText(event: EventRow): string {
  if (event.occurred_at_raw && event.date_certainty === "exact") {
    return event.occurred_at_raw;
  }
  if (event.occurred_at_raw) return `${event.occurred_at_raw} (approximate)`;
  return "No date recorded";
}

function CaseTimelineContent() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId") || "";

  const [data, setData] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<NewEvent>(EMPTY_NEW_EVENT);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      if (!caseId) return;

      const headers = await authHeaders();
      if (!headers) {
        setError("Sign in to see your case timeline.");
        return;
      }

      const response = await fetch(`/api/cases/events?caseId=${encodeURIComponent(caseId)}`, {
        headers,
      });

      if (!response.ok) {
        setError("This case's timeline could not be loaded.");
        return;
      }

      setData(await response.json());
    } catch {
      setError("This case's timeline could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function addEvent() {
    if (!draft.eventType || !draft.title.trim()) {
      setError("Choose what kind of step this was, and give it a short title.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const headers = await authHeaders();
      if (!headers) return;

      const body = {
        caseId,
        eventType: draft.eventType,
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        occurredAtRaw: draft.occurredAtRaw.trim() || undefined,
        // Only ever a date the user picked. The server refuses prose here.
        occurredAtNormalized: draft.occurredAtNormalized || undefined,
        dateCertainty: draft.occurredAtNormalized ? "exact" : "unknown",
        source: "user-stated",
      };

      const response = await fetch("/api/cases/events", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (response.status === 409) {
        const collision = await response.json();
        const isCorrection = window.confirm(
          `${collision.message}\n\n` +
            (collision.ruleQuote ? `${collision.rule}: "${collision.ruleQuote}"\n\n` : "") +
            "OK — it is a correction, replace what I recorded.\n" +
            "Cancel — it is something else, record both.",
        );

        const retry = await fetch("/api/cases/events", {
          method: "POST",
          headers,
          body: JSON.stringify({
            ...body,
            ...(isCorrection
              ? { supersedesEventId: collision.existing?.[0]?.id }
              : { acknowledgedCollision: true }),
          }),
        });

        if (!retry.ok) {
          setError("That event could not be recorded.");
          return;
        }
      } else if (!response.ok) {
        setError("That event could not be recorded.");
        return;
      }

      setDraft(EMPTY_NEW_EVENT);
      setAdding(false);
      await load();
    } catch {
      setError("That event could not be recorded.");
    } finally {
      setSaving(false);
    }
  }

  if (!caseId) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p className="text-sm text-[#4f685f]">Open this page from a case to see its timeline.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p className="text-sm text-[#4f685f]">Loading…</p>
      </main>
    );
  }

  const events = data?.events ?? [];
  const superseded = (data?.all ?? []).filter(
    (event) => !events.some((live) => live.id === event.id),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-[#10231f]">Your case timeline</h1>
      <p className="mt-2 text-sm text-[#4f685f]">
        What you have recorded about the steps in your case, and what that means for where things
        stand.
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          {error}
        </p>
      ) : null}

      {/* Staleness. Never a recompute — the user decides. */}
      {data?.freshnessMessage ? (
        <section className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-950">{data.freshnessMessage}</p>
          <Link
            href={`/builder?caseId=${encodeURIComponent(caseId)}&path=small-claims`}
            className="mt-3 inline-block rounded-full bg-[#2f7d67] px-4 py-2 text-sm font-bold text-white"
          >
            Update the analysis
          </Link>
        </section>
      ) : null}

      {/* Stage, with the reason. Both from one response, so they agree. */}
      <section className="mt-6 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#4f685f]">
          Where the case is
        </p>
        <p className="mt-1 text-lg font-bold text-[#10231f]">
          {stageLabel(data?.stage.stage ?? "unknown")}
        </p>

        {data?.stage.basis.length ? (
          <ul className="mt-3 space-y-1 text-sm text-[#4f685f]">
            {data.stage.basis.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[#4f685f]">
            Nothing recorded yet says where the case is. Recording the steps below will change
            that.
          </p>
        )}
      </section>

      {/* Contradictions. Surfaced, never resolved. */}
      {data?.inconsistencies.length ? (
        <section className="mt-6 space-y-3">
          {data.inconsistencies.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[#d8e6df] bg-white p-5"
            >
              <p className="text-sm text-[#24463d]">{item.observation}</p>
              <p className="mt-2 text-xs text-[#4f685f]">
                {item.rule}: &ldquo;{item.ruleQuote}&rdquo;
              </p>
              <ul className="mt-3 space-y-1 text-sm text-[#4f685f]">
                {item.options.map((option) => (
                  <li key={option}>• {option}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      {/* The events. */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-[#10231f]">What you have recorded</h2>
          {!adding ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-bold text-white"
            >
              Add something that happened
            </button>
          ) : null}
        </div>

        {adding ? (
          <div className="mt-4 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
            <p className="text-sm text-[#4f685f]">
              Record a step in your case. We do not decide what it was — you choose.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="font-semibold text-[#10231f]">What kind of step was this?</span>
                <select
                  value={draft.eventType}
                  onChange={(event) =>
                    setDraft({ ...draft, eventType: event.target.value as CaseEventType })
                  }
                  className="mt-1 w-full rounded-xl border border-[#d8e6df] bg-white p-2"
                >
                  <option value="">Choose…</option>
                  {/*
                    Rendered in CASE_EVENT_TYPES order, which puts
                    other-user-described FIRST. That position is a design
                    constraint, not an accident: a user meets it before they
                    start fitting their event to the closest wrong rule.
                  */}
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
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#d8e6df] bg-white p-2"
                />
              </label>

              <label className="text-sm">
                <span className="font-semibold text-[#10231f]">When, in your words</span>
                <input
                  value={draft.occurredAtRaw}
                  onChange={(event) => setDraft({ ...draft, occurredAtRaw: event.target.value })}
                  placeholder="e.g. a couple of weeks ago"
                  className="mt-1 w-full rounded-xl border border-[#d8e6df] bg-white p-2"
                />
              </label>

              <label className="text-sm">
                <span className="font-semibold text-[#10231f]">
                  The exact date, if you know it
                </span>
                <input
                  type="date"
                  value={draft.occurredAtNormalized}
                  onChange={(event) =>
                    setDraft({ ...draft, occurredAtNormalized: event.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-[#d8e6df] bg-white p-2"
                />
                <span className="mt-1 block text-xs text-[#4f685f]">
                  Leave this empty if you are not sure. Not knowing the date is a complete
                  answer.
                </span>
              </label>
            </div>

            <label className="mt-3 block text-sm">
              <span className="font-semibold text-[#10231f]">Anything else about it</span>
              <textarea
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                rows={3}
                className="mt-1 w-full rounded-xl border border-[#d8e6df] bg-white p-2"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => void addEvent()}
                className="rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-bold text-white disabled:opacity-70"
              >
                {saving ? "Recording…" : "Record it"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setDraft(EMPTY_NEW_EVENT);
                }}
                className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {events.length === 0 ? (
          <p className="mt-4 text-sm text-[#4f685f]">
            Nothing recorded yet. Anything you confirmed from your story, or add here, will show
            up in this list.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {events.map((event) => (
              <li key={event.id} className="rounded-2xl border border-[#d8e6df] bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold text-[#10231f]">{event.title}</p>
                  <p className="text-sm text-[#4f685f]">{whenText(event)}</p>
                </div>

                {event.description ? (
                  <p className="mt-2 text-sm text-[#4f685f]">{event.description}</p>
                ) : null}

                {event.scheduled_for_raw ? (
                  <p className="mt-2 text-sm text-[#24463d]">
                    Set a date for: {event.scheduled_for_raw}
                  </p>
                ) : null}

                {event.narrative_basis ? (
                  <p className="mt-2 text-xs italic text-[#4f685f]">
                    From what you wrote: &ldquo;{event.narrative_basis}&rdquo;
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/*
        CORRECTIONS AND WITHDRAWALS: on request, not by default.

        The default view answers "what is true about my case now", and mixing
        superseded rows into it makes that harder to read — a user scanning for
        their defence date should not have to work out which of two entries the
        site currently believes.

        But it is one click away and never hidden. The audit trail exists so the
        record stays honest: the site showed the user things based on the
        original, and a user who corrected something should be able to see that
        they did. Dropping it from the UI entirely would keep the data and lose
        the point of keeping it.
      */}
      {superseded.length > 0 ? (
        <section className="mt-8 border-t border-[#e3efe9] pt-5">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm font-semibold text-[#2f7d67] underline"
          >
            {showHistory ? "Hide" : "Show"} corrections and withdrawn entries ({superseded.length})
          </button>

          {showHistory ? (
            <ul className="mt-3 space-y-2">
              {superseded.map((event) => (
                <li
                  key={event.id}
                  className="rounded-xl border border-[#e3efe9] bg-[#f8fcfa] p-4 text-sm text-[#4f685f]"
                >
                  <p>
                    <span className="font-semibold">{event.title}</span> — {whenText(event)}
                  </p>
                  <p className="mt-1 text-xs">
                    {event.retracted_at
                      ? "Withdrawn. Kept so the record of what you were shown stays complete."
                      : "Replaced by a later correction. Kept for the same reason."}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={`/dashboard/cases/${encodeURIComponent(caseId)}`}
          className="rounded-full border border-[#2f7d67] bg-white px-5 py-2 text-sm font-semibold text-[#2f7d67]"
        >
          Back to case
        </Link>
      </div>
    </main>
  );
}

export default function CaseTimelinePage() {
  return (
    <Suspense fallback={null}>
      <CaseTimelineContent />
    </Suspense>
  );
}
