/**
 * CHROME PASS 3 ON #550 (19 Nov 2026): THE "ASKED TWICE" FINDINGS, WITH CHROME'S OWN INPUTS.
 *
 *   4a  S1: the review would not continue until "If this involves an injury, what date did it happen?" was answered,
 *       though the story says "On Oct 4, 2026" and "Roughly when did the situation ... happen?" was offered with it on the
 *       same page. Both are the one fact whenHappened (fact table D1). One question per fact on a page
 *       (intakeReview.ts oneQuestionPerFact): the second is never listed, never required.
 *
 * What it asserts: for Chrome's S1 (Small Claims, personal injury), the review's list and the questions still needed
 * before Continue hold no two questions of the same fact, and sc-date-injury is not among them while the event date
 * question is; and for every court, a list with two questions of one fact keeps only the first (planted control).
 *
 * WHAT FAILURE THIS CATCHES: one fact asked, or required, twice on the review.
 *
 * Run: npm run test:pass3-asked-twice
 */
import { oneQuestionPerFact, remainingEssentialQuestions, reviewQuestionList } from "../../src/lib/case-system/intakeReview";
import { slotsOfQuestion } from "../../src/lib/case-system/caseFile/caseFile";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { readFileSync } from "node:fs";
import { offeredOtherParty } from "../../src/lib/case-system/caseFile/storyOffers";
import { storyPartyOffers } from "../../src/lib/case-system/parties/parties";
import { withThisAnswer } from "../../src/lib/case-system/caseFile/chatTurnFacts";
import { caseFileOf } from "../../src/lib/case-system/caseFile/caseFile";
import { mayShowQuestion } from "../../src/lib/case-system/caseFile/factStatus";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`); if (!ok) failed++; };

const S1 = "On Oct 4, 2026 at about 6:40 pm I slipped on a wet floor near the milk fridge at a Circle K in Ottawa. There was no wet-floor sign. I fell on my right hip. I missed 3 days of work (Oct 5 to 7) at $150 a day and bought Tylenol and an ice pack for $18.45. I want to claim $5,000 for pain and suffering, $450 lost wages and $18.45 for medicine.";
const s1 = { version: 1, flowId: "pass3-s1", courtPath: "small-claims", revision: "r1",
  sections: { story: { text: S1, location: { province: "Ontario", city: "Ottawa" } }, guided: { started: true, facts: { role: "plaintiff", disputeCategory: "personal-injury" }, answeredIds: ["sc-orient-role", "sc-orient-dispute-category"] }, builder: { step: "guided" } } } as unknown as Checkpoint;

/** Facts asked by more than one question of a list. */
function doubled(ids: readonly string[]): string[] {
  const seen = new Map<string, string>();
  const out: string[] = [];
  for (const id of ids) for (const fact of slotsOfQuestion(id)) { if (seen.has(fact)) out.push(`${fact}: ${seen.get(fact)} and ${id}`); else seen.set(fact, id); }
  return out;
}

const remaining = remainingEssentialQuestions(s1).map((question) => question.id);
const listed = reviewQuestionList(s1).map((question) => question.id);
check("4a. S1: the questions still needed before Continue ask no fact twice", doubled(remaining).length === 0, doubled(remaining).join("; "));
check("4a. S1: the review's list asks no fact twice", doubled(listed).length === 0, doubled(listed).join("; "));
check("4a. S1: the injury date is not required beside the event date (the same fact)", !remaining.includes("sc-date-injury") && remaining.includes("sc-orient-when-happened"), JSON.stringify(remaining));
check("planted: two questions of one fact keep only the first", JSON.stringify(oneQuestionPerFact([{ id: "sc-orient-when-happened" }, { id: "sc-date-injury" }, { id: "sc-amount-claimed" }]).map((q) => q.id)) === JSON.stringify(["sc-orient-when-happened", "sc-amount-claimed"]));

// 4d, S6: "a claim of my own" answered, then the story suggestion "Do you believe the plaintiff ... owes you money?" was
// offered in the same turn: the case file the filter read did not hold the answer yet. Read with this turn's answer, it is not.
const S6 = { version: 1, flowId: "pass3-s6", courtPath: "small-claims", revision: "r1", sections: { story: { text: "I was served with a Small Claims claim on Oct 20, 2026. A contractor says I owe $4,200 for a kitchen job." }, situation: { record: { where: "served", papers: "small-claims-7A", receivedOn: "2026-10-20", court: "small-claims", stage: "just-served" } }, guided: { started: true, facts: { role: "defendant" }, earlierAnswers: [] } } } as unknown as Checkpoint;
const s6Now = caseFileOf(withThisAnswer(S6, "sc-defendant-outcome", "Yes, a claim of my own against them too."));
check("4d. S6: after \"a claim of my own\", the counterclaim question is not offered or asked in the same turn", !mayShowQuestion(s6Now, "sc-defendant-counterclaim") && mayShowQuestion(caseFileOf(S6), "sc-defendant-counterclaim"));
const chat = readFileSync("app/builder/_components/GuidedSmallClaimsIntake.tsx", "utf8");
check("4d. build check: the chat filters this turn's offers with this turn's answer in the case file", chat.includes("const fileNow = caseFileOf(withThisAnswer(recovery?.getReview().checkpoint ?? null, answeredQuestionId, newStoryText)"));
// 6a-6c, S2 (French names), with Chrome's inputs.
const S2_STORY = "I hired Saint-Jérôme Rénovations Ltée. My contractor left the work unfinished and kept my $1,200 deposit.";
const S2_ANSWERED = [{ question: "Where do you live?", answer: "Gatineau, Quebec. 8 rue de l'Église, Gatineau QC J8X 1A1" }, { question: "Where is the contractor based?", answer: "Saint-Jérôme Rénovations Ltée, 8 rue de l'Église, Gatineau QC J8X 1A1" }];
const named = offeredOtherParty(S2_STORY, [{ label: "Other party", value: "Saint-Jérôme Rénovations Ltée" }] as never);
check("6a. S2: the company the reading names is offered whole, never \"Lt\"", named?.value === "Saint-Jérôme Rénovations Ltée", JSON.stringify(named));
const suing = storyPartyOffers("I am suing Saint-Jérôme Rénovations Ltée for my $1,200 deposit.", { list: [], declined: [] } as never, null, {});
check("6a. a company named in \"I am suing ...\" ends at its suffix, as a company, never a person's name", suing.some((offer) => offer.detail === "companyName" && offer.value === "Saint-Jérôme Rénovations Ltée") && !suing.some((offer) => offer.detail === "fullName" || offer.detail === "firstName"), JSON.stringify(suing.map((offer) => [offer.detail, offer.value])));
const s2 = storyPartyOffers(S2_STORY, { list: [{ id: "o1", side: "other", details: {}, unsure: [] }], declined: [] } as never, named, { location: { city: "Gatineau", province: "Ontario" }, answered: S2_ANSWERED });
const of = (party: string, detail: string) => s2.filter((offer) => offer.party === party && offer.detail === detail).map((offer) => offer.value);
check("6b. S2: the province answered (Quebec) is offered, never ON over it, and once", JSON.stringify(of("you", "province")) === JSON.stringify(["QC"]), JSON.stringify(of("you", "province")));
check("6c. S2: the defendant's address typed as an answer is carried (street, city, province, postal code)", of("other:1", "street")[0] === "8 rue de l'Église" && of("other:1", "city")[0] === "Gatineau" && of("other:1", "province")[0] === "QC" && of("other:1", "postalCode")[0] === "J8X 1A1", JSON.stringify(s2.map((offer) => [offer.party, offer.detail, offer.value])));
const parties = readFileSync("app/_components/PartiesStep.tsx", "utf8");
check("6a. build check: a company's name is never split into first and last (PartiesStep nameSplit)", /if \(isCompanyName\(party\.details\.fullName\)\) return null;/.test(parties));

console.log(failed ? `\n${failed} check(s) failed` : "\nAll pass-3 asked-twice checks passed");
process.exitCode = failed ? 1 : 0;
