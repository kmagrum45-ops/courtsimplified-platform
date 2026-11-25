/**
 * ANSWERS A FAMILY STATUS QUESTION AS THE PERSON WOULD (C9, 23 Nov 2026).
 *
 * While the story's own answer is offered ("not married", "No children"), the question and its own buttons are not shown
 * (FamilyStatusTriage.tsx suggestionWaiting): the person takes the offer, or says "No, that's not right" and is then asked
 * the question. The offer's box says which answer it offers (data-value). This does what a person wanting `answer` would.
 *
 * `storyAnswer`: what the test's story itself answers ("no" for "We were never married"). Then the offer MUST be there and
 * MUST offer that answer: a story that answers the question with no offer (the question asked cold), or an offer of the
 * opposite ("married" for a never-married story), throws. So the helper never passes over the repeat it exists to stop.
 * test:never-ask-twice runs it on broken samples.
 */
import type { Locator } from "@playwright/test";

/** The part of a Playwright locator this helper uses (so a terminal test can run it on samples). */
export type TriageLocator = Pick<Locator, "getByTestId" | "isVisible" | "getAttribute" | "click">;

export async function answerTriage(question: TriageLocator, answer: string, options: { storyAnswer?: "yes" | "no" } = {}): Promise<void> {
  const offer = question.getByTestId("triage-story-suggestion");
  const shown = await offer.isVisible().catch(() => false);
  const offered = shown ? await offer.getAttribute("data-value") : null;
  if (options.storyAnswer) {
    if (!shown) throw new Error(`the story answers this question ("${options.storyAnswer}") but its answer is not offered: the question is asked cold`);
    if (offered !== options.storyAnswer) throw new Error(`the story answers "${options.storyAnswer}" but the offer is "${offered}": the opposite of the story`);
  }
  if (shown) {
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
export async function takeTriageOffer(question: TriageLocator): Promise<boolean> {
  const offer = question.getByTestId("triage-story-suggestion");
  if (!(await offer.isVisible().catch(() => false))) return false;
  await offer.getByTestId("triage-story-suggestion-yes").click();
  return true;
}
