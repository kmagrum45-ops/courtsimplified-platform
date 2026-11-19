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

type Married = { MARRIED_ONLY_SENTENCES?: readonly string[]; withoutMarriedOnlySentences?: (text: string, notMarried: boolean) => string; withoutMarriedOnlyAnswer?: (result: object | null, notMarried: boolean) => object | null };

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

  // ---- Chrome's milestone test of #550 (16 Nov 2026), rows 40 and 44: after No and after "I'm not sure" ----------------
  const S7 = "Synthetic: Jordan and I lived together and separated in June 2026. We were never married. Our son is 4 and lives with me. I want a parenting schedule.";
  const { stagesForPathway } = await import("../../src/lib/case-system/stage-map/stageMap");
  const { buildTriageOutcome, emptyStatusRecord } = await import("../../src/lib/case-system/family/statusTriage");
  const { movesForWords } = await import("../../app/_components/WhatComesNext");
  const { isMarriedOnlyLaw, withoutMarriedOnlyLaw, MARRIED_ONLY_FAMILY_STEPS, MARRIED_ONLY_SCREEN_TEXT } = await import("../../src/lib/case-system/family/marriedOnly");
  const { FEES_IF_CLAIMED_LABEL } = await import("../../src/lib/content-library/nextStepPractical");
  const { lawBehindThis } = await import("../../src/lib/case-system/retrieval/lawBehind");

  check("6. \"What it costs\": no folded part \"Only if the case also asks for a divorce, or claims property or the matrimonial home\" when not married", () => {
    const folded = stagesForPathway("family").map((stage) => stage.id).filter((id) => practicalFor(id, "family", "Ottawa", false, S7)?.feesIfClaimed);
    assert.ok(folded.length > 0, "setup: no Family step folds its fees for a parenting story");
    assert.ok(MARRIED_ONLY_SCREEN_TEXT.includes(FEES_IF_CLAIMED_LABEL), "the browser checks' list does not hold the folded part's heading as the card shows it");
    for (const id of folded) assert.equal(withoutDivorceApplication(practicalFor(id, "family", "Ottawa", false, S7), true)?.feesIfClaimed ?? null, null, `${id}: the folded part "${FEES_IF_CLAIMED_LABEL}" is shown`);
    assert.ok(withoutDivorceApplication(practicalFor(folded[0], "family", "Ottawa", false, S7), false)?.feesIfClaimed, "a married person lost the folded part");
  });

  check("7. \"What is recorded\": no \"Asking a court for a divorce\" line after No or \"I'm not sure\"; kept after Yes", () => {
    for (const married of ["no", "unsure"] as const) {
      const lines = buildTriageOutcome({ ...emptyStatusRecord(), marriedToOtherParty: married }).recorded.map((line) => line.label);
      assert.ok(!lines.includes("Asking a court for a divorce"), `after ${married}: the divorce line is shown`);
    }
    assert.ok(buildTriageOutcome({ ...emptyStatusRecord(), marriedToOtherParty: "yes" }).recorded.some((line) => line.label === "Asking a court for a divorce"), "after Yes the divorce line is gone");
  });

  check("8. \"What can happen next\": no married-only step (a divorce, an equalization claim) when not married; shown when married", () => {
    for (const stage of stagesForPathway("family")) {
      const { lead, others } = movesForWords(stage.id, false, S7, "Ottawa", true);
      const married = [...lead, ...others].filter((move) => MARRIED_ONLY_FAMILY_STEPS.has(move.to));
      assert.equal(married.length, 0, `${stage.id}: lists ${married.map((move) => move.to).join(", ")}`);
    }
    const from = "family:before-filing:deciding-where-to-start";
    const { lead, others } = movesForWords(from, false, S7, "Ottawa", false);
    assert.ok([...lead, ...others].some((move) => MARRIED_ONLY_FAMILY_STEPS.has(move.to)), "a married person lost the divorce step");
    assert.ok(/notMarried=\{notMarried\}/.test(readFileSync("app/builder/_components/StageAnswerPanel.tsx", "utf8").match(/<WhatComesNext[^>]*>/)?.[0] ?? ""), "the next-step panel does not pass notMarried to What can happen next");
  });

  check("9. \"The law behind this\": the Divorce Act and Family Law Act Parts I and II are left out when not married; Part III kept", () => {
    assert.ok(isMarriedOnlyLaw("Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.), s. 7.3"));
    assert.ok(isMarriedOnlyLaw("Family Law Act, R.S.O. 1990, c. F.3, s. 5 (1)") && isMarriedOnlyLaw("Family Law Act, R.S.O. 1990, c. F.3, s. 24"));
    assert.ok(!isMarriedOnlyLaw("Family Law Act, R.S.O. 1990, c. F.3, s. 33 (1)") && !isMarriedOnlyLaw("Children's Law Reform Act, R.S.O. 1990, c. C.12, s. 24"));
    const overview = readFileSync("app/builder/_components/IntelligenceOverviewPanel.tsx", "utf8");
    assert.ok(/const analysis = withoutMarriedOnlyLaw\(analysisGiven, hidesMarriedOnly\(caseFile\)\);/.test(overview), "the overview does not read the analysis without the married-only law");
    const provision = (id: string, citation: string) => ({ id, citation, label: citation, sourceUrl: "https://www.ontario.ca/laws", kind: "statute" }) as never;
    const read = withoutMarriedOnlyLaw({ appliedLaw: [provision("a", "Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.), s. 7.3"), provision("b", "Family Law Act, R.S.O. 1990, c. F.3, s. 33 (1)")] }, true);
    assert.deepEqual(lawBehindThis([], read.appliedLaw).quoted.map((item: { id: string }) => item.id), ["b"], "\"The law behind this\" keeps a married-only provision for someone not married");
    assert.equal(withoutMarriedOnlyLaw({ appliedLaw: [provision("a", "Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.), s. 7.3")] }, false).appliedLaw?.length, 1, "a married person lost the provision");
    // Chrome pass 2 on #550 (7.7, 7.9): the research step's own question named the Divorce Act after No and "not sure".
    const finding = (question: string, ...citations: string[]) => ({ question, status: "answered", provisions: citations.map((citation, index) => ({ ...(provision(`p${index}`, citation) as object), quote: "" })) }) as never;
    const research = { findings: [
      finding("Should the parenting application proceed under the Children's Law Reform Act or the Divorce Act, given the parents were not married?", "Children's Law Reform Act, R.S.O. 1990, c. C.12, s. 24"),
      finding("Who decides where the child lives?", "Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.), s. 16.1"),
      finding("What must a parenting order consider?", "Children's Law Reform Act, R.S.O. 1990, c. C.12, s. 24"),
    ] };
    const questions = (married: boolean) => (withoutMarriedOnlyLaw({ research } as never, married) as { research: { findings: { question: string }[] } }).research.findings.map((item) => item.question);
    assert.deepEqual(questions(true), ["What must a parenting order consider?"], "a research question naming the Divorce Act, or resting only on it, is shown to someone not married");
    assert.equal(questions(false).length, 3, "a married person lost a research question");
  });

  check("10. the Family triage's \"What the statutes say about which court\": no Divorce Act statement after married No or not sure; kept after Yes", () => {
    // Full local run of 4d1ae680 (ask-once family-married-unsure, s7a): "Divorce Act, R.S.C. 1985" in the folded which-court
    // statements on the next step; also the 29 Oct known problem G2-triage.
    const divorce = (married: "yes" | "no" | "unsure") => buildTriageOutcome({ ...emptyStatusRecord(), marriedToOtherParty: married } as never).courtInformation.filter((statement) => /divorce/i.test(statement.text + JSON.stringify(statement.citations))).length;
    assert.equal(divorce("no"), 0, "a Divorce Act statement after married No");
    assert.equal(divorce("unsure"), 0, "a Divorce Act statement after married not sure");
    assert.ok(divorce("yes") > 0, "a married person lost the Divorce Act statement");
  });

  check("11. the step's full answer lists no married-only source after No or not sure (Divorce Act, FLA Parts I and II); Part III kept; all kept when married", () => {
    // Full local run of 17 Nov (ask-once family-married-unsure, s7a, s7b): "Divorce Act, R.S.C. 1985" in the case page's
    // "The full answer for this step, with every rule and source", Sources.
    const answer = { sections: [{ heading: "What to do", text: "File your application." }], sources: [
      { name: "Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.)", pinpoint: "s. 3 (1)", url: "https://laws-lois.justice.gc.ca" },
      { name: "Family Law Act, R.S.O. 1990, c. F.3", pinpoint: "s. 5 (1)", url: "https://www.ontario.ca/laws" },
      { name: "Family Law Act, R.S.O. 1990, c. F.3", pinpoint: "s. 33 (1)", url: "https://www.ontario.ca/laws" },
    ] };
    const kept = (notMarried: boolean) => (married.withoutMarriedOnlyAnswer!({ answer }, notMarried) as { answer: typeof answer }).answer.sources.map((source) => source.pinpoint);
    assert.deepEqual(kept(true), ["s. 33 (1)"], "a married-only source listed for someone not married or not sure");
    assert.deepEqual(kept(false), ["s. 3 (1)", "s. 5 (1)", "s. 33 (1)"], "a married person lost a source");
  });

  if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}

void main();
