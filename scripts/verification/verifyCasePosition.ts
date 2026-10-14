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
 *   4. Pages naming different steps (2026-10-13, R5): the case layout, the
 *      Timeline/Case file deadline route and the Overview's card must work the
 *      step out the same way (caseStep.ts), so a deadline counted on the
 *      Overview is the one the Case file shows; and the Case file must not say
 *      "None yet" while the deadlines are still being counted.
 *   5. The case page reading the case before saves on their way have landed
 *      (2026-10-13, R4): it asked again for a service date and method the
 *      results page had just saved. The case layout waits for them.
 *   6. An injury date read from a later medical event in the same line
 *      (review 2026-10-13: "september 30 2026 fell, october 1 surgery" gave
 *      October 1).
 *   7. A confirmed stage lost because the site's own server was too busy
 *      (2026-10-14, run 38511243860, RN: four saves aborted at ten seconds,
 *      and the Overview asked again). A position save reaches the case even
 *      when the route never answers, never erases a save made at the same
 *      moment, and never stores an invalid value.
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
  storyWithTimeline,
  suggestedDatesFromEvents,
} from "../../src/lib/case-system/casePosition";
import { caseTitleFromIntake, isGeneratedTitle } from "../../src/lib/case-system/caseTitle";
import { ALL_STAGES, stagesForPathway } from "../../src/lib/case-system/stage-map/stageMap";
import { computedDeadlinesFor, countFromDate } from "../../src/lib/content-library/computedDeadline";
import { caseStepFor, noticeStepForCase } from "../../src/lib/case-system/caseStep";
import { findStage } from "../../src/lib/case-system/stage-map/stageMap";
import {
  POSITION_SAVE_TIMEOUT_MS,
  positionSavesSettled,
  postWithTimeout,
  savePositionDirect,
  savePositionQueued,
  setPositionClientForChecks,
  trackPositionWork,
} from "../../app/builder/_components/positionSave";

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
  // 2026-10-12 (free finish line): wordings and sentence layouts that were not linked.
  {
    const now = new Date("2026-10-12T12:00:00Z");
    const mail = storyHintsForDates("i got the plaintiffs claim in the mail on september 28", now);
    check("'got the plaintiffs claim in the mail on september 28' is the service date", mail["sc-date-claim-served"]?.value === "2026-09-28", JSON.stringify(mail));
    const door = storyHintsForDates("someone handed me the plaintiffs claim at my door on october 1", now);
    check("'handed me the plaintiffs claim at my door on october 1' is the service date", door["sc-date-claim-served"]?.value === "2026-10-01", JSON.stringify(door));
    const apart = storyHintsForDates("i slipped and hurt my elbow realy bad. the store should have put salt down. this happened january 13 2025 at 2 pm in ottawa", now);
    check("a date in its own 'this happened ...' sentence is the injury date", apart["sc-date-injury"]?.value === "2025-01-13", JSON.stringify(apart));
    check("... and the day the claim is based on", apart["case-date-act-or-omission"]?.value === "2025-01-13");
    const family = storyHintsForDates("my ex started a case and i got served on october 2 2026", now);
    check("a family service date reaches the family question", family["case-date-served-with-application"]?.value === "2026-10-02", JSON.stringify(family));
    const motion = storyHintsForDates("i was served a motion on october 2 2026", now);
    check("not when the story is about a motion", !motion["case-date-served-with-application"]);
    // Walkthrough JU (2026-10-13): a judgment told as "i won my case ... in
    // may, the judge said he owes me" is the order, quoted beside the order
    // date question; a month with no day fills nothing (the person gives the
    // day), and a full date fills it.
    const won = storyHintsForDates("i won my small claims case against my old roommate in may, the judge said he owes me 6500 plus costs. its been months and he hasnt paid anything.", now);
    check("'i won my small claims case ... in may' is quoted for the order date, with no day filled", /in may/.test(won["case-date-order-made"]?.quote ?? "") && won["case-date-order-made"]?.value === null, JSON.stringify(won["case-date-order-made"]));
    for (const [words, iso] of [
      ["the judge gave me judgment on may 14 2026", "2026-05-14"],
      ["i got a judgment on may 14, 2026 for 6500", "2026-05-14"],
      ["i won my case on may 14 2026", "2026-05-14"],
    ] as const) {
      check(`'${words}' gives the order date`, storyHintsForDates(words, now)["case-date-order-made"]?.value === iso, JSON.stringify(storyHintsForDates(words, now)["case-date-order-made"]));
    }
    // A judgment against the person is still their order (its date counts).
    for (const words of ["i lost my case on may 14 2026", "he got a judgment against me on may 14 2026", "i got default judgment on may 14 2026"]) {
      check(`'${words}' gives the order date`, storyHintsForDates(words, now)["case-date-order-made"]?.value === "2026-05-14", JSON.stringify(storyHintsForDates(words, now)["case-date-order-made"]));
    }
    // Must not misfire (review 2026-10-13): someone else's case, a hope, a
    // doubt, a negation, a question, a tribunal. A full date here is kept and
    // starts deadlines, so these give nothing, not even a quote.
    for (const words of [
      "i want to win my case",
      "he owes me 6500 for the car",
      "the judge will decide in may",
      "my friend won the case on may 14 2026",
      "my friend won his case in may",
      "i hope i won my case on may 14 2026",
      "if i win my case in may i want him to pay",
      "i think we got a judgment on may 14 2026",
      "i didn't win my case on may 14 2026",
      "i never got a judgment, the trial is on may 14 2027",
      "did i win my case? the trial was may 14 2026",
      "i won my case at the ltb on may 14 2026",
      "we got a judgment from the tribunal on may 14 2026",
      "the judge said they have to pay the court fees by may 14 2026",
    ]) {
      check(`'${words}' is not read as an order`, !storyHintsForDates(words, now)["case-date-order-made"], JSON.stringify(storyHintsForDates(words, now)["case-date-order-made"]));
    }
  }
  // Step 2B, 2026-10-12: a full story date is kept with the case as soon as it
  // is shown (the waiting "Yes, save this date" prompt was flagged as asking
  // again on 8 walkthrough cases), but only the date is saved -- never the
  // step -- and a date with no year never reaches storyDates.
  {
    const panel = readFileSync(path.resolve(__dirname, "../../app/builder/_components/StageAnswerPanel.tsx"), "utf8");
    check("full story dates are kept with the case without a click", /autoKeptFor/.test(panel) && /savePosition\(caseId, \{ dateAnswers: counted/.test(panel));
    check("keeping a story date never saves the step", !/savePosition\(caseId, \{ dateAnswers: counted, stepId/.test(panel));
    check("a story date with no year is never kept or counted", /if \(hint\.value && !hint\.yearAssumed && !arrivalOnly\[id\]\) out\[id\]/.test(panel));
    check("the kept date still shows the words it came from, with Change", /keptFromStory\[question\.id\]/.test(panel));
  }
  // Civil and family dates are asked too (2026-10-05), so the reader's own
  // words are quoted beside those questions as well.
  const family = storyHintsForDates("My ex wants to move with our son. I was served with the application on September 25, 2026 at work.");
  check("a family story's service date is offered for the application question", family["case-date-served-with-application"]?.value === "2026-09-25");
  const injury = storyHintsForDates("I was hit by a bus on March 3, 2026 at the crosswalk.");
  check("an injury date is offered for the injury question", injury["sc-date-injury"]?.value === "2026-03-03");
  // Review 2026-10-13 (9): the injury date is the date tied to the injury
  // words (fell, slipped, hurt, ...), not a later medical event in the same
  // line. The walkthrough persona's own Timeline and story.
  {
    const now = new Date("2026-10-13T12:00:00");
    const timeline = "september 30 2026 fell, october 1 surgery";
    const story = "i slipped on ice on the sidewalk on queen street in toronto on september 30 and broke my wrist. i needed surgery and cant work for months. the sidewalk wasnt salted at all. i want to sue the city";
    const fromTimeline = storyHintsForDates(timeline, now);
    check("'september 30 2026 fell, october 1 surgery': the injury is September 30, not the surgery", fromTimeline["sc-date-injury"]?.value === "2026-09-30", JSON.stringify(fromTimeline["sc-date-injury"]));
    check("and the day the claim is based on follows it", fromTimeline["case-date-act-or-omission"]?.value === "2026-09-30");
    const fromStory = storyHintsForDates(story, now);
    check("'i slipped on ice ... on september 30 and broke my wrist': September 30", fromStory["sc-date-injury"]?.value === "2026-09-30", JSON.stringify(fromStory["sc-date-injury"]));
    const both = storyHintsForDates(storyWithTimeline(story, timeline), now);
    check("story and Timeline together: September 30", both["sc-date-injury"]?.value === "2026-09-30", JSON.stringify(both["sc-date-injury"]));
    // Property: whatever medical event follows, and in either order, the date
    // next to the injury word wins.
    const misread: string[] = [];
    for (const word of ["fell", "slipped", "was injured", "got hurt", "had an accident", "was hit by a car"]) {
      for (const medical of ["surgery", "hospital", "doctor appointment", "x-ray", "physio"]) {
        for (const line of [`march 3 2026 ${word}, march 5 2026 ${medical}`, `${word} on march 3 2026, ${medical} on march 5 2026`, `${medical} on march 5 2026 after i ${word} on march 3 2026`]) {
          if (storyHintsForDates(line, now)["sc-date-injury"]?.value !== "2026-03-03") misread.push(line);
        }
      }
    }
    check("for every injury word and later medical event, the injury date is the one by the injury word", misread.length === 0, misread.slice(0, 4).join(" | "));
  }
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
    // Since 2026-10-13 the step comes from caseStepFor, whose "a chosen step
    // always wins" is asserted by behaviour in section 5 below.
    /readCasePosition\(/.test(route) && /caseStepFor\(ownedCase\.master_result/.test(route) && /findStage\(stepId\)/.test(route) && personsDatesWin(route),
  );
  check("workspace deadlines no longer match a stage id to a court path", !/candidate\.id === ownedCase\.court_path/.test(route));
}

{
  const builder = read("app/builder/page.tsx");
  const saveAt = builder.indexOf("master_result: {\n              ...masterPayload");
  const readAt = builder.lastIndexOf('.select("master_result,updated_at")', saveAt);
  check(
    "a builder re-save keeps the position and drafts, read fresh just before writing",
    saveAt !== -1 &&
      readAt !== -1 &&
      /\.\.\.userOwned/.test(builder.slice(saveAt, saveAt + 400)) &&
      // The kept keys include position and drafts; more may join (Phase 1
      // added formApplicability and intakeAnswers).
      /\["position", "drafts"[^\]]*\]/.test(builder.slice(readAt, saveAt)),
  );
  // 2026-10-13: and only over what it read -- a stage saved in between is
  // rebuilt on top, not erased.
  check(
    "a builder re-save writes only if nothing saved in between, and rebuilds on top if something did",
    /write = write\.eq\("updated_at", userOwnedRow\.updated_at\)/.test(builder) && /outcome = await buildAndWrite\(\)/.test(builder),
  );
}

{
  const route = read("app/api/cases/position/route.ts");
  check(
    "the position route writes only for the authenticated owner, through applyPositionPatch",
    /getAuthenticatedUser\(/.test(route) && /getAuthenticatedOwnedCase\(/.test(route) && /applyPositionPatch\(/.test(route) && /\.eq\("user_id", user\.id\)/.test(route),
  );
  // 2026-10-13: two saves at once erased each other (a confirmed stage lost to
  // a date save). The route writes only if the case is unchanged since it
  // read it, and the pages send one save at a time.
  check("the position route writes only if nothing else wrote since it read", /write = write\.eq\("updated_at", fresh\.updated_at\)/.test(route) && /attempt < 3/.test(route));
  for (const file of ["app/builder/page.tsx", "app/builder/_components/StageAnswerPanel.tsx", "app/cases/[id]/page.tsx"]) {
    const source = read(file);
    check(`${file} saves the position one save at a time`, /savePositionQueued\(/.test(source) && !/fetch\("\/api\/cases\/position"/.test(source));
  }
  check("the builder sends what was decided on the page once the case exists", /sentPositionRef/.test(read("app/builder/page.tsx")));
}

// ---- 5. Every case page names the step the Overview's card shows ----------
// Walkthrough 2026-10-13, R5: a sidewalk fall's Overview card opened on the
// notice step and counted its deadlines from the saved injury date; the Case
// file named the court-starting step and said "None yet". The layout, the
// Timeline/Case file deadline route and the card now take the step from one
// place (caseStep.ts). Properties: a chosen step always wins; for someone
// starting a case whose claim needs notice, the step is that notice step;
// a responding party never gets a notice step; every date the card asks at a
// step counts at least one deadline the way the Case file counts them.
{
  const story = "I slipped on ice on the sidewalk on Queen Street in Toronto on September 30 and broke my wrist. I want to sue the city.";
  const civilStarting = (position: Record<string, unknown>) => ({
    intakeData: { courtPath: "civil", extra: { civilInput: { facts: story, yourRole: "Plaintiff" } } },
    position: { confirmedStage: "starting-case", ...position },
  });
  const notice = noticeStepForCase(civilStarting({}), "civil");
  check("step: a starting case whose story needs notice has a notice step", Boolean(notice));
  check(
    "step: with no step chosen, every page's step is the notice step the card opens on",
    caseStepFor(civilStarting({}), "civil", false, { requireConfirmedStage: true }) === notice &&
      caseStepFor(civilStarting({}), "civil", false) === notice,
  );
  const chosen = stagesForPathway("civil").find((stage) => stage.id !== notice)!.id;
  check("step: a step the person chose always wins", caseStepFor(civilStarting({ stepId: chosen }), "civil", false) === chosen);
  check(
    "step: a responding party is never put on a notice step",
    caseStepFor({ ...civilStarting({}), position: { confirmedStage: "responding" } }, "civil", true) !== notice,
  );
  check(
    "step: no confirmed stage and none chosen: no step where the page requires a confirmed stage",
    caseStepFor({ intakeData: { extra: { story: "x" } } }, "small-claims", false, { requireConfirmedStage: true }) === "",
  );
  // The counted deadline reaches the Case file for the notice step's own date.
  const injuryAsked = dateQuestionsForStep(notice ?? "").find((question) => /injur/i.test(question.id));
  const counted = injuryAsked
    ? computedDeadlinesFor(findStage(notice as string)!.deadlines, caseDatesFrom({ [injuryAsked.id]: "2026-09-30" }), "workspace")
    : [];
  check("step: the injury date saved on the Overview counts the notice step's deadlines for the Case file", counted.length > 0);
  let uncounted: string[] = [];
  for (const pathway of ["small-claims", "civil", "family"] as const) {
    for (const stage of stagesForPathway(pathway)) {
      for (const question of dateQuestionsForStep(stage.id)) {
        const out = computedDeadlinesFor(stage.deadlines, caseDatesFrom({ [question.id]: "2026-10-01" }), "workspace");
        if (out.length === 0) uncounted.push(`${stage.id} / ${question.id}`);
      }
    }
  }
  check("step: every date the card asks at a step counts a deadline the way the Case file counts", uncounted.length === 0, uncounted.slice(0, 5).join("; "));

  check(
    "step: with no confirmed stage, pages that require one name no step, even where a notice step would fit",
    caseStepFor({ ...civilStarting({}), position: {} }, "civil", false, { requireConfirmedStage: true }) === "",
  );

  // The pages call the one rule (calls exist; what it returns is asserted above).
  const layout = read("app/cases/[id]/layout.tsx");
  const deadlinesRoute = read("app/api/workspace/organisation/route.ts");
  const overview = read("app/cases/[id]/page.tsx");
  const ownRules = /suggestedStageFor\(|stepFromPicture\(/;
  check(
    "step: the case layout and the deadline route take the step from caseStepFor, not their own rules",
    /caseStepFor\(/.test(layout) && /caseStepFor\(/.test(deadlinesRoute) && !ownRules.test(layout) && !ownRules.test(deadlinesRoute),
  );
  check(
    "step: the layout and the deadline route both require a confirmed stage before suggesting a step",
    [layout, deadlinesRoute].every((source) => /caseStepFor\([^;]*requireConfirmedStage: true/.test(source)),
  );
  check("step: the Overview's card reads the same notice step and words", /noticeStepForCase\(/.test(overview) && /stepStoryText\(/.test(overview));
  const caseFile = read("app/cases/[id]/case-file/page.tsx");
  const loadingAt = caseFile.indexOf("deadlines === null");
  const noneYetAt = caseFile.indexOf("None yet. Give the dates");
  check(
    "step: the Case file says it is still counting rather than \"None yet\", and stops when nothing more is coming",
    loadingAt > 0 && noneYetAt > loadingAt && /setDeadlines\(\[\]\)/.test(caseFile),
  );
}

// ---- 6. The case page reads the case after saves on their way --------------
// Walkthrough 2026-10-13, R4: the results page said the service date and
// method were "Saved to your case"; the case page, opened while those saves
// were still going, asked "How were the papers served?" and "Which year was
// that?" again. The builder registers its runs of saves, the case layout
// waits for that case's saves before reading, and the Overview reads the case
// again once its own saves land. The waiting itself is asserted by behaviour
// at the end of this file.
{
  const layout = read("app/cases/[id]/layout.tsx");
  const settleAt = layout.indexOf("positionSavesSettled(");
  const readAt = layout.indexOf('.from("cases")');
  check("saves: the case layout waits for that case's position saves before it reads the case", settleAt > 0 && readAt > settleAt);
  check("saves: the builder registers its runs of saves", (read("app/builder/page.tsx").match(/trackPositionWork\(/g) ?? []).length >= 2);
  check(
    "saves: the Overview reads the case again once its card's saves land",
    /positionSavesSettled\([^)]*\)[\s\S]{0,40}reload/.test(read("app/cases/[id]/page.tsx")),
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

// The waiting itself (R4), asynchronous so it runs after the checks above.
void (async () => {
  let asyncFailures = 0;
  const assert = (name: string, ok: boolean) => {
    if (ok) console.log(`PASS  ${name}`);
    else {
      asyncFailures += 1;
      console.error(`FAIL  ${name}`);
    }
  };
  const caseA = "case-a";
  let release: () => void = () => undefined;
  trackPositionWork(caseA, new Promise<void>((resolve) => {
    release = resolve;
  }));
  let settled = false;
  const waiting = positionSavesSettled(caseA, 5_000).then(() => {
    settled = true;
  });
  await new Promise((resolve) => setTimeout(resolve, 30));
  // A run registered while the reader waits is waited for too.
  let releaseLate: () => void = () => undefined;
  trackPositionWork(caseA, new Promise<void>((resolve) => {
    releaseLate = resolve;
  }));
  release();
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert("saves: a reader waits while a save run for its case is still going", !settled);
  releaseLate();
  await waiting;
  assert("saves: the reader goes ahead once every run for its case has finished", settled);

  // Another case's save never holds this case up.
  trackPositionWork("case-b", new Promise<void>(() => undefined));
  const startedOther = Date.now();
  await positionSavesSettled(caseA, 5_000);
  assert("saves: a save for another case does not hold this case up", Date.now() - startedOther < 500);

  const started = Date.now();
  trackPositionWork(caseA, new Promise<void>(() => undefined));
  await positionSavesSettled(caseA, 60);
  assert("saves: a save that never finishes does not stop the case opening", Date.now() - started < 2_000);

  // A save request that hangs is given up after its timeout, so it cannot
  // hold the queue (review 2026-10-13: there was no timeout).
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((_url: unknown, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    })) as typeof fetch;
  // AbortSignal.timeout's timer does not keep Node running; this one does,
  // and a request that is never given up reads as "hung", a failure.
  let keepAlive: ReturnType<typeof setTimeout> | undefined;
  const startedPost = Date.now();
  const ok = await Promise.race([
    postWithTimeout("/api/cases/position", { method: "POST" }, 50),
    new Promise<"hung">((resolve) => {
      keepAlive = setTimeout(() => resolve("hung"), 2_000);
    }),
  ]);
  clearTimeout(keepAlive);
  globalThis.fetch = realFetch;
  assert("saves: a save request that hangs is given up after its timeout", ok === false && Date.now() - startedPost < 2_000);
  assert("saves: the save timeout is at most 10 seconds", POSITION_SAVE_TIMEOUT_MS > 0 && POSITION_SAVE_TIMEOUT_MS <= 10_000);

  // ---- 7. A confirmed stage reaches the case even when the site's own
  // server is too busy to answer (walkthrough run 38511243860, RN): all four
  // saves of the Small Claims guided defendant's stage ended
  // "POST /api/cases/position failed: net::ERR_ABORTED", the Overview and a
  // reload asked "Yes, that is right" again. Reproduced here: the route never
  // answers, and the stage must still be on the case, everything else on it
  // kept. Properties, not values: any valid patch lands; an invalid one never
  // does; a save made at the same moment is not erased.
  type Row = { court_path: string; master_result: Record<string, unknown>; updated_at: string };
  const fakeCases = (row: Row) => {
    let stamp = 0;
    const hooks: { beforeWrite: (() => void) | null } = { beforeWrite: null };
    const db = {
      from() {
        return {
          select(columns: string) {
            const chain = {
              eq: () => chain,
              maybeSingle: async () => ({
                data: /master_result/.test(columns)
                  ? { master_result: JSON.parse(JSON.stringify(row.master_result)), updated_at: row.updated_at }
                  : { court_path: row.court_path },
                error: null,
              }),
            };
            return chain;
          },
          update(values: { master_result: Record<string, unknown> }) {
            const filters: [string, string][] = [];
            const chain = {
              eq: (column: string, value: string) => {
                filters.push([column, value]);
                return chain;
              },
              select: async () => {
                const hook = hooks.beforeWrite;
                hooks.beforeWrite = null;
                hook?.();
                const expected = filters.find(([column]) => column === "updated_at")?.[1];
                if (expected !== undefined && expected !== row.updated_at) return { data: [], error: null };
                row.master_result = values.master_result;
                row.updated_at = `2026-10-14T00:00:${String((stamp += 1)).padStart(2, "0")}Z`;
                return { data: [{ id: "case" }], error: null };
              },
            };
            return chain;
          },
        };
      },
    };
    return { db, hooks };
  };
  const asRecordOf = (value: unknown): Record<string, unknown> => (value && typeof value === "object" ? (value as Record<string, unknown>) : {});
  const hungFetch = globalThis.fetch;
  globalThis.fetch = ((_url: unknown, init?: RequestInit) => {
    return new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("net::ERR_ABORTED"))));
  }) as typeof fetch;
  try {
    for (const court of ["small-claims", "civil", "family"] as const) {
      const row: Row = { court_path: court, master_result: { intakeData: { courtPath: court }, casePicture: { kept: true } }, updated_at: "2026-10-14T00:00:00Z" };
      const { db } = fakeCases(row);
      setPositionClientForChecks(db as never);
      const caseId = `rn-${court}`;
      const saved = await savePositionQueued(caseId, { confirmedStage: "responding" });
      await positionSavesSettled(caseId, 5_000);
      const position = readCasePosition(row.master_result, court);
      assert(
        `saves (${court}): a confirmed stage is on the case though the position route never answers`,
        saved === true && position.confirmedStage === "responding" && Boolean(asRecordOf(row.master_result).casePicture) && Boolean(asRecordOf(row.master_result).intakeData),
      );
    }

    // A save at the same moment (the case reader's write) is not erased: the
    // stage is re-applied on top of it.
    const row: Row = { court_path: "small-claims", master_result: { intakeData: {} }, updated_at: "2026-10-14T00:00:00Z" };
    const { db, hooks } = fakeCases(row);
    hooks.beforeWrite = () => {
      row.master_result = { ...row.master_result, casePicture: { written: "meanwhile" } };
      row.updated_at = "2026-10-14T00:00:30Z";
    };
    const outcome = await savePositionDirect(db as never, "case-x", { confirmedStage: "starting-case" });
    assert(
      "saves: a save made between the read and the write is kept, and the stage lands on top of it",
      outcome === "saved" && readCasePosition(row.master_result, "small-claims").confirmedStage === "starting-case" && Boolean(asRecordOf(row.master_result).casePicture),
    );

    // Refused, never stored: an unknown stage, a step from another court.
    const before = JSON.stringify(row.master_result);
    const unknown = await savePositionDirect(db as never, "case-x", { confirmedStage: "winning" });
    const otherCourt = stagesForPathway("family")[0]?.id;
    const wrongStep = await savePositionDirect(db as never, "case-x", { stepId: otherCourt });
    assert(
      "saves: an unknown stage or another court's step is refused and nothing is written",
      unknown === "refused" && wrongStep === "refused" && JSON.stringify(row.master_result) === before,
    );
    setPositionClientForChecks(fakeCases(row).db as never);
    assert("saves: a refused save is reported as not saved", (await savePositionQueued("case-x", { confirmedStage: "winning" })) === false);
  } finally {
    setPositionClientForChecks(null);
    globalThis.fetch = hungFetch;
  }
  console.log(asyncFailures ? `\n${asyncFailures} save-timing check(s) failed.` : "\nAll save-timing checks passed.");
  if (asyncFailures) process.exitCode = 1;
})();
