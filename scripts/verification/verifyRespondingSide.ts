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

import { originatingDocumentRecorded, userIsResponding } from "../../app/builder/_components/respondingSide";
import { orderGroupsForReader, suggestedStageFor, yearChoices } from "../../app/builder/_components/StageAnswerPanel";
import { stepNamedInStory } from "../../src/lib/case-system/stage-map/suggestedStep";
import { ALL_STAGES, findStage } from "../../src/lib/case-system/stage-map/stageMap";

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

// The "your exact step" panel suggests a step from the confirmed stage and
// side. Every suggestion must be a real stage, on the reader's own side.
for (const stage of ["starting-case", "responding", "already-started", "conference", "motion", "trial", "enforcement", "urgent", "not-sure"]) {
  for (const responding of [false, true]) {
    // A confirmed "responding" stage always makes the reader the responding
    // side (userIsResponding), so that pairing cannot occur.
    if (stage === "responding" && !responding) continue;
    const id = suggestedStageFor("small-claims", stage, responding);
    if (!id) continue;
    const found = findStage(id);
    check(`suggested step for ${stage}/${responding ? "responding" : "starting"} exists`, Boolean(found), id);
    if (found && found.side !== "both") {
      check(
        `suggested step for ${stage}/${responding ? "responding" : "starting"} is on the reader's side`,
        responding ? found.side === "defendant" : found.side === "plaintiff",
        `${id} is ${found.side}`,
      );
    }
  }
}
check("a served defendant is shown the defence step", suggestedStageFor("small-claims", "responding", true) === "defendant:served-defence-period-running");
// Civil and family steps all show their deadlines and rules now (2026-10-06),
// so they are suggested too. The property: a suggestion is a real step of
// that court, and a served party is shown the step for answering.
{
  const civil = suggestedStageFor("civil", "responding", true);
  const family = suggestedStageFor("family", "responding", true);
  check("a served civil defendant is shown the defence step", civil === "civil:defendant:served-defence-period-running");
  check("a served family respondent is shown the answer step", family === "family:respondent:served-time-to-answer-running");
  const all = new Set(ALL_STAGES.map((stage) => stage.id));
  const suggestions = (["civil", "family", "small-claims"] as const).flatMap((court) =>
    ["starting-case", "responding", "conference", "motion", "trial", "enforcement"].flatMap((stage) => [true, false].map((r) => suggestedStageFor(court, stage, r))),
  );
  check("every suggested step exists", suggestions.every((id) => !id || all.has(id)), suggestions.filter((id) => id && !all.has(id)).join(", "));
}
{
  const groups = [{ side: "plaintiff", label: "P" }, { side: "defendant", label: "D" }, { side: "both", label: "B" }];
  check("a defendant sees their own questions first", orderGroupsForReader(groups, true)[0].side === "defendant");
  check("a plaintiff sees their own questions first", orderGroupsForReader(groups, false)[0].side === "plaintiff");
  check("no question group is dropped", orderGroupsForReader(groups, true).length === groups.length);
}
{
  // A case already under way is not offered a new claim draft (walkthrough,
  // 2026-10-08: judgment, conference and motion cases were).
  const blank = { courtPath: "small-claims", caseData: null, intakeFacts: null };
  check("a case being started is offered the claim draft", !originatingDocumentRecorded({ ...blank, confirmedStage: "starting-case" }));
  check("no stage recorded: still offered", !originatingDocumentRecorded(blank));
  for (const stage of ["already-started", "conference", "motion", "trial", "enforcement"]) {
    check(`a confirmed "${stage}" case is not offered a new claim`, originatingDocumentRecorded({ ...blank, confirmedStage: stage }));
  }
  check(
    "the stage chosen on the intake counts too",
    originatingDocumentRecorded({ ...blank, caseData: { caseStage: "enforcement", extra: {} } as never }),
  );
}
{
  // A procedural event the person names picks the step (walkthrough 2026-10-08).
  const story = (court: "small-claims" | "civil" | "family", responding: boolean, text: string) => suggestedStageFor(court, "responding", responding, text);
  check("Small Claims: 'noted me in default' is the noted-in-default step", story("small-claims", true, "I never filed anything and the clerk noted me in default last week.") === "defendant:noted-in-default");
  check("civil: 'I have been noted in default'", stepNamedInStory("civil", true, "I have been noted in default.") === "civil:defendant:noted-in-default");
  check("a default judgment already signed", stepNamedInStory("small-claims", true, "They got default judgment against me in May.") === "defendant:default-judgment-against-me");
  check("a default judgment only feared is not", stepNamedInStory("small-claims", true, "I want to file my defence so there is no default judgment.") === "");
  check("family: changing a final support order", stepNamedInStory("family", false, "I lost my job and want to lower the child support order from 2022.") === "family:both:asking-to-change-final-order");
  check("family: served with a motion to change", stepNamedInStory("family", true, "I was served with a motion to change by my ex.") === "family:both:served-with-motion-to-change");
  check("family: a case conference is not a settlement conference", stepNamedInStory("family", true, "now there is a case conference on november 20") === "family:both:case-conference-scheduled");
  check("an ordinary story names nothing, and the stage decides", stepNamedInStory("small-claims", false, "He owes me $4,800 for painting.") === "" && suggestedStageFor("small-claims", "starting-case", false, "He owes me $4,800 for painting.") === "plaintiff:claim-drafted-not-filed");
  const all = new Set(ALL_STAGES.map((stage) => stage.id));
  const named = ["small-claims", "civil", "family"].flatMap((court) => [true, false].flatMap((r) =>
    ["noted me in default", "got default judgment against me", "summary judgment", "motion to change", "served with a motion to change", "trial management conference", "settlement conference", "case conference", "change the support order"].map((t) => stepNamedInStory(court as never, r, t)),
  )).filter(Boolean);
  check("every step a story can name exists", named.every((id) => all.has(id)), named.filter((id) => !all.has(id)).join(", "));
}
{
  // A date with no year: the person is asked which year, never given a guess
  // to count from (site owner, 2026-10-08).
  check("an upcoming date offers this year and next", JSON.stringify(yearChoices("2026-11-20", "2026-10-08")) === JSON.stringify(["2026-11-20", "2027-11-20"]));
  check("a past date offers this year and last", JSON.stringify(yearChoices("2026-10-01", "2026-10-08")) === JSON.stringify(["2026-10-01", "2025-10-01"]));
  const panel = readFileSync(path.join(process.cwd(), "app/builder/_components/StageAnswerPanel.tsx"), "utf8");
  check(
    "a date whose year was not given is answered by choosing the year, not counted from a guess",
    /suggestion && !value && suggestion\.yearAssumed \?[\s\S]{0,800}Which year was that\?[\s\S]{0,600}yearChoices\(/.test(panel),
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll responding-side checks passed.");
