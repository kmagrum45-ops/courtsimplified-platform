/**
 * ON PRODUCTION, A LISTED TESTER'S PAGE MOUNTS ONCE (review of PR #513, 2026-10-29).
 *
 * CapabilityProvider holds the server's answer to "which A2I-gated features are
 * on for this person". On production the page is rendered with the anonymous
 * answer (everything off); a listed tester's answer arrives later from
 * /api/capabilities. The first version mounted the page with everything off and
 * then remounted the whole tree when the answer came, so every mount effect ran
 * twice (load the case, start an analysis, save) and anything typed was lost.
 * Now, with a session on production, the page is held until the answer arrives
 * and mounts once.
 *
 * WHAT FAILURE THIS CATCHES:
 *   - the dashboard's mount effect (load the cases) running more than once for a
 *     signed-in person on production while the answer is in flight (the remount),
 *     on page load and after signing in;
 *   - a hydration error from holding the server-rendered page;
 *   - the page never receiving the tester's answer (held off for good);
 *   - an anonymous visitor on production waiting on /api/capabilities at all.
 *
 * NEEDS A PRODUCTION SERVER, so it runs only when asked: build and start the site
 * with VERCEL_ENV=production and NEXT_PUBLIC_VERCEL_ENV=production (next build,
 * next start --port 4504), then
 *   CAPABILITY_HOLD_PRODUCTION_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost:4504 \
 *     npx playwright test tests/browser/capability-hold.spec.ts
 * Otherwise it is skipped (a preview or dev server never holds, by design).
 *
 * Synthetic account (fakeAccount) and a stand-in /api/capabilities: nothing
 * reaches a database or a model.
 */
import { expect, test, type Page } from "@playwright/test";

import { CAPABILITY_KEYS } from "../../src/lib/case-system/policy/capabilities";
import { grantSiteAccess } from "./harness/siteAccess";
import { fakeAccount } from "./harness/syntheticIntakeAccount";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });
test.skip(!process.env.CAPABILITY_HOLD_PRODUCTION_SERVER, "needs a server built and started with VERCEL_ENV=production");

const ANSWER_DELAY_MS = 1_500;
const ALL_ON = Object.fromEntries(CAPABILITY_KEYS.map((key) => [key, true]));

/** The answer the page holds right now (capabilityAccess.ts keeps it on globalThis). */
const heldAnswer = (page: Page) =>
  page.evaluate(() => (globalThis as Record<symbol, unknown>)[Symbol.for("courtsimplified.clientCapabilities")] as Record<string, boolean> | null);

/** Errors the page reports (a hydration mismatch among them). */
function pageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat|Minified React error/i.test(message.text())) errors.push(message.text());
  });
  return errors;
}

async function standInCapabilities(page: Page) {
  const asked = { count: 0 };
  await page.route("**/api/capabilities", async (route) => {
    asked.count += 1;
    await new Promise((resolve) => setTimeout(resolve, ANSWER_DELAY_MS));
    await route.fulfill({ json: { capabilities: ALL_ON } });
  });
  return asked;
}

test("production, a listed tester: the dashboard mounts once and gets the tester's answer", async ({ page }) => {
  test.setTimeout(120_000);
  await fakeAccount(page);
  await grantSiteAccess(page);
  const caseLoads = { count: 0 };
  await page.route("**/rest/v1/cases**", (route) => {
    if (route.request().method() === "GET") caseLoads.count += 1;
    return route.fallback();
  });
  const asked = await standInCapabilities(page);
  const errors = pageErrors(page);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "My cases" })).toBeVisible({ timeout: 60_000 });
  // Well past the answer, so a remount after it would have happened.
  await page.waitForTimeout(ANSWER_DELAY_MS + 2_000);

  expect(asked.count, "the page asked the server for this person's answer").toBeGreaterThan(0);
  const answer = await heldAnswer(page);
  expect(answer && CAPABILITY_KEYS.every((key) => answer[key] === true), "the page holds the tester's answer").toBe(true);
  expect(caseLoads.count, "the dashboard's mount effect ran once, not again on a remount").toBe(1);
  expect(errors, "no page errors (no hydration mismatch)").toEqual([]);
});

test("production, a listed tester signing in: the page they land on mounts once", async ({ page }) => {
  test.setTimeout(120_000);
  await grantSiteAccess(page);
  const owner = "11111111-1111-4111-8111-111111111111";
  const user = { id: owner, aud: "authenticated", role: "authenticated", email: "synthetic@example.invalid", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = [encode({ alg: "HS256", typ: "JWT" }), encode({ sub: owner, exp, role: "authenticated" }), "synthetic-signature"].join(".");
  let signedIn = false;
  await page.route("**/auth/v1/**", (route) => {
    if (route.request().url().includes("/token")) {
      signedIn = true;
      return route.fulfill({ json: { access_token: token, refresh_token: "synthetic-refresh", expires_in: 3600, expires_at: exp, token_type: "bearer", user } });
    }
    return signedIn ? route.fulfill({ json: user }) : route.fulfill({ status: 401, json: { msg: "no session" } });
  });
  const caseLoads = { count: 0 };
  await page.route("**/rest/v1/**", (route) => {
    if (route.request().method() === "GET" && new URL(route.request().url()).pathname.endsWith("/cases")) caseLoads.count += 1;
    return route.fulfill({ json: [] });
  });
  const asked = await standInCapabilities(page);
  const errors = pageErrors(page);

  await page.goto("/login?next=%2Fdashboard");
  await page.getByPlaceholder("you@example.com").fill("synthetic@example.invalid");
  await page.getByPlaceholder("Enter password").fill("synthetic-password");
  await page.getByRole("button", { name: "Login", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "My cases" })).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(ANSWER_DELAY_MS + 2_000);

  expect(asked.count, "the page asked the server for the new person's answer").toBeGreaterThan(0);
  const answer = await heldAnswer(page);
  expect(answer && CAPABILITY_KEYS.every((key) => answer[key] === true), "the page holds the tester's answer").toBe(true);
  expect(caseLoads.count, "the dashboard mounted once after signing in, not again on a remount").toBe(1);
  expect(errors, "no page errors").toEqual([]);
});

test("production, nobody signed in: the page does not wait on the server's answer", async ({ page }) => {
  test.setTimeout(120_000);
  await grantSiteAccess(page);
  await page.route("**/auth/v1/**", (route) => route.fulfill({ status: 401, json: { msg: "no session" } }));
  await page.route("**/rest/v1/**", (route) => route.fulfill({ json: [] }));
  const asked = await standInCapabilities(page);

  await page.goto("/dashboard");
  // The dashboard's mount effect sends a visitor with no session to sign in.
  await expect(page).toHaveURL(/\/login/, { timeout: 60_000 });
  const answer = await heldAnswer(page);
  // A sanity check that this IS a production server: there, nobody signed in has gated features off.
  expect(answer && CAPABILITY_KEYS.some((key) => answer[key] === false), "a production server (gated features off for nobody)").toBe(true);
  expect(asked.count, "nobody signed in: nothing to ask, nothing to wait for").toBe(0);
});
