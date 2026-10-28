/**
 * One record of which story version each story-derived answer was based on.
 *
 * What it checks (storyBasis.ts): an answer is tagged with the story version it
 * was stored under; when the story changes, every older answer is stale in all
 * three areas (Small Claims, civil, family): emptied in the view screens read,
 * never shown as current, and blocking any next step; "start the questions
 * again" empties them and resets the question-and-answer state; the Home page's
 * "What we still need to know" answers and an unsent copy of the story in the
 * question box go when the story changes; reverting the story restores its
 * answers; empty values (a form's defaults) are not answers. An edit to some of the
 * story (#477 re-test: one sentence edited lost every follow-up answer) keeps every
 * answer whose words do not come from a sentence removed or changed, in all three areas,
 * and the Home page's answers likewise; a rewrite (most sentences gone) sets them all aside, except
 * what the situation answers settle (the side, "nothing filed"), which no route can tie to the story.
 *
 * Failure it exists to catch: the PR #463 re-tests, where each flow kept its own
 * copy of answers from the old story and a fix to one flow left the others
 * showing them (round 5: civil and family had no block at all).
 *
 * Run: npm run test:story-basis
 */
import assert from "node:assert/strict";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { BASIS_SECTION, discardStale, editedSentences, freshSections, onStoryChange, positionForStory, staleAnswerKeys, storyAnswersOutdated, storyVersion, tagAnswers } from "../../src/lib/case-system/storyBasis";
import { remainingEssentialQuestions, reviewEntries } from "../../src/lib/case-system/intakeReview";

const OLD = "Synthetic old story: we disagree about parenting time for our daughter.";
const NEW = "Synthetic new story: I am asking for spousal support. We have no children.";
const base = (courtPath: Checkpoint["courtPath"], story: string): Checkpoint => ({ version: 1, flowId: "11111111-1111-4111-8111-111111111111", courtPath, revision: "22222222-2222-4222-8222-222222222222",
  sections: { story: { text: story, location: { province: "Ontario", city: "Ottawa" } } } });
/** Stores (section, key) = value the way the intake store does, tagging it. */
function store(checkpoint: Checkpoint, section: string, key: string, value: unknown): Checkpoint {
  const sections = { ...checkpoint.sections, [section]: { ...checkpoint.sections[section], [key]: value } };
  sections[BASIS_SECTION] = tagAnswers(sections, section, key, checkpoint.sections[section]?.[key], value);
  return { ...checkpoint, sections };
}
const withStory = (checkpoint: Checkpoint, text: string): Checkpoint => ({ ...checkpoint, sections: onStoryChange({ ...checkpoint.sections, story: { ...checkpoint.sections.story, text } }) });

// Family: answers given for the old story are stale once it changes.
let family = base("family", OLD);
family = store(family, "family", "issues", ["parenting-time"]);
family = store(family, "family", "childrenInfo", "One child, age 6.");
family = store(family, "family", "mode", "form");
assert.deepEqual(staleAnswerKeys(family), [], "answers for the current story are not stale");
assert.equal(storyAnswersOutdated(family), false);
const changed = withStory(family, NEW);
assert.deepEqual(staleAnswerKeys(changed).sort(), ["family.childrenInfo", "family.issues"], "both answers are stale; navigation (mode) is not an answer");
assert.equal(storyAnswersOutdated(changed), true, "no next step while any answer is stale");
const shown = JSON.stringify(reviewEntries(changed).map(entry => entry.value));
assert(!shown.includes("age 6") && !shown.includes("parenting-time"), "the review shows no stale answer");
assert.deepEqual(freshSections(changed).family.issues, [], "screens read stale answers as empty");
assert.equal(staleAnswerKeys(withStory(changed, ` ${OLD.toUpperCase()}  `)).length, 0, "the same story again (case and spacing aside) restores its answers");

// Starting the questions again empties them, untagged.
const restarted = discardStale(changed);
assert.deepEqual(staleAnswerKeys(restarted), []);
assert.equal(storyAnswersOutdated(restarted), false);
assert(!JSON.stringify(restarted.sections).includes("age 6") && !JSON.stringify(restarted.sections).includes("parenting-time"), "nothing of the old answers is left in the tab");
assert.equal(restarted.sections.family.mode, "form", "navigation is untouched");
// A new answer after the change is current.
assert.deepEqual(staleAnswerKeys(store(restarted, "family", "goal", "Spousal support")), []);

// Civil and Small Claims: the form input is tagged key by key, so a later edit
// to one answer does not freshen the others.
for (const court of ["civil", "small-claims"] as const) {
  let form = base(court, OLD);
  form = store(form, court, "input", { amountClaimed: "$180,000", legalRemedy: "Finish the addition", facts: "a copy of the story is not an answer" });
  form = withStory(form, NEW);
  form = store(form, court, "input", { ...form.sections[court].input as object, legalRemedy: "Pay for the garage" });
  assert.deepEqual(staleAnswerKeys(form), [`${court}.input.amountClaimed`], `${court}: only the unchanged old answer is stale`);
  assert.equal((freshSections(form)[court].input as Record<string, unknown>).amountClaimed, "", `${court}: the stale amount reads as empty`);
}

// The person's own name is not read from the story, at the top level or inside a form's input.
assert.deepEqual(staleAnswerKeys(withStory(store(base("civil", OLD), "civil", "input", { yourName: "Synthetic name" }), NEW)), [], "a name is not a story-derived answer");
assert.deepEqual(staleAnswerKeys(withStory(store(base("family", OLD), "family", "yourName", "Synthetic name"), NEW)), []);

// Small Claims guided answers and the review panel's own answers are covered too.
let guided = base("small-claims", OLD);
guided = store(guided, "guided", "facts", { role: "plaintiff", disputeCategory: "contract" });
guided = store(guided, "builder", "initialAnswers", { "sc-orient-role": "Bringing the claim (plaintiff)" });
guided = store(guided, "builder", "initialUnknowns", ["sc-orient-when-happened"]);
guided = withStory(guided, NEW);
assert.deepEqual(staleAnswerKeys(guided).sort(), ["builder.initialAnswers.sc-orient-role", "guided.facts.disputeCategory", "guided.facts.role"].sort(), "'I do not know yet' is not read from the story, so it is not stale");
assert(remainingEssentialQuestions(guided).some(question => question.id === "sc-orient-role"), "a question answered only for the old story is asked again");

// Defaults are not answers: an empty or "not sure" value is never tagged.
assert.deepEqual(tagAnswers(base("family", OLD).sections, "family", "yourRole", undefined, "not-sure"), {}, "a default is not an answer");

// The Home page's answers, and an unsent copy of the story in the question box, go when the story changes.
const home: Checkpoint = { ...base("civil", OLD), sections: { ...base("civil", OLD).sections, home: { understoodAnswers: [{ question: "Q", answer: "old answer" }], draftAnswers: [{ question: "Q", answer: "typing" }] }, "form-chat": { drafts: { facts: OLD, goal: "keep" } } } };
const afterHome = withStory(home, NEW).sections;
assert.deepEqual(afterHome.home.understoodAnswers, [], "Home answers are cleared");
assert.deepEqual(afterHome.home.draftAnswers, []);
assert.deepEqual(afterHome["form-chat"].drafts, { goal: "keep" }, "the old story's copy in the question box goes; other drafts stay");
// The Home page card's replies too (found by the Part 3 registry check).
const card: Checkpoint = { ...home, sections: { ...home.sections, "home-card": { replies: { 0: "a reply about the old story" } } } };
assert.deepEqual(withStory(card, NEW).sections["home-card"].replies, {}, "Home card replies are cleared");
assert.deepEqual(discardStale(withStory(card, NEW)).sections["home-card"].replies, {});

// Part 3 audit item 2: dates and service details recorded for an earlier story count no deadline after a re-analysis.
const position = { dateAnswers: { "sc-date-claim-served": "2026-09-01" }, service: { "sc-date-claim-served": { method: "mail" } }, stepId: "x" };
assert.deepEqual(positionForStory(position, OLD, NEW), { ...position, dateAnswers: {}, service: {} }, "a different story: its dates and service details go");
assert.equal(positionForStory(position, OLD, ` ${OLD.toUpperCase()} `), position, "the same story (case and spacing aside): kept");
assert.equal(positionForStory(position, undefined, NEW), position, "an older case with no recorded story: kept");

// A form registering an answer before any story exists: writing the story is not "changing" it.
let early = base("family", "");
early = store(early, "family", "caseStage", "starting-case");
assert.deepEqual(staleAnswerKeys(withStory(early, NEW)), [], "an answer from before there was a story is not stale");

// An edit to some of the story keeps what it did not touch, in every area.
const EDIT_BEFORE = "Synthetic: I lent my friend $3,000 in January 2026. He never paid me back. I have the e-transfer record.";
const editOf = (checkpoint: Checkpoint, text: string): Checkpoint => ({ ...checkpoint, sections: onStoryChange({ ...checkpoint.sections, story: { ...checkpoint.sections.story, text } }, checkpoint.sections) });
for (const [court, section, key] of [["small-claims", "small-claims", "input"], ["civil", "civil", "input"], ["family", "builder", "initialAnswers"]] as const) {
  let edited = base(court, EDIT_BEFORE);
  edited = store(edited, section, key, { amountClaimed: "$3,000", otherParty: "My friend Sam", remedySought: "Repayment" });
  edited = { ...edited, sections: { ...edited.sections, home: { understoodAnswers: [{ question: "Did he agree to a date?", answer: "By March" }, { question: "How much?", answer: "$3,000" }] } } };
  const added = editOf(edited, `${EDIT_BEFORE} He also blocked my number.`);
  assert.deepEqual(staleAnswerKeys(added), [], `${court}: a sentence added sets no answer aside`);
  assert.equal((added.sections.home.understoodAnswers as unknown[]).length, 2, `${court}: a sentence added keeps the Home page's answers`);
  const amountChanged = editOf(edited, EDIT_BEFORE.replace("$3,000", "$3,500"));
  assert.deepEqual(staleAnswerKeys(amountChanged), [`${section}.${key}.amountClaimed`], `${court}: only the answer from the changed sentence is set aside`);
  assert.deepEqual((amountChanged.sections.home.understoodAnswers as { answer: string }[]).map((item) => item.answer), ["By March"], `${court}: the Home page's answer from the changed sentence goes, the other stays`);
  const rewritten = editOf(edited, "Synthetic: a completely different matter. Nothing is the same. Told again.");
  assert.equal(staleAnswerKeys(rewritten).length, 3, `${court}: a rewrite sets every answer aside`);
}
assert.equal(editedSentences("One. Two.", "Three. Four."), null, "every sentence changed is a new story");
assert.deepEqual(editedSentences("One. Two. Three.", "One. Two. Three. Four."), [], "a sentence added removes none");

// An answer the situation answers settle is never based on the story, whatever route stored it (full
// story pack, 27 Oct: the Small Claims chat's side stayed "answered for an earlier version" after a
// rewrite, with no way to answer it again, and blocked Confirm).
{
  const settled = {
    version: 1, flowId: "00000000-0000-4000-8000-000000000031", courtPath: "small-claims", revision: "00000000-0000-4000-8000-000000000031",
    sections: {
      story: { text: NEW },
      situation: { record: { where: "starting", filed: "nothing", court: "small-claims" } },
      guided: { facts: { role: "plaintiff", claimFiled: false, amountClaimedText: "$500" } },
      [BASIS_SECTION]: { "guided.facts.role": storyVersion(OLD), "guided.facts.claimFiled": storyVersion(OLD), "guided.facts.amountClaimedText": storyVersion(OLD) },
    },
  } as unknown as Checkpoint;
  const stale = staleAnswerKeys(settled);
  assert.ok(!stale.includes("guided.facts.role") && !stale.includes("guided.facts.claimFiled"), `the side and "nothing filed" from the start are never stale: ${stale.join(", ")}`);
  assert.ok(stale.includes("guided.facts.amountClaimedText"), "an answer from the story still is");
}

assert.notEqual(storyVersion(OLD), storyVersion(NEW));
assert.equal(storyVersion("A  b"), storyVersion("a b"));
console.log("PASS story basis: one record of which story each answer was based on, in all three areas");
