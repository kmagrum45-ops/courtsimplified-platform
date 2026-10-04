/**
 * PART 3 / ITEM 8 — the answer a person gets at their stage.
 *
 * *** ORGANISED BY THE QUESTION, NOT BY THE RULE ***
 *
 * The existing catalogue is organised the way the Rules are: service, defence,
 * default, settlement conferences. That is how a regulation is structured and
 * it is not how anyone arrives. People arrive with "they never responded, what
 * can I do?" — and the answer to that spans r. 9.01, r. 11.01, r. 11.02 and a
 * fee schedule. So a block is keyed to a stage and a question, and gathers
 * whatever rules that question touches.
 *
 * *** THE FIVE PARTS ARE SEPARATE FIELDS ON PURPOSE ***
 *
 * They could have been one string with headings. Separate fields mean a block
 * that forgets to say what happens after, or that has no deadline section
 * where the stage plainly has a deadline, is a structural defect a check can
 * find — not a paragraph someone has to notice is missing.
 *
 *   whatsHappening    where the case stands right now
 *   whatToDoNext      the step, with form numbers AND names, where to file, fees
 *   yourDeadline      the date and what it is counted from
 *   whatHappensAfter  what the next move by the court or the other side is
 *   citations         the source, always
 *
 * `yourDeadline` is `null` only where the stage genuinely carries none, and
 * the verifier checks that against the stage map rather than taking the
 * drafter's word for it.
 *
 * *** NOTHING HERE IS APPROVED ***
 *
 * `verified-draft` is the ceiling this pipeline can reach. It means: every
 * sentence was checked against the vendored source text by a separate pass,
 * and every supporting quote was then found verbatim in the corpus by code.
 * It does NOT mean a licensee has read it. `approved` is reserved for that and
 * is set by a person, never by this pipeline.
 *
 * *** SLOTS ARE FILLED BY CODE, NEVER BY A MODEL ***
 *
 * A user's dates, amounts and names go into a verified template through
 * `fillSlots`. The model never sees a filled sentence and never writes one.
 * That is what keeps a personalised answer from being a new, unreviewed legal
 * statement about this person's case.
 */

import type { RuleCitation } from "../case-system/stage-map/citations";

/**
 * A hole in a template, and where its value comes from.
 *
 * `kind` exists so a date cannot be rendered where money belongs and so the
 * deadline engine's output can be routed to the right hole. `from` names the
 * fact in the case record, so a slot with no source of truth is visible.
 */
export type Slot = {
  name: string;
  kind: "date" | "money" | "text" | "form" | "court";
  from: string;
};

/** What the verifier concluded about one sentence. */
export type SentenceVerdict = {
  sentence: string;
  supported: boolean;
  /**
   * The passage the verifier says supports it.
   *
   * A model can invent a plausible-looking quote, so this is checked against
   * the vendored corpus BY CODE before it counts. See `quoteFound`.
   */
  quote?: string;
  sourceId?: string;
  /** Present when unsupported. Why the source does not say this. */
  reason?: string;
  /** Set by the pipeline, not the model: was the quote actually in the corpus? */
  quoteFound?: boolean;
};

export type VerificationRecord =
  | {
      status: "verified-draft";
      verifiedAt: string;
      attempts: number;
      verdicts: SentenceVerdict[];
    }
  | {
      status: "needs-human";
      lastAttemptAt: string;
      attempts: number;
      verdicts: SentenceVerdict[];
      /** The sentences that could not be supported, for the person who picks it up. */
      unsupported: string[];
    }
  /*
   * *** no-source: THERE IS NOTHING TO SAY, AND SAYING SO IS THE ANSWER ***
   *
   * Some stages have no official source for what to do. `both:filed-in-wrong-place`
   * is the clearest: the rules say where an action SHALL BE COMMENCED and
   * nothing anywhere says how to fix having commenced it in the wrong place.
   *
   * Lumping those in with `needs-human` was wrong in a way that mattered. It
   * implied a person could sit down, work harder and write the block — and
   * they cannot, because the material does not exist. It also meant a user in
   * that position got NOTHING from us, when what they need is the truth: here
   * is what the rules do say, we cannot tell you the rest, here is who can.
   *
   * These blocks ARE publishable. The fixed wording states no law and makes no
   * promise; the sourced fragments around it are the sentences that passed
   * verification. What distinguishes this from a failure is that its emptiness
   * is deliberate and declared.
   */
  | {
      status: "no-source";
      recordedAt: string;
      attempts: number;
      verdicts: SentenceVerdict[];
      /** Which sections had no source, so a reviewer can confirm the gap is real. */
      sectionsWithoutSource: string[];
    };

export type StageAnswer = {
  id: string;
  stageId: string;
  /** Copied from the stage map so the block and the taxonomy cannot drift. */
  userQuestion: string;

  whatsHappening: string;
  whatToDoNext: string;
  yourDeadline: string | null;
  whatHappensAfter: string;

  slots: Slot[];
  citations: RuleCitation[];
  /**
   * Corpus sources the verifier actually found supporting text in.
   *
   * *** WHY THIS EXISTS SEPARATELY FROM `citations` ***
   *
   * `citations` comes from the stage map: the provisions we expect the block
   * to rest on. This records what it TURNED OUT to rest on, which is not the
   * same thing and is the honest answer to "where did this sentence come
   * from".
   *
   * It was added because the suite caught a block marked verified-draft with
   * no citations at all. Everything in it was supported — by an official court
   * guide rather than by a rule, because the stage map lists no rules for
   * "I won but they are not paying". The content was fine; the provenance
   * record was silently empty, which is worse than wrong because it looks like
   * nothing is missing.
   */
  sourceIds: string[];
  verification: VerificationRecord;
};

/**
 * The deadline section, written by CODE from the stage map's own data.
 *
 * *** WHY THIS IS NO LONGER THE MODEL'S JOB ***
 *
 * The drafter was producing the deadline as a bare label — "14 days before the
 * settlement conference date", "20 days from the date of service" — and the
 * verifier rejected each one, correctly, as an incomplete statement. NINE of
 * the eighteen unfinished blocks were failing on it. The fault was mine: the
 * section is a label, and I was feeding it to a sentence-level verifier that
 * expects propositions.
 *
 * Patching the prose would have missed the better answer. A deadline is
 * already structured data in the stage map — the period, what it is for, the
 * event it runs from, the rule behind it, all authored by hand and every quote
 * checked against the vendored corpus. There is nothing for a model to add,
 * and a model is the last thing that should be near the most consequential
 * sentence in a block.
 *
 * So the deadline is rendered here, deterministically, and the same function
 * serves the runtime. That is the design principle applied where it matters
 * most: verified content assembled by code, not written by a model.
 */
/**
 * The Saturday warning, for deadlines a STATUTE sets rather than the rules.
 *
 * *** WHY THIS IS IN THE BLOCK AND NOT ONLY IN THE ENGINE ***
 *
 * `r. 1.02 (a)` makes every Saturday and Sunday a holiday, so a period under
 * the Small Claims rules that ends on a Saturday runs to the Monday. The
 * `Legislation Act s. 88 (2)` lists Sunday and NOT Saturday — so a period a
 * statute sets genuinely can end on a Saturday.
 *
 * The three pre-suit notice deadlines are statutory, and they are the only
 * deadlines in this product where missing it means there is no action at all.
 * Somebody reasoning "it lands on the weekend, so I have until Monday" — which
 * is what the rules would give them anywhere else in the same case — loses the
 * claim.
 *
 * So the warning travels with the deadline, not only inside the engine that
 * computes dates. A person reading "you have 10 days" needs to know that here,
 * unlike everywhere else, the weekend does not help them.
 */
/*
 * 2026-10-01 audit: the earlier wording ("Under the statute it does not -- only
 * Sunday and holidays are excluded. Do not assume a weekend gives you extra
 * time") left out Legislation Act s. 89 (2), which extends a time limit that
 * expires on a day the place for doing it is closed. Saturday is still not a
 * holiday under s. 88; it is the closed-office rule that can move the date.
 */
const STATUTORY_WEEKEND_WARNING =
  "This deadline is set by a statute, not by the court's rules, so the days are " +
  "counted under the Legislation Act, 2006. The day the time is counted from is " +
  "not itself counted (s. 89 (5)). If the last day is a Sunday or a " +
  "holiday, the deadline moves to the next day that is not a holiday (s. 89 (1)). " +
  "Saturday is not a holiday under that Act, so a Saturday does not by itself move " +
  "the deadline. A time limit for doing something at a place, such as filing at an " +
  "office, moves to the next day that place is open only if it is closed that day " +
  "during its regular hours (s. 89 (2)).";

export function renderDeadlineSection(
  deadlines: Array<{
    what: string;
    countFrom: string;
    length: { unit: "days" | "months" | "years"; count: number };
    direction?: "after" | "before";
    regime?: "small-claims-rules" | "legislation-act" | "civil-rules" | "family-rules";
    consequence?: "bars-the-claim" | "changes-what-happens-next";
    actor?: "reader" | "other-party" | "court";
    qualifier?: string;
  }>,
): string | null {
  // count === 0 marks a period the rule declines to fix — r. 11.06's "as soon
  // as is reasonably possible". Saying "you have 0 days" would be a lie, and a
  // frightening one.
  //
  // 2026-10-01: such a deadline used to render NOTHING, so "serve it forthwith"
  // and "as soon as reasonably possible" never reached the deadline section the
  // reader looks at first. It now renders its own words and qualifier, with no
  // number — still never "0 days".
  const fixed = deadlines.filter((deadline) => deadline.length.count > 0);
  if (deadlines.length === 0) return null;

  return deadlines
    .map((deadline) => {
      if (deadline.length.count === 0) {
        return `${deadline.what}.${deadline.qualifier ? ` ${deadline.qualifier}` : ""}`;
      }
      const period = `${deadline.length.count} ${
        deadline.length.count === 1
          ? deadline.length.unit.replace(/s$/, "")
          : deadline.length.unit
      }`;

      // A backwards clock reads nothing like a forwards one. "Within 14 days
      // of the conference" is the opposite of what r. 13.03 (2) requires.
      const qualifier = deadline.qualifier ? ` ${deadline.qualifier}` : "";
      if (deadline.direction === "before") {
        const event = deadline.countFrom.replace(/,?\s*counting backwards\.?$/i, "");
        return `${deadline.what}. Do this at least ${period} before ${event}.${qualifier}`;
      }

      // Whose clock it is decides the sentence (2026-10-01 audit). "You have 90
      // days" for the court's own timetable read as the reader's deadline.
      if (deadline.actor === "court") {
        return `${deadline.what} within ${period} after ${deadline.countFrom}. This is the court's timetable, not a step you take.${qualifier}`;
      }
      if (deadline.actor === "other-party") {
        return `${deadline.what}. They have ${period}, counted from ${deadline.countFrom}.${qualifier}`;
      }

      return `${deadline.what}. You have ${period}, counted from ${deadline.countFrom}.${qualifier}`;
    })
    .join("\n\n")
    .concat(weekendWarningFor(fixed));
}

/**
 * Appended once, and only where a STATUTORY deadline is the one that bars the
 * claim.
 *
 * Only for those. On every other deadline in the product a Saturday genuinely
 * does move to the Monday, so attaching this everywhere would be wrong in the
 * opposite direction — and a warning on every deadline is a warning nobody
 * reads.
 */
function weekendWarningFor(
  deadlines: Array<{ regime?: string; consequence?: string }>,
): string {
  const statutoryBar = deadlines.some(
    (deadline) =>
      deadline.regime === "legislation-act" && deadline.consequence === "bars-the-claim",
  );
  const civil = deadlines.some((deadline) => deadline.regime === "civil-rules");
  const family = deadlines.some((deadline) => deadline.regime === "family-rules");
  return (
    (statutoryBar ? `\n\n${STATUTORY_WEEKEND_WARNING}` : "") +
    (civil ? `\n\n${CIVIL_RULES_COUNTING}` : "") +
    (family ? `\n\n${FAMILY_RULES_COUNTING}` : "")
  );
}

/*
 * 2026-10-01, with the civil and family maps. The only counting paragraph was
 * the Legislation Act one, which says a Saturday does NOT move a deadline —
 * the opposite of the court rules, where Saturday is a holiday. A civil or
 * family reader needs their own court's rule, stated once.
 */
const CIVIL_RULES_COUNTING =
  "Times set by the Rules of Civil Procedure are counted under those rules. The first day " +
  "is not counted. If a time counted forward ends on a Saturday, Sunday or holiday, it " +
  "ends on the next day that is not a holiday (r. 3.01 (1) (c)). For a time that must be " +
  "met a number of days before a date, the safe course is to act by the last day before it " +
  "that is not a holiday. For a period of seven " +
  "days or less, holidays are not counted at all (r. 3.01 (1) (b)). Except for the " +
  "document that starts a case, a document served after 4 p.m. or on a holiday counts as " +
  "served on the next day that is not a holiday (r. 3.01 (1) (d)). Times set by a statute " +
  "are counted differently, as stated beside them.";

const FAMILY_RULES_COUNTING =
  "Times set by the Family Law Rules are counted under those rules. The first day is the " +
  "day after the event (r. 3 (1)). If the last day of a period falls on a day court " +
  "offices are closed, the period ends on the next day they are open (r. 3 (3)). For a " +
  "time that must be met a number of days before a date, the rules do not clearly say how " +
  "this applies, so the safe course is to act by the last open day before it. For a period of less than " +
  "seven days, Saturdays, Sundays and other days when all court offices are closed are not " +
  "counted (r. 3 (2)). Times set by a statute are counted differently, as stated beside " +
  "them.";

/** The prose a user reads, in order. Used by the readability and guard checks. */
/**
 * The four prose fields, which is all `answerText` reads.
 *
 * Widened from `StageAnswer` so a stage-INDEPENDENT block
 * (`genericAnswers.ts`) can go through the identical gates. The narrower type was
 * not protecting anything here: this function never touches `stageId`, `id`,
 * `userQuestion` or `slots`, so requiring them only forced a caller to either
 * fabricate them or get its own copy of the gates — and a second copy of a gate is
 * a second chance to be weaker.
 */
export type AnswerProse = {
  whatsHappening: string;
  whatToDoNext: string;
  yourDeadline: string | null;
  whatHappensAfter: string;
};

export function answerText(answer: AnswerProse): string {
  return [
    answer.whatsHappening,
    answer.whatToDoNext,
    answer.yourDeadline ?? "",
    answer.whatHappensAfter,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Fixed wording for a stage the rules do not cover.
 *
 * Written by hand, not by a model, and it states no law — which is the point.
 * It is what honesty looks like when the sources run out, and it is better
 * than the alternatives: silence, or plausible prose about a procedure nobody
 * can point to.
 */
export const NO_SOURCE_NOTICE =
  "We don't have verified guidance for this step yet. The court office where your " +
  "case is filed can tell you what to do in your situation, and the services below " +
  "can help you work out where you stand.";

/*
 * *** WHY THIS WORDING CHANGED ***
 *
 * It used to read "The rules do not set out a step for this." That is a LEGAL
 * CLAIM — an assertion about what the law contains — and it is exactly the
 * claim this pipeline cannot verify. Nothing in the corpus can prove an
 * absence; you can only fail to find something.
 *
 * And we were wrong about it twice, in the worst possible direction. An
 * independent review found `both:missed-trial` saying it while r. 17.01 (4)
 * and (5) — five lines below the rule the stage cited — gave a set-aside
 * remedy on a 30-day clock. It found the same claim in a code comment about
 * `both:filed-in-wrong-place`, where r. 6.01 (2) and (3) are the remedy.
 *
 * Both times the rules DID set out a step and our citation list stopped short.
 * A person reading the old wording would have concluded there was nothing to
 * be done, which is the most damaging thing this product could tell them.
 *
 * "We don't have verified guidance for this yet" is a claim about US, and it is
 * one we can actually stand behind.
 */

/**
 * Only these may be shown to a user.
 *
 * `no-source` is included deliberately: it carries the sourced fragments that
 * DID verify plus fixed wording saying the rest is not written down. A person
 * in that position is better served by that than by an empty screen.
 * `needs-human` and `draft` are not shown — those are blocks we could write
 * and have not finished.
 */
export const RENDERABLE_STATUSES = ["verified-draft", "approved", "no-source"] as const;

export function isRenderable(answer: StageAnswer): boolean {
  return (RENDERABLE_STATUSES as readonly string[]).includes(answer.verification.status);
}

/**
 * Fills a verified template with the user's own facts.
 *
 * Deliberately dumb: exact `{slotName}` replacement, no formatting decisions,
 * no fallback prose. A missing value throws rather than rendering a sentence
 * with a hole in it, because a procedural instruction with a blank where the
 * date should be is worse than no instruction.
 */
export function fillSlots(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = values[name];
    if (value === undefined || value === "") {
      throw new Error(`no value for slot "${name}" — refusing to render a partial instruction`);
    }
    return value;
  });
}

/** Slot names a template actually uses. */
export function slotsUsed(template: string): string[] {
  return Array.from(new Set(Array.from(template.matchAll(/\{(\w+)\}/g), (m) => m[1])));
}
