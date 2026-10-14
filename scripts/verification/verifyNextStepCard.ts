/**
 * "Your next step" comes first: the step, its deadline counted from the
 * person's dates (or the period and what it runs from), what to do and the
 * forms, with the full answer folded underneath. Master plan Phase 2
 * (docs/MASTER_PLAN.md).
 *
 * WHY (page review round 4, 2026-10-07). Every reviewer found the one thing a
 * person needs buried: "Based on the date you gave us, the last day for this
 * is Tuesday 13 October 2026" sat under three paragraphs about substituted
 * service and corporations, on a phone. A lawyer says the date and the form
 * first.
 *
 * WHAT IT CATCHES:
 *   - a step with a known date whose card does not carry the counted date;
 *   - a step with no date whose card drops the period instead of showing it;
 *   - a card line with no `what` (a deadline the reader cannot place);
 *   - every step in all three courts: the summary is built for each one, and
 *     each counted date is one the full answer below also states;
 *   - the panel going back to the full answer first, or showing the card
 *     without the full answer under it;
 *   - (2026-10-13 walkthrough) a time limit on any card without its rule; a
 *     passed bar not shown as passed, shown without the rule's own "is not a
 *     bar" exceptions or the help pointer, or a limit that is not a bar shown
 *     as one; a limit tied to a claim the person's words do not name (property,
 *     or the information program on a support-only motion to change) leading
 *     the card, or lost when folded.
 *   - (2026-10-13 review) a "passed" box for a notice the card dropped; a
 *     statutory last day on a Saturday or holiday called passed while the
 *     next open weekday (Legislation Act s. 89 (2)) has not gone by; onSaved
 *     told before the save is queued (so the case page's wait returns at
 *     once); a reload of the step just chosen dropping the facts given.
 *
 *   - (walkthrough run 38500825561) a statutory counted day on a closed day
 *     called THE last day on the card; "today" read in the device's zone
 *     instead of Ontario's; a notice step titled with every notice kind once
 *     the words keep one, or led by the every-notice paragraph; an "If" limit
 *     about a kind of claim the words never mention leading, or lost; a
 *     "when service counts" sentence (4 p.m.) without its subrule; the support
 *     table shown above the motion-to-change step for an existing order;
 *     a way of serving the story already gives drawn as an open question; an
 *     unpaid judgment with no six-year leave limit (r. 20.08 (2.1)); "What
 *     can happen next" quoting a notice the person's words do not fit.
 *
 * COSTS NOTHING: the stage-answer route and source reads, no model.
 *
 * Run: npm run test:next-step
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { POST } from "../../app/api/case/stage-answer/route";
import { cardLimits, cardShowsLead, factsForStep, passedBars, servedWhenOf, serviceMethodShown, stepTitleFor, withoutCardLead } from "../../app/builder/_components/StageAnswerPanel";
import { movesForWords } from "../../app/_components/WhatComesNext";
import { nextStepsFor } from "../../src/lib/case-system/stage-map/stageSequence";
import { serviceMethodFromStory } from "../../src/lib/case-system/deadlines/serviceEffectiveDate";
import {
  PASSED_CHECK_CLOSED,
  claimFit,
  closedDayLine,
  deadlineLineFor,
  limitPassedState,
  nextWeekdayOpen,
  noticeKindOf,
  todayInOntario,
} from "../../src/lib/content-library/nextStepPractical";
import { addDays, dayOfWeek, holidayFor } from "../../src/lib/case-system/deadlines/holidays";
import { ALL_STAGES } from "../../src/lib/case-system/stage-map/stageMap";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`ok    ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

type Summary = {
  title: string;
  deadlines: { what: string; date: string; statement: string }[];
  periods: { what: string; count: number; unit: string; countFrom: string }[];
};
type Body = { outcome: string; nextStep?: Summary | null; answer?: { sections: { heading: string; text: string }[] } };

async function ask(stageId: string, courtPath: string, dateAnswers: Record<string, string> = {}): Promise<Body> {
  const response = await POST(
    new Request("http://local/api/case/stage-answer", {
      method: "POST",
      body: JSON.stringify({ stageId, courtPath, confirmedFacts: {}, dateAnswers }),
    }),
  );
  return (await response.json()) as Body;
}

async function main() {
  // A served civil defendant: the counted date is on the card.
  const served = await ask("civil:defendant:served-defence-period-running", "civil", {
    "sc-date-claim-served": "2026-09-20",
  });
  const counted = served.nextStep?.deadlines ?? [];
  check("a served defendant's card carries the counted date", counted.some((item) => /13 October 2026/.test(item.statement)), JSON.stringify(counted));

  // No date yet: the period is shown instead.
  const noDate = await ask("defendant:served-defence-period-running", "small-claims");
  check(
    "with no date the card shows the period and what it runs from",
    (noDate.nextStep?.periods ?? []).some((item) => item.count > 0 && item.countFrom.length > 0),
    JSON.stringify(noDate.nextStep),
  );

  // Every step that renders gets a summary whose lines can be placed.
  let rendered = 0;
  let unplaced = 0;
  for (const stage of ALL_STAGES) {
    const courtPath = stage.id.startsWith("civil:") ? "civil" : stage.id.startsWith("family:") ? "family" : "small-claims";
    const body = await ask(stage.id, courtPath);
    if (body.outcome !== "rendered") continue;
    rendered += 1;
    if (!body.nextStep?.title) unplaced += 1;
    for (const item of [...(body.nextStep?.deadlines ?? []), ...(body.nextStep?.periods ?? [])]) {
      if (!item.what.trim()) unplaced += 1;
    }
  }
  check(`every rendered step has a titled summary with placeable lines (${rendered} steps)`, rendered > 100 && unplaced === 0, `unplaced: ${unplaced}`);

  // The counted date the card shows is the one the full answer states.
  const full = served.answer?.sections.find((section) => section.heading === "Your deadline")?.text ?? "";
  check("the card's date matches the full answer's", counted.every((item) => full.includes(item.statement)), full.slice(-300));

  const panel = readFileSync(path.resolve(__dirname, "../../app/builder/_components/StageAnswerPanel.tsx"), "utf8");
  const cardAt = panel.indexOf("<NextStepCard");
  const fullAt = panel.indexOf('data-testid="stage-answer-full"');
  check("the card comes before the full answer", cardAt > 0 && fullAt > cardAt);
  check("the full answer is still there, folded under the card", /<details data-testid="stage-answer-full"[\s\S]{0,400}<AnswerView/.test(panel));
  // Step 2E, 2026-10-12: a part the card doesn't list is named, not left out silently.
  check("the card says which parts it doesn't list yet", /data-testid="next-step-not-listed"/.test(panel) && /"where and how to file"/.test(panel) && /"how to serve"/.test(panel));
  // Say it once (Step 2B, 2026-10-12; walkthrough: 7 of 10 cases printed the
  // card's paragraph again under the full answer).
  // The full answer drops the card's paragraph only when the card shows it
  // (walkthrough run 38500825561: the card may now leave it out).
  check(
    "the full answer under the card is told whether the card shows the first step",
    /<AnswerView[\s\S]{0,200}underCard=\{cardShowsLead\(result\.nextStep, userWords, city\)\}/.test(panel) &&
      /const firstParagraph = cardShowsLead\(summary, userWords, city\)/.test(panel),
  );
  check(
    "the card's paragraph is dropped from the full answer, the rest kept",
    withoutCardLead("What to do next", "File Form 9A.\n\nThen serve it.", "File Form 9A.") === "Then serve it." &&
      withoutCardLead("What to do next", "File Form 9A.", "File Form 9A.") === "" &&
      withoutCardLead("Your deadline", "File Form 9A.", "File Form 9A.") === "File Form 9A." &&
      withoutCardLead("What to do next", "Something else.\n\nMore.", "File Form 9A.") === "Something else.\n\nMore.",
  );

  // 2026-10-13, walkthrough: a family respondent's own brief (4 days before
  // the conference) was folded under "may apply later" while the
  // confirmation (3 days before) led.
  {
    const conference = {
      deadlines: [],
      periods: [
        { what: "Give a copy of the confirmation of conference (Form 17F) to every other party", count: 3, unit: "days", countFrom: "the date of the case conference, counting backwards" },
        { what: "If you served the case conference notice (Form 17), serve and file your case conference brief", count: 6, unit: "days", countFrom: "the date of the case conference, counting backwards" },
        { what: "If you are the other party, serve and file your case conference brief", count: 4, unit: "days", countFrom: "the date of the case conference, counting backwards" },
      ],
    };
    const respondent = cardLimits(conference, true);
    check("a respondent's own brief leads the card", respondent.main.periods.some((period) => /the other party/.test(period.what)));
    check("it comes first, because it is due first", /the other party/.test(respondent.main.periods[0]?.what ?? ""), respondent.main.periods.map((period) => period.count).join(","));
    check("the other side's brief stays folded", respondent.conditional.periods.length === 1 && /served the case conference notice/.test(respondent.conditional.periods[0].what));
    const applicant = cardLimits(conference, false);
    check("an applicant's card does not lead with the other party's brief", !applicant.main.periods.some((period) => /the other party/.test(period.what)));
    const motion = {
      deadlines: [],
      periods: [
        { what: "If you are bringing the motion, serve the motion", count: 7, unit: "days", countFrom: "the hearing, counting backwards" },
        { what: "If you are responding, serve your affidavit", count: 4, unit: "days", countFrom: "the hearing, counting backwards" },
      ],
    };
    check("a defendant's card never leads with 'If you are bringing the motion'", cardLimits(motion, true).main.periods.every((period) => !/bringing/.test(period.what)));
  }

  // 2026-10-13, walkthrough: a Toronto sidewalk fall led with the general two
  // years while its 10-day City notice sat folded beside Crown and libel ones.
  {
    const notices = {
      deadlines: [
        { what: "The general deadline to start a court case", date: "2028-09-30", statement: "" },
        { what: "If a municipality did not keep a highway (road) or bridge in repair and you claim damages, give written notice of the claim to the municipal clerk", date: "2026-10-10", statement: "" },
        { what: "If the City of Toronto did not keep a highway (road) or bridge in repair and you claim damages, give written notice of the claim to the city clerk", date: "2026-10-10", statement: "" },
      ],
      periods: [
        { what: "If you are claiming damages from the Ontario Crown, serve a notice of claim on the Crown", count: 60, unit: "days", countFrom: "the day you start the action, counting backwards" },
        { what: "If you are suing over a libel in an Ontario newspaper or broadcast, start the action", count: 3, unit: "months", countFrom: "the day the libel came to your knowledge" },
      ],
    };
    const story = "i slipped on ice on the sidewalk on queen street in toronto and broke my wrist. i want to sue the city";
    const toronto = cardLimits(notices as never, false, story, "Toronto");
    check("a Toronto sidewalk fall leads with the City of Toronto notice", toronto.main.deadlines.some((d) => /City of Toronto/.test(d.what)));
    check("and drops the Crown, libel and general-municipality notices", ![...toronto.main.deadlines, ...toronto.conditional.deadlines, ...toronto.main.periods, ...toronto.conditional.periods].some((d) => /Ontario Crown|libel|a municipality/.test(d.what)));
    check("the general two years stays", [...toronto.main.deadlines, ...toronto.conditional.deadlines].some((d) => /general deadline/.test(d.what)));
    // The words also carry saved answers as JSON; a field named "province" or
    // "city" is not something the person said (walkthrough run 38482600205).
    const withFields = cardLimits(notices as never, false, `${story} {"province":"Ontario","city":"Toronto"}`, "Toronto");
    check("saved field names do not count as the person's words", ![...withFields.main.periods, ...withFields.conditional.periods].some((d) => /Ontario Crown/.test(d.what)));
    const newspaper = cardLimits(notices as never, false, 'a newspaper printed lies about me {"city":"Ottawa"}', "Ottawa");
    check("a field named city does not make a libel story a road claim", ![...newspaper.main.deadlines].some((d) => /municipality|City of Toronto/.test(d.what)));
    const vague = cardLimits(notices as never, false, "something happened to me", "Ottawa");
    check("a story that fits no notice keeps every notice", vague.main.deadlines.length + vague.conditional.deadlines.length + vague.main.periods.length + vague.conditional.periods.length === 5);
  }

  // 2026-10-13 walkthrough fixes. Each asserts a property of every step, or
  // of the rule, never today's wording.
  {
    // S2: every time limit on every card carries the rule that sets it.
    let limits = 0;
    const unsourced: string[] = [];
    for (const stage of ALL_STAGES) {
      const courtPath = stage.id.startsWith("civil:") ? "civil" : stage.id.startsWith("family:") ? "family" : "small-claims";
      const body = await ask(stage.id, courtPath);
      for (const item of [...(body.nextStep?.deadlines ?? []), ...(body.nextStep?.periods ?? [])] as { what: string; rule?: { pinpoint?: string } }[]) {
        limits += 1;
        if (!item.rule?.pinpoint) unsourced.push(`${stage.id}: ${item.what.slice(0, 60)}`);
      }
    }
    check(`every time limit on every card carries its rule (${limits} limits)`, limits > 100 && unsourced.length === 0, unsourced.slice(0, 5).join("; "));
    check("the card shows each limit's rule beside it", /<LimitRule rule=\{deadline\.rule\} \/>/.test(panel) && /<LimitRule rule=\{period\.rule\} \/>/.test(panel));

    // C4: a bar that has passed is shown as passed, with the rule's own
    // "is not a bar" exceptions and urgent help; one not yet passed is not.
    const fell = await ask("civil:before-filing:notice-required-before-suing", "civil", { "sc-date-injury": "2026-09-30" });
    const summary = fell.nextStep as never as Parameters<typeof passedBars>[0];
    // 30 September + 10 days is Saturday 10 October; Monday 12 October 2026
    // is Thanksgiving; so the next open weekday is Tuesday 13 October, and the
    // statutory notice has passed only from Wednesday 14 October (s. 89 (2)).
    const passedNow = passedBars(summary, "2026-10-14");
    const toronto = passedNow.find((deadline) => /City of Toronto/.test(deadline.what));
    check("a passed Toronto notice is shown as a passed bar", Boolean(toronto), JSON.stringify(summary?.deadlines?.map((d) => [d.what.slice(0, 40), d.date])));
    check("with s. 42 (7) and (8), quoted", (toronto?.notABar ?? []).map((rule) => rule.pinpoint).join() === "s. 42 (7),s. 42 (8)");
    check("the day before it ends, nothing is shown as passed", passedBars(summary, "2026-10-01").length === 0);

    // Review 2026-10-13 (3): a statutory last day on a Saturday or holiday
    // runs to the next open weekday if the office was closed (Legislation Act
    // s. 89 (2)); "passed" only once that day is before today too.
    const torontoLimit = (summary.deadlines as { what: string; date: string; statutory?: boolean }[]).find((d) => /City of Toronto/.test(d.what));
    check("the Toronto notice is counted to Saturday 10 October 2026 and marked statutory", torontoLimit?.date === "2026-10-10" && torontoLimit?.statutory === true, JSON.stringify(torontoLimit));
    check("injury 30 September, Toronto 10-day notice: NOT passed on 13 October 2026", !passedBars(summary, "2026-10-13").some((d) => /City of Toronto/.test(d.what)));
    check("and passed on 14 October 2026", passedBars(summary, "2026-10-14").some((d) => /City of Toronto/.test(d.what)));
    const state13 = limitPassedState({ date: "2026-10-10", statutory: true }, "2026-10-13");
    check("on 13 October the card names the next open day, Tuesday 13 October 2026", !state13.passed && state13.runsTo === "2026-10-13");
    const line = closedDayLine("2026-10-10", "2026-10-13");
    check(
      "that line says the counted day and the next open day, quoting s. 89 (2)",
      /Saturday 10 October 2026/.test(line.say) && /Tuesday 13 October 2026/.test(line.say) && line.cite.pinpoint === "s. 89 (2)" && /next day the place is open/.test(line.cite.quote),
    );
    // Property, over the calendar: for any statutory counted day, "passed" is
    // exactly "the next weekday that is not a holiday is before today".
    let calendarMisses = 0;
    for (let offset = 0; offset < 400; offset += 1) {
      const counted = addDays("2026-01-01", offset);
      const open = nextWeekdayOpen(counted);
      const dow = dayOfWeek(open);
      if (dow === 0 || dow === 6 || holidayFor(open, "legislation-act") || open < counted) calendarMisses += 1;
      for (const today of [addDays(counted, 1), open, addDays(open, 1)]) {
        const state = limitPassedState({ date: counted, statutory: true }, today);
        if (state.passed !== open < today || (state.runsTo !== null) !== (counted < today && !(open < today))) calendarMisses += 1;
      }
      // A rules-regime date was extended by the engine already: passed the next day.
      if (!limitPassedState({ date: counted }, addDays(counted, 1)).passed || limitPassedState({ date: counted }, counted).passed) calendarMisses += 1;
    }
    check("over 400 counted days, a statutory limit is passed exactly when its next open weekday is before today", calendarMisses === 0, `misses ${calendarMisses}`);
    check("the card's deadline line uses the same test, not date < today", !/deadline\.date < today/.test(panel) && /limitPassedState\(deadline, today\)/.test(panel) && /data-testid="next-step-closed-day"/.test(panel));

    // Review 2026-10-13 (1): the passed box speaks only of limits the card
    // kept. A Toronto sidewalk fall drops the Municipal Act notice from the
    // card, so it gets no "passed" box either.
    const sidewalk = "i slipped on ice on the sidewalk on queen street in toronto on september 30 and broke my wrist. i want to sue the city";
    const onCard = cardLimits({ deadlines: summary.deadlines as never, periods: [] }, false, sidewalk, "Toronto");
    const boxes = passedBars({ deadlines: onCard.kept }, "2026-12-01");
    check("a Toronto fall: the City of Toronto notice gets its passed box", boxes.some((d) => /City of Toronto/.test(d.what)));
    check("a Toronto fall: no passed box for the dropped Municipal Act notice", !boxes.some((d) => /a municipality/.test(d.what)), boxes.map((d) => d.what.slice(0, 50)).join(" | "));
    check(
      "every passed box is for a limit the card shows (led or folded)",
      boxes.every((d) => onCard.main.deadlines.includes(d as never) || onCard.conditional.deadlines.includes(d as never)),
    );
    check("the card builds its passed boxes from the kept limits only", /passedBars\(\{ deadlines: kept \}, today\)/.test(panel) && !/passedBars\(summary/.test(panel));

    // Review 2026-10-13 (8): onSaved is told only after the save is queued,
    // so the case page's positionSavesSettled(caseId) has the save to wait for.
    const savesBeforeTold = [...panel.matchAll(/onSaved\?\.\(/g)].every((match) => {
      const before = panel.slice(Math.max(0, (match.index ?? 0) - 900), match.index ?? 0);
      return /savePosition\(caseId/.test(before);
    });
    check("every onSaved call comes after its save is queued", savesBeforeTold && [...panel.matchAll(/onSaved\?\.\(/g)].length >= 3);

    // Review 2026-10-13 (10): a reload of the step just chosen keeps the
    // facts already given ("Which city?" came back on the Toronto notice step).
    check("the Toronto notice question carries Toronto as its fact", factsForStep("before-filing:notice-toronto", "").municipality === "Toronto");
    check("a city the person typed is kept for any step", factsForStep("before-filing:notice-municipality", "Hamilton").municipality === "Hamilton");
    check("no fact is invented for another step", Object.keys(factsForStep("before-filing:notice-municipality", "")).length === 0);
    const effect = /useEffect\(\(\) => \{[\s\S]{0,900}\}, \[startingStep\]\);/.exec(panel)?.[0] ?? "";
    check(
      "the [startingStep] reload keeps the facts given (or does not reload the step on screen)",
      /startingStep === stageId && result\) return/.test(effect) && /factsForStep\(startingStep/.test(effect) && !/load\(startingStep\)/.test(effect),
    );
    check("every load of the step on screen passes its facts through factsForStep", !/municipality \? \{ municipality \} : \{\}/.test(panel));
    check("a limit that is not a bar is never shown as a passed bar", passedBars({ deadlines: [{ what: "x", date: "2020-01-01", statement: "", consequence: "changes-what-happens-next" }] }, "2026-10-13").length === 0);
    check(
      "the passed-bar box has the help pointer and says the judge decides",
      /data-testid="next-step-passed-bar"[\s\S]{0,3000}<GetHelp heading="Get help now/.test(panel) && /is for the judge to decide/.test(panel),
    );
    // Review 2026-10-13: the death exception (s. 42 (7), s. 44 (11), s. 6.1 (5))
    // needs no judge's finding, so the box speaks only of exceptions that do.
    check(
      "the judge sentence is limited to exceptions that depend on a judge's finding",
      /Where an exception depends on what a judge finds, that is for the judge to decide/.test(panel) && !/Whether a judge finds that, in your case/.test(panel),
    );
    check("the passed-bar box predicts nothing", !/data-testid="next-step-passed-bar"[\s\S]{0,3000}\b(likely|unlikely|chance|will (?:win|lose|succeed|fail))\b/i.test(panel));

    // C6 / C7: a limit tied to a claim the words do not name is folded, not lost.
    const respondent = {
      deadlines: [],
      periods: [
        { what: "Serve an answer on every other party and file it", count: 30, unit: "days", countFrom: "the day of being served", id: "deadline:family:answer" },
        { what: "If the application or your answer has a property claim, serve the other party with the property papers the rule lists", count: 30, unit: "days", countFrom: "x", id: "deadline:family:property" },
        { what: "Attend the mandatory information program", count: 45, unit: "days", countFrom: "the day the case was started", id: "deadline:family:mip-45-days:respondent" },
      ],
    };
    const parenting = cardLimits(respondent, true, "my ex took me to court for custody of our daughter");
    check("parenting-only: the property limit is folded", !parenting.main.periods.some((p) => /property/.test(p.what)) && parenting.conditional.periods.some((p) => /property/.test(p.what)));
    check("parenting-only: the information program still leads (r. 8.1 (1) para. 1)", parenting.main.periods.some((p) => /information program/.test(p.what)));
    const withProperty = cardLimits(respondent, true, "she wants the house and my pension");
    check("with a property claim, the property limit is not folded", withProperty.main.periods.some((p) => /property/.test(p.what)));
    const change = {
      deadlines: [],
      periods: [
        { what: "The other party's time to serve and file a response", count: 30, unit: "days", countFrom: "x", id: "deadline:family:motion-to-change-response:moving-party-view" },
        { what: "Attend the mandatory information program", count: 45, unit: "days", countFrom: "the day the case was started", id: "deadline:family:mip-45-days:motion-to-change" },
      ],
    };
    const supportOnly = cardLimits(change, false, 'i pay 900 a month child support and want it lowered {"issues":["child-support"]}');
    check("support-only motion to change: the information program is folded, with r. 8.1 (1) para. 6", !supportOnly.main.periods.some((p) => /information program/.test(p.what)) && supportOnly.mipNote?.cite.pinpoint === "r. 8.1 (1), para. 6");
    check("folding never loses a limit", supportOnly.main.periods.length + supportOnly.conditional.periods.length === change.periods.length);
    // A financial-statement limit is folded only when the words show no support or money at all.
    const statement = { deadlines: [], periods: [{ what: "Serve and file your financial statement", count: 30, unit: "days", countFrom: "x", id: "deadline:family:fs" }, { what: "Serve the motion", count: 30, unit: "days", countFrom: "x", id: "deadline:family:other" }] };
    check(
      "a financial-statement limit leads when the words mention paying ('lower what I pay for my kids'), and folds for parenting-only words",
      cardLimits(statement, false, "i want to lower what I pay for my kids and change the weekend schedule").main.periods.length === 2 && cardLimits(statement, false, "i want custody of my daughter").main.periods.length === 1,
    );
    const withParenting = cardLimits(change, false, "i want to change child support and parenting time");
    check("a change that touches parenting keeps the information program leading", withParenting.main.periods.some((p) => /information program/.test(p.what)) && !withParenting.mipNote);
  }

  // Walkthrough run 38500825561 (2026-10-13). Properties, not today's wording.
  {
    // SW 1: a statutory counted day on a closed day is never called THE last
    // day, passed or not; "passed" is exactly limitPassedState's; the words
    // are the passed box's conditional words with s. 89 (2).
    const closedWords = /If the place where this (?:had|has) to be done (?:was|is) closed/;
    check("the passed box's own words are conditional the same way", /if the place where this had to be done was closed/i.test(PASSED_CHECK_CLOSED.say));
    let lineMisses = 0;
    for (let offset = 0; offset < 400; offset += 1) {
      const counted = addDays("2026-01-01", offset);
      const closed = nextWeekdayOpen(counted) !== counted;
      for (const today of [addDays(counted, -1), counted, addDays(counted, 1), nextWeekdayOpen(counted), addDays(nextWeekdayOpen(counted), 1), addDays(counted, 30)]) {
        const limit = { date: counted, statutory: true, statement: `Based on the date you gave us, the last day for this is ${counted}.` };
        const line = deadlineLineFor(limit, today);
        if (line.passed !== limitPassedState(limit, today).passed) lineMisses += 1;
        if (closed && (line.statement !== null || !line.closedDay || !closedWords.test(line.closedDay.say) || line.closedDay.cite.pinpoint !== "s. 89 (2)")) lineMisses += 1;
        if (!closed && line.statement !== limit.statement) lineMisses += 1;
        // A rules-regime date keeps the engine's statement.
        if (deadlineLineFor({ date: counted, statement: "x" }, today).statement !== "x") lineMisses += 1;
      }
    }
    check("over 400 counted days, a closed-day statutory limit is never called the last day, and 'passed' is limitPassedState's", lineMisses === 0, `misses ${lineMisses}`);
    const sw14 = deadlineLineFor({ date: "2026-10-10", statutory: true, statement: "s" }, "2026-10-14");
    check("SW on 14 October: passed, naming Saturday 10 and Tuesday 13 October", sw14.passed && /Saturday 10 October 2026/.test(sw14.closedDay?.say ?? "") && /Tuesday 13 October 2026/.test(sw14.closedDay?.say ?? ""));
    const sw13 = deadlineLineFor({ date: "2026-10-10", statutory: true, statement: "s" }, "2026-10-13");
    check("SW on 13 October: not passed, and says to act today", !sw13.passed && /Act today/.test(sw13.closedDay?.say ?? ""));
    check("the card's deadline line takes its words from deadlineLineFor", /deadlineLineFor\(deadline, today\)/.test(panel) && !/\{deadline\.statement\}/.test(panel));
    // The day is Ontario's: 22:30 in Toronto on 13 October is 02:30 UTC on 14 October.
    check("today is Ontario's day, whatever the clock's zone", todayInOntario(new Date("2026-10-14T02:30:00Z")) === "2026-10-13" && todayInOntario(new Date("2026-10-14T12:00:00Z")) === "2026-10-14");
    check("the panel's today is Ontario's", /function todayIso\(\): string \{\s*return todayInOntario\(\);/.test(panel));

    // SW 2 and 3: with one notice kind kept, the title fits it and the card
    // leaves the every-notice paragraph to the full answer.
    const fell = await ask("civil:before-filing:notice-required-before-suing", "civil", { "sc-date-injury": "2026-09-30" });
    const sum = fell.nextStep as never as Parameters<typeof stepTitleFor>[0];
    const items = [...sum.deadlines, ...sum.periods];
    const kinds = new Set(items.map((item) => noticeKindOf(item.what)).filter(Boolean));
    check("the civil notice step covers several notice kinds", kinds.size >= 4, [...kinds].join(","));
    const toronto = "i slipped on ice on the sidewalk on queen street in toronto on september 30 and broke my wrist. i want to sue the city";
    const titled = stepTitleFor(sum, toronto, "Toronto") ?? "";
    check("a Toronto sidewalk fall: the title names the City of Toronto notice", /City of Toronto/.test(titled) && /notice/i.test(titled), titled);
    check("and no other notice kind", !/newspaper|libel|Crown|government|property owner|occupier/i.test(titled), titled);
    check("a story that fits no notice keeps the step's own question", stepTitleFor(sum, "something happened to me", "Ottawa") === null);
    // Property over every kind: a title appears only when exactly one kind is kept.
    const stories: Record<string, string> = {
      toronto,
      municipality: "i fell in a pothole on a road in hamilton",
      occupier: "i slipped on ice in the parking lot of a store",
      crown: "an ontario provincial police cruiser hit me",
      libel: "a newspaper printed lies about me",
    };
    let titleMisses = 0;
    for (const [kind, story] of Object.entries(stories)) {
      const title = stepTitleFor(sum, story, kind === "toronto" ? "Toronto" : "Hamilton");
      if (title === null) titleMisses += 1;
      for (const [other, otherWords] of Object.entries({ toronto: /Toronto/, municipality: /municipality/, occupier: /occupier/, crown: /Crown/, libel: /libel/ })) {
        if (title && other !== kind && otherWords.test(title)) titleMisses += 1;
      }
    }
    check("each notice kind, kept alone, gets a title naming only it", titleMisses === 0, `misses ${titleMisses}`);
    check("a Toronto fall: the card leaves out the every-notice paragraph", !cardShowsLead(sum, toronto, "Toronto"));
    check("a story that fits no notice: the card keeps it", cardShowsLead(sum, "something happened to me", "Ottawa"));
    check("a step with no notices always keeps it", cardShowsLead({ deadlines: [], periods: [{ what: "Serve the defence", count: 20, unit: "days", countFrom: "x" }] } as never, toronto, "Toronto"));
    check("the panel shows the fitted title on 'Your step'", /stepTitleFor\(result\.nextStep, userWords, city\)/.test(panel));

    // FR 5: a limit the rule ties to a kind of claim the words show no sign of
    // is folded under its own heading, never removed; one naming a kind they
    // show leads as before.
    const served = await ask("family:respondent:served-time-to-answer-running", "family");
    const fr = served.nextStep as never as Parameters<typeof cardLimits>[0];
    const frStory = "my ex gf took me to court for custody of our daugter, i got served the papers last week. she wants sole custody and wants to move to ottawa with her. i want joint custody and to keep my time with her.";
    const frCard = cardLimits(fr, true, frStory);
    const all = [...fr.deadlines, ...fr.periods];
    check("FR: the respondent step has a property-claim limit", all.some((item) => /property claim/.test(item.what)), all.map((i) => i.what.slice(0, 40)).join(" | "));
    check("FR: it is folded under 'a kind of claim you have not mentioned'", [...frCard.notClaimed.periods, ...frCard.notClaimed.deadlines].some((item) => /property claim/.test(item.what)));
    check("FR: it does not lead", ![...frCard.main.periods, ...frCard.main.deadlines].some((item) => /property claim/.test(item.what)));
    check("FR: the answer still leads", [...frCard.main.periods, ...frCard.main.deadlines].some((item) => /^Serve an answer/.test(item.what)));
    check("FR: nothing is lost", frCard.main.periods.length + frCard.conditional.periods.length === fr.periods.length);
    check("the card shows the not-claimed fold with its reason", /data-testid="next-step-not-claimed"/.test(panel) && /What you told us does not mention one/.test(panel));
    // Over every family limit: an "If" line naming kinds fits a story naming one of them.
    const kindWords: Record<string, string> = { parenting: "parenting time with my son", support: "child support", property: "the house and my pension property", home: "the matrimonial home", divorce: "a divorce" };
    let fitMisses = 0;
    for (const stage of ALL_STAGES.filter((item) => item.id.startsWith("family:"))) {
      for (const deadline of stage.deadlines) {
        if (!/^(?:if|where|when)\b/i.test(deadline.what)) continue;
        const named = Object.entries(kindWords).filter(([kind]) =>
          kind === "parenting" ? /\bparenting\b/i.test(deadline.what) : kind === "support" ? /\bsupport\b/i.test(deadline.what) : kind === "property" ? /\bproperty\b/i.test(deadline.what) : kind === "home" ? /matrimonial home/i.test(deadline.what) : /\bdivorce\b/i.test(deadline.what),
        );
        for (const [, words] of named) if (claimFit(deadline, words) !== "fits") fitMisses += 1;
      }
    }
    check("every family 'If' limit fits a story that names a kind of claim it names", fitMisses === 0, `misses ${fitMisses}`);
    // The kind-of-claim reading is for "If" lines only; with no condition, a
    // limit folds only for the named financial-statement and property-papers
    // rules C7 already covers.
    check(
      "a limit with no 'If' (and none of C7's named papers) always fits, whatever the words",
      ALL_STAGES.flatMap((stage) => stage.deadlines)
        .filter((d) => !/^(?:if|where|when|unless)\b/i.test(d.what) && !/mip-45-days/.test(d.id) && !/property (?:claim|papers)|support claim|financial statement/i.test(d.what))
        .every((d) => claimFit(d, frStory) === "fits"),
    );

    // FR 6: every deadline sentence saying when service counts, wherever it
    // appears, comes with the subrule it restates, from the deadline's own rules.
    const frWhen = servedWhenOf(fr as never);
    check("FR: the 4 p.m. sentence comes with r. 6 (11.1), quoted", frWhen.some((line) => /after 4 p\.m\./.test(line.say) && line.cite.pinpoint === "r. 6 (11.1)" && /after 4 p\.m\./.test(line.cite.quote)));
    let unsourced4pm = 0;
    let foreign = 0;
    const { servedWhenLines } = await import("../../src/lib/content-library/nextStepPractical");
    for (const stage of ALL_STAGES) {
      for (const deadline of stage.deadlines) {
        const sentences = (deadline.qualifier ?? "").split(/(?<=\.)\s+/).filter((sentence) => /after 4 p\.m\./.test(sentence));
        const lines = servedWhenLines(deadline.qualifier ?? "", [deadline.rule, ...deadline.exceptions]);
        for (const sentence of sentences) if (!lines.some((line) => sentence.includes(line.say) || line.say.includes(sentence.trim()))) unsourced4pm += 1;
        for (const line of lines) if (![deadline.rule, ...deadline.exceptions].includes(line.cite)) foreign += 1;
      }
    }
    check("every 'after 4 p.m.' sentence in any deadline has its rule beside it", unsourced4pm === 0, `unsourced ${unsourced4pm}`);
    check("each such rule is one the deadline itself carries", foreign === 0);
    check("the full answer shows them under 'Your deadline'", /data-testid="stage-answer-served-when"/.test(panel) && /servedWhen=\{servedWhenOf\(result\.nextStep\)\}/.test(panel));

    // MC 7: with an order already in place, the support-table card follows the
    // step's guidance, folded, and is not shown above it.
    const page = readFileSync(path.resolve(__dirname, "../../app/builder/page.tsx"), "utf8");
    const panelAt = page.indexOf("<StageAnswerPanel");
    const foldedAt = page.indexOf('data-testid="child-support-table-folded"');
    check("the folded support-table card comes after the step panel", panelAt > 0 && foldedAt > panelAt);
    check("it is shown there only for an existing order", /existingFamilyOrder\(homeStory \|\| userStory\(caseData\)\)[\s\S]{0,400}data-testid="child-support-table-folded"/.test(page));
    check("above the step, the card is not shown for an existing order", /!existingFamilyOrder\(homeStory \|\| userStory\(caseData\)\) \? <ChildSupportTableCard \/> : null/.test(page) && (page.match(/<ChildSupportTableCard \/>/g) ?? []).length === 2);
  }

  // Walkthrough run 38500825561, second round (RN, JU, SW "What can happen next").
  {
    // RN: a way of serving the story already gives is shown as a fact with
    // its quote and a Change button, not as an open question.
    const stories = [
      "i got the plaintiffs claim in the mail on september 28. it is about a reno job.",
      "The process server handed me the papers at my door on Monday.",
      "they sent it by email last week",
      "My landlord says I owe him rent.",
    ];
    let quoteMisses = 0;
    for (const court of ["small-claims", "civil", "family"] as const) {
      for (const story of stories) {
        const method = serviceMethodFromStory(court, story);
        const shown = serviceMethodShown(court, story);
        if ((method === null) !== (shown === null)) quoteMisses += 1;
        if (shown && (!shown.quote || !story.includes(shown.quote) || serviceMethodFromStory(court, shown.quote) !== shown.method)) quoteMisses += 1;
      }
    }
    check("a known way of serving comes with the sentence of the story that says it", quoteMisses === 0, `misses ${quoteMisses}`);
    const rn = serviceMethodShown("small-claims", stories[0]);
    check("RN: 'in the mail' is shown as regular mail, quoted", rn?.method === "mail" && /in the mail/.test(rn.quote));
    const knownAt = panel.indexOf("stage-answer-service-method-known-");
    const selectAt = panel.indexOf("stage-answer-service-method-${question.id}");
    check(
      "the select is drawn only when no way is known, or on Change",
      knownAt > 0 && selectAt > knownAt && /!changingMethod\[question\.id\] && \(serviceMethod\[question\.id\] \?\? storyServiceMethod\) \?/.test(panel) && /From what you told us: &ldquo;\{storyMethodShown\.quote\}&rdquo;/.test(panel) && /stage-answer-service-method-change-/.test(panel),
    );
    check("the date input still asks for the date the rule counts from", /\? `Enter \$\{serviceRulesFor\(serviceCourt\)/.test(panel));

    // JU: an unpaid judgment's card asks for the order date and counts the six years.
    let unpaidMisses = 0;
    for (const stageId of ["plaintiff:judgment-in-my-favour-unpaid", "plaintiff:default-judgment-signed"]) {
      const stage = ALL_STAGES.find((item) => item.id === stageId);
      const leave = stage?.deadlines.find((deadline) => deadline.rule.pinpoint === "r. 20.08 (2.1)");
      if (!leave || leave.countFromEvent !== "order-made" || leave.length.unit !== "years" || leave.length.count !== 6) unpaidMisses += 1;
      if (!leave?.exceptions.some((rule) => rule.pinpoint === "r. 20.06 (1.1)") || !leave?.exceptions.some((rule) => rule.pinpoint === "r. 20.07 (1.1)")) unpaidMisses += 1;
      const asked = await ask(stageId, "small-claims");
      if (!(asked.nextStep?.periods ?? []).some((period) => period.count === 6 && /order was made/.test(period.countFrom))) unpaidMisses += 1;
      const counted = await ask(stageId, "small-claims", { "case-date-order-made": "2026-05-12" });
      if (!(counted.nextStep?.deadlines ?? []).some((deadline) => /12 May 2032/.test(deadline.statement))) unpaidMisses += 1;
    }
    check("both unpaid-judgment steps carry the six-year leave limit, ask the order date, and count it", unpaidMisses === 0, `misses ${unpaidMisses}`);
    // Every quote in the stage map is read back from the corpus by test:stage-map.

    // SW: "What can happen next" keeps only the notice rules the words fit;
    // a move made only of other notices folds under "Other things"; none lost.
    const toronto = "i slipped on ice on the sidewalk on queen street in toronto on september 30 and broke my wrist. i want to sue the city";
    const all = nextStepsFor("civil:before-filing:notice-required-before-suing", false).moves;
    const narrowed = movesForWords("civil:before-filing:notice-required-before-suing", false, toronto, "Toronto");
    check("a Toronto fall: no leading move quotes the Crown's notice", narrowed.lead.every((move) => move.rules.every((rule) => rule.sourceId !== "crown-liability-and-proceedings-act-2019")) && narrowed.lead.length > 0);
    check("and nothing is lost", narrowed.lead.length + narrowed.others.length === all.length);
    check("the start of the claim still leads, with r. 14.03 (1)", narrowed.lead.some((move) => move.rules.some((rule) => rule.pinpoint === "r. 14.03 (1)")));
    const plain = movesForWords("civil:before-filing:notice-required-before-suing", false, "something happened to me", "Ottawa");
    check("words that fit no notice change nothing", plain.lead.length + plain.others.length === all.length && plain.lead.flatMap((move) => move.rules).length + plain.others.flatMap((move) => move.rules).length === all.flatMap((move) => move.rules).length);
    check("the card passes the person's words to it", /<WhatComesNext stepId=\{stepId\} responding=\{responding\} story=\{userWords\} city=\{city\} \/>/.test(panel));
  }

  if (failures > 0) {
    console.log(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll next-step card checks passed.");
}

void main();
