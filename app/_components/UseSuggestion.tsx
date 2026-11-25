"use client";

/**
 * THE ONE CONTROL THAT OFFERS A SUGGESTION: THREE CHOICES (site owner, 11 Nov and 14 Nov 2026; Chrome check of #550,
 * 2.4 and 8.3: the kind-of-case offer said "Use the suggestion: ... / No, not that one / Not sure, skip this", and the
 * review's first button was not "Yes").
 *
 * What is offered is shown, then "Yes", "No, that's not right" and "I'm not sure", in every court and on every screen,
 * with the words from the shared copy (src/lib/case-system/copy/suggestionCopy.ts). Nothing is ticked, selected or
 * filled in until the person presses Yes (CLAUDE.md s. 4).
 *
 * `offer` (required): what the offer is for, its key and the case file's fact it fills (offerChoice.ts). Its No and Not
 * sure go through the one handler (offerChoiceSave.ts; site owner, 14 Nov 2026): kept under the key, so the offer is never
 * made again, and "I'm not sure" settles the fact, so it is never asked again. An offer already decided is not shown.
 * `onNo` / `onUnsure`: what else the screen does for each (open its own question, move on). A screen that keeps the choice
 * in a record of its own says so (`offer.recordedBy: "screen"`) and passes both; listed in verifySuggestionsOffered.ts.
 * `pressed`: a screen that keeps the choice until its own Continue (the chat's story offers) shows it pressed and keeps
 * the three on the page.
 *
 * `ask` / `frame`: the screen's question for this offer ("From what you told us: ... Is that right?") and the box it sits
 * in are drawn BY THIS CONTROL, so they show only with the three buttons and go with them (PR #550 CI: the Civil chat drew
 * its question with no buttons under it). A screen never draws an offer's question outside the control.
 * A choice made here hides only the offer it was made on (its key): the control is reused in place for the next offer
 * (the chat), and a choice kept in plain state hid the next offer's buttons too (PR #550 CI, offer-choices Civil).
 *
 * Every Yes carries `data-use-suggestion`, so a browser check finds each offer without knowing the screen; `testId`
 * keeps a screen's own stable test id for Yes.
 */
import { useState, type ReactNode } from "react";
import { useOfferChoices } from "./offerChoiceSave";
import type { OfferTarget } from "../../src/lib/case-system/caseFile/offerChoice";
import { OFFER_CHOICES, suggestionLabel } from "../../src/lib/case-system/copy/suggestionCopy";
import { WorkingButton } from "./Working";

const LOOK = "rounded-xl border border-[#2f7d67] bg-white px-4 py-2 text-left text-sm font-semibold text-[#2f7d67] disabled:opacity-50";
const OTHER = "rounded-xl border border-[#d8e6df] bg-white px-4 py-2 text-left text-sm font-semibold text-[#16302b] disabled:opacity-50";
const PRESSED = "aria-pressed:border-[#2f7d67] aria-pressed:bg-[#2f7d67] aria-pressed:text-white";

export type OfferChoice = "yes" | "no" | "unsure";

export function UseSuggestion({
  offer,
  what,
  onUse,
  onNo,
  onUnsure,
  pressed,
  disabled = false,
  working = false,
  workingLabel = "Saving…",
  testId = "use-suggestion",
  noTestId,
  unsureTestId,
  className,
  note,
  ask,
  frame,
}: {
  /** What the offer is for (its key and fact): the one handler records No and Not sure against it. */
  offer: OfferTarget;
  /** What the suggestion is, in the words the person reads ("Property damage", a date, a quote). */
  what?: string | null;
  onUse: () => void;
  onNo?: () => void;
  onUnsure?: () => void;
  /** The choice already made, for a screen that keeps it until its own Continue. */
  pressed?: OfferChoice | null;
  disabled?: boolean;
  /** While the use is saving: Yes says so and is held, so it is not pressed twice. */
  working?: boolean;
  workingLabel?: string;
  testId?: string;
  noTestId?: string;
  unsureTestId?: string;
  /** Yes's own look, as the screen had it. */
  className?: string;
  /** A smaller line under what is offered (where the suggestion came from). */
  note?: ReactNode;
  /** The screen's question for this offer, drawn above what is offered, only with the buttons. */
  ask?: ReactNode;
  /** The box the whole offer sits in (its test id, look and data attributes), drawn only with the buttons. */
  frame?: { testId?: string; className?: string; attrs?: Record<string, string> };
}) {
  const [setAside, setSetAside] = useState<{ key: string; choice: OfferChoice } | null>(null);
  const choices = useOfferChoices();
  const keeps = pressed !== undefined;
  const shared = offer.recordedBy !== "screen";
  // Decided before (this visit or an earlier one): never offered again.
  if (!keeps && (setAside?.key === offer.key || (shared && choices.choiceOf(offer.key)))) return null;
  const choose = (choice: "no" | "unsure") => {
    if (shared) void choices.record(offer, choice);
    const screen = choice === "no" ? onNo : onUnsure;
    if (screen) screen();
    if (!keeps && (shared || !screen)) setSetAside({ key: offer.key, choice });
  };
  const control = (
    <span className="block" data-offer-choices="">
      {ask ? <span data-offer-ask="" className="block">{ask}</span> : null}
      {what ? <span data-testid={`${testId}-what`} className="block font-semibold">{what}</span> : null}
      {note ? <span className="block text-xs font-normal text-[#4d675f]">{note}</span> : null}
      <span role="group" aria-label="Is this right?" className="mt-1 flex flex-wrap gap-2">
        {/* The site's own held button (Working.tsx): while the use saves it says so and is held (test:working-states). */}
        <WorkingButton
          type="button"
          data-testid={testId}
          data-use-suggestion=""
          aria-label={suggestionLabel(what)}
          aria-pressed={keeps ? pressed === "yes" : undefined}
          disabled={disabled}
          working={working}
          workingLabel={workingLabel}
          onClick={onUse}
          className={`${className ?? LOOK} ${PRESSED}`}
        >
          {OFFER_CHOICES.yes}
        </WorkingButton>
        <button type="button" data-testid={noTestId ?? `${testId}-no`} aria-pressed={keeps ? pressed === "no" : undefined} disabled={disabled || working} onClick={() => choose("no")} className={`${OTHER} ${PRESSED}`}>
          {OFFER_CHOICES.no}
        </button>
        <button type="button" data-testid={unsureTestId ?? `${testId}-unsure`} aria-pressed={keeps ? pressed === "unsure" : undefined} disabled={disabled || working} onClick={() => choose("unsure")} className={`${OTHER} ${PRESSED}`}>
          {OFFER_CHOICES.unsure}
        </button>
      </span>
    </span>
  );
  return frame ? <div data-testid={frame.testId} className={frame.className} {...frame.attrs}>{control}</div> : control;
}
