/**
 * Back up a Supabase project to ../courtsimplified-backups/, and REFUSE to call
 * it a backup unless every file has content.
 *
 *   npm run db:backup -- --env production
 *   npm run db:backup -- --env staging
 *
 * WHY (2026-09-30). CLAUDE.md requires a backup before any change to
 * production, and production has no automatic backups (free plan). Until now
 * that backup was several hand-typed commands, and on 2026-09-26 the first
 * attempt wrote an EMPTY file and reported success: `supabase db dump` runs
 * pg_dump inside Docker, and with Docker Desktop closed it writes 0 bytes and
 * says "Dumped schema to ...". This does the same three dumps as that day
 * (schema, data, auth data), resolves the project by REF from
 * supabase/environments.json, never by name, and exits non-zero if any file is
 * empty.
 *
 * It needs the Supabase CLI login and database password that live on the
 * site owner's computer. It never prints, stores or asks for a secret itself;
 * the CLI prompts for the password in the terminal if it needs it.
 *
 * A SQL dump does not contain uploaded file bytes (storage objects), only
 * their rows. See docs/infra/projects.md.
 */
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const envArg = process.argv[process.argv.indexOf("--env") + 1];
if (envArg !== "production" && envArg !== "staging") {
  console.error("Say which project: npm run db:backup -- --env production (or staging)");
  process.exit(1);
}

const environments = JSON.parse(readFileSync(path.join(ROOT, "supabase", "environments.json"), "utf8")) as {
  environments: Record<string, { ref: string; currentName: string }>;
};
const target = environments.environments[envArg];
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const outDir = path.resolve(ROOT, "..", "courtsimplified-backups", `${envArg}-${target.ref}-${stamp}`);

console.log(`Backing up ${envArg.toUpperCase()} (${target.ref}, ${target.currentName}) to ${outDir}`);
mkdirSync(outDir, { recursive: true });

function run(args: string[]): boolean {
  const result = spawnSync("npx", ["supabase", ...args], { stdio: "inherit", shell: true });
  return result.status === 0;
}

if (!run(["link", "--project-ref", target.ref])) {
  console.error("\nCould not link to the project. Nothing was backed up.");
  process.exit(1);
}

const files = [
  { name: "schema.sql", args: ["db", "dump", "--linked", "-f"] },
  { name: "data.sql", args: ["db", "dump", "--linked", "--data-only", "-f"] },
  { name: "auth-data.sql", args: ["db", "dump", "--linked", "--data-only", "--schema", "auth", "-f"] },
];

let ok = true;
for (const file of files) {
  const full = path.join(outDir, file.name);
  const ran = run([...file.args, `"${full}"`]);
  const size = existsSync(full) ? statSync(full).size : 0;
  console.log(`  ${file.name}: ${size.toLocaleString("en-CA")} bytes${ran ? "" : " (the dump command reported an error)"}`);
  if (!ran || size === 0) ok = false;
}

if (!ok) {
  console.error(
    "\nBACKUP FAILED: at least one file is empty or the dump errored. This is usually Docker Desktop not " +
      "running -- open it, wait until it says it is running, and run this again. Do NOT change the database.",
  );
  process.exit(1);
}

console.log("\nBackup complete and every file has content. It is safe to go ahead.");
