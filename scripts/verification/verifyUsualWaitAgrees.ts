/**
 * "THIS IS TAKING LONGER THAN USUAL" IS NEVER SAID BEFORE THE USUAL TIME THE SAME PAGE STATES (Chrome check of #547 at
 * 0e0f7e9, G4: the warning appeared at about 50 s while the line above said "This usually takes one to three minutes").
 *
 * What it checks:
 *   1. every "usually takes A to B minutes" the site says (app/, src/) is no longer than the warning's time;
 *   2. the warning's time (AnalysisProgress.tsx SLOW_AFTER_MS) is at least the end of that usual time;
 *   3. every file that says "taking longer than usual" takes its time from the one shared value (usualWait.ts).
 *
 * WHAT FAILURE THIS CATCHES: a page saying a wait is longer than usual while still inside the usual time it states.
 *
 * Run: npm run test:usual-wait-agrees
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const ROOT = join(__dirname, "..", "..");
const files = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) return [];
    return statSync(join(ROOT, path)).isDirectory() ? files(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
const sources = [...files("app"), ...files("src")].map((file) => ({ file: relative(ROOT, join(ROOT, file)).split("\\").join("/"), text: readFileSync(join(ROOT, file), "utf8") }));

const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10 };
const stated = sources.flatMap(({ file, text }) =>
  [...text.matchAll(/usually takes (\w+) to (\w+) minutes/gi)].map((match) => ({ file, minutes: WORDS[match[2].toLowerCase()] ?? Number(match[2]) })),
);
// The shared value's own words count too (usualWait.ts USUAL_WAIT_WORDS).
const longest = Math.max(...stated.map((entry) => entry.minutes)) * 60_000;

const progress = readFileSync(join(ROOT, "app/builder/_components/AnalysisProgress.tsx"), "utf8");
const shared = (() => {
  try { return readFileSync(join(ROOT, "app/_components/usualWait.ts"), "utf8"); } catch { return ""; }
})();
const sharedMs = /USUAL_WAIT_MAX_MS = (\d+) \* 60_000/.exec(shared);
const literal = /const SLOW_AFTER_MS = ([\d_]+);/.exec(progress);
const slowAfter = literal ? Number(literal[1].replace(/_/g, "")) : /const SLOW_AFTER_MS = USUAL_WAIT_MAX_MS;/.test(progress) && sharedMs ? Number(sharedMs[1]) * 60_000 : NaN;

check(`setup: the usual time is stated (${stated.length} places, up to ${longest / 60_000} minutes)`, stated.length > 0 && Number.isFinite(longest));
check(`1-2. "taking longer than usual" waits at least the usual time stated (${slowAfter / 1000} s >= ${longest / 1000} s)`, slowAfter >= longest, `warning at ${slowAfter / 1000} s`);
const warners = sources.filter(({ file, text }) => file !== "app/_components/usualWait.ts" && /taking longer than usual/i.test(text));
const unshared = warners.filter(({ text }) => !/usualWait/.test(text)).map(({ file }) => file);
check(`3. every page saying "taking longer than usual" takes its time from usualWait.ts (${warners.length} files)`, warners.length > 0 && unshared.length === 0, unshared.join(", "));

console.log(failures ? `\n${failures} check(s) failed.` : "\nNo page says a wait is longer than usual before the usual time it states.");
process.exit(failures ? 1 : 0);
