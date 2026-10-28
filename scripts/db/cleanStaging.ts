/**
 * Delete leftover browser-harness accounts from STAGING (scripts/db/harnessAccounts.ts says which).
 *
 *   npm run db:clean-staging              dry run: counts only, nothing deleted
 *   npm run db:clean-staging -- --confirm deletes them, with their cases and files
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local, which on the site
 * owner's machine points at staging. Refuses unless that address is staging's; refuses the
 * production address outright. Prints counts only, never an email, an id or a key.
 *
 * Afterwards the database keeps the freed space for itself; the usage figure drops only after
 * `VACUUM FULL` on the large tables, which the site owner runs in staging's SQL editor.
 */
import { cleanLeftoverHarnessAccounts, describe, refusalFor } from "./harnessAccounts";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const refusal = refusalFor(url);
  if (refusal) {
    console.error(refusal);
    process.exit(1);
  }
  const confirm = process.argv.includes("--confirm");
  console.log(`Target: STAGING (icpvzwxyjsdgyqfkwycw)${confirm ? "" : " -- dry run"}`);
  const report = await cleanLeftoverHarnessAccounts({ url, serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY, confirm });
  for (const line of describe(report)) console.log(line);
  if (report.failed) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "The cleanup stopped.");
  process.exit(1);
});
