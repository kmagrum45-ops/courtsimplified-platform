/**
 * THE OTHER SIDE'S NAME, GIVEN AS A PERSON GIVES IT NOW: on the Parties step (site owner, 23 Nov 2026: the Small Claims
 * form's own "Other party name" box is removed; the Parties step is the one place for the other side's name).
 *
 *   giveOtherPartyName   the first other party's entry: "A person" or "A company or business" (a name with Inc., Ltd. or
 *                        Corp. is a company), then the first and last name, or the company's name, each saved on leaving
 *                        the box, as the step saves every typed detail;
 *   removeOtherPartyName every name part held in that entry taken away with its Change;
 *   otherPartyNameShown  the entry's heading ("Defendant 1: <name>"), which names the party once a name is held.
 */
import { expect, type Locator, type Page } from "@playwright/test";

export const otherPartyEntry = (page: Page): Locator => page.locator("[data-testid=parties-party][data-party=other]").first();

const COMPANY = /\b(?:Inc|Ltd|Ltée|Corp|Corporation|Limited|LLC|LLP)\b\.?/;

export async function giveOtherPartyName(page: Page, name: string): Promise<void> {
  const entry = otherPartyEntry(page);
  await expect(entry, "the Parties step's other party entry").toBeVisible({ timeout: 60_000 });
  const company = COMPANY.test(name);
  const kind = entry.getByTestId(company ? "parties-kind-company" : "parties-kind-person");
  if (await kind.isVisible().catch(() => false)) await kind.click();
  const type = async (detail: string, value: string) => {
    // A name part already held shows as a kept line: its Change opens the same box, pre-filled, to type the new one.
    const change = entry.locator(`[data-testid=parties-detail-held][data-detail=${detail}] [data-testid=parties-detail-change]`).first();
    if (await change.isVisible().catch(() => false)) await change.click();
    const box = entry.locator(`[data-detail=${detail}] input`).first();
    await expect(box, `the other party's ${detail} box`).toBeVisible({ timeout: 30_000 });
    await box.fill(value);
    await box.blur();
    await page.waitForTimeout(800);
  };
  if (company) await type("companyName", name);
  else {
    const words = name.trim().split(/\s+/);
    await type("firstName", words.slice(0, -1).join(" ") || words[0]);
    if (words.length > 1) await type("lastName", words[words.length - 1]);
  }
  await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 }).catch(() => {});
}

/**
 * Taken away as a person can: each name part typed on the Parties step with its Change; a name the step only shows (given
 * in the chat or the review, held elsewhere) with the review's Change, "Remove this answer" (`changeAddress`: the builder
 * address with ?change=otherParty for this case). Back on the page it started from.
 */
export async function removeOtherPartyName(page: Page, changeAddress?: string): Promise<void> {
  const entry = otherPartyEntry(page);
  // Each part's Change opens its box pre-filled; emptied and left, it is taken away and kept as not asked again (the
  // Parties step's own rule: boxView "removed").
  for (const detail of ["companyName", "fullName", "firstName", "lastName", "secondName"]) {
    const held = entry.locator(`[data-testid=parties-detail-held][data-detail=${detail}] [data-testid=parties-detail-change]`).first();
    if (await held.isVisible().catch(() => false)) {
      await held.click();
      const typing = entry.locator(`[data-testid=parties-detail-typing][data-detail=${detail}] input`).first();
      if (await typing.isVisible().catch(() => false)) { await typing.fill(""); await typing.blur(); }
      await page.waitForTimeout(800);
    }
  }
  await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 }).catch(() => {});
  if (changeAddress) {
    const back = page.url();
    await page.goto(changeAddress);
    const opened = page.getByTestId("intake-review").locator('[data-testid="change-answer"][data-fact="otherParty"]').first();
    if (await opened.isVisible({ timeout: 30_000 }).catch(() => false)) {
      if (!(await opened.getByTestId("change-answer-remove").isVisible().catch(() => false))) await opened.getByTestId("change-answer-open").click().catch(() => {});
      await opened.getByTestId("change-answer-remove").click().catch(() => {});
      await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 }).catch(() => {});
    }
    await page.goto(back);
  }
}

export async function otherPartyNameShown(page: Page): Promise<string> {
  const entry = otherPartyEntry(page);
  await expect(entry).toBeVisible({ timeout: 60_000 });
  return ((await entry.locator("h3").first().textContent()) ?? "").replace(/\s+/g, " ").trim();
}
