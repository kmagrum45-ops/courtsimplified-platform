/**
 * Where the site says it cannot do something, it points to a person who can
 * (master plan finish line: "a case the site cannot fully handle says so and
 * points to help").
 *
 * WHAT IT CATCHES (walkthrough, 2026-10-08): a page that admits a limit --
 * a failed save, a case that will not open, forms it cannot match -- with no
 * help offered beside it. Each such message must sit in a file that renders
 * <GetHelp>, and GetHelp must list the fixed referral resources.
 *
 * COSTS NOTHING: reads source files.
 *
 * Run: npm run test:help-at-limits
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { REFERRAL_RESOURCES } from "../../src/lib/content-library/referralResources";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
}

const LIMITS: { file: string; says: RegExp }[] = [
  { file: "app/builder/page.tsx", says: /could not be saved just now/ },
  { file: "app/cases/[id]/layout.tsx", says: /could not be loaded just now/ },
  { file: "app/cases/[id]/layout.tsx", says: /This case could not be opened/ },
  { file: "app/forms/FormsWorkspace.tsx", says: /We can match forms to your answers here only/ },
  { file: "app/forms/FormsWorkspace.tsx", says: /No form-routing rules cover/ },
  { file: "app/builder/_components/StageAnswerPanel.tsx", says: /Your next step/ },
];

for (const limit of LIMITS) {
  const text = readFileSync(path.join(ROOT, limit.file), "utf8");
  check(`${limit.file}: "${limit.says.source}" is still said there`, limit.says.test(text));
  check(`${limit.file}: offers help (<GetHelp>)`, /<GetHelp\b/.test(text));
}

const component = readFileSync(path.join(ROOT, "app/_components/GetHelp.tsx"), "utf8");
check("GetHelp lists the fixed referral resources", /REFERRAL_RESOURCES\.map/.test(component) && REFERRAL_RESOURCES.length >= 3);

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
