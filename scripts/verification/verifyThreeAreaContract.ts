import assert from "node:assert/strict";
import { NextRequest } from "next/server";

import { POST as analyzeFamilyRoute } from "../../app/api/family/analyze/route";
import {
  POST as analyzeCivilRoute,
  createCivilAnalyzePost,
  isCivilInput,
} from "../../app/api/civil/analyze/route";
import type { FamilyCanonicalIntakeResult } from "../../src/lib/case-system/orchestration/familyIntakeCanonicalAdapter";
import type {
  CivilCanonicalIntakeInput,
  CivilCanonicalIntakeResult,
} from "../../src/lib/case-system/orchestration/civilIntakeCanonicalAdapter";
import { runCivilIntakeCanonicalIntegration } from "../../src/lib/case-system/orchestration/civilIntakeCanonicalAdapter";
import { analyzeSmallClaimsWithBrain } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";

function canonicalMaster(result: { masterResultPatch: Record<string, unknown> }) {
  return result.masterResultPatch.masterCase as
    | Record<string, unknown>
    | undefined;
}

async function verifySmallClaims() {
  const result = await analyzeSmallClaimsWithBrain({
    caseStage: "responding",
    issues: ["defending-claim"],
    filedDocuments: ["plaintiffs-claim"],
    uploadedEvidenceFiles: [],
    yourName: "Small Claims Respondent",
    yourAddress: "1 Test Street",
    yourCity: "Toronto",
    yourProvince: "Ontario",
    yourPostalCode: "M1M 1M1",
    yourPhone: "416-555-0100",
    yourEmail: "small-claims@example.test",
    otherParty: "Claimant Example",
    otherPartyPhone: "",
    otherPartyEmail: "",
    yourRole: "Defendant / responding party",
    courtLocation: "Toronto",
    claimNumber: "SC-TEST-1",
    amountClaimed: "$2,500",
    defendantAddress: "1 Test Street, Toronto, Ontario",
    agreementDetails: "The amount claimed is disputed.",
    paymentHistory: "No payment is admitted.",
    damagesBreakdown: "The claimed amount is disputed.",
    serviceDetails: "A Plaintiff's Claim was received.",
    deadlineDetails: "A response is required.",
    facts: "The respondent disputes the amount in the claim.",
    timeline: "The claim was received after the disputed transaction.",
    evidence: "Agreement and payment records.",
    missingEvidence: "Complete communication record.",
    settlementEfforts: "The parties discussed the disputed amount.",
    defenceResponse: "The amount was not authorized.",
    goal: "Respond to the claim.",
    urgent: "No urgent issue.",
  });

  const masterCase = canonicalMaster(result);
  assert.equal(result.analysis.courtPath, "small-claims");
  assert.equal(result.payload.caseStage, "responding");
  assert.equal(result.payload.extra.yourRole, "Defendant / responding party");
  assert.equal(masterCase?.courtPath, "small-claims");
  assert.equal(masterCase?.province, "Ontario");
  assert.equal(masterCase?.stage, "responding");
  assert.ok(result.masterResultPatch.caseSystemAssembly);
  assert.equal("familyMasterResult" in result.masterResultPatch, false);
}

async function verifyFamily() {
  const input = {
      caseStage: "starting-case",
      role: "applicant",
      issues: ["Parenting time / access", "Child support"],
      filedDocuments: ["Nothing filed yet"],
      yourName: "Family Applicant",
      otherParty: "Family Respondent",
      childrenInfo: "One child has an established school routine.",
      currentLivingSituation: "The child currently lives primarily with the applicant.",
      facts: "The parties need a structured parenting schedule.",
      timeline: "The parties separated and attempted an interim schedule.",
      evidence: "Parenting calendar and communications.",
      missingEvidence: "Updated income disclosure.",
      goal: "Establish a stable parenting schedule.",
      urgent: "No immediate emergency.",
  };
  const response = await analyzeFamilyRoute(
    new NextRequest("http://localhost/api/family/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    }),
  );
  const body = (await response.json()) as {
    ok: boolean;
    authenticated: boolean;
    reasoningMode: string;
    result: FamilyCanonicalIntakeResult;
  };
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, false);
  assert.equal(body.reasoningMode, "deterministic-fallback");
  const result = body.result;

  const masterCase = canonicalMaster(result);
  assert.equal(result.courtPath, "family");
  assert.equal(result.province, "Ontario");
  assert.equal(result.stage, "starting-case");
  assert.equal(result.role, "applicant");
  assert.equal(masterCase?.courtPath, "family");
  assert.equal(masterCase?.province, "Ontario");
  assert.equal(masterCase?.stage, "starting-case");
  assert.ok(result.masterResultPatch.caseSystemAssembly);
  assert.deepEqual(
    result.masterResultPatch.familyMasterResult,
    result.familyMasterResult,
  );
  assert.deepEqual(
    result.masterResultPatch.familyWorkflow,
    result.familyMasterResult.workflow,
  );
  assert.deepEqual(
    result.masterResultPatch.familyEvidence,
    result.familyMasterResult.evidence,
  );
  assert.deepEqual(
    result.masterResultPatch.familyFormRouting,
    result.familyMasterResult.formRouting,
  );
  assert.deepEqual(
    result.masterResultPatch.familyStrategy,
    result.familyMasterResult.strategy,
  );
  assert.deepEqual(
    result.masterResultPatch.familyNarrative,
    result.familyMasterResult.narrative,
  );
  assert.deepEqual(
    result.masterResultPatch.familyCaseFileCatalog,
    result.familyMasterResult.caseFileCatalog,
  );
  assert.equal("civilMasterCase" in result.masterResultPatch, false);
}

async function verifyFamilyRouteRejections() {
  const malformed = await analyzeFamilyRoute(
    new NextRequest("http://localhost/api/family/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    }),
  );
  assert.equal(malformed.status, 400);

  const oversized = await analyzeFamilyRoute(
    new NextRequest("http://localhost/api/family/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "200001",
      },
      body: JSON.stringify({ input: { caseStage: "starting-case" } }),
    }),
  );
  assert.equal(oversized.status, 413);

  const oversizedWithoutHeader = await analyzeFamilyRoute(
    new NextRequest("http://localhost/api/family/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          caseStage: "starting-case",
          facts: "x".repeat(200_001),
        },
      }),
    }),
  );
  assert.equal(oversizedWithoutHeader.status, 413);

  for (const invalidContext of [
    { caseStage: "criminal-trial", role: "applicant" },
    { caseStage: "starting-case", role: "plaintiff" },
  ]) {
    const invalidResponse = await analyzeFamilyRoute(
      new NextRequest("http://localhost/api/family/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: invalidContext }),
      }),
    );
    assert.equal(invalidResponse.status, 400);
  }

  const crossArea = await analyzeFamilyRoute(
    new NextRequest("http://localhost/api/family/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          caseStage: "starting-case",
          role: "applicant",
          courtPath: "civil",
          facts: "This must not enter the Family pipeline.",
        },
      }),
    }),
  );
  assert.equal(crossArea.status, 400);
  const crossAreaBody = (await crossArea.json()) as Record<string, unknown>;
  assert.equal(crossAreaBody.ok, false);
  assert.equal("result" in crossAreaBody, false);
}

function civilInput(caseId = "civil-case-a"): CivilCanonicalIntakeInput {
  return {
    caseId,
    caseStage: "starting-case",
    issues: ["contract"],
    documents: ["statement-claim"],
    uploadedEvidenceFiles: [{ id: "civil-evidence-1", name: "agreement.pdf", size: 100, type: "application/pdf", lastModified: 1, title: "Agreement", description: "Written agreement", relatedIssue: "contract", evidenceDate: "2026-01-02", createdBy: "plaintiff", whyItMatters: "Records the agreement" }],
    yourName: "Civil Plaintiff",
    otherParty: "Civil Defendant",
    yourRole: "plaintiff",
    courtLocation: "Toronto",
    courtFileNumber: "CV-TEST-1",
    amountClaimed: "$25,000",
    limitationDeadline: "Limitation concern alpha",
    facts: "The plaintiff alleges breach of a written agreement.",
    timeline: "The agreement preceded the disputed conduct.",
    evidence: "Written agreement and communications.",
    missingEvidence: "Complete payment record.",
    damagesBreakdown: "Claimed financial loss.",
    legalRemedy: "Damages",
    settlementEfforts: "A demand was sent.",
    serviceDetails: "Service detail beta",
    urgent: "Urgency detail gamma",
    humanRightsGrounds: "Protected ground delta",
    discriminationFacts: "Discrimination fact epsilon",
    accommodationRequests: "Accommodation request zeta",
    governmentActor: "Government actor eta",
    publicDecisionOrConduct: "Public conduct theta",
    institutionalFacts: "Institutional fact iota",
    privacyRecordsFacts: "Privacy record kappa",
  };
}

const civilStages = ["starting-case", "responding", "already-started", "conference", "motion", "trial", "enforcement", "urgent", "not-sure"];
const civilRoles = ["plaintiff", "defendant", "applicant", "respondent", "moving-party", "responding-party", "other", "not-sure"];
const civilIssues = ["contract", "negligence", "institutional-negligence", "professional-negligence", "human-rights", "disability-accommodation", "employment-human-rights", "housing-human-rights", "education-human-rights", "charter", "government-public-authority", "police-conduct", "judicial-review", "tribunal-overlap", "defamation", "privacy", "property", "debt", "employment", "fraud-misrepresentation", "intentional-tort", "injunction", "estate", "motion", "appeal", "enforcement", "other"];
const civilDocuments = ["statement-claim", "statement-defence", "notice-application", "notice-motion", "affidavit-service", "affidavit", "order", "judgment", "tribunal-application", "human-rights-application", "judicial-review-materials", "demand-letter", "discovery", "trial-record", "nothing", "not-sure"];

async function callCivil(input: unknown, headers: Record<string, string> = {}) {
  return analyzeCivilRoute(new NextRequest("http://localhost/api/civil/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof input === "string" ? input : JSON.stringify({ input }),
  }));
}

async function verifyCivilCanonicalProductionRoute() {
  const response = await callCivil(civilInput());
  const body = (await response.json()) as { ok: boolean; authenticated: boolean; reasoningMode: string; result: CivilCanonicalIntakeResult };
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, false);
  assert.equal(body.reasoningMode, "deterministic-fallback");
  const result = body.result;
  const masterCase = canonicalMaster(result);
  assert.equal(result.courtPath, "civil");
  assert.equal(result.province, "Ontario");
  assert.equal(result.role, "plaintiff");
  assert.equal(result.stage, "starting-case");
  assert.equal(masterCase?.id, "civil-case-a");
  assert.equal(masterCase?.courtPath, "civil");
  assert.equal(masterCase?.province, "Ontario");
  assert.equal(masterCase?.stage, "starting-case");
  assert.ok(result.masterResultPatch.caseSystemAssembly);
  assert.equal(masterCase?.version, "1.1.0");
  assert.equal(
    (result.masterResultPatch.caseSystemAssembly as Record<string, unknown>).version,
    "1.6.0",
  );
  assert.equal(
    (result.masterResultPatch.courtSimplifiedArchitecture as Record<string, unknown>).migrationLayer,
    "BrainMigrationLayer",
  );
  assert.notDeepEqual(masterCase, result.civilMasterResult.masterCase);
  assert.deepEqual(result.masterResultPatch.civilMasterResult, result.civilMasterResult);
  assert.deepEqual(result.masterResultPatch.civilMasterCase, result.civilMasterResult.masterCase);
  assert.deepEqual(result.masterResultPatch.civilWorkflow, result.civilMasterResult.workflow);
  assert.deepEqual(result.masterResultPatch.civilEvidence, result.civilMasterResult.evidence);
  assert.deepEqual(result.masterResultPatch.civilFormRouting, result.civilMasterResult.formRouting);
  assert.deepEqual(result.masterResultPatch.civilStrategy, result.civilMasterResult.strategy);
  assert.deepEqual(result.masterResultPatch.civilNarrative, result.civilMasterResult.narrative);
  assert.deepEqual(result.masterResultPatch.civilCaseFileCatalog, result.civilMasterResult.masterCase.caseFileCatalog);
  assert.equal("familyMasterResult" in result.masterResultPatch, false);

  const rawNarrative = result.brain.intelligence.normalizedIntake.rawUserText;
  const specializedNarrative = result.civilMasterResult.masterCase.summary;
  for (const expected of [
    "Civil Plaintiff", "Civil Defendant", "plaintiff", "Toronto", "CV-TEST-1",
    "$25,000", "Contract / agreement dispute", "Statement of Claim", "breach of a written agreement",
    "agreement preceded", "Written agreement and communications", "Complete payment record",
    "Claimed financial loss", "Damages", "A demand was sent", "Limitation concern alpha",
    "Service detail beta", "Urgency detail gamma", "Protected ground delta",
    "Discrimination fact epsilon", "Accommodation request zeta", "Government actor eta",
    "Public conduct theta", "Institutional fact iota", "Privacy record kappa",
    "agreement.pdf", "application/pdf", "lastModified=1", "2026-01-02", "Records the agreement",
  ]) {
    assert.ok(rawNarrative.includes(expected), `Brain narrative omitted: ${expected}`);
    assert.ok(specializedNarrative.includes(expected), `Civil engine summary omitted: ${expected}`);
  }

  const isolated = await callCivil(civilInput("civil-case-b"));
  const isolatedBody = (await isolated.json()) as { result: CivilCanonicalIntakeResult };
  assert.equal(canonicalMaster(isolatedBody.result)?.id, "civil-case-b");
  assert.notEqual(canonicalMaster(isolatedBody.result)?.id, masterCase?.id);
}

function verifyCivilUiChoicesMatchRoute() {
  for (const caseStage of civilStages) assert.equal(isCivilInput({ ...civilInput(), caseStage }), true);
  for (const yourRole of civilRoles) assert.equal(isCivilInput({ ...civilInput(), yourRole }), true);
  for (const issue of civilIssues) assert.equal(isCivilInput({ ...civilInput(), issues: [issue] }), true);
  for (const document of civilDocuments) assert.equal(isCivilInput({ ...civilInput(), documents: [document] }), true);
}

async function verifyCivilAuthenticationAndPreservation() {
  const calls: string[] = [];
  const deniedPost = createCivilAnalyzePost({
    authenticate: async () => ({ id: "user-a" }) as never,
    loadOwnedMasterResult: async () => { calls.push("ownership"); return null; },
    analyze: async (...args) => { calls.push("analyze"); return runCivilIntakeCanonicalIntegration(...args); },
    hasExternalAiKey: () => true,
  });
  const denied = await deniedPost(new NextRequest("http://localhost/api/civil/analyze", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
    body: JSON.stringify({ input: civilInput("another-users-case") }),
  }));
  assert.equal(denied.status, 404);
  assert.deepEqual(calls, ["ownership"]);

  let anonymousExternalEligibility: boolean | undefined;
  const anonymousPost = createCivilAnalyzePost({
    authenticate: async () => null,
    hasExternalAiKey: () => true,
    analyze: async (input, options) => {
      anonymousExternalEligibility = options?.allowExternalCognition;
      return runCivilIntakeCanonicalIntegration(input, options);
    },
  });
  assert.equal((await anonymousPost(new NextRequest("http://localhost/api/civil/analyze", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: civilInput() }),
  }))).status, 200);
  assert.equal(anonymousExternalEligibility, false);

  const baseline = await runCivilIntakeCanonicalIntegration(civilInput("owned-case"));
  const existingMasterCase = {
    ...(baseline.masterResultPatch.masterCase as Record<string, unknown>),
    title: "Preserved unrelated title",
    userId: "user-a",
    status: "paused",
    documents: [{ id: "existing-document" }],
  };
  const ownedPost = createCivilAnalyzePost({
    authenticate: async () => ({ id: "user-a" }) as never,
    loadOwnedMasterResult: async () => ({ masterCase: existingMasterCase }),
    hasExternalAiKey: () => false,
  });
  const ownedResponse = await ownedPost(new NextRequest("http://localhost/api/civil/analyze", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
    body: JSON.stringify({ input: civilInput("owned-case") }),
  }));
  assert.equal(ownedResponse.status, 200);
  const ownedBody = (await ownedResponse.json()) as { result: CivilCanonicalIntakeResult };
  const migrated = canonicalMaster(ownedBody.result);
  assert.equal(migrated?.title, "Preserved unrelated title");
  assert.equal(migrated?.userId, "user-a");
  assert.equal(migrated?.status, "paused");
  assert.deepEqual(migrated?.documents, [{ id: "existing-document" }]);
}

async function verifyCivilRouteRejections() {
  assert.equal((await callCivil("{not-json")).status, 400);
  assert.equal((await callCivil(civilInput(), { "Content-Length": "200001" })).status, 413);
  assert.equal((await callCivil({ ...civilInput(), facts: "x".repeat(200_001) })).status, 413);
  assert.equal((await callCivil({ ...civilInput(), yourRole: "family-applicant" })).status, 400);
  assert.equal((await callCivil({ ...civilInput(), caseStage: "criminal-trial" })).status, 400);
  assert.equal((await callCivil({ ...civilInput(), unknownField: "rejected" })).status, 400);
  assert.equal((await callCivil({ ...civilInput(), courtPath: "family" })).status, 400);
  assert.equal((await callCivil({ ...civilInput(), userId: "another-user" })).status, 400);
}

async function main() {
  delete process.env.OPENAI_API_KEY;

  await verifySmallClaims();
  await verifyFamily();
  await verifyFamilyRouteRejections();
  verifyCivilUiChoicesMatchRoute();
  await verifyCivilCanonicalProductionRoute();
  await verifyCivilRouteRejections();
  await verifyCivilAuthenticationAndPreservation();

  console.log(
    "Three-area production contract verification passed: Small Claims, Family, and Civil use canonical MasterCaseSchema and CaseSystemAssembly integration; specialized outputs survive the Civil JSON boundary by value; production route validation, deterministic anonymous fallback, selected-case identity, and court-area isolation passed.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
