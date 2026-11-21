/**
 * THE COURT-PATH FINDER'S STORY DOES NOT OUTLIVE THE INTAKE IT WAS HANDED TO (read-only finding of 9 Nov 2026,
 * the intake-reset flake on #546, CI job 129360927580).
 *
 * The finder hands the person's story to the builder in this tab's sessionStorage. The builder's own page takes it
 * only after "Before you start"; until then the situation questions' wrapper rewrote it in place
 * (IntakeRecovery.tsx, the `started` hand-over). So a person who left at "Before you start" left their story in the
 * tab, and only the home page's reset (after an account check) removed it: intake-reset passed or failed on which
 * finished first. On a shared computer the next person opening the builder directly would have it.
 *
 * What it checks, with no waiting on any account check (the home page is never visited between the two intakes):
 *  1. per court (Small Claims, Civil, Family): a hand-off for one intake, then a NEW intake opened directly: once its
 *     "Before you start" shows, the story is in no browser storage, on no page and in no field;
 *  2. the reported journey, through the real finder, without Home in between;
 *  3. refreshing the same intake at "Before you start" keeps the story for that person (that it then reaches the story
 *     box within one flow is intake-reset.spec.ts's third test);
 *  4. opening a saved case's address drops a hand-off meant for another intake.
 *
 * Stand-in: checks 1, 3 (Civil, Family) and 4 write the finder's hand-off directly (the shape NotSureCourtGuide writes:
 * province, city, facts, started), because the finder only offers Family for a family story; check 2 uses the real
 * finder. Guest only: the hand-off is the same for a signed-in person, and IntakeRecovery decides it before reading
 * the account.
 *
 * WHAT FAILURE THIS CATCHES: one person's story left in a shared browser tab for the next person.
 */
import { expect, test, type Page } from "@playwright/test";

import { grantSiteAccess } from "./harness/siteAccess";

const SLOW = { timeout: 120_000 };
const KEY = "courtSimplifiedNotSureGuide";
const STORY = "LEAKMARKER my landlord kept my deposit after I moved out";

async function findMarker(page: Page, needle: string) {
  return page.evaluate((marker) => {
    const hits: string[] = [];
    for (const [area, store] of [["local", localStorage], ["session", sessionStorage]] as const) {
      for (const key of Object.keys(store)) if ((store.getItem(key) || "").includes(marker)) hits.push(`${area}:${key}`);
    }
    const onPage = document.body.innerText.includes(marker);
    const inFields = [...document.querySelectorAll("textarea, input")].some((element) => (element as HTMLInputElement).value.includes(marker));
    return { storage: hits, onPage, inFields };
  }, needle);
}

/** The finder's hand-off, written as NotSureCourtGuide writes it, then the builder opened as its "Choose" button does. */
async function handOff(page: Page, court: string) {
  await page.goto("/privacy", SLOW);
  await page.evaluate(([key, story]) => sessionStorage.setItem(key, JSON.stringify({ province: "Ontario", city: "Toronto", facts: story, started: "no" })), [KEY, STORY]);
  await page.goto(`/builder?path=${court}`, SLOW);
  await expect(page.getByTestId("first-use-acknowledgement"), "the first intake reached \"Before you start\"").toBeVisible(SLOW);
}

test.beforeEach(async ({ page }) => {
  await grantSiteAccess(page);
});

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`a story handed to one intake is gone once a new intake opens -- ${court}`, async ({ page }) => {
    test.setTimeout(240_000);
    await handOff(page, court);
    // The person leaves at "Before you start"; the next one opens the builder directly (never Home).
    await page.goto(`/builder?path=${court}`, SLOW);
    await expect(page.getByTestId("first-use-acknowledgement"), "the new intake reached \"Before you start\"").toBeVisible(SLOW);
    const found = await findMarker(page, "LEAKMARKER");
    expect(found.storage, `the previous story is still in browser storage at: ${found.storage.join(", ")}`).toEqual([]);
    expect(found.onPage, "the previous story is on the page").toBe(false);
    expect(found.inFields, "the previous story is in a field").toBe(false);
  });
}

test("the reported journey through the real finder, without Home in between -- small-claims", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto("/", SLOW);
  await page.getByRole("button", { name: /Not sure which one/i }).click();
  await page.getByLabel("Guide province or territory").selectOption("Ontario");
  await page.getByLabel("Guide city or municipality").fill("Toronto");
  await page.getByLabel("Guide what happened").fill(STORY);
  await page.getByLabel("Guide relationship").fill("landlord and tenant");
  await page.getByLabel("Guide remedy").fill("money back");
  await page.getByLabel("Guide amount").fill("1200");
  await page.getByLabel("Guide case started").selectOption("no");
  await page.getByRole("button", { name: "Review possible court paths" }).click();
  await page.getByRole("button", { name: /^Choose Small Claims$/ }).click();
  await expect(page.getByTestId("first-use-acknowledgement")).toBeVisible(SLOW);
  await page.goto("/builder?path=small-claims", SLOW);
  await expect(page.getByTestId("first-use-acknowledgement")).toBeVisible(SLOW);
  const found = await findMarker(page, "LEAKMARKER");
  expect(found.storage, `the previous story is still in browser storage at: ${found.storage.join(", ")}`).toEqual([]);
});

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`refreshing the same intake at "Before you start" keeps the story for that person -- ${court}`, async ({ page }) => {
    test.setTimeout(240_000);
    await handOff(page, court);
    await expect(page, "the intake has its own address").toHaveURL(/[?&]intake=/);
    await page.reload(SLOW);
    await expect(page.getByTestId("first-use-acknowledgement")).toBeVisible(SLOW);
    const kept = await findMarker(page, "LEAKMARKER");
    expect(kept.storage, "the story is kept for the same intake across a refresh").toEqual([`session:${KEY}`]);
    // That the hand-off then reaches the story box within one flow is intake-reset.spec.ts's third test.
  });
}

test("opening a saved case's address drops a hand-off meant for another intake", async ({ page }) => {
  test.setTimeout(240_000);
  await handOff(page, "small-claims");
  await page.goto(`/builder?path=small-claims&intake=${"0".repeat(8)}-0000-4000-8000-${"0".repeat(12)}`, SLOW);
  await page.waitForLoadState("networkidle").catch(() => {});
  await expect.poll(async () => (await findMarker(page, "LEAKMARKER")).storage, { timeout: 30_000, message: "the hand-off is dropped on another intake's address" }).toEqual([]);
});
