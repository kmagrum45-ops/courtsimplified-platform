/**
 * WHERE THE CASE IS, WHO THE PERSON IS IN IT, WHAT IS FILED: WORDS, NEVER CODES (26 Oct re-test, item 2).
 *
 * Checks, as properties, through the one place each screen gets these words (copy/caseWords.ts) and
 * the review's entries (intakeReview.ts):
 *   - every stage the site stores reads as words, never its code ("responding", "starting case");
 *   - every document a person can record reads as its form's name, never the code
 *     ("application", "answer");
 *   - a family case already going shows the person's own start answer ("I started this case
 *     (applicant)"), never "you started, or plan to start";
 *   - the review's "Case stage" for someone served, and Small Claims' role, show words, not codes;
 *   - "What to confirm next" never asks "Has anything already been filed?" or about court dates once
 *     the stage says where the case is, a case already going included (case 16's saved conference);
 *     the overview gets that from the one rule in answeredQuestions.ts.
 *
 * Failure it exists to catch: "Current stage: responding", "Documents already recorded:
 * application, answer", "Role: plaintiff" in a text box, "Case stage: responding" in the review.
 */
import { documentInWords, roleInWords, stageInWords } from "../../src/lib/case-system/copy/caseWords";
import { reviewEntries } from "../../src/lib/case-system/intakeReview";
import { situationAnswers, situationFromRaw } from "../../src/lib/case-system/situation/situation";
import { FAMILY_FILED_OPTIONS, CIVIL_DOCUMENT_OPTIONS } from "../../app/builder/_components/guidedFields";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { withoutStageAnswered } from "../../src/lib/case-system/intelligence/answeredQuestions";
import fs from "node:fs";
import path from "node:path";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ID = "00000000-0000-4000-8000-000000000026";

const STAGES = ["starting-case", "responding", "already-started", "conference", "motion", "trial", "enforcement", "urgent", "not-sure"];
const coded = STAGES.filter((stage) => { const words = stageInWords(stage); return words === stage || words === stage.replace(/-/g, " ") || /^[a-z]/.test(words); });
check("every stored stage reads as words, never its code", coded.length === 0, coded.map((stage) => `${stage} -> ${stageInWords(stage)}`).join("; "));

const documents = [...FAMILY_FILED_OPTIONS, ...CIVIL_DOCUMENT_OPTIONS].map((option) => option.value).filter((value) => value !== "nothing");
const codedDocs = documents.filter((code) => { const words = documentInWords(code); return words === code || words === code.replace(/-/g, " ") || /^[a-z]/.test(words); });
check("every document a person can record reads as its form's name", codedDocs.length === 0, codedDocs.map((code) => `${code} -> ${documentInWords(code)}`).join("; "));
check("'application' and 'answer' by name", !/^application$|^answer$/.test(documentInWords("application")) && !/^answer$/.test(documentInWords("answer")), `${documentInWords("application")} | ${documentInWords("answer")}`);

const going = situationAnswers("family", situationFromRaw({ where: "going", started: "me", court: "family", stage: "not-sure" }));
check("a family case already going shows the person's own start answer", roleInWords("applicant", going.roleWords) === "I started this case (applicant)" && !/plan to start/.test(roleInWords("applicant", going.roleWords)), roleInWords("applicant", going.roleWords));
check("without a start answer, the side in words", /^Applicant/.test(roleInWords("applicant")) && roleInWords("not-sure") === "");

const checkpoint = (court: "family" | "civil" | "small-claims", sections: Record<string, unknown>): Checkpoint => ({ version: 1, flowId: ID, courtPath: court, revision: ID, sections: { story: { text: "Synthetic story." }, ...sections } }) as Checkpoint;
const served = reviewEntries(checkpoint("family", { situation: { record: { where: "served", papers: "family-8", receivedOn: "unknown", court: "family", stage: "just-served" } } }));
const stage = served.find((entry) => entry.field === "caseStage");
const stageShown = stage ? (stage.choices?.find((choice) => choice.value === stage.value)?.label ?? String(stage.value)) : "";
check("the review's case stage for someone served is words", Boolean(stage) && stageShown !== "responding" && /^[A-Z]/.test(stageShown), stageShown || "(no entry)");
const scRole = reviewEntries(checkpoint("small-claims", { "small-claims": { input: { yourRole: "plaintiff", facts: "Synthetic story." } } })).find((entry) => entry.field === "yourRole");
const roleShown = scRole ? (scRole.choices?.find((choice) => choice.value === scRole.value)?.label ?? String(scRole.value)) : "";
check("Small Claims' role in the review is the form's words, not a code in a box", Boolean(scRole) && roleShown === "Plaintiff / claimant", roleShown || "(no entry)");

const GENERIC = ["Has anything already been filed?", "Are there court dates, limitation dates, or urgent deadlines?", "Has the defendant filed a Defence?"];
for (const [stage, step] of [["conference", "Case conference scheduled"], ["already-started", null], ["trial", null], ["motion", null], ["responding", null], ["starting-case", null], [null, "Case conference scheduled"]] as const) {
  const left = withoutStageAnswered(GENERIC, stage, step);
  check(`a known stage (${stage ?? "none"}${step ? `, step "${step}"` : ""}) answers the filed and court-date questions`, !left.some((question) => /^Has anything already been|^Are there court dates/.test(question)) && left.includes("Has the defendant filed a Defence?"), left.join(" | "));
}
for (const stage of ["not-sure", "urgent", null] as const) check(`"${stage ?? "no stage"}" does not: the questions stay`, withoutStageAnswered(GENERIC, stage).length === GENERIC.length);
const overview = fs.readFileSync(path.join(path.resolve(import.meta.dirname, "..", ".."), "app/builder/_components/IntelligenceOverviewPanel.tsx"), "utf8");
check("the overview uses the one rule, with the step's words", /withoutStageAnswered\(candidateQuestions, caseStage, stageWords\)/.test(overview) && !/STAGE_ANSWERS/.test(overview));

console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
process.exitCode = failures ? 1 : 0;
