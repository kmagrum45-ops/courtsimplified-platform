/**
 * THE RECORDER'S BLIND-SPOT CHECK (site owner, 24 Nov 2026, Round 3 Step A): every box on screen a person can type in or
 * choose in is either logged by a surface (harness/askOnce.ts) or on the exempt list (BLIND_EXEMPT, each with why); any
 * other is recorded "blind" and fails the journey (ask-once's Chrome story and Chrome's guest journey assert none).
 *
 * On fixed pages (no server):
 *   the four Small Claims boxes the owner named (paymentHistory, defenceResponse, settlementEfforts, deadlineDetails), as
 *     the form draws them, are logged by the form-box surface: none is blind;
 *   a box no surface knows is recorded blind, by its label;
 *   a box on the exempt list (the review's Change box) is not.
 *
 * WHAT FAILURE THIS CATCHES: a question asked in a box the recorder never sees, so the question logs read zero while a
 * person is asked again.
 */
import { expect, test, type Page } from "@playwright/test";
import { blindBoxes, recordAsks } from "./harness/askOnce";

test.use({ trace: "off", screenshot: "off" });

const HOST = "http://blind-boxes.test";
async function open(page: Page, html: string) {
  await page.route(`${HOST}/**`, (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><html><body><main>${html}</main></body></html>` }));
  const asked = await recordAsks(page);
  await page.goto(`${HOST}/builder?step=form`);
  await page.waitForTimeout(2_000);
  return asked;
}
const FOUR = ["paymentHistory", "defenceResponse", "settlementEfforts", "deadlineDetails"];

test("the four Small Claims boxes are logged as questions, none blind", async ({ page }) => {
  const asked = await open(page, FOUR.map((field) => `<div data-asked-field="${field}"><textarea data-testid="sc-intake-${field}"></textarea></div>`).join(""));
  await expect.poll(() => asked.filter((item) => item.kind === "ask").map((item) => item.id), { timeout: 10_000 }).toEqual(expect.arrayContaining(FOUR.map((field) => `sc:${field}`)));
  expect(blindBoxes(asked), "none of the four is a blind spot").toEqual([]);
});

test("a box no surface knows is recorded blind, by its label", async ({ page }) => {
  const asked = await open(page, `<label>Payment history <textarea></textarea></label>`);
  await expect.poll(() => blindBoxes(asked), { timeout: 10_000 }).toEqual(["Payment history @ /builder?step=form"]);
});

test("a box on the exempt list is not blind", async ({ page }) => {
  const asked = await open(page, `<label>Your answer <input data-testid="change-answer-text" value=""></label><label>Planted <input></label>`);
  // The planted box proves the scan ran; the exempt one is not listed.
  await expect.poll(() => blindBoxes(asked), { timeout: 10_000 }).toEqual(["Planted @ /builder?step=form"]);
});

test("the home page's city box is logged as the municipality question (no blind spot)", async ({ page }) => {
  const asked = await open(page, `<label>City or municipality <input aria-label="City or municipality" value=""></label>`);
  await expect.poll(() => asked.filter((item) => item.kind === "ask").map((item) => `${item.surface}|${item.id}`), { timeout: 10_000 }).toContain("home-location|municipality");
  expect(blindBoxes(asked)).toEqual([]);
});

test("a filled review entry is seen (not blind) and not asked", async ({ page }) => {
  const asked = await open(page, `<div data-testid="intake-entry" data-field="otherParty" data-empty="false"><label>Review: The other party <input aria-label="Review: The other party" value="Alex Testwood"></label></div><label>Planted <input></label>`);
  await expect.poll(() => blindBoxes(asked), { timeout: 10_000 }).toEqual(["Planted @ /builder?step=form"]);
  expect(asked.filter((item) => item.kind === "ask" && item.surface === "review-entry")).toEqual([]);
});
