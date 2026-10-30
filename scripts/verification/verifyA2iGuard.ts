/**
 * The A2I guard: each of the 13 statements the site makes in its application
 * to the Law Society of Ontario's Access to Innovation (A2I) sandbox, as
 * checks that fail when the site breaks the statement.
 *
 *   npm run test:a2i-guard
 *
 * WHAT IT CHECKS. For every statement (a)-(m), one or more named checks
 * ("A2I-f-lowercase-name") that run the REAL code: the switch functions with a
 * production environment ({ VERCEL_ENV: "production" } and no feature
 * switches, which is what Vercel production sets, verified 2026-10-29), the
 * one AI client wrapper with a fake transport (so the exact request body that
 * would leave for OpenAI is captured), the name labelling on synthetic
 * stories, the proposal filter, the court-path rules, the audit log through
 * its test seam. No model, network or database call. A few properties live
 * only in a screen's source (a label, a button, where a panel is rendered);
 * those are source checks and each says why.
 *
 * Every check runs TWICE: as the code stands, and with
 * OWNER_LIVE_TESTING.enabled set to false at runtime (restored afterwards),
 * so the table shows what switching the owner's live-testing mode off would
 * and would not fix.
 *
 * A property the code cannot show at all (what the production database holds,
 * whether a person reviewed the question bank) is a check that says "not
 * checkable from code: <why>" and counts as FAILING-UNVERIFIABLE. It never
 * passes.
 *
 * GREEN WHILE EVERY FAILURE IS LISTED. scripts/verification/a2iGuardKnown.ts
 * lists every check that fails today, with the reason and the file:line cause.
 * The suite exits 1 on a failure that is not listed, on a listed check that
 * now passes ("fixed: delete its entry"), and on a listed name that no longer
 * runs. Same pattern as verifyChrome29octSafety.ts.
 *
 * SELF-TESTS. Each check that passes today has a self-test that feeds the
 * check's own predicate a synthetic bad input and requires it to be rejected,
 * so a passing check is shown to be able to fail. Checks that fail today are
 * proven by failing.
 *
 * What failure it exists to catch: a change that makes any of the 13 A2I
 * statements false (or falser), and a fix that lands without the list being
 * updated.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { OWNER_LIVE_TESTING, isInScope } from "../../src/lib/case-system/policy/a2iScope";
import {
  FORM_COMPLETION_PAUSED,
  aiAnalysisTextToUsers,
  caseUnderstandingEnabled,
  checkedAnswersEnabled,
  plainExplanationsEnabled,
  sourcedQuestionsEnabled,
  strategyEnabled,
} from "../../src/lib/content-library/phaseScope";
import { documentAnalysisEnabled, ZDR_CONFIRMED_AT } from "../../src/lib/case-workspace/aiAnalysis";
import { runCaseReview } from "../../src/lib/case-system/caseReview/runCaseReview";
import type { ConfirmedCaseFile } from "../../src/lib/case-system/caseReview/caseReview";
import { validateStoryProposals } from "../../src/lib/case-system/intake/storyAnswerProposals";
import { QUESTION_BANK, type IntakeQuestion } from "../../src/lib/case-system/intake/questionBank";
import { createOpenAIClient, forceNoStore } from "../../src/lib/case-system/openaiClient";
import { resolveTier } from "../../src/lib/case-system/aiModels";
import { knownNameLabels } from "../../src/lib/case-system/privacy/nameLabels";
import { withNameLabelsFor } from "../../src/lib/case-system/privacy/modelNameContext";
import { setAiCallLogClientFactory, withAiCallContext } from "../../src/lib/audit/aiCallLog";
import { parseUnderstanding, withFixedRegime } from "../../src/lib/case-system/understanding/understandCase";
import { checkedDecisionHelp } from "../../src/lib/case-workspace/courtDecision";
import { scanForPersonalData } from "../../src/lib/case-workspace/personalDataScan";
import { applyFixedRegime, coerceModelPayload, type CourtPathClassification } from "../../src/lib/case-system/intelligence/courtPathClassifier";
import { fixedRegimeFor } from "../../src/lib/case-system/intelligence/fixedRegimes";
import { A2I_GUARD_KNOWN } from "./a2iGuardKnown";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

/** Vercel production, as it is configured: VERCEL_ENV and no feature switch (verified 2026-10-29). */
const PRODUCTION: Record<string, string | undefined> = { VERCEL_ENV: "production" };

type Letter = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m";
type Result = { ok: boolean; detail: string; unverifiable?: boolean };
type Check = { name: string; letter: Letter; run: () => Result | Promise<Result> };

const STATEMENTS: Record<Letter, string> = {
  a: "AI never writes legal content that reaches a user",
  b: "Court-form drafting is switched off",
  c: "Case review is not offered today",
  d: "Production stores no user data",
  e: "Remaining questions come only from a fixed, reviewed set",
  f: "Names are never sent to the AI",
  g: "Every AI request and response is logged in Canada for 90 days",
  h: "A legal-content filter blocks conclusions and unknown citations",
  i: "AI label, report button, AI notice at sign-up",
  j: "Privileged/sealed scan before AI; document analysis off",
  k: "Models pinned, storage off, Canadian residency",
  l: "Court path is rules-based; AI picks from a fixed list",
  m: "Story proposals show exact words; others discarded",
};

const checks: Check[] = [];
const add = (letter: Letter, name: string, run: Check["run"]) => checks.push({ letter, name: `A2I-${letter}-${name}`, run });
const unverifiable = (why: string): Result => ({ ok: false, unverifiable: true, detail: `not checkable from code: ${why}` });

// ---------------------------------------------------------------------------
// Shared predicates. Each check below and its self-test use the same function.
// ---------------------------------------------------------------------------

/** A switch is off in production. */
const isOff = (enabled: boolean) => !enabled;

/** Every term absent (case-insensitive) from what was sent. */
function leaked(bodies: unknown[], terms: readonly string[]): string[] {
  const sent = JSON.stringify(bodies).toLowerCase();
  return terms.filter((term) => sent.includes(term.toLowerCase()));
}

/** Every body the client handed to the transport carries store:false. */
const everyBodyStoreFalse = (bodies: Record<string, unknown>[]) => bodies.length > 0 && bodies.every((body) => body.store === false);

/** A dated snapshot id (OpenAI's form: name-YYYY-MM-DD), not a moving alias. */
const isPinnedModelId = (model: string) => /-\d{4}-\d{2}-\d{2}$/.test(model.trim());

/** The endpoint is not OpenAI's default (United States) one. */
const isNonDefaultEndpoint = (baseURL: string) => !/^https:\/\/api\.openai\.com(\/|$)/i.test(baseURL.trim());

/** Every kept proposal's quote is the person's own words (the filter's normalisation). */
const norm = (text: string) => text.toLowerCase().replace(/[‘’“”]/g, "'").replace(/["]/g, "'").replace(/\s+/g, " ").trim();
const proposalsFromStory = (proposals: { storyQuote: string }[], story: string) =>
  proposals.every((proposal) => norm(story).includes(norm(proposal.storyQuote)));

/** A court-path answer is one of the fixed values. */
const FIXED_PATHS = new Set(["family", "small-claims", "civil", "mixed", "unknown", "out-of-scope"]);
const inFixedList = (path: string) => FIXED_PATHS.has(path);
const FIXED_COURTS = new Set(["small-claims", "civil", "family", "tribunal", "outside-ontario", "unclear"]);

/** A Supabase region is in Canada. */
const isCanadianRegion = (region: string) => /^ca-/.test(region);

/** A JSX element is preceded (within its condition) by a scope switch. */
function renderedBehindSwitch(source: string, element: string, gate: RegExp): { ok: boolean; ungated: number } {
  let ungated = 0;
  let total = 0;
  for (const match of source.matchAll(new RegExp(`<${element}\\b`, "g"))) {
    total++;
    const before = source.slice(Math.max(0, (match.index ?? 0) - 300), match.index);
    if (!gate.test(before)) ungated++;
  }
  return { ok: total > 0 && ungated === 0, ungated };
}
const CASE_REVIEW_GATE = /isInScope\(\s*["']caseReviewGaps["']\s*\)|caseReview\w*Enabled/;

/** A file contains a "report a problem" control. */
const hasReportControl = (source: string) => /report (?:a |this )?(?:problem|issue|mistake)|<Report\w*/i.test(source);
/** A file carries the "AI suggestion" label (or a shared label component). */
const hasAiLabel = (source: string) => /AI suggestion|<AiSuggestionLabel|<AiLabel/.test(source);

// ---------------------------------------------------------------------------
// The fake transport: the real wrapper (forceNoStore) around a client that
// records each body instead of sending it.
// ---------------------------------------------------------------------------

function recordingClient(reply: string = '{"ok":true}') {
  const bodies: Record<string, unknown>[] = [];
  const answer = async (body: Record<string, unknown>) => {
    bodies.push(body);
    return { model: String(body.model), choices: [{ message: { content: reply } }] };
  };
  const client = forceNoStore({
    chat: { completions: { create: answer, parse: answer } },
    responses: { create: answer },
    embeddings: { create: async (body: Record<string, unknown>) => (bodies.push(body), { data: [] }) },
  });
  return { client, bodies };
}

async function sendStory(story: string, intake: Record<string, unknown>) {
  const { client, bodies } = recordingClient();
  const labels = knownNameLabels(intake);
  await withNameLabelsFor(labels, async () => {
    await client.chat.completions.create({ model: "gpt-6.1-sol", messages: [{ role: "user", content: story }] } as never);
  });
  return bodies;
}

const INTAKE = { yourName: "Sarah Jones", otherParty: "Mark Peters" };

// ---------------------------------------------------------------------------
// (a) AI never writes legal content that reaches a user.
// The switches that put model-written text in front of a person. Each must be
// off in production (code defaults + VERCEL_ENV=production).
// ---------------------------------------------------------------------------
add("a", "analysis-text-off", () => ({ ok: isOff(aiAnalysisTextToUsers(PRODUCTION)), detail: "aiAnalysisTextToUsers(production) is off (model-written analysis sentences not shown)" }));
add("a", "checked-answers-off", () => ({ ok: isOff(checkedAnswersEnabled(PRODUCTION)), detail: "checkedAnswersEnabled(production) is off (model-drafted legal statements)" }));
add("a", "plain-explanations-off", () => ({ ok: isOff(plainExplanationsEnabled(PRODUCTION)), detail: "plainExplanationsEnabled(production) is off (AI-written explanation of a provision)" }));
add("a", "case-understanding-off", () => ({ ok: isOff(caseUnderstandingEnabled(PRODUCTION)), detail: "caseUnderstandingEnabled(production) is off (AI summary and 'where it stands')" }));
add("a", "strategy-off", () => ({ ok: isOff(strategyEnabled(PRODUCTION)), detail: "strategyEnabled(production) is off" }));
add("a", "decision-help-off", () => ({ ok: isOff(documentAnalysisEnabled(PRODUCTION)), detail: "documentAnalysisEnabled(production) is off (decision help writes a free explanation of a decision)" }));

// ---------------------------------------------------------------------------
// (b) Court-form drafting is switched off.
// COURT_DOCUMENT_DRAFTING_ENABLED is a constant computed at import from
// isInScope("formCompletion"), so a runtime switch of OWNER_LIVE_TESTING
// cannot reach it; the check calls isInScope itself (what the constant is).
// ---------------------------------------------------------------------------
add("b", "form-filling-paused", () => ({ ok: (FORM_COMPLETION_PAUSED as boolean) === true, detail: "FORM_COMPLETION_PAUSED is true (/api/generate-form refuses, /forms shows the paused notice)" }));
add("b", "drafting-scope-off", () => ({ ok: isOff(isInScope("formCompletion")), detail: "isInScope(\"formCompletion\") is off (claim / responding drafts)" }));

// ---------------------------------------------------------------------------
// (c) Case review is not offered.
// ---------------------------------------------------------------------------
const CASE_FILE: ConfirmedCaseFile = {
  courtPath: "small-claims", role: "Plaintiff / claimant", stage: "starting-case",
  story: "I lent my neighbour $1,200 in March and he has not paid it back.", yourName: "", otherParty: "",
  otherPartyAddress: "", amountText: "$1,200", timelineText: "", evidenceText: "", goalText: "", claimTypeId: null, filedDocuments: [],
};
add("c", "ai-review-off", async () => {
  let located = false;
  const result = await runCaseReview(CASE_FILE, "test-key-not-real", async () => ((located = true), []));
  return { ok: !result.aiRan && !located, detail: "runCaseReview does not send the case to the model (aiRan false, locator not called)" };
});
// Source check: where a panel is rendered is only visible in the page source.
add("c", "panel-gated", () => {
  const pages = ["app/builder/page.tsx", "app/cases/[id]/page.tsx"];
  const ungated = pages.filter((page) => !renderedBehindSwitch(read(page), "CaseReviewPanel", CASE_REVIEW_GATE).ok);
  return { ok: ungated.length === 0, detail: `CaseReviewPanel rendered only behind a case-review switch (ungated in: ${ungated.join(", ") || "none"})` };
});

// ---------------------------------------------------------------------------
// (d) Production stores no user data.
// Source check: every file that writes a row or a file must refuse in
// production. Two writers are not user data, named with the reason.
// ---------------------------------------------------------------------------
const NOT_USER_DATA: Record<string, string> = {
  "app/admin/pdf-field-mapper/page.tsx": "maps PDF form fields for the catalogue (admin tool, no case data)",
  "src/lib/canlii/canliiServer.ts": "caches CanLII metadata answers (no case data)",
};
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir))) {
    const path = join(dir, entry);
    if (statSync(join(ROOT, path)).isDirectory()) sourceFiles(path, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(relative(ROOT, join(ROOT, path)).replace(/\\/g, "/"));
  }
  return out;
}
const writesData = (source: string) => /\.(insert|upsert|upload)\(/.test(source);
const refusesInProduction = (source: string) => /VERCEL_ENV[^\n]*production/.test(source);
add("d", "no-production-writes", () => {
  const writers = [...sourceFiles("app"), ...sourceFiles("src")].filter((file) => !NOT_USER_DATA[file] && writesData(read(file)));
  const unguarded = writers.filter((file) => !refusesInProduction(read(file)));
  return { ok: writers.length > 0 && unguarded.length === 0, detail: `every file that writes user data refuses on VERCEL_ENV=production (writes there: ${unguarded.join(", ")})` };
});
add("d", "production-contents", () =>
  unverifiable("what the production database holds is a fact about the live project (a count(*) on fddlpnibovkkkgboabqb), not about the code; the repo's last record (docs/infra/projects.md, 26 Sep) is 2 accounts and 4 cases"));

// ---------------------------------------------------------------------------
// (e) Remaining questions come only from a fixed, reviewed set.
// ---------------------------------------------------------------------------
add("e", "sourced-questions-off", () => ({ ok: isOff(sourcedQuestionsEnabled(PRODUCTION)), detail: "sourcedQuestionsEnabled(production) is off (AI-written follow-up questions)" }));
const BANK_TEXT = new Set(QUESTION_BANK.map((question) => norm(question.text)));
const MODEL_QUESTION = "Did your neighbour ever sign anything when you handed him the money?";
add("e", "front-door-questions-fixed", () => {
  if (!caseUnderstandingEnabled(PRODUCTION)) return { ok: true, detail: "the front-door reading is off in production" };
  const parsed = parseUnderstanding(JSON.stringify({ summary: "You lent your neighbour $1,200.", questions: [{ question: MODEL_QUESTION }] }));
  const shown = parsed?.understanding.questions ?? [];
  const invented = shown.filter((question) => !BANK_TEXT.has(norm(question.question)));
  return { ok: invented.length === 0, detail: `the front-door reading shows only questions from QUESTION_BANK (model-written kept: ${JSON.stringify(invented.map((q) => q.question))})` };
});
add("e", "bank-reviewed", () =>
  unverifiable("whether a person reviewed the question bank is a fact about people; no review sign-off is recorded in the code, and AiUseNotice.tsx says the content has not been reviewed by a licensed lawyer or paralegal"));

// ---------------------------------------------------------------------------
// (f) Names are never sent to the AI. The real client wrapper, inside a
// route's name context, with a recording transport: what would leave.
// ---------------------------------------------------------------------------
add("f", "known-name", async () => {
  const bodies = await sendStory("My name is Sarah Jones. Mark Peters owes me $1,200 for the fence.", INTAKE);
  const found = leaked(bodies, ["Sarah", "Jones", "Mark Peters", "Peters"]);
  return { ok: found.length === 0, detail: `names from the name fields, typed as in the fields, are not sent (sent: ${found.join(", ") || "none"})` };
});
add("f", "lowercase-name", async () => {
  const bodies = await sendStory("i'm sarah jones and mark peters owes me $1,200 for the fence.", INTAKE);
  const found = leaked(bodies, ["sarah", "jones", "peters"]);
  return { ok: found.length === 0, detail: `a known name typed in lower case is not sent (sent: ${found.join(", ") || "none"})` };
});
add("f", "unknown-name", async () => {
  const bodies = await sendStory("Mark Peters owes me $1,200. My neighbour Priya Raman saw him take the tools.", INTAKE);
  const found = leaked(bodies, ["Priya", "Raman"]);
  return { ok: found.length === 0, detail: `a name typed in the story that is not in a name field (a witness) is not sent (sent: ${found.join(", ") || "none"})` };
});
const CONTACT: Record<string, { story: string; terms: string[] }> = {
  address: { story: "He lives at 42 Wellesley Street East, Toronto, ON M4Y 1H5.", terms: ["42 Wellesley", "M4Y 1H5"] },
  phone: { story: "You can reach me at 416-555-0199.", terms: ["416-555-0199"] },
  email: { story: "Write to me at sarah.example@example.com.", terms: ["sarah.example@example.com"] },
  "file-number": { story: "My court file number is SC-24-00001234-0000.", terms: ["SC-24-00001234"] },
};
for (const [kind, { story, terms }] of Object.entries(CONTACT)) {
  add("f", kind, async () => {
    const found = leaked(await sendStory(story, INTAKE), terms);
    return { ok: found.length === 0, detail: `a ${kind} typed in the story is removed before sending (sent: ${found.join(", ") || "none"})` };
  });
}

// ---------------------------------------------------------------------------
// (g) Every AI request and response is logged in Canada for 90 days.
// The audit log through its own seam (setAiCallLogClientFactory), with the
// database sink forced and a fake database: no connection is made.
// ---------------------------------------------------------------------------
async function loggedRows(work: (client: ReturnType<typeof recordingClient>["client"]) => Promise<unknown>) {
  const rows: Record<string, unknown>[] = [];
  const saved = { sink: process.env.AI_CALL_LOG, url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
  process.env.AI_CALL_LOG = "database";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://database.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "not-a-real-key";
  const restore = setAiCallLogClientFactory((() => ({
    from: () => ({ insert: (row: Record<string, unknown>) => (rows.push(row), Promise.resolve({ error: null })) }),
  })) as never);
  const originalError = console.error;
  console.error = () => {};
  try {
    const { client } = recordingClient('{"answer":"The deposit was returned on the fifth of March by the landlord."}');
    await work(client);
  } finally {
    console.error = originalError;
    restore();
    for (const [name, value] of [["AI_CALL_LOG", saved.sink], ["NEXT_PUBLIC_SUPABASE_URL", saved.url], ["SUPABASE_SERVICE_ROLE_KEY", saved.key]] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
  return rows;
}
const LOG_STORY = "My landlord kept my $900 deposit after I moved out of the basement flat.";
const call = (client: ReturnType<typeof recordingClient>["client"]) =>
  client.chat.completions.create({ model: "gpt-6.1-sol", messages: [{ role: "user", content: LOG_STORY }] } as never);
const rowsFor = (calls: number, rows: unknown[]) => rows.length === calls;
add("g", "logged-in-context", async () => {
  const rows = await loggedRows((client) => withAiCallContext({ callType: "safety-pass" }, () => call(client)));
  return { ok: rowsFor(1, rows), detail: `a call made inside a route's audit context writes one row (rows: ${rows.length})` };
});
add("g", "logged-outside-context", async () => {
  const rows = await loggedRows((client) => call(client));
  return { ok: rowsFor(1, rows), detail: `a call made outside withAiCallContext is still written down (rows: ${rows.length})` };
});
add("g", "full-request-response", async () => {
  const rows = await loggedRows((client) => withAiCallContext({ callType: "safety-pass" }, () => call(client)));
  const text = JSON.stringify(rows);
  const ok = rows.length === 1 && text.includes("kept my $900 deposit") && text.includes("returned on the fifth of March");
  return { ok, detail: "the logged row holds the request text and the response text (today: a hash and length of the request, a redacted reply)" };
});
add("g", "retention-90-days", () => {
  const migrations = readdirSync(join(ROOT, "supabase/migrations")).map((file) => read(`supabase/migrations/${file}`)).join("\n");
  const scheduled = /cron\.schedule\([\s\S]{0,400}prune_ai_call_log/i.test(migrations);
  const ninety = /prune_ai_call_log[\s\S]{0,400}(?:90\s*(?:days?|\*\s*interval\s*'1 day')|interval\s*'90 days')/i.test(migrations);
  return { ok: scheduled && ninety, detail: `a migration schedules prune_ai_call_log at 90 days (scheduled: ${scheduled}; 90 days: ${ninety})` };
});
// A record check: the log goes to NEXT_PUBLIC_SUPABASE_URL, which the repo
// records as the production ref; its region is recorded in environments.json.
add("g", "database-in-canada", () => {
  const environments = JSON.parse(read("supabase/environments.json")) as { environments: { production: { region: string } } };
  const region = environments.environments.production.region;
  return { ok: isCanadianRegion(region), detail: `the production database (where ai_call_log is written) is recorded in a Canadian region (${region})` };
});

// ---------------------------------------------------------------------------
// (h) A legal-content filter blocks legal conclusions and citations not in
// the library from AI text. Synthetic model output through the real filters.
// ---------------------------------------------------------------------------
const CONCLUSION = "He is liable to you for breach of contract.";
const CITATION = "Your case is just like Smith v. Jones, 2019 ONCA 123.";
add("h", "front-door-conclusion", () => {
  const parsed = parseUnderstanding(JSON.stringify({ summary: `You lent your neighbour $1,200 in March. ${CONCLUSION}` }));
  const kept = JSON.stringify(parsed?.understanding ?? {}).includes("liable");
  return { ok: !kept, detail: `the front-door reading drops a model-written legal conclusion ("${CONCLUSION}")` };
});
add("h", "front-door-citation", () => {
  const parsed = parseUnderstanding(JSON.stringify({ summary: `You lent your neighbour $1,200 in March. ${CITATION}` }));
  const kept = JSON.stringify(parsed?.understanding ?? {}).includes("ONCA");
  return { ok: !kept, detail: `the front-door reading drops a citation that is not in the library ("${CITATION}")` };
});
const DECISION = "The Landlord and Tenant Board in Ontario heard the application. The tenant paid a deposit. The Board ordered the landlord to pay the tenant.";
add("h", "decision-help-library", () => {
  const help = checkedDecisionHelp({ explanation: "The Board ordered the landlord to pay the tenant. In Ontario a landlord who keeps a deposit is always liable to give it back.", passages: [] }, DECISION);
  const kept = (help?.explanation ?? "").includes("always liable");
  return { ok: !kept, detail: "decision help drops a statement of law that is not in the library or the decision" };
});
// Source check: whether the counter has a caller is only visible in source.
add("h", "output-guard-counted", () => {
  const callers = [...sourceFiles("app"), ...sourceFiles("src")].filter((file) => file !== "src/lib/audit/aiCallLog.ts" && /recordOutputGuardBlock\(/.test(read(file)));
  return { ok: callers.length > 0, detail: "recordOutputGuardBlock (the blocked-output counter) has a caller" };
});

// ---------------------------------------------------------------------------
// (i) "AI suggestion" label, "report a problem" button, AI notice at sign-up.
// Source checks: these are words and controls on client screens, which this
// suite cannot render. Each screen that shows AI output must carry both.
// ---------------------------------------------------------------------------
const AI_SCREENS = [
  "app/_components/CaseUnderstandingCard.tsx",
  "app/builder/_components/CaseReviewPanel.tsx",
  "app/builder/_components/GuidedSmallClaimsIntake.tsx",
  "app/_components/ExplainProvision.tsx",
  "app/_components/StrategyPanel.tsx",
  "app/builder/_components/SourcedQuestions.tsx",
  "app/cases/_components/CourtDecisionPanel.tsx",
  "app/builder/_components/CourtAssistantChat.tsx",
  "app/builder/_components/IntelligenceOverviewPanel.tsx",
  "app/builder/_components/TidyWordingReview.tsx",
];
add("i", "ai-label", () => {
  const missing = AI_SCREENS.filter((file) => !hasAiLabel(read(file)));
  return { ok: missing.length === 0, detail: `every screen showing AI output carries the "AI suggestion" label (missing: ${missing.join(", ") || "none"})` };
});
add("i", "report-problem", () => {
  const missing = AI_SCREENS.filter((file) => !hasReportControl(read(file)));
  return { ok: missing.length === 0, detail: `every screen showing AI output has a "report a problem" control (missing: ${missing.length} of ${AI_SCREENS.length})` };
});
add("i", "notice-at-signup", () => {
  const login = read("app/login/page.tsx");
  const ok = /AiUseNotice|FirstUseAcknowledgement|\bAI\b|artificial intelligence/i.test(login);
  return { ok, detail: "the sign-up page (app/login/page.tsx) shows the AI notice" };
});

// ---------------------------------------------------------------------------
// (j) Documents scanned for privileged or sealed markers before AI; document
// analysis off. scanForPersonalData is the scan the extract route runs.
// ---------------------------------------------------------------------------
const MARKED = "PRIVILEGED AND CONFIDENTIAL - SOLICITOR-CLIENT COMMUNICATION\n\nSEALED BY ORDER OF THE COURT. Do not disclose.";
const flagsMarkers = (flags: readonly string[]) => flags.some((flag) => /privilege|sealed/i.test(flag));
add("j", "marker-scan", () => {
  const { flags } = scanForPersonalData(MARKED);
  return { ok: flagsMarkers(flags), detail: `the document scan flags privileged / sealed markers (flags: ${JSON.stringify(flags)})` };
});
add("j", "document-analysis-off", () => ({ ok: isOff(documentAnalysisEnabled(PRODUCTION)), detail: "documentAnalysisEnabled(production) is off" }));

// ---------------------------------------------------------------------------
// (k) Model versions pinned, storage off, data residency Canadian.
// ---------------------------------------------------------------------------
add("k", "model-pinned", () => {
  const models = (["deep", "standard"] as const).map((tier) => resolveTier(tier).model);
  return { ok: models.every(isPinnedModelId), detail: `both tiers resolve to a dated snapshot in production (got ${models.join(", ")})` };
});
add("k", "store-false", async () => {
  const { client, bodies } = recordingClient();
  await client.chat.completions.create({ model: "gpt-6.1-sol", store: true, messages: [{ role: "user", content: "x" }] } as never);
  await (client.chat.completions as unknown as { parse: (body: unknown) => Promise<unknown> }).parse({ model: "gpt-6.1-sol", store: true, messages: [] });
  await (client as unknown as { responses: { create: (body: unknown) => Promise<unknown> } }).responses.create({ model: "gpt-6.1-sol", store: true, input: "x" });
  return { ok: everyBodyStoreFalse(bodies) && bodies.length === 3, detail: "chat, parse and responses calls leave with store:false even when the caller asks for true" };
});
add("k", "zdr-confirmed", () => ({ ok: ZDR_CONFIRMED_AT !== null, detail: "OpenAI's zero data retention is confirmed (ZDR_CONFIRMED_AT set); store:false alone leaves abuse-monitoring retention" }));
add("k", "residency-endpoint", () => {
  const baseURL = String((createOpenAIClient("test-key-not-real") as unknown as { baseURL: string }).baseURL);
  return { ok: isNonDefaultEndpoint(baseURL), detail: `the client is pointed at a data-residency endpoint, not OpenAI's default (got ${baseURL})` };
});

// ---------------------------------------------------------------------------
// (l) Court path is rules-based, the AI choosing only from a fixed list.
// ---------------------------------------------------------------------------
const KEYWORD_RESULT: CourtPathClassification = {
  primaryPath: "small-claims", secondaryPath: null, outOfScopeForum: null, confidence: 0.6, reasoning: "", source: "ai", aiCalled: true, matters: [] as never,
};
add("l", "classifier-fixed-list", () => {
  const result = coerceModelPayload({ primaryPath: "criminal-court", confidence: 0.95, reasoning: "x" } as never, "unknown" as never, "He stole my bike.");
  return { ok: inFixedList(String(result.primaryPath)), detail: `the classifier keeps the model's court only if it is in the fixed list (got ${result.primaryPath})` };
});
add("l", "front-door-fixed-list", () => {
  const parsed = parseUnderstanding(JSON.stringify({ summary: "Someone stole your bike.", matters: [{ title: "Theft", court: "criminal-court" }] }));
  const court = String(parsed?.understanding.mainCourt);
  return { ok: FIXED_COURTS.has(court), detail: `the front-door reading's court is one of the fixed values (got ${court})` };
});
const LIEN_STORY = "I did renovation work on a house and was not paid $18,000, so I registered a construction lien on the property.";
const regimeWon = (result: { primaryPath?: string; mainCourt?: string; regime?: unknown }) =>
  (result.primaryPath ?? result.mainCourt) === "civil" && Boolean(result.regime);
add("l", "lien-rule-wins", () => {
  const classified = applyFixedRegime(KEYWORD_RESULT, LIEN_STORY);
  const parsed = parseUnderstanding(JSON.stringify({ summary: "You were not paid.", matters: [{ title: "Unpaid work", court: "small-claims" }] }))!;
  const understood = withFixedRegime(parsed.understanding, LIEN_STORY);
  return { ok: regimeWon(classified) && regimeWon(understood), detail: `a construction lien goes to the Superior Court over the model's answer (classifier ${classified.primaryPath}, front door ${understood.mainCourt})` };
});
add("l", "limit-rule-wins", () => {
  const classified = applyFixedRegime(KEYWORD_RESULT, "My contractor owes me $80,000 for a botched job.");
  return { ok: regimeWon(classified), detail: `a claim over $50,000 goes to the Superior Court over the model's answer (got ${classified.primaryPath})` };
});
add("l", "tenancy-rule-wins", () => {
  const regime = fixedRegimeFor("I rent an apartment and my landlord is trying to evict me for unpaid rent; I still live there.");
  return { ok: Boolean(regime) && /tenan|ltb|landlord/i.test(`${regime?.id} ${regime?.reasoning}`), detail: `a residential tenancy is a code rule that wins (fixedRegimeFor gave ${regime?.id ?? "null"}; the LTB is a keyword list inside the classifier)` };
});

// ---------------------------------------------------------------------------
// (m) Story proposals show the exact words and discard any not in the story.
// ---------------------------------------------------------------------------
const QUESTION = { id: "a2i-guard-what-happened", courtArea: "small-claims", text: "What did the other person agree to do?", answerType: "text" } as unknown as IntakeQuestion;
const PROPOSAL_STORY = "In March I lent my neighbour $1,200 and he promised to pay me back by June.";
add("m", "invented-quote-dropped", () => {
  const kept = validateStoryProposals({
    proposals: [
      { questionId: QUESTION.id, answer: "He agreed to repay you by July.", storyQuote: "he swore on his mother he would pay by July" },
      { questionId: QUESTION.id, answer: "He promised to pay back by June.", storyQuote: "he promised to pay me back by June" },
    ],
  }, PROPOSAL_STORY, [QUESTION]);
  return { ok: kept.length === 1 && proposalsFromStory(kept, PROPOSAL_STORY), detail: `a proposal whose quote is not in the story is dropped; one whose quote is, is kept (kept ${kept.length})` };
});
// Source check: the quote's display is on a client screen.
const showsQuote = (source: string) => /From your story:[^\n]*\{\s*[\w.]+\.storyQuote\s*\}/.test(source);
add("m", "quote-shown", () => ({ ok: showsQuote(read("app/builder/_components/GuidedSmallClaimsIntake.tsx")), detail: "the guided intake shows the proposal's story quote (\"From your story: '…'\")" }));

// ---------------------------------------------------------------------------
// Self-tests: each predicate behind a check that passes today rejects a
// synthetic bad input.
// ---------------------------------------------------------------------------
const SELF_TESTS: { name: string; rejects: () => boolean | Promise<boolean> }[] = [
  { name: "switch predicate rejects a switch that is on", rejects: () => !isOff(documentAnalysisEnabled(PRODUCTION, true)) },
  { name: "c: gate predicate rejects an ungated panel", rejects: () => !renderedBehindSwitch("<div>{confirmed ? <CaseReviewPanel /> : null}</div>", "CaseReviewPanel", CASE_REVIEW_GATE).ok },
  { name: "d: production-refusal predicate rejects a writer with no guard", rejects: () => writesData("db.from('cases').insert(row)") && !refusesInProduction("db.from('cases').insert(row)") },
  { name: "f: leak predicate finds a name in a raw body", rejects: () => leaked([{ messages: [{ content: "Sarah Jones owes" }] }], ["Sarah"]).length === 1 },
  { name: "f: an unlabelled client sends the name (labels are what remove it)", rejects: async () => leaked(await sendStory("Sarah Jones owes me.", {}), ["Sarah"]).length === 1 },
  { name: "g: row-count predicate rejects a call with no row", rejects: () => !rowsFor(1, []) },
  { name: "g: region predicate rejects us-west-2", rejects: () => !isCanadianRegion("us-west-2") },
  { name: "k: store predicate rejects a body with store:true", rejects: () => !everyBodyStoreFalse([{ store: false }, { store: true }]) },
  { name: "k: store predicate rejects no bodies at all", rejects: () => !everyBodyStoreFalse([]) },
  { name: "k: pin predicate rejects an alias", rejects: () => !isPinnedModelId("gpt-6.1-sol") && isPinnedModelId("gpt-4o-2024-08-06") },
  { name: "k: endpoint predicate rejects the default endpoint", rejects: () => !isNonDefaultEndpoint("https://api.openai.com/v1") },
  { name: "l: fixed-list predicate rejects an invented court", rejects: () => !inFixedList("criminal-court") && !FIXED_COURTS.has("criminal-court") },
  { name: "l: regime predicate rejects the model's small-claims answer", rejects: () => !regimeWon({ primaryPath: "small-claims", regime: null }) },
  { name: "m: story predicate rejects an invented quote", rejects: () => !proposalsFromStory([{ storyQuote: "he swore on his mother" }], PROPOSAL_STORY) },
  { name: "m: quote-shown predicate rejects a screen without the quote", rejects: () => !showsQuote("<p>From your story</p>") },
  { name: "h: the front-door check's kept test sees a conclusion in raw text", rejects: () => JSON.stringify({ summary: CONCLUSION }).includes("liable") },
  { name: "i: label / report predicates reject a bare screen", rejects: () => !hasAiLabel("<p>Here is what we think</p>") && !hasReportControl("<p>Here is what we think</p>") },
  { name: "j: marker predicate rejects a scan with no marker flag", rejects: () => !flagsMarkers(["social-insurance-number"]) },
];

// ---------------------------------------------------------------------------
// Run.
// ---------------------------------------------------------------------------
type Outcome = "pass" | "FAIL" | "UNVERIFIABLE";
async function runAll(): Promise<Map<string, { outcome: Outcome; detail: string }>> {
  const results = new Map<string, { outcome: Outcome; detail: string }>();
  for (const check of checks) {
    let result: Result;
    try {
      result = await check.run();
    } catch (error) {
      result = { ok: false, detail: `threw: ${error instanceof Error ? error.message : String(error)}` };
    }
    results.set(check.name, { outcome: result.ok ? "pass" : result.unverifiable ? "UNVERIFIABLE" : "FAIL", detail: result.detail });
  }
  return results;
}

async function main() {
  // Production: no AI_MODEL_* (the model comes from the code default), no
  // OPENAI_BASE_URL, no audit sink (nothing is written by the f/k checks).
  const saved: Record<string, string | undefined> = {};
  for (const name of ["AI_MODEL_DEEP", "AI_MODEL_STANDARD", "OPENAI_BASE_URL", "AI_CALL_LOG", "AI_SPEND_CAP_USD"]) {
    saved[name] = process.env[name];
    delete process.env[name];
  }
  process.env.AI_CALL_LOG = "off";
  const quietError = console.error;
  const quietLog = console.log;

  let today: Map<string, { outcome: Outcome; detail: string }>;
  let ownerOff: Map<string, { outcome: Outcome; detail: string }>;
  const owner = OWNER_LIVE_TESTING as unknown as { enabled: boolean };
  const ownerWas = owner.enabled;
  try {
    // The client logs "outside withAiCallContext" for the recording calls; not a finding here.
    console.error = () => {};
    console.log = (...args: unknown[]) => (String(args[0]).startsWith("[aiCallLog]") ? undefined : quietLog(...args));
    today = await runAll();
    owner.enabled = false;
    ownerOff = await runAll();
  } finally {
    owner.enabled = ownerWas;
    console.error = quietError;
    console.log = quietLog;
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }

  let failures = 0;
  console.log("A2I guard -- each check as the code stands (production env):\n");
  const known = new Map(A2I_GUARD_KNOWN.map((entry) => [entry.check, entry] as const));
  for (const check of checks) {
    const { outcome, detail } = today.get(check.name)!;
    const entry = known.get(check.name);
    if (outcome === "pass" && !entry) console.log(`  pass   ${check.name}`);
    else if (outcome !== "pass" && entry) console.log(`  known  ${check.name}  [${outcome}]\n         ${detail}\n         cause: ${entry.cause}`);
    else if (outcome === "pass") {
      failures++;
      console.log(`  FAIL   ${check.name}\n         fixed: delete its entry from scripts/verification/a2iGuardKnown.ts`);
    } else {
      failures++;
      console.log(`  FAIL   ${check.name}  [${outcome}]\n         ${detail} (not a known problem)`);
    }
  }
  for (const entry of A2I_GUARD_KNOWN) {
    if (!today.has(entry.check)) {
      failures++;
      console.log(`  FAIL   ${entry.check}\n         listed in a2iGuardKnown.ts but no check of that name ran: correct or delete it`);
    }
  }

  console.log("\nSelf-tests (each passing check's predicate rejects a bad input):");
  for (const test of SELF_TESTS) {
    let ok = false;
    try {
      console.error = () => {};
      ok = await test.rejects();
    } catch {
      ok = false;
    } finally {
      console.error = quietError;
    }
    if (!ok) failures++;
    console.log(`  ${ok ? "pass" : "FAIL"}   ${test.name}`);
  }

  // The table.
  const verdict = (results: Map<string, { outcome: Outcome }>, names: string[]) => {
    const outcomes = names.map((name) => results.get(name)!.outcome);
    if (outcomes.every((outcome) => outcome === "pass")) return "PASS";
    const passed = outcomes.filter((outcome) => outcome === "pass").length;
    const unver = outcomes.includes("UNVERIFIABLE") ? ", unverifiable part" : "";
    return `FAIL (${passed}/${outcomes.length} pass${unver})`;
  };
  console.log("\nStatement | today | with owner-testing off");
  console.log("---|---|---");
  for (const letter of Object.keys(STATEMENTS) as Letter[]) {
    const names = checks.filter((check) => check.letter === letter).map((check) => check.name);
    console.log(`(${letter}) ${STATEMENTS[letter]} | ${verdict(today, names)} | ${verdict(ownerOff, names)}`);
    for (const name of names) console.log(`      ${name} | ${today.get(name)!.outcome} | ${ownerOff.get(name)!.outcome}`);
  }

  console.log(failures ? `\n${failures} failure(s)` : "\nAll checks pass or are listed known problems; every self-test rejects its bad input.");
  process.exit(failures ? 1 : 0);
}

void main();
