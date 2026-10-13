/**
 * Every module is reachable from something a user can actually load, or it is
 * listed here as dormant WITH A REASON.
 *
 * COSTS NOTHING. Reads the import graph off disk. No network, no AI.
 *
 * WHY THIS EXISTS. Every significant defect found over two days was the same
 * shape — built correctly, unreachable in practice:
 *
 *   - four API endpoints with no caller
 *   - two persisted fields read by code nothing writes
 *   - a candidate surface reading a key no write path sets
 *   - a mount condition that hid a whole feature after reload
 *   - a sourced content path that had never run once
 *   - family safety content whose only importer was its own check
 *
 * Sixty-odd verification suites and not one of them asked whether a built
 * thing can be reached. They all test logic, and logic is perfectly testable
 * in code nobody runs — which is exactly how `family/statusTriage.ts` came to
 * have a passing, mutation-covered suite and zero users.
 *
 * WHAT "REACHABLE" MEANS HERE. Reachable by following imports from something
 * Next actually serves: a page, a layout, an API route, or middleware.
 * Verification scripts are deliberately NOT roots. A module imported only by
 * its own check is the precise failure this exists to catch, and treating
 * checks as roots would make the whole thing vacuous.
 *
 * WHY THE GRAPH IS TRANSITIVE. A one-level "does anything import this" check
 * misses a DEAD PAIR: two modules that import each other but which nothing
 * outside them reaches. `formKnowledgeBase` <-> `formTriggerEngine` is exactly
 * that, and a one-level check reports formKnowledgeBase as alive.
 *
 * Run: node --import tsx scripts/verification/verifyReachability.ts
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Modules that are unreachable ON PURPOSE.
 *
 * A reason is required, not optional, and it is enforced below: an entry with
 * an empty or placeholder reason fails the suite. A bare allow-list degrades
 * into a place to silence this check, which would make it worse than nothing —
 * the same failure as a stale check that everyone learns to ignore.
 *
 * Adding an entry here is a claim that someone decided this module should not
 * run. If nobody decided that, it belongs in the product or in the bin.
 */
type DormantEntry = { file: string; reason: string };

const DELIBERATELY_DORMANT: DormantEntry[] = [
  // childSupportFlaPath.ts came off this list on 2026-09-14: ChildSupportTableCard
  // imports it and the card is mounted on the family path in app/builder/page.tsx.
  // A one-line deletion with an obvious cause, which is what a maintained
  // dormant list is supposed to cost.
  // childSupportDraftEngine.ts came off this list on 2026-09-14, one commit
  // after going on it: ChildSupportIntake.tsx imports it and is mounted on the
  // family path. That round trip is the check working as intended — the entry
  // named the screen that would connect it, and deleting the entry is what
  // proved the screen actually did.
  {
    file: "src/lib/case-system/sources/statutoryProvisions.ts",
    reason:
      "Build-time governance, not runtime product. provisionsWithPendingReplacement() and " +
      "daysSinceLastChecked() exist so verifyCitedProvisions can FAIL when a vendored provision's " +
      "pending replacement goes unchecked for 90 days. It has no user-facing role by design, and " +
      "wiring it into a page would be the mistake.",
  },

  // ---- The 13 "unreachable and NOT deliberate" modules were DELETED 2026-10-04 ----
  //
  // aiIntakeNormalizer + smallClaimsEngine, formTriggerEngine, both
  // evidence-packaging files, documentExportEngine, documentsStatusEngine,
  // factPatternAnaysisEngine, scenarioEngine + scenarioConfidenceEngine,
  // proceduralRules, registry + defaults. Each was a superseded duplicate or a
  // dead pair (reasons in git history of this file); site owner, 2026-10-04:
  // "its only files we are useing or will use eventually". A file deleted
  // without its entry would still pass the stale check below, so a separate
  // check now fails on an entry whose file no longer exists.
  /*
   * The deadline engine and its holiday calendars WERE here, with a reason that
   * twice said the next part would wire them up. Decision 5 did: the engine is
   * called by src/lib/content-library/computedDeadline.ts, which stageAnswerView
   * calls, which the resolve-stage route calls. Deleted rather than reworded,
   * which is what this check exists to force.
   */
];

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

function walk(dir: string, into: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, into);
    else if (/\.tsx?$/.test(entry.name)) into.push(full.split(path.sep).join("/"));
  }
}

function buildGraph() {
  const appFiles: string[] = [];
  walk("app", appFiles);

  const srcFiles: string[] = [];
  walk("src", srcFiles);

  const all = new Set([...appFiles, ...srcFiles, "middleware.ts"]);

  const resolve = (from: string, spec: string): string | null => {
    if (!spec.startsWith(".") && !spec.startsWith("@/")) return null;
    const base = spec.startsWith("@/")
      ? spec.slice(2)
      : path.posix.join(path.posix.dirname(from), spec);
    for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`, base]) {
      if (all.has(candidate)) return candidate;
    }
    return null;
  };

  const imports = new Map<string, string[]>();
  for (const file of all) {
    let source = "";
    try {
      source = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const specs = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
    imports.set(file, specs.map((spec) => resolve(file, spec)).filter((x): x is string => Boolean(x)));
  }

  // Roots: everything Next serves. NOT scripts/.
  const roots = [...appFiles, "middleware.ts"].filter((f) => all.has(f));

  const seen = new Set<string>();
  const stack = [...roots];
  while (stack.length) {
    const file = stack.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const dep of imports.get(file) || []) stack.push(dep);
  }

  return { srcFiles, reachable: seen };
}

function main(): void {
  // ---- The dormant list is a list of DECISIONS, not names ----

  const PLACEHOLDER = /^(tbd|todo|n\/a|none|\?+|-+)?$/i;
  for (const entry of DELIBERATELY_DORMANT) {
    check(
      `dormant entry has a real reason: ${entry.file}`,
      entry.reason.trim().length >= 40 && !PLACEHOLDER.test(entry.reason.trim()),
      "a name on a list is not a decision; say why it does not run",
    );
  }

  const seenFiles = new Set<string>();
  const duplicates = DELIBERATELY_DORMANT.filter((e) => {
    if (seenFiles.has(e.file)) return true;
    seenFiles.add(e.file);
    return false;
  });
  check("no duplicate dormant entries", duplicates.length === 0, duplicates.map((d) => d.file).join(", "));

  const missing = DELIBERATELY_DORMANT.filter((e) => !existsSync(e.file));
  check(
    "every dormant entry names a file that exists",
    missing.length === 0,
    missing.length ? `deleted, remove the entry:\n      ${missing.map((m) => m.file).join("\n      ")}` : undefined,
  );

  const { srcFiles, reachable } = buildGraph();

  const unreachable = srcFiles
    .filter((f) => f.includes("case-system"))
    .filter((f) => !reachable.has(f));

  const dormant = new Set(DELIBERATELY_DORMANT.map((e) => e.file));

  // ---- The check itself ----

  const undeclared = unreachable.filter((f) => !dormant.has(f));
  check(
    "no module is unreachable without being declared dormant",
    undeclared.length === 0,
    undeclared.length
      ? `${undeclared.length} new unreachable module(s):\n      ` +
        undeclared.join("\n      ") +
        "\n      Wire it to a page or route, or add it to DELIBERATELY_DORMANT with a reason."
      : undefined,
  );

  // The list must not rot in the other direction either: an entry that has
  // since been wired is a stale claim, and stale checks are how a suite stops
  // being read.
  const staleDormant = [...dormant].filter((f) => reachable.has(f));
  check(
    "no dormant entry has quietly become reachable",
    staleDormant.length === 0,
    staleDormant.length ? `now reachable, remove from the list:\n      ${staleDormant.join("\n      ")}` : undefined,
  );

  // ---- The one that proves the graph works ----
  //
  // If the traversal broke and marked everything reachable, every check above
  // would pass silently. These two assert the graph still discriminates.

  check(
    "the graph finds a known-live module reachable",
    reachable.has("src/lib/case-system/intake/claimTypes.ts"),
    "claimTypes is imported by the overview panel; if this fails the traversal is broken",
  );
  check(
    "the graph still reports the seeded dormant set as unreachable",
    unreachable.length > 0,
    "zero unreachable modules means the traversal marked everything live",
  );

  console.log(
    `\n${unreachable.length} unreachable, ${DELIBERATELY_DORMANT.length} declared dormant, ` +
      `${srcFiles.filter((f) => f.includes("case-system")).length} case-system modules total.`,
  );
  console.log(`${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
