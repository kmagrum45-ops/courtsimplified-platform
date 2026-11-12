/**
 * THE REVIEW'S BUTTONS NEVER IGNORE A CLICK, AND THE CASE PAGE'S "REVIEW AND CONFIRM" OPENS THE REVIEW
 * (rule 7, site owner 6 Nov 2026; founder's Chrome check of #544, finding 5a and the two rule 7 leftovers).
 *
 * Three faults, each reproduced on this branch before its fix, all on main too:
 *   1. "Review or correct initial information" was drawn disabled while the review saved (IntakeReviewPanel.tsx,
 *      `disabled={busy}`), with no word why: a click right after Confirm did nothing.
 *   2. On the Small Claims questions route, "Continue to your next steps" with the review not confirmed sent the
 *      review back to its start and said nothing beside the button (app/builder/page.tsx handleGuidedComplete
 *      called prepareCaseGuidance() with no `from`, so ReviewNeededNotice "guided" never showed). The form route,
 *      Civil and Family already said so; they are checked too so none slips back.
 *   3. The case page's "Review and confirm" (shown after an answer changed since Confirm) opened the builder with
 *      the review closed: no Confirm on screen until the person found "Stop initial questions and review".
 *
 * What it checks, in all three courts, on this commit's code with the real save path (a real local or staging
 * account, realTestSession.ts refuses production) and the model stand-ins:
 *   1. a click on "Review or correct initial information" the instant it appears after Confirm opens the review;
 *   2. "Continue to your next steps" with the review not confirmed shows "needs confirming" beside that button
 *      (Small Claims form and questions routes, Civil, Family);
 *   3. after a change since Confirm, the case page's "Review and confirm" opens the review, brought into view, with Confirm in it;
 *   4. the case page's "Show my next step" link, opened on a case no longer confirmed, says why at the top of the review.
 *
 * WHAT FAILURE THIS CATCHES: a button that does nothing with no word why, and a link that does not do what it says.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { recordInitialUnknowns, saveCaseStory, tickIfAsked } from "./harness/intakeReview";
import { chooseOffers } from "./harness/offers";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const STORY = "Synthetic: I paid a contractor $5,000 in March 2026 to repair my roof and the work was never done.";
type Court = "small-claims" | "civil" | "family";
const COURTS: Court[] = ["small-claims", "civil", "family"];

/** The whole form open, a first answer typed, saved. Returns the case id. */
async function startOnForm(page: Page, court: Court): Promise<string> {
  if (court === "small-claims") {
    await openBuilder(page, court, { city: "Ottawa" });
    await page.getByRole("button", { name: "Fill in the form yourself" }).click();
    await page.getByLabel("Case story", { exact: true }).fill(STORY);
    await saveCaseStory(page);
    await page.getByTestId("sc-intake-amountClaimed").fill("$5,000");
    await page.getByTestId("sc-intake-amountClaimed").blur();
  } else {
    await openBuilder(page, court, { city: "Ottawa", story: STORY });
    await page.getByTestId("guided-form-show-form").click();
    // An answer given before Confirm, so changing it later cancels the confirmation (a first answer to a "not sure"
    // after Confirm keeps it, by design: D1 review).
    const party = page.locator("label").filter({ has: page.locator("span.font-semibold", { hasText: /^Other party$/ }) }).locator("input, textarea").first();
    await party.fill("Synthetic Testwood Ltd.");
    await party.blur();
  }
  await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
  return new URL(page.url()).searchParams.get("intake") ?? "";
}

/**
 * An answer the next steps rest on, changed in the whole form after Confirm (the amount in Small Claims, the other
 * party in civil and Family): the confirmation is cancelled ("confirm again"). A box like "Your name" is not such an
 * answer and leaves the confirmation standing.
 */
async function changeInForm(page: Page, court: Court) {
  const field = court === "small-claims" ? page.getByTestId("sc-intake-amountClaimed")
    : page.locator("label").filter({ has: page.locator("span.font-semibold", { hasText: /^Other party$/ }) }).locator("input, textarea").first();
  // Answered "I do not know yet" on the review, the box is folded ("Not answered yet... Add it"): opened, as a person does.
  const folded = page.getByTestId("not-answered-yet").filter({ hasText: court === "small-claims" ? /amount/i : /other party/i }).getByTestId("not-answered-yet-add");
  if (!(await field.isVisible().catch(() => false)) && await folded.count()) await folded.first().click();
  await expect(field).toBeVisible({ timeout: 60_000 });
  await field.fill(court === "small-claims" ? "$6,100" : "Synthetic Otherco Ltd.");
  await field.blur();
  await expect(page.getByTestId("intake-review")).not.toHaveAttribute("data-phase", "user-confirmed", { timeout: 30_000 });
  await page.waitForTimeout(3_000);
}

/** The review opened and its questions answered, up to (not including) Confirm. */
async function readyToConfirm(page: Page) {
  const panel = page.getByTestId("intake-review");
  if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  const kind = page.locator('[data-question="sc-orient-dispute-category"]').getByRole("button").first();
  if (await kind.count()) await kind.click();
  const filed = page.locator('[data-question="sc-claim-filed"]');
  if (await filed.count()) await filed.getByRole("button", { name: "No", exact: true }).click();
  await recordInitialUnknowns(page);
  await tickIfAsked(page);
}

for (const court of COURTS) {
  test(`"Review or correct initial information" clicked the instant it appears after Confirm opens the review -- ${court}`, async ({ page }) => {
    test.setTimeout(480_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      await startOnForm(page, court);
      await readyToConfirm(page);
      await page.evaluate(() => {
        const w = window as unknown as { __instant?: { disabled: boolean; text: string | null }[] };
        w.__instant = [];
        const tryClick = () => {
          const button = document.querySelector<HTMLButtonElement>("[data-testid=intake-view-review]");
          if (!button) return false;
          w.__instant!.push({ disabled: button.disabled, text: button.textContent });
          button.click();
          return true;
        };
        const watcher = new MutationObserver(() => { if (tryClick()) watcher.disconnect(); });
        watcher.observe(document.body, { subtree: true, childList: true, attributes: true });
      });
      await page.getByTestId("intake-confirm").click();
      await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
      const seen = await page.evaluate(() => (window as unknown as { __instant?: unknown[] }).__instant ?? []);
      expect(seen.length, "the instant click reached the button").toBeGreaterThan(0);
      await expect(page.getByTestId("intake-close-review"), `the click was ignored (button when clicked: ${JSON.stringify(seen)})`).toBeVisible({ timeout: 20_000 });
    } finally {
      await deleteHarnessUser(userId);
    }
  });

  test(`after an answer changed since Confirm, the case page's "Review and confirm" opens the review with Confirm -- ${court}`, async ({ page }) => {
    test.setTimeout(480_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      const caseId = await startOnForm(page, court);
      await readyToConfirm(page);
      await page.getByTestId("intake-confirm").click();
      await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
      // A change since Confirm, in the whole form (the place Chrome changed it).
      await changeInForm(page, court);
      await page.goto(`/cases/${caseId}`);
      const again = page.getByTestId("case-review-again");
      await expect(again).toBeVisible({ timeout: 60_000 });
      await again.click();
      await expect(page.getByTestId("intake-review"), "the review is open").toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
      // The review opens at its top (the answers to check come first); Confirm is in it, below them.
      await expect(page.getByTestId("intake-review"), "the review is brought into view").toBeInViewport({ ratio: 0.1, timeout: 30_000 });
      await expect(page.getByTestId("intake-confirm"), "Confirm is in the open review").toBeVisible({ timeout: 30_000 });
      // Opened once: a reload does not open it again (the address no longer asks).
      expect(new URL(page.url()).searchParams.get("review"), "the request is taken out of the address").toBeNull();
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}

for (const route of ["small-claims form", "small-claims questions", "civil", "family"] as const) {
  test(`"Continue to your next steps" before the review is confirmed says so beside the button -- ${route}`, async ({ page }) => {
    test.setTimeout(600_000);
    const court: Court = route.startsWith("small-claims") ? "small-claims" : route as Court;
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      if (route === "small-claims questions") {
        await openBuilder(page, court, { city: "Ottawa" });
        await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
        const send = page.getByTestId("guided-send-saved-story");
        if (await send.isVisible({ timeout: 5_000 }).catch(() => false)) await send.click();
        // No story saved yet: the chat starts with the story itself.
        const storyBox = page.getByRole("textbox", { name: "Your story" });
        if (await storyBox.isVisible({ timeout: 10_000 }).catch(() => false)) {
          await storyBox.fill(STORY);
          await page.getByRole("button", { name: "Send", exact: true }).click();
        }
        const cont = page.getByRole("button", { name: "Continue to your next steps", exact: true });
        let last = "";
        for (let i = 0; i < 30; i++) {
          const question = page.locator("[data-testid=guided-message][data-from=assistant]").last();
          const proposals = page.getByTestId("story-proposals");
          await expect(cont.or(proposals).or(question).first()).toBeVisible({ timeout: 60_000 });
          await page.waitForTimeout(800);
          if (await cont.isVisible().catch(() => false)) break;
          // The questions ended and the next step was asked for on their own: the review was sent back to its start.
          if (await page.getByTestId("intake-review").getAttribute("data-phase") === "reviewing") break;
          if (await proposals.isVisible().catch(() => false)) {
            await chooseOffers(proposals, "no"); await proposals.getByTestId("story-proposals-continue").click();
            await expect(proposals.getByTestId("working-note")).toHaveCount(0, { timeout: 120_000 });
            continue;
          }
          const text = (await question.innerText()).replace(/\s+/g, " ");
          if (text === last && !(await page.locator("textarea").last().isEnabled().catch(() => false))) { await page.waitForTimeout(1_500); continue; }
          last = text;
          const toldStory = await page.locator("[data-testid=guided-message][data-from=user]").count();
          const answer = !toldStory ? STORY
            : /how much|amount/i.test(text) ? "$5,000"
            : /kind of dispute/i.test(text) ? "A contract or agreement dispute"
            : /bringing this claim|responding to a claim/i.test(text) ? "Bringing the claim (plaintiff)"
            : /filed|served/i.test(text) ? "No"
            : "I don't know";
          const before = await page.locator("[data-testid=guided-message]").count();
          await page.locator("textarea").last().fill(answer);
          await page.getByRole("button", { name: "Send", exact: true }).click();
          await expect.poll(() => page.locator("[data-testid=guided-message]").count(), { timeout: 60_000 }).toBeGreaterThan(before + 1).catch(() => {});
        }
        await expect(page.getByTestId("intake-review")).not.toHaveAttribute("data-phase", "user-confirmed");
        // Pressed (or, at the end of the questions, asked for on their own): the line beside the questions' Continue.
        if (await cont.isVisible().catch(() => false)) await cont.click();
      } else {
        await startOnForm(page, court);
        await expect(page.getByTestId("intake-review")).not.toHaveAttribute("data-phase", "user-confirmed");
        const cont = court === "small-claims" ? page.getByTestId("sc-intake-analyze") : page.getByTestId(`${court}-intake-continue`);
        await cont.click();
      }
      await expect(page.getByTestId("review-needed-beside-button").filter({ visible: true }), "the button says why no next step was shown").toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId("completed-case-overview")).toHaveCount(0);
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}

for (const court of COURTS) {
  test(`the case page's "Show my next step" link on a case no longer confirmed says why, not nothing -- ${court}`, async ({ page }) => {
    test.setTimeout(480_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      const caseId = await startOnForm(page, court);
      await readyToConfirm(page);
      await page.getByTestId("intake-confirm").click();
      await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
      // The case page's link was drawn while confirmed; an answer changed since (another tab, the form).
      await changeInForm(page, court);
      // The address the case page's "Show my next step" / "Update my next steps" opens (CaseHomeContext builderHref, startNextStep).
      await page.goto(`/builder?caseId=${caseId}&path=${court}&next=start`);
      await expect(page.getByTestId("intake-review")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("next-start-blocked"), "the link said nothing about why no next step was shown").toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId("next-start-blocked")).toContainText(/confirm/i);
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
