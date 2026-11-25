/**
 * Small builders for form maps (formMap.ts): a blank box with its reason, and one entry given to several boxes. They
 * keep a long official form's map readable; every box name is still written out, so test:form-maps can check each one
 * against the PDF. Pure. States no law.
 */
import type { BlankBox, BoxEntry } from "./formMap";

/** A box left blank on purpose: why, and the fact the case record would need to fill it (if any). */
export const blank = (why: string, needsFact?: string): BlankBox => ({ kind: "blank", why, ...(needsFact ? { needsFact } : {}) });

/** A box the site has no wording for: listed for the legal review chat. */
export const needsWording = (why: string, needsFact?: string): BlankBox => ({ ...blank(why, needsFact), needsWording: true });

/** The same entry for each of these boxes. */
export const each = (names: readonly string[], entry: BoxEntry): Record<string, BoxEntry> => Object.fromEntries(names.map((name) => [name, entry]));
