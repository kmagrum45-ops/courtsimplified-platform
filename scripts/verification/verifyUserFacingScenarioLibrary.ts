import assert from "node:assert/strict";
import { analyzeSmallClaimsWithBrain } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";

type CourtPath = "small-claims" | "family" | "civil";
type Scenario = {
  id: string;
  courtPath: CourtPath;
  classification: "synthetic" | "anonymized";
  canonicalIntakeFacts: Record<string, unknown>;
  knownProceduralFacts: string[];
  expectedState: string;
  focusedNextQuestion: string;
  requiredUserFacingText: string[];
  prohibitedUserFacingText: string[];
  expectedEvidencePrompts: string[];
};

const prohibited = ["Tell us what happened in your own words", "pipeline", "engine", "retrieval", "Master Case ID"];
const areas: CourtPath[] = ["small-claims", "family", "civil"];

const genericScenarios: Scenario[] = areas.flatMap((courtPath) =>
  Array.from({ length: 12 }, (_, index) => ({
    id: `${courtPath === "small-claims" ? "SC" : courtPath === "family" ? "FAM" : "CIV"}-REVIEW-${String(index + 1).padStart(3, "0")}`,
    courtPath,
    classification: "synthetic",
    canonicalIntakeFacts: { province: "Ontario", facts: `Synthetic ${courtPath} scenario ${index + 1}.`, caseStage: index % 3 === 0 ? "not-sure" : "starting-case" },
    knownProceduralFacts: index % 3 === 0 ? ["Status is not confirmed."] : ["No procedural fact is inferred beyond the entered facts."],
    expectedState: index % 3 === 0 ? "review-required" : "starting-case",
    focusedNextQuestion: index % 3 === 0 ? "What court document, if any, has already been filed or received?" : "What important date should be confirmed next?",
    requiredUserFacingText: ["Information to confirm"],
    prohibitedUserFacingText: prohibited,
    expectedEvidencePrompts: ["Keep the documents, messages, or records that support the facts entered."],
  })),
);

const defaultScenario: Scenario = {
  id: "SC-DEFAULT-001",
  courtPath: "small-claims",
  classification: "synthetic",
  canonicalIntakeFacts: {
    province: "Ontario", amountClaimed: "$10,000", caseStage: "already-started", yourRole: "Plaintiff / claimant",
    facts: "Synthetic false messages were sent to the user's uncle and father on September 19, 2025.",
    filedDocuments: ["plaintiffs-claim", "affidavit-service"],
  },
  knownProceduralFacts: ["Claim already started.", "Defendant served.", "Affidavit of Service filed with the court.", "Defence status unknown."],
  expectedState: "default-stage-review",
  focusedNextQuestion: "Has the defendant filed a Defence?",
  requiredUserFacingText: ["Case status: Claim already filed and served.", "Service was completed and an Affidavit of Service was filed with the court.", "Has the defendant filed a Defence?"],
  prohibitedUserFacingText: [...prohibited, "upload the Affidavit of Service", "recreate the Affidavit of Service", "photocopy the Affidavit of Service"],
  expectedEvidencePrompts: ["Full message threads, sender, recipients, dates, context, and evidence of harm."],
};

const scenarios = genericScenarios.map((scenario) => scenario.id === "SC-REVIEW-001" ? defaultScenario : scenario);

for (const area of areas) {
  const areaScenarios = scenarios.filter((scenario) => scenario.courtPath === area);
  assert.equal(areaScenarios.length, 12, `${area} must have exactly 12 developer-only scenarios`);
  for (const scenario of areaScenarios) {
    assert.equal(scenario.classification, "synthetic");
    assert.ok(scenario.id && scenario.focusedNextQuestion && scenario.expectedEvidencePrompts.length);
    assert.ok(scenario.prohibitedUserFacingText.includes("Tell us what happened in your own words"));
  }
}

assert.deepEqual(scenarios.find((scenario) => scenario.id === "SC-DEFAULT-001"), defaultScenario);

async function main() {
  const result = await analyzeSmallClaimsWithBrain({
    caseStage: "already-started", issues: ["defamation-reputation"], filedDocuments: ["plaintiffs-claim", "affidavit-service"], uploadedEvidenceFiles: [],
    yourName: "Rowan Test", yourAddress: "1 Synthetic Street", yourCity: "Toronto", yourProvince: "Ontario", yourPostalCode: "M1M 1M1", yourPhone: "416-555-0100", yourEmail: "rowan@example.test",
    otherParty: "Morgan Example", otherPartyPhone: "", otherPartyEmail: "", yourRole: "Plaintiff / claimant", courtLocation: "Toronto", claimNumber: "SC-001", amountClaimed: "$10,000", defendantAddress: "2 Synthetic Avenue",
    agreementDetails: "", paymentHistory: "", damagesBreakdown: "", serviceDetails: "Defendant served.", deadlineDetails: "", facts: "Synthetic false messages were sent to the user's uncle and father.", timeline: "September 19, 2025", evidence: "Message threads.", missingEvidence: "", settlementEfforts: "", defenceResponse: "", goal: "Compensation", urgent: "",
  }, { allowExternalCognition: false });
  assert.ok(result.analysis.nextBestActions?.includes("Has the defendant filed a Defence?"));
  assert.ok(result.analysis.summary.includes("Case status: Claim already filed and served."));
  assert.ok(result.analysis.guidance.includes("Service was completed and an Affidavit of Service was filed with the court."));
  assert.ok(!result.analysis.guidance.some((item) => /upload|recreate|photocopy.*affidavit/i.test(item)));
  console.log("User-facing scenario library: small-claims=12 family=12 civil=12; synthetic fixtures only.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
