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

console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
process.exit(failures ? 1 : 0);
