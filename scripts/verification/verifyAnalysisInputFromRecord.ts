/**
 * EVERY ROUTE BUILDS ITS ANALYSIS INPUT FROM THE RECORD PLUS THE FORM'S STATE, THE RECORD WINS (site owner, 14 Nov 2026,
 * item 5 of the decisions on the batch report; batch report item D: the Small Claims form, Family and Civil built the
 * analysis input from their own copies, and the hand-off, page.tsx handleComplete, merged nothing from the record).
 *
 * What it asserts, with no browser, model or database, for each of the four routes (the Small Claims form, Family,
 * Civil, the hand-off):
 *   1. the route builds its input through the one function, chatTurnFacts.ts formAnalysisInput (analysisFactsOf over
 *      the form's boxes), with the case's checkpoint and caseFileOf; no route builds it from its own copy alone;
 *   2. with that route's own input shape, a value held in the record but missing from the form's boxes (the amount, the
 *      other party, what the person wants) is sent at the record's value;
 *   3. a value the person removed is sent empty, never the box's older copy;
 *   4. what the form works out in its own terms (the stage, the side, the issues and documents as labels) and the story
 *      are left as the form has them.
 *
 * WHAT FAILURE THIS CATCHES: an analysis run without an answer the case file holds (the screen shows it, the analysis
 * never saw it), or with an older copy of one the person changed or removed.
 *
 * Run: npm run test:analysis-input-from-record
 */
import { readFileSync } from "node:fs";
import { caseFileOf, CASE_FILE_SECTION } from "../../src/lib/case-system/caseFile/caseFile";
import { formAnalysisInput } from "../../src/lib/case-system/caseFile/chatTurnFacts";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed += 1;
};
const ID = "00000000-0000-4000-8000-000000000741";
const rec = (state: string, seq: number, value?: unknown) => ({ state, seq, at: "2026-11-14T15:00:00.000Z", source: "person", ...(value === undefined ? {} : { value }) });
const cp = (court: Checkpoint["courtPath"], facts: Record<string, unknown>): Checkpoint =>
  ({ version: 1, flowId: ID, courtPath: court, revision: ID, sections: { story: { text: "Synthetic story.", location: { province: "Ontario", city: "Ottawa" } }, [CASE_FILE_SECTION]: { facts } } } as unknown as Checkpoint);
const HELD = { amount: rec("answered", 1, 4200), otherParty: rec("answered", 2, "Jordan Testwood"), wants: rec("answered", 3, "Synthetic: the $4,200 back") };

type Route = { name: string; file: string; wired: RegExp; court: Checkpoint["courtPath"]; input: Record<string, unknown>; expect: Record<string, unknown>; keep: Record<string, unknown> };
const ROUTES: Route[] = [
  {
    name: "the Small Claims form (SmallClaimsIntake.tsx)",
    file: "app/builder/_components/SmallClaimsIntake.tsx",
    wired: /const boxes = formAnalysisInput\(input, checkpointNow, caseFileOf\(checkpointNow, recovery\?\.getSavedMaster\(\) \?\? undefined\)\);\s+const preparedInput: SmallClaimsIntelligenceInput = \{\s+\.\.\.boxes,\s+amountClaimed: boxes\.amountClaimed/,
    court: "small-claims",
    input: { facts: "Synthetic: a contractor kept my money.", amountClaimed: "", otherParty: "", goal: "", timeline: "", caseStage: "responding", yourRole: "defendant", issues: ["contract"], filedDocuments: ["plaintiffs-claim"] },
    expect: { amountClaimed: "4200", otherParty: "Jordan Testwood", goal: "Synthetic: the $4,200 back" },
    keep: { facts: "Synthetic: a contractor kept my money.", caseStage: "responding", yourRole: "defendant", issues: ["contract"], filedDocuments: ["plaintiffs-claim"] },
  },
  {
    name: "Family (FamilyIntake.tsx)",
    file: "app/builder/_components/FamilyIntake.tsx",
    wired: /const familyInput: FamilyMasterCaseInput = formAnalysisInput<FamilyMasterCaseInput>\(\{[\s\S]*?\}, checkpointNow, caseFileOf\(checkpointNow, recovery\?\.getSavedMaster\(\) \?\? undefined\)\);/,
    court: "family",
    input: { caseStage: "starting-case", role: "applicant", issues: ["Parenting time"], filedDocuments: ["Nothing yet"], yourName: "", otherParty: "", childrenInfo: "", facts: "Synthetic: we separated.", timeline: "", evidence: "", goal: "", urgent: "" },
    expect: { otherParty: "Jordan Testwood", goal: "Synthetic: the $4,200 back" },
    keep: { caseStage: "starting-case", role: "applicant", issues: ["Parenting time"], filedDocuments: ["Nothing yet"], facts: "Synthetic: we separated." },
  },
  {
    name: "Civil (CivilIntake.tsx)",
    file: "app/builder/_components/CivilIntake.tsx",
    wired: /const civilAnalysisInput = formAnalysisInput\(civilBoxes, checkpointNow, caseFileOf\(checkpointNow, recovery\?\.getSavedMaster\(\) \?\? undefined\)\);/,
    court: "civil",
    input: { caseStage: "starting-case", yourRole: "plaintiff", issues: ["contract"], filedDocuments: ["nothing"], facts: "Synthetic: unpaid equipment.", otherParty: "", amountClaimed: "", goal: "", timeline: "", evidence: "" },
    expect: { otherParty: "Jordan Testwood", amountClaimed: "4200", goal: "Synthetic: the $4,200 back" },
    keep: { caseStage: "starting-case", yourRole: "plaintiff", issues: ["contract"], filedDocuments: ["nothing"], facts: "Synthetic: unpaid equipment." },
  },
  {
    name: "the hand-off (page.tsx handleComplete)",
    file: "app/builder/page.tsx",
    wired: /const payload: StoredCaseData = \{\s+\.\.\.answered,\s+\.\.\.formAnalysisInput\(\s+\{ yourName: answered\.yourName, otherParty: answered\.otherParty, timeline: answered\.timeline, evidence: answered\.evidence, missingEvidence: answered\.missingEvidence, goal: answered\.goal, urgent: answered\.urgent \},\s+checkpointAtHandOff,\s+caseFileOf\(checkpointAtHandOff,/,
    court: "small-claims",
    input: { yourName: "", otherParty: "", timeline: "", evidence: "", missingEvidence: "", goal: "", urgent: "" },
    expect: { otherParty: "Jordan Testwood", goal: "Synthetic: the $4,200 back" },
    keep: {},
  },
];

for (const route of ROUTES) {
  check(`1. ${route.name}: builds its analysis input through the one function, with the record`, route.wired.test(readFileSync(route.file, "utf8").replace(/\r\n/g, "\n")), route.file);
  const checkpoint = cp(route.court, HELD);
  const sent = formAnalysisInput(route.input, checkpoint, caseFileOf(checkpoint));
  const wrong = Object.entries(route.expect).filter(([key, value]) => JSON.stringify(sent[key]) !== JSON.stringify(value));
  check(`2. ${route.name}: a value held in the record and missing from the form's boxes is sent`, wrong.length === 0, wrong.map(([key]) => `${key}: ${JSON.stringify(sent[key])}`).join("; "));
  const removedCp = cp(route.court, { otherParty: rec("removed", 4) });
  const removed = formAnalysisInput({ ...route.input, otherParty: "Old Copy Ltd." }, removedCp, caseFileOf(removedCp));
  check(`3. ${route.name}: a value the person removed is sent empty, not the box's older copy`, removed.otherParty === "", JSON.stringify(removed.otherParty));
  const changed = Object.entries(route.keep).filter(([key, value]) => JSON.stringify(sent[key]) !== JSON.stringify(value));
  check(`4. ${route.name}: the story and what the form works out in its own terms are left as they are`, changed.length === 0, changed.map(([key]) => `${key}: ${JSON.stringify(sent[key])}`).join("; "));
}

if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
console.log("\nAll checks passed");
