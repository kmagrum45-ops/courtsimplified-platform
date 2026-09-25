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

/** The prose a user reads, in order. Used by the readability and guard checks. */
export function answerText(answer: StageAnswer): string {
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
  "The rules do not set out a step for this. We would rather tell you that than " +
  "guess. The court office where your case is filed can tell you what to do in " +
  "your situation, and the services below can help you work out where you stand.";

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
