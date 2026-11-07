/**
 * THE CASE PAGE AND THE CASE FILE PAGE SHOW THE SAME DEADLINES, FROM ONE SOURCE (Chrome check of #544, 6 Nov 2026, F4).
 *
 * Chrome, Small Claims: the case page's next step said "Based on the date you gave us, the last day for this is Friday
 * 3 March 2028" and "Saved to your case"; the case file page said "Deadlines worked out from your dates: None yet". The
 * next-step card counts the step's deadlines from the case record's dates (the step page's dates, with the case file's
 * dates added: caseFile.ts withCaseFileDates, here the chat's "March 3, 2026"). The case file page listed only the
 * deadlines its timeline route had counted from saved events and dates, and the case page's "What we have so far" only
 * those counted from the step page's own dates: three counts, two of them empty.
 *
 * The rule checked (site owner, 6 Nov): both pages show the same deadlines from one source, stepDeadlines.ts
 * caseDeadlines, which counts as the card does (the step's own deadlines, computedDeadlinesFor) over the case record's
 * dates; how a deadline is worked out is not changed. Checked on a synthetic Small Claims case shaped like Chrome's, and
 * by reading the two pages: each draws its deadline list from caseDeadlines.
 *
 * WHAT FAILURE THIS CATCHES: one page showing a deadline and another saying there is none, for the same case.
 *
 * Run: npm run test:one-deadline-source
 */
import { readFileSync } from "node:fs";
import * as stepDeadlines from "../../src/lib/case-system/caseFile/stepDeadlines";
import { countedStepDeadlines } from "../../src/lib/case-system/caseFile/stepDeadlines";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ID = "00000000-0000-4000-8000-000000000545";
// Chrome's case 1 in shape: starting, nothing filed; the chat answered when it happened; no step chosen, no step-page dates.
const master = {
  courtPath: "small-claims",
  position: { stepId: null, dateAnswers: {}, service: {}, confirmedStage: "starting-case", confirmedStageFrom: "answers" },
  intakeAnswers: [{ questionId: "sc-orient-when-happened", answerText: "March 3, 2026" }],
  intakeCheckpoint: {
    version: 1, flowId: ID, courtPath: "small-claims", revision: ID,
    sections: {
      story: { text: "Synthetic: I hired a deck builder in March 2026. They never finished the deck and kept the money I paid.", location: { province: "Ontario", city: "Kingston" } },
      situation: { record: { court: "small-claims", filed: "nothing", where: "starting", courtFrom: "choice" } },
      builder: { step: "guided" },
      guided: { facts: { timelineText: "March 3, 2026" }, earlierAnswers: [{ questionId: "sc-orient-when-happened", answerText: "March 3, 2026" }], answeredIds: ["sc-orient-when-happened"] },
    },
  },
};
const STEP = "plaintiff:claim-drafted-not-filed";

type CaseDeadlines = (master: unknown, courtPath: string, stepId: string | null) => { id: string; what: string; date: string }[];
const caseDeadlines = (stepDeadlines as unknown as { caseDeadlines?: CaseDeadlines }).caseDeadlines;
{
  const counted = caseDeadlines ? caseDeadlines(master, "small-claims", STEP) : null;
  check("F4: one source counts the step's deadline from the chat's date, as the next-step card does (3 March 2028)", Boolean(counted?.some((item) => item.date === "2028-03-03")), JSON.stringify(counted));
  check("the count is the card's own (countedStepDeadlines over the same dates); nothing worked out differently", JSON.stringify(counted) === JSON.stringify(countedStepDeadlines(STEP, { "case-date-act-or-omission": "2026-03-03" })), JSON.stringify(counted));
  const none = caseDeadlines ? caseDeadlines({ ...master, intakeAnswers: [], intakeCheckpoint: { ...master.intakeCheckpoint, sections: { ...master.intakeCheckpoint.sections, guided: {} } } }, "small-claims", STEP) : null;
  check("no date given: no deadline", Array.isArray(none) && none.length === 0, JSON.stringify(none));
}
// Both pages draw their list from it.
const casePage = readFileSync("app/cases/[id]/page.tsx", "utf8");
const caseFilePage = readFileSync("app/cases/[id]/case-file/page.tsx", "utf8");
check("the case page's \"What we have so far\" deadlines come from caseDeadlines", /deadlines=\{caseDeadlines\(/.test(casePage));
check("the case file page's \"Deadlines worked out from your dates\" come from caseDeadlines", /= caseDeadlines\(/.test(caseFilePage) && /\{counted\.map\(/.test(caseFilePage));

console.log(failures ? `\n${failures} check(s) failed.` : "\nThe case page and the case file page show the same deadlines, from one source.");
process.exit(failures ? 1 : 0);
