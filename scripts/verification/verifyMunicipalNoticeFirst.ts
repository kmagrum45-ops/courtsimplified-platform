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
 *     vary an existing order (CLRA s. 29 and its kin); any story that might
 *     have an earlier order ("custody papers from 2019", "the judge gave me",
 *     "through FRO") losing them.
 *   - (Review of f71a316 and 8792939) the line firing for anything but the
 *     person falling ON a public way, read sentence by sentence: private
 *     premises, transit, a vehicle, a provincial highway, a dog, a cyclist,
 *     an assault, police pushing, a broken shoe, their own feet (with no
 *     defect named), a street that is only an address, a way word the person
 *     did not fall on ("fell behind on rent ... on Main Street", "fell asleep
 *     at the wheel on the road"); or staying silent for a sidewalk in front of a building, at
 *     a bus stop, or with no city named; an agreement losing r. 15; organisation names ("Toronto Hydro",
 *     "TD") or street names ("Kingston Road") taken for Toronto; two named
 *     places not giving "unknown" with both Acts kept; added Act passages
 *     pushing a research passage out; the judge line under the death rule.
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
import { MAX_PASSAGE_IDS, answeringPassages, questionsFromPassages, storyRejection } from "../../src/lib/case-system/retrieval/sourcedQuestions";
import { computedDeadlinesFor } from "../../src/lib/content-library/computedDeadline";
import { findStage } from "../../src/lib/case-system/stage-map/stageMap";
import { MUNICIPAL_DEADLINE_ID, NOTICE_STEP_ID, TORONTO_DEADLINE_ID, municipalNoticeFirst, turnsOnJudge } from "../../src/lib/content-library/municipalNoticeFirst";
import { deadlineStandingFor, municipalPlaceOf, municipalWayInjury, nextWeekdayOpen } from "../../src/lib/content-library/nextStepPractical";
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
check("at most 10 research passages plus at most 3 added, the right Act first", (() => {
  const many = answeringPassages(research([...MA44, ...CLRA24, ...CLRA24]), TORONTO, index);
  return many.length <= MAX_PASSAGE_IDS && many.filter((passage) => !isTorontoAct(passage)).length <= 10 && isTorontoAct(many[0]);
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
check("the judge line belongs to (8) and (12) only; the death exception (7)/(11) applies by itself", (() => {
  const all = [...(line?.notABar ?? []), ...(municipalNoticeFirst(OTTAWA, { now })?.notABar ?? [])];
  return all.length === 4 && all.every((rule) => turnsOnJudge(rule) === /\((?:8|12)\)$/.test(rule.pinpoint));
})());
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
check("a first application just served, nothing earlier: CLRA s. 29 is left out, s. 24 kept", (() => {
  const kept = withoutWrongForStory([...CLRA29, ...CLRA24], PARENTING_NO_ORDER);
  return !kept.some(isVariationProvision) && kept.length === CLRA24.length;
})());
check("an order in the story: CLRA s. 29 kept", withoutWrongForStory([...CLRA29, ...CLRA24], PARENTING_ORDER).length === CLRA29.length + CLRA24.length);
{
  const VARIATIONS = [
    ...CLRA29,
    ...passagesOf("divorce-act", /^s\. 17(?![.\d])/),
    ...passagesOf("family-law-act", /^s\. 37(?![.\d])/),
    ...passagesOf("family-law-rules", /^r\. 15(?![.\d])/),
  ];
  // Each phrasing of an earlier order, alone and after "I got served papers last week" (review of f71a316).
  const EARLIER = [
    "I have custody papers from 2019.",
    "The court said in 2020 that I pay $400 a month.",
    "The judge gave me primary residence.",
    "There was a court decision from 2018 about the kids.",
    "I have been paying child support through FRO since 2017.",
    "We have a parenting plan from mediation.",
    "I was awarded custody.",
    "We won joint custody.",
    "He pays spousal support under our divorce.",
    "The family court gave him visitation.",
  ];
  const dropped = EARLIER.flatMap((phrase) => [phrase, `My ex took me to court and I got served papers last week. ${phrase}`]).filter(
    (story) => withoutWrongForStory(VARIATIONS, story).length !== VARIATIONS.length,
  );
  check("every phrasing of an earlier order keeps r. 15, CLRA s. 29, DA s. 17 and FLA s. 37", VARIATIONS.length >= 4 && dropped.length === 0, dropped.join(" | "));
  const plain = ["My ex and I are arguing about the kids.", "I want custody of my son.", "She wants to move to Ottawa with our daughter."];
  check("no positive sign that there is no order: kept", plain.every((story) => withoutWrongForStory(VARIATIONS, story).length === VARIATIONS.length));
  const none = ["There is no court order yet and she wants custody.", "We have never been to court; she wants sole custody."];
  check("'no order' or 'never been to court': left out", none.every((story) => withoutWrongForStory(VARIATIONS, story).length === 0));
  // r. 15 changes an agreement too (re-review of 8792939).
  const AGREEMENTS = [
    "We have a separation agreement but we have never been to court.",
    "There is no court order, only a separation agreement we signed. I want to change the support.",
    "We never went to court; we made a parenting agreement with a mediator.",
    "There's no support order but we agreed in writing he pays $500.",
  ];
  const lostAgreement = AGREEMENTS.filter((story) => withoutWrongForStory(VARIATIONS, story).length !== VARIATIONS.length);
  check("an agreement keeps r. 15 and the other variation provisions, even with 'no order' or 'never been to court'", lostAgreement.length === 0, lostAgreement.join(" | "));
}

// ---------------------------------------------------------------- 8. only an injury ON a municipal way

console.log("\n8. The notice line fires only for an injury on a municipal way (s. 42 (2): repair of a highway or bridge)");
check(
  "City of Toronto Act s. 42 (1)-(2): the City's duty to repair a highway or bridge, and liability for default",
  TO42.some((passage) => passage.text.includes("The City shall keep a highway or bridge over which it has jurisdiction in a state of repair") && passage.text.includes("If the City defaults in complying with subsection (1)")),
);
const NEVER = [
  "I slipped on a wet floor in a store on Yonge St in Toronto on October 2 2026 and broke my wrist. I want to sue the city.",
  "I slipped on ice in the Loblaws parking lot on Main St in Ottawa on October 2 2026 and hurt my back.",
  "I fell on ice on my neighbour's driveway on Elm St in Hamilton on October 2 2026 and broke my ankle.",
  "I fell when the TTC bus braked hard on Queen St in Toronto on October 2 2026 and hurt my shoulder.",
  "I fell getting off the streetcar on Queen St in Toronto on October 2 2026 and broke my wrist.",
  "Debris on Highway 401 near Kingston hit my windshield on October 2 2026 and I was hurt.",
  "I slipped on the stairs of the city-owned community centre on Bloor St in Toronto on October 2 2026 and broke my wrist.",
  "I fell on my landlord's broken stairs on King St in Toronto on October 2 2026 and hurt my back.",
  "I was in a car accident on the road in Toronto on October 2 2026 and hurt my neck.",
  "I tripped over a board at a construction site on a street in Toronto on October 2 2026 and broke my ankle.",
  "A tree branch fell on my car parked on the street in Toronto on October 2 2026 and I was hurt.",
  "I slipped on ice at the mall on Highway 7 in Vaughan on October 2 2026 and broke my wrist.",
  "I fell on the provincial highway shoulder on October 2 2026 and hurt my knee.",
  // Re-review of 8792939: read sentence by sentence.
  "I live on Elm Street in Ottawa and my contractor broke my fence.",
  "A dog bit me on the sidewalk in Toronto and I fell and broke my wrist.",
  "A cyclist knocked me down and I fell on the sidewalk in Toronto. I want to sue the city.",
  "I was assaulted on the street in Toronto and fell, breaking my arm.",
  "The police pushed me and I fell on the sidewalk in Toronto.",
  "I fell on the sidewalk in Toronto because my shoe broke.",
  "I tripped on my own feet crossing the street in Toronto and sprained my ankle.",
  "I slipped on the sidewalk outside the Tim Hortons in Barrie, on their property, and broke my wrist.",
  "I fell off the cottage deck on Lake Road in the township and broke my leg.",
  "My son tripped at school on the sidewalk and broke his arm. I want to sue the school board.",
  "I was hit by a car while crossing the road in Toronto on October 1 2026 and broke my leg.",
  "I broke my wrist on October 2 2026. I live on Queen Street in Toronto.",
  // Re-review of 41a8364: the way word must be what the person fell on.
  "I fell behind on rent for my apartment on Main Street in Ottawa and my landlord wants to evict me.",
  "I fell in love with a house on Maple Street in Toronto and the seller backed out.",
  "We fell out of touch after he borrowed $5,000 and moved to Elm Street in Ottawa.",
  "I fell asleep at the wheel on the road in Ottawa and crashed.",
  "I slipped on the ice at the arena on Main Street in Barrie.",
  "I slipped on an icy road on the private golf course in Toronto and broke my wrist.",
  "I slipped on the icy road inside our condo complex in Toronto and hurt my back.",
  "I tripped on the track crossing the road in the park in Toronto and hurt my knee.",
  "The dog knocked me over and I fell on the sidewalk in Toronto.",
  "I fell on the bus on Queen St in Toronto.",
  "I crashed at the go-kart track and fell on the track.",
  // Re-review of db40587: the chain may not cross a clause or an idiom.
  "I fell off a roof while working on a house on the street in Toronto.",
  "I fell on hard times living on the street in Toronto and my landlord evicted me.",
  "I tripped on a hose in my neighbour's yard by the sidewalk in Toronto.",
  "I slipped on a wet floor in the hospital on the road to recovery.",
  "I was tripping on drugs on the street when police arrested me.",
  "I got a slip on my windshield on the street in Ottawa for parking.",
  "I tripped on the road at the go-kart track in Toronto.",
];
const fired = NEVER.filter((story) => municipalWayInjury(story) || municipalNoticeFirst(story, { now, city: "Toronto" }) !== null);
check("private premises, transit, vehicles and provincial highways never fire", fired.length === 0, fired.join(" | "));
const ALWAYS = [
  TORONTO,
  TORONTO_SHORT,
  SCARBOROUGH,
  OTTAWA,
  TOWN,
  "I tripped in a pothole on Dundas Street in Toronto on October 2 2026 and sprained my ankle.",
  "I tripped on a raised slab of sidewalk in Hamilton on October 2 2026 and broke my wrist.",
  "I fell off the curb in a crosswalk in Toronto on October 2 2026 and hurt my knee. I want to sue the city.",
  // Re-review of 8792939: the place and the cause are read from the sentence of the fall.
  "I tripped on a sidewalk lifted by tree roots in Ottawa on October 2 2026 and broke my wrist. I want to sue the city.",
  "I slipped on the icy sidewalk at the bus stop on Queen Street in Toronto on October 2 2026 and broke my hip.",
  "On a cracked sidewalk outside my apartment building in Scarborough, I tripped and broke my wrist on October 2 2026.",
  "On the unsalted sidewalk in front of my building in Toronto, I fell on October 2 2026 and hurt my back. I want to sue the city.",
  "The snowplow driver left a ridge of ice on the sidewalk in Hamilton and I slipped on October 2 2026.",
  "I stepped out of my car onto an icy curb on a city street in London and fell on October 2 2026.",
  "The city didn't fix the sidewalk outside my home. I tripped on it on October 2 2026 and broke my wrist.",
  "My bike hit a pothole on Dundas and I fell on October 2 2026.",
  // Re-review of 41a8364.
  "Last fall I slipped on the icy sidewalk on Bloor Street in Toronto and broke my wrist.",
  "In the fall of 2026 I tripped on a pothole in Hamilton and hurt my knee.",
  "I was walking my dog when I slipped on the unsalted sidewalk in Toronto and broke my wrist.",
  "My elderly father fell on the icy sidewalk in Ottawa on October 2 2026 and broke his hip.",
  "Slipped on ice on a city sidewalk in Ottawa on October 2 2026, broke my wrist.",
  "I caught my foot in a crack in the sidewalk in Toronto on October 2 2026 and fell.",
  "I caught my foot in a hole in the road in Hamilton and broke my ankle.",
  "I tripped over my own feet on the uneven sidewalk in Toronto and broke my wrist.",
  "I called the police after I slipped on the icy sidewalk in Toronto and broke my wrist.",
  "There was a cracked sidewalk outside my apartment building in Scarborough, I tripped on October 2 2026.",
  "I tripped over my own feet because the sidewalk was so uneven in Toronto, on October 2 2026.",
  "I slipped on black ice on the sidewalk in Ottawa on October 2 2026 and broke my wrist.",
  "I tripped on a crack in the sidewalk on Bank Street in Ottawa on October 2 2026.",
];
const silent = ALWAYS.filter((story) => !municipalNoticeFirst(story, { now }));
check("the persona and plain sidewalk, pothole, curb stories still fire", silent.length === 0, silent.join(" | "));
check(
  "a fall on a sidewalk with no city named gets the unknown-place line with both Acts",
  municipalNoticeFirst("The city didn't fix the sidewalk outside my home. I tripped on it on October 2 2026 and broke my wrist.", { now })?.alsoToronto?.rule.sourceId === "city-of-toronto-act-2006",
);
check(
  "a non-municipal injury gets no injected Act passages either",
  NEVER.every((story) => !answeringPassages(research([...CLRA24]), story, index).some((passage) => isTorontoAct(passage) || isMunicipalAct44(passage))),
);

// ---------------------------------------------------------------- 9. where: organisations, streets, two places

console.log("\n9. Organisation and street names are not places; two places are 'unknown'");
const PLACES: [string, string][] = [
  ["I slipped on an icy sidewalk outside the Toronto-Dominion bank in Mississauga.", "elsewhere"],
  ["I slipped on an icy sidewalk outside the TD bank in Mississauga.", "elsewhere"],
  ["I moved from Toronto last year. I slipped on an icy sidewalk in Barrie.", "elsewhere"],
  ["A Toronto Hydro crew left a hole in the sidewalk in Brampton and I tripped.", "elsewhere"],
  ["Toronto Police took my report after I fell on a sidewalk in Oshawa.", "elsewhere"],
  ["I fell on a sidewalk near the University of Toronto campus in Mississauga.", "elsewhere"],
  ["I tripped on East York Avenue in Markham.", "elsewhere"],
  ["I live in Toronto but slipped on a sidewalk in Ottawa.", "unknown"],
  ["I slipped on Kingston Road in Toronto.", "toronto"],
  ["I tripped on Markham Road in Scarborough.", "toronto"],
  ["I fell on a sidewalk on Kingston Road.", "unknown"],
];
const misplaced = PLACES.filter(([story, want]) => municipalPlaceOf(story) !== want).map(([story, want]) => `${story} -> ${municipalPlaceOf(story)}, want ${want}`);
check("each probe gets the right place", misplaced.length === 0, misplaced.join(" | "));
{
  const BOTH = "I live in Toronto but slipped on an icy city sidewalk in Ottawa on October 8 2026 and broke my wrist.";
  check("two places: both Acts are kept (the filter acts only on a definite place)", withoutWrongForStory([...MA44, ...TO42], BOTH).length === MA44.length + TO42.length);
  check(
    "two places: the guard lets a Municipal Act question and a City of Toronto Act question through",
    storyRejection(BOTH, WALKTHROUGH_DRAFT, ma) === null && storyRejection(BOTH, { ...WALKTHROUGH_DRAFT, passageId: to.id, why: "The City of Toronto Act, 2006 says ..." }, to) === null,
  );
  const both = municipalNoticeFirst(BOTH, { now });
  check("two places: the notice line shows both notices", both?.place === "unknown" && both.rule.sourceId === "municipal-act-2001" && both.alsoToronto?.rule.sourceId === "city-of-toronto-act-2006");
}

// ---------------------------------------------------------------- 10. added passages never push research out

console.log("\n10. The right Act is added on top; research passages are never pushed out");
{
  const OLA = passagesOf("occupiers-liability-act", /^s\. /);
  const filler = passagesOf("limitations-act-2002", /^s\. /).slice(0, 12);
  const ten = [...MA44.slice(0, 1), ...OLA.slice(0, 2), ...filler].slice(0, 10);
  const offered = answeringPassages(research(ten), TORONTO, index);
  const researchKept = ten.filter((passage) => !isMunicipalAct44(passage));
  check(
    "every research passage that applies is still offered (the Occupiers' Liability Act among them)",
    OLA.length > 0 && filler.length > 0 && researchKept.every((passage) => offered.some((item) => item.id === passage.id)),
    offered.map((p) => p.id).join(", "),
  );
  check("the added City of Toronto Act passages are at most 3, on top", offered.filter(isTorontoAct).length <= 3 && offered.length <= MAX_PASSAGE_IDS);
}

// ---------------------------------------------------------------- 11. asked first (s. 4)

console.log("\n11. The box asks first; the date and the bar show only after Yes or Not sure");
{
  const box = readFileSync(path.join(process.cwd(), "app/builder/_components/MunicipalNoticeFirst.tsx"), "utf8");
  const { showsFullNotice } = await import("../../app/builder/_components/MunicipalNoticeFirst");
  check("only Yes and Not sure show the full notice", showsFullNotice("yes") && showsFullNotice("not-sure") && !showsFullNotice("no") && !showsFullNotice(null));
  const asking = box.slice(box.indexOf("if (!showsFullNotice(answer))"), box.indexOf("  return (\n    <section", box.indexOf("if (!showsFullNotice(answer))") + 1));
  check(
    "before an answer, and after No, nothing counted, no bar and no exceptions are drawn",
    asking.length > 0 && !/notice\.(?:counted|notABar|injury|ruleSay|judgeDecides)/.test(asking),
    asking.slice(0, 200),
  );
  check("the question says 'Is that right?' and gives its reason", /Is that right\?/.test(asking) && /Why we ask/.test(asking));
  check("every answer can be changed", (box.match(/setAnswer\(null\)/g) ?? []).length >= 2);
  const spec = readFileSync(path.join(process.cwd(), "tests/browser/walkthrough.spec.ts"), "utf8");
  check("the walkthrough answers Yes only for a persona hurt on a municipal way", /persona\.onMunicipalWay\) await yes\.click\(\)/.test(spec) && /municipal-notice-no/.test(spec));
}

check("Divorce Act s. 17, FLA s. 37 and FLR r. 15 are variation provisions too", [
  passagesOf("divorce-act", /^s\. 17 \(1\)/),
  passagesOf("family-law-act", /^s\. 37 \(1\)/),
  passagesOf("family-law-rules", /^r\. 15 \(1\)/),
].every((list) => list.length > 0 && list.every(isVariationProvision)));

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
}

void main();
