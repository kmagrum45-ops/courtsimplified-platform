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
import { confirmInitialInformation, saveCaseStory } from "./harness/intakeReview";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { passSituationGate } from "./harness/situation";
import { serveFromThisCommit } from "./harness/thisCommitServer";
import { confirmAndShowNextStep, expectServedNotAskedOnNextStep, expectServedOfferedOnceInReview } from "./harness/servedOnce";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

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
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(story);
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

  // The side was given in the situation questions (step 2): not asked again here.
  await expect(page.locator('[data-question="sc-orient-role"]')).toHaveCount(0);
  // Suggested, never chosen for the person.
  const kind = page.locator('[data-question="sc-orient-dispute-category"]');
  await kind.getByRole("button", { name: /^Use the suggestion: Work or a service you paid for/ }).click();
  const when = page.locator('[data-question="sc-orient-when-happened"]');
  if (await when.count()) {
    await when.getByRole("button", { name: "Use the suggestion: 2026-05-12" }).click();
  }
  // Choosing a side brings up the questions that depend on it (re-test round 7).
  // An amount already paid is never offered in one click (#471 re-test): it is typed.
  const amount = page.locator('[data-question="sc-amount-claimed"]');
  await expect(amount.getByRole("button", { name: /^Use the suggestion/ })).toHaveCount(0);
  await amount.getByLabel(/^Answer: /).fill("$9,000");
  await amount.getByLabel(/^Answer: /).press("Tab");
  // "Nothing filed yet" was given in the situation questions too.
  await expect(page.locator('[data-question="sc-claim-filed"]')).toHaveCount(0);
  const outcome = page.locator('[data-question="sc-remedy-sought"]').getByLabel(/^Answer: /);
  await outcome.fill("Synthetic: my $9,000 back");
  await outcome.press("Tab");
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
  // The story changes on "Save story", not as it is typed (#470 re-test).
  await page.getByTestId("intake-review").getByTestId("review-story-save").click();
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

test("Small Claims: month and year are suggested; the side, given at the start, is not asked again", async ({ page }) => {
  test.setTimeout(180_000);
  await smallClaimsFromStart(page, "Synthetic story: a contractor took a $3,000 deposit and never did the work, in August 2026.");
  await page.getByTestId("intake-start-review").click();
  await expect(page.locator('[data-question="sc-orient-when-happened"]').getByRole("button", { name: "Use the suggestion: August 2026" })).toBeVisible();
  await expect(page.locator('[data-question="sc-orient-role"]')).toHaveCount(0);
  await expect(page.getByTestId("situation-line")).toContainText("You're suing in Small Claims Court");
});

// Step 2: the side is the situation answer, so the served sentence no longer answers it; what
// it still answers -- what was filed (asked on its own by design) and the day -- is each
// confirmed once, and the sentence is never offered again after its questions are answered.
test("Family: one sentence that answers several questions is confirmed once per question, never again", async ({ page }) => {
  test.setTimeout(180_000);
  await openBuilder(page, "family", { story: "Synthetic story: we were never married and there has never been a court order. I was served with her Application on October 9, 2026.", situation: { where: "going", started: "them", papers: "not-sure", receivedOn: "unknown" } });
  const quote = "I was served with her Application on October 9, 2026";
  const offer = page.getByTestId("guided-form-from-story");
  const confirmed: string[] = [];
  for (let step = 0; step < 12; step++) {
    const skip = page.getByTestId("guided-form-skip");
    await expect(skip.or(offer).or(page.getByTestId("guided-form-done")).first()).toBeVisible({ timeout: 60_000 });
    if (await offer.isVisible()) {
      const group = (await offer.getAttribute("data-group")) ?? "";
      if ((await offer.innerText()).includes(quote)) {
        for (const key of group.split(" ")) {
          expect(confirmed, `"${key}" is offered from the same sentence a second time`).not.toContain(key);
          confirmed.push(key);
        }
      }
      await page.getByTestId("guided-form-from-story-yes").click();
    } else if (await skip.isVisible()) await skip.click();
    else break;
  }
  expect(confirmed.sort(), "the sentence answers what was filed and the day, each once").toEqual(["filedDocuments", "servedDate"]);
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
  await expect(page.getByRole("textbox", { name: STORY_LABEL, exact: true })).toHaveCount(0);
  await saved.getByRole("button", { name: "Edit my story" }).click();
  await expect(page.getByRole("textbox", { name: STORY_LABEL, exact: true }), "editing shows the story itself").toHaveValue(SC_STORY);

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
  test.setTimeout(240_000);
  // Signed in, with this commit's own server, so the next step can be opened at the end.
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "family", account.rows as unknown as Map<string, Record<string, unknown>>);
  await openBuilder(page, "family", { story: "Synthetic story: I got served the papers last week. This is not a court order, just a separation.", situation: { where: "going", started: "them", papers: "not-sure", receivedOn: "unknown" } });
  const offer = page.getByTestId("guided-form-from-story");
  for (let step = 0; step < 4 && !(await offer.isVisible()); step++) {
    const skip = page.getByTestId("guided-form-skip");
    await expect(skip.or(offer).first()).toBeVisible({ timeout: 60_000 });
    if (await skip.isVisible()) await skip.click();
  }
  await expect(offer).toBeVisible({ timeout: 60_000 });
  // With the side from the start (step 2), the first reading offered is what was filed: on its own.
  const filed = page.locator('[data-testid="guided-form-from-story"][data-group="filedDocuments"]');
  await expect(filed, "'What has been filed' is asked on its own").toBeVisible();
  await expect(filed).toContainText("Is that right?");

  const panel = page.getByTestId("intake-review");
  await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  await expect(panel).toContainText("Day you were served");
  await expect(panel).toContainText("Your story says: “Synthetic story: I got served the papers last week.”");
  // Offered once more in the review, as one field (Jason, 2026-10-24, option 1).
  await expectServedOfferedOnceInReview(page);
  // Typed key by key (re-test round 4: spaces vanished while typing; pasting kept them).
  const served = panel.getByRole("textbox", { name: "Review: Day you were served", exact: true });
  await served.click();
  await served.pressSequentially("October 12, 2026", { delay: 30 });
  await expect(served, "spaces survive typing").toHaveValue("October 12, 2026");
  await served.press("Tab");
  await expect(served).toHaveValue("October 12, 2026");
  await expect(panel.getByRole("textbox", { name: "Review: Timeline", exact: true }), "the served date is kept in the Timeline, as typed").toHaveValue(/October 12, 2026/);
  expect(await panel.innerText()).not.toMatch(/Property \/ equalization|Matrimonial home \/ exclusive possession/);
  // Offered exactly once: the next step does not ask it again.
  await confirmAndShowNextStep(page);
  await expectServedNotAskedOnNextStep(page);
});

// Re-test round 4: a signed-in person was told "You have an unsaved case in this tab
// ... It is not saved to an account" for a case that was saved. Only text that has
// really not reached the account may raise it.
test("signed in: a saved case raises no unsaved-case warning; a failed save does", async ({ page }) => {
  test.setTimeout(240_000);
  const account = await fakeAccount(page);
  await openBuilder(page, "small-claims");
  await page.getByRole("button", { name: "Fill in the form yourself" }).click();
  await page.getByLabel("Case story", { exact: true }).fill(SC_STORY); await saveCaseStory(page);
  // Everything saved: the story itself in the saved case, not only its draft (step 2 made the
  // case save earlier, at the first situation answer, so the story's own save can land after
  // the status first says "saved").
  await expect.poll(() => [...account.rows.values()].map((row) => (((row.master_result as Record<string, unknown>)?.intakeCheckpoint as { sections?: { story?: { text?: string } } })?.sections?.story?.text)).join("|"), { timeout: 30_000 }).toContain(SC_STORY);
  await expect(page.getByTestId("intake-save-status")).toContainText("Intake saved to your account");
  await page.goto("/builder?path=small-claims");
  // A new case starts with the situation questions (step 2), and no warning.
  await passSituationGate(page);
  await expect(page.getByLabel("Province or territory"), "everything was saved: a new case starts, no warning").toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("unsaved-case-warning")).toHaveCount(0);
  await openBuilder(page, "small-claims");

  // Now text that cannot reach the account.
  await page.getByRole("button", { name: "Fill in the form yourself" }).click();
  account.fail(true);
  await page.getByLabel("Case story", { exact: true }).fill("Synthetic second story that could not be saved."); await saveCaseStory(page);
  await expect(page.getByTestId("intake-save-status")).toContainText(/could not be saved|not saved/i, { timeout: 30_000 });
  page.on("dialog", (dialog) => void dialog.accept()); // the browser's own "leave this page?" for unsaved text
  await page.goto("/builder?path=small-claims");
  await expect(page.getByTestId("unsaved-case-warning")).toContainText("has not reached your account yet");
});

// Re-test round 5: after a story change, "Show my next step" from the route chooser
// still built the next step from the questions' reading of the OLD story (its claim
// type and checklist). It is blocked on every route until the questions start again.
test("Small Claims: questions that read an earlier story block every route's next step", async ({ page }) => {
  test.setTimeout(240_000);
  let analysed = 0;
  page.on("request", (request) => { if (/\/api\/small-claims\/analyze/.test(request.url())) analysed++; });
  await smallClaimsFromStart(page);
  await confirmInitialInformation(page);
  // The guided questions read an earlier version of the story (a claim type with it).
  await page.evaluate(() => {
    const value = JSON.parse(sessionStorage.getItem("courtSimplifiedGuestIntakeSession")!);
    value.checkpoint.sections.guided = { ...value.checkpoint.sections.guided, started: true, intakeComplete: true,
      readFrom: "Synthetic EARLIER story: I paid a contractor $3,000 in August 2026 and he never did the work.",
      matchedClaimType: { claimTypeId: "sc-claim-contractor-took-deposit-and-left", name: "Synthetic old claim type" } };
    value.checkpoint.revision = crypto.randomUUID();
    sessionStorage.setItem("courtSimplifiedGuestIntakeSession", JSON.stringify(value));
  });
  await page.reload();
  const panel = page.getByTestId("intake-review");
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
  const show = page.getByTestId("intake-continue-guidance");
  const message = page.getByTestId("intake-review").getByTestId("story-changed-beside-button");

  // The route chooser.
  await expect(page.getByRole("button", { name: "Fill in the form yourself" })).toBeVisible();
  await expect(show, "chooser: blocked").toBeDisabled();
  await expect(message, "the message sits beside the button").toContainText("Start the questions again from your story first");
  expect(Math.abs((await message.boundingBox())!.y - (await show.boundingBox())!.y), "next to the button, not further down").toBeLessThan(200);

  // The form route: its own Continue is disabled, with the message beside it.
  await page.getByRole("button", { name: "Fill in the form yourself" }).click();
  await expect(show, "form: blocked").toBeDisabled();
  await expect(page.getByTestId("sc-intake-analyze"), "the form's own Continue is disabled").toBeDisabled();
  await expect(page.getByTestId("sc-intake-story-changed")).toContainText("Start the questions again from my story");

  // The guided route.
  await page.goBack();
  await message.getByRole("button", { name: "Go to the questions" }).click();
  await expect(page.getByTestId("guided-reading-outdated")).toContainText("Your story has changed since it was last read");
  await expect(page.getByTestId("guided-reading-outdated"), "Go to the questions scrolls to them").toBeInViewport({ timeout: 10_000 });
  await expect(show, "guided: blocked").toBeDisabled();
  expect(analysed, "no next step was built from the old reading").toBe(0);

  // Starting the questions again clears the block.
  await page.getByRole("button", { name: "Start the questions again from my story" }).click();
  await expect(message).toHaveCount(0);
  await expect(show).toBeEnabled();
});

// Re-test round 7: the whole Small Claims restart path, start to next step, with no
// "I do not know yet". The analysis is answered offline by the real engine.
test("Small Claims: answer, confirm, change the story, start again once, answer in the review, confirm, reach the next step", async ({ page }) => {
  test.setTimeout(240_000);
  await fakeAccount(page);
  await page.route("**/api/intake/safety-check", (route) => route.fulfill({ json: { ok: true, classification: "clear", requestsLegalAdvice: false } }));
  let sent: Record<string, unknown> | null = null;
  await page.route("**/api/small-claims/analyze", async (route) => {
    const { input } = route.request().postDataJSON();
    sent = input;
    const { analyzeSmallClaimsWithBrain } = await import("../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine");
    await route.fulfill({ json: { ok: true, result: await analyzeSmallClaimsWithBrain(input, { allowExternalCognition: false }), authenticated: true, reasoningMode: "deterministic-fallback", analysisAvailable: false } });
  });
  await smallClaimsFromStart(page);
  const panel = page.getByTestId("intake-review");
  const question = (id: string) => page.locator(`[data-question="${id}"]`);

  // Answer and confirm (the old story).
  await page.getByTestId("intake-start-review").click();
  // The side and "nothing filed" were given in the situation questions (step 2).
  await expect(question("sc-orient-role")).toHaveCount(0);
  await question("sc-orient-dispute-category").getByRole("button", { name: /Work or a service you paid for/ }).click();
  await question("sc-orient-when-happened").getByTestId("intake-use-suggestion").click();
  await question("sc-amount-claimed").getByLabel(/^Answer: /).fill("$9,000");
  await question("sc-amount-claimed").getByLabel(/^Answer: /).press("Tab");
  await question("sc-remedy-sought").getByLabel(/^Answer: /).fill("Synthetic: my $9,000 back");
  await question("sc-remedy-sought").getByLabel(/^Answer: /).press("Tab");
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed");

  // The story changes: an unpaid invoice.
  await page.getByTestId("intake-view-review").click();
  await panel.getByRole("textbox", { name: "Review: Your story", exact: true }).fill("Synthetic: I finished renovation work on June 10, 2026 and sent an invoice for $8,500. Payment was due July 10, 2026 and the client never paid.");
  // The story changes on "Save story", not as it is typed (#470 re-test).
  await page.getByTestId("intake-review").getByTestId("review-story-save").click();
  await panel.getByTestId("story-changed-beside-button").getByRole("button", { name: "Go to the questions" }).click();

  // One click starts the questions again.
  await page.getByRole("button", { name: "Start the questions again from my story" }).filter({ visible: true }).first().click();
  await expect(page.getByTestId("story-changed-beside-button"), "one click clears the block").toHaveCount(0);

  // The review asks again, with the story's date (June 10, not the July 10 due date) suggested.
  await question("sc-orient-when-happened").getByRole("button", { name: "Use the suggestion: 2026-06-10" }).click();
  // A story change never sets the situation answers aside: the side is not asked again.
  await expect(question("sc-orient-role")).toHaveCount(0);
  await question("sc-orient-dispute-category").getByRole("button", { name: /Unpaid money owed to you/ }).click();
  // Typed values count when the box is left; no separate button.
  await question("sc-amount-claimed").getByLabel(/^Answer: /).fill("$8,500");
  await question("sc-amount-claimed").getByLabel(/^Answer: /).press("Tab");
  await expect(question("sc-claim-filed")).toHaveCount(0);
  await question("sc-remedy-sought").getByLabel(/^Answer: /).fill("Synthetic: payment of the invoice");
  await question("sc-remedy-sought").getByLabel(/^Answer: /).press("Tab");
  await expect(page.locator('input[data-testid="intake-unknown"]:checked'), "no 'I do not know yet' needed").toHaveCount(0);
  await expect(page.getByTestId("intake-confirm-needs")).not.toContainText("an answer");
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed");

  // The next step, built from these answers.
  await page.getByTestId("intake-continue-guidance").click();
  await expect(page).toHaveURL(/step=results/, { timeout: 60_000 });
  expect(String((sent as Record<string, unknown> | null)?.amountClaimed ?? ""), "the review's amount reaches the analysis").toContain("8,500");
});

// #469 re-test: civil's remaining questions had only "I do not know yet" boxes.
test("civil: every remaining question in the review can be answered there, and an answer clears it", async ({ page }) => {
  test.setTimeout(180_000);
  await openBuilder(page, "civil", { story: "Synthetic story: a supplier kept my $62,000 deposit and never delivered the equipment." });
  await page.getByTestId("guided-form-show-form").click();
  const panel = page.getByTestId("intake-review");
  await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  const questions = panel.getByTestId("intake-initial-question");
  const count = await questions.count();
  test.skip(count === 0, "the story answered every initial question");
  for (let index = 0; index < count; index++) {
    const question = questions.nth(index);
    const answerable = question.locator("button:not([data-testid=intake-unknown]), input[type=text], input[data-testid=intake-field-pick]");
    expect(await answerable.count(), `"${await question.locator("p").first().innerText()}" has a way to answer it`).toBeGreaterThan(0);
  }
  const first = questions.first();
  const id = await first.getAttribute("data-question");
  const choice = first.getByTestId("intake-field-choice").first();
  const pick = first.getByTestId("intake-field-pick").first();
  if (await choice.count()) await choice.click();
  else if (await pick.count()) { await pick.check(); await first.getByTestId("intake-field-save").click(); }
  else {
    const box = first.locator("input[type=text]");
    await box.fill("Synthetic answer");
    await box.press("Enter");
  }
  await expect(panel.locator(`[data-testid=intake-initial-question][data-question="${id}"]`)).toHaveAttribute("data-answered", "true");
});
