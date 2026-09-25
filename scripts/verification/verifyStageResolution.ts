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
import { CASE_STAGES, isSpecialStage } from "../../src/lib/case-system/stage-map/stageMap";
import { renderStageAnswer } from "../../src/lib/content-library/stageAnswerView";
import { PUBLISHED_BLOCKS } from "../../src/lib/content-library/publishedLibrary";

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

for (const block of PUBLISHED_BLOCKS) {
  const rendered = renderStageAnswer(block.stageId);
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
