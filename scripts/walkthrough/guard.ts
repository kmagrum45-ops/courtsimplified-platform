/**
 * Stops the page walkthrough before it touches a production database.
 *
 * The walkthrough signs up a harness user through Supabase auth. That must
 * never happen on production (CLAUDE.md §6), so the workflow runs this first:
 * it prints the project ref the run would use (a ref is public; keys are never
 * read here) and exits non-zero on production.
 *
 * Run: node --import tsx scripts/walkthrough/guard.ts
 */
import { assertNotProduction } from "../db/assertNotProduction";

assertNotProduction("walkthrough");
