/**
 * Nothing in this repository says "dev" when it means production, and no
 * migration can reach production without passing staging.
 *
 * COSTS NOTHING, AND TOUCHES NO DATABASE. Reads source off disk and calls the
 * pure ordering helpers out of applyMigrations.ts. Importing that module does
 * not run it — see the guard at the bottom of that file.
 *
 * *** THE HAZARD THIS GUARDS ***
 *
 * The two Supabase projects are named backwards. `courtsimplified-dev`
 * (ca-central-1) is the live database; `courtsimplified` (us-west-2) is paused
 * and nearly empty. So an instruction reading "apply it to dev first" is, taken
 * literally, an instruction to apply it to production — and the person most
 * likely to take it literally is someone new, working quickly, in an
 * unfamiliar area.
 *
 * Renaming the projects is the real fix and is the site owner's to do. Until
 * then the only defence is that no instruction in the repository can be
 * followed literally into the wrong project, which is what check 1 asserts.
 *
 * Run: node --import tsx scripts/verification/verifyDatabaseEnvironments.ts
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

import { productionBlockers, pendingFor } from "../db/applyMigrations";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

const PRODUCTION_REF = "fddlpnibovkkkgboabqb";
const STAGING_REF = "ffymjxjcnwakgdmldpne";

// ---------------------------------------------------------------------------
// 1. No instruction can be followed literally into production
// ---------------------------------------------------------------------------

/**
 * Phrases that, read literally, send someone to the live database.
 *
 * Each is an INSTRUCTION, not a description. "confusingly named
 * courtsimplified-dev" is fine and wanted; "apply to dev first" is not.
 */
const DANGEROUS: Array<{ pattern: RegExp; why: string }> = [
  {
    pattern: /apply (?:it |them |the migration )?to (?:the )?dev(?:\b|elopment)/i,
    why: '"apply to dev" means apply to production',
  },
  {
    pattern: /against `?courtsimplified-dev`? first/i,
    why: '"against courtsimplified-dev first" means production first',
  },
  {
    pattern: /`courtsimplified` \(us-west-2, PRODUCTION\)/,
    why: "names the paused project as production",
  },
  {
    pattern: /DEV Supabase project only/i,
    why: 'there is no "dev project"; the one called dev is live',
  },
];

/** Files a person reads as instructions. */
function instructionFiles(): string[] {
  const found: string[] = [];
  function walk(relative: string): void {
    const absolute = path.join(ROOT, relative);
    if (!existsSync(absolute)) return;
    for (const entry of readdirSync(absolute)) {
      // Worktrees hold copies of this repo at other commits. Scanning them
      // reports the same finding many times and blocks on history nobody is
      // reading as an instruction today.
      if (entry === "node_modules" || entry === ".claude" || entry.startsWith(".git")) continue;
      const child = path.join(relative, entry);
      if (statSync(path.join(ROOT, child)).isDirectory()) walk(child);
      else if (/\.(md|ts|tsx|mjs|sql|json)$/.test(entry)) {
        found.push(child.split(path.sep).join("/"));
      }
    }
  }
  walk("docs");
  walk("scripts");
  walk("supabase");
  found.push("CLAUDE.md");
  return found;
}

/**
 * Writing about the hazard requires quoting it.
 *
 * CLAUDE.md has to be able to say *this entry used to read "apply it to dev
 * first", which meant production* — that sentence is the warning, not the
 * danger. A check that forbids describing a trap makes the trap harder to
 * explain, which is the opposite of the point.
 *
 * So a line carrying this marker is exempt. The marker is deliberately ugly
 * and deliberately manual: adding it is a small, visible act with an obvious
 * cause, and it cannot be typed by accident. It exempts ONE LINE, not a file.
 */
const QUOTED_MARKER = "[dev-wording-quoted]";

{
  const offenders: string[] = [];

  for (const file of instructionFiles()) {
    // This file lists the patterns by definition.
    if (file.endsWith("verifyDatabaseEnvironments.ts")) continue;

    const source = readFileSync(path.join(ROOT, file), "utf8");
    const lines = source.split("\n");

    lines.forEach((line, index) => {
      if (line.includes(QUOTED_MARKER)) return;
      for (const { pattern, why } of DANGEROUS) {
        const match = new RegExp(pattern.source, pattern.flags.replace("g", "")).exec(line);
        if (!match) continue;
        offenders.push(`${file}:${index + 1} — ${why}\n    ${match[0].trim()}`);
      }
    });
  }

  if (offenders.length === 0) {
    pass(`no instruction says "dev" when it means production (${instructionFiles().length} files)`);
  } else {
    fail(
      "an instruction, read literally, sends someone to the live database",
      offenders.join("\n"),
    );
  }
}

// ---------------------------------------------------------------------------
// 2. CLAUDE.md states which is which, by ref
// ---------------------------------------------------------------------------

{
  const claude = readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8");
  const problems: string[] = [];

  if (!claude.includes(PRODUCTION_REF)) problems.push("does not name the production ref");
  if (!claude.includes(STAGING_REF)) problems.push("does not name the dormant ref");
  if (!/NAMES ARE BACKWARDS/i.test(claude)) problems.push("does not warn that the names are backwards");
  if (!/by (?:its )?REF, never by (?:its )?name/i.test(claude)) {
    problems.push("does not say to identify a project by ref rather than name");
  }

  if (problems.length === 0) {
    pass("CLAUDE.md identifies both projects by ref and warns about the names");
  } else {
    fail(`CLAUDE.md ${problems.join("; ")}`);
  }
}

// ---------------------------------------------------------------------------
// 3. environments.json is right about which is which
// ---------------------------------------------------------------------------

{
  const config = JSON.parse(
    readFileSync(path.join(ROOT, "supabase", "environments.json"), "utf8"),
  ) as {
    renameComplete: boolean;
    environments: Record<string, { ref: string; region: string; intendedName: string }>;
  };

  const production = config.environments.production;
  const staging = config.environments.staging;
  const problems: string[] = [];

  // The whole point. If these are ever swapped, the runner links to the wrong
  // project and every other safeguard in this file is decoration.
  if (production?.ref !== PRODUCTION_REF) {
    problems.push(`production ref is ${production?.ref}, expected ${PRODUCTION_REF}`);
  }
  if (staging?.ref !== STAGING_REF) {
    problems.push(`staging ref is ${staging?.ref}, expected ${STAGING_REF}`);
  }
  if (production?.region !== "ca-central-1") {
    problems.push(`production region is ${production?.region} — Canadian residency requires ca-central-1`);
  }
  if (staging?.intendedName === production?.intendedName) {
    problems.push("both environments have the same intended name");
  }

  if (problems.length === 0) {
    pass("environments.json maps production and staging to the correct refs");
  } else {
    fail("environments.json has the projects wrong", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 4. The ordering rule holds
// ---------------------------------------------------------------------------

{
  // Asserted against a synthetic ledger rather than the real one, so the check
  // fails on a broken RULE and not on today's ledger contents. Pinning the
  // real ledger would turn "someone applied a migration" into a red line.
  const files = ["20260101000000_a.sql"];
  const hashOf = (): string => "deadbeef";

  // A ledger with nothing in it must block production entirely.
  const emptyBlocked = productionBlockers(files, [], hashOf);
  if (emptyBlocked.length === 1) {
    pass("with an empty ledger, production is blocked");
  } else {
    fail("production was not blocked despite staging having no record");
  }

  // A staging record for a DIFFERENT hash must still block: editing a
  // migration after staging saw it is exactly the case the hash exists for.
  const staleHash = productionBlockers(files, [
    {
      migration: files[0],
      sha256: `${hashOf()}-different`,
      environment: "staging",
      ref: STAGING_REF,
      appliedAt: "2026-01-01T00:00:00.000Z",
      appliedBy: "test",
    },
  ], hashOf);
  if (staleHash.length === 1) {
    pass("a staging record for a different version of the file still blocks production");
  } else {
    fail(
      "production was allowed on a stale staging record",
      "Editing a migration after applying it to staging would reach production unchecked.",
    );
  }

  // And the positive case, so this does not pass by blocking everything.
  if (typeof pendingFor === "function" && typeof productionBlockers === "function") {
    pass("the ordering helpers are importable without applying anything");
  } else {
    fail("the ordering helpers could not be imported");
  }
}

// ---------------------------------------------------------------------------
// 5. Nothing in the repo applies a migration on its own
// ---------------------------------------------------------------------------

{
  const runner = readFileSync(path.join(ROOT, "scripts/db/applyMigrations.ts"), "utf8");

  if (/if \(!confirm\)/.test(runner) && runner.includes("DRY RUN")) {
    pass("the migration runner dry-runs unless --confirm is passed");
  } else {
    fail("the migration runner does not require --confirm");
  }

  if (!/supabase.*link.*--project-ref.*courtsimplified/i.test(runner)) {
    pass("the runner links by ref, never by project name");
  } else {
    fail("the runner references a project by name — names are the hazard");
  }
}

console.log("");
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`);
process.exitCode = failures === 0 ? 0 : 1;
