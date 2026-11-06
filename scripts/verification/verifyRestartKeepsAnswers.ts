/**
 * "START THE QUESTIONS AGAIN" KEEPS EVERY ANSWER THE PERSON GAVE OR CONFIRMED (item 2; site owner, 6 Nov 2026).
 *
 * Founder's Chrome check of #543 (5 Nov), step 3: a sentence was added to the Small Claims story, the questions
 * were started again, and the chat asked the kind of claim a second time (and offered the date again), though
 * the person had confirmed both. Cause: the restart reset the whole chat conversation, the kind and the chat's
 * answers with it (storyBasis.ts CONVERSATION.guided), and emptied every answer tagged with an older story.
 *
 * The owner's rule, replacing that: the restart keeps every answer the person gave or confirmed -- the kind they
 * confirmed, dates, "not sure", the review's answers, each court's form answers -- and re-offers only what was a
 * suggestion read from the old story (a kind not yet confirmed, the story card's unused suggestions, facts the
 * chat read from the story with no answer behind them). Kept answers count as based on the story as it is now,
 * so nothing blocks the next step and nothing is asked again.
 *
 * What this asserts, with no browser, model or database, in all three courts, after an edit (a sentence added)
 * and after a rewrite of the story:
 *   1. Family, civil and the Small Claims form: every form answer is kept, and none is stale afterwards.
 *   2. The Small Claims review's answers are kept.
 *   3. The Small Claims chat: the kind the person confirmed, their replies (a date, a "not sure"), the answers
 *      they confirmed from the story card, and the facts those answers gave are kept; the case file holds the
 *      kind and the date. A kind not yet confirmed, an unused suggestion, the story card's drafts and a fact the
 *      chat only read from the story are not: they are offered again from the story as it is now. The
 *      conversation itself (its messages, the story it read) starts again.
 *   4. Nothing stale is left, so no next step is blocked.
 *
 * What failure it catches: a restart that makes the person answer again what they already gave or confirmed
 * (in any court), or one that keeps the old story's unconfirmed suggestions as if they were answers.
 *
 * Run: npm run test:restart-keeps-answers
 */
import assert from "node:assert/strict";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { BASIS_SECTION, discardStale, onStoryChange, staleAnswerKeys, storyAnswersOutdated, tagAnswers } from "../../src/lib/case-system/storyBasis";
import { caseFileOf } from "../../src/lib/case-system/caseFile/caseFile";

const OLD = "Synthetic old story: I lent my friend $2,650 on March 15, 2025. They have not paid it back.";
const EDITED = `${OLD} I asked them by text in June 2025 to pay me back.`;
const REWRITTEN = "Synthetic new story: my landlord kept my deposit of $1,200 when I moved out in May 2026.";
const KIND = "sc-claim-personal-loan-between-individuals";

const base = (courtPath: Checkpoint["courtPath"]): Checkpoint => ({ version: 1, flowId: "11111111-1111-4111-8111-111111111111", courtPath, revision: "22222222-2222-4222-8222-222222222222",
  sections: { story: { text: OLD, location: { province: "Ontario", city: "Ottawa" } } } });
function store(checkpoint: Checkpoint, section: string, key: string, value: unknown): Checkpoint {
  const sections = { ...checkpoint.sections, [section]: { ...checkpoint.sections[section], [key]: value } };
  sections[BASIS_SECTION] = tagAnswers(sections, section, key, checkpoint.sections[section]?.[key], value);
  return { ...checkpoint, sections };
}
const withStory = (checkpoint: Checkpoint, text: string): Checkpoint => ({ ...checkpoint, sections: onStoryChange({ ...checkpoint.sections, story: { ...checkpoint.sections.story, text } }, checkpoint.sections) });

let failures = 0;
function check(name: string, run: () => void) {
  try { run(); console.log(`PASS   ${name}`); } catch (error) { failures += 1; console.log(`FAIL   ${name}\n       ${error instanceof Error ? error.message : String(error)}`); }
}

/** The Small Claims chat as the person left it: a kind confirmed, replies given, a card answer used, and suggestions not used. */
function chat(): Checkpoint {
  let checkpoint = base("small-claims");
  checkpoint = store(checkpoint, "builder", "step", "guided");
  checkpoint = store(checkpoint, "builder", "initialAnswers", { "sc-amount-claimed": "$2,400" });
  checkpoint = store(checkpoint, "guided", "matchedClaimType", { claimTypeId: KIND, claimTypeName: "Personal loan between individuals", userConfirmed: true });
  checkpoint = store(checkpoint, "guided", "earlierAnswers", [
    { questionId: "sc-orient-when-happened", answerText: "March 15, 2025" },
    { questionId: "sc-evidence-available", answerText: "I don't know" },
  ]);
  // sc-remedy-sought: confirmed from the story card ("Confirmed from my story"); disputeCategory: only read from the story.
  checkpoint = store(checkpoint, "guided", "facts", { timelineText: "March 15, 2025", remedySoughtText: "Repayment of the money I lent", disputeCategory: "debt" });
  checkpoint = store(checkpoint, "guided", "answeredIds", ["sc-orient-when-happened", "sc-evidence-available", "sc-remedy-sought", "sc-orient-dispute-category"]);
  const guided = checkpoint.sections.guided;
  checkpoint.sections.guided = {
    ...guided,
    readFrom: OLD, started: true, intakeComplete: true,
    messages: [{ from: "assistant", text: "Confirmed from my story:", confirmed: [{ questionId: "sc-remedy-sought", label: "What you're asking the court to order", answer: "Repayment of the money I lent" }] }],
    pendingSuggestion: { claimTypeId: "sc-claim-unpaid-invoice", claimTypeName: "Unpaid invoice", userConfirmed: false },
    proposalDrafts: [{ questionId: "sc-amount-claimed", questionText: "Amount", answer: "$2,650", keep: false }],
  };
  return checkpoint;
}

for (const [label, next] of [["after a sentence is added", EDITED], ["after the story is rewritten", REWRITTEN]] as const) {
  check(`family, ${label}: "Start the questions again" keeps every form answer`, () => {
    let family = store(base("family"), "family", "issues", ["parenting-time"]);
    family = store(family, "family", "childrenInfo", "One child, age 6.");
    const restarted = discardStale(withStory(family, next));
    assert.deepEqual(restarted.sections.family.issues, ["parenting-time"], "the issues the person picked were emptied");
    assert.equal(restarted.sections.family.childrenInfo, "One child, age 6.", "the person's answer about the children was emptied");
    assert.deepEqual(staleAnswerKeys(restarted), [], "a kept answer is still stale");
    assert.equal(storyAnswersOutdated(restarted), false, "the next step is still blocked");
  });

  for (const court of ["civil", "small-claims"] as const) {
    check(`${court} form, ${label}: "Start the questions again" keeps every form answer`, () => {
      const form = store(base(court), court, "input", { amountClaimed: "$2,400", legalRemedy: "Repayment" });
      const restarted = discardStale(withStory(form, next));
      assert.deepEqual(restarted.sections[court].input, { amountClaimed: "$2,400", legalRemedy: "Repayment" }, "a form answer was emptied");
      assert.deepEqual(staleAnswerKeys(restarted), [], "a kept answer is still stale");
    });
  }

  check(`small-claims questions one at a time, ${label}: the person's answers are kept, suggestions from the old story are offered again`, () => {
    const restarted = discardStale(withStory(chat(), next));
    const guided = restarted.sections.guided;
    assert.equal((guided.matchedClaimType as { claimTypeId?: string } | null)?.claimTypeId, KIND, "the kind the person confirmed was emptied");
    assert.deepEqual((guided.earlierAnswers as { questionId: string }[]).map((answer) => answer.questionId).sort(), ["sc-evidence-available", "sc-orient-when-happened"], "the person's replies were not all kept");
    const ids = guided.answeredIds as string[];
    for (const id of ["sc-orient-when-happened", "sc-evidence-available", "sc-remedy-sought"]) assert(ids.includes(id), `${id}, answered by the person, is asked again`);
    assert(!ids.includes("sc-orient-dispute-category"), "a question only the old story's reading answered is not asked again from the new story");
    const facts = guided.facts as Record<string, unknown>;
    assert.equal(facts.timelineText, "March 15, 2025", "the date the person gave was emptied");
    assert.equal(facts.remedySoughtText, "Repayment of the money I lent", "the answer confirmed from the story card was emptied");
    assert.equal(facts.disputeCategory, undefined, "a fact only read from the old story was kept as an answer");
    assert.equal(guided.pendingSuggestion, null, "the old story's unused kind suggestion was kept");
    assert.equal(guided.proposalDrafts, null, "the old story's card drafts were kept");
    assert.equal(guided.readFrom, "", "the chat still reads the old story");
    assert.deepEqual(guided.messages, [], "the old conversation was kept");
    assert.deepEqual(restarted.sections.builder.initialAnswers, { "sc-amount-claimed": "$2,400" }, "the review's answer was emptied");
    assert.deepEqual(staleAnswerKeys(restarted), [], "a kept answer is still stale");
    assert.equal(storyAnswersOutdated(restarted), false, "the next step is still blocked");
    const file = caseFileOf(restarted);
    assert.equal(file.claimKind.state, "answered", "the case file no longer holds the kind");
    assert.equal(file.whenHappened.state, "answered", "the case file no longer holds the date");
  });

  check(`small-claims questions one at a time, ${label}: a kind never confirmed is offered again`, () => {
    const unconfirmed = chat();
    unconfirmed.sections.guided = { ...unconfirmed.sections.guided, matchedClaimType: { claimTypeId: KIND, claimTypeName: "Personal loan", userConfirmed: false } };
    const restarted = discardStale(withStory(unconfirmed, next));
    assert.equal(restarted.sections.guided.matchedClaimType, null, "a kind the person never confirmed was kept as their answer");
  });
}

console.log(failures ? `\n${failures} check(s) failed.` : "\n\"Start the questions again\" keeps every answer the person gave or confirmed and offers again only the old story's suggestions.");
process.exit(failures ? 1 : 0);
