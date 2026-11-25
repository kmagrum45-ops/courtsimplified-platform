/**
 * EVERY SIGN-IN LINK BRINGS THE GUEST'S INTAKE INTO A NEW CASE, NEVER AN OLDER ONE.
 *
 * PR #463 re-test 2026-10-19: a guest who signed in from the header (or from the
 * guided route, whose "Sign in required" line had no link) lost what they had
 * entered, landed on My cases, and going back showed "This intake is not
 * available in this tab or account". Only two links marked the intake to carry.
 *
 * Each case: a guest enters a story; the account already holds an older case;
 * the guest signs in or signs up through one of the site's links (the header on
 * the intake, the guided route's sign-in link, and sign-up from the header on a
 * page with no return address). Each must end back on the intake under a new id,
 * with the story, and with exactly one new case created; the older case is never
 * written to. The carry rules themselves: verifyGuestCarry.
 *
 * Two more from the owner's Chrome check of #524 (2026-10-30): the danger notice a guest
 * already saw is not shown again after sign-in (resetIntake keeps the fingerprint at
 * sign-in), and a footer link and the header's My Workspace each go there on one click
 * while signed-in text is unsaved (leaveAfterSave.ts).
 *
 * Synthetic throughout: auth and the cases table are answered in the browser, so
 * no account is created and nothing reaches a database or the AI.
 */
import { expect, test, type Page } from "@playwright/test";
import { grantSiteAccess } from "./harness/siteAccess";
import { confirmInitialInformation } from "./harness/intakeReview";
import { autoAnswerSituation } from "./harness/situation";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const OWNER = "11111111-1111-4111-8111-111111111111";
const OLDER = "66666666-6666-4666-8666-666666666666";
const STORY = "Synthetic guest story: I paid Test Renovations Ltd. $4,000 in March for a deck and they never built it.";
const OLDER_ROW = {
  id: OLDER, user_id: OWNER, court_path: "small-claims", title: "Older synthetic case", status: "active", current_stage: "not-sure", updated_at: "2026-10-01T00:00:00.000Z",
  master_result: { source: "builder-created-shell", workflowStatus: { intakeCompleted: false }, intakeCheckpoint: { version: 1, flowId: OLDER, courtPath: "small-claims", revision: "77777777-7777-4777-8777-777777777777", sections: { story: { text: "Synthetic older story in Ottawa.", location: { province: "Ontario", city: "Ottawa" } } } } },
};

type Master = Record<string, unknown> & { workflowStatus?: Record<string, unknown>; intakeCheckpoint?: Record<string, unknown>; intakeData?: { otherParty?: unknown } };
type Row = Record<string, unknown> & { id: string; user_id: string; updated_at: string; master_result: Master };

/** Signed out until the login form is submitted; then a synthetic account owning OLDER_ROW. */
async function syntheticAccount(page: Page, options: { failCreates?: boolean } = {}) {
  const user = { id: OWNER, aud: "authenticated", role: "authenticated", email: "synthetic@example.invalid", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
  const token = () => [btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })), btoa(JSON.stringify({ sub: OWNER, exp: Math.floor(Date.now() / 1000) + 3600 })), "synthetic-signature"].join(".");
  const session = () => ({ access_token: token(), refresh_token: "synthetic-refresh", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: "bearer", user });
  const rows = new Map<string, Row>([[OLDER, structuredClone(OLDER_ROW) as Row]]);
  const writes: string[] = [];
  let writeCount = 0;
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { ok: false, error: "Synthetic: no AI in this test" } }));
  await page.route("**/api/case/understand", route => route.fulfill({ json: { ok: true, skipped: "off" } }));
  await page.route("**/api/classify-court-path", route => route.fulfill({ json: { primaryPath: "small-claims", confidence: 0.95 } }));
  await page.route("**/api/intake/guided-turn", route => route.fulfill({ status: 401, json: { ok: false, error: "Sign in required to continue guided intake." } }));
  await page.route("**/auth/v1/**", route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/token") || url.pathname.endsWith("/signup")) return route.fulfill({ json: session() });
    if (url.pathname.endsWith("/logout")) return route.fulfill({ status: 204, body: "" });
    return route.fulfill({ json: user });
  });
  await page.route("**/rest/v1/**", async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (!url.pathname.endsWith("/cases")) return route.fulfill({ json: [] });
    const id = url.searchParams.get("id")?.replace(/^eq\./, "");
    if (req.method() === "POST") {
      if (options.failCreates) return route.fulfill({ status: 500, json: { message: "Synthetic: the save fails" } });
      const row = req.postDataJSON() as Row;
      writes.push(`insert ${row.id}`);
      if (rows.has(row.id)) return route.fulfill({ status: 409, json: { message: "duplicate key" } });
      row.updated_at = new Date(++writeCount + Date.now()).toISOString();
      rows.set(row.id, row);
      return route.fulfill({ json: { id: row.id } });
    }
    const row = id ? rows.get(id) : undefined;
    if (req.method() === "PATCH") {
      writes.push(`update ${id}`);
      if (!row || url.searchParams.get("updated_at") !== `eq.${row.updated_at}`) return route.fulfill({ json: [] });
      Object.assign(row, req.postDataJSON(), { updated_at: new Date(++writeCount + Date.now()).toISOString() });
      return route.fulfill({ json: [{ id }] });
    }
    const project = (value: Row) => {
      const master = value.master_result;
      const checkpoint = master?.intakeCheckpoint;
      return { ...value, position: master?.position, drafts: master?.drafts, otherParty: master?.intakeData?.otherParty, lifecycleStage: master?.lifecycleStage, workflowStatus: master?.workflowStatus, guidanceInputRevision: master?.guidanceInputRevision, flowId: checkpoint?.flowId, cpCourt: checkpoint?.courtPath, cpVersion: String(checkpoint?.version ?? ""), revision: checkpoint?.revision, inputRevision: checkpoint?.inputRevision };
    };
    return route.fulfill({ json: id ? row ? project(row) : null : [...rows.values()].map(project) });
  });
  return { rows, writes };
}

async function guestIntake(page: Page, story = STORY): Promise<string> {
  await grantSiteAccess(page);
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(story);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const flow = new URL(page.url()).searchParams.get("intake");
  expect(flow, "the guest intake has an id").toBeTruthy();
  return flow!;
}

async function submitLogin(page: Page, mode: "login" | "signup") {
  await page.waitForURL(/\/login\?next=/, { timeout: 60_000 });
  if (mode === "signup") await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await page.getByPlaceholder("you@example.com").fill("synthetic@example.invalid");
  await page.getByPlaceholder("Enter password").fill("Synthetic-password-1234");
  await page.getByRole("button", { name: mode === "signup" ? "Create Secure Account" : "Login", exact: true }).last().click();
}

async function expectOneNewCase(page: Page, guestFlow: string, account: Awaited<ReturnType<typeof syntheticAccount>>) {
  await page.waitForURL(url => url.pathname === "/builder" && url.searchParams.get("intake") !== guestFlow, { timeout: 60_000 });
  const flow = new URL(page.url()).searchParams.get("intake")!;
  expect(flow, "a new id, never the older case's").not.toBe(OLDER);
  await expect(page.getByText("This intake is not available")).toHaveCount(0);
  await expect.poll(() => account.rows.size, { message: "exactly one new case", timeout: 60_000 }).toBe(2);
  const created = account.rows.get(flow);
  expect(created, "the new case is the carried intake").toBeTruthy();
  expect(created!.user_id).toBe(OWNER);
  expect(JSON.stringify(created!.master_result.intakeCheckpoint)).toContain("Test Renovations");
  expect(created!.master_result.workflowStatus?.intakeCompleted, "the guest's review is confirmed again on the account").toBe(false);
  expect(account.rows.get(OLDER), "the older case is untouched").toEqual(OLDER_ROW);
  expect(account.writes.filter(write => write.endsWith(OLDER)), "nothing was written to the older case").toEqual([]);
  expect(await page.evaluate(() => sessionStorage.getItem("courtSimplifiedGuestCarry")), "the mark was read once").toBeNull();
}

test("header sign-in on the intake brings it into one new case", async ({ page }) => {
  test.setTimeout(240_000);
  const account = await syntheticAccount(page);
  const guestFlow = await guestIntake(page);
  await page.locator('[data-testid="header-sign-in"]:visible').first().click();
  await submitLogin(page, "login");
  await expectOneNewCase(page, guestFlow, account);
});

test("the guided route's sign-in link brings the intake into one new case", async ({ page }) => {
  test.setTimeout(240_000);
  const account = await syntheticAccount(page);
  const guestFlow = await guestIntake(page);
  await confirmInitialInformation(page);
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  const guided = page.getByRole("button", { name: /Answer questions one at a time with AI help/i });
  await expect(acknowledgement.or(guided)).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) {
    await acknowledgement.check();
    await page.getByTestId("acknowledgement-continue").click();
  }
  await guided.click();
  await page.getByTestId("guided-send-saved-story").click();
  await expect(page.getByTestId("guided-error")).toContainText("Sign in required");
  await page.getByTestId("guided-sign-in").click();
  await submitLogin(page, "login");
  await expectOneNewCase(page, guestFlow, account);
});

test("sign-up from a page with no return address goes back to the intake, in one new case", async ({ page }) => {
  test.setTimeout(240_000);
  const account = await syntheticAccount(page);
  const guestFlow = await guestIntake(page);
  await page.goto("/about");
  await page.locator('[data-testid="header-sign-in"]:visible').first().click();
  await submitLogin(page, "signup");
  await expectOneNewCase(page, guestFlow, account);
});

// ---------------------------------------------------------------------------
// The owner's Chrome check on the #524 preview (2026-10-30).
// ---------------------------------------------------------------------------
const DANGER_STORY = "Synthetic guest story: I paid Test Renovations Ltd. $4,000 in March for a deck and they never built it. The owner threatened me and I am scared to go back there.";

test("the danger notice a guest already saw is not shown again on the builder after they sign in and the case moves to the account", async ({ page }) => {
  test.setTimeout(240_000);
  await autoAnswerSituation(page);
  const account = await syntheticAccount(page);
  const guestFlow = await guestIntake(page, DANGER_STORY);
  await expect(page.getByTestId("safety-notice"), "the guest's builder shows it, once").toBeVisible({ timeout: 60_000 });
  await page.locator('[data-testid="header-sign-in"]:visible').first().click();
  await submitLogin(page, "login");
  await page.waitForURL(url => url.pathname === "/builder" && url.searchParams.get("intake") !== guestFlow, { timeout: 60_000 });
  await expect.poll(() => account.rows.size, { message: "the guest case moved into the account", timeout: 60_000 }).toBe(2);
  await expect(page.getByTestId("intake-save-status")).toContainText("saved to your account", { timeout: 60_000 });
  // The notice decides after the page draws; give it the time it takes, then it must not be there.
  await page.waitForTimeout(2_000);
  await expect(page.getByTestId("safety-notice"), "not shown again for the same words after sign-in").toHaveCount(0);
  const kept = await page.evaluate(() => sessionStorage.getItem("courtSimplifiedSafetyNoticeShown") ?? "");
  expect(kept, "a fingerprint, never the words").not.toMatch(/renovations|threatened|scared/i);
});

test("a footer link and the header's My Workspace each go there on one click, straight after the page loads, while signed-in text is unsaved", async ({ page }) => {
  test.setTimeout(240_000);
  // The save that creates the case fails, so the intake's text stays pending in this tab:
  // the state in which the leave-guard (leaveAfterSave.ts) took a link click and dropped it.
  const account = await syntheticAccount(page, { failCreates: true });
  const guestFlow = await guestIntake(page);
  await page.locator('[data-testid="header-sign-in"]:visible').first().click();
  await submitLogin(page, "login");
  await page.waitForURL(url => url.pathname === "/builder" && url.searchParams.get("intake") !== guestFlow, { timeout: 60_000 });
  const builder = page.url();
  // Unsaved text: the browser's "Leave site?" question may come; the person answers Leave.
  page.on("dialog", dialog => void dialog.accept());

  // Footer: one click, straight after load (no wait for the network to settle).
  await page.goto(builder, { waitUntil: "domcontentloaded" });
  await page.getByTestId("safety-footer-line").getByRole("link", { name: "Other support lines" }).click();
  await page.waitForURL(/\/support$/, { timeout: 30_000 });
  await expect(page.getByTestId("support-lines")).toBeVisible();

  // Header: one click on My Workspace, straight after load, then again once the failed save has
  // armed the leave-guard (the state the owner's click met).
  await page.goto(builder, { waitUntil: "domcontentloaded" });
  const workspace = page.locator("header").getByRole("link", { name: "My Workspace" }).filter({ visible: true }).first();
  await workspace.click();
  await page.waitForURL(/\/dashboard/,{ timeout: 30_000 });
  await page.goto(builder, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("intake-save-status")).toContainText("could not be saved", { timeout: 60_000 });
  await page.getByTestId("safety-footer-line").getByRole("link", { name: "Other support lines" }).click();
  await page.waitForURL(/\/support$/, { timeout: 30_000 });
  await page.goto(builder, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("intake-save-status")).toContainText("could not be saved", { timeout: 60_000 });
  await page.locator("header").getByRole("link", { name: "My Workspace" }).filter({ visible: true }).first().click();
  await page.waitForURL(/\/dashboard/,{ timeout: 30_000 });
  expect(account.rows.size, "nothing was created: every save failed").toBe(1);
});
