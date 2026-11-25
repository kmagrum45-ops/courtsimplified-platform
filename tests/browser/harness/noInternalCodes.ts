/**
 * The page shows no raw code and no "[object Object]" (founder's Chrome check of #541, 2 Nov). Reads the
 * visible text only (innerText), so an id in an attribute or a link is not counted. The one test is
 * src/lib/case-system/copy/rawKeys.ts rawKeysIn, which the story pack also runs over every screen.
 */
import { expect, type Page } from "@playwright/test";
import { rawKeysIn } from "../../../src/lib/case-system/copy/rawKeys";

export async function expectNoInternalCodes(page: Page, where: string): Promise<void> {
  const text = await page.locator("body").innerText().catch(() => "");
  expect(rawKeysIn(text), `${where}: no raw code or [object Object] on screen`).toEqual([]);
}
