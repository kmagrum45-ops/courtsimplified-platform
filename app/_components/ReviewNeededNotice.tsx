"use client";

import { useSyncExternalStore } from "react";
import { continueNeedsLine, inputRevision, reviewNeededWords, reviewPhase } from "../../src/lib/case-system/intakeReview";
import { useContinueNeeds, useIntakeRecovery, useIntakeReviewView } from "./IntakeRecovery";
import { scrollAndFocus } from "./scrollFocus";
import { reviewNeededAsked, subscribeReviewNeeded } from "./reviewNeeded";

/**
 * "CONFIRM YOUR INITIAL INFORMATION FIRST", BESIDE THE BUTTON JUST PRESSED (L26).
 *
 * Pressing "Continue to your next steps" before the review panel at the top was
 * confirmed only scrolled up to the panel (#465 re-test D), so a person at the
 * bottom of a long form saw the page jump with no word why. prepareCaseGuidance
 * marks the request; each route's Continue shows this beside itself, with a
 * link up to the panel, until the review is confirmed.
 */

/** `from`: the route whose Continue this sits beside ("form", "family", "civil", "guided"). */
export default function ReviewNeededNotice({ from }: { from: string }) {
  const asked = useSyncExternalStore(subscribeReviewNeeded, reviewNeededAsked, () => null);
  const view = useIntakeReviewView();
  const recovery = useIntakeRecovery();
  // What the review still needs, from the same rule as the review's own Continue (intakeReview.ts continueNeeds): said
  // beside this button when it is pressed, so every Continue says the same thing (Chrome milestone test of #550, row 11).
  // The button itself stays pressable: pressing it is what brings this notice (L26).
  const needs = useContinueNeeds();
  if (!asked || !view || asked.from !== from || asked.revision !== inputRevision(view.checkpoint) || reviewPhase(view.workflowStatus, view.checkpoint) === "user-confirmed") return null;
  return (
    <p data-testid="review-needed-beside-button" role="alert" className="mt-3 text-sm font-semibold text-[#a63b3b]">
      {/* Nothing left to decide: the review is a summary, so this points to it and asks for no confirmation (site owner, 12 Nov). */}
      {reviewNeededWords(view.checkpoint, recovery?.getSavedMaster() ?? undefined)}{" "}
      <button type="button" onClick={() => document.querySelector<HTMLElement>('[data-testid="intake-review"]')?.scrollIntoView({ block: "start" })} className="underline">
        Go to your initial case information
      </button>
      {needs.length ? <span data-testid="continue-needs-beside-button" className="mt-1 block">{continueNeedsLine(needs)}</span> : null}
    </p>
  );
}
