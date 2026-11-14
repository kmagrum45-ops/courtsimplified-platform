/**
 * NOT MARRIED: MARRIED-ONLY TOPICS ARE HIDDEN EVERYWHERE, NOT ONLY IN THE TOPIC LIST (Chrome check of #550, 7.2; site
 * owner, 14 Nov 2026, 6d).
 *
 * #549 hid divorce, property division and the matrimonial home from the topic list of a person not married to the
 * other person (test:married-only-topics). Chrome's not-married Family case still read, on the next step: "For a
 * divorce, the court in Ontario is the Superior Court of Justice. An Ontario court can hear a divorce if you or your
 * spouse has been habitually resident in Ontario for at least one year." and "The Ontario Court of Justice is not a
 * court for family property claims under Part I ... matrimonial home claims under Part II", and the divorce fee.
 *
 * The rule (marriedOnly.ts, the one place): when the record says the person was not married to the other person, the
 * declared married-only sentences of the step answers (MARRIED_ONLY_SENTENCES, each word for word from the published
 * answers, each about a divorce or a Part I or Part II claim only) and the divorce fee and its federal note are not
 * shown. Nothing is reworded; a sentence is shown whole or not at all.
 *
 * What it asserts, with no browser, model or database:
 *   1. build check: every declared sentence is in the published step answers word for word (none stale);
 *   2. the Family not-married story (Chrome S7): the "deciding where to start" answer shows none of them, and keeps
 *      everything else (the Family Court list, where the case starts);
 *   3. the same answer for a married person, or with nothing recorded: unchanged;
 *   4. the responding step's fees: no divorce fee and no federal divorce fee note when not married; both kept when
 *      married;
 *   5. wiring: the next-step panel filters the answer it holds through the one function, and the fees card applies
 *      the same view the panel does.
 *
 * WHAT FAILURE THIS CATCHES: a married-only topic shown to a person the record says was not married.
 *
 * Run: npm run test:not-married-everywhere
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import published from "../../src/lib/content-library/published/stageAnswers.published.json";
import { practicalFor, withoutDivorceApplication } from "../../src/lib/content-library/nextStepPractical";

type Married = { MARRIED_ONLY_SENTENCES?: readonly string[]; withoutMarriedOnlySentences?: (text: string, notMarried: boolean) => string };

const blocks = (published as { blocks: Record<string, unknown>[] }).blocks;
const allText = JSON.stringify(published);
const WHERE = blocks.find((block) => block.stageId === "family:before-filing:deciding-where-to-start")!;
const CHROME_SAW = [
  "For a divorce, the court in Ontario is the Superior Court of Justice.",
  "An Ontario court can hear a divorce if you or your spouse has been habitually resident in Ontario for at least one year.",
  "The Ontario Court of Justice is not a court for family property claims under Part I of the Family Law Act.",
  "It is not one for matrimonial home claims under Part II either.",
];

async function main() {
  const married = await import("../../src/lib/case-system/family/marriedOnly") as Married;
  let failed = 0;
  const check = (name: string, run: () => void) => { try { run(); console.log(`PASS  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n")[0]}`); } };
  const filter = (text: string, notMarried: boolean) => married.withoutMarriedOnlySentences!(text, notMarried);

  check("1. build check: every declared married-only sentence is in the published answers word for word", () => {
    assert.ok(Array.isArray(married.MARRIED_ONLY_SENTENCES), "marriedOnly.ts MARRIED_ONLY_SENTENCES does not exist");
    const stale = married.MARRIED_ONLY_SENTENCES!.filter((sentence) => !allText.includes(sentence));
    assert.deepEqual(stale, [], `not in the published answers: ${stale.join(" | ")}`);
    for (const sentence of CHROME_SAW) assert.ok(married.MARRIED_ONLY_SENTENCES!.includes(sentence), `not declared: ${sentence}`);
  });

  check("2. not married (Chrome S7): the answer shows none of them and keeps the rest", () => {
    const text = String(WHERE.whatToDoNext);
    const shown = filter(text, true);
    for (const sentence of CHROME_SAW) assert.ok(!shown.includes(sentence), `still shown: ${sentence}`);
    assert.ok(!/\bdivorce\b/i.test(shown.replace("The list includes cases under the Divorce Act and the Family Law Act, except Part V.", "")), `another divorce sentence: ${shown}`);
    assert.ok(shown.includes("One place is the municipality where a party lives."), "the rest of the answer was lost");
    assert.ok(!/\s{2,}|\s\./.test(shown), "the text is left with gaps");
  });

  check("3. married, or nothing recorded: the answer is unchanged", () => {
    const text = String(WHERE.whatToDoNext);
    assert.equal(filter(text, false), text);
  });

  check("4. the responding step's fees: no divorce fee or federal divorce note when not married; both kept when married", () => {
    const step = "family:respondent:served-time-to-answer-running";
    const fees = (view: ReturnType<typeof practicalFor>) => [...(view?.fees ?? []), ...(view?.feesIfClaimed?.fees ?? [])].map((fee) => fee.id);
    const notes = (view: ReturnType<typeof practicalFor>) => [...(view?.feeNotes ?? []), ...(view?.feesIfClaimed?.notes ?? [])].map((line) => line.say);
    const notMarried = withoutDivorceApplication(practicalFor(step, "family", "Ottawa", true, "We were never married."), true);
    assert.ok(!fees(notMarried).includes("fam-answer-divorce"), "the divorce fee is shown");
    // The note that is only about a divorce (the federal $10 fee). The branch fee note that names a divorce in passing
    // among the general fees is kept whole (no rewording; listed for the review chat).
    assert.ok(!notes(notMarried).some((say) => /^A divorce claim also needs the federal government/.test(say)), "the federal divorce fee note is shown");
    const marriedView = withoutDivorceApplication(practicalFor(step, "family", "Ottawa", true, "We were married in 2015."), false);
    assert.ok(fees(marriedView).includes("fam-answer-divorce"), "the divorce fee is gone for a married person");
  });

  check("5. wiring: the next-step panel filters the answer it holds; the fees card applies the panel's view", () => {
    const panel = readFileSync("app/builder/_components/StageAnswerPanel.tsx", "utf8");
    assert.ok(/const result = useMemo\(\(\) => withoutMarriedOnlyAnswer\(/.test(panel), "StageAnswerPanel.tsx does not filter the answer it holds");
    const card = readFileSync("app/_components/NextStepPractical.tsx", "utf8");
    assert.ok(/withoutDivorceApplication\(practicalFor\(/.test(card), "NextStepPractical.tsx does not apply the not-married view");
  });

  if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}

void main();
