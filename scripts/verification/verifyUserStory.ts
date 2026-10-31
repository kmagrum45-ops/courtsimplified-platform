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
 * (walkthrough run 38525903567, FR) "my ex gf" not offered as "not married",
 * or someone else's girlfriend read as the other party.
 *
 * Run: npm run test:user-story
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { sentenceFromRecord, storyFromRecord, userStory } from "../../src/lib/case-system/userStory";
import { candidatesFromTimeline } from "../../src/lib/case-system/events/caseEventCandidates";
import { dateInSentence, storyHintsForDates } from "../../src/lib/case-system/casePosition";
import { storySuggestsDanger } from "../../src/lib/case-system/intake/orchestrateIntakeTurn";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { storyAnswerFor, storyQuoteFor, storySuggestionFor } from "../../src/lib/case-system/family/triageStoryQuote";

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
// Walkthrough run 38525903567, FR: "my ex gf took me to court" was asked "Were you married?".
{
  const FR = "my ex gf took me to court for custody of our daugter, i got served the papers last week.";
  const fr = storySuggestionFor("married-to-other-party", FR);
  check("FR: 'my ex gf' is offered as 'not married', to confirm", fr?.value === "no" && fr.say === "not married");
  check("FR: the sentence is quoted beside the question", storyQuoteFor("married-to-other-party", FR) === FR);
  for (const words of ["my ex girlfriend took me to court", "my ex-boyfriend wants custody", "my ex common-law wife filed an application", "my ex bf stopped paying"]) {
    check(`'${words}' offers not married`, storyAnswerFor("married-to-other-party", words) === "no");
  }
  for (const words of ["my brother's ex girlfriend is helping me", "her ex-boyfriend lives with her now", "my new girlfriend helps with pickups", "my former partner moved away", "my ex partner took me to court", "she was never my girlfriend, just a friend", "my ex took me to court"]) {
    check(`'${words}' offers nothing`, storyAnswerFor("married-to-other-party", words) === null);
  }
  // A bare "partner" is said by married people too (review of 70b717b).
  check("'my former partner and I were married 10 years' offers Yes, never 'not married'", storyAnswerFor("married-to-other-party", "my former partner and I were married 10 years") === "yes");
  // Someone else's marriage is no reading (re-review of 7f2868f).
  for (const words of ["my sister and I were married the same year", "my brother and I got married in a double wedding"]) {
    check(`'${words}' offers nothing`, storyAnswerFor("married-to-other-party", words) === null);
  }
  check("'she and I were married for 8 years' offers Yes", storyAnswerFor("married-to-other-party", "she and I were married for 8 years") === "yes");
  check("'my ex-wife and I got married in 2015' offers Yes", storyAnswerFor("married-to-other-party", "my ex-wife and I got married in 2015") === "yes");
  check("'my ex common-law partner' still offers not married", storyAnswerFor("married-to-other-party", "my ex common-law partner took me to court") === "no");
  check("contradictory words still offer nothing", storyAnswerFor("married-to-other-party", "my ex gf, well my ex-wife really") === null);
  check("no suggestion without a plain answer", storySuggestionFor("married-to-other-party", "he stopped paying support in may") === null);
  const triage = readFileSync(path.resolve(process.cwd(), "app/builder/_components/FamilyStatusTriage.tsx"), "utf8");
  check(
    "the triage says the suggestion plainly and records it on one click",
    /storySuggestionFor\(current\.id, story\)/.test(triage) && /data-testid="triage-story-suggestion"[\s\S]{0,500}Is this right: <strong>\{suggestion\.say\}<\/strong>\?[\s\S]{0,400}<UseSuggestion[\s\S]{0,200}onUse=\{\(\) => record\(suggestion\.value\)\}/.test(triage),
  );
}

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

// Every date question reads the story, not only the hand-written dozen
// (held-back walkthrough, 2026-10-09), and a date goes to the moment nearest it.
{
  const counterclaim = storyHintsForDates(
    "i sued my former business partner. on september 25 2026 his lawyer served me with a statement of defence and counterclaim saying i owe him 60000",
    now,
  );
  check("a counterclaim served on a written date answers the claim-back question", counterclaim["sc-date-defendants-claim-served"]?.value === "2026-09-25");
  // Two moments in one sentence: each date goes to its own clause (2026-10-11).
  const twoMoments = storyHintsForDates("I was served with the claim on March 3, 2026 and filed my defence on March 20, 2026.", now);
  check("two dated moments in one sentence each keep their own date",
    twoMoments["sc-date-claim-served"]?.value === "2026-03-03" && twoMoments["sc-date-defence-filed"]?.value === "2026-03-20");
  const motion = storyHintsForDates("now they served a motion for summary judgment and the hearing is on december 3 2026.", now);
  check("the hearing date goes to the hearing question", motion["case-date-motion-hearing-date"]?.value === "2026-12-03");
  check("the hearing date is not offered as the day of service", !motion["sc-date-claim-served"]?.value);
  const defendantsClaim = storyHintsForDates("he filed a defence and now i got served with something called a defendants claim on september 28 saying i owe him", now);
  check("a service date is not offered as the day the defence was filed", !defendantsClaim["sc-date-defence-filed"]?.value);
  const bite = storyHintsForDates("the dog bit my leg when i was walking on the sidewalk on july 19 2026.", now);
  check("an injury date is also the day the claim is based on", bite["sc-date-injury"]?.value === "2026-07-19" && bite["case-date-act-or-omission"]?.value === "2026-07-19");
  const fired = storyHintsForDates("they let me go on june 30 2026 with no reason.", now);
  check("the day someone was let go is the day the claim is based on", fired["case-date-act-or-omission"]?.value === "2026-06-30");
  // 2026-10-16 live bug: a deposit-taker who never performed had no cue at
  // all, so the sentence was never even quoted back, however complete the
  // date in it. "in August 2026" has no day, so no value is offered -- that
  // part is correct (STORY_CUES' own rule: a date is offered only complete,
  // year included) -- but the sentence must now be quoted, where before
  // this question had no entry whatsoever.
  const deposit = storyHintsForDates("A contractor took a $3,000 deposit and never did the work, in August 2026.", now);
  check(
    "a deposit-taker's non-performance is quoted for the day the claim is based on",
    (deposit["case-date-act-or-omission"]?.quote ?? "").includes("never did the work"),
    JSON.stringify(deposit["case-date-act-or-omission"]),
  );
  // 2026-10-17 live bug: "He never paid anything" was quoted as a date hint
  // (the cue matched, no date was nearby, and the no-date fallback quotes
  // whichever cue-matching sentence it finds regardless of whether it has a
  // date at all) and the UI's only message for a valueless hint said "Pick
  // that date above, with its year" -- flatly wrong for a sentence with no
  // date in it whatsoever. mentionsDate must say so, so the UI can tell the
  // two situations apart instead of always claiming a date is in the quote.
  const oldLoan = storyHintsForDates("I lent Mike $5,000 due December 31, 2023. He never paid anything.", now);
  check(
    "a dateless cue-matching sentence is marked as not giving a date",
    oldLoan["case-date-act-or-omission"]?.quote === "He never paid anything." &&
      oldLoan["case-date-act-or-omission"]?.mentionsDate === false,
    JSON.stringify(oldLoan["case-date-act-or-omission"]),
  );
  check(
    "a sentence that DOES give a date is never marked as not giving one",
    bite["sc-date-injury"]?.mentionsDate === undefined,
    JSON.stringify(bite["sc-date-injury"]),
  );
  check("a written date fills the timeline's date box", dateInSentence("Now the trial is on January 14 2027.")?.iso === "2027-01-14");
  check("a date without a year fills only the words", dateInSentence("The papers came on December 3.")?.iso === null);
}

// The safety question only when the person's words suggest danger (site owner, 2026-10-10).
{
  check("a threat in the story raises the safety question", storySuggestsDanger("He threatened me when I asked for the money back."));
  check("fear for safety raises it", storySuggestsDanger("I'm scared he will come to my house."));
  check(
    "an ordinary money dispute does not",
    !storySuggestsDanger("I'm being sued by a contractor for $4,100 he says I owe for a deck. The trial is on January 14 2027."),
  );
  const safety = QUESTION_BANK.find((question) => question.id === "sc-safety-check");
  check("the safety question is asked only when that was raised", JSON.stringify(safety?.appliesWhen) === JSON.stringify({ field: "safetyConcernMentioned", op: "truthy" }));
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll user-story checks passed.");
