/**
 * Client-side OCR is treated as a suggestion, never as text the server read, and a
 * low-confidence reading asks the user for details instead of claiming success.
 *
 * WHAT THIS CATCHES:
 *
 *   1. The low-confidence threshold drifting between the browser module and the
 *      route. The browser would show a confident result and the server would file it
 *      as needing details, or worse the reverse — a guess stored as fact.
 *
 *   2. Client OCR text overriding a PDF text layer the server read perfectly well.
 *      That would let a request replace the contents of a readable document.
 *
 *   3. An empty or absent confidence being read as a GOOD confidence, which would
 *      let a client skip the user-review step by omitting a field.
 *
 *   4. `needs-details` not being an allowed extraction_status in the schema, which
 *      would make every low-confidence OCR write fail the CHECK at runtime — a
 *      failure that only appears against a real database.
 *
 * *** WHY SO MUCH OF THIS IS ASSERTED AGAINST SOURCE TEXT ***
 *
 * The route's decisions live inside a request handler that needs an authenticated
 * user, an owned case, a storage object and a database. Running it here would mean
 * standing all of that up to assert four branches. So the numbers and the schema are
 * checked by reading the files, and the BEHAVIOUR is checked end to end in Part 6's
 * integration tests, where a real account and a real object exist.
 *
 * That split is a limitation and is written down rather than glossed: a source-level
 * check proves the constant agrees, not that the branch runs. It is stated in the
 * report the same way.
 *
 * COSTS NOTHING. File reads and pure functions. No model, no network, no database,
 * and no browser — tesseract itself cannot run here, which is exactly why the
 * server-side fallback exists.
 *
 * Run: node --import tsx scripts/verification/verifyWorkspaceOcr.ts
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { LOW_CONFIDENCE, MAX_OCR_PAGES, browserCanRunOcr } from "../../src/lib/case-workspace/clientOcr";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

const ROUTE = path.join(ROOT, "app", "api", "workspace", "documents", "extract", "route.ts");
const OCR_MIGRATION = path.join(
  ROOT,
  "supabase",
  "migrations",
  "20260927120000_workspace_ocr_and_needs_details.sql",
);

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

const read = (file: string): string => {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
};

/**
 * Source with comments removed, for every check that asserts what the CODE does.
 *
 * *** WHY THIS IS NECESSARY, FOUND THE HARD WAY ***
 *
 * The check for the Vite-only `?url` import form FAILED against correct code,
 * because `clientOcr.ts` contains a comment explaining that `?url` does not work
 * under Next — the exact hazard the check exists to catch, described in prose.
 *
 * A source-level check that reads comments punishes documenting the thing it is
 * looking for, and the fix a hurried reader would reach for is to delete the
 * comment. This repository has been here before: the absence-claims gate once
 * tripped on its own explanatory template.
 *
 * Line comments are only stripped where the line STARTS with `//` or `*`, so a
 * `https://` inside real code is left alone.
 */
const withoutComments = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trimStart();
      return !trimmed.startsWith("//") && !trimmed.startsWith("*");
    })
    .join("\n");

console.log("");
console.log("WORKSPACE CLIENT-SIDE OCR");
console.log("");

const routeSource = withoutComments(read(ROUTE));
const migrationSql = read(OCR_MIGRATION);

// ---------------------------------------------------------------------------
// 1. The browser and the server agree on what "low confidence" means
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  if (routeSource.length === 0) {
    problems.push(`the extract route is missing at ${ROUTE}`);
  } else {
    const match = routeSource.match(/const LOW_OCR_CONFIDENCE = (\d+(?:\.\d+)?)\s*;/);

    if (!match) {
      problems.push(
        "LOW_OCR_CONFIDENCE could not be found in the route, so the two thresholds " +
          "cannot be compared. If it was renamed, update this check.",
      );
    } else if (Number(match[1]) !== LOW_CONFIDENCE) {
      problems.push(
        `the route uses ${match[1]} and clientOcr.ts uses ${LOW_CONFIDENCE}. The ` +
          `browser would tell the user one thing and the server would record another.`,
      );
    }
  }

  if (problems.length === 0) {
    pass(`the browser and the route both treat confidence below ${LOW_CONFIDENCE} as needing details`);
  } else {
    fail("the low-confidence thresholds have drifted", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 2. A missing or bad confidence is read as ZERO, not as good
// ---------------------------------------------------------------------------

{
  /*
   * The direction matters more than the value. An unparseable confidence must push
   * the document TOWARDS review, because the alternative is a client omitting the
   * field to have a guess accepted as fact.
   *
   * Asserted on the route's source because acceptClientOcr is module-private to the
   * route file. Extracting it purely to make it testable would move a security
   * decision away from the handler that depends on it.
   */
  const problems: string[] = [];

  /*
   * *** ONE PATTERN FOR THE WHOLE EXPRESSION, AND WHY ***
   *
   * This was three loose patterns, and a mutation changing the fallback from 0 to
   * 100 — the exact failure the check names — went straight through. The pattern
   * `/:\s*0;/` matched, just not here: the route has a second `: 0;`, the fallback
   * for a missing extraction_started_at, twelve lines away.
   *
   * A regex that can be satisfied by an unrelated line somewhere else in the file
   * is not a check. So the whole conditional is matched as one shape, which cannot
   * be satisfied by accident.
   */
  const clampPattern =
    /Number\.isFinite\(confidenceRaw\)\s*\?\s*Math\.min\(100,\s*Math\.max\(0,\s*confidenceRaw\)\)\s*:\s*0;/;

  if (!clampPattern.test(routeSource)) {
    problems.push(
      "the confidence is not resolved by exactly `Number.isFinite(confidenceRaw) ? " +
        "Math.min(100, Math.max(0, confidenceRaw)) : 0`. A non-finite value must fall " +
        "back to 0 — towards review — because defaulting high lets a client have a " +
        "guess accepted as fact by omitting the field.",
    );
  }
  /*
   * Empty text must be refused outright rather than stored at low confidence. An
   * empty success arriving from a browser is still an empty success.
   */
  if (!/if \(text\.length === 0\) return null;/.test(routeSource)) {
    problems.push("empty client OCR text is not rejected outright");
  }

  if (problems.length === 0) {
    pass("a missing, non-numeric or out-of-range confidence becomes 0, and empty text is refused");
  } else {
    fail("client OCR input is not validated safely", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 3. The server's own text always wins over the browser's guess
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  if (!/const usingClientOcr = outcome\.status !== "done";/.test(routeSource)) {
    problems.push(
      "client OCR is not gated on the server extraction having failed. If a readable " +
        "PDF can be overridden by a request payload, a request can replace the " +
        "contents of a document.",
    );
  }

  /*
   * And the personal-data scan must run over the text that ARRIVED, not be taken on
   * trust from the client. Asserted by the scan call sitting after the text is
   * chosen, with the chosen text as its argument.
   */
  if (!/const scan = scanForPersonalData\(text\);/.test(routeSource)) {
    problems.push(
      "the personal-data scan does not run over the resolved text on the server, so a " +
        "client could avoid the warning by omitting a field",
    );
  }

  if (problems.length === 0) {
    pass("client OCR is used only where server extraction produced nothing, and the server rescans");
  } else {
    fail("client input can displace server extraction", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 4. The schema allows the status the route writes
// ---------------------------------------------------------------------------

{
  /*
   * *** THE FAILURE THIS EXISTS FOR ***
   *
   * extraction_status carries a CHECK constraint. A route that writes a value the
   * CHECK forbids does not fail in a typechecker, a linter or any pure test — it
   * fails at runtime, against a real database, on the first low-confidence
   * photograph a user uploads. This reads both sides and requires them to agree.
   */
  const problems: string[] = [];

  const statusesWritten = new Set(
    [...routeSource.matchAll(/extraction_status:\s*"([a-z-]+)"/g)].map((m) => m[1]),
  );
  // The computed one, which the pattern above cannot see.
  const computed = routeSource.match(/needsDetails \? "([a-z-]+)" : "([a-z-]+)"/);
  if (computed) {
    statusesWritten.add(computed[1]);
    statusesWritten.add(computed[2]);
  }

  if (statusesWritten.size === 0) {
    problems.push("no extraction_status writes were found in the route, so nothing is compared");
  }

  if (migrationSql.length === 0) {
    problems.push(`the OCR migration is missing at ${OCR_MIGRATION}`);
  }

  /*
   * The allowed set comes from the LAST CHECK defined for this constraint across all
   * migrations, because the OCR migration replaces the original. Reading the first
   * one would compare the route against a constraint that no longer exists.
   */
  const allMigrations = path.join(ROOT, "supabase", "migrations");
  const files = readdirSync(allMigrations).filter((f) => f.endsWith(".sql")).sort();

  let allowed: Set<string> | null = null;
  for (const file of files) {
    const sql = read(path.join(allMigrations, file));
    const constraint = sql.match(
      /CONSTRAINT "workspace_documents_extraction_status" CHECK \(([\s\S]*?)\);/,
    );
    if (constraint) {
      allowed = new Set([...constraint[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]));
    }
  }

  if (allowed === null) {
    problems.push("no extraction_status CHECK constraint was found in any migration");
  } else {
    for (const status of statusesWritten) {
      if (!allowed.has(status)) {
        problems.push(
          `the route writes extraction_status "${status}" and the CHECK does not ` +
            `permit it (allowed: ${[...allowed].join(", ")}). Every write of this ` +
            `value will fail against a real database.`,
        );
      }
    }
    if (!allowed.has("needs-details")) {
      problems.push("'needs-details' is not in the CHECK, so low-confidence OCR cannot be recorded");
    }
  }

  if (problems.length === 0) {
    pass(
      `all ${statusesWritten.size} statuses the route writes are permitted by the ` +
        `CHECK (${[...(allowed as Set<string>)].length} allowed)`,
    );
  } else {
    fail("the route and the schema disagree about extraction_status", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 5. The confidence column exists and is range-checked
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  if (!/ADD COLUMN IF NOT EXISTS "extraction_confidence"/.test(migrationSql)) {
    problems.push("extraction_confidence is not added by the migration");
  }
  if (!/extraction_confidence" IS NULL/.test(migrationSql)) {
    problems.push("the range CHECK does not permit NULL, but non-OCR methods store NULL");
  }
  if (!/>= 0 AND "extraction_confidence" <= 100/.test(migrationSql)) {
    problems.push("the confidence is not range-checked to 0-100 in the schema");
  }
  if (!/extraction_confidence: confidence/.test(routeSource)) {
    problems.push("the route does not write extraction_confidence");
  }
  /*
   * NULL rather than 100 for a text layer. A PDF whose text was read exactly is not
   * "100% confident" — it is not a guess at all, and recording 100 would make the two
   * impossible to tell apart in a query.
   */
  if (!/usingClientOcr \?[^:]*\.confidence : null/.test(routeSource)) {
    problems.push("a non-OCR extraction does not store NULL confidence");
  }

  if (problems.length === 0) {
    pass("extraction_confidence exists, permits NULL, is range-checked, and is NULL for non-OCR");
  } else {
    fail("the confidence column is wrong", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 6. The browser capability check, and the fallback it protects
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  /*
   * In Node there is no `window`, so this must be false. That is the same answer it
   * gives in a browser too old to run WebAssembly, and it is what keeps the
   * server-side `skipped` path reachable as the documented fallback.
   */
  if (browserCanRunOcr() !== false) {
    problems.push(
      "browserCanRunOcr() returned true with no window, so it is not actually " +
        "checking capability and would let OCR be offered where it cannot run",
    );
  }

  if (MAX_OCR_PAGES < 1) {
    problems.push("MAX_OCR_PAGES is below 1, so no page would ever be read");
  }

  const clientSource = withoutComments(
    read(path.join(ROOT, "src", "lib", "case-workspace", "clientOcr.ts")),
  );

  // A worker holding tens of megabytes must be terminated even on the throw path.
  if (!/finally \{[\s\S]*?worker\?\.terminate\(\)/.test(clientSource)) {
    problems.push(
      "the tesseract worker is not terminated in a finally block. An abandoned worker " +
        "is what makes the NEXT upload fail with an unrelated-looking out-of-memory error.",
    );
  }

  // The `?url` import form is Vite-only and does not compile under Next.
  if (/pdf\.worker[^"']*\?url/.test(clientSource)) {
    problems.push(
      "the pdfjs worker is imported with the Vite-only `?url` suffix, which does not " +
        "resolve under Next",
    );
  }

  // Both languages, or a French letter loses the accents that carry its dates.
  if (!/["']eng\+fra["']/.test(clientSource)) {
    problems.push("tesseract is not initialised with both English and French");
  }

  if (problems.length === 0) {
    pass(
      `capability is checked before offering OCR, both languages are loaded, and the ` +
        `worker is terminated on every path (max ${MAX_OCR_PAGES} pages)`,
    );
  } else {
    fail("the browser OCR module is unsafe or incomplete", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 7. The refused processor is gone, and recorded as refused
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  const packageJson = JSON.parse(read(path.join(ROOT, "package.json")) || "{}") as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const declared = { ...packageJson.dependencies, ...packageJson.devDependencies };

  if ("@adobe/pdfservices-node-sdk" in declared) {
    problems.push(
      "@adobe/pdfservices-node-sdk is still declared in package.json. An unused SDK " +
        "reads like an approved route somebody already cleared, and it cleared nothing.",
    );
  }

  const inventory = read(path.join(ROOT, "docs", "security", "DATA_FLOW_INVENTORY.md"));

  if (!/REFUSED PROCESSORS/i.test(inventory)) {
    problems.push("DATA_FLOW_INVENTORY.md has no refused-processors section");
  } else if (!/Adobe PDF Services/.test(inventory)) {
    problems.push("Adobe is not recorded in the refused-processors list");
  } else if (!/residency/i.test(inventory)) {
    problems.push("the refusal is recorded without the data-residency reason");
  }

  if (problems.length === 0) {
    pass("the Adobe SDK is removed from package.json and recorded as a refused processor with its reason");
  } else {
    fail("the refused processor is not properly retired", problems.join("\n"));
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
