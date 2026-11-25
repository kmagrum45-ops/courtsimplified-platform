/**
 * THE JOURNEY MATRIX'S REPORT (site owner, Round 6, PR 1): every journey's record (matrix-records/*.json, written by
 * ask-once-pages.spec.ts with MATRIX=1, from one folder or from every CI shard's) run through the eleven checks
 * (tests/browser/matrix/matrixChecks.ts), check 9 over each story's two journeys, into:
 *   <out>/table.md      one row per failure: journey / screen / file / fact / text / check, then the counts per check and
 *                       per file, the journeys that did not run (and why), and the names the site's own finder misses;
 *   <out>/counts.json   the same counts, and the per-file counter;
 * and compares the per-file counter with the committed one (tests/browser/matrix/matrixCounters.json): a file whose
 * count went up is listed. It never fails a run (report only, Round 6: main must not turn red) unless MATRIX_GATE=1,
 * which the last step of Round 6 turns on.
 *
 * Usage: node --import tsx scripts/browser/matrixReport.ts <records folder> [<records folder> ...] --out <folder> [--write-counters]
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { Asked } from "../../tests/browser/harness/askOnce";
import { check9Same, counts, journeyFailures, table, type Failure, type JourneyRecord } from "../../tests/browser/matrix/matrixChecks";
import { bodyNameLabels } from "../../src/lib/security/requestNames";
import { MATRIX_STORIES } from "../../tests/browser/matrix/matrixStories";

const COUNTERS = "tests/browser/matrix/matrixCounters.json";

export type RecordFile = JourneyRecord & { notRun?: string; notes?: string[]; replayMisses?: string[]; drift?: string[]; reading?: string | null };
type EventWithFacts = Asked & { facts?: string[] };
const factsOfEvent = (event: Asked) => (event as EventWithFacts).facts ?? (event.id ? [event.id] : []);

export function readRecords(folders: readonly string[]): RecordFile[] {
  const out: RecordFile[] = [];
  for (const folder of folders) {
    if (!fs.existsSync(folder)) continue;
    for (const file of fs.readdirSync(folder, { recursive: true }) as string[]) {
      if (!file.endsWith(".json")) continue;
      try { out.push(JSON.parse(fs.readFileSync(path.join(folder, file), "utf8")) as RecordFile); } catch { /* not a record */ }
    }
  }
  return out;
}

export function report(records: readonly RecordFile[]) {
  const ran = records.filter((r) => !r.notRun);
  const failures: Failure[] = ran.flatMap((r) => journeyFailures(r, factsOfEvent));
  for (const story of new Set(ran.map((r) => r.story.id))) {
    const pair = ran.filter((r) => r.story.id === story);
    const signedIn = pair.find((r) => r.mode === "signed-in");
    const guest = pair.find((r) => r.mode === "guest-then-signup");
    if (signedIn && guest && signedIn.ended && guest.ended) failures.push(...check9Same(signedIn, guest, factsOfEvent));
  }
  const c = counts(failures);
  return { failures, ...c, notRun: records.filter((r) => r.notRun).map((r) => `${r.journey}: ${r.notRun}`), stopped: ran.filter((r) => r.notes?.some((n) => /stopped/.test(n))).map((r) => `${r.journey}: ${r.notes!.find((n) => /stopped/.test(n))}`) };
}

function main() {
  const args = process.argv.slice(2);
  const outAt = args.indexOf("--out");
  const out = outAt >= 0 ? args[outAt + 1] : "matrix-report";
  const writeCounters = args.includes("--write-counters");
  const folders = args.filter((arg, index) => arg !== "--out" && arg !== "--write-counters" && index !== outAt + 1);
  const records = readRecords(folders.length ? folders : ["matrix-records"]);
  const result = report(records);
  const committed: Record<string, number> = fs.existsSync(COUNTERS) ? (JSON.parse(fs.readFileSync(COUNTERS, "utf8")) as { perFile: Record<string, number> }).perFile : {};
  const rose = Object.entries(result.perFile).filter(([file, n]) => n > (committed[file] ?? 0)).map(([file, n]) => `${file}: ${committed[file] ?? 0} -> ${n}`);
  const missed = MATRIX_STORIES.flatMap((story) => story.names.filter((name) => !JSON.stringify(bodyNameLabels({ story: story.text })).includes(name)).map((name) => `${story.id}: "${name}"`));
  const drift = records.flatMap((r) => r.drift ?? []);
  const lines = [
    `# Journey matrix: ${records.length} journeys, ${records.length - result.notRun.length} run, ${result.failures.length} failures`,
    "",
    "## Counts per check", "", "| Check | Failures |", "|---|---|", ...Object.entries(result.perCheck).sort().map(([k, v]) => `| ${k} | ${v} |`),
    "", "## Counts per file", "", "| File | Failures |", "|---|---|", ...Object.entries(result.perFile).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`),
    "", "## Every failure", "", table(result.failures),
    "", "## Journeys that did not run", "", ...(result.notRun.length ? result.notRun.map((x) => `- ${x}`) : ["- none"]),
    "", "## Journeys that stopped before their end", "", ...(result.stopped.length ? result.stopped.map((x) => `- ${x}`) : ["- none"]),
    "", "## Counter: files whose count went up against the committed counter", "", ...(rose.length ? rose.map((x) => `- ${x}`) : ["- none"]),
    "", "## Names the site's name labels do not hide (the live site sends them to the AI as typed; the recorder refuses them, so these journeys cannot be recorded)", "", ...(missed.length ? missed.map((x) => `- ${x}`) : ["- none"]),
    ...(drift.length ? ["", "## Live AI no longer matching its recording (nightly check)", "", ...drift.map((x) => `- ${x}`)] : []),
  ];
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "table.md"), `${lines.join("\n")}\n`);
  fs.writeFileSync(path.join(out, "counts.json"), `${JSON.stringify({ perCheck: result.perCheck, perFile: result.perFile, notRun: result.notRun, stopped: result.stopped, rose }, null, 1)}\n`);
  console.log(lines.slice(0, 2 + 4 + Object.keys(result.perCheck).length).join("\n"));
  console.log(`\nReport: ${path.join(out, "table.md")}`);
  if (writeCounters) {
    // The measured counter (npm run matrix:counters): per file, from this run; test:matrix-counters then lets it only go down.
    const measuredOn = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
    fs.writeFileSync(COUNTERS, `${JSON.stringify({ measuredOn, note: "Matrix failures per file, measured by a full run (scripts/browser/matrixReport.ts --write-counters). May only go down (test:matrix-counters).", perFile: Object.fromEntries(Object.entries(result.perFile).sort()) }, null, 1)}
`);
    console.log(`Counter written: ${COUNTERS} (measured on ${measuredOn})`);
  }
  if (process.env.MATRIX_GATE === "1" && (result.failures.length || rose.length)) process.exit(1);
}

if (process.argv[1] && /matrixReport\.ts$/.test(process.argv[1])) main();
