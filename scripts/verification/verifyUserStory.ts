/**
 * The user's own words are what pages show back to them, never the labelled
 * record the analysis reads; and a date in their story without a year is
 * still offered for counting their deadline.
 *
 * WHY (page review, 2026-10-06). Six independent reviewers read every page the
 * walkthrough personas saw. They found:
 *   - the Timeline offering "Small Claims Ontario intake Stage selected: ...
 *     User name: not entered ..." as a sentence "from what you wrote";
 *   - "What you told us" and the printed case file headed "What happened, in
 *     your words" showing "Court path: Civil / User role: defendant /
 *     Selected issue signals: ...";
 *   - no served person ever seeing their due date, because "I was served on
 *     September 20" has no year and the date was offered only with one.
 *
 * WHAT IT CATCHES:
 *   - a record label reaching a sentence offered back to the user;
 *   - a label-only fragment offered at all;
 *   - the story lost when it is the only real text in a record;
 *   - plain user text altered;
 *   - a month-and-day date not offered, offered in the future, or offered
 *     without saying the year was assumed;
 *   - a page that shows the user's words going back to reading `facts` raw;
 *   - the family triage asking "were you married?" with no sign of the story
 *     that already says so (2026-10-07), or quoting a sentence that does not
 *     bear on the question.
 *
 * COSTS NOTHING: pure functions and source reads.
 *
 * Run: npm run test:user-story
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { sentenceFromRecord, storyFromRecord, userStory } from "../../src/lib/case-system/userStory";
import { candidatesFromTimeline } from "../../src/lib/case-system/events/caseEventCandidates";
import { storyHintsForDates } from "../../src/lib/case-system/casePosition";
import { storyAnswerFor, storyQuoteFor } from "../../src/lib/case-system/family/triageStoryQuote";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`ok    ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const LABEL = /\b(?:Court path|User role|Stage selected|Selected issue|User name|Court location|Claim number|Main story|Facts|Timeline|Evidence described|Urgent concerns):/;

const scRecord = [
  "Small Claims Ontario intake",
  "Stage selected: Starting a new case",
  "User name: not entered",
  "Court location: ",
  "Facts: I painted a house in July and he never paid my invoice of 4800.",
  "Timeline: ",
  "Evidence described: ",
  "Urgent concerns: ",
].join("\n\n");
const flattened = scRecord.replace(/\s+/g, " ");

check(
  "a record flattened into one sentence gives back only the story",
  sentenceFromRecord(flattened) === "I painted a house in July and he never paid my invoice of 4800.",
  JSON.stringify(sentenceFromRecord(flattened)),
);
check(
  "a fragment of labels with nothing after them is dropped",
  sentenceFromRecord("Timeline: Evidence described: Missing evidence: Goal / requested outcome: Urgent concerns:") === "",
);
const plain = "I sent him reminders by text and email, and he keeps saying next week.";
check("plain user text is untouched", sentenceFromRecord(plain) === plain);

const civilRecord =
  "Court path: Civil\nStage: Responding to a case\nUser role: defendant\nSelected issue signals: Debt / money owed\n" +
  "Main story: I got served a statement of claim. It wasn't a loan.\nKnown evidence: the emails";
check(
  "a civil record gives back its story",
  storyFromRecord(civilRecord) === "I got served a statement of claim. It wasn't a loan.",
  JSON.stringify(storyFromRecord(civilRecord)),
);
check("a family save's own story wins", userStory({ facts: "Court path: Family\nCase story: x", extra: { story: "my words" } }) === "my words");
check("a story without labels is the story", userStory({ facts: "  just my story  " }) === "just my story");

const candidates = candidatesFromTimeline([
  { id: "a", sourceText: flattened },
  { id: "b", sourceText: "Timeline: Evidence described: Urgent concerns:" },
  { id: "c", sourceText: plain },
]);
check(
  "no Timeline candidate carries a record label",
  candidates.every((candidate) => !LABEL.test(`${candidate.title} ${JSON.stringify(candidate)}`)),
  JSON.stringify(candidates.map((candidate) => candidate.title)),
);
check("the label-only entry is not offered", candidates.length === 2, `got ${candidates.length}`);

// Year assumed: the most recent such date on or before today.
const now = new Date("2026-10-06T12:00:00Z");
const served = storyHintsForDates("I got served a statement of claim. I was served on September 20.", now)["sc-date-claim-served"];
check(
  "a month and day is offered as the most recent such date",
  served?.value === "2026-09-20" && served.yearAssumed === true,
  JSON.stringify(served),
);
const lastYear = storyHintsForDates("The papers came on December 3.", now)["sc-date-claim-served"];
check("a date later in the year is last year's", lastYear?.value === "2025-12-03", JSON.stringify(lastYear));
// Something still to come is the NEXT such date (walkthrough, 2026-10-08: a
// November 20 case conference, told in October, was read as last November's).
const conference = storyHintsForDates("Now there is a case conference on November 20.", now)["case-date-case-conference-date"];
check("an upcoming conference with no year is this year's or next, never past", conference?.value === "2026-11-20" && conference.yearAssumed === true, JSON.stringify(conference));
const nextYear = storyHintsForDates("The settlement conference is on March 3.", now)["sc-date-settlement-conference"];
check("an upcoming date earlier in the year is next year's", nextYear?.value === "2027-03-03", JSON.stringify(nextYear));
const withYear = storyHintsForDates("I was served on September 20, 2026.", now)["sc-date-claim-served"];
check("a date with its year is not marked assumed", withYear?.value === "2026-09-20" && !withYear.yearAssumed, JSON.stringify(withYear));

// The answer the story gives is offered as the highlighted choice (walkthrough 2026-10-08).
check("'we were never married' offers No", storyAnswerFor("married-to-other-party", "me and my sons father split up 2 years ago, we were never married.") === "no");
check("'My husband and I got married in 2012' offers Yes", storyAnswerFor("married-to-other-party", "My husband and I got married in 2012 and separated in January 2025.") === "yes");
check("someone else's marriage offers nothing", storyAnswerFor("married-to-other-party", "my ex got married again last year and stopped paying.") === null);
check("contradictory words offer nothing", storyAnswerFor("married-to-other-party", "my ex-husband, well we were never married really") === null);
check("'our two kids' offers Yes for a child together", storyAnswerFor("child-together", "our two kids live with me") === "yes");
check("a story with no such words offers nothing", storyAnswerFor("married-to-other-party", "he stopped paying support in may") === null);

// The family triage quotes what the story already says, beside the question.
const familyStory =
  "me and my sons father split up 2 years ago, we were never married. he hasnt paid any child suport since march";
check(
  "the married question quotes the story that answers it",
  (storyQuoteFor("married-to-other-party", familyStory) ?? "").includes("never married"),
  String(storyQuoteFor("married-to-other-party", familyStory)),
);
check("the child question quotes it too", storyQuoteFor("child-together", familyStory) !== null);
check("no quote when the story says nothing on it", storyQuoteFor("married-to-other-party", "he stopped paying in march.") === null);
check("no quote for a question with no cue", storyQuoteFor("municipality", familyStory) === null);

// The pages read the user's words through userStory.
const root = path.resolve(__dirname, "../..");
for (const file of ["app/builder/_components/IntelligenceOverviewPanel.tsx", "app/cases/[id]/case-file/page.tsx"]) {
  const source = readFileSync(path.join(root, file), "utf8");
  check(`${file} shows the story through userStory`, source.includes("userStory("));
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll user-story checks passed.");
