/**
 * RULE 0: ONE PLACE DECIDES, READS, LABELS AND WRITES EACH FACT; NOTHING OLD SITS BESIDE THE NEW (site owner, 19 Nov 2026).
 *
 * "When the new way of deciding a question, reading a fact, labelling a source or writing an answer is in, the old one is
 * deleted in the same change. No fallback, no second copy." The sweep of 19 Nov 2026 (the PR's report, part 1) found the
 * places below. This suite finds them again on every run, in app/ and src/, and compares them with oneDeciderAllowed.json:
 *
 *   decider        an exported function that decides whether a question is asked (named like mayAsk, askOf, toAsk,
 *                  pendingFields, alreadyAsked, detailsToAsk ...);
 *   story-reader   an exported function whose first parameter is the story (export function name(story ...));
 *   source-label   a label that says where a value came from ("From your story", "(from your story)", "from your
 *                  answer", "From what you told us", "Suggested from your story"), counted per file;
 *   question-text  a fixed question's words (the Small Claims question bank, the Civil and Family fields) written in a
 *                  file other than the one that owns them.
 *   (writers: test:one-writer, the same rule for save points, with its own list that only shrinks.)
 *
 * Each entry says what it is: "one" (the one place for its facts), "part" (a piece of the one place, called only by it),
 * "rule" (not a fact reader: a code rule fixed by law, run before the AI, CLAUDE.md s. 2a), "text" (works on text, reads
 * no fact), or "second" (a second copy: it names the one place it must move to, and why it has not moved yet).
 *
 * It FAILS when: something is found that is not on the list (a NEW decider, reader, label or copied question: put it in
 * the one place instead); an entry is not found as often as it says (it moved or was deleted: lower or delete the entry);
 * the list allows anything origin/main's list does not (it may only shrink); an entry is malformed (a "second" with no
 * one place or no reason); a second copy names a place that does not exist ("<file>" or "<file> <export>", checked on
 * disk). Every run prints the second copies left against the sweep's 59. Planted self-tests show each failure is caught.
 *
 * What it misses (say so): a decider or reader not named or shaped as above (e.g. narrativePrefill.ts reads several
 * facts from an object, not a `story` parameter); a label built from pieces. Each miss found becomes a pattern here.
 *
 * WHAT FAILURE THIS CATCHES: a second place that decides, reads, labels or words a fact, added beside the one place.
 *
 * Run: npm run test:one-decider
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { civilGuidedFields, familyGuidedFields } from "../../app/builder/_components/guidedFields";

export type Kind = "decider" | "story-reader" | "source-label" | "question-text";
export type Status = "one" | "part" | "rule" | "text" | "second";
export type Entry = { kind: Kind; file: string; name: string; count: number; status: Status; facts?: string; moveTo?: string; why?: string };
type Found = { kind: Kind; file: string; name: string; count: number };

const ROOT = path.resolve(__dirname, "../..");
export const LIST_PATH = "scripts/verification/oneDeciderAllowed.json";

/** A file's code without its comments (a name in a comment is not a decider). */
const codeOf = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
const DECIDER = /export (?:function|const) (may\w*Ask\w*|mayShow\w*|\w*ToAsk|askable|askOf|mayAsk|heldState|alreadyAsked|notAsked|nextQuestion|pendingFields|isQuestionAlreadyAnswered|without\w*(?:Answered|Asked)|detailStatus|detailsToAsk|homeAsks|selectNextTriageQuestion|questionStatus|factStatus|chatMayAsk)\b/g;
const READER = /export function (\w+)\(\s*story\b/g;
const LABEL = /From your story|\(from your story\)|from your story:|from your answer|From what you told us|[Ss]uggested from your story/g;

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(path.join(ROOT, dir))) {
      const rel = `${dir}/${name}`;
      if (statSync(path.join(ROOT, rel)).isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(name)) out.push(rel);
    }
  };
  walk("app");
  walk("src");
  return out.sort();
}

/** The fixed question words and the file that owns each (the question bank; the Civil and Family fields). */
function fixedWords(): { text: string; id: string; owner: string }[] {
  const bank = QUESTION_BANK.map((item) => ({ text: item.text, id: item.id, owner: "src/lib/case-system/intake/questionBank.ts" }));
  const fields = [...civilGuidedFields({ issues: [], documents: [] }).map((field) => ({ text: field.question, id: `civil:${field.key}` })), ...familyGuidedFields({ issues: [], filed: [] }).map((field) => ({ text: field.question, id: `family:${field.key}` }))]
    .map((item) => ({ ...item, owner: "app/builder/_components/guidedFields.ts" }));
  return [...bank, ...fields].filter((item) => item.text.length >= 20);
}

export function scan(files: Record<string, string>): Found[] {
  const found: Found[] = [];
  const words = fixedWords();
  for (const [file, text] of Object.entries(files)) {
    const code = codeOf(text);
    for (const match of code.matchAll(DECIDER)) found.push({ kind: "decider", file, name: match[1], count: 1 });
    for (const match of code.matchAll(READER)) found.push({ kind: "story-reader", file, name: match[1], count: 1 });
    const labels = (code.match(LABEL) ?? []).length;
    if (labels) found.push({ kind: "source-label", file, name: "label", count: labels });
    for (const word of words) if (file !== word.owner && text.includes(word.text)) found.push({ kind: "question-text", file, name: word.id, count: 1 });
  }
  // One entry per (kind, file, name), counted.
  const merged = new Map<string, Found>();
  for (const item of found) {
    const key = keyOf(item);
    const held = merged.get(key);
    merged.set(key, held ? { ...held, count: held.count + item.count } : item);
  }
  return [...merged.values()];
}

export const keyOf = (item: { kind: string; file: string; name: string }) => `${item.kind} ${item.file} ${item.name}`;

/**
 * A second copy names the one place it moves to as "<file>" or "<file> <exported name>", and that place exists: the file
 * is in app/ or src/, and the name is exported from it (site owner, 20 Nov 2026: CI fails when an entry names a target that
 * does not exist). A target "not built yet" is not a place; name the file and export that will hold it.
 */
export function targetMissing(entry: Entry, files: Record<string, string>): string | null {
  if (entry.status !== "second") return null;
  const parts = /^(\S+\.tsx?)(?: (\w+))?$/.exec(entry.moveTo ?? "");
  if (!parts) return `"${entry.moveTo}" is not "<file>" or "<file> <exported name>"`;
  const code = files[parts[1]];
  if (code === undefined) return `${parts[1]} does not exist`;
  if (parts[2] && !new RegExp(`export (?:async )?(?:function|const|type|interface|class) ${parts[2]}\\b`).test(code)) return `${parts[1]} exports no ${parts[2]}`;
  return null;
}

/** The second copies the sweep of 19 Nov 2026 found; every report prints "59 -> N" against it (site owner, 20 Nov 2026). */
export const SWEEP_SECONDS = 59;

export function judge(found: Found[], list: Entry[], base: Entry[]) {
  const listed = new Map(list.map((entry) => [keyOf(entry), entry]));
  const baseOf = new Map(base.map((entry) => [keyOf(entry), entry]));
  const unlisted = found.filter((item) => (listed.get(keyOf(item))?.count ?? 0) < item.count);
  const stale = list.filter((entry) => (found.find((item) => keyOf(item) === keyOf(entry))?.count ?? 0) < entry.count);
  const grown = list.filter((entry) => entry.count > (baseOf.get(keyOf(entry))?.count ?? 0) || (entry.status === "second" && baseOf.get(keyOf(entry))?.status !== "second" && baseOf.has(keyOf(entry))));
  const malformed = list.filter((entry) => entry.status === "second" ? !entry.moveTo || !entry.why || entry.why.trim().length < 40 : false);
  const seen = new Set<string>();
  const duplicates = list.filter((entry) => { const key = keyOf(entry); if (seen.has(key)) return true; seen.add(key); return false; });
  return { unlisted, stale, grown, malformed, duplicates };
}

function baseList(list: Entry[]): { base: Entry[]; from: string } {
  try {
    const text = execFileSync("git", ["show", `origin/main:${LIST_PATH}`], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return { base: JSON.parse(text) as Entry[], from: `origin/main:${LIST_PATH}` };
  } catch {
    // Not on main yet: this change seeds it, so the list is its own base until it merges.
    return { base: list, from: `${LIST_PATH} (seeded in this change; not on origin/main yet)` };
  }
}

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

function main() {
  const files = Object.fromEntries(sourceFiles().map((file) => [file, readFileSync(path.join(ROOT, file), "utf8")]));
  const list = JSON.parse(readFileSync(path.join(ROOT, LIST_PATH), "utf8")) as Entry[];
  const found = scan(files);
  const { base, from } = baseList(list);
  const verdict = judge(found, list, base);
  const seconds = list.filter((entry) => entry.status === "second");
  console.log(`One decider: ${found.length} found (${(["decider", "story-reader", "source-label", "question-text"] as Kind[]).map((kind) => `${kind} ${found.filter((item) => item.kind === kind).length}`).join(", ")}); ${list.length} listed, ${seconds.length} of them second copies still to move; compared with ${from}.`);
  check("nothing new decides, reads, labels or words a fact beside the one place", verdict.unlisted.length === 0, verdict.unlisted.map((item) => `${keyOf(item)} (x${item.count}): move it into the one place instead`).join("\n      "));
  check("every entry is still found as often as it says (delete or lower a moved one)", verdict.stale.length === 0, verdict.stale.map((entry) => `${keyOf(entry)} lists ${entry.count}`).join("\n      "));
  check(`the list allows nothing ${from} does not: it may only shrink`, verdict.grown.length === 0, verdict.grown.map(keyOf).join("\n      "));
  const missing = list.flatMap((entry) => { const why = targetMissing(entry, files); return why ? [`${keyOf(entry)}: ${why}`] : []; });
  check("every second copy moves to a place that exists (its file, and the export it names)", missing.length === 0, missing.join("\n      "));
  const split = (["decider", "story-reader", "source-label", "question-text"] as Kind[]).map((kind) => `${kind} ${seconds.filter((entry) => entry.kind === kind).length}`).join(", ");
  console.log(`Second copies: ${SWEEP_SECONDS} -> ${seconds.length} (${split}).`);
  check("every second copy names the one place it moves to and why it has not moved yet; no entry twice", verdict.malformed.length === 0 && verdict.duplicates.length === 0, [...verdict.malformed, ...verdict.duplicates].map(keyOf).join("\n      "));

  // Planted: each kind of new second place is caught, and a grown list fails.
  const planted = scan({ "app/__planted__/Second.tsx": [
    "export function mayAskAgain(file: unknown) { return true; }",
    "export function amountAgainFromStory(story: string) { return story; }",
    "const note = `From your story: ${quote}`;",
    `const q = ${JSON.stringify(QUESTION_BANK.find((item) => item.text.length >= 20)!.text)};`,
    "// export function mayAskInAComment(file) is a comment",
  ].join("\n") });
  check("self-test: a planted decider, story reader, label and copied question are each found (the comment is not)", ["decider", "story-reader", "source-label", "question-text"].every((kind) => planted.some((item) => item.kind === kind)) && planted.length === 4, JSON.stringify(planted));
  check("self-test: the planted ones fail as new", judge([...found, ...planted], list, base).unlisted.length === 4);
  const added: Entry = { kind: "decider", file: "app/__planted__/Second.tsx", name: "mayAskAgain", count: 1, status: "second", moveTo: "factStatus.ts", why: "a planted entry, added to the list to allow a new second decider" };
  check("self-test: adding an entry to the list fails as growth", judge([...found, ...planted], [...list, added], list).grown.length === 1);
  check("self-test: a second copy whose target does not exist fails (no file, no such export, not a place); a real one passes",
    targetMissing({ ...added, moveTo: "src/lib/case-system/caseFile/notThere.ts" }, files) !== null
      && targetMissing({ ...added, moveTo: "src/lib/case-system/caseFile/factStatus.ts noSuchExport" }, files) !== null
      && targetMissing({ ...added, moveTo: "one place (not built yet)" }, files) !== null
      && targetMissing({ ...added, moveTo: "src/lib/case-system/caseFile/factStatus.ts factStatus" }, files) === null);
  check("self-test: a second copy with no reason fails as malformed", judge(found, [...list, { ...added, why: "" }], [...list, { ...added, why: "" }]).malformed.length === 1);

  if (failures) { console.log(`\n${failures} check(s) failed.`); process.exit(1); }
  console.log("\nAll one-decider checks passed.");
}

if (process.argv[1] && /verifyOneDecider/.test(process.argv[1])) main();
