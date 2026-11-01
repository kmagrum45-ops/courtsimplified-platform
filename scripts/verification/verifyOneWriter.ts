/**
 * ONE WRITER: EVERY SAVE POINT OF CASE DATA IS ON A LIST THAT ONLY SHRINKS (case core G0, "the rails";
 * docs CASE_CORE_DESIGN.md §10; founder's Phase 1 approval, 31 Oct: "a permanent check that fails on a
 * new save point bypassing the writer").
 *
 * The design: one writer for facts (`give` in caseFile.ts, and on the server POST /api/cases/facts with
 * factRecord.ts applyFactWrites). Today nothing goes through it; facts are saved from many places. This
 * suite scans app/ and src/ for every SAVE POINT -- a line that writes case data -- and compares it with
 * oneWriterAllowed.json, the inventory as found on 1 Nov 2026, which only shrinks as save points move
 * onto the writer (groups G1-G6). The kinds of save point:
 *
 *   intake-state      useIntakeState(section, field, ...): a checkpoint field saved through recovery.put
 *   intake-hook       useStory / useSituation / useCaseLocation / useIntakeRef / useInputWithStory callers
 *   recovery-put      recovery.put(section, key, ...) / store.put(...) called directly
 *   update-master     updateMasterResult(...) callers: a server or browser write of master_result
 *   cases-write       .from("cases") followed by insert / update / upsert / delete
 *   checkpoint-save   saveCheckpoint / saveReviewTransition / createCheckpointCase callers
 *   tab-copy          writeIntakeSession(...) and storage .setItem(...): a copy kept in the browser
 *
 * It FAILS when:
 *   (a) a save point is found more often than its entry allows, or has no entry: a NEW writer that
 *       bypasses the one writer (route it through `give` instead);
 *   (b) an entry allows more than is found: the save point moved or was deleted, so the entry must be
 *       lowered or deleted (the list says only true things, and so it shrinks);
 *   (c) the list allows anything origin/main's list does not (a new entry or a higher count): it may
 *       only SHRINK. Until the list is on main, it is compared with oneWriterBaseline.json, the seeded
 *       inventory committed with it.
 * Entries are counted per (kind, file, target), not per line, so moving code within a file is not a
 * change. The one writer's own files (WRITER_FILES) are exempt, and must exist.
 *
 * Every run also plants a new save point, an added entry and a stale entry in memory and shows each fails.
 *
 * What it misses (say so, do not trust it beyond this): writes to other case tables (case_events,
 * workspace_*, case_chat_messages); a table name or hook passed in a variable; a save made through a
 * wrapper with another name. Each miss found becomes a pattern here and a planted self-test.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export type SaveKind = "intake-state" | "intake-hook" | "recovery-put" | "update-master" | "cases-write" | "checkpoint-save" | "tab-copy";
export type SavePoint = { kind: SaveKind; file: string; target: string; line: number };
/** `group`: which Phase 1 group moves it onto the writer (design §10), or "rails" for the save plumbing itself. */
export type OneWriterEntry = { kind: SaveKind; file: string; target: string; count: number; group: string };

const ROOT = path.resolve(__dirname, "../..");
export const ALLOWED_PATH = "scripts/verification/oneWriterAllowed.json";
const BASELINE_PATH = "scripts/verification/oneWriterBaseline.json";
const SCAN_DIRS = ["app", "src"];
/** The one writer: exempt, because it IS the writer. Each must exist. */
export const WRITER_FILES = ["app/api/cases/facts/route.ts", "src/lib/case-system/caseFile/factRecord.ts", "src/lib/case-system/caseFile/factSave.ts"];
const GROUPS = new Set(["rails", "G1", "G2", "G3", "G4", "G5", "G6", "outside"]);

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

/** The source with comments blanked (lines kept), so a comment that names a writer is not one. */
export function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, (m, p) => p + " ".repeat(m.length - p.length));
}

/** The text of a call's arguments from the "(" at `open`, split at top-level commas (at most `max`). */
function callArgs(code: string, open: number, max = 2): string[] {
  const args: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = "";
  for (let index = open + 1; index < code.length && index < open + 2_000; index += 1) {
    const char = code[index];
    if (quote) { current += char; if (char === quote && code[index - 1] !== "\\") quote = null; continue; }
    if (char === "\"" || char === "'" || char === "`") { quote = char; current += char; continue; }
    if (char === "(" || char === "[" || char === "{") depth += 1;
    if (char === ")" || char === "]" || char === "}") {
      if (depth === 0) { args.push(current); break; }
      depth -= 1;
    }
    if (char === "," && depth === 0) { args.push(current); current = ""; if (args.length >= max) break; continue; }
    current += char;
  }
  return args.map((arg) => arg.replace(/\s+/g, " ").trim()).slice(0, max);
}

const lineAt = (code: string, index: number) => code.slice(0, index).split("\n").length;

type Rule = { kind: SaveKind; regex: RegExp; target: (code: string, match: RegExpExecArray) => string | null };
/** Not the definition itself ("function name(", "export async function name("). */
const notDefinition = (code: string, index: number) => !/function\s+$/.test(code.slice(Math.max(0, index - 40), index));
const openParen = (code: string, from: number) => code.indexOf("(", from);

const RULES: Rule[] = [
  { kind: "intake-state", regex: /\buseIntakeState\b\s*(?:<[^(]*?>)?\s*\(/g, target: (code, m) => notDefinition(code, m.index) ? callArgs(code, openParen(code, m.index), 2).join(", ") : null },
  { kind: "intake-hook", regex: /\b(useStory|useSituation|useCaseLocation|useIntakeRef|useInputWithStory)\b\s*(?:<[^(]*?>)?\s*\(/g, target: (code, m) => notDefinition(code, m.index) ? (m[1] === "useStory" || m[1] === "useSituation" || m[1] === "useCaseLocation" ? m[1] : `${m[1]}(${callArgs(code, openParen(code, m.index), m[1] === "useIntakeRef" ? 2 : 1).join(", ")})`) : null },
  { kind: "recovery-put", regex: /\b(?:recovery|store)\s*\??\.\s*put\s*\(/g, target: (code, m) => callArgs(code, openParen(code, m.index), 2).join(", ") },
  { kind: "update-master", regex: /\bupdateMasterResult\s*\(/g, target: (code, m) => notDefinition(code, m.index) ? "updateMasterResult" : null },
  {
    kind: "cases-write",
    regex: /\.from\(\s*["'`]cases["'`]\s*\)/g,
    target: (code, m) => {
      const statement = code.slice(m.index, m.index + 600).split(";")[0].split(/\.from\(/).slice(0, 2).join(".from(");
      return /\.(insert|update|upsert|delete)\s*\(/.exec(statement)?.[1] ?? null;
    },
  },
  { kind: "checkpoint-save", regex: /\b(saveCheckpoint|saveReviewTransition|createCheckpointCase)\s*\(/g, target: (code, m) => notDefinition(code, m.index) ? m[1] : null },
  { kind: "tab-copy", regex: /\bwriteIntakeSession\s*\(|\.setItem\s*\(/g, target: (code, m) => (m[0].startsWith("writeIntakeSession") ? (notDefinition(code, m.index) ? "writeIntakeSession" : null) : `setItem(${callArgs(code, openParen(code, m.index), 1)[0] ?? ""})`) },
];

/** Every save point in app/ and src/, outside the one writer's own files. */
export function scanSavePoints(root = ROOT, files?: Record<string, string>): SavePoint[] {
  const sources: [string, string][] = files
    ? Object.entries(files)
    : SCAN_DIRS.flatMap((dir) => walk(path.join(root, dir))).map((full) => [path.relative(root, full).split(path.sep).join("/"), readFileSync(full, "utf8")]);
  const found: SavePoint[] = [];
  for (const [file, text] of sources.sort(([a], [b]) => a.localeCompare(b))) {
    if (WRITER_FILES.includes(file)) continue;
    const code = withoutComments(text);
    for (const rule of RULES) {
      rule.regex.lastIndex = 0;
      for (let match = rule.regex.exec(code); match; match = rule.regex.exec(code)) {
        const target = rule.target(code, match);
        if (target !== null) found.push({ kind: rule.kind, file, target, line: lineAt(code, match.index) });
      }
    }
  }
  return found;
}

const keyOf = (entry: { kind: string; file: string; target: string }) => `${entry.kind} @ ${entry.file} :: ${entry.target}`;

/** Found save points counted per (kind, file, target). */
export function countSavePoints(found: SavePoint[]): Map<string, { kind: SaveKind; file: string; target: string; count: number; lines: number[] }> {
  const counts = new Map<string, { kind: SaveKind; file: string; target: string; count: number; lines: number[] }>();
  for (const point of found) {
    const key = keyOf(point);
    const entry = counts.get(key) ?? { kind: point.kind, file: point.file, target: point.target, count: 0, lines: [] };
    entry.count += 1;
    entry.lines.push(point.line);
    counts.set(key, entry);
  }
  return counts;
}

/** The verdict, pure: the save points found, the allowed list, and the list it may not grow beyond. */
export function judgeOneWriter(found: SavePoint[], allowed: OneWriterEntry[], base: OneWriterEntry[]) {
  const counts = countSavePoints(found);
  const allowedBy = new Map(allowed.map((entry) => [keyOf(entry), entry]));
  const baseBy = new Map(base.map((entry) => [keyOf(entry), entry]));
  const newWriters = [...counts.values()].filter((item) => item.count > (allowedBy.get(keyOf(item))?.count ?? 0)).map((item) => ({ ...item, allowed: allowedBy.get(keyOf(item))?.count ?? 0 }));
  const stale = allowed.filter((entry) => entry.count > (counts.get(keyOf(entry))?.count ?? 0)).map((entry) => ({ ...entry, found: counts.get(keyOf(entry))?.count ?? 0 }));
  const grown = allowed.filter((entry) => entry.count > (baseBy.get(keyOf(entry))?.count ?? 0)).map((entry) => ({ ...entry, base: baseBy.get(keyOf(entry))?.count ?? 0 }));
  const duplicates = allowed.filter((entry, index) => allowed.findIndex((other) => keyOf(other) === keyOf(entry)) !== index);
  const malformed = allowed.filter((entry) => !GROUPS.has(entry.group) || !Number.isInteger(entry.count) || entry.count < 1);
  return { newWriters, stale, grown, duplicates, malformed };
}

/** origin/main's list, or the seeded baseline while main has none; and which it was. */
function baseList(): { list: OneWriterEntry[]; from: string } {
  try {
    const text = execFileSync("git", ["show", `origin/main:${ALLOWED_PATH}`], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { list: JSON.parse(text) as OneWriterEntry[], from: `origin/main:${ALLOWED_PATH}` };
  } catch (error) {
    const message = String((error as { stderr?: unknown }).stderr ?? error);
    if (/exists on disk, but not in|does not exist in|path .* does not exist/i.test(message)) {
      return { list: JSON.parse(readFileSync(path.join(ROOT, BASELINE_PATH), "utf8")) as OneWriterEntry[], from: `${BASELINE_PATH} (the list is not on origin/main yet)` };
    }
    if (process.env.CI) throw new Error(`origin/main is not available to compare the allowed list with (fetch it first): ${message.trim()}`);
    console.log(`note  origin/main not available locally; comparing with the seeded baseline (${message.trim().split("\n")[0]})`);
    return { list: JSON.parse(readFileSync(path.join(ROOT, BASELINE_PATH), "utf8")) as OneWriterEntry[], from: BASELINE_PATH };
  }
}

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

function selfTest(allowed: OneWriterEntry[], found: SavePoint[]) {
  const plantedFile = "app/__one_writer_self_test__/PlantedWriter.tsx";
  const planted = scanSavePoints(ROOT, { [plantedFile]: [
    "const [name, setName] = useIntakeState(\"civil\", \"otherPartyCopy\", \"\");",
    "await updateMasterResult(db, { caseId }, (master) => ({ ...master, otherParty: name }));",
    "await supabase\n  .from(\"cases\")\n  .update({ title: name })\n  .eq(\"id\", caseId);",
    "// recovery.put(\"civil\", \"commented\", 1) is a comment, not a writer",
  ].join("\n") });
  check("self-test: the planted file's three writers are found and its commented one is not", planted.length === 3 && planted.every((point) => point.file === plantedFile), JSON.stringify(planted));
  check("self-test: a planted new save point (a field, a master_result write, a cases update) fails as a new writer", judgeOneWriter([...found, ...planted], allowed, allowed).newWriters.filter((item) => item.file === plantedFile).length === 3);
  const added: OneWriterEntry = { kind: "intake-state", file: plantedFile, target: "\"civil\", \"otherPartyCopy\"", count: 1, group: "G4" };
  const withAdded = judgeOneWriter([...found, ...planted], [...allowed, added], allowed);
  check("self-test: an entry added to the list fails, even when it makes the writer allowed", withAdded.grown.length === 1 && !withAdded.newWriters.some((item) => item.target === added.target));
  const raised = allowed[0] ? [{ ...allowed[0], count: allowed[0].count + 1 }, ...allowed.slice(1)] : [];
  check("self-test: a raised count fails as growth and as stale", raised.length > 0 && judgeOneWriter(found, raised, allowed).grown.length === 1 && judgeOneWriter(found, raised, raised).stale.length === 1);
  const ghost: OneWriterEntry = { kind: "update-master", file: "app/NoSuchFile.tsx", target: "updateMasterResult", count: 1, group: "G6" };
  check("self-test: an entry that matches nothing fails as stale", judgeOneWriter(found, [...allowed, ghost], [...allowed, ghost]).stale.some((entry) => entry.file === ghost.file));
}

function main() {
  const allowed = JSON.parse(readFileSync(path.join(ROOT, ALLOWED_PATH), "utf8")) as OneWriterEntry[];
  const found = scanSavePoints();
  const { list: base, from } = baseList();
  const verdict = judgeOneWriter(found, allowed, base);
  const byKind = new Map<string, number>();
  for (const point of found) byKind.set(point.kind, (byKind.get(point.kind) ?? 0) + 1);
  const byGroup = new Map<string, number>();
  for (const entry of allowed) byGroup.set(entry.group, (byGroup.get(entry.group) ?? 0) + entry.count);
  console.log(`One writer: ${found.length} save points found in app/ and src/ (${[...byKind].map(([kind, count]) => `${kind} ${count}`).join(", ")}); ${allowed.reduce((sum, entry) => sum + entry.count, 0)} allowed in ${allowed.length} entries (${[...byGroup].sort().map(([group, count]) => `${group} ${count}`).join(", ")}); compared with ${from} (${base.reduce((sum, entry) => sum + entry.count, 0)}).`);
  for (const file of WRITER_FILES) check(`the one writer's file exists: ${file}`, existsSync(path.join(ROOT, file)));
  check("every save point is on the list (no new writer bypassing give / POST /api/cases/facts)", verdict.newWriters.length === 0, verdict.newWriters.map((item) => `${keyOf(item)} found ${item.count} (lines ${item.lines.join(", ")}), allowed ${item.allowed} -- write through the one writer instead`).join("\n      "));
  check("every entry is still found as often as it allows (lower or delete moved save points)", verdict.stale.length === 0, verdict.stale.map((entry) => `${keyOf(entry)} allows ${entry.count}, found ${entry.found}: lower it to ${entry.found}${entry.found ? "" : " (delete the entry)"}`).join("\n      "));
  check(`the list allows nothing ${from} does not: it may only shrink`, verdict.grown.length === 0, verdict.grown.map((entry) => `${keyOf(entry)} allows ${entry.count}, base ${entry.base}`).join("\n      "));
  check("every entry is listed once, with a count and a group (rails, G1-G6, outside)", verdict.duplicates.length === 0 && verdict.malformed.length === 0, [...verdict.duplicates, ...verdict.malformed].map(keyOf).join("\n      "));
  selfTest(allowed, found);
  if (failures) {
    console.log(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll one-writer checks passed.");
}

if (process.argv[1] && /verifyOneWriter/.test(process.argv[1])) main();
