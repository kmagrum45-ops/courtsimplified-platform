/**
 * "No evidence identified" must only be said when it is true.
 *
 * evidenceIntelligenceEngine raises a high-severity "No evidence identified"
 * gap when the normalized intake holds no evidence items. The keyword
 * extractor that fills that list knows seven categories, so a user who listed
 * invoices, contracts, photos, a bill of sale or an affidavit got told they
 * had no evidence. The 2026-09-27 case-review batch showed it in 5 of 10
 * cases. A served defendant's evidence answer was also dropped entirely by
 * the guided mapper, with the same result.
 *
 * Asserts, over the REAL chain the site uses (buildRawUserText ->
 * normalizeIntake -> buildEvidenceIntelligenceAnalysis):
 *   - described evidence, in any wording, never yields the gap;
 *   - no evidence, or "none", still does -- the warning is kept where true;
 *   - a defendant's evidence answer reaches the analysis input.
 *
 * Uses the evidence answers from the batch cases that failed, verbatim, as
 * examples -- not as a list the fix was tuned to. A new category of document
 * passes because the property is "described means counted", not a keyword.
 *
 * Pure -- no model call, no database, no network.
 *
 * Run: npm run test:described-evidence
 */

import { buildRawUserText } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { normalizeIntake } from "../../src/lib/case-system/intelligence/intakeNormalizationEngine";
import { buildEvidenceIntelligenceAnalysis } from "../../src/lib/case-system/evidence/evidenceIntelligenceEngine";
import { mapGuidedIntakeToSmallClaimsInput } from "../../app/builder/_components/guidedIntakeToSmallClaimsInput";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : ` -- ${detail}`}`);
  if (!ok) failures += 1;
}

function inputWithEvidence(evidence: string) {
  return mapGuidedIntakeToSmallClaimsInput(
    { facts: { role: "plaintiff", evidenceText: evidence }, answeredIds: [], matchedClaimType: null } as never,
    { province: "Ontario", city: "Ottawa" },
    "",
  );
}

async function sayNoEvidence(evidence: string): Promise<boolean> {
  const normalized = await normalizeIntake({ rawUserText: buildRawUserText(inputWithEvidence(evidence)) } as never);
  const analysis = buildEvidenceIntelligenceAnalysis({ intake: normalized });
  return analysis.gaps.some((gap) => gap.title === "No evidence identified");
}

const DESCRIBED: Array<[string, string]> = [
  [
    "contractor damage (contract, photos, invoice)",
    "I have four things: (1) plumbing-contract.pdf, the signed $1,400 contract dated May 15, 2026; (2) flood-damage-photos.jpg, photos of the flooded basement from May 21, 2026; (3) restoration-invoice.pdf, the $6,300 restoration invoice; (4) admission-text.pdf, a text where the contractor admits the loose fitting was theirs.",
  ],
  [
    "used vehicle (bill of sale, reports)",
    "I have three things: (1) bill-of-sale.pdf, the signed $54,000 bill of sale with her written no-accidents statement; (2) mechanic-inspection-report.pdf, the mechanic's May 2026 report finding hidden collision repair; (3) appraisal-report.pdf, an independent appraisal valuing the car $18,000 lower.",
  ],
  [
    "post-filing (claim, affidavit, defence, notice)",
    "I have five things: (1) plaintiffs-claim-issued.pdf, the claim as issued May 4, 2026; (2) affidavit-of-service.pdf, proof of service on May 11, 2026; (3) defence-received.pdf, the Defence filed May 28, 2026; (4) settlement-conference-notice.pdf, the notice for the September 15, 2026 conference; (5) migration-completion-report.pdf, my completion report from February 2, 2026.",
  ],
  [
    "dog bite (urgent care record, photo, bill, texts)",
    "I have four things: (1) urgent-care-record.pdf, the June 14, 2026 urgent care record describing the wound and stitches; (2) bite-photo.jpg, a photo of the wound taken the same day; (3) medical-bill.pdf, an itemized bill totalling $740; (4) text-from-owner.pdf, texts from the dog's owner the same evening admitting it was his dog and that it got loose.",
  ],
  ["plain wording, no filenames", "A receipt and some photos I took of the damage."],
];

(async () => {
  for (const [label, evidence] of DESCRIBED) {
    check(`described evidence is counted: ${label}`, !(await sayNoEvidence(evidence)));
  }

  // The warning is kept where it is true.
  check("no evidence at all still yields 'No evidence identified'", await sayNoEvidence(""));
  check("'none' still yields 'No evidence identified'", await sayNoEvidence("None"));

  // A served defendant's evidence answer reaches the analysis input.
  const defendant = mapGuidedIntakeToSmallClaimsInput(
    {
      facts: {
        role: "defendant",
        claimFiled: true,
        claimServed: true,
        defenceEvidenceText: "My original order email confirming the $5,100 price, and a text declining the upgrade.",
        defenceFactsText: "I agree I ordered the set. I disagree with the amount.",
      },
      answeredIds: [],
      matchedClaimType: null,
    } as never,
    { province: "Ontario", city: "Toronto" },
    "",
  );
  check("defendant's evidence answer reaches the analysis input", defendant.evidence.includes("order email"));
  check("defendant's own response reaches the analysis input", defendant.defenceResponse.includes("disagree with the amount"));

  console.log(failures ? `\n${failures} failure(s).` : "\nAll checks passed.");
  if (failures) process.exitCode = 1;
})();
