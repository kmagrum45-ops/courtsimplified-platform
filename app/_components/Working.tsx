"use client";

/**
 * WHILE WORK IS IN PROGRESS, SAY SO -- AND A SECOND PRESS DOES NOTHING (site owner, 28 Oct).
 *
 * At the live site's speed a press can take seconds: a turn of the questions, a save, a file. A
 * control that only greys out looks broken (the story-suggestions card stayed greyed for ~11 s with
 * no words, #488's real-speed runs), and people press again. Every control that starts slow work
 * says so in plain words while it runs (WorkingButton), and a card whose controls are all held while
 * its work runs says so once, inside the card (WorkingNote). Held controls ignore a second press
 * (they are disabled), so nothing visible changes and no second request starts.
 *
 * `npm run test:working-states` checks that every control held by a work state is one of these, or
 * sits in a card that shows a WorkingNote for that state, and that no working label is bare dots.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

type WorkingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** True while the work this button started is running. */
  working: boolean;
  /** What it is doing, in plain words, ending in "…" (e.g. "Saving…", "Reading your story…"). */
  workingLabel: string;
  children: ReactNode;
};

/** A button that says what it is doing while it works, and ignores a second press meanwhile. */
export function WorkingButton({ working, workingLabel, children, disabled, type = "button", ...rest }: WorkingButtonProps) {
  return (
    <button type={type} {...rest} disabled={Boolean(disabled) || working} aria-busy={working || undefined} data-working={working ? "true" : undefined}>
      {working ? workingLabel : children}
    </button>
  );
}

/** One plain line inside a card while its work runs, read out by screen readers. Nothing when idle. */
export function WorkingNote({ working, children }: { working: boolean; children: ReactNode }) {
  if (!working) return null;
  return (
    <p role="status" aria-live="polite" data-testid="working-note" className="mt-3 text-sm font-semibold text-[#2f7d67]">
      {children}
    </p>
  );
}
