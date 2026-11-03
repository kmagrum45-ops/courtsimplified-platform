/**
 * "I DO NOT KNOW YET" IS NEVER SAVED AS THE ANSWER, AND "NOT SURE" WHERE THE CASE IS STAYS NOT SURE
 * (founder's Chrome check of #541 at 354e36fb, 2 Nov, steps 1 and 2; every court).
 *
 * Step 1: "I do not know yet" typed to the Small Claims chat's goal question was shown as "What you want" on
 * the overview and the case file page. Cause: guidedIntakeToSmallClaimsInput.ts copied the typed words into the
 * analysis input (goal), and the overview and case file page show that copy. The rule: ONE reader decides that an
 * answer is only "I don't know" (caseFile/unsureAnswer.ts isUnsureAnswer; isTypedUnsure for typed words, which
 * leaves stored codes such as "not-sure" alone), and every place that copies or shows a typed answer goes
 * through it: the Small Claims chat's copy (answerWords), the one place every court's answers enter the analysis
 * input (builder/page.tsx handleComplete, withoutUnsureAnswers), the civil and Family chat (typed = "Skip, I'm
 * not sure"), the depth phase's own reading, the record reader (caseRecord.ts), the overview and the case file page.
 *
 * Step 2: "A case is already going" -> "I started it" -> "I'm not sure" showed the step page's chooser in Small
 * Claims. Cause: the case file read the Small Claims form's stage (a guess from the story, stored by
 * SmallClaimsIntake's initial state, or the analysis input's own reading copied back by caseRecord.ts
 * storedIntakeValues) as a newer answer over the start's "not sure". The rule: once the start answered where the
 * case is, a form's stage is a copy, never an answer (caseFile.ts, each area's form), in every court.
 *
 * Checks (pure, plus source checks that each writer and screen uses the one reader):
 *   1a. the Small Claims chat's copy of the goal is empty for "I do not know yet";
 *   1b. the analysis input keeps no typed "I don't know" at either level, and keeps stored codes;
 *   1c. the record reader shows no typed "I don't know" as the goal;
 *   1d. the civil/Family chat, the builder, the overview, the case file page and the depth phase use the one reader;
 *   1e. the case file holds the goal as not sure (never answered) after the Small Claims chat's words;
 *   2a-2c. "not sure" where the case is, at the start, stays not sure with a form stage of "starting-case",
 *          "already-started" or "not-sure" beside it, in each court;
 *   2d. a form's stage still counts when the start said nothing about where the case is;
 *   3a-3e. every place that prints a stored answer reads it through the one reader: the earlier answers, the case
 *          file's words, the overview's snapshot; and one screen check (tests/browser/harness/unsureShown.ts) the story pack runs on
 *          every screen, failing on "I do not know yet" shown as an answer (Chrome check of #541, 2 Nov).
 *
 * WHAT FAILURE THIS CATCHES: "I do not know yet" shown as what the person wants; "Where is your case?" asked
 * again after "I'm not sure" because a form held a guessed or copied stage.
 */
import { readFileSync } from "node:fs";
import { mapGuidedIntakeToSmallClaimsInput } from "../../app/builder/_components/guidedIntakeToSmallClaimsInput";
import { answerWords, isTypedUnsure, withoutUnsureAnswers } from "../../src/lib/case-system/caseFile/unsureAnswer";
import { storedIntakeValues } from "../../src/lib/case-system/caseRecord";
import { caseFileOf, slotText } from "../../src/lib/case-system/caseFile/caseFile";
import { earlierAnswerWords } from "../../src/lib/case-system/earlierAnswerWords";
import { isUnknownAnswer } from "../../src/lib/case-system/intake/depth/selectDepthQuestions";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { SITUATION_SECTION } from "../../src/lib/case-system/situation/situation";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const PHRASE = "I do not know yet";
const source = (file: string) => readFileSync(file, "utf8");

// 1a.
{
  const input = mapGuidedIntakeToSmallClaimsInput({ facts: { remedySoughtText: PHRASE, timelineText: "not sure" }, answeredIds: ["sc-remedy-sought"] } as never, { province: "Ontario", city: "Ottawa" }, "Synthetic story.");
  check("1a. the Small Claims chat's copy of the goal is empty for \"I do not know yet\"", input.goal === "" && input.timeline === "", JSON.stringify({ goal: input.goal, timeline: input.timeline }));
}
// 1b.
{
  const out = withoutUnsureAnswers({ goal: PHRASE, urgent: "Not sure.", facts: "Synthetic story.", caseStage: "not-sure", yourRole: "not-sure", extra: { legalRemedy: "I don't know", servedOn: "unknown", amountClaimed: "$3,000" } });
  check("1b. the analysis input keeps no typed \"I don't know\", at either level", out.goal === "" && out.urgent === "" && (out.extra as Record<string, unknown>).legalRemedy === "", JSON.stringify(out));
  check("1b. stored codes and real answers are kept", out.caseStage === "not-sure" && out.yourRole === "not-sure" && (out.extra as Record<string, unknown>).servedOn === "unknown" && (out.extra as Record<string, unknown>).amountClaimed === "$3,000" && out.facts === "Synthetic story.", JSON.stringify(out));
  check("1b. typed words, not codes", isTypedUnsure(PHRASE) && isTypedUnsure("not sure") && !isTypedUnsure("not-sure") && !isTypedUnsure("unknown") && answerWords(PHRASE) === "" && answerWords(" Payment ") === "Payment");
}
// 1c.
{
  const values = storedIntakeValues({ intakeData: { courtPath: "small-claims", goal: PHRASE, urgent: "I don't know", facts: "Synthetic story." } });
  check("1c. the record reader shows no typed \"I don't know\" as an answer", !values.goal && !values.urgent, JSON.stringify({ goal: values.goal, urgent: values.urgent }));
}
// 1d. Every writer and screen named in the rule uses the one reader.
{
  const uses: [string, RegExp][] = [
    ["app/builder/page.tsx", /const payload = withoutUnsureAnswers\(given\)/],
    ["app/builder/_components/GuidedFormChat.tsx", /isTypedUnsure\(cleaned\)/],
    ["app/builder/_components/guidedIntakeToSmallClaimsInput.ts", /return answerWords\(value\)/],
    ["app/builder/_components/IntelligenceOverviewPanel.tsx", /answerWords\(intake\?\.goal\)/],
    ["app/cases/[id]/case-file/page.tsx", /answerWords\(intake\.goal\)/],
    ["src/lib/case-system/caseRecord.ts", /const text = \(value: unknown\): string => answerWords\(value\)/],
  ];
  const missing = uses.filter(([file, pattern]) => !pattern.test(source(file))).map(([file]) => file);
  check("1d. each place that copies or shows a typed answer reads it through the one reader", missing.length === 0, missing.join(", "));
  check("1d. the depth phase reads the one reader first", isUnknownAnswer(PHRASE) && isUnknownAnswer("idk") && /isUnsureAnswer\(text\) \|\|/.test(source("src/lib/case-system/intake/depth/selectDepthQuestions.ts")));
}

type Sections = Record<string, Record<string, unknown>>;
const ID = "00000000-0000-4000-8000-000000000541";
const cp = (court: string, sections: Sections): Checkpoint => ({ version: 1, flowId: ID, courtPath: court, revision: ID, sections: { story: { text: "Synthetic story." }, ...sections } } as unknown as Checkpoint);

// 1e.
{
  const file = caseFileOf(cp("small-claims", { guided: { answeredIds: ["sc-remedy-sought"], facts: { remedySoughtText: PHRASE } } }));
  check("1e. the case file holds the goal as not sure after the chat's \"I do not know yet\"", file.wants.state === "unsure" && file.wants.value === undefined, JSON.stringify(file.wants));
}

// 2. "Not sure" where the case is, at the start.
const NOT_SURE = { where: "going", started: "me", stage: "not-sure" };
const FORM: Record<string, (stage: string) => Sections> = {
  "small-claims": (stage) => ({ "small-claims": { input: { caseStage: stage } } }),
  civil: (stage) => ({ civil: { input: { caseStage: stage } } }),
  family: (stage) => ({ family: { caseStage: stage } }),
};
for (const court of ["small-claims", "civil", "family"] as const) {
  for (const stage of ["starting-case", "already-started", "not-sure"]) {
    const file = caseFileOf(cp(court, { [SITUATION_SECTION]: { record: NOT_SURE }, ...FORM[court](stage) }));
    check(`2. ${court}: "not sure" where the case is stays not sure beside a form stage "${stage}"`, file.stage.state === "unsure", JSON.stringify(file.stage));
  }
}
// 2d. With no start answer about where the case is, the form's own stage still counts.
{
  const file = caseFileOf(cp("small-claims", FORM["small-claims"]("conference")));
  check("2d. a form's stage counts when the start said nothing about where the case is", file.stage.state === "answered" && file.stage.value === "conference", JSON.stringify(file.stage));
}

// 3. Every place that PRINTS a stored answer reads it through the one reader (Chrome check of #541, 2 Nov: the
// review's "Other answers given for an earlier version of your story" showed "What outcome are you asking the
// court to order?: I do not know yet"). And one permanent screen check, run by the story pack on every screen.
{
  const PHRASE = /i\s*do\s*not\s*know\s*yet|i\s*don'?t\s*know|not\s*sure/i;
  const unsureChat = { questionId: "sc-remedy-sought", answerText: "I do not know yet" };
  const realChat = { questionId: "sc-amount-claimed", answerText: "$3,000" };
  const one = earlierAnswerWords(unsureChat);
  check("3a. an earlier chat answer that is only \"I do not know yet\" is never printed as the answer", !PHRASE.test(one), one);
  const list = earlierAnswerWords([unsureChat, realChat]);
  check("3a. in a list of earlier answers, the \"not sure\" is left out and the real answer is still printed", !PHRASE.test(list) && /\$3,000/.test(list), list);
  const keptAnswer = earlierAnswerWords({ question: "What outcome are you asking the court to order?", answer: "not sure" });
  check("3a. a kept {question, answer} that is only \"not sure\" is never printed as the answer", !PHRASE.test(keptAnswer), keptAnswer);
  const slot = slotText({ state: "answered", value: "I do not know yet", source: { kind: "answer", question: "sc-remedy-sought" }, confirmed: true } as never, (day) => day);
  check("3b. the case file's words for a fact never print \"I do not know yet\" as its answer", !/i\s*do\s*not\s*know\s*yet/i.test(slot), slot);

  let shown: ((lines: string[]) => string[]) | undefined;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- the module may not exist yet (the check says so)
  try { shown = require("../../tests/browser/harness/unsureShown").unsureShownAsAnswer; } catch { shown = undefined; }
  check("3c. one screen check for \"I do not know yet\" shown as an answer (tests/browser/harness/unsureShown.ts unsureShownAsAnswer)", typeof shown === "function");
  if (shown) {
    for (const line of ["I do not know yet", "What you want (your words): I do not know yet", "Answered: I do not know yet. You can change it here.", "What outcome are you asking the court to order?: I do not know yet", "I don't know (your answer as you changed it; it is not asked again)", "Goal: I do not know"]) {
      check(`3c. caught as an answer: "${line}"`, shown([line]).length === 1, JSON.stringify(shown([line])));
    }
    for (const line of ["Not answered yet: add it when you know. Add it", "If you are not sure, leave it for now.", "Okay, we'll leave that for now.", "Amount: $3,000.00", "I do not know yet whether he will pay, so I am suing.", "Anything filed yet: Not sure"]) {
      check(`3c. not an answer shown: "${line}"`, shown([line]).length === 0, JSON.stringify(shown([line])));
    }
  }
  const pack = readFileSync("tests/browser/story-pack.spec.ts", "utf8");
  check("3d. the story pack runs the screen check on every screen it checks (review, results, chat, case page, questions)", /unsureShownAsAnswer/.test(pack) && (pack.match(/checkUnsureShown\(/g) ?? []).length >= 7, String((pack.match(/checkUnsureShown\(/g) ?? []).length));
  const overview = readFileSync("app/builder/_components/IntelligenceOverviewPanel.tsx", "utf8");
  check("3e. the overview's snapshot prints each typed answer through the one reader (when, amount, what you want)", /const timeline = answerWords\(/.test(overview) && /const amount = answerWords\(/.test(overview), "timeline / amount not read through answerWords");
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nUnsure never saved: all checks pass.");
if (failures) process.exit(1);
