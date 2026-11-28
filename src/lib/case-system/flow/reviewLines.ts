/**
 * THE NEW SMALL CLAIMS FLOW'S ONE REVIEW, AS LINES (site owner, 26-27 Nov 2026). Everything the case holds that the review
 * lists, in the Questions page's order, each once, in the words the person gave: ReviewStep.tsx draws these, nothing else.
 *
 * - A slot fact the record holds (answered, or settled): its words through the one reader (caseFile.ts slotText), so a
 *   rough time confirmed on the Understood step ("March 2026": held unsure, because it is not a day; site owner, 31 Oct)
 *   shows as given, never "Not answered yet". Only a fact said "not sure" with no words held is `notAnswered`.
 *   (Acceptance run of #568 with the switch on, 27 Nov 2026: every story with a month and year showed "Not answered yet"
 *   for the date it had just confirmed; the amount showed as "12500".)
 * - What was agreed (a slot no question asks) and the story's facts with no slot (what was paid, what was tried to settle
 *   it), held in the record's answers under their own id: shown, never asked (acceptance rule (i), same run).
 * - The other side's name is the Parties step's, on the Questions page, so it is not listed again.
 */
import { slotText, SLOT_FACTS, type CaseFile, type SlotFact } from "../caseFile/caseFile";
import { slotStatus } from "../caseFile/factStatus";
import { FLOW_QUESTIONS } from "../caseFile/missingFacts";
import { CLAIM_TYPES } from "../intake/claimTypes";
import { formatForCourt } from "../dates";
import { STATED_EXTRAS } from "./storyStated";

export const REVIEWED_FACTS: readonly SlotFact[] = [...FLOW_QUESTIONS.map((item) => item.fact), "agreementTerms"].filter((fact): fact is SlotFact => (SLOT_FACTS as readonly string[]).includes(fact));

export type ReviewLine =
  | { kind: "slot"; fact: SlotFact; words: string; notAnswered: boolean; value: unknown }
  | { kind: "extra"; fact: (typeof STATED_EXTRAS)[number]; words: string };

export function reviewLines(record: CaseFile | null | undefined): ReviewLine[] {
  if (!record) return [];
  const slots = REVIEWED_FACTS.flatMap((fact): ReviewLine[] => {
    const slot = record[fact];
    const status = slotStatus(slot);
    if (status !== "known" && status !== "settled") return [];
    const words = fact === "claimKind" ? CLAIM_TYPES.find((type) => type.id === slot.value)?.name ?? String(slot.value ?? "") : slotText(slot, (iso) => formatForCourt(iso));
    return [{ kind: "slot", fact, words, notAnswered: status === "settled" && words === "Not sure yet", value: slot.value }];
  });
  const extras = STATED_EXTRAS.flatMap((fact): ReviewLine[] => {
    const words = record.answers?.[fact]?.trim();
    return words ? [{ kind: "extra", fact, words }] : [];
  });
  return [...slots, ...extras];
}
