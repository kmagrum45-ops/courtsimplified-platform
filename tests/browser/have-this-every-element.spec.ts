/**
 * "I HAVE THIS" AND "I DON'T HAVE THIS" WORK ON EVERY ELEMENT OF THE FORM 7A CHECKLIST (site owner, 27 Nov 2026, item
 * I2(f) and (g)).
 * The browser test of 27 Nov: on the contractor story's case file, "I have this" on "The work was not of a reasonably
 * acceptable quality, or was not finished" did nothing and the console showed twice `elementStateMap: unknown element id
 * "reasonably-acceptable-quality-cpw"`; "1 OF 3 STILL TO ADD" never moved, so items 2 and 3 were never tried. Cause:
 * the checklist lists the kind's elements, but the case had no element map saved (staging case 91f708d3), and the record
 * functions throw for an element the map does not hold (StatementOfClaimSurface.tsx, elementStateMap.ts setRecord).
 * What it checks, for the owner's stories 7 (defamation), 8 (loan) and 9 (contractor), signed in, with the real save path
 * and the model stand-ins, through "Fill in the form yourself" (which saves no element map, the case that crashed), the
 * kind chosen on the overview's "Kind of claim" chooser: on
 * the Form 7A section, each checklist item is answered in turn, alternately "I have this" (with words) and "I don't have
 * this"; each answered item leaves the list, the count goes down by one each time, no "not recorded" message shows,
 * and no console error or unhandled rejection happens on the whole journey.
 * What failure it catches: a checklist button that throws, does nothing, or leaves an item on the list.
 * Stand-ins: the model calls (serveModelStandIns). The kind is chosen on the overview, as a person can.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { openBuilder } from "./harness/builderGate";
import { recordInitialUnknowns, saveCaseStory, tickIfAsked } from "./harness/intakeReview";

test.use({ trace: "off", screenshot: "only-on-failure", navigationTimeout: 120_000, actionTimeout: 45_000 });

type Story = { name: string; claimTypeId: string; story: string; amount: string };
const STORIES: Story[] = [
  { name: "7 defamation", claimTypeId: "sc-claim-defamation-libel-slander", amount: "$10,000",
    story: "Synthetic: On September 14, 2025 my uncle's ex-girlfriend Rebecca Testsurname sent a private text message to my father and my uncle saying I stole from her. I have screenshots with her exact words. I asked her to stop and she refused. I want $10,000 for defamation and emotional distress. Nothing has been filed." },
  { name: "8 loan", claimTypeId: "sc-claim-personal-loan-between-individuals", amount: "$4,000",
    story: "Synthetic: My neighbour Jordan Testfield borrowed $4,000 from me on March 3, 2026 and promised to pay it back by June 1, 2026. He has not paid anything. I texted him twice asking for the money and he stopped answering." },
  { name: "9 contractor", claimTypeId: "sc-claim-contractor-poor-or-incomplete-work", amount: "$12,000",
    story: "Synthetic: I hired Test Fakebuild Contracting Inc. to renovate my kitchen for $12,000. We signed a contract on February 10, 2026 saying they would finish by April 15, 2026. I paid $6,000 up front. They stopped coming after two weeks and left the kitchen half done. I emailed them three times asking them to finish or refund me." },
];

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text().slice(0, 300)); });
  page.on("pageerror", (error) => errors.push(`unhandled: ${error.message.slice(0, 300)}`));
  return errors;
}

for (const story of STORIES) {
  test(`every Form 7A checklist item takes "I have this" or "I don't have this" -- story ${story.name}`, async ({ page }) => {
    test.setTimeout(900_000);
    const errors = watchConsole(page);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, "small-claims", userId);
      await openBuilder(page, "small-claims", { city: "Ottawa" });
      await page.getByRole("button", { name: "Fill in the form yourself" }).click();
      await page.getByLabel("Case story", { exact: true }).fill(story.story);
      await saveCaseStory(page);
      await page.getByTestId("sc-intake-amountClaimed").fill(story.amount);
      await page.getByTestId("sc-intake-amountClaimed").press("Tab");
      await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
      const panel = page.getByTestId("intake-review");
      if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
      await expect(panel).toHaveAttribute("data-phase", "reviewing");
      const filed = page.locator('[data-question="sc-claim-filed"]');
      if (await filed.count()) await filed.getByRole("button", { name: "No", exact: true }).click();
      await recordInitialUnknowns(page);
      await tickIfAsked(page);
      await page.getByTestId("intake-confirm").click();
      await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
      await page.getByTestId("intake-continue-guidance").click();
      await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 240_000 });

      // The kind, chosen on the overview's own "Kind of claim" chooser (left for later on the review), as a person can: a
      // catalogue kind on a case with no element map saved, the condition that crashed.
      const choose = page.getByTestId("claim-kind-choose");
      if (await choose.isVisible({ timeout: 10_000 }).catch(() => false)) await choose.click();
      await page.getByTestId("claim-kind-select").selectOption(story.claimTypeId);
      await page.getByTestId("claim-kind-use").click();
      await expect(page.getByTestId("claim-kind").first()).toHaveAttribute("data-claim-type", story.claimTypeId, { timeout: 60_000 });
      const section = page.getByTestId("statement-of-claim-surface");
      await expect(section, "the Form 7A section is shown").toBeVisible({ timeout: 120_000 });
      const items = section.getByTestId("form7a-still-to-add");
      const first = await items.count();
      expect(first, `story ${story.name}: the checklist shows at least one item to add`).toBeGreaterThan(0);

      // Answer every item, one at a time: the first one on the list each time.
      for (let turn = 0; turn < first; turn += 1) {
        const left = await items.count();
        expect(left, `turn ${turn + 1}: ${first - turn} item(s) left`).toBe(first - turn);
        const item = items.first();
        const element = await item.getAttribute("data-element");
        if (turn % 2 === 0) {
          await item.locator("textarea").fill("The screenshots and the emails I kept");
          await item.getByRole("button", { name: "I have this", exact: true }).click();
        } else {
          await item.getByRole("button", { name: "I don't have this", exact: true }).click();
        }
        await expect(section.getByTestId("element-attest-failed"), `${element}: no "not recorded" message`).toHaveCount(0);
        await expect(section.locator(`[data-testid=form7a-still-to-add][data-element="${element}"]`), `${element}: off the list after the click`).toHaveCount(0, { timeout: 10_000 });
      }
      await expect(items, "every item answered").toHaveCount(0);
      expect(errors, `story ${story.name}: no console error or unhandled rejection`).toEqual([]);
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
