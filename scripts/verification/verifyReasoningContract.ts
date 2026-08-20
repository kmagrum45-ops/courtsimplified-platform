import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { baseScenarios } from "./scenarioRegistry";

const schema = JSON.parse(readFileSync("schemas/reasoning-contract.schema.json", "utf8"));
const required = ["factualSnapshot", "possibleIssuesToReview", "evidenceRecorded", "evidenceToOrganizeOrConfirm", "contradictionsOrUncertainty", "proceduralStatus", "nextConfirmationQuestion", "courtClarificationPoints", "verifiedFormsAndProcedure", "reviewBoundary", "nextWorkflowAction"];
assert.deepEqual(schema.required, required);
assert.equal(baseScenarios.length, 90);
assert.equal(new Set(baseScenarios.map((scenario) => scenario.id)).size, 90);
for (const area of ["small-claims", "family", "civil"] as const) assert.equal(baseScenarios.filter((scenario) => scenario.courtPath === area).length, 30);
const syntheticFiledServedScenario = baseScenarios.find((scenario) => scenario.id === "SC-DEFAMATION-FILED-SERVED-DEFAULT-001");
assert.ok(syntheticFiledServedScenario);
assert.deepEqual(syntheticFiledServedScenario.expectedNextQuestion, "Has the defendant filed a Defence?");
assert.ok(syntheticFiledServedScenario.prohibitedOutputWording.includes("recreate the Affidavit of Service"));
console.log("Reasoning contract: requiredFields=11 baseScenarios=90 areas=30/30/30.");
