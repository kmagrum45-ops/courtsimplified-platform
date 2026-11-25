/**
 * SIGN-UP SAYS WHAT HAPPENS NEXT, READ FROM WHAT THE SIGN-UP RETURNED (site owner, 21 Nov 2026).
 *
 * Production requires email confirmation (CLAUDE.md s. 6: mailer_autoconfirm false), but the page assumed it did not:
 * with no session back it said "Account created. You can sign in with those details now.", and the sign-in that followed
 * failed with "We could not sign you in with those details". A reviewer signing up this weekend would have been stuck.
 *
 * Every page that creates an account or signs in is the login page (app/login/page.tsx): the header's "Sign in", the
 * guided route's "Sign in required" link and the guest's "Sign in or create an account" all lead there (startSignIn /
 * signInAddress). For each way in, both states of Supabase Auth, answered in the browser exactly as GoTrue answers them:
 *   - confirmation required: /signup returns the user with no session -> "Check your email: we sent a confirmation link to
 *     <address>. Click it, then sign in.", and the link it asks for lands on this site's own address (/login?confirmed=1);
 *   - confirmation not required: /signup returns a session -> signed in and sent on, as before;
 *   - a sign-in refused because the email is not confirmed (400, error_code email_not_confirmed) -> said in plain words,
 *     with a button that sends the link again (POST /auth/v1/resend, type signup, to this site's address).
 * No account is created and nothing reaches a database or the AI.
 */
import { expect, test, type Page } from "@playwright/test";
import { grantSiteAccess } from "./harness/siteAccess";
import { autoAnswerSituation } from "./harness/situation";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { GUEST_ACCOUNT_NOTICE } from "../../src/lib/auth/signUpConfirmation";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const EMAIL = "synthetic.reviewer@example.invalid";
const OWNER = "11111111-1111-4111-8111-111111111111";
type Sent = { signup: Record<string, unknown>[]; resend: Record<string, unknown>[]; signupUrls: string[] };

/** Supabase Auth, answered as GoTrue answers it, with confirmation `required` or not. */
async function auth(page: Page, required: boolean): Promise<Sent> {
  const sent: Sent = { signup: [], resend: [], signupUrls: [] };
  const user = { id: OWNER, aud: "authenticated", role: "authenticated", email: EMAIL, app_metadata: {}, user_metadata: {}, identities: [{ id: OWNER }], created_at: "2026-11-21T00:00:00Z", ...(required ? {} : { email_confirmed_at: "2026-11-21T00:00:00Z" }) };
  const token = () => [btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })), btoa(JSON.stringify({ sub: OWNER, exp: Math.floor(Date.now() / 1000) + 3600 })), "synthetic-signature"].join(".");
  const session = () => ({ access_token: token(), refresh_token: "synthetic-refresh", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: "bearer", user });
  await page.route("**/api/**", (route) => route.fulfill({ status: 503, json: { ok: false, error: "Synthetic: no AI in this test" } }));
  await page.route("**/api/case/understand", (route) => route.fulfill({ json: { ok: true, skipped: "off" } }));
  await page.route("**/api/classify-court-path", (route) => route.fulfill({ json: { primaryPath: "small-claims", confidence: 0.95 } }));
  await page.route("**/api/intake/guided-turn", (route) => route.fulfill({ status: 401, json: { ok: false, error: "Sign in required to continue guided intake." } }));
  await page.route("**/rest/v1/**", (route) => route.fulfill({ json: [] }));
  await page.route("**/auth/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/signup")) {
      sent.signup.push(route.request().postDataJSON() ?? {});
      sent.signupUrls.push(url.toString());
      // GoTrue: with confirmation required it returns the user and no session; without, a session.
      return route.fulfill({ json: required ? user : session() });
    }
    if (url.pathname.endsWith("/token")) {
      if (required) return route.fulfill({ status: 400, json: { code: 400, error_code: "email_not_confirmed", msg: "Email not confirmed" } });
      return route.fulfill({ json: session() });
    }
    if (url.pathname.endsWith("/resend")) { sent.resend.push(route.request().postDataJSON() ?? {}); sent.signupUrls.push(url.toString()); return route.fulfill({ json: {} }); }
    if (url.pathname.endsWith("/logout")) return route.fulfill({ status: 204, body: "" });
    if (url.pathname.endsWith("/user")) return required ? route.fulfill({ status: 401, json: { message: "no session" } }) : route.fulfill({ json: user });
    return route.fulfill({ json: {} });
  });
  return sent;
}

/** The three ways onto the login page: the page itself, the header's "Sign in", and the guided route's sign-in link. */
const WAYS_IN: [string, (page: Page) => Promise<void>][] = [
  ["the login page", async (page) => { await page.goto("/login"); }],
  ["the header's Sign in", async (page) => {
    await page.goto("/about");
    await page.locator('[data-testid="header-sign-in"]:visible').first().click();
    await page.waitForURL(/\/login/, { timeout: 60_000 });
  }],
  ["the guided route's Sign in required link (a guest's case)", async (page) => {
    await autoAnswerSituation(page);
    await page.goto("/?path=small-claims");
    await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("City or municipality").fill("Sudbury");
    await page.getByLabel(STORY_LABEL, { exact: true }).fill("Synthetic guest story: I paid Test Renovations Ltd. $4,000 in March for a deck and they never built it.");
    await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
    await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
    const acknowledgement = page.getByTestId("acknowledgement-checkbox");
    const guided = page.getByRole("button", { name: /Answer questions one at a time with AI help/i });
    await expect(acknowledgement.or(guided).first()).toBeVisible({ timeout: 60_000 });
    if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
    await guided.click();
    await page.getByTestId("guided-send-saved-story").click();
    await expect(page.getByTestId("guided-error")).toContainText("Sign in required");
    await page.getByTestId("guided-sign-in").click();
    await page.waitForURL(/\/login/, { timeout: 60_000 });
  }],
];

async function fill(page: Page, mode: "signup" | "login") {
  if (mode === "signup") await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await page.getByPlaceholder("you@example.com").fill(EMAIL);
  await page.getByPlaceholder("Enter password").fill("Synthetic-password-1234");
  await page.getByRole("button", { name: mode === "signup" ? "Create Secure Account" : "Login", exact: true }).last().click();
}

for (const [way, reach] of WAYS_IN) {
  test(`${way}: confirmation required -- sign-up says to check the email, its link lands on this site`, async ({ page }) => {
    test.setTimeout(240_000);
    await grantSiteAccess(page);
    const sent = await auth(page, true);
    await reach(page);
    await fill(page, "signup");
    await expect(page.getByTestId("signup-check-email")).toHaveText(`Check your email: we sent a confirmation link to ${EMAIL}. Click it, then sign in.`, { timeout: 30_000 });
    await expect(page.getByText("You can sign in with those details now")).toHaveCount(0);
    expect(page.url(), "the person stays on the login page").toMatch(/\/login/);
    const origin = new URL(page.url()).origin;
    expect(sent.signupUrls.some((address) => new URL(address).searchParams.get("redirect_to") === `${origin}/login?confirmed=1`), `the confirmation link lands on this site: ${sent.signupUrls.join(" ")}`).toBe(true);
  });

  test(`${way}: confirmation required -- a sign-in refused as unconfirmed says so and sends the link again`, async ({ page }) => {
    test.setTimeout(240_000);
    await grantSiteAccess(page);
    const sent = await auth(page, true);
    await reach(page);
    await fill(page, "login");
    await expect(page.getByTestId("signin-unconfirmed")).toContainText("Your email address is not confirmed yet.", { timeout: 30_000 });
    await expect(page.getByText("We could not sign you in with those details")).toHaveCount(0);
    await page.getByTestId("signin-resend-confirmation").click();
    await expect(page.getByTestId("signin-resent")).toHaveText(`We sent a new confirmation link to ${EMAIL}. Click it, then sign in.`, { timeout: 30_000 });
    expect(sent.resend.map((body) => `${body.type}:${body.email}`)).toEqual([`signup:${EMAIL}`]);
    const origin = new URL(page.url()).origin;
    expect(sent.signupUrls.filter((address) => address.includes("/resend")).every((address) => new URL(address).searchParams.get("redirect_to") === `${origin}/login?confirmed=1`), "the new link lands on this site too").toBe(true);
  });

  test(`${way}: confirmation not required -- sign-up signs them in, as before`, async ({ page }) => {
    test.setTimeout(240_000);
    await grantSiteAccess(page);
    await auth(page, false);
    await reach(page);
    await fill(page, "signup");
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60_000 });
    await expect(page.getByTestId("signup-check-email")).toHaveCount(0);
  });
}

test("the confirmation link's landing says the email is confirmed", async ({ page }) => {
  await grantSiteAccess(page);
  await auth(page, true);
  await page.goto("/login?confirmed=1");
  await expect(page.getByTestId("signup-confirmed")).toHaveText("Your email is confirmed. You can sign in now.", { timeout: 30_000 });
});

/*
 * THE GUEST IS TOLD, BEFORE THEIR STORY, WHAT AN ACCOUNT IS FOR AND THAT SIGNING UP SENDS A CONFIRMATION EMAIL (site owner,
 * 21 Nov 2026). On every page that starts a case, in every area: the home page's story step and the builder, both in the
 * intake's own frame. Words only; a signed-in person is not shown it.
 */
for (const court of ["small-claims", "civil", "family"] as const) {
  test(`${court}: a guest is told about the account and the confirmation email before the story box, on the home page and the builder`, async ({ page }) => {
    test.setTimeout(240_000);
    await grantSiteAccess(page);
    await autoAnswerSituation(page);
    await auth(page, true);
    await page.goto(`/?path=${court}`);
    const notice = page.getByTestId("guest-account-notice");
    await expect(notice).toHaveText(GUEST_ACCOUNT_NOTICE, { timeout: 60_000 });
    const story = page.getByLabel(STORY_LABEL, { exact: true });
    await expect(story).toBeVisible({ timeout: 60_000 });
    expect(await notice.evaluate((element, box) => Boolean(element.compareDocumentPosition(box as Node) & Node.DOCUMENT_POSITION_FOLLOWING), await story.elementHandle()), "the notice comes before the story box").toBe(true);
    await page.goto(`/builder?path=${court}`);
    await expect(page.getByTestId("guest-account-notice"), "and on the builder").toHaveText(GUEST_ACCOUNT_NOTICE, { timeout: 60_000 });
  });

  test(`${court}: a signed-in person is not shown the guest notice`, async ({ page }) => {
    test.setTimeout(240_000);
    await grantSiteAccess(page);
    await autoAnswerSituation(page);
    await fakeAccount(page);
    await page.goto(`/?path=${court}`);
    await expect(page.getByLabel(STORY_LABEL, { exact: true })).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(2_000);
    await expect(page.getByTestId("guest-account-notice")).toHaveCount(0);
  });
}
