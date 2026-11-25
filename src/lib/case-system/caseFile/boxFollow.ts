/**
 * THE WHOLE FORM'S BOXES FOLLOW THE NEWEST SAVED ANSWER, IN ALL THREE COURTS (rule 3, site owner 6 Nov 2026).
 *
 * Founder's Chrome check of #544, step 14: the Small Claims whole form kept "$7,250" after the amount was changed on the
 * review to $8,150 and $9,350. A box followed a newer answer only while it held words the fill had put there
 * (asker.ts filledToFollow); Civil and Family forms never followed at all. The rule: a box protects only text being
 * typed and not yet sent; once saved, it follows the newest saved answer; a cleared box records a removal (caseFile.ts
 * followAnswer) and stays empty until a newer answer arrives.
 *
 * `boxesToFollow` is pure: for each text box of a form's saved copy, mapped to its fact by the field table
 * (fieldFacts.ts), the words to put in it (caseFile.ts followWords). `field` is the container the boxes live in
 * ("small-claims"/"civil" keep theirs in "input"; Family keeps each box as its own field: null). The caller writes
 * the words into the form's copy as a follow, not as a new answer (no change, no confirmation change, nothing sent:
 * IntakeRecovery put with touched=false). `changes`: this tab's change record (caseFile.ts changesOf), so a box whose own
 * edit is not saved yet keeps the person's words. Checked by form-box-follows-record.spec.ts and
 * test:box-follows-other-tab.
 */
import { followWords, type CaseFile, type FactChanges, type SlotFact } from "./caseFile";
import { factOfField } from "./fieldFacts";
import { SLOT_FACTS } from "./caseFile";

const isSlot = (fact: string): fact is SlotFact => (SLOT_FACTS as readonly string[]).includes(fact);
const textLike = (value: unknown) => value === undefined || value === null || typeof value === "string" || typeof value === "number";

export function boxesToFollow(file: CaseFile, section: string, field: string | null, values: Record<string, unknown>, formatDay: (iso: string) => string, typing: ReadonlySet<string> = new Set(), changes: FactChanges = {}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (!textLike(value) || typing.has(key)) continue;
    const mapped = field ? factOfField(section, field, key) : factOfField(section, key);
    if (!("fact" in mapped) || !isSlot(mapped.fact)) continue;
    const place = `${section}:${key}`;
    // This tab's own edit of this box, not saved yet (on its way, or refused as "Not saved yet"): the person's words stay.
    const words = followWords(file, mapped.fact, place, value, formatDay, changes[mapped.fact]?.place === place);
    if (words !== null) out[key] = words;
  }
  return out;
}
