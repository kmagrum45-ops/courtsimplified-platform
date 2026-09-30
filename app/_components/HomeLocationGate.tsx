"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../src/lib/supabase/client";
import {
  saveGuestIntakeSession,
  type BuilderDraftCourtPath,
} from "../../src/lib/case-system/builderDraftStorage";
import { resetIntakeInBrowser } from "../../src/lib/case-system/storage/resetIntake";
import { scrollAndFocus } from "./scrollFocus";
import { pathwayDescriptionFor } from "../../src/lib/content-library/pathwayDescriptions";
import { assertApprovedUserContent } from "../../src/lib/content-library/outputGuard";
import LegalAdviceDeflection from "./LegalAdviceDeflection";
import AiUseNotice from "./AiUseNotice";
import PathwayUnavailable from "./PathwayUnavailable";
import { isPathwayAvailable, type KnownPathway } from "../../src/lib/content-library/phaseScope";
import {
  CROSS_FORUM_NOTES,
  ISSUE_KIND_LABELS,
  SEVERAL_MATTERS_INTRO,
  type CrossForumNote,
  type IssueKind,
} from "../../src/lib/content-library/crossForumNotes";

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
  | {
      kind: "switch-path";
      suggestedPath: BuilderDraftCourtPath;
      /**
       * The model's own sentence. RETAINED FOR THE AUDIT LOG, NEVER RENDERED.
       *
       * Removing it entirely would have been simpler, and wrong: Step 7's
       * monitoring needs the model's actual output to be reviewable. What
       * changed is that it no longer reaches the screen.
       */
      reasoningForAuditLogOnly: string;
    }
  | { kind: "out-of-scope"; forumName: string; message: string }
  | {
      /**
       * The story involves more than one matter (2026-09-30). Shows each
       * matter as a fixed topic label beside the user's OWN words, and the
       * fixed, sourced notes on how those matters connect. Nothing here is
       * model-written: the model picked kinds from a list and quoted the story.
       */
      kind: "several-matters";
      issues: { kind: IssueKind; quote: string }[];
      notes: CrossForumNote[];
      /** A different in-scope path the classifier suggested, if any. */
      suggestedPath: BuilderDraftCourtPath | null;
      /**
       * A tribunal one of the matters may belong to. Shown INSIDE this card:
       * before 2026-09-30 the "we don't cover this" message came first, so a
       * person fired over their religion AND owed wages was turned away,
       * although the wages and the firing are court matters.
       */
      outOfScope: { forumName: string; message: string } | null;
    };

function asIssues(value: unknown): { kind: IssueKind; quote: string }[] {
  if (!value || typeof value !== "object") return [];
  const issues = (value as { issues?: unknown }).issues;
  if (!Array.isArray(issues)) return [];
  return issues.flatMap((entry) => {
    const kind = (entry as { kind?: unknown })?.kind;
    const quote = (entry as { quote?: unknown })?.quote;
    return typeof kind === "string" && kind in ISSUE_KIND_LABELS && typeof quote === "string" && quote.trim()
      ? [{ kind: kind as IssueKind, quote: quote.trim() }]
      : [];
  });
}

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
  const [hydrated, setHydrated] = useState(false);
  const [checking, setChecking] = useState(false);
  const [suggestion, setSuggestion] = useState<CourtPathSuggestion | null>(null);
  const provinceRef = useRef<HTMLSelectElement | null>(null);
  const suggestionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    async function hydrate() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      const id = data.user?.id || null;

      /*
       * AN ANONYMOUS ARRIVAL AT THE GATE IS A NEW FLOW, AND STARTS EMPTY.
       *
       * This is the gate every "start a case" route passes through, so it is
       * where a shared computer gets cleaned. A full reset here — including
       * other accounts' user-scoped drafts — is deliberate: nobody is signed
       * in, so there is no live session whose work could be destroyed, and a
       * library machine should not still be holding the last person's case.
       *
       * A signed-in user is not reset here: they may be mid-case in another
       * tab. They were already reset when they signed in (login page), and
       * this form never pre-fills from the browser -- see below.
       */
      if (!id) resetIntakeInBrowser();

      setUserId(id);
      setHydrated(true);
    }
    void hydrate();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id || null;
      setUserId(id);
      setProvince("");
      setCity("");
      setFacts("");
      setSuggestion(null);
      /*
       * Signing out leaves a browser that the next person may use. Clearing
       * the guest session alone left nineteen unscoped keys holding case
       * content behind it.
       */
      if (!id) resetIntakeInBrowser();
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (hydrated && path) scrollAndFocus(provinceRef.current);
  }, [hydrated, path]);

  useEffect(() => {
    if (suggestion) scrollAndFocus(suggestionRef.current);
  }, [suggestion]);

  if (!path) return null;
  const isOntarioReady = province === "Ontario" && city.trim().length > 0 && facts.trim().length > 0;

  /** Commits to a path and leaves the gate. Only ever called from a user action. */
  function goToIntake(chosenPath: BuilderDraftCourtPath) {
    const intakeStart = { courtPath: chosenPath, province: "Ontario", city: city.trim(), facts: facts.trim() };
    /*
     * ONE HAND-OFF FOR EVERYONE, READ ONCE. Signed-in users used to get a
     * per-user localStorage draft here instead, and the builder restored that
     * draft on every later visit -- which is how a signed-in user found an old
     * test story pre-filled in the Small Claims intake (2026-09-28). The
     * "Saved case on this device" panel that offered to resume it is gone for
     * the same reason: saved work is opened from the workspace, never from
     * the browser. The session hand-off is tab-scoped and the builder deletes
     * it the moment it reads it.
     */
    saveGuestIntakeSession(sessionStorage, intakeStart);
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
          matters?: unknown;
          crossForumNoteIds?: unknown;
          showSeveralMatters?: unknown;
        };

        const confidence = typeof result.confidence === "number" ? result.confidence : 0;

        let outOfScope: { forumName: string; message: string } | null = null;
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
          if (forumName && message) outOfScope = { forumName, message };
        }

        const suggested = asCourtPath(result.primaryPath);
        const differentPath =
          suggested && suggested !== path && confidence >= SUGGESTION_CONFIDENCE_FLOOR ? suggested : null;

        // Several matters come first: one of them belonging to a tribunal
        // must not hide the ones that belong in court.
        if (result.showSeveralMatters === true) {
          const noteIds = Array.isArray(result.crossForumNoteIds) ? result.crossForumNoteIds : [];
          setSuggestion({
            kind: "several-matters",
            issues: asIssues(result.matters),
            notes: CROSS_FORUM_NOTES.filter((note) => noteIds.includes(note.id)),
            suggestedPath: differentPath,
            outOfScope,
          });
          setChecking(false);
          return;
        }

        if (outOfScope) {
          setSuggestion({ kind: "out-of-scope", ...outOfScope });
          setChecking(false);
          return;
        }

        if (suggested && suggested !== path && confidence >= SUGGESTION_CONFIDENCE_FLOOR) {
          setSuggestion({
            kind: "switch-path",
            suggestedPath: suggested,
            reasoningForAuditLogOnly: String(result.reasoning || "").trim(),
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

  /*
   * PHASE 1 IS SMALL CLAIMS ONLY (src/lib/content-library/phaseScope.ts).
   *
   * The front door. The builder gates the same thing independently, because
   * /builder?path=family is reachable by URL and from a saved draft.
   *
   * Placed after every hook so the hook order does not depend on the branch.
   */
  if (!isPathwayAvailable(path)) {
    return (
      <section
        className="border-y border-[#d9e6df] bg-white"
        data-testid="court-path-location-gate"
        tabIndex={-1}
      >
        <div className="mx-auto max-w-3xl px-6 py-12">
          <PathwayUnavailable pathway={path as KnownPathway} />
        </div>
      </section>
    );
  }

  return (
    <section className="border-y border-[#d9e6df] bg-white" data-testid="court-path-location-gate" tabIndex={-1}>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#2f7d67]">{pathLabels[path]} intake</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#10231f]">Confirm your location before starting this path</h1>
        {!hydrated ? <p className="mt-6 text-sm font-semibold text-[#4d675f]" aria-live="polite">Preparing a private case start…</p> : <div data-testid="court-path-location-gate-ready">
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
              {/*
                MODEL REASONING IS NO LONGER SHOWN HERE (LSO Step 3).

                This used to render `suggestion.reasoning` -- a model-written
                sentence about the user's own story, delivered verbatim with no
                human review (docs/lso-ai-audit.md finding B-6).

                Selecting the pathway CODE is a permitted use: the model
                analyses the input and picks from a fixed list. Writing a
                sentence about this person's matter is not. So the code is
                kept, and the words come from the reviewed catalogue in
                src/lib/content-library/pathwayDescriptions.ts.

                The description says what that FORUM handles, and nothing about
                the reader's situation -- which is the line CLAUDE.md section 2
                draws between legal information and legal advice.

                The model's reasoning is still returned by the route and is
                carried to the audit log (Step 7). It is never rendered.
              */}
              {pathwayDescriptionFor(suggestion.suggestedPath) && (
                <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                  {assertApprovedUserContent(
                    pathwayDescriptionFor(suggestion.suggestedPath)!.text,
                    "HomeLocationGate:pathway-description",
                  )}
                </p>
              )}
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                This is a suggestion based on the words you used, not a decision about your case. You choose which path to continue with, and you can change it later.
              </p>
              {/*
                PHASE 1. When the classifier points at a path we do not cover
                yet, the "Switch to X" button would walk the user into a gate.
                The suggestion itself is still worth showing -- knowing the
                matter looks like family law is useful even when we cannot
                help -- so the offer is replaced by the honest answer and the
                referrals, and the "continue anyway" button below still stands.
              */}
              {!isPathwayAvailable(suggestion.suggestedPath) && (
                <div className="mt-4">
                  <PathwayUnavailable pathway={suggestion.suggestedPath as KnownPathway} />
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                {isPathwayAvailable(suggestion.suggestedPath) && (
                  <button
                    type="button"
                    data-testid="court-path-suggestion-accept"
                    onClick={() => goToIntake(suggestion.suggestedPath)}
                    className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white"
                  >
                    Switch to {pathLabels[suggestion.suggestedPath]}
                  </button>
                )}
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

          {suggestion && suggestion.kind === "several-matters" && (
            <div
              ref={suggestionRef}
              tabIndex={-1}
              role="group"
              aria-label="More than one matter"
              data-testid="court-path-several-matters"
              className="mt-6 rounded-3xl border border-[#cde7dc] bg-[#f8fcfa] p-5"
            >
              <h2 className="text-lg font-bold text-[#10231f]">Your description may involve more than one matter</h2>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                {assertApprovedUserContent(SEVERAL_MATTERS_INTRO.text, "HomeLocationGate:several-matters-intro")}
              </p>
              {suggestion.issues.length > 0 && (
                <ul className="mt-4 space-y-2" data-testid="several-matters-issues">
                  {suggestion.issues.map((issue, index) => (
                    <li key={`${issue.kind}-${index}`} className="rounded-2xl border border-[#d8e6df] bg-white px-4 py-3 text-sm">
                      <span className="font-semibold text-[#16302b]">
                        {assertApprovedUserContent(
                          ISSUE_KIND_LABELS[issue.kind].text,
                          "HomeLocationGate:issue-kind-label",
                        )}
                      </span>
                      {/* The user's own words, located verbatim in their story by the classifier. */}
                      <span className="mt-1 block text-[#4d675f]">You wrote: &ldquo;{issue.quote}&rdquo;</span>
                    </li>
                  ))}
                </ul>
              )}
              {suggestion.outOfScope && (
                <div className="mt-4 rounded-2xl border border-[#ead9a7] bg-[#fffaf0] p-4" data-testid="several-matters-out-of-scope">
                  <h3 className="font-bold text-[#10231f]">Part of this may belong to the {suggestion.outOfScope.forumName}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#6e5726]">
                    {assertApprovedUserContent(suggestion.outOfScope.message, "HomeLocationGate:several-matters-out-of-scope")}
                  </p>
                  <div className="mt-3">
                    <LegalAdviceDeflection reason="out-of-scope" />
                  </div>
                </div>
              )}
              {suggestion.notes.map((note) => (
                <div key={note.id} className="mt-4 rounded-2xl border border-[#d8e6df] bg-white p-4" data-testid="cross-forum-note">
                  <h3 className="font-bold text-[#10231f]">
                    {assertApprovedUserContent(note.title, "HomeLocationGate:cross-forum-note-title")}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#24463d]">
                    {assertApprovedUserContent(note.text, "HomeLocationGate:cross-forum-note")}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-[#4d675f]">
                    {note.sources.map((source) => (
                      <li key={source.officialUrl}>
                        Source:{" "}
                        <a href={source.officialUrl} target="_blank" rel="noreferrer" className="underline">
                          {source.sourceName}
                        </a>
                        , {source.pinpoint} (checked {source.verifiedAt})
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="mt-4 text-sm leading-6 text-[#4d675f]">
                This is a suggestion based on the words you used, not a decision about your case. You choose where to start, and you can change it later.
              </p>
              {suggestion.suggestedPath && !isPathwayAvailable(suggestion.suggestedPath) && (
                <div className="mt-4">
                  <PathwayUnavailable pathway={suggestion.suggestedPath as KnownPathway} />
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                {suggestion.suggestedPath && isPathwayAvailable(suggestion.suggestedPath) && (
                  <button
                    type="button"
                    data-testid="several-matters-switch"
                    onClick={() => goToIntake(suggestion.suggestedPath!)}
                    className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white"
                  >
                    Start with {pathLabels[suggestion.suggestedPath]}
                  </button>
                )}
                <button
                  type="button"
                  data-testid="several-matters-continue"
                  onClick={() => goToIntake(path)}
                  className={
                    suggestion.suggestedPath
                      ? "rounded-xl border border-[#bdd4ca] bg-white px-5 py-3 text-sm font-semibold text-[#1c473d]"
                      : "rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white"
                  }
                >
                  Continue with {pathLabels[path]}
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
              <p className="mt-2 text-sm leading-6 text-[#6e5726]">
                {assertApprovedUserContent(
                  suggestion.message,
                  "HomeLocationGate:out-of-scope-redirect",
                )}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                This is a suggestion based on the words you used, not a decision about your case. If you believe this belongs in {pathLabels[path]}, you can continue anyway.
              </p>
              {/*
                LSO Step 6e. The forum wording above is the library's own
                redirectMessage, selected by id -- but a user told "we don't
                cover this" and nothing else has been sent away with nowhere
                to go. The referral list is the point of saying no.
              */}
              <div className="mt-4">
                <LegalAdviceDeflection reason="out-of-scope" />
              </div>

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

          {/*
            LSO Step 6b. What the user types here goes straight to a model --
            the court-path classifier -- before they have seen any other part
            of the product. The notice belongs where the first call happens,
            not only in the builder.
          */}
          <div className="mt-5">
            <AiUseNotice activity="read what you write and suggest which court path fits" />
          </div>

          <button type="button" onClick={continueToIntake} disabled={!isOntarioReady || checking} className="mt-6 rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{checking ? "Checking your description…" : `Continue to ${pathLabels[path]} intake`}</button>
        </div>}
      </div>
    </section>
  );
}
