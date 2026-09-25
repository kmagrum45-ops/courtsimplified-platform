/**
 * Public reference data must not be read through a session-carrying client.
 *
 *   npm run test:public-data
 *
 * *** THE FAILURE THIS EXISTS FOR ***
 *
 * The forms page went blank with "Could not load forms — JWT issued in the
 * future". The court form catalogue is public: a read with the anon key alone
 * returns rows from every one of those tables, and nothing about them depends
 * on who is asking.
 *
 * But supabase-js attaches the stored session's access token to EVERY
 * PostgREST request made through a client that has one. So a rejected session
 * token — clock skew here, but a revoked or corrupted token does the same —
 * took down a query that never needed the session. A broken login blanked the
 * form library, and the error told the user the catalogue was gone.
 *
 * *** THE PROPERTY, NOT THE INSTANCE ***
 *
 * This does not pin today's call sites. It asserts that wherever one of these
 * public tables is read from browser code, the read goes through a client with
 * no session attached. Adding a new public table to the list is maintenance;
 * reading one through the signed-in client is the regression.
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";



const ROOT = path.resolve(import.meta.dirname, "..", "..");

/**
 * Tables that hold reference data, identical for every user.
 *
 * A table belongs here when the answer to "does who is asking change the
 * rows?" is no. If that ever stops being true for one of these, it comes off
 * the list — and that removal is a deliberate act with an obvious cause.
 */
const PUBLIC_TABLES = [
  "court_form_master_view",
  "court_form_library",
  "pdf_overlay_fields",
];

const failures: string[] = [];
let passed = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) passed += 1;
  else failures.push(detail ? `${name}\n      ${detail}` : name);
}

/**
 * Every client-side source file under app/.
 *
 * Server routes under app/api are excluded: they legitimately construct a
 * client with a caller's bearer token, which is how they enforce who is asking.
 */
function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "api" || entry.name === "node_modules") continue;
      found.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

const files = walk(path.join(ROOT, "app"));

let reads = 0;

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (!source.includes('"use client"')) continue;

  for (const table of PUBLIC_TABLES) {
    /*
     * READS ONLY.
     *
     * The first version matched every `.from("table")` and flagged an
     * `.upsert` in the admin field mapper — a WRITE, which genuinely needs the
     * session to establish who is writing. Requiring `.select` next keeps the
     * check to the case it is actually about: public data being read through a
     * client whose session can fail.
     *
     * The whitespace class spans newlines because a formatter puts `.select`
     * on its own line.
     */
    const pattern = new RegExp(
      `(\\w+)\\s*\\.from\\(\\s*["']${table}["']\\s*\\)\\s*\\.select`,
      "gs",
    );

    for (const match of source.matchAll(pattern)) {
      reads += 1;
      const client = match[1];
      check(
        `${path.relative(ROOT, file)}: ${table} is read without a session`,
        /public/i.test(client),
        `read through \`${client}\`, which carries the signed-in session. A rejected ` +
          `token would blank this public data and report it as missing. Use the ` +
          `session-free client from src/lib/supabase/client.ts.`,
      );
    }
  }
}

/*
 * The scan has to actually find something.
 *
 * A regex that matches nothing passes every assertion and reports success,
 * which is the worst possible outcome for a check like this — it would go
 * green forever after a refactor renamed the call sites.
 */
check(
  "the scan found public-table reads to check",
  reads > 0,
  `matched none in ${files.length} client file(s) — the pattern has stopped matching, ` +
    `so this suite is asserting nothing`,
);

console.log("");
console.log("PUBLIC DATA");
console.log("");
console.log(`  ${reads} read(s) of ${PUBLIC_TABLES.length} public table(s) across ${files.length} client file(s)`);
console.log(`  ${passed} check(s) passed`);
console.log("");

if (failures.length > 0) {
  console.log(`${failures.length} FAILURE(S):`);
  console.log("");
  for (const failure of failures) console.log(`  - ${failure}`);
  console.log("");
  process.exitCode = 1;
} else {
  console.log("  All checks passed.");
  console.log("");
}
