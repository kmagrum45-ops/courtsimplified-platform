/**
 * NOTHING CHROME FOUND ASKED TWICE IN THE MILESTONE TEST OF #550 IS ASKED AGAIN (site owner, 16 Nov 2026).
 *
 * Chrome's milestone test (head 49487513) found 11 facts asked twice. Each asker is now on the one function
 * (caseFile/factStatus.ts) or reads the one record. This runs each finding through the real function that decides it:
 *   (1)  the reading card's court: held from the start, so not offered again (factStatus court known);
 *   (2)(6)(7) the amount, the quote and Alex: test:offers-one-source;
 *   (3)  "If this involves an injury, what date did it happen?" after the date was confirmed: not shown;
 *   (4)  the Small Claims form's "Still useful to add": no name or address the Parties step holds, no evidence or breakdown
 *        the story gives;
 *   (5)  the review's empty party boxes: none, the Parties step holds them (oldParties.ts PARTY_FORM_FIELDS);
 *   (8)  "Have you filed a Defence (Form 9A)?" after "Nothing else yet. I was just served": not shown;
 *   (9)  "Were you married, is a divorce proceeding underway..." after No: not asked; the home page's "Are you and your
 *        partner legally married?" left to the Family triage (one asker);
 *   (10) "Did you live together?": the story's "separated in June 2026" offered for "Ended";
 *   (11) the Forms tab's "Have you confirmed this is an eligible Ontario Small Claims Court matter?": kept from the case.
 * The browser side (every page, all S-stories): ask-once-pages.spec.ts, milestone-s1 to milestone-s8.
 *
 * What failure it catches: one of Chrome's eleven asked-twice findings coming back.
 */
import { caseFileOf, type CaseFile } from "../../src/lib/case-system/caseFile/caseFile";
import { factStatus, mayAskWords, mayShowQuestion } from "../../src/lib/case-system/caseFile/factStatus";
import { reviewEntries } from "../../src/lib/case-system/intakeReview";
import { PARTY_FORM_FIELDS } from "../../src/lib/case-system/caseFile/oldParties";
import { separatedFromStory } from "../../src/lib/case-system/family/statusTriage";
import { suggestApplicability } from "../../src/lib/case-system/forms/applicabilitySuggestions";
import { buildMissingPrompt } from "../../app/builder/_components/SmallClaimsIntake";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import type { CaseRecord } from "../../src/lib/case-system/caseRecord";

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed++;
}
const checkpoint = (court: "small-claims" | "family" | "civil", sections: Record<string, unknown>): Checkpoint => ({
  version: 1, flowId: "00000000-0000-4000-8000-000000000001", courtPath: court, revision: "00000000-0000-4000-8000-000000000002", sections,
} as unknown as Checkpoint);
const S1 = "Synthetic: On October 4, 2026 I slipped on a wet floor inside the Circle K and fell. A witness saw it and I have X-rays. I missed 3 days of work at $150 a day, $450 in all, and paid $18.45 for medicine. I want $5,000 for pain and suffering.";

// (1)
const chosen = caseFileOf(checkpoint("small-claims", { situation: { record: { where: "starting", filed: "nothing", court: "small-claims" } }, story: { text: S1 } }));
check("(1) the court chosen at the start is held, so the reading card does not offer it again", factStatus(chosen, "court") === "known" && chosen.court.value === "small-claims");

// (3)
const dated = caseFileOf(checkpoint("small-claims", { story: { text: S1 }, caseFile: { facts: { whenHappened: { value: "2026-10-04", seq: 1 } } }, guided: { facts: { disputeCategory: "personal-injury" }, answeredIds: ["sc-orient-when-happened"] }, "small-claims": { input: { timeline: "2026-10-04" } } }));
const datedFile: CaseFile = { ...dated, whenHappened: { state: "answered", value: "2026-10-04", source: { kind: "answer", question: "sc-orient-when-happened" }, confirmed: true } };
check("(3) the injury-date question is not shown once when it happened is held", !mayShowQuestion(datedFile, "sc-date-injury"));
check("(3) self-test: with no date held it is still asked", mayShowQuestion(caseFileOf(null), "sc-date-injury"));

// (4)
const parties = { version: 1, declined: [], list: [
  { id: "you", you: true, side: "yours", kind: "person", details: { firstName: "Test", lastName: "Plaintiff", street: "12 Example Street", city: "Ottawa", province: "ON", postalCode: "K1A 0A1" }, unsure: [] },
  { id: "o1", side: "other", kind: "company", details: { companyName: "Circle K Convenience Stores Ltd.", street: "100 Sample Road", city: "Ottawa", province: "ON", postalCode: "K1B 0B1" }, unsure: [] },
] };
const withParties = caseFileOf(checkpoint("small-claims", { story: { text: S1 }, caseFile: { parties } }));
const banner = buildMissingPrompt({ yourName: "", otherParty: "", defendantAddress: "", facts: S1, timeline: "", evidence: "", amountClaimed: "$5,468.45", damagesBreakdown: "", yourRole: "Plaintiff / claimant" } as never, { ...withParties, amount: { state: "answered", value: "5468.45", source: { kind: "answer", question: "sc-amount-claimed" }, confirmed: true } });
check("(4) the form's banner asks for no name or address the Parties step holds", !/legal name|address for service|other party.s name/.test(banner), banner);
check("(4) nor the evidence or the breakdown the story gives", !/what evidence you have|how the amount was calculated/.test(banner), banner);
const emptyBanner = buildMissingPrompt({ yourName: "", otherParty: "", defendantAddress: "", facts: "Synthetic: something happened.", timeline: "", evidence: "", amountClaimed: "", damagesBreakdown: "", yourRole: "Plaintiff / claimant" } as never, caseFileOf(null));
check("(4) self-test: with nothing held it still lists them", /legal name/.test(emptyBanner) && /address for service/.test(emptyBanner), emptyBanner);

// (5)
const changed = reviewEntries(checkpoint("small-claims", { story: { text: S1 }, caseFile: { parties }, "small-claims": { input: { yourName: "", yourAddress: "", yourPostalCode: "", yourPhone: "", yourEmail: "", otherPartyPhone: "", otherPartyEmail: "", defendantAddress: "", amountClaimed: "5100" } } }));
const partyBoxes = changed.filter((entry) => PARTY_FORM_FIELDS.has(entry.field)).map((entry) => entry.label);
check("(5) the review shows none of the form's party boxes (the Parties step holds them)", partyBoxes.length === 0, partyBoxes.join(", "));
check("(5) the review still shows the form's other boxes (the amount)", changed.some((entry) => entry.field === "amountClaimed"));

// (8)
const served = caseFileOf(checkpoint("small-claims", { situation: { record: { where: "served", stage: "just-served", papers: "small-claims-7A", receivedOn: "2026-10-20", court: "small-claims" } } }));
check("(8) \"Nothing else yet. I was just served\": no Defence filed is held, the question is not shown", factStatus(served, "defenceFiled") === "known" && served.defenceFiled.value === false && !mayShowQuestion(served, "sc-defence-filed") && !mayShowQuestion(served, "sc-defendant-defence-filed"));
const servedOther = caseFileOf(checkpoint("small-claims", { situation: { record: { where: "served", papers: "small-claims-7A", court: "small-claims" } } }));
check("(8) self-test: served with no stage given, it is still asked", mayShowQuestion(servedOther, "sc-defence-filed"));

// (9)
const notMarried = caseFileOf(checkpoint("family", { builder: { triageState: { record: { marriedToOtherParty: "no" } } } }));
const notMarriedFile: CaseFile = notMarried.married.state === "answered" ? notMarried : { ...notMarried, married: { state: "answered", value: false, source: { kind: "answer", question: "married-to-other-party" }, confirmed: true } };
check("(9) after No, \"Were you married, is a divorce proceeding underway...\" is not asked", !mayAskWords(notMarriedFile, "Were you married, is a divorce proceeding underway, and are there any existing parenting orders, agreements or other family proceedings?"));
check("(9) the home page leaves \"Are you and your partner legally married?\" to the Family triage (one asker)", !mayAskWords(caseFileOf(null), "Are you and your partner legally married?", { court: "family" }));
check("(9) the triage's own question is the one asker of it", mayShowQuestion(caseFileOf(null), "married-to-other-party"));
check("(9) self-test: a question about something else is asked", mayAskWords(notMarriedFile, "Where does your son live now?") && mayAskWords(caseFileOf(null), "Where were you married?", { court: "family" }));

// (10)
const ended = separatedFromStory("Synthetic: Jordan and I lived together and separated in June 2026. We were never married.");
check("(10) \"separated in June 2026\" is offered for when living together ended", ended?.end === "2026-06", JSON.stringify(ended));

// (11)
const record = { courtPath: "small-claims", side: null, amount: "$5,468.45", story: S1, position: {}, claimKind: null } as unknown as CaseRecord;
const eligibility = suggestApplicability([{ field_path: "formApplicability.smallClaims.eligibilityConfirmed", choices: [{ value: true }, { value: false }, { value: "not-sure" }] }], record, {});
check("(11) the Forms tab keeps \"eligible Ontario Small Claims Court matter\" from the case (firm Yes)", eligibility.length === 1 && eligibility[0].value === true && eligibility[0].firm === true, JSON.stringify(eligibility));
const over = suggestApplicability([{ field_path: "formApplicability.smallClaims.eligibilityConfirmed", choices: [{ value: true }, { value: false }, { value: "not-sure" }] }], { ...record, amount: "$85,000" } as CaseRecord, {});
check("(11) self-test: an amount over the Small Claims limit is never answered for them", over.length === 0, JSON.stringify(over));

// (12) The Forms tab's "Are you making a Defendant's Claim?" keeps the person's own answer to the review's counterclaim
// question (one fact, factsOfQuestion.ts), never asks it again (site owner, 17 Nov; full local run of 4d1ae680: asked again
// on 7 served Small Claims stories): "I do not know yet" (typed or ticked) is the question's own "Not sure", "No" is No,
// both kept; a claim back in their words stays a suggestion they confirm.
const DEFENDANTS_CLAIM = [{ field_path: "formApplicability.smallClaims.isMakingDefendantsClaim", choices: [{ value: true }, { value: false }, { value: "not-sure" }] }];
const beingSued = { ...record, side: { value: "responding" }, story: "Synthetic: I was served with a Plaintiff's Claim. My former roommate says I owe her $3,200." } as unknown as CaseRecord;
const answeredInReview = (builder: Record<string, unknown>) => ({ intakeCheckpoint: { version: 1, flowId: "00000000-0000-4000-8000-000000000001", courtPath: "small-claims", revision: "00000000-0000-4000-8000-000000000002", sections: { story: { text: beingSued.story }, situation: { record: { where: "served", stage: "just-served", papers: "small-claims-7A", court: "small-claims" } }, builder: { step: "guided", ...builder } } } });
const held = (builder: Record<string, unknown>) => suggestApplicability(DEFENDANTS_CLAIM, beingSued, answeredInReview(builder))[0];
for (const [name, builder] of [["typed \"I do not know yet\"", { initialAnswers: { "sc-defendant-counterclaim": "I do not know yet" } }], ["ticked \"I do not know yet\"", { initialAnswers: {}, initialUnknowns: ["sc-defendant-counterclaim"] }]] as const) {
  const kept = held(builder);
  check(`(12) ${name} in the review: the Forms tab keeps "Not sure" from the case, never asks again`, kept?.value === "not-sure" && kept.firm === true, JSON.stringify(kept));
}
// The Small Claims chat asks it too, saved as its own answer (guided.earlierAnswers; source "sc-defendant-counterclaim"):
// the full local run of 17 Nov answered it there with "No". Both kept from the case, never asked again on the Forms tab.
const inChat = (answerText: string) => suggestApplicability(DEFENDANTS_CLAIM, beingSued, { intakeCheckpoint: { ...answeredInReview({}).intakeCheckpoint, sections: { ...answeredInReview({}).intakeCheckpoint.sections, guided: { earlierAnswers: [{ questionId: "sc-defendant-counterclaim", answerText }] } } } })[0];
const chatNo = inChat("No");
check("(12) \"No\" in the Small Claims chat: the Forms tab keeps No from the case", chatNo?.value === false && chatNo.firm === true, JSON.stringify(chatNo));
const chatUnsure = inChat("I do not know yet");
check("(12) \"I do not know yet\" in the Small Claims chat: the Forms tab keeps \"Not sure\" from the case", chatUnsure?.value === "not-sure" && chatUnsure.firm === true, JSON.stringify(chatUnsure));
const no = held({ initialAnswers: { "sc-defendant-counterclaim": "No" } });
check("(12) \"No\" in the review: the Forms tab keeps No from the case", no?.value === false && no.firm === true, JSON.stringify(no));
const yes = held({ initialAnswers: { "sc-defendant-counterclaim": "She owes me $500 for the TV she broke" } });
check("(12) a claim back in their own words stays a suggestion they confirm, never kept for them", yes?.value === true && !yes.firm, JSON.stringify(yes));
const notAsked = held({ initialAnswers: {} });
check("(12) self-test: never asked in the review, nothing is kept for them", !notAsked?.firm, JSON.stringify(notAsked));

console.log(failed ? `\n${failed} check(s) FAILED.` : "\nAll milestone ask-once checks passed.");
process.exit(failed ? 1 : 0);
