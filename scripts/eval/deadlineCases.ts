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

import { formatLongDate } from "../../src/lib/case-system/deadlines/holidays";
import * as C from "../../src/lib/case-system/stage-map/citations";
import type {
  CountingRegime,
  DeadlineLength,
  StageDeadline,
} from "../../src/lib/case-system/stage-map/stageMap";
import {
  computedDeadlinesFor,
  computedDeadlineProse,
} from "../../src/lib/content-library/computedDeadline";
import { renderStageAnswer } from "../../src/lib/content-library/stageAnswerView";
import type { DeadlineEventKey } from "../../src/lib/case-system/deadlines/deadlineEvents";

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
  /**
   * A real published stage whose deadline this case matches, so the case can be
   * measured through the runtime door rather than only through the render layer.
   * Absent where no block is published for the stage, or where the event is one
   * we deliberately never ask a date for.
   */
  throughStage?: { stageId: string; event: DeadlineEventKey };
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
    throughStage: { stageId: "defendant:served-defence-period-running", event: "served-with-claim" },
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
    throughStage: { stageId: "before-filing:notice-municipality", event: "injury-occurred" },
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
    throughStage: { stageId: "before-filing:notice-municipality", event: "injury-occurred" },
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
    throughStage: { stageId: "before-filing:notice-snow-ice-private", event: "injury-occurred" },
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
    throughStage: { stageId: "plaintiff:claim-issued-not-served", event: "claim-issued" },
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
    throughStage: { stageId: "plaintiff:awaiting-settlement-conference", event: "settlement-conference-date" },
    because:
      "r. 13.03 (2) counts BACKWARDS from the conference. 20 May less 14 is Wednesday " +
      "6 May. Counting forward here would be the opposite of what the rule requires.",
    expectCertainty: "computed",
  },
];

/*
 * *** DECISION 5: MEASURED ON WHAT THE READER SEES ***
 *
 * These nine cases used to call `computeDeadline` and compare its return value.
 * Nine of nine passed, and the number meant less than it looked like, because
 * the engine had no production caller: a correct date in an object no render
 * path asked for is not a correct date on a screen.
 *
 * Every case now goes through the render layer — `computedDeadlinesFor`, which
 * is the same function `renderStageAnswer` calls, guard included — and the date
 * is looked for IN THE PROSE. A formatting bug that dropped the date, a
 * statement built from the wrong step, or a template the guard refuses now fails
 * a case instead of passing one.
 *
 * That is not hypothetical. The statement sentence was assembled from the FIRST
 * step's result rather than the final date, so a defence period served 2 March
 * announced "the last day for this is Sunday 22 March" above four steps that
 * correctly ended at Monday 23 March. Reading the output caught it; comparing
 * the engine's return value never would have, because the engine was right.
 *
 * `throughStage` is stronger still, and only two cases can claim it: a real
 * published block, rendered by the real runtime door, with the date read out of
 * the deadline section a user would read. The rest have no published block yet
 * (the three notice stages are still needs-human) or run from an event we
 * deliberately never ask about — the limitation period, where "discovered" is
 * decided under Limitations Act s. 5 rather than reported. Both numbers are
 * reported, separately, so the weaker one cannot be mistaken for the stronger.
 */

/** A synthetic deadline, so a bare arithmetic case can use the render path. */
function syntheticDeadline(testCase: DeadlineCase): StageDeadline {
  return {
    id: `eval:${testCase.id}`,
    what: "Do the thing this deadline is for",
    countFrom: "the event",
    countFromEvent: EVAL_EVENT,
    length: testCase.length,
    direction: testCase.direction,
    regime: testCase.regime,
    rule: C.R_3_01_COMPUTATION,
    computation: C.R_3_01_COMPUTATION,
    consequence: "changes-what-happens-next",
    exceptions: [],
  };
}

/** Any event will do for a synthetic case; it only has to match the date given. */
const EVAL_EVENT = "served-with-claim" as const;

export function runDeadlineCases(): {
  total: number;
  passed: number;
  failures: string[];
  /** How many cases were measured through a real published block. */
  throughPublishedBlock: number;
} {
  const failures: string[] = [];
  let passed = 0;
  let throughPublishedBlock = 0;

  for (const testCase of DEADLINE_CASES) {
    try {
      const computed = computedDeadlinesFor(
        [syntheticDeadline(testCase)],
        { [EVAL_EVENT]: testCase.from },
        `eval:${testCase.id}`,
      );

      if (computed.length !== 1) {
        failures.push(
          `${testCase.id}: the render path produced NOTHING for a date it was given. ` +
            `A blocked template or a refused date, either of which means the reader sees ` +
            `no computed deadline at all.`,
        );
        continue;
      }

      const [entry] = computed;

      if (entry.date !== testCase.expect) {
        failures.push(
          `${testCase.id}: got ${entry.date}, expected ${testCase.expect}\n      ${testCase.because}`,
        );
        continue;
      }

      /*
       * The date, spelled out, must be IN the sentence the reader reads.
       *
       * This is the assertion that would have caught the first-step bug: the
       * structured `date` was right while the statement named a different day.
       */
      const spelled = formatLongDate(testCase.expect);
      if (!entry.statement.includes(spelled)) {
        failures.push(
          `${testCase.id}: the date is right (${entry.date}) but the sentence shown to the ` +
            `reader does not contain it.\n      said: ${entry.statement}\n      wanted: ${spelled}`,
        );
        continue;
      }

      const prose = computedDeadlineProse(computed, `eval:${testCase.id}`);
      if (!prose.includes(spelled)) {
        failures.push(`${testCase.id}: the assembled deadline prose does not contain ${spelled}`);
        continue;
      }

      const uncertain = entry.uncertainty !== null;
      const wantUncertain = testCase.expectCertainty === "confirm-with-court";
      if (testCase.expectCertainty && uncertain !== wantUncertain) {
        failures.push(
          `${testCase.id}: date right but the reader was ${uncertain ? "" : "NOT "}told it ` +
            `needs confirming, and should have been ${wantUncertain ? "" : "NOT "}told.` +
            `${entry.uncertainty ? `\n      said: ${entry.uncertainty}` : ""}`,
        );
        continue;
      }

      if (entry.working.length === 0) {
        failures.push(`${testCase.id}: produced a date with no cited reasoning shown`);
        continue;
      }

      /*
       * And where a published block exists, the whole way through: the runtime
       * door, the published prose, the guard, the deadline section.
       */
      if (testCase.throughStage) {
        const answer = renderStageAnswer(
          testCase.throughStage.stageId,
          {},
          { [testCase.throughStage.event]: testCase.from },
        );
        const section = answer?.sections.find((part) => part.heading === "Your deadline");
        if (!section) {
          failures.push(
            `${testCase.id}: ${testCase.throughStage.stageId} rendered no deadline section, so ` +
              `the computed date reaches no reader`,
          );
          continue;
        }
        if (!section.text.includes(spelled)) {
          failures.push(
            `${testCase.id}: ${testCase.throughStage.stageId}'s deadline section does not ` +
              `contain ${spelled}\n      section: ${section.text}`,
          );
          continue;
        }
        throughPublishedBlock += 1;
      }

      passed += 1;
    } catch (error) {
      failures.push(
        `${testCase.id}: threw — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return { total: DEADLINE_CASES.length, passed, failures, throughPublishedBlock };
}
