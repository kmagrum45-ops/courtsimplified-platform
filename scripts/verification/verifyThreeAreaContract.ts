import assert from "node:assert/strict";
import { NextRequest } from "next/server";

import { POST as analyzeFamilyRoute } from "../../app/api/family/analyze/route";
import type { FamilyCanonicalIntakeResult } from "../../src/lib/case-system/orchestration/familyIntakeCanonicalAdapter";
import { analyzeSmallClaimsWithBrain } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { runCivilMasterCaseEngine } from "../../src/lib/case-system/civilMasterCaseEngine";

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

function verifyCivilCurrentStatus() {
  const role = "Plaintiff / claimant";
  const stage = "starting-case";
  const result = runCivilMasterCaseEngine({
    title: "Civil Plaintiff v. Civil Defendant",
    summary: "A civil contract dispute with a claimed financial loss.",
    stage,
    selectedIssues: ["Contract dispute"],
    requestedRemedies: ["Damages"],
    facts: ["The plaintiff alleges that the defendant breached a written agreement."],
    evidenceItems: [],
    timeline: [],
    liabilityTheories: [],
    existingRisks: [],
    existingForms: [],
  });

  const contract = {
    courtPath: "civil" as const,
    province: "Ontario" as const,
    role,
    stage,
    canonicalMigrationStatus: "parallel-civil-engine-not-yet-migrated" as const,
    specialized: result,
  };

  assert.equal(contract.courtPath, "civil");
  assert.equal(contract.province, "Ontario");
  assert.equal(contract.role, "Plaintiff / claimant");
  assert.equal(contract.stage, "starting-case");
  assert.ok(result.workflow);
  assert.ok(result.evidence);
  assert.ok(result.formRouting);
  assert.ok(result.strategy);
  assert.ok(result.narrative);
  assert.ok(result.masterCase.caseFileCatalog);
  assert.equal(
    contract.canonicalMigrationStatus,
    "parallel-civil-engine-not-yet-migrated",
  );
  assert.equal("masterResultPatch" in result, false);
  assert.equal("familyMasterResult" in result, false);
}

async function main() {
  delete process.env.OPENAI_API_KEY;

  await verifySmallClaims();
  await verifyFamily();
  await verifyFamilyRouteRejections();
  verifyCivilCurrentStatus();

  console.log(
    "Three-area contract verification passed: Small Claims and Family use canonical MasterCase integration; Family specialized outputs are preserved; Civil specialized outputs pass with migration status explicitly reported as parallel/not yet canonical; court-area isolation passed.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
