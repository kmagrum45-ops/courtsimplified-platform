/**
 * No migration grants anon write access, and no policy applies to PUBLIC.
 *
 * COSTS NOTHING. Reads supabase/migrations/*.sql off disk. No database
 * connection, no network.
 *
 * *** WHAT THIS CAN AND CANNOT SEE — READ THIS BEFORE TRUSTING A GREEN RUN ***
 *
 * It checks the MIGRATION FILES. It does not and cannot check the live
 * database, and those are not the same thing: only three migrations exist for
 * twenty-four tables, so most of this schema was created through the Supabase
 * dashboard. A policy added by hand in production is invisible here.
 *
 * `docs/security/01-audit-current-state.sql` is the only thing that sees the
 * live state, and a person has to run it. A green run here means "the files
 * are correct", never "production is correct".
 *
 * Saying so plainly because a check whose limits are not stated gets read as
 * covering more than it does — which is how the builder gate went eight specs
 * without anyone noticing nothing crossed it.
 *
 * WHAT IT IS FOR: stopping a regression. The two findings it encodes were
 * found by reading a migration, and the same mistakes are easy to repeat —
 * both new-table migrations in September copied the anon-grant convention with
 * a comment saying they were matching it.
 *
 * Run: node --import tsx scripts/verification/verifyAnonGrants.ts
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MIGRATIONS = path.resolve(process.cwd(), "supabase", "migrations");

/** Tables holding personal data. anon must hold nothing on these. */
const CASE_TABLES = [
  "cases",
  "case_intakes",
  "case_documents",
  "case_evidence",
  "case_generated_documents",
  "case_events",
  "case_event_candidate_dismissals",
];

/**
 * Anonymous SELECT that the app genuinely makes, with the table it reads and
 * the caller that reads it. Anything not on this list has no business being
 * readable by anon, and anything ON it must stay readable or the site breaks.
 *
 * Verified by grepping app/ and src/ for `.from("<table>")` and checking which
 * client each caller builds — anon key with no Authorization header is a real
 * anonymous read; a user token or the service role is not.
 */
const LEGITIMATE_ANON_READS: { table: string; reader: string }[] = [
  {
    table: "court_form_library",
    reader: "app/forms/page.tsx — bare anon client, no session",
  },
  {
    table: "pdf_overlay_fields",
    reader: "app/forms/page.tsx — bare anon client, no session",
  },
  {
    table: "court_forms",
    reader:
      "no current caller, but a scoped anon SELECT policy exists for family/ontario rows and is harmless",
  },
];

/**
 * Tables where anon still holds write, deliberately, with the reason.
 *
 * NOT an exemption list to grow. Each entry is a KNOWN HOLE kept open because
 * closing it would break something that has not been fixed yet, and each is
 * printed on every run so it cannot quietly become permanent.
 */
const KNOWN_ANON_WRITE: { table: string; reason: string }[] = [
  {
    table: "pdf_form_inventory",
    reason:
      "app/admin/pdf-field-mapper and app/api/admin/scan-pdf-fields build anon-key " +
      "clients with NO AUTH. Revoking closes the hole and breaks the admin tool in " +
      "the same statement. Authenticate those two surfaces first, then revoke.",
  },
  {
    table: "pdf_field_mappings",
    reason:
      "Same two unauthenticated admin surfaces. Holds PDF field coordinates — no " +
      "personal data; the exposure is content integrity, one step further from the user.",
  },
];

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

function migrationSources(): { file: string; sql: string }[] {
  if (!fs.existsSync(MIGRATIONS)) return [];
  return fs
    .readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => ({
      file: name,
      // Strip -- comments so the check never fires on its own explanation, or
      // on the comments the September migrations added about this very issue.
      sql: fs
        .readFileSync(path.join(MIGRATIONS, name), "utf8")
        .replace(/^\s*--.*$/gm, " "),
    }));
}

function main(): void {
  const sources = migrationSources();
  check("there are migrations to scan", sources.length > 0);

  // SELF-TEST. Every assertion below is a regex over SQL text. One that
  // silently matched nothing — a moved directory, a renamed extension — would
  // let all of them pass while establishing nothing.
  const allSql = sources.map((item) => item.sql).join("\n");
  check(
    "self-test: the migrations were actually read and contain DDL",
    allSql.length > 5_000 && /CREATE TABLE/i.test(allSql),
    `read ${sources.length} file(s), ${allSql.length} chars`,
  );

  // ---- 1. No policy applies to PUBLIC ----
  //
  // `CREATE POLICY x ON t USING (true)` with no TO clause defaults to
  // TO PUBLIC, which includes anon. Twelve dev_full_access_* policies were in
  // this state, giving anonymous full write and DELETE on the legal content
  // the platform serves to self-represented users.

  // MIGRATIONS ARE REPLAYED IN FILENAME ORDER, not scanned independently.
  //
  // That is how they actually apply, and without it the check could never go
  // green: a remediation migration that DROPs a bad policy and REVOKEs a grant
  // would leave the original CREATE/GRANT text sitting in the earlier file,
  // and a per-file scan would keep reporting it forever. A check that stays
  // red after the fix is a check someone turns off.
  //
  // `sources` is already sorted, because readdirSync returns the timestamped
  // filenames in lexical order and that is chronological for this scheme.
  const publicPolicySet = new Map<string, string>();

  for (const { file, sql } of sources) {
    for (const match of sql.matchAll(
      /CREATE POLICY\s+"([^"]+)"\s+ON\s+"public"\."([a-z_]+)"([^;]*);/gi,
    )) {
      const [, name, table, rest] = match;
      if (!/\bTO\s+"/i.test(rest)) {
        publicPolicySet.set(`${table}.${name}`, `${file}: "${name}" on ${table}`);
      }
    }

    for (const match of sql.matchAll(
      /DROP POLICY(?:\s+IF EXISTS)?\s+"([^"]+)"\s+ON\s+"public"\."([a-z_]+)"/gi,
    )) {
      publicPolicySet.delete(`${match[2]}.${match[1]}`);
    }
  }

  // The declared-exception tables keep their no-TO policies for now, because
  // those policies are what the two unauthenticated admin surfaces rely on.
  // Same reason, same list, so the exception cannot be claimed here without
  // also being claimed above.
  const exceptTables = new Set(KNOWN_ANON_WRITE.map((entry) => entry.table));
  const publicPolicies = [...publicPolicySet.entries()]
    .filter(([key]) => !exceptTables.has(key.split(".")[0]))
    .map(([, value]) => value);

  check(
    "no policy omits its TO clause (a policy with no TO applies to PUBLIC, which includes anon)",
    publicPolicies.length === 0,
    publicPolicies.join("\n      ") +
      "\n      Add an explicit TO clause. If the read is genuinely anonymous, " +
      "say so: FOR SELECT TO \"anon\".",
  );

  // ---- 2. anon holds nothing on the case tables ----

  // Net anon privileges per table, replaying GRANT and REVOKE in order.
  const WRITE = ["INSERT", "UPDATE", "DELETE", "TRUNCATE"];
  const anonPrivileges = new Map<string, Set<string>>();
  const grantedIn = new Map<string, string>();

  const expand = (raw: string): string[] =>
    /\bALL\b/i.test(raw)
      ? ["SELECT", ...WRITE, "REFERENCES", "TRIGGER"]
      : raw
          .split(",")
          .map((part) => part.trim().toUpperCase())
          .filter(Boolean);

  for (const { file, sql } of sources) {
    for (const match of sql.matchAll(
      /GRANT\s+([A-Z, ]+?)\s+ON\s+TABLE\s+"public"\."([a-z_]+)"\s+TO\s+"anon"/gi,
    )) {
      const table = match[2];
      const held = anonPrivileges.get(table) || new Set<string>();
      for (const privilege of expand(match[1])) held.add(privilege);
      anonPrivileges.set(table, held);
      if (!grantedIn.has(table)) grantedIn.set(table, file);
    }

    for (const match of sql.matchAll(
      /REVOKE\s+([A-Z, ]+?)\s+ON\s+TABLE\s+"public"\."([a-z_]+)"\s+FROM\s+"anon"/gi,
    )) {
      const table = match[2];
      const held = anonPrivileges.get(table);
      if (!held) continue;
      for (const privilege of expand(match[1])) held.delete(privilege);
    }
  }

  for (const table of CASE_TABLES) {
    const held = anonPrivileges.get(table);
    check(
      `anon is granted nothing on ${table}`,
      !held || held.size === 0,
      `anon holds ${[...(held || [])].sort().join(", ")} (granted in ${grantedIn.get(table)}) — ` +
        "these tables hold intake narratives, party names and addresses, and " +
        "uploaded evidence. RLS denies by default with no anon policy, so this " +
        "is a missing second layer rather than an open door — but one mistaken " +
        "policy or one DISABLE ROW LEVEL SECURITY converts it to total exposure",
    );
  }

  // ---- 3. anon holds no write privilege on anything ----

  const known = new Map(KNOWN_ANON_WRITE.map((entry) => [entry.table, entry.reason]));
  const anonWrites: string[] = [];
  const knownStillWritable: string[] = [];

  for (const [table, held] of anonPrivileges) {
    const writes = [...held].filter((privilege) => WRITE.includes(privilege));
    if (writes.length === 0) continue;

    if (known.has(table)) knownStillWritable.push(table);
    else anonWrites.push(`${table}: ${writes.sort().join(", ")}`);
  }
  anonWrites.sort();

  // A declared exception that has been fixed should come off the list, the
  // same rule as verifyReachability's dormant entries — otherwise the list
  // grows and stops meaning anything.
  for (const { table } of KNOWN_ANON_WRITE) {
    check(
      `declared exception ${table} still actually holds anon write`,
      knownStillWritable.includes(table),
      "it does not any more — remove it from KNOWN_ANON_WRITE, so the list " +
        "keeps meaning 'holes still open' rather than 'holes we once had'",
    );
  }

  check(
    "anon holds no write privilege on any table",
    anonWrites.length === 0,
    anonWrites.slice(0, 30).join("\n      ") +
      (anonWrites.length > 30 ? `\n      ...and ${anonWrites.length - 30} more` : "") +
      "\n      anon should hold SELECT and only where an anonymous read exists.",
  );

  // ---- 4. Every table RLS is enabled on is one a policy covers ----
  //
  // RLS with no policy denies everything, which is safe but usually means a
  // table nothing can reach. Reported rather than failed: a deliberately
  // service-role-only table is legitimate and legal_procedure_rules is one.

  const created = new Set<string>();
  const rlsEnabled = new Set<string>();
  const policied = new Set<string>();

  for (const { sql } of sources) {
    for (const m of sql.matchAll(/CREATE TABLE IF NOT EXISTS "public"\."([a-z_]+)"/gi)) {
      created.add(m[1]);
    }
    for (const m of sql.matchAll(
      /ALTER TABLE "public"\."([a-z_]+)" ENABLE ROW LEVEL SECURITY/gi,
    )) {
      rlsEnabled.add(m[1]);
    }
    for (const m of sql.matchAll(/CREATE POLICY\s+"[^"]+"\s+ON\s+"public"\."([a-z_]+)"/gi)) {
      policied.add(m[1]);
    }
  }

  const withoutRls = [...created].filter((table) => !rlsEnabled.has(table));
  check(
    "every created table has RLS enabled",
    withoutRls.length === 0,
    `no RLS: ${withoutRls.join(", ")}`,
  );

  console.log("\n--- Tables with RLS and no policy (service-role-only, or unreachable) ---");
  const noPolicy = [...rlsEnabled].filter((table) => !policied.has(table)).sort();
  console.log(noPolicy.length ? noPolicy.join(", ") : "none");

  console.log("\n--- KNOWN HOLES, still open, deliberately ---");
  for (const entry of KNOWN_ANON_WRITE) {
    console.log(`  ${entry.table}\n    ${entry.reason}`);
  }

  console.log("\n--- Anonymous reads the app actually makes ---");
  for (const entry of LEGITIMATE_ANON_READS) {
    console.log(`  ${entry.table.padEnd(26)} ${entry.reader}`);
  }

  console.log(
    "\nNOTE: this checks the MIGRATION FILES. It cannot see the live database.\n" +
      "Run docs/security/01-audit-current-state.sql for that — it only reads.",
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
