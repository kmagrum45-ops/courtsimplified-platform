/**
 * Session 34 proof -- NOT wired into CI, NOT a browser test. Runs
 * buildClaimTypeOverviewContent() directly against real story text, no AI
 * and no dev server needed, since the function itself is fully
 * deterministic (matchClaimType + claimTypes.ts lookups only).
 *
 * Run manually:
 *   node --import tsx scripts/proofs/runClaimTypeOverviewContentProof.ts
 *
 * The scenario-quality harness (tests/browser/scenario-quality.spec.ts)
 * needs a real dev server, real auth, and a real billed OpenAI call to
 * produce a meaningful (non-void) result -- out of reach here per standing
 * working-style rules (no starting long-running dev servers). This proof
 * covers the same underlying claim: does the new wiring surface real,
 * sourced content for a Small Claims story that used to fall through?
 *
 * A genuine correction to Session 33's original framing, confirmed by
 * reading scenarioRegistry.ts directly: the "$700k+ wrongful dismissal"
 * scenario that motivated this whole fix (CIV-EMPLOYMENT-WRONGFUL-
 * DISMISSAL-001) is deliberately courtPath: "civil" -- the claim exceeds
 * Small Claims' $50,000 limit by design (see the scenario's own comment).
 * CLAIM_TYPES is Small-Claims-only, and this session's constraints
 * explicitly exclude building Civil coverage, so that exact scenario
 * stays unfixed -- correctly, not as an oversight. What this session
 * fixes is sc-claim-wrongful-dismissal, the SMALL CLAIMS wrongful-
 * dismissal claim type (within the $50k cap) -- a different claim.
 */

import { buildClaimTypeOverviewContent } from "../../src/lib/case-system/intake/claimTypeOverviewContent";
import { baseScenarios } from "../verification/scenarioRegistry";

function printResult(label: string, storyText: string) {
  console.log(`\n${"=".repeat(70)}\n=== ${label} ===`);
  console.log(`Story text: "${storyText.slice(0, 140)}${storyText.length > 140 ? "..." : ""}"`);
  const result = buildClaimTypeOverviewContent(storyText);
  if (!result) {
    console.log("Result: null (no CLAIM_TYPES match -- generic fallback stays in place, nothing fabricated)");
    return;
  }
  console.log(`Matched claim type: ${result.claimTypeId} (${result.claimTypeName})`);
  console.log(`evidenceToOrganize (${result.evidenceToOrganize.length}):`);
  for (const item of result.evidenceToOrganize) {
    console.log(`  - ${item.text}${item.sourceUrl ? ` [${item.sourceUrl}]` : " [NO SOURCE URL]"}`);
  }
  console.log(`courtPoints (${result.courtPoints.length}):`);
  for (const item of result.courtPoints) {
    console.log(`  - ${item.text.slice(0, 100)}...${item.sourceUrl ? ` [${item.sourceUrl}]` : " [NO SOURCE URL]"}`);
  }
}

function main() {
  // ---- 1. A real Small Claims scenario from the registry (contractor renovation) ----
  const contractorScenario = baseScenarios.find((s) => s.id === "SC-CONTRACTOR-INCOMPLETE-RENOVATION-001");
  if (!contractorScenario) throw new Error("SC-CONTRACTOR-INCOMPLETE-RENOVATION-001 not found in scenarioRegistry.ts");
  printResult(
    "Real registry scenario: SC-CONTRACTOR-INCOMPLETE-RENOVATION-001 (small-claims)",
    String(contractorScenario.intakeFacts.facts),
  );

  // ---- 2. The registry's actual $700k+ wrongful dismissal scenario (deliberately civil) ----
  const civilWrongfulDismissal = baseScenarios.find((s) => s.id === "CIV-EMPLOYMENT-WRONGFUL-DISMISSAL-001");
  if (!civilWrongfulDismissal) throw new Error("CIV-EMPLOYMENT-WRONGFUL-DISMISSAL-001 not found in scenarioRegistry.ts");
  console.log(`\n${"=".repeat(70)}\n=== Confirming the panel's own courtPath gate, not buildClaimTypeOverviewContent(), excludes the civil scenario ===`);
  console.log(`CIV-EMPLOYMENT-WRONGFUL-DISMISSAL-001 courtPath: ${civilWrongfulDismissal.courtPath}`);
  printResult(
    "Real registry scenario: CIV-EMPLOYMENT-WRONGFUL-DISMISSAL-001 text run directly through buildClaimTypeOverviewContent() (bypassing IntelligenceOverviewPanel.tsx's courtPath === 'small-claims' gate, to see what the text alone would match)",
    String(civilWrongfulDismissal.intakeFacts.facts),
  );

  // ---- 3. A constructed Small Claims wrongful-dismissal story (within the $50k cap) --
  // no such scenario exists in scenarioRegistry.ts today (its one wrongful-dismissal
  // entry is deliberately over-limit/civil), so this proves sc-claim-wrongful-dismissal's
  // wiring with a story shaped to actually fit Small Claims' jurisdiction.
  const smallClaimsWrongfulDismissal =
    "I worked for a small logistics company for 4 years and was let go without cause last month, with " +
    "no notice and no termination pay at all. My last role paid about $55,000 a year. I'm owed several " +
    "weeks of termination pay under the Employment Standards Act, which comes to under $10,000, well " +
    "within Small Claims Court.";
  printResult("Constructed Small Claims wrongful-dismissal story (within the $50k cap)", smallClaimsWrongfulDismissal);

  // ---- 4. Defamation -- replacing the old hand-written duplicate ----
  const defamationScenario = baseScenarios.find((s) => s.id === "SC-DEFAMATION-FILED-SERVED-DEFAULT-001");
  if (defamationScenario) {
    printResult(
      "Real registry scenario: SC-DEFAMATION-FILED-SERVED-DEFAULT-001 (small-claims)",
      String(defamationScenario.intakeFacts.facts),
    );
  }
  const richerDefamationStory =
    "Someone posted false statements about me on social media, saying I stole money from a former " +
    "employer, and other people saw and commented on the post. It was never true and I never worked " +
    "there. I'm suing for defamation.";
  printResult("Constructed, richer defamation story (same claim type, more signal words)", richerDefamationStory);

  // ---- 5. Unrelated/Family text -- must stay null, never fabricated ----
  const adultAdoptionScenario = baseScenarios.find((s) => s.id === "FAM-ADOPTION-ADULT-001");
  if (adultAdoptionScenario) {
    printResult(
      "Real registry scenario: FAM-ADOPTION-ADULT-001 (family -- CLAIM_TYPES has zero family entries)",
      String(adultAdoptionScenario.intakeFacts.facts),
    );
  }
}

main();
