/**
 * Every phone number in a crisis message is on the official page it came from.
 *
 * COSTS NOTHING. Reads crisisMessages.ts and the vendored ontario.ca pages.
 *
 * WHAT FAILURE THIS CATCHES: a helpline number that is mistyped, or that the
 * province has since changed. These are the highest-consequence strings in the
 * product -- a person in danger dials them -- and until 2026-09-30 they rested
 * on pages nobody had saved. The pages are now vendored (practicalSources.ts:
 * ontario-connect-supports-survivors-violence, ontario-find-mental-health-support,
 * ontario-report-child-abuse-and-neglect), so a re-vendored page that drops or
 * changes a number fails here.
 *
 * Run: node --import tsx scripts/verification/verifyCrisisNumbers.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import * as crisis from "../../src/lib/content-library/crisisMessages";

const ROOT = process.cwd();
const PAGES = [
  "docs/sources/corpus/ontario-connect-supports-survivors-violence.txt",
  "docs/sources/corpus/ontario-find-mental-health-support.txt",
  "docs/sources/corpus/ontario-report-child-abuse-and-neglect.txt",
].map((file) => readFileSync(path.join(ROOT, file), "utf8"));

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
}

const messages = Object.values(crisis).filter((value): value is string => typeof value === "string");
const numbers = new Set<string>();
for (const message of messages) {
  for (const match of message.matchAll(/\b(?:1-)?\d{3}-\d{3}-\d{4}\b/g)) numbers.add(match[0]);
}

check("the crisis messages contain helpline numbers to check", numbers.size > 0);
const missing = [...numbers].filter((number) => !PAGES.some((page) => page.includes(number)));
check(
  `every helpline number (${numbers.size}) appears on a saved official page`,
  missing.length === 0,
  missing.join(", "),
);
check(
  "911 is the emergency instruction",
  messages.some((message) => message.includes("call 911")),
);

console.log("");
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`);
process.exitCode = failures === 0 ? 0 : 1;
