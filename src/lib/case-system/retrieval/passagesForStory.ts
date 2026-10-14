/**
 * Passages that cannot apply to the person's story, by what the law itself
 * says about where or to whom it applies -- taken out before any model reads
 * them, and the right ones put in their place.
 *
 * WHY (senior-lawyer review, round 4, 2026-10-14; persona
 * civil-plaintiff-municipal-slip): a Toronto sidewalk fall was asked a
 * question whose "why" cited Municipal Act, 2001 s. 44 (9). The Municipal Act
 * says it does not apply to the City of Toronto:
 *
 *   s. 7.1 (1) "This Act does not apply to any of the following, except as
 *   otherwise provided by another provision of this Act or of the City of
 *   Toronto Act, 2006: 1. The City of Toronto, ..."
 *
 * The City's own rule is City of Toronto Act, 2006 s. 42: (5) gross
 * negligence for snow or ice on a sidewalk, (6) written notice to the city
 * clerk within 10 days, (7) and (8) when missing it is not a bar. Both read
 * from docs/sources/corpus on 2026-10-14. And the reverse: the City of Toronto
 * Act governs the City of Toronto only, so it is out for a story placed in
 * another municipality.
 *
 * Also (same review, low): a parent with no parenting order was shown
 * Children's Law Reform Act s. 29, which governs an order that "varies a
 * parenting order or contact order". When the story mentions no order or
 * agreement at all, the provisions that only change an existing one (CLRA
 * s. 29, Divorce Act s. 17, Family Law Act s. 37, Family Law Rules r. 15) are
 * left out. Any mention of an order or agreement keeps them.
 *
 * Where it runs: researchStory (each question's passages before the reading
 * call, and the final list), retrieveForStory, and sourcedQuestions
 * (answeringPassages, and phase 2 again, since the route takes passage ids
 * from the browser). The place test is the one the next-step card uses
 * (nextStepPractical.municipalPlaceOf / torontoInWords). An unknown place
 * changes nothing.
 *
 * Server-only (reads the corpus). Asserted by `npm run test:municipal-notice-first`.
 */

import { readPassage, sourcePassages, type LoadedIndex, type Passage } from "./corpusIndex";
import { municipalPlaceOf, municipalWayInjury, type MunicipalPlace } from "../../content-library/nextStepPractical";

const MUNICIPAL_ACT = "municipal-act-2001";
const TORONTO_ACT = "city-of-toronto-act-2006";

const sourceOf = (passage: Pick<Passage, "id">) => passage.id.split(":")[1] ?? "";

/** Municipal Act s. 44 and nothing else: not s. 44.1, not s. 440. */
const MA_44 = /^s\. 44(?![.\d])/;
export function isMunicipalAct44(passage: Pick<Passage, "id" | "pinpoint">): boolean {
  return sourceOf(passage) === MUNICIPAL_ACT && MA_44.test(passage.pinpoint ?? "");
}

export function isTorontoAct(passage: Pick<Passage, "id">): boolean {
  return sourceOf(passage) === TORONTO_ACT;
}

/*
 * Variation of an existing order or agreement: the provisions below govern
 * only changing one (each read in the saved text, 2026-10-14):
 *   CLRA s. 29 (1) "A court shall not make an order under this Part that
 *     varies a parenting order or contact order unless ..."
 *   Divorce Act s. 17 (1) "A court of competent jurisdiction may make an
 *     order varying, rescinding or suspending ..."
 *   FLA s. 37 (1) "An application to the court for variation of an order
 *     made or confirmed under this Part ..."
 *   FLR r. 15 "MOTIONS TO CHANGE A FINAL ORDER OR AGREEMENT"
 */
const VARIATION: { sourceId: string; pinpoint: RegExp }[] = [
  { sourceId: "childrens-law-reform-act", pinpoint: /^s\. 29(?![.\d])/ },
  { sourceId: "divorce-act", pinpoint: /^s\. 17(?![.\d])/ },
  { sourceId: "family-law-act", pinpoint: /^s\. 37(?![.\d])/ },
  { sourceId: "family-law-rules", pinpoint: /^r\. 15(?![.\d])/ },
];

export function isVariationProvision(passage: Pick<Passage, "id" | "pinpoint">): boolean {
  const sourceId = sourceOf(passage);
  return VARIATION.some((entry) => entry.sourceId === sourceId && entry.pinpoint.test(passage.pinpoint ?? ""));
}

/**
 * Words that show, or might show, an order or agreement already exists.
 * Deliberately wide: any of them keeps the variation provisions.
 */
const ORDER_WORDS = /\b(?:orders?|ordered|agreements?|agreed|consent|vary|varied|varying|variation|change (?:it|the|our|my|that)|motion to change|judgment|decree|arrangement)\b/i;

export function storyShowsNoOrder(story: string): boolean {
  return Boolean(story.trim()) && !ORDER_WORDS.test(story);
}

/** Whether a passage cannot apply to this story, and why; null when it may. Pure. */
export function wrongForStory(passage: Pick<Passage, "id" | "pinpoint">, story: string, place: MunicipalPlace = municipalPlaceOf(story)): string | null {
  if (place === "toronto" && isMunicipalAct44(passage)) return "Municipal Act s. 44 for a Toronto story (s. 7.1 (1))";
  if (place === "elsewhere" && isTorontoAct(passage)) return "City of Toronto Act for a story outside Toronto";
  if (isVariationProvision(passage) && storyShowsNoOrder(story)) return "variation of an order when the story shows none";
  return null;
}

/** The passages without those that cannot apply to this story. Pure. */
export function withoutWrongForStory<T extends Pick<Passage, "id" | "pinpoint">>(passages: readonly T[], story: string): T[] {
  const place = municipalPlaceOf(story);
  return passages.filter((passage) => !wrongForStory(passage, story, place));
}

/**
 * The right municipality's sections for an injury on a municipal way, read
 * from the index (hash-checked): City of Toronto Act s. 42 for Toronto,
 * Municipal Act s. 44 elsewhere; none when the place is unknown or the story
 * is not such an injury.
 */
export function rightMunicipalPassages(index: LoadedIndex, story: string): Passage[] {
  if (!municipalWayInjury(story)) return [];
  const place = municipalPlaceOf(story);
  if (place === "unknown") return [];
  const [sourceId, pinpoint] = place === "toronto" ? [TORONTO_ACT, /^s\. 42(?![.\d])/] : [MUNICIPAL_ACT, MA_44];
  return sourcePassages(index, sourceId)
    .filter((chunk) => pinpoint.test(chunk.pinpoint))
    .map((chunk) => readPassage(index, chunk.id, 1))
    .filter((passage): passage is Passage => Boolean(passage))
    // Not the minimum-standards regulation power (s. 44 (4)-(8)): the
    // repair duty, snow and ice, the notice and its exceptions.
    .filter((passage) => !/^s\. 44 \(4\)/.test(passage.pinpoint));
}

/**
 * The passages fitted to the story: the wrong ones out; and, for an injury
 * on a municipal way, the right municipality's sections in, first, when
 * `inject` is set or a wrong-place municipal passage was taken out (so the
 * reader that wanted the notice rule gets the one that applies).
 */
export function fitPassagesToStory(passages: readonly Passage[], story: string, index: LoadedIndex | null, inject = false): Passage[] {
  const kept = withoutWrongForStory(passages, story);
  const swappedMunicipal = passages.some((passage) => !kept.includes(passage) && (isMunicipalAct44(passage) || isTorontoAct(passage)));
  if (!index || !(inject || swappedMunicipal)) return kept;
  const seen = new Set(kept.map((passage) => passage.id));
  const right = rightMunicipalPassages(index, story).filter((passage) => !seen.has(passage.id));
  return [...right, ...kept];
}
