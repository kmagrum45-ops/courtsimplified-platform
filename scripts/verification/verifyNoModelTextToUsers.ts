/**
 * No sentence the model wrote reaches a user, unless the switch is on.
 *
 * WHAT IT PROTECTS. The LSO A2I AI policy forbids AI-generated legal content
 * reaching a user without human review, and the A2I answers (2026-09-28)
 * commit to it. Until 2026-09-29 the analysis carried the model's own wording
 * into what users read: risk titles and explanations, suggested next actions,
 * follow-up questions, the "elements" of each claim, form suggestions, and a
 * model-given score that became a "proof strength" rating. The dashboard
 * rendered several of them. Each earlier fix closed one route (warnings,
 * document prose) and left the rest.
 *
 * THE PROPERTY, asserted end to end through the REAL Small Claims path:
 * plant a marker in EVERY free-text field the model can return, run the
 * analysis, and search everything it hands back (the analysis, the saved
 * payload, the master-result and dashboard patches). With
 * aiAnalysisTextToUsers() off, no marker may appear anywhere. A new model
 * field that some future builder copies into the output fails this, with no
 * list to keep up to date.
 *
 * The one DISCLOSED exception is the case-file summary: the model lists what
 * the user recorded and what they did not, code composes the sentences, and
 * the A2I answers name it. Those items carry a different marker and are
 * asserted PRESENT, which also proves the planted response was really used
 * (a seam that silently did nothing would otherwise pass everything).
 *
 * POSITIVE CONTROL: with the switch on, the model markers DO appear. Without
 * that, a detector that stopped matching would pass everything.
 *
 * ALSO: what users get instead is the sourced catalogue, not placeholders --
 * the confirmed claim type's elements by name, each with its official
 * sourceUrl, and reviewed depth questions for the elements not yet recorded.
 * And the switch cannot be turned on in production, and the analyze route
 * accepts the catalogue fields only when they name real catalogue entries.
 *
 * Uses the test seam COURTSIMPLIFIED_TEST_PLANTED_COGNITION in
 * courtSimplifiedBrain.ts, which is ignored on Vercel and under
 * NODE_ENV=production. No network, no model, no database.
 *
 * Run: npm run test:no-model-text-to-users
 */

import { analyzeSmallClaimsWithBrain } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { mapGuidedIntakeToSmallClaimsInput } from "../../app/builder/_components/guidedIntakeToSmallClaimsInput";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { aiAnalysisTextToUsers } from "../../src/lib/content-library/phaseScope";
import { isSmallClaimsInput } from "../../app/api/small-claims/analyze/route";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : ` -- ${detail}`}`);
  if (!ok) failures += 1;
}

const M = (field: string) => `ZQMODELTEXT ${field}`;
const CASEFILE = "ZQCASEFILEITEM an invoice dated in March is recorded";

// Every free-text field GptCognitionOutput can carry. Structured choices use
// real enum values so the analysis runs its normal path.
const planted = {
  courtPath: "small-claims",
  province: "Ontario",
  stage: "starting-case",
  confidence: "high",
  primaryClaimTypes: ["debt"],
  claimClassifications: [
    {
      claimType: "debt",
      status: "detected",
      score: 97,
      confidence: "high",
      explanation: M("claim.explanation"),
      elements: [
        {
          elementKey: "zq-element",
          label: M("element.label"),
          status: "documented",
          explanation: M("element.explanation"),
          missingFacts: [M("element.missingFacts")],
          risks: [M("element.risks")],
        },
      ],
    },
  ],
  rejectedFalsePositives: [{ claimType: "defamation", status: "rejected-false-positive", explanation: M("rejected.explanation") }],
  missingInformation: [{ field: "zq", question: M("missing.question"), reason: M("missing.reason"), requiredFor: "evidence", severity: "high" }],
  evidenceIssueLinks: [{ issueLabel: M("link.issueLabel"), claimType: "debt", requiredProof: M("link.requiredProof"), missingEvidence: [M("link.missingEvidence")], explanation: M("link.explanation") }],
  litigationRisks: [{ title: M("risk.title"), explanation: M("risk.explanation"), severity: "high", source: "law", suggestedFix: M("risk.suggestedFix") }],
  formRecommendations: [{ formNumber: "7A", title: M("form.title"), courtPath: "small-claims", stage: "starting-case", reason: M("form.reason"), confidence: "high", warnings: [M("form.warnings")] }],
  caseFileRecorded: [CASEFILE],
  caseFileNotRecorded: [],
  plainLanguageSummary: M("plainLanguageSummary"),
  structuredCaseSummary: M("structuredCaseSummary"),
  nextBestActions: [M("nextBestActions")],
  systemWarnings: [M("systemWarnings")],
};

const claimType = CLAIM_TYPES.find((item) => item.id === "sc-claim-unpaid-debt-services")!;
const [firstElement, secondElement] = claimType.plaintiffElements;

function input() {
  return mapGuidedIntakeToSmallClaimsInput(
    {
      facts: { role: "plaintiff", amountClaimedText: "$2,400", evidenceText: "The invoice and my texts." },
      answeredIds: [],
      matchedClaimType: { claimTypeId: claimType.id, claimTypeName: claimType.name },
      elementStateMap: {
        [firstElement.id]: { elementId: firstElement.id, elementName: firstElement.name, state: "provided", userText: "We agreed by text." },
      },
    } as never,
    { province: "Ontario", city: "Ottawa" },
    "I cleaned a rental unit for ten hours and was never paid the $2,400 we agreed.",
  );
}

async function run(switchOn: boolean) {
  process.env.COURTSIMPLIFIED_TEST_PLANTED_COGNITION = JSON.stringify(planted);
  delete process.env.VERCEL_ENV;
  if (switchOn) process.env.AI_ANALYSIS_TEXT_TO_USERS = "on";
  else delete process.env.AI_ANALYSIS_TEXT_TO_USERS;
  const out = await analyzeSmallClaimsWithBrain(input(), { allowExternalCognition: true });
  return JSON.stringify(out);
}

(async () => {
  // --- The switch
  check("switch: off by default", aiAnalysisTextToUsers({}) === false);
  check("switch: production is off even with the variable set", aiAnalysisTextToUsers({ VERCEL_ENV: "production", AI_ANALYSIS_TEXT_TO_USERS: "on" }) === false);
  check("switch: on for Vercel preview (staging) only", aiAnalysisTextToUsers({ VERCEL_ENV: "preview" }) === true);
  check("switch: a local run can turn it on explicitly", aiAnalysisTextToUsers({ AI_ANALYSIS_TEXT_TO_USERS: "on" }) === true);

  // --- Off: no model sentence anywhere in what comes back
  const off = await run(false);
  const leaks = [...new Set(off.match(/ZQMODELTEXT [a-zA-Z.]+/g) || [])];
  check("switch off: no model-written text anywhere in the output", leaks.length === 0, leaks.join(", "));
  check("switch off: the planted response was used (case-file item present)", off.includes("ZQCASEFILEITEM"));
  check("switch off: the model's 97 score is not carried", !off.includes('"score":97'));

  // --- What users get instead: the sourced catalogue
  for (const element of claimType.plaintiffElements) {
    check(`catalogue: element "${element.name.slice(0, 50)}" is shown`, off.includes(JSON.stringify(element.name).slice(1, -1)));
  }
  check("catalogue: each element carries its official sourceUrl", claimType.plaintiffElements.every((element) => off.includes(element.sourceUrl)));
  check(
    "catalogue: an element the user recorded is not asked about again",
    !off.includes(`"field":"${firstElement.id}"`),
  );
  check(
    "catalogue: an element not yet recorded gets a follow-up question",
    off.includes(`"field":"${secondElement.id}"`),
  );

  // --- Positive control
  const on = await run(true);
  check("control: with the switch on, the model's wording does appear", on.includes("ZQMODELTEXT"));

  // --- Route accepts only real catalogue entries
  const base = input();
  const plain = { ...base } as Record<string, unknown>;
  delete plain.confirmedClaimTypeId;
  delete plain.elementStates;
  check("route: accepts a body with no catalogue fields", isSmallClaimsInput(plain));
  check("route: accepts a real claim type and states", isSmallClaimsInput(base));
  check("route: rejects an unknown claim type", !isSmallClaimsInput({ ...base, confirmedClaimTypeId: "made-up" }));
  check("route: rejects an element from another claim type", !isSmallClaimsInput({ ...base, elementStates: { "not-an-element": "provided" } }));
  check("route: rejects free text as a state", !isSmallClaimsInput({ ...base, elementStates: { [firstElement.id]: "they owe me" } }));
  check("route: rejects states without a claim type", !isSmallClaimsInput({ ...plain, elementStates: {} }));

  delete process.env.COURTSIMPLIFIED_TEST_PLANTED_COGNITION;
  delete process.env.AI_ANALYSIS_TEXT_TO_USERS;
  console.log(failures ? `\n${failures} failure(s).` : "\nAll checks passed.");
  if (failures) process.exitCode = 1;
})().catch((error) => {
  console.error("verifyNoModelTextToUsers threw:", error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
