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

  // `prod` WAS HERE, from 2026-09-15, for exactly one application of the
  // anon-grant remediation. Removed the same day, as intended — the default is
  // refuse, and an entry that outlives its purpose is how a default stops
  // being one.
  //
  // What it was used for, recorded so the next person does not have to
  // reconstruct it: production was audited read-only first and held NO
  // third-party personal data (3 auth users, two the operator's own and one
  // the test harness; 2 shell case rows; every other case table empty; no
  // user-uploaded evidence). The remediation applied and was verified with 01b
  // and 01d — anon zero on the case tables, no {public} ALL policies. The
  // project was then re-paused.
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

  // DO blocks are lifted out before splitting on ";", because their bodies
  // contain semicolons and a naive split would shred them into fragments that
  // look like malformed statements.
  //
  // They are NOT waved through. Each block's body is returned as its own
  // statement so `assertExpectedStatements` inspects what is inside it — a DO
  // block containing a DELETE is refused exactly like a bare DELETE. The only
  // thing this recognises is the wrapper.
  const doBlocks: string[] = [];
  const withoutDo = sql.replace(/DO\s+\$([a-z_]*)\$([\s\S]*?)\$\1\$\s*;/gi, (_, __, body) => {
    doBlocks.push(body);
    return "";
  });

  const bare = withoutDo
    .split(";")
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // Inside a DO block, strip the PL/pgSQL scaffolding that is not itself a
  // statement — BEGIN/END/IF/THEN — leaving the SQL the block performs.
  const insideDo = doBlocks.flatMap((body) =>
    body
      .split(";")
      .map((part) =>
        part
          .replace(/\b(BEGIN|END IF|END|IF\s+[^;]*?\s+THEN|ELSE)\b/gi, " ")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean),
  );

  return { file, sql, statements: [...bare, ...insideDo] };
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
