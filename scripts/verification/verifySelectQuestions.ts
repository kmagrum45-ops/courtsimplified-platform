import assert from "node:assert/strict";
import {
  selectQuestions,
  type IntakeFacts,
} from "../../src/lib/case-system/intake/selectQuestions";
import { QUESTION_BANK, type IntakeQuestion } from "../../src/lib/case-system/intake/questionBank";

// --- determinism: same input -> same output, repeatedly ------------------
const facts: IntakeFacts = { role: "plaintiff", claimFiled: true };
const answered: string[] = ["sc-orient-when-happened"];
const runs = Array.from({ length: 5 }, () => selectQuestions(facts, answered));
assert.ok(
  runs.every((run) => JSON.stringify(run) === JSON.stringify(runs[0])),
  "selectQuestions must return identical output across repeated calls with identical input",
);

// --- phase ordering: orientation before substance before sensitive -------
const phaseByOrder = selectQuestions({}, []).map(
  (id) => (QUESTION_BANK.find((q) => q.id === id) as IntakeQuestion).phase,
);
const orderRank: Record<string, number> = { orientation: 0, substance: 1, sensitive: 2 };
for (let i = 1; i < phaseByOrder.length; i += 1) {
  assert.ok(
    orderRank[phaseByOrder[i]] >= orderRank[phaseByOrder[i - 1]],
    `phase order violated: ${phaseByOrder[i - 1]} appeared before ${phaseByOrder[i]} out of order`,
  );
}

// --- sensitive-last: no sensitive question precedes any non-sensitive one -
const sensitiveByOrder = selectQuestions({}, []).map(
  (id) => (QUESTION_BANK.find((q) => q.id === id) as IntakeQuestion).sensitive,
);
const firstSensitiveIndex = sensitiveByOrder.indexOf(true);
if (firstSensitiveIndex !== -1) {
  assert.ok(
    sensitiveByOrder.slice(firstSensitiveIndex).every(Boolean),
    "a sensitive question must not be followed by a non-sensitive one",
  );
}

// --- appliesWhen filtering: gated questions are absent until facts satisfy them
const beforeFiling = selectQuestions({}, []);
assert.ok(
  !beforeFiling.includes("sc-defendant-served"),
  "sc-defendant-served requires claimFiled=true and must not appear before that fact is known",
);
const afterFiling = selectQuestions({ claimFiled: true }, []);
assert.ok(
  afterFiling.includes("sc-defendant-served"),
  "sc-defendant-served must appear once claimFiled=true",
);
const afterServing = selectQuestions({ claimFiled: true, claimServed: true }, []);
assert.ok(
  afterServing.includes("sc-defence-filed"),
  "sc-defence-filed must appear once claimServed=true",
);

// --- answeredIds removes a question regardless of what the answer was ----
// (an "I don't know" answer is still an answer -- the id lands in answeredIds
// either way, so this also stands in for "allowUnknown honored": the
// selector never re-asks a question just because its value is unknown.)
const withOneAnswered = selectQuestions({}, ["sc-orient-when-happened"]);
assert.ok(
  !withOneAnswered.includes("sc-orient-when-happened"),
  "an answered question (including an 'unknown' answer) must not be re-selected",
);

// --- bank invariant: every question has a real I-don't-know path ---------
assert.ok(
  QUESTION_BANK.every((question) => question.allowUnknown === true),
  "every question in the bank must have allowUnknown: true -- no question may dead-end",
);

// --- small-claims scope: only small-claims questions are ever returned ---
assert.ok(
  selectQuestions({}, []).every((id) => {
    const question = QUESTION_BANK.find((q) => q.id === id);
    return question?.courtArea === "small-claims";
  }),
  "selectQuestions must only return small-claims questions in this phase",
);

console.log(
  `selectQuestions: determinism, phase ordering, sensitive-last, appliesWhen filtering, ` +
    `and allowUnknown all verified across ${QUESTION_BANK.length} question(s).`,
);
