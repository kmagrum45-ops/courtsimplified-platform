/**
 * Pure question mapping for the Civil builder result.
 *
 * Kept out of CivilIntake.tsx for the same reason familyAnalysis.ts is kept out
 * of FamilyIntake.tsx: importing the component pulls in the Supabase client,
 * which constructs at module load and throws without environment variables, so
 * the mapping could not otherwise be exercised directly.
 *
 * The bug this closes is the one fixed for Family in 03204cc. The overview
 * panel picks "What to confirm next" by scanning analysis.missingInformation
 * and analysis.nextBestActions for a string ending in "?", falling back to a
 * hardcoded placeholder when neither has one. Civil supplied only
 * masterCase.missingInformation -- evidence-gap statements such as "Timeline
 * evidence is weak", never questions -- and never set nextBestActions at all,
 * so every Civil case showed the placeholder. The brain had already generated
 * real questions for Civil; the mapping discarded them, because
 * buildCivilAnalysisFromMaster only ever received civilMasterResult and never
 * the brain output alongside it.
 */

import {
  filingFactsFromDocuments,
  withoutAnsweredQuestions,
} from "@/src/lib/case-system/intelligence/answeredQuestions";

import { cleanList } from "./builderTypes";

/** The parts of the brain intelligence this mapping reads. */
type CivilQuestionSource = {
  proceduralPosture?: { nextProceduralQuestions?: string[] } | null;
  missingInformation?: Array<{ question?: string }> | null;
};

function isQuestion(value: string): boolean {
  return value.trim().endsWith("?");
}

/**
 * Real questions the engine generated for this Civil case, in the order the
 * overview should prefer them, with anything the recorded documents already
 * answer removed.
 *
 * Only genuine questions are carried across. Non-questions are left out because
 * they read as internal instructions rather than something to confirm, and
 * intelligence.nextBestActions is deliberately not used at all: as on the Family
 * path its leading entry can be "Confirm OpenAI configuration and rerun the
 * analysis.", which the three-area contract treats as prohibited user-facing
 * wording.
 *
 * The filter runs on the structured document tokens rather than the narrative.
 * courtSimplifiedBrain already filters its own procedural questions, but it can
 * only read the canonical narrative text; here the exact selections are in hand,
 * so this is both more accurate and covers the engine-sourced questions the
 * brain never filtered.
 */
export function buildCivilGeneratedQuestions(
  intelligence: CivilQuestionSource,
  documents: string[],
): string[] {
  const proceduralQuestions = cleanList(
    intelligence.proceduralPosture?.nextProceduralQuestions || [],
  ).filter(isQuestion);

  const engineQuestions = cleanList(
    (intelligence.missingInformation || []).map((item) => item.question || ""),
  ).filter(isQuestion);

  return withoutAnsweredQuestions(
    cleanList([...proceduralQuestions, ...engineQuestions]),
    filingFactsFromDocuments(documents),
  );
}
