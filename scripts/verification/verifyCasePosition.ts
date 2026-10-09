/**
 * The case's confirmed position — stage, exact step, and the dates that set its
 * deadlines — is stored only as the user gave it, and reaches the pages that
 * count deadlines.
 *
 * COSTS NOTHING. Pure functions and source reads; no network, no model.
 *
 * WHY. Added 2026-10-04 with src/lib/case-system/casePosition.ts and the case
 * page. Before it, the stage a user confirmed lived only in the builder's
 * memory, no page asked the dates the deadline engine counts from, and the
 * workspace's deadline view looked its stage up by court path (which no stage
 * id equals) and read a field nothing wrote, so it was always empty.
 *
 * WHAT THIS CATCHES:
 *   1. A value outside the fixed vocabularies being stored: an unknown stage, a
 *      step from another court, a date question that does not exist, a date
 *      that is not a real date. Each would later drive a next step or a
 *      computed deadline the user never chose.
 *   2. A suggestion becoming an answer: only exact, calendar-picked dates on
 *      the timeline are offered, and they are offered, not stored.
 *   3. The wiring going dead again: the stage-answer route ignoring dates, the
 *      workspace deadlines reading something other than the stored position,
 *      or a builder re-save erasing a position written after the page loaded.
 *
 * Run: node --import tsx scripts/verification/verifyCasePosition.ts
 */

import { readFileSync } from "node:fs";

import { caseDatesFrom } from "../../src/lib/case-system/deadlines/deadlineEvents";
import { computeDeadline } from "../../src/lib/case-system/deadlines/deadlineEngine";
import path from "node:path";

import {
  EMPTY_POSITION,
  applyPositionPatch,
  dateQuestionsForStep,
  isDateQuestionId,
  readCasePosition,
  storyHintsForDates,
  suggestedDatesFromEvents,
} from "../../src/lib/case-system/casePosition";
import { caseTitleFromIntake, isGeneratedTitle } from "../../src/lib/case-system/caseTitle";
import { ALL_STAGES, stagesForPathway } from "../../src/lib/case-system/stage-map/stageMap";
import { countFromDate } from "../../src/lib/content-library/computedDeadline";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`pass  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const NOW = new Date("2026-10-04T12:00:00Z");
const scStep = stagesForPathway("small-claims")[0]?.id ?? "";
const familyStep = stagesForPathway("family")[0]?.id ?? "";

// ---- 1. Only valid values are stored ----

{
  const ok = applyPositionPatch(EMPTY_POSITION, { confirmedStage: "responding" }, "small-claims", NOW);
  check("a listed stage is stored, with when", ok.ok && ok.position.confirmedStage === "responding" && ok.position.confirmedStageAt === NOW.toISOString());
  check("an unlisted stage is refused", !applyPositionPatch(EMPTY_POSITION, { confirmedStage: "winning" }, "small-claims", NOW).ok);
}

{
  check("a step from this court is stored", applyPositionPatch(EMPTY_POSITION, { stepId: scStep }, "small-claims", NOW).ok);
  check(
    "a step from another court is refused",
    Boolean(familyStep) && !applyPositionPatch(EMPTY_POSITION, { stepId: familyStep }, "small-claims", NOW).ok,
  );
  check("a step that does not exist is refused", !applyPositionPatch(EMPTY_POSITION, { stepId: "plaintiff:made-up" }, "small-claims", NOW).ok);
}

{
  const stored = applyPositionPatch(EMPTY_POSITION, { dateAnswers: { "sc-date-claim-served": "2026-09-20" } }, "small-claims", NOW);
  check("a real date for a real question is stored", stored.ok && stored.position.dateAnswers["sc-date-claim-served"] === "2026-09-20");
  check(
    "a date for a question that does not exist is refused",
    !applyPositionPatch(EMPTY_POSITION, { dateAnswers: { "sc-date-made-up": "2026-09-20" } }, "small-claims", NOW).ok,
  );
  check(
    "a date that does not exist is refused",
    !applyPositionPatch(EMPTY_POSITION, { dateAnswers: { "sc-date-claim-served": "2026-02-31" } }, "small-claims", NOW).ok,
  );
  check(
    "words are refused as a date",
    !applyPositionPatch(EMPTY_POSITION, { dateAnswers: { "sc-date-claim-served": "a few weeks ago" } }, "small-claims", NOW).ok,
  );
  if (stored.ok) {
    const cleared = applyPositionPatch(stored.position, { dateAnswers: { "sc-date-claim-served": "" } }, "small-claims", NOW);
    check("an empty answer removes the date", cleared.ok && !("sc-date-claim-served" in cleared.position.dateAnswers));
  }
  const mixed = applyPositionPatch(
    EMPTY_POSITION,
    { confirmedStage: "responding", dateAnswers: { "sc-date-claim-served": "nonsense" } },
    "small-claims",
    NOW,
  );
  check("one invalid part refuses the whole change", !mixed.ok);
}

{
  const read = readCasePosition(
    {
      position: {
        confirmedStage: "winning",
        stepId: familyStep,
        dateAnswers: { "sc-date-claim-served": "2026-09-20", "sc-date-made-up": "2026-09-20", "sc-date-defence-filed": "soon" },
      },
    },
    "small-claims",
  );
  check(
    "reading a stored position drops what no longer validates",
    read.confirmedStage === null &&
      read.stepId === null &&
      Object.keys(read.dateAnswers).join(",") === "sc-date-claim-served",
    JSON.stringify(read),
  );
}

// ---- 2. Questions follow the step; suggestions are only exact dates ----

{
  const asked = stagesForPathway("small-claims").flatMap((stage) => dateQuestionsForStep(stage.id));
  check("some Small Claims step asks a date (the engine has an input)", asked.length > 0);
  check(
    "every date asked is tied to a deadline it sets",
    asked.every((question) => question.sets.length > 0 && question.question.length > 0),
  );
  // A date is asked only where the engine will count from it. (Until
  // 2026-10-05 that meant never for a civil or family deadline; the engine
  // now counts under those rules too, so the check asserts the property
  // itself: every deadline a question sets computes from a known date.)
  const notCounted: string[] = [];
  for (const stage of ALL_STAGES) {
    const questions = dateQuestionsForStep(stage.id);
    if (questions.length === 0) continue;
    const dates = caseDatesFrom(Object.fromEntries(questions.map((question) => [question.id, "2026-02-02"])));
    for (const deadline of stage.deadlines) {
      if (!questions.some((question) => question.sets.includes(deadline.what))) continue;
      const { from } = countFromDate(deadline, dates);
      try {
        if (!from) throw new Error("no date");
        computeDeadline({ from, length: deadline.length, regime: deadline.regime, direction: deadline.direction });
      } catch {
        notCounted.push(`${stage.id}: ${deadline.what}`);
      }
    }
  }
  check("no date is asked for a deadline the engine does not count", notCounted.length === 0, notCounted.slice(0, 5).join("; "));
  check("an unknown step asks nothing", dateQuestionsForStep("not-a-step").length === 0);
}

{
  const suggestions = suggestedDatesFromEvents([
    { event_type: "claim-served", title: "Served at home", occurred_at_normalized: "2026-09-20", date_certainty: "exact" },
    { event_type: "defence-filed", title: "Filed it", occurred_at_normalized: "2026-09-25", date_certainty: "approximate" },
    { event_type: "trial-held", title: "Trial", occurred_at_normalized: "2026-09-26", date_certainty: "exact" },
  ]);
  check(
    "an exact timeline date is offered for the matching question",
    suggestions["sc-date-claim-served"]?.value === "2026-09-20" && suggestions["sc-date-claim-served"].basis.includes("Served at home"),
  );
  check("an approximate date is never offered", !("sc-date-defence-filed" in suggestions));
  check("an event with no matching question offers nothing", Object.keys(suggestions).length === 1);
}

{
  // 2026-10-06 (page review): a date with no year is now OFFERED as the most
  // recent such date, marked as an assumption -- no served person ever saw a
  // due date while it was only quoted. It is still never applied: the panel
  // shows it as a button the user chooses (StageAnswerPanel).
  const noYear = storyHintsForDates(
    "I was served a claim about the car. The papers came on September 25.",
    new Date("2026-10-06T12:00:00Z"),
  );
  check(
    "a story date with no year is quoted back and offered only as an assumption",
    noYear["sc-date-claim-served"]?.quote === "The papers came on September 25." &&
      noYear["sc-date-claim-served"].value === "2026-09-25" &&
      noYear["sc-date-claim-served"].yearAssumed === true,
    JSON.stringify(noYear),
  );
  const full = storyHintsForDates("I was served on September 20, 2026 at my house.");
  check("a complete story date is offered for the matching question", full["sc-date-claim-served"]?.value === "2026-09-20");
  check("a story with no such moment gives no hint", Object.keys(storyHintsForDates("He owes me money for a painting job.")).length === 0);
  // Civil and family dates are asked too (2026-10-05), so the reader's own
  // words are quoted beside those questions as well.
  const family = storyHintsForDates("My ex wants to move with our son. I was served with the application on September 25, 2026 at work.");
  check("a family story's service date is offered for the application question", family["case-date-served-with-application"]?.value === "2026-09-25");
  const injury = storyHintsForDates("I was hit by a bus on March 3, 2026 at the crosswalk.");
  check("an injury date is offered for the injury question", injury["sc-date-injury"]?.value === "2026-03-03");
  check("every cue is for a question that is really asked", Object.keys(storyHintsForDates("served application motion to change case conference settlement conference trial management conference trial motion heard notice of appeal judge made an order statement of defence request to admit mediation hit by")).every((id) => isDateQuestionId(id)));
}

{
  check(
    "an engine summary is not kept as a case title",
    isGeneratedTitle("Current case status: Responding to a case. Case story I was served a plaintiff") && !isGeneratedTitle("Smith v. Jones"),
  );
  check(
    "a case is named for the other party the user typed",
    caseTitleFromIntake("  Rapid   Tow ", "small-claims") === "Your case with Rapid Tow" && caseTitleFromIntake("", "family") === "Family case",
  );
}

// ---- 3. The wiring ----

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

{
  const route = read("app/api/case/stage-answer/route.ts");
  check(
    "the stage-answer route counts from the user's dates",
    /caseDatesFrom\(/.test(route) && /renderStageAnswerOrRefuse\(stageId, facts, dates, scope\)/.test(route),
  );
}

/** The last spread passed to caseDatesFrom is, or ends with, position.dateAnswers. */
function personsDatesWin(source: string): boolean {
  const arg = /caseDatesFrom\(([^)]*)\)/.exec(source)?.[1]?.trim() ?? "";
  if (arg === "position.dateAnswers") return true;
  const last = [...arg.matchAll(/\.\.\.([\w.]+)/g)].at(-1)?.[1] ?? "";
  if (last === "position.dateAnswers") return true;
  const definition = new RegExp(`const ${last} = \\{([^}]*)\\}`).exec(source)?.[1] ?? "";
  return [...definition.matchAll(/\.\.\.([\w.]+)/g)].at(-1)?.[1] === "position.dateAnswers";
}

{
  const route = read("app/api/workspace/organisation/route.ts");
  check(
    "workspace deadlines come from the stored step and dates",
    // The chosen step first; since Phase 1 (2026-10-07) the step the
    // confirmed stage points to when none was chosen.
    // The property (CLAUDE.md section 5): the person's own dates reach the
    // count and win over anything offered under them (2026-10-09: dates from
    // the story were added underneath).
    /readCasePosition\(/.test(route) && /position\.stepId\s*\|\|/.test(route) && /findStage\(stepId\)/.test(route) && personsDatesWin(route),
  );
  check("workspace deadlines no longer match a stage id to a court path", !/candidate\.id === ownedCase\.court_path/.test(route));
}

{
  const builder = read("app/builder/page.tsx");
  const saveAt = builder.indexOf("master_result: {\n              ...masterPayload");
  const readAt = builder.lastIndexOf('.select("master_result")', saveAt);
  check(
    "a builder re-save keeps the position and drafts, read fresh just before writing",
    saveAt !== -1 &&
      readAt !== -1 &&
      /\.\.\.userOwned/.test(builder.slice(saveAt, saveAt + 400)) &&
      // The kept keys include position and drafts; more may join (Phase 1
      // added formApplicability and intakeAnswers).
      /\["position", "drafts"[^\]]*\]/.test(builder.slice(readAt, saveAt)),
  );
}

{
  const route = read("app/api/cases/position/route.ts");
  check(
    "the position route writes only for the authenticated owner, through applyPositionPatch",
    /getAuthenticatedUser\(/.test(route) && /getAuthenticatedOwnedCase\(/.test(route) && /applyPositionPatch\(/.test(route) && /\.eq\("user_id", user\.id\)/.test(route),
  );
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll case-position checks passed.");

// A Small Claims trial step asks the trial date and counts back from it
// (held-back walkthrough, 2026-10-09: "the trial is on January 14 2027" and no
// date was ever worked out).
for (const stepId of ["plaintiff:trial-date-set", "defendant:trial-date-set"]) {
  const asked = dateQuestionsForStep(stepId).map((question) => question.id);
  if (!asked.includes("case-date-trial-date")) {
    console.error(`FAIL  ${stepId} asks for the trial date`);
    process.exitCode = 1;
  } else console.log(`PASS  ${stepId} asks for the trial date`);
}
