/**
 * The analysis cannot show a user a legal statement no verified source makes.
 *
 * WHAT IT PROTECTS. The AI analysis is live, and it used to write law from
 * the model's general knowledge with no sources and no check. Since
 * 2026-09-29 it is given a per-case pack of verified material (the confirmed
 * claim type's catalogue entries and the stage map's verbatim rule quotes and
 * deadlines) and verifyGroundedCognition gates everything it returns. This
 * suite feeds it deliberate hallucinations and asserts none survive:
 *
 *   - an invented citation id                         -> removed
 *   - a real id with words the source does not say    -> removed
 *   - a legal point dressed up as a plain fact        -> removed
 *   - a form suggestion with no source                -> removed
 *   - "what this evidence proves" with no source      -> replaced with neutral text
 *   - an invented claim element                       -> removed; the verified
 *                                                         catalogue elements shown
 *
 * and that correctly grounded statements DO survive, with the right official
 * link attached -- a gate that removed everything would pass the first half
 * and be useless, so the second half is what proves it is a gate.
 *
 * Runs the unit gate directly, then the same hallucinations end to end
 * through the real Small Claims path via the test seam
 * COURTSIMPLIFIED_TEST_PLANTED_COGNITION (ignored on Vercel and under
 * NODE_ENV=production). No network, no model, no database.
 *
 * Run: npm run test:grounded-analysis
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  buildSourcePack,
  hasLegalContent,
  verifyGroundedCognition,
} from "../../src/lib/case-system/intelligence/groundedCognition";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { renderableProfiles } from "../../src/lib/case-system/claim-types/catalogue";
import { analyzeSmallClaimsWithBrain } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { mapGuidedIntakeToSmallClaimsInput } from "../../app/builder/_components/guidedIntakeToSmallClaimsInput";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : ` -- ${detail}`}`);
  if (!ok) failures += 1;
}

const claimType = CLAIM_TYPES.find((item) => item.id === "sc-claim-unpaid-debt-services")!;
const pack = buildSourcePack({ stage: "already-started", side: "plaintiff", claimTypeId: claimType.id });

// ---- The pack
const deadline = pack.items.find((item) => item.id.startsWith("deadline:"));
const rule = pack.items.find((item) => item.id.startsWith("rule:"));
check("pack: includes the claim type's elements", claimType.plaintiffElements.every((el) => pack.byId.has(`element:${el.id}`)));
check("pack: includes the stage's verbatim rules", Boolean(rule), "no rule item");
check("pack: includes the stage's deadlines", Boolean(deadline), "no deadline item");
check("pack: every item has an official https link", pack.items.every((item) => /^https:\/\//.test(item.sourceUrl)));
check("pack: no stage items for a stage with no mapped positions", buildSourcePack({ stage: "not-sure", side: "plaintiff" }).items.length === 0);

// Connected 2026-09-30: the claim type's defences, and the authored claim-type
// profiles' notice deadlines, are in the pack. Asserted as properties of the
// data, not by id, so adding a defence or a profile never breaks this.
check(
  "pack: every defence the claim type lists is in it",
  claimType.applicableDefenceConceptIds.every((id) => pack.byId.has(`defence:${id}`)),
);
const fallPack = buildSourcePack({ stage: "starting-case", side: "plaintiff", claimTypeId: "sc-claim-slip-and-fall-occupier-liability" });
const noticeProfiles = renderableProfiles().filter(
  (profile) =>
    (profile.notices ?? []).length > 0 &&
    (profile.existingClaimTypeId === "sc-claim-slip-and-fall-occupier-liability" ||
      (profile.alsoRelevantTo ?? []).includes("sc-claim-slip-and-fall-occupier-liability")),
);
check("pack: a slip and fall has claim-barring notice profiles to draw on", noticeProfiles.length > 0);
check(
  "pack: every such profile's notice rule is in the pack, verbatim",
  noticeProfiles.every((profile) =>
    (profile.notices ?? []).every((notice) => fallPack.items.some((item) => item.text === notice.because.quote)),
  ),
);
check(
  "pack: a claim type with no related profile gets no notice items",
  !pack.items.some((item) => item.id.startsWith("notice:")),
);

const quoteOf = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 60);
const good = deadline!;
const goodQuote = quoteOf(good.text);
const element = claimType.plaintiffElements[0];

// ---- The gate, directly
const model = {
  claimClassifications: [
    {
      claimType: "debt",
      status: "detected",
      explanation: "You described doing the work and not being paid.",
      elements: [
        { elementKey: element.id, label: "anything", explanation: "You said you agreed the price by text.", missingFacts: ["A copy of those texts"] },
        { elementKey: "invented-element", label: "Proof of malice", explanation: "The plaintiff must prove malice under s. 12 of the Act." },
      ],
    },
  ],
  litigationRisks: [
    { title: "Invented rule", explanation: "Under Rule 99.99 the claim is barred.", sourceIds: ["rule:made-up:r. 99.99"], quote: "the claim is barred after two weeks" },
    { title: "Misquoted real source", explanation: "The deadline is 90 days.", sourceIds: [good.id], quote: "the deadline is ninety days from anything at all" },
    { title: "Grounded", explanation: "A time limit applies at this stage.", sourceIds: [good.id], quote: goodQuote },
  ],
  formRecommendations: [{ formNumber: "99Z", title: "Form 99Z", reason: "Use this form." }],
  evidenceIssueLinks: [{ issueLabel: "Invoice", requiredProof: "This proves the debt under the Sale of Goods Act.", explanation: "You recorded an invoice." }],
  missingInformation: [{ field: "x", question: "When did you send the invoice?", reason: "You must serve within 6 months under the rules." }],
  nextBestActions: [
    "File your Defence within 20 days of service.",
    "Gather the invoice and your texts in one place.",
    { text: "Watch the time limit that applies now.", sourceIds: [good.id], quote: goodQuote },
  ],
  systemWarnings: ["Anything."],
};

const { cognition, report } = verifyGroundedCognition(model as Record<string, unknown>, pack);
const out = JSON.stringify(cognition);

check("gate: an invented citation is removed", !out.includes("Invented rule"));
check("gate: a real citation with words the source does not say is removed", !out.includes("Misquoted real source"));
check("gate: a correctly grounded risk is kept", out.includes('"title":"Grounded"'));
check("gate: the kept risk carries its official link", (cognition.litigationRisks as { sourceUrl?: string }[])[0]?.sourceUrl === good.sourceUrl);
check("gate: a form with no source is removed", (cognition.formRecommendations as unknown[]).length === 0);
check("gate: a legal next step with no source is removed", !out.includes("File your Defence within 20 days"));
check("gate: a practical next step with no law in it is kept", out.includes("Gather the invoice and your texts"));
check("gate: a grounded next step is kept with its link", JSON.stringify(cognition.nextBestActionSources).includes(good.sourceUrl));
check("gate: an invented claim element is removed", !out.includes("Proof of malice") && !out.includes("invented-element"));
check(
  "gate: a catalogue element is kept under the catalogue's own name and link",
  out.includes(JSON.stringify(element.name).slice(1, -1)) && out.includes(element.sourceUrl),
);
check(
  "gate: every catalogue element is shown even if the model left some out",
  claimType.plaintiffElements.every((el) => out.includes(`"elementKey":"${el.id}"`)),
);
check("gate: unsourced 'what this proves' is replaced", !out.includes("Sale of Goods Act"));
check("gate: a question is kept, its unsourced legal reason replaced", out.includes("When did you send the invoice?") && !out.includes("serve within 6 months"));
check("gate: the model's warnings are never passed on", (cognition.systemWarnings as unknown[]).length === 0);
check("gate: every removal is recorded with a reason", report.dropped.length >= 6 && report.dropped.every((item) => item.reason.length > 0));
check("detector: flags a plain-looking legal statement", hasLegalContent("You have 20 days to respond."));
check("detector: passes a plain fact", !hasLegalContent("You recorded an invoice and some text messages."));

// ---- End to end through the real Small Claims path
(async () => {
  process.env.COURTSIMPLIFIED_TEST_PLANTED_COGNITION = JSON.stringify({
    courtPath: "small-claims",
    province: "Ontario",
    stage: "already-started",
    confidence: "high",
    primaryClaimTypes: ["debt"],
    caseFileRecorded: ["An invoice is recorded."],
    caseFileNotRecorded: [],
    ...model,
  });
  delete process.env.VERCEL_ENV;
  delete process.env.AI_ANALYSIS_TEXT_TO_USERS;

  const input = mapGuidedIntakeToSmallClaimsInput(
    {
      facts: { role: "plaintiff", amountClaimedText: "$2,400", evidenceText: "The invoice.", claimFiled: true },
      answeredIds: [],
      matchedClaimType: { claimTypeId: claimType.id, claimTypeName: claimType.name },
    } as never,
    { province: "Ontario", city: "Ottawa" },
    "I did ten hours of cleaning and was never paid the $2,400 we agreed. I filed my claim last week.",
  );
  const result = JSON.stringify(await analyzeSmallClaimsWithBrain(input, { allowExternalCognition: true }));

  for (const phrase of ["Invented rule", "Misquoted real source", "Rule 99.99", "Form 99Z", "Proof of malice", "Sale of Goods Act", "serve within 6 months", "File your Defence within 20 days"]) {
    check(`end to end: "${phrase}" does not reach the user`, !result.includes(phrase));
  }
  check("end to end: the grounded statement reaches the user", result.includes("A time limit applies at this stage."));
  check("end to end: what was removed is recorded on the analysis", result.includes('"groundingReport"'));

  // ---- The prompt gives the model the pack and the rule
  const brain = readFileSync(path.join(ROOT, "src/lib/case-system/intelligence/courtSimplifiedBrain.ts"), "utf8");
  check("prompt: carries the verified sources", brain.includes("${sourcePackForPrompt("));
  check("brain: every live model response goes through the gate", /verifyGroundedCognition\(\s*structuredCognition/.test(brain));

  delete process.env.COURTSIMPLIFIED_TEST_PLANTED_COGNITION;
  console.log(failures ? `\n${failures} failure(s).` : "\nAll checks passed.");
  if (failures) process.exitCode = 1;
})().catch((error) => {
  console.error("verifyGroundedAnalysis threw:", error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
