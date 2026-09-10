import assert from "node:assert/strict";
import {
  selectQuestions,
  type IntakeFacts,
} from "../../src/lib/case-system/intake/selectQuestions";
import { QUESTION_BANK, type IntakeQuestion } from "../../src/lib/case-system/intake/questionBank";

// The logic tests below (determinism, ordering, appliesWhen, sensitive-last,
// draft-exclusion) use this local fixture bank rather than the real
// QUESTION_BANK. Every question in the real bank is currently status:
// "draft" -- selectQuestions correctly returns nothing for it right now,
// which would make assertions against selectQuestions(real bank) vacuously
// true (every property holds trivially over an empty array) rather than
// actually exercising the logic. This fixture stays meaningful regardless
// of the real bank's review status.
const FIXTURE_BANK: IntakeQuestion[] = [
  {
    id: "fx-orientation",
    courtArea: "small-claims",
    text: "Fixture orientation question",
    answerType: "short-text",
    allowUnknown: true,
    sensitive: false,
    phase: "orientation",
    reviewedAt: "2026-01-01",
    status: "reviewed",
  },
  {
    id: "fx-substance",
    courtArea: "small-claims",
    text: "Fixture substance question",
    answerType: "short-text",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-01-01",
    status: "reviewed",
  },
  {
    id: "fx-substance-gated",
    courtArea: "small-claims",
    appliesWhen: { field: "claimFiled", op: "equals", value: true },
    text: "Fixture gated substance question",
    answerType: "yes-no",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-01-01",
    status: "reviewed",
  },
  {
    id: "fx-substance-gated-chain",
    courtArea: "small-claims",
    appliesWhen: {
      all: [
        { field: "claimFiled", op: "equals", value: true },
        { field: "claimServed", op: "equals", value: true },
      ],
    },
    text: "Fixture chain-gated substance question",
    answerType: "yes-no",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-01-01",
    status: "reviewed",
  },
  {
    id: "fx-sensitive",
    courtArea: "small-claims",
    text: "Fixture sensitive question",
    answerType: "short-text",
    allowUnknown: true,
    sensitive: true,
    phase: "sensitive",
    reviewedAt: "2026-01-01",
    status: "reviewed",
  },
  {
    id: "fx-draft-otherwise-eligible",
    courtArea: "small-claims",
    text: "Fixture draft question that would otherwise be eligible first",
    answerType: "short-text",
    allowUnknown: true,
    sensitive: false,
    phase: "orientation",
    reviewedAt: null,
    status: "draft",
  },
];

// --- determinism: same input -> same output, repeatedly ------------------
const facts: IntakeFacts = { claimFiled: true };
const answered: string[] = ["fx-orientation"];
const runs = Array.from({ length: 5 }, () => selectQuestions(facts, answered, FIXTURE_BANK));
assert.ok(
  runs.every((run) => JSON.stringify(run) === JSON.stringify(runs[0])),
  "selectQuestions must return identical output across repeated calls with identical input",
);

// --- draft exclusion: a draft question is never returned, even when its
// phase/appliesWhen would otherwise put it first ---------------------------
const withDraftEligible = selectQuestions({}, [], FIXTURE_BANK);
assert.ok(
  !withDraftEligible.includes("fx-draft-otherwise-eligible"),
  "a status: \"draft\" question must never be returned by selectQuestions, no matter how eligible",
);
assert.ok(
  QUESTION_BANK.every((question) => question.status === "reviewed" || question.status === "draft"),
  "unexpected status value on a real bank question",
);
// A strict count-equality against "all reviewed questions" only holds when
// no reviewed question has an appliesWhen condition (or facts satisfy every
// condition). With empty facts, appliesWhen-gated reviewed questions
// correctly stay excluded, so check draft-exclusion and the unconditional
// subset instead of an exact count.
const selectedWithEmptyFacts = selectQuestions({}, [], QUESTION_BANK);
assert.ok(
  selectedWithEmptyFacts.every(
    (id) => QUESTION_BANK.find((question) => question.id === id)?.status === "reviewed",
  ),
  "selectQuestions over the real bank must never return a draft question",
);
assert.ok(
  QUESTION_BANK.filter((question) => question.status === "reviewed" && !question.appliesWhen).every((question) =>
    selectedWithEmptyFacts.includes(question.id),
  ),
  "every reviewed question with no appliesWhen condition must be selectable with no facts recorded yet",
);

// --- phase ordering: orientation before substance before sensitive -------
const phaseByOrder = selectQuestions({ claimFiled: true, claimServed: true }, [], FIXTURE_BANK).map(
  (id) => (FIXTURE_BANK.find((q) => q.id === id) as IntakeQuestion).phase,
);
const orderRank: Record<string, number> = { orientation: 0, substance: 1, sensitive: 2 };
for (let i = 1; i < phaseByOrder.length; i += 1) {
  assert.ok(
    orderRank[phaseByOrder[i]] >= orderRank[phaseByOrder[i - 1]],
    `phase order violated: ${phaseByOrder[i - 1]} appeared before ${phaseByOrder[i]} out of order`,
  );
}

// --- sensitive-last: no sensitive question precedes any non-sensitive one -
const sensitiveByOrder = selectQuestions({ claimFiled: true, claimServed: true }, [], FIXTURE_BANK).map(
  (id) => (FIXTURE_BANK.find((q) => q.id === id) as IntakeQuestion).sensitive,
);
const firstSensitiveIndex = sensitiveByOrder.indexOf(true);
if (firstSensitiveIndex !== -1) {
  assert.ok(
    sensitiveByOrder.slice(firstSensitiveIndex).every(Boolean),
    "a sensitive question must not be followed by a non-sensitive one",
  );
}

// --- appliesWhen filtering: gated questions are absent until facts satisfy them
const beforeFiling = selectQuestions({}, [], FIXTURE_BANK);
assert.ok(
  !beforeFiling.includes("fx-substance-gated"),
  "fx-substance-gated requires claimFiled=true and must not appear before that fact is known",
);
const afterFiling = selectQuestions({ claimFiled: true }, [], FIXTURE_BANK);
assert.ok(
  afterFiling.includes("fx-substance-gated"),
  "fx-substance-gated must appear once claimFiled=true",
);
assert.ok(
  !afterFiling.includes("fx-substance-gated-chain"),
  "fx-substance-gated-chain also requires claimServed=true and must not appear yet",
);
const afterServing = selectQuestions({ claimFiled: true, claimServed: true }, [], FIXTURE_BANK);
assert.ok(
  afterServing.includes("fx-substance-gated-chain"),
  "fx-substance-gated-chain must appear once both claimFiled and claimServed are true",
);

// --- defendant path: plaintiff-only questions stay hidden, while the
// defendant's factual-response questions are selected -------------------
const defendantQuestions = selectQuestions({ role: "defendant" }, [], QUESTION_BANK);
assert.ok(
  defendantQuestions.includes("sc-defendant-claim-received") &&
    defendantQuestions.includes("sc-defendant-response-facts") &&
    defendantQuestions.includes("sc-defendant-response-evidence") &&
    defendantQuestions.includes("sc-defendant-outcome"),
  "a defendant must receive the claim-received, response-facts, evidence, and requested-outcome questions",
);
assert.ok(
  !defendantQuestions.includes("sc-amount-claimed") &&
    !defendantQuestions.includes("sc-evidence-available") &&
    !defendantQuestions.includes("sc-remedy-sought") &&
    !defendantQuestions.includes("sc-claim-filed"),
  "a defendant must not receive plaintiff-only claim, amount, evidence, or remedy questions",
);

// --- answeredIds removes a question regardless of what the answer was ----
// (an "I don't know" answer is still an answer -- the id lands in answeredIds
// either way, so this also stands in for "allowUnknown honored": the
// selector never re-asks a question just because its value is unknown.)
const withOneAnswered = selectQuestions({}, ["fx-orientation"], FIXTURE_BANK);
assert.ok(
  !withOneAnswered.includes("fx-orientation"),
  "an answered question (including an 'unknown' answer) must not be re-selected",
);

// --- bank invariant: every REAL, non-draft question has a real I-don't-know path
assert.ok(
  QUESTION_BANK.every((question) => question.allowUnknown === true),
  "every question in the bank must have allowUnknown: true -- no question may dead-end",
);

// --- small-claims scope: only small-claims questions are ever returned ---
assert.ok(
  selectQuestions({ claimFiled: true, claimServed: true }, [], FIXTURE_BANK).every((id) => {
    const question = FIXTURE_BANK.find((q) => q.id === id);
    return question?.courtArea === "small-claims";
  }),
  "selectQuestions must only return small-claims questions in this phase",
);

console.log(
  `selectQuestions: determinism, phase ordering, sensitive-last, appliesWhen filtering, ` +
    `allowUnknown, and draft-exclusion all verified. Real bank: ${QUESTION_BANK.length} question(s), ` +
    `${QUESTION_BANK.filter((q) => q.status === "reviewed").length} reviewed (renderable).`,
);
