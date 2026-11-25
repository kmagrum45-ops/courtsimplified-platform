/**
 * ONE STORY READER: THE HOME PAGE NEVER ASKS WHAT THE INTAKE OFFERS FROM THE STORY (site owner, 21 Nov 2026, batch (a)).
 *
 * Chrome check of ad67c3f7: S1's home page asked "What is the total dollar amount you are claiming?" while its reading
 * showed $5,468.45, which the intake then offered; S7's asked "Tell us about the children: how many, how old, and who they
 * live with now" right after "One child, age 6", which the Family chat then offered. The home page and the intake read the
 * story with readers of their own. Now there is one (intakeReview.ts statedInStory, the place the one-decider list names).
 *
 * What it checks:
 *   1. the exact S1 story and its real recorded reading (tests/browser/fixtures/real-ai/sc-chrome2-s1-fall/r1.json): the
 *      home page does not ask the amount, and the Small Claims chat and the review offer $5,468.45;
 *   2. the exact S7 story: the Family home page does not ask about the children, and the Family chat offers them;
 *   3. table-driven over every fact the reader can state, for every court and side: a home question is skipped for the
 *      story exactly when the intake of that court offers the same fact from the same story (one decision, two places);
 *   4. the states, for the amount (S1) and the children (S7): stated -> an offer, never a cold question; Yes -> known,
 *      never asked again; No -> asked once, and the typed value replaces the story's; Not sure -> settled, never asked,
 *      and the story's value is still read (never overwritten);
 *   5. one reader: no other file calls the old per-field readers for the facts it states (guidedFields.ts reads them only
 *      through statedInStory), the review's suggestions read it too, and the date reader has one copy.
 *
 * WHAT FAILURE THIS CATCHES: the home page asking a fact the intake then offers from the story (a repeat), and a second
 * story reader growing back.
 *
 * Run: npm run test:one-story-reader
 */
import { readdirSync, readFileSync } from "node:fs";

import { homeAsks, homeQuestionsFor } from "../../src/lib/case-system/caseFile/factQuestions";
import { factsOfQuestion } from "../../src/lib/case-system/caseFile/factsOfQuestion";
import { emptyCaseFile, type CaseFile, type SlotFact } from "../../src/lib/case-system/caseFile/caseFile";
import { factStatus } from "../../src/lib/case-system/caseFile/factStatus";
import { civilGuidedFields, familyGuidedFields } from "../../app/builder/_components/guidedFields";
import { withStatedProposals } from "../../src/lib/case-system/intake/statedProposals";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { quotesOf, statedInStory, STORY_STATED_FACTS, suggestInitialAnswers } from "../../src/lib/case-system/intakeReview";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

// The exact stories, read from the browser test that Chrome's stories come from (never a copy of their words).
const spec = readFileSync("tests/browser/ask-once-pages.spec.ts", "utf8");
const storyOf = (name: string) => {
  const found = new RegExp(`CHROME\\("${name}", "[a-z-]+", "[a-z]+", "((?:[^"\\\\]|\\\\.)*)"`).exec(spec);
  if (!found) throw new Error(`no story ${name} in ask-once-pages.spec.ts`);
  return JSON.parse(`"${found[1]}"`) as string;
};
const S1 = storyOf("sc-chrome2-s1-fall");
const S7 = storyOf("family-chrome2-s7a-no");
// S1's real recorded reading: the facts the home card shows.
const recorded = JSON.parse(readFileSync("tests/browser/fixtures/real-ai/sc-chrome2-s1-fall/r1.json", "utf8")) as { entries: { step: string; output: string }[] };
const S1_READING = (JSON.parse(recorded.entries.find((entry) => entry.step === "story-reading")!.output) as { facts: { label: string; value: string }[] }).facts;

const ID = "00000000-0000-4000-8000-000000000a01";
const checkpoint = (court: "small-claims" | "civil" | "family", story: string, reading: readonly { label: string; value: string }[] = []) => ({
  version: 1, flowId: ID, courtPath: court, revision: ID,
  sections: { story: { text: story, location: { city: "Ottawa", province: "Ontario" } }, home: { readFrom: story, understood: { understanding: { facts: reading } } } },
}) as never;
const fieldsOf = (court: "civil" | "family") => (court === "civil" ? civilGuidedFields({ issues: [], documents: [] }) : familyGuidedFields({ issues: [], filed: [] }));
/** What the Civil or Family chat offers for a fact from this story (its field whose facts include it). */
const chatOffers = (court: "civil" | "family", fact: string, story: string) =>
  fieldsOf(court).filter((field) => factsOfQuestion(field.key).includes(fact)).map((field) => field.fromStory?.({ facts: story }) ?? field.partialFromStory?.({ facts: story }) ?? null).find(Boolean) ?? null;
const amountQuestion = QUESTION_BANK.find((question) => question.id === "sc-amount-claimed")!;

// 1. S1.
check("S1: the home page does not ask the total amount the reading shows", !homeAsks(null, "sc-amount-claimed", S1, S1_READING));
const chat = withStatedProposals(S1, [amountQuestion], [], S1_READING);
check("S1: the Small Claims chat offers $5,468.45", chat.some((offer) => offer.questionId === "sc-amount-claimed" && /5,468\.45/.test(offer.answer)), JSON.stringify(chat));
const review = suggestInitialAnswers(checkpoint("small-claims", S1, S1_READING)) as { suggestions?: Record<string, string> } & Record<string, unknown>;
const reviewAmount = String((review.suggestions ?? review)["sc-amount-claimed"] ?? "");
check("S1: the review offers $5,468.45", /5,?468\.45/.test(reviewAmount), JSON.stringify(review).slice(0, 300));

// 2. S7.
check("S7: the Family home page does not ask about the children", !homeAsks(null, "childrenInfo", S7));
check("S7: the Family chat offers the children", Boolean(chatOffers("family", "children", S7)), JSON.stringify(chatOffers("family", "children", S7)));

// 3. One decision per fact, two places, every court and side.
const STORIES = [S1, S7, "We separated in April 2026. Our son is Leo, age 7. I want child support.", "Northwind Supplies Ltd. owes me $45,000 for a machine I delivered in August 2026. I want the money back.", "I lent my friend $2,000 on March 3, 2026 and she has not paid it back. I want my money back."];
for (const court of ["small-claims", "civil", "family"] as const) {
  for (const side of ["starting", "responding"] as const) {
    for (const question of homeQuestionsFor(court, side)) {
      for (const fact of factsOfQuestion(question.id).filter((item) => (STORY_STATED_FACTS as readonly string[]).includes(item))) {
        for (const story of STORIES) {
          const skipped = !homeAsks(null, question.id, story);
          const offered = court === "small-claims"
            ? withStatedProposals(story, [QUESTION_BANK.find((item) => item.id === question.id)!].filter(Boolean), []).some((offer) => offer.questionId === question.id)
            : Boolean(chatOffers(court, fact, story));
          check(`${court} ${side} ${question.id} (${fact}): skipped at home exactly when the intake offers it -- "${story.slice(0, 40)}..."`, !skipped || offered, `skipped ${skipped}, offered ${offered}`);
        }
      }
    }
  }
}

// 4. The states.
const withSlot = (fact: SlotFact, slot: CaseFile[SlotFact]): CaseFile => ({ ...emptyCaseFile(), [fact]: slot });
for (const [name, fact, story, reading, question] of [["S1 amount", "amount", S1, S1_READING, "sc-amount-claimed"], ["S7 children", "children", S7, [], "childrenInfo"]] as const) {
  const stated = statedInStory(story, reading);
  check(`${name}: stated -> offered, never a cold question`, factStatus(null, fact, stated) === "offer" && !homeAsks(null, question, story, reading));
  const yes = withSlot(fact, { state: "answered", value: stated[fact]!, source: { kind: "answer", question: "offer" }, confirmed: true });
  check(`${name}: Yes -> known, never asked again`, factStatus(yes, fact, stated) === "known" && !homeAsks(yes, question, story, reading));
  const no = withSlot(fact, { state: "answered", value: stated[fact]!, source: { kind: "story", quote: story }, confirmed: false, declined: true });
  check(`${name}: No -> asked once`, factStatus(no, fact, stated) === "ask");
  const typed = withSlot(fact, { state: "answered", value: "typed by the person", source: { kind: "answer", question }, confirmed: true });
  check(`${name}: then the typed value replaces the story's and is not asked again`, factStatus(typed, fact, stated) === "known" && typed[fact].value === "typed by the person" && !homeAsks(typed, question, story, reading));
  const unsure = withSlot(fact, { state: "unsure", source: { kind: "answer", question: "offer" }, confirmed: true });
  check(`${name}: Not sure -> settled, never asked`, factStatus(unsure, fact, stated) === "settled" && !homeAsks(unsure, question, story, reading));
  check(`${name}: and the story's value is still read, never overwritten`, statedInStory(story, reading)[fact] === stated[fact] && Boolean(quotesOf(statedInStory(story, reading))[fact]));
}

// 5. One reader.
const fields = readFileSync("app/builder/_components/guidedFields.ts", "utf8");
const oldReaders = ["childrenFromStory", "courtDateFromStory", "civilIssuesFromStory", "familyIssuesFromStory", "childrenPartialFromStory", "civilFiledFromStory", "civilRoleFromStory", "familyFiledFromStory", "familyRoleFromStory", "goalFromStory", "otherPartyFromStory", "otherPartyNameFromStory", "servedDateFromStory", "offeredAmount("];
const stillCalled = oldReaders.filter((reader) => fields.includes(reader));
check("the Civil and Family chat reads the story only through the one reader", stillCalled.length === 0 && fields.includes("statedInStory("), stillCalled.join(", "));
const review2 = readFileSync("src/lib/case-system/intakeReview.ts", "utf8");
const work = readFileSync("src/lib/case-system/caseFile/storyReader.ts", "utf8");
check("the date reader has one copy, in the one reader's own module (caseFile/storyReader.ts)", !review2.includes("function whenItHappened(") && work.split("function whenItHappened(").length - 1 === 1);
const importers = [...new Set(["app", "src"].flatMap((dir) => (readdirSync(dir, { recursive: true }) as string[]).filter((file) => /\.(ts|tsx)$/.test(file)).map((file) => `${dir}/${file.replace(/\\/g, "/")}`)))].filter((file) => /from "[^"]*caseFile\/storyReader"|from "\.\/storyReader"/.test(readFileSync(file, "utf8")));
check("only the one reader (intakeReview.ts statedInStory) uses that module", importers.length === 1 && importers[0] === "src/lib/case-system/intakeReview.ts" && /readStoryFacts\(/.test(review2), importers.join(", "));
check("the review's first suggestions read the amount and the outcome through the one reader", review2.includes("quotesOf(statedInStory(story, responding ? [] : readingFactsOf(checkpoint.sections, whole), undefined, { oneClick: true }))") && !review2.includes("offeredAmount(story"));

if (failures) { console.log(`\n${failures} check(s) failed.`); process.exit(1); }
console.log("\nOne story reader: every check passed.");
