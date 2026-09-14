/**
 * The document a user carries out of the building asserts nothing about their
 * case.
 *
 * COSTS NOTHING. One in-process call to the export route. No network, no AI.
 *
 * WHY THIS EXISTS, AND WHY IT RENDERS THE DOCUMENT RATHER THAN READING THE
 * ROUTE. The export screen removed its "Readiness" card — a percentage and an
 * ordinal label — and recorded in a comment that both were CLAUDE.md section 3
 * gradings. The plain-text package kept printing `Readiness: 33%` and
 * `Status: needs-repair` for months afterwards. The screen was checked by eye;
 * the document was not checked by anything.
 *
 * That is the whole lesson: a value that has stopped appearing on a screen has
 * not stopped reaching the user. So this renders the actual document and reads
 * what a user would read. A check on the route's source would have passed the
 * day the card came out, which is precisely when it was wrong.
 *
 * THE COUPLING, NAMED. This imports from app/api/, which OUTSTANDING_ISSUES
 * records as a dependency inversion and a class of its own. It is done here on
 * purpose: the alternative is grepping the route for a percent sign, and a
 * check that reads source text instead of output is the weaker of the two by
 * a wide margin when the thing being defended is what gets printed.
 *
 * Run: node --import tsx scripts/verification/verifyExportedDocument.ts
 */

import { pathToFileURL } from "node:url";

import { POST } from "../../app/api/document-export/route";

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/** A part-filled case: some sections have content, most do not. */
const PARTIAL_CASE = {
  caseId: "11111111-1111-1111-1111-111111111111",
  path: "small-claims",
  master_result: {
    analysis: { summary: "Unpaid invoice for catering services." },
    facts: ["Contract signed 2026-01-02."],
    goal: "Recover $8,500.",
    timeline: [{ title: "Invoice sent", date: "2026-02-01" }],
  },
};

async function renderDocument(body: unknown): Promise<{
  plainText: string;
  nextActions: string[];
  packageKeys: string[];
}> {
  const request = { json: async () => body } as never;
  const response = (await POST(request)) as { json: () => Promise<unknown> };
  const parsed = (await response.json()) as {
    exportPackage: {
      plainText: string;
      nextActions: string[];
      [key: string]: unknown;
    };
  };

  return {
    plainText: parsed.exportPackage.plainText,
    nextActions: parsed.exportPackage.nextActions,
    packageKeys: Object.keys(parsed.exportPackage),
  };
}

async function main(): Promise<void> {
  const { plainText, nextActions, packageKeys } = await renderDocument(PARTIAL_CASE);
  const everything = [plainText, ...nextActions].join("\n");

  check(
    "the document was rendered at all",
    plainText.includes("CourtSimplified Export Package"),
    "everything below is meaningless if this failed",
  );

  // ---- Nothing in the document is a grade ----

  check(
    "no percentage appears anywhere in the document",
    !/\d+\s*%/.test(everything),
    "`Readiness: 33%` printed here for months after the screen stopped showing it",
  );
  check(
    "no N/100 appears anywhere in the document",
    !/\d+\s*\/\s*100\b/.test(everything),
    "the civil path still emits this shape elsewhere; it must not reach the export",
  );
  check(
    "the word Readiness does not appear",
    !/readiness/i.test(everything),
    "a readiness label on paper is a verdict on the user's case",
  );
  for (const verdict of ["needs-repair", "needs-review", "ready-for-final-review"]) {
    check(`the ordinal status "${verdict}" does not appear`, !everything.includes(verdict));
  }

  // ---- The slot is gone, not just unprinted ----
  //
  // `score` and `status` living on the returned object is what let them be
  // printed again after the screen was fixed. Removing the field is the only
  // version of this that holds.

  check(
    "the export package carries no `readiness` object",
    !packageKeys.includes("readiness"),
    "an unprinted score field is one template literal away from printing again",
  );

  // ---- What replaced it is a fact the user can check ----

  check(
    "the document counts the sections that have content",
    /Sections with content: \d+ of \d+/.test(plainText),
  );
  check(
    "it NAMES the empty sections rather than counting them",
    /Sections with no content: .*Evidence Package/.test(plainText),
    "'4 missing' tells a user nothing they can act on",
  );
  check(
    "the first next action names the empty sections too",
    /no content yet: .*Evidence Package/.test(nextActions[0] || ""),
    "this was a threshold branch on score < 80",
  );

  // ---- A complete package says so, without grading it ----

  const complete = await renderDocument({
    ...PARTIAL_CASE,
    workspaceDocument: { sections: [{ heading: "Draft", body: "Text." }] },
    evidencePackage: {
      exhibits: [{ label: "A", title: "Invoice", confirmed: true }],
    },
    master_result: {
      ...PARTIAL_CASE.master_result,
      caseStrategy: ["Prove the contract."],
      risksAndGaps: ["No proof of delivery recorded."],
    },
  });

  check(
    "a full package reports every section has content",
    complete.plainText.includes("Every section has content."),
  );
  check(
    "and still contains no percentage",
    !/\d+\s*%/.test([complete.plainText, ...complete.nextActions].join("\n")),
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
