/**
 * THE SMALL CLAIMS ASKER (founder's plan, step 5, "the memory fix", 1 Nov): one saved record per case,
 * one writer, one reader (caseFileOf), ONE ASKER -- the question engine (intake/asker.ts, used by
 * selectQuestions.ts). Before any Small Claims question is shown, the engine asks the case file whether
 * that question's fact is already held (answered, "not sure", or removed). Newest wins; "not sure" is
 * never asked again; a suggestion is offered, never pre-ticked.
 *
 * Checks, as properties over the whole Small Claims question bank and Form 7A's own list of what it
 * needs (never a list of today's question ids):
 *   1. THE ENGINE: for every reviewed Small Claims question that asks for a case-file fact, held answered,
 *      unsure or removed, the engine (selectQuestions with the case file) never returns it; with nothing
 *      held it still does (the gate is not closed for everything).
 *   2. THE CHAT: the turn (orchestrateIntakeTurn, every model step a plain stand-in) never asks, nor
 *      offers as a story proposal, a question whose fact the case file holds; the guided-turn route takes
 *      the case file and hands it to the turn; the chat page sends it rather than deciding itself.
 *   3. THE REVIEW: its questions come from the engine with the case file; each box decides through the asker.
 *   4. RISK (a), A BOX FORM 7A NEEDS: every field the Form 7A draft engine reports missing when empty
 *      (statementOfClaimDraftEngine.ts missingParticulars, derived by running it, not listed here) has a
 *      box on the Small Claims form, is askable while not held, and, held, reaches the form and the draft.
 *   5. RISK (b), A STORY GUESS: a value guessed from the story (a slot with confirmed false, a proposal, an
 *      unticked kind) never counts as held: it never hides the question, is never filled into a box as
 *      answered, and the chat's proposal card starts unticked.
 *   6. THE CARRY RUN'S "remove a value" STEP (otherParty @ review-entry): through the real save path (followAnswer)
 *      and the harness's own held reader (askOnce.ts heldFacts): a saved row read before the removal holds
 *      otherParty answered; once the removal is saved it holds nothing, so the held rule cannot fire. Logs the
 *      review-then-form case, where emptying the form box leaves the review answer held.
 *
 * WHAT FAILURE THIS CATCHES: a Small Claims question shown although its fact is held (asked twice); a
 * form box left empty while the case file holds the person's answer (asked twice on the form); a box
 * Form 7A needs hidden or never filled; a story guess hiding a question or filling a box as if answered.
 */
import fs from "node:fs";
import path from "node:path";
import { caseFileOf, emptyCaseFile, followAnswer, slotsOfQuestion, withChange, CASE_FILE_SECTION, type CaseFile, type Slot, type SlotFact } from "../../src/lib/case-system/caseFile/caseFile";
import { heldFacts } from "../../tests/browser/harness/askOnce";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { selectQuestions, type IntakeFacts } from "../../src/lib/case-system/intake/selectQuestions";
import { orchestrateIntakeTurn, applyConfirmedStoryAnswers } from "../../src/lib/case-system/intake/orchestrateIntakeTurn";
import { draftStatementOfClaimParticulars, type StatementOfClaimDraftInput } from "../../src/lib/case-system/statementOfClaimDraftEngine";
import { reviewBoxState, type ReviewEntry } from "../../src/lib/case-system/intakeReview";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ROOT = path.resolve(__dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

type Ask = { ask: boolean; held?: "answered" | "unsure" | "removed" };
type Asker = {
  askOf: (file: CaseFile | null | undefined, id: string, surface?: string) => Ask;
  mayAsk: (file: CaseFile | null | undefined, id: string, surface?: string) => boolean;
  askedFacts: (id: string, surface?: string) => SlotFact[];
  heldWords: (file: CaseFile | null | undefined, id: string) => string | null;
  formFill: (file: CaseFile | null | undefined, values: Record<string, unknown>, filledBefore: readonly string[]) => Record<string, string>;
  FILLABLE_FACTS: readonly SlotFact[];
  fillable: (field: string) => boolean;
  heldForEngine: (file: CaseFile) => unknown;
  heldFromRequest: (value: unknown) => CaseFile | null;
};

const ID = "00000000-0000-4000-8000-000000000105";
const STORY = "Synthetic story: I paid Synthetic Decks Ltd. $5,000 in March 2026 to build a deck. They never finished it.";
const checkpoint = (sections: Record<string, Record<string, unknown>>): Checkpoint => ({ version: 1, flowId: ID, courtPath: "small-claims", revision: ID, sections: { story: { text: STORY, location: { province: "Ontario", city: "Kingston" } }, ...sections } });

const slotIn = (state: "answered" | "unsure" | "removed", fact: SlotFact): Slot =>
  state === "removed" ? { state: "not-asked", confirmed: true, removed: true, changed: true, source: { kind: "answer", question: "change" } }
  : state === "unsure" ? { state: "unsure", confirmed: true, source: { kind: "answer", question: "test" } }
  : { state: "answered", value: fact === "amount" ? 6400 : fact === "whenHappened" ? "2026-03-03" : `Synthetic ${fact}`, confirmed: true, source: { kind: "answer", question: "test" } };
/** A story guess: a value read from the story, never confirmed by the person. */
const guessed = (fact: SlotFact): Slot => ({ state: "answered", value: fact === "amount" ? 5000 : `Guessed ${fact}`, confirmed: false, source: { kind: "story", quote: STORY } });
const fileWith = (facts: readonly SlotFact[], slot: (fact: SlotFact) => Slot): CaseFile => {
  const file = emptyCaseFile();
  for (const fact of facts) file[fact] = slot(fact);
  return file;
};

async function main() {
  const asker = (await import("../../src/lib/case-system/intake/asker").catch((error) => { console.log(`      (intake/asker.ts not loadable: ${error instanceof Error ? error.message.split("\n")[0] : error})`); return null; })) as Asker | null;
  check("the one asker exists in the question engine (src/lib/case-system/intake/asker.ts)", Boolean(asker && typeof asker.askOf === "function"));

  // The Small Claims questions the engine can return, over the fact sets that open its branches.
  const FACT_SETS: IntakeFacts[] = [{}, { role: "plaintiff" }, { role: "defendant" }, { role: "plaintiff", claimFiled: true }, { role: "plaintiff", claimFiled: true, claimServed: true }, { role: "defendant", claimServed: true }, { role: "plaintiff", disputeCategory: "personal-injury" }];
  const reachable = new Map<string, IntakeFacts>();
  for (const facts of FACT_SETS) for (const id of selectQuestions(facts, [], QUESTION_BANK, "small-claims", "all")) if (!reachable.has(id)) reachable.set(id, facts);
  const withFacts = [...reachable].filter(([id]) => slotsOfQuestion(id).length > 0);
  check("the Small Claims bank has questions that ask for case-file facts (the checks below are not vacuous)", withFacts.length >= 5, String(withFacts.length));

  // 1. THE ENGINE.
  const select = selectQuestions as unknown as (facts: IntakeFacts, answered: string[], bank: typeof QUESTION_BANK, area: "small-claims", purpose: "all", options: { held: CaseFile | null }) => string[];
  for (const [id, facts] of withFacts) {
    const own = slotsOfQuestion(id);
    check(`engine: ${id} is still asked with nothing held`, select(facts, [], QUESTION_BANK, "small-claims", "all", { held: emptyCaseFile() }).includes(id));
    for (const state of ["answered", "unsure", "removed"] as const) {
      const held = fileWith(own, (fact) => slotIn(state, fact));
      check(`engine: ${id} (${own.join(", ")}) held ${state}: never returned`, !select(facts, [], QUESTION_BANK, "small-claims", "all", { held }).includes(id));
    }
    // 5. RISK (b): a story guess is not held.
    check(`risk (b), engine: ${id} with its fact only guessed from the story is still asked`, select(facts, [], QUESTION_BANK, "small-claims", "all", { held: fileWith(own, guessed) }).includes(id));
  }
  // A question that asks for no case-file fact is the screen's own: never hidden by the case file.
  const ownQuestion = [...reachable].find(([id]) => slotsOfQuestion(id).length === 0);
  if (ownQuestion) {
    const everything = fileWith(["side", "amount", "wants", "whenHappened", "otherParty", "claimKind", "filed", "defenceFiled", "servedDate", "story"], (fact) => slotIn("answered", fact));
    check(`engine: a question with no case-file fact (${ownQuestion[0]}) is never hidden by the case file`, select(ownQuestion[1], [], QUESTION_BANK, "small-claims", "all", { held: everything }).includes(ownQuestion[0]));
  }

  if (asker) {
    for (const [id] of withFacts) {
      const own = slotsOfQuestion(id);
      check(`asker: ${id} held answered -> not asked, held "answered"`, asker.askOf(fileWith(own, (fact) => slotIn("answered", fact)), id).held === "answered");
      check(`asker: ${id} held not sure -> not asked, held "unsure"`, asker.askOf(fileWith(own, (fact) => slotIn("unsure", fact)), id).held === "unsure");
      check(`risk (b), asker: ${id} guessed from the story -> asked, no words held`, asker.mayAsk(fileWith(own, guessed), id) && asker.heldWords(fileWith(own, guessed), id) === null);
    }
    check("asker: no case file -> asked", asker.mayAsk(null, "sc-amount-claimed"));
  }

  // 2. THE CHAT: the real turn, every model step a plain stand-in (as the browser harness does).
  const overrides = {
    intakeOnly: true,
    runSafety: async () => ({ classification: "clear" as const, reason: "test", requestsLegalAdvice: false }),
    extractFacts: async () => ({ facts: { role: "plaintiff" } as IntakeFacts, directFields: ["role"] as never[] }),
    classifyClaimType: async () => null,
    // Proposes an answer to every question it is offered: so any held question offered shows up here.
    proposeAnswers: async (story: string, questions: readonly { id: string; text: string }[]) => questions.map((question) => ({ questionId: question.id, questionText: question.text, answer: "Synthetic", storyQuote: story.split(/(?<=[.!?])\s+/)[0] ?? story })),
  };
  const heldChat = fileWith(["amount", "whenHappened", "wants"], (fact) => slotIn(fact === "wants" ? "unsure" : "answered", fact));
  const chatHeldFacts = new Set<SlotFact>(["amount", "whenHappened", "wants"]);
  const asked: string[] = [];
  const offered: string[] = [];
  let facts: IntakeFacts = {};
  let answeredIds: string[] = [];
  let text: string | undefined = STORY;
  let questionId: string | undefined;
  for (let turn = 0; turn < 25; turn++) {
    const result = await orchestrateIntakeTurn(facts, answeredIds, text, "no-model", QUESTION_BANK, undefined, "small-claims", questionId, { ...overrides, held: heldChat } as never);
    offered.push(...(result.storyProposals ?? []).map((proposal) => proposal.questionId));
    if (!result.nextQuestion) break;
    asked.push(result.nextQuestion.id);
    facts = result.facts; answeredIds = [...result.answeredIds, result.nextQuestion.id]; questionId = result.nextQuestion.id; text = "I don't know";
  }
  const askedHeld = asked.filter((id) => slotsOfQuestion(id).some((fact) => chatHeldFacts.has(fact)));
  check("chat: the turn never asks a question whose fact the case file holds (answered or not sure)", askedHeld.length === 0, `asked: ${askedHeld.join(", ")}`);
  check("chat: the turn still asks the questions whose facts are not held", asked.length > 0, `asked: ${asked.join(", ")}`);
  const offeredHeld = offered.filter((id) => slotsOfQuestion(id).some((fact) => chatHeldFacts.has(fact)));
  check("chat: the story's proposals never offer a question whose fact the case file holds", offeredHeld.length === 0, `offered: ${offeredHeld.join(", ")}`);
  check("chat: held questions are never written into the turn's answered ids (they are held, not answered here)", !answeredIds.some((id) => slotsOfQuestion(id).some((fact) => chatHeldFacts.has(fact))), answeredIds.join(", "));
  const confirmed = await applyConfirmedStoryAnswers({ role: "plaintiff" }, [], [], "no-model", QUESTION_BANK, "small-claims", { ...overrides, held: heldChat } as never, { story: STORY, alreadyOffered: [] });
  const confirmedHeld = [confirmed.nextQuestion?.id, ...(confirmed.storyProposals ?? []).map((proposal) => proposal.questionId)].filter((id): id is string => Boolean(id) && slotsOfQuestion(id!).some((fact) => chatHeldFacts.has(fact)));
  check("chat: after confirming the story's answers, no held question is asked or offered again", confirmedHeld.length === 0, confirmedHeld.join(", "));

  // The route takes the case file and hands it to the turn.
  process.env.OPENAI_API_KEY ||= "no-model-in-tests";
  const { createGuidedTurnPost } = await import("../../app/api/intake/guided-turn/route");
  let handed: unknown = "not called";
  const post = createGuidedTurnPost({
    authenticate: (async () => ({ id: "11111111-1111-4111-8111-111111111111" })) as never,
    hasExternalAiKey: () => true,
    orchestrate: (async (...args: unknown[]) => { handed = (args[8] as { held?: unknown } | undefined)?.held ?? null; return { safetyClassification: "clear", halted: false, facts: {}, answeredIds: [], matchedClaimTypes: [], intakeComplete: true, possibleCorrections: [], storyProposals: [], requestsLegalAdvice: false }; }) as never,
  } as never);
  const body = { facts: {}, answeredIds: [], newStoryText: STORY, caseFile: asker ? asker.heldForEngine(heldChat) : { amount: heldChat.amount } };
  const response = await post(new Request("http://localhost/api/intake/guided-turn", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `sc-asker-${Date.now()}` }, body: JSON.stringify(body) }) as never);
  check("chat route: a turn with the case file is accepted", response.status === 200, `status ${response.status}`);
  const handedFile = handed as CaseFile | null;
  check("chat route: the case file reaches the engine (the turn's held option)", Boolean(handedFile && typeof handedFile === "object" && (handedFile as CaseFile).amount?.state === "answered" && (handedFile as CaseFile).wants?.state === "unsure"), JSON.stringify(handed).slice(0, 200));
  if (asker) {
    check("chat route: a malformed case file is refused as a case file (nothing held, never a crash)", asker.heldFromRequest({ amount: { state: "answered", confirmed: "yes" } })?.amount.state !== "answered" && asker.heldFromRequest("x") === null);
    check("risk (b), chat route: a story guess sent as a case file is still a guess (confirmed false is kept)", asker.heldFromRequest(asker.heldForEngine(fileWith(["amount"], guessed)))?.amount.confirmed === false);
  }
  const chatPage = read("app/builder/_components/GuidedSmallClaimsIntake.tsx");
  check("chat page: sends the case file to the turn (body caseFile), through the asker", /caseFile:\s*heldForEngine\(/.test(chatPage));
  check("chat page: does not decide held questions itself (no alreadyAsked over the bank in the page)", !/QUESTION_BANK\.filter\(\(question\) => alreadyAsked/.test(chatPage));
  // 5. RISK (b): the chat's proposal card starts unticked.
  check("risk (b), chat page: the story's proposals start unticked (keep: false)", /setProposalDrafts\(result\.storyProposals\.map\(\(proposal\) => \(\{ \.\.\.proposal, keep: false/.test(chatPage));

  // 3. THE REVIEW.
  const reviewSource = read("src/lib/case-system/intakeReview.ts");
  check("review: its Small Claims questions come from the engine with the case file (selectQuestions ... { held })", /selectQuestions\(facts, answered, QUESTION_BANK, "small-claims", "initial", \{ held/.test(reviewSource));
  const entry = (field: string, value: ReviewEntry["value"] = ""): ReviewEntry => ({ section: "small-claims", field, label: field, value, essential: true });
  for (const field of ["amountClaimedText", "remedySoughtText", "timelineText"]) {
    const own = slotsOfQuestion(field);
    check(`review box ${field}: held answered -> "held"`, reviewBoxState(entry(field), fileWith(own, (fact) => slotIn("answered", fact))) === "held");
    check(`review box ${field}: held not sure -> "not-yet"`, reviewBoxState(entry(field), fileWith(own, (fact) => slotIn("unsure", fact))) === "not-yet");
    check(`risk (b), review box ${field}: only guessed from the story -> "ask" (never shown as the person's answer)`, reviewBoxState(entry(field), fileWith(own, guessed)) === "ask");
  }

  // 4. RISK (a): Form 7A's required fields, derived from the draft engine itself.
  const FILLED: StatementOfClaimDraftInput = { yourName: "Synthetic Person", yourAddress: "1 Synthetic Street, Kingston", otherParty: "Synthetic Decks Ltd.", defendantAddress: "2 Synthetic Road, Kingston", amountClaimed: "$6,400", facts: STORY, timeline: "March 3, 2026", goal: "Synthetic: the money back" };
  const EMPTY = Object.fromEntries(Object.keys(FILLED).map((key) => [key, ""])) as StatementOfClaimDraftInput;
  const missingOf = (input: StatementOfClaimDraftInput) => draftStatementOfClaimParticulars(input, null).missingParticulars;
  const labels = missingOf(EMPTY);
  check("risk (a): the Form 7A draft engine names what it needs (the list is not empty)", labels.length >= 4, labels.join("; "));
  // Each needed particular, and the fields that alone supply it.
  const required = new Map<string, string[]>();
  for (const label of labels) required.set(label, (Object.keys(FILLED) as (keyof StatementOfClaimDraftInput)[]).filter((key) => !missingOf({ ...EMPTY, [key]: FILLED[key] }).includes(label)));
  const form = read("app/builder/_components/SmallClaimsIntake.tsx");
  for (const [label, fields] of required) {
    check(`risk (a): "${label}" is supplied by a form field`, fields.length > 0);
    for (const field of fields) {
      check(`risk (a): "${label}" -- the Small Claims form has a box for ${field}`, form.includes(`sc-intake-${field}`));
      if (!asker) continue;
      const own = asker.askedFacts(field);
      // Not held: askable, whatever else the file holds.
      const others = (["side", "amount", "wants", "whenHappened", "otherParty", "claimKind", "filed", "story"] as SlotFact[]).filter((fact) => !own.includes(fact));
      check(`risk (a): ${field} not held -> its box asks (with every other fact held)`, asker.mayAsk(fileWith(others, (fact) => slotIn("answered", fact)), field));
      if (!own.length) continue;
      // Held: reaches the form (filled once into an empty box) and the draft.
      const held = fileWith(own, (fact) => fact === "story" ? { state: "answered", value: STORY, confirmed: true, source: { kind: "answer", question: "story" } } : slotIn("answered", fact));
      held.storyText = STORY;
      if (field === "facts") { check(`risk (a): ${field} held -> the draft has it`, !missingOf({ ...FILLED, facts: STORY, timeline: "" }).includes(label)); continue; }
      const fill = asker.formFill(held, { [field]: "" }, []);
      check(`risk (a): ${field} held answered -> filled into its empty box on the form`, typeof fill[field] === "string" && fill[field].trim().length > 0, JSON.stringify(fill));
      check(`risk (a): ${field} held answered -> the draft built from the form has "${label}"`, !missingOf({ ...FILLED, [field]: fill[field] ?? "" }).includes(label));
      check(`risk (a): ${field} the person typed -> never overwritten`, asker.formFill(held, { [field]: "Typed by the person" }, [])[field] === undefined);
      check(`risk (a): ${field} filled once and later cleared by the person -> never filled again`, asker.formFill(held, { [field]: "" }, [field])[field] === undefined);
      check(`risk (b): ${field} only guessed from the story -> never filled`, asker.formFill(fileWith(own, guessed), { [field]: "" }, [])[field] === undefined);
      check(`risk (a): ${field} held not sure -> not filled (the quiet line with "Add it" instead)`, asker.formFill(fileWith(own, (fact) => slotIn("unsure", fact)), { [field]: "" }, [])[field] === undefined);
      check(`risk (a): ${field} removed by the person -> not filled`, asker.formFill(fileWith(own, (fact) => slotIn("removed", fact)), { [field]: "" }, [])[field] === undefined);
    }
  }
  if (asker) {
    // A box is filled only when it asks for one fillable fact; a box that asks for none is never filled.
    for (const field of ["yourName", "yourAddress", "defendantAddress", "evidence", "damagesBreakdown"]) check(`form: ${field} asks for no fillable fact -> never filled from the case file`, !asker.fillable(field));
    for (const field of ["otherParty", "amountClaimed", "timeline", "goal"]) check(`form: ${field} asks for a fillable fact -> filled when held`, asker.fillable(field));
  }

  // 5. RISK (b), on the real reader: the story alone, and an unticked kind, hold nothing.
  const fromStory = caseFileOf(checkpoint({ guided: { matchedClaimType: { claimTypeId: "sc-claim-unpaid-debt-services", userConfirmed: false } } }));
  for (const id of ["sc-amount-claimed", "sc-orient-when-happened", "sc-orient-dispute-category"]) {
    check(`risk (b), real reader: the story alone does not hold ${id}'s fact (it is still asked)`, asker ? asker.mayAsk(fromStory, id) : select({ role: "plaintiff" }, [], QUESTION_BANK, "small-claims", "all", { held: fromStory }).includes(id));
  }
  // The person's own answer, through the real reader: held, with words for the form.
  const answered = caseFileOf(checkpoint({ guided: { earlierAnswers: [{ questionId: "sc-amount-claimed", answerText: "$6,400" }, { questionId: "sc-orient-when-happened", answerText: "March 3, 2026" }], answeredIds: ["sc-amount-claimed", "sc-orient-when-happened"] }, [CASE_FILE_SECTION]: {} }));
  if (asker) {
    const fill = asker.formFill(answered, { amountClaimed: "", timeline: "" }, []);
    check("real reader: the amount answered in the chat is filled into the form's empty amount box", /6,?400/.test(fill.amountClaimed ?? ""), JSON.stringify(fill));
    check("real reader: the date answered in the chat is filled into the form's empty timeline box", /March 3, 2026/.test(fill.timeline ?? ""), JSON.stringify(fill));
  }

  // 6. THE CARRY RUN'S "remove a value" STEP (otherParty @ review-entry, valid runs 41389173210 / 41389180946, diag
  // "step=remove a value page=otherParty:not-asked"), through the real save path (item C's followAnswer, as
  // IntakeRecovery.tsx:440-441 saves a form box) and the harness's own held reader (askOnce.ts heldFacts, which the
  // carry spec runs over the saved row every 3 s, carry-end-to-end.spec.ts:649-655). Three ways the other party is given.
  const NAME = "Jordan Testwood";
  const WAYS: { name: string; sections: Record<string, Record<string, unknown>> }[] = [
    { name: "typed in the form only", sections: { "small-claims": { input: { otherParty: NAME } } } },
    { name: "typed in the form, then changed with \"Change\" (under the change record)", sections: { "small-claims": { input: { otherParty: NAME } }, [CASE_FILE_SECTION]: { changes: withChange({}, "otherParty", { state: "answered", value: NAME }, new Date("2026-11-01T10:00:00Z")) } } },
    { name: "given in the review and typed in the form", sections: { builder: { initialAnswers: { otherParty: NAME } }, "small-claims": { input: { otherParty: NAME } } } },
  ];
  for (const way of WAYS) {
    const before = checkpoint(way.sections);
    const changes = followAnswer(before.sections, "small-claims", "input", { otherParty: NAME }, { otherParty: "" }, new Date("2026-11-01T10:05:00Z"), caseFileOf(before));
    const savedSections = { ...before.sections, "small-claims": { input: { otherParty: "" } }, ...(changes ? { [CASE_FILE_SECTION]: { ...(before.sections[CASE_FILE_SECTION] ?? {}), changes } } : {}) };
    const after: Checkpoint = { ...before, sections: savedSections };
    const fileAfter = caseFileOf(after);
    const rowBefore = heldFacts({ intakeCheckpoint: before }, "small-claims").get("otherParty") ?? null;
    const rowAfter = heldFacts({ intakeCheckpoint: after }, "small-claims").get("otherParty") ?? null;
    console.log(`      [${way.name}] change recorded: ${changes?.otherParty ? changes.otherParty.state : "none"}; saved row after: otherParty ${fileAfter.otherParty.state}${fileAfter.otherParty.removed ? " (removed)" : ""}; harness held map, row read before the save: ${rowBefore}; row read after: ${rowAfter}`);
    check(`otherParty removal (${way.name}): a held map read from the row BEFORE the removal was saved says "answered" (the held rule fires)`, rowBefore === "answered");
    // Recorded for the report: whether the saved case holds the removal. Where it does not, the review route keeps the review's own answer.
    if (way.name.startsWith("given in the review")) { console.log(`      [${way.name}] the person's review answer is still held after the form box is emptied: ${fileAfter.otherParty.state === "answered"}`); continue; }
    check(`otherParty removal (${way.name}): once the removal is saved, the harness held map holds nothing for otherParty (the held rule cannot fire)`, rowAfter === null);
    check(`otherParty removal (${way.name}): the tab's case file after the removal reads otherParty not asked, as the run's diag recorded`, fileAfter.otherParty.state === "not-asked");
    // Emptied with no change record: nothing held, the box is empty (the person emptied it). Under the record: removed, held "removed", never asked by itself.
    if (asker) check(`otherParty removal (${way.name}): the asker reads it as the saved case does (${fileAfter.otherParty.removed ? "removed: not asked by itself" : "not held: the emptied box"})`, fileAfter.otherParty.removed ? asker.askOf(fileAfter, "otherParty").held === "removed" : asker.mayAsk(fileAfter, "otherParty"));
  }

  if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
  console.log("the Small Claims asker: every check passed.");
}

main().catch((error) => { console.error(error); process.exit(1); });
