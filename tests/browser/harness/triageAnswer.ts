/**
 * ANSWERS A FAMILY STATUS QUESTION AS THE PERSON WOULD (C9, 23 Nov 2026).
 *
 * While the story's own answer is offered ("not married", "No children"), the question and its own buttons are not shown
 * (FamilyStatusTriage.tsx suggestionWaiting): the person takes the offer, or says "No, that's not right" and is then asked
 * the question. The offer's box says which answer it offers (data-value). This does what a person wanting `answer` would.
 */
import type { Locator } from "@playwright/test";

export async function answerTriage(question: Locator, answer: string): Promise<void> {
  const offer = question.getByTestId("triage-story-suggestion");
  if (await offer.isVisible().catch(() => false)) {
    const offered = await offer.getAttribute("data-value");
    if (offered === answer) {
      await offer.getByTestId("triage-story-suggestion-yes").click();
      return;
    }
    const unsure = offer.getByTestId("triage-story-suggestion-yes-unsure");
    if (answer === "unsure" && (await unsure.isVisible().catch(() => false))) {
      await unsure.click();
      return;
    }
    await offer.getByTestId("triage-story-suggestion-yes-no").click();
  }
  await question.getByTestId(`triage-answer-${answer}`).click();
}

/** Takes the story's offered answer when one is offered; false when none is. */
export async function takeTriageOffer(question: Locator): Promise<boolean> {
  const offer = question.getByTestId("triage-story-suggestion");
  if (!(await offer.isVisible().catch(() => false))) return false;
  await offer.getByTestId("triage-story-suggestion-yes").click();
  return true;
}
