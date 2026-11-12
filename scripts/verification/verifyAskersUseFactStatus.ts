/**
 * EVERY PLACE THAT ASKS, OFFERS OR SAYS A FACT IS MISSING GETS THAT FROM THE ONE FUNCTION (site owner, 11 Nov 2026:
 * "any screen that asks, reads or writes facts another way fails the build"; the target is zero exceptions).
 *
 * The one function is src/lib/case-system/caseFile/factStatus.ts (factStatus, stillNeeded). An ASKER is any file in
 * app/ or src/ that
 *   (a) renders a question, a story offer, an input shown as needing an answer, a confirm request or a "not answered"
 *       / "not entered" / "still needed" label (found by the markers below), or
 *   (b) decides what to ask or what is missing without rendering it (the named list below, from the 11 Nov inventory:
 *       the depth questions, the overview's engine, the draft engines, the filled PDF, the assistant, the home reading).
 * Each asker must import the one function, or be on the list of askers not moved yet
 * (scripts/verification/askersNotYetOnFactStatus.json), each with its reason. That list:
 *   1. may only shrink: an entry added compared with origin/main fails;
 *   2. holds only askers that still do not use the one function (a moved one must be deleted: stale fails);
 *   3. is empty at the end of the work (slice 6), when every asker uses it.
 * A NEW file that asks without the one function fails at once, wherever it is.
 *
 * WHAT FAILURE THIS CATCHES: a screen that keeps its own list of what to ask, so a fact the person gave is asked again.
 *
 * Run: npm run test:askers-fact-status
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ONE_FUNCTION = "src/lib/case-system/caseFile/factStatus.ts";
const LIST_PATH = "scripts/verification/askersNotYetOnFactStatus.json";
/** The case file module itself is the one place facts are kept; it is not an asker of its own. */
const OWN = (file: string) => file === ONE_FUNCTION || file === "src/lib/case-system/caseFile/caseFile.ts";

/** What a page shows when it asks, offers or says something is missing. */
const MARKERS: RegExp[] = [
  /data-testid="(?:guided-form-question|story-proposals|story-proposal-row|intake-initial-question|intake-entry|claim-type-suggestion|stage-answer-date-question|triage-question|sourced-question-current|case-understanding-questions|not-answered-yet|intake-not-answered-yet)"/,
  /isQuestion: true/,
  /Not answered yet|not yet been clearly entered|has not yet been entered|name not entered|Still useful to add|What we still need to know|What to confirm next|needs confirming/,
];
/** Askers that decide without rendering (the 11 Nov inventory). */
export const DECIDING = [
  "src/lib/case-system/intake/depth/selectDepthQuestions.ts",
  "src/lib/case-system/intake/selectQuestions.ts",
  "src/lib/case-system/intake/asker.ts",
  "src/lib/case-system/intakeReview.ts",
  "src/lib/case-system/intelligence/smallClaimsIntelligenceEngine.ts",
  "src/lib/case-system/statementOfClaimDraftEngine.ts",
  "src/lib/case-system/claimDraftEngine.ts",
  "app/api/generate-form/route.ts",
  "src/lib/case-system/guided-assistant/guidedAssistantOrchestrator.ts",
  "src/lib/case-system/guided-assistant/conversationIntelligenceEngine.ts",
  "src/lib/case-system/understanding/understandCase.ts",
  "src/lib/case-system/retrieval/sourcedQuestions.ts",
];

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full.split(path.sep).join("/"));
  }
  return out;
}

/** Every asker and whether it uses the one function. */
export function askers(files: Record<string, string>): { file: string; uses: boolean }[] {
  return Object.entries(files)
    .filter(([file, text]) => !OWN(file) && (DECIDING.includes(file) || MARKERS.some((marker) => marker.test(text))))
    .map(([file, text]) => ({ file, uses: /from ["'][^"']*caseFile\/factStatus["']/.test(text) }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

type Entry = { file: string; reason: string };
let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const files = Object.fromEntries([...walk("app"), ...walk("src")].map((file) => [file, readFileSync(file, "utf8")]));
const found = askers(files);
const list = (JSON.parse(readFileSync(LIST_PATH, "utf8")).entries ?? []) as Entry[];
const listed = new Set(list.map((entry) => entry.file));
console.log(`Askers: ${found.length}; using the one function: ${found.filter((item) => item.uses).length}; not yet: ${list.length}`);

check(`setup: the deciding askers exist (${DECIDING.length})`, DECIDING.every((file) => existsSync(file)), DECIDING.filter((file) => !existsSync(file)).join(", "));
const silent = found.filter((item) => !item.uses && !listed.has(item.file));
check("every asker uses the one function (factStatus.ts) or is listed as not moved yet", silent.length === 0, silent.map((item) => `${item.file}: ask through factStatus/stillNeeded`).join("\n      "));
const stale = list.filter((entry) => !found.some((item) => item.file === entry.file && !item.uses));
check("every listed asker still does not use it (delete moved ones)", stale.length === 0, stale.map((entry) => entry.file).join(", "));
const reasonless = list.filter((entry) => !entry.reason || entry.reason.trim().length < 20);
check("every listed asker has a reason", reasonless.length === 0, reasonless.map((entry) => entry.file).join(", "));

let base: Entry[] | null = null;
try {
  base = (JSON.parse(execFileSync("git", ["show", `origin/main:${LIST_PATH}`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })).entries ?? []) as Entry[];
} catch {
  console.log("note  the list is not on origin/main yet: nothing to compare with (this pull request adds it)");
}
if (base) {
  const grown = list.filter((entry) => !base!.some((old) => old.file === entry.file));
  check(`the list adds no asker compared with origin/main (${base.length} there, ${list.length} here)`, grown.length === 0, grown.map((entry) => entry.file).join(", "));
}

// Self-test: a new screen that asks on its own fails; one that uses the one function passes.
const planted = askers({ "app/__planted__/Asks.tsx": '<p data-testid="not-answered-yet">Not answered yet</p>', "app/__planted__/Uses.tsx": 'import { stillNeeded } from "@/src/lib/case-system/caseFile/factStatus";\n<p>Not answered yet</p>' });
check("self-test: a new asker without the one function is found, one with it is not", planted.length === 2 && !planted[0].uses && planted[1].uses);

console.log(failures ? `\n${failures} check(s) failed.` : `\nAskers on the one function: ${found.filter((item) => item.uses).length} of ${found.length}.`);
process.exit(failures ? 1 : 0);
