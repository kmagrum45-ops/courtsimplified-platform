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
 *     without the full answer under it.
 *
 * COSTS NOTHING: the stage-answer route and source reads, no model.
 *
 * Run: npm run test:next-step
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { POST } from "../../app/api/case/stage-answer/route";
import { cardLimits, withoutCardLead } from "../../app/builder/_components/StageAnswerPanel";
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
  check("the full answer under the card is told the card shows the first step", /<AnswerView answer=\{result\.answer\} court=\{courtPath\} userWords=\{userWords\} underCard \/>/.test(panel));
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
    const vague = cardLimits(notices as never, false, "something happened to me", "Ottawa");
    check("a story that fits no notice keeps every notice", vague.main.deadlines.length + vague.conditional.deadlines.length + vague.main.periods.length + vague.conditional.periods.length === 5);
  }

  if (failures > 0) {
    console.log(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll next-step card checks passed.");
}

void main();
