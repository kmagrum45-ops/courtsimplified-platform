/**
 * No fact about the person's case is shown without its source.
 *
 * What it checks:
 *   1. Every place in app/ that states something about the person's case ("you
 *      told us", "from what you told us", "from your story", "you said", "you
 *      wrote", "we understood") renders the source beside it -- the person's
 *      words quoted, or their confirmed answer -- or is listed below as reviewed:
 *      wording that is not a fact about the case ("generic"), or that shows the
 *      person's own answer as they gave it ("own-answer"), each with its reason.
 *      A new unlisted, unsourced place fails; a listed one that no longer exists
 *      fails too (delete its line).
 *   2. In Small Claims, Family and civil, through the follow-up chat route as a
 *      person reaches it (chatRouteHarness): anything the reply says the person
 *      told us is quoted from their story, and a question is never recorded as a
 *      fact.
 *   3. Family: "already a court order" is shown only with the sentence it came
 *      from, and never for asking for an order or saying there is none.
 *   4. Small Claims: the amount offered from the story comes with its sentence,
 *      and is the one still owed when the story says so.
 *
 * Failure it exists to catch: the #469 re-test, where Family said "You told us
 * there is already a court order" when nothing like that was entered, the chat
 * said "I've added the new information to the case record: How long do I have to
 * respond?", and Small Claims offered $8,000 when the story said $6,000 was owed.
 *
 * Run: npm run test:fact-sources
 */
import fs from "node:fs";
import path from "node:path";
import { chatReplies } from "./chatRouteHarness";
import { existingFamilyOrderQuote } from "../../src/lib/case-system/familyStoryReading";
import { amountFromStory } from "../../app/builder/_components/storyAnswers";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

// ---- 1. Every place that states a fact shows its source -------------------
type Reviewed = { file: string; text: string; kind: "generic" | "own-answer" | "quoted-in-text"; why: string };
const REVIEWED: Reviewed[] = [
  { file: "app/_components/IntakeRecovery.tsx", text: "Your story says &ldquo;{reading.quote}&rdquo;, which sounds like you are", kind: "quoted-in-text", why: "the step 2 cross-check: the story's own sentence, quoted, beside the person's own situation answer, asked about and never applied" },
  { file: "app/builder/page.tsx", text: "Start the questions again from your story first", kind: "generic", why: "an instruction, not a fact" },
  { file: "app/builder/page.tsx", text: "We are saving what you told us to your case", kind: "generic", why: "a status line" },
  { file: "app/builder/_components/ChildSupportIntake.tsx", text: "Filled in from what you told us earlier", kind: "own-answer", why: "the field shows the person's own earlier answer, which they can change" },
  { file: "app/builder/_components/ChildSupportIntake.tsx", text: "is recorded as you wrote it", kind: "own-answer", why: "the person's own amount, as typed" },
  { file: "app/builder/_components/CivilIntake.tsx", text: "Reading what you told us...", kind: "generic", why: "a progress label" },
  { file: "app/builder/_components/FamilyIntake.tsx", text: "Reading what you told us...", kind: "generic", why: "a progress label" },
  { file: "app/builder/_components/SmallClaimsIntake.tsx", text: "Reading what you told us...", kind: "generic", why: "a progress label" },
  { file: "app/builder/_components/GuidedFormChat.tsx", text: "Reading what you told us...", kind: "generic", why: "a progress label" },
  { file: "app/builder/_components/EventCandidateSurface.tsx", text: "The events from your story could not be loaded", kind: "generic", why: "an error message" },
  { file: "app/builder/_components/EventCandidateSurface.tsx", text: "These are sentences from what you wrote", kind: "quoted-in-text", why: "each candidate is the person's sentence, shown verbatim" },
  { file: "app/builder/_components/FamilyStatusTriage.tsx", text: "as you wrote", kind: "quoted-in-text", why: "marks the choice that matches the quote shown above it" },
  { file: "app/builder/_components/GuidedFormChat.tsx", text: "from what you told us` : field.question", kind: "quoted-in-text", why: "a heading over the story's own words, quoted below it" },
  { file: "app/builder/_components/GuidedFormChat.tsx", text: "What we already have from what you told us", kind: "own-answer", why: "lists the person's own answers" },
  { file: "app/builder/_components/GuidedSmallClaimsIntake.tsx", text: "what I understood from what you wrote", kind: "quoted-in-text", why: "each proposal card carries the person's words" },
  { file: "app/builder/_components/IntelligenceOverviewPanel.tsx", text: "What you told us</summary>", kind: "own-answer", why: "the person's own answers, as given" },
  { file: "app/builder/_components/IntelligenceOverviewPanel.tsx", text: "(typedEvidence", kind: "own-answer", why: "the person's own evidence answer" },
  { file: "app/builder/_components/MunicipalNoticeFirst.tsx", text: "You said it did not happen on a public sidewalk", kind: "own-answer", why: "the person's own button answer" },
  { file: "app/builder/_components/MunicipalNoticeFirst.tsx", text: "You said it happened on a public sidewalk", kind: "own-answer", why: "the person's own button answer" },
  { file: "app/builder/_components/SourcedQuestions.tsx", text: "Reading the law that applies to what you told us", kind: "generic", why: "a progress label" },
  { file: "app/builder/_components/SourcedQuestions.tsx", text: "We read the law that applies to what you told us", kind: "generic", why: "describes what was done, not a fact" },
  { file: "app/builder/_components/SourcedQuestions.tsx", text: "Your answers are added to what you told us", kind: "generic", why: "a status line" },
  { file: "app/builder/_components/StageAnswerPanel.tsx", text: "What you told us does not mention one", kind: "generic", why: "says nothing was given" },
  { file: "app/builder/_components/StageAnswerPanel.tsx", text: "From what you told us, the papers came this way", kind: "quoted-in-text", why: "shown with \"You wrote: ...\" whenever it comes from the story" },
  { file: "app/builder/_components/StageAnswerPanel.tsx", text: "return `You wrote: “${arrivalOnly", kind: "quoted-in-text", why: "quotes the sentence" },
  { file: "app/builder/_components/TidyWordingReview.tsx", text: "kept exactly as you wrote them", kind: "generic", why: "describes the tool" },
  { file: "app/cases/[id]/drafts/page.tsx", text: "in the words you used when you told us", kind: "generic", why: "a description of a draft section" },
  { file: "app/cases/[id]/page.tsx", text: "What you told us", kind: "own-answer", why: "the person's own story and answers" },
  { file: "app/cases/_components/CaseTimeline.tsx", text: "Anything you confirmed from your story", kind: "generic", why: "an empty-state line" },
  { file: "app/_components/CaseUnderstandingCard.tsx", text: "What we understood", kind: "generic", why: "the Home page reading, labelled as a reading (its facts carry no quotes: reported in #470)" },
  { file: "app/_components/CaseUnderstandingCard.tsx", text: "Here is what we understood", kind: "generic", why: "as above" },
  { file: "app/_components/CaseUnderstandingCard.tsx", text: "This is our reading of what you wrote", kind: "generic", why: "as above" },
  { file: "app/_components/IntakeReviewPanel.tsx", text: "questions started again from your story", kind: "generic", why: "an instruction" },
  { file: "app/_components/IntakeReviewPanel.tsx", text: "Remaining initial questions", kind: "quoted-in-text", why: "story suggestions there are buttons carrying the story's words" },
  { file: "app/_components/IntakeReviewPanel.tsx", text: "bank?.answerType === \"choice\"", kind: "quoted-in-text", why: "story suggestions there are buttons carrying the story's words" },
  { file: "app/_components/IntakeReviewPanel.tsx", text: "[\"date\", \"amount\", \"short-text\"].includes(bank.answerType)", kind: "quoted-in-text", why: "story suggestions there are buttons carrying the story's words" },
  { file: "app/_components/IntakeReviewPanel.tsx", text: "field.fromStory && !answered", kind: "quoted-in-text", why: "the civil and Family fields' story suggestion: a button carrying the story's own words, as the question bank's buttons do (#477 re-test)" },
  { file: "app/_components/StoryChangedNotice.tsx", text: "Start the questions again from your story first", kind: "generic", why: "an instruction" },
  { file: "app/_components/StoryChangedNotice.tsx", text: "The answers given for the earlier version are set aside", kind: "generic", why: "an instruction" },
];
const PHRASE = /\b(you told us|from what you told us|you said|you wrote|from your story|we understood)\b/gi;
const SOURCED = /&ldquo;\{|“\{|\{[a-zA-Z.?!]*(?:quote|basis|orderQuote)[a-zA-Z.?!]*\}/;
const files: string[] = [];
const walk = (dir: string) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.posix.join(dir, entry.name); if (entry.isDirectory()) walk(p); else if (p.endsWith(".tsx")) files.push(p); } };
walk("app");
const used = new Set<Reviewed>();
const unsourced: string[] = [];
for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`])\/\/.*$/gm, (m, p) => p + " ".repeat(m.length - p.length));
  for (const match of code.matchAll(PHRASE)) {
    if (SOURCED.test(code.slice(match.index!, match.index! + 400))) continue;
    const line = raw.split("\n")[raw.slice(0, match.index).split("\n").length - 1];
    const reviewed = REVIEWED.find((item) => item.file === file && line.includes(item.text));
    if (reviewed) used.add(reviewed);
    else unsourced.push(`${file}: ${line.trim().slice(0, 140)}`);
  }
}
check("every place that states something about the person's case shows its source, or is reviewed as not a fact / their own answer", unsourced.length === 0, unsourced.join("\n      "));
const stale = REVIEWED.filter((item) => !used.has(item)).map((item) => `${item.file}: ${item.text}`);
check("every reviewed line still exists (delete the line if not)", stale.length === 0, stale.join("\n      "));

// ---- 3. Family: the court order is quoted or not said -----------------------
const story = (text: string) => existingFamilyOrderQuote(text);
check("Family: asking for an order is not having one", story("We separated in March 2026. I want a support order for our son.") === null && story("I am asking for a parenting order.") === null);
check("Family: saying there is none is not having one", story("We never had a court order.") === null);
const quoted = story("We separated in 2024. There is a final order from 2023. He stopped paying.");
check("Family: a real order is shown with the sentence it came from", quoted === "There is a final order from 2023.", String(quoted));
const triage = fs.readFileSync("app/builder/_components/FamilyStatusTriage.tsx", "utf8");
check("Family: the result shows the quote, never \"You told us there is already a court order\"", /From your story: &ldquo;\{orderQuote\}&rdquo;/.test(triage) && !/You told us there is already a court order/.test(triage));

// ---- 4. Small Claims: the amount offered is the one owed, with its sentence --
const owed = amountFromStory("I hired Test Renovations Ltd. in March 2026 to build a deck for $8,000. I paid $2,000 and they never finished. $6,000 is still owed back to me.");
check("Small Claims: the amount still owed is offered, with its sentence", owed?.value === "$6,000" && owed.quote === "$6,000 is still owed back to me.", JSON.stringify(owed));

// ---- 2. The chat, in all three areas, as a person reaches it ---------------
const STORY = "I hired Test Renovations Ltd. in March 2026 to build a deck for $8,000. I paid $2,000 and they never finished. $6,000 is still owed back to me. I have text messages, the signed contract and a bank receipt.";
void (async () => {
  for (const court of ["small-claims", "family", "civil"] as const) {
    const [gather, asked] = await chatReplies(court, STORY, ["What should I gather first?", "How long do I have to respond?"]);
    const told = /From what you told us, you have: ([\s\S]*?) Keep these together/.exec(gather);
    const quotes = told ? [...told[1].matchAll(/“([^”]+)”/g)].map((m) => m[1]) : [];
    check(`${court}: the evidence reply quotes what the story already lists`, quotes.length > 0 && quotes.every((quote) => STORY.includes(quote)), gather.slice(0, 240));
    check(`${court}: it does not ask what proof the person has when the story lists it`, !/What proof do you already have/i.test(gather), gather.slice(0, 240));
    check(`${court}: a question is never recorded as a fact`, !/added the new information to the case record/i.test(asked) && !asked.includes("How long do I have to respond?"), asked.slice(0, 240));
    check(`${court}: a question opens with where its answer is (the checked law)`, asked.startsWith("The law on your question is shown below"), asked.slice(0, 160));
  }
  if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
  console.log("PASS fact sources: no fact about the person's case without its source, in all three areas");
})();
