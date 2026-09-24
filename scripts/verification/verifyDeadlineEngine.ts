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
import { CASE_STAGES } from "../../src/lib/case-system/stage-map/stageMap";

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
  regime: "small-claims-rules" | "legislation-act";
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
for (const stage of CASE_STAGES) {
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


