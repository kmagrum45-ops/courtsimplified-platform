/**
 * Every form the site fills, each with its one map (formMap.ts). Add a form here when its map is written; test:form-maps
 * checks each one against its official PDF.
 */
import type { FormMapDefinition } from "../formMap";
import { FORM_1A } from "./form1A";
import { FORM_7A } from "./form7A";

export const FORM_MAPS: readonly FormMapDefinition[] = [FORM_7A, FORM_1A];
