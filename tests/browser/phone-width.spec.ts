/**
 * No intake page scrolls sideways on a phone (site owner, 15 Nov).
 *
 * At 390x844, as a guest and signed in, on: the Small Claims form and the review panel (both with
 * the Parties step drawn, every optional box opened and a second other party added, so every
 * Parties box is on screen), the Small Claims one-at-a-time chat, and Family and Civil intake
 * (one at a time, and the whole form):
 *   - the page does not scroll sideways (scrollWidth - clientWidth <= 1);
 *   - no element ends past the screen's right edge (the failure names each one, so the cause is
 *     in the message, not a screenshot);
 *   - where the Parties step is drawn, every one of its input boxes is inside the screen.
 *
 * What failure it catches: a box with a fixed minimum width (the Parties step's inputs had
 * min-w-[14rem], which with the boxes around them made every form column 326px on a 316px
 * screen, a 10px sideways scroll; found by story-box-guidance on PR #550), or any other new
 * element wider than a phone. story-box-guidance checks the story box pages only; this checks
 * the pages the Parties step and the other intake boxes are on.
 *
 * Stand-ins: grantSiteAccess / openBuilder (the situation questions answered "starting, nothing
 * filed"), fakeAccount for the signed-in runs (a synthetic session in localStorage, Supabase auth
 * and case rows answered in the browser, every /api/* call answered 503: no AI, no database
 * write). No AI call is made.
 */
import { expect, test, type Page } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { saveCaseStory } from "./harness/intakeReview";
import { fakeAccount } from "./harness/syntheticIntakeAccount";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const PHONE = { width: 390, height: 844 };
const STORY = "Synthetic story: a contractor was paid $9,000 in May 2026 to fix my roof and never came back.";

/** Leaf-most elements whose right edge is past the screen (an element whose own child also sticks out is skipped). */
async function pastTheEdge(page: Page): Promise<{ scroll: number; offenders: string[] }> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const out = (element: Element) => element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().right > width + 1;
    const offenders = Array.from(document.querySelectorAll("body *"))
      .filter((element) => out(element) && !Array.from(element.children).some(out))
      .slice(0, 10)
      .map((element) => `${element.tagName.toLowerCase()}[data-testid=${element.getAttribute("data-testid") ?? "-"}] ends at ${Math.round(element.getBoundingClientRect().right)}px: "${(element.textContent ?? "").trim().slice(0, 40)}"`);
    return { scroll: document.documentElement.scrollWidth - width, offenders };
  });
}

/** Every Parties box on screen: each party's optional boxes opened, and a second other party added. */
async function openEveryPartiesBox(page: Page) {
  const step = page.getByTestId("parties-step").filter({ visible: true }).first();
  await expect(step, "the Parties step is drawn").toBeVisible({ timeout: 60_000 });
  await step.getByTestId("parties-add-other").click();
  for (let i = 0; i < 6; i++) {
    const open = step.getByTestId("parties-optional-open");
    if (!(await open.count())) break;
    await open.first().click();
  }
  await expect(step.getByTestId("parties-optional-open"), "every party's optional boxes are open").toHaveCount(0);
  return step;
}

async function checkPhone(page: Page, name: string, parties: boolean) {
  await page.setViewportSize(PHONE);
  await page.waitForTimeout(300);
  const { scroll, offenders } = await pastTheEdge(page);
  expect(offenders, `${name}: no element ends past the 390px screen`).toEqual([]);
  expect(scroll, `${name}: the page does not scroll sideways at 390px`).toBeLessThanOrEqual(1);
  if (!parties) return;
  const inputs = page.getByTestId("parties-step").filter({ visible: true }).first().locator("input");
  const count = await inputs.count();
  expect(count, `${name}: the Parties step has input boxes to check`).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const rect = await inputs.nth(i).boundingBox();
    expect(rect, `${name}: Parties box ${i} has a box`).not.toBeNull();
    expect(rect!.x, `${name}: Parties box ${i} starts inside the screen`).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width, `${name}: Parties box ${i} ends inside the 390px screen`).toBeLessThanOrEqual(PHONE.width + 1);
  }
}

type Open = (page: Page) => Promise<void>;
const PAGES: [string, boolean, Open][] = [
  ["small-claims form", true, async (page) => {
    await openBuilder(page, "small-claims");
    await page.getByRole("button", { name: "Fill in the form yourself" }).click();
    await openEveryPartiesBox(page);
  }],
  ["small-claims review panel", true, async (page) => {
    await openBuilder(page, "small-claims");
    await page.getByRole("button", { name: "Fill in the form yourself" }).click();
    await page.getByLabel("Case story", { exact: true }).fill(STORY);
    await saveCaseStory(page);
    await page.getByTestId("intake-start-review").click();
    await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing");
    await openEveryPartiesBox(page);
  }],
  ["small-claims one at a time", false, async (page) => {
    await openBuilder(page, "small-claims");
    await page.getByRole("button", { name: "Answer questions one at a time with AI help" }).click();
    await expect(page.getByRole("button", { name: "Send", exact: true })).toBeVisible({ timeout: 60_000 });
  }],
  ...(["family", "civil"] as const).flatMap((court): [string, boolean, Open][] => [
    [`${court} one at a time`, false, async (page) => {
      await openBuilder(page, court);
      await expect(page.getByTestId("guided-form-question")).toHaveAttribute("data-key", "facts", { timeout: 60_000 });
    }],
    [`${court} whole form`, false, async (page) => {
      await openBuilder(page, court, { story: STORY });
      await page.getByTestId("guided-form-show-form").click();
      await expect(page.getByRole("button", { name: "Edit case story", exact: true })).toBeVisible({ timeout: 60_000 });
    }],
  ]),
];

for (const signedIn of [false, true]) {
  for (const [name, parties, open] of PAGES) {
    test(`phone width, ${signedIn ? "signed in" : "guest"}: ${name}`, async ({ page }) => {
      test.setTimeout(180_000);
      if (signedIn) await fakeAccount(page);
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page);
      await checkPhone(page, `${name} (${signedIn ? "signed in" : "guest"})`, parties);
    });
  }
}
