/**
 * D1 FOLLOW-UPS (the owner's Chrome check of #514's preview, 29 Oct): each test is one finding,
 * asserting the WANTED property, run through the REAL save path.
 *
 * WHAT FAILURE THIS CATCHES
 *   a. An answer shown on the confirm screen ("Evidence you have", an "optional later detail")
 *      removed or changed after Confirm, key by key: the case still said "confirmed".
 *   f. No "saved" note near a form box after a change (Small Claims, civil, Family).
 *   (b, c and d of the same check are done in the per-fact conversion PRs, site owner 29 Oct.)
 *
 * THE REAL SAVE PATH (site owner, 29 Oct): a real staging user and session (realTestSession.ts,
 * refuses production), the case saved to and read from the staging database by the page's own
 * code, every /api route served by the site under test. Stand-ins, the only ones: the routes that
 * would call a model (thisCommitServer.ts serveModelStandIns), and the situation answers pre-set in
 * the tab (autoAnswerSituation), as every intake test does.
 *
 * Run: npx playwright test tests/browser/d1-followups.spec.ts against a build served on
 * PLAYWRIGHT_BASE_URL, built and served with the staging environment (no model key).
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { openBuilder } from "./harness/builderGate";
import { recordInitialUnknowns, saveCaseStory } from "./harness/intakeReview";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 60_000 });

const STORY = "I hired Test Decks Ltd. in March 2026 to build a deck for $8,000. I paid $2,000 and $6,000 is still owed. I have the contract, text messages and a bank receipt.";
const CIVIL_STORY = "Synthetic: I hired Test Builder Ltd. in March 2026 to build an addition for $180,000. They took $90,000 and abandoned the job in June 2026.";
const FAMILY_STORY = "Synthetic: my former partner and I separated in March 2026 and we disagree about parenting time for our daughter.";
type Court = "small-claims" | "civil" | "family";

/** A real staging user for this test only; removed afterwards, whatever happens. */
async function asRealUser(page: Page, court: Court, run: (userId: string) => Promise<void>) {
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    await serveModelStandIns(page, court, userId);
    await run(userId);
  } finally {
    await deleteHarnessUser(userId);
  }
}

/** The saved case, read from the staging database (service key from the environment, never printed). */
function savedCase(userId: string) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, { auth: { persistSession: false } });
  return async () => {
    const { data } = await admin.from("cases").select("id,master_result").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    return data as { id: string; master_result: Record<string, unknown> } | null;
  };
}

async function confirmReview(page: Page, shown?: string) {
  const panel = page.getByTestId("intake-review");
  // The questions one at a time open the review themselves when they finish; otherwise "Stop initial questions and review".
  await expect.poll(async () => {
    const phase = await panel.getAttribute("data-phase");
    const stop = page.getByRole("button", { name: "Stop initial questions and review" });
    if (phase === "collecting" && (await stop.count()) && await stop.isEnabled({ timeout: 1_000 }).catch(() => false)) await stop.click({ timeout: 5_000 }).catch(() => {});
    return phase;
  }, { timeout: 60_000 }).toBe("reviewing");
  // On the confirm screen: the review lists it.
  if (shown) await expect(panel.locator(`[data-testid="intake-entry"][data-field="${shown}"]`), `"${shown}" is shown on the confirm screen`).toHaveCount(1);
  const q = (id: string) => page.locator(`[data-question="${id}"]`);
  const kind = q("sc-orient-dispute-category").getByRole("button").first();
  if (await kind.count()) await kind.click();
  if (await q("sc-claim-filed").count()) await q("sc-claim-filed").getByRole("button", { name: "No", exact: true }).click();
  await recordInitialUnknowns(page);
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
}

/** The area's form, with "Evidence you have" typed key by key, confirmed. */
async function formWithEvidenceConfirmed(page: Page, court: Court, saved: ReturnType<typeof savedCase>) {
  if (court === "small-claims") {
    await openBuilder(page, court, { city: "Kingston" });
    await page.getByRole("button", { name: "Fill in the form yourself" }).click();
    await page.getByLabel("Case story", { exact: true }).fill(STORY);
    await saveCaseStory(page);
  } else {
    await openBuilder(page, court, { city: "Kingston", story: court === "civil" ? CIVIL_STORY : FAMILY_STORY });
    await page.getByTestId("guided-form-show-form").click();
  }
  // The area form's own box (the review's copy is labelled "Review: ..."); typed as a person types.
  const evidence = page.getByRole("textbox", { name: /^\s*Evidence you have/ }).first();
  await evidence.click();
  await page.keyboard.type("Contract and bank receipt", { delay: 40 });
  await page.keyboard.press("Tab");
  await expect.poll(async () => JSON.stringify((await saved())?.master_result?.intakeCheckpoint ?? null), { timeout: 30_000 }).toContain("Contract and bank receipt");
  await confirmReview(page, "evidence");
  return evidence;
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`a. an optional answer shown on the confirm screen, REMOVED key by key after Confirm, cancels the confirmation -- ${court} form`, async ({ page }) => {
    test.setTimeout(480_000);
    await asRealUser(page, court, async (userId) => {
      const saved = savedCase(userId);
      const evidence = await formWithEvidenceConfirmed(page, court, saved);
      await evidence.click();
      await page.keyboard.press("End");
      for (let index = 0; index < "Contract and bank receipt".length; index++) await page.keyboard.press("Backspace", { delay: 30 });
      await page.keyboard.press("Tab");
      await expect.poll(async () => JSON.stringify((await saved())?.master_result?.intakeCheckpoint ?? null), { timeout: 30_000 }).not.toContain("Contract and bank receipt");
      await expect(page.getByTestId("intake-review"), "removing a confirmed answer cancels the confirmation").not.toHaveAttribute("data-phase", "user-confirmed", { timeout: 20_000 });
    });
  });

  test(`a. an optional answer shown on the confirm screen, CHANGED key by key after Confirm, cancels the confirmation -- ${court} form`, async ({ page }) => {
    test.setTimeout(480_000);
    await asRealUser(page, court, async (userId) => {
      const saved = savedCase(userId);
      const evidence = await formWithEvidenceConfirmed(page, court, saved);
      await evidence.click();
      await page.keyboard.press("End");
      await page.keyboard.type(" and texts", { delay: 40 });
      await page.keyboard.press("Tab");
      await expect.poll(async () => JSON.stringify((await saved())?.master_result?.intakeCheckpoint ?? null), { timeout: 30_000 }).toContain("receipt and texts");
      await expect(page.getByTestId("intake-review"), "changing a confirmed answer cancels the confirmation").not.toHaveAttribute("data-phase", "user-confirmed", { timeout: 20_000 });
    });
  });
}

test("a. switching between the form and the questions one at a time (never on the confirm screen) leaves the confirmation alone -- small-claims", async ({ page }) => {
  test.setTimeout(480_000);
  await asRealUser(page, "small-claims", async (userId) => {
    const saved = savedCase(userId);
    await formWithEvidenceConfirmed(page, "small-claims", saved);
    await page.getByRole("button", { name: /Answer questions one at a time/ }).first().click().catch(() => {});
    await page.waitForTimeout(3_000);
    await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "user-confirmed");
  });
});

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`f. a form box says it was saved, beside the box, after a change -- ${court}`, async ({ page }) => {
    test.setTimeout(480_000);
    await asRealUser(page, court, async () => {
      if (court === "small-claims") {
        await openBuilder(page, court, { city: "Kingston" });
        await page.getByRole("button", { name: "Fill in the form yourself" }).click();
        await page.getByLabel("Case story", { exact: true }).fill(STORY);
        await saveCaseStory(page);
      } else {
        await openBuilder(page, court, { city: "Kingston", story: court === "civil" ? CIVIL_STORY : FAMILY_STORY });
        await page.getByTestId("guided-form-show-form").click();
      }
      const box = court === "small-claims" ? page.getByLabel("Important dates / timeline") : page.getByLabel("Timeline", { exact: true });
      await box.pressSequentially("March 2026 hired them", { delay: 40 });
      const note = page.getByTestId("box-saved-note");
      await expect(note, "a saved note appears").toBeVisible({ timeout: 20_000 });
      await expect(note).toHaveText(/^Saved/);
      // Beside the box: measured together, the note just under the box's bottom edge.
      // The box still has the focus: measured in one step, before the note goes.
      const gap = await page.evaluate(() => {
        const note = document.querySelector('[data-testid="box-saved-note"]');
        const box = document.activeElement;
        return note && box ? Math.abs(note.getBoundingClientRect().top - box.getBoundingClientRect().bottom) : null;
      });
      expect(gap, "the note is next to the box").not.toBeNull();
      expect(gap!, "the note is next to the box").toBeLessThan(40);
      // It goes away by itself.
      await expect(note).toBeHidden({ timeout: 15_000 });
    });
  });
}
