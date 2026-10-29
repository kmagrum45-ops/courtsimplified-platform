/**
 * Does a quote that skips material with "..." get found wherever it really is,
 * and only there?
 *
 *   npm run test:elided-quote
 *
 * *** THE FAILURE THIS EXISTS TO CATCH ***
 *
 * `findElidedQuote` (scripts/content/verifiedContentPipeline.ts) chains the
 * parts of an elided quote: same source, in order, each within 200 characters
 * of the last. Its first version started the chain at the FIRST place the
 * opening part appeared and never tried a later one. The Small Claims
 * online-filing guide says "if you need to meet a deadline ... 3 business days
 * or less away" twice, ~5,600 characters apart, and only the second is followed
 * by "If you cannot submit your documents online, you may file them". So the
 * true quote behind the Small Claims "3 business days or less" filing line was
 * refused, and three next-step cards that show it
 * (next-step:before-filing:deciding-whether-to-sue:7,
 * next-step:defendant:served-defence-period-running:7,
 * next-step:both:filed-in-wrong-place:8) failed the gate (2026-10-29).
 *
 * The checks assert properties, not today's values: an opening part that
 * repeats must not hide the occurrence that chains (1, 3); and trying every
 * occurrence must not loosen the gate — order and the gap limit still hold (2).
 * No network, no database, no model.
 */

import { findElidedQuote, findQuote, fragmentsChain } from "../content/verifiedContentPipeline";
import { FILING } from "../../src/lib/content-library/nextStepPractical";

let failed = 0;
function check(label: string, ok: boolean, detail = ""): void {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${!ok && detail ? `\n        ${detail}` : ""}`);
  if (!ok) failed += 1;
}

console.log("\n1. A repeated opening part does not hide the occurrence that chains");
{
  const first = "if you need to meet a deadline that is close";
  const second = "you may file it at the courthouse instead";
  const filler = " unrelated words in between".repeat(20); // > 200 characters
  const haystack = `${first} and here the toronto portal is described.${filler} ${first} ${second}.`;
  check(
    "the second occurrence of the first part, followed by the second part, is found",
    fragmentsChain(haystack, [first, second]),
    "only the first occurrence was tried, and its second part is too far away",
  );

  // Backtracking over a LATER part: its first occurrence after the cursor does
  // not lead on to the third part, a later one (still within the gap) does.
  const a = "the first part of a three part quote";
  const b = "the middle part of it";
  const c = "and the end of the passage";
  // a, b (1st), 170 characters, b (2nd), 20 characters, c: the 2nd b is within
  // 200 of a, but c is more than 200 past the 1st b, so only the 2nd chains.
  const tricky = `${a} ${b} ${"y".repeat(170)} ${b} ${"z".repeat(20)} ${c}`;
  check("a later part's second occurrence is tried when its first does not chain", fragmentsChain(tricky, [a, b, c]));
}

console.log("\n2. Trying every occurrence did not loosen the gate");
{
  const first = "if you need to meet a deadline that is close";
  const second = "you may file it at the courthouse instead";
  const filler = " unrelated words in between".repeat(20);
  check("parts out of order are refused", !fragmentsChain(`${second} ${first}`, [first, second]));
  check(
    "a gap longer than the limit after EVERY occurrence is refused",
    !fragmentsChain(`${first} x ${first}${filler} ${second}`, [first, second]),
  );
  check("a missing part is refused", !fragmentsChain(`${first} ${first}`, [first, second]));
}

console.log("\n3. The Small Claims '3 business days or less' filing line is found in its saved source");
{
  const line = FILING["small-claims"].more.find((candidate) => /3 business days away or less/.test(candidate.say));
  check("the line is still in the Small Claims filing card", Boolean(line));
  if (line) {
    check(
      "its elided quote chains in the saved guide",
      findElidedQuote(line.cite.quote)?.sourceId === line.cite.sourceId,
      `got ${findElidedQuote(line.cite.quote)?.sourceId ?? "NOT FOUND"} for ${line.cite.sourceId}`,
    );
    check("findQuote (the gate itself) accepts it", findQuote(line.cite.quote)?.sourceId === line.cite.sourceId);
  }
}

console.log("");
if (failed > 0) {
  console.log(`${failed} check(s) FAILED`);
  process.exitCode = 1;
} else {
  console.log("All checks passed.");
}
