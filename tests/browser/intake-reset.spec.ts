/**
 * The privacy bug, as a user journey.
 *
 *   npx playwright test tests/browser/intake-reset.spec.ts
 *
 * THE BUG. An anonymous visitor used the court-path finder, wrote their story,
 * went back to Home and started the small claims builder again. Every field was
 * empty except the story, which was still the previous one. On a library or
 * shelter computer that is the next person reading someone's account of their
 * own legal problem.
 *
 * The unit-level properties are in `npm run test:reset-intake`, which needs no
 * browser. These three are the ones only a real browser can answer, because
 * they are about navigation and component lifecycle rather than about storage.
 */
import { expect, test } from "@playwright/test";

import { grantSiteAccess } from "./harness/siteAccess";

/** Generous: the first navigation after a dev-server restart pays for a cold compile. */
const SLOW = { timeout: 120_000 };

const STORY = "SECRETMARKER my landlord kept my deposit after I moved out";
const SECOND_STORY = "a completely different matter about a broken fence";

async function fillFinder(page: import("@playwright/test").Page, story: string) {
  await page.getByRole("button", { name: /Not sure which one/i }).click();
  await page.getByLabel("Guide province or territory").selectOption("Ontario");
  await page.getByLabel("Guide city or municipality").fill("Toronto");
  await page.getByLabel("Guide what happened").fill(story);
  await page.getByLabel("Guide relationship").fill("landlord and tenant");
  await page.getByLabel("Guide remedy").fill("money back");
  await page.getByLabel("Guide amount").fill("1200");
  await page.getByLabel("Guide case started").selectOption("no");
}

/** Every place the marker could be hiding, named so a failure says where. */
async function findMarker(page: import("@playwright/test").Page, marker: string) {
  return page.evaluate((needle) => {
    const hits: string[] = [];
    for (const [area, store] of [["local", localStorage], ["session", sessionStorage]] as const) {
      for (const key of Object.keys(store)) {
        if ((store.getItem(key) || "").includes(needle)) hits.push(`${area}:${key}`);
      }
    }
    const onPage = document.body.innerText.includes(needle);
    const inFields = [...document.querySelectorAll("textarea, input")].some(
      (element) => (element as HTMLInputElement | HTMLTextAreaElement).value.includes(needle),
    );
    return { storage: hits, onPage, inFields };
  }, marker);
}

test.beforeEach(async ({ page }) => {
  // middleware.ts 401s every navigation without this cookie.
  await grantSiteAccess(page);
});

test("anonymous start-over clears the story and every other field", async ({ page }) => {
  test.setTimeout(300_000);

  await page.goto("/", SLOW);
  await fillFinder(page, STORY);
  await page.getByRole("button", { name: /^Choose Small Claims$/ }).click();
  await page.waitForLoadState("networkidle").catch(() => {});

  // Back to Home, then a brand new start. This is the reported repro.
  await page.goto("/", SLOW);
  await page.goto("/builder?path=small-claims", SLOW);
  await page.waitForTimeout(2000);

  const found = await findMarker(page, STORY);

  expect(
    found.storage,
    `the previous story is still in browser storage at: ${found.storage.join(", ")}`,
  ).toEqual([]);
  expect(found.onPage, "the previous story is rendered on the page").toBe(false);
  expect(found.inFields, "the previous story is prefilled into a field").toBe(false);
});

test("a second finder flow does not inherit the first one's story", async ({ page }) => {
  test.setTimeout(300_000);

  await page.goto("/", SLOW);
  await fillFinder(page, STORY);
  await page.getByRole("button", { name: /^Choose Small Claims$/ }).click();
  await page.waitForTimeout(1500);

  // Re-open the finder from Home: a new flow, and it must not remember.
  await page.goto("/", SLOW);
  await fillFinder(page, SECOND_STORY);

  const first = await findMarker(page, STORY);
  expect(
    first.storage,
    `the first story survived into the second flow at: ${first.storage.join(", ")}`,
  ).toEqual([]);
  expect(first.onPage).toBe(false);
});

test("the story carries from the finder into the builder within one flow", async ({ page }) => {
  test.setTimeout(300_000);

  // The reset must not break the feature it is protecting: inside a single
  // flow the story is supposed to travel, and a "fix" that cleared it here
  // would make the user retype what they just wrote.
  await page.goto("/", SLOW);
  await fillFinder(page, STORY);
  await page.getByRole("button", { name: /^Choose Small Claims$/ }).click();
  await page.waitForTimeout(2500);

  await expect(page).toHaveURL(/\/builder\?path=small-claims/);

  const found = await findMarker(page, STORY);
  expect(
    found.onPage || found.inFields,
    "the story did not carry into the builder within the same flow",
  ).toBe(true);
});

test("a signed-in user's saved draft is not wiped by the gate", async ({ page }) => {
  test.setTimeout(300_000);

  const userId = "00000000-0000-4000-8000-000000000001";

  // Same synthetic-session approach golden-journeys.spec.ts uses: the builder
  // reads the Supabase token out of localStorage, so a seeded token makes the
  // page take its signed-in branch without a real login.
  await page.addInitScript(
    ({ id, draftStory }) => {
      const token = {
        access_token: "synthetic-browser-token",
        refresh_token: "synthetic-browser-refresh-token",
        token_type: "bearer",
        expires_at: 4_102_444_800,
        user: { id, aud: "authenticated", role: "authenticated", email: "reset@example.test" },
      };
      const nativeGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = function getItem(key: string) {
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) return JSON.stringify(token);
        return nativeGetItem.call(this, key);
      };
      localStorage.setItem(
        `courtSimplifiedBuilderDraft:${id}`,
        JSON.stringify({
          version: 1,
          courtPath: "small-claims",
          province: "Ontario",
          city: "Toronto",
          facts: draftStory,
        }),
      );
    },
    { id: userId, draftStory: STORY },
  );

  await page.goto("/?path=small-claims", SLOW);
  await page.waitForTimeout(2500);

  const stillThere = await page.evaluate(
    (key) => (localStorage.getItem(key) || "").includes("SECRETMARKER"),
    `courtSimplifiedBuilderDraft:${userId}`,
  );

  expect(stillThere, "a signed-in user's saved draft was cleared by the gate").toBe(true);
});
