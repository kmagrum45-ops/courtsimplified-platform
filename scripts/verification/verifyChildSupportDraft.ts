/**
 * The child support draft carries recorded figures and cited rules, and
 * calculates nothing.
 *
 * COSTS NOTHING. Pure function calls, no network, no AI.
 *
 * WHAT THIS IS DEFENDING. The draft engine's whole reason for existing is that
 * a child support amount cannot be read off a table: the table is a formula
 * over Guidelines income, and Guidelines income is a T1 figure adjusted by
 * Schedule III that a court may determine differently under ss. 17 to 20. A
 * draft that printed a number would be the one thing the design forbids, and
 * it would print it into a document a court reads. So the strongest assertions
 * here are negative: no dollar figure the user did not type, no "per month",
 * no arithmetic on what they did type.
 *
 * Properties asserted, not current values: every dollar amount in the output
 * traces back to an input string; every form number carries the subrule that
 * selects it; a qualifier the user wrote survives to the page.
 *
 * Run: node --import tsx scripts/verification/verifyChildSupportDraft.ts
 */

import { pathToFileURL } from "node:url";

import {
  draftChildSupportApplication,
  type ChildSupportDraftInput,
} from "../../src/lib/case-system/family/childSupportDraftEngine";

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/** The commonest case: one parent, two children, table amount only. */
const COMMON_CASE: ChildSupportDraftInput = {
  applicantName: "Dana Okonkwo",
  applicantAddress: "14 Bay Street, Sudbury ON",
  respondentName: "Riley Tran",
  respondentAddress: "7 Elm Avenue, Sudbury ON",
  childrenDescribed: "Two children, aged 6 and 9, both in school full time.",
  parentingTimeDescribed: "The children live with me. Riley sees them every second weekend.",
  incomeForTable: {
    stated: "about $58,000",
    basisStated: "line 15000 of my 2025 notice of assessment",
    statedBy: "from-tax-return",
  },
  incomeDocumentsHeld: ["2023, 2024 and 2025 notices of assessment"],
  propertyOrExclusivePossessionClaim: false,
  onlyClaimIsTableAmountChildSupport: true,
};

/** The fuller case: both income figures, s. 7 expenses, a property claim. */
const FULL_CASE: ChildSupportDraftInput = {
  ...COMMON_CASE,
  incomeForTable: {
    stated: "58000",
    basisStated: "line 15000 of my 2025 notice of assessment",
    statedBy: "from-tax-return",
  },
  incomeForSectionSeven: {
    stated: "roughly $51,400 after the support I pay",
    basisStated: "the same return, less spousal support I pay",
    statedBy: "user",
  },
  sectionSevenExpenses: [
    "Daycare before and after school, $610 a month",
    "Orthodontist, about $4,200 over two years",
  ],
  insuranceShareDescribed: "$38 a month of my work plan",
  propertyOrExclusivePossessionClaim: true,
  onlyClaimIsTableAmountChildSupport: false,
};

/** Every dollar figure appearing anywhere in a draft's text. */
function dollarFigures(text: string): string[] {
  return text.match(/\$[\d,]+(?:\.\d+)?/g) || [];
}

function main(): void {
  const common = draftChildSupportApplication(COMMON_CASE);
  const full = draftChildSupportApplication(FULL_CASE);
  const empty = draftChildSupportApplication({});

  // ---- No amount is calculated, in any of the three ----

  for (const [name, draft, input] of [
    ["common case", common, COMMON_CASE],
    ["full case", full, FULL_CASE],
    ["empty case", empty, {} as ChildSupportDraftInput],
  ] as const) {
    // Every dollar figure in the output must appear in some input string.
    // This is the property: the engine never originates a number. It holds
    // whatever the user typed, including figures this check has never seen.
    const inputText = JSON.stringify(input);
    const originated = dollarFigures(draft.draftText).filter((figure) => {
      const bare = figure.replace(/[$,]/g, "").replace(/\.00$/, "");
      return !inputText.includes(bare) && !inputText.includes(figure);
    });
    check(
      `${name}: no dollar figure originates in the engine`,
      originated.length === 0,
      `unsourced: ${JSON.stringify(originated)}`,
    );

    check(
      `${name}: no monthly figure is derived`,
      !/\b(per month|monthly amount|a month is|payable monthly)\b/i.test(draft.draftText),
    );

    // A phrase blacklist on "table amount" is not usable here: the line
    // "Annual income for the table amount: about $58,000" is the user's own
    // income sitting next to those words, and it is correct. The property that
    // actually holds is the one above — no figure the engine did not receive —
    // so what is left to assert is that no figure is presented as an amount
    // someone owes.
    check(
      `${name}: no amount is presented as payable`,
      !/(payable|owing|owed|due|shall pay|must pay)[^.\n]{0,40}\$/i.test(draft.draftText),
    );

    check(
      `${name}: the draft says outright that it calculates nothing`,
      draft.draftText.includes("No amount of support is calculated in this document."),
    );
  }

  // ---- Recorded figures survive verbatim, qualifiers intact ----

  check(
    "a qualified income figure reaches the draft with its qualifier",
    common.draftText.includes("about $58,000"),
  );
  check(
    "the basis the user stated reaches the draft",
    common.draftText.includes("line 15000 of my 2025 notice of assessment"),
  );
  check(
    "a bare number is formatted, not left raw",
    full.draftText.includes("$58,000.00") && !/\b58000\b/.test(full.draftText),
  );
  for (const expense of FULL_CASE.sectionSevenExpenses!) {
    check(
      `s. 7 expense survives in the user's own words: ${JSON.stringify(expense)}`,
      full.draftText.includes(expense),
    );
  }

  // ---- Both income figures are labelled ----

  check(
    "the table-amount income is labelled with s. 3 (1) (a)",
    full.draftText.includes("Annual income for the table amount") &&
      full.draftText.includes("s. 3 (1) (a)"),
  );
  check(
    "the s. 7 income is labelled with s. 3 (1) (b)",
    full.draftText.includes("Annual income for special or extraordinary expenses") &&
      full.draftText.includes("s. 3 (1) (b)"),
  );
  check(
    "the reason the two figures differ is stated (Schedule III items 3 and 3.1)",
    full.draftText.includes("Item 3") && full.draftText.includes("Item 3.1"),
  );
  check(
    "the second income figure is omitted, not defaulted, when not recorded",
    !common.draftText.includes("Annual income for special or extraordinary expenses"),
  );

  // ---- A missing figure says so ----

  check(
    "an unrecorded income says 'No figure recorded'",
    empty.draftText.includes("No figure recorded"),
  );
  check(
    "the empty draft has no blank income line",
    !/Annual income for the table amount:\s*$/m.test(empty.draftText),
  );

  // ---- Form selection is the rule's, not the engine's ----

  check(
    "the application form is Form 8, cited to r. 8 (1)",
    common.applicationForm === "Form 8" && common.draftText.includes("r. 8 (1)"),
  );
  check(
    "common case: r. 13 (1.3) removes the financial statement",
    common.financialStatementForm.includes("None required") &&
      common.financialStatementBasis.includes("13 (1.3)"),
  );
  check(
    "property claim recorded: Form 13.1, cited to r. 13 (1.2)",
    full.financialStatementForm === "Form 13.1" &&
      full.financialStatementBasis.includes("13 (1.2)"),
  );
  check(
    "support only, not the bare table amount: Form 13, cited to r. 13 (1.1)",
    (() => {
      const draft = draftChildSupportApplication({
        ...COMMON_CASE,
        onlyClaimIsTableAmountChildSupport: false,
      });
      return (
        draft.financialStatementForm === "Form 13" &&
        draft.financialStatementBasis.includes("13 (1.1)")
      );
    })(),
  );
  check(
    "nothing recorded: the engine does not pick a form",
    empty.financialStatementForm.includes("not yet determined") &&
      empty.financialStatementBasis.includes("13 (1.1)") &&
      empty.financialStatementBasis.includes("13 (1.2)"),
  );

  // ---- The parties-agreed route is distinguished from one party's assertion ----

  const agreed = draftChildSupportApplication({
    ...COMMON_CASE,
    incomeForTable: { ...COMMON_CASE.incomeForTable!, statedBy: "both-parties-in-writing" },
  });
  check(
    "an income agreed in writing cites s. 15 (2); one party's does not",
    agreed.draftText.includes("s. 15 (2)") && !common.draftText.includes("s. 15 (2)"),
  );

  // ---- The review notice bookends the draft ----

  check(
    "the review notice appears at the top and the bottom",
    common.draftText.startsWith("DRAFT FOR REVIEW") &&
      common.draftText.trimEnd().endsWith("before this is used."),
  );

  // ---- Placeholders are named, and only where something is missing ----

  check("the empty draft names what is missing", empty.placeholders.length > 0);
  check(
    "the common case, fully recorded, has no placeholders",
    common.placeholders.length === 0,
    `got ${JSON.stringify(common.placeholders)}`,
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
