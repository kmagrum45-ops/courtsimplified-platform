import { readFileSync } from "node:fs";

import {
  buildScenarioMatrixFixtures,
  type ScenarioMatrixScenario,
} from "./runCaseSimulationFactory";
import { runRouteFixture } from "./verifyCaseOutcomeMatrix";
import { runCourtSimplifiedBrain } from "../../src/lib/case-system/intelligence/courtSimplifiedBrain";
import {
  getCanonicalFormLookup,
  resolveSelectedFormsCase,
  UNLINKED_FORM_RECOMMENDATION_MESSAGE,
} from "../../src/lib/case-system/formsSelectedCase";
import {
  BUILDER_DRAFT_STORAGE_KEY,
  saveCompactBuilderDraft,
} from "../../src/lib/case-system/builderDraftStorage";

type Area = "small-claims" | "family" | "civil";
type FailureKind = "product defect" | "safe review-required state" | "unfinished feature";
type Finding = {
  scenario: ScenarioMatrixScenario;
  checkpoint: string;
  expected: unknown;
  actual: unknown;
  layer: string;
  kind: FailureKind;
  repairGroup: string;
};

const FALSE_STAGE_CONFLICT = "Stage conflict: starting and responding signals both appear";
const canonicalFormId = "550e8400-e29b-41d4-a716-446655440000";
const areas: Area[] = ["small-claims", "family", "civil"];
const failures: Finding[] = [];
const areaTotals = new Map<Area, { pass: number; fail: number }>(
  areas.map((area) => [area, { pass: 0, fail: 0 }]),
);

function record(
  scenario: ScenarioMatrixScenario,
  condition: boolean,
  checkpoint: string,
  expected: unknown,
  actual: unknown,
  layer: string,
  kind: FailureKind = "product defect",
  repairGroup = "Shared canonical journey guard",
) {
  if (condition) return;
  failures.push({ scenario, checkpoint, expected, actual, layer, kind, repairGroup });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function routeResult(run: Awaited<ReturnType<typeof runRouteFixture>>) {
  return asRecord(run.body.result);
}

function routeIntelligence(run: Awaited<ReturnType<typeof runRouteFixture>>) {
  const result = routeResult(run);
  return run.fixture.selectedCourtPath === "small-claims"
    ? asRecord(asRecord(result.analysis).intelligence)
    : asRecord(asRecord(result.brain).intelligence);
}

function warningClass(warning: string): string | null {
  const value = warning.toLowerCase();
  if (/(fallback|gpt cognition was unavailable|source warning|unverified authority)/.test(value)) return "system/fallback";
  if (/(evidence|proof|record|witness|document)/.test(value)) return "evidence-specific";
  if (/(stage|procedur|limitation|deadline|form)/.test(value)) return "procedural-review";
  if (/(fact|claim|theory|contradiction|remedy)/.test(value)) return "fact-specific";
  return "system/fallback";
}

function otherArea(area: Area): Area {
  return area === "small-claims" ? "family" : "small-claims";
}

function verifyCaseContext(scenario: ScenarioMatrixScenario) {
  const masterResult = { caseId: scenario.caseId, courtPath: scenario.area, summary: "Synthetic matrix case" };
  const owned = resolveSelectedFormsCase({
    caseId: scenario.caseId,
    record: { id: scenario.caseId, court_path: scenario.area },
    masterResult,
  });
  if (scenario.context === "selected-owned") {
    record(scenario, owned?.courtPath === scenario.area, "selected case ownership", scenario.area, owned, "Selected-case resolver", "product defect", "Shared selected-case ownership boundary");
    return;
  }
  if (scenario.context === "unauthorized") {
    const denied = resolveSelectedFormsCase({ caseId: scenario.caseId, record: { id: `foreign-${scenario.caseId}`, court_path: scenario.area }, masterResult });
    record(scenario, denied === null, "unauthorized selected case", null, denied, "Selected-case resolver", "product defect", "Shared selected-case ownership boundary");
    return;
  }
  if (scenario.context === "wrong-area") {
    const denied = resolveSelectedFormsCase({ caseId: scenario.caseId, record: { id: scenario.caseId, court_path: scenario.area }, masterResult: { ...masterResult, courtPath: otherArea(scenario.area) } });
    record(scenario, denied === null, "wrong-area selected case", null, denied, "Selected-case resolver", "product defect", "Shared selected-case ownership boundary");
  }
}

function verifyForms(scenario: ScenarioMatrixScenario) {
  const formCourt = scenario.formState === "wrong-area-id" ? otherArea(scenario.area) : scenario.area;
  const lookup = getCanonicalFormLookup({
    canonicalFormId: scenario.formState === "missing-id" ? undefined : canonicalFormId,
    courtType: formCourt,
  });
  if (scenario.formState === "missing-id") {
    record(scenario, lookup === null && /review required/i.test(UNLINKED_FORM_RECOMMENDATION_MESSAGE), "unlinked form recommendation", "null lookup and review-required", { lookup, message: UNLINKED_FORM_RECOMMENDATION_MESSAGE }, "Form identity resolver", "safe review-required state", "Shared canonical form identity boundary");
  } else {
    record(scenario, lookup?.canonicalFormId === canonicalFormId && lookup.courtType === formCourt, "canonical form tuple", { canonicalFormId, courtType: formCourt }, lookup, "Form identity resolver", "product defect", "Shared canonical form identity boundary");
  }
}

function verifyCompactDraft(scenario: ScenarioMatrixScenario) {
  const writes = new Map<string, string>();
  const localStorageLike = { getItem(key: string) { return writes.get(key) || null; }, setItem(key: string, value: string) { writes.set(key, value); } };
  const oversized = "x".repeat(25_000);
  const stored = saveCompactBuilderDraft(localStorageLike, { caseId: scenario.caseId, courtPath: scenario.area, caseStage: scenario.stage, facts: oversized }, "scenario-matrix-user");
  const value = writes.get(`${BUILDER_DRAFT_STORAGE_KEY}:scenario-matrix-user`) || "";
  record(scenario, stored && value.length < 5_000 && !value.includes(oversized), "bounded local draft", "compact draft only; no full master result", { stored, length: value.length, containsFullPayload: value.includes(oversized) }, "Builder draft storage", "product defect", "Shared bounded local draft guard");
}

function verifyCatalogQueryContract(scenario: ScenarioMatrixScenario) {
  const source = readFileSync("app/api/generate-form/route.ts", "utf8");
  record(scenario, /\.eq\("canonical_form_id", lookup\.canonicalFormId\)[\s\S]*\.eq\("court_type", lookup\.courtType\)/.test(source), "catalog court-area isolation", "canonicalFormId + matching courtType only", "catalog lookup source inspected", "Form generation catalog resolver", "product defect", "Shared canonical form identity boundary");
}

async function runScenario(scenario: ScenarioMatrixScenario) {
  const run = await runRouteFixture(scenario.fixture);
  const result = routeResult(run);
  const intelligence = routeIntelligence(run);
  const masterCase = asRecord(asRecord(result.masterResultPatch).masterCase);
  const proceduralPosture = asRecord(intelligence.proceduralPosture);
  const normalizedIntake = asRecord(intelligence.normalizedIntake);
  const legalKnowledge = asRecord(intelligence.legalKnowledge);
  const routeStage = proceduralPosture.stage;
  const routePath = normalizedIntake.courtPath;
  const warnings = [
    ...(Array.isArray(intelligence.systemWarnings) ? intelligence.systemWarnings : []),
    ...(Array.isArray(legalKnowledge.sourceWarnings) ? legalKnowledge.sourceWarnings : []),
  ].map(String);

  record(scenario, run.status === 200 && run.body.ok === true, "route execution", "200 / ok", { status: run.status, ok: run.body.ok }, "Area adapter", "product defect", "Shared deterministic route contract");
  record(scenario, routePath === scenario.area && masterCase.courtPath === scenario.area, "court-path isolation", scenario.area, { normalized: routePath, master: masterCase.courtPath }, "Area adapter → BrainMigrationLayer → MasterCaseSchema", "product defect", "Shared court-area isolation boundary");
  record(scenario, String(normalizedIntake.rawUserText || "").includes(scenario.fixture.narrative), "narrative preservation", scenario.fixture.narrative, normalizedIntake.rawUserText, "Intake normalization", "product defect", "Shared intake narrative bridge");
  record(scenario, routeStage === scenario.stage, "explicit procedural stage", scenario.stage, routeStage, "CourtSimplifiedBrain procedural posture", "product defect", "Shared procedural-stage normalization");
  if (scenario.stage === "not-sure") {
    record(scenario, routeStage === "not-sure", "unknown stage neutrality", "not-sure", routeStage, "CourtSimplifiedBrain procedural posture", "product defect", "Shared procedural-stage normalization");
  }

  const structuredStage = scenario.stage === "responding" ? "starting-case" : "responding";
  const brain = await runCourtSimplifiedBrain({
    caseId: scenario.caseId,
    courtPath: scenario.area,
    province: "Ontario",
    stage: scenario.stage as Parameters<typeof runCourtSimplifiedBrain>[0]["stage"],
    rawUserText: [
      `Stage selected: ${scenario.stage}`,
      "User role: Plaintiff / claimant",
      "Workflow label: start response workspace",
      scenario.structuredConflict ? `Stage status: ${structuredStage}` : "Existing document: defence",
    ].join("\n"),
    allowExternalCognition: false,
  });
  const brainMaster = asRecord(brain.masterResultPatch.masterCase);
  const stageConflicts = brain.intelligence.contradictions.filter((item) => item.title === FALSE_STAGE_CONFLICT);
  record(scenario, brainMaster.id === scenario.caseId && brainMaster.courtPath === scenario.area, "case ID and court-area isolation", { id: scenario.caseId, courtPath: scenario.area }, { id: brainMaster.id, courtPath: brainMaster.courtPath }, "MasterCaseSchema / CaseSystemAssembly", "product defect", "Shared selected-case ownership boundary");
  record(scenario, brain.intelligence.proceduralPosture.stage === scenario.stage, "canonical explicit stage", scenario.stage, brain.intelligence.proceduralPosture.stage, "CourtSimplifiedBrain procedural posture", "product defect", "Shared procedural-stage normalization");
  record(scenario, scenario.structuredConflict ? stageConflicts.length === 1 : stageConflicts.length === 0, "structured conflict detection", scenario.structuredConflict ? "one genuine structured conflict" : "no conflict from narrative/role/label text", stageConflicts.map((item) => item.title), "CourtSimplifiedBrain contradiction detection", "product defect", "Shared procedural-stage normalization");
  const incomplete = !Array.isArray(scenario.fixture.structuredIntake.uploadedEvidenceFiles) || scenario.fixture.structuredIntake.uploadedEvidenceFiles.length === 0 || !Array.isArray(scenario.fixture.structuredIntake.uploadedFiles) || scenario.fixture.structuredIntake.uploadedFiles.length === 0;
  if (scenario.stage === "starting-case" && incomplete) {
    record(scenario, !/trial/i.test(String(brain.recommendedNextRoute || "")), "early incomplete workflow", "not trial preparation", brain.recommendedNextRoute, "Workflow routing", "product defect", "Shared workflow readiness guard");
  }
  record(scenario, warnings.every((warning) => warningClass(warning) !== null), "warning classification", "fact-specific, evidence-specific, procedural-review, or system/fallback", warnings.map((warning) => ({ warning, category: warningClass(warning) })), "CourtSimplifiedBrain warning aggregation", "unfinished feature", "Shared warning taxonomy");
  verifyCaseContext(scenario);
  verifyForms(scenario);
  verifyCompactDraft(scenario);
  verifyCatalogQueryContract(scenario);

  const scenarioFailures = failures.filter((failure) => failure.scenario.id === scenario.id).length;
  const totals = areaTotals.get(scenario.area)!;
  if (scenarioFailures) totals.fail++; else totals.pass++;
}

async function main() {
  process.env.OPENAI_API_KEY = "";
  const scenarios = buildScenarioMatrixFixtures();
  if (scenarios.length < 100) throw new Error(`Scenario matrix must contain at least 100 scenarios; received ${scenarios.length}.`);
  for (const scenario of scenarios) await runScenario(scenario);

  console.log(`Scenario matrix: total=${scenarios.length}; pass=${scenarios.length - new Set(failures.map((item) => item.scenario.id)).size}; fail=${new Set(failures.map((item) => item.scenario.id)).size}.`);
  console.log("Three-area matrix:");
  for (const area of areas) {
    const totals = areaTotals.get(area)!;
    console.log(`  ${area}: PASS=${totals.pass} FAIL=${totals.fail}`);
  }
  if (failures.length) {
    console.error("Failures by canonical layer:");
    for (const [layer, items] of Map.groupBy(failures, (failure) => failure.layer)) {
      console.error(`\n${layer} — suggested repair: ${items[0].repairGroup}`);
      for (const item of items) {
        console.error(`  ${item.scenario.id} | ${item.checkpoint} | ${item.kind}`);
        console.error(`    input=${JSON.stringify({ area: item.scenario.area, stage: item.scenario.stage, context: item.scenario.context, formState: item.scenario.formState, structuredIntake: item.scenario.fixture.structuredIntake })}`);
        console.error(`    expected=${JSON.stringify(item.expected)} actual=${JSON.stringify(item.actual)}`);
      }
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
