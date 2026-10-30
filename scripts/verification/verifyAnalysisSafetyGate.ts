/**
 * No analysis runs without a safety-check result for the story, on every
 * analyze route, and a failed check is recorded as failed -- never clear.
 *
 *   npm run test:analysis-safety
 *
 * COSTS NOTHING. No model call, no network, no database.
 *
 * WHY THIS EXISTS (site owner, 2026-10-29, item N). The safety pass was
 * reached only from the browser, route by route. The Small Claims guided
 * "Show my next step", with a story from the home page or the review panel,
 * analysed the story with no check at all; and the Small Claims form read a
 * refused or failed check (401, 429, 503, 500) as "clear". The guarantee now
 * lives in the three analyze routes (analysisSafetyGate.ts), and this suite
 * drives each REAL route -- the same factory the live POST exports, wrapped
 * in withConfirmedGuidance with the live options -- with a request that
 * carries no prior safety result.
 *
 * WHAT IT ASSERTS, per court (small-claims, civil, family):
 *   1. The route runs the safety pass itself, once, on the text it analyses
 *      (the story and the other narrative fields), and only THEN analyses.
 *   2. The result is recorded in the case: status, time, a hash of that exact
 *      text -- and none of the story's words.
 *   3. A concern comes back with the fixed safety message (unchanged pass).
 *   4. An error, a rate limit and a time-out are each retried once; when the
 *      retry fails too the case records "failed" with the kind, the analysis
 *      still runs, and the result is never "clear". One failure then success
 *      is "clear" after two attempts.
 *   5. With no AI available the check is recorded "failed" (unavailable).
 * And for the browser's one shared helper (clientSafetyCheck.ts):
 *   6. ensureSafetyChecked retries a failed check once and reports "failed",
 *      never "clear"; a server concern is read back only when it is a concern.
 *
 * STAND-INS (nothing else is replaced):
 *   - the safety pass's model step (`safety.runSafety`) -- a stub returning a
 *     classification, throwing, or never answering;
 *   - the case write (`safety.record`) -- captures the record; the real one is
 *     updateMasterResult as the case's owner;
 *   - the analysis engine (`analyze`) -- records that it ran and when;
 *   - sign-in and the owned case (withConfirmedGuidance's and the route's
 *     `authenticate`, `owned`, `names`, `loadCaseEvents`,
 *     `loadOwnedMasterResult`) -- a synthetic confirmed case;
 *   - the retry pause (`safety.pause`) -- immediate.
 * Fails on main: the routes there accept no safety step and never call one.
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";

import { withConfirmedGuidance } from "../../src/lib/security/intakeGuidanceGate";
import { transitionReview, remainingEssentialQuestions } from "../../src/lib/case-system/intakeReview";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { createSmallClaimsAnalyzePost } from "../../app/api/small-claims/analyze/route";
import { createCivilAnalyzePost } from "../../app/api/civil/analyze/route";
import { createFamilyAnalyzePost } from "../../app/api/family/analyze/route";
import { IMMEDIATE_DANGER_MESSAGE } from "../../src/lib/case-system/intake/safetyPass";
import { ensureSafetyChecked, safetyConcernFromAnalysis, type ClientSafetyResult } from "../../src/lib/case-system/intake/clientSafetyCheck";

const CASE_ID = "11111111-1111-4111-8111-111111111111";
const REVISION = "22222222-2222-4222-8222-222222222222";
const OWNER = "44444444-4444-4444-8444-444444444444";

const STORY = "Synthetic story: I lent my neighbour 900 dollars in March and was not repaid.";
const URGENT = "Synthetic urgent note: he came to my door last night and threatened me.";

type Court = "small-claims" | "civil" | "family";

function confirmedMaster(court: Court): Record<string, unknown> {
  const cp: Checkpoint = { version: 1, flowId: CASE_ID, courtPath: court, revision: REVISION, inputRevision: REVISION, sections: { story: { text: STORY, location: { city: "Toronto", province: "Ontario" } }, builder: {} } };
  cp.sections.builder.initialUnknowns = remainingEssentialQuestions(cp).map((question) => question.id);
  const workflow = transitionReview(transitionReview({}, cp, "review", REVISION, "now"), cp, "confirm", REVISION, "now");
  return { intakeCheckpoint: cp, workflowStatus: workflow, guidanceInputRevision: REVISION };
}

function smallClaimsInput() {
  const blank = ["yourName", "yourAddress", "yourCity", "yourProvince", "yourPostalCode", "yourPhone", "yourEmail", "otherParty", "otherPartyPhone", "otherPartyEmail", "yourRole", "courtLocation", "claimNumber", "amountClaimed", "defendantAddress", "agreementDetails", "paymentHistory", "damagesBreakdown", "serviceDetails", "deadlineDetails", "timeline", "evidence", "missingEvidence", "settlementEfforts", "defenceResponse", "goal"];
  return { ...Object.fromEntries(blank.map((field) => [field, ""])), caseStage: "starting-case", issues: ["loan-or-debt"], filedDocuments: ["nothing"], uploadedEvidenceFiles: [], facts: STORY, urgent: URGENT };
}

function civilInput() {
  const blank = ["yourName", "otherParty", "courtLocation", "courtFileNumber", "amountClaimed", "limitationDeadline", "timeline", "evidence", "missingEvidence", "damagesBreakdown", "legalRemedy", "settlementEfforts", "serviceDetails", "humanRightsGrounds", "discriminationFacts", "accommodationRequests", "governmentActor", "publicDecisionOrConduct", "institutionalFacts", "privacyRecordsFacts"];
  return { ...Object.fromEntries(blank.map((field) => [field, ""])), caseId: CASE_ID, caseStage: "starting-case", yourRole: "plaintiff", issues: ["debt"], documents: ["nothing"], uploadedEvidenceFiles: [], facts: STORY, urgent: URGENT };
}

function familyInput() {
  return { caseStage: "starting-case", facts: STORY, urgent: URGENT };
}

type Harness = {
  events: string[];
  safetyTexts: string[];
  records: Array<Record<string, unknown>>;
};

type SafetyStub = (text: string) => Promise<{ classification: "clear" | "distress" | "immediate-danger"; requestsLegalAdvice: boolean; userMessage?: string }>;

const analysisResult = { analysis: { intelligence: { cognitionMode: "structured" } }, brain: { intelligence: { cognitionMode: "structured" } } } as never;

function routeFor(court: Court, harness: Harness, runSafety: SafetyStub, options: { aiAvailable?: boolean; timeoutMs?: number } = {}) {
  const safety = {
    apiKey: () => "offline-stand-in",
    runSafety: async (text: string) => { harness.events.push("safety"); harness.safetyTexts.push(text); return runSafety(text); },
    record: async (_request: Request, ids: { userId: string; caseId: string }, record: unknown) => {
      harness.events.push("record");
      harness.records.push({ ...(record as Record<string, unknown>), _ids: ids });
      return true;
    },
    pause: async () => {},
    ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
  };
  const authenticate = async () => ({ id: OWNER }) as never;
  const hasExternalAiKey = () => options.aiAvailable !== false;
  const analyze = async () => { harness.events.push("analyze"); return analysisResult; };
  const handler =
    court === "small-claims"
      ? createSmallClaimsAnalyzePost({ authenticate, hasExternalAiKey, analyze, loadCaseEvents: async () => [], safety })
      : court === "civil"
        ? createCivilAnalyzePost({ authenticate, hasExternalAiKey, analyze, loadOwnedMasterResult: async () => ({}), safety })
        : createFamilyAnalyzePost({ authenticate, hasExternalAiKey, analyze, safety });
  const master = confirmedMaster(court);
  // The live options of each route's exported POST.
  return withConfirmedGuidance(handler as unknown as (request: Request) => Promise<Response>, { court, requireRevision: true }, {
    authenticate: async () => ({ id: OWNER }),
    owned: async (_request, user, caseId) => (user.id === OWNER && caseId === CASE_ID ? { id: CASE_ID, court_path: court, master_result: master } : null),
    names: async () => null,
  });
}

function requestFor(court: Court) {
  const input = court === "small-claims" ? smallClaimsInput() : court === "civil" ? civilInput() : familyInput();
  const body = court === "small-claims" ? { input, caseId: CASE_ID } : { input };
  return new NextRequest(`http://localhost/api/${court}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer synthetic",
      "x-courtsimplified-case-id": CASE_ID,
      "x-courtsimplified-input-revision": REVISION,
    },
    body: JSON.stringify(body),
  });
}

const fresh = (): Harness => ({ events: [], safetyTexts: [], records: [] });
const sha = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const clear: SafetyStub = async () => ({ classification: "clear", requestsLegalAdvice: false });

async function call(court: Court, harness: Harness, runSafety: SafetyStub, options: { aiAvailable?: boolean; timeoutMs?: number } = {}) {
  const response = await routeFor(court, harness, runSafety, options)(requestFor(court));
  const body = (await response.json()) as { ok?: boolean; safety?: Record<string, unknown>; error?: string };
  return { status: response.status, body };
}

let checks = 0;
function pass(name: string) { checks += 1; console.log(`pass  ${name}`); }

async function verifyCourt(court: Court) {
  // 1 + 2: no prior safety result -> the route checks the analysed text, then analyses, and records it.
  {
    const harness = fresh();
    const { status, body } = await call(court, harness, clear);
    assert.equal(status, 200, `${court}: the analysis answered (${body.error ?? ""})`);
    assert.equal(harness.safetyTexts.length, 1, `${court}: the route ran the safety pass itself, once, for a request with no prior safety result`);
    assert.ok(harness.events.indexOf("safety") >= 0 && harness.events.indexOf("safety") < harness.events.indexOf("analyze"), `${court}: the safety pass ran BEFORE the analysis (order: ${harness.events.join(", ")})`);
    const checked = harness.safetyTexts[0];
    assert.ok(checked.includes(STORY), `${court}: the story the analysis reads is the text checked`);
    assert.ok(checked.includes(URGENT), `${court}: the other narrative fields the analysis reads are checked too`);
    assert.equal(harness.records.length, 1, `${court}: the result is recorded in the case`);
    const record = harness.records[0];
    assert.equal(record.status, "clear");
    assert.equal(record.storyHash, sha(checked), `${court}: the record names the exact text checked, by its hash`);
    assert.equal(typeof record.checkedAt, "string");
    assert.deepEqual(record._ids, { userId: OWNER, caseId: CASE_ID }, `${court}: recorded on this person's case`);
    const serialized = JSON.stringify(record);
    assert.ok(!serialized.includes("neighbour") && !serialized.includes("threatened"), `${court}: no story words in the record`);
    assert.equal(body.safety?.status, "clear");
    pass(`${court}: a request with no prior safety result is checked by the route, before the analysis, and recorded`);
  }

  // 3: a concern carries the fixed message, unchanged.
  {
    const harness = fresh();
    const { status, body } = await call(court, harness, async () => ({ classification: "immediate-danger", requestsLegalAdvice: false, userMessage: IMMEDIATE_DANGER_MESSAGE }));
    assert.equal(status, 200);
    assert.equal(harness.records[0].status, "concern");
    assert.equal(harness.records[0].classification, "immediate-danger");
    assert.equal(body.safety?.status, "concern");
    assert.equal(body.safety?.userMessage, IMMEDIATE_DANGER_MESSAGE, `${court}: the browser gets the fixed danger message to show`);
    pass(`${court}: a concern is recorded and returned with the fixed message`);
  }

  // 4: error, rate limit, time-out -> retried once, then recorded failed, analysis continues, never clear.
  const failures: Array<[string, SafetyStub, number | undefined]> = [
    ["error", async () => { throw new Error("synthetic 500"); }, undefined],
    ["rate-limit", async () => { throw Object.assign(new Error("synthetic 429"), { status: 429 }); }, undefined],
    ["timeout", () => new Promise(() => {}), 20],
  ];
  for (const [kind, stub, timeoutMs] of failures) {
    const harness = fresh();
    const { status, body } = await call(court, harness, stub, { timeoutMs });
    assert.equal(harness.safetyTexts.length, 2, `${court}/${kind}: retried once`);
    assert.equal(status, 200, `${court}/${kind}: the person is not blocked`);
    assert.ok(harness.events.includes("analyze"), `${court}/${kind}: the analysis still ran`);
    assert.equal(harness.records[0].status, "failed", `${court}/${kind}: recorded as failed`);
    assert.equal(harness.records[0].failure, kind);
    assert.equal(harness.records[0].attempts, 2);
    assert.notEqual(body.safety?.status, "clear", `${court}/${kind}: a failed check is never "clear"`);
    assert.equal(body.safety?.userMessage, null, `${court}/${kind}: nothing shown for a failure`);
    pass(`${court}: a ${kind} is retried once, recorded as failed, and the analysis continues`);
  }
  {
    const harness = fresh();
    let tries = 0;
    await call(court, harness, async () => { tries += 1; if (tries === 1) throw new Error("synthetic blip"); return { classification: "clear", requestsLegalAdvice: false }; });
    assert.equal(harness.records[0].status, "clear");
    assert.equal(harness.records[0].attempts, 2);
    pass(`${court}: one failure then an answer is the answer, after two attempts`);
  }

  // 5: no AI available -> recorded failed (unavailable), analysis continues.
  {
    const harness = fresh();
    const { status, body } = await call(court, harness, clear, { aiAvailable: false });
    assert.equal(status, 200);
    assert.equal(harness.safetyTexts.length, 0);
    assert.equal(harness.records[0].status, "failed");
    assert.equal(harness.records[0].failure, "unavailable");
    assert.equal(body.safety?.status, "failed");
    pass(`${court}: with no AI the check is recorded as failed (unavailable), never clear`);
  }
}

async function verifyClientHelper() {
  const failed: ClientSafetyResult = { classification: "clear", requestsLegalAdvice: false, failed: true };
  let calls = 0;
  const twiceFailed = await ensureSafetyChecked("story", null, async () => { calls += 1; return failed; });
  assert.equal(calls, 2, "the browser helper retries a failed check once");
  assert.equal(twiceFailed.status, "failed", "a check that failed twice is failed, never clear");
  calls = 0;
  const recovered = await ensureSafetyChecked("story", null, async () => { calls += 1; return calls === 1 ? failed : { classification: "distress", requestsLegalAdvice: false, userMessage: "fixed" }; });
  assert.equal(recovered.status, "concern");
  assert.equal(recovered.attempts, 2);
  calls = 0;
  await ensureSafetyChecked("story", null, async () => { calls += 1; return { classification: "clear", requestsLegalAdvice: false }; });
  assert.equal(calls, 1, "a check that answered is not repeated");
  assert.equal(safetyConcernFromAnalysis({ safety: { status: "failed", classification: null } }), null);
  assert.equal(safetyConcernFromAnalysis({ safety: { status: "clear", classification: "clear" } }), null);
  assert.equal(safetyConcernFromAnalysis({}), null);
  assert.equal(safetyConcernFromAnalysis({ safety: { status: "concern", classification: "immediate-danger", userMessage: IMMEDIATE_DANGER_MESSAGE } })?.userMessage, IMMEDIATE_DANGER_MESSAGE);
  pass("browser helper: one retry, failed is never clear, a server concern is read back");
}

async function main() {
  for (const court of ["small-claims", "civil", "family"] as const) await verifyCourt(court);
  await verifyClientHelper();
  console.log(`\nAll ${checks} checks passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
