/**
 * DECISION 5 — the deadline a reader actually sees, with a date in it.
 *
 * *** WHAT WAS WRONG BEFORE THIS ***
 *
 * Part 4 built a deadline engine that counts days under two regimes, handles
 * 29 February, handles the six-month period landing in a month with no 31st,
 * and knows that a statutory period can expire on a Saturday when a period
 * under the rules cannot. It is the most carefully checked thing in the
 * product: 60 assertions, nine worked cases, every step citing its provision.
 *
 * Nothing called it. The independent review said so plainly — "the deadline
 * engine has no production caller" — and it was right. A user reading a stage
 * answer got "You have 20 days, counted from the day of being served with the
 * claim" and was left to do the arithmetic that the engine exists to do,
 * including the weekend rollover, which is the part people get wrong.
 *
 * *** WHAT DECIDES WHETHER A DATE APPEARS ***
 *
 * Only whether we know the date the clock runs from. Nothing else:
 *
 *   date known, period fixed      -> the period AND the computed date, with
 *                                    the counting shown step by step
 *   date not known                -> the period, exactly as before
 *   period not fixed (r. 11.06)   -> the period text, which already says the
 *                                    rule sets no number of days
 *   date unparseable              -> treated as not known. See parseUserDate:
 *                                    an ambiguous date is refused rather than
 *                                    guessed, because a deadline out by a month
 *                                    with a rule cited beside it is the most
 *                                    credible wrong answer this product could
 *                                    give.
 *
 * *** EVERY SENTENCE HERE IS A GUARDED TEMPLATE ***
 *
 * The prose comes from DEADLINE_TEMPLATES, each one indexed by
 * `contentInventory` and checked by `outputGuard` before it is filled. This
 * function supplies dates and counts. It writes nothing.
 *
 * If a template is blocked — the guard is on and a licensee has not approved it
 * — that sentence is dropped and the period text stands on its own. The reader
 * loses the computed date and keeps a correct answer. That is the right way for
 * this to fail: a deadline section is not a place to show something unreviewed
 * because the alternative was showing less.
 */

import { computeDeadline } from "../case-system/deadlines/deadlineEngine";
import { formatLongDate } from "../case-system/deadlines/holidays";
import { DEADLINE_TEMPLATES, type DeadlineTemplateId } from "../case-system/deadlines/deadlineTemplates";
import { closureWarningFor } from "../case-system/deadlines/courtServiceNotices";
import type { CaseDates } from "../case-system/deadlines/deadlineEvents";
import type { StageDeadline } from "../case-system/stage-map/stageMap";
import type { RuleCitation } from "../case-system/stage-map/citations";
import { assertApprovedUserContent } from "./outputGuard";
import { fillSlots } from "./stageAnswers";

export type ComputedDeadlineWorking = {
  text: string;
  citation: RuleCitation | null;
};

export type ComputedDeadline = {
  /** Which stage-map deadline this is, so a caller can line it up with its period text. */
  deadlineId: string;
  /**
   * The date as `YYYY-MM-DD`.
   *
   * *** THIS COMMENT USED TO SAY "spelled out with its weekday". IT IS NOT. ***
   *
   * The code assigns `result.deadline`, which is an ISO date. The spelled-out form
   * is built separately as `spelled` and goes only into `statement`, where a reader
   * sees it. `scripts/eval/deadlineCases.ts` compares this field against an ISO
   * expectation, so consumers have always relied on it being ISO — the comment was
   * the only thing that was wrong.
   *
   * Worth recording because of how it nearly cost something. The case-workspace
   * chronology needs a sortable date, read this comment, believed it, and recovered
   * an ISO value by REGEX over an expected "23 March 2026". Against an actual
   * "2026-03-23" that regex matches nothing and returns null — and the chronology
   * drops a computed item whose date cannot be recovered. Every deadline would have
   * vanished from every chronology, silently, and no check would have failed because
   * the count of computed items was never asserted against a non-zero expectation.
   *
   * Found by reading the assembly at the bottom of this file rather than by any
   * test. A doc comment that disagrees with its code is worse than none: nobody
   * verifies what they have just been told.
   */
  date: string;
  /** The one-sentence statement of the date, already guarded and filled. */
  statement: string;
  /** The engine's steps, each guarded and filled. */
  working: ComputedDeadlineWorking[];
  /** Set where the engine is not certain. Says exactly what is unsure. */
  uncertainty: string | null;
  /** Always present: the reminder that this was counted, not read off a file. */
  caution: string;
  /**
   * Set when a court office closure falls on this date, or within a few days
   * after it. Says the deadline is UNCHANGED and the counter is shut.
   *
   * Separate from `uncertainty` on purpose. Uncertainty means the engine is not
   * sure what the date is. This means the engine is sure, and the office is
   * closed anyway — a practical fact from a ministry notice, not a doubt about
   * the law. Merging them would make a certain date look uncertain.
   */
  closureWarning: string | null;
};

/**
 * Guards a template and fills it, or returns null.
 *
 * Note the order, which is the same order `stageAnswerView` uses and is the
 * whole point: the guard sees the TEMPLATE, with `{result}` still in it. A
 * guard that saw the filled sentence would be approving one reader's date and
 * no other reader's, which is not a control, it is a coincidence.
 */
function guardedFill(
  id: DeadlineTemplateId,
  values: Record<string, string>,
  context: string,
): string | null {
  const template = DEADLINE_TEMPLATES[id];
  const approved = assertApprovedUserContent(template.text, `${context}:${id}`);
  if (!approved) return null;
  try {
    return fillSlots(approved, values);
  } catch (error) {
    // fillSlots throws rather than render a hole. A missing value here is our
    // bug, not the reader's, and they should see the period rather than a
    // half-sentence.
    console.error(`[computedDeadline] could not fill ${id}: ${String(error)}`);
    return null;
  }
}

/**
 * Computes what can be computed for one stage's deadlines.
 *
 * Returns an entry only for a deadline whose event date is known and whose
 * period is a fixed number. Everything else is silently absent, which is what
 * leaves the period text as the answer.
 */
export function computedDeadlinesFor(
  deadlines: readonly StageDeadline[],
  dates: CaseDates,
  context = "computedDeadline",
): ComputedDeadline[] {
  const computed: ComputedDeadline[] = [];

  for (const deadline of deadlines) {
    // count 0 is r. 11.06: a rule that deliberately fixes no period. The engine
    // throws on it rather than counting zero days and rolling the result off a
    // weekend, which is what it used to do.
    if (deadline.length.count === 0) continue;

    // Civil and family periods are computed too since 2026-10-05, each under
    // its own rules with its own citations (deadlineEngine.ts).

    const from = dates[deadline.countFromEvent];
    if (!from) continue;

    let result;
    try {
      result = computeDeadline({
        from,
        length: deadline.length,
        regime: deadline.regime,
        direction: deadline.direction,
      });
    } catch (error) {
      // A date that is not a real date reaches here. Log and show the period.
      console.error(`[computedDeadline] ${deadline.id} from ${from}: ${String(error)}`);
      continue;
    }

    /*
     * *** THE FINAL DATE, NOT THE FIRST ONE ***
     *
     * This read the first step's result, which is the date BEFORE the holiday
     * extension. On a 20-day defence period served 2 March it announced \"the
     * last day for this is Sunday 22 March\" while the steps below it, and the
     * engine, and the eval, all said Monday 23 March. It told the reader the
     * deadline was two days earlier than it is — in the one sentence most
     * likely to be the only one they read.
     *
     * Caught by reading the rendered output rather than by any check. The
     * suite now asserts the statement carries the same date the engine
     * returned.
     */
    const spelled = formatLongDate(result.deadline);

    const statement = guardedFill(
      deadline.direction === "before" ? "computed-date-backward" : "computed-date-forward",
      { result: spelled },
      context,
    );
    if (!statement) continue;

    const caution = guardedFill("confirm-the-computed-date", {}, context);
    if (!caution) continue;

    /*
     * The closure warning is ADDITIVE and never blocks the entry.
     *
     * If the warning cannot be produced — no notice, or a notice without a
     * stamping date — the date still goes out, because the date is right. That
     * is the opposite of the uncertainty rule above, where a date without its
     * explanation is withheld. The difference is that an unexplained uncertain
     * date misleads, whereas a correct date without a closure note is merely
     * less helpful than it could be.
     */
    // Small Claims and statutory deadlines only. The closure sentences say a
    // closure does NOT move the date, which is false under Family Law Rules
    // r. 3 (3), where a period ending on a day court offices are closed runs
    // to the next day they are open; and their source is the Small Claims
    // online-filing page, whose date-stamping statement is not a source for
    // how a civil filing is stamped (2026-10-05).
    const closure =
      deadline.regime === "family-rules" || deadline.regime === "civil-rules"
        ? null
        : closureWarningFor(result.deadline);
    const closureWarning = closure
      ? guardedFill(closure.templateId, closure.values, context)
      : null;

    const working: ComputedDeadlineWorking[] = [];
    for (const step of result.steps) {
      const text = guardedFill(step.templateId, step.values, context);
      if (text) working.push({ text, citation: step.citation });
    }

    /*
     * *** A `confirm-with-court` DATE WITHOUT ITS EXPLANATION IS A LIE ***
     *
     * The three uncertain outcomes are the Saturday that a statutory period
     * really does expire on, a date that moved because of a holiday no statute
     * dates, and a backwards-counted date landing on a holiday. In each one the
     * date alone reads as settled and is not. So if the explanation cannot be
     * shown, the date does not go out either — the whole entry is dropped and
     * the reader gets the period.
     *
     * The engine names the template it used, so this guards the same words a
     * licensee reviewed rather than trying to recognise the filled sentence.
     */
    let uncertainty: string | null = null;
    if (result.certainty === "confirm-with-court") {
      if (!result.uncertainty || !result.uncertaintyTemplate) continue;
      const approved = assertApprovedUserContent(
        DEADLINE_TEMPLATES[result.uncertaintyTemplate].text,
        `${context}:${result.uncertaintyTemplate}`,
      );
      if (!approved) continue;
      uncertainty = result.uncertainty;
    }

    computed.push({
      deadlineId: deadline.id,
      date: result.deadline,
      statement,
      working,
      uncertainty,
      caution,
      closureWarning,
    });
  }

  return computed;
}

/**
 * The computed part of a deadline section, as prose, in reading order.
 *
 * Returned separately from the period text rather than merged into it, because
 * the period text is a published block section that the promotion gate requires
 * to be byte-identical to what `renderDeadlineSection` produces. Editing it at
 * render time would break that check for a good reason and then somebody would
 * loosen the check.
 */
export function computedDeadlineProse(
  computed: ComputedDeadline[],
  context = "computedDeadline",
  today: string = new Date().toISOString().slice(0, 10),
): string {
  if (computed.length === 0) return "";

  const heading = guardedFill("how-this-was-counted", {}, context);
  const parts: string[] = [];

  for (const entry of computed) {
    parts.push(entry.statement);
    if (entry.date < today) {
      const passed = guardedFill("computed-date-has-passed", {}, context);
      if (passed) parts.push(passed);
    }
    if (entry.uncertainty) parts.push(entry.uncertainty);
    /*
     * Immediately after the date and any uncertainty, and BEFORE the working.
     *
     * Reading order is the whole value of this warning. A reader who stops after
     * the date has to have already met "the office is shut that day"; put it
     * below the step-by-step working and the people most likely to file on the
     * deadline are the least likely to have read it.
     */
    if (entry.closureWarning) parts.push(entry.closureWarning);
    if (heading && entry.working.length > 0) {
      parts.push([heading, ...entry.working.map((line) => `- ${line.text}`)].join("\n"));
    }
    parts.push(entry.caution);
  }

  return parts.join("\n\n");
}
