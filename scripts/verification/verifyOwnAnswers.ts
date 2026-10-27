/**
 * THE PERSON'S OWN ANSWER WINS, AND NO QUESTION IS DROPPED (Charter re-test, 27 Oct, root cause 2).
 *
 * Checks, as properties, in all three areas:
 *   - an answer given to the story reading's questions on the home page fills the fact its question
 *     asks for (caseFile.ts, factsOfQuestion.ts factOfAskedText), declaration and all: "What you
 *     want" is the person's own answer, not a story sentence;
 *   - so that fact is not asked again: not in the review's remaining questions, not by the chat;
 *   - the other party is a question of its own, asked one at a time in civil and family (it was only
 *     ever recorded by riding along with "What you want" on "Yes", and lost on "No");
 *   - a side change sets the old side's home answers aside, like every other answer about one side;
 *   - "No, nothing yet" at the start settles that no claim is filed or served, over anything the story
 *     seems to say: the Small Claims chat never asks about a Defence or the day it was served (26 Oct
 *     re-test, case 19: the other side's claim in the story opened both).
 *
 * Failure it exists to catch: the review offering "I want to sue the police service…" for What you
 * want after the person had answered with a declaration; the other party never asked after "No,
 * let me answer"; the chat asking "what outcome are you seeking?" once they had said it.
 */
import { alreadyAsked, caseFileOf } from "../../src/lib/case-system/caseFile/caseFile";
import { factOfAskedText } from "../../src/lib/case-system/caseFile/factsOfQuestion";
import { remainingEssentialQuestions } from "../../src/lib/case-system/intakeReview";
import { answeredFactsOf, answeredInStory } from "../../src/lib/case-system/guided-assistant/answeredInStory";
import { onSideChange } from "../../src/lib/case-system/sideChange";
import { civilGuidedFields, familyGuidedFields, CIVIL_ISSUE_OPTIONS, CIVIL_DOCUMENT_OPTIONS, FAMILY_ISSUE_OPTIONS, FAMILY_FILED_OPTIONS } from "../../app/builder/_components/guidedFields";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { situationFacts } from "../../app/api/intake/guided-turn/route";
import { selectQuestions } from "../../src/lib/case-system/intake/selectQuestions";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ID = "00000000-0000-4000-8000-000000000072";
type Court = "civil" | "family" | "small-claims";
const OWN = "A declaration that my Charter rights were violated, and $75,000 in damages";
const STORY = "On June 3, 2025 in Ottawa two officers searched me without a reason. I want to sue the police service and the two officers for violating my Charter rights and for the injury.";

const checkpoint = (court: Court, sections: Record<string, unknown>): Checkpoint => ({
  version: 1, flowId: ID, courtPath: court, revision: ID,
  sections: { story: { text: STORY }, situation: { record: { where: "starting", filed: "nothing", court } }, ...sections },
}) as Checkpoint;
const homeAnswer = (question: string, answer: string) => ({ home: { understoodAnswers: [{ question, answer }] } });

// Which fact a question asks for, from its words.
for (const [question, fact] of [
  ["What would you like the court to order?", "wants"],
  ["What outcome are you seeking?", "wants"],
  ["How much money are you claiming?", "amount"],
  ["Who exactly do you want to sue?", "otherParty"],
  ["When were you served?", "servedDate"],
  ["Is anyone else involved?", null],
] as const) check(`"${question}" asks for ${fact ?? "no fact this reads"}`, factOfAskedText(question) === fact, String(factOfAskedText(question)));

for (const court of ["civil", "family", "small-claims"] as const) {
  const stored = checkpoint(court, homeAnswer("What would you like the court to order?", OWN));
  const file = caseFileOf(stored);
  check(`${court}: the home answer is what they want, declaration included`, file.wants.state === "answered" && String(file.wants.value).includes("declaration"), JSON.stringify(file.wants));
  check(`${court}: the question for it counts as asked`, alreadyAsked(file, court === "family" ? "goal" : court === "civil" ? "legalRemedy" : "sc-remedy-sought"));
  const remaining = remainingEssentialQuestions(stored).map((question) => question.id);
  check(`${court}: the review does not ask it again`, !remaining.some((id) => ["goal", "legalRemedy", "sc-remedy-sought", "remedySought"].includes(id)), remaining.join(", "));
  const facts = answeredFactsOf({ masterResult: { intakeCheckpoint: stored } });
  check(`${court}: the chat does not ask it again`, answeredInStory("What outcome are you seeking?", "", facts));
}
// Without the home answer it is still asked (control).
const without = remainingEssentialQuestions(checkpoint("civil", {})).map((question) => question.id);
check("without an answer, the review still asks what they want", without.includes("legalRemedy"), without.join(", "));

// The other party: a question of its own.
const civil = civilGuidedFields({ issues: CIVIL_ISSUE_OPTIONS, documents: CIVIL_DOCUMENT_OPTIONS });
const family = familyGuidedFields({ issues: FAMILY_ISSUE_OPTIONS, filed: FAMILY_FILED_OPTIONS });
check("civil asks for the other party on its own", civil.find((field) => field.key === "otherParty")?.initial === true);
check("family asks for the other party on its own", family.find((field) => field.key === "otherParty")?.initial === true);

// A side change sets the old side's home answers aside.
const before = checkpoint("civil", { ...homeAnswer("What would you like the court to order?", OWN), situation: { record: { where: "starting", filed: "nothing", court: "civil" } } }).sections;
const after = { ...before, situation: { record: { where: "served", papers: "civil-14A", receivedOn: "unknown", court: "civil" } } };
const changed = onSideChange(before, after);
const kept = (changed.sections.home as { understoodAnswers?: unknown[] } | undefined)?.understoodAnswers ?? [];
check("a side change sets the old side's 'what you want' from the home page aside", kept.length === 0, JSON.stringify(kept));

{
  const fixed = situationFacts({ where: "starting", filed: "nothing", court: "small-claims", started: "me" });
  // The story's reading may say a claim was served (the other side's); the start answer wins, as the route merges it.
  const facts = { role: "plaintiff", claimFiled: true, claimServed: true, ...fixed.facts } as Parameters<typeof selectQuestions>[0];
  const asked = selectQuestions(facts, fixed.questionIds);
  const served = asked.filter((id) => ["sc-defence-filed", "sc-date-claim-served", "sc-date-claim-issued", "sc-defence-time-elapsed", "sc-defendant-noted-in-default"].includes(id));
  check("'No, nothing yet': no Defence or served-date question, whatever the story says", served.length === 0 && fixed.facts.claimServed === false && fixed.facts.claimFiled === false, served.join(", ") || JSON.stringify(fixed.facts));
  const filed = situationFacts({ where: "starting", filed: "something", court: "small-claims", started: "me" });
  check("'Yes, something was filed' leaves served open, to be asked", filed.facts.claimFiled === true && filed.facts.claimServed === undefined, JSON.stringify(filed.facts));
}

console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
process.exitCode = failures ? 1 : 0;
