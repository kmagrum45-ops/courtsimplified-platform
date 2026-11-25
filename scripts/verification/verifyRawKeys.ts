/**
 * NO RAW FIELD NAME OR CODE ON A SCREEN: the copy guard's own checks (copy/rawKeys.ts).
 *
 * Checks, as properties:
 *   - every stored option value with a hyphen, every stage id and every field or slot name
 *     kept in code is found in screen text ("decision-making-responsibility", "upcomingCourtDate",
 *     "family:both:case-conference-scheduled");
 *   - the same things in words are not ("decision-making responsibility", "Next court date");
 *   - each option has words to show in its place (inWords), and none of those words is raw.
 * The story pack runs rawKeysIn over every screen of every story and fails on any.
 *
 * Failure it exists to catch: "Kind of claim: decision-making-responsibility, parenting-time,
 * spousal-support, divorce, sale-of-home" on "What we have so far" (#477 re-test, case 14).
 */
import { inWords, optionWords, rawKeysIn } from "../../src/lib/case-system/copy/rawKeys";
import { earlierAnswerWords } from "../../src/lib/case-system/earlierAnswerWords";
import { FAMILY_FILED_OPTIONS, FAMILY_ISSUE_OPTIONS, CIVIL_ISSUE_OPTIONS, CIVIL_DOCUMENT_OPTIONS } from "../../app/builder/_components/guidedFields";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const raw = "Kind of claim decision-making-responsibility, parenting-time, spousal-support, divorce, sale-of-home";
check("the codes Chrome saw are found", ["decision-making-responsibility", "parenting-time", "spousal-support", "sale-of-home"].every((code) => rawKeysIn(raw).includes(code)), JSON.stringify(rawKeysIn(raw)));
check("a field name is found", rawKeysIn("Answer: upcomingCourtDate").includes("upcomingCourtDate") && rawKeysIn("childrenInfo").includes("childrenInfo"));
check("a stage id is found", rawKeysIn("Where the case is: family:both:case-conference-scheduled").length === 1);
check("words are not taken for codes", rawKeysIn("Decision-making responsibility, parenting time. Next court date: November 16, 2026. A pre-trial conference. Case conference scheduled. Not sure yet.").length === 0, JSON.stringify(rawKeysIn("Decision-making responsibility, parenting time. Next court date. A pre-trial conference.")));
const options = [...FAMILY_FILED_OPTIONS, ...FAMILY_ISSUE_OPTIONS, ...CIVIL_ISSUE_OPTIONS, ...CIVIL_DOCUMENT_OPTIONS];
check("every option has words", options.every((option) => optionWords(option.value)));
const leaked = options.filter((option) => rawKeysIn(option.label).length);
check("no option's words are themselves raw", leaked.length === 0, leaked.map((option) => option.label).join("; "));
check("a stored list is shown in words", rawKeysIn(inWords(["decision-making-responsibility", "parenting-time", "sale-of-home"])).length === 0);

// Founder's Chrome check of #541 (2 Nov): the review listed question and claim-kind ids, and "[object Object]",
// after the story was rewritten (earlierAnswerWords.ts now gives each its words).
check("a question id is found", rawKeysIn("sc-orient-role / sc-claim-filed / sc-orient-dispute-category / sc-amount-claimed").length === 4, JSON.stringify(rawKeysIn("sc-orient-role / sc-claim-filed / sc-orient-dispute-category / sc-amount-claimed")));
check("a claim-kind id is found", rawKeysIn("sc-claim-homeowner-wont-pay-contractor; A homeowner will not pay the contractor").includes("sc-claim-homeowner-wont-pay-contractor"));
check("object text is found", rawKeysIn("[object Object] [object Object]").length === 1 && rawKeysIn("[object Object]").includes("[object Object]"));
check("a link or path holding an id is not taken for one on screen", rawKeysIn("Read it at https://example.invalid/sc-orient-role").length === 0);
{
  const stored: [string, unknown][] = [
    ["guided.answeredIds", ["sc-orient-role", "sc-claim-filed", "sc-orient-dispute-category", "sc-amount-claimed", "sc-orient-when-happened", "sc-remedy-sought"]],
    ["guided.matchedClaimType", { claimTypeId: "sc-claim-homeowner-wont-pay-contractor", claimTypeName: "A homeowner will not pay the contractor", userConfirmed: true, quote: "I finished the job on March 20, 2026 and sent an invoice." }],
    ["guided.earlierAnswers", [{ questionId: "sc-remedy-sought", answerText: "Payment of the money owed" }, { questionId: "sc-amount-claimed", answerText: "$3,000" }]],
    ["sourced.answers", [{ question: "Did you send a written demand?", answer: "Yes" }]],
    ["builder.triageState", { divorceSought: "not-sure", nested: { a: 1 }, note: "Synthetic note" }],
    ["guided.facts.disputeCategory", "unpaid-money"],
    ["guided.facts.claimFiled", false],
  ];
  const leaked = stored.map(([key, value]) => [key, earlierAnswerWords(value)] as const).filter(([, words]) => rawKeysIn(words).length > 0 || /\[object /.test(words));
  check("every stored earlier answer is shown in words, with no raw code or object text", leaked.length === 0, JSON.stringify(leaked));
  check("the questions answered are shown as their questions", earlierAnswerWords(stored[0][1]).includes("What outcome are you asking the court to order?") || earlierAnswerWords(stored[0][1]).split("\n").length === 6, earlierAnswerWords(stored[0][1]));
  check("the kind of claim is shown by its name", earlierAnswerWords(stored[1][1]) === "A homeowner will not pay the contractor", earlierAnswerWords(stored[1][1]));
  check("a kept answer is shown with its question", /: Payment of the money owed/.test(earlierAnswerWords(stored[2][1])), earlierAnswerWords(stored[2][1]));
}

console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
process.exit(failures ? 1 : 0);
