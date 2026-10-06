/**
 * Looks up a provision the research step NAMED, when the library holds it.
 *
 * WHY (2026-10-05). The coverage test's second run had the reading call
 * report "not in the library: Rules of Civil Procedure, rule 61.04" and
 * "Insurance Act, s. 263" -- both vendored and indexed. Search by meaning had
 * not brought them up, so the reader named them as missing, and they became
 * source requests that a person would have to close. A lawyer who knows the
 * rule's number turns to it. So does this: a named law whose title is in the
 * index, and a section or rule number found in it, is read directly and
 * offered to the reader again.
 *
 * Only legislation (a decision is not looked up by "section"). Only a title
 * the index holds, matched whole. Only numbers the source actually has: a
 * number it lacks finds nothing, and the gap stays a gap.
 *
 * Pure apart from reading the index. Asserted by `npm run test:research-step`.
 */

import { readPassage, sourcePassages, type LoadedIndex, type Passage } from "./corpusIndex";
import { findProvision, type ProvisionReference } from "./crossReferences";

const squash = (text: string) =>
  text
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const KEYWORD = /\b(?:ss?|rr?|sections?|subsections?|rules?|subrules?)\.?\s+((?:\d+(?:\.\d+)*(?:\s*\(\s*\d+(?:\.\d+)?\s*\))?)(?:\s*(?:,|\band\b|\bor\b|&)\s*\d+(?:\.\d+)*(?:\s*\(\s*\d+(?:\.\d+)?\s*\))?)*)/gi;

/** The section or rule numbers named in a sentence. Pure; exported for the suite. */
export function namedNumbers(text: string): ProvisionReference[] {
  const out: ProvisionReference[] = [];
  for (const match of text.matchAll(KEYWORD)) {
    for (const item of match[1].split(/\s*(?:,|\band\b|\bor\b|&)\s*/)) {
      const parsed = /^(\d+(?:\.\d+)*)(?:\s*\(\s*(\d+(?:\.\d+)?)\s*\))?$/.exec(item.trim());
      if (!parsed) continue;
      if (!out.some((ref) => ref.number === parsed[1] && ref.sub === parsed[2])) {
        out.push(parsed[2] ? { number: parsed[1], sub: parsed[2] } : { number: parsed[1] });
      }
    }
  }
  return out.slice(0, 4);
}

/** The indexed legislation whose title the sentence names, longest title first. */
export function namedSource(index: LoadedIndex, text: string): string | null {
  const said = ` ${squash(text)} `;
  let best: { id: string; length: number } | null = null;
  for (const [id, source] of Object.entries(index.meta.sources)) {
    if (source.tier === "case-law") continue;
    const title = squash(source.title);
    if (title.length < 6 || !said.includes(` ${title} `)) continue;
    if (!best || title.length > best.length) best = { id, length: title.length };
  }
  return best?.id ?? null;
}

/** The passages a "missing law" names, when the library has them. */
export function namedProvisions(index: LoadedIndex, missingLaw: string, score = 0.5): Passage[] {
  const sourceId = namedSource(index, missingLaw);
  if (!sourceId) return [];
  const chunks = sourcePassages(index, sourceId);
  const found: Passage[] = [];
  for (const reference of namedNumbers(missingLaw)) {
    const chunk = findProvision(chunks, reference);
    if (!chunk || found.some((passage) => passage.id === chunk.id)) continue;
    const passage = readPassage(index, chunk.id, score);
    if (passage) found.push(passage);
  }
  return found;
}
