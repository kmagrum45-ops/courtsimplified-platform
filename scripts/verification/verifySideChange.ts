/**
 * WHEN THE SIDE CHANGES, THE OLD SIDE'S FACTS ARE SET ASIDE (sideChange.ts, #477 re-test case 19).
 *
 * Checks, as properties:
 *   - changing the side in the situation answers empties every answer about one side (the
 *     amount, filed, defence filed, what they want, the kind of claim) in every place an
 *     answer is kept, in all three areas, so the case file no longer holds it;
 *   - and when the old claim's events happened, and the chat lines that showed those answers
 *     ("Confirmed from my story … The amount: $1,650", a question about one side and its reply);
 *   - everything else (the story, the other party, the days of service and hearings) is kept;
 *   - the review's story suggestions for someone now responding come from the sentences about the
 *     claim against them, never the claim they meant to bring (26 Oct re-test, case 19).
 *   - nothing changes when the side is given for the first time or stays the same;
 *   - a form field keeps its type when emptied (a list stays a list), so the form still draws.
 *
 * Failure it exists to catch: "Amount claimed: $1,650 (your answer already given)" -- the
 * person's own claim's amount -- shown on the claim against them after they changed side.
 */
import { onSideChange } from "../../src/lib/case-system/sideChange";
import { caseFileOf } from "../../src/lib/case-system/caseFile/caseFile";
import { situationSection, type Situation } from "../../src/lib/case-system/situation/situation";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { suggestInitialAnswers } from "../../src/lib/case-system/intakeReview";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ID = "00000000-0000-4000-8000-000000000019";
const BRINGING: Situation = { where: "starting", filed: "nothing" } as Situation;
const RESPONDING: Situation = { where: "served", papers: "small-claims-7A", receivedOn: "2026-10-20" } as Situation;
const cp = (courtPath: Checkpoint["courtPath"], sections: Checkpoint["sections"]): Checkpoint => ({ version: 1, flowId: ID, courtPath, revision: ID, sections });

const answered = (sections: Checkpoint["sections"]): Checkpoint["sections"] => ({
  story: { text: "Synthetic: Circuit Doctors Inc. repaired my laptop for $450. I want $1,650 back." },
  "small-claims": { input: { amountClaimed: "$1,650", otherPartyName: "Circuit Doctors Inc.", filedDocuments: ["nothing"], remedySought: "A refund" } },
  civil: { input: { amountClaimed: "$80,000", otherParty: "Synthetic Ltd.", documents: ["nothing"], remedySought: "Damages" } },
  family: { goal: "Support", otherParty: "Synthetic Spouse", filedDocuments: ["nothing"] },
  guided: { messages: [
    { from: "assistant", text: "Confirmed from my story:\n• The amount: $1,650\n• Who you are claiming against: Circuit Doctors Inc." },
    { from: "assistant", text: "How much are you claiming?", isQuestion: true, questionId: "sc-amount-claimed" },
    { from: "user", text: "$1,650" },
    { from: "assistant", text: "Who is the other party?", isQuestion: true, questionId: "sc-orient-other-party" },
    { from: "user", text: "Circuit Doctors Inc." },
  ], facts: { amountClaimedText: "$1,650", claimFiled: "No", otherPartyName: "Circuit Doctors Inc." }, answeredIds: ["sc-amount-claimed", "sc-claim-filed", "sc-orient-when-happened"], earlierAnswers: [{ questionId: "sc-amount-claimed", answerText: "$1,650" }, { questionId: "sc-orient-when-happened", answerText: "July 2026" }], matchedClaimType: { claimTypeId: "x", userConfirmed: true } },
  builder: { initialAnswers: { "sc-amount-claimed": "$1,650", "sc-claim-filed": "No", "sc-orient-when-happened": "July 12, 2026" }, initialUnknowns: ["sc-remedy-sought", "otherParty"] },
  "form-chat": { skipped: ["goal", "upcomingCourtDate"] },
  caseFile: { unsure: { amount: { question: "x" }, courtDate: { question: "y" } } },
  ...sections,
});

for (const court of ["small-claims", "civil", "family"] as const) {
  const before = answered(situationSection(BRINGING));
  const after = { ...before, ...situationSection(RESPONDING) };
  const { sections, changed } = onSideChange(before, after);
  const file = caseFileOf(cp(court, sections));
  check(`${court}: the old side's amount is not held after the side changes`, file.amount.state === "not-asked", JSON.stringify(file.amount));
  check(`${court}: what they want is not held after the side changes`, file.wants.state === "not-asked", JSON.stringify(file.wants));
  check(`${court}: whether a claim is filed comes only from the new situation`, file.filed.source?.kind !== "answer" || file.filed.source.question.startsWith("situation"), JSON.stringify(file.filed));
  check(`${court}: the screens holding the emptied answers are told`, changed.length > 0);
  const before2 = caseFileOf(cp(court, before));
  check(`${court}: (the old side's amount was held before)`, before2.amount.state !== "not-asked");
}
{
  const before = answered(situationSection(BRINGING));
  const { sections } = onSideChange(before, { ...before, ...situationSection(RESPONDING) });
  check("the story is kept", JSON.stringify(sections.story) === JSON.stringify(before.story));
  check("the other party is kept", (sections["small-claims"].input as Record<string, unknown>).otherPartyName === "Circuit Doctors Inc." && (sections.guided.facts as Record<string, unknown>).otherPartyName === "Circuit Doctors Inc.");
  // When the claim's events happened belongs to that claim: set aside with it (26 Oct re-test, case 19:
  // the repair's "July 2026" stayed on the defamation claim against him). Days of service and hearings stay.
  check("when the old claim's events happened is set aside", (sections.builder.initialAnswers as Record<string, unknown>)["sc-orient-when-happened"] === undefined);
  check("an unsure date answer is kept", JSON.stringify((sections.caseFile.unsure as Record<string, unknown>).courtDate) === JSON.stringify({ question: "y" }));
  const lines = (sections.guided.messages as { text: string }[]).map((message) => message.text);
  check("the chat no longer shows the old side's amount", !lines.some((text) => /\$1,650/.test(text)), JSON.stringify(lines));
  check("the chat keeps every other line as said", lines.some((text) => /Who you are claiming against: Circuit Doctors Inc\./.test(text)) && lines.includes("Who is the other party?") && lines.includes("Circuit Doctors Inc."), JSON.stringify(lines));
  check("a form list stays a list", Array.isArray((sections["small-claims"].input as Record<string, unknown>).filedDocuments));
  check("a form text field stays text", (sections["small-claims"].input as Record<string, unknown>).amountClaimed === "");
  check("the guided route asks the amount, and when it happened, again", !(sections.guided.answeredIds as string[]).includes("sc-amount-claimed") && !(sections.guided.answeredIds as string[]).includes("sc-orient-when-happened"));
  check("the review's 'I don't know yet' about one side is set aside, others kept", JSON.stringify(sections.builder.initialUnknowns) === JSON.stringify(["otherParty"]));
}
{
  const first = answered({});
  const given = onSideChange(first, { ...first, ...situationSection(RESPONDING) });
  check("the side given for the first time changes nothing", given.changed.length === 0 && given.sections === given.sections);
  const same = answered(situationSection(RESPONDING));
  const kept = onSideChange(same, { ...same, ...situationSection({ ...RESPONDING, receivedOn: "2026-10-21" } as Situation) });
  check("the same side with another detail changes nothing", kept.changed.length === 0);
}

{
  const M19 = "Marcus Bell in Ottawa had his laptop repaired by Circuit Doctors Inc. in July 2026 for $450. It came back worse. He wants a refund of $450 plus the $1,200 he paid to replace it. (Later, on October 20, Circuit Doctors' owner, Wei Chen, serves him with a claim for $3,200 for 'defamation' over an online review.)";
  const suggest = (situation: Situation) => suggestInitialAnswers(cp("small-claims", { story: { text: M19 }, ...situationSection(situation) }));
  const responding = suggest(RESPONDING);
  check("responding: the kind of dispute is the claim against them", responding["sc-orient-dispute-category"] === "Something said about you (defamation)", JSON.stringify(responding));
  check("responding: the amount is the claim against them", responding["sc-amount-claimed"] === undefined || /3,200/.test(responding["sc-amount-claimed"]), JSON.stringify(responding));
  check("bringing: the story's own claim, as before", suggest(BRINGING)["sc-orient-dispute-category"] === "Work or a service you paid for (e.g. a contractor)", JSON.stringify(suggest(BRINGING)));
  check("responding with no sentence about the claim against them: nothing offered", Object.keys(suggestInitialAnswers(cp("small-claims", { story: { text: "My laptop repair went badly in July 2026." }, ...situationSection(RESPONDING) }))).length === 0);
}

console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
process.exit(failures ? 1 : 0);
