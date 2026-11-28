/**
 * THE SIGN-UP WORDS ARE TRUE (site owner, 27 Nov 2026, Chrome finding I2h; the acceptance script's rule (s)).
 *
 * What it checks: one real sign-up through the login page's own form, signed out, with a fresh staging test address.
 * If the site tells the person "When you sign up, we email you a link to confirm your address", then being signed in
 * the moment the form is sent (no link needed) FAILS: the words are not true. If the form answers "Check your email",
 * it PASSES. The answer is written to signup-result.json beside the other acceptance results.
 * What failure it exists to catch: a promise on every page that the account-creation step does not keep (Chrome saw
 * no confirmation asked).
 *
 * Once per run, never more (it makes one real account on staging, removed at the end). Never production: refused
 * by realTestSession.ts's refuseProduction. The password is made here, held in memory, never logged.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { GUEST_ACCOUNT_NOTICE } from "../../../src/lib/auth/signUpConfirmation";
import { grantSiteAccess } from "../harness/siteAccess";
import { harnessAdmin, refuseProduction } from "../harness/realTestSession";

const PROMISE = "we email you a link to confirm your address";
// No trace and no page snapshot of the form: a failure must never save the password typed into it (27 Nov 2026: the
// first run's error-context.md held it; that account was already deleted).
test.use({ trace: "off", screenshot: "off" });

test("acceptance (s): the sign-up confirmation words are true", async ({ page }, info) => {
  test.setTimeout(180_000);
  refuseProduction(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  await grantSiteAccess(page);
  // The words, as a signed-out person reads them where a case starts.
  await page.goto("/?path=small-claims");
  const promised = (await page.locator("body").innerText()).includes(PROMISE) || GUEST_ACCOUNT_NOTICE.includes(PROMISE);
  // One real sign-up through the form.
  const email = `courtsimplified.harness+signup.${Date.now()}.${crypto.randomBytes(4).toString("hex")}@example.test`;
  const password = `${crypto.randomBytes(18).toString("base64url")}Aa1!`;
  await page.goto("/login");
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await page.locator("input[type=email]").fill(email);
  await page.locator("input[type=password]").fill(password);
  await page.getByRole("button", { name: "Create Secure Account" }).click();
  const signedIn = page.getByTestId("signup-confirmed");
  const checkEmail = page.getByTestId("signup-check-email");
  // A real answer: signed in, asked to confirm, or an alert with words in it (the page always has an empty alert box,
  // which the first run took as the answer before the form had replied).
  const spoken = page.getByRole("alert").filter({ hasText: /\S/ });
  await expect(signedIn.or(checkEmail).or(spoken).first()).toBeVisible({ timeout: 60_000 }).catch(() => {});
  const alertWords = (await spoken.first().innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 200);
  const answer = (await signedIn.isVisible().catch(() => false)) ? "signed in at once" : (await checkEmail.isVisible().catch(() => false)) ? "asked to confirm by email" : `neither (the page said: "${alertWords}")`;
  const pass = !promised || answer === "asked to confirm by email";
  const seen = promised ? `the site says "${PROMISE}"; the sign-up ${answer}` : `the site makes no email promise; the sign-up ${answer}`;
  fs.writeFileSync(info.outputPath("signup-result.json"), JSON.stringify({ rule: "(s) sign-up words true", pass, seen }, null, 1));
  // The account is removed (found by its address; best effort).
  try {
    const admin = harnessAdmin();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const made = data?.users.find((user) => user.email === email);
    if (made) await admin.auth.admin.deleteUser(made.id);
  } catch { /* the leftover is an @example.test address */ }
  // Leave the form before any failure is recorded, so nothing typed into it is kept.
  await page.goto("about:blank").catch(() => {});
  expect(pass, seen).toBe(true);
});
