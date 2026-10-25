/**
 * THE CASE FILE: EVERY FACT ASKED ONCE (caseFile.ts, Jason 2026-10-24).
 *
 * Checks, as properties rather than today's values:
 *   - each place an answer is kept today fills the same slot (the situation answers, the
 *     civil and Family forms, the Small Claims guided answers, the review's answers, the
 *     Family triage, the saved position), with its source and as the person's own;
 *   - "not sure" (the review's "I don't know yet", a skip, an "I don't know" typed, the day
 *     not known) is kept as unsure and counts as asked; a real answer is never covered by it;
 *   - nextQuestion never returns a question whose fact the file holds, in any area, and at
 *     the end offers each unsure fact once, never a second time;
 *   - amounts are kept as numbers;
 *   - a day given anywhere is the step page's answer for the same moment, and never frozen
 *     into the saved position;
 *   - the Family triage skips what another question answered.
 *
 * Failure it exists to catch: the same fact asked on two screens because each screen
 * decided on its own (Jason's walkthrough findings 1-3 and the 22 repeats the ask-once
 * gate found on 2026-10-23).
 */
import { type SlotFact, slotsOfQuestion, alreadyAsked, askable, caseFileOf, nextQuestion, withCaseFileDates, withoutCaseFileDates, withUnsure, isUnsureAnswer, CASE_FILE_SECTION } from "../../src/lib/case-system/caseFile/caseFile";
import { fullDayIn } from "../../src/lib/case-system/casePosition";
import { remainingEssentialQuestions, reviewEntries } from "../../src/lib/case-system/intakeReview";
import { dateAnswerCheck } from "../../src/lib/case-system/dates";
import { FAMILY_ISSUE_OPTIONS } from "../../app/builder/_components/guidedFields";
import { situationOf, withSituationDates } from "../../src/lib/case-system/situation/situation";
import { withCaseFileAnswers } from "../../src/lib/case-system/caseFile/triageFromCaseFile";
import { emptyStatusRecord } from "../../src/lib/case-system/family/statusTriage";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ID = "00000000-0000-4000-8000-000000000001";
const checkpoint = (courtPath: Checkpoint["courtPath"], sections: Record<string, Record<string, unknown>>): Checkpoint => ({ version: 1, flowId: ID, courtPath, revision: ID, sections: { story: { text: "Synthetic story." }, ...sections } });

// 1. The situation answers fill their slots, as the person's own.
{
  const file = caseFileOf(checkpoint("small-claims", { situation: { record: { where: "served", papers: "small-claims-7A", receivedOn: "2026-10-06", court: "small-claims", courtFrom: "papers" } } }));
  check("served: side, court, stage, filed, papers and the day served are held", ["side", "court", "stage", "filed", "papers", "servedDate"].every((fact) => file[fact as SlotFact].state === "answered"));
  check("held facts are the person's own answers", file.servedDate.confirmed && file.servedDate.source?.kind === "answer");
  check("the day served is not asked again by any question for it", ["sc-defendant-claim-received", "sc-date-claim-served", "serviceDetails", "servedDate"].every((id) => alreadyAsked(file, id)));
  check("nor the side or whether anything is filed", ["sc-orient-role", "yourRole", "sc-claim-filed"].every((id) => alreadyAsked(file, id)));
  check("which documents exist is a detail of its own (asked once, where the answers do not list them)", !alreadyAsked(file, "filedDocuments"));
}

// 2. "Not sure" counts as asked, and never covers a real answer.
{
  const unknownDay = caseFileOf(checkpoint("civil", { situation: { record: { where: "served", papers: "not-sure", receivedOn: "unknown", court: "civil", courtFrom: "choice" } } }));
  check("\"I don't know the date\" is kept as unsure", unknownDay.servedDate.state === "unsure" && unknownDay.papers.state === "unsure");
  check("an unsure fact is not asked again before the end", nextQuestion(unknownDay, ["serviceDetails", "otherParty"]) === "otherParty");
  check("at the end, the unsure fact is offered once more", nextQuestion(unknownDay, ["serviceDetails"], { atEnd: true }) === "serviceDetails");
  check("and not a second time", nextQuestion(unknownDay, ["serviceDetails"], { atEnd: true, offered: ["servedDate"] }) === null);
  const review = caseFileOf(checkpoint("small-claims", { builder: { initialUnknowns: ["sc-amount-claimed"] } }));
  check("the review's \"I don't know yet\" is unsure, and asked nowhere else", review.amount.state === "unsure" && alreadyAsked(review, "amountClaimed") && alreadyAsked(review, "amountClaimedText"));
  const skipped = caseFileOf(checkpoint("family", { "form-chat": { skipped: ["childrenInfo"] } }));
  check("a skip in the questions one at a time is unsure", skipped.children.state === "unsure");
  const typed = caseFileOf(checkpoint("small-claims", { guided: { earlierAnswers: [{ questionId: "sc-orient-when-happened", answerText: "I don't know" }] } }));
  check("\"I don't know\" typed is unsure, never a value", typed.whenHappened.state === "unsure" && typed.whenHappened.value === undefined);
  const both = caseFileOf(checkpoint("small-claims", { guided: { earlierAnswers: [{ questionId: "sc-amount-claimed", answerText: "$2,500" }] }, builder: { initialUnknowns: ["sc-amount-claimed"] } }));
  check("an unsure answer never covers a real one", both.amount.state === "answered" && both.amount.value === 2500);
  for (const phrase of ["I don't know", "not sure", "Not sure yet", "idk", "I do not know yet"]) check(`"${phrase}" reads as not sure`, isUnsureAnswer(phrase));
  check("an answer that only mentions not knowing is still an answer", !isUnsureAnswer("I don't know his address, only his phone"));
  const ledger = caseFileOf(checkpoint("family", { [CASE_FILE_SECTION]: withUnsure(undefined, "married-to-other-party") }));
  check("the case file's own record of a \"not sure\" is kept", ledger.married.state === "unsure");
}

// 3. Every area: one answer, never asked by another screen's question for it.
{
  const civil = caseFileOf(checkpoint("civil", { civil: { input: { amountClaimed: "$90,000", otherParty: "Test Motors Ltd.", legalRemedy: "My money back" } } }));
  check("civil: amount as a number", civil.amount.value === 90000);
  check("civil: the other party and what they want are held", civil.otherParty.state === "answered" && civil.wants.state === "answered");
  check("civil: a held fact is not offered by the gate", askable(civil, ["amountClaimed", "otherParty", "legalRemedy", "courtFileNumber"]).join() === "courtFileNumber");
  const family = caseFileOf(checkpoint("family", { family: { childrenInfo: "Lucas (7) and Emma (10)" } }));
  check("Family: the children are held from the form", family.children.state === "answered");
  check("Family: the triage does not ask about children again", withCaseFileAnswers(emptyStatusRecord(), family).caseInvolvesChildren === "yes");
  check("Family: \"No children\" is a no", withCaseFileAnswers(emptyStatusRecord(), caseFileOf(checkpoint("family", { family: { childrenInfo: "No children" } }))).caseInvolvesChildren === "no");
  check("Family: the triage still asks what nothing answered", withCaseFileAnswers(emptyStatusRecord(), caseFileOf(checkpoint("family", {}))).caseInvolvesChildren === "not-yet");
  const sc = caseFileOf(checkpoint("small-claims", { "small-claims": { input: { filedDocuments: ["nothing"], amountClaimed: "" } } }));
  check("Small Claims: the form's untouched \"Nothing filed yet\" is not an answer", sc.filed.state === "not-asked");
}

// 4. A day given anywhere is the step page's answer for that moment, and is not saved over the position.
{
  const file = caseFileOf(checkpoint("small-claims", { guided: { earlierAnswers: [{ questionId: "sc-orient-when-happened", answerText: "It happened on May 12, 2026." }] } }));
  const dates = withCaseFileDates({}, file, fullDayIn);
  check("when it happened: the step page has the day", dates["case-date-act-or-omission"] === "2026-05-12", JSON.stringify(dates));
  check("a day the person gave on the step page wins", withCaseFileDates({ "case-date-act-or-omission": "2026-05-13" }, file, fullDayIn)["case-date-act-or-omission"] === "2026-05-13");
  const noYear = caseFileOf(checkpoint("small-claims", { guided: { earlierAnswers: [{ questionId: "sc-orient-when-happened", answerText: "May 12" }] } }));
  check("a day with no year gives no answer (it is asked, never guessed)", !withCaseFileDates({}, noYear, fullDayIn)["case-date-act-or-omission"]);
  check("the carried day is not frozen into the saved position", Object.keys(withoutCaseFileDates({ "case-date-act-or-omission": "2026-05-12" }, {}, file, fullDayIn)).length === 0);
  check("a day the person saved there is kept", withoutCaseFileDates({ "case-date-act-or-omission": "2026-05-13" }, {}, file, fullDayIn)["case-date-act-or-omission"] === "2026-05-13");
  const served = caseFileOf(checkpoint("family", { situation: { record: { where: "served", papers: "family-8", receivedOn: "2026-10-12", court: "family", courtFrom: "papers" } } }));
  const placed = withCaseFileDates(withSituationDates({}, "family", situationOf(checkpoint("family", { situation: { record: { where: "served", papers: "family-8", receivedOn: "2026-10-12", court: "family", courtFrom: "papers" } } }).sections)), served, fullDayIn);
  check("Family served: the application's service day is the step page's answer (placed by the papers picked)", placed["case-date-served-with-application"] === "2026-10-12", JSON.stringify(placed));
  check("one served day is never copied into another paper's served-date question", !("case-date-served-with-motion-to-change" in placed) && !("sc-date-defendants-claim-served" in placed) && !("sc-date-claim-served" in placed), JSON.stringify(placed));
}

// 6. The independent reviewer's findings (2026-10-24), each held as a property.
{
  const going = checkpoint("small-claims", { situation: { record: { where: "going", started: "them", papers: "not-sure", receivedOn: "unknown", court: "small-claims", courtFrom: "choice", stage: "defendant:noted-in-default" } } });
  check("a step chosen later on the step page wins over the stage given at the start", caseFileOf(going, { position: { stepId: "defendant:defence-filed" } }).stage.value === "defendant:defence-filed");
  const moved = checkpoint("family", { situation: { record: { where: "going", started: "them", papers: "not-sure", receivedOn: "unknown", court: "family", courtFrom: "choice", stage: "defendant:noted-in-default" } } });
  check("a stage that no longer fits the court is not held", caseFileOf(moved).stage.state === "not-asked");
  const civil = caseFileOf(checkpoint("civil", { civil: { input: { caseStage: "not-sure", yourRole: "not-sure", documents: ["not-sure"] } } }));
  check("a form's untouched \"not sure\" is no answer, in civil too", civil.stage.state === "not-asked" && civil.side.state === "not-asked" && civil.filed.state === "not-asked");
  const unconfirmed = caseFileOf(checkpoint("small-claims", { guided: { matchedClaimType: { claimTypeId: "sc-claim-unpaid-debt-services", userConfirmed: false } } }), { position: { claimKind: "sc-claim-breach-of-contract-services" } });
  check("a kind of claim the person chose wins over a match they never confirmed", unconfirmed.claimKind.value === "sc-claim-breach-of-contract-services");
  check("a match the person never confirmed is not their answer", caseFileOf(checkpoint("small-claims", { guided: { matchedClaimType: { claimTypeId: "sc-claim-unpaid-debt-services", userConfirmed: false } } })).claimKind.state === "not-asked");
  check("a defendant-side situation is never held as a kind of claim", caseFileOf(checkpoint("small-claims", {}), { intakeData: { extra: { confirmedClaimTypeId: "sc-defence-served-and-confused", claimTypeUserConfirmed: true } } }).claimKind.state === "not-asked");
  check("\"We don't have any children\" is a no for the triage", withCaseFileAnswers(emptyStatusRecord(), caseFileOf(checkpoint("family", { family: { childrenInfo: "We don't have any children" } }))).caseInvolvesChildren === "no");
  check("a child from another relationship never answers \"a child together\"", withCaseFileAnswers(emptyStatusRecord(), caseFileOf(checkpoint("family", { family: { childrenInfo: "My son, from my first marriage" } }))).haveChildTogether === "not-yet");
  const married = caseFileOf(checkpoint("family", { story: { text: "We were married in Lisbon, Portugal in 2009." }, builder: { triageState: { record: { marriedToOtherParty: "yes" } } } }));
  check("where they married is carried from the story as a suggestion with its words, not as their confirmed answer", married.marriedWhere.value === "Lisbon, Portugal" && married.marriedWhere.confirmed === false && married.marriedWhere.source?.kind === "story");
  const role = caseFileOf(checkpoint("small-claims", { guided: { answeredIds: ["sc-orient-role"], facts: {} } }));
  check("an answered question with no words kept shows no made-up value", role.side.state === "answered" && role.side.value === undefined);
}

// 5. The saved case adds what the step page and results hold.
{
  const file = caseFileOf(checkpoint("small-claims", {}), { position: { claimKind: "not-sure", stepId: "plaintiff:defence-filed" } });
  check("a kind of claim answered \"not sure\" on the results counts as asked", file.claimKind.state === "unsure" && alreadyAsked(file, "claim-kind-suggestion"));
  check("a step chosen is the stage", file.stage.state === "answered" && alreadyAsked(file, "stage-confirmation"));
}

// 7. Option 1 (Jason, 2026-10-24): a "not sure" fact gets its one more offer in the review,
// as ONE field, and never blocks Confirm.
{
  for (const court of ["small-claims", "civil", "family"] as const) {
    const served = checkpoint(court, { story: { text: "Synthetic story.", location: { province: "Ontario", city: "Sudbury" } }, situation: { record: { where: "served", papers: "not-sure", receivedOn: "unknown", court, courtFrom: "choice" } } });
    const file = caseFileOf(served);
    const listed = remainingEssentialQuestions(served, true).filter((question) => slotsOfQuestion(question.id).includes("servedDate"));
    const boxes = reviewEntries(served).filter((entry) => (entry.essential || !(entry.value === "" || (Array.isArray(entry.value) && entry.value.length === 0))) && slotsOfQuestion(entry.field).includes("servedDate") && !entry.fromStart);
    check(`${court}: an unknown served day is offered once in the review, as one field`, file.servedDate.state === "unsure" && (boxes.length > 0 ? listed.length === 0 : listed.length <= 1), `questions ${listed.map((q) => q.id).join(", ")}; boxes ${boxes.map((b) => b.field).join(", ")}`);
    check(`${court}: a "not sure" fact never blocks Confirm`, !remainingEssentialQuestions(served).some((question) => slotsOfQuestion(question.id).includes("servedDate")));
    // Marked "I don't know yet" on that one offer: no second field for the same day appears.
    if (listed[0]) {
      const marked = { ...served, sections: { ...served.sections, builder: { initialUnknowns: [listed[0].id] } } };
      const after = remainingEssentialQuestions(marked, true).filter((question) => slotsOfQuestion(question.id).includes("servedDate"));
      check(`${court}: after "I don't know yet" on the review's offer, no second field for the day appears`, after.length === 1 && after[0].id === listed[0].id, after.map((q) => q.id).join(", "));
    }
  }
}

// 8. Item 12's small fixes that need no browser (items-8-12.spec.ts proves the others).
{
  const rough = "Roughly when did the situation you're describing happen?";
  check("\"last summer\" is accepted for a question asking roughly when", dateAnswerCheck(rough, "last summer") === null && dateAnswerCheck(rough, "a few months ago") === null);
  check("a day with no year is still asked for its year", dateAnswerCheck(rough, "October 6") !== null);
  check("a rough time is never a day to count from", dateAnswerCheck("What day did you get the papers?", "last summer", { oneDate: true }) !== null);
  const family = reviewEntries(checkpoint("family", { family: { uploadedEvidenceFiles: ["a.pdf"], someNewField: "x" } }));
  check("Family review labels are plain words, never Title Case of a field name", family.every((entry) => !/[a-z] [A-Z][a-z]+ [A-Z]/.test(entry.label)) && family.find((entry) => entry.field === "uploadedEvidenceFiles")?.label === "Documents you uploaded", family.map((entry) => entry.label).join(" | "));
  check("Divorce and selling the family home are Family issues a person can pick", ["divorce", "sale-of-home"].every((value) => FAMILY_ISSUE_OPTIONS.some((option) => option.value === value)));
}

if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
console.log("PASS case file: every fact is held once and asked once, in every area");
