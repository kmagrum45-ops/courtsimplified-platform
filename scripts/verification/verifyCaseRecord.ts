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
 *   - a page or route going back to its own reading of these facts: the
 *     overview's stage, the drafts' story, family answers given after a save.
 *
 * COSTS NOTHING: pure functions and source reads.
 *
 * Run: npm run test:case-record
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { documentsOf, readCaseRecord, recordedDateAnswers, storedIntakeValues } from "../../src/lib/case-system/caseRecord";
import { suggestApplicability } from "../../src/lib/case-system/forms/applicabilitySuggestions";
import { stepNamedInStory } from "../../src/lib/case-system/stage-map/suggestedStep";
import { practicalFor } from "../../src/lib/content-library/nextStepPractical";

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

// Firm answers (Step 2B, 2026-10-12): what the person entered or chose is kept
// without asking again; what is read from the story stays a suggestion.
{
  check("a recorded side is a firm answer", responding[0]?.firm === true);
  const remedy = [{ field_path: "formApplicability.smallClaims.requestedRemedyType", choices: [{ value: "ordinary-money-claim" }, { value: "ordinary-property-claim" }, { value: "not-sure" }] }];
  const withAmount = readCaseRecord({ intakeData: { extra: { amountClaimed: "$5,200" } } }, "small-claims");
  const typed = suggestApplicability(remedy, withAmount, {});
  check("an amount they typed is a firm money claim", typed[0]?.value === "ordinary-money-claim" && typed[0]?.firm === true);
  const storyOnly = readCaseRecord({ intakeData: { facts: "The dog bit me and I want them to pay for it.", extra: { story: "The dog bit me and I want them to pay for it." } } }, "small-claims");
  const fromStory = suggestApplicability(remedy, storyOnly, {});
  check("money read from the story is offered, not kept", fromStory[0]?.value === "ordinary-money-claim" && !fromStory[0]?.firm);
  const posture = [{ field_path: "formApplicability.civil.pleadingPosture", choices: [{ value: "defence-to-counterclaim" }, { value: "crossclaim" }] }];
  const counterclaimed = { position: { stepId: "civil:plaintiff:served-with-counterclaim" }, intakeData: { courtPath: "civil" } };
  const pleading = suggestApplicability(posture, readCaseRecord(counterclaimed, "civil"), counterclaimed);
  check("the step they picked settles the pleading", pleading[0]?.value === "defence-to-counterclaim" && pleading[0]?.firm === true);
  const mortgage = [{ field_path: "formApplicability.civil.isMortgageForeclosure", choices: yesNo }];
  const noMention = readCaseRecord({ intakeData: { courtPath: "civil", extra: { civilInput: { facts: "I sued my business partner." } } } }, "civil");
  check("what the story doesn't mention stays a suggestion", suggestApplicability(mortgage, noMention, {})[0]?.firm !== true);
  const forms = readFileSync(path.join(process.cwd(), "app/forms/FormsWorkspace.tsx"), "utf8");
  check("the forms page keeps only firm answers without asking", /suggestion\.firm &&/.test(forms) && /void saveApplicability\(patch, reasons\)/.test(forms));
  check("a kept answer shows where it came from, with Change", /From your case: \{keptReason\}/.test(forms) && /keptFromCase\[question\.field_path\] \?\?/.test(forms));
  check("a firm answer shows as kept while it saves, never as an empty question (2026-10-13)", /const firmNow = suggestedAnswers\.find/.test(forms) && /"Saving to your case\."/.test(forms));
}

{
  // Held-back walkthrough, 2026-10-09: the Forms page asked what the recorded
  // money claim and the described lawsuit already answered.
  const base = readCaseRecord({}, "small-claims");
  const withAmount = { ...base, amount: "$5,200", story: "the guy wont answer my texts now" };
  const kind = suggestApplicability(
    [{ field_path: "formApplicability.smallClaims.requestedRemedyType", choices: [{ value: "ordinary-money-claim" }, { value: "ordinary-property-claim" }] }],
    withAmount,
    {},
  );
  check("a recorded amount is offered 'money claim'", kind[0]?.value === "ordinary-money-claim");
  const civil = { ...readCaseRecord({}, "civil"), story: "i sued my former business partner for 110000" };
  const answers = suggestApplicability(
    ["isGeneralAction", "isMortgageForeclosure", "isCommencedByNoticeOfAction"].map((name) => ({ field_path: `formApplicability.civil.${name}`, choices: yesNo })),
    civil,
    {},
  );
  check("suing is offered 'general action: yes'", answers.find((a) => a.fieldPath.endsWith("isGeneralAction"))?.value === true);
  check("no mortgage in the story is offered 'not a foreclosure'", answers.find((a) => a.fieldPath.endsWith("isMortgageForeclosure"))?.value === false);
  const mortgage = suggestApplicability([{ field_path: "formApplicability.civil.isMortgageForeclosure", choices: yesNo }], { ...civil, story: "the bank is selling under power of sale on my mortgage" }, {});
  check("a story about a mortgage is not answered for them", mortgage.length === 0);
}

// ---- coming back to update the intake ---------------------------------------
const stored = storedIntakeValues({
  position: { confirmedStage: "responding" },
  intakeData: {
    courtPath: "civil",
    facts: "Court path: Civil\nUser role: defendant\nMain story: I was served.",
    caseStage: "starting-case",
    extra: { yourRole: "defendant", amountClaimed: "$75,000", documents: ["Statement of Claim already filed / served"], civilInput: { yourName: "Sam" } },
  },
});
check("the form reopens with the person's role, amount and documents", stored.yourRole === "defendant" && stored.amountClaimed === "$75,000" && Array.isArray(stored.documentStatus));
check("the form reopens with their story, not the labelled record", stored.facts === "I was served.");
check("the confirmed stage wins over the intake's", stored.caseStage === "responding");
check("nothing entered, nothing filled", Object.keys(storedIntakeValues({})).length === 0);

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
check(
  "the overview shows the stage the person confirmed",
  /confirmedStage=\{/.test(read("app/cases/[id]/page.tsx")) && /confirmedStage=\{/.test(builder) && /confirmedStage \|\| analysis\.caseStage/.test(read("app/builder/_components/IntelligenceOverviewPanel.tsx")),
);
check("family answers given after the save are saved", /familyStatus: triageState \} \}\)/.test(builder));
check(
  "a timeline step whose date the case holds is filled in",
  /recordedDates=\{recordedDateAnswers\(record\)\}/.test(read("app/cases/[id]/timeline/page.tsx")) &&
    /EVENT_TO_DATE_QUESTION\[eventType\]/.test(read("app/builder/_components/EventCandidateSurface.tsx")),
);
check("both form intakes reopen with what the case holds", (builder.match(/storedValues=\{queryCaseId \? storedIntakeValues\(/g) ?? []).length === 2);
// Key dates on the timeline for every court (Step 2A, 2026-10-12): civil and
// family had none, because recording steps is Small Claims only.
{
  const timeline = readFileSync(path.join(process.cwd(), "app/cases/[id]/timeline/page.tsx"), "utf8");
  check("the timeline lists the case's key dates for every court, from the one record", /<KeyDates record=\{record\} courtPath=\{courtPath\} \/>/.test(timeline) && /Object\.entries\(record\.dates\)/.test(timeline));
  check("the key dates are not limited to Small Claims", !/canRecord \? \(\s*<KeyDates/.test(timeline));
}

// Family too (Step 2A, 2026-10-12): it opened blank on "Update your story".
{
  const family = readFileSync(path.join(process.cwd(), "app/builder/_components/FamilyIntake.tsx"), "utf8");
  check("the family intake reopens with what the case holds", /storedIntake=\{queryCaseId \? asRecord\(existingMasterResult\)\.intakeData : undefined\}/.test(builder) && /savedFamilyValues\(storedIntake\)/.test(family));
  for (const field of ["yourName", "otherParty", "facts", "goal", "childrenInfo", "issues", "filedDocuments", "upcomingCourtDate"]) {
    check(`the family form starts ${field} from the saved case`, new RegExp(`saved\\?\\.${field}`).test(family));
  }
}
for (const file of ["caseDrafts.ts", "respondingDocumentDraft.ts", "startingDocumentDraft.ts"]) {
  const source = read(`src/lib/case-system/drafts/${file}`);
  check(`${file} drafts from the person's own story, not the labelled record`, /userStory\(intake\)/.test(source) && !/intake\.facts\?\.trim\(\)|\[intake\.facts \|\||text\(intake\.facts\)/.test(source));
}

{
  // 2026-10-13, walkthrough: the family steps that decide the form.
  const step = (story: string) => stepNamedInStory("family", false, story);
  check(
    "an existing order the person wants lowered is a motion to change",
    step("i pay 900 a month child support from a court order in 2022. i lost my job in july and now im on EI making way less. i cant keep paying 900. how do i get it lowered") ===
      "family:both:asking-to-change-final-order",
  );
  check("'the court order says every other weekend and i want it changed' is a motion to change", step("the court order says every other weekend and i want it changed") === "family:both:asking-to-change-final-order");
  check("no order yet is not a motion to change", step("there is no court order yet and i want to change the schedule") === "");
  check("a temporary order is not a motion to change", step("we have a temporary order and i want it changed") === "");
  check("an order that isn't being followed, with no change wanted, is not a motion to change", step("there is a court order for support but he never pays") === "");
  const start = practicalFor("family:before-filing:deciding-where-to-start", "family", "Ottawa", false);
  check("starting a family case names the application forms", Boolean(start?.forms.some((form) => form.number === "8")) && Boolean(start?.forms.some((form) => form.number === "8A")));
  check("starting a family case shows the fee, filing and service", Boolean(start?.fees.length && start.filing.length && start.serving.length));
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll case-record checks passed.");
