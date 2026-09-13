/**
 * The family status triage records facts and concludes nothing.
 *
 * COSTS NOTHING. Pure function calls.
 *
 * WHY. This runs before everything else on the family path, and it handles the
 * two facts that decide which proceedings exist at all — whether the parties
 * were married, and where they live. Those are exactly the facts it would be
 * most useful to draw a conclusion from, which is why the conclusions have to
 * be checked for rather than trusted not to appear.
 *
 * The check walks every record shape the triage can reach and asserts the four
 * things it must never do (TRIAGE_NON_CONCLUSIONS), plus the one thing it must
 * do: surface the unjust-enrichment route to an unmarried cohabitee WITHOUT
 * being asked. A cohabitee who does not know the phrase cannot ask for it.
 *
 * Run: node --import tsx scripts/verification/verifyStatusTriage.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  FAMILY_COURT_MUNICIPALITIES,
  buildTriageOutcome,
  emptyStatusRecord,
  prunedQuestions,
  selectNextTriageQuestion,
  surfacedTopics,
  type FamilyStatusRecord,
} from "../../src/lib/case-system/family/statusTriage";

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/** Drive the triage to completion by answering every question it asks. */
function runToCompletion(
  answers: Partial<FamilyStatusRecord>,
): { record: FamilyStatusRecord; asked: string[] } {
  let record = { ...emptyStatusRecord(), ...answers };
  const asked: string[] = [];

  for (let guard = 0; guard < 20; guard += 1) {
    const question = selectNextTriageQuestion(record);
    if (!question) break;
    asked.push(question.id);

    // Anything the caller did not pre-answer gets a default so the loop ends.
    record = { ...record };
    if (question.id === "married-to-other-party") record.marriedToOtherParty = "no";
    if (question.id === "divorce-sought") record.divorceSought = "no";
    if (question.id === "cohabitation-dates") {
      record.cohabitationStart = "2018";
      record.cohabitationEnd = "2025";
    }
    if (question.id === "child-together") record.haveChildTogether = "no";
    if (question.id === "case-involves-children") record.caseInvolvesChildren = "no";
    if (question.id === "municipalities") {
      record.userMunicipality = "City of Hamilton";
      record.otherPartyMunicipality = "other";
    }
  }

  return { record, asked };
}

/** Every string the outcome would put in front of a user. */
function userFacingStrings(record: FamilyStatusRecord): string[] {
  const outcome = buildTriageOutcome(record);

  return [
    ...outcome.recorded.flatMap((item) => [item.label, item.value]),
    ...outcome.courtInformation.flatMap((statement) => [
      statement.text,
      ...statement.citations.map((citation) => citation.label),
    ]),
    ...outcome.municipalities.map((row) => row.name),
    ...outcome.topics.flatMap((topic) => [
      topic.title,
      topic.summary,
      topic.body,
      ...topic.surfacedBecause,
      ...topic.citations.map((citation) => citation.label),
    ]),
  ];
}

const SCENARIOS: Array<{ name: string; answers: Partial<FamilyStatusRecord> }> = [
  { name: "unmarried, cohabited, no child", answers: { marriedToOtherParty: "no" } },
  {
    name: "unmarried, cohabited, child together",
    answers: { marriedToOtherParty: "no", haveChildTogether: "yes" },
  },
  {
    name: "unmarried, never lived together",
    answers: { marriedToOtherParty: "no", cohabitationStart: "n/a", cohabitationEnd: "n/a" },
  },
  { name: "married, divorce sought", answers: { marriedToOtherParty: "yes", divorceSought: "yes" } },
  { name: "married, no divorce", answers: { marriedToOtherParty: "yes", divorceSought: "no" } },
  { name: "married, undecided", answers: { marriedToOtherParty: "yes", divorceSought: "unsure" } },
];

function main(): void {
  // ---- The list is the regulation's closed list ----

  check("r. 1 (3) list has exactly 24 municipalities", FAMILY_COURT_MUNICIPALITIES.length === 24);
  check(
    "Toronto is not on the list",
    !FAMILY_COURT_MUNICIPALITIES.some((name) => /toronto/i.test(name)),
    "people assume it is; the regulation does not list it",
  );
  check(
    "no duplicates",
    new Set(FAMILY_COURT_MUNICIPALITIES).size === FAMILY_COURT_MUNICIPALITIES.length,
  );

  // Against the vendored regulation, not against this file's own copy.
  const vendored = readFileSync(
    path.join(__dirname, "..", "..", "docs", "sources", "flr-cited-rules.txt"),
    "utf8",
  );
  for (const name of FAMILY_COURT_MUNICIPALITIES) {
    check(`[${name}] appears in the vendored r. 1 (3)`, vendored.includes(name));
  }

  // ---- Ordering and pruning ----

  const married = runToCompletion({ marriedToOtherParty: "yes" });
  check(
    "a married person is never asked the cohabitation questions",
    !married.asked.includes("cohabitation-dates") && !married.asked.includes("child-together"),
    married.asked.join(" -> "),
  );

  const unmarried = runToCompletion({ marriedToOtherParty: "no" });
  check(
    "an unmarried person is never asked about divorce",
    !unmarried.asked.includes("divorce-sought"),
    unmarried.asked.join(" -> "),
  );

  check(
    "the first question is the married/unmarried fact",
    selectNextTriageQuestion(emptyStatusRecord())?.id === "married-to-other-party",
  );
  check(
    "municipality is asked last",
    unmarried.asked[unmarried.asked.length - 1] === "municipalities",
    unmarried.asked.join(" -> "),
  );
  check("the triage terminates", selectNextTriageQuestion(unmarried.record) === null);

  // ---- The question never uses the word doing the ambiguous work ----

  const first = selectNextTriageQuestion(emptyStatusRecord());
  check(
    "the married/unmarried question does not use the word \"spouse\"",
    first !== null && !/\bspouse/i.test(first.prompt),
    first?.prompt,
  );

  // ---- TRIAGE_NON_CONCLUSIONS, asserted one at a time ----

  for (const { name, answers } of SCENARIOS) {
    const { record } = runToCompletion(answers);
    const strings = userFacingStrings(record);
    const all = strings.join("\n");

    // 1. No announcement that a definition is satisfied.
    check(
      `[${name}] does not announce a definition is satisfied`,
      !/\byou (?:are|qualify as|count as|meet)\b[^.]{0,40}\b(spouse|the definition)/i.test(all) &&
        !/\byou (?:are|were) (?:therefore|so) /i.test(all),
      (all.match(/\byou (?:are|qualify as|count as|meet)\b[^.]{0,60}/i) || [])[0],
    );

    // 2. No statement of which court the person must use.
    check(
      `[${name}] does not tell the user which court to use`,
      !/\byour (?:case|matter|application) (?:goes|belongs|must be|will be)\b/i.test(all) &&
        !/\byou must (?:file|start|commence|apply)\b/i.test(all) &&
        !/\byour court is\b/i.test(all),
      (all.match(/\byou must (?:file|start|commence|apply)[^.]{0,60}/i) || [])[0],
    );

    // 3. No statement that a proceeding is or is not available to them.
    check(
      `[${name}] does not say a claim is or is not available to the user`,
      !/\byou (?:do not|don't|cannot|can't) (?:have|bring|make)\b/i.test(all) &&
        !/\byou (?:have|are entitled to) an? (?:claim|equalization|entitlement)\b/i.test(all) &&
        !/does not apply to you\b/i.test(all),
      (all.match(/\byou (?:do not|don't|cannot|can't) (?:have|bring|make)[^.]{0,60}/i) || [])[0],
    );

    // 4. No computed date or duration.
    //
    // The s. 7 (3) limbs are quoted from the statute, so "two years" and "six
    // years" legitimately appear. What must not appear is arithmetic ON the
    // user's own recorded dates: a deadline, a countdown, or a derived total.
    check(
      `[${name}] computes no date or duration for the user`,
      !/\byour deadline\b/i.test(all) &&
        !/\bdays? (?:remaining|left)\b/i.test(all) &&
        !/\byou have (?:until|\d)/i.test(all) &&
        !/\byou (?:have )?(?:lived together|cohabited) for \d/i.test(all),
      (all.match(/\byou have (?:until|\d)[^.]{0,60}/i) || [])[0],
    );
  }

  // ---- The unjust-enrichment route is surfaced UNPROMPTED ----

  const cohabitee = runToCompletion({ marriedToOtherParty: "no" }).record;
  const cohabiteeTopics = surfacedTopics(cohabitee).map((topic) => topic.id);

  check(
    "an unmarried person who lived together is shown the unjust-enrichment route",
    cohabiteeTopics.includes("cohabitee-unjust-enrichment"),
    cohabiteeTopics.join(", "),
  );
  check(
    "they are also shown that the FLA defines \"spouse\" two ways",
    cohabiteeTopics.includes("fla-two-spouse-definitions"),
  );

  const marriedTopics = surfacedTopics(runToCompletion({ marriedToOtherParty: "yes" }).record).map(
    (topic) => topic.id,
  );
  check(
    "a married person is shown the s. 7 (3) limitation",
    marriedTopics.includes("fla-equalization-limitation"),
  );

  // Surfacing is only legitimate if the reason is visible.
  for (const topic of surfacedTopics(cohabitee)) {
    check(
      `[${topic.id}] says why it was surfaced`,
      topic.surfacedBecause.length > 0 &&
        topic.surfacedBecause.every((reason) => /^You recorded/.test(reason)),
      topic.surfacedBecause.join(" | "),
    );
  }

  // ---- Nothing is hidden on a derived conclusion ----
  //
  // The suppression-filter defect: a topic withheld because the engine decided
  // it does not apply writes that decision into the user's experience without
  // stating it. Every topic surfaced for ANY scenario must be reachable, and no
  // scenario may produce an empty topic list.

  for (const { name, answers } of SCENARIOS) {
    const { record } = runToCompletion(answers);
    check(`[${name}] is shown at least one topic`, surfacedTopics(record).length > 0);
  }

  // ---- Highlighting a municipality is not a determination ----

  const outcome = buildTriageOutcome(cohabitee);
  const matched = outcome.municipalities.filter((row) => row.matchesRecordedAnswer);
  check(
    "a recorded municipality is highlighted in the list",
    matched.length === 1 && matched[0]?.name === "City of Hamilton",
    matched.map((row) => row.name).join(", "),
  );
  check(
    "all 24 rows are still shown, none filtered out",
    outcome.municipalities.length === 24,
  );

  // ---- Recorded facts are read back, never derived ----

  const prunedForMarried = prunedQuestions({ ...emptyStatusRecord(), marriedToOtherParty: "yes" });
  check(
    "pruned questions are reported as \"Not asked\", not as absent",
    buildTriageOutcome(runToCompletion({ marriedToOtherParty: "yes" }).record).recorded.some(
      (item) => item.state === "not-asked",
    ) && prunedForMarried.length === 2,
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
