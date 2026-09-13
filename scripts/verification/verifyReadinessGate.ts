/**
 * Verifies the Statement of Claim readiness gate, offline.
 *
 * COSTS NOTHING. The gate is a pure function over data the pipeline already
 * holds, so every condition in design section 8 is checkable without an API
 * call. That is a property of the gate, not a limitation of this harness.
 *
 * Checks, in the order the brief states them:
 *   1. The gate reports what is recorded, never whether it is sufficient.
 *   2. cannot-provide RESOLVES — it does not hold the gate.
 *   3. No score, no percentage, no ordinal readiness label.
 * plus the five gate conditions and the claim-type-agnostic property.
 *
 * Run: node --import tsx scripts/verification/verifyReadinessGate.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import {
  evaluateReadinessGate,
  outstandingHeading,
  type ReadinessGateInput,
} from "../../src/lib/case-system/readiness/readinessGate";
import {
  createElementStateMap,
  recordCannotProvide,
  recordDepthAnswer,
  type ElementStateMap,
} from "../../src/lib/case-system/intake/depth/elementStateMap";
import { validateCaseStrengthLanguage } from "../../src/lib/case-system/intelligence/caseStrengthLanguageValidator";
import { isNoQuestionNeeded } from "../../src/lib/case-system/intake/depth/elementQuestionRegistry";

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const DEBT = CLAIM_TYPES.find((ct) => ct.id === "sc-claim-unpaid-debt-services")!;
const DEFAMATION = CLAIM_TYPES.find((ct) => ct.id === "sc-claim-defamation-libel-slander")!;

function baseInput(overrides: Partial<ReadinessGateInput> = {}): ReadinessGateInput {
  return {
    claimType: DEBT,
    elementStateMap: createElementStateMap(
      DEBT.plaintiffElements.map((element) => ({ id: element.id, name: element.name })),
    ),
    confirmedRemedyId: "sc-remedy-monetary-judgment",
    storyText: "They never paid me for the work I did.",
    ...overrides,
  };
}

function allResolved(claimTypeElements: { id: string; name: string }[]): ElementStateMap {
  let map = createElementStateMap(claimTypeElements);
  for (const element of claimTypeElements) {
    map = recordDepthAnswer(map, {
      elementId: element.id,
      questionId: "q",
      answerText: "Something the user typed.",
    });
  }
  return map;
}

function main(): void {
  // ---- Gate conditions (design section 8) ----

  const noClaimType = evaluateReadinessGate(baseInput({ claimType: null }));
  check("condition 1: no confirmed claim type holds the gate", !noClaimType.draftAvailable);
  check(
    "condition 1: with no claim type there are no elements and no gate",
    noClaimType.outstanding.length === 0 && noClaimType.totalElements === 0,
  );

  check(
    "condition 3: no confirmed remedy holds the gate",
    evaluateReadinessGate(baseInput({ confirmedRemedyId: null })).blockers.some(
      (b) => b.kind === "no-remedy-confirmed",
    ),
  );

  check(
    "condition 4: an empty story holds the gate",
    evaluateReadinessGate(baseInput({ storyText: "   " })).blockers.some(
      (b) => b.kind === "no-story-entered",
    ),
  );

  const untouched = evaluateReadinessGate(baseInput());
  check("condition 5: elements left not-yet hold the gate", !untouched.draftAvailable);
  check(
    "condition 5: outstanding lists every unanswered element",
    untouched.outstandingCount === DEBT.plaintiffElements.length,
  );

  const resolved = evaluateReadinessGate(
    baseInput({
      elementStateMap: allResolved(
        DEBT.plaintiffElements.map((e) => ({ id: e.id, name: e.name })),
      ),
    }),
  );
  check("all five conditions met -> the draft is available", resolved.draftAvailable, JSON.stringify(resolved.blockers));

  // An element with NO record must not read as resolved. Otherwise the gate
  // opens on elements the user never saw.
  check(
    "an element missing from the map counts as not-yet, not resolved",
    !evaluateReadinessGate(baseInput({ elementStateMap: {} })).draftAvailable,
  );

  // ---- noQuestionNeeded elements must not hold the gate ----
  //
  // Live batch L1/L4: a jurisdictional element the registry marks as "not a
  // fact the user narrates" held the gate, and the only way past it was for the
  // user to attest "I don't have this" about a jurisdiction test.
  const LOAN = CLAIM_TYPES.find((ct) => ct.id === "sc-claim-personal-loan-between-individuals")!;
  const jurisdictional = LOAN.plaintiffElements.filter((e) => isNoQuestionNeeded(e.id));
  const narratable = LOAN.plaintiffElements.filter((e) => !isNoQuestionNeeded(e.id));

  check(
    "the fixture claim type actually has a noQuestionNeeded element",
    jurisdictional.length > 0,
    "otherwise this check proves nothing",
  );

  // Every USER-NARRATABLE element answered; the jurisdictional one untouched.
  let loanMap = createElementStateMap(
    LOAN.plaintiffElements.map((e) => ({ id: e.id, name: e.name })),
  );
  for (const element of narratable) {
    loanMap = recordDepthAnswer(loanMap, {
      elementId: element.id,
      questionId: "q",
      answerText: "Something the user typed.",
    });
  }

  const loanGate = evaluateReadinessGate({
    claimType: LOAN,
    elementStateMap: loanMap,
    confirmedRemedyId: LOAN.remedies[0],
    storyText: "I lent my sister money and she has not paid it back.",
  });

  check(
    "a noQuestionNeeded element does NOT hold the gate",
    loanGate.draftAvailable,
    JSON.stringify(loanGate.blockers),
  );
  check(
    "it is not listed as outstanding",
    !loanGate.outstanding.some((o) => jurisdictional.some((j) => j.id === o.elementId)),
  );
  check(
    "it is excluded from totalElements",
    loanGate.totalElements === narratable.length,
    `total ${loanGate.totalElements}, narratable ${narratable.length}`,
  );
  check(
    "it is reported separately rather than silently dropped",
    loanGate.notUserNarratable.length === jurisdictional.length,
  );
  check(
    "the user is never asked to attest cannot-provide for it",
    loanGate.cannotProvide.length === 0,
  );

  // ---- CONSTRAINT 2: cannot-provide RESOLVES ----

  let cannotMap = createElementStateMap(
    DEBT.plaintiffElements.map((e) => ({ id: e.id, name: e.name })),
  );
  for (const element of DEBT.plaintiffElements) {
    cannotMap = recordCannotProvide(cannotMap, {
      elementId: element.id,
      questionId: "q",
      answerText: "I don't know",
    });
  }

  const allCannot = evaluateReadinessGate(baseInput({ elementStateMap: cannotMap }));
  check(
    "constraint 2: a user who cannot answer ANYTHING still reaches a draft",
    allCannot.draftAvailable,
    JSON.stringify(allCannot.blockers),
  );
  check(
    "constraint 2: cannot-provide never appears as a blocker",
    !allCannot.blockers.some((b) => b.kind === "elements-not-yet"),
  );
  check(
    "constraint 2: cannot-provide elements are surfaced so the draft can mark them",
    allCannot.cannotProvide.length === DEBT.plaintiffElements.length,
  );

  // Mixed: one cannot-provide, one answered, one still not-yet.
  const [first, second] = DEBT.plaintiffElements;
  let mixed = createElementStateMap(DEBT.plaintiffElements.map((e) => ({ id: e.id, name: e.name })));
  mixed = recordCannotProvide(mixed, { elementId: first.id, questionId: "q", answerText: "no idea" });
  mixed = recordDepthAnswer(mixed, {
    elementId: second.id,
    questionId: "q",
    answerText: "I sent an invoice in March.",
  });
  const mixedResult = evaluateReadinessGate(baseInput({ elementStateMap: mixed }));
  check(
    "constraint 2: only the untouched element holds the gate",
    mixedResult.outstandingCount === 1 && !mixedResult.draftAvailable,
    `outstanding ${mixedResult.outstandingCount}`,
  );
  check(
    "an answered element is not listed as outstanding",
    !mixedResult.outstanding.some((o) => o.elementId === second.id),
  );

  // ---- CONSTRAINT 1: reports what is recorded, never whether it suffices ----

  // The same map, with a one-word answer and with a detailed one, must produce
  // an identical gate result. If the gate ever inspected CONTENT, these differ.
  let thin = createElementStateMap(DEBT.plaintiffElements.map((e) => ({ id: e.id, name: e.name })));
  let thick = createElementStateMap(DEBT.plaintiffElements.map((e) => ({ id: e.id, name: e.name })));
  for (const element of DEBT.plaintiffElements) {
    thin = recordDepthAnswer(thin, { elementId: element.id, questionId: "q", answerText: "no" });
    thick = recordDepthAnswer(thick, {
      elementId: element.id,
      questionId: "q",
      answerText:
        "A signed agreement dated 3 March 2025, an invoice for $8,400, three demand letters and " +
        "a witness who was present when we agreed the price.",
    });
  }
  const thinResult = evaluateReadinessGate(baseInput({ elementStateMap: thin }));
  const thickResult = evaluateReadinessGate(baseInput({ elementStateMap: thick }));
  check(
    "constraint 1: a one-word answer and a detailed one give the SAME gate result",
    JSON.stringify(thinResult) === JSON.stringify(thickResult),
    "the gate must never inspect the content of what was supplied",
  );

  // ---- CONSTRAINT 3: no score, no percentage, no ordinal label ----

  const source = readFileSync(
    path.join(__dirname, "..", "..", "src", "lib", "case-system", "readiness", "readinessGate.ts"),
    "utf8",
  );
  const code = source
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join("\n");

  check("constraint 3: no percentage arithmetic", !/\*\s*100|\/\s*total|100\s*\*/.test(code));
  check(
    "constraint 3: no ordinal readiness ladder",
    !/"(very-low|low|medium|high|very-high|weak|moderate|strong|ready|near-ready|developing)"/.test(code),
  );
  // NO WORD BOUNDARIES. The first version of this check used
  // /\b(score|Score|...)\b/ and did NOT fire on `readinessScore`, because
  // there is no word boundary inside a camelCase identifier. That is precisely
  // how scoreFromConfidence, systemScore, exportScore and readinessScore all
  // survived earlier removal passes: the offending word was a SUFFIX, and
  // every search looked for it as a whole word. Substring, case-insensitive.
  check(
    "constraint 3: no score-shaped identifier, including camelCase suffixes",
    !/score|percent|ratio|readinesslevel/i.test(code),
    (code.match(/\w*(?:score|percent|ratio)\w*/gi) || []).join(", "),
  );
  check(
    "constraint 3: outstandingCount is a count, nothing divides by totalElements",
    !/outstandingCount\s*\/|\/\s*totalElements/.test(code),
  );

  // Every user-facing string the gate emits must pass the case-strength
  // validator, and so must the sourced copy it forwards.
  for (const claimType of [DEBT, DEFAMATION]) {
    const result = evaluateReadinessGate(
      baseInput({
        claimType,
        elementStateMap: createElementStateMap(
          claimType.plaintiffElements.map((e) => ({ id: e.id, name: e.name })),
        ),
      }),
    );

    for (const element of result.outstanding) {
      const heading = outstandingHeading(element);
      check(
        `[${claimType.id}] heading carries no case-strength language`,
        validateCaseStrengthLanguage(heading).valid,
        heading,
      );
      check(
        `[${claimType.id}] ${element.elementId}: forwarded explanation is clean`,
        validateCaseStrengthLanguage(element.plainExplanation).valid,
      );
      check(
        `[${claimType.id}] ${element.elementId}: cites its own source`,
        element.sourceUrl.startsWith("http"),
      );
    }
  }

  // ---- Claim-type agnostic: works on a claim type it was never written for ----

  const defamationResult = evaluateReadinessGate(
    baseInput({
      claimType: DEFAMATION,
      elementStateMap: createElementStateMap(
        DEFAMATION.plaintiffElements.map((e) => ({ id: e.id, name: e.name })),
      ),
      confirmedRemedyId: DEFAMATION.remedies[0],
    }),
  );
  // totalElements counts USER-NARRATABLE elements only — defamation has one
  // jurisdictional element, now excluded.
  const defamationNarratable = DEFAMATION.plaintiffElements.filter((e) => !isNoQuestionNeeded(e.id));
  check(
    "claim-type agnostic: a different claim type yields its own elements",
    defamationResult.totalElements === defamationNarratable.length &&
      defamationNarratable.length !== DEFAMATION.plaintiffElements.length,
    `total ${defamationResult.totalElements}, narratable ${defamationNarratable.length}, all ${DEFAMATION.plaintiffElements.length}`,
  );
  check(
    "claim-type agnostic: remedy options come from the claim type's own data",
    defamationResult.remedyOptions.length > 0,
  );
  check(
    "the gate enumerates no claim type ids",
    !/sc-claim-/.test(code),
    "a claim-type id in the gate would break claim type 50",
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
