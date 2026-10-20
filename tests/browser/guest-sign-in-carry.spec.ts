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
 * Synthetic throughout: auth and the cases table are answered in the browser, so
 * no account is created and nothing reaches a database or the AI.
 */
import { expect, test, type Page } from "@playwright/test";
import { grantSiteAccess } from "./harness/siteAccess";
import { confirmInitialInformation } from "./harness/intakeReview";

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
async function syntheticAccount(page: Page) {
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

async function guestIntake(page: Page): Promise<string> {
  await grantSiteAccess(page);
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel("Tell us what happened in your own words").fill(STORY);
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
