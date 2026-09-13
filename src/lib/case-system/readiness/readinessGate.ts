/**
 * The Statement of Claim readiness gate.
 *
 * Built from docs/STATEMENT_OF_CLAIM_READINESS_DESIGN.md section 8.
 *
 * ---------------------------------------------------------------------------
 * API COST: ZERO. This module makes no model call, and none is needed.
 * ---------------------------------------------------------------------------
 *
 * Every input already exists by the time the gate runs:
 *   - the confirmed claim type   -> established at turn 1 (orchestrateIntakeTurn)
 *   - the element state map      -> produced by the depth layer
 *   - remedy options             -> claimType.remedies, sourced data
 *   - outstanding-item copy      -> the element's own name /
 *                                   plainExplanation / evidenceCategories
 *   - the gate decision itself   -> boolean logic over the above
 *
 * So a journey stays at roughly 27 calls. Nothing here changes that.
 *
 * A voice lead-in over each attestation prompt was considered and deliberately
 * NOT added: it would cost one call per outstanding element, and the copy is
 * already the claim type's own reviewed words. Paying a model to rephrase
 * sourced legal content would be both expensive and worse.
 *
 * ---------------------------------------------------------------------------
 * THE THREE CONSTRAINTS, stated here because they are the whole design
 * ---------------------------------------------------------------------------
 *
 * 1. THE GATE REPORTS WHAT IS RECORDED, NEVER WHETHER IT IS ENOUGH.
 *    It checks whether the user has ANSWERED, never whether the answer is
 *    GOOD ENOUGH. There is no code path here that inspects the CONTENT of what
 *    a user supplied — only whether a state was recorded. That is what keeps it
 *    on the information side of CLAUDE.md section 2's "who does the applying"
 *    test: the gate states what the claim type generally involves; the user
 *    decides whether their facts fit.
 *
 * 2. `cannot-provide` RESOLVES. It opens the gate.
 *    Only `not-yet` — the absence of an answer — holds it. A user is never
 *    blocked by a fact about their case, only by a question they have not yet
 *    reached. Without this, adding deeper questions would only create more ways
 *    to be stuck, and a feature meant to improve drafts would make them harder
 *    to reach.
 *
 * 3. NO SCORE, NO PERCENTAGE, NO ORDINAL LABEL.
 *    Session 48 found SIX risk-weighted score formulas that survived earlier
 *    name-based removal passes — including one spelled `confidence` and one
 *    that was an unnamed expression (see docs/OUTSTANDING_ISSUES.md section 11).
 *    This module authors no seventh. Counting is permitted and scoring is not:
 *    "3 of 5 items still to add" is a fact about the case file; a completion
 *    percentage over legal elements reads as a readiness score, which CLAUDE.md
 *    section 3 bars. `outstandingCount` below is a count and nothing derives a
 *    ratio, grade or ladder from it.
 */

import type { ClaimType, PlaintiffElement } from "../intake/claimTypes";
import { REMEDY_TYPES } from "../intake/remedyTypes";
import type { ElementStateMap } from "../intake/depth/elementStateMap";

/**
 * Why the gate is holding. Each reason is a factual absence, never a judgment
 * about the user's case.
 */
export type GateBlocker =
  | { kind: "no-confirmed-claim-type" }
  | { kind: "no-remedy-confirmed" }
  | { kind: "no-story-entered" }
  | { kind: "elements-not-yet"; elementIds: string[] };

/**
 * One element the user has not answered either way.
 *
 * Every field is the claim type's OWN sourced content. Nothing is authored per
 * claim type here, so this renders correctly for claim type 50 on the day it
 * is added.
 */
export type OutstandingElement = {
  elementId: string;
  /** The element's own name, shown verbatim. */
  name: string;
  /** The element's own plainExplanation — generic framing, not about this case. */
  plainExplanation: string;
  /** Rendered as "things that often help", never as a requirement. */
  thingsThatOftenHelp: { name: string; why: string; examples: string[] }[];
  /** The element's citation, so the user can read the source themselves. */
  sourceUrl: string;
};

/** A remedy the user may confirm. Seeded from data, never auto-applied. */
export type RemedyOption = {
  id: string;
  title: string;
  plainExplanation: string;
};

export type ReadinessGateInput = {
  /** Null when no claim type was confirmed — condition 1 fails. */
  claimType: ClaimType | null;
  /** Produced by the depth layer. The SAME map, not a second copy. */
  elementStateMap: ElementStateMap;
  /** The remedy id the user affirmatively confirmed, if any (design section 2). */
  confirmedRemedyId: string | null;
  /** The user's own narrative. Non-empty satisfies condition 4. */
  storyText: string;
};

export type ReadinessGateResult = {
  /** True when the draft may be produced. */
  draftAvailable: boolean;
  blockers: GateBlocker[];
  /** Elements in `not-yet`, in the claim type's own order. */
  outstanding: OutstandingElement[];
  /**
   * How many elements are still unanswered. A COUNT, not a score.
   * Nothing derives a percentage, ratio or grade from it — see constraint 3.
   */
  outstandingCount: number;
  /** Total elements, so a caller can render "3 of 5 items still to add". */
  totalElements: number;
  /**
   * Elements the user said they cannot supply. These do NOT hold the gate.
   * Surfaced so the draft can mark them — a substantive gap should be visible
   * in the document, not only in the UI that produced it (design section 4).
   */
  cannotProvide: { elementId: string; name: string }[];
  /** Remedy options to confirm, seeded from the claim type's own `remedies`. */
  remedyOptions: RemedyOption[];
};

export function evaluateReadinessGate(input: ReadinessGateInput): ReadinessGateResult {
  const blockers: GateBlocker[] = [];

  // Condition 1. Without a confirmed claim type there are no elements and no
  // gate. Returns early rather than guessing at a claim type.
  if (!input.claimType) {
    return {
      draftAvailable: false,
      blockers: [{ kind: "no-confirmed-claim-type" }],
      outstanding: [],
      outstandingCount: 0,
      totalElements: 0,
      cannotProvide: [],
      remedyOptions: [],
    };
  }

  const elements = input.claimType.plaintiffElements;

  // Condition 3. Seeded from the claim type's own data; the user confirms.
  // Never inferred — the remedy appears in the draft's relief sought, and
  // attributing an unchosen remedy to the user in a court document would be
  // deciding for them (CLAUDE.md section 4).
  const remedyOptions = buildRemedyOptions(input.claimType);

  if (!input.confirmedRemedyId) {
    blockers.push({ kind: "no-remedy-confirmed" });
  }

  // Condition 4.
  if (input.storyText.trim().length === 0) {
    blockers.push({ kind: "no-story-entered" });
  }

  // Condition 5. ONLY `not-yet` holds. See constraint 2 in the file header.
  const notYet: PlaintiffElement[] = [];
  const cannotProvide: { elementId: string; name: string }[] = [];

  for (const element of elements) {
    const record = input.elementStateMap[element.id];

    // An element with no record at all has never been reached, which is
    // `not-yet` by definition. Treating a missing record as resolved would
    // open the gate on elements the user never saw.
    const state = record?.state ?? "not-yet";

    if (state === "not-yet") {
      notYet.push(element);
    } else if (state === "cannot-provide") {
      cannotProvide.push({ elementId: element.id, name: element.name });
    }
    // `provided` needs no entry: it neither holds the gate nor marks the draft.
  }

  if (notYet.length > 0) {
    blockers.push({ kind: "elements-not-yet", elementIds: notYet.map((element) => element.id) });
  }

  return {
    draftAvailable: blockers.length === 0,
    blockers,
    outstanding: notYet.map(toOutstandingElement),
    outstandingCount: notYet.length,
    totalElements: elements.length,
    cannotProvide,
    remedyOptions,
  };
}

/**
 * Builds the outstanding-item view from the element's OWN sourced content.
 *
 * Deliberately a straight copy with no editorialising. The moment this starts
 * rewording plainExplanation, the generic framing ("claims like this one
 * generally involve...") can drift into the specific ("your claim requires..."),
 * and that drift is the whole of CLAUDE.md section 2.
 */
function toOutstandingElement(element: PlaintiffElement): OutstandingElement {
  return {
    elementId: element.id,
    name: element.name,
    plainExplanation: element.plainExplanation,
    thingsThatOftenHelp: element.evidenceCategories.map((category) => ({
      name: category.name,
      why: category.why,
      examples: category.examples,
    })),
    sourceUrl: element.sourceUrl,
  };
}

function buildRemedyOptions(claimType: ClaimType): RemedyOption[] {
  return claimType.remedies
    .map((remedyId) => REMEDY_TYPES.find((remedy) => remedy.id === remedyId))
    .filter((remedy): remedy is (typeof REMEDY_TYPES)[number] => Boolean(remedy))
    // Same convention as the question bank: only reviewed content is shown.
    .filter((remedy) => remedy.status === "reviewed")
    .map((remedy) => ({
      id: remedy.id,
      title: remedy.title,
      plainExplanation: remedy.plainExplanation,
    }));
}

/**
 * The user-facing heading for an outstanding element.
 *
 * "Still to add" states what is not in the case file. It does not say the user
 * lacks something, cannot prove something, or is missing something they need —
 * all of which would characterise their position rather than their file.
 */
export function outstandingHeading(element: OutstandingElement): string {
  return `Still to add: "${element.name}"`;
}
