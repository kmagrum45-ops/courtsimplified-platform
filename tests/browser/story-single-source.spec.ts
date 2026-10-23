/**
 * ONE COPY OF THE STORY, end to end (PR #463 re-test, 2026-10-18).
 *
 * The re-test found the story held in five places: confirming a correction in
 * review changed one of them, and Back showed the original on the start page.
 * This walks the whole loop — start page → intake → correct the story in
 * review → confirm → reload three times → Back → Continue — and then requires
 * that the ORIGINAL text appears nowhere: not on screen, not in any field,
 * not in browser storage and (signed in) not in the saved case.
 *
 * Small Claims and Family, guest and signed in. The two start-page AI reads
 * are answered locally, so the run spends nothing.
 */
import { expect, test, type Page } from "@playwright/test";
import { grantSiteAccess } from "./harness/siteAccess";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { recordInitialUnknowns } from "./harness/intakeReview";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const ORIGINAL = "Synthetic original story: the neighbour kept the borrowed trailer.";
const CORRECTION = "Synthetic corrected story: the neighbour returned the trailer damaged.";
const LABEL = { "small-claims": "Small Claims", family: "Family" } as const;

async function startPage(page: Page, court: keyof typeof LABEL) {
  await page.route("**/api/case/understand", (route) => route.fulfill({ json: { ok: true, skipped: "off" } }));
  await page.route("**/api/classify-court-path", (route) => route.fulfill({ json: { primaryPath: court, confidence: 0.95 } }));
  await page.goto(`/?path=${court}`);
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
}

async function continueFromStart(page: Page, court: keyof typeof LABEL) {
  await page.getByRole("button", { name: `Continue to ${LABEL[court]} intake` }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
}

async function originalAppearsNowhere(page: Page, rows?: Map<string, Record<string, unknown>>) {
  const shown = await page.locator("body").innerText();
  expect(shown, "the original story is not on screen").not.toContain(ORIGINAL);
  const fields = await page.locator("textarea, input").evaluateAll((elements) => elements.map((element) => (element as HTMLInputElement).value));
  expect(fields.join("\n"), "no field holds the original story").not.toContain(ORIGINAL);
  const stored = await page.evaluate(() => JSON.stringify([{ ...sessionStorage }, { ...localStorage }]));
  expect(stored, "browser storage holds no copy of the original story").not.toContain(ORIGINAL);
  if (rows) expect(JSON.stringify([...rows.values()]), "the saved case holds no copy of the original story").not.toContain(ORIGINAL);
}

for (const court of ["small-claims", "family"] as const) {
  for (const signedIn of [false, true]) {
    test(`${court}, ${signedIn ? "signed in" : "guest"}: a story corrected in review is the only story anywhere`, async ({ page }) => {
      test.setTimeout(240_000);
      const account = signedIn ? await fakeAccount(page) : null;
      await grantSiteAccess(page);
      await startPage(page, court);
      await page.getByLabel("City or municipality").fill("Sudbury");
      await page.getByLabel("Tell us what happened in your own words").fill(ORIGINAL);
      await continueFromStart(page, court);

      const panel = page.getByTestId("intake-review");
      await page.getByTestId("intake-start-review").click();
      await expect(panel).toHaveAttribute("data-phase", "reviewing");
      const reviewStory = panel.getByRole("textbox", { name: "Review: Your story", exact: true });
      await expect(reviewStory).toHaveValue(ORIGINAL);
      await reviewStory.fill(CORRECTION);
      // The story changes on "Save story", not as it is typed (#470 re-test).
      await page.getByTestId("intake-review").getByTestId("review-story-save").click();
      await recordInitialUnknowns(page);
      await page.getByTestId("intake-review-acknowledgement").check();
      await page.getByTestId("intake-confirm").click();
      await expect(panel).toHaveAttribute("data-phase", "user-confirmed");

      for (let reload = 0; reload < 3; reload++) {
        await page.reload();
        await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
      }
      await originalAppearsNowhere(page, account?.rows);

      await page.goBack();
      const startStory = page.getByLabel("Tell us what happened in your own words");
      await expect(startStory, "Back shows the corrected story on the start page").toHaveValue(CORRECTION);
      await originalAppearsNowhere(page, account?.rows);

      await continueFromStart(page, court);
      await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
      await originalAppearsNowhere(page, account?.rows);
    });
  }
}

// PR #463 re-test: the first click on "Continue to … intake" showed "Your update
// did not finish…" although /api/case/understand answered 200 (it skips for a
// guest). The real route runs here; only the court-path check is answered locally.
test("first click on Continue to intake proceeds when the understanding step is skipped", async ({ page }) => {
  test.setTimeout(180_000);
  await grantSiteAccess(page);
  await page.route("**/api/classify-court-path", (route) => route.fulfill({ json: { primaryPath: "family", confidence: 0.95 } }));
  let understood = 0;
  page.on("response", (response) => { if (response.url().includes("/api/case/understand") && response.status() === 200) understood++; });
  await page.goto("/?path=family");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel("Tell us what happened in your own words").fill(ORIGINAL);
  await page.getByRole("button", { name: "Continue to Family intake" }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  expect(understood, "the understanding route answered").toBe(1);
  await expect(page.getByText("Your update did not finish")).toHaveCount(0);
});

// PR #463 re-test round 2: after a correction, Back showed the start page's reading
// of the OLD story as current. A reading shows only while its story is current.
test("Back after a correction never shows the old story's reading as current", async ({ page }) => {
  test.setTimeout(240_000);
  await grantSiteAccess(page);
  await page.route("**/api/case/understand", (route) => route.fulfill({ json: { ok: true, skipped: "off" } }));
  await startPage(page, "family");
  // After startPage, whose own court-path answer would otherwise win.
  await page.route("**/api/classify-court-path", (route) => route.fulfill({ json: { primaryPath: "civil", confidence: 0.95, reasoning: "Synthetic reading of the original story." } }));
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel("Tell us what happened in your own words").fill(ORIGINAL);
  await page.getByRole("button", { name: "Continue to Family intake" }).click();
  await expect(page.getByTestId("court-path-suggestion")).toBeVisible();
  await page.getByTestId("court-path-suggestion-keep").click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });

  const panel = page.getByTestId("intake-review");
  await page.getByTestId("intake-start-review").click();
  await panel.getByRole("textbox", { name: "Review: Your story", exact: true }).fill(CORRECTION);
  // The story changes on "Save story", not as it is typed (#470 re-test).
  await page.getByTestId("intake-review").getByTestId("review-story-save").click();
  await recordInitialUnknowns(page);
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed");

  await page.goBack();
  await expect(page.getByLabel("Tell us what happened in your own words")).toHaveValue(CORRECTION);
  await expect(page.getByTestId("court-path-suggestion"), "the old reading is not shown as current").toHaveCount(0);
  await expect(page.getByTestId("reading-outdated")).toContainText("Your story has changed since it was last read");
});
