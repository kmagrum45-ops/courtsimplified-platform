/**
 * Every form the site fills, each with its one map (formMap.ts). Add a form here when its map is written; test:form-maps
 * checks each one against its official PDF, and fails on an official PDF saved under docs/sources/forms/ with no map.
 */
import type { FormMapDefinition } from "../formMap";
import { FORM_1A } from "./form1A";
import { FORM_7A } from "./form7A";
import { FORM_8A } from "./form8A";
import { FORM_9A } from "./form9A";
import { FAMILY_FORM_8 } from "./familyForm8";
import { FAMILY_FORM_10 } from "./familyForm10";
import { FAMILY_FORM_13 } from "./familyForm13";
import { FAMILY_FORM_13_1 } from "./familyForm13_1";

export const FORM_MAPS: readonly FormMapDefinition[] = [FORM_7A, FORM_1A, FORM_9A, FORM_8A, FAMILY_FORM_8, FAMILY_FORM_10, FAMILY_FORM_13, FAMILY_FORM_13_1];

/** Every box left blank because the case record does not hold its fact yet, by form: the request to the record's owners. */
export function neededFacts(maps: readonly FormMapDefinition[] = FORM_MAPS): { form: string; box: string; fact: string }[] {
  return maps.flatMap((map) => Object.entries(map.boxes).flatMap(([box, entry]) => (entry.kind === "blank" && entry.needsFact ? [{ form: map.id, box, fact: entry.needsFact }] : [])));
}

/** Every box the site has no wording for: the list for the legal review chat. */
export function neededWording(maps: readonly FormMapDefinition[] = FORM_MAPS): { form: string; box: string; why: string }[] {
  return maps.flatMap((map) => Object.entries(map.boxes).flatMap(([box, entry]) => (entry.kind === "blank" && entry.needsWording ? [{ form: map.id, box, why: entry.why }] : [])));
}
