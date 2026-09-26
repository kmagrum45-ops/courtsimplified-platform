/**
 * CHAT ITEM 6 — turning a selection into the thing a person reads.
 *
 * Kept apart from `libraryChat.ts` on purpose. That file talks to a model; this
 * one never does, and every word it produces comes from the published library or
 * from a fixed constant. So the suite can drive this with any selection a model
 * could return, including the ones it should never return, without spending a
 * call or depending on what a model says today.
 *
 * *** THE ORDER IS NOT COSMETIC ***
 *
 *   1. the deflection, when the question asked for advice
 *   2. the blocks
 *   3. the clarifying questions
 *   4. the referrals, when there is nothing else
 *
 * The deflection comes FIRST because a person who asked "will I win" and is
 * shown two screens of procedure followed by a note that we cannot answer has
 * been answered in form and ignored in substance. It comes ALONGSIDE the blocks,
 * never instead of them, for the reason the stage route already records:
 * withholding the procedural content because the question was badly framed
 * punishes somebody for not knowing what kind of question to ask.
 */

import {
  renderStageAnswer,
  type RenderedStageAnswer,
  type ScopeVerdict,
} from "../../content-library/stageAnswerView";
import {
  CHAT_NO_MATCH_MESSAGE,
  DEFLECTION_MESSAGE,
  REFERRAL_RESOURCES,
  type ReferralResource,
} from "../../content-library/referralResources";
import type { CaseDates } from "../deadlines/deadlineEvents";
import { clarifyingQuestionCatalogue, type ChatSelection } from "./libraryChat";

export type ChatAnswer = {
  intent: ChatSelection["intent"];
  /**
   * Set when the question itself cannot be answered with information. The words
   * are fixed; the model only ever set a boolean.
   */
  cannotAnswer: string | null;
  /** The published blocks, rendered and guarded. May be empty. */
  answers: RenderedStageAnswer[];
  /** Recorded boundaries from the stage map. Never model-written. */
  clarifyingQuestions: string[];
  /** Set when nothing in the library answers the question. */
  noMatch: string | null;
  referrals: readonly ReferralResource[];
};

/**
 * Assembles the answer. No model, no network, no prose of its own.
 *
 * `dates` flows through to `renderStageAnswer` so a chat answer shows the same
 * computed deadline the stage route would — a person should not get a different
 * date because they asked in a different place.
 */
/**
 * Assembles the answer in a fixed order, in code.
 *
 * *** THE COMPOSITION RULE: DEFLECTING NEVER SUPPRESSES GUIDANCE ***
 *
 *   1. the deflection, when the question asked for advice
 *   2. THE READER'S CURRENT STAGE BLOCK, where the resolver placed them and we
 *      have published content for it
 *   3. the blocks the router selected
 *
 * Item 2 is the addition, and it exists because of a measured failure: "Do you
 * think I'll win this?" from somebody who said they were served two weeks ago came
 * back with the deflection and NO BLOCK. The deflection was right. Dropping the
 * block was not — they did not see that a twenty-day defence period was running,
 * and that is the single most consequential thing we could have told them.
 *
 * The model caused it by collapsing "be careful here" into all three signals at
 * once. Rather than ask it again not to, the stage comes from the STAGE RESOLVER,
 * which is a different call with a different job and got that case right every
 * time. The chat router no longer has the power to suppress it.
 *
 * De-duplicated: where the router selected the same stage the resolver found, it
 * appears once.
 */
export function assembleChatAnswer(
  selection: ChatSelection,
  dates: CaseDates = {},
  /**
   * Where the stage resolver placed this reader, if a case context was given.
   * Rendered FIRST, and independently of anything the chat router decided.
   */
  currentStage: { stageId: string; scope: ScopeVerdict } | null = null,
  facts: Record<string, string> = {},
): ChatAnswer {
  const questions = new Map(
    clarifyingQuestionCatalogue().map((entry) => [entry.id, entry.question]),
  );

  const answers: RenderedStageAnswer[] = [];
  const shown = new Set<string>();

  /*
   * The reader's own position first, before anything the router chose. It goes
   * through the same render door, so the forum gate and the high-stakes
   * ambiguity rule apply to it exactly as they do to everything else.
   */
  if (currentStage) {
    const rendered = renderStageAnswer(
      currentStage.stageId,
      facts,
      dates,
      currentStage.scope,
    );
    if (rendered) {
      answers.push(rendered);
      shown.add(currentStage.stageId);
    }
  }

  /*
   * Router-selected blocks are rendered against THE SAME scope verdict, where
   * one exists.
   *
   * Not null. The verdict came from `classifyCourtPath` on this reader's case
   * context, and it is exactly as applicable to a block the router chose as to
   * the one the resolver found — withholding it would mean the chat could never
   * show a gated stage even when scope had been properly established.
   *
   * Where there is NO case context there is no verdict, and a gated stage stays
   * refused. That is the forum gate working: a question typed with no case
   * behind it has not established which court this is.
   */
  const scope = currentStage?.scope ?? null;

  for (const stageId of selection.blockIds) {
    if (shown.has(stageId)) continue;
    const rendered = renderStageAnswer(stageId, facts, dates, scope);
    /*
     * A block that renders nothing is skipped rather than reported.
     *
     * It reaches here only if the guard refused every section — which is logged
     * loudly by the renderer where we can see it, and which must not become a
     * gap in the middle of somebody's answer. If every block goes this way the
     * no-match line below covers it, so the reader is never left with silence.
     */
    if (rendered) {
      answers.push(rendered);
      shown.add(stageId);
    }
  }

  const clarifyingQuestions = selection.clarifyingQuestionIds
    .map((id) => questions.get(id))
    .filter((question): question is string => Boolean(question));

  const nothingToShow = answers.length === 0;

  return {
    intent: selection.intent,
    cannotAnswer: selection.requestsLegalAdvice ? DEFLECTION_MESSAGE : null,
    answers,
    clarifyingQuestions,
    noMatch: nothingToShow ? CHAT_NO_MATCH_MESSAGE : null,
    /*
     * Referrals ride with the two outcomes where we are telling somebody we
     * cannot help them with what they asked. Attaching them to every answer
     * would make them furniture, and furniture is not read.
     */
    referrals:
      nothingToShow || selection.requestsLegalAdvice ? REFERRAL_RESOURCES : [],
  };
}
