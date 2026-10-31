/**
 * SIGN-UP AND SIGN-IN TELL THE TRUTH ABOUT EMAIL CONFIRMATION (site owner, 30 Oct).
 *
 * Production requires email confirmation, so Supabase answers a new sign-up
 * with a user and no session. The login page said "Account created. You can
 * sign in with those details now."; the sign-in that followed failed with
 * Supabase's "Email not confirmed", shown as the generic "We could not sign you
 * in with those details". This checks the rendered page against stubbed
 * Supabase answers shaped as the Auth server sends them (internal/api/signup.go,
 * token.go; auth-js 2.105.4 reads the code into AuthError.code):
 *   - a no-session sign-up asks the person to confirm by email, names the
 *     address, never says they can sign in now, and asks Supabase to send the
 *     confirmation link back to this same site's /dashboard;
 *   - signing in before confirming (`email_not_confirmed`) shows "confirm your
 *     email first";
 *   - a wrong password and an unknown address (both `invalid_credentials`) show
 *     the same generic message, so nothing says whether an account exists;
 *   - a repeat sign-up for a confirmed address (no session, a user with no
 *     identities) is told the account exists, not that a link was sent.
 * The words come from src/lib/case-system/copy/authMessages.ts; the terminal
 * check is `npm run test:signup-confirm-message`.
 *
 * Synthetic throughout: Supabase Auth is answered in the browser, so no account
 * is created and nothing reaches a database or sends an email.
 */
import { expect, test, type Page } from "@playwright/test";
import { grantSiteAccess } from "./harness/siteAccess";
import {
  ACCOUNT_EXISTS_MESSAGE,
  EMAIL_NOT_CONFIRMED_MESSAGE,
  SIGN_IN_FAILED_MESSAGE,
  signUpConfirmEmailMessage,
} from "../../src/lib/case-system/copy/authMessages";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const PASSWORD = "Synthetic-password-1234";
const user = (email: string, identities: unknown[]) => ({
  id: "22222222-2222-4222-8222-222222222222", aud: "authenticated", role: "", email,
  confirmation_sent_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, identities, created_at: "2026-10-30T00:00:00Z",
});
const INVALID = { status: 400, json: { code: "invalid_credentials", error_code: "invalid_credentials", msg: "Invalid login credentials" } };

/** Supabase with confirmation required. `signup` answers sign-up; `token` answers a password sign-in. */
async function stubAuth(page: Page, answers: { signup?: (email: string) => object; token?: (email: string) => { status: number; json: object } }) {
  const signUpUrls: URL[] = [];
  await page.route("**/auth/v1/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const body = (request.postDataJSON() ?? {}) as { email?: string };
    if (url.pathname.endsWith("/signup") && answers.signup) {
      signUpUrls.push(url);
      return route.fulfill({ json: answers.signup(body.email ?? "") });
    }
    if (url.pathname.endsWith("/token") && answers.token) {
      const answer = answers.token(body.email ?? "");
      return route.fulfill({ status: answer.status, json: answer.json });
    }
    return route.fulfill({ status: 401, json: { code: "no_authorization", msg: "Synthetic: signed out" } });
  });
  return signUpUrls;
}

async function submit(page: Page, mode: "signup" | "login", email: string) {
  await page.getByRole("button", { name: mode === "signup" ? "Create Account" : "Login", exact: true }).first().click();
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("Enter password").fill(PASSWORD);
  await page.getByRole("button", { name: mode === "signup" ? "Create Secure Account" : "Login", exact: true }).last().click();
}

test.beforeEach(async ({ page }) => {
  await grantSiteAccess(page);
});

test("a no-session sign-up asks for email confirmation and the link returns to this site", async ({ page }) => {
  test.setTimeout(120_000);
  const email = "synthetic-new@example.invalid";
  const signUps = await stubAuth(page, { signup: address => user(address, [{ id: "identity-1", provider: "email" }]) });
  await page.goto("/login");
  await submit(page, "signup", email);

  await expect(page.getByText(signUpConfirmEmailMessage(email), { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/you can sign in|sign in with those details now/i)).toHaveCount(0);
  expect(new URL(page.url()).pathname, "no session, so the page stays on /login").toBe("/login");
  const origin = new URL(page.url()).origin;
  expect(signUps.at(-1)?.searchParams.get("redirect_to"), "the confirmation link comes back to this site's dashboard").toBe(`${origin}/dashboard`);
});

test("signing in before confirming says confirm your email first", async ({ page }) => {
  test.setTimeout(120_000);
  await stubAuth(page, { token: () => ({ status: 400, json: { code: "email_not_confirmed", error_code: "email_not_confirmed", msg: "Email not confirmed" } }) });
  await page.goto("/login");
  await submit(page, "login", "synthetic-unconfirmed@example.invalid");
  await expect(page.getByText(EMAIL_NOT_CONFIRMED_MESSAGE, { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(SIGN_IN_FAILED_MESSAGE, { exact: true })).toHaveCount(0);
});

test("a wrong password and an unknown address get the same generic message", async ({ page }) => {
  test.setTimeout(120_000);
  // Supabase answers both with invalid_credentials (token.go), so the page cannot tell them apart either.
  await stubAuth(page, { token: () => INVALID });
  await page.goto("/login");
  for (const email of ["synthetic-known@example.invalid", "synthetic-unknown@example.invalid"]) {
    await submit(page, "login", email);
    await expect(page.getByText(SIGN_IN_FAILED_MESSAGE, { exact: true }), email).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(EMAIL_NOT_CONFIRMED_MESSAGE, { exact: true }), email).toHaveCount(0);
    await expect(page.getByText(/already exists|no account|not registered/i), email).toHaveCount(0);
  }
});

test("a repeat sign-up for a confirmed address is told the account exists", async ({ page }) => {
  test.setTimeout(120_000);
  const email = "synthetic-confirmed@example.invalid";
  // The sanitized user Supabase returns: no session, empty identities, nothing sent (signup.go sanitizeUser).
  await stubAuth(page, { signup: address => user(address, []) });
  await page.goto("/login");
  await submit(page, "signup", email);
  await expect(page.getByText(ACCOUNT_EXISTS_MESSAGE, { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(signUpConfirmEmailMessage(email), { exact: true })).toHaveCount(0);
});
