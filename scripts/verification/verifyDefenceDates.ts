/**
 * THE TWO DEFENCE DATES, AND THE SMALL CLAIMS r. 10.01 COUNT (site owner, 2026-10-28).
 *
 * Checks, as properties across the whole stage map (casePosition.ts, caseFile.ts, stageMap.ts):
 *   - every deadline under Small Claims r. 10.01 (2) ("within 20 days after the day on which the defence
 *     is filed") counts from the defendant's OWN defence, never the first defence by any defendant;
 *   - the first-defence question asks for the first defence by any defendant;
 *   - on every step that asks both a defendant's own defence and the first defence:
 *       number unknown  -> the number of defendants is asked, and both dates;
 *       one defendant   -> one defence question, carrying both dates' rules;
 *       several         -> each asked once, and the number is not asked;
 *     and a step that asks only one of them never asks the number;
 *   - with one defendant, one answer fills both dates, so both deadlines are counted; with several, not;
 *     and only under the defence questions that court's own map asks;
 *   - the case file pairs the two dates only with one defendant;
 *   - a defence question's "why it matters" is the rule of a deadline at that same step, word for word.
 *
 * Failure it exists to catch: the r. 10.01 deadline counted from another defendant's defence, and a
 * defendant with co-defendants given one date for two different days (owner's decision, 28 Oct).
 */
import { ALL_STAGES, findStage } from "../../src/lib/case-system/stage-map/stageMap";
import { sourceName } from "../../src/lib/case-system/stage-map/citations";
import { DEADLINE_EVENTS } from "../../src/lib/case-system/deadlines/deadlineEvents";
import { DEFENCE_DATE_QUESTIONS, FIRST_DEFENCE_QUESTION, OWN_DEFENCE_QUESTIONS, dateQuestionsFor, withDefenceTwins } from "../../src/lib/case-system/casePosition";
import { caseDatesFrom } from "../../src/lib/case-system/deadlines/deadlineEvents";
import { caseFileOf, withCaseFileDates } from "../../src/lib/case-system/caseFile/caseFile";
import { fullDayIn } from "../../src/lib/case-system/casePosition";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const events = DEADLINE_EVENTS as Record<string, { label?: string; question?: string | null; questionId?: string }>;
const stages = ALL_STAGES as unknown as readonly { id: string; deadlines: readonly { what: string; countFromEvent?: string; rule: { sourceId: string; pinpoint: string; quote: string } }[] }[];

// --- r. 10.01 (2) --------------------------------------------------------------------------------
const r1001 = stages.flatMap((stage) => stage.deadlines.filter((deadline) => deadline.rule.sourceId === "oreg-258-98-small-claims-rules" && /^r\. 10\.01 \(2\)/.test(deadline.rule.pinpoint)).map((deadline) => ({ stage: stage.id, deadline })));
check(`r. 10.01 (2) deadlines found in the stage map (${r1001.length})`, r1001.length > 0);
const wrong = r1001.filter(({ deadline }) => !OWN_DEFENCE_QUESTIONS.includes(events[deadline.countFromEvent ?? ""]?.questionId ?? ""));
check("every r. 10.01 (2) deadline counts from the defendant's own defence", wrong.length === 0, wrong.map(({ stage, deadline }) => `${stage}: from ${deadline.countFromEvent}`).join("; "));
check("the rule counts from \"the day on which the defence is filed\"", r1001.every(({ deadline }) => deadline.rule.quote.includes("within 20 days after the day on which the defence is filed")));
const first = Object.values(events).find((event) => event.questionId === FIRST_DEFENCE_QUESTION);
check("the first-defence question asks for the first defence by any defendant", /first defence[^?]*any defendant/i.test(first?.question ?? ""), first?.question ?? "");

// --- every step that asks both --------------------------------------------------------------------
const bothSteps = stages.filter((stage) => {
  const ids = dateQuestionsFor(stage.id, "several").questions.map((question) => question.id);
  return ids.includes(FIRST_DEFENCE_QUESTION) && ids.some((id) => OWN_DEFENCE_QUESTIONS.includes(id));
});
check(`steps that ask both defence dates found (${bothSteps.length}: ${bothSteps.map((stage) => stage.id).join(", ")})`, bothSteps.length > 0);
const defenceIds = (ids: string[]) => ids.filter((id) => DEFENCE_DATE_QUESTIONS.includes(id));
for (const stage of bothSteps) {
  const unknown = dateQuestionsFor(stage.id, null);
  const one = dateQuestionsFor(stage.id, "one");
  const several = dateQuestionsFor(stage.id, "several");
  check(`${stage.id}: number unknown -> asked, with both dates`, unknown.askDefendants && defenceIds(unknown.questions.map((q) => q.id)).length === 2);
  const oneDefence = one.questions.filter((q) => DEFENCE_DATE_QUESTIONS.includes(q.id));
  const allRules = new Set([...defenceIds(several.questions.map((q) => q.id))].flatMap((id) => several.questions.find((q) => q.id === id)?.rules ?? []).map((rule) => rule.citation));
  check(`${stage.id}: one defendant -> one defence question, carrying both dates' rules`, !one.askDefendants && oneDefence.length === 1 && [...allRules].every((citation) => (oneDefence[0].rules ?? []).some((rule) => rule.citation === citation)));
  const severalIds = defenceIds(several.questions.map((q) => q.id));
  check(`${stage.id}: the number matters here, whatever it is (so a saved number can be changed here)`, [unknown, one, several].every((result) => result.defendantsMatter));
  check(`${stage.id}: several -> each asked once, the number not asked`, !several.askDefendants && severalIds.length === 2 && new Set(severalIds).size === 2);
}
const oneOnly = stages.filter((stage) => !bothSteps.includes(stage) && defenceIds(dateQuestionsFor(stage.id, null).questions.map((q) => q.id)).length > 0);
check(`a step that asks only one defence date never asks the number (${oneOnly.length} steps)`, oneOnly.every((stage) => !dateQuestionsFor(stage.id, null).askDefendants && !dateQuestionsFor(stage.id, "one").defendantsMatter), oneOnly.filter((stage) => dateQuestionsFor(stage.id, null).askDefendants).map((s) => s.id).join(", "));

// --- one answer, both deadlines -------------------------------------------------------------------
const answered = { [OWN_DEFENCE_QUESTIONS[0]]: "2026-09-01" };
const oneDates = caseDatesFrom(withDefenceTwins(answered, "one", "small-claims")) as Record<string, unknown>;
const severalDates = caseDatesFrom(withDefenceTwins(answered, "several", "small-claims")) as Record<string, unknown>;
check("one defendant: one answer gives both the own and the first defence", Boolean(oneDates["own-defence-filed"]) && Boolean(oneDates["first-defence-filed"]), JSON.stringify(oneDates));
check("several: the answer to one is never the other's", Boolean(severalDates["own-defence-filed"]) && !severalDates["first-defence-filed"], JSON.stringify(severalDates));

// A twin is stored only under the questions that court's own map asks (fresh review, 28 Oct).
const scTwins = withDefenceTwins({ [FIRST_DEFENCE_QUESTION]: "2026-09-01" }, "one", "small-claims");
const civilTwins = withDefenceTwins({ [FIRST_DEFENCE_QUESTION]: "2026-09-01" }, "one", "civil");
check("a twin is stored only under the court's own defence questions", Boolean(scTwins["case-date-own-defence-filed"]) && !scTwins["case-date-own-defence-delivered"] && Boolean(civilTwins["case-date-own-defence-delivered"]) && !civilTwins["case-date-own-defence-filed"] && Object.keys(withDefenceTwins({ [FIRST_DEFENCE_QUESTION]: "2026-09-01" }, "one", "family")).length === 1);

// --- the case file --------------------------------------------------------------------------------
const checkpoint = (court: string) => ({ version: 1 as const, flowId: "f", courtPath: court as "small-claims", revision: "r", sections: {} });
const fileWith = (defendants: string | undefined) => caseFileOf(checkpoint("small-claims") as never, { courtPath: "small-claims", position: { ...(defendants ? { defendants } : {}) } });
const withOne = withCaseFileDates({ [FIRST_DEFENCE_QUESTION]: "2026-09-01" }, fileWith("one"), fullDayIn);
const withSeveral = withCaseFileDates({ [FIRST_DEFENCE_QUESTION]: "2026-09-01" }, fileWith("several"), fullDayIn);
const withUnknown = withCaseFileDates({ [FIRST_DEFENCE_QUESTION]: "2026-09-01" }, fileWith(undefined), fullDayIn);
check("the case file holds the number of defendants as a fact", fileWith("one").defendants.state === "answered" && fileWith("one").defendants.value === "one");
check("the case file pairs the two dates with one defendant (the Small Claims own defence)", withOne["case-date-own-defence-filed"] === "2026-09-01" && !withOne["case-date-own-defence-delivered"]);
check("and not with several, or with the number unknown", OWN_DEFENCE_QUESTIONS.every((id) => !withSeveral[id] && !withUnknown[id]));

// --- why it matters: the step's own rules, word for word --------------------------------------------
const bad: string[] = [];
for (const stage of stages) {
  const quotes = new Set(stage.deadlines.map((deadline) => `${sourceName(deadline.rule as never)}, ${deadline.rule.pinpoint}|${deadline.rule.quote}`));
  for (const count of [null, "one", "several"] as const) {
    for (const question of dateQuestionsFor(stage.id, count).questions) {
      for (const rule of question.rules ?? []) if (!quotes.has(`${rule.citation}|${rule.quote}`)) bad.push(`${stage.id}/${question.id}: ${rule.citation}`);
    }
  }
}
check("every defence question's rule is a rule of a deadline at that same step, word for word", bad.length === 0, bad.slice(0, 10).join("; "));
check("(the steps used are real)", Boolean(findStage("defendant:defence-filed")) && Boolean(findStage("defendant:considering-defendants-claim")));

console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
process.exit(failures ? 1 : 0);
