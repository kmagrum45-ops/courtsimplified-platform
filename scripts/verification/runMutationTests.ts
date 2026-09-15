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
const PROVISIONS = "src/lib/case-system/sources/statutoryProvisions.ts";
const TRIAGE = "src/lib/case-system/family/statusTriage.ts";
const STRATEGY = "src/lib/case-system/familyStrategyEngine.ts";
const CLRA_SOURCE = "docs/sources/clra-cited-sections.txt";

const CANDIDATES = "src/lib/case-system/events/caseEventCandidates.ts";
const CANDIDATES_ROUTE = "app/api/cases/event-candidates/route.ts";
const ANALYZE_ROUTE = "app/api/small-claims/analyze/route.ts";

const OVERVIEW_PANEL = "app/builder/_components/IntelligenceOverviewPanel.tsx";
const REACH_SUITE = "scripts/verification/verifyReachability.ts";

const VOICE_LAYER = "src/lib/case-system/intake/voiceLayer.ts";
const GUARDS_SUITE = "scripts/verification/verifyFixtureHarnessGuards.ts";

const EXPORT_ROUTE = "app/api/document-export/route.ts";
const EXPORT_SUITE = "scripts/verification/verifyExportedDocument.ts";

const FORMS_SUITE = "scripts/verification/verifyFamilyForms.ts";
const SCORES_SUITE = "scripts/verification/verifyFamilyNoScores.ts";
const PROVISIONS_SUITE = "scripts/verification/verifyCitedProvisions.ts";
const TRIAGE_SUITE = "scripts/verification/verifyStatusTriage.ts";
const COVERAGE_SUITE = "scripts/verification/verifyIntakeCoverage.ts";
const EVENTS_SUITE = "scripts/verification/verifyCaseEvents.ts";
const EVENT_TYPES = "src/lib/case-system/events/caseEventTypes.ts";
const EVENT_ADAPTER = "src/lib/case-system/events/caseEventAdapter.ts";
const EVENT_CONSISTENCY = "src/lib/case-system/events/caseEventConsistency.ts";
const EVENT_REQUEST = "src/lib/case-system/events/caseEventRequest.ts";
const EVENT_CANDIDATES = "src/lib/case-system/events/caseEventCandidates.ts";

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
    label: "a consolidation period disagrees with the vendored file's own header",
    suite: PROVISIONS_SUITE,
    mutations: [
      {
        file: PROVISIONS,
        find: 'consolidationPeriod: "2026-07-01"',
        replace: 'consolidationPeriod: "2020-01-01"',
      },
    ],
  },
  {
    label: "a vendored source is a frozen historical version",
    suite: PROVISIONS_SUITE,
    mutations: [
      {
        file: "docs/sources/cyfsa-cited-sections.txt",
        find: "Consolidation period: from 2026-07-01 to the e-Laws currency date",
        replace: "HISTORICAL VERSION FOR THE PERIOD 2026-07-01 TO 2026-08-01",
      },
    ],
  },
  {
    label: "a cited provision is not vendored",
    suite: PROVISIONS_SUITE,
    // Was `s. 29` -> `s. 33`, which stopped being a defect the moment FLA
    // s. 33 was vendored for the child support path: the mutation landed and
    // the suite correctly passed, so the MUTATION reported a failure rather
    // than the check. Same shape as the three stale checks recorded in
    // OUTSTANDING_ISSUES section 34 — a mutation can pin a moving target too.
    //
    // Now points at a section that will never be vendored, because it does
    // not exist. The property under test is unchanged: a provision cited
    // without vendored text must fail.
    mutations: [
      {
        file: PROVISIONS,
        find: 'section: "s. 29"',
        replace: 'section: "s. 9999"',
      },
    ],
  },

  // ---- Case events ----
  {
    label: "an approximate date is treated as reliable",
    suite: EVENTS_SUITE,
    mutations: [
      {
        file: EVENT_ADAPTER,
        find: 'return row.date_certainty === "exact" ? row.occurred_at_normalized : null;',
        replace: "return row.occurred_at_normalized;",
      },
    ],
  },
  {
    label: "a superseded event stays live",
    suite: EVENTS_SUITE,
    mutations: [
      {
        file: EVENT_ADAPTER,
        find: "return rows.filter((row) => row.retracted_at === null && !supersededIds.has(row.id));",
        replace: "return rows.filter((row) => row.retracted_at === null);",
      },
    ],
  },
  {
    label: "a contradiction notice loses the leave-it-alone option",
    suite: EVENTS_SUITE,
    mutations: [
      {
        file: EVENT_CONSISTENCY,
        find: '        "Leave it as it is",\n      ],\n      relatedEventIds: laterEvents.map',
        replace: "      ],\n      relatedEventIds: laterEvents.map",
      },
    ],
  },
  {
    label: "the untyped option loses its first-class marker",
    suite: EVENTS_SUITE,
    mutations: [
      {
        file: EVENT_TYPES,
        find: "    firstClassUntyped: true,",
        replace: "",
      },
    ],
  },

  {
    label: "the writer starts parsing prose dates instead of rejecting them",
    suite: EVENTS_SUITE,
    mutations: [
      {
        file: EVENT_REQUEST,
        find: "  if (!ISO_DATE.test(candidate)) return { ok: false };",
        replace:
          "  if (!ISO_DATE.test(candidate)) {\n" +
          "    const guess = new Date(candidate);\n" +
          "    return Number.isNaN(guess.getTime())\n" +
          "      ? { ok: false }\n" +
          "      : { ok: true, date: guess.toISOString().slice(0, 10) };\n" +
          "  }",
      },
    ],
  },
  {
    label: "the writer stops enforcing the sourced event vocabulary",
    suite: EVENTS_SUITE,
    mutations: [
      {
        file: EVENT_REQUEST,
        find: "  if (!caseEventType(eventTypeValue)) return null;",
        replace: "  if (!eventTypeValue) return null;",
      },
    ],
  },

  {
    label: "the candidate fingerprint hashes the event type back in",
    suite: EVENTS_SUITE,
    mutations: [
      {
        file: EVENT_CANDIDATES,
        find:
          "export function candidateFingerprint(narrativeBasis: string): string {\n" +
          "  return createHash(\"sha256\").update(normalizeForFingerprint(narrativeBasis)).digest(\"hex\");",
        replace:
          "export function candidateFingerprint(narrativeBasis: string, type = \"\"): string {\n" +
          "  return createHash(\"sha256\")\n" +
          "    .update(type + \"|\" + normalizeForFingerprint(narrativeBasis))\n" +
          "    .digest(\"hex\");",
      },
    ],
  },
  {
    label: "a dismissed candidate is offered again as if unanswered",
    suite: EVENTS_SUITE,
    mutations: [
      {
        file: EVENT_CANDIDATES,
        find: "    const dismissed = dismissedByFingerprint.get(fingerprint);",
        replace: "    const dismissed = undefined as never;",
      },
    ],
  },
  {
    label: "a restored dismissal keeps suppressing the candidate",
    suite: EVENTS_SUITE,
    mutations: [
      {
        file: EVENT_CANDIDATES,
        find: "  return rows.filter((row) => row.restored_at === null);",
        replace: "  return rows;",
      },
    ],
  },

  // ---- Sourcing conventions ----
  {
    label: "an e-Laws viewer URL (JS shell, no text) returns to the authority registry",
    suite: COVERAGE_SUITE,
    mutations: [
      {
        file: "src/lib/case-system/authority-intelligence/verifiedAuthoritySeedRegistry.ts",
        find: '"https://www.ontario.ca/laws/docs/990114_e.doc"',
        replace: '"https://www.ontario.ca/laws/regulation/990114"',
      },
    ],
  },
  {
    label: "a family safety resource citation loses its verifiedAt",
    suite: COVERAGE_SUITE,
    mutations: [
      {
        file: "src/lib/case-system/intake/familySafetyResources.ts",
        find: 'verifiedAt: "2026-09-07"',
        replace: 'verifiedAt: ""',
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

  // The defect these reintroduce actually shipped: the candidate surface read
  // a key nothing writes and returned an empty list on every request, and the
  // analysis ran with an empty confirmedEvents list on every run. Both read
  // clean and both stayed wrong. These say whether the new checks can see it.
  {
    label: "the candidate read points at the top-level `timeline` again",
    suite: EVENTS_SUITE,
    mutations: [
      {
        file: CANDIDATES,
        find: "  const masterCase = (masterResult as Record<string, unknown>).masterCase;",
        replace: "  const masterCase = masterResult as Record<string, unknown>;",
      },
    ],
  },
  {
    label: "the candidates route reaches into the blob itself again",
    suite: EVENTS_SUITE,
    mutations: [
      {
        file: CANDIDATES_ROUTE,
        find: "candidatesFromMasterResult(loaded.ownedCase.master_result)",
        replace:
          "candidatesFromTimeline(asRecord(loaded.ownedCase.master_result)?.timeline)",
      },
    ],
  },
  {
    label: "the analysis stops being told which events the user confirmed",
    suite: EVENTS_SUITE,
    mutations: [
      {
        file: ANALYZE_ROUTE,
        find: "      allowExternalCognition,\n      confirmedEvents,\n",
        replace: "      allowExternalCognition,\n",
      },
    ],
  },
  // The exported document is the one place a graded value leaves the building
  // on paper. These reintroduce it three ways: printed in the header, printed
  // through the next-action branch, and merely carried on the response object
  // where the last one sat unprinted until somebody printed it again.
  // The reachability check is the only thing standing between this codebase
  // and another "built correctly, nobody can reach it". If it cannot fail,
  // nothing here is protected. This severs the import that made the family
  // safety content reachable, which should put the module straight back into
  // the unreachable set undeclared.
  {
    label: "a wired module falls back out of the reachable set",
    suite: REACH_SUITE,
    mutations: [
      {
        file: OVERVIEW_PANEL,
        find: "import { FAMILY_RESOURCE_TOPICS } from \"../../../src/lib/case-system/intake/familySafetyResources\";",
        replace: "const FAMILY_RESOURCE_TOPICS: never[] = [];",
      },
    ],
  },

  // The voiceLayer checks replaced one that had been failing since the model
  // call was removed from composeVoiceTurn. A replacement for a stale check
  // has to be shown to fail, or the suite is quieter but no stronger.
  {
    label: "a model call returns to voiceLayer, reinstating the lead-in",
    suite: GUARDS_SUITE,
    mutations: [
      {
        file: VOICE_LAYER,
        find: "  void facts;",
        replace: "  void facts;\n  void fetch(\"https://api.openai.com/v1/chat/completions\");",
      },
    ],
  },
  {
    label: "composeVoiceTurn stops returning the reviewed question text verbatim",
    suite: GUARDS_SUITE,
    mutations: [
      {
        file: VOICE_LAYER,
        find: "    questionText: question.text,",
        replace: "    questionText: String(question.text || \"\").trim(),",
      },
    ],
  },
  {
    label: "a readiness percentage is printed back into the document header",
    suite: EXPORT_SUITE,
    mutations: [
      {
        file: EXPORT_ROUTE,
        find:
          "    `Sections with content: ${args.sectionSummary.withContent} of ${args.sectionSummary.total}`,",
        replace:
          "    `Readiness: ${Math.round((args.sectionSummary.withContent / args.sectionSummary.total) * 100)}%`,",
      },
    ],
  },
  {
    label: "the next action goes back to a threshold branch",
    suite: EXPORT_SUITE,
    mutations: [
      {
        file: EXPORT_ROUTE,
        find:
          "        sectionSummary.emptyTitles.length > 0\n          ? `These sections have no content yet: ${sectionSummary.emptyTitles.join(\", \")}.`",
        replace:
          "        sectionSummary.withContent / sectionSummary.total < 0.8\n          ? `Readiness ${Math.round((sectionSummary.withContent / sectionSummary.total) * 100)}% — review missing sections.`",
      },
    ],
  },
  {
    label: "a score field returns to the export package, unprinted",
    suite: EXPORT_SUITE,
    mutations: [
      {
        file: EXPORT_ROUTE,
        find: "      sectionSummary,\n      sections,\n      plainText,",
        replace:
          "      sectionSummary,\n      readiness: { score: 33, status: \"needs-repair\" },\n      sections,\n      plainText,",
      },
    ],
  },
  {
    label: "retracted events are threaded into the analysis",
    suite: EVENTS_SUITE,
    mutations: [
      {
        file: ANALYZE_ROUTE,
        find: "            liveCaseEvents(\n              await dependencies.loadCaseEvents(request, user, caseId),\n            ),",
        replace: "            await dependencies.loadCaseEvents(request, user, caseId),",
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
