/**
 * A BOX WITH ITS OWN OFFER IS ONE PROMPT ONLY WHEN THE OFFER AND THE BOX ARE THE SAME FACT IN THE SAME PLACE (site owner,
 * 24 Nov 2026, rule 2c).
 *
 * The recorder (harness/askOnce.ts) counts a form box shown with the story's offer for it as one prompt, the offer. That is
 * allowed only when the box's own wrapper (data-asked-field = the box) holds the offer for that same box (data-field = the
 * box). Here, on fixed pages (no server):
 *   same fact, same place      the offer is recorded, the box is not: the question log shows the fact once;
 *   the offer in another place the box is recorded as its own question too: the question log shows the fact twice (fails);
 *   the box's wrapper offering another box: the box is recorded as its own question.
 *
 * And a box with its own "Not sure yet (not asked again)" note (same fact, same place) is not a question; a note for
 * another box excuses nothing.
 *
 * WHAT FAILURE THIS CATCHES: either rule hiding a real second prompt (an offer in a list and an empty box elsewhere).
 */
import { expect, test, type Page } from "@playwright/test";
import { recordAsks } from "./harness/askOnce";
import { questionLog } from "./harness/questionLog";

test.use({ trace: "off", screenshot: "off" });

const HOST = "http://box-offer.test";
const OFFER = (field: string) => `<div data-testid="sc-form-box-offer" data-field="${field}"><span data-offer-choices=""><button data-use-suggestion="">Yes</button></span> $5,000</div>`;
const BOX = (field: string) => `<input data-testid="sc-intake-${field}" value="">`;

async function open(page: Page, html: string) {
  await page.route(`${HOST}/**`, (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><html><body><main>${html}</main></body></html>` }));
  const asked = await recordAsks(page);
  await page.goto(`${HOST}/builder?step=form`);
  await page.waitForTimeout(2_000);
  return asked;
}
const asks = (asked: Awaited<ReturnType<typeof recordAsks>>) => asked.filter((item) => item.kind === "ask").map((item) => `${item.surface}|${item.id}`);

test("same fact, same place: the offer is the one prompt; the box is not counted beside it", async ({ page }) => {
  const asked = await open(page, `<div data-asked-field="amountClaimed" data-offered="true">${OFFER("amountClaimed")}${BOX("amountClaimed")}</div>`);
  await expect.poll(() => asks(asked), { timeout: 10_000 }).toContain("sc-form-offer|amountClaimed");
  expect(asks(asked), "the box in its own offer's place is not a second question").not.toContain("form-field|sc:amountClaimed");
  expect(questionLog(asked).twice, "the fact is shown once").toEqual([]);
});

test("the offer in another place: the box is its own question, and the fact is shown twice", async ({ page }) => {
  const asked = await open(page, `<div id="list">${OFFER("amountClaimed")}</div><div data-asked-field="amountClaimed">${BOX("amountClaimed")}</div>`);
  await expect.poll(() => asks(asked), { timeout: 10_000 }).toContain("form-field|sc:amountClaimed");
  expect(asks(asked)).toContain("sc-form-offer|amountClaimed");
  expect(questionLog(asked).twice.length, "an offer in one place and its box in another are two prompts").toBeGreaterThan(0);
});

test("a wrapper that offers another box: this box is still its own question", async ({ page }) => {
  const asked = await open(page, `<div data-asked-field="timeline" data-offered="true">${OFFER("timeline")}${BOX("amountClaimed")}</div>`);
  await expect.poll(() => asks(asked), { timeout: 10_000 }).toContain("form-field|sc:amountClaimed");
});

// The same rule for a box shown with its own "Not sure yet (not asked again)" note (boxView: "not sure" and removed): the
// box stays so the person can type, and is not a new question; a note for ANOTHER box excuses nothing.
const NOTE = (field: string) => `<p data-testid="not-answered-yet" data-field="${field}">Not sure yet (not asked again)</p>`;

test("a box with its own not-sure note: the box is not counted as asked", async ({ page }) => {
  const asked = await open(page, `<div data-asked-field="amountClaimed">${NOTE("amountClaimed")}${BOX("amountClaimed")}</div><div data-asked-field="timeline">${BOX("timeline")}</div>`);
  // The other, plain box is recorded: the scan ran.
  await expect.poll(() => asks(asked), { timeout: 10_000 }).toContain("form-field|sc:timeline");
  expect(asks(asked), "the not-sure box is not a question").not.toContain("form-field|sc:amountClaimed");
});

test("a note for another box: this box is still its own question", async ({ page }) => {
  const asked = await open(page, `<div data-asked-field="amountClaimed">${NOTE("timeline")}${BOX("amountClaimed")}</div>`);
  await expect.poll(() => asks(asked), { timeout: 10_000 }).toContain("form-field|sc:amountClaimed");
});
