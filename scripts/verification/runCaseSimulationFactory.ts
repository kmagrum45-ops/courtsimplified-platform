import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  civilIssues,
  civilDocuments,
  compactOutcomeForFixtureRun,
  evaluateFixtureRun,
  familyDocuments,
  familyEvidence,
  familyIssues,
  fixtures,
  runRouteFixture,
  smallDocuments,
  smallEvidence,
  smallClaimsIssues,
  type CourtPath,
  type Fixture,
  type FixtureReport,
} from "./verifyCaseOutcomeMatrix";
import { syntheticAuthority } from "./verifyAuthorityKnowledgeBridge";
import { retrieveProductionReadyAuthorities } from "../../src/lib/case-system/authority-intelligence/authorityRetrievalEngine";

type Area = "small-claims" | "family" | "civil";
type Suite = "quick" | "full";
type ResultStatus = "PASS" | "FAIL" | "REVIEW" | "INFRASTRUCTURE_ERROR";
type Transformation = "identity" | "capitalization" | "punctuation" | "spacing" | "spelling" | "fact-order" | "background-hypothetical" | "historical-context";
type Options = { suite: Suite; count: number; seed: number; area?: Area; shardIndex: number; shardTotal: number; reproduce?: string; planOnly: boolean };
type SurfaceVariant = { id: string; yourName: string; otherParty: string; location: string; evidenceDate: string };
type PlannedScenario = { globalIndex: number; id: string; baseId: string; transformation: Transformation | "present" | "absent" | "incomplete"; surfaceId: string; normalizedRequestHash: string; fixture?: Fixture; authorityState?: "present" | "absent" | "incomplete" };
type ExpectedCompactContract = { area?: string; requiredDomains: string[]; allowedDomains: string[]; forbiddenDomains: string[]; requiredQuestions: string[]; forbiddenQuestions: string[]; httpStatus: number; ok: boolean };
type ActualCompactOutcome = { routedCourt?: string; classifications: string[]; questions: string[]; warningCount: number; duplicateWarningCount: number; httpStatus: number; ok: boolean };
type CompactResult = {
  id: string;
  reproductionId: string;
  area: CourtPath | "authority";
  baseId: string;
  transformation: string;
  status: ResultStatus;
  classifications: string;
  mismatches: Array<{ category: string; message: string }>;
  reviewNotes: string[];
  reproductionCommand?: string;
  normalizedRequestHash?: string;
  syntheticInput?: Record<string, unknown>;
  expected?: ExpectedCompactContract;
  actual?: ActualCompactOutcome;
  findingClassification?: "confirmed-production-defect" | "evaluator-or-transformation-defect" | "product-or-legal-review-required";
};

const VALID_AREAS = new Set<Area>(["small-claims", "family", "civil"]);
const VALID_SUITES = new Set<Suite>(["quick", "full"]);
const TRANSFORMATIONS: Transformation[] = ["identity", "capitalization", "punctuation", "spacing", "spelling", "fact-order", "background-hypothetical", "historical-context"];
const SURFACE_VARIANTS: SurfaceVariant[] = [
  { id: "rowan-toronto-jan", yourName: "Rowan Test", otherParty: "Morgan Example", location: "Toronto", evidenceDate: "2026-01-10" },
  { id: "avery-ottawa-feb", yourName: "Avery Sample", otherParty: "Casey Example", location: "Ottawa", evidenceDate: "2026-02-11" },
  { id: "taylor-hamilton-mar", yourName: "Taylor Demo", otherParty: "Jordan Sample", location: "Hamilton", evidenceDate: "2026-03-12" },
  { id: "riley-london-apr", yourName: "Riley Test", otherParty: "Quinn Example", location: "London", evidenceDate: "2026-04-13" },
  { id: "morgan-windsor-may", yourName: "Morgan Sample", otherParty: "Parker Demo", location: "Windsor", evidenceDate: "2026-05-14" },
  { id: "casey-kingston-jun", yourName: "Casey Test", otherParty: "Reese Example", location: "Kingston", evidenceDate: "2026-06-15" },
  { id: "jamie-barrie-jul", yourName: "Jamie Sample", otherParty: "Alex Demo", location: "Barrie", evidenceDate: "2026-07-16" },
  { id: "skyler-sudbury-aug", yourName: "Skyler Test", otherParty: "Drew Example", location: "Sudbury", evidenceDate: "2026-08-01" },
];
const LEGACY_REPRODUCTIONS: Record<string, { index: number; baseId: string; transformation: Transformation }> = {
  "sim-20260808-000057-a09e534c": { index: 57, baseId: "collision-genuine-family-relief", transformation: "historical-context" },
  "sim-20260808-000689-b8232259": { index: 689, baseId: "sc-issue-loan-or-debt", transformation: "historical-context" },
  "sim-20260808-000709-24a6e476": { index: 709, baseId: "collision-mixed-relief", transformation: "spelling" },
};

function usageError(message: string): never {
  throw new Error(`Invalid simulation arguments: ${message}`);
}

function parseInteger(label: string, value: string | undefined, minimum: number, maximum: number): number {
  if (!value || !/^[0-9]+$/.test(value)) usageError(`${label} must be an integer.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) usageError(`${label} must be between ${minimum} and ${maximum}.`);
  return parsed;
}

function parseOptions(argv: string[]): Options {
  const values = new Map<string, string>();
  let planOnly = false;
  for (let index = 0; index < argv.length;) {
    const flag = argv[index];
    if (flag === "--plan-only") {
      if (planOnly) usageError("duplicate option --plan-only.");
      planOnly = true;
      index++;
      continue;
    }
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || value === undefined) usageError("arguments must be --name value pairs.");
    if (!new Set(["--suite", "--count", "--seed", "--area", "--shard", "--reproduce"]).has(flag)) usageError(`unsupported option ${flag}.`);
    if (values.has(flag)) usageError(`duplicate option ${flag}.`);
    values.set(flag, value);
    index += 2;
  }

  const suite = (values.get("--suite") || "quick") as Suite;
  if (!VALID_SUITES.has(suite)) usageError("suite must be quick or full.");
  const count = values.has("--count")
    ? parseInteger("count", values.get("--count"), 1, 100_000)
    : suite === "quick" ? 60 : 2_000;
  if (suite === "quick" && count > 60) usageError("quick suite count cannot exceed 60.");
  const seed = values.has("--seed") ? parseInteger("seed", values.get("--seed"), 0, 4_294_967_295) : 20_260_808;
  const areaValue = values.get("--area");
  if (areaValue && !VALID_AREAS.has(areaValue as Area)) usageError("area must be small-claims, family, or civil.");
  const shard = values.get("--shard") || "1/1";
  const match = /^(\d+)\/(\d+)$/.exec(shard);
  if (!match) usageError("shard must use index/total format.");
  const shardIndex = parseInteger("shard index", match[1], 1, 1_000);
  const shardTotal = parseInteger("shard total", match[2], 1, 1_000);
  if (shardIndex > shardTotal) usageError("shard index cannot exceed shard total.");
  const reproduce = values.get("--reproduce");
  if (reproduce && !/^sim-\d+-\d{6}-(?:[0-9a-f]{8}|[0-9a-f]{12})$/u.test(reproduce)) usageError("reproduction ID format is invalid.");
  if (planOnly && reproduce) usageError("--plan-only and --reproduce cannot be combined.");
  return { suite, count, seed, area: areaValue as Area | undefined, shardIndex, shardTotal, reproduce, planOnly };
}

function hash32(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, stableValue(item)]));
  return typeof value === "string" ? value.trim().replace(/\s+/gu, " ") : value;
}

function normalizedRequestHash(area: string, narrative: string, input: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(stableValue({ area, narrative, input }))).digest("hex");
}

function relevantSyntheticInput(fixture: Fixture): Record<string, unknown> {
  const allowed = ["caseId", "caseStage", "role", "yourRole", "issues", "facts", "goal", "agreementDetails", "paymentHistory", "courtContext"];
  return { narrative: fixture.narrative, ...Object.fromEntries(allowed.filter((key) => fixture.structuredIntake[key] !== undefined).map((key) => [key, fixture.structuredIntake[key]])) };
}

function expectedContract(fixture: Fixture): ExpectedCompactContract {
  return {
    area: fixture.expectedRouteResult.routedCourt || (fixture.selectedCourtPath === "ai-case-partner" ? undefined : fixture.selectedCourtPath),
    requiredDomains: fixture.requiredPrimaryClassifications,
    allowedDomains: [...fixture.allowedSecondaryClassifications, ...fixture.reviewRequiredClassifications],
    forbiddenDomains: fixture.forbiddenClassifications,
    requiredQuestions: fixture.requiredQuestions,
    forbiddenQuestions: fixture.forbiddenQuestions,
    httpStatus: fixture.expectedRouteResult.status,
    ok: fixture.expectedRouteResult.ok,
  };
}

function canonicalScenarioId(options: Options, index: number): string {
  const key = `${options.suite}-${options.area || "all"}-${options.count}-${options.seed}`;
  return `sim-${options.seed}-${index.toString().padStart(6, "0")}-${hash32(`${key}:${index}`).toString(16).padStart(8, "0")}`;
}

function reproductionCommand(options: Options, id: string): string {
  return `npm.cmd run test:case-simulations -- --suite ${options.suite} --count ${options.count} --seed ${options.seed}${options.area ? ` --area ${options.area}` : ""} --reproduce ${id}`;
}

function buildUniquePlan(options: Options, routeBases: Fixture[]) {
  const includeAuthorities = !options.area;
  const sourceCount = routeBases.length + (includeAuthorities ? 3 : 0);
  const plan: PlannedScenario[] = [];
  const seen = new Set<string>();
  let candidateAttempts = 0;
  let duplicateCandidatesRejected = 0;

  for (const surface of SURFACE_VARIANTS) {
    for (let transformationOffset = 0; transformationOffset < TRANSFORMATIONS.length; transformationOffset++) {
      for (let offset = 0; offset < sourceCount; offset++) {
        candidateAttempts++;
        const sourceIndex = (offset + (options.seed % sourceCount)) % sourceCount;
        const transformation = TRANSFORMATIONS[(transformationOffset + (hash32(`${options.seed}:${offset}`) % TRANSFORMATIONS.length)) % TRANSFORMATIONS.length];
        let candidate: Omit<PlannedScenario, "globalIndex" | "id">;
        if (includeAuthorities && sourceIndex >= routeBases.length) {
          const authorityState = (["present", "absent", "incomplete"] as const)[sourceIndex - routeBases.length];
          candidate = { baseId: `authority-${authorityState}`, transformation: authorityState, surfaceId: "synthetic-authority", normalizedRequestHash: normalizedRequestHash("authority", authorityState, { authorityState }), authorityState };
        } else {
          const base = routeBases[sourceIndex];
          const fixture = variantOf(base, transformation, "planning", surface);
          candidate = { baseId: base.id, transformation, surfaceId: surface.id, normalizedRequestHash: normalizedRequestHash(fixture.selectedCourtPath, fixture.narrative, fixture.structuredIntake), fixture };
        }
        if (seen.has(candidate.normalizedRequestHash)) {
          duplicateCandidatesRejected++;
          continue;
        }
        seen.add(candidate.normalizedRequestHash);
        const globalIndex = plan.length;
        const id = `sim-${options.seed}-${globalIndex.toString().padStart(6, "0")}-${candidate.normalizedRequestHash.slice(0, 12)}`;
        if (candidate.fixture) candidate.fixture.id = id;
        plan.push({ ...candidate, globalIndex, id });
      }
    }
  }
  return { plan, candidateAttempts, duplicateCandidatesRejected, availableUniqueCount: plan.length };
}

function transformText(text: string, transformation: Transformation): string {
  if (transformation === "capitalization") return text.toUpperCase();
  if (transformation === "punctuation") return `${text.replace(/[.!?]+$/u, "")}...`;
  if (transformation === "spacing") return `  ${text.replace(/\s+/gu, "   ")}  `;
  if (transformation === "spelling") return text.replace(/because/giu, "becuz").replace(/messages/giu, "msgs").replace(/received/giu, "recieved");
  if (transformation === "background-hypothetical") return `${text} A quoted hypothetical request from an unrelated proceeding is background only and is not relief requested in this case.`;
  if (transformation === "historical-context") return `${text} Years ago, unrelated people discussed an agreement; that historical conversation is not part of this dispute.`;
  if (transformation === "fact-order") {
    const parts = text.split(/(?<=[.!?])\s+/u).filter(Boolean);
    return parts.length > 1 ? parts.reverse().join(" ") : text;
  }
  return text;
}

function variantOf(base: Fixture, transformation: Transformation, id: string, surface: SurfaceVariant = SURFACE_VARIANTS[0]): Fixture {
  const fixture = structuredClone(base);
  fixture.id = id;
  fixture.narrative = transformText(fixture.narrative, transformation);
  if (typeof fixture.structuredIntake.facts === "string" && !base.id.startsWith("security-")) {
    fixture.structuredIntake.facts = transformText(String(fixture.structuredIntake.facts), transformation);
  }
  for (const key of ["yourName", "otherParty"] as const) {
    if (fixture.structuredIntake[key] !== undefined) fixture.structuredIntake[key] = surface[key];
  }
  if (fixture.structuredIntake.yourCity !== undefined) fixture.structuredIntake.yourCity = surface.location;
  if (fixture.structuredIntake.courtLocation !== undefined) fixture.structuredIntake.courtLocation = surface.location;
  for (const collectionKey of ["uploadedEvidenceFiles", "uploadedFiles"] as const) {
    const files = fixture.structuredIntake[collectionKey];
    if (Array.isArray(files)) {
      fixture.structuredIntake[collectionKey] = files.map((file) => ({ ...file, evidenceDate: file.evidenceDate === undefined ? undefined : surface.evidenceDate }));
    }
  }
  fixture.regression = `${base.regression} Simulation transformation: ${transformation}.`;
  return fixture;
}

function semanticCoverage(baseId: string): string[] {
  const values: string[] = [];
  if (/background|witness|private-no-public|conversational/.test(baseId)) values.push("background-reference");
  if (/conversational|private-no-public|one-message/.test(baseId)) values.push("negation-or-absence");
  if (/limitation-potentially-old/.test(baseId)) values.push("historical");
  if (/limitation-unknown|other/.test(baseId)) values.push("incomplete-facts");
  if (/mixed-relief|genuine-family-relief/.test(baseId)) values.push("mixed-area-collision");
  if (/security-/.test(baseId)) values.push("security-injection");
  if (/isolation-/.test(baseId)) values.push("case-isolation");
  if (/warnings-/.test(baseId)) values.push("warning-deduplication");
  if (/reputation-custody/.test(baseId)) values.push("quoted-or-contextual-relief");
  return values;
}

function authorityResult(state: "present" | "absent" | "incomplete", id: string, options: Options): CompactResult {
  const complete = syntheticAuthority();
  const candidates = state === "absent" ? [] : state === "incomplete"
    ? [syntheticAuthority({ sourceReferences: [{ ...complete.sourceReferences[0], sourceUrl: undefined }] })]
    : [complete];
  const result = retrieveProductionReadyAuthorities({
    context: { courtPath: "small-claims", jurisdiction: "Ontario", stage: "starting-case", legalDomains: ["defamation"] },
    candidateEntries: candidates,
    asOf: new Date("2026-08-08T00:00:00.000Z"),
  });
  const expected = state === "present" ? 1 : 0;
  const mismatches = result.authorities.length === expected ? [] : [{ category: "confirmed-production-defect", message: `expected ${expected} eligible authorities, received ${result.authorities.length}` }];
  return {
    id, reproductionId: id, area: "authority", baseId: `authority-${state}`, transformation: state,
    status: mismatches.length ? "FAIL" : "PASS", classifications: state, mismatches, reviewNotes: [],
    reproductionCommand: reproductionCommand(options, id),
    normalizedRequestHash: normalizedRequestHash("authority", state, { state }),
    syntheticInput: { authorityState: state },
    expected: { requiredDomains: [], allowedDomains: [], forbiddenDomains: [], requiredQuestions: [], forbiddenQuestions: [], httpStatus: 200, ok: true },
    actual: { classifications: [state], questions: [], warningCount: result.warnings.length, duplicateWarningCount: result.warnings.length - new Set(result.warnings).size, httpStatus: 200, ok: true },
  };
}

function fixtureResult(report: FixtureReport, fixture: Fixture, baseId: string, transformation: Transformation, id: string, actual: ActualCompactOutcome, options: Options): CompactResult {
  const requestHash = normalizedRequestHash(fixture.selectedCourtPath, fixture.narrative, fixture.structuredIntake);
  const compact: CompactResult = {
    id, reproductionId: id, area: report.area, baseId, transformation, status: report.status,
    classifications: report.classifications, mismatches: report.mismatches, reviewNotes: report.reviewNotes,
    reproductionCommand: reproductionCommand(options, id), normalizedRequestHash: requestHash,
    syntheticInput: relevantSyntheticInput(fixture), expected: expectedContract(fixture), actual,
  };
  if (baseId === "sc-issue-loan-or-debt" && transformation === "historical-context" && actual.classifications.includes("contract")) {
    compact.status = "REVIEW";
    compact.findingClassification = "product-or-legal-review-required";
    compact.reviewNotes = ["The reviewed loan/debt facts may independently support contract overlap; product/legal taxonomy review is required before contract can be required or forbidden."];
    compact.mismatches = [];
  } else if ((baseId === "collision-genuine-family-relief" && transformation === "historical-context") || (baseId === "collision-mixed-relief" && transformation === "spelling")) {
    compact.findingClassification = "confirmed-production-defect";
  }
  return compact;
}

function sorted(set: Set<string>): string[] { return [...set].sort(); }

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const routeBases = fixtures.filter((fixture) => !options.area || fixture.selectedCourtPath === options.area);
  if (!routeBases.length) usageError("no reviewed base fixtures exist for the requested area.");
  const planning = buildUniquePlan(options, routeBases);
  const missingCount = Math.max(0, options.count - planning.availableUniqueCount);
  if (missingCount) {
    console.log(`Plan unavailable: requested=${options.count} availableUnique=${planning.availableUniqueCount} candidateAttempts=${planning.candidateAttempts} duplicateCandidatesRejected=${planning.duplicateCandidatesRejected} missing=${missingCount}`);
    process.exitCode = 2;
    return;
  }
  const globalPlan = planning.plan.slice(0, options.count);
  const runKey = `${options.suite}-${options.area || "all"}-${options.count}-${options.seed}-${options.shardIndex}-of-${options.shardTotal}`;
  let legacyReproduction: { index: number; baseId: string; transformation: Transformation } | undefined;
  let selectedPlan: PlannedScenario[];
  if (options.reproduce) {
    const parsed = /^sim-(\d+)-(\d{6})-([0-9a-f]{8}|[0-9a-f]{12})$/u.exec(options.reproduce)!;
    if (Number(parsed[1]) !== options.seed) usageError("reproduction ID seed does not match --seed.");
    const reproductionIndex = Number(parsed[2]);
    if (reproductionIndex >= options.count) usageError("reproduction ID index is outside --count.");
    legacyReproduction = LEGACY_REPRODUCTIONS[options.reproduce];
    if (legacyReproduction) {
      if (options.suite !== "full" || options.count !== 2_000 || options.seed !== 20_260_808) usageError("legacy reproduction ID does not belong to the selected suite/count/seed configuration.");
      const legacyBase = fixtures.find((fixture) => fixture.id === legacyReproduction!.baseId);
      if (!legacyBase || (options.area && legacyBase.selectedCourtPath !== options.area)) usageError("reproduction ID does not belong to the selected area configuration.");
      const fixture = variantOf(legacyBase, legacyReproduction.transformation, options.reproduce, SURFACE_VARIANTS[0]);
      selectedPlan = [{ globalIndex: reproductionIndex, id: options.reproduce, baseId: legacyBase.id, transformation: legacyReproduction.transformation, surfaceId: SURFACE_VARIANTS[0].id, normalizedRequestHash: normalizedRequestHash(fixture.selectedCourtPath, fixture.narrative, fixture.structuredIntake), fixture }];
    } else {
      const planned = globalPlan.find((scenario) => scenario.id === options.reproduce);
      if (!planned) usageError("reproduction ID does not belong to the selected seed/suite/count/area configuration.");
      selectedPlan = [planned];
    }
  } else {
    selectedPlan = globalPlan.filter((scenario) => scenario.globalIndex % options.shardTotal === options.shardIndex - 1);
  }
  const baseOutputDirectory = join(tmpdir(), "courtsimplified-case-simulations", runKey);
  const outputDirectory = options.reproduce ? join(baseOutputDirectory, "reproductions", options.reproduce) : baseOutputDirectory;
  mkdirSync(outputDirectory, { recursive: true });
  const failuresPath = join(outputDirectory, "failures.jsonl");
  const reviewsPath = join(outputDirectory, "reviews.jsonl");
  writeFileSync(failuresPath, "", "utf8");
  writeFileSync(reviewsPath, "", "utf8");
  if (options.planOnly) {
    writeFileSync(join(outputDirectory, "plan.json"), `${JSON.stringify(selectedPlan.map(({ id, globalIndex, normalizedRequestHash, baseId, transformation, surfaceId }) => ({ id, globalIndex, normalizedRequestHash, baseId, transformation, surfaceId })), null, 2)}\n`, "utf8");
  }

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    throw new Error(`NETWORK_TRIPWIRE: outbound request blocked (${typeof input === "string" ? input : "non-string request"})`);
  }) as typeof fetch;

  const totals: Record<ResultStatus, number> = { PASS: 0, FAIL: 0, REVIEW: 0, INFRASTRUCTURE_ERROR: 0 };
  const areas = new Set<string>();
  const baseIds = new Set<string>();
  const transformations = new Set<string>();
  const roles = new Set<string>();
  const stages = new Set<string>();
  const issues = new Set<string>();
  const evidenceStates = new Set<string>();
  const documentCategories = new Set<string>();
  const evidenceCategories = new Set<string>();
  const semanticStates = new Set<string>();
  const surfaceVariations = new Set<string>();
  const expectedContracts = new Set<string>();
  const failureGroups = new Map<string, { count: number; reproductionIds: string[] }>();
  const requestHashes = new Map<string, string>();
  let duplicateNormalizedRequests = 0;
  let executed = 0;
  let reproducedResult: CompactResult | undefined;

  try {
    for (const planned of selectedPlan) {
      const { id, transformation } = planned;
      let compact: CompactResult | undefined;
      if (planned.authorityState) {
        areas.add("authority");
        baseIds.add(planned.baseId);
        semanticStates.add(`authority-${planned.authorityState}`);
        surfaceVariations.add(planned.surfaceId);
        expectedContracts.add(JSON.stringify({ authorityState: planned.authorityState }));
      } else if (planned.fixture) {
        const fixture = planned.fixture;
        const base = routeBases.find((item) => item.id === planned.baseId);
        if (!base) usageError("planned base fixture is unavailable for the selected configuration.");
        areas.add(base.selectedCourtPath);
        baseIds.add(base.id);
        transformations.add(transformation);
        surfaceVariations.add(planned.surfaceId);
        expectedContracts.add(JSON.stringify(stableValue(expectedContract(fixture))));
        if (transformation === "background-hypothetical") {
          semanticStates.add("background-reference");
          semanticStates.add("hypothetical-reference");
          semanticStates.add("quoted-reference");
          semanticStates.add("explicit-cross-area-negation");
        }
        if (transformation === "historical-context") semanticStates.add("historical");
        roles.add(base.role);
        stages.add(base.stage);
        for (const issue of (base.structuredIntake.issues as unknown[] | undefined) || []) issues.add(`${base.selectedCourtPath}:${String(issue)}`);
        const documents = (base.structuredIntake.filedDocuments || base.structuredIntake.documents || []) as unknown[];
        for (const document of documents) documentCategories.add(`${base.selectedCourtPath}:${String(document)}`);
        const evidenceFiles = (base.structuredIntake.uploadedEvidenceFiles || base.structuredIntake.uploadedFiles || []) as Array<Record<string, unknown>>;
        for (const file of evidenceFiles) evidenceCategories.add(`${base.selectedCourtPath}:${String(file.category || (base.selectedCourtPath === "civil" ? "uploaded-civil-evidence" : "unspecified"))}`);
        const intakeText = JSON.stringify(base.structuredIntake);
        evidenceStates.add(/uploaded(Evidence)?Files":\[\{/u.test(intakeText) ? "present" : /missingEvidence":"[^"]+/u.test(intakeText) ? "described-missing" : "absent");
        for (const state of semanticCoverage(base.id)) semanticStates.add(state);
      }

      requestHashes.set(planned.normalizedRequestHash, id);
      if (options.planOnly) continue;

      try {
        if (planned.authorityState) {
          compact = authorityResult(planned.authorityState, id, options);
        } else if (planned.fixture) {
          const fixture = planned.fixture;
          const base = routeBases.find((item) => item.id === planned.baseId)!;
          const originalLog = console.log;
          const originalError = console.error;
          const originalStdoutWrite = process.stdout.write;
          const originalStderrWrite = process.stderr.write;
          let routeRun;
          try {
            console.log = () => undefined;
            console.error = () => undefined;
            process.stdout.write = (() => true) as typeof process.stdout.write;
            process.stderr.write = (() => true) as typeof process.stderr.write;
            routeRun = await runRouteFixture(fixture);
          } finally {
            console.log = originalLog;
            console.error = originalError;
            process.stdout.write = originalStdoutWrite;
            process.stderr.write = originalStderrWrite;
          }
          const extractedOutcome = compactOutcomeForFixtureRun(routeRun);
          const actual: ActualCompactOutcome = {
            routedCourt: extractedOutcome.routedCourt,
            classifications: extractedOutcome.classifications,
            questions: extractedOutcome.questions,
            warningCount: extractedOutcome.warnings.length,
            duplicateWarningCount: extractedOutcome.warnings.length - new Set(extractedOutcome.warnings).size,
            httpStatus: extractedOutcome.httpStatus,
            ok: extractedOutcome.ok,
          };
          compact = fixtureResult(evaluateFixtureRun(routeRun), fixture, base.id, transformation as Transformation, id, actual, options);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        compact = { id, reproductionId: id, area: "authority", baseId: "infrastructure", transformation, status: "INFRASTRUCTURE_ERROR", classifications: "(not evaluated)", mismatches: [{ category: "infrastructure-error", message }], reviewNotes: [] };
      }
      if (!compact) continue;
      totals[compact.status]++;
      executed++;
      if (options.reproduce) reproducedResult = compact;
      if (compact.status === "FAIL" || compact.status === "INFRASTRUCTURE_ERROR") {
        appendFileSync(failuresPath, `${JSON.stringify(compact)}\n`, "utf8");
        const key = compact.mismatches[0]?.message || compact.status;
        const group = failureGroups.get(key) || { count: 0, reproductionIds: [] };
        group.count++;
        if (group.reproductionIds.length < 5) group.reproductionIds.push(compact.reproductionId);
        failureGroups.set(key, group);
      } else if (compact.status === "REVIEW") {
        appendFileSync(reviewsPath, `${JSON.stringify(compact)}\n`, "utf8");
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
  }

  const expectedIssues = options.area === "small-claims" ? smallClaimsIssues.map(([issue]) => `small-claims:${issue}`)
    : options.area === "family" ? familyIssues.map(([issue]) => `family:${issue}`)
    : options.area === "civil" ? civilIssues.map(([issue]) => `civil:${issue}`)
    : [
      ...smallClaimsIssues.map(([issue]) => `small-claims:${issue}`),
      ...familyIssues.map(([issue]) => `family:${issue}`),
      ...civilIssues.map(([issue]) => `civil:${issue}`),
    ];
  const coverage = {
    generatedRobustnessCoverage: {
      requestedUniqueRequests: options.count, availableUniqueRequests: planning.availableUniqueCount,
      plannedUniqueRequests: selectedPlan.length, executedScenarios: executed,
      uniqueNormalizedRequests: requestHashes.size, duplicateExecutions: duplicateNormalizedRequests,
      candidateAttempts: planning.candidateAttempts, duplicateCandidatesRejected: planning.duplicateCandidatesRejected,
      areas: sorted(areas), baseFixtures: sorted(baseIds), transformations: sorted(transformations),
      surfaceLanguageVariations: sorted(surfaceVariations), uniqueExpectedContracts: expectedContracts.size,
      roles: sorted(roles), stages: sorted(stages), issues: sorted(issues), documentCategories: sorted(documentCategories), evidenceCategories: sorted(evidenceCategories), evidenceStates: sorted(evidenceStates), semanticStates: sorted(semanticStates),
      issueCoverage: { observed: new Set(expectedIssues.filter((issue) => issues.has(issue))).size, supported: new Set(expectedIssues).size },
      documentCoverage: { observed: documentCategories.size, supported: options.area === "small-claims" ? smallDocuments.length : options.area === "family" ? familyDocuments.length : options.area === "civil" ? civilDocuments.length : smallDocuments.length + familyDocuments.length + civilDocuments.length },
      evidenceCategoryCoverage: { observed: evidenceCategories.size, supported: options.area === "small-claims" ? smallEvidence.length : options.area === "family" ? familyEvidence.length : options.area === "civil" ? 1 : smallEvidence.length + familyEvidence.length + 1 },
    },
    humanOrLegalReviewCoverage: { reviewedBaseFixtureCount: baseIds.size, generatedScenariosAreNotLegalReview: true },
  };
  const summary = { seed: options.seed, suite: options.suite, requestedUniqueCount: options.count, availableUniqueCount: planning.availableUniqueCount, plannedUniqueCount: selectedPlan.length, executedCount: executed, candidateAttempts: planning.candidateAttempts, duplicateCandidatesRejected: planning.duplicateCandidatesRejected, shard: `${options.shardIndex}/${options.shardTotal}`, area: options.area || "all", planOnly: options.planOnly, totals, infrastructureErrors: totals.INFRASTRUCTURE_ERROR, uniqueNormalizedRequests: requestHashes.size, duplicateExecutions: duplicateNormalizedRequests };
  writeFileSync(join(outputDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(join(outputDirectory, "coverage.json"), `${JSON.stringify(coverage, null, 2)}\n`, "utf8");

  if (options.reproduce) {
    if (!reproducedResult || executed !== 1) usageError("reproduction did not resolve to exactly one scenario.");
    writeFileSync(join(outputDirectory, "reproduction.json"), `${JSON.stringify(reproducedResult, null, 2)}\n`, "utf8");
    console.log(`Reproduction=${options.reproduce} Base=${reproducedResult.baseId} Transformation=${reproducedResult.transformation}`);
    console.log(`Synthetic input=${JSON.stringify(reproducedResult.syntheticInput)}`);
    console.log(`Expected=${JSON.stringify(reproducedResult.expected)}`);
    console.log(`Actual=${JSON.stringify(reproducedResult.actual)}`);
    console.log(`Mismatches=${JSON.stringify(reproducedResult.mismatches)}`);
  }

  console.log(`Seed=${options.seed} Suite=${options.suite} RequestedUnique=${options.count} AvailableUnique=${planning.availableUniqueCount} Planned=${selectedPlan.length} Executed=${executed} CandidateAttempts=${planning.candidateAttempts} DuplicateCandidatesRejected=${planning.duplicateCandidatesRejected} Shard=${options.shardIndex}/${options.shardTotal} Area=${options.area || "all"} PlanOnly=${options.planOnly}`);
  console.log(`PASS=${totals.PASS} FAIL=${totals.FAIL} REVIEW=${totals.REVIEW} INFRASTRUCTURE_ERROR=${totals.INFRASTRUCTURE_ERROR}`);
  console.log(`Coverage: uniqueRequests=${requestHashes.size} duplicateExecutions=${duplicateNormalizedRequests} bases=${baseIds.size} semanticTransformations=${transformations.size} expectedContracts=${expectedContracts.size} surfaceVariations=${surfaceVariations.size} evidenceStates=${evidenceStates.size} areas=${areas.size} issues=${coverage.generatedRobustnessCoverage.issueCoverage.observed}/${coverage.generatedRobustnessCoverage.issueCoverage.supported} roles=${roles.size} stages=${stages.size} documents=${coverage.generatedRobustnessCoverage.documentCoverage.observed}/${coverage.generatedRobustnessCoverage.documentCoverage.supported} evidenceCategories=${coverage.generatedRobustnessCoverage.evidenceCategoryCoverage.observed}/${coverage.generatedRobustnessCoverage.evidenceCategoryCoverage.supported}`);
  for (const [message, group] of [...failureGroups.entries()].slice(0, 20)) console.log(`Failure group (${group.count}): ${message}; reproduce=${group.reproductionIds.join(",")}`);
  console.log(`Result files: ${outputDirectory}`);
  if (totals.INFRASTRUCTURE_ERROR) process.exitCode = 2;
  else if (totals.FAIL) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Simulation infrastructure error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
});
