/**
 * THE NEW SMALL CLAIMS FLOW'S CORE, WITHOUT A BROWSER (site owner, 26 Nov 2026, rebuild step 2).
 *
 * Checks, as properties, over every Small Claims story of the journey matrix (tests/browser/matrix/matrixStories.ts),
 * signed in (with the story's recorded AI reading, tests/browser/fixtures/real-ai) and as a guest (no reading):
 *   1. the story's facts become record slots "stated in the story" (flow/storyStated.ts withStoryStated), never the
 *      person's own answer, and the Understood step offers exactly those, once (missingFacts "reading");
 *   2. Jason's story (chrome-defamation): the amount and the date are offered from the story; a guest's offers come from
 *      the story alone (the reading is never read for a guest);
 *   3. confirmed on the Understood step, a fact is never offered or asked again (missingFacts "reading" and
 *      "questions"); said "not right", it is asked on the Questions page, once, and never offered again; "not sure"
 *      settles it;
 *   4. with nothing filed, no fact about court papers (claimServed, filed, servedDate, claimIssuedDate, courtFileNumber,
 *      courtDate, conferenceDate, defenceFiledDate) is offered or asked by the new flow; the defence's own facts only for
 *      the person responding; a kind's own question (who heard the words) only once that kind is the person's;
 *   5. the Questions page's words come from the question bank, and every question asks the fact it is listed for
 *      (factsOfQuestion.ts), so the wording table cannot drift from the facts;
 *   7. the flow's questions are all the review's Confirm needs: Yes to every Understood line and "not sure" to every
 *      question on the Questions page leaves nothing in intakeReview.ts remainingEssentialQuestions, so its Confirm is
 *      never refused (the matrix's served-defendant and wrong-place journeys, 26 Nov 2026: "Review was not saved",
 *      because the papers' questions were asked by the Confirm's gate and not by the Questions page);
 *   8. the other side's name the story gives is offered on the Parties step from the story's own words, with no AI
 *      (storyOffers.ts offeredOtherParty, its Small Claims part): every SC matrix story's own other side; two people named, nothing; the
 *      person's own name, never (the new flow's matrix, 26 Nov 2026: asked cold in 6 of 7 stories, because names are
 *      hidden from the AI reading);
 *   9. every fact a story gives (the matrix story's own list) that the Understood step holds is offered there, signed
 *      in and as a guest: the other side's name is the Parties step's (check 8). The kitchen story's deposit, demand
 *      letter and job (26 Nov 2026) were never offered;
 *  10. the element map is built once when a catalogue kind is confirmed (flow/elementMapForKind.ts), with every element of
 *      the kind not yet, saved in flow.elementStates (which the case file reads), and never built again; a held record
 *      is kept (the contractor case with no map saved, 27 Nov 2026, whose "I have this" threw);
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
import { withStoryStated, STATED_EXTRAS, STATED_FACTS, understoodOfferKey, type FlowReading, type StatedFact } from "../../src/lib/case-system/flow/storyStated";
import { factsOfQuestion } from "../../src/lib/case-system/caseFile/factsOfQuestion";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { remainingEssentialQuestions } from "../../src/lib/case-system/intakeReview";
import { offeredOtherParty } from "../../src/lib/case-system/caseFile/storyOffers";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { elementMapForKind } from "../../src/lib/case-system/flow/elementMapForKind";

const ROOT = process.cwd();
const smallClaimsOtherSide = (story: string) => offeredOtherParty(story, [], { court: "small-claims" });
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
const confirmed = (record: CaseFile, fact: SlotFact): CaseFile => ({ ...record, [fact]: { ...record[fact], confirmed: true, source: { kind: "answer", question: "reading" } } });
/** "No, that's not right" on the Understood step, as the page keeps it (its offer choice), read again through the core. */
const notRight = (before: CaseFile, story: (typeof MATRIX_STORIES)[number], signedIn: boolean, fact: StatedFact): CaseFile => withStoryStated(before, { story: story.text, reading: readingOf(story.id), signedIn, choices: { [understoodOfferKey(fact)]: "no" } });
const notSure = (record: CaseFile, fact: SlotFact): CaseFile => ({ ...record, [fact]: { state: "unsure", source: { kind: "answer", question: "reading" }, confirmed: true } });
const asked = (record: CaseFile) => missingFacts(record, "questions").flatMap((item) => item.facts as string[]);
const offered = (record: CaseFile) => missingFacts(record, "reading").map((item) => item.field);

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
    // The facts with no slot the story states (what was paid, what was tried to settle it), offered after the slots.
    const extras = STATED_EXTRAS.filter((fact) => record.storyStated?.[fact]);
    check(`${who}: every story value is stated in the story, not confirmed`, stated.every((fact) => record[fact].confirmed === false), stated.join(","));
    check(`${who}: the Understood step offers exactly the stated facts`, JSON.stringify(offered(record)) === JSON.stringify([...stated, ...extras]), `${offered(record)} vs ${[...stated, ...extras]}`);
    for (const fact of extras) {
      // A fact with no slot: the person's Yes is their answer under its own id; any choice ("no", "not sure") ends the offer.
      const answered = withStoryStated({ ...before, answers: { ...before.answers, [fact]: record.storyStated?.[fact]?.value ?? "" } }, { story: story.text, reading: readingOf(story.id), signedIn });
      check(`${who}: "${fact}" confirmed is not offered again`, !offered(answered).includes(fact));
      for (const choice of ["no", "unsure"]) check(`${who}: "${fact}" answered "${choice}" is not offered again`, !offered(withStoryStated(before, { story: story.text, reading: readingOf(story.id), signedIn, choices: { [understoodOfferKey(fact)]: choice } })).includes(fact));
    }
    check(`${who}: nothing offered is also asked`, !offered(record).some((fact) => asked(record).includes(fact)), `${offered(record)} / ${asked(record)}`);
    // 3. Confirm everything offered: nothing of it is offered or asked again.
    let all = record;
    for (const fact of stated) all = confirmed(all, fact);
    if (extras.length) all = { ...all, answers: { ...all.answers, ...Object.fromEntries(extras.map((fact) => [fact, record.storyStated?.[fact]?.value ?? ""])) }, storyStated: undefined };
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
  const withPublication = { ...confirmed(signedIn, "amount"), claimKind: { state: "answered", value: "sc-claim-defamation-libel-slander", source: { kind: "answer", question: "reading" }, confirmed: true } } as CaseFile;
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

// 7. The Questions page asks all the Confirm needs.
for (const story of SMALL_CLAIMS) {
  for (const signedIn of [true, false]) {
    const who = `${story.id} ${signedIn ? "signed in" : "guest"}`;
    const builder: Record<string, unknown> = {};
    const checkpoint = { version: 1, flowId: ID, courtPath: "small-claims", revision: ID, sections: { story: { text: story.text }, situation: { record: { ...story.situation, courtFrom: "choice" } }, builder } } as unknown as Checkpoint;
    const read = () => withStoryStated(caseFileOf(checkpoint), { story: story.text, reading: readingOf(story.id), signedIn });
    const answers: Record<string, string> = {};
    for (const item of missingFacts(read(), "reading")) {
      const question = FLOW_QUESTIONS.find((entry) => entry.fact === item.field)?.question;
      if (question && item.value) answers[question] = item.value;
    }
    builder.initialAnswers = answers;
    builder.initialUnknowns = missingFacts(read(), "questions").map((item) => item.field);
    const left = remainingEssentialQuestions(checkpoint).map((question) => question.id);
    check(`${who}: after the flow's questions, the review's Confirm needs nothing more`, left.length === 0, left.join(", "));
  }
}

// 8. The other side's name, from the story's own words.
for (const story of SMALL_CLAIMS) {
  const expected = (story as { facts?: { otherParty?: string } }).facts?.otherParty ?? null;
  const offer = smallClaimsOtherSide(story.text);
  check(`${story.id}: the other side the story names is offered from its words`, offer?.value === expected && Boolean(offer && story.text.includes(offer.quote)), JSON.stringify(offer));
}
check("two people named: no other side is offered", smallClaimsOtherSide("Synthetic: my friend Sam Testone and my neighbour Pat Testtwo both owe me $500.") === null);
check("the person's own name is never the other side", smallClaimsOtherSide("Synthetic: My name is Lee Testself. I am owed $800 for work I did.") === null);

// 9. Every fact the story gives, that the Understood step holds, is offered there.
for (const story of SMALL_CLAIMS) {
  const given = Object.keys((story as { facts?: Record<string, string> }).facts ?? {}).filter((fact) => fact !== "otherParty" && ([...STATED_FACTS, ...STATED_EXTRAS] as readonly string[]).includes(fact));
  for (const signedIn of [true, false]) {
    const shown = offered(withStoryStated(recordOf(story), { story: story.text, reading: readingOf(story.id), signedIn }));
    const missed = given.filter((fact) => !shown.includes(fact));
    check(`${story.id} ${signedIn ? "signed in" : "guest"}: every fact the story gives is offered on the Understood step`, missed.length === 0, missed.join(", "));
  }
}

// 10. The element map, built once when the kind is confirmed (site owner, 27 Nov 2026, decision 1): the contractor case
// with no map saved (staging 91f708d3), whose "I have this" threw on every element.
{
  const KIND_QUESTION = FLOW_QUESTIONS.find((item) => item.fact === "claimKind")?.question ?? "";
  const withKind = (kindId: string | null, depthStateMap?: Record<string, unknown>) => caseFileOf({ version: 1, flowId: ID, courtPath: "small-claims", revision: ID,
    sections: { story: { text: "Synthetic: the kitchen was left half done." }, builder: { initialAnswers: kindId ? { [KIND_QUESTION]: kindId } : {} }, ...(depthStateMap ? { flow: { elementStates: depthStateMap } } : {}) } } as unknown as Checkpoint);
  for (const kind of CLAIM_TYPES) {
    const ids = kind.plaintiffElements.map((element) => element.id);
    const built = elementMapForKind(withKind(kind.id));
    check(`${kind.id}: confirmed with no map saved, a map is built with every element, each not yet`, Boolean(built) && ids.every((id) => built![id]?.state === "not-yet"), built ? ids.filter((id) => !built[id]).join(", ") : "nothing built");
    check(`${kind.id}: the built map, saved in the checkpoint, is the case file's own (and nothing is built again)`, built !== null && elementMapForKind(withKind(kind.id, built)) === null);
  }
  const contractor = CLAIM_TYPES.find((type) => type.id === "sc-claim-contractor-poor-or-incomplete-work")!;
  const first = contractor.plaintiffElements[0];
  const held = { [first.id]: { elementId: first.id, elementName: first.name, state: "provided", providedVia: "depth-answer", userText: "The signed contract", questionId: "attestation:x" } };
  const partial = elementMapForKind(withKind(contractor.id, held));
  check("a map that holds some of the kind's elements keeps each record as it is and adds the rest", partial !== null && partial[first.id]?.state === "provided" && partial[first.id]?.userText === "The signed contract" && contractor.plaintiffElements.every((element) => partial[element.id]));
  check("the checkpoint's map is read as the case file's element map", withKind(null, held).elementStates?.[first.id] !== undefined);
  check("no kind confirmed: nothing is built", elementMapForKind(withKind(null)) === null);
  check("a category word is not a catalogue kind: nothing is built", elementMapForKind(withKind("Work or a service you paid for (e.g. a contractor)")) === null);
  const shell = readFileSync(path.join(ROOT, "app/builder/_flow/SmallClaimsFlow.tsx"), "utf8");
  check("the flow saves the built map once, through the one writer, into flow.elementStates", /elementMapForKind\(record\)/.test(shell) && /writeAnswer\(recovery,\s*"flow",\s*"elementStates"/.test(shell));
}

if (failures) { console.log(`\n${failures} check(s) failed.`); process.exit(1); }
console.log("\nThe new Small Claims flow's core: every check passed.");
