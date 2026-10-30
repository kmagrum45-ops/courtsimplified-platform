/**
 * CLAIM TYPE: ONE FACT, ONE VALUE ON EVERY SCREEN (site owner, 29 Oct; the first fact moved into
 * the case file).
 *
 * The owner's acceptance test: "One fact with a source (person said it, read from the story, or
 * confirmed). If the person gave it or chose a route that implies it, it counts. A separate
 * 'confirmed' flag must not block checklists or any screen." On the live site the overview said
 * "Kind of dispute (your answer): Something said about you (defamation)" while "Check my case
 * file" said "You haven't confirmed what kind of claim this is", the review listed "What kind of
 * dispute is this?" as still needed and "Preparing your Plaintiff's Claim (Form 7A)" said "A claim
 * type has not been confirmed". All must read the same value.
 *
 * Each case below is a saved case (master_result with its intake checkpoint) shaped as the real save
 * path writes it. For each, every screen and reader that shows or asks the kind of claim is run
 * through its own code -- the overview (IntelligenceOverviewPanel, rendered), "What we have so far"
 * (CaseFilePanel, rendered), the Form 7A section (StatementOfClaimSurface, rendered), "Check my case
 * file" (caseFileFromMasterResult + deterministicFindings, as /api/case/review runs them), the
 * review's "Still needed" list (remainingEssentialQuestions, with the saved case as IntakeReviewPanel
 * and the Confirm route pass it), the guided route's ask-once gate (alreadyAsked), and the AI's fact
 * text (caseFactsText(readCaseRecord), sent by /api/assistant/law and /api/case/strategy) -- and
 * the property asserted: when the case file holds a kind, every one of them shows the SAME words and
 * none asks; when it holds none, none claims one. A kind the site made (the story match, the
 * classifier) is a proposal: never held until ticked, never over the person's answer.
 *
 * Cases: the owner's defamation flow (Small Claims, a case already going, noted in default, the
 * guided answer), a pick from the overview's list, a ticked suggestion, an AI proposal beside the
 * person's answer, an older saved case (only the old keys: extra.confirmedClaimTypeId and
 * claimTypeUserConfirmed, no checkpoint), an older unticked match, a fresh case with nothing, civil
 * and Family (the issues picked: route-implied).
 *
 * Every Small Claims route (site owner, 30 Oct): the questions one at a time, the review alone
 * ("Show my next step" from the chooser) and the whole form ("Fill in the form yourself") each save
 * the case differently; each saved shape is run through every screen above, and the builder's own
 * source is checked so the Form 7A section is drawn on every Small Claims route from the case file
 * alone (its render depends on no route's own state, and it takes no fact but the case file).
 *
 * Failure it exists to catch: any screen reading the kind of claim from its own copy again, or the
 * Form 7A section drawn on one route only (it was, from the questions one at a time's own copy).
 */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { caseFileOf, claimKindOf, claimKindLine, alreadyAsked, type CaseFile } from "../../src/lib/case-system/caseFile/caseFile";
import { caseFileOfMaster } from "../../src/lib/case-system/caseFile/caseFileOfMaster";
import { readCheckpoint, type Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { remainingEssentialQuestions, transitionReview } from "../../src/lib/case-system/intakeReview";
import { caseFileFromMasterResult, deterministicFindings } from "../../src/lib/case-system/caseReview/caseReview";
import { caseFactsText, readCaseRecord } from "../../src/lib/case-system/caseRecord";
import IntelligenceOverviewPanel from "../../app/builder/_components/IntelligenceOverviewPanel";
import StatementOfClaimSurface from "../../app/builder/_components/StatementOfClaimSurface";
import CaseFilePanel from "../../app/cases/_components/CaseFilePanel";
import { inWords } from "../../src/lib/case-system/copy/rawKeys";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const FLOW = "00000000-0000-4000-8000-0000000000c1";
const REVISION = "00000000-0000-4000-8000-0000000000c2";
const DEFAMATION_STORY = "My former coworker Jordan Testperson sent text messages about me to our manager and three coworkers in May 2026 saying I stole money from the till, which is false. I lost shifts and I have been anxious and unable to sleep. I issued a Small Claims claim against him on June 20, 2026 and he was served on June 23, 2026. He never filed a defence and he was noted in default. There is no order yet. I am claiming $10,000 for defamation and emotional distress. I have screenshots of the texts.";
const DEFAMATION_WORDS = "Something said about you (defamation)";

type Area = "small-claims" | "civil" | "family";
const checkpointOf = (court: Area, sections: Record<string, unknown>): Checkpoint => ({
  version: 1, flowId: FLOW, courtPath: court, revision: REVISION, sections: { story: { text: DEFAMATION_STORY, location: { city: "Sudbury", province: "Ontario" } }, ...sections },
} as unknown as Checkpoint);
/** A saved case as the builder's save writes it: the checkpoint, the analysis copy (intakeData) and the guided answers' copy. */
const savedCase = (checkpoint: Checkpoint | null, extra: Record<string, unknown> = {}, more: Record<string, unknown> = {}) => ({
  ...(checkpoint ? { intakeCheckpoint: checkpoint } : {}),
  intakeData: { courtPath: checkpoint?.courtPath ?? "small-claims", facts: DEFAMATION_STORY, caseStage: "already-started", yourName: "", otherParty: "Jordan Testperson", timeline: "", evidence: "screenshots of the texts", goal: "", extra: { yourRole: "plaintiff", amountClaimed: "10000", filedDocuments: ["plaintiffs-claim"], ...extra } },
  workflowStatus: { intakeCompleted: true },
  ...more,
});
/** The owner's flow: Small Claims, a case already going, the defendant noted in default (the situation answers). */
const GOING_NOTED: Record<string, unknown> = { situation: { record: { where: "going", started: "me", court: "small-claims", stage: "plaintiff:defendant-noted-in-default" } } };
/** The guided route's answer to "What kind of dispute is this?", as GuidedSmallClaimsIntake keeps it. */
const GUIDED_DEFAMATION = { guided: { answeredIds: ["sc-orient-dispute-category"], facts: { role: "plaintiff", disputeCategory: "defamation" }, earlierAnswers: [{ questionId: "sc-orient-dispute-category", answerText: DEFAMATION_WORDS }] }, builder: { step: "guided" } };

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&ldquo;|&rdquo;/g, '"').replace(/\s+/g, " ").trim();
const ANALYSIS = { courtPath: "small-claims", caseStage: "already-started", completedForms: [], receivedForms: [], requiredNextForms: [], notNeededNow: [], detectedIssues: [], inferredFacts: [], missingInformation: [], risksAndGaps: [], guidance: [], summary: "", legalIssues: [], detectedClaimTypes: [], research: { findings: [] }, appliedLaw: [] } as never;

/** What every screen shows or asks for the kind of claim, each through its own code. */
function screens(master: Record<string, unknown>, court: Area = "small-claims") {
  const checkpoint = readCheckpoint(master.intakeCheckpoint, court);
  // The pages build the case file this way (app/builder/page.tsx, app/cases/[id]/page.tsx).
  const file: CaseFile = caseFileOf(checkpoint, master);
  const held = claimKindOf(file, inWords);
  const overview = text(renderToStaticMarkup(createElement(IntelligenceOverviewPanel, { analysis: { ...(ANALYSIS as object), courtPath: court } as never, intake: (master.intakeData ?? null) as never, confirmedStage: "already-started" as never, caseId: null, claimKind: held })));
  // The Form 7A section as the builder draws it on every Small Claims route: from the same case file.
  const form7A = court === "small-claims" ? text(renderToStaticMarkup(createElement(StatementOfClaimSurface, { caseFile: file }))) : "";
  const caseFilePanel = text(renderToStaticMarkup(createElement(CaseFilePanel, { file, changeHref: "/b", situationHref: "/s", stepHref: "/t" })));
  const review = deterministicFindings(caseFileFromMasterResult(master, court));
  const stillNeeded = checkpoint ? remainingEssentialQuestions(checkpoint, true, master).map((question) => question.id) : [];
  const aiText = caseFactsText(readCaseRecord(master, court));
  return { file, held, overview, form7A, caseFilePanel, review, stillNeeded, aiText, checkpoint };
}

/** The property: held, every screen shows these words and none asks; not held, none claims a held kind. */
function agrees(name: string, master: Record<string, unknown>, expected: string | null, court: Area = "small-claims") {
  const s = screens(master, court);
  const line = claimKindLine(s.held);
  if (expected) {
    check(`${name}: the case file holds the kind ("${expected}")`, s.held.state === "answered" && line?.words === expected, JSON.stringify(s.held));
    if (court === "small-claims") {
      check(`${name}: the overview shows it, and does not ask`, s.overview.includes(expected) && !s.overview.includes("Which kind of claim is this?"), s.overview.slice(0, 400));
      check(`${name}: the Form 7A section shows it, and never "has not been confirmed"`, s.form7A.includes(expected) && !/has not been confirmed/i.test(s.form7A), s.form7A.slice(0, 300));
      check(`${name}: "Check my case file" does not say the kind is not confirmed`, !s.review.some((finding) => finding.kind === "no-claim-type-confirmed"), s.review.map((finding) => finding.text).join(" | "));
      check(`${name}: the review does not list "What kind of dispute is this?"`, !s.stillNeeded.includes("sc-orient-dispute-category"), s.stillNeeded.join(", "));
      check(`${name}: the guided questions do not ask it again`, alreadyAsked(s.file, "sc-orient-dispute-category"));
      check(`${name}: the AI's fact text names the same kind`, s.aiText.includes(`Kind of claim: ${expected}`), s.aiText);
    }
    check(`${name}: "What we have so far" shows the same words`, s.caseFilePanel.includes(`Kind of claim ${expected}`), s.caseFilePanel.slice(0, 400));
  } else {
    check(`${name}: the case file holds no kind`, s.held.state !== "answered", JSON.stringify(s.held));
    check(`${name}: "Check my case file" says no kind is recorded (agrees)`, s.review.some((finding) => finding.kind === "no-claim-type-confirmed"));
    check(`${name}: the AI's fact text claims no kind`, !/Kind of claim:/.test(s.aiText), s.aiText);
    check(`${name}: the overview claims no kind as the person's`, !/Kind of (?:dispute \(your answer\)|claim you (?:chose|confirmed))/.test(s.overview), s.overview.slice(0, 300));
    check(`${name}: the Form 7A section claims no kind as the person's`, !/Kind of (?:dispute \(your answer\)|claim you (?:chose|confirmed))/.test(s.form7A), s.form7A.slice(0, 300));
  }
  return s;
}

// 1. The owner's defamation flow: Small Claims, case already going, noted in default; the guided answer.
const owner = savedCase(checkpointOf("small-claims", { ...GOING_NOTED, ...GUIDED_DEFAMATION }), {}, { intakeAnswers: GUIDED_DEFAMATION.guided.earlierAnswers });
const ownerScreens = agrees("owner's defamation flow", owner, DEFAMATION_WORDS);
check("owner's defamation flow: the answer is the person's own (source person-said)", ownerScreens.held.source === "person-said");
check("owner's defamation flow: the answer names the catalogue's defamation kind, so its checklist follows", ownerScreens.held.claimTypeId === "sc-claim-defamation-libel-slander");
check("owner's defamation flow: Confirm is not refused for the kind (the server's check reads the same file)", (() => { try { transitionReview({ intakeReview: { version: 1, reviewedRevision: REVISION } }, ownerScreens.checkpoint!, "confirm", REVISION, "2026-10-29T00:00:00Z", owner); return true; } catch { return !remainingEssentialQuestions(ownerScreens.checkpoint!, false, owner).some((question) => question.id === "sc-orient-dispute-category"); } })());

// 1b. The same answer given in the review panel instead of the guided questions (the review route).
agrees("review route answer", savedCase(checkpointOf("small-claims", { ...GOING_NOTED, builder: { initialAnswers: { "sc-orient-dispute-category": DEFAMATION_WORDS } } })), DEFAMATION_WORDS);

// 2. A kind picked from the overview's list (saved to the case's position): every screen, and the review, read it.
const picked = savedCase(checkpointOf("small-claims", GOING_NOTED), {}, { position: { claimKind: "sc-claim-defamation-libel-slander" } });
const pickedScreens = agrees("picked on the overview", picked, "Defamation (libel or slander)");
check("picked on the overview: shown as the person's choice", pickedScreens.overview.includes("Kind of claim you chose"));

// 3. A suggestion the person ticked on the guided route.
const ticked = savedCase(checkpointOf("small-claims", { ...GOING_NOTED, guided: { matchedClaimType: { claimTypeId: "sc-claim-defamation-libel-slander", claimTypeName: "Defamation", userConfirmed: true } } }));
const tickedScreens = agrees("ticked suggestion", ticked, "Defamation (libel or slander)");
check("ticked suggestion: source confirmed", tickedScreens.held.source === "confirmed");

// 4. A proposal never overrides the person's answer (an AI or story match of another kind, unticked).
const both = savedCase(checkpointOf("small-claims", { ...GOING_NOTED, guided: { ...GUIDED_DEFAMATION.guided, matchedClaimType: { claimTypeId: "sc-claim-unpaid-debt-services", claimTypeName: "Unpaid debt", userConfirmed: false } }, builder: { step: "guided" } }), { confirmedClaimTypeId: "sc-claim-unpaid-debt-services" });
const bothScreens = agrees("person's answer beside an unticked proposal", both, DEFAMATION_WORDS);
check("person's answer beside an unticked proposal: no proposal is offered over it", bothScreens.held.proposal === null);

// 5. An older saved case: no checkpoint, only the old keys (extra.confirmedClaimTypeId, claimTypeUserConfirmed).
const older = savedCase(null, { confirmedClaimTypeId: "sc-claim-defamation-libel-slander", claimTypeUserConfirmed: true, claimTypeQuote: "sent text messages about me" });
agrees("older saved case (old keys, ticked)", older, "Defamation (libel or slander)");
// 5b. Older, its answer only in the saved copy of the guided answers (no checkpoint).
agrees("older saved case (guided answers only)", savedCase(null, {}, { intakeAnswers: GUIDED_DEFAMATION.guided.earlierAnswers }), DEFAMATION_WORDS);
// 5c. Older, unticked: a proposal on every screen, never the person's.
const olderUnticked = savedCase(null, { confirmedClaimTypeId: "sc-claim-defamation-libel-slander", claimTypeUserConfirmed: false, claimTypeQuote: "sent text messages about me" });
const unticked = agrees("older saved case (old keys, unticked)", olderUnticked, null);
check("older saved case (unticked): offered as a proposal with the story's words", unticked.held.proposal?.claimTypeId === "sc-claim-defamation-libel-slander" && unticked.overview.includes("Kind of claim this matches"));

// 6. A fresh case: nothing given and nothing in the story names a kind.
const fresh = savedCase(checkpointOf("small-claims", { situation: { record: { where: "starting", started: "me", filed: "nothing", court: "small-claims" } }, story: { text: "Test Decks Ltd. owes me money for a deck. I have the contract." } }));
(fresh.intakeData as Record<string, unknown>).facts = "Test Decks Ltd. owes me money for a deck. I have the contract.";
const freshScreens = agrees("fresh case, nothing given", fresh, null);
check("fresh case: the review asks the kind (it is not held)", freshScreens.stillNeeded.includes("sc-orient-dispute-category"), freshScreens.stillNeeded.join(", "));

// 7. Civil and Family: the issues picked on the area's form choose the route (route-implied), shown once in words.
// Each choice in the form's own words (rawKeys.ts inWords), as "What we have so far" shows a list.
const civilCase = savedCase(checkpointOf("civil", { civil: { input: { issues: ["defamation"] } } }));
const civil = agrees("civil issues picked", civilCase, claimKindOf(caseFileOfMaster(civilCase, "civil"), inWords).words ?? "?", "civil");
check("civil issues picked: source route-implied", civil.held.source === "route-implied");
const familyCase = savedCase(checkpointOf("family", { family: { issues: ["child-support"] } }));
const family = agrees("Family issues picked", familyCase, claimKindOf(caseFileOfMaster(familyCase, "family"), inWords).words ?? "?", "family");
check("Family issues picked: source route-implied", family.held.source === "route-implied");

// 8. Every Small Claims route, as each saves the case: the review alone ("Show my next step" from the
// chooser runs the form), the whole form, the questions one at a time (1 above). Signed in or a guest
// saves the same checkpoint (the guest's in the browser, then carried), so the shapes are the same.
const reviewAlone = savedCase(checkpointOf("small-claims", { ...GOING_NOTED, builder: { step: "form", initialAnswers: { "sc-orient-dispute-category": DEFAMATION_WORDS } } }));
agrees("review alone route (Show my next step)", reviewAlone, DEFAMATION_WORDS);
const wholeForm = savedCase(checkpointOf("small-claims", { ...GOING_NOTED, builder: { step: "form", initialAnswers: { "sc-orient-dispute-category": DEFAMATION_WORDS } }, "small-claims": { input: { facts: DEFAMATION_STORY, amountClaimed: "10000", otherParty: "Jordan Testperson", filedDocuments: ["plaintiffs-claim"] } } }));
agrees("whole form route", wholeForm, DEFAMATION_WORDS);
const wholeFormPicked = savedCase(checkpointOf("small-claims", { ...GOING_NOTED, builder: { step: "form" }, "small-claims": { input: { facts: DEFAMATION_STORY } } }), {}, { position: { claimKind: "sc-claim-defamation-libel-slander" } });
agrees("whole form route, kind picked on the overview", wholeFormPicked, "Defamation (libel or slander)");
// A fresh case on the whole form: the section is drawn and claims no kind as the person's.
const freshForm = savedCase(checkpointOf("small-claims", { situation: { record: { where: "starting", started: "me", filed: "nothing", court: "small-claims" } }, story: { text: "Test Decks Ltd. owes me money for a deck. I have the contract." }, builder: { step: "form" } }));
const freshFormScreens = agrees("fresh case, whole form route", freshForm, null);
check("fresh case, whole form route: the Form 7A section is drawn (says no kind is recorded yet)", /Form 7A/.test(freshFormScreens.form7A) && /No kind of claim is recorded/.test(freshFormScreens.form7A), freshFormScreens.form7A.slice(0, 200));

// 9. The builder draws the Form 7A section on every Small Claims route, from the case file alone.
const strip = (source: string) => source.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const builder = strip(readFileSync("app/builder/page.tsx", "utf8"));
const renderAt = builder.indexOf("<StatementOfClaimSurface");
const opening = builder.lastIndexOf("{", renderAt);
const condition = builder.slice(opening, renderAt);
const element = builder.slice(renderAt, builder.indexOf("/>", renderAt));
const ROUTE_STATE = ["draftInput", "smallClaimsMode", "visibleMode", "startedModes", "lastGuidedResult", "guidedAnalyzing", "handleGuidedComplete", "stepParam"];
check("builder: the Form 7A section's render depends on no one route's own state", renderAt > 0 && !ROUTE_STATE.some((name) => condition.includes(name)), condition.trim());
check("builder: the Form 7A section is drawn for Small Claims (the court, not the route, decides)", /courtPath === "small-claims"/.test(condition), condition.trim());
check("builder: the Form 7A section is given the case file, and the same file the overview's kind comes from", /caseFile=\{builderCaseFile\}/.test(element) && /claimKindOf\(builderCaseFile\)/.test(builder), element);
check("builder: the Form 7A section is given no fact of its own (no mappedInput, no claim kind copy)", !/mappedInput=|claimKind=|draftInput/.test(element), element);
const surface = strip(readFileSync("app/builder/_components/StatementOfClaimSurface.tsx", "utf8"));
const props = /export type StatementOfClaimSurfaceProps = \{([\s\S]*?)\r?\n\};/.exec(surface)?.[1] ?? "";
const propNames = [...props.matchAll(/^\s*(\w+)\??:/gm)].map((match) => match[1]);
check("the Form 7A section takes its facts from the case file only (its props: the case file, this visit's element record, a callback)", propNames.length > 0 && propNames.every((name) => ["caseFile", "elementStatesThisVisit", "onStateMapChange"].includes(name)), propNames.join(", "));

if (failures) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nClaim type: every screen reads the one value from the case file.");
