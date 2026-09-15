/**
 * Canned responses for every route that calls OpenAI, applied at the browser
 * network boundary.
 *
 * WHY THIS WORKS AT ALL. No server-side code in this app reaches OpenAI except
 * through the app's own API routes, and every one of those routes is called by
 * `fetch()` from the browser — guided-turn, depth-turn, classify-claim-type,
 * explain-question, classify-court-path, safety-check, assistant-chat. So
 * `page.route()` intercepts them before the server is involved and the API key
 * is never used. There is no server-to-server AI call to miss.
 *
 * WHAT THIS DELIBERATELY STOPS COVERING, so nobody reads a green run as more
 * than it is:
 *
 *   - Whether the model's real output fits the interface. A 400-word answer,
 *     or a claim type the UI has no label for, breaks layout. A stub never
 *     will.
 *   - Turn count and question order. The canned answers assume the pipeline
 *     asks the questions in this sequence. Change the question bank and these
 *     keep passing while the real flow diverges. `npm run test:fixtures` is
 *     what covers that, against the real pipeline, and is why it exists.
 *   - Rate limits, timeouts, and malformed provider JSON.
 *
 * The browser test proves the interface renders and the wiring connects. It
 * proves nothing about what the model says.
 */

import type { Page } from "@playwright/test";

export type StubCounts = {
  /** How many times each stubbed route was called, by path. */
  calls: Record<string, number>;
};

const SAFETY_CLEAR = { ok: true, classification: "clear", userMessage: null };

/**
 * Installs stubs for every AI-backed route. Returns a counter so a spec can
 * assert a route was actually exercised rather than quietly skipped — a stub
 * nothing calls is indistinguishable from a feature that never ran.
 */
export async function stubAiRoutes(page: Page): Promise<StubCounts> {
  const counts: StubCounts = { calls: {} };

  const record = (name: string) => {
    counts.calls[name] = (counts.calls[name] || 0) + 1;
  };

  await page.route("**/api/intake/safety-check", (route) => {
    record("safety-check");
    return route.fulfill({ status: 200, json: SAFETY_CLEAR });
  });

  await page.route("**/api/classify-court-path", (route) => {
    record("classify-court-path");
    return route.fulfill({
      status: 200,
      json: {
        ok: true,
        courtPath: "small-claims",
        confidence: "high",
        outOfScopeForum: null,
        redirectMessage: null,
      },
    });
  });

  await page.route("**/api/intake/classify-claim-type", (route) => {
    record("classify-claim-type");
    return route.fulfill({
      status: 200,
      json: {
        ok: true,
        claimTypeId: "sc-claim-unpaid-debt-services",
        claimTypeName: "Unpaid debt or non-payment for services",
      },
    });
  });

  await page.route("**/api/intake/explain-question", (route) => {
    record("explain-question");
    return route.fulfill({
      status: 200,
      json: { ok: true, explanation: "A short stubbed explanation of this question." },
    });
  });

  await page.route("**/api/intake/guided-turn", (route) => {
    record("guided-turn");
    return route.fulfill({
      status: 200,
      json: {
        ok: true,
        assistantMessage: "Thanks — recorded. What happened next?",
        facts: {},
        done: false,
      },
    });
  });

  await page.route("**/api/intake/depth-turn", (route) => {
    record("depth-turn");
    return route.fulfill({ status: 200, json: { ok: true, questions: [], done: true } });
  });

  return counts;
}
