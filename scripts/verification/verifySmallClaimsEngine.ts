import assert from "node:assert/strict";

import type { SmallClaimsIntelligenceInput } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";

type AnalyzeSmallClaims = typeof import(
  "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine"
)["analyzeSmallClaimsWithBrain"];

type SmallClaimsResult = Awaited<ReturnType<AnalyzeSmallClaims>>;

function buildInput(
  patch: Partial<SmallClaimsIntelligenceInput> = {},
): SmallClaimsIntelligenceInput {
  return {
    caseStage: "starting-case",
    issues: ["contract-dispute", "work-or-services"],
    filedDocuments: ["nothing"],
    uploadedEvidenceFiles: [
      {
        id: "invoice-1",
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
    paymentHistory:
      "I paid $4,200 by e-transfer on January 10, 2026.",
    damagesBreakdown:
      "$4,200 paid for incomplete work, supported by the invoice and payment receipt.",
    serviceDetails: "Nothing has been served because the claim has not been filed.",
    deadlineDetails: "The work was due on January 31, 2026.",
    facts:
      "The contractor accepted payment but did not complete the agreed repairs. Messages acknowledge the unfinished work.",
    timeline:
      "January 10, 2026: quote accepted and payment sent. January 31, 2026: work remained unfinished.",
    evidence:
      "Written quote, invoice, e-transfer receipt, messages, photographs, and a repair estimate.",
    missingEvidence: "None known yet.",
    settlementEfforts:
      "I requested completion or repayment in writing, but the contractor did not resolve it.",
    defenceResponse: "",
    goal: "Recover the $4,200 paid for the incomplete work.",
    urgent: "No urgent issue.",
    ...patch,
  };
}

function getMasterCase(result: SmallClaimsResult) {
  const masterCase = result.masterResultPatch.masterCase as
    | Record<string, unknown>
    | undefined;

  assert.ok(masterCase, "MasterCaseSchema was not produced");
  return masterCase;
}

function assertNoUnknownContextWarnings(value: unknown, scenario: string) {
  const text = JSON.stringify(value).toLowerCase();

  assert.equal(
    text.includes("jurisdiction is unknown"),
    false,
    `${scenario}: generated an incorrect jurisdiction warning`,
  );
  assert.equal(
    text.includes("procedural stage is uncertain"),
    false,
    `${scenario}: generated an incorrect procedural-stage warning`,
  );
}

async function main() {
  delete process.env.OPENAI_API_KEY;

  const { analyzeSmallClaimsWithBrain } = await import(
    "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine"
  );

const claimantResult = await analyzeSmallClaimsWithBrain(buildInput());
const claimantMasterCase = getMasterCase(claimantResult);

assert.equal(claimantResult.analysis.courtPath, "small-claims");
assert.equal(claimantResult.payload.courtPath, "small-claims");
assert.equal(claimantMasterCase.courtPath, "small-claims");
assert.equal(claimantMasterCase.province, "Ontario");
assert.equal(claimantMasterCase.stage, "starting-case");
assert.ok(
  claimantResult.analysis.requiredNextForms.some((form) =>
    form.includes("Form 7A"),
  ),
  "Starting claimant did not receive Form 7A as the next form",
);
assert.equal(
  claimantResult.analysis.requiredNextForms.some((form) =>
    form.includes("Form 9A"),
  ),
  false,
  "Starting claimant was incorrectly routed to a Defence",
);
assert.match(
  claimantResult.analysis.summary.toLowerCase(),
  /contractor|repair/,
  "Case summary lost the user-specific repair dispute",
);
assertNoUnknownContextWarnings(claimantResult, "starting claimant");

const respondingResult = await analyzeSmallClaimsWithBrain(
  buildInput({
    caseStage: "responding",
    issues: ["defending-claim"],
    filedDocuments: ["plaintiffs-claim"],
    yourRole: "Defendant / responding party",
    claimNumber: "SC-26-00001",
    facts:
      "I was served with a Plaintiff's Claim and dispute the amount alleged.",
    serviceDetails: "The Plaintiff's Claim was served on July 20, 2026.",
    defenceResponse:
      "The amount is disputed because the invoice includes work that was not authorized.",
    goal: "Prepare a response to the claim.",
  }),
);
const respondingMasterCase = getMasterCase(respondingResult);

assert.equal(respondingMasterCase.stage, "responding");
assert.ok(
  respondingResult.analysis.requiredNextForms.some((form) =>
    form.includes("Form 9A"),
  ),
  "Responding defendant did not receive Form 9A as the next form",
);
assert.equal(
  respondingResult.analysis.requiredNextForms.some((form) =>
    form.includes("Form 7A"),
  ),
  false,
  "Responding defendant was incorrectly told to start a new claim",
);
assertNoUnknownContextWarnings(respondingResult, "responding defendant");

console.log(
  "Small Claims engine verification passed: claimant and responding paths, authoritative forms, canonical MasterCaseSchema, and known Ontario context.",
);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
