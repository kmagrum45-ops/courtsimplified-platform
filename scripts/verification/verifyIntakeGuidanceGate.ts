/**
 * Phase 4: the same confirmation/revision policy governs HTTP and presentation.
 * Synthetic owned cases exercise collecting, review, legacy, forged proofs,
 * cross-case/court/account refusal, late responses and stale generated guidance.
 * Actual unauthenticated endpoints are called too: no network, AI or real data.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { NextRequest } from "next/server";
import { withConfirmedGuidance } from "../../src/lib/security/intakeGuidanceGate";
import { guidanceIsCurrent, intakeRecordView, remainingEssentialQuestions, transitionReview } from "../../src/lib/case-system/intakeReview";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { POST as smallClaimsPost } from "../../app/api/small-claims/analyze/route";
import { POST as familyPost } from "../../app/api/family/analyze/route";
import { POST as civilPost } from "../../app/api/civil/analyze/route";
import { POST as stagePost } from "../../app/api/case/stage-answer/route";
import { POST as safetyPost } from "../../app/api/intake/safety-check/route";
const id = "11111111-1111-4111-8111-111111111111";
const revision = "22222222-2222-4222-8222-222222222222";
const newer = "33333333-3333-4333-8333-333333333333";
const owner = "44444444-4444-4444-8444-444444444444";
async function main() {
  for (const court of ["small-claims", "family", "civil"] as const) {
    const cp: Checkpoint = { version: 1, flowId: id, courtPath: court, revision, inputRevision: revision, sections: { builder: { homeStory: "Synthetic facts for initial intake", confirmedLocation: { city: "Toronto", province: "Ontario" } } } };
    assert.throws(() => transitionReview(transitionReview({}, cp, "review", revision, "now"), cp, "confirm", revision, "now"), /initial questions/);
    cp.sections.builder.initialUnknowns = remainingEssentialQuestions(cp).map(question => question.id);
    const workflow = transitionReview(transitionReview({}, cp, "review", revision, "now"), cp, "confirm", revision, "now");
    const master: Record<string, unknown> = { intakeCheckpoint: cp, workflowStatus: {}, guidanceInputRevision: revision, analysis: { text: "Synthetic procedural result" }, intakeData: { facts: "Synthetic facts", analysis: { text: "Nested old guidance" }, masterResultPatch: { old: "guidance" } }, documents: { retained: true }, evidence: { retained: true } };
    let calls = 0;
    let mutateDuringWork = false;
    const request = (caseId = id, expected = revision) => new Request("http://localhost/api/case/review", { method: "POST", headers: { "Content-Type": "application/json", "x-courtsimplified-input-revision": expected }, body: JSON.stringify({ caseId, courtPath: court, intakeCompleted: true }) });
    const deps = { authenticate: async () => ({ id: owner }), owned: async (_request: Request, user: { id: string }, caseId: string) => user.id === owner && caseId === id ? { id, court_path: court, master_result: master } : null };
    const handler = async () => { calls++; if (mutateDuringWork) cp.inputRevision = newer; return Response.json({ proceduralOverview: true }); };
    const guarded = withConfirmedGuidance(handler, { court, currentAnalysis: true, requireRevision: true }, deps);
    for (const state of [{}, { intakeCompleted: true }, transitionReview({}, cp, "review", revision, "now")]) {
      master.workflowStatus = state;
      assert.equal((await guarded(request())).status, 409);
    }
    assert.equal(calls, 0, "unconfirmed requests never start full guidance generation");
    master.workflowStatus = workflow;
    assert.equal((await guarded(request(newer))).status, 404);
    assert.equal((await guarded(request(id, newer))).status, 409);
    assert.equal((await withConfirmedGuidance(handler, { court: court === "civil" ? "family" : "civil" }, deps)(request())).status, 409);
    assert.equal((await withConfirmedGuidance(handler, {}, { ...deps, authenticate: async () => ({ id: newer }) })(request())).status, 404);
    const allowed = await guarded(request());
    assert.equal(allowed.status, 200);
    assert.match(allowed.headers.get("cache-control") ?? "", /no-store/);
    assert(guidanceIsCurrent(master, court, id));
    master.guidanceInputRevision = newer;
    assert.equal((await guarded(request())).status, 409, "new confirmation cannot reveal guidance from another revision");
    master.guidanceInputRevision = revision;
    mutateDuringWork = true;
    assert.equal((await guarded(request())).status, 409, "late guidance is discarded after material edits");
    assert.equal(guidanceIsCurrent(master, court, id), false);
    const safe = intakeRecordView(master, court, id);
    assert.equal(safe.analysis, undefined);
    assert.deepEqual(safe.intakeData, { facts: "Synthetic facts" });
    assert.deepEqual(safe.documents, { retained: true });
    assert.deepEqual(safe.evidence, { retained: true });
    assert(master.analysis, "withholding guidance never destroys the saved record");
    console.log(`PASS ${court}: server confirmation, ownership, revision leases, legacy and stale guidance`);
  }
  for (const [name, post] of [["small-claims", smallClaimsPost], ["family", familyPost], ["civil", civilPost], ["stage-answer", stagePost], ["safety-check", safetyPost]] as const) {
    const response = await post(new Request(`http://localhost/api/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: {}, caseId: id, intakeCompleted: true }) }) as never);
    assert.equal(response.status, 401, `${name} actual HTTP handler refuses forged/anonymous completion`);
  }
  const protectedRoutes = ["small-claims/analyze", "family/analyze", "civil/analyze", "case/stage-answer", "case/resolve-stage", "case/review", "case/read", "case/strategy", "assistant/law", "guided-assistant", "generate-form", "rules/procedures", "intake/depth-turn", "intake/sourced-questions", "workspace/documents/analyse", "workspace/documents/decision-help", "workspace/export", "workspace/exhibit-book", "cases/form-applicability", "cases/events", "cases/chat", "workspace/organisation"];
  for (const route of protectedRoutes) {
    assert.match(readFileSync(`app/api/${route}/route.ts`, "utf8"), /withConfirmedGuidance\(/, `${route} must retain HTTP enforcement`);
    const imported = await import(pathToFileURL(path.resolve(`app/api/${route}/route.ts`)).href);
    const handlers = (imported.default ?? imported) as Record<string, (request: NextRequest) => Promise<Response>>;
    const methods = route === "cases/form-applicability" ? ["GET", "PATCH"] : ["cases/chat", "workspace/exhibit-book"].includes(route) ? ["GET", "POST"] : ["workspace/export", "workspace/organisation", "cases/events"].includes(route) ? ["GET"] : ["POST"];
    for (const method of methods) {
      const url = `http://localhost/api/${route}?caseId=${id}${route === "workspace/organisation" ? "&view=timeline" : ""}`;
      const response = await handlers[method](new NextRequest(url, { method, headers: { "Content-Type": "application/json", "x-courtsimplified-case-id": id }, ...(method === "GET" ? {} : { body: JSON.stringify({ caseId: id, intakeCompleted: true }) }) }));
      assert.equal(response.status, 401, `${route} ${method}: actual HTTP export must reject anonymous forged confirmation`);
    }
  }
  const independentRoutes = ["case/understand", "classify-court-path", "intake/guided-turn", "intake/classify-claim-type", "intake/safety-check", "intake/tidy-wording", "law/explain", "cases", "cases/position", "cases/drafts", "cases/event-candidates", "workspace/documents", "workspace/documents/upload-url", "workspace/documents/extract", "canlii/case", "site-access"];
  const actualRoutes = readdirSync("app/api", { recursive: true }).map(String).filter(name => /route\.ts$/.test(name)).map(name => name.replaceAll("\\", "/").replace(/\/route\.ts$/, ""));
  assert.deepEqual(actualRoutes.sort(), [...protectedRoutes, ...independentRoutes].sort(), "new API routes require an explicit presentation/security audit");
  assert(!readFileSync("app/api/intake/safety-check/route.ts", "utf8").includes("withConfirmedGuidance"), "urgent safety information must not wait for confirmation");
  console.log("PASS actual HTTP refusals and complete API surface inventory");
}
void main().catch(error => { console.error(error instanceof Error ? error.message : "FAIL guidance gate"); process.exitCode = 1; });
