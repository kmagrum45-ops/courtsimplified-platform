/**
 * The table card explains the table and never works an example.
 *
 * COSTS NOTHING. Reads the component source and the vendored sources. No
 * render, no network.
 *
 * WHY A SOURCE-TEXT CHECK RATHER THAN A RENDER. The property being defended is
 * "there is no number in this card", and a number can only get in by being
 * written into the file. Rendering would prove the same thing about one state
 * of one component; reading the source proves it about every state, including
 * the branches a render never reaches.
 *
 * The other half is quotation fidelity: every passage the card presents as
 * quoted must appear in a vendored source. A card that misquotes s. 2 (1)
 * sends a user to the wrong province's table, which is the exact defect the
 * 2026-09-14 correction removed.
 *
 * Run: node --import tsx scripts/verification/verifyChildSupportTableCard.ts
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CARD_PATH = path.resolve(
  process.cwd(),
  "app",
  "builder",
  "_components",
  "ChildSupportTableCard.tsx",
);
const SOURCES = path.resolve(process.cwd(), "docs", "sources");

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/** Collapse whitespace and typographic quotes so a quote can be compared to antiword output. */
function flatten(text: string): string {
  return text
    .replace(/&ldquo;|&rdquo;|&quot;/g, '"')
    .replace(/&rsquo;|&apos;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The card body with comments removed.
 *
 * The header comment quotes figures and section numbers to explain itself, and
 * a check that fired on its own explanatory comment is a mistake this codebase
 * has made three times. Only what can reach a user is examined.
 */
function cardBody(): string {
  return fs
    .readFileSync(CARD_PATH, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

function main(): void {
  const body = cardBody();
  const flat = flatten(body);

  // ---- No worked example: no money, no bands, no percentages ----

  const dollarFigures = body.match(/\$\s?[\d,]+/g) || [];
  check(
    "no dollar figure anywhere in the card",
    dollarFigures.length === 0,
    `found ${JSON.stringify(dollarFigures)} — a worked example with plausible numbers ` +
      "reads as a calculation whatever the caption says",
  );

  // Income bands are five-figure numbers; percentages are the Plus (%) column.
  const bigNumbers = body.match(/\b\d{4,}\b/g) || [];
  const allowed = new Set(["391", "303", "97", "175"]);
  const unexplained = bigNumbers.filter((value) => {
    // Citations and years are legitimate: O. Reg. 391/97, SOR/97-175, 2026-09-14.
    return !/^(19|20)\d{2}$/.test(value) && !allowed.has(value);
  });
  check(
    "no income-band-sized number in the card",
    unexplained.length === 0,
    `found ${JSON.stringify(unexplained)}`,
  );

  const percentages = body.match(/\b\d+(\.\d+)?\s*%/g) || [];
  check(
    "no percentage rate in the card",
    percentages.length === 0,
    `found ${JSON.stringify(percentages)} — the Plus (%) column must stay empty`,
  );

  // ---- The card does not apply anything to the user ----

  check(
    "the card never tells the user which province's table is theirs",
    !/your table|the table for you|your province's table|applies to you/i.test(flat),
  );
  check(
    "the card never states an amount the user would receive or owe",
    !/you would (receive|owe|get|pay)|your (support )?amount (is|would)/i.test(flat),
  );
  check(
    "the card says outright that it is not about the user's case",
    /not about your case/i.test(flat),
  );

  // ---- The structure is shown, and shown as a formula ----

  for (const column of ["From", "To", "Basic Amount", "Plus (%)", "Of Income Over"]) {
    check(`the column "${column}" is shown`, body.includes(column));
  }
  for (const tier of ["Income ($)", "Monthly Award ($)"]) {
    check(`the tier heading "${tier}" is shown`, body.includes(tier));
  }
  check(
    "the card says the basic amount alone is not the award",
    /not<\/strong>? the Basic Amount on its own|is <strong>not<\/strong> the Basic Amount/i.test(
      body,
    ) || /not the Basic Amount on its own/i.test(flat),
  );

  // ---- Every quoted passage is in a vendored source ----

  // THE HEADER OF EACH VENDORED FILE IS STRIPPED BEFORE COMPARING.
  //
  // Those headers are prose someone here wrote — provenance, warnings, and in
  // ontario-child-support-guidelines.txt a transcription of s. 2 (1) explaining
  // the 2026-09-14 correction. Checking a card's quotation against that
  // transcription proves only that two copies of one person's typing agree. A
  // transposed word would pass twice.
  //
  // Everything above the "=====" rule is header; the extracted regulation text
  // begins below it. Only that is a source.
  const vendored = fs
    .readdirSync(SOURCES)
    .filter((name) => name.endsWith(".txt"))
    .map((name) => {
      const raw = fs.readFileSync(path.join(SOURCES, name), "utf8");
      const rule = raw.indexOf("======================================================================");
      return flatten(rule >= 0 ? raw.slice(rule) : raw);
    });

  const QUOTED = [
    // s. 3 (1), the presumptive rule.
    "the amount set out in the applicable table, according to the number of children",
    "the amount, if any, determined under section 7",
    // s. 2 (1), the definition that decides which province's table.
    //
    // THE FRAGMENT MUST INCLUDE "against whom an order is sought". A shorter
    // quote starting at "ordinarily resides in Ontario" passed a mutation that
    // changed the clause to "the parent or spouse APPLYING FOR the order" —
    // the precise misreading this card exists to prevent, and the one that
    // sends a user to the wrong province's table. The identifying clause has
    // to be inside the compared text, not adjacent to it.
    "if the parent or spouse against whom an order is sought ordinarily resides in Ontario at the time of the application, the table set out in the Federal Child Support Guidelines for Ontario",
    "if the parent or spouse against whom an order is sought ordinarily resides elsewhere in Canada, the table set out in the Federal Child Support Guidelines for the province or territory in which the parent or spouse ordinarily resides",
  ];

  for (const quote of QUOTED) {
    const inCard = flat.includes(flatten(quote));
    check(`the card carries the quoted passage: "${quote.slice(0, 50)}..."`, inCard);

    const inSource = vendored.some((text) => text.includes(flatten(quote)));
    check(
      `that passage appears verbatim in a vendored source`,
      inSource,
      "a quoted passage with no vendored source is an unsourced legal statement",
    );
  }

  // ---- The corrected position, not the old one ----

  check(
    "the card says Ontario has no table of its own",
    /Ontario does not publish a table of its own/i.test(flat),
  );
  check(
    "the card names the revoking regulation",
    /O\. Reg\. 303\/24 revoked/i.test(flat),
  );
  check(
    "the card does not revive the two-table claim",
    !/two tables|the Ontario table|Ontario's own table (is|applies)/i.test(flat),
  );
  check(
    "the residency rule is stated as the payor's, not the applicant's",
    /against whom an order is sought ordinarily resides/i.test(flat) &&
      /not where the case is filed/i.test(flat),
  );

  // ---- Sources are linked and dated ----

  check(
    "the card links the federal tables themselves",
    body.includes("laws-lois.justice.gc.ca/eng/regulations/SOR-97-175/page-5.html"),
  );
  check(
    "the card carries a verified-at date",
    body.includes("CHILD_SUPPORT_VERIFIED_AT"),
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
