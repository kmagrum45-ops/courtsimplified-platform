/**
 * Verifies the intake depth layer, offline.
 *
 * COSTS NOTHING. Every decision the depth layer makes about WHICH questions
 * are asked is pure, so all four load-bearing properties are checkable without
 * a single API call. The only model involvement is the voice lead-in, which is
 * exercised by the paraphrase harness instead.
 *
 * Checks, in the order the design states them:
 *   1. No suppression: every authored, reviewed question is asked.
 *   2. Question text is authored, never model output; slots default safely.
 *   3. Depth answers and attestation are ONE state map.
 *   4. "I don't know" resolves to cannot-provide, not to a gap.
 * plus authoring rules (CLAUDE.md sections 2 and 3) over the registry.
 *
 * Run: node --import tsx scripts/verification/verifyDepthQuestions.ts
 */

import { pathToFileURL } from "node:url";

import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import {
  DEPTH_QUESTIONS,
  NO_QUESTION_NEEDED,
} from "../../src/lib/case-system/intake/depth/elementQuestionRegistry";
import {
  checkQuestionReadsWithDefaults,
  fillSlots,
  SLOT_DEFAULTS,
} from "../../src/lib/case-system/intake/depth/slots";
import {
  isUnknownAnswer,
  selectDepthQuestions,
  MAX_ASKED,
} from "../../src/lib/case-system/intake/depth/selectDepthQuestions";
import {
  createElementStateMap,
  elementsStillOutstanding,
  recordCannotProvide,
  recordDepthAnswer,
} from "../../src/lib/case-system/intake/depth/elementStateMap";
import { validateCaseStrengthLanguage } from "../../src/lib/case-system/intelligence/caseStrengthLanguageValidator";

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const ALL_ELEMENTS = CLAIM_TYPES.flatMap((ct) => ct.plaintiffElements);
const ELEMENT_IDS = new Set(ALL_ELEMENTS.map((el) => el.id));

/** Words that would mean a question or example coached toward an answer. */
const COACHING_TERMS = [
  "strengthen", "stronger", "strong", "weak", "weaken", "better", "best",
  "helps your", "the more", "you'll need", "you will need", "should have",
  "ideally", "unfortunately", "good news", "improve your",
];

function main(): void {
  // ---- Authoring rules: CLAUDE.md sections 2 and 3 ----

  for (const q of DEPTH_QUESTIONS) {
    check(`[${q.id}] targets a real element id`, ELEMENT_IDS.has(q.elementId), `unknown: ${q.elementId}`);
    check(`[${q.id}] allowUnknown is true (property 4)`, q.allowUnknown === true);
    check(
      `[${q.id}] a reviewed question has a reviewedAt date`,
      q.status !== "reviewed" || Boolean(q.reviewedAt),
    );
    check(
      `[${q.id}] why implies sourceUrl (CLAUDE.md section 2)`,
      !q.why || Boolean(q.sourceUrl),
      "a question stating a legal fact must cite it",
    );
    check(
      `[${q.id}] question text carries no case-strength language`,
      validateCaseStrengthLanguage(q.text).valid,
    );

    const coaching = COACHING_TERMS.filter((term) =>
      [q.text, ...(q.examples || [])].join(" ").toLowerCase().includes(term),
    );
    check(
      `[${q.id}] no coaching toward an answer (CLAUDE.md section 3)`,
      coaching.length === 0,
      `matched: ${coaching.join(", ")}`,
    );

    check(
      `[${q.id}] reads correctly with every slot defaulted`,
      checkQuestionReadsWithDefaults(q.text).length === 0,
      checkQuestionReadsWithDefaults(q.text).join("; "),
    );

  }

  for (const entry of NO_QUESTION_NEEDED) {
    check(
      `[noQuestionNeeded ${entry.elementId}] targets a real element id`,
      ELEMENT_IDS.has(entry.elementId),
    );
    check(`[noQuestionNeeded ${entry.elementId}] states a reason`, entry.reason.length > 20);
  }

  // ---- PROPERTY 1 (session 48): NO suppression. Every question is asked. ----
  //
  // The alreadyCovered filter and coveredWhenMentioned are gone. The filter
  // suppressed a question on a single keyword AND recorded the element as
  // provided, so the gate treated it as resolved and the user never saw it.
  // Five for five wrong in the live batch. See selectDepthQuestions.ts.

  // ---- PROPERTY 2: question text is authored, slots are safe ----

  const slotted = fillSlots("When {defendantLabel} put up {subjectLabel}, who else saw it?", {
    defendantLabel: "my ex-girlfriend",
    subjectLabel: "the post",
  });
  check(
    "property 2: slots fill from the user's own words",
    slotted.text === "When my ex-girlfriend put up the post, who else saw it?",
    slotted.text,
  );

  const defaulted = fillSlots("When {defendantLabel} put up {subjectLabel}, who else saw it?", {});
  check(
    "property 2: every slot has a neutral default",
    defaulted.text === `When ${SLOT_DEFAULTS.defendantLabel} put up ${SLOT_DEFAULTS.subjectLabel}, who else saw it?`,
    defaulted.text,
  );

  const characterized = fillSlots("What did {defendantLabel} say?", { defendantLabel: "that liar" });
  check(
    "property 2: a characterization is rejected for the neutral default",
    characterized.text === `What did ${SLOT_DEFAULTS.defendantLabel} say?` &&
      characterized.defaulted[0]?.reason === "characterization",
    characterized.text,
  );

  const blocked = fillSlots("What did {defendantLabel} say?", {
    defendantLabel: "the one with a strong case",
  });
  check(
    "property 2: a slot value carrying a blocked term is rejected",
    blocked.defaulted[0]?.reason === "blocked-term",
    JSON.stringify(blocked.defaulted),
  );

  const long = fillSlots("What did {defendantLabel} say?", {
    defendantLabel: "the man who lives at 42 Elm Street and runs the shop on the corner",
  });
  check("property 2: an over-long slot value is rejected", long.defaulted[0]?.reason === "too-long");

  // ---- PROPERTY 3: ONE state map ----

  const elements = [
    { id: "e1", name: "Element one" },
    { id: "e2", name: "Element two" },
  ];
  let map = createElementStateMap(elements);
  check("property 3: every element starts not-yet", Object.values(map).every((r) => r.state === "not-yet"));

  map = recordDepthAnswer(map, { elementId: "e1", questionId: "q1", answerText: "We agreed in writing." });
  check("property 3: an answered element is provided", map.e1.state === "provided");
  check("property 3: the answer is retained verbatim", map.e1.userText === "We agreed in writing.");
  check("property 3: provenance is recorded", map.e1.providedVia === "depth-answer");

  check(
    "property 3: the readiness view reads the SAME map",
    elementsStillOutstanding(map).map((r) => r.elementId).join(",") === "e2",
  );

  let threw = false;
  try {
    recordDepthAnswer(map, { elementId: "nope", questionId: "q", answerText: "x" });
  } catch {
    threw = true;
  }
  check("property 3: an unknown element id is a loud error, not a silent no-op", threw);

  // ---- PROPERTY 4: "I don't know" resolves ----

  for (const phrase of [
    "I don't know",
    "I do not know",
    "not sure",
    "no idea",
    "I can't remember",
    "I don't have that",
    "nothing in writing",
  ]) {
    check(`property 4: "${phrase}" is recognised as unknown`, isUnknownAnswer(phrase));
  }

  for (const phrase of [
    "We agreed on $4,000 and he paid half.",
    "I don't think they ever cashed the cheque, but I have the stub.",
  ]) {
    check(
      `property 4: a substantive answer is NOT misread as unknown: "${phrase.slice(0, 30)}..."`,
      !isUnknownAnswer(phrase),
    );
  }

  map = recordCannotProvide(map, { elementId: "e2", questionId: "q2", answerText: "I don't know" });
  check("property 4: unknown resolves to cannot-provide", map.e2.state === "cannot-provide");
  check("property 4: cannot-provide clears providedVia", map.e2.providedVia === undefined);
  check(
    "property 4: cannot-provide does NOT hold the readiness gate",
    elementsStillOutstanding(map).length === 0,
    JSON.stringify(elementsStillOutstanding(map)),
  );

  // ---- Selection: budget, ordering, degradation ----

  const debt = CLAIM_TYPES.find((ct) => ct.id === "sc-claim-unpaid-debt-services");
  if (!debt) {
    check("selection: debt claim type exists", false);
  } else {
    const terse = selectDepthQuestions({
      elements: debt.plaintiffElements,
      userTexts: ["They owe me money."],
      slotValues: {},
    });
    check("selection: a terse story produces questions", terse.asked.length > 0);
    check("selection: never exceeds the budget", terse.asked.length <= MAX_ASKED);
    check(
      "selection: asked order follows element order, not importance",
      terse.asked.every((q, i, arr) =>
        i === 0
          ? true
          : debt.plaintiffElements.findIndex((e) => e.id === arr[i - 1].elementId) <=
            debt.plaintiffElements.findIndex((e) => e.id === q.elementId),
      ),
    );

    // A story that describes everything must STILL be asked, and must still
    // arrive with every element not-yet. This is the inverse of the check it
    // replaces, which asserted such a story produced an empty question set.
    const complete = selectDepthQuestions({
      elements: debt.plaintiffElements,
      userTexts: [
        "We had a signed contract. I delivered the work and finished in March. " +
          "I invoiced $4,000 and nothing has been paid.",
      ],
      slotValues: {},
    });
    check(
      "selection: a story describing everything is still asked (no suppression)",
      complete.asked.length === terse.asked.length && complete.asked.length > 0,
      `complete ${complete.asked.length} vs terse ${terse.asked.length}`,
    );
    check(
      "selection: NOTHING is pre-resolved from the user's text",
      Object.values(complete.stateMap).every((record) => record.state === "not-yet"),
      JSON.stringify(Object.values(complete.stateMap).map((r) => `${r.elementId}:${r.state}`)),
    );
    check(
      "selection: no element is marked provided without the user answering",
      Object.values(complete.stateMap).every((record) => record.providedVia === undefined),
    );
  }

  const defamation = CLAIM_TYPES.find((ct) => ct.id === "sc-claim-defamation-libel-slander");
  if (defamation) {
    const result = selectDepthQuestions({
      elements: defamation.plaintiffElements,
      userTexts: ["She wrote something about me."],
      slotValues: {},
    });
    check(
      "selection: noQuestionNeeded elements are explicit, not gaps",
      result.noQuestionNeeded.includes("amount-within-jurisdiction-defamation"),
    );
    // Was pinned to "limitation-if-newspaper-or-broadcast", a REAL element
    // that happened to be unauthored. Authoring it emptied result.unauthored
    // and the check failed — a check invalidated by doing the work it was
    // meant to encourage, the same shape as the voiceLayer abort-signal check.
    //
    // Now asserted against a synthetic element id that will never be authored,
    // so it tests the BEHAVIOUR — an element with no authored question lands in
    // unauthored rather than vanishing — and stays true as coverage grows.
    const syntheticResult = selectDepthQuestions({
      elements: [
        ...defamation.plaintiffElements,
        {
          ...defamation.plaintiffElements[0],
          id: "synthetic-element-that-is-never-authored",
        },
      ],
      userTexts: ["She wrote something about me."],
      slotValues: {},
    });
    check(
      "selection: unauthored elements degrade to attestation",
      syntheticResult.unauthored.includes("synthetic-element-that-is-never-authored"),
      JSON.stringify(syntheticResult.unauthored),
    );
    check(
      "selection: every real defamation element is now authored or explicit",
      result.unauthored.length === 0,
      JSON.stringify(result.unauthored),
    );
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
