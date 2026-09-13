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

/**
 * The regulation's own TABLE OF FORMS, vendored verbatim under docs/sources/.
 *
 * WHY A LOCAL COPY. The check below has to compare `officialTitle` against the
 * regulation itself, and a verification suite must not depend on a live fetch
 * of ontario.ca — it would turn a content check into a network check and would
 * pass silently when the fetch failed. CLAUDE.md section 2 makes a primary
 * source saved under docs/sources/ a first-class citation route, provided its
 * provenance is recorded; docs/sources/README.md records this one.
 */
const TABLE_OF_FORMS = readFileSync(
  path.join(__dirname, "..", "..", "docs", "sources", "oreg-114-99-table-of-forms.txt"),
  "utf8",
);

/**
 * Parse the pipe-delimited table into formNumber -> title.
 *
 * A title too long for the column wraps onto a following row whose form-number
 * cell is blank, e.g.
 *
 *   |35.1        |AFFIDAVIT (DECISION-MAKING RESPONSIBILITY,    |SEPTEMBER 1, 2021|
 *   |            |PARENTING TIME, CONTACT)                      |                 |
 *
 * so a continuation row appends to the entry above it. Reading only the first
 * row is exactly how the wrong title got in: the visible half ended in a comma
 * and the rest was on the next line.
 */
function parseTableOfForms(): Map<string, string> {
  const titles = new Map<string, string>();
  let current: string | null = null;

  for (const line of TABLE_OF_FORMS.split("\n")) {
    if (!line.startsWith("|")) continue;

    const cells = line.split("|").map((cell) => cell.trim());
    const [, formNumber, title] = cells;

    if (formNumber === "FORM NUMBER" || title === undefined) continue;

    if (formNumber) {
      if (/^REVOKED/i.test(title)) {
        current = null;
        continue;
      }
      titles.set(formNumber, title);
      current = formNumber;
    } else if (current && title) {
      titles.set(current, `${titles.get(current)} ${title}`);
    }
  }

  return titles;
}

/** The table is upper-case; the registry is title-case. Compare on letters. */
function canonical(title: string): string {
  return title.toUpperCase().replace(/\s+/g, " ").trim();
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

  // ---- officialTitle matches the regulation, character for character ----
  //
  // The two checks above were what existed when Form 35.1 shipped as
  // "...Parenting Time AND Contact" against a regulation that says
  // "...PARENTING TIME, CONTACT". They assert that a title is non-empty and
  // does not begin with "Form" — neither of which a paraphrase violates. A
  // field documented as never paraphrased needs to be compared to the thing it
  // is not allowed to paraphrase.

  const tableTitles = parseTableOfForms();

  check(
    "the vendored TABLE OF FORMS parsed",
    tableTitles.size > 50,
    `parsed ${tableTitles.size} entries`,
  );
  check(
    "multi-line titles are joined, not truncated at the first row",
    tableTitles.get("35.1") === "AFFIDAVIT (DECISION-MAKING RESPONSIBILITY, PARENTING TIME, CONTACT)",
    tableTitles.get("35.1"),
  );

  for (const form of FAMILY_FORMS) {
    const fromRegulation = tableTitles.get(form.formNumber);

    check(
      `[Form ${form.formNumber}] appears in the regulation's TABLE OF FORMS`,
      fromRegulation !== undefined,
    );

    if (fromRegulation === undefined) continue;

    check(
      `[Form ${form.formNumber}] officialTitle matches the regulation exactly`,
      canonical(form.officialTitle) === canonical(fromRegulation),
      `registry:   ${form.officialTitle}\n      regulation: ${fromRegulation}`,
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
      "Form 35.1 — Affidavit (Decision-Making Responsibility, Parenting Time, Contact)",
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
