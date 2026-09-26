/**
 * The only way a stage answer reaches a user.
 *
 * *** WHY THERE IS EXACTLY ONE DOOR ***
 *
 * The audit that started this work found the output guard had two call sites
 * while the report described it as "the load-bearing control". A control that
 * everything is supposed to pass through, and that most things do not, is not
 * a control.
 *
 * So there is one function. It reads from the published library, refuses
 * anything not in it, passes every section through the guard, and returns a
 * structure a component renders without deciding anything. A renderer that
 * wants to show a stage answer has nowhere else to get one.
 *
 * *** WHAT IT REFUSES, AND WHY IT FAILS QUIET ***
 *
 *   a stage with no published block   -> nothing, and the caller shows UNKNOWN
 *   a block the guard rejects         -> that section is dropped
 *   every section dropped             -> nothing
 *
 * It returns rather than throws, because a blocked string on a render path
 * should leave a gap, not a stack trace in the middle of somebody's case. The
 * failure mode has to be "we showed less", never "the page broke" — which is
 * also why a dropped section is logged loudly to the console where we see it
 * and the user does not.
 */

import { assertApprovedUserContent } from "./outputGuard";
import { publishedBlockFor, PUBLISHED_RELEASE } from "./publishedLibrary";
import { fillSlots, slotsUsed, type StageAnswer } from "./stageAnswers";
import { OFFICIAL_URLS, SOURCE_NAMES } from "../case-system/stage-map/citations";
import { findStage } from "../case-system/stage-map/stageMap";
import { SCOPE_CONFIDENCE_FLOOR } from "../case-system/stage-map/resolveCasePosition";
import type { CaseDates } from "../case-system/deadlines/deadlineEvents";
import { computedDeadlinesFor, computedDeadlineProse, type ComputedDeadline } from "./computedDeadline";

export type RenderedSection = {
  heading: string;
  text: string;
};

export type RenderedSource = {
  name: string;
  pinpoint: string;
  url: string;
};

export type RenderedStageAnswer = {
  stageId: string;
  /** The question this answers, shown as the heading. */
  question: string;
  sections: RenderedSection[];
  sources: RenderedSource[];
  /**
   * Shown to the user. `no-source` blocks are honest about being incomplete,
   * and hiding that would defeat the point of having the status.
   */
  status: "verified-draft" | "no-source" | "approved";
  /**
   * The dates that could be computed, structured, with the provision behind
   * each step.
   *
   * The same content is already in the deadline section as prose, because a
   * caller that renders only `sections` must not silently lose the date. This
   * is here so a renderer can show the working as a list with a link to each
   * rule instead of a paragraph — the difference between "here is your date"
   * and "here is your date and here is how to check it".
   */
  computed: ComputedDeadline[];
  /** Provenance, for the footer a regulator or a curious user can read. */
  release: { runId: string; promotedAt: string };
};

const HEADINGS: Array<[keyof StageAnswer, string]> = [
  ["whatsHappening", "Where things stand"],
  ["whatToDoNext", "What to do next"],
  ["yourDeadline", "Your deadline"],
  ["whatHappensAfter", "What happens after"],
];

/**
 * Renders the published answer for a stage, or null if there is not one.
 *
 * `facts` fills the typed slots in a verified template. Filling is done by
 * CODE, after the template has passed the guard — never before, and never by
 * a model. A guard that checked a filled sentence would be approving one
 * user's sentence and no other.
 */
/**
 * What the scope classifier concluded, for the stages that require it.
 *
 * `null` means no scope call was made — which is itself a refusal for any stage
 * carrying `requiresAffirmativeScope`. A caller that cannot say whether the
 * matter is in scope has not established that it is.
 */
export type ScopeVerdict = {
  primaryPath: string;
  confidence: number;
} | null;

/**
 * Why a block was refused, when it was.
 *
 * Returned rather than logged-and-dropped, because two of these refusals have
 * something the reader should be given INSTEAD — a question, and a more general
 * block — and a render door that only says "no" cannot offer either.
 */
export type RenderRefusal =
  | { reason: "not-published" }
  | { reason: "unservable-status"; status: string }
  | { reason: "scope-not-established"; scope: ScopeVerdict }
  | {
      reason: "fact-not-confirmed";
      /** Asked verbatim. From the stage map, never model-written. */
      question: string;
      /** The block to show meanwhile, where the stage records one. */
      generalAlternative: string | null;
    };

export type RenderOutcome =
  | { kind: "rendered"; answer: RenderedStageAnswer }
  | { kind: "refused"; refusal: RenderRefusal };

/**
 * The refusing version of `renderStageAnswer`, for callers that can act on WHY.
 *
 * *** THE TWO GATES THAT LIVE HERE AND NOT IN THE CALLER ***
 *
 * Both were put at the render door on purpose: this is the only way a stage
 * answer reaches a user, so a gate here holds for every caller — the route, the
 * chat, the eval, and whatever is added next. A gate in the route would have to
 * be remembered in the chat.
 *
 * 1. THE FORUM GATE. A stage marked `requiresAffirmativeScope` renders only where
 *    the classifier affirmatively said "small-claims". Not "did not say
 *    out-of-scope" — said it. See the field's comment in stageMap.ts for why this
 *    is per-stage: the criminal-complaint story came back as "civil", which is
 *    affirmative, while the municipal-notice story came back "unknown" and must
 *    still reach its block.
 *
 * 2. THE HIGH-STAKES AMBIGUITY RULE. A stage marked `requiresConfirmedFact`
 *    renders only where that fact came FROM THE USER. The model may not supply
 *    it. Asked about "a city sidewalk" the chat returned the City of Toronto
 *    block, and s. 42 (6) names the Toronto city clerk while every other
 *    municipality is s. 44 (10) and a different clerk.
 */
export function renderStageAnswerOrRefuse(
  stageId: string,
  facts: Record<string, string> = {},
  dates: CaseDates = {},
  scope: ScopeVerdict = null,
): RenderOutcome {
  const stage = findStage(stageId);

  if (stage?.requiresAffirmativeScope) {
    const established =
      scope !== null &&
      scope.primaryPath === "small-claims" &&
      scope.confidence >= SCOPE_CONFIDENCE_FLOOR;

    if (!established) {
      console.error(
        `[stageAnswerView] refused ${stageId}: scope not established ` +
          `(${scope ? `${scope.primaryPath} @ ${scope.confidence}` : "no scope call"})`,
      );
      return { kind: "refused", refusal: { reason: "scope-not-established", scope } };
    }
  }

  const required = stage?.requiresConfirmedFact;
  if (required && !facts[required.key]) {
    console.error(`[stageAnswerView] refused ${stageId}: "${required.key}" not confirmed`);
    return {
      kind: "refused",
      refusal: {
        reason: "fact-not-confirmed",
        question: required.question,
        generalAlternative: required.generalAlternative ?? null,
      },
    };
  }

  const answer = renderPublishedBlock(stageId, facts, dates);
  return answer
    ? { kind: "rendered", answer }
    : { kind: "refused", refusal: { reason: "not-published" } };
}

/**
 * Renders the published answer for a stage, or null if there is not one.
 *
 * The convenience wrapper over `renderStageAnswerOrRefuse`. Passes the scope
 * verdict through, so the forum gate applies to this door too — a caller cannot
 * evade it by choosing the simpler function.
 */
export function renderStageAnswer(
  stageId: string,
  facts: Record<string, string> = {},
  dates: CaseDates = {},
  scope: ScopeVerdict = null,
): RenderedStageAnswer | null {
  const outcome = renderStageAnswerOrRefuse(stageId, facts, dates, scope);
  return outcome.kind === "rendered" ? outcome.answer : null;
}

function renderPublishedBlock(
  stageId: string,
  facts: Record<string, string>,
  dates: CaseDates,
): RenderedStageAnswer | null {
  const block = publishedBlockFor(stageId);
  if (!block) return null;

  const status = block.verification.status;
  if (status !== "verified-draft" && status !== "no-source" && status !== ("approved" as string)) {
    // needs-human and draft are not servable. Reaching here means something
    // promoted a block it should not have; refuse rather than trust it.
    console.error(`[stageAnswerView] refused a "${status}" block for ${stageId}`);
    return null;
  }

  /*
   * What can be computed from the dates we were given, before any section is
   * built, so the deadline section can carry it and the structured form can go
   * back with the answer.
   *
   * `findStage` rather than the block: the deadlines are stage-map data, hand
   * authored, every quote checked by test:stage-map. The block's deadline text
   * is rendered FROM that data, so reading the periods back out of the prose
   * would be parsing our own output.
   */
  const stage = findStage(stageId);
  const computed = stage
    ? computedDeadlinesFor(stage.deadlines, dates, `stageAnswerView:${stageId}`)
    : [];

  const sections: RenderedSection[] = [];

  for (const [field, heading] of HEADINGS) {
    const raw = block[field];
    if (typeof raw !== "string" || !raw) continue;

    // GUARD THE TEMPLATE, THEN FILL. Never the other way round.
    const approved = assertApprovedUserContent(raw, `stageAnswerView:${stageId}:${String(field)}`);
    if (!approved) continue;

    const needed = slotsUsed(approved);
    if (needed.some((slot) => !facts[slot])) {
      /*
       * A template whose values are missing is dropped, not rendered with a
       * hole. "Serve the claim by {date}" with no date is worse than silence:
       * it looks like guidance and tells the reader nothing.
       */
      console.error(
        `[stageAnswerView] dropped ${stageId}:${String(field)} — no value for ${needed
          .filter((slot) => !facts[slot])
          .join(", ")}`,
      );
      continue;
    }

    const filled = needed.length > 0 ? fillSlots(approved, facts) : approved;

    /*
     * *** THE COMPUTED DATE GOES HERE, AND NOWHERE ELSE ***
     *
     * The period text above is a published block section. The promotion gate
     * requires it byte-identical to what `renderDeadlineSection` produces from
     * the stage map, which is what stops the most consequential sentence in a
     * block from drifting. So the computed date is APPENDED to it at render
     * time rather than woven into it: the reviewed words are untouched, and
     * what follows them is a set of separately reviewed templates filled with
     * this reader's own dates.
     *
     * Order matters. The period comes first because it is true for everybody
     * and it is what the rule says. The date comes second because it depends on
     * a date the reader gave us, which may be wrong.
     */
    if (field === "yourDeadline" && computed.length > 0) {
      const prose = computedDeadlineProse(computed, `stageAnswerView:${stageId}`);
      sections.push({ heading, text: prose ? `${filled}\n\n${prose}` : filled });
      continue;
    }

    sections.push({ heading, text: filled });
  }

  if (sections.length === 0) return null;

  return {
    stageId,
    question: block.userQuestion,
    sections,
    sources: block.citations.map((citation) => ({
      name: SOURCE_NAMES[citation.sourceId],
      pinpoint: citation.pinpoint,
      url: OFFICIAL_URLS[citation.sourceId],
    })),
    status: status as RenderedStageAnswer["status"],
    computed,
    release: { runId: PUBLISHED_RELEASE.runId, promotedAt: PUBLISHED_RELEASE.promotedAt },
  };
}
