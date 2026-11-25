/**
 * Every box that asks for the person's story shows the one shared guidance text,
 * and works on a phone (site owner, 30 Oct).
 *
 * For each story box (home page, "not sure which court" guide, Small Claims form
 * and one-at-a-time questions, Family and civil one-at-a-time questions and their
 * whole forms' "Case story" editor, the review panel's story box; guest, and
 * signed in for two of them), at desktop width (1280) and phone width (390x844):
 *   - the text the box is described by (aria-describedby) is exactly
 *     STORY_GUIDANCE (src/lib/case-system/copy/storyGuidance.ts), and every
 *     visible story-guidance block on the page says the same;
 *   - no box's accessible name repeats the guidance's opening words, and the
 *     boxes named for the story (home page, Small Claims chat, Family and civil
 *     story question) are named STORY_LABEL, shown as visible text where the
 *     box has a visible label or question;
 *   - at phone width, the box and its submit / continue / save button sit inside
 *     the viewport's width, the page does not scroll sideways, and the button can
 *     be scrolled into view;
 *   - a full-page screenshot of each box at each width is saved in the test's
 *     output folder (story-<box>-<width>.png). CI uploads them always, as the
 *     "story-box-screenshots" artifact, so the owner can look at every box
 *     without running anything.
 *
 * What failure it catches: a story box that lost the shared text or grew its own
 * (the terminal check, test:story-guidance, reads the source; this reads the
 * rendered page), and a story box or its button pushed off a phone screen.
 *
 * Stand-ins: grantSiteAccess (site gate cookie), autoAnswerSituation/openBuilder
 * (the situation questions answered "starting, nothing filed"), fakeAccount for
 * the signed-in runs (a synthetic session in localStorage, Supabase auth and case
 * rows answered in the browser, every /api/* call answered 503: no AI, no
 * database write). No AI call is made: no box is submitted.
 *
 * CI only: Playwright here starts a dev server (playwright.config.ts).
 */
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { STORY_GUIDANCE, STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { openBuilder } from "./harness/builderGate";
import { saveCaseStory } from "./harness/intakeReview";
import { grantSiteAccess } from "./harness/siteAccess";
import { fakeAccount } from "./harness/syntheticIntakeAccount";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const STORY = "Synthetic story: a contractor was paid $9,000 in May 2026 to fix my roof and never came back.";
const DESKTOP = { width: 1280, height: 900 };
const PHONE = { width: 390, height: 844 };

/** named: the box is named for the story (STORY_LABEL); label: the visible text that shows that name, if any. */
type Box = { box: Locator; button: Locator; named?: boolean; label?: Locator };
/** The guidance's opening words (its first clause), which no box's name may repeat (site owner, 30 Oct). */
const OPENING = STORY_GUIDANCE.split(/[,.]/)[0];
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Desktop then phone: the guidance, the screenshots, and at phone width the fit. */
async function checkBox(page: Page, testInfo: TestInfo, name: string, open: (page: Page) => Promise<Box>) {
  await page.setViewportSize(DESKTOP);
  const { box, button, named, label } = await open(page);
  for (const size of [DESKTOP, PHONE]) {
    await page.setViewportSize(size);
    await expect(box, `${name}: the story box is shown`).toBeVisible({ timeout: 60_000 });

    await expect(box, `${name}: the box's name does not repeat the guidance's opening words`).not.toHaveAccessibleName(new RegExp(`${escapeRegExp(OPENING)}|in your own words`, "i"));
    if (named) await expect(box, `${name}: the box is named by the shared label`).toHaveAccessibleName(STORY_LABEL);
    if (label) await expect(label, `${name}: the shared label is shown by the box`).toBeVisible();

    const describedBy = (await box.getAttribute("aria-describedby")) ?? "";
    const guidanceId = describedBy.split(/\s+/).find((id) => /story-guidance|-guidance$/.test(id));
    expect(guidanceId, `${name}: the box is described by the shared guidance (aria-describedby="${describedBy}")`).toBeTruthy();
    const guidance = page.locator(`[id="${guidanceId}"]`);
    await expect(guidance, `${name}: the guidance is visible`).toBeVisible();
    expect((await guidance.innerText()).trim(), `${name}: the guidance is the shared text`).toBe(STORY_GUIDANCE);
    for (const shown of await page.getByTestId("story-guidance").filter({ visible: true }).all()) {
      expect((await shown.innerText()).trim(), `${name}: every story guidance on the page is the shared text`).toBe(STORY_GUIDANCE);
    }

    if (size === PHONE) {
      const fits = async (what: string, locator: Locator) => {
        await locator.scrollIntoViewIfNeeded();
        await expect(locator, `${name}: the ${what} can be scrolled into view at phone width`).toBeInViewport();
        const rect = await locator.boundingBox();
        expect(rect, `${name}: the ${what} has a box`).not.toBeNull();
        expect(rect!.x, `${name}: the ${what} starts inside the screen`).toBeGreaterThanOrEqual(0);
        expect(rect!.x + rect!.width, `${name}: the ${what} ends inside the 390px screen`).toBeLessThanOrEqual(PHONE.width + 1);
      };
      await fits("story box", box);
      await fits("button", button);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${name}: the page does not scroll sideways at phone width`).toBeLessThanOrEqual(1);
    }
    await page.screenshot({ path: testInfo.outputPath(`story-${name}-${size.width}.png`), fullPage: true });
  }
}

async function homeBox(page: Page): Promise<Box> {
  await grantSiteAccess(page);
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  return { box: page.getByLabel(STORY_LABEL, { exact: true }), button: page.getByRole("button", { name: /^Continue to .* intake$/ }), named: true, label: page.locator("label").getByText(STORY_LABEL, { exact: true }) };
}

async function finderBox(page: Page): Promise<Box> {
  await grantSiteAccess(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Not sure which one/ }).click();
  return { box: page.getByLabel("Guide what happened"), button: page.getByRole("button", { name: "Review possible court paths" }) };
}

async function smallClaimsFormBox(page: Page): Promise<Box> {
  await openBuilder(page, "small-claims");
  await page.getByRole("button", { name: "Fill in the form yourself" }).click();
  return { box: page.getByLabel("Case story", { exact: true }), button: page.getByTestId("sc-story-save") };
}

async function smallClaimsGuidedBox(page: Page): Promise<Box> {
  await openBuilder(page, "small-claims");
  await page.getByRole("button", { name: "Answer questions one at a time with AI help" }).click();
  return { box: page.getByRole("textbox", { name: STORY_LABEL, exact: true }), button: page.getByRole("button", { name: "Send", exact: true }), named: true };
}

function guidedQuestionsBox(court: "family" | "civil") {
  return async (page: Page): Promise<Box> => {
    await openBuilder(page, court);
    const question = page.getByTestId("guided-form-question");
    await expect(question).toHaveAttribute("data-key", "facts", { timeout: 60_000 });
    return { box: question.getByRole("textbox"), button: page.getByTestId("guided-form-next"), named: true, label: question.getByText(STORY_LABEL, { exact: true }) };
  };
}

function wholeFormBox(court: "family" | "civil") {
  return async (page: Page): Promise<Box> => {
    await openBuilder(page, court, { story: STORY });
    await page.getByTestId("guided-form-show-form").click();
    await page.getByRole("button", { name: "Edit case story", exact: true }).click();
    return { box: page.getByLabel("Case story", { exact: true }), button: page.getByTestId(`${court}-story-save`) };
  };
}

async function reviewPanelBox(page: Page): Promise<Box> {
  const { box } = await smallClaimsFormBox(page);
  await box.fill(STORY);
  await saveCaseStory(page);
  await page.getByTestId("intake-start-review").click();
  const panel = page.getByTestId("intake-review");
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  return { box: panel.getByTestId("review-story-draft"), button: panel.getByTestId("review-story-save") };
}

const BOXES: [string, (page: Page) => Promise<Box>][] = [
  ["home", homeBox],
  ["not-sure-guide", finderBox],
  ["small-claims-form", smallClaimsFormBox],
  ["small-claims-one-at-a-time", smallClaimsGuidedBox],
  ["family-one-at-a-time", guidedQuestionsBox("family")],
  ["civil-one-at-a-time", guidedQuestionsBox("civil")],
  ["family-form", wholeFormBox("family")],
  ["civil-form", wholeFormBox("civil")],
  ["review-panel", reviewPanelBox],
];

for (const [name, open] of BOXES) {
  test(`story box, guest: ${name}`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await checkBox(page, testInfo, `${name}-guest`, open);
  });
}

// Signed in: the same boxes read the same text (a synthetic account; nothing reaches a database).
for (const [name, open] of BOXES.filter(([box]) => box === "home" || box === "family-one-at-a-time")) {
  test(`story box, signed in: ${name}`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await fakeAccount(page);
    await checkBox(page, testInfo, `${name}-signed-in`, open);
  });
}
