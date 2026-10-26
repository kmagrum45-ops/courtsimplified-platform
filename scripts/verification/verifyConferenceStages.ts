/**
 * EVERY CONFERENCE STAGE, CARRIED EXACTLY (conference audit, 2026-10-26).
 *
 * Checks, as properties, for every conference step in all three areas (family case, settlement and
 * trial management conference; civil mediation, case management and pre-trial; Small Claims
 * settlement and trial management conference):
 *   - picked at the start, the step is carried by its own title everywhere that says where the case
 *     is: the intake forms' "Case stage" box, the case pages and dashboard (caseStageWords), the
 *     case's step (caseStepFor) and the facts the chat reads (caseFactsText). Never a generic
 *     "conference", never "Starting a new case";
 *   - a respondent who was served is asked what has happened since, and their answer is the
 *     step (case 16 as a respondent: a family case conference on November 16);
 *   - a conference date keeps which conference it is, is shown under that name, and answers only
 *     that conference's date question;
 *   - the site owner's decisions ("show less rather than invent"): no "after the case conference
 *     comes a settlement conference"; no documents-to-bring list for a family case conference or
 *     trial management conference; civil case management shows its name and a rule link only;
 *     no form named for the civil pre-trial brief; no deadline or form for the Small Claims trial
 *     management conference.
 *
 * Failure it exists to catch: a conference collapsing to "conference" (or to "Starting a new case")
 * after the person named it, a served respondent never asked, a trial management conference's day
 * answering the case conference question, and wording returning that the rules do not support.
 */
import fs from "node:fs";
import path from "node:path";
import { findStage } from "../../src/lib/case-system/stage-map/stageMap";
import { STAGE_MOVES, FINAL_STEPS } from "../../src/lib/case-system/stage-map/stageSequence";
import { stageRulesText } from "../../src/lib/content-library/stageRules";
import { practicalFor } from "../../src/lib/content-library/nextStepPractical";
import {
  JUST_SERVED,
  nextSituationQuestion,
  situationAnswers,
  situationFromRaw,
  situationSection,
  stageChoices,
  stageWords,
  stepFromSituation,
  type Situation,
} from "../../src/lib/case-system/situation/situation";
import { caseStageWords, caseStepFor } from "../../src/lib/case-system/caseStep";
import { caseFactsText, readCaseRecord } from "../../src/lib/case-system/caseRecord";
import { caseFileOf, conferenceKind, withCaseFileDates } from "../../src/lib/case-system/caseFile/caseFile";
import { fullDayIn } from "../../src/lib/case-system/casePosition";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const ID = "00000000-0000-4000-8000-000000000016";
type Court = "family" | "civil" | "small-claims";

const CONFERENCES: { court: Court; step: string }[] = [
  { court: "family", step: "family:both:case-conference-scheduled" },
  { court: "family", step: "family:both:settlement-conference-scheduled" },
  { court: "family", step: "family:both:trial-management-conference-scheduled" },
  { court: "civil", step: "civil:both:mandatory-mediation" },
  { court: "civil", step: "civil:both:case-management" },
  { court: "civil", step: "civil:both:pretrial-scheduled" },
  { court: "small-claims", step: "plaintiff:awaiting-settlement-conference" },
  { court: "small-claims", step: "defendant:awaiting-settlement-conference" },
  { court: "small-claims", step: "both:missed-settlement-conference" },
  { court: "small-claims", step: "both:trial-management-conference" },
];

const checkpoint = (court: Court, situation: Situation): Checkpoint => ({ version: 1, flowId: ID, courtPath: court, revision: ID, sections: { story: { text: "Synthetic story." }, ...situationSection(situation) } }) as Checkpoint;
const masterOf = (court: Court, situation: Situation, extra: Record<string, unknown> = {}) => ({ courtPath: court, intakeCheckpoint: checkpoint(court, situation), ...extra });
const stepTitle = (id: string) => findStage(id)?.title;

// 1. Each conference step, picked at the start (a case already going, on the side the step is for).
for (const { court, step } of CONFERENCES) {
  const stage = findStage(step);
  if (!stage) { check(`${step}: is on the map`, false); continue; }
  const started = /^(?:[a-z-]+:)?(?:defendant|respondent):/.test(step) ? "them" : "me";
  const situation = situationFromRaw({ where: "going", started, court, stage: step });
  const answers = situationAnswers(court, situation);
  const words = stageWords(answers);
  check(`${court} / ${stage.title}: the start answers keep the step`, stepFromSituation(situation, court) === step, `got ${stepFromSituation(situation, court)}`);
  check(`${court} / ${stage.title}: the "Case stage" box says the step by its own title`, words === stage.title, `got ${words}`);
  const master = masterOf(court, situation);
  check(`${court} / ${stage.title}: the case pages and dashboard say it by its title`, caseStageWords(master, court) === stage.title, `got ${caseStageWords(master, court)}`);
  check(`${court} / ${stage.title}: it is the case's step`, caseStepFor(master, court, started === "them", { requireConfirmedStage: true }) === step);
  const facts = caseFactsText(readCaseRecord(master, court), { stepTitle });
  check(`${court} / ${stage.title}: the chat's case facts name the step`, facts.includes(`Their exact step: ${stage.title}`), facts);
}

// 2. No "Case stage" wording collapses: every stage word for a picked step is the step's title.
const generic = CONFERENCES.filter(({ court, step }) => {
  const started = /^(?:[a-z-]+:)?(?:defendant|respondent):/.test(step) ? "them" : "me";
  const words = stageWords(situationAnswers(court, situationFromRaw({ where: "going", started, court, stage: step })));
  return !words || /^(?:conference|Conference stage|Starting a new case)$/i.test(words);
});
check("no picked conference step reads as a generic \"conference\" or \"Starting a new case\"", generic.length === 0, generic.map((entry) => entry.step).join(", "));
for (const name of ["FamilyIntake", "CivilIntake", "SmallClaimsIntake"]) {
  const text = fs.readFileSync(path.join(ROOT, "app/builder/_components", `${name}.tsx`), "utf8");
  check(`${name}: the "Case stage" box uses the one stage wording`, text.includes("{stageWords(fromStart)}") && !/: "Starting a new case"\}/.test(text));
}

// 3. Case 16 as a respondent: served with a family application, a case conference set since.
const served = situationFromRaw({ where: "served", papers: "family-8", receivedOn: "2026-09-01", court: "family", courtFrom: "papers" });
check("case 16 (respondent): what has happened since service is asked", nextSituationQuestion(served, null) === "stage", `asked ${nextSituationQuestion(served, null)}`);
check("case 16 (respondent): every family conference is offered", ["family:both:case-conference-scheduled", "family:both:settlement-conference-scheduled", "family:both:trial-management-conference-scheduled"].every((id) => stageChoices(served).some((step) => step.id === id)));
const case16 = situationFromRaw({ ...served, stage: "family:both:case-conference-scheduled" });
check("case 16 (respondent): the answer is kept", case16.stage === "family:both:case-conference-scheduled" && nextSituationQuestion(case16, null) !== "stage");
const case16Master = masterOf("family", case16, { position: { dateAnswers: { "case-date-case-conference-date": "2026-11-16" } } });
check("case 16 (respondent): the case is at the case conference", caseStepFor(case16Master, "family", true) === "family:both:case-conference-scheduled" && caseStageWords(case16Master, "family") === "Case conference scheduled", `${caseStepFor(case16Master, "family", true)} / ${caseStageWords(case16Master, "family")}`);
check("case 16 (respondent): still on the responding side", situationAnswers("family", case16).role === "respondent");
const case16File = caseFileOf(checkpoint("family", case16), case16Master);
check("case 16 (respondent): the case file holds the step as the stage", case16File.stage.value === "family:both:case-conference-scheduled", String(case16File.stage.value));
check("case 16 (respondent): the date is the case conference's, November 16", conferenceKind(case16File.conferenceDate) === "Case conference" && case16File.conferenceDate.value === "2026-11-16", `${conferenceKind(case16File.conferenceDate)} ${case16File.conferenceDate.value}`);
const justServed = situationFromRaw({ ...served, stage: JUST_SERVED });
check("served, nothing else yet: kept, and the side's first step stands", justServed.stage === JUST_SERVED && nextSituationQuestion(justServed, null) !== "stage" && stepFromSituation(justServed, "family") === null && situationAnswers("family", justServed).caseStage === "responding");
check("\"just served\" is only an answer for someone served", situationFromRaw({ where: "going", started: "me", court: "family", stage: JUST_SERVED }).stage === undefined);

// 4. A conference date keeps its kind, and answers only its own conference's question.
const DATES: { id: string; kind: string; court: Court }[] = [
  { id: "case-date-case-conference-date", kind: "Case conference", court: "family" },
  { id: "case-date-family-settlement-conference-date", kind: "Settlement conference", court: "family" },
  { id: "case-date-trial-management-conference-date", kind: "Trial management conference", court: "family" },
  { id: "case-date-pre-trial-conference-date", kind: "Pre-trial conference", court: "civil" },
  { id: "sc-date-settlement-conference", kind: "Settlement conference", court: "small-claims" },
];
for (const { id, kind, court } of DATES) {
  const file = caseFileOf(checkpoint(court, {}), { courtPath: court, position: { dateAnswers: { [id]: "2026-11-16" } } });
  check(`${id}: the date is the conference date, named "${kind}"`, file.conferenceDate.value === "2026-11-16" && conferenceKind(file.conferenceDate) === kind, `${file.conferenceDate.value} ${conferenceKind(file.conferenceDate)}`);
  const placed = withCaseFileDates({}, file, fullDayIn);
  const others = DATES.filter((other) => other.kind !== kind && placed[other.id]).map((other) => other.id);
  check(`${id}: the day answers no other conference's question`, others.length === 0, others.join(", "));
}
// Family's "Next court date", answered with a conference (case 16's story): the conference date, by its kind.
const withNext = (words: string) => caseFileOf({ ...checkpoint("family", {}), sections: { story: { text: "Synthetic story." }, family: { upcomingCourtDate: words } } } as Checkpoint, { courtPath: "family" });
const nextConference = withNext("Case conference on November 16, 2026");
check("a next court date that names a conference is the conference date, by its kind", nextConference.conferenceDate.state === "answered" && conferenceKind(nextConference.conferenceDate) === "Case conference" && nextConference.courtDate.state === "not-asked", `${nextConference.conferenceDate.state} ${conferenceKind(nextConference.conferenceDate)} / court date ${nextConference.courtDate.state}`);
check("its day answers the case conference question", withCaseFileDates({}, nextConference, fullDayIn)["case-date-case-conference-date"] === "2026-11-16");
const nextTrial = withNext("Trial on March 3, 2027");
check("a next court date that is no conference stays the court date", nextTrial.courtDate.state === "answered" && nextTrial.conferenceDate.state === "not-asked");
const panel = fs.readFileSync(path.join(ROOT, "app/cases/_components/CaseFilePanel.tsx"), "utf8");
check("\"What we have so far\" names the conference a date is for", /fact === "conferenceDate" \? conferenceKind\(slot\)/.test(panel));

// 5. The site owner's decisions (2026-10-25: show less rather than invent).
const familyMove = STAGE_MOVES.find((move) => move.from === "family:both:case-conference-scheduled" && move.to === "family:both:settlement-conference-scheduled");
check("no order is stated between the family case conference and a settlement conference", Boolean(familyMove) && !/after the case conference comes/i.test(familyMove!.when) && /may come later/i.test(familyMove!.when), familyMove?.when);
for (const id of ["family:both:case-conference-scheduled", "family:both:trial-management-conference-scheduled"]) {
  const stage = findStage(id)!;
  const words = stage.deadlines.map((deadline) => `${deadline.what} ${deadline.qualifier ?? ""}`).join(" ");
  check(`${stage.title}: no documents-to-bring list`, !/\bbring\b[^.]{0,40}\bto the conference\b/i.test(words));
}
const management = findStage("civil:both:case-management");
const managementText = management ? stageRulesText(management) : null;
check("civil case management: its name and a link to the rule, nothing more", Boolean(management) && management!.rulesLinkOnly === true && management!.deadlines.length === 0 && Boolean(managementText?.rules) && !managementText!.rules!.includes("“") && /r\. 77/.test(managementText!.rules!));
check("civil case management: no form, fee or filing", practicalFor("civil:both:case-management", "civil") === null);
check("civil case management: its gap is said, not filled", FINAL_STEPS.some((entry) => entry.stage === "civil:both:case-management" && /not covered yet/.test(entry.why)) && !STAGE_MOVES.some((move) => move.from === "civil:both:case-management"));
const brief = findStage("civil:both:pretrial-scheduled")?.deadlines.find((deadline) => deadline.id === "deadline:civil:pretrial-brief-5-days");
check("civil pre-trial brief: no form named for it; check the notice or order", Boolean(brief) && !/brief[^.]*\(Form \d/i.test(brief!.what) && /check the notice of the pre-trial conference or the court's order/.test(brief!.qualifier ?? ""));
const scTmc = findStage("both:trial-management-conference");
check("Small Claims trial management conference: no deadline and no form", Boolean(scTmc) && scTmc!.deadlines.length === 0 && practicalFor("both:trial-management-conference", "small-claims") === null);

console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
process.exitCode = failures ? 1 : 0;
