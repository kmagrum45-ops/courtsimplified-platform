/**
 * Derives the facts `deriveCaseStage` reads from confirmed events.
 *
 * COSTS NOTHING. Pure functions over live event rows.
 *
 * WHY THIS EXISTS. `deriveCaseStage` takes `claimFiled`, `claimServed` and
 * `defenceFiled` from `IntakeFacts` — answers the user gave once, during
 * intake, which then never move. A user who comes back and records "defence
 * filed" changes what is true about their case, and the stage should follow.
 *
 * EVENTS WIN OVER INTAKE ANSWERS, and only in one direction. A recorded event
 * can turn a fact from unknown or false to TRUE, because the user has since
 * told us the thing happened. It can never turn a fact false: the absence of a
 * recorded event is not evidence the step did not happen — most users will
 * record a few events, not all of them. Treating absence as a negative would
 * mean a user who records only their defence silently "un-files" their claim.
 *
 * NOTHING HERE DECIDES A STAGE. It produces facts; `deriveCaseStage` maps facts
 * to a stage and returns `basis[]` so the user can see why.
 */

import {
  deriveCaseStage,
  type CaseStageDerivation,
} from "../intake/caseStageDerivation";
import type { IntakeFacts } from "../intake/selectQuestions";
import { liveCaseEvents, type CaseEventRow } from "./caseEventAdapter";
import { type CaseEventType } from "./caseEventTypes";

/** The three booleans `deriveCaseStage` reads, plus where each came from. */
export type StageFactsFromEvents = {
  claimFiled?: true;
  claimServed?: true;
  defenceFiled?: true;
  /**
   * Plain-language reasons, one per fact an event established. Merged into
   * deriveCaseStage's own basis[] so a user is never shown a stage change
   * without being told what moved it.
   */
  basis: string[];
};

const FACT_BY_EVENT_TYPE: Partial<
  Record<CaseEventType, { fact: "claimFiled" | "claimServed" | "defenceFiled"; reason: string }>
> = {
  "claim-filed": { fact: "claimFiled", reason: "you recorded that a claim was filed" },
  "claim-served": { fact: "claimServed", reason: "you recorded that the claim was served" },
  "defence-filed": { fact: "defenceFiled", reason: "you recorded that a defence was filed" },
};

/**
 * A recorded claim-served or defence-filed event implies the claim was filed.
 *
 * Grounded in the rules rather than in tidiness: r. 8.01 (1) serves "a
 * plaintiff's claim ... (Form 7A)", and r. 7.01 (1) is what brings that claim
 * into existence — "An action shall be commenced by filing a plaintiff's claim
 * (Form 7A) with the clerk". There is no claim to serve that was not filed.
 *
 * Recorded separately from the direct mapping so the basis line says it is an
 * implication, not something the user typed.
 */
const IMPLIES_CLAIM_FILED: CaseEventType[] = ["claim-served", "defence-filed"];

export function stageFactsFromEvents(rows: CaseEventRow[]): StageFactsFromEvents {
  const live = liveCaseEvents(rows);
  const facts: StageFactsFromEvents = { basis: [] };

  for (const event of live) {
    const mapping = FACT_BY_EVENT_TYPE[event.event_type as CaseEventType];
    if (!mapping || facts[mapping.fact]) continue;

    facts[mapping.fact] = true;
    facts.basis.push(mapping.reason);
  }

  if (!facts.claimFiled) {
    const implying = live.find((event) =>
      IMPLIES_CLAIM_FILED.includes(event.event_type as CaseEventType),
    );

    if (implying) {
      facts.claimFiled = true;
      facts.basis.push(
        "a claim must be filed before it can be served or defended (O. Reg. 258/98, r. 7.01 (1))",
      );
    }
  }

  return facts;
}

/**
 * Merge event-derived facts over intake answers.
 *
 * ONE-DIRECTIONAL, per the note at the top: an event can set a fact true and
 * can never set one false. Where intake said true and no event exists, the
 * intake answer stands — the user told us that too.
 */
export function mergeStageFacts<T extends Record<string, unknown>>(
  intakeFacts: T,
  fromEvents: StageFactsFromEvents,
): T & { claimFiled?: unknown; claimServed?: unknown; defenceFiled?: unknown } {
  return {
    ...intakeFacts,
    ...(fromEvents.claimFiled ? { claimFiled: true } : {}),
    ...(fromEvents.claimServed ? { claimServed: true } : {}),
    ...(fromEvents.defenceFiled ? { defenceFiled: true } : {}),
  };
}

/**
 * Stage derived from intake answers AND confirmed events, with a basis the user
 * can read.
 *
 * A wrapper rather than a change to `deriveCaseStage`, so that function keeps
 * its single responsibility and its existing callers and checks are untouched:
 * it maps facts to a stage, and knows nothing about where the facts came from.
 *
 * The event basis comes FIRST in the merged array. If a user's stage moved
 * because they recorded something, that is the thing they need to see, not the
 * intake answer that was already true.
 */
export function deriveCaseStageWithEvents(
  intakeFacts: IntakeFacts,
  rows: CaseEventRow[],
): CaseStageDerivation {
  const fromEvents = stageFactsFromEvents(rows);
  const derived = deriveCaseStage(mergeStageFacts(intakeFacts, fromEvents) as IntakeFacts);

  return {
    stage: derived.stage,
    basis: [...fromEvents.basis, ...derived.basis],
  };
}
