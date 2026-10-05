/**
 * Follows a provision's references to other provisions of the same law.
 *
 * WHY (2026-10-05). Law is written in cross-references: "an order made under
 * section 9 or 10", "subject to subsection 46 (2)", "in accordance with
 * subrule 8.01 (4)". A lawyer reading the first provision reads the ones it
 * points to, because the condition or the exception is often there. Search
 * by meaning finds the provision that matches the story, not the one it
 * points to, so retrieval stopped at half the rule.
 *
 * WHAT COUNTS AS A REFERENCE. Only the words "section", "subsection",
 * "rule" and "subrule" followed by a number, in the same instrument:
 *
 *   - "s. 35" is NOT followed. In e-Laws text it is almost always amendment
 *     history ("2009, c. 11, s. 35"), naming a section of the AMENDING act.
 *   - A reference followed by "of the ... Act" / "of that Act" names another
 *     law and is not followed ("section 67.2 ... of that Act"); "of this
 *     Act", "of these rules" and "of this Regulation" are the same law.
 *   - "subsection (2)" with no section number is inside the same section,
 *     which the passage already carries.
 *   - A range ("rules 24.02 to 24.05") yields its two ends, not everything
 *     between: a reader is pointed at the range, not handed it whole.
 *   - Decisions are not followed: a judgment's references are to other cases
 *     and to statutes that may not be the one in the index.
 *
 * One hop only, and capped (followCrossReferences in storyRetrieval.ts), so
 * a definitions section that names fifty others cannot flood the analysis.
 *
 * Pure. Asserted by `npm run test:corpus-retrieval`.
 */

import type { CorpusChunk } from "./corpusChunker";

export type ProvisionReference = { number: string; sub?: string };

const NUMBER = String.raw`\d+(?:\.\d+)*`;
const SUB = String.raw`\(\s*\d+(?:\.\d+)?\s*\)`;
const ITEM = String.raw`${NUMBER}(?:\s*${SUB})?`;
const LIST = new RegExp(
  String.raw`\b(?:sub)?(?:sections?|rules?)\s+(${ITEM}(?:\s*(?:,|\band\b|\bor\b|\bto\b)\s*(?:${ITEM}|${SUB}))*)`,
  "gi",
);
/** After the list: does it name another law? */
const OTHER_LAW = /^[\s,;]*(?:of|under)\s+(?!this\s+(?:Act|Regulation|section)\b|these\s+rules\b)(?:the|that|an?)\b/i;

/**
 * The provisions of the same law that this text points to, in order, without
 * repeats. `ownNumber` is the section the text is from: "subsection (6)" with
 * no section number means that section's subsection (6), which may sit in
 * another passage (RTA s. 106 (9) "the payment required by subsection (6)").
 */
export function referencedProvisions(text: string, ownNumber?: string): ProvisionReference[] {
  const found: ProvisionReference[] = [];
  const add = (reference: ProvisionReference) => {
    if (!found.some((item) => item.number === reference.number && item.sub === reference.sub)) found.push(reference);
  };
  for (const match of text.matchAll(LIST)) {
    const after = text.slice((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 60);
    if (OTHER_LAW.test(after)) continue;
    // "section 67.2 or, in the case of ..., section 67.7 of that Act": the
    // other law is named once, at the end of the clause. Anything in the
    // rest of the sentence naming another law, before "this Act", rules the
    // reference out -- losing a reference costs less than following one
    // into the wrong statute.
    const clause = text.slice((match.index ?? 0) + match[0].length).split(/[.;](?:\s|$)/)[0];
    const otherLaw = clause.search(/\b(?:of|under)\s+(?:that\s+Act|the\s+[A-Z][\w’'(), -]*?\bAct\b)/);
    const thisLaw = clause.search(/\bof\s+this\s+Act\b|\bof\s+these\s+rules\b/i);
    if (otherLaw >= 0 && (thisLaw < 0 || otherLaw < thisLaw)) continue;
    let lastNumber = "";
    for (const part of match[1].split(/\s*(?:,|\band\b|\bor\b|\bto\b)\s*/i)) {
      const item = new RegExp(String.raw`^(${NUMBER})?\s*(?:\(\s*(\d+(?:\.\d+)?)\s*\))?$`).exec(part.trim());
      if (!item) continue;
      const number = item[1] ?? lastNumber; // "subsections 16.93(1) and (2)"
      if (!number) continue;
      lastNumber = number;
      add(item[2] ? { number, sub: item[2] } : { number });
    }
  }
  if (ownNumber) {
    for (const match of text.matchAll(/\b(?:sub)?(?:sections?|rules?)\s+((?:\(\s*\d+(?:\.\d+)?\s*\)(?:\s*(?:,|\band\b|\bor\b|\bto\b)\s*)?)+)/gi)) {
      for (const sub of match[1].matchAll(/\(\s*(\d+(?:\.\d+)?)\s*\)/g)) add({ number: ownNumber, sub: sub[1] });
    }
  }
  return found;
}

/** "s. 46 (1)-(3)" -> { number: "46", from: 1, to: 3 }; "r. 9.01" -> { number: "9.01" }. */
export function parsePinpoint(pinpoint: string): { number: string; from?: number; to?: number } | null {
  const match = /^[sr]\.\s+([\d.]+)(?:\s+\(([\d.]+)\)(?:-\(([\d.]+)\))?)?$/.exec(pinpoint.trim());
  if (!match) return null;
  const from = match[2] !== undefined ? Number(match[2]) : undefined;
  const to = match[3] !== undefined ? Number(match[3]) : from;
  return { number: match[1], ...(from !== undefined ? { from, to } : {}) };
}

/**
 * The passage of a source that holds the referenced provision: for a
 * subsection, the passage whose range covers it; for a whole section, its
 * first passage. Null when the source has no such provision (repealed, or a
 * number the chunker never cut as a section).
 */
export function findProvision(chunks: readonly CorpusChunk[], reference: ProvisionReference): CorpusChunk | null {
  const candidates = chunks.filter((chunk) => parsePinpoint(chunk.pinpoint)?.number === reference.number);
  if (candidates.length === 0) return null;
  if (reference.sub === undefined) return candidates[0];
  const sub = Number(reference.sub);
  return (
    candidates.find((chunk) => {
      const parsed = parsePinpoint(chunk.pinpoint);
      return parsed?.from !== undefined && parsed.to !== undefined && sub >= parsed.from && sub <= parsed.to;
    }) ?? candidates[0]
  );
}
