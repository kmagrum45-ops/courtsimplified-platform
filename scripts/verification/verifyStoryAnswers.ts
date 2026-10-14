/**
 * What the person's story already answers is offered, not asked again
 * (storyAnswers.ts, guidedFields.ts; walkthrough R2 and V2, 2026-10-13).
 *
 * WHAT IT CHECKS: every story the walkthrough plays (personas.ts and
 * heldBackPersonas.ts, family and civil) is read by each story reader, and
 * each reader must either give the right answer, quoting a sentence of that
 * story, or give nothing where the story does not say it. The side is checked
 * against the persona's own `role`; the goal and the other side against what
 * the story says (written below, read from each story). A second set of
 * sentences -- questions, "what if"s, doubts, "I don't know what I need" --
 * must give nothing. A family respondent is asked the day they were served
 * (with a why about their deadline to answer), the story's date is offered
 * when it gives one, and the answer lands in the Timeline line the step page
 * already reads for dates, where it is counted as the service date.
 *
 * WHAT FAILURE IT CATCHES: the chat asking a question the story answers
 * ("Are you suing someone?" after "i want to sue the city"), a reader
 * offering a guess or a question as an answer ("I need to do before it" as a
 * goal), a served respondent finishing the chat with no service date, and a
 * service date that never reaches the deadline count.
 *
 * The checks are properties (right side or nothing, the quote is the story's
 * own sentence, the answer names the thing the story names), not pinned
 * strings, so a reader that gets better does not fail them.
 *
 * COSTS NOTHING: no network, no model.
 *
 * Run: npm run test:story-answers
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { heardAs, pendingFields, type GuidedField } from "../../app/builder/_components/GuidedFormChat";
import { civilGuidedFields, familyGuidedFields, servedDateOf, withServedDate } from "../../app/builder/_components/guidedFields";
import {
  amountFromStory,
  childrenFromStory,
  civilRoleFromStory,
  familyRoleFromStory,
  goalFromStory,
  otherPartyFromStory,
  otherPartyNameFromStory,
  servedDateFromStory,
  type StoryAnswer,
} from "../../app/builder/_components/storyAnswers";
import { storyHintsForDates } from "../../src/lib/case-system/casePosition";
import { HELD_BACK_PERSONAS } from "../../tests/browser/walkthrough/heldBackPersonas";
import { PERSONAS } from "../../tests/browser/walkthrough/personas";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
}
const shown = (answer: StoryAnswer | null) => (answer ? `${JSON.stringify(answer.value)} from ${JSON.stringify(answer.quote)}` : "nothing");

/*
 * What each story says, read from the story itself. `null` means the story
 * does not say it, so the reader must give nothing; a list means the answer
 * must name each of those words. Role is the persona's own `role` unless
 * marked "unsaid" (the story never says which side they are on).
 */
type Expected = {
  role?: "unsaid";
  goal: string[] | null;
  otherParty: string[] | null;
  served: string[] | null;
};
const EXPECTED: Record<string, Expected> = {
  "family-respondent-parenting": { goal: ["joint custody"], otherParty: null, served: null }, // "last week" is not a date
  "family-applicant-child-support": { goal: ["support ordered"], otherParty: null, served: null },
  "family-applicant-divorce-property": { goal: ["divorce"], otherParty: null, served: null },
  "family-motion-to-change-support": { goal: ["support", "lowered"], otherParty: null, served: null },
  "family-applicant-safety-urgent": { goal: ["court"], otherParty: null, served: null },
  "family-respondent-case-conference": { goal: null, otherParty: null, served: null }, // "i dont know what i need to bring"
  "held-back-family-applicant-parenting-time": { goal: ["court order", "weekends"], otherParty: null, served: null },
  "held-back-family-respondent-served-support": { goal: ["child support"], otherParty: null, served: ["September 29"] },
  "held-back-family-motion-disclosure": { goal: null, otherParty: null, served: null }, // "what do i have to give and when"
  "civil-plaintiff-contract": { goal: ["money back"], otherParty: ["contractor"], served: null },
  "civil-defendant-served": { goal: null, otherParty: ["business partner"], served: ["September 20"] },
  "civil-plaintiff-municipal-slip": { goal: null, otherParty: ["City of Toronto"], served: null }, // "sue" is how, not what
  "civil-defendant-noted-default": { goal: null, otherParty: ["supplier"], served: null },
  "civil-plaintiff-motion-documents": { goal: null, otherParty: ["former business partner"], served: null },
  "held-back-civil-plaintiff-hidden-water-damage": { role: "unsaid", goal: null, otherParty: null, served: null },
  "held-back-civil-defendant-non-solicit": { goal: null, otherParty: ["boss"], served: ["October 2", "2026"] },
  "held-back-civil-plaintiff-discovery": { goal: null, otherParty: ["trucking company"], served: null },
};

function expectAnswer(name: string, story: string, answer: StoryAnswer | null, wanted: string[] | null) {
  if (wanted === null) {
    check(`${name}: nothing (the story does not say it)`, answer === null, shown(answer));
    return;
  }
  const value = answer ? String(answer.value).toLowerCase() : "";
  check(
    `${name}: names ${wanted.map((word) => `'${word}'`).join(", ")}, quoting the story`,
    !!answer && wanted.every((word) => value.includes(word.toLowerCase())) && story.includes(answer.quote),
    shown(answer),
  );
}

/** An answer is never a question or a request for help. */
function notAQuestion(answer: StoryAnswer | null): boolean {
  if (!answer) return true;
  return !/\?/.test(answer.value) && !/^(?:what|how|when|where|why|do|can|should|I (?:want|need) to (?:do|know|bring))\b/i.test(answer.value);
}

console.log("\n1. Every walkthrough story: each reader gives the right answer from the story, or nothing");
const stories = [...PERSONAS, ...HELD_BACK_PERSONAS].filter((persona) => persona.path === "family" || persona.path === "civil");
check("every family and civil walkthrough story has its expectations written here", stories.every((persona) => EXPECTED[persona.id]), stories.filter((persona) => !EXPECTED[persona.id]).map((persona) => persona.id).join(", "));
for (const persona of stories) {
  const expected = EXPECTED[persona.id];
  if (!expected) continue;
  const id = persona.id;
  const role = persona.path === "family" ? familyRoleFromStory(persona.story) : civilRoleFromStory(persona.story);
  if (expected.role === "unsaid") check(`${id}: side: nothing (the story does not say)`, role === null, shown(role));
  else check(`${id}: side is the persona's own (${persona.role}), quoting the story`, role?.value === persona.role && persona.story.includes(role.quote), shown(role));

  const goal = goalFromStory(persona.story);
  expectAnswer(`${id}: goal`, persona.story, goal, expected.goal);
  check(`${id}: the goal offered is not a question`, notAQuestion(goal), shown(goal));

  const other = persona.path === "civil" ? otherPartyFromStory(persona.story) : otherPartyNameFromStory(persona.story);
  expectAnswer(`${id}: other side`, persona.story, other, expected.otherParty);

  expectAnswer(`${id}: day served`, persona.story, servedDateFromStory(persona.story), expected.served);

  for (const [name, reader] of [["amount", amountFromStory], ["children", childrenFromStory]] as const) {
    const answer = reader(persona.story);
    check(`${id}: ${name}: any answer quotes the story`, !answer || persona.story.includes(answer.quote), shown(answer));
  }
}

console.log("\n2. Plain statements the walkthrough reviewer named are read");
{
  const family: [string, string][] = [
    ["my ex started a case for child support in june and i filed my answer", "respondent"],
    ["on september 29 a process server gave me court papers", "respondent"],
    ["i got served the papers last week", "respondent"],
    ["i want to get support ordered", "applicant"],
    ["i want a divorce", "applicant"],
    ["i need something from the court fast", "applicant"],
    ["i pay 900 a month from a 2022 order. how do i get it lowered", "applicant"],
    ["i started a case for child support in april", "applicant"],
  ];
  for (const [story, side] of family) check(`family '${story}' is the ${side}`, familyRoleFromStory(story)?.value === side, shown(familyRoleFromStory(story)));
  const civil: [string, string][] = [
    ["i slipped on ice. i want to sue the city", "plaintiff"],
    ["i got served a statement of claim from my old partner", "defendant"],
    ["he stopped showing up. i want my money back", "plaintiff"],
  ];
  for (const [story, side] of civil) check(`civil '${story}' is the ${side}`, civilRoleFromStory(story)?.value === side, shown(civilRoleFromStory(story)));
  const parties: [string, string][] = [
    ["i want to sue my old landlord for my deposit", "landlord"],
    ["i hired a contractor and he never finished", "contractor"],
    ["im suing my former business partner", "business partner"],
    ["i got a claim from a supplier", "supplier"],
    ["my old boss sued me", "boss"],
    ["i sued the trucking company", "trucking company"],
    ["i want to sue the city", "city"],
    ["i fell downtown in ottawa. i want to sue the city", "City of Ottawa"],
  ];
  for (const [story, party] of parties) {
    const answer = otherPartyFromStory(story);
    check(`civil other side in '${story}' names '${party}'`, !!answer && answer.value.toLowerCase().includes(party.toLowerCase()), shown(answer));
  }
  const goals: [string, string][] = [
    ["my support is too high. how do i get it lowered", "lowered"],
    ["the order is from 2022. how do i get it changed", "changed"],
    ["i want a court order for my weekends back", "weekends"],
  ];
  for (const [story, word] of goals) check(`goal in '${story}' says '${word}'`, !!goalFromStory(story)?.value.includes(word), shown(goalFromStory(story)));
  check("a family name the story gives is offered", otherPartyNameFromStory("my ex, Sarah Jones, took me to court")?.value === "Sarah Jones", shown(otherPartyNameFromStory("my ex, Sarah Jones, took me to court")));
}

console.log("\n3. Questions, doubts and 'what if's give nothing");
{
  const none: [string, (story: string) => StoryAnswer | null, string][] = [
    ["civil side", civilRoleFromStory, "what happens if someone sues me?"],
    ["civil side", civilRoleFromStory, "i dont know if i want to sue him"],
    ["civil side", civilRoleFromStory, "can i sue my landlord?"],
    ["civil side", civilRoleFromStory, "he sued me and now i want to sue him back"],
    ["family side", familyRoleFromStory, "should i take my ex to court"],
    ["family side", familyRoleFromStory, "what if she takes me to court"],
    ["family side", familyRoleFromStory, "i dont know if i want a divorce"],
    ["goal", goalFromStory, "what do i need to do before it"],
    ["goal", goalFromStory, "i dont know what i need"],
    ["goal", goalFromStory, "I need a lawyer."],
    ["goal", goalFromStory, "if i want to change it what do i do"],
    ["goal", goalFromStory, "i want to know my rights"],
    ["goal", goalFromStory, "i want to sue the city"],
    ["goal", goalFromStory, "how do i get it lowered"], // "it" names nothing
    ["civil other side", otherPartyFromStory, "can i sue my landlord?"],
    ["civil other side", otherPartyFromStory, "what if the city sues me"],
    ["civil other side", otherPartyFromStory, "i dont know who to sue"],
    ["civil other side", otherPartyFromStory, "He sued me for 5000"],
    ["civil other side", otherPartyFromStory, "i might sue my landlord"],
    ["family name", otherPartyNameFromStory, "my ex gf took me to court"],
    ["family name", otherPartyNameFromStory, "my husband moved out in July"],
    ["day served", servedDateFromStory, "the hearing is on november 20 and i was served last week"],
    ["day served", servedDateFromStory, "we separated on march 3 2024 and i got served last week"],
    ["day served", servedDateFromStory, "what happens if i get served on monday"],
    ["amount", amountFromStory, "i pay support from a court order in 2022"],
    ["children", childrenFromStory, "on september 29 a process server gave me papers about our 2 girls"],
  ];
  for (const [name, reader, story] of none) check(`${name}: nothing from '${story}'`, reader(story) === null, shown(reader(story)));
}

console.log("\n4. The chat offers what the story says, and asks a respondent the day they were served");
{
  const opt = (...values: string[]) => values.map((value) => ({ value, label: value }));
  const family = familyGuidedFields({ issues: opt("parenting-time"), filed: opt("application", "answer", "nothing") });
  const civil = civilGuidedFields({ issues: opt("negligence"), documents: opt("nothing") });
  const field = (fields: GuidedField[], key: string) => fields.find((item) => item.key === key) as GuidedField;
  for (const [court, fields, keys] of [
    ["family", family, ["yourRole", "goal", "otherParty", "servedDate", "childrenInfo"]],
    ["civil", civil, ["yourRole", "legalRemedy", "otherParty", "serviceDetails", "amountClaimed"]],
  ] as const) {
    for (const key of keys) check(`${court}: '${key}' is offered from the story`, typeof field(fields, key)?.fromStory === "function");
  }

  const respondentStory = PERSONAS.find((persona) => persona.id === "family-respondent-parenting")?.story ?? "";
  const asked = pendingFields(family, { facts: respondentStory, yourRole: "respondent", issues: ["parenting-time"], filedDocuments: ["application"] }, new Set());
  const served = field(family, "servedDate");
  check("a served respondent is asked the day they were served", asked.some((item) => item.key === "servedDate"), asked.map((item) => item.key).join(", "));
  check("its why says the day starts their deadline to answer", /deadline/i.test(served.why) && /answer/i.test(served.why) && /served/i.test(served.why), served.why);
  check("'last week' is not offered as the day", served.fromStory?.({ facts: respondentStory }) == null);
  check(
    "a story's own date is offered",
    served.fromStory?.({ facts: "on september 29 a process server gave me court papers" })?.value === "September 29",
  );
  check("an applicant is not asked when they were served", !pendingFields(family, { facts: "x", yourRole: "applicant" }, new Set()).some((item) => item.key === "servedDate"));
  check("a respondent who filed their answer is not asked", !pendingFields(family, { facts: "x", yourRole: "respondent", filedDocuments: ["answer"] }, new Set()).some((item) => item.key === "servedDate"));

  // Where the answer goes: one line of the Timeline, read back as the date.
  const timeline = withServedDate("We separated in 2024.", "October 6, 2026");
  check("the day is kept in the Timeline the person already has", timeline.startsWith("We separated in 2024.") && servedDateOf(timeline) === "October 6, 2026", timeline);
  check("answering again replaces the line, never doubles it", servedDateOf(withServedDate(timeline, "October 7, 2026")) === "October 7, 2026" && withServedDate(timeline, "October 7, 2026").split("\n").length === 2);
  check("clearing it removes the line", servedDateOf(withServedDate(timeline, "")) === "" && withServedDate(timeline, "") === "We separated in 2024.");
  const hints = storyHintsForDates([respondentStory, timeline].join("\n"));
  check(
    "the step page reads it as the day the application was served",
    hints["case-date-served-with-application"]?.value === "2026-10-06",
    JSON.stringify(hints["case-date-served-with-application"]),
  );
  const familySource = read("app/builder/_components/FamilyIntake.tsx");
  check("the family form writes the answer into its Timeline", /case "servedDate": setTimeline\(\(current\) => withServedDate\(current, one\)\)/.test(familySource));
  check("the family form reads it back from its Timeline", /servedDate: servedDateOf\(timeline\)/.test(familySource));
  for (const page of ["app/builder/page.tsx", "app/cases/[id]/page.tsx"]) {
    check(`${page} reads the Timeline for dates`, /storyHintsForDates\(\[[^\]]*\.timeline\]/.test(read(page)));
  }

  const role = field(civil, "yourRole");
  check("an answer confirmed from the story is not listed under the question it answered", !heardAs(role, true).includes(role.question) && heardAs(role, true).includes(role.label));
  check("a typed answer is still listed under its question", heardAs(role, false) === role.question);
  check("the chat's 'Yes' records the answer as from the story", /answer\(offered\.value, true\)/.test(read("app/builder/_components/GuidedFormChat.tsx")));
}

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
