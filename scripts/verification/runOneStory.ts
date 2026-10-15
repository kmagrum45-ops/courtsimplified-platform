/**
 * Runs ONE Small Claims story through the real pipeline, interactively, so
 * you can read exactly what the site would extract and say for that one
 * case -- nothing averaged across a batch, nothing from another scenario
 * mixed in.
 *
 * Owner request, 2026-10-14: "run scenarios one at a time and just look at
 * the output and make sure it's exact and does not give information not
 * for the case at hand." The existing harnesses (test:fixtures,
 * test:case-reviews) already run real, billed scenarios through the real
 * pipeline, but only a fixed batch of pre-written ones with pre-scripted
 * answers -- there was no way to hand it a story typed right now and read
 * it back, alone, in the terminal.
 *
 * This reuses the exact same real functions test:fixtures does (see
 * fixtures/pipelineRunner.ts's header comment for why that matters):
 *   1. orchestrateIntakeTurn() -- the same turn-by-turn function
 *      GuidedSmallClaimsIntake.tsx calls for every real user.
 *   2. mapGuidedIntakeToSmallClaimsInput() -- the same mapping
 *      builder/page.tsx's handleGuidedComplete() calls.
 *   3. analyzeSmallClaimsWithBrain(input, {allowExternalCognition: true}) --
 *      the exact function /api/small-claims/analyze/route.ts calls.
 * Nothing here is reimplemented or approximated.
 *
 * SCOPE: Small Claims only, and intake + the final analysis engine only --
 * it does NOT render the "Next step" card (forms, fees, the courthouse,
 * deadlines). That card is produced by a separate layer (case-stage
 * resolution from confirmed events, the deadline engine, practicalFor) that
 * lives on top of a SAVED case, not a one-off story; reimplementing it here
 * as a second copy is exactly the kind of duplicated procedure logic
 * CLAUDE.md s. 2a forbids. To see the Next Step card for a real case, run it
 * through the actual app (or npm run test:case-reviews, which does drive a
 * full saved case through to that card for its 10 fixed scenarios).
 *
 * Real, billed OpenAI calls -- same as test:fixtures. Prints to the
 * terminal only; writes nothing to disk, commits nothing, and this story
 * never becomes a fixture unless you choose to save it as one.
 *
 * Run: node --import tsx --env-file=.env.local scripts/verification/runOneStory.ts
 * (wired as `npm run test:one-story`; it will then prompt for the story and
 * each answer interactively)
 */

import { createInterface } from "node:readline/promises";

import { orchestrateIntakeTurn } from "../../src/lib/case-system/intake/orchestrateIntakeTurn";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import type { IntakeFacts } from "../../src/lib/case-system/intake/selectQuestions";
import { analyzeSmallClaimsWithBrain } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { mapGuidedIntakeToSmallClaimsInput } from "../../app/builder/_components/guidedIntakeToSmallClaimsInput";
import type { GuidedIntakeCompletionResult } from "../../app/builder/_components/GuidedSmallClaimsIntake";
import { assertNotProduction } from "../db/assertNotProduction";

const MAX_TURNS = QUESTION_BANK.length + 5;

function line(char = "-"): void {
  console.log(char.repeat(70));
}

async function main() {
  assertNotProduction("test:one-story");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set -- run with --env-file=.env.local");
    process.exitCode = 1;
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    line("=");
    console.log("One real Small Claims story, run through the real pipeline.");
    console.log("Type the story a real user would type, then answer each question");
    console.log("as they would. Ctrl+C to stop at any point.");
    line("=");

    const city = (await rl.question("\nCity (e.g. Ottawa): ")).trim();
    const story = (await rl.question("\nOpening story: ")).trim();
    if (!story) {
      console.error("No story given -- nothing to run.");
      process.exitCode = 1;
      return;
    }

    let facts: IntakeFacts = {};
    let answeredIds: string[] = [];
    let turnCount = 0;

    let result = await orchestrateIntakeTurn(facts, answeredIds, story, apiKey, QUESTION_BANK, CLAIM_TYPES);
    facts = result.facts;
    report(0, null, result);

    while (!result.halted && !result.intakeComplete && result.nextQuestion && turnCount < MAX_TURNS) {
      const question = result.nextQuestion;
      answeredIds = [...answeredIds, question.id];
      const shownText = result.voiceTurn?.questionText || question.text;
      const shownLeadIn = result.voiceTurn?.leadIn ?? null;

      line();
      if (shownLeadIn) console.log(shownLeadIn);
      console.log(shownText);
      const answer = (await rl.question("> ")).trim();

      result = await orchestrateIntakeTurn(facts, answeredIds, answer, apiKey, QUESTION_BANK, CLAIM_TYPES, "small-claims", question.id);
      facts = result.facts;
      turnCount += 1;
      report(turnCount, question.id, result);
    }

    line("=");
    if (result.halted) {
      console.log(`Conversation halted: ${result.haltMessage}`);
      return;
    }
    if (!result.intakeComplete) {
      console.log(`Stopped after ${turnCount} turns without completing (MAX_TURNS=${MAX_TURNS}). That is itself worth noticing.`);
      return;
    }
    console.log("Intake complete. Running the real final analysis...");
    line("=");

    const completionResult: GuidedIntakeCompletionResult = {
      facts: facts as GuidedIntakeCompletionResult["facts"],
      answeredIds,
      matchedClaimType: result.matchedClaimTypes[0]?.claimType
        ? { claimTypeId: result.matchedClaimTypes[0].claimType.id, claimTypeName: result.matchedClaimTypes[0].claimType.name }
        : null,
    };
    const mappedInput = mapGuidedIntakeToSmallClaimsInput(completionResult, { province: "Ontario", city }, story);
    const analysisOutput = await analyzeSmallClaimsWithBrain(mappedInput, { allowExternalCognition: true });
    const a = analysisOutput.analysis;

    console.log(`detectedClaimTypes: ${JSON.stringify(a.detectedClaimTypes)}`);
    console.log(`detectedIssues: ${JSON.stringify(a.detectedIssues)}`);
    console.log(`missingInformation: ${JSON.stringify(a.missingInformation)}`);
    console.log(`userWarnings: ${JSON.stringify(a.userWarnings)}`);
    console.log(`proceduralRisks: ${JSON.stringify(a.proceduralRisks)}`);
    console.log(`guidance: ${JSON.stringify(a.guidance)}`);
    console.log(`nextBestActions: ${JSON.stringify(a.nextBestActions)}`);
    console.log(`appliedLaw: ${JSON.stringify((a.appliedLaw ?? []).map((item) => item.citation || item.label))}`);
    line("=");
    console.log("Final facts:", JSON.stringify(facts, null, 2));
  } finally {
    rl.close();
  }
}

function report(
  turnNumber: number,
  questionId: string | null,
  r: Awaited<ReturnType<typeof orchestrateIntakeTurn>>,
): void {
  const match = r.matchedClaimTypes[0]?.claimType;
  console.log(
    `  [turn ${turnNumber}${questionId ? ` / ${questionId}` : ""}] matched claim type: ${match ? `${match.id} (${match.name})` : "(none yet)"}` +
      (r.suggestedClaimType ? ` | AI suggestion: ${r.suggestedClaimType.claimTypeId}` : ""),
  );
  if (r.evidenceGuidance?.categories.length) {
    console.log(`  evidence guidance: ${r.evidenceGuidance.categories.map((c) => c.name).join(", ")}`);
  }
  if (r.possibleCorrections.length) {
    console.log(`  possible corrections: ${r.possibleCorrections.map((c) => `${c.field}: ${JSON.stringify(c.oldValue)} -> ${JSON.stringify(c.newValue)}`).join("; ")}`);
  }
}

void main().catch((error: unknown) => {
  console.error("runOneStory threw:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
