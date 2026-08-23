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
import {
  analyzeSmallClaimsWithBrain,
  type SmallClaimsIntelligenceInput,
} from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { POST as analyzeSmallClaimsRoute } from "../../app/api/small-claims/analyze/route";
import { buildFamilyAnalysis } from "../../app/builder/_components/familyAnalysis";
import { buildCivilGeneratedQuestions } from "../../app/builder/_components/civilAnalysis";
import { baseScenarios } from "./scenarioRegistry";

function canonicalMaster(result: { masterResultPatch: Record<string, unknown> }) {
  return result.masterResultPatch.masterCase as
    | Record<string, unknown>
    | undefined;
}

function smallClaimsInput(): SmallClaimsIntelligenceInput {
  return {
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
  };
}

async function verifySmallClaims() {
  const result = await analyzeSmallClaimsWithBrain(smallClaimsInput());

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

// Route-level counterpart to the Family and Civil production-route checks.
// Small Claims previously had engine coverage only, so when the route stopped
// returning reasoningMode the contract suite still passed.
async function verifySmallClaimsCanonicalProductionRoute() {
  const response = await analyzeSmallClaimsRoute(
    new NextRequest("http://localhost/api/small-claims/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: smallClaimsInput() }),
    }),
  );
  const body = (await response.json()) as {
    ok: boolean;
    authenticated: boolean;
    reasoningMode: string;
    analysisAvailable: boolean;
  };
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, false);
  assert.equal(body.reasoningMode, "deterministic-fallback");
  assert.equal(body.analysisAvailable, false);
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

/**
 * The same defect as verifyFamilyOverviewQuestionsReachAnalysis above, on the
 * Civil path, found by the browser scenario harness: every Civil scenario in a
 * 25-scenario sweep showed the placeholder.
 *
 * buildCivilAnalysisFromMaster received only civilMasterResult, whose
 * missingInformation holds evidence-gap statements ("Timeline evidence is
 * weak") and never a question, and it never set nextBestActions. The brain had
 * generated real questions for Civil all along; the mapping discarded them.
 *
 * This drives the real /api/civil/analyze route and then the real mapping, and
 * also covers the second half of the ask: once Civil starts asking questions it
 * must not ask what the recorded documents already answer.
 */
async function verifyCivilOverviewQuestionsReachAnalysis() {
  const documents = ["nothing"];
  const response = await callCivil({ ...civilInput("civil-overview-questions"), documents });
  const body = (await response.json()) as { ok: boolean; result: CivilCanonicalIntakeResult };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);

  const questions = buildCivilGeneratedQuestions(body.result.brain.intelligence, documents);

  // Reproduces the panel's own selection logic.
  const selected = questions.find((item) => item.trim().endsWith("?")) || OVERVIEW_PLACEHOLDER;

  assert.notEqual(
    selected,
    OVERVIEW_PLACEHOLDER,
    "Civil overview fell back to the placeholder question instead of a generated one.",
  );
  assert.ok(
    selected.trim().endsWith("?"),
    `Civil overview question must be a question, received ${JSON.stringify(selected)}`,
  );

  // With a claim and a defence on record, the filed and served questions are
  // already answered and must not be asked.
  const onRecord = ["statement-claim", "statement-defence"];
  const answeredResponse = await callCivil({
    ...civilInput("civil-overview-answered"),
    documents: onRecord,
  });
  const answeredBody = (await answeredResponse.json()) as { ok: boolean; result: CivilCanonicalIntakeResult };
  assert.equal(answeredResponse.status, 200);

  const answeredQuestions = buildCivilGeneratedQuestions(
    answeredBody.result.brain.intelligence,
    onRecord,
  );

  for (const alreadyAnswered of ["Has anything already been filed?", "Has anything already been served?"]) {
    assert.equal(
      answeredQuestions.includes(alreadyAnswered),
      false,
      `Civil asked ${JSON.stringify(alreadyAnswered)} with ${onRecord.join(", ")} on record.`,
    );
  }

  assert.ok(
    answeredQuestions.length > 0,
    "Filtering answered questions must not leave Civil with nothing to ask.",
  );
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

/**
 * Real bug found on the deployed site (reported 2026-08-21).
 *
 * A tester selected the Family path in the builder and entered a story whose
 * operative claim is defamation. The system accepted it as a Family matter with
 * no indication that the false-statement part belongs to a different court.
 * The engine had already detected both domains — primaryClaimTypes came back
 * ["defamation","family-parenting"] — but nothing acted on the split.
 *
 * This drives the ACTUAL /api/family/analyze route, not the AI Case Partner
 * path, because that is where the bug was found. courtPath deliberately stays
 * "family": the declared path still selects the engine, forms and workflow, and
 * the conflict is surfaced as a warning instead of a silent reroute.
 */
async function verifyFamilyCrossCourtAreaConflictWarning() {
  const testerStory =
    "my uncles ex girlfriend sent text messages to my uncle and my dad saying I was a prostitute which is not true and she did this because I was going to testify in my uncle's custody case";

  const familyIntake = (facts: string) => ({
    caseStage: "not-sure",
    role: "applicant",
    relationshipStatus: "",
    issues: [],
    filedDocuments: [],
    completedForms: [],
    receivedForms: [],
    yourName: "Conflict Test",
    otherParty: "Other Party",
    childrenInfo: "",
    currentLivingSituation: "",
    pastLivingHistory: "",
    facts,
    timeline: "",
    evidence: "Text messages.",
    missingEvidence: "",
    goal: "Address the situation.",
    urgent: "",
  });

  const post = async (facts: string) =>
    analyzeFamilyRoute(
      new NextRequest("http://localhost/api/family/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: familyIntake(facts) }),
      }),
    );

  const conflictResponse = await post(testerStory);
  const conflictBody = (await conflictResponse.json()) as {
    ok: boolean;
    result: FamilyCanonicalIntakeResult;
  };

  assert.equal(conflictResponse.status, 200);
  assert.equal(conflictBody.ok, true);

  // The declared path still decides the engine; only the warning is added.
  assert.equal(conflictBody.result.courtPath, "family");

  const claimTypes = conflictBody.result.brain.intelligence.primaryClaimTypes;
  assert.ok(
    claimTypes.includes("defamation"),
    `Expected defamation to be detected, got ${JSON.stringify(claimTypes)}`,
  );
  assert.ok(
    claimTypes.includes("family-parenting"),
    `Expected family-parenting to be detected, got ${JSON.stringify(claimTypes)}`,
  );

  const warnings = conflictBody.result.brain.intelligence.systemWarnings;
  const conflictWarning = warnings.find((warning) =>
    /span more than one court path/i.test(warning),
  );

  assert.ok(
    conflictWarning,
    "Family route must warn when detected issues span more than one court path.",
  );
  assert.match(String(conflictWarning), /defamation/i);
  assert.match(String(conflictWarning), /parenting or custody/i);

  // A single-area Family story must stay quiet, or the warning is noise.
  const plainResponse = await post(
    "I need a parenting order setting out custody and parenting time for my two children, and a support order.",
  );
  const plainBody = (await plainResponse.json()) as {
    ok: boolean;
    result: FamilyCanonicalIntakeResult;
  };

  assert.equal(plainResponse.status, 200);
  assert.equal(
    plainBody.result.brain.intelligence.systemWarnings.some((warning) =>
      /span more than one court path/i.test(warning),
    ),
    false,
    "A single-area Family intake must not raise a cross-court-area warning.",
  );
}

/**
 * Second half of the bug reported from production testing on 2026-08-21: the
 * case overview showed the literal placeholder "What important fact should be
 * confirmed next?" as if it were generated content.
 *
 * The panel picks that question by scanning analysis.missingInformation and
 * analysis.nextBestActions for a string ending in "?", falling back to the
 * placeholder when neither has one. buildFamilyAnalysis supplied only
 * familyMasterResult.normalized statements and never set nextBestActions, so
 * the fallback always won even though the engine had generated real questions.
 *
 * This drives the real /api/family/analyze route and then the real
 * buildFamilyAnalysis mapping, so it covers the whole path the tester hit.
 */
const OVERVIEW_PLACEHOLDER = "What important fact should be confirmed next?";

async function verifyFamilyOverviewQuestionsReachAnalysis() {
  const testerStory =
    "my uncles ex girlfriend sent text messages to my uncle and my dad saying I was a prostitute which is not true and she did this because I was going to testify in my uncle's custody case";

  const response = await analyzeFamilyRoute(
    new NextRequest("http://localhost/api/family/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          caseStage: "not-sure",
          role: "applicant",
          relationshipStatus: "",
          issues: [],
          filedDocuments: [],
          completedForms: [],
          receivedForms: [],
          yourName: "Overview Test",
          otherParty: "Other Party",
          childrenInfo: "",
          currentLivingSituation: "",
          pastLivingHistory: "",
          facts: testerStory,
          timeline: "",
          evidence: "Text messages.",
          missingEvidence: "",
          goal: "Address the situation.",
          urgent: "",
        },
      }),
    }),
  );

  const body = (await response.json()) as {
    ok: boolean;
    result: FamilyCanonicalIntakeResult;
  };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);

  const analysis = buildFamilyAnalysis(testerStory, body.result);

  // Reproduces the panel's own selection logic.
  const selected =
    (analysis.missingInformation || []).find((item) => item.trim().endsWith("?")) ||
    (analysis.nextBestActions || []).find((item) => item.trim().endsWith("?")) ||
    OVERVIEW_PLACEHOLDER;

  assert.notEqual(
    selected,
    OVERVIEW_PLACEHOLDER,
    "Family overview fell back to the placeholder question instead of a generated one.",
  );
  assert.ok(
    selected.trim().endsWith("?"),
    `Selected overview question must be a question, got ${JSON.stringify(selected)}`,
  );

  // nextBestActions was never populated for Family before this.
  assert.ok(
    (analysis.nextBestActions || []).length > 0,
    "Family analysis must populate nextBestActions.",
  );
  assert.ok(
    (analysis.nextBestActions || []).every((item) => item.trim().endsWith("?")),
    "Family nextBestActions must contain only generated questions.",
  );

  // Internal fallback language must never reach these user-facing arrays.
  // intelligence.nextBestActions begins with "Confirm OpenAI configuration and
  // rerun the analysis.", which is why it is not used as a source.
  const userFacing = [
    ...(analysis.missingInformation || []),
    ...(analysis.nextBestActions || []),
  ].join(" ");

  for (const phrase of [
    "Confirm OpenAI configuration",
    "AI reasoning layer",
    "structured GPT cognition",
    "OPENAI_API_KEY",
  ]) {
    assert.equal(
      userFacing.toLowerCase().includes(phrase.toLowerCase()),
      false,
      `Family overview content must not contain internal language: ${phrase}`,
    );
  }
}

/**
 * Regression for the injunction-jurisdiction warning built alongside the
 * CIV-PROPERTY-INJUNCTION-NEIGHBOR-001 scenario. That scenario is the
 * deliberate opposite of CIV-EMPLOYMENT-WRONGFUL-DISMISSAL-001's trigger:
 * modest damages ($3,000, nowhere near the $50,000 Small Claims limit), but a
 * remedy -- a court order requiring an encroaching shed and tree roots to be
 * removed -- that Small Claims Court cannot grant regardless of amount.
 * detectOverLimitClaimAmount would stay correctly silent here; nothing else
 * existed to catch the case belonging in Civil for a reason unrelated to
 * dollar amount, until courtSimplifiedBrain's seeksInjunctiveRelief check was
 * added.
 *
 * Pulls the scenario's own facts and amount by id from scenarioRegistry
 * rather than duplicating them, so the fixture and this regression cannot
 * drift apart. Drives the real /api/civil/analyze and /api/small-claims/analyze
 * routes -- not the bare engine functions -- so this covers the same
 * request/response boundary a real intake crosses.
 */
async function verifyInjunctionJurisdictionWarning() {
  const scenario = baseScenarios.find(
    (item) => item.id === "CIV-PROPERTY-INJUNCTION-NEIGHBOR-001",
  );
  assert.ok(scenario, "CIV-PROPERTY-INJUNCTION-NEIGHBOR-001 must exist in the registry");
  const facts = String(scenario!.intakeFacts.facts);
  const amountClaimed = String(scenario!.intakeFacts.amountClaimed);

  const civilResponse = await callCivil({
    ...civilInput("injunction-jurisdiction-civil"),
    issues: ["property", "injunction"],
    documents: ["nothing"],
    yourRole: "plaintiff",
    facts,
    amountClaimed,
    legalRemedy:
      "A court order requiring removal of the encroaching structure and removal of the tree or remediation of the roots; ongoing relief, not primarily a money judgment.",
  });
  const civilBody = (await civilResponse.json()) as { ok: boolean; result: CivilCanonicalIntakeResult };
  assert.equal(civilResponse.status, 200);
  assert.equal(civilBody.ok, true);
  assert.ok(
    civilBody.result.civilMasterResult.masterCase.civilCaseTypes.includes("property-damage"),
    "Civil classification must reach property-damage, not stay unclassified.",
  );
  const civilWarnings = civilBody.result.brain.intelligence.systemWarnings;
  assert.ok(
    civilWarnings.some((warning) => /injunction/i.test(warning) && /Superior Court/i.test(warning)),
    `Civil must surface a confirming note that injunctive relief belongs in Superior Court, not Small Claims. Received: ${JSON.stringify(civilWarnings)}`,
  );
  assert.equal(
    civilWarnings.some((warning) => /exceeds the Ontario Small Claims Court limit/i.test(warning)),
    false,
    "The over-limit warning must not fire on a $3,000 claim; this scenario tests the injunction trigger, not the amount trigger.",
  );

  const smallClaimsResponse = await analyzeSmallClaimsRoute(
    new NextRequest("http://localhost/api/small-claims/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          ...smallClaimsInput(),
          caseStage: "starting-case",
          issues: ["property-damage"],
          filedDocuments: ["nothing"],
          yourRole: "Plaintiff / claimant",
          facts,
          amountClaimed,
          goal: "A court order requiring removal of the encroaching structure and the tree, or remediation of the roots.",
        },
      }),
    }),
  );
  const smallClaimsBody = (await smallClaimsResponse.json()) as {
    ok: boolean;
    result: { analysis: { intelligence?: { systemWarnings?: string[] } } };
  };
  assert.equal(smallClaimsResponse.status, 200);
  assert.equal(smallClaimsBody.ok, true);
  const smallClaimsWarnings = smallClaimsBody.result.analysis.intelligence?.systemWarnings || [];
  assert.ok(
    smallClaimsWarnings.some(
      (warning) => /injunction/i.test(warning) && /cannot grant/i.test(warning) && /Superior Court/i.test(warning),
    ),
    `Small Claims must warn that it cannot grant injunctions regardless of amount when this fact pattern is misfiled there. Received: ${JSON.stringify(smallClaimsWarnings)}`,
  );
  assert.equal(
    smallClaimsWarnings.some((warning) => /exceeds the Ontario Small Claims Court limit/i.test(warning)),
    false,
    "The $3,000 amount is well under the limit; the over-limit warning must stay silent so this is clearly the injunction trigger, not the amount trigger.",
  );

  // Negative control: an ordinary money-only property-damage claim, same court
  // path, no injunction language. The warning must not fire on every
  // property-damage case -- only when injunctive relief is actually sought.
  const moneyOnlyResponse = await analyzeSmallClaimsRoute(
    new NextRequest("http://localhost/api/small-claims/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          ...smallClaimsInput(),
          caseStage: "starting-case",
          issues: ["property-damage"],
          filedDocuments: ["nothing"],
          yourRole: "Plaintiff / claimant",
          facts: "The neighbor's tree fell during a storm and damaged our fence. We are seeking payment for the cost of repairing the fence.",
          amountClaimed: "$2,800",
          goal: "Reimbursement for fence repair.",
        },
      }),
    }),
  );
  const moneyOnlyBody = (await moneyOnlyResponse.json()) as {
    ok: boolean;
    result: { analysis: { intelligence?: { systemWarnings?: string[] } } };
  };
  assert.equal(moneyOnlyResponse.status, 200);
  const moneyOnlyWarnings = moneyOnlyBody.result.analysis.intelligence?.systemWarnings || [];
  assert.equal(
    moneyOnlyWarnings.some((warning) => /injunction/i.test(warning)),
    false,
    `An ordinary money-only property claim must not trigger the injunction warning. Received: ${JSON.stringify(moneyOnlyWarnings)}`,
  );
}

/** Drives the real Small Claims route with a given amountClaimed and returns
 *  the over-limit-related warnings it produced. Facts are fixed and unrelated
 *  to injunctions, so only the amount varies between calls. */
async function overLimitWarningsForAmount(amountClaimed: string): Promise<string[]> {
  const response = await analyzeSmallClaimsRoute(
    new NextRequest("http://localhost/api/small-claims/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          ...smallClaimsInput(),
          caseStage: "starting-case",
          issues: ["unpaid-money"],
          filedDocuments: ["nothing"],
          yourRole: "Plaintiff / claimant",
          facts: "A contract dispute over unpaid work.",
          amountClaimed,
          goal: "Payment owed.",
        },
      }),
    }),
  );
  const body = (await response.json()) as {
    ok: boolean;
    result: { analysis: { intelligence?: { systemWarnings?: string[] } } };
  };
  assert.equal(response.status, 200, `Route must accept amountClaimed=${JSON.stringify(amountClaimed)}`);
  assert.equal(body.ok, true);
  return (body.result.analysis.intelligence?.systemWarnings || []).filter((warning) =>
    /exceeds the Ontario Small Claims Court limit/i.test(warning),
  );
}

/**
 * Guards the $50,000 boundary in detectOverLimitClaimAmount directly, across
 * the real /api/small-claims/analyze route. The scenario fixtures never assert
 * this: CIV-EMPLOYMENT-WRONGFUL-DISMISSAL-001 sits far above the limit
 * ($850,000) and CIV-PROPERTY-INJUNCTION-NEIGHBOR-001 and
 * SC-CONTRACTOR-INCOMPLETE-RENOVATION-001 sit comfortably below it ($3,000 and
 * $48,500) -- none of the three exercises the exact boundary values where an
 * off-by-one would hide.
 *
 * This is the same class of bug as the historical dollar-parsing regex fix
 * (064fd55, from a prior session): that bug truncated un-comma'd five- and
 * six-digit amounts ("85000" read as 850), which would have silently defeated
 * this exact check by making an over-limit claim parse as a small one. Both
 * comma-formatted and un-comma'd forms are asserted here so a regression in
 * either parsing path is caught, not just a regression in the comparison
 * itself.
 *
 * The comparison in courtSimplifiedBrain.ts is strict (`>`), so $50,000
 * exactly must stay silent -- it is at the limit, not over it.
 */
async function verifyOverLimitAmountBoundary() {
  for (const amountClaimed of ["$49,999", "49999"]) {
    const warnings = await overLimitWarningsForAmount(amountClaimed);
    assert.equal(
      warnings.length,
      0,
      `amountClaimed=${JSON.stringify(amountClaimed)} is $1 under the limit and must stay silent. Received: ${JSON.stringify(warnings)}`,
    );
  }

  for (const amountClaimed of ["$50,000", "50000"]) {
    const warnings = await overLimitWarningsForAmount(amountClaimed);
    assert.equal(
      warnings.length,
      0,
      `amountClaimed=${JSON.stringify(amountClaimed)} is exactly at the limit and must stay silent -- the comparison is strictly greater-than. Received: ${JSON.stringify(warnings)}`,
    );
  }

  for (const amountClaimed of ["$50,001", "50001"]) {
    const warnings = await overLimitWarningsForAmount(amountClaimed);
    assert.equal(
      warnings.length,
      1,
      `amountClaimed=${JSON.stringify(amountClaimed)} is $1 over the limit and must fire exactly one over-limit warning. Received: ${JSON.stringify(warnings)}`,
    );
    assert.match(warnings[0], /\$50,001/, `The warning must report the actual claimed amount, not a truncated or rounded figure. Received: ${warnings[0]}`);
  }
}

async function main() {
  delete process.env.OPENAI_API_KEY;

  await verifySmallClaims();
  await verifySmallClaimsCanonicalProductionRoute();
  await verifyFamily();
  await verifyFamilyRouteRejections();
  await verifyFamilyCrossCourtAreaConflictWarning();
  await verifyFamilyOverviewQuestionsReachAnalysis();
  verifyCivilUiChoicesMatchRoute();
  await verifyCivilOverviewQuestionsReachAnalysis();
  await verifyInjunctionJurisdictionWarning();
  await verifyOverLimitAmountBoundary();
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
