/**
 * THE CHROME CHECK OF #545 AT 7bce410 (9 Nov 2026), THE RULES BEHIND EACH FIX, IN ALL THREE COURTS WHERE THEY APPLY.
 *
 *   B1 (3.5): Form 8A, the Application (Divorce), is in no list of a step's forms for someone who recorded they were never
 *      married: the card's forms, "Forms for your next step", the catalogue's "For your step" tag (leadForms), the folded
 *      forms, and the forms named in a step's text. One rule (isDivorceApplication) on one reader (caseFile.ts
 *      neverMarried). Chrome: the Forms tab tagged "FORM 8A ... For your step" while the page said "You said you were not
 *      married". Civil and Small Claims Form 8A (other forms of the same number) are never touched.
 *   B2 (3.4d): a municipality the person recorded (the Home page's "City or municipality") is never asked again; the other
 *      person's municipality is its own question, asked once.
 *   B6 (note 5): a deadline counted from a date read from the person's story says "Based on the date in your story";
 *      one counted from a date they gave keeps "Based on the date you gave us". The date is the same either way.
 *   B7 (1.6c): the printable case file shows the amount and the other party from the case file, nothing when not recorded.
 *   B8 (note 2): the case's title is saved by the one writer whenever the other party is (factRecord.ts applyFactWrites);
 *      the dashboard reads that saved title, never the answers' raw copy.
 *
 *   B4 (note 1): the builder never saves the merged record inside intakeData (each save nested the last; staging rows
 *      reached 4.6 MB and the case pages froze reading them).
 *
 * WHAT FAILURE THIS CATCHES: one screen fixed and its twin not; a worked-out date passed off as one the person gave; a
 * list of cases titled from a stale copy.
 *
 * Run: npm run test:chrome-545-round
 */
import fs from "node:fs";
import { isDivorceApplication, practicalFor, withoutDivorceApplication, STEP_PRACTICAL } from "../../src/lib/content-library/nextStepPractical";
import { emptyStatusRecord, selectNextTriageQuestion } from "../../src/lib/case-system/family/statusTriage";
import { caseDatesFrom, caseDatesWithStory } from "../../src/lib/case-system/deadlines/deadlineEvents";
import { computedDeadlinesFor } from "../../src/lib/content-library/computedDeadline";
import { findStage } from "../../src/lib/case-system/stage-map/stageMap";
import { applyFactWrites } from "../../src/lib/case-system/caseFile/factRecord";
import { CASE_FILE_SECTION, emptyCaseFile, neverMarried } from "../../src/lib/case-system/caseFile/caseFile";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const read = (file: string) => fs.readFileSync(file, "utf8");

// ---- B1 ----
const familyStart = Object.keys(STEP_PRACTICAL).find((id) => id.startsWith("family:") && STEP_PRACTICAL[id].forms.some((form) => /(^|:)8A$/.test(form)))!;
const plain = practicalFor(familyStart, "family");
check("B1. setup: a Family starting step lists Form 8A, tagged \"For your step\", when nothing says otherwise", Boolean(plain?.forms.some(isDivorceApplication)) && Boolean(plain?.leadForms.some((lead) => lead.number === "8A")), String(familyStart));
const filtered = withoutDivorceApplication(plain, true);
check("B1. the Forms tab's filter leaves 8A out of the forms list", !filtered?.forms.some(isDivorceApplication));
check("B1. ... and out of the catalogue's \"For your step\" tag (leadForms; Chrome 3.5)", !filtered?.leadForms.some((lead) => lead.number === "8A"), JSON.stringify(filtered?.leadForms));
check("B1. ... and out of the folded forms", !filtered?.formsIfClaimed.some(isDivorceApplication));
const card = practicalFor(familyStart, "family", "", false, "", "", { notMarried: true });
check("B1. the card's own rule gives the same lists as the Forms tab's", JSON.stringify(card?.leadForms) === JSON.stringify(filtered?.leadForms) && JSON.stringify(card?.forms) === JSON.stringify(filtered?.forms));
const civilWith8A = Object.keys(STEP_PRACTICAL).find((id) => !id.startsWith("family:") && STEP_PRACTICAL[id].forms.includes("8A"));
if (civilWith8A) {
  const court = civilWith8A.startsWith("civil:") ? "civil" : "small-claims";
  const view = practicalFor(civilWith8A, court as never);
  check(`B1. another court's Form 8A is never left out (${civilWith8A})`, JSON.stringify(withoutDivorceApplication(view, true)?.leadForms) === JSON.stringify(view?.leadForms));
}
const married = (value: boolean) => ({ ...emptyCaseFile(), married: { state: "answered" as const, value, source: { kind: "answer" as const, question: "q" }, confirmed: true } });
check("B1. one reader: neverMarried is true only for a recorded No", neverMarried(married(false) as never) && !neverMarried(married(true) as never) && !neverMarried(emptyCaseFile()));
const named = read("app/_components/FormsNamedHere.tsx");
check("B1. the forms named in a step's text follow the same rule", /notMarried && isDivorceApplication\(/.test(named));
for (const [file, call] of [["app/builder/_components/StageAnswerPanel.tsx", "heading=\"Forms for this step\" notMarried={notMarried}"], ["app/cases/[id]/forms/page.tsx", "heading=\"Named in your next step\" userWords={userWords} notMarried={notMarried}"], ["app/builder/_components/NextStepsCard.tsx", "notMarried={notMarried}"]] as const) {
  check(`B1. ${file} passes the record's answer to the forms named in its step`, read(file).includes(call));
}
for (const file of ["app/builder/page.tsx", "app/cases/[id]/page.tsx", "app/cases/[id]/forms/page.tsx"]) {
  check(`B1. ${file} reads "never married" through neverMarried, never its own copy`, /neverMarried\(/.test(read(file)) && !/married\.value === false/.test(read(file)));
}

// ---- B2 ----
const settled = { ...emptyStatusRecord(), marriedToOtherParty: "no" as const, cohabitationStart: "2018", cohabitationEnd: "2025", haveChildTogether: "yes" as const, caseInvolvesChildren: "yes" as const };
check("B2. nothing recorded: both municipalities are asked together", selectNextTriageQuestion(settled)?.id === "municipalities");
check("B2. the person's municipality recorded: only the other person's is asked", selectNextTriageQuestion({ ...settled, userMunicipality: "Ottawa" })?.id === "other-party-municipality", String(selectNextTriageQuestion({ ...settled, userMunicipality: "Ottawa" })?.id));
check("B2. the other person's asked once: recorded or not known, it is not asked again", selectNextTriageQuestion({ ...settled, userMunicipality: "Ottawa", otherPartyMunicipality: "not-yet" }) === null);
check("B2. the card reads the Home city as the person's municipality, over its own record", /fromFile\.userMunicipality === null && homeCity\.trim\(\)/.test(read("app/builder/_components/FamilyStatusTriage.tsx")));

// ---- B6 ----
const stage = findStage("civil:plaintiff:claim-drafted-not-issued");
const answers = { "case-date-act-or-omission": "2026-03-01" };
const fromStory = computedDeadlinesFor(stage?.deadlines ?? [], caseDatesWithStory(answers, ["case-date-act-or-omission"]), "test").map((entry) => entry.statement).join(" ");
const given = computedDeadlinesFor(stage?.deadlines ?? [], caseDatesFrom(answers), "test").map((entry) => entry.statement).join(" ");
check("B6. a date from the story: \"Based on the date in your story\"", /Based on the date in your story/.test(fromStory) && !/the date you gave us/.test(fromStory), fromStory);
check("B6. a date the person gave: \"Based on the date you gave us\", as before", /Based on the date you gave us/.test(given) && !/in your story/.test(given), given);
check("B6. the date counted is the same either way", fromStory.replace(/in your story/g, "") === given.replace(/you gave us/g, ""));
check("B6. the step card sends which dates came from the story", /datesFromStory: storyDateIds\(/.test(read("app/builder/_components/StageAnswerPanel.tsx")));
check("B6. the card's route, the case file and the workspace mark them", /caseDatesWithStory\(answers, fromStory\)/.test(read("app/api/case/stage-answer/route.ts")) && /datesFromStory: position\.datesFromStory/.test(read("app/cases/[id]/case-file/page.tsx")) && /caseDatesWithStory\(/.test(read("app/api/workspace/organisation/route.ts")));

// ---- B7 ----
const caseFilePage = read("app/cases/[id]/case-file/page.tsx");
check("B7. the case file page reads the amount and the other party from the case file", /caseFileOfMaster\(caseRecord\.master_result, courtPath\)/.test(caseFilePage) && /data-testid="case-file-amount"/.test(caseFilePage) && /fileWords\("otherParty"\)/.test(caseFilePage));

// ---- B8 ----
const CASE = "00000000-0000-4000-8000-000000000003";
const cp = { version: 1 as const, flowId: CASE, courtPath: "small-claims", revision: "00000000-0000-4000-8000-000000000004", sections: { [CASE_FILE_SECTION]: {} } };
const named1 = applyFactWrites({ intakeCheckpoint: cp }, "small-claims", CASE, [{ fact: "otherParty", state: "answered", value: "Alex Testwood", source: "person", question: "change" }], new Date());
check("B8. saving the other party saves the case's title with it", named1.ok && (named1.master as Record<string, unknown>).caseTitle === "Your case with Alex Testwood", JSON.stringify(named1.ok && (named1.master as Record<string, unknown>).caseTitle));
const removed = named1.ok ? applyFactWrites(named1.master, "small-claims", CASE, [{ fact: "otherParty", state: "removed", source: "person", question: "change", seenSeq: named1.saved[0].seq }], new Date()) : null;
check("B8. removing it saves the court's title", Boolean(removed?.ok) && typeof (removed as { master: Record<string, unknown> }).master.caseTitle === "string" && !String((removed as { master: Record<string, unknown> }).master.caseTitle).includes("Alex"));
const dashboard = read("app/dashboard/page.tsx");
check("B8. the dashboard reads the saved title, never the raw other party", dashboard.includes("caseTitle:master_result->>caseTitle") && !dashboard.includes("master_result->intakeData->otherParty"));

// ---- B4 ----
const builder = read("app/builder/page.tsx");
check("B4. the builder saves intakeData without the merged record (masterResultPatch), so a save never nests the last", /intakeData: \(\(\{ masterResultPatch: _nested, \.\.\.rest \}\) =>/.test(builder) && !/intakeData: caseData,/.test(builder));

console.log(failures ? `\n${failures} check(s) failed.` : "\nEach fix of the Chrome check of #545 holds on every screen it names.");
process.exit(failures ? 1 : 0);
