/**
 * No shared behaviour is implemented a second time (the guard for the eight steps).
 *
 * What it checks: for each behaviour in sharedBehaviourRegistry.ts, every .ts/.tsx
 * file in app/ and src/ other than the behaviour's one module is scanned, with
 * comments removed, for the patterns that mean "this re-implements it". Any hit
 * not on the behaviour's written exception list fails; an exception that no
 * longer matches fails too (delete it).
 *
 * Failure it exists to catch: a fix made in one copy of a behaviour while another
 * copy keeps the bug -- "October 6" asked for its year in Family but not civil,
 * "Ltd." ending a sentence in six places after it was fixed in one (#469-#471).
 *
 * Run: npm run test:shared-behaviour
 */
import fs from "node:fs";
import path from "node:path";
import { BEHAVIOURS } from "./sharedBehaviourRegistry";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const files: string[] = [];
const walk = (dir: string) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== "node_modules") walk(full); }
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) files.push(full);
  }
};
walk("app");
walk("src");

/** The source with comments blanked, so a comment describing the old way is not a copy. */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, (m, p) => p + " ".repeat(m.length - p.length));
}

for (const behaviour of BEHAVIOURS) {
  const hits: string[] = [];
  const used = new Set<number>();
  for (const file of files) {
    if (file === behaviour.module) continue;
    const raw = fs.readFileSync(file, "utf8");
    const code = withoutComments(raw);
    const lines = code.split("\n");
    const rawLines = raw.split("\n");
    lines.forEach((line, index) => {
      for (const { pattern, means } of behaviour.forbidden) {
        if (!pattern.test(line)) continue;
        const allowed = behaviour.allowed.findIndex((item) => item.file === file && rawLines[index].includes(item.contains));
        if (allowed >= 0) { used.add(allowed); continue; }
        hits.push(`${file}:${index + 1} (${means}): ${rawLines[index].trim().slice(0, 120)}`);
      }
    });
  }
  check(`${behaviour.name}: only ${behaviour.module} implements it`, hits.length === 0, hits.join("\n      "));
  const stale = behaviour.allowed.filter((_, index) => !used.has(index)).map((item) => `${item.file}: ${item.contains}`);
  check(`${behaviour.name}: every written exception still applies (delete the ones that do not)`, stale.length === 0, stale.join("\n      "));
}

if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
console.log(`PASS shared behaviour: ${BEHAVIOURS.length} behaviours, each implemented in one module`);
