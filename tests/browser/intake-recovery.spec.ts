import { confirmInitialInformation } from "./harness/intakeReview";
﻿import { expect, test } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { openBuilder } from "./harness/builderGate";
import { grantSiteAccess } from "./harness/siteAccess";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });
const OWNER = "11111111-1111-4111-8111-111111111111";
const STORY = "Synthetic unfinished intake: the events and documents still need to be organized.";


for (const court of ["small-claims", "family", "civil"] as const) {
  test(`${court}: refresh and navigation recover unsent answers; failed saves block AI and retry`, async ({ page }) => {
    test.setTimeout(240_000);
    const account = await fakeAccount(page);
    await openBuilder(page, court, { story: court === "small-claims" ? undefined : STORY });
    if (court === "small-claims") await page.getByRole("button", { name: "Fill in the form yourself" }).click();
    else await page.getByTestId("guided-form-show-form").click();
    const name = page.getByLabel(court === "small-claims" ? "Your full legal name or business name" : "Your name", { exact: true });
    await name.fill("Synthetic unfinished name");
    if (court === "small-claims") {
      await page.getByLabel("Case story", { exact: true }).fill(STORY);
    } else await page.getByRole("button", { name: "Edit case story", exact: true }).click();
    const story = page.getByLabel("Case story", { exact: true });
    await expect.poll(() => [...account.rows.values()].some(row => JSON.stringify(row.master_result).includes("Synthetic unfinished name"))).toBe(true);
    const address = page.url();
    // A refresh after analysis returned but before its canonical save must recover intake.
    await page.evaluate(() => { const url = new URL(location.href); url.searchParams.set("step", "results"); history.replaceState(null, "", url); });
    await page.reload();
    await expect(name).toHaveValue("Synthetic unfinished name", { timeout: 60_000 });
    await expect(story).toHaveValue(STORY);
    await page.goto("/about");
    await page.goto(address);
    await expect(name).toHaveValue("Synthetic unfinished name");
    account.fail(true, 401);
    await story.fill(`${STORY} New unsent text after a failed save.`);
    await expect(page.getByTestId("intake-save-status")).toContainText("could not be saved", { timeout: 20_000 });
    const callsBefore = account.calls();
    const submit = court === "small-claims" ? page.getByRole("button", { name: /Continue to your next steps|Analyze my case|Analyse/ }).last() : page.getByTestId(`${court}-intake-continue`);
    await submit.click();
    await expect(page.getByTestId("intake-save-status")).toContainText("could not be saved");
    expect(account.calls()).toBe(callsBefore);
    await page.reload();
    await expect(story).toHaveValue(`${STORY} New unsent text after a failed save.`);
    await expect(page.getByTestId("intake-save-status")).toContainText("could not be saved", { timeout: 20_000 });
    account.fail(false);
    // A queued recovery save may succeed as soon as the connection returns.
    const retry = page.getByRole("button", { name: "Retry saving intake", exact: true });
    await retry.click({ timeout: 2_000 }).catch(async () => {
      await expect(page.getByTestId("intake-save-status")).toContainText("saved to your account");
    });
    await expect(page.getByTestId("intake-save-status")).toContainText("saved to your account");
    expect(account.rows.size).toBe(1);
    const savedId = [...account.rows.keys()][0];
    const saved = [...account.rows.values()][0];
    expect(saved.user_id).toBe(OWNER);
    expect(saved.court_path).toBe(court);
    expect(JSON.stringify(saved.master_result)).toContain("New unsent text after a failed save.");
    await confirmInitialInformation(page);
    await submit.click();
    await expect.poll(() => account.calls()).toBeGreaterThan(callsBefore);
    await expect(page.getByTestId("intake-save-status")).toContainText("saved to your account");
    await page.evaluate(() => sessionStorage.clear());
    await page.goto(`/builder?path=${court}&caseId=${savedId}`);
    await expect(name).toHaveValue("Synthetic unfinished name", { timeout: 60_000 });
    await expect(story).toHaveValue(`${STORY} New unsent text after a failed save.`);
    // Historical completion does not establish explicit confirmation.
    (saved.master_result as Record<string, unknown>).lifecycleStage = "intake-completed";
    (saved.master_result as Record<string, unknown>).workflowStatus = { intakeCompleted: true }; // Historical completion, without new review provenance.
    saved.updated_at = new Date(Date.now() + 1000).toISOString();
    await page.evaluate(() => sessionStorage.clear());
    await page.route(`**/cases/${savedId}`, route => route.fulfill({ contentType: "text/html", body: "<h1>Synthetic completed case</h1>" }));
    await page.goto(`/builder?path=${court}&intake=${savedId}&step=results`);
    await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "collecting");
    expect(new URL(page.url()).pathname).toBe("/builder");
  });

  test(`${court}: question position and an unsent answer survive interruption`, async ({ page }) => {
    test.setTimeout(180_000);
    const account = await fakeAccount(page);
    await openBuilder(page, court);
    if (court === "small-claims") await page.getByRole("button", { name: "Answer questions one at a time with AI help" }).click();
    const question = court === "small-claims" ? page.getByRole("textbox", { name: "Tell us what happened..." }) : page.getByTestId("guided-form-question").getByRole("textbox");
    await question.fill(STORY);
    await expect.poll(() => JSON.stringify([...account.rows.values()])).toContain(STORY);
    await page.reload();
    await expect(question).toHaveValue(STORY, { timeout: 60_000 });
    if (court !== "small-claims") {
      // Correcting an earlier answer in the form must not attach its unsent chat draft to a new question.
      await page.getByTestId("guided-form-show-form").click();
      await page.getByRole("button", { name: "Edit case story", exact: true }).click();
      await page.getByLabel("Case story", { exact: true }).fill(`${STORY} Corrected in the form.`);
      await page.getByRole("button", { name: "Answer one question at a time instead", exact: true }).click();
      const position = page.getByTestId("guided-form-question");
      await expect(position).not.toHaveAttribute("data-key", "facts");
      const key = await position.getAttribute("data-key");
      await page.reload();
      await expect(position).toHaveAttribute("data-key", key!);
    }
    const savedId = [...account.rows.keys()][0];
    await page.goto(`/builder?path=${court}&caseId=55555555-5555-4555-8555-555555555555`);
    await expect(page.getByTestId("intake-save-status")).toContainText("unavailable for this account or court");
    await expect(page.getByTestId("guided-form-question")).toHaveCount(0);
    expect(account.rows.has(savedId)).toBe(true);
  });

  test(`${court}: a response from before another tab's update cannot replace newer intake`, async ({ page }) => {
    test.setTimeout(180_000);
    const account = await fakeAccount(page);
    await grantSiteAccess(page);
    const latestRevision = "66666666-6666-4666-8666-666666666666";
    await page.route("**/api/case/understand", async route => {
      const saved = [...account.rows.values()][0];
      const checkpoint = (saved.master_result as { intakeCheckpoint: { revision: string; sections: object } }).intakeCheckpoint;
      expect(JSON.stringify(checkpoint)).toContain(STORY); // Saved before this expensive request.
      checkpoint.revision = latestRevision;
      await route.fulfill({ json: {
        ok: true,
        understanding: { summary: "Synthetic stale reading", facts: [], matters: [], mainCourt: court, side: "starting", stage: "", questions: [{ question: "Stale question?" }], asksForPrediction: false, step: null, regime: null },
        answer: { status: "answered", statements: [], notConfirmed: [], declinedToJudge: false },
      } });
    });
    await page.goto(`/?path=${court}`);
    await page.getByLabel("City or municipality").fill("Ottawa");
    const story = page.getByLabel("Tell us what happened in your own words");
    await story.fill(STORY);
    const label = court === "small-claims" ? "Small Claims" : court === "family" ? "Family" : "Civil";
    await page.getByRole("button", { name: `Continue to ${label} intake` }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Your answers are still here" })).toBeVisible();
    await expect(page.getByLabel("Stale question?", { exact: true })).toHaveCount(0);
    await expect(story).toHaveValue(STORY);
    expect(JSON.stringify([...account.rows.values()])).toContain(latestRevision);
    await page.reload();
    await expect(story).toHaveValue(STORY);
    await expect(page.getByTestId("intake-save-status")).toContainText("Another tab changed");
    await expect(page.getByRole("link", { name: "Open the saved intake separately" })).toHaveAttribute("rel", "noopener noreferrer");
  });

  test(`${court}: guest recovery stays in the exact flow; a fresh start stays empty`, async ({ page }) => {
    test.setTimeout(180_000);
    await grantSiteAccess(page);
    await page.route("**/api/**", route => route.fulfill({ status: 503, json: { ok: false } }));
    await page.goto(`/?path=${court}`);
    const story = page.getByLabel("Tell us what happened in your own words");
    await story.fill(STORY);
    await page.getByLabel("City or municipality").fill("Ottawa");
    await page.reload();
    await expect(story).toHaveValue(STORY);
    await page.goto(`/?path=${court}`);
    // A fresh start first asks before discarding the unsaved case (2026-10-18).
    await page.getByTestId("unsaved-case-discard").click();
    await expect(story).toHaveValue("");
    await expect(page.getByLabel("City or municipality")).toHaveValue("");
  });
}
