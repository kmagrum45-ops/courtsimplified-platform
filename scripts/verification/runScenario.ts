import assert from "node:assert/strict";
import { baseScenarios, generatedVariations } from "./scenarioRegistry";

const id = process.argv[2];
assert.ok(id, "Use: npm.cmd run test:scenario SC-DEFAMATION-FILED-SERVED-DEFAULT-001");
const scenario = baseScenarios.find((item) => item.id === id) || generatedVariations().find((item) => item.id === id);
assert.ok(scenario, `Unknown scenario: ${id}`);
console.log(JSON.stringify(scenario, null, 2));
