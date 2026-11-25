/**
 * "SEND FEEDBACK" IS ON EVERY PAGE (site owner, 10 Nov 2026: a feedback link before outside testers).
 *
 * The link lives in the shared footer (app/layout.tsx), which every page renders: the nested layouts (builder, case
 * pages, forms, legal-principles) return their children inside it, and no page has its own <html>. It is a mailto: to
 * the contact address the privacy page names (src/lib/site/contact.ts), with no storage of its own.
 *
 * What it checks: home and builder as a guest; dashboard and a case page with a real local or staging account
 * (realTestSession.ts refuses production). The case is a bare row written for the account (stand-in, listed); nothing
 * about the case matters to the footer.
 *
 * WHAT FAILURE THIS CATCHES: a page, or a new layout, without a way to send feedback.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser, harnessAdmin } from "./harness/realTestSession";
import { grantSiteAccess } from "./harness/siteAccess";
import { CONTACT_EMAIL } from "../../src/lib/site/contact";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

async function expectFeedbackLink(page: Page, where: string) {
  const link = page.getByRole("link", { name: "Send feedback" });
  await expect(link, `"Send feedback" is shown on ${where}`).toBeVisible({ timeout: 60_000 });
  await expect(link, `"Send feedback" on ${where} writes to the contact address`).toHaveAttribute("href", new RegExp(`^mailto:${CONTACT_EMAIL.replace(/[.]/g, "\\.")}(\\?|$)`));
}

test("guest: home and builder show \"Send feedback\"", async ({ page }) => {
  test.setTimeout(240_000);
  await grantSiteAccess(page);
  await page.goto("/");
  await expectFeedbackLink(page, "the home page");
  await page.goto("/builder?path=small-claims");
  await expectFeedbackLink(page, "the builder");
});

test("signed in: dashboard and a case page show \"Send feedback\"", async ({ page }) => {
  test.setTimeout(300_000);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    await page.goto("/dashboard");
    await expectFeedbackLink(page, "the dashboard");
    // STAND-IN: a bare case row for this account, so the case page has something to open.
    const row = await harnessAdmin().from("cases").insert({ user_id: userId, court_path: "small-claims", title: "Synthetic feedback-link case" }).select("id").single();
    if (row.error || !row.data) throw new Error(`could not write the case row: ${row.error?.message}`);
    await page.goto(`/cases/${row.data.id}`);
    await expectFeedbackLink(page, "a case page");
  } finally {
    await deleteHarnessUser(userId);
  }
});
