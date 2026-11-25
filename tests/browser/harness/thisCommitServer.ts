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
import { applyConfirmedStoryAnswers, orchestrateIntakeTurn } from "../../../src/lib/case-system/intake/orchestrateIntakeTurn";
import { reasonWithModel, understandCase } from "../../../src/lib/case-system/understanding/understandCase";
import { classifyCourtPath } from "../../../src/lib/case-system/intelligence/courtPathClassifier";
import { runSafetyPass } from "../../../src/lib/case-system/intake/safetyPass";
import { extractIntakeFactsWithConfidence } from "../../../src/lib/case-system/intake/extractIntakeFacts";
import { classifyClaimTypeWithAi } from "../../../src/lib/case-system/intake/claimTypeAiClassifier";
import { proposeAnswersFromStory } from "../../../src/lib/case-system/intake/storyAnswerProposals";
import { realStep } from "./aiFixtures";
import { createClassifyClaimTypePost } from "../../../app/api/intake/classify-claim-type/route";
import { resolveClaimTypeSuggestion } from "../../../src/lib/case-system/intake/claimTypeSuggestionResolution";
import { checkedAnswerView } from "../../../src/lib/case-system/retrieval/checkedAnswer";
import { sideInAnswer } from "../../../app/builder/_components/stageFromAnswers";
import { candidatesFromMasterResult, resolveCandidates } from "../../../src/lib/case-system/events/caseEventCandidates";
import { isUnderstandingBody, understandingInputError } from "../../../src/lib/case-system/understanding/understandInput";
import { isSmallClaimsInput } from "../../../app/api/small-claims/analyze/route";
import { isCivilInput } from "../../../app/api/civil/analyze/route";
import { isFamilyInput } from "../../../app/api/family/analyze/route";
import { isBody as isAssistantLawBody } from "../../../app/api/assistant/law/route";
import { isClassifyClaimTypeRequestBody } from "../../../app/api/intake/classify-claim-type/route";
import { isDepthTurnRequestBody } from "../../../app/api/intake/depth-turn/route";

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

/**
 * A STAND-IN ANSWERS ONLY WHAT THE ROUTE ITSELF ACCEPTS (hotfix, 21 Nov 2026). Chrome check of ad67c3f7, S6: "Update
 * with my answers" never finished on the site, because the route turned down the answers the card sent (each carried
 * its question's id), while every test passed: the stand-in answered the reading without running the route's check.
 * Each stand-in here for a route with a request check now runs that check, the route's own exported function, first,
 * and answers 400 as the route does when it refuses (test:understand-request, part 5).
 */
export const ROUTE_CHECKS = {
  "case/understand": (body: unknown) => isUnderstandingBody(body) && !understandingInputError(body.story, body.city ?? "", body.answers ?? []),
  "small-claims/analyze": (body: unknown) => isSmallClaimsInput((body as { input?: unknown } | null)?.input),
  "civil/analyze": (body: unknown) => isCivilInput((body as { input?: unknown } | null)?.input),
  "family/analyze": (body: unknown) => isFamilyInput((body as { input?: unknown } | null)?.input),
  "assistant/law": (body: unknown) => isAssistantLawBody(body),
  "intake/classify-claim-type": (body: unknown) => isClassifyClaimTypeRequestBody(body),
  "intake/depth-turn": (body: unknown) => isDepthTurnRequestBody(body),
} as const;
export function refusedByRoute(route: Route, name: keyof typeof ROUTE_CHECKS): Promise<void> | null {
  let body: unknown;
  try { body = route.request().postDataJSON(); } catch { body = undefined; }
  if (ROUTE_CHECKS[name](body)) return null;
  console.log(`STAND-IN REFUSED /api/${name}: the route's own check turns this request down, as the site would`);
  return route.fulfill({ status: 400, json: { ok: false, error: "A valid request body is required." } });
}

export async function serveFromThisCommit(page: Page, court: Court, rows: Rows) {
  await page.route(`**/api/${court}/analyze`, async (route) => {
    const refused = refusedByRoute(route, `${court}/analyze`);
    if (refused) return refused;
    const { input } = route.request().postDataJSON();
    const result = court === "family" ? await runFamilyIntakeCanonicalIntegration(input, { allowExternalCognition: false }) : court === "civil" ? await runCivilIntakeCanonicalIntegration(input, { allowExternalCognition: false }) : await analyzeSmallClaimsWithBrain(input, { allowExternalCognition: false });
    return route.fulfill({ json: { ok: true, result, authenticated: true, reasoningMode: "deterministic-fallback", analysisAvailable: true } });
  });
  await serveModelStandIns(page, court);
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

/**
 * The home page's story reading (/api/case/understand) for a story read with questions: this commit's own
 * understandCase, with only the model's reasoning replaced by these questions on the first reading (none once the
 * person has answered), so what the reading does with the situation answers (which questions it drops) is the site's
 * own code (Chrome check of #550, 5b-5d).
 */
async function serveHomeReading(page: Page, court: Court, questions: readonly string[], facts: readonly { label: string; value: string }[] = [], realAi?: string) {
  await page.route("**/api/case/understand", async (route) => {
    const refused = refusedByRoute(route, "case/understand");
    if (refused) return refused;
    const body = route.request().postDataJSON() as { story: string; answers?: { question: string; answer: string }[]; situation?: { side?: string } };
    const asked = body.answers?.length ? [] : questions;
    // A real-AI fixture: the model's own reading of what understandCase sends it (aiFixtures.ts).
    const reason = realAi ? (sent: string, chosen?: unknown) => realStep(realAi, "story-reading", { sent, chosen: chosen ?? null }, () => reasonWithModel(sent, (chosen ?? null) as never, undefined, undefined, true)) : async () => JSON.stringify({ summary: "Synthetic reading.", facts, matters: [{ title: "Your matter", court }], mainCourt: court, side: body.situation?.side ?? "unclear", stage: "", questions: asked.map((question) => ({ question, why: "Synthetic." })), asksForPrediction: false, step: null, points: [] });
    const result = await understandCase({ story: body.story, ...(body.answers ? { answers: body.answers } : {}), ...(body.situation ? { situation: body.situation } : {}) } as never, { reason, intakeOnly: true, check: { answer: async () => ({ status: "unavailable", statements: [], notConfirmed: [], declinedToJudge: false, missingLaw: [] }) } as never });
    if (result.status !== "understood") return route.fulfill({ json: { ok: true, skipped: "unavailable" } });
    return route.fulfill({ json: { ok: true, understanding: result.understanding, answer: checkedAnswerView(result.answer) } });
  });
}

/**
 * ONLY the routes that would call a model, each answered by this commit's own code with every
 * model step replaced (as above). Everything else -- the account, the case rows, every /api
 * route and every save -- is left to the real site. For a test that must use the real save path
 * (site owner, 29 Oct: a green test must mean the live path works): list these as its stand-ins.
 * `ownerId`: the signed-in user the guided-turn route is told it serves.
 * `suggestKind`: the claim-type classifier's stand-in suggests this kind on every opening story
 * (default: none), and "No, not that one" gets "no match" back -- for the "Not quite" test.
 * `homeQuestions`: the home page's story reading asks these (serveHomeReading); without them it is off.
 */
export async function serveModelStandIns(page: Page, court: Court, ownerId: string = OWNER, standIns: { suggestKind?: { claimTypeId: string; claimTypeName: string; quote: string }; propose?: Record<string, string>; homeQuestions?: readonly string[]; homeFacts?: readonly { label: string; value: string }[]; realAi?: string } = {}) {
  // `realAi`: the story's real-AI fixture (aiFixtures.ts): every model step below answers with the real model's recorded output.
  const real = standIns.realAi;
  const key = () => process.env.OPENAI_API_KEY ?? "";
  await page.route("**/api/case/read", (route) => route.fulfill({ json: { ok: true, skipped: "off" } }));
  // homeFacts: the facts the reading shows ("AMOUNT SOUGHT $5,468.45"), as the model gives them (Chrome milestone test of #550).
  if (real) await serveHomeReading(page, court, [], [], real);
  // A reading of facts only, with no questions, too (Chrome's run on #561: the reading named the other side, asked nothing).
  else if (standIns.homeQuestions?.length || standIns.homeFacts?.length) await serveHomeReading(page, court, standIns.homeQuestions ?? [], standIns.homeFacts ?? []);
  else await page.route("**/api/case/understand", (route) => refusedByRoute(route, "case/understand") ?? route.fulfill({ json: { ok: true, skipped: "off" } }));
  await page.route("**/api/classify-court-path", async (route) => {
    if (!real) return route.fulfill({ json: { primaryPath: court, confidence: 0.95 } });
    const body = route.request().postDataJSON() as { story?: string; declaredCourtPath?: string | null };
    const input = { story: String(body.story ?? "").slice(0, 4_000).trim(), declaredCourtPath: body.declaredCourtPath ?? null };
    return route.fulfill({ json: await realStep(real, "court-suggestion", input, () => classifyCourtPath(input)) });
  });
  await page.route("**/api/assistant/law", (route) => refusedByRoute(route, "assistant/law") ?? route.fulfill({ json: { findings: [] } }));
  await page.route("**/api/intake/guided-turn", (route) => {
    // The route requires a key to be configured; no model is called (every step is replaced).
    process.env.OPENAI_API_KEY ||= "no-model-in-tests";
    // Every AI step of the chat, once: the real model's, recorded (aiFixtures.ts; keyed by what each is sent), or a plain
    // stand-in. The same steps serve the chat's turns AND the reading of the suggestions the person accepts (applyConfirmed):
    // before 18 Nov the second had none, so it called the model with no key and failed silently in every ordinary run
    // (site owner, 18 Nov 2026, item 4: "do not leave the ordinary browser tests failing silently").
    const steps: Required<Pick<NonNullable<Parameters<typeof orchestrateIntakeTurn>[8]>, "runSafety" | "extractFacts" | "classifyClaimType" | "proposeAnswers">> = real ? {
      runSafety: (said) => realStep(real, "safety", { said }, () => runSafetyPass(said, key())),
      extractFacts: (said) => realStep(real, "fact-reading", { said }, () => extractIntakeFactsWithConfidence(said, key())),
      classifyClaimType: (said, kinds, _apiKey, exclude = [], responding = false) => realStep(real, "claim-kind", { said, exclude, responding }, () => classifyClaimTypeWithAi(said, kinds, key(), exclude, responding)),
      proposeAnswers: (story, questions, _apiKey, more = {}) => realStep(real, "story-suggestions", { story, questions: questions.map((question) => question.id), quoteFrom: more.quoteFrom ?? null }, () => proposeAnswersFromStory(story, questions, key(), more)),
    } : {
      runSafety: async () => ({ classification: "clear" as const, reason: "test", requestsLegalAdvice: false }),
      // Only the side, by the site's own plain reading of an answer ("... (defendant)").
      extractFacts: async (text) => { const side = sideInAnswer(text); return side ? { facts: { role: side }, directFields: ["role"] } : { facts: {}, directFields: [] }; },
      classifyClaimType: async () => standIns.suggestKind ?? null,
      // One plain proposal, so the "Here's what I understood" card is exercised: a
      // counterclaim offered to a defendant, quoting the story's first sentence.
      proposeAnswers: async (story, questions) => questions.filter((question) => question.id === "sc-defendant-counterclaim" || standIns.propose?.[question.id]).map((question) => ({ questionId: question.id, questionText: question.text, answer: standIns.propose?.[question.id] ?? "Yes", storyQuote: story.split(/(?<=[.!?])\s+/)[0] ?? story })),
    };
    const post = createGuidedTurnPost({
      authenticate: (async () => ({ id: ownerId })) as never,
      hasExternalAiKey: () => true,
      orchestrate: ((facts, answeredIds, text, _key, bank, types, area, questionId, options, earlier) => orchestrateIntakeTurn(facts, answeredIds, text, real ? key() || "no-model" : "no-model", bank, types, area, questionId, { ...options, ...steps }, earlier)) as typeof orchestrateIntakeTurn,
      // Confirming the story's suggestions reads the confirmed answers (and may offer once more from the story): the same
      // steps (18 Nov 2026: without them, recording read them with the real model unsaved, the replay failed that read
      // silently, 16 times in the round-2 replay, and every ordinary run failed it silently too).
      applyConfirmed: ((facts, answeredIds, confirmed, _key, bank, area, overrides = {}, repropose) => applyConfirmedStoryAnswers(facts, answeredIds, confirmed, real ? key() || "no-model" : "no-model", bank, area, {
        ...overrides,
        extractFacts: steps.extractFacts,
        proposeAnswers: steps.proposeAnswers,
      }, repropose)) as typeof applyConfirmedStoryAnswers,
    });
    return viaHandler(route, post, page);
  });
  await page.route("**/api/intake/classify-claim-type", (route) => refusedByRoute(route, "intake/classify-claim-type") ?? (real ? (() => {
    // The route's own handler; only its classifier answers from the fixture (the route requires a key to be configured).
    process.env.OPENAI_API_KEY ||= "no-model-in-tests";
    const post = createClassifyClaimTypePost({
      authenticate: (async () => ({ id: ownerId })) as never,
      hasExternalAiKey: () => true,
      resolve: ((...args: Parameters<typeof resolveClaimTypeSuggestion>) => {
        const [action, said, , , , claimTypeId, prior] = args;
        const sent = [...args] as unknown[];
        sent[4] = key();
        return realStep(real, "claim-kind-confirm", { action, said, claimTypeId: claimTypeId ?? null, prior: prior ?? [] }, () => (resolveClaimTypeSuggestion as (...all: unknown[]) => Promise<unknown>)(...sent));
      }) as unknown as typeof resolveClaimTypeSuggestion,
    });
    return viaHandler(route, post, page);
  })() : standIns.suggestKind ? route.fulfill({ json: { ok: true, result: { outcome: "no-match" } } }) : route.fulfill({ status: 503, json: { ok: false } })));
  await page.route("**/api/intake/depth-turn", (route) => refusedByRoute(route, "intake/depth-turn") ?? route.fulfill({ status: 503, json: { ok: false } }));
}
