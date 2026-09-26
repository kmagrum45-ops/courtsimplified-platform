/**
 * Refuses to run a test, eval or fixture against the production database.
 *
 * *** WHY A SECOND GUARD, WHEN THE AUDIT LOG ALREADY HAS ONE ***
 *
 * `aiCallLog` already routes every audit row to a local file unless it is inside
 * the Next.js server, so no test run writes audit rows to production. That guard
 * covers one table.
 *
 * This one covers the connection. A fixture run signs in, reads the form
 * catalogue, creates a case, and writes intake rows — none of which goes through
 * the audit log. On this machine `.env.local` pointed at
 * `fddlpnibovkkkgboabqb`, which is PRODUCTION, so every fixture run was
 * exercising the real pipeline against the real users' database.
 *
 * *** THE REF IS THE TEST, NEVER THE NAME ***
 *
 * The projects are named backwards: the one called `courtsimplified-dev` is the
 * live one. Any check that compared names would pass on production and fail on
 * staging. So this compares the ref in `NEXT_PUBLIC_SUPABASE_URL` against the
 * production ref recorded in `supabase/environments.json`.
 *
 * *** THE ESCAPE HATCH IS DELIBERATE, AND IT IS LOUD ***
 *
 * `ALLOW_PROD_DB` must carry a REASON, not just a truthy value — the same shape
 * as `db:migrate --skip-staging`, and for the same reason: an exception should be
 * a decision somebody made and can be read back, rather than a flag somebody
 * found. The reason is printed on every run that uses it.
 *
 * Without the hatch a wrongly-pointed `.env.local` stops the suite entirely,
 * which is correct but strands anybody who has not yet repointed it.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

type EnvironmentsFile = {
  environments: Record<string, { ref: string; currentName: string; region: string }>;
};

/** The project ref inside a Supabase URL, or null if there is not one. */
export function refFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const match = /https:\/\/([a-z0-9]{20})\.supabase\.co/i.exec(url.trim());
  return match ? match[1] : null;
}

function environments(): EnvironmentsFile {
  return JSON.parse(
    readFileSync(path.join(ROOT, "supabase", "environments.json"), "utf8"),
  ) as EnvironmentsFile;
}

export function productionRef(): string {
  return environments().environments.production.ref;
}

/**
 * Production's name, read from the config rather than written into the message.
 *
 * The refusal used to say *the one named "courtsimplified-dev", which is
 * production despite the name*. Production was renamed on 2026-09-26, so that
 * sentence would now send the reader looking for a project that does not exist —
 * in an error whose entire purpose is to say which project they are about to
 * touch.
 */
export function productionName(): string {
  return environments().environments.production.currentName;
}

/**
 * Throws if the configured database is production.
 *
 * `what` names the caller, so the refusal says which run was stopped rather than
 * making somebody find it.
 */
/**
 * The Supabase URL this run would actually use.
 *
 * *** WHY THIS DOES NOT JUST READ process.env ***
 *
 * The first version did, and it had a load-order hole: `npm run test:fixtures`
 * without `--env-file` has no `NEXT_PUBLIC_SUPABASE_URL` at guard time, so the
 * guard saw nothing, reported "no Supabase URL configured" and passed — and any
 * module that loaded the env later would then have had production.
 *
 * A guard whose answer depends on which import ran first is not a guard. So the
 * environment wins if it is set, and `.env.local` is read directly if it is not.
 */
function configuredUrl(): string | undefined {
  const fromEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (fromEnv) return fromEnv;

  const envFile = path.join(ROOT, ".env.local");
  try {
    const line = readFileSync(envFile, "utf8")
      .split(/\r?\n/)
      .find((entry) => entry.startsWith("NEXT_PUBLIC_SUPABASE_URL="));
    // Only the URL is read. Nothing else in that file is touched or returned.
    return line ? line.slice("NEXT_PUBLIC_SUPABASE_URL=".length).trim() : undefined;
  } catch {
    return undefined;
  }
}

export function assertNotProduction(what: string): void {
  const configured = refFromUrl(configuredUrl());
  const production = productionRef();

  if (configured !== production) {
    // Says which project, never the keys beside it. A ref is public; a key is not.
    console.log(`[db] ${what} -> ${configured ?? "no Supabase URL configured"}`);
    return;
  }

  const reason = (process.env.ALLOW_PROD_DB ?? "").trim();
  if (reason.length > 0) {
    console.warn("");
    console.warn(`[db] *** ${what.toUpperCase()} IS RUNNING AGAINST PRODUCTION ***`);
    console.warn(`[db] ref: ${production}`);
    console.warn(`[db] reason given: ${reason}`);
    console.warn("");
    return;
  }

  throw new Error(
    `${what} refuses to run against PRODUCTION (${production}).\n\n` +
      `NEXT_PUBLIC_SUPABASE_URL points at the live database — the one named\n` +
      `"${productionName()}".\n\n` +
      `Point .env.local at staging, or, if you genuinely mean to use production,\n` +
      `state why:\n\n` +
      `  ALLOW_PROD_DB="one line saying why" npm run <the command>\n\n` +
      `See docs/infra/projects.md for which ref is which.`,
  );
}
