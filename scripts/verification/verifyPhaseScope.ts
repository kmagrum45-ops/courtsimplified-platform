/**
 * No user reaches an empty screen: a pathway is open only when it has real
 * content, and a closed one says so at every door.
 *
 * (Until 2026-09-30 this asserted "phase 1 is Small Claims only". The site
 * owner opened Family and Civil that day, once their libraries and next steps
 * were written and verified, so the checks now assert the property the gate
 * existed for, whichever pathways are open.)
 *
 * COSTS NOTHING. Reads source off disk and calls pure functions.
 *
 * *** THE FAILURE THIS PREVENTS ***
 *
 * Under the LSO rewrite the Family and Civil next-step catalogues became
 * `[NEEDS LICENSEE REVIEW: …]` placeholders, because no reviewed procedural
 * wording existed for them and inventing some was the thing the rewrite existed
 * to stop. The output guard then blocks placeholders from rendering — correctly.
 *
 * The result was the worst of both: a user could complete a Family intake and
 * find NOTHING where the next steps should be. A blank space reads as "we have
 * no advice for you", not as "we do not cover this yet". So the gate exists,
 * and this asserts it holds at every door.
 *
 * *** WHY THE PLACEHOLDERS ARE STILL REQUIRED TO EXIST ***
 *
 * Check 4 asserts the eighteen Family and Civil blocks are still in the
 * catalogue (all authored since 2026-09-30). Deleting them would make this suite greener and the work smaller:
 * they are the record of which stages phase 2 must author, and they are what
 * the licensee review packet lists. A gate that was implemented by deletion
 * would pass every other check here.
 *
 * Run: node --import tsx scripts/verification/verifyPhaseScope.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  allPathwayUnavailableMessages,
  AVAILABLE_PATHWAYS,
  isPathwayAvailable,
  pathwayUnavailableMessage,
  PATHWAY_LABELS,
  type KnownPathway,
} from "../../src/lib/content-library/phaseScope";
import { NEXT_STEP_BLOCKS, isPlaceholder } from "../../src/lib/content-library/nextSteps";
import { REFERRAL_RESOURCES } from "../../src/lib/content-library/referralResources";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

// ---------------------------------------------------------------------------
// 1. The scope itself
// ---------------------------------------------------------------------------

{
  const known: KnownPathway[] = ["small-claims", "family", "civil"];
  if (isPathwayAvailable("small-claims")) {
    pass("small-claims IS available — the gate is not blocking everything");
  } else {
    fail("small-claims is not available; the product covers nothing");
  }
  if (AVAILABLE_PATHWAYS.every((pathway) => known.includes(pathway))) {
    pass(`open pathways: ${AVAILABLE_PATHWAYS.join(", ")}`);
  } else {
    fail(`AVAILABLE_PATHWAYS names an unknown pathway: ${JSON.stringify(AVAILABLE_PATHWAYS)}`);
  }

  // THE PROPERTY: an open pathway has real next steps at every stage. This is
  // what fails if someone opens a pathway before its content exists.
  const empty = NEXT_STEP_BLOCKS.filter((block) => isPathwayAvailable(block.pathway) && isPlaceholder(block)).map(
    (block) => block.id,
  );
  if (empty.length === 0) {
    pass("every open pathway has authored next steps at every stage");
  } else {
    fail("an open pathway would show a user an empty screen", empty.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 2. Every door is gated
// ---------------------------------------------------------------------------

const DOORS: Array<{ file: string; why: string }> = [
  { file: "app/_components/HomeLocationGate.tsx", why: "the front door" },
  { file: "app/builder/page.tsx", why: "/builder?path=family is reachable by URL and from a saved draft" },
  { file: "app/family/page.tsx", why: "the family landing page" },
  { file: "app/civil/page.tsx", why: "the civil landing page" },
];

{
  /*
   * Looks for the component being RENDERED, not merely mentioned.
   *
   * The first version of this check tested `includes("PathwayUnavailable")`,
   * and a mutation that replaced the rendered element with `<div />` passed it
   * — because the import line still contained the word. A check satisfied by
   * an import is a check satisfied by nothing.
   */
  // Rendered AND conditional on the pathway being closed.
  const ungated = DOORS.filter(({ file }) => {
    const text = read(file);
    return !/<PathwayUnavailable[\s/>]/.test(text) || !/isPathwayAvailable\(/.test(text);
  });
  if (ungated.length === 0) {
    pass(`all ${DOORS.length} entry points render the closed-pathway notice when the pathway is closed`);
  } else {
    fail(
      "an entry point into an unavailable pathway has no gate",
      ungated.map(({ file, why }) => `  ${file} — ${why}`).join("\n"),
    );
  }
}

{
  // The landing pages must not still offer to start an intake that is gated.
  const offenders: string[] = [];
  for (const [file, pathway] of [
    ["app/family/page.tsx", "family"],
    ["app/civil/page.tsx", "civil"],
  ]) {
    // Every link into the intake must sit inside an availability check.
    const text = read(file);
    let at = text.indexOf(`/builder?path=${pathway}`);
    while (at !== -1) {
      const before = text.slice(Math.max(0, at - 250), at);
      if (!before.includes(`isPathwayAvailable("${pathway}")`)) {
        offenders.push(`${file} links to /builder?path=${pathway} without checking the pathway is open`);
      }
      at = text.indexOf(`/builder?path=${pathway}`, at + 1);
    }
  }

  if (offenders.length === 0) {
    pass("a landing page offers to start an intake only while that pathway is open");
  } else {
    fail("a landing page links into a gated intake", offenders.join("\n"));
  }
}

{
  // The classifier's "Switch to X" offer must be conditional, or it walks a
  // user into the gate it just told them about.
  const gate = read("app/_components/HomeLocationGate.tsx");
  if (/isPathwayAvailable\(suggestion\.suggestedPath\)/.test(gate)) {
    pass("the court-path suggestion only offers to switch to an available pathway");
  } else {
    fail(
      "the 'Switch to X' button is not conditional on availability",
      "A suggestion to switch to Family would land the user on the gate.",
    );
  }
}

// ---------------------------------------------------------------------------
// 3. The message is fixed, complete, and not a dead end
// ---------------------------------------------------------------------------

{
  for (const pathway of ["family", "civil"] as KnownPathway[]) {
    const message = pathwayUnavailableMessage(pathway);
    const problems: string[] = [];

    if (!message.includes("Small Claims Court")) problems.push("does not say what we DO cover");
    if (!message.includes(PATHWAY_LABELS[pathway])) problems.push("does not name the pathway");
    // A person turned away at the door can reasonably read it as "you have no
    // case", and they are often already worried about precisely that.
    if (!/not a comment on your situation|whether you have a case/.test(message)) {
      problems.push("does not say this is about our coverage, not their case");
    }
    if (message.includes("[NEEDS LICENSEE REVIEW")) problems.push("is a placeholder");

    if (problems.length === 0) {
      pass(`the ${pathway} message says what it needs to`);
    } else {
      fail(`the ${pathway} message ${problems.join("; ")}`);
    }
  }

  if (REFERRAL_RESOURCES.length >= 4) {
    pass(`${REFERRAL_RESOURCES.length} referral resources accompany the message`);
  } else {
    fail(`expected at least 4 referral resources, found ${REFERRAL_RESOURCES.length}`);
  }

  // allPathwayUnavailableMessages() is used ONLY here. Its own comment used to
  // claim the output guard read it, which was false. Exercised so it is not a
  // wholly dead export while it waits to be wired into the content inventory.
  const all = allPathwayUnavailableMessages();
  if (all.length === 3 && all.every((message) => message.includes("Small Claims Court"))) {
    pass("allPathwayUnavailableMessages enumerates all three pathways");
  } else {
    fail(`allPathwayUnavailableMessages returned ${all.length} message(s)`);
  }

  const component = read("app/_components/PathwayUnavailable.tsx");
  if (component.includes("REFERRAL_RESOURCES")) {
    pass("the component shows the referrals rather than ending on a refusal");
  } else {
    fail("PathwayUnavailable does not render the referral resources");
  }
}

// ---------------------------------------------------------------------------
// 4. The placeholder blocks are KEPT
// ---------------------------------------------------------------------------

{
  const gatedBlocks = NEXT_STEP_BLOCKS.filter(
    (block) => block.pathway === "family" || block.pathway === "civil",
  );
  const placeholders = gatedBlocks.filter(isPlaceholder);

  if (gatedBlocks.length === 18) {
    pass("all 18 Family and Civil next-step blocks are still in the catalogue");
  } else {
    fail(
      `expected 18 Family and Civil blocks, found ${gatedBlocks.length}`,
      "They are phase 2's shape and the review packet's record of what still\n" +
        "needs authoring. Gating a pathway must not be implemented by deleting them.",
    );
  }

  if (placeholders.length === gatedBlocks.length) {
    pass("they are all still drafts awaiting authored, sourced wording");
  } else {
    pass(
      `${gatedBlocks.length - placeholders.length} of them now have real content — ` +
        "phase 2 has started; this check does not object",
    );
  }
}

// ---------------------------------------------------------------------------
// 5. Small Claims is untouched
// ---------------------------------------------------------------------------

{
  const smallClaims = NEXT_STEP_BLOCKS.filter((block) => block.pathway === "small-claims");
  const real = smallClaims.filter((block) => !isPlaceholder(block));

  if (real.length >= 6) {
    pass(`Small Claims still has ${real.length} authored next-step blocks`);
  } else {
    fail(
      `Small Claims has only ${real.length} authored blocks`,
      "The gate was supposed to narrow the product, not empty it.",
    );
  }
}

console.log("");
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`);
process.exitCode = failures === 0 ? 0 : 1;
