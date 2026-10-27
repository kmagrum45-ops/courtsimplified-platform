/**
 * EACH FACT THE STORY GIVES, IN PLAIN WORDS (Charter re-test, 27 Oct, root cause 1).
 *
 * Checks, as properties, on the six cases Chrome re-tested (messy pack cases 11, 14, 16, 19 and 20,
 * and the Charter claim), through the readers "What we have so far" and the questions use
 * (caseFile/storyFacts.ts, storyLines.ts, storyAnswers.ts childrenFromStory):
 *   - every case lists the other side, and the loss where the story gives an amount;
 *   - no row is its whole sentence (Safety, kept in the person's words by design, aside); the
 *     sentence is kept as the row's source;
 *   - Witness is just the witness, never the list of evidence; Lost pay is the amount and the time;
 *     the evidence is listed when the story says what they have;
 *   - the children are their names and ages, or who and how old, never the sentence they came in;
 *   - a debt's last payment and whether it was acknowledged in writing (case 11);
 *   - the papers a case already going has, from the story's own filing words, offered for "Has anything
 *     been filed…?" (26 Oct re-test, case 16: asked with nothing offered), and never from a tribunal,
 *     a question or a doubt;
 *   - what a family case is about, where the story's words name it (divorce, selling the house,
 *     spousal support, parenting), offered in the chat and the review's question for one click (26 Oct
 *     re-test, case 14: nothing offered); a Charter claim's kinds likewise; never from a "no" or a question;
 *   - "No court date yet" is kept as the answer, never "No court date yet (day not given yet)" (case 14),
 *     and a conference that is the next court date is listed once (case 16);
 *   - "What kind of dispute is this?" answered in the chat is held in its own choice words, so the case
 *     page shows it (case 20: "Not sure yet: nothing in your story shows it" after "Unpaid money owed
 *     to you" was confirmed);
 *   - the papers named in the situation answers are the case file's papers in every area, so "Anything
 *     filed yet: Yes" names them (26 Oct re-test), Small Claims' papers by their words, never a code;
 *   - the fresh reviewer's cases (26 Oct): someone responding sees the claim against them, never the
 *     amount of the claim they once meant to bring; "Evidence you have" is a record, never "two kids"
 *     or "joint custody"; children named with their ages however written; the Small Claims chat's
 *     side in the review in words, never "plaintiff" in a text box.
 *
 * Failure it exists to catch: "Witness" showing the whole list of evidence, "Lost pay" repeating the
 * injury sentence, "Children" showing a sentence about the divorce, and the other side never listed.
 */
import fs from "node:fs";
import path from "node:path";
import { storyLines } from "../../src/lib/case-system/caseFile/storyLines";
import { caseFileOf, courtDateIsConference, DISPUTE_CATEGORY_WORDS, saysNoDateYet, slotText } from "../../src/lib/case-system/caseFile/caseFile";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { evidenceIn } from "../../src/lib/case-system/caseFile/storyFacts";
import { inWords } from "../../src/lib/case-system/copy/rawKeys";
import { childrenFromStory, civilFiledFromStory, familyFiledFromStory, familyIssuesFromStory } from "../../app/builder/_components/storyAnswers";
import { reviewQuestionField } from "../../src/lib/case-system/intakeReview";
import { reviewEntries } from "../../src/lib/case-system/intakeReview";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const pack = fs.readFileSync(path.join(ROOT, "tests/browser/storyPackMore.ts"), "utf8");
const storyOf = (id: string) => (new RegExp(`id: "${id}"[\\s\\S]*?story: "((?:[^"\\\\]|\\\\.)*)"`).exec(pack)?.[1] ?? "").replace(/\\'/g, "'");

const CASES: { id: string; label: string; responding: boolean; money: boolean }[] = [
  { id: "m11-old-credit-card", label: "case 11 (civil debt, served)", responding: true, money: true },
  { id: "m14-served-divorce", label: "case 14 (family, served)", responding: true, money: false },
  { id: "m16-conference-safety", label: "case 16 (family, case going)", responding: false, money: false },
  { id: "m19-laptop-repair", label: "case 19 (Small Claims repair)", responding: false, money: true },
  { id: "m20-messy", label: "case 20 (Small Claims, messy)", responding: false, money: false },
  { id: "c1-charter-police", label: "the Charter claim", responding: false, money: true },
];

for (const item of CASES) {
  const story = storyOf(item.id);
  if (!story) { check(`${item.label}: the story is in the pack`, false); continue; }
  const lines = storyLines(story, caseFileOf(null), item.responding);
  const value = (fact: string) => lines.find((line) => line.fact === fact)?.value ?? "";
  check(`${item.label}: the other side is listed`, Boolean(value("otherParty")), JSON.stringify(lines.map((line) => line.label)));
  if (item.money) check(`${item.label}: the loss is listed`, /\$\d/.test(value("amount") + value("amountAgainst") + value("lostPay")), JSON.stringify(lines.map((line) => `${line.label}: ${line.value}`)));
  const sentences = lines.filter((line) => line.fact !== "safety" && line.value.trim() === line.quote.trim() && line.quote.trim().split(/\s+/).length > 8);
  check(`${item.label}: no row is its whole sentence`, sentences.length === 0, sentences.map((line) => `${line.label}: ${line.value}`).join(" | "));
  check(`${item.label}: every row keeps the sentence it came from`, lines.every((line) => line.quote.trim().length > 0 && story.replace(/\s+/g, " ").includes(line.quote.trim().replace(/\s+/g, " ").slice(0, 40))));
}

// The Charter claim: each row as Chrome asked.
const charter = storyLines(storyOf("c1-charter-police"), caseFileOf(null), false);
const charterValue = (fact: string) => charter.find((line) => line.fact === fact)?.value ?? "";
check("Charter: the witness is just the witness", /witness/i.test(charterValue("witness")) && !/timeline|clinic note|receipt/i.test(charterValue("witness")), charterValue("witness"));
check("Charter: lost pay is the amount and the time", /\$2,640/.test(charterValue("lostPay")) && /2 weeks/.test(charterValue("lostPay")) && !/wrist/i.test(charterValue("lostPay")), charterValue("lostPay"));
check("Charter: the injury is not the lost pay", !/\$2,640|missed/i.test(charterValue("injury")), charterValue("injury"));
check("Charter: the evidence is listed, without the witness", /clinic note/i.test(charterValue("evidence")) && !/witness/i.test(charterValue("evidence")), charterValue("evidence"));
check("Charter: the complaint and what came of it", /complaint/i.test(charterValue("complaint")) && /screened out/i.test(charterValue("complaint")), charterValue("complaint"));

// Case 11: the facts the limitation question turns on.
const debt = storyLines(storyOf("m11-old-credit-card"), caseFileOf(null), true);
check("case 11: the last payment", debt.find((line) => line.fact === "lastPayment")?.value === "November 2019", JSON.stringify(debt.find((line) => line.fact === "lastPayment")));
check("case 11: not acknowledged in writing, in their words", /not in writing/i.test(debt.find((line) => line.fact === "acknowledged")?.value ?? ""));

// The children, in plain words.
check("case 14: the children by name and age", childrenFromStory(storyOf("m14-served-divorce"))?.value === "Mia (4) and Noah (2)", JSON.stringify(childrenFromStory(storyOf("m14-served-divorce"))));
check("case 16: the child by who and how old", childrenFromStory(storyOf("m16-conference-safety"))?.value === "Daughter, age 6", JSON.stringify(childrenFromStory(storyOf("m16-conference-safety"))));
check("several children keep every age", childrenFromStory("We have two kids aged 3 and 5.")?.value === "Two children, ages 3 and 5");
check("the children's sentence is kept as the source", /divorce/.test(childrenFromStory(storyOf("m14-served-divorce"))?.quote ?? ""));

// Case 16: what the other side says, as reported.
const family = storyLines(storyOf("m16-conference-safety"), caseFileOf(null), false);
check("case 16: what the other side says is listed", /unstable/.test(family.find((line) => line.fact === "otherSideSays")?.value ?? ""));

// The civil review's empty boxes: the story's words offered in one click (intakeReview.ts fromStory).
const ID = "00000000-0000-4000-8000-000000000027";
const boxes = (id: string) => {
  const story = storyOf(id);
  const stored = { version: 1, flowId: ID, courtPath: "civil", revision: ID, sections: { story: { text: story }, situation: { record: { where: "starting", filed: "nothing", court: "civil" } }, civil: { input: { governmentActor: "", damagesBreakdown: "", timeline: "", facts: story } } } };
  return Object.fromEntries(reviewEntries(stored as never).filter((entry) => entry.fromStory).map((entry) => [entry.field, entry.fromStory!.value]));
};
const charterBoxes = boxes("c1-charter-police");
check("Charter review: the public body is offered from the story", /Police Service/.test(charterBoxes.governmentActor ?? ""), JSON.stringify(charterBoxes));
check("Charter review: the losses are offered from the story", /\$2,640/.test(charterBoxes.damagesBreakdown ?? "") && /Phone/.test(charterBoxes.damagesBreakdown ?? ""), charterBoxes.damagesBreakdown);
check("Charter review: the timeline is offered from the story", /June 3, 2025/.test(charterBoxes.timeline ?? ""), charterBoxes.timeline);
check("a private party is not offered as the public body (case 11's debt collector)", !boxes("m11-old-credit-card").governmentActor);

const filed = (read: typeof familyFiledFromStory, story: string) => (read(story)?.value ?? []).join(",");
const FILED: Array<[typeof familyFiledFromStory, string, string]> = [
  [familyFiledFromStory, "I filed an application in June 2026 and my ex filed an answer in July.", "application,answer"],
  [familyFiledFromStory, "We filed our application in the spring.", "application"],
  [familyFiledFromStory, "My ex-wife served her answer last week.", "answer"],
  [familyFiledFromStory, "The respondent filed an Answer in September.", "answer"],
  [familyFiledFromStory, "I filed my answer in May.", "answer"],
  [familyFiledFromStory, "I filed an application with the Landlord and Tenant Board.", ""],
  [familyFiledFromStory, "Should I file an application?", ""],
  [familyFiledFromStory, "I think he filed an answer, not sure.", ""],
  [civilFiledFromStory, "I issued a statement of claim in May and he filed a statement of defence in June.", "statement-claim,statement-defence"],
  [civilFiledFromStory, "The company filed its defence last month.", "statement-defence"],
  [civilFiledFromStory, "I filed my statement of defence on time.", "statement-defence"],
  [civilFiledFromStory, "I got served with a statement of claim.", "statement-claim"],
  [civilFiledFromStory, "Do I need to file a defence?", ""],
];
const M14 = "I was served on October 12, 2026 with an Application for divorce in Ottawa. My wife wants a divorce, to sell the house, spousal support from me and she wants the children, Mia (4) and Noah (2), primarily with her. We were married in Lisbon, Portugal in 2009 and moved here in 2012. I don't agree with selling the house, I want shared parenting and I don't think I should pay spousal support since she earns more than me.";
const issues = (story: string) => (familyIssuesFromStory(story)?.value ?? []).slice().sort().join(",");
check("case 14: the story's own issues are offered", issues(M14) === "divorce,parenting-time,sale-of-home,spousal-support", issues(M14));
check("a 'no' names nothing", issues("We are not getting a divorce. I don't want child support.") === "", issues("We are not getting a divorce. I don't want child support."));
check("a question names nothing", issues("Can I ask for spousal support?") === "");
check("a threat is not offered as an issue, a city is not a move", issues("He threatened me. We live in Ottawa.") === "");
const m14Checkpoint = { version: 1, flowId: "00000000-0000-4000-8000-000000000014", courtPath: "family", revision: "00000000-0000-4000-8000-000000000014", sections: { story: { text: M14 }, family: { facts: M14 } } };
const issuesQuestion = reviewQuestionField("family", "issues", m14Checkpoint as never);
check("case 14 review: 'What is the case about?' suggests the story's issues, with the sentence", (issuesQuestion?.suggested ?? []).length === 4 && Boolean(issuesQuestion?.suggestedQuote), JSON.stringify(issuesQuestion?.suggested));
for (const said of ["No court date yet", "none", "Not yet.", "No hearing scheduled yet", "Nothing scheduled", "There are no court dates yet"]) {
  check(`"${said}" says there is no court date`, saysNoDateYet(said));
}
for (const said of ["November 16, 2026", "Case conference on November 16", "not sure", "I don't know", "sometime in December"]) check(`"${said}" is not "no date"`, !saysNoDateYet(said));
const noDate = caseFileOf({ version: 1, flowId: "00000000-0000-4000-8000-000000000014", courtPath: "family", revision: "00000000-0000-4000-8000-000000000014", sections: { story: { text: "Synthetic." }, builder: { initialAnswers: { upcomingCourtDate: "No court date yet" } } } } as never);
const noDateText = slotText(noDate.courtDate, (day) => day);
check("case 14: 'No court date yet' reads as given, with no '(day not given yet)'", noDate.courtDate.state === "answered" && noDateText === "No court date yet", `${noDate.courtDate.state}: ${noDateText}`);
const both = caseFileOf({ version: 1, flowId: "00000000-0000-4000-8000-000000000016", courtPath: "family", revision: "00000000-0000-4000-8000-000000000016", sections: { story: { text: "Synthetic." }, builder: { initialAnswers: { upcomingCourtDate: "Case conference on November 16, 2026" } } } } as never, { courtDate: "2026-11-16" } as never);
const sameDayFile = { ...both, courtDate: { state: "answered", value: "2026-11-16", confirmed: true }, conferenceDate: { state: "answered", value: "Case conference on November 16, 2026", confirmed: true } } as typeof both;
check("case 16: the conference on the same day as the next court date is one day", courtDateIsConference(sameDayFile));
check("a different court date is its own line", !courtDateIsConference({ ...sameDayFile, courtDate: { state: "answered", value: "2027-03-03", confirmed: true } } as typeof both));
const panel = fs.readFileSync(path.join(ROOT, "app/cases/_components/CaseFilePanel.tsx"), "utf8");
check("'What we have so far' lists that day once", /courtDateIsConference\(file\)/.test(panel));
const categoryChoices = QUESTION_BANK.find((question) => question.id === "sc-orient-dispute-category")?.choices ?? [];
const strays = Object.values(DISPUTE_CATEGORY_WORDS).filter((words) => !categoryChoices.includes(words));
check("every dispute code reads as one of the question's own choices", strays.length === 0, strays.join("; "));
const extractor = fs.readFileSync(path.join(ROOT, "src/lib/case-system/intake/extractIntakeFacts.ts"), "utf8");
const codes = [...new Set([...(/"disputeCategory": exactly one of these[^\n]*/.exec(extractor)?.[0] ?? "").matchAll(/"([a-z-]+)"(?= \(|,|\.)/g)].map((match) => match[1]).filter((code) => code !== "disputeCategory"))];
const unworded = codes.filter((code) => !DISPUTE_CATEGORY_WORDS[code]);
check("every code the reader can give has its words", codes.length >= 10 && unworded.length === 0, `${codes.length} codes; unworded: ${unworded.join(", ")}`);
const chatKind = caseFileOf({ version: 1, flowId: "00000000-0000-4000-8000-000000000020", courtPath: "small-claims", revision: "00000000-0000-4000-8000-000000000020", sections: { story: { text: "Synthetic." }, builder: { step: "guided" }, guided: { answeredIds: ["sc-orient-dispute-category"], facts: { disputeCategory: "unpaid-money" } } } } as never);
for (const [court, papers] of [["small-claims", "small-claims-7A"], ["civil", "civil-14A"], ["family", "family-8"]] as const) {
  const served = caseFileOf({ version: 1, flowId: "00000000-0000-4000-8000-000000000011", courtPath: court, revision: "00000000-0000-4000-8000-000000000011", sections: { story: { text: "Synthetic." }, situation: { record: { where: "served", papers, receivedOn: "2026-10-12", court } } } } as never);
  check(`${court}: the papers named at the start are the case file's papers, so "Anything filed" can name them`, (served.documents ?? []).length === 1, JSON.stringify(served.documents));
}
{
  // Reviewer finding 1: case 19 after the side change.
  const M19 = "Marcus Bell in Ottawa had his laptop repaired by Circuit Doctors Inc. in July 2026 for $450. It came back worse. He wants a refund of $450 plus the $1,200 he paid to replace it. (Later, on October 20, Circuit Doctors' owner, Wei Chen, serves him with a claim for $3,200 for 'defamation' over an online review.)";
  const lines = storyLines(M19, caseFileOf({ version: 1, flowId: "00000000-0000-4000-8000-000000000019", courtPath: "small-claims", revision: "00000000-0000-4000-8000-000000000019", sections: { story: { text: M19 }, situation: { record: { where: "served", papers: "small-claims-7A", receivedOn: "2026-10-20", court: "small-claims" } } } } as never), true);
  const against = lines.find((line) => line.fact === "amountAgainst");
  check("case 19 responding: the claim against him is never the old claim's amount", !against || /3,200/.test(against.value), JSON.stringify(against));
  check("case 19 responding: no line carries $1,650", !lines.some((line) => /1,650/.test(line.value)), JSON.stringify(lines.map((line) => `${line.label}: ${line.value}`)));
}
for (const story of ["We have two kids, Maya who is 7 and Leo who is 4.", "We have joint custody right now but he stopped paying child support.", "I have custody of our daughter, age 6, and he wants more parenting time."]) {
  check(`not evidence: "${story}"`, evidenceIn(story) === null, JSON.stringify(evidenceIn(story)));
}
for (const [story, want] of [["I have the clinic note and photos of my wrist.", /clinic note/i], ["I kept the receipts and the texts.", /receipts/i], ["I have the application papers and our marriage certificate.", /certificate/i]] as const) {
  check(`evidence: "${story}"`, want.test(evidenceIn(story)?.value ?? ""), JSON.stringify(evidenceIn(story)));
}
for (const [story, want] of [
  ["We have two kids, Maya who is 7 and Leo who is 4.", "Maya (7) and Leo (4)"],
  ["We have a son, Leo, who is 4 and a daughter Ava, 9.", "Leo (4) and Ava (9)"],
  ["We have three children: Tom, 12, Ann, 9 and Bea, 3.", "Tom (12), Ann (9) and Bea (3)"],
  ["My daughter is 6 and lives with me.", "Daughter, age 6"],
] as const) check(`children in plain words: "${story}"`, childrenFromStory(story)?.value === want, childrenFromStory(story)?.value);
check("Small Claims papers read as words", !/plaintiffs-claim|affidavit-service/.test(inWords(["plaintiffs-claim", "affidavit-service"])), inWords(["plaintiffs-claim", "affidavit-service"]));
{
  const guidedReview = reviewEntries({ version: 1, flowId: "00000000-0000-4000-8000-000000000018", courtPath: "small-claims", revision: "00000000-0000-4000-8000-000000000018", sections: { story: { text: "Synthetic." }, builder: { step: "guided" }, guided: { facts: {} }, situation: { record: { where: "starting", filed: "nothing", court: "small-claims" } } } } as never);
  const role = guidedReview.find((entry) => entry.field === "role");
  const shown = role ? (role.choices?.find((choice) => choice.value === role.value)?.label ?? String(role.value)) : "";
  check("the Small Claims chat's side in the review is words with choices, never 'plaintiff' in a text box", Boolean(role) && Boolean(role?.choices?.length) && shown !== "plaintiff", JSON.stringify(role));
}
check("case 20: the kind of dispute answered in the chat is held in its words", chatKind.claimKind.state === "answered" && chatKind.claimKind.value === "Unpaid money owed to you", JSON.stringify(chatKind.claimKind));
for (const [read, story, want] of FILED) check(`papers filed, from the story: "${story}" -> ${want || "nothing offered"}`, filed(read, story) === want, filed(read, story));

console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
process.exitCode = failures ? 1 : 0;
