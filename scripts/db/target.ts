/**
 * Which project am I about to touch, and is it the one I meant?
 *
 *   npm run db:staging            what staging is, and what is pending on it
 *   npm run db:prod               the same for production. Read-only without --confirm
 *   npm run db:prod -- --confirm  permits a write command against production
 *
 * *** WHY THIS EXISTS ***
 *
 * `supabase db push` acts on whatever the CLI happens to be linked to, and the
 * link is a single file with a ref in it that nothing prints. On this machine it
 * was linked to `fddlpnibovkkkgboabqb` — PRODUCTION — and had been for as long as
 * anyone had been running commands.
 *
 * So this prints the target before anything happens, resolves it by REF from
 * `supabase/environments.json`, and refuses if the CLI's link does not match the
 * environment named on the command line. Two things have to agree before a
 * production command runs: what you asked for, and what the CLI is pointed at.
 *
 * *** WHAT IT DOES NOT DO ***
 *
 * It does not apply migrations. `npm run db:migrate` does that, and it enforces
 * staging-before-production with a committed ledger. This is the thing you run
 * first to find out where you are.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const ENVIRONMENTS_FILE = path.join(ROOT, "supabase", "environments.json");
const LINK_FILE = path.join(ROOT, "supabase", ".temp", "project-ref");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");

type Environment = {
  ref: string;
  currentName: string;
  intendedName: string;
  region: string;
  status: string;
  notes?: string[];
};

type EnvironmentsFile = {
  renameComplete: boolean;
  environments: Record<"staging" | "production", Environment>;
};

function environments(): EnvironmentsFile {
  return JSON.parse(readFileSync(ENVIRONMENTS_FILE, "utf8")) as EnvironmentsFile;
}

/** The ref the Supabase CLI would act on right now, or null if unlinked. */
export function linkedRef(): string | null {
  if (!existsSync(LINK_FILE)) return null;
  const ref = readFileSync(LINK_FILE, "utf8").trim();
  return ref.length > 0 ? ref : null;
}

function localMigrations(): string[] {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith(".sql")).sort();
}

function main(): void {
  const args = process.argv.slice(2);
  const wanted = args.find((arg) => arg === "staging" || arg === "production");
  const confirmed = args.includes("--confirm");

  if (!wanted) {
    console.error("Usage: npm run db:staging | npm run db:prod [-- --confirm]");
    process.exitCode = 1;
    return;
  }

  const file = environments();
  const target = file.environments[wanted as "staging" | "production"];
  const other = wanted === "staging" ? file.environments.production : file.environments.staging;
  const linked = linkedRef();

  console.log("");
  console.log(`TARGET: ${wanted.toUpperCase()}`);
  console.log(`  ref          ${target.ref}`);
  console.log(`  named        ${target.currentName}${file.renameComplete ? "" : `  (to become ${target.intendedName})`}`);
  console.log(`  region       ${target.region}`);
  console.log(`  CLI linked   ${linked ?? "(not linked)"}`);
  console.log("");

  if (!file.renameComplete) {
    console.log("  NOTE: the projects are still named backwards. The one called");
    console.log(`  "${file.environments.production.currentName}" is PRODUCTION. Judge by ref.`);
    console.log("");
  }

  /*
   * The link must agree with what was asked for. Printing the target is not
   * enough on its own — the failure being prevented is somebody running a push
   * believing they are on staging, and a line of output does not stop that.
   */
  if (linked !== target.ref) {
    console.error(`REFUSING: the CLI is linked to ${linked ?? "nothing"}, not to ${wanted}.`);
    console.error("");
    console.error("  Link it first:");
    console.error(`    npx supabase link --project-ref ${target.ref}`);
    console.error("");
    process.exitCode = 1;
    return;
  }

  if (wanted === "production" && !confirmed) {
    console.log("READ-ONLY. This is production; --confirm is required for anything else.");
    console.log("");
    console.log("  npm run db:prod -- --confirm");
    console.log("");
  }

  console.log(`Local migration files (${localMigrations().length}):`);
  for (const file of localMigrations()) console.log(`  ${file}`);
  console.log("");
  console.log("What is actually applied there:");
  console.log("  npx supabase migration list");
  console.log("");
  console.log(`The other project is ${other.ref} (${other.currentName}, ${other.region}).`);
  console.log("");
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
