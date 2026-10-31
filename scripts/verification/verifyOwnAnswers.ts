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
 *     re-test, case 19: the other side's claim in the story opened both);
 *   - a Small Claims step picked for a case already going settles what the stage map puts before it:
 *     no "has it been served?" at the settlement conference, no "have you filed a Defence?" once the
 *     Defence is filed (fresh reviewer, 26 Oct); a motion or an offer, which can come at any time,
 *     settles nothing.
 *
 * Failure it exists to catch: the review offering "I want to sue the police service…" for What you
 * want after the person had answered with a declaration; the other party never asked after "No,
 * let me answer"; the chat asking "what outcome are you seeking?" once they had said it.
 */
import { alreadyAsked, caseFileOf, unsureDateQuestions } from "../../src/lib/case-system/caseFile/caseFile";
import { factOfAskedText } from "../../src/lib/case-system/caseFile/factsOfQuestion";
import { remainingEssentialQuestions } from "../../src/lib/case-system/intakeReview";
import { answeredInStory, caseFileOfChat } from "../../src/lib/case-system/guided-assistant/answeredInStory";
import { onSideChange } from "../../src/lib/case-system/sideChange";
import { civilGuidedFields, familyGuidedFields, CIVIL_ISSUE_OPTIONS, CIVIL_DOCUMENT_OPTIONS, FAMILY_ISSUE_OPTIONS, FAMILY_FILED_OPTIONS } from "../../app/builder/_components/guidedFields";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { situationFacts } from "../../app/api/intake/guided-turn/route";
import { selectQuestions } from "../../src/lib/case-system/intake/selectQuestions";
import { settledBySmallClaimsStep } from "../../src/lib/case-system/situation/situation";

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
  const held = caseFileOfChat({ masterResult: { intakeCheckpoint: stored } });
  check(`${court}: the chat does not ask it again`, answeredInStory("What outcome are you seeking?", "", held));
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

{
  const asked = (situation: Record<string, unknown>, role: string) => {
    const fixed = situationFacts({ court: "small-claims", ...situation });
    return selectQuestions({ role, ...fixed.facts } as Parameters<typeof selectQuestions>[0], fixed.questionIds);
  };
  const plaintiffAtConference = asked({ where: "going", started: "me", stage: "plaintiff:awaiting-settlement-conference" }, "plaintiff");
  check("plaintiff at the settlement conference: not asked whether the claim was served, or a Defence filed", !plaintiffAtConference.some((id) => ["sc-defendant-served", "sc-defence-filed", "sc-defence-time-elapsed", "sc-defendant-noted-in-default", "sc-claim-filed"].includes(id)), plaintiffAtConference.join(", "));
  for (const stage of ["defendant:defence-filed", "defendant:awaiting-settlement-conference"]) {
    const ids = asked({ where: "served", papers: "small-claims-7A", receivedOn: "2026-10-01", stage }, "defendant");
    check(`defendant at ${stage}: not asked whether they filed a Defence`, !ids.includes("sc-defendant-defence-filed"), ids.join(", "));
  }
  const justServed = asked({ where: "served", papers: "small-claims-7A", receivedOn: "2026-10-01" }, "defendant");
  check("a defendant just served is still asked whether they filed a Defence", justServed.includes("sc-defendant-defence-filed"), justServed.join(", "));
  const waiting = asked({ where: "going", started: "me", stage: "plaintiff:served-awaiting-defence" }, "plaintiff");
  check("a plaintiff waiting for a Defence is still asked whether one was filed", waiting.includes("sc-defence-filed"), waiting.join(", "));
  check("a motion, which can come at any time, settles nothing", JSON.stringify(settledBySmallClaimsStep("both:bringing-a-motion")) === JSON.stringify({ served: false, defence: false }));
  // Site owner, 2026-10-27: each way in backed by the rules we hold; where it is not, the question is asked.
  const STEPS: [string, { served: boolean; defence: boolean }, string][] = [
    ["plaintiff:action-dismissed-for-delay", { served: false, defence: false }, "r. 11.1.01: dismissed for delay before service too"],
    ["plaintiff:judgment-in-my-favour-unpaid", { served: true, defence: false }, "r. 20.03 after a default judgment (r. 11.02), which needs service, with no Defence"],
    ["plaintiff:debtor-examination", { served: true, defence: false }, "r. 20.10 after a judgment, default included"],
    ["defendant:judgment-being-enforced", { served: true, defence: false }, "r. 20.08 after a default judgment against them"],
    ["plaintiff:wants-to-discontinue", { served: false, defence: false }, "withdrawal before service is not in the rules held (r. 11.3.01, r. 13.09): asked"],
    ["defendant:admitted-and-proposed-terms", { served: true, defence: true }, "r. 9.03 (1): the proposal is made in the defence"],
  ];
  // Story pack on GitHub, 27 Oct (w4): "I don't know yet" to the day the claim was issued, then that
  // question asked on the results page and again on the case page. Any date question answered so is
  // folded on the step page (never asked again), like the days the case file holds.
  const unsureIssued = caseFileOf({ version: 1, flowId: "00000000-0000-4000-8000-000000000044", courtPath: "small-claims", revision: "00000000-0000-4000-8000-000000000044", sections: { story: { text: "Synthetic." }, builder: { initialUnknowns: ["sc-date-claim-issued", "sc-remedy-sought"] } } } as never);
  check("a date answered 'I don't know yet' with no slot of its own is folded on the step page, never asked again", unsureDateQuestions(unsureIssued).includes("sc-date-claim-issued") && !unsureDateQuestions(unsureIssued).includes("sc-remedy-sought"), JSON.stringify(unsureDateQuestions(unsureIssued)));
  for (const [step, want, why] of STEPS) check(`${step} settles ${JSON.stringify(want)} (${why})`, JSON.stringify(settledBySmallClaimsStep(step)) === JSON.stringify(want), JSON.stringify(settledBySmallClaimsStep(step)));
}

console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
process.exitCode = failures ? 1 : 0;
