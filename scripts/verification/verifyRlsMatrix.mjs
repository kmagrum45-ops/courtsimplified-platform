/**
 * Every RLS scenario, attacked for real: two litigants, an anonymous visitor and the
 * service role against a database built from supabase/migrations/, on every table.
 *
 * WHAT THIS CATCHES: one person reading, changing, deleting, forging or hijacking
 * another person's case data or files; anonymous access to anything private; a client
 * role writing the shared court-form catalogue; and — the one that matters most over
 * time — a NEW table, view or function added without a security decision.
 *
 * *** HOW IT DIFFERS FROM THE SUITES ALREADY HERE ***
 *
 *   test:anon-grants, test:case-rls-contract  read migration TEXT. They prove a policy
 *     is written, not that it works.
 *   test:workspace-rls  attacks the live staging project through the real API, for the
 *     four workspace tables and the bucket. Real, but needs secrets and covers 4 of 31.
 *   THIS SUITE  builds a throwaway Postgres, applies every migration exactly as a
 *     project would, then attacks ALL of it as PostgREST would (SET ROLE + JWT claims).
 *     No Supabase project, no network, no secrets, about ten seconds. Runs in CI.
 *
 * *** THE TWO RULES THAT MAKE AN RLS TEST MEAN ANYTHING ***
 *
 * RLS filters; it does not error. A blocked SELECT returns zero rows, and so does a
 * typo. So every "cannot see" check is paired with a positive control in the same
 * transaction: the attacker must see THEIR OWN row, and the service role must see the
 * victim's. A zero without its control is reported as a broken test, not a pass.
 *
 * Every check asserts a property, never today's value (CLAUDE.md §5): the attacks are
 * generated from scripts/verification/rls/rlsManifest.mjs and from the live catalogue
 * of tables, so a new table gets the full matrix without anyone writing a test.
 *
 * *** KNOWN GAPS ***
 *
 * Findings not yet fixed are listed in the manifest's knownGaps and reported as GAP,
 * not FAIL. A listed gap that starts passing FAILS the suite until its line is deleted.
 * See docs/security/RLS_GAP_ANALYSIS.md.
 *
 * *** WHERE THE DATABASE COMES FROM ***
 *
 * RLS_DATABASE_URL, if set, must point at a DISPOSABLE server: the suite creates and
 * drops its own database there. Never point it at a Supabase project. Otherwise the
 * suite starts a private Postgres from the local install (`pg_config --bindir` or
 * /usr/lib/postgresql/<n>/bin) and removes it afterwards. GitHub's ubuntu runners
 * ship one.
 *
 * Extensions only the Supabase platform has (pg_net, pg_graphql, supabase_vault) are
 * skipped when migrations are applied; nothing in our policies uses them. The parts of
 * Supabase our policies DO use are stood in for by scripts/verification/rls/supabaseBootstrap.sql,
 * which copies Supabase's own definitions.
 *
 * COSTS: nothing. No model, no network, no secrets. Run: npm run test:rls-matrix
 * Flags: --verbose prints every check; --keep leaves the database up for poking.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, chownSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import * as manifest from "./rls/rlsManifest.mjs";

const VERBOSE = process.argv.includes("--verbose");
const KEEP = process.argv.includes("--keep");
const ROOT = process.cwd();
const MIGRATIONS = path.join(ROOT, "supabase/migrations");
const BOOTSTRAP = path.join(ROOT, "scripts/verification/rls/supabaseBootstrap.sql");
const PLATFORM_ONLY_EXTENSIONS = ["pg_net", "pg_graphql", "supabase_vault"];

// ---------------------------------------------------------------------------
// Identities. Fixed so a failure message is reproducible by hand.
// ---------------------------------------------------------------------------

const uuidFor = (label) => {
  const h = createHash("md5").update(`rls-matrix:${label}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const VICTIM = uuidFor("user:victim");
const ATTACKER = uuidFor("user:attacker");
// A third account, listed in site_operators: the one identity allowed to edit the
// overlay map. Proves that rule lets the operator in, not only that it keeps others out.
const OPERATOR = uuidFor("user:operator");
const OWNERS = { victim: VICTIM, attacker: ATTACKER, operator: OPERATOR };

// ---------------------------------------------------------------------------
// A private Postgres
// ---------------------------------------------------------------------------

function findPgBin() {
  if (process.env.RLS_PG_BIN) return process.env.RLS_PG_BIN;
  const fromConfig = spawnSync("pg_config", ["--bindir"], { encoding: "utf8" });
  if (fromConfig.status === 0 && existsSync(path.join(fromConfig.stdout.trim(), "initdb"))) {
    return fromConfig.stdout.trim();
  }
  const base = "/usr/lib/postgresql";
  if (existsSync(base)) {
    const versions = readdirSync(base).filter((v) => existsSync(path.join(base, v, "bin/initdb")));
    versions.sort((a, b) => Number(b) - Number(a));
    if (versions.length) return path.join(base, versions[0], "bin");
  }
  return null;
}

/** initdb refuses to run as root, so as root everything server-side runs as `postgres`. */
const asRoot = typeof process.getuid === "function" && process.getuid() === 0;
const serverCmd = (bin, args) => (asRoot ? ["runuser", ["-u", "postgres", "--", bin, ...args]] : [bin, args]);

let server = null; // { dir, socket, port, bin }
let conn = null; // psql connection args
const dbName = `rls_matrix_${process.pid}`;

function startServer() {
  if (process.env.RLS_DATABASE_URL) {
    conn = { url: process.env.RLS_DATABASE_URL };
    return;
  }
  const bin = findPgBin();
  if (!bin) {
    throw new Error(
      "No local Postgres found (looked at RLS_PG_BIN, pg_config, /usr/lib/postgresql/*/bin). " +
        "Install postgresql, or set RLS_DATABASE_URL to a disposable server.",
    );
  }
  // As root, the postgres user must be able to reach the directory, and a nested
  // private tmpdir may not be traversable. /var/tmp always is.
  const parent = asRoot ? "/var/tmp" : tmpdir();
  const dir = mkdtempSync(path.join(parent, "rls-matrix-"));
  chmodSync(dir, 0o700);
  if (asRoot) {
    const pw = spawnSync("id", ["-u", "postgres"], { encoding: "utf8" });
    const pg = spawnSync("id", ["-g", "postgres"], { encoding: "utf8" });
    chownSync(dir, Number(pw.stdout), Number(pg.stdout));
  }
  const data = path.join(dir, "data");
  const port = String(55000 + (process.pid % 5000));

  const run = (b, args) => {
    const [cmd, a] = serverCmd(path.join(bin, b), args);
    const r = spawnSync(cmd, a, { encoding: "utf8" });
    if (r.status !== 0) throw new Error(`${b} failed: ${r.stderr || r.stdout}`);
  };
  run("initdb", ["-D", data, "-A", "trust", "-U", "postgres", "--no-sync"]);
  run("pg_ctl", [
    "-D", data, "-w", "-l", path.join(dir, "server.log"),
    "-o", `-p ${port} -k ${dir} -c listen_addresses= -c fsync=off`,
    "start",
  ]);
  server = { dir, data, port, bin };
  conn = { host: dir, port, user: "postgres" };
}

function stopServer() {
  if (!server) return;
  const [cmd, a] = serverCmd(path.join(server.bin, "pg_ctl"), ["-D", server.data, "-m", "immediate", "stop"]);
  spawnSync(cmd, a, { encoding: "utf8" });
  rmSync(server.dir, { recursive: true, force: true });
}

function psql(sql, { db = dbName, stopOnError = true } = {}) {
  const args = ["-X", "-q", "-tA", "-v", `ON_ERROR_STOP=${stopOnError ? 1 : 0}`, "-v", "VERBOSITY=verbose"];
  if (conn.url) {
    const url = new URL(conn.url);
    url.pathname = `/${db}`;
    args.push("-d", url.toString());
  } else {
    args.push("-h", conn.host, "-p", conn.port, "-U", conn.user, "-d", db);
  }
  const r = spawnSync("psql", args, { input: sql, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const sqlstate = /ERROR:\s+([0-9A-Z]{5}):/.exec(r.stderr ?? "")?.[1] ?? null;
  return { ok: r.status === 0 && !sqlstate, stdout: r.stdout ?? "", stderr: r.stderr ?? "", sqlstate };
}

const query = (sql) => {
  const r = psql(sql);
  if (!r.ok) throw new Error(`setup query failed: ${r.stderr}\n${sql.slice(0, 400)}`);
  return r.stdout.split("\n").filter(Boolean);
};

// ---------------------------------------------------------------------------
// Build the database
// ---------------------------------------------------------------------------

function buildDatabase() {
  const admin = conn.url ? new URL(conn.url).pathname.slice(1) || "postgres" : "postgres";
  const c = psql(`DROP DATABASE IF EXISTS ${dbName}; CREATE DATABASE ${dbName};`, { db: admin });
  if (!c.ok) throw new Error(`could not create ${dbName}: ${c.stderr}`);

  const b = psql(readFileSync(BOOTSTRAP, "utf8"));
  if (!b.ok) throw new Error(`bootstrap failed: ${b.stderr}`);

  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
  const skip = new RegExp(
    `^\\s*(CREATE EXTENSION IF NOT EXISTS|COMMENT ON EXTENSION) "(${PLATFORM_ONLY_EXTENSIONS.join("|")})".*$`,
    "gim",
  );
  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS, file), "utf8").replace(skip, "-- [rls-matrix] platform-only extension skipped");
    const r = psql(sql);
    if (!r.ok) throw new Error(`migration ${file} failed to apply: ${r.stderr}`);
  }
  // Used only by the suite's own self-test (verifyRlsMatrixCatches.mjs), which plants a
  // regression here and checks this suite fails on it.
  if (process.env.RLS_PLANT_SQL) {
    const r = psql(process.env.RLS_PLANT_SQL);
    if (!r.ok) throw new Error(`planted SQL failed to apply: ${r.stderr}`);
  }
  return files.length;
}

// ---------------------------------------------------------------------------
// Fixtures: one row per owner per user table, one row per catalogue table
// ---------------------------------------------------------------------------

function columnsOf(table) {
  return query(`
    SELECT column_name || '|' || data_type || '|' || is_nullable || '|' || (column_default IS NOT NULL)::text
           || '|' || (is_generated = 'ALWAYS' OR is_identity = 'YES')::text
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '${table}'
    ORDER BY ordinal_position`).map((l) => {
    const [name, type, nullable, hasDefault, generated] = l.split("|");
    return { name, type, nullable: nullable === "YES", hasDefault: hasDefault === "true", generated: generated === "true" };
  });
}

const lit = (v) => (v === null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);

function genericValue(col, seed) {
  const t = col.type;
  if (t === "uuid") return lit(uuidFor(seed));
  if (/int|numeric|double|real/.test(t)) return "1";
  if (t === "boolean") return "false";
  if (t === "date") return "'2026-01-01'";
  if (t.startsWith("timestamp")) return "now()";
  if (t === "jsonb" || t === "json") return "'{}'";
  if (t === "ARRAY") return "'{}'";
  return lit(`rls-probe-${seed}`.slice(0, 40));
}

/** Values that satisfy the CHECK constraints, where the generic value would not. */
const tableOverrides = {
  cases: () => ({ court_path: lit("small-claims") }),
  case_events: () => ({ court_path: lit("small-claims"), source: lit("user-stated"), event_type: lit("probe") }),
  case_event_candidate_dismissals: (k) => ({
    candidate_fingerprint: lit(createHash("sha256").update(k).digest("hex")),
    narrative_basis: lit("probe"),
  }),
  workspace_documents: (_k, ctx) => ({
    storage_path: lit(`${ctx.owner}/${ctx.caseId}/${ctx.rowId}`),
    mime: lit("application/pdf"),
    size_bytes: "1",
    sha256: lit("0".repeat(64)),
  }),
  workspace_timeline_events: () => ({ source: lit("user") }),
  workspace_communications: () => ({ direction: lit("sent"), method: lit("email") }),
  court_forms: () => ({ category: lit("family"), province: lit("ontario") }),
  ai_call_log: () => ({ call_type: lit("safety-pass"), validation_result: lit("valid") }),
  site_operators: () => ({ user_id: lit(OPERATOR) }),
  // One row, id 1 (CHECK "id" = 1).
  canlii_api_state: () => ({ id: "1" }),
};

/** Builds an INSERT for `table`. Every NOT NULL column without a default gets a value. */
function insertSql(table, key, extra = {}, ctx = {}) {
  const cols = columnsOf(table);
  const values = {};
  for (const c of cols) {
    if (c.generated) continue;
    if (!c.nullable && !c.hasDefault) values[c.name] = genericValue(c, `${table}:${key}:${c.name}`);
  }
  if (cols.some((c) => c.name === "id" && c.type === "uuid")) values.id = lit(ctx.rowId ?? uuidFor(`${table}:${key}`));
  else if (ctx.rowId && manifest.userOwned[table] && keyOf(table) !== "id") values[keyOf(table)] = lit(ctx.rowId);
  Object.assign(values, tableOverrides[table]?.(key, ctx) ?? {}, extra);
  const names = Object.keys(values);
  return `INSERT INTO public.${table} (${names.map((n) => `"${n}"`).join(", ")}) VALUES (${names.map((n) => values[n]).join(", ")})`;
}

const keyOf = (table) => manifest.userOwned[table]?.key ?? "id";
/** The primary-key value of `who`'s fixture row. A table keyed by its parent shares the parent's id. */
const rowIdOf = (table, who) => {
  const spec = manifest.userOwned[table];
  if (spec && keyOf(table) !== "id") return rowIdOf(spec.parent.table, who);
  return uuidFor(`${table}:${who}`);
};
const parentIdOf = (parent, who) => rowIdOf(parent.table, who);

/**
 * A key for a NEW row in `table` that collides with nothing. For a table keyed by its
 * parent, that is the victim's spare parent ("victim-bare"), seeded with no children —
 * otherwise an insert would hit the primary key and look refused when RLS allowed it.
 */
const freshKey = (table, label) =>
  keyOf(table) === "id"
    ? { id: lit(uuidFor(`${table}:${label}`)) }
    : { [keyOf(table)]: lit(rowIdOf(manifest.userOwned[table].parent.table, "victim-bare")) };

function ownedRowSql(table, who, overrides = {}) {
  const spec = manifest.userOwned[table];
  const owner = OWNERS[who] ?? OWNERS[who.split("-")[0]];
  const extra = { user_id: lit(owner) };
  if (spec.parent && keyOf(table) === "id") extra[spec.parent.column] = lit(parentIdOf(spec.parent, who));
  return insertSql(table, who, { ...extra, ...overrides }, {
    owner,
    caseId: (extra.case_id ?? overrides.case_id ?? lit(rowIdOf("cases", who))).replace(/'/g, ""),
    // A fresh id given by the caller must reach storage_path too, or the new row's path
    // duplicates the fixture's and the insert fails on a unique key instead of on RLS.
    rowId: overrides.id ? overrides.id.replace(/'/g, "") : rowIdOf(table, who),
  });
}

function seed() {
  const sql = [
    `INSERT INTO auth.users (id, email, role) VALUES (${lit(VICTIM)}, 'victim@probe.invalid', 'authenticated'), (${lit(ATTACKER)}, 'attacker@probe.invalid', 'authenticated'), (${lit(OPERATOR)}, 'operator@probe.invalid', 'authenticated');`,
  ];
  // Parents first: cases, then workspace_documents, then everything else.
  const order = Object.keys(manifest.userOwned).sort((a, b) => {
    const rank = (t) => (t === "cases" ? 0 : t === "workspace_documents" ? 1 : 2);
    return rank(a) - rank(b);
  });
  for (const t of order) for (const who of ["victim", "attacker"]) sql.push(`${ownedRowSql(t, who)};`);
  // A victim case and document with no children, for inserts keyed by their parent.
  sql.push(`${ownedRowSql("cases", "victim-bare")};`);
  sql.push(`${ownedRowSql("workspace_documents", "victim-bare")};`);
  // Spare victim parents for the secondary references (extraParents in the manifest).
  for (const t of new Set(Object.values(manifest.userOwned).flatMap((s) => (s.extraParents ?? []).map((e) => e.table)))) {
    if (t !== "cases" && t !== "workspace_documents") sql.push(`${ownedRowSql(t, "victim-bare")};`);
  }
  for (const t of Object.keys(manifest.catalogue)) sql.push(`${insertSql(t, "catalogue")};`);
  // A court_forms row OUTSIDE anon's window, to prove the window is enforced.
  sql.push(`${insertSql("court_forms", "outside-window", { category: lit("civil"), province: lit("ontario") })};`);
  for (const t of manifest.serverOnly) sql.push(`${insertSql(t, "server")};`);
  for (const who of ["victim", "attacker"]) {
    sql.push(
      `INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES (${lit(uuidFor(`obj:${who}`))}, 'case-evidence', ${lit(`${OWNERS[who]}/${rowIdOf("cases", who)}/file.pdf`)}, ${lit(OWNERS[who])});`,
    );
  }
  const r = psql(`BEGIN;\n${sql.join("\n")}\nCOMMIT;`);
  if (!r.ok) throw new Error(`fixtures could not be built: ${r.stderr}`);
}

// ---------------------------------------------------------------------------
// Running one attack
// ---------------------------------------------------------------------------

/**
 * Runs `body` as `role` (and as `who`, for authenticated) inside a transaction that
 * is always rolled back, so no check can change what the next one sees. `body` must
 * end in a SELECT of one value; the result is { value } or { denied: sqlstate }.
 */
function as(role, who, body) {
  const claims = role === "authenticated"
    ? JSON.stringify({ sub: OWNERS[who], role: "authenticated" })
    : JSON.stringify({ role });
  const sql = `BEGIN;
SET LOCAL ROLE ${role};
SELECT set_config('request.jwt.claims', ${lit(claims)}, true) \\g /dev/null
${body};
ROLLBACK;`;
  const r = psql(sql, { stopOnError: true });
  if (r.sqlstate) return { denied: r.sqlstate, message: r.stderr.trim().split("\n")[0] };
  if (!r.ok) return { error: r.stderr.trim() };
  const lines = r.stdout.split("\n").filter(Boolean);
  return { value: lines[lines.length - 1] };
}

const count = (role, who, sql) => as(role, who, `SELECT count(*) FROM (${sql}) AS q`);
const affected = (role, who, stmt) => as(role, who, `WITH w AS (${stmt} RETURNING 1) SELECT count(*) FROM w`);
const n = (r) => (r.value === undefined ? null : Number(r.value));

/**
 * Refused by the security layer: a permission error (42501 — a missing grant or an RLS
 * WITH CHECK), a view with nothing to write through (55000), or a write that touched
 * no row. ANY OTHER error is not a refusal — a
 * unique or foreign-key violation means RLS let the row through and something else
 * stopped it — so it makes the check INCONCLUSIVE rather than passing it.
 */
// 55000 is Postgres refusing to write through a view that is not auto-updatable:
// there is nothing beneath it a client could reach, which is the outcome wanted.
const SECURITY_REFUSALS = new Set(["42501", "55000"]);
const blocked = (r) => SECURITY_REFUSALS.has(r.denied) || n(r) === 0;
const inconclusive = (...rs) => rs.some((r) => r.error || (r.denied && !SECURITY_REFUSALS.has(r.denied)));
const describe = (r) => (r.denied ? `refused (${r.denied})` : r.error ? `ERROR ${r.error}` : `${r.value} row(s)`);

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

const results = []; // { id, ok, detail, status }

function check(id, ok, detail, ...raw) {
  const gap = manifest.knownGaps[id];
  let status;
  if (raw.length && inconclusive(...raw)) status = "BROKEN";
  else if (ok && gap) status = "FIXED";
  else if (ok) status = "pass";
  else if (gap) status = "GAP";
  else status = "FAIL";
  results.push({ id, status, detail, gap });
  if (VERBOSE || status === "FAIL" || status === "FIXED" || status === "BROKEN") {
    console.log(`${status.padEnd(5)} ${id}${detail ? `  — ${detail}` : ""}`);
  }
}

/** A control that must hold for the surrounding checks to mean anything. */
function control(id, ok, detail) {
  results.push({ id: `control:${id}`, status: ok ? "pass" : "BROKEN", detail });
  if (!ok || VERBOSE) console.log(`${ok ? "pass " : "BROKEN"} control:${id}  — ${detail}`);
}

// ---------------------------------------------------------------------------
// 1. Structural properties — catch the table nobody thought about
// ---------------------------------------------------------------------------

function structural() {
  const relations = query(
    `SELECT c.relname || '|' || c.relkind::text || '|' || c.relrowsecurity::text
     FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r','p','v','m','f')`,
  ).map((l) => {
    const [name, kind, rls] = l.split("|");
    return { name, kind, rls: rls === "true" || rls === "t" };
  });

  const declared = new Set([
    ...Object.keys(manifest.userOwned),
    ...Object.keys(manifest.catalogue),
    ...manifest.serverOnly,
    ...Object.keys(manifest.views),
  ]);

  for (const rel of relations) {
    check(`classified:${rel.name}`, declared.has(rel.name),
      declared.has(rel.name) ? "" : "not in rlsManifest.mjs — decide whether it is userOwned, catalogue, serverOnly or a view");
    if (rel.kind === "r" || rel.kind === "p") {
      check(`rls-enabled:${rel.name}`, rel.rls, rel.rls ? "" : "RLS is OFF: every grant on this table is live");
    }
  }
  for (const name of declared) {
    check(`manifest-entry-exists:${name}`, relations.some((r) => r.name === name),
      "listed in rlsManifest.mjs but no such relation — stale entry");
  }

  const publicPolicies = query(
    `SELECT tablename || '.' || policyname FROM pg_policies
     WHERE schemaname IN ('public','storage') AND 'public' = ANY (roles)`,
  );
  check("policies:none-apply-to-PUBLIC", publicPolicies.length === 0,
    publicPolicies.length ? `written with no TO clause, so they include anon: ${publicPolicies.join(", ")}` : "");

  const anonWrites = query(
    `SELECT table_name || ':' || privilege_type FROM information_schema.role_table_grants
     WHERE table_schema = 'public' AND grantee IN ('anon','PUBLIC')
       AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE')`,
  );
  check("grants:anon-has-no-write", anonWrites.length === 0, anonWrites.join(", "));

  const privateTables = [...Object.keys(manifest.userOwned), ...manifest.serverOnly];
  const anonOnPrivate = query(
    `SELECT table_name || ':' || privilege_type FROM information_schema.role_table_grants
     WHERE table_schema = 'public' AND grantee IN ('anon','PUBLIC')
       AND table_name IN (${privateTables.map(lit).join(",")})`,
  );
  check("grants:anon-has-nothing-on-private-tables", anonOnPrivate.length === 0, anonOnPrivate.join(", "));

  const truncate = query(
    `SELECT table_name FROM information_schema.role_table_grants
     WHERE table_schema = 'public' AND grantee = 'authenticated' AND privilege_type = 'TRUNCATE'
     ORDER BY 1`,
  );
  check("grants:authenticated-has-no-truncate", truncate.length === 0,
    truncate.length ? `TRUNCATE skips RLS entirely; held on ${truncate.length} tables (${truncate.slice(0, 4).join(", ")}…)` : "");

  const serverOnlyLeaks = query(
    `SELECT table_name || ':' || grantee || ':' || privilege_type FROM information_schema.role_table_grants
     WHERE table_schema = 'public' AND grantee IN ('anon','authenticated','PUBLIC')
       AND table_name IN (${manifest.serverOnly.map(lit).join(",")})`,
  );
  check("grants:server-only-tables-closed-to-clients", serverOnlyLeaks.length === 0, serverOnlyLeaks.join(", "));

  // Views run as their owner unless security_invoker, so RLS beneath them is skipped.
  const viewRows = query(
    `SELECT c.relname || '|' || coalesce(array_to_string(c.reloptions, ','), '') || '|' || v.is_updatable || '|' || v.is_insertable_into
     FROM pg_class c JOIN information_schema.views v ON v.table_schema = 'public' AND v.table_name = c.relname
     WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'v'`,
  );
  for (const row of viewRows) {
    const [name, options, updatable, insertable] = row.split("|");
    const invoker = /security_invoker=(true|on|1)/i.test(options);
    const writable = updatable === "YES" || insertable === "YES";
    const writers = query(
      `SELECT DISTINCT grantee FROM information_schema.role_table_grants
       WHERE table_schema = 'public' AND table_name = ${lit(name)}
         AND grantee IN ('anon','authenticated','PUBLIC') AND privilege_type IN ('INSERT','UPDATE','DELETE')`,
    );
    const ok = invoker || !writable || writers.length === 0;
    check(`view:${name}:owner-rights-not-writable-by-clients`, ok,
      ok ? "" : `runs as its owner (bypasses RLS), is auto-updatable, and ${writers.join("+")} hold write grants`);
  }

  const definers = query(
    `SELECT p.oid::regprocedure::text FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef`,
  );
  for (const fn of definers) {
    const callers = query(
      `SELECT r FROM unnest(ARRAY['anon','authenticated']) r WHERE has_function_privilege(r, ${lit(fn)}, 'EXECUTE')`,
    );
    const allowedRoles = manifest.definerFunctionsClientsMayCall[fn] ?? [];
    const unexpected = callers.filter((r) => !allowedRoles.includes(r));
    check(`function:${fn}:security-definer-not-callable-by-clients`, unexpected.length === 0,
      unexpected.length ? `runs with its owner's rights and ${unexpected.join("+")} can call it` : "");
    if (callers.length === 0) {
      const r = as("authenticated", "attacker", `SELECT ${fn.replace(/\(.*\)$/, "")}()`);
      check(`function:${fn}:call-refused-for-authenticated`, r.denied === "42501", describe(r));
    }
  }
}

// ---------------------------------------------------------------------------
// 2. User-owned tables — every operation, every role
// ---------------------------------------------------------------------------

function userOwnedMatrix() {
  for (const [table, spec] of Object.entries(manifest.userOwned)) {
    const t = `public.${table}`;
    const victimRow = rowIdOf(table, "victim");
    const attackerRow = rowIdOf(table, "attacker");
    const p = (s) => `owned:${table}:${s}`;
    const key = keyOf(table);

    // Controls: the rows exist, and the attacker can reach their own.
    const svc = count("service_role", null, `SELECT 1 FROM ${t} WHERE ${key} IN (${lit(victimRow)}, ${lit(attackerRow)})`);
    control(`${table}:service-role-sees-both-fixtures`, n(svc) === 2, describe(svc));
    const own = count("authenticated", "attacker", `SELECT 1 FROM ${t} WHERE ${key} = ${lit(attackerRow)}`);
    control(`${table}:owner-sees-own-row`, n(own) === 1, describe(own));

    // Read
    const read = count("authenticated", "attacker", `SELECT 1 FROM ${t} WHERE ${key} = ${lit(victimRow)}`);
    check(p("other-user-cannot-read"), n(read) === 0 && n(own) === 1, describe(read));
    const readAll = count("authenticated", "attacker", `SELECT 1 FROM ${t} WHERE user_id <> ${lit(ATTACKER)}`);
    check(p("other-user-sees-no-foreign-rows-in-full-scan"), n(readAll) === 0 && n(own) === 1, describe(readAll));

    // Change / delete
    const upd = affected("authenticated", "attacker", `UPDATE ${t} SET user_id = user_id WHERE ${key} = ${lit(victimRow)}`);
    check(p("other-user-cannot-update"), blocked(upd), describe(upd), upd);
    const del = affected("authenticated", "attacker", `DELETE FROM ${t} WHERE ${key} = ${lit(victimRow)}`);
    check(p("other-user-cannot-delete"), blocked(del), describe(del), del);

    // Forge: a new row in the victim's name
    const forge = as("authenticated", "attacker",
      `WITH w AS (${ownedRowSql(table, "victim", freshKey(table, "forged"))} RETURNING 1) SELECT count(*) FROM w`);
    check(p("cannot-insert-row-owned-by-someone-else"), blocked(forge), describe(forge), forge);

    // Hand one's own row to the victim (would plant data in their account)
    const give = affected("authenticated", "attacker", `UPDATE ${t} SET user_id = ${lit(VICTIM)} WHERE ${key} = ${lit(attackerRow)}`);
    check(p("cannot-reassign-own-row-to-someone-else"), blocked(give), describe(give), give);

    // Owner's own rights (positive — a policy that blocks everyone also "passes" the above)
    const ownUpd = affected("authenticated", "attacker", `UPDATE ${t} SET user_id = user_id WHERE ${key} = ${lit(attackerRow)}`);
    if (spec.clientWrites === false) {
      // Written only by server routes: the owner may read their rows, not write them.
      check(p("owner-cannot-write-directly-server-routes-only"), blocked(ownUpd), describe(ownUpd), ownUpd);
      const svcUpd = affected("service_role", null, `UPDATE ${t} SET user_id = user_id WHERE ${key} = ${lit(attackerRow)}`);
      control(`${table}:service-role-can-update`, n(svcUpd) === 1, describe(svcUpd));
    } else {
      control(`${table}:owner-can-update-own-row`, n(ownUpd) === 1, describe(ownUpd));
    }

    /*
     * Ownership of a row's parent is enforced by a composite foreign key, which binds
     * EVERY role — so it is attacked as the service role too, where RLS and grants are
     * out of the picture and only the key can refuse. 23503 is that refusal.
     */
    const OWNERSHIP_KEY = "23503";
    const refusedByKey = (r) => r.denied === OWNERSHIP_KEY;

    // Attach own row to the victim's case or document
    if (spec.parent) {
      // The victim's spare parent: no children, so nothing but RLS can refuse the row.
      const victimParent = parentIdOf(spec.parent, "victim-bare");
      const attach = as("authenticated", "attacker",
        `WITH w AS (${ownedRowSql(table, "attacker", {
          ...freshKey(table, "attached"),
          [spec.parent.column]: lit(victimParent),
          ...(spec.storagePathColumn ? { [spec.storagePathColumn]: lit(`${ATTACKER}/x/${uuidFor("attach-path")}`) } : {}),
          ...(table === "case_event_candidate_dismissals" ? { candidate_fingerprint: lit(createHash("sha256").update("attached").digest("hex")) } : {}),
        })} RETURNING 1) SELECT count(*) FROM w`);
      const move = affected("authenticated", "attacker",
        `UPDATE ${t} SET ${spec.parent.column} = ${lit(victimParent)} WHERE ${key} = ${lit(attackerRow)}`);
      // Keep storage_path consistent with the new case, so the path rule (F4) is not
      // what refuses this — only the ownership key should.
      const pathSet = spec.storagePathColumn
        ? `, ${spec.storagePathColumn} = ${lit(`${ATTACKER}/${victimParent}/${uuidFor("moved-path")}`)}`
        : "";
      const svcMove = affected("service_role", null,
        `UPDATE ${t} SET ${spec.parent.column} = ${lit(victimParent)}${pathSet} WHERE ${key} = ${lit(attackerRow)}`);
      const ok = (blocked(attach) || refusedByKey(attach)) && (blocked(move) || refusedByKey(move)) && refusedByKey(svcMove);
      const unexpected = [attach, move, svcMove].filter((r) => (r.denied && !SECURITY_REFUSALS.has(r.denied) && r.denied !== OWNERSHIP_KEY) || r.error);
      check(p("cannot-attach-to-other-users-parent"), ok && unexpected.length === 0,
        `insert under victim's ${spec.parent.table}: ${describe(attach)}; move own row there: ${describe(move)}; ` +
          `same move as service role: ${describe(svcMove)}`);
    }

    for (const extra of spec.extraParents ?? []) {
      const victimParent = rowIdOf(extra.table, "victim-bare");
      const svcMove = affected("service_role", null,
        `UPDATE ${t} SET ${extra.column} = ${lit(victimParent)} WHERE ${key} = ${lit(attackerRow)}`);
      const ownParent = rowIdOf(extra.table, extra.table === table ? "attacker-alt" : "attacker");
      check(p(`${extra.column}-cannot-point-at-other-users-${extra.table}`), refusedByKey(svcMove),
        `service role moving ${extra.column} to the victim's ${extra.table}: ${describe(svcMove)}`);
      if (extra.table !== table) {
        const svcOwn = affected("service_role", null,
          `UPDATE ${t} SET ${extra.column} = ${lit(ownParent)} WHERE ${key} = ${lit(attackerRow)}`);
        control(`${table}:${extra.column}-may-point-at-own-${extra.table}`, n(svcOwn) === 1, describe(svcOwn));
      }
    }

    if (spec.storagePathColumn) {
      const victimPath = `${VICTIM}/${rowIdOf("cases", "victim")}/file.pdf`;
      const point = affected("authenticated", "attacker",
        `UPDATE ${t} SET ${spec.storagePathColumn} = ${lit(victimPath)} WHERE ${key} = ${lit(attackerRow)}`);
      check(p("storage-path-stays-in-own-folder"), blocked(point),
        `point own row at the victim's stored file: ${describe(point)} (the export route signs whatever path the row holds)`, point);
      // The constraint holds for the service role too — the routes write with it.
      const svcPoint = affected("service_role", null,
        `UPDATE ${t} SET ${spec.storagePathColumn} = ${lit(victimPath)} WHERE ${key} = ${lit(attackerRow)}`);
      check(p("storage-path-bound-to-owner-for-every-role"), svcPoint.denied === "23514",
        `service role pointing the attacker's row at the victim's file: ${describe(svcPoint)}`);
      const svcOk = affected("service_role", null,
        `UPDATE ${t} SET ${spec.storagePathColumn} = ${lit(`${ATTACKER}/${rowIdOf("cases", "attacker")}/${uuidFor("own-path")}`)} WHERE ${key} = ${lit(attackerRow)}`);
      control(`${table}:own-folder-path-accepted`, n(svcOk) === 1, describe(svcOk));
    }

    // Anonymous visitor
    const aRead = count("anon", null, `SELECT 1 FROM ${t}`);
    check(p("anon-cannot-read"), aRead.denied !== undefined || n(aRead) === 0, describe(aRead));
    const aWrite = affected("anon", null, `UPDATE ${t} SET user_id = user_id`);
    check(p("anon-cannot-update"), blocked(aWrite), describe(aWrite), aWrite);
    const aDel = affected("anon", null, `DELETE FROM ${t}`);
    check(p("anon-cannot-delete"), blocked(aDel), describe(aDel), aDel);
    const aIns = as("anon", null, `WITH w AS (${ownedRowSql(table, "victim", freshKey(table, "anon"))} RETURNING 1) SELECT count(*) FROM w`);
    check(p("anon-cannot-insert"), blocked(aIns), describe(aIns), aIns);
  }
}

// ---------------------------------------------------------------------------
// 3. Catalogue, server-only and views
// ---------------------------------------------------------------------------

function catalogueMatrix() {
  for (const [table, spec] of Object.entries(manifest.catalogue)) {
    const t = `public.${table}`;
    const p = (s) => `catalogue:${table}:${s}`;
    const svc = count("service_role", null, `SELECT 1 FROM ${t}`);
    control(`${table}:fixture-present`, n(svc) >= 1, describe(svc));

    for (const role of ["anon", "authenticated"]) {
      const rule = role === "anon" ? spec.anonRead : spec.authenticatedRead;
      const seen = count(role, "attacker", `SELECT 1 FROM ${t}`);
      if (rule === true) {
        check(p(`${role}-can-read`), n(seen) === n(svc), `${describe(seen)} of ${n(svc)}`);
      } else if (rule && rule.where) {
        const inside = count("service_role", null, `SELECT 1 FROM ${t} WHERE ${rule.where}`);
        check(p(`${role}-reads-only-its-window`), n(seen) === n(inside) && n(inside) < n(svc),
          `${describe(seen)}; window holds ${n(inside)} of ${n(svc)}`);
      } else {
        check(p(`${role}-cannot-read`), seen.denied !== undefined || n(seen) === 0, describe(seen));
      }
    }

    for (const role of ["anon", "authenticated"]) {
      const ins = as(role, "attacker", `WITH w AS (${insertSql(table, `${role}-write`)} RETURNING 1) SELECT count(*) FROM w`);
      check(p(`${role}-cannot-insert`), blocked(ins), describe(ins), ins);
      const col = columnsOf(table).find((c) => !c.generated && c.name !== "id")?.name ?? "id";
      const upd = affected(role, "attacker", `UPDATE ${t} SET "${col}" = "${col}"`);
      check(p(`${role}-cannot-update`), blocked(upd), describe(upd), upd);
      const del = affected(role, "attacker", `DELETE FROM ${t}`);
      check(p(`${role}-cannot-delete`), blocked(del), describe(del), del);
    }

    if (spec.operatorWritable) {
      const col = columnsOf(table).find((c) => !c.generated && c.name !== "id")?.name ?? "id";
      const op = affected("authenticated", "operator", `UPDATE ${t} SET "${col}" = "${col}"`);
      control(`${table}:listed-operator-can-write`, n(op) === n(svc), `${describe(op)} of ${n(svc)}`);
    }
  }

  for (const table of manifest.serverOnly) {
    const t = `public.${table}`;
    const svc = count("service_role", null, `SELECT 1 FROM ${t}`);
    control(`${table}:fixture-present`, n(svc) >= 1, describe(svc));
    for (const role of ["anon", "authenticated"]) {
      const r = count(role, "attacker", `SELECT 1 FROM ${t}`);
      check(`server-only:${table}:${role}-cannot-read`, r.denied !== undefined || n(r) === 0, describe(r));
      const ins = as(role, "attacker", `WITH w AS (${insertSql(table, `${role}`)} RETURNING 1) SELECT count(*) FROM w`);
      check(`server-only:${table}:${role}-cannot-insert`, blocked(ins), describe(ins), ins);
    }
  }

  for (const [view, spec] of Object.entries(manifest.views)) {
    for (const role of spec.readers) {
      const r = count(role, "attacker", `SELECT 1 FROM public.${view}`);
      check(`view:${view}:${role}-can-read`, r.denied === undefined && !r.error, describe(r));
    }
    for (const role of ["anon", "authenticated"]) {
      const col = query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=${lit(view)} ORDER BY ordinal_position LIMIT 1`)[0];
      const upd = affected(role, "attacker", `UPDATE public.${view} SET "${col}" = "${col}"`);
      const del = affected(role, "attacker", `DELETE FROM public.${view}`);
      check(`view:${view}:${role}-cannot-write`, blocked(upd) && blocked(del),
        `update: ${describe(upd)}; delete: ${describe(del)}`, upd, del);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Storage
// ---------------------------------------------------------------------------

function storageMatrix() {
  for (const bucket of manifest.storage.privateBuckets) {
    const r = query(`SELECT coalesce(public, true)::text FROM storage.buckets WHERE id = ${lit(bucket)}`);
    check(`storage:${bucket}:bucket-is-private`, r[0] === "false", r.length ? `public = ${r[0]}` : "bucket not created by migrations");
  }

  for (const bucket of manifest.storage.userFolderBuckets) {
    const p = (s) => `storage:${bucket}:${s}`;
    const victimObj = uuidFor("obj:victim");
    const attackerObj = uuidFor("obj:attacker");
    const objs = "storage.objects";

    const own = count("authenticated", "attacker", `SELECT 1 FROM ${objs} WHERE id = ${lit(attackerObj)}`);
    control(`${bucket}:owner-sees-own-object`, n(own) === 1, describe(own));

    const read = count("authenticated", "attacker", `SELECT 1 FROM ${objs} WHERE id = ${lit(victimObj)}`);
    check(p("other-user-cannot-read-object"), n(read) === 0 && n(own) === 1, describe(read));
    const list = count("authenticated", "attacker", `SELECT 1 FROM ${objs} WHERE bucket_id = ${lit(bucket)} AND name NOT LIKE ${lit(`${ATTACKER}/%`)}`);
    check(p("other-user-cannot-list-foreign-objects"), n(list) === 0 && n(own) === 1, describe(list));
    const upd = affected("authenticated", "attacker", `UPDATE ${objs} SET metadata = '{}' WHERE id = ${lit(victimObj)}`);
    check(p("other-user-cannot-update-object"), blocked(upd), describe(upd), upd);
    const del = affected("authenticated", "attacker", `DELETE FROM ${objs} WHERE id = ${lit(victimObj)}`);
    check(p("other-user-cannot-delete-object"), blocked(del), describe(del), del);
    const plant = as("authenticated", "attacker",
      `WITH w AS (INSERT INTO ${objs} (bucket_id, name, owner) VALUES (${lit(bucket)}, ${lit(`${VICTIM}/planted.pdf`)}, ${lit(ATTACKER)}) RETURNING 1) SELECT count(*) FROM w`);
    check(p("cannot-upload-into-other-users-folder"), blocked(plant), describe(plant), plant);
    const move = affected("authenticated", "attacker",
      `UPDATE ${objs} SET name = ${lit(`${VICTIM}/moved.pdf`)} WHERE id = ${lit(attackerObj)}`);
    check(p("cannot-move-own-object-into-other-users-folder"), blocked(move), describe(move), move);
    const rootPlant = as("authenticated", "attacker",
      `WITH w AS (INSERT INTO ${objs} (bucket_id, name, owner) VALUES (${lit(bucket)}, 'loose.pdf', ${lit(ATTACKER)}) RETURNING 1) SELECT count(*) FROM w`);
    check(p("cannot-upload-outside-any-user-folder"), blocked(rootPlant), describe(rootPlant), rootPlant);
    const ownUp = as("authenticated", "attacker",
      `WITH w AS (INSERT INTO ${objs} (bucket_id, name, owner) VALUES (${lit(bucket)}, ${lit(`${ATTACKER}/new.pdf`)}, ${lit(ATTACKER)}) RETURNING 1) SELECT count(*) FROM w`);
    control(`${bucket}:owner-can-upload-to-own-folder`, n(ownUp) === 1, describe(ownUp));

    const aRead = count("anon", null, `SELECT 1 FROM ${objs} WHERE bucket_id = ${lit(bucket)}`);
    check(p("anon-cannot-read-objects"), aRead.denied !== undefined || n(aRead) === 0, describe(aRead));
    const aIns = as("anon", null,
      `WITH w AS (INSERT INTO ${objs} (bucket_id, name) VALUES (${lit(bucket)}, ${lit(`${VICTIM}/anon.pdf`)}) RETURNING 1) SELECT count(*) FROM w`);
    check(p("anon-cannot-upload"), blocked(aIns), describe(aIns), aIns);
  }

  // Bucket definitions are not something a client should be able to change.
  for (const role of ["anon", "authenticated"]) {
    const r = affected(role, "attacker", `UPDATE storage.buckets SET public = true`);
    check(`storage:buckets:${role}-cannot-make-a-bucket-public`, blocked(r), describe(r), r);
  }
}

// ---------------------------------------------------------------------------

function main() {
  const started = Date.now();
  let exitCode = 0;
  try {
    startServer();
    const applied = buildDatabase();
    seed();
    console.log(`rls-matrix: ${applied} migrations applied to a private Postgres; fixtures for 2 users and an operator built.\n`);

    structural();
    userOwnedMatrix();
    catalogueMatrix();
    storageMatrix();

    const by = (s) => results.filter((r) => r.status === s);
    const gaps = by("GAP");
    if (gaps.length) {
      console.log(`\nOpen gaps (known, listed in rlsManifest.mjs knownGaps; see docs/security/RLS_GAP_ANALYSIS.md):`);
      const grouped = {};
      for (const g of gaps) (grouped[g.gap] ??= []).push(g);
      for (const [finding, list] of Object.entries(grouped).sort()) {
        console.log(`  ${finding}: ${list.length} check(s)`);
        for (const g of list.slice(0, VERBOSE ? list.length : 3)) console.log(`      ${g.id} — ${g.detail}`);
        if (!VERBOSE && list.length > 3) console.log(`      … ${list.length - 3} more (--verbose)`);
      }
    }
    const fail = by("FAIL").length + by("FIXED").length + by("BROKEN").length;
    console.log(
      `\nrls-matrix: ${results.length} checks — ${by("pass").length} pass, ${gaps.length} known gap, ` +
        `${by("FAIL").length} FAIL, ${by("FIXED").length} fixed-but-still-listed, ${by("BROKEN").length} broken control ` +
        `(${((Date.now() - started) / 1000).toFixed(1)}s)`,
    );
    if (fail) exitCode = 1;
  } catch (error) {
    console.error(`rls-matrix could not run: ${error.message}`);
    exitCode = 1;
  } finally {
    if (KEEP && conn) {
      console.log(`--keep: database ${dbName} left running${server ? ` (psql -h ${server.dir} -p ${server.port} -U postgres -d ${dbName})` : ""}`);
    } else {
      stopServer();
    }
  }
  process.exit(exitCode);
}

main();
