/**
 * Guided intake must not hand a user the OTHER side's next steps.
 *
 * mapGuidedIntakeToSmallClaimsInput() picks the case stage, and the stage
 * picks a next-step block (src/lib/content-library/nextSteps.ts) that is
 * written for one side. Until 2026-09-27 the stage was inferred from filed
 * documents alone, and the case-review batch caught both failure directions:
 * a plaintiff with a defended claim was told a defendant must file a Defence
 * within 20 days, and a served defendant was told the plaintiff may have them
 * noted in default.
 *
 * Asserts the PROPERTY, not today's mapping table: for every combination of
 * role and filing state, the chosen stage is one whose next-step block is
 * addressed to that role or to both. A new stage, or a new block, passes as
 * long as it is not addressed to the wrong side.
 *
 * Pure -- no model call, no database, no network.
 *
 * Run: npm run test:guided-stage-by-role
 * (node --import tsx scripts/verification/verifyGuidedStageByRole.ts)
 */

import assert from "node:assert/strict";
import { mapGuidedIntakeToSmallClaimsInput } from "../../app/builder/_components/guidedIntakeToSmallClaimsInput";

/**
 * Who each Small Claims next-step block is written for. Read from the block
 * text in nextSteps.ts. A stage missing here fails the suite, so a new stage
 * cannot slip through unclassified.
 */
const BLOCK_AUDIENCE: Record<string, "plaintiff" | "defendant" | "both"> = {
  "starting-case": "plaintiff", // "An action is started by filing a Plaintiff's Claim"
  responding: "defendant", // "A defendant who wishes to dispute a claim must ... serve a Defence"
  "already-started": "plaintiff", // "the plaintiff may ask the clerk to note the defendant in default"
  conference: "both", // documents and witness list before a settlement conference
  motion: "both",
  trial: "both",
  enforcement: "both",
  urgent: "both",
  "not-sure": "both",
};

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : ` -- ${detail}`}`);
  if (!ok) failures += 1;
}

function stageFor(facts: Record<string, unknown>): string {
  return mapGuidedIntakeToSmallClaimsInput(
    { facts, answeredIds: [], matchedClaimType: null } as never,
    { province: "Ontario", city: "Ottawa" },
    "",
  ).caseStage;
}

const roles = ["plaintiff", "defendant"] as const;
const bools = [true, false, undefined] as const;

for (const role of roles) {
  for (const claimFiled of bools) {
    for (const defenceFiled of bools) {
      const stage = stageFor({ role, claimFiled, defenceFiled });
      const audience = BLOCK_AUDIENCE[stage];
      const label = `${role}, claimFiled=${claimFiled}, defenceFiled=${defenceFiled} -> ${stage}`;
      if (!audience) {
        check(label, false, `stage "${stage}" has no audience recorded in BLOCK_AUDIENCE`);
        continue;
      }
      check(label, audience === role || audience === "both", `block is written for the ${audience}`);
    }
  }
}

// The two exact cases the batch caught, named so a regression reads plainly.
check(
  "plaintiff whose claim was defended is NOT given the defendant's respond-within-20-days block",
  stageFor({ role: "plaintiff", claimFiled: true, claimServed: true, defenceFiled: true }) !== "responding",
);
check(
  "served defendant is NOT given the plaintiff's note-in-default block",
  stageFor({ role: "defendant", claimFiled: true, claimServed: true, defenceFiled: false }) !== "already-started",
);

// Unknown role keeps the documents-only behaviour: guessing a side is worse.
assert.equal(stageFor({ claimFiled: false }), "starting-case");
check("unknown role, nothing filed -> starting-case (unchanged)", true);

console.log(failures ? `\n${failures} failure(s).` : "\nAll checks passed.");
if (failures) process.exitCode = 1;
