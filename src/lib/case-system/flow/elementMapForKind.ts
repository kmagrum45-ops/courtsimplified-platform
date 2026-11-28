/**
 * THE ELEMENT MAP, BUILT ONCE WHEN THE KIND IS CONFIRMED (site owner, 27 Nov 2026, decision 1).
 *
 * The Form 7A checklist ("I have this" / "I don't have this") records each element of the person's kind in one element
 * map. The browser test of 27 Nov found a contractor case with no map saved at all (staging case 91f708d3): the route it
 * took never built one, so every button threw. In the new flow the map is built here, the moment the record holds a
 * confirmed catalogue kind, and saved with the case (the checkpoint's flow.elementStates, which the case file reads as its
 * elementStates), so no route can skip it. attestElement's own add (depth/elementStateMap.ts withElements) stays as
 * a safety net only.
 *
 * Pure. States no law. Every record starts not-yet: nothing is inferred from the story.
 */
import type { CaseFile } from "../caseFile/caseFile";
import { CLAIM_TYPES } from "../intake/claimTypes";
import { withElements, type ElementStateMap } from "../intake/depth/elementStateMap";

/** The catalogue kind the person confirmed (the record's own answer), or null: a category word or a proposal is not one. */
export function confirmedKindId(record: CaseFile | null): string | null {
  const kind = record?.claimKind;
  if (!kind || kind.state !== "answered" || !kind.confirmed || typeof kind.value !== "string") return null;
  return CLAIM_TYPES.some((type) => type.id === kind.value) ? kind.value : null;
}

/**
 * The map to save for the confirmed kind: the held map with a not-yet record for each of the kind's elements it lacks.
 * Null when there is nothing to save: no confirmed catalogue kind, or the held map already holds every element (so it
 * is built once, and a later read never writes again).
 */
export function elementMapForKind(record: CaseFile | null): ElementStateMap | null {
  const kindId = confirmedKindId(record);
  if (!kindId) return null;
  const elements = CLAIM_TYPES.find((type) => type.id === kindId)?.plaintiffElements ?? [];
  const held = (record?.elementStates ?? {}) as ElementStateMap;
  const next = withElements(held, elements);
  return next === held ? null : next;
}
