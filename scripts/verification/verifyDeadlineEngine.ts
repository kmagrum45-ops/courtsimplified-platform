/**
 * Does the deadline engine count correctly?
 *
 *   npm run test:deadlines
 *
 * *** WHY THE CASES LOOK PEDANTIC ***
 *
 * Every case here is one somebody could actually be in, and every one of them
 * is a date a person would get wrong by reasoning casually. A deadline that is
 * right in the ordinary case and wrong across a long weekend is not 95%
 * correct; it is a trap that springs exactly when the calendar is confusing,
 * which is exactly when someone checks.
 *
 * The expected dates are worked out from the provisions and stated in the case
 * itself, so a failure says what was expected AND why — otherwise a red line
 * here just invites someone to update the number until it goes green.
 *
 * *** TWO SECTIONS, ASKING TWO DIFFERENT QUESTIONS ***
 *
 * Everything up to "DECISION 5" asks whether the engine counts correctly. It
 * did, from the day it was written, and it did not matter: the independent
 * review's finding was not that the arithmetic was wrong but that NOTHING
 * CALLED IT. A correct date in an object no render path asks for is not a
 * correct date on anybody's screen.
 *
 * The second section asks whether the path from a question a person is asked to
 * a date a person reads is unbroken — the event catalogue, the question bank,
 * the join, the guard, the render layer, and the two rules that must produce no
 * date at all. Those checks are written as properties: none of them fails
 * because somebody added a deadline, a question or a template. They fail when a
 * link is missing.
 */

import {
  computeDeadline,
  type DeadlineResult,
} from "../../src/lib/case-system/deadlines/deadlineEngine";
import {
  easterSunday,
  holidayFor,
  holidaysInYear,
  unsourcedHolidayNames,
} from "../../src/lib/case-system/deadlines/holidays";
import {
  DEADLINE_EVENTS,
  askedEvents,
  caseDatesFrom,
  parseUserDate,
} from "../../src/lib/case-system/deadlines/deadlineEvents";
import { DEADLINE_TEMPLATES } from "../../src/lib/case-system/deadlines/deadlineTemplates";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { collectContentInventory } from "../../src/lib/content-library/contentInventory";
import { computedDeadlinesFor, countFromDate } from "../../src/lib/content-library/computedDeadline";
import { assertsAbsenceProblems } from "../content/blockGates";
import { ALL_STAGES } from "../../src/lib/case-system/stage-map/stageMap";
import { dateQuestionsForStep } from "../../src/lib/case-system/casePosition";

let passed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed += 1;
    return;
  }
  failures.push(detail ? `${name}\n      ${detail}` : name);
}

type Case = {
  name: string;
  from: string;
  length: Parameters<typeof computeDeadline>[0]["length"];
  regime: "small-claims-rules" | "legislation-act" | "civil-rules" | "family-rules";
  direction?: "after" | "before";
  expect: string;
  /** Why that is the right answer. Shown on failure. */
  because: string;
  certainty?: "computed" | "confirm-with-court";
};

const DAYS = (count: number) => ({ unit: "days" as const, count });

const CASES: Case[] = [
  // ------------------------------------------------- the ordinary 20 days
  {
    name: "defence: 20 days, no weekend or holiday at the end",
    from: "2026-03-02",
    length: DAYS(20),
    regime: "small-claims-rules",
    expect: "2026-03-23",
    because:
      "r. 3.01 excludes the day of service and includes the last day, so 2 March " +
      "+ 20 days is 22 March. That is a Sunday, a holiday under r. 1.02 (a), so " +
      "it runs to Monday 23 March.",
    certainty: "computed",
  },
  {
    name: "defence: last day lands on a Saturday under the RULES",
    from: "2026-04-06",
    length: DAYS(20),
    regime: "small-claims-rules",
    expect: "2026-04-27",
    because:
      "6 April + 20 days is 26 April, a Sunday. Under r. 1.02 (a) Sunday is a " +
      "holiday, so the period runs to Monday 27 April.",
    certainty: "computed",
  },

  // ------------------------------- the same count, the other regime
  {
    name: "municipal notice: 10 days ending on a Saturday is NOT extended",
    from: "2026-06-03",
    length: DAYS(10),
    regime: "legislation-act",
    expect: "2026-06-13",
    because:
      "3 June + 10 days is Saturday 13 June. Legislation Act s. 88 (2) lists " +
      "Sunday and not Saturday, so the period ends that Saturday. This is the " +
      "single most dangerous difference between the two regimes.",
    certainty: "confirm-with-court",
  },
  {
    name: "municipal notice: 10 days ending on a Sunday IS extended",
    from: "2026-06-04",
    length: DAYS(10),
    regime: "legislation-act",
    expect: "2026-06-15",
    because:
      "4 June + 10 days is Sunday 14 June, which s. 88 (2) makes a holiday, so " +
      "s. 89 (1) extends it to Monday 15 June.",
    certainty: "computed",
  },
  {
    name: "the same 10 days under the RULES would end on the Monday",
    from: "2026-06-03",
    length: DAYS(10),
    regime: "small-claims-rules",
    expect: "2026-06-15",
    because:
      "Identical dates and count as the Saturday case above, but r. 1.02 (a) " +
      "makes Saturday a holiday, so it runs to Monday 15 June. Two days later " +
      "than the statutory answer, from the same arithmetic.",
    certainty: "computed",
  },

  // ---------------------------------------------- the occupiers' 60 days
  {
    name: "occupiers' notice: 60 days from a January slip",
    from: "2026-01-15",
    length: DAYS(60),
    regime: "legislation-act",
    expect: "2026-03-16",
    because:
      "15 January + 60 days is 15 March 2026, a Sunday, so s. 89 (1) extends it " +
      "to Monday 16 March.",
    certainty: "computed",
  },

  // ------------------------------------------------------ end of month
  {
    name: "service window: six months from 31 August lands in February",
    from: "2025-08-31",
    length: { unit: "months" as const, count: 6 },
    regime: "small-claims-rules",
    expect: "2026-03-02",
    because:
      "s. 89 (6) puts six months after 31 August at 28 February, because " +
      "February has no 31st. 28 February 2026 is a Saturday, a holiday under " +
      "r. 1.02 (a), and so is Sunday the 1st, so it runs to Monday 2 March.",
    certainty: "computed",
  },
  {
    name: "service window: six months from 30 November lands on 31 May",
    from: "2025-11-30",
    length: { unit: "months" as const, count: 6 },
    regime: "small-claims-rules",
    expect: "2026-06-01",
    because:
      "Six months after 30 November 2025 is 30 May 2026, a Saturday, so under " +
      "r. 1.02 (a) it runs past Sunday to Monday 1 June.",
    certainty: "computed",
  },

  // ----------------------------------------------------------- leap year
  {
    name: "limitation: two years from 29 February falls on 28 February",
    from: "2024-02-29",
    length: { unit: "years" as const, count: 2 },
    regime: "legislation-act",
    expect: "2026-02-28",
    because:
      "s. 89 (7): the anniversary of 29 February falls on 28 February except in " +
      "a leap year. 28 February 2026 is a SATURDAY, and s. 88 (2) does not list " +
      "Saturday, so the period ends that day and is not rolled forward. I first " +
      "wrote 2 March here, reasoning that the weekend would carry it to Monday — " +
      "which is precisely the mistake this engine exists to stop, and the engine " +
      "caught me making it.",
    certainty: "confirm-with-court",
  },
  {
    name: "limitation: four years from 29 February 2024 IS a leap year",
    from: "2024-02-29",
    length: { unit: "years" as const, count: 4 },
    regime: "legislation-act",
    expect: "2028-02-29",
    because:
      "2028 is a leap year, so s. 89 (7)'s exception does not apply and the " +
      "anniversary is 29 February 2028, a Tuesday.",
    certainty: "computed",
  },

  // --------------------------------------------- counting backwards
  {
    name: "disclosure: 14 days before a settlement conference",
    from: "2026-05-20",
    length: DAYS(14),
    regime: "small-claims-rules",
    direction: "before",
    expect: "2026-05-06",
    because:
      "r. 13.03 (2) requires service and filing at least 14 days before the " +
      "conference. 20 May less 14 days is Wednesday 6 May — a working day, so " +
      "no question of extension arises.",
    certainty: "computed",
  },

  // ---- civil and family, counted under their own rules (2026-10-05) ----
  {
    name: "civil: 20 days ending on a Sunday runs to Monday",
    from: "2026-03-02",
    length: DAYS(20),
    regime: "civil-rules",
    expect: "2026-03-23",
    because:
      "r. 3.01 (1) (a) excludes the first day; 22 March is a Sunday, a holiday under " +
      "r. 1.03 (1), and (c) lets the act be done on the next day that is not a holiday.",
    certainty: "computed",
  },
  {
    name: "civil: 7 days skips the Easter weekend's holidays",
    from: "2026-04-02",
    length: DAYS(7),
    regime: "civil-rules",
    expect: "2026-04-15",
    because:
      "r. 3.01 (1) (b): in a period of seven days or less, holidays are not counted. " +
      "Good Friday 3 April, the weekend and Easter Monday 6 April are skipped: 7, 8, 9, " +
      "10, 13, 14, 15 April. Easter Monday has no statutory date, so it is confirm-with-court.",
    certainty: "confirm-with-court",
  },
  {
    name: "civil: 8 days is not a short period, holidays count",
    from: "2026-04-02",
    length: DAYS(8),
    regime: "civil-rules",
    expect: "2026-04-10",
    because: "Eight days is more than seven, so r. 3.01 (1) (b) does not apply: 2 April + 8 is Friday 10 April.",
    certainty: "computed",
  },
  {
    name: "family: r. 3 (4)'s own example -- served Monday, motion the second following Tuesday",
    from: "2026-10-27",
    length: DAYS(6),
    regime: "family-rules",
    direction: "before",
    expect: "2026-10-19",
    because:
      "Family Law Rules r. 3 (4) para. 1: service on a Monday is in time for a motion on " +
      "the second following Tuesday, because Saturday and Sunday are not counted in a " +
      "period of less than seven days. Tuesday 27 October back six weekdays is Monday 19 October.",
    certainty: "computed",
  },
  {
    name: "family: 30 days ending on a Saturday runs to Monday",
    from: "2026-09-03",
    length: DAYS(30),
    regime: "family-rules",
    expect: "2026-10-05",
    because: "r. 3 (3): a period ending on a day court offices are closed ends on the next day they are open.",
    certainty: "computed",
  },
  {
    name: "family: 30 days ending on Thanksgiving is NOT moved, and says why",
    from: "2026-09-12",
    length: DAYS(30),
    regime: "family-rules",
    expect: "2026-10-12",
    because:
      "The Family Law Rules count around days court offices are closed but do not list " +
      "them. Moving past Thanksgiving could give a later date than is right, so the " +
      "engine keeps the earlier one and marks it confirm-with-court.",
    certainty: "confirm-with-court",
  },
  {
    name: "family: a short period counted back past Thanksgiving takes the earlier date",
    from: "2026-10-15",
    length: DAYS(6),
    regime: "family-rules",
    direction: "before",
    expect: "2026-10-06",
    because:
      "Counting back, skipping a day that may be closed gives the earlier date to act by: " +
      "14, 13, (12 Thanksgiving skipped), 9, 8, 7, 6 October.",
    certainty: "confirm-with-court",
  },
];

for (const testCase of CASES) {
  let result: DeadlineResult;
  try {
    result = computeDeadline({
      from: testCase.from,
      length: testCase.length,
      regime: testCase.regime,
      direction: testCase.direction,
    });
  } catch (error) {
    check(testCase.name, false, `threw: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }

  check(
    testCase.name,
    result.deadline === testCase.expect,
    result.deadline === testCase.expect
      ? undefined
      : `got ${result.deadline}, expected ${testCase.expect}\n      ${testCase.because}`,
  );

  if (testCase.certainty) {
    check(
      `${testCase.name} — certainty`,
      result.certainty === testCase.certainty,
      result.certainty === testCase.certainty
        ? undefined
        : `got "${result.certainty}", expected "${testCase.certainty}". ${result.uncertainty ?? ""}`,
    );
  }

  check(
    `${testCase.name} — every step cites a provision`,
    result.steps.length > 0 && result.steps.every((step) => step.citation.pinpoint.length > 0),
    "a computed date with no cited reasoning is a date the user has to take on trust",
  );
}

// ---------------------------------------------------------------------------
// The calendars themselves
// ---------------------------------------------------------------------------

check(
  "Easter 2026 is 5 April",
  easterSunday(2026) === "2026-04-05",
  `got ${easterSunday(2026)}`,
);
check(
  "Easter 2027 is 28 March",
  easterSunday(2027) === "2027-03-28",
  `got ${easterSunday(2027)}`,
);

check(
  "Victoria Day 2026 is Monday 18 May",
  holidaysInYear(2026, "small-claims-rules").some((h) => h.name === "Victoria Day" && h.date === "2026-05-18"),
  "the first Monday immediately preceding May 25 (Holidays Act s. 4)",
);

check(
  "Family Day 2026 is Monday 16 February",
  holidaysInYear(2026, "small-claims-rules").some((h) => h.name === "Family Day" && h.date === "2026-02-16"),
  "the third Monday in February (ESA s. 1 (1))",
);

/*
 * The regime difference, asserted directly rather than only through a deadline.
 * This is the property that the two calendars are genuinely different, not a
 * check on today's dates.
 */
check(
  "Saturday is a holiday under the rules and not under the Act",
  holidayFor("2026-06-13", "small-claims-rules") !== undefined &&
    holidayFor("2026-06-13", "legislation-act") === undefined,
  "r. 1.02 (a) includes any Saturday; Legislation Act s. 88 (2) does not list Saturday",
);

check(
  "Sunday is a holiday under both",
  holidayFor("2026-06-14", "small-claims-rules") !== undefined &&
    holidayFor("2026-06-14", "legislation-act") !== undefined,
  "",
);

check(
  "Civic Holiday counts under the rules and not under the Act",
  holidaysInYear(2026, "small-claims-rules").some((h) => h.name === "Civic Holiday") &&
    !holidaysInYear(2026, "legislation-act").some((h) => h.name === "Civic Holiday"),
  "r. 1.02 (g) names Civic Holiday; the Legislation Act does not",
);

/*
 * The honesty property: holidays we could not source are MARKED, not hidden.
 *
 * Asserted as a property — some holiday is unsourced and every unsourced one
 * carries a reason — rather than as today's list, so sourcing one of them
 * later is an improvement the check accepts rather than a red line.
 */
const unsourced = unsourcedHolidayNames("small-claims-rules");
check(
  "holidays with no statutory date are marked as settled practice",
  unsourced.length > 0,
  "if this ever becomes empty, confirm every date really was sourced rather than the marking being dropped",
);
check(
  "every settled-practice holiday says why",
  holidaysInYear(2026, "small-claims-rules")
    .filter((h) => h.basis.kind === "settled-practice")
    .every((h) => h.basis.kind === "settled-practice" && h.basis.why.length > 40),
  "",
);

/*
 * A deadline landing on one of the unsourced holidays must not be stated as
 * certain. Built by searching for a real date that lands on Labour Day rather
 * than by hard-coding one, so the check survives a calendar change.
 */
const labourDay = holidaysInYear(2026, "small-claims-rules").find((h) => h.name === "Labour Day");
if (!labourDay) {
  check("Labour Day is in the 2026 calendar", false);
} else {
  const landing = computeDeadline({
    from: addDaysPlain(labourDay.date, -20),
    length: DAYS(20),
    regime: "small-claims-rules",
  });
  check(
    "a deadline that moves because of an unsourced holiday says so",
    landing.certainty === "confirm-with-court" && (landing.uncertainty ?? "").includes("Labour Day"),
    `got certainty "${landing.certainty}", uncertainty: ${landing.uncertainty ?? "(none)"}`,
  );
}

function addDaysPlain(date: string, days: number): string {
  const ms = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
  );
  return new Date(ms + days * 86_400_000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Every deadline in the stage map can actually be computed
// ---------------------------------------------------------------------------

/*
 * The join between Part 2 and Part 4.
 *
 * A stage map deadline the engine cannot compute is a block that will render
 * with a blank where the date should be. Run against a fixed reference date so
 * the check does not drift with the calendar.
 */
const REFERENCE = "2026-02-02";
for (const stage of ALL_STAGES) {
  for (const deadline of stage.deadlines) {
    if (deadline.length.count === 0) continue; // r. 11.06 sets no fixed period
    try {
      const result = computeDeadline({
        from: REFERENCE,
        length: deadline.length,
        regime: deadline.regime,
        direction: deadline.countFrom.includes("counting backwards") ? "before" : "after",
      });
      check(
        `stage map deadline computes: ${deadline.id}`,
        /^\d{4}-\d{2}-\d{2}$/.test(result.deadline) && result.steps.length > 0,
        `produced ${result.deadline} with ${result.steps.length} step(s)`,
      );
    } catch (error) {
      check(
        `stage map deadline computes: ${deadline.id}`,
        false,
        `threw: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------

// =========================================================================
// DECISION 5 — IS THE ENGINE ACTUALLY WIRED TO ANYTHING?
// =========================================================================
//
// Everything above this line checks that the engine counts correctly. It did
// that already, on the day it was written, while no user could reach a single
// date it produced. The independent review's finding was not "the arithmetic is
// wrong" — it was "nothing calls this".
//
// So these are checks of a different kind. They assert that the path from a
// question a person is asked to a date a person reads is unbroken, and they are
// written as properties rather than counts: none of them fails because somebody
// added a deadline, a question or a template. They fail when a link is missing.

// ---- 1. every deadline names an event, and every event is real -------------

// All three courts (was Small Claims only until civil and family dates were
// computed, 2026-10-05).
for (const stage of ALL_STAGES) {
  for (const deadline of stage.deadlines) {
    check(
      `${deadline.id} names a real event`,
      Boolean(DEADLINE_EVENTS[deadline.countFromEvent]),
      `countFromEvent "${deadline.countFromEvent}" is not in the catalogue`,
    );
  }
}

// ---- 2. an event we ask about is one we can use ---------------------------
//
// A date question whose answer drives no deadline is worse than no question: it
// asks a person for something, implies it matters, and does nothing with it.
// This is the check that stops the catalogue from growing a question because it
// seemed like a useful thing to know.

const eventsUsedByDeadlines = new Set<string>(
  ALL_STAGES.flatMap((stage) => stage.deadlines.map((deadline) => deadline.countFromEvent)),
);
// An event the two-year limit is counted from under s. 5 (2)'s presumption is
// used too, though no deadline names it (computedDeadline.ts countFromDate).
for (const deadline of ALL_STAGES.flatMap((stage) => stage.deadlines)) {
  for (const event of Object.keys(DEADLINE_EVENTS) as (keyof typeof DEADLINE_EVENTS)[]) {
    if (countFromDate(deadline, { [event]: "2025-01-15" }).from) eventsUsedByDeadlines.add(event);
  }
}

for (const event of Object.values(DEADLINE_EVENTS)) {
  if (event.question === null) {
    check(
      `${event.key} says why it is not asked`,
      Boolean(event.notAskedBecause),
      "an event we decline to ask about must record the reason, or it reads as an oversight",
    );
    continue;
  }

  check(
    `${event.key} is asked AND used`,
    eventsUsedByDeadlines.has(event.key),
    "we ask a person for this date and no deadline is counted from it",
  );
}

// ---- 3. the question exists, in the bank, in the words the catalogue claims -

const bankById = new Map(QUESTION_BANK.map((question) => [question.id, question]));

// A civil or family date is asked on the case page, where the reader picks
// their step, not in the Small Claims intake bank. "Asked" there means the
// step's date questions actually include it.
const askedOnCasePage = new Set(ALL_STAGES.flatMap((stage) => dateQuestionsForStep(stage.id).map((question) => question.id)));

for (const event of askedEvents()) {
  if (event.askedOn === "case-page") {
    check(
      `${event.key} is asked on the case page`,
      Boolean(event.questionId && askedOnCasePage.has(event.questionId)),
      `no step's date questions include "${event.questionId}", so nothing asks it`,
    );
    continue;
  }
  const question = event.questionId ? bankById.get(event.questionId) : undefined;
  check(
    `${event.key} has its question in the bank`,
    Boolean(question),
    `questionId "${event.questionId}" is not in QUESTION_BANK, so nothing asks it`,
  );
  if (!question) continue;

  // The catalogue and the bank must not drift: a reader answers the bank's
  // wording, and the catalogue is what claims that answer is this event's date.
  check(
    `${event.key}'s question text matches the bank`,
    question.text === event.question,
    `catalogue: ${event.question}\n      bank:      ${question.text}`,
  );
  check(
    `${event.key}'s question takes a date`,
    question.answerType === "date",
    `answerType is "${question.answerType}"`,
  );
  check(
    `${event.key}'s question can be skipped`,
    question.allowUnknown,
    "these questions are optional by design: a known date buys a computed date, " +
      "and an unknown one must cost nothing",
  );
}

// ---- 4. an answer becomes a date, and an ambiguous one does not ------------
//
// The refusals matter more than the acceptances. "03/04/2026" is 3 April to most
// of the world and 4 March to some of it; guessing produces a deadline out by a
// month with a rule cited beside it, which is the most credible wrong answer
// this product could give.

for (const accepted of [
  ["2026-04-03", "2026-04-03"],
  ["3 April 2026", "2026-04-03"],
  ["April 3 2026", "2026-04-03"],
  ["3 Apr 2026", "2026-04-03"],
  ["3rd April, 2026", "2026-04-03"],
  ["  2026-4-3 ", "2026-04-03"],
] as const) {
  check(
    `parseUserDate accepts "${accepted[0]}"`,
    parseUserDate(accepted[0]) === accepted[1],
    `got ${String(parseUserDate(accepted[0]))}, wanted ${accepted[1]}`,
  );
}

for (const refused of [
  "03/04/2026",
  "3/4/2026",
  "last Tuesday",
  "early March",
  "about 3 weeks ago",
  "31 February 2026",
  "2026-02-30",
  "sometime in 2026",
  "",
]) {
  check(
    `parseUserDate refuses "${refused}"`,
    parseUserDate(refused) === null,
    `it returned ${String(parseUserDate(refused))} — an ambiguous or impossible date must be ` +
      `refused, not guessed`,
  );
}

// The join, end to end: an answer keyed by question id becomes a date keyed by
// event. Both events that share the claim-issued question must be filled.
const joined = caseDatesFrom({
  "sc-date-claim-served": "3 April 2026",
  "sc-date-claim-issued": "2026-01-02",
  "sc-date-learned-of-default": "not sure, maybe March",
});
check("caseDatesFrom parses a served date", joined["served-with-claim"] === "2026-04-03");
check("caseDatesFrom fills both events sharing one question", joined["claim-issued"] === "2026-01-02" && joined["action-commenced"] === "2026-01-02");
check(
  "caseDatesFrom drops a vague answer rather than guessing",
  joined["learned-of-default"] === undefined,
);

// ---- 5. every sentence the engine can say is reachable through the guard ---
//
// The guard is an allowlist. A template that is not in the content inventory
// cannot be shown at all — and the failure is silent, because a sentence that
// never reaches the guard cannot be reported by it.

const inventoryText = new Set(collectContentInventory().map((entry) => entry.text.trim()));

for (const template of Object.values(DEADLINE_TEMPLATES)) {
  check(
    `template ${template.id} is in the content inventory`,
    inventoryText.has(template.text.trim()),
    "the output guard is an allowlist, so this sentence can never be shown to anyone",
  );
}

// ---- 6. and none of them claims the law is silent -------------------------
//
// Decision 1, applied to the engine's own prose. One of these templates DID
// claim it — "they do not say what happens to a backwards-counted date" — and
// nothing caught it for the whole of Part 4, because prose in an engine nobody
// calls is prose nobody reads. Wiring the engine up is exactly the moment to
// hold it to the same rule as every block.

for (const template of Object.values(DEADLINE_TEMPLATES)) {
  const problems = assertsAbsenceProblems(template.text);
  check(
    `template ${template.id} does not assert the law is silent`,
    problems.length === 0,
    problems.join("; "),
  );
}

// ---- 7. a rule that fixes no period never produces a date ------------------
//
// r. 11.06 requires a motion "as soon as is reasonably possible in all the
// circumstances" and the stage map records that as count 0. The engine throws on
// it; the render path must skip it. Asserted against the real stage rather than
// a synthetic one, because the stage this protects —
// `defendant:default-judgment-against-me` — is the one the eval calls the place
// where a wrong answer costs the most.

const noFixedPeriod = ALL_STAGES.flatMap((stage) => stage.deadlines).filter(
  (deadline) => deadline.length.count === 0,
);
check(
  "there is still a deadline with no fixed period to test against",
  noFixedPeriod.length > 0,
  "if this is empty the check below asserts nothing; r. 11.06 should be here",
);
for (const deadline of noFixedPeriod) {
  const computed = computedDeadlinesFor([deadline], {
    [deadline.countFromEvent]: "2026-03-02",
  });
  check(
    `${deadline.id} produces no date even with its event date known`,
    computed.length === 0,
    "a rule that deliberately fixes no period must not be turned into a date",
  );
}

// ---- 8. an unknown date leaves the answer exactly as it was ---------------
//
// The promise the optional questions rest on. If skipping a date question could
// make an answer worse, the question is not optional in any meaningful sense.

for (const stage of ALL_STAGES) {
  if (stage.deadlines.length === 0) continue;
  check(
    `${stage.id} computes nothing without dates`,
    computedDeadlinesFor(stage.deadlines, {}).length === 0,
    "a stage with no dates given must fall back to the period, not produce something",
  );
}


console.log("");
console.log("DEADLINE ENGINE");
console.log("");
console.log(`  ${passed} check(s) passed`);
console.log(`  holidays with no statutory date, marked as such: ${unsourced.join(", ")}`);
console.log("");

if (failures.length > 0) {
  console.log(`${failures.length} FAILURE(S):`);
  console.log("");
  for (const failure of failures) console.log(`  - ${failure}`);
  console.log("");
  process.exitCode = 1;
} else {
  console.log("  All checks passed.");
  console.log("");
}


