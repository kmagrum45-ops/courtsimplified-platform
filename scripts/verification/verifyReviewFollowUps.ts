/**
 * The #470 re-test's follow-up items that are pure functions (the browser half is
 * tests/browser/retest-471.spec.ts and the story pack).
 *
 * What it checks:
 *   - answering again with the same value moves the answer onto the current story
 *     (reaffirmAnswers), only the answer named, so "Answered for an earlier version
 *     of your story" can clear;
 *   - a date typed with no year is asked for its year (the review's served-date box
 *     and Small Claims date answers use the same check as the questions);
 *   - one closing full stop after the person's words ("Leo, age 7." not "..");
 *   - a citation listed once per line, in the checked answer and the step's rules;
 *   - a date read from an answer the person gave is labelled as their answer, not
 *     "From your story";
 *   - Small Claims: "No" to "Has a Plaintiff's Claim been filed?" in the review shows
 *     as the "Claim Filed" line.
 *
 * Failure it exists to catch: each item of the #470 re-test listed above.
 *
 * Run: npm run test:review-follow-ups
 */
import { reaffirmAnswers, staleAnswerKeys, tagAnswers, BASIS_SECTION } from "../../src/lib/case-system/storyBasis";
import { servedDateNeedsYear } from "../../app/builder/_components/guidedFields";
import { withFullStop, acknowledgement } from "../../app/builder/_components/GuidedFormChat";
import { citationLine } from "../../app/_components/CheckedAnswerPanel";
import { joinPinpoints } from "../../app/_components/WhatComesNext";
import { hintBasis } from "../../app/builder/_components/StageAnswerPanel";
import { reviewEntries } from "../../src/lib/case-system/intakeReview";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

// 1. Answering again with the same value.
{
  const OLD = "Synthetic old story: we separated in 2025.";
  const NEW = "Synthetic new story: we separated in 2026 and I want spousal support.";
  const sections: Record<string, Record<string, unknown>> = { story: { text: OLD }, family: { yourRole: "applicant" } };
  sections[BASIS_SECTION] = tagAnswers(sections as never, "family", "yourRole", undefined, "applicant");
  sections.story = { text: NEW };
  const checkpoint = (s: typeof sections) => ({ courtPath: "family", sections: s }) as never;
  check("after the story changes, the old side is answered for an earlier version", staleAnswerKeys(checkpoint(sections)).includes("family.yourRole"));
  const sameAgain = { ...sections, [BASIS_SECTION]: reaffirmAnswers(sections as never, "family", "yourRole", "applicant") };
  check("choosing the same side again moves it onto the current story", !staleAnswerKeys(checkpoint(sameAgain)).includes("family.yourRole"));
  const civil: Record<string, Record<string, unknown>> = { story: { text: OLD }, civil: { input: { yourRole: "plaintiff", documents: ["nothing"] } } };
  civil[BASIS_SECTION] = tagAnswers(civil as never, "civil", "input", undefined, civil.civil.input);
  civil.story = { text: NEW };
  const reaffirmedRole = { ...civil, [BASIS_SECTION]: reaffirmAnswers(civil as never, "civil", "input", civil.civil.input, "yourRole") };
  const stale = staleAnswerKeys(({ courtPath: "civil", sections: reaffirmedRole }) as never);
  check("civil: only the answer given again moves; the others stay marked", !stale.includes("civil.input.yourRole") && stale.includes("civil.input.documents"), stale.join(", "));
}

// 2. A date with no year is asked for its year.
check("\"October 6\" is asked for its year", Boolean(servedDateNeedsYear("October 6")));
check("\"October 6, 2026\", \"2026-10-06\" and \"6 October 2026\" are accepted", ["October 6, 2026", "2026-10-06", "6 October 2026"].every((date) => servedDateNeedsYear(date) === null));

// 3. One closing full stop.
check("one full stop after words that already end with one", withFullStop("Leo, age 7.") === "Leo, age 7." && withFullStop("Northwind Supplies Ltd.") === "Northwind Supplies Ltd." && withFullStop("Leo, age 7") === "Leo, age 7.");
const ack = acknowledgement({ key: "otherParty", label: "Other party", question: "Who is it with?", kind: "text" } as never, "Northwind Supplies Ltd.");
check("the guided chat's \"Got it\" line keeps one full stop", ack === "Got it: Northwind Supplies Ltd.", ack);

// 4. Citations once per line.
check("the checked answer lists a section once", citationLine([{ citation: "Family Law Act, s. 24 (1)-(3)" }, { citation: "Family Law Act, s. 24 (1)-(3)" }, { citation: "Family Law Rules, r. 10" }]) === "Family Law Act, s. 24 (1)-(3); Family Law Rules, r. 10");
check("a step's rules list a pinpoint once", joinPinpoints(["r. 9.01", "r. 9.01", "r. 9.02"]) === "r. 9.01 and r. 9.02");

// 5. The label says where the date came from.
const story = "My former partner started a case. It is about parenting time.";
check("a date in the story is labelled as the story", hintBasis("My former partner started a case on October 6, 2026.", "My former partner started a case on October 6, 2026.").startsWith("from your story"));
const typed = hintBasis("Served with the court papers on: October 6, 2026", story);
check("a date the person typed as an answer is labelled as their answer", typed.startsWith("from your answer") && typed.includes("October 6, 2026") && !typed.includes("Served with"), typed);

// 6. Small Claims: the review's "No" shows as Claim Filed.
const entries = reviewEntries({
  courtPath: "small-claims",
  sections: { story: { text: "Synthetic: I paid $9,000 and the work was never done." }, builder: { step: "guided", initialAnswers: { "sc-claim-filed": "No" } }, guided: { facts: { role: "plaintiff" } } },
} as never);
const claimFiled = entries.find((entry) => entry.field === "claimFiled");
check("\"No\" to the claim-filed question shows as the Claim Filed line, unticked", claimFiled !== undefined && claimFiled.value === false, JSON.stringify(entries.map((entry) => entry.field)));

if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
console.log("PASS review follow-ups: answers re-confirm, years asked, one full stop, one citation, labels say their source");
