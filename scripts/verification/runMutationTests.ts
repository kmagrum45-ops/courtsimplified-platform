/**
 * Every family §3 / §2 check is proven able to fail.
 *
 * COSTS NOTHING. Local file edits plus suite runs. Slower than the suites
 * themselves (it runs each one once per mutation), so it is not wired into the
 * per-change loop — run it when a check is added or changed.
 *
 * WHAT THIS REPLACES. The ad-hoc perl/node one-liners used all session. One of
 * those reported a PASS because the replace had not matched: the file was never
 * mutated, the suite passed on clean code, and the output looked exactly like a
 * working check. mutationHarness.ts makes that outcome its own third state and
 * checks for it BEFORE the suite result is consulted.
 *
 * The first case below is a SELF-TEST of that guard: a mutation whose pattern
 * deliberately does not exist. It must be reported as "did not land". If the
 * harness ever reports it as caught or not-caught, the harness itself is broken
 * and every other result here is worthless.
 *
 * Run: node --import tsx scripts/verification/runMutationTests.ts
 */

import { pathToFileURL } from "node:url";

import {
  runMutationCase,
  snapshotFiles,
  verifyRestored,
  type MutationCase,
} from "./mutationHarness";

const EVIDENCE = "src/lib/case-system/familyEvidenceEngine.ts";
const REGISTRY = "src/lib/case-system/family/familyFormsRegistry.ts";
const PROVISIONS = "src/lib/case-system/family/citedProvisions.ts";
const TRIAGE = "src/lib/case-system/family/statusTriage.ts";
const STRATEGY = "src/lib/case-system/familyStrategyEngine.ts";
const CLRA_SOURCE = "docs/sources/clra-cited-sections.txt";

const FORMS_SUITE = "scripts/verification/verifyFamilyForms.ts";
const SCORES_SUITE = "scripts/verification/verifyFamilyNoScores.ts";
const PROVISIONS_SUITE = "scripts/verification/verifyCitedProvisions.ts";
const TRIAGE_SUITE = "scripts/verification/verifyStatusTriage.ts";

/**
 * The self-test. Its pattern is not in the file and must never be.
 * Expected outcome is "did-not-land", not "caught".
 */
const GUARD_SELF_TEST: MutationCase = {
  label: "SELF-TEST: a pattern that does not exist is reported as not landing",
  suite: SCORES_SUITE,
  mutations: [
    {
      file: EVIDENCE,
      find: "this exact string is deliberately absent from the codebase 8f3a1c",
      replace: "replacement that will never be written",
    },
  ],
};

const CASES: MutationCase[] = [
  // ---- Form titles must match the regulation ----
  {
    label: "Form 35.1's title regains the paraphrased \"and\"",
    suite: FORMS_SUITE,
    mutations: [
      {
        file: REGISTRY,
        find: "Parenting Time, Contact)",
        replace: "Parenting Time and Contact)",
      },
    ],
  },
  {
    label: "Form 13's title loses a word from the regulation's wording",
    suite: FORMS_SUITE,
    mutations: [
      {
        file: REGISTRY,
        find: '"Financial Statement (Support Claims)"',
        replace: '"Financial Statement (Support)"',
      },
    ],
  },

  // ---- No score formulas, ladders or credibility reads ----
  {
    label: "a score-suffixed field returns to the evidence item",
    suite: SCORES_SUITE,
    mutations: [
      {
        file: EVIDENCE,
        find: "  missingDetails: string[];",
        replace: "  missingDetails: string[];\n  strengthScore: number;",
      },
    ],
  },
  {
    label: "the hedging penalty returns, reading credibility off the user's wording",
    suite: SCORES_SUITE,
    mutations: [
      {
        file: EVIDENCE,
        find: "  return missing;\n}",
        replace:
          '  if (!params.date) missing.push("The description sounds uncertain or second-hand.");\n' +
          "  return missing;\n}",
      },
    ],
  },
  {
    label: "the recorded-vs-not partition stops partitioning",
    suite: SCORES_SUITE,
    mutations: [
      {
        file: EVIDENCE,
        find:
          "const completeEvidence = analyzedEvidence.filter((item) => item.missingDetails.length === 0);",
        replace: "const completeEvidence = analyzedEvidence;",
      },
    ],
  },
  {
    label: "the removed credibility prediction returns verbatim",
    suite: SCORES_SUITE,
    mutations: [
      {
        file: STRATEGY,
        find: "    suggestedWordingImprovements.push(",
        replace:
          '    proceduralWarnings.push("Emotionally charged wording may reduce credibility if not tied to specific evidence.");\n' +
          "    suggestedWordingImprovements.push(",
      },
    ],
  },
  {
    label: "a differently-worded prediction about a reader's reaction appears",
    suite: SCORES_SUITE,
    mutations: [
      {
        file: STRATEGY,
        find: "    suggestedWordingImprovements.push(",
        replace:
          '    proceduralWarnings.push("This wording will be seen as hostile by the court.");\n' +
          "    suggestedWordingImprovements.push(",
      },
    ],
  },
  {
    label: "the drafting guidance is deleted along with the prediction",
    suite: SCORES_SUITE,
    mutations: [
      {
        file: STRATEGY,
        find: "Replace emotional labels with dated incidents",
        replace: "Consider rewording",
      },
    ],
  },

  // ---- Not-in-force law stays declared and fresh ----
  {
    label: "a pending replacement in the source goes undeclared",
    suite: PROVISIONS_SUITE,
    mutations: [
      {
        file: PROVISIONS,
        find: 'amendingCitation: "2025, c. 6, Sched. 6, s. 1 (1)"',
        replace: 'amendingCitation: ""',
      },
      {
        file: PROVISIONS,
        find: "    pendingReplacement: {\n      amendingCitation: \"\",",
        replace: "    unusedField: {\n      amendingCitation: \"\",",
      },
    ],
  },
  {
    label: "a pending replacement goes unchecked past the 90-day limit",
    suite: PROVISIONS_SUITE,
    mutations: [
      {
        file: PROVISIONS,
        find: 'lastChecked: "2026-09-13"',
        replace: 'lastChecked: "2026-01-01"',
      },
    ],
  },
  {
    label: "the source's not-in-force marker disappears (the amendment came into force)",
    suite: PROVISIONS_SUITE,
    mutations: [
      {
        file: CLRA_SOURCE,
        find: "On a day to be named",
        replace: "On a date already passed",
      },
    ],
  },
  {
    label: "a cited provision is not vendored",
    suite: PROVISIONS_SUITE,
    mutations: [
      {
        file: PROVISIONS,
        find: 'section: "s. 29"',
        replace: 'section: "s. 33"',
      },
    ],
  },

  // ---- The triage records facts and concludes nothing ----
  {
    label: "the unjust-enrichment route is withheld unless the user asks",
    suite: TRIAGE_SUITE,
    mutations: [
      {
        file: TRIAGE,
        find: "    if (record.cohabitationStart !== null) {",
        replace: "    if (false) {",
      },
    ],
  },
  {
    label: "the triage announces a statutory definition is satisfied",
    suite: TRIAGE_SUITE,
    mutations: [
      {
        file: TRIAGE,
        find: "So a couple can be covered by the support rules and not by the property rules.",
        replace: "You qualify as a spouse under the definition in s. 29.",
      },
    ],
  },
  {
    label: "the triage tells the user which court to file in",
    suite: TRIAGE_SUITE,
    mutations: [
      {
        file: TRIAGE,
        find: '"Which court hears a family case depends on what is being asked for. The Divorce Act " +',
        replace: '"You must file in the Superior Court of Justice. " +',
      },
    ],
  },
  {
    label: "the triage says a claim does not apply to the user",
    suite: TRIAGE_SUITE,
    mutations: [
      {
        file: TRIAGE,
        find: "So a couple can be covered by the support rules and not by the property rules.",
        replace: "Part I does not apply to you.",
      },
    ],
  },
  {
    label: "the triage computes a duration from the user's recorded dates",
    suite: TRIAGE_SUITE,
    mutations: [
      {
        file: TRIAGE,
        find: "So a couple can be covered by the support rules and not by the property rules.",
        replace: "You have lived together for 7 years.",
      },
    ],
  },
  {
    label: "the municipality list is filtered to the user's own match",
    suite: TRIAGE_SUITE,
    mutations: [
      {
        file: TRIAGE,
        find: "  return FAMILY_COURT_MUNICIPALITIES.map((name) => ({",
        replace:
          "  return FAMILY_COURT_MUNICIPALITIES.filter((n) => recorded.has(n)).map((name) => ({",
      },
    ],
  },
  {
    label: "a municipality drops out of the r. 1 (3) list",
    suite: TRIAGE_SUITE,
    mutations: [
      {
        file: TRIAGE,
        find: '  "City of Ottawa",\n',
        replace: "",
      },
    ],
  },
];

function main(): void {
  let failures = 0;

  // ---- The guard's self-test runs first ----

  const selfSnapshot = snapshotFiles(GUARD_SELF_TEST);
  const selfOutcome = runMutationCase(GUARD_SELF_TEST);

  if (selfOutcome.kind === "did-not-land") {
    console.log("pass  SELF-TEST: a non-matching mutation is reported, not silently passed");
  } else {
    failures += 1;
    console.log(
      `FAIL  SELF-TEST reported "${selfOutcome.kind}" for a pattern that does not exist.\n` +
        "      The harness cannot tell a missing mutation from a working check. " +
        "Every result below is meaningless until this passes.",
    );
  }

  const selfRestore = verifyRestored(GUARD_SELF_TEST, selfSnapshot);
  if (selfRestore) {
    failures += 1;
    console.log(`FAIL  ${selfRestore.detail}`);
  }

  // ---- The real cases ----

  for (const testCase of CASES) {
    const snapshot = snapshotFiles(testCase);
    const outcome = runMutationCase(testCase);

    if (outcome.kind === "caught") {
      console.log(`pass  ${outcome.label}`);
    } else {
      failures += 1;
      const explanation =
        outcome.kind === "did-not-land"
          ? "MUTATION DID NOT LAND — the suite was never exercised, so this says " +
            "nothing about whether the check works. Fix the pattern."
          : outcome.kind === "not-caught"
            ? "the defect was reintroduced and the suite still passed"
            : "the file was left modified";

      console.log(`FAIL  ${outcome.label}\n      ${explanation}\n      ${outcome.detail}`);
    }

    const restore = verifyRestored(testCase, snapshot);
    if (restore) {
      failures += 1;
      console.log(`FAIL  ${restore.detail}`);
    }
  }

  console.log(
    `\n${failures === 0 ? `All ${CASES.length} mutations caught.` : `${failures} mutation check(s) FAILED.`}`,
  );
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
