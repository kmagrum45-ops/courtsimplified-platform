/**
 * A DATE THE STEP PAGE KEPT FROM THE STORY NEVER REPLACES THE PERSON'S ANSWER, THEIR ROUGH TIME OR THEIR "NOT SURE"
 * (Chrome check of production c38e69fd, B2; site owner's decision, 9 Nov 2026).
 *
 * The step page keeps a date the story gives by itself, so its deadline is counted at once (StageAnswerPanel; the ids are
 * marked in the saved position's `datesFromStory`). Such a date counts deadlines but is never read as an answer and never
 * fills a fact: on production the person's own "When it happened" ("March 2026") was replaced by the repayment date the
 * step page kept from the story, and a Civil case with no answer there showed the repayment date as "When it happened".
 * "Not sure" is a state, never refilled from the story (contract rule 4).
 *
 * What it checks, on caseFileOf (caseFile.ts step 7), with a kept date for "When it happened":
 *   2. the person gave a day: theirs stays;
 *   3. the person gave a rough time ("March 2026"): theirs stays, never replaced by the full kept date;
 *   4. the person said they are not sure: it stays "not sure";
 *   5. a date the person saved on the step page themselves (not marked as kept) is read as before.
 * (Check 1, "a kept date fills a fact nobody answered", was dropped on 9 Nov: it brought back the Civil case above.)
 *
 * WHAT FAILURE THIS CATCHES: a worked-out date replacing an answer the person gave, or their "not sure".
 *
 * Run: npm run test:story-date-never-replaces
 */
import { caseFileOf } from "../../src/lib/case-system/caseFile/caseFile";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const KEPT = "2026-06-01";
const ID = "case-date-act-or-omission";
const checkpoint = (initialAnswers: Record<string, string>) =>
  ({ version: 1 as const, flowId: "f", courtPath: "small-claims", revision: "r", sections: { builder: { step: "guided", initialAnswers } } }) as never;
const master = (kept: boolean) => ({ position: { dateAnswers: { [ID]: KEPT }, ...(kept ? { datesFromStory: [ID] } : {}) } });
const when = (answers: Record<string, string>, kept = true) => caseFileOf(checkpoint(answers), master(kept)).whenHappened;

const day = when({ "sc-orient-when-happened": "2026-03-03" });
check("2. the person's day stays", day.state === "answered" && day.value === "2026-03-03", JSON.stringify(day));

const rough = when({ "sc-orient-when-happened": "March 2026" });
check("3. the person's \"March 2026\" stays, never replaced by the kept date", rough.value === "March 2026" && rough.state !== "answered", JSON.stringify(rough));

const unsure = when({ "sc-orient-when-happened": "not-sure" });
check("4. \"not sure\" stays \"not sure\"", unsure.state === "unsure" && unsure.value !== KEPT, JSON.stringify(unsure));

const theirs = when({}, false);
check("5. a date the person saved on the step page is read as before", theirs.state === "answered" && theirs.value === KEPT, JSON.stringify(theirs));

console.log(failures ? `\n${failures} check(s) failed.` : "\nA date kept from the story never replaces the person's answer or their \"not sure\".");
process.exit(failures ? 1 : 0);
