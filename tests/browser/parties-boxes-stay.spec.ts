/**
 * A PARTY'S BOXES STAY WHERE THEY ARE WHILE THE PERSON TYPES IN THEM (Chrome pass 2 on #550, 17 Nov 2026, row 1.9: "Each
 * box turns into "kept" text when you leave it, so the boxes below move up. Text typed in order landed in the wrong
 * boxes: "City or town: 100 Sample Road", Province "Ottawa".")
 *
 * What it checks, in all three courts, with the real save path (a real local or staging account; realTestSession.ts
 * refuses production) and the model stand-ins: in the review's Parties step, a second other party is added and made a
 * person; the place of each address box is read once, before anything is typed, as a person sees the boxes; then each
 * place is clicked with the mouse in turn and its value typed, as a person types down the form. Every value is in its own
 * box: the street in the street, the city in the city, the postal code in the postal code. Once the focus leaves the
 * entry, each is kept (the kept line, as before).
 *
 * What failure it catches: a box that folds into one line the moment it is left, moving the boxes below it under the
 * next click (PartiesStep.tsx inEntry).
 *
 * Stand-ins: the model calls (serveModelStandIns).
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { openBuilder } from "./harness/builderGate";
import { saveCaseStory } from "./harness/intakeReview";
import { CONFIRMED_CASE_STORY } from "./harness/confirmedCase";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

async function toParties(page: Page, court: "small-claims" | "civil" | "family") {
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
  const step = panel.getByTestId("parties-step");
  await expect(step).toBeVisible({ timeout: 60_000 });
  return step;
}

const TYPED = [["street", "100 Sample Road"], ["city", "Ottawa"], ["postalCode", "K1B 0B1"]] as const;

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`a party's boxes stay where they are while typed in, down the form -- ${court}`, async ({ page }) => {
    test.setTimeout(600_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      const step = await toParties(page, court);
      const others = step.locator("[data-testid=parties-party][data-party=other]");
      const before = await others.count();
      await step.getByTestId("parties-add-other").click();
      await expect(others).toHaveCount(before + 1, { timeout: 15_000 });
      const entry = others.last();
      const person = entry.getByTestId("parties-kind-person");
      if (await person.isVisible().catch(() => false)) await person.click();
      await expect(entry.getByTestId("parties-input-street")).toBeVisible({ timeout: 15_000 });
      // The address boxes in the middle of the window, all in view, as a person sees them before typing down them (the
      // postal code's box was below the window's edge when only the street box was scrolled into view, so the click meant
      // for it landed on nothing: a fault of this test, not of the page; 18 Nov).
      await entry.getByTestId("parties-input-city").evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
      const view = page.viewportSize();
      // The page scrolls smoothly (its styles): the places are read once the boxes have stopped moving.
      await expect.poll(async () => { const first = await entry.getByTestId("parties-input-city").boundingBox(); await page.waitForTimeout(250); const again = await entry.getByTestId("parties-input-city").boundingBox(); return first?.y === again?.y; }, { timeout: 10_000 }).toBe(true);

      // Where each box is, read once, before anything is typed (a person sees the boxes, then types down them).
      const places: { x: number; y: number }[] = [];
      for (const [detail] of TYPED) {
        const box = await entry.getByTestId(`parties-input-${detail}`).boundingBox();
        expect(box, `the ${detail} box is drawn`).not.toBeNull();
        places.push({ x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 });
        expect(view && box!.y >= 0 && box!.y + box!.height <= view.height, `the ${detail} box is in the window`).toBeTruthy();
      }
      for (const [index, [, value]] of TYPED.entries()) {
        await page.mouse.click(places[index].x, places[index].y);
        await page.keyboard.type(value, { delay: 15 });
        await page.waitForTimeout(400);
      }
      // Leaving the entry: each kept, in its own place.
      await page.keyboard.press("Tab");
      // Tab from the last box goes to the next thing in the entry and stays there: never to nothing (the focused button was
      // taken away by the box's own save, so the entry never heard it was left and stayed open; 18 Nov).
      await expect.poll(() => entry.evaluate((element) => element.contains(document.activeElement)), { message: "after Tab the focus is still in the entry" }).toBe(true);
      await step.getByRole("heading").first().click();
      for (const [detail, value] of TYPED) {
        await expect(entry.locator(`[data-testid=parties-detail-held][data-detail=${detail}]`), `"${value}" is kept as the ${detail}`).toContainText(value, { timeout: 15_000 });
      }
      const held = await entry.locator("[data-testid=parties-detail-held]").allInnerTexts();
      for (const [detail, value] of TYPED) {
        const elsewhere = held.filter((line) => line.includes(value) && !line.startsWith(`${({ street: "Street", city: "City", postalCode: "Postal" } as const)[detail]}`));
        expect(elsewhere, `"${value}" is in no other box`).toEqual([]);
      }
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
