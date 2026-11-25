"use client";

import { useMemo, useState, type Ref } from "react";

import { exclusiveTribunalFor, tribunalNoticeView, type TribunalNoticeView } from "@/src/lib/case-system/intelligence/fixedRegimes";
import { assertApprovedUserContent } from "@/src/lib/content-library/outputGuard";
import LegalAdviceDeflection from "./LegalAdviceDeflection";
import { WorkingButton } from "./Working";

/**
 * The one tribunal notice (C1, site owner 9 Nov 2026): the home page, the reading card, the builder chat (Family,
 * Civil) and the Small Claims chat all show this, from the one code rule (fixedRegimes.ts exclusiveTribunalFor), before
 * any follow-up question. Its only words about the law are the forum's own sourced redirectMessage
 * (outOfScopeForums.ts); the rest is the home page's existing panel, moved here unchanged. "Continue ... anyway" stays:
 * it is a suggestion the person can set aside (CLAUDE.md s. 4).
 */
export default function TribunalNotice({
  tribunal,
  courtLabel,
  onContinue,
  working = false,
  disabled = false,
  context,
  panelRef,
}: {
  tribunal: { id?: string; redirectMessage: string };
  /** "Small Claims", "Civil" or "Family": the court the person chose. */
  courtLabel: string;
  /** Absent when nothing is held back (a former tenancy: the questions stay under the notice). */
  onContinue?: () => void;
  working?: boolean;
  disabled?: boolean;
  /** Where it is shown, for the output guard's log. */
  context: string;
  panelRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="group"
      aria-label="Court path check"
      data-testid="court-path-out-of-scope"
      data-forum={tribunal.id}
      className="mt-6 rounded-3xl border border-[#ead9a7] bg-[#fffaf0] p-5"
    >
      <h2 className="text-lg font-bold text-[#10231f]">CourtSimplified doesn&apos;t cover this</h2>
      <p className="mt-2 text-sm leading-6 text-[#6e5726]">{assertApprovedUserContent(tribunal.redirectMessage, context)}</p>
      <p className="mt-2 text-sm leading-6 text-[#4d675f]">
        This is a suggestion based on the words you used, not a decision about your case. If you believe this belongs in {courtLabel}, you can continue anyway.
      </p>
      {/*
        LSO Step 6e. The forum wording above is the library's own redirectMessage, selected by id -- but a user told
        "we don't cover this" and nothing else has been sent away with nowhere to go. The referral list is the point
        of saying no.
      */}
      <div className="mt-4">
        <LegalAdviceDeflection reason="out-of-scope" />
      </div>
      {onContinue ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <WorkingButton
            data-testid="court-path-out-of-scope-continue"
            disabled={disabled}
            working={working}
            workingLabel="Opening your intake…"
            onClick={onContinue}
            className="rounded-xl border border-[#bdd4ca] bg-white px-5 py-3 text-sm font-semibold text-[#1c473d]"
          >
            Continue with {courtLabel} anyway
          </WorkingButton>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The shared rule on the person's story, for a screen about to ask its first follow-up question. `held`: show the
 * notice in place of the question until the person sets it aside; a former tenancy (`ended`) is shown but never held.
 * Setting it aside lasts while this screen is open: it is not case data, so it is not saved (the one-writer rule), and
 * a later screen shows the notice again before its own first follow-up question.
 */
export function useTribunalFirst(story: string): { tribunal: TribunalNoticeView | null; held: boolean; setAside: () => void } {
  const tribunal = useMemo(() => {
    const found = exclusiveTribunalFor(story);
    return found ? tribunalNoticeView(found) : null;
  }, [story]);
  const [setAsideFor, setSetAsideFor] = useState("");
  const held = Boolean(tribunal && !tribunal.ended && setAsideFor !== tribunal.id);
  return { tribunal, held, setAside: () => setSetAsideFor(tribunal?.id ?? "") };
}

export const COURT_LABELS = { "small-claims": "Small Claims", civil: "Civil", family: "Family" } as const;
