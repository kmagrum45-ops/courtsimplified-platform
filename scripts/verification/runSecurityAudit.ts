/**
 * Runs the five read-only security audit queries and prints the results.
 *
 * ONE COMMAND INSTEAD OF FIVE PASTES:
 *
 *   npm run audit:security -- --project dev
 *   npm run audit:security -- --project prod
 *
 * *** READ-ONLY BY CONSTRUCTION, NOT BY INTENTION ***
 *
 * This sends SQL to Supabase's Management API, an endpoint that will execute
 * anything it is given. So the safety is enforced here, in three layers:
 *
 *   1. The SQL is not written in this file. It is read from
 *      docs/security/01*.sql — the same five files a person would paste — so
 *      there is one source of truth and no second copy to drift.
 *   2. Every statement is checked against a deny-list of mutating keywords
 *      before it is sent. A file that gained an INSERT would be refused.
 *   3. Every statement must begin with SELECT. Not "contain" — begin with.
 *
 * If a future edit adds DDL to one of those files, this refuses to run it
 * rather than discovering the problem afterwards.
 *
 * *** WHICH PROJECT — NO DEFAULT, DELIBERATELY ***
 *
 * `--project` is required. There is no fallback, because the two projects are
 * a development database and a production one holding real case files, and a
 * default is how the wrong one gets hit. The chosen project's name, region and
 * ref are printed before the first query runs.
 *
 * CLAUDE.md section 6: production is never MODIFIED without an explicit
 * go-ahead. These are reads, and reads against production are still worth
 * doing deliberately rather than by default.
 *
 * *** SECRETS ***
 *
 * The access token is read from .env.diagnose inside this process and is never
 * printed, logged, or passed on a command line. Nothing in the output contains
 * a key.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SECURITY_DIR = path.resolve(process.cwd(), "docs", "security");

/**
 * The two projects, by the names Supabase reports for them.
 *
 * Hardcoded rather than read from an env var because the whole point of the
 * `--project` flag is that the target is stated explicitly. A ref in a file
 * that silently changed would defeat it.
 */
const PROJECTS: Record<string, { ref: string; name: string; region: string; note: string }> = {
  dev: {
    ref: "fddlpnibovkkkgboabqb",
    name: "courtsimplified-dev",
    region: "ca-central-1",
    note: "Development. This is also what .env.local points at, so it is the database the app uses locally.",
  },
  prod: {
    ref: "ffymjxjcnwakgdmldpne",
    name: "courtsimplified",
    region: "us-west-2",
    note: "PRODUCTION — holds real case files. Was reported INACTIVE (paused) on 2026-09-15; a paused project may need resuming before it answers.",
  },
};

/** Anything that could change state. Checked before a statement is sent. */
const FORBIDDEN = [
  "INSERT", "UPDATE", "DELETE", "TRUNCATE", "DROP", "CREATE", "ALTER",
  "GRANT", "REVOKE", "COMMENT", "REINDEX", "VACUUM", "REFRESH",
  "COPY", "CALL", "DO", "SET ", "BEGIN", "COMMIT", "ROLLBACK",
];

function readToken(): string {
  const envPath = path.resolve(process.cwd(), ".env.diagnose");
  if (!fs.existsSync(envPath)) {
    throw new Error(
      ".env.diagnose not found. It holds SUPABASE_ACCESS_TOKEN, the Management " +
        "API token this needs. The file is gitignored and must stay that way.",
    );
  }

  const match = /^SUPABASE_ACCESS_TOKEN=(.*)$/m.exec(fs.readFileSync(envPath, "utf8"));
  const token = match ? match[1].trim().replace(/^["']|["']$/g, "") : "";

  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is not set in .env.diagnose.");
  return token;
}

/** The five audit files, in order, with their SQL and their leading comment. */
function auditQueries(): { file: string; title: string; sql: string }[] {
  return fs
    .readdirSync(SECURITY_DIR)
    .filter((name) => /^01[a-e]-.*\.sql$/.test(name))
    .sort()
    .map((name) => {
      const raw = fs.readFileSync(path.join(SECURITY_DIR, name), "utf8");
      const titleLine = raw.split(/\r?\n/).find((line) => line.startsWith("-- 01")) || name;
      return {
        file: name,
        title: titleLine.replace(/^--\s*/, ""),
        sql: raw.replace(/^\s*--.*$/gm, "").trim(),
      };
    });
}

/** Refuses anything that is not a single leading SELECT. */
function assertReadOnly(file: string, sql: string): void {
  // STRING LITERALS ARE STRIPPED BEFORE THE KEYWORD SCAN.
  //
  // The first run of this refused 01c, because it contains
  // `LIKE '%INSERT%'` in an ORDER BY — a literal used to sort tables that
  // grant INSERT to anon, not a statement that inserts anything.
  //
  // The fix is to make the guard precise, not to loosen it. Stripping
  // quoted literals means the scan reads SQL keywords only, and a real
  // INSERT outside quotes is still caught. The SELECT-prefix check below
  // runs against the ORIGINAL text, so nothing can hide behind the strip.
  const upper = sql.replace(/'(?:[^']|'')*'/g, "''").toUpperCase();

  for (const keyword of FORBIDDEN) {
    if (new RegExp(`\\b${keyword.trim()}\\b`).test(upper)) {
      throw new Error(
        `${file} contains "${keyword.trim()}". This runner sends SQL to an endpoint ` +
          "that executes anything, so it only sends statements that begin with " +
          "SELECT and contain no mutating keyword. Run that file by hand if it is " +
          "genuinely meant to change something.",
      );
    }
  }

  if (!sql.toUpperCase().startsWith("SELECT")) {
    throw new Error(`${file} does not begin with SELECT.`);
  }
}

async function runQuery(ref: string, token: string, sql: string): Promise<unknown[]> {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 400)}`);
  }

  const parsed = await response.json();
  return Array.isArray(parsed) ? parsed : [parsed];
}

/** Prints rows as a table, truncating long cells so a view definition stays readable. */
function printRows(rows: unknown[]): void {
  if (rows.length === 0) {
    console.log("  (no rows)");
    return;
  }

  const records = rows as Record<string, unknown>[];
  const columns = Object.keys(records[0]);
  const width = new Map<string, number>();

  const cell = (value: unknown): string => {
    const text = value === null || value === undefined ? "" : String(value);
    return text.length > 78 ? `${text.slice(0, 75)}...` : text.replace(/\s+/g, " ");
  };

  for (const column of columns) {
    width.set(
      column,
      Math.max(column.length, ...records.map((row) => cell(row[column]).length)),
    );
  }

  console.log("  " + columns.map((c) => c.padEnd(width.get(c)!)).join("  "));
  console.log("  " + columns.map((c) => "-".repeat(width.get(c)!)).join("  "));
  for (const row of records) {
    console.log("  " + columns.map((c) => cell(row[c]).padEnd(width.get(c)!)).join("  "));
  }
  console.log(`  (${records.length} row${records.length === 1 ? "" : "s"})`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const index = args.indexOf("--project");
  const choice = index >= 0 ? args[index + 1] : "";

  if (!choice || !PROJECTS[choice]) {
    console.error(
      "Usage: npm run audit:security -- --project <dev|prod>\n\n" +
        Object.entries(PROJECTS)
          .map(([key, p]) => `  ${key.padEnd(5)} ${p.name} (${p.region})\n        ${p.note}`)
          .join("\n\n") +
        "\n\nNo default. The two projects are a development database and a " +
        "production one holding real case files.",
    );
    process.exitCode = 1;
    return;
  }

  const project = PROJECTS[choice];
  const token = readToken();
  const queries = auditQueries();

  for (const query of queries) assertReadOnly(query.file, query.sql);

  console.log("=".repeat(78));
  console.log(`PROJECT   ${project.name}  (${project.region})`);
  console.log(`REF       ${project.ref}`);
  console.log(`NOTE      ${project.note}`);
  console.log(`QUERIES   ${queries.length}, all verified SELECT-only before sending`);
  console.log("=".repeat(78));

  let failed = 0;

  for (const query of queries) {
    console.log(`\n\n### ${query.title}\n`);
    try {
      printRows(await runQuery(project.ref, token, query.sql));
    } catch (error) {
      failed += 1;
      console.log(`  QUERY FAILED: ${(error as Error).message}`);
    }
  }

  console.log(
    `\n\n${"=".repeat(78)}\n` +
      `${queries.length - failed} of ${queries.length} queries returned.\n` +
      "Interpretation — expected values, and what a bad result looks like — is in\n" +
      "each docs/security/01*.sql file and summarised in docs/security/README.md.\n" +
      `${"=".repeat(78)}`,
  );

  if (failed) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) void main();
