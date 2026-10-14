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
 * already reads for dates, where it is counted as the service date. "Has
 * anything been filed" is offered from the story as the form's own option
 * ("i got served the papers" -> application, "i want to sue the city" with
 * no paper mentioned -> nothing filed yet), never from a negation, someone
 * else served, or a story mentioning any paper (section 5). A family story
 * with an order and words asking to change it ("how do i get it lowered")
 * gets the motion-to-change route first, quoted from r. 15 (5) and (2) of the
 * saved Family Law Rules, instead of the temporary-motion card (section 6).
 *
 * An independent review (2026-10-13) added the inputs that broke the first
 * version: negations ("i never got served"), someone else served ("he was
 * served on may 5"), the person not being the one suing ("the city sued my
 * neighbour"), words before a name ("Yesterday Bob"), capitalised words that
 * are not names ("my husband Is abusive"), impossible days ("june 31"),
 * harm offered as a goal ("i want to die"), and "apply" for legal aid; and
 * the chat's own service date losing to the story's, or to a motion
 * mentioned elsewhere.
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
import {
  civilGuidedFields,
  familyGuidedFields,
  familyTimelineAnswer,
  familyTimelineValues,
  servedDateOf,
  withServedDate,
} from "../../app/builder/_components/guidedFields";
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
import { motionToChangeLead, type MotionToChangeLead } from "../../app/builder/_components/motionToChange";
import { SERVED_LINE, storyHintsForDates, storyWithTimeline } from "../../src/lib/case-system/casePosition";
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
  // 4: the words before a name are not part of it (independent review, 2026-10-13).
  for (const [story, name] of [["Yesterday Bob sued me", "Bob"], ["In June Bob sued me for 4000", "Bob"], ["Last Tuesday Mark Lee served me", "Mark Lee"]] as const) {
    const answer = otherPartyFromStory(story);
    check(`'${story}': the other side is '${name}' or nothing, never the words before it`, answer === null || answer.value === name, shown(answer));
  }
  check("'I sued Visa' names Visa", otherPartyFromStory("I sued Visa")?.value === "Visa", shown(otherPartyFromStory("I sued Visa")));
  // 5: a name set off by commas, or after "named", is still read.
  check("'my husband, Mark Lee.' gives Mark Lee", otherPartyNameFromStory("I left my husband, Mark Lee.")?.value === "Mark Lee", shown(otherPartyNameFromStory("I left my husband, Mark Lee.")));
  check("'my ex named Sarah' gives Sarah", otherPartyNameFromStory("my ex named Sarah took me to court")?.value === "Sarah", shown(otherPartyNameFromStory("my ex named Sarah took me to court")));
  // 11: applying to the court is starting it.
  for (const story of ["i want to apply for a divorce", "i want to apply to the court for custody", "i need to apply for child support"]) {
    check(`family '${story}' is the applicant`, familyRoleFromStory(story)?.value === "applicant", shown(familyRoleFromStory(story)));
  }
  // 6: a real date with the served words is still read.
  check("'i was served on february 29 2024' is read", servedDateFromStory("i was served on february 29 2024")?.value === "February 29, 2024");
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
    // Independent review, 2026-10-13. 1: negation, not yet, only reported.
    ["family side", familyRoleFromStory, "i never got served"],
    ["family side", familyRoleFromStory, "i havent been served yet"],
    ["family side", familyRoleFromStory, "i have not been served but i heard my ex filed an application"],
    ["family side", familyRoleFromStory, "they told me i was served on june 3 but i never got anything"],
    ["family side", familyRoleFromStory, "i will be served on monday march 3"],
    ["day served", servedDateFromStory, "i never got served"],
    ["day served", servedDateFromStory, "i havent been served yet"],
    ["day served", servedDateFromStory, "i have not been served but i heard my ex filed an application"],
    ["day served", servedDateFromStory, "they told me i was served on june 3 but i never got anything"],
    ["day served", servedDateFromStory, "i will be served on monday march 3"],
    // 2: someone else was served, or the person served someone.
    ["family side", familyRoleFromStory, "he was served on may 5"],
    ["family side", familyRoleFromStory, "my sister got served last year, not me"],
    ["family side", familyRoleFromStory, "my ex got served on september 3 by me"],
    ["family side", familyRoleFromStory, "i served my ex on september 3"],
    ["civil side", civilRoleFromStory, "he was served on may 5"],
    ["day served", servedDateFromStory, "he was served on may 5"],
    ["day served", servedDateFromStory, "my sister got served last year, not me"],
    ["day served", servedDateFromStory, "my ex got served on september 3 by me"],
    ["day served", servedDateFromStory, "i served my ex on september 3"],
    // 3: the person is not the one suing, or "took" is not to court.
    ["civil other side", otherPartyFromStory, "the city sued my neighbour"],
    ["civil other side", otherPartyFromStory, "i took my partner to the hospital after the fall"],
    ["civil other side", otherPartyFromStory, "i took my boss to lunch and he fired me"],
    ["civil other side", otherPartyFromStory, "i'd never sue my boss"],
    ["civil other side", otherPartyFromStory, "i'm not going to sue the city"],
    // 5: a capitalised word after "my husband" is not a name.
    ["family name", otherPartyNameFromStory, "my husband Is abusive"],
    ["family name", otherPartyNameFromStory, "my ex is Ottawa based"],
    ["family name", otherPartyNameFromStory, "my wife Divorce papers came"],
    ["family name", otherPartyNameFromStory, "my ex My lawyer says"],
    ["family name", otherPartyNameFromStory, "my husband CAS called me"],
    ["family name", otherPartyNameFromStory, "my mom's dad Bob is helping"],
    // 6: impossible days, "2 weeks ago", and dates of other moments.
    ["day served", servedDateFromStory, "i was served on june 31"],
    ["day served", servedDateFromStory, "i was served on may 99"],
    ["day served", servedDateFromStory, "i was served at my door on 2026-09-31"],
    ["day served", servedDateFromStory, "i got the papers from the city in march 2 weeks ago"],
    ["day served", servedDateFromStory, "i was served with papers about the house we bought on june 3 2020"],
    ["day served", servedDateFromStory, "i was served the papers about the car i sold on may 4"],
    ["day served", servedDateFromStory, "i was served about the lease we signed on may 4"],
    ["day served", servedDateFromStory, "i was served with papers about my son who was born on may 4"],
    ["day served", servedDateFromStory, "i got served about the house we rented on may 4"],
    ["day served", servedDateFromStory, "i got served over the contractor i hired on may 4"],
    ["day served", servedDateFromStory, "i got served about the accident that happened on may 4"],
    ["day served", servedDateFromStory, "i got served after we moved on may 4"],
    // 10: harm, nothing after the verb, answering or helping.
    ["goal", goalFromStory, "i want to die"],
    ["goal", goalFromStory, "i want to kill him"],
    ["goal", goalFromStory, "i want to hurt her"],
    ["goal", goalFromStory, "i just want to end it"],
    ["goal", goalFromStory, "i want to end my life"],
    ["goal", goalFromStory, "i want to harm him"],
    ["goal", goalFromStory, "i sued the city? no i want to"],
    ["goal", goalFromStory, "i want to answer the application"],
    ["goal", goalFromStory, "i want to respond to the claim my ex filed"],
    ["goal", goalFromStory, "the city sued my neighbour. i want to help him"],
    // 11: "apply" for something that is not a court order.
    ["family side", familyRoleFromStory, "i want to apply for legal aid"],
    ["family side", familyRoleFromStory, "i need to apply for a job"],
    ["civil side", civilRoleFromStory, "i want to apply for legal aid"],
    ["civil side", civilRoleFromStory, "i need to apply for a job"],
    ["goal", goalFromStory, "i want to apply for legal aid"],
    ["goal", goalFromStory, "i need to apply for a job"],
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
  // Review 2026-10-13: the why said the answer deadline is counted from the
  // day served -- law, with no source. It says what the site does with the
  // date, and states no rule (the counted limit and its rule are on the step page).
  check(
    "its why says what the site does with the date, and states no law",
    /\b(?:we|this site)\b/i.test(served.why) && /\bdate\b/i.test(served.why) && !/\bcount\w*\b[^.]*\bfrom\b|\b(?:deadline|time) to answer\b/i.test(served.why),
    served.why,
  );
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
  // The family form's own reducer for answers kept in the Timeline (behaviour, not code text).
  const written = familyTimelineAnswer("servedDate", "October 6, 2026", "We separated in 2024.");
  check("a service-date answer becomes the Timeline's served line", written !== null && familyTimelineValues(written).servedDate === "October 6, 2026", String(written));
  check("any other answer is not kept in the Timeline", familyTimelineAnswer("goal", "joint custody", "x") === null);
  check("a served line the person indented is still read", servedDateOf(`  ${SERVED_LINE}October 6, 2026`) === "October 6, 2026");
  check("what the step page reads for dates includes the Timeline", storyWithTimeline("my story", timeline).includes(timeline) && storyWithTimeline("my story", undefined) === "my story");
  // Where they are used: imports only (CLAUDE.md s. 5: a check asserts a property, not code text).
  const importsFrom = (file: string, name: string, from: RegExp) =>
    new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*"${from.source}"`).test(read(file));
  check("the family form uses the Timeline reducer", importsFrom("app/builder/_components/FamilyIntake.tsx", "familyTimelineAnswer", /\.\/guidedFields/) && importsFrom("app/builder/_components/FamilyIntake.tsx", "familyTimelineValues", /\.\/guidedFields/));
  for (const page of ["app/builder/page.tsx", "app/cases/[id]/page.tsx"]) {
    check(`${page} reads dates from the story with the Timeline`, importsFrom(page, "storyWithTimeline", /[^"]*casePosition/));
  }

  // The person's own answer wins over the story, and a motion elsewhere does not drop it (review items 7, 8).
  const conflict = storyHintsForDates(storyWithTimeline("i was served on september 20 2026.", withServedDate("", "September 22, 2026")));
  check("the chat's service date wins over a different date in the story", conflict["case-date-served-with-application"]?.value === "2026-09-22", JSON.stringify(conflict["case-date-served-with-application"]));
  const motion = storyHintsForDates(storyWithTimeline("my ex brought a motion last year. now i am served with an application.", withServedDate("", "September 22, 2026")));
  check("a story that mentions a motion keeps the chat's service date", motion["case-date-served-with-application"]?.value === "2026-09-22", JSON.stringify(motion["case-date-served-with-application"]));
  const vague = storyHintsForDates(storyWithTimeline("i was served on september 20 2026.", withServedDate("", "last monday")));
  check("an answer with no usable date is quoted, and no story date is filled in its place", vague["case-date-served-with-application"]?.value === null, JSON.stringify(vague["case-date-served-with-application"]));

  const role = field(civil, "yourRole");
  check("an answer confirmed from the story is not listed under the question it answered", !heardAs(role, true).includes(role.question) && heardAs(role, true).includes(role.label));
  check("a typed answer is still listed under its question", heardAs(role, false) === role.question);
}

console.log("\n5. What has been filed: offered from the story, as the form's own option, or nothing");
{
  // Walkthrough FR/SW (2026-10-13): "i got served the papers last week" was
  // followed by "Has anything been filed with the court or given to you yet?".
  // The labels are read from each form's own option list, so the check holds
  // whatever values and labels the forms carry.
  const optionsIn = (file: string) =>
    new Map([...read(file).matchAll(/\{\s*value:\s*"([^"]+)",\s*label:\s*"([^"]+)"\s*\}/g)].map((match) => [match[1], match[2]] as [string, string]));
  const familyLabels = optionsIn("app/builder/_components/FamilyIntake.tsx");
  const civilLabels = optionsIn("app/builder/_components/CivilIntake.tsx");
  const familyOptions = [...familyLabels].map(([value, label]) => ({ value, label }));
  const civilOptions = [...civilLabels].map(([value, label]) => ({ value, label }));
  const familyField = familyGuidedFields({ issues: [], filed: familyOptions }).find((item) => item.key === "filedDocuments") as GuidedField;
  const civilField = civilGuidedFields({ issues: [], documents: civilOptions }).find((item) => item.key === "documents") as GuidedField;
  check("family: 'Has anything been filed' is offered from the story", typeof familyField?.fromStory === "function");
  check("civil: 'Has anything been filed' is offered from the story", typeof civilField?.fromStory === "function");
  const offered = (field: GuidedField, story: string) => field.fromStory?.({ facts: story }) ?? null;
  const values = (answer: { value: string | string[] } | null) => (answer ? ([] as string[]).concat(answer.value) : []);

  // Every walkthrough story: anything offered is a form option, its label is
  // one the persona's own documents list holds (when the persona lists them),
  // and the quote is the story's own words.
  for (const persona of stories) {
    const field = persona.path === "family" ? familyField : civilField;
    const labels = persona.path === "family" ? familyLabels : civilLabels;
    const answer = offered(field, persona.story);
    const listed = (persona as { documents?: string[] }).documents ?? [];
    check(
      `${persona.id}: anything offered as filed is a form option the persona's documents agree with, quoting the story`,
      !answer ||
        (values(answer).every((value) => labels.has(value) && (!listed.length || listed.includes(labels.get(value) as string))) &&
          answer.quote.split(/(?<=[.!?])\s+/).every((part) => persona.story.includes(part))),
      `${JSON.stringify(answer)} vs ${JSON.stringify(listed)}`,
    );
  }
  // The reviewer's cases: each must be offered.
  const story = (id: string) => [...PERSONAS, ...HELD_BACK_PERSONAS].find((persona) => persona.id === id)?.story ?? "";
  const mustOffer: [string, GuidedField, string, string][] = [
    ["family-respondent-parenting (served the papers)", familyField, story("family-respondent-parenting"), "application"],
    ["civil-defendant-served (served a statement of claim)", civilField, story("civil-defendant-served"), "statement-claim"],
    ["civil-plaintiff-municipal-slip (wants to sue, nothing mentioned)", civilField, story("civil-plaintiff-municipal-slip"), "nothing"],
    ["'my ex started a case and i filed my answer'", familyField, "my ex started a case for child support in june and i filed my answer", "answer"],
    ["'i got served with divorce papers'", familyField, "i got served with divorce papers", "application"],
    ["'she filed for custody'", familyField, "she filed for custody", "application"],
    ["'i got served last week'", familyField, "i got served last week", "application"],
  ];
  for (const [name, field, text, value] of mustOffer) check(`${name}: offers '${value}'`, values(offered(field, text)).includes(value), JSON.stringify(offered(field, text)));

  // Never from a negation, someone else served, a question, a doubt, or a
  // story that mentions any paper (then "nothing" would be a guess).
  const none = [
    "i never got served",
    "i havent been served yet",
    "he was served on may 5",
    "my sister got served last year, not me",
    "i served my ex on september 3",
    "my ex got served on september 3 by me",
    "they told me i was served on june 3 but i never got anything",
    "what if i get served",
    "can i sue my landlord?",
    "i dont know if i want to sue him",
    "i want to sue the city but i already sent them a notice letter",
    "i want to sue him, my lawyer sent a demand letter",
    "i sued my landlord and now i want to sue the city too",
    "i want to sue my landlord. he filed something at the board",
    "he stopped showing up. i want my money back", // wanting money is not saying nothing was sent
    // Independent review 2026-10-13: "nothing filed" beside any legal process,
    // and a question.
    "i want to take my ex to court. we were in court last year and the judge gave her custody",
    "i want to sue him again, the court already dismissed my first case",
    "i want to start a case. my ex already has a case open",
    "i want to sue him. he has a case against me at the tribunal",
    "i want to sue him. we were at the ltb last month",
    "i want to apply to court to change the custody arrangement from 2022",
    "i want to start a family case. there's a cas file open",
    "i want to sue. he sent me a demand",
    "i want to sue him? or should i wait",
    // ... and "served" as a question, a doubt, not family, not court papers,
    // or their own lawyer's copy.
    "have i been served?",
    "was i served?",
    "i think i was served",
    "i believe i was served",
    "i guess i got served",
    "has the application been filed? i got served i think",
    "i filed my answer late? not sure",
    "the landlord filed an application at the ltb",
    "my landlord filed an application to evict me",
    "the company filed an application against my friend",
    "i was served at the restaurant",
    "i was served with a summons for jury duty",
    "i was served a noise complaint by my landlord",
    "i received the papers from my lawyer",
  ];
  for (const text of none) {
    check(`nothing offered as filed from '${text}'`, offered(familyField, text) === null && offered(civilField, text) === null, `${JSON.stringify(offered(familyField, text))} / ${JSON.stringify(offered(civilField, text))}`);
  }
  // A civil paper is not a family application (review 2026-10-13).
  for (const text of ["we were served a statement of claim by the bank", "i got served a statement of claim"]) {
    check(`family: no application offered from '${text}'`, offered(familyField, text) === null, JSON.stringify(offered(familyField, text)));
  }
  // An option the form does not list is never offered.
  const narrow = familyGuidedFields({ issues: [], filed: [{ value: "answer", label: "Answer" }] }).find((item) => item.key === "filedDocuments") as GuidedField;
  check("a value the form does not offer is never offered", offered(narrow, story("family-respondent-parenting")) === null, JSON.stringify(offered(narrow, story("family-respondent-parenting"))));
}

// ---- 6. "How do I get it lowered?" is answered with the route, quoted ------
// Walkthrough MC (2026-10-14): a father with a 2022 support order asked how to
// get it lowered; the first rule card said "Family Rule 14 governs motions for
// temporary orders" and nothing answered him plainly. Properties: a family
// story with an order and words asking to change the order (support,
// parenting, payments) gets the motion-to-change line with the consent
// carve-out it is subject to; someone SERVED with a motion to change gets the
// response route instead, and someone served with anything else gets neither;
// every phrase the line names (forms, days) is in a quote beside it, and every
// quote is word for word in the saved Family Law Rules; it predicts nothing;
// other uses of "change" get nothing; and the temporary-motion card is hidden
// only when the story asks for no urgency or temporary order (review
// 2026-10-14).
{
  const corpus = read("docs/sources/corpus/family-law-rules.txt").replace(/\s+/g, " ");
  const flat = (text: string) => text.replace(/\s+/g, " ");
  const checkLead = (name: string, lead: MotionToChangeLead | null, kind: MotionToChangeLead["kind"], pinpointsWanted: string[], phrases: string[]) => {
    check(`motion to change: ${name} gets the ${kind} route`, lead?.kind === kind, JSON.stringify(lead?.kind ?? null));
    if (!lead || lead.kind !== kind) return;
    const pinpoints = lead.rules.map((rule) => rule.pinpoint);
    check(`motion to change: ${name}: quotes ${pinpointsWanted.join(", ")}`, pinpointsWanted.every((pinpoint) => pinpoints.includes(pinpoint)), pinpoints.join(", "));
    check(
      `motion to change: ${name}: every quote is in the saved Family Law Rules, word for word`,
      lead.rules.every((rule) => rule.sourceId === "family-law-rules" && corpus.includes(flat(rule.quote))),
    );
    const quoted = lead.rules.map((rule) => rule.quote).join(" ");
    const missing = phrases.filter((phrase) => !lead.line.includes(phrase) || !quoted.includes(phrase));
    check(`motion to change: ${name}: what the line names is in the quotes beside it`, missing.length === 0, missing.join("; "));
    check(`motion to change: ${name}: the line predicts nothing`, !/\b(?:likely|will (?:be|get|win)|chance|strong|weak|succeed|should)\b/i.test(lead.line), lead.line);
  };

  const mc = PERSONAS.find((persona) => persona.id === "family-motion-to-change-support");
  const mcLead = mc ? motionToChangeLead("family", mc.story, true, false) : null;
  checkLead("the father asking to lower his support order", mcLead, "asking", ["r. 15 (5)", "r. 15 (2)", "r. 15 (17)", "r. 15 (18)"], [
    "final order",
    "motion to change (Form 15)",
    "consent motion to change (Form 15C)",
    "consent motion to change child support (Form 15D)",
    "assignee",
  ]);
  check("motion to change: the father's route replaces the temporary-motion card", mcLead?.replacesTemporaryMotionCard === true);

  const served = "We have a 2021 court order for child support. My ex served me a Motion to Change to increase it.";
  checkLead("a parent served with a motion to change", motionToChangeLead("family", served, true, true), "responding", ["r. 15 (9)", "r. 15 (10)"], [
    "response to motion to change (Form 15B)",
    "consent motion to change (Form 15C)",
    "30 days",
    "60 days",
    "Canada or the United States",
  ]);
  check("motion to change: the served parent is never told to bring one", motionToChangeLead("family", served, true, true)?.line.includes("you bring a motion to change") === false);
  check(
    "motion to change: the response line names the assignee's copy (r. 15 (9) 2 ii)",
    /assignee/.test(motionToChangeLead("family", served, true, true)?.line ?? "") && /assignee/.test(motionToChangeLead("family", served, true, true)?.rules.find((rule) => rule.pinpoint === "r. 15 (9)")?.quote ?? ""),
  );

  // Who wants the change decides the route (re-review 2026-10-14).
  const byWho: [string, string, boolean, MotionToChangeLead["kind"] | null][] = [
    // Their own motion (review 2026-10-14): served by them, not on them.
    ["the person served their ex", "We have a support order. I served my ex with a motion to change last month and he hasn't answered.", false, "asking"],
    // "he got served" is not the person; whose motion it is is not said plainly.
    ["the person served him", "We have a support order. I served him and he got served with the motion to change on Monday.", false, null],
    ["the person filed their own motion", "We have a support order. I filed my motion to change last week.", false, "asking"],
    // Responding to theirs is never "you bring a motion to change" (review 2026-10-14).
    ["filed a response to his", "We have a support order. I filed my response to his motion to change last week.", false, "responding"],
    ["filed a response to the motion", "We have a support order. I filed a response to the motion to change.", false, "responding"],
    ["filed a 15B response", "We have a support order. We filed our Form 15B response to her motion to change.", false, "responding"],
    ["an affidavit in reply", "We have a support order. I filed an affidavit in reply to his motion to change.", false, "responding"],
    ["served a response after getting hers", "We have a support order. I served my response on her lawyer after getting her motion to change.", false, "responding"],
    ["reading the one he served", "We have a support order. I started reading the motion to change he served.", false, "responding"],
    ["took the one he sent to a lawyer", "We have a support order. I brought the motion to change he sent me to a lawyer.", false, "responding"],
    // Strong wordings read past "form" and "package" when the other side gave it.
    ["served the form", "We have a support order. He served me the motion to change form on Friday.", false, "responding"],
    ["a package from his lawyer", "We have a support order. I got the motion to change package from his lawyer.", false, "responding"],
    // Someone else served, or blank forms, kits and drafts: never "you were served".
    ["the person's sister served", "We have a support order. My sister got served with a motion to change.", false, null],
    ["a blank form, and an own ask", "We have a support order. I got a motion to change form from the court website and want to lower the support.", false, "asking"],
    ["the clerk's form", "We have a support order. The clerk gave me a motion to change form to fill out.", false, null],
    ["the person's lawyer's draft", "We have a support order. My lawyer sent me a draft motion to change to lower the support.", false, "asking"],
    ["a kit at the court office", "We have a support order. We were given a motion to change kit at the family court office.", false, null],
    // Every want is read, not only the first (review 2026-10-14).
    ["a no, then an ask", "There is a support order. I don't want to change anything but I want to lower the support.", false, "asking"],
    ["never wanted the order, now wants a change", "There is a support order. I never wanted the order, and now I want to change it.", false, "asking"],
    ["the ex wants to reduce", "There is a support order. My ex wants to reduce child support. What do I do?", false, "if-served"],
    ["the ex asks the court", "There is a support order. My ex is asking the court to reduce the support.", false, "if-served"],
    ["the original respondent wants a change", "There is a court order. I'm the respondent in the original case. I want to lower the support", true, "asking"],
    ["taken to court in 2019, now wants a change", "She took me to court in 2019 and there is a support order. Now I want to reduce support", true, "asking"],
    ["both agree to lower it", "we have a support order and we both agree to lower it", false, "asking"],
    // A want said with a no is not an ask (final re-check 2026-10-14).
    ["the person does not want it lowered", "There is a support order. I do not want the support lowered.", false, null],
    ["the ex wants it cut, the person does not", "There is a support order. He wants the support cut. I do not want the support lowered.", false, null],
    ["the person never agreed to change it", "There is a support order. We never agreed to change it.", false, null],
    // Served, in other words (final re-check 2026-10-14).
    ["a motion to change in the mail", "There is a support order. I got a motion to change in the mail from her lawyer.", false, "responding"],
    ["handed a motion to change", "There is a support order. The process server gave me a motion to change.", false, "responding"],
  ];
  for (const [name, text, responding, kind] of byWho) {
    const got = motionToChangeLead("family", text, true, responding);
    check(`motion to change: ${name} -> ${kind ?? "no route"}`, (got?.kind ?? null) === kind, JSON.stringify(got?.kind ?? null));
    if (kind !== "asking") check(`motion to change: ${name}: never told to bring one`, !/you bring a motion to change/.test(got?.line ?? ""));
  }
  checkLead("the other side wanting a change", motionToChangeLead("family", "There is a support order. My ex wants to reduce child support. What do I do?", true, false), "if-served", ["r. 15 (9)", "r. 15 (10)"], [
    "response to motion to change (Form 15B)",
    "consent motion to change (Form 15C)",
    "assignee",
    "30 days",
    "60 days",
  ]);
  check("motion to change: the other side's wish leaves the temporary-motion card", motionToChangeLead("family", "There is a support order. My ex wants to reduce child support. What do I do?", true, false)?.replacesTemporaryMotionCard === false);

  const noRoute: [string, string, boolean, boolean][] = [
    ["family", "i want to start a case for custody of my son", false, false],
    ["family", "there is a support order from 2022 and he has not paid in months", true, false],
    ["family", "the court order says i have the kids every weekend", true, false],
    ["family", "we have a custody order. i want to change my lawyer", true, false],
    ["family", "there is a court order from 2020. i need a change of name for my daughter", true, false],
    ["family", "there is a support order and i was served with an application to change my parenting time", true, true],
    ["civil", "i want the court order lowered", true, false],
    ["small-claims", "how do i get the judgment changed", true, false],
  ];
  for (const [court, text, existingOrder, responding] of noRoute) {
    check(`motion to change: no route offered for ${court} '${text}'`, motionToChangeLead(court, text, existingOrder, responding) === null, JSON.stringify(motionToChangeLead(court, text, existingOrder, responding)?.kind));
  }
  const urgent = motionToChangeLead("family", "there is a support order. i lost my job and need the support lowered right away, i need a temporary order", true, false);
  check("motion to change: urgency or a temporary order keeps the temporary-motion card", urgent?.kind === "asking" && urgent.replacesTemporaryMotionCard === false);
  const calm = motionToChangeLead("family", "there is a support order and i want the support reduced. nothing urgent", true, false);
  check("motion to change: 'nothing urgent' is not urgency", calm?.replacesTemporaryMotionCard === true);

  const builder = read("app/builder/page.tsx");
  const leadAt = builder.indexOf("<MotionToChangeRoute");
  const stageAt = builder.indexOf("<StageConfirmation");
  check("motion to change: the route leads the results, above the stage", leadAt > 0 && stageAt > leadAt);
  check("motion to change: the page passes whether the person was served", /motionToChangeLead\([\s\S]{0,400}respondingInFamilyStory\(familyStory\)/.test(builder));
  check("motion to change: the temporary-motion card is hidden only when the route replaces it", /!confirmedStage && !motionLead\?\.replacesTemporaryMotionCard \? \(\s*<ProcedureAuthorityDisplay/.test(builder));
}

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
