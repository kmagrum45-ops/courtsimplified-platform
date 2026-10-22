/**
 * A step whose time is "still running" is never shown beside a counted date that has passed.
 *
 * What it checks: each stage with whenTimeRunsOut links one of its OWN deadlines
 * to a stage that exists, is a went-wrong stage, and that the map's own
 * distinguishedFrom already tells apart from it (both ways) by whether the time
 * has run out -- so the link adds no procedure the map does not already state.
 * stageAfterTimeRanOut (the next-step card) gives that stage only once the
 * counted deadline has passed: not while it is running, not with no date, not
 * for a stage with no link. Every "running" stage title in the map has a link;
 * where the map has no stage for after the time ran out (stage: null), the card
 * says that step is not covered yet instead of claiming time is running.
 *
 * Failure it exists to catch: the #465 re-test, where Small Claims, civil and
 * family next-step pages said "time to defend/answer still running" right
 * beside "That date has already passed".
 *
 * Run: npm run test:time-ran-out
 */
import { readFileSync } from "node:fs";
import { ALL_STAGES, findStage } from "../../src/lib/case-system/stage-map/stageMap";
import { NOT_COVERED, stageAfterTimeRanOut } from "../../app/builder/_components/StageAnswerPanel";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const linked = ALL_STAGES.filter((stage) => stage.whenTimeRunsOut);
check("the three running-time stages are linked (Small Claims, civil, family)", ["defendant:served-defence-period-running", "civil:defendant:served-defence-period-running", "family:respondent:served-time-to-answer-running"].every((id) => linked.some((stage) => stage.id === id)));
for (const stage of linked) {
  const link = stage.whenTimeRunsOut!;
  check(`${stage.id}: the linked deadline is one of its own`, stage.deadlines.some((deadline) => deadline.id === link.deadline), link.deadline);
  if (link.stage === null) continue; // not covered yet: nothing to check against
  const target = findStage(link.stage);
  check(`${stage.id}: the linked stage exists and is a went-wrong stage`, Boolean(target?.wentWrong), link.stage);
  check(`${stage.id}: the map already tells the two apart by whether the time has run out`,
    stage.distinguishedFrom.some((entry) => entry.stage === link.stage && /run out/.test(entry.by)) &&
      Boolean(target?.distinguishedFrom.some((entry) => entry.stage === stage.id)));
}
const unlinked = ALL_STAGES.filter((stage) => /still running|time to defend running/i.test(stage.title) && !stage.whenTimeRunsOut).map((stage) => stage.id);
check("every stage titled as time still running has a link", unlinked.length === 0, unlinked.join(", "));

const today = "2026-10-21";
for (const stage of linked) {
  const id = stage.whenTimeRunsOut!.deadline;
  const at = (date: string) => stageAfterTimeRanOut(stage.id, [{ id, date, statement: "x" }], today);
  const after = stage.whenTimeRunsOut!.stage;
  check(`${stage.id}: a passed counted date gives ${after ? `"${findStage(after)?.title}"` : "not covered yet"}`, after ? at("2026-09-01")?.id === after : at("2026-09-01") === NOT_COVERED);
  check(`${stage.id}: a date still to come keeps the running stage`, at("2026-12-01") === null);
  check(`${stage.id}: no counted date keeps the running stage`, stageAfterTimeRanOut(stage.id, [{ id, date: "", statement: "" }], today) === null && stageAfterTimeRanOut(stage.id, [], today) === null);
}
check("a stage with no link never switches", stageAfterTimeRanOut("defendant:defence-filed", [{ id: "deadline:defence-20-days", date: "2026-01-01", statement: "x" }], today) === null);

const card = readFileSync("app/builder/_components/StageAnswerPanel.tsx", "utf8");
check("the next-step card shows the stage after the time ran out in its \"Where you are\" line", card.includes("stageAfterTimeRanOut(stepId, main.deadlines, today)") && card.includes("Where you are: {ranOut.title}"));

if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
console.log("PASS time ran out: a running-time step's title agrees with its counted deadline, in all three areas");
