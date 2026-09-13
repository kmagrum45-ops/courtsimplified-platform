/**
 * Four paraphrase-only stories through the real pipeline, then the depth phase.
 *
 * PARAPHRASE-ONLY means each story describes the situation the way a person
 * actually would, without using the vocabulary the matcher or the suppression
 * filter look for. That is the point: a story that happens to contain
 * "contract" and "invoice" would suppress questions trivially and prove
 * nothing about whether the filter reads real language.
 *
 * Runs ONE story per invocation (--story=N) so a wrong question set is caught
 * at ~44 requests rather than ~176.
 *
 * Cost per story, derived not estimated:
 *   general intake   ~11 turns x 3 calls   = ~33
 *   brain analysis                           = 1
 *   depth phase      asked x 2 calls         = 0..10
 *   ------------------------------------------------
 *                                             ~34-44
 *
 * Entrypoint guard per the runFullClaimTypeSurvey.ts incident.
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
import {
  selectDepthQuestions,
  type SelectedDepthQuestion,
} from "../../src/lib/case-system/intake/depth/selectDepthQuestions";
import { orchestrateDepthTurn } from "../../src/lib/case-system/intake/depth/orchestrateDepthTurn";
import type { SlotValues } from "../../src/lib/case-system/intake/depth/slots";
import type { ElementStateMap } from "../../src/lib/case-system/intake/depth/elementStateMap";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(REPO_ROOT, "scripts", "verification", "fixtures", "depthStories");

const BASE: Record<string, string> = {
  "sc-orient-when-happened": "About two months ago.",
  "sc-orient-role": "Starting a claim (plaintiff)",
  "sc-orient-dispute-category": "Starting a Small Claims case",
  "sc-claim-filed": "No, I have not filed anything yet.",
  "sc-defendant-served": "Not applicable.",
  "sc-defence-filed": "Not applicable.",
  "sc-defence-time-elapsed": "Not applicable.",
  "sc-defendant-noted-in-default": "Not applicable.",
  "sc-contractor-completion-date": "Not applicable.",
  "sc-contractor-notice-before-replacement": "Not applicable.",
  "sc-safety-check": "No safety concerns.",
  "sc-service-details": "Nothing has been served yet.",
  "sc-defamation-publication-details": "Not applicable.",
  "sc-defendant-claim-received": "Not applicable.",
  "sc-defendant-response-facts": "Not applicable.",
  "sc-defendant-response-evidence": "Not applicable.",
  "sc-defendant-outcome": "Not applicable.",
  "sc-defendant-service-method": "Not applicable.",
  "sc-defendant-counterclaim": "Not applicable.",
  "sc-defendant-admission-payment": "Not applicable.",
};

type DepthStory = PipelineStoryInput & {
  note: string;
  slotValues: SlotValues;
  /** Scripted answers by depth question id. Unlisted -> the fallback below. */
  depthAnswers: Record<string, string>;
  fallbackDepthAnswer: string;
};

const STORIES: DepthStory[] = [
  {
    id: "P1-services-unpaid",
    note: "Debt/services, paraphrased. Never says contract, invoice, agreement or paid.",
    story:
      "I do bookkeeping for small shops. A bakery owner asked me to sort out two years of receipts " +
      "and get her books straight before her accountant took over. We settled on a figure over coffee " +
      "and I started the following week. I finished everything at the end of June and she told me she " +
      "was happy with it. Since then she has stopped answering me and I am still out the money.",
    answers: {
      ...BASE,
      "sc-amount-claimed": "About $4,200.",
      "sc-evidence-available": "Emails between us, and the spreadsheets I produced.",
      "sc-remedy-sought": "I want the money I am owed.",
    },
    slotValues: { defendantLabel: "the bakery owner", amountLabel: "the $4,200" },
    depthAnswers: {
      "depth-debt-agreement": "We talked it through at her shop and settled on the figure verbally. Nothing was written down.",
      "depth-debt-work-done": "I started the first week of May and finished at the end of June.",
      "depth-debt-amount-unpaid": "I don't know whether she ever sent anything - nothing has reached me.",
    },
    fallbackDepthAnswer: "I am not sure about that one.",
    location: { province: "Ontario", city: "Toronto" },
  },
  {
    id: "P2-reputation-harm",
    note: "Defamation, paraphrased. Never says posted, said, told, wrote, shared, published.",
    story:
      "A woman in my building put something up in one of the local groups online claiming I had been " +
      "stealing packages from the lobby. It is not true. A neighbour showed it to me on her phone and " +
      "by the weekend people on my floor were avoiding me. I have lost two dog-walking clients from the " +
      "building since it went up.",
    answers: {
      ...BASE,
      "sc-amount-claimed": "Maybe $8,000 for the lost work and the harm to my name.",
      "sc-evidence-available": "A screenshot my neighbour took, and messages from the two clients.",
      "sc-remedy-sought": "I want it taken down and compensation for the work I lost.",
    },
    slotValues: { defendantLabel: "the woman in my building", subjectLabel: "the accusation" },
    depthAnswers: {
      "depth-defamation-communicated": "Everyone in the building group could see it, maybe two hundred people, and my neighbour Rita saw it first.",
      "depth-defamation-newspaper-notice": "No, it was just the residents' group online. Nothing in the paper or on the radio.",
    },
    fallbackDepthAnswer: "I am not sure about that one.",
    location: { province: "Ontario", city: "Ottawa" },
  },
  {
    id: "P3-work-left-damage",
    note: "Contractor damage, paraphrased. Never says quote, damage, estimate, repair.",
    story:
      "I had someone in to redo the tiling in my upstairs bathroom. Partway through he cut into a pipe " +
      "behind the wall and did not tell me. I found out when the ceiling below started staining and the " +
      "plaster came away. He stopped coming after that. I had to get someone else in to open the ceiling, " +
      "sort out the pipe and put it all back.",
    answers: {
      ...BASE,
      "sc-amount-claimed": "Around $6,800 all in.",
      "sc-evidence-available": "Photographs of the ceiling, and what the second person charged me.",
      "sc-remedy-sought": "I want what it cost me to put right.",
    },
    slotValues: { defendantLabel: "the tiler", amountLabel: "the $6,800" },
    depthAnswers: {
      "depth-contractor-agreement": "He wrote the price on a piece of paper and I said go ahead. That was all.",
      "depth-contractor-damage": "The pipe behind the shower wall, and then the ceiling in the kitchen underneath it.",
      "depth-contractor-loss": "It is what the second tradesman charged me, plus the plasterer.",
    },
    fallbackDepthAnswer: "I am not sure about that one.",
    location: { province: "Ontario", city: "Hamilton" },
  },
  {
    id: "P4-money-lent-friend",
    note: "Personal loan, paraphrased. Never says loan, lent, borrowed, repay, agreed.",
    story:
      "My cousin was short when his car went in for work last autumn and I moved some money across to " +
      "him to cover it. He said he would sort me out when his overtime came through in the new year. " +
      "The overtime came and went. Every time I bring it up he changes the subject, and now he has " +
      "stopped replying altogether.",
    answers: {
      ...BASE,
      "sc-amount-claimed": "$3,500.",
      "sc-evidence-available": "The bank transfer, and texts where he mentions sorting me out.",
      "sc-remedy-sought": "I want my money back.",
    },
    slotValues: { defendantLabel: "my cousin", amountLabel: "the $3,500" },
    depthAnswers: {
      "depth-loan-agreement": "He said he would sort me out when the overtime came through in January. It was all over text.",
      "depth-loan-unpaid": "Not a penny of it has come back.",
    },
    fallbackDepthAnswer: "I am not sure about that one.",
    location: { province: "Ontario", city: "London" },
  },
];

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
  console.log(`Estimated cost: ~34-44 requests\n`);
  if (dryRun) return console.log("--dry-run: stopping before any billed call.");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set — run with --env-file=.env.local");
    process.exitCode = 1;
    return;
  }

  const run = await withTimeout(runStoryThroughPipeline(story, apiKey), PIPELINE_JOURNEY_TIMEOUT_MS);

  const degraded = describeRunDegradation(run);
  if (degraded) {
    console.error(`DEGRADED — not recording: ${degraded}`);
    process.exitCode = 1;
    return;
  }

  const lines: string[] = [];
  const say = (s: string) => {
    console.log(s);
    lines.push(s);
  };

  say(`\n=== ${story.id} ===`);
  say(story.note);
  say(`\ngeneral intake: ${run.turns.length} turns, halted=${run.halted}, complete=${run.intakeComplete}`);

  // --- How the claim type is established ---
  //
  // The first version of this harness read retainedMatchedClaimType only.
  // That is the EXACT keyword matcher, which a paraphrase-only story is
  // specifically written to miss, so the depth phase never ran and the run
  // was unreadable: it could not even say whether the AI classifier had
  // produced anything.
  //
  // The real path for a story in the user's own words is
  // classifyClaimTypeWithAi -> a SUGGESTION -> the user confirms it
  // (suggest-never-decide, CLAUDE.md section 4). Confirmation is simulated
  // here with the same resolveClaimTypeSuggestion() the confirm/reject route
  // calls. Its "confirm" branch makes no API call — it is a lookup.
  //
  // Every one of these three lines prints unconditionally, including null and
  // including failure. Silence here is what made the last run unreadable.
  const matchedId = run.retainedMatchedClaimType?.claimTypeId;
  const suggested = run.retainedSuggestedClaimType;

  say(`\nexact matchClaimType   : ${matchedId ?? "(none)"}`);
  say(`AI suggestion          : ${suggested ? `${suggested.claimTypeId} (${suggested.claimTypeName})` : "(none — the classifier returned nothing)"}`);

  let claimTypeId: string | undefined = matchedId;
  let establishedVia: "exact-match" | "confirmed-suggestion" | "none" = matchedId ? "exact-match" : "none";

  if (!claimTypeId && suggested) {
    const resolution = await withTimeout(
      resolveClaimTypeSuggestion(
        "confirm",
        story.story,
        CLAIM_TYPES,
        run.finalFacts,
        apiKey,
        suggested.claimTypeId,
      ),
      PIPELINE_JOURNEY_TIMEOUT_MS,
    );

    say(`confirmation outcome   : ${resolution.outcome}`);

    if (resolution.outcome === "confirmed") {
      claimTypeId = resolution.claimType.claimTypeId;
      establishedVia = "confirmed-suggestion";
    } else {
      say(`  confirmation did NOT yield a claim type (outcome "${resolution.outcome}").`);
    }
  } else if (!claimTypeId) {
    say(`confirmation outcome   : (not attempted — no suggestion to confirm)`);
  } else {
    say(`confirmation outcome   : (not needed — exact match)`);
  }

  const claimType = CLAIM_TYPES.find((ct) => ct.id === claimTypeId);
  say(`claim type established : ${claimTypeId ?? "(none)"} via ${establishedVia}`);

  if (!claimType) {
    say(
      "\nNo claim type established by EITHER path — the depth phase does not run.\n" +
        "That is a finding about reachability, not about the depth layer: a user whose\n" +
        "story produces neither an exact match nor a confirmable suggestion can never\n" +
        "reach these questions.",
    );
    writeOut(story.id, lines);
    return;
  }

  // The user's own words the suppression filter reads.
  const userTexts = [
    story.story,
    ...["amountClaimedText", "timelineText", "evidenceText", "remedySoughtText", "serviceDetailsText"]
      .map((field) => run.finalFacts[field as keyof typeof run.finalFacts])
      .filter((value): value is string => typeof value === "string"),
  ];

  const selection = selectDepthQuestions({
    elements: claimType.plaintiffElements,
    userTexts,
    slotValues: story.slotValues,
  });

  say(`\n--- SUPPRESSED (${selection.suppressed.length}) ---`);
  for (const s of selection.suppressed) {
    say(`  ${s.elementId}  [${s.questionId}]`);
    say(`    matched terms: ${s.matchedTerms.join(", ")}`);
    say(`    fired on term "${s.match?.term ?? ""}" in clause: "${s.match?.clause ?? ""}"`);
  }
  if (!selection.suppressed.length) say("  (none)");

  say(`\n--- NO QUESTION NEEDED (${selection.noQuestionNeeded.length}) ---`);
  say(selection.noQuestionNeeded.length ? `  ${selection.noQuestionNeeded.join(", ")}` : "  (none)");

  say(`\n--- UNAUTHORED, attestation only (${selection.unauthored.length}) ---`);
  say(selection.unauthored.length ? `  ${selection.unauthored.join(", ")}` : "  (none)");

  say(`\n--- DEFERRED past budget (${selection.deferredToReadiness.length}) ---`);
  say(selection.deferredToReadiness.length
    ? `  ${selection.deferredToReadiness.map((d) => d.questionId).join(", ")}`
    : "  (none)");

  say(`\n--- ASKED (${selection.asked.length}) ---`);

  let stateMap: ElementStateMap = selection.stateMap;
  const facts = run.finalFacts as Record<string, string | number | boolean>;

  for (let i = 0; i < selection.asked.length; i += 1) {
    const asked: SelectedDepthQuestion = selection.asked[i];
    const next = selection.asked[i + 1];
    const answer = story.depthAnswers[asked.question.id] || story.fallbackDepthAnswer;

    const turn = await withTimeout(
      orchestrateDepthTurn({
        answeredQuestion: asked,
        answerText: answer,
        stateMap,
        nextQuestion: next,
        apiKey,
        facts,
      }),
      PIPELINE_JOURNEY_TIMEOUT_MS,
    );

    stateMap = turn.stateMap;

    say(`\n  Q${i + 1} [${asked.question.id}] -> ${asked.elementId}`);
    say(`    SPEC TEXT  : ${asked.question.text}`);
    say(`    SHOWN TEXT : ${asked.renderedText}`);
    say(`    slots defaulted: ${asked.defaultedSlots.join(", ") || "(none - all filled from user)"}`);
    say(`    answer     : ${answer}`);
    say(`    -> state   : ${stateMap[asked.elementId].state}${turn.resolvedAsCannotProvide ? "  (I-don't-know resolved)" : ""}`);
    if (turn.leadIn) say(`    lead-in for next (model-authored, NOT question text): ${turn.leadIn}`);
    if (turn.halted) {
      say(`    HALTED: ${turn.haltMessage}`);
      break;
    }
  }

  say(`\n--- FINAL ELEMENT STATE MAP ---`);
  for (const record of Object.values(stateMap)) {
    say(`  ${record.state.padEnd(15)} ${record.elementId}${record.providedVia ? `  via ${record.providedVia}` : ""}`);
  }

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
        abortIfRateLimited(error, "depth story");
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
