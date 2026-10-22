/**
 * THE FOLLOW-UP CHAT ON A CASE CREATED IN THIS VISIT (Part 3b, #465 re-test).
 *
 * Every message showed "CourtSimplified could not respond right now" at once,
 * and the checked-law answer arrived 30 to 90 seconds later under that error,
 * in all three areas. The chat sent no case id for a case created in this visit
 * (the address has ?intake=, not ?caseId=), so the guided assistant's gate
 * refused every message (409); and the error was shown without waiting for the
 * law lookup.
 *
 * Requires, in Small Claims, Family and civil: the guided assistant request
 * carries the saved case's id and not the whole case; its reply is shown; when
 * it fails, no error shows while the law lookup runs, and none at all when the
 * law lookup answers; when both come back empty, the error shows.
 *
 * Synthetic: the account, the cases table, the analysis and both chat routes
 * are answered in the browser. The routes themselves (and their gate) need a
 * real database, which this test does not use: the gate's own rule is held by
 * test:intake-guidance-gate, and harness accounts are never made in production.
 */
import { expect, test, type Page, type Route } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { confirmInitialInformation } from "./harness/intakeReview";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { runFamilyIntakeCanonicalIntegration } from "../../src/lib/case-system/orchestration/familyIntakeCanonicalAdapter";
import { runCivilIntakeCanonicalIntegration } from "../../src/lib/case-system/orchestration/civilIntakeCanonicalAdapter";
import { analyzeSmallClaimsWithBrain } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

type Court = "small-claims" | "family" | "civil";
const STORY = "Synthetic facts: I need help organizing this matter, the parties and dates.";
const ERROR = "could not respond right now";
const LAW_ANSWER = { status: "answered", statements: [{ text: "Synthetic checked statement.", sources: [] }], notConfirmed: [], declinedToJudge: false };

async function reply(route: Route, court: Court) {
  const { input } = route.request().postDataJSON();
  const result = court === "family" ? await runFamilyIntakeCanonicalIntegration(input, { allowExternalCognition: false }) : court === "civil" ? await runCivilIntakeCanonicalIntegration(input, { allowExternalCognition: false }) : await analyzeSmallClaimsWithBrain(input, { allowExternalCognition: false });
  return { ok: true, result, authenticated: true, reasoningMode: "deterministic-fallback", analysisAvailable: true };
}

/** A case created in this visit, analysed, with the follow-up chat open. */
async function chatOnNewCase(page: Page, court: Court, chatRoutes: () => Promise<void>) {
  const account = await fakeAccount(page);
  // After fakeAccount: its catch-all for /api would otherwise answer the chat routes.
  await chatRoutes();
  await page.route(`**/api/${court}/analyze`, async (route) => route.fulfill({ json: await reply(route, court) }));
  await openBuilder(page, court, { story: court === "small-claims" ? undefined : STORY });
  if (court === "small-claims") { await page.getByRole("button", { name: "Fill in the form yourself" }).click(); await page.getByLabel("Case story", { exact: true }).fill(STORY); }
  else await page.getByTestId("guided-form-show-form").click();
  await confirmInitialInformation(page);
  await page.getByRole("button", { name: "Continue to your next steps", exact: true }).click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 90_000 });
  expect(new URL(page.url()).searchParams.get("caseId"), "a case created in this visit: no ?caseId= in the address").toBeNull();
  await page.getByRole("button", { name: "Ask follow-up questions" }).click();
  return account;
}

async function ask(page: Page, question: string) {
  await page.getByPlaceholder("Ask about an important date, document, or case detail.").fill(question);
  await page.getByRole("button", { name: "Ask Case Partner" }).click();
}

for (const court of ["small-claims", "family", "civil"] as const) {
  test(`${court}: the chat sends the saved case's id and shows the reply`, async ({ page }) => {
    test.setTimeout(240_000);
    let body: Record<string, unknown> = {};
    const account = await chatOnNewCase(page, court, async () => {
      await page.route("**/api/assistant/law", (route) => route.fulfill({ json: { findings: [] } }));
      await page.route("**/api/guided-assistant", (route) => { body = route.request().postDataJSON(); return route.fulfill({ json: { ok: true, answer: "Synthetic assistant reply." } }); });
    });
    await ask(page, "What should I gather first?");
    const transcript = page.getByTestId("case-partner-transcript");
    await expect(transcript).toContainText("Synthetic assistant reply.", { timeout: 60_000 });
    const caseId = [...account.rows.keys()][0];
    expect(body.caseId, "the guided assistant's gate needs the case id").toBe(caseId);
    expect(body.caseMemory, "the route reads the saved case itself; the whole case is not sent").toBeUndefined();
    await expect(transcript).not.toContainText(ERROR);
  });

  test(`${court}: a refused assistant request shows no error while the law lookup runs, nor after it answers`, async ({ page }) => {
    test.setTimeout(240_000);
    let releaseLaw!: () => void;
    const lawHeld = new Promise<void>((resolve) => { releaseLaw = resolve; });
    await chatOnNewCase(page, court, async () => {
      await page.route("**/api/guided-assistant", (route) => route.fulfill({ status: 409, json: { ok: false, error: "Synthetic refusal" } }));
      await page.route("**/api/assistant/law", async (route) => { await lawHeld; await route.fulfill({ json: { findings: [], answer: LAW_ANSWER } }).catch(() => {}); });
    });
    await ask(page, "How long do I have to respond?");
    const transcript = page.getByTestId("case-partner-transcript");
    await expect(page.getByTestId("assistant-law-loading")).toBeVisible({ timeout: 30_000 });
    await expect(transcript, "no error while the law lookup is still running").not.toContainText(ERROR);
    releaseLaw();
    await expect(page.getByTestId("assistant-law")).toContainText("Synthetic checked statement.", { timeout: 30_000 });
    await expect(transcript, "the law answer is the reply").not.toContainText(ERROR);
  });
}

test("small-claims: when the assistant and the law lookup both come back empty, the error shows", async ({ page }) => {
  test.setTimeout(240_000);
  await chatOnNewCase(page, "small-claims", async () => {
    await page.route("**/api/guided-assistant", (route) => route.fulfill({ status: 500, json: { ok: false, error: "Synthetic failure" } }));
    await page.route("**/api/assistant/law", (route) => route.fulfill({ json: { findings: [] } }));
  });
  await ask(page, "What happens next?");
  await expect(page.getByTestId("case-partner-transcript")).toContainText(ERROR, { timeout: 30_000 });
});

// L47 (#466 re-test): after the review is confirmed, the first reply is the
// assistant's, not "must confirm the province, amount and remedy" (Small Claims,
// civil) or a wrong-court-path line (Family).
for (const court of ["small-claims", "family", "civil"] as const) {
  test(`${court}: after confirmation the chat's first line is the reply, not a request to confirm the court path`, async ({ page }) => {
    test.setTimeout(240_000);
    await chatOnNewCase(page, court, async () => {
      await page.route("**/api/assistant/law", (route) => route.fulfill({ json: { findings: [] } }));
      await page.route("**/api/guided-assistant", (route) => route.fulfill({ json: {
        ok: true,
        answer: "Synthetic assistant reply.",
        // What used to trigger the routing line: the message read as civil or Small Claims.
        conversationIntelligence: { conversationFocus: { courtArea: court === "family" ? "civil" : court } },
      } }));
    });
    await ask(page, "What should I gather first?");
    const transcript = page.getByTestId("case-partner-transcript");
    await expect(transcript).toContainText("Synthetic assistant reply.", { timeout: 60_000 });
    await expect(transcript).not.toContainText("must confirm the province");
    await expect(transcript).not.toContainText("wrong court path");
  });
}
