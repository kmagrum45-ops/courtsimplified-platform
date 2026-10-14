/**
 * Asserts that during intake nothing renders between the question and the
 * answer box.
 *
 * COSTS NOTHING. A source-order check over GuidedSmallClaimsIntake.tsx — the
 * property is about JSX placement, so it is checkable statically.
 *
 * THE DEFECT THIS PINS. Both education panels used to render between the
 * message list (which carries the question) and the textarea, and they appeared
 * the moment a claim type was confirmed, then stayed for every remaining turn.
 * For defamation that is roughly 840 words of general information — the $50,000
 * limit, limitation periods, burden of proof, demand letters, Form 7A,
 * enforcement, remedies, evidence categories — between "here is the question"
 * and "type your answer".
 *
 * The rule now: message list, QuestionHelp, input. Education lives below the
 * input, collapsed during intake.
 *
 * AND ONE QUESTION AT A TIME (2026-10-13, V3): while the claim-type
 * suggestion waits, the question that arrived with it is held back, and every
 * opening question says why it is asked, in words that state no law unless
 * sourced.
 *
 * AND ENFORCEMENT LEADS WITH THE JUDGMENT (walkthrough run 38593464953, SJ):
 * the form intake for someone enforcing a judgment led with "kind of claim
 * not clear yet" and kept the claim-building fields in front. (Review of
 * 859efbb) a contract, tender, bid, appeal or custody story read as a
 * judgment to enforce, or the story's reading sent to the analysis while the
 * Case stage dropdown said something else.
 *
 * Run: node --import tsx scripts/verification/verifyIntakeSequencing.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { unansweredQuestionStart } from "../../app/builder/_components/heldQuestion";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import {
  CLAIM_FIELDS_FOLDED_SUMMARY,
  ENFORCEMENT_DIRECTION,
  buildCaseDirection,
  buildMissingPrompt,
  enforcementShown,
  enforcementSuggested,
  inferStage,
  judgmentUnpaidFromStory,
} from "../../app/builder/_components/smallClaimsIntakeReading";
import type { SmallClaimsIntelligenceInput } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";

const ROOT = path.join(__dirname, "..", "..");

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const SOURCE = readFileSync(
  path.join(
    __dirname,
    "..",
    "..",
    "app",
    "builder",
    "_components",
    "GuidedSmallClaimsIntake.tsx",
  ),
  "utf8",
);

/** Source offset of the component's RENDER, so helper definitions above it
 * (GuidanceDisclosure's own JSX) are not mistaken for the main render tree. */
const RENDER_START = SOURCE.indexOf("export default function GuidedSmallClaimsIntake");

function offsetInRender(needle: string): number {
  const at = SOURCE.indexOf(needle, RENDER_START);
  return at === -1 ? -1 : at;
}

/**
 * ONE QUESTION AT A TIME, EACH WITH ITS REASON (walkthrough 2026-10-13, V3).
 *
 * The claim-type suggestion ("This sounds like it may be about: ... — is that
 * right?") arrived in the same turn as "Roughly when did the situation that
 * led to this claim happen?", and both were on screen with one answer box;
 * the timing question said nothing about why it is asked. The properties:
 *
 *   - while the suggestion waits, the question it came with is held back
 *     (its message, its help and the answer box), and nothing the person
 *     already answered is ever hidden;
 *   - the suggestion says why it is asked, and can be passed without
 *     applying anything (suggest, never decide);
 *   - every opening (orientation) question in the bank carries a reason, and
 *     a plain reason (`whyAsked`, which needs no source) states no law.
 */
/*
 * ENFORCEMENT LEADS WITH THE JUDGMENT, AS A SUGGESTION (walkthrough run
 * 38593464953, SJ; review of 859efbb). Once the form intake knew the person
 * was enforcing a judgment, it led with "enforcement · kind of claim not clear
 * yet" and kept the claim-building fields. Now the heading suggests the
 * judgment and says how to change it, the claim-building fields are folded,
 * nothing still-to-add asks for evidence or the claim's arithmetic -- and the
 * story's reading is never what is sent: only the Case stage dropdown is.
 * Behaviour checks on the real functions (smallClaimsIntakeReading.ts).
 */
function checkEnforcementIntake(): void {
  const blank = {
    caseStage: "not-sure",
    issues: [],
    filedDocuments: [],
    uploadedEvidenceFiles: [],
    yourName: "",
    yourAddress: "",
    yourCity: "",
    yourProvince: "",
    yourPostalCode: "",
    yourPhone: "",
    yourEmail: "",
    otherParty: "",
    otherPartyPhone: "",
    otherPartyEmail: "",
    yourRole: "Plaintiff / claimant",
    courtLocation: "",
    claimNumber: "",
    amountClaimed: "",
    defendantAddress: "",
    agreementDetails: "",
    paymentHistory: "",
    damagesBreakdown: "",
    serviceDetails: "",
    deadlineDetails: "",
    facts: "",
    timeline: "",
    evidence: "",
    missingEvidence: "",
    settlementEfforts: "",
    defenceResponse: "",
    goal: "",
    urgent: "",
  } as unknown as SmallClaimsIntelligenceInput;
  const withStory = (facts: string, caseStage = "not-sure") => ({ ...blank, facts, caseStage }) as SmallClaimsIntelligenceInput;

  const sj = "i won my small claims case against my old roommate in may, the judge said he owes me 6500 plus costs. its been months and he hasnt paid anything. he works at a car dealership in kanata i think";
  check("SJ: the story is a court win not paid", judgmentUnpaidFromStory(sj));
  const notEnforcement = [
    "we won the contract to renovate their kitchen and the client hasnt paid the last invoice",
    "we won the tender but they never paid us",
    "i won the bid on ebay and lent him the money, he never paid back",
    "i won the case but he appealed, he hasnt paid",
    "the court awarded me custody and he hasnt paid child support",
    "the judge ordered me to pay him 2000 and i havent paid yet",
    "there is a judgment against me and i havent paid it",
    "my tenant hasnt paid rent for three months",
    "i won the lottery",
  ].filter(judgmentUnpaidFromStory);
  check("never a contract, tender or bid win, an appeal, a custody order, the other side's judgment, or an unpaid debt with no court win", notEnforcement.length === 0, notEnforcement.join(" | "));
  check("'won in court' and 'judgment' with money unpaid are a court win", judgmentUnpaidFromStory("we won in court last spring and they still havent paid") && judgmentUnpaidFromStory("i have a judgment for 4000 and it is unpaid"));

  // The heading: a suggestion, with the way to change it; for the dropdown's enforcement too.
  const suggested = buildCaseDirection(withStory(sj));
  check("SJ, Case stage 'Not sure': the heading suggests the judgment and says how to change it", suggested === ENFORCEMENT_DIRECTION && /^So far this looks like: /.test(suggested) && /Not right\? Choose your stage under Case stage\./.test(suggested), suggested);
  check("Case stage 'Enforcement': the same heading, never 'kind of claim not clear yet'", buildCaseDirection(withStory("he still owes me", "enforcement")) === ENFORCEMENT_DIRECTION);
  check("a contract story keeps the claim heading", /^So far this looks like: starting case · /.test(buildCaseDirection(withStory("we won the tender but they never paid us"))));
  check("no story, no heading", buildCaseDirection(blank) === "");

  // What is sent: only the dropdown (and documents), never the story's reading.
  check("SJ with Case stage 'Not sure': the stage sent is not enforcement; it is offered instead", inferStage(withStory(sj)) !== "enforcement" && enforcementSuggested(withStory(sj)));
  check("Case stage 'Enforcement' is sent as enforcement, with nothing left to offer", inferStage(withStory(sj, "enforcement")) === "enforcement" && !enforcementSuggested(withStory(sj, "enforcement")));
  check("a dropdown set to another stage wins: no enforcement heading, nothing offered", !enforcementShown(withStory(sj, "starting-case")) && !enforcementSuggested(withStory(sj, "starting-case")));

  const asked = buildMissingPrompt(withStory(sj));
  check("still to add, when enforcement is shown: never evidence or how the amount was calculated; the date of the judgment", !/evidence|calculated|amount claimed/i.test(asked) && /date of the judgment/.test(asked), asked);
  check("a claim story still asks for evidence", /what evidence you have/.test(buildMissingPrompt(withStory("he owes me 900 for the couch"))));

  // JSX placement (as the rest of this suite): every claim-building field sits inside the fold.
  const form = readFileSync(path.join(ROOT, "app/builder/_components/SmallClaimsIntake.tsx"), "utf8");
  const open = form.indexOf("<ClaimFieldsFold enforcing={enforcing}>");
  const close = form.indexOf("</ClaimFieldsFold>");
  const outside = ["sc-intake-evidence\"", "sc-intake-missingEvidence\"", "sc-intake-goal\"", "sc-intake-amountClaimed\"", "sc-intake-damagesBreakdown\""].filter((id) => {
    const at = form.indexOf(`data-testid="${id}`);
    return !(at > open && at < close);
  });
  check("every claim-building field is inside the fold", open > -1 && close > open && outside.length === 0, outside.join(", "));
  check("the fold is named as optional", /optional/i.test(CLAIM_FIELDS_FOLDED_SUMMARY));
}

function checkOneQuestionAtATime(): void {
  const intro = "INTRO";
  const story = { from: "user" as const, text: "my story" };
  const question = { from: "assistant" as const, text: "When?", isQuestion: true };
  const introMessage = { from: "assistant" as const, text: intro };

  check(
    "V3: the waiting question is held back with the intro it came with",
    unansweredQuestionStart([story, introMessage, question], intro) === 1,
  );
  check(
    "V3: a waiting question without the intro is held back alone",
    unansweredQuestionStart([story, { from: "assistant", text: "ok" }, question], intro) === 2,
  );
  check(
    "V3: a question the person already answered is never held back",
    unansweredQuestionStart([story, question, { from: "user", text: "May" }], intro) === 3,
  );
  check("V3: with no question waiting, nothing is held back", unansweredQuestionStart([story], intro) === 1);
  check("V3: an empty transcript holds nothing back", unansweredQuestionStart([], intro) === 0);

  const render = SOURCE.slice(RENDER_START);
  const flag = /const (\w+) = [^;]*Boolean\(pendingSuggestion\)/.exec(render)?.[1] ?? "";
  check("V3: the page knows when the claim-type suggestion is waiting", flag !== "");
  if (flag) {
    // Names are not pinned (CLAUDE.md s. 5): whatever the end of the shown
    // transcript is called, it must come from unansweredQuestionStart while
    // the suggestion waits, and be where the message list stops. What that
    // function holds back is asserted by running it, above.
    const word = (name: string) => new RegExp(`\\b${name}\\b`);
    const cut = /const (\w+) = ([^;]*\bunansweredQuestionStart\(messages[^;]*);/.exec(render);
    check(
      "V3: the transcript stops before the held question while the suggestion waits",
      cut !== null &&
        word(flag).test(cut[2]) &&
        new RegExp(`messages\\.slice\\(0, ${cut[1]}\\)\\.map\\(`).test(render),
      cut ? `end of transcript: ${cut[1]} = ${cut[2]}` : "nothing computes where the shown transcript ends",
    );
    // The condition guarding each is the JSX expression just before it.
    const guardOf = (tag: string) => {
      const at = render.indexOf(tag);
      const open = render.lastIndexOf("{", at);
      return at < 0 || open < 0 ? "" : render.slice(open, at);
    };
    check("V3: the held question's help is not shown while the suggestion waits", word(flag).test(guardOf("<QuestionHelp")), guardOf("<QuestionHelp"));
    const inputGuard = render.slice(render.lastIndexOf("{!halted", render.indexOf("<textarea")), render.indexOf("<textarea"));
    check("V3: no answer box while the suggestion waits", word(flag).test(inputGuard), inputGuard);
  }
  const box = render.slice(render.indexOf("This sounds like it may be about"), render.indexOf("noClaimTypeMatch ? ("));
  check("V3: the claim-type suggestion says why it is asked", /Why we ask/.test(box));
  // Confirming sets the claim type the drafts and depth questions use; a
  // reason that says it changes nothing else would be untrue (review 2026-10-13).
  check(
    "V3: the suggestion's reason does not claim the answer changes nothing",
    !/changes? nothing|no effect|does(?:n't| not) change anything/i.test(box.replace(/\s+/g, " ")),
  );
  check(
    "V3: the suggestion can be passed without applying anything",
    /onClick=\{\(\) => \{\s*setPendingSuggestion\(null\);/.test(box) && /skip/i.test(box),
  );
  check(
    "V3: a question with a plain reason shows it",
    /question\?\.whyAsked/.test(SOURCE) && /Why we ask: /.test(SOURCE.slice(SOURCE.indexOf("function QuestionHelp"), RENDER_START)),
  );

  const opening = QUESTION_BANK.filter((item) => item.phase === "orientation");
  const unexplained = opening.filter((item) => !item.why?.trim() && !item.whyAsked?.trim()).map((item) => item.id);
  check("V3: every opening question says why it is asked", opening.length > 0 && unexplained.length === 0, unexplained.join(", "));

  // A plain reason needs no source, so it must not state law. Anything that
  // names a rule, a provision, a time limit or what a court requires belongs
  // in `why` with its sourceUrl.
  const LAW = /\b(?:rules?|s\.\s*\d|sections?|Act|Reg\.|regulations?|deadlines?|limitation|days?|months?|years?|must|required|requires|entitled|the court (?:will|can|may))\b/;
  const lawful = QUESTION_BANK.filter((item) => item.whyAsked && LAW.test(item.whyAsked)).map((item) => `${item.id}: ${item.whyAsked}`);
  check("V3: no plain reason states law", lawful.length === 0, lawful.join("\n      "));
  const both = QUESTION_BANK.filter((item) => item.whyAsked && item.why).map((item) => item.id);
  check("V3: a question has one reason, not a sourced one and a plain one", both.length === 0, both.join(", "));
}

function main(): void {
  check("found the component render", RENDER_START > -1);

  const messagesMatch = /messages(?:\.slice\([^)]*\))?\.map\(/.exec(SOURCE.slice(RENDER_START));
  const messages = messagesMatch ? RENDER_START + messagesMatch.index : -1;
  const questionHelp = offsetInRender("<QuestionHelp");
  const textarea = offsetInRender("<textarea");
  const disclosure = offsetInRender("<GuidanceDisclosure");

  check("the message list renders", messages > -1);
  check("QuestionHelp renders", questionHelp > -1);
  check("the input renders", textarea > -1);
  check("GuidanceDisclosure renders", disclosure > -1);

  check(
    "QuestionHelp sits between the question and the input (it stays put)",
    messages < questionHelp && questionHelp < textarea,
  );

  // THE CORE RULE. Neither education panel may appear before the input.
  const betweenQuestionAndInput = SOURCE.slice(questionHelp, textarea);

  check(
    "no claim-guidance panel between question and input",
    !/claimGuidance[!.]?\.(educationTopics|remedies)/.test(betweenQuestionAndInput),
    betweenQuestionAndInput.match(/claimGuidance[!.]?\.\w+/g)?.join(", ") || "",
  );
  check(
    "no evidence-guidance panel between question and input",
    !/evidenceGuidance[!.]?\.(addressedCategories|unaddressedCategories)/.test(betweenQuestionAndInput),
    betweenQuestionAndInput.match(/evidenceGuidance[!.]?\.\w+/g)?.join(", ") || "",
  );
  check(
    "no GuidanceEntry rendered between question and input",
    !betweenQuestionAndInput.includes("<GuidanceEntry"),
  );

  check("education is disclosed BELOW the input", textarea < disclosure);

  // Collapsed by default while questions are running.
  const disclosureBody = SOURCE.slice(
    SOURCE.indexOf("function GuidanceDisclosure"),
    RENDER_START,
  );
  check(
    "the disclosure starts collapsed",
    /useState\(false\)/.test(disclosureBody),
    "open must default to false",
  );
  check(
    "it expands automatically only once intake is complete",
    /intakeComplete \|\| open/.test(disclosureBody),
  );
  check(
    "it stays collapsed while depth questions are still running",
    /intakeComplete && !depthActive/.test(SOURCE),
    "the depth phase is still question-answering, so education stays collapsed",
  );

  // No content may be lost by the move: both panels' headings and the
  // citation-bearing entry renderer must still exist somewhere in the file.
  for (const marker of [
    "General information for situations like this",
    "General evidence guidance for situations like this",
    "What courts in this category of situation can generally order",
    "<GuidanceEntry",
  ]) {
    check(`content preserved: ${marker.slice(0, 48)}`, SOURCE.includes(marker));
  }

  checkOneQuestionAtATime();
  checkEnforcementIntake();

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
