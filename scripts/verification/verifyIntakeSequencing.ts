/**
 * Asserts that during intake nothing renders between the question and the
 * answer box.
 *
 * COSTS NOTHING. A source-order check over GuidedSmallClaimsIntake.tsx — the
 * property is about JSX placement, so it is checkable statically.
 *
 * THE DEFECT THIS PINS. Both education panels used to render between the
 * message list (which carries the question) and the textarea, and they appeared
 * the moment a claim type was confirmed, then stayed for every remaining turn.
 * For defamation that is roughly 840 words of general information — the $50,000
 * limit, limitation periods, burden of proof, demand letters, Form 7A,
 * enforcement, remedies, evidence categories — between "here is the question"
 * and "type your answer".
 *
 * The rule now: message list, QuestionHelp, input. Education lives below the
 * input, collapsed during intake.
 *
 * Run: node --import tsx scripts/verification/verifyIntakeSequencing.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const SOURCE = readFileSync(
  path.join(
    __dirname,
    "..",
    "..",
    "app",
    "builder",
    "_components",
    "GuidedSmallClaimsIntake.tsx",
  ),
  "utf8",
);

/** Source offset of the component's RENDER, so helper definitions above it
 * (GuidanceDisclosure's own JSX) are not mistaken for the main render tree. */
const RENDER_START = SOURCE.indexOf("export default function GuidedSmallClaimsIntake");

function offsetInRender(needle: string): number {
  const at = SOURCE.indexOf(needle, RENDER_START);
  return at === -1 ? -1 : at;
}

function main(): void {
  check("found the component render", RENDER_START > -1);

  const messages = offsetInRender("messages.map(");
  const questionHelp = offsetInRender("<QuestionHelp");
  const textarea = offsetInRender("<textarea");
  const disclosure = offsetInRender("<GuidanceDisclosure");

  check("the message list renders", messages > -1);
  check("QuestionHelp renders", questionHelp > -1);
  check("the input renders", textarea > -1);
  check("GuidanceDisclosure renders", disclosure > -1);

  check(
    "QuestionHelp sits between the question and the input (it stays put)",
    messages < questionHelp && questionHelp < textarea,
  );

  // THE CORE RULE. Neither education panel may appear before the input.
  const betweenQuestionAndInput = SOURCE.slice(questionHelp, textarea);

  check(
    "no claim-guidance panel between question and input",
    !/claimGuidance[!.]?\.(educationTopics|remedies)/.test(betweenQuestionAndInput),
    betweenQuestionAndInput.match(/claimGuidance[!.]?\.\w+/g)?.join(", ") || "",
  );
  check(
    "no evidence-guidance panel between question and input",
    !/evidenceGuidance[!.]?\.(addressedCategories|unaddressedCategories)/.test(betweenQuestionAndInput),
    betweenQuestionAndInput.match(/evidenceGuidance[!.]?\.\w+/g)?.join(", ") || "",
  );
  check(
    "no GuidanceEntry rendered between question and input",
    !betweenQuestionAndInput.includes("<GuidanceEntry"),
  );

  check("education is disclosed BELOW the input", textarea < disclosure);

  // Collapsed by default while questions are running.
  const disclosureBody = SOURCE.slice(
    SOURCE.indexOf("function GuidanceDisclosure"),
    RENDER_START,
  );
  check(
    "the disclosure starts collapsed",
    /useState\(false\)/.test(disclosureBody),
    "open must default to false",
  );
  check(
    "it expands automatically only once intake is complete",
    /intakeComplete \|\| open/.test(disclosureBody),
  );
  check(
    "it stays collapsed while depth questions are still running",
    /intakeComplete && !depthActive/.test(SOURCE),
    "the depth phase is still question-answering, so education stays collapsed",
  );

  // No content may be lost by the move: both panels' headings and the
  // citation-bearing entry renderer must still exist somewhere in the file.
  for (const marker of [
    "General information for situations like this",
    "General evidence guidance for situations like this",
    "What courts in this category of situation can generally order",
    "<GuidanceEntry",
  ]) {
    check(`content preserved: ${marker.slice(0, 48)}`, SOURCE.includes(marker));
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
