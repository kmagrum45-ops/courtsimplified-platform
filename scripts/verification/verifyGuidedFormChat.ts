/**
 * One question at a time for family and civil (GuidedFormChat, build order
 * Step 2C, 2026-10-12).
 *
 * WHAT IT CATCHES: a question asked whose field already holds an answer (the
 * repeat-question failure the walkthrough scored 0 of 10 on), a question
 * whose answer never reaches the form (a key with no setter), a choice the
 * form itself doesn't offer, a question with no "why", and either intake
 * dropping the one-at-a-time view. (Review 2026-10-13) a family service date
 * kept with no year, so the step page asks "Which year was that?"; a "why"
 * that states what a time limit is counted from (law, with no source).
 *
 * COSTS NOTHING: no network, no model.
 *
 * Run: npm run test:guided-form-chat
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { acknowledgement, answerNeedsMore, isAnswered, pendingFields, type GuidedField } from "../../app/builder/_components/GuidedFormChat";
import { civilGuidedFields, familyGuidedFields, withServedDate } from "../../app/builder/_components/guidedFields";
import { storyHintsForDates, storyWithTimeline } from "../../src/lib/case-system/casePosition";
import { amountFromStory, childrenFromStory, civilRoleFromStory, familyRoleFromStory, goalFromStory } from "../../app/builder/_components/storyAnswers";
import { cardLabel, confirmedDrafts, dayOf, sameDayAs } from "../../app/builder/_components/proposalCard";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
}

const opt = (...values: string[]) => values.map((value) => ({ value, label: value }));
const family = familyGuidedFields({
  issues: opt("parenting-time", "child-support", "property-division"),
  filed: opt("application", "answer", "nothing", "not-sure"),
});
const civil = civilGuidedFields({ issues: opt("contract", "negligence"), documents: opt("statement-claim", "nothing", "not-sure") });

console.log("\n1. Nothing already answered is asked");
{
  const known = pendingFields(family, { facts: "We separated in May.", yourRole: "applicant", issues: ["child-support"] }, new Set());
  check("an answered story, side and issue are not asked", !known.some((field) => ["facts", "yourRole", "issues"].includes(field.key)));
  check("the first question is the next thing not yet known", known[0]?.key === "filedDocuments", known.map((field) => field.key).join(", "));
  const notSure = pendingFields(family, { facts: "x", yourRole: "not-sure" }, new Set());
  check("'not sure' counts as not answered for the side", notSure.some((field) => field.key === "yourRole"));
  const skipped = pendingFields(family, { facts: "x" }, new Set(["yourRole"]));
  check("a skipped question is not asked again this visit", !skipped.some((field) => field.key === "yourRole"));
  const empty = pendingFields(civil, {}, new Set());
  check("with nothing known, the story comes first", empty[0]?.key === "facts");
}

console.log("\n2. Questions that depend on the answers");
{
  const noChildren = pendingFields(family, { facts: "x", yourRole: "applicant", issues: ["property-division"] }, new Set());
  check("no children question unless the case is about children", !noChildren.some((field) => field.key === "childrenInfo"));
  const children = pendingFields(family, { facts: "x", yourRole: "applicant", issues: ["child-support"] }, new Set());
  check("the children question follows a child issue", children.some((field) => field.key === "childrenInfo"));
  const plaintiff = pendingFields(civil, { facts: "x", yourRole: "plaintiff" }, new Set());
  check("a plaintiff isn't asked when they were served", !plaintiff.some((field) => field.key === "serviceDetails"));
  const defendant = pendingFields(civil, { facts: "x", yourRole: "defendant" }, new Set());
  check("a defendant is asked when and how they were served", defendant.some((field) => field.key === "serviceDetails"));
}

console.log("\n3. Every question says why, and hears the answer back");
for (const [court, fields] of [["family", family], ["civil", civil]] as const) {
  check(`${court}: every question says why it is asked`, fields.every((field) => field.why.trim().length > 20), fields.filter((field) => field.why.trim().length <= 20).map((field) => field.key).join(", "));
  check(`${court}: no two questions fill the same field`, new Set(fields.map((field) => field.key)).size === fields.length);
}
const role = civil.find((field) => field.key === "yourRole") as GuidedField;
check("an answer is repeated back in plain words", acknowledgement(role, "defendant") === "Got it: Someone is suing me (defendant).");
check("an empty list counts as not answered", !isAnswered(family.find((field) => field.key === "issues") as GuidedField, []));

console.log("\n4. Every answer reaches the form, with the form's own values");
{
  const familySource = read("app/builder/_components/FamilyIntake.tsx");
  const civilSource = read("app/builder/_components/CivilIntake.tsx");
  for (const field of family) check(`family: '${field.key}' is written to the form`, familySource.includes(`case "${field.key}":`));
  for (const field of civil) check(`civil: '${field.key}' is written to the form`, civilSource.includes(`case "${field.key}":`));
  for (const option of role.options ?? []) {
    check(`civil: the side '${option.value}' is one the form offers`, civilSource.includes(`<option value="${option.value}">`));
  }
  const familyRole = family.find((field) => field.key === "yourRole") as GuidedField;
  check("family: the sides are the form's own values", (familyRole.options ?? []).every((option) => ["applicant", "respondent"].includes(option.value)));
  check("family: the form's issue and document lists are the ones offered", /familyGuidedFields\(\{ issues: issueOptions, filed: filedOptions \}\)/.test(familySource));
  check("civil: the form's issue and document lists are the ones offered", /civilGuidedFields\(\{ issues: issueOptions, documents: documentOptions \}\)/.test(civilSource));
  for (const [court, source] of [["family", familySource], ["civil", civilSource]] as const) {
    check(`${court}: opens one question at a time`, /useState<"chat" \| "form">\("chat"\)/.test(source) && /<GuidedFormChat/.test(source));
    check(`${court}: the chat's Continue is the form's own`, /onDone=\{handleAnalyze\}/.test(source));
    check(`${court}: the whole form is one click away`, /onShowForm=\{\(\) => setMode\("form"\)\}/.test(source));
  }
}

console.log("\n6. What the story already says is offered for one click, not asked cold (2026-10-13)");
{
  check("'i got served a statement of claim' is the defendant", civilRoleFromStory("i got served a statement of claim from my old partner")?.value === "defendant");
  check("'i want to sue the city' is the plaintiff", civilRoleFromStory("i slipped on ice. i want to sue the city")?.value === "plaintiff");
  check("a story saying both sides offers neither", civilRoleFromStory("he sued me and now i want to sue him back") === null);
  check("'took me to court' is the family respondent", familyRoleFromStory("my ex took me to court for custody")?.value === "respondent");
  check("'owes them 68000' is $68,000", amountFromStory("a supplier saying my business owes them 68000")?.value === "$68,000");
  check("a year is never an amount", amountFromStory("i pay support from a court order in 2022") === null);
  check("'i want my money back' is what they want", goalFromStory("he stopped showing up. i want my money back")?.value === "I want my money back");
  check("'what i need to bring' is not a goal", goalFromStory("i dont know what i need to bring or file before it") === null);
  check("'i want to sue' is not what they want ordered", goalFromStory("i want to sue the city") === null);
  check("'2 years ago' is not a child's age", childrenFromStory("me and my sons father split up 2 years ago") === null);
  check("'my daughter is 5' is the children", childrenFromStory("my daughter is 5 and lives with me")?.value === "my daughter is 5 and lives with me");
  const fam = familyGuidedFields({ issues: opt("child-support"), filed: opt("nothing") });
  const civ = civilGuidedFields({ issues: opt("contract"), documents: opt("nothing") });
  for (const [court, fields, keys] of [["family", fam, ["yourRole", "childrenInfo", "goal"]], ["civil", civ, ["yourRole", "amountClaimed", "legalRemedy"]]] as const) {
    for (const key of keys) check(`${court}: '${key}' is offered from the story`, typeof fields.find((field) => field.key === key)?.fromStory === "function");
  }
  const chat = read("app/builder/_components/GuidedFormChat.tsx");
  check("the chat shows the story's words and asks 'Is that right?'", /From what you told us: &ldquo;/.test(chat) && /Is that right\?/.test(chat));
  check("'No' asks the question plainly instead", /setNotFromStory/.test(chat) && /No, let me answer/.test(chat));
}

console.log("\n7. Small Claims 'Here's what I understood' states answers once (2026-10-13)");
{
  check("the side is stated, not asked", cardLabel("sc-orient-role", "Are you the person or business bringing this claim, or the one responding to a claim?") === "Your side");
  check("an unlisted question keeps its own words", cardLabel("sc-x", "Some question?") === "Some question?");
  check("'January 13, 2025, at 2 pm' is that day", dayOf("January 13, 2025, at 2 pm") === "2025-01-13");
  check("'Sept 3rd 2026' is that day", dayOf("Sept 3rd 2026") === "2026-09-03");
  check("a month and year alone is not a day", dayOf("July 2026") === null);
  const drafts = [
    { questionId: "sc-orient-when-happened", answer: "January 13, 2025, at 2 pm", keep: true },
    { questionId: "sc-orient-role", answer: "Bringing the claim (plaintiff)", keep: true },
    { questionId: "sc-date-injury", answer: "January 13, 2025", keep: true },
  ];
  const shown = sameDayAs(drafts);
  check("the injury date naming the same day is shown with 'when it happened'", shown[2] === 0 && shown[0] === -1 && shown[1] === -1, JSON.stringify(shown));
  const differentDay = sameDayAs([drafts[0], { ...drafts[2], answer: "January 14, 2025" }]);
  check("a different day keeps its own row", differentDay[1] === -1);
  const originals = drafts.map((draft) => draft.answer);
  const unticked = confirmedDrafts([{ ...drafts[0], keep: false }, drafts[1], drafts[2]], shown, originals);
  check("unticking the shown date unticks the one shown with it", unticked[2].keep === false);
  const edited = confirmedDrafts([{ ...drafts[0], answer: "January 12, 2025" }, drafts[1], drafts[2]], shown, originals);
  check("changing the shown date changes the one shown with it", edited[2].answer === "January 12, 2025");
  const untouched = confirmedDrafts(drafts, shown, originals);
  check("left alone, each question keeps its own answer", untouched[2].answer === "January 13, 2025" && untouched[2].keep);
  const intake = read("app/builder/_components/GuidedSmallClaimsIntake.tsx");
  check("the card shows statement labels", /cardLabel\(draft\.questionId, draft\.questionText\)/.test(intake));
  check("the card hides a row shown with another, and says so", /sameDayAs\(proposalDrafts\)\[index\] >= 0 \? null/.test(intake) && /Also kept as/.test(intake));
  check("both confirm buttons resolve shown-together rows first", (intake.match(/const drafts = resolvedDrafts\(proposalDrafts\)/g) ?? []).length === 2);
}

console.log("\n8. The family service date is asked with its year, and its why states no law (review 2026-10-13)");
{
  const served = family.find((field) => field.key === "servedDate")!;
  check("the question asks for the year", /\byear\b/i.test(served.question), served.question);
  // Property: for any answer, either the chat asks for more, or the step page
  // has a date with its year (never "Which year was that?"), or there is no
  // date the site can read (the step page asks for it in full).
  const answers = ["october 6", "Oct 6th", "6 october", "October 6, 2026, in person", "2026-10-06", "last tuesday", "on the 6th", "september 28 2026"];
  const stepPageWouldAskYear = answers.filter((answer) => {
    if (answerNeedsMore(served, answer)) return false;
    const hint = storyHintsForDates(storyWithTimeline("", withServedDate("", answer)), new Date("2026-10-13T12:00:00"))["case-date-served-with-application"];
    return Boolean(hint?.value && hint.yearAssumed);
  });
  check("no answer the chat keeps leaves the step page asking which year", stepPageWouldAskYear.length === 0, stepPageWouldAskYear.join(" | "));
  check("a month and day with no year is asked for its year", Boolean(answerNeedsMore(served, "october 6")) && /year/i.test(answerNeedsMore(served, "october 6") ?? ""));
  check("a full date, or no readable date, is kept as given", !answerNeedsMore(served, "October 6, 2026") && !answerNeedsMore(served, "last tuesday") && !answerNeedsMore(served, ""));
  const chat = read("app/builder/_components/GuidedFormChat.tsx");
  check("the chat checks every typed answer before keeping it", /const more = answerNeedsMore\(current, cleaned\);\s*if \(more\) \{/.test(chat));
  check("a story answer that needs more is not offered for one click", /if \(!offered \|\| answerNeedsMore\(current, offered\.value\)\) return null;/.test(chat));
  // Property over every why: none says what a time limit is counted from (law,
  // with no source); each says what the site does with the answer.
  const statesLaw = [...family, ...civil].filter((field) => /\bcount\w*\b[^.]*\bfrom\b|\b(?:deadline|time) to (?:answer|respond|file|serve)\b/i.test(field.why));
  check("no why states what a time limit is counted from", statesLaw.length === 0, statesLaw.map((field) => `${field.key}: ${field.why}`).join(" | "));
}

console.log("\n5. The walkthrough plays it");
check("the walkthrough answers the chat for family and civil", /playGuidedChat\(page, persona, steps\)/.test(read("tests/browser/walkthrough.spec.ts")));

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
