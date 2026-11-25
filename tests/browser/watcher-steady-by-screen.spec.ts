/**
 * THE ASK-ONCE WATCHER COUNTS A BOX AS ASKED ONLY WHEN IT STAYS EMPTY ON THAT SCREEN (site owner, 16 Nov 2026).
 *
 * The watcher (harness/askOnce.ts, steadyEmpty) records an empty form box as a question once it has stayed empty for
 * three scans. It counted the scans by the box alone, not by the screen. On #550's CI (carry, Small Claims form
 * signed-in) the other party's box, emptied on the form step, was still drawn for one scan after the address changed to
 * ?step=results (pushStep changes the address first, the form is hidden on the next render): the scans from the form
 * step carried over, and the box was recorded as asked again on the results page.
 *
 * What it checks, on a page served by the test itself (no site, no database), with the real watcher script, for each
 * surface that uses steadyEmpty -- the Small Claims form's boxes (sc-intake-*), the Civil and Family forms' labelled
 * boxes, and the "Things that may have happened" date boxes (all three courts):
 *   1. a box empty on one screen, still drawn for one scan after the address changes, then hidden: NOT recorded as
 *      asked on the new screen;
 *   2. the same box left empty on the new screen for longer: recorded as asked on the new screen (still caught);
 *   3. a box empty for fewer than three scans on its first screen: not recorded (the rule is unchanged).
 *
 * What failure it catches: a box counted as asked on a screen it was never steadily shown on (a false "asked twice"),
 * and, the other way, a watcher that stops seeing a box left empty on a new screen.
 */
import { expect, test, type Page } from "@playwright/test";
import { recordAsks } from "./harness/askOnce";

test.use({ trace: "off", screenshot: "off" });

const HOST = "http://watch.test";
type Surface = { name: string; surface: string; id: string; html: string };
const SURFACES: Surface[] = [
  { name: "Small Claims form box", surface: "form-field", id: "sc:otherParty", html: `<label><span>Other party name</span><input data-testid="sc-intake-otherParty" value=""></label>` },
  { name: "Civil and Family form box", surface: "form-field", id: "label:Other party", html: `<label><span class="font-semibold">Other party</span><textarea></textarea></label>` },
  { name: "event date box (all three courts)", surface: "event-candidate", id: "when", html: `<div data-testid="event-candidate" data-fingerprint="fp1"><p data-testid="event-candidate-sentence">I paid the builder in March 2026.</p><label><span>When, in your words</span><input value=""></label></div>` },
];

async function open(page: Page, surface: Surface) {
  await page.route(`${HOST}/**`, (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><html><body><main><div id="box">${surface.html}</div></main></body></html>` }));
  const asked = await recordAsks(page);
  await page.goto(`${HOST}/builder?step=form`);
  return asked;
}
const asksOn = (asked: Awaited<ReturnType<typeof recordAsks>>, surface: Surface, screen: string) => asked.filter((item) => item.kind === "ask" && item.surface === surface.surface && item.id === surface.id && item.screen === screen);
/** The address changes (as pushStep does), and the box is hidden after `hideAfter` ms (the next render), if given. */
const toResults = (page: Page, hideAfter: number | null) => page.evaluate((ms) => {
  window.history.pushState(null, "", "/builder?step=results");
  if (ms !== null) window.setTimeout(() => { (document.getElementById("box") as HTMLElement).hidden = true; }, ms);
}, hideAfter);

for (const surface of SURFACES) {
  test(`a box still drawn for a moment after the address changes is not asked on the new screen -- ${surface.name}`, async ({ page }) => {
    const asked = await open(page, surface);
    await expect.poll(() => asksOn(asked, surface, "/builder?step=form").length, { timeout: 10_000 }).toBe(1);
    await toResults(page, 250);
    await page.waitForTimeout(1_500);
    expect(asksOn(asked, surface, "/builder?step=results"), "asked on the results screen, where it was drawn for one scan only").toEqual([]);
  });

  test(`a box left empty on the new screen is still asked there -- ${surface.name}`, async ({ page }) => {
    const asked = await open(page, surface);
    await expect.poll(() => asksOn(asked, surface, "/builder?step=form").length, { timeout: 10_000 }).toBe(1);
    await toResults(page, null);
    await expect.poll(() => asksOn(asked, surface, "/builder?step=results").length, { timeout: 10_000 }).toBe(1);
  });

  test(`a box empty for fewer than three scans is not asked -- ${surface.name}`, async ({ page }) => {
    await page.route(`${HOST}/**`, (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><html><body><main><div id="box" hidden>${surface.html}</div></main></body></html>` }));
    const asked = await recordAsks(page);
    await page.goto(`${HOST}/builder?step=form`);
    await page.evaluate(() => { const box = document.getElementById("box") as HTMLElement; box.hidden = false; window.setTimeout(() => { box.hidden = true; }, 250); });
    await page.waitForTimeout(1_500);
    expect(asksOn(asked, surface, "/builder?step=form")).toEqual([]);
  });
}
