import assert from "node:assert/strict";
import { loadEnvConfig } from "@next/env";

import {
  classifyCourtPath,
  coerceModelPayload,
  statedDollarAmounts,
  type CourtPathClassification,
} from "../../src/lib/case-system/intelligence/courtPathClassifier";
import { classificationScenarios } from "./scenarioRegistry";

/**
 * Check for the court-path classifier. classifyCourtPath is wired into
 * app/api/classify-court-path/route.ts, called from HomeLocationGate.tsx on
 * every intake -- this is not the only thing exercising it, but it is the
 * only place that proves the classification contract itself (shape,
 * escalation cost control, out-of-scope forum handling) independent of the
 * browser and the route.
 *
 * Runs offline by default: without RUN_COURT_PATH_CLASSIFIER_AI=1 the OpenAI
 * key is cleared, so escalated cases resolve through the keyword fallback and
 * report source "ai-unavailable". That still proves the escalation decision
 * itself, which is the part that controls spend. Set the flag (with a key
 * configured) to exercise the real model call.
 */
const LIVE_AI = process.env.RUN_COURT_PATH_CLASSIFIER_AI === "1";

if (LIVE_AI) {
  // Same loader the configured-AI integration check uses, so a key in
  // .env.local is picked up. Only on live runs; the offline path stays
  // hermetic and must never see a key.
  loadEnvConfig(process.cwd());
} else {
  delete process.env.OPENAI_API_KEY;
}

const TESTER_STORY =
  "my uncles ex girlfriend sent text messages to my uncle and my dad saying I was a prostitute which is not true and she did this because I was going to testify in my uncle's custody case";

type Expectation = {
  id: string;
  story: string;
  /** Cheap pass must NOT call the model for these. */
  expectNoEscalation?: boolean;
  /** Cheap pass MUST escalate for these (ambiguous or contradicted). */
  expectEscalation?: boolean;
  /** Must never reach the model under ANY declared path (keyword already answered). */
  expectAlwaysFree?: boolean;
  /** Asserted only on live runs: what the model must return once escalated. */
  expectAiPrimary?: CourtPathClassification["primaryPath"];
  /** Required when no model runs; the keyword stage must reach this itself. */
  expectKeywordPrimary?: CourtPathClassification["primaryPath"];
};

const cases: Expectation[] = [
  // ---- The three collision fixtures ---------------------------------------
  {
    id: "collision-mixed-relief",
    story:
      "Someone sent false messages about me and I want compensation, but I also need a custody order changing parenting time.",
    expectAlwaysFree: true,
    expectKeywordPrimary: "mixed",
  },
  {
    id: "collision-genuine-family-relief",
    story:
      "I need a parenting order and child support because the other parent is not paying support.",
    expectKeywordPrimary: "family",
  },
  {
    id: "collision-defamation-in-family-context",
    story: TESTER_STORY,
    expectAlwaysFree: true,
    expectKeywordPrimary: "mixed",
  },

  // ---- Unambiguous controls: must stay free --------------------------------
  // Phrasings the existing keyword stage classifies confidently. See the
  // coverage observations at the end for phrasings it does not.
  {
    id: "control-small-claims-contract",
    story:
      "I want to sue for breach of contract in small claims court for money owed.",
    expectNoEscalation: true,
    expectKeywordPrimary: "small-claims",
  },
  {
    id: "control-family-custody-only",
    story:
      "I need a parenting order setting out custody and parenting time for my children.",
    expectNoEscalation: true,
    expectKeywordPrimary: "family",
  },
  {
    id: "control-civil-negligence",
    story:
      "I was injured by another party's negligence and I am claiming damages in Superior Court.",
    expectNoEscalation: true,
    expectKeywordPrimary: "civil",
  },
];

/**
 * Recorded, not asserted. These are stories a person would plausibly type where
 * the existing keyword stage is weak, so the classifier escalates or would
 * inherit a wrong answer if it did not. They document why the model stage
 * exists and give the next change a baseline to improve against.
 */
const keywordCoverageObservations: Array<{ note: string; story: string }> = [
  {
    note: "plain contract dispute, no court named",
    story:
      "A written agreement required delivery after payment, but delivery never occurred.",
  },
  {
    note: "small money amount, clearly under the Small Claims limit",
    story: "Someone owes me $3,000 and will not pay it back.",
  },
  {
    note: "sub-limit contractor claim",
    story:
      "I paid a contractor $4,000 to build a fence and he never did the work and will not refund me.",
  },
  {
    note: "over-limit negligence claim, belongs in Superior Court",
    story:
      "A contractor was negligent and caused serious property damage and my losses exceed fifty thousand dollars.",
  },
];

// ---- Context-vs-relief cases that actually reach the model -----------------
// The tester story terminates at the keyword stage, so it never exercised the
// prompt instruction about relief sought vs topic mentioned. These two do: both
// are over SHORT_STORY_CHARACTERS so they escalate on length with no declared
// path hinting the answer, and the keyword stage gets both WRONG in opposite
// directions. expectKeywordPrimary records that wrong answer deliberately.
cases.push(
  {
    id: "context-family-relief-money",
    story:
      "My divorce was finalized last spring and the custody arrangement for our two children is already settled through the family court, so that part is done. The problem I need help with is completely separate: while the divorce was going through, my brother-in-law borrowed $8,000 from me and signed a note promising to repay it within a year. He has never paid a cent and now refuses to answer my calls. I want to recover the money he owes me.",
    expectEscalation: true,
    expectKeywordPrimary: "family", // wrong; the prominent topic wins without the model
    expectAiPrimary: "small-claims",
  },
  {
    id: "context-criminal-relief-family",
    story:
      "There is an ongoing police investigation into my ex-partner over a harassment complaint and I am told charges may be laid at some point. I am not asking about the criminal side of it at all. What I actually need is a court order changing where our daughter lives during the school week, because the current arrangement is not working for her and she is falling behind.",
    expectEscalation: true,
    expectKeywordPrimary: "civil", // wrong; opposite direction from the case above
    expectAiPrimary: "family",
  },
);

const declaredVariants: Array<{ label: string; declared?: string | null }> = [
  { label: "no declared path", declared: null },
  { label: "declared family", declared: "family" },
  { label: "declared small-claims", declared: "small-claims" },
];

function describe(result: CourtPathClassification): string {
  const secondary = result.secondaryPath ? `+${result.secondaryPath}` : "";
  return (
    `${result.primaryPath}${secondary}`.padEnd(20) +
    `conf=${result.confidence.toFixed(2)}  ` +
    `source=${result.source.padEnd(15)}` +
    `aiCalled=${result.aiCalled}`
  );
}

async function main() {
  console.log(
    `Court path classifier verification (${LIVE_AI ? "LIVE model" : "offline; escalation only"})\n`,
  );

  let aiCallCount = 0;
  let checks = 0;

  for (const testCase of cases) {
    console.log(`[${testCase.id}]  (${testCase.story.length} chars)`);

    for (const variant of declaredVariants) {
      const result = await classifyCourtPath({
        story: testCase.story,
        declaredCourtPath: variant.declared,
      });

      if (result.aiCalled) aiCallCount += 1;

      console.log(`   ${variant.label.padEnd(22)} ${describe(result)}`);
      console.log(`      reasoning: ${result.reasoning}`);

      // Shape contract holds on every path, model or not.
      assert.ok(
        ["family", "small-claims", "civil", "mixed", "unknown"].includes(
          result.primaryPath,
        ),
        `${testCase.id}: unexpected primaryPath ${result.primaryPath}`,
      );
      assert.ok(
        result.secondaryPath === null ||
          ["family", "small-claims", "civil"].includes(result.secondaryPath),
        `${testCase.id}: unexpected secondaryPath ${String(result.secondaryPath)}`,
      );
      assert.ok(
        result.confidence >= 0 && result.confidence <= 1,
        `${testCase.id}: confidence out of range`,
      );
      assert.ok(
        result.secondaryPath !== result.primaryPath,
        `${testCase.id}: secondaryPath duplicates primaryPath`,
      );
      assert.equal(
        typeof result.reasoning,
        "string",
        `${testCase.id}: reasoning must be a string`,
      );
      checks += 1;

      // Cost control: an unambiguous short story that agrees with the declared
      // path must never reach the network.
      if (
        testCase.expectNoEscalation &&
        (variant.declared === null ||
          variant.declared === testCase.expectKeywordPrimary)
      ) {
        assert.equal(
          result.source,
          "keyword",
          `${testCase.id} (${variant.label}): expected no escalation, got source=${result.source}`,
        );
        assert.equal(result.aiCalled, false);
        checks += 1;
      }

      // A detected cross-area conflict is terminal: never pay the model for it,
      // whatever the user declared.
      if (testCase.expectAlwaysFree) {
        assert.equal(
          result.source,
          "keyword",
          `${testCase.id} (${variant.label}): expected no model call, got source=${result.source}`,
        );
        assert.equal(result.aiCalled, false);
        assert.equal(
          result.primaryPath,
          testCase.expectKeywordPrimary,
          `${testCase.id} (${variant.label}): expected ${testCase.expectKeywordPrimary}`,
        );
        checks += 3;
      }

      // Ambiguous stories must escalate regardless of declared path.
      if (testCase.expectEscalation) {
        assert.notEqual(
          result.source,
          "keyword",
          `${testCase.id} (${variant.label}): expected escalation, got source=keyword`,
        );
        checks += 1;
      }

      // Live only: once escalated, the model must identify the operative claim
      // rather than the most prominent topic.
      if (LIVE_AI && testCase.expectAiPrimary) {
        assert.equal(
          result.source,
          "ai",
          `${testCase.id} (${variant.label}): expected a model result`,
        );
        assert.equal(
          result.primaryPath,
          testCase.expectAiPrimary,
          `${testCase.id} (${variant.label}): model must return ${testCase.expectAiPrimary}, got ${result.primaryPath}`,
        );
        checks += 2;
      }

      // Offline, an escalated case falls back to the keyword verdict, so the
      // keyword stage's own answer is observable and assertable.
      if (!LIVE_AI && testCase.expectKeywordPrimary) {
        assert.equal(
          result.primaryPath,
          testCase.expectKeywordPrimary,
          `${testCase.id} (${variant.label}): keyword stage expected ${testCase.expectKeywordPrimary}`,
        );
        checks += 1;
      }
    }

    console.log("");
  }

  // Empty input must not throw and must not spend anything.
  const empty = await classifyCourtPath({ story: "   " });
  assert.equal(empty.primaryPath, "unknown");
  assert.equal(empty.aiCalled, false);
  checks += 2;

  // Explicit offline switch must be honoured even when a key is present. Uses a
  // story that genuinely escalates: TESTER_STORY now terminates at the keyword
  // stage, so it would never reach the switch.
  const forcedOffline = await classifyCourtPath({
    story:
      "A written agreement required delivery after payment, but delivery never occurred.",
    allowExternalCognition: false,
  });
  assert.equal(forcedOffline.aiCalled, false);
  assert.equal(forcedOffline.source, "ai-unavailable");
  checks += 2;

  console.log("Keyword-stage coverage observations (recorded, not asserted):");
  for (const observation of keywordCoverageObservations) {
    const result = await classifyCourtPath({ story: observation.story });
    console.log(
      `   ${String(result.primaryPath).padEnd(14)}source=${result.source.padEnd(16)}${observation.note}`,
    );
  }
  console.log("");

  // ---- Out-of-scope forum proof (August 2026 audit fix) -------------------
  // Before this fix, a correctly-detected "ltb" keyword area was discarded
  // back to "unknown" by asRoutablePath(), and the AI escalation schema had
  // no out-of-scope option at all -- both funnelled a real tenancy dispute
  // into a false "civil" suggestion. These assert the fix on both the free
  // keyword-only path and the AI-escalated path, using the registry's
  // canonical scenarios rather than ad hoc strings, so the same scenarios a
  // future forum addition tests against are the ones proving this one.
  console.log("Out-of-scope forum scenarios:");
  for (const scenario of classificationScenarios) {
    const result = await classifyCourtPath({
      story: scenario.story,
      declaredCourtPath: scenario.declaredCourtPath,
    });

    if (result.aiCalled) aiCallCount += 1;

    console.log(`   [${scenario.id}] ${describe(result)}`);
    console.log(`      reasoning: ${result.reasoning}`);

    if (scenario.expected.kind === "out-of-scope") {
      const isEscalationScenario = scenario.story.length > 320;

      // A keyword-only scenario (<=320 chars) must resolve correctly on its
      // own, offline or live -- that's the whole point of that half of each
      // forum's pair. An escalation scenario is deliberately written to need
      // the model's understanding, so offline (no key, no model call) it
      // falls back through keywordOnlyResult with no guarantee the keyword
      // stage alone can land on the specific forum -- that's expected, not a
      // bug, and it's asserted for real only when the model actually ran.
      if (!isEscalationScenario || LIVE_AI) {
        assert.equal(
          result.primaryPath,
          "out-of-scope",
          `${scenario.id}: expected out-of-scope, got ${result.primaryPath}`,
        );
        assert.equal(
          result.outOfScopeForum?.id,
          scenario.expected.forum,
          `${scenario.id}: expected forum "${scenario.expected.forum}", got ${result.outOfScopeForum?.id}`,
        );
        assert.ok(
          result.outOfScopeForum?.name && result.outOfScopeForum.name !== result.outOfScopeForum.id,
          `${scenario.id}: forum must carry its full name, not just its id -- no generic "tribunal" bucket`,
        );
        checks += 3;
      }

      if (LIVE_AI && isEscalationScenario) {
        assert.equal(
          result.source,
          "ai",
          `${scenario.id}: this story is long enough that it must have escalated to the model`,
        );
        checks += 1;
      }
    }

    if (scenario.expected.kind === "insufficient-info") {
      // A vague/generic/uninformative story is not evidence of belonging to
      // any specific out-of-scope forum -- it must never resolve to
      // "out-of-scope" regardless of which forum, and confidence must stay
      // low enough that HomeLocationGate's SUGGESTION_CONFIDENCE_FLOOR (0.6)
      // never surfaces a suggestion the story gives no real basis for.
      assert.notEqual(
        result.primaryPath,
        "out-of-scope",
        `${scenario.id}: a vague story must never resolve to out-of-scope (got forum ` +
          `${result.outOfScopeForum?.id}) -- reasoning was: ${result.reasoning}`,
      );
      assert.ok(
        result.confidence < 0.6,
        `${scenario.id}: expected low confidence for a genuinely uninformative story, got ${result.confidence}`,
      );
      checks += 2;
    }
  }
  console.log("");

  // ---- Consistency: identical facts must produce identical routing --------
  // Repeats each out-of-scope scenario CONSISTENCY_RUNS times and flags any
  // run whose primaryPath or forum differs from the first. The keyword-only
  // scenario is trivially deterministic (no network call, so this mostly
  // guards against a future regression), but the AI-escalated one is the
  // real test: temperature is already 0 in the classifier, but that had never
  // been verified empirically against the live model until this check.
  const CONSISTENCY_RUNS = 5;
  console.log(`Consistency check (${CONSISTENCY_RUNS} runs per scenario):`);
  for (const scenario of classificationScenarios) {
    const runs: CourtPathClassification[] = [];
    for (let i = 0; i < CONSISTENCY_RUNS; i += 1) {
      const result = await classifyCourtPath({
        story: scenario.story,
        declaredCourtPath: scenario.declaredCourtPath,
      });
      if (result.aiCalled) aiCallCount += 1;
      runs.push(result);
    }

    const [first, ...rest] = runs;
    const varying = rest.filter(
      (run) => run.primaryPath !== first.primaryPath || run.outOfScopeForum?.id !== first.outOfScopeForum?.id,
    );

    console.log(
      `   [${scenario.id}] ${runs.map((run) => run.outOfScopeForum?.id || run.primaryPath).join(", ")}` +
        (varying.length > 0 ? "  <-- VARIED" : "  (stable)"),
    );

    assert.equal(
      varying.length,
      0,
      `${scenario.id}: routing varied across ${CONSISTENCY_RUNS} identical runs -- ` +
        `saw ${JSON.stringify(runs.map((run) => run.outOfScopeForum?.id || run.primaryPath))}`,
    );
    checks += 1;
  }
  console.log("");


  // ---- WSIAT requires a work connection -----------------------------------
  //
  // THE FAILURE THIS EXISTS TO CATCH, in the words that caused it:
  //
  //   "I slipped on the sidewalk outside the library on Elgin Street on
  //    February 3rd. It was solid ice, nobody had salted it. I broke my wrist
  //    and I'm off work. The city owns that sidewalk."
  //
  // Classified out-of-scope wsiat at 0.9 confidence, reasoning "a workplace
  // injury due to slipping on ice". It is a municipal non-repair claim carrying
  // a TEN-DAY notice deadline under Municipal Act s. 44 (10), and the person was
  // turned away from the platform. Turning away a claim-barring stage is the
  // worst outcome this product has.
  //
  // The prompt already said an injury away from work is not wsiat. It was
  // ignored, because "I'm off work" reads as a work connection while describing
  // a consequence. So the refusal is in code, and it is not a keyword patch:
  // WSIA s. 123 (1) gives the tribunal jurisdiction over appeals from decisions
  // of the Board on entitlement under the insurance plan, which presupposes a
  // worker and a Board claim.
  //
  // *** WHY THESE DRIVE coerceModelPayload AND NOT classifyCourtPath ***
  //
  // The first version of this block called classifyCourtPath offline and
  // asserted the forum was not wsiat. It passed. It ALSO passed with the
  // refusal deleted, because the keyword pass never called these stories wsiat
  // to begin with — "forum=none" was the check testing nothing, and it took a
  // mutation run to notice. The bug was on the AI path, so the payload the model
  // actually returned is what goes in here.
  console.log("WSIAT coherence — an injury is not a workplace injury:");

  /** The payload the model returned on the day this broke. */
  const wsiatPayload = {
    primaryPath: "out-of-scope",
    secondaryPath: null,
    outOfScopeForum: "wsiat",
    confidence: 0.9,
    reasoning: "The story describes a workplace injury due to slipping on ice.",
  } as const;

  const noWorkConnection = [
    {
      id: "icy-municipal-sidewalk",
      story:
        "I slipped on the sidewalk outside the library on Elgin Street on February 3rd. " +
        "It was solid ice, nobody had salted it. I broke my wrist and I'm off work. " +
        "The city owns that sidewalk. It's now February 20th.",
      why: "municipal non-repair, 10-day notice under Municipal Act s. 44 (10)",
    },
    {
      id: "fall-in-a-shop",
      story:
        "I fell in the entrance of a grocery store because the floor was wet and there was " +
        "no sign. I hurt my back and I have been unable to work since.",
      why: "an occupier's premises — 'unable to work' is a consequence, not a workplace",
    },
    {
      id: "injury-that-cost-wages",
      story:
        "A cyclist hit me on the path and I broke my arm. I have missed work for three weeks " +
        "and want the cost of my treatment and lost pay.",
      why: "lost wages are a HEAD OF DAMAGES, not a work connection",
    },
  ];

  for (const story of noWorkConnection) {
    const coerced = coerceModelPayload(wsiatPayload, "unknown", story.story);
    assert.notEqual(
      coerced.primaryPath,
      "out-of-scope",
      `[${story.id}] a WSIAT payload was accepted on a story with no work connection — ${story.why}`,
    );
    assert.equal(coerced.outOfScopeForum, null, `[${story.id}] must carry no forum`);
    // The model's justification for the refused conclusion must not survive it.
    assert.ok(
      !coerced.reasoning.includes("workplace injury due to slipping"),
      `[${story.id}] kept the model's reasoning for a conclusion that was refused`,
    );
    checks += 3;
    console.log(`   [${story.id}] refused -> ${coerced.primaryPath}   ${story.why}`);
  }

  /*
   * And the other direction, which is what stops this from being a check that
   * simply disables wsiat. The same payload, on a story with a real work
   * connection, must still be accepted — otherwise the refusal has quietly
   * become a deletion.
   */
  const realWorkplaceInjury = coerceModelPayload(
    wsiatPayload,
    "unknown",
    "I was injured at work when a pallet fell on me during my shift. My employer reported " +
      "it and WSIB has denied my claim for benefits. I want to appeal that decision.",
  );
  assert.equal(
    realWorkplaceInjury.outOfScopeForum?.id,
    "wsiat",
    "a genuine workplace injury with a WSIB claim must still reach WSIAT — otherwise the " +
      "coherence check has turned into a way of never saying wsiat at all",
  );
  checks += 1;
  console.log("   [real-workplace-injury] accepted, as it must be");

  // And the end-to-end path stays in scope, offline, so the classifier as a
  // whole cannot regress even if the refusal moves.
  const icyEndToEnd = await classifyCourtPath({
    story: noWorkConnection[0].story,
    allowExternalCognition: false,
  });
  assert.notEqual(icyEndToEnd.primaryPath, "out-of-scope");
  checks += 1;
  console.log(`   [icy-municipal-sidewalk end to end] ${icyEndToEnd.primaryPath}`);
  console.log("");

  const expectedCalls = LIVE_AI ? aiCallCount : 0;
  assert.equal(
    aiCallCount,
    expectedCalls,
    `Offline run must make zero model calls, made ${aiCallCount}`,
  );

  // 2026-09-28, story review battery: the Small Claims / civil line is the
  // $50,000 limit (CJA s. 23 (1), O. Reg. 626/00 s. 1 (1)). A keyword answer
  // that a stated amount contradicts must reach the model, never stand alone.
  assert.deepEqual(statedDollarAmounts("paid $185,000, quoted $140,000, a $2k deposit, $1,100.50"), [185000, 140000, 2000, 1100.5]);
  const overLimit = await classifyCourtPath({
    // The story review battery's CV1, verbatim: the keyword pass calls it
    // small-claims.
    story:
      "We paid a general contractor $185,000 to build an addition on our house in Ottawa. The work " +
      "stopped in March with the roof unfinished and water has been coming in since. Another builder " +
      "quoted $140,000 to fix and finish it. The contractor has stopped responding and we think they have " +
      "gone out of business.",
    allowExternalCognition: false,
  });
  assert.notEqual(overLimit.source, "keyword", `an over-limit amount must escalate, got ${describe(overLimit)}`);
  assert.match(overLimit.reasoning, /50,000/);

  console.log(
    `Court path classifier verification passed: ${cases.length} stories x ${declaredVariants.length} declared variants, ` +
      `${checks} assertions, ${aiCallCount} model call(s), ` +
      `${cases.filter((c) => c.expectNoEscalation).length} control stories confirmed free.`,
  );
}

main().catch((error) => {
  console.error(
    "Court path classifier verification failed.",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
