/**
 * Pins the removal of the false "already mentioned" claim.
 *
 * COSTS NOTHING. Pure functions and a source-order check.
 *
 * THE LIVE DEFECT THIS REPLAYS. The user wrote:
 *
 *   "MY UNCLES EX GIRLFRIEND SENT MESSAGES TO MY DAD AND UNCLE SAYING I WAS A
 *    PROSTITUTE AND ITS NOT TRUE"
 *
 * and the site rendered "Already mentioned in what you've shared: Copy of the
 * written notice sent". No written notice was mentioned. The entire match was
 * the token "sent".
 *
 * That was a CLAUDE.md section 4 problem: the site asserting a fact about the
 * user's own file that the user never supplied. The fix removes the claim
 * rather than tuning the match, because no threshold lets word overlap
 * establish that a person mentioned a thing.
 *
 * Run: node --import tsx scripts/verification/verifyEvidenceGuidanceClaims.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import {
  buildEvidenceCategoryGuidance,
  collectEvidenceCategories,
} from "../../src/lib/case-system/intake/evidenceGapDetector";

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const DEFAMATION = CLAIM_TYPES.find((ct) => ct.id === "sc-claim-defamation-libel-slander")!;

const INTAKE_SOURCE_RAW = readFileSync(
  path.join(__dirname, "..", "..", "app", "builder", "_components", "GuidedSmallClaimsIntake.tsx"),
  "utf8",
);

/**
 * Comments stripped — JSX `{/* *​/}`, block and line.
 *
 * The comments explaining this removal legitimately QUOTE the removed strings
 * ("Already mentioned in what you've shared"), so a raw-source check flags the
 * explanation as the defect. Strip first, then assert on live code only. Same
 * correction as verifyStatementOfClaimSurface.ts: fix the detector, never
 * weaken the rule or delete the explanation.
 */
const INTAKE_SOURCE = INTAKE_SOURCE_RAW.replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .filter((line) => !/^\s*\/\//.test(line))
  .join("\n");
const DETECTOR_SOURCE = readFileSync(
  path.join(__dirname, "..", "..", "src", "lib", "case-system", "intake", "evidenceGapDetector.ts"),
  "utf8",
);

function main(): void {
  // ---- The shape can no longer express the claim ----

  const guidance = buildEvidenceCategoryGuidance(DEFAMATION);

  check(
    "guidance returns ONE category list",
    Array.isArray(guidance.categories) && guidance.categories.length > 0,
  );
  check(
    "there is no addressed/unaddressed split to render",
    !("addressedCategories" in guidance) && !("unaddressedCategories" in guidance),
    Object.keys(guidance).join(", "),
  );
  check(
    "every category for the claim type is listed, none filtered out",
    guidance.categories.length === collectEvidenceCategories(DEFAMATION).length,
  );

  // The function no longer accepts user text at all, so nothing can draw a
  // conclusion from it. A one-argument signature is the structural guarantee.
  check(
    "buildEvidenceCategoryGuidance takes no user text",
    buildEvidenceCategoryGuidance.length === 1,
    `arity ${buildEvidenceCategoryGuidance.length}`,
  );

  // ---- The live story can no longer produce a claim ----
  //
  // Same claim type, same words. Previously this returned
  // addressedCategories: ["Copy of the written notice sent"].
  const liveStory =
    "MY UNCLES EX GIRLFRIEND SENT MESSAGES TO MY DAD AND UNCLE SAYING I WAS A PROSTITUTE AND ITS NOT TRUE";

  check(
    "the live story cannot influence the output (it is not an input)",
    JSON.stringify(buildEvidenceCategoryGuidance(DEFAMATION)) ===
      JSON.stringify(guidance) && liveStory.length > 0,
  );

  // ---- The claim is gone from the UI ----

  for (const phrase of [
    "Already mentioned in what you",
    "hasn&apos;t come up yet",
    "hasn't come up yet",
    "addressedCategories",
    "unaddressedCategories",
  ]) {
    check(`UI no longer contains: "${phrase}"`, !INTAKE_SOURCE.includes(phrase));
  }

  check(
    "the UI states what situations generally involve, claiming nothing about the user",
    INTAKE_SOURCE.includes("Situations like this often involve:"),
  );

  // ---- The matching machinery is gone, not merely unused ----
  //
  // Dead code that exists only to support a claim we decided not to make is
  // an invitation to restore the claim.
  for (const symbol of [
    "NEGATION_TRIGGERS",
    "isAddressed",
    "categoryKeywords",
    "extractKeywords",
    "isNegatedNearby",
    "detectEvidenceGaps",
  ]) {
    check(`detector no longer defines ${symbol}`, !DETECTOR_SOURCE.includes(symbol));
  }

  check(
    "the detector records why, so it is not reintroduced",
    DETECTOR_SOURCE.includes("Do not restore it"),
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
