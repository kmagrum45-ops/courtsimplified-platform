import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const root = process.cwd();
const registryDir = path.join(root, "_PROJECT_REGISTRY");
const zipName = "COURTSIMPLIFIED_DEVELOPER_SNAPSHOT.zip";

const ignored = [
  "node_modules",
  ".next",
  ".git",
  "_PROJECT_REGISTRY",
];

function shouldIgnore(filePath) {
  return ignored.some((part) => filePath.includes(`${path.sep}${part}${path.sep}`));
}

function ensureCleanDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function walk(dir, files = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, item.name);
    if (shouldIgnore(fullPath)) continue;

    if (item.isDirectory()) walk(fullPath, files);
    else files.push(fullPath);
  }
  return files;
}

function relative(filePath) {
  return path.relative(root, filePath).replaceAll("\\", "/");
}

function readSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function writeJson(name, data) {
  fs.writeFileSync(
    path.join(registryDir, name),
    JSON.stringify(data, null, 2),
    "utf8",
  );
}

function writeText(name, data) {
  fs.writeFileSync(path.join(registryDir, name), data, "utf8");
}

function run(command) {
  try {
    return execSync(command, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    return `${error.stdout || ""}\n${error.stderr || ""}`;
  }
}

function getTree() {
  return run("tree /F /A");
}

function getImports(content) {
  const matches = [...content.matchAll(/from\s+["']([^"']+)["']/g)];
  return matches.map((match) => match[1]);
}

function getExports(content) {
  const matches = [
    ...content.matchAll(
      /export\s+(type|interface|function|const|class)\s+([A-Za-z0-9_]+)/g,
    ),
  ];

  return matches.map((match) => ({
    kind: match[1],
    name: match[2],
  }));
}

function classifyOwner(file) {
  if (file.startsWith("src/lib/case-system/litigation-intelligence")) {
    return "Litigation Intelligence";
  }

  if (file.startsWith("src/lib/case-system/intelligence")) {
    return "CourtSimplified Brain";
  }

  if (file.startsWith("src/lib/case-system/orchestration")) {
    return "Orchestration";
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

function detectLargeFiles(records) {
  return records
    .filter((record) => record.lines >= 800)
    .sort((a, b) => b.lines - a.lines);
}

function detectEmptyTypeScriptFiles(records) {
  return records.filter(
    (record) =>
      (record.file.endsWith(".ts") || record.file.endsWith(".tsx")) &&
      record.lines <= 5,
  );
}

function detectDuplicateNames(records) {
  const groups = new Map();

  for (const record of records) {
    const base = path.basename(record.file).toLowerCase();
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(record.file);
  }

  return [...groups.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([name, files]) => ({ name, files }));
}

function main() {
  ensureCleanDir(registryDir);

  const allFiles = walk(root);
  const records = allFiles.map((filePath) => {
    const content = readSafe(filePath);
    const file = relative(filePath);

    return {
      file,
      owner: classifyOwner(file),
      extension: path.extname(file),
      sizeBytes: fs.statSync(filePath).size,
      lines: content ? content.split(/\r?\n/).length : 0,
      lastModified: fs.statSync(filePath).mtime.toISOString(),
    };
  });

  const tsRecords = records.filter(
    (record) => record.file.endsWith(".ts") || record.file.endsWith(".tsx"),
  );

  const importExportRegistry = tsRecords.map((record) => {
    const content = readSafe(path.join(root, record.file));

    return {
      file: record.file,
      owner: record.owner,
      lines: record.lines,
      imports: getImports(content),
      exports: getExports(content),
    };
  });

  const projectStatistics = {
    generatedAt: new Date().toISOString(),
    root,
    totalFiles: records.length,
    typeScriptFiles: tsRecords.length,
    litigationIntelligenceModules: records.filter((record) =>
      record.file.startsWith(
        "src/lib/case-system/litigation-intelligence/modules/",
      ),
    ).length,
    largeFilesOver800Lines: detectLargeFiles(records),
    emptyTypeScriptFiles: detectEmptyTypeScriptFiles(records),
    duplicateFileNames: detectDuplicateNames(records),
  };

  const architectureHealth = {
    generatedAt: new Date().toISOString(),
    warnings: [
      ...detectLargeFiles(records).map(
        (file) => `Large file over 800 lines: ${file.file} (${file.lines} lines)`,
      ),
      ...detectEmptyTypeScriptFiles(records).map(
        (file) => `Possible empty TypeScript file: ${file.file}`,
      ),
      ...detectDuplicateNames(records).map(
        (item) => `Duplicate filename: ${item.name}`,
      ),
    ],
    doctrine: [
      "CourtSimplified is a Litigation Operating System.",
      "Do not create duplicate engines.",
      "Do not create parallel workflows.",
      "Do not replace stable architecture without checking dependencies.",
      "Developer snapshots should be uploaded before major architecture work.",
    ],
  };

  writeText("ArchitectureRegistry.txt", getTree());
  writeText(
    "FileRegistry.txt",
    records
      .map(
        (record) =>
          `${record.file} | ${record.owner} | ${record.lines} lines | ${record.sizeBytes} bytes`,
      )
      .join("\n"),
  );
  writeJson("FileRegistry.json", records);
  writeJson("ImportExportRegistry.json", importExportRegistry);
  writeJson("ProjectStatistics.json", projectStatistics);
  writeJson("ArchitectureHealth.json", architectureHealth);

  writeText(
    "ControlState.txt",
    [
      "COURTSIMPLIFIED DEVELOPER SNAPSHOT",
      "",
      `GeneratedAt: ${new Date().toISOString()}`,
      `Root: ${root}`,
      "",
      "Purpose:",
      "This snapshot records the current project file tree, file registry, import/export structure, project statistics, and architecture health.",
      "",
      "Use:",
      "Upload this ZIP at the start or end of development sessions so CourtSimplified can be reviewed without guessing or repeating full audits.",
    ].join("\n"),
  );

  const buildStatus = run("npm run build");
  writeText("BuildStatus.txt", buildStatus);

  const zipPath = path.join(root, zipName);
  if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });

  run(`powershell Compress-Archive -Path _PROJECT_REGISTRY -DestinationPath ${zipName} -Force`);

  console.log("");
  console.log("Developer snapshot created:");
  console.log(zipPath);
}

main();