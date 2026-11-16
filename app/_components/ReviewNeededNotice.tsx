"use client";

import { useSyncExternalStore } from "react";
import { continueNeedsLine, inputRevision, reviewPhase, undecidedStoryOffers } from "../../src/lib/case-system/intakeReview";
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
  // While the review is open and still needs something, the button beside this is held by the same rule as the review's
  // own Continue (intakeReview.ts continueNeeds), and says the same thing (Chrome milestone test of #550, row 11).
  const needs = useContinueNeeds();
  if (needs.length) {
    return (
      <p data-testid="continue-needs-beside-button" className="mt-3 text-sm font-semibold text-[#8a4b12]">
        {continueNeedsLine(needs)}{" "}
        <button type="button" onClick={() => document.querySelector<HTMLElement>('[data-testid="intake-review"]')?.scrollIntoView({ block: "start" })} className="underline">
          Go to your initial case information
        </button>
      </p>
    );
  }
  if (!asked || !view || asked.from !== from || asked.revision !== inputRevision(view.checkpoint) || reviewPhase(view.workflowStatus, view.checkpoint) === "user-confirmed") return null;
  return (
    <p data-testid="review-needed-beside-button" role="alert" className="mt-3 text-sm font-semibold text-[#a63b3b]">
      {/* Nothing left to decide: the review is a summary, so this points to it and asks for no confirmation (site owner, 12 Nov). */}
      {undecidedStoryOffers(view.checkpoint, recovery?.getSavedMaster() ?? undefined) > 0
        ? "Your initial case information at the top of this page needs confirming before your next steps can be shown."
        : "Your next steps come after the summary of your initial case information at the top of this page: look it over and press Continue there."}{" "}
      <button type="button" onClick={() => document.querySelector<HTMLElement>('[data-testid="intake-review"]')?.scrollIntoView({ block: "start" })} className="underline">
        Go to your initial case information
      </button>
    </p>
  );
}
