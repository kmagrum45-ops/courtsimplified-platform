/**
 * Is the content readable by the people it is for?
 *
 *   npm run test:readability
 *
 * *** WHAT IT ENFORCES, AND WHAT IT ONLY REPORTS ***
 *
 * Content produced by the verified-content pipeline is HELD to Grade 8. That
 * is the standard the pipeline drafts against, so failing it is a real defect
 * in something we control end to end.
 *
 * Content that predates the pipeline is MEASURED AND LISTED, not gated. Two
 * reasons, and neither is squeamishness:
 *
 *   1. Rewriting reviewed legal content to move a readability number is a
 *      content decision with legal consequences, not a lint fix. It belongs in
 *      a deliberate rewrite that goes back through verification, not in
 *      whatever change happened to turn the check red.
 *
 *   2. A gate that fails on day one gets suppressed on day one. A measurement
 *      that names each block and its grade is harder to ignore and easier to
 *      act on, because it says which paragraph to fix first.
 *
 * The numbers go in the accuracy report. They are not flattering:
 * the existing Small Claims next-step blocks measure between grade 10 and 13,
 * which is to say they are written for a reader who did not need them.
 *
 * *** WHY THERE IS NO RATCHET ***
 *
 * The obvious move is to pin today's grade per block and fail on any increase.
 * That is a check on a current value, which CLAUDE.md rules out, and it has a
 * specific failure here: a correct legal clarification that adds a clause can
 * raise the grade, and the check would then be punishing accuracy. The
 * measurement is reported; the pipeline's output is gated.
 */

import { readability, TARGET_GRADE } from "../../src/lib/content-library/readability";
import { NEXT_STEP_BLOCKS } from "../../src/lib/content-library/nextSteps";
import { ASSISTANT_BLOCKS } from "../../src/lib/content-library/assistantBlocks";
import { PATHWAY_DESCRIPTIONS } from "../../src/lib/content-library/pathwayDescriptions";
import {
  UNKNOWN_STAGE_MESSAGE,
  OUT_OF_SCOPE_STAGE_MESSAGE,
} from "../../src/lib/case-system/stage-map/stageMessages";

const failures: string[] = [];
let passed = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) passed += 1;
  else failures.push(detail ? `${name}\n      ${detail}` : name);
}

// ---------------------------------------------------------------------------
// The scorer itself behaves
// ---------------------------------------------------------------------------

/*
 * Asserted against constructed passages, not against product content, so these
 * cases stay true whatever the product says. Without them a broken scorer
 * would report every block as grade 0 and this suite would go green.
 */
const PLAIN =
  "You have 20 days to reply. The 20 days start the day after you got the papers. " +
  "If you miss it, the other side can ask the court to move ahead without you.";

const DENSE =
  "A defendant who wishes to dispute a plaintiff's claim shall, within 20 days of " +
  "being served with the claim, serve on every other party a defence and file the " +
  "defence, with proof of service, with the clerk.";

check(
  "a plain passage scores at or below the target",
  readability(PLAIN).grade <= TARGET_GRADE,
  `got ${readability(PLAIN).grade.toFixed(1)}`,
);
check(
  "a dense single-sentence passage scores well above it",
  readability(DENSE).grade > TARGET_GRADE + 3,
  `got ${readability(DENSE).grade.toFixed(1)} — the scorer is not discriminating`,
);
check(
  "citations do not drive the score",
  Math.abs(
    readability("You must file the defence with the clerk.").grade -
      readability("You must file the defence with the clerk (r. 9.01, O. Reg. 258/98).").grade,
  ) < 0.5,
  "adding a citation to an identical sentence changed its grade, so the score " +
    "would punish citing a source — the opposite of what this product needs",
);
check(
  "hardest sentences are reported so the score is actionable",
  readability(`${PLAIN} ${DENSE}`).hardestSentences.length > 0,
  "a grade with no indication of which sentence caused it cannot be acted on",
);

// ---------------------------------------------------------------------------
// Content we do control: the stage-map messages
// ---------------------------------------------------------------------------

for (const [name, text] of [
  ["UNKNOWN stage message", UNKNOWN_STAGE_MESSAGE],
  ["OUT_OF_SCOPE stage message", OUT_OF_SCOPE_STAGE_MESSAGE],
] as const) {
  const score = readability(text);
  check(
    `${name} is at or below grade ${TARGET_GRADE}`,
    score.grade <= TARGET_GRADE,
    `grade ${score.grade.toFixed(1)}, ${score.averageWordsPerSentence.toFixed(0)} words per sentence.\n` +
      `      ${score.hardestSentences[0]?.text ?? ""}`,
  );
}

// ---------------------------------------------------------------------------
// Everything else: measured and listed, not gated
// ---------------------------------------------------------------------------

type Measured = { id: string; grade: number; words: number };

const measured: Measured[] = [];

for (const block of NEXT_STEP_BLOCKS) {
  if (block.text.includes("[NEEDS LICENSEE REVIEW")) continue;
  const score = readability(block.text);
  measured.push({ id: `next-step ${block.id}`, grade: score.grade, words: score.words });
}

for (const block of ASSISTANT_BLOCKS) {
  const score = readability(block.template);
  if (score.words < 12) continue; // a one-line prompt measures nothing useful
  measured.push({ id: `assistant ${block.id}`, grade: score.grade, words: score.words });
}

for (const description of PATHWAY_DESCRIPTIONS) {
  const score = readability(description.text);
  measured.push({ id: `pathway ${description.id}`, grade: score.grade, words: score.words });
}

/*
 * A passage that measures nothing is a bug, not a pass.
 *
 * Writing this suite I read `description.summary` when the field is `text`.
 * That threw, which was loud enough. But the near-miss is the one that would
 * not have: a field that becomes an empty string scores grade 0 and sails
 * through as the most readable content in the product. So zero-word passages
 * fail here rather than quietly improving the average.
 */
for (const entry of measured) {
  check(
    `measured passage has text: ${entry.id}`,
    entry.words > 0,
    "scored zero words — the field is empty or was read under the wrong name",
  );
}

const above = measured.filter((entry) => entry.grade > TARGET_GRADE).sort((a, b) => b.grade - a.grade);

// ---------------------------------------------------------------------------

console.log("");
console.log("READING LEVEL");
console.log("");
console.log(`  target: grade ${TARGET_GRADE}`);
console.log(`  ${passed} enforced check(s) passed`);
console.log("");
console.log(`  ${measured.length} existing passages measured, ${above.length} above the target:`);
console.log("");
for (const entry of above.slice(0, 15)) {
  console.log(`    ${entry.grade.toFixed(1).padStart(5)}  ${entry.id}`);
}
if (above.length > 15) console.log(`    …and ${above.length - 15} more`);
console.log("");
console.log("  These are reported, not gated — see this file's header for why.");
console.log("");

if (failures.length > 0) {
  console.log(`${failures.length} FAILURE(S):`);
  console.log("");
  for (const failure of failures) console.log(`  - ${failure}`);
  console.log("");
  process.exitCode = 1;
} else {
  console.log("  All enforced checks passed.");
  console.log("");
}
