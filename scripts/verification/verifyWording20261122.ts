/**
 * THE OWNER'S 2026-11-22 FOLLOW-UP TO THE 2026-11-21 WORDING RULE IS ON THE SITE, WORD FOR WORD, EACH SENTENCE RESTING
 * ON THE RULE WHOSE WORD IT NOW USES.
 *
 * The rule: say the rule's own word, with the plain word in brackets for stay and suspend, and "immediately" where the
 * rule says immediately. Six sentences left after #553:
 *   1. every new sentence is present, exactly, where it is shown: the "Your deadline" section as the stage map renders it
 *      and as published, a stage description, or a "what comes next" move;
 *   2. the old wording is gone from the stage map and the published answers;
 *   3. each sentence's supporting rule is attached where the sentence lives (the deadline's rule or exceptions, the
 *      stage's rules, the move's rules), its quote uses the word the sentence now says, and the quote is found word for
 *      word in the saved source (docs/sources/corpus), ignoring only line breaks and repeated spaces.
 *
 * WHAT FAILURE THIS CATCHES: a sentence that drifts back to "right away", "hold back", "pauses" or "on hold" where the rule
 * says immediately or stay, or one whose supporting quote is detached or not the law's own words.
 *
 * Run: npm run test:wording-20261122
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import lib from "../../src/lib/content-library/published/stageAnswers.published.json";
import { ALL_STAGES } from "../../src/lib/case-system/stage-map/stageMap";
import { STAGE_MOVES } from "../../src/lib/case-system/stage-map/stageSequence";
import { renderDeadlineSection } from "../../src/lib/content-library/stageAnswers";
import type { RuleCitation } from "../../src/lib/case-system/stage-map/citations";

let failures = 0;
let passes = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) { passes += 1; return; }
  failures += 1;
  console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
};

const CORPUS = path.resolve(import.meta.dirname, "..", "..", "docs", "sources", "corpus");
const flat = (s: string) => s.replace(/\s+/g, " ").trim();
const inSource = (sourceId: string, quote: string) =>
  flat(readFileSync(path.join(CORPUS, `${sourceId}.txt`), "utf8")).includes(flat(quote));

type Where = "deadline" | "description" | "move";
type Item = { stage: string; where: Where; old: string; now: string; pinpoint: string; word: string };
const ITEMS: Item[] = [
  { stage: "family:applicant:application-filed-not-served", where: "deadline", old: "You then serve it right away.", now: "You then serve it immediately.", pinpoint: "r. 8 (5)", word: "shall be served immediately" },
  { stage: "family:both:served-with-notice-of-appeal", where: "deadline", old: "It does hold back other payment orders until the appeal is decided.", now: "It does stay (pause) other payment orders until the appeal is decided.", pinpoint: "r. 38 (34)", word: "stays" },
  { stage: "civil:defendant:judgment-being-enforced", where: "deadline", old: "Delivering a notice of appeal pauses the parts of the order that say to pay money, until the appeal is decided.", now: "Delivering a notice of appeal stays (pauses) the parts of the order that say to pay money, until the appeal is decided.", pinpoint: "r. 63.01 (1)", word: "stays" },
  { stage: "civil:plaintiff:crown-misfeasance-leave-needed", where: "description", old: "may go ahead only with the court's leave, and is on hold until leave is granted.", now: "may go ahead only with the court's leave, and is deemed to have been stayed (paused) until leave is granted.", pinpoint: "s. 17 (2)", word: "unless and until leave is granted, is deemed to have been stayed" },
  { stage: "family:applicant:application-filed-not-served", where: "move", old: "You serve the application right away on every other party", now: "You serve the application immediately on every other party", pinpoint: "r. 8 (5)", word: "shall be served immediately" },
  { stage: "family:both:order-made-without-notice", where: "move", old: "The order is served right away on everyone affected", now: "The order is served immediately on everyone affected", pinpoint: "r. 14 (15)", word: "shall be served immediately" },
];

const blocks = lib.blocks as { stageId: string; yourDeadline?: string | null; whatsHappening: string; whatToDoNext: string; whatHappensAfter: string }[];
const publishedText = blocks.map((b) => [b.whatsHappening, b.whatToDoNext, b.whatHappensAfter, b.yourDeadline ?? ""].join("\n")).join("\n");

for (const item of ITEMS) {
  const label = `${item.stage} (${item.where})`;
  const stage = ALL_STAGES.find((s) => s.id === item.stage);
  check(`${label}: stage exists`, Boolean(stage));
  if (!stage) continue;
  let shown = "";
  let rules: RuleCitation[] = [];
  if (item.where === "deadline") {
    shown = renderDeadlineSection(stage.deadlines) ?? "";
    const block = blocks.find((b) => b.stageId === item.stage);
    check(`${label}: published section is the stage map's rendering`, block?.yourDeadline === shown);
    const holder = stage.deadlines.find((d) => `${d.what}${d.qualifier ?? ""}`.includes(item.now));
    check(`${label}: one deadline holds the sentence`, Boolean(holder));
    if (holder) rules = [holder.rule, ...(holder.exceptions ?? [])];
  } else if (item.where === "description") {
    shown = stage.description;
    rules = stage.rules;
  } else {
    const move = STAGE_MOVES.find((m) => m.from === item.stage && m.when.includes(item.now));
    check(`${label}: a move from the stage says it`, Boolean(move));
    shown = move?.when ?? "";
    rules = move?.rules ?? [];
  }
  check(`${label}: new wording shown`, shown.includes(item.now), shown.slice(0, 200));
  check(`${label}: old wording gone`, !shown.includes(item.old));
  const rule = rules.find((r) => r.pinpoint === item.pinpoint);
  check(`${label}: ${item.pinpoint} attached`, Boolean(rule), rules.map((r) => r.pinpoint).join(", "));
  if (rule) {
    check(`${label}: ${item.pinpoint} says "${item.word}"`, rule.quote.includes(item.word));
    check(`${label}: ${item.pinpoint} is word for word in the saved ${rule.sourceId}`, inSource(rule.sourceId, rule.quote), rule.quote.slice(0, 160));
  }
}

// 2. The old wording is gone everywhere it was published or mapped.
const mapText = [
  ...ALL_STAGES.flatMap((s) => [s.description, ...s.deadlines.flatMap((d) => [d.what, d.qualifier ?? ""])]),
  ...STAGE_MOVES.map((m) => m.when),
].join("\n");
for (const item of ITEMS) {
  check(`old wording absent from the stage map: ${item.old.slice(0, 60)}`, !mapText.includes(item.old));
  check(`old wording absent from the published answers: ${item.old.slice(0, 60)}`, !publishedText.includes(item.old));
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
