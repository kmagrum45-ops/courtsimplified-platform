/**
 * The workspace screens carry the things that cannot be left to a reviewer's eye: the
 * suggestion boundary line, a source tag on every chronology item, the "Date needed"
 * group, and the verified serving content beside the exhibit book.
 *
 * WHAT THIS CATCHES:
 *
 *   1. The boundary sentence disappearing. "Suggestions describe what a document is.
 *      They never say whether it helps your case." is the whole limit of this feature
 *      under CLAUDE.md §3, and it is one careless edit from being dropped, shortened
 *      into a tooltip, or moved behind a "learn more". It must be printed verbatim.
 *
 *   2. A document date presented as settled when nobody confirmed it. A machine-read
 *      date that looks identical to a checked one is the thing relied on by mistake.
 *
 *   3. The "Date needed" group collapsing into undated rows sorted to the bottom of a
 *      date-ordered table — which says those documents happened last.
 *
 *   4. The exhibit book screen losing the verified serving panel, or acquiring
 *      hand-written procedural content in its place.
 *
 * *** WHY THESE ARE SOURCE-LEVEL CHECKS, STATED AS A LIMITATION ***
 *
 * Rendering React here would need a renderer, a router and a fetch mock to assert four
 * strings. What these checks prove is that the code contains the required elements; they
 * do not prove the elements are visible, correctly placed, or reachable by a screen
 * reader. That is the AODA review in Slice 4, and it is a human pass. Said plainly so
 * nobody reads a green line here as an accessibility result.
 *
 * Comments are stripped before matching. Every string this file looks for is also
 * DISCUSSED in that file's own comments, so a check reading comments would pass on a
 * page that only talks about the boundary line without printing it — which is the exact
 * failure mode. This repository has been caught by that twice.
 *
 * COSTS NOTHING. File reads.
 *
 * Run: node --import tsx scripts/verification/verifyWorkspaceUi.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

const PAGE = path.join(ROOT, "app", "case-workspace", "[caseId]", "page.tsx");
const PANEL = path.join(ROOT, "src", "components", "case-workspace", "VerifiedServingPanel.tsx");

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

/** Source with comments removed — see the header for why this is essential here. */
function withoutComments(source: string): string {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trimStart();
      return !trimmed.startsWith("//") && !trimmed.startsWith("*");
    })
    .join("\n");
}

const read = (file: string): string => {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
};

console.log("");
console.log("WORKSPACE UI");
console.log("");

const pageRaw = read(PAGE);
const page = withoutComments(pageRaw);

// ---------------------------------------------------------------------------
// 1. The boundary sentence, verbatim and in the rendered tree
// ---------------------------------------------------------------------------

{
  const REQUIRED =
    "Suggestions describe what a document is. They never say whether it helps your case.";

  const problems: string[] = [];

  if (page.length === 0) {
    problems.push(`the workspace page is missing at ${PAGE}`);
  } else {
    if (!page.includes(REQUIRED)) {
      problems.push(
        "the boundary sentence is not in the page's code, verbatim. It is the whole limit " +
          "of this feature under §3 and must be printed, not paraphrased.",
      );
    }

    /*
     * Present as a constant is not enough — it has to be rendered. A constant nothing
     * references is a sentence nobody reads, and that is a state a refactor reaches
     * easily.
     */
    const declared = /const SUGGESTION_BOUNDARY\s*=/.test(page);
    const rendered = /\{SUGGESTION_BOUNDARY\}/.test(page);

    if (declared && !rendered) {
      problems.push(
        "SUGGESTION_BOUNDARY is declared but never rendered, so the sentence exists in the " +
          "source and not on the screen",
      );
    }
    if (!declared && !page.includes(REQUIRED)) {
      problems.push("no boundary sentence found at all");
    }

    /*
     * And it must not be hidden behind a disclosure. A sentence in a <details>, a title
     * attribute or an aria-label is not shown beside the suggestion.
     */
    if (/title=\{?["']Suggestions describe/.test(page) || /aria-label=\{?["']Suggestions describe/.test(page)) {
      problems.push("the boundary sentence is in an attribute rather than in visible text");
    }
  }

  if (problems.length === 0) {
    pass("the suggestion boundary sentence is present verbatim and rendered as visible text");
  } else {
    fail("the suggestion boundary is missing or hidden", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 2. An unconfirmed date is marked, on the row as well as in the panel
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  if (!/dateConfirmedByUser/.test(page)) {
    problems.push(
      "the page never consults dateConfirmedByUser, so a date read by a machine is shown " +
        "exactly like one the user checked",
    );
  }

  // Marked in the table, not only in the detail panel: the table is what people scan.
  const tableMarks =
    /!document\.dateConfirmedByUser/.test(page) &&
    /not confirmed/i.test(page);

  if (!tableMarks) {
    problems.push(
      "an unconfirmed date is not marked on the table row. The table is what gets scanned, " +
        "and an unmarked machine-read date is the one relied on by mistake.",
    );
  }

  if (problems.length === 0) {
    pass("an unconfirmed date is marked on the row and in the detail panel");
  } else {
    fail("unconfirmed dates are presented as settled", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 3. The "Date needed" group, and the ambiguity prompt
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  if (!/Date needed/.test(page)) {
    problems.push(
      "there is no 'Date needed' group. Undated documents sorted to the end of a " +
        "date-ordered table read as having happened last.",
    );
  }

  if (!/dateNeeded/.test(page)) {
    problems.push("the page does not read the dateNeeded group from the API");
  }

  /*
   * The ambiguity prompt must offer BOTH readings and must not resolve one itself.
   * "03/04/2026" is 3 April to most of the world and 4 March to some of it.
   */
  /*
   * *** BOTH READINGS MUST BE *CONFIRMABLE*, NOT MERELY DISPLAYED ***
   *
   * The first version of this checked that `ambiguity.dayFirst` and
   * `ambiguity.monthFirst` both appeared somewhere in the page, and a mutation that
   * pointed the month-first BUTTON at the day-first value sailed through: the label still
   * rendered the month-first date, so both names were present.
   *
   * That mutation is the worst version of this bug. A button showing "4 March 2026" that
   * silently records 3 April is not a wrong guess — it is the user's own confirmation
   * being recorded as something else, which is the one thing suggest-then-confirm exists
   * to prevent.
   *
   * So each reading must appear as the value passed to the confirm handler.
   */
  const confirmsDayFirst = /onConfirmDate\([^)]*ambiguity!?\.dayFirst\)/.test(page);
  const confirmsMonthFirst = /onConfirmDate\([^)]*ambiguity!?\.monthFirst\)/.test(page);

  if (!confirmsDayFirst || !confirmsMonthFirst) {
    problems.push(
      `the ambiguous-date prompt does not confirm both readings independently ` +
        `(day-first wired: ${confirmsDayFirst}, month-first wired: ${confirmsMonthFirst}). ` +
        `A button labelled one date that records the other records the user's confirmation ` +
        `as something they did not choose.`,
    );
  }

  // And a way out that is not either guess.
  if (!/I will type it/i.test(page)) {
    problems.push(
      "the ambiguity prompt offers no third option, so a user whose date is neither " +
        "reading has nowhere to go",
    );
  }

  if (problems.length === 0) {
    pass('the "Date needed" group exists and the ambiguity prompt offers both readings plus a way out');
  } else {
    fail("the documents table mishandles missing and ambiguous dates", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 4. Every chronology item shows its source
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  if (!/function SourceTag/.test(page)) {
    problems.push("there is no source tag component, so chronology items carry no provenance");
  }

  /*
   * Rendered in the chronology AND in the deadlines view. The deadlines view is the one
   * where it matters most: those dates are computed, not observed, and they look the most
   * authoritative of the three kinds.
   */
  const usages = (page.match(/<SourceTag\b/g) ?? []).length;
  if (usages < 2) {
    problems.push(
      `SourceTag is rendered ${usages} time(s). It belongs in the chronology and in the ` +
        `deadlines view — a computed date is the least certain and looks the most certain.`,
    );
  }

  // A computed item must offer the rule it was counted under.
  if (!/check the rule yourself/.test(page)) {
    problems.push("a computed deadline offers no way to check the rule it was counted under");
  }

  if (problems.length === 0) {
    pass(`every chronology and deadline item carries a source tag (${usages} usages), with a rule link`);
  } else {
    fail("chronology provenance is missing from the screen", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 5. The exhibit book shows the verified serving content, and nothing hand-written
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  if (!/<VerifiedServingPanel\b/.test(page)) {
    problems.push(
      "the exhibit book screen does not render VerifiedServingPanel, so the verified " +
        "serving content is not beside the book",
    );
  }

  /*
   * *** AND THE SCREEN MUST NOT WRITE PROCEDURAL CONTENT OF ITS OWN ***
   *
   * §2: every legal statement needs a retrieved, citable source. The panel's text comes
   * from the published block, which came from the drafter, the verifier and the corpus
   * quote gate. A rule number or a period typed into this page would bypass all of it —
   * and it is an easy thing to add while "just labelling" a screen.
   *
   * Looking for rule citations and day-counts in the page's own JSX. The exhibit-book
   * download and index carry neither.
   */
  const legalShapes = [
    { pattern: /\br\.\s?\d+\.\d+/, what: "a rule citation (r. 13.03)" },
    { pattern: /\bs\.\s?\d+\s?\(\d+\)/, what: "a statutory pinpoint (s. 44 (10))" },
    { pattern: /\b\d{1,3}\s+days\b/i, what: "a number of days" },
    { pattern: /O\.\s?Reg\./, what: "a regulation citation" },
  ];

  for (const { pattern, what } of legalShapes) {
    if (pattern.test(page)) {
      const line = page.split("\n").find((candidate) => pattern.test(candidate))?.trim() ?? "";
      problems.push(
        `the page states ${what} in its own text: "${line.slice(0, 100)}". Legal content must ` +
          `come from a verified block, not from a screen.`,
      );
    }
  }

  const panel = withoutComments(read(PANEL));

  // The panel must render the block's own sentences rather than any of its own.
  for (const field of ["whatsHappening", "whatToDoNext", "whatHappensAfter"]) {
    if (!panel.includes(field)) {
      problems.push(`the panel does not render the block's ${field}, so content is being dropped`);
    }
  }

  if (!/citation\.quote/.test(panel)) {
    problems.push("the panel does not show the quoted rule text, so the reader cannot see the source");
  }

  if (problems.length === 0) {
    pass(
      "the exhibit book shows the verified serving panel, the panel renders the block's own " +
        "sentences and quotes, and the page states no law of its own",
    );
  } else {
    fail("the exhibit book screen handles legal content wrongly", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 6. Nothing on these screens grades the case
// ---------------------------------------------------------------------------

{
  /*
   * §3, checked against the page's visible strings. Wording is not the shield, so this
   * cannot be exhaustive — it catches the vocabulary that would actually appear if
   * somebody added a readiness score or a strength indicator, which is the realistic way
   * this gets breached.
   */
  const FORBIDDEN = [
    /\bstrong(est)?\b/i,
    /\bweak(est|ness)?\b/i,
    /\brisk\b/i,
    /\blikel(y|ihood)\b/i,
    /\bchance[sd]?\b/i,
    /\breadiness\b/i,
    /\bscore\b/i,
    /\bwin\b/i,
    /\blose\b/i,
    /\bmost important\b/i,
  ];

  const problems: string[] = [];

  /* Only JSX text and string literals, so an identifier like `riskFree` is not a hit. */
  const strings = [...page.matchAll(/["'`]([^"'`\n]{12,})["'`]/g)].map((match) => match[1]);
  const jsxText = [...page.matchAll(/>\s*([A-Z][^<>{}\n]{12,})\s*</g)].map((match) => match[1]);

  for (const text of [...strings, ...jsxText]) {
    for (const pattern of FORBIDDEN) {
      if (pattern.test(text)) {
        problems.push(`"${text.slice(0, 80)}" — matches ${pattern}`);
      }
    }
  }

  if (problems.length === 0) {
    pass(
      `no visible text on the workspace screens grades the case ` +
        `(${strings.length + jsxText.length} strings checked against ${FORBIDDEN.length} patterns)`,
    );
  } else {
    fail("the workspace screens grade the case, which §3 forbids", problems.join("\n"));
  }
}

console.log("");
if (failures > 0) {
  console.log(`${failures} FAILURE(S).`);
  process.exitCode = 1;
} else {
  console.log("All checks passed.");
}
console.log("");
