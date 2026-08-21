import assert from "node:assert/strict";
import { baseScenarios, generatedVariations, REGISTRY_SEED } from "./scenarioRegistry";

const variations = generatedVariations();
assert.equal(baseScenarios.length, 90);
assert.equal(variations.length, 3000);
assert.equal(new Set(variations.map((scenario) => scenario.id)).size, 3000);
assert.equal(new Set(variations.map((scenario) => scenario.baseId)).size, 90);
assert.ok(variations.every((scenario) => scenario.seed === REGISTRY_SEED));
assert.ok(baseScenarios.every((scenario) => scenario.expectedPossibleIssues.length && scenario.expectedEvidenceGuidance.length && scenario.expectedPrivacySessionBehavior && scenario.prohibitedOutputWording.length));
console.log("Scenario registry: seed=20260814 base=90 (small-claims=30 family=30 civil=30) variations=3000 deterministic.");
