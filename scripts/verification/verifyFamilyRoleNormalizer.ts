/**
 * A family user's side comes from their own answer, never from stray keywords.
 *
 * COSTS NOTHING. Pure normalizer runs plus a source scan of the intake.
 *
 * WHY. Found 2026-10-04 from a real run. The family normalizer joined the role
 * to ALL intake text and sniffed keywords, and the family intake never sent a
 * role. A father who had been served, whose goal was "joint custody", came out
 * as "joint-applicant" (the person bringing the case); an applicant who ticked
 * "Application already filed / served" came out as the respondent. Every
 * downstream surface then spoke to the wrong side.
 *
 * Asserts properties, not values:
 *   1. an explicit role is returned as given, whatever the text says;
 *   2. ordinary words in a story ("joint custody", "served", "restaurant",
 *      "uncle", the stage and document labels) never produce a role;
 *   3. with no explicit role, conflicting first-person phrases give not-sure;
 *   4. the family intake asks the question and sends `role`.
 *
 * Run: node --import tsx scripts/verification/verifyFamilyRoleNormalizer.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { normalizeFamilyAiIntake } from "../../src/lib/case-system/familyAiIntakeNormalizer";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`PASS ${name}`);
  else {
    failures += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const NOISY_STORY = {
  caseStage: "starting-case",
  issues: ["Decision-making responsibility / custody", "Parenting time / access"],
  filedDocuments: ["Application filed (by either person)", "Answer / response already filed"],
  childrenInfo: "she is 12 and her uncle and aunt pick her up after school",
  currentLivingSituation: "we met at a restaurant; I served dinner on wednesdays",
  goal: "joint custody",
  facts: "filing and starting things is confusing",
};

for (const role of ["applicant", "respondent", "joint-applicant", "third-party-caregiver"]) {
  const got = normalizeFamilyAiIntake({ ...NOISY_STORY, role }).role;
  check(`explicit role "${role}" wins over noisy text`, got === role, `got ${got}`);
}

{
  const got = normalizeFamilyAiIntake({ ...NOISY_STORY }).role;
  check("ordinary story words produce no role", got === "not-sure", `got ${got}`);
}
{
  const got = normalizeFamilyAiIntake({ ...NOISY_STORY, role: "not-sure" }).role;
  check('an explicit "not-sure" falls back to text, which here says nothing', got === "not-sure", `got ${got}`);
}
{
  const got = normalizeFamilyAiIntake({ facts: "My ex took me to court. I was served last week." }).role;
  check("first-person 'I was served' with no explicit role reads as respondent", got === "respondent", `got ${got}`);
}
{
  const got = normalizeFamilyAiIntake({ facts: "I was served, and I started the case for support too." }).role;
  check("conflicting first-person phrases give not-sure", got === "not-sure", `got ${got}`);
}

const intake = readFileSync(
  path.join(process.cwd(), "app/builder/_components/FamilyIntake.tsx"),
  "utf8",
);
check("family intake asks who started the case", intake.includes("Who started the court case?"));
check("family intake sends the role to analysis", /role:\s*yourRole/.test(intake));

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll family role checks passed.");
