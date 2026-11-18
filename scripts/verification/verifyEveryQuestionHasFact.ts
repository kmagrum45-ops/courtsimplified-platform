/**
 * Every question the site can ask, by its id, asks for a fact of the case (site owner, 17 Nov 2026: "a build check that
 * fails if any question is not mapped to a fact").
 *
 * WHAT IT CATCHES. A question that names no fact cannot be checked by the one function (caseFile/factStatus.ts), so the
 * site cannot tell it was already answered and asks it again (Chrome milestone pass 2: the Family review's "Timeline" and
 * "Current living situation" were empty boxes after both were given, because neither had a fact). A question added later
 * with no fact fails here at once.
 *
 * WHAT IT READS. Each place questions are defined by id: the Small Claims question bank, the Civil and Family questions
 * one at a time, the Family triage, and every saved answer field (caseFile/fieldFacts.ts FIELD_ROWS). A field marked
 * "no fact id yet" is a question with no fact and fails. The only questions not checked here are those known by their
 * words rather than an id (the AI's questions: factsOfQuestion.ts factOfAskedText reads them), listed below with why.
 *
 * Run: npm run test:every-question-has-fact
 */
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { factsOfQuestion } from "../../src/lib/case-system/caseFile/factsOfQuestion";
import { isFactId } from "../../src/lib/case-system/caseFile/factRecord";
import { FIELD_ROWS } from "../../src/lib/case-system/caseFile/fieldFacts";
import { familyGuidedFields, civilGuidedFields, FAMILY_FILED_OPTIONS, FAMILY_ISSUE_OPTIONS, CIVIL_ISSUE_OPTIONS, CIVIL_DOCUMENT_OPTIONS } from "../../app/builder/_components/guidedFields";
import type { TriageQuestionId } from "../../src/lib/case-system/family/statusTriage";

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed += 1;
}
const factsOf = (id: string, surface?: string) => factsOfQuestion(id, surface).filter(isFactId);

// Every triage question, listed against its type: a new one fails to compile until it is listed here.
const TRIAGE: Record<TriageQuestionId, true> = {
  "married-to-other-party": true, "divorce-sought": true, "cohabitation-dates": true, "child-together": true,
  "case-involves-children": true, municipalities: true, "other-party-municipality": true,
};

/** Saved fields that are not questions with an id: why each is not checked by id. Never a question with no fact. */
const BY_WORDS: Record<string, string> = {
  "home-card.replies": "replies to the home page reading's AI questions, kept by number: each question is read by its words (factOfAskedText), never by an id",
  "guided.depthStateMap": "each claim element's state in the depth questions: elements, not case facts (the site owner's Session 48 decision; selectDepthQuestions.ts)",
};

/**
 * A dated step question ("sc-date-...", "case-date-...") is its own fact: the day is kept under the question's id with the
 * step page's dates (position.dateAnswers), and test:question-meanings decides which of them also fill a case-file fact
 * (a later service is never "Day you got the papers": the question-to-fact audit of 11 Nov).
 */
const STEP_DATE = /^(?:sc|case)-date-/;
check("setup: the step page keeps its dates by question id", FIELD_ROWS.some((row) => row.kind === "keyed" && row.section === "position" && row.field === "dateAnswers"));
const unmapped: string[] = [];
for (const question of QUESTION_BANK) if (!STEP_DATE.test(question.id) && factsOf(question.id).length === 0) unmapped.push(`Small Claims question ${question.id}`);
const options = { issues: [], filed: [], documents: [] };
for (const field of familyGuidedFields({ issues: FAMILY_ISSUE_OPTIONS, filed: FAMILY_FILED_OPTIONS })) if (factsOf(field.key).length === 0) unmapped.push(`Family question ${field.key}`);
for (const field of civilGuidedFields({ issues: CIVIL_ISSUE_OPTIONS, documents: CIVIL_DOCUMENT_OPTIONS })) if (factsOf(field.key).length === 0) unmapped.push(`Civil question ${field.key}`);
void options;
for (const id of Object.keys(TRIAGE)) if (factsOf(id).length === 0) unmapped.push(`Family triage ${id}`);
for (const row of FIELD_ROWS) {
  const key = `${row.section}.${row.field}`;
  if (row.kind === "answer" && factsOf(row.question).length === 0) unmapped.push(`saved answer ${key} (${row.question})`);
  if (row.kind === "none" && /no fact id yet/i.test(row.why) && !BY_WORDS[key]) unmapped.push(`saved answer ${key}: "no fact id yet"`);
}
check(`every question the site asks by id asks for a fact (${unmapped.length} without one)`, unmapped.length === 0, unmapped.join("\n      "));
check("the fields read by words are only the two declared, each with its reason", Object.keys(BY_WORDS).every((key) => FIELD_ROWS.some((row) => `${row.section}.${row.field}` === key)));

// Self-test: the check finds a question with no fact.
check("self-test: a question id with no fact is found", factsOf("a-question-no-one-wrote").length === 0);

console.log(failed ? `\n${failed} check(s) FAILED.` : "\nEvery question asks for a fact.");
process.exit(failed ? 1 : 0);
