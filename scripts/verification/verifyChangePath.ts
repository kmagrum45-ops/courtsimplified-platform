/**
 * ONE CHANGE PATH, LATEST CHANGE WINS (site owner, 31 Oct; rule 6 of the fact conversion).
 *
 * The owner's Chrome check: a wrong answer (the kind of claim) showed in the review as "your answer
 * already given; it is not asked again", with no way to change it, and the case page's "Change" only
 * went to the builder. The decision: one write path for a change, the case file's change record
 * (CASE_FILE_SECTION.changes, written by caseFile.ts withChange), read by caseFileOf as the newest
 * source of each fact, over every older copy, in all three courts.
 *
 * What it asserts, each as a property over every fact and every older source that holds it:
 *   1. the change record wins over every older source of the fact (the saved position, the situation
 *      answers, each area's form, the guided answers, the review's answers, the home answers, the
 *      Family triage, the step page's dates, the saved copies intakeData and intakeAnswers), through
 *      caseFileOf and caseFileOfMaster, and on the screens that show the kind of claim (the overview,
 *      the Form 7A section, "What we have so far", "Check my case file", the AI's fact text);
 *   2. a removal ("removed") beats every older source: the fact is not held, no screen shows it, the
 *      review does not ask it again by itself, and no step-page date comes back from an older answer;
 *   3. latest wins: the newest change (seq) is the one kept, and the overview's own pick saved after a
 *      change (position.claimKindAt) wins in its turn; a later form answer to a changed fact is
 *      recorded as the newest change (followAnswer);
 *   4. a change is a change of a confirmed fact: applyFactRevisions cancels the confirmation, the
 *      server's rule (confirmedAnswerChanged) agrees, and the review is told to say so
 *      (changedAfterConfirm);
 *   5. claimKindOf never proposes a kind the person turned down ("Not quite") or removed, even after
 *      the guided record is reset, and the review never suggests it.
 *
 * Failure it exists to catch: an older copy bringing a changed or removed answer back on any screen
 * or after a reload, or a change after Confirm that keeps the confirmation. The change records are
 * built by hand here, so the suite runs against a build without the change path and fails there.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as caseFileModule from "../../src/lib/case-system/caseFile/caseFile";
import { caseFileOf, claimKindOf, claimKindLine, alreadyAsked, SLOT_FACTS, type CaseFile, type SlotFact } from "../../src/lib/case-system/caseFile/caseFile";
import { caseFileOfMaster } from "../../src/lib/case-system/caseFile/caseFileOfMaster";
import { readCheckpoint, type Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import * as reviewModule from "../../src/lib/case-system/intakeReview";
import { applyFactRevisions, confirmedAnswerChanged, inputRevision, reconcileReview, remainingEssentialQuestions, reviewPhase, suggestInitialAnswers, transitionReview } from "../../src/lib/case-system/intakeReview";
import { caseFileFromMasterResult, deterministicFindings } from "../../src/lib/case-system/caseReview/caseReview";
import { caseFactsText, readCaseRecord } from "../../src/lib/case-system/caseRecord";
import IntelligenceOverviewPanel from "../../app/builder/_components/IntelligenceOverviewPanel";
import StatementOfClaimSurface from "../../app/builder/_components/StatementOfClaimSurface";
import CaseFilePanel from "../../app/cases/_components/CaseFilePanel";
import { inWords } from "../../src/lib/case-system/copy/rawKeys";
import { withCaseFileDates } from "../../src/lib/case-system/caseFile/caseFile";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const FLOW = "00000000-0000-4000-8000-0000000000d1";
const REV = "00000000-0000-4000-8000-0000000000d2";
const REV2 = "00000000-0000-4000-8000-0000000000d3";
const STORY = "My former coworker Jordan Testperson sent text messages about me to our manager in May 2026 saying I stole money from the till, which is false. I am claiming $10,000 for defamation. We were married in Lisbon, Portugal in 2009.";
const DEFAMATION = "Something said about you (defamation)";
const DEFAMATION_ID = "sc-claim-defamation-libel-slander";
type Area = "small-claims" | "civil" | "family";

const checkpointOf = (court: Area, sections: Record<string, unknown>, revision = REV): Checkpoint => ({
  version: 1, flowId: FLOW, courtPath: court, revision, sections: { story: { text: STORY, location: { city: "Sudbury", province: "Ontario" } }, ...sections },
} as unknown as Checkpoint);
/** A change record built by hand, as caseFile.ts withChange writes it. */
const changed = (changes: Record<string, unknown>) => ({ caseFile: { changes } });
const answered = (value: unknown, seq = 1, at = "2026-10-31T12:00:00.000Z") => ({ state: "answered", value, at, seq });
const removed = (seq = 1, at = "2026-10-31T12:00:00.000Z") => ({ state: "removed", at, seq });
const withSections = (checkpoint: Checkpoint, more: Record<string, unknown>): Checkpoint => ({ ...checkpoint, sections: { ...checkpoint.sections, ...more } } as Checkpoint);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&ldquo;|&rdquo;/g, '"').replace(/\s+/g, " ").trim();
const ANALYSIS = { courtPath: "small-claims", caseStage: "already-started", completedForms: [], receivedForms: [], requiredNextForms: [], notNeededNow: [], detectedIssues: [], inferredFacts: [], missingInformation: [], risksAndGaps: [], guidance: [], summary: "", legalIssues: [], detectedClaimTypes: [], research: { findings: [] }, appliedLaw: [] } as never;

// --- 1 and 2: the kind of claim, Small Claims, held in EVERY older source at once -----------------
const KIND_EVERYWHERE: Record<string, unknown> = {
  situation: { record: { where: "going", started: "me", court: "small-claims", stage: "plaintiff:defendant-noted-in-default" } },
  guided: { answeredIds: ["sc-orient-dispute-category"], facts: { role: "plaintiff", disputeCategory: "defamation" }, earlierAnswers: [{ questionId: "sc-orient-dispute-category", answerText: DEFAMATION }], matchedClaimType: { claimTypeId: DEFAMATION_ID, userConfirmed: true } },
  builder: { step: "guided", initialAnswers: { "sc-orient-dispute-category": DEFAMATION } },
};
const savedCase = (checkpoint: Checkpoint, position: Record<string, unknown> = { claimKind: DEFAMATION_ID }) => ({
  intakeCheckpoint: checkpoint,
  position,
  intakeData: { courtPath: checkpoint.courtPath, facts: STORY, caseStage: "already-started", yourName: "", otherParty: "Jordan Testperson", timeline: "", evidence: "", goal: "an apology", extra: { yourRole: "plaintiff", amountClaimed: "10000", confirmedClaimTypeId: DEFAMATION_ID, claimTypeUserConfirmed: true, issues: ["defamation"] } },
  intakeAnswers: [{ questionId: "sc-orient-dispute-category", answerText: DEFAMATION }, { questionId: "sc-amount-claimed", answerText: "$10,000" }],
  workflowStatus: { intakeCompleted: true },
});

/** Every screen that shows the kind of claim, each through its own code, as the pages build it. */
function screens(master: Record<string, unknown>, court: Area = "small-claims") {
  const checkpoint = readCheckpoint(master.intakeCheckpoint, court);
  const file: CaseFile = caseFileOf(checkpoint, master);
  const held = claimKindOf(file, inWords);
  const overview = text(renderToStaticMarkup(createElement(IntelligenceOverviewPanel, { analysis: { ...(ANALYSIS as object), courtPath: court } as never, intake: (master.intakeData ?? null) as never, confirmedStage: "already-started" as never, caseId: null, claimKind: held, caseFile: file } as never)));
  const form7A = court === "small-claims" ? text(renderToStaticMarkup(createElement(StatementOfClaimSurface, { caseFile: file }))) : "";
  const panel = text(renderToStaticMarkup(createElement(CaseFilePanel, { file, changeHref: "/b", situationHref: "/s", stepHref: "/t" })));
  const review = deterministicFindings(caseFileFromMasterResult(master, court));
  const stillNeeded = checkpoint ? remainingEssentialQuestions(checkpoint, true, master).map((question) => question.id) : [];
  const ai = caseFactsText(readCaseRecord(master, court));
  return { file, held, overview, form7A, panel, review, stillNeeded, ai, fromMaster: caseFileOfMaster(master, court) };
}

const base = checkpointOf("small-claims", KIND_EVERYWHERE);
{
  const before = screens(savedCase(base));
  check("baseline: every older source holds defamation", before.held.words === DEFAMATION || before.held.claimTypeId === DEFAMATION_ID, JSON.stringify(before.held));
}
{
  const s = screens(savedCase(withSections(base, changed({ claimKind: answered("A loan or debt") }))));
  const line = claimKindLine(s.held);
  check("1. kind changed: the case file holds the change over every older source", s.held.state === "answered" && s.held.words === "A loan or debt", JSON.stringify(s.held));
  check("1. kind changed: caseFileOfMaster (\"Check my case file\", the AI) holds it too", claimKindOf(s.fromMaster).words === "A loan or debt", JSON.stringify(claimKindOf(s.fromMaster)));
  check("1. kind changed: the overview shows the new kind, never the old", s.overview.includes("A loan or debt") && !/defamation/i.test(s.overview.replace(STORY, "")), s.overview.slice(0, 400));
  check("1. kind changed: the Form 7A section shows the new kind", s.form7A.includes("A loan or debt") && !s.form7A.includes(DEFAMATION), s.form7A.slice(0, 400));
  check("1. kind changed: \"What we have so far\" shows the new kind", s.panel.includes("Kind of claim A loan or debt"), s.panel.slice(0, 400));
  check("1. kind changed: the AI's fact text names the new kind", s.ai.includes("Kind of claim: A loan or debt") && !s.ai.includes(DEFAMATION), s.ai);
  check("1. kind changed: \"Check my case file\" does not say no kind is recorded", !s.review.some((finding) => finding.kind === "no-claim-type-confirmed"));
  check("1. kind changed: shown as the person's own answer", line?.held === true && line.label === "Kind of dispute (your answer)", JSON.stringify(line));
}
{
  const s = screens(savedCase(withSections(base, changed({ claimKind: removed() }))));
  check("2. kind removed: the case file holds no kind (not brought back by any older source)", s.held.state !== "answered" && s.held.words === null, JSON.stringify(s.held));
  check("2. kind removed: the removed kind is not proposed in its place", s.held.proposal?.claimTypeId !== DEFAMATION_ID, JSON.stringify(s.held.proposal));
  check("2. kind removed: caseFileOfMaster holds none either", claimKindOf(s.fromMaster).state !== "answered" && claimKindOf(s.fromMaster).proposal?.claimTypeId !== DEFAMATION_ID, JSON.stringify(claimKindOf(s.fromMaster)));
  check("2. kind removed: the overview shows no kind", !s.overview.includes(DEFAMATION) && !/Kind of (?:dispute|claim) (?:\(your answer\)|you chose|you confirmed|this matches)/.test(s.overview), s.overview.slice(0, 400));
  check("2. kind removed: the Form 7A section shows no kind", !s.form7A.includes(DEFAMATION) && !/Kind of claim (?:you|this matches)/.test(s.form7A), s.form7A.slice(0, 400));
  check("2. kind removed: \"What we have so far\" has no kind line", !s.panel.includes("Kind of claim"), s.panel.slice(0, 400));
  check("2. kind removed: the AI's fact text names no kind", !/Kind of claim:/.test(s.ai), s.ai);
  check("2. kind removed: not asked again by itself (the review, the guided questions)", alreadyAsked(s.file, "sc-orient-dispute-category") && !s.stillNeeded.includes("sc-orient-dispute-category"), s.stillNeeded.join(", "));
}

// --- 1 and 2 for every other fact: each held by its older sources, then changed, then removed ------
type FactCase = { fact: SlotFact; court: Area; sections: Record<string, unknown>; master?: Record<string, unknown>; value: unknown; shows: (file: CaseFile) => boolean };
const valueOf = (file: CaseFile, fact: SlotFact) => file[fact].value;
const FACTS: FactCase[] = [
  { fact: "otherParty", court: "civil", sections: { civil: { input: { otherParty: "Jordan Testperson" } }, home: { understoodAnswers: [{ question: "Who is the other party?", answer: "Jordan Testperson" }] } }, value: "Acme Ltd.", shows: (f) => valueOf(f, "otherParty") === "Acme Ltd." },
  { fact: "amount", court: "small-claims", sections: { "small-claims": { input: { amountClaimed: "10000" } }, guided: { earlierAnswers: [{ questionId: "sc-amount-claimed", answerText: "$10,000" }] }, builder: { initialAnswers: { "sc-amount-claimed": "$10,000" } } }, master: { intakeAnswers: [{ questionId: "sc-amount-claimed", answerText: "$10,000" }] }, value: "$4,500", shows: (f) => valueOf(f, "amount") === 4500 },
  { fact: "wants", court: "civil", sections: { civil: { input: { goal: "an apology", legalRemedy: "damages" } } }, value: "Payment of the invoice", shows: (f) => valueOf(f, "wants") === "Payment of the invoice" },
  { fact: "claimKind", court: "civil", sections: { civil: { input: { issues: ["contract"] } } }, master: { intakeData: { courtPath: "civil", extra: { issues: ["contract"] } } }, value: ["debt"], shows: (f) => JSON.stringify(valueOf(f, "claimKind")) === JSON.stringify(["debt"]) },
  { fact: "claimKind", court: "family", sections: { family: { issues: ["divorce"] } }, value: ["child-support"], shows: (f) => JSON.stringify(valueOf(f, "claimKind")) === JSON.stringify(["child-support"]) },
  { fact: "children", court: "family", sections: { builder: { triageState: { record: { caseInvolvesChildren: "yes", haveChildTogether: "yes" } } }, family: { childrenInfo: "Two children" } }, value: false, shows: (f) => valueOf(f, "children") === false },
  { fact: "married", court: "family", sections: { builder: { triageState: { record: { marriedToOtherParty: "yes" } } } }, value: false, shows: (f) => valueOf(f, "married") === false && f.marriedWhere.source?.kind !== "story" },
  { fact: "marriedWhere", court: "family", sections: { builder: { triageState: { record: { marriedToOtherParty: "yes" } } }, family: { placeOfMarriage: "Lisbon" } }, value: "Toronto", shows: (f) => valueOf(f, "marriedWhere") === "Toronto" },
  { fact: "filed", court: "small-claims", sections: { situation: { record: { where: "starting", filed: "something", court: "small-claims" } }, builder: { initialAnswers: { "sc-claim-filed": "Yes" } } }, value: false, shows: (f) => valueOf(f, "filed") === false },
  { fact: "defenceFiled", court: "small-claims", sections: { builder: { initialAnswers: { "sc-defence-filed": "Yes" } }, guided: { earlierAnswers: [{ questionId: "sc-defence-filed", answerText: "Yes" }] } }, value: false, shows: (f) => valueOf(f, "defenceFiled") === false },
  { fact: "whenHappened", court: "small-claims", sections: { builder: { initialAnswers: { "sc-orient-when-happened": "May 3, 2026" } } }, master: { position: { dateAnswers: { "case-date-act-or-omission": "2026-05-03" } } }, value: "June 1, 2026", shows: (f) => caseFileModule.dayOfSlot(f.whenHappened) === "2026-06-01" },
  { fact: "courtDate", court: "family", sections: { family: { upcomingCourtDate: "Trial on March 3, 2027" } }, master: { position: { dateAnswers: { "case-date-trial-date": "2027-03-03" } } }, value: "April 5, 2027", shows: (f) => caseFileModule.dayOfSlot(f.courtDate) === "2027-04-05" },
  { fact: "conferenceDate", court: "family", sections: { family: { upcomingCourtDate: "Case conference on November 16, 2026" } }, value: "December 1, 2026", shows: (f) => caseFileModule.dayOfSlot(f.conferenceDate) === "2026-12-01" },
  { fact: "servedDate", court: "family", sections: { family: { servedDate: "October 1, 2026" } }, value: "October 2, 2026", shows: (f) => caseFileModule.dayOfSlot(f.servedDate) === "2026-10-02" },
  { fact: "outcome", court: "small-claims", sections: { "small-claims": { input: { defendantOutcomeText: "dismissed" } } }, value: "settled", shows: (f) => valueOf(f, "outcome") === "settled" },
  { fact: "urgent", court: "civil", sections: { civil: { input: { urgent: "Hearing next week" } } }, value: "Nothing urgent now", shows: (f) => valueOf(f, "urgent") === "Nothing urgent now" },
];
for (const item of FACTS) {
  const older = checkpointOf(item.court, item.sections);
  const master = (cp: Checkpoint) => ({ intakeCheckpoint: cp, ...(item.master ?? {}) });
  const held = caseFileOf(older, master(older));
  check(`baseline ${item.court} ${item.fact}: an older source holds it`, held[item.fact].state !== "not-asked", JSON.stringify(held[item.fact]));
  const changedFile = caseFileOf(withSections(older, changed({ [item.fact]: answered(item.value) })), master(withSections(older, changed({ [item.fact]: answered(item.value) }))));
  check(`1. ${item.court} ${item.fact}: the change wins over every older source`, changedFile[item.fact].state === "answered" && item.shows(changedFile), JSON.stringify(changedFile[item.fact]));
  const goneCp = withSections(older, changed({ [item.fact]: removed() }));
  const gone = caseFileOf(goneCp, master(goneCp));
  const goneFromMaster = caseFileOfMaster(master(goneCp), item.court);
  check(`2. ${item.court} ${item.fact}: removed beats every older source`, gone[item.fact].state === "not-asked" && gone[item.fact].value === undefined && goneFromMaster[item.fact].state === "not-asked", JSON.stringify(gone[item.fact]));
  check(`2. ${item.court} ${item.fact}: removed is not asked again by itself`, caseFileModule.nextQuestion(gone, [{ otherParty: "otherParty", amount: "amountClaimed", wants: "goal", claimKind: "issues", children: "childrenInfo", married: "married-to-other-party", marriedWhere: "placeOfMarriage", filed: "sc-claim-filed", defenceFiled: "sc-defence-filed", whenHappened: "sc-orient-when-happened", courtDate: "case-date-trial-date", conferenceDate: "case-date-case-conference-date", servedDate: "servedDate", outcome: "defendantOutcomeText", urgent: "urgent" }[item.fact as string] ?? item.fact]) === null);
  // No step-page date comes back from an older answer once the day is removed.
  const days = withCaseFileDates({}, gone, (words) => caseFileModule.dayOfSlot({ state: "answered", value: words, confirmed: true }));
  if (["whenHappened", "courtDate", "conferenceDate", "servedDate"].includes(item.fact)) check(`2. ${item.court} ${item.fact}: removed, no step-page date is filled from an older answer`, !Object.keys(days).some((id) => caseFileModule.slotsOfQuestion(id).includes(item.fact)), JSON.stringify(days));
}
// The overview reads amount, parties and outcome from the analysis copy: a change shows instead, a removal nowhere.
{
  const cp = withSections(base, changed({ otherParty: removed(1), amount: answered("$4,500", 2), wants: removed(3) }));
  const s = screens(savedCase(cp));
  check("2. overview: a removed other party is not shown from the analysis copy", !s.overview.includes("Jordan Testperson and") && !/Parties recorded Jordan Testperson/.test(s.overview), s.overview.slice(0, 500));
  check("1. overview: a changed amount is shown, not the analysis copy's", s.overview.includes("4,500") && !/Amount \$?10,000/.test(s.overview), s.overview.slice(0, 500));
  check("2. overview: a removed outcome is not shown from the analysis copy", !s.overview.includes("an apology"), s.overview.slice(0, 500));
  // The chat's and the AI's fact text (caseRecord.ts), and "Check my case file" (caseReview.ts), read the same change.
  check("2. the AI's fact text (every chat's case context) does not name a removed other party", !s.ai.includes("Jordan Testperson"), s.ai);
  check("1. the AI's fact text gives the changed amount", s.ai.includes("Amount: $4,500"), s.ai);
  const checked = caseFileFromMasterResult(savedCase(cp), "small-claims");
  check("2. \"Check my case file\" reads no removed other party or outcome, and the changed amount", checked.otherParty === "" && checked.goalText === "" && /4,500/.test(checked.amountText), JSON.stringify({ otherParty: checked.otherParty, goal: checked.goalText, amount: checked.amountText }));
}

// --- 3. latest wins ------------------------------------------------------------------------------
{
  const withChange = (caseFileModule as Record<string, unknown>).withChange as undefined | ((changes: unknown, fact: SlotFact, change: unknown, now?: Date) => Record<string, { seq: number; state: string; value?: unknown }>);
  check("3. the one write path exists (caseFile.ts withChange)", typeof withChange === "function");
  if (withChange) {
    const first = withChange({}, "otherParty", { state: "answered", value: "A" }, new Date("2026-10-31T10:00:00Z"));
    const second = withChange(first, "amount", { state: "answered", value: "$5" }, new Date("2026-10-31T10:01:00Z"));
    const third = withChange(second, "otherParty", { state: "removed" }, new Date("2026-10-31T10:02:00Z"));
    check("3. each change is numbered after the last (seq)", first.otherParty.seq === 1 && second.amount.seq === 2 && third.otherParty.seq === 3, JSON.stringify(third));
    const file = caseFileOf(checkpointOf("civil", { civil: { input: { otherParty: "Jordan" } }, caseFile: { changes: third } }));
    check("3. the newest change of a fact is the one kept (removed after answered)", file.otherParty.state === "not-asked" && file.otherParty.removed === true, JSON.stringify(file.otherParty));
    check("3. a removed answer, once changed again, is held again", caseFileOf(checkpointOf("civil", { caseFile: { changes: withChange(third, "otherParty", { state: "answered", value: "B" }) } })).otherParty.value === "B");
  }
  const changeAt = "2026-10-31T12:00:00.000Z";
  const newerPick = caseFileOf(withSections(base, changed({ claimKind: answered("A loan or debt", 1, changeAt) })), savedCase(base, { claimKind: "sc-claim-unpaid-debt-services", claimKindAt: "2026-10-31T13:00:00.000Z" }));
  const olderPick = caseFileOf(withSections(base, changed({ claimKind: answered("A loan or debt", 1, changeAt) })), savedCase(base, { claimKind: "sc-claim-unpaid-debt-services", claimKindAt: "2026-10-31T11:00:00.000Z" }));
  check("3. the overview's pick saved after the change wins (latest change wins)", newerPick.claimKind.value === "sc-claim-unpaid-debt-services", JSON.stringify(newerPick.claimKind));
  check("3. the overview's pick saved before the change loses to it", olderPick.claimKind.value === "A loan or debt", JSON.stringify(olderPick.claimKind));
  const followAnswer = (caseFileModule as Record<string, unknown>).followAnswer as undefined | ((sections: Record<string, unknown>, section: string, key: string, before: unknown, after: unknown) => Record<string, unknown> | null);
  check("3. a later form answer to a changed fact is recorded as the newest change (followAnswer)", typeof followAnswer === "function" && (() => {
    const sections = { civil: { input: { otherParty: "Jordan" } }, caseFile: { changes: { otherParty: answered("Acme", 1) } } };
    const next = followAnswer!(sections, "civil", "input", { otherParty: "Jordan" }, { otherParty: "Beta Corp" });
    const file = caseFileOf(checkpointOf("civil", { ...sections, caseFile: { changes: next } }));
    const untouched = followAnswer!(sections, "civil", "input", { otherParty: "Jordan", goal: "" }, { otherParty: "Jordan", goal: "money" });
    return file.otherParty.value === "Beta Corp" && untouched === null;
  })());
}

// --- 4. a change is a change of a confirmed fact --------------------------------------------------
{
  const scBase = checkpointOf("small-claims", KIND_EVERYWHERE);
  const unknowns = remainingEssentialQuestions(scBase, false).map((question) => question.id);
  const ready = withSections(scBase, { builder: { ...(KIND_EVERYWHERE.builder as object), initialUnknowns: unknowns } });
  const reviewing = transitionReview({}, ready, "review", inputRevision(ready), "2026-10-31T10:00:00Z");
  const confirmed = transitionReview(reviewing, ready, "confirm", inputRevision(ready), "2026-10-31T10:01:00Z");
  check("4. baseline: the intake is confirmed", reviewPhase(confirmed, ready) === "user-confirmed");
  for (const [name, change] of [["changed kind", { claimKind: answered("A loan or debt") }], ["removed kind", { claimKind: removed() }], ["removed other party (held only in the saved copy)", { otherParty: removed() }]] as const) {
    const next = { ...withSections(ready, changed(change as Record<string, unknown>)), revision: REV2 } as Checkpoint;
    check(`4. ${name}: the server's rule sees a confirmed answer changed`, confirmedAnswerChanged(confirmed, ready, next));
    const renewed = applyFactRevisions(confirmed, ready, next);
    const after = renewed ? reconcileReview(confirmed, ready, next, true) : confirmed;
    check(`4. ${name}: applyFactRevisions cancels the confirmation`, renewed && reviewPhase(after, next) !== "user-confirmed", JSON.stringify(after));
    const said = (reviewModule as Record<string, unknown>).changedAfterConfirm as undefined | ((workflow: unknown, checkpoint: Checkpoint) => boolean);
    check(`4. ${name}: the review is told to say "You changed an answer, so please review and confirm again."`, typeof said === "function" && said(after, next) === true);
    // Reloaded before the change reached the saved case, the intake opens collecting (the saved record was
    // confirmed for the older answers): "Stop initial questions and review", or "Return to intake controls",
    // must not drop what the review is told to say (founder's Chrome check of #536, 1 Nov: gone after a reload).
    const collecting = reconcileReview(confirmed, ready, next, false);
    for (const action of ["review", "collect"] as const) {
      const moved = transitionReview(collecting, next, action, inputRevision(next), "2026-11-01T12:00:00.000Z");
      check(`4. ${name}: still said after "${action}" until confirmed again`, typeof said === "function" && said(moved, next) === true, JSON.stringify(moved));
    }
  }
}

// --- 5. a kind turned down or removed is never proposed again -------------------------------------
{
  // A story whose words name the kind, so the story itself proposes it (kindFromStory).
  const LIBEL = { story: { text: "My neighbour posted lies about me on Facebook that damaged my reputation. This is defamation and libel.", location: { city: "Sudbury", province: "Ontario" } } };
  const checkpointOf5 = (court: Area, sections: Record<string, unknown>) => checkpointOf(court, { ...sections, ...LIBEL });
  const story = checkpointOf5("small-claims", {});
  check("5. baseline: the story proposes defamation", claimKindOf(caseFileOf(story)).proposal?.claimTypeId === DEFAMATION_ID, JSON.stringify(claimKindOf(caseFileOf(story)).proposal));
  const rejected = checkpointOf5("small-claims", { guided: { rejectedSuggestionIds: [DEFAMATION_ID] } });
  check("5. turned down in the guided questions: not proposed from the story", claimKindOf(caseFileOf(rejected)).proposal?.claimTypeId !== DEFAMATION_ID, JSON.stringify(claimKindOf(caseFileOf(rejected)).proposal));
  const kept = checkpointOf5("small-claims", { guided: { rejectedSuggestionIds: [] }, caseFile: { turnedDown: { claimKind: [DEFAMATION_ID] } } });
  check("5. turned down, then the guided record reset: still not proposed (the case file keeps it)", claimKindOf(caseFileOf(kept)).proposal?.claimTypeId !== DEFAMATION_ID, JSON.stringify(claimKindOf(caseFileOf(kept)).proposal));
  const storedMatch = checkpointOf5("small-claims", { guided: { matchedClaimType: { claimTypeId: DEFAMATION_ID, userConfirmed: false }, pendingSuggestion: { claimTypeId: DEFAMATION_ID } }, caseFile: { turnedDown: { claimKind: [DEFAMATION_ID] } } });
  const storedFile = caseFileOf(storedMatch);
  check("5. an unticked stored match of a turned-down kind is not proposed", claimKindOf(storedFile).proposal === null, JSON.stringify(claimKindOf(storedFile).proposal));
  check("5. a waiting suggestion of a turned-down kind is not offered", storedFile.claimKindPending === undefined, JSON.stringify(storedFile.claimKindPending));
  check("5. the review does not suggest a turned-down kind", suggestInitialAnswers(kept)["sc-orient-dispute-category"] !== DEFAMATION, JSON.stringify(suggestInitialAnswers(kept)));
  check("5. the review does not suggest a removed kind", suggestInitialAnswers(withSections(story, changed({ claimKind: removed() })))["sc-orient-dispute-category"] === undefined);
  const libelBase = withSections(base, LIBEL);
  const removedHeld = caseFileOf(withSections(libelBase, changed({ claimKind: removed() })), savedCase(libelBase));
  check("5. a removed kind is never proposed (claimKindOf)", claimKindOf(removedHeld).proposal?.claimTypeId !== DEFAMATION_ID && (removedHeld.claimKindRemoved ?? []).includes(DEFAMATION_ID), JSON.stringify({ proposal: claimKindOf(removedHeld).proposal, removed: removedHeld.claimKindRemoved }));
}

check("every slot fact is covered by a change test", SLOT_FACTS.filter((fact) => !["side", "court", "stage", "papers"].includes(fact)).every((fact) => FACTS.some((item) => item.fact === fact)), SLOT_FACTS.filter((fact) => !FACTS.some((item) => item.fact === fact)).join(", "));

console.log(failures ? `\n${failures} check(s) failed` : "\nAll change-path checks passed");
process.exit(failures ? 1 : 0);
