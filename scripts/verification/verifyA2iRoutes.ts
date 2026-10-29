/**
 * On production, every AI-advice route refuses (or answers "off") for anyone
 * who is not a listed tester, and works for a listed tester.
 *
 * Site owner, 2026-10-29: "production defaults off, owner allowlist". The
 * switches decide (test:a2i-scope); this suite checks the ROUTES obey them for
 * the person actually asking, which depends on the route putting its verified
 * user in scope (policy/capabilityRequest.ts) before any switch is read.
 *
 * NO NETWORK, NO DATABASE, NO MODEL. The real exported route handlers run
 * against a stand-in fetch: a fake Supabase that answers "who is this token"
 * (one tester, one ordinary user) and returns one confirmed case, and a fake
 * OpenAI that records each request and refuses it (400, never retried). So
 * "the route reached the model" is observed, not inferred.
 *
 * WHAT FAILURE THIS CATCHES:
 *   - an AI-advice route doing its work, or calling the model at all, on
 *     production for a signed-in user who is not on A2I_TESTER_USER_IDS
 *     (before 2026-10-29 every one of them did);
 *   - the same route refusing a listed tester (the wiring of the user into
 *     the request lost, so the owner cannot test on production);
 *   - the safety pass on production using the "answer legal questions"
 *     criteria for an unlisted user;
 *   - a route that reaches a capability check without putting its user in
 *     scope (no confirmed-guidance gate, withRequestNames, capabilityRoute or
 *     withCapabilityUser), unless declared below with the reason it needs none.
 *
 * Run: npm run test:a2i-routes
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const TESTER = "0d8f5a52-3c1e-4c7b-9a51-2f6e1b0c7a11";
const OTHER = "7b2e9c40-1a3d-4e8f-b6c5-d4a3b2c1e0f9";
const TOKENS: Record<string, string> = { "tester-token": TESTER, "other-token": OTHER };
const SUPABASE = "http://supabase.a2i-routes.test";

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
}

// ---------------------------------------------------------------------------
// 1. Every route that reaches a capability check puts its user in scope.
// ---------------------------------------------------------------------------

const CAPABILITY_MODULES = [
  "src/lib/case-system/policy/capabilityAccess.ts",
  "src/lib/case-system/policy/a2iScope.ts",
  "src/lib/content-library/phaseScope.ts",
  "src/lib/case-workspace/aiAnalysis.ts",
].map((file) => path.join(ROOT, file));

/**
 * Handlers that reach a capability module only through code they never run,
 * or run only for checks that are off for everyone but a tester anyway. Unwrapped,
 * such a handler can only be MORE closed on production, never more open (the
 * check fails closed), so the cost is the tester's, not the public's.
 */
const DECLARED_UNWRAPPED: Record<string, string> = {
  "app/api/cases/route.ts GET": "lists and opens cases; computes no AI-advice feature",
  "app/api/cases/route.ts POST": "creates a case row; computes no AI-advice feature",
  "app/api/cases/route.ts DELETE": "deletes a case and its files",
  "app/api/cases/chat/route.ts DELETE": "deletes a chat",
  "app/api/capabilities/route.ts GET": "decides with the verified user passed explicitly (capabilitySetFor({ userId }))",
  "app/api/workspace/organisation/route.ts GET": "the timeline view goes through the confirmed-guidance gate; the document view computes nothing gated",
};

const IMPORT = /(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;
function resolveFrom(from: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? path.join(ROOT, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return null;
}
function reachesCapability(entry: string): boolean {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (CAPABILITY_MODULES.includes(file)) return true;
    for (const match of readFileSync(file, "utf8").matchAll(IMPORT)) {
      const target = resolveFrom(file, match[1] ?? match[2]);
      if (target && !seen.has(target)) queue.push(target);
    }
  }
  return false;
}

function structural(): void {
  const routes: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "route.ts") routes.push(full);
    }
  };
  walk(path.join(ROOT, "app", "api"));
  const unwrapped: string[] = [];
  const reached: string[] = [];
  for (const file of routes) {
    if (!reachesCapability(file)) continue;
    const relative = path.relative(ROOT, file).split(path.sep).join("/");
    const source = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    for (const match of source.matchAll(/^export (?:async function (GET|POST|PUT|PATCH|DELETE)\(|const (GET|POST|PUT|PATCH|DELETE) = (.*))/gm)) {
      const method = match[1] ?? match[2];
      const id = `${relative} ${method}`;
      reached.push(id);
      let wrapped: boolean;
      if (match[1]) {
        const start = match.index ?? 0;
        const end = source.indexOf("\n}\n", start);
        wrapped = /withCapabilityUser\(/.test(source.slice(start, end < 0 ? undefined : end));
      } else {
        wrapped = /^(withConfirmedGuidance|withRequestNames|capabilityRoute)\(/.test(match[3]);
      }
      if (!wrapped && !DECLARED_UNWRAPPED[id]) unwrapped.push(id);
    }
  }
  check("every route handler that reaches a capability check puts its verified user in scope (or is declared)", unwrapped.length === 0, unwrapped.join(", "));
  const stale = Object.keys(DECLARED_UNWRAPPED).filter((id) => !reached.includes(id));
  check("every declared unwrapped handler still exists and still reaches a capability check (else delete its line)", stale.length === 0, stale.join(", "));
}

// ---------------------------------------------------------------------------
// 2. The real routes, on production, as a tester and as an ordinary user.
// ---------------------------------------------------------------------------

const modelRequests: string[] = [];
let confirmedMaster: Record<string, unknown> = {};
const CASE_ID = "11111111-1111-4111-8111-111111111479";

function caseRow(): Record<string, unknown> {
  const master = confirmedMaster;
  const cp = master.intakeCheckpoint as Record<string, unknown>;
  const row: Record<string, unknown> = {
    id: CASE_ID,
    court_path: "family",
    user_id: TESTER,
    master_result: master,
    intakeFlow: cp.flowId,
    intakeCourt: cp.courtPath,
    intakeVersion: String(cp.version),
    intakeRevision: cp.revision,
    inputRevision: cp.inputRevision,
  };
  for (const [key, value] of Object.entries(master)) row[`mr_${key}`] = value;
  return row;
}

function installFakeNetwork(): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    if (url.startsWith(SUPABASE)) {
      if (url.includes("/auth/v1/user")) {
        const token = (headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
        const id = TOKENS[token];
        return id ? json({ id, aud: "authenticated", role: "authenticated", email: `${id.slice(0, 4)}@example.test`, app_metadata: {}, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" }) : json({ msg: "invalid" }, 401);
      }
      if (url.includes("/rest/v1/cases") && (init?.method ?? "GET") === "GET") {
        const single = /pgrst\.object/.test(headers.get("accept") || "");
        return single ? json(caseRow()) : json([caseRow()]);
      }
      if (url.includes("/rest/v1/")) {
        const single = /pgrst\.object/.test(headers.get("accept") || "");
        return single ? json({ message: "none" }, 406) : json([]);
      }
      return json({}, 404);
    }
    if (/openai\.com/.test(url)) {
      modelRequests.push(typeof init?.body === "string" ? init.body : "");
      return json({ error: { message: "a2i-routes stand-in: no model here", type: "invalid_request_error" } }, 400);
    }
    throw new Error(`a2i-routes: no network (${url})`);
  }) as typeof fetch;
}

type Route = (request: Request) => Promise<Response>;
type Case = {
  name: string;
  route: () => Promise<Route>;
  body: () => Record<string, unknown>;
  headers?: Record<string, string>;
  /** True when the response is the route's "not for you / switched off" answer. */
  off: (status: number, json: Record<string, unknown>, modelRequests: number) => boolean;
  /** For a tester the route is expected to get as far as the model (false where it may stop earlier for other reasons). */
  testerReachesModel: boolean;
};

async function call(route: Route, item: Case, token: string): Promise<{ status: number; json: Record<string, unknown>; model: string[] }> {
  modelRequests.length = 0;
  const response = await route(
    new Request(`http://localhost/api/${item.name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(item.headers ?? {}) },
      body: JSON.stringify(item.body()),
    }),
  );
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, json, model: [...modelRequests] };
}

const STORY = "My former partner and I separated in March. We have two children and need a parenting schedule and child support sorted out.";

async function behavioural(): Promise<void> {
  // A confirmed family case (the same construction as test:no-names-to-model).
  const { remainingEssentialQuestions, transitionReview } = await import("../../src/lib/case-system/intakeReview");
  const revision = "22222222-2222-4222-8222-222222222479";
  const intake = { yourName: "Person A", otherParty: "Person B", facts: STORY };
  const cp = { version: 1, flowId: CASE_ID, courtPath: "family", revision, inputRevision: revision, sections: { story: { text: STORY, location: { city: "Toronto", province: "Ontario" } }, builder: {} as Record<string, unknown> } };
  cp.sections.builder.initialUnknowns = remainingEssentialQuestions(cp as never).map((question) => question.id);
  confirmedMaster = { intakeCheckpoint: cp, workflowStatus: transitionReview(transitionReview({}, cp as never, "review", revision, "now"), cp as never, "confirm", revision, "now"), guidanceInputRevision: revision, intakeData: intake };
  const guided = { "x-courtsimplified-case-id": CASE_ID, "x-courtsimplified-input-revision": revision };

  const cases: Case[] = [
    {
      name: "case/strategy",
      route: async () => (await import("../../app/api/case/strategy/route")).POST as Route,
      body: () => ({ caseId: CASE_ID, courtPath: "family", story: STORY, side: "applicant" }),
      off: (_s, j) => j.skipped === "off",
      testerReachesModel: true,
    },
    {
      name: "case/read",
      route: async () => (await import("../../app/api/case/read/route")).POST as Route,
      body: () => ({ caseId: CASE_ID, saveOnServer: false }),
      off: (_s, j) => j.skipped === "off",
      testerReachesModel: true,
    },
    {
      name: "case/understand",
      route: async () => (await import("../../app/api/case/understand/route")).POST as Route,
      body: () => ({ story: STORY, city: "Toronto" }),
      off: (_s, j) => j.skipped === "off",
      testerReachesModel: true,
    },
    {
      name: "intake/sourced-questions",
      route: async () => (await import("../../app/api/intake/sourced-questions/route")).POST as Route,
      headers: guided,
      body: () => ({ story: STORY, courtPath: "family" }),
      off: (_s, j) => j.skipped === "off",
      testerReachesModel: true,
    },
    {
      name: "assistant/law",
      route: async () => (await import("../../app/api/assistant/law/route")).POST as Route,
      body: () => ({ question: "What do I need to file to ask for a parenting order?", courtPath: "family", caseId: CASE_ID }),
      off: (_s, j) => j.skipped === "off",
      testerReachesModel: true,
    },
    {
      name: "intake/tidy-wording",
      route: async () => (await import("../../app/api/intake/tidy-wording/route")).POST as Route,
      body: () => ({ fields: [{ key: "facts", text: "we seperated in march and the childen live with me" }] }),
      off: (s) => s === 503,
      testerReachesModel: true,
    },
    {
      name: "law/explain",
      route: async () => (await import("../../app/api/law/explain/route")).POST as Route,
      body: () => ({ id: "corpus:a2i-routes-no-such-provision:1" }),
      off: (s) => s === 503,
      testerReachesModel: false, // an unknown provision: the tester gets "not found", past the switch
    },
    {
      name: "case/review",
      route: async () => (await import("../../app/api/case/review/route")).POST as Route,
      body: () => ({ caseId: CASE_ID }),
      // The code-written checks answer everyone; only whether the model ran differs.
      off: (_s, j, model) => (j.result as { aiRan?: boolean } | undefined)?.aiRan === false && model === 0,
      testerReachesModel: true,
    },
    {
      name: "generate-form",
      route: async () => (await import("../../app/api/generate-form/route")).POST as Route,
      body: () => ({ caseId: CASE_ID }),
      off: (s, j) => s === 503 && j.paused === true,
      testerReachesModel: false, // form filling is code, not a model
    },
    {
      name: "workspace/documents/analyse",
      route: async () => (await import("../../app/api/workspace/documents/analyse/route")).POST as Route,
      body: () => ({ caseId: CASE_ID, documentId: "33333333-3333-4333-8333-333333333479" }),
      off: (_s, j) => j.enabled === false,
      testerReachesModel: false, // the stand-in holds no document
    },
    {
      name: "workspace/documents/decision-help",
      route: async () => (await import("../../app/api/workspace/documents/decision-help/route")).POST as Route,
      body: () => ({ caseId: CASE_ID, documentId: "33333333-3333-4333-8333-333333333479" }),
      off: (_s, j) => j.enabled === false,
      testerReachesModel: false,
    },
  ];

  for (const item of cases) {
    let route: Route;
    try {
      route = await item.route();
    } catch (error) {
      check(`${item.name}: route loads`, false, String(error));
      continue;
    }
    const other = await call(route, item, "other-token");
    check(
      `${item.name}: on production, an unlisted signed-in user gets the off answer and nothing reaches the model`,
      item.off(other.status, other.json, other.model.length) && other.model.length === 0,
      `status ${other.status}, ${JSON.stringify(other.json).slice(0, 160)}, model requests ${other.model.length}`,
    );
    const tester = await call(route, item, "tester-token");
    check(
      `${item.name}: on production, a listed tester gets past the switch${item.testerReachesModel ? " to the model" : ""}`,
      !item.off(tester.status, tester.json, tester.model.length) && (!item.testerReachesModel || tester.model.length > 0),
      `status ${tester.status}, ${JSON.stringify(tester.json).slice(0, 160)}, model requests ${tester.model.length}`,
    );
  }

  // The safety pass: the criteria it asks the model to apply follow the person.
  const safety = (await import("../../app/api/intake/safety-check/route")).POST as Route;
  const safetyCase: Case = { name: "intake/safety-check", route: async () => safety, body: () => ({ storyText: STORY }), off: () => false, testerReachesModel: true };
  const promptFor = async (token: string) => (await call(safety, safetyCase, token)).model.join("\n");
  const otherPrompt = await promptFor("other-token");
  const testerPrompt = await promptFor("tester-token");
  const savedEnv = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "preview";
  const previewPrompt = await promptFor("other-token");
  process.env.VERCEL_ENV = savedEnv;
  check("intake/safety-check: on production a listed tester's safety pass uses the same criteria as a preview", testerPrompt.length > 0 && testerPrompt === previewPrompt);
  check("intake/safety-check: on production an unlisted user's safety pass does not use the answer-legal-questions criteria", otherPrompt.length > 0 && otherPrompt !== testerPrompt);

  // /api/capabilities answers per person, booleans only.
  const capabilities = (await import("../../app/api/capabilities/route")).GET as Route;
  const ask = async (token: string | null) => {
    const response = await capabilities(new Request("http://localhost/api/capabilities", { headers: token ? { Authorization: `Bearer ${token}` } : {} }));
    return ((await response.json()) as { capabilities: Record<string, unknown> }).capabilities;
  };
  const [forTester, forOther, forNobody] = [await ask("tester-token"), await ask("other-token"), await ask(null)];
  const { OWNER_LIVE_TESTING } = await import("../../src/lib/case-system/policy/a2iScope");
  check("/api/capabilities: booleans only, nothing about who is listed", [forTester, forOther, forNobody].every((set) => Object.values(set).every((value) => typeof value === "boolean")) && !JSON.stringify(forTester).includes(TESTER));
  check("/api/capabilities: on production, everything gated is off for an unlisted user and for nobody", [forOther, forNobody].every((set) => !set.formCompletion && !set.strategy && !set.documentAnalysis && !set.checkedAnswers && !set.answerLegalQuestions));
  check("/api/capabilities: on production, a listed tester gets them", !OWNER_LIVE_TESTING.enabled || (forTester.formCompletion === true && forTester.answerLegalQuestions === true && forTester.strategy === true));
}

async function main(): Promise<void> {
  structural();

  // Production, with one listed tester; everything else stand-in and offline.
  Object.assign(process.env, {
    VERCEL_ENV: "production",
    A2I_TESTER_USER_IDS: TESTER,
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "a2i-routes-anon",
    OPENAI_API_KEY: "a2i-routes-not-a-key",
    AI_CALL_LOG: "off",
    AI_RATE_LIMITS: "local",
  });
  for (const name of ["NEXT_PUBLIC_VERCEL_ENV", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "GITHUB_SOURCE_REQUEST_TOKEN", "CANLII_API_KEY"]) delete process.env[name];
  installFakeNetwork();
  const silenced = console.error;
  console.error = () => undefined; // the routes log their refusals; the checks below say what matters
  try {
    await behavioural();
  } finally {
    console.error = silenced;
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  process.exit(failures ? 1 : 0);
}

void main();
