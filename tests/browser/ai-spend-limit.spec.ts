/**
 * A SIGNED-IN PERSON OVER THE DAY'S AI LIMIT: NO MODEL CALL, AND THE OWNER'S WORDS ON THE SCREEN (site owner, 10 Nov 2026).
 *
 * Against a server started with a fake OpenAI (OPENAI_BASE_URL pointing at the small server this spec runs, which counts
 * calls and answers 1,000 + 1,000 tokens, $0.012) and a person's day set below one call (AI_USER_DAILY_USD=0.01):
 * a real local account, signed in, with the harness test flag taken off (a harness account is exempt outside
 * production), asks the signed-in story reading (/api/case/understand) twice. The first request reaches the fake
 * OpenAI; the second makes 0 calls; the page then shows "You've reached today's limit for AI help. ..." and the
 * dashboard still opens.
 *
 * NOT IN CI (scripts/verification/notInCi.json): it needs its own server with the fake OpenAI and the low limit, and CI's
 * browser job shares one server, with no OpenAI key, across every spec. Run locally:
 *   start the server with OPENAI_API_KEY=sk-fake-limit-test OPENAI_BASE_URL=http://127.0.0.1:3699/v1
 *   AI_USER_DAILY_USD=0.01 AI_RATE_LIMITS=local, then
 *   AI_LIMIT_SPEC_FAKE_OPENAI_PORT=3699 PLAYWRIGHT_BASE_URL=http://localhost:<port> npx playwright test ai-spend-limit
 * The rules themselves (every limit, the reset, the production rules) are in the terminal suite test:ai-spend-limit,
 * which CI runs.
 *
 * WHAT FAILURE THIS CATCHES: a signed-in person's request reaching OpenAI past the limit, or a refusal nobody is told about.
 */
import { createServer, type Server } from "node:http";
import { expect, test } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser, harnessAdmin } from "./harness/realTestSession";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const PORT = Number(process.env.AI_LIMIT_SPEC_FAKE_OPENAI_PORT ?? 0);
const WORDS = "You've reached today's limit for AI help. Your case is saved. The rest of the site still works, and AI help is back tomorrow.";

let fake: Server | null = null;
const counter = { calls: 0 };

test.beforeAll(async () => {
  if (!PORT) return;
  fake = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => { raw += chunk; });
    request.on("end", () => {
      counter.calls += 1;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ id: "fake", object: "chat.completion", created: 0, model: "gpt-6.1-sol", choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "{}" } }], usage: { prompt_tokens: 1000, completion_tokens: 1000, total_tokens: 2000 } }));
    });
  });
  await new Promise<void>((resolve) => fake!.listen(PORT, "127.0.0.1", resolve));
});
test.afterAll(async () => { await new Promise<void>((resolve) => (fake ? fake.close(() => resolve()) : resolve())); });

test("a signed-in person over the day's AI limit: no model call, the limit's words on the screen", async ({ page }) => {
  test.skip(!PORT, "needs a server with the fake OpenAI and AI_USER_DAILY_USD=0.01 (see the header)");
  test.setTimeout(300_000);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    // A harness account is exempt outside production: this one is an ordinary account from here.
    await harnessAdmin().auth.admin.updateUserById(userId, { user_metadata: { courtSimplifiedHarness: false } });
    await page.goto("/dashboard");
    const ask = () => page.evaluate(async () => {
      const key = Object.keys(window.localStorage).find((name) => /^sb-.*-auth-token$/.test(name));
      const token = key ? (JSON.parse(window.localStorage.getItem(key) || "{}") as { access_token?: string }).access_token : "";
      const response = await fetch("/api/case/understand", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ story: "Synthetic: my friend borrowed $2,000 in March 2026 and has not paid it back.", city: "Ottawa" }) });
      return { status: response.status, body: await response.text() };
    });
    const first = await ask();
    console.log(`FIRST ${first.status} ${first.body.slice(0, 300)}`);
    expect(first.status, "the first request is answered").toBe(200);
    const afterFirst = counter.calls;
    expect(afterFirst, "the first request reached the (fake) OpenAI").toBeGreaterThan(0);
    const second = await ask();
    console.log(`SECOND ${second.status} ${second.body.slice(0, 300)}`);
    expect(second.status, "the second request is answered too (the page carries on)").toBe(200);
    expect(counter.calls, "the second request made 0 model calls").toBe(afterFirst);
    await expect(page.getByTestId("ai-limit-notice"), "the page says the limit was reached").toHaveText(WORDS, { timeout: 15_000 });
    await page.goto("/dashboard");
    await expect(page.getByTestId("ai-limit-notice"), "every screen says it").toHaveText(WORDS, { timeout: 15_000 });
    await expect(page.locator("main").first(), "the rest of the site still works: the dashboard opens").toBeVisible();
    await expect(page.locator("main").first(), "the rest of the site still works: no error page").not.toContainText(/Application error|could not be loaded/i);
  } finally {
    await deleteHarnessUser(userId);
  }
});
