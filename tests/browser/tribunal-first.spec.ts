/**
 * THE LANDLORD AND TENANT BOARD NOTICE COMES FIRST, BEFORE ANY FOLLOW-UP QUESTION -- HOME PAGE AND BUILDER, ALL THREE
 * COURTS, SIGNED IN AND GUEST (C1, site owner 9 Nov 2026).
 *
 * The report: a tenant whose first message was about mould was asked follow-up questions before (or without) being
 * told the matter goes to the Landlord and Tenant Board. Cause (9 Nov): the home page ran the code rule only when the
 * AI reading was skipped (guests), and the reading card put its own tribunal line under its questions; the builder ran
 * no tribunal check at all.
 *
 * What it checks, with the real save path (a real local or staging account; realTestSession.ts refuses production):
 *   - home page, each court, signed in and guest: after Continue, the notice (court-path-out-of-scope, the LTB's own
 *     sourced words) shows, no reading questions show, and the AI reading is never requested;
 *   - builder, each court: Family and Civil, the story answered at the chat's first question, then the notice shows in
 *     place of the next question; Small Claims, the story sent in the chat, then the notice shows and no question comes;
 *   - "Continue ... anyway" is there everywhere, and in the builder it lets the questions go on.
 *
 * STAND-INS (listed, as the test rules ask): the model routes (serveModelStandIns: the reading, the court check, the
 * guided turn). serveModelStandIns answers the AI reading (/api/case/understand) with "skipped", so it does NOT exercise
 * it; this spec replaces it again, signed in, with a reading that answers "Small Claims" and three questions -- what the
 * model gave the reported person -- and counts the requests to it. Guests use the real court check (keyword path, no
 * model key on the local server).
 *
 * WHAT FAILURE THIS CATCHES: a person whose matter belongs to a tribunal answering questions first, on any route.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { grantSiteAccess } from "./harness/siteAccess";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { OUT_OF_SCOPE_FORUMS } from "../../src/lib/case-system/intelligence/outOfScopeForums";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const MOULD = "Synthetic: I rent an apartment in Ottawa. There has been black mould in the bathroom since March and my landlord will not fix it. My daughter has asthma.";
const LABEL = { "small-claims": "Small Claims", civil: "Civil", family: "Family" } as const;
type Court = keyof typeof LABEL;
const COURTS: Court[] = ["small-claims", "civil", "family"];

/** The AI reading as the model gave it to the reported person: Small Claims, and questions first. Counts requests. */
async function readingStandIn(page: Page): Promise<{ calls: number }> {
  const seen = { calls: 0 };
  await page.route("**/api/case/understand", (route) => {
    seen.calls += 1;
    return route.fulfill({ json: { ok: true, understanding: {
      summary: "You rent an apartment.", facts: [], matters: [{ title: "Your repairs", court: "small-claims" }], mainCourt: "small-claims", side: "starting", stage: "",
      questions: [{ question: "When did the mould start?" }, { question: "Have you written to the landlord?" }, { question: "How much have you spent?" }],
      asksForPrediction: false, step: null, regime: null,
    }, answer: { status: "unavailable", statements: [], notConfirmed: [], declinedToJudge: false, missingLaw: [] } } });
  });
  return seen;
}

async function expectNotice(page: Page) {
  const notice = page.getByTestId("court-path-out-of-scope");
  await expect(notice, "the LTB notice shows").toBeVisible({ timeout: 60_000 });
  await expect(notice).toContainText(OUT_OF_SCOPE_FORUMS.ltb.name);
  await expect(notice.getByTestId("court-path-out-of-scope-continue"), "\"Continue ... anyway\" stays").toBeVisible();
  return notice;
}

for (const court of COURTS) {
  for (const who of ["signed-in", "guest"] as const) {
    test(`home page: the LTB notice comes first, no questions -- ${court}, ${who}`, async ({ page }) => {
      test.setTimeout(300_000);
      const userId = who === "signed-in" ? await authenticateRealTestUser(page, { realCases: true }) : null;
      try {
        if (!userId) await grantSiteAccess(page);
        await autoAnswerSituation(page, STARTING_NOTHING_FILED);
        if (userId) await serveModelStandIns(page, court, userId);
        const reading = userId ? await readingStandIn(page) : { calls: 0 };
        await page.goto(`/?path=${court}`, { waitUntil: "domcontentloaded" });
        await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
        const province = page.getByLabel("Province or territory");
        if (await province.isVisible().catch(() => false)) await province.selectOption("Ontario");
        await page.getByLabel("City or municipality").fill("Ottawa");
        await page.getByLabel(STORY_LABEL, { exact: true }).fill(MOULD);
        await page.getByRole("button", { name: `Continue to ${LABEL[court]} intake` }).click();
        await expectNotice(page);
        await expect(page.getByTestId("case-understanding-questions"), "no reading questions before the notice").toHaveCount(0);
        expect(reading.calls, "the AI reading is not requested before the notice").toBe(0);
      } finally {
        if (userId) await deleteHarnessUser(userId);
      }
    });
  }

  test(`builder: the LTB notice comes before the first follow-up question, and Continue anyway goes on -- ${court}`, async ({ page }) => {
    test.setTimeout(400_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      if (court === "small-claims") {
        await openBuilder(page, court, { city: "Ottawa" });
        await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
        const box = page.getByLabel(STORY_LABEL, { exact: true }).or(page.locator("textarea").last()).first();
        await box.fill(MOULD);
        await page.getByRole("button", { name: "Send", exact: true }).click();
        await expectNotice(page);
        await page.waitForTimeout(1_500);
        await expect(page.locator("[data-testid=guided-message][data-from=assistant]"), "no question is asked before the notice").toHaveCount(0);
        await page.getByTestId("court-path-out-of-scope-continue").click();
        await expect(page.locator("[data-testid=guided-message][data-from=assistant]").first(), "after Continue anyway, the questions go on").toBeVisible({ timeout: 60_000 });
      } else {
        await openBuilder(page, court, { city: "Ottawa", story: MOULD });
        await expectNotice(page);
        await expect(page.getByTestId("guided-form-question"), "no follow-up question is shown before the notice").toHaveCount(0);
        await page.getByTestId("court-path-out-of-scope-continue").click();
        await expect(page.getByTestId("guided-form-question"), "after Continue anyway, the questions go on").toBeVisible({ timeout: 30_000 });
        await expect(page.getByTestId("guided-form-question")).not.toHaveAttribute("data-key", "facts");
      }
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
