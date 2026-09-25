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
export function renderStageAnswer(
  stageId: string,
  facts: Record<string, string> = {},
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

    sections.push({ heading, text: needed.length > 0 ? fillSlots(approved, facts) : approved });
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
    release: { runId: PUBLISHED_RELEASE.runId, promotedAt: PUBLISHED_RELEASE.promotedAt },
  };
}
