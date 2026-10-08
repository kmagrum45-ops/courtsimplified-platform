/**
 * Checked answers show only what the official text supports.
 *
 * WHAT THIS CATCHES: an answer the site shows without proof. The checked
 * answer (retrieval/checkedAnswer.ts) lets the model answer first and then
 * checks every statement against the library. This suite drives that pipeline
 * with a fake drafter and a fake checker over the REAL library, and asserts
 * the property, whatever the model says:
 *   - a statement is shown only with words that are really in the passage it
 *     cites, from a passage the library actually returned;
 *   - a statement whose number is in neither the law nor the person's words,
 *     or that predicts or grades the case, is not shown;
 *   - a wrong statement is shown only in the checker's corrected form, and
 *     only if that form passes the same checks;
 *   - "will I win?" is declined in fixed words; a question outside the law the
 *     site covers gets fixed words and no law;
 *   - a law the library does not hold is reported as missing, not stated;
 *   - any failure answers "unavailable" so callers fall back, never throws.
 *
 * COSTS NOTHING. No model, no network: the drafter, checker and embedder are
 * fakes; the library is the committed index under docs/sources/retrieval/.
 *
 * Run: node --import tsx scripts/verification/verifyCheckedAnswer.ts
 */

import { loadCorpusIndex, type Passage } from "../../src/lib/case-system/retrieval/corpusIndex";
import {
  checkedAnswer,
  checkedAnswerView,
  DECLINE_TO_JUDGE,
  parseCheck,
  parseDraft,
  statementRejection,
  withoutTalkAboutPassages,
  numberNotStatedOrWorkedOut,
  parseDoubts,
  mergeDrafts,
  type CheckedAnswerDeps,
} from "../../src/lib/case-system/retrieval/checkedAnswer";
import { quoteAppearsIn } from "../../src/lib/case-system/intelligence/quoteMatch";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`pass  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const index = loadCorpusIndex();

/** A fake embedder: no vectors that match anything, so only named sections are read. */
const noSearch: CheckedAnswerDeps["embed"] = async (texts, _model, dimensions) => texts.map(() => new Array(dimensions).fill(0));

/**
 * A checker that answers from a script keyed by the statement's number in the
 * draft (`texts`), using the passages it was given. The pipeline checks one
 * statement per call, so the scripted result for that statement is returned
 * as number 1.
 */
function scriptedCheck(script: (statements: string[], passages: Passage[]) => unknown, texts: string[] = []): CheckedAnswerDeps["check"] {
  return async (statements, passages) => {
    const n = Math.max(1, texts.indexOf(statements[0]) + 1);
    const all = (script(statements, passages) as { results?: { n: number }[] }).results ?? [];
    return JSON.stringify({ results: all.filter((item) => item.n === n).map((item) => ({ ...item, n: 1 })) });
  };
}

const passageFor = (passages: Passage[], sourceId: string) => passages.find((passage) => passage.sourceId === sourceId);

async function main() {
  check("the library loads", Boolean(index), "docs/sources/retrieval/ is missing");
  if (!index) {
    process.exitCode = 1;
    return;
  }

  const cpaStatements = [
    { text: "You can cancel a direct agreement without any reason within 10 days after you receive the written copy of it.", cites: ["Consumer Protection Act, 2002, s. 43 (1)"] },
    { text: "You must give notice of cancellation within 30 days.", cites: ["Consumer Protection Act, 2002, s. 43 (1)"] },
    { text: "You will likely win if you cancel in time.", cites: ["Consumer Protection Act, 2002, s. 43 (1)"] },
    { text: "The Imaginary Statute Act requires a 90-day notice first.", cites: ["Imaginary Statute Act, s. 12"] },
  ];
  const cpaTexts = cpaStatements.map((statement) => statement.text);
  const draftCpa = async () => JSON.stringify({ scope: "ontario", asksForPrediction: false, statements: cpaStatements });

  // ---- 1. A true statement, quoted from the passage it cites, is shown
  const seenPassages: Passage[] = [];
  const answer = await checkedAnswer(
    { question: "Can I cancel the window contract the salesperson signed with me at my kitchen table?", courtPath: "small-claims" },
    {
      index,
      draft: draftCpa,
      embed: noSearch,
      check: scriptedCheck((statements, passages) => {
        seenPassages.push(...passages);
        const cpa = passageFor(passages, "consumer-protection-act-2002");
        return {
          results: [
            { n: 1, verdict: "supported", passage: cpa?.id, quote: "may, without any reason, cancel a direct agreement at any time from the date of entering into the agreement until 10 days after the consumer has received the written copy of the agreement", topic: "cancelling a direct agreement" },
            // Wrong: the checker claims support with words that are not in the passage.
            { n: 2, verdict: "supported", passage: cpa?.id, quote: "notice of cancellation may be given within 30 days of the agreement", topic: "time to give notice" },
            { n: 3, verdict: "supported", passage: cpa?.id, quote: "A consumer may, without any reason, cancel a direct agreement", topic: "outcome" },
            { n: 4, verdict: "unsupported", passage: "", quote: "", topic: "a 90-day notice" },
          ],
        };
      }, cpaTexts),
    },
  );
  const cpa = passageFor(seenPassages, "consumer-protection-act-2002");
  check("the section the answer names is fetched from the library", Boolean(cpa) && /43/.test(cpa?.pinpoint ?? ""), cpa?.pinpoint);
  check("a statement the passage supports, word for word, is shown", answer.statements.some((statement) => statement.text.startsWith("You can cancel a direct agreement")), JSON.stringify(answer.statements.map((s) => s.text)));
  check(
    "every statement shown carries words that are really in its passage",
    answer.statements.length > 0 &&
      answer.statements.every((statement) => statement.sources.length > 0 && statement.sources.every((source) => quoteAppearsIn(source.quote, seenPassages.find((p) => p.id === source.passageId)?.text ?? ""))),
  );
  check("a statement whose quote is not in the passage is not shown", !answer.statements.some((statement) => /30 days/.test(statement.text)));
  check("a statement that predicts the outcome is not shown", !answer.statements.some((statement) => /likely win/.test(statement.text)));
  check("a law the library does not hold is reported missing, not stated", answer.missingLaw.some((law) => /Imaginary Statute/.test(law)) && !answer.statements.some((s) => /Imaginary/.test(s.text)));
  check("what could not be confirmed is listed by topic", answer.notConfirmed.includes("time to give notice") && answer.notConfirmed.some((topic) => /90-day notice/.test(topic)), JSON.stringify(answer.notConfirmed));
  check("the answer is marked answered", answer.status === "answered");

  // ---- 2. A wrong statement is shown only in its corrected form, when that passes
  const corrected = await checkedAnswer(
    { question: "How long do I have to file a defence in Small Claims?", courtPath: "small-claims" },
    {
      index,
      embed: noSearch,
      draft: async () => JSON.stringify({ scope: "ontario", asksForPrediction: false, statements: [{ text: "You have 30 days to file a defence.", cites: ["Rules of the Small Claims Court, r. 9.01 (1)"] }] }),
      check: scriptedCheck((_s, passages) => {
        const rule = passageFor(passages, "oreg-258-98-small-claims-rules");
        return { results: [{ n: 1, verdict: "corrected", passage: rule?.id, quote: "within 20 days of being served with the claim", corrected: "You have 20 days after being served with the claim to file a defence.", topic: "time to defend" }] };
      }),
    },
  );
  check(
    "a wrong statement is replaced by the checker's corrected version, which passes the same checks",
    corrected.statements.length === 1 && /20 days/.test(corrected.statements[0].text) && !corrected.statements.some((s) => /30 days/.test(s.text)),
    JSON.stringify(corrected),
  );

  // ---- 3. A corrected version that still fails is not shown
  const badFix = await checkedAnswer(
    { question: "How long do I have to file a defence in Small Claims?", courtPath: "small-claims" },
    {
      index,
      embed: noSearch,
      draft: async () => JSON.stringify({ scope: "ontario", asksForPrediction: false, statements: [{ text: "You have 30 days to file a defence.", cites: ["Rules of the Small Claims Court, r. 9.01 (1)"] }] }),
      check: scriptedCheck((_s, passages) => {
        const rule = passageFor(passages, "oreg-258-98-small-claims-rules");
        return { results: [{ n: 1, verdict: "corrected", passage: rule?.id, quote: "within 20 days of being served with the claim", corrected: "You have 25 days to file a defence.", topic: "time to defend" }] };
      }),
    },
  );
  check("a corrected statement whose number is not in the law is not shown either", badFix.statements.length === 0 && badFix.status === "not-confirmed", JSON.stringify(badFix));

  // ---- 4. A passage the checker names that the library did not return is refused
  const invented = await checkedAnswer(
    { question: "What is the limitation period?", courtPath: "civil" },
    {
      index,
      embed: noSearch,
      draft: async () => JSON.stringify({ scope: "ontario", asksForPrediction: false, statements: [{ text: "You have two years to sue.", cites: ["Limitations Act, 2002, s. 4"] }] }),
      check: scriptedCheck(() => ({ results: [{ n: 1, verdict: "supported", passage: "corpus:made-up:1", quote: "a proceeding shall not be commenced in respect of a claim after the second anniversary", topic: "limitation" }] })),
    },
  );
  check("support from a passage the library did not return is refused", invented.statements.length === 0, JSON.stringify(invented));

  // ---- 5. "Will I win?" is declined in fixed words; outside the law covered gets no law
  const judge = await checkedAnswer(
    { question: "Will I win against my landlord?", courtPath: "small-claims" },
    { index, embed: noSearch, draft: async () => JSON.stringify({ scope: "ontario", asksForPrediction: true, statements: [] }), check: async () => "{}" },
  );
  check("a request for a prediction is flagged so the fixed decline is shown", judge.declinedToJudge && judge.statements.length === 0);
  check("the decline is fixed wording that predicts nothing", /does not predict/.test(DECLINE_TO_JUDGE));
  const outside = await checkedAnswer(
    { question: "How do I object to my federal tax reassessment?", courtPath: "civil" },
    { index, embed: noSearch, draft: async () => JSON.stringify({ scope: "outside", asksForPrediction: false, statements: [{ text: "x".repeat(20), cites: [] }] }), check: async () => "{}" },
  );
  check("a question outside the law covered gets no statements", outside.status === "outside-scope" && outside.statements.length === 0);

  // ---- 6. Failures fall back, never throw
  const broken = await checkedAnswer({ question: "Anything?", courtPath: "civil" }, { index, embed: noSearch, draft: async () => { throw new Error("down"); } });
  check("a failing model answers unavailable instead of throwing", broken.status === "unavailable");
  const garbled = await checkedAnswer({ question: "Anything?", courtPath: "civil" }, { index, embed: noSearch, draft: async () => "not json" });
  check("a garbled draft answers unavailable", garbled.status === "unavailable");
  const slow = await checkedAnswer(
    { question: "Anything?", courtPath: "civil" },
    { index, embed: noSearch, timeoutMs: 50, draft: () => new Promise((resolve) => setTimeout(() => resolve("{}"), 2000)) },
  );
  check("a slow model answers unavailable at the time limit", slow.status === "unavailable");
  const noLibrary = await checkedAnswer({ question: "Anything?", courtPath: "civil" }, { index: null });
  check("with no library, unavailable", noLibrary.status === "unavailable");

  // ---- 6b. Each statement is checked on its own; at the time limit the ones
  // already checked are shown and the rest are listed as not confirmed.
  const partialTexts = cpaTexts.slice(0, 2);
  const checkCalls: string[][] = [];
  const partial = await checkedAnswer(
    { question: "Can I cancel the window contract?", courtPath: "small-claims" },
    {
      index,
      embed: noSearch,
      timeoutMs: 400,
      draft: async () => JSON.stringify({ scope: "ontario", asksForPrediction: false, statements: cpaStatements.slice(0, 2) }),
      check: async (statements, passages) => {
        checkCalls.push(statements);
        const cpaPassage = passageFor(passages, "consumer-protection-act-2002");
        if (statements[0] === partialTexts[1]) await new Promise((resolve) => setTimeout(resolve, 3000));
        return JSON.stringify({
          results: [{ n: 1, verdict: "supported", passage: cpaPassage?.id, quote: "may, without any reason, cancel a direct agreement at any time from the date of entering into the agreement until 10 days after the consumer has received the written copy of the agreement", topic: statements[0] === partialTexts[0] ? "cancelling" : "slow topic" }],
        });
      },
    },
  );
  check("each statement goes to its own check", checkCalls.length === 2 && checkCalls.every((call) => call.length === 1));
  check(
    "a slow check does not hold back the statements already checked",
    partial.statements.length === 1 && partial.statements[0].text === partialTexts[0] && partial.notConfirmed.length === 1,
    JSON.stringify(partial),
  );

  // ---- 6c. Each check also sees the sections the other statements name
  const seenBySecond: Passage[][] = [];
  await checkedAnswer(
    { question: "Can I cancel, and how long do I have to sue?", courtPath: "small-claims" },
    {
      index,
      embed: noSearch,
      draft: async () =>
        JSON.stringify({
          scope: "ontario",
          asksForPrediction: false,
          statements: [
            { text: "You can cancel a direct agreement within 10 days.", cites: ["Consumer Protection Act, 2002, s. 43 (1)"] },
            { text: "You have two years to sue.", cites: ["Limitations Act, 2002, s. 4"] },
          ],
        }),
      check: async (statements, passages) => {
        if (/two years/.test(statements[0])) seenBySecond.push(passages);
        return JSON.stringify({ results: [] });
      },
    },
  );
  check(
    "a statement's check also sees the sections the rest of the answer names",
    (seenBySecond[0] ?? []).some((p) => p.sourceId === "consumer-protection-act-2002") && (seenBySecond[0] ?? []).some((p) => p.sourceId === "limitations-act-2002"),
  );

  // ---- 6c2. A statement that fails is checked once more, told why
  const hints: (string | undefined)[] = [];
  const retried = await checkedAnswer(
    { question: "Can I cancel?", courtPath: "small-claims" },
    {
      index,
      embed: noSearch,
      draft: async () => JSON.stringify({ scope: "ontario", asksForPrediction: false, statements: cpaStatements.slice(0, 1) }),
      check: async (_statements, passages, _input, hint) => {
        hints.push(hint);
        const cpaPassage = passageFor(passages, "consumer-protection-act-2002");
        const quote = hint
          ? "may, without any reason, cancel a direct agreement at any time from the date of entering into the agreement until 10 days after the consumer has received the written copy of the agreement"
          : "may cancel a direct agreement whenever they like";
        return JSON.stringify({ results: [{ n: 1, verdict: "supported", passage: cpaPassage?.id, quote, topic: "cancelling" }] });
      },
    },
  );
  check("a statement whose first check fails is checked again, and told why", hints.length === 2 && !hints[0] && /quote not in/.test(hints[1] ?? ""), JSON.stringify(hints));
  check("the second check can confirm it", retried.statements.length === 1 && retried.notConfirmed.length === 0, JSON.stringify(retried));
  const failedTwice = await checkedAnswer(
    { question: "Can I cancel?", courtPath: "small-claims" },
    {
      index,
      embed: noSearch,
      draft: async () => JSON.stringify({ scope: "ontario", asksForPrediction: false, statements: cpaStatements.slice(1, 2) }),
      check: async () => JSON.stringify({ results: [{ n: 1, verdict: "unsupported", passage: "", quote: "", topic: "time to give notice" }] }),
    },
  );
  check("why a topic was not confirmed is recorded for the exam", (failedTwice.notConfirmedWhy ?? []).some((item) => item.topic === "time to give notice" && /no passage that supports it/.test(item.why)));
  check("and never reaches the screens", !("notConfirmedWhy" in checkedAnswerView(failedTwice)));

  // ---- 6e. The second look: points it adds are checked like the rest
  const reviewCalls: string[][] = [];
  const goodQuote = "may, without any reason, cancel a direct agreement at any time from the date of entering into the agreement until 10 days after the consumer has received the written copy of the agreement";
  const reviewed = await checkedAnswer(
    { question: "Can I cancel the contract I signed at my door?", courtPath: "small-claims" },
    {
      index,
      embed: noSearch,
      thorough: true,
      draft: async () => JSON.stringify({ scope: "ontario", asksForPrediction: false, statements: cpaStatements.slice(0, 1) }),
      review: async (_input, confirmed) => {
        reviewCalls.push(confirmed);
        return JSON.stringify({
          missing: [
            { text: "The cancellation period runs until 10 days after you receive the written copy of the agreement.", cites: ["Consumer Protection Act, 2002, s. 43 (1)"] },
            { text: "You have 45 days to cancel any agreement.", cites: ["Consumer Protection Act, 2002, s. 43 (1)"] },
          ],
        });
      },
      check: async (statements, passages) => {
        const cpaPassage = passageFor(passages, "consumer-protection-act-2002");
        const bad = /45 days/.test(statements[0]);
        return JSON.stringify({ results: [{ n: 1, verdict: "supported", passage: cpaPassage?.id, quote: bad ? "cancel any agreement within 45 days" : goodQuote, topic: bad ? "45 days" : "cancelling" }] });
      },
    },
  );
  check("the second look sees what the answer already says", reviewCalls.length === 1 && reviewCalls[0][0]?.startsWith("You can cancel a direct agreement"));
  check("a point the second look adds is shown once it passes the check", reviewed.statements.some((statement) => /written copy/.test(statement.text)), JSON.stringify(reviewed.statements.map((x) => x.text)));
  check("a point the second look adds that fails the check is not shown", !reviewed.statements.some((statement) => /45 days/.test(statement.text)));
  let reviewedQuick = false;
  await checkedAnswer(
    { question: "Can I cancel?", courtPath: "small-claims" },
    {
      index,
      embed: noSearch,
      draft: async () => JSON.stringify({ scope: "ontario", asksForPrediction: false, statements: cpaStatements.slice(0, 1) }),
      review: async () => {
        reviewedQuick = true;
        return "{}";
      },
      check: async (_s, passages) => JSON.stringify({ results: [{ n: 1, verdict: "supported", passage: passageFor(passages, "consumer-protection-act-2002")?.id, quote: goodQuote, topic: "x" }] }),
    },
  );
  check("a quick answer (under the thorough time budget) skips the second look", !reviewedQuick);

  // ---- 6f. The second look can doubt a statement; a doubted one that fails a re-check is removed
  const doubtedCalls: (string | undefined)[] = [];
  const doubted = await checkedAnswer(
    { question: "Can I cancel?", courtPath: "small-claims" },
    {
      index,
      embed: noSearch,
      thorough: true,
      draft: async () => JSON.stringify({ scope: "ontario", asksForPrediction: false, statements: cpaStatements.slice(0, 1) }),
      review: async () => JSON.stringify({ missing: [], doubtful: [{ n: 1, why: "the agreement was not made at the door" }] }),
      check: async (_s, passages, _i, hint) => {
        doubtedCalls.push(hint);
        if (hint && /senior reviewer/.test(hint)) return JSON.stringify({ results: [{ n: 1, verdict: "unsupported", passage: "", quote: "", topic: "cancelling" }] });
        return JSON.stringify({ results: [{ n: 1, verdict: "supported", passage: passageFor(passages, "consumer-protection-act-2002")?.id, quote: goodQuote, topic: "cancelling" }] });
      },
    },
  );
  check("a statement the second look doubts is checked again with the reason", doubtedCalls.some((hint) => /not made at the door/.test(hint ?? "")));
  check("and is removed when the re-check does not confirm it", doubted.statements.length === 0 && doubted.notConfirmed.includes("cancelling"), JSON.stringify(doubted));
  check("doubts outside the answer's statements are ignored", parseDoubts(JSON.stringify({ doubtful: [{ n: 0 }, { n: 3, why: "x" }, { n: 1, why: "y" }] }), 2).map((d) => d.n).join() === "1");

  // ---- 6g. Figures worked out from the person's own figures
  check("10 per cent of the person's $90,000 may be stated as $9,000", numberNotStatedOrWorkedOut("The holdback is $9,000.", "a holdback equal to 10 per cent of the price", "The contract price is $90,000.") === null);
  check("a figure with no basis is still refused", numberNotStatedOrWorkedOut("The holdback is $9,500.", "a holdback equal to 10 per cent of the price", "The contract price is $90,000.") === "9500");
  check("a small number is never worked out (25 days where the law says 20)", numberNotStatedOrWorkedOut("You have 25 days.", "within 20 days", "I was served 5 days ago.") === "25");

  // ---- 6h. Two drafts, merged: each point once, the second draft fills gaps
  const merged = mergeDrafts([
    { scope: "ontario", asksForPrediction: false, statements: [{ text: "You can cancel a direct agreement within 10 days after receiving the written copy.", cites: ["a"] }] },
    {
      scope: "ontario",
      asksForPrediction: true,
      statements: [
        { text: "You can cancel the direct agreement within 10 days after receiving the written copy.", cites: ["a"] },
        { text: "The supplier must refund every payment within 15 days after you cancel.", cites: ["b"] },
      ],
    },
  ]);
  check("a point both drafts make is checked once", merged?.statements.filter((x) => /direct agreement/.test(x.text)).length === 1);
  check("a point only the second draft makes is added", Boolean(merged?.statements.some((x) => /refund/.test(x.text))));
  check("a prediction request in either draft is declined", merged?.asksForPrediction === true);
  check("outside scope only if every draft says so", mergeDrafts([{ scope: "outside", asksForPrediction: false, statements: [] }, { scope: "ontario", asksForPrediction: false, statements: [{ text: "Some rule of Ontario law here.", cites: [] }] }])?.scope === "ontario");

  // ---- 6d. Talk about the passages is dropped, the law kept
  check(
    "a sentence about the passages is dropped and the rest kept",
    withoutTalkAboutPassages("You must give 60 days notice. The supplied passages do not establish that the Act applies.") === "You must give 60 days notice.",
  );
  check("a statement that is only talk about the passages leaves nothing", withoutTalkAboutPassages("The passages do not establish this.") === "");
  check(
    "an amount with a decimal point is never cut in two",
    withoutTalkAboutPassages("Severance is owed if the payroll is $2.5 million or more under s. 64 (1). The supplied passages do not say more.") ===
      "Severance is owed if the payroll is $2.5 million or more under s. 64 (1).",
  );
  check("ordinary law is left alone", withoutTalkAboutPassages("The tenant may give notice. The landlord must repair.") === "The tenant may give notice. The landlord must repair.");

  // ---- 7. The pure checks
  check("parseDraft keeps at most ten statements and drops empty ones", (parseDraft(JSON.stringify({ statements: Array.from({ length: 14 }, (_, i) => ({ text: `Statement number ${i} here.`, cites: ["x"] })).concat([{ text: "", cites: [] }]) }))?.statements.length ?? 0) === 10);
  check("parseCheck treats an unknown verdict as unsupported", parseCheck(JSON.stringify({ results: [{ n: 1, verdict: "maybe" }] }))?.[0].verdict === "unsupported");
  const fakePassage = { id: "p", sourceId: "s", text: "A tenant may terminate a tenancy by giving at least 60 days notice.", pinpoint: "s. 44", heading: "", source: { id: "s", title: "Some Act", url: "", readableUrl: "", tier: "legislation", file: "" } } as unknown as Passage;
  check("a number from the person's own words is allowed", statementRejection("You were served on September 20 and must give 60 days notice.", [{ passage: fakePassage, quote: "giving at least 60 days notice" }], "I was served on September 20") === null);
  check("a number in neither the law nor their words is refused", /number/.test(statementRejection("You must give 90 days notice.", [{ passage: fakePassage, quote: "giving at least 60 days notice" }], "") ?? ""));
  const spelled = { ...fakePassage, text: "An employer shall pay severance pay if the employee was employed for five years or more and the employer has a payroll of $2.5 million or more." } as Passage;
  check(
    "a number the law spells in words may be written in digits",
    statementRejection("Severance pay is owed after 5 years if the payroll is $2,500,000 or more.", [{ passage: spelled, quote: "if the employee was employed for five years or more" }], "") === null,
  );
  check("a digit the law does not spell is still refused", /number/.test(statementRejection("Severance pay is owed after 7 years.", [{ passage: spelled, quote: "if the employee was employed for five years or more" }], "") ?? ""));
  check("grading the case is refused", Boolean(statementRejection("You have a strong case if you give 60 days notice.", [{ passage: fakePassage, quote: "giving at least 60 days notice" }], "")));

  console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
  process.exitCode = failures ? 1 : 0;
}

void main();
