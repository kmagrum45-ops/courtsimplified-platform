/**
 * THE STORY-OFFER CARD'S CHOICES, AS A PERSON MAKES THEM (site owner, 11 Nov 2026: each offer has three explicit
 * choices, "Yes", "No, that's not right" and "I'm not sure", and Continue stays disabled until every offer has one).
 *
 * Before, a spec pressed Continue with nothing ticked, which declined every offer. The same choice now is "No, that's
 * not right" on every row: each offer declined, its question asked once. A spec that used every offer chooses "Yes".
 */
import type { Locator } from "@playwright/test";

export type OfferChoice = "yes" | "no" | "unsure";

/** Chooses the same answer on every row of a Small Claims "Here's what I understood" card (story-proposals). */
export async function chooseOffers(card: Locator, choice: OfferChoice): Promise<void> {
  for (const button of await card.getByTestId(`story-proposal-${choice}`).all()) {
    if ((await button.getAttribute("aria-pressed")) !== "true") await button.click();
  }
}
