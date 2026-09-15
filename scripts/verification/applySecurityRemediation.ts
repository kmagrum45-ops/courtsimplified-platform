/**
 * Applies the security remediation migration to a Supabase project.
 *
 *   npm run audit:apply -- --project dev --confirm
 *
 * *** THIS ONE WRITES. Everything else in docs/security/ only reads. ***
 *
 * *** PRODUCTION IS REFUSED IN CODE, NOT BY CONVENTION ***
 *
 * `--project prod` is rejected. Not warned about — rejected, with no flag that
 * overrides it. Enabling production means editing ALLOWED_PROJECTS below,
 * which is a visible diff someone has to write and someone has to review.
 *
 * CLAUDE.md section 6 puts production changes behind an explicit go-ahead. A
 * `--force` flag would technically satisfy that and practically defeat it: the
 * flag exists, so it gets typed. A code change cannot be typed by accident.
 *
 * As of 2026-09-15 production is also PAUSED (INACTIVE) and serving nothing,
 * so there is no urgency in unpausing a database in order to secure it.
 *
 * *** WHAT IT SENDS ***
 *
 * The contents of supabase/migrations/*_revoke_anon_write_and_scope_policies.sql
 * — the file, not a copy. There is no second source of truth to drift.
 *
 * *** WHAT IT REFUSES TO SEND ***
 *
 * The migration must contain only the statement types this remediation is made
 * of: DROP POLICY, CREATE POLICY, REVOKE, BEGIN, COMMIT. Anything else — an
 * INSERT, a DELETE, a DROP TABLE, an UPDATE — and it stops without sending.
 * The point is that a well-formed remediation stays well-formed: if someone
 * later appends a data change to this migration, this refuses rather than
 * running it against a database.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MIGRATIONS = path.resolve(process.cwd(), "supabase", "migrations");
const MIGRATION_PATTERN = /_revoke_anon_write_and_scope_policies\.sql$/;

/**
 * Projects this script may write to.
 *
 * `prod` is ABSENT, deliberately. See the header.
 */
const ALLOWED_PROJECTS: Record<string, { ref: string; name: string; region: string }> = {
  dev: {
    ref: "fddlpnibovkkkgboabqb",
    name: "courtsimplified-dev",
    region: "ca-central-1",
  },
};

const KNOWN_REFUSED: Record<string, string> = {
  prod: "courtsimplified (us-west-2) — PRODUCTION. Refused in code.",
};

/** Statement forms this remediation legitimately contains. */
const ALLOWED_STATEMENTS = [
  /^DROP\s+POLICY\b/i,
  /^CREATE\s+POLICY\b/i,
  /^REVOKE\b/i,
  /^BEGIN$/i,
  /^COMMIT$/i,
];

function readToken(): string {
  const envPath = path.resolve(process.cwd(), ".env.diagnose");
  if (!fs.existsSync(envPath)) throw new Error(".env.diagnose not found.");

  const match = /^SUPABASE_ACCESS_TOKEN=(.*)$/m.exec(fs.readFileSync(envPath, "utf8"));
  const token = match ? match[1].trim().replace(/^["']|["']$/g, "") : "";
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is not set in .env.diagnose.");
  return token;
}

function readMigration(): { file: string; sql: string; statements: string[] } {
  const file = fs.readdirSync(MIGRATIONS).find((name) => MIGRATION_PATTERN.test(name));
  if (!file) throw new Error(`No migration matching ${MIGRATION_PATTERN} in ${MIGRATIONS}`);

  const raw = fs.readFileSync(path.join(MIGRATIONS, file), "utf8");
  const sql = raw.replace(/^\s*--.*$/gm, "").trim();

  const statements = sql
    .split(";")
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return { file, sql, statements };
}

function assertExpectedStatements(statements: string[]): void {
  const unexpected = statements.filter(
    (statement) => !ALLOWED_STATEMENTS.some((pattern) => pattern.test(statement)),
  );

  if (unexpected.length > 0) {
    throw new Error(
      `The migration contains ${unexpected.length} statement(s) this script will not send:\n  ` +
        unexpected.map((s) => s.slice(0, 110)).join("\n  ") +
        "\n\nThis remediation is made of DROP POLICY, CREATE POLICY and REVOKE. " +
        "Anything else has to be run deliberately, by a person, not by a script " +
        "whose name says it applies a known remediation.",
    );
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const choice = args[args.indexOf("--project") + 1] || "";
  const confirmed = args.includes("--confirm");

  if (KNOWN_REFUSED[choice]) {
    console.error(
      `REFUSED: ${KNOWN_REFUSED[choice]}\n\n` +
        "There is no flag that overrides this. Applying to production means " +
        "adding it to ALLOWED_PROJECTS in this file — a visible diff someone " +
        "writes and someone reviews.\n\n" +
        "As of 2026-09-15 production is also paused and serving nothing.",
    );
    process.exitCode = 1;
    return;
  }

  if (!ALLOWED_PROJECTS[choice]) {
    console.error(
      "Usage: npm run audit:apply -- --project dev --confirm\n\n" +
        "Allowed: " +
        Object.keys(ALLOWED_PROJECTS).join(", ") +
        "\nRefused: " +
        Object.keys(KNOWN_REFUSED).join(", "),
    );
    process.exitCode = 1;
    return;
  }

  const project = ALLOWED_PROJECTS[choice];
  const { file, sql, statements } = readMigration();
  assertExpectedStatements(statements);

  const byKind = statements.reduce<Record<string, number>>((counts, statement) => {
    const kind = /^DROP\s+POLICY/i.test(statement)
      ? "DROP POLICY"
      : /^CREATE\s+POLICY/i.test(statement)
        ? "CREATE POLICY"
        : /^REVOKE/i.test(statement)
          ? "REVOKE"
          : "transaction";
    counts[kind] = (counts[kind] || 0) + 1;
    return counts;
  }, {});

  console.log("=".repeat(78));
  console.log(`WILL MODIFY   ${project.name}  (${project.region})`);
  console.log(`REF           ${project.ref}`);
  console.log(`MIGRATION     ${file}`);
  console.log(
    `STATEMENTS    ${Object.entries(byKind)
      .map(([kind, count]) => `${count} ${kind}`)
      .join(", ")}`,
  );
  console.log("=".repeat(78));

  if (!confirmed) {
    console.log(
      "\nDry run. Nothing was sent.\nAdd --confirm to apply, then re-run:\n" +
        "  npm run audit:security -- --project " +
        choice,
    );
    return;
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${project.ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${readToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  if (!response.ok) {
    console.error(`\nFAILED — HTTP ${response.status}\n${(await response.text()).slice(0, 600)}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    "\nApplied.\n\nNow confirm it did what it claims:\n" +
      `  npm run audit:security -- --project ${choice}\n\n` +
      "01b should show no {public} policy with cmd = ALL.\n" +
      "01d should show anon zero times.",
  );
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) void main();
