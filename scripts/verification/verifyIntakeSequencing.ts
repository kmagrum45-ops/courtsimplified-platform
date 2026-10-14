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
 * AND ONE QUESTION AT A TIME (2026-10-13, V3): while the claim-type
 * suggestion waits, the question that arrived with it is held back, and every
 * opening question says why it is asked, in words that state no law unless
 * sourced.
 *
 * Run: node --import tsx scripts/verification/verifyIntakeSequencing.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { unansweredQuestionStart } from "../../app/builder/_components/heldQuestion";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";

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

/**
 * ONE QUESTION AT A TIME, EACH WITH ITS REASON (walkthrough 2026-10-13, V3).
 *
 * The claim-type suggestion ("This sounds like it may be about: ... — is that
 * right?") arrived in the same turn as "Roughly when did the situation that
 * led to this claim happen?", and both were on screen with one answer box;
 * the timing question said nothing about why it is asked. The properties:
 *
 *   - while the suggestion waits, the question it came with is held back
 *     (its message, its help and the answer box), and nothing the person
 *     already answered is ever hidden;
 *   - the suggestion says why it is asked, and can be passed without
 *     applying anything (suggest, never decide);
 *   - every opening (orientation) question in the bank carries a reason, and
 *     a plain reason (`whyAsked`, which needs no source) states no law.
 */
function checkOneQuestionAtATime(): void {
  const intro = "INTRO";
  const story = { from: "user" as const, text: "my story" };
  const question = { from: "assistant" as const, text: "When?", isQuestion: true };
  const introMessage = { from: "assistant" as const, text: intro };

  check(
    "V3: the waiting question is held back with the intro it came with",
    unansweredQuestionStart([story, introMessage, question], intro) === 1,
  );
  check(
    "V3: a waiting question without the intro is held back alone",
    unansweredQuestionStart([story, { from: "assistant", text: "ok" }, question], intro) === 2,
  );
  check(
    "V3: a question the person already answered is never held back",
    unansweredQuestionStart([story, question, { from: "user", text: "May" }], intro) === 3,
  );
  check("V3: with no question waiting, nothing is held back", unansweredQuestionStart([story], intro) === 1);
  check("V3: an empty transcript holds nothing back", unansweredQuestionStart([], intro) === 0);

  const render = SOURCE.slice(RENDER_START);
  const flag = /const (\w+) = [^;]*Boolean\(pendingSuggestion\)/.exec(render)?.[1] ?? "";
  check("V3: the page knows when the claim-type suggestion is waiting", flag !== "");
  if (flag) {
    check(
      "V3: the transcript stops before the held question while the suggestion waits",
      new RegExp(`${flag} \\? unansweredQuestionStart\\(messages`).test(render) && /messages\.slice\(0, heldFrom\)\.map\(/.test(render),
    );
    check(
      "V3: the held question's help is not shown while the suggestion waits",
      new RegExp(`currentQuestion && !${flag} \\? \\(\\s*<QuestionHelp`).test(render),
    );
    check(
      "V3: no answer box while the suggestion waits",
      new RegExp(`!halted && \\(proposalDrafts \\|\\| ${flag}\\) \\? null`).test(render),
    );
  }
  const box = render.slice(render.indexOf("This sounds like it may be about"), render.indexOf("noClaimTypeMatch ? ("));
  check("V3: the claim-type suggestion says why it is asked", /Why we ask/.test(box));
  check(
    "V3: the suggestion can be passed without applying anything",
    /onClick=\{\(\) => \{\s*setPendingSuggestion\(null\);/.test(box) && /skip/i.test(box),
  );
  check(
    "V3: a question with a plain reason shows it",
    /question\?\.whyAsked/.test(SOURCE) && /Why we ask: /.test(SOURCE.slice(SOURCE.indexOf("function QuestionHelp"), RENDER_START)),
  );

  const opening = QUESTION_BANK.filter((item) => item.phase === "orientation");
  const unexplained = opening.filter((item) => !item.why?.trim() && !item.whyAsked?.trim()).map((item) => item.id);
  check("V3: every opening question says why it is asked", opening.length > 0 && unexplained.length === 0, unexplained.join(", "));

  // A plain reason needs no source, so it must not state law. Anything that
  // names a rule, a provision, a time limit or what a court requires belongs
  // in `why` with its sourceUrl.
  const LAW = /\b(?:rules?|s\.\s*\d|sections?|Act|Reg\.|regulations?|deadlines?|limitation|days?|months?|years?|must|required|requires|entitled|the court (?:will|can|may))\b/;
  const lawful = QUESTION_BANK.filter((item) => item.whyAsked && LAW.test(item.whyAsked)).map((item) => `${item.id}: ${item.whyAsked}`);
  check("V3: no plain reason states law", lawful.length === 0, lawful.join("\n      "));
  const both = QUESTION_BANK.filter((item) => item.whyAsked && item.why).map((item) => item.id);
  check("V3: a question has one reason, not a sourced one and a plain one", both.length === 0, both.join(", "));
}

function main(): void {
  check("found the component render", RENDER_START > -1);

  const messagesMatch = /messages(?:\.slice\([^)]*\))?\.map\(/.exec(SOURCE.slice(RENDER_START));
  const messages = messagesMatch ? RENDER_START + messagesMatch.index : -1;
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

  checkOneQuestionAtATime();

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
