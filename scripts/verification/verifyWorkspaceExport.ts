/**
 * The export covers every store the data map lists, and the data map lists every store
 * the schema has.
 *
 * WHAT THIS CATCHES: a table that exists, holds a litigant's data, and is in neither
 * the export nor the map.
 *
 * *** WHY TWO COMPARISONS AND NOT ONE ***
 *
 * Checking the export against the map catches an export that fell behind. It does not
 * catch a table nobody added to EITHER — and that is the likelier failure, because
 * adding a table happens in a migration and both the map and the export live somewhere
 * else entirely.
 *
 * So the schema is the third party to the comparison: every `workspace_*` table created
 * by a migration must appear in the map, and every table in the map must be exported.
 * The schema cannot be forgotten, because it is the thing being written.
 *
 * *** WHY AN INCOMPLETE EXPORT IS WORSE THAN NO EXPORT ***
 *
 * A person who exports their data reasonably treats what comes back as everything. An
 * export missing a store hands them a document that is wrong in a way they cannot
 * detect, and they may rely on it — to check what a service holds, or to take their
 * records somewhere else. Silence is the failure mode, which is why it is checked
 * rather than reviewed.
 *
 * COSTS NOTHING. File reads.
 *
 * Run: node --import tsx scripts/verification/verifyWorkspaceExport.ts
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { EXPORTED_TABLES } from "../../app/api/workspace/export/route";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const MAP = path.join(ROOT, "docs", "data-map.md");
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");
const EXPORT_ROUTE = path.join(ROOT, "app", "api", "workspace", "export", "route.ts");

/**
 * Source with comments removed.
 *
 * *** THE THIRD TIME THIS EXACT TRAP HAS BEEN HIT IN THIS BRANCH ***
 *
 * The cache check read `no-store` out of the route's own HEADER COMMENT, which explains
 * why the response must be no-store. So a mutation making the response cacheable left the
 * check green: the phrase it looked for was still there, in prose, describing the rule it
 * had just stopped enforcing.
 *
 * A source-level check that reads comments passes on a file that only TALKS about doing
 * the right thing. Every check below that asserts behaviour reads this, not the raw text.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trimStart();
      return !trimmed.startsWith("//") && !trimmed.startsWith("*");
    })
    .join("\n");
}

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

console.log("");
console.log("WORKSPACE EXPORT & DATA MAP");
console.log("");

const mapText = (() => {
  try {
    return readFileSync(MAP, "utf8");
  } catch {
    return "";
  }
})();

/** Every workspace table any migration creates. */
function workspaceTablesInSchema(): string[] {
  const found = new Set<string>();
  for (const file of readdirSync(MIGRATIONS)) {
    if (!file.endsWith(".sql")) continue;
    const sql = readFileSync(path.join(MIGRATIONS, file), "utf8");
    for (const match of sql.matchAll(
      /CREATE TABLE IF NOT EXISTS "public"\."(workspace_[a-z_]+)"/g,
    )) {
      found.add(match[1]);
    }
  }
  return [...found].sort();
}

// ---------------------------------------------------------------------------
// 1. Schema -> map
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  if (mapText.length === 0) {
    problems.push(`the data map is missing at ${MAP}`);
  }

  const schemaTables = workspaceTablesInSchema();

  if (schemaTables.length === 0) {
    problems.push(
      "no workspace tables were found in any migration, so this check is asserting nothing",
    );
  }

  for (const table of schemaTables) {
    if (!mapText.includes(table)) {
      problems.push(
        `\`${table}\` is created by a migration and does not appear in docs/data-map.md — ` +
          `an undocumented store holding a litigant's data`,
      );
    }
  }

  if (problems.length === 0) {
    pass(`all ${schemaTables.length} workspace tables in the schema appear in the data map`);
  } else {
    fail("a store exists that the data map does not record", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 2. Map -> export
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  const exported = new Set<string>(EXPORTED_TABLES.map((entry) => entry.table));
  const schemaTables = workspaceTablesInSchema();

  for (const table of schemaTables) {
    if (!exported.has(table)) {
      problems.push(
        `\`${table}\` holds user data and is NOT exported. A person exporting their data ` +
          `would receive a document they reasonably treat as complete, and it would be ` +
          `missing this.`,
      );
    }
  }

  for (const entry of EXPORTED_TABLES) {
    if (!schemaTables.includes(entry.table as string)) {
      problems.push(
        `the export reads \`${entry.table}\`, which no migration creates — the query will ` +
          `fail and take the whole export with it`,
      );
    }
    if (entry.what.trim().length < 15) {
      problems.push(
        `\`${entry.table}\` has no real description, so the export cannot tell the reader ` +
          `what it contains`,
      );
    }
  }

  if (problems.length === 0) {
    pass(
      `all ${schemaTables.length} workspace tables are exported, each with a description of ` +
        `what it holds`,
    );
  } else {
    fail("the export and the schema disagree", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 3. The export states its own omissions, and is scoped to the caller
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  let source = "";
  try {
    source = stripComments(readFileSync(EXPORT_ROUTE, "utf8"));
  } catch {
    problems.push(`the export route is missing at ${EXPORT_ROUTE}`);
  }

  if (source) {
    /*
     * An omission the reader cannot see is what makes an export dishonest. The export
     * must carry its own list of what it leaves out.
     */
    if (!/whatThisDoesNotContain/.test(source)) {
      problems.push(
        "the export does not state what it leaves out, so an omission is undetectable by " +
          "the person reading it",
      );
    }

    /*
     * Every table query scoped to the caller. A service-role client bypasses RLS, so on
     * this path the clause is the only thing keeping one person's export from containing
     * another person's case.
     */
    const queries = (source.match(/\.select\("\*"\)/g) ?? []).length;
    const scoped = (source.match(/\.eq\("user_id", user\.id\)/g) ?? []).length;

    if (queries > 0 && scoped < queries) {
      problems.push(
        `${queries} table read(s) and only ${scoped} user_id filter(s). The service-role ` +
          `client bypasses RLS, so an unscoped read returns every user's rows.`,
      );
    }

    // The most sensitive response this product produces must not be cached anywhere.
    if (!/no-store/.test(source)) {
      problems.push("the export response is not marked no-store");
    }

    // Signed URLs must expire, and the export must say when.
    if (!/createSignedUrl\([^)]*SIGNED_URL_SECONDS\)/.test(source)) {
      problems.push("document links are not created with an explicit expiry");
    }
    if (!/works for \$\{SIGNED_URL_SECONDS/.test(source)) {
      problems.push("the export does not tell the reader how long the links last");
    }
  }

  if (problems.length === 0) {
    pass(
      "the export states its omissions, scopes every read to the caller, expires its links " +
        "and is never cached",
    );
  } else {
    fail("the export is unsafe or dishonest about itself", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 4. The data map tells the truth about the AI flag
// ---------------------------------------------------------------------------

{
  /*
   * The map's §4.1 is the paragraph counsel and the privacy policy will rest on. If the
   * flag were ever turned on without that section changing, the policy wording drafted
   * from it — "we do not send your documents to an artificial-intelligence service" —
   * would become false while still being published.
   *
   * So the claim is checked against the code rather than believed.
   */
  const problems: string[] = [];

  const ai = stripComments(
    readFileSync(path.join(ROOT, "src", "lib", "case-workspace", "aiAnalysis.ts"), "utf8"),
  );

  const zdrIsNull = /export const ZDR_CONFIRMED_AT: string \| null = null;/.test(ai);

  const mapSaysOff =
    /false in every environment, including staging/i.test(mapText) &&
    /request has not been sent/i.test(mapText);

  if (zdrIsNull && !mapSaysOff) {
    problems.push(
      "the flag is off in code and the data map does not say so plainly — the policy " +
        "wording is drafted from this section",
    );
  }

  if (!zdrIsNull && mapSaysOff) {
    problems.push(
      "ZDR_CONFIRMED_AT IS SET and the data map still says the request has not been sent. " +
        "The proposed policy wording says documents are not sent to an AI service, and it " +
        "would now be false while still being published. Update docs/data-map.md §4 and §6 " +
        "and DATA_FLOW_INVENTORY §3.2 before going further.",
    );
  }

  if (problems.length === 0) {
    pass(
      zdrIsNull
        ? "the data map's account of the AI flag matches the code: off, with the ZDR request unsent"
        : "the data map has been updated to match a set ZDR_CONFIRMED_AT",
    );
  } else {
    fail("the data map and the code disagree about whether documents are sent to a model", problems.join("\n"));
  }
}

console.log("");
if (failures > 0) {
  console.log(`${failures} FAILURE(S).`);
  process.exitCode = 1;
} else {
  console.log("All checks passed.");
}
console.log("");
