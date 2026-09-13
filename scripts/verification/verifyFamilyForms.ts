/**
 * Every family form number shown to a user cites the rule requiring it.
 *
 * COSTS NOTHING. A source check plus pure-function calls.
 *
 * WHY. The family engines hardcoded nine form numbers as bare strings, with no
 * sourceUrl anywhere in ~4,800 lines of family engine code, on a path reachable
 * in one click from the homepage. A form number is a procedural fact and
 * CLAUDE.md section 2 requires a real, resolvable citation.
 *
 * Run: node --import tsx scripts/verification/verifyFamilyForms.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  FAMILY_FORMS,
  FAMILY_LAW_RULES_SOURCE_URL,
  familyFormLabel,
} from "../../src/lib/case-system/family/familyFormsRegistry";

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const ENGINES = [
  "familyStrategyEngine.ts",
  "familyWorkflowEngine.ts",
].map((file) => ({
  file,
  source: readFileSync(
    path.join(__dirname, "..", "..", "src", "lib", "case-system", file),
    "utf8",
  ),
}));

function main(): void {
  // ---- Every registry entry is properly cited ----

  for (const form of FAMILY_FORMS) {
    check(`[Form ${form.formNumber}] cites a requiring rule`, form.requiringRule.length > 0);
    check(`[Form ${form.formNumber}] quotes the regulation`, form.ruleQuote.length > 10);
    check(
      `[Form ${form.formNumber}] cites O. Reg. 114/99`,
      form.sourceUrl === FAMILY_LAW_RULES_SOURCE_URL,
    );
    check(`[Form ${form.formNumber}] records a verification date`, /^\d{4}-\d{2}-\d{2}$/.test(form.verifiedAt));
    check(
      `[Form ${form.formNumber}] has the regulation's own title`,
      form.officialTitle.length > 0 && !/^Form /.test(form.officialTitle),
    );
  }

  // ---- The engines no longer hardcode a form string ----
  //
  // Comments may discuss form numbers; live code must not contain a bare
  // "Form N ..." string literal.
  for (const { file, source } of ENGINES) {
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((line) => !/^\s*\/\//.test(line))
      .join("\n");

    const hardcoded = code.match(/"Form [0-9][^"]*"/g) || [];
    check(
      `${file} hardcodes no form string`,
      hardcoded.length === 0,
      hardcoded.join(", "),
    );
    check(`${file} uses the cited registry`, /familyFormLabel\(/.test(code));
  }

  // ---- The label helper refuses an uncited form ----

  check(
    "familyFormLabel returns the regulation's own title",
    familyFormLabel("35.1") ===
      "Form 35.1 — Affidavit (Decision-Making Responsibility, Parenting Time and Contact)",
    familyFormLabel("35.1"),
  );

  let threw = false;
  try {
    familyFormLabel("99Z");
  } catch {
    threw = true;
  }
  check(
    "an unregistered form number throws rather than shipping uncited",
    threw,
    "failing loudly in a harness beats shipping a form number with no citation",
  );

  // ---- Terminology check: the 2021 parenting-language reform ----
  //
  // The engines called Form 35.1 the "Parenting Affidavit", which is pre-2021
  // wording. The regulation uses "decision-making responsibility, parenting
  // time and contact". Shipping the old vocabulary would teach users terms the
  // court no longer uses.
  for (const { file, source } of ENGINES) {
    check(
      `${file} no longer says "Parenting Affidavit"`,
      !source.includes("Parenting Affidavit"),
    );
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
