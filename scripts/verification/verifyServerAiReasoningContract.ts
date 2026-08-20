import assert from "node:assert/strict";
import { NextRequest } from "next/server";

import {
  createSmallClaimsAnalyzePost,
} from "../../app/api/small-claims/analyze/route";
import {
  analyzeSmallClaimsWithBrain,
  type SmallClaimsIntelligenceInput,
} from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";

const defaultStageInput: SmallClaimsIntelligenceInput = {
  caseStage: "already-started",
  issues: ["defamation-reputation"],
  filedDocuments: ["plaintiffs-claim", "affidavit-service"],
  uploadedEvidenceFiles: [],
  yourName: "Rowan Test",
  yourAddress: "1 Synthetic Street",
  yourCity: "Toronto",
  yourProvince: "Ontario",
  yourPostalCode: "M1M 1M1",
  yourPhone: "416-555-0100",
  yourEmail: "rowan@example.test",
  otherParty: "Morgan Example",
  otherPartyPhone: "",
  otherPartyEmail: "",
  yourRole: "Plaintiff / claimant",
  courtLocation: "Toronto",
  claimNumber: "SC-001",
  amountClaimed: "$10,000",
  defendantAddress: "2 Synthetic Avenue",
  agreementDetails: "",
  paymentHistory: "",
  damagesBreakdown: "",
  serviceDetails: "The defendant was served.",
  deadlineDetails: "",
  facts: "Synthetic messages were sent on September 19, 2025.",
  timeline: "September 19, 2025: service completed; affidavit filed.",
  evidence: "Message threads.",
  missingEvidence: "",
  settlementEfforts: "",
  defenceResponse: "",
  goal: "Compensation",
  urgent: "",
};

async function main() {
  const mockedAiResult = await analyzeSmallClaimsWithBrain(defaultStageInput, {
    allowExternalCognition: false,
  });
  mockedAiResult.analysis.intelligenceWarnings = [];
  mockedAiResult.analysis.userWarnings = [];
  mockedAiResult.payload.intelligence.systemWarnings = [];

  let receivedInput: SmallClaimsIntelligenceInput | undefined;
  let externalReasoningEnabled = false;
  const post = createSmallClaimsAnalyzePost({
    authenticate: async () => ({ id: "synthetic-user" }) as never,
    hasExternalAiKey: () => true,
    analyze: async (input, options) => {
      receivedInput = input;
      externalReasoningEnabled = options.allowExternalCognition === true;
      return mockedAiResult;
    },
  });

  const response = await post(
    new NextRequest("http://localhost/api/small-claims/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: defaultStageInput }),
    }),
  );
  const body = (await response.json()) as {
    ok: boolean;
    authenticated: boolean;
    analysisAvailable: boolean;
    result: typeof mockedAiResult;
  };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, true);
  assert.equal(body.analysisAvailable, true);
  assert.equal(externalReasoningEnabled, true);
  assert.equal(receivedInput?.caseStage, "already-started");
  assert.deepEqual(receivedInput?.filedDocuments, [
    "plaintiffs-claim",
    "affidavit-service",
  ]);
  assert.match(receivedInput?.serviceDetails || "", /served/i);
  assert.match(receivedInput?.timeline || "", /service completed; affidavit filed/i);
  assert.ok(
    body.result.analysis.guidance.includes(
      "Service was completed and an Affidavit of Service was filed with the court.",
    ),
  );
  assert.ok(
    body.result.analysis.nextBestActions?.includes(
      "Has the defendant filed a Defence?",
    ),
  );

  let unauthenticatedExternalReasoningEnabled = true;
  const unauthenticatedPost = createSmallClaimsAnalyzePost({
    authenticate: async () => null as never,
    hasExternalAiKey: () => true,
    analyze: async (_input, options) => {
      unauthenticatedExternalReasoningEnabled =
        options.allowExternalCognition === true;
      return mockedAiResult;
    },
  });
  const unauthenticatedResponse = await unauthenticatedPost(
    new NextRequest("http://localhost/api/small-claims/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: defaultStageInput }),
    }),
  );
  const unauthenticatedText = await unauthenticatedResponse.text();
  const unauthenticatedBody = JSON.parse(unauthenticatedText) as {
    ok: boolean;
    authenticated: boolean;
    analysisAvailable: boolean;
  };

  assert.equal(unauthenticatedResponse.status, 200);
  assert.equal(unauthenticatedBody.ok, true);
  assert.equal(unauthenticatedBody.authenticated, false);
  assert.equal(unauthenticatedBody.analysisAvailable, false);
  assert.equal(unauthenticatedExternalReasoningEnabled, false);
  const prohibitedInternalLanguage = [
    "Structured AI cognition unavailable",
    "Confirm OpenAI configuration",
    "Fallback proof map",
    "Fallback cognition is not court-ready",
    "external AI",
    "configured server",
    "structured GPT cognition",
  ];
  assert.equal(
    prohibitedInternalLanguage.some((phrase) =>
      unauthenticatedText.toLowerCase().includes(phrase.toLowerCase()),
    ),
    false,
    "User-facing Small Claims response contains prohibited internal language.",
  );

  console.log(
    "Server AI reasoning contract: mocked authenticated Small Claims request received canonical default-stage facts and returned the Defence follow-up.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
