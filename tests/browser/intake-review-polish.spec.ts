/**
 * PR #463 re-test, remaining review items (2026-10-18):
 *  - opening "Review or correct initial information" does not cancel the
 *    confirmation; an actual edit there returns it to review (not the start);
 *  - Confirm says what is still needed, and Small Claims' date, side and kind of
 *    dispute are offered from the story as suggestions the person chooses —
 *    no forced "I do not know yet";
 *  - stored choices read "Not sure", not "not-sure"; Family's boxes carry the
 *    form's labels, not code names; empty optional details are hidden;
 *  - starting a new case warns before it discards an unsaved one.
 */
import { expect, test, type Page } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { grantSiteAccess } from "./harness/siteAccess";
import { confirmInitialInformation } from "./harness/intakeReview";
import { fakeAccount } from "./harness/syntheticIntakeAccount";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const SC_STORY = "Synthetic story: I paid a contractor $9,000 on May 12, 2026 to fix my roof and he never came back.";
const FAMILY_STORY = "Synthetic story: my former partner and I separated in March 2026 and we have not agreed on parenting time.";

async function smallClaimsFromStart(page: Page, story = SC_STORY) {
  await grantSiteAccess(page);
  await page.route("**/api/case/understand", (route) => route.fulfill({ json: { ok: true, skipped: "off" } }));
  await page.route("**/api/classify-court-path", (route) => route.fulfill({ json: { primaryPath: "small-claims", confidence: 0.95 } }));
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel("Tell us what happened in your own words").fill(story);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) {
    await acknowledgement.check();
    await page.getByTestId("acknowledgement-continue").click();
  }
}

test("Small Claims: suggestions from the story answer the initial questions; Confirm says what is missing", async ({ page }) => {
  test.setTimeout(180_000);
  await smallClaimsFromStart(page);
  const panel = page.getByTestId("intake-review");
  await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  const needs = page.getByTestId("intake-confirm-needs");
  await expect(needs).toContainText("What kind of dispute is this?");
  await expect(needs).toContainText("I have reviewed this information");
  await expect(page.getByTestId("intake-confirm")).toBeDisabled();

  // Suggested, never chosen for the person.
  const role = page.locator('[data-question="sc-orient-role"]');
  await expect(role.getByRole("button", { name: "Bringing the claim (plaintiff) (suggested from your story)" })).toHaveAttribute("aria-pressed", "false");
  await role.getByRole("button", { name: /Bringing the claim/ }).click();
  const kind = page.locator('[data-question="sc-orient-dispute-category"]');
  await kind.getByRole("button", { name: /Work or a service you paid for .*\(suggested from your story\)/ }).click();
  const when = page.locator('[data-question="sc-orient-when-happened"]');
  if (await when.count()) {
    await expect(when.getByLabel(/^Answer: /)).toHaveValue("2026-05-12");
    await when.getByRole("button", { name: "Use this date" }).click();
  }
  await expect(page.locator('input[data-testid="intake-unknown"]:checked')).toHaveCount(0);
  await expect(needs).not.toContainText("an answer");
  await page.getByTestId("intake-review-acknowledgement").check();
  await expect(needs).toHaveCount(0);
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
});

test("Small Claims: viewing the confirmed review does not cancel it; an edit there returns it to review", async ({ page }) => {
  test.setTimeout(180_000);
  await smallClaimsFromStart(page);
  const panel = page.getByTestId("intake-review");
  await confirmInitialInformation(page);
  await page.getByTestId("intake-view-review").click();
  await expect(panel.getByRole("textbox", { name: "Review: Your story", exact: true })).toHaveValue(SC_STORY);
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
  await page.getByTestId("intake-close-review").click();
  await page.reload();
  await expect(panel, "looking was not a change").toHaveAttribute("data-phase", "user-confirmed");

  await page.getByTestId("intake-view-review").click();
  await panel.getByRole("textbox", { name: "Review: Your story", exact: true }).fill(`${SC_STORY} He also kept the deposit.`);
  await expect(panel, "an actual change needs confirming again, from the review").toHaveAttribute("data-phase", "reviewing");
  await page.reload();
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
});

test("Family: boxes carry the form's labels, stored choices read in words, empty optional details are hidden", async ({ page }) => {
  test.setTimeout(180_000);
  await openBuilder(page, "family", { story: FAMILY_STORY });
  await page.getByTestId("guided-form-show-form").click();
  const panel = page.getByTestId("intake-review");
  await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  const text = await panel.innerText();
  for (const codeName of ["Past Living History", "Property Home Details", "Current Living Situation", "Safety Concerns", "Adoption Details", "Missing Evidence", "Case Stage", "Your Name"]) {
    expect(text, `no box is labelled from its code name: ${codeName}`).not.toContain(codeName);
  }
  expect(text, "a stored choice reads in words").not.toMatch(/\bnot-sure\b/);
  expect(text, "empty optional details are hidden").not.toContain("Evidence still missing (optional later detail)");
  const unlabeled = await panel.locator("textarea:not([aria-label]), input[type=checkbox]:not([aria-label]):not([data-testid])").count();
  expect(unlabeled, "every review box has a label").toBe(0);
});

test("starting a new case warns before discarding an unsaved one", async ({ page }) => {
  test.setTimeout(180_000);
  await openBuilder(page, "family", { story: FAMILY_STORY });
  const firstUrl = page.url();
  await page.goto("/builder?path=small-claims");
  const warning = page.getByTestId("unsaved-case-warning");
  await expect(warning).toContainText("You have an unsaved case in this tab");
  await expect(warning).toContainText("Family case");
  await warning.getByTestId("unsaved-case-keep").click();
  await expect(page).toHaveURL(new RegExp(new URL(firstUrl).searchParams.get("intake")!));
  await expect(page.getByTestId("intake-review")).toBeVisible();
  const kept = await page.evaluate(() => sessionStorage.getItem("courtSimplifiedGuestIntakeSession") ?? "");
  expect(kept).toContain("parenting time");

  await page.goto("/builder?path=small-claims");
  await page.getByTestId("unsaved-case-discard").click();
  await expect(page.getByTestId("unsaved-case-warning")).toHaveCount(0);
  await expect(page.getByTestId("intake-review")).toBeVisible({ timeout: 60_000 });
  const fresh = await page.evaluate(() => sessionStorage.getItem("courtSimplifiedGuestIntakeSession") ?? "");
  expect(fresh, "the discarded case is gone").not.toContain("parenting time");
});

// Re-test round 2.
test("signed in, Small Claims: the first Show my next step keeps the confirmation", async ({ page }) => {
  test.setTimeout(180_000);
  const account = await fakeAccount(page);
  await smallClaimsFromStart(page);
  const panel = page.getByTestId("intake-review");
  await confirmInitialInformation(page);
  await expect.poll(() => account.rows.size).toBe(1);
  await page.getByTestId("intake-continue-guidance").click();
  // The form opens and registers its defaults; that is not a change of facts.
  await expect(page.getByTestId("sc-intake-edit-story")).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1500);
  await expect(panel, "the first click keeps the confirmation").toHaveAttribute("data-phase", "user-confirmed");
  await expect(page.getByTestId("intake-confirm-needs")).toHaveCount(0);
});

test("Small Claims: month and year, and the side of someone who paid, are suggested", async ({ page }) => {
  test.setTimeout(180_000);
  await smallClaimsFromStart(page, "Synthetic story: a contractor took a $3,000 deposit and never did the work, in August 2026.");
  await page.getByTestId("intake-start-review").click();
  await expect(page.locator('[data-question="sc-orient-when-happened"]').getByLabel(/^Answer: /)).toHaveValue("August 2026");
  await expect(page.locator('[data-question="sc-orient-role"]').getByRole("button", { name: "Bringing the claim (plaintiff) (suggested from your story)" })).toBeVisible();
});

test("Family: one sentence that answers several questions is confirmed once", async ({ page }) => {
  test.setTimeout(180_000);
  await openBuilder(page, "family", { story: "Synthetic story: we were never married and there has never been a court order. I was served with her Application on October 9, 2026." });
  const offer = page.getByTestId("guided-form-from-story");
  await expect(offer).toBeVisible({ timeout: 60_000 });
  const group = (await offer.getAttribute("data-group")) ?? "";
  expect(group.split(" ").length, `the served sentence answers several questions at once (${group})`).toBeGreaterThan(1);
  await page.getByTestId("guided-form-from-story-yes").click();
  const quote = "I was served with her Application on October 9, 2026";
  await expect(page.getByTestId("guided-form-from-story").filter({ hasText: quote })).toHaveCount(0);
  await expect(page.getByText("You told us there is already a court order")).toHaveCount(0);
});

// Re-test round 3 (2026-10-18).
test("Small Claims guided: a saved story shows as text with Send and Edit; an outdated reading is set aside", async ({ page }) => {
  test.setTimeout(180_000);
  await smallClaimsFromStart(page);
  await page.getByRole("button", { name: "Answer questions one at a time with AI help" }).click();
  const saved = page.getByTestId("guided-saved-story");
  await expect(saved, "the saved story is visible, not hidden in an empty-looking box").toContainText(SC_STORY);
  await expect(page.getByRole("textbox", { name: "Tell us what happened..." })).toHaveCount(0);
  await saved.getByRole("button", { name: "Edit my story" }).click();
  await expect(page.getByRole("textbox", { name: "Tell us what happened..." }), "editing shows the story itself").toHaveValue(SC_STORY);

  // A conversation that read an earlier version of the story.
  await page.evaluate(() => {
    const value = JSON.parse(sessionStorage.getItem("courtSimplifiedGuestIntakeSession")!);
    value.checkpoint.sections.guided = { ...value.checkpoint.sections.guided, started: true, intakeComplete: true, readFrom: "Synthetic EARLIER story that was read first.",
      messages: [{ from: "user", text: "", isStory: true }, { from: "user", text: "Confirmed from my story:\n• Synthetic stale reading" }] };
    value.checkpoint.revision = crypto.randomUUID();
    sessionStorage.setItem("courtSimplifiedGuestIntakeSession", JSON.stringify(value));
  });
  await page.reload();
  await expect(page.getByTestId("guided-reading-outdated")).toContainText("Your story has changed since it was last read");
  await expect(page.getByText("Synthetic stale reading"), "the old reading is not listed").toHaveCount(0);
  await page.getByRole("button", { name: "Start the questions again from my story" }).click();
  await expect(page.getByTestId("guided-saved-story")).toContainText(SC_STORY);
});

test("Family: being served is not recorded as an application filed without its own question; the served date is in the review", async ({ page }) => {
  test.setTimeout(180_000);
  await openBuilder(page, "family", { story: "Synthetic story: I got served the papers last week. This is not a court order, just a separation." });
  const offer = page.getByTestId("guided-form-from-story");
  await expect(offer).toBeVisible({ timeout: 60_000 });
  expect((await offer.getAttribute("data-group")) ?? "", "the filed reading is not folded into another confirmation").not.toMatch(/filedDocuments.+|.+filedDocuments/);
  await page.getByTestId("guided-form-from-story-yes").click();
  const filed = page.locator('[data-testid="guided-form-from-story"][data-group="filedDocuments"]');
  // Pass over the questions the story does not answer ("What is the case about?") to reach it.
  for (let step = 0; step < 4 && !(await filed.isVisible()); step++) {
    const next = page.getByTestId("guided-form-next");
    if (await next.isVisible()) await next.click();
  }
  await expect(filed, "'What has been filed' is asked on its own").toBeVisible();
  await expect(filed).toContainText("Is that right?");

  const panel = page.getByTestId("intake-review");
  await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  await expect(panel).toContainText("Day you were served");
  await expect(panel).toContainText("Your story says: “Synthetic story: I got served the papers last week.”");
  // Typed key by key (re-test round 4: spaces vanished while typing; pasting kept them).
  const served = panel.getByRole("textbox", { name: "Review: Day you were served", exact: true });
  await served.click();
  await served.pressSequentially("October 12, 2026", { delay: 30 });
  await expect(served, "spaces survive typing").toHaveValue("October 12, 2026");
  await served.press("Tab");
  await expect(served).toHaveValue("October 12, 2026");
  await expect(panel.getByRole("textbox", { name: "Review: Timeline", exact: true }), "the served date is kept in the Timeline, as typed").toHaveValue(/October 12, 2026/);
  expect(await panel.innerText()).not.toMatch(/Property \/ equalization|Matrimonial home \/ exclusive possession/);
});

// Re-test round 4: a signed-in person was told "You have an unsaved case in this tab
// ... It is not saved to an account" for a case that was saved. Only text that has
// really not reached the account may raise it.
test("signed in: a saved case raises no unsaved-case warning; a failed save does", async ({ page }) => {
  test.setTimeout(240_000);
  const account = await fakeAccount(page);
  await openBuilder(page, "small-claims");
  await page.getByRole("button", { name: "Fill in the form yourself" }).click();
  await page.getByLabel("Case story", { exact: true }).fill(SC_STORY);
  await expect.poll(() => JSON.stringify([...account.rows.values()])).toContain(SC_STORY);
  await expect(page.getByTestId("intake-save-status")).toContainText("Intake saved to your account");
  await page.goto("/builder?path=small-claims");
  await expect(page.getByLabel("Province or territory"), "everything was saved: a new case starts, no warning").toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("unsaved-case-warning")).toHaveCount(0);
  await openBuilder(page, "small-claims");

  // Now text that cannot reach the account.
  await page.getByRole("button", { name: "Fill in the form yourself" }).click();
  account.fail(true);
  await page.getByLabel("Case story", { exact: true }).fill("Synthetic second story that could not be saved.");
  await expect(page.getByTestId("intake-save-status")).toContainText(/could not be saved|not saved/i, { timeout: 30_000 });
  page.on("dialog", (dialog) => void dialog.accept()); // the browser's own "leave this page?" for unsaved text
  await page.goto("/builder?path=small-claims");
  await expect(page.getByTestId("unsaved-case-warning")).toContainText("has not reached your account yet");
});
