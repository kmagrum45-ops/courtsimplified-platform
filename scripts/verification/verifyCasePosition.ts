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
import path from "node:path";

import {
  EMPTY_POSITION,
  applyPositionPatch,
  dateQuestionsForStep,
  readCasePosition,
  suggestedDatesFromEvents,
} from "../../src/lib/case-system/casePosition";
import { ALL_STAGES, stagesForPathway } from "../../src/lib/case-system/stage-map/stageMap";

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
  // A date is asked only where the engine will count from it: never for a
  // deadline under the civil or family rules, whose periods are shown with
  // their rule instead (computedDeadline.ts).
  const uncounted = ALL_STAGES.flatMap((stage) =>
    stage.deadlines
      .filter((deadline) => deadline.regime === "civil-rules" || deadline.regime === "family-rules")
      .map((deadline) => deadline.what),
  );
  const askedFor = ALL_STAGES.flatMap((stage) => dateQuestionsForStep(stage.id).flatMap((question) => question.sets));
  check(
    "no date is asked for a deadline the engine does not count",
    askedFor.every((what) => !uncounted.includes(what)),
    askedFor.filter((what) => uncounted.includes(what)).join("; "),
  );
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

// ---- 3. The wiring ----

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

{
  const route = read("app/api/case/stage-answer/route.ts");
  check(
    "the stage-answer route counts from the user's dates",
    /caseDatesFrom\(/.test(route) && /renderStageAnswerOrRefuse\(stageId, facts, dates, scope\)/.test(route),
  );
}

{
  const route = read("app/api/workspace/organisation/route.ts");
  check(
    "workspace deadlines come from the stored step and dates",
    /readCasePosition\(/.test(route) && /findStage\(position\.stepId\)/.test(route) && /caseDatesFrom\(position\.dateAnswers\)/.test(route),
  );
  check("workspace deadlines no longer match a stage id to a court path", !/candidate\.id === ownedCase\.court_path/.test(route));
}

{
  const builder = read("app/builder/page.tsx");
  const saveAt = builder.indexOf("master_result: {\n              ...masterPayload");
  const readAt = builder.lastIndexOf('.select("master_result")', saveAt);
  check(
    "a builder re-save keeps the position, read fresh just before writing",
    saveAt !== -1 && readAt !== -1 && /position: savedPosition/.test(builder.slice(saveAt, saveAt + 400)),
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
