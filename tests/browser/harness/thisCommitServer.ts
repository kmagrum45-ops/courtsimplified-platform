/**
 * The site's server calls, answered in the test by this commit's own code (no AI,
 * no database): the analysis engines, the case's position save (the route's own
 * merge), the next-step answer (the route's handler), and the follow-up chat (the
 * route's handler, with the case the synthetic account saved). Register after
 * fakeAccount, whose catch-all would otherwise answer them.
 *
 * Only what needs a model stays unanswered: the checked law lookup reports nothing
 * found, so the chat's own reply is what a person reads. The Small Claims questions
 * one at a time (guided-turn) run the real turn with every model step replaced by its
 * plain stand-in: only the side read from an answer, one fixed proposal (the voice step calls no model and runs as it is) -- each answer
 * is recorded as the person gave it, which is what the page then has to handle.
 */
import type { Page, Route } from "@playwright/test";
import { runFamilyIntakeCanonicalIntegration } from "../../../src/lib/case-system/orchestration/familyIntakeCanonicalAdapter";
import { runCivilIntakeCanonicalIntegration } from "../../../src/lib/case-system/orchestration/civilIntakeCanonicalAdapter";
import { analyzeSmallClaimsWithBrain } from "../../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { applyPositionPatch, readCasePosition } from "../../../src/lib/case-system/casePosition";
import { createStageAnswerPost } from "../../../app/api/case/stage-answer/route";
import { createGuidedAssistantPost } from "../../../app/api/guided-assistant/route";
import { createGuidedTurnPost } from "../../../app/api/intake/guided-turn/route";
import { orchestrateIntakeTurn } from "../../../src/lib/case-system/intake/orchestrateIntakeTurn";
import { sideInAnswer } from "../../../app/builder/_components/stageFromAnswers";
import { candidatesFromMasterResult, resolveCandidates } from "../../../src/lib/case-system/events/caseEventCandidates";

export type Court = "small-claims" | "civil" | "family";
type Rows = Map<string, Record<string, unknown>>;
const OWNER = "11111111-1111-4111-8111-111111111111";

// The route handlers take a NextRequest; a plain Request carries everything they read.
/**
 * Each test page is one person, so each gets its own visitor address: the per-visitor
 * hourly limit on AI routes (aiRateLimit.ts) counts one person, as on the site. Run in
 * one process, every test was the same "unknown" visitor and the limit ran out part-way
 * through the story pack on a one-worker runner (case 05, 2026-10-25).
 */
const VISITOR = new WeakMap<Page, string>();
function visitorFor(page: Page): string {
  let address = VISITOR.get(page);
  if (!address) { address = `test-visitor-${crypto.randomUUID()}`; VISITOR.set(page, address); }
  return address;
}

async function viaHandler(route: Route, handler: (request: never) => Promise<Response>, page?: Page) {
  const request = route.request();
  const headers: Record<string, string> = { "content-type": "application/json", ...(page ? { "x-forwarded-for": visitorFor(page) } : {}) };
  const response = await handler(new Request(request.url(), { method: request.method(), headers, body: request.postData() ?? undefined }) as never);
  return route.fulfill({ status: response.status, contentType: "application/json", body: await response.text() });
}

export async function serveFromThisCommit(page: Page, court: Court, rows: Rows) {
  await page.route(`**/api/${court}/analyze`, async (route) => {
    const { input } = route.request().postDataJSON();
    const result = court === "family" ? await runFamilyIntakeCanonicalIntegration(input, { allowExternalCognition: false }) : court === "civil" ? await runCivilIntakeCanonicalIntegration(input, { allowExternalCognition: false }) : await analyzeSmallClaimsWithBrain(input, { allowExternalCognition: false });
    return route.fulfill({ json: { ok: true, result, authenticated: true, reasoningMode: "deterministic-fallback", analysisAvailable: true } });
  });
  await page.route("**/api/case/read", (route) => route.fulfill({ json: { ok: true, skipped: "off" } }));
  await page.route("**/api/case/understand", (route) => route.fulfill({ json: { ok: true, skipped: "off" } }));
  await page.route("**/api/classify-court-path", (route) => route.fulfill({ json: { primaryPath: court, confidence: 0.95 } }));
  await page.route("**/api/cases/position", async (route) => {
    const body = route.request().postDataJSON();
    const row = rows.get(body.caseId);
    if (!row) return route.fulfill({ status: 404, json: { error: "not found" } });
    const master = (row.master_result ?? {}) as Record<string, unknown>;
    const result = applyPositionPatch(readCasePosition(master, court), body, court, new Date());
    if (!result.ok) return route.fulfill({ status: 400, json: { error: result.error } });
    row.master_result = { ...master, position: result.position };
    row.updated_at = new Date().toISOString();
    return route.fulfill({ json: { position: result.position } });
  });
  await page.route("**/api/case/stage-answer", (route) => viaHandler(route, createStageAnswerPost(), page));
  await page.route("**/api/guided-assistant", (route) => {
    const caseId = route.request().postDataJSON()?.caseId;
    const row = rows.get(caseId) ?? [...rows.values()][0];
    const post = createGuidedAssistantPost({
      authenticate: (async () => ({ id: OWNER })) as never,
      owned: (async () => row ?? null) as never,
    });
    return viaHandler(route, post, page);
  });
  await page.route("**/api/assistant/law", (route) => route.fulfill({ json: { findings: [] } }));
  await page.route("**/api/intake/guided-turn", (route) => {
    // The route requires a key to be configured; no model is called (every step is replaced).
    process.env.OPENAI_API_KEY ||= "no-model-in-tests";
    const post = createGuidedTurnPost({
      authenticate: (async () => ({ id: OWNER })) as never,
      hasExternalAiKey: () => true,
      orchestrate: ((facts, answeredIds, text, _key, bank, types, area, questionId, options, earlier) => orchestrateIntakeTurn(facts, answeredIds, text, "no-model", bank, types, area, questionId, {
        ...options,
        runSafety: async () => ({ classification: "clear" as const, reason: "test", requestsLegalAdvice: false }),
        // Only the side, by the site's own plain reading of an answer ("... (defendant)").
        extractFacts: async (text) => { const side = sideInAnswer(text); return side ? { facts: { role: side }, directFields: ["role"] } : { facts: {}, directFields: [] }; },
        classifyClaimType: async () => null,
        // One plain proposal, so the "Here's what I understood" card is exercised: a
        // counterclaim offered to a defendant, quoting the story's first sentence.
        proposeAnswers: async (story, questions) => questions.filter((question) => question.id === "sc-defendant-counterclaim").map((question) => ({ questionId: question.id, questionText: question.text, answer: "Yes", storyQuote: story.split(/(?<=[.!?])\s+/)[0] ?? story })),
      }, earlier)) as typeof orchestrateIntakeTurn,
    });
    return viaHandler(route, post, page);
  });
  await page.route("**/api/intake/classify-claim-type", (route) => route.fulfill({ status: 503, json: { ok: false } }));
  await page.route("**/api/intake/depth-turn", (route) => route.fulfill({ status: 503, json: { ok: false } }));
  await page.route("**/api/cases/chat**", (route) => route.fulfill({ json: { ok: true, messages: [] } }));
  // "Things that may have happened in your case": the route's own reading of the saved case (no
  // events confirmed, nothing dismissed in a fresh case). Chrome 29 Oct, finding 1: its date boxes
  // are where "When, in your words" and "The exact date" are asked; unanswered, they were never shown.
  await page.route("**/api/cases/event-candidates**", (route) => {
    if (route.request().method() !== "GET") return route.fulfill({ json: { ok: true } });
    const row = rows.get(new URL(route.request().url()).searchParams.get("caseId") ?? "");
    return route.fulfill({ json: { candidates: row ? resolveCandidates(candidatesFromMasterResult(row.master_result), [], []) : [] } });
  });
}
