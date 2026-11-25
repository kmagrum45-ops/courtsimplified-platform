/**
 * THE FIRST CLICK AFTER TYPING IN A BOX WORKS (site owner, 16 Nov 2026; Chrome milestone test of #550, row 12: "Several
 * times, the first click after typing in a box did nothing and I had to click again: 'A person', 'A company or
 * business', and 'Yes' on the outcome offer").
 *
 * Cause: a box saved itself when it lost focus. Pressing the mouse on a button takes the focus first; the save redrew the
 * page at once (the box became a line of text), so the button moved before the mouse came up and the click landed on
 * nothing. Fix: app/_components/afterPointer.ts, used by every save on blur.
 *
 * What it checks, in all three courts, with the real save path (a real local or staging account; realTestSession.ts
 * refuses production) and the model stand-ins: in the review's Parties step, a name is typed into a box (no Enter, no
 * Tab) and a button below it is clicked ONCE, with the mouse as a person clicks: "Add another ..." adds a party, and in
 * Small Claims "A person" sets the other party's kind; the typed name is saved too (the save waits for the click, never
 * lost).
 *
 * What failure it catches: a click swallowed by a save that redraws the page under the pointer.
 *
 * Stand-ins: the model calls (serveModelStandIns).
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { openBuilder } from "./harness/builderGate";
import { saveCaseStory } from "./harness/intakeReview";
import { CONFIRMED_CASE_STORY } from "./harness/confirmedCase";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

/**
 * The button in the middle of the window, as a person sees the button they press. Playwright scrolls a button only just
 * into view; at the window's bottom edge, holding the mouse down scrolls the page (Chrome's drag-autoscroll), and the
 * release missed the button for that reason alone (browser diagnostic of 16 Nov). Without moving the focus from the box.
 */
const inView = (button: Locator) => button.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));

async function toReview(page: Page, court: "small-claims" | "civil" | "family") {
  if (court === "small-claims") {
    await openBuilder(page, court, { city: "Ottawa" });
    await page.getByRole("button", { name: "Fill in the form yourself" }).click();
    await page.getByLabel("Case story", { exact: true }).fill(CONFIRMED_CASE_STORY);
    await saveCaseStory(page);
  } else {
    await openBuilder(page, court, { city: "Ottawa", story: CONFIRMED_CASE_STORY });
    await page.getByTestId("guided-form-show-form").click();
  }
  await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
  const panel = page.getByTestId("intake-review");
  if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  const step = page.getByTestId("intake-review").getByTestId("parties-step");
  await expect(step).toBeVisible({ timeout: 60_000 });
  return step;
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`the first click after typing in a box works -- ${court}`, async ({ page }) => {
    test.setTimeout(600_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      const step = await toReview(page, court);
      const you = step.locator("[data-testid=parties-party][data-party=you]");
      const youKind = you.getByTestId("parties-kind-person");
      if (await youKind.isVisible().catch(() => false)) await youKind.click();
      const others = step.locator("[data-testid=parties-party][data-party=other]");
      const before = await others.count();

      // 1. Type a first name (the box keeps the focus), then click "Add another ..." below it, once.
      const first = you.getByTestId("parties-input-firstName");
      await expect(first).toBeVisible({ timeout: 30_000 });
      await first.fill("Testfirst");
      // Held down as a person holds a mouse button (a tenth of a second and more): the redraw had time to move the button.
      await inView(step.getByTestId("parties-add-other"));
      await step.getByTestId("parties-add-other").click({ delay: 150 });
      await expect(others, "the first click on \"Add another\" after typing added a party").toHaveCount(before + 1, { timeout: 5_000 });
      await expect(you.locator("[data-testid=parties-detail-held][data-detail=firstName]"), "and the typed name was saved").toContainText("Testfirst", { timeout: 15_000 });

      // 2. Small Claims and Civil: type the last name, then click "A person" on the new party, once. (Family never asks
      //    whether a party is a person: every party there is one.)
      if (court !== "family") {
        await you.getByTestId("parties-input-lastName").fill("Testlast");
        const person = others.last().getByTestId("parties-kind-person");
        await inView(person);
        await person.click({ delay: 150 });
        await expect(person, "the first click on \"A person\" after typing set the kind").toHaveCount(0, { timeout: 5_000 });
        await expect(you.locator("[data-testid=parties-detail-held][data-detail=lastName]")).toContainText("Testlast", { timeout: 15_000 });
      }
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
