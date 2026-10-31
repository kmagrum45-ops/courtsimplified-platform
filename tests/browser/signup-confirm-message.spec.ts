/**
 * A SIGN-UP THAT NEEDS EMAIL CONFIRMATION SAYS SO (site owner, 30 Oct).
 *
 * Production requires email confirmation, so Supabase answers a new sign-up
 * with a user and no session. The login page said "Account created. You can
 * sign in with those details now."; the sign-in that followed failed with
 * Supabase's "Email not confirmed", shown as the generic "We could not sign you
 * in with those details". This checks the rendered page:
 *   - a no-session sign-up asks the person to confirm by email, names the
 *     address, and never says they can sign in now;
 *   - signing in before confirming shows the plain "confirm your email first"
 *     message, not the generic one.
 * The words come from src/lib/case-system/copy/authMessages.ts; the terminal
 * check is `npm run test:signup-confirm-message`.
 *
 * Synthetic throughout: Supabase Auth is answered in the browser, so no account
 * is created and nothing reaches a database or sends an email.
 */
import { expect, test } from "@playwright/test";
import { grantSiteAccess } from "./harness/siteAccess";
import { EMAIL_NOT_CONFIRMED_MESSAGE, signUpConfirmEmailMessage } from "../../src/lib/case-system/copy/authMessages";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const EMAIL = "synthetic-unconfirmed@example.invalid";

test("a no-session sign-up asks for email confirmation, and signing in early says confirm first", async ({ page }) => {
  test.setTimeout(120_000);
  await grantSiteAccess(page);
  // Supabase with confirmation required: sign-up returns the user alone (no
  // access_token, so supabase-js reports no session); a password sign-in for
  // that user is refused with email_not_confirmed.
  await page.route("**/auth/v1/**", route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/signup")) {
      return route.fulfill({ json: { id: "22222222-2222-4222-8222-222222222222", aud: "authenticated", role: "", email: EMAIL, confirmation_sent_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, identities: [{ id: "x" }], created_at: "2026-10-30T00:00:00Z" } });
    }
    if (url.pathname.endsWith("/token")) {
      return route.fulfill({ status: 400, json: { code: "email_not_confirmed", error_code: "email_not_confirmed", msg: "Email not confirmed" } });
    }
    return route.fulfill({ status: 401, json: { code: "no_authorization", msg: "Synthetic: signed out" } });
  });

  await page.goto("/login");
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await page.getByPlaceholder("you@example.com").fill(EMAIL);
  await page.getByPlaceholder("Enter password").fill("Synthetic-password-1234");
  await page.getByRole("button", { name: "Create Secure Account", exact: true }).last().click();

  await expect(page.getByText(signUpConfirmEmailMessage(EMAIL), { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/you can sign in|sign in with those details now/i)).toHaveCount(0);
  expect(new URL(page.url()).pathname, "no session, so the page stays on /login").toBe("/login");

  await page.getByRole("button", { name: "Login", exact: true }).first().click();
  await page.getByPlaceholder("Enter password").fill("Synthetic-password-1234");
  await page.getByRole("button", { name: "Login", exact: true }).last().click();
  await expect(page.getByText(EMAIL_NOT_CONFIRMED_MESSAGE, { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("We could not sign you in with those details. Please try again.")).toHaveCount(0);
});
