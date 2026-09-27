/**
 * The unsourced reasoning prose does not leave the coordinator on any user-facing
 * path, and the profiles it comes from are still unsourced.
 *
 * WHAT THIS CATCHES: legal content with no source behind it reaching a case model.
 *
 * `reasoningSummary` carries five arrays of prose — investigation priorities,
 * evidence priorities, burden priorities, procedural watch points, first questions.
 * Every string comes from `legalReasoningProfiles.ts`: five profiles with **no
 * verificationStatus and no citations at all**. They state what a claim requires
 * and what evidence matters, which is legal content, and §2 forbids shipping it
 * unsourced.
 *
 * *** WHAT THE TRACE FOUND, WHICH IS WHY THIS EXISTS ***
 *
 * `caseSystemAssembly` spreads those strings — prefixed "Legal reasoning burden
 * priority: …" — into `evidenceWarnings`, `procedureWarnings`,
 * `proof.elementsWithNothingRecorded` and `proofNextActions`, in about twenty
 * places. That assembly is consumed by `app/forms/page.tsx`, the dashboard adapter
 * and the brain bridge, and there was **no verification gate anywhere on that
 * path**. The arrays are non-empty in practice: `defamation` yielded 6 burden
 * priorities and 7 evidence priorities.
 *
 * Whether they reached a rendered screen was never established. The gate is
 * therefore at the point of production, and this check asserts it there — which
 * covers consumers nobody has traced, present and future.
 *
 * COSTS NOTHING. Pure functions. No network, no model, no database.
 *
 * Run: node --import tsx scripts/verification/verifyReasoningTextGate.ts
 */

import {
  buildLegalReasoningCoordinator,
  reasoningTextIsReleasable,
} from "../../src/lib/case-system/knowledge/legalReasoningCoordinator";
import { LEGAL_REASONING_PROFILES } from "../../src/lib/case-system/knowledge/legalReasoningProfiles";
import { DOCTRINE_SEED_LIBRARY } from "../../src/lib/case-system/knowledge/doctrineSeedLibrary";

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

console.log("");
console.log("REASONING TEXT GATE");
console.log("");

// ---------------------------------------------------------------------------
// 1. The rule itself, asserted directly
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  // Every mode a caller actually passes today, plus undefined.
  for (const mode of [undefined, "operational", "verified-only"] as const) {
    if (reasoningTextIsReleasable(mode)) {
      problems.push(`mode ${String(mode)} releases the unsourced prose — it must not`);
    }
  }
  if (!reasoningTextIsReleasable("internal-diagnostic")) {
    problems.push("internal-diagnostic does not release the prose, so diagnostics see nothing");
  }

  if (problems.length === 0) {
    pass("only internal-diagnostic releases the unsourced prose");
  } else {
    fail("the release rule is wrong", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 2. The coordinator honours it, for a domain that really has profiles
// ---------------------------------------------------------------------------

{
  /*
   * Driven with a domain known to MATCH a profile. Using a domain with no profiles
   * would return empty arrays whatever the gate did, and the check would pass while
   * asserting nothing — the same trap the assistant-block gate check fell into.
   */
  const domains = [...new Set(LEGAL_REASONING_PROFILES.flatMap((p) => p.legalDomains))];
  const domain = domains[0];

  const summaryFor = (mode: "operational" | "internal-diagnostic" | undefined) =>
    buildLegalReasoningCoordinator({
      courtPath: "small-claims",
      jurisdiction: "Ontario",
      stage: "starting-case",
      legalDomains: [domain],
      knowledgeObjects: DOCTRINE_SEED_LIBRARY,
      mode,
    }).reasoningSummary;

  const count = (s: ReturnType<typeof summaryFor>): number =>
    s.investigationPriorities.length +
    s.evidencePriorities.length +
    s.burdenPriorities.length +
    s.proceduralWatchPoints.length +
    s.firstQuestions.length;

  const diagnostic = count(summaryFor("internal-diagnostic"));
  const problems: string[] = [];

  if (diagnostic === 0) {
    problems.push(
      `domain "${domain}" produced no prose even in diagnostic mode — this check is ` +
        `asserting nothing. Pick a domain that matches a profile.`,
    );
  }

  for (const mode of ["operational", undefined] as const) {
    const released = count(summaryFor(mode));
    if (released !== 0) {
      problems.push(`mode ${String(mode)} released ${released} unsourced strings for "${domain}"`);
    }
  }

  // primaryDomains is the caller's own input echoed back, not prose, and must
  // still flow — otherwise the gate has broken something it should not touch.
  if (summaryFor("operational").primaryDomains.length !== 1) {
    problems.push("primaryDomains was emptied — the gate is too wide");
  }

  if (problems.length === 0) {
    pass(`the coordinator releases no prose on user-facing modes (${diagnostic} available in diagnostic)`);
  } else {
    fail("the coordinator leaked unsourced prose", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 3. The profiles are still unsourced — so the gate is still needed
// ---------------------------------------------------------------------------

{
  /*
   * *** WHY ASSERT THAT SOMETHING IS STILL BROKEN ***
   *
   * This is not pinning a current value. It asserts the PREMISE the gate rests on.
   * The day somebody gives these profiles citations, the right move is to release
   * them — and this check going red is the reminder that the gate can now be
   * relaxed on the citation rather than left in place forever out of caution.
   *
   * So a failure here is good news, and the message says so.
   */
  const withCitations = LEGAL_REASONING_PROFILES.filter(
    (profile) =>
      "citations" in profile ||
      "sourceId" in profile ||
      "verificationStatus" in profile,
  );

  if (withCitations.length === 0) {
    pass(
      `all ${LEGAL_REASONING_PROFILES.length} reasoning profiles are still unsourced, ` +
        `so the gate is still required`,
    );
  } else {
    fail(
      "some reasoning profiles now carry provenance — RELAX THE GATE",
      `${withCitations.length} of ${LEGAL_REASONING_PROFILES.length} profiles now have a\n` +
        `citation or verification field. That is the work this gate was waiting for.\n` +
        `Release the prose for sourced profiles instead of blocking all of them, and\n` +
        `update reasoningTextIsReleasable.`,
    );
  }
}

console.log("");
if (failures > 0) {
  console.log(`${failures} FAILURE(S).`);
  process.exitCode = 1;
} else {
  console.log("All checks passed.");
}
console.log("");
