import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve as resolvePath } from "node:path";

const port = Number(process.env.COURTSIMPLIFIED_TEST_PORT || 4317);
const baseUrl = `http://127.0.0.1:${port}`;
const nextCommand = resolvePath(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

const serverEnvironment = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "context-verification-publishable-key",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "context-verification-anon-key",
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "context-verification-service-role-key",
  OPENAI_API_KEY:
    process.env.OPENAI_API_KEY || "context-verification-openai-key",
};

let serverOutput = "";

const server = spawn(
  process.execPath,
  [
    nextCommand,
    "start",
    "--hostname",
    "127.0.0.1",
    "-p",
    String(port),
  ],
  {
    cwd: process.cwd(),
    env: serverEnvironment,
    stdio: ["ignore", "pipe", "pipe"],
  },
);

function recordServerOutput(chunk) {
  serverOutput = `${serverOutput}${chunk.toString()}`.slice(-8000);
}

server.stdout.on("data", recordServerOutput);
server.stderr.on("data", recordServerOutput);

async function waitForServer() {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(
        `CourtSimplified stopped before verification began.\n${serverOutput}`,
      );
    }

    try {
      const response = await fetch(`${baseUrl}/api/ai-case-partner`);

      if (response.status > 0) {
        return;
      }
    } catch {
      // The production server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `Timed out waiting for CourtSimplified.\n${serverOutput}`,
  );
}

async function postCasePartner(payload) {
  const response = await fetch(`${baseUrl}/api/ai-case-partner`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  assert.equal(
    response.status,
    200,
    `Expected HTTP 200 but received ${response.status}: ${JSON.stringify(data)}`,
  );
  assert.equal(data.ok, true, JSON.stringify(data));

  return data;
}

async function postSmallClaimsAnalysis(input) {
  const response = await fetch(`${baseUrl}/api/small-claims/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
  });

  const data = await response.json();

  assert.equal(
    response.status,
    200,
    `Expected HTTP 200 but received ${response.status}: ${JSON.stringify(data)}`,
  );
  assert.equal(data.ok, true, JSON.stringify(data));

  return data;
}

async function assertProtectedCaseStorage() {
  const response = await fetch(`${baseUrl}/api/cases`);
  const data = await response.json();

  assert.equal(
    response.status,
    401,
    `Unauthenticated case storage returned ${response.status}: ${JSON.stringify(data)}`,
  );
  assert.equal(data.success, false);
}

async function assertUnauthenticatedAssistantUsesFallback() {
  const response = await fetch(`${baseUrl}/api/assistant-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "What should I organize next?",
      path: "small-claims",
      proceduralStage: "starting-case",
      caseData: buildSmallClaimsIntake(),
    }),
  });

  const data = await response.json();

  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.success, true, JSON.stringify(data));
  assert.equal(data.mode, "brain-only-fallback");
  assert.equal(data.metadata?.usedOpenAIForBrain, false);
  assert.equal(data.metadata?.usedOpenAIForAssistant, false);
}

function buildSmallClaimsIntake() {
  return {
    caseStage: "starting-case",
    issues: ["contract-dispute", "work-or-services"],
    filedDocuments: ["nothing"],
    uploadedEvidenceFiles: [
      {
        id: "api-invoice-1",
        name: "invoice.pdf",
        size: 1200,
        type: "application/pdf",
        lastModified: 1_767_225_600_000,
        title: "Repair invoice",
        description: "Invoice for the agreed repair work.",
        category: "invoice",
        evidenceDate: "2026-01-10",
        source: "Contractor",
        relevance: "Shows the work and price that were agreed upon.",
      },
    ],
    yourName: "Jordan Lee",
    yourAddress: "10 Example Street",
    yourCity: "Toronto",
    yourProvince: "Ontario",
    yourPostalCode: "M1M 1M1",
    yourPhone: "416-555-0100",
    yourEmail: "jordan@example.test",
    otherParty: "Example Repairs Ltd.",
    otherPartyPhone: "416-555-0101",
    otherPartyEmail: "repairs@example.test",
    yourRole: "Plaintiff / claimant",
    courtLocation: "Toronto",
    claimNumber: "",
    amountClaimed: "$4,200",
    defendantAddress: "20 Example Avenue, Toronto, Ontario",
    agreementDetails:
      "The written quote required the contractor to complete the repairs for $4,200.",
    paymentHistory: "I paid $4,200 by e-transfer on January 10, 2026.",
    damagesBreakdown:
      "$4,200 paid for incomplete work, supported by the invoice and payment receipt.",
    serviceDetails: "Nothing has been served because the claim has not been filed.",
    deadlineDetails: "The work was due on January 31, 2026.",
    facts:
      "The contractor accepted payment but did not complete the agreed repairs.",
    timeline:
      "January 10, 2026: payment sent. January 31, 2026: work remained unfinished.",
    evidence: "Written quote, invoice, e-transfer receipt, and messages.",
    missingEvidence: "None known yet.",
    settlementEfforts: "I requested completion or repayment in writing.",
    defenceResponse: "",
    goal: "Recover the $4,200 paid for the incomplete work.",
    urgent: "No urgent issue.",
  };
}

function collectWarnings(result) {
  return [
    ...(result.caseInvestigation?.validation?.warnings || []),
    ...(result.conversationMemory?.memoryPatch?.warnings || []),
    ...(result.caseMemory?.warnings || []),
  ].map((warning) => String(warning));
}

function assertKnownSmallClaimsContext(result, scenario) {
  assert.deepEqual(
    result.courtContext,
    {
      courtPath: "small-claims",
      jurisdiction: "Ontario",
      stage: "starting-case",
    },
    `${scenario}: authoritative court context was not preserved`,
  );

  assert.equal(
    result.conversationIntelligence?.conversationFocus?.selectedCourtArea,
    "small-claims",
    `${scenario}: selected court area was not preserved`,
  );
  assert.equal(
    result.conversationIntelligence?.conversationFocus?.jurisdiction,
    "Ontario",
    `${scenario}: jurisdiction was not preserved`,
  );
  assert.equal(
    result.conversationIntelligence?.conversationFocus?.proceduralStage,
    "starting-case",
    `${scenario}: procedural stage was not preserved`,
  );

  const warningText = collectWarnings(result).join("\n").toLowerCase();

  assert.equal(
    warningText.includes("jurisdiction is unknown"),
    false,
    `${scenario}: an incorrect jurisdiction warning was generated`,
  );
  assert.equal(
    warningText.includes("procedural stage is uncertain"),
    false,
    `${scenario}: an incorrect procedural-stage warning was generated`,
  );
}

async function run() {
  await waitForServer();

  const firstMessage =
    "I paid for repairs that were not completed. I have the invoice, payment receipt, and screenshots, and I want to start a claim.";

  const explicitContextResult = await postCasePartner({
    caseId: "context-verification-explicit",
    message: firstMessage,
    conversation: [{ role: "user", content: firstMessage }],
    courtContext: {
      courtPath: "small-claims",
      jurisdiction: "Ontario",
      stage: "starting-case",
    },
    mode: "verification",
  });

  assertKnownSmallClaimsContext(
    explicitContextResult,
    "explicit UI context",
  );

  const secondMessage =
    "The payment was made by e-transfer and the other party confirmed it in writing.";

  const memoryContextResult = await postCasePartner({
    caseId: "context-verification-explicit",
    message: secondMessage,
    conversation: [
      { role: "user", content: firstMessage },
      {
        role: "assistant",
        content: explicitContextResult.userFacingAnswer,
      },
      { role: "user", content: secondMessage },
    ],
    caseMemory: explicitContextResult.caseMemory,
    mode: "verification",
  });

  assertKnownSmallClaimsContext(
    memoryContextResult,
    "second-turn conversation memory",
  );

  const canonicalContextResult = await postCasePartner({
    caseId: "context-verification-master-case",
    message: firstMessage,
    conversation: [{ role: "user", content: firstMessage }],
    caseMemory: {
      masterResult: {
        masterCase: {
          courtPath: "small-claims",
          province: "Ontario",
          stage: "starting-case",
        },
      },
    },
    mode: "verification",
  });

  assertKnownSmallClaimsContext(
    canonicalContextResult,
    "canonical MasterCaseSchema fallback",
  );

  const smallClaimsApiResult = await postSmallClaimsAnalysis(
    buildSmallClaimsIntake(),
  );
  const apiMasterCase =
    smallClaimsApiResult.result?.masterResultPatch?.masterCase;

  assert.equal(
    smallClaimsApiResult.authenticated,
    false,
    "The public verification request was unexpectedly authenticated",
  );
  assert.equal(
    smallClaimsApiResult.reasoningMode,
    "deterministic-fallback",
    "An unauthenticated intake must not invoke paid external cognition",
  );
  assert.equal(apiMasterCase?.courtPath, "small-claims");
  assert.equal(apiMasterCase?.province, "Ontario");
  assert.equal(apiMasterCase?.stage, "starting-case");
  assert.ok(
    smallClaimsApiResult.result.analysis.requiredNextForms.some((form) =>
      form.includes("Form 7A"),
    ),
    "The Small Claims API did not route a starting claimant to Form 7A",
  );
  assert.equal(
    JSON.stringify(smallClaimsApiResult.result)
      .toLowerCase()
      .includes("jurisdiction is unknown"),
    false,
    "The Small Claims API generated an incorrect jurisdiction warning",
  );

  await assertProtectedCaseStorage();
  await assertUnauthenticatedAssistantUsesFallback();

  console.log(
    "Production API verification passed: court context, conversation memory, canonical MasterCaseSchema, protected case storage, and safe AI fallback boundaries.",
  );
}

async function stopServer() {
  if (server.exitCode !== null) {
    return;
  }

  const exited = new Promise((resolve) => {
    server.once("exit", resolve);
  });

  server.kill("SIGTERM");

  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);

  if (server.exitCode === null) {
    server.kill("SIGKILL");
    await exited;
  }
}

try {
  await run();
} finally {
  await stopServer();
}
