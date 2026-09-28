/**
 * While official-form completion is paused, every door to it stays shut.
 *
 * FORM_COMPLETION_PAUSED (src/lib/content-library/phaseScope.ts) was set on
 * 2026-09-27 for the LSO A2I application, which tells the Law Society that
 * filling official court forms and drafting claim particulars are out of scope
 * until it gives guidance. That statement is only true if all three doors are
 * guarded:
 *
 *   1. /api/generate-form refuses BEFORE reading the request, so the pause
 *      cannot be bypassed by calling the route directly;
 *   2. the /forms page renders the paused notice instead of the form tool;
 *   3. the builder does not render the Statement of Claim surface.
 *
 * Asserts the PROPERTY, not the flag's value: if the flag is later turned off
 * on purpose, this suite reports that and passes -- re-enabling is a decision,
 * not a regression. What it fails on is the flag being on while a door is open.
 *
 * Reads source off disk. No network, no model, no database.
 *
 * Run: npm run test:form-completion-paused
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { FORM_COMPLETION_PAUSED } from "../../src/lib/content-library/phaseScope";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : ` -- ${detail}`}`);
  if (!ok) failures += 1;
}

if (!FORM_COMPLETION_PAUSED) {
  console.log("FORM_COMPLETION_PAUSED is false: form completion has been deliberately re-enabled. Nothing to assert.");
} else {
  // 1. The route: the pause check is the first statement in POST.
  const route = read("app/api/generate-form/route.ts");
  const post = route.slice(route.indexOf("export async function POST("));
  const body = post.slice(post.indexOf("{") + 1).replace(/^\s*(\/\/[^\n]*\n\s*)*/, "");
  check(
    "route: POST refuses before doing anything else while paused",
    body.startsWith("if (FORM_COMPLETION_PAUSED)"),
    body.slice(0, 80),
  );
  check("route: refusal is a 503 carrying the paused message", /FORM_COMPLETION_PAUSED_MESSAGE[^;]*status:\s*503/.test(post.slice(0, 400)));

  // 2. The page: the default export returns the notice first.
  const page = read("app/forms/page.tsx");
  const exp = page.slice(page.indexOf("export default function FormsPage()"));
  check(
    "page: /forms renders the paused notice while paused",
    /^[^]*?\{\s*(\/\/[^\n]*\n\s*)*if \(FORM_COMPLETION_PAUSED\) return <FormsPausedNotice \/>/.test(exp.slice(0, 300)),
  );
  check("page: the notice links to the official Ontario Court Forms site", page.includes("href={OFFICIAL_COURT_FORMS_URL}"));

  // 3. The builder: the only render of StatementOfClaimSurface is gated.
  const builder = read("app/builder/page.tsx");
  const renders = builder.split("<StatementOfClaimSurface").length - 1;
  const gated = /!FORM_COMPLETION_PAUSED \? \(\s*<StatementOfClaimSurface/.test(builder);
  check("builder: Statement of Claim surface is rendered in exactly one place", renders === 1, `found ${renders}`);
  check("builder: that render is gated on the pause", gated);
}

console.log(failures ? `\n${failures} failure(s).` : "\nAll checks passed.");
if (failures) process.exitCode = 1;
