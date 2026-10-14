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
import { formsStageNote } from "../../src/lib/content-library/forms/caseFormOrder";

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
  { file: "app/builder/_components/StageAnswerPanel.tsx", says: /Your next step/ },
];

for (const limit of LIMITS) {
  const text = readFileSync(path.join(ROOT, limit.file), "utf8");
  check(`${limit.file}: "${limit.says.source}" is still said there`, limit.says.test(text));
  check(`${limit.file}: offers help (<GetHelp>)`, /<GetHelp\b/.test(text));
}

/*
 * The Forms tab's "no routing rules" note now comes from formsStageNote
 * (walkthrough run 38525903567, SJ: it said "could not match forms" while
 * listing forms for the step). The property, not the file's wording: every
 * note that admits a limit carries a help line, and the tab renders it.
 */
{
  const admits: string[] = [];
  for (const support of [{ supported: false, reason: "no-rules-for-stage", stage: "trial" }, { supported: false, reason: "no-stage-supplied" }]) {
    const note = formsStageNote(support, 0);
    if (!note || !note.help) admits.push(support.reason);
  }
  check("the Forms tab's limit notes each carry a help line", admits.length === 0, admits.join(", "));
  const workspace = readFileSync(path.join(ROOT, "app/forms/FormsWorkspace.tsx"), "utf8");
  check("and the Forms tab offers help beside them (<GetHelp ... why={stageNote.help} />)", /stageNote\?\.help \? <GetHelp\b[^>]*why=\{stageNote\.help\}/.test(workspace));
}

const component = readFileSync(path.join(ROOT, "app/_components/GetHelp.tsx"), "utf8");
check("GetHelp lists the fixed referral resources", /REFERRAL_RESOURCES\.map/.test(component) && REFERRAL_RESOURCES.length >= 3);

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
