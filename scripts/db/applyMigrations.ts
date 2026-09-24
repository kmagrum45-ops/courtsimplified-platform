/**
 * Apply migrations to staging, then to production. In that order, enforced.
 *
 * *** THIS SCRIPT HAS NEVER BEEN RUN AGAINST ANY DATABASE. ***
 *
 * It was written so that when the site owner applies a migration, the ordering
 * is enforced by a tool rather than by memory. Everything below has been
 * exercised only in its refusal paths, which are the paths that run without a
 * network.
 *
 * *** WHY IT EXISTS ***
 *
 * There was no way to test a migration that was not production. The two
 * Supabase projects are named backwards — the one called `courtsimplified-dev`
 * is the live database, and the one called `courtsimplified` is paused — so
 * every instruction of the form "apply it to dev first" [dev-wording-quoted] was, read literally,
 * an instruction to apply it to production.
 *
 * Renaming the projects fixes the words. This fixes the procedure: a project is
 * resolved by REF, never by name, and production refuses until staging has had
 * the same migration.
 *
 * *** WHAT IT WILL NOT DO ***
 *
 *   - Resolve a project by name. Names are the hazard.
 *   - Run anything without `--confirm`. Without it you get a dry run that
 *     prints exactly what would happen.
 *   - Touch production before the same migration has been recorded against
 *     staging, unless `--skip-staging` is passed with a reason. The escape
 *     hatch exists because staging is currently PAUSED and may stay that way
 *     for a while; requiring a written reason means the exception is a
 *     decision someone made, not a flag someone found.
 *
 * Usage:
 *   npm run db:migrate -- --env staging
 *   npm run db:migrate -- --env staging --confirm
 *   npm run db:migrate -- --env production --confirm
 *   npm run db:migrate -- --env production --confirm --skip-staging "staging is paused; migration syntax-checked only"
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const ENVIRONMENTS_FILE = path.join(ROOT, "supabase", "environments.json");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");

/**
 * What has been applied where.
 *
 * Committed, deliberately. The whole point is that the next person — or the
 * next session — can see whether staging has had a migration without asking
 * anyone. A record kept only on one machine answers nothing.
 */
const LEDGER_FILE = path.join(ROOT, "supabase", "applied-migrations.json");

type Environment = {
  ref: string;
  currentName: string;
  intendedName: string;
  region: string;
  status: string;
  notes: string[];
};

type EnvironmentsFile = {
  renameComplete: boolean;
  environments: Record<"staging" | "production", Environment>;
};

type LedgerEntry = {
  migration: string;
  sha256: string;
  environment: "staging" | "production";
  ref: string;
  appliedAt: string;
  appliedBy: string;
  skippedStagingReason?: string;
};

function loadEnvironments(): EnvironmentsFile {
  return JSON.parse(readFileSync(ENVIRONMENTS_FILE, "utf8")) as EnvironmentsFile;
}

function loadLedger(): LedgerEntry[] {
  if (!existsSync(LEDGER_FILE)) return [];
  return JSON.parse(readFileSync(LEDGER_FILE, "utf8")) as LedgerEntry[];
}

function saveLedger(entries: LedgerEntry[]): void {
  writeFileSync(LEDGER_FILE, `${JSON.stringify(entries, null, 2)}\n`);
}

/** Every migration file, in the order Postgres will see them. */
export function migrationFiles(): string[] {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR)
    .filter((entry) => entry.endsWith(".sql"))
    .sort();
}

/**
 * The content hash of a migration.
 *
 * The ledger records this, not just the filename, so that editing a migration
 * after applying it to staging does not let the edited version through to
 * production on the strength of the old one's record.
 */
export function migrationHash(fileName: string): string {
  return createHash("sha256")
    .update(readFileSync(path.join(MIGRATIONS_DIR, fileName)))
    .digest("hex");
}

/**
 * Which migrations are not yet recorded as applied to this environment.
 *
 * Pure, and exported, so the ordering rule can be tested without a database.
 */
export function pendingFor(
  environment: "staging" | "production",
  ledger: readonly LedgerEntry[],
  files: readonly string[] = migrationFiles(),
  // Injected so the rule can be tested against synthetic file names. A test
  // that had to create real migration files to check the ordering would be
  // testing the filesystem.
  hashOf: (file: string) => string = migrationHash,
): string[] {
  return files.filter((file) => {
    const hash = hashOf(file);
    return !ledger.some(
      (entry) =>
        entry.environment === environment &&
        entry.migration === file &&
        entry.sha256 === hash,
    );
  });
}

/**
 * Whether a migration may go to production.
 *
 * THE ORDERING RULE, isolated and exported so a test can assert it directly
 * rather than by running the script.
 */
export function productionBlockers(
  files: readonly string[],
  ledger: readonly LedgerEntry[],
  hashOf: (file: string) => string = migrationHash,
): string[] {
  return files.filter((file) => {
    const hash = hashOf(file);
    return !ledger.some(
      (entry) =>
        entry.environment === "staging" &&
        entry.migration === file &&
        entry.sha256 === hash,
    );
  });
}

function arg(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) return null;
  const value = process.argv[index + 1];
  return value.startsWith("--") ? null : value;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function main(): void {
  const requested = arg("--env");
  if (requested !== "staging" && requested !== "production") {
    console.error("Usage: npm run db:migrate -- --env <staging|production> [--confirm]");
    console.error("");
    console.error("A project is chosen by REF from supabase/environments.json.");
    console.error("It is never chosen by name: the names are backwards.");
    process.exitCode = 1;
    return;
  }

  const config = loadEnvironments();
  const target = config.environments[requested];
  const ledger = loadLedger();
  const confirm = hasFlag("--confirm");

  console.log("");
  console.log(`TARGET       ${requested.toUpperCase()}`);
  console.log(`  ref        ${target.ref}`);
  console.log(`  named      ${target.currentName}   (intended: ${target.intendedName})`);
  console.log(`  region     ${target.region}`);
  console.log(`  status     ${target.status}`);
  for (const note of target.notes) console.log(`  note       ${note}`);
  console.log("");

  if (!config.renameComplete) {
    console.log("!! The projects have NOT been renamed yet.");
    console.log("!! The project named 'courtsimplified-dev' is PRODUCTION.");
    console.log("!! Instructions: docs/lso-fixes-report.md.");
    console.log("");
  }

  if (target.status === "PAUSED") {
    console.log(`!! ${requested} is PAUSED and will accept no connections.`);
    console.log("!! Restore it in the Supabase dashboard first.");
    console.log("");
  }

  const pending = pendingFor(requested, ledger);
  if (pending.length === 0) {
    console.log(`Nothing pending for ${requested}. All migrations are recorded as applied.`);
    return;
  }

  // "not recorded", NOT "not applied". The ledger starts empty, and five of
  // these were applied to production before it existed. Supabase itself tracks
  // what a project has actually had (supabase_migrations.schema_migrations),
  // and `db push` skips those -- so this list is what THIS TOOL cannot vouch
  // for, which is a different and more honest claim.
  console.log(`NOT RECORDED AS APPLIED (${pending.length}):`);
  for (const file of pending) console.log(`  ${file}  [${migrationHash(file).slice(0, 12)}]`);
  console.log("");

  if (requested === "production") {
    const blockers = productionBlockers(pending, ledger);
    const skipReason = arg("--skip-staging");

    if (blockers.length > 0 && !skipReason) {
      console.error("REFUSED. These have not been applied to staging:");
      for (const file of blockers) console.error(`  ${file}`);
      console.error("");
      console.error("Apply them to staging first:");
      console.error("  npm run db:migrate -- --env staging --confirm");
      console.error("");
      console.error("Staging is currently paused. If it is going to stay that way, say so");
      console.error("explicitly and the reason is recorded in the ledger:");
      console.error('  npm run db:migrate -- --env production --confirm --skip-staging "<reason>"');
      process.exitCode = 1;
      return;
    }

    if (blockers.length > 0 && skipReason) {
      console.log("STAGING SKIPPED, on the record:");
      console.log(`  ${skipReason}`);
      console.log("");
    }
  }

  if (!confirm) {
    console.log("DRY RUN. Nothing was sent anywhere. To apply, add --confirm.");
    console.log("");
    console.log("What --confirm would run:");
    console.log(`  npx supabase link --project-ref ${target.ref}`);
    console.log("  npx supabase db push");
    return;
  }

  console.log(`Linking to ${target.ref}…`);
  const link = spawnSync("npx", ["supabase", "link", "--project-ref", target.ref], {
    stdio: "inherit",
    shell: true,
  });
  if (link.status !== 0) {
    console.error("Link failed. Nothing was applied.");
    process.exitCode = 1;
    return;
  }

  console.log("Pushing…");
  const push = spawnSync("npx", ["supabase", "db", "push"], { stdio: "inherit", shell: true });
  if (push.status !== 0) {
    console.error("Push failed. The ledger was NOT updated — rerun after fixing.");
    process.exitCode = 1;
    return;
  }

  const skipReason = arg("--skip-staging");
  const appliedAt = new Date().toISOString();
  const appliedBy = process.env.USER || process.env.USERNAME || "unknown";

  saveLedger([
    ...ledger,
    ...pending.map((file): LedgerEntry => ({
      migration: file,
      sha256: migrationHash(file),
      environment: requested,
      ref: target.ref,
      appliedAt,
      appliedBy,
      ...(requested === "production" && skipReason
        ? { skippedStagingReason: skipReason }
        : {}),
    })),
  ]);

  console.log("");
  console.log(`Applied ${pending.length} migration(s) to ${requested}.`);
  console.log(`Recorded in ${path.relative(ROOT, LEDGER_FILE)} — commit it.`);
}

// Only run when invoked directly, so the exported helpers can be imported by
// the verification suite without applying anything.
if (process.argv[1] && process.argv[1].endsWith("applyMigrations.ts")) {
  main();
}
