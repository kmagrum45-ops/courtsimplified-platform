/**
 * Scenario quality harness.
 *
 * Drives real intakes through the browser for scenarios taken from
 * scenarioRegistry.ts and reports what the completed overview actually renders,
 * judged against the checks in harness/qualityChecks.ts.
 *
 * Batch size comes from SCENARIO_BATCH (default 25) so the same harness scales
 * without edits. Results are written to scenario-quality-report.json next to a
 * printed summary.
 */

import { writeFileSync } from "node:fs";

import { test } from "@playwright/test";

import { runScenario, stubAuthenticatedCase, type CapturedOverview } from "./harness/intakeDriver";
import { evaluateCapture, type Finding } from "./harness/qualityChecks";
import { selectScenarios } from "./harness/scenarioSelection";

const BATCH = Number(process.env.SCENARIO_BATCH || 25);
const REPORT_PATH = process.env.SCENARIO_REPORT || "scenario-quality-report.json";

type Row = {
  scenarioId: string;
  courtPath: string;
  stage: string;
  stageSubstitutedFrom: string | null;
  reachedOverview: boolean;
  durationMs: number;
  findings: Finding[];
  confirmNextQuestion: string;
  authorityPanelRendered: boolean;
};

test("scenario quality sweep", async ({ page }) => {
  const selected = selectScenarios(BATCH);
  test.setTimeout(120_000 * Math.max(1, selected.length));

  await stubAuthenticatedCase(page);

  const rows: Row[] = [];
  const captures: CapturedOverview[] = [];

  for (const entry of selected) {
    const startedAt = Date.now();
    const capture = await runScenario(page, entry);
    const findings = evaluateCapture(entry, capture);
    captures.push(capture);
    rows.push({
      scenarioId: capture.scenarioId,
      courtPath: capture.courtPath,
      stage: capture.stage,
      stageSubstitutedFrom: capture.stageSubstitutedFrom,
      reachedOverview: capture.reachedOverview,
      durationMs: Date.now() - startedAt,
      findings,
      confirmNextQuestion: capture.confirmNextQuestion.replace(/\s+/g, " ").trim().slice(0, 200),
      authorityPanelRendered: capture.authorityPanelRendered,
    });
    const status = !capture.reachedOverview ? "ERROR" : findings.length === 0 ? "CLEAN" : `${findings.length} finding(s)`;
    console.log(`[${rows.length}/${selected.length}] ${capture.scenarioId} (${capture.courtPath}/${capture.stage}) -> ${status}`);
  }

  writeFileSync(REPORT_PATH, JSON.stringify({ batch: BATCH, rows, captures }, null, 2));

  const clean = rows.filter((row) => row.reachedOverview && row.findings.length === 0);
  const withFindings = rows.filter((row) => row.reachedOverview && row.findings.length > 0);
  const errored = rows.filter((row) => !row.reachedOverview);

  const byFamily = new Map<string, number>();
  const byCheck = new Map<string, number>();
  for (const row of rows) {
    for (const finding of row.findings) {
      byFamily.set(finding.family, (byFamily.get(finding.family) || 0) + 1);
      byCheck.set(finding.check, (byCheck.get(finding.check) || 0) + 1);
    }
  }

  const totalMs = rows.reduce((sum, row) => sum + row.durationMs, 0);
  console.log("\n================ SCENARIO QUALITY REPORT ================");
  console.log(`scenarios=${rows.length}  clean=${clean.length}  withFindings=${withFindings.length}  errored=${errored.length}`);
  console.log(`total=${Math.round(totalMs / 1000)}s  mean=${Math.round(totalMs / Math.max(1, rows.length) / 100) / 10}s per scenario`);

  console.log("\n--- findings by check ---");
  for (const [check, count] of [...byCheck].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(3)}  ${check}`);
  }

  console.log("\n--- findings by bug family ---");
  for (const [family, count] of [...byFamily].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(3)}  ${family}`);
  }

  console.log("\n--- per scenario ---");
  for (const row of rows) {
    const flag = !row.reachedOverview ? "ERROR" : row.findings.length === 0 ? "CLEAN" : "ISSUES";
    console.log(`\n[${flag}] ${row.scenarioId}  ${row.courtPath}/${row.stage}${row.stageSubstitutedFrom ? ` (registry stage "${row.stageSubstitutedFrom}" not selectable)` : ""}  ${Math.round(row.durationMs / 100) / 10}s`);
    if (row.reachedOverview) console.log(`        next question: ${row.confirmNextQuestion || "(none)"}`);
    for (const finding of row.findings) {
      console.log(`        - [${finding.severity}] ${finding.check}: ${finding.detail}`);
      console.log(`          family: ${finding.family}`);
    }
  }
  console.log(`\nreport written to ${REPORT_PATH}`);
  console.log("=========================================================");
});
