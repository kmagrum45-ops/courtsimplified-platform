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
import { stepNamedInStory, suggestedStageFor } from "../../src/lib/case-system/stage-map/suggestedStep";
import { caseStepFor } from "../../src/lib/case-system/caseStep";
import { practicalFor } from "../../src/lib/content-library/nextStepPractical";
import { updateMasterResult } from "../../src/lib/case-system/updateCaseRecord";

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
  // A defendant's own request for the other side to pay them answers "Are
  // you making a Defendant's Claim?" as a suggestion with the words quoted
  // (walkthrough 2026-10-13, R7: asked cold after the intake recorded the
  // request for repair money). The property, over several wordings: a
  // defendant who asks for money back is offered "yes" and never a kept
  // answer; the plaintiff's own demand, a "no", or a plaintiff offers nothing.
  {
    const claimQuestion = [{ field_path: "formApplicability.smallClaims.isMakingDefendantsClaim", choices: yesNo }];
    const asDefendant = (words: { story?: string; answers?: string[]; goal?: string }) => {
      const master = {
        intakeData: { extra: { yourRole: "Defendant / responding party", story: words.story ?? "", goal: words.goal }, facts: words.story ?? "" },
        intakeAnswers: (words.answers ?? []).map((answerText, index) => ({ questionId: `q-${index}`, answerText })),
      };
      return suggestApplicability(claimQuestion, readCaseRecord(master, "small-claims"), master);
    };
    const asking = [
      { answers: ["I got another estimate for $5,200 and I want him to pay for the repairs."] },
      { story: "He is suing me. I want to claim back what I paid." },
      { goal: "Dispute the claim and counterclaim for the leak damage." },
      { answers: ["Yes, I want to sue him back for the cost of fixing it."] },
      { answers: ["I want to dispute it and maybe have him pay for the repairs."] },
      { answers: ["He should pay for fixing the shower, it cost me $5,200."] },
    ];
    for (const words of asking) {
      const found = asDefendant(words)[0];
      const quoted = [words.story, words.goal, ...(words.answers ?? [])].filter(Boolean).join(" ");
      check(
        `a defendant asking for money back is offered a defendant's claim: ${JSON.stringify(words).slice(0, 70)}`,
        found?.value === true && !found.firm && /You wrote: “/.test(found.reason) && quoted.includes(found.reason.replace(/^You wrote: “|”$/g, "").replace(/…$/, "")),
        JSON.stringify(found),
      );
    }
    for (const words of [
      { story: "a contractor is suing me in small claims for 7500 he says i owe" },
      { answers: ["I don't want him to pay me anything, I just want this over."] },
    ]) {
      check(`no defendant's claim offered from ${JSON.stringify(words).slice(0, 70)}`, asDefendant(words).length === 0);
    }
    const plaintiffMaster = { intakeData: { extra: { yourRole: "Plaintiff / claimant" } }, intakeAnswers: [{ questionId: "q", answerText: "I want him to pay for the repairs." }] };
    check("a plaintiff is never offered a defendant's claim", suggestApplicability(claimQuestion, readCaseRecord(plaintiffMaster, "small-claims"), plaintiffMaster).length === 0);
    const considering = { position: { stepId: "defendant:considering-defendants-claim" }, intakeData: { extra: { yourRole: "Defendant / responding party" } } };
    const chosen = suggestApplicability(claimQuestion, readCaseRecord(considering, "small-claims"), considering)[0];
    check("the step 'considering a defendant's claim' settles it", chosen?.value === true && chosen.firm === true);
  }
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
// Since 2026-10-13 (R5) the route takes its step from caseStepFor; the
// property is that with no step chosen the confirmed stage still gives one.
check(
  "the Deadlines view falls back to the step the confirmed stage points to",
  /caseStepFor\(ownedCase\.master_result/.test(read("app/api/workspace/organisation/route.ts")) &&
    caseStepFor({ position: { confirmedStage: "responding" }, intakeData: { extra: { yourRole: "Defendant" } } }, "small-claims", true) ===
      suggestedStageFor("small-claims", "responding", true, ""),
);
check("the case pages carry the record", /readCaseRecord\(/.test(read("app/cases/[id]/layout.tsx")));
check("the Forms route offers answers from the record", /suggestApplicability\(/.test(read("app/api/cases/form-applicability/route.ts")));
check("the Forms page uses the case's step, not its own", !/suggestedStageFor/.test(read("app/cases/[id]/forms/page.tsx")));
check(
  "the overview shows the stage the person confirmed",
  /confirmedStage=\{/.test(read("app/cases/[id]/page.tsx")) && /confirmedStage=\{/.test(builder) && /confirmedStage \|\| analysis\.caseStage/.test(read("app/builder/_components/IntelligenceOverviewPanel.tsx")),
);
check("family answers given after the save are saved, only over what was read", /updateMasterResult\(supabase, \{ caseId: id \}/.test(builder) && /familyStatus: triageState \}/.test(builder));
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

// 2026-10-13: a write that lost the race reads again and re-applies its change
// on top, instead of erasing the other save. A fake database: the first write
// finds the row changed (another save landed), the second goes through.
async function raceCheck() {
  let stored: { master_result: Record<string, unknown>; updated_at: string } = { master_result: { position: { confirmedStage: null } }, updated_at: "t1" };
  let writes = 0;
  const fake = {
    from: () => {
      const filters: Record<string, string> = {};
      let values: Record<string, unknown> | null = null;
      const chain = {
        eq(column: string, value: string) {
          filters[column] = value;
          return chain;
        },
        async maybeSingle() {
          return { data: { ...stored }, error: null };
        },
        async select() {
          writes += 1;
          if (writes === 1) {
            // Another save (the person confirming their stage) lands first.
            stored = { master_result: { ...stored.master_result, position: { confirmedStage: "responding" } }, updated_at: "t2" };
          }
          if (filters.updated_at !== stored.updated_at) return { data: [], error: null };
          stored = { master_result: values as Record<string, unknown>, updated_at: "t3" };
          return { data: [{ id: "c" }], error: null };
        },
      };
      return {
        select: () => chain,
        update: (next: Record<string, unknown>) => {
          values = next.master_result as Record<string, unknown>;
          return chain;
        },
      };
    },
  };
  const result = await updateMasterResult(fake, { caseId: "c" }, (master) => ({ ...master, casePicture: { read: true } }));
  check("a save that lost the race tries again and succeeds", result.ok && writes === 2);
  check("the other save's stage survives", (stored.master_result.position as { confirmedStage: string }).confirmedStage === "responding");
  check("and this save's change is there too", Boolean(stored.master_result.casePicture));
  for (const [file, pattern] of [
    ["app/api/case/read/route.ts", /updateMasterResult\(supabase, \{ caseId, userId: user\.id \}/],
    ["app/api/cases/drafts/route.ts", /updateMasterResult\(owned\.supabase/],
    ["app/api/cases/form-applicability/route.ts", /updateMasterResult\(supabase, \{ caseId \}/],
  ] as const) {
    check(`${file} writes through updateMasterResult`, pattern.test(read(file)));
  }
}
void raceCheck().then(() => {
  if (failures > 0) {
    console.log(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll case-record checks passed.");
});
