/**
 * The content_reviews ledger is append-only, operator-only and hash-chained, as
 * written in its migration — and no later migration quietly undoes that.
 *
 * COSTS NOTHING, AND TOUCHES NO DATABASE. Reads the migration SQL off disk and
 * asserts properties of its text. It proves the rules are WRITTEN, not that they
 * WORK: that is test:rls-matrix's job (it builds a throwaway Postgres in CI and
 * tries to read, insert, change and delete as every role).
 *
 * WHAT IT EXISTS TO CATCH: the site owner's rules for the review record (29 Oct
 * 2026) being weakened by an edit that still "works" — an UPDATE policy added so
 * a typo can be fixed, a trigger made to skip the service role, the date taken
 * from the client, the chain read without its lock, a grant put back. Each of
 * those leaves the table usable and the record no longer trustworthy, which is
 * exactly the change nobody notices in review.
 *
 * The properties (the owner's spec, supabase/migrations/*_add_content_reviews.sql):
 *   - RLS is on; inserts are allowed only through is_site_operator(); reads only
 *     by operators; there is no UPDATE, DELETE or ALL policy, in any migration.
 *   - A trigger refuses UPDATE and DELETE (and one refuses TRUNCATE) with no role
 *     condition, and is ENABLE ALWAYS, so it binds every role.
 *   - reviewed_at and reviewer_id are set by the insert trigger from the clock and
 *     auth.uid(), and the client's INSERT grant does not name them.
 *   - prev_row_hash and row_hash exist and the trigger computes them after taking
 *     a lock, so two inserts cannot chain onto the same row.
 *   - UPDATE, DELETE and TRUNCATE are revoked from anon, authenticated and
 *     service_role, and no migration grants them back.
 *
 * Self-test: `--sql <file>` checks another copy of the migration instead (used to
 * show each check fails on a deliberately weakened copy).
 *
 * Run: npm run test:content-reviews-migration
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");
const TABLE = "content_reviews";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) console.log(`pass  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
};

/** Comments out, quoted identifiers unquoted, whitespace collapsed, lower case. */
function normalise(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/"([a-z_][a-z0-9_]*)"/gi, "$1")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Top-level statements, with $$-quoted bodies kept whole. */
function statements(sql: string): string[] {
  const out: string[] = [];
  let current = "";
  let inBody = false;
  for (let i = 0; i < sql.length; i += 1) {
    if (sql.startsWith("$$", i)) {
      inBody = !inBody;
      current += "$$";
      i += 1;
      continue;
    }
    if (sql[i] === ";" && !inBody) {
      if (current.trim()) out.push(current.trim());
      current = "";
      continue;
    }
    current += sql[i];
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

const argIndex = process.argv.indexOf("--sql");
const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
const ownFile = files.find((f) => /_add_content_reviews\.sql$/.test(f));
check("the content_reviews migration exists", Boolean(ownFile), "no supabase/migrations/*_add_content_reviews.sql");
if (!ownFile) process.exit(1);

const ownPath = argIndex > 0 ? path.resolve(process.argv[argIndex + 1]) : path.join(MIGRATIONS, ownFile);
const raw = readFileSync(ownPath, "utf8");
const own = statements(normalise(raw));
// Every migration, with the one under test swapped in, for the "nothing undoes it" checks.
const all = files.flatMap((f) =>
  statements(normalise(f === ownFile ? raw : readFileSync(path.join(MIGRATIONS, f), "utf8"))),
);

const onTable = (s: string) => new RegExp(`\\bon (table )?(public\\.)?${TABLE}\\b`).test(s);

// --- the header states what it is and its limit ------------------------------
check("header: says it is not applied by the repository", /NOT APPLIED BY ANYTHING IN THIS REPOSITORY/.test(raw));
check(
  "header: states the honest limit (owner can drop the trigger; rewrite detectable, not impossible)",
  /drop or disable these triggers/i.test(raw) && /detectable, not impossible/i.test(raw),
);

// --- the table ---------------------------------------------------------------
const create = own.find((s) => new RegExp(`^create table (if not exists )?public\\.${TABLE}\\b`).test(s)) ?? "";
check("table: created", Boolean(create));
for (const column of ["id", "item_id", "item_hash", "reviewer_id", "reviewed_at", "source_ref", "source_retrieved_at",
  "source_sha256", "quote_check", "result", "before_text", "after_text", "note", "prev_row_hash", "row_hash"]) {
  check(`table: has column ${column}`, new RegExp(`[(,] ?${column} [a-z]`).test(create));
}
check("table: result is limited to approved / changed / removed",
  /check \(result in \('approved', ?'changed', ?'removed'\)\)/.test(create));
check("table: prev_row_hash and row_hash are NOT NULL",
  /prev_row_hash text not null/.test(create) && /row_hash text not null/.test(create.replace(/prev_row_hash/g, "")));

// --- RLS and policies --------------------------------------------------------
check("rls: enabled", own.some((s) => new RegExp(`^alter table (only )?public\\.${TABLE} enable row level security$`).test(s)));

const policies = all.filter((s) => s.startsWith("create policy") && onTable(s));
const forOf = (p: string) => (p.match(/\bfor (all|select|insert|update|delete)\b/) ?? [, "all"])[1];
const inserts = policies.filter((p) => forOf(p) === "insert");
const selects = policies.filter((p) => forOf(p) === "select");
const writers = policies.filter((p) => ["update", "delete", "all"].includes(forOf(p)));
check("policy: an INSERT policy exists", inserts.length >= 1);
check(
  "policy: every INSERT policy is WITH CHECK is_site_operator(), to authenticated only",
  inserts.length >= 1 && inserts.every((p) =>
    /\bto authenticated\b/.test(p) && !/\bto [^w]*\b(anon|public)\b/.test(p)
    && /with check \(\(?(select )?public\.is_site_operator\(\)\)?\)$/.test(p)),
  inserts.join("\n      "),
);
check(
  "policy: every SELECT policy is USING is_site_operator() (operators only)",
  selects.length >= 1 && selects.every((p) =>
    /\bto authenticated\b/.test(p) && /using \(\(?(select )?public\.is_site_operator\(\)\)?\)$/.test(p)),
  selects.join("\n      "),
);
check("policy: no UPDATE, DELETE or ALL policy in any migration", writers.length === 0, writers.join("\n      "));

// --- the refusing triggers ---------------------------------------------------
const triggers = own.filter((s) => s.startsWith("create trigger") && onTable(s));
const fnOf = (t: string) => (t.match(/execute (?:function|procedure) public\.([a-z_]+)\(/) ?? [])[1];
const body = (fn: string | undefined) => {
  if (!fn) return "";
  const def = own.find((s) => new RegExp(`^create (or replace )?function public\\.${fn}\\(`).test(s)) ?? "";
  return (def.match(/\$\$([\s\S]*)\$\$/) ?? [])[1] ?? "";
};
const nameOf = (t: string) => (t.match(/^create trigger ([a-z_]+)/) ?? [])[1] ?? "";
const enabledAlways = (name: string) =>
  own.some((s) => new RegExp(`^alter table (only )?public\\.${TABLE} enable always trigger ${name}$`).test(s));
const unconditionalRaise = (b: string) =>
  /\braise exception\b/.test(b) && !/\b(if|case|when)\b/.test(b) && !/current_user|session_user|auth\.(role|uid|jwt)|current_setting/.test(b);

const updDel = triggers.find((t) => /\bbefore update or delete\b|\bbefore delete or update\b/.test(t) && /for each row/.test(t));
check("immutability: a BEFORE UPDATE OR DELETE row trigger exists", Boolean(updDel));
check("immutability: its function raises unconditionally (no role test, no exception for anyone)",
  unconditionalRaise(body(fnOf(updDel ?? ""))), body(fnOf(updDel ?? "")));
check("immutability: it is ENABLE ALWAYS (fires under session_replication_role = replica too)",
  Boolean(updDel) && enabledAlways(nameOf(updDel!)));
const trunc = triggers.find((t) => /\bbefore truncate\b/.test(t));
check("immutability: a BEFORE TRUNCATE trigger exists (row triggers do not fire on TRUNCATE)", Boolean(trunc));
check("immutability: the TRUNCATE trigger raises unconditionally and is ENABLE ALWAYS",
  Boolean(trunc) && unconditionalRaise(body(fnOf(trunc!))) && enabledAlways(nameOf(trunc!)));
check("immutability: no migration disables a trigger on the table",
  !all.some((s) => onTable(s) && /\bdisable trigger\b/.test(s)) &&
  !all.some((s) => new RegExp(`alter table (only )?public\\.${TABLE} disable trigger`).test(s)));

// --- the insert trigger: database-set fields and the chain ------------------
const ins = triggers.find((t) => /\bbefore insert\b/.test(t) && /for each row/.test(t));
check("insert trigger: a BEFORE INSERT row trigger exists", Boolean(ins));
const ib = body(fnOf(ins ?? ""));
check("insert trigger: it is ENABLE ALWAYS", Boolean(ins) && enabledAlways(nameOf(ins!)));
check("insert trigger: reviewed_at is set from the database clock",
  /\bnew\.reviewed_at := [^;]*\b(now|clock_timestamp|transaction_timestamp|statement_timestamp)\(\)/.test(ib));
check("insert trigger: reviewer_id is set from auth.uid()", /\bnew\.reviewer_id := auth\.uid\(\)/.test(ib));
check("insert trigger: refuses anyone who is not a site operator, whatever their role",
  /if [^;]*not public\.is_site_operator\(\)[^;]* then raise exception/.test(ib));
const lockAt = ib.search(/\bpg_advisory_xact_lock\(|\block table\b[^;]*\bin (share row exclusive|exclusive|access exclusive) mode/);
const prevReadAt = ib.search(new RegExp(`\\bfrom public\\.${TABLE}\\b`));
check("insert trigger: takes a lock before reading the previous row", lockAt >= 0 && prevReadAt > lockAt,
  `lock at ${lockAt}, previous-row read at ${prevReadAt}`);
check("insert trigger: prev_row_hash comes from the previous row's row_hash",
  /\bnew\.prev_row_hash := [^;]*\.row_hash\b/.test(ib));
check("insert trigger: row_hash is a sha256 over the fields including prev_row_hash",
  /\bnew\.row_hash := [^;]*\bsha256\(/.test(ib) && /new\.prev_row_hash\)/.test(ib.slice(0, ib.search(/\bnew\.row_hash :=/))));
check("insert trigger: id is assigned under the lock (chain order is id order)",
  /\bnew\.id := /.test(ib) && ib.search(/\bnew\.id := /) > lockAt);
check("insert trigger: refuses isolation levels where the lock does not serialise the read",
  /transaction_isolation/.test(ib) && /raise exception/.test(ib));

// --- grants ------------------------------------------------------------------
const grants = all.filter((s) => s.startsWith("grant ") && onTable(s));
const revokes = own.filter((s) => s.startsWith("revoke ") && onTable(s));
const revokedFrom = (privilege: string, role: string) =>
  revokes.some((r) => new RegExp(`^revoke ([a-z, ]*\\b(${privilege}|all)\\b[a-z, ]*) on`).test(r) &&
    new RegExp(`\\bfrom\\b.*\\b${role}\\b`).test(r));
for (const role of ["anon", "authenticated", "service_role"]) {
  for (const privilege of ["update", "delete", "truncate"]) {
    check(`grants: ${privilege} revoked from ${role}`, revokedFrom(privilege, role));
  }
}
const badGrants = grants.filter((g) => /^grant ([a-z_, ()]*\b(update|delete|truncate|all)\b)/.test(g));
check("grants: no migration grants UPDATE, DELETE, TRUNCATE or ALL on the table", badGrants.length === 0, badGrants.join("\n      "));
const insertGrants = grants.filter((g) => /^grant [^o]*\binsert\b/.test(g));
check("grants: every INSERT grant is column-limited and omits the database-set columns",
  insertGrants.length >= 1 && insertGrants.every((g) => {
    const cols = (g.match(/\binsert \(([^)]*)\)/) ?? [])[1];
    return cols !== undefined && !/\b(id|reviewer_id|reviewed_at|row_hash|prev_row_hash|after_hash)\b/.test(cols);
  }),
  insertGrants.join("\n      "));
check("grants: INSERT goes to authenticated only (not service_role, anon or public)",
  insertGrants.every((g) => !/\bto\b.*\b(anon|public|service_role)\b/.test(g)));

const fnRevoked = (fn: string | undefined) => Boolean(fn) &&
  own.some((s) => new RegExp(`^revoke all on function public\\.${fn}\\(\\)`).test(s) &&
    ["public", "anon", "authenticated"].every((r) => new RegExp(`\\b${r}\\b`).test(s.split(" from ")[1] ?? "")));
check("functions: the insert trigger's function cannot be called by client roles", fnRevoked(fnOf(ins ?? "")));

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
