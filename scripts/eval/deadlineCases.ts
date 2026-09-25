/**
 * The dated half of the eval. No model, and 100% is the only acceptable score.
 *
 * *** WHY THESE ARE SEPARATE FROM THE STORIES ***
 *
 * Everything else in the eval measures a judgment call and is scored as a
 * percentage. A date is not a judgment call. It has one right answer, the
 * answer is reachable by arithmetic, and being wrong by a day can cost a
 * person their claim. A 95% here would not be a good result; it would be one
 * person in twenty sent to the counter on the wrong day.
 *
 * *** EVERY EXPECTED VALUE IS WORKED OUT FROM THE RULES, IN THE CASE ***
 *
 * The `because` field states the reasoning, not just the answer. Without it a
 * red line invites someone to update the expected date until it goes green,
 * which is how a date suite stops testing anything.
 *
 * *** THE CASES ARE CHOSEN WHERE CASUAL REASONING GOES WRONG ***
 *
 * Nobody miscounts a Tuesday-to-Tuesday. The traps are weekends under two
 * different regimes, a 29 February anniversary, and a six-month period landing
 * in a month that has no 31st — and the Saturday case, which is the one that
 * caught ME while writing Part 4.
 */

import { computeDeadline } from "../../src/lib/case-system/deadlines/deadlineEngine";
import type { CountingRegime, DeadlineLength } from "../../src/lib/case-system/stage-map/stageMap";

export type DeadlineCase = {
  id: string;
  from: string;
  length: DeadlineLength;
  regime: CountingRegime;
  direction?: "after" | "before";
  expect: string;
  /** The reasoning. Shown on failure so the number cannot just be "fixed". */
  because: string;
  expectCertainty?: "computed" | "confirm-with-court";
};

const days = (count: number): DeadlineLength => ({ unit: "days", count });

export const DEADLINE_CASES: DeadlineCase[] = [
  {
    id: "defence-20-days-lands-sunday",
    from: "2026-03-02",
    length: days(20),
    regime: "small-claims-rules",
    expect: "2026-03-23",
    because:
      "r. 3.01 excludes the day of service and includes the last day, so 2 March + 20 is " +
      "22 March — a Sunday, and a holiday under r. 1.02 (a). Runs to Monday 23 March.",
    expectCertainty: "computed",
  },
  {
    id: "municipal-notice-ends-saturday",
    from: "2026-06-03",
    length: days(10),
    regime: "legislation-act",
    expect: "2026-06-13",
    because:
      "THE SATURDAY TRAP. 3 June + 10 is Saturday 13 June. Legislation Act s. 88 (2) lists " +
      "Sunday and NOT Saturday, so a statutory period genuinely ends that Saturday. " +
      "Assuming the weekend carries it to Monday loses two days on a 10-day notice.",
    expectCertainty: "confirm-with-court",
  },
  {
    id: "same-ten-days-under-the-rules",
    from: "2026-06-03",
    length: days(10),
    regime: "small-claims-rules",
    expect: "2026-06-15",
    because:
      "Identical dates and count as the case above. r. 1.02 (a) makes Saturday a holiday, " +
      "so it runs to Monday 15 June — TWO DAYS LATER than the statutory answer, from the " +
      "same arithmetic. This pair is the whole reason each deadline records its regime.",
    expectCertainty: "computed",
  },
  {
    id: "municipal-notice-ends-sunday",
    from: "2026-06-04",
    length: days(10),
    regime: "legislation-act",
    expect: "2026-06-15",
    because:
      "4 June + 10 is Sunday 14 June, which s. 88 (2) DOES make a holiday, so s. 89 (1) " +
      "extends to Monday 15 June. The mirror of the Saturday case.",
    expectCertainty: "computed",
  },
  {
    id: "occupiers-60-days-january-slip",
    from: "2026-01-15",
    length: days(60),
    regime: "legislation-act",
    expect: "2026-03-16",
    because:
      "The private-premises snow-and-ice notice. 15 January + 60 is Sunday 15 March, " +
      "extended by s. 89 (1) to Monday 16 March.",
    expectCertainty: "computed",
  },
  {
    id: "service-window-six-months-from-31-august",
    from: "2025-08-31",
    length: { unit: "months", count: 6 },
    regime: "small-claims-rules",
    expect: "2026-03-02",
    because:
      "s. 89 (6) puts six months after 31 August at 28 February, because February has no " +
      "31st. 28 February 2026 is a Saturday and 1 March a Sunday, both holidays under " +
      "r. 1.02 (a), so it runs to Monday 2 March.",
    expectCertainty: "computed",
  },
  {
    id: "limitation-two-years-from-29-february",
    from: "2024-02-29",
    length: { unit: "years", count: 2 },
    regime: "legislation-act",
    expect: "2026-02-28",
    because:
      "s. 89 (7): the anniversary of 29 February falls on 28 February except in a leap " +
      "year. 28 February 2026 is a SATURDAY and s. 88 (2) does not list Saturday, so it " +
      "ends there. I first expected 2 March here, reasoning the weekend would carry it to " +
      "Monday — the exact mistake this engine exists to stop.",
    expectCertainty: "confirm-with-court",
  },
  {
    id: "four-years-from-29-february-is-a-leap-year",
    from: "2024-02-29",
    length: { unit: "years", count: 4 },
    regime: "legislation-act",
    expect: "2028-02-29",
    because: "2028 is a leap year, so s. 89 (7)'s exception does not apply.",
    expectCertainty: "computed",
  },
  {
    id: "disclosure-14-days-before-conference",
    from: "2026-05-20",
    length: days(14),
    regime: "small-claims-rules",
    direction: "before",
    expect: "2026-05-06",
    because:
      "r. 13.03 (2) counts BACKWARDS from the conference. 20 May less 14 is Wednesday " +
      "6 May. Counting forward here would be the opposite of what the rule requires.",
    expectCertainty: "computed",
  },
];

export function runDeadlineCases(): {
  total: number;
  passed: number;
  failures: string[];
} {
  const failures: string[] = [];
  let passed = 0;

  for (const testCase of DEADLINE_CASES) {
    try {
      const result = computeDeadline({
        from: testCase.from,
        length: testCase.length,
        regime: testCase.regime,
        direction: testCase.direction,
      });

      if (result.deadline !== testCase.expect) {
        failures.push(
          `${testCase.id}: got ${result.deadline}, expected ${testCase.expect}\n      ${testCase.because}`,
        );
        continue;
      }

      if (testCase.expectCertainty && result.certainty !== testCase.expectCertainty) {
        failures.push(
          `${testCase.id}: date right but certainty "${result.certainty}", expected ` +
            `"${testCase.expectCertainty}". ${result.uncertainty ?? ""}`,
        );
        continue;
      }

      if (result.steps.length === 0) {
        failures.push(`${testCase.id}: produced a date with no cited reasoning`);
        continue;
      }

      passed += 1;
    } catch (error) {
      failures.push(
        `${testCase.id}: threw — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return { total: DEADLINE_CASES.length, passed, failures };
}
