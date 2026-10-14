/**
 * The right municipality's law for an injury on a municipal way, and the
 * 10-day notice shown first in the intake (round 4 senior-lawyer review,
 * 2026-10-14, persona civil-plaintiff-municipal-slip).
 *
 * WHAT IT CATCHES:
 *   - A Toronto story whose passages, as handed to the question writer or the
 *     research reader, include Municipal Act, 2001 s. 44 (s. 7.1 (1): that Act
 *     does not apply to the City of Toronto), or lack City of Toronto Act,
 *     2006 s. 42; and the reverse, the City of Toronto Act offered for a
 *     story in another municipality. An unknown place must change nothing.
 *   - A drafted question for a Toronto story that cites or names the
 *     Municipal Act getting past the output guard (storyRejection), even when
 *     the browser hands phase 2 a Municipal Act passage id.
 *   - The notice line missing, or shown for a story it does not fit; a
 *     counted last day that differs from the deadline engine's, or from the
 *     card's own standing words (deadlineStandingFor); "passed" not said once
 *     the date and the s. 89 (2) next open day have gone by; the excuse rule
 *     (s. 42 (8)) not quoted; a quote that is not word for word in the saved
 *     official text, or not in the section it is cited to; any line that
 *     grades the case or predicts what a judge will do.
 *   - A family story with no order being offered the provisions that only
 *     vary an existing order (CLRA s. 29 and its kin); a story that mentions
 *     an order losing them.
 *
 * COSTS NOTHING: no model call. Real passages are read from the built index.
 *
 * Run: npm run test:municipal-notice-first
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { loadCorpusIndex, readPassage, sourcePassages, type LoadedIndex, type Passage } from "../../src/lib/case-system/retrieval/corpusIndex";
import type { ResearchResult } from "../../src/lib/case-system/retrieval/researchStory";
import { researchStory } from "../../src/lib/case-system/retrieval/researchStory";
import { fitPassagesToStory, isMunicipalAct44, isTorontoAct, isVariationProvision, withoutWrongForStory } from "../../src/lib/case-system/retrieval/passagesForStory";
import { answeringPassages, questionsFromPassages, storyRejection } from "../../src/lib/case-system/retrieval/sourcedQuestions";
import { computedDeadlinesFor } from "../../src/lib/content-library/computedDeadline";
import { findStage } from "../../src/lib/case-system/stage-map/stageMap";
import { MUNICIPAL_DEADLINE_ID, NOTICE_STEP_ID, TORONTO_DEADLINE_ID, municipalNoticeFirst } from "../../src/lib/content-library/municipalNoticeFirst";
import { deadlineStandingFor, municipalPlaceOf, nextWeekdayOpen } from "../../src/lib/content-library/nextStepPractical";
import type { RuleCitation } from "../../src/lib/case-system/stage-map/citations";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CORPUS = path.join(ROOT, "docs", "sources", "corpus");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
}

const flat = (text: string) => text.replace(/\s+/g, " ").trim();
const corpus = new Map<string, string>();
for (const file of readdirSync(CORPUS)) if (file.endsWith(".txt")) corpus.set(file.replace(/\.txt$/, ""), flat(readFileSync(path.join(CORPUS, file), "utf8")));

function requireIndex(): LoadedIndex {
  const loaded = loadCorpusIndex(ROOT);
  if (loaded) return loaded;
  console.log("FAIL  the corpus index is not built (docs/sources/retrieval)");
  process.exit(1);
  throw new Error("no corpus index");
}
const index = requireIndex();

const passagesOf = (sourceId: string, pinpoint: RegExp): Passage[] =>
  sourcePassages(index, sourceId)
    .filter((chunk) => pinpoint.test(chunk.pinpoint))
    .map((chunk) => readPassage(index, chunk.id, 1))
    .filter((passage): passage is Passage => Boolean(passage));

const MA44 = passagesOf("municipal-act-2001", /^s\. 44(?![.\d])/);
const TO42 = passagesOf("city-of-toronto-act-2006", /^s\. 42(?![.\d])/);
const MA71 = passagesOf("municipal-act-2001", /^s\. 7\.1 \(1\)/);
const CLRA29 = passagesOf("childrens-law-reform-act", /^s\. 29(?![.\d])/);
const CLRA24 = passagesOf("childrens-law-reform-act", /^s\. 24(?![.\d])/);

const TORONTO = "I slipped on ice on the sidewalk on Queen Street in Toronto on September 30 and broke my wrist. I needed surgery and can't work for months. The sidewalk wasn't salted at all. I want to sue the city.";
const TORONTO_SHORT = "i slipped on ice on a city sidewalk in toronto on september 30 and broke my wrist, i want to sue the city";
const SCARBOROUGH = "I tripped on a broken sidewalk in Scarborough on October 3 2026 and fractured my ankle. I want to sue the city.";
const OTTAWA = "I slipped on ice on a city sidewalk on Bank Street in Ottawa on October 8 2026 and broke my wrist. I want to sue the city.";
const TOWN = "I fell in a pothole on a road in the town on October 1 2026 and hurt my knee. I want to sue the town.";
const UNKNOWN = "I slipped on a city sidewalk on October 10 2026 and hurt my knee.";
const NOT_MUNICIPAL = "My contractor never finished the deck and kept my $5,000 deposit.";
const PARENTING_NO_ORDER = "My ex gf took me to court for custody of our daughter. I got served the papers last week. She wants sole custody and wants to move to Ottawa with her. I want joint custody and to keep my time with her.";
const PARENTING_ORDER = "We have a parenting order from 2023 giving us equal time. My ex wants to move to Ottawa with our daughter and change the order.";

async function main() {
// ---------------------------------------------------------------- 0. the law the fix rests on

console.log("\n0. The saved text says what the fix relies on");
const corpusHas = (sourceId: string, quote: string) => (corpus.get(sourceId) ?? "").includes(flat(quote));
check(
  "Municipal Act s. 7.1 (1): the Act does not apply to the City of Toronto",
  MA71.some((passage) => passage.text.includes("This Act does not apply to any of the following, except as otherwise provided by another provision of this Act or of the City of Toronto Act, 2006: 1. The City of Toronto")),
);
check("City of Toronto Act s. 42 (5), (6), (7), (8) are in the index", ["(5) Except in case of gross negligence, the City", "(6) No action shall be brought", "(7) Failure to give notice", "(8) Failure to give notice or insufficiency"].every((words) => TO42.some((passage) => passage.text.includes(words))));
check("Municipal Act s. 44 (9)-(12) are in the index", MA44.some((passage) => passage.pinpoint === "s. 44 (9)-(12)"));

// ---------------------------------------------------------------- 1. the place test

console.log("\n1. Where the municipality is");
check("Toronto story -> toronto", municipalPlaceOf(TORONTO) === "toronto" && municipalPlaceOf(TORONTO_SHORT) === "toronto");
check("Scarborough (a former city of Toronto) -> toronto", municipalPlaceOf(SCARBOROUGH) === "toronto");
check("Ottawa -> elsewhere; 'the town' -> elsewhere", municipalPlaceOf(OTTAWA) === "elsewhere" && municipalPlaceOf(TOWN) === "elsewhere");
check("no place named -> unknown", municipalPlaceOf(UNKNOWN) === "unknown");
check("a saved Toronto city counts; a saved Ottawa city counts", municipalPlaceOf(UNKNOWN, "Toronto") === "toronto" && municipalPlaceOf(UNKNOWN, "Ottawa") === "elsewhere");

// ---------------------------------------------------------------- 2. the passage picker

console.log("\n2. The passages handed to a model fit the story");
const mixed = [...MA44, ...TO42, ...CLRA24];
const research = (passages: Passage[]): ResearchResult => ({
  queries: [],
  passages,
  items: [],
  issues: [{ id: "issue-1", question: "What notice must be given?", queries: ["notice"], situation: "A person was hurt on a sidewalk." }],
  findings: [{ issueId: "issue-1", question: "What notice must be given?", status: "answered", answeredBy: passages.map((passage) => ({ passageId: passage.id, quote: passage.text.slice(0, 40) })) }],
  sourceRequests: [],
  rounds: 1,
});
for (const story of [TORONTO, TORONTO_SHORT, SCARBOROUGH]) {
  // The research found only the Municipal Act: the picker must still hand over s. 42.
  const offered = answeringPassages(research([...MA44]), story, index);
  check(`Toronto (${story.slice(0, 40)}...): no Municipal Act s. 44 passage is offered`, !offered.some(isMunicipalAct44), offered.map((passage) => passage.id).join(", "));
  check(`Toronto (${story.slice(0, 40)}...): City of Toronto Act s. 42 (4)-(6) and (7)-(10) are offered`, ["s. 42 (4)-(6)", "s. 42 (7)-(10)"].every((pin) => offered.some((passage) => isTorontoAct(passage) && passage.pinpoint === pin)));
}
const ottawa = answeringPassages(research([...TO42]), OTTAWA, index);
check("Ottawa: no City of Toronto Act passage is offered", !ottawa.some(isTorontoAct), ottawa.map((passage) => passage.id).join(", "));
check("Ottawa: Municipal Act s. 44 (9)-(12) is offered", ottawa.some((passage) => passage.pinpoint === "s. 44 (9)-(12)" && isMunicipalAct44(passage)));
const unknown = answeringPassages(research(mixed), UNKNOWN, index);
check("unknown place: both Acts kept, nothing added", unknown.length === Math.min(10, mixed.length) && unknown.some(isMunicipalAct44) && unknown.some(isTorontoAct));
check("no story: the picker changes nothing (old callers)", answeringPassages(research(mixed)).map((p) => p.id).join() === mixed.slice(0, 10).map((p) => p.id).join());
check("a story that is not about a municipality: nothing added", !answeringPassages(research([...CLRA24]), NOT_MUNICIPAL, index).some((passage) => isMunicipalAct44(passage) || isTorontoAct(passage)));
check("at most 10 passages, the right Act first", (() => {
  const many = answeringPassages(research([...MA44, ...CLRA24, ...CLRA24]), TORONTO, index);
  return many.length <= 10 && isTorontoAct(many[0]);
})());
check("a research reader for a Toronto story is never offered s. 44 either (fitPassagesToStory swaps it)", (() => {
  const fitted = fitPassagesToStory([...MA44], TORONTO, index);
  return !fitted.some(isMunicipalAct44) && fitted.some(isTorontoAct);
})());

// The whole research step, with stubbed models: the reader never sees s. 44 for Toronto.
{
  const seen: string[] = [];
  const result = await researchStory(
    { story: TORONTO, courtPath: "civil", side: "plaintiff" },
    {
      index,
      spotIssues: async () => [{ id: "issue-1", question: "What notice must be given to the municipality?", queries: ["notice to municipality of injury on sidewalk"], situation: "A person was hurt on a sidewalk." }],
      // Search returns whatever the vectors say; the stub points every query at Municipal Act s. 44 (9)-(12).
      embed: async (texts) => texts.map(() => vectorOf(MA44.find((passage) => passage.pinpoint === "s. 44 (9)-(12)")!.id)),
      readPassages: async (_input, issues, byIssue) => {
        for (const passage of byIssue.get(issues[0].id) ?? []) seen.push(passage.id);
        const first = (byIssue.get(issues[0].id) ?? [])[0];
        return { results: [{ issueId: issues[0].id, status: "answered", answers: first ? [{ passageId: first.id, quote: first.text.slice(0, 60) }] : [] }] };
      },
    },
  );
  check("research for a Toronto story: the reader is shown no Municipal Act s. 44 passage", seen.length > 0 && !seen.some((id) => isMunicipalAct44({ id, pinpoint: readPassage(index, id, 1)?.pinpoint ?? "" })), seen.join(", "));
  check("research for a Toronto story: the reader is shown City of Toronto Act s. 42", seen.some((id) => id.startsWith("corpus:city-of-toronto-act-2006:")));
  check("research for a Toronto story: no finding or listed passage is Municipal Act s. 44", !result.passages.some(isMunicipalAct44) && result.findings.every((finding) => finding.answeredBy.every((answer) => !isMunicipalAct44({ id: answer.passageId, pinpoint: readPassage(index, answer.passageId, 1)?.pinpoint ?? "" }))));
}

function vectorOf(id: string): number[] {
  const row = index!.meta.chunks.findIndex(([chunkId]) => chunkId === id);
  const dims = index!.meta.dimensions;
  return Array.from(index!.vectors.slice(row * dims, (row + 1) * dims), (value) => value / 127);
}

// ---------------------------------------------------------------- 3. the output guard

console.log("\n3. The output guard (a question naming the wrong municipality's law)");
const ma = MA44.find((passage) => passage.pinpoint === "s. 44 (9)-(12)")!;
const to = TO42.find((passage) => passage.pinpoint === "s. 42 (4)-(6)")!;
const WALKTHROUGH_DRAFT = {
  question: "How long had the ice been on the sidewalk before you fell, if you know?",
  why: "The Municipal Act, 2001 says a municipality is not liable for personal injury caused by snow or ice on a sidewalk except in case of gross negligence.",
  passageId: ma.id,
  quote: "Except in case of gross negligence, a municipality is not liable for a personal injury caused by snow or ice on a sidewalk.",
};
check("the walkthrough's question is refused for a Toronto story", Boolean(storyRejection(TORONTO, WALKTHROUGH_DRAFT, ma)));
check("its words alone are enough (a City passage, but 'Municipal Act' in the why)", Boolean(storyRejection(TORONTO, { ...WALKTHROUGH_DRAFT, passageId: to.id }, to)));
check("the same question from s. 42 (5), naming the City of Toronto Act, passes", storyRejection(TORONTO, { ...WALKTHROUGH_DRAFT, passageId: to.id, why: "The City of Toronto Act, 2006 says the City is not liable for a personal injury caused by snow or ice on a sidewalk except in case of gross negligence." }, to) === null);
check("outside Toronto, a City of Toronto Act question is refused; the Municipal Act one passes", Boolean(storyRejection(OTTAWA, { ...WALKTHROUGH_DRAFT, passageId: to.id, why: "The City of Toronto Act, 2006 says ..." }, to)) && storyRejection(OTTAWA, WALKTHROUGH_DRAFT, ma) === null);
{
  // Phase 2 with a browser-supplied Municipal Act passage: refused before any check.
  let checked = 0;
  const result = await questionsFromPassages({ story: TORONTO, courtPath: "civil", side: "plaintiff" }, [ma, to], "A person was hurt on a sidewalk.", {
    write: async () => ({ questions: [WALKTHROUGH_DRAFT] }),
    check: async (_s, items) => {
      checked += items.length;
      return { results: items.map((item) => ({ id: item.id, ok: true })) };
    },
  });
  check("phase 2: the walkthrough's question never reaches the person", result.questions.length === 0 && checked === 0, JSON.stringify(result));
}

// ---------------------------------------------------------------- 4. the notice line

console.log("\n4. The notice line shown first");
const now = new Date("2026-10-14T16:00:00Z"); // noon in Toronto
const line = municipalNoticeFirst(TORONTO, { now, city: "Toronto" });
check("a Toronto sidewalk fall gets the City of Toronto notice line", line?.place === "toronto" && line.rule.sourceId === "city-of-toronto-act-2006" && line.rule.pinpoint === "s. 42 (6)");
const deadline = findStage(NOTICE_STEP_ID)?.deadlines.find((item) => item.id === TORONTO_DEADLINE_ID);
check("its rule is the stage map's own deadline rule", Boolean(deadline) && line?.rule === deadline!.rule);
check("the injury date is read from the story (September 30, the year the most recent)", line?.injury?.date === "2026-09-30" && line.injury.yearAssumed === true);
const engine = deadline ? computedDeadlinesFor([deadline], { "injury-occurred": "2026-09-30" })[0] : undefined;
check("the counted last day is the deadline engine's (Saturday 10 October 2026)", line?.counted?.date === engine?.date && engine?.date === "2026-10-10", `${line?.counted?.date} vs ${engine?.date}`);
const standing = engine && deadline ? deadlineStandingFor({ date: engine.date, statutory: true, statement: engine.statement, consequence: deadline.consequence }, "2026-10-14") : null;
check("its words are the card's own standing words", line?.counted?.statement === standing?.statement);
check("on 14 October it says the date has passed (the s. 89 (2) next open day, 13 October, too)", line?.counted?.passed === true && /has passed/.test(line.counted.statement) && nextWeekdayOpen("2026-10-10") === "2026-10-13");
check("it carries the bar warning and the s. 89 (2) rule", Boolean(line?.counted?.barWarning) && line?.counted?.cite?.pinpoint === "s. 89 (2)");
check("on 13 October it is not yet passed and says to act", (() => {
  const day = municipalNoticeFirst(TORONTO, { now, today: "2026-10-13" });
  return day?.counted?.passed === false && day.counted.urgent === true && /Act today/.test(day.counted.statement);
})());
check("the excuse rule s. 42 (8) and the death rule s. 42 (7) are quoted", line?.notABar.map((rule) => rule.pinpoint).join() === "s. 42 (7),s. 42 (8)");
check("it says what a judge finds is for the judge to decide", /for the judge to decide/.test(line?.judgeDecides ?? ""));
check("it points to urgent help", Boolean(line?.helpWhy));
const ottawaLine = municipalNoticeFirst(OTTAWA, { now });
check("Ottawa: the Municipal Act s. 44 (10) line, last day Monday 19 October", ottawaLine?.rule.pinpoint === "s. 44 (10)" && ottawaLine.counted?.date === "2026-10-19" && ottawaLine.counted.passed === false && ottawaLine.notABar.map((rule) => rule.pinpoint).join() === "s. 44 (11),s. 44 (12)");
check("Ottawa: uses the stage map's Municipal Act deadline", ottawaLine?.rule === findStage(NOTICE_STEP_ID)?.deadlines.find((item) => item.id === MUNICIPAL_DEADLINE_ID)?.rule);
const unknownLine = municipalNoticeFirst(UNKNOWN, { now });
check("unknown place: the Municipal Act line, with the City of Toronto Act's same notice beside it", unknownLine?.rule.sourceId === "municipal-act-2001" && unknownLine.alsoToronto?.rule.pinpoint === "s. 42 (6)");
check("no line for a story that is not an injury on a municipal way", municipalNoticeFirst(NOT_MUNICIPAL, { now }) === null && municipalNoticeFirst(PARENTING_NO_ORDER, { now }) === null);
check("no line for a person hit by a vehicle on a road (Insurance Act notice, not this)", municipalNoticeFirst("I was hit by a car while crossing the road in Toronto on October 1 2026 and broke my leg", { now }) === null);
check("no injury date: the line still shows, with no counted day", (() => {
  const noDate = municipalNoticeFirst("I slipped on ice on a city sidewalk in Toronto and broke my wrist.", { now });
  return Boolean(noDate) && noDate!.counted === null && noDate!.injury === null;
})());

console.log("\n5. Every quote in the line is word for word in the saved text, in the section it is cited to");
const quoted: RuleCitation[] = [];
for (const item of [line, ottawaLine, unknownLine]) {
  if (!item) continue;
  quoted.push(item.rule, ...item.notABar);
  if (item.alsoToronto) quoted.push(item.alsoToronto.rule);
  if (item.counted?.cite) quoted.push(item.counted.cite);
}
const wrongQuotes: string[] = [];
for (const rule of quoted) {
  for (const run of rule.quote.split(" ... ")) {
    if (!corpusHas(rule.sourceId, run)) wrongQuotes.push(`${rule.sourceId} ${rule.pinpoint}: not in the saved text`);
  }
  const section = /^s\. ([\d.]+)/.exec(rule.pinpoint)?.[1];
  const inSection = passagesOf(rule.sourceId, new RegExp(`^s\\. ${section?.replace(".", "\\.")}(?![.\\d])`)).some((passage) =>
    rule.quote.split(" ... ").every((run) => flat(passage.text).includes(flat(run))),
  );
  if (!inSection) wrongQuotes.push(`${rule.sourceId} ${rule.pinpoint}: not in a passage of that section`);
}
check(`${quoted.length} quotes, each in the saved text and its own section`, quoted.length >= 8 && wrongQuotes.length === 0, wrongQuotes.join(" | "));

console.log("\n6. Nothing in the line grades the case");
const words = [line, ottawaLine, unknownLine]
  .filter(Boolean)
  .flatMap((item) => [item!.heading, item!.ruleSay, item!.alsoToronto?.say ?? "", item!.counted?.statement ?? "", item!.counted?.barWarning ?? "", item!.judgeDecides, item!.helpWhy]);
const grading = words.filter((text) => /\b(?:strong|weak|likely|unlikely|chances?|you will (?:win|lose)|will succeed|good case|valid claim|the judge will)\b/i.test(text));
check("no strength, chance or prediction of a judge", grading.length === 0, grading.join(" | "));

// ---------------------------------------------------------------- 7. family: variation passages

console.log("\n7. Family: changing an order is not offered when the story shows no order");
check("CLRA s. 29 is a variation provision; s. 24 is not", CLRA29.length > 0 && CLRA29.every(isVariationProvision) && CLRA24.every((passage) => !isVariationProvision(passage)));
check("no order in the story: CLRA s. 29 is left out, s. 24 kept", (() => {
  const kept = withoutWrongForStory([...CLRA29, ...CLRA24], PARENTING_NO_ORDER);
  return !kept.some(isVariationProvision) && kept.length === CLRA24.length;
})());
check("an order in the story: CLRA s. 29 kept", withoutWrongForStory([...CLRA29, ...CLRA24], PARENTING_ORDER).length === CLRA29.length + CLRA24.length);
check("Divorce Act s. 17, FLA s. 37 and FLR r. 15 are variation provisions too", [
  passagesOf("divorce-act", /^s\. 17 \(1\)/),
  passagesOf("family-law-act", /^s\. 37 \(1\)/),
  passagesOf("family-law-rules", /^r\. 15 \(1\)/),
].every((list) => list.length > 0 && list.every(isVariationProvision)));

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
}

void main();
