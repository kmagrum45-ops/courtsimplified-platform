/**
 * The case record reads every fact from wherever the intake that wrote it put
 * it, a confirmed answer wins over an intake one, and the pages read it
 * instead of asking again. Master plan Phase 1 (docs/MASTER_PLAN.md).
 *
 * WHY (2026-10-07). The Phase 1 inventory found the builder reading filed
 * documents from a key that does not exist (so most cases saved no filing
 * facts and the timeline said "not enough recorded"), the Forms page asking
 * "Are you responding to a Plaintiff's Claim?" of a recorded defendant, a
 * re-save erasing the Forms answers, the Deadlines view counting nothing
 * until a step was picked by hand, and a returning user re-confirming their
 * stage on every re-run.
 *
 * WHAT IT CATCHES:
 *   - a documents list missed in any of the three places intakes write it;
 *   - the side read wrongly, or an intake answer beating a confirmed one;
 *   - a guided date lost, or beating a date confirmed on the case page;
 *   - a Forms suggestion that the question does not offer, or one made
 *     without a recorded fact behind it;
 *   - a page or route going back to its own reading of these facts.
 *
 * COSTS NOTHING: pure functions and source reads.
 *
 * Run: npm run test:case-record
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { documentsOf, readCaseRecord, recordedDateAnswers } from "../../src/lib/case-system/caseRecord";
import { suggestApplicability } from "../../src/lib/case-system/forms/applicabilitySuggestions";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`ok    ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

// ---- documents, wherever they were written ---------------------------------
const served = "plaintiffs-claim";
check("Small Claims extra.filedDocuments", documentsOf({ extra: { filedDocuments: [served] } }).length === 1);
check("civil extra.documents", documentsOf({ extra: { documents: ["Statement of Claim already filed / served"] } }).length === 1);
check("civil civilInput.documents", documentsOf({ extra: { civilInput: { documents: ["x"] } } }).length === 1);
check("nothing recorded", documentsOf({ extra: {} }).length === 0);

// ---- side ------------------------------------------------------------------
const side = (master: unknown) => readCaseRecord(master, "small-claims").side;
check("a recorded defendant is responding", side({ intakeData: { extra: { yourRole: "Defendant / responding party" } } })?.value === "responding");
check("a family applicant is starting", readCaseRecord({ intakeData: { extra: { yourRole: "applicant" } } }, "family").side?.value === "starting");
check(
  "a confirmed stage wins over the intake's role",
  side({ position: { confirmedStage: "responding" }, intakeData: { extra: { yourRole: "Plaintiff / claimant" } } })?.source === "confirmed",
);
check("no role, no stage: unknown, not guessed", side({ intakeData: { extra: {} } }) === null);

// ---- dates -----------------------------------------------------------------
const record = readCaseRecord(
  {
    position: { dateAnswers: { "sc-date-claim-served": "2026-09-20" } },
    intakeAnswers: [
      { questionId: "sc-date-claim-served", answerText: "September 18, 2026" },
      { questionId: "sc-date-injury", answerText: "January 13, 2025" },
    ],
  },
  "small-claims",
);
check("a date confirmed on the case page wins", record.dates["sc-date-claim-served"]?.value === "2026-09-20");
check("a guided date is kept", record.dates["sc-date-injury"]?.value === "2025-01-13" && record.dates["sc-date-injury"].source === "guided");
check("the record gives every date as an answer", Object.keys(recordedDateAnswers(record)).length >= 2);

// ---- Forms suggestions -------------------------------------------------------
const yesNo = [{ value: true }, { value: false }];
const defendant = readCaseRecord({ intakeData: { extra: { yourRole: "Defendant / responding party" } } }, "small-claims");
const responding = suggestApplicability(
  [{ field_path: "formApplicability.smallClaims.respondingToPlaintiffsClaim", choices: yesNo }],
  defendant,
  {},
);
check("a recorded defendant is offered 'yes, responding'", responding[0]?.value === true && /responding/.test(responding[0]?.reason ?? ""));
const neverMarried = { familyStatus: { record: { marriedToOtherParty: "no" } } };
const divorce = suggestApplicability(
  [{ field_path: "formApplicability.family.isDivorceApplication", choices: yesNo }],
  readCaseRecord(neverMarried, "family"),
  neverMarried,
);
check("never married is offered 'not a divorce application'", divorce[0]?.value === false);
check(
  "no suggestion without a recorded fact",
  suggestApplicability([{ field_path: "formApplicability.smallClaims.respondingToPlaintiffsClaim", choices: yesNo }], readCaseRecord({}, "small-claims"), {}).length === 0,
);
check(
  "never a value the question does not offer",
  suggestApplicability([{ field_path: "formApplicability.smallClaims.respondingToPlaintiffsClaim", choices: [{ value: "yes" }] }], defendant, {}).length === 0,
);

// ---- the pages read the record ------------------------------------------------
const root = path.resolve(__dirname, "../..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const builder = read("app/builder/page.tsx");
check("the builder takes filing facts from where intakes write documents", /filingFactsFromDocuments\(documentsOf\(/.test(builder));
check("a re-save keeps the Forms answers and the guided answers", /"formApplicability"/.test(builder) && /"intakeAnswers"/.test(builder));
check("the Deadlines view falls back to the step the confirmed stage points to", /suggestedStageFor\(/.test(read("app/api/workspace/organisation/route.ts")));
check("the case pages carry the record", /readCaseRecord\(/.test(read("app/cases/[id]/layout.tsx")));
check("the Forms route offers answers from the record", /suggestApplicability\(/.test(read("app/api/cases/form-applicability/route.ts")));
check("the Forms page uses the case's step, not its own", !/suggestedStageFor/.test(read("app/cases/[id]/forms/page.tsx")));

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll case-record checks passed.");
