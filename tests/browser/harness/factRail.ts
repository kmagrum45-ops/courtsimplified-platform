/**
 * Browser helpers for the case core's rails (G0): open an intake on each court's whole form, save a fact
 * through POST /api/cases/facts the way the one writer will (the page's own session token), and read
 * each screen that shows the other party. Used by fact-coexistence.spec.ts and fact-two-tabs.spec.ts.
 *
 * No screen calls POST /api/cases/facts yet (G0), so the specs call it from the page itself, with the
 * page's own signed-in session: a stand-in for the browser half of `give`, listed in each spec.
 */
import { expect, type Page } from "@playwright/test";
import { openBuilder } from "./builderGate";
import { STARTING_NOTHING_FILED } from "./situation";
import { STORY_LABEL } from "../../../src/lib/case-system/copy/storyGuidance";

export type Court = "family" | "civil" | "small-claims";

/** The intake opened, on the court's whole form (the unconverted screen that writes the old copy). */
export async function openWholeForm(page: Page, court: Court, story: string): Promise<string> {
  if (court === "small-claims") {
    await page.goto("/?path=small-claims");
    await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("City or municipality").fill("Kingston");
    await page.getByLabel(STORY_LABEL, { exact: true }).fill(story);
    await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
    const ack = page.getByTestId("acknowledgement-checkbox");
    await expect(ack.or(page.getByRole("button", { name: /Fill in the form yourself/ }))).toBeVisible({ timeout: 60_000 });
    if (await ack.isVisible()) { await ack.check(); await page.getByTestId("acknowledgement-continue").click(); }
    await page.getByRole("button", { name: /Fill in the form yourself/ }).click();
    await expect(page.getByTestId("sc-intake-otherParty")).toBeVisible({ timeout: 60_000 });
  } else {
    await openBuilder(page, court, { city: "Kingston", story, situation: STARTING_NOTHING_FILED });
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 }).catch(() => {});
    const showForm = page.getByTestId("guided-form-show-form");
    if (await showForm.isVisible({ timeout: 30_000 }).catch(() => false)) await showForm.click();
  }
  const url = new URL(page.url());
  return url.searchParams.get("intake") ?? url.searchParams.get("caseId") ?? "";
}

/** The other party's box on the court's whole form. */
export const otherPartyBox = (page: Page, court: Court) =>
  court === "small-claims" ? page.getByTestId("sc-intake-otherParty") : page.locator("label").filter({ hasText: /^Other party/ }).locator("input").first();

/** Typed into the whole form, as a person types it, and saved through the page's own save. */
export async function typeOtherParty(page: Page, court: Court, name: string): Promise<void> {
  const box = otherPartyBox(page, court);
  await expect(box).toBeVisible({ timeout: 60_000 });
  await box.fill("");
  await box.fill(name);
  await box.blur();
  await savedNow(page);
}

export const savedNow = async (page: Page) => {
  await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(1_500);
};

export type FactPost = { status: number; body: { saved?: { fact: string; seq: number; at: string }[]; conflicts?: { fact: string; stored: { value?: unknown; seq: number } }[]; facts?: Record<string, { value?: unknown; seq: number; state: string }>; error?: string } };

/** POST /api/cases/facts from the page, with the page's own session (the browser half of `give`, not built yet). */
export async function postFacts(page: Page, caseId: string, facts: Record<string, unknown>[]): Promise<FactPost> {
  return page.evaluate(async ({ caseId: id, facts: writes }) => {
    const key = Object.keys(window.localStorage).find((name) => /^sb-.*-auth-token$/.test(name));
    const token = key ? (JSON.parse(window.localStorage.getItem(key) || "{}") as { access_token?: string }).access_token : undefined;
    const response = await fetch("/api/cases/facts", { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ caseId: id, facts: writes }) });
    return { status: response.status, body: await response.json().catch(() => ({})) };
  }, { caseId, facts });
}

/** Every screen that shows the other party, as text: the case page (title and "What we have so far") and the dashboard card. */
export async function otherPartyScreens(page: Page, caseId: string): Promise<{ where: string; text: string }[]> {
  const shown: { where: string; text: string }[] = [];
  await page.goto(`/cases/${caseId}`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await expect(page.getByTestId("case-home-title")).toBeVisible({ timeout: 60_000 });
  shown.push({ where: "case page title", text: await page.getByTestId("case-home-title").innerText() });
  const caseFile = page.getByTestId("case-file");
  if (await caseFile.isVisible({ timeout: 30_000 }).catch(() => false)) shown.push({ where: "case page: What we have so far", text: await caseFile.innerText() });
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle").catch(() => {});
  const card = page.getByTestId("dashboard-case").first();
  if (await card.isVisible({ timeout: 30_000 }).catch(() => false)) shown.push({ where: "dashboard card", text: await card.innerText() });
  return shown;
}
