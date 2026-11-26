/**
 * THE NEW SMALL CLAIMS FLOW'S CORE, WITHOUT A BROWSER (site owner, 26 Nov 2026, rebuild step 2).
 *
 * Checks, as properties, over every Small Claims story of the journey matrix (tests/browser/matrix/matrixStories.ts),
 * signed in (with the story's recorded AI reading, tests/browser/fixtures/real-ai) and as a guest (no reading):
 *   1. the story's facts become record slots "stated in the story" (flow/storyStated.ts withStoryStated), never the
 *      person's own answer, and the Understood step offers exactly those, once (missingFacts "understood");
 *   2. Jason's story (chrome-defamation): the amount and the date are offered from the story; a guest's offers come from
 *      the story alone (the reading is never read for a guest);
 *   3. confirmed on the Understood step, a fact is never offered or asked again (missingFacts "understood" and
 *      "questions"); said "not right", it is asked on the Questions page, once, and never offered again; "not sure"
 *      settles it;
 *   4. with nothing filed, no fact about court papers (claimServed, filed, servedDate, claimIssuedDate, courtFileNumber,
 *      courtDate, conferenceDate, defenceFiledDate) is offered or asked by the new flow; the defence's own facts only for
 *      the person responding; a kind's own question (who heard the words) only once that kind is the person's;
 *   5. the Questions page's words come from the question bank, and every question asks the fact it is listed for
 *      (factsOfQuestion.ts), so the wording table cannot drift from the facts;
 *   6. withStoryStated never changes the record it is given (the old screens read the record as before) and never
 *      replaces the person's own answer, "not sure", or a story value they said was not right.
 *
 * Failure it exists to catch: the new flow asking again what the story said or the person confirmed (Jason's live test),
 * asking about court papers that do not exist, or a guest's story read with the AI.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { caseFileOf, type CaseFile, type SlotFact } from "../../src/lib/case-system/caseFile/caseFile";
import { missingFacts, FLOW_QUESTIONS } from "../../src/lib/case-system/caseFile/missingFacts";
import { withStoryStated, STATED_FACTS, understoodOfferKey, type FlowReading, type StatedFact } from "../../src/lib/case-system/flow/storyStated";
import { factsOfQuestion } from "../../src/lib/case-system/caseFile/factsOfQuestion";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { MATRIX_STORIES } from "../../tests/browser/matrix/matrixStories";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ID = "00000000-0000-4000-8000-000000000001";
const PAPER_FACTS = ["claimServed", "filed", "servedDate", "claimIssuedDate", "courtFileNumber", "courtDate", "conferenceDate", "defenceFiledDate"];

/** The record of a matrix story as the builder holds it after the start and the story (no answers yet). */
function recordOf(story: (typeof MATRIX_STORIES)[number]): CaseFile {
  const checkpoint: Checkpoint = { version: 1, flowId: ID, courtPath: "small-claims", revision: ID, sections: { story: { text: story.text }, situation: { record: { ...story.situation, courtFrom: "choice" } } } } as Checkpoint;
  return caseFileOf(checkpoint);
}

/** The story's recorded AI reading (its facts and matters' titles), as the home page received it. */
function readingOf(id: string): FlowReading | null {
  const file = path.join("tests", "browser", "fixtures", "real-ai", `matrix-${id}`, "r1.json");
  if (!existsSync(file)) return null;
  const entry = (JSON.parse(readFileSync(file, "utf8")) as { entries: { step: string; output: unknown }[] }).entries.find((item) => item.step === "story-reading");
  if (!entry) return null;
  const output = (typeof entry.output === "string" ? JSON.parse(entry.output) : entry.output) as { facts?: { label: string; value: string }[]; matters?: { title: string }[] };
  return { facts: output.facts ?? [], matterTitles: (output.matters ?? []).map((matter) => matter.title) };
}

/** A fact confirmed on the Understood step: the person's own answer (the slot the record keeps for it). */
const confirmed = (record: CaseFile, fact: SlotFact): CaseFile => ({ ...record, [fact]: { ...record[fact], confirmed: true, source: { kind: "answer", question: "understood" } } });
/** "No, that's not right" on the Understood step, as the page keeps it (its offer choice), read again through the core. */
const notRight = (before: CaseFile, story: (typeof MATRIX_STORIES)[number], signedIn: boolean, fact: StatedFact): CaseFile => withStoryStated(before, { story: story.text, reading: readingOf(story.id), signedIn, choices: { [understoodOfferKey(fact)]: "no" } });
const notSure = (record: CaseFile, fact: SlotFact): CaseFile => ({ ...record, [fact]: { state: "unsure", source: { kind: "answer", question: "understood" }, confirmed: true } });
const asked = (record: CaseFile) => missingFacts(record, "questions").flatMap((item) => item.facts as string[]);
const offered = (record: CaseFile) => missingFacts(record, "understood").map((item) => item.field);

const SMALL_CLAIMS = MATRIX_STORIES.filter((story) => story.court === "small-claims");
check("the matrix has Small Claims stories, Jason's among them", SMALL_CLAIMS.length >= 6 && SMALL_CLAIMS.some((story) => story.id === "chrome-defamation"), SMALL_CLAIMS.map((s) => s.id).join(", "));

for (const story of SMALL_CLAIMS) {
  const before = recordOf(story);
  const frozen = JSON.stringify(before);
  for (const signedIn of [true, false]) {
    const who = `${story.id} ${signedIn ? "signed in" : "guest"}`;
    const record = withStoryStated(before, { story: story.text, reading: readingOf(story.id), signedIn });
    check(`${who}: the record it was given is unchanged`, JSON.stringify(before) === frozen);
    // 1. Stated, never the person's own; offered exactly once each.
    const stated = STATED_FACTS.filter((fact) => record[fact]?.source?.kind === "story");
    check(`${who}: every story value is stated in the story, not confirmed`, stated.every((fact) => record[fact].confirmed === false), stated.join(","));
    check(`${who}: the Understood step offers exactly the stated facts`, JSON.stringify(offered(record)) === JSON.stringify(stated), `${offered(record)} vs ${stated}`);
    check(`${who}: nothing offered is also asked`, !offered(record).some((fact) => asked(record).includes(fact)), `${offered(record)} / ${asked(record)}`);
    // 3. Confirm everything offered: nothing of it is offered or asked again.
    let all = record;
    for (const fact of stated) all = confirmed(all, fact);
    check(`${who}: confirmed once, never offered or asked again`, offered(all).length === 0 && !stated.some((fact) => asked(all).includes(fact)), `${offered(all)} / ${asked(all)}`);
    if (stated.length) {
      const first = stated[0];
      const wrong = notRight(before, story, signedIn, first);
      check(`${who}: "${first}" said not right is asked on the Questions page and not offered again`, asked(wrong).includes(first) && !offered(wrong).includes(first), `${asked(wrong)} / ${offered(wrong)}`);
      check(`${who}: "${first}" said not sure is never asked or offered`, !asked(notSure(record, first)).includes(first) && !offered(notSure(record, first)).includes(first));
      check(`${who}: a second reading never replaces a value said not right`, withStoryStated(wrong, { story: story.text, reading: readingOf(story.id), signedIn, choices: { [understoodOfferKey(first)]: "no" } })[first].declined === true);
    }
    // 4. Nothing about court papers when nothing is filed; the defence's facts only when responding.
    const everything = [...offered(record), ...asked(record), ...asked(all)];
    if (story.nothingFiled) check(`${who}: nothing filed, so no question about court papers`, !everything.some((fact) => PAPER_FACTS.includes(fact)), everything.join(","));
    const responding = story.side === "defendant";
    const defence = missingFacts(all, "questions").map((item) => item.field).filter((id) => ["sc-defendant-response-facts", "sc-defendant-admission-payment", "sc-defendant-counterclaim"].includes(id));
    check(`${who}: the defence's questions ${responding ? "are" : "are not"} asked`, responding ? defence.length > 0 : defence.length === 0, defence.join(","));
    check(`${who}: who heard the words is asked only once the kind is defamation`, !missingFacts(all, "questions").some((item) => item.field === "sc-defamation-publication-details") || (all.claimKind.confirmed && /defamation/.test(String(all.claimKind.value))));
  }
}

// 2. Jason's story.
{
  const story = SMALL_CLAIMS.find((item) => item.id === "chrome-defamation")!;
  const signedIn = withStoryStated(recordOf(story), { story: story.text, reading: readingOf(story.id), signedIn: true });
  const guest = withStoryStated(recordOf(story), { story: story.text, reading: readingOf(story.id), signedIn: false });
  check("Jason's story: the amount is offered from the story", /10,?000/.test(String(signedIn.amount.value)) && signedIn.amount.source?.kind === "story", JSON.stringify(signedIn.amount));
  check("Jason's story: the date is offered from the story", /2025-09-14|September 14, 2025/.test(String(signedIn.whenHappened.value)), JSON.stringify(signedIn.whenHappened));
  check("Jason's story: the date's words are the story's own sentence", signedIn.whenHappened.source?.kind === "story" && signedIn.whenHappened.source.quote === "She said it on sept 14 2025.", JSON.stringify(signedIn.whenHappened.source));
  check("every story value's words are in the story", SMALL_CLAIMS.every((item) => { const r = withStoryStated(recordOf(item), { story: item.text, reading: readingOf(item.id), signedIn: true }); return STATED_FACTS.every((fact) => r[fact].source?.kind !== "story" || item.text.includes(r[fact].source.quote)); }));
  check("Jason's story: a guest is offered the same from the story alone", guest.amount.value === signedIn.amount.value && guest.whenHappened.value === signedIn.whenHappened.value);
  const kind = String(signedIn.claimKind.value ?? "");
  check("Jason's story: the kind is offered only when one kind fits, else asked on the Questions page", signedIn.claimKind.source?.kind === "story" ? /defamation/.test(kind) : asked(signedIn).includes("claimKind"), JSON.stringify(signedIn.claimKind));
  const withPublication = { ...confirmed(signedIn, "amount"), claimKind: { state: "answered", value: "sc-claim-defamation-libel-slander", source: { kind: "answer", question: "understood" }, confirmed: true } } as CaseFile;
  check("Jason's story: once the kind is defamation, who heard the words is asked", missingFacts(withPublication, "questions").some((item) => item.field === "sc-defamation-publication-details"));
  check("Jason's story: said not sure, who heard the words is not asked again", !missingFacts({ ...withPublication, unknownQuestions: ["sc-defamation-publication-details"] }, "questions").some((item) => item.field === "sc-defamation-publication-details"));
  const viaRecord = caseFileOf({ version: 1, flowId: ID, courtPath: "small-claims", revision: ID, sections: { story: { text: story.text }, builder: { initialUnknowns: ["sc-defamation-publication-details"] } } } as Checkpoint);
  check("the record reads the questions said not sure (builder.initialUnknowns)", viaRecord.unknownQuestions?.includes("sc-defamation-publication-details") === true, JSON.stringify(viaRecord.unknownQuestions));
  check("Jason's story: once answered, who heard the words is not asked again", !missingFacts({ ...withPublication, answers: { "sc-defamation-publication-details": "Her friends, at a party" } }, "questions").some((item) => item.field === "sc-defamation-publication-details"));
}

// 5. Wording only from the question bank; each question asks the fact it is listed for.
{
  const bank = new Set(QUESTION_BANK.map((question) => question.id));
  const missing = FLOW_QUESTIONS.filter((item) => !bank.has(item.question));
  check("every question of the Questions page is in the question bank", missing.length === 0, JSON.stringify(missing));
  const wrong = FLOW_QUESTIONS.filter((item) => !factsOfQuestion(item.question).includes(item.fact));
  check("every question asks the fact it is listed for", wrong.length === 0, JSON.stringify(wrong));
  check("no fact is listed twice", new Set(FLOW_QUESTIONS.map((item) => item.fact)).size === FLOW_QUESTIONS.length);
}

if (failures) { console.log(`\n${failures} check(s) failed.`); process.exit(1); }
console.log("\nThe new Small Claims flow's core: every check passed.");
