import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { civilPleadingContract } from "./bundle11Contract.mjs";

const root = resolve(import.meta.dirname, "../..");
const inspectionRoot = resolve(root, "supabase-export/readonly-inspection");
const requiredInspectionResources = [
  "court_form_library",
  "court_form_clean_view",
  "court_form_master_view",
  "legal_form_mapping_rules",
];

function inspectionExportState(name) {
  const directory = resolve(inspectionRoot, name);
  for (const resource of requiredInspectionResources) {
    try {
      const rows = JSON.parse(readFileSync(resolve(directory, `${resource}.json`), "utf8"));
      if (!Array.isArray(rows) || rows.length === 0) return { name, directory, complete: false };
    } catch {
      return { name, directory, complete: false };
    }
  }
  return { name, directory, complete: true };
}

function selectLatestCompleteInspectionExport() {
  const states = readdirSync(inspectionRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => inspectionExportState(entry.name));
  const complete = states.filter((state) => state.complete).sort((left, right) => left.name.localeCompare(right.name));
  if (complete.length === 0) {
    throw new Error("Form certification validation failed: no complete readonly inspection export exists; each required resource JSON must be present, valid, and non-empty.");
  }
  return {
    exportDirectory: complete.at(-1).directory,
    ignoredIncompleteInspectionExports: states.filter((state) => !state.complete).map((state) => state.name).sort(),
  };
}

const inspectionSelection = selectLatestCompleteInspectionExport();
const exportDirectory = inspectionSelection.exportDirectory;
const coverageDirectory = resolve(inspectionRoot, readdirSync(inspectionRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
  .reverse()
  .find((name) => existsSync(resolve(inspectionRoot, name, "form-routing-coverage.csv"))));
const reportPath = resolve(root, "docs/ONTARIO_FORM_CERTIFICATION_PIPELINE_REPORT.json");
const completeQueuePath = resolve(root, "docs/ONTARIO_COMPLETE_FORM_ROUTING_QUEUE.csv");
const completeReportPath = resolve(root, "docs/ONTARIO_COMPLETE_FORM_ROUTING_REPORT.md");
const bundle = civilPleadingContract();
const migrationPath = resolve(root, bundle.migration);
const now = new Date("2026-08-12T12:00:00Z");

function parseCsv(text) {
  const rows = []; let row = []; let value = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') { value += char; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ",") { row.push(value); value = ""; }
    else if (!quoted && (char === "\n" || char === "\r")) { if (char === "\r" && text[index + 1] === "\n") index += 1; row.push(value); if (row.some(Boolean)) rows.push(row); row = []; value = ""; }
    else value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const [headers, ...values] = rows;
  return values.map((fields) => Object.fromEntries(headers.map((header, index) => [header.replace(/^\uFEFF/, ""), fields[index] ?? ""])));
}

function fail(message) { throw new Error(`Form certification validation failed: ${message}`); }
function requireHttps(value, label) { if (!/^https:\/\//.test(value)) fail(`${label} must be HTTPS`); }

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function expectedConditions(item) {
  return {
    all: [
      { path: "courtPath", equals: item.courtType },
      { path: "province", equals: "Ontario" },
      { path: "stage", equals: item.allowedStage },
      item.requiredFact,
    ],
  };
}

function liveMappingMismatches(record, item) {
  const expected = {
    court_area: item.courtType,
    procedure_stage: item.allowedStage,
    authority_source_id: item.mappingSourceId,
    authority_pinpoint: item.governingRulePinpoint,
  };
  const mismatches = Object.entries(expected)
    .filter(([field, value]) => record?.[field] !== value)
    .map(([field, value]) => `${field}: expected ${JSON.stringify(value)}, got ${JSON.stringify(record?.[field] ?? null)}`);
  if (stableJson(record?.applicability_conditions) !== stableJson(expectedConditions(item))) {
    mismatches.push(`applicability_conditions: expected ${stableJson(expectedConditions(item))}, got ${stableJson(record?.applicability_conditions ?? null)}`);
  }
  return mismatches;
}

function classifyLiveManifestMapping(liveMappings, item, key) {
  if (liveMappings.length === 0) return "pending";
  if (liveMappings.length > 1) fail(`duplicate active mapping for ${key}: found ${liveMappings.length}`);
  const mismatches = liveMappingMismatches(liveMappings[0], item);
  if (mismatches.length > 0) fail(`applied mapping mismatch for ${key}: ${mismatches.join("; ")}`);
  return "already-applied-and-matching";
}

function runMappingClassificationFixtures() {
  const item = { canonicalFormId: "fixture-id", courtType: "civil", allowedStage: "responding", mappingSourceId: "fixture-source", governingRulePinpoint: "r. fixture", requiredFact: { path: "formApplicability.civil.pleadingPosture", equals: "fixture-posture" } };
  const matching = { court_area: "civil", procedure_stage: "responding", authority_source_id: "fixture-source", authority_pinpoint: "r. fixture", applicability_conditions: expectedConditions(item) };
  if (classifyLiveManifestMapping([], item, "fixture-id|civil") !== "pending") fail("pending mapping fixture failed");
  if (classifyLiveManifestMapping([matching], item, "fixture-id|civil") !== "already-applied-and-matching") fail("already-applied matching mapping fixture failed");
  try { classifyLiveManifestMapping([{ ...matching, procedure_stage: "already-started" }], item, "fixture-id|civil"); fail("mismatched mapping fixture unexpectedly passed"); } catch (error) { if (!/procedure_stage/.test(error.message)) throw error; }
  try { classifyLiveManifestMapping([matching, matching], item, "fixture-id|civil"); fail("duplicate mapping fixture unexpectedly passed"); } catch (error) { if (!/duplicate active mapping/.test(error.message)) throw error; }
}

const master = JSON.parse(readFileSync(resolve(exportDirectory, "court_form_master_view.json"), "utf8"));
const mappings = JSON.parse(readFileSync(resolve(exportDirectory, "legal_form_mapping_rules.json"), "utf8"));
const provenance = parseCsv(readFileSync(resolve(root, "docs/ONTARIO_FORM_PROVENANCE_QUEUE.csv"), "utf8"));
const coverage = parseCsv(readFileSync(resolve(coverageDirectory, "form-routing-coverage.csv"), "utf8"));
const migration = readFileSync(migrationPath, "utf8");
const identities = new Map(master.map((record) => [`${record.canonical_form_id}|${record.court_type}`, record]));
const activeMappingsByKey = new Map();
for (const record of mappings.filter((record) => record.is_active === true || record.is_active === "true")) {
  const key = `${record.canonical_form_id}|${record.canonical_form_court_type}`;
  activeMappingsByKey.set(key, [...(activeMappingsByKey.get(key) || []), record]);
}
const activeMappingKeys = new Set(activeMappingsByKey.keys());
runMappingClassificationFixtures();
const manifestKeys = new Set();
const manifestMappingStates = {};
for (const item of bundle.items) {
  const key = `${item.canonicalFormId}|${item.courtType}`;
  if (manifestKeys.has(key)) fail(`duplicate manifest identity ${key}`);
  manifestKeys.add(key);
  if (!identities.has(key)) fail(`canonical identity absent from readonly export: ${key}`);
  const mappingState = classifyLiveManifestMapping(activeMappingsByKey.get(key) || [], item, key);
  manifestMappingStates[key] = mappingState;
  requireHttps(item.officialFormUrl, `${item.canonicalFormId} official form URL`);
  requireHttps(bundle.authority.url, "governing rule URL");
  if (!item.formRevisionOrEffectiveAt || !item.governingRulePinpoint || !item.requiredFact?.path || !item.requiredFact?.equals) fail(`incomplete provenance or posture contract for ${item.canonicalFormId}`);
  if (!bundle.question.choices.some((choice) => choice.value === item.requiredFact.equals)) fail(`choice contract excludes ${item.requiredFact.equals}`);
  if (!migration.includes(`'${item.canonicalFormId}'::uuid`)) fail(`checked-in migration diverges from manifest for ${item.canonicalFormId}`);
  if (mappingState === "pending" && (!migration.includes(`'${item.mappingSourceId}'`) || !migration.includes(`"equals":"${item.requiredFact.equals}"`))) fail(`pending migration diverges from manifest for ${item.canonicalFormId}`);
}
const checkedAtAge = (now - new Date(`${bundle.checkedAt}T00:00:00Z`)) / 86400000;
if (checkedAtAge > 366 || checkedAtAge < 0) fail("manifest provenance checked date is stale or future-dated");
const checkedDateLiteral = `DATE '${bundle.checkedAt}'`;
if ((migration.match(new RegExp(checkedDateLiteral.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length < 2) {
  fail("Bundle 12 migration must write the shared checked date for both authority and catalogue provenance");
}
for (const item of bundle.items) {
  const fixture = bundle.buildFixture(item);
  if (fixture.authority.authority_checked_at !== bundle.checkedAt || fixture.catalog.form_checked_at !== bundle.checkedAt) {
    fail(`shared checked-date fixture contract is incomplete for ${item.canonicalFormId}`);
  }
}
const conditionValues = [...migration.matchAll(/"path":"formApplicability\.civil\.pleadingPosture","equals":"([^"]+)"/g)].map((match) => match[1]);
const allowedValues = bundle.question.choices.map((choice) => choice.value).sort();
const sharedQuestionValues = [...migration.matchAll(/"value":"([^"]+)"/g)].map((match) => match[1]);
if ([...new Set(sharedQuestionValues)].sort().join("|") !== allowedValues.join("|") || conditionValues.length !== 1 || conditionValues[0] !== "counterclaim-new-party") fail("migration does not preserve the approved atomic Civil pleading-posture contract");

const provenanceByKey = new Map(provenance.map((record) => [`${record.canonical_form_id}|${record.court_type}`, record]));
const coverageByKey = new Map(coverage.map((record) => [`${record.canonical_form_id}|${record.court_type}`, record]));
const queue = master.map((record) => {
  const key = `${record.canonical_form_id}|${record.court_type}`;
  const research = provenanceByKey.get(key);
  const coverageRow = coverageByKey.get(key);
  let classification = "official-identity-ambiguous";
  let reason = coverageRow?.reason || "No current clean-view routing record.";
  if (activeMappingKeys.has(key)) { classification = "mapped-and-verified"; reason = "Active exact canonical mapping in readonly export."; }
  else if (manifestKeys.has(key)) { classification = "certifiable-next"; reason = "Manifest has exact provenance, Rule pinpoint, stage, and fail-closed posture contract."; }
  else if (research?.procedural_classification === "needs-new-structured-posture") { classification = "needs-new-structured-posture"; reason = research.minimum_new_form_applicability_fact || research.procedural_applicability_status; }
  else if (coverageRow?.classification === "court-only-or-non-user-form") { classification = "court-only-not-user-facing"; }
  else if (research?.procedural_classification === "insufficient-official-rule-support") { classification = "complex-review-required"; reason = research.procedural_applicability_status; }
  else if (research) { classification = "provenance-missing"; reason = research.research_reason || reason; }
  else if (coverageRow?.classification === "ambiguous-identity-or-stage") { classification = "official-identity-ambiguous"; }
  else if (coverageRow?.classification === "excluded-by-safety-boundary") { classification = "complex-review-required"; }
  return {
    canonical_form_id: record.canonical_form_id,
    court_type: record.court_type,
    form_number: record.form_number || "",
    official_title: record.official_title || "",
    procedure_stage: record.procedure_stage || "",
    official_source_result: research?.research_status || "not researched in current official-source queue",
    source_revision_status: research?.official_version_date || "not verified",
    required_structured_fact: research?.minimum_new_form_applicability_fact || "",
    user_facing_status: coverageRow?.classification === "court-only-or-non-user-form" ? "court-only" : "user-facing catalogue record",
    classification,
    reason,
  };
});
const totals = Object.fromEntries([...new Set(queue.map((entry) => entry.classification))].sort().map((classification) => [classification, queue.filter((entry) => entry.classification === classification).length]));
function csvCell(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
const columns = ["canonical_form_id", "court_type", "form_number", "official_title", "procedure_stage", "official_source_result", "source_revision_status", "required_structured_fact", "user_facing_status", "classification", "reason"];
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify({ generatedAt: now.toISOString(), sourceExport: exportDirectory, totals, queue }, null, 2)}\n`);
writeFileSync(completeQueuePath, `${columns.join(",")}\n${queue.map((entry) => columns.map((column) => csvCell(entry[column])).join(",")).join("\n")}\n`);
writeFileSync(completeReportPath, `# Ontario Complete Form Routing Report\n\nGenerated from the read-only live export and existing official-source research queue. This is a routing-certification inventory, not legal advice. Runtime catalogue selection remains exact canonical_form_id plus court_type.\n\n## Classification totals\n\n${Object.entries(totals).map(([classification, count]) => `- \`${classification}\`: ${count}`).join("\n")}\n\n## Safe next bundle\n\n- \`${bundle.migration}\`: ${bundle.items.map((item) => `\`${item.canonicalFormId}\``).join(", ")}.\n- Each item has an exact official Court Forms URL, the Rules of Civil Procedure URL, revision/effective information, an exact stage, and a fail-closed civil.pleadingPosture condition.\n\n## Review-required boundaries\n\n- \`provenance-missing\`: no official source/revision result recorded in the current queue.\n- \`official-identity-ambiguous\`: the current catalogue/export cannot establish a safe exact certification boundary.\n- \`complex-review-required\`: the official procedural boundary is issue-specific, incomplete, or otherwise unsafe to express without a further structured fact.\n- \`court-only-not-user-facing\`: catalogue record is not a user-facing recommendation target.\n\nThe complete per-identity record is in \`ONTARIO_COMPLETE_FORM_ROUTING_QUEUE.csv\`.\n`);
console.log(JSON.stringify({ migration: bundle.migration, checked: true, mappingStates: manifestMappingStates, sourceExport: exportDirectory, ignoredIncompleteInspectionExports: inspectionSelection.ignoredIncompleteInspectionExports, totals, report: reportPath, completeQueue: completeQueuePath, completeReport: completeReportPath }, null, 2));
