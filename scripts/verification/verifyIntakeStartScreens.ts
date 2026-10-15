/**
 * Checks two front-door fixes from the owner's walkthrough of a real Small
 * Claims default-judgment case (2026-10-14):
 *
 * 1. Province is fixed to Ontario on both intake start screens
 *    (HomeLocationGate.tsx, the /?path= gate; and builder/page.tsx, the
 *    /builder?path= gate reached directly or from a saved draft). Before
 *    this, the person had to pick a province from a dropdown offering
 *    "Ontario", "Not sure" and "Another province or territory", although the
 *    whole site is Ontario-only right now -- a choice with one real answer
 *    is not a choice.
 * 2. The homepage's marketing body (the court-type picker, "answers
 *    checked", "how it works", "why CourtSimplified exists") no longer
 *    renders below the intake gate once a path is chosen. Before this it
 *    always rendered, so a person deep into Small Claims intake -- past the
 *    AI's own question and into a full next-step card -- still saw "What
 *    kind of matter is this?" and the three court-type cards underneath
 *    their own answer.
 *
 * Source-scan and offline: this is about which screen renders, not what a
 * component computes, so the check is a close read of the two files rather
 * than a render.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  FAIL ${name}\n       ${message}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=test:intake-start-screens::${name}: ${message.replace(/\n/g, " ")}`);
  }
}

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");

console.log("Intake start screens: fixed province, no duplicate court-type picker");

check("HomeLocationGate fixes province to Ontario, not a selector the person answers", () => {
  const src = read("app/_components/HomeLocationGate.tsx");
  assert.match(src, /const\s+province\s*=\s*"Ontario"/, "province must be a fixed constant, not state the person can leave blank");
  assert.doesNotMatch(src, /not-sure/, "the 'not sure' province option should be gone");
  assert.doesNotMatch(src, /Another province or territory/, "the 'another province' option should be gone");
  assert.doesNotMatch(src, /Ontario beta\. It cannot start this Ontario court intake/, "the now-impossible wrong-province warning should be gone");
});

check("the builder's own gate fixes province to Ontario too", () => {
  const src = read("app/builder/page.tsx");
  assert.match(src, /const\s+intakeProvince\s*=\s*"Ontario"/, "province must be a fixed constant on the builder gate as well");
  assert.doesNotMatch(src, /intakeProvince !== "Ontario" \? "a province or territory"/, "the gate's blocked-on list should not ask for a province that cannot be anything else");
});

check("the homepage hides its marketing body while a path is active", () => {
  const src = read("app/page.tsx");
  assert.match(src, /<HideDuringIntake>/, "the marketing body (court-type picker, how it works, etc.) must be wrapped so it hides during intake");
  // The picker heading must be INSIDE the wrapper, not rendered unconditionally.
  const wrapperIndex = src.indexOf("<HideDuringIntake>");
  const headingIndex = src.indexOf("What kind of matter is this?");
  const closeIndex = src.indexOf("</HideDuringIntake>");
  assert.ok(wrapperIndex >= 0 && headingIndex > wrapperIndex && headingIndex < closeIndex, "the court-type picker heading must sit between <HideDuringIntake> and its close");
});

check("HideDuringIntake reads the same ?path= values HomeLocationGate does, and hides for all three", () => {
  const src = read("app/_components/HideDuringIntake.tsx");
  for (const value of ["family", "small-claims", "civil"]) {
    assert.match(src, new RegExp(`"${value}"`), `must recognise ${value} as an active intake path`);
  }
  assert.match(src, /return intakeActive \? null/, "must render nothing while intake is active");
});

if (failures) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll intake-start-screen checks passed.");
