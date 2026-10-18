import { confirmInitialInformation } from "./harness/intakeReview";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { expect, test, type Route } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { runFamilyIntakeCanonicalIntegration } from "../../src/lib/case-system/orchestration/familyIntakeCanonicalAdapter";
import { runCivilIntakeCanonicalIntegration } from "../../src/lib/case-system/orchestration/civilIntakeCanonicalAdapter";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const ORIGINAL = "Synthetic intake story: I need to organize the events and documents for this matter.";
const UPDATED = "Synthetic revised story: the earlier description was incomplete; these are my corrected facts.";

async function canonicalReply(route: Route, court: "family" | "civil") {
  const { input } = route.request().postDataJSON();
  // Real canonical output, entirely offline. No external AI, auth, or case writes.
  const result = court === "family"
    ? await runFamilyIntakeCanonicalIntegration(input, { allowExternalCognition: false })
    : await runCivilIntakeCanonicalIntegration(input, { allowExternalCognition: false });
  return { ok: true, result, authenticated: false, reasoningMode: "deterministic-fallback", analysisAvailable: false };
}

for (const court of ["family", "civil"] as const) {
  test(`${court} builder: optional research starting on blur does not swallow Continue`, async ({ page }) => {
    test.setTimeout(240_000);
    await fakeAccount(page);
    await page.route("**/api/**", (route) => route.fulfill({ json: { ok: true, classification: "clear", questions: [], passageIds: [] } }));
    let releaseResearch!: () => void;
    let analysisCalls = 0;
    await page.route(`**/api/${court}/analyze`, async (route) => {
      analysisCalls++;
      await route.fulfill({ status: 503, json: { ok: false, error: "Synthetic retryable failure" } });
    });
    await openBuilder(page, court, { story: ORIGINAL });
    await page.getByTestId("guided-form-show-form").click();
    const submit = page.getByTestId(`${court}-intake-continue`);
    await expect(submit).toBeEnabled();
    await expect(submit).toHaveText("Continue to your next steps");
    await page.route("**/api/intake/sourced-questions", async (route) => {
      await new Promise<void>((resolve) => { releaseResearch = resolve; });
      await route.fulfill({ json: { ok: true, questions: [], passageIds: [] } }).catch(() => {});
    });
    await page.getByRole("button", { name: "Edit case story", exact: true }).click();
    const story = page.getByLabel("Case story", { exact: true });
    await story.fill(UPDATED);
    await submit.click();
    await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing");
    expect(analysisCalls).toBe(0);
    expect(releaseResearch).toBeUndefined();
    await page.getByRole("button", { name: "Return to intake controls" }).click();
    await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "collecting");
    await confirmInitialInformation(page);
    await submit.click();
    await expect.poll(() => analysisCalls).toBe(1);
    await expect(page.getByText("Synthetic retryable failure", { exact: true })).toBeVisible();
    await expect(story).toHaveValue(UPDATED);
    await expect(submit).toBeEnabled();
  });

  test(`${court} builder: duplicate submissions, rejected requests and timeout preserve input and allow retry`, async ({ page }) => {
    test.setTimeout(240_000);
    await fakeAccount(page);
    await page.clock.install();
    // Every browser API call is intercepted: this suite makes no paid calls or database writes.
    await page.route("**/api/**", (route) => route.fulfill({ json: { ok: true, classification: "clear", questions: [], passageIds: [] } }));
    let count = 0;
    let release!: () => void;
    await page.route(`**/api/${court}/analyze`, async (route) => {
      count++;
      await new Promise<void>((resolve) => { release = resolve; });
      await route.fulfill({ status: count === 1 ? 400 : 503, json: { ok: false, error: "Synthetic temporary failure. Please try again." } }).catch(() => {});
    });
    await openBuilder(page, court, { story: ORIGINAL });
    await page.getByTestId("guided-form-show-form").click();
    await page.getByRole("button", { name: "Edit case story", exact: true }).click();
    const story = page.getByLabel("Case story", { exact: true });
    const name = page.getByLabel("Your name", { exact: true });
    await name.fill("Synthetic Person");
    const submit = page.getByRole("button", { name: "Continue to your next steps", exact: true });
    await expect(submit).toBeEnabled();
    await confirmInitialInformation(page);
    await submit.evaluate((button) => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
    await expect.poll(() => count).toBe(1);
    await expect(page.getByRole("button", { name: "Reading what you told us...", exact: true })).toBeDisabled();
    release();
    await expect(page.getByText("Synthetic temporary failure. Please try again.", { exact: true })).toBeVisible();
    await expect(story).toHaveValue(ORIGINAL);
    await expect(name).toHaveValue("Synthetic Person");
    await expect(submit).toBeEnabled();

    await confirmInitialInformation(page);
    await submit.click();
    await expect.poll(() => count).toBe(2);
    await page.clock.fastForward(290_001);
    await expect(page.getByText("That request did not finish. Your answers are still here; please try again.", { exact: true })).toBeVisible();
    await expect(story).toHaveValue(ORIGINAL);
    await expect(name).toHaveValue("Synthetic Person");
    await expect(submit).toBeEnabled();
    release();
    await submit.click();
    await expect.poll(() => count).toBe(3);
    release();
    await expect(submit).toBeEnabled();
    await expect(story).toHaveValue(ORIGINAL);
    expect(new URL(page.url()).searchParams.get("step")).not.toBe("results");
  });

  test(`${court} builder: editing facts cancels an older response; only the revised analysis completes`, async ({ page }) => {
    test.setTimeout(240_000);
    await fakeAccount(page);
    await page.route("**/api/**", (route) => route.fulfill({ json: { ok: true, classification: "clear", questions: [], passageIds: [] } }));
    let releaseOld!: () => void;
    let count = 0;
    let lastStory = "";
    await page.route(`**/api/${court}/analyze`, async (route) => {
      const turn = ++count;
      lastStory = route.request().postDataJSON().input.facts;
      const reply = await canonicalReply(route, court);
      if (turn === 1) await new Promise<void>((resolve) => { releaseOld = resolve; });
      await route.fulfill({ json: reply }).catch(() => {});
    });
    await openBuilder(page, court, { story: ORIGINAL });
    await page.getByTestId("guided-form-show-form").click();
    await page.getByRole("button", { name: "Edit case story", exact: true }).click();
    const story = page.getByLabel("Case story", { exact: true });
    const submit = page.getByRole("button", { name: "Continue to your next steps", exact: true });
    await confirmInitialInformation(page);
    await submit.click();
    await expect.poll(() => Boolean(releaseOld)).toBe(true);
    await story.fill(UPDATED);
    await expect(submit).toBeEnabled();
    releaseOld();
    await expect(story).toHaveValue(UPDATED);
    expect(new URL(page.url()).searchParams.get("step")).not.toBe("results");
    await story.press("Tab");
    await expect(submit).toBeEnabled();
    await confirmInitialInformation(page);
    await submit.click();
    await expect.poll(() => count).toBe(2);
    await expect(page).toHaveURL(/step=results/, { timeout: 60_000 });
    expect(count).toBe(2);
    expect(lastStory).toContain(UPDATED);
  });

  test(`${court} builder: a cancelled safety request cannot apply an old warning`, async ({ page }) => {
    test.setTimeout(240_000);
    await fakeAccount(page);
    await page.route("**/api/**", (route) => route.fulfill({ json: { ok: true, questions: [], passageIds: [] } }));
    let release!: () => void;
    let waiting = false;
    let analysisCalls = 0;
    await page.route("**/api/intake/safety-check", async (route) => {
      waiting = true;
      await new Promise<void>((resolve) => { release = resolve; });
      await route.fulfill({ json: { ok: true, classification: "immediate-danger", requestsLegalAdvice: false, userMessage: "Synthetic stale safety notice" } }).catch(() => {});
    });
    await page.route(`**/api/${court}/analyze`, async (route) => {
      analysisCalls++;
      await route.fulfill({ status: 503, json: { ok: false } });
    });
    await openBuilder(page, court, { story: ORIGINAL });
    await page.getByTestId("guided-form-show-form").click();
    await page.getByRole("button", { name: "Edit case story", exact: true }).click();
    await confirmInitialInformation(page);
    await page.getByRole("button", { name: "Continue to your next steps", exact: true }).click();
    await expect.poll(() => waiting).toBe(true);
    await page.getByLabel("Case story", { exact: true }).fill(UPDATED);
    await expect(page.getByRole("button", { name: "Continue to your next steps", exact: true })).toBeEnabled();
    const completed = page.waitForResponse("**/api/intake/safety-check");
    release();
    await completed;
    // Let the response's JSON promise and React update finish before the negative assertion.
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(page.getByText("Synthetic stale safety notice", { exact: true })).toHaveCount(0);
    expect(analysisCalls).toBe(0);
  });
}
