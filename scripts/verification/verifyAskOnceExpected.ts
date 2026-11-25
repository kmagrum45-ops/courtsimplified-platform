/**
 * THE ASK-ONCE EXPECTED-FAILURE LIST MAY ONLY SHRINK (site owner, 11 Nov 2026: "That list may only shrink, each entry
 * has a reason, and it must be empty when slice 4 lands").
 *
 * The page-level ask-once test (tests/browser/ask-once-pages.spec.ts) fails on any violation not listed in
 * tests/browser/harness/askOnceExpected.json. This suite checks the list itself, with no browser:
 *   1. every entry names a story the spec has, a known kind, a fact and a screen, and gives a reason in words;
 *   2. no entry repeats another;
 *   3. no entry is added compared with origin/main's list (until the list is on main, nothing to compare: noted);
 *   4. the self-test: an added entry and an entry without a reason are both caught.
 *
 * WHAT FAILURE THIS CATCHES: a new violation silenced by adding it to the list instead of fixing it.
 *
 * Run: npm run test:ask-once-expected
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

type Entry = { story: string; kind: string; fact: string; screen: string; reason: string };
const PATH = "tests/browser/harness/askOnceExpected.json";
const KINDS = new Set(["asked-twice", "stated-cold", "typed-reconfirm", "missing-label"]);
const key = (entry: Entry) => [entry.story, entry.kind, entry.fact, entry.screen].join(" | ");

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

/** The story names the spec runs (read from its source: importing it would register its tests). */
const stories = new Set([...readFileSync("tests/browser/ask-once-pages.spec.ts", "utf8").matchAll(/(?:S\(|name: )"([a-z0-9-]+)"/g)].map((match) => match[1]));

export function malformed(list: Entry[]): string[] {
  return list.flatMap((entry) => {
    const problems: string[] = [];
    if (!stories.has(entry.story)) problems.push(`${key(entry)}: no such story`);
    if (!KINDS.has(entry.kind)) problems.push(`${key(entry)}: unknown kind`);
    if (!entry.fact || !entry.screen) problems.push(`${key(entry)}: no fact or screen`);
    if (!entry.reason || entry.reason.trim().length < 20) problems.push(`${key(entry)}: no reason in words`);
    return problems;
  });
}
export const added = (now: Entry[], before: Entry[]) => now.filter((entry) => !before.some((old) => key(old) === key(entry)));

const list = (JSON.parse(readFileSync(PATH, "utf8")).entries ?? []) as Entry[];
check(`setup: the spec's stories are read (${stories.size})`, stories.size >= 30);
check(`1. every entry names a story, a known kind, a fact, a screen and a reason (${list.length} entries)`, malformed(list).length === 0, malformed(list).slice(0, 8).join("\n      "));
const keys = list.map(key);
check("2. no entry repeats another", new Set(keys).size === keys.length, keys.filter((item, index) => keys.indexOf(item) !== index).join("; "));

let base: Entry[] | null = null;
try {
  base = (JSON.parse(execFileSync("git", ["show", `origin/main:${PATH}`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })).entries ?? []) as Entry[];
} catch {
  console.log("note  the list is not on origin/main yet: nothing to compare with (this pull request adds it)");
}
if (base) check(`3. no entry is added compared with origin/main (${base.length} there, ${list.length} here)`, added(list, base).length === 0, added(list, base).map(key).join("\n      "));

const planted: Entry = { story: list[0]?.story ?? "sc-tree-cut", kind: "stated-cold", fact: "planted", screen: "planted", reason: "" };
check("4. self-test: an added entry is caught", added([...list, planted], list).length === 1);
check("4. self-test: an entry without a reason is caught", malformed([planted]).some((problem) => problem.includes("no reason")));

console.log(failures ? `\n${failures} check(s) failed.` : `\nThe expected list: ${list.length} entries, none added.`);
process.exit(failures ? 1 : 0);
