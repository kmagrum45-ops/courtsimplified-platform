/**
 * The amount claimed and the amount asked for must agree, or the user is told.
 *
 * Found 2026-09-27: a case-review story claimed $6,200 and asked the court to
 * order $5,000, and the output never said so. amountConsistency.ts now warns.
 *
 * Asserts the property in both directions:
 *   - two different figures produce the warning, naming both;
 *   - agreeing figures, a restated figure with an extra ("plus the $102 filing
 *     fee"), a date in the outcome ("by June 15, 2026"), or no "$" figure at
 *     all produce nothing -- a check that cries wolf teaches users to ignore it;
 *   - the warning survives the real chain: guided mapper -> buildRawUserText ->
 *     analyzeSmallClaimsWithBrain (model call OFF), so a renamed label in
 *     buildRawUserText fails here instead of silently disabling the check.
 *
 * The claimed/requested pairs are the ten case-review answers, verbatim. Only
 * the one built to disagree may be flagged.
 *
 * No model call, no database, no network.
 *
 * Run: npm run test:amount-consistency
 */

import { claimedVersusRequestedMismatch } from "../../src/lib/case-system/intelligence/amountConsistency";
import { analyzeSmallClaimsWithBrain } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { mapGuidedIntakeToSmallClaimsInput } from "../../app/builder/_components/guidedIntakeToSmallClaimsInput";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : ` -- ${detail}`}`);
  if (!ok) failures += 1;
}

const BATCH: Array<[string, string, string, boolean]> = [
  ["non-payment goods", "$6,200", "I want the court to order Renata Fields to pay the full $6,200, plus my court costs.", false],
  ["breach, cabinets", "$4,900", "I want the court to order Thornbury Millwork to refund my $4,900 deposit, or pay to fix the cabinets to the agreed height.", false],
  ["dog bite", "$1,200, covering my medical costs and the damaged clothing.", "I want the court to order Marcus Delray to pay $1,200 to cover my medical costs and the damaged clothing.", false],
  ["slip and fall", "$4,500, covering medical costs, physiotherapy, and time missed from work.", "I want the court to order the City of Ottawa to pay $4,500 for my medical costs, physiotherapy, and lost wages.", false],
  ["contractor damage", "$6,300", "I want the court to order Deep River Plumbing to pay the $6,300 restoration cost.", false],
  ["towing", "$410", "I want the court to order Rapid Fleet Towing to refund the $410 I paid to get my car back.", false],
  ["used vehicle", "$54,000", "I want the court to order Priya Nandakumar to refund the full $54,000 purchase price.", false],
  ["post-filing", "$12,500", "I want the court to order Northshore Logistics to pay the full $12,500 invoice, plus my court costs.", false],
  ["CONTRADICTION", "$6,200", "I want the court to order Larkspur Variety to pay the $5,000 they owe me.", true],
];

for (const [label, claimed, requested, shouldFlag] of BATCH) {
  const flagged = claimedVersusRequestedMismatch(claimed, requested) !== null;
  check(`${label}: ${shouldFlag ? "flagged" : "not flagged"}`, flagged === shouldFlag);
}

check("restated figure plus an extra is not flagged", claimedVersusRequestedMismatch("$8,400", "Pay $8,400 plus the $102 filing fee.") === null);
check("a date in the outcome is not read as money", claimedVersusRequestedMismatch("$3,000", "Return my deposit by June 15, 2026.") === null);
check("no $ figure in the outcome is not flagged", claimedVersusRequestedMismatch("$3,000", "Return my property.") === null);
check("unformatted claim still compares", claimedVersusRequestedMismatch("$6200", "Pay $6,200.") === null);

(async () => {
  const input = mapGuidedIntakeToSmallClaimsInput(
    {
      facts: {
        role: "plaintiff",
        amountClaimedText: "$6,200",
        remedySoughtText: "I want the court to order Larkspur Variety to pay the $5,000 they owe me.",
        evidenceText: "The invoice for $7,500 and the engagement email.",
      },
      answeredIds: [],
      matchedClaimType: null,
    } as never,
    { province: "Ontario", city: "Peterborough" },
    "They owe me around $5,000. This is an unpaid invoice.",
  );
  const { analysis } = await analyzeSmallClaimsWithBrain(input, { allowExternalCognition: false });
  const warning = (analysis.userWarnings ?? []).find((w) => w.includes("Confirm which figure is correct"));
  check("end to end: the warning reaches userWarnings", Boolean(warning), JSON.stringify(analysis.userWarnings));
  check("end to end: it names both figures", Boolean(warning?.includes("$6,200") && warning?.includes("$5,000")), warning);

  const agreeing = mapGuidedIntakeToSmallClaimsInput(
    { facts: { role: "plaintiff", amountClaimedText: "$6,300", remedySoughtText: "Pay the $6,300 restoration cost." }, answeredIds: [], matchedClaimType: null } as never,
    { province: "Ontario", city: "Windsor" },
    "",
  );
  const agreeingOut = await analyzeSmallClaimsWithBrain(agreeing, { allowExternalCognition: false });
  check(
    "end to end: agreeing figures add no warning",
    !(agreeingOut.analysis.userWarnings ?? []).some((w) => w.includes("Confirm which figure is correct")),
  );

  console.log(failures ? `\n${failures} failure(s).` : "\nAll checks passed.");
  if (failures) process.exitCode = 1;
})();
