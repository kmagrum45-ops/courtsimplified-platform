import assert from "node:assert/strict";
import { loadEnvConfig } from "@next/env";

import { hasConfiguredServerAi } from "../../src/lib/case-system/intelligence/serverAiConfiguration";
import { analyzeSmallClaimsWithBrain } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";

if (process.env.RUN_REAL_AI_INTEGRATION !== "1") {
  console.log("SKIPPED: set RUN_REAL_AI_INTEGRATION=1 to run the configured server AI integration check.");
  process.exit(0);
}

loadEnvConfig(process.cwd());

async function main() {
  if (!hasConfiguredServerAi()) {
    console.log("SKIPPED: configured server AI is not present.");
    return;
  }

  const result = await analyzeSmallClaimsWithBrain({
    caseStage: "already-started", issues: ["defamation-reputation"], filedDocuments: ["plaintiffs-claim", "affidavit-service"], uploadedEvidenceFiles: [],
    yourName: "Rowan Test", yourAddress: "1 Synthetic Street", yourCity: "Toronto", yourProvince: "Ontario", yourPostalCode: "M1M 1M1", yourPhone: "416-555-0100", yourEmail: "rowan@example.test",
    otherParty: "Morgan Example", otherPartyPhone: "", otherPartyEmail: "", yourRole: "Plaintiff / claimant", courtLocation: "Toronto", claimNumber: "SC-001", amountClaimed: "$10,000", defendantAddress: "2 Synthetic Avenue",
    agreementDetails: "", paymentHistory: "", damagesBreakdown: "", serviceDetails: "The defendant was served.", deadlineDetails: "", facts: "Synthetic messages were sent on September 19, 2025.", timeline: "September 19, 2025: service completed; affidavit filed.", evidence: "Message threads.", missingEvidence: "", settlementEfforts: "", defenceResponse: "", goal: "Compensation", urgent: "",
  }, { allowExternalCognition: true });

  assert.ok(!result.brain.intelligence.systemWarnings.some((warning) => /structured gpt cognition was unavailable/i.test(warning)));
  assert.ok(result.analysis.nextBestActions?.includes("Has the defendant filed a Defence?"));
  console.log("Configured server AI integration check passed.");
}

main().catch((error) => {
  console.error("Configured server AI integration check failed.");
  process.exitCode = 1;
});
