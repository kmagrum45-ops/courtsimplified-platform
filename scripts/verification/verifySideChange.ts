/**
 * WHEN THE SIDE CHANGES, THE OLD SIDE'S FACTS ARE SET ASIDE (sideChange.ts, #477 re-test case 19).
 *
 * Checks, as properties:
 *   - changing the side in the situation answers empties every answer about one side (the
 *     amount, filed, defence filed, what they want, the kind of claim) in every place an
 *     answer is kept, in all three areas, so the case file no longer holds it;
 *   - everything else (the story, the other party, dates) is kept;
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
  guided: { facts: { amountClaimedText: "$1,650", claimFiled: "No", otherPartyName: "Circuit Doctors Inc." }, answeredIds: ["sc-amount-claimed", "sc-claim-filed", "sc-orient-when-happened"], earlierAnswers: [{ questionId: "sc-amount-claimed", answerText: "$1,650" }, { questionId: "sc-orient-when-happened", answerText: "July 2026" }], matchedClaimType: { claimTypeId: "x", userConfirmed: true } },
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
  check("a date answer is kept", (sections.builder.initialAnswers as Record<string, unknown>)["sc-orient-when-happened"] === "July 12, 2026");
  check("an unsure date answer is kept", JSON.stringify((sections.caseFile.unsure as Record<string, unknown>).courtDate) === JSON.stringify({ question: "y" }));
  check("a form list stays a list", Array.isArray((sections["small-claims"].input as Record<string, unknown>).filedDocuments));
  check("a form text field stays text", (sections["small-claims"].input as Record<string, unknown>).amountClaimed === "");
  check("the guided route asks the amount again", !(sections.guided.answeredIds as string[]).includes("sc-amount-claimed") && (sections.guided.answeredIds as string[]).includes("sc-orient-when-happened"));
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

console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
process.exit(failures ? 1 : 0);
