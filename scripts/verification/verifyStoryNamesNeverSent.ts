/**
 * A NAME THE STORY GIVES IN ANY WORDING BELOW NEVER REACHES OPENAI, THROUGH ANY AI ROUTE (site owner, 22 Nov 2026, (a3)).
 *
 * Only the wordings below are covered: a name written in a way the one name reader does not know is not found, and is
 * sent as typed (privacy/nameLabels.ts says so). This suite checks the listed wordings; it is not a promise about others.
 *
 * What failed: Chrome's signed-in Family run wrote "My spouse Test Partner and I separated...". The one name reader
 * (otherPartyNameFromStory, app/builder/_components/storyAnswers.ts) did not pick "Test Partner" out, so the label
 * layer (security/requestNames.ts) did not know it, and the one AI client sent it to OpenAI as typed. The same held
 * for "separated from my wife Jane Doe", "my ex Jane Doe", "my ex-wife Jane Doe", and every titled form ("my ex
 * Ms. Jane Doe" took "Ms" as the name and sent "Jane Doe").
 *
 * What this asserts, for every wording below:
 *  1. Every API route that can reach the AI client (found by walking the imports, as test:no-names-to-model does,
 *     so a new AI route is in this test the day it is added) is called through its REAL exported handler, once as
 *     a guest and once signed in with a saved, confirmed case whose story is the wording. The network is the only
 *     thing replaced: OpenAI is a stand-in that records the exact body of every outgoing request; Supabase answers
 *     with a made-up person and case. No listed name may appear in any recorded body.
 *  2. Signed in, at least one route must actually reach the stand-in for each wording (otherwise the check above
 *     would pass by sending nothing), and the suite reports how many routes reached it.
 *  3. For a wording that names the other side, the one story reader offers that name (a Yes / No / Not sure offer,
 *     never asked cold): the reader has no guest or signed-in input, so both get the same offer.
 *  4. Every name hidden before this change is still hidden (the "before" list).
 *  5. A guest reaches no AI on any route: every route, every wording, called as a guest, sends nothing to the model
 *     (site owner, 25 Nov 2026: a guest's story is read by the rule-based reader only).
 *
 * No real model call, no database, no network: a request to any other host throws.
 *
 * Run: npm run test:story-names-never-sent
 */

// The stand-in environment, set before anything is imported. None of these is a real key.
process.env.OPENAI_API_KEY = "stand-in-openai-key";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://stand-in.supabase.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "stand-in-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "stand-in-service-key";
process.env.AI_RATE_LIMITS = "off";

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

type Wording = { story: string; names: string[]; other?: string };

/** The wordings the owner listed (22 Nov 2026), each with and without commas. */
const NEW_WORDINGS: Wording[] = [
  { story: "My spouse Test Partner and I separated in March 2025. We have two children.", names: ["Test Partner"], other: "Test Partner" },
  { story: "My spouse, Test Partner, and I separated in March 2025. We have two children.", names: ["Test Partner"], other: "Test Partner" },
  { story: "I separated from my wife Quilla Marrowby last year and she kept the house.", names: ["Quilla Marrowby"], other: "Quilla Marrowby" },
  { story: "I separated from my wife, Quilla Marrowby, last year and she kept the house.", names: ["Quilla Marrowby"], other: "Quilla Marrowby" },
  { story: "I divorced from my husband Bertram Ollivane in 2023 and he stopped paying support.", names: ["Bertram Ollivane"], other: "Bertram Ollivane" },
  { story: "I left my partner, Corisande Pellow, in June and she has the children.", names: ["Corisande Pellow"], other: "Corisande Pellow" },
  { story: "I left my spouse Dagobert Fenwhistle after ten years.", names: ["Dagobert Fenwhistle"], other: "Dagobert Fenwhistle" },
  { story: "My ex Ottrin Vellacott kept the car and will not pay support.", names: ["Ottrin Vellacott"], other: "Ottrin Vellacott" },
  { story: "My ex, Ottrin Vellacott, kept the car and will not pay support.", names: ["Ottrin Vellacott"], other: "Ottrin Vellacott" },
  { story: "My ex-wife Ysolde Harrowgate moved to Ottawa with our son.", names: ["Ysolde Harrowgate"], other: "Ysolde Harrowgate" },
  { story: "My ex-husband Lucan Pethybridge stopped paying child support.", names: ["Lucan Pethybridge"], other: "Lucan Pethybridge" },
  { story: "My ex-partner, Merrion Quaintance, will not return my things.", names: ["Merrion Quaintance"], other: "Merrion Quaintance" },
  { story: "My ex Ms. Brisa Tannenholt kept the car.", names: ["Brisa Tannenholt"], other: "Brisa Tannenholt" },
  { story: "My ex, Ms. Brisa Tannenholt, kept the car.", names: ["Brisa Tannenholt"], other: "Brisa Tannenholt" },
  { story: "I separated from my wife Dr. Anwen Coldharbour in 2024.", names: ["Anwen Coldharbour"], other: "Anwen Coldharbour" },
  { story: "My spouse Mr. Fennick Oddsworth and I separated last spring.", names: ["Fennick Oddsworth"], other: "Fennick Oddsworth" },
  { story: "My partner Ianthe Scrope and I have a daughter together.", names: ["Ianthe Scrope"], other: "Ianthe Scrope" },
  { story: "My fiancé Jory Penhallow left in May and took our savings.", names: ["Jory Penhallow"], other: "Jory Penhallow" },
  { story: "My fiancée, Kerensa Polglaze, moved out in May.", names: ["Kerensa Polglaze"], other: "Kerensa Polglaze" },
  { story: "My girlfriend Lowenna Trethewey and I split up after the baby was born.", names: ["Lowenna Trethewey"], other: "Lowenna Trethewey" },
  { story: "My boyfriend, Morwen Chegwidden, will not let me see our son.", names: ["Morwen Chegwidden"], other: "Morwen Chegwidden" },
  { story: "My common-law partner Nectan Rosewarne and I lived together for six years.", names: ["Nectan Rosewarne"], other: "Nectan Rosewarne" },
  { story: "My common-law, Petroc Angwin, kept the dog.", names: ["Petroc Angwin"], other: "Petroc Angwin" },
  { story: "My child's father Rhydian Kellow has not paid support since January.", names: ["Rhydian Kellow"], other: "Rhydian Kellow" },
  { story: "My child's mother, Senara Bolitho, moved without telling me.", names: ["Senara Bolitho"], other: "Senara Bolitho" },
  { story: "My son Tegen Carlyon is seven and lives with me.", names: ["Tegen Carlyon"] },
  { story: "My daughter, Ula Pendarves, is four.", names: ["Ula Pendarves"] },
  { story: "My child Wenna Tremayne starts school in September.", names: ["Wenna Tremayne"] },
  { story: "My mother Yestin Bonython helps with pickups.", names: ["Yestin Bonython"] },
  { story: "My father, Zennor Kitto, lent me the money.", names: ["Zennor Kitto"] },
  { story: "My brother Aldous Pengelly saw what happened.", names: ["Aldous Pengelly"] },
  { story: "My sister, Briallen Trefusis, kept the receipts.", names: ["Briallen Trefusis"] },
  { story: "My landlord Caradoc Hendra kept my deposit of $1,800.", names: ["Caradoc Hendra"] },
  { story: "My boss, Delyth Nankervis, did not pay my last two weeks.", names: ["Delyth Nankervis"] },
  { story: "My employer Emrys Pascoe owes me $2,400 in wages.", names: ["Emrys Pascoe"] },
  { story: "My neighbour Ffion Trevaskis damaged my fence.", names: ["Ffion Trevaskis"] },
  { story: "My tenant, Gethin Rosevear, left owing three months of rent.", names: ["Gethin Rosevear"] },
  { story: "The contractor named Hywel Penrose took a $5,000 deposit and never came back.", names: ["Hywel Penrose"] },
  { story: "A roofer called Idris Trelawny did the work badly.", names: ["Idris Trelawny"] },
  { story: "My name is Jenifer Carthew and I want my deposit back from my landlord.", names: ["Jenifer Carthew"] },
  { story: "Last week Dr. Kenwyn Opie wrote a note about my injury.", names: ["Kenwyn Opie"] },
  { story: "I spoke to Ms. Locryn Tregear at the office about the unpaid invoice.", names: ["Locryn Tregear"] },
  { story: "I spoke to Mrs Morvoren Hocking, who said the cheque bounced.", names: ["Morvoren Hocking"] },
];

/** Wordings the reader already picked out before this change: still hidden after it. */
const BEFORE_WORDINGS: Wording[] = [
  { story: "My ex, Sarah Jones, kept the car.", names: ["Sarah Jones"], other: "Sarah Jones" },
  { story: "I left my husband, Mark Lee.", names: ["Mark Lee"], other: "Mark Lee" },
  { story: "My ex named Sarah took me to court.", names: ["Sarah"], other: "Sarah" },
  { story: "My ex's name is Nessa Quillfeather and she has the kids.", names: ["Nessa Quillfeather"], other: "Nessa Quillfeather" },
  { story: "Jordan Testfield and I lived together for five years.", names: ["Jordan Testfield"], other: "Jordan Testfield" },
  { story: "I married Sam Testmarsh in 2015.", names: ["Sam Testmarsh"], other: "Sam Testmarsh" },
  { story: "I have two kids with Chris Testdoe.", names: ["Chris Testdoe"], other: "Chris Testdoe" },
  { story: "My ex-husband, Orrin Blackwater, stopped paying.", names: ["Orrin Blackwater"], other: "Orrin Blackwater" },
];

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : ` -- ${detail}`}`);
  if (!ok) failures += 1;
}

/** Whether a body holds the name: the whole name, or any of its parts of three letters or more, as a word. */
function holdsName(body: string, name: string): string | null {
  const parts = [name, ...name.split(/\s+/).filter((part) => part.length >= 3)];
  // "Test Partner" (Chrome's exact name): its parts are ordinary words in the prompts, so only the whole name counts.
  const checked = name === "Test Partner" ? [name] : parts;
  return checked.find((part) => new RegExp(`(?<![\\p{L}])${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "u").test(body)) ?? null;
}

// ---- The network stand-in ------------------------------------------------------------------
const sent: string[] = [];
let currentStory = "";
let currentCourt = "family";
const CASE_ID = "11111111-1111-4111-8111-111111111533";
const REVISION = "22222222-2222-4222-8222-222222222533";
const USER = { id: "44444444-4444-4444-8444-444444444533", aud: "authenticated", role: "authenticated", email: "stand-in@example.test", app_metadata: {}, user_metadata: {}, created_at: "2026-11-22T00:00:00Z" };
let master: Record<string, unknown> = {};

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

/** A PostgREST select of the cases row: each column, including "alias:master_result->a->>b" JSON paths. */
function caseRow(select: string): Record<string, unknown> {
  const row: Record<string, unknown> = { id: CASE_ID, court_path: currentCourt, user_id: USER.id, master_result: master, title: "Stand-in case", created_at: "2026-11-22T00:00:00Z", updated_at: "2026-11-22T00:00:00Z" };
  if (select === "*" || !select) return row;
  const out: Record<string, unknown> = {};
  for (const column of select.split(",")) {
    const [alias, expression] = column.includes(":") ? column.split(":") : [column, column];
    const steps = expression.split(/(->>|->)/);
    let value: unknown = row[steps[0]];
    let asText = false;
    for (let i = 1; i < steps.length; i += 2) {
      asText = steps[i] === "->>";
      value = value && typeof value === "object" ? (value as Record<string, unknown>)[steps[i + 1]] : undefined;
    }
    out[alias.split(/(->>|->)/).pop()!] = value === undefined ? null : asText && value !== null ? String(value) : value;
  }
  return out;
}

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const bodyText = typeof init?.body === "string" ? init.body : input instanceof Request ? await input.clone().text() : init?.body ? String(init.body) : "";
  if (url.hostname === "api.openai.com") {
    sent.push(bodyText);
    if (url.pathname.endsWith("/embeddings")) return json({ object: "list", data: [{ object: "embedding", index: 0, embedding: Array(8).fill(0) }], model: "stand-in", usage: { prompt_tokens: 1, total_tokens: 1 } });
    if (url.pathname.endsWith("/responses")) return json({ id: "resp_stand_in", object: "response", status: "completed", output: [], output_text: "{}", usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } });
    return json({ id: "chatcmpl_stand_in", object: "chat.completion", created: 0, model: "gpt-stand-in", choices: [{ index: 0, message: { role: "assistant", content: "{}", refusal: null }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } });
  }
  if (url.hostname === "stand-in.supabase.test") {
    if (url.pathname === "/auth/v1/user") return json(USER);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    const single = (headers.get("accept") ?? "").includes("vnd.pgrst.object");
    // The decision a person marked (decision-help): its text is the story padded to a readable length.
    if (url.pathname === "/rest/v1/workspace_documents" && method === "GET") return json({ id: DOCUMENT_ID, case_id: CASE_ID, storage_path: "stand-in/decision.txt", mime: "text/plain", user_type: "court-decision" });
    if (url.pathname === "/rest/v1/workspace_document_text" && method === "GET") return json({ extracted_text: `${currentStory} ${"The court heard the matter and gave reasons. ".repeat(8)}` });
    if (url.pathname === "/rest/v1/ai_call_log" && (method === "GET" || method === "HEAD")) return new Response(method === "HEAD" ? null : "[]", { status: 200, headers: { "Content-Type": "application/json", "Content-Range": "*/0" } });
    if (url.pathname === "/rest/v1/cases" && method === "GET") {
      const row = caseRow(url.searchParams.get("select") ?? "*");
      return single ? json(row) : json([row]);
    }
    if (method === "GET" || method === "HEAD") return single ? json(null, 406) : json([]);
    return single ? json({}) : json([], 201);
  }
  throw new Error(`stand-in network: no request may leave this test (${url.hostname})`);
}) as typeof fetch;
void realFetch;

// ---- The routes ----------------------------------------------------------------------------
const root = path.resolve(import.meta.dirname, "..", "..");
function aiRoutes(): string[] {
  const resolveFrom = (from: string, spec: string): string | null => {
    const base = spec.startsWith("@/") ? path.join(root, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null;
    if (!base) return null;
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    return null;
  };
  const reaches = new Map<string, boolean>();
  const reachesModel = (file: string, seen = new Set<string>()): boolean => {
    if (reaches.has(file)) return reaches.get(file)!;
    if (seen.has(file)) return false;
    seen.add(file);
    if (file.endsWith(path.join("case-system", "openaiClient.ts"))) return true;
    const text = fs.readFileSync(file, "utf8");
    const found = [...text.matchAll(/(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)].some((match) => {
      const target = resolveFrom(file, match[1] ?? match[2]);
      return target ? reachesModel(target, seen) : false;
    });
    reaches.set(file, found);
    return found;
  };
  const routes: string[] = [];
  const walk = (dir: string) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else if (entry.name === "route.ts") routes.push(full); } };
  walk(path.join(root, "app", "api"));
  return routes.filter((file) => reachesModel(file)).sort();
}

/** The court a route's gate holds it to, else Family (the wordings are mostly Family's). */
function courtFor(route: string): string {
  if (route.includes(`small-claims${path.sep}`)) return "small-claims";
  if (route.includes(`civil${path.sep}`)) return "civil";
  return "family";
}

const DOCUMENT_ID = "33333333-3333-4333-8333-333333333533";
let FAMILY_STAGE = "";
let CLAIM_TYPE = "";

/**
 * The body each route takes, built from its own checks, carrying the story in the field it reads the person's words
 * from. A route with no field for them reads the saved case's story (case/read, review, decision-help).
 */
function bodyFor(route: string, story: string, court: string): Record<string, unknown> {
  const blankSmall = Object.fromEntries(["yourName", "yourAddress", "yourCity", "yourProvince", "yourPostalCode", "yourPhone", "yourEmail", "otherParty", "otherPartyPhone", "otherPartyEmail", "yourRole", "courtLocation", "claimNumber", "amountClaimed", "defendantAddress", "agreementDetails", "paymentHistory", "damagesBreakdown", "serviceDetails", "deadlineDetails", "timeline", "evidence", "missingEvidence", "settlementEfforts", "defenceResponse", "goal"].map((field) => [field, ""]));
  const blankCivil = Object.fromEntries(["yourName", "otherParty", "courtLocation", "courtFileNumber", "amountClaimed", "limitationDeadline", "timeline", "evidence", "missingEvidence", "damagesBreakdown", "legalRemedy", "settlementEfforts", "serviceDetails", "humanRightsGrounds", "discriminationFacts", "accommodationRequests", "governmentActor", "publicDecisionOrConduct", "institutionalFacts", "privacyRecordsFacts"].map((field) => [field, ""]));
  const side = court === "family" ? "applicant" : "plaintiff";
  switch (route) {
    case "app/api/assistant/law/route.ts": return { question: "What happens next in my case?", story, courtPath: court, side, caseId: CASE_ID };
    case "app/api/case/read/route.ts": return { caseId: CASE_ID };
    case "app/api/case/stage-answer/route.ts": return { stageId: FAMILY_STAGE, courtPath: court, confirmedFacts: { facts: story }, dateAnswers: {} };
    case "app/api/case/strategy/route.ts": return { story, courtPath: court, side, caseId: CASE_ID };
    case "app/api/case/understand/route.ts": return { story, city: "Toronto", chosenCourt: court, situation: { side: "starting", filed: false } };
    case "app/api/civil/analyze/route.ts": return { input: { ...blankCivil, caseId: CASE_ID, caseStage: "starting-case", yourRole: "plaintiff", issues: ["debt"], documents: ["nothing"], uploadedEvidenceFiles: [], facts: story, urgent: "" } };
    case "app/api/family/analyze/route.ts": return { input: { caseStage: "starting-case", facts: story } };
    case "app/api/small-claims/analyze/route.ts": return { input: { ...blankSmall, caseStage: "starting-case", issues: ["loan-or-debt"], filedDocuments: ["nothing"], uploadedEvidenceFiles: [], facts: story, urgent: "" }, caseId: CASE_ID };
    case "app/api/intake/classify-claim-type/route.ts": return { storyText: story, facts: {}, action: "reject", claimTypeId: CLAIM_TYPE, courtArea: "small-claims" };
    case "app/api/intake/depth-turn/route.ts": return { claimTypeId: CLAIM_TYPE, userTexts: [story], slotValues: {}, stateMap: {}, facts: {}, answerText: story };
    case "app/api/intake/guided-turn/route.ts": return { facts: {}, answeredIds: [], newStoryText: story, courtArea: "small-claims" };
    case "app/api/intake/safety-check/route.ts": return { storyText: story };
    case "app/api/intake/sourced-questions/route.ts": return { story, courtPath: court, side };
    case "app/api/intake/tidy-wording/route.ts": return { fields: [{ key: "facts", text: story }] };
    // Official text only: the plain explanation of one provision, by its id. It carries no person's words.
    case "app/api/law/explain/route.ts": return { id: "corpus:stand-in:1" };
    case "app/api/workspace/documents/decision-help/route.ts": return { documentId: DOCUMENT_ID };
    // resolve-stage, review, classify-court-path: the story in every field they read.
    default: return { caseId: CASE_ID, courtPath: court, caseContext: story, story, facts: story, storyText: story, confirmedFacts: { facts: story }, dateAnswers: {} };
  }
}

/**
 * Routes declared as making no model call with a person's words, each with its reason. Each must make no call here:
 * one that starts calling the model fails the "declared" check, so its entry is deleted and the leak check covers it.
 */
const NO_PERSON_TEXT = new Map<string, string>([
  ["app/api/law/explain/route.ts", "the plain explanation of one provision, by its corpus id: official text only, no person's words"],
  ["app/api/case/stage-answer/route.ts", "renders the stage map's answer with no model call; it reaches the AI client only through an import (crisis messages -> safety pass)"],
]);

async function savedMaster(story: string, court: string): Promise<Record<string, unknown>> {
  const { transitionReview, remainingEssentialQuestions } = await import("../../src/lib/case-system/intakeReview");
  const cp = { version: 1, flowId: CASE_ID, courtPath: court, revision: REVISION, inputRevision: REVISION, sections: { story: { text: story, location: { city: "Toronto", province: "Ontario" } }, builder: {} as Record<string, unknown>, [court === "small-claims" ? "smallClaims" : court]: {} } };
  // "I do not know yet" on each question still to answer, as a real confirmed case holds (test:no-names-to-model's setup).
  cp.sections.builder.initialUnknowns = remainingEssentialQuestions(cp as never).map((question) => question.id);
  return { intakeCheckpoint: cp, workflowStatus: transitionReview(transitionReview({}, cp as never, "review", REVISION, "now"), cp as never, "confirm", REVISION, "now"), guidanceInputRevision: REVISION, intakeData: { facts: story } };
}

type Handler = (request: Request) => Promise<Response>;

async function callRoute(route: string, handler: Handler, story: string, court: string, signedIn: boolean): Promise<number> {
  const headers: Record<string, string> = { "Content-Type": "application/json", "x-courtsimplified-input-revision": REVISION, "x-courtsimplified-case-id": CASE_ID };
  if (signedIn) headers.Authorization = "Bearer stand-in-access-token";
  const request = new Request(`http://localhost/api/stand-in?caseId=${CASE_ID}`, { method: "POST", headers, body: JSON.stringify(bodyFor(route, story, court)) });
  // Next's own request type: the routes read only what a Request has, and nextUrl.
  Object.defineProperty(request, "nextUrl", { value: new URL(request.url) });
  try {
    const response = await Promise.race([handler(request), new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("timeout")), 20000))]);
    if (process.env.NAMES_DEBUG) console.log(`    ${signedIn ? "signed in" : "guest"} ${response.status} ${(await response.clone().text()).slice(0, 160)}`);
    return response.status;
  } catch (error) { if (process.env.NAMES_DEBUG) console.log(`    threw ${String(error).slice(0, 200)}`); return -1; }
}

(async () => {
  const { withAiAskerForTests } = await import("../../src/lib/security/aiSpendLimit");
  const { stagesForPathway, isSpecialStage } = await import("../../src/lib/case-system/stage-map/stageMap");
  FAMILY_STAGE = stagesForPathway("family").find((stage) => !isSpecialStage(stage.id))!.id;
  const { CLAIM_TYPES } = await import("../../src/lib/case-system/intake/claimTypes");
  CLAIM_TYPE = CLAIM_TYPES[0].id;
  const routes = aiRoutes();
  console.log(`AI routes found: ${routes.length}`);
  const handlers: { name: string; handler: Handler; court: string }[] = [];
  for (const file of routes) {
    const name = path.relative(root, file).split(path.sep).join("/");
    const mod = (await import(pathToFileURL(file).href)) as { POST?: Handler };
    if (!mod.POST) { check(`${name}: has a POST handler to call`, false); continue; }
    handlers.push({ name, handler: mod.POST, court: courtFor(file) });
  }

  const reachedBy = new Map<string, number>();
  /** Routes that reached the model for a GUEST (site owner, 25 Nov 2026: a guest's story is read by the rule-based reader only). */
  const guestReached = new Set<string>();
  let guestCalls = 0;
  const leaks: string[] = [];
  const unreachedWordings: string[] = [];
  /** Per wording: the routes that sent a listed name, guest and signed in (the report's before / after table). */
  const leakTable: { story: string; guest: Set<string>; signedIn: Set<string> }[] = [];
  for (const wording of process.env.NAMES_DEBUG ? NEW_WORDINGS.slice(0, 1) : [...NEW_WORDINGS, ...BEFORE_WORDINGS]) {
    let reachedThis = 0;
    const row = { story: wording.story, guest: new Set<string>(), signedIn: new Set<string>() };
    leakTable.push(row);
    for (const { name, handler, court } of handlers) {
      if (process.env.NAMES_DEBUG) console.log(`  ${name}`);
      for (const signedIn of [false, true]) {
        currentStory = wording.story;
        currentCourt = court;
        master = await savedMaster(wording.story, court);
        sent.length = 0;
        await withAiAskerForTests({ userId: signedIn ? USER.id : null, visitor: "stand-in-visitor" } as never, () => callRoute(name, handler, wording.story, court, signedIn));
        if (!signedIn) { guestCalls += 1; if (sent.length) guestReached.add(name); }
        if (sent.length) { reachedThis += 1; reachedBy.set(name, (reachedBy.get(name) ?? 0) + 1); }
        for (const body of sent) for (const person of wording.names) {
          const found = holdsName(body, person);
          if (found) (signedIn ? row.signedIn : row.guest).add(`${name.slice("app/api/".length, -"/route.ts".length)} ("${found}")`);
          if (found) leaks.push(`${signedIn ? "signed in" : "guest"} ${name}: "${found}" sent for "${wording.story}"`);
        }
      }
    }
    if (!reachedThis) unreachedWordings.push(wording.story);
  }
  console.log(`Routes that reached the OpenAI stand-in: ${reachedBy.size} of ${handlers.length}`);
  for (const { name } of handlers) console.log(`  ${reachedBy.has(name) ? "reached " : "no call "} ${name}`);
  const silent = handlers.filter(({ name }) => !reachedBy.has(name) && !NO_PERSON_TEXT.has(name)).map(({ name }) => name);
  check("Every AI route that carries a person's words reached the stand-in (each route is tested, not passed by sending nothing)", silent.length === 0, silent.join(", "));
  const declaredButCalling = [...NO_PERSON_TEXT.keys()].filter((name) => reachedBy.has(name));
  check("A route declared as making no model call makes none (else delete its entry: the leak check covers it)", declaredButCalling.length === 0, declaredButCalling.join(", "));
  for (const [name, reason] of NO_PERSON_TEXT) console.log(`  declared, no model call: ${name} (${reason})`);
  // A guest never reaches the AI, on any route (site owner, 25 Nov 2026: guests use the rule-based reader; the minimal guest
  // page gives them one description and no AI step). Measured on every AI route, every wording, as a guest.
  check(`A guest reaches no AI on any route (${guestCalls} guest calls)`, guestCalls > 0 && guestReached.size === 0, [...guestReached].join(", "));
  check("At least one route reached the stand-in for every wording (the check below is not passing by sending nothing)", unreachedWordings.length === 0, unreachedWordings.join(" | "));
  console.log("\nPer wording: routes that sent a listed name (guest | signed in)");
  for (const row of leakTable) console.log(`  ${row.guest.size} | ${row.signedIn.size}  ${row.story}${row.signedIn.size ? `  -> ${[...row.signedIn].slice(0, 3).join(", ")}${row.signedIn.size > 3 ? ", ..." : ""}` : ""}`);
  check("No name typed in the story appears in any body sent to OpenAI, guest or signed in, on any route", leaks.length === 0, `${leaks.length} leak(s):\n    ${[...new Set(leaks)].slice(0, 60).join("\n    ")}`);

  // The offer: the one story reader picks the other side's name out, with no guest or signed-in input.
  const { readStoryFacts } = await import("../../src/lib/case-system/caseFile/storyReader");
  for (const wording of [...NEW_WORDINGS, ...BEFORE_WORDINGS].filter((item) => item.other)) {
    const offered = readStoryFacts({ story: wording.story, court: "family" }).otherParty?.value;
    check(`Offered once from the story (guest and signed in alike): "${wording.story}" -> ${wording.other}`, offered === wording.other, String(offered));
  }
  // A word that is not a name is never offered as one (titles, pronouns, months).
  for (const story of ["My ex Mr. kept the car.", "my husband Is abusive", "My ex Then left in June.", "My spouse March was when we split."]) {
    const offered = readStoryFacts({ story, court: "family" }).otherParty?.value;
    check(`Not a name, not offered: "${story}"`, offered === undefined, String(offered));
  }

  console.log(failures ? `\n${failures} failure(s).` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
})().catch((error) => {
  console.error("verifyStoryNamesNeverSent threw:", error instanceof Error ? error.stack : error);
  process.exit(1);
});
