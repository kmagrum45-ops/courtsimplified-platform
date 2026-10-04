/**
 * Stops the page walkthrough before it touches a production database.
 *
 * The walkthrough signs up a harness user through Supabase auth. That must
 * never happen on production (CLAUDE.md §6), so the workflow runs this first.
 * It reports the project REF the run would use as a GitHub annotation (a ref
 * is public and readable through the API; keys are never read here) and exits
 * non-zero on production.
 *
 * First run, 2026-10-04: refused. The repository's NEXT_PUBLIC_SUPABASE_URL
 * secret points at production, so the workflow reads STAGING_SUPABASE_* first.
 *
 * Run: node --import tsx scripts/walkthrough/guard.ts
 */
import { assertNotProduction, productionRef, refFromUrl } from "../db/assertNotProduction";

const ref = refFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? "none";
const inCi = process.env.GITHUB_ACTIONS === "true";

if (ref === productionRef()) {
  if (inCi) {
    console.log(
      `::error title=Walkthrough refused::The Supabase URL for this run is PRODUCTION (${ref}). ` +
        "Add the STAGING_SUPABASE_URL, STAGING_SUPABASE_PUBLISHABLE_KEY and STAGING_SUPABASE_SERVICE_ROLE_KEY repository secrets.",
    );
  }
} else if (inCi) {
  console.log(`::notice title=Walkthrough database::Supabase project ref ${ref}`);
}

assertNotProduction("walkthrough");
