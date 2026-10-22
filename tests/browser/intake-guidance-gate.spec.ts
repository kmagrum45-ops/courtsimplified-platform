import { expect, test, type Route } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { confirmInitialInformation, saveCaseStory } from "./harness/intakeReview";
import { grantSiteAccess } from "./harness/siteAccess";
import { runFamilyIntakeCanonicalIntegration } from "../../src/lib/case-system/orchestration/familyIntakeCanonicalAdapter";
import { runCivilIntakeCanonicalIntegration } from "../../src/lib/case-system/orchestration/civilIntakeCanonicalAdapter";
import { analyzeSmallClaimsWithBrain } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { guidanceIsCurrent } from "../../src/lib/case-system/intakeReview";

test.use({ trace: "off", screenshot: "off", actionTimeout: 30_000, navigationTimeout: 120_000 });
const STORY = "Synthetic facts: I need help organizing this matter, the parties and dates.";
async function reply(route: Route, court: "small-claims" | "family" | "civil") {
  const { input } = route.request().postDataJSON();
  const result = court === "family" ? await runFamilyIntakeCanonicalIntegration(input, { allowExternalCognition: false }) : court === "civil" ? await runCivilIntakeCanonicalIntegration(input, { allowExternalCognition: false }) : await analyzeSmallClaimsWithBrain(input, { allowExternalCognition: false });
  return { ok: true, result, authenticated: true, reasoningMode: "deterministic-fallback", analysisAvailable: false };
}
for (const court of ["small-claims", "family", "civil"] as const) {
  test(`${court}: confirmation gates generation and presentation; edits and recovery withhold old guidance`, async ({ page }) => {
    test.setTimeout(240_000);
    const account = await fakeAccount(page);
    let analysisCalls = 0;
    await page.route(`**/api/${court}/analyze`, async route => {
      analysisCalls++;
      const row = [...account.rows.values()][0];
      const master = row.master_result as Record<string, unknown>;
      expect((master.workflowStatus as Record<string, unknown>).intakeCompleted).toBe(true);
      expect(route.request().headers()["x-courtsimplified-case-id"]).toBe(row.id);
      expect(route.request().headers()["x-courtsimplified-input-revision"]).toBe((master.intakeCheckpoint as Record<string, unknown>).inputRevision);
      await route.fulfill({ json: await reply(route, court) });
    });
    await openBuilder(page, court, { story: court === "small-claims" ? undefined : STORY });
    if (court === "small-claims") { await page.getByRole("button", { name: "Fill in the form yourself" }).click(); await page.getByLabel("Case story", { exact: true }).fill(STORY); }
    else await page.getByTestId("guided-form-show-form").click();
    const overview = page.getByTestId("completed-case-overview");
    await expect(overview).toHaveCount(0);
    const submit = page.getByRole("button", { name: "Continue to your next steps", exact: true });
    await submit.click();
    await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing");
    expect(analysisCalls).toBe(0);
    await expect(overview).toHaveCount(0);
    await expect(page.getByTestId("intake-confirm")).toBeDisabled();
    await page.reload();
    await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing");
    await confirmInitialInformation(page);
    await submit.click();
    await expect(overview).toBeVisible({ timeout: 60_000 });
    expect(analysisCalls).toBe(1);
    const row = [...account.rows.values()][0];
    await expect.poll(() => guidanceIsCurrent(row.master_result, court, String(row.id))).toBe(true);
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-case")).toHaveAttribute("href", `/cases/${row.id}`);
    const master = row.master_result as Record<string, unknown>;
    master.documents = { reference: "retained-document" }; master.evidence = { reference: "retained-evidence" };
    await page.goto(`/builder?path=${court}&caseId=${row.id}&step=form`);
    await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "user-confirmed");
    if (court !== "small-claims") await page.getByRole("button", { name: "Edit case story", exact: true }).click();
    await page.getByLabel("Case story", { exact: true }).fill(`${STORY} A material correction.`);
    await saveCaseStory(page);
    await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "collecting");
    await expect.poll(() => guidanceIsCurrent(row.master_result, court, String(row.id))).toBe(false);
    await expect(overview).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "collecting");
    await page.goto(`/cases/${row.id}/forms`);
    await expect(page.getByTestId("case-intake-gate")).toBeVisible();
    const latest = row.master_result as Record<string, unknown>;
    expect(latest.documents).toEqual({ reference: "retained-document" });
    expect(latest.evidence).toEqual({ reference: "retained-evidence" });
    latest.workflowStatus = { intakeCompleted: true };
    latest.guidanceInputRevision = (latest.intakeCheckpoint as Record<string, unknown>).inputRevision;
    await page.reload();
    await expect(page.getByTestId("case-intake-gate")).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-case")).toHaveAttribute("href", `/builder?path=${court}&caseId=${row.id}`);
  });
}

test("Small Claims: an old full analysis cannot reintroduce guidance after a material correction", async ({ page }) => {
  test.setTimeout(180_000);
  await fakeAccount(page);
  let release!: () => void;
  let complete!: () => void;
  const finished = new Promise<void>(resolve => { complete = resolve; });
  await page.route("**/api/small-claims/analyze", async route => {
    const result = await reply(route, "small-claims");
    await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill({ json: result }).catch(() => {});
    complete();
  });
  await openBuilder(page, "small-claims");
  await page.getByRole("button", { name: "Fill in the form yourself" }).click();
  const story = page.getByLabel("Case story", { exact: true });
  await story.fill(STORY);
  await saveCaseStory(page);
  await confirmInitialInformation(page);
  await page.getByRole("button", { name: "Continue to your next steps", exact: true }).click();
  await expect.poll(() => Boolean(release)).toBe(true);
  await story.fill(`${STORY} Newer facts must win.`);
  await saveCaseStory(page);
  release(); await finished;
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "collecting");
  await expect(page.getByTestId("completed-case-overview")).toHaveCount(0);
  await expect(story).toHaveValue(`${STORY} Newer facts must win.`);
});

for (const [court, label] of [["small-claims", "Small Claims"], ["family", "Family"], ["civil", "Civil"]] as const) {
  test(`${court}: finder validates accessibly, retains answers and hands off to the existing builder`, async ({ page }) => {
    await grantSiteAccess(page);
    await page.goto("/");
    await page.getByRole("button", { name: /Not sure which one/ }).click();
    await page.getByLabel("Guide province or territory").selectOption("Ontario");
    await page.getByLabel("Guide city or municipality").fill("Toronto");
    await page.getByLabel("Guide what happened").fill(STORY);
    await page.getByLabel("Guide relationship").fill(court === "family" ? "spouses" : "two businesses");
    await page.getByLabel("Guide remedy").fill("money back");
    await page.getByLabel("Guide amount").fill("500");
    await page.getByRole("button", { name: "Review possible court paths" }).click();
    await expect(page.locator("#finder-errors")).toContainText("Has a case already started?");
    await expect(page.locator("#finder-errors")).toBeFocused();
    await expect(page.getByLabel("Guide case started")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Guide what happened")).toHaveValue(STORY);
    await page.getByLabel("Guide case started").selectOption("not-sure");
    await page.getByRole("button", { name: "Review possible court paths" }).click();
    await page.getByRole("button", { name: `Choose ${label}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/builder\\?path=${court}`));
    await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "collecting");
    await page.getByTestId("intake-start-review").click();
    await expect(page.getByTestId("intake-review").getByRole("textbox", { name: "Review: City", exact: true })).toHaveValue("Toronto");
    await expect(page.getByTestId("intake-review").getByRole("textbox", { name: /^Review: (Your story|Facts|Home Story)$/ })).toHaveValue(STORY);
    await expect(page.getByTestId("completed-case-overview")).toHaveCount(0);
  });
}

test("Home keeps factual clarification but never displays mocked procedural guidance", async ({ page }) => {
  await grantSiteAccess(page);
  await page.route("**/api/case/understand", route => route.fulfill({ json: { ok: true, understanding: { summary: STORY, facts: [], matters: [{ title: "Synthetic matter", court: "civil" }], mainCourt: "civil", side: "starting", stage: "", questions: [{ question: "Synthetic essential question?" }], asksForPrediction: false, step: "civil-start-claim", regime: null }, answer: { status: "answered", statements: [{ text: "Synthetic prohibited premature procedure", sources: [] }], notConfirmed: [], declinedToJudge: false } } }));
  await page.goto("/?path=civil");
  await page.getByLabel("City or municipality").fill("Toronto");
  await page.getByLabel("Tell us what happened in your own words").fill(STORY);
  await page.getByRole("button", { name: "Continue to Civil intake" }).click();
  await expect(page.getByTestId("case-understanding-summary")).toContainText(STORY);
  await expect(page.getByTestId("case-understanding-next-step")).toHaveCount(0);
  await expect(page.getByText("Synthetic prohibited premature procedure")).toHaveCount(0);
  await expect(page.getByLabel("Synthetic essential question?")).toBeVisible();
});

test("Urgent verified notice and public information remain available during collection", async ({ page }) => {
  await openBuilder(page, "small-claims", { city: "Toronto" });
  await page.getByRole("button", { name: "Fill in the form yourself" }).click();
  await page.getByLabel("Case story", { exact: true }).fill("I slipped on ice on the sidewalk on Queen Street in Toronto on September 30, 2025. I want to sue the city.");
  await saveCaseStory(page);
  await expect(page.getByRole("complementary", { name: "Urgent procedural warning" })).toBeVisible();
  await expect(page.getByTestId("completed-case-overview")).toHaveCount(0);
  await page.goto("/guides");
  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByTestId("case-intake-gate")).toHaveCount(0);
  await page.goto("/forms");
  await expect(page.getByRole("heading", { name: "Court forms", exact: true })).toBeVisible();
  await expect(page.getByTestId("forms-intake-gate")).toHaveCount(0);
});
