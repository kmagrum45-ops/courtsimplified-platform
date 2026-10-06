/**
 * The page walkthrough: plays each persona through the real site and records
 * what every page shows them, so a reviewer (human or the critic in
 * scripts/walkthrough/critique.ts) can read the whole journey page by page.
 *
 * WHY. Site owner, 2026-10-04: "is there a way for you to see all the results
 * at each stage of the user case?" Every other suite checks a module or a
 * string. None reads what a person actually sees on each page, in order, which
 * is where the reported problems lived: the user's typos pasted back, a
 * child-support draft on a custody case, a served father treated as the one
 * starting the case.
 *
 * NOT A GATE. It asserts only that each persona got through. What the pages
 * say is judged by the critic, which writes REPORT.md. Output goes to
 * walkthrough-output/ (gitignored): one JSON per persona plus a full-page
 * screenshot per step.
 *
 * Needs a running app (PLAYWRIGHT_BASE_URL, or the config's own dev server),
 * SITE_ACCESS_PASSWORD, and Supabase credentials for a NON-production project
 * (authenticateRealTestUser mints a harness user; case rows are faked). The
 * workflow courtsimplified-walkthrough.yml refuses production first.
 *
 * Run: npx playwright test tests/browser/walkthrough.spec.ts
 */

import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { authenticateRealTestUser } from "./harness/intakeDriver";
import { PERSONAS, type Persona } from "./walkthrough/personas";

const OUT = path.resolve(process.cwd(), "walkthrough-output");

type Step = { n: number; step: string; url: string; text: string; screenshot: string; note?: string };

async function capture(page: Page, persona: Persona, steps: Step[], step: string, note?: string) {
  const n = steps.length + 1;
  const dir = path.join(OUT, persona.id);
  fs.mkdirSync(dir, { recursive: true });
  const file = `${String(n).padStart(2, "0")}-${step}.png`;
  await page.waitForTimeout(800);
  // Open every collapsed section first: innerText skips a closed <details>,
  // so the critic read "What you told us" as empty when it was only folded
  // (first run, 2026-10-04).
  await page
    .evaluate(() => document.querySelectorAll("details").forEach((element) => element.setAttribute("open", "")))
    .catch(() => undefined);
  const main = page.locator("main");
  const text = ((await main.count()) > 0 ? await main.first().innerText() : await page.locator("body").innerText()).trim();
  await page.screenshot({ path: path.join(dir, file), fullPage: true }).catch(() => undefined);
  steps.push({ n, step, url: page.url(), text, screenshot: `${persona.id}/${file}`, note });
}

async function passGate(page: Page, persona: Persona, steps: Step[]) {
  await page.goto(`/builder?path=${persona.path}`, { waitUntil: "domcontentloaded" });
  const province = page.getByLabel("Province or territory");
  // The first-use notice gates the builder for a new account (first run,
  // 2026-10-04: every persona stopped here). Accepting it is what a user does.
  const acknowledge = page.getByRole("checkbox", { name: /I understand/i });
  await expect(province.or(acknowledge)).toBeVisible({ timeout: 90_000 });
  if (await acknowledge.isVisible().catch(() => false)) {
    await capture(page, persona, steps, "first-use-notice");
    await acknowledge.check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await expect(province).toBeVisible({ timeout: 90_000 });
  await province.selectOption("Ontario");
  await page.getByLabel("City or municipality").fill(persona.city);
  // The builder's own gate no longer asks for the story (second run,
  // 2026-10-04: family and civil timed out here); it is entered in the intake.
  const button =
    persona.path === "small-claims"
      ? page.getByRole("button", { name: "Continue", exact: true })
      : page.getByRole("button", { name: /Continue with .* questions/ });
  await expect(button).toBeEnabled({ timeout: 30_000 });
  await button.click();
}

async function fillLabelled(page: Page, label: string, value: string) {
  const field = page.getByLabel(label, { exact: true }).first();
  if ((await field.count()) === 0) return false;
  await field.fill(value);
  return true;
}

async function runSpellingCheck(page: Page, persona: Persona, steps: Step[]) {
  const check = page.getByTestId("tidy-wording-check");
  if ((await check.count()) === 0) return;
  await check.click();
  await expect(check).toHaveText(/Suggest fixes/, { timeout: 90_000 });
  await capture(page, persona, steps, "spelling-suggestions");
  // Accept every suggestion, as a user who trusts the fixes would.
  for (let i = 0; i < 25; i += 1) {
    const use = page.getByRole("button", { name: "Use suggested" }).first();
    if ((await use.count()) === 0) break;
    await use.click();
  }
}

async function familyOrCivil(page: Page, persona: Persona, steps: Step[]) {
  await expect(page.getByLabel("Case stage").first()).toBeVisible({ timeout: 60_000 });
  await capture(page, persona, steps, "intake-form");

  // The story: shown as prose with an "Edit case story" toggle.
  const storyField = page.getByLabel("Case story", { exact: true });
  if (!(await storyField.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Edit case story" }).click();
  }
  await storyField.fill(persona.story);

  if (persona.path === "family") {
    await page.getByTestId("family-role-select").selectOption(persona.role);
    for (const issue of persona.issues ?? []) await page.getByTestId(`family-issue-${issue}`).click();
  } else {
    await page.getByLabel("Your role").selectOption(persona.role);
    for (const label of persona.issues ?? []) {
      await page.getByRole("button", { name: label, exact: true }).first().click();
    }
  }
  for (const label of persona.documents ?? []) {
    await page.getByRole("button", { name: label, exact: true }).first().click();
  }
  await page.getByLabel("Case stage").first().selectOption(persona.stage);
  for (const [label, value] of Object.entries(persona.fields ?? {})) await fillLabelled(page, label, value);

  await runSpellingCheck(page, persona, steps);
  await capture(page, persona, steps, "intake-filled");

  await page.getByRole("button", { name: /Continue to your next steps/ }).click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 180_000 });
  await page.waitForTimeout(4_000);
  await capture(page, persona, steps, "after-analysis");
}

async function smallClaims(page: Page, persona: Persona, steps: Step[]) {
  const chooseForm = page.getByRole("button", { name: /Fill in the form yourself/i });
  await expect(chooseForm).toBeVisible({ timeout: 60_000 });
  await capture(page, persona, steps, "mode-chooser");
  await chooseForm.click();
  await expect(page.getByTestId("sc-intake-analyze")).toBeVisible({ timeout: 60_000 });
  await capture(page, persona, steps, "intake-form");

  const story = page.getByTestId("sc-intake-facts");
  if (!(await story.isVisible().catch(() => false))) await page.getByTestId("sc-intake-edit-story").click();
  await story.fill(persona.story);
  await page.getByTestId("sc-intake-yourRole").selectOption(persona.role);
  await page.getByTestId("sc-intake-caseStage").selectOption(persona.stage);
  for (const [name, value] of Object.entries(persona.fields ?? {})) {
    await page.getByTestId(`sc-intake-${name}`).fill(value).catch(() => undefined);
  }
  await runSpellingCheck(page, persona, steps);
  await capture(page, persona, steps, "intake-filled");

  await page.getByTestId("sc-intake-analyze").click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 180_000 });
  await page.waitForTimeout(4_000);
  await capture(page, persona, steps, "after-analysis");
}

async function confirmStage(page: Page, persona: Persona, steps: Step[]) {
  const select = page.getByTestId("stage-select");
  if ((await select.count()) === 0) return;
  await select.selectOption(persona.confirmStage);
  await page.getByTestId("stage-confirm").click();
  await page.waitForTimeout(3_000);
  await capture(page, persona, steps, "stage-confirmed");
}

/**
 * Back and Forward (2026-10-06). The site owner pressed Back after a live
 * test and lost the case: every builder step shared one URL. Back from the
 * results must show the intake as it was filled, Forward the results again.
 */
async function backAndForward(page: Page, persona: Persona, steps: Step[]) {
  const results = page.getByTestId("completed-case-overview");
  await page.goBack();
  await expect(results).toBeHidden({ timeout: 30_000 });
  // The story is page text on some intakes and a text box's value on others
  // (2026-10-06: four personas failed a text-only check while their filled
  // intake was on screen). Either counts; the spelling step may have changed
  // a word, so a short opening is compared.
  const opening = persona.story.slice(0, 24);
  await expect
    .poll(
      () =>
        page.evaluate((start) => {
          const fields = Array.from(document.querySelectorAll("textarea, input")) as (HTMLInputElement | HTMLTextAreaElement)[];
          return fields.some((field) => field.value.includes(start)) || document.body.innerText.includes(start);
        }, opening),
      { timeout: 30_000 },
    )
    .toBe(true);
  await capture(page, persona, steps, "back-to-intake", "Browser Back from the results: the intake as it was filled.");
  await page.goForward();
  await expect(results).toBeVisible({ timeout: 30_000 });
  await capture(page, persona, steps, "forward-to-results", "Browser Forward: the results again.");
}

/**
 * A reload of the results step reopens the saved case (2026-10-06), never a
 * blank intake. Run last: it leaves the builder.
 */
async function reloadReopensCase(page: Page, persona: Persona, steps: Step[]) {
  await page.goto(`/builder?path=${persona.path}&step=results`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("case-home-title")).toBeVisible({ timeout: 60_000 });
  await capture(page, persona, steps, "reload-reopens-case", "Reloading the results step opened the saved case.");
}

/**
 * The case page, tab by tab (2026-10-04). After intake the user's case lives at
 * /cases/[id]; the walkthrough follows them there so the critic reads what they
 * actually work from, not only the builder.
 */
async function visitCaseHome(page: Page, persona: Persona, steps: Step[]) {
  const open = page.getByTestId("open-case-home");
  if ((await open.count()) === 0 || !(await open.isEnabled().catch(() => false))) return;
  await open.click();
  await expect(page.getByTestId("case-home-title")).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(3_000);
  await capture(page, persona, steps, "case-overview");
  for (const tab of ["timeline", "documents", "forms", "drafts", "case-file"]) {
    const link = page.getByTestId(`case-tab-${tab}`);
    if ((await link.count()) === 0) continue;
    await link.click();
    await page.waitForTimeout(3_000);
    await capture(page, persona, steps, `case-${tab}`);
  }
}

test.describe("page walkthrough", () => {
  test.use({ navigationTimeout: 120_000, actionTimeout: 60_000 });

  for (const persona of PERSONAS) {
    test(persona.id, async ({ page }) => {
      test.setTimeout(600_000);
      const steps: Step[] = [];
      let failure: string | null = null;
      try {
        // Real case rows (staging only, see the guard) so the case page can open.
        await authenticateRealTestUser(page, { realCases: true });
        await passGate(page, persona, steps);
        if (persona.path === "small-claims") await smallClaims(page, persona, steps);
        else await familyOrCivil(page, persona, steps);
        await confirmStage(page, persona, steps);
        await backAndForward(page, persona, steps);
        await visitCaseHome(page, persona, steps);
        await reloadReopensCase(page, persona, steps);
      } catch (error) {
        failure = error instanceof Error ? error.message.split("\n")[0].slice(0, 400) : String(error);
        await capture(page, persona, steps, "failed-here", failure).catch(() => undefined);
      }
      fs.mkdirSync(OUT, { recursive: true });
      fs.writeFileSync(
        path.join(OUT, `${persona.id}.json`),
        JSON.stringify({ persona, failure, steps }, null, 2),
      );
      expect(failure, `persona ${persona.id} did not get through: ${failure}`).toBeNull();
    });
  }
});
