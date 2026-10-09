/**
 * A claim whose kind can need written notice before suing is pointed to that
 * notice step first, and only when the person's own words place it.
 *
 * WHY (2026-10-06, the site owner's live test). A slip on store ice, injury
 * date given, slip-and-fall confirmed: the next-steps panel suggested "How do
 * I actually file my claim", and the 60-day Occupiers' Liability Act notice
 * appeared only in a general information box.
 *
 * WHAT IT CATCHES:
 *   - the store-ice story not reaching before-filing:notice-snow-ice-private;
 *   - a fall that could be on a city sidewalk being sent to the private-
 *     property notice (or the reverse) -- a wrong notice is a wrong deadline;
 *   - a suggestion made when the story places no step, or more than one;
 *   - a date the person already confirmed not being offered on the panel;
 *   - the builder or panel losing the wiring.
 *
 * COSTS NOTHING: pure functions and source reads.
 *
 * Run: npm run test:notice-step
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { CIVIL_NOTICE_STEP, suggestedNoticeStep } from "../../src/lib/case-system/claim-types/noticeStep";
import { suggestedDatesFromAnswers } from "../../src/lib/case-system/casePosition";
import { findStage } from "../../src/lib/case-system/stage-map/stageMap";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

const SLIP = "sc-claim-slip-and-fall-occupier-liability";
const live =
  "i went into the walmart by my house and the entry way was full of ice with no salt on the ground. i slipped and hurt my elbow realy bad";

const store = suggestedNoticeStep({ claimTypeId: SLIP, story: live });
check("the live store-ice story is pointed to the private snow-and-ice notice", store === "before-filing:notice-snow-ice-private", String(store));
check("that step exists", Boolean(store && findStage(store)));
check("a city sidewalk fall goes to the municipal notice", suggestedNoticeStep({ claimTypeId: SLIP, story: "I tripped on a broken sidewalk in Ottawa" }) === "before-filing:notice-municipality");
check("a Toronto sidewalk fall goes to the Toronto notice", suggestedNoticeStep({ claimTypeId: SLIP, story: "I slipped on the sidewalk in Toronto" }) === "before-filing:notice-toronto");
check("ice on a sidewalk is not sent to the private-property notice", suggestedNoticeStep({ claimTypeId: SLIP, story: "I slipped on ice on the sidewalk" }) !== "before-filing:notice-snow-ice-private");
check("a story that places no notice gets no suggestion", suggestedNoticeStep({ claimTypeId: SLIP, story: "I tripped on a loose mat inside the store" }) === null);
check("no claim type, no suggestion", suggestedNoticeStep({ claimTypeId: null, story: live }) === null);

check("civil: a story pointing to a notice gets the civil notice step", suggestedNoticeStep({ courtPath: "civil", story: "I slipped on ice outside a grocery store" }) === CIVIL_NOTICE_STEP);
check("civil: a claim against the province gets it too", suggestedNoticeStep({ courtPath: "civil", story: "The Ontario government cancelled my contract" }) === CIVIL_NOTICE_STEP);
check("civil: a plain contract story gets none", suggestedNoticeStep({ courtPath: "civil", story: "My business partner kept the profits" }) === null);
check("civil: the notice step exists", Boolean(findStage(CIVIL_NOTICE_STEP)));
check("family: never a notice suggestion", suggestedNoticeStep({ courtPath: "family", story: "the road was icy" }) === null);

const dates = suggestedDatesFromAnswers([
  { questionId: "sc-date-injury", answerText: "January 13, 2025" },
  { questionId: "sc-orient-when-happened", answerText: "January 13, 2025 at 2 pm" },
  { questionId: "sc-date-claim-served", answerText: "last spring" },
]);
check("a confirmed injury date is offered for the injury question", dates["sc-date-injury"]?.value === "2025-01-13", JSON.stringify(dates));
check("only date questions are offered", !("sc-orient-when-happened" in dates));
check("an answer with no date at all offers nothing", !("sc-date-claim-served" in dates));
// "October 1" with no year is offered, its year marked as our guess, and the
// builder keeps only full dates as the person's answers (walkthrough 2026-10-08).
const monthDay = suggestedDatesFromAnswers([{ questionId: "sc-date-claim-served", answerText: "October 1, in person" }], new Date("2026-10-08T12:00:00Z"));
check("a month and day answer is offered with the year marked as a guess", monthDay["sc-date-claim-served"]?.value === "2026-10-01" && monthDay["sc-date-claim-served"]?.yearAssumed === true, JSON.stringify(monthDay));
check("a full date is not marked as a guess", !dates["sc-date-injury"]?.yearAssumed);

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const page = read("app/builder/page.tsx");
check("the builder passes the notice step and the confirmed dates", /noticeStepId=\{suggestedNoticeStep\(/.test(page) && /suggestedDates=\{guidedDates\}/.test(page));
check("only full dates become the person's answers", /filter\(\(\[, suggestion\]\) => !suggestion\.yearAssumed\)/.test(page));
const panel = read("app/builder/_components/StageAnswerPanel.tsx");
check("the panel suggests the notice step first when nothing is filed", /noticeFirst\s*\?\s*\(noticeStepId as string\)/.test(panel));

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
if (failures) process.exitCode = 1;
