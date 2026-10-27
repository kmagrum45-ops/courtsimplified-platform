/**
 * WHERE A STORY-PACK RUN KEEPS ITS RECORDS: ONE FOLDER PER RUN (site owner, 2026-10-27).
 *
 * The ask-once records, the claim-kind table and the findings were appended to fixed files under
 * test-results/, and a later run of a single test (or Playwright clearing test-results/) replaced a
 * whole run's records: the final count of repeats from a full local run was lost that way. Each run
 * now writes to story-pack-records/<run id>/ (outside test-results/, which Playwright empties
 * at the start of every run), where the run id is STORY_PACK_RUN_ID:
 * on GitHub the run and its attempt (the workflow uploads the folder as an artifact by that name);
 * locally a timestamp set once per Playwright invocation (playwright.config.ts), so every worker of
 * one run shares it and the next run gets its own folder.
 */
import fs from "node:fs";
import path from "node:path";

// Outside test-results/, which Playwright empties at the start of every run.
export const RECORDS_ROOT = "story-pack-records";

/** This run's folder, made on first use. */
export function runRecordsDir(): string {
  const id = (process.env.STORY_PACK_RUN_ID ?? "").replace(/[^\w.-]/g, "-") || "unnamed";
  const dir = path.join(RECORDS_ROOT, id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Appends one record (a JSON line) to this run's file of that name. */
export function appendRecord(file: "ask-once.jsonl" | "claim-kind.jsonl" | "findings.jsonl", record: unknown): void {
  fs.appendFileSync(path.join(runRecordsDir(), file), JSON.stringify(record) + "\n");
}
