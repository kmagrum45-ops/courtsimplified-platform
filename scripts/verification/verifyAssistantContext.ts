/**
 * Pins what may reach the assistant's prompt.
 *
 * COSTS NOTHING — a source check plus pure-function calls.
 *
 * WHY. /api/assistant-chat generates FREE TEXT. Free text has no field paths,
 * so no field-level check can ever cover this surface: once the model has been
 * handed a number, nothing downstream can stop it saying the number. The only
 * thing that constrains it is what enters the context.
 *
 * The route used to end its context block with five raw JSON dumps totalling up
 * to 18,000 characters — including, on the family path, per-item `strengthScore`
 * (0-100 grades of the user's evidence) and a high/medium/low case `confidence`.
 * Neither renders in the UI, which is precisely why "not rendered" was never a
 * sufficient answer to whether a section 3 value reaches the user.
 *
 * Run: node --import tsx scripts/verification/verifyAssistantContext.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const ROUTE = path.join(__dirname, "..", "..", "app", "api", "assistant-chat", "route.ts");
const RAW = readFileSync(ROUTE, "utf8");

/** Comments legitimately quote what was removed; assert on live code only. */
const CODE = RAW.replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .filter((line) => !/^\s*\/\//.test(line))
  .join("\n");

function main(): void {
  // ---- No raw payload reaches the prompt ----

  check("no JSON.stringify of caller payload into the prompt", !/JSON\.stringify/.test(CODE));
  check("safeJson is gone", !/\bsafeJson\b/.test(CODE));

  for (const field of ["master_result", "evidenceData", "strategyData", "workspaceDocument"]) {
    // These may still exist on the request type and in stage/path extraction,
    // but must not be interpolated into the context template.
    const interpolated = new RegExp(`\\$\\{[^}]*\\b${field}\\b[^}]*\\}`).test(CODE);
    check(`${field} is not interpolated into the prompt`, !interpolated);
  }

  // ---- The grade is out of litigationRisks ----

  check(
    "risk.severity is not sent to the model",
    !/risk\.severity/.test(CODE),
    "an ordinal grade over the user's case, in a free-text prompt",
  );

  // ---- The output floor exists ----

  check("the answer is validated before it ships", /validateCaseStrengthLanguage\(/.test(CODE));
  check(
    "a failing answer falls back to the deterministic answer, not a blank bubble",
    /verdict\.valid \? generated : buildFallbackAnswer/.test(CODE),
    "blanking is right for a field and wrong for a chat reply",
  );

  // ---- The allowlist is an allowlist ----

  check("buildUserAccountContext exists", /function buildUserAccountContext/.test(CODE));
  check(
    "it reads only the user's own account fields",
    ["facts", "timeline", "evidence", "goal", "urgent"].every((f) =>
      new RegExp(`intake\\.${f}\\b`).test(CODE),
    ),
  );
  check(
    "it does not reach into engine output",
    !/intake\.(analysis|masterResultPatch|intelligence)\b/.test(CODE),
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
