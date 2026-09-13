/**
 * Eight live stories through the full Small Claims pipeline: general intake ->
 * claim-type confirmation -> depth phase -> readiness gate.
 *
 * Runs ONE story per invocation (--story=N) so a systemic failure is caught at
 * ~35 requests rather than ~290.
 *
 * COVERAGE. The four paraphrase stories reached three claim types. This batch
 * reaches eight, and deliberately includes four with NO authored depth
 * questions, because 18 of 22 claim types are in that state and the
 * degrade-to-attestation path has only ever been checked offline.
 *
 * Cost per story, derived from orchestrateIntakeTurn.ts:
 *   safety      1 x ~11 turns = 11
 *   extraction  1 x ~11 turns = 11
 *   voice       1 x ~10 turns = 10
 *   classifier  1 (opening turn only, and only if no exact match)
 *   brain       1
 *   depth       2 per asked question (0 when nothing is authored)
 *   -------------------------------------------------------------
 *               ~34-40
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { runStoryThroughPipeline, type PipelineStoryInput } from "./fixtures/pipelineRunner";
import {
  PIPELINE_JOURNEY_TIMEOUT_MS,
  withTimeout,
  describeRunDegradation,
  abortIfRateLimited,
  RateLimitAbort,
} from "./pipelineGuards";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { resolveClaimTypeSuggestion } from "../../src/lib/case-system/intake/claimTypeSuggestionResolution";
import { selectDepthQuestions } from "../../src/lib/case-system/intake/depth/selectDepthQuestions";
import { orchestrateDepthTurn } from "../../src/lib/case-system/intake/depth/orchestrateDepthTurn";
import { recordCannotProvide, type ElementStateMap } from "../../src/lib/case-system/intake/depth/elementStateMap";
import { evaluateReadinessGate } from "../../src/lib/case-system/readiness/readinessGate";
import { STORIES } from "./liveStoryBatchStories";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(REPO_ROOT, "scripts", "verification", "fixtures", "liveStories");

/**
 * Phrases that assert something about what the USER said or has. Any of these
 * reaching the screen is a CLAUDE.md section 4 problem: the site characterising
 * the user's file rather than recording it. The "already mentioned" line that
 * prompted this scan was removed in 812a076; this catches a recurrence or a
 * sibling elsewhere.
 */
const ASSERTION_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "already mentioned", pattern: /already (mentioned|provided|told us|shared|covered)/i },
  { label: "you already have", pattern: /you (already have|'ve already|have already)/i },
  { label: "hasn't come up yet", pattern: /hasn'?t come up yet/i },
  { label: "based on what you said", pattern: /based on what you (said|told|shared)/i },
  { label: "you said / you stated", pattern: /you (said|stated|indicated|confirmed)/i },
];

/**
 * Questions are not assertions.
 *
 * The first version of this scan flagged "What evidence do you have to support
 * your claim?" -- an interrogative, not a claim about the user's file. A scan
 * that cries wolf on every story is worse than no scan, so interrogatives are
 * excluded before the patterns run.
 */
function isInterrogative(text: string): boolean {
  return text.trim().endsWith("?");
}

function arg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

async function main(): Promise<void> {
  const index = Number(arg("story", "1")) - 1;
  const dryRun = process.argv.includes("--dry-run");
  const story = STORIES[index];

  if (!story) {
    console.error(`No story ${index + 1}. Valid: 1..${STORIES.length}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Story ${index + 1}/${STORIES.length}: ${story.id}`);
  console.log(`Testing: ${story.note}`);
  console.log(`Estimated cost: ~34-40 requests\n`);
  if (dryRun) return console.log("--dry-run: stopping before any billed call.");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set — run with --env-file=.env.local");
    process.exitCode = 1;
    return;
  }

  const lines: string[] = [];
  const say = (s: string) => {
    console.log(s);
    lines.push(s);
  };

  const run = await withTimeout(
    runStoryThroughPipeline(story as PipelineStoryInput, apiKey),
    PIPELINE_JOURNEY_TIMEOUT_MS,
  );

  const degraded = describeRunDegradation(run);
  if (degraded) {
    say(`DEGRADED — not recording: ${degraded}`);
    writeOut(story.id, lines);
    process.exitCode = 1;
    return;
  }

  say(`# ${story.id}`);
  say(`\n**Testing:** ${story.note}`);
  say(`\n**Story as written:**\n\n> ${story.story}`);

  // ---- Claim type ----
  const matchedId = run.retainedMatchedClaimType?.claimTypeId;
  const suggested = run.retainedSuggestedClaimType;

  say(`\n## Claim type\n`);
  say(`- exact matchClaimType: ${matchedId ?? "(none)"}`);
  say(`- AI suggestion: ${suggested ? `${suggested.claimTypeId} (${suggested.claimTypeName})` : "(none — classifier returned nothing)"}`);

  let claimTypeId = matchedId;
  let via = matchedId ? "exact-match" : "none";

  if (!claimTypeId && suggested) {
    const resolution = await withTimeout(
      resolveClaimTypeSuggestion("confirm", story.story, CLAIM_TYPES, run.finalFacts, apiKey, suggested.claimTypeId),
      PIPELINE_JOURNEY_TIMEOUT_MS,
    );
    say(`- confirmation outcome: **${resolution.outcome}**`);
    if (resolution.outcome === "confirmed") {
      claimTypeId = resolution.claimType.claimTypeId;
      via = "confirmed-suggestion";
    }
  } else if (!claimTypeId) {
    say(`- confirmation: not attempted (nothing to confirm)`);
  } else {
    say(`- confirmation: not needed (exact match)`);
  }

  say(`- **established: ${claimTypeId ?? "(none)"} via ${via}**`);
  if (story.expectedClaimTypeId) {
    say(`- expected: ${story.expectedClaimTypeId} — ${claimTypeId === story.expectedClaimTypeId ? "MATCH" : "**DIFFERENT**"}`);
  }

  // ---- Questions asked, in order, as shown ----
  say(`\n## Questions asked, in order (general intake)\n`);
  const shown: string[] = [];
  run.turns.forEach((turn, i) => {
    if (!turn.questionAsked) {
      say(`${i + 1}. _(opening story — no question)_`);
      return;
    }
    say(`${i + 1}. **[general intake]** \`${turn.questionAsked}\``);
    if (turn.leadInShown) {
      say(`   - lead-in (model-authored): "${turn.leadInShown}"`);
      shown.push(turn.leadInShown);
    }
    say(`   - question shown: "${turn.questionTextShown}"`);
    if (turn.questionTextShown) shown.push(turn.questionTextShown);
    say(`   - answered: "${turn.answerGiven}"`);
  });

  const claimType = CLAIM_TYPES.find((ct) => ct.id === claimTypeId);
  let stateMap: ElementStateMap = {};
  let gateSummary = "not evaluated — no claim type established";

  if (claimType) {
    const userTexts = [
      story.story,
      ...["amountClaimedText", "timelineText", "evidenceText", "remedySoughtText", "serviceDetailsText"]
        .map((f) => run.finalFacts[f as keyof typeof run.finalFacts])
        .filter((v): v is string => typeof v === "string"),
    ];

    const selection = selectDepthQuestions({
      elements: claimType.plaintiffElements,
      userTexts,
      slotValues: story.slotValues,
    });
    stateMap = selection.stateMap;

    say(`\n## Depth phase\n`);
    say(`- authored & asked: ${selection.asked.length}`);
    say(`- unauthored (attestation only): ${selection.unauthored.length}${selection.unauthored.length ? ` — ${selection.unauthored.join(", ")}` : ""}`);
    say(`- noQuestionNeeded: ${selection.noQuestionNeeded.length}${selection.noQuestionNeeded.length ? ` — ${selection.noQuestionNeeded.join(", ")}` : ""}`);

    say(`\n### Depth questions asked\n`);
    if (!selection.asked.length) say(`_None._`);

    for (let i = 0; i < selection.asked.length; i += 1) {
      const asked = selection.asked[i];
      const next = selection.asked[i + 1];
      const answer = story.depthAnswers[asked.question.id] || story.fallbackDepthAnswer;

      const turn = await withTimeout(
        orchestrateDepthTurn({
          answeredQuestion: asked,
          answerText: answer,
          stateMap,
          nextQuestion: next,
          apiKey,
          facts: run.finalFacts as Record<string, string | number | boolean>,
        }),
        PIPELINE_JOURNEY_TIMEOUT_MS,
      );
      stateMap = turn.stateMap;

      say(`- **[depth]** \`${asked.question.id}\` -> \`${asked.elementId}\``);
      say(`  - spec text: "${asked.question.text}"`);
      say(`  - shown: "${asked.renderedText}"`);
      say(`  - slots defaulted: ${asked.defaultedSlots.join(", ") || "(none)"}`);
      say(`  - answered: "${answer}"`);
      say(`  - -> state: **${stateMap[asked.elementId].state}**${turn.resolvedAsCannotProvide ? " (I-don't-know resolved)" : ""}`);
      shown.push(asked.renderedText);
      if (turn.leadIn) shown.push(turn.leadIn);
    }

    // ---- Element state map ----
    say(`\n## Final element state map\n`);
    for (const record of Object.values(stateMap)) {
      say(`- \`${record.state}\` — ${record.elementId}${record.providedVia ? ` (via ${record.providedVia})` : ""}`);
    }

    // ---- Readiness gate ----
    const remedyId = claimType.remedies[0] || null;
    const gate = evaluateReadinessGate({
      claimType,
      elementStateMap: stateMap,
      confirmedRemedyId: remedyId,
      storyText: story.story,
    });

    say(`\n## Readiness gate\n`);
    say(`- remedy confirmed (simulated): ${remedyId ?? "(none)"}`);
    say(`- **draftAvailable: ${gate.draftAvailable}**`);
    say(`- outstanding: ${gate.outstandingCount} of ${gate.totalElements}`);
    say(`- cannot-provide: ${gate.cannotProvide.length}`);
    if (gate.blockers.length) {
      say(`- blockers:`);
      for (const b of gate.blockers) say(`  - ${b.kind}${"elementIds" in b ? `: ${b.elementIds.join(", ")}` : ""}`);
    }
    gateSummary = gate.draftAvailable
      ? "OPEN (before attestation)"
      : `HELD on ${gate.blockers.map((b) => b.kind).join(", ")}`;

    // ---- Attestation, simulated ----
    //
    // What the Statement of Claim surface's "I don't have this" button does:
    // records cannot-provide for an outstanding element. Without this the
    // harness stops one screen short of the answer, and for the 18 of 22 claim
    // types with no authored depth questions EVERY element stays not-yet --
    // which reports as "gate held" and proves nothing.
    //
    // This user said "I don't know" to everything, so attesting "I don't have
    // this" on each outstanding element is what they would actually do.
    if (!gate.draftAvailable && gate.outstanding.length > 0) {
      say(`\n### Attestation, simulated ("I don't have this" on each outstanding element)\n`);
      for (const element of gate.outstanding) {
        stateMap = recordCannotProvide(stateMap, {
          elementId: element.elementId,
          questionId: `attestation:${element.elementId}`,
        });
        say(`- ${element.elementId} -> cannot-provide`);
      }

      const after = evaluateReadinessGate({
        claimType,
        elementStateMap: stateMap,
        confirmedRemedyId: remedyId,
        storyText: story.story,
      });

      say(`\n- **draftAvailable after attestation: ${after.draftAvailable}**`);
      say(`- outstanding: ${after.outstandingCount} | cannot-provide: ${after.cannotProvide.length}`);
      if (after.blockers.length) {
        for (const b of after.blockers) say(`  - still blocked: ${b.kind}`);
      }
      gateSummary = after.draftAvailable
        ? "OPEN after attestation"
        : `STILL HELD after attestation on ${after.blockers.map((b) => b.kind).join(", ")}`;
    }
  }

  // ---- Assertion scan ----
  say(`\n## Assertions about what the user said\n`);
  const hits: string[] = [];
  for (const text of shown) {
    if (isInterrogative(text)) continue;
    for (const { label, pattern } of ASSERTION_PATTERNS) {
      if (pattern.test(text)) hits.push(`[${label}] "${text.slice(0, 140)}"`);
    }
  }
  if (!hits.length) say(`_None found._`);
  for (const hit of hits) say(`- ⚠️ ${hit}`);

  say(`\n## Summary\n`);
  say(`- claim type: ${claimTypeId ?? "(none)"} via ${via}`);
  say(`- turns: ${run.turns.length} | gate: ${gateSummary} | assertion hits: ${hits.length}`);

  writeOut(story.id, lines);
}

function writeOut(id: string, lines: string[]): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, `${id}.md`);
  fs.writeFileSync(out, lines.join("\n") + "\n", "utf8");
  console.log(`\nWrote ${path.relative(REPO_ROOT, out)}`);
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) {
  void main().catch((error: unknown) => {
    if (error instanceof RateLimitAbort) {
      console.error(`\n${error.message}`);
    } else {
      try {
        abortIfRateLimited(error, "live story");
      } catch (rateError) {
        console.error(`\n${(rateError as Error).message}`);
        process.exitCode = 1;
        return;
      }
      console.error("Story threw:", error instanceof Error ? error.message : error);
    }
    process.exitCode = 1;
  });
}
