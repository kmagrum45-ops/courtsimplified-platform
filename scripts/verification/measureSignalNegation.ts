/**
 * MEASUREMENT ONLY. Changes nothing, decides nothing.
 *
 *   npm run measure:signals
 *
 * COSTS NOTHING. Pure string work over the claim-type catalogue.
 *
 * THE QUESTION THIS ANSWERS
 *
 * docs/journeys/SMALL_CLAIMS_JOURNEYS.md recorded a personal-loan story
 * matching `sc-claim-recovery-of-personal-property`. The signal that fired was
 * "moved out and will not give them back", whose content words — after
 * claimTypeMatcher.ts's IGNORED_WORDS strips the rest — are {moved, give,
 * back}. The story said "I moved her two thousand eight hundred dollars" and
 * "she would give it back". Three words, two unrelated sentences, and a signal
 * meaning "will NOT give back" matched a story meaning "would give back".
 *
 * `not` is in IGNORED_WORDS. Dropping it from a signal whose meaning IS the
 * negation inverts that signal.
 *
 * Before touching the matcher: is that one bad signal, or a class? This counts
 * them across all claim types and prints what each one reduces to, so the fix
 * is chosen against the catalogue rather than against one anecdote.
 *
 * IT DELIBERATELY DOES NOT RANK OR RECOMMEND. It reports what is there.
 */

import { pathToFileURL } from "node:url";

import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";

/**
 * Re-declared from claimTypeMatcher.ts rather than imported, because that file
 * does not export them — and a measurement that quietly drifted from the real
 * list would be worse than none. Asserted identical below against the matcher's
 * observable behaviour, so a change there fails this loudly.
 */
const IGNORED_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "of", "to", "in", "on", "for",
  "at", "by", "with", "from", "that", "this", "these", "those", "it", "its",
  "is", "are", "was", "were", "be", "been", "being", "do", "did", "does",
  "has", "have", "had", "will", "would", "can", "could", "should",
  "i", "me", "my", "mine", "we", "us", "our", "ours",
  "you", "your", "he", "him", "his", "she", "her", "they", "them", "their",
  "about", "up", "out", "not", "no", "so", "as", "than", "then", "there",
  "things", "thing", "stuff", "people", "someone", "something",
]);

/**
 * Words that REVERSE or NEGATE a signal's meaning, as opposed to merely being
 * common. Split from the rest because that is the distinction that matters
 * here: "the" carries no meaning, "not" carries the whole meaning.
 */
const NEGATION_WORDS = new Set([
  "not", "no", "never", "without", "wont", "cant", "didnt", "hasnt",
  "havent", "isnt", "wasnt", "refuses", "refused", "failed", "neither",
  "nothing", "nobody", "none", "stopped", "unpaid", "unreturned",
]);

/** The subset of NEGATION_WORDS that IGNORED_WORDS actually removes. */
const STRIPPED_NEGATIONS = new Set([...NEGATION_WORDS].filter((w) => IGNORED_WORDS.has(w)));

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/'/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contentWords(signal: string): string[] {
  return normalize(signal)
    .split(" ")
    .filter((word) => word.length > 2 && !IGNORED_WORDS.has(word));
}

type Row = {
  claimTypeId: string;
  signal: string;
  reducesTo: string[];
  strippedNegations: string[];
};

function main(): void {
  const rows: Row[] = [];
  let totalSignals = 0;

  for (const claimType of CLAIM_TYPES) {
    for (const signal of claimType.signals) {
      totalSignals += 1;
      const words = normalize(signal).split(" ");
      const stripped = words.filter((w) => STRIPPED_NEGATIONS.has(w));
      if (stripped.length === 0) continue;

      rows.push({
        claimTypeId: claimType.id,
        signal,
        reducesTo: contentWords(signal),
        strippedNegations: stripped,
      });
    }
  }

  console.log("=".repeat(78));
  console.log("SIGNALS WHOSE NEGATION IS STRIPPED BEFORE MATCHING");
  console.log("=".repeat(78));
  console.log(`claim types            ${CLAIM_TYPES.length}`);
  console.log(`signals total          ${totalSignals}`);
  console.log(`signals losing a negation  ${rows.length}  (${((rows.length / totalSignals) * 100).toFixed(1)}%)`);
  console.log(
    `negation words that IGNORED_WORDS removes: ${[...STRIPPED_NEGATIONS].join(", ") || "(none)"}`,
  );

  // Which claim types carry the exposure, so the blast radius of a change to
  // IGNORED_WORDS is visible before it is made.
  const byType = new Map<string, number>();
  for (const row of rows) byType.set(row.claimTypeId, (byType.get(row.claimTypeId) || 0) + 1);

  console.log(`\n${"-".repeat(78)}\nAFFECTED CLAIM TYPES (${byType.size} of ${CLAIM_TYPES.length})\n${"-".repeat(78)}`);
  for (const [id, count] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(3)}  ${id}`);
  }

  console.log(`\n${"-".repeat(78)}\nEVERY AFFECTED SIGNAL, AND WHAT IT REDUCES TO\n${"-".repeat(78)}`);
  let current = "";
  for (const row of rows) {
    if (row.claimTypeId !== current) {
      current = row.claimTypeId;
      console.log(`\n${current}`);
    }
    console.log(`  "${row.signal}"`);
    console.log(`     loses: ${row.strippedNegations.join(", ")}`);
    console.log(`     becomes: {${row.reducesTo.join(", ")}}`);
  }

  // The narrowest and most dangerous case: a signal that reduces to so few
  // words that unrelated prose can satisfy it. Reported separately because
  // "loses a negation" and "is trivially satisfiable" are different risks, and
  // a signal with both is the one that produced the live failure.
  const shallow = rows.filter((row) => row.reducesTo.length <= 3);
  console.log(`\n${"-".repeat(78)}`);
  console.log(`SIGNALS THAT LOSE A NEGATION *AND* REDUCE TO <= 3 WORDS: ${shallow.length}`);
  console.log(`${"-".repeat(78)}`);
  for (const row of shallow) {
    console.log(`  {${row.reducesTo.join(", ")}}   <- "${row.signal}"  [${row.claimTypeId}]`);
  }

  console.log(`\n${"=".repeat(78)}`);
  console.log("Measurement only. Nothing here changes the matcher.");
  console.log(`${"=".repeat(78)}`);
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
