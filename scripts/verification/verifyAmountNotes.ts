/**
 * The amount the user recorded is set against the court's money limits at
 * the step where they start their claim -- correctly on each side of each
 * limit, conditionally, and with its provisions.
 *
 * WHY (page review, 2026-10-07). The civil plaintiff who recorded $60,000 got
 * Rule 76 and the Small Claims limit only in general terms; a lawyer would
 * have told her which applied to her figure.
 *
 * WHAT IT CATCHES:
 *   - the wrong side of $50,000 or $200,000 (the limits are "or less", so the
 *     limit itself is inside);
 *   - Rule 76 said to apply without the only-money-or-property condition;
 *   - a note without its provisions, or at a step where nothing is started;
 *   - a note for a defendant's step, or for an amount that is not a number;
 *   - the amount read from the wrong place on a saved intake;
 *   - a page that shows the step answer no longer passing the amount.
 *
 * COSTS NOTHING: pure functions and source reads. Quotes in the cited
 * provisions are checked against the corpus by test:stage-map.
 *
 * Run: npm run test:amount-notes
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { amountNoteFor, recordedAmountOf } from "../../src/lib/case-system/amountNotes";
import { isInScope } from "../../src/lib/case-system/policy/a2iScope";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`ok    ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const START = "civil:plaintiff:claim-drafted-not-issued";
const pins = (amount: string, stepId = START, courtPath = "civil") =>
  (amountNoteFor({ courtPath, stepId, recordedAmount: amount })?.sources ?? []).map((s) => s.pinpoint);
const text = (amount: string, stepId = START, courtPath = "civil") =>
  amountNoteFor({ courtPath, stepId, recordedAmount: amount })?.text ?? "";

if (!isInScope("caseSpecificDeadlines")) {
  check("switched off: no note", amountNoteFor({ courtPath: "civil", stepId: START, recordedAmount: "$60,000" }) === null);
} else {
  check("$50,000 itself is within the Small Claims limit", pins("$50,000").includes("s. 23 (1.1)"), JSON.stringify(pins("$50,000")));
  check("$50,000.01 is over it", !pins("50000.01").includes("s. 23 (1.1)") && pins("50000.01").includes("r. 76.02 (1)"));
  check("$200,000 itself is under Rule 76", text("$200,000").includes("must go under") && !pins("$200,000").includes("r. 76.02 (3)"));
  check("over $200,000 Rule 76 is optional", pins("$200,001").includes("r. 76.02 (3)") && text("$200,001").includes("not required"));
  for (const amount of ["$30,000", "$60,000", "$250,000"]) {
    const note = text(amount);
    check(`${amount}: the amount is quoted back`, note.includes(amount.replace("$", "$")), note);
    check(`${amount}: Rule 76 only on the money-or-property condition, or as an option`, /only for money or property|not required/.test(note), note);
    check(`${amount}: the claim must say so`, pins(amount).includes("r. 76.02 (4)"));
    check(`${amount}: interest and costs excluded`, note.includes("do not count interest and costs"));
  }
  check("no note at a defendant's step", amountNoteFor({ courtPath: "civil", stepId: "civil:defendant:served-defence-period-running", recordedAmount: "$75,000" }) === null);
  check("no note for words", amountNoteFor({ courtPath: "civil", stepId: START, recordedAmount: "about sixty thousand" }) === null);
  check("Small Claims over the limit points to its step", text("$80,000", "before-filing:deciding-whether-to-sue", "small-claims").includes("more than the limit"));
  check("Small Claims within the limit: nothing to add", amountNoteFor({ courtPath: "small-claims", stepId: "before-filing:deciding-whether-to-sue", recordedAmount: "$4,800" }) === null);
}

check("civil save: extra.amountClaimed", recordedAmountOf({ extra: { amountClaimed: "$60,000" } }) === "$60,000");
check("civil save: civilInput", recordedAmountOf({ extra: { civilInput: { amountClaimed: "60000" } } }) === "60000");
check(
  "Small Claims save: the record line",
  recordedAmountOf({ facts: "Small Claims Ontario intake\n\nAmount claimed or disputed: $4,800.00\n\nFacts: x" }) === "$4,800.00",
);
check("nothing recorded", recordedAmountOf({ facts: "Court path: Civil" }) === "");

const root = path.resolve(__dirname, "../..");
for (const file of ["app/builder/page.tsx", "app/cases/[id]/page.tsx"]) {
  check(`${file} passes the recorded amount`, readFileSync(path.join(root, file), "utf8").includes("recordedAmount={recordedAmountOf("));
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll amount-note checks passed.");
