/**
 * The document that STARTS a case is never offered to the side responding to it.
 *
 * COSTS NOTHING. A pure function plus a source scan of the builder page.
 *
 * WHY. Page walkthrough, 2026-10-04: a Small Claims defendant who had been
 * served, and had confirmed "I was served and need to respond", was offered
 * "Create Plaintiff's Claim draft (Form 7A)". The buttons only checked whether
 * the starting document was already filed, which a defendant's record does
 * not say.
 *
 * Asserts properties: every responding signal (confirmed stage, intake role,
 * guided role) is recognised in each court's words; the starting side is not
 * mistaken for the responding side; and every starting-document draft button
 * on the builder is gated on the combined check, so a new one cannot be added
 * ungated.
 *
 * Run: node --import tsx scripts/verification/verifyRespondingSide.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { userIsResponding } from "../../app/builder/_components/respondingSide";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`PASS ${name}`);
  else {
    failures += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const withRole = (yourRole: string) =>
  ({ extra: { yourRole } }) as unknown as Parameters<typeof userIsResponding>[0]["caseData"];

for (const role of ["Defendant / responding party", "defendant", "respondent", "responding-party"]) {
  check(`role "${role}" is the responding side`, userIsResponding({ confirmedStage: null, caseData: withRole(role), intakeFacts: null }));
}
for (const role of ["Plaintiff / claimant", "plaintiff", "applicant", "not-sure", ""]) {
  check(`role "${role || "(none)"}" is not the responding side`, !userIsResponding({ confirmedStage: null, caseData: withRole(role), intakeFacts: null }));
}
check("a confirmed 'responding' stage is the responding side", userIsResponding({ confirmedStage: "responding", caseData: null, intakeFacts: null }));
check("the guided intake's defendant role is the responding side", userIsResponding({ confirmedStage: null, caseData: null, intakeFacts: { role: "defendant" } }));
check("starting a case is not the responding side", !userIsResponding({ confirmedStage: "starting-case", caseData: null, intakeFacts: { role: "plaintiff" } }));

const page = readFileSync(path.join(process.cwd(), "app/builder/page.tsx"), "utf8");
// Each button's render condition: the text between the last "{COURT_DOCUMENT_DRAFTING_ENABLED"
// before the button label and the "? (" that opens the button.
const buttons = [...page.matchAll(/Create ([^<{]+?) draft/g)]
  .filter((match) => !page.slice(Math.max(0, (match.index ?? 0) - 3), match.index).includes('"'))
  .map((match) => {
    const before = page.slice(0, match.index);
    const start = before.lastIndexOf("{COURT_DOCUMENT_DRAFTING_ENABLED");
    const end = before.indexOf("? (", start);
    return ["", start >= 0 && end > start ? before.slice(start, end) : "", match[1]] as const;
  })
  .filter(([, condition]) => condition.length > 0 && condition.length < 400);
check("the builder has starting-document draft buttons to check", buttons.length >= 3, `found ${buttons.length}`);
for (const [, condition, label] of buttons) {
  check(`"Create ${label.trim()} draft" is offered only to the starting side`, /offerOriginatingDraft/.test(condition), condition.trim());
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll responding-side checks passed.");
