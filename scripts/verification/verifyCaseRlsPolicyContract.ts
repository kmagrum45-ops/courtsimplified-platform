import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const builder = readFileSync("app/builder/page.tsx", "utf8");
const client = readFileSync("src/lib/supabase/client.ts", "utf8");
// RLS/policy DDL survives `supabase migration squash` (it's schema, not
// DML), so this only ever needed to stop pointing at one specific migration
// filename -- reading every current migration file, whatever they're named
// or however many there are, is what actually keeps this check correct
// after any future squash. (Previously read the single, now-deleted
// baseline file by its exact 2026-07-07 name.)
const migrationsDir = "supabase/migrations";
const baselineSchema = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .map((file) => readFileSync(path.join(migrationsDir, file), "utf8"))
  .join("\n");

assert.match(builder, /user_id:\s*user\.id/, "Case creation must use the authenticated user's ID.");
// Asserts the property -- the update that writes the case's master_result is
// scoped to the selected case id -- not today's spelling of the payload. It
// used to require `master_result: masterPayload,` exactly, and failed when the
// payload became `{ ...masterPayload, derivedFrom, ... }` though the scoping
// was unchanged (found 2026-09-28, CI red on main).
// The payload may span lines (2026-10-04: it gained a preserved `position`).
// Inspect the actual update chain, independently of payload spread ordering.
// Queue identity must match the row filter; owner and court filters stay present.
const tree = ts.createSourceFile("builder.tsx", builder, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let inspected = 0;
function inspect(node: ts.Node): void {
  if (ts.isVariableDeclaration(node) && node.initializer) {
    let cursor: ts.Node = node.initializer;
    let cases = false, master = false;
    const filters = new Map<string, string>();
    while (ts.isCallExpression(cursor) && ts.isPropertyAccessExpression(cursor.expression)) {
      const method = cursor.expression.name.text;
      const args = cursor.arguments;
      if (method === "from" && args[0] && ts.isStringLiteral(args[0]) && args[0].text === "cases") cases = true;
      if (method === "update" && args[0] && ts.isObjectLiteralExpression(args[0])) master = args[0].properties.some(property => ts.isPropertyAssignment(property) && property.name.getText(tree) === "master_result");
      if (method === "eq" && args[0] && ts.isStringLiteral(args[0]) && args[1]) filters.set(args[0].text, args[1].getText(tree).replace(/!/g, ""));
      cursor = cursor.expression.expression;
    }
    if (cases && master) {
      let queue: ts.Node | undefined = node.parent;
      while (queue && !(ts.isCallExpression(queue) && queue.expression.getText(tree) === "runCaseWrite")) queue = queue.parent;
      assert.ok(queue && ts.isCallExpression(queue), "A case master update must remain in the canonical write queue.");
      assert.equal(filters.get("id"), queue.arguments[0]?.getText(tree), "The write must target the case selected by its queue.");
      assert.equal(filters.get("user_id"), "user.id", "The write must filter the authenticated owner.");
      assert.equal(filters.get("court_path"), "courtPath", "The write must filter the selected court.");
      inspected++;
    }
  }
  ts.forEachChild(node, inspect);
}
inspect(tree);
assert.ok(inspected > 0, "The builder master-update scope check must not be empty.");
assert.doesNotMatch(client, /SUPABASE_SERVICE_ROLE_KEY|service_role/, "Browser Supabase client must not use service-role credentials.");

// pg_dump quotes every identifier, so these tolerate optional double quotes
// around public and cases. Without that they miss the real DDL entirely.
assert.match(
  baselineSchema,
  /create\s+policy[\s\S]{0,800}?on\s+(?:"?public"?\.)?"?cases"?/i,
  "Baseline schema must declare row-level policies on public.cases.",
);
assert.match(
  baselineSchema,
  /alter\s+table\s+(?:"?public"?\.)?"?cases"?\s+enable\s+row\s+level\s+security/i,
  "Baseline schema must enable row level security on public.cases.",
);
assert.match(
  baselineSchema,
  /create\s+policy[^;]{0,600}"?cases"?[^;]{0,600}"?auth"?\.\s*"?uid"?/i,
  "Case policies must be scoped to the authenticated user via auth.uid().",
);

console.log("Case RLS contract: client-owner-create=pass selected-case-update=pass browser-service-role=absent baseline-cases-policies=present baseline-cases-rls=enabled baseline-owner-scoped=pass.");
console.log("Live RLS verification remains required through a read-only SQL Editor policy query; no policy result was inferred from client code.");
