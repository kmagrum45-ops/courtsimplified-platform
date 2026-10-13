/**
 * One question at a time for family and civil (GuidedFormChat, build order
 * Step 2C, 2026-10-12).
 *
 * WHAT IT CATCHES: a question asked whose field already holds an answer (the
 * repeat-question failure the walkthrough scored 0 of 10 on), a question
 * whose answer never reaches the form (a key with no setter), a choice the
 * form itself doesn't offer, a question with no "why", and either intake
 * dropping the one-at-a-time view.
 *
 * COSTS NOTHING: no network, no model.
 *
 * Run: npm run test:guided-form-chat
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { acknowledgement, isAnswered, pendingFields, type GuidedField } from "../../app/builder/_components/GuidedFormChat";
import { civilGuidedFields, familyGuidedFields } from "../../app/builder/_components/guidedFields";
import { amountFromStory, childrenFromStory, civilRoleFromStory, familyRoleFromStory, goalFromStory } from "../../app/builder/_components/storyAnswers";

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

console.log("\n5. The walkthrough plays it");
check("the walkthrough answers the chat for family and civil", /playGuidedChat\(page, persona, steps\)/.test(read("tests/browser/walkthrough.spec.ts")));

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
