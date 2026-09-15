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

import { readdirSync, readFileSync } from "node:fs";
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
  {
    file: "src/lib/case-system/family/childSupportDraftEngine.ts",
    reason:
      "IN PROGRESS, not abandoned. The Family Law Act s. 33 child support draft engine, built " +
      "and mutation-covered on 2026-09-14 (npm run test:child-support-draft). The screen that " +
      "collects the two income figures and the s. 7 expenses is the next step and is being " +
      "reported before it is built. If this is still dormant once that screen lands, the engine " +
      "was built and never connected — which is the failure this whole check exists to catch.",
  },
  {
    file: "src/lib/case-system/sources/statutoryProvisions.ts",
    reason:
      "Build-time governance, not runtime product. provisionsWithPendingReplacement() and " +
      "daysSinceLastChecked() exist so verifyCitedProvisions can FAIL when a vendored provision's " +
      "pending replacement goes unchecked for 90 days. It has no user-facing role by design, and " +
      "wiring it into a page would be the mistake.",
  },

  // ---- Unreachable and NOT deliberate. Seeded so the baseline is explicit. ----
  //
  // Everything below is a real finding recorded in OUTSTANDING_ISSUES, listed
  // here so the check passes today and fails the moment a NEW module joins the
  // set. Each reason states what it would take to resolve it. They are not
  // endorsements.
  {
    file: "src/lib/case-system/aiIntakeNormalizer.ts",
    reason: "Dead pair with smallClaimsEngine — its only importer is that module, which is itself unreachable.",
  },
  {
    file: "src/lib/case-system/smallClaimsEngine.ts",
    reason:
      "Other half of the aiIntakeNormalizer dead pair. The live Small Claims path is " +
      "smallClaimsIntelligenceEngine via /api/small-claims/analyze; this is a separate, older " +
      "engine that nothing routes to. Deleting one of the pair without the other leaves the " +
      "same problem with fewer lines, so they go together or not at all.",
  },
  { file: "src/lib/case-system/formKnowledgeBase.ts", reason: "Dead pair with formTriggerEngine. Also blocked on sourcing — see OUTSTANDING_ISSUES section 26." },
  { file: "src/lib/case-system/formTriggerEngine.ts", reason: "Dead pair with formKnowledgeBase; no external importer." },
  { file: "src/lib/case-system/evidence-packaging/evidencePackagingEngine.ts", reason: "Dead pair with evidencePackagingArchitecture." },
  {
    file: "src/lib/case-system/evidence-packaging/evidencePackagingArchitecture.ts",
    reason:
      "Types and shapes for evidencePackagingEngine, which is itself unreachable — a dead pair " +
      "where neither half has an external importer. The live evidence path is evidenceEngine plus " +
      "the /evidence page, which do not use either of them.",
  },
  {
    file: "src/lib/case-system/documentExportEngine.ts",
    reason:
      "769 lines including its own calculateReadinessScore (content*55 + locked*35). The live " +
      "export is app/api/document-export/route.ts, which has its own section builder and does " +
      "not import this. A second export implementation carrying a score the other one had " +
      "removed.",
  },
  {
    file: "src/lib/case-system/documentsStatusEngine.ts",
    reason:
      "Derives a DocumentStatus from form labels. Nothing imports it; the live forms surface " +
      "reads courtSimplifiedArchitecture and masterCase instead. Either a replaced engine or one " +
      "built ahead of a screen that never landed — the history does not say which.",
  },
  {
    file: "src/lib/case-system/facts/factPatternAnaysisEngine.ts",
    reason:
      "Fact-pattern analysis, unreachable. The brain builds its own buildFactPatternAnalysis " +
      "instead, so this is a duplicate implementation rather than a missing wire. The filename " +
      "is misspelled (Anaysis), which usually means nothing ever imported it by name.",
  },
  {
    file: "src/lib/case-system/scenarioEngine.ts",
    reason:
      "Classifies a story into a scenario and grades evidenceReadiness strong/partial/weak. " +
      "Unreachable, and the grading would need removing under section 3 before it could be " +
      "wired — so wiring it is not a one-line change even if someone wants it back.",
  },
  {
    file: "src/lib/case-system/scenarioConfidenceEngine.ts",
    reason:
      "Dead pair with scenarioEngine — it imports ScenarioResult from it and nothing imports " +
      "either. Same section 3 caveat: it exists to score a scenario, so it cannot be revived " +
      "as-is.",
  },
  {
    file: "src/lib/case-system/proceduralRules.ts",
    reason:
      "Form-validation rules per court path, unreachable. The live procedural authority comes " +
      "from the database-backed legal_form_mapping_rules and the ProcedureAuthorityDisplay " +
      "path, which this predates and does not feed.",
  },
  {
    file: "src/lib/case-system/registry.ts",
    reason:
      "Dead pair with defaults.ts — it is the only importer of createDefaultCase, and nothing " +
      "imports it. Also references ./types/family-case.ts with an explicit .ts extension, which " +
      "suggests it was never compiled as part of a working path.",
  },
  {
    file: "src/lib/case-system/defaults.ts",
    reason:
      "Other half of the registry.ts dead pair. Builds an empty Ontario family case bundle that " +
      "no live family path uses — FamilyIntake posts to /api/family/analyze instead.",
  },
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
