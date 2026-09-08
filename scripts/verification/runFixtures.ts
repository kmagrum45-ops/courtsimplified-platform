/**
 * Session 35 -- runs the three whole-case fixtures in fixtures/ through the
 * REAL pipeline the app uses, end to end, and writes what actually happened
 * to fixtures/<id>.actual.md. Not a reconstruction: every call below is the
 * exact function the live app calls.
 *
 *   1. orchestrateIntakeTurn() -- the same function GuidedSmallClaimsIntake.tsx's
 *      sendTurn() calls (via /api/intake/guided-turn), called directly here
 *      the same way every proofs/ script in this codebase already does,
 *      turn by turn: opening story, then whatever question the real
 *      selectQuestions()/appliesWhen logic actually asks next, answered
 *      from the fixture's answers map (not a pre-scripted order -- the
 *      fixture doesn't know the order in advance either).
 *   2. mapGuidedIntakeToSmallClaimsInput() -- the exact function
 *      builder/page.tsx's handleGuidedComplete() calls once intake
 *      completes (see commit ef2daeb), unmodified.
 *   3. analyzeSmallClaimsWithBrain(input, {allowExternalCognition: true}) --
 *      the exact server-side function /api/small-claims/analyze/route.ts
 *      calls internally (see commit 0d07689's requestSmallClaimsAnalysis
 *      wiring), called directly here instead of through the HTTP+auth
 *      wrapper, the same way this codebase's own proof scripts already
 *      bypass that wrapper -- the auth/HTTP layer isn't the pipeline, it's
 *      a thin wrapper around it.
 *
 * Real, billed OpenAI calls throughout (safety pass + extraction + voice
 * layer per turn with new text, the full structured-ai brain analysis at
 * the end) -- this is deliberate; the whole point of this harness is
 * testing the real pipeline, not a stub of it.
 *
 * Run: node --import tsx --env-file=.env.local scripts/verification/runFixtures.ts
 * (wired as `npm run test:fixtures`)
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import { orchestrateIntakeTurn } from "../../src/lib/case-system/intake/orchestrateIntakeTurn";
import { QUESTION_BANK, type IntakeQuestion } from "../../src/lib/case-system/intake/questionBank";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import type { IntakeFacts } from "../../src/lib/case-system/intake/selectQuestions";
import { analyzeSmallClaimsWithBrain } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { mapGuidedIntakeToSmallClaimsInput } from "../../app/builder/_components/guidedIntakeToSmallClaimsInput";
import type { GuidedIntakeCompletionResult } from "../../app/builder/_components/GuidedSmallClaimsIntake";

import type { Fixture } from "./fixtures/fixtureTypes";
import { unpaidInvoiceCleanFixture } from "./fixtures/unpaidInvoiceClean.fixture";
import { unpaidInvoiceGapFixture } from "./fixtures/unpaidInvoiceGap.fixture";
import { overLimitContractFixture } from "./fixtures/overLimitContract.fixture";

const FIXTURES: Fixture[] = [unpaidInvoiceCleanFixture, unpaidInvoiceGapFixture, overLimitContractFixture];
const MAX_TURNS = 20; // safety cap -- QUESTION_BANK has 15 entries, so 20 is generous headroom.

type TurnLog = {
  questionAsked: string | null;
  answerGiven: string | null;
  matchedClaimTypeThisTurn: string | null;
  evidenceGuidanceThisTurn: { addressed: string[]; unaddressed: string[] } | null;
  factsAfter: IntakeFacts;
  possibleCorrections: string[];
};

type RetainedMatch = { claimTypeId: string; claimTypeName: string };

type FixtureRun = {
  fixture: Fixture;
  turns: TurnLog[];
  halted: boolean;
  haltMessage: string;
  intakeComplete: boolean;
  finalFacts: IntakeFacts;
  finalAnsweredIds: string[];
  retainedMatchedClaimType: RetainedMatch | null;
  mappedInput: ReturnType<typeof mapGuidedIntakeToSmallClaimsInput> | null;
  analysisOutput: Awaited<ReturnType<typeof analyzeSmallClaimsWithBrain>> | null;
};

async function runFixture(fixture: Fixture, apiKey: string): Promise<FixtureRun> {
  let facts: IntakeFacts = {};
  let answeredIds: string[] = [];
  let retainedMatchedClaimType: RetainedMatch | null = null;
  const turns: TurnLog[] = [];
  let halted = false;
  let haltMessage = "";
  let intakeComplete = false;

  // --- Turn 1: opening story ---
  let result = await orchestrateIntakeTurn(facts, answeredIds, fixture.story, apiKey, QUESTION_BANK, CLAIM_TYPES);
  facts = result.facts;
  recordTurn(null, fixture.story, result);

  let turnCount = 0;
  while (!halted && !intakeComplete && result.nextQuestion && turnCount < MAX_TURNS) {
    const question: IntakeQuestion = result.nextQuestion;
    answeredIds = [...answeredIds, question.id];
    const answerText = fixture.answers[question.id];
    if (answerText === undefined) {
      throw new Error(`Fixture "${fixture.id}" has no answer for question id "${question.id}" -- fixture is incomplete.`);
    }

    result = await orchestrateIntakeTurn(
      facts,
      answeredIds,
      answerText,
      apiKey,
      QUESTION_BANK,
      CLAIM_TYPES,
      "small-claims",
      question.id,
    );
    facts = result.facts;
    recordTurn(question.id, answerText, result);
    turnCount += 1;
  }

  function recordTurn(questionId: string | null, answerText: string | null, r: Awaited<ReturnType<typeof orchestrateIntakeTurn>>) {
    if (r.halted) {
      halted = true;
      haltMessage = r.haltMessage || "";
    }
    if (r.intakeComplete) intakeComplete = true;
    const freshMatch = r.matchedClaimTypes[0]?.claimType;
    if (freshMatch) retainedMatchedClaimType = { claimTypeId: freshMatch.id, claimTypeName: freshMatch.name };
    turns.push({
      questionAsked: questionId,
      answerGiven: answerText,
      matchedClaimTypeThisTurn: freshMatch ? `${freshMatch.id} (${freshMatch.name})` : null,
      evidenceGuidanceThisTurn: r.evidenceGuidance
        ? {
            addressed: r.evidenceGuidance.addressedCategories.map((c) => c.name),
            unaddressed: r.evidenceGuidance.unaddressedCategories.map((c) => c.name),
          }
        : null,
      factsAfter: r.facts,
      possibleCorrections: r.possibleCorrections.map((c) => `${c.field}: ${JSON.stringify(c.oldValue)} -> ${JSON.stringify(c.newValue)}`),
    });
  }

  const completionResult: GuidedIntakeCompletionResult = {
    facts: facts as GuidedIntakeCompletionResult["facts"],
    answeredIds,
    matchedClaimType: retainedMatchedClaimType,
  };

  const mappedInput = halted
    ? null
    : mapGuidedIntakeToSmallClaimsInput(completionResult, fixture.location, fixture.story);

  const analysisOutput = mappedInput
    ? await analyzeSmallClaimsWithBrain(mappedInput, { allowExternalCognition: true })
    : null;

  return {
    fixture,
    turns,
    halted,
    haltMessage,
    intakeComplete,
    finalFacts: facts,
    finalAnsweredIds: answeredIds,
    retainedMatchedClaimType,
    mappedInput,
    analysisOutput,
  };
}

function renderActualMarkdown(run: Awaited<ReturnType<typeof runFixture>>): string {
  const { fixture, turns, halted, haltMessage, intakeComplete, finalFacts, retainedMatchedClaimType, mappedInput, analysisOutput } = run;
  const lines: string[] = [];
  const push = (s: string) => lines.push(s);

  push(`# Actual: ${fixture.id}`);
  push("");
  push(`Generated by \`npm run test:fixtures\` against the real pipeline. Not hand-edited.`);
  push("");
  push(`## Conversation`);
  push("");
  push(`halted: ${halted}${halted ? ` -- ${haltMessage}` : ""}`);
  push(`intakeComplete: ${intakeComplete}`);
  push(`turns run: ${turns.length}`);
  push("");
  push(`| # | question asked | matched claim type this turn | evidenceGuidance this turn |`);
  push(`|---|---|---|---|`);
  turns.forEach((t, i) => {
    push(
      `| ${i + 1} | ${t.questionAsked ?? "(opening story)"} | ${t.matchedClaimTypeThisTurn ?? "-"} | ${
        t.evidenceGuidanceThisTurn
          ? `addressed: ${t.evidenceGuidanceThisTurn.addressed.join(", ") || "(none)"}; unaddressed: ${t.evidenceGuidanceThisTurn.unaddressed.join(", ") || "(none)"}`
          : "-"
      } |`,
    );
  });
  const corrections = turns.flatMap((t) => t.possibleCorrections);
  if (corrections.length) {
    push("");
    push(`possibleCorrections seen: ${corrections.join("; ")}`);
  }
  push("");
  push(`## Retained matchedClaimType at completion`);
  push("");
  push(retainedMatchedClaimType ? `${retainedMatchedClaimType.claimTypeId} (${retainedMatchedClaimType.claimTypeName})` : "(none)");
  push("");
  push(`## Final facts`);
  push("");
  push("```json");
  push(JSON.stringify(finalFacts, null, 2));
  push("```");

  if (mappedInput) {
    push("");
    push(`## mapGuidedIntakeToSmallClaimsInput() output (fields relevant to this harness)`);
    push("");
    push(`amountClaimed: ${JSON.stringify(mappedInput.amountClaimed)}`);
    push(`timeline: ${JSON.stringify(mappedInput.timeline)}`);
    push(`evidence: ${JSON.stringify(mappedInput.evidence)}`);
    push(`goal: ${JSON.stringify(mappedInput.goal)}`);
    push(`serviceDetails: ${JSON.stringify(mappedInput.serviceDetails)}`);
    push(`issues: ${JSON.stringify(mappedInput.issues)}`);
  }

  if (analysisOutput) {
    const a = analysisOutput.analysis;
    push("");
    push(`## Final AnalysisResult (analyzeSmallClaimsWithBrain, allowExternalCognition: true)`);
    push("");
    push(`detectedIssues: ${JSON.stringify(a.detectedIssues)}`);
    push(`detectedClaimTypes: ${JSON.stringify(a.detectedClaimTypes)}`);
    push(`missingInformation: ${JSON.stringify(a.missingInformation)}`);
    push(`missingEvidence: ${JSON.stringify(a.missingEvidence)}`);
    push(`evidenceWeaknesses: ${JSON.stringify(a.evidenceWeaknesses)}`);
    push(`risksAndGaps: ${JSON.stringify(a.risksAndGaps)}`);
    push(`userWarnings: ${JSON.stringify(a.userWarnings)}`);
    push(`intelligenceWarnings: ${JSON.stringify(a.intelligenceWarnings)}`);
    push(`judgeConcerns: ${JSON.stringify(a.judgeConcerns)}`);
    push(`courtConcerns: ${JSON.stringify(a.courtConcerns)}`);
    push(`proceduralRisks: ${JSON.stringify(a.proceduralRisks)}`);
    push(`nextBestActions: ${JSON.stringify(a.nextBestActions)}`);
    push(`intelligenceSummary: ${JSON.stringify(a.intelligenceSummary)}`);
  } else {
    push("");
    push(`## Final AnalysisResult`);
    push("");
    push(halted ? "Not run -- conversation halted before completion." : "Not run.");
  }

  return lines.join("\n") + "\n";
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set -- run with --env-file=.env.local");
    process.exitCode = 1;
    return;
  }

  for (const fixture of FIXTURES) {
    console.log(`\n${"=".repeat(70)}\nRunning fixture: ${fixture.id}\n${"=".repeat(70)}`);
    const run = await runFixture(fixture, apiKey);
    const markdown = renderActualMarkdown(run);
    const outPath = path.join(__dirname, "fixtures", `${toFileId(fixture.id)}.actual.md`);
    writeFileSync(outPath, markdown, "utf8");
    console.log(`Wrote ${outPath}`);
    console.log(`  turns: ${run.turns.length}, halted: ${run.halted}, matchedClaimType: ${run.retainedMatchedClaimType?.claimTypeId ?? "(none)"}`);
  }
}

/** Fixture ids are kebab-case ("unpaid-invoice-clean"); files are camelCase, matching the .fixture.ts/.expected.md naming already committed. */
function toFileId(fixtureId: string): string {
  return fixtureId.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

main();
