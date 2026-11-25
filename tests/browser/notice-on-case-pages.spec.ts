/**
 * THE CASE PAGES AND THE PUBLIC FORMS PAGE SHOW THE "BEFORE YOU START" NOTICE FIRST WHEN NO ACCEPTANCE IS RECORDED
 * (site owner, 16 Nov 2026).
 *
 * The notice is recorded per account on each browser (acknowledgement.ts). A person whose saved case is older than the
 * notice, or who opens it on a new device or after clearing site data, has no recorded acceptance. The case pages
 * (overview, timeline, documents, forms, drafts, case file) and the public forms page can send work (the next-step
 * answer, the law explanation, the case review, decision help, the timeline's event reading, form generation, the
 * wording tidy-up) and did not show the notice.
 *
 * What it checks, in all three courts, with the real save path (a real local or staging account; realTestSession.ts
 * refuses production) and the model stand-ins, every network request watched:
 *   1. a confirmed case with its next step made; the acceptance cleared (as on a new device): each of the six case pages
 *      and the public forms page shows the notice, draws none of the page, and sends NO work request (WORK_ROUTE) until
 *      it is accepted; once accepted, the page is drawn, and the notice is not shown again;
 *   2. a guest on the public forms page: the same.
 *
 * What failure it catches: any page that can start work drawn, or sending work, before the person has accepted the
 * notice.
 */
import { expect, test, type Page, type Request } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { confirmedCase } from "./harness/confirmedCase";
import { grantSiteAccess } from "./harness/siteAccess";
import { ACKNOWLEDGEMENT_KEY } from "../../src/lib/content-library/acknowledgement";
import { WORK_ROUTE } from "../../scripts/verification/noticeGateList";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const CASE_PAGES = ["", "/timeline", "/documents", "/forms", "/drafts", "/case-file"] as const;

function watchWork(page: Page): string[] {
  const seen: string[] = [];
  page.on("request", (request: Request) => {
    const path = new URL(request.url()).pathname;
    if (WORK_ROUTE.test(path)) seen.push(`${request.method()} ${path}`);
  });
  return seen;
}
const forgetNotice = (page: Page) => page.evaluate((key) => { for (const name of Object.keys(window.localStorage)) if (name.startsWith(key)) window.localStorage.removeItem(name); }, ACKNOWLEDGEMENT_KEY);

/** Opens the page with no recorded acceptance: the notice first, nothing of the page, no work; then accepted, the page. */
async function noticeFirst(page: Page, address: string, pageShown: () => Promise<void>) {
  await page.goto("/about");
  await forgetNotice(page);
  const work = watchWork(page);
  await page.goto(address);
  await expect(page.getByTestId("acknowledgement-checkbox"), `${address}: the notice is shown first`).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(5_000);
  expect(work, `${address}: work sent before the notice was accepted`).toEqual([]);
  await expect(page.getByTestId("case-home-title"), `${address}: none of the page is drawn behind the notice`).toHaveCount(0);
  await page.getByTestId("acknowledgement-checkbox").check();
  await page.getByTestId("acknowledgement-continue").click();
  await expect(page.getByTestId("acknowledgement-checkbox"), `${address}: the notice is gone once accepted`).toHaveCount(0, { timeout: 30_000 });
  await pageShown();
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`no recorded acceptance: every case page and the public forms page show the notice first and send no work -- ${court}`, async ({ page }) => {
    test.setTimeout(900_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      const caseId = await confirmedCase(page, court);
      await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
      await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 240_000 });
      for (const section of CASE_PAGES) {
        await noticeFirst(page, `/cases/${caseId}${section}`, () => expect(page.getByTestId("case-home-title")).toBeVisible({ timeout: 60_000 }));
      }
      await noticeFirst(page, "/forms", () => expect(page.getByTestId("notice-gate")).toHaveCount(0));
      // Accepted once: never asked again, on any of them.
      for (const section of CASE_PAGES) {
        await page.goto(`/cases/${caseId}${section}`);
        await expect(page.getByTestId("case-home-title")).toBeVisible({ timeout: 60_000 });
        await expect(page.getByTestId("acknowledgement-checkbox"), "the notice is not asked again").toHaveCount(0);
      }
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}

test("a guest on the public forms page: the notice first, no work, then the page", async ({ page }) => {
  test.setTimeout(300_000);
  await grantSiteAccess(page);
  await noticeFirst(page, "/forms", () => expect(page.getByTestId("notice-gate")).toHaveCount(0));
});
