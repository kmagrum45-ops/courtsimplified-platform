/**
 * test:matrix-counters -- the journey matrix's per-file counter may only go down (site owner, Round 6: "a counter file
 * recording failures per screen that later PRs may only lower").
 *
 * WHAT IT CHECKS. tests/browser/matrix/matrixCounters.json holds, per file, how many matrix failures the last measured
 * run found there (matrixReport.ts counts.json `perFile`, written by `npm run matrix:counters` from a full run). Against
 * the same file on origin/main:
 *   1. no file's count is higher;
 *   2. no file appears that main did not have (with a count above zero);
 *   3. the file says which commit it was measured on, and every count is a whole number of zero or more.
 * Self-tests: a raised count and a new file each fail; a lowered count passes.
 *
 * WHAT FAILURE IT EXISTS TO CATCH. A PR that makes a screen worse, or a counter quietly raised to make room for a new
 * failure. Lowering a count is the work Round 6 wants and always passes. Pure: git and the file only, no browser.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const FILE = "tests/browser/matrix/matrixCounters.json";
type Counters = { measuredOn: string; note?: string; perFile: Record<string, number> };

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${!ok && detail ? `\n      ${detail}` : ""}`);
  if (!ok) failures++;
}

/** The counts that rose against the base, and the files that are new with a count above zero. */
export function growth(base: Counters["perFile"] | null, now: Counters["perFile"]): string[] {
  if (!base) return [];
  return Object.entries(now).flatMap(([file, n]) => (n > (base[file] ?? 0) ? [`${file}: ${base[file] ?? "(new)"} -> ${n}`] : []));
}

const now: Counters | null = existsSync(FILE) ? (JSON.parse(readFileSync(FILE, "utf8")) as Counters) : null;
let base: Counters | null = null;
try { base = JSON.parse(execFileSync("git", ["show", `origin/main:${FILE}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })) as Counters; } catch { base = null; }

console.log(`\nThe counter${base ? " against origin/main" : " (origin/main has none yet: this is its first measurement)"}`);
check("the counter file exists", Boolean(now));
if (now) {
  check("it says which commit it was measured on", /^[0-9a-f]{7,40}$/.test(now.measuredOn ?? ""), now.measuredOn);
  check("every count is a whole number of zero or more", Object.values(now.perFile).every((n) => Number.isInteger(n) && n >= 0));
  const rose = growth(base?.perFile ?? null, now.perFile);
  check("no file's count went up, and no new file has a count", rose.length === 0, rose.join("; "));
}

console.log("\nSelf-tests");
check("a raised count fails", growth({ "a.tsx": 2 }, { "a.tsx": 3 }).length === 1);
check("a new file with a count fails", growth({ "a.tsx": 2 }, { "a.tsx": 2, "b.tsx": 1 }).length === 1);
check("a lowered count passes", growth({ "a.tsx": 2 }, { "a.tsx": 1 }).length === 0);
check("a file gone to zero passes", growth({ "a.tsx": 2 }, { "a.tsx": 0 }).length === 0);

console.log(failures ? `\n${failures} check(s) failed` : "\nThe matrix counter only went down");
process.exit(failures ? 1 : 0);
