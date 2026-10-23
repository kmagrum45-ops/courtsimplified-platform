/**
 * The site's server calls, answered in the test by this commit's own code (no AI,
 * no database): the analysis engines, the case's position save (the route's own
 * merge), the next-step answer (the route's handler), and the follow-up chat (the
 * route's handler, with the case the synthetic account saved). Register after
 * fakeAccount, whose catch-all would otherwise answer them.
 *
 * Only what needs a model stays unanswered: the checked law lookup reports nothing
 * found, so the chat's own reply is what a person reads.
 */
import type { Page, Route } from "@playwright/test";
import { runFamilyIntakeCanonicalIntegration } from "../../../src/lib/case-system/orchestration/familyIntakeCanonicalAdapter";
import { runCivilIntakeCanonicalIntegration } from "../../../src/lib/case-system/orchestration/civilIntakeCanonicalAdapter";
import { analyzeSmallClaimsWithBrain } from "../../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { applyPositionPatch, readCasePosition } from "../../../src/lib/case-system/casePosition";
import { createStageAnswerPost } from "../../../app/api/case/stage-answer/route";
import { createGuidedAssistantPost } from "../../../app/api/guided-assistant/route";

export type Court = "small-claims" | "civil" | "family";
type Rows = Map<string, Record<string, unknown>>;
const OWNER = "11111111-1111-4111-8111-111111111111";

// The route handlers take a NextRequest; a plain Request carries everything they read.
async function viaHandler(route: Route, handler: (request: never) => Promise<Response>) {
  const request = route.request();
  const response = await handler(new Request(request.url(), { method: request.method(), headers: { "content-type": "application/json" }, body: request.postData() ?? undefined }) as never);
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
  await page.route("**/api/case/stage-answer", (route) => viaHandler(route, createStageAnswerPost()));
  await page.route("**/api/guided-assistant", (route) => {
    const caseId = route.request().postDataJSON()?.caseId;
    const row = rows.get(caseId) ?? [...rows.values()][0];
    const post = createGuidedAssistantPost({
      authenticate: (async () => ({ id: OWNER })) as never,
      owned: (async () => row ?? null) as never,
    });
    return viaHandler(route, post);
  });
  await page.route("**/api/assistant/law", (route) => route.fulfill({ json: { findings: [] } }));
  await page.route("**/api/cases/chat**", (route) => route.fulfill({ json: { ok: true, messages: [] } }));
}
