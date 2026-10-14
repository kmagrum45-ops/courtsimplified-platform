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
 *   - (review 2026-10-13) a six-year threshold moved past a weekend; a
 *     sentence about sending something else read as how the papers came;
 *     a step's own claim, or a kind named in passing, folded as "not
 *     mentioned"; checks pinned to source text instead of behaviour.
 *   - (walkthrough 2026-10-14) the Timeline, Deadlines view or Case file
 *     saying something different from the card about a counted date: no
 *     passed warning, or "the last day" for a closed counted day.
 *   - (final re-check 2026-10-14) a limit the other party must meet after
 *     being served, read to the person responding on an either-side step as
 *     "The other party's time" instead of their own ("Your time ... (Form
 *     15B) ... (Form 15C)").
 *
 *   - (walkthrough run 38525903567, FM) the information program leading a
 *     motion to change whose words show no change beyond child or spousal
 *     support (r. 8.1 (1) para. 6), or lost instead of folded under its
 *     condition; the site's own record labels ("Children and parenting
 *     details:") read as the person naming a claim.
 *
 * COSTS NOTHING: the stage-answer route and source reads, no model.
 *
 * Run: npm run test:next-step
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { POST } from "../../app/api/case/stage-answer/route";
import {
  cardLimits,
  cardShowsLead,
  factsForStep,
  passedBars,
  servedWhenOf,
  serviceMethodDisplay,
  serviceMethodShown,
  stepTitleFor,
  todayIso,
  withoutCardLead,
} from "../../app/builder/_components/StageAnswerPanel";
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
import { FAMILY_NARRATIVE_LABELS, userWordsOf } from "../../src/lib/content-library/forms/formsInText";
import {
  MIP_CHANGE_SUBJECT_UNKNOWN,
  MIP_SUPPORT_ONLY_CHANGE,
  changeBeyondSupport,
  changeMipNoteFor,
  familyClaimsIn,
  isChangeMip,
} from "../../src/lib/content-library/nextStepPractical";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`ok    ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/**
 * Whether `source` calls `fn` with arguments naming each of `args`, in any
 * order or layout: wiring, not wording (review 2026-10-13: checks pinned the
 * exact source text and failed on a harmless reformat).
 */
function calls(source: string, fn: string, args: string[]): boolean {
  const pattern = new RegExp(`\\b${fn}\\(([^()]*(?:\\([^()]*\\)[^()]*)*)\\)`, "g");
  return [...source.matchAll(pattern)].some((match) => args.every((arg) => new RegExp(`\\b${arg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(match[1])));
}
/** Whether a JSX element `tag` is given each of `props` (name=value as written), in any order. */
function gives(source: string, tag: string, props: Record<string, string>): boolean {
  return [...source.matchAll(new RegExp(`<${tag}\\b([\\s\\S]*?)\\/?>`, "g"))].some((match) =>
    Object.entries(props).every(([name, value]) => new RegExp(`\\b${name}=\\{\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}`).test(match[1])),
  );
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
    gives(panel, "AnswerView", { underCard: "cardShowsLead(result.nextStep, userWords, city)" }) && calls(panel, "cardShowsLead", ["summary", "userWords", "city"]),
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
    check("the card's deadline line takes its words from deadlineLineFor", calls(panel, "deadlineLineFor", ["deadline", "today"]) && !/\{deadline\.statement\}/.test(panel));
    // The day is Ontario's: 22:30 in Toronto on 13 October is 02:30 UTC on 14 October.
    check("today is Ontario's day, whatever the clock's zone", todayInOntario(new Date("2026-10-14T02:30:00Z")) === "2026-10-13" && todayInOntario(new Date("2026-10-14T12:00:00Z")) === "2026-10-14");
    check("the panel's today is Ontario's", todayIso(new Date("2026-10-14T02:30:00Z")) === "2026-10-13" && todayIso(new Date("2026-10-14T05:00:00Z")) === "2026-10-14");

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
    // Review 2026-10-13 (6): Libel and Slander Act s. 5 (1) sends the notice to the defendant.
    const libelTitle = stepTitleFor(sum, stories.libel, "Hamilton") ?? "";
    check("the libel title sends the notice to the person to be sued, not to 'the newspaper or broadcaster'", /person you will sue/.test(libelTitle) && !/notice to the newspaper|newspaper or broadcaster written notice/.test(libelTitle), libelTitle);
    check("a Toronto fall: the card leaves out the every-notice paragraph", !cardShowsLead(sum, toronto, "Toronto"));
    check("a story that fits no notice: the card keeps it", cardShowsLead(sum, "something happened to me", "Ottawa"));
    check("a step with no notices always keeps it", cardShowsLead({ deadlines: [], periods: [{ what: "Serve the defence", count: 20, unit: "days", countFrom: "x" }] } as never, toronto, "Toronto"));
    check("the panel shows the fitted title on 'Your step'", calls(panel, "stepTitleFor", ["result.nextStep", "userWords", "city"]));

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
    // Review 2026-10-13 (4): never "a claim you have not mentioned" on a step
    // whose own subject is that claim, nor for a kind named in passing.
    const property = await ask("family:before-filing:property-claim-time-limit", "family");
    const widow = cardLimits(property.nextStep as never, false, "my husband died in june and his will leaves everything to his kids", "", "family:before-filing:property-claim-time-limit");
    check(
      "the property-claim step: the surviving-spouse election is not folded as unmentioned",
      ![...widow.notClaimed.deadlines, ...widow.notClaimed.periods].some((d) => /spouse has died/.test(d.what)) &&
        [...(property.nextStep?.periods ?? []), ...(property.nextStep?.deadlines ?? [])].some((d) => /spouse has died/.test(d.what)),
    );
    const garnish = ALL_STAGES.flatMap((stage) => stage.deadlines).find((d) => d.id === "deadline:family:garnishment-dispute-10-days");
    check("a garnishment dispute naming 'indexed support' in passing is not a support-claim line", Boolean(garnish) && claimFit(garnish!, frStory) === "fits");
    check(
      "only lines whose condition is a claim are folded by kind",
      ALL_STAGES.flatMap((stage) => stage.deadlines)
        .filter((d) => /^(?:if|where|when)\b/i.test(d.what) && !/\b(?:claims?|asks? to change|financial statement)\b/i.test(d.what))
        .every((d) => claimFit(d, frStory) === "fits"),
    );
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
    check("the full answer shows them under 'Your deadline'", /data-testid="stage-answer-served-when"/.test(panel) && gives(panel, "AnswerView", { servedWhen: "servedWhenOf(result.nextStep)" }));

    // MC 7: with an order already in place, the support-table card follows the
    // step's guidance, folded, and is not shown above it.
    const page = readFileSync(path.resolve(__dirname, "../../app/builder/page.tsx"), "utf8");
    const panelAt = page.indexOf("<StageAnswerPanel");
    const foldedAt = page.indexOf('data-testid="child-support-table-folded"');
    check("the folded support-table card comes after the step panel", panelAt > 0 && foldedAt > panelAt);
    // One condition decides both places, so the card is never hidden above
    // before it shows below (review 2026-10-13): it includes the existing
    // order and the step panel being on screen (a confirmed step).
    const gate = /const (\w+) =([\s\S]{0,500}?);\n/.exec(page.slice(page.indexOf("existingFamilyOrder(homeStory || userStory(caseData)) &&") - 200))?.[0] ?? "";
    const gateName = /const (\w+) =/.exec(gate)?.[1] ?? "";
    check("one condition decides where the table card goes: an existing order and the step panel on screen", Boolean(gateName) && /existingFamilyOrder/.test(gate) && /confirmedStage/.test(gate) && /analysis/.test(gate));
    check(
      "above, the card shows unless that condition holds; below, only when it does",
      new RegExp(`!${gateName} \\? <ChildSupportTableCard`).test(page) && new RegExp(`\\{${gateName} &&[\\s\\S]{0,400}child-support-table-folded`).test(page),
    );
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
        if (shown && method === null) quoteMisses += 1;
        if (!shown && /claim|papers/.test(story) && method !== null) quoteMisses += 1;
        if (shown && (!shown.quote || !story.includes(shown.quote) || serviceMethodFromStory(court, shown.quote) !== shown.method)) quoteMisses += 1;
      }
    }
    check("a known way of serving comes with the sentence of the story that says it", quoteMisses === 0, `misses ${quoteMisses}`);
    const rn = serviceMethodShown("small-claims", stories[0]);
    check("RN: 'in the mail' is shown as regular mail, quoted", rn?.method === "mail" && /in the mail/.test(rn.quote));
    check(
      "the open choice only when nothing is known, or on Change; a story's way is a suggestion",
      serviceMethodDisplay(undefined, null, false) === "choose" &&
        serviceMethodDisplay(undefined, "mail", false) === "suggested" &&
        serviceMethodDisplay("personal", "mail", false) === "chosen" &&
        serviceMethodDisplay("personal", "mail", true) === "choose" &&
        serviceMethodDisplay(undefined, "mail", true) === "choose",
    );
    check("the panel draws it through serviceMethodDisplay, with a Change button", calls(panel, "serviceMethodDisplay", ["serviceMethod", "storyMethodFor"]) && /stage-answer-service-method-change-/.test(panel));
    // Review 2026-10-13: a way of sending something else is not how the papers came.
    const notService = ["I emailed him the invoice three times.", "we met in person to sign the lease", "i mailed my defence to the court"];
    check(
      "'emailed the invoice', 'met in person', 'mailed my defence' are not read as how the papers were served",
      (["small-claims", "civil", "family"] as const).every((court) => notService.every((story) => serviceMethodShown(court, story) === null)),
    );
    check("the panel's story method comes only from a sentence about the papers", calls(panel, "serviceMethodShown", ["courtPath", "storyText"]));

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
    // Review 2026-10-13 (1): "more than six years have passed" is a threshold,
    // not a period for a step, so its anniversary is never moved past a
    // weekend or holiday. Over many order dates, the counted day is the
    // anniversary itself.
    const saturday = await ask("plaintiff:judgment-in-my-favour-unpaid", "small-claims", { "case-date-order-made": "2020-10-17" });
    check("an order of 17 October 2020: six years is Saturday 17 October 2026, not the Monday", (saturday.nextStep?.deadlines ?? []).some((d) => /Saturday 17 October 2026/.test(d.statement)), JSON.stringify(saturday.nextStep?.deadlines?.map((d) => d.statement)));
    const { computeDeadline } = await import("../../src/lib/case-system/deadlines/deadlineEngine");
    let moved = 0;
    for (let offset = 0; offset < 400; offset += 1) {
      const from = addDays("2020-01-01", offset);
      const result = computeDeadline({ from, length: { unit: "years", count: 6 }, regime: "small-claims-rules", extend: false });
      const want = from.endsWith("-02-29") ? `${Number(from.slice(0, 4)) + 6}-02-28` : `${Number(from.slice(0, 4)) + 6}${from.slice(4)}`;
      if (result.deadline !== want) moved += 1;
    }
    check("a threshold in years always lands on the anniversary (February 29 to 28), never moved", moved === 0, `moved ${moved}`);
    check("every threshold limit is counted that way", ALL_STAGES.flatMap((stage) => stage.deadlines).filter((d) => d.threshold).every((d) => d.computation.pinpoint === "s. 89 (7)"));
    // Review 2026-10-13 (2): the headline does not say six years is the only
    // time leave is needed; r. 20.08 (2.1)'s condition is beside it.
    const leaveLimits = ALL_STAGES.flatMap((stage) => stage.deadlines).filter((d) => d.rule.pinpoint === "r. 20.08 (2.1)");
    check("the six-year line names the condition that needs leave sooner", leaveLimits.length === 2 && leaveLimits.every((d) => /subject to a condition/.test(`${d.what} ${d.qualifier ?? ""}`) && !/^Have /.test(d.what)));
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
    check("the card passes the person's words to it", gives(panel, "WhatComesNext", { story: "userWords", city: "city" }));
  }

  {
    // Walkthrough 2026-10-14, SW: the card said the Toronto notice's counted
    // Saturday ran to Tuesday and "That day has passed too"; the Timeline and
    // the Case file said "2026-10-10" and "the last day for this is Saturday"
    // with no warning. Property: for any counted day and any today, the
    // timeline item says what the card says, and is passed exactly when the
    // card's test says so.
    // Final re-check 2026-10-14: a respondent to a motion to change saw "The
    // other party's time to serve and file a response" for their own
    // deadline. Property: on every either-side step, a limit the OTHER party
    // must meet after being served has a responding wording, and the card
    // shows it to the person responding; the mover's view is unchanged.
    {
      const { RESPONDING_VIEW } = await import("../../src/lib/content-library/nextStepPractical");
      const { sideSummary } = await import("../../app/builder/_components/StageAnswerPanel");
      const missing = ALL_STAGES.filter((stage) => /:both:/.test(stage.id))
        .flatMap((stage) => stage.deadlines)
        .filter((deadline) => deadline.actor === "other-party" && /^served-with/.test(deadline.countFromEvent) && !RESPONDING_VIEW[deadline.id])
        .map((deadline) => deadline.id);
      check("every other-party limit counted from being served, on an either-side step, has the responding wording", missing.length === 0, missing.join(", "));
      const asked = await ask("family:both:asking-to-change-final-order", "family");
      const all = [...(asked.nextStep?.deadlines ?? []), ...(asked.nextStep?.periods ?? [])] as { id?: string; what: string }[];
      const responder = sideSummary({ deadlines: asked.nextStep?.deadlines ?? [], periods: asked.nextStep?.periods ?? [] } as never, true) as { deadlines: { what: string }[]; periods: { what: string }[] };
      const mover = sideSummary({ deadlines: asked.nextStep?.deadlines ?? [], periods: asked.nextStep?.periods ?? [] } as never, false) as { deadlines: { what: string }[]; periods: { what: string }[] };
      const responderWhats = [...responder.deadlines, ...responder.periods].map((item) => item.what);
      check(
        "the respondent reads 'Your time to serve and file a response (Form 15B) or return a signed consent (Form 15C)', never 'The other party's time'",
        all.some((item) => item.id === "deadline:family:motion-to-change-response:moving-party-view") &&
          responderWhats.includes("Your time to serve and file a response (Form 15B) or return a signed consent (Form 15C)") &&
          !responderWhats.some((what) => /^The other party's time to serve and file a response/.test(what)),
        responderWhats.join(" | "),
      );
      check("the mover's view is unchanged", JSON.stringify([...mover.deadlines, ...mover.periods].map((item) => item.what)) === JSON.stringify(all.map((item) => item.what)));
      check("the card reads its limits through sideSummary", /const summary = sideSummary\(summaryAsGiven, responding\)/.test(panel));
      // Reviewer 2026-10-14: the responding wording carries its note in their words and r. 15 (9).
      const sideItem = [...(responder.deadlines as { what: string; sideNote?: { say: string }; alsoRules?: { pinpoint: string }[] }[]), ...(responder.periods as { what: string; sideNote?: { say: string }; alsoRules?: { pinpoint: string }[] }[])].find((item) => /^Your time to serve and file a response/.test(item.what));
      check("the respondent's limit carries 'if you do not live' and r. 15 (9)", Boolean(sideItem?.sideNote && /if you do not live/.test(sideItem.sideNote.say) && sideItem.alsoRules?.some((rule) => rule.pinpoint.startsWith("r. 15 (9)"))));
      check("the card draws them beside both deadline and period items", (panel.match(/<SideRules item=\{(?:deadline|period)\} \/>/g) ?? []).length === 2);
      const rules = readFileSync(path.resolve(__dirname, "../../docs/sources/corpus/family-law-rules.txt"), "utf8").replace(/\s+/g, " ");
      check("r. 15 (6) names the blank response (Form 15B) and consent (Form 15C)", rules.includes("The party making the motion shall serve on the other party a blank response to motion to change (Form 15B) and a blank consent motion to change (Form 15C)"));
    }
    const { buildTimeline } = await import("../../src/lib/case-workspace/timeline");
    const { timelineStandingFor, PASSED_BAR_WARNING } = await import("../../src/lib/content-library/nextStepPractical");
    const { sourceName } = await import("../../src/lib/case-system/stage-map/citations");
    let wordMisses = 0;
    let passMisses = 0;
    let warnMisses = 0;
    let lastDayMisses = 0;
    for (let offset = 0; offset < 400; offset += 1) {
      const counted = addDays("2026-01-01", offset);
      for (const later of [0, 1, 2, 3, 4, 6]) {
        const today = addDays(counted, later);
        for (const regime of ["legislation-act", "civil-rules"]) {
          const statement = `Based on the date you gave us, the last day for this is ${counted}.`;
          const limit = { regime, consequence: "bars-the-claim" };
          const timeline = buildTimeline({
            documents: [],
            events: [],
            deadlines: [{ deadlineId: "d", date: counted, statement, working: [], uncertainty: null, caution: "c", closureWarning: null }],
            deadlineRules: { d: { rule: null, url: null, what: "w", standing: timelineStandingFor(limit, { date: counted, statement }, today, sourceName) } },
          });
          const item = timeline.items[0];
          const card = deadlineLineFor({ date: counted, statutory: regime === "legislation-act", statement }, today);
          const cardWords = card.closedDay?.say ?? card.statement ?? statement;
          const shown = item.standing?.statement ?? item.notes.find((note) => note === cardWords || note === statement);
          if (shown !== cardWords) wordMisses += 1;
          if (Boolean(item.standing?.passed) !== limitPassedState({ date: counted, statutory: regime === "legislation-act" }, today).passed) passMisses += 1;
          if (card.passed && !item.standing?.lines.includes(PASSED_BAR_WARNING)) warnMisses += 1;
          if (card.closedDay && item.notes.includes(statement)) lastDayMisses += 1;
        }
      }
    }
    check("over 400 counted days, the Timeline's words for a date are the card's", wordMisses === 0, `misses ${wordMisses}`);
    check("and it is passed exactly when the card's test says so", passMisses === 0, `misses ${passMisses}`);
    check("a passed bar carries the card's warning on the Timeline", warnMisses === 0, `misses ${warnMisses}`);
    check("a closed counted day is never called THE last day on the Timeline", lastDayMisses === 0, `misses ${lastDayMisses}`);
    const route = readFileSync(path.resolve(__dirname, "../../app/api/workspace/organisation/route.ts"), "utf8");
    const workspace = readFileSync(path.resolve(__dirname, "../../app/cases/_components/CaseWorkspace.tsx"), "utf8");
    const caseFile = readFileSync(path.resolve(__dirname, "../../app/cases/[id]/case-file/page.tsx"), "utf8");
    check("the route works out the standing with Ontario's today", /todayInOntario\(\)/.test(route) && calls(route, "timelineStandingFor", ["today"]));
    check("the Timeline, the Deadlines view and the Case file all show it", (workspace.match(/<DeadlineStandingNote standing=\{item\.standing\}/g) ?? []).length >= 2 && /<DeadlineStandingNote standing=\{item\.standing\}/.test(caseFile));
  }

  // Walkthrough run 38525903567, FM: the information program led a
  // support-only motion to change. r. 8.1 (1) para. 6 covers "A motion to
  // change a final order or agreement under rule 15, except motions that deal
  // only with changing child or spousal support". The cause was the site's
  // own label "Children and parenting details:" read as a parenting claim.
  {
    const flr = readFileSync(path.resolve(__dirname, "../../docs/sources/corpus/family-law-rules.txt"), "utf8").replace(/\s+/g, " ");
    check(
      "r. 8.1 (1) para. 6's exception is in the saved rules, word for word",
      flr.includes("6. A motion to change a final order or agreement under rule 15, except motions that deal only with changing child or spousal support."),
    );
    // Every label the family intake writes before a line of its record is the site's, and is not read as the person's words.
    const intake = readFileSync(path.resolve(__dirname, "../../app/builder/_components/FamilyIntake.tsx"), "utf8");
    const start = intake.indexOf("function buildNarrative");
    const narrative = intake.slice(start, intake.indexOf("Uploaded evidence metadata", start) + 40);
    const written = [...narrative.matchAll(/[`"]([A-Z][A-Za-z ,/()-]+): (?:\$\{|")/g)].map((match) => match[1]);
    const unlisted = written.filter((label) => !(FAMILY_NARRATIVE_LABELS as readonly string[]).includes(label));
    check("the family record's labels are all known to userWordsOf", written.length >= 15 && unlisted.length === 0, `found ${written.length}; unlisted: ${unlisted.join(", ")}`);
    // Property: a label alone never makes the words name a claim.
    const labelsOnly = FAMILY_NARRATIVE_LABELS.map((label) => `${label}: x`).join("\n");
    const fromLabels = familyClaimsIn(userWordsOf({ facts: labelsOnly }));
    check("the site's labels alone name no kind of claim", !fromLabels.known, JSON.stringify(fromLabels));
    const story = "i pay 900 a month child support from a court order in 2022. i lost my job in july and now im on EI making way less. i cant keep paying 900. how do i get it lowered";
    const fm = {
      facts: `Court path: Family\nStage: Motion stage\nExisting family documents: Existing court order or agreement\nFamily issue signals selected by user: Child support\nChildren and parenting details: two kids, 9 and 11, they live with their mom\nCase story: ${story}`,
      goal: "To get the child support lowered",
      extra: { story, issues: ["child-support"], issueLabels: ["Child support"], childrenInfo: "two kids, 9 and 11, they live with their mom", filedDocumentLabels: ["Existing court order or agreement"] },
    };
    const fmWords = userWordsOf(fm);
    check("FM: the saved case reads as support only", familyClaimsIn(fmWords).support && !familyClaimsIn(fmWords).parenting);
    const change = await ask("family:both:asking-to-change-final-order", "family");
    const fmCard = cardLimits(change.nextStep as never, false, fmWords, "Sudbury", "family:both:asking-to-change-final-order");
    const all = [...fmCard.main.deadlines, ...fmCard.main.periods] as { id?: string }[];
    check("FM: the information program does not lead", !all.some((item) => isChangeMip(item)));
    check(
      "FM: it is folded under its own condition, with para. 6 and the support-only note",
      fmCard.changeMip.periods.length + fmCard.changeMip.deadlines.length === 1 && fmCard.mipNote === MIP_SUPPORT_ONLY_CHANGE,
    );
    check(
      "FM: nothing is lost (led, or folded)",
      fmCard.main.periods.length + fmCard.conditional.periods.length === (change.nextStep?.periods.length ?? -1),
    );
    // Words that do not say what the motion changes: folded too, with the unknown note.
    const unknown = cardLimits(change.nextStep as never, false, "i want to change the order", "", "family:both:asking-to-change-final-order");
    check("words that do not say what changes: folded, with para. 6", unknown.mipNote === MIP_CHANGE_SUBJECT_UNKNOWN && unknown.changeMip.periods.length + unknown.changeMip.deadlines.length === 1);
    check("both notes quote para. 6 from the saved rules", [MIP_SUPPORT_ONLY_CHANGE, MIP_CHANGE_SUBJECT_UNKNOWN].every((line) => line.cite.pinpoint === "r. 8.1 (1), para. 6" && flr.includes(line.cite.quote)));
    // Property over kinds of words: it leads exactly when the words show a change beyond support.
    const wordsList = ["", "i want to change child support", "i want to change parenting time", "change the custody order", "she wants the house", "my spousal support is too high", "change support and the weekend schedule", "the matrimonial home"];
    let leadMisses = 0;
    for (const words of wordsList) {
      const card = cardLimits(change.nextStep as never, false, words, "", "family:both:asking-to-change-final-order");
      const leads = [...card.main.periods, ...card.main.deadlines].some((item) => isChangeMip(item as { id?: string }));
      if (leads !== changeBeyondSupport(words)) leadMisses += 1;
      if (!leads && !card.mipNote) leadMisses += 1;
    }
    check("the information program leads exactly when the words show a change beyond support, and is folded with its note otherwise", leadMisses === 0, `misses ${leadMisses}`);
    // Naming the children is not a parenting claim (review of 70b717b).
    const kidsSupport = "i pay support for our kids, how do i get it lowered";
    const kidsCard = cardLimits(change.nextStep as never, false, kidsSupport, "", "family:both:asking-to-change-final-order");
    check(
      "'i pay support for our kids': support only, the information program folded",
      !changeBeyondSupport(kidsSupport) && ![...kidsCard.main.periods, ...kidsCard.main.deadlines].some((item) => isChangeMip(item as { id?: string })) && kidsCard.mipNote === MIP_SUPPORT_ONLY_CHANGE,
    );
    // The information program's test is stricter than the shared one (re-review of 7f2868f):
    // a parenting term or a plain-words parenting request, never only naming the children.
    let termMisses = 0;
    for (const words of [
      "custody of our son", "parenting time", "decision-making for my daughter", "access to the kids", "contact with my son", "she wants to relocate", "she wants to move with the kids",
      "i pay child support for my son and want it lowered and want more time with him", "i want my daughter to live with me", "she won't let me see my son", "i want to change the weekend schedule", "i want more visits",
    ]) {
      if (!changeBeyondSupport(words)) termMisses += 1;
    }
    for (const words of ["our kids", "my daughter", "support for my son and daughter", "our children are 9 and 11", kidsSupport]) {
      if (changeBeyondSupport(words)) termMisses += 1;
    }
    check("the information program leads on a parenting term or request, never on only naming the children", termMisses === 0, `misses ${termMisses}`);
    const moreTime = cardLimits(change.nextStep as never, false, "i pay child support for my son and want it lowered and want more time with him", "", "family:both:asking-to-change-final-order");
    check("'more time with him': the information program leads", [...moreTime.main.periods, ...moreTime.main.deadlines].some((item) => isChangeMip(item as { id?: string })) && !moreTime.mipNote);
    // The shared reading, used by every other family fold, still counts the children named.
    check(
      "the shared reading still reads plain-word parenting (the 35.1, fee and Form 13 folds)",
      ["i want my daughter to live with me", "she won't let me see my son", "i pay child support for my son and want more time with him", "my ex took me to court for custody of our daughter"].every((words) => familyClaimsIn(words).parenting),
    );
    // Served with the motion: the note speaks of "the motion", not "your motion".
    check("served with the motion: the note says 'the motion'", !/\byour motion\b/.test(changeMipNoteFor("i got a motion to change about child support", true).say));
    check(
      "the card shows the fold with its condition and the note inside it",
      /data-testid="next-step-mip-fold"[\s\S]{0,600}more than child or spousal support[\s\S]{0,600}data-testid="next-step-mip-note"/.test(panel),
    );
  }

  if (failures > 0) {
    console.log(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll next-step card checks passed.");
}

void main();
