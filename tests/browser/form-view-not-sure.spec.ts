/**
 * NO COURT'S WHOLE FORM VIEW SHOWS "I DO NOT KNOW YET" AS AN ANSWER (item 4, 6 Nov 2026).
 *
 * Founder's Chrome check of #543 (5 Nov), step 5(b): "I do not know yet" given for "What your losses are made
 * up of" was not asked again and no other screen showed it, but Civil's whole form view showed "Damages / loss /
 * impact breakdown = I do not know yet". Cause: the form folds a box to "Not answered yet" only when the box
 * stands for a case-file fact held as "not sure" (NotAnsweredYet.tsx, AskedField.tsx); that box stands for
 * none, so its words were shown as the answer.
 *
 * What it checks, in all three courts' whole form views (Small Claims form, civil, Family), on this commit's
 * code with the model stand-ins and the synthetic account: every box -- text boxes, text areas and drop-downs --
 * given "I do not know yet" (or "Not sure" where it is a choice), then the page reloaded: no box shows a "not
 * sure" answer as its value; each is "Not answered yet" with "Add it" instead. The story, the city and the
 * person's own details are left alone (they are not answers about the case).
 *
 * WHAT FAILURE THIS CATCHES: any box in any court's form showing "I do not know yet" as if it were the answer.
 */
import { expect, test, type Page } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveFromThisCommit } from "./harness/thisCommitServer";
import { openBuilder } from "./harness/builderGate";
import { saveCaseStory } from "./harness/intakeReview";
import { isUnsureAnswer } from "../../src/lib/case-system/caseFile/unsureAnswer";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

type Court = "small-claims" | "civil" | "family";
const STORIES: Record<Court, string> = {
  "small-claims": "Synthetic: I hired Test Decks Ltd. in March 2026 to build a deck for $8,000. I paid $2,000 and $6,000 is still owed.",
  civil: "Synthetic: my neighbour's contractor damaged the foundation of my house on June 3, 2025 while digging next door.",
  family: "Synthetic: my former partner and I separated in March 2026 and we disagree about parenting time for our daughter.",
};
/** Not answers about the case: left as they are. */
const SKIP = /story|city|municipality|your name|your address|your phone|your email|court file number|search/i;

async function openForm(page: Page, court: Court) {
  if (court === "small-claims") {
    await openBuilder(page, "small-claims", { city: "Kingston" });
    await page.getByRole("button", { name: "Fill in the form yourself" }).click();
    await page.getByLabel("Case story", { exact: true }).fill(STORIES[court]);
    await saveCaseStory(page);
  } else {
    await openBuilder(page, court, { city: "Kingston", story: STORIES[court] });
    await expect(page.getByTestId("guided-form-question")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("guided-form-show-form").click();
  }
  await page.waitForTimeout(2_000);
}

/** The form's boxes, as (kind, accessible name) for each visible one the test may fill. */
async function boxes(page: Page) {
  const form = page.locator("main");
  return form.locator("input[type=text]:visible, input:not([type]):visible, textarea:visible, select:visible").evaluateAll((nodes) => nodes.map((node, index) => {
    const element = node as HTMLInputElement;
    const label = element.labels?.[0]?.innerText ?? element.getAttribute("aria-label") ?? element.getAttribute("placeholder") ?? element.name ?? "";
    const options = element.tagName === "SELECT" ? [...(element as unknown as HTMLSelectElement).options].map((option) => ({ value: option.value, text: option.text })) : [];
    return { index, tag: element.tagName, label: label.trim(), testId: element.getAttribute("data-testid") ?? "", options, disabled: element.disabled, readOnly: element.readOnly };
  }));
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`whole form view: no box shows "I do not know yet" as its answer after a reload -- ${court}`, async ({ page }) => {
    test.setTimeout(480_000);
    await grantSiteAccess(page);
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
    await openForm(page, court);

    const filled: string[] = [];
    const all = page.locator("main").locator("input[type=text]:visible, input:not([type]):visible, textarea:visible, select:visible");
    for (const box of await boxes(page)) {
      if (box.disabled || box.readOnly || SKIP.test(`${box.label} ${box.testId}`)) continue;
      const element = all.nth(box.index);
      if (box.tag === "SELECT") {
        const unsure = box.options.find((option) => isUnsureAnswer(option.value) || isUnsureAnswer(option.text));
        if (!unsure) continue;
        await element.selectOption(unsure.value);
      } else {
        await element.fill("I do not know yet");
        await element.blur();
      }
      filled.push(box.label || box.testId);
    }
    expect(filled.length, "the form had boxes to fill").toBeGreaterThan(0);
    await page.waitForTimeout(4_000);

    // Reloaded (a box being typed in stays open for that visit): what the whole form view shows now.
    await page.reload();
    if (court !== "small-claims") {
      const show = page.getByTestId("guided-form-show-form");
      if (await show.isVisible({ timeout: 20_000 }).catch(() => false)) await show.click();
    } else {
      const fill = page.getByRole("button", { name: "Fill in the form yourself" });
      if (await fill.isVisible({ timeout: 10_000 }).catch(() => false)) await fill.click();
    }
    await page.waitForTimeout(4_000);
    const shown = await page.locator("main").locator("input:visible, textarea:visible, select:visible").evaluateAll((nodes) => nodes.map((node) => {
      const element = node as HTMLInputElement;
      const value = element.tagName === "SELECT" ? (element as unknown as HTMLSelectElement).selectedOptions[0]?.text ?? "" : element.value;
      return { label: (element.labels?.[0]?.innerText ?? element.getAttribute("aria-label") ?? element.getAttribute("data-testid") ?? "").trim(), value };
    }));
    const asAnswers = shown.filter((box) => isUnsureAnswer(box.value) && !SKIP.test(box.label)).map((box) => `${box.label} = ${box.value}`);
    expect(asAnswers, `boxes filled: ${filled.length} (${filled.join("; ")})`).toEqual([]);
  });
}
