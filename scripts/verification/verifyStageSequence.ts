/**
 * test:stage-sequence -- every step leads to the next by a rule
 * (stage-map/stageSequence.ts, site owner 2026-10-12: "every step and every
 * procedure is governed by the last").
 *
 * WHAT IT CATCHES:
 *   - a move to or from a step that does not exist;
 *   - a move with no rule, or a rule that is not one of the verified quotes in
 *     citations.ts (test:stage-map checks those word for word);
 *   - a step that leads nowhere without being declared final, or a declared
 *     final step that still has moves out of it;
 *   - a step no move leads to, unless it is a declared starting point;
 *   - a step a case cannot reach from where cases start;
 *   - a move that crosses sides (a plaintiff's step leading to a defendant's);
 *   - a "time" move whose rule names no period of time;
 *   - plain words that grade a case or predict an outcome.
 *
 * Each check asserts a property, so adding a step or a move never fails it;
 * only a broken chain does (CLAUDE.md s. 5).
 *
 * COSTS NOTHING: no network, no model.
 */

import { ALL_STAGES, isSpecialStage, type CaseStage } from "../../src/lib/case-system/stage-map/stageMap";
import * as CITATIONS from "../../src/lib/case-system/stage-map/citations";
import { FINAL_STEPS, STAGE_MOVES, STARTING_POINTS, isSequenced, movesFrom, movesInto } from "../../src/lib/case-system/stage-map/stageSequence";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
}

const stages = new Map<string, CaseStage>(ALL_STAGES.filter((stage) => !isSpecialStage(stage.id)).map((stage) => [stage.id, stage]));
const sequenced = [...stages.values()].filter(isSequenced);
// Verified quotes: every citation in citations.ts and every rule a stage
// carries; test:stage-map checks each of those word for word.
const verifiedQuotes = new Set([
  ...Object.values(CITATIONS).filter((value): value is CITATIONS.RuleCitation => !!value && typeof value === "object" && "quote" in value).map((citation) => citation.quote),
  ...ALL_STAGES.flatMap((stage) => [...stage.rules, ...stage.deadlines.map((deadline) => deadline.rule)]).map((rule) => rule.quote),
]);

console.log("\n1. Moves join real steps, each by a verified rule");
const unknown = STAGE_MOVES.flatMap((m) => [m.from, m.to].filter((id) => !stages.has(id)).map((id) => `${m.from} -> ${m.to}: ${id}`));
check("every move's steps exist", unknown.length === 0, unknown.join("\n      "));
const unruled = STAGE_MOVES.filter((m) => m.rules.length === 0).map((m) => `${m.from} -> ${m.to}`);
check("every move cites at least one rule", unruled.length === 0, unruled.join(", "));
const unverified = [...STAGE_MOVES.flatMap((m) => m.rules), ...FINAL_STEPS.flatMap((f) => f.rules)].filter((rule) => !verifiedQuotes.has(rule.quote)).map((rule) => `${rule.sourceId} ${rule.pinpoint}`);
check("every rule is a verified quote (citations.ts or a stage's own rules)", unverified.length === 0, unverified.join(", "));
const duplicate = STAGE_MOVES.map((m) => `${m.from} -> ${m.to}`).filter((key, i, all) => all.indexOf(key) !== i);
check("no move is listed twice", duplicate.length === 0, duplicate.join(", "));

console.log("\n2. Every step leads somewhere, or says why it stops");
const finals = new Set(FINAL_STEPS.map((f) => f.stage));
const deadEnds = sequenced.filter((stage) => !finals.has(stage.id) && movesFrom(stage.id).length === 0).map((stage) => stage.id);
check(`each of the ${sequenced.length} sequenced steps has a move out or is declared final`, deadEnds.length === 0, deadEnds.join(", "));
const finalWithMoves = FINAL_STEPS.filter((f) => movesFrom(f.stage).length > 0).map((f) => f.stage);
check("a declared final step has no moves out", finalWithMoves.length === 0, finalWithMoves.join(", "));
check("every final step and starting point is a real step with a reason", [...FINAL_STEPS, ...STARTING_POINTS].every((f) => stages.has(f.stage) && f.why.trim().length > 10));

console.log("\n3. Every step can be reached");
const starts = new Set(STARTING_POINTS.map((s) => s.stage));
const orphans = sequenced.filter((stage) => !starts.has(stage.id) && movesInto(stage.id).length === 0).map((stage) => stage.id);
check("each step has a move into it or is a declared starting point", orphans.length === 0, orphans.join(", "));
const reached = new Set(starts);
for (let grew = true; grew; ) {
  grew = false;
  for (const m of STAGE_MOVES) if (reached.has(m.from) && !reached.has(m.to)) { reached.add(m.to); grew = true; }
}
const unreachable = sequenced.filter((stage) => !reached.has(stage.id)).map((stage) => stage.id);
check("every step can be reached from where cases start", unreachable.length === 0, unreachable.join(", "));

console.log("\n4. Moves stay on the person's side");
const crossed = STAGE_MOVES.filter((m) => {
  const from = stages.get(m.from)?.side;
  const to = stages.get(m.to)?.side;
  return from && to && from !== "both" && to !== "both" && from !== to;
}).map((m) => `${m.from} -> ${m.to}`);
check("no move takes a plaintiff to a defendant's step, or the reverse", crossed.length === 0, crossed.join(", "));

console.log("\n5. The words match the rules");
const timeless = STAGE_MOVES.filter((m) => m.by === "time" && !m.rules.some((rule) => /\b(\d+|six|two|ten|twenty|thirty|sixty)\b[\s-]*(days?|months?|years?)|anniversary/i.test(rule.quote))).map((m) => `${m.from} -> ${m.to}`);
check("a move made by time running out cites a rule that sets that time", timeless.length === 0, timeless.join(", "));
const grading = STAGE_MOVES.filter((m) => /\b(strong|weak|likely|unlikely|chance|win|lose|merit|should)\b/i.test(m.when)).map((m) => m.when);
check("no move's words grade a case, predict an outcome or tell the person what they should do", grading.length === 0, grading.join(" | "));

// The property this file exists for, on a real case: a served defendant can
// follow the chain from being served to a trial date.
const path = ["defendant:served-defence-period-running", "defendant:defence-filed", "defendant:awaiting-settlement-conference", "defendant:trial-date-set"];
check("a served Small Claims defendant can follow the chain to a trial date", path.every((id, i) => i === 0 || movesFrom(path[i - 1]).some((m) => m.to === id)));

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
