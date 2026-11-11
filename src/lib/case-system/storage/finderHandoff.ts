/**
 * THE COURT-PATH FINDER'S HAND-OFF BELONGS TO ONE INTAKE (9 Nov 2026).
 *
 * The finder (NotSureCourtGuide) hands the person's province, city and story to the builder in this tab's
 * sessionStorage (the not-sure guide key in intakeStorageKeys.ts). The builder page reads it only after "Before you start", so until then it
 * waits in the tab. It used to wait unbound: a person who left at "Before you start" left their story for whoever
 * opened the builder next, and only the home page's reset (after an account check) removed it.
 *
 * Now the first intake to open after the finder takes it (`flowId`), and every other opening drops it:
 *  - a new intake with a hand-off nobody has taken: it is this intake's (the finder just wrote it);
 *  - the same intake's address again (a refresh): kept, so the person's story is still there;
 *  - any other intake, a saved case, or the finder opening again: dropped.
 */
export type FinderHandoffOpening = {
  /** The intake id in the address (?intake=), or null for a new intake. */
  requestedFlow: string | null;
  /** A saved case's id in the address (?caseId=), or null. */
  selectedId: string | null;
};

type Handoff = Record<string, unknown> & { flowId?: unknown };

function parse(raw: string | null): Handoff | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? value as Handoff : null;
  } catch { return null; }
}

/**
 * On an intake opening: whether the hand-off stays. Decided from the address alone, before the account is read, so it
 * never waits on anything.
 */
export function keepFinderHandoff(raw: string | null, opening: FinderHandoffOpening): boolean {
  const handoff = parse(raw);
  if (!handoff) return false;
  if (opening.selectedId) return false;
  const owner = typeof handoff.flowId === "string" ? handoff.flowId : null;
  // Not taken yet: only a new intake may take it (the finder's "Choose" opens one).
  if (owner === null) return opening.requestedFlow === null;
  return opening.requestedFlow === owner;
}

/** The hand-off, taken by the new intake `flowId` (unchanged if it already belongs to it). */
export function takeFinderHandoff(raw: string | null, flowId: string): string | null {
  const handoff = parse(raw);
  if (!handoff) return null;
  if (typeof handoff.flowId === "string" && handoff.flowId !== flowId) return null;
  return JSON.stringify({ ...handoff, flowId });
}

/**
 * What is left once the situation questions take "Has a case already started?": the rest, still belonging to its
 * intake, or nothing. Never a story without its owner.
 */
export function withoutStarted(raw: string | null): string | null {
  const handoff = parse(raw);
  if (!handoff) return null;
  const { started: _taken, ...rest } = handoff;
  void _taken;
  const story = Object.keys(rest).some((key) => key !== "flowId");
  if (!story) return null;
  return typeof rest.flowId === "string" ? JSON.stringify(rest) : null;
}
