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

  if (failures > 0) {
    console.log(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll next-step card checks passed.");
}

void main();
