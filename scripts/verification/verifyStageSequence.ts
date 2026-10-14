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
 *   - plain words that grade a case or predict an outcome;
 *   - a step the panel's "What can happen next" would show empty to either
 *     side, or a cited source shown without the date it was saved.
 *
 * Each check asserts a property, so adding a step or a move never fails it;
 * only a broken chain does (CLAUDE.md s. 5).
 *
 * COSTS NOTHING: no network, no model.
 */

import { ALL_STAGES, isSpecialStage, type CaseStage } from "../../src/lib/case-system/stage-map/stageMap";
import * as CITATIONS from "../../src/lib/case-system/stage-map/citations";
import { readFileSync } from "node:fs";
import nodePath from "node:path";

import { FINAL_STEPS, STAGE_MOVES, STARTING_POINTS, isSequenced, movesFrom, movesInto, nextStepsFor, USUAL_NEXT } from "../../src/lib/case-system/stage-map/stageSequence";
import { SOURCE_SAVED_ON } from "../../src/lib/content-library/nextStepPractical";
import { validateCaseStrengthLanguage } from "../../src/lib/case-system/intelligence/caseStrengthLanguageValidator";

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
// Walkthrough run 38593464953, FM sourced: "Final order made" was paired
// with r. 15 (17) alone, which says what consenting parties FILE, not that an
// order is made. A move by the court from a motion-to-change step into the
// final order must cite a rule that speaks of the court making the order.
const MAKES_ORDER = /\bmake (?:the|a final) order\b|\bmake the order (?:asked for|requested)\b|\border asked for\b|\border requested\b/i;
const changeToOrder = STAGE_MOVES.filter((m) => /change/.test(m.from) && m.to === "family:both:final-order-made" && m.by === "court");
check(
  "every court move from a motion-to-change step to a final order cites a rule about the court making the order (never only what the parties file)",
  changeToOrder.length > 0 && changeToOrder.every((m) => m.rules.some((rule) => MAKES_ORDER.test(rule.quote))),
  changeToOrder.filter((m) => !m.rules.some((rule) => MAKES_ORDER.test(rule.quote))).map((m) => `${m.from}: ${m.rules.map((rule) => rule.pinpoint).join(", ")}`).join("; "),
);
check(
  "the consent route to the order says it is the judge's to make ('may'), never that an order will follow",
  changeToOrder.every((m) => !/\bwill (?:be )?(?:make|made|grant|granted|change|changed)\b/i.test(m.when)) &&
    changeToOrder.some((m) => m.from === "family:both:asking-to-change-final-order" && /\bmay make the order asked for\b/.test(m.when) && m.rules.some((rule) => rule.pinpoint === "r. 15 (25)")),
);
// Review of 6e7c257: the binding JDR hearing's move to "Final order made"
// cited r. 43 (12), which is about withdrawing consent. Its move must cite a
// rule saying how the hearing ends in a decision or an order, and say what
// those rules give: a decision the judge "may" make, or the hearing ended.
const DECIDES = /\bmay make a temporary or final decision\b|\bmake an order ending\b|\bin the form of a court order\b/i;
const jdrToOrder = STAGE_MOVES.filter((m) => m.from === "family:both:binding-judicial-dispute-resolution" && m.to === "family:both:final-order-made");
check(
  "the binding JDR move to a final order cites the rules on how the hearing ends (a decision, an order, or the hearing ended), not consent",
  jdrToOrder.length > 0 &&
    jdrToOrder.every((m) => m.rules.length > 0 && m.rules.every((rule) => DECIDES.test(rule.quote))) &&
    jdrToOrder.every((m) => /\bmay make a temporary or final decision\b/.test(m.when) && /\bconference\b/.test(m.when)),
  jdrToOrder.map((m) => m.rules.map((rule) => rule.pinpoint).join(", ")).join("; "),
);
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
// The site's production list of case-strength terms (the one the journey
// invariants use), over every sentence the panel can show.
const blocked = [...STAGE_MOVES.map((m) => m.when), ...FINAL_STEPS.map((f) => f.why)]
  .map((text) => ({ text, result: validateCaseStrengthLanguage(text) }))
  .filter(({ result }) => !result.valid)
  .map(({ text, result }) => `"${result.matchedTerm}": ${text}`);
check("no move or final step uses a term on the site's case-strength list", blocked.length === 0, blocked.join(" | "));

// The property this file exists for, on a real case: a served defendant can
// follow the chain from being served to a trial date.
const path = ["defendant:served-defence-period-running", "defendant:defence-filed", "defendant:awaiting-settlement-conference", "defendant:trial-date-set"];
check("a served Small Claims defendant can follow the chain to a trial date", path.every((id, i) => i === 0 || movesFrom(path[i - 1]).some((m) => m.to === id)));
const civilPath = ["civil:defendant:served-defence-period-running", "civil:defendant:defence-delivered", "civil:both:discovery", "civil:plaintiff:ready-to-set-down", "civil:both:pretrial-scheduled", "civil:both:trial-date-set", "civil:both:judgment-given"];
check("a served Superior Court defendant can follow the chain to a judgment", civilPath.every((id, i) => i === 0 || movesFrom(civilPath[i - 1]).some((m) => m.to === id)));
const familyPath = ["family:respondent:served-time-to-answer-running", "family:respondent:answer-filed", "family:both:case-conference-scheduled", "family:both:settlement-conference-scheduled", "family:both:trial-scheduled", "family:both:final-order-made"];
check("a served family respondent can follow the chain through the conferences to a final order", familyPath.every((id, i) => i === 0 || movesFrom(familyPath[i - 1]).some((m) => m.to === id)));

console.log("\n6. The step panel shows it");
const blank = sequenced.flatMap((stage) => [false, true].filter((responding) => {
  const view = nextStepsFor(stage.id, responding);
  return view.moves.length === 0 && !view.final;
}).map((responding) => `${stage.id} (${responding ? "responding" : "starting"})`));
check("\"What can happen next\" shows every step's moves, or why it stops, to either side", blank.length === 0, blank.join(", "));
const crowded = sequenced.filter((stage) => movesFrom(stage.id).length > 4 && !(stage.id in USUAL_NEXT)).map((stage) => `${stage.id} (${movesFrom(stage.id).length})`);
check("a step with more than four next steps says which come first (USUAL_NEXT), so the panel is not one long list", crowded.length === 0, crowded.join(", "));
const badUsual = Object.entries(USUAL_NEXT).flatMap(([from, tos]) => tos.filter((to) => !movesFrom(from).some((m) => m.to === to)).map((to) => `${from} -> ${to}`));
check("every usual next step is a real move from its step", badUsual.length === 0, badUsual.join(", "));
const manifest = JSON.parse(readFileSync(nodePath.join(import.meta.dirname, "..", "..", "docs/sources/corpus/manifest.json"), "utf8")) as { entries: { id: string; retrievedAt: string }[] };
const savedOn = new Map(manifest.entries.map((entry) => [entry.id, entry.retrievedAt.slice(0, 10)]));
const chainSources = [...new Set([...STAGE_MOVES.flatMap((m) => m.rules), ...FINAL_STEPS.flatMap((f) => f.rules)].map((rule) => rule.sourceId))];
const undated = chainSources.filter((id) => !SOURCE_SAVED_ON[id] || SOURCE_SAVED_ON[id] !== savedOn.get(id));
check("every source the chain cites is shown with the date it was saved (manifest.json)", undated.length === 0, undated.map((id) => `${id}: shows ${SOURCE_SAVED_ON[id] ?? "no date"}, saved ${savedOn.get(id) ?? "?"}`).join("; "));

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
