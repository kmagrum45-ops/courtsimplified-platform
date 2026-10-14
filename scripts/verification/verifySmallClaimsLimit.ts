/**
 * The Small Claims limit is $50,000 everywhere the site states it, and the old
 * $35,000 limit appears nowhere the site ships.
 *
 * COSTS NOTHING. Reads files; no model, no network.
 *
 * WHY (2026-10-13, site owner: "the small claims amount has been an issue for
 * months ... get rid of all 35k reference"). The limit rose from $35,000 to
 * $50,000 on October 1, 2025 (O. Reg. 626/00, s. 1 (1)). The old figure kept
 * coming back: from the Superior Court's own "Steps to a Civil Case" page,
 * which still states it, from ontario.ca's notice that the limit "will
 * increase", and from content that described the change. The official pages
 * are saved word for word and cannot be edited, so their stale sentences are
 * withheld at retrieval (docs/sources/corpus/superseded.json; asserted in
 * test:checked-answer). This suite covers everything else.
 *
 * WHAT FAILURE THIS CATCHES:
 *   - the saved regulation no longer saying $50,000 (a re-vendored change in
 *     the law: update the constants below and everything that states the limit);
 *   - a limit constant in code that is not the regulation's figure;
 *   - "$35,000", "35,000", "35000" or "35k" anywhere under src/ or app/ --
 *     content, prompts, citations, pinpoints, comments -- since nothing the
 *     site ships has a reason to carry the old limit;
 *   - a superseded.json entry whose phrase or sentence is no longer in its
 *     saved source (re-vendored page: the entry is dead and should be removed).
 *
 * Run: node --import tsx scripts/verification/verifySmallClaimsLimit.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { ONTARIO_SMALL_CLAIMS_LIMIT } from "../../src/lib/case-system/utils";
import { SMALL_CLAIMS_LIMIT } from "../../src/lib/case-system/intelligence/courtPathClassifier";

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (ok) console.log(`pass  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const ROOT = process.cwd();
const flat = (text: string) => text.replace(/\s+/g, " ");

// ---- the law
const regulation = flat(readFileSync(path.join(ROOT, "docs/sources/corpus/oreg-626-00-monetary-jurisdiction.txt"), "utf8"));
const match = regulation.match(/The maximum amount of a claim in the Small Claims Court is \$([\d,]+)\./);
const inForce = match ? Number(match[1].replace(/,/g, "")) : NaN;
check("the saved O. Reg. 626/00 s. 1 (1) states the limit", Number.isFinite(inForce), match?.[0] ?? "sentence not found");
check("the limit in force is $50,000", inForce === 50_000, String(inForce));

// ---- the code
check("ONTARIO_SMALL_CLAIMS_LIMIT is the regulation's figure", ONTARIO_SMALL_CLAIMS_LIMIT === inForce, String(ONTARIO_SMALL_CLAIMS_LIMIT));
check("SMALL_CLAIMS_LIMIT is the regulation's figure", SMALL_CLAIMS_LIMIT === inForce, String(SMALL_CLAIMS_LIMIT));

// ---- nothing shipped carries the old limit
const OLD_LIMIT = /\$\s?35,000|\b35,000\b|\b35000\b|\b35_000\b|\b35k\b/i;
const SHIPPED_EXT = /\.(ts|tsx|js|mjs|json|md|txt|css)$/;
function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SHIPPED_EXT.test(name)) out.push(full);
  }
}
const files: string[] = [];
for (const dir of ["src", "app"]) walk(path.join(ROOT, dir), files);
const hits: string[] = [];
for (const file of files) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (OLD_LIMIT.test(line)) hits.push(`${path.relative(ROOT, file)}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
}
check(`no file under src/ or app/ mentions the old $35,000 limit (${files.length} files read)`, files.length > 100 && hits.length === 0, hits.join("\n      "));

// ---- the withheld stale wording is still really there (an entry for a page that changed is dead)
type Entry = { sourceId: string; phrase?: string; sentence?: string };
const superseded = JSON.parse(readFileSync(path.join(ROOT, "docs/sources/corpus/superseded.json"), "utf8")) as { entries: Entry[] };
const manifest = JSON.parse(readFileSync(path.join(ROOT, "docs/sources/corpus/manifest.json"), "utf8")) as {
  entries: { id: string; file?: string }[];
};
const dead: string[] = [];
for (const entry of superseded.entries) {
  const found = manifest.entries.find((candidate) => candidate.id === entry.sourceId);
  const text = found ? flat(readFileSync(path.join(ROOT, "docs/sources/corpus", found.file ?? `${entry.sourceId}.txt`), "utf8")) : "";
  const wording = flat(entry.sentence ?? entry.phrase ?? "").trim();
  if (!wording || (!entry.sentence === !entry.phrase)) dead.push(`${entry.sourceId}: needs exactly one of phrase or sentence`);
  else if (!text.includes(wording)) dead.push(`${entry.sourceId}: "${wording.slice(0, 60)}" is not in the saved copy`);
}
check("every superseded entry names wording still in its saved source", dead.length === 0, dead.join("\n      "));

console.log("");
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`);
process.exitCode = failures === 0 ? 0 : 1;
