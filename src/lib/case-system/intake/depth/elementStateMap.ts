/**
 * ONE state map for claim-type elements, shared by the depth phase and the
 * readiness gate.
 *
 * LOAD-BEARING PROPERTY 3 (docs/CLAIM_TYPE_INTAKE_DEPTH_DESIGN.md section 5):
 * depth answers and attestation are one structure, not two that can disagree.
 * This module is that structure. The depth phase and the readiness gate are
 * both VIEWS over it; neither owns its own copy.
 *
 * Why that matters concretely, from the design: if the depth phase asks "who
 * else saw the post?" and the readiness section then separately asks "have you
 * got anything showing the statement reached someone else?", the user has been
 * asked the same thing twice in different words. Two structures make that
 * defect possible; one structure makes it unrepresentable.
 *
 * LOAD-BEARING PROPERTY 4: "I don't know" resolves to `cannot-provide`, which
 * is a RECORDED ABSENCE, not a gap. The readiness gate holds only on `not-yet`.
 * An unanswerable question therefore RESOLVES an element rather than blocking
 * it — without that link, adding deeper questions would only create more ways
 * to be stuck.
 *
 * Nothing here grades anything. `cannot-provide` records a fact about the
 * user's records, never a conclusion about their case (CLAUDE.md section 3).
 */

/**
 * The three states, and the only three. Deliberately NOT an ordinal ladder:
 * these are disjoint categories, not a scale, and no code may order or score
 * them. See docs/OUTSTANDING_ISSUES.md section 11 on ordinal grades.
 */
export type ElementRecordState =
  /** The user supplied this, by answering the question. */
  | "provided"
  /** The user was asked and does not have it. A recorded absence; never a gap. */
  | "cannot-provide"
  /** Never reached — deferred past the budget, skipped phase, or unauthored. */
  | "not-yet";

/**
 * How an element reached `provided`. Only one route remains: the user answered.
 *
 * Session 48 removed "user-story", which marked an element provided because a
 * keyword appeared in the story. See selectDepthQuestions.ts for why.
 */
export type ProvidedVia = "depth-answer";

export type ElementRecord = {
  elementId: string;
  elementName: string;
  state: ElementRecordState;
  /** Only set when state is "provided". */
  providedVia?: ProvidedVia;
  /** The user's own answer, verbatim. */
  userText?: string;
  /** Which authored question produced this, when one did. */
  questionId?: string;
};

export type ElementStateMap = Record<string, ElementRecord>;

export function createElementStateMap(
  elements: { id: string; name: string }[],
): ElementStateMap {
  const map: ElementStateMap = {};

  for (const element of elements) {
    map[element.id] = {
      elementId: element.id,
      elementName: element.name,
      // Everything starts not-yet, and ONLY the user moves it — by answering
      // or by attesting. Nothing infers a state from what they wrote
      // elsewhere, so an element never silently reads as settled.
      state: "not-yet",
    };
  }

  return map;
}

/** The user answered a depth question. */
export function recordDepthAnswer(
  map: ElementStateMap,
  args: { elementId: string; questionId: string; answerText: string },
): ElementStateMap {
  return setRecord(map, args.elementId, (current) => ({
    ...current,
    state: "provided",
    providedVia: "depth-answer",
    userText: args.answerText,
    questionId: args.questionId,
  }));
}

/**
 * The user said "I don't know" / "I don't have that".
 *
 * PROPERTY 4. This is a resolution, not a failure, and must never be presented
 * as a lesser answer. The readiness gate does not hold on this state.
 */
export function recordCannotProvide(
  map: ElementStateMap,
  args: { elementId: string; questionId: string; answerText?: string },
): ElementStateMap {
  return setRecord(map, args.elementId, (current) => ({
    ...current,
    state: "cannot-provide",
    // providedVia is deliberately cleared: cannot-provide is not a flavour of
    // provided, and code branching on providedVia must not see a stale value.
    providedVia: undefined,
    userText: args.answerText,
    questionId: args.questionId,
  }));
}

/**
 * Elements the readiness gate must still hold for: the ones never reached.
 *
 * `cannot-provide` is deliberately NOT included. That is the whole point of
 * property 4 — see the file header.
 */
export function elementsStillOutstanding(map: ElementStateMap): ElementRecord[] {
  return Object.values(map)
    .filter((record) => record.state === "not-yet")
    .sort((a, b) => a.elementName.localeCompare(b.elementName));
}

function setRecord(
  map: ElementStateMap,
  elementId: string,
  update: (current: ElementRecord) => ElementRecord,
): ElementStateMap {
  const current = map[elementId];

  // An unknown element id is a caller bug, not a user-visible condition.
  // Returning the map unchanged would hide it; throwing surfaces it in the
  // harness rather than in production behaviour.
  if (!current) {
    throw new Error(`elementStateMap: unknown element id "${elementId}"`);
  }

  return { ...map, [elementId]: update(current) };
}
