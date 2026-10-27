/**
 * EACH STORY-PACK RUN KEEPS ITS OWN RECORDS (site owner, 2026-10-27).
 *
 * Checks, as properties:
 *   - two runs with different run ids write to different folders, and neither touches the other;
 *   - the folder is outside test-results/, which Playwright empties at the start of every run;
 *   - the story pack writes its ask-once, claim-kind and findings records only through that folder
 *     (no fixed file under test-results/);
 *   - every Playwright invocation gets a run id of its own (playwright.config.ts), and CI names it
 *     after the GitHub run and attempt and uploads the folder as an artifact by that name;
 *   - run in parts (instant and real speed, #488), each part uploads under a name of its own.
 *
 * Failure it exists to catch: a full local run's repeat records replaced by a re-run of four tests,
 * so the final count of repeats was lost (27 Oct).
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

async function main() {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "pack-records-"));
  const here = process.cwd();
  process.chdir(work);
  try {
    const { appendRecord, runRecordsDir, RECORDS_ROOT } = await import("../../tests/browser/harness/packRecords");
    process.env.STORY_PACK_RUN_ID = "run-a";
    appendRecord("ask-once.jsonl", { run: "a", repeats: [] });
    const a = runRecordsDir();
    process.env.STORY_PACK_RUN_ID = "run-b";
    appendRecord("ask-once.jsonl", { run: "b", repeats: [] });
    const b = runRecordsDir();
    check("two runs write to two folders", a !== b && fs.existsSync(path.join(a, "ask-once.jsonl")) && fs.existsSync(path.join(b, "ask-once.jsonl")));
    check("a later run leaves the earlier run's records as they were", fs.readFileSync(path.join(a, "ask-once.jsonl"), "utf8").trim() === JSON.stringify({ run: "a", repeats: [] }));
    check("the records are outside test-results/", !RECORDS_ROOT.split(/[\\/]/).includes("test-results"), RECORDS_ROOT);
  } finally {
    process.chdir(here);
    fs.rmSync(work, { recursive: true, force: true });
  }

  const spec = read("tests/browser/story-pack.spec.ts");
  check("the story pack writes records only through its run's folder", !/appendFileSync\(\s*["'`]test-results\//.test(spec) && /appendRecord\("ask-once\.jsonl"/.test(spec) && /appendRecord\("claim-kind\.jsonl"/.test(spec) && /appendRecord\("findings\.jsonl"/.test(spec));
  check("every Playwright invocation names its run", /process\.env\.STORY_PACK_RUN_ID \|\|=/.test(read("playwright.config.ts")));
  const workflow = read(".github/workflows/courtsimplified-story-pack.yml");
  check("CI names the run after the GitHub run and attempt", /STORY_PACK_RUN_ID: \$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/.test(workflow));
  check("and keeps the folder as an artifact by that name", /name: story-pack-records-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/.test(workflow) && /story-pack-records\/\*\*/.test(workflow));
  // Run in parts (a matrix): each part's artifact needs a name of its own, or the second upload of the
  // same name fails and that part's records are lost.
  const artifactName = workflow.match(/name: (story-pack-records-[^\r\n]*)/)?.[1] ?? "";
  check("each part of a run keeps its records under its own name", !/\bmatrix:/.test(workflow) || /\$\{\{ matrix\.\w+ \}\}/.test(artifactName), artifactName);

  console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
  process.exitCode = failures ? 1 : 0;
}

void main();
