/**
 * Self-test for the static arm of journeyInvariants.ts.
 *
 * WHY THIS EXISTS. The first version of the static arm scored ZERO
 * violations against the known-defective historical code -- readinessTone(),
 * the highRiskPenalty subtraction, and the "Document readiness impact"
 * ordinal union. All three had been fixed in the live tree, so the arm
 * reported clean and looked correct. It was not correct; it detected
 * nothing, and only a deliberate replay against pre-fix code exposed that.
 *
 * That is the exact failure docs/TEST_BATTERY_DESIGN.md §3 warns about: a
 * suite that reports clean because its checks are shallow is worse than no
 * suite, because it licenses confidence.
 *
 * So the detectors are pinned against real historical defects, replayed
 * from git. If someone weakens a pattern, this fails. It makes no network
 * calls and costs nothing.
 *
 * Pinned commits (the fix commit; the defect is at <commit>~1):
 *   dc3934c  removed readinessTone() and the risk penalties
 *   c5fce59  removed the credibility grading strings
 */

import assert from "node:assert";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { checkI1Static } from "./journeyInvariants";

const REPO_ROOT = path.resolve(__dirname, "..", "..");

type Fixture = { commit: string; repoPath: string; label: string };

const FIXTURES: Fixture[] = [
  { commit: "dc3934c~1", repoPath: "app/dashboard/cases/[id]/page.tsx", label: "readinessTone() colour ramp" },
  { commit: "dc3934c~1", repoPath: "src/lib/case-system/dashboardEngine.ts", label: "highRiskPenalty subtraction" },
  { commit: "dc3934c~1", repoPath: "src/lib/case-system/dashboard/dashboardAdapter.ts", label: "proceduralPenalty subtraction" },
  { commit: "dc3934c~1", repoPath: "src/lib/case-system/intelligence/courtSimplifiedBrain.ts", label: "calculateReadiness risk subtractions" },
  { commit: "c5fce59~1", repoPath: "src/lib/case-system/architecture/masterCaseSchema.ts", label: "documentReadinessImpact ordinal union" },
];

function materialise(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "journey-selftest-"));
  for (const f of FIXTURES) {
    let content: string;
    try {
      content = execFileSync("git", ["show", `${f.commit}:${f.repoPath}`], { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    } catch {
      console.warn(`  SKIP ${f.label} — could not read ${f.commit}:${f.repoPath}`);
      continue;
    }
    const dest = path.join(dir, f.repoPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content, "utf8");
  }
  return dir;
}

function main() {
  console.log("Journey invariant self-test — replaying known defects from git\n");

  const dir = materialise();
  const violations = checkI1Static(dir);

  console.log(`Static arm found ${violations.length} violation(s) in pre-fix code:`);
  const byDetail = new Map<string, number>();
  for (const v of violations) {
    const key = `${v.sourceField} :: ${v.detail}`;
    byDetail.set(key, (byDetail.get(key) || 0) + 1);
  }
  for (const [key, count] of byDetail) console.log(`  ${count}x  ${key}`);

  // Each defect class must be detected. These assertions are the point of
  // the file: they pin the detectors to defects that really happened.
  const detail = violations.map((v) => v.detail).join(" | ");

  assert.ok(
    /colour ramp keyed to a numeric score|colour class rendered near a score/.test(detail),
    "REGRESSION: the static arm no longer detects a colour ramp keyed to a score (readinessTone class)",
  );
  assert.ok(
    /risk-weighted subtraction/.test(detail),
    "REGRESSION: the static arm no longer detects risk-weighted subtraction in a scoring expression",
  );
  assert.ok(
    /ordinal string-literal union/.test(detail),
    "REGRESSION: the static arm no longer detects ordinal string-literal union types",
  );

  // And it must be clean against the CURRENT tree — if this fails, either a
  // grading construct was reintroduced, or one genuinely exists and needs
  // triage. Reported, not asserted, so a real finding is visible rather
  // than crashing the self-test.
  const current = checkI1Static(REPO_ROOT);
  console.log(`\nCurrent tree: ${current.length} static violation(s)`);
  for (const v of current) console.log(`  [${v.sourceField}] ${v.detail}\n     ${v.offendingText.slice(0, 120)}`);

  fs.rmSync(dir, { recursive: true, force: true });
  console.log("\nSelf-test passed: all three historical defect classes are detected.");
}

// Entrypoint guard — runFullClaimTypeSurvey.ts lacked one and importing it
// silently re-ran 19 billed journeys. This script bills nothing, but the
// convention is uniform across the battery.
const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
