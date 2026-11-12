/**
 * THE OTHER PARTY THE ACCEPTED STORY READING NAMES IS ON THE RECORD: NEVER ASKED AGAIN, AND EVERY SCREEN SHOWS IT;
 * A LATER CHANGE WINS EVERYWHERE (Chrome check of production c38e69fd, 8 Nov 2026, B1).
 *
 * Chrome: "Here is what we understood" named Alex Testwood (Small Claims), Dana Testwood (Civil) and Jordan Testfield
 * (Family); the person accepted the reading; the record never got the other party: Small Claims' review and Form 7A box
 * stayed empty, Civil and Family asked "Who is the other side?" / "What is the other person's name?" again. Cause: the
 * home page wrote only the story and the city (HomeLocationGate.tsx goToIntake).
 *
 * What it checks, in all three courts, with the real save path (a real local or staging account; realTestSession.ts
 * refuses production), the model stand-ins and a fixed story reading naming the other party: the reading accepted with
 * its own button; then the questions never ask for the other party, the review shows the name, the case page heading
 * and "What we have so far" show it after Confirm (Small Claims: the Form 7A name box too); then the name is changed in
 * the review, and the review and "What we have so far" show the new name.
 *
 * WHAT FAILURE THIS CATCHES: an answer the person saw and accepted lost, asked again, or shown in one place only.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser, harnessAdmin } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { recordInitialUnknowns, tickIfAsked } from "./harness/intakeReview";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const CASES = {
  "small-claims": { label: "Small Claims", name: "Alex Testwood", factLabel: "Other party", story: "Synthetic: In March 2026 I lent my friend Alex Testwood $4,500 for a car repair. He promised to repay me by June 1, 2026 but has not paid anything back." },
  civil: { label: "Civil", name: "Dana Testwood", factLabel: "Other party", story: "Synthetic: In June 2025 I lent my former business partner, Dana Testwood, $85,000 by e-transfer to buy equipment. She signed a one-page note promising to repay it by March 1, 2026. She has paid nothing." },
  family: { label: "Family", name: "Jordan Testfield", factLabel: "Other parent", story: "Synthetic: Jordan Testfield and I lived together from 2018 to August 2025 but never married. Our daughter is 6 and lives with me. I want a regular parenting-time schedule." },
} as const;

async function confirmHere(page: Page) {
  const panel = page.getByTestId("intake-review");
  if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 30_000 });
  // The kind is left "I do not know yet" here, and picked on the overview (Form 7A's checklist needs a kind of claim).
  await recordInitialUnknowns(page);
  await tickIfAsked(page);
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`the accepted reading's other party is on the record, never asked again, shown everywhere; a change wins -- ${court}`, async ({ page }) => {
    test.setTimeout(900_000);
    const { label, name, factLabel, story } = CASES[court];
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      // The story reading, fixed, naming the other party (the real one is a model call).
      await page.route("**/api/case/understand", (route) => route.fulfill({ json: {
        ok: true,
        understanding: { summary: "Synthetic reading of your story.", facts: [{ label: factLabel, value: name }], matters: [], mainCourt: court, side: "starting", stage: "", questions: [], asksForPrediction: false, step: null, regime: null },
        answer: { status: "answered", statements: [], notConfirmed: [], declinedToJudge: false },
      } }));
      await page.goto(`/?path=${court}`);
      await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
      await page.getByLabel("City or municipality").fill("Ottawa");
      await page.getByLabel(STORY_LABEL, { exact: true }).fill(story);
      await page.getByRole("button", { name: `Continue to ${label} intake` }).click();
      const accept = page.getByTestId("case-understanding-continue-suggested").or(page.getByTestId("case-understanding-continue-chosen")).first();
      await expect(accept).toBeVisible({ timeout: 60_000 });
      await accept.click();
      await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
      const notice = page.getByTestId("acknowledgement-checkbox");
      if (await notice.waitFor({ state: "visible", timeout: 20_000 }).then(() => true, () => false)) { await notice.check(); await page.getByTestId("acknowledgement-continue").click(); await expect(notice).toBeHidden({ timeout: 30_000 }); }
      const id = new URL(page.url()).searchParams.get("intake") ?? "";

      // The questions never ask for the other party (Civil and Family ask one at a time).
      if (court !== "small-claims") {
        const asked: string[] = [];
        for (let i = 0; i < 12; i++) {
          const question = page.getByTestId("guided-form-question");
          if (!(await question.isVisible({ timeout: 5_000 }).catch(() => false))) break;
          const key = (await question.getAttribute("data-key")) ?? "";
          asked.push(key);
          const skip = question.getByRole("button", { name: /Skip, I'm not sure/ });
          if (await skip.count()) await skip.click(); else break;
          await page.waitForTimeout(400);
        }
        expect(asked, "the questions asked for the other party again").not.toContain("otherParty");
      } else {
        await page.getByRole("button", { name: "Fill in the form yourself" }).click();
      }

      // The review shows the name, then Confirm.
      const panel = page.getByTestId("intake-review");
      if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
      // The other party's own line (never the story box, which holds the name in the person's words anyway).
      const otherLine = panel.locator("[data-testid=intake-entry]").filter({ has: page.locator('[data-fact="otherParty"], [data-field="otherParty"]') }).or(panel.locator('[data-testid=intake-entry][data-field="otherParty"]')).first();
      await expect(otherLine, "the review shows the other party on its own line").toContainText(name, { timeout: 30_000 });
      await confirmHere(page);
      await page.getByTestId("intake-continue-guidance").click();
      await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 240_000 });
      if (court === "small-claims") {
        // Form 7A's name boxes show once a kind of claim with a checklist is recorded: picked on the overview, as a person would.
        const choose = page.getByTestId("claim-kind-choose");
        if (await choose.isVisible().catch(() => false)) await choose.click();
        await page.getByTestId("claim-kind-select").selectOption("sc-claim-personal-loan-between-individuals");
        await page.getByTestId("claim-kind-use").click();
        // The overview's pick reaches the Form 7A section after a reload (an existing lag, reported separately; not B1).
        await expect(page.getByText("Kind of claim you chose")).toBeVisible({ timeout: 30_000 });
        await page.waitForTimeout(3_000);
        await page.reload();
        await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 60_000 });
        await expect(page.getByLabel("The other party's name"), "the Form 7A name box reads the record").toHaveValue(name, { timeout: 30_000 });
      }
      await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
      await page.goto(`/cases/${id}`);
      await expect(page.getByRole("heading", { level: 1 }).first(), "the case heading names the other party").toContainText(name, { timeout: 60_000 });
      await expect(page.locator('[data-testid="case-file-line"][data-fact="otherParty"]'), "\"What we have so far\" shows the other party").toContainText(name);

      // The name changed in the review: the newest name shows everywhere.
      const newer = `${name.split(" ")[0]}a Testchanged`;
      await page.locator('[data-testid="case-file-line"][data-fact="otherParty"]').getByRole("link", { name: "Change" }).click();
      const opened = page.getByTestId("intake-review").locator('[data-testid="change-answer"][data-fact="otherParty"][data-open="true"]');
      await expect(opened).toBeVisible({ timeout: 60_000 });
      await opened.getByTestId("change-answer-text").fill(newer);
      await opened.getByTestId("change-answer-save").click();
      await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
      await expect(page.getByTestId("intake-review"), "the review shows the newest name").toContainText(newer, { timeout: 30_000 });
      // The change reaches the server (its fact is numbered there) before the case page is opened.
      await expect.poll(async () => { const row = await harnessAdmin().from("cases").select("master_result").eq("id", id).single(); return JSON.stringify(row.data?.master_result ?? {}).includes(newer); }, { timeout: 30_000, message: "the changed name was saved" }).toBe(true);
      await page.goto(`/cases/${id}`);
      await expect(page.locator('[data-testid="case-file-line"][data-fact="otherParty"]'), "\"What we have so far\" shows the newest name").toContainText(newer, { timeout: 60_000 });
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
