/**
 * The finish line's mechanical checks, for free (build order Step 2F,
 * 2026-10-12).
 *
 * The paid walkthrough (about $6 a run) drives a browser through 20 cases and
 * has a model grade nine checks. Four of those checks are mechanical -- they
 * depend on code, not on wording -- and can be measured without a browser or
 * a model by running each case through the same functions the pages call:
 *
 *   step     the step the card suggests (notice step first, then the story,
 *            then the confirmed stage -- StageAnswerPanel's order)
 *   form     the card names a form for that step
 *   file     the card says where/how to file, the fee, and how to serve
 *   counted  each date the step's deadlines need is either in the story as a
 *            full date (counted without asking) or genuinely missing
 *   repeat   a date question asked although the story gives a full date
 *            the site failed to connect to it -- the "asks twice" failure
 *
 * It does NOT judge whether the form is the right one or whether wording is
 * good -- the paid run's critic still does that at the end of each step. Run
 * it after every change: if a number drops, something broke.
 *
 * Run: npx tsx scripts/eval/freeFinishLine.ts   (prints the scorecard)
 */

import { sideFromParts } from "../../src/lib/case-system/caseRecord";
import { dateQuestionsForStep, storyHintsForDates } from "../../src/lib/case-system/casePosition";
import { suggestedNoticeStep } from "../../src/lib/case-system/claim-types/noticeStep";
import { suggestedStageFor } from "../../src/lib/case-system/stage-map/suggestedStep";
import { practicalFor, type PracticalCourt } from "../../src/lib/content-library/nextStepPractical";
import { PERSONAS, type Persona } from "../../tests/browser/walkthrough/personas";
import { arrivalOnlyDates } from "../../app/builder/_components/StageAnswerPanel";

/** The day the cases are read on, so "no year" dates resolve the same way every run. */
const TODAY = new Date("2026-10-12T12:00:00Z");
const DAY_DATE = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.? \d{1,2}(?:st|nd|rd|th)?\b|\b\d{4}-\d{2}-\d{2}\b/i;
const FULL_DATE = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.? \d{1,2}(?:st|nd|rd|th)?,? \d{4}\b|\b\d{4}-\d{2}-\d{2}\b/i;

export type CaseScore = {
  id: string;
  court: string;
  step: string;
  form: boolean;
  /** The step is done outside court and its card shows the rule for it. */
  outsideCourt: boolean;
  file: boolean;
  /** null when the step's deadlines need no date. */
  counted: boolean | null;
  /** Dates counted after a one-click "which year?". */
  oneClick: number;
  repeats: string[];
};

export function scoreCase(persona: Persona): CaseScore {
  const court = persona.path;
  const responding =
    sideFromParts({
      confirmedStage: persona.confirmStage,
      intakeData: { extra: { yourRole: persona.role } },
      intakeFacts: null,
    })?.value === "responding";
  const step =
    (!responding ? suggestedNoticeStep({ story: persona.story, courtPath: court }) : null) ||
    suggestedStageFor(court, persona.confirmStage, responding, persona.story);
  const practical = step ? practicalFor(step, court as PracticalCourt, persona.city, responding) : null;
  const questions = dateQuestionsForStep(step);
  const hints = storyHintsForDates(persona.story, TODAY);
  // A date without a year is offered with "which year?" -- one click, by the
  // site owner's rule never to count from a guessed year (2026-10-08). It
  // counts here as counted; `oneClick` says how many needed that click.
  // A service date the story gives as the day papers ARRIVED by mail or
  // courier is not counted from (the rule counts from the day they were sent);
  // asking for the mailing date is right, so it is not a miss (2026-10-13).
  const arrival = arrivalOnlyDates({ stageId: step ?? "", court, storyText: persona.story, storyHints: hints, methods: {} });
  const known = questions.filter((question) => hints[question.id]?.value && !arrival[question.id]);
  const onlyArrival = questions.length > 0 && questions.every((question) => !hints[question.id]?.value || arrival[question.id]) && Object.keys(arrival).length > 0;
  const oneClick = known.filter((question) => hints[question.id]?.yearAssumed).length;
  const storyHasFullDate = FULL_DATE.test(persona.story);
  const outsideCourt = Boolean(practical && practical.also.length > 0 && !practical.forms.length && !practical.filing.length && !practical.serving.length);
  return {
    id: persona.id,
    court,
    step: step || "(none)",
    // A step done outside court (a notice before suing) has no court form, fee
    // or filing; its card passes when it shows the rule for that step instead,
    // the same test the card itself uses to say nothing is missing.
    form: Boolean(practical?.forms.length) || outsideCourt,
    file: Boolean(practical && practical.filing.length > 0 && practical.serving.length > 0 && (practical.fees.length > 0 || practical.feeNotes.length > 0)) || outsideCourt,
    outsideCourt,
    // n/a when the step needs no date, or the story gives no day to count
    // from ("last week", "in july") -- then asking is right, not a repeat.
    counted: questions.length === 0 || !DAY_DATE.test(persona.story) || onlyArrival ? null : known.length > 0,
    oneClick,
    // A question left to ask while the story holds a full date nobody linked to it.
    repeats: storyHasFullDate && known.length === 0 && !onlyArrival ? questions.map((question) => question.id) : [],
  };
}

function main() {
  const scores = PERSONAS.map(scoreCase);
  const pct = (part: number, whole: number) => (whole ? `${part}/${whole} (${Math.round((part / whole) * 100)}%)` : "n/a");
  const counted = scores.filter((score) => score.counted !== null);
  console.log("\nFREE FINISH LINE -- the four mechanical checks, no browser, no model\n");
  console.log("| case | court | step | form | file/fee/serve | deadline counted | asks a date the story gave |");
  console.log("|---|---|---|---|---|---|---|");
  for (const score of scores) {
    console.log(
      `| ${score.id} | ${score.court} | ${score.step} | ${score.outsideCourt ? "n/a (notice, outside court)" : score.form ? "yes" : "NO"} | ${score.outsideCourt ? "n/a (notice, outside court)" : score.file ? "yes" : "NO"} | ${
        score.counted === null ? "n/a" : score.counted ? (score.oneClick ? "yes (year: 1 click)" : "yes") : "NO"
      } | ${score.repeats.length ? score.repeats.join(", ") : "no"} |`,
    );
  }
  console.log("");
  console.log(`Next form named:              ${pct(scores.filter((score) => score.form).length, scores.length)}`);
  console.log(`Where to file, fee, service:  ${pct(scores.filter((score) => score.file).length, scores.length)}`);
  console.log(`Deadline counted from story:  ${pct(counted.filter((score) => score.counted).length, counted.length)}`);
  console.log(`Never re-asks a story date:   ${pct(scores.filter((score) => score.repeats.length === 0).length, scores.length)}`);
}

/**
 * The floor: the numbers this measured on 2026-10-12. A change that drops
 * below them fails CI. Raise them as the work lands; never lower them to
 * make a change pass.
 */
// counted 8 -> 7 on 2026-10-13: not a regression. The renovation case's
// "got the claim in the mail on september 28" is the day it arrived, and the
// site now asks for the mailing date instead of counting from the arrival
// day, so that case is n/a, not a pass (7 of 7 counted).
export const FLOOR = { form: 20, file: 20, counted: 7, noRepeat: 20 };

function check(scores: CaseScore[]) {
  const got = {
    form: scores.filter((score) => score.form).length,
    file: scores.filter((score) => score.file).length,
    counted: scores.filter((score) => score.counted === true).length,
    noRepeat: scores.filter((score) => score.repeats.length === 0).length,
  };
  const below = (Object.keys(FLOOR) as (keyof typeof FLOOR)[]).filter((key) => got[key] < FLOOR[key]);
  if (below.length) {
    console.log(`\nBELOW THE FLOOR: ${below.map((key) => `${key} ${got[key]} < ${FLOOR[key]}`).join("; ")}`);
    process.exitCode = 1;
  } else {
    console.log("\nAt or above the floor on all four.");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
  check(PERSONAS.map(scoreCase));
}
