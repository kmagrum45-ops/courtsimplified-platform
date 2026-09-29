/**
 * No name FIELD reaches a model.
 *
 * The user's name and the other party's name are entered in plain form fields
 * and stored in the Canadian database. Until 2026-09-27 all three intake
 * adapters (Small Claims, civil, family) copied them into the raw text the
 * brain sends to OpenAI. The LSO A2I application now states that they are
 * never sent; this suite is what makes that statement true over time.
 *
 * Asserts, over the REAL paths (Small Claims analyzeSmallClaimsWithBrain,
 * runCivilIntakeCanonicalIntegration, runFamilyIntakeCanonicalIntegration,
 * each with the model call OFF), that the normalized intake -- the object
 * JSON-serialised into the prompt in courtSimplifiedBrain.buildCognitionPrompt
 * -- contains neither name, anywhere.
 *
 * NEGATIVE CONTROL: a name the user types inside their own story is still
 * sent (the story is sent; that is disclosed, not hidden). The suite asserts
 * that such a name IS found, so a detector that silently stopped matching
 * would fail here instead of passing everything.
 *
 * No model call, no database, no network.
 *
 * Run: npm run test:no-names-to-model
 */

import { analyzeSmallClaimsWithBrain, type SmallClaimsIntelligenceInput } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { runCivilIntakeCanonicalIntegration } from "../../src/lib/case-system/orchestration/civilIntakeCanonicalAdapter";
import { runFamilyIntakeCanonicalIntegration } from "../../src/lib/case-system/orchestration/familyIntakeCanonicalAdapter";
import { mapGuidedIntakeToSmallClaimsInput } from "../../app/builder/_components/guidedIntakeToSmallClaimsInput";

// Names chosen so they cannot appear in any template or source by accident.
const USER = "Zebediah Quartermaine";
const OTHER = "Ottoline Brackenbury";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : ` -- ${detail}`}`);
  if (!ok) failures += 1;
}

/** Everything that would be JSON-serialised into the model prompt. */
function sentText(output: unknown): string {
  const o = output as Record<string, any>;
  const normalized =
    o?.analysis?.intelligence?.normalizedIntake ??
    o?.intelligence?.normalizedIntake ??
    o?.brain?.normalizedIntake ??
    o?.brainOutput?.normalizedIntake ??
    findNormalized(o);
  if (!normalized) throw new Error("could not locate normalizedIntake in output -- update sentText()");
  return JSON.stringify(normalized);
}

function findNormalized(value: unknown, depth = 0): unknown {
  if (!value || typeof value !== "object" || depth > 6) return null;
  const v = value as Record<string, unknown>;
  if ("normalizedIntake" in v && v.normalizedIntake) return v.normalizedIntake;
  for (const child of Object.values(v)) {
    const hit = findNormalized(child, depth + 1);
    if (hit) return hit;
  }
  return null;
}

function hasName(text: string, name: string): boolean {
  const [first, last] = name.split(" ");
  return text.includes(first) || text.includes(last);
}

function smallClaimsInput(story: string): SmallClaimsIntelligenceInput {
  const base = mapGuidedIntakeToSmallClaimsInput(
    { facts: { role: "plaintiff", amountClaimedText: "$2,000", evidenceText: "An invoice." }, answeredIds: [], matchedClaimType: null } as never,
    { province: "Ontario", city: "Ottawa" },
    story,
  );
  return { ...base, yourName: USER, otherParty: OTHER };
}

(async () => {
  // --- Small Claims
  const sc = await analyzeSmallClaimsWithBrain(smallClaimsInput("They never paid my invoice."), { allowExternalCognition: false });
  const scText = sentText(sc);
  check("Small Claims: user's name field is not sent", !hasName(scText, USER));
  check("Small Claims: other party's name field is not sent", !hasName(scText, OTHER));
  check("Small Claims: the model is still told a name was entered", scText.includes("recorded (not shared with AI)"));

  // --- Negative control: a name typed inside the story IS sent.
  const control = await analyzeSmallClaimsWithBrain(
    smallClaimsInput(`${OTHER} never paid my invoice.`),
    { allowExternalCognition: false },
  );
  check("control: a name the user types in their own story is detected in the payload", hasName(sentText(control), OTHER));

  // --- Civil
  const civilBlank = {
    caseStage: "starting-case", issues: [], documents: [], uploadedEvidenceFiles: [],
    yourName: USER, otherParty: OTHER, yourRole: "Plaintiff", courtLocation: "", courtFileNumber: "",
    amountClaimed: "", limitationDeadline: "", facts: "The contractor damaged my basement.", timeline: "",
    evidence: "Photos.", missingEvidence: "", damagesBreakdown: "", legalRemedy: "Repair costs.",
    settlementEfforts: "", serviceDetails: "", urgent: "", humanRightsGrounds: "", discriminationFacts: "",
    accommodationRequests: "", governmentActor: "", publicDecisionOrConduct: "", institutionalFacts: "",
    privacyRecordsFacts: "",
  };
  const civil = await runCivilIntakeCanonicalIntegration(civilBlank as never);
  const civilText = sentText(civil);
  check("Civil: user's name field is not sent", !hasName(civilText, USER));
  check("Civil: other party's name field is not sent", !hasName(civilText, OTHER));

  // --- Family
  const family = await runFamilyIntakeCanonicalIntegration({
    caseStage: "starting-case",
    role: "applicant",
    yourName: USER,
    otherParty: OTHER,
    issues: [],
    filedDocuments: [],
    facts: "We separated last year and need a parenting schedule.",
  } as never);
  const familyText = sentText(family);
  check("Family: user's name field is not sent", !hasName(familyText, USER));
  check("Family: other party's name field is not sent", !hasName(familyText, OTHER));

  console.log(failures ? `\n${failures} failure(s).` : "\nAll checks passed.");
  if (failures) process.exitCode = 1;
})().catch((error) => {
  console.error("verifyNoNamesToModel threw:", error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
