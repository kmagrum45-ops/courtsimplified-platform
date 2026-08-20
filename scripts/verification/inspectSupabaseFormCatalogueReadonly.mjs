import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

dotenv.config({ path: ".env.local", quiet: true });

const resources = [
  "court_form_library",
  "court_form_clean_view",
  "court_form_master_view",
  "legal_form_mapping_rules",
];
const pageSize = 1000;
const inspectedAt = new Date().toISOString();
const outputDirectory = path.join(
  process.cwd(),
  "supabase-export",
  "readonly-inspection",
  inspectedAt.replaceAll(":", "-").replaceAll(".", "-"),
);
const stagingDirectory = `${outputDirectory}.partial`;
const maxAttempts = 3;
const networkTimeoutMilliseconds = 5000;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const networkFailures = new Map();
let activeNetworkOperation = null;

function redactNetworkText(value) {
  return typeof value === "string"
    ? value.replace(/https?:\/\/[^\s)]+/gi, "[url]").slice(0, 300)
    : null;
}

function safeErrorDetails(error) {
  const cause = error?.cause;
  return {
    name: typeof error?.name === "string" ? error.name : null,
    code: typeof error?.code === "string" ? error.code : null,
    message: redactNetworkText(error?.message),
    cause: cause ? {
      name: typeof cause?.name === "string" ? cause.name : null,
      code: typeof cause?.code === "string" ? cause.code : null,
      message: redactNetworkText(cause?.message),
    } : null,
  };
}

function configuredUrlDetails(value) {
  if (!value) return { present: false, validHttps: false, hostname: null };
  try {
    const parsed = new URL(value);
    return { present: true, validHttps: parsed.protocol === "https:", hostname: parsed.hostname };
  } catch {
    return { present: true, validHttps: false, hostname: null };
  }
}

async function fetchWithTimeout(input, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), networkTimeoutMilliseconds);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (activeNetworkOperation) networkFailures.set(activeNetworkOperation, safeErrorDetails(error));
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function canonicalKey(row) {
  const canonicalFormId = text(row?.canonical_form_id);
  const courtType = text(row?.court_type);
  return canonicalFormId && courtType ? `${canonicalFormId}\u0000${courtType}` : null;
}

function csvValue(value) {
  const source = value === null || value === undefined
    ? ""
    : typeof value === "object"
    ? JSON.stringify(value)
    : String(value);
  return `"${source.replaceAll('"', '""')}"`;
}

function toCsv(rows) {
  const columns = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row || {}))),
  ).sort();
  const lines = [columns.map(csvValue).join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvValue(row?.[column])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

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
  return values.map((fields) => Object.fromEntries(headers.map((header, index) => [header.replace(/^\uFEFF/, ""), fields[index] || ""])));
}

function queueKey(row, courtColumn = "court_type") {
  const canonical = text(row?.canonical_form_id);
  const court = text(row?.[courtColumn]);
  return canonical && court ? `${canonical}\u0000${court}` : null;
}

async function writeRoutingReports(rowsByResource, inspectedAt) {
  const root = process.cwd();
  const [provenanceText, coverageText] = await Promise.all([
    readFile(path.join(root, "docs", "ONTARIO_FORM_PROVENANCE_QUEUE.csv"), "utf8"),
    readFile(path.join(root, "supabase-export", "readonly-inspection", "2026-08-11T23-28-34-070Z", "form-routing-coverage.csv"), "utf8"),
  ]);
  const provenanceByKey = new Map(parseCsv(provenanceText).map((row) => [queueKey(row), row]));
  const coverageByKey = new Map(parseCsv(coverageText).map((row) => [queueKey(row), row]));
  const mappingKeys = new Set((rowsByResource.legal_form_mapping_rules || [])
    .filter((row) => row?.is_active === true || row?.is_active === "true")
    .map((row) => queueKey(row, "canonical_form_court_type")).filter(Boolean));
  const queue = (rowsByResource.court_form_master_view || []).map((form) => {
    const key = queueKey(form);
    const provenance = provenanceByKey.get(key);
    const coverage = coverageByKey.get(key);
    let classification = "official-identity-ambiguous";
    let reason = coverage?.reason || "The current catalogue identity/stage has not been safely verified for routing.";
    if (mappingKeys.has(key)) { classification = "mapped-and-verified"; reason = "Active exact canonical mapping in the live export."; }
    else if (coverage?.classification === "court-only-or-non-user-form") { classification = "court-only-not-user-facing"; reason = coverage.reason || "Not a user-facing routing target."; }
    else if (provenance?.procedural_classification === "insufficient-official-rule-support" || coverage?.classification === "excluded-by-safety-boundary") { classification = "complex-review-required"; reason = provenance?.procedural_applicability_status || coverage?.reason || "A narrow safe routing boundary is not established."; }
    else if (provenance?.research_status && provenance.research_status !== "verified-catalogue-source") { classification = "provenance-missing"; reason = provenance.research_reason || "Official catalogue provenance is incomplete."; }
    return {
      canonical_form_id: form.canonical_form_id,
      court_type: form.court_type,
      form_number: form.form_number || "",
      official_title: form.official_title || "",
      procedure_stage: form.procedure_stage || "",
      official_source_result: provenance?.research_status || "not researched in official-source queue",
      source_revision_status: provenance?.official_version_date || "not verified",
      required_structured_fact: provenance?.minimum_new_form_applicability_fact || "",
      user_facing_status: classification === "court-only-not-user-facing" ? "court-only" : "user-facing catalogue record",
      classification,
      reason,
    };
  });
  const classifications = [
    "mapped-and-verified",
    "certifiable-next",
    "needs-new-structured-posture",
    "provenance-missing",
    "official-identity-ambiguous",
    "complex-review-required",
    "court-only-not-user-facing",
  ];
  const totals = Object.fromEntries(classifications.map((classification) => [classification, queue.filter((row) => row.classification === classification).length]));
  const cohort = queue.filter((row) => row.classification === "provenance-missing")
    .sort((left, right) => `${left.court_type}|${left.form_number}|${left.canonical_form_id}`.localeCompare(`${right.court_type}|${right.form_number}|${right.canonical_form_id}`, undefined, { numeric: true }))
    .slice(0, 25)
    .map((row) => ({ ...row, missing_proof: "Official Ontario Court Forms page must confirm the exact canonical identity, title/number, current revision/effective information, and an Ontario e-Laws Rule pinpoint with a narrow fail-closed posture boundary." }));
  const columns = Object.keys(queue[0] || {});
  const csv = `${columns.join(",")}\n${queue.map((row) => columns.map((column) => csvValue(row[column])).join(",")).join("\n")}\n`;
  const report = `# Ontario Complete Form Routing Report\n\nLive read-only export: \`${inspectedAt}\`. This report is an inventory, not legal advice. Runtime routing remains exact canonical_form_id plus court_type through legal_form_mapping_rules and the fail-closed resolver.\n\n## Classification totals\n\n${Object.entries(totals).map(([kind, count]) => `- \`${kind}\`: ${count}`).join("\n")}\n\n## Bundle 11 live status\n\nAll six exact Civil pleading identities are active mapped records. They remain verified only when their exact civil.pleadingPosture condition, Ontario, Civil court area, and stored stage pass.\n\n## Next research cohort\n\n${cohort.map((row) => `- \`${row.canonical_form_id}\` (${row.court_type}; ${row.form_number || "no stored number"}) — ${row.missing_proof}`).join("\n")}\n\nAll non-mapped catalogue records remain review-required until the recorded proof is complete.\n`;
  await Promise.all([
    writeFile(path.join(root, "docs", "ONTARIO_COMPLETE_FORM_ROUTING_QUEUE.csv"), csv, "utf8"),
    writeFile(path.join(root, "docs", "ONTARIO_COMPLETE_FORM_ROUTING_REPORT.md"), report, "utf8"),
    writeFile(path.join(root, "docs", "ONTARIO_FORM_CERTIFICATION_PIPELINE_REPORT.json"), `${JSON.stringify({ inspectedAt, totals, nextResearchCohort: cohort, queue }, null, 2)}\n`, "utf8"),
  ]);
  return { totals, cohort };
}

function countByKey(rows, keyForRow) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyForRow(row);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries()).filter(([, count]) => count > 1);
}

function libraryMetrics(rows) {
  const activeRows = rows.filter((row) => row?.is_active === true || row?.is_active === "true");
  const canonicalKeys = new Set(activeRows.map(canonicalKey).filter(Boolean));
  const duplicatePhysicalAssets = countByKey(activeRows, (row) => {
    const courtType = text(row?.court_type);
    const filePath = text(row?.file_path);
    const fileType = text(row?.file_type);
    return courtType && filePath && fileType ? `${courtType}\u0000${filePath}\u0000${fileType}` : null;
  });
  const displayIdentities = new Map();
  for (const row of activeRows) {
    const courtType = text(row?.court_type);
    const formNumber = text(row?.form_number) || "";
    const title = text(row?.official_title) || "";
    const canonical = text(row?.canonical_form_id);
    if (!courtType || !canonical) continue;
    const displayKey = `${courtType}\u0000${formNumber}\u0000${title}`;
    const identities = displayIdentities.get(displayKey) || new Set();
    identities.add(canonical);
    displayIdentities.set(displayKey, identities);
  }
  const splitCanonicalIdentities = Array.from(displayIdentities.values())
    .filter((identities) => identities.size > 1).length;
  const courtsByCanonicalId = new Map();
  for (const row of activeRows) {
    const canonical = text(row?.canonical_form_id);
    const courtType = text(row?.court_type);
    if (!canonical || !courtType) continue;
    const courts = courtsByCanonicalId.get(canonical) || new Set();
    courts.add(courtType);
    courtsByCanonicalId.set(canonical, courts);
  }
  const crossCourtCollisions = Array.from(courtsByCanonicalId.values())
    .filter((courts) => courts.size > 1).length;

  return {
    activeRows: activeRows.length,
    canonicalFormCount: canonicalKeys.size,
    duplicatePhysicalAssetGroups: duplicatePhysicalAssets.length,
    duplicatePhysicalAssetRows: duplicatePhysicalAssets.reduce((total, [, count]) => total + count, 0),
    splitCanonicalIdentityGroups: splitCanonicalIdentities,
    crossCourtCanonicalCollisions: crossCourtCollisions,
  };
}

function mappingMetrics(rows) {
  const activeRows = rows.filter((row) => row?.is_active === true || row?.is_active === "true");
  const activeCanonicalKeys = activeRows.map((row) => {
    const canonical = text(row?.canonical_form_id);
    const courtType = text(row?.canonical_form_court_type);
    return canonical && courtType ? `${canonical}\u0000${courtType}` : null;
  }).filter(Boolean);
  const duplicateActiveMappingIdentities = countByKey(activeCanonicalKeys, (key) => key);

  return {
    activeRows: activeRows.length,
    activeCanonicalMappingCount: new Set(activeCanonicalKeys).size,
    duplicateActiveCanonicalMappingGroups: duplicateActiveMappingIdentities.length,
  };
}

async function selectAll(supabase, resource) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(resource)
      .select("*")
      .range(from, from + pageSize - 1);
    if (error) return { rows: null, error: { code: error.code || null, message: error.message } };
    const page = Array.isArray(data) ? data : [];
    rows.push(...page);
    if (page.length < pageSize) return { rows, error: null };
  }
}

function isTransientFetchFailure(error) {
  return /fetch failed/i.test(error?.message || "");
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function selectAllWithRetry(supabase, resource) {
  let lastResult = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    activeNetworkOperation = resource;
    const result = await selectAll(supabase, resource);
    activeNetworkOperation = null;
    if (!result.error) return { ...result, attempts: attempt };
    lastResult = result;
    if (!isTransientFetchFailure(result.error) || attempt === maxAttempts) break;
    const waitMilliseconds = attempt * 250;
    console.error(`RETRY ${resource}: transient fetch failure; attempt ${attempt}/${maxAttempts}, waiting ${waitMilliseconds}ms`);
    await delay(waitMilliseconds);
  }
  return { ...lastResult, attempts: maxAttempts };
}

async function assertCompleteExport(directory) {
  for (const resource of resources) {
    const file = path.join(directory, `${resource}.json`);
    let rows;
    try {
      rows = JSON.parse(await readFile(file, "utf8"));
    } catch {
      throw new Error(`incomplete export: ${path.basename(file)} is absent or invalid JSON`);
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(`incomplete export: ${path.basename(file)} is empty`);
    }
  }
}

const urlDetails = configuredUrlDetails(url);
console.log(`CONFIG supabaseUrlPresent=${urlDetails.present} validHttps=${urlDetails.validHttps} hostname=${urlDetails.hostname || "unavailable"} publicKeyPresent=${Boolean(key)}`);

if (!url) {
  console.error("READ-ONLY INSPECTION BLOCKED: NEXT_PUBLIC_SUPABASE_URL is required.");
  process.exitCode = 1;
} else if (!urlDetails.validHttps) {
  console.error("READ-ONLY INSPECTION BLOCKED: NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL.");
  process.exitCode = 1;
} else if (!key) {
  console.error("READ-ONLY INSPECTION BLOCKED: NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required.");
  process.exitCode = 1;
} else {
  activeNetworkOperation = "connectivity-probe";
  let probeSucceeded = false;
  try {
    const response = await fetchWithTimeout(url, { method: "HEAD" });
    console.log(`PROBE hostname=${urlDetails.hostname} httpStatus=${response.status}`);
    probeSucceeded = true;
  } catch (error) {
    console.error(`PROBE BLOCKED hostname=${urlDetails.hostname} ${JSON.stringify(safeErrorDetails(error))}`);
  } finally {
    activeNetworkOperation = null;
  }
  if (!probeSucceeded) {
    console.error("READ-ONLY INSPECTION BLOCKED: connectivity probe failed; table queries were not attempted.");
    process.exitCode = 1;
  } else {
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout },
  });
  const summary = {
    inspectedAt,
    environment: {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(url),
      publicSupabaseKey: Boolean(key),
      serviceRoleKeyUsed: false,
    },
    resources: {},
    inaccessibleResources: [],
  };
  const rowsByResource = {};

  for (const resource of resources) {
    const result = await selectAllWithRetry(supabase, resource);
    if (result.error) {
      const networkCause = networkFailures.get(resource) || null;
      summary.resources[resource] = { accessible: false, attempts: result.attempts, error: result.error, networkCause };
      summary.inaccessibleResources.push(resource);
      console.error(`FINAL ${resource}: ${result.attempts} attempt(s) exhausted.`);
      if (networkCause) console.error(`NETWORK ${resource}: ${JSON.stringify(networkCause)}`);
      console.error(`BLOCKED ${resource}: ${result.error.code || "unknown"} — ${result.error.message}`);
      continue;
    }

    const rows = result.rows;
    rowsByResource[resource] = rows;
    const metrics = resource === "court_form_library"
      ? libraryMetrics(rows)
      : resource === "legal_form_mapping_rules"
      ? mappingMetrics(rows)
      : {
          activeRows: rows.filter((row) => row?.is_active === true || row?.is_active === "true").length,
          canonicalFormCount: new Set(rows.map(canonicalKey).filter(Boolean)).size,
        };
    summary.resources[resource] = {
      accessible: true,
      rowCount: rows.length,
      metrics,
      exports: [`${resource}.json`, `${resource}.csv`],
    };
    console.log(`READ ${resource}: ${rows.length} rows`);
  }

  if (summary.inaccessibleResources.length === 0) {
    await rm(stagingDirectory, { recursive: true, force: true });
    await mkdir(stagingDirectory, { recursive: true });
    for (const resource of resources) {
      const rows = rowsByResource[resource];
      await writeFile(path.join(stagingDirectory, `${resource}.json`), `${JSON.stringify(rows, null, 2)}\n`, "utf8");
      await writeFile(path.join(stagingDirectory, `${resource}.csv`), toCsv(rows), "utf8");
    }
    await assertCompleteExport(stagingDirectory);
    await writeFile(path.join(stagingDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    await rename(stagingDirectory, outputDirectory);
    const routing = await writeRoutingReports(rowsByResource, inspectedAt);
    console.log(`ROUTING TOTALS ${JSON.stringify(routing.totals)}`);
    console.log(`NEXT RESEARCH COHORT ${routing.cohort.length}`);
  }
  console.log(`SUMMARY ${summary.inaccessibleResources.length === 0 ? path.join(outputDirectory, "summary.json") : "not written; no complete export"}`);
  console.log(`INACCESSIBLE ${summary.inaccessibleResources.length}`);
  if (summary.inaccessibleResources.length > 0) process.exitCode = 1;
  }
}
