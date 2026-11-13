/**
 * EACH QUESTION WRITES ONLY THE FACT IT ASKS ABOUT (question-to-fact audit, 11 Nov 2026; the family behind Chrome's
 * "the date I gave for working out the deadline replaced 'When it happened'", #545 at dc909096).
 *
 * The audit listed every question and the fact it writes, and found questions that mean something different writing the
 * same fact (a later service as "Day you got the papers"; a defence served as a defence filed; a trial date over "the next
 * court date"; a plaintiff's own service as papers they got) and word patterns giving a question a fact it does not ask
 * about. Properties, so a new question is covered without editing this:
 *   1. every step-page date question (`sc-date-*`, `case-date-*`) that writes a fact is declared below as asking for that
 *      same moment, with the reason; any other writes none;
 *   2. a step-page date question that only fills a wider fact (STEP_DATE_NEVER_REPLACES) never replaces an answer given
 *      elsewhere: "When it happened", and "the next court date" (a motion hearing) against a trial date;
 *   3. the next court date pre-fills the trial-date question only when its words name a trial;
 *   4. a plaintiff's day of serving their own claim is never "Day you got the papers";
 *   5. the word patterns (factOfAskedText): questions that ask something else in similar words write no fact, or the right
 *      one; the questions they exist for still map (controls).
 *
 * WHAT FAILURE THIS CATCHES: an answer to one question replacing, or standing in for, the answer to another.
 *
 * Run: npm run test:question-meanings
 */
import { factOfAskedText, factsOfQuestion } from "../../src/lib/case-system/caseFile/factsOfQuestion";
import { positionFactWrites } from "../../src/lib/case-system/caseFile/factSave";
import { applyFactWrites } from "../../src/lib/case-system/caseFile/factRecord";
import { caseFileOfMaster } from "../../src/lib/case-system/caseFile/caseFileOfMaster";
import * as caseFileModule from "../../src/lib/case-system/caseFile/caseFile";
import { fullDayIn } from "../../src/lib/case-system/casePosition";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

// 1. The step-page date questions that ask for the same moment as a case-file fact, and why. Everything else: no fact.
const SAME_MOMENT: Record<string, { fact: string; why: string }> = {
  "sc-date-claim-served": { fact: "servedDate", why: "the day the person was served with the claim against them" },
  "case-date-served-with-application": { fact: "servedDate", why: "the day the person was served with the Family application" },
  "case-date-served-with-motion-to-change": { fact: "servedDate", why: "the papers that start a motion-to-change case for the person served" },
  "sc-date-settlement-conference": { fact: "conferenceDate", why: "a conference's date, kept with its kind" },
  "case-date-case-conference-date": { fact: "conferenceDate", why: "a conference's date, kept with its kind" },
  "case-date-family-settlement-conference-date": { fact: "conferenceDate", why: "a conference's date, kept with its kind" },
  "case-date-trial-management-conference-date": { fact: "conferenceDate", why: "a conference's date, kept with its kind" },
  "case-date-pre-trial-conference-date": { fact: "conferenceDate", why: "a conference's date, kept with its kind" },
  "sc-date-claim-issued": { fact: "claimIssuedDate", why: "the day the claim was issued" },
  "sc-date-defence-filed": { fact: "defenceFiledDate", why: "the day a defence was filed" },
  "case-date-own-defence-delivered": { fact: "defenceFiledDate", why: "the person's own defence delivered (caseFile.ts SAME_MOMENT)" },
  "case-date-act-or-omission": { fact: "whenHappened", why: "fills it only when nothing else holds it (STEP_DATE_NEVER_REPLACES)" },
  "case-date-trial-date": { fact: "courtDate", why: "fills it only when nothing else holds it (STEP_DATE_NEVER_REPLACES)" },
};
const NEVER_REPLACES = (caseFileModule as { STEP_DATE_NEVER_REPLACES?: ReadonlySet<string> }).STEP_DATE_NEVER_REPLACES ?? new Set<string>();

// Every step-page date question the code knows: the date questions of the stage map's steps, and the id table's.
import { ALL_STAGES } from "../../src/lib/case-system/stage-map/stageMap";
import { DEADLINE_EVENTS } from "../../src/lib/case-system/deadlines/deadlineEvents";
import { FACT_IDS } from "../../src/lib/case-system/caseFile/factRecord";
const stepDateIds = new Set<string>();
const walk = (value: unknown) => {
  if (Array.isArray(value)) value.forEach(walk);
  else if (value && typeof value === "object") for (const [key, inner] of Object.entries(value)) {
    if (typeof inner === "string" && /^(?:sc|case)-date-[a-z0-9-]+$/.test(inner) && /id$/i.test(key)) stepDateIds.add(inner);
    walk(inner);
  }
};
walk(ALL_STAGES);
walk(DEADLINE_EVENTS);
for (const id of ["sc-date-defendants-claim-served", "case-date-served-with-crossclaim", "case-date-served-with-third-party-claim", "case-date-defence-served", ...Object.keys(SAME_MOMENT)]) stepDateIds.add(id);
const FACTS = new Set<string>(FACT_IDS as readonly string[]);
check(`setup: the step-page date questions and the fact ids are read (${stepDateIds.size} questions, ${FACTS.size} facts)`, stepDateIds.size >= 30 && FACTS.size >= 10);
const wrong: string[] = [];
for (const id of [...stepDateIds].sort()) {
  const facts = factsOfQuestion(id).filter((fact) => FACTS.has(fact));
  const declared = SAME_MOMENT[id];
  if (facts.length && !(declared && facts.length === 1 && facts[0] === declared.fact)) wrong.push(`${id} -> ${facts.join(", ")}`);
}
check(`1. every step-page date question writing a fact asks for that same moment (${stepDateIds.size} questions)`, wrong.length === 0, wrong.join("; "));
const widened = Object.entries(SAME_MOMENT).filter(([, entry]) => /STEP_DATE_NEVER_REPLACES/.test(entry.why)).map(([, entry]) => entry.fact);
check("1. the facts a step-page date only fills are guarded (STEP_DATE_NEVER_REPLACES)", widened.every((fact) => NEVER_REPLACES.has(fact)), `guarded: ${[...NEVER_REPLACES].join(", ") || "none"}`);

// 2-4. On the real save path: positionFactWrites -> applyFactWrites (the server) -> caseFileOfMaster (every screen).
const CASE = "00000000-0000-4000-8000-000000000020";
type Court = "small-claims" | "civil" | "family";
const masterWith = (court: Court, sections: Record<string, unknown>) => ({
  courtPath: court,
  intakeCheckpoint: { version: 1 as const, flowId: CASE, courtPath: court, revision: "00000000-0000-4000-8000-000000000021", sections },
});
function stepSave(master: Record<string, unknown>, court: Court, dateAnswers: Record<string, string>) {
  const position = { ...(master.position as Record<string, unknown> | undefined), dateAnswers };
  const changed = { ...master, position };
  const writes = (positionFactWrites as (...args: unknown[]) => ReturnType<typeof positionFactWrites>)({ dateAnswers }, position, changed);
  if (!writes.length) return changed;
  const applied = applyFactWrites(changed, court, CASE, writes, new Date("2026-11-11T12:00:00.000Z"));
  if (!applied.ok) throw new Error(`${court}: the save refused: ${applied.reject}`);
  return applied.master;
}
const hearing = stepSave(masterWith("family", { family: { upcomingCourtDate: "Motion hearing on December 3, 2026" } }), "family", { "case-date-trial-date": "2027-03-03" });
const court = caseFileOfMaster(hearing, "family").courtDate;
check('2. a trial date on the step page never replaces "the next court date" given elsewhere', JSON.stringify(court.value ?? "").includes("December 3, 2026"), JSON.stringify(court));
const alone = caseFileOfMaster(stepSave(masterWith("family", {}), "family", { "case-date-trial-date": "2027-03-03" }), "family").courtDate;
check("2. control: with nothing else held, the trial date fills the next court date", alone.state === "answered" && alone.value === "2027-03-03", JSON.stringify(alone));

const fileWith = (words: string) => {
  const file = caseFileModule.emptyCaseFile();
  file.court = { state: "answered", value: "family", confirmed: true, source: { kind: "answer", question: "situation:court" } };
  file.courtDate = { state: "answered", value: words, confirmed: true, source: { kind: "answer", question: "family:upcomingCourtDate" } };
  return file;
};
const motion = caseFileModule.withCaseFileDates({}, fileWith("Motion hearing on December 3, 2026"), fullDayIn);
check("3. a motion hearing does not pre-fill the trial-date question", !motion["case-date-trial-date"], JSON.stringify(motion));
const trial = caseFileModule.withCaseFileDates({}, fileWith("Trial on March 3, 2027"), fullDayIn);
check("3. control: a court date named as the trial pre-fills it", trial["case-date-trial-date"] === "2027-03-03", JSON.stringify(trial));

const plaintiff = stepSave(masterWith("small-claims", { situation: { record: { where: "starting", filed: "nothing" } } }), "small-claims", { "sc-date-claim-served": "2026-10-05" });
const served = caseFileOfMaster(plaintiff, "small-claims").servedDate;
check('4. a plaintiff\'s day of serving their own claim is not "Day you got the papers"', served.state !== "answered", JSON.stringify(served));
const defendant = stepSave(masterWith("small-claims", { situation: { record: { where: "served" } } }), "small-claims", { "sc-date-claim-served": "2026-10-05" });
const got = caseFileOfMaster(defendant, "small-claims").servedDate;
check("4. control: a defendant's day served is recorded", got.state === "answered" && got.value === "2026-10-05", JSON.stringify(got));

// 5. The word patterns.
const asked: Array<[string, string | null]> = [
  ["How were you served?", null],
  ["How much time has passed since then?", null],
  ["How much was the deposit?", null],
  ["What would you like to know?", null],
  ["What outcome did the tribunal reach?", null],
  ["Who is the defendant's insurer?", null],
  ["Have you filed a Defence?", "defenceFiled"],
  // Controls: the questions the patterns exist for.
  ["What would you like the court to order?", "wants"],
  ["What outcome are you seeking?", "wants"],
  ["How much are you claiming?", "amount"],
  ["How much does he owe you?", "amount"],
  ["When were you served?", "servedDate"],
  ["Have you already started a court case?", "filed"],
  ["Who is the other party?", "otherParty"],
  ["When did this happen?", "whenHappened"],
];
for (const [question, fact] of asked) {
  const got = factOfAskedText(question);
  check(`5. "${question}" -> ${fact ?? "no fact"}`, got === fact, `gives ${got}`);
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nEach question writes only the fact it asks about.");
process.exit(failures ? 1 : 0);
