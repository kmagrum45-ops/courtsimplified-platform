"use client";

import { useSyncExternalStore } from "react";
import { reviewPhase } from "../../src/lib/case-system/intakeReview";
import { useIntakeReviewView } from "./IntakeRecovery";
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

export default function ReviewNeededNotice() {
  const wasAsked = useSyncExternalStore(subscribeReviewNeeded, reviewNeededAsked, () => false);
  const view = useIntakeReviewView();
  if (!wasAsked || !view || reviewPhase(view.workflowStatus, view.checkpoint) === "user-confirmed") return null;
  return (
    <p data-testid="review-needed-beside-button" role="alert" className="mt-3 text-sm font-semibold text-[#a63b3b]">
      Your initial case information at the top of this page needs confirming before your next steps can be shown.{" "}
      <button type="button" onClick={() => scrollAndFocus(document.querySelector<HTMLElement>('[data-testid="intake-review"]'))} className="underline">
        Go to your initial case information
      </button>
    </p>
  );
}
