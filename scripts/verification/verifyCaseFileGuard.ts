/**
 * THE CASE FILE GUARD: NO NEW COPY OF A CASE FACT OUTSIDE THE CASE FILE (site owner, 29 Oct).
 *
 * The owner's rule: everything a person tells the site is stored once, in the case file
 * (src/lib/case-system/caseFile/caseFile.ts: SLOT_FACTS, caseFileOf, give; factsOfQuestion.ts), and
 * every screen, card, checklist and AI prompt reads and writes it through that one place.
 *
 * The fact inventory of 29 Oct found 146 places that keep their own copy of a fact or read one
 * from somewhere else (plus row #107, a fact kept nowhere). Each is named by a pattern in
 * caseFileGuardPatterns.ts and listed, with its inventory row, in caseFileGuardAllowed.json. This
 * suite scans app/ and src/ (outside the case file module) and FAILS when:
 *   (a) a pattern matches a file the allowed list does not name for it: a NEW copy or second reader;
 *   (b) an allowed entry no longer matches anything: the place was moved into the case file, so the
 *       entry is stale and must be deleted (the list only says true things);
 *   (c) the allowed list has an entry that origin/main's list does not: the list may only SHRINK.
 *       Until the list exists on main (the pull request that adds it), it is compared with the
 *       seeded baseline committed with it (caseFileGuardBaseline.json, the inventory as found).
 * Also: every allowed entry names a known pattern and an inventory row with a reason; every
 * inventory row is covered by an entry or listed in ROWS_NOT_PATTERNS with how it is tracked.
 *
 * Failure it exists to catch: a screen, card or AI prompt that keeps its own copy of a case fact
 * (a React state seeded from the intake, a key under master_result.intakeData.extra, a "confirmed"
 * flag of its own) and so shows a different answer from the case file -- the 29 Oct claim-type
 * bug, where the overview, "Check my case file", the review and the Form 7A section each read the
 * kind of claim from a different place and disagreed.
 *
 * Every run also plants a new copy, an added entry and a stale entry in memory and shows each fails.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { GUARD_PATTERNS, ROWS_NOT_PATTERNS } from "./caseFileGuardPatterns";

/** One place: a pattern's match in one file, with its inventory row (and any other rows the same place stands for). */
export type AllowedEntry = { row: number; alsoRows?: number[]; fact: string; pattern: string; file: string; reason: string; scanFound?: boolean };
const rowsOf = (entry: AllowedEntry) => [entry.row, ...(entry.alsoRows ?? [])];
export type Found = { pattern: string; file: string; line: number };

const ROOT = path.resolve(__dirname, "../..");
const ALLOWED_PATH = "scripts/verification/caseFileGuardAllowed.json";
const BASELINE_PATH = "scripts/verification/caseFileGuardBaseline.json";
/** The case file module: the one place a fact may be kept and read. */
const CASE_FILE_DIR = "src/lib/case-system/caseFile/";
const SCAN_DIRS = ["app", "src"];

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

/** Every (pattern, file) the patterns match in app/ and src/, outside the case file module. */
export function scanGuard(root = ROOT, files?: Record<string, string>): Found[] {
  const sources: [string, string][] = files
    ? Object.entries(files)
    : SCAN_DIRS.flatMap((dir) => walk(path.join(root, dir))).map((full) => [path.relative(root, full).split(path.sep).join("/"), readFileSync(full, "utf8")]);
  const found: Found[] = [];
  for (const [file, text] of sources.sort(([a], [b]) => a.localeCompare(b))) {
    if (file.startsWith(CASE_FILE_DIR)) continue;
    const lines = text.split(/\r?\n/);
    for (const pattern of GUARD_PATTERNS) {
      const index = lines.findIndex((line) => pattern.regex.test(line));
      if (index >= 0) found.push({ pattern: pattern.id, file, line: index + 1 });
    }
  }
  return found;
}

const key = (entry: { pattern: string; file: string }) => `${entry.pattern} @ ${entry.file}`;
const entryKey = (entry: AllowedEntry) => `${entry.row} | ${entry.pattern} @ ${entry.file}`;

/**
 * The guard's verdict, pure: the matches, the allowed list, the list it may not grow beyond (`base`: origin/main's
 * list, else the seeded baseline), and the inventory as first found (`seed`: caseFileGuardBaseline.json).
 * A row is RETIRED when the seeded baseline has it and the allowed list no longer does: always from the seed,
 * never from main's list (founder, 1 Nov). Main's list is used only for "may only shrink". Before, retired came
 * from `base`; once main had its own list (#536 merged), rows retired before that list (3-8, 10) had no entry
 * in either list and counted as uncovered, on every OS: main's CI 41374353387 failed on it.
 */
export function judge(found: Found[], allowed: AllowedEntry[], base: AllowedEntry[], seed: AllowedEntry[] = base): { newCopies: Found[]; stale: AllowedEntry[]; added: AllowedEntry[]; malformed: string[]; uncoveredRows: number[] } {
  const allowedKeys = new Set(allowed.map(key));
  const foundKeys = new Set(found.map(key));
  const baseKeys = new Set(base.map(entryKey));
  const patternIds = new Set(GUARD_PATTERNS.map((pattern) => pattern.id));
  const malformed = allowed.flatMap((entry) => {
    const problems: string[] = [];
    if (!patternIds.has(entry.pattern)) problems.push(`${key(entry)}: unknown pattern`);
    if (!Number.isInteger(entry.row) || entry.row < 1 || entry.row > 147) problems.push(`${key(entry)}: no inventory row`);
    if (!entry.reason || entry.reason.trim().length < 20) problems.push(`${key(entry)}: no reason in words`);
    return problems;
  });
  const rows = new Set<number>([...allowed.flatMap(rowsOf), ...ROWS_NOT_PATTERNS.map((entry) => entry.row)]);
  // A row converted into the case file has no entry left: it is covered by having been retired.
  const retired = new Set<number>(seed.flatMap(rowsOf).filter((row) => !rows.has(row)));
  const uncoveredRows = Array.from({ length: 147 }, (_, index) => index + 1).filter((row) => !rows.has(row) && !retired.has(row));
  return {
    newCopies: found.filter((item) => !allowedKeys.has(key(item))),
    stale: allowed.filter((entry) => !foundKeys.has(key(entry))),
    added: allowed.filter((entry) => !baseKeys.has(entryKey(entry))),
    malformed,
    uncoveredRows,
  };
}

/** origin/main's allowed list, or the seeded baseline while main has none; and which it was. */
function baseList(): { list: AllowedEntry[]; from: string } {
  try {
    const text = execFileSync("git", ["show", `origin/main:${ALLOWED_PATH}`], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { list: JSON.parse(text) as AllowedEntry[], from: `origin/main:${ALLOWED_PATH}` };
  } catch (error) {
    const message = String((error as { stderr?: unknown }).stderr ?? error);
    // The list is not on main yet (this pull request adds it): the seeded baseline is the ceiling.
    if (/exists on disk, but not in|does not exist in|path .* does not exist/i.test(message)) {
      return { list: JSON.parse(readFileSync(path.join(ROOT, BASELINE_PATH), "utf8")) as AllowedEntry[], from: `${BASELINE_PATH} (the list is not on origin/main yet)` };
    }
    // origin/main itself is missing (a shallow checkout that did not fetch it): never pass silently in CI.
    if (process.env.CI) throw new Error(`origin/main is not available to compare the allowed list with (fetch it first): ${message.trim()}`);
    console.log(`note  origin/main not available locally; comparing with the seeded baseline (${message.trim().split("\n")[0]})`);
    return { list: JSON.parse(readFileSync(path.join(ROOT, BASELINE_PATH), "utf8")) as AllowedEntry[], from: BASELINE_PATH };
  }
}

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

function selfTest(allowed: AllowedEntry[], found: Found[], base: AllowedEntry[], seed: AllowedEntry[]) {
  // A planted new copy: a screen that keeps the claim type in its own state.
  const planted = scanGuard(ROOT, { "app/__case_file_guard_self_test__/PlantedCopy.tsx": "const [draftClaimTypeId, setDraftClaimTypeId] = useState(null);" });
  const withPlant = judge([...found, ...planted], allowed, allowed);
  check("self-test: a planted new copy (a screen's own draftClaimTypeId) fails as a new copy", withPlant.newCopies.some((item) => item.file === "app/__case_file_guard_self_test__/PlantedCopy.tsx"));
  // A planted added entry: someone allows the planted copy instead of reading the case file.
  const addedEntry: AllowedEntry = { row: 5, fact: "claim type", pattern: "ct.draftClaimTypeId", file: "app/__case_file_guard_self_test__/PlantedCopy.tsx", reason: "Planted by the self-test: an entry added to the allowed list." };
  const withAdded = judge([...found, ...planted], [...allowed, addedEntry], allowed);
  check("self-test: an entry added to the allowed list fails, even when it makes the copy allowed", withAdded.added.length === 1 && withAdded.newCopies.length === 0);
  // A stale entry: a place moved into the case file still listed.
  const ghost: AllowedEntry = { row: 1, fact: "claim type", pattern: "ct.matchedClaimType", file: "app/NoSuchFile.tsx", reason: "Planted by the self-test: an entry that matches nothing." };
  check("self-test: an entry that matches nothing fails as stale", judge(found, [...allowed, ghost], [...allowed, ghost]).stale.some((entry) => entry.file === "app/NoSuchFile.tsx"));
  // A RETIRED row coming back in code (founder, 1 Nov): a planted copy for a row the seed has and the allowed
  // list no longer does is a new copy, with retired rows taken from the seed and main's list as the ceiling.
  const allowedRows = new Set(allowed.flatMap(rowsOf));
  const retiredRow = seed.flatMap(rowsOf).find((row) => !allowedRows.has(row));
  const retiredPlant = retiredRow === undefined ? [] : planted.map((item) => ({ ...item, row: retiredRow }));
  const back = judge([...found, ...retiredPlant], allowed, base, seed);
  check(`self-test: a retired row (row ${retiredRow ?? "none"}) that reappears in code fails as a new copy`, retiredRow !== undefined && back.newCopies.some((item) => item.file === "app/__case_file_guard_self_test__/PlantedCopy.tsx"));
  // The allowed list grown compared with origin/main's (the real ceiling of this run), retired rows from the seed.
  const grown = judge([...found, ...planted], [...allowed, addedEntry], base, seed);
  check("self-test: an allowed list grown compared with origin/main fails (may only shrink), with retired rows from the seed", grown.added.some((entry) => entry.file === "app/__case_file_guard_self_test__/PlantedCopy.tsx"));
}

function main() {
  const allowed = JSON.parse(readFileSync(path.join(ROOT, ALLOWED_PATH), "utf8")) as AllowedEntry[];
  const found = scanGuard();
  const { list: base, from } = baseList();
  // Retired rows always come from the seeded baseline; main's list only for "may only shrink" (founder, 1 Nov).
  const seed = JSON.parse(readFileSync(path.join(ROOT, BASELINE_PATH), "utf8")) as AllowedEntry[];
  const verdict = judge(found, allowed, base, seed);
  const rowsWithEntries = new Set(allowed.flatMap(rowsOf));
  console.log(`The case file guard: ${found.length} places found by ${GUARD_PATTERNS.length} patterns; ${allowed.length} allowed entries (${allowed.filter((entry) => !entry.scanFound).length} in files the inventory named, ${allowed.filter((entry) => entry.scanFound).length} found by the scan beside a row); ${rowsWithEntries.size} inventory rows still open; compared with ${from} (${base.length} entries).`);
  for (const row of ROWS_NOT_PATTERNS) console.log(`note  row ${row.row} is not a pattern: ${row.why} Tracked by: ${row.trackedBy}`);
  check("every place a pattern finds is on the allowed list (no new copy of a case fact)", verdict.newCopies.length === 0, verdict.newCopies.map((item) => `${key(item)}:${item.line} -- read it through the case file (caseFileOf) instead`).join("\n      "));
  check("every allowed entry still matches something (delete stale entries)", verdict.stale.length === 0, verdict.stale.map((entry) => `${key(entry)} (row ${entry.row}) matches nothing: delete it`).join("\n      "));
  check(`the allowed list adds no entry to ${from}: it may only shrink`, verdict.added.length === 0, verdict.added.map((entry) => entryKey(entry)).join("\n      "));
  check("every allowed entry names a pattern, an inventory row and a reason", verdict.malformed.length === 0, verdict.malformed.join("\n      "));
  check("every inventory row is covered by an entry, retired, or listed with how it is tracked", verdict.uncoveredRows.length === 0, `rows: ${verdict.uncoveredRows.join(", ")}`);
  selfTest(allowed, found, base, seed);
  if (failures) {
    console.log(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll case file guard checks passed.");
}

if (process.argv[1] && /verifyCaseFileGuard/.test(process.argv[1])) main();
