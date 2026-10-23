/**
 * The amount offered as "the amount claimed" is the one owed, claimed or the
 * damage -- never an amount already paid, a fee or a price -- and nothing is
 * offered when the story leaves it unclear (claimAmount.ts).
 *
 * What it checks: claimAmountFromStory on the stories from the #470 re-test and
 * the cases the earlier readers already handled; that the review panel's
 * suggestion (amountFromStory) and the Small Claims form's own box
 * (extractNarrativePrefill) read the amount the same way, with its sentence.
 *
 * Failure it exists to catch: the #470 re-test, where the review offered $2,000
 * (already paid) when $6,000 was still owed, and a $3,800 fee instead of $2,500
 * of damage. One reader took the first amount in each sentence; the form took
 * the first dollar amount in the whole story.
 *
 * Run: npm run test:claim-amount
 */
import { claimAmountFromStory } from "../../src/lib/case-system/claimAmount";
import { amountFromStory } from "../../app/builder/_components/storyAnswers";
import { extractNarrativePrefill } from "../../src/lib/case-system/intelligence/narrativePrefill";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const CASES: [string, string, string | null][] = [
  ["paid, then still owed, in one sentence", "I hired Test Renovations Ltd. in March 2026 to build a deck for $8,000. I paid $2,000 and $6,000 is still owed.", "$6,000"],
  ["paid, then still owed, in separate sentences", "I hired them for $8,000. I paid $2,000 and they never finished. $6,000 is still owed back to me.", "$6,000"],
  ["a fee and the damage, in one sentence", "The mechanic charged me a $3,800 fee and caused $2,500 of damage to my car.", "$2,500"],
  ["a fee and the damage, in separate sentences", "The garage charged a $3,800 repair fee. They caused $2,500 in damage.", "$2,500"],
  ["a price and a payment, nothing owed: unclear, so asked", "I hired them to build a deck for $8,000. I paid $2,000 and they never finished.", null],
  ["only a fee: asked", "I was charged a $300 late fee.", null],
  ["what they want back, over what they are said to owe", "My landlord kept my $1,800 deposit. He says I owe $500 for cleaning but I want the $1,800 back.", "$1,800"],
  ["the story's only amount, paid and lost", "I paid a contractor $9,000 on May 12, 2026 to fix my roof and he never came back.", "$9,000"],
  ["the story's only amount, a deposit kept", "a supplier kept my $62,000 deposit and never delivered the equipment.", "$62,000"],
  ["'owes them 68000' is $68,000", "a supplier saying my business owes them 68000", "$68,000"],
  ["'paid 12,500' keeps its thousands", "We paid 12,500 for the roof.", "$12,500"],
  ["no commas", "they owe me 4500", "$4,500"],
  ["a year is never an amount", "i pay support from a court order in 2022", null],
];
for (const [name, story, want] of CASES) {
  const got = claimAmountFromStory(story);
  check(`${name}: ${want ?? "nothing offered"}`, (got?.value ?? null) === want, JSON.stringify(got));
  if (got) check(`${name}: shown with the sentence it came from`, story.includes(got.quote));
  check(`${name}: the review's suggestion reads it the same way`, (amountFromStory(story)?.value ?? null) === want);
  const form = extractNarrativePrefill({ narrative: story, courtPath: "small-claims" }).facts.find((fact) => fact.field === "amountClaimed");
  check(`${name}: the Small Claims form's own box reads it the same way`, (form ? String(form.value) : null) === want, JSON.stringify(form ?? null));
}

if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
console.log("PASS claim amount: the amount owed or claimed, never one paid or a fee, nothing when unclear");
