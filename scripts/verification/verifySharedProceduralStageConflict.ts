import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runCourtSimplifiedBrain } from "../../src/lib/case-system/intelligence/courtSimplifiedBrain";
import {
  analyzeSmallClaimsWithBrain,
  type SmallClaimsIntelligenceInput,
} from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";

const FALSE_STAGE_CONFLICT = "Stage conflict: starting and responding signals both appear";
const courtPaths = ["small-claims", "family", "civil"] as const;

function stageWarnings(output: Awaited<ReturnType<typeof runCourtSimplifiedBrain>>) {
  return output.intelligence.contradictions.filter(
    (item) => item.title === FALSE_STAGE_CONFLICT,
  );
}

function smallClaimsInput(
  caseStage: SmallClaimsIntelligenceInput["caseStage"] | undefined,
): SmallClaimsIntelligenceInput {
  return {
    caseStage: caseStage as SmallClaimsIntelligenceInput["caseStage"],
    issues: ["defamation-reputation"],
    filedDocuments: ["plaintiffs-claim", "defence", "enforcement-documents"],
    uploadedEvidenceFiles: [],
    yourName: "Small Claims Stage Test",
    yourAddress: "1 Test Street",
    yourCity: "Toronto",
    yourProvince: "Ontario",
    yourPostalCode: "M1M 1M1",
    yourPhone: "416-555-0100",
    yourEmail: "stage-test@example.test",
    otherParty: "Other Party",
    otherPartyPhone: "",
    otherPartyEmail: "",
    yourRole: "Defendant / responding party",
    courtLocation: "Toronto",
    claimNumber: "SC-STAGE-1",
    amountClaimed: "",
    defendantAddress: "2 Test Street",
    agreementDetails: "",
    paymentHistory: "",
    damagesBreakdown: "",
    serviceDetails: "",
    deadlineDetails: "",
    facts: "Synthetic intake only; stage is unconfirmed.",
    timeline: "",
    evidence: "",
    missingEvidence: "",
    settlementEfforts: "",
    defenceResponse: "",
    goal: "Review the case.",
    urgent: "",
  };
}

async function main() {
for (const caseStage of ["not-sure", undefined] as const) {
  const output = await analyzeSmallClaimsWithBrain(
    smallClaimsInput(caseStage),
    { allowExternalCognition: false },
  );
  assert.equal(output.payload.caseStage, "not-sure");
  assert.equal(output.analysis.caseStage, "Stage unclear");
  assert.equal(output.analysis.intelligence.normalizedIntake.stage, "not-sure");
  assert.equal(output.analysis.intelligence.proceduralPosture.stage, "not-sure");
}

for (const caseStage of [
  "starting-case",
  "responding",
  "already-started",
  "conference",
  "motion",
  "trial",
  "enforcement",
] as const) {
  const output = await analyzeSmallClaimsWithBrain(
    smallClaimsInput(caseStage),
    { allowExternalCognition: false },
  );
  assert.equal(output.payload.caseStage, caseStage);
  assert.equal(output.analysis.intelligence.proceduralPosture.stage, caseStage);
}

for (const courtPath of courtPaths) {
  const caseId = `${courtPath}-already-started`;
  const output = await runCourtSimplifiedBrain({
    caseId,
    courtPath,
    province: "Ontario",
    stage: "already-started",
    rawUserText: [
      "Stage selected: already-started",
      "User role: Plaintiff / claimant",
      "Workflow label: start response workspace",
      "Existing document: defence",
    ].join("\n"),
    allowExternalCognition: false,
  });

  assert.equal(output.intelligence.normalizedIntake.stage, "already-started");
  assert.equal(output.intelligence.proceduralPosture.stage, "already-started");
  assert.equal(
    (output.masterResultPatch.masterCase as { stage?: string; id?: string }).stage,
    "already-started",
  );
  assert.equal(
    (output.masterResultPatch.masterCase as { id?: string }).id,
    caseId,
    "A court area must retain its own selected case ID",
  );
  assert.deepEqual(
    stageWarnings(output),
    [],
    `${courtPath} must not convert role or workflow labels into a stage conflict`,
  );
}

const actualConflict = await runCourtSimplifiedBrain({
  courtPath: "small-claims",
  province: "Ontario",
  stage: "starting-case",
  rawUserText: [
    "Stage selected: starting-case",
    "Stage status: responding",
  ].join("\n"),
  allowExternalCognition: false,
});
assert.equal(stageWarnings(actualConflict).length, 1);
assert.equal(
  actualConflict.intelligence.proceduralPosture.stage,
  "starting-case",
  "The selected stage remains authoritative when a separate structured status conflicts",
);
assert.match(
  stageWarnings(actualConflict)[0].description,
  /intake contains signals/i,
  "A genuine structured conflict must retain the neutral existing warning style",
);

const unconfirmed = await runCourtSimplifiedBrain({
  courtPath: "civil",
  province: "Ontario",
  stage: "not-sure",
  rawUserText: "Plaintiff and defendant workflow labels mention starting and responding.",
  allowExternalCognition: false,
});
assert.equal(unconfirmed.intelligence.normalizedIntake.stage, "not-sure");
assert.equal(unconfirmed.intelligence.proceduralPosture.stage, "not-sure");
assert.deepEqual(stageWarnings(unconfirmed), []);

const smallClaimsAdapter = readFileSync(
  "src/lib/case-system/intelligence/smallClaimsIntelligenceEngine.ts",
  "utf8",
);
const familyAdapter = readFileSync(
  "src/lib/case-system/orchestration/familyIntakeCanonicalAdapter.ts",
  "utf8",
);
const civilAdapter = readFileSync(
  "src/lib/case-system/orchestration/civilIntakeCanonicalAdapter.ts",
  "utf8",
);
for (const [source, courtPath] of [
  [smallClaimsAdapter, "small-claims"],
  [familyAdapter, "family"],
  [civilAdapter, "civil"],
] as const) {
  assert.match(
    source,
    new RegExp(`runCourtSimplifiedBrain\\(\\{[\\s\\S]*courtPath: "${courtPath}"`),
    `${courtPath} must enter the shared CourtSimplifiedBrain stage path`,
  );
}

console.log(
  "Shared procedural-stage conflict verification passed: explicit stages remain authoritative across Small Claims, Family, and Civil; only conflicting structured stage inputs warn.",
);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
