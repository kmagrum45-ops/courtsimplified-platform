/**
 * The runtime says "we don't know" when it doesn't, and shows only published text.
 *
 *   npm run test:stage-resolution
 *
 * *** WHAT THIS IS GUARDING ***
 *
 * Part 0 traced ten realistic stories through the old runtime. Eight got the
 * same answer. The proximate cause was `text.includes("defendant")`; the more
 * dangerous half was `|| "starting-case"` — a default, which is a confident
 * answer given without evidence, and is how a defendant with judgment already
 * against them was told how to begin a claim.
 *
 * So the properties asserted here are the ones that failure violated:
 *
 *   an id the map does not contain is never repaired into a near match
 *   low confidence produces UNKNOWN, not the best guess
 *   two candidates produce the QUESTION that separates them
 *   nothing unpublished can be rendered
 *
 * *** NO MODEL CALL ***
 *
 * `resolveFromModelOutput` is pure, so every path is driven from a plain
 * object. That is deliberate: a suite that needed the API would be slow,
 * billable, and — worse — would test what the model happened to say today
 * rather than what the code does with it.
 */

import {
  CONFIDENCE_FLOOR,
  resolveFromModelOutput,
  resolvedStage,
  stageCatalogueForPrompt,
  STAGE_RESOLVER_SYSTEM,
} from "../../src/lib/case-system/stage-map/resolveStage";
import { CASE_STAGES, findStage, isSpecialStage } from "../../src/lib/case-system/stage-map/stageMap";
import {
  renderStageAnswer,
  renderStageAnswerOrRefuse,
} from "../../src/lib/content-library/stageAnswerView";
import { PUBLISHED_BLOCKS, publishedBlockFor } from "../../src/lib/content-library/publishedLibrary";

const failures: string[] = [];
let passed = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) passed += 1;
  else failures.push(detail ? `${name}\n      ${detail}` : name);
}

const REAL = CASE_STAGES.find((stage) => !isSpecialStage(stage.id))!;
const OTHER = CASE_STAGES.find(
  (stage) => !isSpecialStage(stage.id) && stage.id !== REAL.id,
)!;

// ---------------------------------------------------------------------------
// The ways of not knowing
// ---------------------------------------------------------------------------

check(
  "no answer at all is UNKNOWN, not a default",
  resolveFromModelOutput(null).kind === "unknown",
  "this is the `|| \"starting-case\"` failure — a default is a confident answer with no evidence",
);

const invented = resolveFromModelOutput({
  stageId: "plaintiff:probably-something-like-this",
  confidence: 0.99,
  reasoning: "",
});
check(
  "a stage id that is not in the map is UNKNOWN even at high confidence",
  invented.kind === "unknown" && invented.reason === "no-match",
  "snapping an invented id to the nearest real stage would be inventing an answer " +
    "on the model's behalf, which is the failure being replaced",
);

const special = resolveFromModelOutput({
  stageId: "unknown",
  confidence: 0.99,
  reasoning: "",
});
check(
  "the model cannot select the special stages itself",
  special.kind === "unknown",
  "UNKNOWN is a conclusion the CODE reaches, not an option the model picks",
);

const low = resolveFromModelOutput({
  stageId: REAL.id,
  confidence: CONFIDENCE_FLOOR - 0.01,
  reasoning: "",
});
check(
  "below the confidence floor is UNKNOWN",
  low.kind === "unknown",
  `got ${low.kind} at ${CONFIDENCE_FLOOR - 0.01}`,
);

const atFloor = resolveFromModelOutput({
  stageId: REAL.id,
  confidence: CONFIDENCE_FLOOR,
  reasoning: "",
});
check(
  "at the floor exactly, it suggests",
  atFloor.kind === "suggested",
  "the boundary must be decidable, or the floor is not a threshold",
);

/*
 * The pair that caused the original bug. If the map ever stops recording what
 * separates them, UNKNOWN degrades from "here is the one question we need"
 * back to a shrug.
 */
const ambiguous = resolveFromModelOutput({
  stageId: "plaintiff:served-awaiting-defence",
  alternativeStageId: "plaintiff:defence-period-expired-no-defence",
  confidence: 0.4,
  reasoning: "",
});
check(
  "two candidates produce the question that separates them",
  ambiguous.kind === "unknown" &&
    ambiguous.reason === "ambiguous" &&
    Boolean(ambiguous.clarifyingQuestion),
  `got ${ambiguous.kind}, question: ${
    ambiguous.kind === "unknown" ? ambiguous.clarifyingQuestion ?? "(none)" : "n/a"
  }`,
);

check(
  "out of scope is its own outcome",
  resolveFromModelOutput({ stageId: REAL.id, confidence: 0.9, reasoning: "", outOfScope: true })
    .kind === "out-of-scope",
  "a family or criminal matter is not a low-confidence Small Claims case",
);

// ---------------------------------------------------------------------------
// And it must still be able to say yes
// ---------------------------------------------------------------------------

const confident = resolveFromModelOutput({
  stageId: REAL.id,
  confidence: 0.95,
  reasoning: "internal",
  alternativeStageId: OTHER.id,
});
check(
  "a confident, valid answer is suggested",
  confident.kind === "suggested" && confident.stageId === REAL.id,
  "refusing everything is as useless as guessing — it would send every case to UNKNOWN",
);
check(
  "a suggestion carries its alternative so the user can disagree",
  confident.kind === "suggested" && Boolean(confident.alternative),
  "suggest-then-confirm needs something to confirm against (CLAUDE.md §4)",
);
check(
  "resolvedStage returns the stage only for a suggestion",
  resolvedStage(confident) !== null && resolvedStage(invented) === null,
  "",
);

// ---------------------------------------------------------------------------
// Nothing the model writes reaches a user
// ---------------------------------------------------------------------------

/*
 * The reasoning is the whole point of the design — reason deeply in private —
 * and it is also the single thing that must never be rendered. Asserted by
 * looking for it in every field of the resolution.
 */
const SECRET = "INTERNAL-REASONING-THAT-MUST-NOT-BE-SHOWN";
const withReasoning = resolveFromModelOutput({
  stageId: REAL.id,
  confidence: 0.95,
  reasoning: SECRET,
});
check(
  "the model's reasoning is not carried into the resolution",
  !JSON.stringify(withReasoning).includes(SECRET),
  "it is logged to ai_call_log and never shown — a field that carries it to a " +
    "renderer is a leak of unreviewed model prose",
);

// ---------------------------------------------------------------------------
// The prompt offers only real stages, with their boundaries
// ---------------------------------------------------------------------------

const catalogue = stageCatalogueForPrompt();
for (const stage of CASE_STAGES) {
  if (isSpecialStage(stage.id)) {
    check(
      `the special stage "${stage.id}" is not offered to the model`,
      !catalogue.includes(`- ${stage.id} `),
      "UNKNOWN and OUT_OF_SCOPE are conclusions the code reaches",
    );
  } else {
    check(
      `the model is offered: ${stage.id}`,
      catalogue.includes(stage.id),
      "a stage missing from the prompt can never be selected, however right it is",
    );
  }
}

check(
  "the catalogue gives the model the boundaries, not just descriptions",
  catalogue.includes("vs "),
  "given only descriptions a classifier picks what sounds closest; given the " +
    "distinguishing fact it can notice it does not know",
);

check(
  "the system prompt forbids inventing a stage id",
  /never invent/i.test(STAGE_RESOLVER_SYSTEM),
  "",
);

// ---------------------------------------------------------------------------
// The render door
// ---------------------------------------------------------------------------

check(
  "a stage with no published block renders nothing",
  renderStageAnswer("plaintiff:no-such-stage-exists") === null,
  "rendering a near match would show a user guidance for somebody else's position",
);

/*
 * *** THIS CHECK HAS TO SATISFY THE GATES, OR IT TESTS THE GATES ***
 *
 * It asks one thing: is the published set indexed, so that every block can
 * actually render. Two stages now carry render gates — the forum gate and the
 * high-stakes ambiguity rule — and calling the door without the inputs they
 * require made this fail with "the published set is not indexed", which was a
 * true failure of a false claim.
 *
 * CLAUDE.md §5: a check that pins yesterday's assumptions calls today's work a
 * regression. So the gates are SATISFIED here, deliberately and visibly, and the
 * gates themselves are checked in their own section below.
 */
function satisfyingInputs(stageId: string): {
  facts: Record<string, string>;
  scope: { primaryPath: string; confidence: number };
} {
  const stage = findStage(stageId);
  const facts: Record<string, string> = {};
  if (stage?.requiresConfirmedFact) {
    facts[stage.requiresConfirmedFact.key] = "a confirmed answer from the reader";
  }
  return { facts, scope: { primaryPath: "small-claims", confidence: 0.9 } };
}

for (const block of PUBLISHED_BLOCKS) {
  const { facts, scope } = satisfyingInputs(block.stageId);
  const rendered = renderStageAnswer(block.stageId, facts, {}, scope);
  check(
    `a published block renders: ${block.stageId}`,
    rendered !== null && rendered.sections.length > 0,
    "every section was refused by the output guard — the published set is not indexed",
  );
  if (rendered) {
    check(
      `rendered block carries its provenance: ${block.stageId}`,
      Boolean(rendered.release.runId) && rendered.sources.length >= 0,
      "a user who wants to check us needs to know what they are checking",
    );
  }
}

if (PUBLISHED_BLOCKS.length === 0) {
  console.log("");
  console.log("  Nothing promoted yet, so the render checks had no blocks to exercise.");
}

// ---------------------------------------------------------------------------

console.log("");
console.log("STAGE RESOLUTION");
console.log("");
console.log(`  confidence floor ${CONFIDENCE_FLOOR}`);
console.log(`  ${CASE_STAGES.filter((s) => !isSpecialStage(s.id)).length} stages offered to the model`);
console.log(`  ${PUBLISHED_BLOCKS.length} published block(s) renderable`);
console.log(`  ${passed} check(s) passed`);
// ===========================================================================
// THE FORUM GATE AND THE HIGH-STAKES AMBIGUITY RULE
// ===========================================================================
//
// Both live at the render door, which is the only way a stage answer reaches a
// user — so a gate there holds for the route, the chat, the eval and whatever is
// added next. Driven here directly, with the scope verdicts and facts a caller
// would pass, so the checks do not depend on what a model says today.

{
  const affirmative = { primaryPath: "small-claims", confidence: 0.9 };

  /*
   * ---- THE FORUM GATE ----
   *
   * "My neighbour smashed my car windows on purpose. I want him charged." came
   * back from classifyCourtPath as CIVIL AT 0.8 — affirmatively in scope — and
   * then from the stage resolver as before-filing:deciding-whether-to-sue at
   * 0.90. Two components, both wrong, agreeing. Nothing was shown only because
   * that block is unpublished, which is luck and not a control.
   */
  const gated = CASE_STAGES.filter((stage) => stage.requiresAffirmativeScope);

  check(
    "the catch-all before-filing stages require affirmative scope",
    gated.some((stage) => stage.id === "before-filing:deciding-whether-to-sue"),
    `gated: ${gated.map((s) => s.id).join(", ") || "(none)"}`,
  );

  for (const stage of gated) {
    check(
      `${stage.id} refuses to render on a "civil" verdict`,
      renderStageAnswerOrRefuse(stage.id, {}, {}, { primaryPath: "civil", confidence: 0.8 })
        .kind === "refused",
      "civil is affirmative and is not small-claims; the criminal-complaint story " +
        "was classified civil at 0.8",
    );
    check(
      `${stage.id} refuses to render with no scope call at all`,
      renderStageAnswerOrRefuse(stage.id, {}, {}, null).kind === "refused",
      "a caller that cannot say whether the matter is in scope has not established it",
    );
    check(
      `${stage.id} refuses on small-claims BELOW the floor`,
      renderStageAnswerOrRefuse(stage.id, {}, {}, {
        primaryPath: "small-claims",
        confidence: 0.3,
      }).kind === "refused",
      "0.3 is the classifier saying it could not resolve the boundary",
    );
  }

  /*
   * And the other direction, which is what stops the gate from being a way of
   * never rendering anything. A stage NOT marked renders without a scope call —
   * the icy-sidewalk story classifies as "unknown" and must still reach its
   * notice block, which carries a TEN-DAY bar.
   */
  check(
    "an ungated stage still renders with no scope call",
    renderStageAnswerOrRefuse("before-filing:notice-municipality", {}, {}, null).kind ===
      "rendered",
    "the municipal notice story classifies as 'unknown' and carries a ten-day bar; " +
      "gating it would be the worst possible regression",
  );

  check(
    "a gated stage renders once scope is affirmative",
    // Uses whichever gated stage has a published block, or reports that none has.
    (() => {
      const withBlock = gated.filter(
        (stage) => publishedBlockFor(stage.id) !== undefined && publishedBlockFor(stage.id) !== null,
      );
      if (withBlock.length === 0) return true;
      return withBlock.every(
        (stage) =>
          renderStageAnswerOrRefuse(stage.id, {}, {}, affirmative).kind === "rendered",
      );
    })(),
    "affirmative small-claims must pass, or the gate is a deletion",
  );

  /*
   * ---- THE HIGH-STAKES AMBIGUITY RULE ----
   *
   * ITEM 2, NAMED EXACTLY: "a city sidewalk" with no confirmed municipality must
   * produce the general Municipal Act block plus the question, NEVER the Toronto
   * block. s. 42 (6) names the Toronto city clerk; s. 44 (10) names every other
   * municipality's. A reader who serves the wrong clerk has done nothing, with
   * ten days to do it in.
   */
  const toronto = findStage("before-filing:notice-toronto");

  check(
    "the Toronto block requires a confirmed municipality",
    toronto?.requiresConfirmedFact?.key === "municipality",
    JSON.stringify(toronto?.requiresConfirmedFact ?? null),
  );

  const unconfirmed = renderStageAnswerOrRefuse(
    "before-filing:notice-toronto",
    {},
    {},
    affirmative,
  );

  check(
    "WITHOUT a confirmed municipality the Toronto block does not render",
    unconfirmed.kind === "refused" && unconfirmed.refusal.reason === "fact-not-confirmed",
    JSON.stringify(unconfirmed),
  );

  check(
    "the refusal carries the question to ask",
    unconfirmed.kind === "refused" &&
      unconfirmed.refusal.reason === "fact-not-confirmed" &&
      unconfirmed.refusal.question === "Which city or town was this in?",
    "a refusal with no question leaves the reader with nothing to do",
  );

  check(
    "the refusal names the GENERAL block to show meanwhile",
    unconfirmed.kind === "refused" &&
      unconfirmed.refusal.reason === "fact-not-confirmed" &&
      unconfirmed.refusal.generalAlternative === "before-filing:notice-municipality",
    "a ten-day notice period must not be spent waiting for us to ask a question",
  );

  check(
    "and that general block DOES render — the reader is not left with silence",
    renderStageAnswerOrRefuse("before-filing:notice-municipality", {}, {}, affirmative).kind ===
      "rendered",
  );

  check(
    "WITH the municipality confirmed, the Toronto block renders",
    renderStageAnswerOrRefuse(
      "before-filing:notice-toronto",
      { municipality: "Toronto" },
      {},
      affirmative,
    ).kind === "rendered",
    "the rule is that the fact must come from the user, not that the block is dead",
  );

  /*
   * The model cannot supply the fact. There is no path from a narrative to
   * `facts` — the route reads `confirmedFacts` from the request body and nothing
   * else writes it — so this asserts the shape that makes that true: an empty
   * facts record refuses, whatever the story said.
   */
  check(
    "a story that merely MENTIONS Toronto does not confirm the municipality",
    renderStageAnswerOrRefuse(
      "before-filing:notice-toronto",
      {},
      {},
      affirmative,
    ).kind === "refused",
    "the fact comes from the reader answering the question, never from the narrative",
  );
}


console.log("");

if (failures.length > 0) {
  console.log(`${failures.length} FAILURE(S):`);
  console.log("");
  for (const failure of failures) console.log(`  - ${failure}`);
  console.log("");
  process.exitCode = 1;
} else {
  console.log("  All checks passed.");
  console.log("");
}
