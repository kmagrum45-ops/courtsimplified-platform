"use client";

/**
 * THE ONE CONTROL THAT OFFERS A SUGGESTION (owner's Chrome check, 31 Oct).
 *
 * A suggestion read from the person's story, or made by the site, is offered beside the question
 * with this one button, in every court and on every screen. Nothing is ticked, selected or filled
 * in until the person presses it; ignoring it saves nothing (CLAUDE.md s. 4). Its words come from
 * the shared copy (src/lib/case-system/copy/suggestionCopy.ts), so every screen says the same thing.
 *
 * Every instance carries `data-use-suggestion`, so a browser check finds each one without knowing
 * the screen; `testId` keeps a screen's own stable test id.
 */
import type { ReactNode } from "react";
import { suggestionLabel } from "../../src/lib/case-system/copy/suggestionCopy";

const LOOK = "rounded-xl border border-[#2f7d67] bg-white px-4 py-2 text-left text-sm font-semibold text-[#2f7d67] disabled:opacity-50";

export function UseSuggestion({
  what,
  onUse,
  disabled = false,
  working = false,
  workingLabel = "Saving…",
  testId = "use-suggestion",
  className,
  note,
}: {
  /** What the suggestion is, in the words the person reads ("Property damage", a date, a quote). */
  what?: string | null;
  onUse: () => void;
  disabled?: boolean;
  /** While the use is saving: the button says so and is held, so it is not pressed twice. */
  working?: boolean;
  workingLabel?: string;
  testId?: string;
  className?: string;
  /** A smaller line under the words (where the suggestion came from). */
  note?: ReactNode;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      data-use-suggestion=""
      disabled={disabled || working}
      aria-busy={working || undefined}
      data-working={working ? "true" : undefined}
      onClick={onUse}
      className={className ?? LOOK}
    >
      {working ? workingLabel : suggestionLabel(what)}
      {note && !working ? <span className="block text-xs font-normal text-[#4d675f]">{note}</span> : null}
    </button>
  );
}
