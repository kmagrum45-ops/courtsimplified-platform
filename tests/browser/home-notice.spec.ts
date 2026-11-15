/**
 * THE HOME PAGE SENDS NOTHING TO THE AI BEFORE THE "BEFORE YOU START" NOTICE IS ACCEPTED (site owner, 15 Nov 2026).
 *
 * "No story or case text may be sent to the AI before the person has accepted the notice." The home page's Continue read
 * the story (/api/case/understand) and suggested a court (/api/classify-court-path) before the person had seen the
 * notice, which was first shown on the next screen. Continue now shows the same notice there first.
 *
 * What it checks, in all three courts, every network request watched:
 *   1. signed in (a real local or staging account; realTestSession.ts refuses production; model stand-ins): the city and
 *      story typed, Continue pressed: the notice shows, and NO work request (WORK_ROUTE) and no request carrying the
 *      story is sent, except to the database the person's own case is saved in; accepted: the flow carries on by
 *      itself to the builder, with the same story, and the builder never shows the notice again;
 *   2. a guest: Continue pressed, the notice shows; the person leaves the page and comes back before accepting: the
 *      story typed so far is still in the box, and nothing was sent.
 *
 * What failure it catches: any story text, or any AI or work request, leaving the browser before the notice is accepted.
 */
import { expect, test, type Page, type Request } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, HOME_NOTICE_BY_SPEC, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { grantSiteAccess } from "./harness/siteAccess";
import { ACKNOWLEDGEMENT_KEY } from "../../src/lib/content-library/acknowledgement";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { WORK_ROUTE } from "../../src/lib/content-library/noticeGate";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const STORY = "Synthetic home notice story: a contractor took $5,000 in March 2026 for a roof repair never done.";
const LABEL = { "small-claims": "Small Claims", civil: "Civil", family: "Family" } as const;

/** Work requests, and requests carrying the story to anywhere but the database (the person's own saved case). */
function watchSent(page: Page): string[] {
  const sent: string[] = [];
  page.on("request", (request: Request) => {
    const url = new URL(request.url());
    const database = /\/rest\/v1\/|\/auth\/v1\//.test(url.pathname);
    if (WORK_ROUTE.test(url.pathname)) sent.push(`work: ${request.method()} ${url.pathname}`);
    else if (!database && (request.postData() ?? "").includes("Synthetic home notice story")) sent.push(`story: ${request.method()} ${url.pathname}`);
  });
  return sent;
}
/** This spec answers the home page's notice itself (the harness otherwise ticks it as a person would). */
const bySpec = (page: Page) => page.addInitScript((flag) => window.sessionStorage.setItem(flag, "1"), HOME_NOTICE_BY_SPEC);
const forgetNotice = (page: Page) => page.evaluate((key) => { for (const name of Object.keys(window.localStorage)) if (name.startsWith(key)) window.localStorage.removeItem(name); }, ACKNOWLEDGEMENT_KEY);

async function typeAndContinue(page: Page, court: keyof typeof LABEL) {
  await page.getByLabel("City or municipality").fill("Ottawa");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY);
  await page.getByRole("button", { name: `Continue to ${LABEL[court]} intake` }).click();
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`home page, signed in: nothing goes to the AI before the notice is accepted; then the flow carries on -- ${court}`, async ({ page }) => {
    test.setTimeout(600_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      await bySpec(page);
    await page.goto(`/?path=${court}`);
      await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
      await forgetNotice(page);
      const sent = watchSent(page);
      await typeAndContinue(page, court);
      await expect(page.getByTestId("acknowledgement-checkbox"), "the notice shows when Continue is pressed").toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(6_000);
      expect(sent, "sent before the notice was accepted").toEqual([]);
      await page.getByTestId("acknowledgement-checkbox").check();
      await page.getByTestId("acknowledgement-continue").click();
      // The flow carries on by itself: the reading (its own button) or straight to the builder.
      const reading = page.getByTestId("case-understanding-continue-suggested").or(page.getByTestId("case-understanding-continue-chosen")).first();
      await expect(reading.or(page.getByTestId("first-use-acknowledgement")).first(), "Continue carried on after the notice").toBeVisible({ timeout: 120_000 }).catch(() => undefined);
      if (!/\/builder\?/.test(page.url()) && await reading.isVisible().catch(() => false)) await reading.click();
      await page.waitForURL(/\/builder\?/, { timeout: 120_000 });
      expect(sent.some((line) => line.startsWith("work:")), "the story was read after the notice").toBe(true);
      await page.waitForTimeout(3_000);
      await expect(page.getByTestId("acknowledgement-checkbox"), "the notice is never asked again").toHaveCount(0);
      const story = await page.evaluate(() => JSON.stringify(sessionStorage));
      expect(story, "the story came along unchanged").toContain(STORY);
    } finally {
      await deleteHarnessUser(userId);
    }
  });

  test(`home page, guest: left and come back before accepting, the story is kept and nothing was sent -- ${court}`, async ({ page }) => {
    test.setTimeout(300_000);
    await grantSiteAccess(page);
    await bySpec(page);
    await page.goto(`/?path=${court}`);
    await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
    await forgetNotice(page);
    const sent = watchSent(page);
    await typeAndContinue(page, court);
    await expect(page.getByTestId("acknowledgement-checkbox"), "the notice shows when Continue is pressed").toBeVisible({ timeout: 30_000 });
    await page.goto("/about");
    await page.goBack();
    await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByLabel(STORY_LABEL, { exact: true }), "the story typed so far is kept").toHaveValue(STORY, { timeout: 30_000 });
    await page.waitForTimeout(3_000);
    expect(sent, "sent before the notice was accepted").toEqual([]);
  });
}
