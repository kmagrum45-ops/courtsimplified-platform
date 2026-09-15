/**
 * One story, end to end, written out as the user would experience it —
 * opening story, claim type, every question asked in order, every answer
 * given, the readiness gate, and the FULL Statement of Claim draft verbatim.
 *
 *   npm run report:journey -- --story=1
 *   npm run report:journey -- --all          (all five, sequentially)
 *   npm run report:journey -- --all --dry-run
 *
 * Needs a key: run with `--env-file=.env.local` (the npm script does this).
 *
 * *** WHY THE ENGINES AND NOT PLAYWRIGHT ***
 *
 * `npm run test:browser-journeys` drives the real screens and is the right
 * tool for "does the page render". It is the wrong tool for this, which is
 * "what prose does the site actually produce": reaching the draft in a browser
 * needs a dev server, a session, the site-access gate, and roughly fifteen
 * interactions per story, and what comes back is a screenshot rather than
 * text you can read or diff.
 *
 * This drives the same functions the screens call, through
 * fixtures/pipelineRunner.ts — the shared runner runFixtures.ts and
 * runGeneratedFixtures.ts already use, so there is no second copy of the turn
 * loop to drift. Real billed OpenAI calls throughout; no stubs.
 *
 * *** WHAT THIS DOES NOT PROVE ***
 *
 * That the screen renders any of it. This is engine output. A draft that is
 * perfect here and never reaches the page would look identical in this report.
 * Pair it with the browser suite; do not read it as a substitute.
 *
 * *** WHY IT WRITES AFTER EVERY STORY ***
 *
 * A story is ~35-40 billed requests, so five is ~200. runLiveStoryBatch.ts
 * deliberately runs one per invocation for exactly that reason. `--all` is
 * offered because the request was for one readable document, but each story's
 * section is flushed to disk the moment it completes: a failure on story four
 * leaves one through three readable rather than losing the whole run.
 *
 * *** THE DRAFT IS CALLED THE WAY THE SCREEN CALLS IT ***
 *
 * Three arguments, including the cannot-provide elements. Those travel INTO
 * the document by design (STATEMENT_OF_CLAIM_READINESS_DESIGN.md section 4) —
 * a gap visible only on the screen where it was recorded is one the user will
 * not see again when they read the draft. runFixtureDrafts.ts passes only two
 * and so silently omits them; that is a real difference from the screen, not a
 * stylistic one.
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
import { draftStatementOfClaimParticulars } from "../../src/lib/case-system/statementOfClaimDraftEngine";
import { STORIES, type LiveStory } from "./liveStoryBatchStories";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(REPO_ROOT, "docs", "journeys");
const OUT_FILE = path.join(OUT_DIR, "SMALL_CLAIMS_JOURNEYS.md");

/**
 * Each story's section is cached here, and OUT_FILE is assembled from whatever
 * sections exist.
 *
 * The first version rewrote OUT_FILE from the header on every invocation,
 * which meant `--story=2` silently discarded story 1 — ~38 billed requests
 * thrown away by a flag that looks like it narrows the work rather than
 * destroying earlier work.
 *
 * Caching also makes re-running cheap in the way that matters: change the
 * draft engine, re-run only `--story=5`, and the combined document updates
 * with the other four intact and clearly dated.
 */
const SECTION_DIR = path.join(OUT_DIR, "sections");

/**
 * The five stories, chosen for coverage rather than convenience.
 *
 * | id                | why it is here                                          |
 * |-------------------|---------------------------------------------------------|
 * | L1-personal-loan  | authored depth questions FIRE — shows real Q&A           |
 * | L4-spans-two      | genuinely ambiguous between two claim types              |
 * | L5-cannot-answer  | user can answer nothing; every element unanswerable      |
 * | L7-vacation-pay   | employment — structurally unlike debt/contract           |
 * | L8-towing         | smallest claim type (2 elements); qualified amount       |
 *
 * Two of the requested edge cases were already in the batch and are used as
 * written rather than invented for this report: L5 is the unanswerable one,
 * and L8's amount carries a qualifier ("$460 plus the storage, so about
 * $540") — as does L4's ("About $5,400 between finishing the floor and the
 * radiator"). Qualified amounts matter because the draft engine emits the
 * amount string verbatim, so whatever hedge the user typed lands in the
 * document.
 */
const SELECTED_IDS = [
  "L1-personal-loan",
  "L4-spans-two",
  "L5-cannot-answer",
  "L7-vacation-pay",
  "L8-towing",
];

function selectedStories(): LiveStory[] {
  return SELECTED_IDS.map((id) => {
    const story = STORIES.find((candidate) => candidate.id === id);
    if (!story) throw new Error(`Story "${id}" is not in liveStoryBatchStories.ts`);
    return story;
  });
}

function arg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

/** One story's section. Returned as lines so the caller can flush it immediately. */
async function renderStory(story: LiveStory, apiKey: string): Promise<string[]> {
  const lines: string[] = [];
  const say = (s = "") => lines.push(s);

  say(`## ${story.id}`);
  say();
  say(`_${story.note}_`);
  say();

  // ---------------------------------------------------------------- story
  say(`### The story as submitted`);
  say();
  say("> " + story.story.split("\n").join("\n> "));
  say();

  const run = await withTimeout(
    runStoryThroughPipeline(story as PipelineStoryInput, apiKey),
    PIPELINE_JOURNEY_TIMEOUT_MS,
  );

  // A degraded run completes and looks ordinary — the voice layer and the
  // brain both swallow API failures and substitute canned text. Recording one
  // as if it were real output is the failure this guard exists to prevent.
  const degraded = describeRunDegradation(run);
  if (degraded) {
    say(`> **RUN DEGRADED — nothing below is trustworthy: ${degraded}**`);
    say();
    return lines;
  }

  if (run.halted) {
    say(`### Pipeline halted`);
    say();
    say(`The intake stopped before completing: ${run.haltMessage || "(no message)"}`);
    say();
    say(`No draft is produced on this path, which is the intended behaviour.`);
    say();
    return lines;
  }

  // ----------------------------------------------------------- claim type
  const matchedId = run.retainedMatchedClaimType?.claimTypeId;
  const suggested = run.retainedSuggestedClaimType;

  say(`### Which claim type matched`);
  say();
  let claimTypeId = matchedId;
  let via = "exact match on the story text";

  if (matchedId) {
    say(`Matched directly: \`${matchedId}\` (${run.retainedMatchedClaimType?.claimTypeName}).`);
    say(`The user is shown this as a match, not asked to confirm it.`);
  } else if (suggested) {
    say(`No exact match. The AI classifier suggested \`${suggested.claimTypeId}\` (${suggested.claimTypeName}),`);
    say(`which the user is asked to confirm or reject — it is a suggestion, never applied on its own.`);
    const resolution = await withTimeout(
      resolveClaimTypeSuggestion("confirm", story.story, CLAIM_TYPES, run.finalFacts, apiKey, suggested.claimTypeId),
      PIPELINE_JOURNEY_TIMEOUT_MS,
    );
    say();
    say(`Simulating the user confirming it: **${resolution.outcome}**`);
    if (resolution.outcome === "confirmed") {
      claimTypeId = resolution.claimType.claimTypeId;
      via = "user confirmed the AI suggestion";
    } else {
      via = `suggestion not confirmed (${resolution.outcome})`;
    }
  } else {
    say(`No exact match and the classifier returned nothing — it declined rather than guessing.`);
    via = "none established";
  }

  say();
  say(`**Established: \`${claimTypeId ?? "(none)"}\` — ${via}.**`);
  if (story.expectedClaimTypeId) {
    const ok = claimTypeId === story.expectedClaimTypeId;
    say(`Expected \`${story.expectedClaimTypeId}\` — ${ok ? "match." : "**DIFFERENT from expected.**"}`);
  }
  say();

  // ------------------------------------------------- general intake Q & A
  say(`### Every question the site asked, in order`);
  say();
  say(`#### Phase 1 — general intake`);
  say();

  let asked = 0;
  run.turns.forEach((turn) => {
    if (!turn.questionAsked) {
      say(`**Opening.** No question — the user writes their story first.`);
      say();
      return;
    }
    asked += 1;
    say(`**Q${asked}.** \`${turn.questionAsked}\``);
    if (turn.leadInShown) say(`> _${turn.leadInShown}_`);
    say(`> ${turn.questionTextShown}`);
    say();
    say(`**A${asked}.** ${turn.answerGiven}`);
    say();
  });

  const claimType = CLAIM_TYPES.find((ct) => ct.id === claimTypeId) || null;
  let stateMap: ElementStateMap = {};

  if (!claimType) {
    say(`#### Phase 2 — depth questions`);
    say();
    say(`Not reached: no claim type was established, so there are no elements to ask about.`);
    say();
    say(`### Statement of Claim draft`);
    say();
    say(`None. Without a claim type the readiness gate has nothing to evaluate and the draft is unreachable.`);
    say();
    return lines;
  }

  // ------------------------------------------------------- depth Q & A
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

  say(`#### Phase 2 — depth questions (claim-type specific)`);
  say();
  say(`\`${claimType.name}\` has ${claimType.plaintiffElements.length} element(s). Of those:`);
  say();
  say(`- **${selection.asked.length}** have an authored question and were asked`);
  say(`- **${selection.unauthored.length}** have no authored question, so the site cannot ask — it falls back to letting the user attest${selection.unauthored.length ? ` (${selection.unauthored.join(", ")})` : ""}`);
  say(`- **${selection.noQuestionNeeded.length}** were already covered by what the user wrote${selection.noQuestionNeeded.length ? ` (${selection.noQuestionNeeded.join(", ")})` : ""}`);
  say();

  if (!selection.asked.length) {
    say(`_No depth questions were asked._`);
    say();
  }

  for (let i = 0; i < selection.asked.length; i += 1) {
    const item = selection.asked[i];
    const next = selection.asked[i + 1];
    const answer = story.depthAnswers[item.question.id] || story.fallbackDepthAnswer;

    const turn = await withTimeout(
      orchestrateDepthTurn({
        answeredQuestion: item,
        answerText: answer,
        stateMap,
        nextQuestion: next,
        apiKey,
        facts: run.finalFacts as Record<string, string | number | boolean>,
      }),
      PIPELINE_JOURNEY_TIMEOUT_MS,
    );
    stateMap = turn.stateMap;

    say(`**D${i + 1}.** \`${item.question.id}\` → element \`${item.elementId}\``);
    say(`> ${item.renderedText}`);
    if (item.defaultedSlots.length) {
      say(`>`);
      say(`> _(placeholder wording used for: ${item.defaultedSlots.join(", ")} — the user never gave a name for these)_`);
    }
    say();
    say(`**A.** ${answer}`);
    say();
    say(`Recorded as: **${stateMap[item.elementId].state}**${turn.resolvedAsCannotProvide ? " — the site read this as \"I don't know\" and recorded it as unanswerable rather than pressing" : ""}`);
    say();
  }

  // --------------------------------------------------------- readiness gate
  const remedyId = claimType.remedies[0] || null;
  let gate = evaluateReadinessGate({
    claimType,
    elementStateMap: stateMap,
    confirmedRemedyId: remedyId,
    storyText: story.story,
  });

  say(`### Where the user stands before drafting`);
  say();
  say(`- Remedy confirmed: \`${remedyId ?? "(none)"}\``);
  say(`- Elements outstanding: **${gate.outstandingCount} of ${gate.totalElements}**`);
  say(`- Elements marked unanswerable: **${gate.cannotProvide.length}**`);
  say(`- **Draft available: ${gate.draftAvailable}**`);
  if (gate.blockers.length) {
    say();
    say(`Held on:`);
    for (const b of gate.blockers) {
      say(`- ${b.kind}${"elementIds" in b ? `: ${b.elementIds.join(", ")}` : ""}`);
    }
  }
  say();

  // Attestation — what the "I don't have this" button does. Without it the
  // report stops one screen short of the draft for every claim type with no
  // authored depth questions, which is most of them.
  if (!gate.draftAvailable && gate.outstanding.length > 0) {
    say(`The user presses **"I don't have this"** on each outstanding element — the site does not`);
    say(`require an answer, it requires the user to say the gap is deliberate:`);
    say();
    for (const element of gate.outstanding) {
      stateMap = recordCannotProvide(stateMap, {
        elementId: element.elementId,
        questionId: `attestation:${element.elementId}`,
      });
      say(`- ${element.name} → recorded as unanswerable`);
    }
    gate = evaluateReadinessGate({
      claimType,
      elementStateMap: stateMap,
      confirmedRemedyId: remedyId,
      storyText: story.story,
    });
    say();
    say(`**Draft available now: ${gate.draftAvailable}** (outstanding ${gate.outstandingCount}, unanswerable ${gate.cannotProvide.length})`);
    say();
  }

  // ----------------------------------------------------------------- draft
  say(`### The Statement of Claim draft`);
  say();

  if (!gate.draftAvailable || !run.mappedInput) {
    say(`**No draft.** The gate is still held${gate.blockers.length ? ` on ${gate.blockers.map((b) => b.kind).join(", ")}` : ""}.`);
    say();
    return lines;
  }

  const party = story.party;
  say(
    party
      ? `Party fields as the user filled them in.`
      : `**The user left the party fields blank.** The engine does not infer a name from the story — it emits a bracketed placeholder, which is what appears below.`,
  );
  say();

  const draft = draftStatementOfClaimParticulars(
    {
      ...run.mappedInput,
      yourName: party?.yourName ?? "",
      yourAddress: party?.yourAddress ?? "",
      otherParty: party?.otherParty ?? "",
      defendantAddress: party?.defendantAddress ?? "",
    },
    { claimTypeId: claimType.id, claimTypeName: claimType.name },
    gate.cannotProvide.map((item) => ({ elementId: item.elementId, name: item.name })),
  );

  say("```");
  say(draft.draftText);
  say("```");
  say();

  say(`### Outstanding — what the draft itself says is missing`);
  say();
  if (!draft.missingParticulars.length) {
    say(`_Nothing. Every particular the engine tracks was present._`);
  } else {
    for (const item of draft.missingParticulars) say(`- ${item}`);
  }
  say();

  if (gate.cannotProvide.length) {
    say(`Recorded as unanswerable, and named inside the document above rather than left off it:`);
    say();
    for (const item of gate.cannotProvide) say(`- ${item.name}`);
    say();
  }

  say(`**Amount as it reaches the document:** \`${run.mappedInput.amountClaimed || "(empty)"}\``);
  say();
  say(
    `The engine copies this string verbatim — it does not parse a number out of it, ` +
      `so any hedge the user typed appears in the draft exactly as written.`,
  );
  say();

  return lines;
}

/** Writes one story's cached section, stamped with when it was produced. */
function writeSection(story: LiveStory, lines: string[]): void {
  fs.mkdirSync(SECTION_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(SECTION_DIR, `${story.id}.md`),
    [`<!-- generated ${new Date().toISOString()} -->`, ...lines].join("\n") + "\n",
    "utf8",
  );
}

/**
 * Assembles OUT_FILE from the cached sections, in SELECTED_IDS order.
 *
 * A story with no cached section is listed as not yet run rather than omitted
 * — an absent section and a story that produced nothing look identical in a
 * document that simply leaves it out, and only one of those is fine.
 */
function assemble(): void {
  const lines = header();

  SELECTED_IDS.forEach((id, index) => {
    const file = path.join(SECTION_DIR, `${id}.md`);
    if (!fs.existsSync(file)) {
      lines.push(`## ${index + 1}. ${id}`, ``, `_Not yet run. \`npm run report:journey -- --story=${index + 1}\`_`, ``, `---`, ``);
      return;
    }
    const raw = fs.readFileSync(file, "utf8").split(/\r?\n/);
    const stamp = raw[0].startsWith("<!--") ? raw.shift() : null;
    const body = raw.join("\n").trimEnd();
    lines.push(body.replace(/^## /, `## ${index + 1}. `), ``);
    if (stamp) lines.push(`_Story ${index + 1} produced ${stamp.replace(/<!--\s*generated\s*|\s*-->/g, "")}_`, ``);
    lines.push(`---`, ``);
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, lines.join("\n") + "\n", "utf8");
}

function header(): string[] {
  return [
    `# Small Claims journeys — what the site actually produces`,
    ``,
    `Generated by \`scripts/verification/runStoryJourneyReport.ts\`. Not hand-edited.`,
    ``,
    `Re-run: \`npm run report:journey -- --all\``,
    ``,
    `Each story below is driven through the real engines with real OpenAI calls —`,
    `the same functions the screens call — from the opening story to the finished`,
    `Statement of Claim draft. **This is engine output: it does not prove the screen`,
    `renders any of it.** \`npm run test:browser-journeys\` covers that.`,
    ``,
    `Assembled ${new Date().toISOString()}. Each story is dated individually —`,
    `they are run separately and a re-run replaces only that story.`,
    ``,
    `---`,
    ``,
  ];
}

async function main(): Promise<void> {
  const stories = selectedStories();
  const all = process.argv.includes("--all");
  const dryRun = process.argv.includes("--dry-run");
  const index = Number(arg("story", "0")) - 1;

  const chosen = all ? stories : stories[index] ? [stories[index]] : [];

  if (!chosen.length) {
    console.error(
      `Usage:\n  npm run report:journey -- --all\n  npm run report:journey -- --story=N\n\n` +
        stories.map((s, i) => `  ${i + 1}. ${s.id}`).join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  console.log(`${chosen.length} story/stories, ~35-40 billed requests each (~${chosen.length * 38} total).`);
  if (dryRun) {
    console.log("--dry-run: stopping before any billed call.");
    for (const s of chosen) console.log(`  would run: ${s.id}`);
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set — the npm script passes --env-file=.env.local; check that file.");
    process.exitCode = 1;
    return;
  }

  for (let i = 0; i < chosen.length; i += 1) {
    const story = chosen[i];
    console.log(`\n[${i + 1}/${chosen.length}] ${story.id} …`);

    const section = await renderStory(story, apiKey);
    // Cached and reassembled per story on purpose — see SECTION_DIR. A failure
    // later does not cost the stories already paid for.
    writeSection(story, section);
    assemble();
    console.log(`    written (${section.length} lines)`);
  }

  console.log(`\nWrote ${path.relative(REPO_ROOT, OUT_FILE)}`);
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) {
  void main().catch((error: unknown) => {
    if (error instanceof RateLimitAbort) {
      console.error(`\n${error.message}`);
    } else {
      try {
        abortIfRateLimited(error, "journey report");
      } catch (rateError) {
        console.error(`\n${(rateError as Error).message}`);
        process.exitCode = 1;
        return;
      }
      console.error("Journey threw:", error instanceof Error ? error.message : error);
    }
    process.exitCode = 1;
  });
}
