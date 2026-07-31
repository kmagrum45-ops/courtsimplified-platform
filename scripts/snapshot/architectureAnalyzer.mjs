import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const SNAPSHOT_AUDIT_MODEL_VERSION = "1.0.0";
const SYSTEM_HEALTH_MODEL_VERSION = "1.0.0";

const DEFAULT_IGNORED = [
  "node_modules",
  ".next",
  ".git",
  "_PROJECT_REGISTRY",
];

function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/");
}

function shouldIgnore(filePath, ignored = DEFAULT_IGNORED) {
  const normalized = normalizePath(filePath);
  return ignored.some((part) => normalized.includes(`/${part}/`));
}

function readSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function walk(dir, root, files = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, item.name);

    if (shouldIgnore(fullPath)) continue;

    if (item.isDirectory()) {
      walk(fullPath, root, files);
    } else {
      files.push({
        absolutePath: fullPath,
        file: normalizePath(path.relative(root, fullPath)),
      });
    }
  }

  return files;
}

function getImports(content) {
  const staticImports = [...content.matchAll(/from\s+["']([^"']+)["']/g)].map(
    (match) => match[1],
  );

  const sideEffectImports = [...content.matchAll(/import\s+["']([^"']+)["']/g)].map(
    (match) => match[1],
  );

  return Array.from(new Set([...staticImports, ...sideEffectImports]));
}

function getExports(content) {
  return [
    ...content.matchAll(
      /export\s+(type|interface|function|const|class)\s+([A-Za-z0-9_]+)/g,
    ),
  ].map((match) => ({
    kind: match[1],
    name: match[2],
  }));
}

function classifyOwner(file) {
  if (file.startsWith("src/lib/case-system/litigation-intelligence/modules")) {
    return "Litigation Intelligence Modules";
  }

  if (file.startsWith("src/lib/case-system/litigation-intelligence")) {
    return "Litigation Intelligence";
  }

  if (file.startsWith("src/lib/case-system/intelligence")) {
    return "CourtSimplified Brain";
  }

  if (file.startsWith("src/lib/case-system/orchestration")) {
    return "Orchestration";
  }

  if (file.startsWith("src/lib/case-system/architecture")) {
    return "Master Architecture";
  }

  if (file.startsWith("src/lib/case-system/evidence")) {
    return "Evidence";
  }

  if (file.startsWith("src/lib/case-system/procedure")) {
    return "Procedure";
  }

  if (file.startsWith("src/lib/case-system/workflow")) {
    return "Workflow";
  }

  if (file.startsWith("src/lib/case-system/knowledge")) {
    return "Knowledge";
  }

  if (file.startsWith("src/lib/case-system/claims")) {
    return "Claims";
  }

  if (file.startsWith("src/lib/case-system/credibility")) {
    return "Credibility";
  }

  if (file.startsWith("src/lib/case-system/damages")) {
    return "Damages";
  }

  if (file.startsWith("app/api")) {
    return "API Routes";
  }

  if (file.startsWith("app")) {
    return "App UI";
  }

  if (file.startsWith("scripts")) {
    return "Developer Toolkit";
  }

  return "Unclassified";
}

function classifyKind(file, content) {
  if (file.includes("/api/") && file.endsWith("route.ts")) return "api-route";
  if (file.endsWith(".tsx")) return "ui-component";
  if (file.endsWith(".json")) return "json";
  if (file.endsWith(".mjs") || file.endsWith(".js")) return "developer-script";
  if (file.includes("schema") || file.includes("Schema")) return "schema";
  if (file.includes("Engine") || file.includes("engine")) return "engine";
  if (file.includes("Investigator") || file.includes("investigator")) {
    return "investigator";
  }
  if (content.includes("export function")) return "module";
  return "file";
}

function detectDomainRole(file) {
  const lower = file.toLowerCase();

  if (lower.includes("brain")) return "brain";
  if (lower.includes("migration")) return "migration";
  if (lower.includes("bridge")) return "bridge";
  if (lower.includes("assembly")) return "assembly";
  if (lower.includes("schema")) return "schema";
  if (lower.includes("investigator")) return "investigator";
  if (lower.includes("engine")) return "engine";
  if (lower.includes("workflow")) return "workflow";
  if (lower.includes("evidence")) return "evidence";
  if (lower.includes("authority")) return "authority";
  if (lower.includes("procedure")) return "procedure";
  if (lower.includes("form")) return "forms";
  if (lower.includes("document")) return "documents";

  return "general";
}

function detectRiskFlags(record) {
  const flags = [];

  if (record.lines >= 1500) {
    flags.push("very-large-file");
  } else if (record.lines >= 800) {
    flags.push("large-file");
  }

  if (
    (record.file.endsWith(".ts") || record.file.endsWith(".tsx")) &&
    record.lines <= 5
  ) {
    flags.push("possibly-empty-typescript-file");
  }

  if (record.owner === "Unclassified") {
    flags.push("unclassified-owner");
  }

  if (
    record.kind === "engine" &&
    record.file.toLowerCase().includes("old")
  ) {
    flags.push("possible-old-engine");
  }

  return flags;
}

function groupBy(records, key) {
  const grouped = {};

  for (const record of records) {
    const value = record[key] || "unknown";
    if (!grouped[value]) grouped[value] = [];
    grouped[value].push(record);
  }

  return grouped;
}

function detectDuplicateFileNames(records) {
  const grouped = {};

  for (const record of records) {
    const name = path.basename(record.file).toLowerCase();
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push(record.file);
  }

  return Object.entries(grouped)
    .filter(([, files]) => files.length > 1)
    .map(([name, files]) => ({
      name,
      files,
      risk:
        files.some((file) => file.toLowerCase().includes("engine")) ||
        files.some((file) => file.toLowerCase().includes("investigator"))
          ? "review-possible-duplicate-system"
          : "review-duplicate-name",
    }));
}

function detectImportantConnections(records) {
  const connections = {
    importsCourtSimplifiedBrain: [],
    importsBrainMigrationLayer: [],
    importsMasterCaseSchema: [],
    importsCaseInvestigator: [],
    importsLitigationIntelligence: [],
    importsEvidenceIntelligence: [],
    importsWorkflow: [],
  };

  for (const record of records) {
    const imports = record.imports.join(" ").toLowerCase();

    if (imports.includes("courtsimplifiedbrain")) {
      connections.importsCourtSimplifiedBrain.push(record.file);
    }

    if (imports.includes("brainmigrationlayer")) {
      connections.importsBrainMigrationLayer.push(record.file);
    }

    if (imports.includes("mastercaseschema")) {
      connections.importsMasterCaseSchema.push(record.file);
    }

    if (imports.includes("caseinvestigator")) {
      connections.importsCaseInvestigator.push(record.file);
    }

    if (imports.includes("litigation-intelligence")) {
      connections.importsLitigationIntelligence.push(record.file);
    }

    if (imports.includes("evidenceintelligence")) {
      connections.importsEvidenceIntelligence.push(record.file);
    }

    if (imports.includes("workflow")) {
      connections.importsWorkflow.push(record.file);
    }
  }

  return connections;
}

function detectLitigationModules(records) {
  return records
    .filter((record) =>
      record.file.startsWith(
        "src/lib/case-system/litigation-intelligence/modules/",
      ),
    )
    .map((record) => ({
      file: record.file,
      lines: record.lines,
      exports: record.exports.map((item) => item.name),
      riskFlags: record.riskFlags,
    }));
}

function buildArchitectureSummary(records) {
  const byOwner = groupBy(records, "owner");
  const byKind = groupBy(records, "kind");

  return {
    totalFiles: records.length,
    owners: Object.fromEntries(
      Object.entries(byOwner).map(([owner, items]) => [owner, items.length]),
    ),
    kinds: Object.fromEntries(
      Object.entries(byKind).map(([kind, items]) => [kind, items.length]),
    ),
    largeFiles: records
      .filter((record) => record.lines >= 800)
      .map((record) => ({
        file: record.file,
        lines: record.lines,
        owner: record.owner,
      }))
      .sort((a, b) => b.lines - a.lines),
    riskFlags: records
      .filter((record) => record.riskFlags.length > 0)
      .map((record) => ({
        file: record.file,
        owner: record.owner,
        lines: record.lines,
        flags: record.riskFlags,
      })),
  };
}

function buildRecommendations(analysis) {
  const recommendations = [];

  if (analysis.duplicates.length > 0) {
    recommendations.push(
      "Review duplicate filenames before creating new engines or modules.",
    );
  }

  if (analysis.summary.largeFiles.length > 0) {
    recommendations.push(
      "Review very large files for responsibility boundaries before adding more logic.",
    );
  }

  if (analysis.litigationModules.length >= 8) {
    recommendations.push(
      "Treat Litigation Intelligence as a domain subsystem, not random standalone engines.",
    );
  }

  if (analysis.connections.importsCaseInvestigator.length === 0) {
    recommendations.push(
      "Review whether the new Case Investigator is fully integrated into the Brain/orchestration path.",
    );
  }

  recommendations.push(
    "Before major code changes, update the Developer Snapshot and use it as the current control state.",
  );

  return recommendations;
}

export function analyzeArchitecture(options = {}) {
  const root = options.root || process.cwd();
  const files = walk(root, root);

  const records = files.map((item) => {
    const content = readSafe(item.absolutePath);
    const extension = path.extname(item.file);
    const stat = fs.statSync(item.absolutePath);

    const record = {
      file: item.file,
      owner: classifyOwner(item.file),
      kind: classifyKind(item.file, content),
      role: detectDomainRole(item.file),
      extension,
      sizeBytes: stat.size,
      lines: content ? content.split(/\r?\n/).length : 0,
      imports: getImports(content),
      exports: getExports(content),
      lastModified: stat.mtime.toISOString(),
      riskFlags: [],
    };

    record.riskFlags = detectRiskFlags(record);

    return record;
  });

  const analysis = {
    generatedAt: new Date().toISOString(),
    root,
    summary: buildArchitectureSummary(records),
    duplicates: detectDuplicateFileNames(records),
    connections: detectImportantConnections(records),
    litigationModules: detectLitigationModules(records),
    records,
  };

  return {
    ...analysis,
    recommendations: buildRecommendations(analysis),
  };
}

export function writeArchitectureAnalysis(options = {}) {
  const root = options.root || process.cwd();
  const outputDir = options.outputDir || path.join(root, "_PROJECT_REGISTRY");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const analysis = analyzeArchitecture({ root });

  fs.writeFileSync(
    path.join(outputDir, "ArchitectureAnalysis.json"),
    JSON.stringify(analysis, null, 2),
    "utf8",
  );

  fs.writeFileSync(
    path.join(outputDir, "ArchitectureAnalysis.txt"),
    [
      "COURTSIMPLIFIED ARCHITECTURE ANALYSIS",
      "",
      `GeneratedAt: ${analysis.generatedAt}`,
      `Root: ${analysis.root}`,
      "",
      "SUMMARY",
      `Total files: ${analysis.summary.totalFiles}`,
      "",
      "OWNERS",
      ...Object.entries(analysis.summary.owners).map(
        ([owner, count]) => `- ${owner}: ${count}`,
      ),
      "",
      "KINDS",
      ...Object.entries(analysis.summary.kinds).map(
        ([kind, count]) => `- ${kind}: ${count}`,
      ),
      "",
      "LITIGATION INTELLIGENCE MODULES",
      ...analysis.litigationModules.map(
        (module) => `- ${module.file} (${module.lines} lines)`,
      ),
      "",
      "LARGE FILES",
      ...(analysis.summary.largeFiles.length
        ? analysis.summary.largeFiles.map(
            (file) => `- ${file.file} (${file.lines} lines)`,
          )
        : ["- None detected over threshold."]),
      "",
      "DUPLICATE FILENAMES",
      ...(analysis.duplicates.length
        ? analysis.duplicates.map(
            (item) => `- ${item.name}: ${item.files.join(", ")}`,
          )
        : ["- None detected."]),
      "",
      "RECOMMENDATIONS",
      ...analysis.recommendations.map((item) => `- ${item}`),
      "",
    ].join("\n"),
    "utf8",
  );

  return analysis;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  if (typeof value === "string") return value.trim() ? [value] : [];
  if (
    typeof value === "object" &&
    Object.keys(value).length === 0
  ) {
    return [];
  }

  return [value];
}

function readJsonFile(filePath, label) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath || "(path not supplied)"}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function markdownCell(value) {
  if (value === null || value === undefined) return "-";

  const text = Array.isArray(value)
    ? value.join(", ")
    : String(value);

  if (!text.trim()) return "-";

  return text
    .replaceAll("|", "\\|")
    .replace(/\r?\n/g, "<br>");
}

function pathKey(file) {
  return normalizePath(String(file || "")).toLowerCase();
}

function resolveModelFile(root, modelFile) {
  const normalized = normalizePath(modelFile);
  return path.join(root, ...normalized.split("/"));
}

function buildSnapshotGraph(architectureModel, workflowModel) {
  const nodes = asArray(architectureModel.Nodes);
  const nodeByKey = new Map();
  const adjacency = new Map();

  for (const node of nodes) {
    const key = pathKey(node.File);
    nodeByKey.set(key, node);
    adjacency.set(key, new Set());
  }

  const graphEdges = [];

  function addEdge(sourceFile, targetFile, kind) {
    const source = pathKey(sourceFile);
    const target = pathKey(targetFile);

    if (!nodeByKey.has(source) || !nodeByKey.has(target)) return;

    adjacency.get(source).add(target);
    graphEdges.push({
      Source: nodeByKey.get(source).File,
      Target: nodeByKey.get(target).File,
      Kind: kind,
    });
  }

  for (const edge of asArray(architectureModel.Edges)) {
    if (edge.Kind === "InternalImport") {
      addEdge(edge.Source, edge.Target, "InternalImport");
    }
  }

  for (const call of asArray(workflowModel.RuntimeApiCalls)) {
    if (call.Status === "Resolved" && call.Target) {
      addEdge(call.Source, call.Target, "RuntimeApiCall");
    }
  }

  return {
    nodes,
    nodeByKey,
    adjacency,
    edges: graphEdges,
  };
}

function detectCircularDependencyGroups(graph) {
  let nextIndex = 0;
  const indexes = new Map();
  const lowLinks = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];

  function visit(nodeKey) {
    indexes.set(nodeKey, nextIndex);
    lowLinks.set(nodeKey, nextIndex);
    nextIndex += 1;
    stack.push(nodeKey);
    onStack.add(nodeKey);

    for (const targetKey of graph.adjacency.get(nodeKey) || []) {
      if (!indexes.has(targetKey)) {
        visit(targetKey);
        lowLinks.set(
          nodeKey,
          Math.min(lowLinks.get(nodeKey), lowLinks.get(targetKey)),
        );
      } else if (onStack.has(targetKey)) {
        lowLinks.set(
          nodeKey,
          Math.min(lowLinks.get(nodeKey), indexes.get(targetKey)),
        );
      }
    }

    if (lowLinks.get(nodeKey) !== indexes.get(nodeKey)) return;

    const component = [];

    while (stack.length > 0) {
      const current = stack.pop();
      onStack.delete(current);
      component.push(current);

      if (current === nodeKey) break;
    }

    components.push(component);
  }

  for (const nodeKey of graph.nodeByKey.keys()) {
    if (!indexes.has(nodeKey)) visit(nodeKey);
  }

  const circularComponents = components.filter((component) => {
    if (component.length > 1) return true;

    const onlyNode = component[0];
    return graph.adjacency.get(onlyNode)?.has(onlyNode) || false;
  });

  return circularComponents
    .map((component, index) => {
      const componentSet = new Set(component);
      const nodes = component.map((key) => graph.nodeByKey.get(key));
      const roles = Array.from(new Set(nodes.map((node) => node.Role))).sort();
      const layers = Array.from(new Set(nodes.map((node) => node.Layer))).sort();
      const cycleEdges = graph.edges
        .filter(
          (edge) =>
            componentSet.has(pathKey(edge.Source)) &&
            componentSet.has(pathKey(edge.Target)),
        )
        .sort((left, right) =>
          `${left.Source}|${left.Target}|${left.Kind}`.localeCompare(
            `${right.Source}|${right.Target}|${right.Kind}`,
          ),
        );
      const highImpactRoles = new Set([
        "API Route",
        "Architecture System",
        "Persistence",
        "Workflow",
      ]);
      const riskLevel =
        nodes.some((node) => highImpactRoles.has(node.Role)) ||
        component.length >= 4
          ? "High"
          : "Medium";

      return {
        Group: index + 1,
        RiskLevel: riskLevel,
        FileCount: nodes.length,
        Files: nodes.map((node) => node.File).sort(),
        Roles: roles,
        Layers: layers,
        Edges: cycleEdges,
        ReviewRequired: true,
        AutomaticRemovalAllowed: false,
      };
    })
    .sort((left, right) => {
      if (left.RiskLevel !== right.RiskLevel) {
        return left.RiskLevel === "High" ? -1 : 1;
      }

      return left.Files[0].localeCompare(right.Files[0]);
    })
    .map((group, index) => ({
      ...group,
      Group: index + 1,
    }));
}

function getReachableNodeKeys(graph) {
  const queue = [];
  const reachable = new Set();

  for (const node of graph.nodes) {
    if (!node.IsEntryPoint) continue;

    const key = pathKey(node.File);
    reachable.add(key);
    queue.push(key);
  }

  while (queue.length > 0) {
    const current = queue.shift();

    for (const target of graph.adjacency.get(current) || []) {
      if (reachable.has(target)) continue;

      reachable.add(target);
      queue.push(target);
    }
  }

  return reachable;
}

function getDeadCodeExemption(node) {
  const file = normalizePath(node.File).toLowerCase();

  if (node.IsEntryPoint) return "Entry point";
  if (file.endsWith(".d.ts")) return "TypeScript declaration file";
  if (node.Role === "Configuration") return "Project configuration";

  return null;
}

function classifyDeadCodeCandidate(node) {
  const consumerCount = Number(node.ConsumerCount || 0);
  const highImpactRoles = new Set([
    "Architecture System",
    "Persistence",
    "Workflow",
  ]);
  const reviewSensitiveRoles = new Set([
    "Contract or Schema",
    "Library Module",
    "Registry",
  ]);

  if (consumerCount === 0 && highImpactRoles.has(node.Role)) {
    return {
      Confidence: "High",
      Reason:
        "Not reachable from any detected application/API entry point and has no detected consumers.",
    };
  }

  if (consumerCount === 0 && reviewSensitiveRoles.has(node.Role)) {
    return {
      Confidence: "Medium",
      Reason:
        "Not reachable from any detected entry point and has no detected consumers; dynamic or registry-based use must be checked manually.",
    };
  }

  if (consumerCount === 0) {
    return {
      Confidence: "Medium",
      Reason:
        "Not reachable from any detected entry point and has no detected consumers.",
    };
  }

  return {
    Confidence: "Review",
    Reason:
      "Belongs to an internally connected subsystem that is not reachable from a detected application/API entry point.",
  };
}

function detectDeadCodeCandidates(graph) {
  const reachable = getReachableNodeKeys(graph);
  const candidates = [];
  const exemptions = [];

  for (const node of graph.nodes) {
    const key = pathKey(node.File);

    if (reachable.has(key)) continue;

    const exemption = getDeadCodeExemption(node);

    if (exemption) {
      exemptions.push({
        File: node.File,
        Role: node.Role,
        Reason: exemption,
      });
      continue;
    }

    const classification = classifyDeadCodeCandidate(node);

    candidates.push({
      File: node.File,
      Name: node.Name,
      Role: node.Role,
      Layer: node.Layer,
      Lines: Number(node.Lines || 0),
      ConsumerCount: Number(node.ConsumerCount || 0),
      Consumers: asArray(node.Consumers),
      InternalDependencies: asArray(node.InternalDependencies),
      Confidence: classification.Confidence,
      Reason: classification.Reason,
      ReviewRequired: true,
      AutomaticRemovalAllowed: false,
    });
  }

  const confidenceOrder = {
    High: 0,
    Medium: 1,
    Review: 2,
  };

  candidates.sort((left, right) => {
    const confidenceDifference =
      confidenceOrder[left.Confidence] - confidenceOrder[right.Confidence];

    if (confidenceDifference !== 0) return confidenceDifference;

    return left.File.localeCompare(right.File);
  });

  return {
    ReachableNodeCount: reachable.size,
    Candidates: candidates,
    Exemptions: exemptions.sort((left, right) =>
      left.File.localeCompare(right.File),
    ),
  };
}

function countUnique(values) {
  return new Set(values).size;
}

function addValidationCheck(checks, name, passed, expected, actual, details) {
  checks.push({
    Name: name,
    Status: passed ? "Passed" : "Failed",
    Expected: expected,
    Actual: actual,
    Details: details,
  });
}

function countEngineRegistryRows(markdown) {
  const marker = "## Engine Records";
  const markerIndex = markdown.indexOf(marker);

  if (markerIndex < 0) return 0;

  const section = markdown.slice(markerIndex + marker.length);
  const lines = section.split(/\r?\n/);
  let tableStarted = false;
  let count = 0;

  for (const line of lines) {
    if (!line.trim()) {
      if (tableStarted) break;
      continue;
    }

    if (!line.trim().startsWith("|")) {
      if (tableStarted) break;
      continue;
    }

    tableStarted = true;

    if (
      line.includes("| Name | Category |") ||
      /^\|\s*:?-+/.test(line.trim())
    ) {
      continue;
    }

    count += 1;
  }

  return count;
}

function getEngineRegistrySummaryCount(markdown) {
  const match = markdown.match(
    /\|\s*Architecture systems\s*\|\s*(\d+)\s*\|/i,
  );

  return match ? Number(match[1]) : null;
}

function validateSnapshotRegistries(options) {
  const {
    root,
    architectureModel,
    workflowModel,
    engineRegistryPath,
    graph,
  } = options;
  const checks = [];
  const nodes = asArray(architectureModel.Nodes);
  const edges = asArray(architectureModel.Edges);
  const workflows = asArray(workflowModel.Workflows);
  const traces = asArray(workflowModel.EntryTraces);
  const runtimeCalls = asArray(workflowModel.RuntimeApiCalls);
  const architectureStatistics = architectureModel.Statistics || {};
  const workflowStatistics = workflowModel.Statistics || {};
  const nodeFiles = nodes.map((node) => pathKey(node.File));
  const nodeIds = nodes.map((node) => String(node.Id || "").toLowerCase());

  addValidationCheck(
    checks,
    "Architecture node total",
    Number(architectureStatistics.TotalNodes) === nodes.length,
    nodes.length,
    Number(architectureStatistics.TotalNodes),
    "Architecture statistics must equal the actual node array.",
  );
  addValidationCheck(
    checks,
    "Architecture edge total",
    Number(architectureStatistics.TotalEdges) === edges.length,
    edges.length,
    Number(architectureStatistics.TotalEdges),
    "Architecture statistics must equal the actual edge array.",
  );
  addValidationCheck(
    checks,
    "Unique architecture files",
    countUnique(nodeFiles) === nodeFiles.length,
    nodes.length,
    countUnique(nodeFiles),
    "Every architecture node must map to one unique source file.",
  );
  addValidationCheck(
    checks,
    "Unique architecture node IDs",
    countUnique(nodeIds) === nodeIds.length,
    nodes.length,
    countUnique(nodeIds),
    "Every architecture node ID must be unique.",
  );

  const invalidInternalEdges = edges.filter(
    (edge) =>
      edge.Kind === "InternalImport" &&
      (!graph.nodeByKey.has(pathKey(edge.Source)) ||
        !graph.nodeByKey.has(pathKey(edge.Target))),
  );
  addValidationCheck(
    checks,
    "Internal edge references",
    invalidInternalEdges.length === 0,
    0,
    invalidInternalEdges.length,
    "Every internal import edge must reference two architecture nodes.",
  );

  const unresolvedInternalEdges = Number(
    architectureStatistics.UnresolvedInternalEdges || 0,
  );
  addValidationCheck(
    checks,
    "Unresolved internal imports",
    unresolvedInternalEdges === 0,
    0,
    unresolvedInternalEdges,
    "Internal imports should resolve to known source files.",
  );

  const missingSourceFiles = nodes.filter(
    (node) => !fs.existsSync(resolveModelFile(root, node.File)),
  );
  addValidationCheck(
    checks,
    "Architecture source files exist",
    missingSourceFiles.length === 0,
    0,
    missingSourceFiles.length,
    "Every architecture node must exist in the current project tree.",
  );

  const entryPointCount = nodes.filter((node) => node.IsEntryPoint).length;
  addValidationCheck(
    checks,
    "Architecture entry-point total",
    Number(architectureStatistics.EntryPoints) === entryPointCount,
    entryPointCount,
    Number(architectureStatistics.EntryPoints),
    "Entry-point statistics must match entry-point nodes.",
  );

  addValidationCheck(
    checks,
    "Workflow architecture model version",
    workflowModel.ArchitectureModelVersion === architectureModel.ModelVersion,
    architectureModel.ModelVersion,
    workflowModel.ArchitectureModelVersion,
    "Workflow analysis must reference the current architecture model version.",
  );
  addValidationCheck(
    checks,
    "Workflow record total",
    Number(workflowStatistics.WorkflowRecords) === workflows.length,
    workflows.length,
    Number(workflowStatistics.WorkflowRecords),
    "Workflow statistics must equal the workflow record array.",
  );

  const workflowFiles = workflows.map((workflow) => pathKey(workflow.File));
  addValidationCheck(
    checks,
    "Unique workflow records",
    countUnique(workflowFiles) === workflowFiles.length,
    workflows.length,
    countUnique(workflowFiles),
    "Every workflow file must have one workflow record.",
  );

  const unknownWorkflowFiles = workflowFiles.filter(
    (file) => !graph.nodeByKey.has(file),
  );
  addValidationCheck(
    checks,
    "Workflow files in architecture model",
    unknownWorkflowFiles.length === 0,
    0,
    unknownWorkflowFiles.length,
    "Every workflow record must reference an architecture node.",
  );

  const traceFiles = traces.map((trace) => pathKey(trace.Entry));
  addValidationCheck(
    checks,
    "Unique entry traces",
    countUnique(traceFiles) === traceFiles.length,
    traces.length,
    countUnique(traceFiles),
    "Every entry file must have one trace.",
  );
  addValidationCheck(
    checks,
    "Entry-trace total",
    traces.length === entryPointCount,
    entryPointCount,
    traces.length,
    "Every architecture entry point must have one integration trace.",
  );

  const unknownTraceFiles = traceFiles.filter(
    (file) => !graph.nodeByKey.has(file),
  );
  addValidationCheck(
    checks,
    "Entry traces in architecture model",
    unknownTraceFiles.length === 0,
    0,
    unknownTraceFiles.length,
    "Every entry trace must reference an architecture node.",
  );

  addValidationCheck(
    checks,
    "Runtime API call total",
    Number(workflowStatistics.RuntimeApiCalls) === runtimeCalls.length,
    runtimeCalls.length,
    Number(workflowStatistics.RuntimeApiCalls),
    "Workflow statistics must equal the runtime API call array.",
  );

  const unresolvedRuntimeCalls = runtimeCalls.filter(
    (call) => call.Status !== "Resolved",
  );
  addValidationCheck(
    checks,
    "Unresolved runtime API calls",
    unresolvedRuntimeCalls.length === 0,
    0,
    unresolvedRuntimeCalls.length,
    "Every detected runtime API call should resolve to an API route.",
  );

  const invalidRuntimeTargets = runtimeCalls.filter(
    (call) =>
      call.Status === "Resolved" &&
      (!graph.nodeByKey.has(pathKey(call.Source)) ||
        !graph.nodeByKey.has(pathKey(call.Target))),
  );
  addValidationCheck(
    checks,
    "Runtime API graph references",
    invalidRuntimeTargets.length === 0,
    0,
    invalidRuntimeTargets.length,
    "Resolved runtime calls must reference known source and target nodes.",
  );

  const engineRegistryExists =
    Boolean(engineRegistryPath) &&
    fs.existsSync(engineRegistryPath) &&
    fs.statSync(engineRegistryPath).size > 0;
  addValidationCheck(
    checks,
    "Engine registry exists",
    engineRegistryExists,
    "Present and non-empty",
    engineRegistryExists ? "Present" : "Missing",
    "The architecture audit requires the generated engine registry.",
  );

  let engineRegistryRows = 0;
  let engineRegistrySummaryCount = null;
  let engineRegistryHasRequiredColumns = false;

  if (engineRegistryExists) {
    const engineRegistry = fs.readFileSync(engineRegistryPath, "utf8");
    engineRegistryRows = countEngineRegistryRows(engineRegistry);
    engineRegistrySummaryCount = getEngineRegistrySummaryCount(engineRegistry);
    const requiredColumns = [
      "Purpose",
      "Inputs",
      "Outputs",
      "Dependencies",
      "Consumers",
      "Workflow Position",
      "AI Pipeline Position",
      "Risk Level",
      "Duplicate Detection",
      "Integration Points",
    ];
    engineRegistryHasRequiredColumns = requiredColumns.every((column) =>
      engineRegistry.includes(`| ${column} `),
    );
  }

  addValidationCheck(
    checks,
    "Engine registry record total",
    engineRegistryExists &&
      engineRegistrySummaryCount !== null &&
      engineRegistryRows === engineRegistrySummaryCount,
    engineRegistrySummaryCount ?? "Summary count unavailable",
    engineRegistryRows,
    "The engine-record table must match its architecture-system summary count.",
  );
  addValidationCheck(
    checks,
    "Engine registry required fields",
    engineRegistryHasRequiredColumns,
    "All required architecture fields",
    engineRegistryHasRequiredColumns ? "All present" : "One or more missing",
    "Purpose, inputs, outputs, dependencies, consumers, workflow/AI positions, risk, duplicate detection, and integration points are required.",
  );

  return {
    Checks: checks,
    Failures: checks.filter((check) => check.Status === "Failed"),
    MissingSourceFiles: missingSourceFiles.map((node) => node.File),
    InvalidInternalEdges: invalidInternalEdges,
    UnknownWorkflowFiles: unknownWorkflowFiles,
    UnknownTraceFiles: unknownTraceFiles,
    UnresolvedRuntimeCalls: unresolvedRuntimeCalls,
    InvalidRuntimeTargets: invalidRuntimeTargets,
  };
}

function writeCircularDependencyReport(outputPath, generatedAt, groups) {
  const lines = [
    "# CourtSimplified Circular Dependency Report",
    "",
    `**Generated:** ${generatedAt}`,
    "",
    "> Circular groups are strongly connected components in the combined internal-import and resolved runtime-API graph. Findings require review; this report never authorizes automatic removal or rewrites.",
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "|---|---:|",
    `| Circular dependency groups | ${groups.length} |`,
    `| Files participating in cycles | ${new Set(groups.flatMap((group) => group.Files)).size} |`,
    `| High-risk groups | ${groups.filter((group) => group.RiskLevel === "High").length} |`,
    "",
    "## Circular Groups",
    "",
    "| Group | Risk | Files | Roles | Layers | Cycle Edges |",
    "|---:|---|---|---|---|---|",
  ];

  if (groups.length === 0) {
    lines.push("| - | - | None detected | - | - | - |");
  } else {
    for (const group of groups) {
      const edgeText = group.Edges.map(
        (edge) => `${edge.Source} → ${edge.Target} (${edge.Kind})`,
      );
      lines.push(
        `| ${group.Group} | ${markdownCell(group.RiskLevel)} | ${markdownCell(group.Files)} | ${markdownCell(group.Roles)} | ${markdownCell(group.Layers)} | ${markdownCell(edgeText)} |`,
      );
    }
  }

  lines.push("");
  fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
}

function writeDeadCodeReport(outputPath, generatedAt, deadCode) {
  const candidates = deadCode.Candidates;
  const lines = [
    "# CourtSimplified Dead-Code Candidate Report",
    "",
    `**Generated:** ${generatedAt}`,
    "",
    "> These are static-analysis candidates, not deletion instructions. Dynamic imports, framework conventions, registries, future integrations, and intentionally staged subsystems must be checked before any file is changed.",
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "|---|---:|",
    `| Reachable architecture nodes | ${deadCode.ReachableNodeCount} |`,
    `| Dead-code candidates | ${candidates.length} |`,
    `| High-confidence candidates | ${candidates.filter((item) => item.Confidence === "High").length} |`,
    `| Medium-confidence candidates | ${candidates.filter((item) => item.Confidence === "Medium").length} |`,
    `| Disconnected-subsystem review candidates | ${candidates.filter((item) => item.Confidence === "Review").length} |`,
    `| Exempted declarations/configuration | ${deadCode.Exemptions.length} |`,
    "",
    "## Candidates",
    "",
    "| Confidence | Role | Layer | Consumers | Lines | Reason | File |",
    "|---|---|---|---:|---:|---|---|",
  ];

  if (candidates.length === 0) {
    lines.push("| - | - | - | 0 | 0 | None detected | - |");
  } else {
    for (const candidate of candidates) {
      lines.push(
        `| ${markdownCell(candidate.Confidence)} | ${markdownCell(candidate.Role)} | ${markdownCell(candidate.Layer)} | ${candidate.ConsumerCount} | ${candidate.Lines} | ${markdownCell(candidate.Reason)} | ${markdownCell(candidate.File)} |`,
      );
    }
  }

  lines.push("");
  fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
}

function writeRegistryValidationReport(outputPath, generatedAt, validation) {
  const checks = validation.Checks;
  const passed = checks.filter((check) => check.Status === "Passed").length;
  const failed = validation.Failures.length;
  const lines = [
    "# CourtSimplified Registry Validation Report",
    "",
    `**Generated:** ${generatedAt}`,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "|---|---:|",
    `| Validation checks | ${checks.length} |`,
    `| Passed | ${passed} |`,
    `| Failed | ${failed} |`,
    "",
    "## Validation Checks",
    "",
    "| Check | Status | Expected | Actual | Details |",
    "|---|---|---|---|---|",
  ];

  for (const check of checks) {
    lines.push(
      `| ${markdownCell(check.Name)} | ${markdownCell(check.Status)} | ${markdownCell(check.Expected)} | ${markdownCell(check.Actual)} | ${markdownCell(check.Details)} |`,
    );
  }

  lines.push("");
  fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
}

export function analyzeSnapshotArchitecture(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const architectureModel = readJsonFile(
    options.architectureModelPath,
    "Architecture model",
  );
  const workflowModel = readJsonFile(
    options.workflowModelPath,
    "Workflow integration model",
  );

  if (!Array.isArray(architectureModel.Nodes) || architectureModel.Nodes.length === 0) {
    throw new Error("Architecture model contains zero nodes.");
  }

  const graph = buildSnapshotGraph(architectureModel, workflowModel);
  const circularDependencies = detectCircularDependencyGroups(graph);
  const deadCode = detectDeadCodeCandidates(graph);
  const registryValidation = validateSnapshotRegistries({
    root,
    architectureModel,
    workflowModel,
    engineRegistryPath: options.engineRegistryPath,
    graph,
  });
  const cycleFiles = new Set(
    circularDependencies.flatMap((group) => group.Files),
  );
  const statistics = {
    ArchitectureNodes: graph.nodes.length,
    CombinedGraphEdges: graph.edges.length,
    CircularDependencyGroups: circularDependencies.length,
    CircularDependencyFiles: cycleFiles.size,
    HighRiskCircularDependencyGroups: circularDependencies.filter(
      (group) => group.RiskLevel === "High",
    ).length,
    ReachableArchitectureNodes: deadCode.ReachableNodeCount,
    DeadCodeCandidates: deadCode.Candidates.length,
    HighConfidenceDeadCodeCandidates: deadCode.Candidates.filter(
      (candidate) => candidate.Confidence === "High",
    ).length,
    RegistryValidationChecks: registryValidation.Checks.length,
    RegistryValidationFailures: registryValidation.Failures.length,
    MissingSourceFiles: registryValidation.MissingSourceFiles.length,
  };

  return {
    ModelVersion: SNAPSHOT_AUDIT_MODEL_VERSION,
    GeneratedAt: new Date().toISOString(),
    ProjectRoot: root,
    ArchitectureModelVersion: architectureModel.ModelVersion,
    WorkflowModelVersion: workflowModel.ModelVersion,
    Statistics: statistics,
    CircularDependencies: circularDependencies,
    DeadCodeCandidates: deadCode.Candidates,
    DeadCodeExemptions: deadCode.Exemptions,
    RegistryValidation: registryValidation,
  };
}

export function writeSnapshotArchitectureAudit(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const outputDir = path.resolve(
    options.outputDir || path.join(root, "_PROJECT_REGISTRY"),
  );

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const audit = analyzeSnapshotArchitecture({
    ...options,
    root,
  });

  writeJsonFile(
    path.join(outputDir, "ARCHITECTURE_AUDIT_MODEL.json"),
    audit,
  );
  writeCircularDependencyReport(
    path.join(outputDir, "CIRCULAR_DEPENDENCY_REPORT.md"),
    audit.GeneratedAt,
    audit.CircularDependencies,
  );
  writeDeadCodeReport(
    path.join(outputDir, "DEAD_CODE_REPORT.md"),
    audit.GeneratedAt,
    {
      ReachableNodeCount: audit.Statistics.ReachableArchitectureNodes,
      Candidates: audit.DeadCodeCandidates,
      Exemptions: audit.DeadCodeExemptions,
    },
  );
  writeRegistryValidationReport(
    path.join(outputDir, "REGISTRY_VALIDATION_REPORT.md"),
    audit.GeneratedAt,
    audit.RegistryValidation,
  );

  return audit;
}

function clampScore(value, maximum) {
  return Math.max(0, Math.min(maximum, Math.round(value)));
}

function buildHealthArea(name, maximumScore, score, evidence) {
  const finalScore = clampScore(score, maximumScore);
  let status = "Healthy";

  if (finalScore === 0) {
    status = "Critical";
  } else if (finalScore < maximumScore) {
    status = "Review";
  }

  return {
    Name: name,
    Status: status,
    Score: finalScore,
    MaximumScore: maximumScore,
    Evidence: evidence,
  };
}

function getHealthStatus(metrics) {
  if (metrics.BuildResult !== "Passed" || metrics.BuildExitCode !== 0) {
    return "Critical";
  }

  if (
    metrics.RegistryValidationFailures > 0 ||
    metrics.MissingSourceFiles > 0 ||
    metrics.UnresolvedInternalEdges > 0 ||
    metrics.UnresolvedRuntimeApiCalls > 0
  ) {
    return "Degraded";
  }

  if (
    metrics.HighRiskCircularDependencyGroups > 0 ||
    metrics.HighConfidenceDeadCodeCandidates > 0
  ) {
    return "Needs Review";
  }

  return "Healthy";
}

function buildBlockingIssues(metrics) {
  const issues = [];

  if (metrics.BuildResult !== "Passed" || metrics.BuildExitCode !== 0) {
    issues.push(
      `Production build is ${metrics.BuildResult} with exit code ${metrics.BuildExitCode}.`,
    );
  }

  if (metrics.RegistryValidationFailures > 0) {
    issues.push(
      `${metrics.RegistryValidationFailures} registry validation check(s) failed.`,
    );
  }

  if (metrics.MissingSourceFiles > 0) {
    issues.push(
      `${metrics.MissingSourceFiles} architecture source file(s) are missing.`,
    );
  }

  if (metrics.UnresolvedInternalEdges > 0) {
    issues.push(
      `${metrics.UnresolvedInternalEdges} internal import(s) are unresolved.`,
    );
  }

  if (metrics.UnresolvedRuntimeApiCalls > 0) {
    issues.push(
      `${metrics.UnresolvedRuntimeApiCalls} runtime API call(s) are unresolved.`,
    );
  }

  return issues;
}

function buildReviewFindings(metrics) {
  const findings = [];

  if (metrics.HighRiskCircularDependencyGroups > 0) {
    findings.push(
      `${metrics.HighRiskCircularDependencyGroups} high-risk circular dependency group(s) require architectural review.`,
    );
  }

  if (metrics.MediumRiskCircularDependencyGroups > 0) {
    findings.push(
      `${metrics.MediumRiskCircularDependencyGroups} medium-risk circular dependency group(s) require review.`,
    );
  }

  if (metrics.HighConfidenceDeadCodeCandidates > 0) {
    findings.push(
      `${metrics.HighConfidenceDeadCodeCandidates} high-confidence dead-code candidate(s) require manual confirmation.`,
    );
  }

  if (metrics.DeadCodeCandidates > metrics.HighConfidenceDeadCodeCandidates) {
    findings.push(
      `${metrics.DeadCodeCandidates - metrics.HighConfidenceDeadCodeCandidates} additional reachability candidate(s) require staged or dynamic-use review.`,
    );
  }

  return findings;
}

export function analyzeSystemHealth(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const architectureModel = readJsonFile(
    options.architectureModelPath,
    "Architecture model",
  );
  const workflowModel = readJsonFile(
    options.workflowModelPath,
    "Workflow integration model",
  );
  const auditModel = readJsonFile(
    options.auditModelPath,
    "Architecture audit model",
  );
  const projectStatistics = readJsonFile(
    options.projectStatisticsPath,
    "Project statistics",
  );
  const buildResult = String(options.buildResult || "Not completed");
  const parsedBuildExitCode = Number(options.buildExitCode);
  const buildExitCode = Number.isFinite(parsedBuildExitCode)
    ? parsedBuildExitCode
    : -1;
  const architectureStatistics = architectureModel.Statistics || {};
  const workflowStatistics = workflowModel.Statistics || {};
  const auditStatistics = auditModel.Statistics || {};
  const circularDependencies = asArray(auditModel.CircularDependencies);
  const mediumRiskCircularDependencyGroups = circularDependencies.filter(
    (group) => group.RiskLevel === "Medium",
  ).length;
  const metrics = {
    BuildResult: buildResult,
    BuildExitCode: buildExitCode,
    TotalFiles: Number(projectStatistics.totalFiles || 0),
    TypeScriptFiles: Number(projectStatistics.typeScriptFiles || 0),
    ArchitectureNodes: Number(architectureStatistics.TotalNodes || 0),
    ArchitectureEdges: Number(architectureStatistics.TotalEdges || 0),
    UnresolvedInternalEdges: Number(
      architectureStatistics.UnresolvedInternalEdges || 0,
    ),
    WorkflowRecords: Number(workflowStatistics.WorkflowRecords || 0),
    EntryTraces: Number(workflowStatistics.EntryTraces || 0),
    RuntimeApiCalls: Number(workflowStatistics.RuntimeApiCalls || 0),
    UnresolvedRuntimeApiCalls: Number(
      workflowStatistics.UnresolvedRuntimeApiCalls || 0,
    ),
    CircularDependencyGroups: Number(
      auditStatistics.CircularDependencyGroups || 0,
    ),
    HighRiskCircularDependencyGroups: Number(
      auditStatistics.HighRiskCircularDependencyGroups || 0,
    ),
    MediumRiskCircularDependencyGroups:
      mediumRiskCircularDependencyGroups,
    DeadCodeCandidates: Number(auditStatistics.DeadCodeCandidates || 0),
    HighConfidenceDeadCodeCandidates: Number(
      auditStatistics.HighConfidenceDeadCodeCandidates || 0,
    ),
    RegistryValidationChecks: Number(
      auditStatistics.RegistryValidationChecks || 0,
    ),
    RegistryValidationFailures: Number(
      auditStatistics.RegistryValidationFailures || 0,
    ),
    MissingSourceFiles: Number(auditStatistics.MissingSourceFiles || 0),
  };

  const healthAreas = [
    buildHealthArea(
      "Production Build",
      30,
      metrics.BuildResult === "Passed" && metrics.BuildExitCode === 0 ? 30 : 0,
      `${metrics.BuildResult}; exit code ${metrics.BuildExitCode}`,
    ),
    buildHealthArea(
      "Registry Integrity",
      25,
      25 -
        metrics.RegistryValidationFailures * 5 -
        metrics.MissingSourceFiles * 5,
      `${metrics.RegistryValidationChecks - metrics.RegistryValidationFailures}/${metrics.RegistryValidationChecks} checks passed; ${metrics.MissingSourceFiles} missing source files`,
    ),
    buildHealthArea(
      "Internal Import Resolution",
      15,
      15 - metrics.UnresolvedInternalEdges * 3,
      `${metrics.UnresolvedInternalEdges} unresolved internal imports`,
    ),
    buildHealthArea(
      "Runtime API Resolution",
      10,
      10 - metrics.UnresolvedRuntimeApiCalls * 2,
      `${metrics.RuntimeApiCalls - metrics.UnresolvedRuntimeApiCalls}/${metrics.RuntimeApiCalls} runtime API calls resolved`,
    ),
    buildHealthArea(
      "Circular Dependency Safety",
      10,
      10 -
        metrics.HighRiskCircularDependencyGroups * 4 -
        metrics.MediumRiskCircularDependencyGroups,
      `${metrics.HighRiskCircularDependencyGroups} high-risk and ${metrics.MediumRiskCircularDependencyGroups} medium-risk circular groups`,
    ),
    buildHealthArea(
      "Entry-Point Reachability",
      10,
      10 - Math.ceil(metrics.HighConfidenceDeadCodeCandidates / 3),
      `${metrics.HighConfidenceDeadCodeCandidates} high-confidence candidates; ${metrics.DeadCodeCandidates} total review candidates`,
    ),
  ];
  const maximumScore = healthAreas.reduce(
    (total, area) => total + area.MaximumScore,
    0,
  );
  const overallScore = healthAreas.reduce(
    (total, area) => total + area.Score,
    0,
  );
  const blockingIssues = buildBlockingIssues(metrics);
  const reviewFindings = buildReviewFindings(metrics);

  return {
    ModelVersion: SYSTEM_HEALTH_MODEL_VERSION,
    SnapshotVersion: String(options.snapshotVersion || "Unknown"),
    GeneratedAt: new Date().toISOString(),
    ProjectRoot: root,
    Status: getHealthStatus(metrics),
    OverallScore: overallScore,
    MaximumScore: maximumScore,
    Build: {
      Result: metrics.BuildResult,
      ExitCode: metrics.BuildExitCode,
    },
    ModelVersions: {
      Architecture: architectureModel.ModelVersion,
      Workflow: workflowModel.ModelVersion,
      ArchitectureAudit: auditModel.ModelVersion,
    },
    HealthAreas: healthAreas,
    Metrics: metrics,
    BlockingIssues: blockingIssues,
    ReviewFindings: reviewFindings,
    Interpretation: {
      Scope:
        "Static architecture, registry, dependency, integration, reachability, and production-build health.",
      Limitation:
        "This health model does not prove runtime branch coverage, legal accuracy, security, privacy compliance, or that a dead-code candidate is safe to remove.",
      RemovalDoctrine:
        "No candidate may be deleted without source inspection, dependency confirmation, and deliberate approval.",
    },
  };
}

function writeSystemHealthReport(outputPath, health) {
  const lines = [
    "# CourtSimplified System Health Report",
    "",
    `**Generated:** ${health.GeneratedAt}`,
    "",
    `**Snapshot Version:** ${health.SnapshotVersion}`,
    "",
    `**Overall Status:** ${health.Status}`,
    "",
    `**Health Score:** ${health.OverallScore}/${health.MaximumScore}`,
    "",
    "> This report consolidates static architecture, registry, dependency, integration, reachability, and production-build health. It does not prove legal accuracy, security, privacy compliance, or complete runtime branch coverage.",
    "",
    "## Health Areas",
    "",
    "| Area | Status | Score | Evidence |",
    "|---|---|---:|---|",
  ];

  for (const area of health.HealthAreas) {
    lines.push(
      `| ${markdownCell(area.Name)} | ${markdownCell(area.Status)} | ${area.Score}/${area.MaximumScore} | ${markdownCell(area.Evidence)} |`,
    );
  }

  lines.push(
    "",
    "## Blocking Issues",
    "",
    ...(health.BlockingIssues.length > 0
      ? health.BlockingIssues.map((issue) => `- ${issue}`)
      : ["- None detected."]),
    "",
    "## Review Findings",
    "",
    ...(health.ReviewFindings.length > 0
      ? health.ReviewFindings.map((finding) => `- ${finding}`)
      : ["- None detected."]),
    "",
    "## Consolidated Metrics",
    "",
    "| Metric | Value |",
    "|---|---:|",
    `| Total files | ${health.Metrics.TotalFiles} |`,
    `| TypeScript files | ${health.Metrics.TypeScriptFiles} |`,
    `| Architecture nodes | ${health.Metrics.ArchitectureNodes} |`,
    `| Architecture edges | ${health.Metrics.ArchitectureEdges} |`,
    `| Workflow records | ${health.Metrics.WorkflowRecords} |`,
    `| Entry traces | ${health.Metrics.EntryTraces} |`,
    `| Runtime API calls | ${health.Metrics.RuntimeApiCalls} |`,
    `| Circular dependency groups | ${health.Metrics.CircularDependencyGroups} |`,
    `| Dead-code review candidates | ${health.Metrics.DeadCodeCandidates} |`,
    `| Registry validation failures | ${health.Metrics.RegistryValidationFailures} |`,
    "",
    "## Control Doctrine",
    "",
    `- ${health.Interpretation.RemovalDoctrine}`,
    `- ${health.Interpretation.Limitation}`,
    "",
  );

  fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
}

export function writeSystemHealth(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const outputDir = path.resolve(
    options.outputDir || path.join(root, "_PROJECT_REGISTRY"),
  );

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const health = analyzeSystemHealth({
    ...options,
    root,
  });

  writeJsonFile(path.join(outputDir, "SYSTEM_HEALTH_MODEL.json"), health);
  writeSystemHealthReport(
    path.join(outputDir, "SYSTEM_HEALTH_REPORT.md"),
    health,
  );

  return health;
}

function parseCommandLineArguments(argumentsList) {
  const parsed = {
    snapshotAudit: false,
    systemHealth: false,
  };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    if (argument === "--snapshot-audit") {
      parsed.snapshotAudit = true;
      continue;
    }

    if (argument === "--system-health") {
      parsed.systemHealth = true;
      continue;
    }

    const valueArguments = {
      "--root": "root",
      "--output-dir": "outputDir",
      "--architecture-model": "architectureModelPath",
      "--workflow-model": "workflowModelPath",
      "--engine-registry": "engineRegistryPath",
      "--audit-model": "auditModelPath",
      "--project-statistics": "projectStatisticsPath",
      "--snapshot-version": "snapshotVersion",
      "--build-result": "buildResult",
      "--build-exit-code": "buildExitCode",
    };
    const property = valueArguments[argument];

    if (!property) {
      throw new Error(`Unknown architecture analyzer argument: ${argument}`);
    }

    const value = argumentsList[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for architecture analyzer argument: ${argument}`);
    }

    parsed[property] = value;
    index += 1;
  }

  return parsed;
}

const isDirectRun =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  try {
    const commandLine = parseCommandLineArguments(process.argv.slice(2));

    if (commandLine.systemHealth) {
      const health = writeSystemHealth(commandLine);
      console.log("System health model and report created.");
      console.log(`System health status: ${health.Status}`);
      console.log(
        `System health score: ${health.OverallScore}/${health.MaximumScore}`,
      );
    } else if (commandLine.snapshotAudit) {
      const audit = writeSnapshotArchitectureAudit(commandLine);
      console.log("Snapshot architecture audit created.");
      console.log(
        `Circular dependency groups: ${audit.Statistics.CircularDependencyGroups}`,
      );
      console.log(
        `Dead-code candidates: ${audit.Statistics.DeadCodeCandidates}`,
      );
      console.log(
        `Registry validation failures: ${audit.Statistics.RegistryValidationFailures}`,
      );
    } else {
      const analysis = writeArchitectureAnalysis({
        root: commandLine.root,
        outputDir: commandLine.outputDir,
      });
      console.log("Architecture analysis created.");
      console.log(`Files analyzed: ${analysis.summary.totalFiles}`);
    }
  } catch (error) {
    console.error(`Architecture analysis failed: ${error.message}`);
    process.exitCode = 1;
  }
}
