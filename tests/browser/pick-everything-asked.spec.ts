/**
 * "PICK EVERYTHING THAT FITS" IS ASKED ON ITS OWN, WITH THE STORY'S KIND OFFERED, AND A SECOND KIND CAN BE ADDED
 * (Chrome check of production c38e69fd, 8 Nov 2026, A3 / B6).
 *
 * Chrome, Civil and Family: the first question "What kind of case is it? Pick everything that fits." / "What is the case
 * about? Pick everything that applies." never showed. "What the case is about: Debt / money owed" (Civil) and "Parenting
 * time / access" (Family) were already filled in, with nowhere to tick "Contract / agreement dispute" or "Decision-making
 * responsibility / custody". Cause found here: when one sentence of the story names the kind and another answer (the
 * amount; what the person wants), the questions offered both together as one "From what you told us ... Is that right?"
 * (GuidedFormChat.tsx storyGroup), so "Use the suggestion" accepted the kind and the pick-everything list never showed;
 * an accepted answer has no "Change" there.
 *
 * What it checks, Civil and Family, with the real save path (a real local or staging account; realTestSession.ts refuses
 * production) and the model stand-ins, Chrome's stories: the pick-everything question is shown with its boxes; the story's
 * kind is offered there ("Use the suggestion" ticks it, never answers for the person); a second kind is ticked too; after
 * Next, the review holds both.
 *
 * WHAT FAILURE THIS CATCHES: a "pick everything" question answered for the person with one choice and no way to add more.
 */
import { expect, test } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const CASES = {
  civil: {
    story: "Synthetic: In June 2025 I lent my former business partner, Dana Testwood, $85,000 by e-transfer to buy equipment. She signed a one-page note promising to repay it by March 1, 2026. She has paid nothing and stopped answering my emails in April 2026.",
    fromStory: "debt", added: "contract", labels: ["Debt / money owed", "Contract / agreement dispute"],
  },
  family: {
    story: "Synthetic: Jordan Testfield and I lived together from 2018 to August 2025 but never married. Our daughter is 6 and lives with me. Since we separated Jordan sees her only when he wants to, and some weekends he cancels on the day. I want a regular parenting-time schedule so she knows when she will see him. There is no court order or written agreement.",
    fromStory: "parenting-time", added: "decision-making-responsibility", labels: ["Parenting time / access", "Decision-making responsibility / custody"],
  },
};

for (const court of ["civil", "family"] as const) {
  test(`"pick everything" is asked with the story's kind offered, and a second kind can be added -- ${court}`, async ({ page }) => {
    test.setTimeout(400_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      const { story, fromStory, added, labels } = CASES[court];
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      await openBuilder(page, court, { city: "Ottawa", story });
      const question = page.getByTestId("guided-form-question");
      await expect(question, "the pick-everything question is shown first").toHaveAttribute("data-key", "issues", { timeout: 60_000 });
      await expect(page.getByTestId(`guided-check-${added}`), "its boxes are shown, so more than one can be picked").toBeVisible();
      // The story's kind is offered, never ticked for the person.
      await expect(page.getByTestId(`guided-check-${fromStory}`)).not.toBeChecked();
      await page.getByTestId("guided-form-multi-from-story").getByRole("button", { name: /Use the suggestion/ }).click();
      await expect(page.getByTestId(`guided-check-${fromStory}`)).toBeChecked();
      await page.getByTestId(`guided-check-${added}`).check();
      await page.getByTestId("guided-form-next").click();
      await expect(question).not.toHaveAttribute("data-key", "issues", { timeout: 30_000 });

      // The review holds both kinds.
      await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
      const review = page.getByTestId("intake-review");
      await expect(review).toHaveAttribute("data-phase", "reviewing", { timeout: 30_000 });
      for (const label of labels) await expect(review, `the review holds "${label}"`).toContainText(label);
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
