/**
 * Verifies story answer proposals: the model may PROPOSE answers the opening
 * story already gives, and nothing is applied until the user confirms.
 *
 * COSTS NOTHING. The model is stubbed; every check exercises the real
 * validator, the real orchestrateIntakeTurn and the real
 * applyConfirmedStoryAnswers.
 *
 * WHAT FAILURE THIS CATCHES:
 *   - a proposal whose "quote" is not really in the story gets through
 *     (the model inventing support -- the failure that got story-based
 *     suppression removed, 5 of 5 false "provided" states);
 *   - a choice answer outside the reviewed choices gets through;
 *   - the safety question is ever proposed or accepted as confirmed;
 *   - a proposal marks a question answered or sets a fact before the user
 *     confirms it;
 *   - the proposer runs on an answer turn the client sent no conversation
 *     for (it must only read what it was given);
 *   - (2026-10-05) a question is asked although an EARLIER ANSWER already
 *     gave it: the live bus-injury run asked for the injury date four
 *     questions after "this happened on sept 17 2026 at 1 pm";
 *   - a proposal quoting our own question text instead of the person's words;
 *   - a question the person unticked being offered again;
 *   - a proposer failure blocks the intake;
 *   - a confirmed answer is not captured verbatim, or its question is asked
 *     again.
 *
 * Run: node --import tsx scripts/verification/verifyStoryAnswerProposals.ts
 */

import { pathToFileURL } from "node:url";

import {
  applyConfirmedStoryAnswers,
  orchestrateIntakeTurn,
} from "../../src/lib/case-system/intake/orchestrateIntakeTurn";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import {
  depthAsIntakeQuestion,
  proposableQuestions,
  validateStoryProposals,
  type StoryAnswerProposal,
} from "../../src/lib/case-system/intake/storyAnswerProposals";
import { questionsForElement } from "../../src/lib/case-system/intake/depth/elementQuestionRegistry";

let failures = 0;
function check(name: string, ok: boolean, detail?: string): void {
  if (ok) console.log(`pass  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/** The story from the 2026-09-28 live run that prompted this work. */
const STORY =
  "I hired a guy off kijiji to redo my basement bathroom. we agreed 4500 for labour and I paid him " +
  "2000 up front in march. he did about half the work then stopped showing up. when he was there he " +
  "cracked two tiles in the hallway outside the bathroom and put a hole in the drywall by the stairs. " +
  "he says the tiles were already cracked. I texted him for weeks and he read them and didnt answer. " +
  "I had to hire someone else to finish and they charged me 3200. I want my 2000 back and something " +
  "for the damage but im not sure how much the drywall will cost to fix";

const q = (id: string) => QUESTION_BANK.find((question) => question.id === id)!;

const STUB_SAFETY = async () => ({ classification: "clear" as const, reason: "stub", requestsLegalAdvice: false });
const STUB_VOICE = async () => ({ leadIn: null, questionText: "", fellBackToPlainText: true });
const STUB_CLASSIFY = async () => null;

async function main(): Promise<void> {
  // ---- validator: grounding ----
  const offered = [q("sc-amount-claimed"), q("sc-orient-dispute-category"), q("sc-contractor-notice-before-replacement"), q("sc-evidence-available")];

  const kept = validateStoryProposals(
    {
      proposals: [
        { questionId: "sc-amount-claimed", answer: "$2,000 back plus the cost of the damage", storyQuote: "I want my 2000 back" },
        // quote NOT in the story -> dropped
        { questionId: "sc-evidence-available", answer: "Photos and a receipt", storyQuote: "I took photos of the damage" },
        // choice outside the reviewed list -> dropped
        { questionId: "sc-orient-dispute-category", answer: "Renovation fraud", storyQuote: "redo my basement bathroom" },
        // yes-no with the right shape, whitespace/case differences in the quote -> kept
        { questionId: "sc-contractor-notice-before-replacement", answer: "Yes, I texted him for weeks with no answer", storyQuote: "I  TEXTED him for weeks" },
      ],
    },
    STORY,
    offered,
  );
  const keptIds = kept.map((p) => p.questionId);
  check("a grounded proposal is kept", keptIds.includes("sc-amount-claimed"));
  check("a proposal whose quote is not in the story is dropped", !keptIds.includes("sc-evidence-available"));
  check("a choice answer outside the reviewed choices is dropped", !keptIds.includes("sc-orient-dispute-category"));
  check("quote matching ignores case and spacing", keptIds.includes("sc-contractor-notice-before-replacement"));

  const choiceKept = validateStoryProposals(
    { proposals: [{ questionId: "sc-orient-dispute-category", answer: "work or a service you paid for (e.g. a contractor)", storyQuote: "hired a guy off kijiji" }] },
    STORY,
    offered,
  );
  check(
    "a choice answer is normalised to the reviewed choice text",
    choiceKept[0]?.answer === "Work or a service you paid for (e.g. a contractor)",
    JSON.stringify(choiceKept),
  );

  // 2026-09-28, story review battery: "filed? -> No" from a quote that says
  // nothing about filing.
  const filedOffered = [q("sc-claim-filed")];
  const offTopic = validateStoryProposals(
    { proposals: [{ questionId: "sc-claim-filed", answer: "No", storyQuote: "I texted him for weeks" }] },
    STORY,
    filedOffered,
  );
  check("a filing proposal whose quote says nothing about filing is dropped", offTopic.length === 0, JSON.stringify(offTopic));
  const onTopic = validateStoryProposals(
    { proposals: [{ questionId: "sc-claim-filed", answer: "No", storyQuote: "I haven't filed anything yet" }] },
    STORY + " I haven't filed anything yet.",
    filedOffered,
  );
  check("a filing proposal quoting the person on filing is kept", onTopic.length === 1, JSON.stringify(onTopic));

  const unofferedQuestion = validateStoryProposals(
    { proposals: [{ questionId: "sc-remedy-sought", answer: "Money", storyQuote: "I want my 2000 back" }] },
    STORY,
    offered,
  );
  check("a proposal for a question that was not offered is dropped", unofferedQuestion.length === 0);

  check("garbage model output yields no proposals", validateStoryProposals("nope", STORY, offered).length === 0);

  // ---- the safety question is never offered ----
  const safety = q("sc-safety-check");
  check("the safety question is never proposable", !proposableQuestions(QUESTION_BANK).some((x) => x.id === safety.id));

  // ---- orchestrator: proposals are returned, not applied ----
  const calls: string[] = [];
  const proposer = async (story: string, questions: readonly { id: string }[]): Promise<StoryAnswerProposal[]> => {
    calls.push(story);
    const ids = questions.map((x) => x.id);
    const out: StoryAnswerProposal[] = [];
    if (ids.includes("sc-amount-claimed")) {
      out.push({ questionId: "sc-amount-claimed", questionText: q("sc-amount-claimed").text, answer: "$2,000 plus damage", storyQuote: "I want my 2000 back" });
    }
    return out;
  };

  const opening = await orchestrateIntakeTurn({}, [], STORY, "stub-key", QUESTION_BANK, CLAIM_TYPES, "small-claims", undefined, {
    runSafety: STUB_SAFETY,
    extractFacts: async () => ({ facts: { role: "plaintiff" }, directFields: ["role"] }),
    classifyClaimType: STUB_CLASSIFY,
    composeVoice: STUB_VOICE,
    proposeAnswers: proposer,
  });

  check("the opening story returns proposals", opening.storyProposals.length === 1, JSON.stringify(opening.storyProposals));
  check("a proposal does not mark its question answered", !opening.answeredIds.includes("sc-amount-claimed"));
  check("a proposal does not set its captured fact", opening.facts.amountClaimedText === undefined);

  const before = calls.length;
  await orchestrateIntakeTurn({ role: "plaintiff" }, ["sc-orient-when-happened"], "last March", "stub-key", QUESTION_BANK, CLAIM_TYPES, "small-claims", "sc-orient-when-happened", {
    runSafety: STUB_SAFETY,
    extractFacts: async () => ({ facts: {}, directFields: [] }),
    classifyClaimType: STUB_CLASSIFY,
    composeVoice: STUB_VOICE,
    proposeAnswers: proposer,
  });
  check("without the conversation, the proposer does not run on an answer turn", calls.length === before);

  // ---- 2026-10-05: the conversation so far is read before the next question ----
  // The live run, replayed: an injury story with no date; the date arrived as
  // the answer to "Roughly when did it happen?", and the injury-date question
  // came up later and was asked anyway.
  const busStory =
    "i was hit by an OC transpo bus when i was waiting to cross at a cross walk. i dislocated my shoulder. i want to sue";
  const busFacts = { role: "plaintiff", disputeCategory: "personal-injury" } as const;
  const busAnswered = ["sc-orient-role", "sc-orient-dispute-category", "sc-orient-when-happened", "sc-amount-claimed", "sc-claim-filed"];
  const busEarlier = {
    story: busStory,
    answers: [
      { questionId: "sc-orient-when-happened", answerText: "this happened on sept 17 2026 at 1 pm" },
      { questionId: "sc-amount-claimed", answerText: "im not sure what i should claim" },
    ],
    declined: [] as string[],
  };
  const conversationsRead: { story: string; ids: string[]; quoteFrom?: string }[] = [];
  const busProposer = async (
    story: string,
    questions: readonly { id: string }[],
    _key: string,
    options: { quoteFrom?: string } = {},
  ): Promise<StoryAnswerProposal[]> => {
    conversationsRead.push({ story, ids: questions.map((question) => question.id), quoteFrom: options.quoteFrom });
    const raw = {
      proposals: [
        { questionId: "sc-date-injury", answer: "September 17, 2026", storyQuote: "sept 17 2026 at 1 pm" },
        // Quotes OUR question, not the person: must be dropped.
        { questionId: "sc-remedy-sought", answer: "Money", storyQuote: "Roughly when did the situation" },
      ],
    };
    return validateStoryProposals(raw, story, questions as never, options.quoteFrom ?? story);
  };
  const busTurn = await orchestrateIntakeTurn(
    { ...busFacts },
    [...busAnswered, "sc-remedy-sought"],
    "money",
    "stub-key",
    QUESTION_BANK,
    CLAIM_TYPES,
    "small-claims",
    "sc-remedy-sought",
    {
      runSafety: STUB_SAFETY,
      extractFacts: async () => ({ facts: {}, directFields: [] }),
      classifyClaimType: STUB_CLASSIFY,
      composeVoice: STUB_VOICE,
      proposeAnswers: busProposer,
    },
    busEarlier,
  );
  const read = conversationsRead[0];
  check("with the conversation, the questions about to be asked are checked against it", Boolean(read), JSON.stringify(conversationsRead));
  check(
    "the injury date is offered from the earlier answer instead of being asked again",
    busTurn.storyProposals.some((proposal) => proposal.questionId === "sc-date-injury" && proposal.storyQuote === "sept 17 2026 at 1 pm"),
    JSON.stringify(busTurn.storyProposals),
  );
  check(
    "the model reads each earlier answer under the reviewed question it answered",
    Boolean(read?.story.includes("Q: Roughly when did the situation that led to this claim happen?\nA: this happened on sept 17 2026 at 1 pm")),
  );
  check("this turn's own answer is part of what is read", Boolean(read?.story.includes("A: money")));
  const remedyQuestion = QUESTION_BANK.find((question) => question.id === "sc-remedy-sought")!;
  const transcriptOnly = "Q: What outcome are you asking the court to order?\nA: i want to sue";
  check(
    "a quote of our own question text is refused (quotes come from the person's words only)",
    validateStoryProposals(
      { proposals: [{ questionId: "sc-remedy-sought", answer: "Payment of money", storyQuote: "What outcome are you asking" }] },
      transcriptOnly,
      [remedyQuestion],
      "i want to sue",
    ).length === 0,
  );
  check(
    "the same proposal quoting the person's words is kept",
    validateStoryProposals(
      { proposals: [{ questionId: "sc-remedy-sought", answer: "Payment of money", storyQuote: "i want to sue" }] },
      transcriptOnly,
      [remedyQuestion],
      "i want to sue",
    ).length === 1,
  );
  check("the safety question is never sent to be checked", !(read?.ids ?? []).includes("sc-safety-check"));
  check("nothing is applied before the person confirms", !busTurn.answeredIds.includes("sc-date-injury"));

  conversationsRead.length = 0;
  await orchestrateIntakeTurn(
    { ...busFacts },
    [...busAnswered, "sc-remedy-sought"],
    "money",
    "stub-key",
    QUESTION_BANK,
    CLAIM_TYPES,
    "small-claims",
    "sc-remedy-sought",
    {
      runSafety: STUB_SAFETY,
      extractFacts: async () => ({ facts: {}, directFields: [] }),
      classifyClaimType: STUB_CLASSIFY,
      composeVoice: STUB_VOICE,
      proposeAnswers: busProposer,
    },
    { ...busEarlier, declined: ["sc-date-injury"] },
  );
  check("a question the person unticked is never offered again", !(conversationsRead[0]?.ids ?? []).includes("sc-date-injury"));

  const failingEarlier = await orchestrateIntakeTurn(
    { ...busFacts },
    [...busAnswered, "sc-remedy-sought"],
    "money",
    "stub-key",
    QUESTION_BANK,
    CLAIM_TYPES,
    "small-claims",
    "sc-remedy-sought",
    {
      runSafety: STUB_SAFETY,
      extractFacts: async () => ({ facts: {}, directFields: [] }),
      classifyClaimType: STUB_CLASSIFY,
      composeVoice: STUB_VOICE,
      proposeAnswers: async () => {
        throw new Error("model down");
      },
    },
    busEarlier,
  );
  check("a failed check never blocks the intake: the question is simply asked", Boolean(failingEarlier.nextQuestion) && failingEarlier.storyProposals.length === 0);

  const halted = await orchestrateIntakeTurn(
    { ...busFacts },
    [...busAnswered, "sc-remedy-sought"],
    "money",
    "stub-key",
    QUESTION_BANK,
    CLAIM_TYPES,
    "small-claims",
    "sc-remedy-sought",
    {
      runSafety: async () => ({ classification: "immediate-danger" as const, reason: "stub", userMessage: "Call 911." }),
      extractFacts: async () => ({ facts: {}, directFields: [] }),
      classifyClaimType: STUB_CLASSIFY,
      composeVoice: STUB_VOICE,
      proposeAnswers: busProposer,
    },
    busEarlier,
  );
  check("a safety halt shows nothing but the safety message", halted.halted && halted.storyProposals.length === 0);

  // 2026-09-28: the flag the safety pass sets must reach the screen.
  const asking = await orchestrateIntakeTurn({}, [], STORY + " Do I have a case?", "stub-key", QUESTION_BANK, CLAIM_TYPES, "small-claims", undefined, {
    runSafety: async () => ({ classification: "clear" as const, reason: "stub", requestsLegalAdvice: true }),
    extractFacts: async () => ({ facts: { role: "plaintiff" }, directFields: ["role"] }),
    classifyClaimType: STUB_CLASSIFY,
    composeVoice: STUB_VOICE,
    proposeAnswers: async () => [],
  });
  check("a request for legal advice reaches the intake result", asking.requestsLegalAdvice === true);
  check("an ordinary story does not raise the legal-advice notice", opening.requestsLegalAdvice === false);

  const failing = await orchestrateIntakeTurn({}, [], STORY, "stub-key", QUESTION_BANK, CLAIM_TYPES, "small-claims", undefined, {
    runSafety: STUB_SAFETY,
    extractFacts: async () => ({ facts: { role: "plaintiff" }, directFields: ["role"] }),
    classifyClaimType: STUB_CLASSIFY,
    composeVoice: STUB_VOICE,
    proposeAnswers: async () => {
      throw new Error("model down");
    },
  });
  check(
    "a proposer failure does not block the intake",
    !failing.halted && failing.storyProposals.length === 0 && Boolean(failing.nextQuestion),
  );

  // ---- applying confirmed answers ----
  const applied = await applyConfirmedStoryAnswers(
    { role: "plaintiff" },
    [],
    [
      { questionId: "sc-amount-claimed", answerText: "$2,000 plus the cost of the damage" },
      { questionId: "sc-orient-when-happened", answerText: "He stopped showing up in July 2026" },
      // never accepted, whatever the client sends
      { questionId: "sc-safety-check", answerText: "no" },
      { questionId: "not-a-real-question", answerText: "x" },
      { questionId: "sc-evidence-available", answerText: "   " },
    ],
    "stub-key",
    QUESTION_BANK,
    "small-claims",
    { extractFacts: async () => ({ facts: {}, directFields: [] }), composeVoice: STUB_VOICE },
  );

  check("a confirmed answer marks its question answered", applied.answeredIds.includes("sc-amount-claimed") && applied.answeredIds.includes("sc-orient-when-happened"));
  check("a confirmed answer is captured verbatim", applied.facts.amountClaimedText === "$2,000 plus the cost of the damage");
  check("a confirmed safety answer is ignored", !applied.answeredIds.includes("sc-safety-check"));
  check("an unknown question id is ignored", !applied.answeredIds.includes("not-a-real-question"));
  check("a blank confirmed answer is ignored, so the question is still asked", !applied.answeredIds.includes("sc-evidence-available"));
  check(
    "the next question is never one the user just confirmed",
    !["sc-amount-claimed", "sc-orient-when-happened"].includes(applied.nextQuestion?.id || ""),
    applied.nextQuestion?.id,
  );

  // 2026-09-28: one more read of the story for questions the confirmations
  // just made applicable -- never a question the first card showed, never an
  // answered one, and only when asked for.
  const seen: string[][] = [];
  const recordingProposer = async (_story: string, questions: readonly { id: string }[]) => {
    seen.push(questions.map((question) => question.id));
    return [];
  };
  const confirmedCategory = [{ questionId: "sc-orient-dispute-category", answerText: "A slip, a fall, or another injury" }];
  await applyConfirmedStoryAnswers(
    { role: "plaintiff" },
    [],
    confirmedCategory,
    "stub-key",
    QUESTION_BANK,
    "small-claims",
    {
      extractFacts: async () => ({ facts: { disputeCategory: "personal-injury" }, directFields: ["disputeCategory"] }),
      composeVoice: STUB_VOICE,
      proposeAnswers: recordingProposer,
    },
    { story: "On September 3rd the dog bit me.", alreadyOffered: ["sc-orient-dispute-category", "sc-amount-claimed"] },
  );
  const reoffered = seen[0] || [];
  check("the re-read offers a question the confirmation made applicable", reoffered.includes("sc-date-injury"), JSON.stringify(reoffered));
  check("the re-read never offers a question the first card showed", !reoffered.includes("sc-amount-claimed"));
  check("the re-read never offers an answered question", !reoffered.includes("sc-orient-dispute-category"));
  const before2 = seen.length;
  await applyConfirmedStoryAnswers(
    { role: "plaintiff" },
    [],
    confirmedCategory,
    "stub-key",
    QUESTION_BANK,
    "small-claims",
    {
      extractFacts: async () => ({ facts: { disputeCategory: "personal-injury" }, directFields: ["disputeCategory"] }),
      composeVoice: STUB_VOICE,
      proposeAnswers: recordingProposer,
    },
  );
  check("no re-read unless the caller asks for it", seen.length === before2);

  // ---- Depth questions (2026-10-04) ----
  //
  // A defamation user whose only evidence was texts to their brother was still
  // asked about newspapers. Depth questions now go through the same proposal
  // step: quote-verified, confirmed by the user. Checked here against the real
  // authored newspaper question, through the real validator.
  {
    const newspaper = questionsForElement("limitation-if-newspaper-or-broadcast").find((q) => q.status === "reviewed");
    check("the authored newspaper depth question exists", Boolean(newspaper));
    if (newspaper) {
      const offered = [depthAsIntakeQuestion(newspaper)];
      const depthStory =
        "My neighbour told my brother I steal from work. The only evidence I have is text messages to my brother, that's all.";
      const kept = validateStoryProposals(
        { proposals: [{ questionId: newspaper.id, answer: "No — only text messages to my brother", storyQuote: "The only evidence I have is text messages to my brother" }] },
        depthStory,
        offered,
      );
      check("a depth question the story answers can be proposed, with its quote", kept.length === 1 && kept[0].questionId === newspaper.id);
      const invented = validateStoryProposals(
        { proposals: [{ questionId: newspaper.id, answer: "No", storyQuote: "it was never in any newspaper" }] },
        depthStory,
        offered,
      );
      check("a depth proposal whose quote is not in the story is dropped (the question is asked)", invented.length === 0);
      check("a depth question is never offered as sensitive", proposableQuestions(offered).length === 1);
    }
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) void main();
