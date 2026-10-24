/**
 * The situation answers are read the same way everywhere, and never asked again (step 2, gate A).
 *
 * What it checks: each situation (starting with nothing filed, starting with
 * something filed, served with each picked first page, a case going that they
 * started, a case going they are responding to, papers they are not sure of), in
 * each of Small Claims, civil and Family, fed to every place that reads the side, what
 * was filed or the day they were served:
 *   - the one side rule (caseRecord.ts sideFromParts), also when the stored intake or
 *     the guided facts say the other side: the person's situation answer wins;
 *   - each area's answers (situationAnswers) and the Small Claims server's facts
 *     (guided-turn situationFacts);
 *   - the review: the side, what was filed and the day served shown as given at the
 *     start (marked, changed only there), and its remaining questions: the side,
 *     "filed" and served-date questions
 *     the situation settles are not asked;
 *   - the case position's date answers (readCasePosition): the day they got the papers
 *     answers that document's date question, under any date given on the step page;
 *   - the top line, from the person's answers only, and nothing until complete;
 *   - the story is a cross-check: a contradiction is reported, never applied.
 * Also: the questions' order (nextSituationQuestion), the court from the papers or the
 * area chosen, a change clearing answers that no longer apply, the year rule on the
 * date, and every picture's record tracing to the official form list.
 *
 * Then each place the independent reviewer found (gate D) is held to the same rule:
 * the situation date never frozen into a saved position, the Small Claims date and
 * papers never asked twice, the stage and "nothing filed" as the answers settle them.
 *
 * Failure it exists to catch: a later step asking the side, "has anything been filed"
 * or the day served again after the situation questions (the #469-#471 re-tests'
 * repeated questions), or a story reader overriding what the person said.
 *
 * Run: npm run test:situation
 */
import fs from "node:fs";
import path from "node:path";
import {
  answerSituation, FIRST_PAGES, nextSituationQuestion, SERVED_DATE_QUESTION, sideContradiction, sideOf,
  situationAnswers, situationLine, situationOf, SITUATION_FIELD, SITUATION_SECTION, stageChoices, stageFromSituation, stepFromSituation, withKnownCourt, withoutSituationDates, withSituationDates,
  type Situation, type SituationCourt,
} from "../../src/lib/case-system/situation/situation";
import { findStage, pathwayOf } from "../../src/lib/case-system/stage-map/stageMap";
import { sideFromParts } from "../../src/lib/case-system/caseRecord";
import { readCasePosition } from "../../src/lib/case-system/casePosition";
import { remainingEssentialQuestions, reviewEntries } from "../../src/lib/case-system/intakeReview";
import { situationFacts } from "../../app/api/intake/guided-turn/route";
import { dateAnswerCheck } from "../../src/lib/case-system/dates";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) { console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`); failures += 1; }
};

const COURTS: SituationCourt[] = ["small-claims", "civil", "family"];
const sectionsWith = (situation: Situation, extra: Record<string, unknown> = {}) => ({ story: { text: "Synthetic story." }, [SITUATION_SECTION]: { [SITUATION_FIELD]: situation }, ...extra });

type Row = { name: string; situation: Situation; side: "bringing" | "responding"; servedQuestion?: string };
const rowsFor = (court: SituationCourt): Row[] => [
  { name: "starting, nothing filed", situation: { where: "starting", filed: "nothing", court, courtFrom: "choice" }, side: "bringing" },
  { name: "starting, something filed", situation: { where: "starting", filed: "something", court, courtFrom: "choice" }, side: "bringing" },
  { name: "a case going they started", situation: { where: "going", started: "me", court, courtFrom: "choice", stage: "not-sure" }, side: "bringing" },
  ...FIRST_PAGES.filter((page) => page.court === court).map((page) => ({
    name: `served with Form ${page.number}`,
    situation: { where: "served" as const, papers: `${court}-${page.number}`, receivedOn: "2026-10-06", court, courtFrom: "papers" as const },
    side: "responding" as const,
    servedQuestion: SERVED_DATE_QUESTION[`${court}-${page.number}`],
  })),
  { name: "responding to a case going, papers not sure", situation: { where: "going", started: "them", papers: "not-sure", receivedOn: "unknown", court, courtFrom: "choice", stage: "not-sure" }, side: "responding" },
];

let rows = 0;
for (const court of COURTS) {
  for (const row of rowsFor(court)) {
    rows += 1;
    const at = `${court} / ${row.name}`;
    const situation = situationOf(sectionsWith(row.situation));
    check(`${at}: the record reads back as given`, JSON.stringify(situation) === JSON.stringify(row.situation), JSON.stringify(situation));
    check(`${at}: the record is complete`, nextSituationQuestion(situation, court) === null, String(nextSituationQuestion(situation, court)));
    check(`${at}: its side`, sideOf(situation) === row.side);

    // The one side rule: the situation answer wins over the stored intake, the guided facts and a confirmed stage.
    const opposite = row.side === "bringing" ? { role: "defendant" } : { role: "plaintiff" };
    const rule = sideFromParts({ confirmedStage: row.side === "bringing" ? "responding" : "starting-case", intakeData: { extra: { yourRole: opposite.role } }, intakeFacts: opposite, situation });
    check(`${at}: the side rule reads the situation first`, rule?.value === (row.side === "bringing" ? "starting" : "responding") && rule?.source === "situation", JSON.stringify(rule));

    // Each area's answers, and the Small Claims server's facts.
    const answers = situationAnswers(court, situation);
    const role = court === "family" ? (row.side === "bringing" ? "applicant" : "respondent") : row.side === "bringing" ? "plaintiff" : "defendant";
    check(`${at}: the area's side answer`, answers.role === role, String(answers.role));
    if (court === "small-claims") {
      const server = situationFacts(row.situation as Record<string, unknown>);
      check(`${at}: the Small Claims server applies the same side`, server.facts.role === role, JSON.stringify(server.facts));
      check(`${at}: the server counts the side question answered`, server.questionIds.includes("sc-orient-role"));
    }

    // The review never asks what the situation settles.
    const remaining = remainingEssentialQuestions({ version: 1, flowId: "f", courtPath: court, revision: "r", sections: sectionsWith(row.situation) } as never, true).map((question) => question.id);
    const asked = court === "small-claims" ? ["sc-orient-role", ...(answers.claimFiled !== undefined ? ["sc-claim-filed"] : [])] : ["yourRole", ...(answers.documents ? [court === "family" ? "filedDocuments" : "documents"] : []), ...(court === "family" && answers.servedOn ? ["servedDate"] : [])];
    for (const id of asked) check(`${at}: the review does not ask "${id}" again`, !remaining.includes(id), remaining.join(", "));

    // The review shows the side as the person gave it at the start, marked so (never the area's stale copy).
    const entries = reviewEntries({ version: 1, flowId: "f", courtPath: court, revision: "r", sections: sectionsWith(row.situation, court === "family" ? { family: { yourRole: "not-sure" } } : {}) } as never);
    const sideEntry = entries.find((entry) => entry.field === "yourRole");
    const shownRole = court === "small-claims" ? (row.side === "bringing" ? "Plaintiff / claimant" : "Defendant / responding party") : role;
    check(`${at}: the review shows the side given at the start`, sideEntry?.value === shownRole && sideEntry?.fromStart === true, JSON.stringify(sideEntry));
    if (court === "family" && answers.servedOn) {
      const served = entries.find((entry) => entry.field === "servedDate");
      check(`${at}: the review shows the day served from the start`, served?.value === "October 6, 2026" && served?.fromStart === true, JSON.stringify(served));
    }

    // The day they got the papers answers that document's date question.
    const position = readCasePosition({ intakeCheckpoint: { courtPath: court, sections: sectionsWith(row.situation) } }, court);
    if (row.servedQuestion) {
      check(`${at}: the case position counts the day served for ${row.servedQuestion}`, position.dateAnswers[row.servedQuestion] === "2026-10-06", JSON.stringify(position.dateAnswers));
      const onStepPage = readCasePosition({ position: { dateAnswers: { [row.servedQuestion]: "2026-10-07" } }, intakeCheckpoint: { courtPath: court, sections: sectionsWith(row.situation) } }, court);
      check(`${at}: a date given on the step page wins`, onStepPage.dateAnswers[row.servedQuestion] === "2026-10-07");
    } else {
      check(`${at}: no date is counted without one`, Object.keys(position.dateAnswers).length === 0, JSON.stringify(position.dateAnswers));
    }

    // The top line, from the answers only.
    const line = situationLine(situation) ?? "";
    check(`${at}: the top line names the side and the court`, /suing|sued|bringing|responding/.test(line) && (court !== "small-claims" || line.includes("Small Claims Court")), line);
    if (row.servedQuestion) check(`${at}: the top line gives the day served`, line.includes("October 6, 2026"), line);
    const page = FIRST_PAGES.find((item) => `${item.court}-${item.number}` === row.situation.papers);
    if (page) check(`${at}: the top line names the papers by their official title`, line.includes(`${page.title} (Form ${page.number})`), line);

    // The story is a cross-check, never the answer.
    const storySide = row.side === "bringing" ? "responding" : "bringing";
    check(`${at}: a story saying the other side is reported`, sideContradiction(situation, storySide)?.story === storySide);
    check(`${at}: a story saying the same side is not`, sideContradiction(situation, row.side) === null);
  }
}

// The questions, in order, and what a change clears.
{
  let s: Situation = {};
  check("first question: where", nextSituationQuestion(s, "small-claims") === "where");
  s = answerSituation(s, "where", "going");
  check("a case going: did you start it", nextSituationQuestion(s, "small-claims") === "started");
  s = answerSituation(s, "started", "them");
  check("responding: which papers", nextSituationQuestion(s, "small-claims") === "papers");
  s = answerSituation(s, "papers", "small-claims-7A");
  check("then the day received", nextSituationQuestion(s, "small-claims") === "received");
  s = withKnownCourt(answerSituation(s, "received", "2026-10-06"), "small-claims");
  check("the papers' court is the area chosen, then what has happened so far", nextSituationQuestion(s, "small-claims") === "stage" && s.court === "small-claims" && s.courtFrom === "papers", JSON.stringify(s));
  const offered = stageChoices(s);
  check("the stage options are the stage map's own Small Claims steps for the side answered", offered.length > 1 && offered.every((step) => findStage(step.id) && pathwayOf(step) === "small-claims" && (step.side === "defendant" || step.side === "both")), offered.map((step) => step.id).join(", "));
  s = answerSituation(s, "stage", "defendant:defence-filed");
  check("a step chosen completes the record", nextSituationQuestion(s, "small-claims") === null && s.stage === "defendant:defence-filed", JSON.stringify(s));
  check("the step chosen is the step used", stepFromSituation(s, "small-claims") === "defendant:defence-filed" && stepFromSituation(s, "civil") === null);
  check("the top line shows the step chosen, in the map's words", (situationLine(s) ?? "").includes(findStage("defendant:defence-filed")!.userQuestion), String(situationLine(s)));
  check("the area's stage is settled from the step chosen, never asked", situationAnswers("small-claims", s).caseStage === "already-started");
  check("a step on the other side is not kept", answerSituation(s, "stage", "plaintiff:defence-filed").stage === undefined);
  check("changing who started it clears the stage, which is asked again for the new side", answerSituation(s, "started", "me").stage === undefined && nextSituationQuestion(answerSituation(s, "started", "me"), "small-claims") === "stage");
  check("not sure is remembered as an answer", nextSituationQuestion(answerSituation(s, "stage", "not-sure"), "small-claims") === null);
  // Finding 1: "has anything been filed" asked once; "yes" is a case already going they started.
  const filed = withKnownCourt(answerSituation({ where: "starting" }, "filed", "something"), "civil");
  check("something filed when starting: a case already going they started, asked its stage next, and never filed again", filed.where === "going" && filed.started === "me" && !filed.filed && nextSituationQuestion(filed, "civil") === "stage", JSON.stringify(filed));
  check("a case already going: Nothing filed yet is ruled out and a Small Claims claim counts as filed", (situationAnswers("small-claims", filed).excludeDocuments ?? []).includes("nothing") && situationAnswers("small-claims", { ...filed, court: "small-claims" }).claimFiled === true);
  const changed = answerSituation(s, "where", "starting");
  check("changing to starting clears the papers and the day", !changed.papers && !changed.receivedOn && !changed.started);
  check("starting asks whether anything was filed, once", nextSituationQuestion(changed, "small-claims") === "filed");
  const otherCourt = withKnownCourt(answerSituation({ where: "served" }, "papers", "civil-14A"), "small-claims");
  check("papers from another court: the court is asked, never switched", nextSituationQuestion({ ...otherCourt, receivedOn: "2026-10-06" }, "small-claims") === "court" && !otherCourt.court, JSON.stringify(otherCourt));
  check("the chosen area answers the court when nothing else says", withKnownCourt({ where: "starting", filed: "nothing" }, "family").court === "family");
}

// The day received follows the one date rule (dates.ts): asked for its year, one date.
check("the day received: a date without its year is asked", dateAnswerCheck("What day did you get the papers?", "Oct 6", { oneDate: true }) !== null);
check("the day received: a full date is kept", dateAnswerCheck("What day did you get the papers?", "October 6, 2026", { oneDate: true }) === null);
check("a malformed record is dropped, not trusted", JSON.stringify(situationOf(sectionsWith({ where: "elsewhere", papers: "made-up", receivedOn: "2026-02-30" } as never))) === "{}");
check("the person's step-page date wins over the situation's", withSituationDates({ "sc-date-claim-served": "2026-10-07" }, "small-claims", { where: "served", papers: "small-claims-7A", receivedOn: "2026-10-06", court: "small-claims" })["sc-date-claim-served"] === "2026-10-07");

// Gate D (the independent reviewer, step 2): each place it found, held to the same rule.
{
  const served: Situation = { where: "served", papers: "small-claims-7A", receivedOn: "2026-10-06", court: "small-claims", courtFrom: "papers" };
  // 1. The situation's date is never frozen into a saved position: a later Change reaches the deadline.
  const saved = withoutSituationDates({ "sc-date-claim-served": "2026-10-06", "sc-date-claim-issued": "2026-09-01" }, "small-claims", served);
  check("a saved position keeps no copy of the situation's date, and keeps the person's other dates", !("sc-date-claim-served" in saved) && saved["sc-date-claim-issued"] === "2026-09-01", JSON.stringify(saved));
  const changed = readCasePosition({ position: { dateAnswers: saved }, intakeCheckpoint: { courtPath: "small-claims", sections: sectionsWith({ ...served, receivedOn: "2026-10-15" }) } }, "small-claims");
  check("after Change, the new day served is the one counted", changed.dateAnswers["sc-date-claim-served"] === "2026-10-15", JSON.stringify(changed.dateAnswers));
  const own = withoutSituationDates({ "sc-date-claim-served": "2026-10-09" }, "small-claims", served);
  check("a different date the person gave on the step page is theirs and is kept", own["sc-date-claim-served"] === "2026-10-09");

  // 2. Small Claims never asks the day served, or when the claim and which papers were received, again.
  const server = situationFacts(served as Record<string, unknown>);
  check("the Small Claims server counts the day served and the papers received as answered", server.questionIds.includes("sc-date-claim-served") && server.questionIds.includes("sc-defendant-claim-received"), server.questionIds.join(", "));
  const remaining = remainingEssentialQuestions({ version: 1, flowId: "f", courtPath: "small-claims", revision: "r", sections: sectionsWith(served) } as never, true).map((question) => question.id);
  check("the review does not ask the day served or the papers received again", !remaining.includes("sc-date-claim-served") && !remaining.includes("sc-defendant-claim-received"), remaining.join(", "));

  // 3-6. The stage, and "nothing filed", as the situation answers settle them.
  check("served: the stage is responding", situationAnswers("small-claims", served).caseStage === "responding" && stageFromSituation(served)?.stage === "responding");
  check("starting, nothing filed: the stage is starting a case", stageFromSituation({ where: "starting", filed: "nothing" })?.stage === "starting-case");
  check("a case already going settles no stage", stageFromSituation({ where: "going", started: "me" }) === null && situationAnswers("civil", { where: "going", started: "me" }).caseStage === undefined);
  for (const situation of [{ where: "starting", filed: "something" }, served, { where: "going", started: "them", papers: "not-sure", receivedOn: "unknown" }] as Situation[]) {
    check(`"Nothing filed yet" is ruled out once papers exist (${JSON.stringify(situation)})`, (situationAnswers("family", situation).excludeDocuments ?? []).includes("nothing"));
  }
  const familyEntries = reviewEntries({ version: 1, flowId: "f", courtPath: "family", revision: "r", sections: sectionsWith({ where: "starting", filed: "nothing", court: "family" }, { family: { caseStage: "responding", yourRole: "not-sure" } }) } as never);
  const stage = familyEntries.find((entry) => entry.field === "caseStage");
  check("the review shows the stage the situation settles, not a stored one that contradicts it", stage?.value === "starting-case" && stage?.fromStart === true, JSON.stringify(stage));
}

// Every picture traces to the official form list, and exists.
const links = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src/lib/content-library/forms/officialFormLinks.json"), "utf8")) as { forms: { court: string; number: string; title: string; date: string; pdf: string }[] };
for (const page of FIRST_PAGES) {
  const official = links.forms.find((item) => item.court === page.court && item.number === page.number);
  check(`picture ${page.court} ${page.number}: title, date and PDF are the official form's`, Boolean(official) && official!.title === page.title && official!.date === page.date && official!.pdf === page.pdf, JSON.stringify(page));
  check(`picture ${page.court} ${page.number}: the image exists`, fs.existsSync(path.join(process.cwd(), "public", page.image)));
}

if (failures) { console.log(`${failures} check(s) failed across ${rows} situations.`); process.exit(1); }
console.log(`PASS situation: ${rows} situations read the same way at every entry point, in every area`);
